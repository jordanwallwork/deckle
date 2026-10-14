using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Deckle.API.Auth;

/// <summary>
/// The account state that can change underneath an existing cookie session.
/// </summary>
public record UserSessionState(DateTime? DisabledAt, UserRole Role)
{
    public bool IsDisabled => DisabledAt != null;
}

/// <summary>
/// Short-lived cache of <see cref="UserSessionState"/> used to re-validate cookie sessions
/// without hitting the database on every request.
/// </summary>
public interface IUserSessionCache
{
    /// <summary>
    /// Returns the user's current session state, or null if the user no longer exists.
    /// </summary>
    public Task<UserSessionState?> GetAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Evicts the cached state for a user. Call after changing a user's role or disabled status
    /// so their open sessions pick up the change on the next request.
    /// </summary>
    public void Invalidate(Guid userId);
}

public class UserSessionCache : IUserSessionCache
{
    internal static readonly TimeSpan CacheDuration = TimeSpan.FromSeconds(60);

    private readonly IMemoryCache _cache;
    private readonly AppDbContext _dbContext;

    public UserSessionCache(IMemoryCache cache, AppDbContext dbContext)
    {
        _cache = cache;
        _dbContext = dbContext;
    }

    public async Task<UserSessionState?> GetAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var key = CacheKey(userId);
        if (_cache.TryGetValue(key, out UserSessionState? cached))
        {
            return cached;
        }

        var state = await _dbContext.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new UserSessionState(u.DisabledAt, u.Role))
            .FirstOrDefaultAsync(cancellationToken);

        _cache.Set(key, state, CacheDuration);
        return state;
    }

    public void Invalidate(Guid userId) => _cache.Remove(CacheKey(userId));

    private static string CacheKey(Guid userId) => $"user-session:{userId}";
}
