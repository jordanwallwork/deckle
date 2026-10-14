using Deckle.API.Auth;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Deckle.API.Tests.Auth;

public class UserSessionCacheTests : IDisposable
{
    private bool _disposed;
    private readonly AppDbContext _context;
    private readonly MemoryCache _memoryCache = new(new MemoryCacheOptions());
    private readonly UserSessionCache _cache;

    public UserSessionCacheTests()
    {
        _context = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);
        _cache = new UserSessionCache(_memoryCache, _context);
    }

    private async Task<User> SeedUser(UserRole role = UserRole.User)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "user@test.com",
            Role = role,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        return user;
    }

    [Fact]
    public async Task GetAsync_ExistingUser_ReturnsRoleAndDisabledState()
    {
        var user = await SeedUser(UserRole.Administrator);

        var state = await _cache.GetAsync(user.Id);

        Assert.NotNull(state);
        Assert.Equal(UserRole.Administrator, state.Role);
        Assert.False(state.IsDisabled);
    }

    [Fact]
    public async Task GetAsync_UnknownUser_ReturnsNull()
    {
        var state = await _cache.GetAsync(Guid.NewGuid());

        Assert.Null(state);
    }

    [Fact]
    public async Task GetAsync_CachesStateUntilInvalidated()
    {
        var user = await SeedUser();
        await _cache.GetAsync(user.Id);

        user.DisabledAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var cached = await _cache.GetAsync(user.Id);
        Assert.False(cached!.IsDisabled);

        _cache.Invalidate(user.Id);

        var refreshed = await _cache.GetAsync(user.Id);
        Assert.True(refreshed!.IsDisabled);
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
            {
                _context.Dispose();
                _memoryCache.Dispose();
            }
            _disposed = true;
        }
    }
}
