using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Deckle.Domain.Migrations
{
    /// <inheritdoc />
    public partial class AddDataSourceSyncMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Headers",
                table: "DataSources",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RowCount",
                table: "DataSources",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Headers",
                table: "DataSources");

            migrationBuilder.DropColumn(
                name: "RowCount",
                table: "DataSources");
        }
    }
}
