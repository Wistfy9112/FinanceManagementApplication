using FinancialManagementApplication.Application.Interface.Repositories;
using FinancialManagementApplication.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace FinancialManagementApplication.Infrastructure.Repositories
{
    public class PortfolioRepository : IPortfolioRepository
    {
        private readonly ApplicationDbContext _context;
        public PortfolioRepository(ApplicationDbContext context)
        {
            _context = context;
        }
        public async Task<Portfolio> CreateAsync(Portfolio portfolio)
        {
            await _context.AddAsync(portfolio);
            await _context.SaveChangesAsync();
            return portfolio;
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            try
            {
                await _context.Portfolios.Where(x => x.Id == id).ExecuteDeleteAsync();
            } catch (Exception e){
                return false;
            }
            return true;
        }

        public async Task<IEnumerable<Portfolio>> GetAllByUserIdAsync(Guid userId)
        {
            return await _context.Portfolios.Where(x => x.UserId == userId).ToListAsync();
        }

        public async Task<Portfolio> GetAsync(Guid id)
        {
            return await _context.Portfolios.Where(x => x.Id == id).FirstOrDefaultAsync();
        }

        public async Task<Portfolio> GetByUserIDAsync(Guid userId)
        {
            return await _context.Portfolios.Where(x => x.UserId == userId).FirstOrDefaultAsync ();
        }

        public async Task<Portfolio> UpdateAsync(Portfolio portfolio)
        {
            _context.Portfolios.Update(portfolio);
            await _context.SaveChangesAsync();
            return portfolio;
        }
    }
}
