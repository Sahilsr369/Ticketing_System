import React from 'react';
import Box        from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip       from '@mui/material/Chip';

export default function PagePlaceholder({ title, phase, description }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        gap: 2,
      }}
    >
      <Chip
        label={`Phase ${phase}`}
        sx={{
          bgcolor: 'rgba(240,160,48,0.12)',
          color: 'var(--amber)',
          border: '1px solid rgba(240,160,48,0.3)',
          fontSize: '0.6875rem',
          fontWeight: 600,
        }}
      />
      <Typography variant="h3" sx={{ color: 'var(--text)', fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: 'var(--text2)', textAlign: 'center', maxWidth: 400 }}>
        {description || `This page will be built in Phase ${phase}.`}
      </Typography>
    </Box>
  );
}
