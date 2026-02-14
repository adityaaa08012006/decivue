import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

export function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage for saved preference
    const saved = localStorage.getItem('decivue_theme');
    if (saved !== null) {
      return saved === 'dark';
    }
    // Default to light mode (can be changed to system preference if needed)
    return false;
  });

  // Apply theme immediately on mount and whenever it changes
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove both classes first to ensure clean state
    root.classList.remove('dark', 'light');
    
    // Apply the appropriate class
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('decivue_theme', 'dark');
    } else {
      root.classList.add('light');
      localStorage.setItem('decivue_theme', 'light');
    }
    
    console.log('🎨 Theme changed:', isDarkMode ? 'dark' : 'light');
    console.log('🎨 HTML classes:', root.classList.toString());
  }, [isDarkMode]);

  const toggleTheme = () => {
    console.log('🔄 Toggling theme from', isDarkMode ? 'dark' : 'light', 'to', isDarkMode ? 'light' : 'dark');
    setIsDarkMode(prev => !prev);
  };

  const value = {
    isDarkMode,
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
