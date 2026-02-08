using Deckle.Domain.Entities;

namespace Deckle.API.DTOs;

/// <summary>
/// Base DTO for all data source types.
/// </summary>
public record DataSourceDto
{
    public required Guid Id { get; init; }
    public Guid? ProjectId { get; init; }
    public required string Name { get; init; }
    public required string Type { get; init; }
    public List<string>? Headers { get; init; }
    public int? RowCount { get; init; }
    public required DateTime CreatedAt { get; init; }
    public required DateTime UpdatedAt { get; init; }

    // Google Sheets-specific properties (null for other types)
    public string? GoogleSheetsId { get; init; }
    public string? GoogleSheetsUrl { get; init; }
    public int? SheetGid { get; init; }
    public string? CsvExportUrl { get; init; }

    // Sample/Spreadsheet-specific properties (null for other types)
    public string? JsonData { get; init; }

    // Sample-specific: reference to original template data source
    public Guid? SourceDataSourceId { get; init; }

    /// <summary>
    /// Creates a DataSourceDto from a DataSource entity.
    /// </summary>
    public static DataSourceDto FromEntity(DataSource dataSource)
    {
        return dataSource switch
        {
            GoogleSheetsDataSource gs => new DataSourceDto
            {
                Id = gs.Id,
                ProjectId = gs.ProjectId,
                Name = gs.Name,
                Type = gs.Type.ToString(),
                Headers = gs.Headers,
                RowCount = gs.RowCount,
                CreatedAt = gs.CreatedAt,
                UpdatedAt = gs.UpdatedAt,
                GoogleSheetsId = gs.GoogleSheetsId,
                GoogleSheetsUrl = gs.GoogleSheetsUrl?.ToString(),
                SheetGid = gs.SheetGid,
                CsvExportUrl = gs.CsvExportUrl?.ToString(),
                JsonData = null
            },
            SampleDataSource sample => new DataSourceDto
            {
                Id = sample.Id,
                ProjectId = sample.ProjectId,
                Name = sample.Name,
                Type = sample.Type.ToString(),
                Headers = sample.Headers,
                RowCount = sample.RowCount,
                CreatedAt = sample.CreatedAt,
                UpdatedAt = sample.UpdatedAt,
                GoogleSheetsId = null,
                GoogleSheetsUrl = null,
                SheetGid = null,
                CsvExportUrl = null,
                JsonData = sample.JsonData,
                SourceDataSourceId = sample.SourceDataSourceId
            },
            SpreadsheetDataSource spreadsheet => new DataSourceDto
            {
                Id = spreadsheet.Id,
                ProjectId = spreadsheet.ProjectId,
                Name = spreadsheet.Name,
                Type = spreadsheet.Type.ToString(),
                Headers = spreadsheet.Headers,
                RowCount = spreadsheet.RowCount,
                CreatedAt = spreadsheet.CreatedAt,
                UpdatedAt = spreadsheet.UpdatedAt,
                GoogleSheetsId = null,
                GoogleSheetsUrl = null,
                SheetGid = null,
                CsvExportUrl = null,
                JsonData = spreadsheet.JsonData
            },
            _ => throw new InvalidOperationException($"Unknown data source type: {dataSource.GetType().Name}")
        };
    }
}

public record CreateDataSourceRequest(Guid ProjectId, string Name, string Url, int? SheetGid = null);

public record UpdateDataSourceRequest(string Name);

public record SyncDataSourceMetadataRequest(List<string> Headers, int RowCount);

// Admin Sample Data Source DTOs

public record AdminSampleDataSourceDto
{
    public required Guid Id { get; init; }
    public required string Name { get; init; }
    public List<string>? Headers { get; init; }
    public int? RowCount { get; init; }
    public required DateTime CreatedAt { get; init; }
    public required DateTime UpdatedAt { get; init; }
}

public record AdminSampleDataSourceDetailDto
{
    public required Guid Id { get; init; }
    public required string Name { get; init; }
    public List<string>? Headers { get; init; }
    public int? RowCount { get; init; }
    public required DateTime CreatedAt { get; init; }
    public required DateTime UpdatedAt { get; init; }
    public string? JsonData { get; init; }
}

public record AdminSampleDataSourceListResponse
{
    public required List<AdminSampleDataSourceDto> DataSources { get; init; }
    public required int TotalCount { get; init; }
    public required int Page { get; init; }
    public required int PageSize { get; init; }
}

public record CreateSampleDataSourceRequest(string Name, string? JsonData);

public record UpdateSampleDataSourceRequest(string Name, string? JsonData);

public record UpdateSampleComponentDataSourceRequest(Guid? DataSourceId);

public record CopySampleDataSourceRequest(Guid ProjectId, Guid SampleDataSourceId);

public record CreateSpreadsheetDataSourceRequest(Guid ProjectId, string Name);

public record UpdateSpreadsheetDataSourceRequest(string Name, string? JsonData);

public record SampleDataJson
{
    public List<string> Headers { get; init; } = [];
    public List<List<string>> Rows { get; init; } = [];
}
