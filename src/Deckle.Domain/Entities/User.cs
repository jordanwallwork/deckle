namespace Deckle.Domain.Entities;

public class User
{
    public Guid Id { get; set; }

    public string? GoogleId { get; set; }

    public string Email { get; set; } = string.Empty;

    public string? Username { get; set; }

    public string? Name { get; set; }

    public string? GivenName { get; set; }

    public string? FamilyName { get; set; }

    public string? PictureUrl { get; set; }

    public string? Locale { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public DateTime? LastLoginAt { get; set; }

    // Storage quota tracking
    public int StorageQuotaMb { get; set; } = 50;
    public long StorageUsedBytes { get; set; } = 0;

    public ICollection<Project> Projects { get; set; } = [];
    public ICollection<UserProject> UserProjects { get; set; } = [];
    public ICollection<File> UploadedFiles { get; set; } = [];
}
