using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Deckle.Domain.Migrations
{
    /// <inheritdoc />
    public partial class MigratePlayerMatColumnData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // The AddGameBoard migration refactored PlayerMat columns from shared names
            // (CustomHeightMm, CustomWidthMm, PresetSize) to PlayerMat-prefixed names
            // (PlayerMat_CustomHeightMm, PlayerMat_CustomWidthMm, PlayerMat_PresetSize),
            // but did not migrate existing data. This migration copies the data across
            // for any PlayerMat rows that have not yet been written by the new code.
            migrationBuilder.Sql(
                """
                UPDATE "Components"
                SET
                    "PlayerMat_CustomHeightMm" = "CustomHeightMm",
                    "PlayerMat_CustomWidthMm"  = "CustomWidthMm",
                    "PlayerMat_PresetSize"     = "PresetSize"
                WHERE "ComponentType" = 'PlayerMat'
                  AND "PlayerMat_PresetSize"     IS NULL
                  AND "PlayerMat_CustomHeightMm" IS NULL
                  AND "PlayerMat_CustomWidthMm"  IS NULL;
                """);

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Data migrations are intentionally not reversed — the source columns
            // (CustomHeightMm, CustomWidthMm, PresetSize) still exist and retain their original values.
        }
    }
}
