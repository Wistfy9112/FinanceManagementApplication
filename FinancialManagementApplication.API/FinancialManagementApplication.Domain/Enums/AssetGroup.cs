namespace FinancialManagementApplication.Domain.Enums
{
    public enum AssetGroup
    {
        BaoVe = 1,      // 🟢 Bảo vệ - Tiền mặt, quỹ khẩn cấp (R1)
        OnDinh = 2,     // 🔵 Ổn định - Tiết kiệm, tiền gửi (R2)
        CanBang = 3,    // 🟣 Cân bằng - Vàng, chứng chỉ quỹ (R3)
        TangTruong = 4, // 🟠 Tăng trưởng - Cổ phiếu, BĐS đầu tư (R4)
        RuiRoCao = 5    // 🔴 Rủi ro cao - Đầu cơ, biến động mạnh (R5)
    }
}
