using FinancialManagementApplication.Application.DTOs.CashFlow;

namespace FinancialManagementApplication.Application.Interface.Services
{
    public interface ICashFlowGrowthService
    {
        Task<CashFlowGrowthResponse> GetGrowthDataAsync(Guid accountId, string mode, int? year = null);
    }
}
