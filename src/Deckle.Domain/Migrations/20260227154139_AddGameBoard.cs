using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Deckle.Domain.Migrations
{
    /// <inheritdoc />
    public partial class AddGameBoard : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CustomHorizontalFolds",
                table: "Components",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CustomVerticalFolds",
                table: "Components",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GameBoard_BackDesign",
                table: "Components",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "GameBoard_DataSourceId",
                table: "Components",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GameBoard_FrontDesign",
                table: "Components",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PlayerMat_CustomHeightMm",
                table: "Components",
                type: "numeric(10,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PlayerMat_CustomWidthMm",
                table: "Components",
                type: "numeric(10,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlayerMat_PresetSize",
                table: "Components",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Components_GameBoard_DataSourceId",
                table: "Components",
                column: "GameBoard_DataSourceId");

            migrationBuilder.AddForeignKey(
                name: "FK_Components_DataSources_GameBoard_DataSourceId",
                table: "Components",
                column: "GameBoard_DataSourceId",
                principalTable: "DataSources",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Components_DataSources_GameBoard_DataSourceId",
                table: "Components");

            migrationBuilder.DropIndex(
                name: "IX_Components_GameBoard_DataSourceId",
                table: "Components");

            migrationBuilder.DropColumn(
                name: "CustomHorizontalFolds",
                table: "Components");

            migrationBuilder.DropColumn(
                name: "CustomVerticalFolds",
                table: "Components");

            migrationBuilder.DropColumn(
                name: "GameBoard_BackDesign",
                table: "Components");

            migrationBuilder.DropColumn(
                name: "GameBoard_DataSourceId",
                table: "Components");

            migrationBuilder.DropColumn(
                name: "GameBoard_FrontDesign",
                table: "Components");

            migrationBuilder.DropColumn(
                name: "PlayerMat_CustomHeightMm",
                table: "Components");

            migrationBuilder.DropColumn(
                name: "PlayerMat_CustomWidthMm",
                table: "Components");

            migrationBuilder.DropColumn(
                name: "PlayerMat_PresetSize",
                table: "Components");
        }
    }
}
