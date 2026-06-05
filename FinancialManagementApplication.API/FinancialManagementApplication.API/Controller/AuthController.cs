using FinancialManagementApplication.Application.DTOs.Auth;
using FinancialManagementApplication.Application.Services;
using Microsoft.AspNetCore.Mvc;
using LoginRequest = FinancialManagementApplication.Application.DTOs.Auth.LoginRequest;
using RegisterRequest = FinancialManagementApplication.Application.DTOs.Auth.RegisterRequest;

namespace FinancialManagementApplication.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        try
        {
            var result = await _authService.RegisterAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            var result = await _authService.LoginAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }

    [HttpGet("profile/{accountId:guid}")]
    public async Task<IActionResult> GetProfile(Guid accountId)
    {
        try
        {
            var result = await _authService.GetProfileAsync(accountId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }

    [HttpPut("profile/{accountId:guid}")]
    public async Task<IActionResult> UpdateProfile(Guid accountId, [FromBody] UpdateProfileDTO request)
    {
        try
        {
            var result = await _authService.UpdateProfileAsync(accountId, request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }

    [HttpPut("change-password/{accountId:guid}")]
    public async Task<IActionResult> ChangePassword(Guid accountId, [FromBody] ChangePasswordDTO request)
    {
        try
        {
            await _authService.ChangePasswordAsync(accountId, request);
            return Ok(new { Message = "Password changed successfully" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }
}