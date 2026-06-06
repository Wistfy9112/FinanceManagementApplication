using FinanceManagementApplication.Domain.Entities;
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
            email = "test@example.com",
            passwordHash = "hash",
            displayName = "Test User",
            CreateAt = DateTime.UtcNow,
            UpdateAt = DateTime.UtcNow
        };

        await repo.AddAsync(account);

        var fetched = await repo.GetByEmailAsync("test@example.com");
        fetched.Should().NotBeNull();
        fetched!.email.Should().Be("test@example.com");
        fetched.displayName.Should().Be("Test User");
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
            email = "find@example.com",
            passwordHash = "hash",
            displayName = "Find Me",
            CreateAt = DateTime.UtcNow,
            UpdateAt = DateTime.UtcNow
        };
        await repo.AddAsync(account);

        var result = await repo.GetByIdAsync(id);

        result.Should().NotBeNull();
        result!.email.Should().Be("find@example.com");
        result.displayName.Should().Be("Find Me");
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
            email = "email@example.com",
            passwordHash = "hash",
            displayName = "Email Test",
            CreateAt = DateTime.UtcNow,
            UpdateAt = DateTime.UtcNow
        };
        await repo.AddAsync(account);

        var result = await repo.GetByEmailAsync("email@example.com");

        result.Should().NotBeNull();
        result!.displayName.Should().Be("Email Test");
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
            email = "update@example.com",
            passwordHash = "hash",
            displayName = "Original",
            CreateAt = DateTime.UtcNow,
            UpdateAt = DateTime.UtcNow
        };
        await repo.AddAsync(account);

        account.displayName = "Updated";
        account.email = "updated@example.com";
        await repo.UpdateAsync(account);

        var fetched = await repo.GetByIdAsync(account.AccountID);
        fetched.Should().NotBeNull();
        fetched!.displayName.Should().Be("Updated");
        fetched.email.Should().Be("updated@example.com");
    }
}
