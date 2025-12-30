using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Deckle.Domain.Migrations
{
    /// <inheritdoc />
    public partial class AddDataSourceToCard : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "DataSourceId",
                table: "Components",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Components_DataSourceId",
                table: "Components",
                column: "DataSourceId");

            migrationBuilder.AddForeignKey(
                name: "FK_Components_DataSources_DataSourceId",
                table: "Components",
                column: "DataSourceId",
                principalTable: "DataSources",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Components_DataSources_DataSourceId",
                table: "Components");

            migrationBuilder.DropIndex(
                name: "IX_Components_DataSourceId",
                table: "Components");

            migrationBuilder.DropColumn(
                name: "DataSourceId",
                table: "Components");
        }
    }
}
