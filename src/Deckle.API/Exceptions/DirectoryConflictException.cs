using Deckle.API.DTOs;

namespace Deckle.API.Exceptions;

/// <summary>
/// Exception thrown when a directory move operation encounters a naming conflict
/// </summary>
public class DirectoryConflictException : Exception
{
    public DirectoryMoveConflictDto? Conflict { get; }

    public DirectoryConflictException()
        : base("A directory conflict occurred")
    {
    }

    public DirectoryConflictException(string message)
        : base(message)
    {
    }

    public DirectoryConflictException(string message, Exception innerException)
        : base(message, innerException)
    {
    }

    public DirectoryConflictException(DirectoryMoveConflictDto conflict)
        : base(conflict.Message)
    {
        Conflict = conflict;
    }
}
