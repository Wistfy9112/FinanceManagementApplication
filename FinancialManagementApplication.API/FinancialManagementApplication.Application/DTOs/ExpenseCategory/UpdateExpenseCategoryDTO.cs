using System;
using System.Collections.Generic;
using System.Text;

namespace FinancialManagementApplication.Application.DTOs.Category
{
    public class UpdateExpenseCategoryDTO
    {
        public string Name { get; set; } = default!;
        public string Description { get; set; } = default!;
    }
}
