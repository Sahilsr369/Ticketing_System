import React, { useState } from 'react';
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
import { ticketsService }  from '../../services/api';
import { extractApiError } from '../../utils/validation';
import { useNotification } from '../../context/NotificationContext';
import { TicketStatusChip } from '../common/StatusChip';
import { STATUSES }        from './ticketConstants';

export default function StatusChangeDialog({ open, ticket, onClose, onSaved }) {
  const { success }           = useNotification();
  const [status,    setStatus]    = useState('');
  const [submitting,setSubmitting]= useState(false);
  const [apiError,  setApiError]  = useState('');

  React.useEffect(() => {
    if (open && ticket) { setStatus(ticket.status); setApiError(''); }
  }, [open, ticket]);

  const handleSubmit = async () => {
    if (!status || status === ticket?.status || submitting) return;
    setSubmitting(true);
    setApiError('');
    try {
      await ticketsService.setStatus(ticket.id, { status });
      success(`Status updated to ${status}`);
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
          Change Status — {ticket?.ticketNumber}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: 2.5 }}>
        {apiError && <Alert severity="error" sx={{ mb: 2, fontSize: '0.75rem' }}>{apiError}</Alert>}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography variant="body2" sx={{ color: 'var(--text2)' }}>Current:</Typography>
          {ticket && <TicketStatusChip status={ticket.status} />}
        </Box>
        <Typography variant="body2" sx={{ color: 'var(--text2)', mb: 0.75, fontWeight: 500 }}>New Status</Typography>
        <TextField select fullWidth size="small" value={status}
          onChange={e => { setApiError(''); setStatus(e.target.value); }} disabled={submitting}>
          {STATUSES.map(s => (
            <MenuItem key={s.value} value={s.value} sx={{ fontSize: '0.75rem' }}>
              {s.label}
            </MenuItem>
          ))}
        </TextField>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, borderTop: '1px solid var(--border)', gap: 1 }}>
        <Button onClick={onClose} disabled={submitting} variant="outlined" size="small"
          sx={{ borderColor: 'var(--border2)', color: 'var(--text2)' }}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" size="small"
          disabled={submitting || !status || status === ticket?.status} sx={{ minWidth: 120 }}>
          {submitting ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : 'Update Status'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
