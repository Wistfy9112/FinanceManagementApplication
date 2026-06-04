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
}
