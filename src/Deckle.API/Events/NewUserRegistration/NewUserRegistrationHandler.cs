using Deckle.API.EmailTemplates.Admin;
using Deckle.Email.Abstractions;
using MediatR;

namespace Deckle.API.Events.NewUserRegistration;

/// <summary>
/// Handles the NewUserRegistrationEvent by sending an email notification to the site administrator.
/// </summary>
public class NewUserRegistrationHandler : INotificationHandler<NewUserRegistrationEvent>
{
    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _configuration;
    private readonly ILogger<NewUserRegistrationHandler> _logger;

    public NewUserRegistrationHandler(
        IEmailSender emailSender,
        IConfiguration configuration,
        ILogger<NewUserRegistrationHandler> logger)
    {
        _emailSender = emailSender;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task Handle(NewUserRegistrationEvent notification, CancellationToken cancellationToken)
    {
        var adminEmail = _configuration["AdminNotificationEmail"];

        if (string.IsNullOrWhiteSpace(adminEmail))
        {
            _logger.LogWarning("AdminNotificationEmail is not configured. Skipping new user registration notification for {Username}", notification.Username);
            return;
        }

        var template = new NewUserRegisteredTemplate
        {
            AdminEmail = adminEmail,
            UserName = notification.Name,
            UserEmail = notification.Email,
            Username = notification.Username,
            SignupDate = notification.SignupDate
        };

        try
        {
            await _emailSender.SendAsync(template, cancellationToken);
            _logger.LogInformation("Sent new user registration notification for {Username} to admin", notification.Username);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send new user registration notification for {Username}", notification.Username);
        }
    }
}
