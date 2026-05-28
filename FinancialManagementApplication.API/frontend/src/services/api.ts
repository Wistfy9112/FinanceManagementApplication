// API service with automatic fallback to localStorage demo mode
const API_URL = 'http://localhost:5000/api';

// Check if we can reach the backend API
let isDemoMode = true;

// Custom event to notify components about connection changes
const triggerStatusChange = () => {
  window.dispatchEvent(new CustomEvent('api-status-changed', { detail: { isDemoMode } }));
};

export const checkConnection = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test', password: 'test' })
    }).catch(() => null);
    
    // If we get any response or it fails on credentials rather than network, backend is online
    if (res && res.status !== 404) {
      isDemoMode = false;
    } else {
      isDemoMode = true;
    }
  } catch {
    isDemoMode = true;
  }
  triggerStatusChange();
  return !isDemoMode;
};

// Seed Data for Demo Mode
const DEFAULT_ASSETS = [
  { Id: 'a1', Name: 'Saving', InitialValue: 23984562, CurrentValue: 764842 },
  { Id: 'a2', Name: 'Emergency', InitialValue: 6497662, CurrentValue: 562566 },
  { Id: 'a3', Name: 'Unemployment fund', InitialValue: 2583793, CurrentValue: 2584453 },
  { Id: 'a4', Name: 'Health', InitialValue: 12238827, CurrentValue: 12138827 },
  { Id: 'a5', Name: 'Goal fund', InitialValue: 674481, CurrentValue: 177617 },
  { Id: 'a6', Name: 'Skill Investment', InitialValue: 674481, CurrentValue: 177617 },
  { Id: 'a7', Name: 'Margin', InitialValue: 77140127, CurrentValue: 19725414 },
  { Id: 'a8', Name: 'ETF', InitialValue: 23567444, CurrentValue: 27220403 },
  { Id: 'a9', Name: 'Cash', InitialValue: 90403667, CurrentValue: 95172704 },
  { Id: 'a10', Name: 'Investment certificate', InitialValue: 22664368, CurrentValue: 21493033 },
  { Id: 'a11', Name: 'Gold (Cash)', InitialValue: 2520966, CurrentValue: 637392 },
  { Id: 'a12', Name: 'Gold', InitialValue: 0, CurrentValue: 0 }
];

const DEFAULT_PORTFOLIO = {
  Id: 'p1',
  Name: 'Kế Hoạch Phân Bổ Tổng Thể',
  Amount: 19139550 // This is the Remain value
};

