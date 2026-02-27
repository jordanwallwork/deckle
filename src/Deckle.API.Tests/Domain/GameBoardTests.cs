using Deckle.Domain.Entities;

namespace Deckle.API.Tests.EntityTests;

public class GameBoardTests
{
    #region GameBoardSizeExtensions Tests

    [Fact]
    public void GetWidthMm_BifoldHorizontal_ReturnsLandscapeWidth()
    {
        var result = GameBoardSize.SmallBifoldSquare.GetWidthMm(horizontal: true);

        Assert.Equal(304.8m, result);
    }

    [Fact]
    public void GetWidthMm_BifoldPortrait_ReturnsLandscapeHeight()
    {
        var result = GameBoardSize.SmallBifoldSquare.GetWidthMm(horizontal: false);

        Assert.Equal(152.4m, result);
    }

    [Fact]
    public void GetHeightMm_BifoldHorizontal_ReturnsLandscapeHeight()
    {
        var result = GameBoardSize.SmallBifoldSquare.GetHeightMm(horizontal: true);

        Assert.Equal(152.4m, result);
    }

    [Fact]
    public void GetHeightMm_BifoldPortrait_ReturnsLandscapeWidth()
    {
        var result = GameBoardSize.SmallBifoldSquare.GetHeightMm(horizontal: false);

        Assert.Equal(304.8m, result);
    }

    [Fact]
    public void GetVerticalFolds_BifoldHorizontal_Returns1()
    {
        var result = GameBoardSize.SmallBifoldSquare.GetVerticalFolds(horizontal: true);

        Assert.Equal(1, result);
    }

