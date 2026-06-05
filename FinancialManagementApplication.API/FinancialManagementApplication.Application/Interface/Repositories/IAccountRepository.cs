using FinanceManagementApplication.Domain.Entities;

namespace FinanceManagementApplication.Application.Interface.Repositories
{
    public interface IAccountRepository
    {
        Task<Account?> GetByEmailAsync(string email);
        Task<Account?> GetByIdAsync(Guid id);
        Task AddAsync(Account account);
        Task UpdateAsync(Account account);
    }
}
