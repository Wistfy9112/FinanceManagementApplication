using FinanceManagementApplication.Application.Interface.Repositories;
using FinanceManagementApplication.Domain.Entities;
using FinancialManagementApplication.Application.DTOs.Auth;
using FinancialManagementApplication.Application.Interface.Securitiy;
using BCrypt.Net;

namespace FinancialManagementApplication.Application.Services
{
    public class AuthService
    {
        private readonly IAccountRepository _repo;
        private readonly IJwtTokenGenerator _jwt;

        public AuthService(IAccountRepository repo, IJwtTokenGenerator jwt)
        {
            _repo = repo;
            _jwt = jwt;
        }

        public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
        {
            var existingUsername = await _repo.GetByUsernameAsync(request.Username);
            if (existingUsername != null)
                throw new Exception("Username already exists");

            var account = new Account
            {
                AccountID = Guid.NewGuid(),
                username = request.Username,
                email = request.Email ?? string.Empty,
                passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                displayName = request.DisplayName,
                CreateAt = DateTime.UtcNow,
                UpdateAt = DateTime.UtcNow,
            };

            await _repo.AddAsync(account);

            return new AuthResponse
            {
                AccountId = account.AccountID,
                Username = account.username,
                Email = account.email,
                DisplayName = account.displayName ?? string.Empty,
                Token = _jwt.Generate(account),
                CreateAt = account.CreateAt
            };
        }

        public async Task<AuthResponse> LoginAsync(LoginRequest request)
        {
            var account = await _repo.GetByUsernameAsync(request.Username)
                ?? throw new Exception("Invalid credentials");

            if (!BCrypt.Net.BCrypt.Verify(request.Password, account.passwordHash))
                throw new Exception("Invalid credentials");

            return new AuthResponse
            {
                AccountId = account.AccountID,
                Username = account.username,
                Email = account.email,
                DisplayName = account.displayName ?? string.Empty,
                Token = _jwt.Generate(account),
                CreateAt = account.CreateAt
            };
        }

        public async Task<UserProfileDTO> GetProfileAsync(Guid accountId)
        {
            var account = await _repo.GetByIdAsync(accountId)
                ?? throw new Exception("Account not found");

            return new UserProfileDTO
            {
                AccountId = account.AccountID,
                Username = account.username,
                Email = account.email,
                DisplayName = account.displayName,
                CreateAt = account.CreateAt,
                UpdateAt = account.UpdateAt
            };
        }

        public async Task<UserProfileDTO> UpdateProfileAsync(Guid accountId, UpdateProfileDTO request)
        {
            var account = await _repo.GetByIdAsync(accountId)
                ?? throw new Exception("Account not found");

            account.displayName = request.DisplayName;
            if (request.Email != null)
                account.email = request.Email;
            account.UpdateAt = DateTime.UtcNow;

            await _repo.UpdateAsync(account);

            return new UserProfileDTO
            {
                AccountId = account.AccountID,
                Username = account.username,
                Email = account.email,
                DisplayName = account.displayName,
                CreateAt = account.CreateAt,
                UpdateAt = account.UpdateAt
            };
        }

        public async Task ChangePasswordAsync(Guid accountId, ChangePasswordDTO request)
        {
            var account = await _repo.GetByIdAsync(accountId)
                ?? throw new Exception("Account not found");

            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, account.passwordHash))
                throw new Exception("Current password is incorrect");

            account.passwordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            account.UpdateAt = DateTime.UtcNow;

            await _repo.UpdateAsync(account);
        }
    }
}
