namespace Deckle.Domain.Entities;

public class Card : EditableComponent, IDataSourceComponent,
    ICreatableComponent<Card, CardConfig>,
    IUpdatableComponent<Card, CardConfig>
{
    public CardSize Size { get; set; }

    public bool Horizontal { get; set; }

    public override string? FrontDesign { get; set; }

    public override string? BackDesign { get; set; }

    public override ComponentShape Shape { get; set; } = new RectangleShape(3);

    public DataSource? DataSource { get; set; }

    protected override string ComponentTypeName => "card";

    public override Dimensions GetDimensions() => Size.GetDimensions(Horizontal);

    #region Factory Methods

    public static Card Create(CardConfig config) => new()
    {
        Id = Guid.NewGuid(),
        Name = config.Name,
        Size = config.Size,
        Horizontal = config.Horizontal,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    public static void Validate(CardConfig config)
    {
        // No special validation required for cards
    }

    public static void ApplyUpdate(Card card, CardConfig config)
    {
        card.Name = config.Name;
        card.Size = config.Size;
        card.Horizontal = config.Horizontal;
        card.UpdatedAt = DateTime.UtcNow;
    }

    #endregion
}
