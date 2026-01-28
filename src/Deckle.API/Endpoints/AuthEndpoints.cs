using Deckle.API.DTOs;
using Deckle.API.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using System.Security.Claims;

namespace Deckle.API.Endpoints;

public static class AuthEndpoints
{
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
                    logger.LogWarning("FrontendUrl not configured, using default: {FrontendUrl}", frontendUrl);
                }
                else
                {
                    logger.LogError("FrontendUrl is not configured in production environment");
                    return Results.Problem("FrontendUrl is not configured", statusCode: 500);
                }
            }

            // Validate that frontendUrl is an absolute URL
            if (!Uri.TryCreate(frontendUrl, UriKind.Absolute, out var frontendUri))
            {
                logger.LogError("Invalid FrontendUrl configuration: {FrontendUrl}", frontendUrl);
                return Results.Problem("Invalid FrontendUrl configuration", statusCode: 500);
            }

            // Build redirect URI, appending returnUrl path if provided and valid
            var redirectUri = frontendUrl.TrimEnd('/');
            if (!string.IsNullOrWhiteSpace(returnUrl))
            {
                // Ensure returnUrl is a relative path to prevent open redirect attacks
                if (returnUrl.StartsWith('/') && !returnUrl.StartsWith("//"))
                {
                    redirectUri += returnUrl;
                }
            }

            logger.LogInformation("Auth login initiated. Redirecting to: {RedirectUri}", redirectUri);

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

        group.MapGet("/username/check/{username}", async (string username, ClaimsPrincipal user, UserService userService) =>
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
        .WithName("CheckUsernameAvailability");

        group.MapPost("/username", async (SetUsernameRequest request, ClaimsPrincipal user, UserService userService, HttpContext context) =>
        {
            var userId = UserService.GetUserIdFromClaims(user);
            if (userId == null)
            {
                return Results.Unauthorized();
            }

            var (success, error) = await userService.SetUsernameAsync(userId.Value, request.Username);

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

            return Results.Ok(new { username = request.Username.Trim() });
        })
        .RequireAuthorization()
        .WithName("SetUsername");

        return group;
    }
}
