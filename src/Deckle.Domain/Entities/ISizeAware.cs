namespace Deckle.Domain.Entities;

/// <summary>
/// Implemented by entities that track their total serialized size in bytes.
/// The <see cref="TotalByteSize"/> property is automatically recomputed on save
/// by summing the UTF-8 byte counts of all properties annotated with
/// <see cref="TrackByteSizeAttribute"/>.
/// </summary>
public interface ISizeAware
{
    public long TotalByteSize { get; set; }
}
