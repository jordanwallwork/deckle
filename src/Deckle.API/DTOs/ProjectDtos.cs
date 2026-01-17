namespace Deckle.API.DTOs;

public record ProjectDto
{
    public required Guid Id { get; init; }
    public required string Name { get; init; }
    public string? Description { get; init; }
    public required DateTime CreatedAt { get; init; }
    public required DateTime UpdatedAt { get; init; }
    public required string Role { get; init; }
}

public record CreateProjectRequest(string Name, string? Description);

public record UpdateProjectRequest(string Name, string? Description);

public record InviteUserRequest(string Email, string Role);

public record ProjectUserDto
{
    public required Guid UserId { get; init; }
    public required string Email { get; init; }
    public string? Name { get; init; }
    public string? PictureUrl { get; init; }
    public required string Role { get; init; }
    public required DateTime JoinedAt { get; init; }
    public required bool IsPending { get; init; }
}
