import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Refresh token before it expires
  const refreshSession = async (currentSession) => {
    try {
      console.log('🔄 Attempting to refresh session...', {
        hasRefreshToken: !!currentSession?.refresh_token,
        refreshTokenLength: currentSession?.refresh_token?.length,
        currentExpiresAt: currentSession?.expires_at
      });

      if (!currentSession?.refresh_token) {
        console.error('❌ No refresh token available in session');
        return false;
      }

      console.log('📡 Calling /auth/refresh endpoint...');
      const response = await api.post('/auth/refresh', {
        refresh_token: currentSession.refresh_token
      });

      console.log('📦 Refresh response received:', {
        hasSession: !!response.session,
        newExpiresAt: response.session?.expires_at,
        newExpiresIn: response.session?.expires_in
      });

      const { session: newSession } = response;

      // Update stored session
      localStorage.setItem('decivue_session', JSON.stringify(newSession));
      api.setAuthToken(newSession.access_token);
      setSession(newSession);

      console.log('✅ Session refreshed successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to refresh session:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      console.log('🚪 Logging out due to refresh failure');
      logout();
      return false;
    }
  };

  // Set up automatic token refresh
  useEffect(() => {
    if (!session?.expires_at) return;

    // Calculate when to refresh (5 minutes before expiry)
    // Supabase returns expires_at in SECONDS, convert to milliseconds
    const expiresAt = typeof session.expires_at === 'number' && session.expires_at < 10000000000
      ? session.expires_at * 1000  // It's in seconds, convert to ms
      : new Date(session.expires_at).getTime(); // It's already a valid date
    
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    const refreshTime = Math.max(timeUntilExpiry - (5 * 60 * 1000), 10000); // Refresh 5 min before, or in 10s if already close

    console.log(`⏰ Token refresh scheduled in ${Math.round(refreshTime / 1000 / 60)} minutes (expires at ${new Date(expiresAt).toLocaleString()})`);

    const refreshTimer = setTimeout(() => {
      console.log('🔄 Refreshing session...');
      refreshSession(session);
    }, refreshTime);

    return () => clearTimeout(refreshTimer);
  }, [session]);

  // Initialize auth from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const storedSession = localStorage.getItem('decivue_session');
      const storedUser = localStorage.getItem('decivue_user');

      if (storedSession && storedUser) {
        try {
          const parsedSession = JSON.parse(storedSession);
          const parsedUser = JSON.parse(storedUser);

          // Check if token is expired or about to expire
          // Supabase returns expires_at in SECONDS, convert to milliseconds
          const expiresAt = parsedSession.expires_at 
            ? (typeof parsedSession.expires_at === 'number' && parsedSession.expires_at < 10000000000
                ? parsedSession.expires_at * 1000  // It's in seconds, convert to ms
                : new Date(parsedSession.expires_at).getTime()) // It's already a valid date
            : 0;
          const now = Date.now();
          const isExpired = expiresAt && now >= expiresAt;
          const expiringInLessThan5Min = expiresAt && (expiresAt - now) < (5 * 60 * 1000);
          
          console.log('🔍 Token expiry check:', {
            expiresAt: new Date(expiresAt).toLocaleString(),
            now: new Date(now).toLocaleString(),
            isExpired,
            expiringInLessThan5Min,
            minutesUntilExpiry: Math.round((expiresAt - now) / 1000 / 60)
          });

          if (isExpired || expiringInLessThan5Min) {
            // Try to refresh the session immediately BEFORE setting auth token
            console.log('🔄 Token expired or expiring soon, refreshing...');
            const success = await refreshSession(parsedSession);
            if (success) {
              // Token was refreshed successfully
              // Fetch user profile after refresh
              try {
                const response = await api.get('/auth/me');
                setUser(response.user);
                console.log('✅ Token refreshed and user loaded');
              } catch (err) {
                console.error('Failed to fetch user after refresh:', err);
                logout();
              }
            } else {
              // Refresh failed, logout
              console.error('❌ Token refresh failed, logging out');
              logout();
            }
          } else {
            // Token is still valid, set it and verify
            api.setAuthToken(parsedSession.access_token);
            
            try {
              const response = await api.get('/auth/me');
              setUser(response.user);
              setSession(parsedSession);
              console.log('✅ Session restored successfully');
            } catch (err) {
              // Token expired or invalid, or backend unavailable
              console.warn('Failed to verify session, clearing auth:', err);
              logout();
            }
          }
        } catch (error) {
          console.error('Failed to restore session:', error);
          logout();
        }
      }
      
      setLoading(false);
    };

    // Add timeout to prevent indefinite loading
    const timeoutId = setTimeout(() => {
      console.warn('Auth initialization timeout, continuing...');
      setLoading(false);
    }, 3000);

    initAuth().finally(() => {
      clearTimeout(timeoutId);
    });
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { session, user } = response;

      console.log('📝 Login response received:', {
        hasSession: !!session,
        hasUser: !!user,
        expiresAt: session?.expires_at,
        expiresIn: session?.expires_in
      });

      // Store in localStorage
      localStorage.setItem('decivue_session', JSON.stringify(session));
      localStorage.setItem('decivue_user', JSON.stringify(user));

      // Set auth token for API calls
      api.setAuthToken(session.access_token);

      setSession(session);
      setUser(user);

      console.log('✅ Login successful, user:', user.email);

      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      
      // Clear any stale session data on failed login to prevent conflicts
      localStorage.removeItem('decivue_session');
      localStorage.removeItem('decivue_user');
      api.setAuthToken(null);
      
      return {
        success: false,
        error: error.message || 'Login failed'
      };
    }
  };

  const registerCreateOrg = async (email, password, fullName, organizationName) => {
    try {
      const response = await api.post('/auth/register/create-org', {
        email,
        password,
        fullName,
        organizationName,
      });

      const { session, user } = response;

      localStorage.setItem('decivue_session', JSON.stringify(session));
      localStorage.setItem('decivue_user', JSON.stringify(user));

      api.setAuthToken(session.access_token);

      setSession(session);
      setUser(user);

      return { success: true, orgCode: user.orgCode };
    } catch (error) {
      console.error('Registration failed:', error);
      return {
        success: false,
        error: error.message || 'Registration failed'
      };
    }
  };

  const registerJoinOrg = async (email, password, fullName, orgCode) => {
    try {
      const response = await api.post('/auth/register/join-org', {
        email,
        password,
        fullName,
        orgCode,
      });

      const { session, user } = response;

      localStorage.setItem('decivue_session', JSON.stringify(session));
      localStorage.setItem('decivue_user', JSON.stringify(user));

      api.setAuthToken(session.access_token);

      setSession(session);
      setUser(user);

      return { success: true };
    } catch (error) {
      console.error('Registration failed:', error);
      return {
        success: false,
        error: error.message || 'Invalid organization code or registration failed'
      };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('decivue_session');
      localStorage.removeItem('decivue_user');
      api.setAuthToken(null);
      setSession(null);
      setUser(null);
    }
  };

  const value = {
    user,
    session,
    loading,
    login,
    logout,
    registerCreateOrg,
    registerJoinOrg,
    isAuthenticated: !!user,
    isLead: user?.role === 'lead',
    isMember: user?.role === 'member',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
