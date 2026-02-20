using System.Security.Claims;
using Deckle.API.Filters;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;

namespace Deckle.API.Tests.Filters;

public class RequireUserIdFilterTests
{
    private readonly RequireUserIdFilter _filter = new();

    private static EndpointFilterInvocationContext CreateFilterContext(HttpContext httpContext)
    {
        return EndpointFilterInvocationContext.Create(httpContext);
    }

    private static ClaimsPrincipal AuthenticatedUser(params Claim[] claims)
    {
        return new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));
    }

    private static async Task<int?> GetStatusCode(object? result)
    {
        if (result is IResult iResult)
        {
            var ctx = new DefaultHttpContext();
            
            // Mock the ServiceProvider to prevent ArgumentNullException when results 
            // try to access services from HttpContext.RequestServices (e.g., ProblemDetails)
            var serviceProvider = new Mock<IServiceProvider>();
            var loggerFactory = new Mock<ILoggerFactory>();
            var logger = new Mock<ILogger>();
            
            loggerFactory
                .Setup(x => x.CreateLogger(It.IsAny<string>()))
                .Returns(logger.Object);
            
            serviceProvider
                .Setup(x => x.GetService(typeof(ILoggerFactory)))
                .Returns(loggerFactory.Object);
            
            ctx.RequestServices = serviceProvider.Object;
            
            ctx.Response.Body = new MemoryStream();
            await iResult.ExecuteAsync(ctx);
            return ctx.Response.StatusCode;
        }
        return null;
    }

    #region InvokeAsync — Unauthorized Cases

    [Fact]
    public async Task InvokeAsync_UnauthenticatedUser_ReturnsUnauthorized()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.User = new ClaimsPrincipal(new ClaimsIdentity()); // not authenticated
        var filterContext = CreateFilterContext(httpContext);

        var result = await _filter.InvokeAsync(filterContext, _ => ValueTask.FromResult<object?>(Results.Ok()));

        Assert.Equal(401, await GetStatusCode(result));
    }

    [Fact]
    public async Task InvokeAsync_AuthenticatedWithNoUserIdClaim_ReturnsUnauthorized()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.User = AuthenticatedUser(new Claim(ClaimTypes.Email, "test@test.com"));
        var filterContext = CreateFilterContext(httpContext);

        var result = await _filter.InvokeAsync(filterContext, _ => ValueTask.FromResult<object?>(Results.Ok()));

        Assert.Equal(401, await GetStatusCode(result));
    }

    [Fact]
    public async Task InvokeAsync_AuthenticatedWithInvalidGuidInUserIdClaim_ReturnsUnauthorized()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.User = AuthenticatedUser(new Claim("user_id", "not-a-valid-guid"));
        var filterContext = CreateFilterContext(httpContext);

        var result = await _filter.InvokeAsync(filterContext, _ => ValueTask.FromResult<object?>(Results.Ok()));

        Assert.Equal(401, await GetStatusCode(result));
    }

    [Fact]
    public async Task InvokeAsync_AuthenticatedWithEmptyUserIdClaim_ReturnsUnauthorized()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.User = AuthenticatedUser(new Claim("user_id", ""));
        var filterContext = CreateFilterContext(httpContext);

        var result = await _filter.InvokeAsync(filterContext, _ => ValueTask.FromResult<object?>(Results.Ok()));

        Assert.Equal(401, await GetStatusCode(result));
    }

    [Fact]
    public async Task InvokeAsync_UnauthenticatedUser_DoesNotCallNextDelegate()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.User = new ClaimsPrincipal(new ClaimsIdentity());
        var filterContext = CreateFilterContext(httpContext);

        var nextCalled = false;
        EndpointFilterDelegate next = _ =>
        {
            nextCalled = true;
            return ValueTask.FromResult<object?>(Results.Ok());
        };

        await _filter.InvokeAsync(filterContext, next);

        Assert.False(nextCalled);
    }

    #endregion

    #region InvokeAsync — Authorized Cases

    [Fact]
    public async Task InvokeAsync_ValidUserId_CallsNextDelegate()
    {
        var httpContext = new DefaultHttpContext();
        var userId = Guid.NewGuid();
        httpContext.User = AuthenticatedUser(new Claim("user_id", userId.ToString()));
        var filterContext = CreateFilterContext(httpContext);

        var nextCalled = false;
        EndpointFilterDelegate next = _ =>
        {
            nextCalled = true;
            return ValueTask.FromResult<object?>(Results.Ok());
        };

        await _filter.InvokeAsync(filterContext, next);

        Assert.True(nextCalled);
    }

    [Fact]
    public async Task InvokeAsync_ValidUserId_StoresUserIdInHttpContextItems()
    {
        var httpContext = new DefaultHttpContext();
        var userId = Guid.NewGuid();
        httpContext.User = AuthenticatedUser(new Claim("user_id", userId.ToString()));
        var filterContext = CreateFilterContext(httpContext);

        await _filter.InvokeAsync(filterContext, _ => ValueTask.FromResult<object?>(Results.Ok()));

        Assert.True(httpContext.Items.TryGetValue("UserId", out var stored));
        Assert.Equal(userId, stored);
    }

    [Fact]
    public async Task InvokeAsync_ValidUserId_StoredValueIsGuid()
    {
        var httpContext = new DefaultHttpContext();
        var userId = Guid.NewGuid();
        httpContext.User = AuthenticatedUser(new Claim("user_id", userId.ToString()));
        var filterContext = CreateFilterContext(httpContext);

        await _filter.InvokeAsync(filterContext, _ => ValueTask.FromResult<object?>(Results.Ok()));

        Assert.IsType<Guid>(httpContext.Items["UserId"]);
    }

    [Fact]
    public async Task InvokeAsync_ValidUserId_ReturnsResultFromNextDelegate()
    {
        var httpContext = new DefaultHttpContext();
        var userId = Guid.NewGuid();
        httpContext.User = AuthenticatedUser(new Claim("user_id", userId.ToString()));
        var filterContext = CreateFilterContext(httpContext);

        var expectedResult = Results.Ok("expected");
        var result = await _filter.InvokeAsync(filterContext, _ => ValueTask.FromResult<object?>(expectedResult));

        Assert.Same(expectedResult, result);
    }

    [Fact]
    public async Task InvokeAsync_ValidUserId_DoesNotStoreStringInItems()
    {
        var httpContext = new DefaultHttpContext();
        var userId = Guid.NewGuid();
        httpContext.User = AuthenticatedUser(new Claim("user_id", userId.ToString()));
        var filterContext = CreateFilterContext(httpContext);

        await _filter.InvokeAsync(filterContext, _ => ValueTask.FromResult<object?>(Results.Ok()));

        // Must be a Guid, not the raw string
        Assert.IsNotType<string>(httpContext.Items["UserId"]);
    }

    #endregion
}

