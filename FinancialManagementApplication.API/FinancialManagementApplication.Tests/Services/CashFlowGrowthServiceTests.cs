using FinancialManagementApplication.Application.Interface.Repositories;
using FinancialManagementApplication.Application.Interface.Services;
using FinancialManagementApplication.Application.Services;
using FluentAssertions;
using Moq;

namespace FinancialManagementApplication.Tests.Services;

public class CashFlowGrowthServiceTests
{
    private readonly Mock<IAssetsRepository> _assetsRepoMock;
    private readonly ICashFlowGrowthService _sut;

    public CashFlowGrowthServiceTests()
    {
        _assetsRepoMock = new Mock<IAssetsRepository>();
        _sut = new CashFlowGrowthService(_assetsRepoMock.Object);
    }

    #region Yearly Mode

    [Fact]
    public async Task GetGrowthDataAsync_Yearly_WithMultipleYears_ReturnsCorrectData()
    {
        var accountId = Guid.NewGuid();

        var snapshots = new List<SnapshotSummary>
        {
            new() { RecordedAt = new DateTime(2024, 6, 15), TotalValue = 100_000_000, TotalInitialValue = 80_000_000 },
            new() { RecordedAt = new DateTime(2024, 12, 31), TotalValue = 120_000_000, TotalInitialValue = 85_000_000 },
            new() { RecordedAt = new DateTime(2025, 3, 10), TotalValue = 130_000_000, TotalInitialValue = 90_000_000 },
            new() { RecordedAt = new DateTime(2025, 12, 31), TotalValue = 150_000_000, TotalInitialValue = 100_000_000 },
        };
        SetupSnapshots(accountId, snapshots);
        SetupCurrentValues(accountId, 170_000_000, 110_000_000);

        var result = await _sut.GetGrowthDataAsync(accountId, "yearly");

        result.Mode.Should().Be("yearly");
        result.Data.Should().HaveCountGreaterThanOrEqualTo(2);
        result.Data[0].Period.Should().Be("2024");
        result.Data[0].Value.Should().Be(120_000_000);
        result.Data[0].InitialValue.Should().Be(85_000_000);
        result.Data[0].ChangeFromPrevious.Should().BeNull();
        result.Data[0].ChangePercentage.Should().BeNull();

        result.Data[1].Period.Should().Be("2025");
        result.Data[1].Value.Should().Be(150_000_000);
        result.Data[1].InitialValue.Should().Be(100_000_000);
        result.Data[1].ChangeFromPrevious.Should().Be(30_000_000);
        result.Data[1].ChangePercentage.Should().Be(25.0m);
    }

    [Fact]
    public async Task GetGrowthDataAsync_Yearly_WithEmptySnapshots_ReturnsEmptyData()
    {
        var accountId = Guid.NewGuid();

        SetupSnapshots(accountId, new List<SnapshotSummary>());
        SetupCurrentValues(accountId, 50_000_000, 40_000_000);

        var result = await _sut.GetGrowthDataAsync(accountId, "yearly");

        result.Data.Should().BeEmpty();
    }

    [Fact]
    public async Task GetGrowthDataAsync_Yearly_WhenPreviousYearValueIsZero_ChangePercentageIsNull()
    {
        var accountId = Guid.NewGuid();

        var snapshots = new List<SnapshotSummary>
        {
            new() { RecordedAt = new DateTime(2024, 12, 31), TotalValue = 0, TotalInitialValue = 0 },
            new() { RecordedAt = new DateTime(2025, 12, 31), TotalValue = 100_000, TotalInitialValue = 80_000 },
        };
        SetupSnapshots(accountId, snapshots);
        SetupCurrentValues(accountId, 200_000, 150_000);

        var result = await _sut.GetGrowthDataAsync(accountId, "yearly");

        var data2025 = result.Data.First(d => d.Period == "2025");
        data2025.ChangePercentage.Should().BeNull();
        data2025.ChangeFromPrevious.Should().Be(100_000);
    }

