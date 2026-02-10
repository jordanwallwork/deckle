using Deckle.API.DTOs;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace Deckle.API.Services;

public partial class FileService
{
    private readonly AppDbContext _context;
    private readonly ProjectAuthorizationService _authService;
    private readonly CloudflareR2Service _r2Service;
    private readonly ILogger<FileService> _logger;

    private const long _maxFileSizeBytes = 50 * 1024 * 1024; // 50MB
    private const int _maxTagLength = 50;
    private const int _maxTagsPerFile = 20;
    private static readonly Regex _tagPattern = TagPatternRegex();

    public FileService(
        AppDbContext context,
        ProjectAuthorizationService authService,
        CloudflareR2Service r2Service,
        ILogger<FileService> logger)
    {
        _context = context;
        _authService = authService;
        _r2Service = r2Service;
        _logger = logger;
    }

    /// <summary>
    /// Request presigned upload URL with quota validation
    /// </summary>
    public async Task<RequestUploadUrlResponse> RequestUploadUrlAsync(
        Guid userId,
        Guid projectId,
        string fileName,
        string contentType,
        long fileSizeBytes,
        List<string>? tags = null,
        Guid? directoryId = null)
    {
        // 1. Authorization: User must have CanModifyResources permission
        await _authService.EnsureCanModifyResourcesAsync(userId, projectId);

        // 2. Validate content type
        if (!CloudflareR2Service.IsValidContentType(contentType))
        {
            throw new ArgumentException($"Content type '{contentType}' is not allowed. Only images are supported (JPEG, PNG, GIF, WebP, SVG).");
        }

        // 3. Validate file size
        if (fileSizeBytes <= 0)
        {
            throw new ArgumentException("File size must be greater than 0");
        }

        if (fileSizeBytes > _maxFileSizeBytes)
        {
            var maxMb = _maxFileSizeBytes / (1024.0 * 1024.0);
            throw new ArgumentException($"File size exceeds maximum allowed size of {maxMb:F0}MB");
        }

        // 4. Get project with owner to check quota
        var project = await _context.Projects
            .Include(p => p.UserProjects)
            .FirstOrDefaultAsync(p => p.Id == projectId) ?? throw new InvalidOperationException("Project not found");

        var ownerUserProject = project.UserProjects
            .FirstOrDefault(up => up.Role == ProjectRole.Owner) ?? throw new InvalidOperationException("Project has no owner");

        // 5. Check owner's quota
        var ownerUser = await _context.Users.FindAsync(ownerUserProject.UserId) ?? throw new InvalidOperationException("Project owner not found");

        var quotaBytes = ownerUser.StorageQuotaMb * 1024L * 1024L;
        var projectedUsage = ownerUser.StorageUsedBytes + fileSizeBytes;

        if (projectedUsage > quotaBytes)
        {
            var availableBytes = Math.Max(0, quotaBytes - ownerUser.StorageUsedBytes);
            var availableMb = availableBytes / (1024.0 * 1024.0);
            var requiredMb = fileSizeBytes / (1024.0 * 1024.0);
            throw new InvalidOperationException(
                $"Project owner's storage quota exceeded. Available: {availableMb:F2}MB, Required: {requiredMb:F2}MB. Contact the project owner to free up space.");
        }

        // 6. Validate tags if provided
        if (tags != null && tags.Any())
        {
            ValidateTags(tags);
        }

        // 7. Validate directory if provided
        if (directoryId.HasValue)
        {
            var directory = await _context.FileDirectories
                .FirstOrDefaultAsync(d => d.Id == directoryId.Value && d.ProjectId == projectId) ?? throw new KeyNotFoundException("Directory not found or doesn't belong to this project");
        }

        // 8. Sanitize filename (replace invalid characters with underscores)
        fileName = NameSanitizer.SanitizeFileName(fileName);

        // 9. Get directory path and ensure unique filename by appending number if needed
        var directoryPath = await GetDirectoryPathAsync(directoryId);
        fileName = await EnsureUniquePathAsync(projectId, directoryPath, fileName);

        // Build the full path for this file
        var filePath = string.IsNullOrEmpty(directoryPath)
            ? fileName
            : $"{directoryPath}/{fileName}";

        // 9. Create pending File record
        var fileId = Guid.NewGuid();
        var storageKey = CloudflareR2Service.GenerateStorageKey(projectId, fileId, fileName);

        var file = new Domain.Entities.File
        {
            Id = fileId,
            ProjectId = projectId,
            UploadedByUserId = userId,
            DirectoryId = directoryId,
            FileName = fileName,
            Path = filePath,
            ContentType = contentType,
            FileSizeBytes = fileSizeBytes,
            StorageKey = storageKey,
            Status = FileStatus.Pending,
            UploadedAt = DateTime.UtcNow,
            Tags = tags?.Select(t => t.Trim().ToLowerInvariant()).Where(t => !string.IsNullOrEmpty(t)).ToList() ?? []
        };

        _context.Files.Add(file);
        await _context.SaveChangesAsync();

        // 9. Generate presigned upload URL
        var uploadUrl = _r2Service.GenerateUploadUrl(
            storageKey,
            contentType,
            fileSizeBytes);

        var expiresAt = DateTime.UtcNow.AddMinutes(15);

        LogUploadUrlGenerated(userId, projectId, fileId);

        return new RequestUploadUrlResponse(
            fileId,
            uploadUrl,
            expiresAt
        );
    }

