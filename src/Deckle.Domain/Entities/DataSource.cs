namespace Deckle.Domain.Entities;

public class DataSource
{
    public Guid Id { get; set; }

    public Guid ProjectId { get; set; }

    public string Name { get; set; } = string.Empty;

    public DataSourceType Type { get; set; }

    public string ConnectionString { get; set; } = string.Empty;

    public string? GoogleSheetsId { get; set; }

    public string? GoogleSheetsUrl { get; set; }

    public int? SheetGid { get; set; }

    public string? CsvExportUrl { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public Project Project { get; set; } = null!;
}

public enum DataSourceType
{
    GoogleSheets
}
