using Deckle.Domain.Entities;

namespace Deckle.API.Configurators;

public interface IConfigurator<TComponent, TConfig>
    where TComponent : Component
    where TConfig : IComponentConfig<TComponent>
{
    public Task<TComponent> CreateAsync(Guid userId, Guid? projectId, TConfig config);
    public Task ValidateAsync(TConfig config);
    public Task UpdateAsync(TComponent component, TConfig config);
}
