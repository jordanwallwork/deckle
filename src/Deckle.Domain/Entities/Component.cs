namespace Deckle.Domain.Entities;

/// <summary>
/// Base interface for all game components.
/// Provides core properties that every component must have.
/// </summary>
public interface IComponent
{
    public Guid Id { get; }

    /// <summary>
    /// The project this component belongs to, or null for shared sample components.
    /// </summary>
    public Guid? ProjectId { get; }

    public string Name { get; }

    public DateTime CreatedAt { get; }

    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// Interface for components with editable front/back designs.
/// Implementations: Card, PlayerMat
/// Provides design storage and dimensional information for rendering.
/// </summary>
public interface IEditableComponent : IComponent
{
    /// <summary>
    /// Gets the dimensions of this component for rendering and export.
    /// </summary>
    public Dimensions GetDimensions();

    /// <summary>
    /// The shape of this component (Rectangle, Circle, etc.).
    /// </summary>
    public ComponentShape Shape { get; set; }

    /// <summary>
    /// Gets the design JSON for a specific part (e.g., "front", "back").
    /// </summary>
    /// <param name="part">The part name (case-insensitive).</param>
    /// <returns>The design JSON, or null if not set.</returns>
    /// <exception cref="ArgumentException">Thrown if the part name is invalid for this component type.</exception>
    public string? GetDesign(string part);

    /// <summary>
    /// Sets the design JSON for a specific part.
    /// Automatically updates the UpdatedAt timestamp.
    /// </summary>
    /// <param name="part">The part name (case-insensitive).</param>
    /// <param name="design">The design JSON to save.</param>
    /// <exception cref="ArgumentException">Thrown if the part name is invalid for this component type.</exception>
    public void SetDesign(string part, string? design);

}

/// <summary>
/// Interface for components that can be linked to a data source.
/// Implementations: Card, PlayerMat
/// Data sources provide dynamic content for component generation.
/// </summary>
public interface IDataSourceComponent : IComponent
{
    /// <summary>
    /// The linked data source, or null if not linked.
    /// </summary>
    public DataSource? DataSource { get; set; }
}

public abstract class Component : IComponent
{
    public Guid Id { get; set; }

    /// <summary>
    /// The project this component belongs to, or null for shared sample components.
    /// </summary>
    public Guid? ProjectId { get; set; }

    public string Name { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    /// <summary>
    /// The project this component belongs to, or null for shared sample components.
    /// </summary>
    public Project? Project { get; set; }
}

public abstract class EditableComponent : Component, IEditableComponent
{
    // Abstract properties that derived classes must implement
    public abstract string? FrontDesign { get; set; }
    public abstract string? BackDesign { get; set; }
    public abstract ComponentShape Shape { get; set; }

    // Abstract method that derived classes must implement
    public abstract Dimensions GetDimensions();

    // Property to use in error messages
    protected abstract string ComponentTypeName { get; }

    // Concrete implementation of GetDesign
    public string? GetDesign(string part) => part.ToLowerInvariant() switch
    {
        "front" => FrontDesign,
        "back" => BackDesign,
        _ => throw new ArgumentException($"Invalid part '{part}' for {ComponentTypeName}. Must be 'front' or 'back'.")
    };

    // Concrete implementation of SetDesign
    public void SetDesign(string part, string? design)
    {
        switch (part.ToLowerInvariant())
        {
            case "front": FrontDesign = design; break;
            case "back": BackDesign = design; break;
            default: throw new ArgumentException($"Invalid part '{part}' for {ComponentTypeName}. Must be 'front' or 'back'.");
        }

        UpdatedAt = DateTime.UtcNow;
    }
}
