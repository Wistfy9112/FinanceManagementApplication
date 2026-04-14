using FinancialManagementApplication.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace FinanceManagementApplication.Domain.Entities
{
    public class Account
    {
        public Guid AccountID { get; set; }
        public string email { get; set; }
        public string passwordHash { get; set; }
        public Guid CategoryID { get; set; }
        public DateTime CreateAt { get; set; }
        public DateTime UpdateAt { get; set; }

        // Navigation properties
        public virtual User User { get; set; }
        public virtual ICollection<ExpenseCategory> ExpenseCategories { get; set; } = new List<ExpenseCategory>();
    }
}
