using FinancialManagementApplication.Domain.Entities;
using FinancialManagementApplication.Domain.Enums;
using FinancialManagementApplication.Infrastructure.Repositories;
using FinancialManagementApplication.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace FinancialManagementApplication.Tests.RepositoryTests;

public class GoalRepositoryTests
{
    [Fact]
    public async Task CreateAsync_ShouldCreateAndReturnGoal()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new GoalRepository(context);
        var goal = new Goal
        {
            Id = Guid.NewGuid(),
            AccountId = Guid.NewGuid(),
            Name = "Test Goal",
            TargetAmount = 1_000_000,
            DueDate = DateTime.UtcNow.AddMonths(6),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var result = await repo.CreateAsync(goal);

        result.Should().NotBeNull();
        result.Id.Should().Be(goal.Id);
        result.Name.Should().Be("Test Goal");
        result.Status.Should().Be(GoalStatus.NotStarted);
    }

    [Fact]
    public async Task GetAsync_ShouldReturnGoalById()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new GoalRepository(context);
        var goal = new Goal
        {
            Id = Guid.NewGuid(),
            AccountId = Guid.NewGuid(),
            Name = "Get Test",
            TargetAmount = 500_000,
            DueDate = DateTime.UtcNow.AddMonths(3),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await repo.CreateAsync(goal);

        var result = await repo.GetAsync(goal.Id);

        result.Should().NotBeNull();
        result!.Id.Should().Be(goal.Id);
        result.Name.Should().Be("Get Test");
    }

    [Fact]
    public async Task GetAsync_ShouldReturnNull_WhenNotFound()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new GoalRepository(context);

        var result = await repo.GetAsync(Guid.NewGuid());

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetAllByAccountIdAsync_ShouldReturnGoalsOrderedByDueDate()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new GoalRepository(context);
        var accountId = Guid.NewGuid();
        var laterGoal = new Goal
        {
            Id = Guid.NewGuid(),
            AccountId = accountId,
            Name = "Later",
            TargetAmount = 1000,
            DueDate = DateTime.UtcNow.AddMonths(6),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        var earlierGoal = new Goal
        {
            Id = Guid.NewGuid(),
            AccountId = accountId,
            Name = "Earlier",
            TargetAmount = 2000,
            DueDate = DateTime.UtcNow.AddMonths(1),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await repo.CreateAsync(laterGoal);
        await repo.CreateAsync(earlierGoal);

        var goals = await repo.GetAllByAccountIdAsync(accountId);

        goals.Should().HaveCount(2);
        goals.First().Id.Should().Be(earlierGoal.Id);
        goals.Last().Id.Should().Be(laterGoal.Id);
    }

    [Fact]
    public async Task GetAllByAccountIdAsync_ShouldReturnEmpty_WhenNoGoals()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new GoalRepository(context);

        var goals = await repo.GetAllByAccountIdAsync(Guid.NewGuid());

        goals.Should().BeEmpty();
    }

    [Fact]
    public async Task UpdateAsync_ShouldUpdateGoal()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new GoalRepository(context);
        var goal = new Goal
        {
            Id = Guid.NewGuid(),
            AccountId = Guid.NewGuid(),
            Name = "Original",
            TargetAmount = 1000,
            DueDate = DateTime.UtcNow.AddMonths(3),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await repo.CreateAsync(goal);

        goal.Name = "Updated";
        goal.TargetAmount = 2000;
        var result = await repo.UpdateAsync(goal);

        result.Name.Should().Be("Updated");
        result.TargetAmount.Should().Be(2000);

        var fetched = await repo.GetAsync(goal.Id);
        fetched!.Name.Should().Be("Updated");
    }

    [Fact]
    public async Task DeleteAsync_ShouldRemoveGoalAndReturnTrue()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new GoalRepository(context);
        var goal = new Goal
        {
            Id = Guid.NewGuid(),
            AccountId = Guid.NewGuid(),
            Name = "To Delete",
            TargetAmount = 1000,
            DueDate = DateTime.UtcNow.AddMonths(3),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await repo.CreateAsync(goal);

        var deleted = await repo.DeleteAsync(goal.Id);

        deleted.Should().BeTrue();
        var fetched = await repo.GetAsync(goal.Id);
        fetched.Should().BeNull();
    }

    [Fact]
    public async Task DeleteAsync_ShouldReturnFalse_WhenNotFound()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new GoalRepository(context);

        var deleted = await repo.DeleteAsync(Guid.NewGuid());

