namespace Deckle.Domain.Entities;

public enum PlayerMatSize
{
    SmallRectangle,
    SmallSquare,
    MediumRectangle,
    MediumSquare,
    A4,
    USLetter
}

public enum PlayerMatOrientation
{
    Portrait,
    Landscape
}

public static class PlayerMatSizeExtensions
{
    private static readonly Dictionary<PlayerMatSize, (string Name, decimal WidthMm, decimal HeightMm)> PlayerMatSizeData = new()
    {
        { PlayerMatSize.SmallRectangle, ("Small Rectangle", 101.6m, 152.4m) },
        { PlayerMatSize.SmallSquare, ("Small Square", 152.4m, 152.4m) },
        { PlayerMatSize.MediumRectangle, ("Medium Rectangle", 152.4m, 228.6m) },
        { PlayerMatSize.MediumSquare, ("Medium Square", 228.6m, 228.6m) },
        { PlayerMatSize.A4, ("A4", 210m, 297m) },
        { PlayerMatSize.USLetter, ("US Letter", 215.9m, 279.4m) }
    };

    public static string GetName(this PlayerMatSize size) => PlayerMatSizeData[size].Name;
    public static decimal GetWidthMm(this PlayerMatSize size) => PlayerMatSizeData[size].WidthMm;
    public static decimal GetHeightMm(this PlayerMatSize size) => PlayerMatSizeData[size].HeightMm;

    public static Dimensions GetDimensions(this PlayerMatSize size, PlayerMatOrientation orientation)
    {
        var width = size.GetWidthMm();
        var height = size.GetHeightMm();
        return new()
        {
            WidthMm = orientation == PlayerMatOrientation.Landscape ? height : width,
            HeightMm = orientation == PlayerMatOrientation.Landscape ? width : height,
            BleedMm = 3
        };
    }
}
