using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.Options;

namespace Deckle.API.Services.Storage;

public class LocalFileStorageOptions
{
    public const string SectionName = "LocalFileStorage";

    /// <summary>
    /// Directory files are stored in. Relative paths are resolved against the content root.
    /// Local storage is enabled (instead of R2) when this is set.
    /// </summary>
    public string Directory { get; set; } = string.Empty;
    public int UrlExpirationMinutes { get; set; } = 15;

    public static bool IsEnabled(IConfiguration configuration) =>
        !string.IsNullOrWhiteSpace(configuration[$"{SectionName}:Directory"]);
}

public enum StorageOperation
{
    Upload,
    Download
}

/// <summary>
/// Payload of a signed local storage URL — the local equivalent of an R2 presigned URL
/// </summary>
public sealed record StorageToken(
    StorageOperation Operation,
    string StorageKey,
    string ContentType,
    long MaxBytes = 0,
    string? FileName = null);

/// <summary>
/// Stores files on the local filesystem, for local development without R2.
/// Uploads and downloads go through the /storage endpoint using time-limited signed tokens.
/// </summary>
public partial class LocalFileStorage : IFileStorage
{
    public const string EndpointPath = "/storage";

    private const int CopyBufferSize = 81920;

    private readonly ITimeLimitedDataProtector _protector;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly TimeSpan _urlLifetime;
    private readonly ILogger<LocalFileStorage> _logger;
    private static readonly FileExtensionContentTypeProvider _contentTypeProvider = new();

    public string RootDirectory { get; }

    public LocalFileStorage(
        IOptions<LocalFileStorageOptions> options,
        IDataProtectionProvider dataProtectionProvider,
        IHttpContextAccessor httpContextAccessor,
        IHostEnvironment environment,
        ILogger<LocalFileStorage> logger)
    {
        var directory = options.Value.Directory;
        if (string.IsNullOrWhiteSpace(directory))
        {
            throw new InvalidOperationException($"{LocalFileStorageOptions.SectionName}:Directory must be configured to use local file storage");
        }

        RootDirectory = Path.GetFullPath(directory, environment.ContentRootPath);
        _protector = dataProtectionProvider.CreateProtector("Deckle.LocalFileStorage").ToTimeLimitedDataProtector();
        _httpContextAccessor = httpContextAccessor;
        _urlLifetime = TimeSpan.FromMinutes(options.Value.UrlExpirationMinutes);
        _logger = logger;

        System.IO.Directory.CreateDirectory(RootDirectory);
    }

    public string GenerateUploadUrl(string storageKey, string contentType, long fileSizeBytes)
    {
        return BuildUrl(new StorageToken(StorageOperation.Upload, storageKey, contentType, MaxBytes: fileSizeBytes));
    }

    public string GenerateDownloadUrl(string storageKey, string fileName)
    {
        if (!_contentTypeProvider.TryGetContentType(fileName, out var contentType))
        {
            contentType = "application/octet-stream";
        }

        return BuildUrl(new StorageToken(StorageOperation.Download, storageKey, contentType, FileName: StorageKeys.SanitizeFileName(fileName)));
    }

    public Task CopyFileAsync(string sourceStorageKey, string destinationStorageKey)
    {
        var destinationPath = ResolvePath(destinationStorageKey);
        System.IO.Directory.CreateDirectory(Path.GetDirectoryName(destinationPath)!);
        File.Copy(ResolvePath(sourceStorageKey), destinationPath, overwrite: true);

        LogFileCopied(sourceStorageKey, destinationStorageKey);
        return Task.CompletedTask;
    }

    public Task DeleteFileAsync(string storageKey)
    {
        // Like R2, deleting a missing file is a no-op (pending uploads may never have been written)
        var path = ResolvePath(storageKey);
        if (File.Exists(path))
        {
            File.Delete(path);
            DeleteEmptyParentDirectories(path);
        }

        LogFileDeleted(storageKey);
        return Task.CompletedTask;
    }

    public Task<bool> FileExistsAsync(string storageKey)
    {
        return Task.FromResult(File.Exists(ResolvePath(storageKey)));
    }

