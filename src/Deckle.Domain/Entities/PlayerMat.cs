namespace Deckle.Domain.Entities;

public class PlayerMat : EditableComponent, IDataSourceComponent,
    ICreatableComponent<PlayerMat, PlayerMatConfig>,
    IUpdatableComponent<PlayerMat, PlayerMatConfig>
{
    // If PresetSize is set, use it with Horizontal
    // Otherwise, use CustomWidthMm and CustomHeightMm
    public PlayerMatSize? PresetSize { get; set; }

    public bool Horizontal { get; set; }

    public decimal? CustomWidthMm { get; set; }

    public decimal? CustomHeightMm { get; set; }

    public override string? FrontDesign { get; set; }

    public override string? BackDesign { get; set; }

    public override ComponentShape Shape { get; set; } = new RectangleShape(3);

    public DataSource? DataSource { get; set; }

    protected override string ComponentTypeName => "player mat";

    public override Dimensions GetDimensions()
    {
        if (PresetSize.HasValue)
        {
            return PresetSize.Value.GetDimensions(Horizontal);
        }
        else
        {
            return new()
            {
                WidthMm = CustomWidthMm!.Value,
                HeightMm = CustomHeightMm!.Value,
                BleedMm = 3
            };
        }
    }

    #region Factory Methods

    public static PlayerMat Create(PlayerMatConfig config)
    {
        Validate(config);
        return new()
        {
            Id = Guid.NewGuid(),
            Name = config.Name,
            PresetSize = config.PresetSize,
            Horizontal = config.Horizontal,
            CustomWidthMm = config.CustomWidthMm,
            CustomHeightMm = config.CustomHeightMm,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public static void Validate(PlayerMatConfig config)
    {
        if (!config.PresetSize.HasValue &&
            (!config.CustomWidthMm.HasValue || !config.CustomHeightMm.HasValue))
        {
            throw new ArgumentException(
                "Either PresetSize must be set, or both CustomWidthMm and CustomHeightMm must be provided");
        }

        if (config.CustomWidthMm.HasValue || config.CustomHeightMm.HasValue)
        {
            if (config.CustomWidthMm is < 63m or > 297m)
                throw new ArgumentException("CustomWidthMm must be between 63mm and 297mm");
            if (config.CustomHeightMm is < 63m or > 297m)
                throw new ArgumentException("CustomHeightMm must be between 63mm and 297mm");
        }
    }

    public static void ApplyUpdate(PlayerMat mat, PlayerMatConfig config)
    {
        Validate(config);
        mat.Name = config.Name;
        mat.PresetSize = config.PresetSize;
        mat.Horizontal = config.Horizontal;
        mat.CustomWidthMm = config.CustomWidthMm;
        mat.CustomHeightMm = config.CustomHeightMm;
        mat.UpdatedAt = DateTime.UtcNow;
    }

    #endregion
}
