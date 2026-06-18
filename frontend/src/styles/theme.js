import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0d0f12',
      paper:   '#141720',
    },
    primary:   { main: '#4f7cff', light: '#6b95ff', dark: '#3a62d9' },
    secondary: { main: '#9b6fff' },
    success:   { main: '#2ecc8f' },
    warning:   { main: '#f0a030' },
    error:     { main: '#e05050' },
    info:      { main: '#20d4d4' },
    text: {
      primary:   '#e8eaf0',
      secondary: '#9399b0',
      disabled:  '#5a6080',
    },
    divider: 'rgba(255,255,255,0.08)',
  },
  typography: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif",
    fontSize: 12,
    h1: { fontSize: '1.25rem', fontWeight: 700 },
    h2: { fontSize: '1.125rem', fontWeight: 600 },
    h3: { fontSize: '1rem', fontWeight: 600 },
    h4: { fontSize: '0.875rem', fontWeight: 600 },
    h5: { fontSize: '0.8125rem', fontWeight: 600 },
    h6: { fontSize: '0.75rem', fontWeight: 600 },
    body1: { fontSize: '0.75rem' },
    body2: { fontSize: '0.6875rem' },
    caption: { fontSize: '0.625rem' },
    button: { fontSize: '0.75rem', textTransform: 'none', fontWeight: 500 },
    overline: { fontSize: '0.625rem' },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#141720',
          border: '1px solid rgba(255,255,255,0.08)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 6, padding: '6px 14px', fontWeight: 500 },
        containedPrimary: {
          background: '#4f7cff',
          '&:hover': { background: '#6b95ff' },
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small', variant: 'outlined' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#1c2030',
            '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          fontSize: '0.75rem',
          padding: '10px 16px',
        },
        head: {
          backgroundColor: '#1c2030',
          color: '#9399b0',
          fontWeight: 600,
          fontSize: '0.6875rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontSize: '0.625rem', height: 20, borderRadius: 4 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { fontSize: '0.6875rem', backgroundColor: '#242840' },
      },
    },
  },
});

export default theme;
