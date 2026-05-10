using Deckle.Domain.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Deckle.MCP.Tools;

public abstract class BaseMcpTool(AppDbContext db, IHttpContextAccessor httpContextAccessor)
{
    protected AppDbContext Db { get; } = db;
    protected Guid UserId => GetUserId();

    private Guid GetUserId()
    {
        var claim = httpContextAccessor.HttpContext?.User?.FindFirst("user_id")?.Value;
        return Guid.TryParse(claim, out var id) ? id : throw new UnauthorizedAccessException("Not authenticated");
    }

    protected async Task<bool> HasProjectAccessAsync(Guid projectId) =>
        await Db.UserProjects.AnyAsync(up => up.UserId == UserId && up.ProjectId == projectId);
}
