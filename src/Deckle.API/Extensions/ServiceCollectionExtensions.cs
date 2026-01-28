using System.Text.Json.Serialization;
using Deckle.API.Services;
using Deckle.Email;
using Exceptionless;
using MediatR;

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
        services.AddScoped<FileService>();
        services.AddScoped<FileDirectoryService>();
        services.AddScoped<AdminService>();

        // MediatR
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssemblyContaining<Program>());

        return services;
    }

    public static IServiceCollection AddDeckleInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // HttpClient for external API calls
        services.AddHttpClient();

        // Email services
        services.AddEmailServices(configuration);

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
                ctx.ProblemDetails.Extensions.Add("traceId", ctx.HttpContext.TraceIdentifier);
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
