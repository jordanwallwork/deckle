namespace Deckle.API.Exceptions;

/// <summary>
/// Thrown during external (Google) sign-in when the matching account has been disabled.
/// The remote authentication handler routes it to <c>OnRemoteFailure</c>.
/// </summary>
public class AccountDisabledException : Exception
{
    public AccountDisabledException()
        : base("The account has been disabled")
    {
    }

    public AccountDisabledException(string message)
        : base(message)
    {
    }

    public AccountDisabledException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}
