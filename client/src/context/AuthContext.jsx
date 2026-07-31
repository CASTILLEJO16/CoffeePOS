import { createContext, useContext, useState, useEffect } from 'react';
import { getUser, isAuthenticated, clearAuth } from '../services/authService.js';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getUser();
    if (user) {
      setUser(user);
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    setUser(userData.user);
  };

  const logout = () => {
    clearAuth();
    setUser(null);
  };

  const value = {
    user,
    loading,
    // derive auth from current state to avoid stale token issues
    isAuthenticated: !!user,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
