namespace Deckle.Domain.Entities;

public enum CardSize
{
    MiniAmerican,
    MiniEuro,
    Bridge,
    MetricPoker,
    StandardPoker,
    Tarot,
    Jumbo,
    ExtraSmallSquare,
    SmallSquare,
    MediumSquare,
    LargeSquare
}

public static class CardSizeExtensions
{
    private static readonly Dictionary<CardSize, (string Name, decimal WidthMm, decimal HeightMm)> CardSizeData = new()
    {
        { CardSize.MiniAmerican, ("Mini American", 41m, 63m) },
        { CardSize.MiniEuro, ("Mini Euro", 44m, 67m) },
        { CardSize.Bridge, ("Bridge", 57.2m, 88.9m) },
        { CardSize.MetricPoker, ("Metric Poker", 63m, 88m) },
        { CardSize.StandardPoker, ("Standard Poker", 63.5m, 88.9m) },
        { CardSize.Tarot, ("Tarot", 70m, 120m) },
        { CardSize.Jumbo, ("Jumbo", 88m, 126m) },
        { CardSize.ExtraSmallSquare, ("Extra Small Square", 55m, 55m) },
        { CardSize.SmallSquare, ("Small Square", 63.5m, 63.5m) },
        { CardSize.MediumSquare, ("Medium Square", 70m, 70m) },
        { CardSize.LargeSquare, ("Large Square", 88.9m, 88.9m) }
    };

    public static string GetName(this CardSize size) => CardSizeData[size].Name;
    public static decimal GetWidthMm(this CardSize size) => CardSizeData[size].WidthMm;
    public static decimal GetHeightMm(this CardSize size) => CardSizeData[size].HeightMm;
}
