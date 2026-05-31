using FinancialManagementApplication.Application.DTOs.CashFlow;
using FinancialManagementApplication.Application.Interface.Repositories;
using FinancialManagementApplication.Application.Interface.Services;

namespace FinancialManagementApplication.Application.Services
{
    public class CashFlowGrowthService : ICashFlowGrowthService
    {
        private readonly IAssetsRepository _assetsRepository;

        public CashFlowGrowthService(IAssetsRepository assetsRepository)
        {
            _assetsRepository = assetsRepository;
        }

        public async Task<CashFlowGrowthResponse> GetGrowthDataAsync(Guid accountId, string mode, int? year = null)
        {
            var snapshots = (await _assetsRepository.GetSnapshotValuesAsync(accountId)).ToList();

            return mode switch
            {
                "yearly" => BuildYearly(snapshots),
                "monthly" => BuildMonthly(snapshots, year ?? DateTime.UtcNow.Year),
                "last12months" => BuildLast12Months(snapshots),
                _ => new CashFlowGrowthResponse { Mode = mode, Data = new List<CashFlowDataPoint>() }
            };
        }

        private static CashFlowGrowthResponse BuildYearly(List<SnapshotSummary> snapshots)
        {
            var yearlyData = snapshots
                .GroupBy(s => s.RecordedAt.Year)
                .Select(g => new
                {
                    Year = g.Key,
                    Value = g.OrderByDescending(s => s.RecordedAt).First().TotalValue
                })
                .OrderBy(y => y.Year)
                .ToList();

            var data = new List<CashFlowDataPoint>();
            for (int i = 0; i < yearlyData.Count; i++)
            {
                var dp = new CashFlowDataPoint
                {
                    Period = yearlyData[i].Year.ToString(),
                    Date = new DateTime(yearlyData[i].Year, 1, 1),
                    Value = yearlyData[i].Value
                };
                if (i > 0)
                {
                    dp.ChangeFromPrevious = yearlyData[i].Value - yearlyData[i - 1].Value;
                    dp.ChangePercentage = yearlyData[i - 1].Value != 0
                        ? (dp.ChangeFromPrevious / yearlyData[i - 1].Value) * 100
                        : null;
                }
                data.Add(dp);
            }

            return new CashFlowGrowthResponse
            {
                Mode = "yearly",
                Data = data
            };
        }

        private static CashFlowGrowthResponse BuildMonthly(List<SnapshotSummary> snapshots, int year)
        {
            var monthlyData = snapshots
                .Where(s => s.RecordedAt.Year == year)
                .GroupBy(s => s.RecordedAt.Month)
                .Select(g => new
                {
                    Month = g.Key,
                    Value = g.OrderByDescending(s => s.RecordedAt).First().TotalValue
                })
                .OrderBy(m => m.Month)
                .ToList();

            var data = new List<CashFlowDataPoint>();
            for (int i = 0; i < monthlyData.Count; i++)
            {
                var dt = new DateTime(year, monthlyData[i].Month, 1);
                var dp = new CashFlowDataPoint
                {
                    Period = dt.ToString("MMM"),
                    Date = dt,
                    Value = monthlyData[i].Value
                };
                if (i > 0)
                {
                    dp.ChangeFromPrevious = monthlyData[i].Value - monthlyData[i - 1].Value;
                    dp.ChangePercentage = monthlyData[i - 1].Value != 0
                        ? (dp.ChangeFromPrevious / monthlyData[i - 1].Value) * 100
                        : null;
                }
                data.Add(dp);
            }

            return new CashFlowGrowthResponse
            {
                Mode = "monthly",
                Year = year,
                Data = data
            };
        }

        private static CashFlowGrowthResponse BuildLast12Months(List<SnapshotSummary> snapshots)
        {
            var now = DateTime.UtcNow;
            var startDate = new DateTime(now.Year, now.Month, 1).AddMonths(-11);

            var months = new List<(int Year, int Month)>();
            for (var dt = startDate; dt <= now; dt = dt.AddMonths(1))
            {
                months.Add((dt.Year, dt.Month));
            }

            var grouped = snapshots
                .GroupBy(s => (s.RecordedAt.Year, s.RecordedAt.Month))
                .Select(g => new
                {
                    g.Key.Year,
                    g.Key.Month,
                    Value = g.OrderByDescending(s => s.RecordedAt).First().TotalValue
                })
                .ToDictionary(m => (m.Year, m.Month), m => m.Value);

            var data = new List<CashFlowDataPoint>();
            decimal? carryForward = null;

            for (int i = 0; i < months.Count; i++)
            {
                var (y, m) = months[i];
                decimal val;
                if (grouped.TryGetValue((y, m), out var v))
                {
                    val = v;
                    carryForward = v;
                }
                else if (carryForward.HasValue)
                {
                    val = carryForward.Value;
                }
                else
                {
                    continue;
                }

                var dt = new DateTime(y, m, 1);
                var dp = new CashFlowDataPoint
                {
                    Period = dt.ToString("MMM yyyy"),
                    Date = dt,
                    Value = val
                };
                if (i > 0 && data.Count > 0)
                {
                    var prevVal = data.Last().Value;
                    dp.ChangeFromPrevious = val - prevVal;
                    dp.ChangePercentage = prevVal != 0
                        ? (dp.ChangeFromPrevious / prevVal) * 100
                        : null;
                }
                data.Add(dp);
            }

            return new CashFlowGrowthResponse
            {
                Mode = "last12months",
                Data = data
            };
        }
    }
}
