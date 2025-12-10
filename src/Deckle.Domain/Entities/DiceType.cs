namespace Deckle.Domain.Entities;

public enum DiceType
{
    D4,
    D6,
    D8,
    D10,
    D12,
    D20
}

public static class DiceTypeExtensions
{
    private static readonly Dictionary<DiceType, (string Name, decimal WidthMm, decimal HeightMm, decimal DepthMm)> DiceTypeData = new()
    {
        { DiceType.D4, ("D4", 19m, 19m, 19m) },
        { DiceType.D6, ("D6", 16m, 16m, 16m) },
        { DiceType.D8, ("D8", 16m, 16m, 16m) },
        { DiceType.D10, ("D10", 16m, 16m, 16m) },
        { DiceType.D12, ("D12", 18m, 18m, 18m) },
        { DiceType.D20, ("D20", 20m, 20m, 20m) }
    };

    public static string GetName(this DiceType type) => DiceTypeData[type].Name;
    public static decimal GetWidthMm(this DiceType type) => DiceTypeData[type].WidthMm;
    public static decimal GetHeightMm(this DiceType type) => DiceTypeData[type].HeightMm;
    public static decimal GetDepthMm(this DiceType type) => DiceTypeData[type].DepthMm;
}
