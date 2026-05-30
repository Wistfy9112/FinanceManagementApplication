// API service with automatic fallback to localStorage demo mode
const API_URL = 'http://localhost:5174/api';

// Check if we can reach the backend API
let isDemoMode = true;

// Custom event to notify components about connection changes
const triggerStatusChange = () => {
  window.dispatchEvent(new CustomEvent('api-status-changed', { detail: { isDemoMode } }));
};

// Helper function to decode JWT token in frontend
export const decodeJwt = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    
    // Map standard Microsoft claim types and default JWT claims
    const id = parsed["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || parsed.sub || parsed.nameid || 'u1';
    const email = parsed["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] || parsed.email || '';
    const displayName = parsed["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || parsed.name || parsed.unique_name || (email ? email.split('@')[0] : 'Khách');
    
    return { id, email, displayName };
  } catch (e) {
    console.error('Lỗi giải mã JWT token:', e);
    return null;
  }
};

// Helper to generate a Guid in frontend
const generateGuid = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Object mappers to bridge camelCase Backend with PascalCase Frontend
const ASSET_TYPES = ['Expense', 'Saving', 'Investment'] as const;

const mapType = (v: any): string => {
  if (typeof v === 'number') return ASSET_TYPES[v] || 'Saving';
  if (typeof v === 'string') return v;
  return 'Saving';
};

const mapAssetToFrontend = (a: any) => ({
  Id: a.id || a.Id,
  Name: a.name || a.Name,
  InitialValue: a.initialValue !== undefined ? Number(a.initialValue) : Number(a.InitialValue || 0),
  CurrentValue: a.currentValue !== undefined ? Number(a.currentValue) : Number(a.CurrentValue || 0),
  AccountID: a.accountId || a.accountID || a.AccountID,
  Type: mapType(a.type !== undefined ? a.type : a.Type)
});

const mapPortfolioToFrontend = (p: any) => ({
  Id: p.id || p.Id,
  Name: p.name || p.Name,
  Amount: p.amount !== undefined ? Number(p.amount) : Number(p.Amount || 0),
  AccountID: p.accountId || p.accountID || p.AccountID,
  Type: mapType(p.type !== undefined ? p.type : p.Type)
});

const mapAllocationToFrontend = (al: any) => ({
  Id: al.id || al.Id,
  PortfolioId: al.portfolioId || al.PortfolioId,
  FinancialCategory: al.financialCategory || al.FinancialCategory,
  Name: al.name || al.Name,
  CurrentAmount: al.currentAmount !== undefined ? Number(al.currentAmount) : Number(al.CurrentAmount || 0),
  TargetPercentage: al.targetPercentage !== undefined ? Number(al.targetPercentage) : Number(al.TargetPercentage || 0),
  AssetId: al.assetId !== undefined ? al.assetId : al.AssetId || null
});

export const checkConnection = async (): Promise<boolean> => {
  try {
    // Any HTTP response (even 404) means backend is running
    const res = await fetch(`${API_URL}/health`, {
      method: 'GET'
    }).catch(() => null);
    
    if (res !== null) {
      isDemoMode = false;
      localStorage.removeItem('fm_is_demo');
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
  { Id: 'a1', Name: 'Saving', InitialValue: 23984562, CurrentValue: 764842, Type: 'Saving' },
  { Id: 'a2', Name: 'Emergency', InitialValue: 6497662, CurrentValue: 562566, Type: 'Saving' },
  { Id: 'a3', Name: 'Unemployment fund', InitialValue: 2583793, CurrentValue: 2584453, Type: 'Saving' },
  { Id: 'a4', Name: 'Health', InitialValue: 12238827, CurrentValue: 12138827, Type: 'Saving' },
  { Id: 'a5', Name: 'Goal fund', InitialValue: 674481, CurrentValue: 177617, Type: 'Saving' },
  { Id: 'a6', Name: 'Skill Investment', InitialValue: 674481, CurrentValue: 177617, Type: 'Saving' },
  { Id: 'a7', Name: 'Margin', InitialValue: 77140127, CurrentValue: 19725414, Type: 'Investment' },
  { Id: 'a8', Name: 'ETF', InitialValue: 23567444, CurrentValue: 27220403, Type: 'Investment' },
  { Id: 'a9', Name: 'Cash', InitialValue: 90403667, CurrentValue: 95172704, Type: 'Expense' },
  { Id: 'a10', Name: 'Investment certificate', InitialValue: 22664368, CurrentValue: 21493033, Type: 'Investment' },
  { Id: 'a11', Name: 'Gold (Cash)', InitialValue: 2520966, CurrentValue: 637392, Type: 'Investment' },
  { Id: 'a12', Name: 'Gold', InitialValue: 0, CurrentValue: 0, Type: 'Investment' }
];

const DEFAULT_PORTFOLIO = {
  Id: 'p1',
  Name: 'Kế Hoạch Phân Bổ Tổng Thể',
  Amount: 19139550
};

const DEFAULT_ALLOCATIONS = [
  { Id: 'al1', PortfolioId: 'p1', FinancialCategory: 'Expense', Name: 'Tiền trọ', TargetPercentage: 15.11170, CurrentAmount: 2892310 },
  { Id: 'al2', PortfolioId: 'p1', FinancialCategory: 'Expense', Name: 'Chi phí sinh hoạt', TargetPercentage: 17.73982, CurrentAmount: 3395321 },
  { Id: 'al3', PortfolioId: 'p1', FinancialCategory: 'Expense', Name: 'Xăng xe đi lại', TargetPercentage: 1.97109, CurrentAmount: 377258 },
  { Id: 'al4', PortfolioId: 'p1', FinancialCategory: 'Expense', Name: 'Mua sắm', TargetPercentage: 2.95664, CurrentAmount: 565887 },
  { Id: 'al5', PortfolioId: 'p1', FinancialCategory: 'Expense', Name: 'Dự phòng', TargetPercentage: 2.95664, CurrentAmount: 565887 },
  { Id: 'al6', PortfolioId: 'p1', FinancialCategory: 'Expense', Name: 'Goal Fund', TargetPercentage: 0.65703, CurrentAmount: 125753 },
  { Id: 'al7', PortfolioId: 'p1', FinancialCategory: 'Expense', Name: 'Skill Investment', TargetPercentage: 0.65703, CurrentAmount: 125753 },
  { Id: 'al8', PortfolioId: 'p1', FinancialCategory: 'Expense', Name: 'Thiện nguyện', TargetPercentage: 0.65703, CurrentAmount: 125753 },
  { Id: 'al9', PortfolioId: 'p1', FinancialCategory: 'Expense', Name: 'Du lịch', TargetPercentage: 0.65703, CurrentAmount: 125753 },
  
  { Id: 'al10', PortfolioId: 'p1', FinancialCategory: 'Saving', Name: 'Saving', TargetPercentage: 0.65703, CurrentAmount: 125753 },
  { Id: 'al11', PortfolioId: 'p1', FinancialCategory: 'Saving', Name: 'Emergency', TargetPercentage: 0.65703, CurrentAmount: 125753 },
  { Id: 'al12', PortfolioId: 'p1', FinancialCategory: 'Saving', Name: 'Health', TargetPercentage: 11.16951, CurrentAmount: 2137795 },
  { Id: 'al13', PortfolioId: 'p1', FinancialCategory: 'Saving', Name: 'Unemployment fund', TargetPercentage: 0.65703, CurrentAmount: 125753 },
  { Id: 'al14', PortfolioId: 'p1', FinancialCategory: 'Investment', Name: 'Funds (Stock)', TargetPercentage: 20.49934, CurrentAmount: 3923482 },
  { Id: 'al15', PortfolioId: 'p1', FinancialCategory: 'Investment', Name: 'ETF (Stock)', TargetPercentage: 9.85545, CurrentAmount: 1886289 },
  { Id: 'al16', PortfolioId: 'p1', FinancialCategory: 'Investment', Name: 'Chứng chỉ quỹ', TargetPercentage: 9.85545, CurrentAmount: 1886289 },
  { Id: 'al17', PortfolioId: 'p1', FinancialCategory: 'Investment', Name: 'Margin (Stock)', TargetPercentage: 0.00000, CurrentAmount: 0 },
  { Id: 'al18', PortfolioId: 'p1', FinancialCategory: 'Investment', Name: 'Gold', TargetPercentage: 3.28515, CurrentAmount: 628763 }
];

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

// Only seed localStorage with demo data when running in demo mode
if (localStorage.getItem('fm_is_demo') === 'true' && !localStorage.getItem('fm_assets')) {
  setStorage('fm_assets', DEFAULT_ASSETS);
  setStorage('fm_portfolios', [DEFAULT_PORTFOLIO]);
  setStorage('fm_allocations', DEFAULT_ALLOCATIONS);
  setStorage('fm_income', 19139550);
  setStorage('fm_target_reduction', 500000);
  setStorage('fm_exclusions', ['al12']);
}

const getAuthHeader = (): Record<string, string> => {
  const token = localStorage.getItem('fm_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const getLoggedUser = () => {
  const token = localStorage.getItem('fm_token');
  const user = localStorage.getItem('fm_user');
  if (token && user) {
    return JSON.parse(user);
  }
  return null;
};

export const getLoggedUserId = (): string => {
  return getLoggedUser()?.id || 'u1';
};

export const getIsDemoMode = () => isDemoMode;

export const authService = {
  login: async (email: string, password: string): Promise<{ token: string; user: any }> => {
    localStorage.setItem('fm_is_demo', 'false');
    isDemoMode = false;
    // Clear any demo-seeded data so real API data is loaded fresh
    ['fm_assets', 'fm_portfolios', 'fm_allocations', 'fm_income', 'fm_target_reduction', 'fm_exclusions'].forEach(k => localStorage.removeItem(k));
    
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error('Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    const data = await res.json();
    
    const decoded = decodeJwt(data.token);
    const mockUser = { 
      id: decoded?.id || 'u1', 
      email: decoded?.email || email, 
      displayName: decoded?.displayName || 'Thành Viên' 
    };
    
    localStorage.setItem('fm_token', data.token);
    localStorage.setItem('fm_user', JSON.stringify(mockUser));
    triggerStatusChange();
    return { token: data.token, user: mockUser };
  },

  register: async (email: string, password: string, displayName: string): Promise<{ token: string; user: any }> => {
    localStorage.setItem('fm_is_demo', 'false');
    isDemoMode = false;
    // Clear any demo-seeded data so real API data is loaded fresh
    ['fm_assets', 'fm_portfolios', 'fm_allocations', 'fm_income', 'fm_target_reduction', 'fm_exclusions'].forEach(k => localStorage.removeItem(k));

    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName })
    });
    if (!res.ok) throw new Error('Đăng ký thất bại. Email có thể đã tồn tại.');
    const data = await res.json();
    
    const decoded = decodeJwt(data.token);
    const mockUser = { 
      id: decoded?.id || 'u1', 
      email: decoded?.email || email, 
      displayName: decoded?.displayName || displayName 
    };
    
    localStorage.setItem('fm_token', data.token);
    localStorage.setItem('fm_user', JSON.stringify(mockUser));
    triggerStatusChange();
    return { token: data.token, user: mockUser };
  },

  loginDemo: async (): Promise<{ token: string; user: any }> => {
    localStorage.setItem('fm_is_demo', 'true');
    isDemoMode = true;

    // Reset localStorage back to default values to showcase original setup cleanly
    setStorage('fm_assets', DEFAULT_ASSETS);
    setStorage('fm_portfolios', [DEFAULT_PORTFOLIO]);
    setStorage('fm_allocations', DEFAULT_ALLOCATIONS);
    setStorage('fm_income', 19139550);
    setStorage('fm_target_reduction', 500000);
    setStorage('fm_exclusions', ['al12']);

    const mockUser = { id: 'u1', email: 'demo@example.com', displayName: 'Huy Vô Dình' };
    localStorage.setItem('fm_token', 'mock-jwt-token-12345');
    localStorage.setItem('fm_user', JSON.stringify(mockUser));
    triggerStatusChange();
    return { token: 'mock-jwt-token-12345', user: mockUser };
  },

  logout: () => {
    localStorage.removeItem('fm_token');
    localStorage.removeItem('fm_user');
  }
};

export const assetService = {
  getAll: async (userId: string = getLoggedUserId()): Promise<any[]> => {
    await checkConnection();
    if (isDemoMode) {
      return getStorage('fm_assets', DEFAULT_ASSETS).map(mapAssetToFrontend);
    }
    try {
      const res = await fetch(`${API_URL}/assets/user/${userId}`, {
        headers: { ...getAuthHeader() }
      });
      if (res.ok) {
        const data = await res.json();
        return data.map(mapAssetToFrontend);
      }
    } catch (e) {
      console.error('Error fetching assets:', e);
    }
    // Non-demo: do NOT fall back to demo data; return empty list
    return [];
  },

  create: async (asset: { Name: string; InitialValue: number; CurrentValue: number; Type: string }, userId: string = getLoggedUserId()): Promise<any> => {
    await checkConnection();
    const mockId = 'a-' + Math.random().toString(36).substr(2, 9);
    const newAssetFrontend = {
      Id: mockId,
      Name: asset.Name,
      InitialValue: asset.InitialValue,
      CurrentValue: asset.CurrentValue,
      Type: asset.Type || 'Saving',
      AccountID: userId
    };
    
    if (isDemoMode) {
      const list = getStorage('fm_assets', DEFAULT_ASSETS);
      list.push(newAssetFrontend);
      setStorage('fm_assets', list);
      return newAssetFrontend;
    }

    try {
      const res = await fetch(`${API_URL}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          accountID: userId,
          name: asset.Name,
          initialValue: asset.InitialValue,
          currentValue: asset.CurrentValue,
          type: asset.Type
        })
      });
      if (res.ok) {
        const data = await res.json();
        return mapAssetToFrontend(data);
      }
    } catch (e) {
      console.error('Error creating asset:', e);
    }
    
    throw new Error('Không thể tạo tài sản trên máy chủ.');
  },

  update: async (id: string, asset: { Id: string; Name: string; InitialValue: number; CurrentValue: number; Type: string }, _userId: string = getLoggedUserId()): Promise<void> => {
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
          name: asset.Name,
          initialValue: asset.InitialValue,
          currentValue: asset.CurrentValue,
          type: asset.Type
        })
      });
      if (res.ok) return;
    } catch (e) {
      console.error('Error updating asset:', e);
    }
    
    throw new Error('Không thể cập nhật tài sản trên máy chủ.');
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
    } catch (e) {
      console.error('Error deleting asset:', e);
    }
  }
};

export const portfolioService = {
  getDetails: async (userId: string = getLoggedUserId()): Promise<{ portfolio: any; allocations: any[] }> => {
    await checkConnection();
    if (isDemoMode) {
      const p = getStorage('fm_portfolios', [DEFAULT_PORTFOLIO])[0];
      const allocs = getStorage('fm_allocations', DEFAULT_ALLOCATIONS);
      return { portfolio: p, allocations: allocs };
    }

    try {
      const resP = await fetch(`${API_URL}/portfolio/user/${userId}`, {
        headers: { ...getAuthHeader() }
      });
      if (resP.ok) {
        const portfolios = await resP.json();
        let mainP = portfolios[0];
        
        if (!mainP) {
          return { portfolio: null, allocations: [] };
        }
        mainP = mapPortfolioToFrontend(mainP);
        
        const resA = await fetch(`${API_URL}/portfolioAllocation/portfolio/${mainP.Id}`, {
          headers: { ...getAuthHeader() }
        });
        
        if (resA.ok) {
          let allocations = await resA.json();
          if (allocations.length > 0) {
            allocations = allocations.map(mapAllocationToFrontend);
          }
          
          return { portfolio: mainP, allocations };
        }
      }
    } catch (e) {
      console.error('Error fetching portfolio details:', e);
    }

    // Non-demo: do NOT fall back to demo data; return empty state
    return { portfolio: null, allocations: [] };
  },

  create: async (portfolio: { Name: string; Amount: number }, userId: string = getLoggedUserId()): Promise<any> => {
    const mockId = 'p-' + Math.random().toString(36).substr(2, 9);
    const newPFrontend = {
      Id: mockId,
      Name: portfolio.Name,
      Amount: portfolio.Amount,
      AccountID: userId
    };

    if (isDemoMode) {
      setStorage('fm_portfolios', [newPFrontend]);
      return newPFrontend;
    }

    try {
      const res = await fetch(`${API_URL}/portfolio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          accountID: userId,
          name: portfolio.Name,
          amount: portfolio.Amount,
          type: 'Saving'
        })
      });
      if (res.ok) {
        const data = await res.json();
        return mapPortfolioToFrontend(data);
      }
    } catch (e) {
      console.error('Error creating portfolio:', e);
    }

    throw new Error('Không thể tạo danh mục trên máy chủ.');
  },

  updateAmount: async (id: string, amount: number, name: string = 'Kế Hoạch Phân Bổ Tổng Thể', _userId: string = getLoggedUserId()): Promise<void> => {
    await checkConnection();
    if (isDemoMode) {
      const p = getStorage('fm_portfolios', [DEFAULT_PORTFOLIO])[0];
      p.Amount = amount;
      setStorage('fm_portfolios', [p]);
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/portfolio/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          name,
          amount,
          type: 'Saving'
        })
      });
      if (!res.ok) throw new Error('Update failed');
    } catch (e) {
      console.error('Error updating portfolio amount:', e);
      throw new Error('Không thể cập nhật danh mục trên máy chủ.');
    }
  },

  updateAllocations: async (allocations: any[]): Promise<void> => {
    // Standard fast local storage updates for sliders
    setStorage('fm_allocations', allocations);
  },

  saveAllocations: async (allocations: any[]): Promise<void> => {
    await checkConnection();
    if (isDemoMode) {
      setStorage('fm_allocations', allocations);
      return;
    }

    try {
      for (const al of allocations) {
        if (al.Id.startsWith('al')) {
          const generatedGuid = generateGuid();
          const newAl = {
            id: generatedGuid,
            portfolioId: al.PortfolioId,
            financialCategory: al.FinancialCategory,
            name: al.Name,
            currentAmount: al.CurrentAmount,
            targetPercentage: al.TargetPercentage,
            assetId: al.AssetId || null,
            updateAt: new Date().toISOString()
          };

          const res = await fetch(`${API_URL}/portfolioAllocation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify(newAl)
          });
          if (res.ok) {
            al.Id = generatedGuid;
          }
        } else {
          const body = {
            financialCategory: al.FinancialCategory,
            name: al.Name,
            currentAmount: al.CurrentAmount,
            targetPercentage: al.TargetPercentage,
            assetId: al.AssetId || null,
            updateAt: new Date().toISOString()
          };

          const res = await fetch(`${API_URL}/portfolioAllocation/${al.Id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify(body)
          });

          if (!res.ok && res.status === 404) {
            // Record doesn't exist in DB (e.g. seeding with fake ID), create it
            const newAl = {
              id: al.Id,
              portfolioId: al.PortfolioId,
              ...body
            };
            await fetch(`${API_URL}/portfolioAllocation`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
              body: JSON.stringify(newAl)
            });
          }
        }
      }
    } catch (e) {
      console.error('Lỗi lưu phân bổ:', e);
      throw new Error('Không thể đồng bộ phân bổ danh mục lên máy chủ backend.');
    }
  },

  getBudgetCutConfig: () => {
    if (isDemoMode) {
      const income = getStorage('fm_income', 19139550);
      const targetReduction = getStorage('fm_target_reduction', 500000);
      const exclusions = getStorage('fm_exclusions', ['al12']);
      return { income, targetReduction, exclusions };
    }
    // Non-demo: read from localStorage if previously saved by real user, else clean defaults
    const income = localStorage.getItem('fm_income') ? getStorage('fm_income', 0) : 0;
    const targetReduction = localStorage.getItem('fm_target_reduction') ? getStorage('fm_target_reduction', 0) : 0;
    const exclusions = localStorage.getItem('fm_exclusions') ? getStorage('fm_exclusions', []) : [];
    return { income, targetReduction, exclusions };
  },

  saveBudgetCutConfig: (config: { income: number; targetReduction: number; exclusions: string[] }) => {
    setStorage('fm_income', config.income);
    setStorage('fm_target_reduction', config.targetReduction);
    setStorage('fm_exclusions', config.exclusions);
  }
};
