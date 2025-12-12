using Deckle.API.DTOs;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deckle.API.Services;

public class ComponentService
{
    private readonly AppDbContext _context;

    public ComponentService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ComponentDto>> GetProjectComponentsAsync(Guid userId, Guid projectId)
    {
        var hasAccess = await _context.UserProjects
            .AnyAsync(up => up.UserId == userId && up.ProjectId == projectId);

        if (!hasAccess)
        {
            return new List<ComponentDto>();
        }

        var components = await _context.Components
            .Where(c => c.ProjectId == projectId)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();

        return components.Select(c =>
        {
            if (c is Card card)
            {
                return new ComponentDto
                {
                    Id = card.Id,
                    ProjectId = card.ProjectId,
                    Name = card.Name,
                    Type = "Card",
                    CreatedAt = card.CreatedAt,
                    UpdatedAt = card.UpdatedAt,
                    CardSize = card.Size.ToString(),
                    FrontDesign = card.FrontDesign,
                    BackDesign = card.BackDesign
                };
            }
            else if (c is Dice dice)
            {
                return new ComponentDto
                {
                    Id = dice.Id,
                    ProjectId = dice.ProjectId,
                    Name = dice.Name,
                    Type = "Dice",
                    CreatedAt = dice.CreatedAt,
                    UpdatedAt = dice.UpdatedAt,
                    DiceType = dice.Type.ToString(),
                    DiceStyle = dice.Style.ToString(),
                    DiceBaseColor = dice.BaseColor.ToString(),
                    DiceNumber = dice.Number
                };
            }

            throw new InvalidOperationException($"Unknown component type: {c.GetType().Name}");
        }).ToList();
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

        if (component is Card card)
        {
            return new ComponentDto
            {
                Id = card.Id,
                ProjectId = card.ProjectId,
                Name = card.Name,
                Type = "Card",
                CreatedAt = card.CreatedAt,
                UpdatedAt = card.UpdatedAt,
                CardSize = card.Size.ToString(),
                FrontDesign = card.FrontDesign,
                BackDesign = card.BackDesign
            };
        }
        else if (component is Dice dice)
        {
            return new ComponentDto
            {
                Id = dice.Id,
                ProjectId = dice.ProjectId,
                Name = dice.Name,
                Type = "Dice",
                CreatedAt = dice.CreatedAt,
                UpdatedAt = dice.UpdatedAt,
                DiceType = dice.Type.ToString(),
                DiceStyle = dice.Style.ToString(),
                DiceBaseColor = dice.BaseColor.ToString(),
                DiceNumber = dice.Number
            };
        }

        return null;
    }

    public async Task<CardDto> CreateCardAsync(Guid userId, Guid projectId, string name, CardSize size)
    {
        var hasAccess = await _context.UserProjects
            .AnyAsync(up => up.UserId == userId && up.ProjectId == projectId);

        if (!hasAccess)
        {
            throw new UnauthorizedAccessException("User does not have access to this project");
        }

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

        return new CardDto
        {
            Id = card.Id,
            ProjectId = card.ProjectId,
            Name = card.Name,
            Size = card.Size.ToString(),
            FrontDesign = card.FrontDesign,
            BackDesign = card.BackDesign,
            CreatedAt = card.CreatedAt,
            UpdatedAt = card.UpdatedAt
        };
    }

    public async Task<DiceDto> CreateDiceAsync(Guid userId, Guid projectId, string name, DiceType type, DiceStyle style, DiceColor baseColor, int number)
    {
        var hasAccess = await _context.UserProjects
            .AnyAsync(up => up.UserId == userId && up.ProjectId == projectId);

        if (!hasAccess)
        {
            throw new UnauthorizedAccessException("User does not have access to this project");
        }

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

        return new DiceDto
        {
            Id = dice.Id,
            ProjectId = dice.ProjectId,
            Name = dice.Name,
            Type = dice.Type.ToString(),
            Style = dice.Style.ToString(),
            BaseColor = dice.BaseColor.ToString(),
            Number = dice.Number,
            CreatedAt = dice.CreatedAt,
            UpdatedAt = dice.UpdatedAt
        };
    }

    public async Task<CardDto?> UpdateCardAsync(Guid userId, Guid componentId, string name, CardSize size)
    {
        var card = await _context.Cards
            .Where(c => c.Id == componentId &&
                        c.Project.Users.Any(u => u.Id == userId))
            .FirstOrDefaultAsync();

        if (card == null)
        {
            return null;
        }

        card.Name = name;
        card.Size = size;
        card.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new CardDto
        {
            Id = card.Id,
            ProjectId = card.ProjectId,
            Name = card.Name,
            Size = card.Size.ToString(),
            FrontDesign = card.FrontDesign,
            BackDesign = card.BackDesign,
            CreatedAt = card.CreatedAt,
            UpdatedAt = card.UpdatedAt
        };
    }

    public async Task<DiceDto?> UpdateDiceAsync(Guid userId, Guid componentId, string name, DiceType type, DiceStyle style, DiceColor baseColor, int number)
    {
        var dice = await _context.Dices
            .Where(d => d.Id == componentId &&
                        d.Project.Users.Any(u => u.Id == userId))
            .FirstOrDefaultAsync();

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

        return new DiceDto
        {
            Id = dice.Id,
            ProjectId = dice.ProjectId,
            Name = dice.Name,
            Type = dice.Type.ToString(),
            Style = dice.Style.ToString(),
            BaseColor = dice.BaseColor.ToString(),
            Number = dice.Number,
            CreatedAt = dice.CreatedAt,
            UpdatedAt = dice.UpdatedAt
        };
    }

    public async Task<bool> DeleteComponentAsync(Guid userId, Guid componentId)
    {
        var component = await _context.Components
            .Where(c => c.Id == componentId &&
                        c.Project.Users.Any(u => u.Id == userId))
            .FirstOrDefaultAsync();

        if (component == null)
        {
            return false;
        }

        _context.Components.Remove(component);
        await _context.SaveChangesAsync();

        return true;
    }
}
