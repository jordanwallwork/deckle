namespace Deckle.API.DTOs;

/// <summary>
/// Standard validation error response following a similar pattern to ASP.NET's ValidationProblemDetails.
/// </summary>
public record ValidationErrorResponse
{
    /// <summary>
    /// Dictionary of field names to their validation error messages.
    /// Use empty string "" as the key for errors not associated with a specific field.
    /// </summary>
    public required Dictionary<string, string[]> Errors { get; init; }
}

/// <summary>
/// Represents a validation error for a specific field.
/// </summary>
public record FieldError(string Field, string Message);

/// <summary>
/// Builder class to construct validation error responses.
/// </summary>
public class ValidationErrorBuilder
{
    private readonly Dictionary<string, List<string>> _errors = [];

    public ValidationErrorBuilder AddError(string field, string message)
    {
        if (!_errors.TryGetValue(field, out var value))
        {
            value = [];
            _errors[field] = value;
        }

        value.Add(message);
        return this;
    }

    public ValidationErrorBuilder AddGeneralError(string message)
    {
        return AddError("", message);
    }

    public bool HasErrors => _errors.Count > 0;

    public ValidationErrorResponse Build()
    {
        return new ValidationErrorResponse
        {
            Errors = _errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value.ToArray())
        };
    }
}
