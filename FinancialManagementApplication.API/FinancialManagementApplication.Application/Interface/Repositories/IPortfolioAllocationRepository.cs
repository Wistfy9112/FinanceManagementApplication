using FinancialManagementApplication.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace FinancialManagementApplication.Application.Interface.Repositories
{
    public interface IPortfolioAllocationRepository
    {
        Task <PortfolioAllocation> GetAsync(Guid id);
        Task <IEnumerable<PortfolioAllocation>> GetAllByPortfolioIdAsync(Guid portfolioId);
        Task <PortfolioAllocation> CreateAsync(PortfolioAllocation portfolioAllocation);
        Task <PortfolioAllocation> UpdateAsync(PortfolioAllocation portfolioAllocation);
        Task <bool> DeleteAsync(Guid id);
        Task<IEnumerable<AllocationHistory>> GetHistoryAsync(Guid allocationId);
    }
}
