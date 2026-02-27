using Deckle.API.Services;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deckle.API.Tests.Services;

public class ProjectAuthorizationServiceTests : IDisposable
{
    private bool _disposed;
    private readonly AppDbContext _context;
    private readonly ProjectAuthorizationService _service;

    public ProjectAuthorizationServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);
        _service = new ProjectAuthorizationService(_context);
    }

    #region HasProjectAccessAsync Tests

    [Fact]
    public async Task HasProjectAccessAsync_UserWithAccess_ReturnsTrue()
    {
        // Arrange
        var (userId, projectId) = await SeedUserWithProjectRole(ProjectRole.Collaborator);

        // Act
        var result = await _service.HasProjectAccessAsync(userId, projectId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task HasProjectAccessAsync_OwnerHasAccess_ReturnsTrue()
    {
        // Arrange
        var (userId, projectId) = await SeedUserWithProjectRole(ProjectRole.Owner);

        // Act
        var result = await _service.HasProjectAccessAsync(userId, projectId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task HasProjectAccessAsync_UserWithoutAccess_ReturnsFalse()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();

        // Act
        var result = await _service.HasProjectAccessAsync(userId, projectId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task HasProjectAccessAsync_UserExistsButNotInProject_ReturnsFalse()
    {
        // Arrange
        var userId = await SeedUser();
        var projectId = Guid.NewGuid(); // No project seeded

        // Act
        var result = await _service.HasProjectAccessAsync(userId, projectId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task HasProjectAccessAsync_ProjectExistsButUserNotMember_ReturnsFalse()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var (_, projectId) = await SeedUserWithProjectRole(ProjectRole.Owner);

        // Act - different user with no access
        var result = await _service.HasProjectAccessAsync(userId, projectId);

        // Assert
        Assert.False(result);
    }

    #endregion

    #region GetUserProjectRoleAsync Tests

    [Fact]
    public async Task GetUserProjectRoleAsync_NullProjectId_AdministratorUser_ReturnsOwner()
    {
        // Arrange
        var userId = await SeedUser(UserRole.Administrator);

        // Act
        var result = await _service.GetUserProjectRoleAsync(userId, null);

        // Assert
        Assert.Equal(ProjectRole.Owner, result);
    }

    [Fact]
    public async Task GetUserProjectRoleAsync_NullProjectId_RegularUser_ReturnsNull()
    {
        // Arrange
        var userId = await SeedUser(UserRole.User);

        // Act
        var result = await _service.GetUserProjectRoleAsync(userId, null);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetUserProjectRoleAsync_NullProjectId_NonExistentUser_ReturnsNull()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var result = await _service.GetUserProjectRoleAsync(userId, null);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetUserProjectRoleAsync_WithProjectId_OwnerUser_ReturnsOwner()
    {
        // Arrange
        var (userId, projectId) = await SeedUserWithProjectRole(ProjectRole.Owner);

        // Act
        var result = await _service.GetUserProjectRoleAsync(userId, projectId);

        // Assert
        Assert.Equal(ProjectRole.Owner, result);
    }

    [Fact]
    public async Task GetUserProjectRoleAsync_WithProjectId_CollaboratorUser_ReturnsCollaborator()
    {
        // Arrange
        var (userId, projectId) = await SeedUserWithProjectRole(ProjectRole.Collaborator);

        // Act
        var result = await _service.GetUserProjectRoleAsync(userId, projectId);

        // Assert
        Assert.Equal(ProjectRole.Collaborator, result);
    }

    [Fact]
    public async Task GetUserProjectRoleAsync_WithProjectId_UserNotInProject_ReturnsNull()
    {
        // Arrange
        var userId = await SeedUser();
        var projectId = Guid.NewGuid();

        // Act
        var result = await _service.GetUserProjectRoleAsync(userId, projectId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetUserProjectRoleAsync_WithProjectId_NonExistentUserAndProject_ReturnsNull()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();

        // Act
        var result = await _service.GetUserProjectRoleAsync(userId, projectId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetUserProjectRoleAsync_UserExistsInDifferentProjectOnly_ReturnsNull()
    {
        // Arrange - user has access to project A but we query project B
        var (userId, _) = await SeedUserWithProjectRole(ProjectRole.Owner);
        var differentProjectId = Guid.NewGuid();

        // Act
        var result = await _service.GetUserProjectRoleAsync(userId, differentProjectId);

        // Assert: kills the && → || mutation at line 44
        // With || mutation, up.UserId == userId would match the existing UserProject for project A,
        // incorrectly returning Owner instead of null
        Assert.Null(result);
    }

    #endregion

    #region GetUserProjectAsync Tests

    [Fact]
    public async Task GetUserProjectAsync_ExistingRelationship_ReturnsUserProjectWithNavigationProperties()
    {
        // Arrange
        var (userId, projectId) = await SeedUserWithProjectRole(ProjectRole.Owner);

        // Act
        var result = await _service.GetUserProjectAsync(userId, projectId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(userId, result.UserId);
        Assert.Equal(projectId, result.ProjectId);
        Assert.Equal(ProjectRole.Owner, result.Role);
        Assert.NotNull(result.Project);
        Assert.NotNull(result.User);
    }

    [Fact]
    public async Task GetUserProjectAsync_CollaboratorRelationship_ReturnsCorrectRole()
    {
        // Arrange
        var (userId, projectId) = await SeedUserWithProjectRole(ProjectRole.Collaborator);

        // Act
        var result = await _service.GetUserProjectAsync(userId, projectId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(ProjectRole.Collaborator, result.Role);
    }

    [Fact]
    public async Task GetUserProjectAsync_NoRelationship_ReturnsNull()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();

        // Act
        var result = await _service.GetUserProjectAsync(userId, projectId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetUserProjectAsync_WrongUser_ReturnsNull()
    {
        // Arrange
        var (_, projectId) = await SeedUserWithProjectRole(ProjectRole.Owner);
        var differentUserId = Guid.NewGuid();

        // Act
        var result = await _service.GetUserProjectAsync(differentUserId, projectId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetUserProjectAsync_WrongProject_ReturnsNull()
    {
        // Arrange
        var (userId, _) = await SeedUserWithProjectRole(ProjectRole.Owner);
        var differentProjectId = Guid.NewGuid();

        // Act
        var result = await _service.GetUserProjectAsync(userId, differentProjectId);

        // Assert
        Assert.Null(result);
    }

    #endregion

    #region RequireProjectAccessAsync Tests

    [Fact]
    public async Task RequireProjectAccessAsync_UserWithOwnerRole_ReturnsOwnerRole()
    {
        // Arrange
        var (userId, projectId) = await SeedUserWithProjectRole(ProjectRole.Owner);

        // Act
        var result = await _service.RequireProjectAccessAsync(userId, projectId);

        // Assert
        Assert.Equal(ProjectRole.Owner, result);
    }

    [Fact]
    public async Task RequireProjectAccessAsync_UserWithCollaboratorRole_ReturnsCollaboratorRole()
    {
        // Arrange
        var (userId, projectId) = await SeedUserWithProjectRole(ProjectRole.Collaborator);

        // Act
        var result = await _service.RequireProjectAccessAsync(userId, projectId);

        // Assert
        Assert.Equal(ProjectRole.Collaborator, result);
    }

    [Fact]
    public async Task RequireProjectAccessAsync_UserWithoutAccess_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.RequireProjectAccessAsync(userId, projectId));
    }

    [Fact]
    public async Task RequireProjectAccessAsync_UserWithoutAccess_ThrowsWithDefaultMessage()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();

        // Act & Assert
        var exception = await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.RequireProjectAccessAsync(userId, projectId));

        Assert.Equal("User does not have access to this project", exception.Message);
    }

    [Fact]
    public async Task RequireProjectAccessAsync_UserWithoutAccess_ThrowsWithCustomMessage()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        const string customMessage = "Custom access denied message";

        // Act & Assert
        var exception = await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.RequireProjectAccessAsync(userId, projectId, customMessage));

        Assert.Equal(customMessage, exception.Message);
    }

    [Fact]
    public async Task RequireProjectAccessAsync_AdministratorWithNullProject_ReturnsOwnerRole()
    {
        // Arrange
        var userId = await SeedUser(UserRole.Administrator);

        // Act
        var result = await _service.RequireProjectAccessAsync(userId, null);

        // Assert
        Assert.Equal(ProjectRole.Owner, result);
    }

    [Fact]
    public async Task RequireProjectAccessAsync_RegularUserWithNullProject_Throws()
    {
        // Arrange
        var userId = await SeedUser(UserRole.User);

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.RequireProjectAccessAsync(userId, null));
    }

    #endregion

    #region RequirePermissionAsync Tests

    [Fact]
    public async Task RequirePermissionAsync_PermissionCheckPasses_ReturnsRole()
    {
        // Arrange
        var (userId, projectId) = await SeedUserWithProjectRole(ProjectRole.Owner);

        // Act
        var result = await _service.RequirePermissionAsync(
            userId, projectId, _ => true, "Should not be thrown");

        // Assert
        Assert.Equal(ProjectRole.Owner, result);
    }

    [Fact]
    public async Task RequirePermissionAsync_PermissionCheckFails_ThrowsWithSpecifiedMessage()
    {
        // Arrange
        var (userId, projectId) = await SeedUserWithProjectRole(ProjectRole.Collaborator);
        const string errorMessage = "Insufficient permissions";

        // Act & Assert
        var exception = await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.RequirePermissionAsync(
                userId, projectId, _ => false, errorMessage));

        Assert.Equal(errorMessage, exception.Message);
    }

    [Fact]
    public async Task RequirePermissionAsync_UserHasNoProjectAccess_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.RequirePermissionAsync(
                userId, projectId, _ => true, "Permission error"));
    }

    [Fact]
    public async Task RequirePermissionAsync_CheckReceivesCorrectRole()
    {
        // Arrange
        var (userId, projectId) = await SeedUserWithProjectRole(ProjectRole.Collaborator);
        ProjectRole? receivedRole = null;

        // Act
        await _service.RequirePermissionAsync(userId, projectId, role =>
        {
            receivedRole = role;
            return true;
        }, "Should not throw");

        // Assert
        Assert.Equal(ProjectRole.Collaborator, receivedRole);
    }

    #endregion

    #region Permission Predicate Tests

    [Theory]
    [InlineData(ProjectRole.Owner, true)]
    [InlineData(ProjectRole.Collaborator, false)]
    public void CanModifyProject_ReturnsExpectedResult(ProjectRole role, bool expected)
    {
        Assert.Equal(expected, ProjectAuthorizationService.CanModifyProject(role));
    }

    [Theory]
    [InlineData(ProjectRole.Owner)]
    [InlineData(ProjectRole.Collaborator)]
    public void CanModifyResources_AlwaysReturnsTrue(ProjectRole role)
    {
        Assert.True(ProjectAuthorizationService.CanModifyResources(role));
    }

    [Theory]
    [InlineData(ProjectRole.Owner, true)]
    [InlineData(ProjectRole.Collaborator, false)]
    public void CanDeleteResources_ReturnsExpectedResult(ProjectRole role, bool expected)
    {
        Assert.Equal(expected, ProjectAuthorizationService.CanDeleteResources(role));
    }

    [Theory]
    [InlineData(ProjectRole.Owner, true)]
    [InlineData(ProjectRole.Collaborator, false)]
    public void CanManageDataSources_ReturnsExpectedResult(ProjectRole role, bool expected)
    {
        Assert.Equal(expected, ProjectAuthorizationService.CanManageDataSources(role));
    }

    [Theory]
    [InlineData(ProjectRole.Owner, true)]
    [InlineData(ProjectRole.Collaborator, false)]
    public void CanManageUsers_ReturnsExpectedResult(ProjectRole role, bool expected)
    {
        Assert.Equal(expected, ProjectAuthorizationService.CanManageUsers(role));
    }

    [Theory]
    [InlineData(ProjectRole.Owner, true)]
    [InlineData(ProjectRole.Collaborator, false)]
    public void CanDeleteProject_ReturnsExpectedResult(ProjectRole role, bool expected)
    {
        Assert.Equal(expected, ProjectAuthorizationService.CanDeleteProject(role));
    }

    #endregion

    #region EnsureCanModifyResourcesAsync Tests

    [Fact]
    public async Task EnsureCanModifyResourcesAsync_Owner_DoesNotThrow()
    {
        // Arrange
        var (userId, projectId) = await SeedUserWithProjectRole(ProjectRole.Owner);

        // Act
        var exception = await Record.ExceptionAsync(() => _service.EnsureCanModifyResourcesAsync(userId, projectId));

        // Assert
        Assert.Null(exception);
    }

    [Fact]
    public async Task EnsureCanModifyResourcesAsync_Collaborator_DoesNotThrow()
    {
        // Arrange
        var (userId, projectId) = await SeedUserWithProjectRole(ProjectRole.Collaborator);

        // Act (no exception expected - all members can modify resources)
        var exception = await Record.ExceptionAsync(() => _service.EnsureCanModifyResourcesAsync(userId, projectId));

        // Assert
        Assert.Null(exception);
    }

    [Fact]
    public async Task EnsureCanModifyResourcesAsync_NoAccess_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.EnsureCanModifyResourcesAsync(userId, projectId));
    }

    #endregion

    #region EnsureCanDeleteResourcesAsync Tests

    [Fact]
    public async Task EnsureCanDeleteResourcesAsync_Owner_DoesNotThrow()
    {
        // Arrange
        var (userId, projectId) = await SeedUserWithProjectRole(ProjectRole.Owner);

        // Act
        var exception = await Record.ExceptionAsync(() => _service.EnsureCanDeleteResourcesAsync(userId, projectId));

        // Assert
        Assert.Null(exception);
    }

    [Fact]
    public async Task EnsureCanDeleteResourcesAsync_Collaborator_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var (userId, projectId) = await SeedUserWithProjectRole(ProjectRole.Collaborator);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.EnsureCanDeleteResourcesAsync(userId, projectId));

        Assert.Equal("Only the Owner can delete resources", exception.Message);
    }

    [Fact]
    public async Task EnsureCanDeleteResourcesAsync_NoAccess_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.EnsureCanDeleteResourcesAsync(userId, projectId));
    }

    #endregion

    #region EnsureCanManageDataSourcesAsync Tests

    [Fact]
    public async Task EnsureCanManageDataSourcesAsync_Owner_DoesNotThrow()
    {
        // Arrange
        var (userId, projectId) = await SeedUserWithProjectRole(ProjectRole.Owner);

        // Act
        var exception = await Record.ExceptionAsync(() => _service.EnsureCanManageDataSourcesAsync(userId, projectId));

        // Assert
        Assert.Null(exception);
    }

    [Fact]
    public async Task EnsureCanManageDataSourcesAsync_Collaborator_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var (userId, projectId) = await SeedUserWithProjectRole(ProjectRole.Collaborator);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.EnsureCanManageDataSourcesAsync(userId, projectId));

        Assert.Equal("Only the Owner can manage data sources", exception.Message);
    }

    [Fact]
    public async Task EnsureCanManageDataSourcesAsync_NoAccess_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.EnsureCanManageDataSourcesAsync(userId, projectId));
    }

    #endregion

    #region EnsureCanModifyProjectAsync Tests

    [Fact]
    public async Task EnsureCanModifyProjectAsync_Owner_DoesNotThrow()
    {
        // Arrange
        var (userId, projectId) = await SeedUserWithProjectRole(ProjectRole.Owner);

        // Act
        var exception = await Record.ExceptionAsync(() => _service.EnsureCanModifyProjectAsync(userId, projectId));

        // Assert
        Assert.Null(exception);
    }

    [Fact]
    public async Task EnsureCanModifyProjectAsync_Collaborator_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var (userId, projectId) = await SeedUserWithProjectRole(ProjectRole.Collaborator);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.EnsureCanModifyProjectAsync(userId, projectId));

        Assert.Equal("Only the Owner can modify project settings", exception.Message);
    }

    [Fact]
    public async Task EnsureCanModifyProjectAsync_NoAccess_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.EnsureCanModifyProjectAsync(userId, projectId));
    }

    #endregion

    #region EnsureCanManageUsersAsync Tests

    [Fact]
    public async Task EnsureCanManageUsersAsync_Owner_DoesNotThrow()
    {
        // Arrange
        var (userId, projectId) = await SeedUserWithProjectRole(ProjectRole.Owner);

        // Act
        var exception = await Record.ExceptionAsync(() => _service.EnsureCanManageUsersAsync(userId, projectId));

        // Assert
        Assert.Null(exception);
    }

    [Fact]
    public async Task EnsureCanManageUsersAsync_Collaborator_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var (userId, projectId) = await SeedUserWithProjectRole(ProjectRole.Collaborator);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.EnsureCanManageUsersAsync(userId, projectId));

        Assert.Equal("Only the Owner can manage users", exception.Message);
    }

    [Fact]
    public async Task EnsureCanManageUsersAsync_NoAccess_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.EnsureCanManageUsersAsync(userId, projectId));
    }

    #endregion

    #region EnsureCanDeleteProjectAsync Tests

    [Fact]
    public async Task EnsureCanDeleteProjectAsync_Owner_DoesNotThrow()
    {
        // Arrange
        var (userId, projectId) = await SeedUserWithProjectRole(ProjectRole.Owner);

        // Act
        var exception = await Record.ExceptionAsync(() => _service.EnsureCanDeleteProjectAsync(userId, projectId));

        // Assert
        Assert.Null(exception);
    }

    [Fact]
    public async Task EnsureCanDeleteProjectAsync_Collaborator_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var (userId, projectId) = await SeedUserWithProjectRole(ProjectRole.Collaborator);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.EnsureCanDeleteProjectAsync(userId, projectId));

        Assert.Equal("Only the Owner can delete the project", exception.Message);
    }

    [Fact]
    public async Task EnsureCanDeleteProjectAsync_NoAccess_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.EnsureCanDeleteProjectAsync(userId, projectId));
    }

    #endregion

    #region Helper Methods

    private async Task<Guid> SeedUser(UserRole role = UserRole.User)
    {
        var userId = Guid.NewGuid();
        _context.Users.Add(new User
        {
            Id = userId,
            Email = $"{userId}@example.com",
            Name = "Test User",
            Role = role
        });
        await _context.SaveChangesAsync();
        return userId;
    }

    private async Task<(Guid UserId, Guid ProjectId)> SeedUserWithProjectRole(ProjectRole role)
    {
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();

        _context.Users.Add(new User
        {
            Id = userId,
            Email = $"{userId}@example.com",
            Name = "Test User"
        });

        _context.Projects.Add(new Project
        {
            Id = projectId,
            Name = "Test Project"
        });

        _context.UserProjects.Add(new UserProject
        {
            UserId = userId,
            ProjectId = projectId,
            Role = role
        });

        await _context.SaveChangesAsync();
        return (userId, projectId);
    }

    #endregion

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (!_disposed)
        {
            if (disposing)
            {
                _context.Dispose();
            }
            _disposed = true;
        }
    }
}
