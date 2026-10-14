using Deckle.API.DTOs;
using Deckle.API.Services;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Moq;
using System.Security.Claims;

namespace Deckle.API.Tests.Services;

public class UserServiceTests : IDisposable
{
    private bool _disposed;
    private readonly AppDbContext _context;
    private readonly UserService _service;

    public UserServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);
        var passwordHasher = new Mock<IPasswordHasher<User>>().Object;
        _service = new UserService(_context, passwordHasher, ConfirmationOptions(required: true));
    }

    #region Helpers

    private static IOptions<EmailConfirmationOptions> ConfirmationOptions(bool required) =>
        Options.Create(new EmailConfirmationOptions { RequireEmailConfirmation = required });

    /// <summary>A service using a real password hasher, for register/login round trips.</summary>
    private UserService CreatePasswordService(bool requireConfirmation) =>
        new(_context, new PasswordHasher<User>(), ConfirmationOptions(requireConfirmation));

    private async Task<User> SeedPasswordUser(
        string email,
        string password,
        DateTime? emailConfirmedAt = null,
        DateTime? disabledAt = null)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            EmailConfirmedAt = emailConfirmedAt,
            DisabledAt = disabledAt
        };
        user.PasswordHash = new PasswordHasher<User>().HashPassword(user, password);
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        return user;
    }

    private async Task<User> SeedUser(string email, string? googleId = null, string? username = null)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            GoogleId = googleId ?? Guid.NewGuid().ToString(),
            Email = email,
            Username = username,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        return user;
    }

    private static GoogleUserInfo MakeGoogleUserInfo(
        string googleId,
        string email,
        string? name = null,
        string? givenName = null,
        string? familyName = null,
        string? picture = null) =>
        new(googleId, email, name, givenName, familyName, picture, null);

    #endregion

    #region CreateOrUpdateUserAsync Tests

    [Fact]
    public async Task CreateOrUpdateUserAsync_NewUser_CreatesUserWithGoogleId()
    {
        var info = MakeGoogleUserInfo("google-123", "new@test.com", "New User");

        var result = await _service.CreateOrUpdateUserAsync(info);

        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Equal("google-123", result.GoogleId);
        Assert.Equal("new@test.com", result.Email);
        Assert.Equal("New User", result.Name);
    }

    [Fact]
    public async Task CreateOrUpdateUserAsync_NewUser_PersistsToDatabase()
    {
        var info = MakeGoogleUserInfo("google-new", "new@test.com");

        var result = await _service.CreateOrUpdateUserAsync(info);

        _context.ChangeTracker.Clear();
        var persisted = await _context.Users.FindAsync(result.Id);
        Assert.NotNull(persisted);
        Assert.Equal("google-new", persisted.GoogleId);
    }

    [Fact]
    public async Task CreateOrUpdateUserAsync_NewUser_SetsLastLoginAt()
    {
        var info = MakeGoogleUserInfo("google-new", "new@test.com");

        var result = await _service.CreateOrUpdateUserAsync(info);

        Assert.NotNull(result.LastLoginAt);
    }

    [Fact]
    public async Task CreateOrUpdateUserAsync_ExistingUserByGoogleId_UpdatesProfileFields()
    {
        var existing = await SeedUser("old@test.com", "google-existing");
        var info = MakeGoogleUserInfo("google-existing", "updated@test.com", "Updated Name", "Updated", "User");

        var result = await _service.CreateOrUpdateUserAsync(info);

        Assert.Equal(existing.Id, result.Id);
        Assert.Equal("updated@test.com", result.Email);
        Assert.Equal("Updated Name", result.Name);
        Assert.Equal("Updated", result.GivenName);
        Assert.Equal("User", result.FamilyName);
    }

    [Fact]
    public async Task CreateOrUpdateUserAsync_ExistingUserByGoogleId_UpdatesLastLoginAt()
    {
        await SeedUser("test@test.com", "google-id");
        var info = MakeGoogleUserInfo("google-id", "test@test.com");

        var result = await _service.CreateOrUpdateUserAsync(info);

        Assert.NotNull(result.LastLoginAt);
    }

    [Fact]
    public async Task CreateOrUpdateUserAsync_ExistingUserByGoogleId_DoesNotCreateDuplicate()
    {
        await SeedUser("test@test.com", "google-id");
        var info = MakeGoogleUserInfo("google-id", "test@test.com");

        await _service.CreateOrUpdateUserAsync(info);

        var count = await _context.Users.CountAsync(u => u.GoogleId == "google-id");
        Assert.Equal(1, count);
    }

    [Fact]
    public async Task CreateOrUpdateUserAsync_InvitedUserSameEmail_MergesAccountByLinkingGoogleId()
    {
        // An invited user has no GoogleId (placeholder account)
        var invitedUser = new User
        {
            Id = Guid.NewGuid(),
            GoogleId = null,
            Email = "invited@test.com",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Users.Add(invitedUser);
        await _context.SaveChangesAsync();

        var info = MakeGoogleUserInfo("google-new", "invited@test.com", "Newly Joined");

        var result = await _service.CreateOrUpdateUserAsync(info);

        // Should merge into the existing user record
        Assert.Equal(invitedUser.Id, result.Id);
        Assert.Equal("google-new", result.GoogleId);
        Assert.Equal("Newly Joined", result.Name);
    }

    [Fact]
    public async Task CreateOrUpdateUserAsync_InvitedUserSameEmail_DoesNotCreateNewRecord()
    {
        var invitedUser = new User
        {
            Id = Guid.NewGuid(),
            GoogleId = null,
            Email = "invited@test.com",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Users.Add(invitedUser);
        await _context.SaveChangesAsync();

        var info = MakeGoogleUserInfo("google-123", "invited@test.com");
        await _service.CreateOrUpdateUserAsync(info);

        var count = await _context.Users.CountAsync(u => u.Email == "invited@test.com");
        Assert.Equal(1, count);
    }

    [Fact]
    public async Task CreateOrUpdateUserAsync_NewUser_StoresPictureUrl()
    {
        var info = MakeGoogleUserInfo("google-123", "test@test.com", picture: "https://example.com/pic.jpg");

        var result = await _service.CreateOrUpdateUserAsync(info);

        Assert.Equal("https://example.com/pic.jpg", result.PictureUrl);
    }

    [Fact]
    public async Task CreateOrUpdateUserAsync_NewUser_ConfirmsEmail()
    {
        var result = await _service.CreateOrUpdateUserAsync(MakeGoogleUserInfo("google-c", "c@test.com"));

        Assert.NotNull(result.EmailConfirmedAt);
    }

    [Fact]
    public async Task CreateOrUpdateUserAsync_ExistingUnconfirmedUser_ConfirmsEmail()
    {
        var user = await SeedUser("u@test.com", googleId: "google-u");
        Assert.Null(user.EmailConfirmedAt);

        var result = await _service.CreateOrUpdateUserAsync(MakeGoogleUserInfo("google-u", "u@test.com"));

        Assert.NotNull(result.EmailConfirmedAt);
    }

    [Fact]
    public async Task CreateOrUpdateUserAsync_UnconfirmedPasswordUserMerges_ConfirmsEmail()
    {
        var user = await SeedPasswordUser("pw@test.com", "password123");

        var result = await _service.CreateOrUpdateUserAsync(MakeGoogleUserInfo("google-pw", "pw@test.com"));

        Assert.Equal(user.Id, result.Id);
        Assert.Equal("google-pw", result.GoogleId);
        Assert.NotNull(result.EmailConfirmedAt);
    }

    [Fact]
    public async Task CreateOrUpdateUserAsync_AlreadyConfirmed_KeepsOriginalConfirmationDate()
    {
        var confirmedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var user = await SeedUser("k@test.com", googleId: "google-k");
        user.EmailConfirmedAt = confirmedAt;
        await _context.SaveChangesAsync();

        var result = await _service.CreateOrUpdateUserAsync(MakeGoogleUserInfo("google-k", "k@test.com"));

        Assert.Equal(confirmedAt, result.EmailConfirmedAt);
    }

    [Fact]
    public async Task CreateOrUpdateUserAsync_ExistingUserWithName_PreservesName()
    {
        var user = await SeedUser("n@test.com", googleId: "google-n");
        user.Name = "Admin Renamed";
        await _context.SaveChangesAsync();

        var result = await _service.CreateOrUpdateUserAsync(MakeGoogleUserInfo("google-n", "n@test.com", "Google Name"));

        Assert.Equal("Admin Renamed", result.Name);
    }

    [Fact]
    public async Task CreateOrUpdateUserAsync_ExistingUserWithoutName_FillsNameFromGoogle()
    {
        await SeedUser("e@test.com", googleId: "google-e");

        var result = await _service.CreateOrUpdateUserAsync(MakeGoogleUserInfo("google-e", "e@test.com", "Google Name"));

        Assert.Equal("Google Name", result.Name);
    }

    #endregion

    #region RegisterWithPasswordAsync Tests

    [Fact]
    public async Task RegisterWithPasswordAsync_ConfirmationRequired_CreatesUnconfirmedUser()
    {
        var service = CreatePasswordService(requireConfirmation: true);

        var (success, _, user) = await service.RegisterWithPasswordAsync("new@test.com", "password123");

        Assert.True(success);
        Assert.NotNull(user);
        Assert.Null(user.EmailConfirmedAt);
        Assert.Null(user.LastLoginAt);
    }

    [Fact]
    public async Task RegisterWithPasswordAsync_ConfirmationNotRequired_CreatesConfirmedUser()
    {
        var service = CreatePasswordService(requireConfirmation: false);

        var (success, _, user) = await service.RegisterWithPasswordAsync("new@test.com", "password123");

        Assert.True(success);
        Assert.NotNull(user);
        Assert.NotNull(user.EmailConfirmedAt);
        Assert.NotNull(user.LastLoginAt);
    }

    #endregion

    #region LoginWithPasswordAsync Tests

    [Fact]
    public async Task LoginWithPasswordAsync_UnconfirmedAndConfirmationRequired_ReturnsEmailNotConfirmed()
    {
        await SeedPasswordUser("u@test.com", "password123");
        var service = CreatePasswordService(requireConfirmation: true);

        var result = await service.LoginWithPasswordAsync("u@test.com", "password123");

        Assert.False(result.Success);
        Assert.Equal(AuthErrorCodes.EmailNotConfirmed, result.ErrorCode);
        Assert.Null(result.User);
    }

    [Fact]
    public async Task LoginWithPasswordAsync_UnconfirmedAndConfirmationRequired_DoesNotUpdateLastLogin()
    {
        var user = await SeedPasswordUser("u@test.com", "password123");
        var service = CreatePasswordService(requireConfirmation: true);

        await service.LoginWithPasswordAsync("u@test.com", "password123");

        _context.ChangeTracker.Clear();
        var persisted = await _context.Users.FindAsync(user.Id);
        Assert.Null(persisted!.LastLoginAt);
    }

    [Fact]
    public async Task LoginWithPasswordAsync_UnconfirmedAndConfirmationNotRequired_Succeeds()
    {
        await SeedPasswordUser("u@test.com", "password123");
        var service = CreatePasswordService(requireConfirmation: false);

        var result = await service.LoginWithPasswordAsync("u@test.com", "password123");

        Assert.True(result.Success);
        Assert.Null(result.ErrorCode);
        Assert.NotNull(result.User);
    }

    [Fact]
    public async Task LoginWithPasswordAsync_ConfirmedAndConfirmationRequired_Succeeds()
    {
        await SeedPasswordUser("c@test.com", "password123", emailConfirmedAt: DateTime.UtcNow);
        var service = CreatePasswordService(requireConfirmation: true);

        var result = await service.LoginWithPasswordAsync("c@test.com", "password123");

        Assert.True(result.Success);
        Assert.NotNull(result.User);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task LoginWithPasswordAsync_DisabledUser_ReturnsAccountDisabled(bool requireConfirmation)
    {
        await SeedPasswordUser("d@test.com", "password123", emailConfirmedAt: DateTime.UtcNow, disabledAt: DateTime.UtcNow);
        var service = CreatePasswordService(requireConfirmation);

        var result = await service.LoginWithPasswordAsync("d@test.com", "password123");

        Assert.False(result.Success);
        Assert.Equal(AuthErrorCodes.AccountDisabled, result.ErrorCode);
    }

    [Fact]
    public async Task LoginWithPasswordAsync_DisabledUserWrongPassword_ReturnsInvalidCredentialsWithoutCode()
    {
        await SeedPasswordUser("d@test.com", "password123", emailConfirmedAt: DateTime.UtcNow, disabledAt: DateTime.UtcNow);
        var service = CreatePasswordService(requireConfirmation: true);

        var result = await service.LoginWithPasswordAsync("d@test.com", "wrong-password");

        Assert.False(result.Success);
        Assert.Null(result.ErrorCode);
    }

    #endregion

    #region IsUsernameAvailableAsync Tests

    [Fact]
    public async Task IsUsernameAvailableAsync_UnusedUsername_ReturnsTrue()
    {
        var result = await _service.IsUsernameAvailableAsync("unused_name");

        Assert.True(result);
    }

    [Fact]
    public async Task IsUsernameAvailableAsync_UsedUsername_ReturnsFalse()
    {
        await SeedUser("test@test.com", username: "taken_name");

        var result = await _service.IsUsernameAvailableAsync("taken_name");

        Assert.False(result);
    }

    [Fact]
    public async Task IsUsernameAvailableAsync_CaseInsensitive_ReturnsFalseForDifferentCase()
    {
        await SeedUser("test@test.com", username: "MyUsername");

        var result = await _service.IsUsernameAvailableAsync("myusername");

        Assert.False(result);
    }

    [Fact]
    public async Task IsUsernameAvailableAsync_WithExcludeUserId_OwnUserExcluded_ReturnsTrue()
    {
        var user = await SeedUser("test@test.com", username: "myusername");

        var result = await _service.IsUsernameAvailableAsync("myusername", user.Id);

        Assert.True(result);
    }

    [Fact]
    public async Task IsUsernameAvailableAsync_WithExcludeUserId_OtherUserHasName_ReturnsFalse()
    {
        var otherUser = await SeedUser("other@test.com", username: "taken");
        var myUser = await SeedUser("me@test.com");

        var result = await _service.IsUsernameAvailableAsync("taken", myUser.Id);

        Assert.False(result);
        _ = otherUser; // ensure seeded
    }

    [Fact]
    public async Task IsUsernameAvailableAsync_UserWithNullUsername_DoesNotConflict()
    {
        await SeedUser("test@test.com", username: null);

        var result = await _service.IsUsernameAvailableAsync("anyname");

        Assert.True(result);
    }

    #endregion

    #region SetUsernameAsync Tests

    [Fact]
    public async Task SetUsernameAsync_ValidUsername_ReturnsSuccess()
    {
        var user = await SeedUser("test@test.com");

        var (success, error, _) = await _service.SetUsernameAsync(user.Id, "valid_username");

        Assert.True(success);
        Assert.Null(error);
    }

    [Fact]
    public async Task SetUsernameAsync_ValidUsername_PersistsToDatabase()
    {
        var user = await SeedUser("test@test.com");

        await _service.SetUsernameAsync(user.Id, "myusername");

        _context.ChangeTracker.Clear();
        var updated = await _context.Users.FindAsync(user.Id);
        Assert.Equal("myusername", updated!.Username);
    }

    [Fact]
    public async Task SetUsernameAsync_EmptyUsername_ReturnsFalse()
    {
        var user = await SeedUser("test@test.com");

        var (success, error, _) = await _service.SetUsernameAsync(user.Id, "");

        Assert.False(success);
        Assert.NotNull(error);
    }

    [Fact]
    public async Task SetUsernameAsync_WhitespaceUsername_ReturnsErrorAboutEmpty()
    {
        var user = await SeedUser("test@test.com");

        var (success, error, _) = await _service.SetUsernameAsync(user.Id, "   ");

        Assert.False(success);
        Assert.Contains("empty", error!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SetUsernameAsync_TwoCharacterUsername_ReturnsErrorAboutMinLength()
    {
        var user = await SeedUser("test@test.com");

        var (success, error, _) = await _service.SetUsernameAsync(user.Id, "ab");

        Assert.False(success);
        Assert.Contains("3 characters", error!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SetUsernameAsync_ThirtyOneCharacterUsername_ReturnsErrorAboutMaxLength()
    {
        var user = await SeedUser("test@test.com");
        var longName = new string('a', 31);

        var (success, error, _) = await _service.SetUsernameAsync(user.Id, longName);

        Assert.False(success);
        Assert.Contains("30 characters", error!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SetUsernameAsync_UsernameWithHyphen_ReturnsFalse()
    {
        var user = await SeedUser("test@test.com");

        var (success, error, _) = await _service.SetUsernameAsync(user.Id, "invalid-name");

        Assert.False(success);
        Assert.Contains("letters, numbers", error!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SetUsernameAsync_UsernameWithSpecialChars_ReturnsFalse()
    {
        var user = await SeedUser("test@test.com");

        var (success, error, _) = await _service.SetUsernameAsync(user.Id, "bad@name!");

        Assert.False(success);
        Assert.NotNull(error);
    }

    [Fact]
    public async Task SetUsernameAsync_TakenUsername_ReturnsErrorAboutTaken()
    {
        await SeedUser("other@test.com", username: "taken");
        var user = await SeedUser("test@test.com");

        var (success, error, _) = await _service.SetUsernameAsync(user.Id, "taken");

        Assert.False(success);
        Assert.Contains("already taken", error!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SetUsernameAsync_NonExistentUser_ReturnsErrorAboutNotFound()
    {
        var (success, error, _) = await _service.SetUsernameAsync(Guid.NewGuid(), "validname");

        Assert.False(success);
        Assert.Contains("not found", error!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SetUsernameAsync_FirstTimeSettingUsername_IsNewRegistration()
    {
        var user = await SeedUser("test@test.com"); // no username set

        var (_, _, isNewRegistration) = await _service.SetUsernameAsync(user.Id, "newname");

        Assert.True(isNewRegistration);
    }

    [Fact]
    public async Task SetUsernameAsync_UpdatingExistingUsername_NotNewRegistration()
    {
        var user = await SeedUser("test@test.com", username: "oldname");

        var (_, _, isNewRegistration) = await _service.SetUsernameAsync(user.Id, "newname");

        Assert.False(isNewRegistration);
    }

    [Fact]
    public async Task SetUsernameAsync_LeadingTrailingWhitespace_TrimsBeforeSaving()
    {
        var user = await SeedUser("test@test.com");

        var (success, _, _) = await _service.SetUsernameAsync(user.Id, "  validname  ");

        Assert.True(success);
        _context.ChangeTracker.Clear();
        var updated = await _context.Users.FindAsync(user.Id);
        Assert.Equal("validname", updated!.Username);
    }

    [Fact]
    public async Task SetUsernameAsync_MinimumLengthUsername_Succeeds()
    {
        var user = await SeedUser("test@test.com");

        var (success, _, _) = await _service.SetUsernameAsync(user.Id, "abc");

        Assert.True(success);
    }

    [Fact]
    public async Task SetUsernameAsync_MaximumLengthUsername_Succeeds()
    {
        var user = await SeedUser("test@test.com");
        var maxName = new string('a', 30);

        var (success, _, _) = await _service.SetUsernameAsync(user.Id, maxName);

        Assert.True(success);
    }

    #endregion

    #region GetUserByIdAsync Tests

    [Fact]
    public async Task GetUserByIdAsync_ExistingUser_ReturnsUser()
    {
        var user = await SeedUser("test@test.com");

        var result = await _service.GetUserByIdAsync(user.Id);

        Assert.NotNull(result);
        Assert.Equal(user.Id, result.Id);
        Assert.Equal("test@test.com", result.Email);
    }

    [Fact]
    public async Task GetUserByIdAsync_NonExistentUser_ReturnsNull()
    {
        var result = await _service.GetUserByIdAsync(Guid.NewGuid());

        Assert.Null(result);
    }

    #endregion

    #region GetUserIdFromClaims Tests

    [Fact]
    public void GetUserIdFromClaims_AuthenticatedUserWithValidId_ReturnsGuid()
    {
        var userId = Guid.NewGuid();
        var claims = new List<Claim> { new("user_id", userId.ToString()) };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        var result = UserService.GetUserIdFromClaims(principal);

        Assert.Equal(userId, result);
    }

    [Fact]
    public void GetUserIdFromClaims_NotAuthenticated_ReturnsNull()
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity());

        var result = UserService.GetUserIdFromClaims(principal);

        Assert.Null(result);
    }

    [Fact]
    public void GetUserIdFromClaims_AuthenticatedButInvalidGuidFormat_ReturnsNull()
    {
        var claims = new List<Claim> { new("user_id", "not-a-guid") };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        var result = UserService.GetUserIdFromClaims(principal);

        Assert.Null(result);
    }

    [Fact]
    public void GetUserIdFromClaims_AuthenticatedWithNoUserIdClaim_ReturnsNull()
    {
        var identity = new ClaimsIdentity([], "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        var result = UserService.GetUserIdFromClaims(principal);

        Assert.Null(result);
    }

    #endregion

    #region GetCurrentUserFromClaims Tests

    [Fact]
    public void GetCurrentUserFromClaims_AuthenticatedUserWithAllClaims_ReturnsPopulatedDto()
    {
        var userId = Guid.NewGuid();
        var claims = new List<Claim>
        {
            new("user_id", userId.ToString()),
            new(ClaimTypes.Email, "test@test.com"),
            new("username", "testuser"),
            new(ClaimTypes.Name, "Test User"),
            new("picture", "https://example.com/pic.jpg"),
            new(ClaimTypes.Role, "Admin")
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        var result = UserService.GetCurrentUserFromClaims(principal);

        Assert.NotNull(result);
        Assert.Equal(userId.ToString(), result.Id);
        Assert.Equal("test@test.com", result.Email);
        Assert.Equal("testuser", result.Username);
        Assert.Equal("Test User", result.Name);
        Assert.Equal("https://example.com/pic.jpg", result.Picture);
        Assert.Equal("Admin", result.Role);
    }

    [Fact]
    public void GetCurrentUserFromClaims_NotAuthenticated_ReturnsNull()
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity());

        var result = UserService.GetCurrentUserFromClaims(principal);

        Assert.Null(result);
    }

    [Fact]
    public void GetCurrentUserFromClaims_AuthenticatedWithMinimalClaims_ReturnsPartialDto()
    {
        var claims = new List<Claim> { new("user_id", Guid.NewGuid().ToString()) };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        var result = UserService.GetCurrentUserFromClaims(principal);

        Assert.NotNull(result);
        Assert.Null(result.Email);
        Assert.Null(result.Username);
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
