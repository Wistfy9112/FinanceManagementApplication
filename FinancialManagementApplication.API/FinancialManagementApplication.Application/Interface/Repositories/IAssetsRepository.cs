using FinancialManagementApplication.Domain.Entities;

namespace FinancialManagementApplication.Application.Interface.Repositories
{
    public class SnapshotSummary
    {
        public DateTime RecordedAt { get; set; }
        public decimal TotalValue { get; set; }
    }

    public interface IAssetsRepository
    {
        Task<Assets> GetAsync(Guid id);
        Task<IEnumerable<Assets>> GetAllByAccountIdAsync(Guid accountId);
        Task<Assets> CreateAsync(Assets asset);
        Task<Assets> UpdateAsync(Assets asset);
        Task<bool> DeleteAsync(Guid id);
        Task<AssetHistory> SaveSnapshotAsync(Guid accountId);
        Task<IEnumerable<AssetHistory>> GetHistoryAsync(Guid accountId);
        Task<bool> RestoreFromHistoryAsync(Guid historyId);
        Task<IEnumerable<SnapshotSummary>> GetSnapshotValuesAsync(Guid accountId);
    }
}
