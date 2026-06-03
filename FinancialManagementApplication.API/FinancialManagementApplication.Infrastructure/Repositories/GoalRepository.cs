using FinancialManagementApplication.Application.Interface.Repositories;
using FinancialManagementApplication.Domain.Entities;
using FinancialManagementApplication.Domain.Enums;
using FinancialManagementApplication.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FinancialManagementApplication.Infrastructure.Repositories
{
    public class GoalRepository : IGoalRepository
    {
        private readonly ApplicationDbContext _context;
        public GoalRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Goal> CreateAsync(Goal goal)
        {
            await _context.AddAsync(goal);
            await _context.SaveChangesAsync();
            return goal;
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var goal = await _context.Goals.FindAsync(id);
            if (goal == null) return false;
            _context.Goals.Remove(goal);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<Goal>> GetAllByAccountIdAsync(Guid accountId)
        {
            return await _context.Goals
                .Where(x => x.AccountId == accountId)
                .OrderBy(x => x.DueDate)
                .ToListAsync();
        }

        public async Task<Goal> GetAsync(Guid id)
        {
            return await _context.Goals.FindAsync(id);
        }

        public async Task<Goal> UpdateAsync(Goal goal)
        {
            _context.Goals.Update(goal);
            await _context.SaveChangesAsync();
            return goal;
        }

        public async Task<Goal> StartAsync(Guid id)
        {
            var goal = await _context.Goals.FindAsync(id);
            if (goal == null) return null;

            if (goal.Status != GoalStatus.NotStarted)
                throw new InvalidOperationException("Only NotStarted goals can be started.");

            goal.Status = GoalStatus.Processing;
            goal.StartDate = DateTime.UtcNow;
            goal.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return goal;
        }

        public async Task<Goal> CancelAsync(Guid id)
        {
            var goal = await _context.Goals.FindAsync(id);
            if (goal == null) return null;

            if (goal.Status != GoalStatus.Processing && goal.Status != GoalStatus.NotStarted)
                throw new InvalidOperationException("Only Processing or NotStarted goals can be cancelled.");

            goal.Status = GoalStatus.Cancelled;
            goal.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return goal;
        }

        public async Task UpdateStatusAsync(Guid accountId)
        {
            var now = DateTime.UtcNow;
            var totalValue = await _context.Assets
                .Where(a => a.AccountID == accountId)
                .SumAsync(a => a.CurrentValue);

            var goals = await _context.Goals
                .Where(g => g.AccountId == accountId && g.Status == GoalStatus.Processing)
                .ToListAsync();

            foreach (var goal in goals)
            {
                if (goal.DueDate <= now)
                {
                    // Past due: final verdict
                    goal.Status = totalValue >= goal.TargetAmount
                        ? GoalStatus.Successed
                        : GoalStatus.Failed;
                    goal.UpdatedAt = now;
                }
                else if (totalValue >= goal.TargetAmount)
                {
                    // Early achievement before due date
                    goal.Status = GoalStatus.Successed;
                    goal.UpdatedAt = now;
                }
            }

            await _context.SaveChangesAsync();
        }
    }
}
