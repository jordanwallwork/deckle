using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Deckle.Domain.Migrations
{
    /// <inheritdoc />
    public partial class ReplacePlayerMatOrientationWithHorizontal : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Migrate existing PlayerMat orientation data to the shared Horizontal column
            migrationBuilder.Sql(
                """
                UPDATE "Components"
                SET "Horizontal" = ("Orientation" = 'Landscape')
                WHERE "ComponentType" = 'PlayerMat'
                """);

            migrationBuilder.DropColumn(
                name: "Orientation",
                table: "Components");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Orientation",
                table: "Components",
                type: "text",
                nullable: true);
        }
    }
}
