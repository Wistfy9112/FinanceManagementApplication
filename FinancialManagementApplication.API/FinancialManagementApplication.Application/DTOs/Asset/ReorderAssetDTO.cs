using System;
using System.Collections.Generic;

namespace FinancialManagementApplication.Application.DTOs.Asset
{
    public class ReorderAssetDTO
    {
        public List<AssetOrderItem> Items { get; set; } = new();
    }

    public class AssetOrderItem
    {
        public Guid Id { get; set; }
        public int SortOrder { get; set; }
    }
}
