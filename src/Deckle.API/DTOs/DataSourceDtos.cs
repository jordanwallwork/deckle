namespace Deckle.API.DTOs;

public record DataSourceDto
{
    public required Guid Id { get; init; }
    public required Guid ProjectId { get; init; }
    public required string Name { get; init; }
    public required string Type { get; init; }
    public string? GoogleSheetsId { get; init; }
    public string? GoogleSheetsUrl { get; init; }
    public int? SheetGid { get; init; }
    public string? CsvExportUrl { get; init; }
    public List<string>? Headers { get; init; }
    public int? RowCount { get; init; }
    public required DateTime CreatedAt { get; init; }
    public required DateTime UpdatedAt { get; init; }
}

public record CreateDataSourceRequest(Guid ProjectId, string Name, string Url, int? SheetGid = null);

public record SyncDataSourceMetadataRequest(List<string> Headers, int RowCount);
