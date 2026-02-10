using Deckle.API.DTOs;

namespace Deckle.API.Exceptions;

/// <summary>
/// Exception thrown when validation fails. Contains field-level error information.
/// </summary>
public class ValidationException : Exception
{
    public ValidationErrorResponse ErrorResponse { get; }

    public ValidationException()
        : base("Validation failed")
    {
        ErrorResponse = new ValidationErrorResponse { Errors = [] };
    }

    public ValidationException(string message)
        : base(message)
    {
        ErrorResponse = new ValidationErrorResponse { Errors = [] };
    }

    public ValidationException(string message, Exception innerException)
        : base(message, innerException)
    {
        ErrorResponse = new ValidationErrorResponse { Errors = [] };
    }

    public ValidationException(ValidationErrorResponse errorResponse)
        : base("Validation failed")
    {
        ErrorResponse = errorResponse;
    }

    public static ValidationException ForField(string field, string message)
    {
        return new ValidationException(new ValidationErrorResponse
        {
            Errors = new Dictionary<string, string[]> { { field, [message] } }
        });
    }

    public static ValidationException FromBuilder(ValidationErrorBuilder builder)
    {
        return new ValidationException(builder.Build());
    }
}