    [Fact]
    public async Task GetGrowthDataAsync_Yearly_InitialValuePropagatesFromPreviousYear()
    {
        var accountId = Guid.NewGuid();

        var snapshots = new List<SnapshotSummary>
        {
            new() { RecordedAt = new DateTime(2024, 12, 31), TotalValue = 100_000_000, TotalInitialValue = 90_000_000 },
            new() { RecordedAt = new DateTime(2025, 12, 31), TotalValue = 150_000_000, TotalInitialValue = 0 },
        };
        SetupSnapshots(accountId, snapshots);
        SetupCurrentValues(accountId, 0, 0);

        var result = await _sut.GetGrowthDataAsync(accountId, "yearly");

        var data2025 = result.Data.First(d => d.Period == "2025");
        data2025.InitialValue.Should().Be(90_000_000);
    }

    #endregion

    #region Monthly Mode

    [Fact]
    public async Task GetGrowthDataAsync_Monthly_WithCompleteData_ReturnsAllMonthsUpToCurrent()
    {
        var accountId = Guid.NewGuid();

        var snapshots = new List<SnapshotSummary>
        {
            new() { RecordedAt = new DateTime(2026, 1, 10), TotalValue = 100_000_000, TotalInitialValue = 80_000_000 },
            new() { RecordedAt = new DateTime(2026, 2, 5), TotalValue = 110_000_000, TotalInitialValue = 85_000_000 },
            new() { RecordedAt = new DateTime(2026, 3, 20), TotalValue = 120_000_000, TotalInitialValue = 90_000_000 },
            new() { RecordedAt = new DateTime(2026, 4, 15), TotalValue = 130_000_000, TotalInitialValue = 95_000_000 },
            new() { RecordedAt = new DateTime(2026, 5, 10), TotalValue = 140_000_000, TotalInitialValue = 100_000_000 },
        };
        SetupSnapshots(accountId, snapshots);
        SetupCurrentValues(accountId, 150_000_000, 105_000_000);

        var result = await _sut.GetGrowthDataAsync(accountId, "monthly", 2026);

        result.Mode.Should().Be("monthly");
        result.Year.Should().Be(2026);
        result.Data.Should().NotBeEmpty();
        result.Data[0].Period.Should().Be("Jan");
    }

    [Fact]
    public async Task GetGrowthDataAsync_Monthly_WithMissingMonths_CarriesForward()
    {
        var accountId = Guid.NewGuid();

        var snapshots = new List<SnapshotSummary>
        {
            new() { RecordedAt = new DateTime(2026, 1, 10), TotalValue = 100_000_000, TotalInitialValue = 80_000_000 },
            new() { RecordedAt = new DateTime(2026, 4, 15), TotalValue = 130_000_000, TotalInitialValue = 95_000_000 },
        };
        SetupSnapshots(accountId, snapshots);
        SetupCurrentValues(accountId, 150_000_000, 105_000_000);

        var result = await _sut.GetGrowthDataAsync(accountId, "monthly", 2026);

        result.Data.Should().NotBeEmpty();
        result.Data[0].Value.Should().Be(100_000_000);
        if (result.Data.Count > 1)
            result.Data[1].Value.Should().Be(100_000_000);
        if (result.Data.Count > 3)
            result.Data[3].Value.Should().Be(130_000_000);
    }

    [Fact]
    public async Task GetGrowthDataAsync_Monthly_WithNoData_ReturnsEmpty()
    {
        var accountId = Guid.NewGuid();

        SetupSnapshots(accountId, new List<SnapshotSummary>());
        SetupCurrentValues(accountId, 150_000_000, 105_000_000);

        var result = await _sut.GetGrowthDataAsync(accountId, "monthly", 2026);

        result.Data.Should().BeEmpty();
    }

    #endregion

    #region Last12Months Mode

