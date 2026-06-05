using FinancialManagementApplication.Infrastructure.Security;
using FluentAssertions;

namespace FinancialManagementApplication.Tests.Security;

public class PasswordHasherTests
{
    private readonly PasswordHasher _sut;

    public PasswordHasherTests()
    {
        _sut = new PasswordHasher();
    }

    [Fact]
    public void Hash_ShouldReturnNonEmptyString()
    {
        var hash = _sut.Hash("myPassword123");

        hash.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public void Hash_ShouldReturnBase64EncodedString()
    {
        var hash = _sut.Hash("myPassword123");

        hash.Should().StartWith("$2");
    }

    [Fact]
    public void Hash_ShouldProduceDifferentHashesForSamePassword()
    {
        var password = "samePassword";

        var hash1 = _sut.Hash(password);
        var hash2 = _sut.Hash(password);

        hash1.Should().NotBe(hash2);
    }

    [Fact]
    public void Verify_WithCorrectPassword_ShouldReturnTrue()
    {
        var password = "correctPassword";
        var hash = _sut.Hash(password);

        var result = _sut.Verify(password, hash);

        result.Should().BeTrue();
    }

    [Fact]
    public void Verify_WithIncorrectPassword_ShouldReturnFalse()
    {
        var hash = _sut.Hash("realPassword");

        var result = _sut.Verify("wrongPassword", hash);

        result.Should().BeFalse();
    }

    [Fact]
    public void Verify_WithEmptyPassword_ShouldReturnFalse()
    {
        var hash = _sut.Hash("somePassword");

        var result = _sut.Verify("", hash);

        result.Should().BeFalse();
    }

    [Fact]
    public void Verify_WithNullPassword_ShouldThrowArgumentNullException()
    {
        var hash = _sut.Hash("somePassword");

        var act = () => _sut.Verify(null!, hash);

        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void Verify_WithInvalidHash_ShouldThrowSaltParseException()
    {
        var act = () => _sut.Verify("password", "invalid_hash");

        act.Should().Throw<Exception>();
    }
}
