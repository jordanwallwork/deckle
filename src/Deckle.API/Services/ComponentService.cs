using Deckle.API.Models;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deckle.API.Services;

public class ComponentService
{
    private readonly AppDbContext _context;
    private readonly ConfigurationService _configurationService;

    public ComponentService(AppDbContext context, ConfigurationService configurationService)
    {
        _context = context;
        _configurationService = configurationService;
    }

    public async Task<List<ComponentResponse>> GetProjectComponentsAsync(Guid userId, Guid projectId)
    {
        var hasAccess = await _context.UserProjects
            .AnyAsync(up => up.UserId == userId && up.ProjectId == projectId);

        if (!hasAccess)
        {
            return [];
        }

        var components = await _context.Components
            .Where(c => c.ProjectId == projectId)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();

        var configOptions = _configurationService.GetComponentConfigurationOptions();

        return components.Select(c => MapComponentToResponse(c, configOptions)).ToList();
    }

    private static ComponentResponse MapComponentToResponse(Component component, ComponentConfigurationOptions configOptions)
    {
        return component switch
        {
            Card card => new CardResponse
            {
                Id = card.Id,
                Name = card.Name,
                Type = "Card",
                CreatedAt = card.CreatedAt,
                UpdatedAt = card.UpdatedAt,
                Size = card.Size.ToString(),
                SizeLabel = card.Size.GetName(),
                WidthMm = card.Size.GetWidthMm(),
                HeightMm = card.Size.GetHeightMm(),
                ConfigurationOptions = configOptions
            },
            Dice dice => new DiceResponse
            {
                Id = dice.Id,
                Name = dice.Name,
                Type = "Dice",
                CreatedAt = dice.CreatedAt,
                UpdatedAt = dice.UpdatedAt,
                DiceType = dice.Type.ToString(),
                DiceTypeLabel = dice.Type.GetName(),
                Style = dice.Style.ToString(),
                BaseColor = dice.BaseColor.ToString(),
                BaseColorLabel = dice.BaseColor.GetName(),
                BaseColorHex = dice.BaseColor.GetHexCode(),
                ColorblindFriendly = dice.BaseColor.IsColorblindFriendly(),
                WidthMm = dice.Type.GetWidthMm(),
                HeightMm = dice.Type.GetHeightMm(),
                DepthMm = dice.Type.GetDepthMm(),
                ConfigurationOptions = configOptions
            },
            _ => throw new InvalidOperationException($"Unknown component type: {component.GetType().Name}")
        };
    }

    public async Task<Component?> GetComponentByIdAsync(Guid userId, Guid componentId)
    {
        return await _context.Components
            .Where(c => c.Id == componentId &&
                        c.Project.Users.Any(u => u.Id == userId))
            .FirstOrDefaultAsync();
    }

    public async Task<Card> CreateCardAsync(Guid userId, Guid projectId, string name, CardSize size)
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

        return card;
    }

    public async Task<Dice> CreateDiceAsync(Guid userId, Guid projectId, string name, DiceType type, DiceStyle style, DiceColor baseColor)
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
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Dices.Add(dice);
        await _context.SaveChangesAsync();

        return dice;
    }
}
