using FinancialManagementApplication.Application.DTOs.Common;
using FinancialManagementApplication.Application.DTOs.History;
using FinancialManagementApplication.Domain.Entities;

namespace FinancialManagementApplication.Application.Interface.Repositories
{
    public interface IAssetsRepository
    {
        Task<Assets?> GetAsync(Guid id);
        Task<IEnumerable<Assets>> GetAllByAccountIdAsync(Guid accountId);
        Task<Assets> CreateAsync(Assets asset);
        Task<Assets> UpdateAsync(Assets asset);
        Task<bool> DeleteAsync(Guid id);
        Task<AssetHistory> SaveSnapshotAsync(Guid accountId, DateTime? recordedAt = null);
        Task<IEnumerable<AssetHistory>> GetHistoryAsync(Guid accountId);
        Task<bool> RestoreFromHistoryAsync(Guid historyId);
        Task<bool> DeleteHistoryAsync(Guid historyId);
        Task<AssetHistory?> UpdateAssetHistoryTimeAsync(Guid historyId, DateTime recordedAt);
        Task<AssetHistory?> UpdateAssetHistoryAsync(Guid historyId, UpdateAssetHistoryDTO dto);
        Task<IEnumerable<SnapshotSummary>> GetSnapshotValuesAsync(Guid accountId);
        Task<decimal> GetCurrentTotalValueAsync(Guid accountId);
        Task<decimal> GetCurrentTotalInitialValueAsync(Guid accountId);
    }
}
