import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

const initialState = {
  user:        null,
  accessToken: null,
  loading:     true,   // true on first load while we verify stored token
  error:       null,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'AUTH_LOADING':
      return { ...state, loading: true, error: null };
    case 'AUTH_SUCCESS':
      return { ...state, user: action.user, accessToken: action.accessToken, loading: false, error: null };
    case 'AUTH_ERROR':
      return { ...state, user: null, accessToken: null, loading: false, error: action.error };
    case 'AUTH_LOGOUT':
      return { ...initialState, loading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore session from sessionStorage on mount
  useEffect(() => {
    const token = sessionStorage.getItem('accessToken');
    if (!token) {
      dispatch({ type: 'AUTH_LOGOUT' });
      return;
    }
    authService.me()
      .then(({ data }) => {
        dispatch({ type: 'AUTH_SUCCESS', user: data.data, accessToken: token });
      })
      .catch(() => {
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        dispatch({ type: 'AUTH_LOGOUT' });
      });
  }, []);

  const login = useCallback(async (email, password) => {
    dispatch({ type: 'AUTH_LOADING' });
    const { data } = await authService.login(email.trim(), password);
    const { accessToken, refreshToken, user } = data.data;
    sessionStorage.setItem('accessToken', accessToken);
    sessionStorage.setItem('refreshToken', refreshToken);
    dispatch({ type: 'AUTH_SUCCESS', user, accessToken });
    return user;
  }, []);

  const logout = useCallback(async () => {
    try { await authService.logout(); } catch { /* best-effort */ }
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    dispatch({ type: 'AUTH_LOGOUT' });
  }, []);

  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
