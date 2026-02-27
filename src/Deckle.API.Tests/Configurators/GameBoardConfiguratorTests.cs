using Deckle.API.Configurators;
using Deckle.API.Services;
using Deckle.Domain.Entities;
using Moq;

namespace Deckle.API.Tests.Configurators;

public class GameBoardConfiguratorTests
{
    private readonly Mock<ISampleService> _mockSampleService;
    private readonly GameBoardConfigurator _configurator;

    public GameBoardConfiguratorTests()
    {
        _mockSampleService = new Mock<ISampleService>();
        _configurator = new GameBoardConfigurator(_mockSampleService.Object);
    }

    private static GameBoardConfig PresetConfig(
        string name = "Test Board",
        GameBoardSize size = GameBoardSize.MediumBifoldSquare,
        bool horizontal = true) =>
        new(name, size, horizontal, null, null, null, null, null);

    private static GameBoardConfig CustomConfig(
        string name = "Test Board",
        decimal width = 500m,
        decimal height = 300m,
        int? hFolds = null,
        int? vFolds = null) =>
        new(name, null, true, width, height, hFolds, vFolds, null);

    #region ValidateAsync Tests

    [Fact]
    public async Task ValidateAsync_PresetSizeSet_DoesNotThrow()
    {
        var config = PresetConfig();

        await _configurator.ValidateAsync(config);
    }

    [Fact]
    public async Task ValidateAsync_NoPresetAndNoDimensions_ThrowsArgumentException()
    {
        var config = new GameBoardConfig("Test", null, true, null, null, null, null, null);

        await Assert.ThrowsAsync<ArgumentException>(() => _configurator.ValidateAsync(config));
    }

    [Fact]
    public async Task ValidateAsync_NoPresetMissingWidth_ThrowsArgumentException()
    {
        var config = new GameBoardConfig("Test", null, true, null, 300m, null, null, null);

        await Assert.ThrowsAsync<ArgumentException>(() => _configurator.ValidateAsync(config));
    }

    [Fact]
    public async Task ValidateAsync_NoPresetMissingHeight_ThrowsArgumentException()
    {
        var config = new GameBoardConfig("Test", null, true, 500m, null, null, null, null);

        await Assert.ThrowsAsync<ArgumentException>(() => _configurator.ValidateAsync(config));
    }

    [Fact]
    public async Task ValidateAsync_ValidCustomDimensions_DoesNotThrow()
    {
        var config = CustomConfig();

        await _configurator.ValidateAsync(config);
    }

    [Fact]
    public async Task ValidateAsync_CustomWidthBelowMinimum_ThrowsArgumentException()
    {
        var config = CustomConfig(width: 303m);

        await Assert.ThrowsAsync<ArgumentException>(() => _configurator.ValidateAsync(config));
    }

    [Fact]
    public async Task ValidateAsync_CustomWidthAboveMaximum_ThrowsArgumentException()
    {
        var config = CustomConfig(width: 915m);

        await Assert.ThrowsAsync<ArgumentException>(() => _configurator.ValidateAsync(config));
    }

    [Fact]
    public async Task ValidateAsync_CustomHeightBelowMinimum_ThrowsArgumentException()
    {
        var config = CustomConfig(height: 151m);

        await Assert.ThrowsAsync<ArgumentException>(() => _configurator.ValidateAsync(config));
    }

    [Fact]
    public async Task ValidateAsync_CustomHeightAboveMaximum_ThrowsArgumentException()
    {
        var config = CustomConfig(height: 636m);

        await Assert.ThrowsAsync<ArgumentException>(() => _configurator.ValidateAsync(config));
    }

    [Fact]
    public async Task ValidateAsync_CustomHorizontalFoldsNegative_ThrowsArgumentException()
    {
        var config = CustomConfig(hFolds: -1);

        await Assert.ThrowsAsync<ArgumentException>(() => _configurator.ValidateAsync(config));
    }

    [Fact]
    public async Task ValidateAsync_CustomHorizontalFoldsAboveMax_ThrowsArgumentException()
    {
        var config = CustomConfig(hFolds: 3);

        await Assert.ThrowsAsync<ArgumentException>(() => _configurator.ValidateAsync(config));
    }

