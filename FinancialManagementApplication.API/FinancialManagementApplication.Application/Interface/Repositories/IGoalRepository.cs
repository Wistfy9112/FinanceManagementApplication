using FinancialManagementApplication.Domain.Entities;

namespace FinancialManagementApplication.Application.Interface.Repositories
{
    public interface IGoalRepository
    {
        Task<Goal> GetAsync(Guid id);
        Task<IEnumerable<Goal>> GetAllByAccountIdAsync(Guid accountId);
        Task<Goal> CreateAsync(Goal goal);
        Task<Goal> UpdateAsync(Goal goal);
        Task<bool> DeleteAsync(Guid id);
        Task UpdateStatusAsync(Guid accountId);
        Task<Goal> StartAsync(Guid id);
        Task<Goal> CancelAsync(Guid id);
    }
}
