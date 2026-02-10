using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Deckle.Email.Abstractions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Deckle.Email;

/// <summary>
/// Email sender implementation using the Brevo (formerly Sendinblue) transactional email API.
/// </summary>
public partial class BrevoEmailSender : IEmailSender
{
    private const string ApiBaseUrl = "https://api.brevo.com/v3";

    private readonly BrevoOptions _options;
    private readonly ILogger<BrevoEmailSender> _logger;
    private readonly HttpClient _httpClient;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public BrevoEmailSender(
        IOptions<BrevoOptions> options,
        ILogger<BrevoEmailSender> logger,
        HttpClient httpClient)
    {
        _options = options.Value;
        _logger = logger;
        _httpClient = httpClient;
        _httpClient.BaseAddress ??= new Uri(ApiBaseUrl);
        _httpClient.DefaultRequestHeaders.TryAddWithoutValidation("api-key", _options.ApiKey);
    }

    public async Task SendAsync(IEmailTemplate template, CancellationToken cancellationToken = default)
    {
        var payload = BuildPayload(template);

        try
        {
            var response = await _httpClient.PostAsJsonAsync(
                "/v3/smtp/email", payload, JsonOptions, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new HttpRequestException(
                    $"Brevo API returned {response.StatusCode}: {errorBody}");
            }

            LogEmailSentViaBrevo(string.Join(", ", template.To.Select(t => t.Address)), template.Subject);
        }
        catch (Exception ex) when (ex is not HttpRequestException)
        {
            LogEmailSendFailedViaBrevo(ex, string.Join(", ", template.To.Select(t => t.Address)), template.Subject);
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

        foreach (var template in templateList)
        {
            await SendAsync(template, cancellationToken);
        }

        LogBatchEmailsSentViaBrevo(templateList.Count);
    }

    private BrevoEmailPayload BuildPayload(IEmailTemplate template)
    {
        var payload = new BrevoEmailPayload
        {
            Sender = new BrevoContact { Email = _options.FromAddress, Name = _options.FromName },
            To = template.To.Select(ToBrevoContact).ToList(),
            Subject = template.Subject,
            HtmlContent = template.HtmlBody,
            TextContent = string.IsNullOrEmpty(template.TextBody) ? null : template.TextBody
        };

        if (template.Cc is { Count: > 0 })
        {
            payload.Cc = template.Cc.Select(ToBrevoContact).ToList();
        }

        if (template.Bcc is { Count: > 0 })
        {
            payload.Bcc = template.Bcc.Select(ToBrevoContact).ToList();
        }

        if (template.ReplyTo != null)
        {
            payload.ReplyTo = ToBrevoContact(template.ReplyTo);
        }

        if (template.Attachments is { Count: > 0 })
        {
            payload.Attachment = template.Attachments.Select(a => new BrevoAttachment
            {
                Name = a.FileName,
                Content = Convert.ToBase64String(a.Content)
            }).ToList();
        }

        return payload;
    }

    private static BrevoContact ToBrevoContact(EmailAddress address)
    {
        return new BrevoContact
        {
            Email = address.Address,
            Name = string.IsNullOrEmpty(address.DisplayName) ? null : address.DisplayName
        };
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Email sent successfully via Brevo to {Recipients}. Subject: {Subject}")]
    private partial void LogEmailSentViaBrevo(string recipients, string subject);

    [LoggerMessage(Level = LogLevel.Error, Message = "Failed to send email via Brevo to {Recipients}. Subject: {Subject}")]
    private partial void LogEmailSendFailedViaBrevo(Exception ex, string recipients, string subject);

    [LoggerMessage(Level = LogLevel.Information, Message = "Batch of {Count} emails sent successfully via Brevo")]
    private partial void LogBatchEmailsSentViaBrevo(int count);

    private sealed class BrevoEmailPayload
    {
        public required BrevoContact Sender { get; init; }
        public required List<BrevoContact> To { get; init; }
        public required string Subject { get; init; }
        public string? HtmlContent { get; init; }
        public string? TextContent { get; init; }
        public List<BrevoContact>? Cc { get; set; }
        public List<BrevoContact>? Bcc { get; set; }
        public BrevoContact? ReplyTo { get; set; }
        public List<BrevoAttachment>? Attachment { get; set; }
    }

    private sealed class BrevoContact
    {
        public required string Email { get; init; }
        public string? Name { get; init; }
    }

    private sealed class BrevoAttachment
    {
        public required string Name { get; init; }
        public required string Content { get; init; }
    }
}
