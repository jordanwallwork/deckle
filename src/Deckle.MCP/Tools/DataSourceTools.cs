using System.ComponentModel;
using System.Text.Json;
using System.Text.RegularExpressions;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ModelContextProtocol.Server;

namespace Deckle.MCP.Tools;

[McpServerToolType]
public sealed class DataSourceTools(AppDbContext db, IHttpContextAccessor httpContextAccessor)
    : BaseMcpTool(db, httpContextAccessor)
{
    [McpServerTool, Description("List all data sources in a project.")]
    public async Task<string> ListDataSources(
        [Description("The project ID.")] Guid projectId)
    {
        if (!await HasProjectAccessAsync(projectId))
            return McpErrors.ProjectNotFound;

        var sources = await Db.DataSources
            .Where(ds => ds.ProjectId == projectId)
            .Select(ds => new
            {
                ds.Id,
                ds.Name,
                Type = ds.Type.ToString(),
                ds.RowCount,
                ds.Headers,
                ds.CreatedAt,
                ds.UpdatedAt
            })
            .ToListAsync();

        return JsonSerializer.Serialize(sources);
    }

    [McpServerTool, Description("Get details of a specific data source, including its headers and row count.")]
    public async Task<string> GetDataSource(
        [Description("The data source ID.")] Guid dataSourceId)
    {
        var ds = await Db.DataSources.FirstOrDefaultAsync(d => d.Id == dataSourceId);

        if (ds == null)
            return McpErrors.DataSourceNotFound;

        if (ds.ProjectId.HasValue && !await HasProjectAccessAsync(ds.ProjectId.Value))
            return McpErrors.AccessDenied;

        if (ds is GoogleSheetsDataSource gs)
        {
            return JsonSerializer.Serialize(new
            {
                gs.Id, gs.Name, Type = "GoogleSheets",
                gs.GoogleSheetsId, GoogleSheetsUrl = gs.GoogleSheetsUrl?.ToString(),
                gs.SheetGid, CsvExportUrl = gs.CsvExportUrl?.ToString(),
                gs.Headers, gs.RowCount, gs.ProjectId, gs.CreatedAt, gs.UpdatedAt
            });
        }

        return JsonSerializer.Serialize(new
        {
            ds.Id, ds.Name, Type = ds.Type.ToString(),
            ds.Headers, ds.RowCount, ds.ProjectId, ds.CreatedAt, ds.UpdatedAt
        });
    }

    [McpServerTool, Description("Create a Google Sheets data source linked to a project. The sheet must be publicly accessible ('Anyone with the link can view').")]
    public async Task<string> CreateGoogleSheetsDataSource(
        [Description("The project ID.")] Guid projectId,
        [Description("A display name for this data source.")] string name,
        [Description("The full Google Sheets URL (e.g. https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=0).")] string googleSheetsUrl)
    {
        if (!await HasProjectAccessAsync(projectId))
            return McpErrors.ProjectNotFound;

        if (!Uri.TryCreate(googleSheetsUrl, UriKind.Absolute, out var uri))
            return """{"error":"Invalid Google Sheets URL"}""";

        var (spreadsheetId, sheetGid) = ExtractGoogleSheetsIds(uri);
        if (string.IsNullOrEmpty(spreadsheetId))
            return """{"error":"Could not extract spreadsheet ID from URL"}""";

        var finalGid = sheetGid ?? 0;
        var csvExportUrl = new Uri($"https://docs.google.com/spreadsheets/d/{spreadsheetId}/export?format=csv&gid={finalGid}");

        var ds = new GoogleSheetsDataSource
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = name,
            Type = DataSourceType.GoogleSheets,
            GoogleSheetsId = spreadsheetId,
            GoogleSheetsUrl = uri,
            SheetGid = finalGid,
            CsvExportUrl = csvExportUrl,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        Db.GoogleSheetsDataSources.Add(ds);
        await Db.SaveChangesAsync();

        return JsonSerializer.Serialize(new
        {
            ds.Id, ds.Name, Type = "GoogleSheets",
            ds.GoogleSheetsId, GoogleSheetsUrl = ds.GoogleSheetsUrl.ToString(),
            ds.SheetGid, CsvExportUrl = ds.CsvExportUrl.ToString(),
            ds.ProjectId, ds.CreatedAt,
            Note = "Use sync_data_source to populate headers and row count after creation."
        });
    }

    [McpServerTool, Description("Update the metadata (headers and row count) of a data source. For Google Sheets sources, provide the latest column headers and number of data rows.")]
    public async Task<string> SyncDataSourceMetadata(
        [Description("The data source ID.")] Guid dataSourceId,
        [Description("List of column header names.")] List<string> headers,
        [Description("Number of data rows (excluding the header row).")] int rowCount)
    {
        var ds = await Db.DataSources.FirstOrDefaultAsync(d => d.Id == dataSourceId);

        if (ds == null)
            return McpErrors.DataSourceNotFound;

        if (ds.ProjectId.HasValue && !await HasProjectAccessAsync(ds.ProjectId.Value))
            return McpErrors.AccessDenied;

        ds.Headers = headers;
        ds.RowCount = rowCount;
        ds.UpdatedAt = DateTime.UtcNow;

        await Db.SaveChangesAsync();
        return JsonSerializer.Serialize(new { ds.Id, ds.Name, ds.Headers, ds.RowCount, Status = "synced" });
    }

    [McpServerTool, Description("Delete a data source from a project.")]
    public async Task<string> DeleteDataSource(
        [Description("The data source ID to delete.")] Guid dataSourceId)
    {
        var ds = await Db.DataSources.FirstOrDefaultAsync(d => d.Id == dataSourceId);

        if (ds == null)
            return McpErrors.DataSourceNotFound;

        if (!ds.ProjectId.HasValue || !await HasProjectAccessAsync(ds.ProjectId.Value))
            return McpErrors.AccessDenied;

        Db.DataSources.Remove(ds);
        await Db.SaveChangesAsync();
        return McpErrors.Deleted;
    }

    private static (string? spreadsheetId, int? sheetGid) ExtractGoogleSheetsIds(Uri url)
    {
        string? spreadsheetId = null;
        int? sheetGid = null;

        var urlStr = url.ToString();

        foreach (var pattern in new[] { @"docs\.google\.com/spreadsheets/d/([a-zA-Z0-9-_]+)", @"spreadsheets/d/([a-zA-Z0-9-_]+)" })
        {
            var match = Regex.Match(urlStr, pattern);
            if (match.Success) { spreadsheetId = match.Groups[1].Value; break; }
        }

        var gidMatch = Regex.Match(urlStr, @"[#?&]gid=(\d+)");
        if (gidMatch.Success && int.TryParse(gidMatch.Groups[1].Value, out var parsedGid))
            sheetGid = parsedGid;

        return (spreadsheetId, sheetGid);
    }
}
