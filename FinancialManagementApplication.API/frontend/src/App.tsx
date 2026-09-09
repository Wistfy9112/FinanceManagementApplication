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
  checkServerStatus,
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

const formatDateShort = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatDateTime = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear());
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const secs = String(d.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${secs}`;
};

function DateTimeEdit({ value, onSave }: { value: string; onSave: (iso: string) => void }) {
  const d = new Date(value);
  const [date, setDate] = useState(d.toISOString().slice(0, 10));
  const [hour, setHour] = useState(String(d.getHours()).padStart(2, '0'));
  const [minute, setMinute] = useState(String(d.getMinutes()).padStart(2, '0'));
  const containerRef = useRef<HTMLDivElement>(null);

  const dateRef = useRef(date);
  const hourRef = useRef(hour);
  const minuteRef = useRef(minute);
  dateRef.current = date;
  hourRef.current = hour;
  minuteRef.current = minute;

  const commit = useCallback(() => {
    const h = Math.min(23, Math.max(0, parseInt(hourRef.current) || 0));
    const m = Math.min(59, Math.max(0, parseInt(minuteRef.current) || 0));
    const s = `${dateRef.current}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    onSave(s);
  }, [onSave]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const inputs = el.querySelectorAll('input');
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
    };
    inputs.forEach(inp => inp.addEventListener('keydown', handleKey));
    return () => inputs.forEach(inp => inp.removeEventListener('keydown', handleKey));
  }, [commit]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        commit();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [commit]);

  useEffect(() => {
    const firstInput = containerRef.current?.querySelector('input');
    firstInput?.focus();
  }, []);

  return (
    <div ref={containerRef} style={{ display: 'flex', gap: '4px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
        style={{ padding: '2px 4px', border: '1px solid var(--primary)', borderRadius: '4px', fontSize: '0.8rem', width: '95px' }} />
      <input type="text" inputMode="numeric" maxLength={2} value={hour} onChange={(e) => setHour(e.target.value.replace(/\D/g, '').slice(0, 2))}
        style={{ padding: '2px 4px', border: '1px solid var(--primary)', borderRadius: '4px', fontSize: '0.8rem', width: '35px', textAlign: 'center' }} />
      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>:</span>
      <input type="text" inputMode="numeric" maxLength={2} value={minute} onChange={(e) => setMinute(e.target.value.replace(/\D/g, '').slice(0, 2))}
        style={{ padding: '2px 4px', border: '1px solid var(--primary)', borderRadius: '4px', fontSize: '0.8rem', width: '35px', textAlign: 'center' }} />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assets' | 'portfolio' | 'goals' | 'debts' | 'profile'>('dashboard');
  const { t } = useLanguage();
  
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

  // Connection & Loading States
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Delete Confirmation State
  const [deleteConfirmAsset, setDeleteConfirmAsset] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmHistory, setDeleteConfirmHistory] = useState<{ id: string; type: 'asset' | 'allocation' } | null>(null);

  // Modal State - Nhóm tài sản 5 tầng
  const [assetModal, setAssetModal] = useState<{
    isOpen: boolean;
    mode: 'add' | 'edit';
    data: { Id?: string; Name: string; InitialValue: number; CurrentValue: number; Type: string; Group: number | null };
  }>({
    isOpen: false,
    mode: 'add',
    data: { Name: '', InitialValue: 0, CurrentValue: 0, Type: 'Saving', Group: 2 }
  });

  const [setupSuccessModal, setSetupSuccessModal] = useState<boolean>(false);
  const [applyResult, setApplyResult] = useState<null | {
    allocationName: string;
    assetName: string;
    amount: number;
    prevCurrent: number;
    nextCurrent: number;
    prevInitial: number;
    nextInitial: number;
  }>(null);
  const [saveAssetResult, setSaveAssetResult] = useState<null | {
    success: boolean;
    recordName?: string;
    recordId?: string;
    recordedAt?: string;
    totalCurrent?: number;
    totalInitial?: number;
    assetCount?: number;
    error?: string;
  }>(null);
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

  // Check server status and fetch initial data on mount
  useEffect(() => {
    const initApp = async () => {
      setLoading(true);
      const online = await checkServerStatus();
      setServerOnline(online);
      if (online) {
        const logged = getLoggedUser();
        if (logged) {
          setUser(logged);
          await loadData();
        }
      }
      setLoading(false);
    };

    initApp();
  }, []);

  // Retry connection
  const handleRetry = useCallback(async () => {
    setLoading(true);
    setServerOnline(null);
    const online = await checkServerStatus();
    setServerOnline(online);
    if (online) {
      const logged = getLoggedUser();
      if (logged) {
        setUser(logged);
        await loadData();
      }
    }
    setLoading(false);
  }, []);

  // Reload data
  const loadData = async () => {
    try {
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
      addToast({ title: t('Lỗi tải dữ liệu'), description: err.message, variant: 'error' });
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

  const handleLogin = async (username: string, pass: string) => {
    try {
      setAuthLoading(true);
      setError(null);
      const res = await authService.login(username, pass);
      setUser(res.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (username: string, pass: string, name: string, email?: string) => {
    try {
      setAuthLoading(true);
      setError(null);
      const res = await authService.register(username, pass, name, email);
      setUser(res.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAuthLoading(false);
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
      if (!user) return;
      // Đồng bộ Type cũ theo Nhóm mới để tương thích dữ liệu cũ
      const groupToType = (g: number | null): string => {
        if (g == null) return assetModal.data.Type;
        if (g === 1 || g === 2) return 'Saving';
        return 'Investment';
      };
      const payload = { ...assetModal.data, Type: groupToType(assetModal.data.Group) };
      if (assetModal.mode === 'add') {
        await assetService.create(payload as any, user.id);
      } else if (assetModal.mode === 'edit' && assetModal.data.Id) {
        await assetService.update(assetModal.data.Id, payload as any, user.id);
      }
      setAssetModal({ ...assetModal, isOpen: false });
      await loadData();
    } catch (err: any) {
      addToast({ title: t('Lỗi lưu tài sản'), description: err.message, variant: 'error' });
    }
  };

  const handleDeleteAsset = async (id: string, name: string) => {
    setDeleteConfirmAsset({ id, name });
  };

  const confirmDeleteAsset = async () => {
    if (!deleteConfirmAsset) return;
    try {
      await assetService.delete(deleteConfirmAsset.id);
      await loadData();
    } catch (err: any) {
      addToast({ title: t('Lỗi xóa tài sản'), description: err.message, variant: 'error' });
    } finally {
      setDeleteConfirmAsset(null);
    }
  };

  const confirmDeleteHistory = async () => {
    if (!deleteConfirmHistory || !user) return;
    const { id, type } = deleteConfirmHistory;
    setDeleteConfirmHistory(null);
    try {
      setError(null);
      if (type === 'asset') {
        const ok = await historyService.deleteAssetHistory(id);
        if (ok) {
          setHistoryRecords((prev: any[]) => prev.filter((r: any) => r.Id !== id));
          addToast({ title: t('Đã xóa lịch sử tài sản!'), variant: 'success' });
        } else {
          addToast({ title: t('Xóa lịch sử thất bại'), variant: 'error' });
        }
      } else {
        const ok = await historyService.deleteAllocationHistory(id);
        if (ok) {
          setAllocationHistoryRecords((prev: any[]) => prev.filter((r: any) => r.Id !== id));
          addToast({ title: t('Đã xóa lịch sử phân bổ!'), variant: 'success' });
        } else {
          addToast({ title: t('Xóa lịch sử thất bại'), variant: 'error' });
        }
      }
    } catch (err: any) {
      addToast({ title: t('Lỗi xóa lịch sử'), description: err.message, variant: 'error' });
    }
  };

  const handleSaveAllAssets = async () => {
    try {
      setError(null);
      if (!user) return;
      const saved: any = await historyService.saveSnapshot(user.id);
      await loadData();
      // Determine success and extract record info
      if (saved) {
        const recordedAtRaw: string = saved.recordedAt || saved.RecordedAt || new Date().toISOString();
        const recordId: string = saved.id || saved.Id || '';
        const recordName: string = formatDateTime(recordedAtRaw);
        const details: any[] = saved.details || saved.Details || [];
        const assetCount: number = details.length || assets.length;
        const totalCurrentFromSaved: number = details.length
          ? details.reduce((s: number, d: any) => s + Number(d.currentValue ?? d.CurrentValue ?? 0), 0)
          : assets.reduce((s: number, a: any) => s + Number(a.CurrentValue || 0), 0);
        const totalInitialFromSaved: number = details.length
          ? details.reduce((s: number, d: any) => s + Number(d.initialValue ?? d.InitialValue ?? 0), 0)
          : assets.reduce((s: number, a: any) => s + Number(a.InitialValue || 0), 0);
        addToast({
          title: t('Đã lưu thông tin tài sản!'),
          description: `${t('Bản ghi')} "${recordName}" • ${assetCount} ${t('tài sản')} • ${t('Tổng')}: ${formatCurrency(totalCurrentFromSaved)}`,
          variant: 'success',
          durationMs: 7000
        });
        setSaveAssetResult({
          success: true,
          recordName,
          recordId,
          recordedAt: recordedAtRaw,
          totalCurrent: totalCurrentFromSaved,
          totalInitial: totalInitialFromSaved,
          assetCount
        });
      } else {
        // Fallback: consider saved null as success if snapshot created but API returned null (e.g., mock), use current assets
        const now = new Date().toISOString();
        const recordName = formatDateTime(now);
        const totalCur = assets.reduce((s: number, a: any) => s + Number(a.CurrentValue || 0), 0);
        const totalIni = assets.reduce((s: number, a: any) => s + Number(a.InitialValue || 0), 0);
        addToast({
          title: t('Đã lưu thông tin tài sản!'),
          description: `${t('Bản ghi')} "${recordName}" • ${assets.length} ${t('tài sản')} • ${t('Tổng')}: ${formatCurrency(totalCur)}`,
          variant: 'success',
          durationMs: 7000
        });
        setSaveAssetResult({
          success: true,
          recordName,
          recordedAt: now,
          totalCurrent: totalCur,
          totalInitial: totalIni,
          assetCount: assets.length
        });
      }
    } catch (err: any) {
      const msg = err?.message || t('Không thể lưu thông tin tài sản');
      addToast({ title: t('Lưu tài sản thất bại'), description: msg, variant: 'error' });
      setSaveAssetResult({ success: false, error: msg });
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

  const handleUpdateAssetHistoryTime = async (historyId: string, recordedAt: string) => {
    try {
      if (!user) return null;
      const updated = await historyService.updateAssetHistoryTime(historyId, recordedAt);
      if (updated) {
        setHistoryRecords(prev => prev.map((r: any) => r.Id === historyId ? updated : r));
        return updated;
      }
      return null;
    } catch { return null; }
  };

  const handleUpdateAllocationHistoryTime = async (historyId: string, recordedAt: string) => {
    try {
      if (!user) return null;
      const updated = await historyService.updateAllocationHistoryTime(historyId, recordedAt);
      if (updated) {
        setAllocationHistoryRecords(prev => prev.map((r: any) => r.Id === historyId ? updated : r));
        return updated;
      }
      return null;
    } catch { return null; }
  };

  const handleDeleteAssetHistory = async (historyId: string) => {
    setDeleteConfirmHistory({ id: historyId, type: 'asset' });
  };

  const handleReorderAssets = async (orderedList: any[]) => {
    const items = orderedList.map((a: any, i: number) => ({ id: a.Id, sortOrder: i + 1 }));
    await assetService.reorder(items);
    await loadData();
    addToast({ title: t('Đã sắp xếp lại thứ tự!'), variant: 'success' });
  };

  const handleReorderAllocations = async (orderedList: any[]) => {
    const items = orderedList.map((a: any, i: number) => ({ id: a.Id, sortOrder: i + 1 }));
    await portfolioService.reorder(items);
    await loadData();
    addToast({ title: t('Đã sắp xếp danh mục!'), variant: 'success' });
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
    const transferAmount = allocation.CurrentAmount;
    const prevCurrent = asset.CurrentValue;
    const nextCurrent = prevCurrent + transferAmount;
    const prevInitial = asset.InitialValue;
    const nextInitial = prevInitial + transferAmount;
    try {
      setError(null);
      await assetService.update(asset.Id, {
        Id: asset.Id,
        Name: asset.Name,
        InitialValue: nextInitial,
        CurrentValue: nextCurrent,
        Type: asset.Type
      });
      await loadData();
      addToast({
        title: t('Đã áp dụng sang tài sản!'),
        description: `${t('Danh mục')} "${allocation.Name}" → ${t('Tài sản')} "${asset.Name}": +${formatCurrency(transferAmount)} • ${formatCurrency(prevCurrent)} → ${formatCurrency(nextCurrent)}`,
        variant: 'success',
        durationMs: 7000
      });
      setApplyResult({
        allocationName: allocation.Name,
        assetName: asset.Name,
        amount: transferAmount,
        prevCurrent,
        nextCurrent,
        prevInitial,
        nextInitial
      });
    } catch (err: any) {
      addToast({ title: t('Lỗi cập nhật tài sản'), description: err.message, variant: 'error' });
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

  const handleDeleteAllocationHistory = async (historyId: string) => {
    setDeleteConfirmHistory({ id: historyId, type: 'allocation' });
  };

  // Setup mode handlers
  const handleStartSetup = () => {
    const totalCurrent = allocations.reduce((sum, al) => sum + (al.CurrentAmount || 0), 0);
    setSetupAmount(Math.max(portfolio?.Amount || 0, totalCurrent));
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
    if (val < 0) val = 0;
    setSetupAmount(val);
    const updated = setupAllocations.map(al => {
      const newPercent = val > 0 ? (al.setupAmount / val) * 100 : 0;
      return { ...al, TargetPercentage: newPercent, CurrentAmount: al.setupAmount };
    });
    setSetupAllocations(updated);
  };

  const handleSetupAllocationAmountChange = (id: string, newAmount: number) => {
    if (newAmount < 0) newAmount = 0;
    const otherTotal = setupAllocations
      .filter(al => al.Id !== id)
      .reduce((sum, al) => sum + (al.setupAmount || 0), 0);
    if (otherTotal + newAmount > setupAmount) return;
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
    if (totalAllocated >= setupAmount) {
      addToast({ title: t('Không thể thêm danh mục'), description: t('Đã đạt hoặc vượt quá phân bổ gốc.'), variant: 'warning' });
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
      if (!user) return;
      if (setupAllocations.length === 0) {
        addToast({ title: t('Lỗi'), description: t('Vui lòng thêm ít nhất một danh mục.'), variant: 'warning' });
        return;
      }
      if (setupAllocations.some(al => !al.Name.trim())) {
        addToast({ title: t('Lỗi'), description: t('Vui lòng nhập tên cho tất cả danh mục.'), variant: 'warning' });
        return;
      }
      const totalAmount = setupAllocations.reduce((sum, al) => sum + (al.setupAmount || 0), 0);
      if (totalAmount > setupAmount) {
        addToast({ title: t('Lỗi'), description: t('Tổng số tiền danh mục vượt quá phân bổ gốc.'), variant: 'warning' });
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
      addToast({ title: t('Lỗi lưu thiết lập'), description: err.message, variant: 'error' });
    }
  };

  // Dynamic values calculated from allocations
  const calculateAllocationsData = () => {
    const nonExcludedPct = allocations
      .filter(al => !exclusions.includes(al.Id))
      .reduce((sum, al) => sum + al.TargetPercentage, 0);

    return allocations.map(al => {
      const currentAmount = income > 0 ? income * (al.TargetPercentage / 100) : 0;
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
    if (serverOnline === false) {
      return <OfflinePage onRetry={handleRetry} t={t} />;
    }
    return (
      <AuthPage 
        onLogin={handleLogin} 
        onRegister={handleRegister} 
        error={error} 
        loading={authLoading}
      />
    );
  }

  return (
    <div className="app">
      {/* Navigation — premium compact */}
      <nav className="navbar">
        <div className="navbar-content">
          <div className="logo">
            <span className="logo-mark">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </span>
            <span className="logo-text"><span className="logo-finance">FINANCE</span> <span className="logo-flow">FLOW</span></span>
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
            <div className="nav-last-updated" title={t('Dữ liệu được đồng bộ từ máy chủ')}>
              <span className="nav-dot" />
              <span>{t('Cập nhật')} 26/05/2026</span>
            </div>
            <div className="user-profile" ref={profileDropdownRef} style={{ position: 'relative', cursor: 'pointer' }}>
              <div onClick={() => setProfileDropdownOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="user-avatar">
                  {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
                </div>
                <span style={{ fontWeight: 650, fontSize: '13px', letterSpacing: '-0.01em' }}>{user.displayName}</span>
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
            debts={debts}
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
            onAdd={() => setAssetModal({ isOpen: true, mode: 'add', data: { Name: '', InitialValue: 0, CurrentValue: 0, Type: 'Saving', Group: 2 } })}
            onEdit={(a: any) => setAssetModal({ isOpen: true, mode: 'edit', data: { Id: a.Id, Name: a.Name, InitialValue: a.InitialValue, CurrentValue: a.CurrentValue, Type: a.Type, Group: (a.Group ?? getAssetRiskLevel(a) ?? 2) } })}
            onDelete={handleDeleteAsset}
            onSave={handleSaveAllAssets}
            onRestore={handleRestoreFromHistory}
            onDeleteHistory={handleDeleteAssetHistory}
            onUpdateTime={handleUpdateAssetHistoryTime}
            onReorder={handleReorderAssets}
          />
        )}

        {activeTab === 'portfolio' && (
          <PortfolioPage 
            assets={assets}
            allocations={allocations}
            income={income}
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
            onDeleteAllocationHistory={handleDeleteAllocationHistory}
            onUpdateAllocationTime={handleUpdateAllocationHistoryTime}
            onReorderAllocations={handleReorderAllocations}
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
                <label className="form-label">{t('Nhóm tài sản')}</label>
                <select
                  className="form-control"
                  value={assetModal.data.Group ?? 2}
                  onChange={(e) => setAssetModal({ ...assetModal, data: { ...assetModal.data, Group: parseInt(e.target.value) } })}
                  style={{ padding: '8px 12px', height: '42px', fontWeight: 600 }}
                >
                  <option value={1}>🟢 {t('Bảo vệ')} — {t('Tiền mặt, quỹ khẩn cấp')}</option>
                  <option value={2}>🔵 {t('Ổn định')} — {t('Tiết kiệm, tiền gửi')}</option>
                  <option value={3}>🟣 {t('Cân bằng')} — {t('Vàng, chứng chỉ quỹ')}</option>
                  <option value={4}>🟠 {t('Tăng trưởng')} — {t('Cổ phiếu, BĐS đầu tư')}</option>
                  <option value={5}>🔴 {t('Rủi ro cao')} — {t('Đầu cơ, biến động mạnh')}</option>
                </select>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:6, lineHeight:1.4 }}>{t('Hệ thống tự đưa tài sản vào đúng tầng tháp theo nhóm bạn chọn.')}</div>
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

      {/* Delete Asset Confirmation Modal */}
      {deleteConfirmAsset && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{t('Xóa tài sản')}</h3>
              <button className="modal-close" onClick={() => setDeleteConfirmAsset(null)}>✕</button>
            </div>
            <div style={{ padding: '20px 24px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                {t('Bạn có chắc chắn muốn xóa tài sản')} <strong style={{ color: 'var(--text-primary)' }}>"{deleteConfirmAsset.name}"</strong>?
              </p>
            </div>
            <div className="modal-actions" style={{ justifyContent: 'center', gap: '12px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteConfirmAsset(null)}
              >
                {t('Hủy')}
              </button>
              <button
                className="btn btn-primary"
                style={{ background: '#ef4444', borderColor: '#ef4444' }}
                onClick={confirmDeleteAsset}
              >
                {t('Xóa')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete History Confirmation Modal */}
      {deleteConfirmHistory && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{t('Xóa lịch sử')}</h3>
              <button className="modal-close" onClick={() => setDeleteConfirmHistory(null)}>✕</button>
            </div>
            <div style={{ padding: '20px 24px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                {t('Bạn có chắc chắn muốn xóa lịch sử này?')}
              </p>
            </div>
            <div className="modal-actions" style={{ justifyContent: 'center', gap: '12px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteConfirmHistory(null)}
              >
                {t('Hủy')}
              </button>
              <button
                className="btn btn-primary"
                style={{ background: '#ef4444', borderColor: '#ef4444' }}
                onClick={confirmDeleteHistory}
              >
                {t('Xóa')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apply To Asset Result Modal */}
      {applyResult && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                {t('Đã áp dụng sang tài sản!')}
              </h3>
              <button className="modal-close" onClick={() => setApplyResult(null)}>✕</button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gap: '10px', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{t('Danh mục')}:</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{applyResult.allocationName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{t('Tài sản')}:</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{applyResult.assetName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px dashed rgba(255,255,255,0.08)', borderBottom: '1px dashed rgba(255,255,255,0.08)', margin: '4px 0' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{t('Số tiền chuyển')}:</span>
                    <span style={{ fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}>+{formatCurrency(applyResult.amount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{t('Biến động')}:</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{formatCurrency(applyResult.prevCurrent)}</span>
                      <span style={{ color: 'var(--primary)' }}>→</span>
                      <span style={{ color: '#10b981' }}>{formatCurrency(applyResult.nextCurrent)}</span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>{t('Vốn ban đầu')}:</span>
                    <span style={{ fontFamily: 'var(--font-display)' }}>{formatCurrency(applyResult.prevInitial)} → {formatCurrency(applyResult.nextInitial)}</span>
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
                {t('Giá trị tài sản đã được cập nhật. Vui lòng kiểm tra tab Quản lý Tài sản để xem chi tiết.')}
              </p>
            </div>
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={() => setApplyResult(null)}
                style={{ minWidth: '120px' }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Asset Result Modal */}
      {saveAssetResult && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: saveAssetResult.success ? 'var(--success)' : '#ef4444' }}>
                {saveAssetResult.success ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                )}
                {saveAssetResult.success ? t('Lưu tài sản thành công!') : t('Lưu tài sản thất bại')}
              </h3>
              <button className="modal-close" onClick={() => setSaveAssetResult(null)}>✕</button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {saveAssetResult.success ? (
                <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'grid', gap: '10px', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{t('Tên bản ghi')}:</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{saveAssetResult.recordName}</span>
                    </div>
                    {saveAssetResult.recordId && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>ID:</span>
                        <span style={{ fontWeight: 500, color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'monospace' }}>{saveAssetResult.recordId.slice(0, 8)}...</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{t('Số lượng tài sản')}:</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{saveAssetResult.assetCount} {t('tài sản')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px dashed rgba(255,255,255,0.08)', borderBottom: '1px dashed rgba(255,255,255,0.08)', margin: '4px 0' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{t('Tổng tài sản')}:</span>
                      <span style={{ fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}>{formatCurrency(saveAssetResult.totalCurrent || 0)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span>{t('Tổng vốn ban đầu')}:</span>
                      <span style={{ fontFamily: 'var(--font-display)' }}>{formatCurrency(saveAssetResult.totalInitial || 0)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span>{t('Thời gian lưu')}:</span>
                      <span style={{ fontFamily: 'var(--font-display)' }}>{saveAssetResult.recordedAt ? formatDateTime(saveAssetResult.recordedAt) : saveAssetResult.recordName}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '16px', marginBottom: '16px', textAlign: 'center' }}>
                  <p style={{ color: '#f87171', fontSize: '0.9rem', lineHeight: 1.6 }}>{saveAssetResult.error}</p>
                </div>
              )}
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
                {saveAssetResult.success
                  ? t('Bản ghi lịch sử đã được tạo. Bạn có thể xem chi tiết ở phần Lịch sử lưu thông tin bên dưới.')
                  : t('Vui lòng thử lại hoặc kiểm tra kết nối.')}
              </p>
            </div>
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={() => setSaveAssetResult(null)}
                style={{ minWidth: '120px', background: saveAssetResult.success ? undefined : '#ef4444', borderColor: saveAssetResult.success ? undefined : '#ef4444' }}
              >
                OK
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
function AuthPage({ onLogin, onRegister, error, loading }: { onLogin: any; onRegister: any; error: string | null; loading?: boolean }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const { t } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      onLogin(username, password);
    } else {
      onRegister(username, password, displayName, email || undefined);
    }
  };

  return (
    <div className="auth-wrapper">
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
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
            <label className="form-label">{t('Tên đăng nhập')}</label>
            <input 
              type="text" 
              className="form-control" 
              required 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('Nhập tên đăng nhập')} 
            />
          </div>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">{t('Địa chỉ Email')}</label>
              <input 
                type="email" 
                className="form-control" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('nhập.email@của.ban')} 
              />
            </div>
          )}
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

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
            {loading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                {t('Đang xử lý...')}
              </span>
            ) : (
              isLogin ? t('Đăng Nhập') : t('Tạo Tài Khoản')
            )}
          </button>
        </form>

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

// 2. OFFLINE PAGE COMPONENT
function OfflinePage({ onRetry, t }: { onRetry: () => void; t: (key: string) => string }) {
  return (
    <div className="offline-page">
      <div className="offline-card">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: '#6366f1', marginBottom: '24px' }}>
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>
          {t('Không thể kết nối server')}
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px', textAlign: 'center', maxWidth: '400px' }}>
          {t('Vui lòng kiểm tra kết nối mạng và đảm bảo server đang chạy.')}
        </p>
        <button className="btn btn-primary" onClick={onRetry}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0s' }}>
              <path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {t('Thử lại')}
          </span>
        </button>
      </div>
    </div>
  );
}

// 2.5 ASSET RISK PYRAMID — Tháp Tài Sản
type RiskLevelId = 1 | 2 | 3 | 4 | 5;

const RISK_LEVEL_META: Record<RiskLevelId, { label: string; riskText: string; short: string; color: string; bg: string; scoreMid: number; desc: string; icon: string }> = {
  1: { label: 'BẢO VỆ', riskText: 'Rất thấp', short: 'Rất thấp', color: '#18C995', bg: 'rgba(24,201,149,0.18)', scoreMid: 90, desc: 'Bảo vệ — tiền mặt, quỹ khẩn cấp', icon: '🛡️' },
  2: { label: 'ỔN ĐỊNH', riskText: 'Thấp', short: 'Thấp', color: '#4D8DFF', bg: 'rgba(77,141,255,0.18)', scoreMid: 72, desc: 'Ổn định — tiết kiệm, tiền gửi', icon: '🏦' },
  3: { label: 'CÂN BẰNG', riskText: 'Trung bình', short: 'Trung bình', color: '#7C5CFF', bg: 'rgba(124,92,255,0.20)', scoreMid: 55, desc: 'Cân bằng — vàng, chứng chỉ quỹ', icon: '⚖️' },
  4: { label: 'TĂNG TRƯỞNG', riskText: 'Cao', short: 'Cao', color: '#F5A623', bg: 'rgba(245,166,35,0.18)', scoreMid: 35, desc: 'Tăng trưởng — cổ phiếu, BĐS đầu tư', icon: '🚀' },
  5: { label: 'RỦI RO CAO', riskText: 'Rất cao', short: 'Rất cao', color: '#FF4D67', bg: 'rgba(255,77,103,0.18)', scoreMid: 12, desc: 'Rủi ro cao — đầu cơ, biến động mạnh', icon: '⚠️' },
};

function getAssetRiskLevel(asset: any): RiskLevelId | null {
  if (!asset) return null;
  // 1 - Ưu tiên Nhóm tài sản mới (single source of truth)
  const grp = asset.Group ?? asset.group ?? asset.AssetGroup ?? asset.assetGroup;
  if (typeof grp === 'number' && grp >= 1 && grp <= 5) return grp as RiskLevelId;
  if (typeof grp === 'string') {
    const g = grp.toLowerCase();
    const map: Record<string, RiskLevelId> = {
      'bao ve': 1, 'bảo vệ': 1, '1': 1,
      'on dinh': 2, 'ổn định': 2, '2': 2,
      'can bang': 3, 'cân bằng': 3, '3': 3,
      'tang truong': 4, 'tăng trưởng': 4, '4': 4,
      'rui ro cao': 5, 'rủi ro cao': 5, 'mao hiem': 5, 'mạo hiểm': 5, '5': 5,
    };
    if (map[g] != null) return map[g];
  }
  // 2 - Fallback explicit risk field cũ
  const explicit = asset.RiskLevel ?? asset.riskLevel ?? asset.Risk ?? asset.risk ?? asset.SafetyScore ?? asset.safetyScore;
  if (typeof explicit === 'number' && explicit >= 1 && explicit <= 5) return explicit as RiskLevelId;
  if (typeof explicit === 'string') {
    const s = explicit.toLowerCase();
    if (['an toàn','safe','1'].includes(s)) return 1;
    if (['ổn định','on dinh','stable','2'].includes(s)) return 2;
    if (['cân bằng','can bang','balanced','3'].includes(s)) return 3;
    if (['tăng trưởng','tang truong','growth','4'].includes(s)) return 4;
    if (['mạo hiểm','mao hiem','risk','high','5'].includes(s)) return 5;
  }
  const nameRaw = String(asset.Name || asset.name || '').trim();
  const name = nameRaw.toLowerCase();
  const typeRaw = asset.Type ?? asset.type ?? '';
  const typeStr = typeof typeRaw === 'string' ? typeRaw : typeRaw === 0 ? 'Expense' : typeRaw === 1 ? 'Saving' : typeRaw === 2 ? 'Investment' : String(typeRaw);
  const type = String(typeStr).toLowerCase();
  // Normalize vietnamese without diacritics for matching
  const norm = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Level 1 keywords — highest priority defensive
  const l1kw = ['emergency','khan cap','du phong','that nghiep','unemployment','health','suc khoe','y te','bao ve','an toan','quy khan'];
  if (l1kw.some(k => norm.includes(k) || name.includes(k))) return 1;
  // Level 5 keywords
  const l5kw = ['mao hiem','speculative','crypto','coin','volatile','bien dong','rui ro cao','high risk'];
  if (l5kw.some(k => norm.includes(k) || name.includes(k))) return 5;
  // Level 3 — gold, balanced, certificates, bonds
  const l3kw = ['gold','vang','chung chi','certificate','can bang','balanced','trai phieu','bond','vang'];
  if (l3kw.some(k => norm.includes(k) || name.includes(k))) return 3;
  // Level 2 — saving, deposit, cash
  const l2kw = ['saving','tiet kiem','deposit','tien gui','cash','tien mat','on dinh','stable'];
  // Need to be careful: "investment certificate" should be l3 not l2, already handled; "skill investment" should be l4
  // Check l2 but exclude if name contains investment+skill? we let l4 handle later
  const isSavingName = l2kw.some(k => norm.includes(k) || name.includes(k));
  if (isSavingName) return 2;
  // Level 4 — stocks, equity, funds, growth, investment generic, BĐS
  const l4kw = ['stock','co phieu','equity','fund','quy dau tu','etf','tang truong','growth','dau tu','investment','skill','bds','bđs','bat dong san','bất động sản','nha dat','dat nen','real estate'];
  if (l4kw.some(k => norm.includes(k) || name.includes(k))) return 4;
  // Fallback by Type if no keyword matched
  if (type.includes('saving')) return 2;
  if (type.includes('investment')) return 4;
  if (type.includes('expense')) return 2;
  // If type missing and no keyword, insufficient data -> neutral
  if (!nameRaw) return null;
  // Neutral fallback: balanced
  return 3;
}

function getAssetSafetyScore(level: RiskLevelId | null): number | null {
  if (level == null) return null;
  return RISK_LEVEL_META[level].scoreMid;
}

function AssetRiskChip({ asset, level, showAmounts, onHover }: { asset: any; level: RiskLevelId; showAmounts: boolean; onHover: (e: React.MouseEvent, a: any, lvl: RiskLevelId) => void }) {
  const name = asset.Name || asset.name || '—';
  const val = Number(asset.CurrentValue ?? asset.currentValue ?? 0);
  return (
    <div className={`pyramid-asset-chip l${level}`} onMouseEnter={(e)=>onHover(e, asset, level)} onMouseLeave={(e)=>onHover(e as any, null as any, level)} tabIndex={0} role="button" aria-label={`${name} ${showAmounts ? formatCurrency(val) : '•••'} ${RISK_LEVEL_META[level].label}`}>
      <span className="pyramid-asset-chip-icon">
        {level===1 ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        : level===2 ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
        : level===3 ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
        : level===4 ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
        : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>}
      </span>
      <span className="pyramid-asset-chip-name" title={name}>{name}</span>
      <span className="pyramid-asset-chip-value">{showAmounts ? `${formatCompactValue(val)} ₫` : '•••'}</span>
    </div>
  );
}

function AssetRiskPyramid({ assets, showAmounts }: { assets: any[]; showAmounts: boolean }) {
  const { t } = useLanguage();
  const [activeLevel, setActiveLevel] = useState<RiskLevelId | null>(null);
  const [hoveredAsset, setHoveredAsset] = useState<{ asset: any; level: RiskLevelId; x: number; y: number } | null>(null);
  const [modalLevel, setModalLevel] = useState<RiskLevelId | null>(null);

  // Classify
  const groups = React.useMemo(() => {
    const g: Record<string, any[]> = { '1': [], '2': [], '3': [], '4': [], '5': [], unclassified: [] };
    (assets || []).forEach(a => {
      const lvl = getAssetRiskLevel(a);
      if (lvl == null) g.unclassified.push(a);
      else g[String(lvl)].push(a);
    });
    return g;
  }, [assets]);

  const grand = assets.reduce((s, a) => s + Number(a.CurrentValue ?? a.currentValue ?? 0), 0) || 0;
  const levelTotals: Record<number, number> = {};
  const levelCounts: Record<number, number> = {};
  for (let i=1;i<=5;i++){
    const list = groups[String(i)] || [];
    levelTotals[i] = list.reduce((s,a)=>s+Number(a.CurrentValue ?? a.currentValue ?? 0),0);
    levelCounts[i] = list.length;
  }
  const unclassifiedCount = groups.unclassified.length;
  const hasData = assets.length > 0 && grand > 0;
  const weightedSafety = hasData ? Math.round(( [1,2,3,4,5].reduce((sum,lvl)=> sum + (levelTotals[lvl]||0) * (RISK_LEVEL_META[lvl as RiskLevelId].scoreMid),0) / grand )) : null;
  const safetyLabel = weightedSafety==null ? null : weightedSafety>=80 ? t('Rất an toàn') : weightedSafety>=65 ? t('Khá an toàn') : weightedSafety>=45 ? t('Cân bằng') : weightedSafety>=25 ? t('Rủi ro cao') : t('Rủi ro rất cao');

  // Interpretation - neutral
  let interpretation = '';
  if (hasData) {
    const maxLvl = [1,2,3,4,5].reduce((a,b)=> levelTotals[a] > levelTotals[b] ? a : b, 1);
    const maxPct = grand>0 ? (levelTotals[maxLvl]/grand)*100 : 0;
    const meta = RISK_LEVEL_META[maxLvl as RiskLevelId];
    interpretation = t('Phần lớn tài sản đang nằm ở nhóm') + ` ${meta.label.toLowerCase()} (${maxPct.toFixed(1)}%).`;
    // Add secondary note about safety concentration
    const safePct = grand>0 ? ((levelTotals[1]+levelTotals[2])/grand)*100 : 0;
    if (safePct < 20 && weightedSafety!=null && weightedSafety < 45) {
      interpretation += ' ' + t('Tỷ trọng an toàn hiện ở mức thấp.');
    } else if (safePct > 50) {
      interpretation += ' ' + t('Cấu trúc thiên về an toàn.');
    }
  }

  const handleLevelClick = (lvl: RiskLevelId) => {
    setActiveLevel(prev => prev===lvl ? null : lvl);
    setModalLevel(lvl);
  };

  const handleAssetHover = (e: React.MouseEvent, asset: any, level: RiskLevelId) => {
    if (!asset) { setHoveredAsset(null); return; }
    setHoveredAsset({ asset, level, x: (e as any).clientX, y: (e as any).clientY });
  };

  // close tooltip on scroll
  useEffect(() => {
    const onScroll = () => setHoveredAsset(null);
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, []);

  const levelOrderTopToBottom: RiskLevelId[] = [5,4,3,2,1];
  const widthMap: Record<number,string> = {5:'w5',4:'w4',3:'w3',2:'w2',1:'w1'};

  return (
    <div className="pyramid-card" role="region" aria-label={t('Tháp Tài Sản')}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
        <div>
          <div className="pyramid-card-title">
            <span style={{ width:22, height:22, borderRadius:7, background:'rgba(124,92,255,0.12)', border:'1px solid rgba(124,92,255,0.16)', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'#9B7CFF' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </span>
            {t('THÁP TÀI SẢN')}
            <span style={{ fontSize:11, fontWeight:600, letterSpacing:'0.08em', color:'var(--text-muted)', textTransform:'uppercase' }}>• {t('Tháp rủi ro')}</span>
          </div>
          <div className="pyramid-card-sub">{t('Phân bổ tài sản theo mức độ an toàn — đáy càng rộng, nền tảng càng vững.')}</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <span style={{ fontSize:11, color:'var(--text-muted)', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)', padding:'5px 9px', borderRadius:999 }}>{assets.length} {t('tài sản')} • {hasData ? `${formatCompactValue(grand)} ₫` : '—'}</span>
          {unclassifiedCount>0 && <span style={{ fontSize:11, color:'#F5A623', background:'rgba(245,166,35,0.10)', border:'1px solid rgba(245,166,35,0.16)', padding:'5px 9px', borderRadius:999 }}>{unclassifiedCount} {t('chưa phân loại')}</span>}
        </div>
      </div>

      <div className="pyramid-layout">
        {/* LEFT: pyramid */}
        <div className="pyramid-visual">
          {assets.length===0 ? (
            <div className="asset-history-empty" style={{ minHeight:260 }}>
              <div className="asset-history-empty-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg></div>
              <div className="asset-history-empty-title">{t('Chưa có tài sản')}</div>
              <div className="asset-history-empty-desc">{t('Thêm tài sản để xem tháp phân bổ rủi ro.')}</div>
            </div>
          ) : (
            <div className="pyramid-stack" role="list" aria-label={t('Tháp rủi ro 5 tầng')}>
              {levelOrderTopToBottom.map((lvl) => {
                const meta = RISK_LEVEL_META[lvl];
                const list = groups[String(lvl)] || [];
                const tot = levelTotals[lvl] || 0;
                const pct = grand>0 ? (tot/grand)*100 : 0;
                const isActive = activeLevel===lvl;
                return (
                  <div
                    key={lvl}
                    role="listitem"
                    tabIndex={0}
                    aria-label={`${meta.label} ${pct.toFixed(1)}% ${list.length} ${t('tài sản')}`}
                    className={`pyramid-level trapezoid l${lvl} ${widthMap[lvl]} ${isActive?'active':''}`}
                    onClick={()=>handleLevelClick(lvl)}
                    onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' ') { e.preventDefault(); handleLevelClick(lvl); }}}
                    onMouseEnter={()=> setActiveLevel(lvl)}
                    onMouseLeave={()=> setActiveLevel(null)}
                    title={`${t('MỨC')} ${lvl} — ${meta.label} • ${list.length} ${t('tài sản')} • ${showAmounts?formatCurrency(tot)+' ₫':'•••'} • ${pct.toFixed(1)}%`}
                  >
                    <div className="pyramid-level-head">
                      <div className="pyramid-level-label">
                        <div className={`pyramid-level-title l${lvl}`}>
                          <span style={{ fontSize:14, lineHeight:1 }}>{meta.icon}</span>
                          {t('MỨC')} {lvl} • {meta.label}
                          <span style={{ fontWeight:400, opacity:0.85, letterSpacing:'0.02em', textTransform:'none', fontSize:11, color:'var(--text-muted)' }}>{meta.riskText}</span>
                        </div>
                        <div className="pyramid-level-sub">{list.length} {t('tài sản')} • {pct.toFixed(1)}% {t('tổng tài sản')}</div>
                      </div>
                      <div className="pyramid-level-amount">
                        <div className="pyramid-level-value">{showAmounts ? `${formatCompactValue(tot)} ₫` : '•••'}</div>
                        <div className="pyramid-level-pct">{list.length ? `${showAmounts?formatCurrency(tot):'•••'} ₫` : t('Trống')}</div>
                      </div>
                    </div>
                    {list.length>0 ? (
                      <div className="pyramid-assets">
                        {list.map((a:any)=> <AssetRiskChip key={a.Id||a.id||a.Name} asset={a} level={lvl} showAmounts={showAmounts} onHover={handleAssetHover} />)}
                      </div>
                    ) : (
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:8, fontStyle:'italic' }}>{t('Chưa có tài sản ở mức này')}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {/* subtle base glow */}
          <div aria-hidden style={{ marginTop:10, width:'96%', height:1, background:'linear-gradient(90deg, transparent, rgba(124,92,255,0.14), transparent)' }} />
        </div>

        {/* RIGHT: summary */}
        <div className="pyramid-summary">
          {weightedSafety!=null ? (
            <div className="pyramid-safety">
              <div className="pyramid-safety-ring">
                <svg width="84" height="84" viewBox="0 0 84 84">
                  <circle cx="42" cy="42" r="36" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                  <circle
                    cx="42" cy="42" r="36" fill="none"
                    stroke={weightedSafety>=65 ? '#18C995' : weightedSafety>=45 ? '#7C5CFF' : weightedSafety>=25 ? '#F5A623' : '#FF4D67'}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${(weightedSafety/100)*226.19} 226.19`}
                    transform="rotate(-90 42 42)"
                    style={{ transition:'stroke-dasharray 700ms ease-out' }}
                  />
                </svg>
                <div className="pyramid-safety-center">
                  <div className="pyramid-safety-score">{weightedSafety}</div>
                  <div className="pyramid-safety-max">/100</div>
                </div>
              </div>
              <div style={{ minWidth:0, flex:1 }}>
                <div className="pyramid-safety-label">{t('Chỉ số an toàn tài sản')}</div>
                <div className="pyramid-safety-status" style={{ color: weightedSafety>=65 ? '#18C995' : weightedSafety>=45 ? '#9B7CFF' : weightedSafety>=25 ? '#F5A623' : '#FF4D67' }}>{safetyLabel}</div>
                <div className="pyramid-safety-desc">{t('Chỉ báo cấu trúc danh mục, không phải dự báo lợi nhuận.')}</div>
                <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
                  <span style={{ fontSize:10, padding:'3px 7px', borderRadius:999, background: weightedSafety>=80 ? 'rgba(24,201,149,0.10)' : weightedSafety>=65 ? 'rgba(24,201,149,0.10)' : weightedSafety>=45 ? 'rgba(124,92,255,0.10)' : 'rgba(255,77,103,0.10)', color: weightedSafety>=65 ? '#18C995' : weightedSafety>=45 ? '#9B7CFF' : '#FF4D67', border:'1px solid currentColor', opacity:0.9 }}>{weightedSafety>=80?t('Rất an toàn'):weightedSafety>=65?t('Khá an toàn'):weightedSafety>=45?t('Cân bằng'):weightedSafety>=25?t('Rủi ro cao'):t('Rủi ro rất cao')}</span>
                  <span style={{ fontSize:11, color:'var(--text-muted)' }}>{assets.length} {t('tài sản')} • {hasData? `${((levelTotals[1]+levelTotals[2])/grand*100).toFixed(1)}% ${t('an toàn')}`:''}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="pyramid-safety" style={{ justifyContent:'center', textAlign:'center' }}>
              <div style={{ fontSize:13, color:'var(--text-muted)' }}>{t('Chưa đủ dữ liệu để tính chỉ số an toàn')}</div>
            </div>
          )}

          <div className="pyramid-dist">
            <div className="pyramid-dist-title">{t('Cấu trúc tài sản')}</div>
            {[1,2,3,4,5].map(lvl=>{
              const meta = RISK_LEVEL_META[lvl as RiskLevelId];
              const tot = levelTotals[lvl]||0;
              const pctVal = grand>0 ? (tot/grand)*100 : 0;
              return (
                <div key={lvl} className="pyramid-dist-row" style={{ borderLeft:`3px solid ${meta.color}` }}>
                  <span className="pyramid-dist-dot" style={{ background:meta.color, boxShadow:`0 0 8px ${meta.color}66` }} />
                  <span className="pyramid-dist-name">{meta.label}<span style={{ fontWeight:400, color:'var(--text-muted)', marginLeft:6, fontSize:11 }}>{meta.riskText}</span></span>
                  <span className="pyramid-dist-bar"><span className="pyramid-dist-fill" style={{ width:`${pctVal}%`, background: meta.color }} /></span>
                  <span className="pyramid-dist-pct">{pctVal.toFixed(1)}%</span>
                  <span className="pyramid-dist-val">{showAmounts? `${formatCompactValue(tot)} ₫`:'•••'}</span>
                </div>
              );
            })}
          </div>

          {hasData && interpretation && (
            <div className="pyramid-interpret"><b>{t('Nhận xét')}:</b> {interpretation} <span style={{ color:'var(--text-muted)', fontSize:11 }}></span></div>
          )}

          <div style={{ fontSize:11, color:'var(--text-muted)', lineHeight:1.5, borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:10 }}>
            {t('Tháp là công cụ trực quan, không phải khuyến nghị đầu tư.')}
            <span style={{ display:'block', marginTop:4, color:'var(--text-faint)', fontSize:10 }}>{t('Nhấn vào từng tầng để xem chi tiết • Di chuột vào tài sản để xem thông tin')}</span>
          </div>
        </div>
      </div>

      {/* Level detail modal */}
      {modalLevel!=null && (
        <div className="pyramid-modal-overlay" onClick={()=>setModalLevel(null)}>
          <div className="pyramid-modal" onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${RISK_LEVEL_META[modalLevel].label}`}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
              <div>
                <div style={{ fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text-muted)', fontWeight:700 }}>{t('MỨC')} {modalLevel} — {RISK_LEVEL_META[modalLevel].label}</div>
                <div style={{ fontSize:13, color:'var(--text-secondary)', marginTop:2 }}>{RISK_LEVEL_META[modalLevel].riskText} • {RISK_LEVEL_META[modalLevel].desc}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:6, fontFamily:'var(--font-mono)' }}>
                  {levelCounts[modalLevel]||0} {t('tài sản')} • {showAmounts?formatCurrency(levelTotals[modalLevel]||0)+' ₫':'•••'} • {grand>0? ((levelTotals[modalLevel]||0)/grand*100).toFixed(1):'0'}% {t('tổng tài sản')}
                </div>
              </div>
              <button onClick={()=>setModalLevel(null)} style={{ width:32, height:32, borderRadius:9, border:'1px solid var(--border)', background:'rgba(255,255,255,0.04)', color:'var(--text-muted)', cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ marginTop:14, display:'flex', flexDirection:'column', gap:8, maxHeight:360, overflowY:'auto' }}>
              {(groups[String(modalLevel)]||[]).length===0 ? (
                <div style={{ textAlign:'center', padding:24, color:'var(--text-muted)', fontSize:13 }}>{t('Chưa có tài sản ở mức này')}</div>
              ) : (
                (groups[String(modalLevel)]||[]).map((a:any)=>{
                  const v = Number(a.CurrentValue ?? a.currentValue ?? 0);
                  const alloc = grand>0 ? (v/grand)*100 : 0;
                  const safety = getAssetSafetyScore(modalLevel);
                  return (
                    <div key={a.Id||a.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'10px 12px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                        <span className="pyramid-asset-chip-icon" style={{ width:28, height:28, borderRadius:8, background: RISK_LEVEL_META[modalLevel].bg, borderColor: RISK_LEVEL_META[modalLevel].color+'33', color: RISK_LEVEL_META[modalLevel].color, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/></svg>
                        </span>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontWeight:600, fontSize:13, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:180 }}>{a.Name||a.name}</div>
                          <div style={{ fontSize:11, color:'var(--text-muted)' }}>{a.Type||a.type||'—'} • {safety? `${t('An toàn')} ${safety}/100`:''}</div>
                        </div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontFamily:'var(--font-mono)', fontWeight:650, fontSize:13 }}>{showAmounts?formatCurrency(v)+' ₫':'•••'}</div>
                        <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{alloc.toFixed(1)}% {t('tài sản')}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Asset hover tooltip */}
      {hoveredAsset && (
        <div className="pyramid-asset-tooltip" style={{ left: Math.min(window.innerWidth-280, hoveredAsset.x+14), top: Math.min(window.innerHeight-160, hoveredAsset.y+14) }}>
          <div className="pyramid-asset-tooltip-title">{hoveredAsset.asset.Name||hoveredAsset.asset.name}</div>
          <div className="pyramid-asset-tooltip-row"><span>{t('Loại')}</span><b>{hoveredAsset.asset.Type||hoveredAsset.asset.type||'—'}</b></div>
          <div className="pyramid-asset-tooltip-row"><span>{t('Giá trị hiện tại')}</span><b>{showAmounts? formatCurrency(Number(hoveredAsset.asset.CurrentValue??hoveredAsset.asset.currentValue??0))+' ₫':'•••'}</b></div>
          <div className="pyramid-asset-tooltip-row"><span>{t('Phân bổ')}</span><b>{grand>0? ((Number(hoveredAsset.asset.CurrentValue??hoveredAsset.asset.currentValue??0)/grand)*100).toFixed(1):'0'}%</b></div>
          <div className="pyramid-asset-tooltip-row"><span>{t('Rủi ro')}</span><b style={{ color: RISK_LEVEL_META[hoveredAsset.level].color }}>{RISK_LEVEL_META[hoveredAsset.level].label} • {RISK_LEVEL_META[hoveredAsset.level].riskText}</b></div>
          {getAssetSafetyScore(hoveredAsset.level)!=null && <div className="pyramid-asset-tooltip-row"><span>{t('Điểm an toàn')}</span><b>{getAssetSafetyScore(hoveredAsset.level)}/100</b></div>}
        </div>
      )}
    </div>
  );
}

// 3. DASHBOARD COMPONENT — Premium Fintech Command Center
function DashboardPage({ 
  totalCurrent, 
  totalInitial, 
  totalInterest, 
  totalInterestRatio,
  totalSavingAssets,
  totalInvestmentAssets,
  assets,
  goals,
  debts,
}: { 
  totalCurrent: number; 
  totalInitial: number; 
  totalInterest: number; 
  totalInterestRatio: number;
  totalSavingAssets: number;
  totalInvestmentAssets: number;
  assets: any[];
  goals: any[];
  debts?: any[];
}) {
  const { t } = useLanguage();
  const [chartMode, setChartMode] = useState<'overview' | 'detail'>('overview');
  const [showAmounts, setShowAmounts] = useState(true);

  // Goal derived
  const activeGoal = goals.find(g => g.Status === 'Processing');
  const upcomingGoal = goals.find(g => g.Status === 'NotStarted');
  const displayGoal = activeGoal || upcomingGoal || goals[0] || null;
  const goalPct = displayGoal && displayGoal.TargetAmount > 0 ? Math.min(100, Math.round((totalCurrent / displayGoal.TargetAmount) * 100)) : 0;
  const goalDue = displayGoal ? new Date(displayGoal.DueDate) : null;
  const now = new Date();
  const daysLeft = goalDue ? Math.max(0, Math.ceil((goalDue.getTime() - now.getTime()) / (1000*60*60*24))) : 0;
  const cashAndSavings = totalSavingAssets;
  const invested = totalInvestmentAssets;
  const isPositive = totalInterest >= 0;

  // Health strip derived — only from available data
  const totalAssets = totalCurrent || 1;
  const investmentRatio = totalAssets > 0 ? (invested / totalAssets) * 100 : 0;
  const savingsRatio = totalAssets > 0 ? (cashAndSavings / totalAssets) * 100 : 0;
  const roi = totalInterestRatio;
  const outstandingDebt = (debts || []).reduce((s, d) => s + (d.RemainingAmount ?? (d.TotalDebt - (d.PaidAmount || 0))), 0);
  const debtRatio = totalCurrent > 0 ? (outstandingDebt / totalCurrent) * 100 : 0;
  const hasDebtData = (debts || []).length > 0;

  // Donut - spec: Investment #18C995, Savings #7C5CFF, Cash/blue #4D8DFF, Other #667085
  const getDonutColor = (nameOrType: string, idx: number) => {
    if (nameOrType === t('Đầu tư') || nameOrType === 'Investment' || nameOrType === t('Tiết kiệm') && false) return '#18C995';
    // overview mapping: Tiết kiệm violet, Đầu tư green
    // detail mapping by Type
    const typeMap: Record<string,string> = { Investment: '#18C995', Saving: '#7C5CFF', Expense: '#4D8DFF', Cash: '#4D8DFF' };
    if (typeMap[nameOrType]) return typeMap[nameOrType];
    const fallback = ['#7C5CFF', '#18C995', '#4D8DFF', '#9B7CFF', '#667085'];
    return fallback[idx % fallback.length];
  };
  const donutData = chartMode === 'overview'
    ? [
        { name: t('Tiết kiệm'), value: totalSavingAssets, _type: 'Saving' },
        { name: t('Đầu tư'), value: totalInvestmentAssets, _type: 'Investment' }
      ]
    : (() => {
        const sortedAssets = [...assets].sort((a,b) => b.CurrentValue - a.CurrentValue);
        const topAssets = sortedAssets.slice(0, 4);
        const otherSum = sortedAssets.slice(4).reduce((sum, a) => sum + a.CurrentValue, 0);
        const data = topAssets.map(a => ({ name: a.Name, value: a.CurrentValue, _type: a.Type || 'Saving' }));
        if (otherSum > 0) data.push({ name: t('Khác'), value: otherSum, _type: 'Other' });
        return data.filter(d=>d.value>0);
      })();
  const filteredDonutData = donutData.filter(d=>d.value>0);
  const effectiveDonutData = filteredDonutData.length ? filteredDonutData : [{ name: t('Chưa có dữ liệu'), value: 1, _type: 'Other' }];
  const totalDonutValue = effectiveDonutData.reduce((sum, d) => sum + d.value, 0) || 1;
  let accumulatedPercent = 0;
  const segments = effectiveDonutData.map((d: any, idx: number) => {
    const percent = d.value / totalDonutValue;
    const strokeDash = `${percent * 314.16} 314.16`;
    const strokeOffset = -accumulatedPercent * 314.16;
    accumulatedPercent += percent;
    const col = d._type ? getDonutColor(d._type, idx) : getDonutColor(d.name, idx);
    // overview hard mapping
    const overviewColor = chartMode==='overview' ? (d.name===t('Tiết kiệm') ? '#7C5CFF' : '#18C995') : col;
    return { ...d, strokeDash, strokeOffset, color: overviewColor, pct: percent*100 };
  });

  // Sparkline path: simple trend indication - spec positive #18C995, negative #FF4D67
  const sparkPathPositive = "M2 28 L14 22 L26 24 L38 18 L50 16 L62 10 L80 8 L98 6";
  const sparkPathNegative = "M2 8 L14 10 L26 14 L38 20 L50 22 L62 26 L80 28 L98 30";
  const sparkColor = isPositive ? "#18C995" : "#FF4D67";

  return (
    <div className="dash-ambient">
      {/* Header */}
      <div className="dash-title-row">
        <div>
          <h1 className="dash-title">{t('Bảng Tổng Quan Tài Chính')}</h1>
          <p className="dash-subtitle">{t('Trung tâm chỉ huy tài sản — theo dõi tài sản ròng, dòng tiền và mục tiêu trong một cái nhìn.')}</p>
        </div>
        <div className="dash-header-actions">
          <button onClick={() => setShowAmounts(!showAmounts)} className="hero-eye" title={showAmounts ? t('Ẩn số tiền') : t('Hiện số tiền')} aria-label={showAmounts ? t('Ẩn số tiền') : t('Hiện số tiền')}>
            {showAmounts ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      {/* HERO */}
      <div className="hero-grid">
        {/* Net Worth Hero */}
        <div className="hero-card">
          <div>
            <div className="hero-top">
              <div className="hero-label"><span className="hero-label-dot" />{t('Tài sản ròng')} • Net Worth</div>
              <span style={{ fontSize:'11px', color:'var(--text-muted)', fontWeight:600, letterSpacing:'0.02em' }}>{t('Cập nhật')} 26/05/2026</span>
            </div>
            <div className="hero-value" style={{ fontVariantNumeric:'tabular-nums' }}>
              {showAmounts ? `${formatCurrency(totalCurrent)} ₫` : '•••••••••• ₫'}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <span className={`hero-delta ${isPositive ? 'positive' : 'negative'}`}>
                <span style={{ fontSize:'10px' }}>{isPositive ? '▲' : '▼'}</span>
                {showAmounts ? `${totalInterest >=0 ? '+' : ''}${formatCurrency(totalInterest)} ₫` : '•••••'}
                <span style={{ opacity:0.9, fontWeight:600 }}>({isPositive ? '+' : ''}{totalInterestRatio.toFixed(2)}%)</span>
              </span>
              <span style={{ fontSize:'11px', color:'var(--text-muted)', fontWeight:500 }}>
                {isPositive ? t('Tăng trưởng so với vốn gốc') : t('Giảm so với vốn gốc')}
              </span>
            </div>

            <div className="hero-stats">
              <div className="hero-stat">
                <div className="hero-stat-label">{t('Vốn gốc')}</div>
                <div className="hero-stat-value">{showAmounts ? `${formatCurrency(totalInitial)} ₫` : '•••••••'}</div>
                <div className="hero-stat-sub">{t('Đã đầu tư ban đầu')}</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-label">{t('Đã đầu tư')}</div>
                <div className="hero-stat-value" style={{ color:'#9B7CFF' }}>{showAmounts ? `${formatCompactValue(invested)} ₫` : '••••'}</div>
                <div className="hero-stat-sub">{investmentRatio.toFixed(1)}% {t('tài sản')}</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-label">{t('Tiền mặt & Tiết kiệm')}</div>
                <div className="hero-stat-value" style={{ color:'var(--success)' }}>{showAmounts ? `${formatCompactValue(cashAndSavings)} ₫` : '••••'}</div>
                <div className="hero-stat-sub">{savingsRatio.toFixed(1)}% {t('tài sản')}</div>
              </div>
            </div>
          </div>

          <div className="hero-sparkline" aria-hidden>
            <div className="hero-sparkline-head">
              <span className="hero-sparkline-title">{t('Xu hướng tài sản')}</span>
              <span style={{ color: sparkColor, fontWeight:700, fontFamily:'var(--font-mono)', fontSize:'11px' }}>{isPositive ? t('Tăng') : t('Giảm')} • {totalInterestRatio.toFixed(2)}%</span>
            </div>
            <svg viewBox="0 0 100 32" className="hero-trend-line" preserveAspectRatio="none">
              <defs>
                <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sparkColor} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <path d={`${isPositive ? sparkPathPositive : sparkPathNegative} L98 32 L2 32 Z`} fill="url(#heroGrad)" />
              <path d={isPositive ? sparkPathPositive : sparkPathNegative} fill="none" stroke={sparkColor} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="98" cy={isPositive ? 6 : 30} r="3.2" fill={sparkColor} stroke="#080B14" strokeWidth={1.6} />
            </svg>
          </div>
        </div>

        {/* Right mini — Goal quick + summary */}
        <div className="hero-right-mini">
          <div className="hero-mini-card" style={{ background: 'linear-gradient(180deg, #101522 0%, #0F1320 100%)' }}>
            <div className="mini-label" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span>{t('Mục tiêu gần nhất')}</span>
              {displayGoal && <span style={{ fontSize:'10px', padding:'3px 7px', borderRadius:999, background: displayGoal.Status==='Processing' ? 'rgba(124,92,255,0.14)' : 'rgba(255,255,255,0.06)', color: displayGoal.Status==='Processing' ? '#C4B5FD' : 'var(--text-muted)', border:'1px solid var(--border-subtle)', letterSpacing:'0.02em' }}>{displayGoal.Status==='Processing' ? t('Đang thực hiện') : displayGoal.Status==='NotStarted' ? t('Sắp tới') : displayGoal.Status}</span>}
            </div>
            {!displayGoal ? (
              <>
                <div className="mini-value" style={{ fontSize:'16px', color:'var(--text-muted)' }}>{t('Chưa có mục tiêu')}</div>
                <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:6 }}>{t('Tạo mục tiêu để theo dõi tiến độ')}</div>
              </>
            ) : (
              <>
                <div className="mini-value" style={{ fontSize:'15px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{displayGoal.Name}</div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', color:'var(--text-muted)', marginTop:8, fontFamily:'var(--font-mono)' }}>
                  <span>{showAmounts ? formatCompactValue(totalCurrent) : '•••'} / {showAmounts ? formatCompactValue(displayGoal.TargetAmount) : '•••'}</span>
                  <span style={{ color: goalPct>=100 ? 'var(--success)' : goalPct>=50 ? '#9B7CFF' : 'var(--warning)', fontWeight:700 }}>{goalPct}%</span>
                </div>
                <div className="kpi-progress-track" style={{ marginTop:8 }}>
                  <div className="kpi-progress-fill" style={{ width:`${goalPct}%`, background: goalPct>=100 ? 'var(--success)' : goalPct>=50 ? 'linear-gradient(90deg,#7C5CFF,#9B7CFF)' : 'var(--warning)' }} />
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontSize:'11px', color:'var(--text-muted)' }}>
                  <span>{daysLeft>0 ? `${daysLeft} ${t('ngày còn lại')}` : t('Đã hết hạn')}</span>
                  <span style={{ fontFamily:'var(--font-mono)', fontWeight:600 }}>{showAmounts ? formatCurrency(displayGoal.TargetAmount) + ' ₫' : '•••••'}</span>
                </div>
              </>
            )}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div className="hero-mini-card" style={{ minHeight: 88 }}>
              <div className="mini-label">{t('Tài sản')}</div>
              <div className="mini-value" style={{ fontSize:'16px' }}>{assets.length}</div>
              <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:2 }}>{t('danh mục')}</div>
            </div>
            <div className="hero-mini-card" style={{ minHeight: 88 }}>
              <div className="mini-label">{t('Hiệu suất')}</div>
              <div className="mini-value" style={{ fontSize:'16px', color: isPositive ? 'var(--success)' : 'var(--danger)' }}>{isPositive ? '+' : ''}{totalInterestRatio.toFixed(2)}%</div>
              <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:2 }}>{t('so với vốn gốc')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI 4 cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-head">
            <span className="kpi-label">{t('Vốn gốc')}</span>
            <span className="kpi-icon primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            </span>
          </div>
          <div className="kpi-value">{showAmounts ? `${formatCurrency(totalInitial)} ₫` : '••••••••'}</div>
          <div className="kpi-sub"><span style={{ width:6, height:6, borderRadius:'50%', background:'#6366F1', display:'inline-block' }} />{t('Tổng vốn đã đầu tư')}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-head">
            <span className="kpi-label">{t('Đã đầu tư')}</span>
            <span className="kpi-icon violet">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 6-8"/></svg>
            </span>
          </div>
          <div className="kpi-value" style={{ color:'#9B7CFF' }}>{showAmounts ? `${formatCompactValue(invested)} ₫` : '••••'}</div>
          <div className="kpi-sub">
            <span className="kpi-badge neu">{investmentRatio.toFixed(1)}%</span> {t('của tài sản ròng')}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-head">
            <span className="kpi-label">{t('Tiền mặt & Tiết kiệm')}</span>
            <span className="kpi-icon success">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
            </span>
          </div>
          <div className="kpi-value" style={{ color:'var(--success)' }}>{showAmounts ? `${formatCompactValue(cashAndSavings)} ₫` : '••••'}</div>
          <div className="kpi-sub">
            <span className="kpi-badge neu">{savingsRatio.toFixed(1)}%</span> {t('của tài sản ròng')}
          </div>
        </div>

        <div className="kpi-card" style={{ borderColor: displayGoal && goalPct>=50 ? 'rgba(124,92,255,0.18)' : undefined }}>
          <div className="kpi-head">
            <span className="kpi-label">{t('Mục tiêu')}</span>
            <span className="kpi-icon warning">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22 12 18.5 7 22l1.523-9.11"/></svg>
            </span>
          </div>
          {!displayGoal ? (
            <>
              <div className="kpi-value" style={{ fontSize:'16px', color:'var(--text-muted)' }}>{t('Chưa thiết lập')}</div>
              <div className="kpi-sub">{t('Tạo mục tiêu để theo dõi')}</div>
            </>
          ) : (
            <>
              <div className="kpi-value" style={{ fontSize:'18px' }}>{goalPct}%</div>
              <div className="kpi-progress-track"><div className="kpi-progress-fill" style={{ width:`${goalPct}%`, background: goalPct>=100 ? 'var(--success)' : goalPct>=50 ? 'var(--primary)' : 'var(--warning)' }} /></div>
              <div className="kpi-progress-meta"><span>{displayGoal.Name}</span><span>{daysLeft>0 ? `${daysLeft}d` : '—'}</span></div>
            </>
          )}
        </div>
      </div>

      {/* Health strip - derived metrics, gracefully omit if unavailable */}
      <div className="health-strip">
        <div className="health-item">
          <div className="health-top"><span className="health-label">ROI</span><span className="health-icon" style={{ color: isPositive ? 'var(--success)' : 'var(--danger)' }}>{isPositive ? '↗' : '↘'}</span></div>
          <div className="health-value" style={{ color: isPositive ? 'var(--success)' : 'var(--danger)' }}>{isPositive ? '+' : ''}{roi.toFixed(2)}%</div>
          <div className="health-delta pos" style={{ color: isPositive ? 'var(--success)' : 'var(--danger)' }}>{isPositive ? t('Tăng trưởng') : t('Sụt giảm')} • {showAmounts ? `${formatCurrency(totalInterest)} ₫` : '••••'}</div>
          <div className="health-desc">{t('Lợi nhuận so với vốn gốc')}</div>
        </div>
        <div className="health-item">
          <div className="health-top"><span className="health-label">{t('Tiết kiệm')}</span><span className="health-icon">◐</span></div>
          <div className="health-value">{savingsRatio.toFixed(1)}%</div>
          <div className="health-delta neu">{showAmounts ? formatCompactValue(cashAndSavings) : '••••'} ₫ • {t('của tài sản')}</div>
          <div className="health-desc">{t('Tỷ trọng tiền mặt & tiết kiệm')}</div>
        </div>
        <div className="health-item">
          <div className="health-top"><span className="health-label">{t('Đầu tư')}</span><span className="health-icon">⬢</span></div>
          <div className="health-value" style={{ color:'var(--primary-light)' }}>{investmentRatio.toFixed(1)}%</div>
          <div className="health-delta neu">{showAmounts ? formatCompactValue(invested) : '••••'} ₫ • {t('của tài sản')}</div>
          <div className="health-desc">{t('Tỷ trọng danh mục đầu tư')}</div>
        </div>
        <div className="health-item">
          <div className="health-top"><span className="health-label">{t('Nợ / Tài sản')}</span><span className="health-icon" style={{ color: hasDebtData && debtRatio>30 ? 'var(--warning)' : 'var(--text-muted)' }}>◎</span></div>
          {hasDebtData ? (
            <>
              <div className="health-value" style={{ color: debtRatio>30 ? 'var(--warning)' : 'var(--text-primary)' }}>{debtRatio.toFixed(1)}%</div>
              <div className={`health-delta ${debtRatio>30 ? 'neg' : 'pos'}`}>{debtRatio<=18 ? t('Lành mạnh') : debtRatio<=35 ? t('Cần chú ý') : t('Cao')} • {showAmounts ? formatCompactValue(outstandingDebt) : '••••'} ₫</div>
              <div className="health-desc">{debtRatio<=18 ? t('Mức nợ an toàn') : t('Theo dõi khả năng trả nợ')}</div>
            </>
          ) : (
            <>
              <div className="health-value" style={{ color:'var(--text-muted)' }}>—</div>
              <div className="health-delta neu">{t('Chưa có dữ liệu nợ')}</div>
              <div className="health-desc">{t('Thêm khoản nợ để theo dõi')}</div>
            </>
          )}
        </div>
      </div>

      {/* THÁP TÀI SẢN — Asset Risk Pyramid */}
      <AssetRiskPyramid assets={assets} showAmounts={showAmounts} />

      {/* Analytics 8/4 — Growth (premium) + Allocation */}
      <div className="analytics-grid">
        <CashFlowGrowthChart userId={getLoggedUser()?.id || 'u1'} />

        {/* Allocation */}
        <div className="chart-card">
          <div className="chart-card-head">
            <div>
              <div className="chart-card-title">{t('Phân bổ tài sản')}</div>
              <div className="chart-card-sub">{chartMode==='overview' ? t('Tổng quan theo nhóm') : t('Chi tiết từng tài sản')}</div>
            </div>
            <div className="chart-controls" role="tablist" aria-label={t('Chế độ phân bổ')}>
              <button role="tab" aria-selected={chartMode==='overview'} onClick={() => setChartMode('overview')} className={`chart-ctrl-btn ${chartMode==='overview'?'active':''}`}>{t('Tổng quan')}</button>
              <button role="tab" aria-selected={chartMode==='detail'} onClick={() => setChartMode('detail')} className={`chart-ctrl-btn ${chartMode==='detail'?'active':''}`}>{t('Chi tiết')}</button>
            </div>
          </div>

          <div className="alloc-body">
            <div className="alloc-center">
              <svg className="donut-svg" viewBox="0 0 120 120" role="img" aria-label={t('Biểu đồ phân bổ tài sản')}>
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="17" />
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
                  >
                    <title>{`${seg.name}: ${seg.pct.toFixed(1)}%`}</title>
                  </circle>
                ))}
                <text x="60" y="58" className="donut-text">
                  {showAmounts ? formatCompactValue(totalCurrent) : '••••'}
                </text>
                <text x="60" y="72" className="donut-label">
                  {t('Tài sản ròng')}
                </text>
              </svg>
            </div>
            <div className="alloc-legend">
              {segments.map((seg, idx) => (
                <div key={idx} className="alloc-legend-item">
                  <span className="alloc-legend-dot" style={{ backgroundColor: seg.color, boxShadow: `0 0 0 4px ${seg.color}18` }} />
                  <span className="alloc-legend-name">{seg.name}</span>
                  <span className="alloc-legend-pct">{seg.pct.toFixed(1)}%</span>
                  <span className="alloc-legend-val">{showAmounts ? formatCompactValue(seg.value) : '•••'} ₫</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop:12, display:'flex', justifyContent:'space-between', fontSize:'11px', color:'var(--text-muted)', borderTop:'1px solid var(--border)', paddingTop:12 }}>
            <span>{t('Tổng')}: <strong style={{ color:'var(--text-primary)', fontFamily:'var(--font-mono)' }}>{showAmounts ? formatCurrency(totalCurrent) : '••••'} ₫</strong></span>
            <span>{effectiveDonutData.length} {t('nhóm')}</span>
          </div>
        </div>
      </div>

      {/* Goal detailed */}
      <div className="goal-card">
        <div className="goal-head">
          <span className="goal-title">{t('Mục tiêu')} {displayGoal ? `• ${displayGoal.Name}` : ''}</span>
          {displayGoal && <span className="goal-badge">{goalPct}% {t('hoàn thành')}</span>}
        </div>
        {!displayGoal ? (
          <div className="goal-empty">
            <div style={{ fontSize:28, marginBottom:8, opacity:0.9 }}>🎯</div>
            <div style={{ fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>{t('Chưa có mục tiêu nào')}</div>
            <div>{t('Tạo mục tiêu tài chính để hệ thống tính toán tiến độ và lộ trình hàng tháng cho bạn.')}</div>
          </div>
        ) : (
          <>
            <div className="goal-grid">
              <div>
                <div className="goal-metric-label">{t('Mục tiêu')}</div>
                <div className="goal-metric-value">{showAmounts ? formatCurrency(displayGoal.TargetAmount) : '••••••'} ₫</div>
                <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:2 }}>{displayGoal.DueDate ? `${t('Hạn')} ${new Date(displayGoal.DueDate).toLocaleDateString('vi-VN')}` : ''}</div>
              </div>
              <div>
                <div className="goal-metric-label">{t('Hiện tại')}</div>
                <div className="goal-metric-value" style={{ color: goalPct>=100 ? 'var(--success)' : 'var(--text-primary)' }}>{showAmounts ? formatCurrency(totalCurrent) : '••••••'} ₫</div>
                <div style={{ fontSize:'11px', color: isPositive ? 'var(--success)' : 'var(--danger)', marginTop:2, fontWeight:600 }}>{isPositive ? '+' : ''}{formatCurrency(totalInterest)} ₫ {t('so với vốn gốc')}</div>
              </div>
            </div>
            <div className="goal-progress">
              <div className="goal-progress-head"><span>{t('Tiến độ')}</span><span style={{ fontFamily:'var(--font-mono)', fontVariantNumeric:'tabular-nums', fontWeight:750, color: goalPct>=100 ? 'var(--success)' : 'var(--primary-light)' }}>{goalPct}%</span></div>
              <div className="goal-progress-track"><div className="goal-progress-fill" style={{ width:`${goalPct}%` }} /></div>
            </div>
            <div className="goal-meta-row">
              <span className="goal-meta-chip">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                {daysLeft>0 ? `${daysLeft} ${t('ngày còn lại')}` : goalDue && goalDue < now ? t('Đã hết hạn') : '—'}
              </span>
              <span className="goal-meta-chip">
                {(() => {
                  if (!goalDue || goalPct>=100) return <span>✓ {t('Đã đạt hoặc vượt mục tiêu')}</span>;
                  const monthsLeft = Math.max(1, Math.ceil(daysLeft/30));
                  const remaining = Math.max(0, displayGoal.TargetAmount - totalCurrent);
                  const perMonth = remaining / monthsLeft;
                  return <span>{t('Cần')} ~{showAmounts ? formatCompactValue(perMonth) : '•••'} ₫/{t('tháng')}</span>;
                })()}
              </span>
              <span className="goal-meta-chip" style={{ color: displayGoal.Status==='Processing' ? 'var(--primary-light)' : 'var(--text-muted)' }}>
                {displayGoal.Status==='Processing' ? `● ${t('Đang thực hiện')}` : displayGoal.Status==='NotStarted' ? `○ ${t('Chưa bắt đầu')}` : displayGoal.Status}
              </span>
            </div>
          </>
        )}
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
    <div className="chart-card">
      <div className="chart-card-head">
        <div>
          <div className="chart-card-title">{t('Tăng trưởng tài sản')}</div>
          <div className="chart-card-sub">{t('Theo dõi giá trị tài sản theo thời gian')} • {mode === 'yearly' ? t('Tổng giá trị qua các năm') : mode === 'monthly' ? `${t('Theo tháng')} ${selectedYear}` : t('12 tháng gần nhất')}</div>
        </div>
        <div className="chart-controls" role="tablist" aria-label={t('Chế độ thời gian')}>
          {([['yearly', t('Theo năm')], ['monthly', t('Theo tháng')], ['last12months', t('12 tháng')]] as const).map(([key, label]) => (
            <button key={key} role="tab" aria-selected={mode===key} onClick={() => handleModeChange(key as any)} className={`chart-ctrl-btn ${mode===key ? 'active' : ''}`}>{label}</button>
          ))}
          {mode === 'monthly' && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="chart-select"
              aria-label={t('Chọn năm')}
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

      {loading ? (
        <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ border: '3px solid rgba(124,92,255,0.12)', borderTop: '3px solid #7C5CFF', borderRadius: '50%', width: '32px', height: '32px', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : chartData.length === 0 ? (
        <div style={{ height: '320px', display: 'flex', flexDirection:'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px', gap:10, textAlign:'center', padding:20 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'rgba(124,92,255,0.10)', border:'1px solid rgba(124,92,255,0.16)', display:'flex', alignItems:'center', justifyContent:'center', color:'#A78BFA' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 6-8"/></svg>
          </div>
          <div>{t('Chưa có dữ liệu lịch sử. Hãy lưu snapshot tài sản để bắt đầu theo dõi.')}</div>
        </div>
      ) : (
        <div className="chart-container" style={{ height: 320 }}>
          <svg style={{ position: 'absolute', width: 0, height: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7C5CFF" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#7C5CFF" stopOpacity={0} />
              </linearGradient>
            </defs>
          </svg>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top: 12, right: 10, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C5CFF" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#7C5CFF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis 
                dataKey="period" 
                tick={{ fill: '#667085', fontSize: 11, fontWeight: 500 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                tickLine={false}
                dy={8}
              />
              <YAxis 
                tickFormatter={formatValue}
                tick={{ fill: '#667085', fontSize: 11, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                width={54}
              />
              <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(124,92,255,0.26)', strokeDasharray: '4 4' }} />
              <Area 
                type="monotone" 
                dataKey="initialValue" 
                stroke="#F5A623" 
                strokeWidth={1.6}
                strokeDasharray="5 4"
                fill="none"
                dot={false}
                activeDot={{ r: 4, fill: '#F5A623', stroke: '#080B14', strokeWidth: 2 }}
                animationDuration={700}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#7C5CFF" 
                strokeWidth={2.6}
                fill={`url(#${gradientId})`}
                dot={{ r: 3.5, fill: '#7C5CFF', stroke: '#080B14', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#7C5CFF', stroke: '#fff', strokeWidth: 2 }}
                animationDuration={700}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="chart-legend-row">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="chart-legend-dot" style={{ background: '#7C5CFF' }} />
              {t('Giá trị hiện tại')}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '14px', height: '0', borderTop: '2px dashed #F5A623', display: 'inline-block' }} />
              {t('Giá trị gốc')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// 3. ASSETS LIST COMPONENT — Premium Personal Wealth Command Center
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
  onRestore,
  onDeleteHistory,
  onUpdateTime,
  onReorder
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
  onRestore: any;
  onDeleteHistory: any;
  onUpdateTime: (historyId: string, recordedAt: string) => Promise<any>;
  onReorder: (orderedList: any[]) => Promise<void>;
}) {
  const { t } = useLanguage();
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'Saving' | 'Investment' | 'Expense'>('all');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const sortByOrder = (list: any[]) => [...list].sort((a, b) => (a.SortOrder ?? 0) - (b.SortOrder ?? 0));
  const allSaving = sortByOrder(assets.filter(a => a.Type === 'Saving'));
  const allInvestment = sortByOrder(assets.filter(a => a.Type === 'Investment'));
  const allExpense = sortByOrder(assets.filter(a => a.Type === 'Expense'));

  // Health insight derived safely
  const increasing = assets.filter(a => (a.CurrentValue - a.InitialValue) > 0).length;
  const decreasing = assets.filter(a => (a.CurrentValue - a.InitialValue) < 0).length;
  const unchanged = assets.length - increasing - decreasing;

  // Group totals
  const sumCurrent = (list: any[]) => list.reduce((s, a) => s + Number(a.CurrentValue || 0), 0);
  const savingTotal = sumCurrent(allSaving);
  const investmentTotal = sumCurrent(allInvestment);
  const expenseTotal = sumCurrent(allExpense);
  const grandTotal = totalCurrent || 1;
  const pct = (v: number) => grandTotal > 0 ? (v / grandTotal) * 100 : 0;

  const handleSort = (col: string) => {
    if (sortColumn === col) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(col); setSortDirection('asc'); }
  };

  const applySearchAndSort = (list: any[]) => {
    let filtered = list;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(a => String(a.Name || '').toLowerCase().includes(q));
    }
    if (!sortColumn) return filtered;
    const dir = sortDirection === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const interestA = a.CurrentValue - a.InitialValue;
      const interestB = b.CurrentValue - b.InitialValue;
      const roiA = a.InitialValue > 0 ? interestA / a.InitialValue : 0;
      const roiB = b.InitialValue > 0 ? interestB / b.InitialValue : 0;
      switch (sortColumn) {
        case 'name': return dir * String(a.Name).localeCompare(String(b.Name), 'vi');
        case 'initial': return dir * (a.InitialValue - b.InitialValue);
        case 'current': return dir * (a.CurrentValue - b.CurrentValue);
        case 'profit': return dir * (interestA - interestB);
        case 'roi': return dir * (roiA - roiB);
        case 'updated': return dir * (new Date(a.CreatedAt || 0).getTime() - new Date(b.CreatedAt || 0).getTime());
        default: return 0;
      }
    });
  };

  const shouldShowSaving = activeFilter === 'all' || activeFilter === 'Saving';
  const shouldShowInvestment = activeFilter === 'all' || activeFilter === 'Investment';
  const shouldShowExpense = activeFilter === 'all' || activeFilter === 'Expense';

  const visibleSaving = shouldShowSaving ? applySearchAndSort(allSaving) : [];
  const visibleInvestment = shouldShowInvestment ? applySearchAndSort(allInvestment) : [];
  const visibleExpense = shouldShowExpense ? applySearchAndSort(allExpense) : [];

  const filteredCount = visibleSaving.length + visibleInvestment.length + visibleExpense.length;

  const handleMoveUp = (id: string, typeGroup: string) => {
    const group = sortByOrder(assets.filter(a => a.Type === typeGroup));
    const idx = group.findIndex(a => a.Id === id);
    if (idx <= 0) return;
    [group[idx - 1], group[idx]] = [group[idx], group[idx - 1]];
    const groupTypes = ['Expense', 'Saving', 'Investment'];
    const reordered: any[] = [];
    for (const gt of groupTypes) {
      if (gt === typeGroup) reordered.push(...group);
      else reordered.push(...assets.filter(a => a.Type === gt));
    }
    onReorder(reordered);
  };

  const handleMoveDown = (id: string, typeGroup: string) => {
    const group = sortByOrder(assets.filter(a => a.Type === typeGroup));
    const idx = group.findIndex(a => a.Id === id);
    if (idx < 0 || idx >= group.length - 1) return;
    [group[idx], group[idx + 1]] = [group[idx + 1], group[idx]];
    const groupTypes = ['Expense', 'Saving', 'Investment'];
    const reordered: any[] = [];
    for (const gt of groupTypes) {
      if (gt === typeGroup) reordered.push(...group);
      else reordered.push(...assets.filter(a => a.Type === gt));
    }
    onReorder(reordered);
  };

  // Helpers for rendering
  const getIcon = (type: string) => {
    if (type === 'Saving') return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
    );
    if (type === 'Investment') return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
    );
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
    );
  };

  const renderAssetRows = (list: any[], startIdx: number, typeGroup: string) =>
    list.map((asset, idx) => {
      const interest = Number(asset.CurrentValue) - Number(asset.InitialValue);
      const ratio = asset.InitialValue > 0 ? (interest / asset.InitialValue) * 100 : 0;
      const profitState = interest > 0 ? 'pos' : interest < 0 ? 'neg' : 'neu';
      const iconType = asset.Type === 'Saving' ? 'saving' : asset.Type === 'Investment' ? 'investment' : 'expense';
      const typeLabel = asset.Type === 'Saving' ? t('Tiết kiệm') : asset.Type === 'Investment' ? t('Đầu tư') : t('Sinh hoạt');
      return (
        <tr key={asset.Id}>
          <td style={{ textAlign: 'center', width: 56 }}>
            <div className="asset-reorder">
              <button onClick={() => handleMoveUp(asset.Id, typeGroup)} disabled={idx === 0} title={t('Di chuyển lên')}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5l-7 7h14l-7-7z"/></svg>
              </button>
              <span style={{ fontSize:'11px', fontFamily:'var(--font-mono)', color:'var(--text-muted)', fontWeight:600 }}>{String(startIdx + idx + 1).padStart(2,'0')}</span>
              <button onClick={() => handleMoveDown(asset.Id, typeGroup)} disabled={idx === list.length - 1} title={t('Di chuyển xuống')}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 19l7-7H5l7 7z"/></svg>
              </button>
            </div>
          </td>
          <td>
            <div className="asset-name-cell">
              <div className={`asset-icon ${iconType}`}>{getIcon(asset.Type)}</div>
              <div className="asset-name-main">
                <div className="asset-name-title" title={asset.Name}>{asset.Name}</div>
                <div className="asset-name-sub">{typeLabel}</div>
              </div>
            </div>
          </td>
          <td className="num" style={{ color:'var(--text-secondary)', fontWeight:500 }}>{formatCurrency(asset.InitialValue)} ₫</td>
          <td className="num" style={{ color:'var(--text-primary)', fontWeight:650 }}>{formatCurrency(asset.CurrentValue)} ₫</td>
          <td className="num">
            <span className={`asset-profit ${profitState}`}>
              <span className="asset-profit-icon">{interest > 0 ? '▲' : interest < 0 ? '▼' : '—'}</span>
              {interest === 0 ? '0' : `${interest > 0 ? '+' : ''}${formatCurrency(interest)}`} ₫
            </span>
          </td>
          <td className="num">
            <span className={`asset-profit ${profitState}`} style={{ fontSize:'12px' }}>
              {asset.InitialValue > 0 ? `${interest > 0 ? '+' : ''}${ratio.toFixed(2)}%` : '0.00%'}
            </span>
          </td>
          <td style={{ textAlign:'center', color:'var(--text-secondary)', fontSize:'12px', fontFamily:'var(--font-mono)', fontVariantNumeric:'tabular-nums' }}>
            {asset.CreatedAt ? formatDateShort(asset.CreatedAt) : '—'}
          </td>
          <td>
            <div className="asset-actions">
              <button className="asset-action-btn edit" onClick={() => onEdit(asset)} title={t('Sửa tài sản')} aria-label={t('Sửa tài sản')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </button>
              <button className="asset-action-btn delete" onClick={() => onDelete(asset.Id, asset.Name)} title={t('Xóa tài sản')} aria-label={t('Xóa tài sản')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </td>
        </tr>
      );
    });

  const renderMobileCard = (asset: any, typeGroup: string, idx: number, startIdx: number) => {
    const interest = Number(asset.CurrentValue) - Number(asset.InitialValue);
    const ratio = asset.InitialValue > 0 ? (interest / asset.InitialValue) * 100 : 0;
    const profitState = interest > 0 ? 'pos' : interest < 0 ? 'neg' : 'neu';
    const iconType = asset.Type === 'Saving' ? 'saving' : asset.Type === 'Investment' ? 'investment' : 'expense';
    return (
      <div key={asset.Id} className="asset-mobile-card">
        <div className="asset-mobile-top">
          <div className="asset-name-cell" style={{ minWidth:0 }}>
            <div className={`asset-icon ${iconType}`}>{getIcon(asset.Type)}</div>
            <div className="asset-name-main">
              <div className="asset-name-title">{asset.Name}</div>
              <div className="asset-name-sub">{asset.Type === 'Saving' ? t('Tiết kiệm') : asset.Type === 'Investment' ? t('Đầu tư') : t('Sinh hoạt')} • #{String(startIdx+idx+1).padStart(2,'0')}</div>
            </div>
          </div>
          <div className="asset-actions">
            <button className="asset-action-btn edit" onClick={() => onEdit(asset)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>
            <button className="asset-action-btn delete" onClick={() => onDelete(asset.Id, asset.Name)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          </div>
        </div>
        <div className="asset-mobile-grid">
          <div className="asset-mobile-item">
            <span className="asset-mobile-label">{t('Giá trị hiện tại')}</span>
            <span className="asset-mobile-value">{formatCurrency(asset.CurrentValue)} ₫</span>
          </div>
          <div className="asset-mobile-item">
            <span className="asset-mobile-label">{t('Vốn gốc')}</span>
            <span className="asset-mobile-value" style={{ color:'var(--text-secondary)' }}>{formatCurrency(asset.InitialValue)} ₫</span>
          </div>
          <div className="asset-mobile-item">
            <span className="asset-mobile-label">{t('Lợi nhuận')}</span>
            <span className={`asset-profit ${profitState}`} style={{ fontSize:'13px' }}>
              <span className="asset-profit-icon">{interest > 0 ? '▲' : interest < 0 ? '▼' : '—'}</span>
              {interest === 0 ? '0' : `${interest > 0 ? '+' : ''}${formatCurrency(interest)}`} ₫
            </span>
          </div>
          <div className="asset-mobile-item">
            <span className="asset-mobile-label">ROI</span>
            <span className={`asset-profit ${profitState}`} style={{ fontSize:'13px' }}>{asset.InitialValue > 0 ? `${interest > 0 ? '+' : ''}${ratio.toFixed(2)}%` : '0.00%'}</span>
          </div>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>
          <span>{asset.CreatedAt ? formatDateShort(asset.CreatedAt) : ''}</span>
          <span style={{ display:'flex', gap:4, alignItems:'center' }}>
            <button onClick={() => handleMoveUp(asset.Id, typeGroup)} disabled={idx===0} style={{ background:'none', border:'none', color: idx===0?'var(--text-muted)':'var(--text-secondary)', opacity: idx===0?0.35:1, cursor: idx===0?'default':'pointer' }}>▲</button>
            <button onClick={() => handleMoveDown(asset.Id, typeGroup)} disabled={idx===listFilteredLength(typeGroup)-1} style={{ background:'none', border:'none', color: idx===listFilteredLength(typeGroup)-1?'var(--text-muted)':'var(--text-secondary)', opacity: idx===listFilteredLength(typeGroup)-1?0.35:1, cursor: idx===listFilteredLength(typeGroup)-1?'default':'pointer' }}>▼</button>
          </span>
        </div>
      </div>
    );
  };

  const listFilteredLength = (type: string) => {
    if (type === 'Saving') return visibleSaving.length;
    if (type === 'Investment') return visibleInvestment.length;
    return visibleExpense.length;
  };

  const renderSortIcon = (active: boolean, dir: 'asc'|'desc') => (
    <span className="sort-icon" style={{ display:'inline-flex', flexDirection:'column', lineHeight:0, gap:1 }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ opacity: active && dir==='asc'?1:0.35 }}><path d="M18 15l-6-6-6 6"/></svg>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ opacity: active && dir==='desc'?1:0.35, marginTop:-2 }}><path d="M6 9l6 6 6-6"/></svg>
    </span>
  );

  const selectedRecord = selectedHistoryId ? historyRecords.find((r: any) => r.Id === selectedHistoryId) : null;
  const selectedDetails: any[] = selectedRecord?.Details || [];
  const selTotalCurrent = selectedDetails.reduce((s: number, d: any) => s + Number(d.CurrentValue || 0), 0);
  const selTotalInitial = selectedDetails.reduce((s: number, d: any) => s + Number(d.InitialValue || 0), 0);
  const selDiff = selTotalCurrent - selTotalInitial;
  const selDiffPct = selTotalInitial > 0 ? (selDiff / selTotalInitial) * 100 : 0;

  return (
    <div className="asset-page">
      {/* HEADER */}
      <div className="asset-header">
        <div className="asset-header-left">
          <h1 className="asset-title">{t('Bảng Quản Lý Tài Sản')}</h1>
          <p className="asset-subtitle">{t('Theo dõi giá trị, hiệu suất và phân bổ tài sản của bạn')}</p>
        </div>
        <div className="asset-header-actions">
          <button className="asset-btn asset-btn-secondary" onClick={onSave}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            {t('Lưu thông tin')}
          </button>
          <button className="asset-btn asset-btn-primary" onClick={onAdd}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {t('Thêm Tài Sản')}
          </button>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="asset-summary-grid">
        <div className="asset-summary-card primary">
          <div className="asset-summary-label"><span style={{ width:6, height:6, borderRadius:'50%', background:'#7C5CFF', boxShadow:'0 0 10px rgba(124,92,255,0.35)', display:'inline-block' }} />{t('Tổng tài sản hiện tại')}</div>
          <div className="asset-summary-value" style={{ fontVariantNumeric:'tabular-nums' }}>{formatCurrency(totalCurrent)} ₫</div>
          <div className="asset-summary-sub">{assets.length} {t('tài sản')} • {totalCurrent > 0 ? `${pct(totalCurrent).toFixed(1)}%` : '0%'} {t('tài sản')}</div>
        </div>
        <div className="asset-summary-card">
          <div className="asset-summary-label">{t('Vốn ban đầu')}</div>
          <div className="asset-summary-value" style={{ fontSize:22, color:'var(--text-secondary)' }}>{formatCurrency(totalInitial)} ₫</div>
          <div className="asset-summary-sub">{t('Đã đầu tư ban đầu')}</div>
        </div>
        <div className="asset-summary-card" style={{ borderColor: totalInterest >=0 ? 'rgba(24,201,149,0.14)' : 'rgba(255,77,103,0.14)' }}>
          <div className="asset-summary-label">{t('Lợi nhuận')}</div>
          <div className="asset-summary-value" style={{ fontSize:22, color: totalInterest > 0 ? '#18C995' : totalInterest < 0 ? '#FF4D67' : 'var(--text-muted)' }}>
            {totalInterest > 0 ? '+' : ''}{formatCurrency(totalInterest)} ₫
          </div>
          <div className="asset-summary-sub">
            <span className={`asset-summary-delta ${totalInterest > 0 ? 'pos' : totalInterest < 0 ? 'neg' : 'neu'}`}>
              {totalInterest > 0 ? '▲' : totalInterest < 0 ? '▼' : '—'} {totalInterestRatio > 0 ? '+' : ''}{totalInterestRatio.toFixed(2)}%
            </span>
            <span>{totalInterest >=0 ? t('Tăng trưởng') : t('Sụt giảm')}</span>
          </div>
        </div>
        <div className="asset-summary-card" style={{ textAlign:'center', justifyContent:'center' }}>
          <div className="asset-summary-label" style={{ justifyContent:'center' }}>{t('Số lượng tài sản')}</div>
          <div className="asset-summary-value" style={{ fontSize:28, textAlign:'center' }}>{assets.length}</div>
          <div className="asset-summary-sub" style={{ justifyContent:'center' }}>{t('danh mục')}</div>
        </div>
      </div>

      {/* HEALTH STRIP — only if calculable */}
      {assets.length > 0 && (
        <div className="asset-health-strip">
          <span><b>{assets.length}</b> {t('tài sản')}</span>
          <span style={{ width:1, height:14, background:'rgba(255,255,255,0.08)', display:'inline-block' }} />
          <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><span className="asset-health-dot up" /> <b style={{ color:'#18C995' }}>{increasing}</b> {t('đang tăng')}</span>
          <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><span className="asset-health-dot down" /> <b style={{ color:'#FF4D67' }}>{decreasing}</b> {t('đang giảm')}</span>
          <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><span className="asset-health-dot flat" /> <b>{unchanged}</b> {t('không đổi')}</span>
          {searchQuery || activeFilter !== 'all' ? (
            <>
              <span style={{ width:1, height:14, background:'rgba(255,255,255,0.08)', display:'inline-block' }} />
              <span style={{ color:'var(--text-muted)', fontSize:12 }}>{t('Hiển thị')} <b style={{ color:'var(--text-primary)' }}>{filteredCount}</b> / {assets.length}</span>
            </>
          ) : null}
        </div>
      )}

      {/* ASSET GROUPS */}
      <div className="asset-groups-grid">
        <div className="asset-group-summary saving">
          <div className="asset-group-head saving"><span className="asset-group-dot saving" />{t('Tiết kiệm')}</div>
          <div className="asset-group-main">
            <div className="asset-group-value">{formatCompactValue(savingTotal)} ₫</div>
            <span className="asset-group-pct">{pct(savingTotal).toFixed(1)}% {t('tài sản')}</span>
          </div>
          <div className="asset-group-meta">{allSaving.length} {t('tài sản')}</div>
          <div className="asset-group-bar"><div className="asset-group-bar-fill saving" style={{ width:`${pct(savingTotal)}%` }} /></div>
        </div>
        <div className="asset-group-summary investment">
          <div className="asset-group-head investment"><span className="asset-group-dot investment" />{t('Đầu tư')}</div>
          <div className="asset-group-main">
            <div className="asset-group-value">{formatCompactValue(investmentTotal)} ₫</div>
            <span className="asset-group-pct">{pct(investmentTotal).toFixed(1)}% {t('tài sản')}</span>
          </div>
          <div className="asset-group-meta">{allInvestment.length} {t('tài sản')}</div>
          <div className="asset-group-bar"><div className="asset-group-bar-fill investment" style={{ width:`${pct(investmentTotal)}%` }} /></div>
        </div>
        {allExpense.length > 0 && (
          <div className="asset-group-summary expense">
            <div className="asset-group-head expense"><span className="asset-group-dot expense" />{t('Sinh hoạt')}</div>
            <div className="asset-group-main">
              <div className="asset-group-value">{formatCompactValue(expenseTotal)} ₫</div>
              <span className="asset-group-pct">{pct(expenseTotal).toFixed(1)}% {t('tài sản')}</span>
            </div>
            <div className="asset-group-meta">{allExpense.length} {t('tài sản')}</div>
            <div className="asset-group-bar"><div className="asset-group-bar-fill expense" style={{ width:`${pct(expenseTotal)}%` }} /></div>
          </div>
        )}
      </div>

      {/* TOOLBAR */}
      <div className="asset-toolbar">
        <div className="asset-search-wrap">
          <svg className="asset-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            className="asset-search-input"
            placeholder={t('Tìm kiếm tài sản...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="asset-filter-pills">
          <button className={`asset-pill ${activeFilter==='all'?'active':''}`} onClick={() => setActiveFilter('all')}>{t('Tất cả')}</button>
          <button className={`asset-pill ${activeFilter==='Saving'?'active':''}`} onClick={() => setActiveFilter('Saving')}>{t('Tiết kiệm')}</button>
          <button className={`asset-pill ${activeFilter==='Investment'?'active investment':''}`} onClick={() => setActiveFilter('Investment')}>{t('Đầu tư')}</button>
          {allExpense.length > 0 && <button className={`asset-pill ${activeFilter==='Expense'?'active expense':''}`} onClick={() => setActiveFilter('Expense')}>{t('Sinh hoạt')}</button>}
        </div>
        <div className="asset-sort-hint">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5h10M11 12h7M11 19h4M4 10l3 3 3-3M6 13V4"/></svg>
          {t('Nhấn tiêu đề cột để sắp xếp')}
        </div>
      </div>

      {/* TABLE */}
      <div className="asset-table-card">
        <div className="asset-table-wrap">
          <table className="asset-table">
            <thead>
              <tr>
                <th style={{ width:56, textAlign:'center' }}>{t('STT')}</th>
                <th className={`sortable ${sortColumn==='name'?'active':''}`} onClick={() => handleSort('name')}>
                  <span className="th-sort">{t('Tài sản')} {renderSortIcon(sortColumn==='name', sortDirection)}</span>
                </th>
                <th className={`num sortable ${sortColumn==='initial'?'active':''}`} onClick={() => handleSort('initial')}>
                  <span className="th-sort" style={{ justifyContent:'flex-end' }}>{t('Vốn gốc')} {renderSortIcon(sortColumn==='initial', sortDirection)}</span>
                </th>
                <th className={`num sortable ${sortColumn==='current'?'active':''}`} onClick={() => handleSort('current')}>
                  <span className="th-sort" style={{ justifyContent:'flex-end' }}>{t('Giá trị hiện tại')} {renderSortIcon(sortColumn==='current', sortDirection)}</span>
                </th>
                <th className={`num sortable ${sortColumn==='profit'?'active':''}`} onClick={() => handleSort('profit')}>
                  <span className="th-sort" style={{ justifyContent:'flex-end' }}>{t('Lợi nhuận')} {renderSortIcon(sortColumn==='profit', sortDirection)}</span>
                </th>
                <th className={`num sortable ${sortColumn==='roi'?'active':''}`} onClick={() => handleSort('roi')}>
                  <span className="th-sort" style={{ justifyContent:'flex-end' }}>ROI {renderSortIcon(sortColumn==='roi', sortDirection)}</span>
                </th>
                <th className={`sortable ${sortColumn==='updated'?'active':''}`} onClick={() => handleSort('updated')} style={{ textAlign:'center' }}>
                  <span className="th-sort">{t('Cập nhật')} {renderSortIcon(sortColumn==='updated', sortDirection)}</span>
                </th>
                <th style={{ textAlign:'center', width:84 }}>{t('Hành động')}</th>
              </tr>
            </thead>
            <tbody>
              {assets.length === 0 ? (
                <tr><td colSpan={8}><div className="asset-empty">{t('Chưa có dữ liệu tài sản. Bấm nút "Thêm Tài Sản" để khởi tạo.')}</div></td></tr>
              ) : filteredCount === 0 ? (
                <tr><td colSpan={8}><div className="asset-empty">{t('Không tìm thấy tài sản phù hợp.')}<br/><span style={{ fontSize:12, color:'var(--text-muted)' }}>{t('Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.')}</span></div></td></tr>
              ) : (
                <>
                  {visibleExpense.length > 0 && (
                    <>
                      <tr className="asset-group-row expense">
                        <td colSpan={8}>
                          <div className="asset-group-row-inner">
                            <span className="asset-group-row-title expense"><span style={{ width:8, height:8, borderRadius:'50%', background:'#F5A623', display:'inline-block' }} />{t('Sinh hoạt')}</span>
                            <span className="asset-group-row-meta">
                              <span><strong>{formatCurrency(expenseTotal)} ₫</strong> • {pct(expenseTotal).toFixed(1)}%</span>
                              <span>{visibleExpense.length} / {allExpense.length} {t('tài sản')}</span>
                            </span>
                          </div>
                        </td>
                      </tr>
                      {renderAssetRows(visibleExpense, 0, 'Expense')}
                    </>
                  )}
                  {visibleSaving.length > 0 && (
                    <>
                      <tr className="asset-group-row saving">
                        <td colSpan={8}>
                          <div className="asset-group-row-inner">
                            <span className="asset-group-row-title saving"><span style={{ width:8, height:8, borderRadius:'50%', background:'#7C5CFF', display:'inline-block' }} />{t('Tiết kiệm')}</span>
                            <span className="asset-group-row-meta">
                              <span><strong>{formatCurrency(savingTotal)} ₫</strong> • {pct(savingTotal).toFixed(1)}%</span>
                              <span>{visibleSaving.length} / {allSaving.length} {t('tài sản')}</span>
                            </span>
                          </div>
                        </td>
                      </tr>
                      {renderAssetRows(visibleSaving, visibleExpense.length, 'Saving')}
                    </>
                  )}
                  {visibleInvestment.length > 0 && (
                    <>
                      <tr className="asset-group-row investment">
                        <td colSpan={8}>
                          <div className="asset-group-row-inner">
                            <span className="asset-group-row-title investment"><span style={{ width:8, height:8, borderRadius:'50%', background:'#18C995', display:'inline-block' }} />{t('Đầu tư')}</span>
                            <span className="asset-group-row-meta">
                              <span><strong>{formatCurrency(investmentTotal)} ₫</strong> • {pct(investmentTotal).toFixed(1)}%</span>
                              <span>{visibleInvestment.length} / {allInvestment.length} {t('tài sản')}</span>
                            </span>
                          </div>
                        </td>
                      </tr>
                      {renderAssetRows(visibleInvestment, visibleExpense.length + visibleSaving.length, 'Investment')}
                    </>
                  )}
                  <tr className="asset-total-row">
                    <td colSpan={2}><div className="asset-total-label">{t('Tổng tài sản')}<span>{assets.length} {t('tài sản')}</span></div></td>
                    <td className="num" style={{ color:'var(--text-secondary)' }}>{formatCurrency(totalInitial)} ₫<div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:400 }}>Vốn gốc</div></td>
                    <td className="num" style={{ color:'var(--text-primary)' }}>{formatCurrency(totalCurrent)} ₫<div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:400 }}>Hiện tại</div></td>
                    <td className="num" style={{ color: totalInterest >0 ? '#18C995' : totalInterest <0 ? '#FF4D67' : '#8A94A6' }}>
                      {totalInterest >0 ? '+' : ''}{formatCurrency(totalInterest)} ₫
                      <div style={{ fontSize:10, fontWeight:400, color: totalInterest >0 ? '#18C995' : totalInterest <0 ? '#FF4D67' : '#8A94A6' }}>{totalInterest >=0 ? t('Lời') : t('Lỗ')}</div>
                    </td>
                    <td className="num" style={{ color: totalInterest >0 ? '#18C995' : totalInterest <0 ? '#FF4D67' : '#8A94A6' }}>
                      {totalInterestRatio >0 ? '+' : ''}{totalInterestRatio.toFixed(2)}%
                    </td>
                    <td></td>
                    <td></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
        {/* Mobile cards */}
        <div className="asset-mobile-list" style={{ padding: assets.length===0?0:12 }}>
          {assets.length === 0 ? (
            <div className="asset-empty">{t('Chưa có dữ liệu tài sản. Bấm nút "Thêm Tài Sản" để khởi tạo.')}</div>
          ) : filteredCount === 0 ? (
            <div className="asset-empty">{t('Không tìm thấy tài sản phù hợp.')}</div>
          ) : (
            <>
              {visibleExpense.map((a,i) => renderMobileCard(a,'Expense',i,0))}
              {visibleSaving.map((a,i) => renderMobileCard(a,'Saving',i,visibleExpense.length))}
              {visibleInvestment.map((a,i) => renderMobileCard(a,'Investment',i,visibleExpense.length+visibleSaving.length))}
              <div className="asset-mobile-card" style={{ background:'rgba(16,21,34,0.92)', borderColor:'rgba(124,92,255,0.20)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:12, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase' }}>{t('Tổng tài sản')}</span>
                  <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:13, color: totalInterest>0?'#18C995': totalInterest<0?'#FF4D67':'var(--text-muted)' }}>{totalInterest>0?'+':''}{formatCurrency(totalInterest)} ₫ • {totalInterestRatio.toFixed(2)}%</span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontFamily:'var(--font-mono)', fontSize:12 }}>
                  <span style={{ color:'var(--text-muted)' }}>{t('Vốn gốc')}: <b style={{ color:'var(--text-primary)' }}>{formatCurrency(totalInitial)} ₫</b></span>
                  <span style={{ color:'var(--text-muted)' }}>{t('Hiện tại')}: <b style={{ color:'var(--text-primary)' }}>{formatCurrency(totalCurrent)} ₫</b></span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* HISTORY */}
      <div className="asset-history-card">
        <div className="asset-history-header">
          <div>
            <div className="asset-history-title">{t('Lịch sử tài sản')}</div>
            <div className="asset-history-subtitle">{t('Chọn một mốc thời gian để xem chi tiết tài sản tại thời điểm đó')}</div>
          </div>
          <div style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'var(--font-mono)', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)', padding:'6px 10px', borderRadius:999 }}>
            {historyRecords.length} {t('bản ghi')}
          </div>
        </div>
        {historyRecords.length === 0 ? (
          <div className="asset-history-empty" style={{ minHeight:220 }}>
            <div className="asset-history-empty-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div className="asset-history-empty-title">{t('Chưa có lịch sử')}</div>
            <div className="asset-history-empty-desc">{t('Nhấn "Lưu thông tin" để tạo bản ghi lịch sử đầu tiên. Mỗi bản ghi lưu lại toàn bộ danh mục tài sản tại thời điểm đó.')}</div>
          </div>
        ) : (
          <div className="asset-history-body">
            <div className="asset-history-left">
              <div className="asset-timeline">
                {historyRecords.map((r: any) => {
                  const isActive = selectedHistoryId === r.Id;
                  const total = (r.Details || []).reduce((s: number, d: any) => s + Number(d.CurrentValue || 0), 0);
                  return (
                    <div key={r.Id} className={`asset-timeline-item ${isActive?'active':''}`} onClick={() => setSelectedHistoryId(r.Id)}>
                      <div className="asset-timeline-dot" />
                      <div className="asset-timeline-main">
                        {editingTimeId === r.Id ? (
                          <DateTimeEdit value={r.RecordedAt} onSave={async (newIso) => {
                            const oldTime = new Date(r.RecordedAt).getTime();
                            const newTime = new Date(newIso).getTime();
                            if (Math.abs(newTime - oldTime) > 60000) await onUpdateTime(r.Id, newIso);
                            setEditingTimeId(null);
                          }} />
                        ) : (
                          <div className="asset-timeline-time" onClick={(e) => { e.stopPropagation(); setSelectedHistoryId(r.Id); if (isActive) setEditingTimeId(r.Id); }} title={t('Nhấn để sửa thời gian')}>
                            {formatDateTime(r.RecordedAt)}
                          </div>
                        )}
                        <div className="asset-timeline-meta">
                          {r.Details?.length || 0} {t('tài sản')} • {formatCompactValue(total)} ₫
                        </div>
                      </div>
                      <div className="asset-timeline-actions">
                        <button className="asset-timeline-del" onClick={(e) => { e.stopPropagation(); onDeleteHistory(r.Id); }} title={t('Xóa lịch sử')}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="asset-history-right">
              {!selectedRecord ? (
                <div className="asset-history-empty">
                  <div className="asset-history-empty-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  </div>
                  <div className="asset-history-empty-title">{t('Chọn một mốc thời gian')}</div>
                  <div className="asset-history-empty-desc">{t('Chọn bản ghi bên trái để xem chi tiết tài sản tại thời điểm đó.')}</div>
                </div>
              ) : (
                <>
                  <div className="asset-snapshot-header">
                    <div>
                      <div className="asset-snapshot-title">Snapshot</div>
                      <div className="asset-snapshot-time">{formatDateTime(selectedRecord.RecordedAt)}</div>
                    </div>
                    <div className="asset-snapshot-actions" style={{ marginTop:0 }}>
                      <button className="asset-btn asset-btn-secondary" style={{ height:34, padding:'0 12px', fontSize:12 }} onClick={() => onDeleteHistory(selectedRecord.Id)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        {t('Xóa')}
                      </button>
                      <button className="asset-btn asset-btn-primary" style={{ height:34, padding:'0 14px', fontSize:12 }} onClick={() => onRestore(selectedRecord.Id)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                        {t('Khôi phục')}
                      </button>
                    </div>
                  </div>
                  <div className="asset-snapshot-grid">
                    <div className="asset-snapshot-stat">
                      <div className="asset-snapshot-label">{t('Tổng tài sản')}</div>
                      <div className="asset-snapshot-value">{formatCurrency(selTotalCurrent)} ₫</div>
                      <div className="asset-snapshot-sub">{selectedDetails.length} {t('tài sản')}</div>
                    </div>
                    <div className="asset-snapshot-stat">
                      <div className="asset-snapshot-label">{t('Vốn gốc')}</div>
                      <div className="asset-snapshot-value" style={{ color:'var(--text-secondary)' }}>{formatCurrency(selTotalInitial)} ₫</div>
                      <div className="asset-snapshot-sub">{t('Ban đầu')}</div>
                    </div>
                    <div className="asset-snapshot-stat" style={{ borderColor: selDiff >=0 ? 'rgba(24,201,149,0.18)' : 'rgba(255,77,103,0.18)', background: selDiff >=0 ? 'rgba(24,201,149,0.06)' : 'rgba(255,77,103,0.06)' }}>
                      <div className="asset-snapshot-label">{t('Chênh lệch')}</div>
                      <div className="asset-snapshot-value" style={{ color: selDiff >=0 ? '#18C995' : '#FF4D67' }}>{selDiff >0?'+':''}{formatCurrency(selDiff)} ₫</div>
                      <div className="asset-snapshot-sub" style={{ color: selDiff >=0 ? '#18C995' : '#FF4D67' }}>{selDiffPct >0?'+':''}{selDiffPct.toFixed(2)}%</div>
                    </div>
                  </div>
                  <div style={{ overflowX:'auto', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, overflow:'hidden' }}>
                    <table className="asset-snapshot-table">
                      <thead>
                        <tr>
                          <th>{t('Tài sản')}</th>
                          <th style={{ textAlign:'right' }}>{t('Vốn gốc')}</th>
                          <th style={{ textAlign:'right' }}>{t('Giá trị hiện tại')}</th>
                          <th style={{ textAlign:'center' }}>{t('Loại')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDetails.map((d: any) => (
                          <tr key={d.Id}>
                            <td style={{ fontWeight:600, display:'flex', alignItems:'center', gap:8 }}>
                              <span className={`asset-icon ${d.Type==='Saving'?'saving': d.Type==='Investment'?'investment':'expense'}`} style={{ width:28, height:28, borderRadius:8 }}>{getIcon(d.Type)}</span>
                              {d.Name}
                            </td>
                            <td style={{ textAlign:'right', fontFamily:'var(--font-mono)', fontVariantNumeric:'tabular-nums' }}>{formatCurrency(d.InitialValue)} ₫</td>
                            <td style={{ textAlign:'right', fontFamily:'var(--font-mono)', fontVariantNumeric:'tabular-nums', color: Number(d.CurrentValue) >= Number(d.InitialValue) ? '#18C995' : '#FF4D67', fontWeight:600 }}>{formatCurrency(d.CurrentValue)} ₫</td>
                            <td style={{ textAlign:'center' }}>
                              <span style={{ fontSize:11, padding:'3px 8px', borderRadius:999, fontWeight:600, border:'1px solid', background: d.Type==='Saving' ? 'rgba(124,92,255,0.10)' : d.Type==='Investment' ? 'rgba(24,201,149,0.10)' : 'rgba(245,166,35,0.10)', color: d.Type==='Saving' ? '#9B7CFF' : d.Type==='Investment' ? '#18C995' : '#F5A623', borderColor: d.Type==='Saving' ? 'rgba(124,92,255,0.16)' : d.Type==='Investment' ? 'rgba(24,201,149,0.14)' : 'rgba(245,166,35,0.14)' }}>
                                {d.Type === 'Saving' ? t('Tiết kiệm') : d.Type === 'Investment' ? t('Đầu tư') : t('Sinh hoạt')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
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
  allocations,
  income,
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
  onRestoreAllocationHistory,
  onDeleteAllocationHistory,
  onUpdateAllocationTime,
  onReorderAllocations
}: {
  assets: any[];
  allocations: any[];
  income: number;
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
  onDeleteAllocationHistory: (historyId: string) => void;
  onUpdateAllocationTime: (historyId: string, recordedAt: string) => Promise<any>;
  onReorderAllocations: (orderedList: any[]) => Promise<void>;
}) {
  const { t } = useLanguage();
  const { addToast } = useToast();

  const isPercentageBalanced = Math.abs(totalAllocatedPercentage - 100) < 0.01;
  // keep props used to avoid TS6133
  void totalSavingCash; void totalInvestmentCash;
  const setupTotalAmount = setupAllocations.reduce((sum, al) => sum + (al.setupAmount || 0), 0);
  const setupTotalPercent = setupAllocations.reduce((sum, al) => sum + al.TargetPercentage, 0);
  const sortByOrder = (list: any[]) => [...list].sort((a, b) => (a.SortOrder ?? 0) - (b.SortOrder ?? 0));
  const handleMoveUp = (id: string, categoryGroup: string) => {
    const group = sortByOrder(allocations.filter(al => al.FinancialCategory === categoryGroup));
    const idx = group.findIndex(al => al.Id === id);
    if (idx <= 0) return;
    [group[idx - 1], group[idx]] = [group[idx], group[idx - 1]];
    const catOrder = ['Expense', 'Saving', 'Investment'];
    const reordered: any[] = [];
    for (const cat of catOrder) {
      if (cat === categoryGroup) reordered.push(...group);
      else reordered.push(...allocations.filter(al => al.FinancialCategory === cat));
    }
    onReorderAllocations(reordered);
  };
  const handleMoveDown = (id: string, categoryGroup: string) => {
    const group = sortByOrder(allocations.filter(al => al.FinancialCategory === categoryGroup));
    const idx = group.findIndex(al => al.Id === id);
    if (idx < 0 || idx >= group.length - 1) return;
    [group[idx], group[idx + 1]] = [group[idx + 1], group[idx]];
    const catOrder = ['Expense', 'Saving', 'Investment'];
    const reordered: any[] = [];
    for (const cat of catOrder) {
      if (cat === categoryGroup) reordered.push(...group);
      else reordered.push(...allocations.filter(al => al.FinancialCategory === cat));
    }
    onReorderAllocations(reordered);
  };
  const sortedExpenses = sortByOrder(calculatedExpenses);
  const sortedSavings = sortByOrder(calculatedSavings);
  const sortedInvestments = sortByOrder(calculatedInvestments);

  // Local UI states for new workspace
  const [viewMode, setViewMode] = useState<'overview' | 'detail'>('overview');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ Expense: true, Saving: false, Investment: false });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const toggleGroup = (k: string) => setExpanded(p => ({ ...p, [k]: !p[k] }));
  const remaining = income - totalAllocatedCash;
  const remainingIsPositive = remaining > 0.5;
  const remainingIsNegative = remaining < -0.5;
  const remainingIsZero = !remainingIsPositive && !remainingIsNegative;
  // Health derived
  const healthPct = Math.min(100, Math.max(0, totalAllocatedPercentage));
  const healthStatus: 'ok' | 'warn' | 'bad' = isPercentageBalanced ? 'ok' : Math.abs(totalAllocatedPercentage - 100) < 10 ? 'warn' : 'bad';
  // Distribution bar data
  const expensePct = sortedExpenses.reduce((s, a) => s + (a.TargetPercentage || 0), 0);
  const savingPct = sortedSavings.reduce((s, a) => s + (a.TargetPercentage || 0), 0);
  const investmentPct = sortedInvestments.reduce((s, a) => s + (a.TargetPercentage || 0), 0);
  const expenseCash = sortedExpenses.reduce((s, a) => s + (a.CurrentAmount || 0), 0);
  const savingCash = sortedSavings.reduce((s, a) => s + (a.CurrentAmount || 0), 0);
  const investmentCash = sortedInvestments.reduce((s, a) => s + (a.CurrentAmount || 0), 0);
  const expenseActual = sortedExpenses.reduce((s, a) => s + (a.actual || 0), 0);
  const savingActual = sortedSavings.reduce((s, a) => s + (a.actual || 0), 0);
  const investmentActual = sortedInvestments.reduce((s, a) => s + (a.actual || 0), 0);
  const protectedCount = allocations.filter(al => {
    const calc = [...calculatedExpenses, ...calculatedSavings, ...calculatedInvestments].find(c => c.Id === al.Id);
    return calc?.isExcluded;
  }).length;
  // Global apply handler
  const handleGlobalApply = async () => {
    const applyList = [...sortedExpenses, ...sortedSavings, ...sortedInvestments].filter(a => !!a.AssetId);
    if (applyList.length === 0) {
      addToast({ title: t('Chưa liên kết tài sản'), description: t('Vui lòng liên kết danh mục với tài sản trong Thiết lập mới.'), variant: 'warning' });
      return;
    }
    setIsApplying(true);
    for (const al of applyList) {
      try { await onApplyToAsset(al); } catch {}
    }
    setIsApplying(false);
    setConfirmOpen(false);
  };

  if (showSetup) {
    return (
      <div className="alloc-page">
        <div className="alloc-header">
          <div className="alloc-header-left">
            <h2 className="alloc-title">{t('Thiết Lập Danh Mục')}</h2>
            <p className="alloc-subtitle">{t('Thêm, sửa, xóa danh mục và nhập số tiền phân bổ. Tỉ lệ phần trăm sẽ tự động tính toán.')}</p>
          </div>
          <div className="alloc-header-actions">
            <button className="alloc-btn alloc-btn-ghost" onClick={onCancelSetup}>{t('Hủy')}</button>
            <button className="alloc-btn alloc-btn-primary" onClick={onSaveSetup} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              {t('Lưu Thiết Lập')}
            </button>
          </div>
        </div>
        <div className="alloc-overview-grid" style={{ gridTemplateColumns: '1fr 1fr 1.5fr' }}>
          <div className="alloc-overview-card primary">
            <div className="alloc-overview-label">{t('Phân bổ gốc')}</div>
            <div className="money-input-inline">
              <MoneyInput value={setupAmount} onChange={(val) => onSetupAmountChange(val)} style={{ height:'36px', padding:'0 10px', borderRadius:'10px', background:'rgba(8,11,20,0.55)', border:'1px solid rgba(255,255,255,0.08)', color:'#F4F5FA', fontFamily:'var(--font-mono)', fontWeight:600, width:'100%', maxWidth:'200px' }} />
            </div>
            <div className="alloc-overview-sub">{t('Số tiền gốc để tính tỉ trọng')}</div>
          </div>
          <div className="alloc-overview-card">
            <div className="alloc-overview-label">{t('Tổng đã phân bổ')}</div>
            <div className="alloc-overview-value" style={{ fontSize:'20px', color: Math.abs(setupTotalPercent - 100) < 0.01 ? '#18C995' : '#F5A623' }}>{setupTotalPercent.toFixed(2)}%</div>
            <div className="alloc-overview-sub">{formatCurrency(setupTotalAmount)} ₫</div>
          </div>
          <div className="alloc-overview-card">
            <div className="alloc-overview-label">{t('Trạng thái')}</div>
            <div className="alloc-overview-sub" style={{ marginTop:10 }}>
              {Math.abs(setupTotalPercent - 100) < 0.01 ? <span className="alloc-overview-delta pos">✓ {t('Đã cân bằng')}</span> : <span className="alloc-overview-delta neg">⚠ {t('Chưa cân bằng')}</span>}
            </div>
            <div className="alloc-overview-sub" style={{ marginTop:6 }}>{t('Tổng tỉ trọng nên đạt 100%')}</div>
          </div>
        </div>
        <div className="alloc-table-card">
          <div className="alloc-table-wrap">
            <table className="alloc-table">
              <thead>
                <tr>
                  <th style={{ width: '160px' }}>{t('Phân loại')}</th>
                  <th>{t('Tên danh mục')}</th>
                  <th className="num" style={{ width: '160px' }}>{t('Số tiền')}</th>
                  <th className="num" style={{ width: '140px' }}>{t('Tỉ trọng')}</th>
                  <th style={{ textAlign: 'center', width: '100px' }}>{t('Hành động')}</th>
                </tr>
              </thead>
              <tbody>
                {setupAllocations.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>{t('Chưa có danh mục nào. Bấm "Thêm danh mục" để bắt đầu.')}</td></tr>
                ) : (
                  setupAllocations.map((al) => (
                    <tr key={al.Id}>
                      <td>
                        <select className="form-control" style={{ padding: '6px 8px', height: '34px', fontSize: '0.85rem', width: '100%', background:'rgba(8,11,20,0.5)', border:'1px solid var(--border)', borderRadius:'9px' }} value={al.FinancialCategory} onChange={(e) => onSetupEditAllocation(al.Id, 'FinancialCategory', e.target.value)}>
                          <option value="Expense">{t('Sinh hoạt')}</option>
                          <option value="Saving">{t('Tiết kiệm')}</option>
                          <option value="Investment">{t('Đầu tư')}</option>
                        </select>
                      </td>
                      <td>
                        <input type="text" className="form-control" style={{ padding: '6px 8px', height: '34px', fontSize: '0.85rem', width: '100%' }} value={al.Name} onChange={(e) => onSetupEditAllocation(al.Id, 'Name', e.target.value)} placeholder={t('Tên danh mục...')} />
                        <div style={{ marginTop: '6px' }}>
                          <select style={{ fontSize: '0.78rem', padding: '4px 6px', height: '28px', width: '100%', background: '#101522', border: '1px solid rgba(124,92,255,0.16)', borderRadius: '8px', color: '#e2e8f0' }} value={al.AssetId || ''} onChange={(e) => onSetupEditAllocation(al.Id, 'AssetId', e.target.value || null)}>
                            <option value="">{t('-- Liên kết tài sản --')}</option>
                            {assets.map(a => (<option key={a.Id} value={a.Id}>{a.Name}</option>))}
                          </select>
                        </div>
                      </td>
                      <td className="num">
                        <MoneyInput className="form-control" style={{ textAlign: 'right', padding: '4px 8px', width: '140px', display: 'inline-block', height: '34px', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }} value={al.setupAmount || 0} onChange={(val) => onSetupAllocationAmountChange(al.Id, val)} />
                      </td>
                      <td className="num" style={{ fontWeight:600, fontFamily:'var(--font-mono)' }}>{al.TargetPercentage.toFixed(4)}%</td>
                      <td style={{ textAlign: 'center' }}>
                        <button className="asset-action-btn delete" onClick={() => onSetupDeleteAllocation(al.Id)} title={t('Xóa danh mục')}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
                {setupAllocations.length > 0 && (
                  <tr style={{ background:'rgba(16,21,34,0.92)', fontWeight:700, borderTop:'1px solid rgba(124,92,255,0.18)' }}>
                    <td></td>
                    <td style={{ paddingLeft: '16px' }}>{t('Tổng cộng')}</td>
                    <td className="num" style={{ fontFamily:'var(--font-mono)' }}>{formatCurrency(setupTotalAmount)} ₫</td>
                    <td className="num" style={{ fontFamily:'var(--font-mono)', color: Math.abs(setupTotalPercent - 100) < 0.01 ? '#18C995' : '#F5A623' }}>{setupTotalPercent.toFixed(4)}%</td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="alloc-btn alloc-btn-secondary" onClick={onSetupAddAllocation} style={{ display:'flex', gap:'8px', alignItems:'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {t('Thêm danh mục')}
          </button>
        </div>
        <div className="asset-history-card" style={{ marginTop: '4px' }}>
          <div className="asset-history-header">
            <div>
              <div className="asset-history-title">{t('Lịch sử phân bổ')}</div>
              <div className="asset-history-subtitle">{t('Chọn một bản ghi để xem chi tiết và khôi phục')}</div>
            </div>
          </div>
          {allocationHistoryRecords.length === 0 ? (
            <div className="asset-history-empty"><div className="asset-history-empty-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg></div><div className="asset-history-empty-title">{t('Chưa có lịch sử')}</div><div className="asset-history-empty-desc">{t('Chưa có dữ liệu lịch sử. Lưu thiết lập để tạo bản ghi.')}</div></div>
          ) : (
            <AllocationHistorySection records={allocationHistoryRecords} onRestore={onRestoreAllocationHistory} onDelete={onDeleteAllocationHistory} formatDateTime={formatDateTime} formatCurrency={formatCurrency} onUpdateTime={onUpdateAllocationTime} />
          )}
        </div>
      </div>
    );
  }

  const hasAllocations = allocations.length > 0;
  const showEmpty = !hasAllocations;

  return (
    <div className="alloc-page">
      {/* HEADER */}
      <div className="alloc-header">
        <div className="alloc-header-left">
          <h2 className="alloc-title">{t('Phân Bổ Tài Sản & Cắt Giảm Ngân Sách')}</h2>
          <p className="alloc-subtitle">{t('Phân chia thu nhập vào các danh mục và tự động điều chỉnh ngân sách theo chiến lược của bạn.')}</p>
        </div>
        <div className="alloc-header-actions">
          <button className="alloc-btn alloc-btn-secondary" onClick={onStartSetup}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            {t('Thiết lập mới')}
          </button>
        </div>
      </div>

      {/* OVERVIEW 4 cards */}
      <div className="alloc-overview-grid">
        <div className="alloc-overview-card primary">
          <div className="alloc-overview-label"><span style={{ width:6, height:6, borderRadius:'50%', background:'#7C5CFF', boxShadow:'0 0 8px rgba(124,92,255,0.4)' }} />{t('Thu nhập')}</div>
          <div className="alloc-overview-value">{formatCurrency(income)} ₫</div>
          <div className="money-input-inline">
            <MoneyInput value={income} onChange={(val) => onUpdateIncome(val)} style={{ height:'32px', padding:'0 10px', borderRadius:'9px', background:'rgba(8,11,20,0.55)', border:'1px solid rgba(255,255,255,0.08)', color:'#F4F5FA', fontFamily:'var(--font-mono)', fontVariantNumeric:'tabular-nums', fontWeight:600, width:'100%', maxWidth:'160px', fontSize:'12px' }} />
          </div>
          <div className="alloc-overview-sub">{t('Tổng tiền để phân bổ')}</div>
        </div>
        <div className="alloc-overview-card">
          <div className="alloc-overview-label" style={{ color:'#F5A623' }}><span style={{ width:6, height:6, borderRadius:'50%', background:'#F5A623' }} />{t('Ngân sách mục tiêu')}</div>
          <div className="alloc-overview-value" style={{ fontSize:'22px' }}>{formatCurrency(targetReduction)} ₫</div>
          <div className="money-input-inline">
            <MoneyInput value={targetReduction} onChange={(val) => onUpdateTargetReduction(val)} style={{ height:'32px', padding:'0 10px', borderRadius:'9px', background:'rgba(8,11,20,0.55)', border:'1px solid rgba(255,255,255,0.08)', color:'#F4F5FA', fontFamily:'var(--font-mono)', fontVariantNumeric:'tabular-nums', fontWeight:600, width:'100%', maxWidth:'160px', fontSize:'12px' }} />
          </div>
          <div className="alloc-overview-sub">{t('Số tiền cần cắt giảm')}</div>
        </div>
        <div className="alloc-overview-card">
          <div className="alloc-overview-label">{t('Tổng phân bổ')}</div>
          <div className="alloc-overview-value" style={{ color: isPercentageBalanced ? '#18C995' : '#F5A623' }}>{formatCurrency(totalAllocatedCash)} ₫</div>
          <div className="alloc-overview-sub">
            <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, color: isPercentageBalanced ? '#18C995' : '#F5A623' }}>{totalAllocatedPercentage.toFixed(2)}%</span>
            <span>• {t('Đã phân bổ')}</span>
            {protectedCount > 0 && <span className="alloc-overview-delta" style={{ background:'rgba(124,92,255,0.08)', color:'#9B7CFF', borderColor:'rgba(124,92,255,0.14)', padding:'2px 6px', fontSize:'10px' }}>🛡️ {protectedCount} {t('bảo vệ')}</span>}
          </div>
        </div>
        <div className="alloc-overview-card" style={{ borderColor: remainingIsNegative ? 'rgba(255,77,103,0.18)' : remainingIsPositive ? 'rgba(245,166,35,0.16)' : 'rgba(255,255,255,0.06)' }}>
          <div className="alloc-overview-label">{t('Còn lại')}</div>
          <div className="alloc-overview-value" style={{ color: remainingIsZero ? 'var(--text-muted)' : remainingIsNegative ? '#FF4D67' : '#F5A623', fontSize:'22px' }}>
            {remainingIsZero ? `0 ₫` : `${remaining > 0 ? '+' : ''}${formatCurrency(remaining)} ₫`}
          </div>
          <div className="alloc-overview-sub">
            {remainingIsZero && <span className="alloc-overview-delta neu">— {t('Cân bằng')}</span>}
            {remainingIsPositive && <span className="alloc-overview-delta pos">+{formatCompactValue(remaining)} ₫ {t('chưa phân bổ')}</span>}
            {remainingIsNegative && <span className="alloc-overview-delta neg">{formatCompactValue(remaining)} ₫ {t('vượt mức')}</span>}
          </div>
        </div>
      </div>

      {/* HEALTH */}
      <div className="alloc-health">
        <div className="alloc-health-left">
          <span className="alloc-health-label">{t('Phân bổ')}</span>
          <div className="alloc-health-track">
            <div className={`alloc-health-fill ${healthStatus}`} style={{ width: `${healthPct}%` }} />
          </div>
          <span className={`alloc-health-meta ${healthStatus}`}>{healthPct.toFixed(1)}%</span>
          {isPercentageBalanced
            ? <span className="alloc-health-badge ok">✓ {t('Đã cân bằng')}</span>
            : <span className={`alloc-health-badge ${healthStatus}`}>⚠ {remainingIsNegative ? `${t('Thừa')} ${formatCompactValue(Math.abs(remaining))} ₫` : `${t('Thiếu')} ${formatCompactValue(Math.abs(remaining))} ₫`}</span>
          }
        </div>
        <div className="alloc-flow">
          <span className="alloc-flow-step">{t('Thu nhập')}</span>
          <span className="alloc-flow-arrow">→</span>
          <span className="alloc-flow-step active">{t('Phân bổ')}</span>
          <span className="alloc-flow-arrow">→</span>
          <span className="alloc-flow-step">{t('Danh mục')}</span>
          <span className="alloc-flow-arrow">→</span>
          <span className="alloc-flow-step">{t('Tài sản')}</span>
        </div>
      </div>

      {/* DISTRIBUTION BAR */}
      <div className="alloc-dist-card">
        <div className="alloc-dist-head">
          <div>
            <div className="alloc-dist-title">{t('Chiến lược phân bổ')}</div>
            <div className="alloc-dist-sub">{t('Tỉ trọng theo 3 khối chính — trực quan hóa dòng tiền')}</div>
          </div>
          <div className="alloc-view-toggle">
            <button className={`alloc-view-btn ${viewMode==='overview'?'active':''}`} onClick={() => setViewMode('overview')}>{t('Tổng quan')}</button>
            <button className={`alloc-view-btn ${viewMode==='detail'?'active':''}`} onClick={() => setViewMode('detail')}>{t('Chi tiết')}</button>
          </div>
        </div>
        {showEmpty ? (
          <div className="alloc-empty">{t('Chưa có cấu hình phân bổ')} — {t('Tạo cấu hình đầu tiên để bắt đầu phân chia thu nhập.')}</div>
        ) : (
          <>
            <div className="alloc-dist-bar-wrap">
              {expensePct > 0 && (
                <div className="alloc-dist-seg expense" style={{ width: `${expensePct}%` }} title={`${t('Sinh hoạt')} ${expensePct.toFixed(2)}%`}>
                  <span className="alloc-dist-seg-label">{t('Sinh hoạt')} {expensePct.toFixed(0)}%</span>
                </div>
              )}
              {savingPct > 0 && (
                <div className="alloc-dist-seg saving" style={{ width: `${savingPct}%` }} title={`${t('Tiết kiệm')} ${savingPct.toFixed(2)}%`}>
                  <span className="alloc-dist-seg-label">{t('Tiết kiệm')} {savingPct.toFixed(0)}%</span>
                </div>
              )}
              {investmentPct > 0 && (
                <div className="alloc-dist-seg investment" style={{ width: `${investmentPct}%` }} title={`${t('Đầu tư')} ${investmentPct.toFixed(2)}%`}>
                  <span className="alloc-dist-seg-label">{t('Đầu tư')} {investmentPct.toFixed(0)}%</span>
                </div>
              )}
            </div>
            <div className="alloc-dist-legends">
              <span className="alloc-dist-legend"><span className="alloc-dist-dot" style={{ background:'#4D8DFF' }} />{t('Sinh hoạt')} <b>{expensePct.toFixed(2)}%</b> <span style={{ color:'var(--text-muted)', fontFamily:'var(--font-mono)', fontSize:'11px' }}>{formatCompactValue(expenseCash)} ₫</span></span>
              <span className="alloc-dist-legend"><span className="alloc-dist-dot" style={{ background:'#7C5CFF' }} />{t('Tiết kiệm')} <b>{savingPct.toFixed(2)}%</b> <span style={{ color:'var(--text-muted)', fontFamily:'var(--font-mono)', fontSize:'11px' }}>{formatCompactValue(savingCash)} ₫</span></span>
              <span className="alloc-dist-legend"><span className="alloc-dist-dot" style={{ background:'#18C995' }} />{t('Đầu tư')} <b>{investmentPct.toFixed(2)}%</b> <span style={{ color:'var(--text-muted)', fontFamily:'var(--font-mono)', fontSize:'11px' }}>{formatCompactValue(investmentCash)} ₫</span></span>
            </div>
          </>
        )}
      </div>

      {showEmpty ? (
        <div className="alloc-empty" style={{ padding:'48px 20px' }}>
          <div style={{ width:48, height:48, borderRadius:14, background:'rgba(124,92,255,0.08)', border:'1px solid rgba(124,92,255,0.12)', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'#9B7CFF', marginBottom:12 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9h6v6H9z"/><path d="M9 3v6M15 3v6M9 15v6M15 15v6M3 9h6M3 15h6M15 9h6M15 15h6"/></svg>
          </div>
          <div style={{ fontWeight:700, color:'var(--text-primary)', fontSize:'14px' }}>{t('Chưa có cấu hình phân bổ')}</div>
          <div style={{ maxWidth:420, margin:'6px auto 0', color:'var(--text-secondary)', fontSize:'12px' }}>{t('Tạo cấu hình đầu tiên để bắt đầu phân chia thu nhập.')}</div>
          <button className="alloc-btn alloc-btn-primary" onClick={onStartSetup} style={{ marginTop:16 }}>{t('Thiết lập mới')}</button>
        </div>
      ) : viewMode === 'detail' ? (
        /* DETAILED TABLE */
        <div className="alloc-table-card">
          <div className="alloc-table-wrap">
            <table className="alloc-table">
              <thead>
                <tr>
                  <th style={{ width:'40px' }}></th>
                  <th style={{ width:'110px' }}>{t('Khối')}</th>
                  <th>{t('Thông tin phân bổ')}</th>
                  <th className="num">{t('Tỷ trọng')}</th>
                  <th className="num">{t('Số tiền')}</th>
                  <th className="num">{t('Số tiền giảm')}</th>
                  <th className="num">{t('Số tiền thực tế')}</th>
                  <th style={{ textAlign:'center' }}>{t('Loại trừ')}</th>
                  <th style={{ textAlign:'center' }}>{t('Áp dụng')}</th>
                </tr>
              </thead>
              <tbody>
                {/* Expense */}
                {sortedExpenses.map((al, idx) => (
                  <tr key={al.Id}>
                    <td style={{ textAlign:'center', color:'var(--text-muted)' }}>
                      <div className="asset-reorder">
                        <button onClick={() => handleMoveUp(al.Id, 'Expense')} disabled={idx===0}><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5l-7 7h14l-7-7z"/></svg></button>
                        <span style={{ fontSize:'11px', fontFamily:'var(--font-mono)' }}>{idx+1}</span>
                        <button onClick={() => handleMoveDown(al.Id, 'Expense')} disabled={idx===sortedExpenses.length-1}><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 19l7-7H5l7 7z"/></svg></button>
                      </div>
                    </td>
                    {idx===0 && <td rowSpan={sortedExpenses.length} className="alloc-table-col-group expense">{t('Sinh hoạt')}</td>}
                    <td style={{ fontWeight:600 }}>{al.Name}</td>
                    <td className="num" style={{ fontWeight:650 }}>{al.TargetPercentage.toFixed(4)}%</td>
                    <td className="num">{formatCurrency(al.CurrentAmount)} ₫</td>
                    <td className="num" style={{ color: al.reduction>0 ? '#F5A623' : 'var(--text-muted)' }}>{al.reduction>0 ? `↓ ${formatCurrency(al.reduction)} ₫` : '—'}</td>
                    <td className="num" style={{ fontWeight:750 }}>{formatCurrency(al.actual)} ₫</td>
                    <td style={{ textAlign:'center' }}>
                      <button className={`alloc-toggle ${al.isExcluded ? 'on' : 'off'}`} onClick={() => onToggleExclusion(al.Id)} title={al.isExcluded ? t('Đã bảo vệ — không bị cắt giảm') : t('Bấm để bảo vệ khỏi cắt giảm')} aria-label={al.isExcluded ? 'ON' : 'OFF'}>
                        <span className="alloc-toggle-knob">{al.isExcluded ? '🛡️' : '○'}</span>
                      </button>
                    </td>
                    <td style={{ textAlign:'center' }}>
                      <button className="alloc-apply-sm" onClick={() => onApplyToAsset(al)} disabled={!al.AssetId} title={al.AssetId ? t('Áp dụng sang tài sản') : t('Chưa liên kết tài sản')}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        {t('Áp dụng')}
                      </button>
                    </td>
                  </tr>
                ))}
                {/* Saving */}
                {sortedSavings.map((al, idx) => (
                  <tr key={al.Id}>
                    <td style={{ textAlign:'center', color:'var(--text-muted)' }}>
                      <div className="asset-reorder">
                        <button onClick={() => handleMoveUp(al.Id, 'Saving')} disabled={idx===0}><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5l-7 7h14l-7-7z"/></svg></button>
                        <span style={{ fontSize:'11px', fontFamily:'var(--font-mono)' }}>{idx+1}</span>
                        <button onClick={() => handleMoveDown(al.Id, 'Saving')} disabled={idx===sortedSavings.length-1}><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 19l7-7H5l7 7z"/></svg></button>
                      </div>
                    </td>
                    {idx===0 && <td rowSpan={sortedSavings.length} className="alloc-table-col-group saving">{t('Tiết kiệm')}</td>}
                    <td style={{ fontWeight:600 }}>{al.Name}</td>
                    <td className="num" style={{ fontWeight:650 }}>{al.TargetPercentage.toFixed(4)}%</td>
                    <td className="num">{formatCurrency(al.CurrentAmount)} ₫</td>
                    <td className="num" style={{ color: al.reduction>0 ? '#F5A623' : 'var(--text-muted)' }}>{al.reduction>0 ? `↓ ${formatCurrency(al.reduction)} ₫` : '—'}</td>
                    <td className="num" style={{ fontWeight:750 }}>{formatCurrency(al.actual)} ₫</td>
                    <td style={{ textAlign:'center' }}>
                      <button className={`alloc-toggle ${al.isExcluded ? 'on' : 'off'}`} onClick={() => onToggleExclusion(al.Id)}><span className="alloc-toggle-knob">{al.isExcluded ? '🛡️' : '○'}</span></button>
                    </td>
                    <td style={{ textAlign:'center' }}>
                      <button className="alloc-apply-sm" onClick={() => onApplyToAsset(al)} disabled={!al.AssetId}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> {t('Áp dụng')}
                      </button>
                    </td>
                  </tr>
                ))}
                {/* Investment */}
                {sortedInvestments.map((al, idx) => (
                  <tr key={al.Id}>
                    <td style={{ textAlign:'center', color:'var(--text-muted)' }}>
                      <div className="asset-reorder">
                        <button onClick={() => handleMoveUp(al.Id, 'Investment')} disabled={idx===0}><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5l-7 7h14l-7-7z"/></svg></button>
                        <span style={{ fontSize:'11px', fontFamily:'var(--font-mono)' }}>{idx+1}</span>
                        <button onClick={() => handleMoveDown(al.Id, 'Investment')} disabled={idx===sortedInvestments.length-1}><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 19l7-7H5l7 7z"/></svg></button>
                      </div>
                    </td>
                    {idx===0 && <td rowSpan={sortedInvestments.length} className="alloc-table-col-group investment">{t('Đầu tư')}</td>}
                    <td style={{ fontWeight:600 }}>{al.Name}</td>
                    <td className="num" style={{ fontWeight:650 }}>{al.TargetPercentage.toFixed(4)}%</td>
                    <td className="num">{formatCurrency(al.CurrentAmount)} ₫</td>
                    <td className="num" style={{ color: al.reduction>0 ? '#F5A623' : 'var(--text-muted)' }}>{al.reduction>0 ? `↓ ${formatCurrency(al.reduction)} ₫` : '—'}</td>
                    <td className="num" style={{ fontWeight:750 }}>{formatCurrency(al.actual)} ₫</td>
                    <td style={{ textAlign:'center' }}>
                      <button className={`alloc-toggle ${al.isExcluded ? 'on' : 'off'}`} onClick={() => onToggleExclusion(al.Id)}><span className="alloc-toggle-knob">{al.isExcluded ? '🛡️' : '○'}</span></button>
                    </td>
                    <td style={{ textAlign:'center' }}>
                      <button className="alloc-apply-sm" onClick={() => onApplyToAsset(al)} disabled={!al.AssetId}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> {t('Áp dụng')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td></td>
                  <td colSpan={2} style={{ textAlign:'left' }}>{t('Tổng dòng')} • {isPercentageBalanced ? t('Cân đối') : t('Chưa cân bằng')}</td>
                  <td className="num" style={{ color: isPercentageBalanced ? '#18C995' : '#F5A623' }}>{formatPercentage(totalAllocatedPercentage)}</td>
                  <td className="num">{formatCurrency(totalAllocatedCash)} ₫</td>
                  <td className="num" style={{ color:'#F5A623' }}>{formatCurrency(totalReductionAmount)} ₫</td>
                  <td className="num" style={{ color:'#18C995' }}>{formatCurrency(totalActualAmount)} ₫</td>
                  <td></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        /* OVERVIEW GRID 8/4 */
        <div className="alloc-main-grid">
          <div className="alloc-main-left">
            {/* Group blocks */}
            <div className="alloc-groups">
              {/* Expense */}
              <div className={`alloc-group ${expanded.Expense ? 'open' : ''}`}>
                <div className="alloc-group-head" onClick={() => toggleGroup('Expense')}>
                  <div className="alloc-group-icon expense">🏠</div>
                  <div className="alloc-group-meta">
                    <div className="alloc-group-name expense">{t('Sinh hoạt')} <span style={{ fontWeight:400, color:'var(--text-muted)', letterSpacing:'0.04em', textTransform:'none', fontSize:'11px' }}>{sortedExpenses.length} {t('khoản')}</span></div>
                    <div className="alloc-group-sub">{expensePct.toFixed(2)}% • {formatCompactValue(expenseCash)} ₫ • {t('Thực tế')} {formatCompactValue(expenseActual)} ₫</div>
                  </div>
                  <div className="alloc-group-right">
                    <div className="alloc-group-amounts">
                      <div className="alloc-group-total">{formatCurrency(expenseActual)} ₫</div>
                      <div className="alloc-group-pct">{expensePct.toFixed(2)}%</div>
                    </div>
                    <span className="alloc-group-chevron"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg></span>
                  </div>
                </div>
                {expanded.Expense && (
                  <div className="alloc-group-body">
                    <div className="alloc-rows">
                      {sortedExpenses.map((al) => {
                        const reductionPct = al.CurrentAmount > 0 ? (al.reduction / al.CurrentAmount) * 100 : 0;
                        const linkedAsset = assets.find(a => a.Id === al.AssetId);
                        return (
                          <div key={al.Id} className="alloc-row">
                            <div className="alloc-row-main">
                              <div className="alloc-row-name" title={al.Name}>{al.Name}{linkedAsset && <span style={{ fontWeight:400, color:'var(--text-muted)', fontSize:'11px', marginLeft:6 }}>→ {linkedAsset.Name}</span>}</div>
                              <div className="alloc-row-sub">{al.TargetPercentage.toFixed(3)}% • {formatCompactValue(al.CurrentAmount)} ₫</div>
                            </div>
                            <div className="alloc-row-metric">
                              <span className="alloc-row-label">{t('Số tiền')}</span>
                              <span className="alloc-row-value muted">{formatCurrency(al.CurrentAmount)} ₫</span>
                            </div>
                            <div className="alloc-row-metric">
                              <span className="alloc-row-label">{t('Cắt giảm')}</span>
                              <span className="alloc-row-value warn">{al.reduction>0 ? `↓ ${formatCurrency(al.reduction)} ₫` : '—'}{al.reduction>0 && reductionPct>=0.01 ? <span style={{ fontSize:'10px', marginLeft:4, opacity:0.85 }}>{reductionPct.toFixed(1)}%</span> : null}</span>
                            </div>
                            <div className="alloc-row-metric">
                              <span className="alloc-row-label">{t('Thực tế')}</span>
                              <span className="alloc-row-value strong">{formatCurrency(al.actual)} ₫</span>
                            </div>
                            <div className="alloc-row-controls">
                              <button className={`alloc-toggle ${al.isExcluded ? 'on' : 'off'}`} onClick={() => onToggleExclusion(al.Id)} title={al.isExcluded ? t('Đã bảo vệ — không bị cắt giảm. Bấm để tắt.') : t('Khoản này sẽ không bị giảm khi áp dụng cắt giảm. Bấm để bảo vệ.')} aria-label={`${t('Loại trừ cắt giảm')} ${al.isExcluded ? 'ON' : 'OFF'}`}>
                                <span className="alloc-toggle-knob">{al.isExcluded ? '🛡️' : '○'}</span>
                              </button>
                              <button className="alloc-apply-sm" onClick={() => onApplyToAsset(al)} disabled={!al.AssetId} title={al.AssetId ? t('Áp dụng sang tài sản') : t('Chưa liên kết tài sản')}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {sortedExpenses.length===0 && <div style={{ padding:'16px', textAlign:'center', color:'var(--text-muted)', fontSize:'12px' }}>{t('Chưa có khoản sinh hoạt')}</div>}
                    </div>
                  </div>
                )}
              </div>

              {/* Saving */}
              <div className={`alloc-group ${expanded.Saving ? 'open' : ''}`}>
                <div className="alloc-group-head" onClick={() => toggleGroup('Saving')}>
                  <div className="alloc-group-icon saving">💜</div>
                  <div className="alloc-group-meta">
                    <div className="alloc-group-name saving">{t('Tiết kiệm')} <span style={{ fontWeight:400, color:'var(--text-muted)', letterSpacing:'0.04em', textTransform:'none', fontSize:'11px' }}>{sortedSavings.length} {t('khoản')}</span></div>
                    <div className="alloc-group-sub">{savingPct.toFixed(2)}% • {formatCompactValue(savingCash)} ₫ • {t('Thực tế')} {formatCompactValue(savingActual)} ₫</div>
                  </div>
                  <div className="alloc-group-right">
                    <div className="alloc-group-amounts">
                      <div className="alloc-group-total">{formatCurrency(savingActual)} ₫</div>
                      <div className="alloc-group-pct">{savingPct.toFixed(2)}%</div>
                    </div>
                    <span className="alloc-group-chevron"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg></span>
                  </div>
                </div>
                {expanded.Saving && (
                  <div className="alloc-group-body">
                    <div className="alloc-rows">
                      {sortedSavings.map((al) => {
                        const reductionPct = al.CurrentAmount > 0 ? (al.reduction / al.CurrentAmount) * 100 : 0;
                        const linkedAsset = assets.find(a => a.Id === al.AssetId);
                        return (
                          <div key={al.Id} className="alloc-row">
                            <div className="alloc-row-main">
                              <div className="alloc-row-name">{al.Name}{linkedAsset && <span style={{ fontWeight:400, color:'var(--text-muted)', fontSize:'11px', marginLeft:6 }}>→ {linkedAsset.Name}</span>}</div>
                              <div className="alloc-row-sub">{al.TargetPercentage.toFixed(3)}% • {formatCompactValue(al.CurrentAmount)} ₫</div>
                            </div>
                            <div className="alloc-row-metric"><span className="alloc-row-label">{t('Số tiền')}</span><span className="alloc-row-value muted">{formatCurrency(al.CurrentAmount)} ₫</span></div>
                            <div className="alloc-row-metric"><span className="alloc-row-label">{t('Cắt giảm')}</span><span className="alloc-row-value warn">{al.reduction>0 ? `↓ ${formatCurrency(al.reduction)} ₫` : '—'}{al.reduction>0 && reductionPct>=0.01 ? <span style={{ fontSize:'10px', marginLeft:4, opacity:0.85 }}>{reductionPct.toFixed(1)}%</span> : null}</span></div>
                            <div className="alloc-row-metric"><span className="alloc-row-label">{t('Thực tế')}</span><span className="alloc-row-value strong">{formatCurrency(al.actual)} ₫</span></div>
                            <div className="alloc-row-controls">
                              <button className={`alloc-toggle ${al.isExcluded ? 'on' : 'off'}`} onClick={() => onToggleExclusion(al.Id)} title={t('Loại trừ cắt giảm')}><span className="alloc-toggle-knob">{al.isExcluded ? '🛡️' : '○'}</span></button>
                              <button className="alloc-apply-sm" onClick={() => onApplyToAsset(al)} disabled={!al.AssetId}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></button>
                            </div>
                          </div>
                        );
                      })}
                      {sortedSavings.length===0 && <div style={{ padding:'16px', textAlign:'center', color:'var(--text-muted)', fontSize:'12px' }}>{t('Chưa có khoản tiết kiệm')}</div>}
                    </div>
                  </div>
                )}
              </div>

              {/* Investment */}
              <div className={`alloc-group ${expanded.Investment ? 'open' : ''}`}>
                <div className="alloc-group-head" onClick={() => toggleGroup('Investment')}>
                  <div className="alloc-group-icon investment">📈</div>
                  <div className="alloc-group-meta">
                    <div className="alloc-group-name investment">{t('Đầu tư')} <span style={{ fontWeight:400, color:'var(--text-muted)', letterSpacing:'0.04em', textTransform:'none', fontSize:'11px' }}>{sortedInvestments.length} {t('khoản')}</span></div>
                    <div className="alloc-group-sub">{investmentPct.toFixed(2)}% • {formatCompactValue(investmentCash)} ₫ • {t('Thực tế')} {formatCompactValue(investmentActual)} ₫</div>
                  </div>
                  <div className="alloc-group-right">
                    <div className="alloc-group-amounts">
                      <div className="alloc-group-total">{formatCurrency(investmentActual)} ₫</div>
                      <div className="alloc-group-pct">{investmentPct.toFixed(2)}%</div>
                    </div>
                    <span className="alloc-group-chevron"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg></span>
                  </div>
                </div>
                {expanded.Investment && (
                  <div className="alloc-group-body">
                    <div className="alloc-rows">
                      {sortedInvestments.map((al) => {
                        const reductionPct = al.CurrentAmount > 0 ? (al.reduction / al.CurrentAmount) * 100 : 0;
                        const linkedAsset = assets.find(a => a.Id === al.AssetId);
                        return (
                          <div key={al.Id} className="alloc-row">
                            <div className="alloc-row-main">
                              <div className="alloc-row-name">{al.Name}{linkedAsset && <span style={{ fontWeight:400, color:'var(--text-muted)', fontSize:'11px', marginLeft:6 }}>→ {linkedAsset.Name}</span>}</div>
                              <div className="alloc-row-sub">{al.TargetPercentage.toFixed(3)}% • {formatCompactValue(al.CurrentAmount)} ₫</div>
                            </div>
                            <div className="alloc-row-metric"><span className="alloc-row-label">{t('Số tiền')}</span><span className="alloc-row-value muted">{formatCurrency(al.CurrentAmount)} ₫</span></div>
                            <div className="alloc-row-metric"><span className="alloc-row-label">{t('Cắt giảm')}</span><span className="alloc-row-value warn">{al.reduction>0 ? `↓ ${formatCurrency(al.reduction)} ₫` : '—'}{al.reduction>0 && reductionPct>=0.01 ? <span style={{ fontSize:'10px', marginLeft:4, opacity:0.85 }}>{reductionPct.toFixed(1)}%</span> : null}</span></div>
                            <div className="alloc-row-metric"><span className="alloc-row-label">{t('Thực tế')}</span><span className="alloc-row-value strong">{formatCurrency(al.actual)} ₫</span></div>
                            <div className="alloc-row-controls">
                              <button className={`alloc-toggle ${al.isExcluded ? 'on' : 'off'}`} onClick={() => onToggleExclusion(al.Id)}><span className="alloc-toggle-knob">{al.isExcluded ? '🛡️' : '○'}</span></button>
                              <button className="alloc-apply-sm" onClick={() => onApplyToAsset(al)} disabled={!al.AssetId}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></button>
                            </div>
                          </div>
                        );
                      })}
                      {sortedInvestments.length===0 && <div style={{ padding:'16px', textAlign:'center', color:'var(--text-muted)', fontSize:'12px' }}>{t('Chưa có khoản đầu tư')}</div>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Portfolio destination */}
            <div className="alloc-portfolio">
              <div className="alloc-portfolio-head">
                <div>
                  <div className="alloc-portfolio-title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9B7CFF" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>{t('Phân bổ vào danh mục')}</div>
                  <div className="alloc-portfolio-sub">{t('Dòng tiền sau phân bổ sẽ đi vào các tài sản đã liên kết')}</div>
                </div>
                <span style={{ fontSize:'11px', color:'var(--text-muted)', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)', padding:'4px 8px', borderRadius:999 }}>{t('Áp dụng sang Tài sản')}</span>
              </div>
              <div className="alloc-portfolio-body">
                {/* Expense destination */}
                <div className="alloc-portfolio-group">
                  <div className="alloc-portfolio-group-title expense">🏠 {t('Sinh hoạt')} • {formatCurrency(expenseActual)} ₫</div>
                  {sortedExpenses.length===0 ? <div style={{ fontSize:'12px', color:'var(--text-muted)', fontStyle:'italic' }}>{t('Chưa có khoản')}</div> : sortedExpenses.map(al => {
                    const asset = assets.find(a=>a.Id===al.AssetId);
                    return (
                      <div key={al.Id} className="alloc-portfolio-item">
                        <span className="alloc-portfolio-item-name">{al.Name}{asset ? ` → ${asset.Name}` : ''}</span>
                        <span className="alloc-portfolio-item-meta"><span className="alloc-portfolio-pct">{al.TargetPercentage.toFixed(2)}%</span><span className="alloc-portfolio-amt">{formatCurrency(al.actual)} ₫</span></span>
                      </div>
                    );
                  })}
                  <div className="alloc-portfolio-item" style={{ fontWeight:700, borderTop:'1px solid rgba(255,255,255,0.06)', marginTop:4, paddingTop:10 }}>
                    <span>{t('Tổng sinh hoạt')}</span><span className="alloc-portfolio-amt">{formatCurrency(expenseActual)} ₫</span>
                  </div>
                </div>
                <div className="alloc-portfolio-group">
                  <div className="alloc-portfolio-group-title saving">💜 {t('Tiết kiệm')} • {formatCurrency(savingActual)} ₫</div>
                  {sortedSavings.map(al => {
                    const asset = assets.find(a=>a.Id===al.AssetId);
                    return (
                      <div key={al.Id} className="alloc-portfolio-item">
                        <span className="alloc-portfolio-item-name">{al.Name}{asset ? ` → ${asset.Name}` : ''}</span>
                        <span className="alloc-portfolio-item-meta"><span className="alloc-portfolio-pct">{al.TargetPercentage.toFixed(2)}%</span><span className="alloc-portfolio-amt">{formatCurrency(al.actual)} ₫</span></span>
                      </div>
                    );
                  })}
                  {sortedSavings.length===0 && <div style={{ fontSize:'12px', color:'var(--text-muted)', fontStyle:'italic' }}>{t('Chưa có khoản')}</div>}
                  <div className="alloc-portfolio-item" style={{ fontWeight:700, borderTop:'1px solid rgba(255,255,255,0.06)', marginTop:4, paddingTop:10 }}>
                    <span>{t('Tổng tiết kiệm')}</span><span className="alloc-portfolio-amt">{formatCurrency(savingActual)} ₫</span>
                  </div>
                </div>
                {sortedInvestments.length>0 && (
                  <div className="alloc-portfolio-group">
                    <div className="alloc-portfolio-group-title investment">📈 {t('Đầu tư')} • {formatCurrency(investmentActual)} ₫</div>
                    {sortedInvestments.map(al => {
                      const asset = assets.find(a=>a.Id===al.AssetId);
                      return (
                        <div key={al.Id} className="alloc-portfolio-item">
                          <span className="alloc-portfolio-item-name">{al.Name}{asset ? ` → ${asset.Name}` : ''}</span>
                          <span className="alloc-portfolio-item-meta"><span className="alloc-portfolio-pct">{al.TargetPercentage.toFixed(2)}%</span><span className="alloc-portfolio-amt">{formatCurrency(al.actual)} ₫</span></span>
                        </div>
                      );
                    })}
                    <div className="alloc-portfolio-item" style={{ fontWeight:700, borderTop:'1px solid rgba(255,255,255,0.06)', marginTop:4, paddingTop:10 }}>
                      <span>{t('Tổng đầu tư')}</span><span className="alloc-portfolio-amt">{formatCurrency(investmentActual)} ₫</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="alloc-main-right">
            {/* Preview */}
            <div className="alloc-preview">
              <div className="alloc-preview-head">
                <div className="alloc-preview-title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7C5CFF" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>{t('Xem trước phân bổ')}</div>
                <span style={{ fontSize:'11px', color: isPercentageBalanced ? '#18C995' : '#F5A623', fontWeight:700 }}>{isPercentageBalanced ? `✓ ${t('Cân bằng')}` : `⚠ ${totalAllocatedPercentage.toFixed(1)}%`}</span>
              </div>
              <div className="alloc-preview-body">
                <div className="alloc-preview-row"><span className="label">{t('Thu nhập')}</span><span className="value">{formatCurrency(income)} ₫</span></div>
                <div className="alloc-preview-row"><span className="label">🏠 {t('Sinh hoạt')}</span><span className="value">{formatCurrency(expenseActual)} ₫</span></div>
                <div className="alloc-preview-row"><span className="label">💜 {t('Tiết kiệm')}</span><span className="value">{formatCurrency(savingActual)} ₫</span></div>
                {sortedInvestments.length>0 && <div className="alloc-preview-row"><span className="label">📈 {t('Đầu tư')}</span><span className="value">{formatCurrency(investmentActual)} ₫</span></div>}
                <div style={{ height:1, background:'rgba(255,255,255,0.06)', margin:'2px 0' }} />
                <div className="alloc-preview-row"><span className="label">{t('Cắt giảm')}</span><span className="value" style={{ color:'#F5A623' }}>↓ {formatCurrency(totalReductionAmount)} ₫</span></div>
                {protectedCount>0 && <div className="alloc-preview-row"><span className="label">🛡️ {t('Bảo vệ')}</span><span className="value" style={{ color:'#9B7CFF', fontSize:'12px' }}>{protectedCount} {t('khoản được bảo vệ')}</span></div>}
                <div className="alloc-preview-row total"><span className="label">{t('Tổng thực tế')}</span><span className="value" style={{ color:'#18C995' }}>{formatCurrency(totalActualAmount)} ₫</span></div>
                <div className={`alloc-preview-status ${isPercentageBalanced ? 'ok' : healthStatus==='warn' ? 'warn' : 'bad'}`}>
                  {isPercentageBalanced ? <>✓ {t('Phân bổ cân bằng — sẵn sàng áp dụng')}</> : <>{t('Phân bổ chưa cân bằng')} • {remainingIsPositive ? `${t('Còn thiếu')} ${formatCurrency(Math.abs(remaining))} ₫` : `${t('Vượt')} ${formatCurrency(Math.abs(remaining))} ₫`}</>}
                </div>
              </div>
              <div className="alloc-preview-actions">
                <button className="alloc-btn alloc-btn-primary" style={{ width:'100%', justifyContent:'center', height:44, fontSize:'14px' }} onClick={() => setConfirmOpen(true)} disabled={!isPercentageBalanced}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  {t('Áp dụng phân bổ')}
                </button>
                <div className="alloc-preview-note">{t('Các thay đổi sẽ được cập nhật vào danh mục tài sản đã liên kết.')}</div>
                {!isPercentageBalanced && <div style={{ fontSize:'11px', color:'#F5A623', textAlign:'center' }}>{t('Cần cân bằng 100% mới có thể áp dụng.')}</div>}
              </div>
            </div>

            {/* Quick stats */}
            <div className="alloc-portfolio" style={{ padding:'14px' }}>
              <div style={{ fontSize:'11px', fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:10 }}>{t('Tóm tắt dòng tiền')}</div>
              <div style={{ display:'grid', gap:8, fontSize:'12px' }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'var(--text-secondary)' }}>{t('Tỉ trọng')}</span><b style={{ fontFamily:'var(--font-mono)' }}>{totalAllocatedPercentage.toFixed(2)}%</b></div>
                <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'var(--text-secondary)' }}>{t('Số tiền giảm')}</span><b style={{ fontFamily:'var(--font-mono)', color:'#F5A623' }}>{formatCurrency(totalReductionAmount)} ₫</b></div>
                <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'var(--text-secondary)' }}>{t('Còn lại')}</span><b style={{ fontFamily:'var(--font-mono)', color: remainingIsZero ? 'var(--text-muted)' : remainingIsNegative ? '#FF4D67' : '#F5A623' }}>{remainingIsZero ? '0 ₫' : `${remaining>0?'+':''}${formatCurrency(remaining)} ₫`}</b></div>
                <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'var(--text-secondary)' }}>🛡️ {t('Bảo vệ')}</span><b>{protectedCount}</b></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {confirmOpen && (
        <div className="alloc-confirm-overlay" onClick={() => setConfirmOpen(false)}>
          <div className="alloc-confirm" onClick={e => e.stopPropagation()}>
            <div className="alloc-confirm-head">
              <div className="alloc-confirm-title"><span style={{ width:32, height:32, borderRadius:10, background:'rgba(124,92,255,0.12)', border:'1px solid rgba(124,92,255,0.16)', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'#9B7CFF' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>{t('Xác nhận phân bổ')}</div>
              <button onClick={() => setConfirmOpen(false)} style={{ width:28, height:28, borderRadius:8, border:'1px solid var(--border)', background:'rgba(255,255,255,0.04)', color:'var(--text-muted)', cursor:'pointer' }}>✕</button>
            </div>
            <div className="alloc-confirm-body">
              <p style={{ fontSize:'13px', color:'var(--text-secondary)', lineHeight:1.5 }}>{t('Bạn sắp phân bổ')} <b style={{ color:'var(--text-primary)', fontFamily:'var(--font-mono)' }}>{formatCurrency(totalActualAmount)} ₫</b> {t('vào các danh mục. Các thay đổi sẽ được cập nhật vào tài sản đã liên kết.')}</p>
              <div className="alloc-confirm-summary">
                <div className="alloc-confirm-row"><span className="l">🏠 {t('Sinh hoạt')}</span><span className="v">{formatCurrency(expenseActual)} ₫</span></div>
                <div className="alloc-confirm-row"><span className="l">💜 {t('Tiết kiệm')}</span><span className="v">{formatCurrency(savingActual)} ₫</span></div>
                {sortedInvestments.length>0 && <div className="alloc-confirm-row"><span className="l">📈 {t('Đầu tư')}</span><span className="v">{formatCurrency(investmentActual)} ₫</span></div>}
                <div className="alloc-confirm-row" style={{ fontWeight:750, borderTop:'1px solid rgba(255,255,255,0.08)', marginTop:6, paddingTop:10 }}><span className="l">{t('Tổng thực tế')}</span><span className="v" style={{ color:'#18C995' }}>{formatCurrency(totalActualAmount)} ₫</span></div>
                <div className="alloc-confirm-row"><span className="l">{t('Thu nhập')}</span><span className="v">{formatCurrency(income)} ₫</span></div>
                <div className="alloc-confirm-row"><span className="l" style={{ color:'#F5A623' }}>{t('Cắt giảm')}</span><span className="v" style={{ color:'#F5A623' }}>↓ {formatCurrency(totalReductionAmount)} ₫</span></div>
              </div>
              <div style={{ fontSize:'11px', color:'var(--text-muted)', textAlign:'center' }}>{t('Hành động này sẽ cộng dồn số tiền vào Giá trị hiện tại của tài sản tương ứng.')}</div>
            </div>
            <div className="alloc-confirm-actions">
              <button className="alloc-btn alloc-btn-secondary" onClick={() => setConfirmOpen(false)} disabled={isApplying}>{t('Hủy')}</button>
              <button className="alloc-btn alloc-btn-primary" onClick={handleGlobalApply} disabled={isApplying}>
                {isApplying ? <><span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.6s linear infinite' }} /> {t('Đang áp dụng...')}</> : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg> {t('Xác nhận áp dụng')}</>}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// 5. GOALS PAGE COMPONENT


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
  const [errorMessage, setErrorMessage] = useState('');
  const [showErrorPopup, setShowErrorPopup] = useState(false);

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
    if (formAmount <= 0) {
      setErrorMessage(t('Số tiền mục tiêu phải lớn hơn 0'));
      setShowErrorPopup(true);
      return;
    }
    if (formStartDate && new Date(formStartDate) > new Date(formDueDate)) {
      setErrorMessage(t('Ngày bắt đầu không thể sau ngày đến hạn'));
      setShowErrorPopup(true);
      return;
    }
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
      setErrorMessage(err.message);
      setShowErrorPopup(true);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('Bạn có chắc chắn muốn xóa mục tiêu này?'))) return;
    try {
      await goalService.delete(id);
      await onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message);
      setShowErrorPopup(true);
    }
  };

  const handleStart = async (id: string) => {
    try {
      await goalService.start(id);
      await onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message);
      setShowErrorPopup(true);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm(t('Bạn có chắc chắn muốn hủy mục tiêu này?'))) return;
    try {
      await goalService.cancel(id);
      await onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message);
      setShowErrorPopup(true);
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

  // Sort goals: processing first, not started second, completed last; then by newest created
  const sortedGoals = [...goals].sort((a, b) => {
    const statusOrder: Record<string, number> = { Processing: 0, NotStarted: 1, Successed: 2, Failed: 3, Cancelled: 4 };
    const aOrder = statusOrder[a.Status] ?? 99;
    const bOrder = statusOrder[b.Status] ?? 99;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime();
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

      {/* Error Popup */}
      {showErrorPopup && (
        <div className="modal-overlay" style={{ zIndex: 3000 }}>
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: '#ef4444' }}>{t('Lỗi')}</h3>
              <button className="modal-close" onClick={() => setShowErrorPopup(false)}>✕</button>
            </div>
            <div style={{ padding: '20px', fontSize: '0.9rem' }}>
              {errorMessage}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-primary" onClick={() => setShowErrorPopup(false)}>{t('Đóng')}</button>
            </div>
          </div>
        </div>
      )}

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
    const raw = e.target.value.replace(/-/g, '');
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

// 5. DEBT MANAGEMENT — Premium Debt Control Center
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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [closeConfirmId, setCloseConfirmId] = useState<string | null>(null);
  const [saveConfirmData, setSaveConfirmData] = useState<any>(null);
  // new UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'upcoming' | 'closed'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'remainingDesc' | 'dueAsc' | 'interestDesc' | 'createdDesc'>('remainingDesc');
  const [drawerDebt, setDrawerDebt] = useState<any>(null);
  const [historyFilter, setHistoryFilter] = useState<'all' | '30d' | '3m' | '1y'>('all');
  const [dropdownId, setDropdownId] = useState<string | null>(null);

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
    setDropdownId(null);
  };
  const handleSaveDebt = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setSaveConfirmData(payload);
    } else {
      await doSaveDebt(payload);
    }
  };
  const doSaveDebt = async (payload: any) => {
    try {
      if (editingDebt) {
        await debtService.update(editingDebt.Id, payload, userId);
      } else {
        await debtService.create(payload, userId);
      }
      setShowModal(false);
      setSaveConfirmData(null);
      setEditingDebt(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || t('Có lỗi xảy ra'));
    }
  };
  const handleDelete = async (id: string) => {
    setDeleteConfirmId(id);
    setDropdownId(null);
  };
  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await debtService.delete(deleteConfirmId);
      setDeleteConfirmId(null);
      if (drawerDebt?.Id === deleteConfirmId) setDrawerDebt(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || t('Có lỗi xảy ra'));
      setDeleteConfirmId(null);
    }
  };
  const handleClose = async (id: string) => {
    setCloseConfirmId(id);
    setDropdownId(null);
  };
  const confirmClose = async () => {
    if (!closeConfirmId) return;
    try {
      await debtService.close(closeConfirmId);
      setCloseConfirmId(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || t('Có lỗi xảy ra'));
      setCloseConfirmId(null);
    }
  };
  const openPaymentModal = (debt: any) => {
    setPayingDebt(debt);
    setPaymentAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentNote('');
    setPayingError('');
    setShowPaymentModal(true);
    setDropdownId(null);
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
  // legacy toggle kept for compat
  void expandedId; void setExpandedId;
  const formatDate = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };
  // derived
  const totalDebtCount = debts.length;
  const totalOutstanding = debts.reduce((s, d) => s + (d.RemainingAmount ?? (d.TotalDebt - d.PaidAmount)), 0);
  const totalPaid = debts.reduce((s, d) => s + (d.PaidAmount || 0), 0);
  const totalInitial = debts.reduce((s, d) => s + (d.TotalDebt || 0), 0);
  const healthPct = totalInitial > 0 ? Math.round((totalPaid / totalInitial) * 100) : 0;
  const healthStatus: 'ok' | 'warn' | 'bad' = healthPct >= 70 ? 'ok' : healthPct >= 40 ? 'warn' : totalOutstanding > 0 ? 'bad' : 'ok';
  const healthLabel = healthPct >= 80 ? t('Đang kiểm soát tốt') : healthPct >= 50 ? t('Đang kiểm soát') : totalOutstanding === 0 ? t('Đã hoàn tất') : t('Cần chú ý');
  const getRemaining = (d: any) => d.RemainingAmount ?? (d.TotalDebt - (d.PaidAmount || 0));
  const isOverdue = (d: any) => !d.IsClosed && getRemaining(d) > 0 && d.DueDate && new Date(d.DueDate) < new Date(new Date().setHours(0,0,0,0));
  const overdueDebts = debts.filter(isOverdue);
  const totalOverdue = overdueDebts.reduce((s, d) => s + getRemaining(d), 0);
  const upcomingDebts = [...debts].filter(d => !d.IsClosed && d.DueDate && getRemaining(d) > 0).sort((a,b) => new Date(a.DueDate).getTime() - new Date(b.DueDate).getTime()).slice(0,5);
  const highInterestDebts = [...debts].filter(d => d.InterestRate != null && d.InterestRate > 0 && !d.IsClosed && getRemaining(d) > 0).sort((a,b) => (b.InterestRate||0) - (a.InterestRate||0)).slice(0,3);
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
    const now = new Date(); now.setHours(23,59,59,999);
    const dueDate = d.DueDate ? new Date(d.DueDate) : null; dueDate?.setHours(23,59,59,999);
    if (dueDate && dueDate < now) {
      if (dueDate > prevDate) {
        const termDays = (dueDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
        totalInterest += balance * rate * (termDays / 365);
        prevDate = dueDate;
      }
      if (balance > 0 && now > prevDate) {
        const overdueDays = (now.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
        totalInterest += balance * rate * (overdueDays / 365);
      }
    } else {
      if (now > prevDate) {
        const finalDays = (now.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
        totalInterest += balance * rate * (finalDays / 365);
      }
    }
    return totalInterest;
  };
  const getDaysUntil = (due: string) => {
    const now = new Date(); now.setHours(0,0,0,0);
    const d = new Date(due); d.setHours(0,0,0,0);
    return Math.round((d.getTime() - now.getTime()) / (1000*60*60*24));
  };
  const getDueColor = (d: any) => {
    if (d.IsClosed || getRemaining(d) <= 0) return { tone:'green', label: t('Đã thanh toán'), icon:'green' };
    if (!d.DueDate) return { tone:'neutral', label: t('Không kỳ hạn'), icon:'neutral' };
    const days = getDaysUntil(d.DueDate);
    if (days < 0) return { tone:'red', label: `${t('Quá hạn')} ${Math.abs(days)} ${t('ngày')}`, icon:'red' };
    if (days <= 7) return { tone:'orange', label: `${t('Còn')} ${days} ${t('ngày')}`, icon:'orange' };
    if (days <= 30) return { tone:'amber', label: `${t('Còn')} ${days} ${t('ngày')}`, icon:'amber' };
    return { tone:'neutral', label: `${t('Còn')} ${days} ${t('ngày')}`, icon:'neutral' };
  };
  const getStatusBadge = (debt: any) => {
    if (debt.IsClosed || getRemaining(debt) <= 0) return { text: t('Đã đóng'), cls: 'green' };
    if (isOverdue(debt)) return { text: t('Quá hạn'), cls: 'red' };
    if (debt.DueDate) {
      const days = getDaysUntil(debt.DueDate);
      if (days >=0 && days <=7) return { text: t('Sắp đến hạn'), cls: 'amber' };
    }
    return { text: t('Đang vay'), cls: 'violet' };
  };
  const getTypeBadge = (type: string) => {
    if (type === 'Lent') return { text: t('Cho vay'), cls: 'amber' };
    return { text: t('Vay'), cls: 'violet' };
  };
  // filter + sort
  const filtered = debts.filter(d => {
    const q = searchQuery.trim().toLowerCase();
    if (q && !String(d.Name||'').toLowerCase().includes(q) && !String(d.Note||'').toLowerCase().includes(q)) return false;
    if (typeFilter !== 'all' && (d.Type||'Borrowed') !== typeFilter) return false;
    if (statusFilter !== 'all') {
      const st = getStatusBadge(d).cls;
      if (statusFilter === 'active' && !(st==='violet' || st==='amber' || st==='red')) return false;
      if (statusFilter === 'upcoming' && st !== 'amber' && st !== 'red') return false;
      if (statusFilter === 'closed' && st !== 'green') return false;
      if (statusFilter === 'closed' && isOverdue(d)) return false; // overdue not closed
    }
    return true;
  }).sort((a,b) => {
    if (sortBy==='remainingDesc') return getRemaining(b)-getRemaining(a);
    if (sortBy==='dueAsc') {
      if (!a.DueDate) return 1;
      if (!b.DueDate) return -1;
      return new Date(a.DueDate).getTime() - new Date(b.DueDate).getTime();
    }
    if (sortBy==='interestDesc') return (b.InterestRate||0)-(a.InterestRate||0);
    return new Date(b.BorrowDate||0).getTime() - new Date(a.BorrowDate||0).getTime();
  });
  // payment history flattened
  const allPayments = debts.flatMap(d => (d.Payments||[]).map((p:any)=> ({...p, debtName: d.Name, debtId: d.Id }))).sort((a:any,b:any)=> new Date(b.PaymentDate||b.CreatedAt).getTime() - new Date(a.PaymentDate||a.CreatedAt).getTime());
  const filteredPayments = allPayments.filter((p:any)=>{
    if (historyFilter==='all') return true;
    const d = new Date(p.PaymentDate||p.CreatedAt);
    const now = new Date();
    const diff = (now.getTime() - d.getTime())/(1000*60*60*24);
    if (historyFilter==='30d') return diff <=30;
    if (historyFilter==='3m') return diff <=90;
    if (historyFilter==='1y') return diff <=365;
    return true;
  }).slice(0,50);
  // distribution by Type
  const typeGroups: Record<string, {count:number, total:number}> = {};
  debts.forEach(d=>{
    const tp = d.Type||'Borrowed';
    if (!typeGroups[tp]) typeGroups[tp] = {count:0,total:0};
    typeGroups[tp].count++;
    typeGroups[tp].total += d.TotalDebt||0;
  });
  const distEntries = Object.entries(typeGroups).sort((a,b)=>b[1].total-a[1].total);
  const maxDistTotal = Math.max(1, ...distEntries.map(([,v])=>v.total));
  void maxDistTotal;
  useEffect(()=>{
    const onClickOutside = () => setDropdownId(null);
    document.addEventListener('click', onClickOutside);
    return ()=> document.removeEventListener('click', onClickOutside);
  },[]);

  return (
    <div className="debt-page">
      <div className="debt-header">
        <div className="debt-header-left">
          <h2 className="debt-title">{t('Quản lý nợ')}</h2>
          <p className="debt-subtitle">{t('Theo dõi dư nợ, lãi suất, lịch thanh toán và tiến độ trả nợ.')}</p>
        </div>
        <div className="debt-header-actions">
          <button className="debt-btn debt-btn-primary" onClick={openCreate}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {t('Thêm khoản nợ')}
          </button>
        </div>
      </div>

      {/* Overview 4 cards */}
      <div className="debt-overview-grid">
        <div className="debt-overview-card">
          <div className="debt-overview-label"><span style={{width:6,height:6,borderRadius:'50%',background:'#7C5CFF',boxShadow:'0 0 8px rgba(124,92,255,0.4)'}} />{t('Tổng khoản nợ')}</div>
          <div className="debt-overview-value">{totalDebtCount}</div>
          <div className="debt-overview-sub">{t('khoản')} • {distEntries.length} {t('loại')}</div>
        </div>
        <div className="debt-overview-card primary" style={{ borderColor: totalOutstanding>0 ? 'rgba(255,77,103,0.14)' : 'rgba(24,201,149,0.14)' }}>
          <div className="debt-overview-label" style={{color: totalOutstanding>0 ? '#FF6B8A' : '#18C995'}}><span style={{width:6,height:6,borderRadius:'50%',background: totalOutstanding>0 ? '#FF4D67' : '#18C995'}} />{t('Dư nợ hiện tại')}</div>
          <div className="debt-overview-value" style={{color: totalOutstanding>0 ? '#FF4D67' : '#18C995'}}>{formatCurrency(totalOutstanding)} ₫</div>
          <div className="debt-overview-sub">{t('Tổng ban đầu')}: <b style={{fontFamily:'var(--font-mono)',color:'var(--text-primary)'}}>{formatCurrency(totalInitial)} ₫</b></div>
        </div>
        <div className="debt-overview-card">
          <div className="debt-overview-label" style={{color:'#18C995'}}><span style={{width:6,height:6,borderRadius:'50%',background:'#18C995'}} />{t('Đã thanh toán')}</div>
          <div className="debt-overview-value" style={{color:'#18C995'}}>{formatCurrency(totalPaid)} ₫</div>
          <div className="debt-overview-sub">{totalInitial>0 ? `${healthPct}% ${t('đã trả')}` : t('Chưa có dữ liệu')}</div>
        </div>
        <div className="debt-overview-card">
          <div className="debt-overview-label"><span style={{width:6,height:6,borderRadius:'50%',background:'#F5A623'}} />{t('Sắp đến hạn')}</div>
          <div className="debt-overview-value" style={{fontSize: upcomingDebts.length? '22px':'24px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{upcomingDebts.length ? `${upcomingDebts.length} ${t('khoản')}` : '—'}</div>
          <div className="debt-overview-sub">{upcomingDebts[0] ? <span style={{color:'var(--text-primary)',fontFamily:'var(--font-mono)',fontWeight:600}}>{upcomingDebts[0].Name}</span> : t('Không có khoản sắp hạn')}</div>
        </div>
      </div>

      {/* Overdue alert */}
      {overdueDebts.length>0 && (
        <div className="debt-overdue-alert">
          <div className="debt-overdue-main">
            <span className="debt-overdue-dot" />
            <span>⚠ {overdueDebts.length} {t('khoản nợ quá hạn')}</span>
            <span className="debt-overdue-meta">{formatCurrency(totalOverdue)} ₫</span>
          </div>
          <button className="debt-btn debt-btn-ghost" style={{height:32, padding:'0 12px', fontSize:12}} onClick={()=>{ setStatusFilter('upcoming'); const el=document.getElementById('debt-list-anchor'); el?.scrollIntoView({behavior:'smooth'}); }}>{t('Xem khoản nợ')}</button>
        </div>
      )}

      {/* Health + Upcoming */}
      <div className="debt-insights-grid">
        <div className="debt-health-card">
          <div className="debt-card-title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9B7CFF" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>{t('Sức khỏe khoản nợ')}</div>
          <div className="debt-health-main">
            <div className="debt-health-ring">
              <svg width="84" height="84" viewBox="0 0 84 84">
                <circle cx="42" cy="42" r="36" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                <circle cx="42" cy="42" r="36" fill="none" stroke={healthStatus==='ok' ? '#18C995' : healthStatus==='warn' ? '#F5A623' : '#FF4D67'} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(healthPct/100)*226.19} 226.19`} transform="rotate(-90 42 42)" style={{transition:'stroke-dasharray 600ms ease-out'}} />
              </svg>
              <div className="debt-health-center">
                <div className="debt-health-pct">{healthPct}%</div>
                <div className="debt-health-label">{t('đã trả')}</div>
              </div>
            </div>
            <div className="debt-health-info">
              <div className="debt-health-value">{formatCurrency(totalOutstanding)} ₫</div>
              <div className="debt-health-sub">{t('Dư nợ hiện tại')}</div>
              <div style={{fontSize:11,color:'var(--text-muted)',marginTop:4}}>{t('Đã trả')} {formatCurrency(totalPaid)} / {formatCurrency(totalInitial)} ₫</div>
            </div>
          </div>
          <div className="debt-health-track"><div className={`debt-health-fill ${healthStatus}`} style={{width:`${healthPct}%`}} /></div>
          <div className={`debt-health-status ${healthStatus}`}>
            {healthStatus==='ok' ? `✓ ${healthLabel}` : healthStatus==='warn' ? `⚠ ${healthLabel}` : `⚠ ${healthLabel}`}
          </div>
        </div>

        <div className="debt-upcoming-card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div className="debt-card-title" style={{marginBottom:0}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>{t('Sắp đến hạn')}</div>
            <span style={{fontSize:11,color:'var(--text-muted)',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)',padding:'3px 8px',borderRadius:999}}>{upcomingDebts.length} {t('khoản')}</span>
          </div>
          {upcomingDebts.length===0 ? (
            <div className="debt-empty" style={{padding:'20px 12px'}}>{t('Không có khoản sắp đến hạn')}</div>
          ) : (
            <div className="debt-upcoming-list">
              {upcomingDebts.map(d=>{
                const due = getDueColor(d);
                const remain = getRemaining(d);
                return (
                  <div key={d.Id} className={`debt-upcoming-item ${due.tone==='red'?'overdue': due.tone==='amber'||due.tone==='orange'?'due-soon':''}`} onClick={()=> setDrawerDebt(d)}>
                    <div className={`debt-upcoming-icon ${due.icon}`}>{due.tone==='red'?'⚠': due.tone==='green'?'✓':'◷'}</div>
                    <div className="debt-upcoming-main">
                      <div className="debt-upcoming-name">{d.Name}</div>
                      <div className="debt-upcoming-meta">{t('Hạn')}: {formatDate(d.DueDate)} • {d.InterestRate!=null? `${d.InterestRate}%`: t('Không lãi')}</div>
                    </div>
                    <div className="debt-upcoming-right">
                      <div className="debt-upcoming-amount">{formatCurrency(remain)} ₫</div>
                      <div className={`debt-upcoming-due ${due.tone}`}>{due.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Distribution + High interest */}
      <div className="debt-secondary-grid">
        <div className="debt-dist-card">
          <div className="debt-card-title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4D8DFF" strokeWidth="2"><path d="M3 3h18v18H3z"/><path d="M3 9h18M9 21V9"/></svg>{t('Phân bổ khoản nợ')}</div>
          {distEntries.length===0 ? (
            <div className="debt-empty">{t('Chưa có dữ liệu')}</div>
          ) : (
            <div style={{display:'flex',flexDirection:'column'}}>
              {distEntries.map(([tp, v])=>{
                const pct = totalInitial>0 ? (v.total/totalInitial)*100 : 0;
                const label = tp==='Lent'? t('Cho vay') : tp==='Borrowed'? t('Vay') : tp;
                const color = tp==='Lent' ? '#F5A623' : '#7C5CFF';
                return (
                  <div key={tp} className="debt-dist-row">
                    <span className="debt-dist-label">{label} • {v.count} {t('khoản')}</span>
                    <span className="debt-dist-bar"><span className="debt-dist-fill" style={{width:`${pct}%`, background: color}} /></span>
                    <span className="debt-dist-pct">{pct.toFixed(1)}%</span>
                    <span className="debt-dist-val">{formatCurrency(v.total)} ₫</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="debt-interest-card">
          <div className="debt-card-title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>{t('Khoản nợ lãi suất cao')}</div>
          {highInterestDebts.length===0 ? (
            <div className="debt-empty" style={{padding:'20px 12px'}}>{t('Không có khoản lãi cao')}</div>
          ) : (
            <div>
              {highInterestDebts.map(d=>(
                <div key={d.Id} className="debt-interest-item" onClick={()=> setDrawerDebt(d)} style={{cursor:'pointer'}}>
                  <div className="debt-interest-main">
                    <div className="debt-interest-name">{d.Name}</div>
                    <div className="debt-interest-meta">{formatCurrency(getRemaining(d))} ₫ {t('còn lại')} • {formatDate(d.BorrowDate)}</div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span className="debt-interest-badge">{d.InterestRate}%</span>
                    <span className="debt-interest-amt">{formatCurrency(getRemaining(d))} ₫</span>
                  </div>
                </div>
              ))}
              <div style={{fontSize:11,color:'var(--text-muted)',marginTop:8,display:'flex',alignItems:'center',gap:6}}><span style={{width:6,height:6,borderRadius:'50%',background:'#F5A623'}} />{t('Ưu tiên trả các khoản lãi cao trước')}</div>
            </div>
          )}
        </div>
      </div>

      {/* List header + toolbar */}
      <div id="debt-list-anchor" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap',marginTop:4}}>
        <div>
          <h3 style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:15,letterSpacing:'-0.02em'}}>{t('Tất cả khoản nợ')}</h3>
          <div style={{fontSize:12,color:'var(--text-secondary)',marginTop:2}}>{filtered.length} / {debts.length} {t('khoản')} • {t('Dư nợ')}: <b style={{fontFamily:'var(--font-mono)',color:'var(--text-primary)'}}>{formatCurrency(filtered.reduce((s,d)=>s+getRemaining(d),0))} ₫</b></div>
        </div>
      </div>

      <div className="debt-toolbar">
        <div className="debt-search-wrap">
          <span className="debt-search-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg></span>
          <input className="debt-search-input" placeholder={t('Tìm khoản nợ...')} value={searchQuery} onChange={e=> setSearchQuery(e.target.value)} />
        </div>
        <div className="debt-filter-pills">
          <button className={`debt-pill ${statusFilter==='all'?'active':''}`} onClick={()=> setStatusFilter('all')}>{t('Tất cả')}</button>
          <button className={`debt-pill ${statusFilter==='active'?'active':''}`} onClick={()=> setStatusFilter('active')}>{t('Đang vay')}</button>
          <button className={`debt-pill ${statusFilter==='upcoming'?'active amber':''}`} onClick={()=> setStatusFilter('upcoming')}>{t('Sắp đến hạn')}</button>
          <button className={`debt-pill ${statusFilter==='closed'?'active green':''}`} onClick={()=> setStatusFilter('closed')}>{t('Đã đóng')}</button>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <select value={typeFilter} onChange={e=> setTypeFilter(e.target.value)} style={{height:32,padding:'0 10px',borderRadius:999,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)',color:'var(--text-primary)',fontSize:12}}>
            <option value="all">{t('Loại nợ')}</option>
            <option value="Borrowed">{t('Vay')}</option>
            <option value="Lent">{t('Cho vay')}</option>
          </select>
          <select value={sortBy} onChange={e=> setSortBy(e.target.value as any)} style={{height:32,padding:'0 10px',borderRadius:999,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)',color:'var(--text-primary)',fontSize:12}}>
            <option value="remainingDesc">{t('Dư nợ')} ↓</option>
            <option value="dueAsc">{t('Hạn trả')} ↑</option>
            <option value="interestDesc">{t('Lãi suất')} ↓</option>
            <option value="createdDesc">{t('Ngày tạo')} ↓</option>
          </select>
        </div>
      </div>

      {/* Debt list */}
      {debts.length===0 ? (
        <div className="debt-empty" style={{background:'#101522',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:'48px 20px'}}>
          <div style={{width:48,height:48,borderRadius:14,background:'rgba(124,92,255,0.08)',border:'1px solid rgba(124,92,255,0.12)',display:'inline-flex',alignItems:'center',justifyContent:'center',color:'#9B7CFF',marginBottom:12}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </div>
          <div style={{fontWeight:700,color:'var(--text-primary)',fontSize:14}}>{t('Bạn chưa có khoản nợ nào')}</div>
          <div style={{maxWidth:420,margin:'6px auto 0',color:'var(--text-secondary)',fontSize:12}}>{t('Thêm khoản nợ để bắt đầu theo dõi lịch thanh toán và chi phí lãi.')}</div>
          <button className="debt-btn debt-btn-primary" onClick={openCreate} style={{marginTop:16}}>{t('Thêm khoản nợ')}</button>
        </div>
      ) : filtered.length===0 ? (
        <div className="debt-empty" style={{background:'#101522',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:'32px'}}>{t('Không tìm thấy khoản nợ phù hợp bộ lọc')}</div>
      ) : (
        <div className="debt-table-card">
          <div className="debt-table-wrap">
            <table className="debt-table">
              <thead>
                <tr>
                  <th>{t('Tên')}</th>
                  <th>{t('Loại')}</th>
                  <th className="num">{t('Tổng nợ')}</th>
                  <th className="num">{t('Đã trả')}</th>
                  <th className="num">{t('Còn lại')}</th>
                  <th style={{textAlign:'center'}}>{t('Lãi suất')}</th>
                  <th className="num">{t('Tiền lãi')}</th>
                  <th style={{textAlign:'center'}}>{t('Ngày vay')}</th>
                  <th style={{textAlign:'center'}}>{t('Hạn trả')}</th>
                  <th style={{textAlign:'center'}}>{t('Trạng thái')}</th>
                  <th style={{textAlign:'center'}}>{t('Thao tác')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(debt=>{
                  const remaining = getRemaining(debt);
                  const paid = debt.PaidAmount||0;
                  const total = debt.TotalDebt||0;
                  const pct = total>0 ? Math.round((paid/total)*100) : 0;
                  const interestAmount = calcInterest(debt);
                  const status = getStatusBadge(debt);
                  const type = getTypeBadge(debt.Type);
                  const isSelected = drawerDebt?.Id===debt.Id;
                  const progressCls = status.cls==='green' ? 'green' : status.cls==='red' ? 'red' : pct>=90 ? 'green' : status.cls==='amber' ? 'amber' : 'violet';
                  return (
                    <tr key={debt.Id} className={isSelected? 'selected':''} onClick={()=> setDrawerDebt(debt)}>
                      <td>
                        <div className="debt-name-cell">
                          <div className={`debt-icon ${String(debt.Type)==='Lent'?'lent':'borrowed'}`}>{String(debt.Type)==='Lent'?'⇄':'◯'}</div>
                          <div className="debt-name-main">
                            <div className="debt-name-title" title={debt.Name}>{debt.Name}</div>
                            <div className="debt-name-sub">{type.text} • {formatDate(debt.BorrowDate)}</div>
                            <div className="debt-progress-wrap" style={{marginTop:6}}>
                              <div className="debt-progress-track"><div className={`debt-progress-fill ${progressCls}`} style={{width:`${pct}%`}} /></div>
                              <div className="debt-progress-meta"><span>{t('Đã trả')} {formatCurrency(paid)} / {formatCurrency(total)}</span><span>{pct}%</span></div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td><span className={`debt-badge ${type.cls==='amber'?'amber':'violet'}`}>{type.text}</span></td>
                      <td className="num">{formatCurrency(total)} ₫</td>
                      <td className="num" style={{color:'#10b981'}}>{formatCurrency(paid)} ₫</td>
                      <td className="num" style={{color: remaining>0? '#FF4D67':'#10b981', fontWeight:700}}>{formatCurrency(remaining)} ₫</td>
                      <td style={{textAlign:'center'}}>{debt.InterestRate!=null ? <span style={{fontWeight:700, color: (debt.InterestRate||0)>=15 ? '#F5A623':'var(--text-secondary)', fontFamily:'var(--font-mono)' }}>{debt.InterestRate}%</span> : <span style={{color:'var(--text-muted)'}}>—</span>}</td>
                      <td className="num" style={{color: interestAmount>0 ? '#F5A623':'var(--text-muted)', fontWeight:600}}>{interestAmount>0 ? formatCurrency(Math.round(interestAmount))+' ₫' : '—'}</td>
                      <td style={{textAlign:'center', color:'var(--text-muted)', fontSize:12, fontFamily:'var(--font-mono)'}}>{formatDate(debt.BorrowDate)}</td>
                      <td style={{textAlign:'center'}}>
                        {debt.DueDate ? (
                          <span style={{fontSize:12, fontFamily:'var(--font-mono)', color: isOverdue(debt)? '#FF4D67' : getDueColor(debt).tone==='amber'||getDueColor(debt).tone==='orange'? '#F5A623':'var(--text-secondary)'}}>{formatDate(debt.DueDate)}</span>
                        ) : <span style={{color:'var(--text-muted)'}}>—</span>}
                      </td>
                      <td style={{textAlign:'center'}}><span className={`debt-badge ${status.cls}`}>{status.text}</span></td>
                      <td style={{textAlign:'center'}}>
                        <div className="debt-actions" onClick={e=> e.stopPropagation()}>
                          {remaining>0 && !debt.IsClosed ? (
                            <button className="debt-action-btn primary" onClick={()=> openPaymentModal(debt)}>{t('Thanh toán')}</button>
                          ) : (
                            <button className="debt-action-btn ghost" onClick={()=> setDrawerDebt(debt)}>{t('Xem')}</button>
                          )}
                          <div style={{position:'relative'}}>
                            <button className="debt-action-btn ghost" style={{width:30, padding:0, justifyContent:'center'}} onClick={(e)=>{ e.stopPropagation(); setDropdownId(dropdownId===debt.Id? null: debt.Id); }}>⋯</button>
                            {dropdownId===debt.Id && (
                              <div style={{position:'absolute', right:0, top:'100%', marginTop:6, background:'#0F1320', border:'1px solid var(--border)', borderRadius:12, boxShadow:'0 16px 40px rgba(0,0,0,0.38)', minWidth:160, zIndex:10, overflow:'hidden'}} onClick={e=> e.stopPropagation()}>
                                <button style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'10px 12px',background:'transparent',border:'none',color:'var(--text-primary)',fontSize:12,cursor:'pointer',textAlign:'left'}} onClick={()=> setDrawerDebt(debt)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>{t('Xem chi tiết')}</button>
                                <button style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'10px 12px',background:'transparent',border:'none',color:'var(--text-primary)',fontSize:12,cursor:'pointer',textAlign:'left'}} onClick={()=> openEdit(debt)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>{t('Chỉnh sửa')}</button>
                                {!debt.IsClosed && <button style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'10px 12px',background:'transparent',border:'none',color:'var(--text-primary)',fontSize:12,cursor:'pointer',textAlign:'left'}} onClick={()=> handleClose(debt.Id)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>{t('Đóng sổ')}</button>}
                                <button style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'10px 12px',background:'transparent',border:'none',color:'#FF4D67',fontSize:12,cursor:'pointer',textAlign:'left',borderTop:'1px solid var(--border)'}} onClick={()=> handleDelete(debt.Id)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>{t('Xóa')}</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>{t('Tổng')}</td>
                  <td className="num">{formatCurrency(filtered.reduce((s,d)=> s+(d.TotalDebt||0),0))} ₫</td>
                  <td className="num" style={{color:'#10b981'}}>{formatCurrency(filtered.reduce((s,d)=> s+(d.PaidAmount||0),0))} ₫</td>
                  <td className="num" style={{color:'#FF4D67'}}>{formatCurrency(filtered.reduce((s,d)=> s+getRemaining(d),0))} ₫</td>
                  <td></td>
                  <td className="num" style={{color:'#F5A623'}}>{formatCurrency(Math.round(filtered.reduce((s,d)=> s+calcInterest(d),0)))} ₫</td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            </table>
          </div>
          {/* mobile cards */}
          <div className="debt-mobile-list">
            {filtered.map(debt=>{
              const remaining = getRemaining(debt);
              const pct = debt.TotalDebt? Math.round(((debt.PaidAmount||0)/debt.TotalDebt)*100):0;
              const status = getStatusBadge(debt);
              return (
                <div key={debt.Id} className="debt-mobile-card" onClick={()=> setDrawerDebt(debt)}>
                  <div className="debt-mobile-top">
                    <div className="debt-name-cell" style={{minWidth:0}}>
                      <div className={`debt-icon ${String(debt.Type)==='Lent'?'lent':'borrowed'}`} style={{width:32,height:32}}>{String(debt.Type)==='Lent'?'⇄':'◯'}</div>
                      <div className="debt-name-main"><div className="debt-name-title" style={{fontSize:13}}>{debt.Name}</div><div className="debt-name-sub">{formatDate(debt.BorrowDate)} • {debt.InterestRate!=null? `${debt.InterestRate}%`:'—'}</div></div>
                    </div>
                    <span className={`debt-badge ${status.cls}`}>{status.text}</span>
                  </div>
                  <div className="debt-mobile-grid">
                    <div className="debt-mobile-item"><span className="debt-mobile-label">{t('Còn lại')}</span><span className="debt-mobile-value" style={{color: remaining>0? '#FF4D67':'#10b981'}}>{formatCurrency(remaining)} ₫</span></div>
                    <div className="debt-mobile-item"><span className="debt-mobile-label">{t('Đã trả')}</span><span className="debt-mobile-value" style={{color:'#10b981'}}>{formatCurrency(debt.PaidAmount||0)} ₫</span></div>
                    <div className="debt-mobile-item"><span className="debt-mobile-label">{t('Lãi suất')}</span><span className="debt-mobile-value">{debt.InterestRate!=null? `${debt.InterestRate}%`:'—'}</span></div>
                    <div className="debt-mobile-item"><span className="debt-mobile-label">{t('Hạn trả')}</span><span className="debt-mobile-value">{debt.DueDate? formatDate(debt.DueDate):'—'}</span></div>
                  </div>
                  <div className="debt-progress-wrap">
                    <div className="debt-progress-track"><div className={`debt-progress-fill ${status.cls==='green'?'green': status.cls==='red'?'red': pct>=90?'green':'violet'}`} style={{width:`${pct}%`}} /></div>
                    <div className="debt-progress-meta"><span>{pct}% {t('đã trả')}</span><span>{formatCurrency(remaining)} ₫</span></div>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    {remaining>0 && !debt.IsClosed ? <button className="debt-action-btn primary" style={{flex:1,justifyContent:'center'}} onClick={(e)=>{e.stopPropagation(); openPaymentModal(debt);}}>{t('Thanh toán')}</button> : <button className="debt-action-btn ghost" style={{flex:1,justifyContent:'center'}} onClick={(e)=>{e.stopPropagation(); setDrawerDebt(debt);}}>{t('Xem')}</button>}
                    <button className="debt-action-btn ghost" style={{width:36,justifyContent:'center'}} onClick={(e)=>{e.stopPropagation(); openEdit(debt);}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="debt-history-card">
        <div className="debt-history-header">
          <div>
            <div className="debt-history-title">{t('Lịch sử thanh toán')}</div>
            <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{allPayments.length} {t('giao dịch')} • {t('Hiển thị')} {filteredPayments.length}</div>
          </div>
          <div className="debt-history-controls">
            <button className={`debt-history-btn ${historyFilter==='all'?'active':''}`} onClick={()=> setHistoryFilter('all')}>{t('Tất cả')}</button>
            <button className={`debt-history-btn ${historyFilter==='30d'?'active':''}`} onClick={()=> setHistoryFilter('30d')}>30 {t('ngày')}</button>
            <button className={`debt-history-btn ${historyFilter==='3m'?'active':''}`} onClick={()=> setHistoryFilter('3m')}>3 {t('tháng')}</button>
            <button className={`debt-history-btn ${historyFilter==='1y'?'active':''}`} onClick={()=> setHistoryFilter('1y')}>1 {t('năm')}</button>
          </div>
        </div>
        {filteredPayments.length===0 ? (
          <div className="debt-empty">{t('Chưa có thanh toán nào')}</div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table className="debt-history-table">
              <thead><tr><th>{t('Ngày')}</th><th>{t('Khoản nợ')}</th><th style={{textAlign:'right'}}>{t('Số tiền')}</th><th>{t('Ghi chú')}</th></tr></thead>
              <tbody>
                {filteredPayments.map((p:any)=>(
                  <tr key={p.Id}>
                    <td style={{fontFamily:'var(--font-mono)',fontSize:12,whiteSpace:'nowrap'}}>{formatDateTime(p.PaymentDate||p.CreatedAt)}</td>
                    <td style={{fontWeight:600}}>{p.debtName}</td>
                    <td style={{textAlign:'right',fontFamily:'var(--font-mono)',fontWeight:700,color:'#10b981'}}>{formatCurrency(p.Amount)} ₫</td>
                    <td style={{color: p.Note? 'var(--text-primary)':'var(--text-muted)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{p.Note||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer */}
      {drawerDebt && (
        <div className="debt-drawer-overlay" onClick={()=> setDrawerDebt(null)}>
          <div className="debt-drawer" onClick={e=> e.stopPropagation()}>
            <div className="debt-drawer-head">
              <div>
                <div className="debt-drawer-title">{drawerDebt.Name}</div>
                <div className="debt-drawer-sub">{getTypeBadge(drawerDebt.Type).text} • {formatDate(drawerDebt.BorrowDate)}</div>
              </div>
              <button onClick={()=> setDrawerDebt(null)} style={{width:28,height:28,borderRadius:8,border:'1px solid var(--border)',background:'rgba(255,255,255,0.04)',color:'var(--text-muted)',cursor:'pointer'}}>✕</button>
            </div>
            <div className="debt-drawer-body">
              <div style={{textAlign:'center',padding:'12px 0'}}>
                <div style={{fontSize:11,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--text-muted)',fontWeight:700}}>{t('Dư nợ hiện tại')}</div>
                <div style={{fontFamily:'var(--font-mono)',fontWeight:750,fontSize:26,letterSpacing:'-0.03em',marginTop:6,color: getRemaining(drawerDebt)>0? '#FF4D67':'#18C995'}}>{formatCurrency(getRemaining(drawerDebt))} ₫</div>
                <div style={{marginTop:10}}><span className={`debt-badge ${getStatusBadge(drawerDebt).cls}`}>{getStatusBadge(drawerDebt).text}</span></div>
              </div>
              <div className="debt-drawer-card">
                <div className="debt-drawer-label">{t('Chi tiết')}</div>
                <div className="debt-drawer-grid">
                  <div className="debt-drawer-item"><span className="debt-drawer-item-label">{t('Tổng nợ')}</span><span className="debt-drawer-item-value">{formatCurrency(drawerDebt.TotalDebt)} ₫</span></div>
                  <div className="debt-drawer-item"><span className="debt-drawer-item-label">{t('Đã trả')}</span><span className="debt-drawer-item-value" style={{color:'#10b981'}}>{formatCurrency(drawerDebt.PaidAmount||0)} ₫</span></div>
                  <div className="debt-drawer-item"><span className="debt-drawer-item-label">{t('Lãi suất')}</span><span className="debt-drawer-item-value">{drawerDebt.InterestRate!=null? `${drawerDebt.InterestRate}%`:'—'}</span></div>
                  <div className="debt-drawer-item"><span className="debt-drawer-item-label">{t('Tiền lãi')}</span><span className="debt-drawer-item-value" style={{color:'#F5A623'}}>{formatCurrency(Math.round(calcInterest(drawerDebt)))} ₫</span></div>
                  <div className="debt-drawer-item"><span className="debt-drawer-item-label">{t('Ngày vay')}</span><span className="debt-drawer-item-value">{formatDate(drawerDebt.BorrowDate)}</span></div>
                  <div className="debt-drawer-item"><span className="debt-drawer-item-label">{t('Hạn trả')}</span><span className="debt-drawer-item-value">{drawerDebt.DueDate? formatDate(drawerDebt.DueDate):'—'}</span></div>
                </div>
                {drawerDebt.Description && <div style={{marginTop:12,padding:10,background:'rgba(124,92,255,0.06)',border:'1px solid rgba(124,92,255,0.10)',borderRadius:10,fontSize:12,color:'var(--text-secondary)',lineHeight:1.5}}><b style={{color:'var(--text-primary)'}}>{t('Mô tả')}:</b> {drawerDebt.Description}</div>}
                {drawerDebt.Note && <div style={{marginTop:8, fontSize:12,color:'var(--text-muted)'}}><b>{t('Ghi chú')}:</b> {drawerDebt.Note}</div>}
                <div style={{marginTop:12}}>
                  <div style={{fontSize:11, color:'var(--text-muted)',marginBottom:6}}>{t('Tiến độ')}: <b style={{color:'var(--text-primary)',fontFamily:'var(--font-mono)'}}>{drawerDebt.TotalDebt? Math.round(((drawerDebt.PaidAmount||0)/drawerDebt.TotalDebt)*100):0}%</b></div>
                  <div className="debt-progress-track"><div className={`debt-progress-fill ${getStatusBadge(drawerDebt).cls==='green'?'green': getStatusBadge(drawerDebt).cls==='red'?'red':'violet'}`} style={{width:`${drawerDebt.TotalDebt? Math.round(((drawerDebt.PaidAmount||0)/drawerDebt.TotalDebt)*100):0}%`}} /></div>
                </div>
              </div>
              <div className="debt-drawer-card">
                <div className="debt-drawer-label">{t('Lịch sử thanh toán')} • {(drawerDebt.Payments||[]).length}</div>
                {(drawerDebt.Payments||[]).length===0 ? (
                  <div style={{fontSize:12,color:'var(--text-muted)',fontStyle:'italic',padding:'8px 0'}}>{t('Chưa có thanh toán nào')}</div>
                ) : (
                  <div className="debt-history-list">
                    {(drawerDebt.Payments||[]).slice().sort((a:any,b:any)=> new Date(b.PaymentDate).getTime()-new Date(a.PaymentDate).getTime()).map((p:any)=>(
                      <div key={p.Id} className="debt-history-item">
                        <div><div style={{fontWeight:600,fontSize:12}}>{formatDate(p.PaymentDate||p.CreatedAt)}</div><div style={{fontSize:11,color:'var(--text-muted)'}}>{p.Note||'—'}</div></div>
                        <div className="debt-history-item-amount">+{formatCurrency(p.Amount)} ₫</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="debt-drawer-actions">
                {getRemaining(drawerDebt)>0 && !drawerDebt.IsClosed ? <button className="debt-btn debt-btn-primary" style={{flex:1,justifyContent:'center'}} onClick={()=> openPaymentModal(drawerDebt)}>{t('Thanh toán')}</button> : <span style={{flex:1,textAlign:'center',fontSize:12,color:'var(--text-muted)',padding:'10px'}}>{t('Khoản nợ đã đóng')}</span>}
                <button className="debt-btn debt-btn-secondary" onClick={()=> openEdit(drawerDebt)}>{t('Sửa')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal — premium */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth:520}}>
            <div className="modal-header">
              <h3 className="modal-title">{editingDebt ? t('Chỉnh sửa khoản nợ') : t('Thêm khoản nợ mới')}</h3>
              <button className="modal-close" onClick={()=> setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveDebt}>
              <div className="form-group">
                <label className="form-label">{t('Tên khoản nợ')} *</label>
                <input className="form-control" value={formName} onChange={e=> setFormName(e.target.value)} placeholder={t('VD: Vay ngân hàng, Ứng tiền...')} required />
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="form-group">
                  <label className="form-label">{t('Loại')}</label>
                  <select className="form-control" value={formType} onChange={e=> setFormType(e.target.value)}>
                    <option value="Borrowed">{t('Vay')}</option>
                    <option value="Lent">{t('Cho vay')}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('Lãi suất (%/năm)')}</label>
                  <input className="form-control" type="number" step="0.01" min="0" value={formInterestRate} onChange={e=> setFormInterestRate(e.target.value)} placeholder="12.5" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t('Tổng nợ')} *</label>
                <input className="form-control" value={formatInputNumber(parseFloat(formTotalDebt.replace(/,/g,''))||0)} onChange={e=> setFormTotalDebt(e.target.value.replace(/,/g,''))} placeholder="0" required />
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="form-group">
                  <label className="form-label">{t('Ngày vay')} *</label>
                  <input className="form-control" type="date" value={formBorrowDate} onChange={e=> setFormBorrowDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('Hạn trả')}</label>
                  <input className="form-control" type="date" value={formDueDate} onChange={e=> setFormDueDate(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t('Mô tả')}</label>
                <textarea className="form-control" value={formDescription} onChange={e=> setFormDescription(e.target.value)} placeholder={t('Mô tả chi tiết...')} rows={2} style={{resize:'vertical'}} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('Ghi chú')}</label>
                <input className="form-control" value={formNote} onChange={e=> setFormNote(e.target.value)} placeholder={t('Ghi chú ngắn...')} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={()=> setShowModal(false)}>{t('Hủy')}</button>
                <button type="submit" className="btn btn-primary">{editingDebt ? t('Lưu') : t('Thêm')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal — improved flow */}
      {showPaymentModal && payingDebt && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth:420}}>
            <div className="modal-header">
              <h3 className="modal-title">{t('Thanh toán khoản nợ')}</h3>
              <button className="modal-close" onClick={()=> {setShowPaymentModal(false); setPayingDebt(null);}}>✕</button>
            </div>
            <div style={{background:'rgba(124,92,255,0.06)',border:'1px solid rgba(124,92,255,0.10)',borderRadius:12,padding:12,marginBottom:14}}>
              <div style={{fontSize:12,color:'var(--text-secondary)'}}>{t('Khoản nợ')}:</div>
              <div style={{fontWeight:700,color:'var(--text-primary)',marginTop:2}}>{payingDebt.Name}</div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:8, fontSize:12}}>
                <span style={{color:'var(--text-muted)'}}>{t('Dư nợ')}:</span>
                <span style={{fontFamily:'var(--font-mono)',fontWeight:700,color:'#FF4D67'}}>{formatCurrency(getRemaining(payingDebt))} ₫</span>
              </div>
            </div>
            <form onSubmit={handleAddPayment}>
              <div className="form-group">
                <label className="form-label">{t('Ngày thanh toán')} *</label>
                <input className="form-control" type="date" value={paymentDate} onChange={e=> setPaymentDate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">{t('Số tiền thanh toán')} *</label>
                <input className="form-control" value={paymentAmount? formatInputNumber(parseFloat(paymentAmount.replace(/,/g,''))||0):''} onChange={e=> setPaymentAmount(e.target.value.replace(/,/g,''))} placeholder="0" required autoFocus />
                {paymentAmount && (
                  <div style={{marginTop:8, display:'flex',justifyContent:'space-between', fontSize:12, background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:8,padding:'8px 10px'}}>
                    <span style={{color:'var(--text-muted)'}}>{t('Còn lại sau thanh toán')}:</span>
                    <span style={{fontFamily:'var(--font-mono)',fontWeight:700, color: (getRemaining(payingDebt) - (parseFloat(paymentAmount.replace(/,/g,''))||0))<=0 ? '#18C995':'var(--text-primary)'}}>{formatCurrency(Math.max(0, getRemaining(payingDebt) - (parseFloat(paymentAmount.replace(/,/g,''))||0)))} ₫</span>
                  </div>
                )}
                {paymentAmount && (parseFloat(paymentAmount.replace(/,/g,''))||0) >= getRemaining(payingDebt) && getRemaining(payingDebt)>0 && (
                  <div style={{marginTop:6, fontSize:11, color:'#18C995', fontWeight:600, display:'flex',alignItems:'center',gap:4}}>✓ {t('Khoản nợ sẽ được đóng sau thanh toán này.')}</div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">{t('Ghi chú')}</label>
                <input className="form-control" value={paymentNote} onChange={e=> setPaymentNote(e.target.value)} placeholder={t('VD: Thanh toán tháng 9')} />
              </div>
              {payingError && <div style={{color:'#FF4D67',fontSize:12,marginBottom:8}}>{payingError}</div>}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={()=> {setShowPaymentModal(false); setPayingDebt(null);}}>{t('Hủy')}</button>
                <button type="submit" className="btn btn-primary" style={{background:'#18C995',borderColor:'#18C995'}}>{t('Xác nhận thanh toán')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm modals — keep existing */}
      {deleteConfirmId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth:400,textAlign:'center'}}>
            <div className="modal-header"><h3 className="modal-title">{t('Xóa khoản nợ')}</h3><button className="modal-close" onClick={()=> setDeleteConfirmId(null)}>✕</button></div>
            <p style={{color:'var(--text-secondary)',fontSize:13,lineHeight:1.6,margin:'12px 0 18px'}}>{t('Bạn có chắc chắn muốn xóa khoản nợ này? Hành động này không thể hoàn tác.')}</p>
            <div style={{display:'flex',gap:12,justifyContent:'center'}}>
              <button className="btn btn-secondary" onClick={()=> setDeleteConfirmId(null)}>{t('Hủy')}</button>
              <button className="btn btn-primary" style={{background:'#FF4D67',borderColor:'#FF4D67'}} onClick={confirmDelete}>{t('Xóa')}</button>
            </div>
          </div>
        </div>
      )}
      {closeConfirmId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth:400,textAlign:'center'}}>
            <div className="modal-header"><h3 className="modal-title">{t('Đóng sổ nợ')}</h3><button className="modal-close" onClick={()=> setCloseConfirmId(null)}>✕</button></div>
            <p style={{color:'var(--text-secondary)',fontSize:13,lineHeight:1.6,margin:'12px 0 18px'}}>{t('Bạn có chắc chắn muốn đóng sổ nợ này? Sau khi đóng sẽ không thể thay đổi.')}</p>
            <div style={{display:'flex',gap:12,justifyContent:'center'}}>
              <button className="btn btn-secondary" onClick={()=> setCloseConfirmId(null)}>{t('Hủy')}</button>
              <button className="btn btn-primary" onClick={confirmClose}>{t('Đóng')}</button>
            </div>
          </div>
        </div>
      )}
      {saveConfirmData && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth:400,textAlign:'center'}}>
            <div className="modal-header"><h3 className="modal-title">{t('Xác nhận chỉnh sửa')}</h3><button className="modal-close" onClick={()=> setSaveConfirmData(null)}>✕</button></div>
            <p style={{color:'var(--text-secondary)',fontSize:13,lineHeight:1.6,margin:'12px 0 18px'}}>{t('Bạn có chắc chắn muốn lưu các thay đổi cho khoản nợ này?')}</p>
            <div style={{display:'flex',gap:12,justifyContent:'center'}}>
              <button className="btn btn-secondary" onClick={()=> setSaveConfirmData(null)}>{t('Hủy')}</button>
              <button className="btn btn-primary" onClick={()=> doSaveDebt(saveConfirmData)}>{t('Xác nhận')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



function AllocationHistorySection({ records, onRestore, onDelete, formatDateTime, formatCurrency, onUpdateTime }: {
  records: any[];
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  formatDateTime: (iso: string) => string;
  formatCurrency: (value: number) => string;
  onUpdateTime: (historyId: string, recordedAt: string) => Promise<any>;
}) {
  const { t } = useLanguage();
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', gap: '16px' }}>
      <div style={{ flex: '0 0 280px', maxHeight: '360px', overflowY: 'auto' }}>
        {records.map((r: any) => (
          <div key={r.Id} style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', marginBottom: '4px',
            background: selectedHistoryId === r.Id ? 'rgba(99,102,241,0.1)' : 'transparent',
            border: selectedHistoryId === r.Id ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
            transition: 'all 0.15s'
          }}>
            <div onClick={() => setSelectedHistoryId(r.Id)}
              style={{ flex: 1, minWidth: 0 }}>
              {editingTimeId === r.Id ? (
                      <DateTimeEdit value={r.RecordedAt} onSave={async (newIso) => {
                        const oldTime = new Date(r.RecordedAt).getTime();
                        const newTime = new Date(newIso).getTime();
                        if (Math.abs(newTime - oldTime) > 60000) {
                          await onUpdateTime(r.Id, newIso);
                        }
                        setEditingTimeId(null);
                      }} />
                    ) : (
                <div style={{ fontWeight: 500, fontSize: '0.85rem', cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); setSelectedHistoryId(r.Id); if (selectedHistoryId === r.Id) setEditingTimeId(r.Id); }}
                  title={t('Nhấn để sửa thời gian')}>
                  {formatDateTime(r.RecordedAt)}
                </div>
              )}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {r.Details?.length || 0} {t('danh mục')}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--primary)', marginTop: '2px', fontWeight: 500 }}>
                {t('Gốc: ')}{formatCurrency(r.CurrentAmount)}
              </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onDelete(r.Id); }} style={{
              background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer',
              padding: '4px', borderRadius: '4px', fontSize: '0.8rem', flexShrink: 0
            }}
              onMouseOver={(e) => (e.currentTarget.style.color = '#f43f5e')}
              onMouseOut={(e) => (e.currentTarget.style.color = '#6b7280')}
              title={t('Xóa lịch sử')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
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
                <div style={{ marginTop: '12px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={() => onDelete(record.Id)} style={{
                    background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)',
                    color: '#f43f5e', borderRadius: '6px', padding: '8px 20px', cursor: 'pointer',
                    fontSize: '0.85rem', fontWeight: 600
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                    {t('Xóa')}
                  </button>
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
  const [email, setEmail] = useState(user?.email || '');
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
      const result = await api.authService.updateProfile(user?.id, displayName.trim(), email.trim() || undefined);
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
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('Tên đăng nhập')}</label>
              <div style={{ fontSize: '0.95rem', fontWeight: 500, padding: '8px 0' }}>{user?.username || '-'}</div>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('Ngày tạo')}</label>
              <div style={{ fontSize: '0.95rem', fontWeight: 500, padding: '8px 0' }}>{user?.createdAt || '-'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Update Profile (Display Name + Email) */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <h3 className="card-title">{t('Thông tin cá nhân')}</h3>
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
            <div className="form-group">
              <label className="form-label">{t('Địa chỉ Email')}</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('nhập.email@của.ban')}
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
