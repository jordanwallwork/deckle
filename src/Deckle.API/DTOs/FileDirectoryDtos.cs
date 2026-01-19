namespace Deckle.API.DTOs;

public record FileDirectoryDto(
    Guid Id,
    Guid ProjectId,
    Guid? ParentDirectoryId,
    string Name,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record FileDirectoryWithContentsDto(
    Guid Id,
    Guid ProjectId,
    Guid? ParentDirectoryId,
    string Name,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<FileDirectoryDto> ChildDirectories,
    List<FileDto> Files
);

public record CreateFileDirectoryRequest(
    string Name,
    Guid? ParentDirectoryId
);

public record RenameFileDirectoryRequest(
    string Name
);

public record MoveFileDirectoryRequest(
    Guid? ParentDirectoryId,
    bool Merge = false
);

/// <summary>
/// Response returned when a directory move would cause a name conflict
/// </summary>
public record DirectoryMoveConflictDto(
    Guid SourceDirectoryId,
    string SourceDirectoryName,
    Guid ConflictingDirectoryId,
    string ConflictingDirectoryName,
    string Message
);
