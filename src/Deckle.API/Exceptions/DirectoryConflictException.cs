using Deckle.API.DTOs;

namespace Deckle.API.Exceptions;

/// <summary>
/// Exception thrown when a directory move operation encounters a naming conflict
/// </summary>
public class DirectoryConflictException : Exception
{
    public DirectoryMoveConflictDto Conflict { get; }

    public DirectoryConflictException(DirectoryMoveConflictDto conflict)
        : base(conflict.Message)
    {
        Conflict = conflict;
    }
}
