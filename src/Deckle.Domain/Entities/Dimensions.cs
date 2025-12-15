namespace Deckle.Domain.Entities;

public class Dimensions
{
    const decimal _mmPerInch = 25.4m;

    public required decimal WidthMm { get; init; }
    public required decimal HeightMm { get; init; }
    public int Dpi { get; set; } = 300;
    public int WidthPx => (int)Math.Round((WidthMm / _mmPerInch) * Dpi);
    public int HeightPx => (int)Math.Round((HeightMm / _mmPerInch) * Dpi);
}