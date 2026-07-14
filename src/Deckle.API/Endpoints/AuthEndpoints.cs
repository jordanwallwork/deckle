using Deckle.API.DTOs;
using Deckle.API.Events.NewUserRegistration;
using Deckle.API.Services;
using MediatR;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using System.Security.Claims;
using System.Text.Json;

namespace Deckle.API.Endpoints;

public static partial class AuthEndpoints
{
    [System.Diagnostics.CodeAnalysis.SuppressMessage("Microsoft.Maintainability", "CA1506:AvoidExcessiveClassCoupling", Justification = "Endpoint mapping inherently couples to many types")]
    public static RouteGroupBuilder MapAuthEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/auth")
            .WithTags("Authentication");

        group.MapGet("/login", HandleLogin)
        .AllowAnonymous()
        .WithName("Login");

        group.MapPost("/register", HandleRegister)
        .AllowAnonymous()
        .RequireRateLimiting("auth")
        .WithName("RegisterWithPassword");

        group.MapPost("/login/password", HandleLoginWithPassword)
        .AllowAnonymous()
        .RequireRateLimiting("auth")
        .WithName("LoginWithPassword");

        group.MapPost("/logout", (Delegate)HandleLogout)
        .RequireAuthorization()
        .WithName("Logout");

        group.MapGet("/me", HandleGetCurrentUser)
        .RequireAuthorization()
        .WithName("GetCurrentUser");

        group.MapGet("/username/check/{username}", HandleCheckUsernameAvailability)
        .RequireAuthorization()
        .RequireRateLimiting("strict")
        .WithName("CheckUsernameAvailability");

        group.MapGet("/profile", HandleGetProfile)
        .RequireAuthorization()
        .WithName("GetProfile");

        group.MapPut("/profile", HandleUpdateProfile)
        .RequireAuthorization()
        .WithName("UpdateProfile");

        group.MapPost("/username", HandleSetUsername)
        .RequireAuthorization()
        .WithName("SetUsername");

