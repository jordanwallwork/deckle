using System.Net;
using Deckle.API.Services;
using Moq;
using Moq.Protected;

namespace Deckle.API.Tests.Services;

public class GoogleSheetsServiceTests : IDisposable
{
    private bool _disposed;
    private readonly List<HttpClient> _httpClients = [];
    private readonly List<HttpResponseMessage> _responses = [];

    private (GoogleSheetsService service, Mock<HttpMessageHandler> mockHandler) CreateService(
        HttpStatusCode statusCode = HttpStatusCode.OK,
        string content = "")
    {
        var mockHandler = new Mock<HttpMessageHandler>();
        var response = new HttpResponseMessage(statusCode)
        {
            Content = new StringContent(content)
        };
        _responses.Add(response);
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(response);

        return BuildService(mockHandler);
    }

    private (GoogleSheetsService service, Mock<HttpMessageHandler> mockHandler) BuildService(
        Mock<HttpMessageHandler> mockHandler)
    {
        var httpClient = new HttpClient(mockHandler.Object);
        _httpClients.Add(httpClient);
        var mockFactory = new Mock<IHttpClientFactory>();
        mockFactory.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(httpClient);
        var service = new GoogleSheetsService(mockFactory.Object);
        return (service, mockHandler);
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
            {
                foreach (var client in _httpClients)
                    client.Dispose();
                foreach (var response in _responses)
                    response.Dispose();
            }
            _disposed = true;
        }
    }

    #region ExtractIdsFromUrl Tests

    [Fact]
    public void ExtractIdsFromUrl_StandardEditUrl_ExtractsSpreadsheetId()
    {
        var (service, _) = CreateService();
        var url = new Uri("https://docs.google.com/spreadsheets/d/SHEET_ID123/edit");

        var (spreadsheetId, sheetGid) = service.ExtractIdsFromUrl(url);

        Assert.Equal("SHEET_ID123", spreadsheetId);
        Assert.Null(sheetGid);
    }

    [Fact]
    public void ExtractIdsFromUrl_UrlWithHashGid_ExtractsBothIds()
    {
        var (service, _) = CreateService();
        var url = new Uri("https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=12345");

        var (spreadsheetId, sheetGid) = service.ExtractIdsFromUrl(url);

        Assert.Equal("SHEET_ID", spreadsheetId);
        Assert.Equal(12345, sheetGid);
    }

    [Fact]
    public void ExtractIdsFromUrl_UrlWithQueryGid_ExtractsBothIds()
    {
        var (service, _) = CreateService();
        var url = new Uri("https://docs.google.com/spreadsheets/d/SHEET_ID/edit?gid=999");

        var (spreadsheetId, sheetGid) = service.ExtractIdsFromUrl(url);

        Assert.Equal("SHEET_ID", spreadsheetId);
        Assert.Equal(999, sheetGid);
    }

    [Fact]
    public void ExtractIdsFromUrl_InvalidUrl_ReturnsNullIds()
    {
        var (service, _) = CreateService();
        var url = new Uri("https://not-google.com/bad-url");

        var (spreadsheetId, sheetGid) = service.ExtractIdsFromUrl(url);

        Assert.Null(spreadsheetId);
        Assert.Null(sheetGid);
    }

    [Fact]
    public void ExtractIdsFromUrl_SpreadsheetIdWithDashesAndUnderscores_ExtractsCorrectly()
    {
        var (service, _) = CreateService();
        var url = new Uri("https://docs.google.com/spreadsheets/d/abc-DEF_123/edit");

        var (spreadsheetId, sheetGid) = service.ExtractIdsFromUrl(url);

        Assert.Equal("abc-DEF_123", spreadsheetId);
    }

    [Fact]
    public void ExtractIdsFromUrl_GidZero_ExtractsGidAsZero()
    {
        var (service, _) = CreateService();
        var url = new Uri("https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=0");

        var (spreadsheetId, sheetGid) = service.ExtractIdsFromUrl(url);

        Assert.Equal(0, sheetGid);
    }

    [Fact]
    public void ExtractIdsFromUrl_UrlWithAmpersandGid_ExtractsGid()
    {
        var (service, _) = CreateService();
        var url = new Uri("https://docs.google.com/spreadsheets/d/SHEET_ID/edit?foo=bar&gid=42");

        var (spreadsheetId, sheetGid) = service.ExtractIdsFromUrl(url);

        Assert.Equal("SHEET_ID", spreadsheetId);
        Assert.Equal(42, sheetGid);
    }

    #endregion

    #region BuildCsvExportUrl Tests

    [Fact]
    public void BuildCsvExportUrl_WithDefaultGid_BuildsCorrectUrl()
    {
        var (service, _) = CreateService();

        var url = service.BuildCsvExportUrl("SHEET_ID");

        Assert.Equal("https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=csv&gid=0", url);
    }

    [Fact]
    public void BuildCsvExportUrl_WithSpecificGid_BuildsCorrectUrl()
    {
        var (service, _) = CreateService();

        var url = service.BuildCsvExportUrl("SHEET_ID", 999);

        Assert.Equal("https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=csv&gid=999", url);
    }

    [Fact]
    public void BuildCsvExportUrl_ContainsSpreadsheetId()
    {
        var (service, _) = CreateService();

        var url = service.BuildCsvExportUrl("my-unique-sheet-id");

        Assert.Contains("my-unique-sheet-id", url, StringComparison.Ordinal);
    }

    [Fact]
    public void BuildCsvExportUrl_IncludesFormatCsv()
    {
        var (service, _) = CreateService();

        var url = service.BuildCsvExportUrl("SHEET_ID");

        Assert.Contains("format=csv", url, StringComparison.Ordinal);
    }

    #endregion

    #region ValidateCsvAccessAsync Tests

    [Fact]
    public async Task ValidateCsvAccessAsync_SuccessResponse_ReturnsTrue()
    {
        var (service, _) = CreateService(HttpStatusCode.OK);

        var result = await service.ValidateCsvAccessAsync("https://docs.google.com/export?format=csv");

        Assert.True(result);
    }

    [Fact]
    public async Task ValidateCsvAccessAsync_ForbiddenResponse_ReturnsFalse()
    {
        var (service, _) = CreateService(HttpStatusCode.Forbidden);

        var result = await service.ValidateCsvAccessAsync("https://docs.google.com/export?format=csv");

        Assert.False(result);
    }

    [Fact]
    public async Task ValidateCsvAccessAsync_NotFoundResponse_ReturnsFalse()
    {
        var (service, _) = CreateService(HttpStatusCode.NotFound);

        var result = await service.ValidateCsvAccessAsync("https://docs.google.com/export?format=csv");

        Assert.False(result);
    }

    [Fact]
    public async Task ValidateCsvAccessAsync_UnauthorizedResponse_ReturnsFalse()
    {
        var (service, _) = CreateService(HttpStatusCode.Unauthorized);

        var result = await service.ValidateCsvAccessAsync("https://docs.google.com/export?format=csv");

        Assert.False(result);
    }

    [Fact]
    public async Task ValidateCsvAccessAsync_NetworkException_ReturnsFalse()
    {
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("Network error"));

        var (service, _) = BuildService(mockHandler);

        var result = await service.ValidateCsvAccessAsync("https://docs.google.com/export?format=csv");

        Assert.False(result);
    }

    [Fact]
    public async Task ValidateCsvAccessAsync_SendsHeadRequest()
    {
        HttpMethod? capturedMethod = null;
        var mockHandler = new Mock<HttpMessageHandler>();
        var response = new HttpResponseMessage(HttpStatusCode.OK);
        _responses.Add(response);
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .Callback<HttpRequestMessage, CancellationToken>((req, _) => capturedMethod = req.Method)
            .ReturnsAsync(response);

        var (service, _) = BuildService(mockHandler);

        await service.ValidateCsvAccessAsync("https://docs.google.com/export?format=csv");

        Assert.Equal(HttpMethod.Head, capturedMethod);
    }

    #endregion

    #region FetchCsvDataAsync Tests

    [Fact]
    public async Task FetchCsvDataAsync_SuccessResponse_ReturnsCsvContent()
    {
        var csvContent = "Name,Age\nAlice,30\nBob,25";
        var (service, _) = CreateService(HttpStatusCode.OK, csvContent);

        var result = await service.FetchCsvDataAsync("https://docs.google.com/export?format=csv");

        Assert.Equal(csvContent, result);
    }

    [Fact]
    public async Task FetchCsvDataAsync_ForbiddenResponse_ThrowsInvalidOperationExceptionWithPublicAccessMessage()
    {
        var (service, _) = CreateService(HttpStatusCode.Forbidden);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.FetchCsvDataAsync("https://docs.google.com/export?format=csv"));

        Assert.Contains("not publicly accessible", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task FetchCsvDataAsync_NotFoundResponse_ThrowsInvalidOperationExceptionWithNotFoundMessage()
    {
        var (service, _) = CreateService(HttpStatusCode.NotFound);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.FetchCsvDataAsync("https://docs.google.com/export?format=csv"));

        Assert.Contains("not found", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task FetchCsvDataAsync_NetworkException_ThrowsInvalidOperationExceptionWithFetchFailedMessage()
    {
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("Network error"));

        var (service, _) = BuildService(mockHandler);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.FetchCsvDataAsync("https://docs.google.com/export?format=csv"));

        Assert.Contains("Failed to fetch CSV data", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task FetchCsvDataAsync_EmptyCsvContent_ReturnsEmptyString()
    {
        var (service, _) = CreateService(HttpStatusCode.OK, "");

        var result = await service.FetchCsvDataAsync("https://docs.google.com/export?format=csv");

        Assert.Equal("", result);
    }

    #endregion
}
