'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('clipdrop_token');
    if (!token) { setLoading(false); return; }

    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.user) setUser(data.user);
        else localStorage.removeItem('clipdrop_token');
      })
      .catch(() => localStorage.removeItem('clipdrop_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('clipdrop_token', token);
    setUser(userData);
  };

  const logout = async () => {
    const token = localStorage.getItem('clipdrop_token');
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    localStorage.removeItem('clipdrop_token');
    setUser(null);
  };

  const getToken = () => localStorage.getItem('clipdrop_token');

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
