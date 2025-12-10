namespace Deckle.Domain.Entities;

public class Card : Component
{
    public CardSize Size { get; set; }

    public string? FrontDesign { get; set; }

    public string? BackDesign { get; set; }
}
