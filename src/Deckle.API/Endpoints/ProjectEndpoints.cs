using Deckle.API.Services;
using System.Security.Claims;

namespace Deckle.API.Endpoints;

public static class ProjectEndpoints
{
    public static RouteGroupBuilder MapProjectEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/projects")
            .WithTags("Projects")
            .RequireAuthorization();

        group.MapGet("", async (ClaimsPrincipal user, ProjectService projectService) =>
        {
            var userId = UserService.GetUserIdFromClaims(user);

            if (userId == null)
            {
                return Results.Unauthorized();
            }

            var projects = await projectService.GetUserProjectsAsync(userId.Value);
            return Results.Ok(projects);
        })
        .WithName("GetProjects");

        group.MapGet("{id:guid}", async (Guid id, ClaimsPrincipal user, ProjectService projectService) =>
        {
            var userId = UserService.GetUserIdFromClaims(user);

            if (userId == null)
            {
                return Results.Unauthorized();
            }

            var project = await projectService.GetProjectByIdAsync(userId.Value, id);

            if (project == null)
            {
                return Results.NotFound();
            }

            return Results.Ok(project);
        })
        .WithName("GetProjectById");

        group.MapPost("", async (ClaimsPrincipal user, ProjectService projectService, CreateProjectRequest request) =>
        {
            var userId = UserService.GetUserIdFromClaims(user);

            if (userId == null)
            {
                return Results.Unauthorized();
            }

            var project = await projectService.CreateProjectAsync(userId.Value, request.Name, request.Description);
            return Results.Created($"/projects/{project.Id}", project);
        })
        .WithName("CreateProject");

        return group;
    }
}
