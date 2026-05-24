using System;
using System.Collections.Generic;
using System.Text;

namespace FinancialManagementApplication.Application.DTOs.Asset
{
    public class UpdateAssetDTO
    {
        public string Name { get; set; }
        public decimal InitialValue { get; set; }
        public decimal CurrentValue { get; set; }
    }
}
