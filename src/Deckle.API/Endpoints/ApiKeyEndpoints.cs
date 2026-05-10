using System.Security.Cryptography;
using System.Text;
using Deckle.API.DTOs;
using Deckle.API.Filters;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deckle.API.Endpoints;

public static class ApiKeyEndpoints
{
    public static RouteGroupBuilder MapApiKeyEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api-keys")
            .WithTags("API Keys")
            .RequireAuthorization()
            .RequireUserId();

        group.MapGet("", async (HttpContext ctx, AppDbContext db) =>
        {
            var userId = ctx.GetUserId();
            var keys = await db.ApiKeys
                .Where(k => k.UserId == userId)
                .OrderByDescending(k => k.CreatedAt)
                .Select(k => new ApiKeyDto(k.Id, k.Name, k.CreatedAt, k.LastUsedAt))
                .ToListAsync();
            return Results.Ok(keys);
        })
        .WithName("ListApiKeys");

        group.MapPost("", async (HttpContext ctx, AppDbContext db, CreateApiKeyRequest request) =>
        {
            var userId = ctx.GetUserId();

            var rawBytes = RandomNumberGenerator.GetBytes(32);
            var rawKey = "dk_" + Convert.ToBase64String(rawBytes)
                .Replace('+', '-').Replace('/', '_').TrimEnd('=');

            var keyHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawKey)));

            var apiKey = new ApiKey
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Name = request.Name,
                KeyHash = keyHash,
                CreatedAt = DateTime.UtcNow
            };

            db.ApiKeys.Add(apiKey);
            await db.SaveChangesAsync();

            return Results.Created(
                $"/api-keys/{apiKey.Id}",
                new CreateApiKeyResponse(apiKey.Id, apiKey.Name, rawKey, apiKey.CreatedAt));
        })
        .WithName("CreateApiKey");

        group.MapDelete("{id:guid}", async (Guid id, HttpContext ctx, AppDbContext db) =>
        {
            var userId = ctx.GetUserId();
            var key = await db.ApiKeys.FirstOrDefaultAsync(k => k.Id == id && k.UserId == userId);
            if (key == null)
                return Results.NotFound();

            db.ApiKeys.Remove(key);
            await db.SaveChangesAsync();
            return Results.NoContent();
        })
        .WithName("DeleteApiKey");

        return group;
    }
}