const DEFAULT_ALLOCATIONS = [
  // Sinh hoạt block (Expense)
  { Id: 'al1', PortfolioId: 'p1', FinancialCategory: 'Expense', Name: 'Tiền trọ', TargetPercentage: 15.11170, CurrentAmount: 2892310 },
  { Id: 'al2', PortfolioId: 'p1', FinancialCategory: 'Expense', Name: 'Chi phí sinh hoạt', TargetPercentage: 17.73982, CurrentAmount: 3395321 },
  { Id: 'al3', PortfolioId: 'p1', FinancialCategory: 'Expense', Name: 'Xăng xe đi lại', TargetPercentage: 1.97109, CurrentAmount: 377258 },
  { Id: 'al4', PortfolioId: 'p1', FinancialCategory: 'Expense', Name: 'Mua sắm', TargetPercentage: 2.95664, CurrentAmount: 565887 },
  { Id: 'al5', PortfolioId: 'p1', FinancialCategory: 'Expense', Name: 'Dự phòng', TargetPercentage: 2.95664, CurrentAmount: 565887 },
  { Id: 'al6', PortfolioId: 'p1', FinancialCategory: 'Expense', Name: 'Goal Fund', TargetPercentage: 0.65703, CurrentAmount: 125753 },
  { Id: 'al7', PortfolioId: 'p1', FinancialCategory: 'Expense', Name: 'Skill Investment', TargetPercentage: 0.65703, CurrentAmount: 125753 },
  { Id: 'al8', PortfolioId: 'p1', FinancialCategory: 'Expense', Name: 'Thiện nguyện', TargetPercentage: 0.65703, CurrentAmount: 125753 },
  { Id: 'al9', PortfolioId: 'p1', FinancialCategory: 'Expense', Name: 'Du lịch', TargetPercentage: 0.65703, CurrentAmount: 125753 },
  
  // Saving block (Saving)
  { Id: 'al10', PortfolioId: 'p1', FinancialCategory: 'Saving', Name: 'Saving', TargetPercentage: 0.65703, CurrentAmount: 125753 },
  { Id: 'al11', PortfolioId: 'p1', FinancialCategory: 'Saving', Name: 'Emergency', TargetPercentage: 0.65703, CurrentAmount: 125753 },
  { Id: 'al12', PortfolioId: 'p1', FinancialCategory: 'Saving', Name: 'Health', TargetPercentage: 11.16951, CurrentAmount: 2137795 },
  { Id: 'al13', PortfolioId: 'p1', FinancialCategory: 'Saving', Name: 'Unemployment fund', TargetPercentage: 0.65703, CurrentAmount: 125753 },
  { Id: 'al14', PortfolioId: 'p1', FinancialCategory: 'Saving', Name: 'Funds (Stock)', TargetPercentage: 20.49934, CurrentAmount: 3923482 },
  { Id: 'al15', PortfolioId: 'p1', FinancialCategory: 'Saving', Name: 'ETF (Stock)', TargetPercentage: 9.85545, CurrentAmount: 1886289 },
  { Id: 'al16', PortfolioId: 'p1', FinancialCategory: 'Saving', Name: 'Chứng chỉ quỹ', TargetPercentage: 9.85545, CurrentAmount: 1886289 },
  { Id: 'al17', PortfolioId: 'p1', FinancialCategory: 'Saving', Name: 'Margin (Stock)', TargetPercentage: 0.00000, CurrentAmount: 0 },
  { Id: 'al18', PortfolioId: 'p1', FinancialCategory: 'Saving', Name: 'Gold', TargetPercentage: 3.28515, CurrentAmount: 628763 }
];

// Helper to get from LocalStorage
const getStorage = <T>(key: string, defaultValue: T): T => {
  const item = localStorage.getItem(key);
  if (!item) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  return JSON.parse(item);
};

const setStorage = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

// Initial setup for Demo Mode
if (!localStorage.getItem('fm_assets')) {
  setStorage('fm_assets', DEFAULT_ASSETS);
  setStorage('fm_portfolios', [DEFAULT_PORTFOLIO]);
  setStorage('fm_allocations', DEFAULT_ALLOCATIONS);
  setStorage('fm_income', 19139550);
  setStorage('fm_target_reduction', 500000);
  setStorage('fm_exclusions', ['al12']); // "Health" excluded by default
}

// Get Auth Header
const getAuthHeader = (): Record<string, string> => {
  const token = localStorage.getItem('fm_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Check if user is logged in
export const getLoggedUser = () => {
  const token = localStorage.getItem('fm_token');
  const user = localStorage.getItem('fm_user');
  if (token && user) {
    return JSON.parse(user);
  }
  return null;
};

export const getIsDemoMode = () => isDemoMode;

export const authService = {
  login: async (email: string, password: string): Promise<{ token: string; user: any }> => {
    await checkConnection();
    
    if (isDemoMode) {
      if (email === 'demo@example.com' && password === 'demo123') {
        const mockUser = { id: 'u1', email, displayName: 'Huy Vô Dình' };
        localStorage.setItem('fm_token', 'mock-jwt-token-12345');
        localStorage.setItem('fm_user', JSON.stringify(mockUser));
        return { token: 'mock-jwt-token-12345', user: mockUser };
      }
      // Generous fallback: Allow any user to log in for demo ease
      const mockUser = { id: 'u1', email, displayName: email.split('@')[0] || 'Khách Demo' };
      localStorage.setItem('fm_token', 'mock-jwt-token-12345');
      localStorage.setItem('fm_user', JSON.stringify(mockUser));
      return { token: 'mock-jwt-token-12345', user: mockUser };
    }

    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error('Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    const data = await res.json(); // returns { token: "..." }
    
    // Parse JWT briefly to extract info or assign displayName
    const mockUser = { id: 'u1', email, displayName: 'Huy Vô Dình' };
    localStorage.setItem('fm_token', data.token);
    localStorage.setItem('fm_user', JSON.stringify(mockUser));
    return { token: data.token, user: mockUser };
  },

  register: async (email: string, password: string, displayName: string): Promise<{ token: string; user: any }> => {
    await checkConnection();
    
    if (isDemoMode) {
      const mockUser = { id: 'u1', email, displayName };
      localStorage.setItem('fm_token', 'mock-jwt-token-12345');
      localStorage.setItem('fm_user', JSON.stringify(mockUser));
      return { token: 'mock-jwt-token-12345', user: mockUser };
    }

    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName })
    });
    if (!res.ok) throw new Error('Đăng ký thất bại. Email có thể đã tồn tại.');
    const data = await res.json();
    const mockUser = { id: 'u1', email, displayName };
    localStorage.setItem('fm_token', data.token);
    localStorage.setItem('fm_user', JSON.stringify(mockUser));
    return { token: data.token, user: mockUser };
  },

  logout: () => {
    localStorage.removeItem('fm_token');
    localStorage.removeItem('fm_user');
  }
};

