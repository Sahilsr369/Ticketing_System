import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Box         from '@mui/material/Box';
import Paper       from '@mui/material/Paper';
import Typography  from '@mui/material/Typography';
import TextField   from '@mui/material/TextField';
import Button      from '@mui/material/Button';
import Alert       from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton  from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Divider     from '@mui/material/Divider';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import EmailOutlinedIcon  from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon   from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon     from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon  from '@mui/icons-material/VisibilityOffOutlined';
import { useAuth }           from '../context/AuthContext';
import { clean, extractApiError } from '../utils/validation';

export default function Login() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login, user, loading: authLoading } = useAuth();

  const [form,      setForm]      = useState({ email: '', password: '' });
  const [showPass,  setShowPass]  = useState(false);
  const [submitting,setSubmitting]= useState(false);
  const [error,     setError]     = useState('');

  // Redirect if already logged in
  const from = location.state?.from?.pathname || '/dashboard';
  useEffect(() => {
    if (!authLoading && user) navigate(from, { replace: true });
  }, [user, authLoading, navigate, from]);

  const handleChange = (e) => {
    setError('');
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const canSubmit = clean(form.email) && form.password && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (submitting) return;               // guard double-submit

    setSubmitting(true);
    setError('');
    try {
      await login(clean(form.email), form.password);
      // AuthContext redirect will handle navigation
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: 'var(--bg)',
        p: 2,
      }}
    >
      {/* Background grid decoration */}
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(79,124,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(79,124,255,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }}
      />

      <Paper
        component="form"
        onSubmit={handleSubmit}
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 400,
          p: 4,
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          bgcolor: 'var(--bg2)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Brand header */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box sx={{ display: 'inline-flex', p: 1.5, borderRadius: '12px', bgcolor: 'rgba(79,124,255,0.12)', mb: 1.5 }}>
            <ConfirmationNumberOutlinedIcon sx={{ color: 'var(--accent)', fontSize: 28 }} />
          </Box>
          <Typography variant="h2" sx={{ color: 'var(--text)', fontWeight: 700, mb: 0.5 }}>
            IT Helpdesk
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--text2)' }}>
            Sign in to your account
          </Typography>
        </Box>

        <Divider sx={{ borderColor: 'var(--border)', mb: 3 }} />

        {/* Error alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2, fontSize: '0.75rem', py: 0.5 }}>
            {error}
          </Alert>
        )}

        {/* Email */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ color: 'var(--text2)', mb: 0.75, fontWeight: 500 }}>
            Email address
          </Typography>
          <TextField
            fullWidth
            name="email"
            type="email"
            placeholder="you@company.com"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            autoFocus
            disabled={submitting}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailOutlinedIcon sx={{ fontSize: 16, color: 'var(--text3)' }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Password */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ color: 'var(--text2)', mb: 0.75, fontWeight: 500 }}>
            Password
          </Typography>
          <TextField
            fullWidth
            name="password"
            type={showPass ? 'text' : 'password'}
            placeholder="Enter your password"
            value={form.password}
            onChange={handleChange}
            autoComplete="current-password"
            disabled={submitting}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon sx={{ fontSize: 16, color: 'var(--text3)' }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setShowPass(v => !v)}
                    edge="end"
                    sx={{ color: 'var(--text3)' }}
                    tabIndex={-1}
                  >
                    {showPass
                      ? <VisibilityOffOutlinedIcon sx={{ fontSize: 16 }} />
                      : <VisibilityOutlinedIcon   sx={{ fontSize: 16 }} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Submit */}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={!canSubmit}
          sx={{
            height: 40,
            fontWeight: 600,
            fontSize: '0.8125rem',
            bgcolor: canSubmit ? 'var(--accent)' : undefined,
          }}
        >
          {submitting
            ? <CircularProgress size={16} sx={{ color: 'inherit' }} />
            : 'Sign In'}
        </Button>

        {/* Footer hint */}
        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'var(--text3)', mt: 3 }}>
          Contact your IT administrator if you need access.
        </Typography>
      </Paper>
    </Box>
  );
}
