using Deckle.API.DTOs;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deckle.API.Services;

public class AdminService
{
    private readonly AppDbContext _dbContext;
    private readonly ComponentService _componentService;

    public AdminService(AppDbContext dbContext, ComponentService componentService)
    {
        _dbContext = dbContext;
        _componentService = componentService;
    }

    public async Task<AdminUserListResponse> GetUsersAsync(int page = 1, int pageSize = 20, string? search = null)
    {
        var query = _dbContext.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(u =>
                u.Email.ToLower().Contains(searchLower) ||
                (u.Name != null && u.Name.ToLower().Contains(searchLower)));
        }

        var totalCount = await query.CountAsync();

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new AdminUserDto
            {
                Id = u.Id,
                Email = u.Email,
                Name = u.Name,
                PictureUrl = u.PictureUrl,
                Role = u.Role.ToString(),
                CreatedAt = u.CreatedAt,
                LastLoginAt = u.LastLoginAt,
                StorageQuotaMb = u.StorageQuotaMb,
                StorageUsedBytes = u.StorageUsedBytes,
                ProjectCount = u.UserProjects.Count(up => up.Role == ProjectRole.Owner)
            })
            .ToListAsync();

        return new AdminUserListResponse
        {
            Users = users,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<AdminUserDto?> GetUserByIdAsync(Guid userId)
    {
        return await _dbContext.Users
            .Where(u => u.Id == userId)
            .Select(u => new AdminUserDto
            {
                Id = u.Id,
                Email = u.Email,
                Name = u.Name,
                PictureUrl = u.PictureUrl,
                Role = u.Role.ToString(),
                CreatedAt = u.CreatedAt,
                LastLoginAt = u.LastLoginAt,
                StorageQuotaMb = u.StorageQuotaMb,
                StorageUsedBytes = u.StorageUsedBytes,
                ProjectCount = u.UserProjects.Count(up => up.Role == ProjectRole.Owner)
            })
            .FirstOrDefaultAsync();
    }

    public async Task<AdminUserDto?> UpdateUserRoleAsync(Guid userId, string role)
    {
        if (!Enum.TryParse<UserRole>(role, ignoreCase: true, out var userRole))
        {
            return null;
        }

        var user = await _dbContext.Users.FindAsync(userId);
        if (user == null)
        {
            return null;
        }

        user.Role = userRole;
        user.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();

        return await GetUserByIdAsync(userId);
    }

    public async Task<AdminUserDto?> UpdateUserQuotaAsync(Guid userId, int storageQuotaMb)
    {
        if (storageQuotaMb < 0)
        {
            return null;
        }

        var user = await _dbContext.Users.FindAsync(userId);
        if (user == null)
        {
            return null;
        }

        user.StorageQuotaMb = storageQuotaMb;
        user.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();

        return await GetUserByIdAsync(userId);
    }

    public Task<AdminSampleComponentListResponse> GetSampleComponentsAsync(
        int page = 1,
        int pageSize = 20,
        string? search = null,
        string? componentType = null)
        => _componentService.GetSampleComponentsAsync(page, pageSize, search, componentType);

    public Task<CardDto> CreateSampleCardAsync(string name, CardSize size, bool horizontal)
        => _componentService.CreateSampleCardAsync(name, size, horizontal);

    public Task<PlayerMatDto> CreateSamplePlayerMatAsync(
        string name,
        PlayerMatSize? presetSize,
        PlayerMatOrientation orientation,
        decimal? customWidthMm,
        decimal? customHeightMm)
        => _componentService.CreateSamplePlayerMatAsync(name, presetSize, orientation, customWidthMm, customHeightMm);

    public Task<ComponentDto?> GetSampleComponentByIdAsync(Guid componentId)
        => _componentService.GetSampleComponentByIdAsync(componentId);

    public Task<ComponentDto?> SaveSampleDesignAsync(Guid componentId, string part, string? design)
        => _componentService.SaveSampleDesignAsync(componentId, part, design);
}
