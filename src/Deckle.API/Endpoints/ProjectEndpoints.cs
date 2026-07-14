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

        group.MapGet("", HandleGetProjects)
        .WithName("GetProjects");

        group.MapGet("{id:guid}", HandleGetProjectById)
        .WithName("GetProjectById");

        group.MapGet("{username}/{code}", HandleGetProjectByUsernameAndCode)
        .WithName("GetProjectByUsernameAndCode");

        group.MapPost("", HandleCreateProject)
        .WithName("CreateProject");

        group.MapPut("{id:guid}", HandleUpdateProject)
        .WithName("UpdateProject");

        group.MapGet("{id:guid}/users", HandleGetProjectUsers)
        .WithName("GetProjectUsers");

        group.MapPost("{id:guid}/users/invite", HandleInviteUserToProject)
        .RequireRateLimiting("invite")
        .WithName("InviteUserToProject");

        group.MapDelete("{id:guid}/users/{userId:guid}", HandleRemoveUserFromProject)
        .WithName("RemoveUserFromProject");

        group.MapGet("{id:guid}/storage", HandleGetProjectStorage)
        .WithName("GetProjectStorage");

        group.MapDelete("{id:guid}", HandleDeleteProject)
        .WithName("DeleteProject");

        return group;
    }

    private static async Task<IResult> HandleGetProjects(HttpContext httpContext, IProjectService projectService)
    {
        var userId = httpContext.GetUserId();
        var projects = await projectService.GetUserProjectsAsync(userId);
        return Results.Ok(projects);
    }

    private static async Task<IResult> HandleGetProjectById(Guid id, HttpContext httpContext, IProjectService projectService)
    {
        var userId = httpContext.GetUserId();
        var project = await projectService.GetProjectByIdAsync(userId, id);

        return project == null ? Results.NotFound() : Results.Ok(project);
    }

    private static async Task<IResult> HandleGetProjectByUsernameAndCode(string username, string code, HttpContext httpContext, IProjectService projectService)
    {
        var userId = httpContext.GetUserId();
        var project = await projectService.GetProjectByUsernameAndCodeAsync(userId, username, code);

        return project == null ? Results.NotFound() : Results.Ok(project);
    }

    private static Deckle.Domain.Entities.ProjectVisibility ParseVisibility(string? visibility) =>
        !string.IsNullOrEmpty(visibility) &&
        Enum.TryParse<Deckle.Domain.Entities.ProjectVisibility>(visibility, out var parsed)
            ? parsed
            : Deckle.Domain.Entities.ProjectVisibility.Private;

    private static async Task<IResult> HandleCreateProject(HttpContext httpContext, IProjectService projectService, CreateProjectRequest request)
    {
        var userId = httpContext.GetUserId();
        var visibility = ParseVisibility(request.Visibility);
        var project = await projectService.CreateProjectAsync(userId, request.Name, request.Code, request.Description, visibility);
        return Results.Created($"/projects/{project.Id}", project);
    }

    private static async Task<IResult> HandleUpdateProject(Guid id, HttpContext httpContext, IProjectService projectService, UpdateProjectRequest request)
    {
        var userId = httpContext.GetUserId();
        var visibility = ParseVisibility(request.Visibility);
        var project = await projectService.UpdateProjectAsync(userId, id, request.Name, request.Description, visibility);

        return project == null ? Results.NotFound() : Results.Ok(project);
    }

    private static async Task<IResult> HandleGetProjectUsers(Guid id, HttpContext httpContext, IProjectService projectService)
    {
        var userId = httpContext.GetUserId();
        var users = await projectService.GetProjectUsersAsync(userId, id);
        return Results.Ok(users);
    }

    private static async Task<IResult> HandleInviteUserToProject(
        Guid id,
        HttpContext httpContext,
        IProjectService projectService,
        IEmailSender emailSender,
        IConfiguration configuration,
        InviteUserRequest request)
    {
        var userId = httpContext.GetUserId();

        var result = await projectService.InviteUserToProjectAsync(userId, id, request.Email, request.Role);
        if (result is not { user: not null } resultValue)
        {
            // The service should ideally throw KeyNotFoundException if project/user not found.
            // If it returns null, we handle it here explicitly.
            return Results.NotFound();
        }

        var (invitedUser, inviterName) = resultValue;

        // Get project details for email
        var project = await projectService.GetProjectByIdAsync(userId, id);
        if (project == null)
        {
            // This indicates an internal inconsistency if InviteUserToProjectAsync succeeded
            // but GetProjectByIdAsync fails immediately after. Could be a KeyNotFoundException.
            return Results.NotFound();
        }

        await SendInviteEmailAsync(emailSender, configuration, project, invitedUser, inviterName);

        return Results.Ok(invitedUser);
    }

    private static Task SendInviteEmailAsync(
        IEmailSender emailSender,
        IConfiguration configuration,
        ProjectDto project,
        ProjectUserDto invitedUser,
        string? inviterName)
    {
        // Construct invitation URL using the new username/code format
        var frontendUrl = configuration["FrontendUrl"] ?? "http://localhost:5173";
        var invitationUrl = $"{frontendUrl}/projects/{project.OwnerUsername}/{project.Code}";

        var emailTemplate = new NewUserInviteEmail
        {
            RecipientEmail = invitedUser.Email,
            InviterName = inviterName ?? "Someone",
            ProjectName = project.Name,
            InvitationUrl = invitationUrl
        };

        return emailSender.SendAsync(emailTemplate);
    }

    private static async Task<IResult> HandleRemoveUserFromProject(
        Guid id,
        Guid userId,
        HttpContext httpContext,
        IProjectService projectService)
    {
        var requestingUserId = httpContext.GetUserId();

        var success = await projectService.RemoveUserFromProjectAsync(requestingUserId, id, userId);

        return !success ? Results.NotFound() : Results.NoContent();
    }

    private static async Task<IResult> HandleGetProjectStorage(Guid id, HttpContext httpContext, IProjectService projectService)
    {
        var userId = httpContext.GetUserId();
        var storage = await projectService.GetProjectStorageAsync(userId, id);

        return storage == null ? Results.NotFound() : Results.Ok(storage);
    }

    private static async Task<IResult> HandleDeleteProject(Guid id, HttpContext httpContext, IProjectService projectService)
    {
        var userId = httpContext.GetUserId();
        await projectService.DeleteProjectAsync(userId, id);

        return Results.NoContent();
    }
}
