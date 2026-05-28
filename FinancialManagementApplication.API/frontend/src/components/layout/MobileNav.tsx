import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, Home, PieChart, Wallet, BarChart2, Settings, FileText, Calendar } from 'lucide-react';
import { useFinanceStore } from '../../store/financeStore';

export const MobileNav: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const logout = useFinanceStore(state => state.logout);

  const menuItems = [
    { to: '/dashboard', label: 'Dashboard', icon: <Home size={20} /> },
    { to: '/allocation-plans', label: 'Plans', icon: <PieChart size={20} /> },
    { to: '/portfolio', label: 'Portfolio', icon: <BarChart2 size={20} /> },
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
    <div className="fixed inset-x-0 bottom-0 md:hidden bg-black/40 backdrop-blur-xl border-t border-white/5 p-2">
      <button onClick={() => setOpen(!open)} className="p-2 text-gray-300">
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>
      {open && (
        <div className="absolute inset-0 bg-black/80 flex flex-col p-4 space-y-3">
          {menuItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 p-2 rounded-lg transition-colors ${isActive ? 'bg-primary/20 text-primary' : 'text-gray-300 hover:bg-white/5'}`
              }
              onClick={() => setOpen(false)}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
          <button onClick={handleLogout} className="flex items-center gap-3 p-2 rounded-lg text-gray-300 hover:bg-white/5">
            <X size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      )}
    </div>
  );
};
