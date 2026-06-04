using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace FinancialManagementApplication.Tests.Integration;

public class GoalIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public GoalIntegrationTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CreateGoal_WithValidData_ReturnsCreated()
    {
        var accountId = Guid.NewGuid();
        var request = new
        {
            AccountId = accountId,
            Name = "Buy a House",
            TargetAmount = 500_000_000,
            StartDate = (DateTime?)null,
            DueDate = DateTime.UtcNow.AddYears(5)
        };

        var response = await _client.PostAsJsonAsync("/api/goals", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var goal = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        goal.Should().ContainKey("id");
        goal!["name"]?.ToString().Should().Be("Buy a House");
    }

    [Fact]
    public async Task GetGoal_WithValidId_ReturnsGoal()
    {
        var accountId = Guid.NewGuid();
        var createResponse = await _client.PostAsJsonAsync("/api/goals", new
        {
            AccountId = accountId,
            Name = "Get Test",
            TargetAmount = 100_000,
            DueDate = DateTime.UtcNow.AddMonths(6)
        });
        var created = await createResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var goalId = created!["id"]!.ToString()!;

        var response = await _client.GetAsync($"/api/goals/{goalId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetGoal_WithInvalidId_ReturnsNotFound()
    {
        var response = await _client.GetAsync($"/api/goals/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetAllGoals_ReturnsGoals()
    {
        var accountId = Guid.NewGuid();
        await _client.PostAsJsonAsync("/api/goals", new
        {
            AccountId = accountId,
            Name = "Goal 1",
            TargetAmount = 100_000,
            DueDate = DateTime.UtcNow.AddMonths(3)
        });

        var response = await _client.GetAsync($"/api/goals/user/{accountId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task UpdateGoal_WithValidData_ReturnsNoContent()
    {
        var accountId = Guid.NewGuid();
        var createResponse = await _client.PostAsJsonAsync("/api/goals", new
        {
            AccountId = accountId,
            Name = "Original",
            TargetAmount = 100_000,
            DueDate = DateTime.UtcNow.AddMonths(3)
        });
        var created = await createResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var goalId = created!["id"]!.ToString()!;

        var response = await _client.PutAsJsonAsync($"/api/goals/{goalId}", new
        {
            Name = "Updated",
            TargetAmount = 200_000,
            DueDate = DateTime.UtcNow.AddMonths(6)
        });

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task UpdateGoal_WithInvalidId_ReturnsNotFound()
    {
        var response = await _client.PutAsJsonAsync($"/api/goals/{Guid.NewGuid()}", new
        {
            Name = "Nope",
            TargetAmount = 100_000,
            DueDate = DateTime.UtcNow.AddMonths(3)
        });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteGoal_WithValidId_ReturnsNoContent()
    {
        var accountId = Guid.NewGuid();
        var createResponse = await _client.PostAsJsonAsync("/api/goals", new
        {
            AccountId = accountId,
            Name = "To Delete",
            TargetAmount = 100_000,
            DueDate = DateTime.UtcNow.AddMonths(3)
        });
        var created = await createResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var goalId = created!["id"]!.ToString()!;

        var response = await _client.DeleteAsync($"/api/goals/{goalId}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task DeleteGoal_WithInvalidId_ReturnsNotFound()
    {
        var response = await _client.DeleteAsync($"/api/goals/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task StartGoal_WithNotStartedStatus_ReturnsOk()
    {
        var accountId = Guid.NewGuid();
        var createResponse = await _client.PostAsJsonAsync("/api/goals", new
        {
            AccountId = accountId,
            Name = "Startable",
            TargetAmount = 100_000,
            DueDate = DateTime.UtcNow.AddMonths(3)
        });
        var created = await createResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var goalId = created!["id"]!.ToString()!;

        var response = await _client.PostAsync($"/api/goals/{goalId}/start", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var goal = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        goal!["status"]?.ToString().Should().Be("Processing");
    }

    [Fact]
    public async Task StartGoal_AlreadyStarted_ReturnsBadRequest()
    {
        var accountId = Guid.NewGuid();
        var createResponse = await _client.PostAsJsonAsync("/api/goals", new
        {
            AccountId = accountId,
            Name = "Already Started",
            TargetAmount = 100_000,
            DueDate = DateTime.UtcNow.AddMonths(3)
        });
        var created = await createResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var goalId = created!["id"]!.ToString()!;

        await _client.PostAsync($"/api/goals/{goalId}/start", null);
        var response = await _client.PostAsync($"/api/goals/{goalId}/start", null);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CancelGoal_WithProcessingStatus_ReturnsOk()
    {
        var accountId = Guid.NewGuid();
        var createResponse = await _client.PostAsJsonAsync("/api/goals", new
        {
            AccountId = accountId,
            Name = "Cancellable",
            TargetAmount = 100_000,
            DueDate = DateTime.UtcNow.AddMonths(3)
        });
        var created = await createResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var goalId = created!["id"]!.ToString()!;

        await _client.PostAsync($"/api/goals/{goalId}/start", null);
        var response = await _client.PostAsync($"/api/goals/{goalId}/cancel", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var goal = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        goal!["status"]?.ToString().Should().Be("Cancelled");
    }

    [Fact]
    public async Task CancelGoal_AlreadyCancelled_ReturnsBadRequest()
    {
        var accountId = Guid.NewGuid();
        var createResponse = await _client.PostAsJsonAsync("/api/goals", new
        {
            AccountId = accountId,
            Name = "Double Cancel",
            TargetAmount = 100_000,
            DueDate = DateTime.UtcNow.AddMonths(3)
        });
        var created = await createResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var goalId = created!["id"]!.ToString()!;

        await _client.PostAsync($"/api/goals/{goalId}/start", null);
        await _client.PostAsync($"/api/goals/{goalId}/cancel", null);
        var response = await _client.PostAsync($"/api/goals/{goalId}/cancel", null);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task StartGoal_WithInvalidId_ReturnsNotFound()
    {
        var response = await _client.PostAsync($"/api/goals/{Guid.NewGuid()}/start", null);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task CancelGoal_WithInvalidId_ReturnsNotFound()
    {
        var response = await _client.PostAsync($"/api/goals/{Guid.NewGuid()}/cancel", null);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
