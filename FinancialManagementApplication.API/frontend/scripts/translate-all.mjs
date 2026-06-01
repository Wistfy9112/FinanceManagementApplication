import { readFileSync, writeFileSync } from 'fs';

const filePath = process.argv[2];
let content = readFileSync(filePath, 'utf-8');

// ========== 1. Add imports ==========
content = content.replace(
  `import React, { useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useToast } from "./components/ui/Toast";
import { 
  authService, 
  assetService, 
  portfolioService, 
  historyService,
  cashFlowService,
  checkConnection, 
  getLoggedUser
} from './services/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Area, AreaChart
} from 'recharts';`,
  `import React, { useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff, Languages } from 'lucide-react';
import { useToast } from "./components/ui/Toast";
import { 
  authService, 
  assetService, 
  portfolioService, 
  historyService,
  cashFlowService,
  checkConnection, 
  getLoggedUser
} from './services/api';
import { LanguageProvider, useLanguage } from './i18n';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Area, AreaChart
} from 'recharts';`
);

// ========== 2. Add useLanguage to main App ==========
content = content.replace(
  `export default function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assets' | 'portfolio'>('dashboard');
  const [isDemo, setIsDemo] = useState<boolean>(true);`,
  `export default function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assets' | 'portfolio'>('dashboard');
  const [isDemo, setIsDemo] = useState<boolean>(true);
  const { t, locale, setLocale } = useLanguage();`
);

// ========== 3. Add useLanguage to sub-components ==========
// AuthPage
content = content.replace(
  `function AuthPage({ onLogin, onRegister, onDemo, error, isDemo }: { onLogin: any; onRegister: any; onDemo: any; error: string | null; isDemo: boolean }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');`,
  `function AuthPage({ onLogin, onRegister, onDemo, error, isDemo }: { onLogin: any; onRegister: any; onDemo: any; error: string | null; isDemo: boolean }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const { t } = useLanguage();`
);

// DashboardPage
content = content.replace(
  `}) {
  const [chartMode, setChartMode] = useState<'overview' | 'detail'>('overview');
  const [showAmounts, setShowAmounts] = useState(true);`,
  `}) {
  const [chartMode, setChartMode] = useState<'overview' | 'detail'>('overview');
  const [showAmounts, setShowAmounts] = useState(true);
  const { t } = useLanguage();`
);

// CashFlowGrowthChart
content = content.replace(
  `function CashFlowGrowthChart({ userId }: { userId: string }) {
  const [mode, setMode] = useState<'yearly' | 'monthly' | 'last12months'>('yearly');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [chartData, setChartData] = useState<any[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);`,
  `function CashFlowGrowthChart({ userId }: { userId: string }) {
  const [mode, setMode] = useState<'yearly' | 'monthly' | 'last12months'>('yearly');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [chartData, setChartData] = useState<any[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();`
);

// AssetsPage
content = content.replace(
  `}) {
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const expenseAssets = assets.filter(a => a.Type === 'Expense');`,
  `}) {
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const { t } = useLanguage();
  const expenseAssets = assets.filter(a => a.Type === 'Expense');`
);

// PortfolioPage
content = content.replace(
  `}) {

  // Visual warnings for total percentages`,
  `}) {
  const { t } = useLanguage();

  // Visual warnings for total percentages`
);

// AllocationHistorySection
content = content.replace(
  `function AllocationHistorySection({ records, onRestore, formatDateTime, formatCurrency }: {
  records: any[];
  onRestore: (id: string) => void;
  formatDateTime: (d: any) => string;
  formatCurrency: (v: number) => string;
}) {`,
  `function AllocationHistorySection({ records, onRestore, formatDateTime, formatCurrency }: {
  records: any[];
  onRestore: (id: string) => void;
  formatDateTime: (d: any) => string;
  formatCurrency: (v: number) => string;
}) {
  const { t } = useLanguage();`
);

