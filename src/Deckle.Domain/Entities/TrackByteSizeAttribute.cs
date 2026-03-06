namespace Deckle.Domain.Entities;

/// <summary>
/// Marks a string or string-collection property for inclusion in the
/// <see cref="ISizeAware.TotalByteSize"/> calculation.
/// The interceptor uses UTF-8 byte counts when the entity is saved.
/// </summary>
[AttributeUsage(AttributeTargets.Property, Inherited = true, AllowMultiple = false)]
public sealed class TrackByteSizeAttribute : Attribute { }
