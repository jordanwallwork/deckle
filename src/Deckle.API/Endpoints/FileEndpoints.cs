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
            IFileService fileService,
            RequestUploadUrlRequest request) =>
        {
            var userId = httpContext.GetUserId();

            var response = await fileService.RequestUploadUrlAsync(
                userId,
                projectId,
                request.FileName,
                request.ContentType,
                request.FileSizeBytes,
                request.Tags,
                request.DirectoryId);

            return Results.Ok(response);
        })
        .WithName("RequestFileUploadUrl")
        .WithDescription("Request a presigned URL for uploading a file to the project");

        // List project files
        projectFilesGroup.MapGet("", async (
            Guid projectId,
            HttpContext httpContext,
            IFileService fileService,
            string? tags,
            bool? matchAll,
            Guid? directoryId,
            bool? inRoot) =>
        {
            var userId = httpContext.GetUserId();
            var filterTags = string.IsNullOrEmpty(tags)
                ? null
                : tags.Split(',').Select(t => t.Trim()).ToList();
            var useAndLogic = matchAll ?? false;

            // directoryIdSpecified: true if directoryId is provided OR inRoot is true
            var directoryIdSpecified = directoryId.HasValue || (inRoot == true);
            // If inRoot is true, directoryId should be null (root level)
            var effectiveDirectoryId = (inRoot == true) ? null : directoryId;

            var files = await fileService.GetProjectFilesAsync(
                userId, projectId, filterTags, useAndLogic, effectiveDirectoryId, directoryIdSpecified);
            return Results.Ok(files);
        })
        .WithName("GetProjectFiles")
        .WithDescription("Get all files for a project, optionally filtered by tags and/or directory");

        // Get project tags (for autocomplete)
        projectFilesGroup.MapGet("/tags", async (
            Guid projectId,
            HttpContext httpContext,
            IFileService fileService) =>
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
            IFileService fileService) =>
        {
            var userId = httpContext.GetUserId();

            var file = await fileService.ConfirmUploadAsync(userId, fileId);
            return Results.Ok(file);
        })
        .WithName("ConfirmFileUpload")
        .WithDescription("Confirm that a file upload has completed successfully");

        // Update file tags
        filesGroup.MapPatch("/{fileId:guid}/tags", async (
            Guid fileId,
            HttpContext httpContext,
            IFileService fileService,
            UpdateFileTagsRequest request) =>
        {
            var userId = httpContext.GetUserId();

            var file = await fileService.UpdateFileTagsAsync(userId, fileId, request.Tags);
            return Results.Ok(file);
        })
        .WithName("UpdateFileTags")
        .WithDescription("Update tags for a file");

        // Rename file
        filesGroup.MapPatch("/{fileId:guid}/rename", async (
            Guid fileId,
            HttpContext httpContext,
            IFileService fileService,
            ILogger<FileService> logger, // Keep logger for potential logging of success or specific cases if needed in the future
            RenameFileRequest request) =>
        {
            var userId = httpContext.GetUserId();

            var file = await fileService.RenameFileAsync(userId, fileId, request.NewFileName);
            return Results.Ok(file);
        })
        .WithName("RenameFile")
        .WithDescription("Rename a file while preserving its extension");

        // Move file to a different directory
        filesGroup.MapPatch("/{fileId:guid}/move", async (
            Guid fileId,
            HttpContext httpContext,
            IFileService fileService,
            MoveFileRequest request) =>
        {
            var userId = httpContext.GetUserId();

            var file = await fileService.MoveFileAsync(userId, fileId, request.DirectoryId);
            return Results.Ok(file);
        })
        .WithName("MoveFile")
        .WithDescription("Move a file to a different directory (or to root if DirectoryId is null)");

        // Delete file
        filesGroup.MapDelete("/{fileId:guid}", async (
            Guid fileId,
            HttpContext httpContext,
            IFileService fileService) =>
        {
            var userId = httpContext.GetUserId();

            await fileService.DeleteFileAsync(userId, fileId);

            return Results.NoContent();
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
            IFileService fileService) =>
        {
            var userId = httpContext.GetUserId();
            var quota = await fileService.GetUserQuotaAsync(userId);
            return Results.Ok(quota);
        })
        .WithName("GetUserStorageQuota")
        .WithDescription("Get the current user's storage quota information");

        // File redirect endpoint - GET /api/file/{projectId}?filename={filename}
        var fileRedirectGroup = routes.MapGroup("/file")
            .WithTags("Files")
            .RequireAuthorization()
            .RequireUserId();

        fileRedirectGroup.MapGet("/{projectId:guid}", async (
            Guid projectId,
            string filename,
            HttpContext httpContext,
            IFileService fileService,
            ICloudflareR2Service r2Service) =>
        {
            var userId = httpContext.GetUserId();

            // Normalize the path: URL decode and trim leading/trailing slashes
            var normalizedPath = Uri.UnescapeDataString(filename).Trim('/');

            // Get file with authorization check using path-based lookup
            var file = await fileService.GetFileByProjectAndPathAsync(userId, projectId, normalizedPath);

            // Return 404 if file not found or user doesn't have access
            if (file == null)
            {
                return Results.NotFound();
            }

            // Generate pre-signed URL
            var downloadUrl = r2Service.GenerateDownloadUrl(file.StorageKey, file.FileName);

            // Return 302 redirect
            return Results.Redirect(downloadUrl);
        })
        .WithName("GetFileByProjectAndPath")
        .WithDescription("Get a file by project ID and path (e.g., 'folder/subfolder/image.png'), returning a 302 redirect to a pre-signed download URL");

        return projectFilesGroup;
    }
}
