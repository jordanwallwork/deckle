using System.Buffers.Text;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Deckle.API.EmailTemplates;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Deckle.Email.Abstractions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Deckle.API.Services;

public interface IEmailConfirmationService
{
    /// <summary>
    /// Issues a new confirmation token for the user (replacing any previous one) and emails the link.
    /// </summary>
    public Task SendAsync(User user, CancellationToken cancellationToken = default);

    /// <summary>
    /// Confirms the email address owning <paramref name="token"/>.
    /// Returns the user, or null when the token is unknown, already used or expired.
    /// </summary>
    public Task<User?> ConfirmAsync(string token, CancellationToken cancellationToken = default);

    /// <summary>
    /// Re-sends the confirmation email to an unconfirmed password account.
    /// Silently does nothing for any other address, so callers can't enumerate accounts.
    /// </summary>
    public Task ResendByEmailAsync(string email, CancellationToken cancellationToken = default);
}

public partial class EmailConfirmationService : IEmailConfirmationService
{
    private const int TokenSizeBytes = 32;

    private readonly AppDbContext _dbContext;
    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _configuration;
    private readonly EmailConfirmationOptions _options;
    private readonly ILogger<EmailConfirmationService> _logger;

    public EmailConfirmationService(
        AppDbContext dbContext,
        IEmailSender emailSender,
        IConfiguration configuration,
        IOptions<EmailConfirmationOptions> options,
        ILogger<EmailConfirmationService> logger)
    {
        _dbContext = dbContext;
        _emailSender = emailSender;
        _configuration = configuration;
        _options = options.Value;
        _logger = logger;
    }

    public async Task SendAsync(User user, CancellationToken cancellationToken = default)
    {
        var token = Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(TokenSizeBytes));

        user.EmailConfirmationTokenHash = HashToken(token);
        user.EmailConfirmationTokenExpiresAt = DateTime.UtcNow.AddHours(_options.TokenLifetimeHours);
        user.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);

        var frontendUrl = (_configuration["FrontendUrl"] ?? FrontendDefaults.DevelopmentUrl).TrimEnd('/');
        var email = new EmailConfirmationEmail
        {
            RecipientEmail = user.Email,
            ConfirmationUrl = $"{frontendUrl}/confirm-email?token={Uri.EscapeDataString(token)}",
            ExpiresInHours = _options.TokenLifetimeHours
        };

        await _emailSender.SendAsync(email, cancellationToken);
        LogConfirmationEmailSent(user.Id);
    }

    public async Task<User?> ConfirmAsync(string token, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return null;
        }

        var tokenHash = HashToken(token.Trim());
        var user = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.EmailConfirmationTokenHash == tokenHash, cancellationToken);

        var now = DateTime.UtcNow;
        if (user == null || user.EmailConfirmationTokenExpiresAt == null || user.EmailConfirmationTokenExpiresAt < now)
        {
            return null;
        }

        user.EmailConfirmedAt ??= now;
        user.EmailConfirmationTokenHash = null;
        user.EmailConfirmationTokenExpiresAt = null;
        user.UpdatedAt = now;

        // Confirming signs the user in, unless the account has been disabled
        if (user.DisabledAt == null)
        {
            user.LastLoginAt = now;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        LogEmailConfirmed(user.Id);

        return user;
    }

    public async Task ResendByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return;
        }

        var normalizedEmail = email.Trim().ToLower(CultureInfo.InvariantCulture);

#pragma warning disable CA1304 // ToLower() in EF expression tree is translated to SQL LOWER()
        var user = await _dbContext.Users.FirstOrDefaultAsync(u =>
            u.Email.ToLower() == normalizedEmail
            && u.PasswordHash != null
            && u.EmailConfirmedAt == null
            && u.DisabledAt == null, cancellationToken);
#pragma warning restore CA1304

        if (user == null)
        {
            return;
        }

        await SendAsync(user, cancellationToken);
    }

    /// <summary>SHA-256 hex hash — the same scheme used for API keys.</summary>
    internal static string HashToken(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    [LoggerMessage(Level = LogLevel.Information, Message = "Sent email confirmation to user {UserId}")]
    private partial void LogConfirmationEmailSent(Guid userId);

    [LoggerMessage(Level = LogLevel.Information, Message = "User {UserId} confirmed their email address")]
    private partial void LogEmailConfirmed(Guid userId);
}
