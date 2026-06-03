namespace FinancialManagementApplication.Application.DTOs.Goal
{
    public class UpdateGoalDTO
    {
        public string Name { get; set; }
        public decimal TargetAmount { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime DueDate { get; set; }
    }
}