    /// <summary>
    /// Confirm upload completion and update quota
    /// </summary>
    public async Task<FileDto> ConfirmUploadAsync(Guid userId, Guid fileId)
    {
        var file = await _context.Files
            .Include(f => f.Project)
                .ThenInclude(p => p.UserProjects)
            .Include(f => f.UploadedBy)
            .FirstOrDefaultAsync(f => f.Id == fileId) ?? throw new InvalidOperationException("File not found");

        // Authorization: User must have access to the project
        await _authService.RequireProjectAccessAsync(userId, file.ProjectId);

        // Verify file is still pending
        if (file.Status != FileStatus.Pending)
        {
            throw new InvalidOperationException("File has already been confirmed");
        }

        // Optional: Verify file exists in R2
        var exists = await _r2Service.FileExistsAsync(file.StorageKey);
        if (!exists)
        {
            throw new InvalidOperationException("Upload verification failed: File not found in storage");
        }

        // Update file status
        file.Status = FileStatus.Confirmed;

        // Get project owner and update their quota
        var ownerUserProject = file.Project.UserProjects
            .FirstOrDefault(up => up.Role == ProjectRole.Owner);

        if (ownerUserProject != null)
        {
            var ownerUser = await _context.Users.FindAsync(ownerUserProject.UserId);
            if (ownerUser != null)
            {
                ownerUser.StorageUsedBytes += file.FileSizeBytes;
            }
        }

        await _context.SaveChangesAsync();

        LogUploadConfirmed(fileId);

        return MapToDto(file);
    }

    /// <summary>
    /// List files for a project
    /// </summary>
    public async Task<List<FileDto>> GetProjectFilesAsync(
        Guid userId,
        Guid projectId,
        List<string>? filterTags = null,
        bool useAndLogic = false,
        Guid? directoryId = null,
        bool directoryIdSpecified = false)
    {
        // Authorization
        if (!await _authService.HasProjectAccessAsync(userId, projectId))
        {
            return [];
        }

        var query = _context.Files
            .Where(f => f.ProjectId == projectId && f.Status == FileStatus.Confirmed)
            .AsQueryable();

        // Filter by directory if specified
        // directoryIdSpecified distinguishes between "not specified" and "specified as null (root)"
        if (directoryIdSpecified)
        {
            query = query.Where(f => f.DirectoryId == directoryId);
        }

        // Apply tag filtering
        if (filterTags != null && filterTags.Any())
        {
            var normalizedFilterTags = filterTags.Select(t => t.ToLowerInvariant()).ToList();

            if (useAndLogic)
            {
                // AND logic: file must have ALL tags
                foreach (var tag in normalizedFilterTags)
                {
                    query = query.Where(f => f.Tags.Contains(tag));
                }
            }
            else
            {
                // OR logic: file must have ANY tag
                query = query.Where(f => f.Tags.Any(t => normalizedFilterTags.Contains(t)));
            }
        }

        var files = await query
            .Include(f => f.UploadedBy)
            .OrderByDescending(f => f.UploadedAt)
            .ToListAsync();

        return [.. files.Select(MapToDto)];
    }

    /// <summary>
    /// Get file by project ID and path, with authorization check.
    /// Returns null if file not found or user doesn't have access.
    /// </summary>
    public async Task<Domain.Entities.File?> GetFileByProjectAndPathAsync(
        Guid userId,
        Guid projectId,
        string path)
    {
        // Check authorization first
        if (!await _authService.HasProjectAccessAsync(userId, projectId))
        {
            return null;
        }

        // Normalize the path: trim leading/trailing slashes
        var normalizedPath = path.Trim('/');

        // Find the file by path
        var file = await _context.Files
            .FirstOrDefaultAsync(f =>
                f.ProjectId == projectId &&
                f.Path == normalizedPath &&
                f.Status == FileStatus.Confirmed);

        return file;
    }

