using FinancialManagementApplication.Application.Interface.Repositories;
using FinancialManagementApplication.Domain.Entities;
using FinancialManagementApplication.Domain.Enums;
using FinancialManagementApplication.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FinancialManagementApplication.Infrastructure.Repositories
{
    public class AssetsRepository : IAssetsRepository
    {
        private readonly ApplicationDbContext _context;
        public AssetsRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Assets> CreateAsync(Assets asset)
        {
            await _context.AddAsync(asset);
            await _context.SaveChangesAsync();
            return asset;
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            try
            {
                var asset = await _context.Assets
                    .Include(a => a.PortfolioAllocation)
                    .FirstOrDefaultAsync(x => x.Id == id);
                if (asset == null) return false;

                if (asset.PortfolioAllocation != null)
                {
                    asset.PortfolioAllocation.AssetId = null;
                }

                _context.Assets.Remove(asset);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception)
            {
                return false;
            }
        }

        public async Task<IEnumerable<Assets>> GetAllByAccountIdAsync(Guid accountID)
        {
            return await _context.Assets.Where(x => x.AccountID == accountID).ToListAsync();
        }

        public async Task<Assets> GetAsync(Guid id)
        {
            return await _context.Assets.Where(x => x.Id == id).FirstOrDefaultAsync();
        }

        public async Task<Assets> UpdateAsync(Assets asset)
        {
            _context.Assets.Update(asset);
            await _context.SaveChangesAsync();
            return asset;
        }

        public async Task<AssetHistory> SaveSnapshotAsync(Guid accountId)
        {
            var assets = await _context.Assets
                .Where(a => a.AccountID == accountId)
                .ToListAsync();

            var history = new AssetHistory
            {
                Id = Guid.NewGuid(),
                AccountId = accountId,
                RecordedAt = DateTime.UtcNow
            };

            foreach (var a in assets)
            {
                history.Details.Add(new AssetHistoryDetail
                {
                    Id = Guid.NewGuid(),
                    AssetId = a.Id,
                    Name = a.Name,
                    InitialValue = a.InitialValue,
                    CurrentValue = a.CurrentValue,
                    Type = a.Type.ToString()
                });
            }

            _context.AssetHistories.Add(history);
            await _context.SaveChangesAsync();
            return history;
        }

        public async Task<IEnumerable<AssetHistory>> GetHistoryAsync(Guid accountId)
        {
            return await _context.AssetHistories
                .Include(h => h.Details)
                .Where(h => h.AccountId == accountId)
                .OrderByDescending(h => h.RecordedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<SnapshotSummary>> GetSnapshotValuesAsync(Guid accountId)
        {
            return await _context.AssetHistories
                .Where(h => h.AccountId == accountId)
                .Select(h => new SnapshotSummary
                {
                    RecordedAt = h.RecordedAt,
                    TotalValue = h.Details.Sum(d => d.CurrentValue),
                    TotalInitialValue = h.Details.Sum(d => d.InitialValue)
                })
                .OrderBy(s => s.RecordedAt)
                .ToListAsync();
        }

        public async Task<decimal> GetCurrentTotalValueAsync(Guid accountId)
        {
            return await _context.Assets
                .Where(a => a.AccountID == accountId)
                .SumAsync(a => a.CurrentValue);
        }

        public async Task<decimal> GetCurrentTotalInitialValueAsync(Guid accountId)
        {
            return await _context.Assets
                .Where(a => a.AccountID == accountId)
                .SumAsync(a => a.InitialValue);
        }

        public async Task<bool> RestoreFromHistoryAsync(Guid historyId)
        {
            var history = await _context.AssetHistories
                .Include(h => h.Details)
                .FirstOrDefaultAsync(h => h.Id == historyId);

            if (history == null) return false;

            var historyAssetIds = history.Details.Select(d => d.AssetId).ToHashSet();

            var existingAssets = await _context.Assets
                .Include(a => a.PortfolioAllocation)
                .Where(a => a.AccountID == history.AccountId)
                .ToListAsync();

            foreach (var asset in existingAssets)
            {
                if (historyAssetIds.Contains(asset.Id))
                {
                    var detail = history.Details.First(d => d.AssetId == asset.Id);
                    asset.Name = detail.Name;
                    asset.InitialValue = detail.InitialValue;
                    asset.CurrentValue = detail.CurrentValue;
                    asset.Type = Enum.Parse<AssetType>(detail.Type);
                }
                else
                {
                    if (asset.PortfolioAllocation != null)
                    {
                        asset.PortfolioAllocation.AssetId = null;
                    }
                    _context.Assets.Remove(asset);
                }
            }

            foreach (var detail in history.Details)
            {
                if (!existingAssets.Any(a => a.Id == detail.AssetId))
                {
                    _context.Assets.Add(new Assets
                    {
                        Id = detail.AssetId,
                        AccountID = history.AccountId,
                        Name = detail.Name,
                        InitialValue = detail.InitialValue,
                        CurrentValue = detail.CurrentValue,
                        Type = Enum.Parse<AssetType>(detail.Type)
                    });
                }
            }

            await _context.SaveChangesAsync();
            return true;
        }
    }
}
