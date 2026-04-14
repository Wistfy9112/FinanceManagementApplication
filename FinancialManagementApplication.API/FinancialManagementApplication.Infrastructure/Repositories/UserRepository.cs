using FinanceManagementApplication.Domain.Entities;
using FinancialManagementApplication.Application.Interface.Repositories;
using FinancialManagementApplication.Domain.Entities;
using FinancialManagementApplication.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Text;

namespace FinancialManagementApplication.Infrastructure.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly ApplicationDbContext _context;

        public UserRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<User> CreateUserAsync(User user)
        {
            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();
            return user;
        }

        public async Task<bool> DeleteUserAsync(Guid id)
        {
            await _context.Users.Where(x => x.UserID == id).ExecuteDeleteAsync();
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<User>> GetAllUsersAsync()
        {
            return await _context.Users.ToListAsync();
        }

        public async Task<User?> GetUserByAccountIDAsync(Guid id)
        {
            return await _context.Users.FirstOrDefaultAsync(x => x.Account.AccountID == id);
        }

        public async Task<User?> GetUserByEmailAsync(string email)
        {
            Account? account = await _context.Accounts.FirstOrDefaultAsync(x => x.email == email);
            if (account == null) {
                return null;
            }
            return await _context.Users.FirstOrDefaultAsync(x => x.Account.AccountID == account.AccountID);
        }

        public async Task<User?> GetUserByIdAsync(Guid id)
        {
            return await _context.Users.FirstOrDefaultAsync(x => x.UserID == id);
        }

        public async Task<User> UpdateUserAsync(User user)
        {
            await _context.Users.Where(x => x.UserID == user.UserID).ExecuteUpdateAsync(x =>
                x.SetProperty(u => u.FirstName, user.FirstName)
                 .SetProperty(u => u.LastName, user.LastName)
                 .SetProperty(u => u.PhoneNumber, user.PhoneNumber)
                 .SetProperty(u => u.DateOfBirth, user.DateOfBirth)
            );
            await _context.SaveChangesAsync();
            return user;
        }
    }
}
