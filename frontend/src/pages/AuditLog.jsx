import React, { useState, useEffect, useCallback } from 'react';
import Box              from '@mui/material/Box';
import Typography       from '@mui/material/Typography';
import Paper            from '@mui/material/Paper';
import TextField        from '@mui/material/TextField';
import MenuItem         from '@mui/material/MenuItem';
import Button           from '@mui/material/Button';
import Chip              from '@mui/material/Chip';
import CircularProgress  from '@mui/material/CircularProgress';
import Alert              from '@mui/material/Alert';
import IconButton         from '@mui/material/IconButton';
import RefreshIcon         from '@mui/icons-material/Refresh';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon     from '@mui/icons-material/CancelOutlined';
import ChevronLeftIcon        from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon       from '@mui/icons-material/ChevronRight';

import { auditService } from '../services/api';
import { formatDateTime, fullName } from '../utils/format';

const ACTIONS = [
  '', 'LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'TOKEN_REFRESH', 'PASSWORD_CHANGE', 'PASSWORD_RESET_BY_ADMIN',
  'USER_CREATED', 'USER_UPDATED', 'USER_DEACTIVATED', 'USER_ACTIVATED',
  'DATA_EXPORT', 'DATA_DELETION', 'DATA_ANONYMISE',
  'TICKET_DELETED', 'BULK_IMPORT', 'BULK_EXPORT',
];

const ACTION_COLORS = {
  LOGIN: 'var(--green)', LOGIN_FAILED: 'var(--red)', LOGOUT: 'var(--text2)',
  TOKEN_REFRESH: 'var(--cyan)', PASSWORD_CHANGE: 'var(--amber)', PASSWORD_RESET_BY_ADMIN: 'var(--amber)',
  USER_CREATED: 'var(--accent)', USER_UPDATED: 'var(--accent)',
  USER_DEACTIVATED: 'var(--red)', USER_ACTIVATED: 'var(--green)',
  DATA_EXPORT: 'var(--purple)', DATA_DELETION: 'var(--red)', DATA_ANONYMISE: 'var(--red)',
  TICKET_DELETED: 'var(--red)', BULK_IMPORT: 'var(--accent)', BULK_EXPORT: 'var(--purple)',
};

const EMPTY_FILTERS = { action: '', dateFrom: '', dateTo: '' };

