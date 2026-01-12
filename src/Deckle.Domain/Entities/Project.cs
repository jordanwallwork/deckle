namespace Deckle.Domain.Entities;

public class Project
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public ICollection<User> Users { get; set; } = [];
    public ICollection<UserProject> UserProjects { get; set; } = [];
    public ICollection<DataSource> DataSources { get; set; } = [];
    public ICollection<Component> Components { get; set; } = [];
    public ICollection<File> Files { get; set; } = [];
}
