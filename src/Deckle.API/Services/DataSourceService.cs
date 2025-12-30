using Deckle.API.DTOs;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deckle.API.Services;

public class DataSourceService
{
    private readonly AppDbContext _dbContext;
    private readonly GoogleSheetsService _googleSheetsService;

    public DataSourceService(AppDbContext dbContext, GoogleSheetsService googleSheetsService)
    {
        _dbContext = dbContext;
        _googleSheetsService = googleSheetsService;
    }

    public async Task<List<DataSourceDto>> GetProjectDataSourcesAsync(Guid userId, Guid projectId)
    {
        // Verify user has access to the project
        var hasAccess = await _dbContext.UserProjects
            .AnyAsync(up => up.UserId == userId && up.ProjectId == projectId);

        if (!hasAccess)
        {
            throw new UnauthorizedAccessException("User does not have access to this project");
        }

        var dataSources = await _dbContext.DataSources
            .Where(ds => ds.ProjectId == projectId)
            .Select(ds => new DataSourceDto
            {
                Id = ds.Id,
                ProjectId = ds.ProjectId,
                Name = ds.Name,
                Type = ds.Type.ToString(),
                GoogleSheetsId = ds.GoogleSheetsId,
                GoogleSheetsUrl = ds.GoogleSheetsUrl,
                SheetGid = ds.SheetGid,
                CsvExportUrl = ds.CsvExportUrl,
                Headers = ds.Headers,
                RowCount = ds.RowCount,
                CreatedAt = ds.CreatedAt,
                UpdatedAt = ds.UpdatedAt
            })
            .ToListAsync();

        return dataSources;
    }

    public async Task<DataSourceDto?> GetDataSourceByIdAsync(Guid userId, Guid dataSourceId)
    {
        var dataSource = await _dbContext.DataSources
            .Include(ds => ds.Project)
                .ThenInclude(p => p.UserProjects)
            .FirstOrDefaultAsync(ds => ds.Id == dataSourceId);

        if (dataSource == null)
        {
            return null;
        }

        // Verify user has access to the project
        var hasAccess = dataSource.Project.UserProjects.Any(up => up.UserId == userId);
        if (!hasAccess)
        {
            throw new UnauthorizedAccessException("User does not have access to this data source");
        }

        return new DataSourceDto
        {
            Id = dataSource.Id,
            ProjectId = dataSource.ProjectId,
            Name = dataSource.Name,
            Type = dataSource.Type.ToString(),
            GoogleSheetsId = dataSource.GoogleSheetsId,
            GoogleSheetsUrl = dataSource.GoogleSheetsUrl,
            SheetGid = dataSource.SheetGid,
            CsvExportUrl = dataSource.CsvExportUrl,
            Headers = dataSource.Headers,
            RowCount = dataSource.RowCount,
            CreatedAt = dataSource.CreatedAt,
            UpdatedAt = dataSource.UpdatedAt
        };
    }

    public async Task<DataSourceDto> CreateGoogleSheetsDataSourceAsync(Guid userId, Guid projectId, string name, string url, int? sheetGid = null)
    {
        // Verify user has access to the project
        var hasAccess = await _dbContext.UserProjects
            .AnyAsync(up => up.UserId == userId && up.ProjectId == projectId);

        if (!hasAccess)
        {
            throw new UnauthorizedAccessException("User does not have access to this project");
        }

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

        var dataSource = new DataSource
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = name,
            Type = DataSourceType.GoogleSheets,
            ConnectionString = csvExportUrl,
            GoogleSheetsId = extractedSpreadsheetId,
            GoogleSheetsUrl = url,
            SheetGid = finalSheetGid,
            CsvExportUrl = csvExportUrl,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.DataSources.Add(dataSource);
        await _dbContext.SaveChangesAsync();

        return new DataSourceDto
        {
            Id = dataSource.Id,
            ProjectId = dataSource.ProjectId,
            Name = dataSource.Name,
            Type = dataSource.Type.ToString(),
            GoogleSheetsId = dataSource.GoogleSheetsId,
            GoogleSheetsUrl = dataSource.GoogleSheetsUrl,
            SheetGid = dataSource.SheetGid,
            CsvExportUrl = dataSource.CsvExportUrl,
            Headers = dataSource.Headers,
            RowCount = dataSource.RowCount,
            CreatedAt = dataSource.CreatedAt,
            UpdatedAt = dataSource.UpdatedAt
        };
    }

    public async Task<DataSourceDto> SyncDataSourceMetadataAsync(Guid userId, Guid dataSourceId, List<string> headers, int rowCount)
    {
        var dataSource = await _dbContext.DataSources
            .Include(ds => ds.Project)
                .ThenInclude(p => p.UserProjects)
            .FirstOrDefaultAsync(ds => ds.Id == dataSourceId);

        if (dataSource == null)
        {
            throw new KeyNotFoundException($"Data source with ID {dataSourceId} not found");
        }

        // Verify user has access to the project
        var hasAccess = dataSource.Project.UserProjects.Any(up => up.UserId == userId);
        if (!hasAccess)
        {
            throw new UnauthorizedAccessException("User does not have access to this data source");
        }

        // Update metadata
        dataSource.Headers = headers;
        dataSource.RowCount = rowCount;
        dataSource.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        return new DataSourceDto
        {
            Id = dataSource.Id,
            ProjectId = dataSource.ProjectId,
            Name = dataSource.Name,
            Type = dataSource.Type.ToString(),
            GoogleSheetsId = dataSource.GoogleSheetsId,
            GoogleSheetsUrl = dataSource.GoogleSheetsUrl,
            SheetGid = dataSource.SheetGid,
            CsvExportUrl = dataSource.CsvExportUrl,
            Headers = dataSource.Headers,
            RowCount = dataSource.RowCount,
            CreatedAt = dataSource.CreatedAt,
            UpdatedAt = dataSource.UpdatedAt
        };
    }

    public async Task<bool> DeleteDataSourceAsync(Guid userId, Guid dataSourceId)
    {
        var dataSource = await _dbContext.DataSources
            .Include(ds => ds.Project)
                .ThenInclude(p => p.UserProjects)
            .FirstOrDefaultAsync(ds => ds.Id == dataSourceId);

        if (dataSource == null)
        {
            return false;
        }

        // Verify user has access to the project
        var hasAccess = dataSource.Project.UserProjects.Any(up => up.UserId == userId);
        if (!hasAccess)
        {
            throw new UnauthorizedAccessException("User does not have access to this data source");
        }

        _dbContext.DataSources.Remove(dataSource);
        await _dbContext.SaveChangesAsync();

        return true;
    }
}
