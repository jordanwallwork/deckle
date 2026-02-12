using Deckle.API.EmailTemplates.Admin;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Deckle.Email.Abstractions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Deckle.API.Events.NewUserRegistration;

/// <summary>
/// Handles the NewUserRegistrationEvent by sending an email notification to site administrators.
/// </summary>
public partial class NewUserRegistrationHandler : INotificationHandler<NewUserRegistrationEvent>
{
    private readonly IEmailSender _emailSender;
    private readonly AppDbContext _dbContext;
    private readonly ILogger<NewUserRegistrationHandler> _logger;

    public NewUserRegistrationHandler(
        IEmailSender emailSender,
        AppDbContext dbContext,
        ILogger<NewUserRegistrationHandler> logger)
    {
        _emailSender = emailSender;
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task Handle(NewUserRegistrationEvent notification, CancellationToken cancellationToken)
    {
        var adminEmails = await _dbContext.Users
            .Where(u => u.Role == UserRole.Administrator)
            .Select(u => u.Email)
            .ToListAsync(cancellationToken);

        if (adminEmails.Count == 0)
        {
            LogNoAdministratorsFound(notification.Username);
            return;
        }

        var template = new NewUserRegisteredTemplate
        {
            AdminEmails = adminEmails,
            Name = notification.Name,
            UserEmail = notification.Email,
            Username = notification.Username,
            SignupDate = notification.SignupDate
        };

        try
        {
            await _emailSender.SendAsync(template, cancellationToken);
            LogNewUserRegistrationNotificationSent(notification.Username, adminEmails.Count);
        }
        catch (Exception ex)
        {
            LogNewUserRegistrationNotificationFailed(ex, notification.Username);
        }
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "No administrators found. Skipping new user registration notification for {Username}")]
    private partial void LogNoAdministratorsFound(string username);

    [LoggerMessage(Level = LogLevel.Information, Message = "Sent new user registration notification for {Username} to {AdminCount} administrator(s)")]
    private partial void LogNewUserRegistrationNotificationSent(string username, int adminCount);

    [LoggerMessage(Level = LogLevel.Error, Message = "Failed to send new user registration notification for {Username}")]
    private partial void LogNewUserRegistrationNotificationFailed(Exception ex, string username);
}
