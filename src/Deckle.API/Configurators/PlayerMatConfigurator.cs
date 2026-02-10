using Deckle.API.DTOs;
using Deckle.API.Services;
using Deckle.Domain.Entities;
using System;

namespace Deckle.API.Configurators;

public record PlayerMatConfig(
    string Name,
    PlayerMatSize? PresetSize, bool Horizontal, decimal? CustomWidthMm, decimal? CustomHeightMm,
    Guid? Sample) : IComponentConfig<PlayerMat>;

public class PlayerMatConfigurator : IConfigurator<PlayerMat, PlayerMatConfig>
{
    private readonly SampleService _sampleService;

    public PlayerMatConfigurator(SampleService sampleService)
    {
        _sampleService = sampleService;
    }

    public async Task<PlayerMat> CreateAsync(Guid userId, Guid? projectId, PlayerMatConfig config)
    {
        var playerMat = new PlayerMat()
        {
            ProjectId = projectId,
            Id = Guid.NewGuid(),
            Name = config.Name,
            PresetSize = config.PresetSize,
            Horizontal = config.Horizontal,
            CustomWidthMm = config.CustomWidthMm,
            CustomHeightMm = config.CustomHeightMm,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        if (config.Sample is not null)
        {
            await _sampleService.UseSampleAsync(userId, playerMat, config.Sample.Value, sample =>
            {
                playerMat.FrontDesign = sample.FrontDesign;
                playerMat.BackDesign = sample.BackDesign;
            });
        }

        return playerMat;
    }

    public Task ValidateAsync(PlayerMatConfig config)
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

        return Task.CompletedTask;
    }

    public async Task UpdateAsync(PlayerMat component, PlayerMatConfig config)
    {
        await ValidateAsync(config);

        component.Name = config.Name;
        component.PresetSize = config.PresetSize;
        component.Horizontal = config.Horizontal;
        component.CustomWidthMm = config.CustomWidthMm;
        component.CustomHeightMm = config.CustomHeightMm;
        component.UpdatedAt = DateTime.UtcNow;
    }
}
