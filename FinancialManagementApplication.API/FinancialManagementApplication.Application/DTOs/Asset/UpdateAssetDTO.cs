using FinancialManagementApplication.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace FinancialManagementApplication.Application.DTOs.Asset
{
    public class UpdateAssetDTO
    {
        public string Name { get; set; } = string.Empty;
        public decimal InitialValue { get; set; }
        public decimal CurrentValue { get; set; }
        public AssetType Type { get; set; }
    }
}
