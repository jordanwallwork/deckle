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
                    request.FileSizeBytes,
                    request.Tags);

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
            FileService fileService,
            string? tags,
            bool? matchAll) =>
        {
            var userId = httpContext.GetUserId();
            var filterTags = string.IsNullOrEmpty(tags)
                ? null
                : tags.Split(',').Select(t => t.Trim()).ToList();
            var useAndLogic = matchAll ?? false;

            var files = await fileService.GetProjectFilesAsync(userId, projectId, filterTags, useAndLogic);
            return Results.Ok(files);
        })
        .WithName("GetProjectFiles")
        .WithDescription("Get all files for a project, optionally filtered by tags");

        // Get project tags (for autocomplete)
        projectFilesGroup.MapGet("/tags", async (
            Guid projectId,
            HttpContext httpContext,
            FileService fileService) =>
        {
            var userId = httpContext.GetUserId();
            var tags = await fileService.GetProjectTagsAsync(userId, projectId);
            return Results.Ok(new FileTagsResponse(tags));
        })
        .WithName("GetProjectFileTags")
        .WithDescription("Get all distinct tags used in project files (for autocomplete)");

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

        // Update file tags
        filesGroup.MapPatch("/{fileId:guid}/tags", async (
            Guid fileId,
            HttpContext httpContext,
            FileService fileService,
            UpdateFileTagsRequest request) =>
        {
            var userId = httpContext.GetUserId();

            try
            {
                var file = await fileService.UpdateFileTagsAsync(userId, fileId, request.Tags);
                return Results.Ok(file);
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
        .WithName("UpdateFileTags")
        .WithDescription("Update tags for a file");

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
