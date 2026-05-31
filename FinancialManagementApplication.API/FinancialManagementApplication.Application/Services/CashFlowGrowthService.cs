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
            var currentTotal = await _assetsRepository.GetCurrentTotalValueAsync(accountId);
            var currentInitialTotal = await _assetsRepository.GetCurrentTotalInitialValueAsync(accountId);
            var now = DateTime.UtcNow;

            return mode switch
            {
                "yearly" => BuildYearly(snapshots, currentTotal, currentInitialTotal, now),
                "monthly" => BuildMonthly(snapshots, year ?? now.Year, currentTotal, currentInitialTotal, now),
                "last12months" => BuildLast12Months(snapshots, currentTotal, currentInitialTotal, now),
                _ => new CashFlowGrowthResponse { Mode = mode, Data = new List<CashFlowDataPoint>() }
            };
        }

        private static CashFlowGrowthResponse BuildYearly(List<SnapshotSummary> snapshots, decimal currentTotal, decimal currentInitialTotal, DateTime now)
        {
            var yearlyData = snapshots
                .GroupBy(s => s.RecordedAt.Year)
                .Select(g => new
                {
                    Year = g.Key,
                    Value = g.OrderByDescending(s => s.RecordedAt).First().TotalValue,
                    InitialValue = g.OrderByDescending(s => s.RecordedAt).First().TotalInitialValue
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
                    Value = yearlyData[i].Value,
                    InitialValue = yearlyData[i].InitialValue
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

            if (data.Count > 0)
            {
                var last = data[^1];
                if (last.Date.Year == now.Year)
                {
                    last.Value = currentTotal;
                    last.InitialValue = currentInitialTotal;
                    if (data.Count > 1)
                    {
                        var prev = data[^2].Value;
                        last.ChangeFromPrevious = currentTotal - prev;
                        last.ChangePercentage = prev != 0
                            ? (last.ChangeFromPrevious / prev) * 100
                            : null;
                    }
                }
            }

            decimal lastKnownInitial = 0;
            foreach (var dp in data)
            {
                if (dp.InitialValue > 0)
                    lastKnownInitial = dp.InitialValue;
                else if (lastKnownInitial > 0)
                    dp.InitialValue = lastKnownInitial;
                else if (currentInitialTotal > 0)
                    dp.InitialValue = currentInitialTotal;
            }

            return new CashFlowGrowthResponse
            {
                Mode = "yearly",
                Data = data
            };
        }

        private static CashFlowGrowthResponse BuildMonthly(List<SnapshotSummary> snapshots, int year, decimal currentTotal, decimal currentInitialTotal, DateTime now)
        {
            var monthlyData = snapshots
                .Where(s => s.RecordedAt.Year == year)
                .GroupBy(s => s.RecordedAt.Month)
                .Select(g => new
                {
                    Month = g.Key,
                    Value = g.OrderByDescending(s => s.RecordedAt).First().TotalValue,
                    InitialValue = g.OrderByDescending(s => s.RecordedAt).First().TotalInitialValue
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
                    Value = monthlyData[i].Value,
                    InitialValue = monthlyData[i].InitialValue
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

            if (data.Count > 0)
            {
                var last = data[^1];
                if (last.Date.Year == now.Year && last.Date.Month == now.Month)
                {
                    last.Value = currentTotal;
                    last.InitialValue = currentInitialTotal;
                    if (data.Count > 1)
                    {
                        var prev = data[^2].Value;
                        last.ChangeFromPrevious = currentTotal - prev;
                        last.ChangePercentage = prev != 0
                            ? (last.ChangeFromPrevious / prev) * 100
                            : null;
                    }
                }
            }

            decimal lastKnownInitial = 0;
            foreach (var dp in data)
            {
                if (dp.InitialValue > 0)
                    lastKnownInitial = dp.InitialValue;
                else if (lastKnownInitial > 0)
                    dp.InitialValue = lastKnownInitial;
                else if (currentInitialTotal > 0)
                    dp.InitialValue = currentInitialTotal;
            }

            return new CashFlowGrowthResponse
            {
                Mode = "monthly",
                Year = year,
                Data = data
            };
        }

        private static CashFlowGrowthResponse BuildLast12Months(List<SnapshotSummary> snapshots, decimal currentTotal, decimal currentInitialTotal, DateTime now)
        {
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
                    Value = g.OrderByDescending(s => s.RecordedAt).First().TotalValue,
                    InitialValue = g.OrderByDescending(s => s.RecordedAt).First().TotalInitialValue
                })
                .ToDictionary(m => (m.Year, m.Month), m => (m.Value, m.InitialValue));

            var data = new List<CashFlowDataPoint>();
            decimal? carryForwardValue = null;
            decimal? carryForwardInitial = null;

            for (int i = 0; i < months.Count; i++)
            {
                var (y, m) = months[i];
                decimal val;
                decimal initVal;
                if (grouped.TryGetValue((y, m), out var v))
                {
                    val = v.Value;
                    initVal = v.InitialValue;
                    carryForwardValue = v.Value;
                    carryForwardInitial = v.InitialValue;
                }
                else if (carryForwardValue.HasValue)
                {
                    val = carryForwardValue.Value;
                    initVal = carryForwardInitial ?? 0;
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
                    Value = val,
                    InitialValue = initVal
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

            if (data.Count > 0)
            {
                var last = data[^1];
                if (last.Date.Year == now.Year && last.Date.Month == now.Month)
                {
                    last.Value = currentTotal;
                    last.InitialValue = currentInitialTotal;
                    if (data.Count > 1)
                    {
                        var prev = data[^2].Value;
                        last.ChangeFromPrevious = currentTotal - prev;
                        last.ChangePercentage = prev != 0
                            ? (last.ChangeFromPrevious / prev) * 100
                            : null;
                    }
                }
            }

            decimal lastKnownInitial = 0;
            foreach (var dp in data)
            {
                if (dp.InitialValue > 0)
                    lastKnownInitial = dp.InitialValue;
                else if (lastKnownInitial > 0)
                    dp.InitialValue = lastKnownInitial;
                else if (currentInitialTotal > 0)
                    dp.InitialValue = currentInitialTotal;
            }

            return new CashFlowGrowthResponse
            {
                Mode = "last12months",
                Data = data
            };
        }
    }
}
