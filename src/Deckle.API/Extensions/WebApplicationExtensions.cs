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

        await app.ApplyMigrationsAsync();

        if (app.Environment.IsDevelopment())
        {
            app.MapOpenApi();
            app.MapScalarApiReference();
        }

        // Hangfire dashboard with Administrator-only access
        app.UseHangfireDashboard("/hangfire", new DashboardOptions
        {
            Authorization = [new HangfireDashboardAuthorizationFilter()]
        });

        if (!app.Environment.IsDevelopment())
        {
            app.UseHttpsRedirection();
        }

        app.UseCors();
        app.UseAuthentication();
        app.UseAuthorization();

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
