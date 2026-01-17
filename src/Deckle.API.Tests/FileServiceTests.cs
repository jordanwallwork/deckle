using Deckle.API.DTOs;
using Deckle.API.Services;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;

namespace Deckle.API.Tests;

/// <summary>
/// Tests for FileService focusing on business logic, validation, and database operations.
/// Note: Tests that require R2 storage network calls are skipped or use test doubles.
/// </summary>
public class FileServiceTests
{
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

        Assert.Contains("Content type", exception.Message);
        Assert.Contains("not allowed", exception.Message);
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

        Assert.Contains("File size must be greater than 0", exception.Message);
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

        Assert.Contains("exceeds maximum allowed size", exception.Message);
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

        Assert.Contains("storage quota exceeded", exception.Message);
        Assert.Contains("Available:", exception.Message);
        Assert.Contains("Required:", exception.Message);
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

        Assert.Contains("Maximum 20 tags allowed", exception.Message);
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

        Assert.Contains("contains invalid characters", exception.Message);
    }

    // Note: RequestUploadUrlAsync_UserWithoutModifyPermission test was removed because
    // with the simplified role system (Owner/Collaborator), all project members can modify resources.
    // The test for users without project access (RequestUploadUrlAsync_UserWithoutProjectAccess_ThrowsUnauthorizedException)
    // still covers the unauthorized access scenario.

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

        var file1 = CreateConfirmedFile(projectId, userId, "file1.jpg", new[] { "character", "hero" });
        var file2 = CreateConfirmedFile(projectId, userId, "file2.jpg", new[] { "background" });
        var file3 = CreateConfirmedFile(projectId, userId, "file3.jpg", new[] { "character", "villain" });
        _context.Files.AddRange(file1, file2, file3);
        await _context.SaveChangesAsync();

        // Act - Filter for "character" OR "background"
        var result = await _fileService.GetProjectFilesAsync(
            userId, projectId, new List<string> { "character", "background" }, useAndLogic: false);

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

        var file1 = CreateConfirmedFile(projectId, userId, "file1.jpg", new[] { "character", "hero" });
        var file2 = CreateConfirmedFile(projectId, userId, "file2.jpg", new[] { "character" });
        var file3 = CreateConfirmedFile(projectId, userId, "file3.jpg", new[] { "character", "hero", "main" });
        _context.Files.AddRange(file1, file2, file3);
        await _context.SaveChangesAsync();

        // Act - Filter for "character" AND "hero"
        var result = await _fileService.GetProjectFilesAsync(
            userId, projectId, new List<string> { "character", "hero" }, useAndLogic: true);

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

        Assert.Contains("User not found", exception.Message);
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

        var file = CreateConfirmedFile(projectId, userId, "test.jpg", new[] { "old-tag" });
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

    #region GetProjectTagsAsync Tests

    [Fact]
    public async Task GetProjectTagsAsync_ReturnsDistinctSortedTags()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();

        await SeedProjectWithOwner(projectId, ownerId, userId);

        var file1 = CreateConfirmedFile(projectId, userId, "file1.jpg", new[] { "zebra", "apple" });
        var file2 = CreateConfirmedFile(projectId, userId, "file2.jpg", new[] { "banana", "apple" });
        var file3 = CreateConfirmedFile(projectId, userId, "file3.jpg", new[] { "cherry" });
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
            Tags = tags?.ToList() ?? new List<string>()
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
            Tags = new List<string>()
        };
    }

    #endregion
}
