using Deckle.API.EmailTemplates;
using Deckle.API.Services;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Deckle.Email.Abstractions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;

namespace Deckle.API.Tests.Services;

public class EmailConfirmationServiceTests : IDisposable
{
    private const string FrontendUrl = "https://deckle.test";

    private bool _disposed;
    private readonly AppDbContext _context;
    private readonly Mock<IEmailSender> _emailSender = new();
    private readonly List<EmailConfirmationEmail> _sentEmails = [];
    private readonly EmailConfirmationService _service;

    public EmailConfirmationServiceTests()
    {
        _context = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

        _emailSender
            .Setup(s => s.SendAsync(It.IsAny<IEmailTemplate>(), It.IsAny<CancellationToken>()))
            .Callback<IEmailTemplate, CancellationToken>((t, _) => _sentEmails.Add((EmailConfirmationEmail)t))
            .Returns(Task.CompletedTask);

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["FrontendUrl"] = FrontendUrl })
            .Build();

        _service = new EmailConfirmationService(
            _context,
            _emailSender.Object,
            configuration,
            Options.Create(new EmailConfirmationOptions { TokenLifetimeHours = 48 }),
            NullLogger<EmailConfirmationService>.Instance);
    }

    #region Helpers

    private async Task<User> SeedUser(
        string email = "user@test.com",
        bool hasPassword = true,
        DateTime? emailConfirmedAt = null,
        DateTime? disabledAt = null)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            PasswordHash = hasPassword ? "hash" : null,
            GoogleId = hasPassword ? null : Guid.NewGuid().ToString(),
            EmailConfirmedAt = emailConfirmedAt,
            DisabledAt = disabledAt,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        return user;
    }

    private static string TokenFrom(EmailConfirmationEmail email)
    {
        const string marker = "token=";
        var url = email.ConfirmationUrl;
        return Uri.UnescapeDataString(url[(url.IndexOf(marker, StringComparison.Ordinal) + marker.Length)..]);
    }

    /// <summary>Sends a confirmation email to the user and returns the raw token from the link.</summary>
    private async Task<string> SendAndGetToken(User user)
    {
        await _service.SendAsync(user);
        return TokenFrom(_sentEmails[^1]);
    }

    #endregion

    #region SendAsync

    [Fact]
    public async Task SendAsync_StoresHashedTokenAndExpiry()
    {
        var user = await SeedUser();

        var token = await SendAndGetToken(user);

        _context.ChangeTracker.Clear();
        var persisted = await _context.Users.FindAsync(user.Id);
        Assert.NotNull(persisted!.EmailConfirmationTokenHash);
        Assert.NotEqual(token, persisted.EmailConfirmationTokenHash);
        Assert.Equal(EmailConfirmationService.HashToken(token), persisted.EmailConfirmationTokenHash);
        Assert.NotNull(persisted.EmailConfirmationTokenExpiresAt);
        Assert.InRange(
            persisted.EmailConfirmationTokenExpiresAt.Value,
            DateTime.UtcNow.AddHours(47),
            DateTime.UtcNow.AddHours(49));
    }

    [Fact]
    public async Task SendAsync_SendsEmailWithFrontendConfirmationLink()
    {
        var user = await SeedUser(email: "alice@test.com");

        await _service.SendAsync(user);

        var email = Assert.Single(_sentEmails);
        Assert.Equal("alice@test.com", email.To[0].Address);
        Assert.StartsWith($"{FrontendUrl}/confirm-email?token=", email.ConfirmationUrl, StringComparison.Ordinal);
        Assert.Equal(48, email.ExpiresInHours);
    }

    [Fact]
    public async Task SendAsync_CalledTwice_InvalidatesPreviousToken()
    {
        var user = await SeedUser();
        var firstToken = await SendAndGetToken(user);
        var secondToken = await SendAndGetToken(user);

        Assert.NotEqual(firstToken, secondToken);
        Assert.Null(await _service.ConfirmAsync(firstToken));
        Assert.NotNull(await _service.ConfirmAsync(secondToken));
    }

    #endregion

    #region ConfirmAsync

    [Fact]
    public async Task ConfirmAsync_ValidToken_ConfirmsEmailAndClearsToken()
    {
        var user = await SeedUser();
        var token = await SendAndGetToken(user);

        var result = await _service.ConfirmAsync(token);

        Assert.NotNull(result);
        Assert.Equal(user.Id, result.Id);
        _context.ChangeTracker.Clear();
        var persisted = await _context.Users.FindAsync(user.Id);
        Assert.NotNull(persisted!.EmailConfirmedAt);
        Assert.Null(persisted.EmailConfirmationTokenHash);
        Assert.Null(persisted.EmailConfirmationTokenExpiresAt);
        Assert.NotNull(persisted.LastLoginAt);
    }

    [Fact]
    public async Task ConfirmAsync_ExpiredToken_ReturnsNullAndLeavesUserUnconfirmed()
    {
        var user = await SeedUser();
        var token = await SendAndGetToken(user);
        user.EmailConfirmationTokenExpiresAt = DateTime.UtcNow.AddMinutes(-1);
        await _context.SaveChangesAsync();

        var result = await _service.ConfirmAsync(token);

        Assert.Null(result);
        _context.ChangeTracker.Clear();
        var persisted = await _context.Users.FindAsync(user.Id);
        Assert.Null(persisted!.EmailConfirmedAt);
    }

    [Fact]
    public async Task ConfirmAsync_ReusedToken_ReturnsNull()
    {
        var user = await SeedUser();
        var token = await SendAndGetToken(user);
        await _service.ConfirmAsync(token);

        var result = await _service.ConfirmAsync(token);

        Assert.Null(result);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("not-a-real-token")]
    public async Task ConfirmAsync_UnknownOrBlankToken_ReturnsNull(string token)
    {
        await SeedUser();

        var result = await _service.ConfirmAsync(token);

        Assert.Null(result);
    }

    [Fact]
    public async Task ConfirmAsync_DisabledUser_ConfirmsButDoesNotRecordLogin()
    {
        var user = await SeedUser(disabledAt: DateTime.UtcNow);
        var token = await SendAndGetToken(user);

        var result = await _service.ConfirmAsync(token);

        Assert.NotNull(result);
        Assert.NotNull(result.EmailConfirmedAt);
        Assert.Null(result.LastLoginAt);
    }

    #endregion

    #region ResendByEmailAsync

    [Fact]
    public async Task ResendByEmailAsync_UnconfirmedPasswordUser_SendsEmail()
    {
        await SeedUser(email: "pending@test.com");

        await _service.ResendByEmailAsync("Pending@Test.com ");

        var email = Assert.Single(_sentEmails);
        Assert.Equal("pending@test.com", email.To[0].Address);
    }

    [Fact]
    public async Task ResendByEmailAsync_UnknownEmail_IsSilentNoOp()
    {
        await SeedUser(email: "someone@test.com");

        await _service.ResendByEmailAsync("nobody@test.com");

        Assert.Empty(_sentEmails);
    }

    [Fact]
    public async Task ResendByEmailAsync_AlreadyConfirmedUser_DoesNotSend()
    {
        await SeedUser(email: "done@test.com", emailConfirmedAt: DateTime.UtcNow);

        await _service.ResendByEmailAsync("done@test.com");

        Assert.Empty(_sentEmails);
    }

    [Fact]
    public async Task ResendByEmailAsync_GoogleOnlyUser_DoesNotSend()
    {
        await SeedUser(email: "google@test.com", hasPassword: false);

        await _service.ResendByEmailAsync("google@test.com");

        Assert.Empty(_sentEmails);
    }

    [Fact]
    public async Task ResendByEmailAsync_DisabledUser_DoesNotSend()
    {
        await SeedUser(email: "disabled@test.com", disabledAt: DateTime.UtcNow);

        await _service.ResendByEmailAsync("disabled@test.com");

        Assert.Empty(_sentEmails);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task ResendByEmailAsync_BlankEmail_IsSilentNoOp(string email)
    {
        await _service.ResendByEmailAsync(email);

        Assert.Empty(_sentEmails);
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
                _context.Dispose();
            _disposed = true;
        }
    }
}
