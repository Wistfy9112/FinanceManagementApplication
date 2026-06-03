using FinancialManagementApplication.Domain.Enums;

namespace FinancialManagementApplication.Application.DTOs.Goal
{
    public class CreateGoalDTO
    {
        public Guid AccountId { get; set; }
        public string Name { get; set; }
        public decimal TargetAmount { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime DueDate { get; set; }
    }
}
