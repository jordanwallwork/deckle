using System.Security.Claims;
using System.Text.Json;
using Deckle.API.McpTools;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace Deckle.API.Tests.McpTools;

public class ProjectToolsTests : IDisposable
{
    private bool _disposed;
    private readonly AppDbContext _context;

    public ProjectToolsTests()
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

    private ProjectTools CreateTools(Guid userId) => new(_context, CreateAccessor(userId));

    private static IHttpContextAccessor CreateAccessor(Guid userId)
    {
        var claims = new ClaimsPrincipal(new ClaimsIdentity([new Claim("user_id", userId.ToString())]));
        var ctx = new DefaultHttpContext { User = claims };
        var mock = new Mock<IHttpContextAccessor>();
        mock.Setup(a => a.HttpContext).Returns(ctx);
        return mock.Object;
    }

    private async Task<Guid> SeedUser(string username = "testuser")
    {
        var userId = Guid.NewGuid();
        _context.Users.Add(new User
        {
            Id = userId,
            Email = $"{userId}@test.com",
            Username = username,
            GoogleId = Guid.NewGuid().ToString(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();
        return userId;
    }

    private async Task<(Guid userId, Guid projectId)> SeedOwnerWithProject(
        string projectName = "Test Project",
        string code = "test-project",
        string username = "testuser")
    {
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        _context.Users.Add(new User { Id = userId, Email = $"{userId}@test.com", Username = username, GoogleId = Guid.NewGuid().ToString(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        _context.Projects.Add(new Project { Id = projectId, Name = projectName, Code = code, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        _context.UserProjects.Add(new UserProject { UserId = userId, ProjectId = projectId, Role = ProjectRole.Owner, JoinedAt = DateTime.UtcNow });
        await _context.SaveChangesAsync();
        return (userId, projectId);
    }

    #region ListProjects

    [Fact]
    public async Task ListProjects_UserWithProjects_ReturnsProjectList()
    {
        var (userId, _) = await SeedOwnerWithProject("My Game");

        var result = await CreateTools(userId).ListProjects();

        var list = JsonSerializer.Deserialize<JsonElement[]>(result)!;
        Assert.Single(list);
        Assert.Equal("My Game", list[0].GetProperty("Name").GetString());
    }

    [Fact]
    public async Task ListProjects_UserWithNoProjects_ReturnsEmptyArray()
    {
        var result = await CreateTools(Guid.NewGuid()).ListProjects();

        var list = JsonSerializer.Deserialize<JsonElement[]>(result)!;
        Assert.Empty(list);
    }

    [Fact]
    public async Task ListProjects_IncludesOwnerUsernameAndRole()
    {
        var (userId, _) = await SeedOwnerWithProject(username: "jsmith");

        var result = await CreateTools(userId).ListProjects();

        var list = JsonSerializer.Deserialize<JsonElement[]>(result)!;
        Assert.Equal("jsmith", list[0].GetProperty("OwnerUsername").GetString());
        Assert.Equal("Owner", list[0].GetProperty("Role").GetString());
    }

    [Fact]
    public async Task ListProjects_DoesNotReturnOtherUsersProjects()
    {
        await SeedOwnerWithProject("Other Game");
        var myUserId = await SeedUser("me");

        var result = await CreateTools(myUserId).ListProjects();

        var list = JsonSerializer.Deserialize<JsonElement[]>(result)!;
        Assert.Empty(list);
    }

    #endregion

    #region GetProject

    [Fact]
    public async Task GetProject_MemberProject_ReturnsProjectJson()
    {
        var (userId, projectId) = await SeedOwnerWithProject("Board Game");

        var result = await CreateTools(userId).GetProject(projectId);

        var obj = JsonSerializer.Deserialize<JsonElement>(result);
        Assert.Equal("Board Game", obj.GetProperty("Name").GetString());
        Assert.Equal(projectId, obj.GetProperty("Id").GetGuid());
    }

    [Fact]
    public async Task GetProject_NonMember_ReturnsNotFoundError()
    {
        var (_, projectId) = await SeedOwnerWithProject();

        var result = await CreateTools(Guid.NewGuid()).GetProject(projectId);

        Assert.Equal(McpErrors.ProjectNotFound, result);
    }

    [Fact]
    public async Task GetProject_UnknownProjectId_ReturnsNotFoundError()
    {
        var userId = await SeedUser();

        var result = await CreateTools(userId).GetProject(Guid.NewGuid());

        Assert.Equal(McpErrors.ProjectNotFound, result);
    }

    #endregion

    #region CreateProject

    [Fact]
    public async Task CreateProject_ValidInput_PersistsProject()
    {
        var userId = await SeedUser();

        await CreateTools(userId).CreateProject("New Game", "new-game", "A description");

        _context.ChangeTracker.Clear();
        var project = await _context.Projects.FirstOrDefaultAsync(p => p.Name == "New Game");
        Assert.NotNull(project);
        Assert.Equal("new-game", project.Code);
        Assert.Equal("A description", project.Description);
    }

    [Fact]
    public async Task CreateProject_CreatesOwnerUserProject()
    {
        var userId = await SeedUser();

        var result = await CreateTools(userId).CreateProject("Card Game", "card-game");

        var projectId = JsonSerializer.Deserialize<JsonElement>(result).GetProperty("Id").GetGuid();
        _context.ChangeTracker.Clear();
        var up = await _context.UserProjects.FindAsync(userId, projectId);
        Assert.NotNull(up);
        Assert.Equal(ProjectRole.Owner, up.Role);
    }

    [Fact]
    public async Task CreateProject_DefaultsToPrivateVisibility()
    {
        var userId = await SeedUser();

        var result = await CreateTools(userId).CreateProject("Secret Game", "secret-game");

        Assert.Equal("Private", JsonSerializer.Deserialize<JsonElement>(result).GetProperty("Visibility").GetString());
    }

    [Fact]
    public async Task CreateProject_PublicVisibility_PersistedCorrectly()
    {
        var userId = await SeedUser();

        var result = await CreateTools(userId).CreateProject("Open Game", "open-game", visibility: "Public");

        Assert.Equal("Public", JsonSerializer.Deserialize<JsonElement>(result).GetProperty("Visibility").GetString());
    }

    [Fact]
    public async Task CreateProject_InvalidVisibilityString_DefaultsToPrivate()
    {
        var userId = await SeedUser();

        var result = await CreateTools(userId).CreateProject("Game", "game", visibility: "NotAVisibility");

        Assert.Equal("Private", JsonSerializer.Deserialize<JsonElement>(result).GetProperty("Visibility").GetString());
    }

    #endregion

    #region UpdateProject

    [Fact]
    public async Task UpdateProject_Owner_UpdatesNameAndReturnsStatus()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        var result = await CreateTools(userId).UpdateProject(projectId, "Renamed Game");

        Assert.Equal("updated", JsonSerializer.Deserialize<JsonElement>(result).GetProperty("Status").GetString());
        _context.ChangeTracker.Clear();
        var project = await _context.Projects.FindAsync(projectId);
        Assert.Equal("Renamed Game", project!.Name);
    }

    [Fact]
    public async Task UpdateProject_Owner_UpdatesDescription()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        await CreateTools(userId).UpdateProject(projectId, "Game", "New desc");

        _context.ChangeTracker.Clear();
        Assert.Equal("New desc", (await _context.Projects.FindAsync(projectId))!.Description);
    }

    [Fact]
    public async Task UpdateProject_NonOwner_ReturnsError()
    {
        var (_, projectId) = await SeedOwnerWithProject();
        var otherId = await SeedUser("other");

        var result = await CreateTools(otherId).UpdateProject(projectId, "Hack");

        Assert.Equal(McpErrors.ProjectNotFoundOrNotOwner, result);
    }

    [Fact]
    public async Task UpdateProject_UnknownProject_ReturnsError()
    {
        var userId = await SeedUser();

        var result = await CreateTools(userId).UpdateProject(Guid.NewGuid(), "Name");

        Assert.Equal(McpErrors.ProjectNotFoundOrNotOwner, result);
    }

    #endregion

    #region DeleteProject

    [Fact]
    public async Task DeleteProject_Owner_DeletesAndReturnsDeleted()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        var result = await CreateTools(userId).DeleteProject(projectId);

        Assert.Equal(McpErrors.Deleted, result);
        _context.ChangeTracker.Clear();
        Assert.Null(await _context.Projects.FindAsync(projectId));
    }

    [Fact]
    public async Task DeleteProject_NonOwner_ReturnsError()
    {
        var (_, projectId) = await SeedOwnerWithProject();

        var result = await CreateTools(Guid.NewGuid()).DeleteProject(projectId);

        Assert.Equal(McpErrors.ProjectNotFoundOrNotOwner, result);
    }

    [Fact]
    public async Task DeleteProject_UnknownProject_ReturnsError()
    {
        var userId = await SeedUser();

        var result = await CreateTools(userId).DeleteProject(Guid.NewGuid());

        Assert.Equal(McpErrors.ProjectNotFoundOrNotOwner, result);
    }

    #endregion

    #region ListProjectMembers

    [Fact]
    public async Task ListProjectMembers_Member_ReturnsMemberList()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        var result = await CreateTools(userId).ListProjectMembers(projectId);

        var members = JsonSerializer.Deserialize<JsonElement[]>(result)!;
        Assert.Single(members);
        Assert.Equal("Owner", members[0].GetProperty("Role").GetString());
    }

    [Fact]
    public async Task ListProjectMembers_NonMember_ReturnsError()
    {
        var (_, projectId) = await SeedOwnerWithProject();

        var result = await CreateTools(Guid.NewGuid()).ListProjectMembers(projectId);

        Assert.Equal(McpErrors.ProjectNotFound, result);
    }

    [Fact]
    public async Task ListProjectMembers_MultipleMembers_ReturnsAll()
    {
        var (ownerId, projectId) = await SeedOwnerWithProject();
        var collabId = Guid.NewGuid();
        _context.Users.Add(new User { Id = collabId, Email = "collab@test.com", GoogleId = Guid.NewGuid().ToString(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        _context.UserProjects.Add(new UserProject { UserId = collabId, ProjectId = projectId, Role = ProjectRole.Collaborator, JoinedAt = DateTime.UtcNow });
        await _context.SaveChangesAsync();

        var result = await CreateTools(ownerId).ListProjectMembers(projectId);

        var members = JsonSerializer.Deserialize<JsonElement[]>(result)!;
        Assert.Equal(2, members.Length);
    }

    #endregion
}
