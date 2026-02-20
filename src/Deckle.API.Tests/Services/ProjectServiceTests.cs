using Deckle.API.Exceptions;
using Deckle.API.Services;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace Deckle.API.Tests.Services;

public class ProjectServiceTests : IDisposable
{
    private bool _disposed;
    private readonly AppDbContext _context;
    private readonly Mock<IProjectAuthorizationService> _mockAuthService;
    private readonly ProjectService _service;

    public ProjectServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);
        _mockAuthService = new Mock<IProjectAuthorizationService>();

        // Default: all authorization passes with Owner role
        _mockAuthService
            .Setup(a => a.HasProjectAccessAsync(It.IsAny<Guid>(), It.IsAny<Guid>()))
            .ReturnsAsync(true);
        _mockAuthService
            .Setup(a => a.GetUserProjectRoleAsync(It.IsAny<Guid>(), It.IsAny<Guid?>()))
            .ReturnsAsync(ProjectRole.Owner);

        _service = new ProjectService(_context, _mockAuthService.Object);
    }

    #region Helpers

    private async Task<(Guid userId, Guid projectId)> SeedOwnerWithProject(
        string email = "owner@test.com",
        string username = "owner",
        string projectName = "Test Project",
        string projectCode = "test-project")
    {
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();

        _context.Users.Add(new User
        {
            Id = userId,
            Email = email,
            Username = username,
            GoogleId = Guid.NewGuid().ToString(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        _context.Projects.Add(new Project
        {
            Id = projectId,
            Name = projectName,
            Code = projectCode,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        _context.UserProjects.Add(new UserProject
        {
            UserId = userId,
            ProjectId = projectId,
            Role = ProjectRole.Owner,
            JoinedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();
        return (userId, projectId);
    }

    private async Task<(Guid collaboratorId, Guid projectId)> SeedCollaboratorOnProject(Guid projectId, string email = "collab@test.com")
    {
        var collaboratorId = Guid.NewGuid();
        _context.Users.Add(new User
        {
            Id = collaboratorId,
            Email = email,
            GoogleId = Guid.NewGuid().ToString(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        _context.UserProjects.Add(new UserProject
        {
            UserId = collaboratorId,
            ProjectId = projectId,
            Role = ProjectRole.Collaborator,
            JoinedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();
        return (collaboratorId, projectId);
    }

    private async Task<UserProject?> GetTrackedUserProject(Guid userId, Guid projectId) =>
        await _context.UserProjects
            .Include(up => up.Project)
            .Include(up => up.User)
            .FirstOrDefaultAsync(up => up.UserId == userId && up.ProjectId == projectId);

    #endregion

    #region GetUserProjectsAsync Tests

    [Fact]
    public async Task GetUserProjectsAsync_UserWithProjects_ReturnsProjectList()
    {
        var (userId, _) = await SeedOwnerWithProject();

        var result = await _service.GetUserProjectsAsync(userId);

        Assert.Single(result);
        Assert.Equal("Test Project", result[0].Name);
        Assert.Equal("Owner", result[0].Role);
    }

    [Fact]
    public async Task GetUserProjectsAsync_UserWithNoProjects_ReturnsEmptyList()
    {
        var userId = Guid.NewGuid();

        var result = await _service.GetUserProjectsAsync(userId);

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetUserProjectsAsync_ReturnsOwnerUsername()
    {
        var (userId, _) = await SeedOwnerWithProject(username: "myusername");

        var result = await _service.GetUserProjectsAsync(userId);

        Assert.Equal("myusername", result[0].OwnerUsername);
    }

    [Fact]
    public async Task GetUserProjectsAsync_MultipleProjects_ReturnsAll()
    {
        var userId = Guid.NewGuid();
        _context.Users.Add(new User { Id = userId, Email = "u@test.com", GoogleId = "g1", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });

        for (int i = 0; i < 3; i++)
        {
            var projectId = Guid.NewGuid();
            _context.Projects.Add(new Project { Id = projectId, Name = $"Project {i}", Code = $"p{i}", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
            _context.UserProjects.Add(new UserProject { UserId = userId, ProjectId = projectId, Role = ProjectRole.Owner, JoinedAt = DateTime.UtcNow });
        }
        await _context.SaveChangesAsync();

        var result = await _service.GetUserProjectsAsync(userId);

        Assert.Equal(3, result.Count);
    }

    #endregion

    #region GetProjectByIdAsync Tests

    [Fact]
    public async Task GetProjectByIdAsync_UserHasAccess_ReturnsProject()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        var result = await _service.GetProjectByIdAsync(userId, projectId);

        Assert.NotNull(result);
        Assert.Equal(projectId, result.Id);
        Assert.Equal("Test Project", result.Name);
        Assert.Equal("Owner", result.Role);
    }

    [Fact]
    public async Task GetProjectByIdAsync_UserNotMember_ReturnsNull()
    {
        var (_, projectId) = await SeedOwnerWithProject();
        var outsiderId = Guid.NewGuid();

        var result = await _service.GetProjectByIdAsync(outsiderId, projectId);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetProjectByIdAsync_NonExistentProject_ReturnsNull()
    {
        var userId = Guid.NewGuid();

        var result = await _service.GetProjectByIdAsync(userId, Guid.NewGuid());

        Assert.Null(result);
    }

    #endregion

    #region GetProjectByUsernameAndCodeAsync Tests

    [Fact]
    public async Task GetProjectByUsernameAndCodeAsync_ValidAccess_ReturnsProject()
    {
        var (userId, _) = await SeedOwnerWithProject(username: "myuser", projectCode: "mycode");

        var result = await _service.GetProjectByUsernameAndCodeAsync(userId, "myuser", "mycode");

        Assert.NotNull(result);
        Assert.Equal("mycode", result.Code);
        Assert.Equal("myuser", result.OwnerUsername);
    }

    [Fact]
    public async Task GetProjectByUsernameAndCodeAsync_ProjectNotFound_ReturnsNull()
    {
        var userId = Guid.NewGuid();

        var result = await _service.GetProjectByUsernameAndCodeAsync(userId, "nonexistent", "nocode");

        Assert.Null(result);
    }

    [Fact]
    public async Task GetProjectByUsernameAndCodeAsync_UserNotMemberOfProject_ReturnsNull()
    {
        var (_, _) = await SeedOwnerWithProject(username: "owneruser", projectCode: "the-code");
        var outsiderId = Guid.NewGuid();

        var result = await _service.GetProjectByUsernameAndCodeAsync(outsiderId, "owneruser", "the-code");

        Assert.Null(result);
    }

    [Fact]
    public async Task GetProjectByUsernameAndCodeAsync_CollaboratorCanAccess()
    {
        var (_, projectId) = await SeedOwnerWithProject(username: "owneruser", projectCode: "the-code");
        var (collaboratorId, _) = await SeedCollaboratorOnProject(projectId);

        var result = await _service.GetProjectByUsernameAndCodeAsync(collaboratorId, "owneruser", "the-code");

        Assert.NotNull(result);
        Assert.Equal("Collaborator", result.Role);
    }

    #endregion

    #region CreateProjectAsync Tests

    [Fact]
    public async Task CreateProjectAsync_ValidInput_CreatesAndReturnsProject()
    {
        var userId = Guid.NewGuid();
        _context.Users.Add(new User { Id = userId, Email = "u@test.com", GoogleId = "g", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        await _context.SaveChangesAsync();

        var result = await _service.CreateProjectAsync(userId, "My Project", "my-project", "A description");

        Assert.NotNull(result);
        Assert.Equal("My Project", result.Name);
        Assert.Equal("my-project", result.Code);
        Assert.Equal("A description", result.Description);
        Assert.Equal("Owner", result.Role);
    }

    [Fact]
    public async Task CreateProjectAsync_ValidInput_PersistsToDatabase()
    {
        var userId = Guid.NewGuid();
        _context.Users.Add(new User { Id = userId, Email = "u@test.com", GoogleId = "g", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        await _context.SaveChangesAsync();

        var result = await _service.CreateProjectAsync(userId, "My Project", "my-project", null);

        _context.ChangeTracker.Clear();
        var project = await _context.Projects.FindAsync(result.Id);
        Assert.NotNull(project);
        Assert.Equal("My Project", project.Name);
        Assert.Equal("my-project", project.Code);
    }

    [Fact]
    public async Task CreateProjectAsync_ValidInput_CreatesOwnerUserProject()
    {
        var userId = Guid.NewGuid();
        _context.Users.Add(new User { Id = userId, Email = "u@test.com", GoogleId = "g", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        await _context.SaveChangesAsync();

        var result = await _service.CreateProjectAsync(userId, "Project", "proj", null);

        _context.ChangeTracker.Clear();
        var userProject = await _context.UserProjects
            .FirstOrDefaultAsync(up => up.UserId == userId && up.ProjectId == result.Id);
        Assert.NotNull(userProject);
        Assert.Equal(ProjectRole.Owner, userProject.Role);
    }

    [Fact]
    public async Task CreateProjectAsync_NameExactly100Chars_Succeeds()
    {
        var userId = Guid.NewGuid();
        _context.Users.Add(new User { Id = userId, Email = "u@test.com", GoogleId = "g", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        await _context.SaveChangesAsync();
        var name100 = new string('a', 100);

        var result = await _service.CreateProjectAsync(userId, name100, "valid-code", null);

        Assert.NotNull(result);
        Assert.Equal(name100, result.Name);
    }

    [Fact]
    public async Task CreateProjectAsync_CodeExactly50Chars_Succeeds()
    {
        var userId = Guid.NewGuid();
        _context.Users.Add(new User { Id = userId, Email = "u@test.com", GoogleId = "g", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        await _context.SaveChangesAsync();
        var code50 = new string('a', 50);

        var result = await _service.CreateProjectAsync(userId, "Valid Name", code50, null);

        Assert.NotNull(result);
        Assert.Equal(code50, result.Code);
    }

    [Fact]
    public async Task CreateProjectAsync_EmptyName_ThrowsValidationExceptionWithMessage()
    {
        var userId = Guid.NewGuid();

        var ex = await Assert.ThrowsAsync<ValidationException>(
            () => _service.CreateProjectAsync(userId, "", "code", null));

        Assert.True(ex.ErrorResponse.Errors.ContainsKey("name"));
        Assert.Contains("required", ex.ErrorResponse.Errors["name"][0], StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateProjectAsync_WhitespaceName_ThrowsValidationExceptionWithMessage()
    {
        var userId = Guid.NewGuid();

        var ex = await Assert.ThrowsAsync<ValidationException>(
            () => _service.CreateProjectAsync(userId, "   ", "code", null));

        Assert.True(ex.ErrorResponse.Errors.ContainsKey("name"));
        Assert.Contains("required", ex.ErrorResponse.Errors["name"][0], StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateProjectAsync_NameExceeds100Chars_ThrowsValidationExceptionWithMessage()
    {
        var userId = Guid.NewGuid();
        var longName = new string('a', 101);

        var ex = await Assert.ThrowsAsync<ValidationException>(
            () => _service.CreateProjectAsync(userId, longName, "code", null));

        Assert.True(ex.ErrorResponse.Errors.ContainsKey("name"));
        Assert.Contains("100", ex.ErrorResponse.Errors["name"][0], StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateProjectAsync_EmptyCode_ThrowsValidationExceptionWithMessage()
    {
        var userId = Guid.NewGuid();

        var ex = await Assert.ThrowsAsync<ValidationException>(
            () => _service.CreateProjectAsync(userId, "Name", "", null));

        Assert.True(ex.ErrorResponse.Errors.ContainsKey("code"));
        Assert.Contains("required", ex.ErrorResponse.Errors["code"][0], StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateProjectAsync_WhitespaceCode_ThrowsValidationExceptionWithMessage()
    {
        var userId = Guid.NewGuid();

        var ex = await Assert.ThrowsAsync<ValidationException>(
            () => _service.CreateProjectAsync(userId, "Name", "   ", null));

        Assert.True(ex.ErrorResponse.Errors.ContainsKey("code"));
        Assert.Contains("required", ex.ErrorResponse.Errors["code"][0], StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateProjectAsync_CodeWithUppercase_ThrowsValidationExceptionWithMessage()
    {
        var userId = Guid.NewGuid();

        var ex = await Assert.ThrowsAsync<ValidationException>(
            () => _service.CreateProjectAsync(userId, "Name", "InvalidCode", null));

        Assert.True(ex.ErrorResponse.Errors.ContainsKey("code"));
        Assert.Contains("lowercase", ex.ErrorResponse.Errors["code"][0], StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateProjectAsync_CodeWithSpaces_ThrowsValidationExceptionWithMessage()
    {
        var userId = Guid.NewGuid();

        var ex = await Assert.ThrowsAsync<ValidationException>(
            () => _service.CreateProjectAsync(userId, "Name", "my project", null));

        Assert.True(ex.ErrorResponse.Errors.ContainsKey("code"));
        Assert.Contains("lowercase", ex.ErrorResponse.Errors["code"][0], StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateProjectAsync_CodeWithUnderscore_ThrowsValidationException()
    {
        var userId = Guid.NewGuid();

        var ex = await Assert.ThrowsAsync<ValidationException>(
            () => _service.CreateProjectAsync(userId, "Name", "my_project", null));

        Assert.True(ex.ErrorResponse.Errors.ContainsKey("code"));
        Assert.Contains("lowercase", ex.ErrorResponse.Errors["code"][0], StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateProjectAsync_CodeExceeds50Chars_ThrowsValidationExceptionWithMessage()
    {
        var userId = Guid.NewGuid();
        var longCode = new string('a', 51);

        var ex = await Assert.ThrowsAsync<ValidationException>(
            () => _service.CreateProjectAsync(userId, "Name", longCode, null));

        Assert.True(ex.ErrorResponse.Errors.ContainsKey("code"));
        Assert.Contains("50", ex.ErrorResponse.Errors["code"][0], StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateProjectAsync_DuplicateCodeForSameOwner_ThrowsValidationExceptionWithMessage()
    {
        var (userId, _) = await SeedOwnerWithProject(projectCode: "my-code");

        var ex = await Assert.ThrowsAsync<ValidationException>(
            () => _service.CreateProjectAsync(userId, "New Name", "my-code", null));

        Assert.True(ex.ErrorResponse.Errors.ContainsKey("code"));
        Assert.Contains("already", ex.ErrorResponse.Errors["code"][0], StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateProjectAsync_BothNameAndCodeInvalid_ThrowsValidationExceptionWithBothErrors()
    {
        var userId = Guid.NewGuid();

        var ex = await Assert.ThrowsAsync<ValidationException>(
            () => _service.CreateProjectAsync(userId, "", "BAD CODE!", null));

        Assert.True(ex.ErrorResponse.Errors.ContainsKey("name"));
        Assert.True(ex.ErrorResponse.Errors.ContainsKey("code"));
    }

    [Fact]
    public async Task CreateProjectAsync_SameCodeDifferentOwner_Succeeds()
    {
        // Two different users can have projects with the same code
        var (_, _) = await SeedOwnerWithProject(email: "owner1@test.com", projectCode: "shared-code");
        var user2Id = Guid.NewGuid();
        _context.Users.Add(new User { Id = user2Id, Email = "owner2@test.com", GoogleId = "g2", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        await _context.SaveChangesAsync();

        var result = await _service.CreateProjectAsync(user2Id, "Project 2", "shared-code", null);

        Assert.NotNull(result);
    }

    #endregion

    #region UpdateProjectAsync Tests

    [Fact]
    public async Task UpdateProjectAsync_OwnerCanUpdate_ReturnsUpdatedDto()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var trackedUserProject = await GetTrackedUserProject(userId, projectId);
        _mockAuthService.Setup(a => a.GetUserProjectAsync(userId, projectId)).ReturnsAsync(trackedUserProject);

        var result = await _service.UpdateProjectAsync(userId, projectId, "New Name", "New Description");

        Assert.NotNull(result);
        Assert.Equal("New Name", result.Name);
        Assert.Equal("New Description", result.Description);
    }

    [Fact]
    public async Task UpdateProjectAsync_OwnerCanUpdate_PersistsToDatabase()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var trackedUserProject = await GetTrackedUserProject(userId, projectId);
        _mockAuthService.Setup(a => a.GetUserProjectAsync(userId, projectId)).ReturnsAsync(trackedUserProject);

        await _service.UpdateProjectAsync(userId, projectId, "Updated Name", null);

        _context.ChangeTracker.Clear();
        var project = await _context.Projects.FindAsync(projectId);
        Assert.Equal("Updated Name", project!.Name);
        Assert.Null(project.Description);
    }

    [Fact]
    public async Task UpdateProjectAsync_UserNotInProject_ReturnsNull()
    {
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        _mockAuthService.Setup(a => a.GetUserProjectAsync(userId, projectId)).ReturnsAsync((UserProject?)null);

        var result = await _service.UpdateProjectAsync(userId, projectId, "Name", null);

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateProjectAsync_CollaboratorRole_ReturnsNull()
    {
        var (_, projectId) = await SeedOwnerWithProject();
        var (collaboratorId, _) = await SeedCollaboratorOnProject(projectId);
        var collaboratorUserProject = await GetTrackedUserProject(collaboratorId, projectId);
        _mockAuthService.Setup(a => a.GetUserProjectAsync(collaboratorId, projectId)).ReturnsAsync(collaboratorUserProject);

        var result = await _service.UpdateProjectAsync(collaboratorId, projectId, "Name", null);

        Assert.Null(result);
    }

    #endregion

    #region GetProjectUsersAsync Tests

    [Fact]
    public async Task GetProjectUsersAsync_WithAccess_ReturnsAllMembers()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        await SeedCollaboratorOnProject(projectId);

        var result = await _service.GetProjectUsersAsync(userId, projectId);

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetProjectUsersAsync_WithoutAccess_ReturnsEmpty()
    {
        var (_, projectId) = await SeedOwnerWithProject();
        var outsiderId = Guid.NewGuid();
        _mockAuthService.Setup(a => a.HasProjectAccessAsync(outsiderId, projectId)).ReturnsAsync(false);

        var result = await _service.GetProjectUsersAsync(outsiderId, projectId);

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetProjectUsersAsync_OwnerListedFirst()
    {
        var (userId, projectId) = await SeedOwnerWithProject(email: "owner@test.com");
        await SeedCollaboratorOnProject(projectId, "aaa-collab@test.com"); // alphabetically before owner

        var result = await _service.GetProjectUsersAsync(userId, projectId);

        Assert.Equal("Owner", result[0].Role);
    }

    [Fact]
    public async Task GetProjectUsersAsync_PendingUser_IsPendingFlagSet()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        // Add an invited (placeholder) user without GoogleId
        var pendingUser = new User
        {
            Id = Guid.NewGuid(),
            GoogleId = null,
            Email = "pending@test.com",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Users.Add(pendingUser);
        _context.UserProjects.Add(new UserProject
        {
            UserId = pendingUser.Id,
            ProjectId = projectId,
            Role = ProjectRole.Collaborator,
            JoinedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        var result = await _service.GetProjectUsersAsync(userId, projectId);

        var pending = result.Single(u => u.Email == "pending@test.com");
        Assert.True(pending.IsPending);
    }

    [Fact]
    public async Task GetProjectUsersAsync_GoogleUser_IsNotPending()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        var result = await _service.GetProjectUsersAsync(userId, projectId);

        var owner = result.Single(u => u.Role == "Owner");
        Assert.False(owner.IsPending);
    }

    #endregion

    #region InviteUserToProjectAsync Tests

    [Fact]
    public async Task InviteUserToProjectAsync_OwnerInvitesNewEmail_CreatesPlaceholderUser()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var trackedUserProject = await GetTrackedUserProject(userId, projectId);
        _mockAuthService.Setup(a => a.GetUserProjectAsync(userId, projectId)).ReturnsAsync(trackedUserProject);

        var result = await _service.InviteUserToProjectAsync(userId, projectId, "new@invited.com", "Collaborator");

        Assert.NotNull(result);
        var (userDto, _) = result.Value;
        Assert.Equal("new@invited.com", userDto!.Email);
        Assert.Equal("Collaborator", userDto.Role);
        Assert.True(userDto.IsPending);
    }

    [Fact]
    public async Task InviteUserToProjectAsync_OwnerInvitesExistingUser_UsesExistingRecord()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var existingUser = await _context.Users.FirstAsync(u => u.Id == userId);
        var otherUser = new User { Id = Guid.NewGuid(), Email = "existing@test.com", GoogleId = "g2", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _context.Users.Add(otherUser);
        await _context.SaveChangesAsync();

        var trackedUserProject = await GetTrackedUserProject(userId, projectId);
        _mockAuthService.Setup(a => a.GetUserProjectAsync(userId, projectId)).ReturnsAsync(trackedUserProject);

        var result = await _service.InviteUserToProjectAsync(userId, projectId, "existing@test.com", "Collaborator");

        Assert.NotNull(result);
        var (userDto, _) = result.Value;
        Assert.Equal(otherUser.Id, userDto!.UserId);
        _ = existingUser;
    }

    [Fact]
    public async Task InviteUserToProjectAsync_CollaboratorCannotInvite_ReturnsNull()
    {
        var (_, projectId) = await SeedOwnerWithProject();
        var (collaboratorId, _) = await SeedCollaboratorOnProject(projectId);
        var trackedUserProject = await GetTrackedUserProject(collaboratorId, projectId);
        _mockAuthService.Setup(a => a.GetUserProjectAsync(collaboratorId, projectId)).ReturnsAsync(trackedUserProject);

        var result = await _service.InviteUserToProjectAsync(collaboratorId, projectId, "new@test.com", "Collaborator");

        Assert.Null(result);
    }

    [Fact]
    public async Task InviteUserToProjectAsync_UserAlreadyMember_ThrowsInvalidOperationException()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var (collaboratorId, _) = await SeedCollaboratorOnProject(projectId, "collab@test.com");
        _ = collaboratorId;
        var trackedUserProject = await GetTrackedUserProject(userId, projectId);
        _mockAuthService.Setup(a => a.GetUserProjectAsync(userId, projectId)).ReturnsAsync(trackedUserProject);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _service.InviteUserToProjectAsync(userId, projectId, "collab@test.com", "Collaborator"));
    }

    [Fact]
    public async Task InviteUserToProjectAsync_InvalidRole_ThrowsArgumentException()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var trackedUserProject = await GetTrackedUserProject(userId, projectId);
        _mockAuthService.Setup(a => a.GetUserProjectAsync(userId, projectId)).ReturnsAsync(trackedUserProject);

        await Assert.ThrowsAsync<ArgumentException>(
            () => _service.InviteUserToProjectAsync(userId, projectId, "new@test.com", "SuperAdmin"));
    }

    [Fact]
    public async Task InviteUserToProjectAsync_OwnerRole_ThrowsArgumentException()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var trackedUserProject = await GetTrackedUserProject(userId, projectId);
        _mockAuthService.Setup(a => a.GetUserProjectAsync(userId, projectId)).ReturnsAsync(trackedUserProject);

        await Assert.ThrowsAsync<ArgumentException>(
            () => _service.InviteUserToProjectAsync(userId, projectId, "new@test.com", "Owner"));
    }

    [Fact]
    public async Task InviteUserToProjectAsync_NormalizesEmailToLowercase()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var trackedUserProject = await GetTrackedUserProject(userId, projectId);
        _mockAuthService.Setup(a => a.GetUserProjectAsync(userId, projectId)).ReturnsAsync(trackedUserProject);

        var result = await _service.InviteUserToProjectAsync(userId, projectId, "  UPPER@TEST.COM  ", "Collaborator");

        Assert.NotNull(result);
        var (userDto, _) = result.Value;
        Assert.Equal("upper@test.com", userDto!.Email);
    }

    [Fact]
    public async Task InviteUserToProjectAsync_ReturnInviterName()
    {
        var (userId, projectId) = await SeedOwnerWithProject(email: "owner@test.com");
        var ownerUser = await _context.Users.FirstAsync(u => u.Id == userId);
        ownerUser.Name = "Owner Name";
        await _context.SaveChangesAsync();
        var trackedUserProject = await GetTrackedUserProject(userId, projectId);
        _mockAuthService.Setup(a => a.GetUserProjectAsync(userId, projectId)).ReturnsAsync(trackedUserProject);

        var result = await _service.InviteUserToProjectAsync(userId, projectId, "new@test.com", "Collaborator");

        Assert.NotNull(result);
        var (_, inviterName) = result.Value;
        Assert.Equal("Owner Name", inviterName);
    }

    #endregion

    #region RemoveUserFromProjectAsync Tests

    [Fact]
    public async Task RemoveUserFromProjectAsync_OwnerRemovesCollaborator_ReturnsTrue()
    {
        var (ownerId, projectId) = await SeedOwnerWithProject();
        var (collaboratorId, _) = await SeedCollaboratorOnProject(projectId);
        _mockAuthService.Setup(a => a.GetUserProjectRoleAsync(ownerId, (Guid?)projectId)).ReturnsAsync(ProjectRole.Owner);

        var result = await _service.RemoveUserFromProjectAsync(ownerId, projectId, collaboratorId);

        Assert.True(result);
    }

    [Fact]
    public async Task RemoveUserFromProjectAsync_OwnerRemovesCollaborator_RemovesFromDatabase()
    {
        var (ownerId, projectId) = await SeedOwnerWithProject();
        var (collaboratorId, _) = await SeedCollaboratorOnProject(projectId);
        _mockAuthService.Setup(a => a.GetUserProjectRoleAsync(ownerId, (Guid?)projectId)).ReturnsAsync(ProjectRole.Owner);

        await _service.RemoveUserFromProjectAsync(ownerId, projectId, collaboratorId);

        _context.ChangeTracker.Clear();
        var removed = await _context.UserProjects.FirstOrDefaultAsync(up => up.UserId == collaboratorId && up.ProjectId == projectId);
        Assert.Null(removed);
    }

    [Fact]
    public async Task RemoveUserFromProjectAsync_CollaboratorLeavesSelf_ReturnsTrue()
    {
        var (_, projectId) = await SeedOwnerWithProject();
        var (collaboratorId, _) = await SeedCollaboratorOnProject(projectId);
        _mockAuthService.Setup(a => a.GetUserProjectRoleAsync(collaboratorId, (Guid?)projectId)).ReturnsAsync(ProjectRole.Collaborator);

        var result = await _service.RemoveUserFromProjectAsync(collaboratorId, projectId, collaboratorId);

        Assert.True(result);
    }

    [Fact]
    public async Task RemoveUserFromProjectAsync_LastOwnerLeaveSelf_ThrowsInvalidOperationException()
    {
        var (ownerId, projectId) = await SeedOwnerWithProject();
        _mockAuthService.Setup(a => a.GetUserProjectRoleAsync(ownerId, (Guid?)projectId)).ReturnsAsync(ProjectRole.Owner);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _service.RemoveUserFromProjectAsync(ownerId, projectId, ownerId));
    }

    [Fact]
    public async Task RemoveUserFromProjectAsync_CollaboratorCannotRemoveOthers_ReturnsFalse()
    {
        var (ownerId, projectId) = await SeedOwnerWithProject();
        var (collaboratorId, _) = await SeedCollaboratorOnProject(projectId);
        _mockAuthService.Setup(a => a.GetUserProjectRoleAsync(collaboratorId, (Guid?)projectId)).ReturnsAsync(ProjectRole.Collaborator);

        var result = await _service.RemoveUserFromProjectAsync(collaboratorId, projectId, ownerId);

        Assert.False(result);
    }

    [Fact]
    public async Task RemoveUserFromProjectAsync_OwnerTriesToRemoveOwner_ThrowsInvalidOperationException()
    {
        var (ownerId, projectId) = await SeedOwnerWithProject();
        var secondOwnerId = Guid.NewGuid();
        _context.Users.Add(new User { Id = secondOwnerId, Email = "owner2@test.com", GoogleId = "g2", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        _context.UserProjects.Add(new UserProject { UserId = secondOwnerId, ProjectId = projectId, Role = ProjectRole.Owner, JoinedAt = DateTime.UtcNow });
        await _context.SaveChangesAsync();
        _mockAuthService.Setup(a => a.GetUserProjectRoleAsync(ownerId, (Guid?)projectId)).ReturnsAsync(ProjectRole.Owner);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _service.RemoveUserFromProjectAsync(ownerId, projectId, secondOwnerId));
    }

    [Fact]
    public async Task RemoveUserFromProjectAsync_RequestingUserNotInProject_ReturnsFalse()
    {
        var (_, projectId) = await SeedOwnerWithProject();
        var outsiderId = Guid.NewGuid();
        var targetId = Guid.NewGuid();
        _mockAuthService.Setup(a => a.GetUserProjectRoleAsync(outsiderId, (Guid?)projectId)).ReturnsAsync((ProjectRole?)null);

        var result = await _service.RemoveUserFromProjectAsync(outsiderId, projectId, targetId);

        Assert.False(result);
    }

    [Fact]
    public async Task RemoveUserFromProjectAsync_TargetNotInProject_ReturnsFalse()
    {
        var (ownerId, projectId) = await SeedOwnerWithProject();
        _mockAuthService.Setup(a => a.GetUserProjectRoleAsync(ownerId, (Guid?)projectId)).ReturnsAsync(ProjectRole.Owner);

        var result = await _service.RemoveUserFromProjectAsync(ownerId, projectId, Guid.NewGuid());

        Assert.False(result);
    }

    #endregion

    #region DeleteProjectAsync Tests

    [Fact]
    public async Task DeleteProjectAsync_OwnerCanDelete_RemovesProject()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var trackedUserProject = await GetTrackedUserProject(userId, projectId);
        _mockAuthService.Setup(a => a.GetUserProjectAsync(userId, projectId)).ReturnsAsync(trackedUserProject);

        await _service.DeleteProjectAsync(userId, projectId);

        _context.ChangeTracker.Clear();
        var project = await _context.Projects.FindAsync(projectId);
        Assert.Null(project);
    }

    [Fact]
    public async Task DeleteProjectAsync_CollaboratorRole_ThrowsUnauthorizedAccessException()
    {
        var (_, projectId) = await SeedOwnerWithProject();
        var (collaboratorId, _) = await SeedCollaboratorOnProject(projectId);
        var collaboratorUserProject = await GetTrackedUserProject(collaboratorId, projectId);
        _mockAuthService.Setup(a => a.GetUserProjectAsync(collaboratorId, projectId)).ReturnsAsync(collaboratorUserProject);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.DeleteProjectAsync(collaboratorId, projectId));
    }

    [Fact]
    public async Task DeleteProjectAsync_UserNotInProject_ThrowsUnauthorizedAccessException()
    {
        var (_, projectId) = await SeedOwnerWithProject();
        var outsiderId = Guid.NewGuid();
        _mockAuthService.Setup(a => a.GetUserProjectAsync(outsiderId, projectId)).ReturnsAsync((UserProject?)null);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.DeleteProjectAsync(outsiderId, projectId));
    }

    [Fact]
    public async Task DeleteProjectAsync_ProjectNotFound_ThrowsKeyNotFoundException()
    {
        var outsiderId = Guid.NewGuid();
        var nonExistentProjectId = Guid.NewGuid();
        _mockAuthService.Setup(a => a.GetUserProjectAsync(outsiderId, nonExistentProjectId)).ReturnsAsync((UserProject?)null);

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _service.DeleteProjectAsync(outsiderId, nonExistentProjectId));
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
