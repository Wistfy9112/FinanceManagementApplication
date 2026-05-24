using FinancialManagementApplication.Application.Interface.Repositories;
using FinancialManagementApplication.Domain.Entities;
using FinancialManagementApplication.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Text;

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
                await _context.Assets.Where(x => x.Id == id).ExecuteDeleteAsync();
            } catch (Exception e){
                return false;
            }
            return true;
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
    }
}
