using System.ComponentModel;
using System.Text.Json;
using Deckle.Domain.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ModelContextProtocol.Server;

namespace Deckle.MCP.Tools;

[McpServerToolType]
public sealed class FileTools(AppDbContext db, IHttpContextAccessor httpContextAccessor)
    : BaseMcpTool(db, httpContextAccessor)
{
    [McpServerTool, Description("List all files in a project, optionally filtered by tag.")]
    public async Task<string> ListFiles(
        [Description("The project ID.")] Guid projectId,
        [Description("Optional tag to filter files by.")] string? tag = null)
    {
        if (!await HasProjectAccessAsync(projectId))
            return McpErrors.ProjectNotFound;

        var query = Db.Files
            .Where(f => f.ProjectId == projectId &&
                        f.Status == Deckle.Domain.Entities.FileStatus.Confirmed);

        if (tag != null)
            query = query.Where(f => f.Tags.Contains(tag));

        var files = await query
            .Select(f => new
            {
                f.Id,
                f.FileName,
                f.Path,
                f.ContentType,
                f.Tags,
                f.DirectoryId,
                f.UploadedAt
            })
            .OrderBy(f => f.Path)
            .ToListAsync();

        return JsonSerializer.Serialize(files);
    }

    [McpServerTool, Description("List all directories in a project.")]
    public async Task<string> ListDirectories(
        [Description("The project ID.")] Guid projectId)
    {
        if (!await HasProjectAccessAsync(projectId))
            return McpErrors.ProjectNotFound;

        var dirs = await Db.FileDirectories
            .Where(d => d.ProjectId == projectId)
            .Select(d => new
            {
                d.Id,
                d.Name,
                d.ParentDirectoryId,
                d.CreatedAt
            })
            .OrderBy(d => d.Name)
            .ToListAsync();

        return JsonSerializer.Serialize(dirs);
    }

    [McpServerTool, Description("List tags used across all files in a project.")]
    public async Task<string> ListFileTags(
        [Description("The project ID.")] Guid projectId)
    {
        if (!await HasProjectAccessAsync(projectId))
            return McpErrors.ProjectNotFound;

        var tags = await Db.Files
            .Where(f => f.ProjectId == projectId && f.Status == Deckle.Domain.Entities.FileStatus.Confirmed)
            .SelectMany(f => f.Tags)
            .Distinct()
            .OrderBy(t => t)
            .ToListAsync();

        return JsonSerializer.Serialize(tags);
    }
}
