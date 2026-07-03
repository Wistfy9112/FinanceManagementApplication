using FinancialManagementApplication.Application.Interface.Repositories;
using FinancialManagementApplication.Domain.Entities;
using FinancialManagementApplication.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FinancialManagementApplication.Infrastructure.Repositories
{
    public class DebtRepository : IDebtRepository
    {
        private readonly ApplicationDbContext _context;
        public DebtRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Debt> CreateAsync(Debt debt)
        {
            await _context.AddAsync(debt);
            await _context.SaveChangesAsync();
            return debt;
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var debt = await _context.Debts.FindAsync(id);
            if (debt == null) return false;
            _context.Debts.Remove(debt);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<Debt>> GetAllByAccountIdAsync(Guid accountId)
        {
            return await _context.Debts
                .Where(x => x.AccountId == accountId)
                .OrderByDescending(x => x.CreatedAt)
                .Include(x => x.Payments.OrderBy(p => p.PaymentDate))
                .ToListAsync();
        }

        public async Task<Debt?> GetAsync(Guid id)
        {
            return await _context.Debts
                .Include(x => x.Payments.OrderBy(p => p.PaymentDate))
                .FirstOrDefaultAsync(x => x.Id == id);
        }

        public async Task<Debt> UpdateAsync(Debt debt)
        {
            _context.Debts.Update(debt);
            await _context.SaveChangesAsync();
            return debt;
        }

        public async Task<DebtPayment> AddPaymentAsync(DebtPayment payment)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var debt = await _context.Debts.FindAsync(payment.DebtId);
                if (debt == null)
                    throw new InvalidOperationException("Debt not found.");

                if (debt.IsClosed)
                    throw new InvalidOperationException("Cannot add payment to a closed debt.");

                await _context.DebtPayments.AddAsync(payment);
                debt.PaidAmount += payment.Amount;
                debt.RemainingAmount = debt.TotalDebt - debt.PaidAmount;
                if (debt.RemainingAmount <= 0)
                {
                    debt.RemainingAmount = 0;
                    debt.IsClosed = true;
                }
                payment.RemainingAfterPayment = debt.RemainingAmount;
                debt.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return payment;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task CloseDebtAsync(Guid id)
        {
            var debt = await _context.Debts.FindAsync(id);
            if (debt == null)
                throw new InvalidOperationException("Debt not found.");

            debt.IsClosed = true;
            debt.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }
}
