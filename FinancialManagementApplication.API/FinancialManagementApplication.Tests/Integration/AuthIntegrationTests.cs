using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace FinancialManagementApplication.Tests.Integration;

public class AuthIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public AuthIntegrationTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task HealthEndpoint_ReturnsOk()
    {
        var response = await _client.GetAsync("/api/health");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadFromJsonAsync<Dictionary<string, string>>();
        content.Should().ContainKey("status");
        content!["status"].Should().Be("healthy");
    }

    [Fact]
    public async Task Register_WithValidData_ReturnsOkAndToken()
    {
        var request = new
        {
            Email = "newuser@example.com",
            Password = "SecurePass123!",
            DisplayName = "New User"
        };

        var response = await _client.PostAsJsonAsync("/api/auth/register", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadFromJsonAsync<Dictionary<string, string>>();
        content.Should().ContainKey("token");
        content!["token"].Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Register_WithDuplicateEmail_ReturnsBadRequest()
    {
        var request = new
        {
            Email = "duplicate@example.com",
            Password = "SecurePass123!",
            DisplayName = "First User"
        };

        await _client.PostAsJsonAsync("/api/auth/register", request);

        var duplicateRequest = new
        {
            Email = "duplicate@example.com",
            Password = "AnotherPass123!",
            DisplayName = "Second User"
        };

        var response = await _client.PostAsJsonAsync("/api/auth/register", duplicateRequest);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsOkAndToken()
    {
        var registerRequest = new
        {
            Email = "login-test@example.com",
            Password = "MyPassword123!",
            DisplayName = "Login Test"
        };

        var registerResponse = await _client.PostAsJsonAsync("/api/auth/register", registerRequest);
        registerResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var loginRequest = new
        {
            Email = "login-test@example.com",
            Password = "MyPassword123!"
        };

        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);

        loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await loginResponse.Content.ReadFromJsonAsync<Dictionary<string, string>>();
        content.Should().ContainKey("token");
        content!["token"].Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Login_WithInvalidEmail_ReturnsBadRequest()
    {
        var request = new
        {
            Email = "nonexistent@example.com",
            Password = "SomePassword123!"
        };

        var response = await _client.PostAsJsonAsync("/api/auth/login", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Login_WithWrongPassword_ReturnsBadRequest()
    {
        var registerRequest = new
        {
            Email = "wrong-pass@example.com",
            Password = "CorrectPassword123!",
            DisplayName = "Wrong Pass Test"
        };

        await _client.PostAsJsonAsync("/api/auth/register", registerRequest);

        var loginRequest = new
        {
            Email = "wrong-pass@example.com",
            Password = "WrongPassword456!"
        };

        var response = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
