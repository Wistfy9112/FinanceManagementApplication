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

        [HttpPost("asset/restore/{historyId:guid}")]
        public async Task<ActionResult> RestoreFromHistory(Guid historyId)
        {
            var success = await _assetsRepository.RestoreFromHistoryAsync(historyId);
            if (!success) return NotFound();
            return Ok(new { message = "Khôi phục thành công" });
        }

        [HttpGet("allocation-history/{accountId:guid}")]
        public async Task<ActionResult<IEnumerable<PortfolioAllocationHistory>>> GetAllocationHistory(Guid accountId)
        {
            var history = await _allocationRepository.GetHistoryAsync(accountId);
            return Ok(history);
        }

        [HttpPost("allocation/snapshot/{accountId:guid}")]
        public async Task<ActionResult<PortfolioAllocationHistory>> SaveAllocationSnapshot(Guid accountId)
        {
            var history = await _allocationRepository.SaveSnapshotAsync(accountId);
            return Ok(history);
        }

        [HttpPost("allocation/restore/{historyId:guid}")]
        public async Task<ActionResult> RestoreAllocationFromHistory(Guid historyId)
        {
            var success = await _allocationRepository.RestoreFromHistoryAsync(historyId);
            if (!success) return NotFound();
            return Ok(new { message = "Khôi phục phân bổ thành công" });
        }
    }
}
