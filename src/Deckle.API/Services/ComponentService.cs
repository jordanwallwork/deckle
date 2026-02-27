using Deckle.API.Configurators;
using Deckle.API.DTOs;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deckle.API.Services;

public interface IComponentService
{
    public Task<TComponent> CreateComponentAsync<TComponent, TConfig>(Guid userId, Guid? projectId, TConfig config)
        where TComponent : Component
        where TConfig : IComponentConfig<TComponent>;
    public Task<TComponent?> UpdateComponentAsync<TComponent, TConfig>(Guid userId, Guid componentId, TConfig config)
        where TComponent : Component
        where TConfig : IComponentConfig<TComponent>;
    public Task<List<ComponentDto>> GetProjectComponentsAsync(Guid userId, Guid? projectId);
    public Task<TComponent?> GetComponentByIdAsync<TComponent>(Guid userId, Guid componentId) where TComponent : Component;
    public Task<List<ComponentDto>> GetSamplesForTypeAsync(string componentType);
    public Task<ComponentDto?> UpdateDataSourceAsync(Guid userId, Guid componentId, Guid? dataSourceId);
    public Task<ComponentDto?> UpdateSampleDataSourceAsync(Guid componentId, Guid? dataSourceId);
    public Task<ComponentDto?> SaveDesignAsync(Guid userId, Guid componentId, string part, string? design);
    public Task DeleteComponentAsync(Guid userId, Guid componentId);
    public Task<AdminSampleComponentListResponse> GetSampleComponentsAsync(int page = 1, int pageSize = 20, string? search = null, string? componentType = null);
}

public interface ISampleService
{
    public Task UseSampleAsync<TComponent>(Guid userId, TComponent component, Guid sampleId, Action<TComponent> copyDesigns) where TComponent : Component;
}

public class SampleService : ISampleService
{
    private readonly IComponentService _componentService;
    private readonly IDataSourceService _dataSourceService;

    public SampleService(IComponentService componentService, IDataSourceService dataSourceService)
    {
        _componentService = componentService;
        _dataSourceService = dataSourceService;
    }

    public async Task UseSampleAsync<TComponent>(Guid userId, TComponent component, Guid sampleId, Action<TComponent> copyDesigns) where TComponent : Component
    {
        var sample = await _componentService.GetComponentByIdAsync<TComponent>(userId, sampleId);
        if (sample is null)
            return;

        if (sample is IDataSourceComponent dsc && dsc.DataSource is not null)
        {
            var copiedDs = await _dataSourceService.GetOrCreateProjectSampleDataSourceFromAsync(component.ProjectId!.Value, dsc.DataSource);
            if (component is IDataSourceComponent newDsc)
                newDsc.DataSource = copiedDs;
        }

        copyDesigns(sample);
    }
}

public class ComponentService : IComponentService
{
    private readonly AppDbContext _context;
    private readonly IProjectAuthorizationService _authService;
    private readonly IConfiguratorProvider _configuratorProvider;

    public ComponentService(
        AppDbContext context,
        IProjectAuthorizationService authService,
        IConfiguratorProvider configuratorProvider)
    {
        _context = context;
        _authService = authService;
        _configuratorProvider = configuratorProvider;
    }

    #region Generic Factory Methods

    /// <summary>
    /// Creates a new component using the generic factory pattern.
    /// </summary>
    /// <typeparam name="TComponent">The component type to create.</typeparam>
    /// <typeparam name="TConfig">The configuration type for the component.</typeparam>
    /// <typeparam name="TDto">The DTO type to return.</typeparam>
    /// <param name="userId">The user creating the component.</param>
    /// <param name="config">The configuration for the new component.</param>
    /// <returns>The created component as a DTO.</returns>
    public async Task<TComponent> CreateComponentAsync<TComponent, TConfig>(
        Guid userId,
        Guid? projectId,
        TConfig config)
        where TComponent : Component
        where TConfig : IComponentConfig<TComponent>
    {
        var configurator = _configuratorProvider.GetConfigurator<TComponent, TConfig>();

        await configurator.ValidateAsync(config);
        await _authService.EnsureCanModifyResourcesAsync(userId, projectId);
        var component = await configurator.CreateAsync(userId, projectId, config);

        return await SaveAndReturnAsync(component);
    }

    /// <summary>
    /// Updates an existing component using the generic factory pattern.
    /// </summary>
    /// <typeparam name="TComponent">The component type to update.</typeparam>
    /// <typeparam name="TConfig">The configuration type for the component.</typeparam>
    /// <typeparam name="TDto">The DTO type to return.</typeparam>
    /// <param name="userId">The user updating the component.</param>
    /// <param name="componentId">The ID of the component to update.</param>
    /// <param name="config">The configuration with update values.</param>
    /// <returns>The updated component, or null if not found/unauthorized.</returns>
    public async Task<TComponent?> UpdateComponentAsync<TComponent, TConfig>(
        Guid userId,
        Guid componentId,
        TConfig config)
        where TComponent : Component
        where TConfig : IComponentConfig<TComponent>
    {
        var component = await FindAndAuthorizeComponentAsync<TComponent>(userId, componentId, ProjectAuthorizationService.CanModifyResources);
        if (component == null) return default;

        var configurator = _configuratorProvider.GetConfigurator<TComponent, TConfig>();

        await configurator.UpdateAsync(component, config);
        await _context.SaveChangesAsync();

        return component;
    }

