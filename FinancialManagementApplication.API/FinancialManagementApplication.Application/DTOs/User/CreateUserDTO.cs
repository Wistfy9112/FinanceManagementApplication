using System;
using System.Collections.Generic;
using System.Text;

namespace FinancialManagementApplication.Application.DTOs.User
{
    public class CreateUserDTO
    {
        public Guid Id { get; set; }
        public string firstName { get; set; } = string.Empty;
        public string lastName { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public DateTime DateOfBirth { get; set; }
        public DateTime CreateAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdateAt { get; set; } = DateTime.UtcNow;
    }
}
