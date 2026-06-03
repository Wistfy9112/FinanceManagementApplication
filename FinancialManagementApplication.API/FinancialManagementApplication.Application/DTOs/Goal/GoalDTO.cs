using FinancialManagementApplication.Domain.Enums;

namespace FinancialManagementApplication.Application.DTOs.Goal
{
    public class GoalDTO
    {
        public Guid Id { get; set; }
        public Guid AccountId { get; set; }
        public string Name { get; set; }
        public decimal TargetAmount { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime DueDate { get; set; }
        public GoalStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
