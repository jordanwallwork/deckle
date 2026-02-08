using System.Text.Json;
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
            var dataSources = await dataSourceService.GetProjectDataSourcesAsync(userId, projectId);
            return Results.Ok(dataSources);
        })
        .WithName("GetProjectDataSources");

        group.MapGet("{id:guid}", async (Guid id, HttpContext httpContext, DataSourceService dataSourceService) =>
        {
            var userId = httpContext.GetUserId();
            var dataSource = await dataSourceService.GetDataSourceByIdAsync(userId, id);

            if (dataSource == null)
            {
                return Results.NotFound();
            }

            return Results.Ok(dataSource);
        })
        .WithName("GetDataSourceById");

        group.MapPost("", async (HttpContext httpContext, DataSourceService dataSourceService, CreateDataSourceRequest request) =>
        {
            var userId = httpContext.GetUserId();

            var dataSource = await dataSourceService.CreateGoogleSheetsDataSourceAsync(
                userId,
                request.ProjectId,
                request.Name,
                request.Url,
                request.SheetGid
            );

            return Results.Created($"/data-sources/{dataSource.Id}", dataSource);
        })
        .WithName("CreateDataSource");

        group.MapPut("{id:guid}", async (Guid id, HttpContext httpContext, DataSourceService dataSourceService, UpdateDataSourceRequest request) =>
        {
            var userId = httpContext.GetUserId();

            var dataSource = await dataSourceService.UpdateDataSourceAsync(userId, id, request.Name);

            if (dataSource == null)
            {
                return Results.NotFound();
            }

            return Results.Ok(dataSource);
        })
        .WithName("UpdateDataSource");

        group.MapDelete("{id:guid}", async (Guid id, HttpContext httpContext, DataSourceService dataSourceService) =>
        {
            var userId = httpContext.GetUserId();

            var deleted = await dataSourceService.DeleteDataSourceAsync(userId, id);

            if (!deleted)
            {
                return Results.NotFound();
            }

            return Results.NoContent();
        })
        .WithName("DeleteDataSource");

        // Endpoint to sync data source metadata (headers and row count)
        group.MapPost("{id:guid}/sync", async (Guid id, HttpContext httpContext, DataSourceService dataSourceService, SyncDataSourceMetadataRequest request) =>
        {
            var userId = httpContext.GetUserId();

            var dataSource = await dataSourceService.SyncDataSourceMetadataAsync(userId, id, request.Headers, request.RowCount);
            return Results.Ok(dataSource);
        })
        .WithName("SyncDataSourceMetadata");

        // Endpoint to get basic data source info (metadata)
        group.MapGet("{id:guid}/metadata", async (Guid id, HttpContext httpContext, DataSourceService dataSourceService) =>
        {
            var userId = httpContext.GetUserId();

            var dataSource = await dataSourceService.GetDataSourceByIdAsync(userId, id);

            if (dataSource == null)
            {
                return Results.NotFound();
            }

            // Return basic metadata from the DataSource entity
            var metadata = new
            {
                dataSource.Id,
                dataSource.Name,
                dataSource.GoogleSheetsId,
                dataSource.GoogleSheetsUrl,
                dataSource.SheetGid,
                dataSource.CsvExportUrl
            };

            return Results.Ok(metadata);
        })
        .WithName("GetDataSourceMetadata");

        // Endpoint to get sheet data (CSV)
        group.MapGet("{id:guid}/data", async (Guid id, HttpContext httpContext, DataSourceService dataSourceService, GoogleSheetsService googleSheetsService) =>
        {
            var userId = httpContext.GetUserId();

            var dataSource = await dataSourceService.GetDataSourceByIdAsync(userId, id);

            if (dataSource == null)
            {
                return Results.NotFound();
            }

            // Handle Sample and Spreadsheet data sources with inline JSON data
            if (dataSource.Type is "Sample" or "Spreadsheet")
            {
                var jsonData = dataSource.JsonData;

                // For Sample type: if no inline data, follow the SourceDataSourceId reference
                if (jsonData == null && dataSource.Type == "Sample" && dataSource.SourceDataSourceId.HasValue)
                {
                    var sourceDs = await dataSourceService.GetDataSourceByIdAsync(userId, dataSource.SourceDataSourceId.Value);
                    jsonData = sourceDs?.JsonData;
                }

                if (jsonData != null)
                {
                    try
                    {
                        var sampleData = JsonSerializer.Deserialize<SampleDataJson>(jsonData,
                            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                        if (sampleData != null)
                        {
                            var rows = new List<string[]> { sampleData.Headers.ToArray() };
                            rows.AddRange(sampleData.Rows.Select(r => r.ToArray()));
                            return Results.Ok(new { data = rows });
                        }
                    }
                    catch (JsonException)
                    {
                        return Results.BadRequest(new { error = "Invalid data format" });
                    }
                }

                return Results.Ok(new { data = Array.Empty<string[]>() });
            }

            if (string.IsNullOrEmpty(dataSource.CsvExportUrl))
            {
                // This is a business logic error, not an exception from the service.
                // It should still return a BadRequest.
                return Results.BadRequest(new { error = "Data source does not have a valid CSV export URL" });
            }

            // Fetch CSV data from the public CSV export URL
            var csvData = await googleSheetsService.FetchCsvDataAsync(dataSource.CsvExportUrl);

            // Parse CSV into 2D array (simple implementation)
            var lines = csvData.Split('\n', StringSplitOptions.RemoveEmptyEntries);
            var data = lines.Select(line =>
            {
                // Simple CSV parsing - doesn't handle quoted commas
                return line.Split(',').Select(cell => cell.Trim()).ToArray();
            }).ToList();

            return Results.Ok(new { data });
        })
        .WithName("GetDataSourceData");

        group.MapPost("copy-sample", async (HttpContext httpContext, DataSourceService dataSourceService, CopySampleDataSourceRequest request) =>
        {
            var userId = httpContext.GetUserId();
            var dataSource = await dataSourceService.CopySampleDataSourceToProjectAsync(userId, request.ProjectId, request.SampleDataSourceId);
            return Results.Created($"/data-sources/{dataSource.Id}", dataSource);
        })
        .WithName("CopySampleDataSource");

        // Spreadsheet data source endpoints
        group.MapPost("spreadsheet", async (HttpContext httpContext, DataSourceService dataSourceService, CreateSpreadsheetDataSourceRequest request) =>
        {
            var userId = httpContext.GetUserId();
            var dataSource = await dataSourceService.CreateSpreadsheetDataSourceAsync(userId, request.ProjectId, request.Name);
            return Results.Created($"/data-sources/{dataSource.Id}", dataSource);
        })
        .WithName("CreateSpreadsheetDataSource");

        group.MapPut("{id:guid}/spreadsheet", async (Guid id, HttpContext httpContext, DataSourceService dataSourceService, UpdateSpreadsheetDataSourceRequest request) =>
        {
            var userId = httpContext.GetUserId();
            var dataSource = await dataSourceService.UpdateSpreadsheetDataSourceAsync(userId, id, request.Name, request.JsonData);

            if (dataSource == null)
            {
                return Results.NotFound();
            }

            return Results.Ok(dataSource);
        })
        .WithName("UpdateSpreadsheetDataSource");

        group.MapGet("{id:guid}/spreadsheet", async (Guid id, HttpContext httpContext, DataSourceService dataSourceService) =>
        {
            var userId = httpContext.GetUserId();
            var dataSource = await dataSourceService.GetSpreadsheetDataSourceDetailAsync(userId, id);

            if (dataSource == null)
            {
                return Results.NotFound();
            }

            return Results.Ok(dataSource);
        })
        .WithName("GetSpreadsheetDataSourceDetail");

        return group;
    }
}
