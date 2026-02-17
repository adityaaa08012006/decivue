import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  TrendingUp,
  Pen,
  FileText,
  Bell,
  Settings,
  FileText as FileIcon,
  LogOut,
  LayoutDashboard,
  AlertTriangle,
} from "lucide-react";
import api from "../services/api";

const Sidebar = ({ currentView, onNavigate, refreshKey, user, onLogout }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();
    // Poll for new notifications every 5 seconds
    const interval = setInterval(fetchUnreadCount, 5000);
    return () => clearInterval(interval);
  }, [refreshKey]); // Re-fetch when refreshKey changes

  const fetchUnreadCount = async () => {
    try {
      const data = await api.getUnreadNotificationCount();
      setUnreadCount(data.count || 0);
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  };
  
  // Combine all items to find the active one for layoutId context, although logic is per-item
  
  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "dashboard",
      active: currentView === "dashboard",
    },
    { id: "team", label: "Your Team", icon: "users", active: currentView === "team" },
  ];

  const analyticsItems = [
    {
      id: "monitoring",
      label: "Decision Monitoring",
      icon: "trending",
      active: currentView === "monitoring",
    },
    {
      id: "assumptions",
      label: "Assumptions Section",
      icon: "pen",
      active: currentView === "assumptions",
    },
    {
      id: "decision-conflicts",
      label: "Decision Conflicts",
      icon: "alert",
      active: currentView === "decision-conflicts",
    },
  ];

  const otherItems = [
    {
      id: "flow",
      label: "Decision Flow",
      icon: "file",
      active: currentView === "flow",
      avatars: 3,
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: "bell",
      active: currentView === "notifications",
      badge: unreadCount,
    },
  ];

  const helpItems = [
    {
      id: "settings",
      label: "Settings",
      icon: "settings",
      active: currentView === "settings",
    },
    {
      id: "profile",
      label: "Organisation Information",
      icon: "doc",
      active: currentView === "profile",
    },
  ];

  const getIcon = (iconName) => {
    const iconProps = { size: 20, strokeWidth: 2 };
    switch (iconName) {
      case "dashboard":
        return <LayoutDashboard {...iconProps} />;
      case "users":
        return <Users {...iconProps} />;
      case "trending":
        return <TrendingUp {...iconProps} />;
      case "pen":
        return <Pen {...iconProps} />;
      case "warning":
        return <AlertTriangle {...iconProps} />;
      case "file":
        return <FileText {...iconProps} />;
      case "bell":
        return <Bell {...iconProps} />;
      case "settings":
        return <Settings {...iconProps} />;
      case "doc":
        return <FileText {...iconProps} />;
      default:
        return <FileIcon {...iconProps} />;
    }
  };

  const MenuItem = ({ item }) => (
    <div
      onClick={() => onNavigate && onNavigate(item.id)}
      className={`relative flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
        !item.active
          ? "text-neutral-gray-700 hover:bg-black/5 dark:text-neutral-gray-200 dark:hover:bg-white/5"
          : "text-white"
      }`}
    >
      {item.active && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute inset-0 bg-primary-blue rounded-lg shadow-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
      
      <div className="relative z-10 flex items-center gap-2">
        <div className={item.active ? "text-white" : "text-neutral-gray-600 dark:text-neutral-gray-400"}>
          {getIcon(item.icon)}
        </div>
        <span className="text-sm font-medium">{item.label}</span>
      </div>
      
      {item.badge && (
        <div className="relative z-10">
          <span className="bg-primary-red text-white text-xs font-semibold px-2 py-0.5 rounded-full">
            {item.badge}
          </span>
        </div>
      )}
      {item.avatars && (
        <div className="relative z-10 flex -space-x-2">
          <div className="w-6 h-6 rounded-full bg-neutral-gray-300 border-2 border-white" />
          <div className="w-6 h-6 rounded-full bg-neutral-gray-400 border-2 border-white" />
          <div className="w-6 h-6 rounded-full bg-neutral-gray-500 border-2 border-white" />
        </div>
      )}
    </div>
  );

  return (
    <div className="w-56 h-screen bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-r border-white/20 dark:border-gray-700/30 flex flex-col p-3 shadow-lg">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-3 px-2 flex-shrink-0">
        <div className="w-7 h-7 flex items-center justify-center">
          <img src="/assets/logo.png" alt="Decivue" className="w-7 h-7" />
        </div>
        <span className="text-lg font-bold text-neutral-black dark:text-white">
          Decivue
        </span>
      </div>

      {/* User Info */}
      {user && (
        <div className="px-2 py-2 mb-3 border-b border-white/30 dark:border-gray-600/30 flex-shrink-0 bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm rounded-lg">
          <p className="text-sm font-semibold text-neutral-black dark:text-white truncate">
            {user.fullName}
          </p>
          <p className="text-xs text-neutral-gray-500 dark:text-neutral-gray-400 truncate">
            {user.email}
          </p>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs px-2 py-1 rounded font-medium ${
                user.role === "lead"
                  ? "bg-primary-blue text-white"
                  : "bg-neutral-gray-200 dark:bg-neutral-gray-700 text-neutral-gray-700 dark:text-neutral-gray-300"
              }`}
            >
              {user.role === "lead" ? "Org Lead" : "Team Member"}
            </span>
            {user.role === "lead" && user.orgCode && (
              <span className="text-xs font-mono bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded font-semibold">
                {user.orgCode}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Content - No scrolling */}
      <div className="flex-1 flex flex-col">
        {/* MENU Section */}
        <div className="mb-3">
          <p className="text-xs font-semibold text-neutral-gray-500 dark:text-neutral-gray-400 mb-1.5 px-2">
            MENU
          </p>
          <div className="space-y-0.5">
            {menuItems.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}
          </div>
        </div>

        <div className="border-t border-white/20 dark:border-gray-600/20 my-1.5" />

        {/* ANALYTICS Section */}
        <div className="mb-3">
          <p className="text-xs font-semibold text-neutral-gray-500 dark:text-neutral-gray-400 mb-1.5 px-2">
            ANALYTICS
          </p>
          <div className="space-y-0.5">
            {analyticsItems.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}
          </div>
        </div>

        <div className="border-t border-white/20 dark:border-gray-600/20 my-1.5" />

        {/* Other Items */}
        <div className="mb-3">
          <div className="space-y-0.5">
            {otherItems.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}
          </div>
        </div>

        <div className="border-t border-white/20 dark:border-gray-600/20 my-1.5" />

        {/* HELP Section */}
        <div className="mb-3">
          <p className="text-xs font-semibold text-neutral-gray-500 dark:text-neutral-gray-400 mb-1.5 px-2">
            HELP
          </p>
          <div className="space-y-0.5">
            {helpItems.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>

      {/* Log out - Fixed at bottom */}
      <div className="flex-shrink-0 pt-2 border-t border-white/20 dark:border-gray-600/20">
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-3 py-1.5 text-primary-red dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/30 hover:backdrop-blur-md rounded-lg w-full transition-all"
        >
          <LogOut size={18} strokeWidth={2} />
          <span className="text-sm font-medium">Log out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
