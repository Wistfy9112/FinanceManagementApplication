import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Home, PieChart, Wallet, BarChart2, Settings, FileText, Calendar } from 'lucide-react';
import { useFinanceStore } from '../../store/financeStore';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const logout = useFinanceStore((state) => state.logout);

  const menuItems = [
    { to: '/dashboard', label: 'Dashboard', icon: <Home size={20} /> },
    { to: '/allocation-plans', label: 'Allocation Plans', icon: <PieChart size={20} /> },
    { to: '/portfolio', label: 'Portfolio Allocation', icon: <BarChart2 size={20} /> },
    { to: '/assets', label: 'Assets', icon: <FileText size={20} /> },
    { to: '/wallets', label: 'Wallets', icon: <Wallet size={20} /> },
    { to: '/history', label: 'History', icon: <Calendar size={20} /> },
    { to: '/reports', label: 'Reports', icon: <BarChart2 size={20} /> },
    { to: '/settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-black/30 backdrop-blur-xl border-r border-white/5 p-6">
      <div className="flex items-center mb-8">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-primary">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="ml-2 text-2xl font-display text-transparent bg-clip-text bg-gradient-to-r from-primary to-pink-500">FINANCE FLOW</span>
      </div>
      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 p-2 rounded-lg transition-colors ${isActive ? 'bg-primary/20 text-primary' : 'text-gray-300 hover:bg-white/5'}
            `
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <button onClick={handleLogout} className="mt-4 flex items-center gap-3 p-2 rounded-lg text-gray-300 hover:bg-white/5 transition-colors">
        <LogOut size={20} />
        <span className="font-medium">Logout</span>
      </button>
    </aside>
  );
};
