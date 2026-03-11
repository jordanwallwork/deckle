using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Deckle.Domain.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectVisibility : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Bio",
                table: "Users",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalLinks",
                table: "Users",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Visibility",
                table: "Projects",
                type: "text",
                nullable: false,
                defaultValue: "Private");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Bio",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ExternalLinks",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Visibility",
                table: "Projects");
        }
    }
}
