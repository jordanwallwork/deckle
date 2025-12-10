namespace Deckle.API.Models;

public abstract record ComponentResponse
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Type { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record CardResponse : ComponentResponse
{
    public string Size { get; init; } = string.Empty;
    public string SizeLabel { get; init; } = string.Empty;
    public decimal WidthMm { get; init; }
    public decimal HeightMm { get; init; }
}

public record DiceResponse : ComponentResponse
{
    public string DiceType { get; init; } = string.Empty;
    public string DiceTypeLabel { get; init; } = string.Empty;
    public string Style { get; init; } = string.Empty;
    public string BaseColor { get; init; } = string.Empty;
    public string BaseColorLabel { get; init; } = string.Empty;
    public string BaseColorHex { get; init; } = string.Empty;
    public bool ColorblindFriendly { get; init; }
    public decimal WidthMm { get; init; }
    public decimal HeightMm { get; init; }
    public decimal DepthMm { get; init; }
}
