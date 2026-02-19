using Deckle.API.DTOs;
using Deckle.API.Services;
using Deckle.Domain.Entities;

namespace Deckle.API.Configurators;

public record CardConfig(string Name, CardSize Size, bool Horizontal, Guid? Sample) : IComponentConfig<Card>;

public class CardConfigurator : IConfigurator<Card, CardConfig>
{
    private readonly ISampleService _sampleService;

    public CardConfigurator(ISampleService sampleService)
    {
        _sampleService = sampleService;
    }

    public async Task<Card> CreateAsync(Guid userId, Guid? projectId, CardConfig config)
    {
        var card = new Card()
        {
            ProjectId = projectId,
            Id = Guid.NewGuid(),
            Name = config.Name,
            Size = config.Size,
            Horizontal = config.Horizontal,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        if (config.Sample is not null)
        {
            await _sampleService.UseSampleAsync(userId, card, config.Sample.Value, sample =>
            {
                card.FrontDesign = sample.FrontDesign;
                card.BackDesign = sample.BackDesign;
            });
        }

        return card;
    }

    public Task ValidateAsync(CardConfig config) => Task.CompletedTask;

    public Task UpdateAsync(Card component, CardConfig config)
    {
        component.Name = config.Name;
        component.Size = config.Size;
        component.Horizontal = config.Horizontal;
        component.UpdatedAt = DateTime.UtcNow;

        return Task.CompletedTask;
    }
}
