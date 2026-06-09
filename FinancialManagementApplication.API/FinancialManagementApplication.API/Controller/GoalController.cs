using FinancialManagementApplication.Application.DTOs.Goal;
using FinancialManagementApplication.Application.Interface.Repositories;
using FinancialManagementApplication.Domain.Entities;
using FinancialManagementApplication.Domain.Enums;
using Microsoft.AspNetCore.Mvc;

namespace FinancialManagementApplication.API.Controller
{
    [ApiController]
    [Route("api/goals")]
    public class GoalController : ControllerBase
    {
        private readonly IGoalRepository _goalRepository;
        private readonly IAssetsRepository _assetsRepository;

        public GoalController(IGoalRepository goalRepository, IAssetsRepository assetsRepository)
        {
            _goalRepository = goalRepository;
            _assetsRepository = assetsRepository;
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetGoal(Guid id)
        {
            var goal = await _goalRepository.GetAsync(id);
            if (goal == null) return NotFound();
            return Ok(goal);
        }

        [HttpGet("user/{userId:guid}")]
        public async Task<ActionResult<IEnumerable<GoalDTO>>> GetAllGoals(Guid userId)
        {
            await _goalRepository.UpdateStatusAsync(userId);
            var goals = await _goalRepository.GetAllByAccountIdAsync(userId);
            return Ok(goals);
        }

        [HttpPost]
        public async Task<ActionResult<GoalDTO>> CreateGoal(CreateGoalDTO dto)
        {
            var now = DateTime.UtcNow;
            var totalCurrent = await _assetsRepository.GetCurrentTotalValueAsync(dto.AccountId);

            GoalStatus status;
            if (dto.DueDate < now)
            {
                status = totalCurrent >= dto.TargetAmount
                    ? GoalStatus.Successed
                    : GoalStatus.Failed;
            }
            else if (!dto.StartDate.HasValue || dto.StartDate.Value > now)
            {
                status = GoalStatus.NotStarted;
            }
            else
            {
                status = totalCurrent >= dto.TargetAmount
                    ? GoalStatus.Successed
                    : GoalStatus.Processing;
            }

            var goal = new Goal
            {
                Id = Guid.NewGuid(),
                AccountId = dto.AccountId,
                Name = dto.Name,
                TargetAmount = dto.TargetAmount,
                StartDate = dto.StartDate,
                DueDate = dto.DueDate,
                Status = status,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            var result = await _goalRepository.CreateAsync(goal);
            return CreatedAtAction(nameof(GetGoal), new { id = result.Id }, result);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateGoal(Guid id, UpdateGoalDTO dto)
        {
            var goal = await _goalRepository.GetAsync(id);
            if (goal == null) return NotFound();

            goal.Name = dto.Name;
            goal.TargetAmount = dto.TargetAmount;
            goal.StartDate = dto.StartDate;
            goal.DueDate = dto.DueDate;
            goal.UpdatedAt = DateTime.UtcNow;

            var now = DateTime.UtcNow;
            var totalCurrent = await _assetsRepository.GetCurrentTotalValueAsync(goal.AccountId);

            if (goal.DueDate < now)
            {
                goal.Status = totalCurrent >= goal.TargetAmount
                    ? GoalStatus.Successed
                    : GoalStatus.Failed;
            }
            else if (!goal.StartDate.HasValue || goal.StartDate.Value > now)
            {
                goal.Status = GoalStatus.NotStarted;
            }
            else
            {
                goal.Status = totalCurrent >= goal.TargetAmount
                    ? GoalStatus.Successed
                    : GoalStatus.Processing;
            }

            await _goalRepository.UpdateAsync(goal);
            await _goalRepository.UpdateStatusAsync(goal.AccountId);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteGoal(Guid id)
        {
            var goal = await _goalRepository.GetAsync(id);
            if (goal == null) return NotFound();

            var accountId = goal.AccountId;
            await _goalRepository.DeleteAsync(id);
            await _goalRepository.UpdateStatusAsync(accountId);
            return NoContent();
        }

        [HttpPost("{id}/start")]
        public async Task<IActionResult> StartGoal(Guid id)
        {
            try
            {
                var goal = await _goalRepository.StartAsync(id);
                if (goal == null) return NotFound();
                return Ok(goal);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [HttpPost("{id}/cancel")]
        public async Task<IActionResult> CancelGoal(Guid id)
        {
            try
            {
                var goal = await _goalRepository.CancelAsync(id);
                if (goal == null) return NotFound();
                return Ok(goal);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }
    }
}
