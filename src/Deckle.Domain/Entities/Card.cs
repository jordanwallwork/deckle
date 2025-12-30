namespace Deckle.Domain.Entities;

public class Card : Component, IEditableComponent, IDataSourceComponent
{
    public CardSize Size { get; set; }

    public string? FrontDesign { get; set; }

    public string? BackDesign { get; set; }

    public ComponentShape Shape { get; set; } = new RectangleShape(3);

    public DataSource? DataSource { get; set; }

    public Dimensions GetDimensions() => Size.GetDimensions(false);
}
