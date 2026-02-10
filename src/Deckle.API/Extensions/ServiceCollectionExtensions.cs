using Deckle.API.Configurators;
using Deckle.API.Services;
using Deckle.API.Services.Email;
using Deckle.Email;
using Deckle.Email.Abstractions;
using Exceptionless;
using Hangfire;
using Hangfire.InMemory;
using MediatR;
using System.Reflection;
using System.Text.Json.Serialization;

namespace Deckle.API.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddDeckleApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<ProjectAuthorizationService>();
        services.AddScoped<UserService>();
        services.AddScoped<ProjectService>();
        services.AddScoped<GoogleSheetsService>();
        services.AddScoped<DataSourceService>();
        services.AddScoped<ComponentService>();
        services.AddScoped<SampleService>();
        services.AddScoped<FileService>();
        services.AddScoped<FileDirectoryService>();
        services.AddScoped<AdminService>();

        // MediatR
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssemblyContaining<Program>());

        // Configurators
        services.AddTransient<IConfiguratorProvider, ConfiguratorProvider>();
        services.AddConfigurators();

        return services;
    }

    private static IServiceCollection AddConfigurators(this IServiceCollection services)
    {
        var implementations = Assembly.GetExecutingAssembly().GetTypes()
            .Where(t => !t.IsAbstract && !t.IsInterface)
            .SelectMany(t => t.GetInterfaces(), (t, i) => new { Implementation = t, Interface = i })
            .Where(x => x.Interface.IsGenericType &&
                        x.Interface.GetGenericTypeDefinition() == typeof(IConfigurator<,>));

        foreach (var mapping in implementations)
        {
            services.AddTransient(mapping.Interface, mapping.Implementation);
        }

        return services;
    }

    public static IServiceCollection AddDeckleInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // HttpClient for external API calls
        services.AddHttpClient();

        // Hangfire background job processing
        services.AddHangfire(config => config
            .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
            .UseSimpleAssemblyNameTypeSerializer()
            .UseRecommendedSerializerSettings()
            .UseInMemoryStorage());
        services.AddHangfireServer();

        // Email services: register provider-specific senders as keyed services,
        // then register BackgroundEmailSender as the primary IEmailSender
        services.AddEmailServices(configuration);
        services.AddScoped<EmailJobProcessor>();
        services.AddScoped<IEmailSender, BackgroundEmailSender>();

        // Cloudflare R2 storage
        services.Configure<CloudflareR2Options>(configuration.GetSection("CloudflareR2"));
        services.AddSingleton<CloudflareR2Service>();

        // Background services
        services.AddHostedService<FileCleanupService>();

        return services;
    }

    public static IServiceCollection AddDeckleApiServices(this IServiceCollection services)
    {
        services.AddOpenApi();
        services.AddEndpointsApiExplorer();

        services.AddProblemDetails(options =>
        {
            options.CustomizeProblemDetails = ctx =>
            {
                ctx.ProblemDetails.Extensions.Add("instance", $"{ctx.HttpContext.Request.Method} {ctx.HttpContext.Request.Path}");
            };
        });

        services.ConfigureHttpJsonOptions(options =>
        {
            options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
        });

        return services;
    }

    public static IServiceCollection AddExceptionlessIfConfigured(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var exceptionlessApiKey = configuration["Exceptionless:Key"];

        if (!string.IsNullOrEmpty(exceptionlessApiKey))
        {
            services.AddExceptionless(exceptionlessApiKey);
        }

        return services;
    }
}
