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

        group.MapPut("cards/{id:guid}/design/{part}", async (Guid projectId, Guid id, string part, HttpContext httpContext, ComponentService componentService, SaveCardDesignRequest request) =>
        {
            var userId = httpContext.GetUserId();

            try
            {
                var card = await componentService.SaveCardDesignAsync(userId, id, part, request.Design);

                if (card == null || card.ProjectId != projectId)
                {
                    return Results.NotFound();
                }

                return Results.Ok(card);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(ex.Message);
            }
        })
        .WithName("SaveCardDesign");

        group.MapPut("cards/{id:guid}/datasource", async (Guid projectId, Guid id, HttpContext httpContext, ComponentService componentService, UpdateCardDataSourceRequest request) =>
        {
            var userId = httpContext.GetUserId();

            try
            {
                var card = await componentService.UpdateCardDataSourceAsync(userId, id, request.DataSourceId);

                if (card == null || card.ProjectId != projectId)
                {
                    return Results.NotFound();
                }

                return Results.Ok(card);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(ex.Message);
            }
        })
        .WithName("UpdateCardDataSource");

        return group;
    }
}

public record SaveCardDesignRequest(string? Design);

public record UpdateCardDataSourceRequest(Guid? DataSourceId);
