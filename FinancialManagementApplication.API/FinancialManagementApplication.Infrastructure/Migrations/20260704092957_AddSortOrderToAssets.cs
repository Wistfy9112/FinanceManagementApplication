using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinancialManagementApplication.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSortOrderToAssets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SortOrder",
                table: "Assets",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SortOrder",
                table: "Assets");
        }
    }
}
