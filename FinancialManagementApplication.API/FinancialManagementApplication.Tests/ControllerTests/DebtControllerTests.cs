using FinancialManagementApplication.API.Controller;
using FinancialManagementApplication.Application.DTOs.Debt;
using FinancialManagementApplication.Application.Interface.Repositories;
using FinancialManagementApplication.Domain.Entities;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace FinancialManagementApplication.Tests.ControllerTests;

public class DebtControllerTests
{
    private readonly Mock<IDebtRepository> _repoMock;
    private readonly DebtController _sut;

    public DebtControllerTests()
    {
        _repoMock = new Mock<IDebtRepository>();
        _sut = new DebtController(_repoMock.Object);
    }

    [Fact]
    public async Task GetDebt_WithValidId_ReturnsOk()
    {
        var id = Guid.NewGuid();
        var debt = new Debt
        {
            Id = id,
            AccountId = Guid.NewGuid(),
            Name = "Test Debt"
        };

        _repoMock
            .Setup(r => r.GetAsync(id))
            .ReturnsAsync(debt);

        var result = await _sut.GetDebt(id);

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().Be(debt);
    }

    [Fact]
    public async Task GetDebt_WithInvalidId_ReturnsNotFound()
    {
        _repoMock
            .Setup(r => r.GetAsync(It.IsAny<Guid>()))
            .ReturnsAsync((Debt?)null);

        var result = await _sut.GetDebt(Guid.NewGuid());

        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task GetAllDebts_ReturnsOk()
    {
        var userId = Guid.NewGuid();
        var debts = new List<Debt>
        {
            new Debt { Id = Guid.NewGuid(), Name = "Debt 1" },
            new Debt { Id = Guid.NewGuid(), Name = "Debt 2" }
        };

        _repoMock
            .Setup(r => r.GetAllByAccountIdAsync(userId))
            .Returns(Task.FromResult<IEnumerable<Debt>>(debts));

        var result = await _sut.GetAllDebts(userId);

        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().Be(debts);
    }

    [Fact]
    public async Task DeleteDebt_WithValidId_ReturnsNoContent()
    {
        var id = Guid.NewGuid();
        var debt = new Debt { Id = id, Name = "To Delete" };

        _repoMock
            .Setup(r => r.GetAsync(id))
            .ReturnsAsync(debt);
        _repoMock
            .Setup(r => r.DeleteAsync(id))
            .ReturnsAsync(true);

        var result = await _sut.DeleteDebt(id);

        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task DeleteDebt_WithInvalidId_ReturnsNotFound()
    {
        _repoMock
            .Setup(r => r.GetAsync(It.IsAny<Guid>()))
            .ReturnsAsync((Debt?)null);

        var result = await _sut.DeleteDebt(Guid.NewGuid());

        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task CloseDebt_WithValidId_ReturnsOk()
    {
        var id = Guid.NewGuid();
        var debt = new Debt
        {
            Id = id,
            Name = "Open Debt",
            IsClosed = false,
            RemainingAmount = 100_000
        };

        _repoMock
            .Setup(r => r.GetAsync(id))
            .ReturnsAsync(debt);

        var result = await _sut.CloseDebt(id);

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var updatedDebt = okResult.Value.Should().BeOfType<Debt>().Subject;
        updatedDebt.IsClosed.Should().BeTrue();
        updatedDebt.RemainingAmount.Should().Be(0);
    }

    [Fact]
    public async Task CloseDebt_WithInvalidId_ReturnsNotFound()
    {
        _repoMock
            .Setup(r => r.GetAsync(It.IsAny<Guid>()))
            .ReturnsAsync((Debt?)null);

        var result = await _sut.CloseDebt(Guid.NewGuid());

        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task CloseDebt_WhenAlreadyClosed_ReturnsBadRequest()
    {
        var id = Guid.NewGuid();
        var debt = new Debt
        {
            Id = id,
            Name = "Closed Debt",
            IsClosed = true
        };

        _repoMock
            .Setup(r => r.GetAsync(id))
            .ReturnsAsync(debt);

        var result = await _sut.CloseDebt(id);

        var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.Should().BeEquivalentTo(new { Message = "Debt is already closed." });
    }

    [Fact]
    public async Task UpdateDebt_WithValidData_ReturnsNoContent()
    {
        var id = Guid.NewGuid();
        var debt = new Debt
        {
            Id = id,
            Name = "Old Debt",
            TotalDebt = 100_000,
            PaidAmount = 10_000,
            RemainingAmount = 90_000,
            IsClosed = false,
            BorrowDate = DateTime.UtcNow.AddMonths(-1)
        };

        _repoMock
            .Setup(r => r.GetAsync(id))
            .ReturnsAsync(debt);

        var dto = new UpdateDebtDTO
        {
            Name = "Updated Debt",
            TotalDebt = 200_000,
            BorrowDate = DateTime.UtcNow,
            DueDate = DateTime.UtcNow.AddMonths(6)
        };

        var result = await _sut.UpdateDebt(id, dto);

        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task UpdateDebt_WithInvalidId_ReturnsNotFound()
    {
        _repoMock
            .Setup(r => r.GetAsync(It.IsAny<Guid>()))
            .ReturnsAsync((Debt?)null);

        var result = await _sut.UpdateDebt(Guid.NewGuid(), new UpdateDebtDTO
        {
            Name = "Name",
            TotalDebt = 1000,
            BorrowDate = DateTime.UtcNow
        });

        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task UpdateDebt_WhenClosed_ReturnsBadRequest()
    {
        var id = Guid.NewGuid();
        var debt = new Debt
        {
            Id = id,
            Name = "Closed Debt",
            IsClosed = true
        };

        _repoMock
            .Setup(r => r.GetAsync(id))
            .ReturnsAsync(debt);

        var dto = new UpdateDebtDTO
        {
            Name = "Updated",
            TotalDebt = 1000,
            BorrowDate = DateTime.UtcNow
        };

        var result = await _sut.UpdateDebt(id, dto);

        var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.Should().BeEquivalentTo(new { Message = "Cannot update a closed debt." });
    }

    [Fact]
    public async Task UpdateDebt_WhenRemainingAmountIsZero_ClosesDebt()
    {
        var id = Guid.NewGuid();
        var debt = new Debt
        {
            Id = id,
            Name = "Fully Paid",
            TotalDebt = 50_000,
            PaidAmount = 50_000,
            RemainingAmount = 0,
            IsClosed = false,
            BorrowDate = DateTime.UtcNow.AddMonths(-1)
        };

        _repoMock
            .Setup(r => r.GetAsync(id))
            .ReturnsAsync(debt);

        var dto = new UpdateDebtDTO
        {
            Name = "Fully Paid",
            TotalDebt = 50_000,
            BorrowDate = debt.BorrowDate
        };

        await _sut.UpdateDebt(id, dto);

        debt.IsClosed.Should().BeTrue();
        debt.RemainingAmount.Should().Be(0);
    }

    [Fact]
    public async Task AddPayment_WithMismatchedDebtId_ReturnsBadRequest()
    {
        var debtId = Guid.NewGuid();
        var dto = new CreateDebtPaymentDTO
        {
            DebtId = Guid.NewGuid(),
            Amount = 10_000
        };

        var result = await _sut.AddPayment(debtId, dto);

        var badRequest = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.Should().BeEquivalentTo(new { Message = "Debt ID mismatch." });
    }

    [Fact]
    public async Task AddPayment_WithValidData_ReturnsCreated()
    {
        var debtId = Guid.NewGuid();
        var dto = new CreateDebtPaymentDTO
        {
            DebtId = debtId,
            Amount = 10_000
        };

        var payment = new DebtPayment
        {
            Id = Guid.NewGuid(),
            DebtId = debtId,
            Amount = 10_000,
            CreatedAt = DateTime.UtcNow
        };

        _repoMock
            .Setup(r => r.AddPaymentAsync(It.IsAny<DebtPayment>()))
            .ReturnsAsync(payment);

        var result = await _sut.AddPayment(debtId, dto);

        var createdResult = result.Result.Should().BeOfType<CreatedAtActionResult>().Subject;
        createdResult.Value.Should().Be(payment);
    }
}
