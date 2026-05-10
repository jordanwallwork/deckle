using System.Security.Claims;
using System.Text.Json;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Deckle.MCP.Tools;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace Deckle.MCP.Tests.Tools;

public class DataSourceToolsTests : IDisposable
{
    private bool _disposed;
    private readonly AppDbContext _context;

    public DataSourceToolsTests()
    {
        _context = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);
    }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (!_disposed)
        {
            if (disposing)
                _context.Dispose();
            _disposed = true;
        }
    }

    private DataSourceTools CreateTools(Guid userId) => new(_context, CreateAccessor(userId));

    private static IHttpContextAccessor CreateAccessor(Guid userId)
    {
        var claims = new ClaimsPrincipal(new ClaimsIdentity([new Claim("user_id", userId.ToString())]));
        var ctx = new DefaultHttpContext { User = claims };
        var mock = new Mock<IHttpContextAccessor>();
        mock.Setup(a => a.HttpContext).Returns(ctx);
        return mock.Object;
    }

    private async Task<(Guid userId, Guid projectId)> SeedOwnerWithProject()
    {
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        _context.Users.Add(new User { Id = userId, Email = $"{userId}@test.com", GoogleId = Guid.NewGuid().ToString(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        _context.Projects.Add(new Project { Id = projectId, Name = "Test", Code = "t", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        _context.UserProjects.Add(new UserProject { UserId = userId, ProjectId = projectId, Role = ProjectRole.Owner, JoinedAt = DateTime.UtcNow });
        await _context.SaveChangesAsync();
        return (userId, projectId);
    }

    private async Task<GoogleSheetsDataSource> SeedGoogleSheetsSource(
        Guid projectId,
        string name = "Test Sheet",
        string sheetId = "abc123",
        int gid = 0,
        List<string>? headers = null)
    {
        var ds = new GoogleSheetsDataSource
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = name,
            Type = DataSourceType.GoogleSheets,
            GoogleSheetsId = sheetId,
            GoogleSheetsUrl = new Uri($"https://docs.google.com/spreadsheets/d/{sheetId}/edit"),
            SheetGid = gid,
            CsvExportUrl = new Uri($"https://docs.google.com/spreadsheets/d/{sheetId}/export?format=csv&gid={gid}"),
            Headers = headers ?? ["Name", "Value"],
            RowCount = 10,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.GoogleSheetsDataSources.Add(ds);
        await _context.SaveChangesAsync();
        return ds;
    }

    #region ListDataSources

    [Fact]
    public async Task ListDataSources_ProjectWithSources_ReturnsAll()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        await SeedGoogleSheetsSource(projectId, "Sheet 1");
        await SeedGoogleSheetsSource(projectId, "Sheet 2", "xyz789");

        var result = await CreateTools(userId).ListDataSources(projectId);

        Assert.Equal(2, JsonSerializer.Deserialize<JsonElement[]>(result)!.Length);
    }

    [Fact]
    public async Task ListDataSources_NoAccess_ReturnsError()
    {
        var (_, projectId) = await SeedOwnerWithProject();

        var result = await CreateTools(Guid.NewGuid()).ListDataSources(projectId);

        Assert.Equal(McpErrors.ProjectNotFound, result);
    }

    [Fact]
    public async Task ListDataSources_IncludesHeadersAndRowCount()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        await SeedGoogleSheetsSource(projectId, headers: ["Col1", "Col2"]);

        var result = await CreateTools(userId).ListDataSources(projectId);

        var item = JsonSerializer.Deserialize<JsonElement[]>(result)![0];
        Assert.Equal(2, item.GetProperty("Headers").GetArrayLength());
    }

    #endregion

    #region GetDataSource

    [Fact]
    public async Task GetDataSource_GoogleSheets_ReturnsUrlFields()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var ds = await SeedGoogleSheetsSource(projectId, sheetId: "mySheetId");

        var result = await CreateTools(userId).GetDataSource(ds.Id);

        var json = JsonSerializer.Deserialize<JsonElement>(result);
        Assert.Equal("GoogleSheets", json.GetProperty("Type").GetString());
        Assert.Equal("mySheetId", json.GetProperty("GoogleSheetsId").GetString());
        Assert.NotNull(json.GetProperty("CsvExportUrl").GetString());
    }

    [Fact]
    public async Task GetDataSource_NotFound_ReturnsError()
    {
        var (userId, _) = await SeedOwnerWithProject();

        var result = await CreateTools(userId).GetDataSource(Guid.NewGuid());

        Assert.Equal(McpErrors.DataSourceNotFound, result);
    }

    [Fact]
    public async Task GetDataSource_OtherUsersProject_ReturnsAccessDenied()
    {
        var (_, projectId) = await SeedOwnerWithProject();
        var ds = await SeedGoogleSheetsSource(projectId);

        var result = await CreateTools(Guid.NewGuid()).GetDataSource(ds.Id);

        Assert.Equal(McpErrors.AccessDenied, result);
    }

    #endregion

    #region CreateGoogleSheetsDataSource

    [Fact]
    public async Task CreateGoogleSheetsDataSource_StandardUrl_ExtractsSpreadsheetId()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        const string url = "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit#gid=0";

        var result = await CreateTools(userId).CreateGoogleSheetsDataSource(projectId, "My Sheet", url);

        var json = JsonSerializer.Deserialize<JsonElement>(result);
        Assert.Equal("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms", json.GetProperty("GoogleSheetsId").GetString());
    }

    [Fact]
    public async Task CreateGoogleSheetsDataSource_UrlWithGid_ExtractsSheetGid()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        const string url = "https://docs.google.com/spreadsheets/d/abc123/edit?gid=99";

        var result = await CreateTools(userId).CreateGoogleSheetsDataSource(projectId, "Sheet", url);

        var json = JsonSerializer.Deserialize<JsonElement>(result);
        Assert.Equal(99, json.GetProperty("SheetGid").GetInt32());
    }

    [Fact]
    public async Task CreateGoogleSheetsDataSource_UrlWithoutGid_DefaultsGidToZero()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        const string url = "https://docs.google.com/spreadsheets/d/abc123/edit";

        var result = await CreateTools(userId).CreateGoogleSheetsDataSource(projectId, "Sheet", url);

        Assert.Equal(0, JsonSerializer.Deserialize<JsonElement>(result).GetProperty("SheetGid").GetInt32());
    }

    [Fact]
    public async Task CreateGoogleSheetsDataSource_BuildsCsvExportUrl()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        const string url = "https://docs.google.com/spreadsheets/d/myid/edit#gid=5";

        var result = await CreateTools(userId).CreateGoogleSheetsDataSource(projectId, "Sheet", url);

        var csvUrl = JsonSerializer.Deserialize<JsonElement>(result).GetProperty("CsvExportUrl").GetString()!;
        Assert.Contains("myid", csvUrl);
        Assert.Contains("format=csv", csvUrl);
        Assert.Contains("gid=5", csvUrl);
    }

    [Fact]
    public async Task CreateGoogleSheetsDataSource_InvalidUrl_ReturnsError()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        var result = await CreateTools(userId).CreateGoogleSheetsDataSource(projectId, "Sheet", "not-a-url");

        Assert.Contains("error", result);
        Assert.Contains("Invalid", result);
    }

    [Fact]
    public async Task CreateGoogleSheetsDataSource_UrlWithNoSpreadsheetId_ReturnsError()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        var result = await CreateTools(userId).CreateGoogleSheetsDataSource(projectId, "Sheet", "https://example.com/notsheets");

        Assert.Contains("error", result);
    }

    [Fact]
    public async Task CreateGoogleSheetsDataSource_NoAccess_ReturnsError()
    {
        var (_, projectId) = await SeedOwnerWithProject();

        var result = await CreateTools(Guid.NewGuid()).CreateGoogleSheetsDataSource(projectId, "Sheet",
            "https://docs.google.com/spreadsheets/d/abc123/edit");

        Assert.Equal(McpErrors.ProjectNotFound, result);
    }

    [Fact]
    public async Task CreateGoogleSheetsDataSource_PersistsToDatabase()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        const string url = "https://docs.google.com/spreadsheets/d/persistedId/edit";

        await CreateTools(userId).CreateGoogleSheetsDataSource(projectId, "Saved Sheet", url);

        _context.ChangeTracker.Clear();
        Assert.NotNull(await _context.GoogleSheetsDataSources.FirstOrDefaultAsync(d => d.Name == "Saved Sheet"));
    }

    #endregion

    #region SyncDataSourceMetadata

    [Fact]
    public async Task SyncDataSourceMetadata_UpdatesHeadersAndRowCount()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var ds = await SeedGoogleSheetsSource(projectId);

        var result = await CreateTools(userId).SyncDataSourceMetadata(ds.Id, ["A", "B", "C"], 42);

        Assert.Contains("synced", result);
        _context.ChangeTracker.Clear();
        var updated = await _context.DataSources.FindAsync(ds.Id);
        Assert.Equal(42, updated!.RowCount);
        Assert.Equal(3, updated!.Headers.Count);
    }

    [Fact]
    public async Task SyncDataSourceMetadata_NotFound_ReturnsError()
    {
        var (userId, _) = await SeedOwnerWithProject();

        var result = await CreateTools(userId).SyncDataSourceMetadata(Guid.NewGuid(), ["A"], 1);

        Assert.Equal(McpErrors.DataSourceNotFound, result);
    }

    [Fact]
    public async Task SyncDataSourceMetadata_OtherUsersSource_ReturnsAccessDenied()
    {
        var (_, projectId) = await SeedOwnerWithProject();
        var ds = await SeedGoogleSheetsSource(projectId);

        var result = await CreateTools(Guid.NewGuid()).SyncDataSourceMetadata(ds.Id, ["A"], 1);

        Assert.Equal(McpErrors.AccessDenied, result);
    }

    #endregion

    #region DeleteDataSource

    [Fact]
    public async Task DeleteDataSource_Owner_DeletesAndReturnsDeleted()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var ds = await SeedGoogleSheetsSource(projectId);

        var result = await CreateTools(userId).DeleteDataSource(ds.Id);

        Assert.Equal(McpErrors.Deleted, result);
        _context.ChangeTracker.Clear();
        Assert.Null(await _context.DataSources.FindAsync(ds.Id));
    }

    [Fact]
    public async Task DeleteDataSource_NotFound_ReturnsError()
    {
        var (userId, _) = await SeedOwnerWithProject();

        var result = await CreateTools(userId).DeleteDataSource(Guid.NewGuid());

        Assert.Equal(McpErrors.DataSourceNotFound, result);
    }

    [Fact]
    public async Task DeleteDataSource_OtherUsersProject_ReturnsAccessDenied()
    {
        var (_, projectId) = await SeedOwnerWithProject();
        var ds = await SeedGoogleSheetsSource(projectId);

        var result = await CreateTools(Guid.NewGuid()).DeleteDataSource(ds.Id);

        Assert.Equal(McpErrors.AccessDenied, result);
    }

    #endregion
}
