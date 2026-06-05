using FinancialManagementApplication.Domain.Entities;
using FinancialManagementApplication.Infrastructure.Repositories;
using FinancialManagementApplication.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace FinancialManagementApplication.Tests.RepositoryTests;

public class PortfolioRepositoryTests
{
    [Fact]
    public async Task CreateAsync_ShouldCreateAndReturnPortfolio()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new PortfolioRepository(context);
        var portfolio = new Portfolio
        {
            Id = Guid.NewGuid(),
            AccountID = Guid.NewGuid(),
            Name = "Test Portfolio",
            Amount = 100_000_000
        };

        var result = await repo.CreateAsync(portfolio);

        result.Should().NotBeNull();
        result.Id.Should().Be(portfolio.Id);
        result.Name.Should().Be("Test Portfolio");
    }

    [Fact]
    public async Task GetAsync_ShouldReturnPortfolioById()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new PortfolioRepository(context);
        var portfolio = new Portfolio
        {
            Id = Guid.NewGuid(),
            AccountID = Guid.NewGuid(),
            Name = "Get Test",
            Amount = 50_000_000
        };
        await repo.CreateAsync(portfolio);

        var result = await repo.GetAsync(portfolio.Id);

        result.Should().NotBeNull();
        result!.Id.Should().Be(portfolio.Id);
        result.Name.Should().Be("Get Test");
    }

    [Fact]
    public async Task GetAsync_ShouldReturnNull_WhenNotFound()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new PortfolioRepository(context);

        var result = await repo.GetAsync(Guid.NewGuid());

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByAccountIdAsync_ShouldReturnPortfolio_WhenExists()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new PortfolioRepository(context);
        var accountId = Guid.NewGuid();
        var portfolio = new Portfolio
        {
            Id = Guid.NewGuid(),
            AccountID = accountId,
            Name = "Account Portfolio",
            Amount = 75_000_000
        };
        await repo.CreateAsync(portfolio);

        var result = await repo.GetByAccountIdAsync(accountId);

        result.Should().NotBeNull();
        result!.Id.Should().Be(portfolio.Id);
        result.AccountID.Should().Be(accountId);
    }

    [Fact]
    public async Task GetByAccountIdAsync_ShouldReturnNull_WhenNoPortfolio()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new PortfolioRepository(context);

        var result = await repo.GetByAccountIdAsync(Guid.NewGuid());

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByAccountIdAsync_ShouldReturnCorrectPortfolio_WhenMultipleAccounts()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new PortfolioRepository(context);
        var accountId1 = Guid.NewGuid();
        var accountId2 = Guid.NewGuid();
        context.Portfolio.AddRange(
            new Portfolio { Id = Guid.NewGuid(), AccountID = accountId1, Name = "Portfolio 1", Amount = 100_000 },
            new Portfolio { Id = Guid.NewGuid(), AccountID = accountId2, Name = "Portfolio 2", Amount = 200_000 }
        );
        await context.SaveChangesAsync();

        var result = await repo.GetByAccountIdAsync(accountId1);

        result.Should().NotBeNull();
        result!.Name.Should().Be("Portfolio 1");
    }

    [Fact]
    public async Task GetAllByAccountIdAsync_ShouldReturnAllPortfoliosForAccount()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new PortfolioRepository(context);
        var accountId = Guid.NewGuid();
        var portfolio1 = new Portfolio
        {
            Id = Guid.NewGuid(),
            AccountID = accountId,
            Name = "Portfolio A",
            Amount = 100_000
        };
        var portfolio2 = new Portfolio
        {
            Id = Guid.NewGuid(),
            AccountID = accountId,
            Name = "Portfolio B",
            Amount = 200_000
        };
        var other = new Portfolio
        {
            Id = Guid.NewGuid(),
            AccountID = Guid.NewGuid(),
            Name = "Other",
            Amount = 300_000
        };
        context.Portfolio.AddRange(portfolio1, portfolio2, other);
        await context.SaveChangesAsync();

        var results = await repo.GetAllByAccountIdAsync(accountId);

        results.Should().HaveCount(2);
    }

    [Fact]
    public async Task UpdateAsync_ShouldUpdatePortfolio()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new PortfolioRepository(context);
        var portfolio = new Portfolio
        {
            Id = Guid.NewGuid(),
            AccountID = Guid.NewGuid(),
            Name = "Original",
            Amount = 1000
        };
        await repo.CreateAsync(portfolio);

        portfolio.Name = "Updated";
        portfolio.Amount = 2000;
        var result = await repo.UpdateAsync(portfolio);

        result.Name.Should().Be("Updated");
        result.Amount.Should().Be(2000);

        var fetched = await repo.GetAsync(portfolio.Id);
        fetched!.Name.Should().Be("Updated");
    }

    [Fact]
    public async Task DeleteAsync_ShouldReturnFalse_InMemory()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new PortfolioRepository(context);
        var portfolio = new Portfolio
        {
            Id = Guid.NewGuid(),
            AccountID = Guid.NewGuid(),
            Name = "To Delete",
            Amount = 1000
        };
        await repo.CreateAsync(portfolio);

        var deleted = await repo.DeleteAsync(portfolio.Id);

        deleted.Should().BeFalse();
    }
}
