using System;
using System.Collections.Generic;
using System.Text;

namespace FinancialManagementApplication.Application.DTOs.PortfolioAllocation
{
    public class PortfolioAllocationDTO
    {
        public Guid Id { get; set; }
        public Guid PortfolioId { get; set; }
        public string FinancialCategory { get; set; }
        public string Name { get; set; }
        public decimal CurrentAmount { get; set; }
        public decimal TargetPercentage { get; set; }
        public DateTime UpdateAt { get; set; }
    }
}
