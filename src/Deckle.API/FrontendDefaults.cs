using System.Diagnostics.CodeAnalysis;

namespace Deckle.API;

public static class FrontendDefaults
{
    /// <summary>
    /// Vite dev server URL, used as the frontend URL when "FrontendUrl" isn't configured in development
    /// </summary>
    [SuppressMessage("Minor Code Smell", "S1075:URIs should not be hardcoded", Justification = "Single shared default for local development; deployed environments set FrontendUrl")]
    public const string DevelopmentUrl = "http://localhost:5173";
}
