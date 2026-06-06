using FinanceManagementApplication.Application.Interface.Repositories;
using FinancialManagementApplication.Application.DTOs.Auth;
using FinancialManagementApplication.Application.Interface.Securitiy;
using FinancialManagementApplication.Application.Services;
using FinanceManagementApplication.Domain.Entities;
using FluentAssertions;
using Moq;

namespace FinancialManagementApplication.Tests.Services;

public class AuthServiceTests
{
    private readonly Mock<IAccountRepository> _repoMock;
    private readonly Mock<IJwtTokenGenerator> _jwtMock;
    private readonly AuthService _sut;

    public AuthServiceTests()
    {
        _repoMock = new Mock<IAccountRepository>();
        _jwtMock = new Mock<IJwtTokenGenerator>();
        _sut = new AuthService(_repoMock.Object, _jwtMock.Object);
    }

    #region Register

    [Fact]
    public async Task RegisterAsync_WithValidRequest_ReturnsAuthResponseWithToken()
    {
        var request = new RegisterRequest
        {
            Email = "test@example.com",
            Password = "SecurePass123!",
            DisplayName = "Test User"
        };
        var expectedToken = "jwt-token-12345";

        _repoMock
            .Setup(r => r.GetByEmailAsync(request.Email))
            .ReturnsAsync((Account?)null);

        _jwtMock
            .Setup(j => j.Generate(It.IsAny<Account>()))
            .Returns(expectedToken);

        var result = await _sut.RegisterAsync(request);

        result.Should().NotBeNull();
        result.Token.Should().Be(expectedToken);
        result.Email.Should().Be(request.Email);
        result.DisplayName.Should().Be(request.DisplayName);
        result.CreateAt.Should().NotBe(default);

        _repoMock.Verify(r => r.AddAsync(It.Is<Account>(a =>
            a.email == request.Email &&
            a.displayName == request.DisplayName &&
            !string.IsNullOrEmpty(a.passwordHash)
        )), Times.Once);
    }

    [Fact]
    public async Task RegisterAsync_WithExistingEmail_ThrowsException()
    {
        var request = new RegisterRequest
        {
            Email = "existing@example.com",
            Password = "SecurePass123!",
            DisplayName = "Existing User"
        };
        var existingAccount = new Account
        {
            AccountID = Guid.NewGuid(),
            email = request.Email,
            passwordHash = "hash",
            displayName = "Existing"
        };

        _repoMock
            .Setup(r => r.GetByEmailAsync(request.Email))
            .ReturnsAsync(existingAccount);

        var act = () => _sut.RegisterAsync(request);

        await act.Should().ThrowAsync<Exception>()
            .WithMessage("Email already exists");

        _repoMock.Verify(r => r.AddAsync(It.IsAny<Account>()), Times.Never);
        _jwtMock.Verify(j => j.Generate(It.IsAny<Account>()), Times.Never);
    }

    [Fact]
    public async Task RegisterAsync_ShouldHashPassword()
    {
        var request = new RegisterRequest
        {
            Email = "test@example.com",
            Password = "MySecretPassword",
            DisplayName = "Test User"
        };

        _repoMock
            .Setup(r => r.GetByEmailAsync(request.Email))
            .ReturnsAsync((Account?)null);

        _jwtMock
            .Setup(j => j.Generate(It.IsAny<Account>()))
            .Returns("token");

        await _sut.RegisterAsync(request);

        _repoMock.Verify(r => r.AddAsync(It.Is<Account>(a =>
            a.passwordHash != request.Password &&
            a.passwordHash.StartsWith("$2")
        )), Times.Once);
    }

    #endregion

    #region Login

    [Fact]
    public async Task LoginAsync_WithValidCredentials_ReturnsAuthResponseWithToken()
    {
        var password = "CorrectPassword123!";
        var accountId = Guid.NewGuid();
        var account = new Account
        {
            AccountID = accountId,
            email = "user@example.com",
            passwordHash = BCrypt.Net.BCrypt.HashPassword(password),
            displayName = "Test User"
        };
        var request = new LoginRequest
        {
            Email = "user@example.com",
            Password = password
        };
        var expectedToken = "jwt-token-67890";

        _repoMock
            .Setup(r => r.GetByEmailAsync(request.Email))
            .ReturnsAsync(account);

        _jwtMock
            .Setup(j => j.Generate(account))
            .Returns(expectedToken);

        var result = await _sut.LoginAsync(request);

        result.Should().NotBeNull();
        result.Token.Should().Be(expectedToken);
        result.Email.Should().Be(account.email);
        result.DisplayName.Should().Be(account.displayName);
        result.AccountId.Should().Be(accountId);
    }

    [Fact]
    public async Task LoginAsync_WithInvalidEmail_ThrowsException()
    {
        var request = new LoginRequest
        {
            Email = "nonexistent@example.com",
            Password = "SomePassword123!"
        };

        _repoMock
            .Setup(r => r.GetByEmailAsync(request.Email))
            .ReturnsAsync((Account?)null);

        var act = () => _sut.LoginAsync(request);

        await act.Should().ThrowAsync<Exception>()
            .WithMessage("Invalid credentials");

        _jwtMock.Verify(j => j.Generate(It.IsAny<Account>()), Times.Never);
    }

    [Fact]
    public async Task LoginAsync_WithWrongPassword_ThrowsException()
    {
        var account = new Account
        {
            AccountID = Guid.NewGuid(),
            email = "user@example.com",
            passwordHash = BCrypt.Net.BCrypt.HashPassword("CorrectPassword123!"),
            displayName = "Test User"
        };
        var request = new LoginRequest
        {
            Email = "user@example.com",
            Password = "WrongPassword456!"
        };

        _repoMock
            .Setup(r => r.GetByEmailAsync(request.Email))
            .ReturnsAsync(account);

        var act = () => _sut.LoginAsync(request);

        await act.Should().ThrowAsync<Exception>()
            .WithMessage("Invalid credentials");

        _jwtMock.Verify(j => j.Generate(It.IsAny<Account>()), Times.Never);
    }

