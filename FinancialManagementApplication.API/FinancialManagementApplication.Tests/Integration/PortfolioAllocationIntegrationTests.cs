using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace FinancialManagementApplication.Tests.Integration;

public class PortfolioAllocationIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public PortfolioAllocationIntegrationTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    private async Task<string> CreatePortfolio(Guid accountId)
    {
        var response = await _client.PostAsJsonAsync("/api/portfolio", new
        {
            AccountID = accountId,
            Name = "Test Portfolio",
            Amount = 100_000_000
        });
        var portfolio = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        return portfolio!["id"]!.ToString()!;
    }

    [Fact]
    public async Task CreateAllocation_WithValidData_ReturnsCreated()
    {
        var accountId = Guid.NewGuid();
        var portfolioId = await CreatePortfolio(accountId);
        var request = new
        {
            PortfolioId = portfolioId,
            FinancialCategory = "Stocks",
            Name = "Tech Stocks",
            CurrentAmount = 60_000_000,
            TargetPercentage = 60,
            UpdateAt = DateTime.UtcNow,
            AssetType = "Investment"
        };

        var response = await _client.PostAsJsonAsync("/api/portfolioAllocation", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var allocation = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        allocation.Should().ContainKey("id");
        allocation!["financialCategory"]?.ToString().Should().Be("Stocks");
    }

    [Fact]
    public async Task GetAllByPortfolioId_ReturnsAllocations()
    {
        var accountId = Guid.NewGuid();
        var portfolioId = await CreatePortfolio(accountId);
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

        var response = await _client.GetAsync($"/api/portfolioAllocation/portfolio/{portfolioId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var allocations = await response.Content.ReadFromJsonAsync<List<object>>();
        allocations.Should().NotBeEmpty();
    }

    [Fact]
    public async Task GetAllocation_WithValidId_ReturnsAllocation()
    {
        var accountId = Guid.NewGuid();
        var portfolioId = await CreatePortfolio(accountId);
        var createResponse = await _client.PostAsJsonAsync("/api/portfolioAllocation", new
        {
            PortfolioId = portfolioId,
            FinancialCategory = "Bonds",
            Name = "Gov Bonds",
            CurrentAmount = 40_000_000,
            TargetPercentage = 40,
            UpdateAt = DateTime.UtcNow,
            AssetType = "Saving"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var allocationId = created!["id"]!.ToString()!;

        var response = await _client.GetAsync($"/api/portfolioAllocation/{allocationId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task UpdateAllocation_WithValidData_ReturnsNoContent()
    {
        var accountId = Guid.NewGuid();
        var portfolioId = await CreatePortfolio(accountId);
        var createResponse = await _client.PostAsJsonAsync("/api/portfolioAllocation", new
        {
            PortfolioId = portfolioId,
            FinancialCategory = "Original",
            Name = "Original Name",
            CurrentAmount = 50_000_000,
            TargetPercentage = 50,
            UpdateAt = DateTime.UtcNow,
            AssetType = "Investment"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var allocationId = created!["id"]!.ToString()!;

        var response = await _client.PutAsJsonAsync($"/api/portfolioAllocation/{allocationId}", new
        {
            FinancialCategory = "Updated",
            Name = "Updated Name",
            CurrentAmount = 80_000_000,
            TargetPercentage = 80,
            UpdateAt = DateTime.UtcNow,
            AssetType = "Saving"
        });

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task UpdateAllocation_WithInvalidId_ReturnsNotFound()
    {
        var response = await _client.PutAsJsonAsync($"/api/portfolioAllocation/{Guid.NewGuid()}", new
        {
            FinancialCategory = "Test",
            Name = "Test",
            CurrentAmount = 1000,
            TargetPercentage = 10,
            UpdateAt = DateTime.UtcNow,
            AssetType = "Saving"
        });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteAllocation_WithValidId_ReturnsNoContent()
    {
        var accountId = Guid.NewGuid();
        var portfolioId = await CreatePortfolio(accountId);
        var createResponse = await _client.PostAsJsonAsync("/api/portfolioAllocation", new
        {
            PortfolioId = portfolioId,
            FinancialCategory = "To Delete",
            Name = "Delete Me",
            CurrentAmount = 10_000_000,
            TargetPercentage = 10,
            UpdateAt = DateTime.UtcNow,
            AssetType = "Expense"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var allocationId = created!["id"]!.ToString()!;

        var response = await _client.DeleteAsync($"/api/portfolioAllocation/{allocationId}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task DeleteAllocation_WithInvalidId_ReturnsNotFound()
    {
        var response = await _client.DeleteAsync($"/api/portfolioAllocation/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
