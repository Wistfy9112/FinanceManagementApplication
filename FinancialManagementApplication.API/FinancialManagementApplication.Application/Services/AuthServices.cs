using FinanceManagementApplication.Application.Interface.Repositories;
using FinanceManagementApplication.Domain.Entities;
using FinancialManagementApplication.Application.DTOs.Auth;
using FinancialManagementApplication.Application.Interface.Securitiy;
using System;
using System.Collections.Generic;
using System.Text;
using BCrypt.Net;
using FinancialManagementApplication.Application.Interface.Repositories;
using FinancialManagementApplication.Domain.Entities;
using FinancialManagementApplication.Application.DTOs.User;

namespace FinancialManagementApplication.Application.Services
{
    public class AuthService
    {
        private readonly IAccountRepository _repo;
        private readonly IUserRepository _userRepo;
        private readonly IJwtTokenGenerator _jwt;

        public AuthService(IAccountRepository repo, IUserRepository userRepo, IJwtTokenGenerator jwt)
        {
            _repo = repo;
            _userRepo = userRepo;
            _jwt = jwt;
        }

        public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
        {
            var existing = await _repo.GetByEmailAsync(request.Email);
            if (existing != null)
                throw new Exception("Email already exists");

            var account = new Account
            {
                AccountID = Guid.NewGuid(),
                email = request.Email,
                passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                CreateAt = DateTime.Now,
                UpdateAt = DateTime.Now,
            };

            var user = new User
            {
                UserID = Guid.NewGuid(),
                FirstName = "",
                LastName = "",
                PhoneNumber = "",
                DateOfBirth = DateTime.UtcNow,
                Account = account
            };
            account.User = user;

            await _repo.AddAsync(account);
            await _userRepo.CreateUserAsync(user);

            return new AuthResponse
            {
                Token = _jwt.Generate(account)
            };
        }

        public async Task<AuthResponse> LoginAsync(LoginRequest request)
        {
            var account = await _repo.GetByEmailAsync(request.Email)
                ?? throw new Exception("Invalid credentials");

            if (!BCrypt.Net.BCrypt.Verify(request.Password, account.passwordHash))
                throw new Exception("Invalid credentials");

            return new AuthResponse
            {
                Token = _jwt.Generate(account)
            };
        }
    }
}
