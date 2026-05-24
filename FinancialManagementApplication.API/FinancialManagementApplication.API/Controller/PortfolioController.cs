using FinancialManagementApplication.Application.DTOs.Portfolio;
using FinancialManagementApplication.Application.Interface.Repositories;
using FinancialManagementApplication.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace FinancialManagementApplication.API.Controller
{
    [ApiController]
    [Route("api/portfolio")]
    public class PortfolioController : ControllerBase
    {
        private readonly IPortfolioRepository _portfolioRepository;

        public PortfolioController(IPortfolioRepository portfolioRepository)
        {
            _portfolioRepository = portfolioRepository;
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<PortfolioDTO>> GetPortfolio(Guid id)
        {
            var portfolio = await _portfolioRepository.GetAsync(id);
            if (portfolio == null)
            {
                return NotFound();
            }
            return Ok(portfolio);
        }

        [HttpGet("user/{userId:guid}")]
        public async Task<ActionResult<IEnumerable<PortfolioDTO>>> GetAllPortfolios(Guid userId)
        {
            var portfolios = await _portfolioRepository.GetAllByUserIdAsync(userId);
            return Ok(portfolios);
        }

        [HttpPost]
        public async Task<ActionResult<PortfolioDTO>> CreatePortfolio(Portfolio portfolio)
        {
            var result = await _portfolioRepository.CreateAsync(portfolio);
            return CreatedAtAction(nameof(GetPortfolio), new { id = result.Id }, result);
        }

        [HttpPut]
        public async Task<ActionResult<PortfolioDTO>> UpdatePortfolio(Guid id, Portfolio portfolio)
        {
            if (id != portfolio.Id)
            {
                return BadRequest();
            }
            await _portfolioRepository.UpdateAsync(portfolio);
            return NoContent();
        }

        [HttpDelete]
        public async Task<ActionResult<bool>> DeletePortfolio(Guid id)
        {
            var portfolio = await _portfolioRepository.GetAsync(id);
            if (portfolio == null)
            {
                return NotFound();
            }
            await _portfolioRepository.DeleteAsync(id);
            return Ok(true);
        }
    }
}
