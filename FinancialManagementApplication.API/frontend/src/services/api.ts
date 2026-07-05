// API service
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5174/api';

export const checkServerStatus = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${API_URL}/health`, { method: 'GET', signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
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
    const displayName = parsed["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || parsed.name || parsed.unique_name || (email ? email.split('@')[0] : 'Guest');
    const username = parsed.username || '';
    
    return { id, email, displayName, username };
  } catch (e) {
    console.error('JWT token decode error:', e);
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
  Type: mapType(a.type !== undefined ? a.type : a.Type),
  CreatedAt: a.createdAt || a.CreatedAt,
  SortOrder: a.sortOrder ?? a.SortOrder ?? 0
});

const mapHistoryToFrontend = (r: any) => ({
  Id: r.id || r.Id,
  RecordedAt: r.recordedAt || r.RecordedAt,
  Details: (r.details || r.Details || []).map((d: any) => ({
    Id: d.id || d.Id,
    Name: d.name || d.Name,
    InitialValue: d.initialValue !== undefined ? Number(d.initialValue) : Number(d.InitialValue || 0),
    CurrentValue: d.currentValue !== undefined ? Number(d.currentValue) : Number(d.CurrentValue || 0),
    Type: d.type || d.Type || 'Saving'
  }))
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
  AssetId: al.assetId !== undefined ? al.assetId : al.AssetId || null,
  AssetType: al.assetType || al.AssetType || al.FinancialCategory || al.financialCategory || 'Saving',
  SortOrder: al.sortOrder ?? al.SortOrder ?? 0
});

const mapAllocationHistoryToFrontend = (r: any) => ({
  Id: r.id || r.Id,
  RecordedAt: r.recordedAt || r.RecordedAt,
  CurrentAmount: r.currentAmount !== undefined ? Number(r.currentAmount) : Number(r.CurrentAmount || 0),
  Details: (r.details || r.Details || []).map((d: any) => ({
    Id: d.id || d.Id,
    Name: d.name || d.Name,
    FinancialCategory: d.financialCategory || d.FinancialCategory,
    CurrentAmount: d.currentAmount !== undefined ? Number(d.currentAmount) : Number(d.CurrentAmount || 0),
    TargetPercentage: d.targetPercentage !== undefined ? Number(d.targetPercentage) : Number(d.TargetPercentage || 0),
    AssetType: d.assetType || d.AssetType || 'Saving'
  }))
});

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

export const authService = {
  login: async (username: string, password: string): Promise<{ token: string; user: any }> => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error('Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    const data = await res.json();
    
    const decoded = decodeJwt(data.token);
    const mockUser = { 
      id: decoded?.id || data.accountId || 'u1', 
      username: data.username || decoded?.username || username,
      email: data.email || decoded?.email || '', 
      displayName: data.displayName || decoded?.displayName || 'Member',
      createdAt: data.createAt
    };
    
    localStorage.setItem('fm_token', data.token);
    localStorage.setItem('fm_user', JSON.stringify(mockUser));
    return { token: data.token, user: mockUser };
  },

  register: async (username: string, password: string, displayName: string, email?: string): Promise<{ token: string; user: any }> => {
    const body: any = { username, password, displayName };
    if (email) body.email = email;

    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('Đăng ký thất bại. Tên đăng nhập có thể đã tồn tại.');
    const data = await res.json();
    
    const decoded = decodeJwt(data.token);
    const mockUser = { 
      id: decoded?.id || data.accountId || 'u1', 
      username: data.username || decoded?.username || username,
      email: data.email || decoded?.email || email || '', 
      displayName: data.displayName || decoded?.displayName || displayName,
      createdAt: data.createAt
    };
    
    localStorage.setItem('fm_token', data.token);
    localStorage.setItem('fm_user', JSON.stringify(mockUser));
    return { token: data.token, user: mockUser };
  },

  logout: () => {
    localStorage.removeItem('fm_token');
    localStorage.removeItem('fm_user');
  },

  getProfile: async (accountId: string): Promise<any> => {
    const res = await fetch(`${API_URL}/auth/profile/${accountId}`, { headers: getAuthHeader() });
    if (!res.ok) throw new Error('Không thể lấy thông tin người dùng.');
    return res.json();
  },

  updateProfile: async (accountId: string, displayName: string, email?: string): Promise<any> => {
    const body: any = { displayName };
    if (email !== undefined) body.email = email;
    const res = await fetch(`${API_URL}/auth/profile/${accountId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('Không thể cập nhật thông tin người dùng.');
    return res.json();
  },

  changePassword: async (accountId: string, currentPassword: string, newPassword: string): Promise<void> => {
    const res = await fetch(`${API_URL}/auth/change-password/${accountId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Không thể đổi mật khẩu.');
    }
  }
};

export const assetService = {
  getAll: async (userId: string = getLoggedUserId()): Promise<any[]> => {
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
    return [];
  },

  create: async (asset: { Name: string; InitialValue: number; CurrentValue: number; Type: string; CreatedAt?: string }, userId: string = getLoggedUserId()): Promise<any> => {
    const now = new Date().toISOString();
    const createdAt = asset.CreatedAt || now;
    try {
      const res = await fetch(`${API_URL}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          accountID: userId,
          name: asset.Name,
          initialValue: asset.InitialValue,
          currentValue: asset.CurrentValue,
          type: asset.Type,
          createdAt: createdAt
        })
      });
      if (res.ok) {
        const data = await res.json();
        return mapAssetToFrontend(data);
      }
    } catch (e) {
      console.error('Error creating asset:', e);
    }
    
    throw new Error('Không thể tạo tài sản do mất kết nối server.');
  },

  update: async (id: string, asset: { Id: string; Name: string; InitialValue: number; CurrentValue: number; Type: string }, _userId: string = getLoggedUserId()): Promise<void> => {
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
    
    throw new Error('Không thể cập nhật tài sản do mất kết nối server.');
  },

  delete: async (id: string): Promise<void> => {
    try {
      const res = await fetch(`${API_URL}/assets/${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() }
      });
      if (res.ok) return;
    } catch (e) {
      console.error('Error deleting asset:', e);
    }
  },

  reorder: async (items: { id: string; sortOrder: number }[]): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/assets/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ items })
      });
      return res.ok;
    } catch (e) {
      console.error('Error reordering assets:', e);
    }
    return false;
  }
};

export const portfolioService = {
  getDetails: async (userId: string = getLoggedUserId()): Promise<{ portfolio: any; allocations: any[] }> => {
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

    return { portfolio: null, allocations: [] };
  },

  create: async (portfolio: { Name: string; Amount: number }, userId: string = getLoggedUserId()): Promise<any> => {
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

    throw new Error('Không thể tạo danh mục do mất kết nối server.');
  },

  updateAmount: async (id: string, amount: number, name: string = 'Kế Hoạch Phân Bổ Tổng Thể', _userId: string = getLoggedUserId()): Promise<void> => {
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
      throw new Error('Không thể cập nhật danh mục do mất kết nối server.');
    }
  },

  saveAllocations: async (allocations: any[]): Promise<void> => {
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
            assetType: al.AssetType || al.FinancialCategory || 'Saving',
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
            assetType: al.AssetType || al.FinancialCategory || 'Saving',
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
      console.error('Allocation save error:', e);
      throw new Error('Không thể đồng bộ danh mục do mất kết nối server.');
    }
  },

  deleteAllocation: async (id: string): Promise<void> => {
    try {
      await fetch(`${API_URL}/portfolioAllocation/${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() }
      });
    } catch (e) {
      console.error('Allocation delete error:', e);
    }
  },

  getBudgetCutConfig: () => {
    const income = localStorage.getItem('fm_income') ? Number(localStorage.getItem('fm_income')) : 0;
    const targetReduction = localStorage.getItem('fm_target_reduction') ? Number(localStorage.getItem('fm_target_reduction')) : 0;
    const exclusions = localStorage.getItem('fm_exclusions') ? JSON.parse(localStorage.getItem('fm_exclusions')!) : [];
    return { income, targetReduction, exclusions };
  },

  saveBudgetCutConfig: (config: { income: number; targetReduction: number; exclusions: string[] }) => {
    localStorage.setItem('fm_income', String(config.income));
    localStorage.setItem('fm_target_reduction', String(config.targetReduction));
    localStorage.setItem('fm_exclusions', JSON.stringify(config.exclusions));
  },

  reorder: async (items: { id: string; sortOrder: number }[]): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/portfolioAllocation/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ items })
      });
      return res.ok;
    } catch (e) {
      console.error('Error reordering allocations:', e);
    }
    return false;
  }
};

