using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Deckle.Domain.Migrations
{
    /// <inheritdoc />
    public partial class AddPlayerMatAndDataSourceRelationships : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Components_DataSources_DataSourceId",
                table: "Components");

            migrationBuilder.DropForeignKey(
                name: "FK_Components_DataSources_PlayerMat_DataSourceId",
                table: "Components");

            migrationBuilder.DropColumn(
                name: "PlayerMat_Shape",
                table: "Components");

            migrationBuilder.AddForeignKey(
                name: "FK_Components_DataSources_DataSourceId",
                table: "Components",
                column: "DataSourceId",
                principalTable: "DataSources",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Components_DataSources_PlayerMat_DataSourceId",
                table: "Components",
                column: "PlayerMat_DataSourceId",
                principalTable: "DataSources",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Components_DataSources_DataSourceId",
                table: "Components");

            migrationBuilder.DropForeignKey(
                name: "FK_Components_DataSources_PlayerMat_DataSourceId",
                table: "Components");

            migrationBuilder.AddColumn<string>(
                name: "PlayerMat_Shape",
                table: "Components",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Components_DataSources_DataSourceId",
                table: "Components",
                column: "DataSourceId",
                principalTable: "DataSources",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Components_DataSources_PlayerMat_DataSourceId",
                table: "Components",
                column: "PlayerMat_DataSourceId",
                principalTable: "DataSources",
                principalColumn: "Id");
        }
    }
}
