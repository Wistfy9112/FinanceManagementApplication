using System.Text.Json.Serialization;

namespace FinancialManagementApplication.Domain.Entities
{
    public class PortfolioAllocationHistoryDetail
    {
        public Guid Id { get; set; }
        public Guid PortfolioAllocationHistoryId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string FinancialCategory { get; set; } = string.Empty;
        public decimal CurrentAmount { get; set; }
        public decimal TargetPercentage { get; set; }
        public string AssetType { get; set; } = string.Empty;
        [JsonIgnore]
        public virtual PortfolioAllocationHistory PortfolioAllocationHistory { get; set; } = null!;
    }
}
