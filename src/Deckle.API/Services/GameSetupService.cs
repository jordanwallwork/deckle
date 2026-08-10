using System.Text.Json;
using Deckle.API.DTOs;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deckle.API.Services;

public interface IGameSetupService
{
    public Task<List<GameSetupSummaryDto>> GetProjectSetupsAsync(Guid userId, Guid projectId);
    public Task<GameSetupDto?> GetSetupByIdAsync(Guid userId, Guid projectId, Guid setupId);
    public Task<GameSetupDto> CreateSetupAsync(Guid userId, Guid projectId, string name, JsonElement document, bool isValid);
    public Task<GameSetupDto?> UpdateSetupAsync(Guid userId, Guid projectId, Guid setupId, string name, JsonElement document, bool isValid);
    public Task<bool> DeleteSetupAsync(Guid userId, Guid projectId, Guid setupId);
}

public class GameSetupService : IGameSetupService
{
    private readonly AppDbContext _context;
    private readonly IProjectAuthorizationService _authService;

    public GameSetupService(AppDbContext context, IProjectAuthorizationService authService)
    {
        _context = context;
        _authService = authService;
    }

    public async Task<List<GameSetupSummaryDto>> GetProjectSetupsAsync(Guid userId, Guid projectId)
    {
        await _authService.RequireProjectAccessAsync(userId, projectId);

        var setups = await _context.GameSetups
            .Where(gs => gs.ProjectId == projectId)
            .OrderBy(gs => gs.Name)
            .Select(gs => new GameSetupSummaryDto
            {
                Id = gs.Id,
                ProjectId = gs.ProjectId,
                Name = gs.Name,
                IsValid = gs.IsValid,
                CreatedAt = gs.CreatedAt,
                UpdatedAt = gs.UpdatedAt
            })
            .ToListAsync();

        return setups;
    }

    public async Task<GameSetupDto?> GetSetupByIdAsync(Guid userId, Guid projectId, Guid setupId)
    {
        await _authService.RequireProjectAccessAsync(userId, projectId);

        var setup = await FindSetupAsync(projectId, setupId);
        return setup == null ? null : GameSetupDto.FromEntity(setup);
    }

    public async Task<GameSetupDto> CreateSetupAsync(Guid userId, Guid projectId, string name, JsonElement document, bool isValid)
    {
        await _authService.EnsureCanModifyResourcesAsync(userId, projectId);

        var now = DateTime.UtcNow;
        var setup = new GameSetup
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = name,
            Document = ToRawJson(document),
            IsValid = isValid,
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.GameSetups.Add(setup);
        await _context.SaveChangesAsync();

        return GameSetupDto.FromEntity(setup);
    }

    public async Task<GameSetupDto?> UpdateSetupAsync(Guid userId, Guid projectId, Guid setupId, string name, JsonElement document, bool isValid)
    {
        await _authService.EnsureCanModifyResourcesAsync(userId, projectId);

        var setup = await FindSetupAsync(projectId, setupId);
        if (setup == null)
        {
            return null;
        }

        setup.Name = name;
        setup.Document = ToRawJson(document);
        setup.IsValid = isValid;
        setup.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return GameSetupDto.FromEntity(setup);
    }

    public async Task<bool> DeleteSetupAsync(Guid userId, Guid projectId, Guid setupId)
    {
        await _authService.EnsureCanDeleteResourcesAsync(userId, projectId);

        var setup = await FindSetupAsync(projectId, setupId);
        if (setup == null)
        {
            return false;
        }

        _context.GameSetups.Remove(setup);
        await _context.SaveChangesAsync();

        return true;
    }

    private async Task<GameSetup?> FindSetupAsync(Guid projectId, Guid setupId) =>
        await _context.GameSetups
            .FirstOrDefaultAsync(gs => gs.Id == setupId && gs.ProjectId == projectId);

    private static string ToRawJson(JsonElement element) => element.GetRawText();
}
