using MediatR;

namespace Deckle.API.Events.NewUserRegistration;

/// <summary>
/// Published when a new user completes registration by setting their username.
/// </summary>
public record NewUserRegistrationEvent : INotification
{
    public required Guid UserId { get; init; }
    public required string Username { get; init; }
    public required string Name { get; init; }
    public required string Email { get; init; }
    public required DateTime SignupDate { get; init; }
}
