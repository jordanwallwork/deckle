using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using Deckle.API.Auth;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;

namespace Deckle.API.Tests.Auth;

public class ApiKeyAuthenticationHandlerTests : IDisposable
{
    private bool _disposed;
    private readonly AppDbContext _context;

    public ApiKeyAuthenticationHandlerTests()
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

    private async Task<ApiKeyAuthenticationHandler> CreateHandlerAsync(DefaultHttpContext httpContext)
    {
        var optionsMock = new Mock<IOptionsMonitor<AuthenticationSchemeOptions>>();
        optionsMock.Setup(o => o.Get(ApiKeyAuthenticationHandler.SchemeName))
            .Returns(new AuthenticationSchemeOptions());

        var handler = new ApiKeyAuthenticationHandler(
            optionsMock.Object,
            new NullLoggerFactory(),
            UrlEncoder.Default,
            _context);

        var scheme = new AuthenticationScheme(
            ApiKeyAuthenticationHandler.SchemeName,
            null,
            typeof(ApiKeyAuthenticationHandler));

        await handler.InitializeAsync(scheme, httpContext);
        return handler;
    }

    private static string HashKey(string rawKey) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawKey)));

    private async Task<(User user, string rawKey)> SeedUserWithApiKey(
        string email = "user@test.com",
        string username = "testuser",
        string rawKey = "dk_testkey123")
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            Username = username,
            GoogleId = Guid.NewGuid().ToString(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Users.Add(user);
        _context.ApiKeys.Add(new ApiKey
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Test Key",
            KeyHash = HashKey(rawKey),
            CreatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();
        return (user, rawKey);
    }

    #region Missing / invalid header

    [Fact]
    public async Task HandleAuthenticate_MissingHeader_ReturnsFail()
    {
        var httpContext = new DefaultHttpContext();
        var handler = await CreateHandlerAsync(httpContext);

        var result = await handler.AuthenticateAsync();

        Assert.False(result.Succeeded);
        Assert.Contains("Missing", result.Failure!.Message);
    }

    [Fact]
    public async Task HandleAuthenticate_EmptyHeader_ReturnsFail()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["X-API-Key"] = "   ";
        var handler = await CreateHandlerAsync(httpContext);

        var result = await handler.AuthenticateAsync();

        Assert.False(result.Succeeded);
        Assert.Contains("Empty", result.Failure!.Message);
    }

    [Fact]
    public async Task HandleAuthenticate_KeyNotInDatabase_ReturnsFail()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["X-API-Key"] = "dk_nosuchkey";
        var handler = await CreateHandlerAsync(httpContext);

        var result = await handler.AuthenticateAsync();

        Assert.False(result.Succeeded);
        Assert.Contains("Invalid", result.Failure!.Message);
    }

    #endregion

    #region Valid key

    [Fact]
    public async Task HandleAuthenticate_ValidKey_ReturnsSuccess()
    {
        var (_, rawKey) = await SeedUserWithApiKey();
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["X-API-Key"] = rawKey;
        var handler = await CreateHandlerAsync(httpContext);

        var result = await handler.AuthenticateAsync();

        Assert.True(result.Succeeded);
    }

    [Fact]
    public async Task HandleAuthenticate_ValidKey_PrincipalHasUserIdClaim()
    {
        var (user, rawKey) = await SeedUserWithApiKey();
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["X-API-Key"] = rawKey;
        var handler = await CreateHandlerAsync(httpContext);

        var result = await handler.AuthenticateAsync();

        var userIdClaim = result.Principal!.FindFirst("user_id")?.Value;
        Assert.Equal(user.Id.ToString(), userIdClaim);
    }

    [Fact]
    public async Task HandleAuthenticate_ValidKey_PrincipalHasEmailClaim()
    {
        var (user, rawKey) = await SeedUserWithApiKey(email: "alice@example.com");
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["X-API-Key"] = rawKey;
        var handler = await CreateHandlerAsync(httpContext);

        var result = await handler.AuthenticateAsync();

        Assert.Equal("alice@example.com", result.Principal!.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value);
    }

    [Fact]
    public async Task HandleAuthenticate_ValidKey_PrincipalHasUsernameClaim()
    {
        var (_, rawKey) = await SeedUserWithApiKey(username: "jdoe");
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["X-API-Key"] = rawKey;
        var handler = await CreateHandlerAsync(httpContext);

        var result = await handler.AuthenticateAsync();

        Assert.Equal("jdoe", result.Principal!.FindFirst("username")?.Value);
    }

    [Fact]
    public async Task HandleAuthenticate_ValidKey_UpdatesLastUsedAt()
    {
        var (user, rawKey) = await SeedUserWithApiKey();
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["X-API-Key"] = rawKey;
        var handler = await CreateHandlerAsync(httpContext);

        await handler.AuthenticateAsync();

        _context.ChangeTracker.Clear();
        var key = await _context.ApiKeys.FirstAsync(k => k.UserId == user.Id);
        Assert.NotNull(key.LastUsedAt);
        Assert.True(key.LastUsedAt > DateTime.UtcNow.AddSeconds(-5));
    }

    [Fact]
    public async Task HandleAuthenticate_WrongKey_DoesNotAuthenticate()
    {
        await SeedUserWithApiKey(rawKey: "dk_correctkey");
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["X-API-Key"] = "dk_wrongkey";
        var handler = await CreateHandlerAsync(httpContext);

        var result = await handler.AuthenticateAsync();

        Assert.False(result.Succeeded);
    }

    #endregion
}
