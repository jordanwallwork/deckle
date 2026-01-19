using Deckle.API.DTOs;
using Deckle.API.Exceptions;
using Deckle.API.Filters;
using Deckle.API.Services;

namespace Deckle.API.Endpoints;

public static class FileDirectoryEndpoints
{
    public static RouteGroupBuilder MapFileDirectoryEndpoints(this IEndpointRouteBuilder routes)
    {
        var projectDirectoriesGroup = routes.MapGroup("/projects/{projectId:guid}/directories")
            .WithTags("File Directories")
            .RequireAuthorization()
            .RequireUserId();

        // Create directory
        projectDirectoriesGroup.MapPost("", async (
            Guid projectId,
            HttpContext httpContext,
            FileDirectoryService directoryService,
            CreateFileDirectoryRequest request) =>
        {
            var userId = httpContext.GetUserId();

            try
            {
                var directory = await directoryService.CreateDirectoryAsync(
                    userId,
                    projectId,
                    request.Name,
                    request.ParentDirectoryId);

                return Results.Created($"/projects/{projectId}/directories/{directory.Id}", directory);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(new { error = ex.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Unauthorized();
            }
        })
        .WithName("CreateFileDirectory")
        .WithDescription("Create a new directory in a project");

        // List all directories for a project
        projectDirectoriesGroup.MapGet("", async (
            Guid projectId,
            HttpContext httpContext,
            FileDirectoryService directoryService) =>
        {
            var userId = httpContext.GetUserId();
            var directories = await directoryService.GetProjectDirectoriesAsync(userId, projectId);
            return Results.Ok(directories);
        })
        .WithName("GetProjectDirectories")
        .WithDescription("Get all directories for a project");

        // Get directory by path (e.g., /by-path?path=folder1/folder2)
        projectDirectoriesGroup.MapGet("/by-path", async (
            Guid projectId,
            HttpContext httpContext,
            FileDirectoryService directoryService,
            string? path) =>
        {
            var userId = httpContext.GetUserId();
            var contents = await directoryService.GetDirectoryByPathAsync(userId, projectId, path ?? "");

            if (contents == null)
            {
                return Results.NotFound();
            }

            return Results.Ok(contents);
        })
        .WithName("GetDirectoryByPath")
        .WithDescription("Get a directory and its contents by path (e.g., folder1/folder2). Empty path returns root.");

        // Get root contents (directories and files at root level)
        projectDirectoriesGroup.MapGet("/root", async (
            Guid projectId,
            HttpContext httpContext,
            FileDirectoryService directoryService) =>
        {
            var userId = httpContext.GetUserId();
            var contents = await directoryService.GetRootContentsAsync(userId, projectId);

            if (contents == null)
            {
                return Results.NotFound();
            }

            return Results.Ok(contents);
        })
        .WithName("GetRootDirectoryContents")
        .WithDescription("Get files and directories at the root level of a project");

        // Get directory with its contents
        projectDirectoriesGroup.MapGet("/{directoryId:guid}", async (
            Guid projectId,
            Guid directoryId,
            HttpContext httpContext,
            FileDirectoryService directoryService) =>
        {
            var userId = httpContext.GetUserId();
            var directory = await directoryService.GetDirectoryWithContentsAsync(userId, projectId, directoryId);

            if (directory == null)
            {
                return Results.NotFound();
            }

            return Results.Ok(directory);
        })
        .WithName("GetDirectoryWithContents")
        .WithDescription("Get a directory with its files and subdirectories");

        var directoriesGroup = routes.MapGroup("/directories")
            .WithTags("File Directories")
            .RequireAuthorization()
            .RequireUserId();

        // Rename directory
        directoriesGroup.MapPatch("/{directoryId:guid}/rename", async (
            Guid directoryId,
            HttpContext httpContext,
            FileDirectoryService directoryService,
            RenameFileDirectoryRequest request) =>
        {
            var userId = httpContext.GetUserId();

            try
            {
                var directory = await directoryService.RenameDirectoryAsync(userId, directoryId, request.Name);
                return Results.Ok(directory);
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(new { error = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Unauthorized();
            }
        })
        .WithName("RenameFileDirectory")
        .WithDescription("Rename a directory");

        // Move directory
        directoriesGroup.MapPatch("/{directoryId:guid}/move", async (
            Guid directoryId,
            HttpContext httpContext,
            FileDirectoryService directoryService,
            MoveFileDirectoryRequest request) =>
        {
            var userId = httpContext.GetUserId();

            try
            {
                var directory = await directoryService.MoveDirectoryAsync(
                    userId,
                    directoryId,
                    request.ParentDirectoryId,
                    request.Merge);
                return Results.Ok(directory);
            }
            catch (DirectoryConflictException ex)
            {
                return Results.Conflict(ex.Conflict);
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(new { error = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Unauthorized();
            }
        })
        .WithName("MoveFileDirectory")
        .WithDescription("Move a directory to a new parent (or to root if ParentDirectoryId is null). Set Merge=true to merge contents when a directory with the same name exists.");

        // Delete directory
        directoriesGroup.MapDelete("/{directoryId:guid}", async (
            Guid directoryId,
            HttpContext httpContext,
            FileDirectoryService directoryService) =>
        {
            var userId = httpContext.GetUserId();

            try
            {
                var success = await directoryService.DeleteDirectoryAsync(userId, directoryId);
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
        .WithName("DeleteFileDirectory")
        .WithDescription("Delete a directory and all its subdirectories (files are moved to root)");

        return projectDirectoriesGroup;
    }
}
