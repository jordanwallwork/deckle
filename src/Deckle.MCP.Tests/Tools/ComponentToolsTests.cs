using System.Security.Claims;
using System.Text.Json;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Deckle.MCP.Tools;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace Deckle.MCP.Tests.Tools;

public class ComponentToolsTests : IDisposable
{
    private bool _disposed;
    private readonly AppDbContext _context;

    public ComponentToolsTests()
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

    private ComponentTools CreateTools(Guid userId) => new(_context, CreateAccessor(userId));

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

    private async Task<Card> SeedCard(Guid? projectId, string name = "Test Card")
    {
        var card = new Card { Id = Guid.NewGuid(), ProjectId = projectId, Name = name, Size = CardSize.StandardPoker, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _context.Cards.Add(card);
        await _context.SaveChangesAsync();
        return card;
    }

    private async Task<Dice> SeedDice(Guid? projectId, string name = "Test Dice")
    {
        var dice = new Dice { Id = Guid.NewGuid(), ProjectId = projectId, Name = name, Type = DiceType.D6, Style = DiceStyle.Numbered, BaseColor = DiceColor.StarWhite, Number = 1, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _context.Dices.Add(dice);
        await _context.SaveChangesAsync();
        return dice;
    }

    private async Task<GoogleSheetsDataSource> SeedDataSource(Guid projectId)
    {
        var ds = new GoogleSheetsDataSource
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = "Sheet",
            Type = DataSourceType.GoogleSheets,
            GoogleSheetsId = "sheet123",
            GoogleSheetsUrl = new Uri("https://docs.google.com/spreadsheets/d/sheet123/edit"),
            SheetGid = 0,
            CsvExportUrl = new Uri("https://docs.google.com/spreadsheets/d/sheet123/export?format=csv&gid=0"),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.GoogleSheetsDataSources.Add(ds);
        await _context.SaveChangesAsync();
        return ds;
    }

    #region ListComponents

    [Fact]
    public async Task ListComponents_ProjectWithComponents_ReturnsAll()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        await SeedCard(projectId, "Card A");
        await SeedDice(projectId, "Dice B");

        var result = await CreateTools(userId).ListComponents(projectId);

        var list = JsonSerializer.Deserialize<JsonElement[]>(result)!;
        Assert.Equal(2, list.Length);
    }

    [Fact]
    public async Task ListComponents_NoAccess_ReturnsError()
    {
        var (_, projectId) = await SeedOwnerWithProject();

        var result = await CreateTools(Guid.NewGuid()).ListComponents(projectId);

        Assert.Equal(McpErrors.ProjectNotFound, result);
    }

    [Fact]
    public async Task ListComponents_EmptyProject_ReturnsEmptyArray()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        var result = await CreateTools(userId).ListComponents(projectId);

        Assert.Empty(JsonSerializer.Deserialize<JsonElement[]>(result)!);
    }

    #endregion

    #region GetComponent

    [Fact]
    public async Task GetComponent_Card_ReturnsCardTypeJson()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var card = await SeedCard(projectId);

        var result = await CreateTools(userId).GetComponent(card.Id);

