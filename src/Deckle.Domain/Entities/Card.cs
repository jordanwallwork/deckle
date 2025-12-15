namespace Deckle.Domain.Entities;

public class Card : Component, IComponentWithDimensions
{
    public CardSize Size { get; set; }

    public string? FrontDesign { get; set; }

    public string? BackDesign { get; set; }

    public Dimensions GetDimensions() => Size.GetDimensions(false);
}
