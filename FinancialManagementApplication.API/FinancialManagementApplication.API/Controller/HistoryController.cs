using FinancialManagementApplication.Application.Interface.Repositories;
using FinancialManagementApplication.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace FinancialManagementApplication.API.Controller
{
    [ApiController]
    [Route("api/history")]
    public class HistoryController : ControllerBase
    {
        private readonly IAssetsRepository _assetsRepository;
        private readonly IPortfolioAllocationRepository _allocationRepository;

        public HistoryController(
            IAssetsRepository assetsRepository,
            IPortfolioAllocationRepository allocationRepository)
        {
            _assetsRepository = assetsRepository;
            _allocationRepository = allocationRepository;
        }

        [HttpGet("asset/{accountId:guid}")]
        public async Task<ActionResult<IEnumerable<AssetHistory>>> GetAssetHistory(Guid accountId)
        {
            var history = await _assetsRepository.GetHistoryAsync(accountId);
            return Ok(history);
        }

        [HttpPost("asset/snapshot/{accountId:guid}")]
        public async Task<ActionResult<AssetHistory>> SaveSnapshot(Guid accountId)
        {
            var history = await _assetsRepository.SaveSnapshotAsync(accountId);
            return Ok(history);
        }

        [HttpGet("allocation/{allocationId:guid}")]
        public async Task<ActionResult<IEnumerable<AllocationHistory>>> GetAllocationHistory(Guid allocationId)
        {
            var history = await _allocationRepository.GetHistoryAsync(allocationId);
            return Ok(history);
        }

        [HttpPost("asset/restore/{historyId:guid}")]
        public async Task<ActionResult> RestoreFromHistory(Guid historyId)
        {
            var success = await _assetsRepository.RestoreFromHistoryAsync(historyId);
            if (!success) return NotFound();
            return Ok(new { message = "Khôi phục thành công" });
        }
    }
}
