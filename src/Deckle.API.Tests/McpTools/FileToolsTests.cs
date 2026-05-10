using System.Security.Claims;
using System.Text.Json;
using Deckle.API.McpTools;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Moq;
using File = Deckle.Domain.Entities.File;

namespace Deckle.API.Tests.McpTools;

public class FileToolsTests : IDisposable
{
    private bool _disposed;
    private readonly AppDbContext _context;

    public FileToolsTests()
    {
        _context = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);
    }

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
                _context.Dispose();
            _disposed = true;
        }
    }

    private FileTools CreateTools(Guid userId) => new(_context, CreateAccessor(userId));

    private static IHttpContextAccessor CreateAccessor(Guid userId)
    {
        var claims = new ClaimsPrincipal(new ClaimsIdentity([new Claim("user_id", userId.ToString())]));
        var ctx = new DefaultHttpContext { User = claims };
        var mock = new Mock<IHttpContextAccessor>();
        mock.Setup(a => a.HttpContext).Returns(ctx);
        return mock.Object;
    }

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

    private async Task<File> SeedFile(
        Guid projectId,
        Guid uploadedById,
        string fileName = "test.png",
        string path = "images/test.png",
        FileStatus status = FileStatus.Confirmed,
        List<string>? tags = null)
    {
        var file = new File
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            UploadedByUserId = uploadedById,
            FileName = fileName,
            Path = path,
            ContentType = "image/png",
            TotalByteSize = 1024,
            StorageKey = path,
            Status = status,
            Tags = tags ?? [],
            UploadedAt = DateTime.UtcNow
        };
        _context.Files.Add(file);
        await _context.SaveChangesAsync();
        return file;
    }

    private async Task<FileDirectory> SeedDirectory(Guid projectId, string name = "Images")
    {
        var dir = new FileDirectory
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = name,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.FileDirectories.Add(dir);
        await _context.SaveChangesAsync();
        return dir;
    }

    #region ListFiles

    [Fact]
    public async Task ListFiles_ConfirmedFiles_ReturnsAll()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        await SeedFile(projectId, userId, "a.png", "a.png");
        await SeedFile(projectId, userId, "b.png", "b.png");

        var result = await CreateTools(userId).ListFiles(projectId);

        Assert.Equal(2, JsonSerializer.Deserialize<JsonElement[]>(result)!.Length);
    }

    [Fact]
    public async Task ListFiles_ExcludesPendingFiles()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        await SeedFile(projectId, userId, status: FileStatus.Confirmed);
        await SeedFile(projectId, userId, "pending.png", "pending.png", FileStatus.Pending);

        var result = await CreateTools(userId).ListFiles(projectId);

        Assert.Single(JsonSerializer.Deserialize<JsonElement[]>(result)!);
    }

    [Fact]
    public async Task ListFiles_TagFilter_ReturnsOnlyMatchingFiles()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        await SeedFile(projectId, userId, "card.png", "card.png", tags: ["card", "art"]);
        await SeedFile(projectId, userId, "token.png", "token.png", tags: ["token"]);

        var result = await CreateTools(userId).ListFiles(projectId, "card");

        var files = JsonSerializer.Deserialize<JsonElement[]>(result)!;
        Assert.Single(files);
        Assert.Equal("card.png", files[0].GetProperty("FileName").GetString());
    }

    [Fact]
    public async Task ListFiles_NoMatchingTag_ReturnsEmpty()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        await SeedFile(projectId, userId, tags: ["art"]);

        var result = await CreateTools(userId).ListFiles(projectId, "missing-tag");

        Assert.Empty(JsonSerializer.Deserialize<JsonElement[]>(result)!);
    }

    [Fact]
    public async Task ListFiles_NoAccess_ReturnsError()
    {
        var (_, projectId) = await SeedOwnerWithProject();

        var result = await CreateTools(Guid.NewGuid()).ListFiles(projectId);

        Assert.Equal(McpErrors.ProjectNotFound, result);
    }

    [Fact]
    public async Task ListFiles_OrderedByPath()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        await SeedFile(projectId, userId, "z.png", "z/z.png");
        await SeedFile(projectId, userId, "a.png", "a/a.png");

        var result = await CreateTools(userId).ListFiles(projectId);

        var files = JsonSerializer.Deserialize<JsonElement[]>(result)!;
        Assert.Equal("a/a.png", files[0].GetProperty("Path").GetString());
        Assert.Equal("z/z.png", files[1].GetProperty("Path").GetString());
    }

    #endregion

    #region ListDirectories

    [Fact]
    public async Task ListDirectories_ProjectWithDirs_ReturnsAll()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        await SeedDirectory(projectId, "Images");
        await SeedDirectory(projectId, "Tokens");

        var result = await CreateTools(userId).ListDirectories(projectId);

        Assert.Equal(2, JsonSerializer.Deserialize<JsonElement[]>(result)!.Length);
    }

    [Fact]
    public async Task ListDirectories_NoDirs_ReturnsEmpty()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        var result = await CreateTools(userId).ListDirectories(projectId);

        Assert.Empty(JsonSerializer.Deserialize<JsonElement[]>(result)!);
    }

    [Fact]
    public async Task ListDirectories_NoAccess_ReturnsError()
    {
        var (_, projectId) = await SeedOwnerWithProject();

        var result = await CreateTools(Guid.NewGuid()).ListDirectories(projectId);

        Assert.Equal(McpErrors.ProjectNotFound, result);
    }

    [Fact]
    public async Task ListDirectories_OrderedByName()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        await SeedDirectory(projectId, "Zebra");
        await SeedDirectory(projectId, "Alpha");

        var result = await CreateTools(userId).ListDirectories(projectId);

        var dirs = JsonSerializer.Deserialize<JsonElement[]>(result)!;
        Assert.Equal("Alpha", dirs[0].GetProperty("Name").GetString());
        Assert.Equal("Zebra", dirs[1].GetProperty("Name").GetString());
    }

    #endregion

    #region ListFileTags

    [Fact]
    public async Task ListFileTags_ReturnsDistinctSortedTags()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        await SeedFile(projectId, userId, "a.png", "a.png", tags: ["zebra", "art"]);
        await SeedFile(projectId, userId, "b.png", "b.png", tags: ["art", "card"]);

        var result = await CreateTools(userId).ListFileTags(projectId);

        var tags = JsonSerializer.Deserialize<string[]>(result)!;
        Assert.Equal(["art", "card", "zebra"], tags);
    }

    [Fact]
    public async Task ListFileTags_ExcludesPendingFileTags()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        await SeedFile(projectId, userId, status: FileStatus.Confirmed, tags: ["confirmed-tag"]);
        await SeedFile(projectId, userId, "p.png", "p.png", FileStatus.Pending, tags: ["pending-tag"]);

        var result = await CreateTools(userId).ListFileTags(projectId);

        var tags = JsonSerializer.Deserialize<string[]>(result)!;
        Assert.Contains("confirmed-tag", tags);
        Assert.DoesNotContain("pending-tag", tags);
    }

    [Fact]
    public async Task ListFileTags_NoFiles_ReturnsEmpty()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        var result = await CreateTools(userId).ListFileTags(projectId);

        Assert.Empty(JsonSerializer.Deserialize<string[]>(result)!);
    }

    [Fact]
    public async Task ListFileTags_NoAccess_ReturnsError()
    {
        var (_, projectId) = await SeedOwnerWithProject();

        var result = await CreateTools(Guid.NewGuid()).ListFileTags(projectId);

        Assert.Equal(McpErrors.ProjectNotFound, result);
    }

    #endregion
}
