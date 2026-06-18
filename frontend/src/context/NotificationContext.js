import React, { createContext, useContext, useState, useCallback } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notification, setNotification] = useState(null);

  const notify = useCallback((message, severity = 'info') => {
    setNotification({ message, severity, key: Date.now() });
  }, []);

  const success = useCallback((msg) => notify(msg, 'success'), [notify]);
  const error   = useCallback((msg) => notify(msg, 'error'),   [notify]);
  const warn    = useCallback((msg) => notify(msg, 'warning'), [notify]);
  const info    = useCallback((msg) => notify(msg, 'info'),    [notify]);

  const handleClose = (_, reason) => {
    if (reason === 'clickaway') return;
    setNotification(null);
  };

  return (
    <NotificationContext.Provider value={{ notify, success, error, warn, info }}>
      {children}
      {notification && (
        <Snackbar
          key={notification.key}
          open
          autoHideDuration={4000}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert onClose={handleClose} severity={notification.severity} variant="filled" sx={{ fontSize: '0.75rem' }}>
            {notification.message}
          </Alert>
        </Snackbar>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
}
