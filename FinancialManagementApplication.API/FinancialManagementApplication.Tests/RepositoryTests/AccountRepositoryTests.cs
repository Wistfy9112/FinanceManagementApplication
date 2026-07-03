using FinancialManagementApplication.Domain.Entities;
using FinancialManagementApplication.Infrastructure.Repositories;
using FinancialManagementApplication.Tests.Helpers;
using FluentAssertions;

namespace FinancialManagementApplication.Tests.RepositoryTests;

public class AccountRepositoryTests
{
    [Fact]
    public async Task AddAsync_ShouldCreateAccount()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new AccountRepository(context);
        var account = new Account
        {
            AccountID = Guid.NewGuid(),
            Username = "testuser",
            Email = "test@example.com",
            PasswordHash = "hash",
            DisplayName = "Test User",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await repo.AddAsync(account);

        var fetched = await repo.GetByEmailAsync("test@example.com");
        fetched.Should().NotBeNull();
        fetched!.Email.Should().Be("test@example.com");
        fetched.DisplayName.Should().Be("Test User");
    }

    [Fact]
    public async Task GetByIdAsync_ShouldReturnAccount()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new AccountRepository(context);
        var id = Guid.NewGuid();
        var account = new Account
        {
            AccountID = id,
            Username = "finduser",
            Email = "find@example.com",
            PasswordHash = "hash",
            DisplayName = "Find Me",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await repo.AddAsync(account);

        var result = await repo.GetByIdAsync(id);

        result.Should().NotBeNull();
        result!.Email.Should().Be("find@example.com");
        result.DisplayName.Should().Be("Find Me");
    }

    [Fact]
    public async Task GetByIdAsync_ShouldReturnNull_WhenNotFound()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new AccountRepository(context);

        var result = await repo.GetByIdAsync(Guid.NewGuid());

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByEmailAsync_ShouldReturnAccount()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new AccountRepository(context);
        var account = new Account
        {
            AccountID = Guid.NewGuid(),
            Username = "emailuser",
            Email = "email@example.com",
            PasswordHash = "hash",
            DisplayName = "Email Test",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await repo.AddAsync(account);

        var result = await repo.GetByEmailAsync("email@example.com");

        result.Should().NotBeNull();
        result!.DisplayName.Should().Be("Email Test");
    }

    [Fact]
    public async Task GetByEmailAsync_ShouldReturnNull_WhenNotFound()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new AccountRepository(context);

        var result = await repo.GetByEmailAsync("missing@example.com");

        result.Should().BeNull();
    }

    [Fact]
    public async Task UpdateAsync_ShouldUpdateAccount()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new AccountRepository(context);
        var account = new Account
        {
            AccountID = Guid.NewGuid(),
            Username = "updateuser",
            Email = "update@example.com",
            PasswordHash = "hash",
            DisplayName = "Original",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await repo.AddAsync(account);

        account.DisplayName = "Updated";
        account.Email = "updated@example.com";
        await repo.UpdateAsync(account);

        var fetched = await repo.GetByIdAsync(account.AccountID);
        fetched.Should().NotBeNull();
        fetched!.DisplayName.Should().Be("Updated");
        fetched.Email.Should().Be("updated@example.com");
    }
}
