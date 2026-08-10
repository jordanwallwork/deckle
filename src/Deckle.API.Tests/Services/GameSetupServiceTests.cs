using System.Text.Json;
using Deckle.API.Services;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace Deckle.API.Tests.Services;

public class GameSetupServiceTests : IDisposable
{
    private bool _disposed;
    private readonly AppDbContext _context;
    private readonly Mock<IProjectAuthorizationService> _mockAuthService;
    private readonly GameSetupService _service;

    public GameSetupServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);
        _mockAuthService = new Mock<IProjectAuthorizationService>();

        // Default: all authorization passes
        _mockAuthService
            .Setup(a => a.RequireProjectAccessAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<string?>()))
            .ReturnsAsync(ProjectRole.Owner);
        _mockAuthService
            .Setup(a => a.EnsureCanModifyResourcesAsync(It.IsAny<Guid>(), It.IsAny<Guid?>()))
            .Returns(Task.CompletedTask);
        _mockAuthService
            .Setup(a => a.EnsureCanDeleteResourcesAsync(It.IsAny<Guid>(), It.IsAny<Guid>()))
            .Returns(Task.CompletedTask);

        _service = new GameSetupService(_context, _mockAuthService.Object);
    }

    #region Helpers

    private async Task<(Guid userId, Guid projectId)> SeedProject()
    {
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();

        _context.Users.Add(new User { Id = userId, Email = $"{userId}@test.com", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        _context.Projects.Add(new Project { Id = projectId, Name = "Test Project", Code = "TP", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        _context.UserProjects.Add(new UserProject { UserId = userId, ProjectId = projectId, Role = ProjectRole.Owner, JoinedAt = DateTime.UtcNow });
        await _context.SaveChangesAsync();

        return (userId, projectId);
    }

    private static JsonElement Doc(string json) => JsonDocument.Parse(json).RootElement;

    private static JsonElement SampleDocument =>
        Doc("""{ "version": 1, "minPlayers": 2, "maxPlayers": 4, "options": [], "blueprints": [], "setup": [] }""");

    private async Task<GameSetup> SeedSetup(Guid projectId, string name = "Base Setup", bool isValid = true)
    {
        var setup = new GameSetup
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = name,
            Document = SampleDocument.GetRawText(),
            IsValid = isValid,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.GameSetups.Add(setup);
        await _context.SaveChangesAsync();
        return setup;
    }

    #endregion

    #region Create

    [Fact]
    public async Task CreateSetupAsync_PersistsSetupWithDocumentAndValidity()
    {
        var (userId, projectId) = await SeedProject();

        var result = await _service.CreateSetupAsync(userId, projectId, "My Setup", SampleDocument, isValid: true);

        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Equal(projectId, result.ProjectId);
        Assert.Equal("My Setup", result.Name);
        Assert.True(result.IsValid);
        Assert.Equal(1, result.Document.GetProperty("version").GetInt32());

        var stored = await _context.GameSetups.FindAsync(result.Id);
        Assert.NotNull(stored);
        Assert.Equal("My Setup", stored!.Name);
    }

    [Fact]
    public async Task CreateSetupAsync_ChecksModifyPermission()
    {
        var (userId, projectId) = await SeedProject();

        await _service.CreateSetupAsync(userId, projectId, "My Setup", SampleDocument, isValid: false);

        _mockAuthService.Verify(a => a.EnsureCanModifyResourcesAsync(userId, projectId), Times.Once);
    }

    [Fact]
    public async Task CreateSetupAsync_ThrowsWhenNotAuthorized()
    {
        var (userId, projectId) = await SeedProject();
        _mockAuthService
            .Setup(a => a.EnsureCanModifyResourcesAsync(It.IsAny<Guid>(), It.IsAny<Guid?>()))
            .ThrowsAsync(new UnauthorizedAccessException());

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.CreateSetupAsync(userId, projectId, "My Setup", SampleDocument, isValid: true));

        Assert.Empty(_context.GameSetups);
    }

    #endregion

    #region Read

    [Fact]
    public async Task GetProjectSetupsAsync_ReturnsSummariesForProjectOrderedByName()
    {
        var (userId, projectId) = await SeedProject();
        await SeedSetup(projectId, "Zeta");
        await SeedSetup(projectId, "Alpha");

        var result = await _service.GetProjectSetupsAsync(userId, projectId);

        Assert.Equal(2, result.Count);
        Assert.Equal("Alpha", result[0].Name);
        Assert.Equal("Zeta", result[1].Name);
    }

    [Fact]
    public async Task GetProjectSetupsAsync_ExcludesOtherProjectsSetups()
    {
        var (userId, projectId) = await SeedProject();
        var (_, otherProjectId) = await SeedProject();
        await SeedSetup(projectId, "Mine");
        await SeedSetup(otherProjectId, "Theirs");

        var result = await _service.GetProjectSetupsAsync(userId, projectId);

        Assert.Single(result);
        Assert.Equal("Mine", result[0].Name);
    }

    [Fact]
    public async Task GetSetupByIdAsync_ReturnsFullDocument()
    {
        var (userId, projectId) = await SeedProject();
        var setup = await SeedSetup(projectId);

        var result = await _service.GetSetupByIdAsync(userId, projectId, setup.Id);

        Assert.NotNull(result);
        Assert.Equal(setup.Id, result!.Id);
        Assert.Equal(2, result.Document.GetProperty("minPlayers").GetInt32());
    }

    [Fact]
    public async Task GetSetupByIdAsync_ReturnsNullWhenSetupBelongsToDifferentProject()
    {
        var (userId, projectId) = await SeedProject();
        var (_, otherProjectId) = await SeedProject();
        var setup = await SeedSetup(otherProjectId);

        var result = await _service.GetSetupByIdAsync(userId, projectId, setup.Id);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetSetupByIdAsync_ReturnsNullWhenNotFound()
    {
        var (userId, projectId) = await SeedProject();

        var result = await _service.GetSetupByIdAsync(userId, projectId, Guid.NewGuid());

        Assert.Null(result);
    }

    #endregion

    #region Update

    [Fact]
    public async Task UpdateSetupAsync_UpdatesNameDocumentAndValidity()
    {
        var (userId, projectId) = await SeedProject();
        var setup = await SeedSetup(projectId, "Old Name", isValid: true);

        var newDoc = Doc("""{ "version": 1, "minPlayers": 3, "maxPlayers": 6, "options": [], "blueprints": [], "setup": [] }""");
        var result = await _service.UpdateSetupAsync(userId, projectId, setup.Id, "New Name", newDoc, isValid: false);

        Assert.NotNull(result);
        Assert.Equal("New Name", result!.Name);
        Assert.False(result.IsValid);
        Assert.Equal(3, result.Document.GetProperty("minPlayers").GetInt32());
    }

    [Fact]
    public async Task UpdateSetupAsync_ReturnsNullWhenNotFound()
    {
        var (userId, projectId) = await SeedProject();

        var result = await _service.UpdateSetupAsync(userId, projectId, Guid.NewGuid(), "Name", SampleDocument, isValid: true);

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateSetupAsync_ReturnsNullWhenSetupBelongsToDifferentProject()
    {
        var (userId, projectId) = await SeedProject();
        var (_, otherProjectId) = await SeedProject();
        var setup = await SeedSetup(otherProjectId);

        var result = await _service.UpdateSetupAsync(userId, projectId, setup.Id, "Name", SampleDocument, isValid: true);

        Assert.Null(result);
    }

    #endregion

    #region Delete

    [Fact]
    public async Task DeleteSetupAsync_RemovesSetup()
    {
        var (userId, projectId) = await SeedProject();
        var setup = await SeedSetup(projectId);

        var deleted = await _service.DeleteSetupAsync(userId, projectId, setup.Id);

        Assert.True(deleted);
        Assert.Null(await _context.GameSetups.FindAsync(setup.Id));
    }

    [Fact]
    public async Task DeleteSetupAsync_ReturnsFalseWhenNotFound()
    {
        var (userId, projectId) = await SeedProject();

        var deleted = await _service.DeleteSetupAsync(userId, projectId, Guid.NewGuid());

        Assert.False(deleted);
    }

    [Fact]
    public async Task DeleteSetupAsync_ChecksDeletePermission()
    {
        var (userId, projectId) = await SeedProject();
        var setup = await SeedSetup(projectId);

        await _service.DeleteSetupAsync(userId, projectId, setup.Id);

        _mockAuthService.Verify(a => a.EnsureCanDeleteResourcesAsync(userId, projectId), Times.Once);
    }

    #endregion

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (_disposed)
        {
            return;
        }

        if (disposing)
        {
            _context.Dispose();
        }

        _disposed = true;
    }
}
