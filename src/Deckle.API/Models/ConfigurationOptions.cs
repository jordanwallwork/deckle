namespace Deckle.API.Models;

public record ComponentConfigurationOptions
{
    public List<CardSizeOption> CardSizes { get; init; } = [];
    public List<DiceTypeOption> DiceTypes { get; init; } = [];
    public List<DiceStyleOption> DiceStyles { get; init; } = [];
    public List<DiceColorOption> DiceColors { get; init; } = [];
}

public record CardSizeOption(
    string Value,
    string Label,
    decimal WidthMm,
    decimal HeightMm
);

public record DiceTypeOption(
    string Value,
    string Label,
    decimal WidthMm,
    decimal HeightMm,
    decimal DepthMm
);

public record DiceStyleOption(
    string Value,
    string Label
);

public record DiceColorOption(
    string Value,
    string Label,
    string HexCode,
    bool ColorblindFriendly
);
