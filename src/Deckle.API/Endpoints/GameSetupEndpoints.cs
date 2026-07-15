using Deckle.API.DTOs;
using Deckle.API.Filters;
using Deckle.API.Services;

namespace Deckle.API.Endpoints;

public static class GameSetupEndpoints
{
    public static RouteGroupBuilder MapGameSetupEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/projects/{projectId:guid}/setups")
            .WithTags("GameSetups")
            .RequireAuthorization()
            .RequireUserId();

        group.MapGet("", HandleGetProjectSetups)
        .WithName("GetProjectSetups");

        group.MapGet("{setupId:guid}", HandleGetSetupById)
        .WithName("GetGameSetupById");

        group.MapPost("", HandleCreateSetup)
        .WithName("CreateGameSetup");

        group.MapPut("{setupId:guid}", HandleUpdateSetup)
        .WithName("UpdateGameSetup");

        group.MapDelete("{setupId:guid}", HandleDeleteSetup)
        .WithName("DeleteGameSetup");

        return group;
    }

    private static async Task<IResult> HandleGetProjectSetups(Guid projectId, HttpContext httpContext, IGameSetupService gameSetupService)
    {
        var userId = httpContext.GetUserId();
        var setups = await gameSetupService.GetProjectSetupsAsync(userId, projectId);
        return Results.Ok(setups);
    }

    private static async Task<IResult> HandleGetSetupById(Guid projectId, Guid setupId, HttpContext httpContext, IGameSetupService gameSetupService)
    {
        var userId = httpContext.GetUserId();
        var setup = await gameSetupService.GetSetupByIdAsync(userId, projectId, setupId);
        return setup == null ? Results.NotFound() : Results.Ok(setup);
    }

    private static async Task<IResult> HandleCreateSetup(Guid projectId, HttpContext httpContext, IGameSetupService gameSetupService, CreateGameSetupRequest request)
    {
        var userId = httpContext.GetUserId();
        var setup = await gameSetupService.CreateSetupAsync(userId, projectId, request.Name, request.Document, request.IsValid);
        return Results.Created($"/projects/{projectId}/setups/{setup.Id}", setup);
    }

    private static async Task<IResult> HandleUpdateSetup(Guid projectId, Guid setupId, HttpContext httpContext, IGameSetupService gameSetupService, UpdateGameSetupRequest request)
    {
        var userId = httpContext.GetUserId();
        var setup = await gameSetupService.UpdateSetupAsync(userId, projectId, setupId, request.Name, request.Document, request.IsValid);
        return setup == null ? Results.NotFound() : Results.Ok(setup);
    }

    private static async Task<IResult> HandleDeleteSetup(Guid projectId, Guid setupId, HttpContext httpContext, IGameSetupService gameSetupService)
    {
        var userId = httpContext.GetUserId();
        var deleted = await gameSetupService.DeleteSetupAsync(userId, projectId, setupId);
        return deleted ? Results.NoContent() : Results.NotFound();
    }
}
