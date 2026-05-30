using System.Text.Json.Serialization;

namespace FinancialManagementApplication.Domain.Entities
{
    public class AssetHistory
    {
        public Guid Id { get; set; }
        public Guid AccountId { get; set; }
        public DateTime RecordedAt { get; set; }
        public virtual ICollection<AssetHistoryDetail> Details { get; set; } = new List<AssetHistoryDetail>();
    }
}
