using Deckle.API.DTOs;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deckle.API.Services;

public class ProjectService
{
    private readonly AppDbContext _dbContext;
    private readonly ProjectAuthorizationService _authService;

    public ProjectService(AppDbContext dbContext, ProjectAuthorizationService authService)
    {
        _dbContext = dbContext;
        _authService = authService;
    }

    public async Task<List<ProjectDto>> GetUserProjectsAsync(Guid userId)
    {
        var projects = await _dbContext.UserProjects
            .Where(up => up.UserId == userId)
            .Include(up => up.Project)
            .Select(up => new ProjectDto
            {
                Id = up.Project.Id,
                Name = up.Project.Name,
                Description = up.Project.Description,
                CreatedAt = up.Project.CreatedAt,
                UpdatedAt = up.Project.UpdatedAt,
                Role = up.Role.ToString()
            })
            .ToListAsync();

        return projects;
    }

    public async Task<ProjectDto?> GetProjectByIdAsync(Guid userId, Guid projectId)
    {
        var project = await _dbContext.UserProjects
            .Where(up => up.UserId == userId && up.ProjectId == projectId)
            .Include(up => up.Project)
            .Select(up => new ProjectDto
            {
                Id = up.Project.Id,
                Name = up.Project.Name,
                Description = up.Project.Description,
                CreatedAt = up.Project.CreatedAt,
                UpdatedAt = up.Project.UpdatedAt,
                Role = up.Role.ToString()
            })
            .FirstOrDefaultAsync();

        return project;
    }