export default function AuditLog() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page,    setPage]    = useState(1);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { page, pageSize: 50 };
      if (filters.action)   params.action   = filters.action;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo)   params.dateTo   = filters.dateTo;
      const res = await auditService.list(params);
      setData(res.data?.data);
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message || 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  const handleFilter = (key, val) => { setFilters(f => ({ ...f, [key]: val })); setPage(1); };
  const clearFilters  = () => { setFilters(EMPTY_FILTERS); setPage(1); };
  const hasFilters     = Object.values(filters).some(Boolean);

  const fieldSx = { '& .MuiOutlinedInput-root': { bgcolor: 'var(--bg3)', fontSize: '0.75rem' } };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h2" sx={{ color: 'var(--text)', fontWeight: 700 }}>Audit Log</Typography>
          <Typography variant="body2" sx={{ color: 'var(--text2)', mt: 0.5 }}>
            Security and compliance trail — logins, password changes, data access, and administrative actions
          </Typography>
        </Box>
        <Button size="small" startIcon={<RefreshIcon sx={{ fontSize: 14 }} />} onClick={load} disabled={loading}
          sx={{ color: 'var(--text2)', border: '1px solid var(--border2)', fontSize: '0.75rem' }}>
          Refresh
        </Button>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap', p: 2, bgcolor: 'var(--bg2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <TextField select size="small" value={filters.action} onChange={e => handleFilter('action', e.target.value)}
          sx={{ minWidth: 180, ...fieldSx }}>
          {ACTIONS.map(a => (
            <MenuItem key={a} value={a} sx={{ fontSize: '0.75rem' }}>{a || 'All Actions'}</MenuItem>
          ))}
        </TextField>
        <TextField size="small" type="date" value={filters.dateFrom} onChange={e => handleFilter('dateFrom', e.target.value)}
          InputLabelProps={{ shrink: true }} sx={{ minWidth: 160, ...fieldSx }}
          InputProps={{ startAdornment: <Typography variant="caption" sx={{ color: 'var(--text3)', mr: 0.5, fontSize: '0.6875rem' }}>From:</Typography> }} />
        <TextField size="small" type="date" value={filters.dateTo} onChange={e => handleFilter('dateTo', e.target.value)}
          InputLabelProps={{ shrink: true }} sx={{ minWidth: 160, ...fieldSx }}
          InputProps={{ startAdornment: <Typography variant="caption" sx={{ color: 'var(--text3)', mr: 0.5, fontSize: '0.6875rem' }}>To:</Typography> }} />
        {hasFilters && (
          <Button size="small" onClick={clearFilters} sx={{ color: 'var(--text2)', border: '1px solid var(--border2)', fontSize: '0.75rem' }}>
            Clear
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, fontSize: '0.75rem' }}>{error}</Alert>}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={24} sx={{ color: 'var(--accent)' }} />
        </Box>
      )}

      {!loading && data && (
        <Paper elevation={0} sx={{ p: 0, overflow: 'hidden' }}>
          {/* Table header */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr 140px 130px 70px 1fr', gap: 1, px: 2, py: 1.25, borderBottom: '1px solid var(--border)', bgcolor: 'var(--bg3)' }}>
            {['Action','User','IP Address','Timestamp','Status','Detail'].map(h => (
              <Typography key={h} variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.5625rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</Typography>
            ))}
          </Box>

          {data.logs.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'var(--text3)', fontSize: '0.75rem' }}>No audit log entries found for the selected filters.</Typography>
            </Box>
          ) : (
            data.logs.map(log => (
              <Box key={log.id} sx={{ display: 'grid', gridTemplateColumns: '140px 1fr 140px 130px 70px 1fr', gap: 1, px: 2, py: 1, borderBottom: '1px solid var(--border)', alignItems: 'center', '&:hover': { bgcolor: 'var(--bg3)' } }}>
                <Box>
                  <Chip label={log.action} size="small"
                    sx={{ height: 18, fontSize: '0.5625rem', fontWeight: 600, bgcolor: `${ACTION_COLORS[log.action] || 'var(--text3)'}1a`, color: ACTION_COLORS[log.action] || 'var(--text3)', border: `1px solid ${ACTION_COLORS[log.action] || 'var(--text3)'}40` }} />
                </Box>
                <Typography variant="body2" sx={{ color: 'var(--text)', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.user ? fullName(log.user) : <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>Unknown</span>}
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--text2)', fontFamily: 'monospace', fontSize: '0.6875rem' }}>
                  {log.ipAddress || '—'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--text2)', fontSize: '0.6875rem' }}>
                  {formatDateTime(log.createdAt)}
                </Typography>
                <Box>
                  {log.success
                    ? <CheckCircleOutlineIcon sx={{ fontSize: 15, color: 'var(--green)' }} />
                    : <CancelOutlinedIcon sx={{ fontSize: 15, color: 'var(--red)' }} />}
                </Box>
                <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.625rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.detail || log.resource || '—'}
                </Typography>
              </Box>
            ))
          )}

          {/* Pagination */}
          {data.totalPages > 1 && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, borderTop: '1px solid var(--border)' }}>
              <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.6875rem' }}>
                Page {data.page} of {data.totalPages} · {data.total.toLocaleString()} total entries
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton size="small" disabled={page <= 1} onClick={() => setPage(p => p - 1)} sx={{ color: 'var(--text2)' }}>
                  <ChevronLeftIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <IconButton size="small" disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)} sx={{ color: 'var(--text2)' }}>
                  <ChevronRightIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
}
