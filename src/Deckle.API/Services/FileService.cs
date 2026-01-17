using Deckle.API.DTOs;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace Deckle.API.Services;

public class FileService
{
    private readonly AppDbContext _context;
    private readonly ProjectAuthorizationService _authService;
    private readonly CloudflareR2Service _r2Service;
    private readonly ILogger<FileService> _logger;

    private const long MaxFileSizeBytes = 50 * 1024 * 1024; // 50MB
    private const int MaxTagLength = 50;
    private const int MaxTagsPerFile = 20;
    private static readonly Regex TagPattern = new(@"^[a-z0-9\-_]+$", RegexOptions.Compiled);

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
        List<string>? tags = null)
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

        if (fileSizeBytes > MaxFileSizeBytes)
        {
            var maxMb = MaxFileSizeBytes / (1024.0 * 1024.0);
            throw new ArgumentException($"File size exceeds maximum allowed size of {maxMb:F0}MB");
        }

        // 4. Get project with owner to check quota
        var project = await _context.Projects
            .Include(p => p.UserProjects)
            .FirstOrDefaultAsync(p => p.Id == projectId);

        if (project == null)
        {
            throw new InvalidOperationException("Project not found");
        }

        var ownerUserProject = project.UserProjects
            .FirstOrDefault(up => up.Role == ProjectRole.Owner);

        if (ownerUserProject == null)
        {
            throw new InvalidOperationException("Project has no owner");
        }

        // 5. Check owner's quota
        var ownerUser = await _context.Users.FindAsync(ownerUserProject.UserId);
        if (ownerUser == null)
        {
            throw new InvalidOperationException("Project owner not found");
        }

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

        // 7. Ensure unique filename by appending number if needed
        fileName = await EnsureUniqueFileNameAsync(projectId, fileName);

        // 8. Create pending File record
        var fileId = Guid.NewGuid();
        var storageKey = CloudflareR2Service.GenerateStorageKey(projectId, fileId, fileName);

        var file = new Domain.Entities.File
        {
            Id = fileId,
            ProjectId = projectId,
            UploadedByUserId = userId,
            FileName = fileName,
            ContentType = contentType,
            FileSizeBytes = fileSizeBytes,
            StorageKey = storageKey,
            Status = FileStatus.Pending,
            UploadedAt = DateTime.UtcNow,
            Tags = tags?.Select(t => t.Trim().ToLowerInvariant()).Where(t => !string.IsNullOrEmpty(t)).ToList() ?? new()
        };

        _context.Files.Add(file);
        await _context.SaveChangesAsync();

        // 9. Generate presigned upload URL
        var uploadUrl = _r2Service.GenerateUploadUrl(
            storageKey,
            contentType,
            fileSizeBytes);

        var expiresAt = DateTime.UtcNow.AddMinutes(15);

        _logger.LogInformation(
            "Generated upload URL for user {UserId}, project {ProjectId}, file {FileId}",
            userId, projectId, fileId);

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
            .FirstOrDefaultAsync(f => f.Id == fileId);

        if (file == null)
        {
            throw new InvalidOperationException("File not found");
        }

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

        _logger.LogInformation(
            "Confirmed upload for file {FileId}, updated quota for project owner",
            fileId);

        return MapToDto(file);
    }

    /// <summary>
    /// List files for a project
    /// </summary>
    public async Task<List<FileDto>> GetProjectFilesAsync(
        Guid userId,
        Guid projectId,
        List<string>? filterTags = null,
        bool useAndLogic = false)
    {
        // Authorization
        if (!await _authService.HasProjectAccessAsync(userId, projectId))
        {
            return [];
        }

        var query = _context.Files
            .Where(f => f.ProjectId == projectId && f.Status == FileStatus.Confirmed)
            .AsQueryable();

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

        return files.Select(MapToDto).ToList();
    }

    /// <summary>
    /// Generate download URL for a file
    /// </summary>
    public async Task<GenerateDownloadUrlResponse> GenerateDownloadUrlAsync(
        Guid userId,
        Guid fileId)
    {
        var file = await _context.Files
            .Include(f => f.Project)
            .FirstOrDefaultAsync(f => f.Id == fileId && f.Status == FileStatus.Confirmed);

        if (file == null)
        {
            throw new InvalidOperationException("File not found");
        }

        // Authorization
        await _authService.RequireProjectAccessAsync(userId, file.ProjectId);

        var downloadUrl = _r2Service.GenerateDownloadUrl(
            file.StorageKey,
            file.FileName);

        var expiresAt = DateTime.UtcNow.AddMinutes(15);

        return new GenerateDownloadUrlResponse(
            downloadUrl,
            expiresAt
        );
    }

    /// <summary>
    /// Get file by project ID and filename, with authorization check.
    /// Returns null if file not found or user doesn't have access.
    /// </summary>
    public async Task<Domain.Entities.File?> GetFileByProjectAndFilenameAsync(
        Guid userId,
        Guid projectId,
        string fileName)
    {
        // Check authorization first
        if (!await _authService.HasProjectAccessAsync(userId, projectId))
        {
            return null;
        }

        // Find the file
        var file = await _context.Files
            .FirstOrDefaultAsync(f =>
                f.ProjectId == projectId &&
                f.FileName == fileName &&
                f.Status == FileStatus.Confirmed);

        return file;
    }

    /// <summary>
    /// Delete a file
    /// </summary>
    public async Task<bool> DeleteFileAsync(Guid userId, Guid fileId)
    {
        var file = await _context.Files
            .Include(f => f.Project)
                .ThenInclude(p => p.UserProjects)
            .Include(f => f.UploadedBy)
            .FirstOrDefaultAsync(f => f.Id == fileId);

        if (file == null)
        {
            return false;
        }

        // Authorization: User must have CanDeleteResources permission
        await _authService.EnsureCanDeleteResourcesAsync(userId, file.ProjectId);

        // Delete from R2
        try
        {
            await _r2Service.DeleteFileAsync(file.StorageKey);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete file from R2: {StorageKey}", file.StorageKey);
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
                if (ownerUser != null)
                {
                    ownerUser.StorageUsedBytes = Math.Max(0, ownerUser.StorageUsedBytes - file.FileSizeBytes);
                }
            }
        }

        _context.Files.Remove(file);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Deleted file {FileId}, updated quota for project owner",
            fileId);

        return true;
    }

    /// <summary>
    /// Get user's storage quota information
    /// </summary>
    public async Task<UserStorageQuotaDto> GetUserQuotaAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            throw new InvalidOperationException("User not found");
        }

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
            .FirstOrDefaultAsync(f => f.Id == fileId && f.Status == FileStatus.Confirmed);

        if (file == null)
            throw new InvalidOperationException("File not found");

        // Authorization: User must have CanModifyResources permission
        await _authService.EnsureCanModifyResourcesAsync(userId, file.ProjectId);

        // Validate tags
        ValidateTags(tags);

        // Normalize tags: trim, lowercase, remove empty, remove duplicates
        file.Tags = tags
            .Select(t => t.Trim().ToLowerInvariant())
            .Where(t => !string.IsNullOrEmpty(t))
            .Distinct()
            .ToList();

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Updated tags for file {FileId} by user {UserId}",
            fileId, userId);

        return MapToDto(file);
    }

    /// <summary>
    /// Get all distinct tags used in a project (for autocomplete)
    /// </summary>
    public async Task<List<string>> GetProjectTagsAsync(Guid userId, Guid projectId)
    {
        // Authorization: User must have project access
        if (!await _authService.HasProjectAccessAsync(userId, projectId))
            return new List<string>();

        var allTags = await _context.Files
            .Where(f => f.ProjectId == projectId && f.Status == FileStatus.Confirmed)
            .Select(f => f.Tags)
            .ToListAsync();

        // Flatten, get distinct, and sort alphabetically
        return allTags
            .SelectMany(tags => tags)
            .Distinct()
            .OrderBy(tag => tag)
            .ToList();
    }

    /// <summary>
    /// Rename a file while preserving its extension
    /// </summary>
    public async Task<FileDto> RenameFileAsync(Guid userId, Guid fileId, string newFileName)
    {
        var file = await _context.Files
            .Include(f => f.UploadedBy)
            .FirstOrDefaultAsync(f => f.Id == fileId && f.Status == FileStatus.Confirmed);

        if (file == null)
            throw new KeyNotFoundException("File not found");

        // Authorization: User must have CanModifyResources permission
        await _authService.EnsureCanModifyResourcesAsync(userId, file.ProjectId);

        // Validate new filename
        if (string.IsNullOrWhiteSpace(newFileName))
            throw new ArgumentException("New filename cannot be empty");

        // Preserve the original file extension
        var originalExtension = Path.GetExtension(file.FileName);
        var newFileNameWithoutExtension = Path.GetFileNameWithoutExtension(newFileName);

        // Remove any extension from the provided new filename and add the original extension
        var finalFileName = newFileNameWithoutExtension + originalExtension;

        // Check if filename is actually changing
        if (finalFileName.Equals(file.FileName, StringComparison.OrdinalIgnoreCase))
        {
            // No change needed, return current file
            return MapToDto(file);
        }

        // Check if a file with the new name already exists in the project
        var existingFile = await _context.Files
            .FirstOrDefaultAsync(f =>
                f.ProjectId == file.ProjectId &&
                f.FileName == finalFileName &&
                f.Id != fileId &&
                f.Status == FileStatus.Confirmed);

        if (existingFile != null)
            throw new ArgumentException($"A file with the name '{finalFileName}' already exists in this project");

        // Generate new storage key
        var oldStorageKey = file.StorageKey;
        var newStorageKey = CloudflareR2Service.GenerateStorageKey(file.ProjectId, file.Id, finalFileName);

        // Copy file to new location in R2
        await _r2Service.CopyFileAsync(oldStorageKey, newStorageKey);

        // Delete old file from R2
        await _r2Service.DeleteFileAsync(oldStorageKey);

        // Update database record
        file.FileName = finalFileName;
        file.StorageKey = newStorageKey;

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Renamed file {FileId} from '{OldFileName}' to '{NewFileName}' by user {UserId}",
            fileId, Path.GetFileName(oldStorageKey), finalFileName, userId);

        return MapToDto(file);
    }

    /// <summary>
    /// Ensure unique filename by appending a number if a file with the same name exists
    /// </summary>
    private async Task<string> EnsureUniqueFileNameAsync(Guid projectId, string fileName)
    {
        var fileNameWithoutExtension = Path.GetFileNameWithoutExtension(fileName);
        var extension = Path.GetExtension(fileName);
        var uniqueFileName = fileName;
        var counter = 1;

        // Check if file exists and generate unique name if needed
        while (await _context.Files.AnyAsync(f =>
            f.ProjectId == projectId &&
            f.FileName == uniqueFileName &&
            f.Status == FileStatus.Confirmed))
        {
            uniqueFileName = $"{fileNameWithoutExtension} ({counter}){extension}";
            counter++;
        }

        if (uniqueFileName != fileName)
        {
            _logger.LogInformation(
                "Renamed file from '{OriginalFileName}' to '{UniqueFileName}' to ensure uniqueness in project {ProjectId}",
                fileName, uniqueFileName, projectId);
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

        if (validTags.Count > MaxTagsPerFile)
        {
            throw new ArgumentException($"Maximum {MaxTagsPerFile} tags allowed per file");
        }

        foreach (var tag in validTags)
        {
            if (tag.Length > MaxTagLength)
            {
                throw new ArgumentException($"Tag '{tag}' exceeds maximum length of {MaxTagLength} characters");
            }

            var normalized = tag.Trim().ToLowerInvariant();
            if (!TagPattern.IsMatch(normalized))
            {
                throw new ArgumentException($"Tag '{tag}' contains invalid characters. Only lowercase letters, numbers, hyphens, and underscores are allowed");
            }
        }
    }

    private static FileDto MapToDto(Domain.Entities.File file)
    {
        return new FileDto(
            file.Id,
            file.ProjectId,
            file.FileName,
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
}
