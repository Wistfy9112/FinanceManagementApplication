using FinancialManagementApplication.API.Controller;
using FinancialManagementApplication.Application.DTOs.CashFlow;
using FinancialManagementApplication.Application.Interface.Services;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace FinancialManagementApplication.Tests.ControllerTests;

public class CashFlowControllerTests
{
    private readonly Mock<ICashFlowGrowthService> _serviceMock;
    private readonly CashFlowController _sut;

    public CashFlowControllerTests()
    {
        _serviceMock = new Mock<ICashFlowGrowthService>();
        _sut = new CashFlowController(_serviceMock.Object);
    }

    [Fact]
    public async Task GetGrowthData_WithYearlyMode_ReturnsOk()
    {
        var accountId = Guid.NewGuid();
        var expectedResponse = new CashFlowGrowthResponse
        {
            Mode = "yearly",
            Data = new List<CashFlowDataPoint>()
        };
        _serviceMock
            .Setup(s => s.GetGrowthDataAsync(accountId, "yearly", null))
            .ReturnsAsync(expectedResponse);

        var result = await _sut.GetGrowthData(accountId, "yearly", null);

        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().Be(expectedResponse);
    }

    [Fact]
    public async Task GetGrowthData_WithMonthlyMode_ReturnsOk()
    {
        var accountId = Guid.NewGuid();
        var expectedResponse = new CashFlowGrowthResponse
        {
            Mode = "monthly",
            Year = 2026,
            Data = new List<CashFlowDataPoint>()
        };
        _serviceMock
            .Setup(s => s.GetGrowthDataAsync(accountId, "monthly", 2026))
            .ReturnsAsync(expectedResponse);

        var result = await _sut.GetGrowthData(accountId, "monthly", 2026);

        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().Be(expectedResponse);
    }

    [Fact]
    public async Task GetGrowthData_WithLast12MonthsMode_ReturnsOk()
    {
        var accountId = Guid.NewGuid();
        var expectedResponse = new CashFlowGrowthResponse
        {
            Mode = "last12months",
            Data = new List<CashFlowDataPoint>()
        };
        _serviceMock
            .Setup(s => s.GetGrowthDataAsync(accountId, "last12months", null))
            .ReturnsAsync(expectedResponse);

        var result = await _sut.GetGrowthData(accountId, "last12months", null);

        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().Be(expectedResponse);
    }

    [Fact]
    public async Task GetGrowthData_WithInvalidMode_ReturnsBadRequest()
    {
        var accountId = Guid.NewGuid();

        var result = await _sut.GetGrowthData(accountId, "invalid", null);

        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().BeEquivalentTo(new { message = "Mode must be 'yearly', 'monthly', or 'last12months'" });
    }

    [Fact]
    public async Task GetGrowthData_WithEmptyMode_ReturnsBadRequest()
    {
        var accountId = Guid.NewGuid();

        var result = await _sut.GetGrowthData(accountId, "", null);

        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
    }

    [Fact]
    public async Task GetGrowthData_PassesYearToService_WhenProvided()
    {
        var accountId = Guid.NewGuid();
        _serviceMock
            .Setup(s => s.GetGrowthDataAsync(accountId, "monthly", 2025))
            .ReturnsAsync(new CashFlowGrowthResponse { Mode = "monthly", Year = 2025, Data = new List<CashFlowDataPoint>() });

        var result = await _sut.GetGrowthData(accountId, "monthly", 2025);

        _serviceMock.Verify(s => s.GetGrowthDataAsync(accountId, "monthly", 2025), Times.Once);
        result.Result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task GetGrowthData_ReturnsActionResultType()
    {
        var accountId = Guid.NewGuid();
        var result = await _sut.GetGrowthData(accountId, "yearly");

        result.Should().BeAssignableTo<ActionResult<CashFlowGrowthResponse>>();
    }
}
