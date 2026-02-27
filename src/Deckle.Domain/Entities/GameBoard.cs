namespace Deckle.Domain.Entities;

public class FoldedDimensions
{
    public required decimal WidthMm { get; init; }
    public required decimal HeightMm { get; init; }
    public required decimal ThicknessMm { get; init; }
}

public enum GameBoardSize
{
    // Square bi-folds (1 fold, bi-fold square shape when folded)
    SmallBifoldSquare,
    MediumBifoldSquare,
    LargeBifoldSquare,
    ExtraLargeBifoldSquare,

    // Square quad-folds (1 horizontal + 1 vertical fold)
    SmallQuadFoldSquare,
    MediumQuadFoldSquare,
    LargeQuadFoldSquare,
    ExtraLargeQuadFoldSquare,

    // Rectangle bi-folds (1 fold, rectangle shape when folded)
    SmallBifoldRectangle,
    MediumBifoldRectangle,
    LargeBifoldRectangle,

    // Rectangle quad-folds (1 horizontal + 1 vertical fold)
    SmallQuadFoldRectangle,
    MediumQuadFoldRectangle,
    LargeQuadFoldRectangle,
}

public static class GameBoardSizeExtensions
{
    private record SizeData(decimal LandscapeWidthMm, decimal LandscapeHeightMm, bool IsQuadFold);

    private static readonly Dictionary<GameBoardSize, SizeData> Data = new()
    {
        { GameBoardSize.SmallBifoldSquare,        new(304.8m,  152.4m, false) },
        { GameBoardSize.MediumBifoldSquare,       new(457.2m,  228.6m, false) },
        { GameBoardSize.LargeBifoldSquare,        new(533.4m,  266.7m, false) },
        { GameBoardSize.ExtraLargeBifoldSquare,   new(609.6m,  304.8m, false) },
        { GameBoardSize.SmallQuadFoldSquare,      new(304.8m,  304.8m, true)  },
        { GameBoardSize.MediumQuadFoldSquare,     new(457.2m,  457.2m, true)  },
        { GameBoardSize.LargeQuadFoldSquare,      new(533.4m,  533.4m, true)  },
        { GameBoardSize.ExtraLargeQuadFoldSquare, new(609.6m,  609.6m, true)  },
        { GameBoardSize.SmallBifoldRectangle,     new(203.2m,  152.4m, false) },
        { GameBoardSize.MediumBifoldRectangle,    new(304.8m,  228.6m, false) },
        { GameBoardSize.LargeBifoldRectangle,     new(381.0m,  266.7m, false) },
        { GameBoardSize.SmallQuadFoldRectangle,   new(304.8m,  203.2m, true)  },
        { GameBoardSize.MediumQuadFoldRectangle,  new(457.2m,  304.8m, true)  },
        { GameBoardSize.LargeQuadFoldRectangle,   new(533.4m,  381.0m, true)  },
    };

    /// <summary>
    /// Returns the unfolded width of the preset in the given orientation.
    /// Horizontal=true is landscape (wider dimension first); false is portrait.
    /// </summary>
    public static decimal GetWidthMm(this GameBoardSize size, bool horizontal)
    {
        var d = Data[size];
        return horizontal ? d.LandscapeWidthMm : d.LandscapeHeightMm;
    }

    /// <summary>
    /// Returns the unfolded height of the preset in the given orientation.
    /// </summary>
    public static decimal GetHeightMm(this GameBoardSize size, bool horizontal)
    {
        var d = Data[size];
        return horizontal ? d.LandscapeHeightMm : d.LandscapeWidthMm;
    }

    /// <summary>
    /// Number of vertical fold creases (each halves the width dimension).
    /// Quad-folds always have 1; bi-folds have 1 when horizontal, 0 when portrait.
    /// </summary>
    public static int GetVerticalFolds(this GameBoardSize size, bool horizontal)
    {
        return Data[size].IsQuadFold ? 1 : (horizontal ? 1 : 0);
    }

    /// <summary>
    /// Number of horizontal fold creases (each halves the height dimension).
    /// Quad-folds always have 1; bi-folds have 0 when horizontal, 1 when portrait.
    /// </summary>
    public static int GetHorizontalFolds(this GameBoardSize size, bool horizontal)
    {
        return Data[size].IsQuadFold ? 1 : (horizontal ? 0 : 1);
    }
}

public class GameBoard : EditableComponent, IDataSourceComponent
{
    private const decimal BaseThicknessMm = 2.5m;

    // If PresetSize is set, dimensions and folds are derived from it + Horizontal.
    // Otherwise, use Custom* fields.
    public GameBoardSize? PresetSize { get; set; }

    public bool Horizontal { get; set; } = true;

    public decimal? CustomWidthMm { get; set; }

    public decimal? CustomHeightMm { get; set; }

    public int? CustomHorizontalFolds { get; set; }

    public int? CustomVerticalFolds { get; set; }

    public override string? FrontDesign { get; set; }

    public override string? BackDesign { get; set; }

    public override ComponentShape Shape { get; set; } = new RectangleShape(0);

    public DataSource? DataSource { get; set; }

    protected override string ComponentTypeName => "game board";

    /// <summary>
    /// Effective number of horizontal fold creases (halves the height when folded).
    /// </summary>
    public int EffectiveHorizontalFolds =>
        PresetSize.HasValue
            ? PresetSize.Value.GetHorizontalFolds(Horizontal)
            : (CustomHorizontalFolds ?? 0);

    /// <summary>
    /// Effective number of vertical fold creases (halves the width when folded).
    /// </summary>
    public int EffectiveVerticalFolds =>
        PresetSize.HasValue
            ? PresetSize.Value.GetVerticalFolds(Horizontal)
            : (CustomVerticalFolds ?? 0);

    /// <summary>
    /// Returns the unfolded dimensions of the board (used for design canvas).
    /// </summary>
    public override Dimensions GetDimensions() => new()
    {
        WidthMm = PresetSize.HasValue ? PresetSize.Value.GetWidthMm(Horizontal) : CustomWidthMm!.Value,
        HeightMm = PresetSize.HasValue ? PresetSize.Value.GetHeightMm(Horizontal) : CustomHeightMm!.Value,
        BleedMm = 3
    };

    /// <summary>
    /// Returns the folded dimensions of the board, including thickness.
    /// FoldedWidth  = Width  / 2^VerticalFolds
    /// FoldedHeight = Height / 2^HorizontalFolds
    /// Thickness    = 2.5mm  * 2^(HorizontalFolds + VerticalFolds)
    /// </summary>
    public FoldedDimensions GetFoldedDimensions()
    {
        var hf = EffectiveHorizontalFolds;
        var vf = EffectiveVerticalFolds;
        var dims = GetDimensions();
        return new FoldedDimensions
        {
            WidthMm = dims.WidthMm / (decimal)Math.Pow(2, vf),
            HeightMm = dims.HeightMm / (decimal)Math.Pow(2, hf),
            ThicknessMm = BaseThicknessMm * (decimal)Math.Pow(2, hf + vf)
        };
    }
}
