using FinancialManagementApplication.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace FinancialManagementApplication.Application.Interface.Securitiy
{
    public interface IJwtTokenGenerator
    {
        string Generate(Account account);
    }
}
