using FinancialManagementApplication.Application.Interface.Repositories;
using FinancialManagementApplication.Domain.Entities;
using FinancialManagementApplication.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Text;

namespace FinancialManagementApplication.Infrastructure.Repositories
{
    public class ExpenseCategoryRepository : IExpenseCategoryRepository
    {
        private readonly ApplicationDbContext _context;
        public ExpenseCategoryRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<ExpenseCategory> CreateCategoryAsync(ExpenseCategory category)
        {
            await _context.Categories.AddAsync(category);
            await _context.SaveChangesAsync();
            return category;
        }

        public async Task<bool> DeleteCategoryAsync(Guid id)
        {
            await _context.Categories.Where(x => x.CategoryID == id).ExecuteDeleteAsync();
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<ExpenseCategory>> GetAllCategoriesAsync()
        {
            return await _context.Categories.ToListAsync().ContinueWith(t => (IEnumerable<ExpenseCategory>)t.Result);
        }

        public async Task<ExpenseCategory?> GetByAccountIDAsync(Guid accountId)
        {
            return await _context.Categories.FirstOrDefaultAsync(x => x.AccountID == accountId);
        }

        public async Task<ExpenseCategory?> GetCategoryByIdAsync(Guid id)
        {
            return await _context.Categories.FirstOrDefaultAsync(x => x.CategoryID == id);
        }

        public async Task<ExpenseCategory> UpdateCategoryAsync(ExpenseCategory category)
        {
            await _context.Categories.Where(x => x.CategoryID == category.CategoryID).ExecuteUpdateAsync(x =>
                x.SetProperty(c => c.Name, category.Name)
                .SetProperty(c => c.Description, category.Description)
                .SetProperty(c => c.UpdateAt, DateTime.UtcNow)
            );
            await _context.SaveChangesAsync();
            return category;
        }
    }
}
