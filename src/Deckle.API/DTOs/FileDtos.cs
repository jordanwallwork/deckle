namespace Deckle.API.DTOs;

public record FileDto(
    Guid Id,
    Guid ProjectId,
    string FileName,
    string ContentType,
    long FileSizeBytes,
    DateTime UploadedAt,
    FileUploaderDto UploadedBy,
    List<string> Tags
);

public record FileUploaderDto(
    Guid UserId,
    string Email,
    string? Name
);

public record RequestUploadUrlRequest(
    string FileName,
    string ContentType,
    long FileSizeBytes,
    List<string>? Tags
);

public record RequestUploadUrlResponse(
    Guid FileId,
    string UploadUrl,
    DateTime ExpiresAt
);

public record GenerateDownloadUrlResponse(
    string DownloadUrl,
    DateTime ExpiresAt
);

public record UserStorageQuotaDto(
    int QuotaMb,
    long UsedBytes,
    long AvailableBytes,
    double UsedPercentage
);

public record UpdateFileTagsRequest(
    List<string> Tags
);

public record FileTagsResponse(
    List<string> Tags
);
