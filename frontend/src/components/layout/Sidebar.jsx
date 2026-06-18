import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Box           from '@mui/material/Box';
import List          from '@mui/material/List';
import ListItem      from '@mui/material/ListItem';
import ListItemButton   from '@mui/material/ListItemButton';
import ListItemIcon     from '@mui/material/ListItemIcon';
import ListItemText     from '@mui/material/ListItemText';
import Tooltip       from '@mui/material/Tooltip';
import Divider       from '@mui/material/Divider';
import Typography    from '@mui/material/Typography';
import DashboardOutlinedIcon          from '@mui/icons-material/DashboardOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import PeopleOutlinedIcon             from '@mui/icons-material/PeopleOutlined';
import BarChartOutlinedIcon           from '@mui/icons-material/BarChartOutlined';
import SwapHorizOutlinedIcon          from '@mui/icons-material/SwapHorizOutlined';
import PersonOutlinedIcon             from '@mui/icons-material/PersonOutlined';
import HistoryOutlinedIcon            from '@mui/icons-material/HistoryOutlined';
import { usePermissions } from '../../hooks/usePermissions';

const NAV_ITEMS = [
  { label: 'Dashboard',       path: '/dashboard',     icon: <DashboardOutlinedIcon fontSize="small" />,          permission: null              },
  { label: 'Tickets',         path: '/tickets',        icon: <ConfirmationNumberOutlinedIcon fontSize="small" />, permission: null              },
  { label: 'Users',           path: '/users',          icon: <PeopleOutlinedIcon fontSize="small" />,             permission: 'users:view'      },
  { label: 'Reports',         path: '/reports',        icon: <BarChartOutlinedIcon fontSize="small" />,           permission: 'reports:view'    },
  { label: 'Import / Export', path: '/import-export',  icon: <SwapHorizOutlinedIcon fontSize="small" />,          permission: 'tickets:create'  },
  { label: 'Audit Log',       path: '/audit-log',      icon: <HistoryOutlinedIcon fontSize="small" />,            permission: 'users:view'      },
];

const ACCOUNT_ITEM = { label: 'My Account', path: '/account', icon: <PersonOutlinedIcon fontSize="small" /> };

export default function Sidebar({ width, collapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { can }  = usePermissions();

  const visible = NAV_ITEMS.filter(item => !item.permission || can(item.permission));

  const renderItem = (item) => {
    const active = location.pathname.startsWith(item.path);
    const btn = (
      <ListItemButton
        key={item.path}
        onClick={() => navigate(item.path)}
        sx={{
          mx: 1, mb: 0.5, borderRadius: '6px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          bgcolor:   active ? 'rgba(79,124,255,0.15)' : 'transparent',
          '&:hover': { bgcolor: active ? 'rgba(79,124,255,0.2)' : 'var(--bg4)' },
          minHeight: 36,
        }}
      >
        <ListItemIcon sx={{ minWidth: collapsed ? 0 : 32, color: active ? 'var(--accent)' : 'var(--text2)', justifyContent: 'center' }}>
          {item.icon}
        </ListItemIcon>
        {!collapsed && (
          <ListItemText
            primary={item.label}
            primaryTypographyProps={{ fontSize: '0.75rem', fontWeight: active ? 600 : 400, color: active ? 'var(--text)' : 'var(--text2)' }}
          />
        )}
      </ListItemButton>
    );

    return collapsed ? (
      <Tooltip key={item.path} title={item.label} placement="right">
        <ListItem disablePadding>{btn}</ListItem>
      </Tooltip>
    ) : (
      <ListItem key={item.path} disablePadding>{btn}</ListItem>
    );
  };

  return (
    <Box
      component="nav"
      sx={{
        width, flexShrink: 0,
        bgcolor: 'var(--bg2)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 0.2s ease',
      }}
    >
      <List dense disablePadding sx={{ flex: 1, pt: 1 }}>
        {visible.map(renderItem)}
      </List>

      <Divider sx={{ borderColor: 'var(--border)' }} />
      <List dense disablePadding sx={{ pb: 1 }}>
        {renderItem(ACCOUNT_ITEM)}
      </List>

      {!collapsed && (
        <>
          <Divider sx={{ borderColor: 'var(--border)' }} />
          <Box sx={{ p: 1.5 }}>
            <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.625rem' }}>
              IT Helpdesk v1.0.0 · Phase 9
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
}
