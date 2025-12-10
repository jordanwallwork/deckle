namespace Deckle.Domain.Entities;

public class Dice : Component
{
    public DiceType Type { get; set; }

    public DiceStyle Style { get; set; }

    public DiceColor BaseColor { get; set; }
}
