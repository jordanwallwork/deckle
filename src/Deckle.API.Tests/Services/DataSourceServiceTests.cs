using Deckle.API.DTOs;
using Deckle.API.Services;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace Deckle.API.Tests.Services;

public class DataSourceServiceTests : IDisposable
{
    private bool _disposed;
    private readonly AppDbContext _context;
    private readonly Mock<IProjectAuthorizationService> _mockAuthService;
    private readonly Mock<IGoogleSheetsService> _mockGoogleSheetsService;
    private readonly DataSourceService _service;

    public DataSourceServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);
        _mockAuthService = new Mock<IProjectAuthorizationService>();
        _mockGoogleSheetsService = new Mock<IGoogleSheetsService>();

        // Default: all authorization passes with Owner role
        _mockAuthService
            .Setup(a => a.RequireProjectAccessAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<string?>()))
            .ReturnsAsync(ProjectRole.Owner);
        _mockAuthService
            .Setup(a => a.EnsureCanModifyResourcesAsync(It.IsAny<Guid>(), It.IsAny<Guid?>()))
            .Returns(Task.CompletedTask);
        _mockAuthService
            .Setup(a => a.EnsureCanManageDataSourcesAsync(It.IsAny<Guid>(), It.IsAny<Guid>()))
            .Returns(Task.CompletedTask);
        _mockAuthService
            .Setup(a => a.GetUserProjectRoleAsync(It.IsAny<Guid>(), It.IsAny<Guid?>()))
            .ReturnsAsync(ProjectRole.Owner);
        _mockAuthService
            .Setup(a => a.RequirePermissionAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<Func<ProjectRole, bool>>(), It.IsAny<string>()))
            .ReturnsAsync(ProjectRole.Owner);
        _mockAuthService
            .Setup(a => a.HasProjectAccessAsync(It.IsAny<Guid>(), It.IsAny<Guid>()))
            .ReturnsAsync(true);

        _service = new DataSourceService(_context, _mockGoogleSheetsService.Object, _mockAuthService.Object);
    }

    #region Helpers

    private async Task<(Guid userId, Guid projectId)> SeedOwnerWithProject()
    {
        var userId = Guid.NewGuid();
        var projectId = Guid.NewGuid();

        _context.Users.Add(new User { Id = userId, Email = $"{userId}@test.com", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        _context.Projects.Add(new Project { Id = projectId, Name = "Test Project", Code = "TP", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        _context.UserProjects.Add(new UserProject { UserId = userId, ProjectId = projectId, Role = ProjectRole.Owner, JoinedAt = DateTime.UtcNow });
        await _context.SaveChangesAsync();

        return (userId, projectId);
    }

    private async Task<(Guid userId, Guid projectId)> SeedCollaboratorWithProject()
    {
        var (_, projectId) = await SeedOwnerWithProject();
        var collaboratorId = Guid.NewGuid();
        _context.Users.Add(new User { Id = collaboratorId, Email = $"{collaboratorId}@test.com", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        _context.UserProjects.Add(new UserProject { UserId = collaboratorId, ProjectId = projectId, Role = ProjectRole.Collaborator, JoinedAt = DateTime.UtcNow });
        await _context.SaveChangesAsync();
        return (collaboratorId, projectId);
    }

    private async Task<GoogleSheetsDataSource> SeedGoogleSheetsDataSource(Guid projectId, string name = "My Sheet")
    {
        var ds = new GoogleSheetsDataSource
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = name,
            Type = DataSourceType.GoogleSheets,
            GoogleSheetsId = "abc123",
            GoogleSheetsUrl = new Uri("https://docs.google.com/spreadsheets/d/abc123/edit"),
            SheetGid = 0,
            CsvExportUrl = new Uri("https://docs.google.com/spreadsheets/d/abc123/export?format=csv&gid=0"),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.GoogleSheetsDataSources.Add(ds);
        await _context.SaveChangesAsync();
        return ds;
    }

    private async Task<SpreadsheetDataSource> SeedSpreadsheetDataSource(Guid? projectId, string name = "My Spreadsheet", string? jsonData = null)
    {
        var ds = new SpreadsheetDataSource
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = name,
            Type = DataSourceType.Spreadsheet,
            JsonData = jsonData,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.SpreadsheetDataSources.Add(ds);
        await _context.SaveChangesAsync();
        return ds;
    }

    private async Task<SpreadsheetDataSource> SeedGlobalSampleSpreadsheet(string name = "Global Sample")
    {
        return await SeedSpreadsheetDataSource(null, name);
    }

    private async Task<SampleDataSource> SeedSampleDataSource(Guid projectId, Guid sourceId, string name = "Sample Copy")
    {
        var ds = new SampleDataSource
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = name,
            Type = DataSourceType.Sample,
            SourceDataSourceId = sourceId,
            Headers = ["Col1", "Col2"],
            RowCount = 3,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.SampleDataSources.Add(ds);
        await _context.SaveChangesAsync();
        return ds;
    }

    #endregion

    #region GetDataSourcesAsync Tests

    [Fact]
    public async Task GetDataSourcesAsync_ReturnsDataSourcesForProject()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();
        await SeedGoogleSheetsDataSource(projectId, "Sheet A");
        await SeedSpreadsheetDataSource(projectId, "Sheet B");

        // Act
        var result = await _service.GetDataSourcesAsync(userId, projectId);

        // Assert
        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetDataSourcesAsync_ReturnsOnlyProjectDataSources()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();
        var (_, otherProjectId) = await SeedOwnerWithProject();
        await SeedGoogleSheetsDataSource(projectId, "Mine");
        await SeedGoogleSheetsDataSource(otherProjectId, "Other");

        // Act
        var result = await _service.GetDataSourcesAsync(userId, projectId);

        // Assert
        Assert.Single(result);
        Assert.Equal("Mine", result[0].Name);
    }

    [Fact]
    public async Task GetDataSourcesAsync_EmptyProject_ReturnsEmptyList()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();

        // Act
        var result = await _service.GetDataSourcesAsync(userId, projectId);

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetDataSourcesAsync_UserWithoutAccess_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var (_, projectId) = await SeedOwnerWithProject();
        var outsiderId = Guid.NewGuid();
        _mockAuthService
            .Setup(a => a.RequireProjectAccessAsync(outsiderId, (Guid?)projectId, It.IsAny<string?>()))
            .ThrowsAsync(new UnauthorizedAccessException());

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.GetDataSourcesAsync(outsiderId, projectId));
    }

    [Fact]
    public async Task GetDataSourcesAsync_CollaboratorCanReadDataSources()
    {
        // Arrange
        var (collaboratorId, projectId) = await SeedCollaboratorWithProject();
        await SeedGoogleSheetsDataSource(projectId);

        // Act
        var result = await _service.GetDataSourcesAsync(collaboratorId, projectId);

        // Assert
        Assert.Single(result);
    }

    [Fact]
    public async Task GetDataSourcesAsync_ReturnsDtosNotEntities()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();
        await SeedGoogleSheetsDataSource(projectId, "Sheet");

        // Act
        var result = await _service.GetDataSourcesAsync(userId, projectId);

        // Assert
        Assert.IsType<List<DataSourceDto>>(result);
        Assert.Equal("GoogleSheets", result[0].Type);
    }

    #endregion

    #region GetDataSourceByIdAsync Tests

    [Fact]
    public async Task GetDataSourceByIdAsync_ExistingDataSource_ReturnsDto()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();
        var ds = await SeedGoogleSheetsDataSource(projectId);

        // Act
        var result = await _service.GetDataSourceByIdAsync(userId, ds.Id);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(ds.Id, result.Id);
        Assert.Equal(ds.Name, result.Name);
        Assert.Equal("GoogleSheets", result.Type);
    }

    [Fact]
    public async Task GetDataSourceByIdAsync_NonExistentId_ReturnsNull()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var result = await _service.GetDataSourceByIdAsync(userId, Guid.NewGuid());

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetDataSourceByIdAsync_UserWithoutProjectAccess_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var (_, projectId) = await SeedOwnerWithProject();
        var ds = await SeedGoogleSheetsDataSource(projectId);
        var outsiderId = Guid.NewGuid();
        _mockAuthService
            .Setup(a => a.RequireProjectAccessAsync(outsiderId, (Guid?)projectId, It.IsAny<string?>()))
            .ThrowsAsync(new UnauthorizedAccessException());

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.GetDataSourceByIdAsync(outsiderId, ds.Id));
    }

    [Fact]
    public async Task GetDataSourceByIdAsync_GlobalSampleDataSource_AccessibleToAnyUser()
    {
        // Arrange - global sample has no ProjectId
        var globalSample = await SeedGlobalSampleSpreadsheet("Global");
        var randomUserId = Guid.NewGuid(); // not in any project

        // Act
        var result = await _service.GetDataSourceByIdAsync(randomUserId, globalSample.Id);

        // Assert - accessible without project membership because ProjectId is null
        Assert.NotNull(result);
        Assert.Equal("Global", result.Name);
    }

    [Fact]
    public async Task GetDataSourceByIdAsync_CollaboratorCanRead()
    {
        // Arrange
        var (collaboratorId, projectId) = await SeedCollaboratorWithProject();
        var ds = await SeedSpreadsheetDataSource(projectId);

        // Act
        var result = await _service.GetDataSourceByIdAsync(collaboratorId, ds.Id);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(ds.Id, result.Id);
    }

    [Fact]
    public async Task GetDataSourceByIdAsync_SpreadsheetDataSource_IncludesJsonData()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();
        var json = """{"Headers":["A","B"],"Rows":[["1","2"]]}""";
        var ds = await SeedSpreadsheetDataSource(projectId, "With Data", json);

        // Act
        var result = await _service.GetDataSourceByIdAsync(userId, ds.Id);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(json, result.JsonData);
    }

    #endregion

    #region CreateGoogleSheetsDataSourceAsync Tests

    [Fact]
    public async Task CreateGoogleSheetsDataSourceAsync_ValidUrl_CreatesAndReturnsDtoWithCorrectType()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();
        var url = new Uri("https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=0");
        _mockGoogleSheetsService.Setup(s => s.ExtractIdsFromUrl(url)).Returns(("SHEET_ID", 0));
        _mockGoogleSheetsService.Setup(s => s.BuildCsvExportUrl("SHEET_ID", 0))
            .Returns("https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=csv&gid=0");
        _mockGoogleSheetsService.Setup(s => s.ValidateCsvAccessAsync(It.IsAny<string>())).ReturnsAsync(true);

        // Act
        var result = await _service.CreateGoogleSheetsDataSourceAsync(userId, projectId, "My Sheet", url);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("My Sheet", result.Name);
        Assert.Equal("GoogleSheets", result.Type);
        Assert.Equal(projectId, result.ProjectId);
        Assert.Equal("SHEET_ID", result.GoogleSheetsId);
    }

    [Fact]
    public async Task CreateGoogleSheetsDataSourceAsync_ValidUrl_PersistsToDatabase()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();
        var url = new Uri("https://docs.google.com/spreadsheets/d/SHEET_ID/edit");
        _mockGoogleSheetsService.Setup(s => s.ExtractIdsFromUrl(url)).Returns(("SHEET_ID", null));
        _mockGoogleSheetsService.Setup(s => s.BuildCsvExportUrl("SHEET_ID", 0)).Returns("https://csv");
        _mockGoogleSheetsService.Setup(s => s.ValidateCsvAccessAsync(It.IsAny<string>())).ReturnsAsync(true);

        // Act
        var result = await _service.CreateGoogleSheetsDataSourceAsync(userId, projectId, "Sheet", url);

        // Assert
        _context.ChangeTracker.Clear();
        var persisted = await _context.GoogleSheetsDataSources.FindAsync(result.Id);
        Assert.NotNull(persisted);
        Assert.Equal(projectId, persisted.ProjectId);
        Assert.Equal("SHEET_ID", persisted.GoogleSheetsId);
    }

    [Fact]
    public async Task CreateGoogleSheetsDataSourceAsync_InvalidUrl_ThrowsArgumentException()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();
        var url = new Uri("https://not-google.com/bad-url");
        _mockGoogleSheetsService.Setup(s => s.ExtractIdsFromUrl(url)).Returns((null, null));

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ArgumentException>(
            () => _service.CreateGoogleSheetsDataSourceAsync(userId, projectId, "Name", url));
        Assert.Contains("Invalid Google Sheets URL", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task CreateGoogleSheetsDataSourceAsync_InaccessibleSheet_ThrowsInvalidOperationException()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();
        var url = new Uri("https://docs.google.com/spreadsheets/d/SHEET_ID/edit");
        _mockGoogleSheetsService.Setup(s => s.ExtractIdsFromUrl(url)).Returns(("SHEET_ID", null));
        _mockGoogleSheetsService.Setup(s => s.BuildCsvExportUrl("SHEET_ID", 0)).Returns("https://csv");
        _mockGoogleSheetsService.Setup(s => s.ValidateCsvAccessAsync(It.IsAny<string>())).ReturnsAsync(false);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => _service.CreateGoogleSheetsDataSourceAsync(userId, projectId, "Sheet", url));
        Assert.Contains("not publicly accessible", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task CreateGoogleSheetsDataSourceAsync_EmptyName_UsesDefaultName()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();
        var url = new Uri("https://docs.google.com/spreadsheets/d/SHEET_ID/edit");
        _mockGoogleSheetsService.Setup(s => s.ExtractIdsFromUrl(url)).Returns(("SHEET_ID", null));
        _mockGoogleSheetsService.Setup(s => s.BuildCsvExportUrl("SHEET_ID", 0)).Returns("https://csv");
        _mockGoogleSheetsService.Setup(s => s.ValidateCsvAccessAsync(It.IsAny<string>())).ReturnsAsync(true);

        // Act
        var result = await _service.CreateGoogleSheetsDataSourceAsync(userId, projectId, "", url);

        // Assert
        Assert.Equal("Google Sheet (SHEET_ID)", result.Name);
    }

    [Fact]
    public async Task CreateGoogleSheetsDataSourceAsync_GidExtractedFromUrl_UsesExtractedGid()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();
        var url = new Uri("https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=999");
        _mockGoogleSheetsService.Setup(s => s.ExtractIdsFromUrl(url)).Returns(("SHEET_ID", 999));
        _mockGoogleSheetsService.Setup(s => s.BuildCsvExportUrl("SHEET_ID", 999)).Returns("https://csv");
        _mockGoogleSheetsService.Setup(s => s.ValidateCsvAccessAsync(It.IsAny<string>())).ReturnsAsync(true);

        // Act
        var result = await _service.CreateGoogleSheetsDataSourceAsync(userId, projectId, "Sheet", url);

        // Assert
        Assert.Equal(999, result.SheetGid);
        _mockGoogleSheetsService.Verify(s => s.BuildCsvExportUrl("SHEET_ID", 999), Times.Once);
    }

    [Fact]
    public async Task CreateGoogleSheetsDataSourceAsync_ExplicitGidOverridesExtractedGid()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();
        var url = new Uri("https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=999");
        _mockGoogleSheetsService.Setup(s => s.ExtractIdsFromUrl(url)).Returns(("SHEET_ID", 999));
        _mockGoogleSheetsService.Setup(s => s.BuildCsvExportUrl("SHEET_ID", 42)).Returns("https://csv");
        _mockGoogleSheetsService.Setup(s => s.ValidateCsvAccessAsync(It.IsAny<string>())).ReturnsAsync(true);

        // Act
        var result = await _service.CreateGoogleSheetsDataSourceAsync(userId, projectId, "Sheet", url, sheetGid: 42);

        // Assert
        Assert.Equal(42, result.SheetGid);
        _mockGoogleSheetsService.Verify(s => s.BuildCsvExportUrl("SHEET_ID", 42), Times.Once);
    }

    [Fact]
    public async Task CreateGoogleSheetsDataSourceAsync_CollaboratorCanCreate()
    {
        // Arrange
        var (collaboratorId, projectId) = await SeedCollaboratorWithProject();
        var url = new Uri("https://docs.google.com/spreadsheets/d/SHEET_ID/edit");
        _mockGoogleSheetsService.Setup(s => s.ExtractIdsFromUrl(url)).Returns(("SHEET_ID", null));
        _mockGoogleSheetsService.Setup(s => s.BuildCsvExportUrl("SHEET_ID", 0)).Returns("https://csv");
        _mockGoogleSheetsService.Setup(s => s.ValidateCsvAccessAsync(It.IsAny<string>())).ReturnsAsync(true);

        // Act (collaborators can modify resources)
        var result = await _service.CreateGoogleSheetsDataSourceAsync(collaboratorId, projectId, "Sheet", url);

        // Assert
        Assert.NotNull(result);
    }

    [Fact]
    public async Task CreateGoogleSheetsDataSourceAsync_UserWithoutAccess_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        var outsiderId = Guid.NewGuid();
        var url = new Uri("https://docs.google.com/spreadsheets/d/SHEET_ID/edit");
        _mockAuthService
            .Setup(a => a.EnsureCanModifyResourcesAsync(outsiderId, (Guid?)projectId))
            .ThrowsAsync(new UnauthorizedAccessException());

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.CreateGoogleSheetsDataSourceAsync(outsiderId, projectId, "Sheet", url));
    }

    #endregion

    #region CopySampleDataSourceToProjectAsync Tests

    [Fact]
    public async Task CopySampleDataSourceToProjectAsync_ValidSample_CreatesCopyInProject()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();
        var global = await SeedGlobalSampleSpreadsheet("Animals");

        // Act
        var result = await _service.CopySampleDataSourceToProjectAsync(userId, projectId, global.Id);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Animals", result.Name);
        Assert.Equal(projectId, result.ProjectId);
        Assert.Equal("Sample", result.Type);
        Assert.Equal(global.Id, result.SourceDataSourceId);
    }

    [Fact]
    public async Task CopySampleDataSourceToProjectAsync_ValidSample_PersistsToDatabase()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();
        var global = await SeedGlobalSampleSpreadsheet();

        // Act
        var result = await _service.CopySampleDataSourceToProjectAsync(userId, projectId, global.Id);

        // Assert
        _context.ChangeTracker.Clear();
        var persisted = await _context.SampleDataSources.FindAsync(result.Id);
        Assert.NotNull(persisted);
        Assert.Equal(projectId, persisted.ProjectId);
        Assert.Equal(global.Id, persisted.SourceDataSourceId);
    }

    [Fact]
    public async Task CopySampleDataSourceToProjectAsync_SampleNotFound_ThrowsKeyNotFoundException()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();

        // Act & Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _service.CopySampleDataSourceToProjectAsync(userId, projectId, Guid.NewGuid()));
    }

    [Fact]
    public async Task CopySampleDataSourceToProjectAsync_ProjectDataSourceIgnored_OnlyGlobalSamplesCanBeCopied()
    {
        // Arrange - a data source that belongs to a project (not global)
        var (userId, projectId) = await SeedOwnerWithProject();
        var projectDs = await SeedSpreadsheetDataSource(projectId, "Not Global");

        // Act & Assert - project-scoped data sources cannot be copied as samples
        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _service.CopySampleDataSourceToProjectAsync(userId, projectId, projectDs.Id));
    }

    [Fact]
    public async Task CopySampleDataSourceToProjectAsync_CopiedTwice_ReturnsSameRecord()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();
        var global = await SeedGlobalSampleSpreadsheet();

        // Act
        var first = await _service.CopySampleDataSourceToProjectAsync(userId, projectId, global.Id);
        var second = await _service.CopySampleDataSourceToProjectAsync(userId, projectId, global.Id);

        // Assert - idempotent: no duplicate records created
        Assert.Equal(first.Id, second.Id);
        var count = await _context.SampleDataSources.CountAsync(s => s.ProjectId == projectId && s.SourceDataSourceId == global.Id);
        Assert.Equal(1, count);
    }

    [Fact]
    public async Task CopySampleDataSourceToProjectAsync_CopiesHeaders()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();
        var global = new SpreadsheetDataSource
        {
            Id = Guid.NewGuid(),
            ProjectId = null,
            Name = "With Headers",
            Type = DataSourceType.Spreadsheet,
            Headers = ["Name", "Age", "City"],
            RowCount = 5,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.SpreadsheetDataSources.Add(global);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.CopySampleDataSourceToProjectAsync(userId, projectId, global.Id);

        // Assert
        Assert.Equal(["Name", "Age", "City"], result.Headers);
        Assert.Equal(5, result.RowCount);
    }

    [Fact]
    public async Task CopySampleDataSourceToProjectAsync_CollaboratorCanCopy()
    {
        // Arrange
        var (collaboratorId, projectId) = await SeedCollaboratorWithProject();
        var global = await SeedGlobalSampleSpreadsheet();

        // Act
        var result = await _service.CopySampleDataSourceToProjectAsync(collaboratorId, projectId, global.Id);

        // Assert
        Assert.NotNull(result);
    }

    [Fact]
    public async Task CopySampleDataSourceToProjectAsync_UnauthorizedUser_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var (_, projectId) = await SeedOwnerWithProject();
        var global = await SeedGlobalSampleSpreadsheet();
        var outsiderId = Guid.NewGuid();
        _mockAuthService
            .Setup(a => a.EnsureCanModifyResourcesAsync(outsiderId, (Guid?)projectId))
            .ThrowsAsync(new UnauthorizedAccessException());

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.CopySampleDataSourceToProjectAsync(outsiderId, projectId, global.Id));
    }

    #endregion

    #region GetOrCreateProjectSampleDataSourceFromAsync Tests

    [Fact]
    public async Task GetOrCreateProjectSampleDataSourceFromAsync_NewCopy_CreatesSampleDataSource()
    {
        // Arrange
        var (_, projectId) = await SeedOwnerWithProject();
        var global = await SeedGlobalSampleSpreadsheet("Source");

        // Act
        var result = await _service.GetOrCreateProjectSampleDataSourceFromAsync(projectId, global);
        await _context.SaveChangesAsync();

        // Assert
        Assert.NotNull(result);
        Assert.Equal(projectId, result.ProjectId);
        Assert.Equal(global.Id, result.SourceDataSourceId);
        Assert.Equal("Source", result.Name);
    }

    [Fact]
    public async Task GetOrCreateProjectSampleDataSourceFromAsync_ExistingCopy_ReturnsExistingRecord()
    {
        // Arrange
        var (_, projectId) = await SeedOwnerWithProject();
        var global = await SeedGlobalSampleSpreadsheet();
        var existing = await SeedSampleDataSource(projectId, global.Id, "Existing");

        // Act
        var result = await _service.GetOrCreateProjectSampleDataSourceFromAsync(projectId, global);

        // Assert - returns existing record, not a new one
        Assert.Equal(existing.Id, result.Id);
        Assert.Equal(1, await _context.SampleDataSources.CountAsync(s => s.ProjectId == projectId && s.SourceDataSourceId == global.Id));
    }

    #endregion

    #region UpdateDataSourceAsync Tests

    [Fact]
    public async Task UpdateDataSourceAsync_OwnerCanRename_ReturnsUpdatedDto()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();
        var ds = await SeedGoogleSheetsDataSource(projectId, "Old Name");

        // Act
        var result = await _service.UpdateDataSourceAsync(userId, ds.Id, "New Name");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("New Name", result.Name);
    }

    [Fact]
    public async Task UpdateDataSourceAsync_OwnerCanRename_PersistsToDatabase()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();
        var ds = await SeedGoogleSheetsDataSource(projectId, "Old");

        // Act
        await _service.UpdateDataSourceAsync(userId, ds.Id, "New");

        // Assert
        _context.ChangeTracker.Clear();
        var updated = await _context.DataSources.FindAsync(ds.Id);
        Assert.Equal("New", updated!.Name);
    }

    [Fact]
    public async Task UpdateDataSourceAsync_NonExistentDataSource_ReturnsNull()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var result = await _service.UpdateDataSourceAsync(userId, Guid.NewGuid(), "Name");

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateDataSourceAsync_UserNotInProject_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var (_, projectId) = await SeedOwnerWithProject();
        var ds = await SeedGoogleSheetsDataSource(projectId);
        var outsiderId = Guid.NewGuid();
        _mockAuthService
            .Setup(a => a.GetUserProjectRoleAsync(outsiderId, (Guid?)projectId))
            .ReturnsAsync((ProjectRole?)null);

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.UpdateDataSourceAsync(outsiderId, ds.Id, "New Name"));
    }

    [Fact]
    public async Task UpdateDataSourceAsync_CollaboratorCannotRename_ReturnsNull()
    {
        // Arrange
        var (collaboratorId, projectId) = await SeedCollaboratorWithProject();
        var ds = await SeedGoogleSheetsDataSource(projectId, "Original");
        _mockAuthService
            .Setup(a => a.GetUserProjectRoleAsync(collaboratorId, (Guid?)projectId))
            .ReturnsAsync(ProjectRole.Collaborator);

        // Act
        var result = await _service.UpdateDataSourceAsync(collaboratorId, ds.Id, "Attempted Rename");

        // Assert - collaborators cannot manage data sources
        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateDataSourceAsync_UpdatesTimestamp()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();
        var ds = await SeedGoogleSheetsDataSource(projectId);
        var originalUpdatedAt = ds.UpdatedAt;
        await Task.Delay(10); // ensure time difference

        // Act
        var result = await _service.UpdateDataSourceAsync(userId, ds.Id, "New Name");

        // Assert
        Assert.NotNull(result);
        Assert.True(result.UpdatedAt >= originalUpdatedAt);
    }

    #endregion

    #region SyncDataSourceMetadataAsync Tests

    [Fact]
    public async Task SyncDataSourceMetadataAsync_OwnerCanSync_UpdatesHeadersAndRowCount()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();
        var ds = await SeedGoogleSheetsDataSource(projectId);
        var headers = new List<string> { "Name", "Age" };

        // Act
        var result = await _service.SyncDataSourceMetadataAsync(userId, ds.Id, headers, 10);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(headers, result.Headers);
        Assert.Equal(10, result.RowCount);
    }

    [Fact]
    public async Task SyncDataSourceMetadataAsync_PersistsToDatabase()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();
        var ds = await SeedGoogleSheetsDataSource(projectId);
        var headers = new List<string> { "Col1", "Col2" };

        // Act
        await _service.SyncDataSourceMetadataAsync(userId, ds.Id, headers, 5);

        // Assert
        _context.ChangeTracker.Clear();
        var updated = await _context.DataSources.FindAsync(ds.Id);
        Assert.Equal(headers, updated!.Headers);
        Assert.Equal(5, updated.RowCount);
    }

    [Fact]
    public async Task SyncDataSourceMetadataAsync_NonExistentDataSource_ThrowsKeyNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act & Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _service.SyncDataSourceMetadataAsync(userId, Guid.NewGuid(), [], 0));
    }

    [Fact]
    public async Task SyncDataSourceMetadataAsync_GlobalSampleDataSource_ThrowsInvalidOperationException()
    {
        // Arrange
        var global = await SeedGlobalSampleSpreadsheet();
        var userId = Guid.NewGuid();

        // Act & Assert
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => _service.SyncDataSourceMetadataAsync(userId, global.Id, [], 0));
        Assert.Contains("Sample data sources cannot be synced", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task SyncDataSourceMetadataAsync_CollaboratorCannotSync_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var (collaboratorId, projectId) = await SeedCollaboratorWithProject();
        var ds = await SeedGoogleSheetsDataSource(projectId);
        _mockAuthService
            .Setup(a => a.RequirePermissionAsync(collaboratorId, (Guid?)projectId, It.IsAny<Func<ProjectRole, bool>>(), It.IsAny<string>()))
            .ThrowsAsync(new UnauthorizedAccessException());

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.SyncDataSourceMetadataAsync(collaboratorId, ds.Id, [], 0));
    }

    [Fact]
    public async Task SyncDataSourceMetadataAsync_UserNotInProject_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var (_, projectId) = await SeedOwnerWithProject();
        var ds = await SeedGoogleSheetsDataSource(projectId);
        var outsiderId = Guid.NewGuid();
        _mockAuthService
            .Setup(a => a.RequirePermissionAsync(outsiderId, (Guid?)projectId, It.IsAny<Func<ProjectRole, bool>>(), It.IsAny<string>()))
            .ThrowsAsync(new UnauthorizedAccessException());

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.SyncDataSourceMetadataAsync(outsiderId, ds.Id, [], 0));
    }

    #endregion

    #region DeleteDataSourceAsync Tests

    [Fact]
    public async Task DeleteDataSourceAsync_OwnerCanDelete_ReturnsTrue()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();
        var ds = await SeedGoogleSheetsDataSource(projectId);

        // Act
        var result = await _service.DeleteDataSourceAsync(userId, ds.Id);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task DeleteDataSourceAsync_OwnerCanDelete_RemovesFromDatabase()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();
        var ds = await SeedGoogleSheetsDataSource(projectId);

        // Act
        await _service.DeleteDataSourceAsync(userId, ds.Id);

        // Assert
        _context.ChangeTracker.Clear();
        var deleted = await _context.DataSources.FindAsync(ds.Id);
        Assert.Null(deleted);
    }

    [Fact]
    public async Task DeleteDataSourceAsync_NonExistentDataSource_ReturnsFalse()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var result = await _service.DeleteDataSourceAsync(userId, Guid.NewGuid());

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task DeleteDataSourceAsync_UserNotInProject_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var (_, projectId) = await SeedOwnerWithProject();
        var ds = await SeedGoogleSheetsDataSource(projectId);
        var outsiderId = Guid.NewGuid();
        _mockAuthService
            .Setup(a => a.GetUserProjectRoleAsync(outsiderId, (Guid?)projectId))
            .ReturnsAsync((ProjectRole?)null);

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.DeleteDataSourceAsync(outsiderId, ds.Id));
    }

    [Fact]
    public async Task DeleteDataSourceAsync_CollaboratorCannotDelete_ReturnsFalse()
    {
        // Arrange
        var (collaboratorId, projectId) = await SeedCollaboratorWithProject();
        var ds = await SeedGoogleSheetsDataSource(projectId);
        _mockAuthService
            .Setup(a => a.GetUserProjectRoleAsync(collaboratorId, (Guid?)projectId))
            .ReturnsAsync(ProjectRole.Collaborator);

        // Act
        var result = await _service.DeleteDataSourceAsync(collaboratorId, ds.Id);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task DeleteDataSourceAsync_CollaboratorCannotDelete_DataSourceRemainsInDatabase()
    {
        // Arrange
        var (collaboratorId, projectId) = await SeedCollaboratorWithProject();
        var ds = await SeedGoogleSheetsDataSource(projectId);
        _mockAuthService
            .Setup(a => a.GetUserProjectRoleAsync(collaboratorId, (Guid?)projectId))
            .ReturnsAsync(ProjectRole.Collaborator);

        // Act
        await _service.DeleteDataSourceAsync(collaboratorId, ds.Id);

        // Assert - data source was not deleted
        _context.ChangeTracker.Clear();
        var stillExists = await _context.DataSources.FindAsync(ds.Id);
        Assert.NotNull(stillExists);
    }

    #endregion

    #region CreateSpreadsheetDataSourceAsync Tests

    [Fact]
    public async Task CreateSpreadsheetDataSourceAsync_OwnerCanCreate_ReturnsDto()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();

        // Act
        var result = await _service.CreateSpreadsheetDataSourceAsync(userId, projectId, "My Spreadsheet");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("My Spreadsheet", result.Name);
        Assert.Equal("Spreadsheet", result.Type);
        Assert.Equal(projectId, result.ProjectId);
    }

    [Fact]
    public async Task CreateSpreadsheetDataSourceAsync_PersistsToDatabase()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();

        // Act
        var result = await _service.CreateSpreadsheetDataSourceAsync(userId, projectId, "Sheet");

        // Assert
        _context.ChangeTracker.Clear();
        var persisted = await _context.SpreadsheetDataSources.FindAsync(result.Id);
        Assert.NotNull(persisted);
        Assert.Equal("Sheet", persisted.Name);
        Assert.Equal(projectId, persisted.ProjectId);
    }

    [Fact]
    public async Task CreateSpreadsheetDataSourceAsync_CollaboratorCanCreate()
    {
        // Arrange
        var (collaboratorId, projectId) = await SeedCollaboratorWithProject();

        // Act
        var result = await _service.CreateSpreadsheetDataSourceAsync(collaboratorId, projectId, "Sheet");

        // Assert
        Assert.NotNull(result);
    }

    [Fact]
    public async Task CreateSpreadsheetDataSourceAsync_UnauthorizedUser_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var (_, projectId) = await SeedOwnerWithProject();
        var outsiderId = Guid.NewGuid();
        _mockAuthService
            .Setup(a => a.EnsureCanModifyResourcesAsync(outsiderId, (Guid?)projectId))
            .ThrowsAsync(new UnauthorizedAccessException());

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.CreateSpreadsheetDataSourceAsync(outsiderId, projectId, "Sheet"));
    }

    [Fact]
    public async Task CreateSpreadsheetDataSourceAsync_NewIdAssigned()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();

        // Act
        var result = await _service.CreateSpreadsheetDataSourceAsync(userId, projectId, "Sheet");

        // Assert
        Assert.NotEqual(Guid.Empty, result.Id);
    }

    #endregion

    #region UpdateSpreadsheetDataSourceAsync Tests

    [Fact]
    public async Task UpdateSpreadsheetDataSourceAsync_OwnerCanUpdate_ReturnsUpdatedDto()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();
        var ds = await SeedSpreadsheetDataSource(projectId, "Old");
        var json = """{"Headers":["A","B"],"Rows":[["1","2"],["3","4"]]}""";

        // Act
        var result = await _service.UpdateSpreadsheetDataSourceAsync(userId, ds.Id, "New Name", json);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("New Name", result.Name);
        Assert.Equal(json, result.JsonData);
    }

    [Fact]
    public async Task UpdateSpreadsheetDataSourceAsync_ValidJson_ParsesHeadersAndRowCount()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();
        var ds = await SeedSpreadsheetDataSource(projectId);
        var json = """{"Headers":["Name","Age"],"Rows":[["Alice","30"],["Bob","25"]]}""";

        // Act
        var result = await _service.UpdateSpreadsheetDataSourceAsync(userId, ds.Id, "Sheet", json);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(["Name", "Age"], result.Headers);
        Assert.Equal(2, result.RowCount);
    }

    [Fact]
    public async Task UpdateSpreadsheetDataSourceAsync_NullJson_ClearsHeadersAndRowCount()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();
        var ds = await SeedSpreadsheetDataSource(projectId, jsonData: """{"Headers":["A"],"Rows":[["1"]]}""");

        // Act
        var result = await _service.UpdateSpreadsheetDataSourceAsync(userId, ds.Id, "Sheet", null);

        // Assert
        Assert.NotNull(result);
        Assert.Null(result.Headers);
        Assert.Null(result.RowCount);
    }

    [Fact]
    public async Task UpdateSpreadsheetDataSourceAsync_PersistsToDatabase()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();
        var ds = await SeedSpreadsheetDataSource(projectId);
        var json = """{"Headers":["X"],"Rows":[["a"]]}""";

        // Act
        await _service.UpdateSpreadsheetDataSourceAsync(userId, ds.Id, "Updated", json);

        // Assert
        _context.ChangeTracker.Clear();
        var updated = await _context.SpreadsheetDataSources.FindAsync(ds.Id);
        Assert.Equal("Updated", updated!.Name);
        Assert.Equal(json, updated.JsonData);
    }

    [Fact]
    public async Task UpdateSpreadsheetDataSourceAsync_NonExistentId_ReturnsNull()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var result = await _service.UpdateSpreadsheetDataSourceAsync(userId, Guid.NewGuid(), "Name", null);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateSpreadsheetDataSourceAsync_CollaboratorCannotUpdate_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var (collaboratorId, projectId) = await SeedCollaboratorWithProject();
        var ds = await SeedSpreadsheetDataSource(projectId);
        _mockAuthService
            .Setup(a => a.RequirePermissionAsync(collaboratorId, (Guid?)projectId, It.IsAny<Func<ProjectRole, bool>>(), It.IsAny<string>()))
            .ThrowsAsync(new UnauthorizedAccessException());

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.UpdateSpreadsheetDataSourceAsync(collaboratorId, ds.Id, "New", null));
    }

    [Fact]
    public async Task UpdateSpreadsheetDataSourceAsync_InvalidJson_SetsNullHeadersAndRowCount()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();
        var ds = await SeedSpreadsheetDataSource(projectId);

        // Act
        var result = await _service.UpdateSpreadsheetDataSourceAsync(userId, ds.Id, "Sheet", "not-valid-json");

        // Assert
        Assert.NotNull(result);
        Assert.Null(result.Headers);
        Assert.Null(result.RowCount);
    }

    [Fact]
    public async Task UpdateSpreadsheetDataSourceAsync_EmptyHeaders_SetsNullHeaders()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();
        var ds = await SeedSpreadsheetDataSource(projectId);
        var json = """{"Headers":[],"Rows":[["1","2"]]}""";

        // Act
        var result = await _service.UpdateSpreadsheetDataSourceAsync(userId, ds.Id, "Sheet", json);

        // Assert - empty headers list treated as null
        Assert.NotNull(result);
        Assert.Null(result.Headers);
        Assert.Equal(1, result.RowCount);
    }

    #endregion

    #region GetSpreadsheetDataSourceDetailAsync Tests

    [Fact]
    public async Task GetSpreadsheetDataSourceDetailAsync_OwnerCanRead_ReturnsDto()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();
        var json = """{"Headers":["A"],"Rows":[]}""";
        var ds = await SeedSpreadsheetDataSource(projectId, "Sheet", json);

        // Act
        var result = await _service.GetSpreadsheetDataSourceDetailAsync(userId, ds.Id);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(ds.Id, result.Id);
        Assert.Equal(json, result.JsonData);
    }

    [Fact]
    public async Task GetSpreadsheetDataSourceDetailAsync_NonExistentId_ReturnsNull()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var result = await _service.GetSpreadsheetDataSourceDetailAsync(userId, Guid.NewGuid());

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetSpreadsheetDataSourceDetailAsync_UserWithoutAccess_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var (_, projectId) = await SeedOwnerWithProject();
        var ds = await SeedSpreadsheetDataSource(projectId);
        var outsiderId = Guid.NewGuid();
        _mockAuthService
            .Setup(a => a.RequireProjectAccessAsync(outsiderId, (Guid?)projectId, It.IsAny<string?>()))
            .ThrowsAsync(new UnauthorizedAccessException());

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.GetSpreadsheetDataSourceDetailAsync(outsiderId, ds.Id));
    }

    [Fact]
    public async Task GetSpreadsheetDataSourceDetailAsync_GlobalSpreadsheet_AccessibleWithoutProjectMembership()
    {
        // Arrange - global spreadsheet (ProjectId = null)
        var ds = await SeedGlobalSampleSpreadsheet("Global Sheet");
        var randomUserId = Guid.NewGuid();

        // Act
        var result = await _service.GetSpreadsheetDataSourceDetailAsync(randomUserId, ds.Id);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Global Sheet", result.Name);
    }

    [Fact]
    public async Task GetSpreadsheetDataSourceDetailAsync_CollaboratorCanRead()
    {
        // Arrange
        var (collaboratorId, projectId) = await SeedCollaboratorWithProject();
        var ds = await SeedSpreadsheetDataSource(projectId, "Sheet");

        // Act
        var result = await _service.GetSpreadsheetDataSourceDetailAsync(collaboratorId, ds.Id);

        // Assert
        Assert.NotNull(result);
    }

    [Fact]
    public async Task GetSpreadsheetDataSourceDetailAsync_NonSpreadsheetDataSource_ReturnsNull()
    {
        // Arrange - looking up a GoogleSheets datasource via the spreadsheet-specific method
        var (userId, projectId) = await SeedOwnerWithProject();
        var gs = await SeedGoogleSheetsDataSource(projectId);

        // Act
        var result = await _service.GetSpreadsheetDataSourceDetailAsync(userId, gs.Id);

        // Assert - not a SpreadsheetDataSource, so not found in that DbSet
        Assert.Null(result);
    }

    #endregion

    #region ParseJsonDataMetadata Tests (via UpdateSpreadsheetDataSourceAsync)

    [Theory]
    [InlineData(null, null, null)]
    [InlineData("", null, null)]
    [InlineData("   ", null, null)]
    public async Task UpdateSpreadsheetDataSourceAsync_WhitespaceOrNullJson_ProducesNullMetadata(
        string? json, List<string>? expectedHeaders, int? expectedRowCount)
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();
        var ds = await SeedSpreadsheetDataSource(projectId);

        // Act
        var result = await _service.UpdateSpreadsheetDataSourceAsync(userId, ds.Id, "Sheet", json);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(expectedHeaders, result.Headers);
        Assert.Equal(expectedRowCount, result.RowCount);
    }

    [Fact]
    public async Task UpdateSpreadsheetDataSourceAsync_ValidJsonWithMultipleRows_CountsRowsCorrectly()
    {
        // Arrange
        var (userId, projectId) = await SeedOwnerWithProject();
        var ds = await SeedSpreadsheetDataSource(projectId);
        var json = """{"Headers":["A","B","C"],"Rows":[["1","2","3"],["4","5","6"],["7","8","9"]]}""";

        // Act
        var result = await _service.UpdateSpreadsheetDataSourceAsync(userId, ds.Id, "Sheet", json);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(["A", "B", "C"], result.Headers);
        Assert.Equal(3, result.RowCount);
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
