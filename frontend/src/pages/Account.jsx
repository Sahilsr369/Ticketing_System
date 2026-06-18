import React, { useState } from 'react';
import Box              from '@mui/material/Box';
import Typography       from '@mui/material/Typography';
import Paper            from '@mui/material/Paper';
import TextField        from '@mui/material/TextField';
import Button           from '@mui/material/Button';
import Alert            from '@mui/material/Alert';
import Divider          from '@mui/material/Divider';
import Chip             from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import PersonOutlinedIcon       from '@mui/icons-material/PersonOutlined';
import LockOutlinedIcon         from '@mui/icons-material/LockOutlined';
import DownloadOutlinedIcon     from '@mui/icons-material/DownloadOutlined';
import ShieldOutlinedIcon       from '@mui/icons-material/ShieldOutlined';

import { useAuth } from '../context/AuthContext';
import { authService, gdprService } from '../services/api';
import { formatDateTime } from '../utils/format';

function SectionHeader({ icon, title, sub }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, mb: 2 }}>
      <Box sx={{ color: 'var(--accent)', mt: 0.25 }}>{icon}</Box>
      <Box>
        <Typography variant="h5" sx={{ color: 'var(--text)', fontWeight: 600 }}>{title}</Typography>
        {sub && <Typography variant="body2" sx={{ color: 'var(--text3)', fontSize: '0.75rem', mt: 0.25 }}>{sub}</Typography>}
      </Box>
    </Box>
  );
}

