namespace Deckle.Domain.Entities;

public enum DiceColor
{
    EarthGreen,
    MarsRed,
    MercuryGrey,
    NeptuneBlue,
    SpaceBlack,
    SunYellow,
    EmeraldGreen,
    JupiterOrange,
    NebularPurple,
    PlutoBrown,
    StarWhite
}

public static class DiceColorExtensions
{
    private static readonly Dictionary<DiceColor, (string Name, string HexCode, bool ColorblindFriendly)> DiceColorData = new()
    {
        { DiceColor.EarthGreen, ("Earth Green", "#3cb8b5", true) },
        { DiceColor.MarsRed, ("Mars Red", "#e00022", true) },
        { DiceColor.MercuryGrey, ("Mercury Grey", "#e5e1e6", true) },
        { DiceColor.NeptuneBlue, ("Neptune Blue", "#1d50b8", true) },
        { DiceColor.SpaceBlack, ("Space Black", "#111820", true) },
        { DiceColor.SunYellow, ("Sun Yellow", "#f4e834", true) },
        { DiceColor.EmeraldGreen, ("Emerald Green", "#34ab49", false) },
        { DiceColor.JupiterOrange, ("Jupiter Orange", "#ed8100", false) },
        { DiceColor.NebularPurple, ("Nebular Purple", "#872a92", false) },
        { DiceColor.PlutoBrown, ("Pluto Brown", "#8e4400", false) },
        { DiceColor.StarWhite, ("Star White", "#ffffff", false) }
    };

    public static string GetName(this DiceColor color) => DiceColorData[color].Name;
    public static string GetHexCode(this DiceColor color) => DiceColorData[color].HexCode;
    public static bool IsColorblindFriendly(this DiceColor color) => DiceColorData[color].ColorblindFriendly;
}
