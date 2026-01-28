using Deckle.Email.Abstractions;

namespace Deckle.API.Services.Email;

/// <summary>
/// A serializable representation of an email message for background job processing.
/// Captures all data from an <see cref="IEmailTemplate"/> in a form that can be
/// serialized/deserialized by Hangfire.
/// </summary>
public class SerializableEmailMessage : IEmailTemplate
{
    public List<EmailAddress> Recipients { get; set; } = [];
    public string EmailSubject { get; set; } = string.Empty;
    public string EmailHtmlBody { get; set; } = string.Empty;
    public string? EmailTextBody { get; set; }
    public List<EmailAddress>? CcRecipients { get; set; }
    public List<EmailAddress>? BccRecipients { get; set; }
    public EmailAddress? EmailReplyTo { get; set; }
    public EmailPriority EmailPriority { get; set; } = EmailPriority.Normal;
    public List<EmailAttachment>? EmailAttachments { get; set; }

    // IEmailTemplate implementation
    IReadOnlyList<EmailAddress> IEmailTemplate.To => Recipients;
    string IEmailTemplate.Subject => EmailSubject;
    string IEmailTemplate.HtmlBody => EmailHtmlBody;
    string? IEmailTemplate.TextBody => EmailTextBody;
    IReadOnlyList<EmailAddress>? IEmailTemplate.Cc => CcRecipients;
    IReadOnlyList<EmailAddress>? IEmailTemplate.Bcc => BccRecipients;
    EmailAddress? IEmailTemplate.ReplyTo => EmailReplyTo;
    EmailPriority IEmailTemplate.Priority => EmailPriority;
    IReadOnlyList<EmailAttachment>? IEmailTemplate.Attachments => EmailAttachments;

    /// <summary>
    /// Creates a serializable message from an <see cref="IEmailTemplate"/>.
    /// </summary>
    public static SerializableEmailMessage FromTemplate(IEmailTemplate template) => new()
    {
        Recipients = [.. template.To],
        EmailSubject = template.Subject,
        EmailHtmlBody = template.HtmlBody,
        EmailTextBody = template.TextBody,
        CcRecipients = template.Cc?.ToList(),
        BccRecipients = template.Bcc?.ToList(),
        EmailReplyTo = template.ReplyTo,
        EmailPriority = template.Priority,
        EmailAttachments = template.Attachments?.ToList()
    };
}
