using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Deckle.MCP.Auth;
using Deckle.MCP.Tools;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.AddNpgsqlDbContext<AppDbContext>("deckledb", configureDbContextOptions: options =>
    options.AddInterceptors(new ByteSizeInterceptor(), new StorageQuotaInterceptor()));

builder.Services.AddAuthentication(ApiKeyAuthenticationHandler.SchemeName)
    .AddScheme<AuthenticationSchemeOptions, ApiKeyAuthenticationHandler>(
        ApiKeyAuthenticationHandler.SchemeName, null);

builder.Services.AddAuthorization();
builder.Services.AddHttpContextAccessor();

builder.Services
    .AddMcpServer()
    .WithHttpTransport()
    .WithTools<ProjectTools>()
    .WithTools<ComponentTools>()
    .WithTools<DataSourceTools>()
    .WithTools<FileTools>();

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

app.MapMcp("/mcp").RequireAuthorization();

await app.RunAsync();