    #endregion

    #region DataSource Helpers

    private async Task LoadDataSourceIfSupportedAsync(Component component)
    {
        if (component is IDataSourceComponent)
        {
            await _context.Entry(component)
                .Reference(nameof(IDataSourceComponent.DataSource))
                .LoadAsync();
        }
    }

    private async Task LoadDataSourcesForComponentsAsync(IEnumerable<Component> components)
    {
        foreach (var component in components.OfType<IDataSourceComponent>())
        {
            await _context.Entry(component)
                .Reference(c => c.DataSource)
                .LoadAsync();
        }
    }

    #endregion

    #region Read Operations

    public async Task<List<ComponentDto>> GetProjectComponentsAsync(Guid userId, Guid? projectId)
    {
        await _authService.RequireProjectAccessAsync(userId, projectId);

        var components = await _context.Components
            .Where(c => c.ProjectId == projectId)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();

        await LoadDataSourcesForComponentsAsync(components);

        return [.. components.Select(c => c.ToComponentDto())];
    }

    public async Task<TComponent?> GetComponentByIdAsync<TComponent>(Guid userId, Guid componentId) where TComponent : Component
    {
        var component = await _context.Components
            .Where(c => c.Id == componentId && (c.ProjectId == null || c.Project!.Users.Any(u => u.Id == userId)))
            .FirstOrDefaultAsync();

        if (component == null)
        {
            return null;
        }

        await LoadDataSourceIfSupportedAsync(component);

        return component as TComponent;
    }

    public async Task<List<ComponentDto>> GetSamplesForTypeAsync(string componentType)
    {
        var query = _context.Components
            .Where(c => c.ProjectId == null);

        query = componentType.ToUpperInvariant() switch
        {
            "CARD" => query.Where(c => c is Card),
            "GAMEBOARD" => query.Where(c => c is GameBoard),
            "PLAYERMAT" => query.Where(c => c is PlayerMat),
            _ => query.Where(_ => false)
        };

        var components = await query
            .OrderBy(c => c.Name)
            .ToListAsync();

        await LoadDataSourcesForComponentsAsync(components);

        return [.. components.Select(c => c.ToComponentDto())];
    }

    #endregion

    #region Create Operations

    private async Task<TComponent> SaveAndReturnAsync<TComponent>(TComponent component)
        where TComponent : Component
    {
        _context.Set<TComponent>().Add(component);
        await _context.SaveChangesAsync();
        return component;
    }

    #endregion

    #region Update Operations

    public async Task<ComponentDto?> UpdateDataSourceAsync(Guid userId, Guid componentId, Guid? dataSourceId)
    {
        var component = await _context.Components
            .Where(c => c.Id == componentId && c.ProjectId != null && c.Project!.Users.Any(u => u.Id == userId))
            .FirstOrDefaultAsync();

        if (component is not IDataSourceComponent dataSourceComponent)
        {
            return null;
        }

        await LoadDataSourceIfSupportedAsync(component);

        var role = await _authService.GetUserProjectRoleAsync(userId, component.ProjectId!.Value);
        if (role == null || !ProjectAuthorizationService.CanManageDataSources(role.Value))
        {
            return null;
        }

        if (dataSourceId.HasValue)
        {
            var dataSourceExists = await _context.DataSources
                .AnyAsync(ds => ds.Id == dataSourceId.Value && ds.ProjectId == component.ProjectId);

            if (!dataSourceExists)
            {
                throw new ArgumentException("Data source not found or does not belong to this project");
            }

            dataSourceComponent.DataSource = await _context.DataSources.FindAsync(dataSourceId.Value);
        }
        else
        {
            dataSourceComponent.DataSource = null;
        }

        component.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return component.ToComponentDto();
    }

    public async Task<ComponentDto?> UpdateSampleDataSourceAsync(Guid componentId, Guid? dataSourceId)
    {
        var component = await _context.Components
            .Where(c => c.Id == componentId && c.ProjectId == null)
            .FirstOrDefaultAsync();

        if (component is not IDataSourceComponent dataSourceComponent)
        {
            return null;
        }

        await LoadDataSourceIfSupportedAsync(component);

        if (dataSourceId.HasValue)
        {
            var dataSource = await _context.DataSources
                .Where(ds => ds.Id == dataSourceId.Value && ds.ProjectId == null)
                .FirstOrDefaultAsync()
                ?? throw new ArgumentException("Data source not found or is not a sample data source");

            dataSourceComponent.DataSource = dataSource;
        }
        else
        {
            dataSourceComponent.DataSource = null;
        }

        component.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return component.ToComponentDto();
    }