    [Fact]
    public async Task ValidateAsync_CustomVerticalFoldsNegative_ThrowsArgumentException()
    {
        var config = CustomConfig(vFolds: -1);

        await Assert.ThrowsAsync<ArgumentException>(() => _configurator.ValidateAsync(config));
    }

    [Fact]
    public async Task ValidateAsync_CustomVerticalFoldsAboveMax_ThrowsArgumentException()
    {
        var config = CustomConfig(vFolds: 3);

        await Assert.ThrowsAsync<ArgumentException>(() => _configurator.ValidateAsync(config));
    }

    [Fact]
    public async Task ValidateAsync_PresetSize_IgnoresCustomDimensionValidation()
    {
        // When PresetSize is set, custom field values are not validated
        var config = new GameBoardConfig("Test", GameBoardSize.SmallBifoldSquare, true, 1m, 1m, -5, 10, null);

        await _configurator.ValidateAsync(config);
    }

    [Fact]
    public async Task ValidateAsync_CustomWidthAtMinimumBoundary_DoesNotThrow()
    {
        await _configurator.ValidateAsync(CustomConfig(width: 304m));
    }

    [Fact]
    public async Task ValidateAsync_CustomWidthAtMaximumBoundary_DoesNotThrow()
    {
        await _configurator.ValidateAsync(CustomConfig(width: 914m));
    }

    [Fact]
    public async Task ValidateAsync_CustomHeightAtMinimumBoundary_DoesNotThrow()
    {
        await _configurator.ValidateAsync(CustomConfig(height: 152m));
    }

    [Fact]
    public async Task ValidateAsync_CustomHeightAtMaximumBoundary_DoesNotThrow()
    {
        await _configurator.ValidateAsync(CustomConfig(height: 635m));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(2)]
    public async Task ValidateAsync_CustomHorizontalFoldsAtBoundary_DoesNotThrow(int folds)
    {
        await _configurator.ValidateAsync(CustomConfig(hFolds: folds));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(2)]
    public async Task ValidateAsync_CustomVerticalFoldsAtBoundary_DoesNotThrow(int folds)
    {
        await _configurator.ValidateAsync(CustomConfig(vFolds: folds));
    }

    #endregion

    #region CreateAsync Tests

    [Fact]
    public async Task CreateAsync_PresetConfig_SetsPresetSize()
    {
        var config = PresetConfig(size: GameBoardSize.LargeBifoldSquare, horizontal: false);
        var userId = Guid.NewGuid();

        var board = await _configurator.CreateAsync(userId, null, config);

        Assert.Equal(GameBoardSize.LargeBifoldSquare, board.PresetSize);
        Assert.False(board.Horizontal);
    }

    [Fact]
    public async Task CreateAsync_CustomConfig_SetsCustomDimensions()
    {
        var config = CustomConfig(width: 600m, height: 400m, hFolds: 1, vFolds: 0);
        var userId = Guid.NewGuid();

        var board = await _configurator.CreateAsync(userId, null, config);

        Assert.Null(board.PresetSize);
        Assert.Equal(600m, board.CustomWidthMm);
        Assert.Equal(400m, board.CustomHeightMm);
        Assert.Equal(1, board.CustomHorizontalFolds);
        Assert.Equal(0, board.CustomVerticalFolds);
    }

    [Fact]
    public async Task CreateAsync_SetsNameAndProjectId()
    {
        var projectId = Guid.NewGuid();
        var config = PresetConfig(name: "My Board");
        var userId = Guid.NewGuid();

        var board = await _configurator.CreateAsync(userId, projectId, config);

        Assert.Equal("My Board", board.Name);
        Assert.Equal(projectId, board.ProjectId);
    }

    [Fact]
    public async Task CreateAsync_SetsNewId()
    {
        var config = PresetConfig();
        var userId = Guid.NewGuid();

        var board = await _configurator.CreateAsync(userId, null, config);

        Assert.NotEqual(Guid.Empty, board.Id);
    }