    public async Task<ProjectDto> CreateProjectAsync(Guid userId, string name, string? description)
    {
        var project = new Project
        {
            Id = Guid.NewGuid(),
            Name = name,
            Description = description,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.Projects.Add(project);

        var userProject = new UserProject
        {
            UserId = userId,
            ProjectId = project.Id,
            Role = ProjectRole.Owner,
            JoinedAt = DateTime.UtcNow
        };

        _dbContext.UserProjects.Add(userProject);

        await _dbContext.SaveChangesAsync();

        return new ProjectDto
        {
            Id = project.Id,
            Name = project.Name,
            Description = project.Description,
            CreatedAt = project.CreatedAt,
            UpdatedAt = project.UpdatedAt,
            Role = userProject.Role.ToString()
        };
    }

    public async Task<ProjectDto?> UpdateProjectAsync(Guid userId, Guid projectId, string name, string? description)
    {
        var userProject = await _authService.GetUserProjectAsync(userId, projectId);

        if (userProject == null)
        {
            return null;
        }

        // Only Owner can update project details
        if (!ProjectAuthorizationService.CanModifyProject(userProject.Role))
        {
            return null;
        }

        userProject.Project.Name = name;
        userProject.Project.Description = description;
        userProject.Project.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        return new ProjectDto
        {
            Id = userProject.Project.Id,
            Name = userProject.Project.Name,
            Description = userProject.Project.Description,
            CreatedAt = userProject.Project.CreatedAt,
            UpdatedAt = userProject.Project.UpdatedAt,
            Role = userProject.Role.ToString()
        };
    }

    public async Task<List<ProjectUserDto>> GetProjectUsersAsync(Guid userId, Guid projectId)
    {
        if (!await _authService.HasProjectAccessAsync(userId, projectId))
        {
            return [];
        }

        var users = await _dbContext.UserProjects
            .Where(up => up.ProjectId == projectId)
            .Include(up => up.User)
            .Select(up => new ProjectUserDto
            {
                UserId = up.UserId,
                Email = up.User.Email,
                Name = up.User.Name,
                PictureUrl = up.User.PictureUrl,
                Role = up.Role.ToString(),
                JoinedAt = up.JoinedAt,
                IsPending = up.User.GoogleId == null
            })
            .ToListAsync();

        // Order by role priority: Owner, Collaborator
        users = users
            .OrderBy(u => GetRolePriority(u.Role))
            .ThenBy(u => u.Email)
            .ToList();

        return users;
    }

    public async Task<(ProjectUserDto? user, string? inviterName)?> InviteUserToProjectAsync(
        Guid userId,
        Guid projectId,
        string email,
        string roleString)
    {
        // 1. Verify user has Owner role on this project
        var userProject = await _authService.GetUserProjectAsync(userId, projectId);

        if (userProject == null || !ProjectAuthorizationService.CanManageUsers(userProject.Role))
        {
            return null; // Unauthorized
        }

        // 2. Validate role (can't invite Owner)
        if (!Enum.TryParse<ProjectRole>(roleString, out var role))
        {
            throw new ArgumentException("Invalid role");
        }

        if (role == ProjectRole.Owner)
        {
            throw new ArgumentException("Cannot invite users as Owner");
        }

        // 3. Normalize email
        email = email.Trim().ToLowerInvariant();

        // 4. Check if user is already a member (check by email, not UserId)
        var existingMember = await _dbContext.UserProjects
            .Include(up => up.User)
            .FirstOrDefaultAsync(up =>
                up.ProjectId == projectId &&
                up.User.Email.ToLower() == email);

        if (existingMember != null)
        {
            throw new InvalidOperationException("User is already a member of this project");
        }

        // 5. Check if User record exists with this email
        var invitedUser = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == email);

        if (invitedUser == null)
        {
            // Create placeholder User record
            invitedUser = new User
            {
                Id = Guid.NewGuid(),
                GoogleId = null, // Placeholder - will be filled on first login
                Email = email,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _dbContext.Users.Add(invitedUser);
        }

        // 6. Create UserProject entry
        var newUserProject = new UserProject
        {
            UserId = invitedUser.Id,
            ProjectId = projectId,
            Role = role,
            JoinedAt = DateTime.UtcNow
        };

        _dbContext.UserProjects.Add(newUserProject);
        await _dbContext.SaveChangesAsync();

        // 7. Return invite details
        return (new ProjectUserDto
        {
            UserId = invitedUser.Id,
            Email = invitedUser.Email,
            Name = invitedUser.Name,
            PictureUrl = invitedUser.PictureUrl,
            Role = role.ToString(),
            JoinedAt = newUserProject.JoinedAt,
            IsPending = invitedUser.GoogleId == null
        }, userProject.User.Name ?? userProject.User.Email);
    }

    public async Task<bool> RemoveUserFromProjectAsync(
        Guid requestingUserId,
        Guid projectId,
        Guid targetUserId)
    {
        // 1. Get requesting user's role
        var requestingUserRole = await _authService.GetUserProjectRoleAsync(requestingUserId, projectId);

        if (requestingUserRole == null)
        {
            return false; // Requesting user not in project
        }

        // 2. Get target user's project membership
        var targetUserProject = await _dbContext.UserProjects
            .Where(up => up.UserId == targetUserId && up.ProjectId == projectId)
            .Include(up => up.User)
            .FirstOrDefaultAsync();

        if (targetUserProject == null)
        {
            return false; // Target user not found in project
        }

        bool isSelfRemoval = requestingUserId == targetUserId;

        // 3. Authorization checks
        if (isSelfRemoval)
        {
            // Self-removal rules:
            // - Collaborator can remove themselves
            // - Owner CANNOT remove themselves if they are the last owner

            if (targetUserProject.Role == ProjectRole.Owner)
            {
                // Check if this is the last owner
                var ownerCount = await _dbContext.UserProjects
                    .Where(up => up.ProjectId == projectId && up.Role == ProjectRole.Owner)
                    .CountAsync();

                if (ownerCount <= 1)
                {
                    throw new InvalidOperationException(
                        "Cannot remove the last Owner from the project. " +
                        "Please transfer ownership or delete the project.");
                }

                // Allow owner to remove themselves if there are other owners
            }
            // All other roles can remove themselves freely
        }
        else
        {
            // Removing another user - need Owner permission
            if (!ProjectAuthorizationService.CanManageUsers(requestingUserRole.Value))
            {
                return false; // Not authorized to remove others
            }

            // Cannot remove an Owner (must be done by transferring ownership first)
            if (targetUserProject.Role == ProjectRole.Owner)
            {
                throw new InvalidOperationException(
                    "Cannot remove the project Owner. " +
                    "Ownership must be transferred first.");
            }
        }

        // 4. Remove the user from the project
        _dbContext.UserProjects.Remove(targetUserProject);
        await _dbContext.SaveChangesAsync();

        return true;
    }

    public async Task<bool> DeleteProjectAsync(Guid userId, Guid projectId)
    {
        var userProject = await _authService.GetUserProjectAsync(userId, projectId);

        if (userProject == null)
        {
            return false;
        }

        // Only Owner can delete the project
        if (!ProjectAuthorizationService.CanDeleteProject(userProject.Role))
        {
            return false;
        }

        _dbContext.Projects.Remove(userProject.Project);
        await _dbContext.SaveChangesAsync();

        return true;
    }

    private static int GetRolePriority(string role)
    {
        return role switch
        {
            "Owner" => 0,
            "Collaborator" => 1,
            _ => 999 // Unknown roles go last
        };
    }
}
