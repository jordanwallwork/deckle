using Deckle.API.Configurators;
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

        return group;
    }

    private static void MapUserEndpoints(RouteGroupBuilder group)
    {
        // GET /admin/users - List users with pagination, search and filters
        group.MapGet("/users", async (
            [AsParameters] AdminUserQuery query,
            IAdminService adminService) =>
        {
            var result = await adminService.GetUsersAsync(query);
            return Results.Ok(result);
        })
        .WithName("GetAdminUsers");

        // GET /admin/users/{id} - Get a user's full admin detail
        group.MapGet("/users/{id:guid}", async (
            Guid id,
            IAdminService adminService) =>
        {
            var user = await adminService.GetUserDetailAsync(id);
            return user == null ? Results.NotFound(new { error = "User not found" }) : Results.Ok(user);
        })
        .WithName("GetAdminUser");

        // PUT /admin/users/{id}/role - Update user role (not your own)
        group.MapPut("/users/{id:guid}/role", async (
            Guid id,
            UpdateUserRoleRequest request,
            HttpContext httpContext,
            IAdminService adminService) =>
            ToHttpResult(await adminService.UpdateUserRoleAsync(httpContext.GetUserId(), id, request.Role)))
        .WithName("UpdateAdminUserRole");

        // PUT /admin/users/{id}/quota - Update user storage quota
        group.MapPut("/users/{id:guid}/quota", async (
            Guid id,
            UpdateUserQuotaRequest request,
            IAdminService adminService) =>
        {
            var user = await adminService.UpdateUserQuotaAsync(id, request.StorageQuotaMb);
            return user == null ? Results.BadRequest(new { error = "Invalid quota or user not found" }) : Results.Ok(user);
        })
        .WithName("UpdateAdminUserQuota");

        // PUT /admin/users/{id}/name - Rename a user (empty clears the name)
        group.MapPut("/users/{id:guid}/name", async (
            Guid id,
            UpdateUserNameRequest request,
            IAdminService adminService) =>
            ToHttpResult(await adminService.UpdateUserNameAsync(id, request.Name)))
        .WithName("UpdateAdminUserName");

        // POST /admin/users/{id}/resend-confirmation - Re-send the email confirmation link
        group.MapPost("/users/{id:guid}/resend-confirmation", async (
            Guid id,
            IAdminService adminService) =>
            ToHttpResult(await adminService.ResendConfirmationAsync(id)))
        .WithName("ResendAdminUserConfirmation");

        // POST /admin/users/{id}/confirm-email - Manually mark a user's email as confirmed
        group.MapPost("/users/{id:guid}/confirm-email", async (
            Guid id,
            IAdminService adminService) =>
            ToHttpResult(await adminService.ConfirmEmailAsync(id)))
        .WithName("ConfirmAdminUserEmail");

        // PUT /admin/users/{id}/disabled - Disable or re-enable an account (not your own)
        group.MapPut("/users/{id:guid}/disabled", async (
            Guid id,
            UpdateUserDisabledRequest request,
            HttpContext httpContext,
            IAdminService adminService) =>
            ToHttpResult(await adminService.SetUserDisabledAsync(httpContext.GetUserId(), id, request.Disabled)))
        .WithName("UpdateAdminUserDisabled");

        // DELETE /admin/users/{id}/api-keys/{keyId} - Revoke one of a user's API keys
        group.MapDelete("/users/{id:guid}/api-keys/{keyId:guid}", async (
            Guid id,
            Guid keyId,
            IAdminService adminService) =>
        {
            var revoked = await adminService.RevokeApiKeyAsync(id, keyId);
            return revoked ? Results.NoContent() : Results.NotFound(new { error = "API key not found" });
        })
        .WithName("RevokeAdminUserApiKey");
    }

    private static IResult ToHttpResult(AdminActionResult result) => result.Status switch
    {
        AdminActionStatus.Success => Results.Ok(result.User),
        AdminActionStatus.NotFound => Results.NotFound(new { error = result.Error }),
        _ => Results.BadRequest(new { error = result.Error })
    };

    private static void MapSampleComponentEndpoints(RouteGroupBuilder group)
    {
        // GET /admin/samples - List all sample components with pagination, search, and filtering
        group.MapGet("/samples", async (
            IComponentService componentService,
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
            IComponentService componentService) =>
        {
            var userId = httpContext.GetUserId();
            var card = await componentService.CreateComponentAsync<Card, CardConfig>(userId, null, new CardConfig(request.Name, request.Size, request.Horizontal, request.Sample));
            return Results.Created($"/admin/samples/{card.Id}", new CardDto(card));
        })
        .WithName("CreateAdminSampleCard");

        // POST /admin/samples/playermats - Create a sample player mat
        group.MapPost("/samples/playermats", async (
            CreatePlayerMatRequest request,
            HttpContext httpContext,
            IComponentService componentService) =>
        {
            var playerMat = await componentService.CreateComponentAsync<PlayerMat, PlayerMatConfig>(
                httpContext.GetUserId(), null,
                new PlayerMatConfig(request.Name, request.PresetSize, request.Horizontal, request.CustomWidthMm, request.CustomHeightMm, request.Sample));
            return Results.Created($"/admin/samples/{playerMat.Id}", new PlayerMatDto(playerMat));
        })
        .WithName("CreateAdminSamplePlayerMat");

        // PUT /admin/samples/{id}/datasource - Update data source for a sample component
        group.MapPut("/samples/{id:guid}/datasource", async (
            Guid id,
            UpdateComponentDataSourceRequest request,
            IComponentService componentService) =>
        {
            var component = await componentService.UpdateSampleDataSourceAsync(id, request.DataSourceId);
            return component == null
                ? Results.NotFound(new { error = "Sample component not found or does not support data sources" })
                : Results.Ok(component);
        })
        .WithName("UpdateAdminSampleDataSource");

        // GET /admin/samples/{id} - Get a sample component by ID
        group.MapGet("/samples/{id:guid}", async (
            Guid id,
            HttpContext httpContext,
            IComponentService componentService) =>
        {
            var component = await componentService.GetComponentByIdAsync<Component>(httpContext.GetUserId(), id);
            return component == null ? Results.NotFound(new { error = "Sample component not found" }) : Results.Ok(component.ToComponentDto());
        })
        .WithName("GetAdminSample");

        // PUT /admin/samples/{id}/design/{part} - Save a sample component design
        group.MapPut("/samples/{id:guid}/design/{part}", async (
            Guid id,
            string part,
            SaveDesignRequest request,
            HttpContext httpContext,
            IComponentService componentService) =>
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
    }
}
