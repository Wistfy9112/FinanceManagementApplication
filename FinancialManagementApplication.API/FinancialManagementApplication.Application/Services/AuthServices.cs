using FinancialManagementApplication.Application.Interface.Repositories;
using FinancialManagementApplication.Domain.Entities;
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
                Username = request.Username,
                Email = request.Email ?? string.Empty,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                DisplayName = request.DisplayName,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };

            await _repo.AddAsync(account);

            return new AuthResponse
            {
                AccountId = account.AccountID,
                Username = account.Username,
                Email = account.Email,
                DisplayName = account.DisplayName ?? string.Empty,
                Token = _jwt.Generate(account),
                CreateAt = account.CreatedAt
            };
        }

        public async Task<AuthResponse> LoginAsync(LoginRequest request)
        {
            var account = await _repo.GetByUsernameAsync(request.Username)
                ?? throw new Exception("Invalid credentials");

            if (!BCrypt.Net.BCrypt.Verify(request.Password, account.PasswordHash))
                throw new Exception("Invalid credentials");

            return new AuthResponse
            {
                AccountId = account.AccountID,
                Username = account.Username,
                Email = account.Email,
                DisplayName = account.DisplayName ?? string.Empty,
                Token = _jwt.Generate(account),
                CreateAt = account.CreatedAt
            };
        }

        public async Task<UserProfileDTO> GetProfileAsync(Guid accountId)
        {
            var account = await _repo.GetByIdAsync(accountId)
                ?? throw new Exception("Account not found");

            return new UserProfileDTO
            {
                AccountId = account.AccountID,
                Username = account.Username,
                Email = account.Email,
                DisplayName = account.DisplayName,
                CreateAt = account.CreatedAt,
                UpdateAt = account.UpdatedAt
            };
        }

        public async Task<UserProfileDTO> UpdateProfileAsync(Guid accountId, UpdateProfileDTO request)
        {
            var account = await _repo.GetByIdAsync(accountId)
                ?? throw new Exception("Account not found");

            account.DisplayName = request.DisplayName;
            if (request.Email != null)
                account.Email = request.Email;
            account.UpdatedAt = DateTime.UtcNow;

            await _repo.UpdateAsync(account);

            return new UserProfileDTO
            {
                AccountId = account.AccountID,
                Username = account.Username,
                Email = account.Email,
                DisplayName = account.DisplayName,
                CreateAt = account.CreatedAt,
                UpdateAt = account.UpdatedAt
            };
        }

        public async Task ChangePasswordAsync(Guid accountId, ChangePasswordDTO request)
        {
            var account = await _repo.GetByIdAsync(accountId)
                ?? throw new Exception("Account not found");

            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, account.PasswordHash))
                throw new Exception("Current password is incorrect");

            account.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            account.UpdatedAt = DateTime.UtcNow;

            await _repo.UpdateAsync(account);
        }
    }
}
