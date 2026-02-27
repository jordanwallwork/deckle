namespace Deckle.API.Extensions;

public static class CorsExtensions
{
    public static IServiceCollection AddDeckleCors(
        this IServiceCollection services,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        services.AddCors(options =>
        {
            options.AddDefaultPolicy(policy =>
            {
                var frontendUrl = configuration["FrontendUrl"];

                policy.SetIsOriginAllowed(origin => IsOriginAllowed(origin, frontendUrl, environment))
                    .AllowCredentials()
                    .AllowAnyHeader()
                    .AllowAnyMethod();
            });
        });

        return services;
    }

    private static bool IsOriginAllowed(string origin, string? frontendUrl, IWebHostEnvironment environment)
    {
        if (string.IsNullOrEmpty(origin))
            return false;

        var uri = new Uri(origin);

        // Allow localhost on any port during development
        if (environment.IsDevelopment() && uri.Host == "localhost")
            return true;

        // In production, FrontendUrl must be configured
        if (string.IsNullOrWhiteSpace(frontendUrl))
        {
            if (!environment.IsDevelopment())
                return false;

            // Development fallback
            return IsLocalhostDevelopmentOrigin(origin);
        }

        // Allow the configured frontend URL (with and without trailing slash)
        var normalizedFrontendUrl = frontendUrl.TrimEnd('/');
        var normalizedOrigin = origin.TrimEnd('/');

        return normalizedOrigin == normalizedFrontendUrl || IsLocalhostDevelopmentOrigin(origin);
    }

    private static bool IsLocalhostDevelopmentOrigin(string origin)
    {
        return origin == "http://localhost:5173" || origin == "https://localhost:5173";
    }
}
