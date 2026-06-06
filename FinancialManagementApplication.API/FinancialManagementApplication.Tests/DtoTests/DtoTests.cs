using FinancialManagementApplication.Application.DTOs.Asset;
using FinancialManagementApplication.Application.DTOs.Auth;
using FinancialManagementApplication.Application.DTOs.Debt;
using FinancialManagementApplication.Application.DTOs.Goal;
using FinancialManagementApplication.Application.DTOs.Portfolio;
using FinancialManagementApplication.Application.DTOs.PortfolioAllocation;
using FinancialManagementApplication.Domain.Enums;
using FluentAssertions;

namespace FinancialManagementApplication.Tests.DtoTests;

public class DtoTests
{
    [Fact]
    public void AssetDTO_ShouldSetProperties()
    {
        var dto = new AssetDTO
        {
            Id = Guid.NewGuid(),
            AccountID = Guid.NewGuid(),
            Name = "Test Asset",
            InitialValue = 100_000,
            CurrentValue = 150_000,
            Type = AssetType.Investment
        };

        dto.Name.Should().Be("Test Asset");
        dto.InitialValue.Should().Be(100_000);
        dto.CurrentValue.Should().Be(150_000);
        dto.Type.Should().Be(AssetType.Investment);
    }

    [Fact]
    public void PortfolioDTO_ShouldSetProperties()
    {
        var dto = new PortfolioDTO
        {
            Id = Guid.NewGuid(),
            AccountID = Guid.NewGuid(),
            Name = "Test Portfolio",
            Amount = 500_000_000
        };

        dto.Name.Should().Be("Test Portfolio");
        dto.Amount.Should().Be(500_000_000);
    }

    [Fact]
    public void PortfolioAllocationDTO_ShouldSetProperties()
    {
        var now = DateTime.UtcNow;
        var assetId = Guid.NewGuid();
        var dto = new PortfolioAllocationDTO
        {
            Id = Guid.NewGuid(),
            PortfolioId = Guid.NewGuid(),
            FinancialCategory = "Stocks",
            Name = "Tech Stocks",
            CurrentAmount = 60_000_000,
            TargetPercentage = 60,
            UpdateAt = now,
            AssetType = AssetType.Investment,
            AssetId = assetId
        };

        dto.FinancialCategory.Should().Be("Stocks");
        dto.Name.Should().Be("Tech Stocks");
        dto.CurrentAmount.Should().Be(60_000_000);
        dto.TargetPercentage.Should().Be(60);
        dto.UpdateAt.Should().Be(now);
        dto.AssetType.Should().Be(AssetType.Investment);
        dto.AssetId.Should().Be(assetId);
    }

    [Fact]
    public void PortfolioAllocationDTO_DefaultAssetType_ShouldBeSaving()
    {
        var dto = new PortfolioAllocationDTO();

        dto.AssetType.Should().Be(AssetType.Saving);
    }

    [Fact]
    public void GoalDTO_ShouldSetProperties()
    {
        var now = DateTime.UtcNow;
        var dto = new GoalDTO
        {
            Id = Guid.NewGuid(),
            AccountId = Guid.NewGuid(),
            Name = "Test Goal",
            TargetAmount = 10_000_000,
            StartDate = now,
            DueDate = now.AddMonths(6),
            Status = GoalStatus.Processing,
            CreatedAt = now,
            UpdatedAt = now
        };

        dto.Name.Should().Be("Test Goal");
        dto.TargetAmount.Should().Be(10_000_000);
        dto.StartDate.Should().Be(now);
        dto.Status.Should().Be(GoalStatus.Processing);
        dto.CreatedAt.Should().Be(now);
        dto.UpdatedAt.Should().Be(now);
    }

    [Fact]
    public void DebtDTO_ShouldSetProperties()
    {
        var now = DateTime.UtcNow;
        var dto = new DebtDTO
        {
            Id = Guid.NewGuid(),
            AccountId = Guid.NewGuid(),
            Name = "Test Loan",
            TotalDebt = 50_000_000,
            PaidAmount = 10_000_000,
            RemainingAmount = 40_000_000,
            BorrowDate = now.AddMonths(-1),
            DueDate = now.AddMonths(11),
            Note = "Test note",
            Description = "Test description",
            Type = "Borrowed",
            IsClosed = false,
            CreatedAt = now,
            UpdatedAt = now
        };

        dto.Name.Should().Be("Test Loan");
        dto.TotalDebt.Should().Be(50_000_000);
        dto.RemainingAmount.Should().Be(40_000_000);
        dto.BorrowDate.Should().Be(now.AddMonths(-1));
        dto.DueDate.Should().Be(now.AddMonths(11));
        dto.Note.Should().Be("Test note");
        dto.Description.Should().Be("Test description");
        dto.Type.Should().Be("Borrowed");
        dto.IsClosed.Should().BeFalse();
        dto.CreatedAt.Should().Be(now);
        dto.UpdatedAt.Should().Be(now);
    }

    [Fact]
    public void DebtPaymentDTO_ShouldSetProperties()
    {
        var now = DateTime.UtcNow;
        var dto = new DebtPaymentDTO
        {
            Id = Guid.NewGuid(),
            DebtId = Guid.NewGuid(),
            Amount = 5_000_000,
            PaymentDate = now,
            RemainingAfterPayment = 35_000_000,
            Note = "Payment note",
            CreatedAt = now
        };

        dto.Amount.Should().Be(5_000_000);
        dto.RemainingAfterPayment.Should().Be(35_000_000);
        dto.PaymentDate.Should().Be(now);
        dto.Note.Should().Be("Payment note");
        dto.CreatedAt.Should().Be(now);
    }

    [Fact]
    public void DebtDTO_Payments_ShouldDefaultToEmptyList()
    {
        var dto = new DebtDTO();

        dto.Payments.Should().NotBeNull();
        dto.Payments.Should().BeEmpty();
    }

    [Fact]
    public void UpdateProfileDTO_ShouldSetDisplayName()
    {
        var dto = new UpdateProfileDTO { DisplayName = "New Name" };

        dto.DisplayName.Should().Be("New Name");
    }

    [Fact]
    public void ChangePasswordDTO_ShouldSetProperties()
    {
        var dto = new ChangePasswordDTO
        {
            CurrentPassword = "old",
            NewPassword = "new"
        };

        dto.CurrentPassword.Should().Be("old");
        dto.NewPassword.Should().Be("new");
    }

    [Fact]
    public void UserProfileDTO_ShouldSetProperties()
    {
        var now = DateTime.UtcNow;
        var dto = new UserProfileDTO
        {
            AccountId = Guid.NewGuid(),
            Email = "user@test.com",
            DisplayName = "Test User",
            CreateAt = now,
            UpdateAt = now
        };

        dto.Email.Should().Be("user@test.com");
        dto.DisplayName.Should().Be("Test User");
        dto.CreateAt.Should().Be(now);
        dto.UpdateAt.Should().Be(now);
    }
}
