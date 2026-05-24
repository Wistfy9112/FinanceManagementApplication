using FinanceManagementApplication.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace FinancialManagementApplication.Domain.Entities
{
    public class Assets
    {
        public Guid Id { get; set; }
        public Guid AccountID { get; set; }
        public string Name { get; set; }
        public decimal InitialValue { get; set; }
        public decimal CurrentValue { get; set; }
        // Navigation properties
        public virtual Account Account { get; set; }
    }
}
