namespace Deckle.API.Services;

/// <summary>
/// Email confirmation settings, bound from the <c>Authentication</c> configuration section.
/// </summary>
public class EmailConfirmationOptions
{
    public const string SectionName = "Authentication";

    /// <summary>
    /// When true, password sign-ups must confirm their email address before they can sign in.
    /// When false, new password accounts are marked confirmed at registration.
    /// </summary>
    public bool RequireEmailConfirmation { get; set; } = true;

    /// <summary>How long a confirmation link stays valid.</summary>
    public int TokenLifetimeHours { get; set; } = 48;
}
