using System.Reflection;
using System.Text;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Deckle.Domain.Data;

/// <summary>
/// Automatically recomputes <see cref="ISizeAware.TotalByteSize"/> before every save
/// for any entity that implements <see cref="ISizeAware"/>.
/// Only properties annotated with <see cref="TrackByteSizeAttribute"/> are counted.
/// Handles both <c>string?</c> and <c>IEnumerable&lt;string&gt;</c> property types.
/// </summary>
public sealed class ByteSizeInterceptor : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        UpdateByteSizes(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        UpdateByteSizes(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private static void UpdateByteSizes(DbContext? context)
    {
        if (context is null) return;

        foreach (var entry in context.ChangeTracker.Entries<ISizeAware>())
        {
            if (entry.State is not (EntityState.Added or EntityState.Modified))
                continue;

            entry.Entity.TotalByteSize = ComputeByteSize(entry.Entity);
        }
    }

    private static long ComputeByteSize(ISizeAware entity)
    {
        long total = 0;

        foreach (var prop in entity.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            if (!HasTrackByteSizeAttribute(prop))
                continue;

            total += prop.GetValue(entity) switch
            {
                string s                 => Encoding.UTF8.GetByteCount(s),
                IEnumerable<string> list => list.Sum(s => Encoding.UTF8.GetByteCount(s)),
                _                        => 0L
            };
        }

        return total;
    }

    /// <summary>
    /// Walks the declaring-type inheritance chain for <paramref name="prop"/> to check
    /// whether any declaration of the property carries <see cref="TrackByteSizeAttribute"/>.
    /// This is necessary because .NET does not propagate property-level attributes through
    /// virtual/override chains via the standard <c>inherit</c> flag.
    /// </summary>
    private static bool HasTrackByteSizeAttribute(PropertyInfo prop)
    {
        var type = prop.DeclaringType;
        while (type is not null && type != typeof(object))
        {
            var declared = type.GetProperty(
                prop.Name,
                BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly);

            if (declared?.GetCustomAttribute<TrackByteSizeAttribute>() is not null)
                return true;

            type = type.BaseType;
        }

        return false;
    }
}
