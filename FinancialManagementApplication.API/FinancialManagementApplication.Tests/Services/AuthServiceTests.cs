using FinancialManagementApplication.Application.Interface.Repositories;
using FinancialManagementApplication.Application.DTOs.Auth;
using FinancialManagementApplication.Application.Interface.Securitiy;
using FinancialManagementApplication.Application.Services;
using FinancialManagementApplication.Domain.Entities;
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
            Username = "testuser",
            Email = "test@example.com",
            Password = "SecurePass123!",
            DisplayName = "Test User"
        };
        var expectedToken = "jwt-token-12345";

        _repoMock
            .Setup(r => r.GetByUsernameAsync(request.Username))
            .ReturnsAsync((Account?)null);

        _jwtMock
            .Setup(j => j.Generate(It.IsAny<Account>()))
            .Returns(expectedToken);

        var result = await _sut.RegisterAsync(request);

        result.Should().NotBeNull();
        result.Token.Should().Be(expectedToken);
        result.Username.Should().Be(request.Username);
        result.Email.Should().Be(request.Email);
        result.DisplayName.Should().Be(request.DisplayName);
        result.CreateAt.Should().NotBe(default);

        _repoMock.Verify(r => r.AddAsync(It.Is<Account>(a =>
            a.Email == request.Email &&
            a.Username == request.Username &&
            a.DisplayName == request.DisplayName &&
            !string.IsNullOrEmpty(a.PasswordHash)
        )), Times.Once);
    }

    [Fact]
    public async Task RegisterAsync_WithExistingEmail_ThrowsException()
    {
        var request = new RegisterRequest
        {
            Username = "existinguser",
            Email = "existing@example.com",
            Password = "SecurePass123!",
            DisplayName = "Existing User"
        };
        var existingAccount = new Account
        {
            AccountID = Guid.NewGuid(),
            Username = request.Username,
            Email = request.Email,
            PasswordHash = "hash",
            DisplayName = "Existing"
        };

        _repoMock
            .Setup(r => r.GetByUsernameAsync(request.Username))
            .ReturnsAsync(existingAccount);

        var act = () => _sut.RegisterAsync(request);

        await act.Should().ThrowAsync<Exception>()
            .WithMessage("Username already exists");

        _repoMock.Verify(r => r.AddAsync(It.IsAny<Account>()), Times.Never);
        _jwtMock.Verify(j => j.Generate(It.IsAny<Account>()), Times.Never);
    }

    [Fact]
    public async Task RegisterAsync_ShouldHashPassword()
    {
        var request = new RegisterRequest
        {
            Username = "testuser",
            Email = "test@example.com",
            Password = "MySecretPassword",
            DisplayName = "Test User"
        };

        _repoMock
            .Setup(r => r.GetByUsernameAsync(request.Username))
            .ReturnsAsync((Account?)null);

        _jwtMock
            .Setup(j => j.Generate(It.IsAny<Account>()))
            .Returns("token");

        await _sut.RegisterAsync(request);

        _repoMock.Verify(r => r.AddAsync(It.Is<Account>(a =>
            a.PasswordHash != request.Password &&
            a.PasswordHash.StartsWith("$2")
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
            Username = "testuser",
            Email = "user@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            DisplayName = "Test User"
        };
        var request = new LoginRequest
        {
            Username = "testuser",
            Password = password
        };
        var expectedToken = "jwt-token-67890";

        _repoMock
            .Setup(r => r.GetByUsernameAsync(request.Username))
            .ReturnsAsync(account);

        _jwtMock
            .Setup(j => j.Generate(account))
            .Returns(expectedToken);

        var result = await _sut.LoginAsync(request);

        result.Should().NotBeNull();
        result.Token.Should().Be(expectedToken);
        result.Username.Should().Be(account.Username);
        result.DisplayName.Should().Be(account.DisplayName);
        result.AccountId.Should().Be(accountId);
    }

    [Fact]
    public async Task LoginAsync_WithInvalidEmail_ThrowsException()
    {
        var request = new LoginRequest
        {
            Username = "nonexistentuser",
            Password = "SomePassword123!"
        };

        _repoMock
            .Setup(r => r.GetByUsernameAsync(request.Username))
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
            Username = "testuser",
            Email = "user@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("CorrectPassword123!"),
            DisplayName = "Test User"
        };
        var request = new LoginRequest
        {
            Username = "testuser",
            Password = "WrongPassword456!"
        };

        _repoMock
            .Setup(r => r.GetByUsernameAsync(request.Username))
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
            Username = "profileuser",
            Email = "profile@example.com",
            PasswordHash = "hash",
            DisplayName = "Profile User",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _repoMock
            .Setup(r => r.GetByIdAsync(accountId))
            .ReturnsAsync(account);

        var result = await _sut.GetProfileAsync(accountId);

        result.Should().NotBeNull();
        result.AccountId.Should().Be(accountId);
        result.Username.Should().Be("profileuser");
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
            Username = "updateuser",
            Email = "update@example.com",
            PasswordHash = "hash",
            DisplayName = "Old Name",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
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
            a.DisplayName == "New Name"
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
            Username = "passuser",
            Email = "pass@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(currentPassword),
            DisplayName = "Pass User",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
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
            a.PasswordHash != currentPassword &&
            a.PasswordHash.StartsWith("$2")
        )), Times.Once);
    }

    [Fact]
    public async Task ChangePasswordAsync_WithWrongCurrentPassword_ThrowsException()
    {
        var accountId = Guid.NewGuid();
        var account = new Account
        {
            AccountID = accountId,
            Username = "passuser",
            Email = "pass@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("CorrectPass123!"),
            DisplayName = "Pass User",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
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