export const assetService = {
  getAll: async (userId: string = 'u1'): Promise<any[]> => {
    await checkConnection();
    if (isDemoMode) {
      return getStorage('fm_assets', DEFAULT_ASSETS);
    }
    try {
      const res = await fetch(`${API_URL}/assets/user/${userId}`, {
        headers: { ...getAuthHeader() }
      });
      if (res.ok) {
        const data = await res.json();
        // Keep synced with local storage too for safety
        setStorage('fm_assets', data);
        return data;
      }
    } catch {
      // Graceful fallback to local storage if API fails mid-use
    }
    return getStorage('fm_assets', DEFAULT_ASSETS);
  },

  create: async (asset: { Name: string; InitialValue: number; CurrentValue: number }): Promise<any> => {
    await checkConnection();
    const newAsset = {
      ...asset,
      Id: Math.random().toString(36).substr(2, 9),
      AccountID: 'u1'
    };
    
    if (isDemoMode) {
      const list = getStorage('fm_assets', DEFAULT_ASSETS);
      list.push(newAsset);
      setStorage('fm_assets', list);
      return newAsset;
    }

    try {
      const res = await fetch(`${API_URL}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          name: asset.Name,
          initialValue: asset.InitialValue,
          currentValue: asset.CurrentValue,
          accountId: 'u1' // Dummy or logged-in user id
        })
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    // localStorage fallback
    const list = getStorage('fm_assets', DEFAULT_ASSETS);
    list.push(newAsset);
    setStorage('fm_assets', list);
    return newAsset;
  },

  update: async (id: string, asset: { Id: string; Name: string; InitialValue: number; CurrentValue: number }): Promise<void> => {
    await checkConnection();
    if (isDemoMode) {
      const list = getStorage('fm_assets', DEFAULT_ASSETS);
      const idx = list.findIndex(a => a.Id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...asset };
        setStorage('fm_assets', list);
      }
      return;
    }

    try {
      const res = await fetch(`${API_URL}/assets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          id: asset.Id,
          name: asset.Name,
          initialValue: asset.InitialValue,
          currentValue: asset.CurrentValue,
          accountId: 'u1'
        })
      });
      if (res.ok) return;
    } catch {}
    
    // fallback
    const list = getStorage('fm_assets', DEFAULT_ASSETS);
    const idx = list.findIndex(a => a.Id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...asset };
      setStorage('fm_assets', list);
    }
  },

  delete: async (id: string): Promise<void> => {
    await checkConnection();
    if (isDemoMode) {
      const list = getStorage('fm_assets', DEFAULT_ASSETS);
      const filtered = list.filter(a => a.Id !== id);
      setStorage('fm_assets', filtered);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/assets/${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() }
      });
      if (res.ok) return;
    } catch {}

    // fallback
    const list = getStorage('fm_assets', DEFAULT_ASSETS);
    const filtered = list.filter(a => a.Id !== id);
    setStorage('fm_assets', filtered);
  }
};

