using Deckle.API.DTOs;
using Deckle.API.EmailTemplates;
using Deckle.API.Exceptions;
using Deckle.API.Filters;
using Deckle.API.Services;
using Deckle.Email.Abstractions;

namespace Deckle.API.Endpoints;

public static class ProjectEndpoints
{
    public static RouteGroupBuilder MapProjectEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/projects")
            .WithTags("Projects")
            .RequireAuthorization()
            .RequireUserId(); // Apply user ID validation to all endpoints in this group

        group.MapGet("", async (HttpContext httpContext, IProjectService projectService) =>
        {
            var userId = httpContext.GetUserId();
            var projects = await projectService.GetUserProjectsAsync(userId);
            return Results.Ok(projects);
        })
        .WithName("GetProjects");

        group.MapGet("{id:guid}", async (Guid id, HttpContext httpContext, IProjectService projectService) =>
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

        group.MapGet("{username}/{code}", async (string username, string code, HttpContext httpContext, IProjectService projectService) =>
        {
            var userId = httpContext.GetUserId();
            var project = await projectService.GetProjectByUsernameAndCodeAsync(userId, username, code);

            if (project == null)
            {
                return Results.NotFound();
            }

            return Results.Ok(project);
        })
        .WithName("GetProjectByUsernameAndCode");

        group.MapPost("", async (HttpContext httpContext, IProjectService projectService, CreateProjectRequest request) =>
        {
            var userId = httpContext.GetUserId();
            var project = await projectService.CreateProjectAsync(userId, request.Name, request.Code, request.Description);
            return Results.Created($"/projects/{project.Id}", project);
        })
        .WithName("CreateProject");

        group.MapPut("{id:guid}", async (Guid id, HttpContext httpContext, IProjectService projectService, UpdateProjectRequest request) =>
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

        group.MapGet("{id:guid}/users", async (Guid id, HttpContext httpContext, IProjectService projectService) =>
        {
            var userId = httpContext.GetUserId();
            var users = await projectService.GetProjectUsersAsync(userId, id);
            return Results.Ok(users);
        })
        .WithName("GetProjectUsers");

        group.MapPost("{id:guid}/users/invite", async (
            Guid id,
            HttpContext httpContext,
            IProjectService projectService,
            IEmailSender emailSender,
            IConfiguration configuration,
            InviteUserRequest request) =>
        {
            var userId = httpContext.GetUserId();

            var result = await projectService.InviteUserToProjectAsync(
                userId,
                id,
                request.Email,
                request.Role);

            if (result == null)
            {
                // The service should ideally throw KeyNotFoundException if project/user not found
                // If it returns null, we handle it here explicitly.
                return Results.NotFound();
            }

            var (invitedUser, inviterName) = result.Value;

            if (invitedUser == null)
            {
                // This condition might be redundant if result is null when invitedUser is null,
                // but keeping explicit for now.
                return Results.NotFound();
            }

            // Get project details for email
            var project = await projectService.GetProjectByIdAsync(userId, id);
            if (project == null)
            {
                // This indicates an internal inconsistency if InviteUserToProjectAsync succeeded
                // but GetProjectByIdAsync fails immediately after. Could be a KeyNotFoundException.
                return Results.NotFound();
            }

            // Construct invitation URL using the new username/code format
            var frontendUrl = configuration["FrontendUrl"] ?? "http://localhost:5173";
            var invitationUrl = $"{frontendUrl}/projects/{project.OwnerUsername}/{project.Code}";

            // Send email
            var emailTemplate = new NewUserInviteEmail
            {
                RecipientEmail = invitedUser.Email,
                InviterName = inviterName ?? "Someone",
                ProjectName = project.Name,
                InvitationUrl = invitationUrl
            };

            await emailSender.SendAsync(emailTemplate);

            return Results.Ok(invitedUser);
        })
        .WithName("InviteUserToProject");

        group.MapDelete("{id:guid}/users/{userId:guid}", async (
            Guid id,
            Guid userId,
            HttpContext httpContext,
            IProjectService projectService) =>
        {
            var requestingUserId = httpContext.GetUserId();

            var success = await projectService.RemoveUserFromProjectAsync(
                requestingUserId,
                id,
                userId);

            if (!success)
            {
                return Results.NotFound();
            }

            return Results.NoContent();
        })
        .WithName("RemoveUserFromProject");

        group.MapDelete("{id:guid}", async (Guid id, HttpContext httpContext, IProjectService projectService) =>
        {
            var userId = httpContext.GetUserId();
            await projectService.DeleteProjectAsync(userId, id);

            return Results.NoContent();
        })
        .WithName("DeleteProject");

        return group;
    }
}
