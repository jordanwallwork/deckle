using Deckle.API.Endpoints;
using Deckle.API.Services.Storage;
using Deckle.API.Tests.Services.Storage;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Headers;

namespace Deckle.API.Tests.Endpoints;

/// <summary>
/// Hosts the local storage endpoints on a TestServer, plus helper endpoints that issue signed URLs
/// (standing in for FileService.RequestUploadUrlAsync and the /file redirect endpoint).
/// </summary>
public sealed class LocalStorageEndpointsFixture : IAsyncLifetime
{
    public HttpClient Client { get; private set; } = null!;
    private WebApplication _app = null!;
    private string _rootDirectory = null!;

    public async Task InitializeAsync()
    {
        _rootDirectory = TestLocalFileStorage.CreateTempDirectory();

        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseTestServer();
        builder.Services.Configure<LocalFileStorageOptions>(o => o.Directory = _rootDirectory);
        builder.Services.AddSingleton<IDataProtectionProvider>(new EphemeralDataProtectionProvider());
        builder.Services.AddHttpContextAccessor();
        builder.Services.AddSingleton<LocalFileStorage>();

        _app = builder.Build();
        _app.MapLocalStorageEndpoints();
        _app.MapGet("/test/upload-url", (string key, string contentType, long size, LocalFileStorage storage) =>
            storage.GenerateUploadUrl(key, contentType, size));
        _app.MapGet("/test/download-url", (string key, string fileName, LocalFileStorage storage) =>
            storage.GenerateDownloadUrl(key, fileName));

        await _app.StartAsync();
        Client = _app.GetTestClient();
    }

    public async Task DisposeAsync()
    {
        Client.Dispose();
        await _app.StopAsync();
        await _app.DisposeAsync();
        Directory.Delete(_rootDirectory, recursive: true);
    }
}

public class LocalStorageEndpointsTests(LocalStorageEndpointsFixture fixture)
    : IClassFixture<LocalStorageEndpointsFixture>
{
    private readonly HttpClient _client = fixture.Client;

    [Fact]
    public async Task Upload_ThenDownload_RoundTripsFile()
    {
        var key = UniqueKey("image.png");
        byte[] content = [1, 2, 3, 4];

        using var uploadResponse = await PutAsync(await GetUploadUrl(key, "image/png", content.Length), content, "image/png");
        Assert.Equal(HttpStatusCode.OK, uploadResponse.StatusCode);

        using var downloadResponse = await _client.GetAsync(await GetDownloadUrl(key, "image.png"));
        Assert.Equal(HttpStatusCode.OK, downloadResponse.StatusCode);
        Assert.Equal("image/png", downloadResponse.Content.Headers.ContentType?.MediaType);
        Assert.Equal("sandbox", downloadResponse.Headers.GetValues("Content-Security-Policy").Single());
        Assert.Equal(content, await downloadResponse.Content.ReadAsByteArrayAsync());
    }

    [Fact]
    public async Task Upload_ContentTypeMismatch_ReturnsBadRequest()
    {
        using var response = await PutAsync(await GetUploadUrl(UniqueKey("image.png"), "image/png", 3), [1, 2, 3], "image/jpeg");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Upload_LargerThanSignedSize_ReturnsPayloadTooLarge()
    {
        var key = UniqueKey("image.png");

        using var response = await PutAsync(await GetUploadUrl(key, "image/png", 3), [1, 2, 3, 4], "image/png");

        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, response.StatusCode);
        using var downloadResponse = await _client.GetAsync(await GetDownloadUrl(key, "image.png"));
        Assert.Equal(HttpStatusCode.NotFound, downloadResponse.StatusCode);
    }

    [Fact]
    public async Task Upload_WithDownloadToken_ReturnsForbidden()
    {
        var downloadUrl = await GetDownloadUrl(UniqueKey("image.png"), "image.png");

        using var response = await PutAsync(downloadUrl, [1, 2, 3], "image/png");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Download_InvalidToken_ReturnsForbidden()
    {
        using var response = await _client.GetAsync("/storage?token=not-a-token");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Download_MissingFile_ReturnsNotFound()
    {
        using var response = await _client.GetAsync(await GetDownloadUrl(UniqueKey("missing.png"), "missing.png"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private static string UniqueKey(string fileName) => $"projects/{Guid.NewGuid()}/files/{Guid.NewGuid()}/{fileName}";

    private Task<string> GetUploadUrl(string key, string contentType, long size) =>
        _client.GetStringAsync($"/test/upload-url?key={Uri.EscapeDataString(key)}&contentType={Uri.EscapeDataString(contentType)}&size={size}");

    private Task<string> GetDownloadUrl(string key, string fileName) =>
        _client.GetStringAsync($"/test/download-url?key={Uri.EscapeDataString(key)}&fileName={Uri.EscapeDataString(fileName)}");

    private async Task<HttpResponseMessage> PutAsync(string url, byte[] content, string contentType)
    {
        using var body = new ByteArrayContent(content);
        body.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        return await _client.PutAsync(url, body);
    }
}
