namespace Deckle.Domain.Entities;

/// <summary>
/// Data source that reads data from a public Google Sheet.
/// </summary>
public class GoogleSheetsDataSource : DataSource
{
    public string? GoogleSheetsId { get; set; }

    public Uri? GoogleSheetsUrl { get; set; }

    public int? SheetGid { get; set; }

    public Uri? CsvExportUrl { get; set; }
}
