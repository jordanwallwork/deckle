using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deckle.API.Services;

/// <summary>
/// Provides centralized authorization logic for project-related permissions.
/// </summary>
public class ProjectAuthorizationService
{
    private readonly AppDbContext _context;

    public ProjectAuthorizationService(AppDbContext context)
    {
        _context = context;
    }

    #region Project Access Checks

    /// <summary>
    /// Checks if a user has any access to a project.
    /// </summary>
    public async Task<bool> HasProjectAccessAsync(Guid userId, Guid projectId)
    {
        return await _context.UserProjects
            .AnyAsync(up => up.UserId == userId && up.ProjectId == projectId);
    }

    private async Task<User?> GetUserAsync(Guid userId) => await _context.Users.FindAsync(userId);

    /// <summary>
    /// Gets the user's role in a project, or null if the user doesn't have access.
    /// </summary>
    public async Task<ProjectRole?> GetUserProjectRoleAsync(Guid userId, Guid? projectId)
    {
        if (projectId is null)
        {
            var user = await GetUserAsync(userId);
            return user?.Role == UserRole.Administrator ? ProjectRole.Owner : null;
        }

        return await _context.UserProjects
            .Where(up => up.UserId == userId && up.ProjectId == projectId)
            .Select(up => up.Role)
            .FirstOrDefaultAsync();
    }

    /// <summary>
    /// Gets the UserProject relationship, or null if it doesn't exist.
    /// </summary>
    public async Task<UserProject?> GetUserProjectAsync(Guid userId, Guid projectId)
    {
        return await _context.UserProjects
            .Include(up => up.Project)
            .Include(up => up.User)
            .FirstOrDefaultAsync(up => up.UserId == userId && up.ProjectId == projectId);
    }

    /// <summary>
    /// Throws UnauthorizedAccessException if the user doesn't have access to the project.
    /// Returns the user's role if they have access.
    /// </summary>
    public async Task<ProjectRole> RequireProjectAccessAsync(Guid userId, Guid? projectId, string? customMessage = null)
    {
        var role = (await GetUserProjectRoleAsync(userId, projectId))
            ?? throw new UnauthorizedAccessException(customMessage ?? "User does not have access to this project");
        
        return role;
    }

    /// <summary>
    /// Throws UnauthorizedAccessException if the user doesn't have the required permission level.
    /// Returns the user's role if they have sufficient permissions.
    /// </summary>
    public async Task<ProjectRole> RequirePermissionAsync(
        Guid userId,
        Guid? projectId,
        Func<ProjectRole, bool> permissionCheck,
        string errorMessage)
    {


        var role = await RequireProjectAccessAsync(userId, projectId);

        if (!permissionCheck(role))
        {
            throw new UnauthorizedAccessException(errorMessage);
        }

        return role;
    }

    #endregion

    #region Permission Predicates

    /// <summary>
    /// Checks if the role has permission to modify project settings (Owner only).
    /// </summary>
    public static bool CanModifyProject(ProjectRole role)
    {
        return role == ProjectRole.Owner;
    }

    /// <summary>
    /// Checks if the role has permission to create or update resources (Owner and Collaborator).
    /// </summary>
    public static bool CanModifyResources(ProjectRole role)
    {
        return true; // Both Owner and Collaborator can modify resources
    }

    /// <summary>
    /// Checks if the role has permission to delete resources (Owner only).
    /// </summary>
    public static bool CanDeleteResources(ProjectRole role)
    {
        return role == ProjectRole.Owner;
    }

    /// <summary>
    /// Checks if the role has permission to manage data sources (Owner only).
    /// </summary>
    public static bool CanManageDataSources(ProjectRole role)
    {
        return role == ProjectRole.Owner;
    }

    /// <summary>
    /// Checks if the role has permission to invite and manage users (Owner only).
    /// </summary>
    public static bool CanManageUsers(ProjectRole role)
    {
        return role == ProjectRole.Owner;
    }

    /// <summary>
    /// Checks if the role has permission to delete the project (Owner only).
    /// </summary>
    public static bool CanDeleteProject(ProjectRole role)
    {
        return role == ProjectRole.Owner;
    }

    #endregion

    #region Combined Authorization Methods

    /// <summary>
    /// Ensures the user can modify resources (create/update) in the project.
    /// </summary>
    public async Task EnsureCanModifyResourcesAsync(Guid userId, Guid? projectId)
    {
        await RequirePermissionAsync(
            userId,
            projectId,
            CanModifyResources,
            "User does not have permission to create or modify resources");
    }

    /// <summary>
    /// Ensures the user can delete resources in the project.
    /// </summary>
    public async Task EnsureCanDeleteResourcesAsync(Guid userId, Guid projectId)
    {
        await RequirePermissionAsync(
            userId,
            projectId,
            CanDeleteResources,
            "Only the Owner can delete resources");
    }

    /// <summary>
    /// Ensures the user can manage data sources in the project.
    /// </summary>
    public async Task EnsureCanManageDataSourcesAsync(Guid userId, Guid projectId)
    {
        await RequirePermissionAsync(
            userId,
            projectId,
            CanManageDataSources,
            "Only the Owner can manage data sources");
    }

    /// <summary>
    /// Ensures the user can modify project settings.
    /// </summary>
    public async Task EnsureCanModifyProjectAsync(Guid userId, Guid projectId)
    {
        await RequirePermissionAsync(
            userId,
            projectId,
            CanModifyProject,
            "Only the Owner can modify project settings");
    }

    /// <summary>
    /// Ensures the user can manage users (invite, change roles).
    /// </summary>
    public async Task EnsureCanManageUsersAsync(Guid userId, Guid projectId)
    {
        await RequirePermissionAsync(
            userId,
            projectId,
            CanManageUsers,
            "Only the Owner can manage users");
    }

    /// <summary>
    /// Ensures the user can delete the project.
    /// </summary>
    public async Task EnsureCanDeleteProjectAsync(Guid userId, Guid projectId)
    {
        await RequirePermissionAsync(
            userId,
            projectId,
            CanDeleteProject,
            "Only the Owner can delete the project");
    }

    #endregion
}
