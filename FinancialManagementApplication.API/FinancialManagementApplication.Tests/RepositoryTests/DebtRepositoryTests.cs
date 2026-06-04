using FinancialManagementApplication.Domain.Entities;
using FinancialManagementApplication.Domain.Enums;
using FinancialManagementApplication.Infrastructure.Repositories;
using FinancialManagementApplication.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace FinancialManagementApplication.Tests.RepositoryTests;

public class DebtRepositoryTests
{
    [Fact]
    public async Task CreateAsync_ShouldCreateAndReturnDebt()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new DebtRepository(context);
        var debt = new Debt
        {
            Id = Guid.NewGuid(),
            AccountId = Guid.NewGuid(),
            Name = "Test Loan",
            TotalDebt = 10_000_000,
            PaidAmount = 0,
            RemainingAmount = 10_000_000,
            BorrowDate = DateTime.UtcNow.AddMonths(-1),
            Type = DebtType.Borrowed,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var result = await repo.CreateAsync(debt);

        result.Should().NotBeNull();
        result.Id.Should().Be(debt.Id);
        result.Name.Should().Be("Test Loan");
        result.RemainingAmount.Should().Be(10_000_000);
        result.IsClosed.Should().BeFalse();
    }

    [Fact]
    public async Task GetAsync_ShouldReturnDebtWithPayments()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new DebtRepository(context);
        var debtId = Guid.NewGuid();
        var debt = new Debt
        {
            Id = debtId,
            AccountId = Guid.NewGuid(),
            Name = "Get Test",
            TotalDebt = 5_000_000,
            PaidAmount = 1_000_000,
            RemainingAmount = 4_000_000,
            BorrowDate = DateTime.UtcNow.AddMonths(-1),
            Type = DebtType.Borrowed,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Debts.Add(debt);
        context.DebtPayments.Add(new DebtPayment
        {
            Id = Guid.NewGuid(),
            DebtId = debtId,
            Amount = 1_000_000,
            PaymentDate = DateTime.UtcNow.AddDays(-10),
            RemainingAfterPayment = 4_000_000,
            CreatedAt = DateTime.UtcNow.AddDays(-10)
        });
        await context.SaveChangesAsync();

        var result = await repo.GetAsync(debtId);

        result.Should().NotBeNull();
        result!.Name.Should().Be("Get Test");
        result.Payments.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetAsync_ShouldReturnNull_WhenNotFound()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new DebtRepository(context);

        var result = await repo.GetAsync(Guid.NewGuid());

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetAllByAccountIdAsync_ShouldReturnDebtsOrderedByCreatedAtDesc()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new DebtRepository(context);
        var accountId = Guid.NewGuid();
        var older = new Debt
        {
            Id = Guid.NewGuid(),
            AccountId = accountId,
            Name = "Older",
            TotalDebt = 1000,
            PaidAmount = 0,
            RemainingAmount = 1000,
            BorrowDate = DateTime.UtcNow.AddMonths(-2),
            Type = DebtType.Borrowed,
            CreatedAt = DateTime.UtcNow.AddDays(-10),
            UpdatedAt = DateTime.UtcNow.AddDays(-10)
        };
        var newer = new Debt
        {
            Id = Guid.NewGuid(),
            AccountId = accountId,
            Name = "Newer",
            TotalDebt = 2000,
            PaidAmount = 0,
            RemainingAmount = 2000,
            BorrowDate = DateTime.UtcNow.AddMonths(-1),
            Type = DebtType.Lent,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Debts.Add(older);
        context.Debts.Add(newer);
        await context.SaveChangesAsync();

        var results = await repo.GetAllByAccountIdAsync(accountId);

        results.Should().HaveCount(2);
        results.First().Id.Should().Be(newer.Id);
        results.Last().Id.Should().Be(older.Id);
    }

    [Fact]
    public async Task UpdateAsync_ShouldUpdateDebt()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new DebtRepository(context);
        var debt = new Debt
        {
            Id = Guid.NewGuid(),
            AccountId = Guid.NewGuid(),
            Name = "Original",
            TotalDebt = 5000,
            PaidAmount = 0,
            RemainingAmount = 5000,
            BorrowDate = DateTime.UtcNow.AddMonths(-1),
            Type = DebtType.Borrowed,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await repo.CreateAsync(debt);

        debt.Name = "Updated";
        debt.TotalDebt = 8000;
        debt.RemainingAmount = 8000;
        var result = await repo.UpdateAsync(debt);

        result.Name.Should().Be("Updated");
        result.TotalDebt.Should().Be(8000);

        var fetched = await repo.GetAsync(debt.Id);
        fetched!.Name.Should().Be("Updated");
    }

    [Fact]
    public async Task DeleteAsync_ShouldRemoveDebtAndReturnTrue()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new DebtRepository(context);
        var debt = new Debt
        {
            Id = Guid.NewGuid(),
            AccountId = Guid.NewGuid(),
            Name = "To Delete",
            TotalDebt = 1000,
            PaidAmount = 0,
            RemainingAmount = 1000,
            BorrowDate = DateTime.UtcNow,
            Type = DebtType.Borrowed,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await repo.CreateAsync(debt);

        var deleted = await repo.DeleteAsync(debt.Id);

        deleted.Should().BeTrue();
        var fetched = await repo.GetAsync(debt.Id);
        fetched.Should().BeNull();
    }

    [Fact]
    public async Task DeleteAsync_ShouldReturnFalse_WhenNotFound()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new DebtRepository(context);

        var deleted = await repo.DeleteAsync(Guid.NewGuid());

        deleted.Should().BeFalse();
    }

