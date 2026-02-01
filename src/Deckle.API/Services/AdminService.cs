using Deckle.API.DTOs;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace Deckle.API.Services;

public class AdminService
{
    private readonly AppDbContext _dbContext;

    public AdminService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
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

    public async Task<AdminSampleComponentListResponse> GetSampleComponentsAsync(
        int page = 1,
        int pageSize = 20,
        string? search = null,
        string? componentType = null)
    {
        // Sample components are those with ProjectId = null and implement IEditableComponent
        var query = _dbContext.Components
            .Where(c => c.ProjectId == null)
            .AsQueryable();

        // Filter by component type if specified
        if (!string.IsNullOrWhiteSpace(componentType))
        {
            query = componentType.ToLower() switch
            {
                "card" => query.Where(c => c is Card),
                "playermat" => query.Where(c => c is PlayerMat),
                _ => query
            };
        }

        // Search by name
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

    private static string GetComponentTypeName(Component component) => component switch
    {
        Card => "Card",
        Dice => "Dice",
        PlayerMat => "PlayerMat",
        _ => component.GetType().Name
    };

    private static Dictionary<string, string> GetComponentStats(Component component) => component switch
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
            ["Dimensions"] = mat.PresetSize.HasValue
                ? ""
                : $"{mat.CustomWidthMm}×{mat.CustomHeightMm}mm"
        },
        _ => new Dictionary<string, string>()
    };

    private static string FormatEnumName(string enumValue)
    {
        // Insert spaces before capital letters: "MiniAmerican" -> "Mini American"
        return string.Concat(enumValue.Select((c, i) =>
            i > 0 && char.IsUpper(c) ? " " + c : c.ToString()));
    }
}
