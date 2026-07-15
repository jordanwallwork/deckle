using System.Text.Json;
using Deckle.Domain.Entities;

namespace Deckle.API.DTOs;

/// <summary>
/// Lightweight summary of a game setup for list views. Omits the (potentially
/// large) setup document; exposes only what the Play dialog and setup list need.
/// </summary>
public record GameSetupSummaryDto
{
    public required Guid Id { get; init; }
    public required Guid ProjectId { get; init; }
    public required string Name { get; init; }
    public required bool IsValid { get; init; }
    public required DateTime CreatedAt { get; init; }
    public required DateTime UpdatedAt { get; init; }
}

/// <summary>
/// Full game setup including the setup DSL document. The document is passed
/// through verbatim as a <see cref="JsonElement"/>; the server does not
/// interpret its contents.
/// </summary>
public record GameSetupDto
{
    public required Guid Id { get; init; }
    public required Guid ProjectId { get; init; }
    public required string Name { get; init; }
    public required JsonElement Document { get; init; }
    public required bool IsValid { get; init; }
    public required DateTime CreatedAt { get; init; }
    public required DateTime UpdatedAt { get; init; }

    public static GameSetupDto FromEntity(GameSetup setup) => new()
    {
        Id = setup.Id,
        ProjectId = setup.ProjectId,
        Name = setup.Name,
        Document = JsonDocument.Parse(setup.Document).RootElement.Clone(),
        IsValid = setup.IsValid,
        CreatedAt = setup.CreatedAt,
        UpdatedAt = setup.UpdatedAt
    };
}

/// <summary>
/// Request to create a new game setup. The client computes <see cref="IsValid"/>
/// at save time (see validation semantics in the game runner).
/// </summary>
public record CreateGameSetupRequest
{
    public required string Name { get; init; }
    public required JsonElement Document { get; init; }
    public bool IsValid { get; init; }
}

/// <summary>
/// Request to update an existing game setup.
/// </summary>
public record UpdateGameSetupRequest
{
    public required string Name { get; init; }
    public required JsonElement Document { get; init; }
    public bool IsValid { get; init; }
}
