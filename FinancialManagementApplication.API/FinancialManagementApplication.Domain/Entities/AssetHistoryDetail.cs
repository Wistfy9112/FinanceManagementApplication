using System.Text.Json.Serialization;

namespace FinancialManagementApplication.Domain.Entities
{
    public class AssetHistoryDetail
    {
        public Guid Id { get; set; }
        public Guid AssetHistoryId { get; set; }
        public Guid AssetId { get; set; }
        public string Name { get; set; }
        public decimal InitialValue { get; set; }
        public decimal CurrentValue { get; set; }
        public string Type { get; set; }
        [JsonIgnore]
        public virtual AssetHistory AssetHistory { get; set; }
    }
}
