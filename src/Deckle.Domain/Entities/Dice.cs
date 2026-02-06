namespace Deckle.Domain.Entities;

public class Dice : Component,
    ICreatableComponent<Dice, DiceConfig>,
    IUpdatableComponent<Dice, DiceConfig>
{
    public DiceType Type { get; set; }

    public DiceStyle Style { get; set; }

    public DiceColor BaseColor { get; set; }

    public int Number { get; set; }

    #region Factory Methods

    public static Dice Create(DiceConfig config) => new()
    {
        Id = Guid.NewGuid(),
        Name = config.Name,
        Type = config.Type,
        Style = config.Style,
        BaseColor = config.BaseColor,
        Number = config.Number,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    public static void Validate(DiceConfig config)
    {
        // No special validation required for dice
    }

    public static void ApplyUpdate(Dice dice, DiceConfig config)
    {
        dice.Name = config.Name;
        dice.Type = config.Type;
        dice.Style = config.Style;
        dice.BaseColor = config.BaseColor;
        dice.Number = config.Number;
        dice.UpdatedAt = DateTime.UtcNow;
    }

    #endregion
}
