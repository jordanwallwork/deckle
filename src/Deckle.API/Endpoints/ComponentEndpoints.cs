using Deckle.API.Configurators;
using Deckle.API.DTOs;
using Deckle.API.Filters;
using Deckle.API.Services;
using Deckle.Domain.Entities;

namespace Deckle.API.Endpoints;

public static class ComponentEndpoints
{
    [System.Diagnostics.CodeAnalysis.SuppressMessage("Microsoft.Maintainability", "CA1506:AvoidExcessiveClassCoupling", Justification = "Endpoint mapping inherently couples to many types")]
    public static RouteGroupBuilder MapComponentEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/projects/{projectId}/components")
            .WithTags("Components")
            .RequireAuthorization()
            .RequireUserId();

        group.MapGet("", async (string projectId, HttpContext httpContext, IComponentService componentService) =>
        {
            var userId = httpContext.GetUserId();
            var parsedProjectId = ParseProjectId(projectId);
            var components = await componentService.GetProjectComponentsAsync(userId, parsedProjectId);
            return Results.Ok(components);
        })
        .WithName("GetProjectComponents");

        group.MapGet("{id:guid}", async (string projectId, Guid id, HttpContext httpContext, IComponentService componentService) =>
        {
            var userId = httpContext.GetUserId();
            var parsedProjectId = ParseProjectId(projectId);
            var component = await componentService.GetComponentByIdAsync<Domain.Entities.Component>(userId, id);

            return component == null || component.ProjectId != parsedProjectId ? Results.NotFound() : Results.Ok(component.ToComponentDto());
        })
        .WithName("GetComponentById");

        group.MapPost("cards", async (string projectId, HttpContext httpContext, IComponentService componentService, CreateCardRequest request) =>
        {
            var userId = httpContext.GetUserId();
            var parsedProjectId = ParseProjectId(projectId);

            var cardConfig = new CardConfig(request.Name, request.Size, request.Horizontal, request.Sample);
            var card = await componentService.CreateComponentAsync<Card, CardConfig>(userId, parsedProjectId, cardConfig);
            return Results.Created($"/projects/{projectId}/components/{card.Id}", new CardDto(card));
        })
        .WithName("CreateCard");

        group.MapPost("dice", async (string projectId, HttpContext httpContext, IComponentService componentService, CreateDiceRequest request) =>
        {
            var userId = httpContext.GetUserId();
            var parsedProjectId = ParseProjectId(projectId);

            var dice = await componentService.CreateComponentAsync<Dice, DiceConfig>(
            userId, parsedProjectId,
            new DiceConfig(request.Name, request.Type, request.Style, request.BaseColor, request.Number));
            return Results.Created($"/projects/{projectId}/components/{dice.Id}", new DiceDto(dice));

        })
        .WithName("CreateDice");

        group.MapPost("gameboards", async (string projectId, HttpContext httpContext, IComponentService componentService, CreateGameBoardRequest request) =>
        {
            var userId = httpContext.GetUserId();
            var parsedProjectId = ParseProjectId(projectId);

            var board = await componentService.CreateComponentAsync<GameBoard, GameBoardConfig>(
                userId, parsedProjectId,
                new GameBoardConfig(request.Name, request.PresetSize, request.Horizontal,
                    request.CustomWidthMm, request.CustomHeightMm,
                    request.CustomHorizontalFolds, request.CustomVerticalFolds, request.Sample));
            return Results.Created($"/projects/{projectId}/components/{board.Id}", new GameBoardDto(board));
        })
        .WithName("CreateGameBoard");

        group.MapPost("playermats", async (string projectId, HttpContext httpContext, IComponentService componentService, CreatePlayerMatRequest request) =>
        {
            var userId = httpContext.GetUserId();
            var parsedProjectId = ParseProjectId(projectId);

            var playerMat = await componentService.CreateComponentAsync<PlayerMat, PlayerMatConfig>(
                userId, parsedProjectId,
                new PlayerMatConfig(request.Name, request.PresetSize, request.Horizontal, request.CustomWidthMm, request.CustomHeightMm, request.Sample));
            return Results.Created($"/projects/{projectId}/components/{playerMat.Id}", new PlayerMatDto(playerMat));
        })
        .WithName("CreatePlayerMat");

