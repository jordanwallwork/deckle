using Deckle.API.Extensions;
using Deckle.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using System.Reflection;
using System.Security.Claims;
using System.Text.Json;

namespace Deckle.API.Tests.Extensions;

public class AuthenticationExtensionsTests
{
    #region AddDeckleAuthorization Tests

    [Fact]
    public void AddDeckleAuthorization_ReturnsSameServiceCollection()
    {
        var services = new ServiceCollection();

        var result = services.AddDeckleAuthorization();

        Assert.Same(services, result);
    }

    [Fact]
    public void AddDeckleAuthorization_AdminOnlyPolicy_IsRegistered()
    {
        var services = new ServiceCollection();
        services.AddDeckleAuthorization();

        var sp = services.BuildServiceProvider();
        var authOptions = sp.GetRequiredService<IOptions<AuthorizationOptions>>().Value;

        Assert.NotNull(authOptions.GetPolicy("AdminOnly"));
    }

    [Fact]
    public void AddDeckleAuthorization_AdminOnlyPolicy_RequiresAdministratorRole()
    {
        var services = new ServiceCollection();
        services.AddDeckleAuthorization();

        var sp = services.BuildServiceProvider();
        var authOptions = sp.GetRequiredService<IOptions<AuthorizationOptions>>().Value;
        var policy = authOptions.GetPolicy("AdminOnly")!;

        var roleReq = policy.Requirements.OfType<RolesAuthorizationRequirement>().FirstOrDefault();
        Assert.NotNull(roleReq);
        Assert.Contains("Administrator", roleReq.AllowedRoles);
    }

    #endregion

    #region AddUserClaimsToIdentity Tests (via reflection)

    private static readonly MethodInfo AddUserClaimsToIdentityMethod =
        typeof(AuthenticationExtensions)
            .GetMethod("AddUserClaimsToIdentity", BindingFlags.NonPublic | BindingFlags.Static)
        ?? throw new InvalidOperationException("Method AddUserClaimsToIdentity not found via reflection.");

    private static void InvokeAddUserClaimsToIdentity(
        ClaimsIdentity? identity,
        User user,
        string email,
        string? name,
        string? picture)
    {
        AddUserClaimsToIdentityMethod.Invoke(null, [identity, user, email, name, picture]);
    }

