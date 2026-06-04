using FinancialManagementApplication.Domain.Entities;
using FinancialManagementApplication.Domain.Enums;
using FinancialManagementApplication.Infrastructure.Repositories;
using FinancialManagementApplication.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace FinancialManagementApplication.Tests.RepositoryTests;

public class AssetsRepositoryTests
{
    #region Create / Read / Update / Delete

    [Fact]
    public async Task CreateAsync_ShouldCreateAndReturnAsset()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new AssetsRepository(context);
        var asset = new Assets
        {
            Id = Guid.NewGuid(),
            AccountID = Guid.NewGuid(),
            Name = "Savings Account",
            InitialValue = 1_000_000,
            CurrentValue = 1_200_000,
            Type = AssetType.Saving
        };

        var result = await repo.CreateAsync(asset);

        result.Should().NotBeNull();
        result.Id.Should().Be(asset.Id);
        result.Name.Should().Be("Savings Account");
    }

    [Fact]
    public async Task GetAsync_ShouldReturnAssetById()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new AssetsRepository(context);
        var asset = new Assets
        {
            Id = Guid.NewGuid(),
            AccountID = Guid.NewGuid(),
            Name = "Get Test",
            InitialValue = 500_000,
            CurrentValue = 600_000,
            Type = AssetType.Investment
        };
        await repo.CreateAsync(asset);

        var result = await repo.GetAsync(asset.Id);

        result.Should().NotBeNull();
        result!.Id.Should().Be(asset.Id);
        result.Type.Should().Be(AssetType.Investment);
    }

    [Fact]
    public async Task GetAsync_ShouldReturnNull_WhenNotFound()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new AssetsRepository(context);

        var result = await repo.GetAsync(Guid.NewGuid());

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetAllByAccountIdAsync_ShouldReturnAllAssetsForAccount()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new AssetsRepository(context);
        var accountId = Guid.NewGuid();
        var asset1 = new Assets
        {
            Id = Guid.NewGuid(),
            AccountID = accountId,
            Name = "Asset 1",
            InitialValue = 1000,
            CurrentValue = 1100,
            Type = AssetType.Saving
        };
        var asset2 = new Assets
        {
            Id = Guid.NewGuid(),
            AccountID = accountId,
            Name = "Asset 2",
            InitialValue = 2000,
            CurrentValue = 2200,
            Type = AssetType.Expense
        };
        var otherAsset = new Assets
        {
            Id = Guid.NewGuid(),
            AccountID = Guid.NewGuid(),
            Name = "Other",
            InitialValue = 3000,
            CurrentValue = 3300,
            Type = AssetType.Investment
        };
        context.Assets.AddRange(asset1, asset2, otherAsset);
        await context.SaveChangesAsync();

        var results = await repo.GetAllByAccountIdAsync(accountId);

        results.Should().HaveCount(2);
    }

    [Fact]
    public async Task UpdateAsync_ShouldUpdateAsset()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new AssetsRepository(context);
        var asset = new Assets
        {
            Id = Guid.NewGuid(),
            AccountID = Guid.NewGuid(),
            Name = "Original",
            InitialValue = 1000,
            CurrentValue = 1000,
            Type = AssetType.Saving
        };
        await repo.CreateAsync(asset);

        asset.Name = "Updated";
        asset.CurrentValue = 2000;
        var result = await repo.UpdateAsync(asset);

        result.Name.Should().Be("Updated");
        result.CurrentValue.Should().Be(2000);

        var fetched = await repo.GetAsync(asset.Id);
        fetched!.Name.Should().Be("Updated");
    }

    [Fact]
    public async Task DeleteAsync_ShouldRemoveAssetAndReturnTrue()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new AssetsRepository(context);
        var asset = new Assets
        {
            Id = Guid.NewGuid(),
            AccountID = Guid.NewGuid(),
            Name = "To Delete",
            InitialValue = 1000,
            CurrentValue = 1000,
            Type = AssetType.Saving
        };
        await repo.CreateAsync(asset);

        var deleted = await repo.DeleteAsync(asset.Id);

        deleted.Should().BeTrue();
        var fetched = await repo.GetAsync(asset.Id);
        fetched.Should().BeNull();
    }

    [Fact]
    public async Task DeleteAsync_ShouldReturnFalse_WhenNotFound()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new AssetsRepository(context);

        var deleted = await repo.DeleteAsync(Guid.NewGuid());

        deleted.Should().BeFalse();
    }

    [Fact]
    public async Task DeleteAsync_ShouldNullifyPortfolioAllocationReference()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new AssetsRepository(context);
        var assetId = Guid.NewGuid();
        var portfolioId = Guid.NewGuid();
        var portfolio = new Portfolio
        {
            Id = portfolioId,
            AccountID = Guid.NewGuid(),
            Name = "Test Portfolio",
            Amount = 10000
        };
        var asset = new Assets
        {
            Id = assetId,
            AccountID = portfolio.AccountID,
            Name = "Linked Asset",
            InitialValue = 5000,
            CurrentValue = 6000,
            Type = AssetType.Investment
        };
        var allocation = new PortfolioAllocation
        {
            Id = Guid.NewGuid(),
            PortfolioId = portfolioId,
            AssetId = assetId,
            Name = "Allocation",
            FinancialCategory = "Stocks",
            CurrentAmount = 6000,
            TargetPercentage = 60,
            AssetType = AssetType.Investment
        };
        context.Portfolio.Add(portfolio);
        context.Assets.Add(asset);
        context.PortfolioAllocations.Add(allocation);
        await context.SaveChangesAsync();

        await repo.DeleteAsync(assetId);

        var updatedAllocation = await context.PortfolioAllocations.FindAsync(allocation.Id);
        updatedAllocation.Should().NotBeNull();
        updatedAllocation!.AssetId.Should().BeNull();
    }

    #endregion

    #region Snapshot

    [Fact]
    public async Task SaveSnapshotAsync_ShouldCreateSnapshotWithAllAssets()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new AssetsRepository(context);
        var accountId = Guid.NewGuid();
        var asset1 = new Assets
        {
            Id = Guid.NewGuid(),
            AccountID = accountId,
            Name = "Asset A",
            InitialValue = 100_000,
            CurrentValue = 150_000,
            Type = AssetType.Saving
        };
        var asset2 = new Assets
        {
            Id = Guid.NewGuid(),
            AccountID = accountId,
            Name = "Asset B",
            InitialValue = 200_000,
            CurrentValue = 250_000,
            Type = AssetType.Investment
        };
        context.Assets.AddRange(asset1, asset2);
        await context.SaveChangesAsync();

        var history = await repo.SaveSnapshotAsync(accountId);

        history.Should().NotBeNull();
        history.AccountId.Should().Be(accountId);
        history.Details.Should().HaveCount(2);
        history.Details.Should().Contain(d => d.Name == "Asset A");
        history.Details.Should().Contain(d => d.Name == "Asset B");
    }

    [Fact]
    public async Task SaveSnapshotAsync_ShouldCreateEmptySnapshot_WhenNoAssets()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new AssetsRepository(context);

        var history = await repo.SaveSnapshotAsync(Guid.NewGuid());

        history.Should().NotBeNull();
        history.Details.Should().BeEmpty();
    }

    [Fact]
    public async Task GetHistoryAsync_ShouldReturnHistoryOrderedByDateDesc()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new AssetsRepository(context);
        var accountId = Guid.NewGuid();
        var older = new AssetHistory
        {
            Id = Guid.NewGuid(),
            AccountId = accountId,
            RecordedAt = DateTime.UtcNow.AddDays(-2)
        };
        var newer = new AssetHistory
        {
            Id = Guid.NewGuid(),
            AccountId = accountId,
            RecordedAt = DateTime.UtcNow
        };
        context.AssetHistories.AddRange(older, newer);
        await context.SaveChangesAsync();

        var results = await repo.GetHistoryAsync(accountId);

        results.Should().HaveCount(2);
        results.First().Id.Should().Be(newer.Id);
    }

    [Fact]
    public async Task GetSnapshotValuesAsync_ShouldReturnOrderedSnapshots()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new AssetsRepository(context);
        var accountId = Guid.NewGuid();
        var history = new AssetHistory
        {
            Id = Guid.NewGuid(),
            AccountId = accountId,
            RecordedAt = new DateTime(2025, 6, 1)
        };
        history.Details.Add(new AssetHistoryDetail
        {
            Id = Guid.NewGuid(),
            AssetHistoryId = history.Id,
            AssetId = Guid.NewGuid(),
            Name = "Asset",
            InitialValue = 80_000,
            CurrentValue = 100_000,
            Type = "Saving"
        });
        context.AssetHistories.Add(history);
        await context.SaveChangesAsync();

        var snapshots = await repo.GetSnapshotValuesAsync(accountId);

        snapshots.Should().HaveCount(1);
        snapshots.First().TotalValue.Should().Be(100_000);
        snapshots.First().TotalInitialValue.Should().Be(80_000);
    }

    #endregion

    #region Restore

    [Fact]
    public async Task RestoreFromHistoryAsync_ShouldReturnFalse_WhenHistoryNotFound()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new AssetsRepository(context);

        var result = await repo.RestoreFromHistoryAsync(Guid.NewGuid());

        result.Should().BeFalse();
    }

    [Fact]
    public async Task RestoreFromHistoryAsync_ShouldUpdateExistingAssets()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new AssetsRepository(context);
        var accountId = Guid.NewGuid();
        var assetId = Guid.NewGuid();
        var asset = new Assets
        {
            Id = assetId,
            AccountID = accountId,
            Name = "Original Name",
            InitialValue = 100,
            CurrentValue = 200,
            Type = AssetType.Saving
        };
        context.Assets.Add(asset);

        var history = new AssetHistory
        {
            Id = Guid.NewGuid(),
            AccountId = accountId,
            RecordedAt = DateTime.UtcNow
        };
        history.Details.Add(new AssetHistoryDetail
        {
            Id = Guid.NewGuid(),
            AssetHistoryId = history.Id,
            AssetId = assetId,
            Name = "Restored Name",
            InitialValue = 500,
            CurrentValue = 600,
            Type = "Investment"
        });
        context.AssetHistories.Add(history);
        await context.SaveChangesAsync();

        var result = await repo.RestoreFromHistoryAsync(history.Id);

        result.Should().BeTrue();
        var updated = await repo.GetAsync(assetId);
        updated!.Name.Should().Be("Restored Name");
        updated.InitialValue.Should().Be(500);
        updated.CurrentValue.Should().Be(600);
        updated.Type.Should().Be(AssetType.Investment);
    }

    [Fact]
    public async Task RestoreFromHistoryAsync_ShouldRemoveAssetsNotInHistory()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new AssetsRepository(context);
        var accountId = Guid.NewGuid();
        var toRemove = new Assets
        {
            Id = Guid.NewGuid(),
            AccountID = accountId,
            Name = "To Remove",
            InitialValue = 100,
            CurrentValue = 100,
            Type = AssetType.Saving
        };
        context.Assets.Add(toRemove);

        var history = new AssetHistory
        {
            Id = Guid.NewGuid(),
            AccountId = accountId,
            RecordedAt = DateTime.UtcNow
        };
        context.AssetHistories.Add(history);
        await context.SaveChangesAsync();

        await repo.RestoreFromHistoryAsync(history.Id);

        var removed = await repo.GetAsync(toRemove.Id);
        removed.Should().BeNull();
    }

    [Fact]
    public async Task RestoreFromHistoryAsync_ShouldCreateNewAssetsFromHistory()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new AssetsRepository(context);
        var accountId = Guid.NewGuid();
        var newAssetId = Guid.NewGuid();

        var history = new AssetHistory
        {
            Id = Guid.NewGuid(),
            AccountId = accountId,
            RecordedAt = DateTime.UtcNow
        };
        history.Details.Add(new AssetHistoryDetail
        {
            Id = Guid.NewGuid(),
            AssetHistoryId = history.Id,
            AssetId = newAssetId,
            Name = "New From History",
            InitialValue = 1000,
            CurrentValue = 1500,
            Type = "Saving"
        });
        context.AssetHistories.Add(history);
        await context.SaveChangesAsync();

        await repo.RestoreFromHistoryAsync(history.Id);

        var created = await repo.GetAsync(newAssetId);
        created.Should().NotBeNull();
        created!.Name.Should().Be("New From History");
        created.AccountID.Should().Be(accountId);
    }

    [Fact]
    public async Task RestoreFromHistoryAsync_ShouldNullifyPortfolioAllocation_ForRemovedAsset()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new AssetsRepository(context);
        var accountId = Guid.NewGuid();
        var assetId = Guid.NewGuid();
        var asset = new Assets
        {
            Id = assetId,
            AccountID = accountId,
            Name = "Has Allocation",
            InitialValue = 100,
            CurrentValue = 100,
            Type = AssetType.Saving
        };
        context.Assets.Add(asset);
        var portfolio = new Portfolio
        {
            Id = Guid.NewGuid(),
            AccountID = accountId,
            Name = "Portfolio",
            Amount = 1000
        };
        context.Portfolio.Add(portfolio);
        var allocation = new PortfolioAllocation
        {
            Id = Guid.NewGuid(),
            PortfolioId = portfolio.Id,
            AssetId = assetId,
            Name = "Test Allocation",
            FinancialCategory = "Test",
            CurrentAmount = 100,
            TargetPercentage = 10,
            AssetType = AssetType.Saving
        };
        context.PortfolioAllocations.Add(allocation);
        await context.SaveChangesAsync();

        var history = new AssetHistory
        {
            Id = Guid.NewGuid(),
            AccountId = accountId,
            RecordedAt = DateTime.UtcNow
        };
        context.AssetHistories.Add(history);
        await context.SaveChangesAsync();

        await repo.RestoreFromHistoryAsync(history.Id);

        var updatedAlloc = await context.PortfolioAllocations.FindAsync(allocation.Id);
        updatedAlloc.Should().NotBeNull();
        updatedAlloc!.AssetId.Should().BeNull();
    }

    #endregion

    #region Totals

    [Fact]
    public async Task GetCurrentTotalValueAsync_ShouldReturnSumOfCurrentValues()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new AssetsRepository(context);
        var accountId = Guid.NewGuid();
        context.Assets.AddRange(
            new Assets { Id = Guid.NewGuid(), AccountID = accountId, CurrentValue = 100_000, InitialValue = 80_000, Name = "A", Type = AssetType.Saving },
            new Assets { Id = Guid.NewGuid(), AccountID = accountId, CurrentValue = 200_000, InitialValue = 150_000, Name = "B", Type = AssetType.Investment }
        );
        await context.SaveChangesAsync();

        var total = await repo.GetCurrentTotalValueAsync(accountId);

        total.Should().Be(300_000);
    }

    [Fact]
    public async Task GetCurrentTotalInitialValueAsync_ShouldReturnSumOfInitialValues()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new AssetsRepository(context);
        var accountId = Guid.NewGuid();
        context.Assets.AddRange(
            new Assets { Id = Guid.NewGuid(), AccountID = accountId, CurrentValue = 100_000, InitialValue = 80_000, Name = "A", Type = AssetType.Saving },
            new Assets { Id = Guid.NewGuid(), AccountID = accountId, CurrentValue = 200_000, InitialValue = 150_000, Name = "B", Type = AssetType.Investment }
        );
        await context.SaveChangesAsync();

        var total = await repo.GetCurrentTotalInitialValueAsync(accountId);

        total.Should().Be(230_000);
    }

    [Fact]
    public async Task GetCurrentTotalValueAsync_ShouldReturnZero_WhenNoAssets()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new AssetsRepository(context);

        var total = await repo.GetCurrentTotalValueAsync(Guid.NewGuid());

        total.Should().Be(0);
    }

    #endregion
}
