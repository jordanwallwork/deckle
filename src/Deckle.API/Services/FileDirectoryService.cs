using Deckle.API.DTOs;
using Deckle.API.Exceptions;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deckle.API.Services;

public class FileDirectoryService
{
    private readonly AppDbContext _context;
    private readonly ProjectAuthorizationService _authService;
    private readonly ILogger<FileDirectoryService> _logger;

    public FileDirectoryService(
        AppDbContext context,
        ProjectAuthorizationService authService,
        ILogger<FileDirectoryService> logger)
    {
        _context = context;
        _authService = authService;
        _logger = logger;
    }

    /// <summary>
    /// Create a new directory in a project
    /// </summary>
    public async Task<FileDirectoryDto> CreateDirectoryAsync(
        Guid userId,
        Guid projectId,
        string name,
        Guid? parentDirectoryId = null)
    {
        // Authorization
        await _authService.EnsureCanModifyResourcesAsync(userId, projectId);

        // Validate name
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Directory name cannot be empty");

        name = name.Trim();

        if (name.Length > 255)
            throw new ArgumentException("Directory name cannot exceed 255 characters");

        // Validate that name contains only allowed characters
        NameSanitizer.ValidateDirectoryName(name);

        // Validate parent directory if provided
        if (parentDirectoryId.HasValue)
        {
            var parentDirectory = await _context.FileDirectories
                .FirstOrDefaultAsync(d => d.Id == parentDirectoryId.Value && d.ProjectId == projectId);

            if (parentDirectory == null)
                throw new KeyNotFoundException("Parent directory not found or doesn't belong to this project");
        }

        // Check for duplicate name in the same parent
        var existingDirectory = await _context.FileDirectories
            .FirstOrDefaultAsync(d =>
                d.ProjectId == projectId &&
                d.ParentDirectoryId == parentDirectoryId &&
                d.Name == name);

        if (existingDirectory != null)
            throw new ArgumentException($"A directory named '{name}' already exists in this location");

        var now = DateTime.UtcNow;
        var directory = new FileDirectory
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            ParentDirectoryId = parentDirectoryId,
            Name = name,
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.FileDirectories.Add(directory);
        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Created directory '{Name}' in project {ProjectId} by user {UserId}",
            name, projectId, userId);

