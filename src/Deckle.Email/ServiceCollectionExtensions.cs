using Deckle.Email.Abstractions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Deckle.Email;

/// <summary>
/// Extension methods for registering email services.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Adds SMTP-based email sending services as a keyed service with key "Smtp".
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <param name="configuration">The configuration to bind EmailOptions from.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddSmtpEmailServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.Configure<EmailOptions>(configuration.GetSection(EmailOptions.SectionName));
        services.AddKeyedScoped<IEmailSender, SmtpEmailSender>("Smtp");
        return services;
    }

    /// <summary>
    /// Adds SMTP-based email sending services as a keyed service with key "Smtp".
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <param name="configureOptions">Action to configure email options.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddSmtpEmailServices(
        this IServiceCollection services,
        Action<EmailOptions> configureOptions)
    {
        services.Configure(configureOptions);
        services.AddKeyedScoped<IEmailSender, SmtpEmailSender>("Smtp");
        return services;
    }

    /// <summary>
    /// Adds Brevo-based email sending services as a keyed service with key "Brevo".
    /// Uses <see cref="IHttpClientFactory"/> to manage the underlying HttpClient.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <param name="configuration">The configuration to bind BrevoOptions from.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddBrevoEmailServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.Configure<BrevoOptions>(configuration.GetSection(BrevoOptions.SectionName));
        services.AddHttpClient<BrevoEmailSender>();
        services.AddKeyedScoped<IEmailSender>("Brevo",
            (sp, _) => sp.GetRequiredService<BrevoEmailSender>());
        return services;
    }

    /// <summary>
    /// Adds Brevo-based email sending services as a keyed service with key "Brevo".
    /// Uses <see cref="IHttpClientFactory"/> to manage the underlying HttpClient.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <param name="configureOptions">Action to configure Brevo options.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddBrevoEmailServices(
        this IServiceCollection services,
        Action<BrevoOptions> configureOptions)
    {
        services.Configure(configureOptions);
        services.AddHttpClient<BrevoEmailSender>();
        services.AddKeyedScoped<IEmailSender>("Brevo",
            (sp, _) => sp.GetRequiredService<BrevoEmailSender>());
        return services;
    }

    /// <summary>
    /// Adds all email sending provider services as keyed services.
    /// Both SMTP and Brevo senders are registered; the active provider
    /// is selected at runtime via the "Email:Provider" configuration value.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <param name="configuration">The configuration.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddEmailServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddSmtpEmailServices(configuration);
        services.AddBrevoEmailServices(configuration);
        return services;
    }
}
