using System.Text.RegularExpressions;

namespace Deckle.API.Services;

/// <summary>
/// Utility class for validating and sanitizing file and directory names.
/// Allows only alphanumeric characters, spaces, underscores, and hyphens.
/// </summary>
public static partial class NameSanitizer
{
    // Pattern for allowed characters: alphanumeric, spaces, underscores, hyphens, and periods (for file extensions)
    [GeneratedRegex(@"^[a-zA-Z0-9 _\-\.]+$", RegexOptions.Compiled)]
    private static partial Regex AllowedNamePattern();

    // Pattern for allowed characters in directory names (no periods needed)
    [GeneratedRegex(@"^[a-zA-Z0-9 _\-]+$", RegexOptions.Compiled)]
    private static partial Regex AllowedDirectoryNamePattern();

    // Pattern for characters to replace (anything not alphanumeric, space, underscore, hyphen, or period)
    [GeneratedRegex(@"[^a-zA-Z0-9 _\-\.]", RegexOptions.Compiled)]
    private static partial Regex InvalidFileNameCharsPattern();

    // Pattern for characters to replace in directory names
    [GeneratedRegex(@"[^a-zA-Z0-9 _\-]", RegexOptions.Compiled)]
    private static partial Regex InvalidDirectoryNameCharsPattern();

    /// <summary>
    /// Sanitizes a file name by replacing invalid characters with underscores.
    /// Preserves file extension. Allowed characters: alphanumeric, spaces, underscores, hyphens.
    /// </summary>
    /// <param name="fileName">The original file name</param>
    /// <returns>The sanitized file name</returns>
    public static string SanitizeFileName(string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName))
            return "file";

        // Separate extension from name
        var extension = Path.GetExtension(fileName);
        var nameWithoutExtension = Path.GetFileNameWithoutExtension(fileName);

        // Replace invalid characters in the name part
        var sanitizedName = InvalidFileNameCharsPattern().Replace(nameWithoutExtension, "_");

        // Trim leading/trailing whitespace and underscores
        sanitizedName = sanitizedName.Trim().Trim('_');

        // If the name is empty after sanitization, use a default
        if (string.IsNullOrWhiteSpace(sanitizedName))
            sanitizedName = "file";

        // Sanitize extension (remove any invalid chars except the period)
        if (!string.IsNullOrEmpty(extension))
        {
            // Extension includes the dot, so we sanitize the part after the dot
            var extWithoutDot = extension.TrimStart('.');
            var sanitizedExt = InvalidDirectoryNameCharsPattern().Replace(extWithoutDot, "_").Trim('_');
            extension = string.IsNullOrEmpty(sanitizedExt) ? "" : "." + sanitizedExt;
        }

        return sanitizedName + extension;
    }

    /// <summary>
    /// Validates whether a file name contains only allowed characters.
    /// Allowed characters: alphanumeric, spaces, underscores, hyphens, and periods.
    /// </summary>
    /// <param name="fileName">The file name to validate</param>
    /// <returns>True if valid, false otherwise</returns>
    public static bool IsValidFileName(string fileName)
        => !string.IsNullOrWhiteSpace(fileName) && AllowedNamePattern().IsMatch(fileName);

    /// <summary>
    /// Sanitizes a directory name by replacing invalid characters with underscores.
    /// Allowed characters: alphanumeric, spaces, underscores, hyphens.
    /// </summary>
    /// <param name="directoryName">The original directory name</param>
    /// <returns>The sanitized directory name</returns>
    public static string SanitizeDirectoryName(string directoryName)
    {
        if (string.IsNullOrWhiteSpace(directoryName))
            return "folder";

        // Replace invalid characters
        var sanitized = InvalidDirectoryNameCharsPattern().Replace(directoryName, "_");

        // Trim leading/trailing whitespace and underscores
        sanitized = sanitized.Trim().Trim('_');

        // If the name is empty after sanitization, use a default
        if (string.IsNullOrWhiteSpace(sanitized))
            sanitized = "folder";

        return sanitized;
    }

    /// <summary>
    /// Validates whether a directory name contains only allowed characters.
    /// Allowed characters: alphanumeric, spaces, underscores, hyphens.
    /// </summary>
    /// <param name="directoryName">The directory name to validate</param>
    /// <returns>True if valid, false otherwise</returns>
    public static bool IsValidDirectoryName(string directoryName)
        => !string.IsNullOrWhiteSpace(directoryName) && AllowedDirectoryNamePattern().IsMatch(directoryName);

    /// <summary>
    /// Validates a directory name and throws an ArgumentException if invalid.
    /// </summary>
    /// <param name="directoryName">The directory name to validate</param>
    /// <exception cref="ArgumentException">Thrown when the name contains invalid characters</exception>
    public static void ValidateDirectoryName(string directoryName)
    {
        if (string.IsNullOrWhiteSpace(directoryName))
            throw new ArgumentException("Directory name cannot be empty");

        if (!IsValidDirectoryName(directoryName))
            throw new ArgumentException("Directory name can only contain letters, numbers, spaces, underscores, and hyphens");
    }

    /// <summary>
    /// Validates a file name and throws an ArgumentException if invalid.
    /// </summary>
    /// <param name="fileName">The file name to validate</param>
    /// <exception cref="ArgumentException">Thrown when the name contains invalid characters</exception>
    public static void ValidateFileName(string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName))
            throw new ArgumentException("File name cannot be empty");

        if (!IsValidFileName(fileName))
            throw new ArgumentException("File name can only contain letters, numbers, spaces, underscores, hyphens, and periods");
    }
}