        var obj = JsonSerializer.Deserialize<JsonElement>(result);
        Assert.Equal("Card", obj.GetProperty("Type").GetString());
        Assert.Equal("StandardPoker", obj.GetProperty("Size").GetString());
    }

    [Fact]
    public async Task GetComponent_Dice_ReturnsDiceTypeJson()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var dice = await SeedDice(projectId);

        var result = await CreateTools(userId).GetComponent(dice.Id);

        var obj = JsonSerializer.Deserialize<JsonElement>(result);
        Assert.Equal("Dice", obj.GetProperty("Type").GetString());
        Assert.Equal("D6", obj.GetProperty("DiceType").GetString());
    }

    [Fact]
    public async Task GetComponent_NotFound_ReturnsError()
    {
        var (userId, _) = await SeedOwnerWithProject();

        var result = await CreateTools(userId).GetComponent(Guid.NewGuid());

        Assert.Equal(McpErrors.ComponentNotFound, result);
    }

    [Fact]
    public async Task GetComponent_SampleComponent_ReturnsNotFound()
    {
        var (userId, _) = await SeedOwnerWithProject();
        var sample = await SeedCard(null);

        var result = await CreateTools(userId).GetComponent(sample.Id);

        Assert.Equal(McpErrors.ComponentNotFound, result);
    }

    [Fact]
    public async Task GetComponent_OtherUsersComponent_ReturnsAccessDenied()
    {
        var (_, projectId) = await SeedOwnerWithProject();
        var card = await SeedCard(projectId);

        var result = await CreateTools(Guid.NewGuid()).GetComponent(card.Id);

        Assert.Equal(McpErrors.AccessDenied, result);
    }

    #endregion

    #region CreateCard

    [Fact]
    public async Task CreateCard_ValidSize_PersistsCard()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        var result = await CreateTools(userId).CreateCard(projectId, "My Card", "Bridge");

        var json = JsonSerializer.Deserialize<JsonElement>(result);
        Assert.Equal("Card", json.GetProperty("Type").GetString());
        Assert.Equal("Bridge", json.GetProperty("Size").GetString());
        _context.ChangeTracker.Clear();
        Assert.NotNull(await _context.Cards.FirstOrDefaultAsync(c => c.Name == "My Card"));
    }

    [Fact]
    public async Task CreateCard_DefaultsToStandardPokerPortrait()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        var result = await CreateTools(userId).CreateCard(projectId, "Default Card");

        var json = JsonSerializer.Deserialize<JsonElement>(result);
        Assert.Equal("StandardPoker", json.GetProperty("Size").GetString());
        Assert.False(json.GetProperty("Horizontal").GetBoolean());
    }

    [Fact]
    public async Task CreateCard_InvalidSize_ReturnsErrorWithValidValues()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        var result = await CreateTools(userId).CreateCard(projectId, "Bad Card", "GiantCard");

        Assert.Contains("error", result);
        Assert.Contains("GiantCard", result);
    }

    [Fact]
    public async Task CreateCard_NoAccess_ReturnsError()
    {
        var (_, projectId) = await SeedOwnerWithProject();

        var result = await CreateTools(Guid.NewGuid()).CreateCard(projectId, "Card");

        Assert.Equal(McpErrors.ProjectNotFound, result);
    }

    #endregion

    #region CreateDice

    [Fact]
    public async Task CreateDice_ValidInput_PersistsDice()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        var result = await CreateTools(userId).CreateDice(projectId, "My D20", "D20", "Numbered", "StarWhite", 2);

        var json = JsonSerializer.Deserialize<JsonElement>(result);
        Assert.Equal("Dice", json.GetProperty("Type").GetString());
        Assert.Equal("D20", json.GetProperty("DiceType").GetString());
        Assert.Equal(2, json.GetProperty("Number").GetInt32());
    }

    [Fact]
    public async Task CreateDice_InvalidDiceType_ReturnsError()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        var result = await CreateTools(userId).CreateDice(projectId, "Die", "D100");

        Assert.Contains("error", result);
        Assert.Contains("D100", result);
    }

    [Fact]
    public async Task CreateDice_InvalidStyle_ReturnsError()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        var result = await CreateTools(userId).CreateDice(projectId, "Die", "D6", "Fantasy");

        Assert.Contains("error", result);
        Assert.Contains("Fantasy", result);
    }

    [Fact]
    public async Task CreateDice_InvalidColor_ReturnsError()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        var result = await CreateTools(userId).CreateDice(projectId, "Die", "D6", "Numbered", "Rainbow");

        Assert.Contains("error", result);
        Assert.Contains("Rainbow", result);
    }

    #endregion

    #region CreateGameBoard

    [Fact]
    public async Task CreateGameBoard_PresetSize_PersistsBoard()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        var result = await CreateTools(userId).CreateGameBoard(projectId, "My Board", "MediumBifoldSquare");

        var json = JsonSerializer.Deserialize<JsonElement>(result);
        Assert.Equal("GameBoard", json.GetProperty("Type").GetString());
        Assert.Equal("MediumBifoldSquare", json.GetProperty("PresetSize").GetString());
    }

    [Fact]
    public async Task CreateGameBoard_CustomDimensions_PresetSizeIsNull()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        var result = await CreateTools(userId).CreateGameBoard(projectId, "Custom Board", null, true, 300m, 400m);

        var json = JsonSerializer.Deserialize<JsonElement>(result);
        Assert.Equal(JsonValueKind.Null, json.GetProperty("PresetSize").ValueKind);
    }

    [Fact]
    public async Task CreateGameBoard_InvalidPresetSize_ReturnsError()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        var result = await CreateTools(userId).CreateGameBoard(projectId, "Board", "MassiveBoard");

        Assert.Contains("error", result);
        Assert.Contains("MassiveBoard", result);
    }

    #endregion

    #region CreatePlayerMat

    [Fact]
    public async Task CreatePlayerMat_PresetSize_PersistsMat()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        var result = await CreateTools(userId).CreatePlayerMat(projectId, "My Mat", "A4");

        var json = JsonSerializer.Deserialize<JsonElement>(result);
        Assert.Equal("PlayerMat", json.GetProperty("Type").GetString());
        Assert.Equal("A4", json.GetProperty("PresetSize").GetString());
    }

    [Fact]
    public async Task CreatePlayerMat_InvalidPresetSize_ReturnsError()
    {
        var (userId, projectId) = await SeedOwnerWithProject();

        var result = await CreateTools(userId).CreatePlayerMat(projectId, "Mat", "A10");

        Assert.Contains("error", result);
    }

    #endregion

    #region DeleteComponent

    [Fact]
    public async Task DeleteComponent_ValidComponent_DeletesAndReturnsDeleted()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var card = await SeedCard(projectId);

        var result = await CreateTools(userId).DeleteComponent(card.Id);

        Assert.Equal(McpErrors.Deleted, result);
        _context.ChangeTracker.Clear();
        Assert.Null(await _context.Cards.FindAsync(card.Id));
    }

    [Fact]
    public async Task DeleteComponent_NotFound_ReturnsError()
    {
        var (userId, _) = await SeedOwnerWithProject();

        var result = await CreateTools(userId).DeleteComponent(Guid.NewGuid());

        Assert.Equal(McpErrors.ComponentNotFound, result);
    }

    [Fact]
    public async Task DeleteComponent_SampleComponent_ReturnsNotFound()
    {
        var (userId, _) = await SeedOwnerWithProject();
        var sample = await SeedCard(null);

        var result = await CreateTools(userId).DeleteComponent(sample.Id);

        Assert.Equal(McpErrors.ComponentNotFound, result);
    }

    [Fact]
    public async Task DeleteComponent_OtherUsersComponent_ReturnsAccessDenied()
    {
        var (_, projectId) = await SeedOwnerWithProject();
        var card = await SeedCard(projectId);

        var result = await CreateTools(Guid.NewGuid()).DeleteComponent(card.Id);

        Assert.Equal(McpErrors.AccessDenied, result);
    }

    #endregion

    #region LinkDataSource

    [Fact]
    public async Task LinkDataSource_ValidLink_SetsDataSource()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var card = await SeedCard(projectId);
        var ds = await SeedDataSource(projectId);

        var result = await CreateTools(userId).LinkDataSource(card.Id, ds.Id);

        var json = JsonSerializer.Deserialize<JsonElement>(result);
        Assert.Equal("updated", json.GetProperty("Status").GetString());
        _context.ChangeTracker.Clear();
        var updated = await _context.Cards.Include(c => c.DataSource).FirstAsync(c => c.Id == card.Id);
        Assert.Equal(ds.Id, updated.DataSource!.Id);
    }

    [Fact]
    public async Task LinkDataSource_NullDataSourceId_UnlinksDataSource()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var card = await SeedCard(projectId);
        var ds = await SeedDataSource(projectId);
        card.DataSource = ds;
        await _context.SaveChangesAsync();

        await CreateTools(userId).LinkDataSource(card.Id, null);

        _context.ChangeTracker.Clear();
        var updated = await _context.Cards.Include(c => c.DataSource).FirstAsync(c => c.Id == card.Id);
        Assert.Null(updated.DataSource);
    }

    [Fact]
    public async Task LinkDataSource_ComponentNotFound_ReturnsError()
    {
        var (userId, _) = await SeedOwnerWithProject();

        var result = await CreateTools(userId).LinkDataSource(Guid.NewGuid(), null);

        Assert.Equal(McpErrors.ComponentNotFound, result);
    }

    [Fact]
    public async Task LinkDataSource_DiceDoesNotSupportDataSource_ReturnsError()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var dice = await SeedDice(projectId);

        var result = await CreateTools(userId).LinkDataSource(dice.Id, null);

        Assert.Contains("error", result);
        Assert.Contains("not support data sources", result);
    }

    [Fact]
    public async Task LinkDataSource_DataSourceFromDifferentProject_ReturnsError()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var card = await SeedCard(projectId);
        var (_, otherProjectId) = await SeedOwnerWithProject();
        var otherDs = await SeedDataSource(otherProjectId);

        var result = await CreateTools(userId).LinkDataSource(card.Id, otherDs.Id);

        Assert.Contains("error", result);
        Assert.Contains("not found", result);
    }

    #endregion
}
