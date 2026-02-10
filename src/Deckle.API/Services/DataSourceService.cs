using System.Text.Json;
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

    public async Task<List<DataSourceDto>> GetDataSourcesAsync(Guid userId, Guid? projectId)
    {
        await _authService.RequireProjectAccessAsync(userId, projectId);

        var dataSources = await _dbContext.DataSources
            .Where(ds => ds.ProjectId == projectId)
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

    public async Task<DataSourceDto> CreateGoogleSheetsDataSourceAsync(Guid userId, Guid? projectId, string name, Uri url, int? sheetGid = null)
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
            GoogleSheetsUrl = url,
            SheetGid = finalSheetGid,
            CsvExportUrl = new Uri(csvExportUrl),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.GoogleSheetsDataSources.Add(dataSource);
        await _dbContext.SaveChangesAsync();

        return DataSourceDto.FromEntity(dataSource);
    }

    public async Task<DataSourceDto> CopySampleDataSourceToProjectAsync(Guid userId, Guid projectId, Guid sampleDataSourceId)
    {
        await _authService.EnsureCanModifyResourcesAsync(userId, projectId);

        var sample = await _dbContext.DataSources
            .SingleOrDefaultAsync(ds => ds.Id == sampleDataSourceId && ds.ProjectId == null)
            ?? throw new KeyNotFoundException($"Sample data source with ID {sampleDataSourceId} not found");

        var copy = await GetOrCreateProjectSampleDataSourceFromAsync(projectId, sample);

        await _dbContext.SaveChangesAsync();

        return DataSourceDto.FromEntity(copy);
    }

    public async Task<SampleDataSource> GetOrCreateProjectSampleDataSourceFromAsync(Guid projectId, DataSource dataSource) {
        var sample = await _dbContext.SampleDataSources.FirstOrDefaultAsync(x => x.ProjectId == projectId && x.SourceDataSourceId == dataSource.Id);
        if (sample is not null)
            return sample;

        var copy = new SampleDataSource
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = dataSource.Name,
            Type = DataSourceType.Sample,
            Headers = dataSource.Headers != null ? [.. dataSource.Headers] : null,
            RowCount = dataSource.RowCount,
            SourceDataSourceId = dataSource.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _dbContext.SampleDataSources.AddAsync(copy);

        return copy;
    }

    public async Task<DataSourceDto?> UpdateDataSourceAsync(Guid userId, Guid dataSourceId, string name)
    {
        var dataSource = await _dbContext.DataSources
            .FirstOrDefaultAsync(ds => ds.Id == dataSourceId);

        if (dataSource == null)
        {
            return null;
        }

        // Check user's role
        var role = await _authService.GetUserProjectRoleAsync(userId, dataSource.ProjectId)
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

        // Check user's role
        var role = await _authService.GetUserProjectRoleAsync(userId, dataSource.ProjectId)
            ?? throw new UnauthorizedAccessException("User does not have access to this data source");

        if (!ProjectAuthorizationService.CanModifyResources(role))
        {
            return false;
        }

        _dbContext.DataSources.Remove(dataSource);
        await _dbContext.SaveChangesAsync();

        return true;
    }

    public async Task<DataSourceDto> CreateSpreadsheetDataSourceAsync(Guid userId, Guid? projectId, string name)
    {
        await _authService.EnsureCanModifyResourcesAsync(userId, projectId);

        var dataSource = new SpreadsheetDataSource
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = name,
            Type = DataSourceType.Spreadsheet,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.SpreadsheetDataSources.Add(dataSource);
        await _dbContext.SaveChangesAsync();

        return DataSourceDto.FromEntity(dataSource);
    }

    public async Task<DataSourceDto?> UpdateSpreadsheetDataSourceAsync(Guid userId, Guid dataSourceId, string name, string? jsonData)
    {
        var dataSource = await _dbContext.SpreadsheetDataSources
            .FirstOrDefaultAsync(ds => ds.Id == dataSourceId);

        if (dataSource == null)
        {
            return null;
        }

        await _authService.RequirePermissionAsync(
            userId,
            dataSource.ProjectId,
            ProjectAuthorizationService.CanModifyResources,
            "User does not have permission to update this data source");

        dataSource.Name = name;
        dataSource.JsonData = jsonData;

        var (headers, rowCount) = ParseJsonDataMetadata(jsonData);
        dataSource.Headers = headers;
        dataSource.RowCount = rowCount;
        dataSource.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        return DataSourceDto.FromEntity(dataSource);
    }

    public async Task<DataSourceDto?> GetSpreadsheetDataSourceDetailAsync(Guid userId, Guid dataSourceId)
    {
        var dataSource = await _dbContext.SpreadsheetDataSources
            .FirstOrDefaultAsync(ds => ds.Id == dataSourceId);

        if (dataSource == null)
        {
            return null;
        }

        if (dataSource.ProjectId.HasValue)
        {
            await _authService.RequireProjectAccessAsync(userId, dataSource.ProjectId.Value,
                "User does not have access to this data source");
        }

        return DataSourceDto.FromEntity(dataSource);
    }

    private static (List<string>? Headers, int? RowCount) ParseJsonDataMetadata(string? jsonData)
    {
        if (string.IsNullOrWhiteSpace(jsonData))
        {
            return (null, null);
        }

        try
        {
            var parsed = JsonSerializer.Deserialize<SampleDataJson>(jsonData,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (parsed == null)
            {
                return (null, null);
            }

            return (parsed.Headers.Count > 0 ? parsed.Headers : null, parsed.Rows.Count);
        }
        catch (JsonException)
        {
            return (null, null);
        }
    }
}
