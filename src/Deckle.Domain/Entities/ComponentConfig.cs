using System.Diagnostics.CodeAnalysis;

namespace Deckle.Domain.Entities;

/// <summary>
/// Base marker interface for component configuration types.
/// Configuration types encapsulate the parameters needed to create or update a component.
/// </summary>
/// <typeparam name="TComponent">The component type this configuration applies to.</typeparam>
[SuppressMessage("Design", "CA1040:Avoid empty interfaces", Justification = "Marker interface for generic type constraints")]
[SuppressMessage("Major Code Smell", "S2326:Unused type parameters should be removed", Justification = "TComponent ties a config to its component type for generic constraints")]
public interface IComponentConfig<TComponent> where TComponent : Component
{
}
