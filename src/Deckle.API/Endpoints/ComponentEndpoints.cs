using Deckle.API.DTOs;
using Deckle.API.Filters;
using Deckle.API.Services;
using Deckle.Domain.Entities;
using System.ComponentModel;
using System.Xml.Linq;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace Deckle.API.Endpoints;

public static class ComponentEndpoints
{
    public static RouteGroupBuilder MapComponentEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/projects/{projectId:guid}/components")
            .WithTags("Components")
            .RequireAuthorization()
            .RequireUserId();

        group.MapGet("", async (Guid projectId, HttpContext httpContext, ComponentService componentService) =>
        {
            var userId = httpContext.GetUserId();
            var components = await componentService.GetProjectComponentsAsync(userId, projectId);
            return Results.Ok(components);
        })
        .WithName("GetProjectComponents");

        group.MapGet("{id:guid}", async (Guid projectId, Guid id, HttpContext httpContext, ComponentService componentService) =>
        {
            var userId = httpContext.GetUserId();
            var component = await componentService.GetComponentByIdAsync(userId, id);

            if (component == null || component.ProjectId != projectId)
            {
                return Results.NotFound();
            }

            return Results.Ok(component);
        })
        .WithName("GetComponentById");

        group.MapPost("cards", async (Guid projectId, HttpContext httpContext, ComponentService componentService, CreateCardRequest request) =>
        {
            var userId = httpContext.GetUserId();

            var cardConfig = new CardConfig(request.Name, request.Size, request.Horizontal);
            var card = await componentService.CreateComponentAsync<Card, CardConfig>(userId, projectId, cardConfig);
            return Results.Created($"/projects/{projectId}/components/{card.Id}", new CardDto(card));
        })
        .WithName("CreateCard");

        group.MapPost("dice", async (Guid projectId, HttpContext httpContext, ComponentService componentService, CreateDiceRequest request) =>
        {
            var userId = httpContext.GetUserId();

            var dice = await componentService.CreateComponentAsync<Dice, DiceConfig>(
            userId, projectId,
            new DiceConfig(request.Name, request.Type, request.Style, request.BaseColor, request.Number));
            return Results.Created($"/projects/{projectId}/components/{dice.Id}", new DiceDto(dice));

        })
        .WithName("CreateDice");

        group.MapPost("playermats", async (Guid projectId, HttpContext httpContext, ComponentService componentService, CreatePlayerMatRequest request) =>
        {
            var userId = httpContext.GetUserId();

            var playerMat = await componentService.CreateComponentAsync<PlayerMat, PlayerMatConfig>(
                userId, projectId,
                new PlayerMatConfig(request.Name, request.PresetSize, request.Orientation, request.CustomWidthMm, request.CustomHeightMm));
            return Results.Created($"/projects/{projectId}/components/{playerMat.Id}", new PlayerMatDto(playerMat));
        })
        .WithName("CreatePlayerMat");

        group.MapPut("cards/{id:guid}", async (Guid projectId, Guid id, HttpContext httpContext, ComponentService componentService, UpdateCardRequest request) =>
        {
            var userId = httpContext.GetUserId();
            var card = await componentService.UpdateComponentAsync<Card, CardConfig>(userId, id, new(request.Name, request.Size, request.Horizontal));

            return card == null ? Results.NotFound() : Results.Ok(new CardDto(card));
        })
        .WithName("UpdateCard");

        group.MapPut("dice/{id:guid}", async (Guid projectId, Guid id, HttpContext httpContext, ComponentService componentService, UpdateDiceRequest request) =>
        {
            var userId = httpContext.GetUserId();
            var dice = await componentService.UpdateComponentAsync<Dice, DiceConfig>(userId, id, new(request.Name, request.Type, request.Style, request.BaseColor, request.Number));

            return dice == null ? Results.NotFound() : Results.Ok(new DiceDto(dice));
        })
        .WithName("UpdateDice");

        group.MapPut("playermats/{id:guid}", async (Guid projectId, Guid id, HttpContext httpContext, ComponentService componentService, UpdatePlayerMatRequest request) =>
        {
            var userId = httpContext.GetUserId();

            var playerMat = await componentService.UpdateComponentAsync<PlayerMat, PlayerMatConfig>(userId, id, new(request.Name, request.PresetSize, request.Orientation, request.CustomWidthMm, request.CustomHeightMm));

            return playerMat == null ? Results.NotFound() : Results.Ok(new PlayerMatDto(playerMat));
        })
        .WithName("UpdatePlayerMat");

        group.MapDelete("{id:guid}", async (Guid projectId, Guid id, HttpContext httpContext, ComponentService componentService) =>
        {
            var userId = httpContext.GetUserId();
            await componentService.DeleteComponentAsync(userId, id);

            return Results.NoContent();
        })
        .WithName("DeleteComponent");

        group.MapPut("{id:guid}/design/{part}", async (Guid projectId, Guid id, string part, HttpContext httpContext, ComponentService componentService, SaveDesignRequest request) =>
        {
            var userId = httpContext.GetUserId();

            var component = await componentService.SaveDesignAsync(userId, id, part, request.Design);

            if (component == null || component.ProjectId != projectId)
            {
                return Results.NotFound();
            }

            return Results.Ok(component);        })
        .WithName("SaveComponentDesign")
        .WithDescription("Save design for any editable component (Card, PlayerMat, etc.)");

        group.MapPut("{id:guid}/datasource", async (Guid projectId, Guid id, HttpContext httpContext, ComponentService componentService, UpdateComponentDataSourceRequest request) =>
        {
            var userId = httpContext.GetUserId();

            var component = await componentService.UpdateDataSourceAsync(userId, id, request.DataSourceId);

            if (component == null || component.ProjectId != projectId)
            {
                return Results.NotFound();
            }

            return Results.Ok(component);        })
        .WithName("UpdateComponentDataSource")
        .WithDescription("Update data source for any component that supports data sources (Card, PlayerMat, etc.)");

        return group;
    }
}

public record SaveDesignRequest(string? Design);

public record UpdateComponentDataSourceRequest(Guid? DataSourceId);
