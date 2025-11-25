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

        group.MapGet("/login", (IConfiguration configuration) =>
        {
            var frontendUrl = configuration["FrontendUrl"] ?? "http://localhost:5173";
            return Results.Challenge(
                new AuthenticationProperties { RedirectUri = $"{frontendUrl}/projects" },
                new[] { GoogleDefaults.AuthenticationScheme }
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

        return group;
    }
}
