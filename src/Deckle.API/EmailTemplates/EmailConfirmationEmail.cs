using Deckle.Email.Abstractions;

namespace Deckle.API.EmailTemplates;

/// <summary>
/// Email template asking a new password user to confirm their email address.
/// </summary>
public class EmailConfirmationEmail : EmailTemplateBase
{
    /// <summary>
    /// The email address being confirmed.
    /// </summary>
    public required string RecipientEmail { get; init; }

    /// <summary>
    /// The link the user follows to confirm their email address.
    /// </summary>
    public required string ConfirmationUrl { get; init; }

    /// <summary>
    /// How many hours the confirmation link remains valid.
    /// </summary>
    public required int ExpiresInHours { get; init; }

    public override IReadOnlyList<EmailAddress> To => [EmailAddress.From(RecipientEmail)];

    public override string Subject => "Confirm your email address for Deckle";

    public override string HtmlBody => WrapInEmailLayout(
        Subject,
        GenerateBodyContent());

    public override string TextBody => $@"
Hello!

Thanks for signing up to Deckle. Please confirm your email address by opening the link below in your browser:
{ConfirmationUrl}

This link expires in {ExpiresInHours} hours.

If you didn't create a Deckle account, you can safely ignore this email.

Best regards,
The Deckle Team
";

    private string GenerateBodyContent()
    {
        return $@"
            <h2>Confirm your email address</h2>

            <p>
                Thanks for signing up to Deckle! Please confirm your email address to finish
                setting up your account.
            </p>

            <p style=""text-align: center;"">
                <a href=""{ConfirmationUrl}"" class=""button"">Confirm Email</a>
            </p>

            <p>
                Or copy and paste this link into your browser:<br>
                <span class=""highlight"">{ConfirmationUrl}</span>
            </p>

            <p>This link expires in {ExpiresInHours} hours.</p>

            <p>
                If you didn't create a Deckle account, you can safely ignore this email.
            </p>

            <p>
                <strong>The Deckle Team</strong>
            </p>
        ";
    }
}
