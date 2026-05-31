using FinancialManagementApplication.Application.DTOs.CashFlow;
using FinancialManagementApplication.Application.Interface.Services;
using Microsoft.AspNetCore.Mvc;

namespace FinancialManagementApplication.API.Controller
{
    [ApiController]
    [Route("api/cashflow")]
    public class CashFlowController : ControllerBase
    {
        private readonly ICashFlowGrowthService _growthService;

        public CashFlowController(ICashFlowGrowthService growthService)
        {
            _growthService = growthService;
        }

        [HttpGet("growth/{accountId:guid}")]
        public async Task<ActionResult<CashFlowGrowthResponse>> GetGrowthData(
            Guid accountId,
            [FromQuery] string mode = "yearly",
            [FromQuery] int? year = null)
        {
            var validModes = new[] { "yearly", "monthly", "last12months" };
            if (!validModes.Contains(mode))
                return BadRequest(new { message = "Mode must be 'yearly', 'monthly', or 'last12months'" });

            var result = await _growthService.GetGrowthDataAsync(accountId, mode, year);
            return Ok(result);
        }
    }
}
