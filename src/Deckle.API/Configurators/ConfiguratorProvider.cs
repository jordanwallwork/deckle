using Deckle.Domain.Entities;

namespace Deckle.API.Configurators;

public interface IConfiguratorProvider
{
    public IConfigurator<TComponent, TConfig> GetConfigurator<TComponent, TConfig>()
        where TComponent : Component
        where TConfig : IComponentConfig<TComponent>;
}

public class ConfiguratorProvider : IConfiguratorProvider
{
    private readonly IServiceProvider _services;

    public ConfiguratorProvider(IServiceProvider services)
    {
        _services = services;
    }

    public IConfigurator<TComponent, TConfig> GetConfigurator<TComponent, TConfig>()
        where TComponent : Component
        where TConfig : IComponentConfig<TComponent>
    {
        var configurator = _services.GetService<IConfigurator<TComponent, TConfig>>();

        return configurator ?? throw new ConfiguratorException($"No configurator found for {typeof(TComponent).Name}");
    }
}