    #endregion

    #region Design Operations

    public async Task<ComponentDto?> SaveDesignAsync(Guid userId, Guid componentId, string part, string? design)
    {
        var component = await FindAndAuthorizeComponentAsync<Component>(userId, componentId, ProjectAuthorizationService.CanModifyResources);

        if (component is not IEditableComponent editableComponent)
        {
            return null;
        }

        editableComponent.SetDesign(part, design);
        component.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        await LoadDataSourceIfSupportedAsync(component);

        return component.ToComponentDto();
    }

    #endregion

    #region Delete Operations

    public async Task DeleteComponentAsync(Guid userId, Guid componentId)
    {
        var component = await _context.Components
            .Where(c => c.Id == componentId)
            .FirstOrDefaultAsync() ?? throw new KeyNotFoundException("Component not found");

        if (component.ProjectId == null)
        {
            throw new UnauthorizedAccessException("Cannot delete shared sample components");
        }

        await _authService.EnsureCanDeleteResourcesAsync(userId, component.ProjectId.Value);

        _context.Components.Remove(component);
        await _context.SaveChangesAsync();
    }

    #endregion

    #region Sample Component Methods (Admin)

    public async Task<AdminSampleComponentListResponse> GetSampleComponentsAsync(
        int page = 1,
        int pageSize = 20,
        string? search = null,
        string? componentType = null)
    {
        var query = _context.Components
            .Where(c => c.ProjectId == null)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(componentType))
        {
            query = componentType.ToUpperInvariant() switch
            {
                "CARD" => query.Where(c => c is Card),
                "GAMEBOARD" => query.Where(c => c is GameBoard),
                "PLAYERMAT" => query.Where(c => c is PlayerMat),
                _ => query
            };
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(c => c.Name.Contains(search, StringComparison.InvariantCultureIgnoreCase));
        }

        var totalCount = await query.CountAsync();

        var components = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        await LoadDataSourcesForComponentsAsync(components);

        var dtos = components.Select(c => new AdminSampleComponentDto
        {
            Id = c.Id,
            Type = GetComponentTypeName(c),
            Name = c.Name,
            CreatedAt = c.CreatedAt,
            UpdatedAt = c.UpdatedAt,
            Stats = GetComponentStats(c),
            DataSource = c is IDataSourceComponent dsc && dsc.DataSource != null
                ? new DataSourceInfo(dsc.DataSource.Id, dsc.DataSource.Name)
                : null
        }).ToList();

        return new AdminSampleComponentListResponse
        {
            Components = dtos,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    #endregion

    #region Static Helpers

    public static string GetComponentTypeName(Component component) => component switch
    {
        Card => "Card",
        Dice => "Dice",
        GameBoard => "GameBoard",
        PlayerMat => "PlayerMat",
        _ => component.GetType().Name
    };

    public static Dictionary<string, string> GetComponentStats(Component component) => component switch
    {
        Card card => new Dictionary<string, string>
        {
            ["Size"] = FormatEnumName(card.Size.ToString()),
            ["Horizontal"] = card.Horizontal ? "Yes" : "No"
        },
        GameBoard board => new Dictionary<string, string>
        {
            ["Size"] = board.PresetSize?.ToString() ?? "Custom",
            ["Horizontal"] = board.Horizontal ? "Yes" : "No",
            ["Folds"] = $"{board.EffectiveHorizontalFolds}H × {board.EffectiveVerticalFolds}V"
        },
        PlayerMat mat => new Dictionary<string, string>
        {
            ["Size"] = mat.PresetSize?.ToString() ?? "Custom",
            ["Horizontal"] = mat.Horizontal ? "Yes" : "No",
            ["Dimensions"] = mat.PresetSize.HasValue ? "" : $"{mat.CustomWidthMm}×{mat.CustomHeightMm}mm"
        },
        _ => []
    };

    private static string FormatEnumName(string enumValue)
    {
        return string.Concat(enumValue.Select((c, i) =>
            i > 0 && char.IsUpper(c) ? " " + c : c.ToString()));
    }

    #endregion

    #region Authorization Helpers

    private async Task<T?> FindAndAuthorizeComponentAsync<T>(
        Guid userId,
        Guid componentId,
        Func<ProjectRole, bool> authorizationCheck)
        where T : Component
    {
        var component = await _context.FindAsync<T>(componentId);

        if (component == null)
        {
            return null;
        }

        var role = await _authService.GetUserProjectRoleAsync(userId, component.ProjectId);
        return role == null || !authorizationCheck(role.Value) ? null : component;
    }

    #endregion
}
