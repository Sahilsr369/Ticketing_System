import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import theme from './styles/theme';
import { AuthProvider }         from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute           from './components/common/ProtectedRoute';
import AppShell                 from './components/layout/AppShell';

import Login          from './pages/Login';
import Dashboard      from './pages/Dashboard';
import TicketList     from './pages/TicketList';
import TicketDetail   from './pages/TicketDetail';
import UserManagement from './pages/UserManagement';
import Reports        from './pages/Reports';
import ImportExport   from './pages/ImportExport';
import Account        from './pages/Account';
import AuditLog       from './pages/AuditLog';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NotificationProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <Routes>
                        <Route path="/"              element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard"     element={<Dashboard />} />
                        <Route path="/tickets"       element={<TicketList />} />
                        <Route path="/tickets/:id"   element={<TicketDetail />} />
                        <Route path="/users"         element={<ProtectedRoute permission="users:view"><UserManagement /></ProtectedRoute>} />
                        <Route path="/reports"       element={<ProtectedRoute permission="reports:view"><Reports /></ProtectedRoute>} />
                        <Route path="/import-export" element={<ProtectedRoute permission="tickets:create"><ImportExport /></ProtectedRoute>} />
                        <Route path="/account"       element={<Account />} />
                        <Route path="/audit-log"     element={<ProtectedRoute permission="users:view"><AuditLog /></ProtectedRoute>} />
                        <Route path="*"              element={<Navigate to="/dashboard" replace />} />
                      </Routes>
                    </AppShell>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}
