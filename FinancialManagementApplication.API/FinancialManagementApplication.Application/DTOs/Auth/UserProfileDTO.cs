namespace FinancialManagementApplication.Application.DTOs.Auth
{
    public class UserProfileDTO
    {
        public Guid AccountId { get; set; }
        public string Email { get; set; } = default!;
        public string DisplayName { get; set; } = default!;
        public DateTime CreateAt { get; set; }
        public DateTime UpdateAt { get; set; }
    }
}
