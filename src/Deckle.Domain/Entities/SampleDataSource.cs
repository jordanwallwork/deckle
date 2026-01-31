namespace Deckle.Domain.Entities;

/// <summary>
/// Data source with inline sample data stored as JSON.
/// Typically not associated with a specific project and used for demonstration purposes.
/// </summary>
public class SampleDataSource : DataSource
{
    /// <summary>
    /// JSON string containing the sample data.
    /// Can be any valid JSON structure (array of objects, etc.).
    /// </summary>
    public string? JsonData { get; set; }
}