    [Fact]
    public void GetVerticalFolds_BifoldPortrait_Returns0()
    {
        var result = GameBoardSize.SmallBifoldSquare.GetVerticalFolds(horizontal: false);

        Assert.Equal(0, result);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void GetVerticalFolds_QuadFold_AlwaysReturns1(bool horizontal)
    {
        var result = GameBoardSize.SmallQuadFoldSquare.GetVerticalFolds(horizontal);

        Assert.Equal(1, result);
    }

    [Fact]
    public void GetHorizontalFolds_BifoldHorizontal_Returns0()
    {
        var result = GameBoardSize.SmallBifoldSquare.GetHorizontalFolds(horizontal: true);

        Assert.Equal(0, result);
    }

    [Fact]
    public void GetHorizontalFolds_BifoldPortrait_Returns1()
    {
        var result = GameBoardSize.SmallBifoldSquare.GetHorizontalFolds(horizontal: false);

        Assert.Equal(1, result);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void GetHorizontalFolds_QuadFold_AlwaysReturns1(bool horizontal)
    {
        var result = GameBoardSize.SmallQuadFoldSquare.GetHorizontalFolds(horizontal);

        Assert.Equal(1, result);
    }

    #endregion

    #region EffectiveHorizontalFolds Tests

    [Fact]
    public void EffectiveHorizontalFolds_PresetBifoldHorizontal_Returns0()
    {
        var board = MakeBoard(GameBoardSize.SmallBifoldSquare, horizontal: true);

        Assert.Equal(0, board.EffectiveHorizontalFolds);
    }

    [Fact]
    public void EffectiveHorizontalFolds_PresetBifoldPortrait_Returns1()
    {
        var board = MakeBoard(GameBoardSize.SmallBifoldSquare, horizontal: false);

        Assert.Equal(1, board.EffectiveHorizontalFolds);
    }

    [Fact]
    public void EffectiveHorizontalFolds_PresetQuadFold_Returns1()
    {
        var board = MakeBoard(GameBoardSize.SmallQuadFoldSquare, horizontal: true);

        Assert.Equal(1, board.EffectiveHorizontalFolds);
    }

    [Fact]
    public void EffectiveHorizontalFolds_CustomValue_ReturnsCustomValue()
    {
        var board = MakeBoard(preset: null, customHFolds: 2);

        Assert.Equal(2, board.EffectiveHorizontalFolds);
    }

    [Fact]
    public void EffectiveHorizontalFolds_NoPresetNoCustom_Returns0()
    {
        var board = MakeBoard(preset: null);

        Assert.Equal(0, board.EffectiveHorizontalFolds);
    }

    #endregion

    #region EffectiveVerticalFolds Tests

    [Fact]
    public void EffectiveVerticalFolds_PresetBifoldHorizontal_Returns1()
    {
        var board = MakeBoard(GameBoardSize.SmallBifoldSquare, horizontal: true);

        Assert.Equal(1, board.EffectiveVerticalFolds);
    }

    [Fact]
    public void EffectiveVerticalFolds_PresetBifoldPortrait_Returns0()
    {
        var board = MakeBoard(GameBoardSize.SmallBifoldSquare, horizontal: false);

        Assert.Equal(0, board.EffectiveVerticalFolds);
    }

    [Fact]
    public void EffectiveVerticalFolds_PresetQuadFold_Returns1()
    {
        var board = MakeBoard(GameBoardSize.SmallQuadFoldSquare, horizontal: true);

        Assert.Equal(1, board.EffectiveVerticalFolds);
    }

    [Fact]
    public void EffectiveVerticalFolds_CustomValue_ReturnsCustomValue()
    {
        var board = MakeBoard(preset: null, customVFolds: 2);

        Assert.Equal(2, board.EffectiveVerticalFolds);
    }

    [Fact]
    public void EffectiveVerticalFolds_NoPresetNoCustom_Returns0()
    {
        var board = MakeBoard(preset: null);

        Assert.Equal(0, board.EffectiveVerticalFolds);
    }

    #endregion

    #region GetDimensions Tests

    [Fact]
    public void GetDimensions_PresetHorizontal_ReturnsPresetDimensions()
    {
        // SmallBifoldSquare: LandscapeWidth=304.8, LandscapeHeight=152.4
        var board = MakeBoard(GameBoardSize.SmallBifoldSquare, horizontal: true);

        var dims = board.GetDimensions();

        Assert.Equal(304.8m, dims.WidthMm);
        Assert.Equal(152.4m, dims.HeightMm);
        Assert.Equal(3, dims.BleedMm);
    }

    [Fact]
    public void GetDimensions_PresetPortrait_ReturnsSwappedDimensions()
    {
        // SmallBifoldSquare portrait: width=152.4, height=304.8
        var board = MakeBoard(GameBoardSize.SmallBifoldSquare, horizontal: false);

        var dims = board.GetDimensions();

        Assert.Equal(152.4m, dims.WidthMm);
        Assert.Equal(304.8m, dims.HeightMm);
    }

    [Fact]
    public void GetDimensions_CustomDimensions_ReturnsCustomValues()
    {
        var board = MakeBoard(preset: null, customWidth: 600m, customHeight: 350m);

        var dims = board.GetDimensions();

        Assert.Equal(600m, dims.WidthMm);
        Assert.Equal(350m, dims.HeightMm);
        Assert.Equal(3, dims.BleedMm);
    }

    #endregion

    #region GetFoldedDimensions Tests

    [Fact]
    public void GetFoldedDimensions_BifoldHorizontal_HalvesWidth()
    {
        // MediumBifoldSquare: 457.2 x 228.6, bifold horizontal → hFolds=0, vFolds=1
        var board = MakeBoard(GameBoardSize.MediumBifoldSquare, horizontal: true);

        var folded = board.GetFoldedDimensions();

        Assert.Equal(457.2m / 2, folded.WidthMm);
    }

    [Fact]
    public void GetFoldedDimensions_BifoldHorizontal_HeightUnchanged()
    {
        // MediumBifoldSquare: hFolds=0, vFolds=1 → height unchanged
        var board = MakeBoard(GameBoardSize.MediumBifoldSquare, horizontal: true);

        var folded = board.GetFoldedDimensions();

        Assert.Equal(228.6m, folded.HeightMm);
    }

    [Fact]
    public void GetFoldedDimensions_BifoldHorizontal_ThicknessDoubled()
    {
        // MediumBifoldSquare: hFolds=0, vFolds=1 → thickness = 2.5 * 2^1 = 5.0
        var board = MakeBoard(GameBoardSize.MediumBifoldSquare, horizontal: true);

        var folded = board.GetFoldedDimensions();

        Assert.Equal(5.0m, folded.ThicknessMm);
    }

    [Fact]
    public void GetFoldedDimensions_BifoldPortrait_HalvesHeight()
    {
        // SmallBifoldSquare portrait: width=152.4, height=304.8, hFolds=1, vFolds=0
        var board = MakeBoard(GameBoardSize.SmallBifoldSquare, horizontal: false);

        var folded = board.GetFoldedDimensions();

        Assert.Equal(152.4m, folded.WidthMm);   // vFolds=0, width unchanged
        Assert.Equal(304.8m / 2, folded.HeightMm);  // hFolds=1, height halved
        Assert.Equal(5.0m, folded.ThicknessMm); // 2.5 * 2^1
    }

    [Fact]
    public void GetFoldedDimensions_QuadFold_HalvesBothDimensions()
    {
        // SmallQuadFoldRectangle: 304.8 x 203.2, quad → hFolds=1, vFolds=1
        var board = MakeBoard(GameBoardSize.SmallQuadFoldRectangle, horizontal: true);

        var folded = board.GetFoldedDimensions();

        Assert.Equal(304.8m / 2, folded.WidthMm);
        Assert.Equal(203.2m / 2, folded.HeightMm);
    }

    [Fact]
    public void GetFoldedDimensions_QuadFold_ThicknessQuadrupled()
    {
        // hFolds=1, vFolds=1 → thickness = 2.5 * 2^2 = 10.0
        var board = MakeBoard(GameBoardSize.SmallQuadFoldSquare, horizontal: true);

        var folded = board.GetFoldedDimensions();

        Assert.Equal(10.0m, folded.ThicknessMm);
    }

    [Fact]
    public void GetFoldedDimensions_NoFolds_DimensionsUnchangedAndBaseThickness()
    {
        // Custom board with no folds: hFolds=0, vFolds=0
        var board = MakeBoard(preset: null, customWidth: 500m, customHeight: 300m, customHFolds: 0, customVFolds: 0);

        var folded = board.GetFoldedDimensions();

        Assert.Equal(500m, folded.WidthMm);
        Assert.Equal(300m, folded.HeightMm);
        Assert.Equal(2.5m, folded.ThicknessMm);
    }

    #endregion

    private static GameBoard MakeBoard(
        GameBoardSize? preset = GameBoardSize.MediumBifoldSquare,
        bool horizontal = true,
        decimal? customWidth = null,
        decimal? customHeight = null,
        int? customHFolds = null,
        int? customVFolds = null)
    {
        return new GameBoard
        {
            Id = Guid.NewGuid(),
            Name = "Test Board",
            PresetSize = preset,
            Horizontal = horizontal,
            CustomWidthMm = customWidth,
            CustomHeightMm = customHeight,
            CustomHorizontalFolds = customHFolds,
            CustomVerticalFolds = customVFolds,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }
}
