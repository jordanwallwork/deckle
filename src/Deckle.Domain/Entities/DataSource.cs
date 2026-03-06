namespace Deckle.Domain.Entities;

/// <summary>
/// Base class for all data source types.
/// Uses TPH (Table Per Hierarchy) inheritance with DataSourceType as discriminator.
/// </summary>
public abstract class DataSource : ISizeAware
{
    public Guid Id { get; set; }

    /// <summary>
    /// Optional project association. SampleDataSources may not be associated with a specific project.
    /// </summary>
    public Guid? ProjectId { get; set; }

    public string Name { get; set; } = string.Empty;

    public DataSourceType Type { get; set; }

    [TrackByteSize]
    public List<string>? Headers { get; set; }

    public int? RowCount { get; set; }

    public long TotalByteSize { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public Project? Project { get; set; }
}

public enum DataSourceType
{
    GoogleSheets,
    Sample,
    Spreadsheet
}
