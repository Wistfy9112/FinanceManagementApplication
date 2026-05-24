using FinanceManagementApplication.Domain.Entities;
using FinancialManagementApplication.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;

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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
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
    }
}