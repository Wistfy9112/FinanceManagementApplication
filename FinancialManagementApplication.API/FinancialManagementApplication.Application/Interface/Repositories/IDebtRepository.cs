using FinancialManagementApplication.Domain.Entities;

namespace FinancialManagementApplication.Application.Interface.Repositories
{
    public interface IDebtRepository
    {
        Task<Debt?> GetAsync(Guid id);
        Task<IEnumerable<Debt>> GetAllByAccountIdAsync(Guid accountId);
        Task<Debt> CreateAsync(Debt debt);
        Task<Debt> UpdateAsync(Debt debt);
        Task<bool> DeleteAsync(Guid id);
        Task<DebtPayment> AddPaymentAsync(DebtPayment payment);
        Task CloseDebtAsync(Guid id);
    }
}
