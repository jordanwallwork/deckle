using Deckle.API.DTOs;
using Deckle.API.Filters;
using Deckle.API.Services;

namespace Deckle.API.Endpoints;

public static class FileEndpoints
{
    public static RouteGroupBuilder MapFileEndpoints(this IEndpointRouteBuilder routes)
    {
        var projectFilesGroup = routes.MapGroup("/projects/{projectId:guid}/files")
            .WithTags("Files")
            .RequireAuthorization()
            .RequireUserId();

        // Request upload URL
        projectFilesGroup.MapPost("/upload-url", async (
            Guid projectId,
            HttpContext httpContext,
            FileService fileService,
            RequestUploadUrlRequest request) =>
        {
            var userId = httpContext.GetUserId();

            try
            {
                var response = await fileService.RequestUploadUrlAsync(
                    userId,
                    projectId,
                    request.FileName,
                    request.ContentType,
                    request.FileSizeBytes);

                return Results.Ok(response);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Unauthorized();
            }
        })
        .WithName("RequestFileUploadUrl")
        .WithDescription("Request a presigned URL for uploading a file to the project");

        // List project files
        projectFilesGroup.MapGet("", async (
            Guid projectId,
            HttpContext httpContext,
            FileService fileService) =>
        {
            var userId = httpContext.GetUserId();
            var files = await fileService.GetProjectFilesAsync(userId, projectId);
            return Results.Ok(files);
        })
        .WithName("GetProjectFiles")
        .WithDescription("Get all files for a project");

        var filesGroup = routes.MapGroup("/files")
            .WithTags("Files")
            .RequireAuthorization()
            .RequireUserId();

        // Confirm upload
        filesGroup.MapPost("/{fileId:guid}/confirm", async (
            Guid fileId,
            HttpContext httpContext,
            FileService fileService) =>
        {
            var userId = httpContext.GetUserId();

            try
            {
                var file = await fileService.ConfirmUploadAsync(userId, fileId);
                return Results.Ok(file);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Unauthorized();
            }
        })
        .WithName("ConfirmFileUpload")
        .WithDescription("Confirm that a file upload has completed successfully");

        // Generate download URL
        filesGroup.MapGet("/{fileId:guid}/download-url", async (
            Guid fileId,
            HttpContext httpContext,
            FileService fileService) =>
        {
            var userId = httpContext.GetUserId();

            try
            {
                var response = await fileService.GenerateDownloadUrlAsync(userId, fileId);
                return Results.Ok(response);
            }
            catch (InvalidOperationException ex)
            {
                return Results.NotFound(new { error = ex.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Unauthorized();
            }
        })
        .WithName("GenerateFileDownloadUrl")
        .WithDescription("Generate a presigned URL for downloading a file");

        // Delete file
        filesGroup.MapDelete("/{fileId:guid}", async (
            Guid fileId,
            HttpContext httpContext,
            FileService fileService) =>
        {
            var userId = httpContext.GetUserId();

            try
            {
                var success = await fileService.DeleteFileAsync(userId, fileId);
                if (!success)
                {
                    return Results.NotFound();
                }

                return Results.NoContent();
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Unauthorized();
            }
        })
        .WithName("DeleteFile")
        .WithDescription("Delete a file from the project");

        // Get user quota
        var userGroup = routes.MapGroup("/user")
            .WithTags("User")
            .RequireAuthorization()
            .RequireUserId();

        userGroup.MapGet("/storage-quota", async (
            HttpContext httpContext,
            FileService fileService) =>
        {
            var userId = httpContext.GetUserId();
            var quota = await fileService.GetUserQuotaAsync(userId);
            return Results.Ok(quota);
        })
        .WithName("GetUserStorageQuota")
        .WithDescription("Get the current user's storage quota information");

        return projectFilesGroup;
    }
}
