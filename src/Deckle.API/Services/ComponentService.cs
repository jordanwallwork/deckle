using Deckle.API.DTOs;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Org.BouncyCastle.Asn1.Ocsp;

namespace Deckle.API.Services;

public class ComponentService
{
    private readonly AppDbContext _context;
    private readonly ProjectAuthorizationService _authService;

    public ComponentService(AppDbContext context, ProjectAuthorizationService authService)
    {
        _context = context;
        _authService = authService;
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
        where TComponent : Component, ICreatableComponent<TComponent, TConfig>
        where TConfig : IComponentConfig<TComponent>
    {
        TComponent.Validate(config);
        await _authService.EnsureCanModifyResourcesAsync(userId, projectId);
        var component = TComponent.Create(config);
        component.ProjectId = projectId;
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
        where TComponent : Component, IUpdatableComponent<TComponent, TConfig>
        where TConfig : IComponentConfig<TComponent>
    {
        var component = await FindAndAuthorizeComponentAsync<TComponent>(
            userId, componentId, ProjectAuthorizationService.CanModifyResources);
        if (component == null) return default;

        TComponent.ApplyUpdate(component, config);
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

    public async Task<List<ComponentDto>> GetProjectComponentsAsync(Guid userId, Guid projectId)
    {
        if (!await _authService.HasProjectAccessAsync(userId, projectId))
        {
            return [];
        }

        var components = await _context.Components
            .Where(c => c.ProjectId == projectId)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();

        await LoadDataSourcesForComponentsAsync(components);

        return [.. components.Select(c => c.ToComponentDto())];
    }

    public async Task<ComponentDto?> GetComponentByIdAsync(Guid userId, Guid componentId)
    {
        var component = await _context.Components
            .Where(c => c.Id == componentId &&
                        (c.ProjectId == null || c.Project!.Users.Any(u => u.Id == userId)))
            .FirstOrDefaultAsync();

        if (component == null)
        {
            return null;
        }

        await LoadDataSourceIfSupportedAsync(component);

        return component.ToComponentDto();
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

        var dtos = components.Select(c => new AdminSampleComponentDto
        {
            Id = c.Id,
            Type = GetComponentTypeName(c),
            Name = c.Name,
            CreatedAt = c.CreatedAt,
            UpdatedAt = c.UpdatedAt,
            Stats = GetComponentStats(c)
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
        PlayerMat mat => new Dictionary<string, string>
        {
            ["Size"] = mat.PresetSize?.ToString() ?? "Custom",
            ["Orientation"] = mat.Orientation.ToString(),
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
