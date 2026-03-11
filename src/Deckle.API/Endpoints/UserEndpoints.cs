using Deckle.API.DTOs;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Deckle.API.Endpoints;

public static class UserEndpoints
{
    public static RouteGroupBuilder MapUserEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/users")
            .WithTags("Users");

        // Public profile endpoint — no authentication required
        group.MapGet("{username}", async (string username, AppDbContext dbContext) =>
        {
            var user = await dbContext.Users
                .Where(u => u.Username != null && u.Username.ToLower() == username.ToLower())
                .FirstOrDefaultAsync();

            if (user == null)
            {
                return Results.NotFound();
            }

            var projects = await dbContext.UserProjects
                .Where(up =>
                    up.UserId == user.Id &&
                    up.Role == ProjectRole.Owner &&
                    (up.Project.Visibility == ProjectVisibility.Public ||
                     up.Project.Visibility == ProjectVisibility.Teaser))
                .OrderBy(up => up.Project.Name)
                .Select(up => new PublicProjectSummaryDto
                {
                    Name = up.Project.Name,
                    Code = up.Project.Code,
                    Description = up.Project.Description,
                    Visibility = up.Project.Visibility.ToString(),
                    OwnerUsername = user.Username!
                })
                .ToListAsync();

            var links = user.ExternalLinks != null
                ? JsonSerializer.Deserialize<List<ExternalLinkDto>>(user.ExternalLinks)
                : null;

            return Results.Ok(new PublicUserProfileDto
            {
                Username = user.Username!,
                Name = user.Name,
                Bio = user.Bio,
                Picture = user.PictureUrl,
                ExternalLinks = links,
                Projects = projects
            });
        })
        .AllowAnonymous()
        .WithName("GetPublicUserProfile");

        return group;
    }
}
