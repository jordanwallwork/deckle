namespace Deckle.API.Services.Storage;

public static class StorageKeys
{
    /// <summary>
    /// Generate storage key for a file
    /// </summary>
    public static string Generate(Guid projectId, Guid fileId, string fileName)
    {
        return $"projects/{projectId}/files/{fileId}/{SanitizeFileName(fileName)}";
    }

    /// <summary>
    /// Sanitize filename to prevent path traversal and other issues
    /// </summary>
    public static string SanitizeFileName(string fileName)
    {
        // Remove potentially dangerous characters
        var invalid = Path.GetInvalidFileNameChars();
        var sanitized = string.Join("_", fileName.Split(invalid, StringSplitOptions.RemoveEmptyEntries));

        // Remove leading/trailing whitespace and dots
        sanitized = sanitized.Trim().Trim('.');

        // Ensure filename is not empty
        if (string.IsNullOrWhiteSpace(sanitized))
        {
            sanitized = "file";
        }

        return sanitized;
    }
}
