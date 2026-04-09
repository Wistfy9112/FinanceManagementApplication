using System;
using System.Collections.Generic;
using System.Text;

namespace FinancialManagementApplication.Application.DTOs.Category
{
    public class CreateExpenseCategoryDTO
    {
        public string Name { get; set; } = default!;
        public string Description { get; set; } = default!;
        public Guid AccountID { get; set; }
    }
}
