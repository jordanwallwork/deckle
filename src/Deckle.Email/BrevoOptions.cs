namespace Deckle.Email;

/// <summary>
/// Configuration options for sending emails via Brevo (formerly Sendinblue).
/// </summary>
public class BrevoOptions
{
    /// <summary>
    /// Configuration section name in appsettings.json.
    /// </summary>
    public const string SectionName = "Email";

    /// <summary>
    /// Brevo API key for authentication.
    /// </summary>
    public required string ApiKey { get; init; }

    /// <summary>
    /// Default "from" email address for outgoing emails.
    /// </summary>
    public required string FromAddress { get; init; }

    /// <summary>
    /// Default "from" display name.
    /// </summary>
    public string FromName { get; init; } = "Deckle";
}
