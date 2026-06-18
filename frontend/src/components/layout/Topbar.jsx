import React from 'react';
import AppBar     from '@mui/material/AppBar';
import Toolbar    from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Box        from '@mui/material/Box';
import Tooltip    from '@mui/material/Tooltip';
import Avatar     from '@mui/material/Avatar';
import Chip       from '@mui/material/Chip';
import MenuIcon   from '@mui/icons-material/Menu';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import { useAuth }        from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { formatRole }     from '../../utils/format';

export default function Topbar({ sidebarWidth, onToggleSidebar }) {
  const { user, logout } = useAuth();
  const { role }         = usePermissions();

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
    : '?';

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        bgcolor: 'var(--bg2)',
        borderBottom: '1px solid var(--border)',
        zIndex: 1200,
      }}
    >
      <Toolbar variant="dense" sx={{ minHeight: 56, gap: 1 }}>
        {/* Sidebar toggle */}
        <IconButton size="small" onClick={onToggleSidebar} sx={{ color: 'var(--text2)' }}>
          <MenuIcon fontSize="small" />
        </IconButton>

        {/* Brand */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
          <ConfirmationNumberOutlinedIcon sx={{ color: 'var(--accent)', fontSize: 18 }} />
          <Typography variant="h5" sx={{ color: 'var(--text)', fontWeight: 700, letterSpacing: '-0.01em' }}>
            IT Helpdesk
          </Typography>
        </Box>

        <Box sx={{ flex: 1 }} />

        {/* Connection status chip */}
        <Chip
          size="small"
          label={user ? `Connected as ${user.firstName}` : 'Not connected'}
          sx={{
            bgcolor: user ? 'rgba(46,204,143,0.12)' : 'rgba(224,80,80,0.12)',
            color: user ? 'var(--green)' : 'var(--red)',
            border: `1px solid ${user ? 'rgba(46,204,143,0.3)' : 'rgba(224,80,80,0.3)'}`,
            fontSize: '0.6875rem',
            height: 22,
          }}
        />

        {/* Role badge */}
        {role && (
          <Chip
            size="small"
            label={formatRole(role)}
            sx={{
              bgcolor: 'rgba(79,124,255,0.12)',
              color: 'var(--accent)',
              border: '1px solid rgba(79,124,255,0.3)',
              fontSize: '0.6875rem',
              height: 22,
            }}
          />
        )}

        {/* User avatar + logout */}
        {user && (
          <Tooltip title={`${user.firstName} ${user.lastName} — Logout`}>
            <IconButton size="small" onClick={logout} sx={{ p: 0 }}>
              <Avatar
                sx={{
                  width: 30, height: 30,
                  bgcolor: 'var(--accent)',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {initials}
              </Avatar>
            </IconButton>
          </Tooltip>
        )}
      </Toolbar>
    </AppBar>
  );
}
