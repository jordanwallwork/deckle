using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Deckle.Domain.Migrations
{
    /// <inheritdoc />
    public partial class ConsolidateEditableComponentColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Copy designs from the old per-type columns into the shared columns before dropping
            migrationBuilder.Sql("""
                UPDATE "Components"
                SET "FrontDesign" = "GameBoard_FrontDesign", "BackDesign" = "GameBoard_BackDesign"
                WHERE "ComponentType" = 'GameBoard';
                """);

            migrationBuilder.Sql("""
                UPDATE "Components"
                SET "FrontDesign" = "PlayerMat_FrontDesign", "BackDesign" = "PlayerMat_BackDesign"
                WHERE "ComponentType" = 'PlayerMat';
                """);

            migrationBuilder.DropColumn(
                name: "GameBoard_BackDesign",
                table: "Components");

            migrationBuilder.DropColumn(
                name: "GameBoard_FrontDesign",
                table: "Components");

            migrationBuilder.DropColumn(
                name: "PlayerMat_BackDesign",
                table: "Components");

            migrationBuilder.DropColumn(
                name: "PlayerMat_FrontDesign",
                table: "Components");

            migrationBuilder.AlterColumn<string>(
                name: "ComponentType",
                table: "Components",
                type: "character varying(21)",
                maxLength: 21,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(13)",
                oldMaxLength: 13);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "ComponentType",
                table: "Components",
                type: "character varying(13)",
                maxLength: 13,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(21)",
                oldMaxLength: 21);

            migrationBuilder.AddColumn<string>(
                name: "GameBoard_BackDesign",
                table: "Components",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GameBoard_FrontDesign",
                table: "Components",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlayerMat_BackDesign",
                table: "Components",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlayerMat_FrontDesign",
                table: "Components",
                type: "text",
                nullable: true);
        }
    }
}
