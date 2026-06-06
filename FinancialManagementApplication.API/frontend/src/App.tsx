import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useToast } from "./components/ui/Toast";
import { 
  authService, 
  assetService, 
  portfolioService, 
  historyService,
  cashFlowService,
  goalService,
  debtService,
  checkConnection, 
  getLoggedUser
} from './services/api';
import { useLanguage } from './i18n';
import {
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Area, AreaChart
} from 'recharts';

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

const formatCurrency = (value: number) => {
  if (value == null || isNaN(value)) return '0';
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.abs(value));
  return `${value < 0 ? '-' : ''}${formatted}`;
};

const formatCompactValue = (v: number) => {
  if (v == null || isNaN(v)) return '0';
  if (v >= 1000000000) return `${(v / 1000000000).toFixed(1)}B`;
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
  return `${Math.round(v)}`;
};

// Format percentages cleanly
const formatPercentage = (value: number) => {
  if (isNaN(value) || !isFinite(value)) return '0.00%';
  return `${value.toFixed(4)}%`;
};

const formatDateTime = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const secs = String(d.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${secs}`;
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assets' | 'portfolio' | 'goals' | 'debts' | 'profile'>('dashboard');
  const [isDemo, setIsDemo] = useState<boolean>(true);
  const { t, locale, setLocale } = useLanguage();
  
  // App States
  const [assets, setAssets] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [allocationHistoryRecords, setAllocationHistoryRecords] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  
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
    data: { Id?: string; Name: string; InitialValue: number; CurrentValue: number; Type: string };
  }>({
    isOpen: false,
    mode: 'add',
    data: { Name: '', InitialValue: 0, CurrentValue: 0, Type: 'Saving' }
  });

  const [setupSuccessModal, setSetupSuccessModal] = useState<boolean>(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      
      const history = await historyService.getAssetHistory(user.id);
      setHistoryRecords(history);
      const allocHistory = await historyService.getAllocationHistoryByAccount(user.id);
      setAllocationHistoryRecords(allocHistory);
      const goalList = await goalService.getAll(user.id);
      setGoals(goalList);
      const debtList = await debtService.getAll(user.id);
      setDebts(debtList);
    } catch (err: any) {
      setError(err.message || t('Không thể tải dữ liệu.'));
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
    setDebts([]);
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
    if (!window.confirm(t('Bạn có chắc chắn muốn xóa tài sản này?'))) return;
    try {
      setError(null);
      await assetService.delete(id);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveAllAssets = async () => {
    try {
      setError(null);
      if (!user) return;
      await historyService.saveSnapshot(user.id);
      await loadData();
      addToast({ title: t('Đã lưu thông tin tài sản!'), variant: 'success' });
    } catch (err: any) {
      addToast({ title: t('Lỗi lưu tài sản'), description: err.message, variant: 'error' });
    }
  };

  const handleRestoreFromHistory = async (historyId: string) => {
    try {
      setError(null);
      if (!user) return;
      const ok = await historyService.restoreSnapshot(historyId);
      if (ok) {
        await loadData();
        addToast({ title: t('Đã khôi phục thông tin tài sản!'), variant: 'success' });
      } else {
        addToast({ title: t('Khôi phục thất bại'), variant: 'error' });
      }
    } catch (err: any) {
      addToast({ title: t('Lỗi khôi phục'), description: err.message, variant: 'error' });
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

  const handleApplyToAsset = async (allocation: any) => {
    if (!allocation.AssetId) return;
    const asset = assets.find(a => a.Id === allocation.AssetId);
    if (!asset) return;
    try {
      setError(null);
      await assetService.update(asset.Id, {
        Id: asset.Id,
        Name: asset.Name,
        InitialValue: asset.InitialValue + allocation.CurrentAmount,
        CurrentValue: asset.CurrentValue,
        Type: asset.Type
      });
      await loadData();
      addToast({ title: t('Đã cập nhật giá trị tài sản!'), variant: 'success' });
    } catch (err: any) {
      addToast({ title: t('Lỗi cập nhật tài sản'), description: err.message, variant: 'error' });
    }
  };

  const handleSaveAllocationSnapshot = async () => {
    try {
      setError(null);
      if (!user) return;
      await historyService.saveAllocationSetupSnapshot(user.id);
      await loadData();
      addToast({ title: t('Đã lưu lịch sử phân bổ!'), variant: 'success' });
    } catch (err: any) {
      addToast({ title: t('Lỗi lưu phân bổ'), description: err.message, variant: 'error' });
    }
  };

  const handleRestoreAllocationHistory = async (historyId: string) => {
    try {
      setError(null);
      if (!user) return;
      const ok = await historyService.restoreAllocationSnapshot(historyId);
      if (ok) {
        const { portfolio: freshPortfolio, allocations: freshAllocations } = await portfolioService.getDetails(user.id);
        setPortfolio(freshPortfolio);
        setAllocations(freshAllocations);
        const freshHistory = await historyService.getAllocationHistoryByAccount(user.id);
        setAllocationHistoryRecords(freshHistory);
        if (showSetup) {
          setSetupAmount(freshPortfolio?.Amount || 0);
          setSetupAllocations(freshAllocations.map(al => ({
            ...al,
            setupAmount: al.CurrentAmount
          })));
        }
        addToast({ title: t('Đã khôi phục phân bổ!'), variant: 'success' });
      } else {
        addToast({ title: t('Khôi phục thất bại'), variant: 'error' });
      }
    } catch (err: any) {
      addToast({ title: t('Lỗi khôi phục'), description: err.message, variant: 'error' });
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
      setError(t('Không thể thêm danh mục mới vì đã đạt hoặc vượt quá phân bổ gốc / 100%.'));
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
      setupAmount: 0,
      AssetId: null,
      AssetType: 'Expense'
    };
    setSetupAllocations([...setupAllocations, newAl]);
  };

  const handleSetupEditAllocation = (id: string, field: string, value: any) => {
    const updated = setupAllocations.map(al => {
      if (al.Id === id) {
        const updatedAl = { ...al, [field]: value };
        if (field === 'FinancialCategory') {
          updatedAl.AssetType = value;
        }
        return updatedAl;
      }
      return al;
    });
    setSetupAllocations(updated);
  };

  const handleSetupDeleteAllocation = (id: string) => {
    if (!window.confirm(t('Bạn có chắc chắn muốn xóa danh mục này?'))) return;
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
        setError(t('Vui lòng thêm ít nhất một danh mục.'));
        return;
      }
      if (setupAllocations.some(al => !al.Name.trim())) {
        setError(t('Vui lòng nhập tên cho tất cả danh mục.'));
        return;
      }
      const totalPct = setupAllocations.reduce((sum, al) => sum + al.TargetPercentage, 0);
      if (totalPct > 100) {
        setError(t('Tổng tỉ trọng vượt quá 100%. Vui lòng điều chỉnh lại.'));
        return;
      }

      let currentPortfolio = portfolio;
      if (!currentPortfolio) {
        currentPortfolio = await portfolioService.create(
          { Name: 'Kế Hoạch Phân Bổ Tổng Thể', Amount: setupAmount },
          user.id
        );
        setPortfolio(currentPortfolio);
      }

      await portfolioService.updateAmount(currentPortfolio.Id, setupAmount, 'Kế Hoạch Phân Bổ Tổng Thể', user.id);

      const savedAllocs = setupAllocations.map(al => ({
        Id: al.Id,
        PortfolioId: currentPortfolio.Id,
        FinancialCategory: al.FinancialCategory,
        Name: al.Name,
        CurrentAmount: al.CurrentAmount,
        TargetPercentage: al.TargetPercentage,
        AssetId: al.AssetId || null,
        AssetType: al.AssetType || al.FinancialCategory || 'Saving'
      }));

      await portfolioService.saveAllocations(savedAllocs);

      const removedIds = allocations
        .filter(al => !savedAllocs.some(sa => sa.Id === al.Id))
        .map(al => al.Id);
      for (const id of removedIds) {
        await portfolioService.deleteAllocation(id);
      }

      setAllocations(savedAllocs);
      setPortfolio((prev: any) => prev ? { ...prev, Amount: setupAmount } : prev);
      await historyService.saveAllocationSetupSnapshot(user.id);
      await loadData();
      setSetupSuccessModal(true);
    } catch (err: any) {
      setError(err.message || t('Lỗi khi lưu thiết lập.'));
    }
  };

  // Dynamic values calculated from allocations
  const calculateAllocationsData = () => {
    const nonExcludedPct = allocations
      .filter(al => !exclusions.includes(al.Id))
      .reduce((sum, al) => sum + al.TargetPercentage, 0);

    return allocations.map(al => {
      const currentAmount = income > 0 ? income * (al.TargetPercentage / 100) : al.CurrentAmount;
      const isExcluded = exclusions.includes(al.Id);
      const reduction = (!isExcluded && nonExcludedPct > 0)
        ? targetReduction * (al.TargetPercentage / nonExcludedPct)
        : 0;
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
  const totalSavingAssets = assets.filter(a => a.Type === 'Saving').reduce((sum, a) => sum + a.CurrentValue, 0);
  const totalInvestmentAssets = assets.filter(a => a.Type === 'Investment').reduce((sum, a) => sum + a.CurrentValue, 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0b10' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ border: '3px solid rgba(99,102,241,0.1)', borderTop: '3px solid #6366f1', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }} />
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{t('Đang khởi tạo hệ thống quản lý tài chính...')}</p>
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
              {t('Tổng quan')}
            </button>
            <button 
              className={`nav-link ${activeTab === 'assets' ? 'active' : ''}`}
              onClick={() => setActiveTab('assets')}
            >
              {t('Quản lý Tài sản')}
            </button>
            <button 
              className={`nav-link ${activeTab === 'portfolio' ? 'active' : ''}`}
              onClick={() => setActiveTab('portfolio')}
            >
              {t('Phân bổ Danh mục')}
            </button>
            <button 
              className={`nav-link ${activeTab === 'goals' ? 'active' : ''}`}
              onClick={() => setActiveTab('goals')}
            >
              {t('Mục tiêu')}
            </button>
            <button 
              className={`nav-link ${activeTab === 'debts' ? 'active' : ''}`}
              onClick={() => setActiveTab('debts')}
            >
              {t('Quản lý nợ')}
            </button>

          </div>

          <div className="nav-right">
            <button className="lang-toggle" onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')} title={locale === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}>
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
            
            <div className="user-profile" ref={profileDropdownRef} style={{ position: 'relative', cursor: 'pointer' }}>
              <div onClick={() => setProfileDropdownOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="user-avatar">
                  {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
                </div>
                <span style={{ fontWeight: 600 }}>{user.displayName}</span>
                <svg className={`profile-dropdown-arrow ${profileDropdownOpen ? 'open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              {profileDropdownOpen && (
                <div className="profile-dropdown-menu">
                  <div className="profile-dropdown-header">
                    <div className="profile-dropdown-name">{user.displayName}</div>
                    <div className="profile-dropdown-email">{user.email}</div>
                  </div>
                  <button className="profile-dropdown-item" onClick={() => { setProfileDropdownOpen(false); setActiveTab('profile'); }}>
                    <svg className="profile-dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    {t('Thông tin cá nhân')}
                  </button>
                  <button className="profile-dropdown-item danger" onClick={handleLogout}>
                    <svg className="profile-dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {t('Đăng xuất')}
                  </button>
                </div>
              )}
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

        {activeTab === 'dashboard' && (
          <DashboardPage 
            totalCurrent={totalCurrent}
            totalInitial={totalInitial}
            totalInterest={totalInterest}
            totalInterestRatio={totalInterestRatio}
            totalSavingAssets={totalSavingAssets}
            assets={assets}
            totalInvestmentAssets={totalInvestmentAssets}
            goals={goals}
          />
        )}

        {activeTab === 'assets' && (
          <AssetsPage 
            assets={assets}
            historyRecords={historyRecords}
            totalInitial={totalInitial}
            totalCurrent={totalCurrent}
            totalInterest={totalInterest}
            totalInterestRatio={totalInterestRatio}
            onAdd={() => setAssetModal({ isOpen: true, mode: 'add', data: { Name: '', InitialValue: 0, CurrentValue: 0, Type: 'Saving' } })}
            onEdit={(a: any) => setAssetModal({ isOpen: true, mode: 'edit', data: { Id: a.Id, Name: a.Name, InitialValue: a.InitialValue, CurrentValue: a.CurrentValue, Type: a.Type } })}
            onDelete={handleDeleteAsset}
            onSave={handleSaveAllAssets}
            onRestore={handleRestoreFromHistory}
          />
        )}

        {activeTab === 'portfolio' && (
          <PortfolioPage 
            assets={assets}
            income={income}
            onAllocateActual={handleSaveAllocationSnapshot}
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
            onApplyToAsset={handleApplyToAsset}
            allocationHistoryRecords={allocationHistoryRecords}
            onRestoreAllocationHistory={handleRestoreAllocationHistory}
          />
        )}

        {activeTab === 'goals' && (
          <GoalsPage
            goals={goals}
            userId={user?.id}
            totalCurrent={totalCurrent}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'debts' && (
          <DebtPage
            debts={debts}
            userId={user?.id}
            onRefresh={() => { loadData(); }}
          />
        )}

        {activeTab === 'profile' && (
          <ProfilePage user={user} onUserUpdate={(u) => setUser({ ...user, ...u })} />
        )}
      </main>

      {/* Asset Modal */}
      {assetModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{assetModal.mode === 'add' ? t('Thêm Tài Sản Mới') : t('Cập Nhật Tài Sản')}</h3>
              <button className="modal-close" onClick={() => setAssetModal({ ...assetModal, isOpen: false })}>✕</button>
            </div>
            <form onSubmit={handleSaveAsset}>
              <div className="form-group">
                <label className="form-label">{t('Tên tài sản')}</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  value={assetModal.data.Name}
                  onChange={(e) => setAssetModal({ ...assetModal, data: { ...assetModal.data, Name: e.target.value } })}
                  placeholder={t('Ví dụ: Saving, Emergency, ETF...')}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('Vốn ban đầu (Funds)')}</label>
                <MoneyInput 
                  className="form-control" 
                  value={assetModal.data.InitialValue}
                  onChange={(val) => setAssetModal({ ...assetModal, data: { ...assetModal.data, InitialValue: val } })}
                  placeholder={t('Nhập số tiền vốn ban đầu')}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('Giá trị hiện tại (Current)')}</label>
                <MoneyInput 
                  className="form-control" 
                  value={assetModal.data.CurrentValue}
                  onChange={(val) => setAssetModal({ ...assetModal, data: { ...assetModal.data, CurrentValue: val } })}
                  placeholder={t('Nhập giá trị tài sản hiện tại')}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('Phân loại')}</label>
                <select
                  className="form-control"
                  value={assetModal.data.Type}
                  onChange={(e) => setAssetModal({ ...assetModal, data: { ...assetModal.data, Type: e.target.value } })}
                  style={{ padding: '8px 12px', height: '40px' }}
                >
                  <option value="Saving">{t('Tiết kiệm')}</option>
                  <option value="Investment">{t('Đầu tư')}</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setAssetModal({ ...assetModal, isOpen: false })}>{t('Hủy')}</button>
                <button type="submit" className="btn btn-primary">{t('Lưu lại')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Setup Success Modal */}
      {setupSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{t('Thiết lập danh mục thành công!')}</h3>
            </div>
            <div style={{ padding: '20px 24px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                {t('Dữ liệu phân bổ danh mục đã được lưu vào hệ thống và sao lưu vào lịch sử thành công.')}
              </p>
            </div>
            <div className="modal-actions" style={{ justifyContent: 'center', gap: '12px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setSetupSuccessModal(false)}
              >
                OK
              </button>
              <button
                className="btn btn-primary"
                onClick={() => { setSetupSuccessModal(false); setShowSetup(false); }}
              >
                {t('Quay lại')}
              </button>
            </div>
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
  const { t } = useLanguage();

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
          <h2 className="auth-title">{isLogin ? t('Đăng Nhập Hệ Thống') : t('Đăng Ký Tài Khoản')}</h2>
          <p className="auth-subtitle">{t('Quản lý dòng tiền và tài sản cá nhân cao cấp')}</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#f43f5e', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.85rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">{t('Tên hiển thị')}</label>
              <input 
                type="text" 
                className="form-control" 
                required 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('Nhập tên hiển thị của bạn')} 
            />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">{t('Địa chỉ Email')}</label>
            <input 
              type="email" 
              className="form-control" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('nhập.email@của.ban')} 
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('Mật khẩu')}</label>
            <input 
              type="password" 
              className="form-control" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('Nhập mật khẩu')} 
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
            {isLogin ? t('Đăng Nhập') : t('Tạo Tài Khoản')}
          </button>
        </form>

        {isLogin && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-light)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>{t('Trải nghiệm ứng dụng không cần tài khoản:')}</p>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ width: '100%', fontSize: '0.85rem', padding: '10px 12px', background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)', marginBottom: '12px' }}
              onClick={onDemo}
            >
              {t('Trải nghiệm Chế độ Demo (Offline)')}
            </button>

            {isDemo && (
              <>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>{t('Tài khoản Demo có sẵn (Mock Offline):')}</p>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ width: '100%', fontSize: '0.8rem', padding: '6px 12px' }}
                  onClick={handleUseDemoAccount}
                >
                  {t('Sử dụng tài khoản Demo nhanh')}
                </button>
              </>
            )}
          </div>
        )}

        <div className="auth-switch">
          {isLogin ? t('Chưa có tài khoản?') : t('Đã có tài khoản?')}
          <button className="auth-switch-btn" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? t('Đăng ký ngay') : t('Đăng nhập')}
          </button>
        </div>
      </div>
    </div>
  );
}

