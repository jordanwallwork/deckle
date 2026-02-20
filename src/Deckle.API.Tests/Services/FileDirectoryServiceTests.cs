using Deckle.API.Exceptions;
using Deckle.API.Services;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;

namespace Deckle.API.Tests.Services;

public class FileDirectoryServiceTests : IDisposable
{
    private bool _disposed;
    private readonly AppDbContext _context;
    private readonly Mock<IProjectAuthorizationService> _mockAuthService;
    private readonly Mock<ILogger<FileDirectoryService>> _mockLogger;
    private readonly FileDirectoryService _service;

    public FileDirectoryServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);
        _mockAuthService = new Mock<IProjectAuthorizationService>();
        _mockLogger = new Mock<ILogger<FileDirectoryService>>();

        // Default: all authorization passes
        _mockAuthService
            .Setup(a => a.HasProjectAccessAsync(It.IsAny<Guid>(), It.IsAny<Guid>()))
            .ReturnsAsync(true);
        _mockAuthService
            .Setup(a => a.EnsureCanModifyResourcesAsync(It.IsAny<Guid>(), It.IsAny<Guid?>()))
            .Returns(Task.CompletedTask);
        _mockAuthService
            .Setup(a => a.EnsureCanDeleteResourcesAsync(It.IsAny<Guid>(), It.IsAny<Guid>()))
            .Returns(Task.CompletedTask);

        _service = new FileDirectoryService(_context, _mockAuthService.Object, _mockLogger.Object);
    }

    #region Helpers

    private async Task<(Guid userId, Guid projectId)> SeedOwnerWithProject()
    {
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        _context.Users.Add(new User { Id = userId, Email = $"{userId}@test.com", GoogleId = Guid.NewGuid().ToString(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        _context.Projects.Add(new Project { Id = projectId, Name = "Test", Code = "t", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        _context.UserProjects.Add(new UserProject { UserId = userId, ProjectId = projectId, Role = ProjectRole.Owner, JoinedAt = DateTime.UtcNow });
        await _context.SaveChangesAsync();
        return (userId, projectId);
    }

    private async Task<FileDirectory> SeedDirectory(Guid projectId, string name, Guid? parentId = null)
    {
        var dir = new FileDirectory
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = name,
            ParentDirectoryId = parentId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.FileDirectories.Add(dir);
        await _context.SaveChangesAsync();
        return dir;
    }

    #endregion

    #region CreateDirectoryAsync Tests

    [Fact]
    public async Task CreateDirectoryAsync_ValidName_CreatesAndReturnsDirectory()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        var result = await _service.CreateDirectoryAsync(userId, projectId, "My Folder");

        Assert.NotNull(result);
        Assert.Equal("My Folder", result.Name);
        Assert.Equal(projectId, result.ProjectId);
        Assert.Null(result.ParentDirectoryId);
    }

    [Fact]
    public async Task CreateDirectoryAsync_ValidName_PersistsToDatabase()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        var result = await _service.CreateDirectoryAsync(userId, projectId, "My Folder");

        _context.ChangeTracker.Clear();
        var persisted = await _context.FileDirectories.FindAsync(result.Id);
        Assert.NotNull(persisted);
        Assert.Equal("My Folder", persisted.Name);
    }

    [Fact]
    public async Task CreateDirectoryAsync_WithParentDirectory_CreatesSubdirectory()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var parent = await SeedDirectory(projectId, "Parent");

        var result = await _service.CreateDirectoryAsync(userId, projectId, "Child", parent.Id);

        Assert.Equal(parent.Id, result.ParentDirectoryId);
    }

    [Fact]
    public async Task CreateDirectoryAsync_EmptyName_ThrowsArgumentException()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        await Assert.ThrowsAsync<ArgumentException>(
            () => _service.CreateDirectoryAsync(userId, projectId, ""));
    }

    [Fact]
    public async Task CreateDirectoryAsync_WhitespaceName_ThrowsArgumentException()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        await Assert.ThrowsAsync<ArgumentException>(
            () => _service.CreateDirectoryAsync(userId, projectId, "   "));
    }

    [Fact]
    public async Task CreateDirectoryAsync_NameExceeds255Chars_ThrowsArgumentException()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var longName = new string('a', 256);

        await Assert.ThrowsAsync<ArgumentException>(
            () => _service.CreateDirectoryAsync(userId, projectId, longName));
    }

    [Fact]
    public async Task CreateDirectoryAsync_NameWithInvalidChars_ThrowsArgumentException()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        await Assert.ThrowsAsync<ArgumentException>(
            () => _service.CreateDirectoryAsync(userId, projectId, "bad/name"));
    }

    [Fact]
    public async Task CreateDirectoryAsync_DuplicateNameInSameLocation_ThrowsArgumentException()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        await SeedDirectory(projectId, "Existing");

        await Assert.ThrowsAsync<ArgumentException>(
            () => _service.CreateDirectoryAsync(userId, projectId, "Existing"));
    }

    [Fact]
    public async Task CreateDirectoryAsync_SameNameDifferentParent_Succeeds()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var parent1 = await SeedDirectory(projectId, "Parent1");
        var parent2 = await SeedDirectory(projectId, "Parent2");
        await SeedDirectory(projectId, "Child", parent1.Id);

        // Same name but in a different parent - should succeed
        var result = await _service.CreateDirectoryAsync(userId, projectId, "Child", parent2.Id);

        Assert.NotNull(result);
        Assert.Equal(parent2.Id, result.ParentDirectoryId);
    }

    [Fact]
    public async Task CreateDirectoryAsync_ParentNotFound_ThrowsKeyNotFoundException()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _service.CreateDirectoryAsync(userId, projectId, "Child", Guid.NewGuid()));
    }

    [Fact]
    public async Task CreateDirectoryAsync_UnauthorizedUser_ThrowsUnauthorizedAccessException()
    {
        var (_, projectId) = await SeedOwnerWithProject();
        var outsiderId = Guid.NewGuid();
        _mockAuthService
            .Setup(a => a.EnsureCanModifyResourcesAsync(outsiderId, (Guid?)projectId))
            .ThrowsAsync(new UnauthorizedAccessException());

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.CreateDirectoryAsync(outsiderId, projectId, "Folder"));
    }

    [Fact]
    public async Task CreateDirectoryAsync_TrimsName()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        var result = await _service.CreateDirectoryAsync(userId, projectId, "  My Folder  ");

        Assert.Equal("My Folder", result.Name);
    }

    #endregion

    #region GetProjectDirectoriesAsync Tests

    [Fact]
    public async Task GetProjectDirectoriesAsync_WithAccess_ReturnsAllDirectories()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        await SeedDirectory(projectId, "Alpha");
        await SeedDirectory(projectId, "Beta");

        var result = await _service.GetProjectDirectoriesAsync(userId, projectId);

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetProjectDirectoriesAsync_WithoutAccess_ReturnsEmpty()
    {
        var (_, projectId) = await SeedOwnerWithProject();
        var outsiderId = Guid.NewGuid();
        _mockAuthService.Setup(a => a.HasProjectAccessAsync(outsiderId, projectId)).ReturnsAsync(false);

        var result = await _service.GetProjectDirectoriesAsync(outsiderId, projectId);

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetProjectDirectoriesAsync_ReturnsOnlyProjectDirectories()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var (_, otherProjectId) = await SeedOwnerWithProject();
        await SeedDirectory(projectId, "Mine");
        await SeedDirectory(otherProjectId, "Other");

        var result = await _service.GetProjectDirectoriesAsync(userId, projectId);

        Assert.Single(result);
        Assert.Equal("Mine", result[0].Name);
    }

    [Fact]
    public async Task GetProjectDirectoriesAsync_OrdersAlphabetically()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        await SeedDirectory(projectId, "Zebra");
        await SeedDirectory(projectId, "Apple");

        var result = await _service.GetProjectDirectoriesAsync(userId, projectId);

        Assert.Equal("Apple", result[0].Name);
        Assert.Equal("Zebra", result[1].Name);
    }

    #endregion

    #region GetDirectoryWithContentsAsync Tests

    [Fact]
    public async Task GetDirectoryWithContentsAsync_ExistingDirectory_ReturnsDto()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var dir = await SeedDirectory(projectId, "Folder");

        var result = await _service.GetDirectoryWithContentsAsync(userId, projectId, dir.Id);

        Assert.NotNull(result);
        Assert.Equal(dir.Id, result.Id);
        Assert.Equal("Folder", result.Name);
    }

    [Fact]
    public async Task GetDirectoryWithContentsAsync_NonExistentDirectory_ReturnsNull()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        var result = await _service.GetDirectoryWithContentsAsync(userId, projectId, Guid.NewGuid());

        Assert.Null(result);
    }

    [Fact]
    public async Task GetDirectoryWithContentsAsync_WithoutAccess_ReturnsNull()
    {
        var (_, projectId) = await SeedOwnerWithProject();
        var dir = await SeedDirectory(projectId, "Folder");
        var outsiderId = Guid.NewGuid();
        _mockAuthService.Setup(a => a.HasProjectAccessAsync(outsiderId, projectId)).ReturnsAsync(false);

        var result = await _service.GetDirectoryWithContentsAsync(outsiderId, projectId, dir.Id);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetDirectoryWithContentsAsync_IncludesChildDirectories()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var parent = await SeedDirectory(projectId, "Parent");
        await SeedDirectory(projectId, "Child", parent.Id);

        var result = await _service.GetDirectoryWithContentsAsync(userId, projectId, parent.Id);

        Assert.NotNull(result);
        Assert.Single(result.ChildDirectories);
        Assert.Equal("Child", result.ChildDirectories[0].Name);
    }

    #endregion

    #region GetDirectoryByPathAsync Tests

    [Fact]
    public async Task GetDirectoryByPathAsync_EmptyPath_ReturnsRootContents()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        var result = await _service.GetDirectoryByPathAsync(userId, projectId, "");

        Assert.NotNull(result);
        Assert.Equal(Guid.Empty, result.Id); // virtual root
    }

    [Fact]
    public async Task GetDirectoryByPathAsync_ValidSingleSegmentPath_ReturnsDirectory()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        await SeedDirectory(projectId, "myfolder");

        var result = await _service.GetDirectoryByPathAsync(userId, projectId, "myfolder");

        Assert.NotNull(result);
        Assert.Equal("myfolder", result.Name);
    }

    [Fact]
    public async Task GetDirectoryByPathAsync_ValidNestedPath_ReturnsNestedDirectory()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var parent = await SeedDirectory(projectId, "parent");
        await SeedDirectory(projectId, "child", parent.Id);

        var result = await _service.GetDirectoryByPathAsync(userId, projectId, "parent/child");

        Assert.NotNull(result);
        Assert.Equal("child", result.Name);
    }

    [Fact]
    public async Task GetDirectoryByPathAsync_InvalidPath_ReturnsNull()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        var result = await _service.GetDirectoryByPathAsync(userId, projectId, "nonexistent/path");

        Assert.Null(result);
    }

    [Fact]
    public async Task GetDirectoryByPathAsync_WithoutAccess_ReturnsNull()
    {
        var (_, projectId) = await SeedOwnerWithProject();
        var outsiderId = Guid.NewGuid();
        _mockAuthService.Setup(a => a.HasProjectAccessAsync(outsiderId, projectId)).ReturnsAsync(false);

        var result = await _service.GetDirectoryByPathAsync(outsiderId, projectId, "folder");

        Assert.Null(result);
    }

    #endregion

    #region GetDirectoryPathAsync Tests

    [Fact]
    public async Task GetDirectoryPathAsync_TopLevelDirectory_ReturnsName()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var dir = await SeedDirectory(projectId, "myfolder");

        var result = await _service.GetDirectoryPathAsync(userId, projectId, dir.Id);

        Assert.Equal("myfolder", result);
    }

    [Fact]
    public async Task GetDirectoryPathAsync_NestedDirectory_ReturnsFullPath()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var parent = await SeedDirectory(projectId, "parent");
        var child = await SeedDirectory(projectId, "child", parent.Id);

        var result = await _service.GetDirectoryPathAsync(userId, projectId, child.Id);

        Assert.Equal("parent/child", result);
    }

    [Fact]
    public async Task GetDirectoryPathAsync_NonExistentDirectory_ReturnsNull()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        var result = await _service.GetDirectoryPathAsync(userId, projectId, Guid.NewGuid());

        Assert.Null(result);
    }

    [Fact]
    public async Task GetDirectoryPathAsync_WithoutAccess_ReturnsNull()
    {
        var (_, projectId) = await SeedOwnerWithProject();
        var dir = await SeedDirectory(projectId, "folder");
        var outsiderId = Guid.NewGuid();
        _mockAuthService.Setup(a => a.HasProjectAccessAsync(outsiderId, projectId)).ReturnsAsync(false);

        var result = await _service.GetDirectoryPathAsync(outsiderId, projectId, dir.Id);

        Assert.Null(result);
    }

    #endregion

    #region GetRootContentsAsync Tests

    [Fact]
    public async Task GetRootContentsAsync_WithAccess_ReturnsVirtualRootDirectory()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        var result = await _service.GetRootContentsAsync(userId, projectId);

        Assert.NotNull(result);
        Assert.Equal(Guid.Empty, result.Id);
        Assert.Equal("", result.Name);
    }

    [Fact]
    public async Task GetRootContentsAsync_WithoutAccess_ReturnsNull()
    {
        var (_, projectId) = await SeedOwnerWithProject();
        var outsiderId = Guid.NewGuid();
        _mockAuthService.Setup(a => a.HasProjectAccessAsync(outsiderId, projectId)).ReturnsAsync(false);

        var result = await _service.GetRootContentsAsync(outsiderId, projectId);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetRootContentsAsync_IncludesRootDirectories()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        await SeedDirectory(projectId, "RootDir1");
        await SeedDirectory(projectId, "RootDir2");
        var parent = await SeedDirectory(projectId, "Parent");
        await SeedDirectory(projectId, "Nested", parent.Id); // nested, should NOT be in root direct

        var result = await _service.GetRootContentsAsync(userId, projectId);

        // Only top-level directories (no parent) should appear as direct children of root
        Assert.NotNull(result);
        Assert.Equal(3, result.ChildDirectories.Count); // RootDir1, RootDir2, Parent
        Assert.DoesNotContain(result.ChildDirectories, d => d.Name == "Nested");
    }

    #endregion

    #region RenameDirectoryAsync Tests

    [Fact]
    public async Task RenameDirectoryAsync_ValidNewName_RenamesDirectory()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var dir = await SeedDirectory(projectId, "OldName");

        var result = await _service.RenameDirectoryAsync(userId, dir.Id, "NewName");

        Assert.Equal("NewName", result.Name);
    }

    [Fact]
    public async Task RenameDirectoryAsync_ValidNewName_PersistsToDatabase()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var dir = await SeedDirectory(projectId, "OldName");

        await _service.RenameDirectoryAsync(userId, dir.Id, "NewName");

        _context.ChangeTracker.Clear();
        var updated = await _context.FileDirectories.FindAsync(dir.Id);
        Assert.Equal("NewName", updated!.Name);
    }

    [Fact]
    public async Task RenameDirectoryAsync_NotFound_ThrowsKeyNotFoundException()
    {
        var userId = Guid.NewGuid();

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _service.RenameDirectoryAsync(userId, Guid.NewGuid(), "NewName"));
    }

    [Fact]
    public async Task RenameDirectoryAsync_EmptyName_ThrowsArgumentException()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var dir = await SeedDirectory(projectId, "Folder");

        await Assert.ThrowsAsync<ArgumentException>(
            () => _service.RenameDirectoryAsync(userId, dir.Id, ""));
    }

    [Fact]
    public async Task RenameDirectoryAsync_DuplicateNameInSameLocation_ThrowsArgumentException()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        await SeedDirectory(projectId, "Existing");
        var dir = await SeedDirectory(projectId, "ToRename");

        await Assert.ThrowsAsync<ArgumentException>(
            () => _service.RenameDirectoryAsync(userId, dir.Id, "Existing"));
    }

    [Fact]
    public async Task RenameDirectoryAsync_SameNameAsSelf_Succeeds()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var dir = await SeedDirectory(projectId, "SameName");

        // Renaming to own name should succeed (it excludes itself from uniqueness check)
        var result = await _service.RenameDirectoryAsync(userId, dir.Id, "SameName");

        Assert.Equal("SameName", result.Name);
    }

    #endregion

    #region MoveDirectoryAsync Tests

    [Fact]
    public async Task MoveDirectoryAsync_ToNewParent_MovesDirectory()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var source = await SeedDirectory(projectId, "Source");
        var newParent = await SeedDirectory(projectId, "NewParent");

        var result = await _service.MoveDirectoryAsync(userId, source.Id, newParent.Id);

        Assert.Equal(newParent.Id, result.ParentDirectoryId);
    }

    [Fact]
    public async Task MoveDirectoryAsync_ToRoot_SetsNullParent()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var parent = await SeedDirectory(projectId, "Parent");
        var child = await SeedDirectory(projectId, "Child", parent.Id);

        var result = await _service.MoveDirectoryAsync(userId, child.Id, null);

        Assert.Null(result.ParentDirectoryId);
    }

    [Fact]
    public async Task MoveDirectoryAsync_ToSelf_ThrowsArgumentException()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var dir = await SeedDirectory(projectId, "Folder");

        await Assert.ThrowsAsync<ArgumentException>(
            () => _service.MoveDirectoryAsync(userId, dir.Id, dir.Id));
    }

    [Fact]
    public async Task MoveDirectoryAsync_ToDescendant_ThrowsArgumentException()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var parent = await SeedDirectory(projectId, "Parent");
        var child = await SeedDirectory(projectId, "Child", parent.Id);

        await Assert.ThrowsAsync<ArgumentException>(
            () => _service.MoveDirectoryAsync(userId, parent.Id, child.Id));
    }

    [Fact]
    public async Task MoveDirectoryAsync_ConflictingNameWithoutMerge_ThrowsDirectoryConflictException()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var destination = await SeedDirectory(projectId, "Destination");
        await SeedDirectory(projectId, "Conflicting", destination.Id); // pre-existing in destination
        var source = await SeedDirectory(projectId, "Conflicting"); // same name, at root

        var ex = await Assert.ThrowsAsync<DirectoryConflictException>(
            () => _service.MoveDirectoryAsync(userId, source.Id, destination.Id, merge: false));

        Assert.NotNull(ex.Conflict);
    }

    [Fact]
    public async Task MoveDirectoryAsync_DirectoryNotFound_ThrowsKeyNotFoundException()
    {
        var userId = Guid.NewGuid();

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _service.MoveDirectoryAsync(userId, Guid.NewGuid(), null));
    }

    [Fact]
    public async Task MoveDirectoryAsync_NewParentNotFound_ThrowsKeyNotFoundException()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var dir = await SeedDirectory(projectId, "Folder");

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _service.MoveDirectoryAsync(userId, dir.Id, Guid.NewGuid()));
    }

    #endregion

    #region DeleteDirectoryAsync Tests

    [Fact]
    public async Task DeleteDirectoryAsync_ExistingDirectory_DeletesAndReturnsTrue()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var dir = await SeedDirectory(projectId, "ToDelete");

        var result = await _service.DeleteDirectoryAsync(userId, dir.Id);

        Assert.True(result);
    }

    [Fact]
    public async Task DeleteDirectoryAsync_ExistingDirectory_RemovesFromDatabase()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var dir = await SeedDirectory(projectId, "ToDelete");

        await _service.DeleteDirectoryAsync(userId, dir.Id);

        _context.ChangeTracker.Clear();
        var deleted = await _context.FileDirectories.FindAsync(dir.Id);
        Assert.Null(deleted);
    }

    [Fact]
    public async Task DeleteDirectoryAsync_NonExistentDirectory_ReturnsFalse()
    {
        var userId = Guid.NewGuid();

        var result = await _service.DeleteDirectoryAsync(userId, Guid.NewGuid());

        Assert.False(result);
    }

    [Fact]
    public async Task DeleteDirectoryAsync_UnauthorizedUser_ThrowsUnauthorizedAccessException()
    {
        var (_, projectId) = await SeedOwnerWithProject();
        var dir = await SeedDirectory(projectId, "Folder");
        var outsiderId = Guid.NewGuid();
        _mockAuthService
            .Setup(a => a.EnsureCanDeleteResourcesAsync(outsiderId, projectId))
            .ThrowsAsync(new UnauthorizedAccessException());

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.DeleteDirectoryAsync(outsiderId, dir.Id));
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
