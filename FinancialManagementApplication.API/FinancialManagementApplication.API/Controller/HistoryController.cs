using FinancialManagementApplication.Application.DTOs.History;
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
        public async Task<ActionResult<AssetHistory>> SaveSnapshot(Guid accountId, [FromQuery] DateTime? recordedAt = null)
        {
            var history = await _assetsRepository.SaveSnapshotAsync(accountId, recordedAt ?? DateTime.Now);
            return Ok(history);
        }

        [HttpPut("asset/{historyId:guid}")]
        public async Task<ActionResult<AssetHistory>> UpdateAssetHistoryTime(Guid historyId, [FromBody] UpdateHistoryTimeDTO dto)
        {
            var history = await _assetsRepository.UpdateAssetHistoryTimeAsync(historyId, dto.RecordedAt);
            if (history == null) return NotFound();
            return Ok(history);
        }

        [HttpPost("asset/restore/{historyId:guid}")]
        public async Task<ActionResult> RestoreFromHistory(Guid historyId)
        {
            var success = await _assetsRepository.RestoreFromHistoryAsync(historyId);
            if (!success) return NotFound();
            return Ok(new { message = "Khôi phục thành công" });
        }

        [HttpDelete("asset/{historyId:guid}")]
        public async Task<ActionResult> DeleteAssetHistory(Guid historyId)
        {
            var success = await _assetsRepository.DeleteHistoryAsync(historyId);
            if (!success) return NotFound();
            return Ok(new { message = "Xóa lịch sử tài sản thành công" });
        }

        [HttpGet("allocation-history/{accountId:guid}")]
        public async Task<ActionResult<IEnumerable<PortfolioAllocationHistory>>> GetAllocationHistory(Guid accountId)
        {
            var history = await _allocationRepository.GetHistoryAsync(accountId);
            return Ok(history);
        }

        [HttpPost("allocation/snapshot/{accountId:guid}")]
        public async Task<ActionResult<PortfolioAllocationHistory>> SaveAllocationSnapshot(Guid accountId, [FromQuery] DateTime? recordedAt = null)
        {
            var history = await _allocationRepository.SaveSnapshotAsync(accountId, recordedAt ?? DateTime.Now);
            return Ok(history);
        }

        [HttpPut("allocation/{historyId:guid}")]
        public async Task<ActionResult<PortfolioAllocationHistory>> UpdateAllocationHistoryTime(Guid historyId, [FromBody] UpdateHistoryTimeDTO dto)
        {
            var history = await _allocationRepository.UpdateAllocationHistoryTimeAsync(historyId, dto.RecordedAt);
            if (history == null) return NotFound();
            return Ok(history);
        }

        [HttpPut("asset/{historyId:guid}/full")]
        public async Task<ActionResult<AssetHistory>> UpdateAssetHistory(Guid historyId, [FromBody] UpdateAssetHistoryDTO dto)
        {
            var history = await _assetsRepository.UpdateAssetHistoryAsync(historyId, dto);
            if (history == null) return NotFound();
            return Ok(history);
        }

        [HttpPut("allocation/{historyId:guid}/full")]
        public async Task<ActionResult<PortfolioAllocationHistory>> UpdateAllocationHistory(Guid historyId, [FromBody] UpdateAllocationHistoryDTO dto)
        {
            var history = await _allocationRepository.UpdateAllocationHistoryAsync(historyId, dto);
            if (history == null) return NotFound();
            return Ok(history);
        }

        [HttpPost("allocation/restore/{historyId:guid}")]
        public async Task<ActionResult> RestoreAllocationFromHistory(Guid historyId)
        {
            var success = await _allocationRepository.RestoreFromHistoryAsync(historyId);
            if (!success) return NotFound();
            return Ok(new { message = "Khôi phục phân bổ thành công" });
        }

        [HttpDelete("allocation/{historyId:guid}")]
        public async Task<ActionResult> DeleteAllocationHistory(Guid historyId)
        {
            var success = await _allocationRepository.DeleteHistoryAsync(historyId);
            if (!success) return NotFound();
            return Ok(new { message = "Xóa lịch sử phân bổ thành công" });
        }
    }
}
