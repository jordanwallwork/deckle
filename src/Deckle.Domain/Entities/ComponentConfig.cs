using System.Diagnostics.CodeAnalysis;

namespace Deckle.Domain.Entities;

/// <summary>
/// Base marker interface for component configuration types.
/// Configuration types encapsulate the parameters needed to create or update a component.
/// </summary>
/// <typeparam name="TComponent">The component type this configuration applies to.</typeparam>
[SuppressMessage("Design", "CA1040:Avoid empty interfaces", Justification = "Marker interface for generic type constraints")]
public interface IComponentConfig<TComponent> where TComponent : Component
{
}
