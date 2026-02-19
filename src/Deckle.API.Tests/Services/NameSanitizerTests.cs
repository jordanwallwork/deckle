using Deckle.API.Services;

namespace Deckle.API.Tests.Services;

public class NameSanitizerTests
{
    #region SanitizeFileName Tests

    [Fact]
    public void SanitizeFileName_AllInvalidCharsInName_UsesDefaultName()
    {
        // Name part "@@@" sanitizes to "___", then Trim('_') gives "" → should use "file"
        // Kills line 43 string mutation ("" instead of "file")
        var result = NameSanitizer.SanitizeFileName("@@@.jpg");

        Assert.Equal("file.jpg", result);
    }

    [Fact]
    public void SanitizeFileName_InvalidCharInExtension_ReplacesWithUnderscore()
    {
        // extension = ".j@pg", not empty → block runs → sanitizes "@" to "_"
        // Kills line 53 LogicalNot-removal mutation (block would be skipped, leaving ".j@pg")
        // Kills line 57 string mutation ("" replacement → gives ".jpg" instead of ".j_pg")
        var result = NameSanitizer.SanitizeFileName("file.j@pg");

        Assert.Equal("file.j_pg", result);
    }

    [Fact]
    public void SanitizeFileName_AllInvalidCharsInExtension_RemovesExtension()
    {
        // extension = ".@@@" → extWithoutDot = "@@@" → sanitize → "___" → Trim('_') → ""
        // IsNullOrEmpty("") is true → extension = "" → result has no extension
        // Kills line 53 LogicalNot-removal mutation (block skipped → extension stays ".@@@")
        // Kills line 58 false-conditional mutation (always takes "." + "" → result "file.")
        var result = NameSanitizer.SanitizeFileName("file.@@@");

        Assert.Equal("file", result);
    }

    [Fact]
    public void SanitizeFileName_FileWithoutExtension_ReturnsNameOnly()
    {
        // Path.GetExtension("myfile") returns "" → extension is empty → block does not run
        var result = NameSanitizer.SanitizeFileName("myfile");

        Assert.Equal("myfile", result);
    }

    [Fact]
    public void SanitizeFileName_ValidFileNameWithExtension_ReturnsUnchanged()
    {
        var result = NameSanitizer.SanitizeFileName("my-file_name.jpg");

        Assert.Equal("my-file_name.jpg", result);
    }

    [Fact]
    public void SanitizeFileName_EmptyInput_ReturnsDefaultFileName()
    {
        var result = NameSanitizer.SanitizeFileName("");

        Assert.Equal("file", result);
    }

    [Fact]
    public void SanitizeFileName_WhitespaceOnly_ReturnsDefaultFileName()
    {
        var result = NameSanitizer.SanitizeFileName("   ");

        Assert.Equal("file", result);
    }

    #endregion

    #region SanitizeDirectoryName Tests

    [Fact]
    public void SanitizeDirectoryName_ValidName_ReturnsUnchanged()
    {
        var result = NameSanitizer.SanitizeDirectoryName("My Folder");

        Assert.Equal("My Folder", result);
    }

    [Fact]
    public void SanitizeDirectoryName_InvalidChars_ReplacesWithUnderscore()
    {
        var result = NameSanitizer.SanitizeDirectoryName("folder@name");

        Assert.Equal("folder_name", result);
    }

    [Fact]
    public void SanitizeDirectoryName_EmptyInput_ReturnsDefaultFolderName()
    {
        var result = NameSanitizer.SanitizeDirectoryName("");

        Assert.Equal("folder", result);
    }

    #endregion

    #region IsValidFileName Tests

    [Theory]
    [InlineData("valid-file.jpg", true)]
    [InlineData("valid_file.png", true)]
    [InlineData("file with spaces.gif", true)]
    [InlineData("file@invalid.jpg", false)]
    [InlineData("", false)]
    [InlineData("   ", false)]
    public void IsValidFileName_ReturnsExpectedResult(string fileName, bool expected)
    {
        Assert.Equal(expected, NameSanitizer.IsValidFileName(fileName));
    }

    #endregion

    #region IsValidDirectoryName Tests

    [Theory]
    [InlineData("valid-folder", true)]
    [InlineData("Valid Folder Name", true)]
    [InlineData("folder@invalid", false)]
    [InlineData("folder.with.dots", false)]
    [InlineData("", false)]
    public void IsValidDirectoryName_ReturnsExpectedResult(string name, bool expected)
    {
        Assert.Equal(expected, NameSanitizer.IsValidDirectoryName(name));
    }

    #endregion

    #region ValidateDirectoryName Tests

    [Fact]
    public void ValidateDirectoryName_ValidName_DoesNotThrow()
    {
        NameSanitizer.ValidateDirectoryName("valid-folder");
    }

    [Fact]
    public void ValidateDirectoryName_EmptyName_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => NameSanitizer.ValidateDirectoryName(""));
    }

    [Fact]
    public void ValidateDirectoryName_InvalidChars_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => NameSanitizer.ValidateDirectoryName("bad@folder"));
    }

    #endregion
}
