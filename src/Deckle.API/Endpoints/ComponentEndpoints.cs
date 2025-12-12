using Deckle.API.DTOs;
using Deckle.API.Services;
using System.Security.Claims;

namespace Deckle.API.Endpoints;

public static class ComponentEndpoints
{
    public static RouteGroupBuilder MapComponentEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/projects/{projectId:guid}/components")
            .WithTags("Components")
            .RequireAuthorization();

        group.MapGet("", async (Guid projectId, ClaimsPrincipal user, ComponentService componentService) =>
        {
            var userId = UserService.GetUserIdFromClaims(user);

            if (userId == null)
            {
                return Results.Unauthorized();
            }

            var components = await componentService.GetProjectComponentsAsync(userId.Value, projectId);
            return Results.Ok(components);
        })
        .WithName("GetProjectComponents");

        group.MapGet("{id:guid}", async (Guid projectId, Guid id, ClaimsPrincipal user, ComponentService componentService) =>
        {
            var userId = UserService.GetUserIdFromClaims(user);

            if (userId == null)
            {
                return Results.Unauthorized();
            }

            var component = await componentService.GetComponentByIdAsync(userId.Value, id);

            if (component == null || component.ProjectId != projectId)
            {
                return Results.NotFound();
            }

            return Results.Ok(component);
        })
        .WithName("GetComponentById");

        group.MapPost("cards", async (Guid projectId, ClaimsPrincipal user, ComponentService componentService, CreateCardRequest request) =>
        {
            var userId = UserService.GetUserIdFromClaims(user);

            if (userId == null)
            {
                return Results.Unauthorized();
            }

            try
            {
                var card = await componentService.CreateCardAsync(userId.Value, projectId, request.Name, request.Size);
                return Results.Created($"/projects/{projectId}/components/{card.Id}", card);
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Unauthorized();
            }
        })
        .WithName("CreateCard");

        group.MapPost("dice", async (Guid projectId, ClaimsPrincipal user, ComponentService componentService, CreateDiceRequest request) =>
        {
            var userId = UserService.GetUserIdFromClaims(user);

            if (userId == null)
            {
                return Results.Unauthorized();
            }

            try
            {
                var dice = await componentService.CreateDiceAsync(userId.Value, projectId, request.Name, request.Type, request.Style, request.BaseColor, request.Number);
                return Results.Created($"/projects/{projectId}/components/{dice.Id}", dice);
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Unauthorized();
            }
        })
        .WithName("CreateDice");

        group.MapPut("cards/{id:guid}", async (Guid projectId, Guid id, ClaimsPrincipal user, ComponentService componentService, UpdateCardRequest request) =>
        {
            var userId = UserService.GetUserIdFromClaims(user);

            if (userId == null)
            {
                return Results.Unauthorized();
            }

            var card = await componentService.UpdateCardAsync(userId.Value, id, request.Name, request.Size);

            if (card == null)
            {
                return Results.NotFound();
            }

            return Results.Ok(card);
        })
        .WithName("UpdateCard");

        group.MapPut("dice/{id:guid}", async (Guid projectId, Guid id, ClaimsPrincipal user, ComponentService componentService, UpdateDiceRequest request) =>
        {
            var userId = UserService.GetUserIdFromClaims(user);

            if (userId == null)
            {
                return Results.Unauthorized();
            }

            var dice = await componentService.UpdateDiceAsync(userId.Value, id, request.Name, request.Type, request.Style, request.BaseColor, request.Number);

            if (dice == null)
            {
                return Results.NotFound();
            }

            return Results.Ok(dice);
        })
        .WithName("UpdateDice");

        group.MapDelete("{id:guid}", async (Guid projectId, Guid id, ClaimsPrincipal user, ComponentService componentService) =>
        {
            var userId = UserService.GetUserIdFromClaims(user);

            if (userId == null)
            {
                return Results.Unauthorized();
            }

            var deleted = await componentService.DeleteComponentAsync(userId.Value, id);

            if (!deleted)
            {
                return Results.NotFound();
            }

            return Results.NoContent();
        })
        .WithName("DeleteComponent");

        return group;
    }
}
