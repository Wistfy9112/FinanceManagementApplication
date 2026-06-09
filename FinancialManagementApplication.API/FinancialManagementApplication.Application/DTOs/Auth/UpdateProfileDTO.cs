namespace FinancialManagementApplication.Application.DTOs.Auth
{
    public class UpdateProfileDTO
    {
        public string DisplayName { get; set; } = default!;
        public string? Email { get; set; }
    }
}
