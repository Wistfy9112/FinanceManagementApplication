using FinancialManagementApplication.Application.DTOs.Debt;
using FinancialManagementApplication.Application.Interface.Repositories;
using FinancialManagementApplication.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace FinancialManagementApplication.API.Controller
{
    [ApiController]
    [Route("api/debts")]
    public class DebtController : ControllerBase
    {
        private readonly IDebtRepository _debtRepository;

        public DebtController(IDebtRepository debtRepository)
        {
            _debtRepository = debtRepository;
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetDebt(Guid id)
        {
            var debt = await _debtRepository.GetAsync(id);
            if (debt == null) return NotFound();
            return Ok(debt);
        }

        [HttpGet("user/{userId:guid}")]
        public async Task<ActionResult<IEnumerable<DebtDTO>>> GetAllDebts(Guid userId)
        {
            var debts = await _debtRepository.GetAllByAccountIdAsync(userId);
            return Ok(debts);
        }

        [HttpPost]
        public async Task<ActionResult<DebtDTO>> CreateDebt(CreateDebtDTO dto)
        {
            var debt = new Debt
            {
                Id = Guid.NewGuid(),
                AccountId = dto.AccountId,
                Name = dto.Name,
                TotalDebt = dto.TotalDebt,
                PaidAmount = 0,
                RemainingAmount = dto.TotalDebt,
                BorrowDate = dto.BorrowDate,
                DueDate = dto.DueDate,
                Note = dto.Note,
                Description = dto.Description,
                InterestRate = dto.InterestRate,
                Type = dto.Type,
                IsClosed = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            var result = await _debtRepository.CreateAsync(debt);
            return CreatedAtAction(nameof(GetDebt), new { id = result.Id }, result);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateDebt(Guid id, UpdateDebtDTO dto)
        {
            var debt = await _debtRepository.GetAsync(id);
            if (debt == null) return NotFound();
            if (debt.IsClosed)
                return BadRequest(new { Message = "Cannot update a closed debt." });

            debt.Name = dto.Name;
            debt.TotalDebt = dto.TotalDebt;
            debt.RemainingAmount = dto.TotalDebt - debt.PaidAmount;
            debt.BorrowDate = dto.BorrowDate;
            debt.DueDate = dto.DueDate;
            debt.Note = dto.Note;
            debt.Description = dto.Description;
            debt.InterestRate = dto.InterestRate;
            debt.Type = dto.Type;
            debt.UpdatedAt = DateTime.UtcNow;

            if (debt.RemainingAmount <= 0)
            {
                debt.RemainingAmount = 0;
                debt.IsClosed = true;
            }

            await _debtRepository.UpdateAsync(debt);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDebt(Guid id)
        {
            var debt = await _debtRepository.GetAsync(id);
            if (debt == null) return NotFound();

            var deleted = await _debtRepository.DeleteAsync(id);
            if (!deleted) return NotFound();
            return NoContent();
        }

        [HttpPost("{id}/close")]
        public async Task<IActionResult> CloseDebt(Guid id)
        {
            try
            {
                var debt = await _debtRepository.GetAsync(id);
                if (debt == null) return NotFound();
                if (debt.IsClosed)
                    return BadRequest(new { Message = "Debt is already closed." });

                debt.RemainingAmount = 0;
                debt.IsClosed = true;
                debt.UpdatedAt = DateTime.UtcNow;
                await _debtRepository.UpdateAsync(debt);
                return Ok(debt);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [HttpPost("{debtId}/payments")]
        public async Task<ActionResult<DebtPaymentDTO>> AddPayment(Guid debtId, CreateDebtPaymentDTO dto)
        {
            if (dto.DebtId != debtId)
                return BadRequest(new { Message = "Debt ID mismatch." });

            try
            {
                var payment = new DebtPayment
                {
                    Id = Guid.NewGuid(),
                    DebtId = debtId,
                    PaymentDate = dto.PaymentDate == default ? DateTime.UtcNow : dto.PaymentDate,
                    Amount = dto.Amount,
                    Note = dto.Note,
                    CreatedAt = DateTime.UtcNow
                };
                var result = await _debtRepository.AddPaymentAsync(payment);
                return CreatedAtAction(nameof(GetDebt), new { id = debtId }, result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }
    }
}
