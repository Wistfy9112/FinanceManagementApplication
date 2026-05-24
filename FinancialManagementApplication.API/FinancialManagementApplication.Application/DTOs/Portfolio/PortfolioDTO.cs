using FinanceManagementApplication.Domain.Entities;
using FinancialManagementApplication.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace FinancialManagementApplication.Application.DTOs.Portfolio
{
    public class PortfolioDTO
    {
        public Guid Id { get; set; }
        public Guid AccountID { get; set; }
        public string Name { get; set; }
        public decimal Amount { get; set; }
    }
}