    [Fact]
    public async Task AddPaymentAsync_ShouldAddPaymentAndUpdateAmounts()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new DebtRepository(context);
        var debtId = Guid.NewGuid();
        var debt = new Debt
        {
            Id = debtId,
            AccountId = Guid.NewGuid(),
            Name = "Payment Test",
            TotalDebt = 10_000_000,
            PaidAmount = 0,
            RemainingAmount = 10_000_000,
            BorrowDate = DateTime.UtcNow.AddMonths(-1),
            Type = DebtType.Borrowed,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Debts.Add(debt);
        await context.SaveChangesAsync();

        var payment = new DebtPayment
        {
            Id = Guid.NewGuid(),
            DebtId = debtId,
            Amount = 3_000_000,
            PaymentDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        var result = await repo.AddPaymentAsync(payment);

        result.Should().NotBeNull();
        result.Id.Should().Be(payment.Id);

        var updatedDebt = await repo.GetAsync(debtId);
        updatedDebt!.PaidAmount.Should().Be(3_000_000);
        updatedDebt.RemainingAmount.Should().Be(7_000_000);
        updatedDebt.IsClosed.Should().BeFalse();
    }

    [Fact]
    public async Task AddPaymentAsync_ShouldAutoClose_WhenRemainingReachesZero()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new DebtRepository(context);
        var debtId = Guid.NewGuid();
        var debt = new Debt
        {
            Id = debtId,
            AccountId = Guid.NewGuid(),
            Name = "Auto Close",
            TotalDebt = 5_000_000,
            PaidAmount = 0,
            RemainingAmount = 5_000_000,
            BorrowDate = DateTime.UtcNow.AddMonths(-1),
            Type = DebtType.Borrowed,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Debts.Add(debt);
        await context.SaveChangesAsync();

        var payment = new DebtPayment
        {
            Id = Guid.NewGuid(),
            DebtId = debtId,
            Amount = 5_000_000,
            PaymentDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        await repo.AddPaymentAsync(payment);

        var updatedDebt = await repo.GetAsync(debtId);
        updatedDebt!.PaidAmount.Should().Be(5_000_000);
        updatedDebt.RemainingAmount.Should().Be(0);
        updatedDebt.IsClosed.Should().BeTrue();
    }

    [Fact]
    public async Task AddPaymentAsync_ShouldAutoClose_WhenOverpayment()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new DebtRepository(context);
        var debtId = Guid.NewGuid();
        var debt = new Debt
        {
            Id = debtId,
            AccountId = Guid.NewGuid(),
            Name = "Overpay",
            TotalDebt = 5_000_000,
            PaidAmount = 0,
            RemainingAmount = 5_000_000,
            BorrowDate = DateTime.UtcNow.AddMonths(-1),
            Type = DebtType.Borrowed,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Debts.Add(debt);
        await context.SaveChangesAsync();

        var payment = new DebtPayment
        {
            Id = Guid.NewGuid(),
            DebtId = debtId,
            Amount = 6_000_000,
            PaymentDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        await repo.AddPaymentAsync(payment);

        var updatedDebt = await repo.GetAsync(debtId);
        updatedDebt!.PaidAmount.Should().Be(6_000_000);
        updatedDebt.RemainingAmount.Should().Be(0);
        updatedDebt.IsClosed.Should().BeTrue();
    }

    [Fact]
    public async Task AddPaymentAsync_ShouldThrow_WhenDebtNotFound()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new DebtRepository(context);
        var payment = new DebtPayment
        {
            Id = Guid.NewGuid(),
            DebtId = Guid.NewGuid(),
            Amount = 1000,
            PaymentDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        var act = () => repo.AddPaymentAsync(payment);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Debt not found.");
    }

    [Fact]
    public async Task AddPaymentAsync_ShouldThrow_WhenDebtIsClosed()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new DebtRepository(context);
        var debtId = Guid.NewGuid();
        var debt = new Debt
        {
            Id = debtId,
            AccountId = Guid.NewGuid(),
            Name = "Closed Debt",
            TotalDebt = 1000,
            PaidAmount = 1000,
            RemainingAmount = 0,
            IsClosed = true,
            BorrowDate = DateTime.UtcNow.AddMonths(-1),
            Type = DebtType.Borrowed,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Debts.Add(debt);
        await context.SaveChangesAsync();

        var payment = new DebtPayment
        {
            Id = Guid.NewGuid(),
            DebtId = debtId,
            Amount = 1000,
            PaymentDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        var act = () => repo.AddPaymentAsync(payment);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Cannot add payment to a closed debt.");
    }

    [Fact]
    public async Task AddPaymentAsync_ShouldSetRemainingAfterPayment()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new DebtRepository(context);
        var debtId = Guid.NewGuid();
        var debt = new Debt
        {
            Id = debtId,
            AccountId = Guid.NewGuid(),
            Name = "Remaining Check",
            TotalDebt = 10_000_000,
            PaidAmount = 2_000_000,
            RemainingAmount = 8_000_000,
            BorrowDate = DateTime.UtcNow.AddMonths(-1),
            Type = DebtType.Borrowed,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Debts.Add(debt);
        await context.SaveChangesAsync();

        var payment = new DebtPayment
        {
            Id = Guid.NewGuid(),
            DebtId = debtId,
            Amount = 3_000_000,
            PaymentDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        var result = await repo.AddPaymentAsync(payment);

        result.RemainingAfterPayment.Should().Be(5_000_000);

        var updatedDebt = await repo.GetAsync(debtId);
        updatedDebt!.PaidAmount.Should().Be(5_000_000);
        updatedDebt.RemainingAmount.Should().Be(5_000_000);
    }

    [Fact]
    public async Task CloseDebtAsync_ShouldMarkDebtAsClosed()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new DebtRepository(context);
        var debtId = Guid.NewGuid();
        var debt = new Debt
        {
            Id = debtId,
            AccountId = Guid.NewGuid(),
            Name = "Close Test",
            TotalDebt = 5000,
            PaidAmount = 0,
            RemainingAmount = 5000,
            BorrowDate = DateTime.UtcNow,
            Type = DebtType.Lent,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Debts.Add(debt);
        await context.SaveChangesAsync();

        await repo.CloseDebtAsync(debtId);

        var updated = await repo.GetAsync(debtId);
        updated!.IsClosed.Should().BeTrue();
    }

    [Fact]
    public async Task CloseDebtAsync_ShouldThrow_WhenDebtNotFound()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new DebtRepository(context);

        var act = () => repo.CloseDebtAsync(Guid.NewGuid());

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Debt not found.");
    }
}
