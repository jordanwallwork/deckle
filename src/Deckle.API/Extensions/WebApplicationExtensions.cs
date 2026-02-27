using Deckle.API.Endpoints;
using Deckle.API.Filters;
using Deckle.Domain.Data;
using Exceptionless;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

namespace Deckle.API.Extensions;

public static class WebApplicationExtensions
{
    public static async Task<WebApplication> ConfigurePipelineAsync(this WebApplication app)
    {
        app.UseExceptionless();
        app.UseExceptionHandler();

        app.Use(async (context, next) =>
        {
            context.Response.Headers["X-Content-Type-Options"] = "nosniff";
            context.Response.Headers["X-Frame-Options"] = "DENY";
            context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
            context.Response.Headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()";
            if (!app.Environment.IsDevelopment())
            {
                context.Response.Headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
            }
            await next();
        });

        await app.ApplyMigrationsAsync();

        if (app.Environment.IsDevelopment())
        {
            app.MapOpenApi();
            app.MapScalarApiReference();
        }

        if (!app.Environment.IsDevelopment())
        {
            app.UseHttpsRedirection();
        }

        app.UseCors();
        app.UseAuthentication();
        app.UseAuthorization();
        app.UseRateLimiter();

        // Hangfire dashboard with Administrator-only access
        // Must be registered after UseAuthentication/UseAuthorization
        // so that HttpContext.User is populated when the filter runs
        app.UseHangfireDashboard("/hangfire", new DashboardOptions
        {
            Authorization = [new HangfireDashboardAuthorizationFilter()]
        });

        return app;
    }

    public static WebApplication MapDeckleEndpoints(this WebApplication app)
    {
        app.MapDefaultEndpoints();

        app.MapVersionEndpoints();
        app.MapAuthEndpoints();
        app.MapProjectEndpoints();
        app.MapDataSourceEndpoints();
        app.MapComponentEndpoints();
        app.MapSampleEndpoints();
        app.MapFileEndpoints();
        app.MapFileDirectoryEndpoints();
        app.MapAdminEndpoints();

        return app;
    }

    private static async Task ApplyMigrationsAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await dbContext.Database.MigrateAsync();
    }
}