export const portfolioService = {
  getDetails: async (userId: string = 'u1'): Promise<{ portfolio: any; allocations: any[] }> => {
    await checkConnection();
    if (isDemoMode) {
      const p = getStorage('fm_portfolios', [DEFAULT_PORTFOLIO])[0];
      const allocs = getStorage('fm_allocations', DEFAULT_ALLOCATIONS);
      return { portfolio: p, allocations: allocs };
    }

    try {
      // Get portfolio list
      const resP = await fetch(`${API_URL}/portfolio/user/${userId}`, {
        headers: { ...getAuthHeader() }
      });
      if (resP.ok) {
        const portfolios = await resP.json();
        const mainP = portfolios[0] || await portfolioService.create({ Name: 'Kế Hoạch Phân Bổ Tổng Thể', Amount: 19139550 });
        
        // Get allocations
        const resA = await fetch(`${API_URL}/portfolioAllocation/portfolio/${mainP.id}`, {
          headers: { ...getAuthHeader() }
        });
        if (resA.ok) {
          const allocations = await resA.json();
          return { portfolio: mainP, allocations };
        }
      }
    } catch {}

    // Fallback
    const p = getStorage('fm_portfolios', [DEFAULT_PORTFOLIO])[0];
    const allocs = getStorage('fm_allocations', DEFAULT_ALLOCATIONS);
    return { portfolio: p, allocations: allocs };
  },

  create: async (portfolio: { Name: string; Amount: number }): Promise<any> => {
    const newP = {
      Id: Math.random().toString(36).substr(2, 9),
      ...portfolio,
      AccountID: 'u1'
    };
    if (isDemoMode) {
      setStorage('fm_portfolios', [newP]);
      return newP;
    }
    try {
      const res = await fetch(`${API_URL}/portfolio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          name: portfolio.Name,
          amount: portfolio.Amount,
          accountId: 'u1'
        })
      });
      if (res.ok) return await res.json();
    } catch {}
    setStorage('fm_portfolios', [newP]);
    return newP;
  },

  updateAmount: async (id: string, amount: number, name: string = 'Kế Hoạch Phân Bổ Tổng Thể'): Promise<void> => {
    await checkConnection();
    if (isDemoMode) {
      const p = getStorage('fm_portfolios', [DEFAULT_PORTFOLIO])[0];
      p.Amount = amount;
      setStorage('fm_portfolios', [p]);
      return;
    }
    try {
      await fetch(`${API_URL}/portfolio?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          id,
          name,
          amount,
          accountId: 'u1'
        })
      });
    } catch {}
    
    // Sync local
    const p = getStorage('fm_portfolios', [DEFAULT_PORTFOLIO])[0];
    p.Amount = amount;
    setStorage('fm_portfolios', [p]);
  },

  updateAllocations: async (allocations: any[]): Promise<void> => {
    await checkConnection();
    if (isDemoMode) {
      setStorage('fm_allocations', allocations);
      return;
    }

    try {
      // Loop and update or create. For simplicity and robustness, we save to local storage and try to sync
      for (const al of allocations) {
        if (al.Id.startsWith('al')) {
          // This is a default or mock id, we could post to create or put if exists
          await fetch(`${API_URL}/portfolioAllocation/${al.Id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify({
              id: al.Id,
              portfolioId: al.PortfolioId,
              financialCategory: al.FinancialCategory,
              name: al.Name,
              currentAmount: al.CurrentAmount,
              targetPercentage: al.TargetPercentage
            })
          }).catch(() => null);
        }
      }
    } catch {}
    
    // Always sync locally
    setStorage('fm_allocations', allocations);
  },

  // Budget Cut local persistence
  getBudgetCutConfig: () => {
    const income = getStorage('fm_income', 19139550);
    const targetReduction = getStorage('fm_target_reduction', 500000);
    const exclusions = getStorage('fm_exclusions', ['al12']);
    return { income, targetReduction, exclusions };
  },

  saveBudgetCutConfig: (config: { income: number; targetReduction: number; exclusions: string[] }) => {
    setStorage('fm_income', config.income);
    setStorage('fm_target_reduction', config.targetReduction);
    setStorage('fm_exclusions', config.exclusions);
  }
};
