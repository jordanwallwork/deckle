using Deckle.Domain.Entities;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

namespace Deckle.API.DTOs;

[JsonDerivedType(typeof(CardDto), typeDiscriminator: "Card")]
[JsonDerivedType(typeof(DiceDto), typeDiscriminator: "Dice")]
[JsonDerivedType(typeof(PlayerMatDto), typeDiscriminator: "PlayerMat")]
public abstract record ComponentDto
{
    public required string Type { get; init; }
    public required Guid Id { get; init; }
    public required Guid ProjectId { get; init; }
    public required string Name { get; init; }
    public required DateTime CreatedAt { get; init; }
    public required DateTime UpdatedAt { get; init; }

    public ComponentDto(string type)
    {
        Type = type;
    }

    [SetsRequiredMembers]
    public ComponentDto(string type, Component component)
    {
        Type = type;
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
            PlayerMat playerMat => new PlayerMatDto(playerMat),
            _ => throw new InvalidOperationException($"Unknown component type: {c.GetType().Name}")
        };
    }
}

public record DataSourceInfo(Guid Id, string Name);

public record CardDto : ComponentDto
{
    public required string Size { get; init; }
    public required Dimensions Dimensions { get; init; }
    public string? FrontDesign { get; init; }
    public string? BackDesign { get; init; }
    public required ComponentShape Shape { get; init; }
    public DataSourceInfo? DataSource { get; init; }

    public CardDto() : base("Card") { }

    [SetsRequiredMembers]
    public CardDto(Card card) : base("Card", card)
    {
        Size = card.Size.ToString();
        Dimensions = card.Size.GetDimensions(false);
        FrontDesign = card.FrontDesign;
        BackDesign = card.BackDesign;
        Shape = card.Shape;
        DataSource = card.DataSource != null
            ? new DataSourceInfo(card.DataSource.Id, card.DataSource.Name)
            : null;
    }
}

public record DiceDto : ComponentDto
{
    public required string DiceType { get; init; }
    public required string Style { get; init; }
    public required string BaseColor { get; init; }
    public required int Number { get; init; }

    public DiceDto() : base("Dice") { }

    [SetsRequiredMembers]
    public DiceDto(Dice dice) : base("Dice", dice)
    {
        DiceType = dice.Type.ToString();
        Style = dice.Style.ToString();
        BaseColor = dice.BaseColor.ToString();
        Number = dice.Number;
    }
}

public record CreateCardRequest(string Name, CardSize Size);

public record CreateDiceRequest(string Name, DiceType Type, DiceStyle Style, DiceColor BaseColor, int Number);

public record UpdateCardRequest(string Name, CardSize Size);

public record UpdateDiceRequest(string Name, DiceType Type, DiceStyle Style, DiceColor BaseColor, int Number);

public record PlayerMatDto : ComponentDto
{
    public string? PresetSize { get; init; }
    public required string Orientation { get; init; }
    public decimal? CustomWidthMm { get; init; }
    public decimal? CustomHeightMm { get; init; }
    public required Dimensions Dimensions { get; init; }
    public string? FrontDesign { get; init; }
    public string? BackDesign { get; init; }
    public required ComponentShape Shape { get; init; }
    public DataSourceInfo? DataSource { get; init; }

    public PlayerMatDto() : base("PlayerMat") { }

    [SetsRequiredMembers]
    public PlayerMatDto(PlayerMat playerMat) : base("PlayerMat", playerMat)
    {
        PresetSize = playerMat.PresetSize?.ToString();
        Orientation = playerMat.Orientation.ToString();
        CustomWidthMm = playerMat.CustomWidthMm;
        CustomHeightMm = playerMat.CustomHeightMm;
        Dimensions = playerMat.GetDimensions();
        FrontDesign = playerMat.FrontDesign;
        BackDesign = playerMat.BackDesign;
        Shape = playerMat.Shape;
        DataSource = playerMat.DataSource != null
            ? new DataSourceInfo(playerMat.DataSource.Id, playerMat.DataSource.Name)
            : null;
    }
}

public record CreatePlayerMatRequest(
    string Name,
    PlayerMatSize? PresetSize,
    PlayerMatOrientation Orientation,
    decimal? CustomWidthMm,
    decimal? CustomHeightMm);

public record UpdatePlayerMatRequest(
    string Name,
    PlayerMatSize? PresetSize,
    PlayerMatOrientation Orientation,
    decimal? CustomWidthMm,
    decimal? CustomHeightMm);

