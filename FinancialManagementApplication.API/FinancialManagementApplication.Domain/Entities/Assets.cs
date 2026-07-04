using FinancialManagementApplication.Domain.Enums;
using FinancialManagementApplication.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json.Serialization;

namespace FinancialManagementApplication.Domain.Entities
{
    public class Assets
    {
        public Guid Id { get; set; }
        public Guid AccountID { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal InitialValue { get; set; }
        public decimal CurrentValue { get; set; }
        public AssetType Type { get; set; } = AssetType.Saving;
        public DateTime CreatedAt { get; set; }
        public int SortOrder { get; set; }
        // Navigation properties
        public virtual Account Account { get; set; } = null!;
        [JsonIgnore]
        public virtual PortfolioAllocation? PortfolioAllocation { get; set; }
    }
}
