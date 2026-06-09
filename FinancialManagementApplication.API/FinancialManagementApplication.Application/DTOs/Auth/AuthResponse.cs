namespace FinancialManagementApplication.Application.DTOs.Auth
{
    public class AuthResponse
    {
        public Guid AccountId { get; set; }
        public string Username { get; set; } = default!;
        public string Email { get; set; } = default!;
        public string DisplayName { get; set; } = default!;
        public string Token { get; set; } = default!;
        public DateTime CreateAt { get; set; }
    }
}
