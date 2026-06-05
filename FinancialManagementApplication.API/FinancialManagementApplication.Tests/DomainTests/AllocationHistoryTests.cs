using FinancialManagementApplication.Domain.Entities;
using FinancialManagementApplication.Domain.Enums;
using FluentAssertions;

namespace FinancialManagementApplication.Tests.DomainTests;

public class AllocationHistoryTests
{
    [Fact]
    public void AllocationHistory_ShouldSetProperties()
    {
        var id = Guid.NewGuid();
        var allocationId = Guid.NewGuid();
        var now = DateTime.UtcNow;

        var history = new AllocationHistory
        {
            Id = id,
            AllocationId = allocationId,
            CurrentAmount = 100_000_000,
            TargetPercentage = 50.0m,
            RecordedAt = now,
            Allocation = new PortfolioAllocation
            {
                Id = allocationId,
                PortfolioId = Guid.NewGuid(),
                AssetId = Guid.NewGuid(),
                FinancialCategory = "Stocks",
                Name = "Test",
                CurrentAmount = 100_000_000,
                TargetPercentage = 50.0m,
                AssetType = AssetType.Investment
            }
        };

        history.Id.Should().Be(id);
        history.AllocationId.Should().Be(allocationId);
        history.CurrentAmount.Should().Be(100_000_000);
        history.TargetPercentage.Should().Be(50.0m);
        history.RecordedAt.Should().Be(now);
        history.Allocation.Should().NotBeNull();
        history.Allocation.FinancialCategory.Should().Be("Stocks");
    }

    [Fact]
    public void AllocationHistory_DefaultValues_ShouldBeZero()
    {
        var history = new AllocationHistory();

        history.CurrentAmount.Should().Be(0);
        history.TargetPercentage.Should().Be(0);
        history.RecordedAt.Should().Be(default);
    }
}
