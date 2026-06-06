namespace FinancialManagementApplication.Application.DTOs.Debt
{
    public class DebtDTO
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
        public string Type { get; set; }
        public bool IsClosed { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public List<DebtPaymentDTO> Payments { get; set; } = new List<DebtPaymentDTO>();
    }

    public class DebtPaymentDTO
    {
        public Guid Id { get; set; }
        public Guid DebtId { get; set; }
        public DateTime PaymentDate { get; set; }
        public decimal Amount { get; set; }
        public decimal RemainingAfterPayment { get; set; }
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateDebtPaymentDTO
    {
        public Guid DebtId { get; set; }
        public DateTime PaymentDate { get; set; }
        public decimal Amount { get; set; }
        public string? Note { get; set; }
    }
}
