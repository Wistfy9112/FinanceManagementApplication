using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinancialManagementApplication.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAssetIdToPortfolioAllocation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "AssetId",
                table: "PortfolioAllocations",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PortfolioAllocations_AssetId",
                table: "PortfolioAllocations",
                column: "AssetId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_PortfolioAllocations_Assets_AssetId",
                table: "PortfolioAllocations",
                column: "AssetId",
                principalTable: "Assets",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PortfolioAllocations_Assets_AssetId",
                table: "PortfolioAllocations");

            migrationBuilder.DropIndex(
                name: "IX_PortfolioAllocations_AssetId",
                table: "PortfolioAllocations");

            migrationBuilder.DropColumn(
                name: "AssetId",
                table: "PortfolioAllocations");
        }
    }
}
