using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace FinancialManagementApplication.Infrastructure.Data;

public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();

        var connStr = Environment.GetEnvironmentVariable("CONNECTIONSTRINGS__DEFAULTCONNECTION");

        if (string.IsNullOrEmpty(connStr))
        {
            var config = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: true)
                .Build();
            connStr = config.GetConnectionString("DefaultConnection");
        }

        optionsBuilder.UseNpgsql(connStr!);

        return new ApplicationDbContext(optionsBuilder.Options);
    }
}
