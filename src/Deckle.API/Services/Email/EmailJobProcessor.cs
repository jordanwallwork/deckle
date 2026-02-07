using Deckle.Email.Abstractions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Deckle.API.Services.Email;

/// <summary>
/// Processes background email jobs by dispatching to the configured <see cref="IEmailSender"/> provider.
/// The provider is determined by the <c>Email:Provider</c> configuration value.
/// </summary>
public partial class EmailJobProcessor
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailJobProcessor> _logger;

    public EmailJobProcessor(
        IServiceProvider serviceProvider,
        IConfiguration configuration,
        ILogger<EmailJobProcessor> logger)
    {
        _serviceProvider = serviceProvider;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Sends an email using the configured provider.
    /// Called by Hangfire to process background email jobs.
    /// </summary>
    public async Task ProcessEmailAsync(SerializableEmailMessage message)
    {
        var provider = _configuration["Email:Provider"] ?? "Smtp";

        LogProcessingEmailJob(provider, string.Join(", ", message.Recipients.Select(r => r.Address)));

        var sender = _serviceProvider.GetRequiredKeyedService<IEmailSender>(provider);
        await sender.SendAsync(message);
    }

    /// <summary>
    /// Sends a batch of emails using the configured provider.
    /// Called by Hangfire to process background batch email jobs.
    /// </summary>
    public async Task ProcessBatchEmailAsync(List<SerializableEmailMessage> messages)
    {
        var provider = _configuration["Email:Provider"] ?? "Smtp";

        LogProcessingBatchEmailJob(provider, messages.Count);

        var sender = _serviceProvider.GetRequiredKeyedService<IEmailSender>(provider);
        await sender.SendBatchAsync(messages);
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Processing background email job using provider {Provider} to {Recipients}")]
    private partial void LogProcessingEmailJob(string provider, string recipients);

    [LoggerMessage(Level = LogLevel.Information, Message = "Processing background batch email job using provider {Provider} ({Count} emails)")]
    private partial void LogProcessingBatchEmailJob(string provider, int count);
}
