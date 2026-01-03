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

    public async Task<List<ComponentDto>> GetProjectComponentsAsync(Guid userId, Guid projectId)
    {
        if (!await _authService.HasProjectAccessAsync(userId, projectId))
        {
            return [];
        }

        var components = await _context.Components
            .Include(c => (c as Card)!.DataSource)
            .Where(c => c.ProjectId == projectId)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();

        return components.Select(c => c.ToComponentDto()).ToList();
    }

    public async Task<ComponentDto?> GetComponentByIdAsync(Guid userId, Guid componentId)
    {
        var component = await _context.Components
            .Include(c => (c as Card)!.DataSource)
            .Where(c => c.Id == componentId &&
                        c.Project.Users.Any(u => u.Id == userId))
            .FirstOrDefaultAsync();

        if (component == null)
        {
            return null;
        }

        return component.ToComponentDto();
    }

    public async Task<CardDto> CreateCardAsync(Guid userId, Guid projectId, string name, CardSize size)
    {
        await _authService.EnsureCanModifyResourcesAsync(userId, projectId);

        var card = new Card
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = name,
            Size = size,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Cards.Add(card);
        await _context.SaveChangesAsync();

        return new CardDto(card);
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

        _context.Dices.Add(dice);
        await _context.SaveChangesAsync();

        return new DiceDto(dice);
    }

    public async Task<CardDto?> UpdateCardAsync(Guid userId, Guid componentId, string name, CardSize size)
    {
        var card = await _context.Cards
            .Where(c => c.Id == componentId && c.Project.Users.Any(u => u.Id == userId))
            .FirstOrDefaultAsync();

        if (card == null)
        {
            return null;
        }

        // Check user's role - Viewers cannot update components
        var role = await _authService.GetUserProjectRoleAsync(userId, card.ProjectId);
        if (role == null || !ProjectAuthorizationService.CanModifyResources(role.Value))
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
        var dice = await _context.Dices
            .Where(d => d.Id == componentId && d.Project.Users.Any(u => u.Id == userId))
            .FirstOrDefaultAsync();

        if (dice == null)
        {
            return null;
        }

        // Check user's role - Viewers cannot update components
        var role = await _authService.GetUserProjectRoleAsync(userId, dice.ProjectId);
        if (role == null || !ProjectAuthorizationService.CanModifyResources(role.Value))
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

    public async Task<bool> DeleteComponentAsync(Guid userId, Guid componentId)
    {
        var component = await _context.Components
            .Where(c => c.Id == componentId && c.Project.Users.Any(u => u.Id == userId))
            .FirstOrDefaultAsync();

        if (component == null)
        {
            return false;
        }

        // Check user's role - Only Owners and Admins can delete components
        var role = await _authService.GetUserProjectRoleAsync(userId, component.ProjectId);
        if (role == null || !ProjectAuthorizationService.CanDeleteResources(role.Value))
        {
            return false;
        }

        _context.Components.Remove(component);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<CardDto?> SaveCardDesignAsync(Guid userId, Guid componentId, string part, string? design)
    {
        var card = await _context.Cards
            .Where(c => c.Id == componentId && c.Project.Users.Any(u => u.Id == userId))
            .FirstOrDefaultAsync();

        if (card == null)
        {
            return null;
        }

        // Check user's role - Viewers cannot save designs
        var role = await _authService.GetUserProjectRoleAsync(userId, card.ProjectId);
        if (role == null || !ProjectAuthorizationService.CanModifyResources(role.Value))
        {
            return null;
        }

        if (part.ToLower() == "front")
        {
            card.FrontDesign = design;
        }
        else if (part.ToLower() == "back")
        {
            card.BackDesign = design;
        }
        else
        {
            throw new ArgumentException($"Invalid part '{part}' for card. Must be 'front' or 'back'.");
        }

        card.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new CardDto(card);
    }

    public async Task<CardDto?> UpdateCardDataSourceAsync(Guid userId, Guid componentId, Guid? dataSourceId)
    {
        var card = await _context.Cards
            .Include(c => c.DataSource)
            .Where(c => c.Id == componentId && c.Project.Users.Any(u => u.Id == userId))
            .FirstOrDefaultAsync();

        if (card == null)
        {
            return null;
        }

        // Check user's role - Only Owners and Admins can update data source links
        var role = await _authService.GetUserProjectRoleAsync(userId, card.ProjectId);
        if (role == null || !ProjectAuthorizationService.CanManageDataSources(role.Value))
        {
            return null;
        }

        // If dataSourceId is provided, verify it exists and belongs to the same project
        if (dataSourceId.HasValue)
        {
            var dataSourceExists = await _context.DataSources
                .AnyAsync(ds => ds.Id == dataSourceId.Value && ds.ProjectId == card.ProjectId);

            if (!dataSourceExists)
            {
                throw new ArgumentException("Data source not found or does not belong to this project");
            }

            // Load the data source to ensure it's available in the response
            card.DataSource = await _context.DataSources.FindAsync(dataSourceId.Value);
        }
        else
        {
            // Remove the data source
            card.DataSource = null;
        }

        card.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new CardDto(card);
    }
}
