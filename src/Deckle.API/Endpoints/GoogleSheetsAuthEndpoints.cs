using Deckle.API.Services;
using Microsoft.AspNetCore.Authentication;
using System.Security.Claims;

namespace Deckle.API.Endpoints;

public static class GoogleSheetsAuthEndpoints
{
    public static RouteGroupBuilder MapGoogleSheetsAuthEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/google-sheets-auth")
            .WithTags("GoogleSheetsAuth");

        // Check if user has authorized Google Sheets
        group.MapGet("status", async (ClaimsPrincipal user, UserService userService) =>
        {
            var userId = UserService.GetUserIdFromClaims(user);

            if (userId == null)
            {
                return Results.Unauthorized();
            }

            var hasAuth = await userService.HasGoogleSheetsAuthAsync(userId.Value);
            return Results.Ok(new { authorized = hasAuth });
        })
        .RequireAuthorization()
        .WithName("GetGoogleSheetsAuthStatus");

        // Initiate Google Sheets OAuth flow
        group.MapGet("authorize", (HttpContext httpContext, IConfiguration configuration, string? returnUrl) =>
        {
            var frontendUrl = configuration["FrontendUrl"] ?? "http://localhost:5173";
            var properties = new AuthenticationProperties
            {
                RedirectUri = $"/google-sheets-auth/callback"
            };

            // Store the return URL in the state for later retrieval
            properties.Items["returnUrl"] = returnUrl ?? "/";

            // Force consent to ensure we get a refresh token
            properties.Items["prompt"] = "consent";

            // Mark this as a Google Sheets auth flow (not a regular login)
            properties.Items["loginType"] = "google-sheets";

            // Add custom scopes - include profile and email so Google OAuth handler can fetch user info
            // The handler requires these to complete successfully
            properties.Items["scope"] = "profile email https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.readonly";

            // Use the main Google scheme but with custom scopes
            return Results.Challenge(properties, new[] { "Google" });
        })
        .RequireAuthorization()
        .WithName("AuthorizeGoogleSheets");

        // OAuth callback handler
        // This is called after the Google OAuth flow completes via OnCreatingTicket event
        group.MapGet("callback", async (HttpContext httpContext, UserService userService, IConfiguration configuration) =>
        {
            var frontendUrl = configuration["FrontendUrl"] ?? "http://localhost:5173";

            // The returnUrl should be in the cookie authentication properties
            var authenticateResult = await httpContext.AuthenticateAsync();
            var returnUrl = "/";
            if (authenticateResult.Properties?.Items.TryGetValue("returnUrl", out var returnUrlValue) == true)
            {
                returnUrl = returnUrlValue ?? "/";
            }

            // Check if Google Sheets auth was successful by verifying the user has credentials
            var userId = UserService.GetUserIdFromClaims(httpContext.User);

            if (userId == null)
            {
                return Results.Redirect($"{frontendUrl}{returnUrl}?error=unauthorized");
            }

            var hasAuth = await userService.HasGoogleSheetsAuthAsync(userId.Value);

            if (!hasAuth)
            {
                return Results.Redirect($"{frontendUrl}{returnUrl}?error=auth_failed");
            }

            return Results.Redirect($"{frontendUrl}{returnUrl}?success=true");
        })
        .RequireAuthorization()
        .WithName("GoogleSheetsCallback");

        // Revoke Google Sheets authorization
        group.MapPost("revoke", async (ClaimsPrincipal user, UserService userService) =>
        {
            var userId = UserService.GetUserIdFromClaims(user);

            if (userId == null)
            {
                return Results.Unauthorized();
            }

            await userService.RevokeGoogleCredentialAsync(userId.Value);
            return Results.Ok(new { success = true });
        })
        .RequireAuthorization()
        .WithName("RevokeGoogleSheetsAuth");

        return group;
    }
}
