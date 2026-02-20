using Deckle.API.Services;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deckle.API.Tests.Services;

public class AdminServiceTests : IDisposable
{
    private bool _disposed;
    private readonly AppDbContext _context;
    private readonly AdminService _service;

    public AdminServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);
        _service = new AdminService(_context);
    }

    #region Helpers

    private async Task<User> SeedUser(
        string email,
        string? name = null,
        UserRole role = UserRole.User,
        int storageQuotaMb = 10,
        long storageUsedBytes = 0)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            GoogleId = Guid.NewGuid().ToString(),
            Email = email,
            Name = name,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Role = role,
            StorageQuotaMb = storageQuotaMb,
            StorageUsedBytes = storageUsedBytes
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        return user;
    }

    private async Task<(Guid userId, Guid projectId)> SeedUserWithOwnedProject(string email)
    {
        var user = await SeedUser(email);
        var project = new Project
        {
            Id = Guid.NewGuid(),
            Name = "Test Project",
            Code = "tp",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Projects.Add(project);
        _context.UserProjects.Add(new UserProject
        {
            UserId = user.Id,
            ProjectId = project.Id,
            Role = ProjectRole.Owner,
            JoinedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();
        return (user.Id, project.Id);
    }

    #endregion

    #region GetUsersAsync Tests

    [Fact]
    public async Task GetUsersAsync_NoUsers_ReturnsEmptyList()
    {
        var result = await _service.GetUsersAsync();

        Assert.Empty(result.Users);
        Assert.Equal(0, result.TotalCount);
    }

    [Fact]
    public async Task GetUsersAsync_ReturnsAllUsers()
    {
        await SeedUser("alice@test.com");
        await SeedUser("bob@test.com");
        await SeedUser("carol@test.com");

        var result = await _service.GetUsersAsync();

        Assert.Equal(3, result.TotalCount);
        Assert.Equal(3, result.Users.Count);
    }

    [Fact]
    public async Task GetUsersAsync_WithSearchByEmail_FiltersResults()
    {
        await SeedUser("alice@example.com");
        await SeedUser("bob@other.com");

        var result = await _service.GetUsersAsync(search: "alice");

        Assert.Equal(1, result.TotalCount);
        Assert.Equal("alice@example.com", result.Users[0].Email);
    }

    [Fact]
    public async Task GetUsersAsync_WithSearchByName_FiltersResults()
    {
        await SeedUser("alice@test.com", "Alice Wonder");
        await SeedUser("bob@test.com", "Bob Builder");

        var result = await _service.GetUsersAsync(search: "Wonder");

        Assert.Equal(1, result.TotalCount);
        Assert.Equal("Alice Wonder", result.Users[0].Name);
    }

    [Fact]
    public async Task GetUsersAsync_Pagination_RespectsPageSize()
    {
        for (int i = 0; i < 5; i++)
        {
            await SeedUser($"user{i}@test.com");
        }

        var result = await _service.GetUsersAsync(page: 1, pageSize: 2);

        Assert.Equal(5, result.TotalCount);
        Assert.Equal(2, result.Users.Count);
        Assert.Equal(1, result.Page);
        Assert.Equal(2, result.PageSize);
    }

    [Fact]
    public async Task GetUsersAsync_Page2_SkipsFirstPage()
    {
        for (int i = 0; i < 5; i++)
        {
            await SeedUser($"user{i}@test.com");
        }

        var page1 = await _service.GetUsersAsync(page: 1, pageSize: 3);
        var page2 = await _service.GetUsersAsync(page: 2, pageSize: 3);

        Assert.Equal(3, page1.Users.Count);
        Assert.Equal(2, page2.Users.Count);
        Assert.DoesNotContain(page2.Users, u => page1.Users.Any(p => p.Id == u.Id));
    }

    [Fact]
    public async Task GetUsersAsync_ReturnsCorrectDtoFields()
    {
        var user = await SeedUser("test@test.com", "Test User", UserRole.Administrator, 100);

        var result = await _service.GetUsersAsync();

        var dto = result.Users[0];
        Assert.Equal(user.Id, dto.Id);
        Assert.Equal("test@test.com", dto.Email);
        Assert.Equal("Test User", dto.Name);
        Assert.Equal("Administrator", dto.Role);
        Assert.Equal(100, dto.StorageQuotaMb);
    }

    [Fact]
    public async Task GetUsersAsync_IncludesOwnerProjectCount()
    {
        var (userId, _) = await SeedUserWithOwnedProject("owner@test.com");

        var result = await _service.GetUsersAsync();

        var dto = result.Users.Single(u => u.Id == userId);
        Assert.Equal(1, dto.ProjectCount);
    }

    [Fact]
    public async Task GetUsersAsync_CollaboratorProjectsNotCountedInProjectCount()
    {
        var owner = await SeedUser("owner@test.com");
        var collaborator = await SeedUser("collab@test.com");
        var project = new Project
        {
            Id = Guid.NewGuid(),
            Name = "Test",
            Code = "tc",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Projects.Add(project);
        _context.UserProjects.Add(new UserProject { UserId = owner.Id, ProjectId = project.Id, Role = ProjectRole.Owner, JoinedAt = DateTime.UtcNow });
        _context.UserProjects.Add(new UserProject { UserId = collaborator.Id, ProjectId = project.Id, Role = ProjectRole.Collaborator, JoinedAt = DateTime.UtcNow });
        await _context.SaveChangesAsync();

        var result = await _service.GetUsersAsync();

        var collabDto = result.Users.Single(u => u.Id == collaborator.Id);
        Assert.Equal(0, collabDto.ProjectCount);
    }

    #endregion

    #region GetUserByIdAsync Tests

    [Fact]
    public async Task GetUserByIdAsync_ExistingUser_ReturnsDto()
    {
        var user = await SeedUser("test@test.com", "Test User");

        var result = await _service.GetUserByIdAsync(user.Id);

        Assert.NotNull(result);
        Assert.Equal(user.Id, result.Id);
        Assert.Equal("test@test.com", result.Email);
        Assert.Equal("Test User", result.Name);
    }

    [Fact]
    public async Task GetUserByIdAsync_NonExistentUser_ReturnsNull()
    {
        var result = await _service.GetUserByIdAsync(Guid.NewGuid());

        Assert.Null(result);
    }

    [Fact]
    public async Task GetUserByIdAsync_ReturnsStorageFields()
    {
        var user = await SeedUser("test@test.com", storageQuotaMb: 500, storageUsedBytes: 1024);

        var result = await _service.GetUserByIdAsync(user.Id);

        Assert.NotNull(result);
        Assert.Equal(500, result.StorageQuotaMb);
        Assert.Equal(1024, result.StorageUsedBytes);
    }

    #endregion

    #region UpdateUserRoleAsync Tests

    [Fact]
    public async Task UpdateUserRoleAsync_ValidRole_ReturnsUpdatedDto()
    {
        var user = await SeedUser("test@test.com", role: UserRole.User);

        var result = await _service.UpdateUserRoleAsync(user.Id, "Administrator");

        Assert.NotNull(result);
        Assert.Equal("Administrator", result.Role);
    }

    [Fact]
    public async Task UpdateUserRoleAsync_ValidRole_PersistsToDatabase()
    {
        var user = await SeedUser("test@test.com");

        await _service.UpdateUserRoleAsync(user.Id, "Administrator");

        _context.ChangeTracker.Clear();
        var updated = await _context.Users.FindAsync(user.Id);
        Assert.Equal(UserRole.Administrator, updated!.Role);
    }

    [Fact]
    public async Task UpdateUserRoleAsync_InvalidRole_ReturnsNull()
    {
        var user = await SeedUser("test@test.com");

        var result = await _service.UpdateUserRoleAsync(user.Id, "SuperAdmin");

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateUserRoleAsync_InvalidRole_DoesNotModifyDatabase()
    {
        var user = await SeedUser("test@test.com", role: UserRole.User);

        await _service.UpdateUserRoleAsync(user.Id, "SuperAdmin");

        _context.ChangeTracker.Clear();
        var unchanged = await _context.Users.FindAsync(user.Id);
        Assert.Equal(UserRole.User, unchanged!.Role);
    }

    [Fact]
    public async Task UpdateUserRoleAsync_NonExistentUser_ReturnsNull()
    {
        var result = await _service.UpdateUserRoleAsync(Guid.NewGuid(), "Administrator");

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateUserRoleAsync_CaseInsensitiveRole_Succeeds()
    {
        var user = await SeedUser("test@test.com");

        var result = await _service.UpdateUserRoleAsync(user.Id, "administrator");

        Assert.NotNull(result);
        Assert.Equal("Administrator", result.Role);
    }

    [Fact]
    public async Task UpdateUserRoleAsync_SameRole_StillSucceeds()
    {
        var user = await SeedUser("test@test.com", role: UserRole.Administrator);

        var result = await _service.UpdateUserRoleAsync(user.Id, "Administrator");

        Assert.NotNull(result);
        Assert.Equal("Administrator", result.Role);
    }

    #endregion

    #region UpdateUserQuotaAsync Tests

    [Fact]
    public async Task UpdateUserQuotaAsync_ValidQuota_ReturnsUpdatedDto()
    {
        var user = await SeedUser("test@test.com");

        var result = await _service.UpdateUserQuotaAsync(user.Id, 500);

        Assert.NotNull(result);
        Assert.Equal(500, result.StorageQuotaMb);
    }

    [Fact]
    public async Task UpdateUserQuotaAsync_ValidQuota_PersistsToDatabase()
    {
        var user = await SeedUser("test@test.com");

        await _service.UpdateUserQuotaAsync(user.Id, 250);

        _context.ChangeTracker.Clear();
        var updated = await _context.Users.FindAsync(user.Id);
        Assert.Equal(250, updated!.StorageQuotaMb);
    }

    [Fact]
    public async Task UpdateUserQuotaAsync_NegativeQuota_ReturnsNull()
    {
        var user = await SeedUser("test@test.com");

        var result = await _service.UpdateUserQuotaAsync(user.Id, -1);

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateUserQuotaAsync_NegativeQuota_DoesNotModifyDatabase()
    {
        var user = await SeedUser("test@test.com", storageQuotaMb: 100);

        await _service.UpdateUserQuotaAsync(user.Id, -1);

        _context.ChangeTracker.Clear();
        var unchanged = await _context.Users.FindAsync(user.Id);
        Assert.Equal(100, unchanged!.StorageQuotaMb);
    }

    [Fact]
    public async Task UpdateUserQuotaAsync_ZeroQuota_Succeeds()
    {
        var user = await SeedUser("test@test.com");

        var result = await _service.UpdateUserQuotaAsync(user.Id, 0);

        Assert.NotNull(result);
        Assert.Equal(0, result.StorageQuotaMb);
    }

    [Fact]
    public async Task UpdateUserQuotaAsync_NonExistentUser_ReturnsNull()
    {
        var result = await _service.UpdateUserQuotaAsync(Guid.NewGuid(), 100);

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateUserQuotaAsync_LargeQuota_Succeeds()
    {
        var user = await SeedUser("test@test.com");

        var result = await _service.UpdateUserQuotaAsync(user.Id, 100_000);

        Assert.NotNull(result);
        Assert.Equal(100_000, result.StorageQuotaMb);
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
