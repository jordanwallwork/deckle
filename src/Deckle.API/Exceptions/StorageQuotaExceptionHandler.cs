using Deckle.Domain.Exceptions;
using Microsoft.AspNetCore.Diagnostics;

namespace Deckle.API.Exceptions;

public class StorageQuotaExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is not StorageQuotaExceededException sqe)
            return false;

        httpContext.Response.StatusCode = StatusCodes.Status413PayloadTooLarge;
        await httpContext.Response.WriteAsJsonAsync(new
        {
            type = "https://tools.ietf.org/html/rfc9110#section-15.5.14",
            title = "Storage Quota Exceeded",
            status = 413,
            detail = sqe.Message,
            quotaBytes = sqe.QuotaBytes,
            usedBytes = sqe.CurrentUsedBytes,
            requestedDeltaBytes = sqe.RequestedDeltaBytes,
            availableBytes = sqe.AvailableBytes
        }, cancellationToken);

        return true;
    }
}
