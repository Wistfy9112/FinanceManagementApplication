namespace FinancialManagementApplication.Application.DTOs.History
{
    public class UpdateAssetHistoryDetailDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal InitialValue { get; set; }
        public decimal CurrentValue { get; set; }
        public string Type { get; set; } = string.Empty;
    }

    public class UpdateAssetHistoryDTO
    {
        public DateTime RecordedAt { get; set; }
        public List<UpdateAssetHistoryDetailDTO> Details { get; set; } = new();
    }
}
