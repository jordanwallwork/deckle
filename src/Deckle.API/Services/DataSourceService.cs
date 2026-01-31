using Deckle.API.DTOs;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deckle.API.Services;

public class DataSourceService
{
    private readonly AppDbContext _dbContext;
    private readonly GoogleSheetsService _googleSheetsService;
    private readonly ProjectAuthorizationService _authService;

    public DataSourceService(AppDbContext dbContext, GoogleSheetsService googleSheetsService, ProjectAuthorizationService authService)
    {
        _dbContext = dbContext;
        _googleSheetsService = googleSheetsService;
        _authService = authService;
    }

    public async Task<List<DataSourceDto>> GetProjectDataSourcesAsync(Guid userId, Guid projectId)
    {
        await _authService.RequireProjectAccessAsync(userId, projectId);

        var dataSources = await _dbContext.DataSources
            .Where(ds => ds.ProjectId == projectId)
            .ToListAsync();

        return [.. dataSources.Select(DataSourceDto.FromEntity)];
    }

    /// <summary>
    /// Gets all sample data sources (not associated with any project).
    /// These are available to all authenticated users.
    /// </summary>
    public async Task<List<DataSourceDto>> GetSampleDataSourcesAsync()
    {
        var dataSources = await _dbContext.SampleDataSources
            .Where(ds => ds.ProjectId == null)
            .ToListAsync();

        return [.. dataSources.Select(DataSourceDto.FromEntity)];
    }

    public async Task<DataSourceDto?> GetDataSourceByIdAsync(Guid userId, Guid dataSourceId)
    {
        var dataSource = await _dbContext.DataSources
            .FirstOrDefaultAsync(ds => ds.Id == dataSourceId);

        if (dataSource == null)
        {
            return null;
        }

        // Sample data sources without a project are accessible to all authenticated users
        if (dataSource.ProjectId.HasValue)
        {
            await _authService.RequireProjectAccessAsync(userId, dataSource.ProjectId.Value, "User does not have access to this data source");
        }

        return DataSourceDto.FromEntity(dataSource);
    }

    public async Task<DataSourceDto> CreateGoogleSheetsDataSourceAsync(Guid userId, Guid projectId, string name, string url, int? sheetGid = null)
    {
        await _authService.EnsureCanModifyResourcesAsync(userId, projectId);

        // Extract spreadsheet ID and sheet GID from URL
        var (extractedSpreadsheetId, extractedSheetGid) = _googleSheetsService.ExtractIdsFromUrl(url);

        if (string.IsNullOrEmpty(extractedSpreadsheetId))
        {
            throw new ArgumentException("Invalid Google Sheets URL. Please provide a valid Google Sheets URL.");
        }

        // Use extracted GID if not explicitly provided
        var finalSheetGid = sheetGid ?? extractedSheetGid ?? 0;

        // Build CSV export URL
        var csvExportUrl = _googleSheetsService.BuildCsvExportUrl(extractedSpreadsheetId, finalSheetGid);

        // Validate that the sheet is publicly accessible
        var isAccessible = await _googleSheetsService.ValidateCsvAccessAsync(csvExportUrl);
        if (!isAccessible)
        {
            throw new InvalidOperationException(
                "This Google Sheet is not publicly accessible. " +
                "Please set sharing to 'Anyone with the link can view' in Google Sheets."
            );
        }

        // Use provided name or generate a default one
        if (string.IsNullOrEmpty(name))
        {
            name = $"Google Sheet ({extractedSpreadsheetId})";
        }

        var dataSource = new GoogleSheetsDataSource
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = name,
            Type = DataSourceType.GoogleSheets,
            GoogleSheetsId = extractedSpreadsheetId,
            GoogleSheetsUrl = new Uri(url),
            SheetGid = finalSheetGid,
            CsvExportUrl = new Uri(csvExportUrl),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.GoogleSheetsDataSources.Add(dataSource);
        await _dbContext.SaveChangesAsync();

        return DataSourceDto.FromEntity(dataSource);
    }

    public async Task<DataSourceDto?> UpdateDataSourceAsync(Guid userId, Guid dataSourceId, string name)
    {
        var dataSource = await _dbContext.DataSources
            .FirstOrDefaultAsync(ds => ds.Id == dataSourceId);

        if (dataSource == null)
        {
            return null;
        }

        // Sample data sources without a project cannot be updated via this method
        if (!dataSource.ProjectId.HasValue)
        {
            throw new InvalidOperationException("Sample data sources cannot be updated through this method");
        }

        // Check user's role
        var role = await _authService.GetUserProjectRoleAsync(userId, dataSource.ProjectId.Value)
            ?? throw new UnauthorizedAccessException("User does not have access to this data source");

        if (!ProjectAuthorizationService.CanModifyResources(role))
        {
            return null;
        }

        // Update name
        dataSource.Name = name;
        dataSource.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        return DataSourceDto.FromEntity(dataSource);
    }

    public async Task<DataSourceDto> SyncDataSourceMetadataAsync(Guid userId, Guid dataSourceId, List<string> headers, int rowCount)
    {
        var dataSource = await _dbContext.DataSources
            .FirstOrDefaultAsync(ds => ds.Id == dataSourceId)
            ?? throw new KeyNotFoundException($"Data source with ID {dataSourceId} not found");

        // Sample data sources without a project cannot be synced via this method
        if (!dataSource.ProjectId.HasValue)
        {
            throw new InvalidOperationException("Sample data sources cannot be synced through this method");
        }

        await _authService.RequirePermissionAsync(
            userId,
            dataSource.ProjectId.Value,
            ProjectAuthorizationService.CanModifyResources,
            "User does not have permission to sync data sources");

        // Update metadata
        dataSource.Headers = headers;
        dataSource.RowCount = rowCount;
        dataSource.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        return DataSourceDto.FromEntity(dataSource);
    }

    public async Task<bool> DeleteDataSourceAsync(Guid userId, Guid dataSourceId)
    {
        var dataSource = await _dbContext.DataSources
            .FirstOrDefaultAsync(ds => ds.Id == dataSourceId);

        if (dataSource == null)
        {
            return false;
        }

        // Sample data sources without a project cannot be deleted via this method
        if (!dataSource.ProjectId.HasValue)
        {
            throw new InvalidOperationException("Sample data sources cannot be deleted through this method");
        }

        // Check user's role
        var role = await _authService.GetUserProjectRoleAsync(userId, dataSource.ProjectId.Value)
            ?? throw new UnauthorizedAccessException("User does not have access to this data source");

        if (!ProjectAuthorizationService.CanModifyResources(role))
        {
            return false;
        }

        _dbContext.DataSources.Remove(dataSource);
        await _dbContext.SaveChangesAsync();

        return true;
    }
}
