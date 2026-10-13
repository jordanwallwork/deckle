using Deckle.API.Services.Storage;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Moq;

namespace Deckle.API.Tests.Services.Storage;

/// <summary>
/// Creates a <see cref="LocalFileStorage"/> rooted in a temporary directory, with an HTTP request in scope
/// so signed URLs can be generated.
/// </summary>
internal static class TestLocalFileStorage
{
    public static LocalFileStorage Create(
        string rootDirectory,
        int urlExpirationMinutes = 15,
        IDataProtectionProvider? dataProtectionProvider = null)
    {
        var options = Microsoft.Extensions.Options.Options.Create(new LocalFileStorageOptions
        {
            Directory = rootDirectory,
            UrlExpirationMinutes = urlExpirationMinutes
        });

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Scheme = "http";
        httpContext.Request.Host = new HostString("localhost:5209");
        var httpContextAccessor = new HttpContextAccessor { HttpContext = httpContext };

        var environment = new Mock<IHostEnvironment>();
        environment.Setup(e => e.ContentRootPath).Returns(Path.GetTempPath());

        return new LocalFileStorage(
            options,
            dataProtectionProvider ?? new EphemeralDataProtectionProvider(),
            httpContextAccessor,
            environment.Object,
            new Mock<ILogger<LocalFileStorage>>().Object);
    }

    public static string CreateTempDirectory()
    {
        var path = Path.Combine(Path.GetTempPath(), "deckle-storage-tests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(path);
        return path;
    }
}
