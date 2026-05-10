namespace Deckle.MCP.Tools;

internal static class McpErrors
{
    public const string ProjectNotFound = """{"error":"Project not found"}""";
    public const string ProjectNotFoundOrNotOwner = """{"error":"Project not found or you are not the owner"}""";
    public const string AccessDenied = """{"error":"Access denied"}""";
    public const string ComponentNotFound = """{"error":"Component not found"}""";
    public const string DataSourceNotFound = """{"error":"Data source not found"}""";
    public const string Deleted = """{"status":"deleted"}""";
}
