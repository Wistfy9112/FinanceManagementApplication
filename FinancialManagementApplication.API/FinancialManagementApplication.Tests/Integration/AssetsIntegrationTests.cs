using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace FinancialManagementApplication.Tests.Integration;

public class AssetsIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public AssetsIntegrationTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CreateAsset_WithValidData_ReturnsCreated()
    {
        var accountId = Guid.NewGuid();
        var request = new
        {
            AccountID = accountId,
            Name = "Checking Account",
            InitialValue = 10_000_000,
            CurrentValue = 12_000_000,
            Type = "Saving"
        };

        var response = await _client.PostAsJsonAsync("/api/assets", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var asset = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        asset.Should().ContainKey("id");
        asset!["name"]?.ToString().Should().Be("Checking Account");
    }

    [Fact]
    public async Task GetAsset_WithValidId_ReturnsAsset()
    {
        var accountId = Guid.NewGuid();
        var createResponse = await _client.PostAsJsonAsync("/api/assets", new
        {
            AccountID = accountId,
            Name = "Get Test",
            InitialValue = 5_000_000,
            CurrentValue = 7_000_000,
            Type = "Investment"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var assetId = created!["id"]!.ToString()!;

        var response = await _client.GetAsync($"/api/assets/{assetId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetAsset_WithInvalidId_ReturnsNotFound()
    {
        var response = await _client.GetAsync($"/api/assets/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetAllAssets_ReturnsAssets()
    {
        var accountId = Guid.NewGuid();
        await _client.PostAsJsonAsync("/api/assets", new
        {
            AccountID = accountId,
            Name = "Asset 1",
            InitialValue = 1_000_000,
            CurrentValue = 1_500_000,
            Type = "Saving"
        });

        var response = await _client.GetAsync($"/api/assets/user/{accountId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task UpdateAsset_WithValidData_ReturnsNoContent()
    {
        var accountId = Guid.NewGuid();
        var createResponse = await _client.PostAsJsonAsync("/api/assets", new
        {
            AccountID = accountId,
            Name = "Original",
            InitialValue = 10_000_000,
            CurrentValue = 12_000_000,
            Type = "Saving"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var assetId = created!["id"]!.ToString()!;

        var response = await _client.PutAsJsonAsync($"/api/assets/{assetId}", new
        {
            Name = "Updated",
            InitialValue = 15_000_000,
            CurrentValue = 18_000_000,
            Type = "Investment"
        });

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task UpdateAsset_WithInvalidId_ReturnsNotFound()
    {
        var response = await _client.PutAsJsonAsync($"/api/assets/{Guid.NewGuid()}", new
        {
            Name = "Nope",
            InitialValue = 1_000_000,
            CurrentValue = 2_000_000,
            Type = "Saving"
        });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteAsset_WithValidId_ReturnsNoContent()
    {
        var accountId = Guid.NewGuid();
        var createResponse = await _client.PostAsJsonAsync("/api/assets", new
        {
            AccountID = accountId,
            Name = "To Delete",
            InitialValue = 1_000_000,
            CurrentValue = 1_200_000,
            Type = "Expense"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var assetId = created!["id"]!.ToString()!;

        var response = await _client.DeleteAsync($"/api/assets/{assetId}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task DeleteAsset_WithInvalidId_ReturnsNotFound()
    {
        var response = await _client.DeleteAsync($"/api/assets/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
