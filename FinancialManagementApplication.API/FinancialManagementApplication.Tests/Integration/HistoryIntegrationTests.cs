using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace FinancialManagementApplication.Tests.Integration;

public class HistoryIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public HistoryIntegrationTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task SaveAssetSnapshot_WithAssets_ReturnsSnapshot()
    {
        var accountId = Guid.NewGuid();
        await _client.PostAsJsonAsync("/api/assets", new
        {
            AccountID = accountId,
            Name = "Snapshot Asset",
            InitialValue = 100_000_000,
            CurrentValue = 120_000_000,
            Type = "Saving"
        });

        var response = await _client.PostAsync($"/api/history/asset/snapshot/{accountId}", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var snapshot = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        snapshot.Should().ContainKey("id");
        snapshot!["accountId"]?.ToString().Should().Be(accountId.ToString());
    }

    [Fact]
    public async Task SaveAssetSnapshot_WithNoAssets_ReturnsEmptySnapshot()
    {
        var accountId = Guid.NewGuid();

        var response = await _client.PostAsync($"/api/history/asset/snapshot/{accountId}", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var snapshot = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        snapshot.Should().ContainKey("id");
    }

    [Fact]
    public async Task GetAssetHistory_ReturnsHistory()
    {
        var accountId = Guid.NewGuid();
        await _client.PostAsJsonAsync("/api/assets", new
        {
            AccountID = accountId,
            Name = "History Asset",
            InitialValue = 50_000_000,
            CurrentValue = 60_000_000,
            Type = "Saving"
        });
        await _client.PostAsync($"/api/history/asset/snapshot/{accountId}", null);

        var response = await _client.GetAsync($"/api/history/asset/{accountId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var history = await response.Content.ReadFromJsonAsync<List<object>>();
        history.Should().NotBeEmpty();
    }

    [Fact]
    public async Task RestoreAssetFromHistory_WithValidHistoryId_ReturnsOk()
    {
        var accountId = Guid.NewGuid();
        await _client.PostAsJsonAsync("/api/assets", new
        {
            AccountID = accountId,
            Name = "Restorable",
            InitialValue = 200_000_000,
            CurrentValue = 250_000_000,
            Type = "Investment"
        });
        var snapshotResponse = await _client.PostAsync($"/api/history/asset/snapshot/{accountId}", null);
        var snapshot = await snapshotResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var historyId = snapshot!["id"]!.ToString()!;

        var response = await _client.PostAsync($"/api/history/asset/restore/{historyId}", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task RestoreAssetFromHistory_WithInvalidHistoryId_ReturnsNotFound()
    {
        var response = await _client.PostAsync($"/api/history/asset/restore/{Guid.NewGuid()}", null);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetAllocationHistory_ReturnsHistory()
    {
        var accountId = Guid.NewGuid();
        var portfolioResponse = await _client.PostAsJsonAsync("/api/portfolio", new
        {
            AccountID = accountId,
            Name = "Test Portfolio",
            Amount = 100_000_000
        });
        var portfolio = await portfolioResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var portfolioId = portfolio!["id"]!.ToString()!;

        await _client.PostAsJsonAsync("/api/portfolioAllocation", new
        {
            PortfolioId = portfolioId,
            FinancialCategory = "Stocks",
            Name = "Tech Stocks",
            CurrentAmount = 60_000_000,
            TargetPercentage = 60,
            UpdateAt = DateTime.UtcNow,
            AssetType = "Investment"
        });

        await _client.PostAsync($"/api/history/allocation/snapshot/{accountId}", null);

        var response = await _client.GetAsync($"/api/history/allocation-history/{accountId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var history = await response.Content.ReadFromJsonAsync<List<object>>();
        history.Should().NotBeEmpty();
    }

    [Fact]
    public async Task SaveAllocationSnapshot_ReturnsSnapshot()
    {
        var accountId = Guid.NewGuid();
        var portfolioResponse = await _client.PostAsJsonAsync("/api/portfolio", new
        {
            AccountID = accountId,
            Name = "Alloc Portfolio",
            Amount = 100_000_000
        });
        var portfolio = await portfolioResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var portfolioId = portfolio!["id"]!.ToString()!;

        await _client.PostAsJsonAsync("/api/portfolioAllocation", new
        {
            PortfolioId = portfolioId,
            FinancialCategory = "Bonds",
            Name = "Government Bonds",
            CurrentAmount = 40_000_000,
            TargetPercentage = 40,
            UpdateAt = DateTime.UtcNow,
            AssetType = "Saving"
        });

        var response = await _client.PostAsync($"/api/history/allocation/snapshot/{accountId}", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task RestoreAllocationFromHistory_WithValidHistoryId_ReturnsOk()
    {
        var accountId = Guid.NewGuid();
        var portfolioResponse = await _client.PostAsJsonAsync("/api/portfolio", new
        {
            AccountID = accountId,
            Name = "Restore Portfolio",
            Amount = 100_000_000
        });
        var portfolio = await portfolioResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var portfolioId = portfolio!["id"]!.ToString()!;

        await _client.PostAsJsonAsync("/api/portfolioAllocation", new
        {
            PortfolioId = portfolioId,
            FinancialCategory = "RealEstate",
            Name = "Apartment",
            CurrentAmount = 100_000_000,
            TargetPercentage = 100,
            UpdateAt = DateTime.UtcNow,
            AssetType = "Investment"
        });

        var snapshotResponse = await _client.PostAsync($"/api/history/allocation/snapshot/{accountId}", null);
        var snapshot = await snapshotResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var historyId = snapshot!["id"]!.ToString()!;

        var response = await _client.PostAsync($"/api/history/allocation/restore/{historyId}", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task RestoreAllocationFromHistory_WithInvalidHistoryId_ReturnsNotFound()
    {
        var response = await _client.PostAsync($"/api/history/allocation/restore/{Guid.NewGuid()}", null);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
