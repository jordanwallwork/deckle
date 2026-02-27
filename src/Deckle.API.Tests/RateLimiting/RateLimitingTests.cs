using Deckle.API.Extensions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Net;
using System.Security.Claims;
using System.Text.Encodings.Web;

namespace Deckle.API.Tests.RateLimiting;

// ---------------------------------------------------------------------------
// Registration tests — pure DI, no HTTP
// ---------------------------------------------------------------------------

public class RateLimitingRegistrationTests
{
    [Fact]
    public void AddDeckleRateLimiting_ReturnsSameServiceCollection()
    {
        var services = new ServiceCollection();

        var result = services.AddDeckleRateLimiting();

        Assert.Same(services, result);
    }

    [Fact]
    public void AddDeckleRateLimiting_RegistersMoreServicesThanEmpty()
    {
        var countBefore = new ServiceCollection().Count;
        var services = new ServiceCollection();

        services.AddDeckleRateLimiting();

        Assert.True(services.Count > countBefore);
    }

    [Fact]
    public void AddDeckleRateLimiting_RegistersRateLimiterOptions()
    {
        var services = new ServiceCollection();
        services.AddDeckleRateLimiting();
        var sp = services.BuildServiceProvider();

        var options = sp.GetService<IOptions<RateLimiterOptions>>();

        Assert.NotNull(options);
    }

    [Fact]
    public void AddDeckleRateLimiting_Sets429RejectionStatusCode()
    {
        var services = new ServiceCollection();
        services.AddDeckleRateLimiting();
        var sp = services.BuildServiceProvider();

        var options = sp.GetRequiredService<IOptions<RateLimiterOptions>>().Value;

        Assert.Equal(StatusCodes.Status429TooManyRequests, options.RejectionStatusCode);
    }
}

// ---------------------------------------------------------------------------
// Behavior tests — in-process TestServer, verifies HTTP 429 enforcement
// ---------------------------------------------------------------------------

/// <summary>
/// Minimal authentication handler that creates a user principal from the
/// X-Test-User-Id request header. Used only in tests to inject a known
/// ClaimTypes.NameIdentifier without a real auth flow.
/// </summary>
internal sealed class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var userId = Request.Headers["X-Test-User-Id"].FirstOrDefault();
        if (string.IsNullOrEmpty(userId))
            return Task.FromResult(AuthenticateResult.NoResult());

        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, userId) };
        var identity = new ClaimsIdentity(claims, "Test");
        var ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), "Test");
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}

/// <summary>
/// Shared WebApplication for rate-limiting behavior tests.
/// A single instance is used across all tests; each test uses a unique
/// user ID so the rate limiter buckets never overlap between tests.
/// </summary>
public sealed class RateLimitingFixture : IAsyncLifetime
{
    public HttpClient Client { get; private set; } = null!;
    private WebApplication _app = null!;

    public async Task InitializeAsync()
    {
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseTestServer();

        // Minimal auth so partition key reads context.User.NameIdentifier
        builder.Services
            .AddAuthentication("Test")
            .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", _ => { });
        builder.Services.AddAuthorization();
        builder.Services.AddDeckleRateLimiting();

        _app = builder.Build();
        _app.UseAuthentication();
        _app.UseAuthorization();
        _app.UseRateLimiter();

        // Endpoints mirror the real app's rate limiting policy assignments
        _app.MapGet("/strict", () => Results.Ok())
            .RequireRateLimiting("strict")
            .AllowAnonymous();

        _app.MapGet("/invite", () => Results.Ok())
            .RequireRateLimiting("invite")
            .AllowAnonymous();

        await _app.StartAsync();
        Client = _app.GetTestClient();
    }

    public async Task DisposeAsync()
    {
        Client.Dispose();
        await _app.StopAsync();
        await _app.DisposeAsync();
    }
}

public class RateLimitingBehaviorTests(RateLimitingFixture fixture)
    : IClassFixture<RateLimitingFixture>
{
    private readonly HttpClient _client = fixture.Client;

    /// <summary>Sends a single request and returns the response. Caller owns the response.</summary>
    private async Task<HttpResponseMessage> SendAsync(string path, string userId)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, path);
        request.Headers.Add("X-Test-User-Id", userId);
        return await _client.SendAsync(request);
    }

    /// <summary>Exhausts <paramref name="count"/> permits from the bucket for the given user+path.</summary>
    private async Task ExhaustAsync(string path, string userId, int count)
    {
        for (int i = 0; i < count; i++)
            (await SendAsync(path, userId)).Dispose();
    }

    // -- strict policy: 10 requests per minute per user --

    [Fact]
    public async Task StrictPolicy_AllowsTenRequestsForSameUser()
    {
        var userId = Guid.NewGuid().ToString();

        for (int i = 0; i < 10; i++)
        {
            using var response = await SendAsync("/strict", userId);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }

    [Fact]
    public async Task StrictPolicy_RejectsEleventhRequestForSameUser()
    {
        var userId = Guid.NewGuid().ToString();
        await ExhaustAsync("/strict", userId, 10);

        using var response = await SendAsync("/strict", userId);
        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
    }

    [Fact]
    public async Task StrictPolicy_DifferentUsersHaveIndependentBuckets()
    {
        var userA = Guid.NewGuid().ToString();
        var userB = Guid.NewGuid().ToString();

        await ExhaustAsync("/strict", userA, 10);

        using var responseA = await SendAsync("/strict", userA);
        Assert.Equal(HttpStatusCode.TooManyRequests, responseA.StatusCode);

        // User B's bucket is untouched
        using var responseB = await SendAsync("/strict", userB);
        Assert.Equal(HttpStatusCode.OK, responseB.StatusCode);
    }

    [Fact]
    public async Task StrictPolicy_UnauthenticatedRequestsAreAllowed()
    {
        // IP-based fallback — anonymous requests are served until their IP bucket fills
        using var response = await _client.GetAsync("/strict");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // -- invite policy: 5 requests per 10 minutes per user --

    [Fact]
    public async Task InvitePolicy_AllowsFiveRequestsForSameUser()
    {
        var userId = Guid.NewGuid().ToString();

        for (int i = 0; i < 5; i++)
        {
            using var response = await SendAsync("/invite", userId);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }

    [Fact]
    public async Task InvitePolicy_RejectsSixthRequestForSameUser()
    {
        var userId = Guid.NewGuid().ToString();
        await ExhaustAsync("/invite", userId, 5);

        using var response = await SendAsync("/invite", userId);
        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
    }

    [Fact]
    public async Task InvitePolicy_DifferentUsersHaveIndependentBuckets()
    {
        var userA = Guid.NewGuid().ToString();
        var userB = Guid.NewGuid().ToString();

        await ExhaustAsync("/invite", userA, 5);

        using var responseA = await SendAsync("/invite", userA);
        Assert.Equal(HttpStatusCode.TooManyRequests, responseA.StatusCode);

        using var responseB = await SendAsync("/invite", userB);
        Assert.Equal(HttpStatusCode.OK, responseB.StatusCode);
    }

    [Fact]
    public async Task InvitePolicy_IsStricterThanStrictPolicy()
    {
        // Invite cap (5) is lower than strict cap (10): the 6th invite request is rejected
        // while the same 6 strict requests would still be allowed.
        var userId = Guid.NewGuid().ToString();
        await ExhaustAsync("/invite", userId, 5);

        using var inviteResponse = await SendAsync("/invite", userId);
        Assert.Equal(HttpStatusCode.TooManyRequests, inviteResponse.StatusCode);
    }
}