    private static User MakeUser(Guid? id = null, UserRole role = UserRole.User, string? username = null) =>
        new()
        {
            Id = id ?? Guid.NewGuid(),
            Email = "test@test.com",
            Role = role,
            Username = username,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

    [Fact]
    public void AddUserClaimsToIdentity_NullIdentity_DoesNotThrow()
    {
        var user = MakeUser();

        // Should return early without throwing
        var exception = Record.Exception(() => InvokeAddUserClaimsToIdentity(null, user, "test@test.com", "Test", null));

        Assert.Null(exception);
    }

    [Fact]
    public void AddUserClaimsToIdentity_AddsUserIdClaim()
    {
        var identity = new ClaimsIdentity();
        var userId = Guid.NewGuid();
        var user = MakeUser(id: userId);

        InvokeAddUserClaimsToIdentity(identity, user, "test@test.com", null, null);

        Assert.Contains(identity.Claims, c => c.Type == "user_id" && c.Value == userId.ToString());
    }

    [Fact]
    public void AddUserClaimsToIdentity_AddsEmailClaim()
    {
        var identity = new ClaimsIdentity();
        var user = MakeUser();

        InvokeAddUserClaimsToIdentity(identity, user, "user@example.com", null, null);

        Assert.Contains(identity.Claims, c => c.Type == ClaimTypes.Email && c.Value == "user@example.com");
    }

    [Fact]
    public void AddUserClaimsToIdentity_DoesNotDuplicateExistingEmailClaim()
    {
        var identity = new ClaimsIdentity();
        identity.AddClaim(new Claim(ClaimTypes.Email, "existing@example.com"));
        var user = MakeUser();

        InvokeAddUserClaimsToIdentity(identity, user, "new@example.com", null, null);

        Assert.Single(identity.Claims, c => c.Type == ClaimTypes.Email);
    }

    [Fact]
    public void AddUserClaimsToIdentity_AddsNameClaimWhenProvided()
    {
        var identity = new ClaimsIdentity();
        var user = MakeUser();

        InvokeAddUserClaimsToIdentity(identity, user, "test@test.com", "Alice Smith", null);

        Assert.Contains(identity.Claims, c => c.Type == ClaimTypes.Name && c.Value == "Alice Smith");
    }

    [Fact]
    public void AddUserClaimsToIdentity_DoesNotAddNameClaimWhenNull()
    {
        var identity = new ClaimsIdentity();
        var user = MakeUser();

        InvokeAddUserClaimsToIdentity(identity, user, "test@test.com", null, null);

        Assert.DoesNotContain(identity.Claims, c => c.Type == ClaimTypes.Name);
    }

    [Fact]
    public void AddUserClaimsToIdentity_DoesNotDuplicateExistingNameClaim()
    {
        var identity = new ClaimsIdentity();
        identity.AddClaim(new Claim(ClaimTypes.Name, "Existing Name"));
        var user = MakeUser();

        InvokeAddUserClaimsToIdentity(identity, user, "test@test.com", "New Name", null);

        Assert.Single(identity.Claims, c => c.Type == ClaimTypes.Name);
    }

    [Fact]
    public void AddUserClaimsToIdentity_AddsPictureClaimWhenProvided()
    {
        var identity = new ClaimsIdentity();
        var user = MakeUser();

        InvokeAddUserClaimsToIdentity(identity, user, "test@test.com", null, "https://pic.example.com/img.jpg");

        Assert.Contains(identity.Claims, c => c.Type == "picture" && c.Value == "https://pic.example.com/img.jpg");
    }

    [Fact]
    public void AddUserClaimsToIdentity_DoesNotAddPictureClaimWhenNull()
    {
        var identity = new ClaimsIdentity();
        var user = MakeUser();

        InvokeAddUserClaimsToIdentity(identity, user, "test@test.com", null, null);

        Assert.DoesNotContain(identity.Claims, c => c.Type == "picture");
    }

    [Fact]
    public void AddUserClaimsToIdentity_DoesNotDuplicateExistingPictureClaim()
    {
        var identity = new ClaimsIdentity();
        identity.AddClaim(new Claim("picture", "https://existing.url/pic.jpg"));
        var user = MakeUser();

        InvokeAddUserClaimsToIdentity(identity, user, "test@test.com", null, "https://new.url/pic.jpg");

        Assert.Single(identity.Claims, c => c.Type == "picture");
    }

    [Fact]
    public void AddUserClaimsToIdentity_AddsUsernameClaimWhenSet()
    {
        var identity = new ClaimsIdentity();
        var user = MakeUser(username: "myuser");

        InvokeAddUserClaimsToIdentity(identity, user, "test@test.com", null, null);

        Assert.Contains(identity.Claims, c => c.Type == "username" && c.Value == "myuser");
    }

    [Fact]
    public void AddUserClaimsToIdentity_DoesNotAddUsernameClaimWhenNull()
    {
        var identity = new ClaimsIdentity();
        var user = MakeUser(username: null);

        InvokeAddUserClaimsToIdentity(identity, user, "test@test.com", null, null);

        Assert.DoesNotContain(identity.Claims, c => c.Type == "username");
    }

    [Fact]
    public void AddUserClaimsToIdentity_AddsRoleClaim_UserRole()
    {
        var identity = new ClaimsIdentity();
        var user = MakeUser(role: UserRole.User);

        InvokeAddUserClaimsToIdentity(identity, user, "test@test.com", null, null);

        Assert.Contains(identity.Claims, c => c.Type == ClaimTypes.Role && c.Value == "User");
    }

    [Fact]
    public void AddUserClaimsToIdentity_AddsRoleClaim_AdministratorRole()
    {
        var identity = new ClaimsIdentity();
        var user = MakeUser(role: UserRole.Administrator);

        InvokeAddUserClaimsToIdentity(identity, user, "test@test.com", null, null);

        Assert.Contains(identity.Claims, c => c.Type == ClaimTypes.Role && c.Value == "Administrator");
    }

    #endregion

    #region GetOptionalProperty Tests (via reflection)

    private static readonly MethodInfo GetOptionalPropertyMethod =
        typeof(AuthenticationExtensions)
            .GetMethod("GetOptionalProperty", BindingFlags.NonPublic | BindingFlags.Static)
        ?? throw new InvalidOperationException("Method GetOptionalProperty not found via reflection.");

    private static string? InvokeGetOptionalProperty(JsonElement element, string propertyName) =>
        (string?)GetOptionalPropertyMethod.Invoke(null, [element, propertyName]);

    [Fact]
    public void GetOptionalProperty_ExistingStringProperty_ReturnsValue()
    {
        using var doc = JsonDocument.Parse("""{"name":"Alice"}""");

        var result = InvokeGetOptionalProperty(doc.RootElement, "name");

        Assert.Equal("Alice", result);
    }

    [Fact]
    public void GetOptionalProperty_MissingProperty_ReturnsNull()
    {
        using var doc = JsonDocument.Parse("""{"name":"Alice"}""");

        var result = InvokeGetOptionalProperty(doc.RootElement, "email");

        Assert.Null(result);
    }

    [Fact]
    public void GetOptionalProperty_NullJsonValue_ReturnsNull()
    {
        using var doc = JsonDocument.Parse("""{"picture":null}""");

        var result = InvokeGetOptionalProperty(doc.RootElement, "picture");

        Assert.Null(result);
    }

    [Fact]
    public void GetOptionalProperty_MultipleProperties_ReturnsCorrectValue()
    {
        using var doc = JsonDocument.Parse("""{"sub":"12345","email":"user@example.com","name":"Test User"}""");

        Assert.Equal("12345", InvokeGetOptionalProperty(doc.RootElement, "sub"));
        Assert.Equal("user@example.com", InvokeGetOptionalProperty(doc.RootElement, "email"));
        Assert.Equal("Test User", InvokeGetOptionalProperty(doc.RootElement, "name"));
        Assert.Null(InvokeGetOptionalProperty(doc.RootElement, "locale"));
    }

    #endregion
}
