import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type Locale = 'vi' | 'en';

const en: Record<string, string> = {
  'Đang khởi tạo hệ thống quản lý tài chính...': 'Initializing financial management system...',
  'Không thể tải dữ liệu.': 'Cannot load data.',
  'Tổng quan': 'Overview',
  'Quản lý Tài sản': 'Asset Management',
  'Phân bổ Danh mục': 'Portfolio Allocation',
  'CHẾ ĐỘ DEMO': 'DEMO MODE',
  'ĐÃ KẾT NỐI API': 'API CONNECTED',
  'Đăng xuất': 'Logout',
  'Bạn có chắc chắn muốn xóa tài sản này?': 'Are you sure you want to delete this asset?',
  'Bạn có chắc chắn muốn xóa danh mục này?': 'Are you sure you want to delete this category?',
  'Đã lưu thông tin tài sản!': 'Asset info saved!',
  'Đã khôi phục thông tin tài sản!': 'Asset info restored!',
  'Khôi phục thất bại': 'Restore failed',
  'Lỗi khôi phục': 'Restore error',
  'Đã cập nhật giá trị tài sản!': 'Asset value updated!',
  'Lỗi cập nhật tài sản': 'Asset update error',
  'Đã lưu lịch sử phân bổ!': 'Allocation history saved!',
  'Lỗi lưu phân bổ': 'Allocation save error',
  'Đã khôi phục phân bổ!': 'Allocation restored!',
  'Lỗi lưu tài sản': 'Asset save error',
  'Không thể thêm danh mục mới vì đã đạt hoặc vượt quá phân bổ gốc / 100%.': 'Cannot add new category because base allocation has reached or exceeded 100%.',
  'Vui lòng thêm ít nhất một danh mục.': 'Please add at least one category.',
  'Vui lòng nhập tên cho tất cả danh mục.': 'Please enter names for all categories.',
  'Tổng tỉ trọng vượt quá 100%. Vui lòng điều chỉnh lại.': 'Total weight exceeds 100%. Please adjust.',
  'Lỗi khi lưu thiết lập.': 'Error saving setup.',
  'Thêm Tài Sản Mới': 'Add New Asset',
  'Cập Nhật Tài Sản': 'Update Asset',
  'Tên tài sản': 'Asset Name',
  'Ví dụ: Saving, Emergency, ETF...': 'Example: Saving, Emergency, ETF...',
  'Vốn ban đầu (Funds)': 'Initial Capital (Funds)',
  'Nhập số tiền vốn ban đầu': 'Enter initial capital amount',
  'Giá trị hiện tại (Current)': 'Current Value',
  'Nhập giá trị tài sản hiện tại': 'Enter current asset value',
  'Phân loại': 'Classification',
  'Tiết kiệm': 'Savings',
  'Đầu tư': 'Investment',
  'Hủy': 'Cancel',
  'Lưu lại': 'Save',
  'Thiết lập danh mục thành công!': 'Portfolio setup successful!',
  'Dữ liệu phân bổ danh mục đã được lưu vào hệ thống và sao lưu vào lịch sử thành công.': 'Portfolio allocation data has been saved and backed up to history successfully.',
  'Quay lại': 'Go back',
  'Đăng Nhập Hệ Thống': 'System Login',
  'Đăng Ký Tài Khoản': 'Register Account',
  'Quản lý dòng tiền và tài sản cá nhân cao cấp': 'Premium personal cash flow and asset management',
  'Tên hiển thị': 'Display Name',
  'Nhập tên hiển thị của bạn': 'Enter your display name',
  'Địa chỉ Email': 'Email Address',
  'nhap.email@cua.ban': 'your.email@address.com',
  'Mật khẩu': 'Password',
  'Nhập mật khẩu': 'Enter password',
  'Đăng Nhập': 'Login',
  'Tạo Tài Khoản': 'Create Account',
  'Trải nghiệm ứng dụng không cần tài khoản:': 'Experience the app without an account:',
  'Trải nghiệm Chế độ Demo (Offline)': 'Experience Demo Mode (Offline)',
  'Tài khoản Demo có sẵn (Mock Offline):': 'Available Demo account (Mock Offline):',
  'Sử dụng tài khoản Demo nhanh': 'Use quick Demo account',
  'Chưa có tài khoản?': "Don't have an account?",
  'Đã có tài khoản?': 'Already have an account?',
  'Đăng ký ngay': 'Register now',
  'Thông tin Phân tích & Gợi ý': 'Analysis & Suggestions',
  'Hệ thống tài chính của bạn đang hoạt động ổn định.': 'Your financial system is operating stably.',
  'Theo năm': 'By Year',
  'Theo tháng': 'By Month',
  '12 tháng': '12 Months',
  'Tổng giá trị tài sản qua các năm': 'Total asset value over years',
  'Giá trị:': 'Value:',
  'Giá trị gốc:': 'Original value:',
  'Thay đổi:': 'Change:',
  'Chưa có dữ liệu lịch sử. Hãy lưu snapshot tài sản để bắt đầu theo dõi.': 'No historical data yet. Save an asset snapshot to start tracking.',
  'Giá trị hiện tại': 'Current Value',
  'Giá trị gốc': 'Original Value',
  'Sửa tài sản': 'Edit asset',
  'Xóa tài sản': 'Delete asset',
  'Bảng Quản Lý Tài Sản Chi Tiết': 'Detailed Asset Management',
  'Theo dõi giá trị ban đầu, giá trị thực tế hiện tại và mức độ sinh trưởng của từng tài sản': 'Track initial value, current actual value and growth rate of each asset',
  'Thêm Tài Sản': 'Add Asset',
  'Lưu thông tin': 'Save Info',
  'STT': 'No.',
  'Tên tài sản (Assets Name)': 'Asset Name',
  'Số tiền giảm': 'Reduction Amount',
  'Số tiền thực tế': 'Actual Amount',
  'Loại trừ': 'Exclude',
  'Áp dụng': 'Apply',
  'Đã được loại trừ khỏi cắt giảm': 'Excluded from reduction',
  'Bật khiên bảo vệ loại trừ khỏi cắt giảm': 'Enable shield to exclude from reduction',
  '🛡️ Khóa': '🛡️ Locked',
  'Áp dụng số tiền sang tài sản': 'Apply amount to asset',
  'Chưa liên kết tài sản': 'No asset linked',
  'Còn lại (Saving Base)': 'Remaining (Saving Base)',
  'Đầu tư (Investment Base)': 'Investment (Investment Base)',
  'Tổng dòng': 'Total Line',
  'Cân đối (Balanced)': 'Balanced',
  ' danh mục': ' categories',
  'Gốc: ': 'Original: ',
  'Phân bổ gốc: ': 'Base allocation: ',
  'Danh mục': 'Category',
  'Số tiền': 'Amount',
  'Tỉ trọng': 'Weight',
  'Loại': 'Type',
  'Tổng giá trị Tiết kiệm và Đầu tư': 'Total Savings & Investment Value',
  'Chi tiết từng tài sản trong danh mục': 'Details of each asset in portfolio',
  ' tài sản · tổng ': ' assets · total ',
  'Cash Flow Growth': 'Cash Flow Growth',
  'Tổng giá trị tài sản từng tháng năm': 'Monthly asset value for',
  'Tổng giá trị tài sản 12 tháng gần nhất': 'Total asset value for last 12 months',
  'Tỉ trọng (%)': 'Weight (%)',
  'Số tiền (Cash)': 'Amount (Cash)',
  '• Bấm nút hình khiên bảo vệ loại trừ khỏi cắt giảm.': '• Click the shield button to exclude a line from reduction.',
  '• Tổng tỉ trọng nên đạt 100% để cân bằng.': '• Total weight should reach 100% to balance.',
  '💳 Sinh hoạt': '💳 Living Expenses',
  '🏦 Tiết kiệm': '🏦 Savings',
  '📈 Đầu tư': '📈 Investment',
  'Đã kết nối API': 'API Connected',
  'Kế Hoạch Phân Bổ Tổng Thể': 'Master Allocation Plan',
  'Nhập email của bạn': 'Enter your email',
  'nhập.email@của.ban': 'your.email@address.com',
};

const LanguageContext = createContext<{
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}>({
  locale: 'vi',
  setLocale: () => {},
  t: (key: string) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    return (localStorage.getItem('locale') as Locale) || 'vi';
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('locale', l);
  }, []);

  const t = useCallback((key: string) => {
    if (locale === 'en' && en[key]) return en[key];
    return key;
  }, [locale]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function useT() {
  const { t } = useLanguage();
  return t;
}
