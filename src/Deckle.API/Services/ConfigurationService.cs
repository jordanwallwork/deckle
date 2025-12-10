using Deckle.API.Models;
using Deckle.Domain.Entities;

namespace Deckle.API.Services;

public class ConfigurationService
{
    public ComponentConfigurationOptions GetComponentConfigurationOptions()
    {
        return new ComponentConfigurationOptions
        {
            CardSizes = GetCardSizes(),
            DiceTypes = GetDiceTypes(),
            DiceStyles = GetDiceStyles(),
            DiceColors = GetDiceColors()
        };
    }

    private static List<CardSizeOption> GetCardSizes()
    {
        return Enum.GetValues<CardSize>()
            .Select(size => new CardSizeOption(
                Value: size.ToString(),
                Label: $"{size.GetName()} ({size.GetWidthMm()}mm × {size.GetHeightMm()}mm)",
                WidthMm: size.GetWidthMm(),
                HeightMm: size.GetHeightMm()
            ))
            .ToList();
    }

    private static List<DiceTypeOption> GetDiceTypes()
    {
        return Enum.GetValues<DiceType>()
            .Select(type => new DiceTypeOption(
                Value: type.ToString(),
                Label: type.GetName(),
                WidthMm: type.GetWidthMm(),
                HeightMm: type.GetHeightMm(),
                DepthMm: type.GetDepthMm()
            ))
            .ToList();
    }

    private static List<DiceStyleOption> GetDiceStyles()
    {
        return Enum.GetValues<DiceStyle>()
            .Select(style => new DiceStyleOption(
                Value: style.ToString(),
                Label: style.ToString()
            ))
            .ToList();
    }

    private static List<DiceColorOption> GetDiceColors()
    {
        return Enum.GetValues<DiceColor>()
            .Select(color => new DiceColorOption(
                Value: color.ToString(),
                Label: color.GetName(),
                HexCode: color.GetHexCode(),
                ColorblindFriendly: color.IsColorblindFriendly()
            ))
            .ToList();
    }
}
