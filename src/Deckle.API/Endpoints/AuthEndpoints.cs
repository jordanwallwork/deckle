using Deckle.API.DTOs;
using Deckle.API.Events.NewUserRegistration;
using Deckle.API.Services;
using MediatR;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using System.Security.Claims;

namespace Deckle.API.Endpoints;

public static partial class AuthEndpoints
{
    [System.Diagnostics.CodeAnalysis.SuppressMessage("Microsoft.Maintainability", "CA1506:AvoidExcessiveClassCoupling", Justification = "Endpoint mapping inherently couples to many types")]
    public static RouteGroupBuilder MapAuthEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/auth")
            .WithTags("Authentication");

        group.MapGet("/login", (IConfiguration configuration, ILogger<Program> logger, HttpContext context, string? returnUrl) =>
        {
            var frontendUrl = configuration["FrontendUrl"];

            // In production, FrontendUrl must be configured
            if (string.IsNullOrWhiteSpace(frontendUrl))
            {
                var isDevelopment = context.RequestServices.GetRequiredService<IWebHostEnvironment>().IsDevelopment();
                if (isDevelopment)
                {
                    frontendUrl = "http://localhost:5173";
                    LogFrontendUrlNotConfigured(logger, frontendUrl);
                }
                else
                {
                    LogFrontendUrlNotConfiguredInProduction(logger);
                    return Results.Problem("FrontendUrl is not configured", statusCode: 500);
                }
            }

            // Validate that frontendUrl is an absolute URL
            if (!Uri.TryCreate(frontendUrl, UriKind.Absolute, out var frontendUri))
            {
                LogInvalidFrontendUrl(logger, frontendUrl);
                return Results.Problem("Invalid FrontendUrl configuration", statusCode: 500);
            }

            // Build redirect URI, appending returnUrl path if provided and valid
            var redirectUri = frontendUrl.TrimEnd('/');

            //Ensure returnUrl is a relative path to prevent open redirect attacks
            if (!string.IsNullOrWhiteSpace(returnUrl) && returnUrl.StartsWith('/')  && !returnUrl.StartsWith("//", StringComparison.Ordinal))
            {
                redirectUri += returnUrl;
            }

            LogAuthLoginInitiated(logger, redirectUri);

            return Results.Challenge(
                new AuthenticationProperties { RedirectUri = redirectUri },
                [GoogleDefaults.AuthenticationScheme]
            );
        })
        .AllowAnonymous()
        .WithName("Login");

        group.MapPost("/logout", async (HttpContext context) =>
        {
            await context.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Results.Ok(new { message = "Logged out successfully" });
        })
        .RequireAuthorization()
        .WithName("Logout");

        group.MapGet("/me", (ClaimsPrincipal user) =>
        {
            var currentUser = UserService.GetCurrentUserFromClaims(user);

            if (currentUser == null)
            {
                return Results.Unauthorized();
            }

            return Results.Ok(currentUser);
        })
        .RequireAuthorization()
        .WithName("GetCurrentUser");

        group.MapGet("/username/check/{username}", async (string username, ClaimsPrincipal user, IUserService userService) =>
        {
            var userId = UserService.GetUserIdFromClaims(user);
            if (userId == null)
            {
                return Results.Unauthorized();
            }

            var isAvailable = await userService.IsUsernameAvailableAsync(username, userId);
            return Results.Ok(new UsernameAvailabilityResponse(isAvailable));
        })
        .RequireAuthorization()
        .RequireRateLimiting("strict")
        .WithName("CheckUsernameAvailability");

        group.MapPost("/username", async (SetUsernameRequest request, ClaimsPrincipal user, IUserService userService, IPublisher publisher, HttpContext context) =>
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

            // Update the user's claims to include the new username
            if (user.Identity is ClaimsIdentity identity)
            {
                // Remove old username claim if exists
                var existingClaim = identity.FindFirst("username");
                if (existingClaim != null)
                {
                    identity.RemoveClaim(existingClaim);
                }
                identity.AddClaim(new Claim("username", request.Username.Trim()));

                // Re-sign in to update the cookie
                await context.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(identity));
            }

            if (isNewRegistration)
            {
                var email = user.FindFirst(ClaimTypes.Email)?.Value ?? "";
                var name = user.FindFirst(ClaimTypes.Name)?.Value ?? "";

                await publisher.Publish(new NewUserRegistrationEvent
                {
                    UserId = userId.Value,
                    Username = request.Username.Trim(),
                    Name = name,
                    Email = email,
                    SignupDate = DateTime.UtcNow
                });
            }

            return Results.Ok(new { username = request.Username.Trim() });
        })
        .RequireAuthorization()
        .WithName("SetUsername");

        return group;
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
