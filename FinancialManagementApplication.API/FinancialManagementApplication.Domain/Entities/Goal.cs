using FinanceManagementApplication.Domain.Entities;
using FinancialManagementApplication.Domain.Enums;

namespace FinancialManagementApplication.Domain.Entities
{
    public class Goal
    {
        public Guid Id { get; set; }
        public Guid AccountId { get; set; }
        public string Name { get; set; }
        public decimal TargetAmount { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime DueDate { get; set; }
        public GoalStatus Status { get; set; } = GoalStatus.NotStarted;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public virtual Account Account { get; set; }
    }
}
