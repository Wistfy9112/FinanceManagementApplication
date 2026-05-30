using FinancialManagementApplication.Domain.Entities;

namespace FinancialManagementApplication.Domain.Entities
{
    public class AllocationHistory
    {
        public Guid Id { get; set; }
        public Guid AllocationId { get; set; }
        public decimal CurrentAmount { get; set; }
        public decimal TargetPercentage { get; set; }
        public DateTime RecordedAt { get; set; }
        public virtual PortfolioAllocation Allocation { get; set; }
    }
}
