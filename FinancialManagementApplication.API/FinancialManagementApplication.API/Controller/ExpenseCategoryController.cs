using FinancialManagementApplication.Application.DTOs.Category;
using FinancialManagementApplication.Application.Interface.Repositories;
using FinancialManagementApplication.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace FinancialManagementApplication.API.Controller
{
    [ApiController]
    [Route("api/expenseCategory")]
    public class ExpenseCategoryController : ControllerBase
    {
        private readonly IExpenseCategoryRepository _categoryRepository;

        public ExpenseCategoryController(IExpenseCategoryRepository categoryRepository)
        {
            _categoryRepository = categoryRepository;
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ExpenseCategoryDTO>> GetCategoryByID(Guid id)
        {
            var category = await _categoryRepository.GetCategoryByIdAsync(id);
            if (category == null)
            {
                return NotFound();
            }
            return Ok(category);
        }

        [HttpGet("account/{id}")]
        public async Task<ActionResult<ExpenseCategoryDTO>> GetCategoryByAccountID(Guid id)
        {
            var category = await _categoryRepository.GetByAccountIDAsync(id);
            if (category == null)
            {
                return NotFound();
            }
            return Ok(category);
        }

        [HttpPost]
        public async Task<ActionResult<ExpenseCategoryDTO>> CreateCategory(ExpenseCategory category)
        {
            var result = await _categoryRepository.CreateCategoryAsync(category);
            return CreatedAtAction(nameof(GetCategoryByID), new { id = result.CategoryID });
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ExpenseCategoryDTO>> UpdateCategory(Guid id, ExpenseCategoryDTO category)
        {
            var currentCategory = await _categoryRepository.GetCategoryByIdAsync(id);
            if (currentCategory == null)
            {
                return NotFound();
            }
            currentCategory.Name = category.Name;
            currentCategory.Description = category.Description;
            currentCategory.UpdateAt = DateTime.UtcNow;
            var updated = await _categoryRepository.UpdateCategoryAsync(currentCategory);
            return Ok(updated);
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteCategory(Guid id)
        {
            var currentCategory = await _categoryRepository.GetCategoryByIdAsync(id);
            if (currentCategory == null)
            {
                return NotFound();
            }
            await _categoryRepository.DeleteCategoryAsync(id);
            return NoContent();
        }
    }
}
