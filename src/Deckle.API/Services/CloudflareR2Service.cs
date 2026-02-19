using Amazon.S3;
using Amazon.S3.Model;
using Amazon.Runtime;
using Microsoft.Extensions.Options;
using Amazon;

namespace Deckle.API.Services;

public class CloudflareR2Options
{
    public required string AccountId { get; set; }
    public required string BucketName { get; set; }
    public required string AccessKeyId { get; set; }
    public required string SecretAccessKey { get; set; }
    public int PresignedUrlExpirationMinutes { get; set; } = 15;
}

public interface ICloudflareR2Service
{
    public string GenerateUploadUrl(string storageKey, string contentType, long fileSizeBytes);
    public string GenerateDownloadUrl(string storageKey, string fileName);
    public Task CopyFileAsync(string sourceStorageKey, string destinationStorageKey);
    public Task DeleteFileAsync(string storageKey);
    public Task<bool> FileExistsAsync(string storageKey);
}

public partial class CloudflareR2Service : ICloudflareR2Service, IDisposable
{
    private readonly IAmazonS3 _s3Client;
    private readonly CloudflareR2Options _options;
    private readonly ILogger<CloudflareR2Service> _logger;
    private bool _disposed;

    public CloudflareR2Service(
        IOptions<CloudflareR2Options> options,
        ILogger<CloudflareR2Service> logger)
    {
        _options = options.Value;
        _logger = logger;

        // Configure S3 client for R2
        var config = new AmazonS3Config
        {
            ServiceURL = $"https://{_options.AccountId}.r2.cloudflarestorage.com",
            ForcePathStyle = true
        };

        var credentials = new BasicAWSCredentials(
            _options.AccessKeyId,
            _options.SecretAccessKey);

        _s3Client = new AmazonS3Client(credentials, config);
    }

    /// <summary>
    /// Generate a presigned URL for uploading a file
    /// </summary>
    /// <remarks>
    /// IMPORTANT: For direct browser uploads to work, the R2 bucket MUST have CORS configured.
    ///
    /// Required CORS settings:
    /// - AllowedOrigins: Your frontend origins (e.g., http://localhost:5173, https://yourdomain.com)
    /// - AllowedMethods: PUT, GET, HEAD
    /// - AllowedHeaders: 'content-type' + 'x-amz-meta-filesize' (or at minimum: Content-Type, Content-Length)
    /// - ExposeHeaders: ETag
    /// </remarks>
    public string GenerateUploadUrl(
        string storageKey,
        string contentType,
        long fileSizeBytes)
    {
        try
        {
            var request = new GetPreSignedUrlRequest
            {
                BucketName = _options.BucketName,
                Key = storageKey,
                Verb = HttpVerb.PUT,
                Expires = DateTime.UtcNow.AddMinutes(_options.PresignedUrlExpirationMinutes),
                ContentType = contentType
            };

            // Add metadata for file size validation
            request.Metadata.Add("x-amz-meta-filesize", fileSizeBytes.ToString(System.Globalization.CultureInfo.InvariantCulture));

            var url = _s3Client.GetPreSignedURL(request);

            return url;
        }
        catch (Exception ex)
        {
            LogGenerateUploadUrlFailed(ex, storageKey);
            throw;
        }
    }

    /// <summary>
    /// Generate a presigned URL for downloading a file
    /// </summary>
    public string GenerateDownloadUrl(string storageKey, string fileName)
    {
        try
        {
            var request = new GetPreSignedUrlRequest
            {
                BucketName = _options.BucketName,
                Key = storageKey,
                Verb = HttpVerb.GET,
                Expires = DateTime.UtcNow.AddMinutes(_options.PresignedUrlExpirationMinutes)
            };

            // Set content disposition to suggest filename
            request.ResponseHeaderOverrides.ContentDisposition =
                $"inline; filename=\"{SanitizeFileName(fileName)}\"";

            var url = _s3Client.GetPreSignedURL(request);
            return url;
        }
        catch (Exception ex)
        {
            LogGenerateDownloadUrlFailed(ex, storageKey);
            throw;
        }
    }

