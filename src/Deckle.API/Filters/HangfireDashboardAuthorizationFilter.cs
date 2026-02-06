using System.Security.Claims;
using Hangfire.Dashboard;

namespace Deckle.API.Filters;

/// <summary>
/// Authorization filter for the Hangfire dashboard that restricts access to
/// authenticated users with the Administrator role.
/// </summary>
public class HangfireDashboardAuthorizationFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();

        // User must be authenticated
        if (httpContext.User.Identity?.IsAuthenticated != true)
        {
            return false;
        }

        // User must have the Administrator role
        return httpContext.User.IsInRole("Administrator");
    }
}
