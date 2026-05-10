using System.ComponentModel;
using System.Text.Json;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ModelContextProtocol.Server;

namespace Deckle.API.McpTools;

[McpServerToolType]
public sealed class ProjectTools(AppDbContext db, IHttpContextAccessor httpContextAccessor)
    : BaseMcpTool(db, httpContextAccessor)
{
    [McpServerTool, Description("List all projects the authenticated user has access to.")]
    public async Task<string> ListProjects()
    {
        var projects = await Db.UserProjects
            .Where(up => up.UserId == UserId)
            .Join(
                Db.UserProjects.Where(ownerUp => ownerUp.Role == ProjectRole.Owner),
                up => up.ProjectId,
                ownerUp => ownerUp.ProjectId,
                (up, ownerUp) => new
                {
                    up.Project.Id,
                    up.Project.Name,
                    up.Project.Code,
                    up.Project.Description,
                    Visibility = up.Project.Visibility.ToString(),
                    up.Project.CreatedAt,
                    up.Project.UpdatedAt,
                    Role = up.Role.ToString(),
                    OwnerUsername = ownerUp.User.Username ?? string.Empty
                })
            .ToListAsync();

        return JsonSerializer.Serialize(projects);
    }

    [McpServerTool, Description("Get a specific project by its ID.")]
    public async Task<string> GetProject(
        [Description("The project ID (GUID).")] Guid projectId)
    {
        var project = await Db.UserProjects
            .Where(up => up.UserId == UserId && up.ProjectId == projectId)
            .Join(
                Db.UserProjects.Where(ownerUp => ownerUp.Role == ProjectRole.Owner),
                up => up.ProjectId,
                ownerUp => ownerUp.ProjectId,
                (up, ownerUp) => new
                {
                    up.Project.Id,
                    up.Project.Name,
                    up.Project.Code,
                    up.Project.Description,
                    Visibility = up.Project.Visibility.ToString(),
                    up.Project.CreatedAt,
                    up.Project.UpdatedAt,
                    Role = up.Role.ToString(),
                    OwnerUsername = ownerUp.User.Username ?? string.Empty
                })
            .FirstOrDefaultAsync();

        return project == null
            ? McpErrors.ProjectNotFound
            : JsonSerializer.Serialize(project);
    }

    [McpServerTool, Description("Create a new project. The code must be unique per user and contain only lowercase letters, numbers, and dashes.")]
    public async Task<string> CreateProject(
        [Description("Human-readable project name (max 100 chars).")] string name,
        [Description("URL-safe project code (lowercase letters, numbers, dashes; max 50 chars).")] string code,
        [Description("Optional project description.")] string? description = null,
        [Description("Visibility: Private, Public, or Teaser. Defaults to Private.")] string visibility = "Private")
    {
        if (!Enum.TryParse<ProjectVisibility>(visibility, out var vis))
            vis = ProjectVisibility.Private;

        var user = await Db.Users.FindAsync(UserId);
        var ownerUsername = user?.Username ?? string.Empty;

        var project = new Project
        {
            Id = Guid.NewGuid(),
            Name = name,
            Code = code,
            Description = description,
            Visibility = vis,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await Db.Projects.AddAsync(project);
        await Db.UserProjects.AddAsync(new UserProject
        {
            UserId = UserId,
            ProjectId = project.Id,
            Role = ProjectRole.Owner,
            JoinedAt = DateTime.UtcNow
        });

        await Db.SaveChangesAsync();

        return JsonSerializer.Serialize(new
        {
            project.Id,
            project.Name,
            project.Code,
            project.Description,
            Visibility = project.Visibility.ToString(),
            project.CreatedAt,
            project.UpdatedAt,
            Role = "Owner",
            OwnerUsername = ownerUsername
        });
    }

    [McpServerTool, Description("Update a project's name, description, or visibility.")]
    public async Task<string> UpdateProject(
        [Description("The project ID to update.")] Guid projectId,
        [Description("New project name.")] string name,
        [Description("New description (or null to clear).")] string? description = null,
        [Description("New visibility: Private, Public, or Teaser.")] string visibility = "Private")
    {
        var userProject = await Db.UserProjects
            .Include(up => up.Project)
            .FirstOrDefaultAsync(up => up.UserId == UserId && up.ProjectId == projectId
                && up.Role == ProjectRole.Owner);

        if (userProject == null)
            return McpErrors.ProjectNotFoundOrNotOwner;

        if (!Enum.TryParse<ProjectVisibility>(visibility, out var vis))
            vis = ProjectVisibility.Private;

        userProject.Project.Name = name;
        userProject.Project.Description = description;
        userProject.Project.Visibility = vis;
        userProject.Project.UpdatedAt = DateTime.UtcNow;

        await Db.SaveChangesAsync();
        return JsonSerializer.Serialize(new { userProject.Project.Id, userProject.Project.Name, Status = "updated" });
    }

    [McpServerTool, Description("Delete a project. You must be the project owner.")]
    public async Task<string> DeleteProject(
        [Description("The project ID to delete.")] Guid projectId)
    {
        var userProject = await Db.UserProjects
            .Include(up => up.Project)
            .FirstOrDefaultAsync(up => up.UserId == UserId && up.ProjectId == projectId
                && up.Role == ProjectRole.Owner);

        if (userProject == null)
            return McpErrors.ProjectNotFoundOrNotOwner;

        Db.Projects.Remove(userProject.Project);
        await Db.SaveChangesAsync();
        return McpErrors.Deleted;
    }

    [McpServerTool, Description("List all members of a project.")]
    public async Task<string> ListProjectMembers(
        [Description("The project ID.")] Guid projectId)
    {
        var hasAccess = await Db.UserProjects
            .AnyAsync(up => up.UserId == UserId && up.ProjectId == projectId);

        if (!hasAccess)
            return McpErrors.ProjectNotFound;

        var members = await Db.UserProjects
            .Where(up => up.ProjectId == projectId)
            .Select(up => new
            {
                up.UserId,
                up.User.Email,
                up.User.Username,
                up.User.Name,
                Role = up.Role.ToString(),
                up.JoinedAt
            })
            .ToListAsync();

        return JsonSerializer.Serialize(members);
    }
}
