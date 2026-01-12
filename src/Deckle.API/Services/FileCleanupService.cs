using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deckle.API.Services;

public class FileCleanupService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<FileCleanupService> _logger;
    private readonly TimeSpan _cleanupInterval = TimeSpan.FromHours(1);
    private readonly TimeSpan _pendingTimeout = TimeSpan.FromHours(24);

    public FileCleanupService(
        IServiceProvider serviceProvider,
        ILogger<FileCleanupService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("FileCleanupService started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CleanupPendingFilesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during file cleanup");
            }

            await Task.Delay(_cleanupInterval, stoppingToken);
        }

        _logger.LogInformation("FileCleanupService stopped");
    }

    private async Task CleanupPendingFilesAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var r2Service = scope.ServiceProvider.GetRequiredService<CloudflareR2Service>();

        var cutoff = DateTime.UtcNow - _pendingTimeout;
        var pendingFiles = await context.Files
            .Where(f => f.Status == FileStatus.Pending && f.UploadedAt < cutoff)
            .ToListAsync();

        if (pendingFiles.Count == 0)
        {
            _logger.LogDebug("No pending files to clean up");
            return;
        }

        _logger.LogInformation("Found {Count} pending files to clean up", pendingFiles.Count);

        var successCount = 0;
        var failureCount = 0;

        foreach (var file in pendingFiles)
        {
            try
            {
                // Try to delete from R2 (may not exist if upload never completed)
                try
                {
                    await r2Service.DeleteFileAsync(file.StorageKey);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to delete file from R2 (may not exist): {StorageKey}", file.StorageKey);
                    // Continue with database cleanup even if R2 deletion fails
                }

                // Remove from database
                context.Files.Remove(file);

                successCount++;
                _logger.LogInformation("Cleaned up pending file: {FileId} (uploaded {UploadedAt})",
                    file.Id, file.UploadedAt);
            }
            catch (Exception ex)
            {
                failureCount++;
                _logger.LogWarning(ex, "Failed to cleanup file: {FileId}", file.Id);
            }
        }

        if (successCount > 0)
        {
            await context.SaveChangesAsync();
            _logger.LogInformation(
                "File cleanup completed: {SuccessCount} cleaned up, {FailureCount} failed",
                successCount, failureCount);
        }
    }
}