    [Fact]
    public async Task GetGrowthDataAsync_Last12Months_ReturnsTwelveMonths()
    {
        var accountId = Guid.NewGuid();

        var snapshots = new List<SnapshotSummary>
        {
            new() { RecordedAt = new DateTime(2025, 7, 1), TotalValue = 80_000_000, TotalInitialValue = 60_000_000 },
            new() { RecordedAt = new DateTime(2025, 12, 31), TotalValue = 100_000_000, TotalInitialValue = 75_000_000 },
            new() { RecordedAt = new DateTime(2026, 3, 15), TotalValue = 130_000_000, TotalInitialValue = 90_000_000 },
        };
        SetupSnapshots(accountId, snapshots);
        SetupCurrentValues(accountId, 150_000_000, 105_000_000);

        var result = await _sut.GetGrowthDataAsync(accountId, "last12months");

        result.Mode.Should().Be("last12months");
        result.Data.Should().HaveCount(12);
        result.Data[0].Period.Should().Contain("2025");
        result.Data[^1].Period.Should().Contain("2026");
    }

    [Fact]
    public async Task GetGrowthDataAsync_Last12Months_WithMissingMonths_CarriesForward()
    {
        var accountId = Guid.NewGuid();

        var snapshots = new List<SnapshotSummary>
        {
            new() { RecordedAt = new DateTime(2025, 7, 1), TotalValue = 80_000_000, TotalInitialValue = 60_000_000 },
            new() { RecordedAt = new DateTime(2026, 6, 1), TotalValue = 150_000_000, TotalInitialValue = 110_000_000 },
        };
        SetupSnapshots(accountId, snapshots);
        SetupCurrentValues(accountId, 150_000_000, 110_000_000);

        var result = await _sut.GetGrowthDataAsync(accountId, "last12months");

        result.Data.Should().HaveCount(12);
        result.Data[0].Value.Should().Be(80_000_000);
    }

    [Fact]
    public async Task GetGrowthDataAsync_Last12Months_WithNoData_ReturnsEmpty()
    {
        var accountId = Guid.NewGuid();

        SetupSnapshots(accountId, new List<SnapshotSummary>());
        SetupCurrentValues(accountId, 150_000_000, 110_000_000);

        var result = await _sut.GetGrowthDataAsync(accountId, "last12months");

        result.Data.Should().BeEmpty();
    }

    #endregion

    #region Unknown Mode

    [Fact]
    public async Task GetGrowthDataAsync_UnknownMode_ReturnsEmptyData()
    {
        var accountId = Guid.NewGuid();

        var result = await _sut.GetGrowthDataAsync(accountId, "invalid_mode");

        result.Mode.Should().Be("invalid_mode");
        result.Data.Should().BeEmpty();
    }

    #endregion

    #region Edge Cases - ChangePercentage

    [Fact]
    public async Task GetGrowthDataAsync_Yearly_ChangePercentage_WhenPrevZero_ReturnsNull()
    {
        var accountId = Guid.NewGuid();

        var snapshots = new List<SnapshotSummary>
        {
            new() { RecordedAt = new DateTime(2024, 12, 31), TotalValue = 0, TotalInitialValue = 0 },
            new() { RecordedAt = new DateTime(2025, 12, 31), TotalValue = 100_000, TotalInitialValue = 80_000 },
        };
        SetupSnapshots(accountId, snapshots);
        SetupCurrentValues(accountId, 150_000, 100_000);

        var result = await _sut.GetGrowthDataAsync(accountId, "yearly");

        var data2025 = result.Data.First(d => d.Period == "2025");
        data2025.ChangePercentage.Should().BeNull();
        data2025.ChangeFromPrevious.Should().Be(100_000);
    }

    #endregion

    #region Edge Cases - Current Year Update

    [Fact]
    public async Task GetGrowthDataAsync_Yearly_WithCurrentYearSnapshot_AppliesCurrentValues()
    {
        var accountId = Guid.NewGuid();
        var now = DateTime.UtcNow;

        var snapshots = new List<SnapshotSummary>
        {
            new() { RecordedAt = new DateTime(now.Year, 1, 15), TotalValue = 100_000_000, TotalInitialValue = 80_000_000 },
            new() { RecordedAt = new DateTime(now.Year - 1, 12, 31), TotalValue = 90_000_000, TotalInitialValue = 70_000_000 },
        };
        SetupSnapshots(accountId, snapshots);
        SetupCurrentValues(accountId, 150_000_000, 120_000_000);

        var result = await _sut.GetGrowthDataAsync(accountId, "yearly");

        var currentYearData = result.Data.First(d => d.Period == now.Year.ToString());
        currentYearData.Value.Should().Be(150_000_000);
        currentYearData.InitialValue.Should().Be(120_000_000);
    }

