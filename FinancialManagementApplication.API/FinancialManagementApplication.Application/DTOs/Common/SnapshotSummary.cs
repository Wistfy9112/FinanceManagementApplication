namespace FinancialManagementApplication.Application.DTOs.Common
{
    public class SnapshotSummary
    {
        public DateTime RecordedAt { get; set; }
        public decimal TotalValue { get; set; }
        public decimal TotalInitialValue { get; set; }
    }
}
