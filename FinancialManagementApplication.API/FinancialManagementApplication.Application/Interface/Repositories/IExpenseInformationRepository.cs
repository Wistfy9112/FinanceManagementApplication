using FinancialManagementApplication.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace FinancialManagementApplication.Application.Interface.Repositories
{
    public interface IExpenseInformationRepository
    {
        public Task<ExpenseInformation?> GetExpenseByIDAsync(Guid id);
        public Task<IEnumerable<ExpenseInformation>> GetAllExpensesAsync();
        public Task<ExpenseInformation?> GetExpenseByAccountIDAsync(Guid accountID);
        public Task<IEnumerable<ExpenseInformation>> GetByCategoryIDAsync(Guid categoryID);
        public Task<ExpenseInformation?> CreateExpenseAsync(ExpenseInformation expense);
        public Task<ExpenseInformation?> UpdateExpenseAsync(ExpenseInformation expense);
        public Task<bool> DeleteExpenseAsync(Guid id);
    }
}
