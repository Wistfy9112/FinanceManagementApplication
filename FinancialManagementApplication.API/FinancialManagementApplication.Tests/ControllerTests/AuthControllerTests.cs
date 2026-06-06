using FinancialManagementApplication.API.Controllers;
using FinancialManagementApplication.Application.DTOs.Auth;
using FinancialManagementApplication.Application.Services;
using FinanceManagementApplication.Application.Interface.Repositories;
using FinancialManagementApplication.Application.Interface.Securitiy;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace FinancialManagementApplication.Tests.ControllerTests;

public class AuthControllerTests
{
    private readonly Mock<IAccountRepository> _repoMock;
    private readonly Mock<IJwtTokenGenerator> _jwtMock;
    private readonly AuthService _authService;
    private readonly AuthController _sut;

    public AuthControllerTests()
    {
        _repoMock = new Mock<IAccountRepository>();
        _jwtMock = new Mock<IJwtTokenGenerator>();
        _authService = new AuthService(_repoMock.Object, _jwtMock.Object);
        _sut = new AuthController(_authService);
    }

    [Fact]
    public async Task GetProfile_WithValidId_ReturnsOk()
    {
        var accountId = Guid.NewGuid();
        var account = new FinanceManagementApplication.Domain.Entities.Account
        {
            AccountID = accountId,
            email = "profile@test.com",
            displayName = "Profile User",
            passwordHash = "hash",
            CreateAt = DateTime.UtcNow,
            UpdateAt = DateTime.UtcNow
        };

        _repoMock
            .Setup(r => r.GetByIdAsync(accountId))
            .ReturnsAsync(account);

        var result = await _sut.GetProfile(accountId);

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var profile = okResult.Value.Should().BeOfType<UserProfileDTO>().Subject;
        profile.Email.Should().Be("profile@test.com");
        profile.DisplayName.Should().Be("Profile User");
    }

    [Fact]
    public async Task GetProfile_WithInvalidId_ReturnsBadRequest()
    {
        _repoMock
            .Setup(r => r.GetByIdAsync(It.IsAny<Guid>()))
            .ReturnsAsync((FinanceManagementApplication.Domain.Entities.Account?)null);

        var result = await _sut.GetProfile(Guid.NewGuid());

        var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.Should().NotBeNull();
    }

    [Fact]
    public async Task UpdateProfile_WithValidData_ReturnsOk()
    {
        var accountId = Guid.NewGuid();
        var account = new FinanceManagementApplication.Domain.Entities.Account
        {
            AccountID = accountId,
            email = "update@test.com",
            displayName = "Old Name",
            passwordHash = "hash",
            CreateAt = DateTime.UtcNow,
            UpdateAt = DateTime.UtcNow
        };

        _repoMock
            .Setup(r => r.GetByIdAsync(accountId))
            .ReturnsAsync(account);

        var dto = new UpdateProfileDTO { DisplayName = "New Name" };
        var result = await _sut.UpdateProfile(accountId, dto);

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var profile = okResult.Value.Should().BeOfType<UserProfileDTO>().Subject;
        profile.DisplayName.Should().Be("New Name");
    }

    [Fact]
    public async Task UpdateProfile_WithInvalidId_ReturnsBadRequest()
    {
        _repoMock
            .Setup(r => r.GetByIdAsync(It.IsAny<Guid>()))
            .ReturnsAsync((FinanceManagementApplication.Domain.Entities.Account?)null);

        var result = await _sut.UpdateProfile(Guid.NewGuid(), new UpdateProfileDTO { DisplayName = "Name" });

        var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.Should().NotBeNull();
    }

    [Fact]
    public async Task ChangePassword_WithValidData_ReturnsOk()
    {
        var accountId = Guid.NewGuid();
        var password = "CurrentPass123!";
        var account = new FinanceManagementApplication.Domain.Entities.Account
        {
            AccountID = accountId,
            email = "pass@test.com",
            displayName = "Pass User",
            passwordHash = BCrypt.Net.BCrypt.HashPassword(password),
            CreateAt = DateTime.UtcNow,
            UpdateAt = DateTime.UtcNow
        };

        _repoMock
            .Setup(r => r.GetByIdAsync(accountId))
            .ReturnsAsync(account);

        var dto = new ChangePasswordDTO
        {
            CurrentPassword = password,
            NewPassword = "NewPass456!"
        };
        var result = await _sut.ChangePassword(accountId, dto);

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(new { Message = "Password changed successfully" });
    }

    [Fact]
    public async Task ChangePassword_WithWrongPassword_ReturnsBadRequest()
    {
        var accountId = Guid.NewGuid();
        var account = new FinanceManagementApplication.Domain.Entities.Account
        {
            AccountID = accountId,
            email = "pass@test.com",
            displayName = "Pass User",
            passwordHash = BCrypt.Net.BCrypt.HashPassword("CorrectPass123!"),
            CreateAt = DateTime.UtcNow,
            UpdateAt = DateTime.UtcNow
        };

        _repoMock
            .Setup(r => r.GetByIdAsync(accountId))
            .ReturnsAsync(account);

        var dto = new ChangePasswordDTO
        {
            CurrentPassword = "WrongPass456!",
            NewPassword = "NewPass789!"
        };
        var result = await _sut.ChangePassword(accountId, dto);

        var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.Should().NotBeNull();
    }
}
