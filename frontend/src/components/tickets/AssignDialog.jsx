import React, { useState, useEffect } from 'react';
import Dialog        from '@mui/material/Dialog';
import DialogTitle   from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button        from '@mui/material/Button';
import MenuItem      from '@mui/material/MenuItem';
import TextField     from '@mui/material/TextField';
import Box           from '@mui/material/Box';
import Typography    from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert         from '@mui/material/Alert';
import { ticketsService, usersService } from '../../services/api';
import { extractApiError }              from '../../utils/validation';
import { fullName }                     from '../../utils/format';
import { useNotification }              from '../../context/NotificationContext';

export default function AssignDialog({ open, ticket, onClose, onSaved }) {
  const { success } = useNotification();
  const [techUsers,    setTechUsers]    = useState([]);
  const [assignedToId, setAssignedToId] = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [apiError,     setApiError]     = useState('');

  useEffect(() => {
    if (!open) return;
    setApiError('');
    setAssignedToId(ticket?.assignedTo?.id || '');
    Promise.all([
      usersService.list({ role: 'IT_TECHNICIAN', active: true, pageSize: 100 }),
      usersService.list({ role: 'IT_MANAGER',    active: true, pageSize: 100 }),
    ]).then(([r1, r2]) => {
      setTechUsers([...(r1.data?.data?.users || []), ...(r2.data?.data?.users || [])]);
    }).catch(() => {});
  }, [open, ticket]);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setApiError('');
    try {
      await ticketsService.assign(ticket.id, { assignedToId: assignedToId || null });
      success(assignedToId ? 'Ticket assigned' : 'Ticket unassigned');
      onSaved();
    } catch (err) {
      setApiError(extractApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { bgcolor: 'var(--bg2)', border: '1px solid var(--border)' } }}>
      <DialogTitle sx={{ borderBottom: '1px solid var(--border)', pb: 1.5 }}>
        <Typography variant="h4" sx={{ color: 'var(--text)' }}>
          Assign Ticket — {ticket?.ticketNumber}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: 2.5 }}>
        {apiError && <Alert severity="error" sx={{ mb: 2, fontSize: '0.75rem' }}>{apiError}</Alert>}
        <Typography variant="body2" sx={{ color: 'var(--text2)', mb: 0.75, fontWeight: 500 }}>Assign To</Typography>
        <TextField select fullWidth size="small" value={assignedToId}
          onChange={e => { setApiError(''); setAssignedToId(e.target.value); }}
          disabled={submitting}>
          <MenuItem value="" sx={{ fontSize: '0.75rem', color: 'var(--text3)' }}>— Unassigned —</MenuItem>
          {techUsers.map(u => (
            <MenuItem key={u.id} value={u.id} sx={{ fontSize: '0.75rem' }}>
              {fullName(u)} ({u.role === 'IT_MANAGER' ? 'Manager' : 'Technician'})
            </MenuItem>
          ))}
        </TextField>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, borderTop: '1px solid var(--border)', gap: 1 }}>
        <Button onClick={onClose} disabled={submitting} variant="outlined" size="small"
          sx={{ borderColor: 'var(--border2)', color: 'var(--text2)' }}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" size="small"
          disabled={submitting} sx={{ minWidth: 100 }}>
          {submitting ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : 'Assign'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
