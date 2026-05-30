using FinancialManagementApplication.Domain.Enums;
using FinanceManagementApplication.Domain.Entities;
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
        public string Name { get; set; }
        public decimal InitialValue { get; set; }
        public decimal CurrentValue { get; set; }
        public AssetType Type { get; set; } = AssetType.Saving;
        // Navigation properties
        public virtual Account Account { get; set; }
        [JsonIgnore]
        public virtual PortfolioAllocation PortfolioAllocation { get; set; }
    }
}
