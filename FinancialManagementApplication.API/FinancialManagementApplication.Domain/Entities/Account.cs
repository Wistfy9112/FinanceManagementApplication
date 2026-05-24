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
        public string displayName { get; set; }
        public DateTime CreateAt { get; set; }
        public DateTime UpdateAt { get; set; }

        // Navigation properties
        public virtual ICollection<Assets> Assets { get; set; } = new List<Assets>();
        public virtual ICollection<Portfolio> Portfolios { get; set; } = new List<Portfolio>();
    }
}
