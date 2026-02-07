import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Pen, FileText, Bell, Settings, FileText as FileIcon, LogOut, LayoutDashboard } from 'lucide-react';
import api from '../services/api';

const Sidebar = ({ currentView, onNavigate, refreshKey }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [refreshKey]); // Re-fetch when refreshKey changes

  const fetchUnreadCount = async () => {
    try {
      const data = await api.getUnreadNotificationCount();
      setUnreadCount(data.count || 0);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', active: currentView === 'dashboard' },
    { id: 'team', label: 'Your Team', icon: 'users', active: false },
  ];

  const analyticsItems = [
    { id: 'monitoring', label: 'Decision Monitoring', icon: 'trending', active: currentView === 'monitoring' },
    { id: 'assumptions', label: 'Assumptions Section', icon: 'pen', active: currentView === 'assumptions' },
  ];

  const otherItems = [
    { id: 'flow', label: 'Decision Flow', icon: 'file', active: currentView === 'flow', avatars: 3 },
    { id: 'notifications', label: 'Notifications', icon: 'bell', active: currentView === 'notifications', badge: unreadCount },
  ];

  const helpItems = [
    { id: 'settings', label: 'Settings', icon: 'settings', active: false },
    { id: 'profile', label: 'Organisation Information', icon: 'doc', active: currentView === 'profile' },
  ];

  const getIcon = (iconName) => {
    const iconProps = { size: 20, strokeWidth: 2 };
    switch (iconName) {
      case 'dashboard':
        return <LayoutDashboard {...iconProps} />;
      case 'users':
        return <Users {...iconProps} />;
      case 'trending':
        return <TrendingUp {...iconProps} />;
      case 'pen':
        return <Pen {...iconProps} />;
      case 'file':
        return <FileText {...iconProps} />;
      case 'bell':
        return <Bell {...iconProps} />;
      case 'settings':
        return <Settings {...iconProps} />;
      case 'doc':
        return <FileText {...iconProps} />;
      default:
        return <FileIcon {...iconProps} />;
    }
  };

  const MenuItem = ({ item }) => (
    <div
      onClick={() => onNavigate && onNavigate(item.id)}
      className={`flex items-center justify-between px-4 py-2 rounded-lg cursor-pointer transition-all ${item.active
        ? 'bg-primary-blue text-white'
        : 'text-neutral-gray-700 hover:bg-neutral-gray-100'
        }`}
    >
      <div className="flex items-center gap-3">
        <div className={item.active ? 'text-white' : 'text-neutral-gray-600'}>
          {getIcon(item.icon)}
        </div>
        <span className="text-sm font-medium">{item.label}</span>
      </div>
      {item.badge && (
        <span className="bg-primary-red text-white text-xs font-semibold px-2 py-0.5 rounded-full">
          {item.badge}
        </span>
      )}
      {item.avatars && (
        <div className="flex -space-x-2">
          <div className="w-6 h-6 rounded-full bg-neutral-gray-300 border-2 border-white" />
          <div className="w-6 h-6 rounded-full bg-neutral-gray-400 border-2 border-white" />
          <div className="w-6 h-6 rounded-full bg-neutral-gray-500 border-2 border-white" />
        </div>
      )}
    </div>
  );

  return (
    <div className="w-60 h-screen bg-neutral-white border-r border-neutral-gray-200 flex flex-col p-4">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-6 px-2 flex-shrink-0">
        <div className="w-8 h-8 flex items-center justify-center">
          <img src="/assets/logo.png" alt="Decivue" className="w-8 h-8" />
        </div>
        <span className="text-xl font-bold text-neutral-black">Decivue</span>
      </div>

      {/* Content - No scrolling */}
      <div className="flex-1 flex flex-col">
        {/* MENU Section */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-neutral-gray-500 mb-2 px-2">MENU</p>
          <div className="space-y-0.5">
            {menuItems.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}
          </div>
        </div>

        <div className="border-t border-neutral-gray-200 my-2" />

        {/* ANALYTICS Section */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-neutral-gray-500 mb-2 px-2">ANALYTICS</p>
          <div className="space-y-0.5">
            {analyticsItems.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}
          </div>
        </div>

        <div className="border-t border-neutral-gray-200 my-2" />

        {/* Other Items */}
        <div className="mb-4">
          <div className="space-y-0.5">
            {otherItems.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}
          </div>
        </div>

        <div className="border-t border-neutral-gray-200 my-2" />

        {/* HELP Section */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-neutral-gray-500 mb-2 px-2">HELP</p>
          <div className="space-y-0.5">
            {helpItems.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>

      {/* Log out - Fixed at bottom */}
      <div className="flex-shrink-0 pt-3 border-t border-neutral-gray-200">
        <button className="flex items-center gap-3 px-4 py-2 text-primary-red hover:bg-red-50 rounded-lg w-full transition-all">
          <LogOut size={20} strokeWidth={2} />
          <span className="text-sm font-medium">Log out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
