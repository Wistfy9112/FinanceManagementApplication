using FinanceManagementApplication.Domain.Entities;
using FinancialManagementApplication.Domain.Enums;

namespace FinancialManagementApplication.Domain.Entities
{
    public class Debt
    {
        public Guid Id { get; set; }
        public Guid AccountId { get; set; }
        public string Name { get; set; }
        public decimal TotalDebt { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal RemainingAmount { get; set; }
        public DateTime BorrowDate { get; set; }
        public DateTime? DueDate { get; set; }
        public string? Note { get; set; }
        public string? Description { get; set; }
        public decimal? InterestRate { get; set; }
        public DebtType Type { get; set; } = DebtType.Borrowed;
        public bool IsClosed { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public virtual Account Account { get; set; }
        public virtual ICollection<DebtPayment> Payments { get; set; } = new List<DebtPayment>();
    }
}
