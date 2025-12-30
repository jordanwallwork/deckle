using Deckle.API.DTOs;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Deckle.API.Services;

public class UserService
{
    private readonly AppDbContext _dbContext;

    public UserService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<User> CreateOrUpdateUserAsync(GoogleUserInfo userInfo)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.GoogleId == userInfo.GoogleId);

        if (user == null)
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                GoogleId = userInfo.GoogleId,
                Email = userInfo.Email,
                Name = userInfo.Name,
                GivenName = userInfo.GivenName,
                FamilyName = userInfo.FamilyName,
                PictureUrl = userInfo.Picture,
                Locale = userInfo.Locale,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                LastLoginAt = DateTime.UtcNow
            };

            _dbContext.Users.Add(user);
        }
        else
        {
            user.Email = userInfo.Email;
            user.Name = userInfo.Name;
            user.GivenName = userInfo.GivenName;
            user.FamilyName = userInfo.FamilyName;
            user.PictureUrl = userInfo.Picture;
            user.Locale = userInfo.Locale;
            user.UpdatedAt = DateTime.UtcNow;
            user.LastLoginAt = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync();

        return user;
    }

    public static Guid? GetUserIdFromClaims(ClaimsPrincipal user)
    {
        if (!user.Identity?.IsAuthenticated ?? true)
        {
            return null;
        }

        var userIdString = user.FindFirst("user_id")?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return null;
        }

        return userId;
    }

    public static CurrentUserDto? GetCurrentUserFromClaims(ClaimsPrincipal user)
    {
        if (!user.Identity?.IsAuthenticated ?? true)
        {
            return null;
        }

        var userId = user.FindFirst("user_id")?.Value;
        var email = user.FindFirst(ClaimTypes.Email)?.Value;
        var name = user.FindFirst(ClaimTypes.Name)?.Value;
        var picture = user.FindFirst("picture")?.Value;

        return new CurrentUserDto
        {
            Id = userId,
            Email = email,
            Name = name,
            Picture = picture
        };
    }
}
