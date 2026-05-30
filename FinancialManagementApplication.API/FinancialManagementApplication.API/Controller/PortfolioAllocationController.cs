using FinancialManagementApplication.Application.DTOs.PortfolioAllocation;
using FinancialManagementApplication.Application.Interface.Repositories;
using FinancialManagementApplication.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace FinancialManagementApplication.API.Controller
{
    [ApiController]
    [Route("api/portfolioAllocation")]
    public class PortfolioAllocationController : ControllerBase
    {
        private readonly IPortfolioAllocationRepository _portfolioAllocationRepository;

        public PortfolioAllocationController(IPortfolioAllocationRepository portfolioAllocationRepository)
        {
            _portfolioAllocationRepository = portfolioAllocationRepository;
        }

        [HttpGet("portfolio/{id:guid}")]
        public async Task<ActionResult<IEnumerable<PortfolioAllocationDTO>>> GetAllByPortfolioId(Guid id)
        {
            var result = await _portfolioAllocationRepository.GetAllByPortfolioIdAsync(id);
            return Ok(result);
        }

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<PortfolioAllocationDTO>> GetByPortfolioId(Guid id)
        {
            var result = await _portfolioAllocationRepository.GetAsync(id);
            return Ok(result);
        }

        [HttpPost]
        public async Task<ActionResult<PortfolioAllocationDTO>> Create(CreatePortfolioAllocationDTO dto)
        {
            var allocation = new PortfolioAllocation
            {
                Id = Guid.NewGuid(),
                PortfolioId = dto.PortfolioId,
                FinancialCategory = dto.FinancialCategory,
                Name = dto.Name,
                CurrentAmount = dto.CurrentAmount,
                TargetPercentage = dto.TargetPercentage,
                UpdateAt = dto.UpdateAt,
                AssetType = dto.AssetType,
                AssetId = dto.AssetId
            };
            var result = await _portfolioAllocationRepository.CreateAsync(allocation);
            return CreatedAtAction(nameof(GetByPortfolioId), new { id = result.Id }, result);
        }

        [HttpPut("{id:guid}")]
        public async Task<ActionResult> Update(Guid id, UpdatePortfolioAllocationDTO dto)
        {
            var allocation = await _portfolioAllocationRepository.GetAsync(id);
            if (allocation == null) return NotFound();

            allocation.FinancialCategory = dto.FinancialCategory;
            allocation.Name = dto.Name;
            allocation.CurrentAmount = dto.CurrentAmount;
            allocation.TargetPercentage = dto.TargetPercentage;
            allocation.UpdateAt = dto.UpdateAt;
            allocation.AssetType = dto.AssetType;
            allocation.AssetId = dto.AssetId;

            await _portfolioAllocationRepository.UpdateAsync(allocation);
            return NoContent();
        }

        [HttpDelete("{id:guid}")]
        public async Task<ActionResult> Delete(Guid id)
        {
            var success = await _portfolioAllocationRepository.DeleteAsync(id);
            if (!success)
            {
                return NotFound();
            }
            return NoContent();
        }
    }
}
