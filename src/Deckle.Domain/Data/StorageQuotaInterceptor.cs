using Deckle.Domain.Entities;
using Deckle.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Deckle.Domain.Data;

/// <summary>
/// Tracks storage quota changes for all <see cref="ISizeAware"/> entities by computing
/// byte-size deltas and updating the owning user's <see cref="User.StorageUsedBytes"/>.
/// Must be registered after <see cref="ByteSizeInterceptor"/> so that TotalByteSize
/// values are up-to-date before delta computation.
/// </summary>
public sealed class StorageQuotaInterceptor : SaveChangesInterceptor
{
    private const double OverflowMargin = 1.05;

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        if (eventData.Context is not null)
            return SavingChangesWithQuotaAsync(eventData.Context, result, cancellationToken);

        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private async ValueTask<InterceptionResult<int>> SavingChangesWithQuotaAsync(
        DbContext context,
        InterceptionResult<int> result,
        CancellationToken cancellationToken)
    {
        var deltas = CollectDeltas(context);
        if (deltas.Count == 0)
            return result;

        // Group deltas by ProjectId
        var deltasByProject = new Dictionary<Guid, long>();
        foreach (var (projectId, delta) in deltas)
        {
            deltasByProject[projectId] = deltasByProject.GetValueOrDefault(projectId) + delta;
        }

        // Batch-query owner UserIds for all affected projects
        var projectIds = deltasByProject.Keys.ToList();
        var ownerMap = await context.Set<UserProject>()
            .Where(up => projectIds.Contains(up.ProjectId) && up.Role == ProjectRole.Owner)
            .Select(up => new { up.ProjectId, up.UserId })
            .ToDictionaryAsync(x => x.ProjectId, x => x.UserId, cancellationToken);

        // Group deltas by owner UserId
        var deltasByUser = new Dictionary<Guid, long>();
        foreach (var (projectId, delta) in deltasByProject)
        {
            if (ownerMap.TryGetValue(projectId, out var userId))
                deltasByUser[userId] = deltasByUser.GetValueOrDefault(userId) + delta;
        }

        if (deltasByUser.Count == 0)
            return result;

        // Load affected users
        var userIds = deltasByUser.Keys.ToList();
        var users = await context.Set<User>()
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, cancellationToken);

        // Check quotas and apply deltas
        foreach (var (userId, netDelta) in deltasByUser)
        {
            if (!users.TryGetValue(userId, out var user))
                continue;

            if (netDelta > 0)
            {
                var quotaBytes = user.StorageQuotaMb * 1024L * 1024L;
                var projectedUsage = user.StorageUsedBytes + netDelta;

                if (projectedUsage > (long)(quotaBytes * OverflowMargin))
                    throw new StorageQuotaExceededException(quotaBytes, user.StorageUsedBytes, netDelta);
            }

            user.StorageUsedBytes = Math.Max(0, user.StorageUsedBytes + netDelta);
        }

        return result;
    }

    private static List<(Guid ProjectId, long Delta)> CollectDeltas(DbContext context)
    {
        var deltas = new List<(Guid, long)>();

        foreach (var entry in context.ChangeTracker.Entries<ISizeAware>())
        {
            var projectId = GetProjectId(entry.Entity);
            if (projectId is null)
                continue;

            long delta;
            switch (entry.State)
            {
                case EntityState.Added:
                    if (!ShouldCountEntity(entry.Entity))
                        continue;
                    delta = entry.Entity.TotalByteSize;
                    break;

                case EntityState.Modified:
                    delta = ComputeModifiedDelta(entry);
                    if (delta == 0)
                        continue;
                    break;

                case EntityState.Deleted:
                    if (!ShouldCountOriginalEntity(entry))
                        continue;
                    var originalSize = entry.OriginalValues.GetValue<long>(nameof(ISizeAware.TotalByteSize));
                    delta = -originalSize;
                    break;

                default:
                    continue;
            }

            deltas.Add((projectId.Value, delta));
        }

        return deltas;
    }

    private static long ComputeModifiedDelta(
        Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry<ISizeAware> entry)
    {
        var originalSize = entry.OriginalValues.GetValue<long>(nameof(ISizeAware.TotalByteSize));
        var currentSize = entry.Entity.TotalByteSize;

        // Handle File's Pending -> Confirmed transition
        if (entry.Entity is Entities.File)
        {
            var originalStatus = entry.OriginalValues.GetValue<FileStatus>(nameof(Entities.File.Status));
            var currentStatus = ((Entities.File)entry.Entity).Status;

            if (originalStatus == FileStatus.Pending && currentStatus == FileStatus.Confirmed)
                return currentSize; // Full size added on confirmation

            if (currentStatus == FileStatus.Pending)
                return 0; // Pending files don't count

            // Confirmed file being modified (e.g. tags update) — track size delta
            return currentSize - originalSize;
        }

        return currentSize - originalSize;
    }

    /// <summary>
    /// Whether a newly-added entity should count toward storage quota.
    /// Pending files are excluded until confirmed.
    /// </summary>
    private static bool ShouldCountEntity(ISizeAware entity) =>
        entity is not Entities.File { Status: FileStatus.Pending };

    /// <summary>
    /// Whether a deleted entity's original state should be subtracted from quota.
    /// Only confirmed files are counted.
    /// </summary>
    private static bool ShouldCountOriginalEntity(
        Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry<ISizeAware> entry)
    {
        if (entry.Entity is not Entities.File)
            return true;

        var originalStatus = entry.OriginalValues.GetValue<FileStatus>(nameof(Entities.File.Status));
        return originalStatus == FileStatus.Confirmed;
    }

    private static Guid? GetProjectId(ISizeAware entity) => entity switch
    {
        Entities.File f => f.ProjectId,
        DataSource ds => ds.ProjectId,
        EditableComponent ec => ec.ProjectId,
        _ => null
    };
}
