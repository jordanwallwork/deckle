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

        group.MapGet("", async (string type, IComponentService componentService) =>
        {
            var samples = await componentService.GetSamplesForTypeAsync(type);
            return Results.Ok(samples);
        })
        .WithName("GetSamples")
        .WithDescription("Get sample components for a given component type (card, playermat)");

        return group;
    }
}
