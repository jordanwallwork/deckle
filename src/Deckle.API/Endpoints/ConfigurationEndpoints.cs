using Deckle.API.Services;

namespace Deckle.API.Endpoints;

public static class ConfigurationEndpoints
{
    public static RouteGroupBuilder MapConfigurationEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/configuration")
            .WithTags("Configuration");

        group.MapGet("component-options", (ConfigurationService configurationService) =>
        {
            var options = configurationService.GetComponentConfigurationOptions();
            return Results.Ok(options);
        })
        .WithName("GetComponentConfigurationOptions")
        .WithDescription("Get available configuration options for components (card sizes, dice types, etc.)");

        return group;
    }
}
