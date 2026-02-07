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

/// <summary>
/// Configuration for creating or updating a Card component.
/// </summary>
public record CardConfig(string Name, CardSize Size, bool Horizontal = false)
    : IComponentConfig<Card>;

/// <summary>
/// Configuration for creating or updating a Dice component.
/// </summary>
public record DiceConfig(string Name, DiceType Type, DiceStyle Style, DiceColor BaseColor, int Number)
    : IComponentConfig<Dice>;

/// <summary>
/// Configuration for creating or updating a PlayerMat component.
/// </summary>
public record PlayerMatConfig(
    string Name,
    PlayerMatSize? PresetSize,
    bool Horizontal,
    decimal? CustomWidthMm,
    decimal? CustomHeightMm) : IComponentConfig<PlayerMat>;
