namespace Deckle.Domain.Entities;

public class PlayerMat : EditableComponent, IDataSourceComponent
{
    // If PresetSize is set, use it with Orientation
    // Otherwise, use CustomWidthMm and CustomHeightMm
    public PlayerMatSize? PresetSize { get; set; }

    public PlayerMatOrientation Orientation { get; set; } = PlayerMatOrientation.Portrait;

    public decimal? CustomWidthMm { get; set; }

    public decimal? CustomHeightMm { get; set; }

    public override string? FrontDesign { get; set; }

    public override string? BackDesign { get; set; }

    public override ComponentShape Shape { get; set; } = new RectangleShape(3);

    public DataSource? DataSource { get; set; }

    protected override string ComponentTypeName => "player mat";

    public override Dimensions GetDimensions()
    {
        if (PresetSize.HasValue)
        {
            return PresetSize.Value.GetDimensions(Orientation);
        }
        else
        {
            return new()
            {
                WidthMm = CustomWidthMm!.Value,
                HeightMm = CustomHeightMm!.Value,
                BleedMm = 3
            };
        }
    }
}
