using System;
using System.Collections.Generic;
using System.Text;

namespace FinancialManagementApplication.Application.DTOs.Portfolio
{
    public class CreatePortfolioDTO
    {
        public Guid AccountID { get; set; }
        public string Name { get; set; }
        public decimal Amount { get; set; }
    }
}
