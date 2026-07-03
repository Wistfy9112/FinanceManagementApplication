namespace FinancialManagementApplication.Application.DTOs.History
{
    public class UpdateAllocationHistoryDetailDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string FinancialCategory { get; set; } = string.Empty;
        public decimal CurrentAmount { get; set; }
        public decimal TargetPercentage { get; set; }
        public string AssetType { get; set; } = string.Empty;
    }

    public class UpdateAllocationHistoryDTO
    {
        public DateTime RecordedAt { get; set; }
        public decimal CurrentAmount { get; set; }
        public List<UpdateAllocationHistoryDetailDTO> Details { get; set; } = new();
    }
}