    /// <summary>
    /// Copy a file within R2 (used for renaming)
    /// </summary>
    public async Task CopyFileAsync(string sourceStorageKey, string destinationStorageKey)
    {
        try
        {
            var copyRequest = new CopyObjectRequest
            {
                SourceBucket = _options.BucketName,
                SourceKey = sourceStorageKey,
                DestinationBucket = _options.BucketName,
                DestinationKey = destinationStorageKey
            };

            await _s3Client.CopyObjectAsync(copyRequest);
            LogFileCopied(sourceStorageKey, destinationStorageKey);
        }
        catch (Exception ex)
        {
            LogFileCopyFailed(ex, sourceStorageKey, destinationStorageKey);
            throw;
        }
    }

    /// <summary>
    /// Delete a file from R2
    /// </summary>
    public async Task DeleteFileAsync(string storageKey)
    {
        try
        {
            var request = new DeleteObjectRequest
            {
                BucketName = _options.BucketName,
                Key = storageKey
            };

            await _s3Client.DeleteObjectAsync(request);
            LogFileDeleted(storageKey);
        }
        catch (Exception ex)
        {
            LogFileDeleteFailed(ex, storageKey);
            throw;
        }
    }

    /// <summary>
    /// Verify that a file exists in R2 (optional - for upload confirmation)
    /// </summary>
    public async Task<bool> FileExistsAsync(string storageKey)
    {
        try
        {
            var request = new GetObjectMetadataRequest
            {
                BucketName = _options.BucketName,
                Key = storageKey
            };

            await _s3Client.GetObjectMetadataAsync(request);
            return true;
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return false;
        }
    }

    /// <summary>
    /// Validate content type against allowed types
    /// </summary>
    public static bool IsValidContentType(string contentType)
    {
        var allowedTypes = new[]
        {
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/gif",
            "image/webp",
            "image/svg+xml"
        };

        return allowedTypes.Contains(contentType.ToLowerInvariant());
    }

    /// <summary>
    /// Generate storage key for a file
    /// </summary>
    public static string GenerateStorageKey(Guid projectId, Guid fileId, string fileName)
    {
        // Sanitize filename
        var sanitized = SanitizeFileName(fileName);
        return $"projects/{projectId}/files/{fileId}/{sanitized}";
    }

    /// <summary>
    /// Sanitize filename to prevent path traversal and other issues
    /// </summary>
    private static string SanitizeFileName(string fileName)
    {
        // Remove potentially dangerous characters
        var invalid = Path.GetInvalidFileNameChars();
        var sanitized = string.Join("_", fileName.Split(invalid, StringSplitOptions.RemoveEmptyEntries));

        // Remove leading/trailing whitespace and dots
        sanitized = sanitized.Trim().Trim('.');

        // Ensure filename is not empty
        if (string.IsNullOrWhiteSpace(sanitized))
        {
            sanitized = "file";
        }

        return sanitized;
    }

    [LoggerMessage(Level = LogLevel.Error, Message = "Failed to generate upload URL for key: {StorageKey}")]
    private partial void LogGenerateUploadUrlFailed(Exception ex, string storageKey);

    [LoggerMessage(Level = LogLevel.Error, Message = "Failed to generate download URL for key: {StorageKey}")]
    private partial void LogGenerateDownloadUrlFailed(Exception ex, string storageKey);

    [LoggerMessage(Level = LogLevel.Information, Message = "Copied file in R2 from {SourceKey} to {DestinationKey}")]
    private partial void LogFileCopied(string sourceKey, string destinationKey);

    [LoggerMessage(Level = LogLevel.Error, Message = "Failed to copy file in R2 from {SourceKey} to {DestinationKey}")]
    private partial void LogFileCopyFailed(Exception ex, string sourceKey, string destinationKey);

    [LoggerMessage(Level = LogLevel.Information, Message = "Deleted file from R2: {StorageKey}")]
    private partial void LogFileDeleted(string storageKey);

    [LoggerMessage(Level = LogLevel.Error, Message = "Failed to delete file from R2: {StorageKey}")]
    private partial void LogFileDeleteFailed(Exception ex, string storageKey);

    /// <summary>
    /// Dispose of the S3 client resources
    /// </summary>
    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    /// <summary>
    /// Protected dispose implementation
    /// </summary>
    protected virtual void Dispose(bool disposing)
    {
        if (!_disposed)
        {
            if (disposing)
            {
                _s3Client.Dispose();
            }

            _disposed = true;
        }
    }
}
