using Deckle.Domain.Entities;
using System.Diagnostics.CodeAnalysis;

namespace Deckle.API.DTOs;

public record ComponentDto
{
    public required Guid Id { get; init; }
    public required Guid ProjectId { get; init; }
    public required string Name { get; init; }
    public required DateTime CreatedAt { get; init; }
    public required DateTime UpdatedAt { get; init; }

    public ComponentDto() { }

    [SetsRequiredMembers]
    public ComponentDto(Component component)
    {
        Id = component.Id;
        ProjectId = component.ProjectId;
        Name = component.Name;
        CreatedAt = component.CreatedAt;
        UpdatedAt = component.UpdatedAt;
    }
}

public static class ComponentExtensions
{
    public static ComponentDto ToComponentDto(this Component c)
    {
        return c switch
        {
            Card card => new CardDto(card),
            Dice dice => new DiceDto(dice),
            _ => throw new InvalidOperationException($"Unknown component type: {c.GetType().Name}")
        };
    }
}

public record CardDto : ComponentDto
{
    public string Type = "Card";
    public required string Size { get; init; }
    public required Dimensions Dimensions { get; init; }
    public string? FrontDesign { get; init; }
    public string? BackDesign { get; init; }

    public CardDto() { }

    [SetsRequiredMembers]
    public CardDto(Card card) : base(card)
    {
        Size = card.Size.ToString();
        Dimensions = card.Size.GetDimensions(false);
        FrontDesign = card.FrontDesign;
        BackDesign = card.BackDesign;
    }
}

public record DiceDto : ComponentDto
{
    public string Type = "Dice";
    public required string Style { get; init; }
    public required string BaseColor { get; init; }
    public required int Number { get; init; }

    public DiceDto() { }

    [SetsRequiredMembers]
    public DiceDto(Dice dice) : base(dice)
    {
        Style = dice.Style.ToString();
        BaseColor = dice.BaseColor.ToString();
        Number = dice.Number;
    }
}

public record CreateCardRequest(string Name, CardSize Size);

public record CreateDiceRequest(string Name, DiceType Type, DiceStyle Style, DiceColor BaseColor, int Number);

public record UpdateCardRequest(string Name, CardSize Size);

public record UpdateDiceRequest(string Name, DiceType Type, DiceStyle Style, DiceColor BaseColor, int Number);
