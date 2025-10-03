import React, { createContext, useContext, useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../services/constants';

interface DecodedToken {
  exp: number;
}

interface AuthContextType {
  isAuthenticated: boolean | null;
  login: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: null,
  login: () => {},
  logout: () => {},
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Vérifie token et le rafraîchit si besoin
  const checkAuth = async () => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (!token) {
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      const now = Date.now() / 1000;

      if (decoded.exp < now) {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN);
        if (!refreshToken) throw new Error('No refresh token');

        const res = await api.post('/api/token/refresh/', {
          refresh: refreshToken,
        });
        if (res.status === 200) {
          localStorage.setItem(ACCESS_TOKEN, res.data.access);
          setIsAuthenticated(true);
        } else {
          throw new Error('Refresh failed');
        }
      } else {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth check failed', error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = (accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN, accessToken);
    localStorage.setItem(REFRESH_TOKEN, refreshToken);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
