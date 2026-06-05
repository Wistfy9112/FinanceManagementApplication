namespace FinancialManagementApplication.Application.DTOs.Auth
{
    public class ChangePasswordDTO
    {
        public string CurrentPassword { get; set; } = default!;
        public string NewPassword { get; set; } = default!;
    }
}
