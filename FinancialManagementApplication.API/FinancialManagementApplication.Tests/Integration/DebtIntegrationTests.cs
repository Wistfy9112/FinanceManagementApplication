using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace FinancialManagementApplication.Tests.Integration;

public class DebtIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public DebtIntegrationTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CreateDebt_WithValidData_ReturnsCreated()
    {
        var accountId = Guid.NewGuid();
        var request = new
        {
            AccountId = accountId,
            Name = "Car Loan",
            TotalDebt = 300_000_000,
            BorrowDate = DateTime.UtcNow.AddMonths(-1),
            DueDate = DateTime.UtcNow.AddYears(3),
            Type = "Borrowed"
        };

        var response = await _client.PostAsJsonAsync("/api/debts", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var debt = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        debt.Should().ContainKey("id");
        debt!["name"]?.ToString().Should().Be("Car Loan");
        debt["remainingAmount"]?.ToString().Should().Be("300000000");
    }

    [Fact]
    public async Task GetDebt_WithValidId_ReturnsDebt()
    {
        var accountId = Guid.NewGuid();
        var createResponse = await _client.PostAsJsonAsync("/api/debts", new
        {
            AccountId = accountId,
            Name = "Get Test",
            TotalDebt = 50_000_000,
            BorrowDate = DateTime.UtcNow.AddMonths(-1),
            Type = "Borrowed"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var debtId = created!["id"]!.ToString()!;

        var response = await _client.GetAsync($"/api/debts/{debtId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetDebt_WithInvalidId_ReturnsNotFound()
    {
        var response = await _client.GetAsync($"/api/debts/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetAllDebts_ReturnsDebts()
    {
        var accountId = Guid.NewGuid();
        await _client.PostAsJsonAsync("/api/debts", new
        {
            AccountId = accountId,
            Name = "Debt 1",
            TotalDebt = 10_000_000,
            BorrowDate = DateTime.UtcNow.AddMonths(-1),
            Type = "Borrowed"
        });

        var response = await _client.GetAsync($"/api/debts/user/{accountId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task UpdateDebt_WithValidData_ReturnsNoContent()
    {
        var accountId = Guid.NewGuid();
        var createResponse = await _client.PostAsJsonAsync("/api/debts", new
        {
            AccountId = accountId,
            Name = "Original",
            TotalDebt = 100_000_000,
            BorrowDate = DateTime.UtcNow.AddMonths(-1),
            Type = "Borrowed"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var debtId = created!["id"]!.ToString()!;

        var response = await _client.PutAsJsonAsync($"/api/debts/{debtId}", new
        {
            Name = "Updated",
            TotalDebt = 120_000_000,
            BorrowDate = DateTime.UtcNow.AddMonths(-1),
            Type = "Borrowed"
        });

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task UpdateDebt_WithInvalidId_ReturnsNotFound()
    {
        var response = await _client.PutAsJsonAsync($"/api/debts/{Guid.NewGuid()}", new
        {
            Name = "Nope",
            TotalDebt = 10_000_000,
            BorrowDate = DateTime.UtcNow.AddMonths(-1),
            Type = "Borrowed"
        });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UpdateDebt_WhenClosed_ReturnsBadRequest()
    {
        var accountId = Guid.NewGuid();
        var createResponse = await _client.PostAsJsonAsync("/api/debts", new
        {
            AccountId = accountId,
            Name = "To Close",
            TotalDebt = 10_000_000,
            BorrowDate = DateTime.UtcNow.AddMonths(-1),
            Type = "Borrowed"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var debtId = created!["id"]!.ToString()!;

        await _client.PostAsync($"/api/debts/{debtId}/close", null);

        var response = await _client.PutAsJsonAsync($"/api/debts/{debtId}", new
        {
            Name = "Should Fail",
            TotalDebt = 20_000_000,
            BorrowDate = DateTime.UtcNow.AddMonths(-1),
            Type = "Borrowed"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task DeleteDebt_WithValidId_ReturnsNoContent()
    {
        var accountId = Guid.NewGuid();
        var createResponse = await _client.PostAsJsonAsync("/api/debts", new
        {
            AccountId = accountId,
            Name = "To Delete",
            TotalDebt = 5_000_000,
            BorrowDate = DateTime.UtcNow.AddMonths(-1),
            Type = "Borrowed"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var debtId = created!["id"]!.ToString()!;

        var response = await _client.DeleteAsync($"/api/debts/{debtId}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task DeleteDebt_WithInvalidId_ReturnsNotFound()
    {
        var response = await _client.DeleteAsync($"/api/debts/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task CloseDebt_WithValidId_ReturnsOk()
    {
        var accountId = Guid.NewGuid();
        var createResponse = await _client.PostAsJsonAsync("/api/debts", new
        {
            AccountId = accountId,
            Name = "Closable",
            TotalDebt = 10_000_000,
            BorrowDate = DateTime.UtcNow.AddMonths(-1),
            Type = "Borrowed"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var debtId = created!["id"]!.ToString()!;

        var response = await _client.PostAsync($"/api/debts/{debtId}/close", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var debt = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        debt!["isClosed"]?.ToString().Should().Be("True");
    }

    [Fact]
    public async Task CloseDebt_WhenAlreadyClosed_ReturnsBadRequest()
    {
        var accountId = Guid.NewGuid();
        var createResponse = await _client.PostAsJsonAsync("/api/debts", new
        {
            AccountId = accountId,
            Name = "Already Closed",
            TotalDebt = 10_000_000,
            BorrowDate = DateTime.UtcNow.AddMonths(-1),
            Type = "Borrowed"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var debtId = created!["id"]!.ToString()!;

        await _client.PostAsync($"/api/debts/{debtId}/close", null);
        var response = await _client.PostAsync($"/api/debts/{debtId}/close", null);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task AddPayment_WithValidData_ReturnsCreated()
    {
        var accountId = Guid.NewGuid();
        var createResponse = await _client.PostAsJsonAsync("/api/debts", new
        {
            AccountId = accountId,
            Name = "Payable",
            TotalDebt = 10_000_000,
            BorrowDate = DateTime.UtcNow.AddMonths(-1),
            Type = "Borrowed"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var debtId = created!["id"]!.ToString()!;

        var paymentRequest = new
        {
            DebtId = debtId,
            Amount = 3_000_000,
            PaymentDate = DateTime.UtcNow
        };

        var response = await _client.PostAsJsonAsync($"/api/debts/{debtId}/payments", paymentRequest);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task AddPayment_WithMismatchedDebtId_ReturnsBadRequest()
    {
        var accountId = Guid.NewGuid();
        var createResponse = await _client.PostAsJsonAsync("/api/debts", new
        {
            AccountId = accountId,
            Name = "Mismatch",
            TotalDebt = 10_000_000,
            BorrowDate = DateTime.UtcNow.AddMonths(-1),
            Type = "Borrowed"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var debtId = created!["id"]!.ToString()!;
        var wrongDebtId = Guid.NewGuid().ToString();

        var paymentRequest = new
        {
            DebtId = wrongDebtId,
            Amount = 1_000_000,
            PaymentDate = DateTime.UtcNow
        };

        var response = await _client.PostAsJsonAsync($"/api/debts/{debtId}/payments", paymentRequest);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task AddPayment_ToClosedDebt_ReturnsBadRequest()
    {
        var accountId = Guid.NewGuid();
        var createResponse = await _client.PostAsJsonAsync("/api/debts", new
        {
            AccountId = accountId,
            Name = "Closed Payment",
            TotalDebt = 10_000_000,
            BorrowDate = DateTime.UtcNow.AddMonths(-1),
            Type = "Borrowed"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var debtId = created!["id"]!.ToString()!;

        await _client.PostAsync($"/api/debts/{debtId}/close", null);

        var paymentRequest = new
        {
            DebtId = debtId,
            Amount = 1_000_000,
            PaymentDate = DateTime.UtcNow
        };

        var response = await _client.PostAsJsonAsync($"/api/debts/{debtId}/payments", paymentRequest);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task AddPayment_WithOverpay_ClosesDebt()
    {
        var accountId = Guid.NewGuid();
        var createResponse = await _client.PostAsJsonAsync("/api/debts", new
        {
            AccountId = accountId,
            Name = "Overpay",
            TotalDebt = 5_000_000,
            BorrowDate = DateTime.UtcNow.AddMonths(-1),
            Type = "Borrowed"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var debtId = created!["id"]!.ToString()!;

        var paymentRequest = new
        {
            DebtId = debtId,
            Amount = 6_000_000,
            PaymentDate = DateTime.UtcNow
        };

        var paymentResponse = await _client.PostAsJsonAsync($"/api/debts/{debtId}/payments", paymentRequest);
        paymentResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var getResponse = await _client.GetAsync($"/api/debts/{debtId}");
        var debt = await getResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        debt!["isClosed"]?.ToString().Should().Be("True");
        debt["remainingAmount"]?.ToString().Should().Be("0");
    }
}
