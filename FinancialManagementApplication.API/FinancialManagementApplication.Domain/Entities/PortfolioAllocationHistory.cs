namespace FinancialManagementApplication.Domain.Entities
{
public class PortfolioAllocationHistory
{
    public Guid Id { get; set; }
    public Guid AccountId { get; set; }
    public decimal CurrentAmount { get; set; }
    public DateTime RecordedAt { get; set; }
    public virtual ICollection<PortfolioAllocationHistoryDetail> Details { get; set; } = new List<PortfolioAllocationHistoryDetail>();
}
}
