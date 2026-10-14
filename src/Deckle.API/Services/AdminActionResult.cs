using Deckle.API.DTOs;

namespace Deckle.API.Services;

public enum AdminActionStatus
{
    Success,
    NotFound,
    Invalid
}

/// <summary>
/// Outcome of an admin user-management action: the updated user on success,
/// or why the action was rejected.
/// </summary>
public sealed record AdminActionResult(AdminActionStatus Status, AdminUserDetailDto? User = null, string? Error = null)
{
    public static AdminActionResult Ok(AdminUserDetailDto user) => new(AdminActionStatus.Success, user);

    public static AdminActionResult NotFound() => new(AdminActionStatus.NotFound, Error: "User not found");

    public static AdminActionResult Invalid(string error) => new(AdminActionStatus.Invalid, Error: error);
}
