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

  // Initialize auth from localStorage
  useEffect(() => {
    const storedSession = localStorage.getItem('decivue_session');
    const storedUser = localStorage.getItem('decivue_user');

    if (storedSession && storedUser) {
      try {
        const parsedSession = JSON.parse(storedSession);
        const parsedUser = JSON.parse(storedUser);

        // Set auth token for API calls
        api.setAuthToken(parsedSession.access_token);

        // Verify token is still valid
        api.get('/auth/me')
          .then(response => {
            setUser(response.user);
            setSession(parsedSession);
          })
          .catch(() => {
            // Token expired or invalid
            logout();
          })
          .finally(() => {
            setLoading(false);
          });
      } catch (error) {
        console.error('Failed to restore session:', error);
        logout();
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { session, user } = response;

      // Store in localStorage
      localStorage.setItem('decivue_session', JSON.stringify(session));
      localStorage.setItem('decivue_user', JSON.stringify(user));

      // Set auth token for API calls
      api.setAuthToken(session.access_token);

      setSession(session);
      setUser(user);

      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
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