        deleted.Should().BeFalse();
    }

    [Fact]
    public async Task StartAsync_ShouldTransitionNotStartedToProcessing()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new GoalRepository(context);
        var goal = new Goal
        {
            Id = Guid.NewGuid(),
            AccountId = Guid.NewGuid(),
            Name = "Start Test",
            TargetAmount = 1000,
            DueDate = DateTime.UtcNow.AddMonths(3),
            Status = GoalStatus.NotStarted,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await repo.CreateAsync(goal);

        var result = await repo.StartAsync(goal.Id);

        result.Should().NotBeNull();
        result!.Status.Should().Be(GoalStatus.Processing);
        result.StartDate.Should().NotBeNull();
    }

    [Fact]
    public async Task StartAsync_ShouldThrow_WhenAlreadyProcessing()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new GoalRepository(context);
        var goal = new Goal
        {
            Id = Guid.NewGuid(),
            AccountId = Guid.NewGuid(),
            Name = "Already Processing",
            TargetAmount = 1000,
            DueDate = DateTime.UtcNow.AddMonths(3),
            Status = GoalStatus.Processing,
            StartDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await repo.CreateAsync(goal);

        var act = () => repo.StartAsync(goal.Id);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Only NotStarted goals can be started.");
    }

    [Fact]
    public async Task StartAsync_ShouldReturnNull_WhenGoalNotFound()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new GoalRepository(context);

        var result = await repo.StartAsync(Guid.NewGuid());

        result.Should().BeNull();
    }

    [Fact]
    public async Task CancelAsync_ShouldTransitionProcessingToCancelled()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new GoalRepository(context);
        var goal = new Goal
        {
            Id = Guid.NewGuid(),
            AccountId = Guid.NewGuid(),
            Name = "Cancel Processing",
            TargetAmount = 1000,
            DueDate = DateTime.UtcNow.AddMonths(3),
            Status = GoalStatus.Processing,
            StartDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await repo.CreateAsync(goal);

        var result = await repo.CancelAsync(goal.Id);

        result.Should().NotBeNull();
        result!.Status.Should().Be(GoalStatus.Cancelled);
    }

    [Fact]
    public async Task CancelAsync_ShouldTransitionNotStartedToCancelled()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new GoalRepository(context);
        var goal = new Goal
        {
            Id = Guid.NewGuid(),
            AccountId = Guid.NewGuid(),
            Name = "Cancel NotStarted",
            TargetAmount = 1000,
            DueDate = DateTime.UtcNow.AddMonths(3),
            Status = GoalStatus.NotStarted,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await repo.CreateAsync(goal);

        var result = await repo.CancelAsync(goal.Id);

        result.Should().NotBeNull();
        result!.Status.Should().Be(GoalStatus.Cancelled);
    }

    [Fact]
    public async Task CancelAsync_ShouldThrow_WhenAlreadyCancelled()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new GoalRepository(context);
        var goal = new Goal
        {
            Id = Guid.NewGuid(),
            AccountId = Guid.NewGuid(),
            Name = "Already Cancelled",
            TargetAmount = 1000,
            DueDate = DateTime.UtcNow.AddMonths(3),
            Status = GoalStatus.Cancelled,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await repo.CreateAsync(goal);

        var act = () => repo.CancelAsync(goal.Id);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Only Processing or NotStarted goals can be cancelled.");
    }

    [Fact]
    public async Task CancelAsync_ShouldThrow_WhenAlreadySuccessed()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new GoalRepository(context);
        var goal = new Goal
        {
            Id = Guid.NewGuid(),
            AccountId = Guid.NewGuid(),
            Name = "Already Successed",
            TargetAmount = 1000,
            DueDate = DateTime.UtcNow.AddMonths(3),
            Status = GoalStatus.Successed,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await repo.CreateAsync(goal);

        var act = () => repo.CancelAsync(goal.Id);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Only Processing or NotStarted goals can be cancelled.");
    }

    [Fact]
    public async Task CancelAsync_ShouldReturnNull_WhenGoalNotFound()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new GoalRepository(context);

        var result = await repo.CancelAsync(Guid.NewGuid());

        result.Should().BeNull();
    }

    [Fact]
    public async Task UpdateStatusAsync_ShouldSetToSuccessed_WhenDueDatePassedAndTargetMet()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new GoalRepository(context);
        var accountId = Guid.NewGuid();

        var asset = new Assets
        {
            Id = Guid.NewGuid(),
            AccountID = accountId,
            Name = "Test Asset",
            CurrentValue = 150_000,
            InitialValue = 100_000
        };
        context.Assets.Add(asset);

        var goal = new Goal
        {
            Id = Guid.NewGuid(),
            AccountId = accountId,
            Name = "Past Due Success",
            TargetAmount = 100_000,
            DueDate = DateTime.UtcNow.AddDays(-1),
            Status = GoalStatus.Processing,
            StartDate = DateTime.UtcNow.AddMonths(-2),
            CreatedAt = DateTime.UtcNow.AddMonths(-2),
            UpdatedAt = DateTime.UtcNow.AddMonths(-2)
        };
        context.Goals.Add(goal);
        await context.SaveChangesAsync();

        await repo.UpdateStatusAsync(accountId);

        var updated = await repo.GetAsync(goal.Id);
        updated!.Status.Should().Be(GoalStatus.Successed);
    }

    [Fact]
    public async Task UpdateStatusAsync_ShouldSetToFailed_WhenDueDatePassedAndTargetNotMet()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new GoalRepository(context);
        var accountId = Guid.NewGuid();

        var asset = new Assets
        {
            Id = Guid.NewGuid(),
            AccountID = accountId,
            Name = "Low Value Asset",
            CurrentValue = 50_000,
            InitialValue = 40_000
        };
        context.Assets.Add(asset);

        var goal = new Goal
        {
            Id = Guid.NewGuid(),
            AccountId = accountId,
            Name = "Past Due Fail",
            TargetAmount = 100_000,
            DueDate = DateTime.UtcNow.AddDays(-1),
            Status = GoalStatus.Processing,
            StartDate = DateTime.UtcNow.AddMonths(-2),
            CreatedAt = DateTime.UtcNow.AddMonths(-2),
            UpdatedAt = DateTime.UtcNow.AddMonths(-2)
        };
        context.Goals.Add(goal);
        await context.SaveChangesAsync();

        await repo.UpdateStatusAsync(accountId);

        var updated = await repo.GetAsync(goal.Id);
        updated!.Status.Should().Be(GoalStatus.Failed);
    }

    [Fact]
    public async Task UpdateStatusAsync_ShouldSetToSuccessed_WhenTargetMetBeforeDueDate()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new GoalRepository(context);
        var accountId = Guid.NewGuid();

        var asset = new Assets
        {
            Id = Guid.NewGuid(),
            AccountID = accountId,
            Name = "High Value Asset",
            CurrentValue = 200_000,
            InitialValue = 150_000
        };
        context.Assets.Add(asset);

        var goal = new Goal
        {
            Id = Guid.NewGuid(),
            AccountId = accountId,
            Name = "Early Success",
            TargetAmount = 100_000,
            DueDate = DateTime.UtcNow.AddMonths(6),
            Status = GoalStatus.Processing,
            StartDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Goals.Add(goal);
        await context.SaveChangesAsync();

        await repo.UpdateStatusAsync(accountId);

        var updated = await repo.GetAsync(goal.Id);
        updated!.Status.Should().Be(GoalStatus.Successed);
    }

    [Fact]
    public async Task UpdateStatusAsync_ShouldNotChangeNonProcessingGoals()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new GoalRepository(context);
        var accountId = Guid.NewGuid();

        var asset = new Assets
        {
            Id = Guid.NewGuid(),
            AccountID = accountId,
            Name = "Asset",
            CurrentValue = 200_000,
            InitialValue = 150_000
        };
        context.Assets.Add(asset);

        var notStarted = new Goal
        {
            Id = Guid.NewGuid(),
            AccountId = accountId,
            Name = "Not Started",
            TargetAmount = 100_000,
            DueDate = DateTime.UtcNow.AddDays(-1),
            Status = GoalStatus.NotStarted,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        var cancelled = new Goal
        {
            Id = Guid.NewGuid(),
            AccountId = accountId,
            Name = "Cancelled",
            TargetAmount = 100_000,
            DueDate = DateTime.UtcNow.AddDays(-1),
            Status = GoalStatus.Cancelled,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Goals.Add(notStarted);
        context.Goals.Add(cancelled);
        await context.SaveChangesAsync();

        await repo.UpdateStatusAsync(accountId);

        var fetchedNotStarted = await repo.GetAsync(notStarted.Id);
        var fetchedCancelled = await repo.GetAsync(cancelled.Id);
        fetchedNotStarted!.Status.Should().Be(GoalStatus.NotStarted);
        fetchedCancelled!.Status.Should().Be(GoalStatus.Cancelled);
    }

    [Fact]
    public async Task UpdateStatusAsync_ShouldProcessAllProcessingGoals()
    {
        using var context = InMemoryDbContextFactory.Create();
        var repo = new GoalRepository(context);
        var accountId = Guid.NewGuid();

        var asset = new Assets
        {
            Id = Guid.NewGuid(),
            AccountID = accountId,
            Name = "Asset",
            CurrentValue = 80_000,
            InitialValue = 60_000
        };
        context.Assets.Add(asset);

        var successGoal = new Goal
        {
            Id = Guid.NewGuid(),
            AccountId = accountId,
            Name = "Will Succeed",
            TargetAmount = 70_000,
            DueDate = DateTime.UtcNow.AddDays(-1),
            Status = GoalStatus.Processing,
            StartDate = DateTime.UtcNow.AddMonths(-1),
            CreatedAt = DateTime.UtcNow.AddMonths(-1),
            UpdatedAt = DateTime.UtcNow.AddMonths(-1)
        };
        var failGoal = new Goal
        {
            Id = Guid.NewGuid(),
            AccountId = accountId,
            Name = "Will Fail",
            TargetAmount = 100_000,
            DueDate = DateTime.UtcNow.AddDays(-1),
            Status = GoalStatus.Processing,
            StartDate = DateTime.UtcNow.AddMonths(-1),
            CreatedAt = DateTime.UtcNow.AddMonths(-1),
            UpdatedAt = DateTime.UtcNow.AddMonths(-1)
        };
        context.Goals.Add(successGoal);
        context.Goals.Add(failGoal);
        await context.SaveChangesAsync();

        await repo.UpdateStatusAsync(accountId);

        var updatedSuccess = await repo.GetAsync(successGoal.Id);
        var updatedFail = await repo.GetAsync(failGoal.Id);
        updatedSuccess!.Status.Should().Be(GoalStatus.Successed);
        updatedFail!.Status.Should().Be(GoalStatus.Failed);
    }
}
