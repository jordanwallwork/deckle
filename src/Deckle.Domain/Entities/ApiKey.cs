namespace Deckle.Domain.Entities;

public class ApiKey
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public string KeyHash { get; set; } = string.Empty;
    public DateTime? LastUsedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
