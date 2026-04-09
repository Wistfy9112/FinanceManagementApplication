using FinanceManagementApplication.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace FinancialManagementApplication.Domain.Entities
{
    public class ExpenseCategory
    {
        public Guid CategoryID { get; set; }
        public string Name { get; set; } = default!;
        public string Description { get; set; } = default!;
        public Guid AccountID { get; set; }
        public DateTime CreateAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdateAt { get; set; } = DateTime.UtcNow;
    }
}
