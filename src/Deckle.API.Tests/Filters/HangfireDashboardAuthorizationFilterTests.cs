using System.Security.Claims;
using Deckle.API.Filters;
using Hangfire;
using Hangfire.AspNetCore;
using Hangfire.Dashboard;
using Microsoft.AspNetCore.Http;
using Moq;

namespace Deckle.API.Tests.Filters;

public class HangfireDashboardAuthorizationFilterTests
{
    private readonly HangfireDashboardAuthorizationFilter _filter = new();

    private static DashboardContext CreateDashboardContext(HttpContext httpContext)
    {
        var storage = new Mock<JobStorage>();
        var options = new DashboardOptions();
        
        // Mock the ServiceProvider to prevent ArgumentNullException when AspNetCoreDashboardContext 
        // tries to access services from HttpContext.RequestServices
        var serviceProvider = new Mock<IServiceProvider>();
        httpContext.RequestServices = serviceProvider.Object;
        
        return new AspNetCoreDashboardContext(storage.Object, options, httpContext);
    }

    private static ClaimsPrincipal AuthenticatedUser(params Claim[] claims)
    {
        return new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));
    }

    #region Unauthenticated Cases

    [Fact]
    public void Authorize_UnauthenticatedUser_ReturnsFalse()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.User = new ClaimsPrincipal(new ClaimsIdentity()); // IsAuthenticated = false
        var dashboardContext = CreateDashboardContext(httpContext);

        var result = _filter.Authorize(dashboardContext);

        Assert.False(result);
    }

    [Fact]
    public void Authorize_UserWithNoIdentities_ReturnsFalse()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.User = new ClaimsPrincipal(); // empty principal
        var dashboardContext = CreateDashboardContext(httpContext);

        var result = _filter.Authorize(dashboardContext);

        Assert.False(result);
    }

    #endregion

    #region Authenticated But Unauthorized Cases

    [Fact]
    public void Authorize_AuthenticatedUserWithNoRoles_ReturnsFalse()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.User = AuthenticatedUser(); // authenticated, no role claims
        var dashboardContext = CreateDashboardContext(httpContext);

        var result = _filter.Authorize(dashboardContext);

        Assert.False(result);
    }

    [Fact]
    public void Authorize_AuthenticatedUserWithUserRole_ReturnsFalse()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.User = AuthenticatedUser(new Claim(ClaimTypes.Role, "User"));
        var dashboardContext = CreateDashboardContext(httpContext);

        var result = _filter.Authorize(dashboardContext);

        Assert.False(result);
    }

    [Fact]
    public void Authorize_AuthenticatedUserWithEditorRole_ReturnsFalse()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.User = AuthenticatedUser(new Claim(ClaimTypes.Role, "Editor"));
        var dashboardContext = CreateDashboardContext(httpContext);

        var result = _filter.Authorize(dashboardContext);

        Assert.False(result);
    }

    [Fact]
    public void Authorize_AuthenticatedUserWithAdministratorSubstring_ReturnsFalse()
    {
        // "Admin" is not "Administrator"
        var httpContext = new DefaultHttpContext();
        httpContext.User = AuthenticatedUser(new Claim(ClaimTypes.Role, "Admin"));
        var dashboardContext = CreateDashboardContext(httpContext);

        var result = _filter.Authorize(dashboardContext);

        Assert.False(result);
    }

    #endregion

    #region Authorized Cases

    [Fact]
    public void Authorize_AuthenticatedAdministrator_ReturnsTrue()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.User = AuthenticatedUser(new Claim(ClaimTypes.Role, "Administrator"));
        var dashboardContext = CreateDashboardContext(httpContext);

        var result = _filter.Authorize(dashboardContext);

        Assert.True(result);
    }

    [Fact]
    public void Authorize_AuthenticatedUserWithMultipleRolesIncludingAdministrator_ReturnsTrue()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.User = AuthenticatedUser(
            new Claim(ClaimTypes.Role, "User"),
            new Claim(ClaimTypes.Role, "Administrator"));
        var dashboardContext = CreateDashboardContext(httpContext);

        var result = _filter.Authorize(dashboardContext);

        Assert.True(result);
    }

    #endregion
}
