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
            var assets = await _assetsRepository.GetAllByUserIdAsync(userId);
            return Ok(assets);
        }

        [HttpPost]
        public async Task<ActionResult<AssetDTO>> CreateAsset(Assets asset)
        {
            var result = await _assetsRepository.CreateAsync(asset);
            return CreatedAtAction(nameof(GetAsset), new { id = result.Id }, result);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateAsset(Guid id, Assets asset)
        {
            if (id != asset.Id)
            {
                return BadRequest();
            }

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
    }
}
