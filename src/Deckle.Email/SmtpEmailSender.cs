using Deckle.Email.Abstractions;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;
using MimeKit.Text;

namespace Deckle.Email;

/// <summary>
/// Email sender implementation using SMTP via MailKit.
/// </summary>
public partial class SmtpEmailSender : IEmailSender
{
    private readonly EmailOptions _options;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(IOptions<EmailOptions> options, ILogger<SmtpEmailSender> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task SendAsync(IEmailTemplate template, CancellationToken cancellationToken = default)
    {
        var message = CreateMimeMessage(template);

        try
        {
            using var client = new SmtpClient();
            client.Timeout = _options.TimeoutSeconds * 1000;

            // Connect to SMTP server
            await client.ConnectAsync(
                _options.SmtpHost,
                _options.SmtpPort,
                _options.UseSsl ? SecureSocketOptions.StartTls : SecureSocketOptions.None,
                cancellationToken);

            // Authenticate if credentials are provided
            if (!string.IsNullOrEmpty(_options.Username) && !string.IsNullOrEmpty(_options.Password))
            {
                await client.AuthenticateAsync(_options.Username, _options.Password, cancellationToken);
            }

            // Send email
            await client.SendAsync(message, cancellationToken);

            // Disconnect
            await client.DisconnectAsync(true, cancellationToken);

            LogEmailSent(string.Join(", ", template.To.Select(t => t.Address)), template.Subject);
        }
        catch (Exception ex)
        {
            LogEmailSendFailed(ex, string.Join(", ", template.To.Select(t => t.Address)), template.Subject);
            throw;
        }
    }

    public async Task SendBatchAsync(IEnumerable<IEmailTemplate> templates, CancellationToken cancellationToken = default)
    {
        var templateList = templates.ToList();
        if (templateList.Count == 0)
        {
            return;
        }

        try
        {
            using var client = new SmtpClient();
            client.Timeout = _options.TimeoutSeconds * 1000;

            // Connect once for all emails
            await client.ConnectAsync(
                _options.SmtpHost,
                _options.SmtpPort,
                _options.UseSsl ? SecureSocketOptions.StartTls : SecureSocketOptions.None,
                cancellationToken);

            await client.AuthenticateAsync(_options.Username, _options.Password, cancellationToken);

            // Send all emails using the same connection
            foreach (var template in templateList)
            {
                var message = CreateMimeMessage(template);
                await client.SendAsync(message, cancellationToken);

                LogEmailSent(string.Join(", ", template.To.Select(t => t.Address)), template.Subject);
            }

            await client.DisconnectAsync(true, cancellationToken);

            LogBatchEmailsSent(templateList.Count);
        }
        catch (Exception ex)
        {
            LogBatchEmailsFailed(ex, templateList.Count);
            throw;
        }
    }

    private MimeMessage CreateMimeMessage(IEmailTemplate template)
    {
        var message = new MimeMessage();

        // From
        message.From.Add(new MailboxAddress(_options.FromName, _options.FromAddress));

        // To
        foreach (var recipient in template.To)
        {
            message.To.Add(CreateMailboxAddress(recipient));
        }

        // CC
        if (template.Cc != null)
        {
            foreach (var cc in template.Cc)
            {
                message.Cc.Add(CreateMailboxAddress(cc));
            }
        }

        // BCC
        if (template.Bcc != null)
        {
            foreach (var bcc in template.Bcc)
            {
                message.Bcc.Add(CreateMailboxAddress(bcc));
            }
        }

        // Reply-To
        if (template.ReplyTo != null)
        {
            message.ReplyTo.Add(CreateMailboxAddress(template.ReplyTo));
        }

        // Subject
        message.Subject = template.Subject;

        // Priority
        message.Priority = template.Priority switch
        {
            EmailPriority.High => MessagePriority.Urgent,
            EmailPriority.Low => MessagePriority.NonUrgent,
            _ => MessagePriority.Normal
        };

        // Body
        var bodyBuilder = new BodyBuilder
        {
            HtmlBody = template.HtmlBody
        };

        if (!string.IsNullOrEmpty(template.TextBody))
        {
            bodyBuilder.TextBody = template.TextBody;
        }

        // Attachments
        if (template.Attachments != null)
        {
            foreach (var attachment in template.Attachments)
            {
                bodyBuilder.Attachments.Add(
                    attachment.FileName,
                    attachment.Content,
                    ContentType.Parse(attachment.ContentType));
            }
        }

        message.Body = bodyBuilder.ToMessageBody();

        return message;
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Email sent successfully to {Recipients}. Subject: {Subject}")]
    private partial void LogEmailSent(string recipients, string subject);

    [LoggerMessage(Level = LogLevel.Error, Message = "Failed to send email to {Recipients}. Subject: {Subject}")]
    private partial void LogEmailSendFailed(Exception ex, string recipients, string subject);

    [LoggerMessage(Level = LogLevel.Information, Message = "Batch of {Count} emails sent successfully")]
    private partial void LogBatchEmailsSent(int count);

    [LoggerMessage(Level = LogLevel.Error, Message = "Failed to send batch of {Count} emails")]
    private partial void LogBatchEmailsFailed(Exception ex, int count);

    private static MailboxAddress CreateMailboxAddress(EmailAddress emailAddress)
    {
        return string.IsNullOrEmpty(emailAddress.DisplayName)
            ? new MailboxAddress(emailAddress.Address, emailAddress.Address)
            : new MailboxAddress(emailAddress.DisplayName, emailAddress.Address);
    }
}
