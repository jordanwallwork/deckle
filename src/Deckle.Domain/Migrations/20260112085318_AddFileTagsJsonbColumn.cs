using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Deckle.Domain.Migrations
{
    /// <inheritdoc />
    public partial class AddFileTagsJsonbColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Update existing records to ensure they have valid JSON arrays
            // Set all Tags to empty array - this is safe since the feature is new
            migrationBuilder.Sql("UPDATE \"Files\" SET \"Tags\" = '[]'::jsonb;");

            // Update the column default value to be a valid empty JSON array
            migrationBuilder.AlterColumn<string>(
                name: "Tags",
                table: "Files",
                type: "jsonb",
                nullable: false,
                defaultValueSql: "'[]'::jsonb",
                oldClrType: typeof(string),
                oldType: "jsonb");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Remove the default value (revert to previous state)
            migrationBuilder.AlterColumn<string>(
                name: "Tags",
                table: "Files",
                type: "jsonb",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "jsonb",
                oldDefaultValueSql: "'[]'::jsonb");
        }
    }
}
