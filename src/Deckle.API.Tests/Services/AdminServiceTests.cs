using Deckle.API.Auth;
using Deckle.API.DTOs;
using Deckle.API.Services;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace Deckle.API.Tests.Services;

public class AdminServiceTests : IDisposable
{
    private bool _disposed;
    private readonly AppDbContext _context;
    private readonly AdminService _service;
    private readonly Mock<IEmailConfirmationService> _emailConfirmation = new();
    private readonly Mock<IUserSessionCache> _sessionCache = new();
    private readonly Guid _adminId = Guid.NewGuid();

    public AdminServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);
        _service = new AdminService(_context, _emailConfirmation.Object, _sessionCache.Object);
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
        var result = await _service.GetUsersAsync(new AdminUserQuery());

        Assert.Empty(result.Users);
        Assert.Equal(0, result.TotalCount);
    }

    [Fact]
    public async Task GetUsersAsync_ReturnsAllUsers()
    {
        await SeedUser("alice@test.com");
        await SeedUser("bob@test.com");
        await SeedUser("carol@test.com");

        var result = await _service.GetUsersAsync(new AdminUserQuery());

        Assert.Equal(3, result.TotalCount);
        Assert.Equal(3, result.Users.Count);
    }

    [Fact]
    public async Task GetUsersAsync_WithSearchByEmail_FiltersResults()
    {
        await SeedUser("alice@example.com");
        await SeedUser("bob@other.com");

        var result = await _service.GetUsersAsync(new AdminUserQuery(Search: "alice"));

        Assert.Equal(1, result.TotalCount);
        Assert.Equal("alice@example.com", result.Users[0].Email);
    }

    [Fact]
    public async Task GetUsersAsync_WithSearchByName_FiltersResults()
    {
        await SeedUser("alice@test.com", "Alice Wonder");
        await SeedUser("bob@test.com", "Bob Builder");

        var result = await _service.GetUsersAsync(new AdminUserQuery(Search: "Wonder"));

        Assert.Equal(1, result.TotalCount);
        Assert.Equal("Alice Wonder", result.Users[0].Name);
    }

    [Fact]
    public async Task GetUsersAsync_WithMixedCaseSearch_MatchesEmailCaseInsensitively()
    {
        await SeedUser("Alice.Smith@Example.com");
        await SeedUser("bob@other.com");

        var result = await _service.GetUsersAsync(new AdminUserQuery(Search: "  aLICE.sMITH@example  "));

        Assert.Equal(1, result.TotalCount);
        Assert.Equal("Alice.Smith@Example.com", result.Users[0].Email);
    }

    [Fact]
    public async Task GetUsersAsync_WithMixedCaseSearch_MatchesNameCaseInsensitively()
    {
        await SeedUser("alice@test.com", "Alice Wonder");
        await SeedUser("bob@test.com", "Bob Builder");

        var result = await _service.GetUsersAsync(new AdminUserQuery(Search: "wONDER"));

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

        var result = await _service.GetUsersAsync(new AdminUserQuery(Page: 1, PageSize: 2));

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

        var page1 = await _service.GetUsersAsync(new AdminUserQuery(Page: 1, PageSize: 3));
        var page2 = await _service.GetUsersAsync(new AdminUserQuery(Page: 2, PageSize: 3));

        Assert.Equal(3, page1.Users.Count);
        Assert.Equal(2, page2.Users.Count);
        Assert.DoesNotContain(page2.Users, u => page1.Users.Any(p => p.Id == u.Id));
    }

    [Fact]
    public async Task GetUsersAsync_ReturnsCorrectDtoFields()
    {
        var user = await SeedUser("test@test.com", "Test User", UserRole.Administrator, 100);

        var result = await _service.GetUsersAsync(new AdminUserQuery());

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

        var result = await _service.GetUsersAsync(new AdminUserQuery());

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

        var result = await _service.GetUsersAsync(new AdminUserQuery());

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

        var result = await _service.UpdateUserRoleAsync(_adminId, user.Id, "Administrator");

        Assert.Equal(AdminActionStatus.Success, result.Status);
        Assert.Equal("Administrator", result.User!.Role);
    }

    [Fact]
    public async Task UpdateUserRoleAsync_ValidRole_PersistsToDatabase()
    {
        var user = await SeedUser("test@test.com");

        await _service.UpdateUserRoleAsync(_adminId, user.Id, "Administrator");

        _context.ChangeTracker.Clear();
        var updated = await _context.Users.FindAsync(user.Id);
        Assert.Equal(UserRole.Administrator, updated!.Role);
    }

    [Fact]
    public async Task UpdateUserRoleAsync_InvalidRole_ReturnsInvalid()
    {
        var user = await SeedUser("test@test.com");

        var result = await _service.UpdateUserRoleAsync(_adminId, user.Id, "SuperAdmin");

        Assert.Equal(AdminActionStatus.Invalid, result.Status);
    }

    [Fact]
    public async Task UpdateUserRoleAsync_InvalidRole_DoesNotModifyDatabase()
    {
        var user = await SeedUser("test@test.com", role: UserRole.User);

        await _service.UpdateUserRoleAsync(_adminId, user.Id, "SuperAdmin");

        _context.ChangeTracker.Clear();
        var unchanged = await _context.Users.FindAsync(user.Id);
        Assert.Equal(UserRole.User, unchanged!.Role);
    }

    [Fact]
    public async Task UpdateUserRoleAsync_NonExistentUser_ReturnsNotFound()
    {
        var result = await _service.UpdateUserRoleAsync(_adminId, Guid.NewGuid(), "Administrator");

        Assert.Equal(AdminActionStatus.NotFound, result.Status);
    }

    [Fact]
    public async Task UpdateUserRoleAsync_CaseInsensitiveRole_Succeeds()
    {
        var user = await SeedUser("test@test.com");

        var result = await _service.UpdateUserRoleAsync(_adminId, user.Id, "administrator");

        Assert.Equal(AdminActionStatus.Success, result.Status);
        Assert.Equal("Administrator", result.User!.Role);
    }

    [Fact]
    public async Task UpdateUserRoleAsync_SameRole_StillSucceeds()
    {
        var user = await SeedUser("test@test.com", role: UserRole.Administrator);

        var result = await _service.UpdateUserRoleAsync(_adminId, user.Id, "Administrator");

        Assert.Equal(AdminActionStatus.Success, result.Status);
        Assert.Equal("Administrator", result.User!.Role);
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

    #region Filter Helpers

    private async Task<User> SeedUserWith(string email, Action<User> configure)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            GoogleId = Guid.NewGuid().ToString(),
            Email = email,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            EmailConfirmedAt = DateTime.UtcNow
        };
        configure(user);
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        return user;
    }

    private static DateTime Utc(int year, int month, int day, int hour = 0, int minute = 0) =>
        new(year, month, day, hour, minute, 0, DateTimeKind.Utc);

    private async Task<List<string>> FilteredEmails(AdminUserQuery query)
    {
        var result = await _service.GetUsersAsync(query);
        return result.Users.Select(u => u.Email).Order(StringComparer.Ordinal).ToList();
    }

    #endregion

    #region GetUsersAsync Filter Tests

    [Fact]
    public async Task GetUsersAsync_InvalidPaging_IsClamped()
    {
        await SeedUser("a@test.com");

        var result = await _service.GetUsersAsync(new AdminUserQuery(Page: 0, PageSize: 500));

        Assert.Equal(1, result.Page);
        Assert.Equal(20, result.PageSize);
        Assert.Single(result.Users);
    }

    [Fact]
    public async Task GetUsersAsync_CreatedFrom_IncludesStartOfDay()
    {
        await SeedUserWith("before@test.com", u => u.CreatedAt = Utc(2026, 3, 9, 23, 59));
        await SeedUserWith("start@test.com", u => u.CreatedAt = Utc(2026, 3, 10));
        await SeedUserWith("after@test.com", u => u.CreatedAt = Utc(2026, 3, 11, 12));

        var emails = await FilteredEmails(new AdminUserQuery(CreatedFrom: new DateOnly(2026, 3, 10)));

        Assert.Equal(["after@test.com", "start@test.com"], emails);
    }

    [Fact]
    public async Task GetUsersAsync_CreatedTo_IsInclusiveOfWholeDay()
    {
        await SeedUserWith("endofday@test.com", u => u.CreatedAt = Utc(2026, 3, 10, 23, 59));
        await SeedUserWith("nextday@test.com", u => u.CreatedAt = Utc(2026, 3, 11));
        await SeedUserWith("earlier@test.com", u => u.CreatedAt = Utc(2026, 3, 1));

        var emails = await FilteredEmails(new AdminUserQuery(CreatedTo: new DateOnly(2026, 3, 10)));

        Assert.Equal(["earlier@test.com", "endofday@test.com"], emails);
    }

    [Fact]
    public async Task GetUsersAsync_CreatedRange_SameDay_ReturnsOnlyThatDay()
    {
        await SeedUserWith("day@test.com", u => u.CreatedAt = Utc(2026, 3, 10, 8));
        await SeedUserWith("prev@test.com", u => u.CreatedAt = Utc(2026, 3, 9, 8));
        await SeedUserWith("next@test.com", u => u.CreatedAt = Utc(2026, 3, 11, 8));

        var emails = await FilteredEmails(new AdminUserQuery(
            CreatedFrom: new DateOnly(2026, 3, 10), CreatedTo: new DateOnly(2026, 3, 10)));

        Assert.Equal(["day@test.com"], emails);
    }

    [Fact]
    public async Task GetUsersAsync_LastLoginFrom_FiltersAndExcludesNeverLoggedIn()
    {
        await SeedUserWith("recent@test.com", u => u.LastLoginAt = Utc(2026, 5, 2));
        await SeedUserWith("old@test.com", u => u.LastLoginAt = Utc(2026, 4, 1));
        await SeedUserWith("never@test.com", u => u.LastLoginAt = null);

        var emails = await FilteredEmails(new AdminUserQuery(LastLoginFrom: new DateOnly(2026, 5, 1)));

        Assert.Equal(["recent@test.com"], emails);
    }

    [Fact]
    public async Task GetUsersAsync_LastLoginTo_IsInclusiveAndExcludesNeverLoggedIn()
    {
        await SeedUserWith("endofday@test.com", u => u.LastLoginAt = Utc(2026, 5, 1, 23, 59));
        await SeedUserWith("nextday@test.com", u => u.LastLoginAt = Utc(2026, 5, 2));
        await SeedUserWith("never@test.com", u => u.LastLoginAt = null);

        var emails = await FilteredEmails(new AdminUserQuery(LastLoginTo: new DateOnly(2026, 5, 1)));

        Assert.Equal(["endofday@test.com"], emails);
    }

    [Fact]
    public async Task GetUsersAsync_NoLastLoginBound_IncludesNeverLoggedIn()
    {
        await SeedUserWith("never@test.com", u => u.LastLoginAt = null);

        var emails = await FilteredEmails(new AdminUserQuery());

        Assert.Equal(["never@test.com"], emails);
    }

    [Theory]
    [InlineData("Administrator")]
    [InlineData("administrator")]
    public async Task GetUsersAsync_RoleFilter_ReturnsOnlyThatRole(string role)
    {
        await SeedUser("admin@test.com", role: UserRole.Administrator);
        await SeedUser("user@test.com", role: UserRole.User);

        var emails = await FilteredEmails(new AdminUserQuery(Role: role));

        Assert.Equal(["admin@test.com"], emails);
    }

    [Fact]
    public async Task GetUsersAsync_RoleFilterUser_ReturnsOnlyUsers()
    {
        await SeedUser("admin@test.com", role: UserRole.Administrator);
        await SeedUser("user@test.com", role: UserRole.User);

        var emails = await FilteredEmails(new AdminUserQuery(Role: "User"));

        Assert.Equal(["user@test.com"], emails);
    }

    [Theory]
    [InlineData("SuperAdmin")]
    [InlineData("1")]
    [InlineData("")]
    public async Task GetUsersAsync_InvalidRoleFilter_IsIgnored(string role)
    {
        await SeedUser("admin@test.com", role: UserRole.Administrator);
        await SeedUser("user@test.com", role: UserRole.User);

        var result = await _service.GetUsersAsync(new AdminUserQuery(Role: role));

        Assert.Equal(2, result.TotalCount);
    }

    private async Task SeedStatusUsers()
    {
        await SeedUserWith("active@test.com", u => { u.EmailConfirmedAt = DateTime.UtcNow; u.DisabledAt = null; });
        await SeedUserWith("unconfirmed@test.com", u => { u.EmailConfirmedAt = null; u.DisabledAt = null; });
        await SeedUserWith("disabled@test.com", u => { u.EmailConfirmedAt = DateTime.UtcNow; u.DisabledAt = DateTime.UtcNow; });
        await SeedUserWith("disabled-unconfirmed@test.com", u => { u.EmailConfirmedAt = null; u.DisabledAt = DateTime.UtcNow; });
    }

    [Theory]
    [InlineData("Active", new[] { "active@test.com" })]
    [InlineData("active", new[] { "active@test.com" })]
    [InlineData("Unconfirmed", new[] { "unconfirmed@test.com" })]
    [InlineData("Disabled", new[] { "disabled-unconfirmed@test.com", "disabled@test.com" })]
    public async Task GetUsersAsync_StatusFilter_ReturnsMatchingUsers(string status, string[] expected)
    {
        await SeedStatusUsers();

        var emails = await FilteredEmails(new AdminUserQuery(Status: status));

        Assert.Equal(expected, emails);
    }

    [Fact]
    public async Task GetUsersAsync_InvalidStatusFilter_IsIgnored()
    {
        await SeedStatusUsers();

        var result = await _service.GetUsersAsync(new AdminUserQuery(Status: "Banned"));

        Assert.Equal(4, result.TotalCount);
    }

    [Fact]
    public async Task GetUsersAsync_CombinedFilters_AreAndedAndCounted()
    {
        await SeedUserWith("match@test.com", u => { u.Role = UserRole.Administrator; u.Name = "Match"; u.CreatedAt = Utc(2026, 1, 5); });
        await SeedUserWith("wrongrole@test.com", u => { u.Role = UserRole.User; u.Name = "Match"; u.CreatedAt = Utc(2026, 1, 5); });
        await SeedUserWith("wrongdate@test.com", u => { u.Role = UserRole.Administrator; u.Name = "Match"; u.CreatedAt = Utc(2025, 1, 5); });

        var result = await _service.GetUsersAsync(new AdminUserQuery(
            Search: "match", Role: "Administrator", CreatedFrom: new DateOnly(2026, 1, 1), Status: "Active"));

        Assert.Equal(1, result.TotalCount);
        Assert.Equal("match@test.com", result.Users[0].Email);
    }

    [Fact]
    public async Task GetUsersAsync_ReturnsConfirmationAndDisabledFlags()
    {
        await SeedStatusUsers();

        var result = await _service.GetUsersAsync(new AdminUserQuery());

        var active = result.Users.Single(u => u.Email == "active@test.com");
        Assert.True(active.EmailConfirmed);
        Assert.False(active.IsDisabled);
        var unconfirmed = result.Users.Single(u => u.Email == "unconfirmed@test.com");
        Assert.False(unconfirmed.EmailConfirmed);
        var disabled = result.Users.Single(u => u.Email == "disabled@test.com");
        Assert.True(disabled.IsDisabled);
    }

    #endregion

    #region GetUsersAsync Sort Tests

    /// <summary>
    /// Seeds three users whose values give a distinct order for every sort key:
    /// charlie@ (name "Charlie"), bravo@ (no name, sorts by email) and zed@ (name "alpha").
    /// </summary>
    private async Task SeedSortableUsers()
    {
        var charlie = await SeedUserWith("charlie@test.com", u =>
        {
            u.Name = "Charlie";
            u.CreatedAt = Utc(2026, 1, 1);
            u.LastLoginAt = Utc(2026, 5, 3);
            u.StorageUsedBytes = 300;
        });
        var bravo = await SeedUserWith("bravo@test.com", u =>
        {
            u.CreatedAt = Utc(2026, 1, 3);
            u.LastLoginAt = Utc(2026, 5, 1);
            u.StorageUsedBytes = 100;
            u.Role = UserRole.Administrator;
        });
        var zed = await SeedUserWith("zed@test.com", u =>
        {
            u.Name = "alpha";
            u.CreatedAt = Utc(2026, 1, 2);
            u.StorageUsedBytes = 200;
        });
        await AddOwnedProjects(charlie, 0);
        await AddOwnedProjects(bravo, 2);
        await AddOwnedProjects(zed, 1);
    }

    private async Task AddOwnedProjects(User user, int count)
    {
        for (var i = 0; i < count; i++)
        {
            var project = new Project
            {
                Id = Guid.NewGuid(),
                Name = $"Project {i}",
                Code = $"p{i}",
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
        }
        await _context.SaveChangesAsync();
    }

    private static List<string> LocalParts(AdminUserListResponse result) =>
        result.Users.Select(u => u.Email.Split('@')[0]).ToList();

    private async Task<List<string>> SortedEmails(AdminUserQuery query) =>
        LocalParts(await _service.GetUsersAsync(query));

    [Theory]
    [InlineData("name", "asc", "zed,bravo,charlie")]
    [InlineData("name", "desc", "charlie,bravo,zed")]
    [InlineData("createdAt", "asc", "charlie,zed,bravo")]
    [InlineData("createdAt", "desc", "bravo,zed,charlie")]
    [InlineData("lastLoginAt", "asc", "bravo,charlie,zed")]
    [InlineData("lastLoginAt", "desc", "charlie,bravo,zed")]
    [InlineData("storage", "asc", "bravo,zed,charlie")]
    [InlineData("storage", "desc", "charlie,zed,bravo")]
    [InlineData("projects", "asc", "charlie,zed,bravo")]
    [InlineData("projects", "desc", "bravo,zed,charlie")]
    public async Task GetUsersAsync_SortsByKeyInEachDirection(string sortBy, string sortDir, string expected)
    {
        await SeedSortableUsers();

        var result = await _service.GetUsersAsync(new AdminUserQuery(SortBy: sortBy, SortDir: sortDir));

        Assert.Equal(expected.Split(','), LocalParts(result));
        Assert.Equal(sortBy, result.SortBy);
        Assert.Equal(sortDir, result.SortDir);
    }

    [Fact]
    public async Task GetUsersAsync_SortByRole_AdministratorsFirstAscending_LastDescending()
    {
        await SeedSortableUsers();

        var asc = await SortedEmails(new AdminUserQuery(SortBy: "role", SortDir: "asc"));
        var desc = await SortedEmails(new AdminUserQuery(SortBy: "role", SortDir: "desc"));

        Assert.Equal("bravo", asc[0]);
        Assert.Equal("bravo", desc[^1]);
    }

    [Fact]
    public async Task GetUsersAsync_SortKeysAreCaseInsensitive_AndEchoCanonicalCasing()
    {
        await SeedSortableUsers();

        var result = await _service.GetUsersAsync(new AdminUserQuery(SortBy: "LASTLOGINAT", SortDir: "ASC"));

        Assert.Equal("lastLoginAt", result.SortBy);
        Assert.Equal("asc", result.SortDir);
        Assert.Equal(["bravo", "charlie", "zed"], LocalParts(result));
    }

    [Theory]
    [InlineData("asc", "old", "new")]
    [InlineData("desc", "new", "old")]
    public async Task GetUsersAsync_SortByLastLogin_NeverLoggedInGoLast(string sortDir, string first, string second)
    {
        await SeedUserWith("never1@test.com", u => u.LastLoginAt = null);
        await SeedUserWith("old@test.com", u => u.LastLoginAt = Utc(2026, 1, 1));
        await SeedUserWith("never2@test.com", u => u.LastLoginAt = null);
        await SeedUserWith("new@test.com", u => u.LastLoginAt = Utc(2026, 6, 1));

        var emails = await SortedEmails(new AdminUserQuery(SortBy: "lastLoginAt", SortDir: sortDir));

        Assert.Equal([first, second], emails.Take(2));
        Assert.Equal(["never1", "never2"], emails.Skip(2).Order(StringComparer.Ordinal));
    }

    [Fact]
    public async Task GetUsersAsync_SortByName_FallsBackToEmailWhenNameIsNull()
    {
        await SeedUserWith("mike@test.com", u => u.Name = "Mike");
        await SeedUserWith("bob@test.com", u => u.Name = null);
        await SeedUserWith("zara@test.com", u => u.Name = null);
        await SeedUserWith("xavier@test.com", u => u.Name = "Adam");

        var emails = await SortedEmails(new AdminUserQuery(SortBy: "name", SortDir: "asc"));

        Assert.Equal(["xavier", "bob", "mike", "zara"], emails);
    }

    [Theory]
    [InlineData(null, null)]
    [InlineData("bogus", "asc")]
    [InlineData("", "")]
    [InlineData("email", "desc")]
    public async Task GetUsersAsync_InvalidOrMissingSort_FallsBackToCreatedAtDesc(string? sortBy, string? sortDir)
    {
        await SeedSortableUsers();

        var result = await _service.GetUsersAsync(new AdminUserQuery(SortBy: sortBy, SortDir: sortDir));

        Assert.Equal("createdAt", result.SortBy);
        Assert.Equal("desc", result.SortDir);
        Assert.Equal(["bravo", "zed", "charlie"], LocalParts(result));
    }

    [Theory]
    [InlineData("name", "asc")]
    [InlineData("role", "asc")]
    [InlineData("createdAt", "desc")]
    [InlineData("lastLoginAt", "desc")]
    [InlineData("storage", "desc")]
    [InlineData("projects", "desc")]
    public async Task GetUsersAsync_InvalidSortDir_UsesKeysNaturalDirection(string sortBy, string expectedDir)
    {
        await SeedSortableUsers();

        var result = await _service.GetUsersAsync(new AdminUserQuery(SortBy: sortBy, SortDir: "sideways"));

        Assert.Equal(sortBy, result.SortBy);
        Assert.Equal(expectedDir, result.SortDir);
    }

    [Fact]
    public async Task GetUsersAsync_SortCombinedWithFilter_SortsOnlyMatchingUsers()
    {
        await SeedSortableUsers();

        var emails = await SortedEmails(new AdminUserQuery(Role: "User", SortBy: "storage", SortDir: "asc"));

        Assert.Equal(["zed", "charlie"], emails);
    }

    [Fact]
    public async Task GetUsersAsync_SortCombinedWithPagination_PagesThroughSortedOrder()
    {
        for (var i = 1; i <= 5; i++)
        {
            var bytes = i * 100L;
            await SeedUserWith($"s{i}@test.com", u => u.StorageUsedBytes = bytes);
        }

        var page1 = await SortedEmails(new AdminUserQuery(Page: 1, PageSize: 2, SortBy: "storage", SortDir: "desc"));
        var page2 = await SortedEmails(new AdminUserQuery(Page: 2, PageSize: 2, SortBy: "storage", SortDir: "desc"));
        var page3 = await SortedEmails(new AdminUserQuery(Page: 3, PageSize: 2, SortBy: "storage", SortDir: "desc"));

        Assert.Equal(["s5", "s4"], page1);
        Assert.Equal(["s3", "s2"], page2);
        Assert.Equal(["s1"], page3);
    }

    [Fact]
    public async Task GetUsersAsync_SortTies_AreBrokenByIdForStablePaging()
    {
        var ids = new List<Guid>();
        for (var i = 0; i < 5; i++)
        {
            var user = await SeedUserWith($"tie{i}@test.com", u => u.StorageUsedBytes = 42);
            ids.Add(user.Id);
        }

        var paged = new List<Guid>();
        for (var page = 1; page <= 3; page++)
        {
            var result = await _service.GetUsersAsync(
                new AdminUserQuery(Page: page, PageSize: 2, SortBy: "storage", SortDir: "asc"));
            paged.AddRange(result.Users.Select(u => u.Id));
        }

        Assert.Equal(ids.Order(), paged);
    }

    #endregion

    #region GetUserDetailAsync Tests

    [Fact]
    public async Task GetUserDetailAsync_NonExistentUser_ReturnsNull()
    {
        Assert.Null(await _service.GetUserDetailAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task GetUserDetailAsync_ReturnsSignInFlagsAndStatusDates()
    {
        var confirmedAt = Utc(2026, 2, 1);
        var disabledAt = Utc(2026, 2, 2);
        var user = await SeedUserWith("both@test.com", u =>
        {
            u.PasswordHash = "hash";
            u.EmailConfirmedAt = confirmedAt;
            u.DisabledAt = disabledAt;
        });
        var googleOnly = await SeedUserWith("google@test.com", u => u.PasswordHash = null);
        var passwordOnly = await SeedUserWith("password@test.com", u => { u.GoogleId = null; u.PasswordHash = "hash"; });

        var detail = await _service.GetUserDetailAsync(user.Id);
        var googleDetail = await _service.GetUserDetailAsync(googleOnly.Id);
        var passwordDetail = await _service.GetUserDetailAsync(passwordOnly.Id);

        Assert.NotNull(detail);
        Assert.True(detail.HasGoogleSignIn);
        Assert.True(detail.HasPassword);
        Assert.Equal(confirmedAt, detail.EmailConfirmedAt);
        Assert.Equal(disabledAt, detail.DisabledAt);
        Assert.True(detail.EmailConfirmed);
        Assert.True(detail.IsDisabled);
        Assert.True(googleDetail!.HasGoogleSignIn);
        Assert.False(googleDetail.HasPassword);
        Assert.False(passwordDetail!.HasGoogleSignIn);
        Assert.True(passwordDetail.HasPassword);
    }

    [Fact]
    public async Task GetUserDetailAsync_ReturnsOnlyTheUsersApiKeys()
    {
        var user = await SeedUser("keys@test.com");
        var other = await SeedUser("other@test.com");
        var lastUsed = Utc(2026, 6, 1);
        _context.ApiKeys.Add(new ApiKey { Id = Guid.NewGuid(), UserId = user.Id, Name = "CI", KeyHash = "h1", CreatedAt = Utc(2026, 1, 1), LastUsedAt = lastUsed });
        _context.ApiKeys.Add(new ApiKey { Id = Guid.NewGuid(), UserId = other.Id, Name = "Other", KeyHash = "h2", CreatedAt = Utc(2026, 1, 1) });
        await _context.SaveChangesAsync();

        var detail = await _service.GetUserDetailAsync(user.Id);

        var key = Assert.Single(detail!.ApiKeys);
        Assert.Equal("CI", key.Name);
        Assert.Equal(lastUsed, key.LastUsedAt);
    }

    [Fact]
    public async Task GetUserDetailAsync_ReturnsOwnedProjectsOnly()
    {
        var user = await SeedUserWith("owner@test.com", u => u.Username = "owner");
        var other = await SeedUserWith("someone@test.com", u => u.Username = "someone");
        var owned = new Project { Id = Guid.NewGuid(), Name = "Owned", Code = "owned", Visibility = ProjectVisibility.Public, CreatedAt = Utc(2026, 1, 1), UpdatedAt = DateTime.UtcNow };
        var collab = new Project { Id = Guid.NewGuid(), Name = "Collab", Code = "collab", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _context.Projects.AddRange(owned, collab);
        _context.UserProjects.Add(new UserProject { UserId = user.Id, ProjectId = owned.Id, Role = ProjectRole.Owner, JoinedAt = DateTime.UtcNow });
        _context.UserProjects.Add(new UserProject { UserId = other.Id, ProjectId = collab.Id, Role = ProjectRole.Owner, JoinedAt = DateTime.UtcNow });
        _context.UserProjects.Add(new UserProject { UserId = user.Id, ProjectId = collab.Id, Role = ProjectRole.Collaborator, JoinedAt = DateTime.UtcNow });
        _context.Components.Add(new Card { Id = Guid.NewGuid(), ProjectId = owned.Id, Name = "Card 1", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        _context.Components.Add(new Card { Id = Guid.NewGuid(), ProjectId = owned.Id, Name = "Card 2", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        await _context.SaveChangesAsync();

        var detail = await _service.GetUserDetailAsync(user.Id);

        Assert.NotNull(detail);
        Assert.Equal(1, detail.ProjectCount);
        var project = Assert.Single(detail.Projects);
        Assert.Equal(owned.Id, project.Id);
        Assert.Equal("Owned", project.Name);
        Assert.Equal("owned", project.Code);
        Assert.Equal("owner", project.OwnerUsername);
        Assert.Equal("Public", project.Visibility);
        Assert.Equal(2, project.ComponentCount);
        Assert.Equal(Utc(2026, 1, 1), project.CreatedAt);
    }

    #endregion

    #region Self-protection and Session Cache Tests

    [Fact]
    public async Task UpdateUserRoleAsync_OwnAccount_ReturnsInvalidAndDoesNotChangeRole()
    {
        var admin = await SeedUser("admin@test.com", role: UserRole.Administrator);

        var result = await _service.UpdateUserRoleAsync(admin.Id, admin.Id, "User");

        Assert.Equal(AdminActionStatus.Invalid, result.Status);
        Assert.NotNull(result.Error);
        _context.ChangeTracker.Clear();
        Assert.Equal(UserRole.Administrator, (await _context.Users.FindAsync(admin.Id))!.Role);
        _sessionCache.Verify(c => c.Invalidate(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task UpdateUserRoleAsync_Success_InvalidatesSessionCache()
    {
        var user = await SeedUser("test@test.com");

        await _service.UpdateUserRoleAsync(_adminId, user.Id, "Administrator");

        _sessionCache.Verify(c => c.Invalidate(user.Id), Times.Once);
    }

    #endregion

    #region UpdateUserNameAsync Tests

    [Fact]
    public async Task UpdateUserNameAsync_TrimsAndPersists()
    {
        var user = await SeedUser("test@test.com", "Old");

        var result = await _service.UpdateUserNameAsync(user.Id, "  New Name  ");

        Assert.Equal(AdminActionStatus.Success, result.Status);
        Assert.Equal("New Name", result.User!.Name);
        _context.ChangeTracker.Clear();
        Assert.Equal("New Name", (await _context.Users.FindAsync(user.Id))!.Name);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task UpdateUserNameAsync_Empty_ClearsName(string? name)
    {
        var user = await SeedUser("test@test.com", "Old");

        var result = await _service.UpdateUserNameAsync(user.Id, name);

        Assert.Equal(AdminActionStatus.Success, result.Status);
        Assert.Null(result.User!.Name);
    }

    [Fact]
    public async Task UpdateUserNameAsync_AtMaxLength_Succeeds()
    {
        var user = await SeedUser("test@test.com");

        var result = await _service.UpdateUserNameAsync(user.Id, new string('a', AdminService.MaxNameLength));

        Assert.Equal(AdminActionStatus.Success, result.Status);
    }

    [Fact]
    public async Task UpdateUserNameAsync_TooLong_ReturnsInvalidAndDoesNotChange()
    {
        var user = await SeedUser("test@test.com", "Old");

        var result = await _service.UpdateUserNameAsync(user.Id, new string('a', AdminService.MaxNameLength + 1));

        Assert.Equal(AdminActionStatus.Invalid, result.Status);
        _context.ChangeTracker.Clear();
        Assert.Equal("Old", (await _context.Users.FindAsync(user.Id))!.Name);
    }

    [Fact]
    public async Task UpdateUserNameAsync_NonExistentUser_ReturnsNotFound()
    {
        var result = await _service.UpdateUserNameAsync(Guid.NewGuid(), "Name");

        Assert.Equal(AdminActionStatus.NotFound, result.Status);
    }

    #endregion

    #region ResendConfirmationAsync Tests

    [Fact]
    public async Task ResendConfirmationAsync_UnconfirmedPasswordUser_SendsEmail()
    {
        var user = await SeedUserWith("pw@test.com", u => { u.PasswordHash = "hash"; u.EmailConfirmedAt = null; });

        var result = await _service.ResendConfirmationAsync(user.Id);

        Assert.Equal(AdminActionStatus.Success, result.Status);
        Assert.False(result.User!.EmailConfirmed);
        _emailConfirmation.Verify(s => s.SendAsync(It.Is<User>(u => u.Id == user.Id), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ResendConfirmationAsync_AlreadyConfirmed_ReturnsInvalid()
    {
        var user = await SeedUserWith("pw@test.com", u => { u.PasswordHash = "hash"; u.EmailConfirmedAt = DateTime.UtcNow; });

        var result = await _service.ResendConfirmationAsync(user.Id);

        Assert.Equal(AdminActionStatus.Invalid, result.Status);
        Assert.Contains("already confirmed", result.Error, StringComparison.OrdinalIgnoreCase);
        _emailConfirmation.Verify(s => s.SendAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ResendConfirmationAsync_NoPassword_ReturnsInvalid()
    {
        var user = await SeedUserWith("google@test.com", u => { u.PasswordHash = null; u.EmailConfirmedAt = null; });

        var result = await _service.ResendConfirmationAsync(user.Id);

        Assert.Equal(AdminActionStatus.Invalid, result.Status);
        Assert.Contains("password", result.Error, StringComparison.OrdinalIgnoreCase);
        _emailConfirmation.Verify(s => s.SendAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ResendConfirmationAsync_NonExistentUser_ReturnsNotFound()
    {
        var result = await _service.ResendConfirmationAsync(Guid.NewGuid());

        Assert.Equal(AdminActionStatus.NotFound, result.Status);
    }

    #endregion

    #region ConfirmEmailAsync Tests

    [Fact]
    public async Task ConfirmEmailAsync_SetsConfirmedAndClearsToken()
    {
        var user = await SeedUserWith("pw@test.com", u =>
        {
            u.PasswordHash = "hash";
            u.EmailConfirmedAt = null;
            u.EmailConfirmationTokenHash = "ABC";
            u.EmailConfirmationTokenExpiresAt = DateTime.UtcNow.AddHours(1);
        });

        var result = await _service.ConfirmEmailAsync(user.Id);

        Assert.Equal(AdminActionStatus.Success, result.Status);
        Assert.True(result.User!.EmailConfirmed);
        Assert.NotNull(result.User.EmailConfirmedAt);
        _context.ChangeTracker.Clear();
        var updated = (await _context.Users.FindAsync(user.Id))!;
        Assert.NotNull(updated.EmailConfirmedAt);
        Assert.Null(updated.EmailConfirmationTokenHash);
        Assert.Null(updated.EmailConfirmationTokenExpiresAt);
    }

    [Fact]
    public async Task ConfirmEmailAsync_AlreadyConfirmed_KeepsOriginalDate()
    {
        var confirmedAt = Utc(2026, 1, 1);
        var user = await SeedUserWith("pw@test.com", u => u.EmailConfirmedAt = confirmedAt);

        var result = await _service.ConfirmEmailAsync(user.Id);

        Assert.Equal(confirmedAt, result.User!.EmailConfirmedAt);
    }

    [Fact]
    public async Task ConfirmEmailAsync_NonExistentUser_ReturnsNotFound()
    {
        var result = await _service.ConfirmEmailAsync(Guid.NewGuid());

        Assert.Equal(AdminActionStatus.NotFound, result.Status);
    }

    #endregion

    #region SetUserDisabledAsync Tests

    [Fact]
    public async Task SetUserDisabledAsync_Disable_SetsDisabledAtAndInvalidatesCache()
    {
        var user = await SeedUser("test@test.com");

        var result = await _service.SetUserDisabledAsync(_adminId, user.Id, true);

        Assert.Equal(AdminActionStatus.Success, result.Status);
        Assert.True(result.User!.IsDisabled);
        Assert.NotNull(result.User.DisabledAt);
        _sessionCache.Verify(c => c.Invalidate(user.Id), Times.Once);
    }

    [Fact]
    public async Task SetUserDisabledAsync_Enable_ClearsDisabledAtAndInvalidatesCache()
    {
        var user = await SeedUserWith("test@test.com", u => u.DisabledAt = DateTime.UtcNow);

        var result = await _service.SetUserDisabledAsync(_adminId, user.Id, false);

        Assert.Equal(AdminActionStatus.Success, result.Status);
        Assert.False(result.User!.IsDisabled);
        Assert.Null(result.User.DisabledAt);
        _context.ChangeTracker.Clear();
        Assert.Null((await _context.Users.FindAsync(user.Id))!.DisabledAt);
        _sessionCache.Verify(c => c.Invalidate(user.Id), Times.Once);
    }

    [Fact]
    public async Task SetUserDisabledAsync_AlreadyDisabled_KeepsOriginalDate()
    {
        var disabledAt = Utc(2026, 1, 1);
        var user = await SeedUserWith("test@test.com", u => u.DisabledAt = disabledAt);

        var result = await _service.SetUserDisabledAsync(_adminId, user.Id, true);

        Assert.Equal(disabledAt, result.User!.DisabledAt);
    }

    [Fact]
    public async Task SetUserDisabledAsync_OwnAccount_ReturnsInvalidAndDoesNotDisable()
    {
        var admin = await SeedUser("admin@test.com", role: UserRole.Administrator);

        var result = await _service.SetUserDisabledAsync(admin.Id, admin.Id, true);

        Assert.Equal(AdminActionStatus.Invalid, result.Status);
        Assert.NotNull(result.Error);
        _context.ChangeTracker.Clear();
        Assert.Null((await _context.Users.FindAsync(admin.Id))!.DisabledAt);
        _sessionCache.Verify(c => c.Invalidate(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task SetUserDisabledAsync_NonExistentUser_ReturnsNotFound()
    {
        var result = await _service.SetUserDisabledAsync(_adminId, Guid.NewGuid(), true);

        Assert.Equal(AdminActionStatus.NotFound, result.Status);
    }

    #endregion

    #region RevokeApiKeyAsync Tests

    private async Task<ApiKey> SeedApiKey(Guid userId)
    {
        var key = new ApiKey { Id = Guid.NewGuid(), UserId = userId, Name = "Key", KeyHash = Guid.NewGuid().ToString(), CreatedAt = DateTime.UtcNow };
        _context.ApiKeys.Add(key);
        await _context.SaveChangesAsync();
        return key;
    }

    [Fact]
    public async Task RevokeApiKeyAsync_OwnKey_DeletesIt()
    {
        var user = await SeedUser("test@test.com");
        var key = await SeedApiKey(user.Id);

        var revoked = await _service.RevokeApiKeyAsync(user.Id, key.Id);

        Assert.True(revoked);
        _context.ChangeTracker.Clear();
        Assert.False(await _context.ApiKeys.AnyAsync(k => k.Id == key.Id));
    }

    [Fact]
    public async Task RevokeApiKeyAsync_KeyBelongingToAnotherUser_ReturnsFalseAndKeepsKey()
    {
        var user = await SeedUser("test@test.com");
        var other = await SeedUser("other@test.com");
        var otherKey = await SeedApiKey(other.Id);

        var revoked = await _service.RevokeApiKeyAsync(user.Id, otherKey.Id);

        Assert.False(revoked);
        _context.ChangeTracker.Clear();
        Assert.True(await _context.ApiKeys.AnyAsync(k => k.Id == otherKey.Id));
    }

    [Fact]
    public async Task RevokeApiKeyAsync_UnknownKey_ReturnsFalse()
    {
        var user = await SeedUser("test@test.com");

        Assert.False(await _service.RevokeApiKeyAsync(user.Id, Guid.NewGuid()));
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
