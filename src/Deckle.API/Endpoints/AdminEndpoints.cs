using Deckle.API.DTOs;
using Deckle.API.Services;

namespace Deckle.API.Endpoints;

public static class AdminEndpoints
{
    public static RouteGroupBuilder MapAdminEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/admin")
            .WithTags("Admin")
            .RequireAuthorization("AdminOnly");

        // GET /admin/users - List all users with pagination and search
        group.MapGet("/users", async (
            AdminService adminService,
            int page = 1,
            int pageSize = 20,
            string? search = null) =>
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 20;

            var result = await adminService.GetUsersAsync(page, pageSize, search);
            return Results.Ok(result);
        })
        .WithName("GetAdminUsers");

        // GET /admin/users/{id} - Get a specific user by ID
        group.MapGet("/users/{id:guid}", async (
            Guid id,
            AdminService adminService) =>
        {
            var user = await adminService.GetUserByIdAsync(id);
            if (user == null)
            {
                return Results.NotFound(new { error = "User not found" });
            }
            return Results.Ok(user);
        })
        .WithName("GetAdminUser");

        // PUT /admin/users/{id}/role - Update user role
        group.MapPut("/users/{id:guid}/role", async (
            Guid id,
            UpdateUserRoleRequest request,
            AdminService adminService) =>
        {
            var user = await adminService.UpdateUserRoleAsync(id, request.Role);
            if (user == null)
            {
                return Results.BadRequest(new { error = "Invalid role or user not found" });
            }
            return Results.Ok(user);
        })
        .WithName("UpdateAdminUserRole");

        // PUT /admin/users/{id}/quota - Update user storage quota
        group.MapPut("/users/{id:guid}/quota", async (
            Guid id,
            UpdateUserQuotaRequest request,
            AdminService adminService) =>
        {
            var user = await adminService.UpdateUserQuotaAsync(id, request.StorageQuotaMb);
            if (user == null)
            {
                return Results.BadRequest(new { error = "Invalid quota or user not found" });
            }
            return Results.Ok(user);
        })
        .WithName("UpdateAdminUserQuota");

        // GET /admin/samples - List all sample components with pagination, search, and filtering
        group.MapGet("/samples", async (
            AdminService adminService,
            int page = 1,
            int pageSize = 20,
            string? search = null,
            string? type = null) =>
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 20;

            var result = await adminService.GetSampleComponentsAsync(page, pageSize, search, type);
            return Results.Ok(result);
        })
        .WithName("GetAdminSamples");

        return group;
    }
}