// ========== 4. Update navbar ==========
// Replace Tổng quan with t()
content = content.replace(
  `              Tổng quan
            </button>
            <button 
              className={\`nav-link \${activeTab === 'assets' ? 'active' : ''}\`}
              onClick={() => setActiveTab('assets')}
            >
              Quản lý Tài sản`,
  `              {t('Tổng quan')}
            </button>
            <button 
              className={\`nav-link \${activeTab === 'assets' ? 'active' : ''}\`}
              onClick={() => setActiveTab('assets')}
            >
              {t('Quản lý Tài sản')}`
);

content = content.replace(
  `              Quản lý Tài sản
            </button>
            <button 
              className={\`nav-link \${activeTab === 'portfolio' ? 'active' : ''}\`}
              onClick={() => setActiveTab('portfolio')}
            >
              Phân bổ Danh mục`,
  `              {t('Quản lý Tài sản')}
            </button>
            <button 
              className={\`nav-link \${activeTab === 'portfolio' ? 'active' : ''}\`}
              onClick={() => setActiveTab('portfolio')}
            >
              {t('Phân bổ Danh mục')}`
);

// ========== 5. Add language toggle and update badges ==========
content = content.replace(
  `          <div className="nav-right">
            {isDemo ? (
              <div className="status-badge demo">
                <span style={{ width: '6px', height: '6px', background: '#f59e0b', borderRadius: '50%' }} />
                CHẾ ĐỘ DEMO
              </div>
            ) : (
              <div className="status-badge connected">
                <span style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%' }} />
                ĐÃ KẾT NỐI API
              </div>
            )}
            
            <div className="user-profile">
              <div className="user-avatar">
                {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
              </div>
              <span style={{ fontWeight: 600 }}>{user.displayName}</span>
              <button className="logout-btn" onClick={handleLogout} title="Đăng xuất">`,
  `          <div className="nav-right">
            <button onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')}
              style={{ background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '6px 8px', display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}
              title={locale === 'vi' ? 'Switch to English' : 'Chuyển sang tiếng Việt'}>
              <Languages size={14} />
              {locale === 'vi' ? 'EN' : 'VI'}
            </button>
            {isDemo ? (
              <div className="status-badge demo">
                <span style={{ width: '6px', height: '6px', background: '#f59e0b', borderRadius: '50%' }} />
                {t('CHẾ ĐỘ DEMO')}
              </div>
            ) : (
              <div className="status-badge connected">
                <span style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%' }} />
                {t('ĐÃ KẾT NỐI API')}
              </div>
            )}
            
            <div className="user-profile">
              <div className="user-avatar">
                {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
              </div>
              <span style={{ fontWeight: 600 }}>{user.displayName}</span>
              <button className="logout-btn" onClick={handleLogout} title={t('Đăng xuất')}>`
);

