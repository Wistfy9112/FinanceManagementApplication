using FinanceManagementApplication.Application.Interface.Repositories;
using FinancialManagementApplication.Application.Interface.Repositories;
using FinancialManagementApplication.Application.Interface.Securitiy;
using FinancialManagementApplication.Application.Interface.Services;
using FinancialManagementApplication.Application.Services;
using FinancialManagementApplication.Infrastructure.Data;
using FinancialManagementApplication.Infrastructure.Repositories;
using FinancialManagementApplication.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        opts.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Configuration
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .AddEnvironmentVariables();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<IAccountRepository, AccountRepository>();
builder.Services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();
builder.Services.AddScoped<IAssetsRepository, AssetsRepository>();
builder.Services.AddScoped<IPortfolioRepository, PortfolioRepository>();
builder.Services.AddScoped<IPortfolioAllocationRepository, PortfolioAllocationRepository>();
builder.Services.AddScoped<ICashFlowGrowthService, CashFlowGrowthService>();
builder.Services.AddScoped<IGoalRepository, GoalRepository>();
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection")
    )
);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy
                .AllowAnyOrigin()
                .AllowAnyHeader()
                .AllowAnyMethod();
        });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}



app.UseCors("AllowFrontend");

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();
app.MapGet("/api/health", () => Results.Ok(new { status = "healthy" }));

app.Run();
