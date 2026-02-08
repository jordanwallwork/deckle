using Deckle.API.DTOs;
using Deckle.API.Filters;
using Deckle.API.Services;
using Deckle.Domain.Entities;
using Microsoft.AspNetCore.Http;

namespace Deckle.API.Endpoints;

public static class AdminEndpoints
{
    public static RouteGroupBuilder MapAdminEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/admin")
            .WithTags("Admin")
            .RequireAuthorization("AdminOnly")
            .RequireUserId();

        MapUserEndpoints(group);
        MapSampleComponentEndpoints(group);
        MapSampleDataSourceEndpoints(group);

        return group;
    }

    private static void MapUserEndpoints(RouteGroupBuilder group)
    {
        // GET /admin/users - List all users with pagination and search
        group.MapGet("/users", async (
            AdminService adminService,
            int page = 1,
            int pageSize = 20,
            string? search = null) =>
        {
            if (page < 1) page = 1;
            if (pageSize is < 1 or > 100) pageSize = 20;

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
    }

    private static void MapSampleComponentEndpoints(RouteGroupBuilder group)
    {
        // GET /admin/samples - List all sample components with pagination, search, and filtering
        group.MapGet("/samples", async (
            ComponentService componentService,
            int page = 1,
            int pageSize = 20,
            string? search = null,
            string? type = null) =>
        {
            if (page < 1) page = 1;
            if (pageSize is < 1 or > 100) pageSize = 20;

            var result = await componentService.GetSampleComponentsAsync(page, pageSize, search, type);
            return Results.Ok(result);
        })
        .WithName("GetAdminSamples");

        // POST /admin/samples/cards - Create a sample card
        group.MapPost("/samples/cards", async (
            CreateCardRequest request,
            HttpContext httpContext,
            ComponentService componentService) =>
        {
            var userId = httpContext.GetUserId();
            var card = await componentService.CreateComponentAsync<Card, CardConfig>(userId, null, new CardConfig(request.Name, request.Size, request.Horizontal));
            return Results.Created($"/admin/samples/{card.Id}", new CardDto(card));
        })
        .WithName("CreateAdminSampleCard");

        // POST /admin/samples/playermats - Create a sample player mat
        group.MapPost("/samples/playermats", async (
            CreatePlayerMatRequest request,
            HttpContext httpContext,
            ComponentService componentService) =>
        {
            var playerMat = await componentService.CreateComponentAsync<PlayerMat, PlayerMatConfig>(
                httpContext.GetUserId(), null,
                new PlayerMatConfig(request.Name, request.PresetSize, request.Horizontal, request.CustomWidthMm, request.CustomHeightMm));
            return Results.Created($"/admin/samples/{playerMat.Id}", new PlayerMatDto(playerMat));
        })
        .WithName("CreateAdminSamplePlayerMat");

        // GET /admin/samples/{id} - Get a sample component by ID
        group.MapGet("/samples/{id:guid}", async (
            Guid id,
            HttpContext httpContext,
            ComponentService componentService) =>
        {
            var component = await componentService.GetComponentByIdAsync(httpContext.GetUserId(), id);
            if (component == null)
            {
                return Results.NotFound(new { error = "Sample component not found" });
            }
            return Results.Ok(component);
        })
        .WithName("GetAdminSample");

        // PUT /admin/samples/{id}/design/{part} - Save a sample component design
        group.MapPut("/samples/{id:guid}/design/{part}", async (
            Guid id,
            string part,
            SaveDesignRequest request,
            HttpContext httpContext,
            ComponentService componentService) =>
        {
            if (part is not "front" and not "back")
            {
                return Results.BadRequest(new { error = "Part must be 'front' or 'back'" });
            }

            var component = await componentService.SaveDesignAsync(httpContext.GetUserId(), id, part, request.Design);
            return component == null
                ? Results.NotFound(new { error = "Sample component not found or not editable" })
                : Results.Ok(component);
        })
        .WithName("SaveAdminSampleDesign");

        // PUT /admin/samples/{id}/datasource - Link/unlink data source to sample component
        group.MapPut("/samples/{id:guid}/datasource", async (
            Guid id,
            UpdateSampleComponentDataSourceRequest request,
            AdminService adminService) =>
        {
            var component = await adminService.UpdateSampleComponentDataSourceAsync(id, request.DataSourceId);
            if (component == null)
            {
                return Results.NotFound(new { error = "Sample component not found or not a data source component" });
            }
            return Results.Ok(component);
        })
        .WithName("UpdateAdminSampleDataSource");
    }

    private static void MapSampleDataSourceEndpoints(RouteGroupBuilder group)
    {
        // GET /admin/data-sources - List all sample data sources with pagination and search
        group.MapGet("/data-sources", async (
            AdminService adminService,
            int page = 1,
            int pageSize = 20,
            string? search = null) =>
        {
            if (page < 1) page = 1;
            if (pageSize is < 1 or > 100) pageSize = 20;

            var result = await adminService.GetSampleDataSourcesAsync(page, pageSize, search);
            return Results.Ok(result);
        })
        .WithName("GetAdminDataSources");

        // GET /admin/data-sources/{id} - Get a sample data source by ID (with JsonData)
        group.MapGet("/data-sources/{id:guid}", async (
            Guid id,
            AdminService adminService) =>
        {
            var dataSource = await adminService.GetSampleDataSourceByIdAsync(id);
            if (dataSource == null)
            {
                return Results.NotFound(new { error = "Sample data source not found" });
            }
            return Results.Ok(dataSource);
        })
        .WithName("GetAdminDataSource");

        // POST /admin/data-sources - Create a sample data source
        group.MapPost("/data-sources", async (
            CreateSampleDataSourceRequest request,
            AdminService adminService) =>
        {
            var dataSource = await adminService.CreateSampleDataSourceAsync(request.Name, request.JsonData);
            return Results.Created($"/admin/data-sources/{dataSource.Id}", dataSource);
        })
        .WithName("CreateAdminDataSource");

        // PUT /admin/data-sources/{id} - Update a sample data source
        group.MapPut("/data-sources/{id:guid}", async (
            Guid id,
            UpdateSampleDataSourceRequest request,
            AdminService adminService) =>
        {
            var dataSource = await adminService.UpdateSampleDataSourceAsync(id, request.Name, request.JsonData);
            if (dataSource == null)
            {
                return Results.NotFound(new { error = "Sample data source not found" });
            }
            return Results.Ok(dataSource);
        })
        .WithName("UpdateAdminDataSource");

        // DELETE /admin/data-sources/{id} - Delete a sample data source
        group.MapDelete("/data-sources/{id:guid}", async (
            Guid id,
            AdminService adminService) =>
        {
            var deleted = await adminService.DeleteSampleDataSourceAsync(id);
            if (!deleted)
            {
                return Results.NotFound(new { error = "Sample data source not found" });
            }
            return Results.NoContent();
        })
        .WithName("DeleteAdminDataSource");
    }
}
