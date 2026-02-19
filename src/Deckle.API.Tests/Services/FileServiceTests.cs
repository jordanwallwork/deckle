using Deckle.API.DTOs;
using Deckle.API.Services;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;

namespace Deckle.API.Tests.Services;

/// <summary>
/// Tests for FileService focusing on business logic, validation, and database operations.
/// Note: Tests that require R2 storage network calls are skipped or use test doubles.
/// </summary>
public class FileServiceTests : IDisposable
{
    private bool _disposed;
    private readonly ProjectAuthorizationService _authService;
    private readonly CloudflareR2Service _r2Service;
    private readonly Mock<ILogger<FileService>> _mockLogger;
    private readonly AppDbContext _context;
    private readonly FileService _fileService;

    public FileServiceTests()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);

        // Use real ProjectAuthorizationService with in-memory database
        _authService = new ProjectAuthorizationService(_context);

        // Use real CloudflareR2Service with test configuration
        var r2Options = Microsoft.Extensions.Options.Options.Create(new CloudflareR2Options
        {
            AccountId = "test-account",
            BucketName = "test-bucket",
            AccessKeyId = "test-key",
            SecretAccessKey = "test-secret"
        });
        _r2Service = new CloudflareR2Service(r2Options, new Mock<ILogger<CloudflareR2Service>>().Object);

        // Mock logger
        _mockLogger = new Mock<ILogger<FileService>>();

        _fileService = new FileService(
            _context,
            _authService,
            _r2Service,
            _mockLogger.Object);
    }

    #region RequestUploadUrlAsync Tests

    [Fact]
    public async Task RequestUploadUrlAsync_ValidRequest_CreatesFileRecordAndReturnsUrl()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        var fileName = "test.jpg";
        var contentType = "image/jpeg";
        var fileSizeBytes = 1024 * 1024; // 1MB

        await SeedProjectWithOwner(projectId, ownerId, userId);

        // Act
        var result = await _fileService.RequestUploadUrlAsync(
            userId, projectId, fileName, contentType, fileSizeBytes);

        // Assert
        Assert.NotNull(result);
        Assert.NotEqual(Guid.Empty, result.FileId);
        Assert.NotNull(result.UploadUrl);
        Assert.True(result.ExpiresAt > DateTime.UtcNow);

        // Verify file was created in database
        var file = await _context.Files.FindAsync(result.FileId);
        Assert.NotNull(file);
        Assert.Equal(projectId, file.ProjectId);
        Assert.Equal(userId, file.UploadedByUserId);
        Assert.Equal(fileName, file.FileName);
        Assert.Equal(contentType, file.ContentType);
        Assert.Equal(fileSizeBytes, file.FileSizeBytes);
        Assert.Equal(FileStatus.Pending, file.Status);
    }

    [Fact]
    public async Task RequestUploadUrlAsync_InvalidContentType_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();

        await SeedProjectWithOwner(projectId, ownerId, userId);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(
            () => _fileService.RequestUploadUrlAsync(
                userId, projectId, "test.exe", "application/exe", 1024));

        Assert.Contains("Content type", exception.Message, StringComparison.InvariantCulture);
        Assert.Contains("not allowed", exception.Message, StringComparison.InvariantCulture);
    }

    [Fact]
    public async Task RequestUploadUrlAsync_FileSizeZero_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();

        await SeedProjectWithOwner(projectId, ownerId, userId);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(
            () => _fileService.RequestUploadUrlAsync(
                userId, projectId, "test.jpg", "image/jpeg", 0));

        Assert.Contains("File size must be greater than 0", exception.Message, StringComparison.InvariantCulture);
    }

    [Fact]
    public async Task RequestUploadUrlAsync_FileSizeTooLarge_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        var fileSizeBytes = 51 * 1024 * 1024; // 51MB (over 50MB limit)

        await SeedProjectWithOwner(projectId, ownerId, userId);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(
            () => _fileService.RequestUploadUrlAsync(
                userId, projectId, "test.jpg", "image/jpeg", fileSizeBytes));

        Assert.Contains("exceeds maximum allowed size", exception.Message, StringComparison.InvariantCulture);
    }

    [Fact]
    public async Task RequestUploadUrlAsync_QuotaExceeded_ThrowsInvalidOperationException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        var fileSizeBytes = 10 * 1024 * 1024; // 10MB

        // Create owner with only 5MB quota and 1MB already used
        var owner = new User
        {
            Id = ownerId,
            Email = "owner@example.com",
            Name = "Owner",
            StorageQuotaMb = 5, // 5MB quota
            StorageUsedBytes = 1 * 1024 * 1024 // 1MB used
        };
        _context.Users.Add(owner);

        var project = new Project
        {
            Id = projectId,
            Name = "Test Project"
        };
        _context.Projects.Add(project);

        _context.UserProjects.Add(new UserProject
        {
            UserId = ownerId,
            ProjectId = projectId,
            Role = ProjectRole.Owner
        });

        _context.UserProjects.Add(new UserProject
        {
            UserId = userId,
            ProjectId = projectId,
            Role = ProjectRole.Collaborator
        });

        await _context.SaveChangesAsync();

        // Act & Assert
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => _fileService.RequestUploadUrlAsync(
                userId, projectId, "test.jpg", "image/jpeg", fileSizeBytes));

        Assert.Contains("storage quota exceeded", exception.Message, StringComparison.InvariantCulture);
        Assert.Contains("Available:", exception.Message, StringComparison.InvariantCulture);
        Assert.Contains("Required:", exception.Message, StringComparison.InvariantCulture);
    }

    [Fact]
    public async Task RequestUploadUrlAsync_WithValidTags_CreatesPendingFileWithNormalizedTags()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        var tags = new List<string> { "  CHARACTER  ", "Hero", "main-character" };

        await SeedProjectWithOwner(projectId, ownerId, userId);

        // Act
        var result = await _fileService.RequestUploadUrlAsync(
            userId, projectId, "test.jpg", "image/jpeg", 1024, tags);

        // Assert
        var file = await _context.Files.FindAsync(result.FileId);
        Assert.NotNull(file);
        Assert.Equal(3, file.Tags.Count);
        Assert.Contains("character", file.Tags); // Normalized to lowercase
        Assert.Contains("hero", file.Tags);
        Assert.Contains("main-character", file.Tags);
    }

    [Fact]
    public async Task RequestUploadUrlAsync_WithTooManyTags_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        var tags = Enumerable.Range(1, 21).Select(i => $"tag{i}").ToList(); // 21 tags (over 20 limit)

        await SeedProjectWithOwner(projectId, ownerId, userId);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(
            () => _fileService.RequestUploadUrlAsync(
                userId, projectId, "test.jpg", "image/jpeg", 1024, tags));

        Assert.Contains("Maximum 20 tags allowed", exception.Message, StringComparison.InvariantCulture);
    }

    [Fact]
    public async Task RequestUploadUrlAsync_WithInvalidTagCharacters_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        var tags = new List<string> { "valid-tag", "invalid tag with spaces" };

        await SeedProjectWithOwner(projectId, ownerId, userId);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(
            () => _fileService.RequestUploadUrlAsync(
                userId, projectId, "test.jpg", "image/jpeg", 1024, tags));

        Assert.Contains("contains invalid characters", exception.Message, StringComparison.InvariantCulture);
    }

    [Fact]
    public async Task RequestUploadUrlAsync_UserWithoutProjectAccess_ThrowsUnauthorizedAccessException()
    {
        // Arrange - no UserProject entry for this user
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();

        // Act & Assert: kills line 46 statement-removal mutation
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _fileService.RequestUploadUrlAsync(
                userId, projectId, "test.jpg", "image/jpeg", 1024));
    }

    [Fact]
    public async Task RequestUploadUrlAsync_FileSizeExactlyAtMaximum_Succeeds()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        var fileSizeBytes = 50 * 1024 * 1024; // exactly 50MB

        await SeedProjectWithOwner(projectId, ownerId, userId);

        // Act: kills line 60 > → >= boundary mutation (50MB is NOT > 50MB so should succeed)
        var result = await _fileService.RequestUploadUrlAsync(
            userId, projectId, "test.jpg", "image/jpeg", fileSizeBytes);

        Assert.NotNull(result);
    }

    [Fact]
    public async Task RequestUploadUrlAsync_FileSizeTooLarge_ErrorMessageIncludesMaxSizeMb()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();

        await SeedProjectWithOwner(projectId, ownerId, userId);

        // Act & Assert: kills line 62 arithmetic mutation (* → /)
        var exception = await Assert.ThrowsAsync<ArgumentException>(
            () => _fileService.RequestUploadUrlAsync(
                userId, projectId, "test.jpg", "image/jpeg", 51 * 1024 * 1024));

        Assert.Contains("50", exception.Message, StringComparison.InvariantCulture);
    }

    [Fact]
    public async Task RequestUploadUrlAsync_ProjectNotFound_ThrowsInvalidOperationException()
    {
        // Arrange: UserProject exists (so auth passes) but no Project entity
        // In-memory DB does not enforce FK constraints
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        _context.UserProjects.Add(new UserProject
        {
            UserId = userId,
            ProjectId = projectId,
            Role = ProjectRole.Owner
        });
        await _context.SaveChangesAsync();

        // Act & Assert: kills line 67 null-coalescing removal mutation
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => _fileService.RequestUploadUrlAsync(
                userId, projectId, "test.jpg", "image/jpeg", 1024));

        Assert.Contains("Project not found", exception.Message, StringComparison.InvariantCulture);
    }

    [Fact]
    public async Task RequestUploadUrlAsync_ProjectHasNoOwner_ThrowsInvalidOperationException()
    {
        // Arrange: project with only a Collaborator, no Owner
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        _context.Users.Add(new User { Id = userId, Email = "user@example.com", Name = "User" });
        _context.Projects.Add(new Project { Id = projectId, Name = "Test Project" });
        _context.UserProjects.Add(new UserProject
        {
            UserId = userId,
            ProjectId = projectId,
            Role = ProjectRole.Collaborator
        });
        await _context.SaveChangesAsync();

        // Act & Assert: kills line 71 null-coalescing removal mutation
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => _fileService.RequestUploadUrlAsync(
                userId, projectId, "test.jpg", "image/jpeg", 1024));

        Assert.Contains("Project has no owner", exception.Message, StringComparison.InvariantCulture);
    }

    [Fact]
    public async Task RequestUploadUrlAsync_ProjectOwnerUserNotFound_ThrowsInvalidOperationException()
    {
        // Arrange: Owner UserProject exists but no User entity for the owner ID
        var userId = Guid.NewGuid();
        var ownerId = Guid.NewGuid(); // intentionally not added to Users
        var projectId = Guid.NewGuid();
        _context.Users.Add(new User { Id = userId, Email = "user@example.com", Name = "User" });
        _context.Projects.Add(new Project { Id = projectId, Name = "Test Project" });
        _context.UserProjects.Add(new UserProject
        {
            UserId = ownerId,
            ProjectId = projectId,
            Role = ProjectRole.Owner
        });
        _context.UserProjects.Add(new UserProject
        {
            UserId = userId,
            ProjectId = projectId,
            Role = ProjectRole.Collaborator
        });
        await _context.SaveChangesAsync();

        // Act & Assert: kills line 75 null-coalescing removal mutation
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => _fileService.RequestUploadUrlAsync(
                userId, projectId, "test.jpg", "image/jpeg", 1024));

        Assert.Contains("Project owner not found", exception.Message, StringComparison.InvariantCulture);
    }

    [Fact]
    public async Task RequestUploadUrlAsync_ProjectedUsageExactlyAtQuota_Succeeds()
    {
        // Arrange: projected usage == quota (not strictly greater, so should succeed)
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        const int quotaMb = 10;
        var fileSizeBytes = quotaMb * 1024 * 1024; // exactly fills quota

        var owner = new User
        {
            Id = ownerId,
            Email = "owner@example.com",
            Name = "Owner",
            StorageQuotaMb = quotaMb,
            StorageUsedBytes = 0
        };
        _context.Users.Add(owner);
        _context.Users.Add(new User { Id = userId, Email = "user@example.com", Name = "User" });
        _context.Projects.Add(new Project { Id = projectId, Name = "Test Project" });
        _context.UserProjects.Add(new UserProject { UserId = ownerId, ProjectId = projectId, Role = ProjectRole.Owner });
        _context.UserProjects.Add(new UserProject { UserId = userId, ProjectId = projectId, Role = ProjectRole.Collaborator });
        await _context.SaveChangesAsync();

        // Act: kills line 80 > → >= boundary mutation
        var result = await _fileService.RequestUploadUrlAsync(
            userId, projectId, "test.jpg", "image/jpeg", fileSizeBytes);

        Assert.NotNull(result);
    }

    [Fact]
    public async Task RequestUploadUrlAsync_QuotaExceeded_ErrorMessageContainsCorrectAvailableMb()
    {
        // Arrange: 5MB quota, 3MB used → 2MB available; trying to upload 5MB
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        var owner = new User
        {
            Id = ownerId,
            Email = "owner@example.com",
            Name = "Owner",
            StorageQuotaMb = 5,
            StorageUsedBytes = 3 * 1024 * 1024
        };
        _context.Users.Add(owner);
        _context.Users.Add(new User { Id = userId, Email = "user@example.com", Name = "User" });
        _context.Projects.Add(new Project { Id = projectId, Name = "Test Project" });
        _context.UserProjects.Add(new UserProject { UserId = ownerId, ProjectId = projectId, Role = ProjectRole.Owner });
        _context.UserProjects.Add(new UserProject { UserId = userId, ProjectId = projectId, Role = ProjectRole.Collaborator });
        await _context.SaveChangesAsync();

        // Act & Assert: kills line 82 Math.Max → Math.Min and lines 83-84 arithmetic mutations
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => _fileService.RequestUploadUrlAsync(
                userId, projectId, "test.jpg", "image/jpeg", 5 * 1024 * 1024));

        // Math.Max(0, 5MB-3MB) = 2MB; Math.Min would give 0MB
        Assert.Contains("Available: 2.00MB", exception.Message, StringComparison.InvariantCulture);
        // 5MB required; arithmetic mutation would give wildly wrong value
        Assert.Contains("Required: 5.00MB", exception.Message, StringComparison.InvariantCulture);
    }

    [Fact]
    public async Task RequestUploadUrlAsync_RootFile_PathEqualsFileName()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        const string fileName = "test.jpg";

        await SeedProjectWithOwner(projectId, ownerId, userId);

        // Act
        var result = await _fileService.RequestUploadUrlAsync(
            userId, projectId, fileName, "image/jpeg", 1024);

        // Assert: use AsNoTracking to bypass change tracker, also killing line 135 SaveChanges removal
        var file = await _context.Files.AsNoTracking().FirstOrDefaultAsync(f => f.Id == result.FileId);
        Assert.NotNull(file);
        // Kills line 110 conditional mutations: false? always produces "/{fileName}", true? always produces fileName
        Assert.Equal(fileName, file.Path);
    }

    [Fact]
    public async Task RequestUploadUrlAsync_DuplicateFileName_AppendsCounterSuffix()
    {
        // Arrange: confirmed file "image.jpg" already exists at root
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();

        await SeedProjectWithOwner(projectId, ownerId, userId);

        var existingFile = new Domain.Entities.File
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            UploadedByUserId = userId,
            FileName = "image.jpg",
            Path = "image.jpg",
            ContentType = "image/jpeg",
            FileSizeBytes = 1024,
            StorageKey = $"{projectId}/{Guid.NewGuid()}/image.jpg",
            Status = FileStatus.Confirmed,
            UploadedAt = DateTime.UtcNow,
            Tags = []
        };
        _context.Files.Add(existingFile);
        await _context.SaveChangesAsync();

        // Act
        var result = await _fileService.RequestUploadUrlAsync(
            userId, projectId, "image.jpg", "image/jpeg", 1024);

        // Assert: kills lines 484-490 mutations in EnsureUniquePathAsync
        var newFile = await _context.Files.AsNoTracking().FirstOrDefaultAsync(f => f.Id == result.FileId);
        Assert.NotNull(newFile);
        Assert.Equal("image (1).jpg", newFile.FileName);
        Assert.Equal("image (1).jpg", newFile.Path);
    }

    [Fact]
    public async Task RequestUploadUrlAsync_ExactlyMaxTagCount_Succeeds()
    {
        // Arrange: exactly 20 tags (the limit)
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        var tags = Enumerable.Range(1, 20).Select(i => $"tag{i}").ToList();

        await SeedProjectWithOwner(projectId, ownerId, userId);

        // Act: kills line 512 > → >= boundary mutation (20 tags is NOT > 20)
        var result = await _fileService.RequestUploadUrlAsync(
            userId, projectId, "test.jpg", "image/jpeg", 1024, tags);

        Assert.NotNull(result);
    }

    [Fact]
    public async Task RequestUploadUrlAsync_TagAtExactMaxLength_Succeeds()
    {
        // Arrange: tag with exactly 50 characters (the limit)
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        var maxLengthTag = new string('a', 50);
        var tags = new List<string> { maxLengthTag };

        await SeedProjectWithOwner(projectId, ownerId, userId);

        // Act: kills line 519 > → >= boundary mutation (50 chars is NOT > 50)
        var result = await _fileService.RequestUploadUrlAsync(
            userId, projectId, "test.jpg", "image/jpeg", 1024, tags);

        Assert.NotNull(result);
    }

    #endregion

    #region GetProjectFilesAsync Tests

    [Fact]
    public async Task GetProjectFilesAsync_WithoutFilters_ReturnsAllConfirmedFiles()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();

        await SeedProjectWithOwner(projectId, ownerId, userId);

        var file1 = CreateConfirmedFile(projectId, userId, "file1.jpg");
        var file2 = CreateConfirmedFile(projectId, userId, "file2.jpg");
        var pendingFile = CreatePendingFile(projectId, userId, "pending.jpg");
        _context.Files.AddRange(file1, file2, pendingFile);
        await _context.SaveChangesAsync();

        // Act
        var result = await _fileService.GetProjectFilesAsync(userId, projectId);

        // Assert
        Assert.Equal(2, result.Count);
        Assert.Contains(result, f => f.FileName == "file1.jpg");
        Assert.Contains(result, f => f.FileName == "file2.jpg");
        Assert.DoesNotContain(result, f => f.FileName == "pending.jpg");
    }

    [Fact(Skip = "InMemory provider doesn't support this LINQ query pattern with nested collections")]
    public async Task GetProjectFilesAsync_WithOrTagFilter_ReturnsMatchingFiles()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();

        await SeedProjectWithOwner(projectId, ownerId, userId);

        var file1 = CreateConfirmedFile(projectId, userId, "file1.jpg", ["character", "hero"]);
        var file2 = CreateConfirmedFile(projectId, userId, "file2.jpg", ["background"]);
        var file3 = CreateConfirmedFile(projectId, userId, "file3.jpg", ["character", "villain"]);
        _context.Files.AddRange(file1, file2, file3);
        await _context.SaveChangesAsync();

        // Act - Filter for "character" OR "background"
        var result = await _fileService.GetProjectFilesAsync(
            userId, projectId, ["character", "background"], useAndLogic: false);

        // Assert - Should return all three files (all have either character OR background)
        Assert.Equal(3, result.Count);
    }

    [Fact(Skip = "InMemory provider doesn't support this LINQ query pattern with nested collections")]
    public async Task GetProjectFilesAsync_WithAndTagFilter_ReturnsMatchingFiles()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();

        await SeedProjectWithOwner(projectId, ownerId, userId);

        var file1 = CreateConfirmedFile(projectId, userId, "file1.jpg", ["character", "hero"]);
        var file2 = CreateConfirmedFile(projectId, userId, "file2.jpg", ["character"]);
        var file3 = CreateConfirmedFile(projectId, userId, "file3.jpg", ["character", "hero", "main"]);
        _context.Files.AddRange(file1, file2, file3);
        await _context.SaveChangesAsync();

        // Act - Filter for "character" AND "hero"
        var result = await _fileService.GetProjectFilesAsync(
            userId, projectId, ["character", "hero"], useAndLogic: true);

        // Assert - Should return only file1 and file3 (both have character AND hero)
        Assert.Equal(2, result.Count);
        Assert.Contains(result, f => f.FileName == "file1.jpg");
        Assert.Contains(result, f => f.FileName == "file3.jpg");
    }

    [Fact]
    public async Task GetProjectFilesAsync_NoAccess_ReturnsEmptyList()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();

        // Act - User has no access to project
        var result = await _fileService.GetProjectFilesAsync(userId, projectId);

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetProjectFilesAsync_NoAccess_WithFilesInProject_ReturnsEmptyList()
    {
        // Arrange: project has files, but the requesting user has no UserProject entry
        var ownerId = Guid.NewGuid();
        var unauthorizedUserId = Guid.NewGuid();
        var projectId = Guid.NewGuid();

        _context.Users.Add(new User { Id = ownerId, Email = "owner@example.com", Name = "Owner" });
        _context.Projects.Add(new Project { Id = projectId, Name = "Test Project" });
        _context.UserProjects.Add(new UserProject { UserId = ownerId, ProjectId = projectId, Role = ProjectRole.Owner });
        _context.Files.Add(CreateConfirmedFile(projectId, ownerId, "file.jpg"));
        await _context.SaveChangesAsync();

        // Act: kills line 217 block-removal mutation (which would allow returning files to unauthorized users)
        var result = await _fileService.GetProjectFilesAsync(unauthorizedUserId, projectId);

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetProjectFilesAsync_ReturnsFilesInDescendingDateOrder()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();

        await SeedProjectWithOwner(projectId, ownerId, userId);

        var oldFile = CreateConfirmedFile(projectId, userId, "old.jpg");
        oldFile.UploadedAt = DateTime.UtcNow.AddDays(-2);
        var middleFile = CreateConfirmedFile(projectId, userId, "middle.jpg");
        middleFile.UploadedAt = DateTime.UtcNow.AddDays(-1);
        var newFile = CreateConfirmedFile(projectId, userId, "new.jpg");
        newFile.UploadedAt = DateTime.UtcNow;
        _context.Files.AddRange(oldFile, middleFile, newFile);
        await _context.SaveChangesAsync();

        // Act
        var result = await _fileService.GetProjectFilesAsync(userId, projectId);

        // Assert: kills line 252 OrderByDescending → OrderBy mutation
        Assert.Equal(3, result.Count);
        Assert.Equal("new.jpg", result[0].FileName);
        Assert.Equal("middle.jpg", result[1].FileName);
        Assert.Equal("old.jpg", result[2].FileName);
    }

    [Fact]
    public async Task GetProjectFilesAsync_DirectoryIdNotSpecified_ReturnsAllFiles()
    {
        // Arrange: files with and without a directoryId
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        var fakeDirectoryId = Guid.NewGuid();

        await SeedProjectWithOwner(projectId, ownerId, userId);

        var rootFile = CreateConfirmedFile(projectId, userId, "root.jpg");
        rootFile.DirectoryId = null;
        var dirFile = CreateConfirmedFile(projectId, userId, "dir.jpg");
        dirFile.DirectoryId = fakeDirectoryId;
        _context.Files.AddRange(rootFile, dirFile);
        await _context.SaveChangesAsync();

        // Act: directoryIdSpecified=false means no directory filter → return all
        var result = await _fileService.GetProjectFilesAsync(
            userId, projectId, directoryIdSpecified: false);

        // Assert: kills line 227 negate mutation (which would filter when NOT specified)
        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetProjectFilesAsync_DirectoryIdSpecifiedAsNull_ReturnsOnlyRootFiles()
    {
        // Arrange: files with and without a directoryId
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        var fakeDirectoryId = Guid.NewGuid();

        await SeedProjectWithOwner(projectId, ownerId, userId);

        var rootFile = CreateConfirmedFile(projectId, userId, "root.jpg");
        rootFile.DirectoryId = null;
        var dirFile = CreateConfirmedFile(projectId, userId, "dir.jpg");
        dirFile.DirectoryId = fakeDirectoryId;
        _context.Files.AddRange(rootFile, dirFile);
        await _context.SaveChangesAsync();

        // Act: directoryIdSpecified=true, directoryId=null means root-only filter
        var result = await _fileService.GetProjectFilesAsync(
            userId, projectId, directoryId: null, directoryIdSpecified: true);

        // Assert: only root-level files are returned
        Assert.Single(result);
        Assert.Equal("root.jpg", result[0].FileName);
    }

    #endregion

    #region GetUserQuotaAsync Tests

    [Fact]
    public async Task GetUserQuotaAsync_ValidUser_ReturnsQuotaInfo()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            Email = "user@example.com",
            Name = "User",
            StorageQuotaMb = 100, // 100MB quota
            StorageUsedBytes = 50 * 1024 * 1024 // 50MB used
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Act
        var result = await _fileService.GetUserQuotaAsync(userId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(100, result.QuotaMb);
        Assert.Equal(50 * 1024 * 1024, result.UsedBytes);
        Assert.Equal(50 * 1024 * 1024, result.AvailableBytes);
        Assert.Equal(50.0, result.UsedPercentage);
    }

    [Fact]
    public async Task GetUserQuotaAsync_UserNotFound_ThrowsInvalidOperationException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act & Assert
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => _fileService.GetUserQuotaAsync(userId));

        Assert.Contains("User not found", exception.Message, StringComparison.InvariantCulture);
    }

    [Fact]
    public async Task GetUserQuotaAsync_ZeroQuota_ReturnsZeroUsedPercentage()
    {
        // Arrange: user with 0MB quota
        var userId = Guid.NewGuid();
        _context.Users.Add(new User
        {
            Id = userId,
            Email = "user@example.com",
            Name = "User",
            StorageQuotaMb = 0,
            StorageUsedBytes = 0
        });
        await _context.SaveChangesAsync();

        // Act
        var result = await _fileService.GetUserQuotaAsync(userId);

        // Assert: kills line 342 quotaBytes > 0 → >= 0 mutation
        // With >= 0, quotaBytes == 0 satisfies condition and causes 0/0 → NaN
        Assert.Equal(0, result.QuotaMb);
        Assert.Equal(0.0, result.UsedPercentage);
    }

    #endregion

    #region UpdateFileTagsAsync Tests

    [Fact]
    public async Task UpdateFileTagsAsync_ValidTags_UpdatesFileTags()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        var fileId = Guid.NewGuid();

        await SeedProjectWithOwner(projectId, ownerId, userId);

        var file = CreateConfirmedFile(projectId, userId, "test.jpg", ["old-tag"]);
        file.Id = fileId;
        _context.Files.Add(file);
        await _context.SaveChangesAsync();

        var newTags = new List<string> { "new-tag-1", "new-tag-2" };

        // Act
        var result = await _fileService.UpdateFileTagsAsync(userId, fileId, newTags);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.Tags.Count);
        Assert.Contains("new-tag-1", result.Tags);
        Assert.Contains("new-tag-2", result.Tags);
        Assert.DoesNotContain("old-tag", result.Tags);
    }

    [Fact]
    public async Task UpdateFileTagsAsync_NormalizesTags_ConvertsToLowercase()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        var fileId = Guid.NewGuid();

        await SeedProjectWithOwner(projectId, ownerId, userId);

        var file = CreateConfirmedFile(projectId, userId, "test.jpg");
        file.Id = fileId;
        _context.Files.Add(file);
        await _context.SaveChangesAsync();

        var newTags = new List<string> { "  UPPERCASE  ", "MixedCase", "lowercase" };

        // Act
        var result = await _fileService.UpdateFileTagsAsync(userId, fileId, newTags);

        // Assert
        Assert.Equal(3, result.Tags.Count);
        Assert.Contains("uppercase", result.Tags);
        Assert.Contains("mixedcase", result.Tags);
        Assert.Contains("lowercase", result.Tags);
    }

    [Fact]
    public async Task UpdateFileTagsAsync_RemovesDuplicates_KeepsUniqueTags()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        var fileId = Guid.NewGuid();

        await SeedProjectWithOwner(projectId, ownerId, userId);

        var file = CreateConfirmedFile(projectId, userId, "test.jpg");
        file.Id = fileId;
        _context.Files.Add(file);
        await _context.SaveChangesAsync();

        var newTags = new List<string> { "tag1", "tag2", "tag1", "TAG1" };

        // Act
        var result = await _fileService.UpdateFileTagsAsync(userId, fileId, newTags);

        // Assert
        Assert.Equal(2, result.Tags.Count);
        Assert.Contains("tag1", result.Tags);
        Assert.Contains("tag2", result.Tags);
    }

    #endregion

    [Fact]
    public async Task UpdateFileTagsAsync_FileNotFound_ThrowsInvalidOperationException()
    {
        // Arrange: seed confirmed files so the || mutation would return a wrong file
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();

        await SeedProjectWithOwner(projectId, ownerId, userId);
        _context.Files.Add(CreateConfirmedFile(projectId, userId, "existing.jpg"));
        await _context.SaveChangesAsync();

        // Act & Assert: kills line 357 null-coalescing removal mutation
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => _fileService.UpdateFileTagsAsync(userId, Guid.NewGuid(), ["tag1"]));

        Assert.Contains("File not found", exception.Message, StringComparison.InvariantCulture);
    }

    [Fact]
    public async Task UpdateFileTagsAsync_PendingFile_ThrowsInvalidOperationException()
    {
        // Arrange: file exists but is Pending, not Confirmed
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();

        await SeedProjectWithOwner(projectId, ownerId, userId);
        var pendingFile = CreatePendingFile(projectId, userId, "pending.jpg");
        _context.Files.Add(pendingFile);
        await _context.SaveChangesAsync();

        // Act & Assert: kills line 359 && → || mutation
        // With || mutation, f.Id == fileId would match the pending file
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => _fileService.UpdateFileTagsAsync(userId, pendingFile.Id, ["tag1"]));

        Assert.Contains("File not found", exception.Message, StringComparison.InvariantCulture);
    }

    [Fact]
    public async Task UpdateFileTagsAsync_UnauthorizedUser_ThrowsUnauthorizedAccessException()
    {
        // Arrange: file exists but requesting user has no project access
        var ownerId = Guid.NewGuid();
        var unauthorizedUserId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var fileId = Guid.NewGuid();

        _context.Users.Add(new User { Id = ownerId, Email = "owner@example.com", Name = "Owner" });
        _context.Projects.Add(new Project { Id = projectId, Name = "Test Project" });
        _context.UserProjects.Add(new UserProject { UserId = ownerId, ProjectId = projectId, Role = ProjectRole.Owner });
        var file = CreateConfirmedFile(projectId, ownerId, "test.jpg");
        file.Id = fileId;
        _context.Files.Add(file);
        await _context.SaveChangesAsync();

        // Act & Assert: kills line 362 auth-check statement-removal mutation
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _fileService.UpdateFileTagsAsync(unauthorizedUserId, fileId, ["tag1"]));
    }

    [Fact]
    public async Task UpdateFileTagsAsync_InvalidTagCharacters_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        var fileId = Guid.NewGuid();

        await SeedProjectWithOwner(projectId, ownerId, userId);
        var file = CreateConfirmedFile(projectId, userId, "test.jpg");
        file.Id = fileId;
        _context.Files.Add(file);
        await _context.SaveChangesAsync();

        // Act & Assert: kills line 365 ValidateTags statement-removal mutation
        var exception = await Assert.ThrowsAsync<ArgumentException>(
            () => _fileService.UpdateFileTagsAsync(userId, fileId, ["invalid tag with spaces"]));

        Assert.Contains("invalid characters", exception.Message, StringComparison.InvariantCulture);
    }

    [Fact]
    public async Task UpdateFileTagsAsync_PersistsToDatabaseBeyondChangeTracker()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        var fileId = Guid.NewGuid();

        await SeedProjectWithOwner(projectId, ownerId, userId);
        var file = CreateConfirmedFile(projectId, userId, "test.jpg");
        file.Id = fileId;
        _context.Files.Add(file);
        await _context.SaveChangesAsync();

        // Act
        await _fileService.UpdateFileTagsAsync(userId, fileId, ["persisted-tag"]);

        // Assert: clear change tracker then query to verify data was actually saved to the store
        // Kills line 373 SaveChangesAsync statement-removal mutation
        _context.ChangeTracker.Clear();
        var updated = await _context.Files.AsNoTracking().FirstOrDefaultAsync(f => f.Id == fileId);
        Assert.NotNull(updated);
        Assert.Contains("persisted-tag", updated.Tags);
    }

    #region GetProjectTagsAsync Tests

    [Fact]
    public async Task GetProjectTagsAsync_ReturnsDistinctSortedTags()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();

        await SeedProjectWithOwner(projectId, ownerId, userId);

        var file1 = CreateConfirmedFile(projectId, userId, "file1.jpg", ["zebra", "apple"]);
        var file2 = CreateConfirmedFile(projectId, userId, "file2.jpg", ["banana", "apple"]);
        var file3 = CreateConfirmedFile(projectId, userId, "file3.jpg", ["cherry"]);
        _context.Files.AddRange(file1, file2, file3);
        await _context.SaveChangesAsync();

        // Act
        var result = await _fileService.GetProjectTagsAsync(userId, projectId);

        // Assert
        Assert.Equal(4, result.Count);
        Assert.Equal("apple", result[0]); // Alphabetically sorted
        Assert.Equal("banana", result[1]);
        Assert.Equal("cherry", result[2]);
        Assert.Equal("zebra", result[3]);
    }

    [Fact]
    public async Task GetProjectTagsAsync_NoAccess_ReturnsEmptyList()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();

        // Act - User has no access to project
        var result = await _fileService.GetProjectTagsAsync(userId, projectId);

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetProjectTagsAsync_ExcludesPendingFileTags()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();

        await SeedProjectWithOwner(projectId, ownerId, userId);

        var confirmedFile = CreateConfirmedFile(projectId, userId, "confirmed.jpg", ["confirmed-tag"]);
        var pendingFile = CreatePendingFile(projectId, userId, "pending.jpg");
        pendingFile.Tags = ["pending-tag"];
        _context.Files.AddRange(confirmedFile, pendingFile);
        await _context.SaveChangesAsync();

        // Act
        var result = await _fileService.GetProjectTagsAsync(userId, projectId);

        // Assert: kills line 390 && → || mutation (pending file tags would be included with || mutation)
        Assert.Single(result);
        Assert.Contains("confirmed-tag", result);
        Assert.DoesNotContain("pending-tag", result);
    }

    [Fact]
    public async Task GetProjectTagsAsync_ExcludesTagsFromOtherProjects()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var project1Id = Guid.NewGuid();
        var project2Id = Guid.NewGuid();
        var owner1Id = Guid.NewGuid();
        var owner2Id = Guid.NewGuid();

        await SeedProjectWithOwner(project1Id, owner1Id, userId);

        // Second project the user also has access to
        var owner2 = new User { Id = owner2Id, Email = "owner2@example.com", Name = "Owner2" };
        _context.Users.Add(owner2);
        _context.Projects.Add(new Project { Id = project2Id, Name = "Project 2" });
        _context.UserProjects.Add(new UserProject { UserId = owner2Id, ProjectId = project2Id, Role = ProjectRole.Owner });
        _context.UserProjects.Add(new UserProject { UserId = userId, ProjectId = project2Id, Role = ProjectRole.Collaborator });

        var file1 = CreateConfirmedFile(project1Id, userId, "file1.jpg", ["project1-tag"]);
        var file2 = CreateConfirmedFile(project2Id, owner2Id, "file2.jpg", ["project2-tag"]);
        _context.Files.AddRange(file1, file2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _fileService.GetProjectTagsAsync(userId, project1Id);

        // Assert: kills line 390 f.ProjectId == projectId mutation (|| would include project2's tags)
        Assert.Single(result);
        Assert.Contains("project1-tag", result);
        Assert.DoesNotContain("project2-tag", result);
    }

    #endregion

    #region Helper Methods

    private async Task<User> SeedProjectWithOwner(Guid projectId, Guid ownerId, Guid? memberId = null)
    {
        var owner = new User
        {
            Id = ownerId,
            Email = "owner@example.com",
            Name = "Owner",
            StorageQuotaMb = 1000, // 1GB quota
            StorageUsedBytes = 0
        };
        _context.Users.Add(owner);

        var project = new Project
        {
            Id = projectId,
            Name = "Test Project"
        };
        _context.Projects.Add(project);

        _context.UserProjects.Add(new UserProject
        {
            UserId = ownerId,
            ProjectId = projectId,
            Role = ProjectRole.Owner
        });

        if (memberId.HasValue && memberId != ownerId)
        {
            var member = new User
            {
                Id = memberId.Value,
                Email = "member@example.com",
                Name = "Member",
                StorageQuotaMb = 100,
                StorageUsedBytes = 0
            };
            _context.Users.Add(member);

            _context.UserProjects.Add(new UserProject
            {
                UserId = memberId.Value,
                ProjectId = projectId,
                Role = ProjectRole.Collaborator
            });
        }

        await _context.SaveChangesAsync();
        return owner;
    }

    private Domain.Entities.File CreateConfirmedFile(Guid projectId, Guid uploadedBy, string fileName, string[]? tags = null)
    {
        return new Domain.Entities.File
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            UploadedByUserId = uploadedBy,
            FileName = fileName,
            ContentType = "image/jpeg",
            FileSizeBytes = 1024,
            StorageKey = $"{projectId}/{Guid.NewGuid()}/{fileName}",
            Status = FileStatus.Confirmed,
            UploadedAt = DateTime.UtcNow,
            Tags = tags?.ToList() ?? []
        };
    }

    private Domain.Entities.File CreatePendingFile(Guid projectId, Guid uploadedBy, string fileName)
    {
        return new Domain.Entities.File
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            UploadedByUserId = uploadedBy,
            FileName = fileName,
            ContentType = "image/jpeg",
            FileSizeBytes = 1024,
            StorageKey = $"{projectId}/{Guid.NewGuid()}/{fileName}",
            Status = FileStatus.Pending,
            UploadedAt = DateTime.UtcNow,
            Tags = []
        };
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
                _r2Service.Dispose();
            }

            _disposed = true;
        }
    }
}