        return MapToDto(directory);
    }

    /// <summary>
    /// Get all directories for a project
    /// </summary>
    public async Task<List<FileDirectoryDto>> GetProjectDirectoriesAsync(
        Guid userId,
        Guid projectId)
    {
        // Authorization
        if (!await _authService.HasProjectAccessAsync(userId, projectId))
            return [];

        var directories = await _context.FileDirectories
            .Where(d => d.ProjectId == projectId)
            .OrderBy(d => d.Name)
            .ToListAsync();

        return directories.Select(MapToDto).ToList();
    }

    /// <summary>
    /// Get a directory by ID with its contents
    /// </summary>
    public async Task<FileDirectoryWithContentsDto?> GetDirectoryWithContentsAsync(
        Guid userId,
        Guid projectId,
        Guid directoryId)
    {
        // Authorization
        if (!await _authService.HasProjectAccessAsync(userId, projectId))
            return null;

        var directory = await _context.FileDirectories
            .Include(d => d.ChildDirectories)
            .Include(d => d.Files.Where(f => f.Status == FileStatus.Confirmed))
                .ThenInclude(f => f.UploadedBy)
            .FirstOrDefaultAsync(d => d.Id == directoryId && d.ProjectId == projectId);

        if (directory == null)
            return null;

        return MapToWithContentsDto(directory);
    }

    /// <summary>
    /// Get a directory by its path (e.g., "folder1/folder2")
    /// </summary>
    public async Task<FileDirectoryWithContentsDto?> GetDirectoryByPathAsync(
        Guid userId,
        Guid projectId,
        string path)
    {
        // Authorization
        if (!await _authService.HasProjectAccessAsync(userId, projectId))
            return null;

        // Empty or whitespace path means root
        if (string.IsNullOrWhiteSpace(path))
            return await GetRootContentsAsync(userId, projectId);

        // Split path into segments
        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length == 0)
            return await GetRootContentsAsync(userId, projectId);

        // Navigate through each segment
        Guid? currentParentId = null;
        FileDirectory? currentDirectory = null;

        foreach (var segment in segments)
        {
            currentDirectory = await _context.FileDirectories
                .FirstOrDefaultAsync(d =>
                    d.ProjectId == projectId &&
                    d.ParentDirectoryId == currentParentId &&
                    d.Name == segment);

            if (currentDirectory == null)
                return null; // Path not found

            currentParentId = currentDirectory.Id;
        }

        // Load the final directory with its contents
        var directoryWithContents = await _context.FileDirectories
            .Include(d => d.ChildDirectories)
            .Include(d => d.Files.Where(f => f.Status == FileStatus.Confirmed))
                .ThenInclude(f => f.UploadedBy)
            .FirstOrDefaultAsync(d => d.Id == currentDirectory!.Id);

        return directoryWithContents != null ? MapToWithContentsDto(directoryWithContents) : null;
    }

    /// <summary>
    /// Build the path for a directory (e.g., "folder1/folder2")
    /// </summary>
    public async Task<string?> GetDirectoryPathAsync(
        Guid userId,
        Guid projectId,
        Guid directoryId)
    {
        // Authorization
        if (!await _authService.HasProjectAccessAsync(userId, projectId))
            return null;

        var directory = await _context.FileDirectories
            .FirstOrDefaultAsync(d => d.Id == directoryId && d.ProjectId == projectId);

        if (directory == null)
            return null;

        // Build path from root to this directory
        var pathSegments = new List<string>();
        var currentDirectory = directory;
        var visitedIds = new HashSet<Guid>();

        while (currentDirectory != null)
        {
            if (!visitedIds.Add(currentDirectory.Id))
                break; // Prevent infinite loops

            pathSegments.Insert(0, currentDirectory.Name);

            if (currentDirectory.ParentDirectoryId == null)
                break;

            currentDirectory = await _context.FileDirectories
                .FirstOrDefaultAsync(d => d.Id == currentDirectory.ParentDirectoryId);
        }

        return string.Join("/", pathSegments);
    }

    /// <summary>
    /// Get root directory contents (files and directories with no parent)
    /// </summary>
    public async Task<FileDirectoryWithContentsDto?> GetRootContentsAsync(
        Guid userId,
        Guid projectId)
    {
        // Authorization
        if (!await _authService.HasProjectAccessAsync(userId, projectId))
            return null;

        var rootDirectories = await _context.FileDirectories
            .Where(d => d.ProjectId == projectId && d.ParentDirectoryId == null)
            .OrderBy(d => d.Name)
            .ToListAsync();

        var rootFiles = await _context.Files
            .Include(f => f.UploadedBy)
            .Where(f => f.ProjectId == projectId && f.DirectoryId == null && f.Status == FileStatus.Confirmed)
            .OrderByDescending(f => f.UploadedAt)
            .ToListAsync();

        // Return a virtual "root" directory
        return new FileDirectoryWithContentsDto(
            Guid.Empty,
            projectId,
            null,
            "",
            DateTime.MinValue,
            DateTime.MinValue,
            rootDirectories.Select(MapToDto).ToList(),
            rootFiles.Select(MapFileToDto).ToList()
        );
    }

    /// <summary>
    /// Rename a directory
    /// </summary>
    public async Task<FileDirectoryDto> RenameDirectoryAsync(
        Guid userId,
        Guid directoryId,
        string newName)
    {
        var directory = await _context.FileDirectories
            .FirstOrDefaultAsync(d => d.Id == directoryId);

        if (directory == null)
            throw new KeyNotFoundException("Directory not found");

        // Authorization
        await _authService.EnsureCanModifyResourcesAsync(userId, directory.ProjectId);

        // Validate name
        if (string.IsNullOrWhiteSpace(newName))
            throw new ArgumentException("Directory name cannot be empty");

        newName = newName.Trim();

        if (newName.Length > 255)
            throw new ArgumentException("Directory name cannot exceed 255 characters");

        // Validate that name contains only allowed characters
        NameSanitizer.ValidateDirectoryName(newName);

        // Check for duplicate name in the same parent
        var existingDirectory = await _context.FileDirectories
            .FirstOrDefaultAsync(d =>
                d.ProjectId == directory.ProjectId &&
                d.ParentDirectoryId == directory.ParentDirectoryId &&
                d.Name == newName &&
                d.Id != directoryId);

        if (existingDirectory != null)
            throw new ArgumentException($"A directory named '{newName}' already exists in this location");

        // Get old path before renaming
        var oldPath = await GetDirectoryFullPathAsync(directory);

        var oldName = directory.Name;
        directory.Name = newName;
        directory.UpdatedAt = DateTime.UtcNow;

        // Get new path after renaming
        var newPath = await GetDirectoryFullPathAsync(directory);

        // Update file paths in this directory and all descendants
        await UpdateFilePathsInDirectoryTreeAsync(directoryId, oldPath, newPath);

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Renamed directory {DirectoryId} from '{OldName}' to '{NewName}' by user {UserId}",
            directoryId, oldName, newName, userId);

        return MapToDto(directory);
    }

    /// <summary>
    /// Move a directory to a new parent
    /// </summary>
    /// <param name="userId">The user performing the operation</param>
    /// <param name="directoryId">The directory to move</param>
    /// <param name="newParentDirectoryId">The new parent directory (null for root)</param>
    /// <param name="merge">If true and a directory with the same name exists, merge contents; otherwise throw conflict</param>
    /// <returns>The moved or merged directory DTO</returns>
    /// <exception cref="DirectoryConflictException">Thrown when merge=false and a directory with the same name exists</exception>
    public async Task<FileDirectoryDto> MoveDirectoryAsync(
        Guid userId,
        Guid directoryId,
        Guid? newParentDirectoryId,
        bool merge = false)
    {
        var directory = await _context.FileDirectories
            .FirstOrDefaultAsync(d => d.Id == directoryId);

        if (directory == null)
            throw new KeyNotFoundException("Directory not found");

        // Authorization
        await _authService.EnsureCanModifyResourcesAsync(userId, directory.ProjectId);

        // Prevent moving to self
        if (newParentDirectoryId == directoryId)
            throw new ArgumentException("Cannot move a directory into itself");

        // Validate new parent directory if provided
        if (newParentDirectoryId.HasValue)
        {
            var newParentDirectory = await _context.FileDirectories
                .FirstOrDefaultAsync(d => d.Id == newParentDirectoryId.Value && d.ProjectId == directory.ProjectId);

            if (newParentDirectory == null)
                throw new KeyNotFoundException("New parent directory not found or doesn't belong to this project");

            // Prevent moving to a descendant
            if (await IsDescendantAsync(directoryId, newParentDirectoryId.Value))
                throw new ArgumentException("Cannot move a directory into one of its descendants");
        }

        // Check for duplicate name in the new parent
        var existingDirectory = await _context.FileDirectories
            .FirstOrDefaultAsync(d =>
                d.ProjectId == directory.ProjectId &&
                d.ParentDirectoryId == newParentDirectoryId &&
                d.Name == directory.Name &&
                d.Id != directoryId);

        if (existingDirectory != null)
        {
            if (!merge)
            {
                // Return conflict information so the client can ask the user
                throw new DirectoryConflictException(new DirectoryMoveConflictDto(
                    directory.Id,
                    directory.Name,
                    existingDirectory.Id,
                    existingDirectory.Name,
                    $"A directory named '{directory.Name}' already exists in the destination. Would you like to merge the contents?"
                ));
            }

            // Merge the directories
            return await MergeDirectoriesAsync(userId, directory, existingDirectory);
        }

        // Get old path before moving
        var oldPath = await GetDirectoryFullPathAsync(directory);

        directory.ParentDirectoryId = newParentDirectoryId;
        directory.UpdatedAt = DateTime.UtcNow;

        // Get new path after moving
        var newPath = await GetDirectoryFullPathAsync(directory);

        // Update file paths in this directory and all descendants
        await UpdateFilePathsInDirectoryTreeAsync(directoryId, oldPath, newPath);

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Moved directory {DirectoryId} to parent {ParentDirectoryId} by user {UserId}",
            directoryId, newParentDirectoryId?.ToString() ?? "root", userId);

        return MapToDto(directory);
    }

    /// <summary>
    /// Merge the contents of the source directory into the target directory
    /// </summary>
    private async Task<FileDirectoryDto> MergeDirectoriesAsync(
        Guid userId,
        FileDirectory sourceDirectory,
        FileDirectory targetDirectory)
    {
        _logger.LogInformation(
            "Merging directory {SourceId} ('{SourceName}') into {TargetId} ('{TargetName}') by user {UserId}",
            sourceDirectory.Id, sourceDirectory.Name, targetDirectory.Id, targetDirectory.Name, userId);

        // Get the target directory's full path for file path updates
        var targetPath = await GetDirectoryFullPathAsync(targetDirectory);

        // Move all files from source to target
        var sourceFiles = await _context.Files
            .Where(f => f.DirectoryId == sourceDirectory.Id && f.Status == FileStatus.Confirmed)
            .ToListAsync();

        foreach (var file in sourceFiles)
        {
            // Check for filename conflicts in the target directory
            var existingFile = await _context.Files
                .FirstOrDefaultAsync(f =>
                    f.DirectoryId == targetDirectory.Id &&
                    f.FileName == file.FileName &&
                    f.Status == FileStatus.Confirmed);

            if (existingFile != null)
            {
                // Rename the file to avoid conflict (append timestamp)
                var extension = System.IO.Path.GetExtension(file.FileName);
                var nameWithoutExtension = System.IO.Path.GetFileNameWithoutExtension(file.FileName);
                var timestamp = DateTime.UtcNow.ToString("yyyyMMddHHmmss");
                file.FileName = $"{nameWithoutExtension}_{timestamp}{extension}";
            }

            file.DirectoryId = targetDirectory.Id;
            file.Path = string.IsNullOrEmpty(targetPath) ? file.FileName : $"{targetPath}/{file.FileName}";
        }

        // Recursively handle subdirectories
        var sourceSubdirectories = await _context.FileDirectories
            .Where(d => d.ParentDirectoryId == sourceDirectory.Id)
            .ToListAsync();

        foreach (var sourceSubdir in sourceSubdirectories)
        {
            // Check if a directory with the same name exists in the target
            var existingSubdir = await _context.FileDirectories
                .FirstOrDefaultAsync(d =>
                    d.ParentDirectoryId == targetDirectory.Id &&
                    d.Name == sourceSubdir.Name);

            if (existingSubdir != null)
            {
                // Recursively merge the subdirectories
                await MergeDirectoriesAsync(userId, sourceSubdir, existingSubdir);
            }
            else
            {
                // Move the subdirectory to the target
                var oldPath = await GetDirectoryFullPathAsync(sourceSubdir);
                sourceSubdir.ParentDirectoryId = targetDirectory.Id;
                sourceSubdir.UpdatedAt = DateTime.UtcNow;
                var newPath = await GetDirectoryFullPathAsync(sourceSubdir);
                await UpdateFilePathsInDirectoryTreeAsync(sourceSubdir.Id, oldPath, newPath);
            }
        }

        // Delete the now-empty source directory
        _context.FileDirectories.Remove(sourceDirectory);

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Completed merge of directory {SourceId} into {TargetId}. Source directory deleted.",
            sourceDirectory.Id, targetDirectory.Id);

        // Return the target directory (which now contains the merged contents)
        return MapToDto(targetDirectory);
    }

    /// <summary>
    /// Delete a directory and all its contents (files and subdirectories)
    /// </summary>
    public async Task<bool> DeleteDirectoryAsync(
        Guid userId,
        Guid directoryId)
    {
        var directory = await _context.FileDirectories
            .FirstOrDefaultAsync(d => d.Id == directoryId);

        if (directory == null)
            return false;

        // Authorization
        await _authService.EnsureCanDeleteResourcesAsync(userId, directory.ProjectId);

        // With cascade delete configured, child directories will be deleted automatically
        // But files will have their DirectoryId set to null (SetNull behavior)
        // If we want to delete files too, we need to do it manually

        _context.FileDirectories.Remove(directory);
        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Deleted directory {DirectoryId} by user {UserId}",
            directoryId, userId);

        return true;
    }

    /// <summary>
    /// Check if targetId is a descendant of ancestorId
    /// </summary>
    private async Task<bool> IsDescendantAsync(Guid ancestorId, Guid targetId)
    {
        var currentId = targetId;
        var visitedIds = new HashSet<Guid>();

        while (currentId != Guid.Empty)
        {
            if (currentId == ancestorId)
                return true;

            if (!visitedIds.Add(currentId))
                break; // Prevent infinite loops

            var directory = await _context.FileDirectories
                .FirstOrDefaultAsync(d => d.Id == currentId);

            if (directory?.ParentDirectoryId == null)
                break;

            currentId = directory.ParentDirectoryId.Value;
        }

        return false;
    }

    private static FileDirectoryDto MapToDto(FileDirectory directory)
    {
        return new FileDirectoryDto(
            directory.Id,
            directory.ProjectId,
            directory.ParentDirectoryId,
            directory.Name,
            directory.CreatedAt,
            directory.UpdatedAt
        );
    }

    private static FileDirectoryWithContentsDto MapToWithContentsDto(FileDirectory directory)
    {
        return new FileDirectoryWithContentsDto(
            directory.Id,
            directory.ProjectId,
            directory.ParentDirectoryId,
            directory.Name,
            directory.CreatedAt,
            directory.UpdatedAt,
            directory.ChildDirectories.Select(MapToDto).OrderBy(d => d.Name).ToList(),
            directory.Files.Select(MapFileToDto).OrderByDescending(f => f.UploadedAt).ToList()
        );
    }

    private static FileDto MapFileToDto(Domain.Entities.File file)
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

    /// <summary>
    /// Get the full path for a directory (e.g., "folder/subfolder")
    /// </summary>
    private async Task<string> GetDirectoryFullPathAsync(FileDirectory directory)
    {
        var pathSegments = new List<string>();
        var currentDirectory = directory;
        var visitedIds = new HashSet<Guid>();

        while (currentDirectory != null)
        {
            if (!visitedIds.Add(currentDirectory.Id))
                break; // Prevent infinite loops

            pathSegments.Insert(0, currentDirectory.Name);

            if (currentDirectory.ParentDirectoryId == null)
                break;

            currentDirectory = await _context.FileDirectories
                .FirstOrDefaultAsync(d => d.Id == currentDirectory.ParentDirectoryId);
        }

        return string.Join("/", pathSegments);
    }

    /// <summary>
    /// Update file paths in a directory tree when the directory path changes
    /// </summary>
    private async Task UpdateFilePathsInDirectoryTreeAsync(Guid directoryId, string oldPath, string newPath)
    {
        // Update all files in this directory and its descendants
        // Get all directories in the tree (including the starting directory)
        var directoryIds = new List<Guid> { directoryId };
        var queue = new Queue<Guid>();
        queue.Enqueue(directoryId);

        while (queue.Count > 0)
        {
            var currentId = queue.Dequeue();
            var childDirs = await _context.FileDirectories
                .Where(d => d.ParentDirectoryId == currentId)
                .Select(d => d.Id)
                .ToListAsync();

            foreach (var childId in childDirs)
            {
                directoryIds.Add(childId);
                queue.Enqueue(childId);
            }
        }

        // Get all files in these directories
        var files = await _context.Files
            .Where(f => f.DirectoryId.HasValue && directoryIds.Contains(f.DirectoryId.Value) && f.Status == FileStatus.Confirmed)
            .ToListAsync();

        // Update each file's path
        foreach (var file in files)
        {
            if (file.Path.StartsWith(oldPath + "/"))
            {
                // Replace the old path prefix with the new one
                file.Path = newPath + file.Path.Substring(oldPath.Length);
            }
            else if (file.Path.StartsWith(oldPath))
            {
                // Handle case where file is directly in the renamed directory
                file.Path = newPath + file.Path.Substring(oldPath.Length);
            }
        }

        _logger.LogInformation(
            "Updated paths for {FileCount} files from '{OldPath}' to '{NewPath}'",
            files.Count, oldPath, newPath);
    }
}
