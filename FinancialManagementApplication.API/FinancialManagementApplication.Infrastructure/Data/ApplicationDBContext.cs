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
}