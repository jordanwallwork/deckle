using Deckle.API.Extensions;
using Deckle.API.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Deckle.API.Tests.Extensions;

public class ServiceCollectionExtensionsTests
{
    #region AddExceptionlessIfConfigured Tests

    [Fact]
    public void AddExceptionlessIfConfigured_WithoutApiKey_ReturnsSameServiceCollection()
    {
        var services = new ServiceCollection();
        var config = new ConfigurationBuilder().Build();

        var result = services.AddExceptionlessIfConfigured(config);

        Assert.Same(services, result);
    }

    [Fact]
    public void AddExceptionlessIfConfigured_WithApiKey_ReturnsSameServiceCollection()
    {
        var services = new ServiceCollection();
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Exceptionless:Key"] = "test-api-key" })
            .Build();

        var result = services.AddExceptionlessIfConfigured(config);

        Assert.Same(services, result);
    }

    [Fact]
    public void AddExceptionlessIfConfigured_WithoutApiKey_DoesNotRegisterAnyServices()
    {
        var services = new ServiceCollection();
        var config = new ConfigurationBuilder().Build();
        var countBefore = services.Count;

        services.AddExceptionlessIfConfigured(config);

        Assert.Equal(countBefore, services.Count);
    }

    [Fact]
    public void AddExceptionlessIfConfigured_WithApiKey_RegistersAdditionalServices()
    {
        var servicesWithout = new ServiceCollection();
        servicesWithout.AddExceptionlessIfConfigured(new ConfigurationBuilder().Build());
        var countWithout = servicesWithout.Count;

        var servicesWith = new ServiceCollection();
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Exceptionless:Key"] = "test-api-key" })
            .Build();
        servicesWith.AddExceptionlessIfConfigured(config);

        Assert.True(servicesWith.Count > countWithout);
    }

    [Fact]
    public void AddExceptionlessIfConfigured_EmptyApiKey_DoesNotRegisterExtraServices()
    {
        var servicesWithout = new ServiceCollection();
        servicesWithout.AddExceptionlessIfConfigured(new ConfigurationBuilder().Build());
        var countWithout = servicesWithout.Count;

        var servicesWith = new ServiceCollection();
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Exceptionless:Key"] = "" })
            .Build();
        servicesWith.AddExceptionlessIfConfigured(config);

        Assert.Equal(countWithout, servicesWith.Count);
    }

    #endregion

    #region AddDeckleApiServices Tests

    [Fact]
    public void AddDeckleApiServices_ReturnsSameServiceCollection()
    {
        var services = new ServiceCollection();

        var result = services.AddDeckleApiServices();

        Assert.Same(services, result);
    }

    [Fact]
    public void AddDeckleApiServices_RegistersServices()
    {
        var services = new ServiceCollection();
        var countBefore = services.Count;

        services.AddDeckleApiServices();

        Assert.True(services.Count > countBefore);
    }

    #endregion

    #region AddDeckleApplicationServices Tests

    [Fact]
    public void AddDeckleApplicationServices_ReturnsSameServiceCollection()
    {
        var services = new ServiceCollection();

        var result = services.AddDeckleApplicationServices();

        Assert.Same(services, result);
    }

    [Fact]
    public void AddDeckleApplicationServices_RegistersProjectAuthorizationService_AsScoped()
    {
        var services = new ServiceCollection();
        services.AddDeckleApplicationServices();

        var descriptor = services.FirstOrDefault(d => d.ServiceType == typeof(IProjectAuthorizationService));

        Assert.NotNull(descriptor);
        Assert.Equal(ServiceLifetime.Scoped, descriptor!.Lifetime);
    }

    [Fact]
    public void AddDeckleApplicationServices_RegistersUserService_AsScoped()
    {
        var services = new ServiceCollection();
        services.AddDeckleApplicationServices();

        var descriptor = services.FirstOrDefault(d => d.ServiceType == typeof(IUserService));

        Assert.NotNull(descriptor);
        Assert.Equal(ServiceLifetime.Scoped, descriptor!.Lifetime);
    }

    [Fact]
    public void AddDeckleApplicationServices_RegistersProjectService_AsScoped()
    {
        var services = new ServiceCollection();
        services.AddDeckleApplicationServices();

        var descriptor = services.FirstOrDefault(d => d.ServiceType == typeof(IProjectService));

        Assert.NotNull(descriptor);
        Assert.Equal(ServiceLifetime.Scoped, descriptor!.Lifetime);
    }

    [Fact]
    public void AddDeckleApplicationServices_RegistersGoogleSheetsService_AsScoped()
    {
        var services = new ServiceCollection();
        services.AddDeckleApplicationServices();

        var descriptor = services.FirstOrDefault(d => d.ServiceType == typeof(IGoogleSheetsService));

        Assert.NotNull(descriptor);
        Assert.Equal(ServiceLifetime.Scoped, descriptor!.Lifetime);
    }

    [Fact]
    public void AddDeckleApplicationServices_RegistersDataSourceService_AsScoped()
    {
        var services = new ServiceCollection();
        services.AddDeckleApplicationServices();

        var descriptor = services.FirstOrDefault(d => d.ServiceType == typeof(IDataSourceService));

        Assert.NotNull(descriptor);
        Assert.Equal(ServiceLifetime.Scoped, descriptor!.Lifetime);
    }

    [Fact]
    public void AddDeckleApplicationServices_RegistersComponentService_AsScoped()
    {
        var services = new ServiceCollection();
        services.AddDeckleApplicationServices();

        var descriptor = services.FirstOrDefault(d => d.ServiceType == typeof(IComponentService));

        Assert.NotNull(descriptor);
        Assert.Equal(ServiceLifetime.Scoped, descriptor!.Lifetime);
    }

    [Fact]
    public void AddDeckleApplicationServices_RegistersFileDirectoryService_AsScoped()
    {
        var services = new ServiceCollection();
        services.AddDeckleApplicationServices();

        var descriptor = services.FirstOrDefault(d => d.ServiceType == typeof(IFileDirectoryService));

        Assert.NotNull(descriptor);
        Assert.Equal(ServiceLifetime.Scoped, descriptor!.Lifetime);
    }

    [Fact]
    public void AddDeckleApplicationServices_RegistersAdminService_AsScoped()
    {
        var services = new ServiceCollection();
        services.AddDeckleApplicationServices();

        var descriptor = services.FirstOrDefault(d => d.ServiceType == typeof(IAdminService));

        Assert.NotNull(descriptor);
        Assert.Equal(ServiceLifetime.Scoped, descriptor!.Lifetime);
    }

    #endregion
}
