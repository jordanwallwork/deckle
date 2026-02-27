using Deckle.API.Services;
using Deckle.Domain.Entities;

namespace Deckle.API.Configurators;

public record GameBoardConfig(
    string Name,
    GameBoardSize? PresetSize,
    bool Horizontal,
    decimal? CustomWidthMm,
    decimal? CustomHeightMm,
    int? CustomHorizontalFolds,
    int? CustomVerticalFolds,
    Guid? Sample) : IComponentConfig<GameBoard>;

public class GameBoardConfigurator : IConfigurator<GameBoard, GameBoardConfig>
{
    private readonly ISampleService _sampleService;

    public GameBoardConfigurator(ISampleService sampleService)
    {
        _sampleService = sampleService;
    }

    public async Task<GameBoard> CreateAsync(Guid userId, Guid? projectId, GameBoardConfig config)
    {
        var board = new GameBoard
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = config.Name,
            PresetSize = config.PresetSize,
            Horizontal = config.Horizontal,
            CustomWidthMm = config.CustomWidthMm,
            CustomHeightMm = config.CustomHeightMm,
            CustomHorizontalFolds = config.CustomHorizontalFolds,
            CustomVerticalFolds = config.CustomVerticalFolds,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        if (config.Sample is not null)
        {
            await _sampleService.UseSampleAsync(userId, board, config.Sample.Value, sample =>
            {
                board.FrontDesign = sample.FrontDesign;
                board.BackDesign = sample.BackDesign;
            });
        }

        return board;
    }

    public Task ValidateAsync(GameBoardConfig config)
    {
        if (!config.PresetSize.HasValue &&
            (!config.CustomWidthMm.HasValue || !config.CustomHeightMm.HasValue))
        {
            throw new ArgumentException(
                "Either PresetSize must be set, or CustomWidthMm and CustomHeightMm must be provided");
        }

        if (!config.PresetSize.HasValue)
        {
            if (config.CustomWidthMm is < 304m or > 914m)
                throw new ArgumentException("CustomWidthMm must be between 304mm and 914mm");
            if (config.CustomHeightMm is < 152m or > 635m)
                throw new ArgumentException("CustomHeightMm must be between 152mm and 635mm");
            if (config.CustomHorizontalFolds is < 0 or > 2)
                throw new ArgumentException("CustomHorizontalFolds must be between 0 and 2");
            if (config.CustomVerticalFolds is < 0 or > 2)
                throw new ArgumentException("CustomVerticalFolds must be between 0 and 2");
        }

        return Task.CompletedTask;
    }

    public async Task UpdateAsync(GameBoard component, GameBoardConfig config)
    {
        await ValidateAsync(config);

        component.Name = config.Name;
        component.PresetSize = config.PresetSize;
        component.Horizontal = config.Horizontal;
        component.CustomWidthMm = config.CustomWidthMm;
        component.CustomHeightMm = config.CustomHeightMm;
        component.CustomHorizontalFolds = config.CustomHorizontalFolds;
        component.CustomVerticalFolds = config.CustomVerticalFolds;
        component.UpdatedAt = DateTime.UtcNow;
    }
}
