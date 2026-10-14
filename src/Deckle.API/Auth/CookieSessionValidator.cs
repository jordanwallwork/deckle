using System.Security.Claims;
using Deckle.API.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace Deckle.API.Auth;

/// <summary>
/// Re-validates cookie sessions against the user's current account state:
/// disabled (or deleted) users are signed out, and role changes are applied to the cookie
/// so promotions and demotions take effect without signing in again.
/// </summary>
public static class CookieSessionValidator
{
    public static async Task ValidatePrincipalAsync(CookieValidatePrincipalContext context)
    {
        if (context.Principal == null)
        {
            return;
        }

        var userId = UserService.GetUserIdFromClaims(context.Principal);
        if (userId == null)
        {
            return;
        }

        var sessionCache = context.HttpContext.RequestServices.GetRequiredService<IUserSessionCache>();
        var state = await sessionCache.GetAsync(userId.Value, context.HttpContext.RequestAborted);

        if (state == null || state.IsDisabled)
        {
            context.RejectPrincipal();
            await context.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return;
        }

        if (context.Principal.Identity is ClaimsIdentity identity && UpdateRoleClaim(identity, state.Role.ToString()))
        {
            context.ShouldRenew = true;
        }
    }

    /// <summary>
    /// Replaces the identity's role claim when it differs from <paramref name="role"/>.
    /// Returns true if the identity was changed.
    /// </summary>
    internal static bool UpdateRoleClaim(ClaimsIdentity identity, string role)
    {
        var roleClaims = identity.FindAll(ClaimTypes.Role).ToList();
        if (roleClaims.Count == 1 && roleClaims[0].Value == role)
        {
            return false;
        }

        foreach (var claim in roleClaims)
        {
            identity.RemoveClaim(claim);
        }

        identity.AddClaim(new Claim(ClaimTypes.Role, role));
        return true;
    }
}
