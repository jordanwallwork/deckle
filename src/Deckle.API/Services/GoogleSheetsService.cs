using System.Text.RegularExpressions;

namespace Deckle.API.Services;

public interface IGoogleSheetsService
{
    public (string? spreadsheetId, int? sheetGid) ExtractIdsFromUrl(Uri url);
    public string BuildCsvExportUrl(string spreadsheetId, int sheetGid = 0);
    public Task<bool> ValidateCsvAccessAsync(string csvExportUrl);
    public Task<string> FetchCsvDataAsync(string csvExportUrl);
}

public class GoogleSheetsService : IGoogleSheetsService
{
    private readonly IHttpClientFactory _httpClientFactory;

    public GoogleSheetsService(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    /// <summary>
    /// Fetches CSV data from a public Google Sheets CSV export URL
    /// </summary>
    public async Task<string> FetchCsvDataAsync(string csvExportUrl)
    {
        using var httpClient = _httpClientFactory.CreateClient();

        try
        {
            var response = await httpClient.GetAsync(csvExportUrl);

            if (response.StatusCode == System.Net.HttpStatusCode.Forbidden)
            {
                throw new InvalidOperationException(
                    "This Google Sheet is not publicly accessible. " +
                    "Please set sharing to 'Anyone with the link can view'."
                );
            }

            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                throw new InvalidOperationException(
                    "Google Sheet not found. Please check the URL."
                );
            }

            response.EnsureSuccessStatusCode();

            return await response.Content.ReadAsStringAsync();
        }
        catch (HttpRequestException ex)
        {
            throw new InvalidOperationException(
                $"Failed to fetch CSV data from Google Sheets: {ex.Message}",
                ex
            );
        }
    }

    /// <summary>
    /// Extracts spreadsheet ID and optional sheet GID from various Google Sheets URL formats
    /// </summary>
    public (string? spreadsheetId, int? sheetGid) ExtractIdsFromUrl(Uri url)
    {
        string? spreadsheetId = null;
        int? sheetGid = null;

        // Extract spreadsheet ID
        var idPatterns = new[]
        {
            @"docs\.google\.com/spreadsheets/d/([a-zA-Z0-9-_]+)",
            @"spreadsheets/d/([a-zA-Z0-9-_]+)"
        };

        foreach (var pattern in idPatterns)
        {
            var match = Regex.Match(url.ToString(), pattern);
            if (match.Success)
            {
                spreadsheetId = match.Groups[1].Value;
                break;
            }
        }

        // Extract sheet GID if present
        // Supports formats: #gid=123456 or ?gid=123456 or &gid=123456
        var gidPattern = @"[#?&]gid=(\d+)";
        var gidMatch = Regex.Match(url.ToString(), gidPattern);
        if (gidMatch.Success)
        {
            if (int.TryParse(gidMatch.Groups[1].Value, out var parsedGid))
            {
                sheetGid = parsedGid;
            }
        }

        return (spreadsheetId, sheetGid);
    }

    /// <summary>
    /// Builds a CSV export URL for a Google Sheets spreadsheet
    /// </summary>
    public string BuildCsvExportUrl(string spreadsheetId, int sheetGid = 0)
    {
        return $"https://docs.google.com/spreadsheets/d/{spreadsheetId}/export?format=csv&gid={sheetGid}";
    }

    /// <summary>
    /// Validates that a CSV export URL is publicly accessible
    /// </summary>
    public async Task<bool> ValidateCsvAccessAsync(string csvExportUrl)
    {
        using var httpClient = _httpClientFactory.CreateClient();

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Head, csvExportUrl);
            var response = await httpClient.SendAsync(request);

            return response.IsSuccessStatusCode;
        }
        catch (HttpRequestException)
        {
            return false;
        }
    }
}
