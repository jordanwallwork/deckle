namespace Deckle.Domain.Entities;

public enum FileStatus
{
    Pending,    // Upload URL generated but not confirmed
    Confirmed   // Upload completed and confirmed
}

public class File
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public Guid UploadedByUserId { get; set; }

    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string StorageKey { get; set; } = string.Empty; // "projects/{projectId}/files/{fileId}/{fileName}"
    public FileStatus Status { get; set; } = FileStatus.Pending;
    public List<string> Tags { get; set; } = [];

    public DateTime UploadedAt { get; set; }

    // Navigation properties
    public Project Project { get; set; } = null!;
    public User UploadedBy { get; set; } = null!;
}
