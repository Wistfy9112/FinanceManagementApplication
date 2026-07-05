using FinancialManagementApplication.Application.DTOs.History;
using FinancialManagementApplication.Application.DTOs.PortfolioAllocation;
using FinancialManagementApplication.Domain.Entities;

namespace FinancialManagementApplication.Application.Interface.Repositories
{
    public interface IPortfolioAllocationRepository
    {
        Task<PortfolioAllocation?> GetAsync(Guid id);
        Task<IEnumerable<PortfolioAllocation>> GetAllByPortfolioIdAsync(Guid portfolioId);
        Task<PortfolioAllocation> CreateAsync(PortfolioAllocation portfolioAllocation);
        Task<PortfolioAllocation> UpdateAsync(PortfolioAllocation portfolioAllocation);
        Task<bool> DeleteAsync(Guid id);
        Task ReorderAsync(List<PortfolioAllocationOrderItem> items);
        Task<PortfolioAllocationHistory> SaveSnapshotAsync(Guid accountId, DateTime? recordedAt = null);
        Task<IEnumerable<PortfolioAllocationHistory>> GetHistoryAsync(Guid accountId);
        Task<bool> RestoreFromHistoryAsync(Guid historyId);
        Task<bool> DeleteHistoryAsync(Guid historyId);
        Task<PortfolioAllocationHistory?> UpdateAllocationHistoryTimeAsync(Guid historyId, DateTime recordedAt);
        Task<PortfolioAllocationHistory?> UpdateAllocationHistoryAsync(Guid historyId, UpdateAllocationHistoryDTO dto);
    }
}
