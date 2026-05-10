using System.ComponentModel;
using System.Text.Json;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ModelContextProtocol.Server;

namespace Deckle.API.McpTools;

[McpServerToolType]
public sealed class ComponentTools(AppDbContext db, IHttpContextAccessor httpContextAccessor)
    : BaseMcpTool(db, httpContextAccessor)
{
    [McpServerTool, Description("List all components in a project (cards, dice, game boards, player mats).")]
    public async Task<string> ListComponents(
        [Description("The project ID.")] Guid projectId)
    {
        if (!await HasProjectAccessAsync(projectId))
            return McpErrors.ProjectNotFound;

        var components = await Db.Components
            .Where(c => c.ProjectId == projectId)
            .Select(c => new
            {
                c.Id,
                c.Name,
                Type = EF.Property<string>(c, "ComponentType"),
                c.CreatedAt,
                c.UpdatedAt
            })
            .ToListAsync();

        return JsonSerializer.Serialize(components);
    }

    [McpServerTool, Description("Get details of a specific component.")]
    public async Task<string> GetComponent(
        [Description("The component ID.")] Guid componentId)
    {
        var component = await Db.Components
            .Include(c => c.Project)
            .FirstOrDefaultAsync(c => c.Id == componentId);

        if (component == null || !component.ProjectId.HasValue)
            return McpErrors.ComponentNotFound;

        if (!await HasProjectAccessAsync(component.ProjectId.Value))
            return McpErrors.AccessDenied;

        return component switch
        {
            Card card => JsonSerializer.Serialize(new
            {
                card.Id, card.Name, Type = "Card",
                Size = card.Size.ToString(), card.Horizontal,
                card.ProjectId, card.CreatedAt, card.UpdatedAt
            }),
            Dice dice => JsonSerializer.Serialize(new
            {
                dice.Id, dice.Name, Type = "Dice",
                DiceType = dice.Type.ToString(), Style = dice.Style.ToString(),
                BaseColor = dice.BaseColor.ToString(), dice.Number,
                dice.ProjectId, dice.CreatedAt, dice.UpdatedAt
            }),
            GameBoard board => JsonSerializer.Serialize(new
            {
                board.Id, board.Name, Type = "GameBoard",
                PresetSize = board.PresetSize?.ToString(), board.Horizontal,
                board.CustomWidthMm, board.CustomHeightMm,
                board.ProjectId, board.CreatedAt, board.UpdatedAt
            }),
            PlayerMat mat => JsonSerializer.Serialize(new
            {
                mat.Id, mat.Name, Type = "PlayerMat",
                PresetSize = mat.PresetSize?.ToString(), mat.Horizontal,
                mat.CustomWidthMm, mat.CustomHeightMm,
                mat.ProjectId, mat.CreatedAt, mat.UpdatedAt
            }),
            _ => JsonSerializer.Serialize(new { component.Id, component.Name, component.ProjectId })
        };
    }

    [McpServerTool, Description($"Create a new card component. Valid sizes: MiniAmerican, MiniEuro, Bridge, MetricPoker, StandardPoker, Tarot, Jumbo, ExtraSmallSquare, SmallSquare, MediumSquare, LargeSquare.")]
    public async Task<string> CreateCard(
        [Description("The project ID.")] Guid projectId,
        [Description("Card name.")] string name,
        [Description("Card size (e.g. StandardPoker, Bridge, Tarot).")] string size = "StandardPoker",
        [Description("Whether the card is horizontal (landscape). Default false = portrait.")] bool horizontal = false)
    {
        if (!await HasProjectAccessAsync(projectId))
            return McpErrors.ProjectNotFound;

        if (!Enum.TryParse<CardSize>(size, out var cardSize))
            return $"{{\"error\":\"Invalid card size '{size}'. Valid values: {string.Join(", ", Enum.GetNames<CardSize>())}\"}}";

        var card = new Card
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = name,
            Size = cardSize,
            Horizontal = horizontal,
            Shape = new RectangleShape(3),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await Db.Cards.AddAsync(card);
        await Db.SaveChangesAsync();

        return JsonSerializer.Serialize(new
        {
            card.Id, card.Name, Type = "Card",
            Size = card.Size.ToString(), card.Horizontal,
            card.ProjectId, card.CreatedAt
        });
    }

    [McpServerTool, Description("Create a new dice component. DiceType: D4, D6, D8, D10, D12, D20. DiceStyle: Standard, Custom. DiceColor: White, Black, Red, Blue, Green, Yellow, Purple, Orange.")]
    public async Task<string> CreateDice(
        [Description("The project ID.")] Guid projectId,
        [Description("Dice name.")] string name,
        [Description("Dice type (e.g. D6, D20).")] string diceType = "D6",
        [Description("Dice style.")] string style = "Standard",
        [Description("Base color.")] string baseColor = "White",
        [Description("Number of dice in the set.")] int number = 1)
    {
        if (!await HasProjectAccessAsync(projectId))
            return McpErrors.ProjectNotFound;

        if (!Enum.TryParse<DiceType>(diceType, out var dt))
            return $"{{\"error\":\"Invalid DiceType '{diceType}'\"}}";
        if (!Enum.TryParse<DiceStyle>(style, out var ds))
            return $"{{\"error\":\"Invalid DiceStyle '{style}'\"}}";
        if (!Enum.TryParse<DiceColor>(baseColor, out var dc))
            return $"{{\"error\":\"Invalid DiceColor '{baseColor}'\"}}";

        var dice = new Dice
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = name,
            Type = dt,
            Style = ds,
            BaseColor = dc,
            Number = number,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await Db.Dices.AddAsync(dice);
        await Db.SaveChangesAsync();

        return JsonSerializer.Serialize(new
        {
            dice.Id, dice.Name, Type = "Dice",
            DiceType = dice.Type.ToString(), Style = dice.Style.ToString(),
            BaseColor = dice.BaseColor.ToString(), dice.Number,
            dice.ProjectId, dice.CreatedAt
        });
    }

    [McpServerTool, Description("Create a new game board component. PresetSize options include: MediumBifoldSquare, LargeQuadFoldSquare, MediumBifoldRectangle, etc. Omit presetSize to use custom dimensions.")]
    public async Task<string> CreateGameBoard(
        [Description("The project ID.")] Guid projectId,
        [Description("Game board name.")] string name,
        [Description("Preset size name (e.g. MediumBifoldSquare). Leave null for custom dimensions.")] string? presetSize = null,
        [Description("Whether the board is horizontal (landscape).")] bool horizontal = true,
        [Description("Custom width in mm (only used if presetSize is null).")] decimal? customWidthMm = null,
        [Description("Custom height in mm (only used if presetSize is null).")] decimal? customHeightMm = null)
    {
        if (!await HasProjectAccessAsync(projectId))
            return McpErrors.ProjectNotFound;

        GameBoardSize? gbSize = null;
        if (presetSize != null)
        {
            if (!Enum.TryParse<GameBoardSize>(presetSize, out var gbSizeParsed))
                return $"{{\"error\":\"Invalid GameBoardSize '{presetSize}'\"}}";
            gbSize = gbSizeParsed;
        }

        var board = new GameBoard
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = name,
            PresetSize = gbSize,
            Horizontal = horizontal,
            CustomWidthMm = customWidthMm,
            CustomHeightMm = customHeightMm,
            Shape = new RectangleShape(0),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await Db.GameBoards.AddAsync(board);
        await Db.SaveChangesAsync();

        return JsonSerializer.Serialize(new
        {
            board.Id, board.Name, Type = "GameBoard",
            PresetSize = board.PresetSize?.ToString(), board.Horizontal,
            board.ProjectId, board.CreatedAt
        });
    }

    [McpServerTool, Description("Create a new player mat component. PresetSize options: A4, A3, Letter, Legal. Omit presetSize for custom dimensions.")]
    public async Task<string> CreatePlayerMat(
        [Description("The project ID.")] Guid projectId,
        [Description("Player mat name.")] string name,
        [Description("Preset size name (e.g. A4, Letter). Leave null for custom dimensions.")] string? presetSize = null,
        [Description("Whether the mat is horizontal (landscape).")] bool horizontal = false,
        [Description("Custom width in mm (only used if presetSize is null).")] decimal? customWidthMm = null,
        [Description("Custom height in mm (only used if presetSize is null).")] decimal? customHeightMm = null)
    {
        if (!await HasProjectAccessAsync(projectId))
            return McpErrors.ProjectNotFound;

        PlayerMatSize? pmSize = null;
        if (presetSize != null)
        {
            if (!Enum.TryParse<PlayerMatSize>(presetSize, out var pmSizeParsed))
                return $"{{\"error\":\"Invalid PlayerMatSize '{presetSize}'\"}}";
            pmSize = pmSizeParsed;
        }

        var mat = new PlayerMat
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = name,
            PresetSize = pmSize,
            Horizontal = horizontal,
            CustomWidthMm = customWidthMm,
            CustomHeightMm = customHeightMm,
            Shape = new RectangleShape(3),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await Db.PlayerMats.AddAsync(mat);
        await Db.SaveChangesAsync();

        return JsonSerializer.Serialize(new
        {
            mat.Id, mat.Name, Type = "PlayerMat",
            PresetSize = mat.PresetSize?.ToString(), mat.Horizontal,
            mat.ProjectId, mat.CreatedAt
        });
    }

    [McpServerTool, Description("Delete a component from a project.")]
    public async Task<string> DeleteComponent(
        [Description("The component ID to delete.")] Guid componentId)
    {
        var component = await Db.Components
            .FirstOrDefaultAsync(c => c.Id == componentId);

        if (component == null || !component.ProjectId.HasValue)
            return McpErrors.ComponentNotFound;

        if (!await HasProjectAccessAsync(component.ProjectId.Value))
            return McpErrors.AccessDenied;

        Db.Components.Remove(component);
        await Db.SaveChangesAsync();
        return McpErrors.Deleted;
    }

    [McpServerTool, Description("Link a data source to a component (card, game board, or player mat). Pass null dataSourceId to unlink.")]
    public async Task<string> LinkDataSource(
        [Description("The component ID.")] Guid componentId,
        [Description("The data source ID to link, or null to unlink.")] Guid? dataSourceId)
    {
        var component = await Db.Components
            .FirstOrDefaultAsync(c => c.Id == componentId);

        if (component == null || !component.ProjectId.HasValue)
            return McpErrors.ComponentNotFound;

        if (!await HasProjectAccessAsync(component.ProjectId.Value))
            return McpErrors.AccessDenied;

        if (component is not IDataSourceComponent dsc)
            return """{"error":"This component type does not support data sources"}""";

        if (dataSourceId.HasValue)
        {
            var dataSource = await Db.DataSources
                .FirstOrDefaultAsync(ds => ds.Id == dataSourceId.Value && ds.ProjectId == component.ProjectId);

            if (dataSource == null)
                return """{"error":"Data source not found in this project"}""";

            dsc.DataSource = dataSource;
        }
        else
        {
            dsc.DataSource = null;
        }

        component.UpdatedAt = DateTime.UtcNow;
        await Db.SaveChangesAsync();
        return JsonSerializer.Serialize(new { componentId, dataSourceId, Status = "updated" });
    }
}