        group.MapPut("cards/{id:guid}", async (string projectId, Guid id, HttpContext httpContext, IComponentService componentService, UpdateCardRequest request) =>
        {
            var userId = httpContext.GetUserId();
            var card = await componentService.UpdateComponentAsync<Card, CardConfig>(userId, id, new(request.Name, request.Size, request.Horizontal, request.Sample));

            return card == null ? Results.NotFound() : Results.Ok(new CardDto(card));
        })
        .WithName("UpdateCard");

        group.MapPut("dice/{id:guid}", async (string projectId, Guid id, HttpContext httpContext, IComponentService componentService, UpdateDiceRequest request) =>
        {
            var userId = httpContext.GetUserId();
            var dice = await componentService.UpdateComponentAsync<Dice, DiceConfig>(userId, id, new(request.Name, request.Type, request.Style, request.BaseColor, request.Number));

            return dice == null ? Results.NotFound() : Results.Ok(new DiceDto(dice));
        })
        .WithName("UpdateDice");

        group.MapPut("gameboards/{id:guid}", async (string projectId, Guid id, HttpContext httpContext, IComponentService componentService, UpdateGameBoardRequest request) =>
        {
            var userId = httpContext.GetUserId();

            var board = await componentService.UpdateComponentAsync<GameBoard, GameBoardConfig>(userId, id,
                new(request.Name, request.PresetSize, request.Horizontal,
                    request.CustomWidthMm, request.CustomHeightMm,
                    request.CustomHorizontalFolds, request.CustomVerticalFolds, request.Sample));

            return board == null ? Results.NotFound() : Results.Ok(new GameBoardDto(board));
        })
        .WithName("UpdateGameBoard");

        group.MapPut("playermats/{id:guid}", async (string projectId, Guid id, HttpContext httpContext, IComponentService componentService, UpdatePlayerMatRequest request) =>
        {
            var userId = httpContext.GetUserId();

            var playerMat = await componentService.UpdateComponentAsync<PlayerMat, PlayerMatConfig>(userId, id,
                new(request.Name, request.PresetSize, request.Horizontal, request.CustomWidthMm, request.CustomHeightMm, request.Sample));

            return playerMat == null ? Results.NotFound() : Results.Ok(new PlayerMatDto(playerMat));
        })
        .WithName("UpdatePlayerMat");

        group.MapDelete("{id:guid}", async (string projectId, Guid id, HttpContext httpContext, IComponentService componentService) =>
        {
            var userId = httpContext.GetUserId();
            await componentService.DeleteComponentAsync(userId, id);

            return Results.NoContent();
        })
        .WithName("DeleteComponent");

        group.MapPut("{id:guid}/design/{part}", async (string projectId, Guid id, string part, HttpContext httpContext, IComponentService componentService, SaveDesignRequest request) =>
        {
            var userId = httpContext.GetUserId();
            var parsedProjectId = ParseProjectId(projectId);

            var component = await componentService.SaveDesignAsync(userId, id, part, request.Design);

            return component == null || component.ProjectId != parsedProjectId ? Results.NotFound() : Results.Ok(component);
        })
        .WithName("SaveComponentDesign")
        .WithDescription("Save design for any editable component (Card, PlayerMat, etc.)");

        group.MapPut("{id:guid}/datasource", async (string projectId, Guid id, HttpContext httpContext, IComponentService componentService, UpdateComponentDataSourceRequest request) =>
        {
            var userId = httpContext.GetUserId();
            var parsedProjectId = ParseProjectId(projectId);

            var component = await componentService.UpdateDataSourceAsync(userId, id, request.DataSourceId);

            return component == null || component.ProjectId != parsedProjectId ? Results.NotFound() : Results.Ok(component);
        })
        .WithName("UpdateComponentDataSource")
        .WithDescription("Update data source for any component that supports data sources (Card, PlayerMat, etc.)");

        return group;
    }

    private static Guid? ParseProjectId(string projectId) =>
        Guid.TryParse(projectId, out var parsed) ? parsed : null;
}

public record SaveDesignRequest(string? Design);

public record UpdateComponentDataSourceRequest(Guid? DataSourceId);
