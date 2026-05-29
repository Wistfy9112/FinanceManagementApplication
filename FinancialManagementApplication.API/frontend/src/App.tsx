import React, { useState, useEffect } from 'react';
import { useToast } from "./components/ui/Toast";
import { 
  authService, 
  assetService, 
  portfolioService, 
  checkConnection, 
  getLoggedUser
} from './services/api';

// Format number with commas, no decimals (for input display)
const formatInputNumber = (value: number) => {
  if (isNaN(value)) return '0';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// Parse comma-formatted input string back to number
const parseInputNumber = (str: string) => {
  return parseFloat(str.replace(/,/g, '')) || 0;
};

// Format currency in USD (or VND with $ symbol as in the spreadsheets)
const formatCurrency = (value: number) => {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.abs(value));
  return `${value < 0 ? '-' : ''}$${formatted}`;
};

// Format percentages cleanly
const formatPercentage = (value: number) => {
  if (isNaN(value) || !isFinite(value)) return '0.00%';
  return `${value.toFixed(4)}%`;
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assets' | 'portfolio'>('dashboard');
  const [isDemo, setIsDemo] = useState<boolean>(true);
  
  // App States
  const [assets, setAssets] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [allocations, setAllocations] = useState<any[]>([]);
  
  // Budget cut states
  const [income, setIncome] = useState<number>(19139550);
  const [targetReduction, setTargetReduction] = useState<number>(500000);
  const [exclusions, setExclusions] = useState<string[]>(['al12']); // Default: "Health" al12 is excluded

  // Setup mode states
  const [showSetup, setShowSetup] = useState<boolean>(false);
  const [setupAmount, setSetupAmount] = useState<number>(portfolio?.Amount || 19139550);
  const [setupAllocations, setSetupAllocations] = useState<any[]>([]);

  // Loading & Error States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [assetModal, setAssetModal] = useState<{
    isOpen: boolean;
    mode: 'add' | 'edit';
    data: { Id?: string; Name: string; InitialValue: number; CurrentValue: number };
  }>({
    isOpen: false,
    mode: 'add',
    data: { Name: '', InitialValue: 0, CurrentValue: 0 }
  });

  // Check connection and fetch initial data on mount
  useEffect(() => {
    const initApp = async () => {
      setLoading(true);
      const connected = await checkConnection();
      setIsDemo(!connected);

      const logged = getLoggedUser();
      if (logged) {
        setUser(logged);
        await loadData();
      }
      setLoading(false);
    };

    initApp();

    // Listen to network status changes
    const handleStatusChange = (e: any) => {
      setIsDemo(e.detail.isDemoMode);
    };
    window.addEventListener('api-status-changed', handleStatusChange);
    return () => window.removeEventListener('api-status-changed', handleStatusChange);
  }, []);

  // Reload data
  const loadData = async () => {
    try {
      setError(null);
      if (!user) return;
      
      const assetList = await assetService.getAll(user.id);
      setAssets(assetList);

      const { portfolio: port, allocations: allocs } = await portfolioService.getDetails(user.id);
      setPortfolio(port);
      setAllocations(allocs);
      
      const config = portfolioService.getBudgetCutConfig();
      setIncome(config.income);
      setTargetReduction(config.targetReduction);
      setExclusions(config.exclusions);
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu.');
    }
  };

  // Trigger data load when user logs in
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Auth Handlers
  const { addToast } = useToast();

  const handleLogin = async (email: string, pass: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await authService.login(email, pass);
      setUser(res.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (email: string, pass: string, name: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await authService.register(email, pass, name);
      setUser(res.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authService.loginDemo();
      setUser(res.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setAssets([]);
    setPortfolio(null);
    setAllocations([]);
  };

  // Asset Handlers
  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      if (!user) return;
      
      if (assetModal.mode === 'add') {
        await assetService.create(assetModal.data, user.id);
      } else if (assetModal.mode === 'edit' && assetModal.data.Id) {
        await assetService.update(assetModal.data.Id, assetModal.data as any, user.id);
      }
      setAssetModal({ ...assetModal, isOpen: false });
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tài sản này?')) return;
    try {
      setError(null);
      await assetService.delete(id);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Budget Cut Handlers
  const handleUpdateIncome = (val: number) => {
    setIncome(val);
    portfolioService.saveBudgetCutConfig({ income: val, targetReduction, exclusions });
  };

  const handleUpdateTargetReduction = (val: number) => {
    setTargetReduction(val);
    portfolioService.saveBudgetCutConfig({ income, targetReduction: val, exclusions });
  };

  const handleToggleExclusion = (id: string) => {
    const updated = exclusions.includes(id) 
      ? exclusions.filter(x => x !== id)
      : [...exclusions, id];
    setExclusions(updated);
    portfolioService.saveBudgetCutConfig({ income, targetReduction, exclusions: updated });
  };

  // Two-way Portfolio allocation adjustments
  const handleUpdateAllocationPercent = (id: string, newPercent: number) => {
    const updated = allocations.map(al => {
      if (al.Id === id) {
        const newAmount = (portfolio?.Amount || 0) * (newPercent / 100);
        return { ...al, TargetPercentage: newPercent, CurrentAmount: newAmount };
      }
      return al;
    });
    setAllocations(updated);
    portfolioService.updateAllocations(updated);
  };

  const handleUpdateAllocationCash = (id: string, newCash: number) => {
    const remain = portfolio?.Amount || 1;
    const updated = allocations.map(al => {
      if (al.Id === id) {
        const newPercent = (newCash / remain) * 100;
        return { ...al, TargetPercentage: newPercent, CurrentAmount: newCash };
      }
      return al;
    });
    setAllocations(updated);
    portfolioService.updateAllocations(updated);
  };
  const handleAllocateActual = async () => {
    try {
      await portfolioService.saveAllocations(allocations);
      addToast({ title: 'Phân bổ đã được lưu thành công!', variant: 'success' });
      await loadData();
    } catch (err: any) {
      addToast({ title: 'Lỗi khi lưu phân bổ', description: err.message, variant: 'error' });
    }
  };

  // Setup mode handlers
  const handleStartSetup = () => {
    setSetupAmount(portfolio?.Amount || 0);
    setSetupAllocations(allocations.map(al => ({
      ...al,
      setupAmount: al.CurrentAmount
    })));
    setShowSetup(true);
  };

  const handleCancelSetup = () => {
    setShowSetup(false);
  };

  const handleSetupAmountChange = (val: number) => {
    setSetupAmount(val);
    const updated = setupAllocations.map(al => {
      const newPercent = val > 0 ? (al.setupAmount / val) * 100 : 0;
      return { ...al, TargetPercentage: newPercent, CurrentAmount: al.setupAmount };
    });
    setSetupAllocations(updated);
  };

  const handleSetupAllocationAmountChange = (id: string, newAmount: number) => {
    const otherTotal = setupAllocations
      .filter(al => al.Id !== id)
      .reduce((sum, al) => sum + (al.setupAmount || 0), 0);
    const otherPercent = setupAllocations
      .filter(al => al.Id !== id)
      .reduce((sum, al) => sum + (setupAmount > 0 ? ((al.setupAmount || 0) / setupAmount) * 100 : 0), 0);
    if (otherTotal + newAmount > setupAmount) return;
    if (otherPercent + (setupAmount > 0 ? (newAmount / setupAmount) * 100 : 0) > 100) return;
    const updated = setupAllocations.map(al => {
      if (al.Id === id) {
        const newPercent = setupAmount > 0 ? (newAmount / setupAmount) * 100 : 0;
        return { ...al, setupAmount: newAmount, CurrentAmount: newAmount, TargetPercentage: newPercent };
      }
      return al;
    });
    setSetupAllocations(updated);
  };

  const handleSetupAddAllocation = () => {
    const totalAllocated = setupAllocations.reduce((sum, al) => sum + (al.setupAmount || 0), 0);
    const totalPercent = setupAllocations.reduce((sum, al) => sum + al.TargetPercentage, 0);
    if (totalAllocated > setupAmount || totalPercent > 100) {
      setError('Không thể thêm danh mục mới vì đã đạt hoặc vượt quá phân bổ gốc / 100%.');
      return;
    }
    const newId = 'al-' + Math.random().toString(36).substr(2, 9);
    const newAl = {
      Id: newId,
      PortfolioId: portfolio?.Id || 'p1',
      FinancialCategory: 'Expense',
      Name: '',
      CurrentAmount: 0,
      TargetPercentage: 0,
      setupAmount: 0
    };
    setSetupAllocations([...setupAllocations, newAl]);
  };

  const handleSetupEditAllocation = (id: string, field: string, value: any) => {
    const updated = setupAllocations.map(al => {
      if (al.Id === id) {
        const updatedAl = { ...al, [field]: value };
        if (field === 'Name' || field === 'FinancialCategory') {
          return updatedAl;
        }
        return updatedAl;
      }
      return al;
    });
    setSetupAllocations(updated);
  };

  const handleSetupDeleteAllocation = (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa danh mục này?')) return;
    const filtered = setupAllocations.filter(al => al.Id !== id);
    const updated = filtered.map(al => {
      const newPercent = setupAmount > 0 ? (al.setupAmount / setupAmount) * 100 : 0;
      return { ...al, TargetPercentage: newPercent, CurrentAmount: al.setupAmount };
    });
    setSetupAllocations(updated);
  };

  const handleSaveSetup = async () => {
    try {
      setError(null);
      if (!user) return;
      if (setupAllocations.length === 0) {
        setError('Vui lòng thêm ít nhất một danh mục.');
        return;
      }
      if (setupAllocations.some(al => !al.Name.trim())) {
        setError('Vui lòng nhập tên cho tất cả danh mục.');
        return;
      }
      const totalPct = setupAllocations.reduce((sum, al) => sum + al.TargetPercentage, 0);
      if (totalPct > 100) {
        setError('Tổng tỉ trọng vượt quá 100%. Vui lòng điều chỉnh lại.');
        return;
      }

      await portfolioService.updateAmount(portfolio?.Id || 'p1', setupAmount, 'Kế Hoạch Phân Bổ Tổng Thể', user.id);

      const savedAllocs = setupAllocations.map(al => ({
        Id: al.Id,
        PortfolioId: portfolio?.Id || 'p1',
        FinancialCategory: al.FinancialCategory,
        Name: al.Name,
        CurrentAmount: al.CurrentAmount,
        TargetPercentage: al.TargetPercentage
      }));

      await portfolioService.saveAllocations(savedAllocs);
      setAllocations(savedAllocs);
      setPortfolio(prev => prev ? { ...prev, Amount: setupAmount } : prev);
      setShowSetup(false);
      addToast({ title: 'Thiết lập danh mục thành công!', variant: 'success' });
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu thiết lập.');
    }
  };

  // Dynamic values calculated from allocations
  const calculateAllocationsData = () => {
    return allocations.map(al => {
      const currentAmount = income > 0 ? income * (al.TargetPercentage / 100) : al.CurrentAmount;
      const isExcluded = exclusions.includes(al.Id);
      const reduction = isExcluded ? 0 : targetReduction * (al.TargetPercentage / 100);
      const actual = currentAmount - reduction;
      return {
        ...al,
        CurrentAmount: currentAmount,
        reduction,
        actual,
        isExcluded
      };
    });
  };

  const calculatedAllocs = calculateAllocationsData();
  const calculatedExpenses = calculatedAllocs.filter(al => al.FinancialCategory === 'Expense');
  const calculatedSavings = calculatedAllocs.filter(al => al.FinancialCategory === 'Saving');
  const calculatedInvestments = calculatedAllocs.filter(al => al.FinancialCategory === 'Investment');

  const totalReductionAmount = calculatedAllocs.reduce((sum, al) => sum + al.reduction, 0);
  const totalActualAmount = calculatedAllocs.reduce((sum, al) => sum + al.actual, 0);

  const totalAllocatedPercentage = allocations.reduce((sum, al) => sum + al.TargetPercentage, 0);
  const totalAllocatedCash = calculatedAllocs.reduce((sum, al) => sum + al.CurrentAmount, 0);

  const totalSavingCash = calculatedSavings.reduce((sum, al) => sum + al.CurrentAmount, 0);
  const totalInvestmentCash = calculatedInvestments.reduce((sum, al) => sum + al.CurrentAmount, 0);

  // Dynamic calculations for Assets
  const totalInitial = assets.reduce((sum, a) => sum + a.InitialValue, 0);
  const totalCurrent = assets.reduce((sum, a) => sum + a.CurrentValue, 0);
  const totalInterest = totalCurrent - totalInitial;
  const totalInterestRatio = totalInitial > 0 ? (totalInterest / totalInitial) * 100 : 0;

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0b10' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ border: '3px solid rgba(99,102,241,0.1)', borderTop: '3px solid #6366f1', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }} />
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Đang khởi tạo hệ thống quản lý tài chính...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthPage 
        onLogin={handleLogin} 
        onRegister={handleRegister} 
        onDemo={handleDemo}
        error={error} 
        isDemo={isDemo}
      />
    );
  }

  return (
    <div className="app">
      {/* Navigation */}
      <nav className="navbar">
        <div className="navbar-content">
          <div className="logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="logo-text">FINANCE FLOW</span>
          </div>
          
          <div className="nav-links">
            <button 
              className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Tổng quan
            </button>
            <button 
              className={`nav-link ${activeTab === 'assets' ? 'active' : ''}`}
              onClick={() => setActiveTab('assets')}
            >
              Quản lý Tài sản
            </button>
            <button 
              className={`nav-link ${activeTab === 'portfolio' ? 'active' : ''}`}
              onClick={() => setActiveTab('portfolio')}
            >
              Phân bổ Danh mục
            </button>
          </div>

          <div className="nav-right">
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
              <button className="logout-btn" onClick={handleLogout} title="Đăng xuất">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="app-container">
        {error && (
          <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#f43f5e', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer', fontWeight: 700 }} onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {isDemo && (
          <div className="alert-notice demo-banner">
            <div className="alert-notice-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            </div>
            <div className="alert-notice-content">
              <strong>Ứng dụng đang chạy ở Chế độ Demo (Offline Mock Mode)</strong>
              Hệ thống tự động phát hiện backend đang ngoại tuyến. Mọi hoạt động thêm, sửa, xóa, và cắt giảm ngân sách được thực hiện an toàn trên bộ nhớ trình duyệt của bạn. Khởi chạy Backend .NET API để tự động chuyển sang chế độ lưu trữ cơ sở dữ liệu.
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <DashboardPage 
            totalCurrent={totalCurrent}
            totalInterest={totalInterest}
            totalInterestRatio={totalInterestRatio}
            portfolio={portfolio}
            allocations={allocations}
            totalSavingCash={totalSavingCash}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'assets' && (
          <AssetsPage 
            assets={assets}
            totalInitial={totalInitial}
            totalCurrent={totalCurrent}
            totalInterest={totalInterest}
            totalInterestRatio={totalInterestRatio}
            onAdd={() => setAssetModal({ isOpen: true, mode: 'add', data: { Name: '', InitialValue: 0, CurrentValue: 0 } })}
            onEdit={(a: any) => setAssetModal({ isOpen: true, mode: 'edit', data: { Id: a.Id, Name: a.Name, InitialValue: a.InitialValue, CurrentValue: a.CurrentValue } })}
            onDelete={handleDeleteAsset}
          />
        )}

        {activeTab === 'portfolio' && (
          <PortfolioPage 
            portfolio={portfolio}
            income={income}
            onAllocateActual={handleAllocateActual}
            targetReduction={targetReduction}
            calculatedExpenses={calculatedExpenses}
            calculatedSavings={calculatedSavings}
            calculatedInvestments={calculatedInvestments}
            totalSavingCash={totalSavingCash}
            totalInvestmentCash={totalInvestmentCash}
            totalReductionAmount={totalReductionAmount}
            totalActualAmount={totalActualAmount}
            totalAllocatedPercentage={totalAllocatedPercentage}
            totalAllocatedCash={totalAllocatedCash}
            onUpdateIncome={handleUpdateIncome}
            onUpdateTargetReduction={handleUpdateTargetReduction}
            onToggleExclusion={handleToggleExclusion}
            onUpdateAllocationPercent={handleUpdateAllocationPercent}
            onUpdateAllocationCash={handleUpdateAllocationCash}
            showSetup={showSetup}
            setupAmount={setupAmount}
            setupAllocations={setupAllocations}
            onStartSetup={handleStartSetup}
            onCancelSetup={handleCancelSetup}
            onSaveSetup={handleSaveSetup}
            onSetupAmountChange={handleSetupAmountChange}
            onSetupAddAllocation={handleSetupAddAllocation}
            onSetupEditAllocation={handleSetupEditAllocation}
            onSetupDeleteAllocation={handleSetupDeleteAllocation}
            onSetupAllocationAmountChange={handleSetupAllocationAmountChange}
          />
        )}
      </main>

      {/* Asset Modal */}
      {assetModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{assetModal.mode === 'add' ? 'Thêm Tài Sản Mới' : 'Cập Nhật Tài Sản'}</h3>
              <button className="modal-close" onClick={() => setAssetModal({ ...assetModal, isOpen: false })}>✕</button>
            </div>
            <form onSubmit={handleSaveAsset}>
              <div className="form-group">
                <label className="form-label">Tên tài sản</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  value={assetModal.data.Name}
                  onChange={(e) => setAssetModal({ ...assetModal, data: { ...assetModal.data, Name: e.target.value } })}
                  placeholder="Ví dụ: Saving, Emergency, ETF..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Vốn ban đầu (Funds)</label>
                <MoneyInput 
                  className="form-control" 
                  value={assetModal.data.InitialValue}
                  onChange={(val) => setAssetModal({ ...assetModal, data: { ...assetModal.data, InitialValue: val } })}
                  placeholder="Nhập số tiền vốn ban đầu"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Giá trị hiện tại (Current)</label>
                <MoneyInput 
                  className="form-control" 
                  value={assetModal.data.CurrentValue}
                  onChange={(val) => setAssetModal({ ...assetModal, data: { ...assetModal.data, CurrentValue: val } })}
                  placeholder="Nhập giá trị tài sản hiện tại"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setAssetModal({ ...assetModal, isOpen: false })}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ======================== COMPONENTS ========================

// 1. AUTH PAGE COMPONENT
function AuthPage({ onLogin, onRegister, onDemo, error, isDemo }: { onLogin: any; onRegister: any; onDemo: any; error: string | null; isDemo: boolean }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      onLogin(email, password);
    } else {
      onRegister(email, password, displayName);
    }
  };

  const handleUseDemoAccount = () => {
    setEmail('demo@example.com');
    setPassword('demo123');
  };

  return (
    <div className="auth-wrapper">
      <div className="card auth-card">
        <div className="auth-header">
          <div className="logo" style={{ justifyContent: 'center', marginBottom: '16px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: '1.8rem' }}>FINANCE FLOW</span>
          </div>
          <h2 className="auth-title">{isLogin ? 'Đăng Nhập Hệ Thống' : 'Đăng Ký Tài Khoản'}</h2>
          <p className="auth-subtitle">Quản lý dòng tiền và tài sản cá nhân cao cấp</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#f43f5e', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.85rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Tên hiển thị</label>
              <input 
                type="text" 
                className="form-control" 
                required 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nhập tên hiển thị của bạn" 
            />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Địa chỉ Email</label>
            <input 
              type="email" 
              className="form-control" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nhap.email@cua.ban" 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <input 
              type="password" 
              className="form-control" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu" 
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
            {isLogin ? 'Đăng Nhập' : 'Tạo Tài Khoản'}
          </button>
        </form>

        {isLogin && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-light)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Trải nghiệm ứng dụng không cần tài khoản:</p>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ width: '100%', fontSize: '0.85rem', padding: '10px 12px', background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)', marginBottom: '12px' }}
              onClick={onDemo}
            >
              📊 Trải nghiệm Chế độ Demo (Offline)
            </button>

            {isDemo && (
              <>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Tài khoản Demo có sẵn (Mock Offline):</p>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ width: '100%', fontSize: '0.8rem', padding: '6px 12px' }}
                  onClick={handleUseDemoAccount}
                >
                  Sử dụng tài khoản Demo nhanh
                </button>
              </>
            )}
          </div>
        )}

        <div className="auth-switch">
          {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
          <button className="auth-switch-btn" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
          </button>
        </div>
      </div>
    </div>
  );
}

// 2. DASHBOARD COMPONENT
function DashboardPage({ 
  totalCurrent, 
  totalInterest, 
  totalInterestRatio, 
  portfolio, 
  allocations, 
  totalSavingCash, 
  setActiveTab 
}: { 
  totalCurrent: number; 
  totalInterest: number; 
  totalInterestRatio: number; 
  portfolio: any; 
  allocations: any[]; 
  totalSavingCash: number; 
  setActiveTab: any 
}) {
  
  // Custom SVG Area Chart coordinates calculations (simulate historical net worth)
  // Let's create a beautiful curve from total current assets
  const chartHeight = 220;
  const chartWidth = 600;
  const pointsCount = 12;
  const baseValue = totalCurrent ?? 0;
  
  // Create 12 historical simulation points leading up to current Net Worth
  const historyData = [
    baseValue * 0.58,
    baseValue * 0.63,
    baseValue * 0.67,
    baseValue * 0.71,
    baseValue * 0.75,
    baseValue * 0.79,
    baseValue * 0.83,
    baseValue * 0.80,
    baseValue * 0.87,
    baseValue * 0.91,
    baseValue * 0.96,
    baseValue
  ];

  const minVal = Math.min(...historyData) * 0.95;
  const maxVal = Math.max(...historyData) * 1.05;
  const valRange = (maxVal - minVal) || 1;

  const points = historyData.map((val, idx) => {
    const x = (idx / (pointsCount - 1)) * chartWidth;
    const y = chartHeight - ((val - minVal) / valRange) * (chartHeight - 40) - 20;
    return { x, y, value: val };
  });

  const pathD = `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`;
  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

  // Dynamic values for Donut Allocation Chart
  // We take top 5 allocations, group remaining into "Khác"
  const sortedAllocs = [...allocations].sort((a,b) => b.CurrentAmount - a.CurrentAmount);
  const topAllocs = sortedAllocs.slice(0, 4);
  const otherSum = sortedAllocs.slice(4).reduce((sum, al) => sum + al.CurrentAmount, 0);
  
  const donutData = topAllocs.map(al => ({ name: al.Name, value: al.CurrentAmount }));
  if (otherSum > 0) donutData.push({ name: 'Khác', value: otherSum });

  const totalDonutValue = donutData.reduce((sum, d) => sum + d.value, 0) || 1;
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#d946ef', '#64748b'];

  // Calculate donut segments stroke-dasharray
  let accumulatedPercent = 0;
  const segments = donutData.map((d, idx) => {
    const percent = d.value / totalDonutValue;
    const strokeDash = `${percent * 314.16} 314.16`;
    const strokeOffset = -accumulatedPercent * 314.16;
    accumulatedPercent += percent;
    return {
      ...d,
      strokeDash,
      strokeOffset,
      color: colors[idx % colors.length]
    };
  });

  return (
    <div>
      <div className="tab-header">
        <h2 className="section-title">Bảng Tổng Quan Tài Chính</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Cập nhật lần cuối: 26/05/2026</span>
      </div>

      {/* Metrics Row */}
      <div className="grid-3">
        <div className="card" onClick={() => setActiveTab('assets')} style={{ cursor: 'pointer' }}>
          <div className="metric-header">
            <span className="metric-title">Tổng Giá Trị Tài Sản (Net Worth)</span>
            <span className="metric-icon" style={{ color: 'var(--primary)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
            </span>
          </div>
          <div className="metric-value">{formatCurrency(totalCurrent)}</div>
          <div className={`metric-change ${totalInterest >= 0 ? 'positive' : 'negative'}`}>
            <span>{totalInterest >= 0 ? '▲' : '▼'}</span>
            <span>{formatCurrency(totalInterest)} ({totalInterestRatio.toFixed(2)}%)</span>
          </div>
        </div>

        <div className="card" onClick={() => setActiveTab('assets')} style={{ cursor: 'pointer' }}>
          <div className="metric-header">
            <span className="metric-title">Hiệu Suất Đầu Tư (Growth Rate)</span>
            <span className="metric-icon" style={{ color: 'var(--success)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M23 6l-9.5 9.5-5-5L1 18M17 6h6v6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </div>
          <div className="metric-value" style={{ color: totalInterest >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {totalInterestRatio >= 0 ? '+' : ''}{totalInterestRatio.toFixed(2)}%
          </div>
          <div className="metric-change" style={{ color: 'var(--text-secondary)' }}>
            Lãi thuần ròng từ vốn đầu tư
          </div>
        </div>

        <div className="card" onClick={() => setActiveTab('portfolio')} style={{ cursor: 'pointer' }}>
          <div className="metric-header">
            <span className="metric-title">Gốc Phân Bổ Danh Mục (Remain)</span>
            <span className="metric-icon" style={{ color: 'var(--warning)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>
              </svg>
            </span>
          </div>
          <div className="metric-value">{formatCurrency(portfolio?.Amount ?? 0)}</div>
          <div className="metric-change" style={{ color: 'var(--text-secondary)' }}>
            Ngân sách khả dụng phân bổ
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid-2-1">
        {/* SVG Area Chart */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>Xu Hướng Tài Sản Tổng Thể</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>Mô phỏng 12 tháng tăng trưởng tích lũy ròng gần nhất</p>
          
          <div className="chart-container">
            <svg className="chart-svg" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
              <defs>
                <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25"/>
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0"/>
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1={chartHeight * 0.25} x2={chartWidth} y2={chartHeight * 0.25} className="chart-grid-line" />
              <line x1="0" y1={chartHeight * 0.5} x2={chartWidth} y2={chartHeight * 0.5} className="chart-grid-line" />
              <line x1="0" y1={chartHeight * 0.75} x2={chartWidth} y2={chartHeight * 0.75} className="chart-grid-line" />

              {/* Area */}
              <path d={areaD} className="chart-area" />

              {/* Path Line */}
              <path d={pathD} className="chart-path" />

              {/* Points & Labels */}
              {points.map((p, idx) => (
                <g key={idx}>
                  <circle cx={p.x} cy={p.y} r="5" className="chart-dot" />
                  {/* Tooltip-like value display on points */}
                  <text 
                    x={p.x} 
                    y={p.y - 12} 
                    className="chart-label" 
                    textAnchor="middle"
                    style={{ fontWeight: 600, fill: 'var(--text-primary)' }}
                  >
                    {formatCurrency(p.value).split('.')[0]}
                  </text>
                  <text 
                    x={p.x} 
                    y={chartHeight + 14} 
                    className="chart-label" 
                    textAnchor="middle"
                  >
                    T{idx + 1}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* SVG Donut Allocation Chart */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>Phân Bổ Danh Mục</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>Cơ cấu tỉ trọng các quỹ lớn nhất</p>
          </div>

          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <svg className="donut-svg" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="18" />
              {segments.map((seg, idx) => (
                <circle 
                  key={idx}
                  cx="60" 
                  cy="60" 
                  r="50" 
                  className="donut-segment"
                  stroke={seg.color}
                  strokeDasharray={seg.strokeDash}
                  strokeDashoffset={seg.strokeOffset}
                  transform="rotate(-90 60 60)"
                />
              ))}
              <text x="60" y="60" className="donut-text">
                {formatCurrency(totalCurrent).substring(0, 4)}...
              </text>
              <text x="60" y="74" className="donut-label">
                Tài sản ròng
              </text>
            </svg>
          </div>

          <div className="chart-legend">
            {segments.map((seg, idx) => (
              <div key={idx} className="legend-item">
                <span className="legend-color" style={{ backgroundColor: seg.color }} />
                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {seg.name} ({((seg.value / totalDonutValue) * 100).toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Action Info Banner */}
      <div className="card" style={{ background: 'rgba(99,102,241,0.03)', borderColor: 'rgba(99,102,241,0.1)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>Thông tin Phân tích & Gợi ý</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Hệ thống tài chính của bạn đang hoạt động ổn định. Tỷ lệ tăng trưởng đầu tư ròng đạt ngưỡng <strong style={{ color: 'var(--success)' }}>{(totalInterestRatio).toFixed(2)}%</strong>. 
          Khối **Tích lũy & Đầu tư** hiện nắm giữ tổng cộng khoảng <strong style={{ color: 'var(--primary)' }}>{formatCurrency(totalSavingCash)}</strong>. 
          Để điều chỉnh cơ cấu phân bổ, tối ưu thuế hoặc lên kế hoạch cắt giảm chi phí sinh hoạt, vui lòng chuyển qua tab **Phân bổ Danh mục** để sử dụng tính năng lập kế hoạch giảm tải ngân sách chi tiết.
        </p>
      </div>
    </div>
  );
}

// 3. ASSETS LIST COMPONENT
function AssetsPage({ 
  assets, 
  totalInitial, 
  totalCurrent, 
  totalInterest, 
  totalInterestRatio, 
  onAdd, 
  onEdit, 
  onDelete 
}: { 
  assets: any[]; 
  totalInitial: number; 
  totalCurrent: number; 
  totalInterest: number; 
  totalInterestRatio: number; 
  onAdd: any; 
  onEdit: any; 
  onDelete: any 
}) {
  return (
    <div>
      <div className="tab-header">
        <div>
          <h2 className="section-title">Bảng Quản Lý Tài Sản Chi Tiết</h2>
          <p className="section-desc">Theo dõi giá trị ban đầu, giá trị thực tế hiện tại và mức độ sinh trưởng của từng tài sản</p>
        </div>
        <button className="btn btn-primary" onClick={onAdd}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Thêm Tài Sản
        </button>
      </div>

      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
              <th>Tên tài sản (Assets Name)</th>
              <th style={{ textAlign: 'right' }}>Vốn ban đầu (Funds)</th>
              <th style={{ textAlign: 'right' }}>Giá trị hiện tại (Current)</th>
              <th style={{ textAlign: 'right' }}>Lợi nhuận (Interest)</th>
              <th style={{ textAlign: 'right' }}>Tỷ suất (Interest ratio)</th>
              <th style={{ textAlign: 'center' }}>Ngày cập nhật</th>
              <th style={{ textAlign: 'center', width: '100px' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                  Chưa có dữ liệu tài sản. Bấm nút "Thêm Tài Sản" để khởi tạo.
                </td>
              </tr>
            ) : (
              assets.map((asset, idx) => {
                const interest = asset.CurrentValue - asset.InitialValue;
                // Protection against #DIV/0!
                const ratio = asset.InitialValue > 0 ? (interest / asset.InitialValue) * 100 : 0;
                
                return (
                  <tr key={asset.Id}>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{asset.Name}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 500 }}>
                      {formatCurrency(asset.InitialValue)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 500 }}>
                      {formatCurrency(asset.CurrentValue)}
                    </td>
                    <td style={{ 
                      textAlign: 'right', 
                      fontFamily: 'var(--font-display)', 
                      fontWeight: 600,
                      color: interest > 0 ? 'var(--success)' : interest < 0 ? 'var(--danger)' : 'var(--text-muted)'
                    }}>
                      {interest > 0 ? '+' : ''}{formatCurrency(interest)}
                    </td>
                    <td style={{ 
                      textAlign: 'right', 
                      fontFamily: 'var(--font-display)', 
                      fontWeight: 600,
                      color: interest > 0 ? 'var(--success)' : interest < 0 ? 'var(--danger)' : 'var(--text-muted)'
                    }}>
                      {asset.InitialValue > 0 ? (
                        <>
                          {interest > 0 ? '+' : ''}
                          {ratio.toFixed(2)}%
                        </>
                      ) : (
                        '#DIV/0!'
                      )}
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      26/05/2026
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button className="btn-icon edit" onClick={() => onEdit(asset)} title="Sửa tài sản">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                          </svg>
                        </button>
                        <button className="btn-icon delete" onClick={() => onDelete(asset.Id)} title="Xóa tài sản">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}

          </tbody>
        </table>
      </div>
    </div>
  );
}

// 4. PORTFOLIO & BUDGET CUT PLANNING COMPONENT
function PortfolioPage({
  portfolio,
  income,
  onAllocateActual,
  targetReduction,
  calculatedExpenses,
  calculatedSavings,
  calculatedInvestments,
  totalSavingCash,
  totalInvestmentCash,
  totalReductionAmount,
  totalActualAmount,
  totalAllocatedPercentage,
  totalAllocatedCash,
  onUpdateIncome,
  onUpdateTargetReduction,
  onToggleExclusion,
  onUpdateAllocationPercent,
  onUpdateAllocationCash,
  showSetup,
  setupAmount,
  setupAllocations,
  onStartSetup,
  onCancelSetup,
  onSaveSetup,
  onSetupAmountChange,
  onSetupAddAllocation,
  onSetupEditAllocation,
  onSetupDeleteAllocation,
  onSetupAllocationAmountChange
}: {
  portfolio: any;
  income: number;
  onAllocateActual: () => void;
  targetReduction: number;
  calculatedExpenses: any[];
  calculatedSavings: any[];
  calculatedInvestments: any[];
  totalSavingCash: number;
  totalInvestmentCash: number;
  totalReductionAmount: number;
  totalActualAmount: number;
  totalAllocatedPercentage: number;
  totalAllocatedCash: number;
  onUpdateIncome: any;
  onUpdateTargetReduction: any;
  onToggleExclusion: any;
  onUpdateAllocationPercent: any;
  onUpdateAllocationCash: any;
  showSetup: boolean;
  setupAmount: number;
  setupAllocations: any[];
  onStartSetup: () => void;
  onCancelSetup: () => void;
  onSaveSetup: () => void;
  onSetupAmountChange: (val: number) => void;
  onSetupAddAllocation: () => void;
  onSetupEditAllocation: (id: string, field: string, value: any) => void;
  onSetupDeleteAllocation: (id: string) => void;
  onSetupAllocationAmountChange: (id: string, amount: number) => void;
}) {

  // Visual warnings for total percentages
  const isPercentageBalanced = Math.abs(totalAllocatedPercentage - 100) < 0.01;

  // Setup mode totals
  const setupTotalAmount = setupAllocations.reduce((sum, al) => sum + (al.setupAmount || 0), 0);
  const setupTotalPercent = setupAllocations.reduce((sum, al) => sum + al.TargetPercentage, 0);

  if (showSetup) {
    return (
      <div>
        <div className="tab-header">
          <div>
            <h2 className="section-title">Thiết Lập Danh Mục</h2>
            <p className="section-desc">Thêm, sửa, xóa danh mục và nhập số tiền phân bổ. Tỉ lệ phần trăm sẽ tự động tính toán.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={onCancelSetup}>
              Hủy
            </button>
            <button className="btn btn-primary" onClick={onSaveSetup} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              Lưu Thiết Lập
            </button>
          </div>
        </div>

        {/* Base Amount Input */}
        <div className="budget-cut-header">
          <div className="budget-input-item">
            <label>Phân bổ gốc (Base Amount)</label>
            <MoneyInput 
              value={setupAmount} 
              onChange={(val) => onSetupAmountChange(val)} 
            />
          </div>
          <div className="budget-input-item">
            <label>Tổng đã phân bổ</label>
            <div style={{ padding: '8px 12px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '6px', fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: '1rem', color: Math.abs(setupTotalPercent - 100) < 0.01 ? 'var(--success)' : 'var(--warning)' }}>
              {setupTotalPercent.toFixed(4)}%
            </div>
          </div>
          <div style={{ flex: 1, minWidth: '220px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <div>• Nhập số tiền cho từng danh mục, hệ thống tự động tính tỉ lệ phần trăm.</div>
            <div>• Tổng tỉ trọng nên đạt <strong>100%</strong> để cân bằng.</div>
          </div>
        </div>

        {/* Setup Table */}
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '160px' }}>Phân loại</th>
                <th>Tên danh mục</th>
                <th style={{ textAlign: 'right', width: '160px' }}>Số tiền (Cash)</th>
                <th style={{ textAlign: 'right', width: '140px' }}>Tỉ trọng (%)</th>
                <th style={{ textAlign: 'center', width: '100px' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {setupAllocations.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                    Chưa có danh mục nào. Bấm "Thêm danh mục" để bắt đầu.
                  </td>
                </tr>
              ) : (
                setupAllocations.map((al, idx) => (
                  <tr key={al.Id}>
                    <td>
                      <select
                        className="form-control"
                        style={{ padding: '4px 8px', height: '32px', fontSize: '0.85rem', width: '100%' }}
                        value={al.FinancialCategory}
                        onChange={(e) => onSetupEditAllocation(al.Id, 'FinancialCategory', e.target.value)}
                      >
                        <option value="Expense">Sinh hoạt</option>
                        <option value="Saving">Tiết kiệm</option>
                        <option value="Investment">Đầu tư</option>
                      </select>
                    </td>
                    <td>
                      <input 
                        type="text" 
                        className="form-control"
                        style={{ padding: '4px 8px', height: '32px', fontSize: '0.85rem', width: '100%' }}
                        value={al.Name}
                        onChange={(e) => onSetupEditAllocation(al.Id, 'Name', e.target.value)}
                        placeholder="Tên danh mục..."
                      />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <MoneyInput 
                        className="form-control"
                        style={{ textAlign: 'right', padding: '4px 8px', width: '140px', display: 'inline-block', height: '32px', fontSize: '0.85rem', fontFamily: 'var(--font-display)' }}
                        value={al.setupAmount || 0}
                        onChange={(val) => onSetupAllocationAmountChange(al.Id, val)}
                      />
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                      {al.TargetPercentage.toFixed(4)}%
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className="btn-icon delete" 
                        onClick={() => onSetupDeleteAllocation(al.Id)}
                        title="Xóa danh mục"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
              {/* Setup Total Row */}
              {setupAllocations.length > 0 && (
                <tr className="total-row">
                  <td></td>
                  <td style={{ paddingLeft: '16px' }}>Tổng cộng</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)' }}>
                    {formatCurrency(setupTotalAmount)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', color: Math.abs(setupTotalPercent - 100) < 0.01 ? 'var(--success)' : '#f59e0b' }}>
                    {setupTotalPercent.toFixed(4)}%
                  </td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '16px' }}>
          <button className="btn btn-secondary" onClick={onSetupAddAllocation} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Thêm danh mục
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="tab-header">
        <div>
          <h2 className="section-title">Phân Bổ Danh Mục & Cắt Giảm Ngân Sách</h2>
          <p className="section-desc">Phân bố thu nhập thành ba khối Sinh hoạt, Tiết kiệm & Đầu tư, tích hợp bộ lập kế hoạch cắt giảm tự động</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={onStartSetup} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            Thiết lập mới
          </button>
          <button className="btn btn-primary" onClick={onAllocateActual} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            Lưu Phân Bổ Thực Tế
          </button>
        </div>
      </div>

      {/* Top Config Inputs Banner */}
      <div className="budget-cut-header">
        <div className="budget-input-item">
          <label>Thu nhập (Income)</label>
          <MoneyInput 
            value={income} 
            onChange={(val) => onUpdateIncome(val)} 
          />
        </div>
        <div className="budget-input-item">
          <label>Số tiền cần giảm (Target)</label>
          <MoneyInput 
            value={targetReduction} 
            onChange={(val) => onUpdateTargetReduction(val)} 
          />
        </div>
        <div style={{ flex: 1, minWidth: '220px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <div style={{ marginBottom: '4px' }}>• Công thức giảm mỗi dòng: <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: '3px' }}>Target * Tỉ trọng (%)</code></div>
          <div>• Bấm nút hình khiên bảo vệ <span style={{ color: 'var(--danger)' }}>🛡️</span> kế bên dòng để loại trừ dòng đó khỏi diện cắt giảm.</div>
        </div>
      </div>

      {/* Balancing Warning */}
      {!isPercentageBalanced && (
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', color: '#fbd38d', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.2rem' }}>⚠️</span>
          <span>
            Tổng tỉ trọng hiện tại đang là <strong>{totalAllocatedPercentage.toFixed(4)}%</strong>. Vui lòng điều chỉnh tỉ trọng các quỹ về đúng <strong>100.00%</strong> để dòng tiền phân bổ cân bằng hoàn toàn.
          </span>
        </div>
      )}

      {/* Spreadsheet Table */}
      <div className="table-container">
        <table className="custom-table" style={{ borderCollapse: 'separate', borderSpacing: '0' }}>
          <thead>
            <tr>
              <th style={{ width: '100px', borderRight: '1px solid var(--border-light)' }}>Khối</th>
              <th>Thông tin phân bổ (Allocations Info)</th>
              <th style={{ textAlign: 'right', width: '160px' }}>Tỉ trọng (%)</th>
              <th style={{ textAlign: 'right', width: '160px' }}>Số tiền (Cash)</th>
              <th style={{ textAlign: 'right', width: '160px' }}>Số tiền giảm</th>
              <th style={{ textAlign: 'right', width: '160px' }}>Số tiền thực tế</th>
              <th style={{ textAlign: 'center', width: '90px' }}>Loại trừ</th>
            </tr>
          </thead>
          <tbody>
            
            {/* 1. SINH HOẠT BLOCK */}
            {calculatedExpenses.map((al, idx) => (
              <tr key={al.Id}>
                {idx === 0 && (
                  <td 
                    className="span-col" 
                    rowSpan={calculatedExpenses.length} 
                    style={{ 
                      verticalAlign: 'middle', 
                      background: 'rgba(99,102,241,0.02)',
                      borderRight: '1px solid var(--border-light)'
                    }}
                  >
                    Sinh hoạt
                  </td>
                )}
                <td style={{ fontWeight: 500, paddingLeft: '16px' }}>{al.Name}</td>
                <td style={{ textAlign: 'right' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                    {al.TargetPercentage.toFixed(4)}%
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                    {formatCurrency(al.CurrentAmount)}
                  </span>
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', color: al.reduction > 0 ? 'var(--warning)' : 'var(--text-muted)', fontWeight: 500 }}>
                  {formatCurrency(al.reduction)}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  {formatCurrency(al.actual)}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button 
                    className={`exclude-btn ${al.isExcluded ? 'excluded' : ''}`}
                    onClick={() => onToggleExclusion(al.Id)}
                    title={al.isExcluded ? 'Đã được loại trừ khỏi cắt giảm' : 'Bật khiên bảo vệ loại trừ khỏi cắt giảm'}
                  >
                    {al.isExcluded ? '🛡️ Khóa' : '🔓'}
                  </button>
                </td>
              </tr>
            ))}

            {/* divider: Còn lại (Saving Base) */}
            <tr className="table-section-divider">
              <td style={{ borderRight: '1px solid var(--border-light)' }}></td>
              <td style={{ fontWeight: 700, paddingLeft: '16px' }}>Còn lại (Saving Base)</td>
              <td style={{ textAlign: 'right' }}></td>
              <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                {formatCurrency(totalSavingCash)}
              </td>
              <td></td>
              <td></td>
              <td></td>
            </tr>

            {/* 2. TIẾT KIỆM BLOCK */}
            {calculatedSavings.map((al, idx) => (
              <tr key={al.Id}>
                {idx === 0 && (
                  <td 
                    className="span-col" 
                    rowSpan={calculatedSavings.length} 
                    style={{ 
                      verticalAlign: 'middle', 
                      background: 'rgba(217,70,239,0.02)',
                      borderRight: '1px solid var(--border-light)'
                    }}
                  >
                    Tiết kiệm
                  </td>
                )}
                <td style={{ fontWeight: 500, paddingLeft: '16px' }}>{al.Name}</td>
                <td style={{ textAlign: 'right' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                    {al.TargetPercentage.toFixed(4)}%
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                    {formatCurrency(al.CurrentAmount)}
                  </span>
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', color: al.reduction > 0 ? 'var(--warning)' : 'var(--text-muted)', fontWeight: 500 }}>
                  {formatCurrency(al.reduction)}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  {formatCurrency(al.actual)}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button 
                    className={`exclude-btn ${al.isExcluded ? 'excluded' : ''}`}
                    onClick={() => onToggleExclusion(al.Id)}
                    title={al.isExcluded ? 'Đã được loại trừ khỏi cắt giảm' : 'Bật khiên bảo vệ loại trừ khỏi cắt giảm'}
                  >
                    {al.isExcluded ? '🛡️ Khóa' : '🔓'}
                  </button>
                </td>
              </tr>
            ))}

            {/* 3. ĐẦU TƯ BLOCK */}
            {calculatedInvestments.length > 0 && (
              <>
            <tr className="table-section-divider">
              <td style={{ borderRight: '1px solid var(--border-light)' }}></td>
              <td style={{ fontWeight: 700, paddingLeft: '16px' }}>Đầu tư (Investment Base)</td>
              <td style={{ textAlign: 'right' }}></td>
              <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                {formatCurrency(totalInvestmentCash)}
              </td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            {calculatedInvestments.map((al, idx) => (
              <tr key={al.Id}>
                {idx === 0 && (
                  <td 
                    className="span-col" 
                    rowSpan={calculatedInvestments.length} 
                    style={{ 
                      verticalAlign: 'middle', 
                      background: 'rgba(16,185,129,0.02)',
                      borderRight: '1px solid var(--border-light)'
                    }}
                  >
                    Đầu tư
                  </td>
                )}
                <td style={{ fontWeight: 500, paddingLeft: '16px' }}>{al.Name}</td>
                <td style={{ textAlign: 'right' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                    {al.TargetPercentage.toFixed(4)}%
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                    {formatCurrency(al.CurrentAmount)}
                  </span>
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', color: al.reduction > 0 ? 'var(--warning)' : 'var(--text-muted)', fontWeight: 500 }}>
                  {formatCurrency(al.reduction)}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  {formatCurrency(al.actual)}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button 
                    className={`exclude-btn ${al.isExcluded ? 'excluded' : ''}`}
                    onClick={() => onToggleExclusion(al.Id)}
                    title={al.isExcluded ? 'Đã được loại trừ khỏi cắt giảm' : 'Bật khiên bảo vệ loại trừ khỏi cắt giảm'}
                  >
                    {al.isExcluded ? '🛡️ Khóa' : '🔓'}
                  </button>
                </td>
              </tr>
            ))}
            </>
            )}

            {/* Total Row */}
            <tr className="total-row">
              <td style={{ borderRight: '1px solid var(--border-light)' }}>Tổng dòng</td>
              <td style={{ paddingLeft: '16px' }}>Cân đối (Balanced)</td>
              <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', color: isPercentageBalanced ? 'var(--success)' : '#f59e0b' }}>
                {formatPercentage(totalAllocatedPercentage)}
              </td>
              <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)' }}>
                {formatCurrency(totalAllocatedCash)}
              </td>
              <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', color: 'var(--warning)' }}>
                {formatCurrency(totalReductionAmount)}
              </td>
              <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', color: 'var(--success)' }}>
                {formatCurrency(totalActualAmount)}
              </td>
              <td></td>
            </tr>

          </tbody>
        </table>
      </div>
    </div>
  );
}

// Money input component with real-time comma formatting and cursor position handling
function MoneyInput({ value, onChange, className = '', style, placeholder }: {
  value: number;
  onChange: (val: number) => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
}) {
  const [display, setDisplay] = useState<string>(() => formatInputNumber(value));
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFocused) {
      setDisplay(formatInputNumber(value));
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplay(raw);
    onChange(parseInputNumber(raw));
  };

  const handleFocus = () => {
    setIsFocused(true);
    setDisplay(value.toString());
  };

  const handleBlur = () => {
    setIsFocused(false);
    setDisplay(formatInputNumber(value));
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      className={className}
      style={style}
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
    />
  );
}
