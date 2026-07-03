using FinancialManagementApplication.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace FinancialManagementApplication.Application.Interface.Repositories
{
    public interface IPortfolioRepository
    {
        Task <Portfolio?> GetAsync (Guid id);
        Task <Portfolio?> GetByAccountIdAsync(Guid accountId);
        Task <Portfolio> CreateAsync (Portfolio portfolio);
        Task <bool> DeleteAsync (Guid id);
        Task <Portfolio> UpdateAsync (Portfolio portfolio);
        Task <IEnumerable<Portfolio>> GetAllByAccountIdAsync (Guid accountId);
    }
}
