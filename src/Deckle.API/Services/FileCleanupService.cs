using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deckle.API.Services;

public partial class FileCleanupService : BackgroundService
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
        LogServiceStarted();

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CleanupPendingFilesAsync();
            }
            catch (Exception ex)
            {
                LogCleanupError(ex);
            }

            await Task.Delay(_cleanupInterval, stoppingToken);
        }

        LogServiceStopped();
    }

    private async Task CleanupPendingFilesAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var r2Service = scope.ServiceProvider.GetRequiredService<ICloudflareR2Service>();

        var cutoff = DateTime.UtcNow - _pendingTimeout;
        var pendingFiles = await context.Files
            .Where(f => f.Status == FileStatus.Pending && f.UploadedAt < cutoff)
            .ToListAsync();

        if (pendingFiles.Count == 0)
        {
            LogNoPendingFiles();
            return;
        }

        LogPendingFilesFound(pendingFiles.Count);

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
                    LogR2DeleteFailed(ex, file.StorageKey);
                    // Continue with database cleanup even if R2 deletion fails
                }

                // Remove from database
                context.Files.Remove(file);

                successCount++;
                LogPendingFileCleaned(file.Id, file.UploadedAt);
            }
            catch (Exception ex)
            {
                failureCount++;
                LogFileCleanupFailed(ex, file.Id);
            }
        }

        if (successCount > 0)
        {
            await context.SaveChangesAsync();
            LogCleanupCompleted(successCount, failureCount);
        }
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "FileCleanupService started")]
    private partial void LogServiceStarted();

    [LoggerMessage(Level = LogLevel.Error, Message = "Error during file cleanup")]
    private partial void LogCleanupError(Exception ex);

    [LoggerMessage(Level = LogLevel.Information, Message = "FileCleanupService stopped")]
    private partial void LogServiceStopped();

    [LoggerMessage(Level = LogLevel.Debug, Message = "No pending files to clean up")]
    private partial void LogNoPendingFiles();

    [LoggerMessage(Level = LogLevel.Information, Message = "Found {Count} pending files to clean up")]
    private partial void LogPendingFilesFound(int count);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Failed to delete file from R2 (may not exist): {StorageKey}")]
    private partial void LogR2DeleteFailed(Exception ex, string storageKey);

    [LoggerMessage(Level = LogLevel.Information, Message = "Cleaned up pending file: {FileId} (uploaded {UploadedAt})")]
    private partial void LogPendingFileCleaned(Guid fileId, DateTime uploadedAt);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Failed to cleanup file: {FileId}")]
    private partial void LogFileCleanupFailed(Exception ex, Guid fileId);

    [LoggerMessage(Level = LogLevel.Information, Message = "File cleanup completed: {SuccessCount} cleaned up, {FailureCount} failed")]
    private partial void LogCleanupCompleted(int successCount, int failureCount);
}
