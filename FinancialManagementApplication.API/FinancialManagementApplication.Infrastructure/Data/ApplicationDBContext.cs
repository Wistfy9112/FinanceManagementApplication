using FinanceManagementApplication.Domain.Entities;
using FinancialManagementApplication.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using System.Collections.Generic;
using FinancialManagementApplication.Domain.Enums;

namespace FinancialManagementApplication.Infrastructure.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Assets> Assets => Set<Assets>();
    public DbSet<Portfolio> Portfolio => Set<Portfolio>();
    public DbSet<PortfolioAllocation> PortfolioAllocations => Set<PortfolioAllocation>();
    public DbSet<AssetHistory> AssetHistories => Set<AssetHistory>();
    public DbSet<AllocationHistory> AllocationHistories => Set<AllocationHistory>();
    public DbSet<AssetHistoryDetail> AssetHistoryDetails => Set<AssetHistoryDetail>();
    public DbSet<PortfolioAllocationHistory> PortfolioAllocationHistories => Set<PortfolioAllocationHistory>();
    public DbSet<PortfolioAllocationHistoryDetail> PortfolioAllocationHistoryDetails => Set<PortfolioAllocationHistoryDetail>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        var assetTypeConverter = new ValueConverter<AssetType, string>(
            v => v.ToString(),
            v => (AssetType)Enum.Parse(typeof(AssetType), v)
        );

        modelBuilder.Entity<Assets>(entity =>
        {
            entity.Property(e => e.Type).HasConversion(assetTypeConverter);
        });

        // Configure relationships
        modelBuilder.Entity<Account>()
            .HasMany(a => a.Assets)
            .WithOne(u => u.Account)
            .HasForeignKey(a => a.AccountID);

        modelBuilder.Entity<Account>()
            .HasMany(a => a.Portfolios)
            .WithOne(p => p.Account)
            .HasForeignKey(p => p.AccountID);

        modelBuilder.Entity<Portfolio>()
            .HasMany(p => p.PortfolioAllocations)
            .WithOne(pa => pa.Portfolio)
            .HasForeignKey(pa => pa.PortfolioId);

        modelBuilder.Entity<PortfolioAllocation>()
            .HasOne(pa => pa.Asset)
            .WithOne(a => a.PortfolioAllocation)
            .HasForeignKey<PortfolioAllocation>(pa => pa.AssetId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<AllocationHistory>()
            .HasOne(ah => ah.Allocation)
            .WithMany()
            .HasForeignKey(ah => ah.AllocationId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<AssetHistoryDetail>()
            .HasOne(d => d.AssetHistory)
            .WithMany(ah => ah.Details)
            .HasForeignKey(d => d.AssetHistoryId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PortfolioAllocationHistoryDetail>()
            .HasOne(d => d.PortfolioAllocationHistory)
            .WithMany(ah => ah.Details)
            .HasForeignKey(d => d.PortfolioAllocationHistoryId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
