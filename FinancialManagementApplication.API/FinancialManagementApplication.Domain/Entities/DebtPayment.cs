namespace FinancialManagementApplication.Domain.Entities
{
    public class DebtPayment
    {
        public Guid Id { get; set; }
        public Guid DebtId { get; set; }
        public DateTime PaymentDate { get; set; }
        public decimal Amount { get; set; }
        public decimal RemainingAfterPayment { get; set; }
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; }

        public virtual Debt Debt { get; set; } = null!;
    }
}