    /// <summary>
    /// Delete a file
    /// </summary>
    public async Task DeleteFileAsync(Guid userId, Guid fileId)
    {
        var file = await _context.Files
            .Include(f => f.Project)
                .ThenInclude(p => p.UserProjects)
            .Include(f => f.UploadedBy)
            .FirstOrDefaultAsync(f => f.Id == fileId) ?? throw new KeyNotFoundException("File not found");

        // Authorization: User must have CanDeleteResources permission
        await _authService.EnsureCanDeleteResourcesAsync(userId, file.ProjectId);

        // Delete from R2
        try
        {
            await _r2Service.DeleteFileAsync(file.StorageKey);
        }
        catch (Exception ex)
        {
            LogR2DeleteFailed(ex, file.StorageKey);
            // Continue with database deletion even if R2 deletion fails
        }

        // Update owner's quota (only if file was confirmed)
        if (file.Status == FileStatus.Confirmed)
        {
            var ownerUserProject = file.Project.UserProjects
                .FirstOrDefault(up => up.Role == ProjectRole.Owner);

            if (ownerUserProject != null)
            {
                var ownerUser = await _context.Users.FindAsync(ownerUserProject.UserId);
                ownerUser?.StorageUsedBytes = Math.Max(0, ownerUser.StorageUsedBytes - file.FileSizeBytes);
            }
        }

        _context.Files.Remove(file);
        await _context.SaveChangesAsync();

        LogFileDeleted(fileId);
    }

