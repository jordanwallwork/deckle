using Deckle.API.Services.Storage;
using Microsoft.AspNetCore.Http.Features;

namespace Deckle.API.Endpoints;

/// <summary>
/// Upload/download endpoints for local file storage, standing in for R2 presigned URLs.
/// Only mapped when local storage is configured. Requests are authorized by the signed token
/// rather than the user's session, since the browser uploads without credentials.
/// </summary>
public static class LocalStorageEndpoints
{
    public static RouteGroupBuilder MapLocalStorageEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup(LocalFileStorage.EndpointPath)
            .AllowAnonymous()
            .ExcludeFromDescription();

        group.MapPut("", async (string token, HttpContext httpContext, LocalFileStorage storage) =>
        {
            if (!storage.TryReadToken(token, StorageOperation.Upload, out var payload))
            {
                return Results.StatusCode(StatusCodes.Status403Forbidden);
            }

            var requestContentType = httpContext.Request.ContentType?.Split(';')[0].Trim();
            if (!string.Equals(requestContentType, payload.ContentType, StringComparison.OrdinalIgnoreCase))
            {
                return Results.BadRequest("Content-Type does not match the requested upload");
            }

            if (httpContext.Request.ContentLength > payload.MaxBytes)
            {
                return Results.StatusCode(StatusCodes.Status413PayloadTooLarge);
            }

            // Kestrel's default body limit (30MB) is below the maximum file size
            var bodySizeFeature = httpContext.Features.Get<IHttpMaxRequestBodySizeFeature>();
            if (bodySizeFeature is { IsReadOnly: false })
            {
                bodySizeFeature.MaxRequestBodySize = payload.MaxBytes;
            }

            var saved = await storage.SaveAsync(payload.StorageKey, httpContext.Request.Body, payload.MaxBytes, httpContext.RequestAborted);
            return saved
                ? Results.Ok()
                : Results.StatusCode(StatusCodes.Status413PayloadTooLarge);
        });

        group.MapGet("", (string token, HttpContext httpContext, LocalFileStorage storage) =>
        {
            if (!storage.TryReadToken(token, StorageOperation.Download, out var payload))
            {
                return Results.StatusCode(StatusCodes.Status403Forbidden);
            }

            var stream = storage.OpenRead(payload.StorageKey);
            if (stream is null)
            {
                return Results.NotFound();
            }

            httpContext.Response.Headers.ContentDisposition = $"inline; filename=\"{payload.FileName}\"";
            // Neutralise scripts in user-uploaded SVGs, which are served from the API origin
            httpContext.Response.Headers.ContentSecurityPolicy = "sandbox";

            return Results.File(stream, payload.ContentType);
        });

        return group;
    }
}
