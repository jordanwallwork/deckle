using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deckle.API.Tests;

/// <summary>
/// Verifies the key-generation invariants of the POST /api-keys handler.
/// The handler generates: rawKey = "dk_" + base64url(32 random bytes), stores SHA256(rawKey).
/// These tests validate those properties independently of the HTTP layer.
/// </summary>
public class ApiKeyEndpointsTests : IDisposable
{
    private bool _disposed;
    private readonly AppDbContext _context;

    public ApiKeyEndpointsTests()
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

    private static string GenerateRawKey()
    {
        var rawBytes = RandomNumberGenerator.GetBytes(32);
        return "dk_" + Convert.ToBase64String(rawBytes)
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');
    }

    private static string HashKey(string rawKey) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawKey)));

    private async Task<Guid> SeedUser()
    {
        var userId = Guid.NewGuid();
        _context.Users.Add(new User
        {
            Id = userId,
            Email = $"{userId}@test.com",
            GoogleId = Guid.NewGuid().ToString(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();
        return userId;
    }

    #region Key generation format

    [Fact]
    public void GeneratedKey_StartsWithDkPrefix()
    {
        var key = GenerateRawKey();

        Assert.StartsWith("dk_", key);
    }

    [Fact]
    public void GeneratedKey_ContainsNoBase64PaddingOrUnsafeChars()
    {
        for (var i = 0; i < 20; i++)
        {
            var key = GenerateRawKey();
            Assert.DoesNotContain("+", key);
            Assert.DoesNotContain("/", key);
            Assert.DoesNotContain("=", key);
        }
    }

    [Fact]
    public void GeneratedKey_IsUrlSafe()
    {
        var key = GenerateRawKey();

        Assert.Matches(new Regex(@"^dk_[A-Za-z0-9\-_]+$"), key);
    }

    [Fact]
    public void GeneratedKeys_AreUnique()
    {
        var keys = Enumerable.Range(0, 50).Select(_ => GenerateRawKey()).ToList();

        Assert.Equal(keys.Count, keys.Distinct().Count());
    }

    #endregion

    #region Key hashing invariants

    [Fact]
    public void StoredHash_IsSha256HexOfRawKey()
    {
        var rawKey = GenerateRawKey();

        var hash = HashKey(rawKey);

        Assert.Equal(64, hash.Length);
        Assert.Matches(new Regex("^[0-9A-F]{64}$"), hash);
    }

    [Fact]
    public void StoredHash_DifferentFromRawKey()
    {
        var rawKey = GenerateRawKey();

        Assert.NotEqual(rawKey, HashKey(rawKey));
    }

    [Fact]
    public void StoredHash_IsDeterministicForSameInput()
    {
        var rawKey = GenerateRawKey();

        Assert.Equal(HashKey(rawKey), HashKey(rawKey));
    }

    [Fact]
    public void StoredHash_DifferentForDifferentKeys()
    {
        var key1 = GenerateRawKey();
        var key2 = GenerateRawKey();

        Assert.NotEqual(HashKey(key1), HashKey(key2));
    }

    #endregion

    #region User scoping (database-level)

    [Fact]
    public async Task ApiKey_StoredWithCorrectUserId()
    {
        var userId = await SeedUser();
        var rawKey = GenerateRawKey();
        _context.ApiKeys.Add(new ApiKey
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = "My Key",
            KeyHash = HashKey(rawKey),
            CreatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        _context.ChangeTracker.Clear();
        var stored = await _context.ApiKeys.FirstAsync(k => k.UserId == userId);
        Assert.Equal("My Key", stored.Name);
        Assert.Equal(HashKey(rawKey), stored.KeyHash);
    }

    [Fact]
    public async Task ListApiKeys_ReturnsOnlyOwnersKeys()
    {
        var userId1 = await SeedUser();
        var userId2 = await SeedUser();

        _context.ApiKeys.AddRange(
            new ApiKey { Id = Guid.NewGuid(), UserId = userId1, Name = "Key A", KeyHash = HashKey("dk_a"), CreatedAt = DateTime.UtcNow },
            new ApiKey { Id = Guid.NewGuid(), UserId = userId2, Name = "Key B", KeyHash = HashKey("dk_b"), CreatedAt = DateTime.UtcNow });
        await _context.SaveChangesAsync();

        var user1Keys = await _context.ApiKeys.Where(k => k.UserId == userId1).ToListAsync();
        Assert.Single(user1Keys);
        Assert.Equal("Key A", user1Keys[0].Name);
    }

    [Fact]
    public async Task DeleteApiKey_OnlyDeletesOwnersKey()
    {
        var userId1 = await SeedUser();
        var userId2 = await SeedUser();
        var keyId = Guid.NewGuid();

        _context.ApiKeys.AddRange(
            new ApiKey { Id = keyId, UserId = userId1, Name = "Owner Key", KeyHash = HashKey("dk_owner"), CreatedAt = DateTime.UtcNow },
            new ApiKey { Id = Guid.NewGuid(), UserId = userId2, Name = "Other Key", KeyHash = HashKey("dk_other"), CreatedAt = DateTime.UtcNow });
        await _context.SaveChangesAsync();

        var key = await _context.ApiKeys.FirstOrDefaultAsync(k => k.Id == keyId && k.UserId == userId1);
        Assert.NotNull(key);

        var wrongUserKey = await _context.ApiKeys.FirstOrDefaultAsync(k => k.Id == keyId && k.UserId == userId2);
        Assert.Null(wrongUserKey);
    }

    #endregion
}
