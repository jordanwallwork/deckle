using System.Text.Json;
using Deckle.API.DTOs;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deckle.API.Services;

public class AdminService
{
    private readonly AppDbContext _dbContext;
    private readonly ComponentService _componentService;

    public AdminService(AppDbContext dbContext, ComponentService componentService)
    {
        _dbContext = dbContext;
        _componentService = componentService;
    }

    public async Task<AdminUserListResponse> GetUsersAsync(int page = 1, int pageSize = 20, string? search = null)
    {
        var query = _dbContext.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(u =>
                u.Email.Contains(search, StringComparison.CurrentCultureIgnoreCase) ||
                (u.Name != null && u.Name.Contains(search, StringComparison.CurrentCultureIgnoreCase)));
        }

        var totalCount = await query.CountAsync();

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new AdminUserDto
            {
                Id = u.Id,
                Email = u.Email,
                Name = u.Name,
                PictureUrl = u.PictureUrl,
                Role = u.Role.ToString(),
                CreatedAt = u.CreatedAt,
                LastLoginAt = u.LastLoginAt,
                StorageQuotaMb = u.StorageQuotaMb,
                StorageUsedBytes = u.StorageUsedBytes,
                ProjectCount = u.UserProjects.Count(up => up.Role == ProjectRole.Owner)
            })
            .ToListAsync();

        return new AdminUserListResponse
        {
            Users = users,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<AdminUserDto?> GetUserByIdAsync(Guid userId)
    {
        return await _dbContext.Users
            .Where(u => u.Id == userId)
            .Select(u => new AdminUserDto
            {
                Id = u.Id,
                Email = u.Email,
                Name = u.Name,
                PictureUrl = u.PictureUrl,
                Role = u.Role.ToString(),
                CreatedAt = u.CreatedAt,
                LastLoginAt = u.LastLoginAt,
                StorageQuotaMb = u.StorageQuotaMb,
                StorageUsedBytes = u.StorageUsedBytes,
                ProjectCount = u.UserProjects.Count(up => up.Role == ProjectRole.Owner)
            })
            .FirstOrDefaultAsync();
    }

    public async Task<AdminUserDto?> UpdateUserRoleAsync(Guid userId, string role)
    {
        if (!Enum.TryParse<UserRole>(role, ignoreCase: true, out var userRole))
        {
            return null;
        }

        var user = await _dbContext.Users.FindAsync(userId);
        if (user == null)
        {
            return null;
        }

        user.Role = userRole;
        user.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();

        return await GetUserByIdAsync(userId);
    }

    public async Task<AdminUserDto?> UpdateUserQuotaAsync(Guid userId, int storageQuotaMb)
    {
        if (storageQuotaMb < 0)
        {
            return null;
        }

        var user = await _dbContext.Users.FindAsync(userId);
        if (user == null)
        {
            return null;
        }

        user.StorageQuotaMb = storageQuotaMb;
        user.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();

        return await GetUserByIdAsync(userId);
    }

    // Sample/Spreadsheet Data Source CRUD (admin manages template data sources)

    public async Task<AdminSampleDataSourceListResponse> GetSampleDataSourcesAsync(
        int page = 1, int pageSize = 20, string? search = null)
    {
        var query = _dbContext.DataSources
            .Where(ds => ds.ProjectId == null && (ds.Type == DataSourceType.Sample || ds.Type == DataSourceType.Spreadsheet));

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(ds =>
                ds.Name.Contains(search, StringComparison.CurrentCultureIgnoreCase));
        }

        var totalCount = await query.CountAsync();

        var dataSources = await query
            .OrderByDescending(ds => ds.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(ds => new AdminSampleDataSourceDto
            {
                Id = ds.Id,
                Name = ds.Name,
                Headers = ds.Headers,
                RowCount = ds.RowCount,
                CreatedAt = ds.CreatedAt,
                UpdatedAt = ds.UpdatedAt
            })
            .ToListAsync();

        return new AdminSampleDataSourceListResponse
        {
            DataSources = dataSources,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<AdminSampleDataSourceDetailDto?> GetSampleDataSourceByIdAsync(Guid id)
    {
        var dataSource = await _dbContext.DataSources
            .FirstOrDefaultAsync(ds => ds.Id == id && ds.ProjectId == null);

        return dataSource switch
        {
            SpreadsheetDataSource s => new AdminSampleDataSourceDetailDto
            {
                Id = s.Id,
                Name = s.Name,
                Headers = s.Headers,
                RowCount = s.RowCount,
                CreatedAt = s.CreatedAt,
                UpdatedAt = s.UpdatedAt,
                JsonData = s.JsonData
            },
            SampleDataSource s => new AdminSampleDataSourceDetailDto
            {
                Id = s.Id,
                Name = s.Name,
                Headers = s.Headers,
                RowCount = s.RowCount,
                CreatedAt = s.CreatedAt,
                UpdatedAt = s.UpdatedAt,
                JsonData = s.JsonData
            },
            _ => null
        };
    }

    public async Task<AdminSampleDataSourceDetailDto> CreateSampleDataSourceAsync(
        string name, string? jsonData)
    {
        var (headers, rowCount) = ParseJsonDataMetadata(jsonData);

        var dataSource = new SpreadsheetDataSource
        {
            Id = Guid.NewGuid(),
            Name = name,
            Type = DataSourceType.Spreadsheet,
            ProjectId = null,
            JsonData = jsonData,
            Headers = headers,
            RowCount = rowCount,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.DataSources.Add(dataSource);
        await _dbContext.SaveChangesAsync();

        return new AdminSampleDataSourceDetailDto
        {
            Id = dataSource.Id,
            Name = dataSource.Name,
            Headers = dataSource.Headers,
            RowCount = dataSource.RowCount,
            CreatedAt = dataSource.CreatedAt,
            UpdatedAt = dataSource.UpdatedAt,
            JsonData = dataSource.JsonData
        };
    }

    public async Task<AdminSampleDataSourceDetailDto?> UpdateSampleDataSourceAsync(
        Guid id, string name, string? jsonData)
    {
        var dataSource = await _dbContext.DataSources
            .FirstOrDefaultAsync(ds => ds.Id == id && ds.ProjectId == null);

        if (dataSource == null)
        {
            return null;
        }

        var (headers, rowCount) = ParseJsonDataMetadata(jsonData);

        dataSource.Name = name;
        dataSource.Headers = headers;
        dataSource.RowCount = rowCount;
        dataSource.UpdatedAt = DateTime.UtcNow;

        if (dataSource is SpreadsheetDataSource spreadsheet)
        {
            spreadsheet.JsonData = jsonData;
        }
        else if (dataSource is SampleDataSource sample)
        {
            sample.JsonData = jsonData;
        }

        await _dbContext.SaveChangesAsync();

        return new AdminSampleDataSourceDetailDto
        {
            Id = dataSource.Id,
            Name = dataSource.Name,
            Headers = dataSource.Headers,
            RowCount = dataSource.RowCount,
            CreatedAt = dataSource.CreatedAt,
            UpdatedAt = dataSource.UpdatedAt,
            JsonData = jsonData
        };
    }

    public async Task<bool> DeleteSampleDataSourceAsync(Guid id)
    {
        var dataSource = await _dbContext.DataSources
            .FirstOrDefaultAsync(ds => ds.Id == id && ds.ProjectId == null
                && (ds.Type == DataSourceType.Sample || ds.Type == DataSourceType.Spreadsheet));

        if (dataSource == null)
        {
            return false;
        }

        _dbContext.DataSources.Remove(dataSource);
        await _dbContext.SaveChangesAsync();
        return true;
    }

    public async Task<ComponentDto?> UpdateSampleComponentDataSourceAsync(
        Guid componentId, Guid? dataSourceId)
    {
        var component = await _dbContext.Components
            .Where(c => c.Id == componentId && c.ProjectId == null)
            .FirstOrDefaultAsync();

        if (component is not IDataSourceComponent dataSourceComponent)
        {
            return null;
        }

        if (dataSourceId.HasValue)
        {
            var dataSource = await _dbContext.DataSources
                .FirstOrDefaultAsync(ds => ds.Id == dataSourceId.Value && ds.ProjectId == null
                    && (ds.Type == DataSourceType.Sample || ds.Type == DataSourceType.Spreadsheet));

            if (dataSource == null)
            {
                return null;
            }

            dataSourceComponent.DataSource = dataSource;
        }
        else
        {
            dataSourceComponent.DataSource = null;
        }

        component.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();

        // Reload to get DataSource navigation property
        await _dbContext.Entry(component)
            .Reference(nameof(IDataSourceComponent.DataSource))
            .LoadAsync();

        return component.ToComponentDto();
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
