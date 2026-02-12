namespace Deckle.Domain.Entities;

public class PlayerMat : EditableComponent, IDataSourceComponent
{
    // If PresetSize is set, use it with Horizontal
    // Otherwise, use CustomWidthMm and CustomHeightMm
    public PlayerMatSize? PresetSize { get; set; }

    public bool Horizontal { get; set; }

    public decimal? CustomWidthMm { get; set; }

    public decimal? CustomHeightMm { get; set; }

    public override string? FrontDesign { get; set; }

    public override string? BackDesign { get; set; }

    public override ComponentShape Shape { get; set; } = new RectangleShape(3);

    public DataSource? DataSource { get; set; }

    protected override string ComponentTypeName => "player mat";

    public override Dimensions GetDimensions()
    {
        return PresetSize.HasValue
            ? PresetSize.Value.GetDimensions(Horizontal)
            : new()
            {
                WidthMm = CustomWidthMm!.Value,
                HeightMm = CustomHeightMm!.Value,
                BleedMm = 3
            };
    }
}
