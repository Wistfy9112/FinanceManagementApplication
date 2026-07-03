using System;
using System.Collections.Generic;
using System.Text;

namespace FinancialManagementApplication.Application.DTOs.Portfolio
{
    public class UpdatePortfolioDTO
    {
        public string Name { get; set; } = string.Empty;
        public decimal Amount { get; set; }
    }
}