// 2. DASHBOARD COMPONENT
function DashboardPage({ 
  totalCurrent, 
  totalInitial, 
  totalInterest, 
  totalInterestRatio,
  totalSavingAssets,
  totalInvestmentAssets,
  assets,
  goals,
}: { 
  totalCurrent: number; 
  totalInitial: number; 
  totalInterest: number; 
  totalInterestRatio: number;
  totalSavingAssets: number;
  totalInvestmentAssets: number;
  assets: any[];
  goals: any[];
}) {
  const { t } = useLanguage();
  const [chartMode, setChartMode] = useState<'overview' | 'detail'>('overview');
  const [showAmounts, setShowAmounts] = useState(true);

  // Dynamic values for Donut Allocation Chart
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#d946ef', '#64748b'];

  const donutData = chartMode === 'overview'
    ? [
        { name: 'Tiết kiệm', value: totalSavingAssets },
        { name: 'Đầu tư', value: totalInvestmentAssets }
      ]
    : (() => {
        const sortedAssets = [...assets].sort((a,b) => b.CurrentValue - a.CurrentValue);
        const topAssets = sortedAssets.slice(0, 4);
        const otherSum = sortedAssets.slice(4).reduce((sum, a) => sum + a.CurrentValue, 0);
        const data = topAssets.map(a => ({ name: a.Name, value: a.CurrentValue }));
        if (otherSum > 0) data.push({ name: 'Khác', value: otherSum });
        return data;
      })();

  const totalDonutValue = donutData.reduce((sum, d) => sum + d.value, 0) || 1;

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
        <h2 className="section-title">{t('Bảng Tổng Quan Tài Chính')}</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('Cập nhật lần cuối: 26/05/2026')}</span>
      </div>

      {/* Metrics Row */}
      <div className="grid-3">
        <div className="card">
          <div className="metric-header">
            <span className="metric-title">{t('Tổng Giá Trị Tài Sản Gốc (Original Value)')}</span>
            <button onClick={(e) => { e.stopPropagation(); setShowAmounts(!showAmounts); }}
              title={showAmounts ? t('Ẩn số tiền') : t('Hiện số tiền')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', display: 'inline-flex', borderRadius: '4px', transition: 'all 0.2s', verticalAlign: 'middle', marginTop: '-2px', marginLeft: '10px', marginRight: '8px' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}>
              {showAmounts ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <span className="metric-icon" style={{ color: 'var(--primary)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
            </span>
          </div>
          <div className="metric-value">
            {showAmounts ? formatCurrency(totalInitial) : '**********'}
          </div>
          <div className="metric-change" style={{ color: 'var(--text-secondary)' }}>
            {t('Tổng vốn gốc đã đầu tư')}
          </div>
        </div>

        <div className="card">
          <div className="metric-header">
            <span className="metric-title">{t('Tổng Giá Trị Tài Sản (Net Worth)')}</span>
            <span className="metric-icon" style={{ color: 'var(--success)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M23 6l-9.5 9.5-5-5L1 18M17 6h6v6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </div>
          {showAmounts ? (
            <>
              <div className="metric-value">{formatCurrency(totalCurrent)}</div>
              <div className={`metric-change ${totalInterest >= 0 ? 'positive' : 'negative'}`}>
                <span>{totalInterest >= 0 ? '▲' : '▼'}</span>
                <span>{formatCurrency(totalInterest)} ({totalInterestRatio.toFixed(2)}%)</span>
              </div>
            </>
          ) : (
            <div className="metric-value">**********</div>
          )}
        </div>

        <div className="card">
          <div className="metric-header">
            <span className="metric-title">{t('Tiến độ mục tiêu')}</span>
            <span className="metric-icon" style={{ color: 'var(--warning)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </span>
          </div>
          {(() => {
            const active = goals.find(g => g.Status === 'Processing');
            const upcoming = goals.find(g => g.Status === 'NotStarted');
            const goal = active || upcoming;
            if (!goal) {
              return (
                <>
                  <div className="metric-value" style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>{t('Chưa có mục tiêu')}</div>
                  <div className="metric-change" style={{ color: 'var(--text-secondary)' }}>{t('Thêm mục tiêu để bắt đầu')}</div>
                </>
              );
            }
            const pct = goal.TargetAmount > 0 ? Math.min(100, Math.round((totalCurrent / goal.TargetAmount) * 100)) : 0;
            const due = new Date(goal.DueDate);
            const now = new Date();
            const diff = due.getTime() - now.getTime();
            const daysLeft = diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
            return (
              <>
                <div className="metric-value" style={{ fontSize: '1.5rem' }}>{goal.Name}</div>
                <div style={{ margin: '8px 0', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%', borderRadius: '4px', transition: 'width 0.5s ease',
                    background: pct >= 100 ? '#10b981' : pct >= 50 ? '#6366f1' : '#f59e0b'
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--success)', fontWeight: 600 }}>{formatCurrency(totalCurrent)} / {formatCurrency(goal.TargetAmount)}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{pct}%</span>
                </div>
                <div className="metric-change" style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {daysLeft > 0 ? `${daysLeft} ${t('ngày còn lại')}` : t('Đã hết hạn')}
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid-2-1">
        {/* Cash Flow Growth Chart */}
        <CashFlowGrowthChart userId={getLoggedUser()?.id || 'u1'} />

        {/* SVG Donut Allocation Chart */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{t('Phân Bổ Tài Sản')}</h3>
              <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '2px' }}>
                <button
                  onClick={() => setChartMode('overview')}
                  style={{
                    padding: '4px 12px', fontSize: '0.75rem', borderRadius: '4px', border: 'none', cursor: 'pointer',
                    background: chartMode === 'overview' ? '#6366f1' : 'transparent',
                    color: chartMode === 'overview' ? '#fff' : 'var(--text-secondary)',
                    fontWeight: chartMode === 'overview' ? 600 : 400
                  }}
                >{t('Tổng quan')}</button>
                <button
                  onClick={() => setChartMode('detail')}
                  style={{
                    padding: '4px 12px', fontSize: '0.75rem', borderRadius: '4px', border: 'none', cursor: 'pointer',
                    background: chartMode === 'detail' ? '#6366f1' : 'transparent',
                    color: chartMode === 'detail' ? '#fff' : 'var(--text-secondary)',
                    fontWeight: chartMode === 'detail' ? 600 : 400
                  }}
                >{t('Chi tiết')}</button>
              </div>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              {chartMode === 'overview' ? t('Tổng giá trị Tiết kiệm và Đầu tư') : t('Chi tiết từng tài sản trong danh mục')}
            </p>
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
                {showAmounts ? formatCompactValue(totalCurrent) : '********'}
              </text>
              <text x="60" y="74" className="donut-label">
                {t('Tài sản ròng')}
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


    </div>
  );
}

// ======================== CASH FLOW GROWTH CHART COMPONENT ========================
function CashFlowGrowthChart({ userId }: { userId: string }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'yearly' | 'monthly' | 'last12months'>('yearly');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [chartData, setChartData] = useState<any[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await cashFlowService.getGrowthData(userId, mode, mode === 'monthly' ? selectedYear : undefined);
      setChartData((result.data || []).map((d: any) => ({ ...d, initialValue: d.initialValue ?? 0 })));

      if (mode === 'yearly') {
        const years = (result.data || []).map((d: any) => parseInt(d.period));
        setAvailableYears(years);
      }
    } catch (e) {
      console.error('Error loading cash flow growth:', e);
    } finally {
      setLoading(false);
    }
  }, [userId, mode, selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleModeChange = (newMode: 'yearly' | 'monthly' | 'last12months') => {
    setMode(newMode);
    if (newMode === 'monthly' && availableYears.length > 0) {
      const currentYear = new Date().getFullYear();
      if (availableYears.includes(currentYear)) {
        setSelectedYear(currentYear);
      } else {
        setSelectedYear(availableYears[availableYears.length - 1]);
      }
    }
  };

  const formatValue = (v: number) => {
    if (v == null || isNaN(v)) return '0';
    if (v >= 1000000000) return `${(v / 1000000000).toFixed(1)}B`;
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
    return `${Math.round(v)}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const changeStr = data.changeFromPrevious !== undefined && data.changeFromPrevious !== null
        ? `${data.changeFromPrevious >= 0 ? '+' : ''}${formatCurrency(data.changeFromPrevious)}`
        : '--';
      const changePctStr = data.changePercentage !== undefined && data.changePercentage !== null
        ? `${data.changePercentage >= 0 ? '+' : ''}${data.changePercentage.toFixed(2)}%`
        : '--';
      return (
        <div className="chart-tooltip">
          <div className="chart-tooltip-header">{data.period}</div>
          <div className="chart-tooltip-row">
            <span>{t('Giá trị:')}</span>
            <span className="chart-tooltip-value">{formatCurrency(data.value)}</span>
          </div>
          <div className="chart-tooltip-row">
            <span>{t('Giá trị gốc:')}</span>
            <span className="chart-tooltip-value" style={{ color: 'var(--warning)' }}>{data.initialValue != null ? formatCurrency(data.initialValue) : '--'}</span>
          </div>
          <div className="chart-tooltip-row">
            <span>{t('Thay đổi:')}</span>
            <span className="chart-tooltip-value" style={{ color: data.changeFromPrevious >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {changeStr} ({changePctStr})
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const gradientId = 'cashFlowGradient';

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Cash Flow Growth</h3>
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '2px', alignItems: 'center', flexWrap: 'wrap' }}>
          {([['yearly', t('Theo năm')], ['monthly', t('Theo tháng')], ['last12months', t('12 tháng')]] as const).map(([key, label]) => (
            <button key={key} onClick={() => handleModeChange(key)}
              style={{
                padding: '3px 10px', fontSize: '0.7rem', borderRadius: '4px', border: 'none', cursor: 'pointer',
                background: mode === key ? '#6366f1' : 'transparent',
                color: mode === key ? '#fff' : 'var(--text-secondary)',
                fontWeight: mode === key ? 600 : 400
              }}
            >{label}</button>
          ))}
          {mode === 'monthly' && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              style={{
                marginLeft: '4px', padding: '2px 6px', fontSize: '0.7rem', borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-primary)', cursor: 'pointer'
              }}
            >
              {availableYears.length > 0 ? availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              )) : (
                <option value={selectedYear}>{selectedYear}</option>
              )}
            </select>
          )}
        </div>
      </div>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
        {mode === 'yearly' ? t('Tổng giá trị tài sản qua các năm') : 
         mode === 'monthly' ? `${t('Tổng giá trị tài sản từng tháng năm')} ${selectedYear}` : 
         t('Tổng giá trị tài sản 12 tháng gần nhất')}
      </p>
      {loading ? (
        <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ border: '3px solid rgba(99,102,241,0.1)', borderTop: '3px solid #6366f1', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : chartData.length === 0 ? (
        <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {t('Chưa có dữ liệu lịch sử. Hãy lưu snapshot tài sản để bắt đầu theo dõi.')}
        </div>
      ) : (
        <div className="chart-container">
          <svg style={{ position: 'absolute', width: 0, height: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
          </svg>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis 
                dataKey="period" 
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                tickLine={false}
              />
              <YAxis 
                tickFormatter={formatValue}
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(99,102,241,0.3)', strokeDasharray: '3 3' }} />
              <Area 
                type="monotone" 
                dataKey="initialValue" 
                stroke="#f59e0b" 
                strokeWidth={1.5}
                strokeDasharray="4 3"
                fill="none"
                dot={false}
                activeDot={{ r: 4, fill: '#f59e0b', stroke: '#11131c', strokeWidth: 2 }}
                animationDuration={800}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#6366f1" 
                strokeWidth={2.5}
                fill={`url(#${gradientId})`}
                dot={{ r: 4, fill: '#6366f1', stroke: '#11131c', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                animationDuration={800}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '16px', height: '3px', borderRadius: '2px', background: '#6366f1', display: 'inline-block' }} />
              {t('Giá trị hiện tại')}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '16px', height: '0', borderTop: '2px dashed #f59e0b', display: 'inline-block' }} />
              {t('Giá trị gốc')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// 3. ASSETS LIST COMPONENT
function AssetsPage({ 
  assets, 
  historyRecords,
  totalInitial, 
  totalCurrent, 
  totalInterest, 
  totalInterestRatio, 
  onAdd, 
  onEdit, 
  onDelete,
  onSave,
  onRestore
}: { 
  assets: any[]; 
  historyRecords: any[];
  totalInitial: number; 
  totalCurrent: number; 
  totalInterest: number; 
  totalInterestRatio: number; 
  onAdd: any; 
  onEdit: any; 
  onDelete: any;
  onSave: any;
  onRestore: any
}) {
  const { t } = useLanguage();
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const expenseAssets = assets.filter(a => a.Type === 'Expense');
  const savingAssets = assets.filter(a => a.Type === 'Saving');
  const investmentAssets = assets.filter(a => a.Type === 'Investment');

  const renderAssetRows = (list: any[], startIdx: number) =>
    list.map((asset, idx) => {
      const interest = asset.CurrentValue - asset.InitialValue;
      const ratio = asset.InitialValue > 0 ? (interest / asset.InitialValue) * 100 : 0;
      return (
        <tr key={asset.Id}>
          <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{startIdx + idx + 1}</td>
          <td style={{ fontWeight: 600 }}>{asset.Name}</td>
          <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 500 }}>
            {formatCurrency(asset.InitialValue)}
          </td>
          <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 500 }}>
            {formatCurrency(asset.CurrentValue)}
          </td>
          <td style={{ 
            textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 600,
            color: interest > 0 ? 'var(--success)' : interest < 0 ? 'var(--danger)' : 'var(--text-muted)'
          }}>
            {interest > 0 ? '+' : ''}{formatCurrency(interest)}
          </td>
          <td style={{ 
            textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 600,
            color: interest > 0 ? 'var(--success)' : interest < 0 ? 'var(--danger)' : 'var(--text-muted)'
          }}>
            {asset.InitialValue > 0 ? (
              <>{interest > 0 ? '+' : ''}{ratio.toFixed(2)}%</>
            ) : (
              '#DIV/0!'
            )}
          </td>
          <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            26/05/2026
          </td>
          <td style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button className="btn-icon edit" onClick={() => onEdit(asset)} title={t('Sửa tài sản')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </button>
              <button className="btn-icon delete" onClick={() => onDelete(asset.Id)} title={t('Xóa tài sản')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      );
    });

  return (
    <div>
      <div className="tab-header">
        <div>
          <h2 className="section-title">{t('Bảng Quản Lý Tài Sản Chi Tiết')}</h2>
          <p className="section-desc">{t('Theo dõi giá trị ban đầu, giá trị thực tế hiện tại và mức độ sinh trưởng của từng tài sản')}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" onClick={onAdd}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {t('Thêm Tài Sản')}
          </button>
          <button className="btn" onClick={onSave} style={{
            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
            color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
            </svg>
            {t('Lưu thông tin')}
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>{t('STT')}</th>
              <th>{t('Tên tài sản (Assets Name)')}</th>
              <th style={{ textAlign: 'right' }}>{t('Vốn ban đầu (Funds)')}</th>
              <th style={{ textAlign: 'right' }}>{t('Giá trị hiện tại (Current)')}</th>
              <th style={{ textAlign: 'right' }}>{t('Lợi nhuận (Interest)')}</th>
              <th style={{ textAlign: 'right' }}>{t('Tỷ suất (Interest ratio)')}</th>
              <th style={{ textAlign: 'center' }}>{t('Ngày cập nhật')}</th>
              <th style={{ textAlign: 'center', width: '100px' }}>{t('Hành động')}</th>
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                  {t('Chưa có dữ liệu tài sản. Bấm nút "Thêm Tài Sản" để khởi tạo.')}
                </td>
              </tr>
            ) : (
              <>
                {/* SINH HOẠT SECTION */}
                {expenseAssets.length > 0 && (
                  <>
                    <tr className="table-section-divider">
                      <td colSpan={8} style={{ fontWeight: 700, padding: '10px 16px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#f59e0b' }}>
                        {t('💳 Sinh hoạt')}
                      </td>
                    </tr>
                    {renderAssetRows(expenseAssets, 0)}
                  </>
                )}

                {/* TIẾT KIỆM SECTION */}
                {savingAssets.length > 0 && (
                  <>
                    <tr className="table-section-divider">
                      <td colSpan={8} style={{ fontWeight: 700, padding: '10px 16px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--primary)' }}>
                        {t('🏦 Tiết kiệm')}
                      </td>
                    </tr>
                    {renderAssetRows(savingAssets, expenseAssets.length)}
                  </>
                )}

                {/* ĐẦU TƯ SECTION */}
                {investmentAssets.length > 0 && (
                  <>
                    <tr className="table-section-divider">
                      <td colSpan={8} style={{ fontWeight: 700, padding: '10px 16px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#10b981' }}>
                        {t('📈 Đầu tư')}
                      </td>
                    </tr>
                    {renderAssetRows(investmentAssets, expenseAssets.length + savingAssets.length)}
                  </>
                )}

                {/* GRAND TOTAL */}
                {assets.length > 0 && (
                  <tr className="total-row" style={{ borderTop: '2px solid var(--border-light)' }}>
                    <td colSpan={2} style={{ paddingLeft: '16px', fontWeight: 800 }}>{t('Tổng tài sản')}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{formatCurrency(totalInitial)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{formatCurrency(totalCurrent)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 700, color: totalInterest > 0 ? 'var(--success)' : totalInterest < 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {totalInterest > 0 ? '+' : ''}{formatCurrency(totalInterest)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 700, color: totalInterest > 0 ? 'var(--success)' : totalInterest < 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {totalInterestRatio.toFixed(2)}%
                    </td>
                    <td></td>
                    <td></td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Lịch sử tài sản */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{t('Lịch sử lưu thông tin')}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('Chọn một bản ghi để xem chi tiết danh mục tài sản tại thời điểm đó')}</p>
          </div>
        </div>

        {historyRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {t('Chưa có dữ liệu lịch sử. Nhấn "Lưu thông tin" để tạo bản ghi.')}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: '0 0 280px', maxHeight: '360px', overflowY: 'auto' }}>
              {historyRecords.map((r: any) => (
                <div key={r.Id} onClick={() => setSelectedHistoryId(selectedHistoryId === r.Id ? null : r.Id)}
                  style={{
                    padding: '10px 14px', borderRadius: '6px', cursor: 'pointer', marginBottom: '4px',
                    background: selectedHistoryId === r.Id ? 'rgba(99,102,241,0.1)' : 'transparent',
                    border: selectedHistoryId === r.Id ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                    {formatDateTime(r.RecordedAt)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {r.Details?.length || 0} {t('tài sản · tổng')} {formatCurrency((r.Details || []).reduce((s: number, d: any) => s + d.CurrentValue, 0))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ flex: 1 }}>
              {selectedHistoryId ? (
                (() => {
                  const record = historyRecords.find((r: any) => r.Id === selectedHistoryId);
                  if (!record) return null;
                  return (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="custom-table" style={{ minWidth: '450px' }}>
                        <thead>
                          <tr>
                            <th>{t('Tên tài sản')}</th>
                            <th style={{ textAlign: 'right' }}>{t('Vốn ban đầu')}</th>
                            <th style={{ textAlign: 'right' }}>{t('Giá trị hiện tại')}</th>
                            <th style={{ textAlign: 'center' }}>{t('Loại')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(record.Details || []).map((d: any) => (
                            <tr key={d.Id}>
                              <td style={{ fontWeight: 600 }}>{d.Name}</td>
                              <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)' }}>{formatCurrency(d.InitialValue)}</td>
                              <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', color: d.CurrentValue >= d.InitialValue ? 'var(--success)' : 'var(--danger)' }}>
                                {formatCurrency(d.CurrentValue)}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{
                                  fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 600,
                                  background: d.Type === 'Saving' ? 'rgba(99,102,241,0.15)' : 'rgba(16,185,129,0.15)',
                                  color: d.Type === 'Saving' ? 'var(--primary)' : '#10b981'
                                }}>
                                  {d.Type === 'Saving' ? t('Tiết kiệm') : d.Type === 'Investment' ? t('Đầu tư') : d.Type}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{ marginTop: '12px', textAlign: 'right' }}>
                        <button onClick={() => onRestore(record.Id)} style={{
                          background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
                          color: 'var(--primary)', borderRadius: '6px', padding: '8px 20px', cursor: 'pointer',
                          fontSize: '0.85rem', fontWeight: 600
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                          </svg>
                          {t('Khôi phục')}
                        </button>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {t('Chọn một bản ghi từ danh sách bên trái để xem chi tiết')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 4. PORTFOLIO & BUDGET CUT PLANNING COMPONENT
function PortfolioPage({
  assets,
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
  onSetupAllocationAmountChange,
  onApplyToAsset,
  allocationHistoryRecords,
  onRestoreAllocationHistory
}: {
  assets: any[];
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
  onApplyToAsset: (allocation: any) => void;
  allocationHistoryRecords: any[];
  onRestoreAllocationHistory: (historyId: string) => void;
}) {
  const { t } = useLanguage();

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
            <h2 className="section-title">{t('Thiết Lập Danh Mục')}</h2>
            <p className="section-desc">{t('Thêm, sửa, xóa danh mục và nhập số tiền phân bổ. Tỉ lệ phần trăm sẽ tự động tính toán.')}</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={onCancelSetup}>
              {t('Hủy')}
            </button>
            <button className="btn btn-primary" onClick={onSaveSetup} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              {t('Lưu Thiết Lập')}
            </button>
          </div>
        </div>

        {/* Base Amount Input */}
        <div className="budget-cut-header">
          <div className="budget-input-item">
            <label>{t('Phân bổ gốc (Base Amount)')}</label>
            <MoneyInput 
              value={setupAmount} 
              onChange={(val) => onSetupAmountChange(val)} 
            />
          </div>
          <div className="budget-input-item">
            <label>{t('Tổng đã phân bổ')}</label>
            <div style={{ padding: '8px 12px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '6px', fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: '1rem', color: Math.abs(setupTotalPercent - 100) < 0.01 ? 'var(--success)' : 'var(--warning)' }}>
              {setupTotalPercent.toFixed(4)}%
            </div>
          </div>
          <div style={{ flex: 1, minWidth: '220px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <div>{t('• Nhập số tiền cho từng danh mục, hệ thống tự động tính tỉ lệ phần trăm.')}</div>
            <div>{t('• Tổng tỉ trọng nên đạt 100% để cân bằng.')}</div>
          </div>
        </div>

        {/* Setup Table */}
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '160px' }}>{t('Phân loại')}</th>
                <th>{t('Tên danh mục')}</th>
                <th style={{ textAlign: 'right', width: '160px' }}>{t('Số tiền (Cash)')}</th>
                <th style={{ textAlign: 'right', width: '140px' }}>{t('Tỉ trọng (%)')}</th>
              <th style={{ textAlign: 'center', width: '100px' }}>{t('Hành động')}</th>
              </tr>
            </thead>
            <tbody>
              {setupAllocations.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                    {t('Chưa có danh mục nào. Bấm "Thêm danh mục" để bắt đầu.')}
                  </td>
                </tr>
              ) : (
                setupAllocations.map((al) => (
                  <tr key={al.Id}>
                    <td>
                      <select
                        className="form-control"
                        style={{ padding: '4px 8px', height: '32px', fontSize: '0.85rem', width: '100%' }}
                        value={al.FinancialCategory}
                        onChange={(e) => onSetupEditAllocation(al.Id, 'FinancialCategory', e.target.value)}
                      >
                        <option value="Expense">{t('Sinh hoạt')}</option>
                        <option value="Saving">{t('Tiết kiệm')}</option>
                        <option value="Investment">{t('Đầu tư')}</option>
                      </select>
                    </td>
                    <td>
                      <input 
                        type="text" 
                        className="form-control"
                        style={{ padding: '4px 8px', height: '32px', fontSize: '0.85rem', width: '100%' }}
                        value={al.Name}
                        onChange={(e) => onSetupEditAllocation(al.Id, 'Name', e.target.value)}
                        placeholder={t('Tên danh mục...')}
                      />
                      <div style={{ marginTop: '4px' }}>
                        <select
                          style={{ fontSize: '0.75rem', padding: '2px 4px', height: '26px', width: '100%', background: '#1a1b26', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '4px', color: '#e2e8f0' }}
                          value={al.AssetId || ''}
                          onChange={(e) => onSetupEditAllocation(al.Id, 'AssetId', e.target.value || null)}
                        >
                          <option value="">{t('-- Liên kết tài sản --')}</option>
                          {assets.map(a => (
                            <option key={a.Id} value={a.Id} style={{ background: '#1a1b26', color: '#e2e8f0' }}>{a.Name}</option>
                          ))}
                        </select>
                      </div>
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
                        title={t('Xóa danh mục')}
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
                  <td style={{ paddingLeft: '16px' }}>{t('Tổng cộng')}</td>
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
            {t('Thêm danh mục')}
          </button>
        </div>

        {/* Lịch sử phân bổ */}
        <div className="card" style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{t('Lịch sử phân bổ')}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('Chọn một bản ghi để xem chi tiết và khôi phục')}</p>
            </div>
          </div>

          {allocationHistoryRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {t('Chưa có dữ liệu lịch sử. Lưu thiết lập để tạo bản ghi.')}
            </div>
          ) : (
            <AllocationHistorySection 
              records={allocationHistoryRecords}
              onRestore={onRestoreAllocationHistory}
              formatDateTime={formatDateTime}
              formatCurrency={formatCurrency}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="tab-header">
        <div>
          <h2 className="section-title">{t('Phân Bổ Tài Sản & Cắt Giảm Ngân Sách')}</h2>
          <p className="section-desc">{t('Phân bố thu nhập thành ba khối Sinh hoạt, Tiết kiệm & Đầu tư, tích hợp bộ lập kế hoạch cắt giảm tự động')}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={onStartSetup} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            {t('Thiết lập mới')}
          </button>
          <button className="btn btn-primary" onClick={onAllocateActual} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            {t('Lưu Phân Bổ Thực Tế')}
          </button>
        </div>
      </div>

      {/* Top Config Inputs Banner */}
      <div className="budget-cut-header">
        <div className="budget-input-item">
          <label>{t('Thu nhập (Income)')}</label>
          <MoneyInput 
            value={income} 
            onChange={(val) => onUpdateIncome(val)} 
          />
        </div>
        <div className="budget-input-item">
          <label>{t('Số tiền cần giảm (Target)')}</label>
          <MoneyInput 
            value={targetReduction} 
            onChange={(val) => onUpdateTargetReduction(val)} 
          />
        </div>
        <div style={{ flex: 1, minWidth: '220px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <div style={{ marginBottom: '4px' }}>{t('• Công thức giảm mỗi dòng: ')}<code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: '3px' }}>Target * {t('Tỉ trọng (%)')}</code></div>
          <div>{t('• Bấm nút hình khiên bảo vệ kế bên dòng để loại trừ dòng đó khỏi diện cắt giảm.')}</div>
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
              <th style={{ width: '100px', borderRight: '1px solid var(--border-light)' }}>{t('Khối')}</th>
              <th>{t('Thông tin phân bổ (Allocations Info)')}</th>
              <th style={{ textAlign: 'right', width: '160px' }}>{t('Tỉ trọng (%)')}</th>
              <th style={{ textAlign: 'right', width: '160px' }}>{t('Số tiền (Cash)')}</th>
              <th style={{ textAlign: 'right', width: '160px' }}>{t('Số tiền giảm')}</th>
              <th style={{ textAlign: 'right', width: '160px' }}>{t('Số tiền thực tế')}</th>
              <th style={{ textAlign: 'center', width: '90px' }}>{t('Loại trừ')}</th>
              <th style={{ textAlign: 'center', width: '100px' }}>{t('Áp dụng')}</th>
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
                    {t('Sinh hoạt')}
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
                    title={al.isExcluded ? t('Đã được loại trừ khỏi cắt giảm') : t('Bật khiên bảo vệ loại trừ khỏi cắt giảm')}
                  >
                    {al.isExcluded ? t('🛡️ Khóa') : '🔓'}
                  </button>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    className="btn-icon"
                    onClick={() => onApplyToAsset(al)}
                    disabled={!al.AssetId}
                    title={al.AssetId ? t('Áp dụng số tiền sang tài sản') : t('Chưa liên kết tài sản')}
                    style={{ opacity: al.AssetId ? 1 : 0.3, cursor: al.AssetId ? 'pointer' : 'not-allowed', background: 'transparent', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '4px', padding: '4px 8px', color: '#10b981' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  </button>
                </td>
              </tr>
            ))}

            {/* divider: Còn lại (Saving Base) */}
            <tr className="table-section-divider">
              <td style={{ borderRight: '1px solid var(--border-light)' }}></td>
              <td style={{ fontWeight: 700, paddingLeft: '16px' }}>{t('Còn lại (Saving Base)')}</td>
              <td style={{ textAlign: 'right' }}></td>
              <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                {formatCurrency(totalSavingCash)}
              </td>
              <td></td>
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
                    {t('Tiết kiệm')}
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
                    title={al.isExcluded ? t('Đã được loại trừ khỏi cắt giảm') : t('Bật khiên bảo vệ loại trừ khỏi cắt giảm')}
                  >
                    {al.isExcluded ? t('🛡️ Khóa') : '🔓'}
                  </button>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    className="btn-icon"
                    onClick={() => onApplyToAsset(al)}
                    disabled={!al.AssetId}
                    title={al.AssetId ? t('Áp dụng số tiền sang tài sản') : t('Chưa liên kết tài sản')}
                    style={{ opacity: al.AssetId ? 1 : 0.3, cursor: al.AssetId ? 'pointer' : 'not-allowed', background: 'transparent', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '4px', padding: '4px 8px', color: '#10b981' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  </button>
                </td>
              </tr>
            ))}

            {/* 3. ĐẦU TƯ BLOCK */}
            {calculatedInvestments.length > 0 && (
              <>
            <tr className="table-section-divider">
              <td style={{ borderRight: '1px solid var(--border-light)' }}></td>
              <td style={{ fontWeight: 700, paddingLeft: '16px' }}>{t('Đầu tư (Investment Base)')}</td>
              <td style={{ textAlign: 'right' }}></td>
              <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                {formatCurrency(totalInvestmentCash)}
              </td>
              <td></td>
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
                    {t('Đầu tư')}
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
                    title={al.isExcluded ? t('Đã được loại trừ khỏi cắt giảm') : t('Bật khiên bảo vệ loại trừ khỏi cắt giảm')}
                  >
                    {al.isExcluded ? t('🛡️ Khóa') : '🔓'}
                  </button>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    className="btn-icon"
                    onClick={() => onApplyToAsset(al)}
                    disabled={!al.AssetId}
                    title={al.AssetId ? t('Áp dụng số tiền sang tài sản') : t('Chưa liên kết tài sản')}
                    style={{ opacity: al.AssetId ? 1 : 0.3, cursor: al.AssetId ? 'pointer' : 'not-allowed', background: 'transparent', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '4px', padding: '4px 8px', color: '#10b981' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
            </>
            )}

            {/* Total Row */}
            <tr className="total-row">
              <td style={{ borderRight: '1px solid var(--border-light)' }}>{t('Tổng dòng')}</td>
              <td style={{ paddingLeft: '16px' }}>{t('Cân đối (Balanced)')}</td>
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
              <td></td>
            </tr>

          </tbody>
        </table>
      </div>
    </div>
  );
}

// 5. GOALS PAGE COMPONENT
function GoalsPage({ goals, userId, totalCurrent, onRefresh }: {
  goals: any[];
  userId: string;
  totalCurrent: number;
  onRefresh: () => Promise<void>;
}) {
  const { t } = useLanguage();
  const [showModal, setShowModal] = useState(false);
  const [editGoal, setEditGoal] = useState<any>(null);
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState(0);
  const [formStartDate, setFormStartDate] = useState('');
  const [formDueDate, setFormDueDate] = useState('');

  const openCreate = () => {
    setEditGoal(null);
    setFormName('');
    setFormAmount(0);
    setFormStartDate('');
    setFormDueDate('');
    setShowModal(true);
  };

  const openEdit = (goal: any) => {
    setEditGoal(goal);
    setFormName(goal.Name);
    setFormAmount(goal.TargetAmount);
    setFormStartDate(goal.StartDate ? goal.StartDate.split('T')[0] : '');
    setFormDueDate(goal.DueDate ? goal.DueDate.split('T')[0] : '');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        Name: formName,
        TargetAmount: formAmount,
        StartDate: formStartDate ? new Date(formStartDate).toISOString() : undefined,
        DueDate: new Date(formDueDate).toISOString()
      };
      if (editGoal) {
        await goalService.update(editGoal.Id, payload, userId);
      } else {
        await goalService.create(payload, userId);
      }
      setShowModal(false);
      await onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('Bạn có chắc chắn muốn xóa mục tiêu này?'))) return;
    try {
      await goalService.delete(id);
      await onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStart = async (id: string) => {
    try {
      await goalService.start(id);
      await onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm(t('Bạn có chắc chắn muốn hủy mục tiêu này?'))) return;
    try {
      await goalService.cancel(id);
      await onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; color: string; label: string }> = {
      NotStarted: { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', label: t('Chưa bắt đầu') },
      Processing: { bg: 'rgba(99,102,241,0.15)', color: '#6366f1', label: t('Đang thực hiện') },
      Successed: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: t('Thành công') },
      Failed: { bg: 'rgba(244,63,94,0.15)', color: '#f43f5e', label: t('Thất bại') },
      Cancelled: { bg: 'rgba(100,116,139,0.15)', color: '#64748b', label: t('Đã hủy') },
    };
    const s = styles[status] || styles.NotStarted;
    return (
      <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '10px', fontWeight: 600, background: s.bg, color: s.color }}>
        {s.label}
      </span>
    );
  };

  const getProgressPercent = (goal: any) => {
    if (goal.TargetAmount <= 0) return 0;
    return Math.min(100, Math.round((totalCurrent / goal.TargetAmount) * 100));
  };

  const getTimeRemaining = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due.getTime() - now.getTime();
    if (diff <= 0) return t('Đã hết hạn');
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days >= 365) return `${Math.floor(days / 365)} năm ${Math.floor((days % 365) / 30)} tháng`;
    if (days >= 30) return `${Math.floor(days / 30)} tháng ${days % 30} ngày`;
    return `${days} ngày`;
  };

  // Sort goals: processing first, then by due date
  const sortedGoals = [...goals].sort((a, b) => {
    const statusOrder: Record<string, number> = { Processing: 0, NotStarted: 1, Successed: 2, Failed: 3, Cancelled: 4 };
    const aOrder = statusOrder[a.Status] ?? 99;
    const bOrder = statusOrder[b.Status] ?? 99;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return new Date(a.DueDate).getTime() - new Date(b.DueDate).getTime();
  });

  return (
    <div>
      <div className="tab-header">
        <div>
          <h2 className="section-title">{t('Thiết lập mục tiêu')}</h2>
          <p className="section-desc">{t('Quản lý mục tiêu tài chính')}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" onClick={openCreate} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {t('Thêm mục tiêu')}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid-3" style={{ marginBottom: '20px' }}>
        <div className="card">
          <div className="metric-header">
            <span className="metric-title">{t('Tổng số mục tiêu')}</span>
          </div>
          <div className="metric-value" style={{ fontSize: '1.8rem' }}>{goals.length}</div>
        </div>
        <div className="card">
          <div className="metric-header">
            <span className="metric-title">{t('Số tiền hiện có')}</span>
          </div>
          <div className="metric-value" style={{ fontSize: '1.8rem', color: 'var(--success)' }}>{formatCurrency(totalCurrent)}</div>
        </div>
        <div className="card">
          <div className="metric-header">
            <span className="metric-title">{t('Mục tiêu gần nhất')}</span>
          </div>
          <div className="metric-value" style={{ fontSize: '1.5rem' }}>
            {sortedGoals.find(g => g.Status === 'Processing')?.Name || sortedGoals.find(g => g.Status === 'NotStarted')?.Name || '--'}
          </div>
        </div>
      </div>

      {/* Goals List */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>{t('Tên mục tiêu')}</th>
              <th style={{ textAlign: 'right' }}>{t('Số tiền mục tiêu')}</th>
              <th style={{ textAlign: 'right' }}>{t('Ngày bắt đầu')}</th>
              <th style={{ textAlign: 'right' }}>{t('Ngày đến hạn')}</th>
              <th style={{ textAlign: 'right' }}>{t('Thời gian còn lại')}</th>
              <th style={{ textAlign: 'right' }}>{t('Tiến độ')}</th>
              <th style={{ textAlign: 'center' }}>{t('Trạng thái')}</th>
              <th style={{ textAlign: 'center', width: '160px' }}>{t('Hành động')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedGoals.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                  {t('Chưa có mục tiêu nào. Hãy tạo mục tiêu mới!')}
                </td>
              </tr>
            ) : (
              sortedGoals.map((goal) => {
                const progress = getProgressPercent(goal);
                return (
                  <tr key={goal.Id}>
                    <td style={{ fontWeight: 600 }}>{goal.Name}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)' }}>{formatCurrency(goal.TargetAmount)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)' }}>
                      {goal.StartDate ? new Date(goal.StartDate).toLocaleDateString('en-GB') : '--'}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)' }}>
                      {goal.DueDate ? new Date(goal.DueDate).toLocaleDateString('en-GB') : '--'}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', color: goal.Status === 'Failed' || goal.Status === 'Cancelled' ? 'var(--danger)' : 'var(--text-secondary)' }}>
                      {goal.Status === 'Cancelled' ? '--' : getTimeRemaining(goal.DueDate)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                        <div style={{ flex: 1, maxWidth: '120px', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${progress}%`, height: '100%', borderRadius: '3px', transition: 'width 0.5s ease',
                            background: goal.Status === 'Successed' ? '#10b981' : goal.Status === 'Failed' ? '#f43f5e' : progress >= 100 ? '#10b981' : '#6366f1'
                          }} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 600, minWidth: '45px' }}>{progress}%</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>{getStatusBadge(goal.Status)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {goal.Status === 'NotStarted' && (
                          <button className="btn-icon" onClick={() => handleStart(goal.Id)} title={t('Bắt đầu')}
                            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '4px', padding: '4px 8px', color: '#10b981', fontSize: '0.7rem', fontWeight: 600 }}>
                            {t('Bắt đầu')}
                          </button>
                        )}
                        {goal.Status === 'Processing' && (
                          <button className="btn-icon" onClick={() => handleCancel(goal.Id)} title={t('Hủy mục tiêu')}
                            style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '4px', padding: '4px 8px', color: '#f43f5e', fontSize: '0.7rem', fontWeight: 600 }}>
                            {t('Hủy')}
                          </button>
                        )}
                        <button className="btn-icon edit" onClick={() => openEdit(goal)} title={t('Sửa')}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                          </svg>
                        </button>
                        <button className="btn-icon delete" onClick={() => handleDelete(goal.Id)} title={t('Xóa')}>
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

      {/* Goal Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{editGoal ? t('Cập nhật mục tiêu') : t('Tạo mục tiêu mới')}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">{t('Tên mục tiêu')}</label>
                <input type="text" className="form-control" required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={t('Nhập tên mục tiêu')} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('Số tiền mục tiêu')}</label>
                <MoneyInput className="form-control" value={formAmount}
                  onChange={(val) => setFormAmount(val)}
                  placeholder={t('Nhập số tiền mục tiêu')} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('Ngày bắt đầu')}</label>
                <input type="date" className="form-control"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('Ngày đến hạn')}</label>
                <input type="date" className="form-control" required
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('Hủy')}</button>
                <button type="submit" className="btn btn-primary">{t('Lưu lại')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
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

// 5. ALLOCATION HISTORY SECTION COMPONENT
function DebtPage({ debts, userId, onRefresh }: { debts: any[]; userId: string; onRefresh: () => void }) {
  const { t } = useLanguage();
  const [formName, setFormName] = useState('');
  const [formTotalDebt, setFormTotalDebt] = useState('');
  const [formBorrowDate, setFormBorrowDate] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formInterestRate, setFormInterestRate] = useState('');
  const [formType, setFormType] = useState('Borrowed');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState<any>(null);
  const [payingDebt, setPayingDebt] = useState<any>(null);
  const [payingError, setPayingError] = useState('');

  const openCreate = () => {
    setEditingDebt(null);
    setFormName('');
    setFormTotalDebt('');
    setFormBorrowDate(new Date().toISOString().split('T')[0]);
    setFormDueDate('');
    setFormNote('');
    setFormDescription('');
    setFormInterestRate('');
    setFormType('Borrowed');
    setShowModal(true);
  };

  const openEdit = (debt: any) => {
    setEditingDebt(debt);
    setFormName(debt.Name || '');
    setFormTotalDebt(String(debt.TotalDebt || 0));
    setFormBorrowDate(debt.BorrowDate ? debt.BorrowDate.split('T')[0] : '');
    setFormDueDate(debt.DueDate ? debt.DueDate.split('T')[0] : '');
    setFormNote(debt.Note || '');
    setFormDescription(debt.Description || '');
    setFormInterestRate(debt.InterestRate != null ? String(debt.InterestRate) : '');
    setFormType(debt.Type || 'Borrowed');
    setShowModal(true);
  };

  const handleSaveDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const interestRate = formInterestRate !== '' ? parseFloat(formInterestRate.replace(/,/g, '')) : null;
      const payload: any = {
        Name: formName,
        TotalDebt: parseFloat(formTotalDebt.replace(/,/g, '')) || 0,
        BorrowDate: formBorrowDate,
        DueDate: formDueDate || undefined,
        Note: formNote || undefined,
        Description: formDescription || undefined,
        InterestRate: interestRate,
        Type: formType
      };
      if (editingDebt) {
        await debtService.update(editingDebt.Id, payload, userId);
      } else {
        await debtService.create(payload, userId);
      }
      setShowModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || t('Có lỗi xảy ra'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('Xác nhận xóa sổ nợ này?'))) return;
    try {
      await debtService.delete(id);
      onRefresh();
    } catch (err: any) {
      alert(err.message || t('Có lỗi xảy ra'));
    }
  };

  const handleClose = async (id: string) => {
    if (!window.confirm(t('Xác nhận đóng sổ nợ này?'))) return;
    try {
      await debtService.close(id);
      onRefresh();
    } catch (err: any) {
      alert(err.message || t('Có lỗi xảy ra'));
    }
  };

  const openPaymentModal = (debt: any) => {
    setPayingDebt(debt);
    setPaymentAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentNote('');
    setPayingError('');
    setShowPaymentModal(true);
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingDebt) return;
    const amount = parseFloat(paymentAmount.replace(/,/g, '')) || 0;
    if (amount <= 0) { setPayingError(t('Số tiền phải lớn hơn 0')); return; }
    const remaining = payingDebt.RemainingAmount ?? (payingDebt.TotalDebt - payingDebt.PaidAmount);
    if (amount > remaining) {
      if (!window.confirm(t('Số tiền thanh toán vượt quá số dư còn lại. Bạn có chắc muốn tiếp tục?'))) return;
    }
    try {
      await debtService.addPayment(payingDebt.Id, {
        PaymentDate: paymentDate,
        Amount: amount,
        Note: paymentNote || undefined
      });
      setShowPaymentModal(false);
      setPayingDebt(null);
      onRefresh();
    } catch (err: any) {
      setPayingError(err.message || t('Có lỗi xảy ra'));
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const totalDebtCount = debts.length;
  const totalOutstanding = debts.reduce((s, d) => s + (d.RemainingAmount ?? (d.TotalDebt - d.PaidAmount)), 0);
  const totalPaid = debts.reduce((s, d) => s + (d.PaidAmount || 0), 0);
  const nearestDueDebt = debts
    .filter(d => !d.IsClosed && d.DueDate)
    .sort((a, b) => new Date(a.DueDate).getTime() - new Date(b.DueDate).getTime())[0] || null;

  const getStatusBadge = (debt: any) => {
    if (debt.IsClosed) return { text: t('Đã đóng'), bg: 'rgba(16,185,129,0.15)', color: '#10b981' };
    const remaining = debt.RemainingAmount ?? (debt.TotalDebt - debt.PaidAmount);
    if (remaining <= 0) return { text: t('Đã đóng'), bg: 'rgba(16,185,129,0.15)', color: '#10b981' };
    if (debt.DueDate && new Date(debt.DueDate) < new Date()) return { text: t('Quá hạn'), bg: 'rgba(239,68,68,0.15)', color: '#ef4444' };
    return { text: t('Đang vay'), bg: 'rgba(99,102,241,0.15)', color: 'var(--primary)' };
  };

  const getTypeBadge = (type: string) => {
    if (type === 'Lent') return { text: t('Cho vay'), bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' };
    return { text: t('Vay'), bg: 'rgba(99,102,241,0.15)', color: 'var(--primary)' };
  };

  const formatDate = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  return (
    <div className="debt-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>{t('Quản lý nợ')}</h2>
        <button className="btn" onClick={openCreate} style={{
          background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '6px',
          padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {t('Thêm sổ nợ')}
        </button>
      </div>

      <div className="summary-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div className="summary-card" style={{ background: 'rgba(99,102,241,0.08)', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{t('Tổng sổ nợ')}</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{totalDebtCount}</div>
        </div>
        <div className="summary-card" style={{ background: 'rgba(239,68,68,0.08)', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{t('Còn nợ')}</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: '#ef4444' }}>{formatInputNumber(totalOutstanding)}</div>
        </div>
        <div className="summary-card" style={{ background: 'rgba(16,185,129,0.08)', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{t('Đã trả')}</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: '#10b981' }}>{formatInputNumber(totalPaid)}</div>
        </div>
        <div className="summary-card" onClick={() => { if (nearestDueDebt) { setExpandedId(nearestDueDebt.Id); setTimeout(() => { const el = document.getElementById('debt-row-' + nearestDueDebt.Id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50); } }} style={{ background: 'rgba(245,158,11,0.08)', borderRadius: '10px', padding: '16px', cursor: nearestDueDebt ? 'pointer' : 'default', transition: 'var(--transition-smooth)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{t('Sắp đến hạn')}</div>
          <div style={{ fontSize: nearestDueDebt ? '1rem' : '1.3rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: '#f59e0b' }}>{nearestDueDebt ? nearestDueDebt.Name : '—'}</div>
          {nearestDueDebt && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{formatDate(nearestDueDebt.DueDate)}</div>}
        </div>
      </div>

      {debts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '12px', opacity: 0.5 }}>
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          <div>{t('Chưa có sổ nợ nào')}</div>
          <button className="btn" onClick={openCreate} style={{ marginTop: '16px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 20px', cursor: 'pointer' }}>
            {t('Tạo sổ nợ đầu tiên')}
          </button>
        </div>
      ) : (
        <div className="table-container" style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--border)' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>{t('Tên')}</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>{t('Loại')}</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{t('Tổng nợ')}</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{t('Đã trả')}</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{t('Còn lại')}</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>{t('Lãi suất')}</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{t('Tiền lãi')}</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>{t('Ngày vay')}</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>{t('Hạn trả')}</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>{t('Ghi chú')}</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>{t('Trạng thái')}</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>{t('Thao tác')}</th>
              </tr>
            </thead>
            <tbody>
              {debts.map((debt: any) => {
                const remaining = debt.RemainingAmount ?? (debt.TotalDebt - (debt.PaidAmount || 0));
                const statusBadge = getStatusBadge(debt);
                const typeBadge = getTypeBadge(debt.Type);
                const isExpanded = expandedId === debt.Id;
                const calcInterest = (d: any) => {
                  if (d.InterestRate == null || d.InterestRate === 0 || !d.BorrowDate) return 0;
                  const rate = d.InterestRate / 100;
                  const payments = (d.Payments || []).slice().sort((a: any, b: any) => new Date(a.PaymentDate).getTime() - new Date(b.PaymentDate).getTime());
                  let totalInterest = 0;
                  let prevDate = new Date(d.BorrowDate);
                  let balance = d.TotalDebt;
                  for (const pmt of payments) {
                    const pmtDate = new Date(pmt.PaymentDate);
                    if (pmtDate <= prevDate) continue;
                    const days = (pmtDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
                    totalInterest += balance * rate * (days / 365);
                    balance = pmt.RemainingAfterPayment ?? Math.max(0, balance - pmt.Amount);
                    prevDate = pmtDate;
                  }
                  const now = new Date();
                  const finalDays = Math.max(0, (now.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
                  totalInterest += balance * rate * (finalDays / 365);
                  return totalInterest;
                };
                const interestAmount = calcInterest(debt);
                return (
                  <React.Fragment key={debt.Id}>
                    <tr id={`debt-row-${debt.Id}`} onClick={() => toggleExpand(debt.Id)} style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)', background: isExpanded ? 'rgba(99,102,241,0.04)' : 'transparent' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{debt.Name}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 600, background: typeBadge.bg, color: typeBadge.color }}>{typeBadge.text}</span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-display)' }}>{formatInputNumber(debt.TotalDebt)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-display)', color: '#10b981' }}>{formatInputNumber(debt.PaidAmount || 0)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-display)', color: remaining > 0 ? '#ef4444' : '#10b981', fontWeight: 700 }}>{formatInputNumber(remaining)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {debt.InterestRate != null ? <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{debt.InterestRate}%</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-display)', color: interestAmount > 0 ? '#f59e0b' : 'var(--text-muted)', fontWeight: 600 }}>{interestAmount > 0 ? formatInputNumber(Math.round(interestAmount)) : '—'}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>{formatDate(debt.BorrowDate)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>{debt.DueDate ? formatDate(debt.DueDate) : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                      <td style={{ padding: '10px 12px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: debt.Note ? 'inherit' : 'var(--text-muted)' }}>{debt.Note || '—'}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 600, background: statusBadge.bg, color: statusBadge.color }}>{statusBadge.text}</span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          {!debt.IsClosed && remaining > 0 && (
                            <button onClick={(e) => { e.stopPropagation(); openPaymentModal(debt); }} style={{ background: 'rgba(16,185,129,0.1)', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.75rem', color: '#10b981' }} title={t('Thanh toán')}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                            </button>
                          )}
                          {!debt.IsClosed && (
                            <button onClick={(e) => { e.stopPropagation(); handleClose(debt.Id); }} style={{ background: 'rgba(99,102,241,0.1)', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--primary)' }} title={t('Đóng sổ')}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            </button>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); openEdit(debt); }} style={{ background: 'rgba(245,158,11,0.1)', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.75rem', color: '#f59e0b' }} title={t('Sửa')}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(debt.Id); }} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.75rem', color: '#ef4444' }} title={t('Xóa')}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${debt.Id}-expanded`}>
                        <td colSpan={12} style={{ padding: '16px 20px', background: 'rgba(99,102,241,0.02)', borderBottom: '1px solid var(--border)' }}>
                          {debt.Description && (
                            <div style={{ marginBottom: '12px', padding: '12px', background: 'rgba(99,102,241,0.05)', borderRadius: '8px', fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>
                              <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--text)' }}>{t('Mô tả')}</div>
                              {debt.Description}
                            </div>
                          )}
                          <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>{t('Lịch sử thanh toán')}</div>
                          {(!debt.Payments || debt.Payments.length === 0) ? (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>{t('Chưa có thanh toán nào')}</div>
                          ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                  <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600 }}>{t('Ngày')}</th>
                                  <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{t('Số tiền')}</th>
                                  <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600 }}>{t('Ghi chú')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(debt.Payments || []).map((pmt: any) => (
                                  <tr key={pmt.Id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '6px 8px' }}>{formatDateTime(pmt.PaymentDate || pmt.CreatedAt)}</td>
                                    <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-display)', color: '#10b981', fontWeight: 600 }}>{formatInputNumber(pmt.Amount)}</td>
                                    <td style={{ padding: '6px 8px', color: pmt.Note ? 'inherit' : 'var(--text-muted)' }}>{pmt.Note || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal" style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 16px' }}>{editingDebt ? t('Sửa sổ nợ') : t('Thêm sổ nợ mới')}</h3>
            <form onSubmit={handleSaveDebt}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-muted)' }}>{t('Tên')} *</label>
                <input className="form-control" style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem' }} value={formName} onChange={(e) => setFormName(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-muted)' }}>{t('Loại')}</label>
                <select className="form-control" style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.85rem' }} value={formType} onChange={(e) => setFormType(e.target.value)}>
                  <option value="Borrowed">{t('Vay')}</option>
                  <option value="Lent">{t('Cho vay')}</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-muted)' }}>{t('Tổng nợ')} *</label>
                <input className="form-control" style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem' }} value={formatInputNumber(parseFloat(formTotalDebt.replace(/,/g, '')) || 0)} onChange={(e) => setFormTotalDebt(e.target.value.replace(/,/g, ''))} required />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-muted)' }}>{t('Ngày vay')} *</label>
                <input className="form-control" type="date" style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem' }} value={formBorrowDate} onChange={(e) => setFormBorrowDate(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-muted)' }}>{t('Hạn trả')}</label>
                <input className="form-control" type="date" style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem' }} value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-muted)' }}>{t('Mô tả')}</label>
                <textarea className="form-control" style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem', resize: 'vertical' }} value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder={t('Nhập mô tả')} rows={3} />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-muted)' }}>{t('Lãi suất (%/năm)')}</label>
                <input className="form-control" type="number" step="0.01" min="0" style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem' }} value={formInterestRate} onChange={(e) => setFormInterestRate(e.target.value)} placeholder={t('VD: 12.5')} />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-muted)' }}>{t('Ghi chú')}</label>
                <input className="form-control" style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem' }} value={formNote} onChange={(e) => setFormNote(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>{t('Hủy')}</button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>{editingDebt ? t('Lưu') : t('Thêm')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && payingDebt && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal" style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '420px' }}>
            <h3 style={{ margin: '0 0 4px' }}>{t('Thêm thanh toán')}</h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {payingDebt.Name} — {t('Còn lại')}: <strong style={{ fontFamily: 'var(--font-display)' }}>{formatInputNumber(payingDebt.RemainingAmount ?? (payingDebt.TotalDebt - payingDebt.PaidAmount))}</strong>
            </div>
            <form onSubmit={handleAddPayment}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-muted)' }}>{t('Ngày thanh toán')} *</label>
                <input className="form-control" type="date" style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem' }} value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-muted)' }}>{t('Số tiền')} *</label>
                <input className="form-control" style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem' }} value={formatInputNumber(parseFloat(paymentAmount.replace(/,/g, '')) || 0)} onChange={(e) => setPaymentAmount(e.target.value.replace(/,/g, ''))} required autoFocus />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-muted)' }}>{t('Ghi chú')}</label>
                <input className="form-control" style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem' }} value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} />
              </div>
              {payingError && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '8px' }}>{payingError}</div>}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowPaymentModal(false); setPayingDebt(null); }} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>{t('Hủy')}</button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>{t('Xác nhận')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AllocationHistorySection({ records, onRestore, formatDateTime, formatCurrency }: {
  records: any[];
  onRestore: (id: string) => void;
  formatDateTime: (iso: string) => string;
  formatCurrency: (value: number) => string;
}) {
  const { t } = useLanguage();
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', gap: '16px' }}>
      <div style={{ flex: '0 0 280px', maxHeight: '360px', overflowY: 'auto' }}>
        {records.map((r: any) => (
          <div key={r.Id} onClick={() => setSelectedHistoryId(selectedHistoryId === r.Id ? null : r.Id)}
            style={{
              padding: '10px 14px', borderRadius: '6px', cursor: 'pointer', marginBottom: '4px',
              background: selectedHistoryId === r.Id ? 'rgba(99,102,241,0.1)' : 'transparent',
              border: selectedHistoryId === r.Id ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
              transition: 'all 0.15s'
            }}
          >
            <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>
              {formatDateTime(r.RecordedAt)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {r.Details?.length || 0} {t('danh mục')}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--primary)', marginTop: '2px', fontWeight: 500 }}>
              {t('Gốc: ')}{formatCurrency(r.CurrentAmount)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1 }}>
        {selectedHistoryId ? (
          (() => {
            const record = records.find((r: any) => r.Id === selectedHistoryId);
            if (!record) return null;
            return (
              <div style={{ overflowX: 'auto' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', padding: '6px 10px', background: 'rgba(99,102,241,0.06)', borderRadius: '6px' }}>
                  {t('Phân bổ gốc: ')}<strong style={{ fontFamily: 'var(--font-display)' }}>{formatCurrency(record.CurrentAmount)}</strong>
                </div>
                <table className="custom-table" style={{ minWidth: '450px' }}>
                  <thead>
                    <tr>
                      <th>{t('Danh mục')}</th>
                      <th style={{ textAlign: 'right' }}>{t('Số tiền')}</th>
                      <th style={{ textAlign: 'right' }}>{t('Tỉ trọng')}</th>
                      <th style={{ textAlign: 'center' }}>{t('Loại')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(record.Details || []).map((d: any) => (
                      <tr key={d.Id}>
                        <td style={{ fontWeight: 600 }}>{d.Name || d.FinancialCategory}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)' }}>{formatCurrency(d.CurrentAmount)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)' }}>{d.TargetPercentage.toFixed(4)}%</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 600,
                            background: d.AssetType === 'Saving' ? 'rgba(99,102,241,0.15)' : d.AssetType === 'Investment' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                            color: d.AssetType === 'Saving' ? 'var(--primary)' : d.AssetType === 'Investment' ? '#10b981' : '#f59e0b'
                          }}>
                            {d.AssetType === 'Saving' ? t('Tiết kiệm') : d.AssetType === 'Investment' ? t('Đầu tư') : t('Sinh hoạt')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: '12px', textAlign: 'right' }}>
                  <button onClick={() => onRestore(record.Id)} style={{
                    background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
                    color: 'var(--primary)', borderRadius: '6px', padding: '8px 20px', cursor: 'pointer',
                    fontSize: '0.85rem', fontWeight: 600
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                    {t('Khôi phục')}
                  </button>
                </div>
              </div>
            );
          })()
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {t('Chọn một bản ghi từ danh sách bên trái để xem chi tiết')}
          </div>
        )}
      </div>
    </div>
  );
}

// 6. PROFILE PAGE COMPONENT
function ProfilePage({ user, onUserUpdate }: { user: any; onUserUpdate: (u: any) => void }) {
  const { t } = useLanguage();
  const { addToast } = useToast();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setProfileLoading(true);
    try {
      const api = await import('./services/api');
      const result = await api.authService.updateProfile(user?.id, displayName.trim());
      onUserUpdate(result);
      addToast({ title: t('Cập nhật hồ sơ thành công!'), variant: 'success' });
    } catch (err: any) {
      addToast({ title: t('Lỗi cập nhật hồ sơ'), description: err.message, variant: 'error' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast({ title: t('Mật khẩu không khớp'), variant: 'error' });
      return;
    }
    if (!currentPassword || !newPassword) return;
    setPasswordLoading(true);
    try {
      const api = await import('./services/api');
      await api.authService.changePassword(user?.id, currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      addToast({ title: t('Đổi mật khẩu thành công!'), variant: 'success' });
    } catch (err: any) {
      addToast({ title: t('Lỗi đổi mật khẩu'), description: err.message, variant: 'error' });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 4px' }}>{t('Hồ sơ người dùng')}</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
          {t('Quản lý thông tin cá nhân và bảo mật')}
        </p>
      </div>

      {/* Account Info */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <h3 className="card-title">{t('Thông tin tài khoản')}</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Email</label>
              <div style={{ fontSize: '0.95rem', fontWeight: 500, padding: '8px 0' }}>{user?.email || '-'}</div>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('Ngày tạo')}</label>
              <div style={{ fontSize: '0.95rem', fontWeight: 500, padding: '8px 0' }}>{user?.createdAt || '-'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Update Display Name */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <h3 className="card-title">{t('Tên hiển thị')}</h3>
        </div>
        <div className="card-body">
          <form onSubmit={handleUpdateProfile}>
            <div className="form-group">
              <label className="form-label">{t('Tên hiển thị')}</label>
              <input
                type="text"
                className="form-control"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('Nhập tên hiển thị mới')}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={profileLoading}>
              {profileLoading ? '...' : t('Cập nhật')}
            </button>
          </form>
        </div>
      </div>

      {/* Change Password */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">{t('Đổi mật khẩu')}</h3>
        </div>
        <div className="card-body">
          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label className="form-label">{t('Mật khẩu hiện tại')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd.current ? 'text' : 'password'}
                  className="form-control"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t('Nhập mật khẩu hiện tại')}
                  required
                  style={{ paddingRight: '40px' }}
                />
                <button type="button" onClick={() => setShowPwd(p => ({ ...p, current: !p.current }))}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  {showPwd.current ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t('Mật khẩu mới')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd.new ? 'text' : 'password'}
                  className="form-control"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('Nhập mật khẩu mới')}
                  required
                  style={{ paddingRight: '40px' }}
                />
                <button type="button" onClick={() => setShowPwd(p => ({ ...p, new: !p.new }))}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  {showPwd.new ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t('Xác nhận mật khẩu mới')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd.confirm ? 'text' : 'password'}
                  className="form-control"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('Nhập lại mật khẩu mới')}
                  required
                  style={{ paddingRight: '40px' }}
                />
                <button type="button" onClick={() => setShowPwd(p => ({ ...p, confirm: !p.confirm }))}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  {showPwd.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={passwordLoading}>
              {passwordLoading ? '...' : t('Đổi mật khẩu')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
