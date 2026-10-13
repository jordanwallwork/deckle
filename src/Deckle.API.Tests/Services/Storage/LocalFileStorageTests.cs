using Deckle.API.Services.Storage;
using Microsoft.AspNetCore.DataProtection;

namespace Deckle.API.Tests.Services.Storage;

public class LocalFileStorageTests : IDisposable
{
    private bool _disposed;
    private readonly string _rootDirectory;
    private readonly LocalFileStorage _storage;

    public LocalFileStorageTests()
    {
        _rootDirectory = TestLocalFileStorage.CreateTempDirectory();
        _storage = TestLocalFileStorage.Create(_rootDirectory);
    }

    #region File Operations Tests

    [Fact]
    public async Task SaveAsync_WithinSizeLimit_WritesFile()
    {
        var saved = await _storage.SaveAsync("projects/a/files/b/image.png", new MemoryStream([1, 2, 3]), 3);

        Assert.True(saved);
        Assert.True(await _storage.FileExistsAsync("projects/a/files/b/image.png"));
        Assert.Equal([1, 2, 3], await File.ReadAllBytesAsync(Path.Combine(_rootDirectory, "projects", "a", "files", "b", "image.png")));
    }

    [Fact]
    public async Task SaveAsync_ExceedsSizeLimit_WritesNothing()
    {
        var saved = await _storage.SaveAsync("projects/a/files/b/image.png", new MemoryStream([1, 2, 3, 4]), 3);

        Assert.False(saved);
        Assert.False(await _storage.FileExistsAsync("projects/a/files/b/image.png"));
        Assert.Empty(Directory.EnumerateFiles(_rootDirectory, "*", SearchOption.AllDirectories));
    }

    [Fact]
    public async Task CopyFileAsync_CopiesFile()
    {
        await _storage.SaveAsync("source.png", new MemoryStream([1, 2, 3]), 3);

        await _storage.CopyFileAsync("source.png", "nested/destination.png");

        Assert.True(await _storage.FileExistsAsync("source.png"));
        Assert.True(await _storage.FileExistsAsync("nested/destination.png"));
    }

    [Fact]
    public async Task DeleteFileAsync_RemovesFileAndEmptyDirectories()
    {
        await _storage.SaveAsync("projects/a/files/b/image.png", new MemoryStream([1]), 1);

        await _storage.DeleteFileAsync("projects/a/files/b/image.png");

        Assert.False(await _storage.FileExistsAsync("projects/a/files/b/image.png"));
        Assert.False(Directory.Exists(Path.Combine(_rootDirectory, "projects")));
        Assert.True(Directory.Exists(_rootDirectory));
    }

    [Fact]
    public async Task DeleteFileAsync_MissingFile_DoesNotThrow()
    {
        var exception = await Record.ExceptionAsync(() => _storage.DeleteFileAsync("projects/a/files/b/missing.png"));

        Assert.Null(exception);
    }

    [Fact]
    public async Task OpenRead_MissingFile_ReturnsNull()
    {
        Assert.Null(_storage.OpenRead("missing.png"));
        Assert.False(await _storage.FileExistsAsync("missing.png"));
    }

    [Theory]
    [InlineData("../outside.png")]
    [InlineData("projects/../../outside.png")]
    public async Task StorageKeyOutsideRoot_ThrowsArgumentException(string storageKey)
    {
        await Assert.ThrowsAsync<ArgumentException>(() => _storage.FileExistsAsync(storageKey));
        await Assert.ThrowsAsync<ArgumentException>(() => _storage.SaveAsync(storageKey, new MemoryStream([1]), 1));
    }

    #endregion

    #region Signed URL Tests

    [Fact]
    public void GenerateUploadUrl_ReturnsStorageEndpointUrlWithValidUploadToken()
    {
        var url = _storage.GenerateUploadUrl("projects/a/image.png", "image/png", 1024);

        Assert.StartsWith("http://localhost:5209/storage?token=", url, StringComparison.Ordinal);
        Assert.True(_storage.TryReadToken(ExtractToken(url), StorageOperation.Upload, out var payload));
        Assert.Equal("projects/a/image.png", payload.StorageKey);
        Assert.Equal("image/png", payload.ContentType);
        Assert.Equal(1024, payload.MaxBytes);
    }

    [Fact]
    public void GenerateDownloadUrl_ReturnsValidDownloadTokenWithContentType()
    {
        var url = _storage.GenerateDownloadUrl("projects/a/image.png", "image.png");

        Assert.True(_storage.TryReadToken(ExtractToken(url), StorageOperation.Download, out var payload));
        Assert.Equal("projects/a/image.png", payload.StorageKey);
        Assert.Equal("image/png", payload.ContentType);
        Assert.Equal("image.png", payload.FileName);
    }

    [Fact]
    public void TryReadToken_WrongOperation_ReturnsFalse()
    {
        var url = _storage.GenerateDownloadUrl("projects/a/image.png", "image.png");

        Assert.False(_storage.TryReadToken(ExtractToken(url), StorageOperation.Upload, out _));
    }

    [Fact]
    public void TryReadToken_TamperedToken_ReturnsFalse()
    {
        var token = ExtractToken(_storage.GenerateUploadUrl("projects/a/image.png", "image/png", 1024));
        var tampered = token[..^4] + (token.EndsWith("AAAA", StringComparison.Ordinal) ? "BBBB" : "AAAA");

        Assert.False(_storage.TryReadToken(tampered, StorageOperation.Upload, out _));
        Assert.False(_storage.TryReadToken("not-a-token", StorageOperation.Upload, out _));
    }

    [Fact]
    public void TryReadToken_ExpiredToken_ReturnsFalse()
    {
        var dataProtectionProvider = new EphemeralDataProtectionProvider();
        var expiringStorage = TestLocalFileStorage.Create(_rootDirectory, urlExpirationMinutes: -1, dataProtectionProvider);
        var url = expiringStorage.GenerateUploadUrl("projects/a/image.png", "image/png", 1024);

        Assert.False(expiringStorage.TryReadToken(ExtractToken(url), StorageOperation.Upload, out _));
    }

    [Fact]
    public void TryReadToken_TokenFromDifferentKey_ReturnsFalse()
    {
        var otherStorage = TestLocalFileStorage.Create(_rootDirectory);
        var url = otherStorage.GenerateUploadUrl("projects/a/image.png", "image/png", 1024);

        Assert.False(_storage.TryReadToken(ExtractToken(url), StorageOperation.Upload, out _));
    }

    private static string ExtractToken(string url) =>
        Uri.UnescapeDataString(url[(url.IndexOf("token=", StringComparison.Ordinal) + "token=".Length)..]);

    #endregion

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (!_disposed)
        {
            if (disposing && Directory.Exists(_rootDirectory))
            {
                Directory.Delete(_rootDirectory, recursive: true);
            }

            _disposed = true;
        }
    }
}