// ========== 6. Wrap all Vietnamese strings in JSX ==========
// Sort by length (longest first) to avoid substring issues
const viKeys = [
  // Asset management
  "Chưa có dữ liệu tài sản. Bấm nút \"Thêm Tài Sản\" để khởi tạo.",
  "Chọn một bản ghi để xem chi tiết danh mục tài sản tại thời điểm đó",
  "Chưa có dữ liệu lịch sử. Nhấn \"Lưu thông tin\" để tạo bản ghi.",
  "Chọn một bản ghi từ danh sách bên trái để xem chi tiết",
  "Chưa có danh mục nào. Bấm \"Thêm danh mục\" để bắt đầu.",
  "Chọn một bản ghi để xem chi tiết và khôi phục",
  "Chưa có dữ liệu lịch sử. Lưu thiết lập để tạo bản ghi.",
  "Theo dõi giá trị ban đầu, giá trị thực tế hiện tại và mức độ sinh trưởng của từng tài sản",
  "Thêm, sửa, xóa danh mục và nhập số tiền phân bổ. Tỉ lệ phần trăm sẽ tự động tính toán.",
  "Phân bố thu nhập thành ba khối Sinh hoạt, Tiết kiệm & Đầu tư, tích hợp bộ lập kế hoạch cắt giảm tự động",
  "Bảng Quản Lý Tài Sản Chi Tiết",
  "Thông tin phân bổ (Allocations Info)",
  "Giá trị hiện tại (Current)",
  "Vốn ban đầu (Funds)",
  "Tên tài sản (Assets Name)",
  "Lợi nhuận (Interest)",
  "Tỷ suất (Interest ratio)",
  "Phân bổ gốc (Base Amount)",
  "Đầu tư (Investment Base)",
  "Còn lại (Saving Base)",
  "Số tiền (Cash)",
  "Tỉ trọng (%)",
  "Thu nhập (Income)",
  "Số tiền cần giảm (Target)",
  "Bảng Tổng Quan Tài Chính",
  "Tổng Giá Trị Tài Sản (Net Worth)",
  "Hiệu Suất Đầu Tư (Growth Rate)",
  "Tổng Giá Trị Tài Sản Gốc (Original Value)",
  "Thông tin Phân tích & Gợi ý",
  "Cập nhật lần cuối: 26/05/2026",
  "Phân Bổ Tài Sản & Cắt Giảm Ngân Sách",
  "Tổng giá trị tài sản 12 tháng gần nhất",
  "Tổng giá trị tài sản từng tháng năm",
  "Tổng giá trị tài sản qua các năm",
  "Tổng giá trị Tiết kiệm và Đầu tư",
  "Chi tiết từng tài sản trong danh mục",
  "Chưa có dữ liệu lịch sử. Hãy lưu snapshot tài sản để bắt đầu theo dõi.",
  "Cash Flow Growth",
  "💳 Sinh hoạt",
  "🏦 Tiết kiệm",
  "📈 Đầu tư",
  "🛡️ Khóa",
  "Thiết Lập Danh Mục",
  "Lưu Phân Bổ Thực Tế",
  "Lịch sử phân bổ",
  "Lịch sử lưu thông tin",
  "Thêm danh mục",
  "Thêm Tài Sản",
  "Lưu thông tin",
  "Lưu Thiết Lập",
  "Thiết lập mới",
  "Xóa danh mục",
  "Tổng cộng",
  "Tổng đã phân bổ",
  "Tổng tài sản",
  "Tên danh mục...",
  "-- Liên kết tài sản --",
  "Số tiền giảm",
  "Số tiền thực tế",
  "Loại trừ",
  "Áp dụng",
  "Tổng dòng",
  "Cân đối (Balanced)",
  "Tên danh mục",
  "Phân loại",
  "Phân Bổ Tài Sản",
  "Sửa tài sản",
  "Xóa tài sản",
  "Vốn ban đầu",
  "Ngày cập nhật",
  "Hành động",
  "Khôi phục",
  "Tỉ trọng",
  "Số tiền",
  "Danh mục",
  "Hủy",
  "Loại",
  "Tổng quan",
  "Chi tiết",
  "Khối",
  " tài sản · tổng ",
  "Gốc: ",
  "Phân bổ gốc: ",
  " danh mục",
];

viKeys.sort((a, b) => b.length - a.length);

let totalWraps = 0;
for (const vi of viKeys) {
  const pieces = [];
  let lastIndex = 0;
  let idx;
  
  while ((idx = content.indexOf(vi, lastIndex)) !== -1) {
    const before = content.slice(Math.max(0, idx - 3), idx);
    const after = content.slice(idx + vi.length, idx + vi.length + 2);
    
    if (before === "t('" && after === "')") {
      pieces.push(content.slice(lastIndex, idx + vi.length));
    } else {
      pieces.push(content.slice(lastIndex, idx));
      pieces.push("{t('" + vi + "')}");
      totalWraps++;
    }
    lastIndex = idx + vi.length;
  }
  pieces.push(content.slice(lastIndex));
  content = pieces.join('');
}

console.log('Total string wraps: ' + totalWraps);
writeFileSync(filePath, content, 'utf-8');
console.log('Done!');
