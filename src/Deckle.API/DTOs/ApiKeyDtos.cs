namespace Deckle.API.DTOs;

public record ApiKeyDto(Guid Id, string Name, DateTime CreatedAt, DateTime? LastUsedAt);

public record CreateApiKeyRequest(string Name);

public record CreateApiKeyResponse(Guid Id, string Name, string Key, DateTime CreatedAt);
