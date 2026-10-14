using System.Linq.Expressions;
using Deckle.API.Auth;
using Deckle.API.DTOs;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deckle.API.Services;

public interface IAdminService
{
    public Task<AdminUserListResponse> GetUsersAsync(AdminUserQuery query);
    public Task<AdminUserDto?> GetUserByIdAsync(Guid userId);
    public Task<AdminUserDetailDto?> GetUserDetailAsync(Guid userId);
    public Task<AdminActionResult> UpdateUserRoleAsync(Guid actingAdminId, Guid userId, string role);
    public Task<AdminUserDto?> UpdateUserQuotaAsync(Guid userId, int storageQuotaMb);
    public Task<AdminActionResult> UpdateUserNameAsync(Guid userId, string? name);
    public Task<AdminActionResult> ResendConfirmationAsync(Guid userId);
    public Task<AdminActionResult> ConfirmEmailAsync(Guid userId);
    public Task<AdminActionResult> SetUserDisabledAsync(Guid actingAdminId, Guid userId, bool disabled);
    public Task<bool> RevokeApiKeyAsync(Guid userId, Guid keyId);
}

public class AdminService : IAdminService
{
    public const int MaxNameLength = 100;
    public const int DefaultPageSize = 20;
    public const int MaxPageSize = 100;

    private readonly AppDbContext _dbContext;
    private readonly IEmailConfirmationService _emailConfirmationService;
    private readonly IUserSessionCache _sessionCache;

    public AdminService(
        AppDbContext dbContext,
        IEmailConfirmationService emailConfirmationService,
        IUserSessionCache sessionCache)
    {
        _dbContext = dbContext;
        _emailConfirmationService = emailConfirmationService;
        _sessionCache = sessionCache;
    }

    private static readonly Expression<Func<User, AdminUserDto>> ToAdminUserDto = u => new AdminUserDto
    {
        Id = u.Id,
        Email = u.Email,
        Username = u.Username,
        Name = u.Name,
        PictureUrl = u.PictureUrl,
        Role = u.Role.ToString(),
        CreatedAt = u.CreatedAt,
        LastLoginAt = u.LastLoginAt,
        StorageQuotaMb = u.StorageQuotaMb,
        StorageUsedBytes = u.StorageUsedBytes,
        ProjectCount = u.UserProjects.Count(up => up.Role == ProjectRole.Owner),
        EmailConfirmed = u.EmailConfirmedAt != null,
        IsDisabled = u.DisabledAt != null
    };

    public async Task<AdminUserListResponse> GetUsersAsync(AdminUserQuery query)
    {
        var page = query.Page < 1 ? 1 : query.Page;
        var pageSize = query.PageSize is < 1 or > MaxPageSize ? DefaultPageSize : query.PageSize;

        var users = ApplyFilters(_dbContext.Users.AsQueryable(), query);

        var totalCount = await users.CountAsync();

        var results = await users
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(ToAdminUserDto)
            .ToListAsync();

        return new AdminUserListResponse
        {
            Users = results,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    private static IQueryable<User> ApplyFilters(IQueryable<User> users, AdminUserQuery query)
    {
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLower(System.Globalization.CultureInfo.InvariantCulture);
#pragma warning disable CA1304 // ToLower() in EF expression tree is translated to SQL LOWER()
            users = users.Where(u =>
                u.Email.ToLower().Contains(term) ||
                (u.Name != null && u.Name.ToLower().Contains(term)));
#pragma warning restore CA1304
        }

        if (query.CreatedFrom is { } createdFrom)
        {
            var from = StartOfDayUtc(createdFrom);
            users = users.Where(u => u.CreatedAt >= from);
        }

        if (query.CreatedTo is { } createdTo)
        {
            var toExclusive = StartOfDayUtc(createdTo.AddDays(1));
            users = users.Where(u => u.CreatedAt < toExclusive);
        }

        // Users who have never logged in have a null LastLoginAt and fail these comparisons,
        // so they are excluded whenever a last-login bound is set.
        if (query.LastLoginFrom is { } lastLoginFrom)
        {
            var from = StartOfDayUtc(lastLoginFrom);
            users = users.Where(u => u.LastLoginAt != null && u.LastLoginAt >= from);
        }

        if (query.LastLoginTo is { } lastLoginTo)
        {
            var toExclusive = StartOfDayUtc(lastLoginTo.AddDays(1));
            users = users.Where(u => u.LastLoginAt != null && u.LastLoginAt < toExclusive);
        }

        if (TryParseRole(query.Role, out var role))
        {
            users = users.Where(u => u.Role == role);
        }

        // Statuses are mutually exclusive: Disabled wins over Unconfirmed.
        switch (query.Status?.Trim().ToUpperInvariant())
        {
            case "ACTIVE":
                users = users.Where(u => u.EmailConfirmedAt != null && u.DisabledAt == null);
                break;
            case "UNCONFIRMED":
                users = users.Where(u => u.EmailConfirmedAt == null && u.DisabledAt == null);
                break;
            case "DISABLED":
                users = users.Where(u => u.DisabledAt != null);
                break;
        }

        return users;
    }

    /// <summary>Npgsql requires UTC-kinded DateTimes when comparing against timestamptz columns.</summary>
    private static DateTime StartOfDayUtc(DateOnly date) =>
        date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

    private static bool TryParseRole(string? value, out UserRole role)
    {
        role = default;
        return !string.IsNullOrWhiteSpace(value)
            && Enum.TryParse(value.Trim(), ignoreCase: true, out role)
            && Enum.IsDefined(role)
            && !int.TryParse(value, System.Globalization.CultureInfo.InvariantCulture, out _);
    }

    public async Task<AdminUserDto?> GetUserByIdAsync(Guid userId)
    {
        return await _dbContext.Users
            .Where(u => u.Id == userId)
            .Select(ToAdminUserDto)
            .FirstOrDefaultAsync();
    }

    public async Task<AdminUserDetailDto?> GetUserDetailAsync(Guid userId)
    {
        return await _dbContext.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new AdminUserDetailDto
            {
                Id = u.Id,
                Email = u.Email,
                Username = u.Username,
                Name = u.Name,
                PictureUrl = u.PictureUrl,
                Role = u.Role.ToString(),
                CreatedAt = u.CreatedAt,
                LastLoginAt = u.LastLoginAt,
                StorageQuotaMb = u.StorageQuotaMb,
                StorageUsedBytes = u.StorageUsedBytes,
                ProjectCount = u.UserProjects.Count(up => up.Role == ProjectRole.Owner),
                EmailConfirmed = u.EmailConfirmedAt != null,
                IsDisabled = u.DisabledAt != null,
                EmailConfirmedAt = u.EmailConfirmedAt,
                DisabledAt = u.DisabledAt,
                HasGoogleSignIn = u.GoogleId != null,
                HasPassword = u.PasswordHash != null,
                ApiKeys = u.ApiKeys
                    .OrderByDescending(k => k.CreatedAt)
                    .Select(k => new AdminApiKeyDto
                    {
                        Id = k.Id,
                        Name = k.Name,
                        CreatedAt = k.CreatedAt,
                        LastUsedAt = k.LastUsedAt
                    })
                    .ToList(),
                Projects = u.UserProjects
                    .Where(up => up.Role == ProjectRole.Owner)
                    .OrderByDescending(up => up.Project.CreatedAt)
                    .Select(up => new AdminUserProjectDto
                    {
                        Id = up.Project.Id,
                        Name = up.Project.Name,
                        Code = up.Project.Code,
                        OwnerUsername = u.Username ?? "",
                        Visibility = up.Project.Visibility.ToString(),
                        ComponentCount = up.Project.Components.Count,
                        CreatedAt = up.Project.CreatedAt
                    })
                    .ToList()
            })
            .FirstOrDefaultAsync();
    }

