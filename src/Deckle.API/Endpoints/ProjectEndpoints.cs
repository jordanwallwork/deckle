using Deckle.API.DTOs;
using Deckle.API.Filters;
using Deckle.API.Services;

namespace Deckle.API.Endpoints;

public static class ProjectEndpoints
{
    public static RouteGroupBuilder MapProjectEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/projects")
            .WithTags("Projects")
            .RequireAuthorization()
            .RequireUserId(); // Apply user ID validation to all endpoints in this group

        group.MapGet("", async (HttpContext httpContext, ProjectService projectService) =>
        {
            var userId = httpContext.GetUserId();
            var projects = await projectService.GetUserProjectsAsync(userId);
            return Results.Ok(projects);
        })
        .WithName("GetProjects");

        group.MapGet("{id:guid}", async (Guid id, HttpContext httpContext, ProjectService projectService) =>
        {
            var userId = httpContext.GetUserId();
            var project = await projectService.GetProjectByIdAsync(userId, id);

            if (project == null)
            {
                return Results.NotFound();
            }

            return Results.Ok(project);
        })
        .WithName("GetProjectById");

        group.MapPost("", async (HttpContext httpContext, ProjectService projectService, CreateProjectRequest request) =>
        {
            var userId = httpContext.GetUserId();
            var project = await projectService.CreateProjectAsync(userId, request.Name, request.Description);
            return Results.Created($"/projects/{project.Id}", project);
        })
        .WithName("CreateProject");

        group.MapPut("{id:guid}", async (Guid id, HttpContext httpContext, ProjectService projectService, UpdateProjectRequest request) =>
        {
            var userId = httpContext.GetUserId();
            var project = await projectService.UpdateProjectAsync(userId, id, request.Name, request.Description);

            if (project == null)
            {
                return Results.NotFound();
            }

            return Results.Ok(project);
        })
        .WithName("UpdateProject");

        group.MapGet("{id:guid}/users", async (Guid id, HttpContext httpContext, ProjectService projectService) =>
        {
            var userId = httpContext.GetUserId();
            var users = await projectService.GetProjectUsersAsync(userId, id);
            return Results.Ok(users);
        })
        .WithName("GetProjectUsers");

        group.MapDelete("{id:guid}", async (Guid id, HttpContext httpContext, ProjectService projectService) =>
        {
            var userId = httpContext.GetUserId();
            var success = await projectService.DeleteProjectAsync(userId, id);

            if (!success)
            {
                return Results.NotFound();
            }

            return Results.NoContent();
        })
        .WithName("DeleteProject");

        return group;
    }
}
