using FinancialManagementApplication.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace FinancialManagementApplication.Application.Interface.Repositories
{
    public interface IPortfolioRepository
    {
        Task <Portfolio> GetAsync (Guid id);
        Task <Portfolio> GetByUserIDAsync(Guid userId);
        Task <Portfolio> CreateAsync (Portfolio portfolio);
        Task DeleteAsync (Guid id);
        Task <Portfolio> UpdateAsync (Portfolio portfolio);
        Task <IEnumerable<Portfolio>> GetAllByUserIdAsync (Guid userId);
    }
}
