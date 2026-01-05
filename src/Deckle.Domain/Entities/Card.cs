
namespace Deckle.Domain.Entities;

public class Card : EditableComponent, IDataSourceComponent
{
    public CardSize Size { get; set; }

    public override string? FrontDesign { get; set; }

    public override string? BackDesign { get; set; }

    public override ComponentShape Shape { get; set; } = new RectangleShape(3);

    public DataSource? DataSource { get; set; }

    protected override string ComponentTypeName => "card";

    public override Dimensions GetDimensions() => Size.GetDimensions(false);
}