    [Fact]
    public async Task GetGrowthDataAsync_Yearly_WithCurrentYearAndPreviousData_CalculatesChange()
    {
        var accountId = Guid.NewGuid();
        var now = DateTime.UtcNow;

        var snapshots = new List<SnapshotSummary>
        {
            new() { RecordedAt = new DateTime(now.Year, 6, 1), TotalValue = 100_000_000, TotalInitialValue = 80_000_000 },
            new() { RecordedAt = new DateTime(now.Year - 1, 12, 31), TotalValue = 70_000_000, TotalInitialValue = 50_000_000 },
        };
        SetupSnapshots(accountId, snapshots);
        SetupCurrentValues(accountId, 100_000_000, 80_000_000);

        var result = await _sut.GetGrowthDataAsync(accountId, "yearly");

        var currentYearData = result.Data.First(d => d.Period == now.Year.ToString());
        currentYearData.Value.Should().Be(100_000_000);
        currentYearData.ChangeFromPrevious.Should().Be(30_000_000);
        currentYearData.ChangePercentage.Should().NotBeNull();
    }

    [Fact]
    public async Task GetGrowthDataAsync_Yearly_OnlySingleCurrentYearSnapshot_AppliesCurrentValues()
    {
        var accountId = Guid.NewGuid();
        var now = DateTime.UtcNow;

        var snapshots = new List<SnapshotSummary>
        {
            new() { RecordedAt = new DateTime(now.Year, 1, 1), TotalValue = 100_000_000, TotalInitialValue = 80_000_000 },
        };
        SetupSnapshots(accountId, snapshots);
        SetupCurrentValues(accountId, 120_000_000, 90_000_000);

        var result = await _sut.GetGrowthDataAsync(accountId, "yearly");

        result.Data.Should().HaveCount(1);
        result.Data[0].Value.Should().Be(120_000_000);
        result.Data[0].InitialValue.Should().Be(90_000_000);
        result.Data[0].ChangeFromPrevious.Should().BeNull();
        result.Data[0].ChangePercentage.Should().BeNull();
    }

    #endregion

    #region Edge Cases - Initial Value Propagation

    [Fact]
    public async Task GetGrowthDataAsync_Last12Months_WithMissingInitialValue_CarriesForward()
    {
        var accountId = Guid.NewGuid();
        var now = DateTime.UtcNow;

        var snapshots = new List<SnapshotSummary>
        {
            new() { RecordedAt = new DateTime(now.Year, now.Month - 2, 1), TotalValue = 80_000_000, TotalInitialValue = 0 },
        };
        SetupSnapshots(accountId, snapshots);
        SetupCurrentValues(accountId, 100_000_000, 90_000_000);

        var result = await _sut.GetGrowthDataAsync(accountId, "last12months");

        var dataWithMissingInit = result.Data.First(d => d.Value == 80_000_000);
        dataWithMissingInit.InitialValue.Should().Be(90_000_000);
    }

    #endregion

    #region Helpers

    private void SetupSnapshots(Guid accountId, List<SnapshotSummary> snapshots)
    {
        _assetsRepoMock
            .Setup(r => r.GetSnapshotValuesAsync(accountId))
            .ReturnsAsync(snapshots);
    }

    private void SetupCurrentValues(Guid accountId, decimal totalValue, decimal totalInitialValue)
    {
        _assetsRepoMock
            .Setup(r => r.GetCurrentTotalValueAsync(accountId))
            .ReturnsAsync(totalValue);

        _assetsRepoMock
            .Setup(r => r.GetCurrentTotalInitialValueAsync(accountId))
            .ReturnsAsync(totalInitialValue);
    }

    #endregion
}
