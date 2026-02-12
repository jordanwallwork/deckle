namespace Deckle.Domain.Entities;

/// <summary>
/// Data source with inline data stored as JSON, editable via a built-in spreadsheet editor.
/// Can be created by regular users in their projects or by admins for samples.
/// </summary>
public class SpreadsheetDataSource : DataSource
{
    /// <summary>
    /// JSON string containing the spreadsheet data.
    /// Format: { "headers": [...], "rows": [[...], ...] }
    /// </summary>
    public string? JsonData { get; set; }
}