export const historyService = {
  getAssetHistory: async (accountId: string): Promise<any[]> => {
    try {
      const res = await fetch(`${API_URL}/history/asset/${accountId}`, {
        headers: { ...getAuthHeader() }
      });
      if (res.ok) {
        const data = await res.json();
        return (Array.isArray(data) ? data : []).map(mapHistoryToFrontend);
      }
    } catch (e) {
      console.error('Error fetching asset history:', e);
    }
    return [];
  },

  saveSnapshot: async (accountId: string): Promise<any> => {
    try {
      const res = await fetch(`${API_URL}/history/asset/snapshot/${accountId}`, {
        method: 'POST',
        headers: { ...getAuthHeader() }
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error('Error saving history snapshot:', e);
    }
    return null;
  },

  restoreSnapshot: async (historyId: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/history/asset/restore/${historyId}`, {
        method: 'POST',
        headers: { ...getAuthHeader() }
      });
      return res.ok;
    } catch (e) {
      console.error('Error restoring history:', e);
    }
    return false;
  },

  deleteAssetHistory: async (historyId: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/history/asset/${historyId}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() }
      });
      return res.ok;
    } catch (e) {
      console.error('Error deleting asset history:', e);
    }
    return false;
  },

  getAllocationHistoryByAccount: async (accountId: string): Promise<any[]> => {
    try {
      const res = await fetch(`${API_URL}/history/allocation-history/${accountId}`, {
        headers: { ...getAuthHeader() }
      });
      if (res.ok) {
        const data = await res.json();
        return (Array.isArray(data) ? data : []).map(mapAllocationHistoryToFrontend);
      }
    } catch (e) {
      console.error('Error fetching allocation history:', e);
    }
    return [];
  },

  saveAllocationSetupSnapshot: async (accountId: string): Promise<any> => {
    try {
      const res = await fetch(`${API_URL}/history/allocation/snapshot/${accountId}`, {
        method: 'POST',
        headers: { ...getAuthHeader() }
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error('Error saving allocation snapshot:', e);
    }
    return null;
  },

  restoreAllocationSnapshot: async (historyId: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/history/allocation/restore/${historyId}`, {
        method: 'POST',
        headers: { ...getAuthHeader() }
      });
      return res.ok;
    } catch (e) {
      console.error('Error restoring allocation history:', e);
    }
    return false;
  },

  deleteAllocationHistory: async (historyId: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/history/allocation/${historyId}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() }
      });
      return res.ok;
    } catch (e) {
      console.error('Error deleting allocation history:', e);
    }
    return false;
  },

  updateAssetHistoryTime: async (historyId: string, recordedAt: string): Promise<any> => {
    try {
      const res = await fetch(`${API_URL}/history/asset/${historyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ recordedAt })
      });
      if (res.ok) {
        const result = await res.json();
        return result ? { Id: result.id || result.Id, RecordedAt: result.recordedAt || result.RecordedAt, Details: (result.details || result.Details || []).map((d: any) => ({
          Id: d.id || d.Id, Name: d.name || d.Name, InitialValue: d.initialValue ?? d.InitialValue ?? 0, CurrentValue: d.currentValue ?? d.CurrentValue ?? 0, Type: d.type || d.Type || 'Saving'
        })) } : null;
      }
    } catch (e) {
      console.error('Error updating asset history time:', e);
    }
    return null;
  },

  updateAllocationHistoryTime: async (historyId: string, recordedAt: string): Promise<any> => {
    try {
      const res = await fetch(`${API_URL}/history/allocation/${historyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ recordedAt })
      });
      if (res.ok) {
        const result = await res.json();
        return result ? { Id: result.id || result.Id, RecordedAt: result.recordedAt || result.RecordedAt, CurrentAmount: result.currentAmount ?? result.CurrentAmount ?? 0, Details: (result.details || result.Details || []).map((d: any) => ({
          Id: d.id || d.Id, Name: d.name || d.Name, FinancialCategory: d.financialCategory || d.FinancialCategory, CurrentAmount: d.currentAmount ?? d.CurrentAmount ?? 0, TargetPercentage: d.targetPercentage ?? d.TargetPercentage ?? 0, AssetType: d.assetType || d.AssetType || 'Saving'
        })) } : null;
      }
    } catch (e) {
      console.error('Error updating allocation history time:', e);
    }
    return null;
  }
};