        return group;
    }

    private static IResult HandleLogin(IConfiguration configuration, ILogger<Program> logger, HttpContext context, string? returnUrl)
    {
        var frontendUrl = configuration["FrontendUrl"];

        // In production, FrontendUrl must be configured
        if (string.IsNullOrWhiteSpace(frontendUrl))
        {
            var isDevelopment = context.RequestServices.GetRequiredService<IWebHostEnvironment>().IsDevelopment();
            if (!isDevelopment)
            {
                LogFrontendUrlNotConfiguredInProduction(logger);
                return Results.Problem("FrontendUrl is not configured", statusCode: 500);
            }

            frontendUrl = "http://localhost:5173";
            LogFrontendUrlNotConfigured(logger, frontendUrl);
        }

        // Validate that frontendUrl is an absolute URL
        if (!Uri.TryCreate(frontendUrl, UriKind.Absolute, out _))
        {
            LogInvalidFrontendUrl(logger, frontendUrl);
            return Results.Problem("Invalid FrontendUrl configuration", statusCode: 500);
        }

        var redirectUri = BuildLoginRedirectUri(frontendUrl, returnUrl);
        LogAuthLoginInitiated(logger, redirectUri);

        return Results.Challenge(
            new AuthenticationProperties { RedirectUri = redirectUri },
            [GoogleDefaults.AuthenticationScheme]
        );
    }

    private static string BuildLoginRedirectUri(string frontendUrl, string? returnUrl)
    {
        var redirectUri = frontendUrl.TrimEnd('/');

        //Ensure returnUrl is a relative path to prevent open redirect attacks
        if (!string.IsNullOrWhiteSpace(returnUrl) && returnUrl.StartsWith('/') && !returnUrl.StartsWith("//", StringComparison.Ordinal))
        {
            redirectUri += returnUrl;
        }

        return redirectUri;
    }

    private static async Task<IResult> HandleRegister(RegisterRequest request, IUserService userService, HttpContext context)
    {
        var (success, error, user) = await userService.RegisterWithPasswordAsync(request.Email, request.Password);

        if (!success || user == null)
        {
            return Results.BadRequest(new { error });
        }

        var principal = UserService.CreatePrincipalFromUser(user);
        await context.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);

        return Results.Ok(UserService.GetCurrentUserFromClaims(principal));
    }

    private static async Task<IResult> HandleLoginWithPassword(PasswordLoginRequest request, IUserService userService, HttpContext context)
    {
        var (success, error, user) = await userService.LoginWithPasswordAsync(request.Email, request.Password);

        if (!success || user == null)
        {
            return Results.BadRequest(new { error });
        }

        var principal = UserService.CreatePrincipalFromUser(user);
        await context.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);

        return Results.Ok(UserService.GetCurrentUserFromClaims(principal));
    }

    private static async Task<IResult> HandleLogout(HttpContext context)
    {
        await context.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Results.Ok(new { message = "Logged out successfully" });
    }

    private static IResult HandleGetCurrentUser(ClaimsPrincipal user)
    {
        var currentUser = UserService.GetCurrentUserFromClaims(user);

        if (currentUser == null)
        {
            return Results.Unauthorized();
        }

        return Results.Ok(currentUser);
    }

    private static async Task<IResult> HandleCheckUsernameAvailability(string username, ClaimsPrincipal user, IUserService userService)
    {
        var userId = UserService.GetUserIdFromClaims(user);
        if (userId == null)
        {
            return Results.Unauthorized();
        }

        var isAvailable = await userService.IsUsernameAvailableAsync(username, userId);
        return Results.Ok(new UsernameAvailabilityResponse(isAvailable));
    }

    private static async Task<IResult> HandleGetProfile(ClaimsPrincipal user, IUserService userService)
    {
        var userId = UserService.GetUserIdFromClaims(user);
        if (userId == null)
        {
            return Results.Unauthorized();
        }

        var dbUser = await userService.GetUserByIdAsync(userId.Value);
        if (dbUser == null)
        {
            return Results.NotFound();
        }

        var links = dbUser.ExternalLinks != null
            ? JsonSerializer.Deserialize<List<ExternalLinkDto>>(dbUser.ExternalLinks)
            : null;

        return Results.Ok(new CurrentUserDto
        {
            Id = dbUser.Id.ToString(),
            Email = dbUser.Email,
            Username = dbUser.Username,
            Name = dbUser.Name,
            Picture = dbUser.PictureUrl,
            Role = dbUser.Role.ToString(),
            Bio = dbUser.Bio,
            ExternalLinks = links
        });
    }

    private static async Task<IResult> HandleUpdateProfile(UpdateProfileRequest request, ClaimsPrincipal user, IUserService userService)
    {
        var userId = UserService.GetUserIdFromClaims(user);
        if (userId == null)
        {
            return Results.Unauthorized();
        }

        var (success, error) = await userService.UpdateProfileAsync(userId.Value, request);
        if (!success)
        {
            return Results.BadRequest(new { error });
        }

        return Results.Ok();
    }

    private static async Task<IResult> HandleSetUsername(SetUsernameRequest request, ClaimsPrincipal user, IUserService userService, IPublisher publisher, HttpContext context)
    {
        var userId = UserService.GetUserIdFromClaims(user);
        if (userId == null)
        {
            return Results.Unauthorized();
        }

        var (success, error, isNewRegistration) = await userService.SetUsernameAsync(userId.Value, request.Username);

        if (!success)
        {
            return Results.BadRequest(new { error });
        }

        if (UpdateUsernameClaim(user, request.Username))
        {
            await context.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, user);
        }

        if (isNewRegistration)
        {
            await PublishNewUserRegistrationAsync(publisher, user, userId.Value, request.Username);
        }

        return Results.Ok(new { username = request.Username.Trim() });
    }

    private static bool UpdateUsernameClaim(ClaimsPrincipal user, string username)
    {
        if (user.Identity is not ClaimsIdentity identity)
        {
            return false;
        }

        var existingClaim = identity.FindFirst("username");
        if (existingClaim != null)
        {
            identity.RemoveClaim(existingClaim);
        }

        identity.AddClaim(new Claim("username", username.Trim()));
        return true;
    }

    private static Task PublishNewUserRegistrationAsync(IPublisher publisher, ClaimsPrincipal user, Guid userId, string username)
    {
        var email = user.FindFirst(ClaimTypes.Email)?.Value ?? "";
        var name = user.FindFirst(ClaimTypes.Name)?.Value ?? "";

        return publisher.Publish(new NewUserRegistrationEvent
        {
            UserId = userId,
            Username = username.Trim(),
            Name = name,
            Email = email,
            SignupDate = DateTime.UtcNow
        });
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "FrontendUrl not configured, using default: {FrontendUrl}")]
    private static partial void LogFrontendUrlNotConfigured(ILogger logger, string frontendUrl);

    [LoggerMessage(Level = LogLevel.Error, Message = "FrontendUrl is not configured in production environment")]
    private static partial void LogFrontendUrlNotConfiguredInProduction(ILogger logger);

    [LoggerMessage(Level = LogLevel.Error, Message = "Invalid FrontendUrl configuration: {FrontendUrl}")]
    private static partial void LogInvalidFrontendUrl(ILogger logger, string frontendUrl);

    [LoggerMessage(Level = LogLevel.Information, Message = "Auth login initiated. Redirecting to: {RedirectUri}")]
    private static partial void LogAuthLoginInitiated(ILogger logger, string redirectUri);
}
