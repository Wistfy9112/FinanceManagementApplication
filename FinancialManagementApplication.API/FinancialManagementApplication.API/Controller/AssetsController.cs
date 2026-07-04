using FinancialManagementApplication.Application.DTOs.Asset;
using FinancialManagementApplication.Application.Interface.Repositories;
using FinancialManagementApplication.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace FinancialManagementApplication.API.Controller
{
    [ApiController]
    [Route("api/assets")]
    public class AssetsController : ControllerBase
    {
        private readonly IAssetsRepository _assetsRepository;

        public AssetsController(IAssetsRepository assetsRepository)
        {
            _assetsRepository = assetsRepository;
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetAsset(Guid id)
        {
            var asset = await _assetsRepository.GetAsync(id);
            if (asset == null)
            {
                return NotFound();
            }
            return Ok(asset);
        }

        [HttpGet("user/{userId:guid}")]
        public async Task<ActionResult<IEnumerable<AssetDTO>>> GetAllAssets(Guid userId)
        {
            var assets = await _assetsRepository.GetAllByAccountIdAsync(userId);
            return Ok(assets);
        }

        [HttpPost]
        public async Task<ActionResult<AssetDTO>> CreateAsset(CreateAssetDTO dto)
        {
            var asset = new Assets
            {
                Id = Guid.NewGuid(),
                AccountID = dto.AccountID,
                Name = dto.Name,
                InitialValue = dto.InitialValue,
                CurrentValue = dto.CurrentValue,
                Type = dto.Type,
                CreatedAt = dto.CreatedAt ?? DateTime.Now
            };
            var result = await _assetsRepository.CreateAsync(asset);
            return CreatedAtAction(nameof(GetAsset), new { id = result.Id }, result);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateAsset(Guid id, UpdateAssetDTO dto)
        {
            var asset = await _assetsRepository.GetAsync(id);
            if (asset == null) return NotFound();

            asset.Name = dto.Name;
            asset.InitialValue = dto.InitialValue;
            asset.CurrentValue = dto.CurrentValue;
            asset.Type = dto.Type;

            await _assetsRepository.UpdateAsync(asset);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAsset(Guid id)
        {
            var asset = await _assetsRepository.GetAsync(id);
            if (asset == null)
            {
                return NotFound();
            }
            await _assetsRepository.DeleteAsync(id);
            return NoContent();
        }

        [HttpPut("reorder")]
        public async Task<IActionResult> ReorderAssets([FromBody] ReorderAssetDTO dto)
        {
            if (dto?.Items == null || dto.Items.Count == 0)
                return BadRequest(new { message = "Invalid reorder data" });
            await _assetsRepository.ReorderAsync(dto.Items);
            return Ok(new { message = "Reorder successful" });
        }
    }
}