    #endregion

    #region GetProfile

    [Fact]
    public async Task GetProfileAsync_WithValidId_ReturnsProfile()
    {
        var accountId = Guid.NewGuid();
        var account = new Account
        {
            AccountID = accountId,
            email = "profile@example.com",
            passwordHash = "hash",
            displayName = "Profile User",
            CreateAt = DateTime.UtcNow,
            UpdateAt = DateTime.UtcNow
        };

        _repoMock
            .Setup(r => r.GetByIdAsync(accountId))
            .ReturnsAsync(account);

        var result = await _sut.GetProfileAsync(accountId);

        result.Should().NotBeNull();
        result.AccountId.Should().Be(accountId);
        result.Email.Should().Be("profile@example.com");
        result.DisplayName.Should().Be("Profile User");
    }

    [Fact]
    public async Task GetProfileAsync_WithInvalidId_ThrowsException()
    {
        _repoMock
            .Setup(r => r.GetByIdAsync(It.IsAny<Guid>()))
            .ReturnsAsync((Account?)null);

        var act = () => _sut.GetProfileAsync(Guid.NewGuid());

        await act.Should().ThrowAsync<Exception>()
            .WithMessage("Account not found");
    }

    #endregion

    #region UpdateProfile

    [Fact]
    public async Task UpdateProfileAsync_WithValidId_UpdatesDisplayName()
    {
        var accountId = Guid.NewGuid();
        var account = new Account
        {
            AccountID = accountId,
            email = "update@example.com",
            passwordHash = "hash",
            displayName = "Old Name",
            CreateAt = DateTime.UtcNow,
            UpdateAt = DateTime.UtcNow
        };
        var dto = new UpdateProfileDTO { DisplayName = "New Name" };

        _repoMock
            .Setup(r => r.GetByIdAsync(accountId))
            .ReturnsAsync(account);

        var result = await _sut.UpdateProfileAsync(accountId, dto);

        result.Should().NotBeNull();
        result.DisplayName.Should().Be("New Name");
        result.AccountId.Should().Be(accountId);
        _repoMock.Verify(r => r.UpdateAsync(It.Is<Account>(a =>
            a.displayName == "New Name"
        )), Times.Once);
    }

    [Fact]
    public async Task UpdateProfileAsync_WithInvalidId_ThrowsException()
    {
        _repoMock
            .Setup(r => r.GetByIdAsync(It.IsAny<Guid>()))
            .ReturnsAsync((Account?)null);

        var act = () => _sut.UpdateProfileAsync(Guid.NewGuid(), new UpdateProfileDTO { DisplayName = "Name" });

        await act.Should().ThrowAsync<Exception>()
            .WithMessage("Account not found");
    }

    #endregion

    #region ChangePassword

    [Fact]
    public async Task ChangePasswordAsync_WithValidCredentials_ChangesPassword()
    {
        var accountId = Guid.NewGuid();
        var currentPassword = "OldPass123!";
        var account = new Account
        {
            AccountID = accountId,
            email = "pass@example.com",
            passwordHash = BCrypt.Net.BCrypt.HashPassword(currentPassword),
            displayName = "Pass User",
            CreateAt = DateTime.UtcNow,
            UpdateAt = DateTime.UtcNow
        };
        var dto = new ChangePasswordDTO
        {
            CurrentPassword = currentPassword,
            NewPassword = "NewPass456!"
        };

        _repoMock
            .Setup(r => r.GetByIdAsync(accountId))
            .ReturnsAsync(account);

        await _sut.ChangePasswordAsync(accountId, dto);

        _repoMock.Verify(r => r.UpdateAsync(It.Is<Account>(a =>
            a.passwordHash != currentPassword &&
            a.passwordHash.StartsWith("$2")
        )), Times.Once);
    }

    [Fact]
    public async Task ChangePasswordAsync_WithWrongCurrentPassword_ThrowsException()
    {
        var accountId = Guid.NewGuid();
        var account = new Account
        {
            AccountID = accountId,
            email = "pass@example.com",
            passwordHash = BCrypt.Net.BCrypt.HashPassword("CorrectPass123!"),
            displayName = "Pass User",
            CreateAt = DateTime.UtcNow,
            UpdateAt = DateTime.UtcNow
        };
        var dto = new ChangePasswordDTO
        {
            CurrentPassword = "WrongPass456!",
            NewPassword = "NewPass789!"
        };

        _repoMock
            .Setup(r => r.GetByIdAsync(accountId))
            .ReturnsAsync(account);

        var act = () => _sut.ChangePasswordAsync(accountId, dto);

        await act.Should().ThrowAsync<Exception>()
            .WithMessage("Current password is incorrect");

        _repoMock.Verify(r => r.UpdateAsync(It.IsAny<Account>()), Times.Never);
    }

    [Fact]
    public async Task ChangePasswordAsync_WithInvalidId_ThrowsException()
    {
        _repoMock
            .Setup(r => r.GetByIdAsync(It.IsAny<Guid>()))
            .ReturnsAsync((Account?)null);

        var act = () => _sut.ChangePasswordAsync(Guid.NewGuid(), new ChangePasswordDTO
        {
            CurrentPassword = "old",
            NewPassword = "new"
        });

        await act.Should().ThrowAsync<Exception>()
            .WithMessage("Account not found");
    }

    #endregion
}
