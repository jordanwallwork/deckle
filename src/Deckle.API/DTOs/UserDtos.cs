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

public record CurrentUserDto
{
    public string? Id { get; init; }
    public string? Email { get; init; }
    public string? Username { get; init; }
    public string? Name { get; init; }
    public string? Picture { get; init; }
    public string? Role { get; init; }
}

public record SetUsernameRequest(string Username);

public record UsernameAvailabilityResponse(bool Available, string? Error = null);

// Admin User Management DTOs
public record AdminUserDto
{
    public required Guid Id { get; init; }
    public required string Email { get; init; }
    public string? Name { get; init; }
    public string? PictureUrl { get; init; }
    public required string Role { get; init; }
    public required DateTime CreatedAt { get; init; }
    public DateTime? LastLoginAt { get; init; }
    public required int StorageQuotaMb { get; init; }
    public required long StorageUsedBytes { get; init; }
    public required int ProjectCount { get; init; }
}

public record AdminUserListResponse
{
    public required List<AdminUserDto> Users { get; init; }
    public required int TotalCount { get; init; }
    public required int Page { get; init; }
    public required int PageSize { get; init; }
}

public record UpdateUserRoleRequest(string Role);

public record UpdateUserQuotaRequest(int StorageQuotaMb);

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
