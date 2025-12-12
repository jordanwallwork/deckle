using Deckle.Domain.Entities;

namespace Deckle.API.DTOs;

public record ComponentDto
{
    public required Guid Id { get; init; }
    public required Guid ProjectId { get; init; }
    public required string Name { get; init; }
    public required string Type { get; init; } // "Card" or "Dice"
    public required DateTime CreatedAt { get; init; }
    public required DateTime UpdatedAt { get; init; }

    // Card-specific properties (null for Dice)
    public string? CardSize { get; init; }
    public string? FrontDesign { get; init; }
    public string? BackDesign { get; init; }

    // Dice-specific properties (null for Card)
    public string? DiceType { get; init; }
    public string? DiceStyle { get; init; }
    public string? DiceBaseColor { get; init; }
    public int? DiceNumber { get; init; }
}

public record CardDto
{
    public required Guid Id { get; init; }
    public required Guid ProjectId { get; init; }   
    public required string Name { get; init; }
    public required string Size { get; init; }
    public string? FrontDesign { get; init; }
    public string? BackDesign { get; init; }
    public required DateTime CreatedAt { get; init; }
    public required DateTime UpdatedAt { get; init; }
}

public record DiceDto
{
    public required Guid Id { get; init; }
    public required Guid ProjectId { get; init; }
    public required string Name { get; init; }
    public required string Type { get; init; }
    public required string Style { get; init; }
    public required string BaseColor { get; init; }
    public required int Number { get; init; }
    public required DateTime CreatedAt { get; init; }
    public required DateTime UpdatedAt { get; init; }
}

public record CreateCardRequest(string Name, CardSize Size);

public record CreateDiceRequest(string Name, DiceType Type, DiceStyle Style, DiceColor BaseColor, int Number);

public record UpdateCardRequest(string Name, CardSize Size);

public record UpdateDiceRequest(string Name, DiceType Type, DiceStyle Style, DiceColor BaseColor, int Number);
