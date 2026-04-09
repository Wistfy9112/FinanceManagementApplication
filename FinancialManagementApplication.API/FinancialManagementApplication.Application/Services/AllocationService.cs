using FinancialManagementApplication.Application.Interface.Repositories;
using System;
using System.Collections.Generic;
using System.Text;

namespace FinancialManagementApplication.Application.Services
{
    public class AllocationService
    {
        private readonly IExpenseCategoryRepository _categoryRepository;
        private readonly IExpenseInformationRepository _expenseRepository;
        public AllocationService(IExpenseCategoryRepository categoryRepository, IExpenseInformationRepository expenseRepository)
        {
           _categoryRepository = categoryRepository;
           _expenseRepository = expenseRepository;
        }
        public async Task<Dictionary<Guid, float>> CalculateAllocations (float totalIncome, Guid accountID) {
            var categories = await _categoryRepository.GetByAccountIDAsync(accountID);
            var expenses = await _expenseRepository.GetByCategoryIDAsync(categories.CategoryID);
            var allocations = new Dictionary<Guid, float>();

            foreach (var expense in expenses)
            {
                var allocationAmount = totalIncome * (float)(expense.AllocatedPercentage / 100);
                allocations[expense.CategoryID] = allocationAmount;
            }
            return allocations;
        }
        public async Task<Dictionary<Guid, float>> AdjustAllocation(float totalIncome, float reductionAmount, Guid accountID) {
            var categories = await _categoryRepository.GetByAccountIDAsync(accountID);
            var expenses = await _expenseRepository.GetByCategoryIDAsync(categories.CategoryID);
            var adjustAllocation = new Dictionary<Guid, float>();

            var totalPercentage = expenses.Sum(expense => expense.AllocatedPercentage);

            foreach (var expense in expenses) { 
                var categoryProportion = expense.AllocatedPercentage / totalPercentage;
                var categoryReduction = reductionAmount * categoryProportion;
                var allocatedAmout = totalIncome * (expense.AllocatedPercentage / 100);
                var adjustedAmount = allocatedAmout - categoryReduction;

                adjustAllocation[expense.CategoryID] = adjustedAmount;
            }

            return adjustAllocation;
        }
    }
}
