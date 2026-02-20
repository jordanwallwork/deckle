using Deckle.API.Configurators;
using Deckle.API.DTOs;
using Deckle.API.Services;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace Deckle.API.Tests.Services;

public class ComponentServiceTests : IDisposable
{
    private bool _disposed;
    private readonly AppDbContext _context;
    private readonly Mock<IProjectAuthorizationService> _mockAuthService;
    private readonly Mock<IConfiguratorProvider> _mockConfiguratorProvider;
    private readonly ComponentService _service;

    public ComponentServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);
        _mockAuthService = new Mock<IProjectAuthorizationService>();
        _mockConfiguratorProvider = new Mock<IConfiguratorProvider>();

        // Default: all authorization passes
        _mockAuthService
            .Setup(a => a.RequireProjectAccessAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<string?>()))
            .ReturnsAsync(ProjectRole.Owner);
        _mockAuthService
            .Setup(a => a.EnsureCanModifyResourcesAsync(It.IsAny<Guid>(), It.IsAny<Guid?>()))
            .Returns(Task.CompletedTask);
        _mockAuthService
            .Setup(a => a.EnsureCanDeleteResourcesAsync(It.IsAny<Guid>(), It.IsAny<Guid>()))
            .Returns(Task.CompletedTask);
        _mockAuthService
            .Setup(a => a.GetUserProjectRoleAsync(It.IsAny<Guid>(), It.IsAny<Guid?>()))
            .ReturnsAsync(ProjectRole.Owner);

        _service = new ComponentService(_context, _mockAuthService.Object, _mockConfiguratorProvider.Object);
    }

    #region Helpers

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
        var card = new Card
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = name,
            Size = CardSize.StandardPoker,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Cards.Add(card);
        await _context.SaveChangesAsync();
        return card;
    }

    private async Task<Dice> SeedDice(Guid? projectId, string name = "Test Dice")
    {
        var dice = new Dice
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = name,
            Type = DiceType.D6,
            Style = DiceStyle.Numbered,
            BaseColor = DiceColor.StarWhite,
            Number = 6,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Dices.Add(dice);
        await _context.SaveChangesAsync();
        return dice;
    }

    private async Task<PlayerMat> SeedPlayerMat(Guid? projectId, string name = "Test Mat")
    {
        var mat = new PlayerMat
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = name,
            PresetSize = PlayerMatSize.A4,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.PlayerMats.Add(mat);
        await _context.SaveChangesAsync();
        return mat;
    }

    private async Task<SpreadsheetDataSource> SeedSpreadsheetDataSource(Guid? projectId, string name = "Test DS")
    {
        var ds = new SpreadsheetDataSource
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = name,
            Type = DataSourceType.Spreadsheet,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.SpreadsheetDataSources.Add(ds);
        await _context.SaveChangesAsync();
        return ds;
    }

    #endregion

    #region GetProjectComponentsAsync Tests

    [Fact]
    public async Task GetProjectComponentsAsync_WithAccess_ReturnsProjectComponents()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        await SeedCard(projectId, "Card A");
        await SeedDice(projectId, "Dice B");

        var result = await _service.GetProjectComponentsAsync(userId, projectId);

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetProjectComponentsAsync_ReturnsOnlyProjectComponents()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        await SeedCard(projectId, "Mine");
        await SeedCard(null, "Sample - should be excluded");

        var result = await _service.GetProjectComponentsAsync(userId, projectId);

        Assert.Single(result);
        Assert.Equal("Mine", result[0].Name);
    }

    [Fact]
    public async Task GetProjectComponentsAsync_OrderedByCreatedAt()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var first = await SeedCard(projectId, "First");
        await Task.Delay(5);
        var second = await SeedCard(projectId, "Second");

        var result = await _service.GetProjectComponentsAsync(userId, projectId);

        Assert.Equal(first.Id, result[0].Id);
        Assert.Equal(second.Id, result[1].Id);
    }

    [Fact]
    public async Task GetProjectComponentsAsync_UnauthorizedAccess_ThrowsUnauthorizedAccessException()
    {
        var outsiderId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        _mockAuthService
            .Setup(a => a.RequireProjectAccessAsync(outsiderId, (Guid?)projectId, It.IsAny<string?>()))
            .ThrowsAsync(new UnauthorizedAccessException());

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.GetProjectComponentsAsync(outsiderId, projectId));
    }

    [Fact]
    public async Task GetProjectComponentsAsync_ReturnsDtosWithCorrectTypes()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        await SeedCard(projectId);
        await SeedDice(projectId);

        var result = await _service.GetProjectComponentsAsync(userId, projectId);

        Assert.Contains(result, c => c.Type == "Card");
        Assert.Contains(result, c => c.Type == "Dice");
    }

    #endregion

    #region GetComponentByIdAsync Tests

    [Fact]
    public async Task GetComponentByIdAsync_SampleComponent_ReturnsComponent()
    {
        var userId = Guid.NewGuid();
        // Sample components have no ProjectId
        var card = await SeedCard(null, "Sample Card");

        var result = await _service.GetComponentByIdAsync<Card>(userId, card.Id);

        Assert.NotNull(result);
        Assert.Equal(card.Id, result.Id);
    }

    [Fact]
    public async Task GetComponentByIdAsync_NonExistentId_ReturnsNull()
    {
        var userId = Guid.NewGuid();

        var result = await _service.GetComponentByIdAsync<Card>(userId, Guid.NewGuid());

        Assert.Null(result);
    }

    [Fact]
    public async Task GetComponentByIdAsync_WrongType_ReturnsNull()
    {
        var userId = Guid.NewGuid();
        var dice = await SeedDice(null, "Sample Dice");

        // Request as Card but it's a Dice
        var result = await _service.GetComponentByIdAsync<Card>(userId, dice.Id);

        Assert.Null(result);
    }

    #endregion

    #region GetSamplesForTypeAsync Tests

    [Fact]
    public async Task GetSamplesForTypeAsync_CardType_ReturnsOnlyCards()
    {
        await SeedCard(null, "Sample Card 1");
        await SeedCard(null, "Sample Card 2");
        await SeedDice(null, "Sample Dice"); // should be excluded

        var result = await _service.GetSamplesForTypeAsync("Card");

        Assert.Equal(2, result.Count);
        Assert.All(result, c => Assert.Equal("Card", c.Type));
    }

    [Fact]
    public async Task GetSamplesForTypeAsync_PlayerMatType_ReturnsOnlyPlayerMats()
    {
        await SeedPlayerMat(null, "Sample Mat");
        await SeedCard(null, "Sample Card"); // should be excluded

        var result = await _service.GetSamplesForTypeAsync("PlayerMat");

        Assert.Single(result);
        Assert.Equal("PlayerMat", result[0].Type);
    }

    [Fact]
    public async Task GetSamplesForTypeAsync_InvalidType_ThrowsArgumentException()
    {
        await Assert.ThrowsAsync<ArgumentException>(
            () => _service.GetSamplesForTypeAsync("Dice"));
    }

    [Fact]
    public async Task GetSamplesForTypeAsync_CaseInsensitive_ReturnsCards()
    {
        await SeedCard(null, "Sample Card");

        var result = await _service.GetSamplesForTypeAsync("card");

        Assert.Single(result);
    }

    [Fact]
    public async Task GetSamplesForTypeAsync_ExcludesProjectComponents()
    {
        var (_, projectId) = await SeedOwnerWithProject();
        await SeedCard(projectId, "Project Card"); // belongs to project, not a sample
        await SeedCard(null, "Sample Card");

        var result = await _service.GetSamplesForTypeAsync("Card");

        Assert.Single(result);
        Assert.Equal("Sample Card", result[0].Name);
    }

    [Fact]
    public async Task GetSamplesForTypeAsync_OrdersAlphabetically()
    {
        await SeedCard(null, "Zebra Card");
        await SeedCard(null, "Apple Card");

        var result = await _service.GetSamplesForTypeAsync("Card");

        Assert.Equal("Apple Card", result[0].Name);
        Assert.Equal("Zebra Card", result[1].Name);
    }

    #endregion

    #region UpdateDataSourceAsync Tests

    [Fact]
    public async Task UpdateDataSourceAsync_ValidDataSource_LinksDataSourceToCard()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var card = await SeedCard(projectId);
        var ds = await SeedSpreadsheetDataSource(projectId);

        var result = await _service.UpdateDataSourceAsync(userId, card.Id, ds.Id);

        Assert.NotNull(result);
        var cardDto = Assert.IsType<CardDto>(result);
        Assert.NotNull(cardDto.DataSource);
        Assert.Equal(ds.Id, cardDto.DataSource.Id);
    }

    [Fact]
    public async Task UpdateDataSourceAsync_NullDataSourceId_UnlinksDataSource()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var ds = await SeedSpreadsheetDataSource(projectId);
        var card = new Card
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = "Card with DS",
            Size = CardSize.StandardPoker,
            DataSource = ds,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Cards.Add(card);
        await _context.SaveChangesAsync();

        var result = await _service.UpdateDataSourceAsync(userId, card.Id, null);

        Assert.NotNull(result);
        var cardDto = Assert.IsType<CardDto>(result);
        Assert.Null(cardDto.DataSource);
    }

    [Fact]
    public async Task UpdateDataSourceAsync_ComponentNotFound_ReturnsNull()
    {
        var userId = Guid.NewGuid();

        var result = await _service.UpdateDataSourceAsync(userId, Guid.NewGuid(), null);

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateDataSourceAsync_NonDataSourceComponent_ReturnsNull()
    {
        // Dice does not implement IDataSourceComponent
        var (userId, projectId) = await SeedOwnerWithProject();
        var dice = await SeedDice(projectId);

        var result = await _service.UpdateDataSourceAsync(userId, dice.Id, null);

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateDataSourceAsync_CollaboratorRole_ReturnsNull()
    {
        var (_, projectId) = await SeedOwnerWithProject();
        var collaboratorId = Guid.NewGuid();
        var card = await SeedCard(projectId);
        _mockAuthService
            .Setup(a => a.GetUserProjectRoleAsync(collaboratorId, (Guid?)projectId))
            .ReturnsAsync(ProjectRole.Collaborator);

        var result = await _service.UpdateDataSourceAsync(collaboratorId, card.Id, null);

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateDataSourceAsync_DataSourceNotInProject_ThrowsArgumentException()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var card = await SeedCard(projectId);
        // DataSource belonging to a different project
        var otherProjectId = Guid.NewGuid();
        var ds = await SeedSpreadsheetDataSource(otherProjectId);

        await Assert.ThrowsAsync<ArgumentException>(
            () => _service.UpdateDataSourceAsync(userId, card.Id, ds.Id));
    }

    [Fact]
    public async Task UpdateDataSourceAsync_PersistsDataSourceLink()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var card = await SeedCard(projectId);
        var ds = await SeedSpreadsheetDataSource(projectId);

        await _service.UpdateDataSourceAsync(userId, card.Id, ds.Id);

        _context.ChangeTracker.Clear();
        var updatedCard = await _context.Cards.Include(c => c.DataSource).FirstOrDefaultAsync(c => c.Id == card.Id);
        Assert.NotNull(updatedCard!.DataSource);
        Assert.Equal(ds.Id, updatedCard.DataSource.Id);
    }

    #endregion

    #region UpdateSampleDataSourceAsync Tests

    [Fact]
    public async Task UpdateSampleDataSourceAsync_ValidSampleDataSource_LinksToSampleCard()
    {
        var sampleCard = await SeedCard(null, "Sample Card");
        var sampleDs = await SeedSpreadsheetDataSource(null, "Sample DS");

        var result = await _service.UpdateSampleDataSourceAsync(sampleCard.Id, sampleDs.Id);

        Assert.NotNull(result);
        var cardDto = Assert.IsType<CardDto>(result);
        Assert.NotNull(cardDto.DataSource);
        Assert.Equal(sampleDs.Id, cardDto.DataSource.Id);
    }

    [Fact]
    public async Task UpdateSampleDataSourceAsync_NullDataSourceId_UnlinksDataSource()
    {
        var sampleCard = await SeedCard(null, "Sample Card");

        var result = await _service.UpdateSampleDataSourceAsync(sampleCard.Id, null);

        Assert.NotNull(result);
        var cardDto = Assert.IsType<CardDto>(result);
        Assert.Null(cardDto.DataSource);
    }

    [Fact]
    public async Task UpdateSampleDataSourceAsync_ProjectComponent_ReturnsNull()
    {
        var (_, projectId) = await SeedOwnerWithProject();
        var projectCard = await SeedCard(projectId, "Project Card");

        // ProjectId != null means not a sample
        var result = await _service.UpdateSampleDataSourceAsync(projectCard.Id, null);

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateSampleDataSourceAsync_ProjectDataSource_ThrowsArgumentException()
    {
        var sampleCard = await SeedCard(null, "Sample Card");
        var (_, projectId) = await SeedOwnerWithProject();
        var projectDs = await SeedSpreadsheetDataSource(projectId, "Project DS");

        await Assert.ThrowsAsync<ArgumentException>(
            () => _service.UpdateSampleDataSourceAsync(sampleCard.Id, projectDs.Id));
    }

    [Fact]
    public async Task UpdateSampleDataSourceAsync_NonDataSourceComponent_ReturnsNull()
    {
        var sampleDice = await SeedDice(null, "Sample Dice");

        var result = await _service.UpdateSampleDataSourceAsync(sampleDice.Id, null);

        Assert.Null(result);
    }

    #endregion

    #region SaveDesignAsync Tests

    [Fact]
    public async Task SaveDesignAsync_ValidFrontDesign_SavesAndReturnsDto()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var card = await SeedCard(projectId);
        _mockAuthService
            .Setup(a => a.GetUserProjectRoleAsync(userId, (Guid?)projectId))
            .ReturnsAsync(ProjectRole.Owner);

        var result = await _service.SaveDesignAsync(userId, card.Id, "front", "<div>front</div>");

        Assert.NotNull(result);
        var cardDto = Assert.IsType<CardDto>(result);
        Assert.Equal("<div>front</div>", cardDto.FrontDesign);
    }

    [Fact]
    public async Task SaveDesignAsync_ValidBackDesign_SavesAndReturnsDto()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var card = await SeedCard(projectId);
        _mockAuthService
            .Setup(a => a.GetUserProjectRoleAsync(userId, (Guid?)projectId))
            .ReturnsAsync(ProjectRole.Owner);

        var result = await _service.SaveDesignAsync(userId, card.Id, "back", "<div>back</div>");

        Assert.NotNull(result);
        var cardDto = Assert.IsType<CardDto>(result);
        Assert.Equal("<div>back</div>", cardDto.BackDesign);
    }

    [Fact]
    public async Task SaveDesignAsync_NullDesign_ClearsDesign()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var card = new Card
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = "Card",
            Size = CardSize.StandardPoker,
            FrontDesign = "<existing>",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Cards.Add(card);
        await _context.SaveChangesAsync();
        _mockAuthService
            .Setup(a => a.GetUserProjectRoleAsync(userId, (Guid?)projectId))
            .ReturnsAsync(ProjectRole.Owner);

        var result = await _service.SaveDesignAsync(userId, card.Id, "front", null);

        Assert.NotNull(result);
        var cardDto = Assert.IsType<CardDto>(result);
        Assert.Null(cardDto.FrontDesign);
    }

    [Fact]
    public async Task SaveDesignAsync_NonEditableComponent_ReturnsNull()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var dice = await SeedDice(projectId);
        _mockAuthService
            .Setup(a => a.GetUserProjectRoleAsync(userId, (Guid?)projectId))
            .ReturnsAsync(ProjectRole.Owner);

        var result = await _service.SaveDesignAsync(userId, dice.Id, "front", "<div>");

        Assert.Null(result);
    }

    [Fact]
    public async Task SaveDesignAsync_ComponentNotFound_ReturnsNull()
    {
        var userId = Guid.NewGuid();

        var result = await _service.SaveDesignAsync(userId, Guid.NewGuid(), "front", "<div>");

        Assert.Null(result);
    }

    [Fact]
    public async Task SaveDesignAsync_CollaboratorRole_Succeeds()
    {
        // Collaborators can modify resources (CanModifyResources returns true for all roles)
        var (_, projectId) = await SeedOwnerWithProject();
        var collaboratorId = Guid.NewGuid();
        var card = await SeedCard(projectId);
        _mockAuthService
            .Setup(a => a.GetUserProjectRoleAsync(collaboratorId, (Guid?)projectId))
            .ReturnsAsync(ProjectRole.Collaborator);

        var result = await _service.SaveDesignAsync(collaboratorId, card.Id, "front", "<div>");

        Assert.NotNull(result);
    }

    [Fact]
    public async Task SaveDesignAsync_PersistsDesignToDatabase()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var card = await SeedCard(projectId);
        _mockAuthService
            .Setup(a => a.GetUserProjectRoleAsync(userId, (Guid?)projectId))
            .ReturnsAsync(ProjectRole.Owner);

        await _service.SaveDesignAsync(userId, card.Id, "front", "<saved>");

        _context.ChangeTracker.Clear();
        var updated = await _context.Cards.FindAsync(card.Id);
        Assert.Equal("<saved>", updated!.FrontDesign);
    }

    #endregion

    #region DeleteComponentAsync Tests

    [Fact]
    public async Task DeleteComponentAsync_ValidProjectComponent_DeletesFromDatabase()
    {
        var (userId, projectId) = await SeedOwnerWithProject();
        var card = await SeedCard(projectId);

        await _service.DeleteComponentAsync(userId, card.Id);

        _context.ChangeTracker.Clear();
        var deleted = await _context.Components.FindAsync(card.Id);
        Assert.Null(deleted);
    }

    [Fact]
    public async Task DeleteComponentAsync_SampleComponent_ThrowsUnauthorizedAccessException()
    {
        var userId = Guid.NewGuid();
        var sampleCard = await SeedCard(null, "Sample");

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.DeleteComponentAsync(userId, sampleCard.Id));
    }

    [Fact]
    public async Task DeleteComponentAsync_NonExistentComponent_ThrowsKeyNotFoundException()
    {
        var userId = Guid.NewGuid();

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _service.DeleteComponentAsync(userId, Guid.NewGuid()));
    }

    [Fact]
    public async Task DeleteComponentAsync_UnauthorizedUser_ThrowsUnauthorizedAccessException()
    {
        var (_, projectId) = await SeedOwnerWithProject();
        var card = await SeedCard(projectId);
        var outsiderId = Guid.NewGuid();
        _mockAuthService
            .Setup(a => a.EnsureCanDeleteResourcesAsync(outsiderId, projectId))
            .ThrowsAsync(new UnauthorizedAccessException());

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.DeleteComponentAsync(outsiderId, card.Id));
    }

    #endregion

    #region GetSampleComponentsAsync Tests

    [Fact]
    public async Task GetSampleComponentsAsync_ReturnsOnlySampleComponents()
    {
        var (_, projectId) = await SeedOwnerWithProject();
        await SeedCard(null, "Sample 1");
        await SeedCard(null, "Sample 2");
        await SeedCard(projectId, "Project Card"); // should not appear

        var result = await _service.GetSampleComponentsAsync();

        Assert.Equal(2, result.TotalCount);
        Assert.All(result.Components, c => Assert.Null(c.DataSource?.Id == Guid.Empty ? null : (object?)null));
    }

    [Fact]
    public async Task GetSampleComponentsAsync_Pagination_RespectsPageSize()
    {
        for (int i = 0; i < 5; i++)
        {
            await SeedCard(null, $"Sample {i}");
        }

        var result = await _service.GetSampleComponentsAsync(page: 1, pageSize: 2);

        Assert.Equal(5, result.TotalCount);
        Assert.Equal(2, result.Components.Count);
        Assert.Equal(1, result.Page);
        Assert.Equal(2, result.PageSize);
    }

    [Fact]
    public async Task GetSampleComponentsAsync_WithCardTypeFilter_ReturnsOnlyCards()
    {
        await SeedCard(null, "Sample Card");
        await SeedPlayerMat(null, "Sample Mat");
        await SeedDice(null, "Sample Dice");

        var result = await _service.GetSampleComponentsAsync(componentType: "Card");

        Assert.Equal(1, result.TotalCount);
        Assert.Equal("Card", result.Components[0].Type);
    }

    [Fact]
    public async Task GetSampleComponentsAsync_WithPlayerMatTypeFilter_ReturnsOnlyPlayerMats()
    {
        await SeedCard(null, "Sample Card");
        await SeedPlayerMat(null, "Sample Mat");

        var result = await _service.GetSampleComponentsAsync(componentType: "PlayerMat");

        Assert.Equal(1, result.TotalCount);
        Assert.Equal("PlayerMat", result.Components[0].Type);
    }

    [Fact]
    public async Task GetSampleComponentsAsync_WithSearch_FiltersResults()
    {
        await SeedCard(null, "Dragon Card");
        await SeedCard(null, "Knight Card");
        await SeedCard(null, "Dragon Shield");

        var result = await _service.GetSampleComponentsAsync(search: "Dragon");

        Assert.Equal(2, result.TotalCount);
        Assert.All(result.Components, c => Assert.Contains("Dragon", c.Name, StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task GetSampleComponentsAsync_ReturnsCorrectStats()
    {
        await SeedCard(null, "Card");

        var result = await _service.GetSampleComponentsAsync();

        var dto = result.Components[0];
        Assert.Equal("Card", dto.Type);
        Assert.NotNull(dto.Stats);
        Assert.True(dto.Stats.ContainsKey("Size"));
        Assert.True(dto.Stats.ContainsKey("Horizontal"));
    }

    #endregion

    #region Static Helper Tests

    [Fact]
    public void GetComponentTypeName_Card_ReturnsCard()
    {
        var card = new Card { Id = Guid.NewGuid(), Name = "Test", Size = CardSize.StandardPoker, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };

        var result = ComponentService.GetComponentTypeName(card);

        Assert.Equal("Card", result);
    }

    [Fact]
    public void GetComponentTypeName_Dice_ReturnsDice()
    {
        var dice = new Dice { Id = Guid.NewGuid(), Name = "Test", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };

        var result = ComponentService.GetComponentTypeName(dice);

        Assert.Equal("Dice", result);
    }

    [Fact]
    public void GetComponentTypeName_PlayerMat_ReturnsPlayerMat()
    {
        var mat = new PlayerMat { Id = Guid.NewGuid(), Name = "Test", PresetSize = PlayerMatSize.A4, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };

        var result = ComponentService.GetComponentTypeName(mat);

        Assert.Equal("PlayerMat", result);
    }

    [Fact]
    public void GetComponentStats_Card_ReturnsSizeAndHorizontal()
    {
        var card = new Card { Id = Guid.NewGuid(), Name = "Test", Size = CardSize.StandardPoker, Horizontal = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };

        var stats = ComponentService.GetComponentStats(card);

        Assert.True(stats.ContainsKey("Size"));
        Assert.True(stats.ContainsKey("Horizontal"));
        Assert.Equal("Yes", stats["Horizontal"]);
    }

    [Fact]
    public void GetComponentStats_Dice_ReturnsEmptyDictionary()
    {
        var dice = new Dice { Id = Guid.NewGuid(), Name = "Test", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };

        var stats = ComponentService.GetComponentStats(dice);

        Assert.Empty(stats);
    }

    #endregion

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
            {
                _context.Dispose();
            }
            _disposed = true;
        }
    }
}
