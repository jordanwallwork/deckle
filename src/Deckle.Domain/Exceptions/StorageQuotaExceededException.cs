namespace Deckle.Domain.Exceptions;

public class StorageQuotaExceededException : Exception
{
    public long QuotaBytes { get; }
    public long CurrentUsedBytes { get; }
    public long RequestedDeltaBytes { get; }

    public long AvailableBytes => Math.Max(0, QuotaBytes - CurrentUsedBytes);

    public StorageQuotaExceededException()
        : base("Storage quota exceeded") { }

    public StorageQuotaExceededException(string message)
        : base(message) { }

    public StorageQuotaExceededException(string message, Exception innerException)
        : base(message, innerException) { }

    public StorageQuotaExceededException(long quotaBytes, long currentUsedBytes, long requestedDeltaBytes)
        : base($"Storage quota exceeded. Quota: {quotaBytes / (1024.0 * 1024.0):F2}MB, " +
               $"Used: {currentUsedBytes / (1024.0 * 1024.0):F2}MB, " +
               $"Requested: {requestedDeltaBytes / (1024.0 * 1024.0):F2}MB, " +
               $"Available: {Math.Max(0, quotaBytes - currentUsedBytes) / (1024.0 * 1024.0):F2}MB")
    {
        QuotaBytes = quotaBytes;
        CurrentUsedBytes = currentUsedBytes;
        RequestedDeltaBytes = requestedDeltaBytes;
    }
}
