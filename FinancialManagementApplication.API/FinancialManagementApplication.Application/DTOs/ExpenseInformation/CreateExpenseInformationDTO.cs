using FinanceManagementApplication.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace FinancialManagementApplication.Application.DTOs.Expense
{
    public class CreateExpenseInformationDTO
    {
        public string Name { get; set; } = default!;
        public decimal Amount { get; set; }
        public decimal AllocatedPercentage { get; set; }
        public Guid CategoryID { get; set; }
        public Guid AccountID { get; set; }
    }
}
