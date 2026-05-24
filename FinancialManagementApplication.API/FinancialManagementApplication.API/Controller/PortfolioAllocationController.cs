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
        public async Task<ActionResult<PortfolioAllocationDTO>> GetAllByPortfolioId(Guid id)
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
        public async Task<ActionResult<PortfolioAllocationDTO>> Create(PortfolioAllocation portfolioAllocation)
        {
            var result = await _portfolioAllocationRepository.CreateAsync(portfolioAllocation);
            return CreatedAtAction(nameof(GetByPortfolioId), new { id = result.Id }, result);
        }

        [HttpPut("{id:guid}")]
        public async Task<ActionResult> Update(Guid id, PortfolioAllocation portfolioAllocation)
        {
            if (id != portfolioAllocation.Id)
            {
                return BadRequest();
            }
            await _portfolioAllocationRepository.UpdateAsync(portfolioAllocation);
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
