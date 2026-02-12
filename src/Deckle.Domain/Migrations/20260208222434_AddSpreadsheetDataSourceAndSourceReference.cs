using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Deckle.Domain.Migrations
{
    /// <inheritdoc />
    public partial class AddSpreadsheetDataSourceAndSourceReference : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SourceDataSourceId",
                table: "DataSources",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_DataSources_SourceDataSourceId",
                table: "DataSources",
                column: "SourceDataSourceId");

            migrationBuilder.AddForeignKey(
                name: "FK_DataSources_DataSources_SourceDataSourceId",
                table: "DataSources",
                column: "SourceDataSourceId",
                principalTable: "DataSources",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DataSources_DataSources_SourceDataSourceId",
                table: "DataSources");

            migrationBuilder.DropIndex(
                name: "IX_DataSources_SourceDataSourceId",
                table: "DataSources");

            migrationBuilder.DropColumn(
                name: "SourceDataSourceId",
                table: "DataSources");
        }
    }
}
