using FinancialManagementApplication.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace FinancialManagementApplication.Application.Interface.Repositories
{
    public interface IExpenseCategoryRepository
    {
        Task<ExpenseCategory?> GetCategoryByIdAsync(Guid id);
        Task<IEnumerable<ExpenseCategory>> GetAllCategoriesAsync();
        Task<ExpenseCategory?> GetByAccountIDAsync(Guid accountId);
        Task<ExpenseCategory?> CreateCategoryAsync(ExpenseCategory category);
        Task<ExpenseCategory?> UpdateCategoryAsync(ExpenseCategory category);
        Task<bool> DeleteCategoryAsync(Guid id);
    }
}
