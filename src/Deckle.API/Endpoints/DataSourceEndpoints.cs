using System.ComponentModel.DataAnnotations;
using System.Text;
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

        group.MapGet("project/{projectId:guid?}", HandleGetProjectDataSources)
        .WithName("GetProjectDataSources");

        group.MapGet("{id:guid}", HandleGetDataSourceById)
        .WithName("GetDataSourceById");

        group.MapPost("GoogleSheets", HandleCreateGoogleSheetsDataSource)
        .RequireRateLimiting("strict")
        .WithName("CreateDataSource");

        group.MapPut("{id:guid}", HandleUpdateDataSource)
        .WithName("UpdateDataSource");

        group.MapDelete("{id:guid}", HandleDeleteDataSource)
        .WithName("DeleteDataSource");

        // Endpoint to sync data source metadata (headers and row count)
        group.MapPost("{id:guid}/sync", HandleSyncDataSourceMetadata)
        .WithName("SyncDataSourceMetadata");

        // Endpoint to get basic data source info (metadata)
        group.MapGet("{id:guid}/metadata", HandleGetDataSourceMetadata)
        .WithName("GetDataSourceMetadata");

        // Endpoint to get sheet data (CSV)
        group.MapGet("{id:guid}/data", HandleGetDataSourceData)
        .WithName("GetDataSourceData");

        group.MapPost("copy-sample", HandleCopySampleDataSource)
        .WithName("CopySampleDataSource");

        // Spreadsheet data source endpoints
        group.MapPost("spreadsheet", HandleCreateSpreadsheetDataSource)
        .WithName("CreateSpreadsheetDataSource");

        group.MapPut("{id:guid}/spreadsheet", HandleUpdateSpreadsheetDataSource)
        .WithName("UpdateSpreadsheetDataSource");

        group.MapGet("{id:guid}/spreadsheet", HandleGetSpreadsheetDataSourceDetail)
        .WithName("GetSpreadsheetDataSourceDetail");

        return group;
    }

    private static async Task<IResult> HandleGetProjectDataSources(Guid? projectId, HttpContext httpContext, IDataSourceService dataSourceService)
    {
        var userId = httpContext.GetUserId();
        var dataSources = await dataSourceService.GetDataSourcesAsync(userId, projectId);
        return Results.Ok(dataSources);
    }

    private static async Task<IResult> HandleGetDataSourceById(Guid id, HttpContext httpContext, IDataSourceService dataSourceService)
    {
        var userId = httpContext.GetUserId();
        var dataSource = await dataSourceService.GetDataSourceByIdAsync(userId, id);

        return dataSource == null ? Results.NotFound() : Results.Ok(dataSource);
    }

    private static async Task<IResult> HandleCreateGoogleSheetsDataSource(HttpContext httpContext, IDataSourceService dataSourceService, CreateGoogleSheetsDataSourceRequest request)
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
    }

    private static async Task<IResult> HandleUpdateDataSource(Guid id, HttpContext httpContext, IDataSourceService dataSourceService, UpdateDataSourceRequest request)
    {
        var userId = httpContext.GetUserId();

        var dataSource = await dataSourceService.UpdateDataSourceAsync(userId, id, request.Name);

        return dataSource == null ? Results.NotFound() : Results.Ok(dataSource);
    }

    private static async Task<IResult> HandleDeleteDataSource(Guid id, HttpContext httpContext, IDataSourceService dataSourceService)
    {
        var userId = httpContext.GetUserId();

        var deleted = await dataSourceService.DeleteDataSourceAsync(userId, id);

        return !deleted ? Results.NotFound() : Results.NoContent();
    }

    private static async Task<IResult> HandleSyncDataSourceMetadata(Guid id, HttpContext httpContext, IDataSourceService dataSourceService, SyncDataSourceMetadataRequest request)
    {
        var userId = httpContext.GetUserId();

        var dataSource = await dataSourceService.SyncDataSourceMetadataAsync(userId, id, request.Headers, request.RowCount);
        return Results.Ok(dataSource);
    }

    private static async Task<IResult> HandleGetDataSourceMetadata(Guid id, HttpContext httpContext, IDataSourceService dataSourceService)
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
    }

    private static async Task<IResult> HandleGetDataSourceData(Guid id, HttpContext httpContext, IDataSourceService dataSourceService, IGoogleSheetsService googleSheetsService)
    {
        var userId = httpContext.GetUserId();

        var dataSource = await dataSourceService.GetDataSourceByIdAsync(userId, id);

        if (dataSource == null)
        {
            return Results.NotFound();
        }

        if (dataSource.Type is "Sample")
        {
            var (resolved, sampleResult) = await ResolveSampleDataSourceAsync(dataSourceService, userId, dataSource);
            if (resolved == null)
            {
                return sampleResult!;
            }

            dataSource = resolved;
        }

        if (dataSource.Type is "Spreadsheet")
        {
            return GetSpreadsheetInlineData(dataSource.JsonData);
        }

        if (string.IsNullOrEmpty(dataSource.CsvExportUrl))
        {
            // This is a business logic error, not an exception from the service.
            // It should still return a BadRequest.
            return Results.BadRequest(new { error = "Data source does not have a valid CSV export URL" });
        }

        // Fetch CSV data from the public CSV export URL and parse using RFC 4180-compliant parsing
        var csvData = await googleSheetsService.FetchCsvDataAsync(dataSource.CsvExportUrl);
        var data = ParseCsv(csvData);

        return Results.Ok(new { data });
    }

    // Handle Sample type: follow the SourceDataSourceId reference to get data from the source.
    // Returns (null, result) when the caller should return early with `result`.
    private static async Task<(DataSourceDto? DataSource, IResult? EarlyResult)> ResolveSampleDataSourceAsync(
        IDataSourceService dataSourceService, Guid userId, DataSourceDto dataSource)
    {
        if (!dataSource.SourceDataSourceId.HasValue)
        {
            return (null, Results.Ok(new { data = Array.Empty<string[]>() }));
        }

        var sourceDs = await dataSourceService.GetDataSourceByIdAsync(userId, dataSource.SourceDataSourceId.Value);
        return sourceDs != null
            ? (sourceDs, null)
            : (null, Results.Ok(new { data = Array.Empty<string[]>() }));
    }

    // Handle Spreadsheet data sources with inline JSON data
    private static IResult GetSpreadsheetInlineData(string? jsonData)
    {
        if (jsonData == null)
        {
            return Results.Ok(new { data = Array.Empty<string[]>() });
        }

        try
        {
            var sampleData = JsonSerializer.Deserialize<SampleDataJson>(jsonData,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (sampleData == null)
            {
                return Results.Ok(new { data = Array.Empty<string[]>() });
            }

            var rows = new List<string[]> { sampleData.Headers.ToArray() };
            rows.AddRange(sampleData.Rows.Select(r => r.ToArray()));
            return Results.Ok(new { data = rows });
        }
        catch (JsonException)
        {
            return Results.BadRequest(new { error = "Invalid data format" });
        }
    }

    private static async Task<IResult> HandleCopySampleDataSource(HttpContext httpContext, IDataSourceService dataSourceService, CopySampleDataSourceRequest request)
    {
        var userId = httpContext.GetUserId();
        var dataSource = await dataSourceService.CopySampleDataSourceToProjectAsync(userId, request.ProjectId, request.SampleDataSourceId);
        return Results.Created($"/data-sources/{dataSource.Id}", dataSource);
    }

    private static async Task<IResult> HandleCreateSpreadsheetDataSource(HttpContext httpContext, IDataSourceService dataSourceService, CreateSpreadsheetDataSourceRequest request)
    {
        var userId = httpContext.GetUserId();
        var dataSource = await dataSourceService.CreateSpreadsheetDataSourceAsync(userId, request.ProjectId, request.Name);
        return Results.Created($"/data-sources/{dataSource.Id}", dataSource);
    }

    private static async Task<IResult> HandleUpdateSpreadsheetDataSource(Guid id, HttpContext httpContext, IDataSourceService dataSourceService, UpdateSpreadsheetDataSourceRequest request)
    {
        var userId = httpContext.GetUserId();
        var dataSource = await dataSourceService.UpdateSpreadsheetDataSourceAsync(userId, id, request.Name, request.JsonData);

        return dataSource == null ? Results.NotFound() : Results.Ok(dataSource);
    }

    private static async Task<IResult> HandleGetSpreadsheetDataSourceDetail(Guid id, HttpContext httpContext, IDataSourceService dataSourceService)
    {
        var userId = httpContext.GetUserId();
        var dataSource = await dataSourceService.GetSpreadsheetDataSourceDetailAsync(userId, id);

        return dataSource == null ? Results.NotFound() : Results.Ok(dataSource);
    }

    /// <summary>
    /// Parses CSV text handling quoted fields (RFC 4180).
    /// Quoted fields may contain commas, newlines, and escaped quotes ("").
    /// </summary>
    private static List<string[]> ParseCsv(string csvText)
    {
        var rows = new List<string[]>();
        var fields = new List<string>();
        var field = new StringBuilder();
        bool inQuotes = false;
        int i = 0;

        while (i < csvText.Length)
        {
            char c = csvText[i];
            if (inQuotes)
                i = ProcessQuotedChar(c, i, csvText, field, ref inQuotes);
            else
                i = ProcessUnquotedChar(c, i, csvText, field, fields, rows, ref inQuotes);
        }

        // Handle last field/row
        fields.Add(field.ToString().Trim());
        if (fields.Any(f => f.Length > 0))
            rows.Add(fields.ToArray());

        return rows;
    }

    private static int ProcessQuotedChar(char c, int i, string csvText, StringBuilder field, ref bool inQuotes)
    {
        if (c != '"')
        {
            field.Append(c);
            return i + 1;
        }

        // Escaped quote ""
        if (i + 1 < csvText.Length && csvText[i + 1] == '"')
        {
            field.Append('"');
            return i + 2;
        }

        // End of quoted field
        inQuotes = false;
        return i + 1;
    }

    private static int ProcessUnquotedChar(char c, int i, string csvText, StringBuilder field, List<string> fields, List<string[]> rows, ref bool inQuotes)
    {
        if (c == '"' && field.Length == 0)
        {
            inQuotes = true;
            return i + 1;
        }

        if (c == ',')
        {
            fields.Add(field.ToString().Trim());
            field.Clear();
            return i + 1;
        }

        if (c == '\r' || c == '\n')
            return ProcessNewline(c, i, csvText, field, fields, rows);

        field.Append(c);
        return i + 1;
    }

    private static int ProcessNewline(char c, int i, string csvText, StringBuilder field, List<string> fields, List<string[]> rows)
    {
        fields.Add(field.ToString().Trim());
        field.Clear();
        if (fields.Any(f => f.Length > 0))
            rows.Add(fields.ToArray());
        fields.Clear();

        // Skip \r\n pair
        return c == '\r' && i + 1 < csvText.Length && csvText[i + 1] == '\n' ? i + 2 : i + 1;
    }
}
