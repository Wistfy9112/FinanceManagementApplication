using FinancialManagementApplication.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace FinancialManagementApplication.Application.DTOs.PortfolioAllocation
{
    public class PortfolioAllocationDTO
    {
        public Guid Id { get; set; }
        public Guid PortfolioId { get; set; }
        public string FinancialCategory { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public decimal CurrentAmount { get; set; }
        public decimal TargetPercentage { get; set; }
        public DateTime UpdateAt { get; set; }
        public AssetType AssetType { get; set; } = AssetType.Saving;
        public Guid? AssetId { get; set; }
    }
}
