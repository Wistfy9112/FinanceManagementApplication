using FinancialManagementApplication.Application.Interface.Repositories;
using FinancialManagementApplication.Domain.Entities;
using FinancialManagementApplication.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace FinancialManagementApplication.Infrastructure.Repositories
{
    public class PortfolioAllocationRepository : IPortfolioAllocationRepository
    {
        private readonly ApplicationDbContext _context;
        public PortfolioAllocationRepository(ApplicationDbContext context)
        {
            _context = context;
        }
        public async Task<PortfolioAllocation> CreateAsync(PortfolioAllocation portfolioAllocation)
        {
            await _context.PortfolioAllocations.AddAsync(portfolioAllocation);
            await _context.SaveChangesAsync();
            return portfolioAllocation;
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            return await _context.PortfolioAllocations.Where(x => x.Id == id).ExecuteDeleteAsync() > 0;
        }

        public async Task<IEnumerable<PortfolioAllocation>> GetAllByPortfolioIdAsync(Guid portfolioId)
        {
            return await _context.PortfolioAllocations
                .Include(x => x.Asset)
                .Where(x => x.PortfolioId == portfolioId).ToListAsync();
        }

        public async Task<PortfolioAllocation> GetAsync(Guid id)
        {
            return await _context.PortfolioAllocations
                .Include(x => x.Asset)
                .Where(x => x.Id == id).FirstOrDefaultAsync();
        }

        public async Task<PortfolioAllocation> UpdateAsync(PortfolioAllocation portfolioAllocation)
        {
            _context.PortfolioAllocations.Update(portfolioAllocation);
            await _context.SaveChangesAsync();
            return portfolioAllocation;
        }

        public async Task<PortfolioAllocationHistory> SaveSnapshotAsync(Guid accountId)
        {
            var allocations = await _context.PortfolioAllocations
                .Where(al => al.Portfolio.AccountID == accountId)
                .ToListAsync();

            var portfolioAmount = await _context.Portfolio
                .Where(p => p.AccountID == accountId)
                .Select(p => p.Amount)
                .FirstOrDefaultAsync();

            var history = new PortfolioAllocationHistory
            {
                Id = Guid.NewGuid(),
                AccountId = accountId,
                CurrentAmount = portfolioAmount,
                RecordedAt = DateTime.UtcNow
            };

            foreach (var al in allocations)
            {
                history.Details.Add(new PortfolioAllocationHistoryDetail
                {
                    Id = Guid.NewGuid(),
                    Name = string.IsNullOrWhiteSpace(al.Name) ? al.FinancialCategory : al.Name,
                    FinancialCategory = al.FinancialCategory,
                    CurrentAmount = al.CurrentAmount,
                    TargetPercentage = al.TargetPercentage,
                    AssetType = al.AssetType.ToString()
                });
            }

            _context.PortfolioAllocationHistories.Add(history);
            await _context.SaveChangesAsync();
            return history;
        }

        public async Task<IEnumerable<PortfolioAllocationHistory>> GetHistoryAsync(Guid accountId)
        {
            return await _context.PortfolioAllocationHistories
                .Include(h => h.Details)
                .Where(h => h.AccountId == accountId)
                .OrderByDescending(h => h.RecordedAt)
                .ToListAsync();
        }

        public async Task<bool> RestoreFromHistoryAsync(Guid historyId)
        {
            var history = await _context.PortfolioAllocationHistories
                .Include(h => h.Details)
                .FirstOrDefaultAsync(h => h.Id == historyId);

            if (history == null) return false;

            var accountId = history.AccountId;

            var existingPortfolios = await _context.Portfolio
                .Where(p => p.AccountID == accountId)
                .ToListAsync();

            var existingAllocations = await _context.PortfolioAllocations
                .Include(al => al.Asset)
                .Where(al => existingPortfolios.Select(p => p.Id).Contains(al.PortfolioId))
                .ToListAsync();

            foreach (var alloc in existingAllocations)
            {
                if (alloc.Asset != null)
                {
                    alloc.Asset.PortfolioAllocation = null;
                }
                _context.PortfolioAllocations.Remove(alloc);
            }

            foreach (var portfolio in existingPortfolios)
            {
                _context.Portfolio.Remove(portfolio);
            }

            var newPortfolio = new Portfolio
            {
                Id = Guid.NewGuid(),
                AccountID = accountId,
                Name = "Kế Hoạch Phân Bổ Tổng Thể",
                Amount = history.CurrentAmount
            };
            _context.Portfolio.Add(newPortfolio);

            foreach (var detail in history.Details)
            {
                _context.PortfolioAllocations.Add(new PortfolioAllocation
                {
                    Id = Guid.NewGuid(),
                    PortfolioId = newPortfolio.Id,
                    FinancialCategory = detail.FinancialCategory,
                    Name = detail.Name,
                    CurrentAmount = detail.CurrentAmount,
                    TargetPercentage = detail.TargetPercentage,
                    UpdateAt = DateTime.UtcNow,
                    AssetType = Enum.Parse<Domain.Enums.AssetType>(detail.AssetType)
                });
            }

            await _context.SaveChangesAsync();
            return true;
        }
    }
}
