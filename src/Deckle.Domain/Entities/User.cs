namespace Deckle.Domain.Entities;

public class User
{
    public Guid Id { get; set; }

    public string GoogleId { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string? Name { get; set; }

    public string? GivenName { get; set; }

    public string? FamilyName { get; set; }

    public string? PictureUrl { get; set; }

    public string? Locale { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public DateTime? LastLoginAt { get; set; }
}
