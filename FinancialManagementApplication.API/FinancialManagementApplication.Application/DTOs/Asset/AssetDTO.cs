using FinanceManagementApplication.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace FinancialManagementApplication.Application.DTOs.Asset
{
    public class AssetDTO
    {
        public Guid Id { get; set; }
        public Guid AccountID { get; set; }
        public string Name { get; set; }
        public decimal InitialValue { get; set; }
        public decimal CurrentValue { get; set; }
    }
}