    public async Task<AdminActionResult> UpdateUserRoleAsync(Guid actingAdminId, Guid userId, string role)
    {
        if (!TryParseRole(role, out var userRole))
        {
            return AdminActionResult.Invalid("Invalid role");
        }

        if (userId == actingAdminId)
        {
            return AdminActionResult.Invalid("You cannot change your own role");
        }

        var user = await _dbContext.Users.FindAsync(userId);
        if (user == null)
        {
            return AdminActionResult.NotFound();
        }

        user.Role = userRole;
        user.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();
        _sessionCache.Invalidate(userId);

        return await SuccessAsync(userId);
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

    public async Task<AdminActionResult> UpdateUserNameAsync(Guid userId, string? name)
    {
        var trimmed = string.IsNullOrWhiteSpace(name) ? null : name.Trim();
        if (trimmed is { Length: > MaxNameLength })
        {
            return AdminActionResult.Invalid($"Name must be {MaxNameLength} characters or fewer");
        }

        var user = await _dbContext.Users.FindAsync(userId);
        if (user == null)
        {
            return AdminActionResult.NotFound();
        }

        user.Name = trimmed;
        user.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();

        return await SuccessAsync(userId);
    }

    public async Task<AdminActionResult> ResendConfirmationAsync(Guid userId)
    {
        var user = await _dbContext.Users.FindAsync(userId);
        if (user == null)
        {
            return AdminActionResult.NotFound();
        }

        if (user.EmailConfirmedAt != null)
        {
            return AdminActionResult.Invalid("Email address is already confirmed");
        }

        if (user.PasswordHash == null)
        {
            return AdminActionResult.Invalid("User has no password sign-in, so there is no confirmation email to send");
        }

        await _emailConfirmationService.SendAsync(user);

        return await SuccessAsync(userId);
    }

    public async Task<AdminActionResult> ConfirmEmailAsync(Guid userId)
    {
        var user = await _dbContext.Users.FindAsync(userId);
        if (user == null)
        {
            return AdminActionResult.NotFound();
        }

        var now = DateTime.UtcNow;
        user.EmailConfirmedAt ??= now;
        user.EmailConfirmationTokenHash = null;
        user.EmailConfirmationTokenExpiresAt = null;
        user.UpdatedAt = now;
        await _dbContext.SaveChangesAsync();

        return await SuccessAsync(userId);
    }

    public async Task<AdminActionResult> SetUserDisabledAsync(Guid actingAdminId, Guid userId, bool disabled)
    {
        if (userId == actingAdminId)
        {
            return AdminActionResult.Invalid("You cannot disable your own account");
        }

        var user = await _dbContext.Users.FindAsync(userId);
        if (user == null)
        {
            return AdminActionResult.NotFound();
        }

        var now = DateTime.UtcNow;
        user.DisabledAt = disabled ? user.DisabledAt ?? now : null;
        user.UpdatedAt = now;
        await _dbContext.SaveChangesAsync();
        _sessionCache.Invalidate(userId);

        return await SuccessAsync(userId);
    }

    public async Task<bool> RevokeApiKeyAsync(Guid userId, Guid keyId)
    {
        var apiKey = await _dbContext.ApiKeys
            .FirstOrDefaultAsync(k => k.Id == keyId && k.UserId == userId);
        if (apiKey == null)
        {
            return false;
        }

        _dbContext.ApiKeys.Remove(apiKey);
        await _dbContext.SaveChangesAsync();
        return true;
    }

    private async Task<AdminActionResult> SuccessAsync(Guid userId)
    {
        var detail = await GetUserDetailAsync(userId);
        return detail == null ? AdminActionResult.NotFound() : AdminActionResult.Ok(detail);
    }
}
