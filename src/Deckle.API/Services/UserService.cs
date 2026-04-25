using Deckle.API.DTOs;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;

namespace Deckle.API.Services;

public interface IUserService
{
    public Task<User> CreateOrUpdateUserAsync(GoogleUserInfo userInfo);
    public Task<(bool Success, string? Error, User? User)> RegisterWithPasswordAsync(string email, string password);
    public Task<(bool Success, string? Error, User? User)> LoginWithPasswordAsync(string email, string password);
    public Task<bool> IsUsernameAvailableAsync(string username, Guid? excludeUserId = null);
    public Task<(bool Success, string? Error, bool IsNewRegistration)> SetUsernameAsync(Guid userId, string username);
    public Task<User?> GetUserByIdAsync(Guid userId);
    public Task<(bool Success, string? Error)> UpdateProfileAsync(Guid userId, UpdateProfileRequest request);
}

public class UserService : IUserService
{
    private readonly AppDbContext _dbContext;
    private readonly IPasswordHasher<User> _passwordHasher;

    public UserService(AppDbContext dbContext, IPasswordHasher<User> passwordHasher)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
    }

    public async Task<User> CreateOrUpdateUserAsync(GoogleUserInfo userInfo)
    {
        // First, try to find user by GoogleId
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.GoogleId == userInfo.GoogleId);

        if (user == null)
        {
            // If not found by GoogleId, check if user exists by email with null GoogleId (invited user)
            var lowerEmail = userInfo.Email.ToLower(System.Globalization.CultureInfo.InvariantCulture);
#pragma warning disable CA1304 // ToLower() in EF expression tree is translated to SQL LOWER()
            user = await _dbContext.Users.FirstOrDefaultAsync(u =>
                u.Email.ToLower() == lowerEmail && u.GoogleId == null);
#pragma warning restore CA1304

            if (user != null)
            {
                // User was invited but hasn't signed in yet - merge the account
                user.GoogleId = userInfo.GoogleId;
                user.Name = userInfo.Name;
                user.GivenName = userInfo.GivenName;
                user.FamilyName = userInfo.FamilyName;
                user.PictureUrl = userInfo.Picture;
                user.Locale = userInfo.Locale;
                user.UpdatedAt = DateTime.UtcNow;
                user.LastLoginAt = DateTime.UtcNow;
            }
            else
            {
                // User doesn't exist at all - create new user
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
        }
        else
        {
            // User exists with this GoogleId - update profile
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

    public async Task<(bool Success, string? Error, User? User)> RegisterWithPasswordAsync(string email, string password)
    {
        if (string.IsNullOrWhiteSpace(email) || !IsValidEmail(email))
        {
            return (false, "A valid email address is required", null);
        }

        if (string.IsNullOrWhiteSpace(password) || password.Length < 8)
        {
            return (false, "Password must be at least 8 characters", null);
        }

        var normalizedEmail = email.Trim().ToLower(System.Globalization.CultureInfo.InvariantCulture);

#pragma warning disable CA1304
        var existing = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);
#pragma warning restore CA1304

        if (existing != null)
        {
            return (false, "An account with this email already exists", null);
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            LastLoginAt = DateTime.UtcNow
        };

        user.PasswordHash = _passwordHasher.HashPassword(user, password);

        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        return (true, null, user);
    }

    public async Task<(bool Success, string? Error, User? User)> LoginWithPasswordAsync(string email, string password)
    {
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            return (false, "Invalid email or password", null);
        }

        var normalizedEmail = email.Trim().ToLower(System.Globalization.CultureInfo.InvariantCulture);

#pragma warning disable CA1304
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);
#pragma warning restore CA1304

        if (user == null || user.PasswordHash == null)
        {
            return (false, "Invalid email or password", null);
        }

        var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password);

        if (result == PasswordVerificationResult.Failed)
        {
            return (false, "Invalid email or password", null);
        }

        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = _passwordHasher.HashPassword(user, password);
        }

        user.LastLoginAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();

        return (true, null, user);
    }

    private static bool IsValidEmail(string email)
    {
        try
        {
            var addr = new System.Net.Mail.MailAddress(email);
            return addr.Address == email.Trim();
        }
        catch
        {
            return false;
        }
    }

    public static ClaimsPrincipal CreatePrincipalFromUser(User user)
    {
        var claims = new List<Claim>
        {
            new Claim("user_id", user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role.ToString())
        };

        if (!string.IsNullOrEmpty(user.Name))
            claims.Add(new Claim(ClaimTypes.Name, user.Name));

        if (!string.IsNullOrEmpty(user.PictureUrl))
            claims.Add(new Claim("picture", user.PictureUrl));

        if (!string.IsNullOrEmpty(user.Username))
            claims.Add(new Claim("username", user.Username));

        var identity = new ClaimsIdentity(claims, Microsoft.AspNetCore.Authentication.Cookies.CookieAuthenticationDefaults.AuthenticationScheme);
        return new ClaimsPrincipal(identity);
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
        var username = user.FindFirst("username")?.Value;
        var name = user.FindFirst(ClaimTypes.Name)?.Value;
        var picture = user.FindFirst("picture")?.Value;
        var role = user.FindFirst(ClaimTypes.Role)?.Value;

        return new CurrentUserDto
        {
            Id = userId,
            Email = email,
            Username = username,
            Name = name,
            Picture = picture,
            Role = role
        };
    }

    public async Task<bool> IsUsernameAvailableAsync(string username, Guid? excludeUserId = null)
    {
        var normalizedUsername = username.ToLower(System.Globalization.CultureInfo.InvariantCulture);

#pragma warning disable CA1304 // ToLower() in EF expression tree is translated to SQL LOWER()
        var query = _dbContext.Users.Where(u => u.Username != null && u.Username.ToLower() == normalizedUsername);
#pragma warning restore CA1304

        if (excludeUserId.HasValue)
        {
            query = query.Where(u => u.Id != excludeUserId.Value);
        }

        return !await query.AnyAsync();
    }

    public async Task<(bool Success, string? Error, bool IsNewRegistration)> SetUsernameAsync(Guid userId, string username)
    {
        // Validate username format
        if (string.IsNullOrWhiteSpace(username))
        {
            return (false, "Username cannot be empty", false);
        }

        username = username.Trim();

        if (username.Length < 3)
        {
            return (false, "Username must be at least 3 characters", false);
        }

        if (username.Length > 30)
        {
            return (false, "Username must be 30 characters or less", false);
        }

        // Only allow alphanumeric characters and underscores
        if (!System.Text.RegularExpressions.Regex.IsMatch(username, @"^[a-zA-Z0-9_]+$"))
        {
            return (false, "Username can only contain letters, numbers, and underscores", false);
        }

        // Check availability
        if (!await IsUsernameAvailableAsync(username, userId))
        {
            return (false, "Username is already taken", false);
        }

        var user = await _dbContext.Users.FindAsync(userId);
        if (user == null)
        {
            return (false, "User not found", false);
        }

        var isNewRegistration = user.Username == null;

        user.Username = username;
        user.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();

        return (true, null, isNewRegistration);
    }

    public async Task<User?> GetUserByIdAsync(Guid userId)
    {
        return await _dbContext.Users.FindAsync(userId);
    }

    private const int MaxBioLength = 1000;
    private const int MaxExternalLinks = 8;
    private const int MaxExternalLinkLabelLength = 50;
    private const int MaxExternalLinkUrlLength = 500;

    public async Task<(bool Success, string? Error)> UpdateProfileAsync(Guid userId, UpdateProfileRequest request)
    {
        var user = await _dbContext.Users.FindAsync(userId);
        if (user == null)
        {
            return (false, "User not found");
        }

        if (request.Bio != null && request.Bio.Length > MaxBioLength)
        {
            return (false, $"Bio must be {MaxBioLength} characters or less");
        }

        if (request.ExternalLinks != null)
        {
            if (request.ExternalLinks.Count > MaxExternalLinks)
            {
                return (false, $"You can add at most {MaxExternalLinks} external links");
            }

            foreach (var link in request.ExternalLinks)
            {
                if (string.IsNullOrWhiteSpace(link.Label))
                {
                    return (false, "Each external link must have a label");
                }
                if (link.Label.Length > MaxExternalLinkLabelLength)
                {
                    return (false, $"Link label must be {MaxExternalLinkLabelLength} characters or less");
                }
                if (string.IsNullOrWhiteSpace(link.Url))
                {
                    return (false, "Each external link must have a URL");
                }
                if (link.Url.Length > MaxExternalLinkUrlLength)
                {
                    return (false, $"Link URL must be {MaxExternalLinkUrlLength} characters or less");
                }
                if (!Uri.TryCreate(link.Url, UriKind.Absolute, out var uri) ||
                    (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp))
                {
                    return (false, $"'{link.Label}' must be a valid HTTP or HTTPS URL");
                }
            }
        }

        user.Bio = string.IsNullOrWhiteSpace(request.Bio) ? null : request.Bio.Trim();
        user.ExternalLinks = request.ExternalLinks is { Count: > 0 }
            ? JsonSerializer.Serialize(request.ExternalLinks)
            : null;
        user.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();
        return (true, null);
    }
}