    /// <summary>
    /// Get user's storage quota information
    /// </summary>
    public async Task<UserStorageQuotaDto> GetUserQuotaAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId) ?? throw new InvalidOperationException("User not found");

        var quotaBytes = user.StorageQuotaMb * 1024L * 1024L;
        var usedBytes = user.StorageUsedBytes;
        var availableBytes = Math.Max(0, quotaBytes - usedBytes);
        var usedPercentage = quotaBytes > 0 ? (usedBytes * 100.0 / quotaBytes) : 0;

        return new UserStorageQuotaDto(
            user.StorageQuotaMb,
            usedBytes,
            availableBytes,
            usedPercentage
        );
    }

    /// <summary>
    /// Update tags for a file
    /// </summary>
    public async Task<FileDto> UpdateFileTagsAsync(Guid userId, Guid fileId, List<string> tags)
    {
        var file = await _context.Files
            .Include(f => f.UploadedBy)
            .FirstOrDefaultAsync(f => f.Id == fileId && f.Status == FileStatus.Confirmed) ?? throw new InvalidOperationException("File not found");

        // Authorization: User must have CanModifyResources permission
        await _authService.EnsureCanModifyResourcesAsync(userId, file.ProjectId);

        // Validate tags
        ValidateTags(tags);

        // Normalize tags: trim, lowercase, remove empty, remove duplicates
        file.Tags = [.. tags
            .Select(t => t.Trim().ToLowerInvariant())
            .Where(t => !string.IsNullOrEmpty(t))
            .Distinct()];

        await _context.SaveChangesAsync();

        LogFileTagsUpdated(fileId, userId);

        return MapToDto(file);
    }

    /// <summary>
    /// Get all distinct tags used in a project (for autocomplete)
    /// </summary>
    public async Task<List<string>> GetProjectTagsAsync(Guid userId, Guid projectId)
    {
        // Authorization: User must have project access
        if (!await _authService.HasProjectAccessAsync(userId, projectId))
            return [];

        var allTags = await _context.Files
            .Where(f => f.ProjectId == projectId && f.Status == FileStatus.Confirmed)
            .Select(f => f.Tags)
            .ToListAsync();

        // Flatten, get distinct, and sort alphabetically
        return [.. allTags
            .SelectMany(tags => tags)
            .Distinct()
            .OrderBy(tag => tag)];
    }

    /// <summary>
    /// Rename a file while preserving its extension
    /// </summary>
    public async Task<FileDto> RenameFileAsync(Guid userId, Guid fileId, string newFileName)
    {
        var file = await _context.Files
            .Include(f => f.UploadedBy)
            .FirstOrDefaultAsync(f => f.Id == fileId && f.Status == FileStatus.Confirmed) ?? throw new KeyNotFoundException("File not found");

        // Authorization: User must have CanModifyResources permission
        await _authService.EnsureCanModifyResourcesAsync(userId, file.ProjectId);

        // Validate new filename
        if (string.IsNullOrWhiteSpace(newFileName))
            throw new ArgumentException("New filename cannot be empty");

        // Preserve the original file extension
        var originalExtension = Path.GetExtension(file.FileName);
        var newFileNameWithoutExtension = Path.GetFileNameWithoutExtension(newFileName);

        // Sanitize the new filename (replace invalid characters with underscores)
        newFileNameWithoutExtension = NameSanitizer.SanitizeFileName(newFileNameWithoutExtension);

        // Remove any extension from the provided new filename and add the original extension
        var finalFileName = newFileNameWithoutExtension + originalExtension;

        // Check if filename is actually changing
        if (finalFileName.Equals(file.FileName, StringComparison.OrdinalIgnoreCase))
        {
            // No change needed, return current file
            return MapToDto(file);
        }

        // Build new path and check for conflicts
        var directoryPath = await GetDirectoryPathAsync(file.DirectoryId);
        var newPath = string.IsNullOrEmpty(directoryPath)
            ? finalFileName
            : $"{directoryPath}/{finalFileName}";

        // Check if a file with the new path already exists in the project
        var existingFile = await _context.Files
            .FirstOrDefaultAsync(f =>
                f.ProjectId == file.ProjectId &&
                f.Path == newPath &&
                f.Id != fileId &&
                f.Status == FileStatus.Confirmed);

        if (existingFile != null)
            throw new ArgumentException($"A file with the name '{finalFileName}' already exists in this location");

        // Generate new storage key
        var oldStorageKey = file.StorageKey;
        var newStorageKey = CloudflareR2Service.GenerateStorageKey(file.ProjectId, file.Id, finalFileName);

        // Copy file to new location in R2
        await _r2Service.CopyFileAsync(oldStorageKey, newStorageKey);

        // Delete old file from R2
        await _r2Service.DeleteFileAsync(oldStorageKey);

        // Update database record
        file.FileName = finalFileName;
        file.Path = newPath;
        file.StorageKey = newStorageKey;

        await _context.SaveChangesAsync();

        LogFileRenamed(fileId, Path.GetFileName(oldStorageKey), finalFileName, userId);

        return MapToDto(file);
    }

    /// <summary>
    /// Ensure unique path by appending a number to filename if a file with the same path exists
    /// </summary>
    private async Task<string> EnsureUniquePathAsync(Guid projectId, string directoryPath, string fileName)
    {
        var fileNameWithoutExtension = Path.GetFileNameWithoutExtension(fileName);
        var extension = Path.GetExtension(fileName);
        var uniqueFileName = fileName;
        var counter = 1;

        // Build the full path
        var basePath = string.IsNullOrEmpty(directoryPath) ? "" : directoryPath + "/";

        // Check if file exists at this path and generate unique name if needed
        while (await _context.Files.AnyAsync(f =>
            f.ProjectId == projectId &&
            f.Path == basePath + uniqueFileName &&
            f.Status == FileStatus.Confirmed))
        {
            uniqueFileName = $"{fileNameWithoutExtension} ({counter}){extension}";
            counter++;
        }

        if (uniqueFileName != fileName)
        {
            LogFileRenamedForUniqueness(fileName, uniqueFileName, basePath, projectId);
        }

        return uniqueFileName;
    }

    /// <summary>
    /// Validate tags for length, count, and allowed characters
    /// </summary>
    private static void ValidateTags(List<string> tags)
    {
        // Filter out null/whitespace before validation
        var validTags = tags.Where(t => !string.IsNullOrWhiteSpace(t)).ToList();

        if (validTags.Count > _maxTagsPerFile)
        {
            throw new ArgumentException($"Maximum {_maxTagsPerFile} tags allowed per file");
        }

        foreach (var tag in validTags)
        {
            if (tag.Length > _maxTagLength)
            {
                throw new ArgumentException($"Tag '{tag}' exceeds maximum length of {_maxTagLength} characters");
            }

            var normalized = tag.Trim().ToLowerInvariant();
            if (!_tagPattern.IsMatch(normalized))
            {
                throw new ArgumentException($"Tag '{tag}' contains invalid characters. Only lowercase letters, numbers, hyphens, and underscores are allowed");
            }
        }
    }

    /// <summary>
    /// Move a file to a different directory
    /// </summary>
    public async Task<FileDto> MoveFileAsync(Guid userId, Guid fileId, Guid? directoryId)
    {
        var file = await _context.Files
            .Include(f => f.UploadedBy)
            .FirstOrDefaultAsync(f => f.Id == fileId && f.Status == FileStatus.Confirmed) ?? throw new KeyNotFoundException("File not found");

        // Authorization: User must have CanModifyResources permission
        await _authService.EnsureCanModifyResourcesAsync(userId, file.ProjectId);

        // Validate directory if provided
        if (directoryId.HasValue)
        {
            var directory = await _context.FileDirectories
                .FirstOrDefaultAsync(d => d.Id == directoryId.Value && d.ProjectId == file.ProjectId) ?? throw new KeyNotFoundException("Directory not found or doesn't belong to the same project");
        }

        // Build new path and check for conflicts at destination
        var newDirectoryPath = await GetDirectoryPathAsync(directoryId);
        var newPath = string.IsNullOrEmpty(newDirectoryPath)
            ? file.FileName
            : $"{newDirectoryPath}/{file.FileName}";

        // Check if a file with the same name already exists at the destination
        var existingFile = await _context.Files
            .FirstOrDefaultAsync(f =>
                f.ProjectId == file.ProjectId &&
                f.Path == newPath &&
                f.Id != fileId &&
                f.Status == FileStatus.Confirmed);

        if (existingFile != null)
            throw new ArgumentException($"A file with the name '{file.FileName}' already exists in the destination");

        // Update file
        file.DirectoryId = directoryId;
        file.Path = newPath;
        await _context.SaveChangesAsync();

        LogFileMoved(fileId, directoryId?.ToString() ?? "root", newPath, userId);

        return MapToDto(file);
    }

    /// <summary>
    /// Get the full path for a directory (e.g., "folder/subfolder")
    /// Returns empty string for root (null directoryId)
    /// </summary>
    private async Task<string> GetDirectoryPathAsync(Guid? directoryId)
    {
        if (!directoryId.HasValue)
            return string.Empty;

        List<string> pathSegments = [];
        var currentId = directoryId.Value;
        HashSet<Guid> visitedIds = [];

        while (true)
        {
            if (!visitedIds.Add(currentId))
                break; // Prevent infinite loops

            var directory = await _context.FileDirectories
                .FirstOrDefaultAsync(d => d.Id == currentId);

            if (directory == null)
                break;

            pathSegments.Insert(0, directory.Name);

            if (directory.ParentDirectoryId == null)
                break;

            currentId = directory.ParentDirectoryId.Value;
        }

        return string.Join("/", pathSegments);
    }

    private static FileDto MapToDto(Domain.Entities.File file)
    {
        return new FileDto(
            file.Id,
            file.ProjectId,
            file.DirectoryId,
            file.FileName,
            file.Path,
            file.ContentType,
            file.FileSizeBytes,
            file.UploadedAt,
            new FileUploaderDto(
                file.UploadedBy.Id,
                file.UploadedBy.Email,
                file.UploadedBy.Name
            ),
            file.Tags
        );
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Generated upload URL for user {UserId}, project {ProjectId}, file {FileId}")]
    private partial void LogUploadUrlGenerated(Guid userId, Guid projectId, Guid fileId);

    [LoggerMessage(Level = LogLevel.Information, Message = "Confirmed upload for file {FileId}, updated quota for project owner")]
    private partial void LogUploadConfirmed(Guid fileId);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Failed to delete file from R2: {StorageKey}")]
    private partial void LogR2DeleteFailed(Exception ex, string storageKey);

    [LoggerMessage(Level = LogLevel.Information, Message = "Deleted file {FileId}, updated quota for project owner")]
    private partial void LogFileDeleted(Guid fileId);

    [LoggerMessage(Level = LogLevel.Information, Message = "Updated tags for file {FileId} by user {UserId}")]
    private partial void LogFileTagsUpdated(Guid fileId, Guid userId);

    [LoggerMessage(Level = LogLevel.Information, Message = "Renamed file {FileId} from '{OldFileName}' to '{NewFileName}' by user {UserId}")]
    private partial void LogFileRenamed(Guid fileId, string oldFileName, string newFileName, Guid userId);

    [LoggerMessage(Level = LogLevel.Information, Message = "Renamed file from '{OriginalFileName}' to '{UniqueFileName}' to ensure uniqueness at path '{Path}' in project {ProjectId}")]
    private partial void LogFileRenamedForUniqueness(string originalFileName, string uniqueFileName, string path, Guid projectId);

    [LoggerMessage(Level = LogLevel.Information, Message = "Moved file {FileId} to directory {DirectoryId} (path: {Path}) by user {UserId}")]
    private partial void LogFileMoved(Guid fileId, string directoryId, string path, Guid userId);

    [GeneratedRegex(@"^[a-z0-9\-_]+$", RegexOptions.Compiled)]
    private static partial Regex TagPatternRegex();
}