    /// <summary>
    /// Read and validate a signed storage token. Returns false if the token is invalid, expired,
    /// or was issued for a different operation.
    /// </summary>
    public bool TryReadToken(string token, StorageOperation operation, out StorageToken payload)
    {
        payload = null!;

        try
        {
            var json = _protector.Unprotect(token, out _);
            var result = JsonSerializer.Deserialize<StorageToken>(json);
            if (result is null || result.Operation != operation)
            {
                return false;
            }

            payload = result;
            return true;
        }
        catch (Exception ex) when (ex is CryptographicException or FormatException or JsonException)
        {
            return false;
        }
    }

    /// <summary>
    /// Write content to storage. The content is written to a temporary file first so an interrupted
    /// upload never leaves a partial file in place. Returns false (and writes nothing) if the content
    /// exceeds <paramref name="maxBytes"/>.
    /// </summary>
    public async Task<bool> SaveAsync(string storageKey, Stream content, long maxBytes, CancellationToken cancellationToken = default)
    {
        var path = ResolvePath(storageKey);
        System.IO.Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var tempPath = path + $".{Guid.NewGuid():N}.tmp";

        try
        {
            await using (var output = new FileStream(tempPath, FileMode.CreateNew, FileAccess.Write, FileShare.None, CopyBufferSize, useAsync: true))
            {
                var buffer = new byte[CopyBufferSize];
                long totalBytes = 0;
                int bytesRead;
                while ((bytesRead = await content.ReadAsync(buffer, cancellationToken)) > 0)
                {
                    totalBytes += bytesRead;
                    if (totalBytes > maxBytes)
                    {
                        return false;
                    }

                    await output.WriteAsync(buffer.AsMemory(0, bytesRead), cancellationToken);
                }
            }

            File.Move(tempPath, path, overwrite: true);
            LogFileSaved(storageKey);
            return true;
        }
        finally
        {
            File.Delete(tempPath);
        }
    }

    /// <summary>
    /// Open a stored file for reading, or null if it doesn't exist
    /// </summary>
    public FileStream? OpenRead(string storageKey)
    {
        var path = ResolvePath(storageKey);
        return File.Exists(path)
            ? new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read, CopyBufferSize, useAsync: true)
            : null;
    }

    /// <summary>
    /// Map a storage key to a path under the root directory, rejecting keys that escape it
    /// </summary>
    private string ResolvePath(string storageKey)
    {
        var rootWithSeparator = Path.EndsInDirectorySeparator(RootDirectory)
            ? RootDirectory
            : RootDirectory + Path.DirectorySeparatorChar;
        var path = Path.GetFullPath(Path.Combine(RootDirectory, storageKey));

        if (!path.StartsWith(rootWithSeparator, StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException($"Storage key '{storageKey}' resolves outside the storage directory", nameof(storageKey));
        }

        return path;
    }

    private void DeleteEmptyParentDirectories(string path)
    {
        var directory = Path.GetDirectoryName(path);
        while (directory is not null
            && directory.Length > RootDirectory.Length
            && System.IO.Directory.Exists(directory)
            && !System.IO.Directory.EnumerateFileSystemEntries(directory).Any())
        {
            System.IO.Directory.Delete(directory);
            directory = Path.GetDirectoryName(directory);
        }
    }

    private string BuildUrl(StorageToken payload)
    {
        var request = _httpContextAccessor.HttpContext?.Request
            ?? throw new InvalidOperationException("Local storage URLs can only be generated during an HTTP request");

        var token = _protector.Protect(JsonSerializer.Serialize(payload), _urlLifetime);
        return $"{request.Scheme}://{request.Host}{request.PathBase}{EndpointPath}?token={Uri.EscapeDataString(token)}";
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Saved file to local storage: {StorageKey}")]
    private partial void LogFileSaved(string storageKey);

    [LoggerMessage(Level = LogLevel.Information, Message = "Copied file in local storage from {SourceKey} to {DestinationKey}")]
    private partial void LogFileCopied(string sourceKey, string destinationKey);

    [LoggerMessage(Level = LogLevel.Information, Message = "Deleted file from local storage: {StorageKey}")]
    private partial void LogFileDeleted(string storageKey);
}
