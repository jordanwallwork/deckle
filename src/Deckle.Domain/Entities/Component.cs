namespace Deckle.Domain.Entities;

public interface IEditableComponent
{
    Dimensions GetDimensions();
    ComponentShape Shape { get; set; }
}

public interface IDataSourceComponent
{
    DataSource? DataSource { get; set; }
}

public abstract class Component
{
    public Guid Id { get; set; }

    public Guid ProjectId { get; set; }

    public string Name { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public Project Project { get; set; } = null!;
}
