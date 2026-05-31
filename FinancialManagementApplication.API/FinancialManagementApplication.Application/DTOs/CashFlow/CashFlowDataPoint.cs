namespace FinancialManagementApplication.Application.DTOs.CashFlow
{
    public class CashFlowDataPoint
    {
        public string Period { get; set; }
        public DateTime Date { get; set; }
        public decimal Value { get; set; }
        public decimal InitialValue { get; set; }
        public decimal? ChangeFromPrevious { get; set; }
        public decimal? ChangePercentage { get; set; }
    }

    public class CashFlowGrowthResponse
    {
        public string Mode { get; set; }
        public int? Year { get; set; }
        public List<CashFlowDataPoint> Data { get; set; } = new();
    }
}
