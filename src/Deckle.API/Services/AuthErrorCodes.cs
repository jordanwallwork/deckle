namespace Deckle.API.Services;

/// <summary>
/// Machine-readable error codes returned to the frontend by authentication endpoints.
/// </summary>
public static class AuthErrorCodes
{
    public const string EmailNotConfirmed = "email_not_confirmed";
    public const string AccountDisabled = "account_disabled";
    public const string InvalidConfirmationToken = "invalid_token";
}
