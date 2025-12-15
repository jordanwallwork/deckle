using Deckle.API.DTOs;
using Deckle.API.Filters;
using Deckle.API.Services;

namespace Deckle.API.Endpoints;

public static class DataSourceEndpoints
{
    public static RouteGroupBuilder MapDataSourceEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/data-sources")
            .WithTags("DataSources")
            .RequireAuthorization()
            .RequireUserId();

        group.MapGet("project/{projectId:guid}", async (Guid projectId, HttpContext httpContext, DataSourceService dataSourceService) =>
        {
            var userId = httpContext.GetUserId();

            try
            {
                var dataSources = await dataSourceService.GetProjectDataSourcesAsync(userId, projectId);
                return Results.Ok(dataSources);
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Forbid();
            }
        })
        .WithName("GetProjectDataSources");

        group.MapGet("{id:guid}", async (Guid id, HttpContext httpContext, DataSourceService dataSourceService) =>
        {
            var userId = httpContext.GetUserId();

            try
            {
                var dataSource = await dataSourceService.GetDataSourceByIdAsync(userId, id);

                if (dataSource == null)
                {
                    return Results.NotFound();
                }

                return Results.Ok(dataSource);
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Forbid();
            }
        })
        .WithName("GetDataSourceById");

        group.MapPost("", async (HttpContext httpContext, DataSourceService dataSourceService, CreateDataSourceRequest request) =>
        {
            var userId = httpContext.GetUserId();

            try
            {
                var dataSource = await dataSourceService.CreateGoogleSheetsDataSourceAsync(
                    userId,
                    request.ProjectId,
                    request.Name,
                    request.Url
                );

                return Results.Created($"/data-sources/{dataSource.Id}", dataSource);
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Forbid();
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        })
        .WithName("CreateDataSource");

        group.MapDelete("{id:guid}", async (Guid id, HttpContext httpContext, DataSourceService dataSourceService) =>
        {
            var userId = httpContext.GetUserId();

            try
            {
                var deleted = await dataSourceService.DeleteDataSourceAsync(userId, id);

                if (!deleted)
                {
                    return Results.NotFound();
                }

                return Results.NoContent();
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Forbid();
            }
        })
        .WithName("DeleteDataSource");

        // Endpoint to get spreadsheet metadata
        group.MapGet("{id:guid}/metadata", async (Guid id, HttpContext httpContext, DataSourceService dataSourceService, GoogleSheetsService googleSheetsService) =>
        {
            var userId = httpContext.GetUserId();

            try
            {
                var dataSource = await dataSourceService.GetDataSourceByIdAsync(userId, id);

                if (dataSource == null)
                {
                    return Results.NotFound();
                }

                if (string.IsNullOrEmpty(dataSource.GoogleSheetsId))
                {
                    return Results.BadRequest(new { error = "Data source is not a Google Sheet" });
                }

                var metadata = await googleSheetsService.GetSpreadsheetMetadataAsync(userId, dataSource.GoogleSheetsId);
                return Results.Ok(metadata);
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Forbid();
            }
        })
        .WithName("GetDataSourceMetadata");

        // Endpoint to get sheet data
        group.MapGet("{id:guid}/data", async (Guid id, string? range, HttpContext httpContext, DataSourceService dataSourceService, GoogleSheetsService googleSheetsService) =>
        {
            var userId = httpContext.GetUserId();

            try
            {
                var dataSource = await dataSourceService.GetDataSourceByIdAsync(userId, id);

                if (dataSource == null)
                {
                    return Results.NotFound();
                }

                if (string.IsNullOrEmpty(dataSource.GoogleSheetsId))
                {
                    return Results.BadRequest(new { error = "Data source is not a Google Sheet" });
                }

                // Default to first sheet if no range specified
                var dataRange = range ?? "A1:Z1000";
                var data = await googleSheetsService.GetSheetDataAsync(userId, dataSource.GoogleSheetsId, dataRange);

                return Results.Ok(new { data });
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Forbid();
            }
        })
        .WithName("GetDataSourceData");

        return group;
    }
}
