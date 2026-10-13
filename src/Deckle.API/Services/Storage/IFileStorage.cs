namespace Deckle.API.Services.Storage;

/// <summary>
/// Blob storage backend for uploaded files (Cloudflare R2 in production, local filesystem in development)
/// </summary>
public interface IFileStorage
{
    public string GenerateUploadUrl(string storageKey, string contentType, long fileSizeBytes);
    public string GenerateDownloadUrl(string storageKey, string fileName);
    public Task CopyFileAsync(string sourceStorageKey, string destinationStorageKey);
    public Task DeleteFileAsync(string storageKey);
    public Task<bool> FileExistsAsync(string storageKey);
}