// ─── Profile panel ────────────────────────────────────────────────────────────
function ProfilePanel() {
  const { user } = useAuth();
  if (!user) return null;

  const labelSx = { color: 'var(--text3)', fontSize: '0.5625rem', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.5 };

  return (
    <Paper elevation={0} sx={{ p: 2.5 }}>
      <SectionHeader icon={<PersonOutlinedIcon sx={{ fontSize: 18 }} />} title="Profile" />
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <Box>
          <Typography sx={labelSx}>Name</Typography>
          <Typography variant="body2" sx={{ color: 'var(--text)', fontSize: '0.8125rem' }}>{user.firstName} {user.lastName}</Typography>
        </Box>
        <Box>
          <Typography sx={labelSx}>Email</Typography>
          <Typography variant="body2" sx={{ color: 'var(--text)', fontSize: '0.8125rem' }}>{user.email}</Typography>
        </Box>
        <Box>
          <Typography sx={labelSx}>Role</Typography>
          <Chip label={user.role?.replace(/_/g, ' ')} size="small"
            sx={{ height: 20, fontSize: '0.625rem', bgcolor: 'rgba(79,124,255,0.12)', color: 'var(--accent)' }} />
        </Box>
        <Box>
          <Typography sx={labelSx}>Last Login</Typography>
          <Typography variant="body2" sx={{ color: 'var(--text)', fontSize: '0.8125rem' }}>
            {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : '—'}
          </Typography>
        </Box>
        {user.loginCount != null && (
          <Box>
            <Typography sx={labelSx}>Total Logins</Typography>
            <Typography variant="body2" sx={{ color: 'var(--text)', fontFamily: 'monospace', fontSize: '0.8125rem' }}>{user.loginCount}</Typography>
          </Box>
        )}
        {user.createdAt && (
          <Box>
            <Typography sx={labelSx}>Member Since</Typography>
            <Typography variant="body2" sx={{ color: 'var(--text)', fontSize: '0.8125rem' }}>{formatDateTime(user.createdAt)}</Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
}

// ─── Password change panel ────────────────────────────────────────────────────
function PasswordPanel() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setError(''); setSuccess('');
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    setError(''); setSuccess('');
    if (!form.currentPassword || !form.newPassword) { setError('All fields are required'); return; }
    if (form.newPassword.length < 8) { setError('New password must be at least 8 characters'); return; }
    if (form.newPassword !== form.confirmPassword) { setError('New password and confirmation do not match'); return; }

    setSaving(true);
    try {
      await authService.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      setSuccess('Password changed successfully. You may need to log in again on other devices.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const fieldSx = { '& .MuiOutlinedInput-root': { bgcolor: 'var(--bg3)', fontSize: '0.8125rem' }, mb: 1.5 };

  return (
    <Paper elevation={0} sx={{ p: 2.5 }}>
      <SectionHeader icon={<LockOutlinedIcon sx={{ fontSize: 18 }} />} title="Change Password" sub="Changing your password will sign you out of all other devices." />
      {error   && <Alert severity="error"   sx={{ mb: 1.5, fontSize: '0.75rem' }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 1.5, fontSize: '0.75rem' }}>{success}</Alert>}

      <TextField fullWidth size="small" type="password" name="currentPassword" label="Current Password"
        value={form.currentPassword} onChange={handleChange} sx={fieldSx} InputLabelProps={{ sx: { fontSize: '0.8125rem' } }} />
      <TextField fullWidth size="small" type="password" name="newPassword" label="New Password"
        value={form.newPassword} onChange={handleChange} sx={fieldSx} InputLabelProps={{ sx: { fontSize: '0.8125rem' } }}
        helperText="Minimum 8 characters" FormHelperTextProps={{ sx: { fontSize: '0.625rem' } }} />
      <TextField fullWidth size="small" type="password" name="confirmPassword" label="Confirm New Password"
        value={form.confirmPassword} onChange={handleChange} sx={fieldSx} InputLabelProps={{ sx: { fontSize: '0.8125rem' } }} />

      <Button variant="contained" size="small" onClick={handleSubmit} disabled={saving}
        startIcon={saving ? <CircularProgress size={13} sx={{ color: 'inherit' }} /> : <LockOutlinedIcon sx={{ fontSize: 14 }} />}
        sx={{ fontSize: '0.75rem' }}>
        {saving ? 'Changing…' : 'Change Password'}
      </Button>
    </Paper>
  );
}

// ─── Privacy / GDPR panel ─────────────────────────────────────────────────────
function PrivacyPanel() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleExport = async () => {
    setLoading(true); setError('');
    try {
      const res  = await gdprService.exportMyData();
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data]);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `my-data-${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message || 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 2.5 }}>
      <SectionHeader
        icon={<ShieldOutlinedIcon sx={{ fontSize: 18 }} />}
        title="Privacy & Data"
        sub="Under data protection regulations, you have the right to access the personal data we hold about you."
      />
      {error && <Alert severity="error" sx={{ mb: 1.5, fontSize: '0.75rem' }}>{error}</Alert>}

      <Box sx={{ p: 1.5, bgcolor: 'var(--bg3)', borderRadius: '6px', border: '1px solid var(--border)', mb: 2 }}>
        <Typography variant="body2" sx={{ color: 'var(--text2)', fontSize: '0.75rem', mb: 1 }}>
          Your export includes: profile information, tickets you've submitted, comments you've authored, and your recent account activity history (last 200 entries).
        </Typography>
      </Box>

      <Button variant="outlined" size="small" onClick={handleExport} disabled={loading}
        startIcon={loading ? <CircularProgress size={13} /> : <DownloadOutlinedIcon sx={{ fontSize: 14 }} />}
        sx={{ borderColor: 'var(--border2)', color: 'var(--text2)', fontSize: '0.75rem' }}>
        {loading ? 'Preparing export…' : 'Export My Data (Excel)'}
      </Button>
    </Paper>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Account() {
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h2" sx={{ color: 'var(--text)', fontWeight: 700 }}>My Account</Typography>
        <Typography variant="body2" sx={{ color: 'var(--text2)', mt: 0.5 }}>
          Manage your profile, password, and personal data
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 640 }}>
        <ProfilePanel />
        <PasswordPanel />
        <PrivacyPanel />
      </Box>
    </Box>
  );
}
