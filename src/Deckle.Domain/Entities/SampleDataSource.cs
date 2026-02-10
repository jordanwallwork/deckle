namespace Deckle.Domain.Entities;

/// <summary>
/// Data source copied from a sample data source into a user's project.
/// References the original sample data source via SourceDataSourceId.
/// </summary>
public class SampleDataSource : DataSource
{
    /// <summary>
    /// References the original sample data source this was copied from.
    /// Data is served from the referenced source instead of JsonData.
    /// </summary>
    public Guid? SourceDataSourceId { get; set; }

    public DataSource? SourceDataSource { get; set; }
}
