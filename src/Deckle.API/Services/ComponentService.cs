using Deckle.API.DTOs;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;

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

    #region Validation Helpers

    private static void ValidatePlayerMatDimensions(
        PlayerMatSize? presetSize,
        decimal? customWidthMm,
        decimal? customHeightMm)
    {
        if (!presetSize.HasValue && (!customWidthMm.HasValue || !customHeightMm.HasValue))
        {
            throw new ArgumentException("Either PresetSize must be set, or both CustomWidthMm and CustomHeightMm must be provided");
        }

        if (customWidthMm.HasValue || customHeightMm.HasValue)
        {
            if (customWidthMm is < 63m or > 297m)
            {
                throw new ArgumentException("CustomWidthMm must be between 63mm and 297mm");
            }
            if (customHeightMm is < 63m or > 297m)
            {
                throw new ArgumentException("CustomHeightMm must be between 63mm and 297mm");
            }
        }
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

    public async Task<CardDto> CreateCardAsync(Guid userId, Guid projectId, string name, CardSize size, bool horizontal)
    {
        await _authService.EnsureCanModifyResourcesAsync(userId, projectId);
        var card = CreateCard(projectId, name, size, horizontal);
        return await SaveAndReturnAsync(card, c => new CardDto(c));
    }

    public async Task<DiceDto> CreateDiceAsync(Guid userId, Guid projectId, string name, DiceType type, DiceStyle style, DiceColor baseColor, int number)
    {
        await _authService.EnsureCanModifyResourcesAsync(userId, projectId);

        var dice = new Dice
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = name,
            Type = type,
            Style = style,
            BaseColor = baseColor,
            Number = number,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        return await SaveAndReturnAsync(dice, d => new DiceDto(d));
    }

    public async Task<PlayerMatDto> CreatePlayerMatAsync(
        Guid userId,
        Guid projectId,
        string name,
        PlayerMatSize? presetSize,
        PlayerMatOrientation orientation,
        decimal? customWidthMm,
        decimal? customHeightMm)
    {
        ValidatePlayerMatDimensions(presetSize, customWidthMm, customHeightMm);
        await _authService.EnsureCanModifyResourcesAsync(userId, projectId);
        var playerMat = CreatePlayerMat(projectId, name, presetSize, orientation, customWidthMm, customHeightMm);
        return await SaveAndReturnAsync(playerMat, pm => new PlayerMatDto(pm));
    }

    private static Card CreateCard(Guid? projectId, string name, CardSize size, bool horizontal) => new()
    {
        Id = Guid.NewGuid(),
        ProjectId = projectId,
        Name = name,
        Size = size,
        Horizontal = horizontal,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    private static PlayerMat CreatePlayerMat(
        Guid? projectId,
        string name,
        PlayerMatSize? presetSize,
        PlayerMatOrientation orientation,
        decimal? customWidthMm,
        decimal? customHeightMm) => new()
    {
        Id = Guid.NewGuid(),
        ProjectId = projectId,
        Name = name,
        PresetSize = presetSize,
        Orientation = orientation,
        CustomWidthMm = customWidthMm,
        CustomHeightMm = customHeightMm,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    private async Task<TDto> SaveAndReturnAsync<TComponent, TDto>(TComponent component, Func<TComponent, TDto> toDto)
        where TComponent : Component
    {
        _context.Set<TComponent>().Add(component);
        await _context.SaveChangesAsync();
        return toDto(component);
    }

    #endregion

    #region Update Operations

    public async Task<CardDto?> UpdateCardAsync(Guid userId, Guid componentId, string name, CardSize size, bool horizontal)
    {
        var card = await FindAndAuthorizeComponentAsync<Card>(userId, componentId, ProjectAuthorizationService.CanModifyResources);
        if (card == null) return null;

        card.Name = name;
        card.Size = size;
        card.Horizontal = horizontal;
        card.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return new CardDto(card);
    }

    public async Task<DiceDto?> UpdateDiceAsync(Guid userId, Guid componentId, string name, DiceType type, DiceStyle style, DiceColor baseColor, int number)
    {
        var dice = await FindAndAuthorizeComponentAsync<Dice>(userId, componentId, ProjectAuthorizationService.CanModifyResources);
        if (dice == null) return null;

        dice.Name = name;
        dice.Type = type;
        dice.Style = style;
        dice.BaseColor = baseColor;
        dice.Number = number;
        dice.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return new DiceDto(dice);
    }

    public async Task<PlayerMatDto?> UpdatePlayerMatAsync(
        Guid userId,
        Guid componentId,
        string name,
        PlayerMatSize? presetSize,
        PlayerMatOrientation orientation,
        decimal? customWidthMm,
        decimal? customHeightMm)
    {
        var playerMat = await FindAndAuthorizeComponentAsync<PlayerMat>(userId, componentId, ProjectAuthorizationService.CanModifyResources);
        if (playerMat == null) return null;

        ValidatePlayerMatDimensions(presetSize, customWidthMm, customHeightMm);

        playerMat.Name = name;
        playerMat.PresetSize = presetSize;
        playerMat.Orientation = orientation;
        playerMat.CustomWidthMm = customWidthMm;
        playerMat.CustomHeightMm = customHeightMm;
        playerMat.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return new PlayerMatDto(playerMat);
    }

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

    // Keep type-specific methods for backwards compatibility - they delegate to the generic version
    public Task<CardDto?> SaveCardDesignAsync(Guid userId, Guid componentId, string part, string? design)
        => SaveTypedDesignAsync<Card, CardDto>(userId, componentId, part, design, c => new CardDto(c));

    public Task<PlayerMatDto?> SavePlayerMatDesignAsync(Guid userId, Guid componentId, string part, string? design)
        => SaveTypedDesignAsync<PlayerMat, PlayerMatDto>(userId, componentId, part, design, pm => new PlayerMatDto(pm));

    private async Task<TDto?> SaveTypedDesignAsync<TComponent, TDto>(
        Guid userId,
        Guid componentId,
        string part,
        string? design,
        Func<TComponent, TDto> toDto)
        where TComponent : Component, IEditableComponent
    {
        var component = await FindAndAuthorizeComponentAsync<TComponent>(userId, componentId, ProjectAuthorizationService.CanModifyResources);
        if (component == null) return default;

        component.SetDesign(part, design);
        component.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return toDto(component);
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
            query = componentType.ToLower() switch
            {
                "card" => query.Where(c => c is Card),
                "playermat" => query.Where(c => c is PlayerMat),
                _ => query
            };
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(c => c.Name.ToLower().Contains(searchLower));
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

    public async Task<ComponentDto?> GetSampleComponentByIdAsync(Guid componentId)
    {
        var component = await _context.Components
            .Include(c => (c as Card)!.DataSource)
            .Include(c => (c as PlayerMat)!.DataSource)
            .Where(c => c.Id == componentId && c.ProjectId == null)
            .FirstOrDefaultAsync();

        return component?.ToComponentDto();
    }

    public async Task<CardDto> CreateSampleCardAsync(string name, CardSize size, bool horizontal)
    {
        var card = CreateCard(null, name, size, horizontal);
        return await SaveAndReturnAsync(card, c => new CardDto(c));
    }

    public async Task<PlayerMatDto> CreateSamplePlayerMatAsync(
        string name,
        PlayerMatSize? presetSize,
        PlayerMatOrientation orientation,
        decimal? customWidthMm,
        decimal? customHeightMm)
    {
        ValidatePlayerMatDimensions(presetSize, customWidthMm, customHeightMm);
        var playerMat = CreatePlayerMat(null, name, presetSize, orientation, customWidthMm, customHeightMm);
        return await SaveAndReturnAsync(playerMat, pm => new PlayerMatDto(pm));
    }

    public async Task<ComponentDto?> SaveSampleDesignAsync(Guid componentId, string part, string? design)
    {
        var component = await _context.Components
            .Where(c => c.Id == componentId && c.ProjectId == null)
            .FirstOrDefaultAsync();

        if (component is not IEditableComponent editable)
        {
            return null;
        }

        editable.SetDesign(part, design);
        component.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return component.ToComponentDto();
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
        var component = await _context.Set<T>()
            .Where(c => c.Id == componentId && c.ProjectId != null && c.Project!.Users.Any(u => u.Id == userId))
            .FirstOrDefaultAsync();

        if (component == null)
        {
            return null;
        }

        var role = await _authService.GetUserProjectRoleAsync(userId, component.ProjectId!.Value);
        if (role == null || !authorizationCheck(role.Value))
        {
            return null;
        }

        return component;
    }

    #endregion
}
