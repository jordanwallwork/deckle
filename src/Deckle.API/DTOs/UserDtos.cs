using System.Text.Json.Serialization;

namespace Deckle.API.DTOs;

public record GoogleUserInfo(
    string GoogleId,
    string Email,
    string? Name,
    string? GivenName,
    string? FamilyName,
    string? Picture,
    string? Locale
);

public record ExternalLinkDto(
    [property: JsonPropertyName("label")] string Label,
    [property: JsonPropertyName("url")] string Url
);

public record CurrentUserDto
{
    public string? Id { get; init; }
    public string? Email { get; init; }
    public string? Username { get; init; }
    public string? Name { get; init; }
    public string? Picture { get; init; }
    public string? Role { get; init; }
    public string? Bio { get; init; }
    public List<ExternalLinkDto>? ExternalLinks { get; init; }
}

public record UpdateProfileRequest(
    string? Bio,
    List<ExternalLinkDto>? ExternalLinks
);

public record SetUsernameRequest(string Username);

public record RegisterRequest(string Email, string Password);

public record PasswordLoginRequest(string Email, string Password);

/// <summary>Returned by register when the account must confirm its email before signing in.</summary>
public record RegistrationPendingResponse(bool RequiresConfirmation);

/// <summary>Auth error with a machine-readable code (e.g. "email_not_confirmed", "account_disabled").</summary>
public record AuthErrorResponse(string Error, string Code);

public record ConfirmEmailRequest(string Token);

public record ResendConfirmationRequest(string Email);

public record UsernameAvailabilityResponse(bool Available, string? Error = null);

// Admin User Management DTOs
public record AdminUserDto
{
    public required Guid Id { get; init; }
    public required string Email { get; init; }
    public string? Username { get; init; }
    public string? Name { get; init; }
    public string? PictureUrl { get; init; }
    public required string Role { get; init; }
    public required DateTime CreatedAt { get; init; }
    public DateTime? LastLoginAt { get; init; }
    public required int StorageQuotaMb { get; init; }
    public required long StorageUsedBytes { get; init; }
    public required int ProjectCount { get; init; }
    public required bool EmailConfirmed { get; init; }
    public required bool IsDisabled { get; init; }
}

/// <summary>
/// Query-string filters for <c>GET /admin/users</c>. Date ranges are inclusive (UTC days).
/// <paramref name="Role"/> is <c>User</c> or <c>Administrator</c>; <paramref name="Status"/> is
/// <c>Active</c>, <c>Unconfirmed</c> or <c>Disabled</c>. Unrecognised values are ignored.
/// </summary>
public record AdminUserQuery(
    int Page = 1,
    int PageSize = 20,
    string? Search = null,
    DateOnly? CreatedFrom = null,
    DateOnly? CreatedTo = null,
    DateOnly? LastLoginFrom = null,
    DateOnly? LastLoginTo = null,
    string? Role = null,
    string? Status = null);

public record AdminApiKeyDto
{
    public required Guid Id { get; init; }
    public required string Name { get; init; }
    public required DateTime CreatedAt { get; init; }
    public DateTime? LastUsedAt { get; init; }
}

public record AdminUserProjectDto
{
    public required Guid Id { get; init; }
    public required string Name { get; init; }
    public required string Code { get; init; }
    public required string OwnerUsername { get; init; }
    public required string Visibility { get; init; }
    public required int ComponentCount { get; init; }
    public required DateTime CreatedAt { get; init; }
}

public record AdminUserDetailDto : AdminUserDto
{
    public DateTime? EmailConfirmedAt { get; init; }
    public DateTime? DisabledAt { get; init; }
    public required bool HasGoogleSignIn { get; init; }
    public required bool HasPassword { get; init; }
    public required List<AdminApiKeyDto> ApiKeys { get; init; }
    public required List<AdminUserProjectDto> Projects { get; init; }
}

public record AdminUserListResponse
{
    public required List<AdminUserDto> Users { get; init; }
    public required int TotalCount { get; init; }
    public required int Page { get; init; }
    public required int PageSize { get; init; }
}

// Public profile DTOs
public record PublicProjectSummaryDto
{
    public required string Name { get; init; }
    public required string Code { get; init; }
    public string? Description { get; init; }
    public required string Visibility { get; init; }
    public required string OwnerUsername { get; init; }
}

public record PublicUserProfileDto
{
    public required string Username { get; init; }
    public string? Name { get; init; }
    public string? Bio { get; init; }
    public string? Picture { get; init; }
    public List<ExternalLinkDto>? ExternalLinks { get; init; }
    public required List<PublicProjectSummaryDto> Projects { get; init; }
}

public record UpdateUserRoleRequest(string Role);

public record UpdateUserQuotaRequest(int StorageQuotaMb);

public record UpdateUserNameRequest(string? Name);

public record UpdateUserDisabledRequest(bool Disabled);

// Admin Sample Component DTOs
public record AdminSampleComponentDto
{
    public required Guid Id { get; init; }
    public required string Type { get; init; }
    public required string Name { get; init; }
    public required DateTime CreatedAt { get; init; }
    public required DateTime UpdatedAt { get; init; }
    /// <summary>
    /// Component-specific stats displayed as key-value pairs.
    /// Examples: Card has "Size", "Horizontal"; Dice has "DiceType", "Style", "Color", "Number"
    /// </summary>
    public required Dictionary<string, string> Stats { get; init; }
    public DataSourceInfo? DataSource { get; init; }
}

public record AdminSampleComponentListResponse
{
    public required List<AdminSampleComponentDto> Components { get; init; }
    public required int TotalCount { get; init; }
    public required int Page { get; init; }
    public required int PageSize { get; init; }
}
