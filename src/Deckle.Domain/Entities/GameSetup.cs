namespace Deckle.Domain.Entities;

/// <summary>
/// A named, server-persisted game setup configuration belonging to a project.
/// A project may have many setups. The whole setup DSL document (version,
/// player-count bounds, options, blueprints and setup steps) is stored
/// atomically in a single jsonb column; the server treats it as an opaque
/// document and does not interpret its semantics. All semantic validation
/// lives in the TypeScript game runner; the client computes and persists
/// <see cref="IsValid"/> at save time for Play-dialog badges.
/// </summary>
public class GameSetup
{
    public Guid Id { get; set; }

    /// <summary>
    /// The project this setup belongs to.
    /// </summary>
    public Guid ProjectId { get; set; }

    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// The full setup DSL document, stored verbatim as jsonb (raw JSON text).
    /// The server treats it as opaque; parsing/validation lives in the client.
    /// </summary>
    public string Document { get; set; } = string.Empty;

    /// <summary>
    /// Client-computed validity of <see cref="Document"/> at the time it was last saved.
    /// </summary>
    public bool IsValid { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public Project? Project { get; set; }
}
