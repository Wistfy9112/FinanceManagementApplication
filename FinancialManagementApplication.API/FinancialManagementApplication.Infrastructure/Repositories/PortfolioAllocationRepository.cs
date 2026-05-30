using FinancialManagementApplication.Application.Interface.Repositories;
using FinancialManagementApplication.Domain.Entities;
using FinancialManagementApplication.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
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

            _context.AllocationHistories.Add(new AllocationHistory
            {
                Id = Guid.NewGuid(),
                AllocationId = portfolioAllocation.Id,
                CurrentAmount = portfolioAllocation.CurrentAmount,
                TargetPercentage = portfolioAllocation.TargetPercentage,
                RecordedAt = DateTime.UtcNow
            });
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

            _context.AllocationHistories.Add(new AllocationHistory
            {
                Id = Guid.NewGuid(),
                AllocationId = portfolioAllocation.Id,
                CurrentAmount = portfolioAllocation.CurrentAmount,
                TargetPercentage = portfolioAllocation.TargetPercentage,
                RecordedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            return portfolioAllocation;
        }

        public async Task<IEnumerable<AllocationHistory>> GetHistoryAsync(Guid allocationId)
        {
            return await _context.AllocationHistories
                .Where(h => h.AllocationId == allocationId)
                .OrderByDescending(h => h.RecordedAt)
                .ToListAsync();
        }
    }
}
