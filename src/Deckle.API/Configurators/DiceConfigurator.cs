using Deckle.API.DTOs;
using Deckle.API.Services;
using Deckle.Domain.Entities;

namespace Deckle.API.Configurators;

public record DiceConfig(string Name, DiceType Type, DiceStyle Style, DiceColor BaseColor, int Number) : IComponentConfig<Dice>;

public class CardDiceConfigurator : IConfigurator<Dice, DiceConfig>
{
    public Task<Dice> CreateAsync(Guid userId, Guid? projectId, DiceConfig config) => Task.FromResult(new Dice()
    {
        ProjectId = projectId,
        Id = Guid.NewGuid(),
        Name = config.Name,
        Type = config.Type,
        Style = config.Style,
        BaseColor = config.BaseColor,
        Number = config.Number,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    });

    public Task ValidateAsync(DiceConfig config) => Task.CompletedTask;

    public Task UpdateAsync(Dice component, DiceConfig config)
    {
        component.Name = config.Name;
        component.Type = config.Type;
        component.Style = config.Style;
        component.BaseColor = config.BaseColor;
        component.Number = config.Number;
        component.UpdatedAt = DateTime.UtcNow;

        return Task.CompletedTask;
    }
}
