using Deckle.API.DTOs;
using Deckle.API.Filters;
using Deckle.API.Services;

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

            try
            {
                var card = await componentService.CreateCardAsync(userId, projectId, request.Name, request.Size);
                return Results.Created($"/projects/{projectId}/components/{card.Id}", card);
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Unauthorized();
            }
        })
        .WithName("CreateCard");

        group.MapPost("dice", async (Guid projectId, HttpContext httpContext, ComponentService componentService, CreateDiceRequest request) =>
        {
            var userId = httpContext.GetUserId();

            try
            {
                var dice = await componentService.CreateDiceAsync(userId, projectId, request.Name, request.Type, request.Style, request.BaseColor, request.Number);
                return Results.Created($"/projects/{projectId}/components/{dice.Id}", dice);
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Unauthorized();
            }
        })
        .WithName("CreateDice");

        group.MapPost("playermats", async (Guid projectId, HttpContext httpContext, ComponentService componentService, CreatePlayerMatRequest request) =>
        {
            var userId = httpContext.GetUserId();

            try
            {
                var playerMat = await componentService.CreatePlayerMatAsync(
                    userId,
                    projectId,
                    request.Name,
                    request.PresetSize,
                    request.Orientation,
                    request.CustomWidthMm,
                    request.CustomHeightMm);
                return Results.Created($"/projects/{projectId}/components/{playerMat.Id}", playerMat);
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Unauthorized();
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(ex.Message);
            }
        })
        .WithName("CreatePlayerMat");

        group.MapPut("cards/{id:guid}", async (Guid projectId, Guid id, HttpContext httpContext, ComponentService componentService, UpdateCardRequest request) =>
        {
            var userId = httpContext.GetUserId();
            var card = await componentService.UpdateCardAsync(userId, id, request.Name, request.Size);

            if (card == null)
            {
                return Results.NotFound();
            }

            return Results.Ok(card);
        })
        .WithName("UpdateCard");

        group.MapPut("dice/{id:guid}", async (Guid projectId, Guid id, HttpContext httpContext, ComponentService componentService, UpdateDiceRequest request) =>
        {
            var userId = httpContext.GetUserId();
            var dice = await componentService.UpdateDiceAsync(userId, id, request.Name, request.Type, request.Style, request.BaseColor, request.Number);

            if (dice == null)
            {
                return Results.NotFound();
            }

            return Results.Ok(dice);
        })
        .WithName("UpdateDice");

        group.MapPut("playermats/{id:guid}", async (Guid projectId, Guid id, HttpContext httpContext, ComponentService componentService, UpdatePlayerMatRequest request) =>
        {
            var userId = httpContext.GetUserId();

            try
            {
                var playerMat = await componentService.UpdatePlayerMatAsync(
                    userId,
                    id,
                    request.Name,
                    request.PresetSize,
                    request.Orientation,
                    request.CustomWidthMm,
                    request.CustomHeightMm);

                if (playerMat == null)
                {
                    return Results.NotFound();
                }

                return Results.Ok(playerMat);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(ex.Message);
            }
        })
        .WithName("UpdatePlayerMat");

        group.MapDelete("{id:guid}", async (Guid projectId, Guid id, HttpContext httpContext, ComponentService componentService) =>
        {
            var userId = httpContext.GetUserId();
            var deleted = await componentService.DeleteComponentAsync(userId, id);

            if (!deleted)
            {
                return Results.NotFound();
            }

            return Results.NoContent();
        })
        .WithName("DeleteComponent");

        group.MapPut("{id:guid}/design/{part}", async (Guid projectId, Guid id, string part, HttpContext httpContext, ComponentService componentService, SaveDesignRequest request) =>
        {
            var userId = httpContext.GetUserId();

            try
            {
                var component = await componentService.SaveDesignAsync(userId, id, part, request.Design);

                if (component == null || component.ProjectId != projectId)
                {
                    return Results.NotFound();
                }

                return Results.Ok(component);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        })
        .WithName("SaveComponentDesign")
        .WithDescription("Save design for any editable component (Card, PlayerMat, etc.)");

        group.MapPut("{id:guid}/datasource", async (Guid projectId, Guid id, HttpContext httpContext, ComponentService componentService, UpdateComponentDataSourceRequest request) =>
        {
            var userId = httpContext.GetUserId();

            try
            {
                var component = await componentService.UpdateDataSourceAsync(userId, id, request.DataSourceId);

                if (component == null || component.ProjectId != projectId)
                {
                    return Results.NotFound();
                }

                return Results.Ok(component);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(ex.Message);
            }
        })
        .WithName("UpdateComponentDataSource")
        .WithDescription("Update data source for any component that supports data sources (Card, PlayerMat, etc.)");

        return group;
    }
}

public record SaveDesignRequest(string? Design);

public record UpdateComponentDataSourceRequest(Guid? DataSourceId);
