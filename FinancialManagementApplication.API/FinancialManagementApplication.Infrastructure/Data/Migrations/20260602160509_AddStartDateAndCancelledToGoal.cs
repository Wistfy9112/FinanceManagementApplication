using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinancialManagementApplication.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddStartDateAndCancelledToGoal : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "StartDate",
                table: "Goals",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StartDate",
                table: "Goals");
        }
    }
}
