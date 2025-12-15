using Deckle.API.Services;

namespace Deckle.API.Filters;

/// <summary>
/// Endpoint filter that validates the user ID exists in claims and makes it available via HttpContext.
/// Returns Unauthorized if the user ID is missing or invalid.
/// </summary>
public class RequireUserIdFilter : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var httpContext = context.HttpContext;
        var user = httpContext.User;

        var userId = UserService.GetUserIdFromClaims(user);

        if (userId == null)
        {
            return Results.Unauthorized();
        }

        // Store the user ID in HttpContext.Items for easy access in endpoints
        httpContext.Items["UserId"] = userId.Value;

        return await next(context);
    }
}

/// <summary>
/// Extension methods for working with the RequireUserIdFilter.
/// </summary>
public static class RequireUserIdFilterExtensions
{
    /// <summary>
    /// Adds the RequireUserIdFilter to a route group, which validates the user ID from claims
    /// and returns Unauthorized if missing.
    /// </summary>
    public static RouteGroupBuilder RequireUserId(this RouteGroupBuilder builder)
    {
        return builder.AddEndpointFilter<RequireUserIdFilter>();
    }

    /// <summary>
    /// Adds the RequireUserIdFilter to an endpoint, which validates the user ID from claims
    /// and returns Unauthorized if missing.
    /// </summary>
    public static RouteHandlerBuilder RequireUserId(this RouteHandlerBuilder builder)
    {
        return builder.AddEndpointFilter<RequireUserIdFilter>();
    }

    /// <summary>
    /// Gets the authenticated user ID from HttpContext.Items.
    /// This should only be called in endpoints that use RequireUserId().
    /// </summary>
    /// <exception cref="InvalidOperationException">Thrown if the user ID is not found in HttpContext.Items</exception>
    public static Guid GetUserId(this HttpContext httpContext)
    {
        if (httpContext.Items.TryGetValue("UserId", out var userId) && userId is Guid guidValue)
        {
            return guidValue;
        }

        throw new InvalidOperationException(
            "User ID not found in HttpContext. Ensure the endpoint uses RequireUserId().");
    }
}
