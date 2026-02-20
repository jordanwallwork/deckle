using Deckle.API.Extensions;
using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;

namespace Deckle.API.Tests.Extensions;

public class CorsExtensionsTests
{
    private static Func<string, bool> GetIsOriginAllowed(string? frontendUrl, string environmentName)
    {
        var configDict = new Dictionary<string, string?>();
        if (frontendUrl != null)
            configDict["FrontendUrl"] = frontendUrl;

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configDict)
            .Build();

        var mockEnv = new Mock<IWebHostEnvironment>();
        mockEnv.Setup(e => e.EnvironmentName).Returns(environmentName);

        var services = new ServiceCollection();
        services.AddDeckleCors(configuration, mockEnv.Object);

        var sp = services.BuildServiceProvider();
        var corsOptions = sp.GetRequiredService<IOptions<CorsOptions>>().Value;
        var policy = corsOptions.GetPolicy(corsOptions.DefaultPolicyName);

        return policy!.IsOriginAllowed!;
    }

    #region AddDeckleCors Tests

    [Fact]
    public void AddDeckleCors_ReturnsSameServiceCollection()
    {
        var services = new ServiceCollection();
        var config = new ConfigurationBuilder().Build();
        var mockEnv = new Mock<IWebHostEnvironment>();
        mockEnv.Setup(e => e.EnvironmentName).Returns("Development");

        var result = services.AddDeckleCors(config, mockEnv.Object);

        Assert.Same(services, result);
    }

    #endregion

    #region IsOriginAllowed: Empty Origin

    [Fact]
    public void IsOriginAllowed_EmptyOrigin_ReturnsFalse()
    {
        var isAllowed = GetIsOriginAllowed("https://example.com", "Production");

        Assert.False(isAllowed(""));
    }

    #endregion

    #region IsOriginAllowed: Development

    [Fact]
    public void IsOriginAllowed_Development_LocalhostOnDefaultDevPort_ReturnsTrue()
    {
        var isAllowed = GetIsOriginAllowed(null, "Development");

        Assert.True(isAllowed("http://localhost:5173"));
    }

    [Fact]
    public void IsOriginAllowed_Development_LocalhostOnArbitraryPort_ReturnsTrue()
    {
        var isAllowed = GetIsOriginAllowed(null, "Development");

        Assert.True(isAllowed("http://localhost:4000"));
        Assert.True(isAllowed("http://localhost:8080"));
    }

    [Fact]
    public void IsOriginAllowed_Development_LocalhostHttps_ReturnsTrue()
    {
        var isAllowed = GetIsOriginAllowed(null, "Development");

        Assert.True(isAllowed("https://localhost:5173"));
    }

    [Fact]
    public void IsOriginAllowed_Development_NonLocalhostHost_ReturnsFalse()
    {
        var isAllowed = GetIsOriginAllowed(null, "Development");

        Assert.False(isAllowed("http://192.168.1.1:5173"));
    }

    #endregion

    #region IsOriginAllowed: Production, no FrontendUrl

    [Fact]
    public void IsOriginAllowed_Production_NoFrontendUrl_NonLocalhostOrigin_ReturnsFalse()
    {
        var isAllowed = GetIsOriginAllowed(null, "Production");

        Assert.False(isAllowed("https://app.example.com"));
    }

    [Fact]
    public void IsOriginAllowed_Production_NoFrontendUrl_Localhost5173_ReturnsFalse()
    {
        // No FrontendUrl in production blocks all origins, including localhost
        var isAllowed = GetIsOriginAllowed(null, "Production");

        Assert.False(isAllowed("http://localhost:5173"));
    }

    #endregion

    #region IsOriginAllowed: Production, FrontendUrl configured

    [Fact]
    public void IsOriginAllowed_Production_ConfiguredFrontendUrl_ExactMatch_ReturnsTrue()
    {
        var isAllowed = GetIsOriginAllowed("https://app.example.com", "Production");

        Assert.True(isAllowed("https://app.example.com"));
    }

    [Fact]
    public void IsOriginAllowed_Production_ConfiguredFrontendUrl_OriginHasTrailingSlash_ReturnsTrue()
    {
        var isAllowed = GetIsOriginAllowed("https://app.example.com", "Production");

        Assert.True(isAllowed("https://app.example.com/"));
    }

    [Fact]
    public void IsOriginAllowed_Production_FrontendUrlHasTrailingSlash_OriginWithout_ReturnsTrue()
    {
        var isAllowed = GetIsOriginAllowed("https://app.example.com/", "Production");

        Assert.True(isAllowed("https://app.example.com"));
    }

    [Fact]
    public void IsOriginAllowed_Production_ConfiguredFrontendUrl_DifferentOrigin_ReturnsFalse()
    {
        var isAllowed = GetIsOriginAllowed("https://app.example.com", "Production");

        Assert.False(isAllowed("https://other.example.com"));
    }

    [Fact]
    public void IsOriginAllowed_Production_ConfiguredFrontendUrl_Localhost5173Http_ReturnsTrue()
    {
        // Even in production with a configured URL, localhost:5173 is permitted as a dev fallback
        var isAllowed = GetIsOriginAllowed("https://app.example.com", "Production");

        Assert.True(isAllowed("http://localhost:5173"));
    }

    [Fact]
    public void IsOriginAllowed_Production_ConfiguredFrontendUrl_Localhost5173Https_ReturnsTrue()
    {
        var isAllowed = GetIsOriginAllowed("https://app.example.com", "Production");

        Assert.True(isAllowed("https://localhost:5173"));
    }

    [Fact]
    public void IsOriginAllowed_Production_ConfiguredFrontendUrl_OtherLocalhostPort_ReturnsFalse()
    {
        // Only localhost:5173 is in the dev fallback list; other ports are not
        var isAllowed = GetIsOriginAllowed("https://app.example.com", "Production");

        Assert.False(isAllowed("http://localhost:4000"));
    }

    #endregion
}
