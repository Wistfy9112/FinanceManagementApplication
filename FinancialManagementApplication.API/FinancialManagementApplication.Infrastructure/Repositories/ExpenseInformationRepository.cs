using FinancialManagementApplication.Application.Interface.Repositories;
using FinancialManagementApplication.Domain.Entities;
using FinancialManagementApplication.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Text;

namespace FinancialManagementApplication.Infrastructure.Repositories
{
    public class ExpenseInformationRepository : IExpenseInformationRepository
    {
        private readonly ApplicationDbContext _context;
        public ExpenseInformationRepository(ApplicationDbContext context)
        {
            _context = context;
        }
        public async Task<ExpenseInformation?> CreateExpenseAsync(ExpenseInformation expense)
        {
            await _context.Expenses.AddAsync(expense);
            await _context.SaveChangesAsync();
            return expense;
        }

        public async Task<bool> DeleteExpenseAsync(Guid id)
        {
            await _context.Expenses.Where(x => x.ExpenseID == id).ExecuteDeleteAsync();
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<ExpenseInformation>> GetAllExpensesAsync()
        {
            return await _context.Expenses.ToListAsync();
        }

        public async Task<IEnumerable<ExpenseInformation>> GetByCategoryIDAsync(Guid categoryID)
        {
            return await _context.Expenses.Where(x => x.CategoryID == categoryID).ToListAsync();
        }

        public async Task<ExpenseInformation?> GetExpenseByAccountIDAsync(Guid accountID)
        {
            return await _context.Expenses.FirstOrDefaultAsync(x => x.AccountID == accountID);
        }

        public async Task<ExpenseInformation?> GetExpenseByIDAsync(Guid id)
        {
            return await _context.Expenses.FirstOrDefaultAsync(x => x.ExpenseID == id);
        }

        public async Task<ExpenseInformation?> UpdateExpenseAsync(ExpenseInformation expense)
        {
            await _context.Expenses.Where(x => x.ExpenseID == expense.ExpenseID).ExecuteUpdateAsync(x =>
                x.SetProperty(e => e.Amount, expense.Amount)
                .SetProperty(e => e.Name, expense.Name)
                .SetProperty(e => e.CategoryID, expense.CategoryID)
                .SetProperty(e => e.UpdateAt, DateTime.UtcNow)
            ).ContinueWith(t => t.Result > 0 ? expense : null);
            await _context.SaveChangesAsync();
            return expense;
        }
    }
}
