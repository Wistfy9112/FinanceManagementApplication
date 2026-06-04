using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace FinancialManagementApplication.Tests.Integration;

public class PortfolioIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public PortfolioIntegrationTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CreatePortfolio_WithValidData_ReturnsCreated()
    {
        var accountId = Guid.NewGuid();
        var request = new
        {
            AccountID = accountId,
            Name = "Main Portfolio",
            Amount = 500_000_000
        };

        var response = await _client.PostAsJsonAsync("/api/portfolio", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var portfolio = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        portfolio.Should().ContainKey("id");
        portfolio!["name"]?.ToString().Should().Be("Main Portfolio");
    }

    [Fact]
    public async Task GetPortfolio_WithValidId_ReturnsPortfolio()
    {
        var accountId = Guid.NewGuid();
        var createResponse = await _client.PostAsJsonAsync("/api/portfolio", new
        {
            AccountID = accountId,
            Name = "Get Test",
            Amount = 100_000_000
        });
        var created = await createResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var portfolioId = created!["id"]!.ToString()!;

        var response = await _client.GetAsync($"/api/portfolio/{portfolioId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetPortfolio_WithInvalidId_ReturnsNotFound()
    {
        var response = await _client.GetAsync($"/api/portfolio/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetAllPortfolios_ReturnsPortfolios()
    {
        var accountId = Guid.NewGuid();
        await _client.PostAsJsonAsync("/api/portfolio", new
        {
            AccountID = accountId,
            Name = "Portfolio 1",
            Amount = 200_000_000
        });

        var response = await _client.GetAsync($"/api/portfolio/user/{accountId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task UpdatePortfolio_WithValidData_ReturnsNoContent()
    {
        var accountId = Guid.NewGuid();
        var createResponse = await _client.PostAsJsonAsync("/api/portfolio", new
        {
            AccountID = accountId,
            Name = "Original",
            Amount = 100_000_000
        });
        var created = await createResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var portfolioId = created!["id"]!.ToString()!;

        var response = await _client.PutAsJsonAsync($"/api/portfolio/{portfolioId}", new
        {
            Name = "Updated",
            Amount = 200_000_000
        });

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task UpdatePortfolio_WithInvalidId_ReturnsNotFound()
    {
        var response = await _client.PutAsJsonAsync($"/api/portfolio/{Guid.NewGuid()}", new
        {
            Name = "Nope",
            Amount = 50_000_000
        });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeletePortfolio_WithValidId_ReturnsOk()
    {
        var accountId = Guid.NewGuid();
        var createResponse = await _client.PostAsJsonAsync("/api/portfolio", new
        {
            AccountID = accountId,
            Name = "To Delete",
            Amount = 50_000_000
        });
        var created = await createResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var portfolioId = created!["id"]!.ToString()!;

        var response = await _client.DeleteAsync($"/api/portfolio/{portfolioId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task DeletePortfolio_WithInvalidId_ReturnsNotFound()
    {
        var response = await _client.DeleteAsync($"/api/portfolio/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
