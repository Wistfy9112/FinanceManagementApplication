using System;
using System.Collections.Generic;

namespace FinancialManagementApplication.Application.DTOs.PortfolioAllocation
{
    public class ReorderPortfolioAllocationDTO
    {
        public List<PortfolioAllocationOrderItem> Items { get; set; } = new();
    }

    public class PortfolioAllocationOrderItem
    {
        public Guid Id { get; set; }
        public int SortOrder { get; set; }
    }
}
