using System.Security.Claims;
using Deckle.API.Auth;
using Deckle.Domain.Entities;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Deckle.API.Tests.Auth;

public class CookieSessionValidatorTests
{
    private readonly Mock<IUserSessionCache> _sessionCache = new();
    private readonly Mock<IAuthenticationService> _authService = new();

    private CookieValidatePrincipalContext CreateContext(ClaimsPrincipal principal)
    {
        var services = new ServiceCollection()
            .AddSingleton(_sessionCache.Object)
            .AddSingleton(_authService.Object)
            .BuildServiceProvider();

        var httpContext = new DefaultHttpContext { RequestServices = services };
        var scheme = new AuthenticationScheme(
            CookieAuthenticationDefaults.AuthenticationScheme,
            null,
            typeof(CookieAuthenticationHandler));
        var ticket = new AuthenticationTicket(principal, CookieAuthenticationDefaults.AuthenticationScheme);

        return new CookieValidatePrincipalContext(httpContext, scheme, new CookieAuthenticationOptions(), ticket);
    }

    private static ClaimsPrincipal MakePrincipal(Guid userId, string role = "User") =>
        new(new ClaimsIdentity(
            [new Claim("user_id", userId.ToString()), new Claim(ClaimTypes.Role, role)],
            CookieAuthenticationDefaults.AuthenticationScheme));

    private void SetupState(Guid userId, UserSessionState? state) =>
        _sessionCache.Setup(c => c.GetAsync(userId, It.IsAny<CancellationToken>())).ReturnsAsync(state);

    private void VerifySignedOut(Times times) =>
        _authService.Verify(a => a.SignOutAsync(
            It.IsAny<HttpContext>(),
            CookieAuthenticationDefaults.AuthenticationScheme,
            It.IsAny<AuthenticationProperties?>()), times);

    [Fact]
    public async Task ValidatePrincipal_ActiveUserSameRole_KeepsPrincipalWithoutRenewing()
    {
        var userId = Guid.NewGuid();
        SetupState(userId, new UserSessionState(null, UserRole.User));
        var context = CreateContext(MakePrincipal(userId));

        await CookieSessionValidator.ValidatePrincipalAsync(context);

        Assert.NotNull(context.Principal);
        Assert.False(context.ShouldRenew);
        VerifySignedOut(Times.Never());
    }

    [Fact]
    public async Task ValidatePrincipal_DisabledUser_RejectsAndSignsOut()
    {
        var userId = Guid.NewGuid();
        SetupState(userId, new UserSessionState(DateTime.UtcNow, UserRole.User));
        var context = CreateContext(MakePrincipal(userId));

        await CookieSessionValidator.ValidatePrincipalAsync(context);

        Assert.Null(context.Principal);
        VerifySignedOut(Times.Once());
    }

    [Fact]
    public async Task ValidatePrincipal_DeletedUser_RejectsAndSignsOut()
    {
        var userId = Guid.NewGuid();
        SetupState(userId, null);
        var context = CreateContext(MakePrincipal(userId));

        await CookieSessionValidator.ValidatePrincipalAsync(context);

        Assert.Null(context.Principal);
        VerifySignedOut(Times.Once());
    }

    [Fact]
    public async Task ValidatePrincipal_RoleChanged_ReplacesRoleClaimAndRenews()
    {
        var userId = Guid.NewGuid();
        SetupState(userId, new UserSessionState(null, UserRole.Administrator));
        var context = CreateContext(MakePrincipal(userId, role: "User"));

        await CookieSessionValidator.ValidatePrincipalAsync(context);

        Assert.True(context.ShouldRenew);
        var roles = context.Principal!.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
        Assert.Equal(["Administrator"], roles);
        Assert.True(context.Principal.IsInRole("Administrator"));
    }

    [Fact]
    public async Task ValidatePrincipal_NoUserIdClaim_DoesNothing()
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim(ClaimTypes.Email, "x@test.com")],
            CookieAuthenticationDefaults.AuthenticationScheme));
        var context = CreateContext(principal);

        await CookieSessionValidator.ValidatePrincipalAsync(context);

        Assert.NotNull(context.Principal);
        _sessionCache.Verify(c => c.GetAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public void UpdateRoleClaim_DuplicateRoleClaims_CollapsesToSingleClaim()
    {
        var identity = new ClaimsIdentity(
            [new Claim(ClaimTypes.Role, "User"), new Claim(ClaimTypes.Role, "User")],
            "Test");

        var changed = CookieSessionValidator.UpdateRoleClaim(identity, "User");

        Assert.True(changed);
        Assert.Single(identity.FindAll(ClaimTypes.Role));
    }
}
