using FinanceManagementApplication.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace FinancialManagementApplication.Domain.Entities
{
    public class Portfolio
    {
        public Guid Id { get; set; }
        public Guid AccountID { get; set; }
        public string Name { get; set; }
        public decimal Amount { get; set; }

        // Navigation properties
        public virtual ICollection<PortfolioAllocation> PortfolioAllocations { get; set; } = new List<PortfolioAllocation>();
        public virtual Account Account { get; set; }
    }
}