    [Fact]
    public async Task CreateAsync_SetsTimestamps()
    {
        var before = DateTime.UtcNow.AddSeconds(-1);
        var config = PresetConfig();
        var userId = Guid.NewGuid();

        var board = await _configurator.CreateAsync(userId, null, config);

        Assert.True(board.CreatedAt > before);
        Assert.True(board.UpdatedAt > before);
    }

    [Fact]
    public async Task CreateAsync_WithSample_CallsUseSampleAsync()
    {
        var sampleId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var config = new GameBoardConfig("Test", GameBoardSize.SmallBifoldSquare, true, null, null, null, null, sampleId);

        _mockSampleService
            .Setup(s => s.UseSampleAsync(userId, It.IsAny<GameBoard>(), sampleId, It.IsAny<Action<GameBoard>>()))
            .Returns(Task.CompletedTask);

        await _configurator.CreateAsync(userId, null, config);

        _mockSampleService.Verify(
            s => s.UseSampleAsync(userId, It.IsAny<GameBoard>(), sampleId, It.IsAny<Action<GameBoard>>()),
            Times.Once);
    }

    [Fact]
    public async Task CreateAsync_WithoutSample_DoesNotCallUseSampleAsync()
    {
        var config = PresetConfig();
        var userId = Guid.NewGuid();

        await _configurator.CreateAsync(userId, null, config);

        _mockSampleService.Verify(
            s => s.UseSampleAsync(It.IsAny<Guid>(), It.IsAny<GameBoard>(), It.IsAny<Guid>(), It.IsAny<Action<GameBoard>>()),
            Times.Never);
    }

    #endregion

    #region UpdateAsync Tests

    [Fact]
    public async Task UpdateAsync_ValidPresetConfig_UpdatesAllFields()
    {
        var board = MakeBoard();
        var config = new GameBoardConfig("Updated Name", GameBoardSize.ExtraLargeBifoldSquare, false, null, null, null, null, null);

        await _configurator.UpdateAsync(board, config);

        Assert.Equal("Updated Name", board.Name);
        Assert.Equal(GameBoardSize.ExtraLargeBifoldSquare, board.PresetSize);
        Assert.False(board.Horizontal);
        Assert.Null(board.CustomWidthMm);
    }

    [Fact]
    public async Task UpdateAsync_SwitchesToCustomDimensions_UpdatesCustomFields()
    {
        var board = MakeBoard();
        var config = new GameBoardConfig("Custom", null, true, 700m, 400m, 1, 0, null);

        await _configurator.UpdateAsync(board, config);

        Assert.Null(board.PresetSize);
        Assert.Equal(700m, board.CustomWidthMm);
        Assert.Equal(400m, board.CustomHeightMm);
        Assert.Equal(1, board.CustomHorizontalFolds);
        Assert.Equal(0, board.CustomVerticalFolds);
    }

    [Fact]
    public async Task UpdateAsync_SetsUpdatedAt()
    {
        var board = MakeBoard();
        var before = DateTime.UtcNow.AddSeconds(-1);
        var config = PresetConfig();

        await _configurator.UpdateAsync(board, config);

        Assert.True(board.UpdatedAt > before);
    }

    [Fact]
    public async Task UpdateAsync_InvalidConfig_ThrowsArgumentException()
    {
        var board = MakeBoard();
        var invalidConfig = new GameBoardConfig("Test", null, true, null, null, null, null, null);

        await Assert.ThrowsAsync<ArgumentException>(() => _configurator.UpdateAsync(board, invalidConfig));
    }

    [Fact]
    public async Task UpdateAsync_DoesNotChangeDesigns()
    {
        var board = MakeBoard();
        board.FrontDesign = "<original>";
        var config = PresetConfig(name: "Renamed");

        await _configurator.UpdateAsync(board, config);

        Assert.Equal("<original>", board.FrontDesign);
    }

    #endregion

    private static GameBoard MakeBoard(
        GameBoardSize? preset = GameBoardSize.MediumBifoldSquare,
        bool horizontal = true)
    {
        return new GameBoard
        {
            Id = Guid.NewGuid(),
            Name = "Board",
            PresetSize = preset,
            Horizontal = horizontal,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow.AddMinutes(-5)
        };
    }
}
