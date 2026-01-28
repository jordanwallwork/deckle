namespace Deckle.Email.Abstractions;

/// <summary>
/// Service for sending emails using templates.
/// </summary>
public interface IEmailSender
{
    /// <summary>
    /// Sends an email using the provided template.
    /// </summary>
    /// <param name="template">The email template to send.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public Task SendAsync(IEmailTemplate template, CancellationToken cancellationToken = default);

    /// <summary>
    /// Sends multiple emails using the provided templates.
    /// </summary>
    /// <param name="templates">The email templates to send.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public Task SendBatchAsync(IEnumerable<IEmailTemplate> templates, CancellationToken cancellationToken = default);
}
