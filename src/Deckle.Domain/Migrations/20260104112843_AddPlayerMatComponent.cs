using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Deckle.Domain.Migrations
{
    /// <inheritdoc />
    public partial class AddPlayerMatComponent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "CustomHeightMm",
                table: "Components",
                type: "numeric(10,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CustomWidthMm",
                table: "Components",
                type: "numeric(10,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Orientation",
                table: "Components",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlayerMat_BackDesign",
                table: "Components",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "PlayerMat_DataSourceId",
                table: "Components",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlayerMat_FrontDesign",
                table: "Components",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlayerMat_Shape",
                table: "Components",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PresetSize",
                table: "Components",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Components_PlayerMat_DataSourceId",
                table: "Components",
                column: "PlayerMat_DataSourceId");

            migrationBuilder.AddForeignKey(
                name: "FK_Components_DataSources_PlayerMat_DataSourceId",
                table: "Components",
                column: "PlayerMat_DataSourceId",
                principalTable: "DataSources",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Components_DataSources_PlayerMat_DataSourceId",
                table: "Components");

            migrationBuilder.DropIndex(
                name: "IX_Components_PlayerMat_DataSourceId",
                table: "Components");

            migrationBuilder.DropColumn(
                name: "CustomHeightMm",
                table: "Components");

            migrationBuilder.DropColumn(
                name: "CustomWidthMm",
                table: "Components");

            migrationBuilder.DropColumn(
                name: "Orientation",
                table: "Components");

            migrationBuilder.DropColumn(
                name: "PlayerMat_BackDesign",
                table: "Components");

            migrationBuilder.DropColumn(
                name: "PlayerMat_DataSourceId",
                table: "Components");

            migrationBuilder.DropColumn(
                name: "PlayerMat_FrontDesign",
                table: "Components");

            migrationBuilder.DropColumn(
                name: "PlayerMat_Shape",
                table: "Components");

            migrationBuilder.DropColumn(
                name: "PresetSize",
                table: "Components");
        }
    }
}
