using Deckle.API.DTOs;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics.CodeAnalysis;

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

        // Explicitly load DataSource for components that support it
        foreach (var component in components.OfType<IDataSourceComponent>())
        {
            await _context.Entry(component)
                .Reference(c => c.DataSource)
                .LoadAsync();
        }

        return [.. components.Select(c => c.ToComponentDto())];
    }

    public async Task<ComponentDto?> GetComponentByIdAsync(Guid userId, Guid componentId)
    {
        var component = await _context.Components
            .Where(c => c.Id == componentId &&
                        c.Project.Users.Any(u => u.Id == userId))
            .FirstOrDefaultAsync();

        if (component == null)
        {
            return null;
        }

        // Explicitly load DataSource if the component supports it
        if (component is IDataSourceComponent)
        {
            await _context.Entry(component)
                .Reference(nameof(IDataSourceComponent.DataSource))
                .LoadAsync();
        }

        return component.ToComponentDto();
    }

    public async Task<CardDto> CreateCardAsync(Guid userId, Guid projectId, string name, CardSize size)
    {
        var card = new Card
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = name,
            Size = size,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await CreateAndSaveComponentAsync(userId, projectId, card);
        return new CardDto(card);
    }

    public async Task<DiceDto> CreateDiceAsync(Guid userId, Guid projectId, string name, DiceType type, DiceStyle style, DiceColor baseColor, int number)
    {
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

        await CreateAndSaveComponentAsync(userId, projectId, dice);
        return new DiceDto(dice);
    }

    public async Task<CardDto?> UpdateCardAsync(Guid userId, Guid componentId, string name, CardSize size)
    {
        var card = await FindAndAuthorizeComponentAsync<Card>(
            userId,
            componentId,
            ProjectAuthorizationService.CanModifyResources);

        if (card == null)
        {
            return null;
        }

        card.Name = name;
        card.Size = size;
        card.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new CardDto(card);
    }

    public async Task<DiceDto?> UpdateDiceAsync(Guid userId, Guid componentId, string name, DiceType type, DiceStyle style, DiceColor baseColor, int number)
    {
        var dice = await FindAndAuthorizeComponentAsync<Dice>(
            userId,
            componentId,
            ProjectAuthorizationService.CanModifyResources);

        if (dice == null)
        {
            return null;
        }

        dice.Name = name;
        dice.Type = type;
        dice.Style = style;
        dice.BaseColor = baseColor;
        dice.Number = number;
        dice.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new DiceDto(dice);
    }

    public async Task DeleteComponentAsync(Guid userId, Guid componentId)
    {
        var component = await _context.Components
            .Where(c => c.Id == componentId)
            .FirstOrDefaultAsync() ?? throw new KeyNotFoundException("Component not found");

        // Authorization check
        await _authService.EnsureCanDeleteResourcesAsync(userId, component.ProjectId);

        _context.Components.Remove(component);
        await _context.SaveChangesAsync();
    }

    public async Task<CardDto?> SaveCardDesignAsync(Guid userId, Guid componentId, string part, string? design)
    {
        return await SaveDesignAsync<Card, CardDto>(
            userId,
            componentId,
            part,
            design,
            card => new CardDto(card));
    }

    public async Task<ComponentDto?> UpdateDataSourceAsync(Guid userId, Guid componentId, Guid? dataSourceId)
    {
        var component = await _context.Components
            .Where(c => c.Id == componentId && c.Project.Users.Any(u => u.Id == userId))
            .FirstOrDefaultAsync();

        if (component is not IDataSourceComponent dataSourceComponent)
        {
            return null;
        }

        // Load the current DataSource if it exists
        await _context.Entry(component)
            .Reference(nameof(IDataSourceComponent.DataSource))
            .LoadAsync();

        if (!await TryUpdateComponentDataSourceAsync(userId, dataSourceComponent, dataSourceId))
        {
            return null;
        }

        return component.ToComponentDto();
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
        // Validate that either presetSize is set OR both custom dimensions are set
        if (!presetSize.HasValue && (!customWidthMm.HasValue || !customHeightMm.HasValue))
        {
            throw new ArgumentException("Either PresetSize must be set, or both CustomWidthMm and CustomHeightMm must be provided");
        }

        // Validate custom dimensions if provided
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

        var playerMat = new PlayerMat
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

        await CreateAndSaveComponentAsync(userId, projectId, playerMat);
        return new PlayerMatDto(playerMat);
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
        var playerMat = await FindAndAuthorizeComponentAsync<PlayerMat>(
            userId,
            componentId,
            ProjectAuthorizationService.CanModifyResources);

        if (playerMat == null)
        {
            return null;
        }

        // Validate that either presetSize is set OR both custom dimensions are set
        if (!presetSize.HasValue && (!customWidthMm.HasValue || !customHeightMm.HasValue))
        {
            throw new ArgumentException("Either PresetSize must be set, or both CustomWidthMm and CustomHeightMm must be provided");
        }

        // Validate custom dimensions if provided
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

        playerMat.Name = name;
        playerMat.PresetSize = presetSize;
        playerMat.Orientation = orientation;
        playerMat.CustomWidthMm = customWidthMm;
        playerMat.CustomHeightMm = customHeightMm;
        playerMat.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new PlayerMatDto(playerMat);
    }

    public async Task<PlayerMatDto?> SavePlayerMatDesignAsync(Guid userId, Guid componentId, string part, string? design)
    {
        return await SaveDesignAsync<PlayerMat, PlayerMatDto>(
            userId,
            componentId,
            part,
            design,
            playerMat => new PlayerMatDto(playerMat));
    }

    public async Task<ComponentDto?> SaveDesignAsync(Guid userId, Guid componentId, string part, string? design)
    {
        // Find the component and check if it implements IEditableComponent
        var component = await _context.Components
            .Where(c => c.Id == componentId && c.Project.Users.Any(u => u.Id == userId))
            .FirstOrDefaultAsync();

        if (component is not IEditableComponent editableComponent)
        {
            return null;
        }

        // Check user's role - Only users with modify permissions can save designs
        var role = await _authService.GetUserProjectRoleAsync(userId, component.ProjectId);
        if (role == null || !ProjectAuthorizationService.CanModifyResources(role.Value))
        {
            return null;
        }

        editableComponent.SetDesign(part, design);
        component.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Load DataSource if the component supports it
        if (component is IDataSourceComponent)
        {
            await _context.Entry(component)
                .Reference(nameof(IDataSourceComponent.DataSource))
                .LoadAsync();
        }

        return component.ToComponentDto();
    }

    private async Task<TDto?> SaveDesignAsync<TComponent, TDto>(
        Guid userId,
        Guid componentId,
        string part,
        string? design,
        Func<TComponent, TDto> toDtoFunc)
        where TComponent : Component, IEditableComponent
    {
        var component = await FindAndAuthorizeComponentAsync<TComponent>(
            userId,
            componentId,
            ProjectAuthorizationService.CanModifyResources);

        if (component == null)
        {
            return default;
        }

        component.SetDesign(part, design);

        await _context.SaveChangesAsync();

        return toDtoFunc(component);
    }

    private async Task<bool> TryUpdateComponentDataSourceAsync(Guid userId, [NotNullWhen(true)]IDataSourceComponent? component, Guid? dataSourceId)
    {
        if (component == null) return false;

        // Check user's role - Only Owner can update data source links
        var role = await _authService.GetUserProjectRoleAsync(userId, component.ProjectId);
        if (role == null || !ProjectAuthorizationService.CanManageDataSources(role.Value))
        {
            return false;
        }

        // If dataSourceId is provided, verify it exists and belongs to the same project
        if (dataSourceId.HasValue)
        {
            var dataSourceExists = await _context.DataSources
                .AnyAsync(ds => ds.Id == dataSourceId.Value && ds.ProjectId == component.ProjectId);

            if (!dataSourceExists)
            {
                throw new ArgumentException("Data source not found or does not belong to this project");
            }

            // Load the data source to ensure it's available in the response
            component.DataSource = await _context.DataSources.FindAsync(dataSourceId.Value);
        }
        else
        {
            // Remove the data source
            component.DataSource = null;
        }

        component.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return true;
    }

    private async Task<T> CreateAndSaveComponentAsync<T>(
        Guid userId,
        Guid projectId,
        T component) where T : Component
    {
        await _authService.EnsureCanModifyResourcesAsync(userId, projectId);

        _context.Set<T>().Add(component);
        await _context.SaveChangesAsync();

        return component;
    }

    private async Task<T?> FindAndAuthorizeComponentAsync<T>(
        Guid userId,
        Guid componentId,
        Func<ProjectRole, bool> authorizationCheck,
        Func<IQueryable<T>, IQueryable<T>>? includeFunc = null)
        where T : Component
    {
        var query = _context.Set<T>()
            .Where(c => c.Id == componentId && c.Project.Users.Any(u => u.Id == userId));

        if (includeFunc != null)
        {
            query = includeFunc(query);
        }

        var component = await query.FirstOrDefaultAsync();

        if (component == null)
        {
            return null;
        }

        // Check user's role with the provided authorization check
        var role = await _authService.GetUserProjectRoleAsync(userId, component.ProjectId);
        if (role == null || !authorizationCheck(role.Value))
        {
            return null;
        }

        return component;
    }
}
