using Deckle.API.DTOs;
using Deckle.API.Filters;
using Deckle.API.Services;

namespace Deckle.API.Endpoints;

public static class SampleEndpoints
{
    public static RouteGroupBuilder MapSampleEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/samples")
            .WithTags("Samples")
            .RequireAuthorization()
            .RequireUserId();

        group.MapGet("templates", async (string type, ComponentService componentService) =>
        {
            var templates = await componentService.GetSampleTemplatesAsync(type);
            return Results.Ok(templates);
        })
        .WithName("GetSampleTemplates")
        .WithDescription("Get sample component templates for a given component type (card, playermat)");

        return group;
    }
}
