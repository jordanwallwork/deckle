using Deckle.Email.Abstractions;
using Hangfire;
using Microsoft.Extensions.Logging;

namespace Deckle.API.Services.Email;

/// <summary>
/// An <see cref="IEmailSender"/> implementation that enqueues emails as background jobs
/// via Hangfire, rather than sending them synchronously.
/// </summary>
public partial class BackgroundEmailSender : IEmailSender
{
    private readonly IBackgroundJobClient _backgroundJobClient;
    private readonly ILogger<BackgroundEmailSender> _logger;

    public BackgroundEmailSender(
        IBackgroundJobClient backgroundJobClient,
        ILogger<BackgroundEmailSender> logger)
    {
        _backgroundJobClient = backgroundJobClient;
        _logger = logger;
    }

    public Task SendAsync(IEmailTemplate template, CancellationToken cancellationToken = default)
    {
        var message = SerializableEmailMessage.FromTemplate(template);

        var jobId = _backgroundJobClient.Enqueue<EmailJobProcessor>(
            processor => processor.ProcessEmailAsync(message));

        LogEmailJobEnqueued(jobId, string.Join(", ", template.To.Select(t => t.Address)), template.Subject);

        return Task.CompletedTask;
    }

    public Task SendBatchAsync(IEnumerable<IEmailTemplate> templates, CancellationToken cancellationToken = default)
    {
        var messages = templates.Select(SerializableEmailMessage.FromTemplate).ToList();

        if (messages.Count == 0)
        {
            return Task.CompletedTask;
        }

        var jobId = _backgroundJobClient.Enqueue<EmailJobProcessor>(
            processor => processor.ProcessBatchEmailAsync(messages));

        LogBatchEmailJobEnqueued(jobId, messages.Count);

        return Task.CompletedTask;
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Enqueued background email job {JobId} to {Recipients}. Subject: {Subject}")]
    private partial void LogEmailJobEnqueued(string jobId, string recipients, string subject);

    [LoggerMessage(Level = LogLevel.Information, Message = "Enqueued background batch email job {JobId} ({Count} emails)")]
    private partial void LogBatchEmailJobEnqueued(string jobId, int count);
}
