import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Topbar from './Topbar';
import Sidebar from './Sidebar';

const SIDEBAR_WIDTH     = 240;
const SIDEBAR_COLLAPSED = 64;
const TOPBAR_HEIGHT     = 56;

export default function AppShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const width = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;

  return (
    <Box sx={{ display: 'grid', gridTemplateRows: `${TOPBAR_HEIGHT}px 1fr`, height: '100vh', overflow: 'hidden', bgcolor: 'var(--bg)' }}>
      {/* Topbar */}
      <Topbar sidebarWidth={width} onToggleSidebar={() => setCollapsed(c => !c)} />

      {/* Body row */}
      <Box sx={{ display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        <Sidebar width={width} collapsed={collapsed} />

        {/* Main content */}
        <Box
          component="main"
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: 0,
            bgcolor: 'var(--bg)',
          }}
        >
          <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0, p: 3 }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
