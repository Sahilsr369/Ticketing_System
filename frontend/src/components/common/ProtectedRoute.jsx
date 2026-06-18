import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Box              from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useAuth }        from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';

/**
 * Wraps routes that require authentication.
 * Optionally enforces a permission check.
 *
 * Usage:
 *   <ProtectedRoute>          — auth only
 *   <ProtectedRoute permission="users:view">  — auth + permission
 */
export default function ProtectedRoute({ children, permission }) {
  const { user, loading } = useAuth();
  const { can }           = usePermissions();
  const location          = useLocation();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', bgcolor: 'var(--bg)' }}>
        <CircularProgress size={28} sx={{ color: 'var(--accent)' }} />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (permission && !can(permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