public class RequireUserIdFilterExtensionsGetUserIdTests
{
    #region GetUserId Tests

    [Fact]
    public void GetUserId_UserIdPresentInItems_ReturnsCorrectGuid()
    {
        var httpContext = new DefaultHttpContext();
        var userId = Guid.NewGuid();
        httpContext.Items["UserId"] = userId;

        var result = httpContext.GetUserId();

        Assert.Equal(userId, result);
    }

    [Fact]
    public void GetUserId_UserIdNotInItems_ThrowsInvalidOperationException()
    {
        var httpContext = new DefaultHttpContext();

        Assert.Throws<InvalidOperationException>(() => httpContext.GetUserId());
    }

    [Fact]
    public void GetUserId_UserIdIsStringNotGuid_ThrowsInvalidOperationException()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Items["UserId"] = Guid.NewGuid().ToString();

        Assert.Throws<InvalidOperationException>(() => httpContext.GetUserId());
    }

    [Fact]
    public void GetUserId_UserIdIsNull_ThrowsInvalidOperationException()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Items["UserId"] = null;

        Assert.Throws<InvalidOperationException>(() => httpContext.GetUserId());
    }

    [Fact]
    public void GetUserId_UserIdIsInteger_ThrowsInvalidOperationException()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Items["UserId"] = 42;

        Assert.Throws<InvalidOperationException>(() => httpContext.GetUserId());
    }

    [Fact]
    public void GetUserId_ExceptionMessage_MentionsRequireUserId()
    {
        var httpContext = new DefaultHttpContext();

        var ex = Assert.Throws<InvalidOperationException>(() => httpContext.GetUserId());

        Assert.Contains("RequireUserId", ex.Message, StringComparison.Ordinal);
    }

    #endregion
}