// Goal mapper
const mapGoalToFrontend = (g: any) => ({
  Id: g.id || g.Id,
  AccountId: g.accountId || g.accountID || g.AccountId,
  Name: g.name || g.Name,
  TargetAmount: g.targetAmount !== undefined ? Number(g.targetAmount) : Number(g.TargetAmount || 0),
  StartDate: g.startDate || g.StartDate || null,
  DueDate: g.dueDate || g.DueDate,
  Status: g.status || g.Status || 'NotStarted',
  CreatedAt: g.createdAt || g.CreatedAt,
  UpdatedAt: g.updatedAt || g.UpdatedAt
});

// Goal Service
export const goalService = {
  getAll: async (userId: string = getLoggedUserId()): Promise<any[]> => {
    try {
      const res = await fetch(`${API_URL}/goals/user/${userId}`, {
        headers: { ...getAuthHeader() }
      });
      if (res.ok) {
        const data = await res.json();
        return data.map(mapGoalToFrontend);
      }
    } catch (e) {
      console.error('Error fetching goals:', e);
    }
    return [];
  },

  create: async (goal: { Name: string; TargetAmount: number; StartDate?: string; DueDate: string }, userId: string = getLoggedUserId()): Promise<any> => {
    try {
      const res = await fetch(`${API_URL}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          accountId: userId,
          name: goal.Name,
          targetAmount: goal.TargetAmount,
          startDate: goal.StartDate || null,
          dueDate: goal.DueDate
        })
      });
      if (res.ok) {
        const data = await res.json();
        return mapGoalToFrontend(data);
      }
    } catch (e) {
      console.error('Error creating goal:', e);
    }

    throw new Error('Không thể tạo mục tiêu do mất kết nối server.');
  },

  update: async (id: string, goal: { Name: string; TargetAmount: number; StartDate?: string; DueDate: string }, _userId: string = getLoggedUserId()): Promise<void> => {
    try {
      const res = await fetch(`${API_URL}/goals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          name: goal.Name,
          targetAmount: goal.TargetAmount,
          startDate: goal.StartDate || null,
          dueDate: goal.DueDate
        })
      });
      if (res.ok) return;
    } catch (e) {
      console.error('Error updating goal:', e);
    }

    throw new Error('Không thể cập nhật mục tiêu do mất kết nối server.');
  },

  delete: async (id: string): Promise<void> => {
    try {
      const res = await fetch(`${API_URL}/goals/${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() }
      });
      if (res.ok) return;
    } catch (e) {
      console.error('Error deleting goal:', e);
    }
  },

  start: async (id: string): Promise<void> => {
    try {
      await fetch(`${API_URL}/goals/${id}/start`, {
        method: 'POST',
        headers: { ...getAuthHeader() }
      });
    } catch (e) {
      console.error('Error starting goal:', e);
      throw new Error('Không thể bắt đầu mục tiêu do mất kết nối server.');
    }
  },

  cancel: async (id: string): Promise<void> => {
    try {
      await fetch(`${API_URL}/goals/${id}/cancel`, {
        method: 'POST',
        headers: { ...getAuthHeader() }
      });
    } catch (e) {
      console.error('Error cancelling goal:', e);
      throw new Error('Không thể hủy mục tiêu do mất kết nối server.');
    }
  }
};

// Debt mapper
const mapDebtToFrontend = (d: any) => ({
  Id: d.id || d.Id,
  AccountId: d.accountId || d.accountID || d.AccountId,
  Name: d.name || d.Name,
  TotalDebt: d.totalDebt !== undefined ? Number(d.totalDebt) : Number(d.TotalDebt || 0),
  PaidAmount: d.paidAmount !== undefined ? Number(d.paidAmount) : Number(d.PaidAmount || 0),
  RemainingAmount: d.remainingAmount !== undefined ? Number(d.remainingAmount) : Number(d.RemainingAmount || 0),
  BorrowDate: d.borrowDate || d.BorrowDate,
  DueDate: d.dueDate || d.DueDate || null,
  Note: d.note || d.Note || null,
  Description: d.description || d.Description || null,
  InterestRate: d.interestRate !== undefined ? Number(d.interestRate) : d.InterestRate !== undefined ? Number(d.InterestRate) : null,
  Type: d.type || d.Type || 'Borrowed',
  IsClosed: d.isClosed !== undefined ? d.isClosed : d.IsClosed || false,
  CreatedAt: d.createdAt || d.CreatedAt,
  UpdatedAt: d.updatedAt || d.UpdatedAt,
  Payments: (d.payments || d.Payments || []).map((p: any) => ({
    Id: p.id || p.Id,
    DebtId: p.debtId || p.DebtId,
    PaymentDate: p.paymentDate || p.PaymentDate,
    Amount: p.amount !== undefined ? Number(p.amount) : Number(p.Amount || 0),
    RemainingAfterPayment: p.remainingAfterPayment !== undefined ? Number(p.remainingAfterPayment) : Number(p.RemainingAfterPayment || 0),
    Note: p.note || p.Note || null,
    CreatedAt: p.createdAt || p.CreatedAt
  }))
});

// Debt Service
export const debtService = {
  getAll: async (userId: string = getLoggedUserId()): Promise<any[]> => {
    try {
      const res = await fetch(`${API_URL}/debts/user/${userId}`, {
        headers: { ...getAuthHeader() }
      });
      if (res.ok) {
        const data = await res.json();
        return data.map(mapDebtToFrontend);
      }
    } catch (e) {
      console.error('Error fetching debts:', e);
    }
    return [];
  },

  create: async (debt: { Name: string; TotalDebt: number; BorrowDate: string; DueDate?: string; Note?: string; Description?: string; InterestRate?: number | null; Type?: string }, userId: string = getLoggedUserId()): Promise<any> => {
    try {
      const res = await fetch(`${API_URL}/debts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          accountId: userId,
          name: debt.Name,
          totalDebt: debt.TotalDebt,
          borrowDate: debt.BorrowDate,
          dueDate: debt.DueDate || null,
          note: debt.Note || null,
          description: debt.Description || null,
          interestRate: debt.InterestRate !== undefined ? debt.InterestRate : null,
          type: debt.Type || 'Borrowed'
        })
      });
      if (res.ok) {
        const data = await res.json();
        return mapDebtToFrontend(data);
      }
    } catch (e) {
      console.error('Error creating debt:', e);
    }

    throw new Error('Không thể tạo khoản nợ do mất kết nối server.');
  },

  update: async (id: string, debt: { Name: string; TotalDebt: number; BorrowDate: string; DueDate?: string; Note?: string; Description?: string; InterestRate?: number | null; Type?: string }, _userId: string = getLoggedUserId()): Promise<void> => {
    try {
      const res = await fetch(`${API_URL}/debts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          name: debt.Name,
          totalDebt: debt.TotalDebt,
          borrowDate: debt.BorrowDate,
          dueDate: debt.DueDate || null,
          note: debt.Note || null,
          description: debt.Description || null,
          interestRate: debt.InterestRate !== undefined ? debt.InterestRate : null,
          type: debt.Type || 'Borrowed'
        })
      });
      if (res.ok) return;
    } catch (e) {
      console.error('Error updating debt:', e);
    }

    throw new Error('Không thể cập nhật khoản nợ do mất kết nối server.');
  },

  delete: async (id: string): Promise<void> => {
    try {
      const res = await fetch(`${API_URL}/debts/${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() }
      });
      if (res.ok) return;
    } catch (e) {
      console.error('Error deleting debt:', e);
    }
  },

  close: async (id: string): Promise<void> => {
    try {
      await fetch(`${API_URL}/debts/${id}/close`, {
        method: 'POST',
        headers: { ...getAuthHeader() }
      });
    } catch (e) {
      console.error('Error closing debt:', e);
      throw new Error('Không thể đóng khoản nợ do mất kết nối server.');
    }
  },

  addPayment: async (debtId: string, payment: { PaymentDate: string; Amount: number; Note?: string }): Promise<any> => {
    try {
      const res = await fetch(`${API_URL}/debts/${debtId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          debtId,
          paymentDate: payment.PaymentDate,
          amount: payment.Amount,
          note: payment.Note || null
        })
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (e) {
      console.error('Error adding payment:', e);
    }

    throw new Error('Không thể thêm thanh toán do mất kết nối server.');
  }
};

// Cash Flow Growth Service
export const cashFlowService = {
  getGrowthData: async (accountId: string, mode: string = 'yearly', year?: number): Promise<any> => {
    try {
      let url = `${API_URL}/cashflow/growth/${accountId}?mode=${mode}`;
      if (year) url += `&year=${year}`;
      const res = await fetch(url, {
        headers: { ...getAuthHeader() }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.error('Error fetching cash flow growth:', e);
    }
    return { mode, data: [] };
  }
};
