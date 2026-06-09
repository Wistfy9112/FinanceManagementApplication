using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using FinancialManagementApplication.Domain.Enums;

namespace FinancialManagementApplication.Application.DTOs.Goal
{
    public class CreateGoalDTO : IValidatableObject
    {
        public Guid AccountId { get; set; }

        [Required(ErrorMessage = "Tên mục tiêu không được để trống")]
        public string Name { get; set; }

        [Range(0.01, double.MaxValue, ErrorMessage = "Số tiền mục tiêu phải lớn hơn 0")]
        public decimal TargetAmount { get; set; }
        public DateTime? StartDate { get; set; }

        [Required(ErrorMessage = "Ngày đến hạn không được để trống")]
        public DateTime DueDate { get; set; }

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if (StartDate.HasValue && StartDate.Value > DueDate)
            {
                yield return new ValidationResult(
                    "Ngày bắt đầu không thể sau ngày đến hạn",
                    new[] { nameof(StartDate) });
            }
        }
    }
}
