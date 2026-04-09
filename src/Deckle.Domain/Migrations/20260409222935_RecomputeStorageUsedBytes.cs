using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Deckle.Domain.Migrations
{
    /// <inheritdoc />
    public partial class RecomputeStorageUsedBytes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "FileSizeBytes",
                table: "Files",
                newName: "TotalByteSize");

            // Recompute StorageUsedBytes for all users based on actual ISizeAware entity sizes.
            // Includes Files (confirmed only), EditableComponents (Card, GameBoard, PlayerMat),
            // and DataSources — all charged to the project owner.
            migrationBuilder.Sql("""
                UPDATE "Users" u
                SET "StorageUsedBytes" = COALESCE(
                    (SELECT SUM(f."TotalByteSize")
                     FROM "Files" f
                     INNER JOIN "UserProjects" up ON f."ProjectId" = up."ProjectId"
                     WHERE up."UserId" = u."Id" AND up."Role" = 'Owner' AND f."Status" = 'Confirmed')
                , 0)
                + COALESCE(
                    (SELECT SUM(c."TotalByteSize")
                     FROM "Components" c
                     INNER JOIN "UserProjects" up ON c."ProjectId" = up."ProjectId"
                     WHERE up."UserId" = u."Id" AND up."Role" = 'Owner' AND c."ProjectId" IS NOT NULL
                       AND c."ComponentType" IN ('Card', 'GameBoard', 'PlayerMat'))
                , 0)
                + COALESCE(
                    (SELECT SUM(ds."TotalByteSize")
                     FROM "DataSources" ds
                     INNER JOIN "UserProjects" up ON ds."ProjectId" = up."ProjectId"
                     WHERE up."UserId" = u."Id" AND up."Role" = 'Owner' AND ds."ProjectId" IS NOT NULL)
                , 0)
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "TotalByteSize",
                table: "Files",
                newName: "FileSizeBytes");
        }
    }
}
