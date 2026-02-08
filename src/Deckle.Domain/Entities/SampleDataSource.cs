namespace Deckle.Domain.Entities;

/// <summary>
/// Data source copied from a template's data source into a user's project.
/// References the original template data source via SourceDataSourceId.
/// </summary>
public class SampleDataSource : DataSource
{
    /// <summary>
    /// JSON string containing the sample data (legacy, may be null if SourceDataSourceId is set).
    /// </summary>
    public string? JsonData { get; set; }

    /// <summary>
    /// References the original template data source this was copied from.
    /// When set, data is served from the referenced source instead of JsonData.
    /// </summary>
    public Guid? SourceDataSourceId { get; set; }

    public DataSource? SourceDataSource { get; set; }
}
