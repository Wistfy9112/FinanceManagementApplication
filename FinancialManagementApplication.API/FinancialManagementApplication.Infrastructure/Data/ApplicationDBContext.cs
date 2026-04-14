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
    public DbSet<User> Users => Set<User>();
    public DbSet<ExpenseCategory> Categories => Set<ExpenseCategory>();
    public DbSet<ExpenseInformation> Expenses => Set<ExpenseInformation>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        // Configure relationships
        modelBuilder.Entity<Account>()
            .HasOne(a => a.User)
            .WithOne(u => u.Account)
            .HasForeignKey<User>(u => u.Account.AccountID);

        modelBuilder.Entity<Account>()
            .HasMany(a => a.ExpenseCategories)
            .WithOne(ec => ec.Account)
            .HasForeignKey(ec => ec.Account.AccountID);

        modelBuilder.Entity<ExpenseCategory>()
            .HasMany(ec => ec.ExpenseInformations)
            .WithOne(ei => ei.ExpenseCategory)
            .HasForeignKey(ei => ei.ExpenseCategory.CategoryID);
    }
}