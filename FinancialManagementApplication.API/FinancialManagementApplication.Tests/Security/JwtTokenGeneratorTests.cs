using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using FinanceManagementApplication.Domain.Entities;
using FinancialManagementApplication.Application.Interface.Securitiy;
using FinancialManagementApplication.Infrastructure.Security;
using FluentAssertions;
using Microsoft.Extensions.Configuration;

namespace FinancialManagementApplication.Tests.Security;

public class JwtTokenGeneratorTests
{
    private readonly IConfiguration _configuration;
    private readonly IJwtTokenGenerator _sut;

    public JwtTokenGeneratorTests()
    {
        var configData = new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "This-Is-A-Very-Long-Secret-Key-For-Testing-1234567890!",
            ["Jwt:Issuer"] = "TestIssuer",
            ["Jwt:Audience"] = "TestAudience"
        };
        _configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configData)
            .Build();
        _sut = new JwtTokenGenerator(_configuration);
    }

    [Fact]
    public void Generate_ShouldReturnNonEmptyToken()
    {
        var account = new Account
        {
            AccountID = Guid.NewGuid(),
            email = "test@example.com",
            displayName = "Test User"
        };

        var token = _sut.Generate(account);

        token.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public void Generate_ShouldContainCorrectClaims()
    {
        var accountId = Guid.NewGuid();
        var account = new Account
        {
            AccountID = accountId,
            email = "claims@example.com",
            displayName = "Claims Test"
        };

        var token = _sut.Generate(account);
        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(token);

        jwtToken.Claims.Should().Contain(c =>
            c.Type == ClaimTypes.NameIdentifier && c.Value == accountId.ToString());
        jwtToken.Claims.Should().Contain(c =>
            c.Type == ClaimTypes.Email && c.Value == "claims@example.com");
        jwtToken.Claims.Should().Contain(c =>
            c.Type == ClaimTypes.Name && c.Value == "Claims Test");
    }

    [Fact]
    public void Generate_ShouldUseCorrectIssuerAndAudience()
    {
        var account = new Account
        {
            AccountID = Guid.NewGuid(),
            email = "issuer@example.com",
            displayName = "Issuer Test"
        };

        var token = _sut.Generate(account);
        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(token);

        jwtToken.Issuer.Should().Be("TestIssuer");
        jwtToken.Audiences.Should().Contain("TestAudience");
    }

    [Fact]
    public void Generate_ShouldSetTokenExpiryWithin2Hours()
    {
        var account = new Account
        {
            AccountID = Guid.NewGuid(),
            email = "expiry@example.com",
            displayName = "Expiry Test"
        };

        var token = _sut.Generate(account);
        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(token);

        jwtToken.ValidTo.Should().BeCloseTo(
            DateTime.UtcNow.AddHours(2),
            TimeSpan.FromMinutes(1));
    }

    [Fact]
    public void Generate_ShouldHandleEmptyDisplayName()
    {
        var account = new Account
        {
            AccountID = Guid.NewGuid(),
            email = "empty@example.com",
            displayName = null
        };

        var token = _sut.Generate(account);
        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(token);

        jwtToken.Claims.Should().Contain(c =>
            c.Type == ClaimTypes.Name && c.Value == string.Empty);
    }
}
