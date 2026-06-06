using FinancialManagementApplication.Domain.Enums;

namespace FinancialManagementApplication.Application.DTOs.Debt
{
    public class CreateDebtDTO
    {
        public Guid AccountId { get; set; }
        public string Name { get; set; }
        public decimal TotalDebt { get; set; }
        public DateTime BorrowDate { get; set; }
        public DateTime? DueDate { get; set; }
        public string? Note { get; set; }
        public string? Description { get; set; }
        public decimal? InterestRate { get; set; }
        public DebtType Type { get; set; } = DebtType.Borrowed;
    }
}
