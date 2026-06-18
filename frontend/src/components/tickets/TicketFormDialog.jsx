import React, { useState, useEffect } from 'react';
import Dialog           from '@mui/material/Dialog';
import DialogTitle      from '@mui/material/DialogTitle';
import DialogContent    from '@mui/material/DialogContent';
import DialogActions    from '@mui/material/DialogActions';
import TextField        from '@mui/material/TextField';
import Button           from '@mui/material/Button';
import MenuItem         from '@mui/material/MenuItem';
import Box              from '@mui/material/Box';
import Alert            from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Typography       from '@mui/material/Typography';
import Divider          from '@mui/material/Divider';
import { ticketsService, usersService } from '../../services/api';
import { clean, isRequired, extractApiError } from '../../utils/validation';
import { useNotification } from '../../context/NotificationContext';
import { usePermissions }  from '../../hooks/usePermissions';
import { useCategories }   from '../../hooks/useCategories';
import { fullName }        from '../../utils/format';
import { STATUSES, PRIORITIES, DEPARTMENTS, FLOORS } from './ticketConstants';

const EMPTY = {
  title: '', description: '', status: 'LOGGED', priority: 'MEDIUM',
  categoryId: '', subcategoryId: '',
  department: '', floor: '',
  usersAffected: '1', incidentTime: '', dueAt: '', assignedToId: '',
};

function SectionLabel({ children }) {
  return (
    <Typography variant="caption" sx={{ color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 1, mt: 0.5 }}>
      {children}
    </Typography>
  );
}

function FieldLabel({ children, required }) {
  return (
    <Typography variant="body2" sx={{ color: 'var(--text2)', mb: 0.5, fontWeight: 500 }}>
      {children}{required && <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}
    </Typography>
  );
}

export default function TicketFormDialog({ open, ticket, onClose, onSaved }) {
  const { success } = useNotification();
  const { can }     = usePermissions();
  const isEdit      = !!ticket;

  const { categories, subcategoriesFor, loading: catsLoading } = useCategories();

  const [form,       setForm]       = useState(EMPTY);
  const [errors,     setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError,   setApiError]   = useState('');
  const [techUsers,  setTechUsers]  = useState([]);

  // Subcategories derived from the selected category
  const subcats = subcategoriesFor(form.categoryId || null);

  // Load assignable IT staff once per open
  useEffect(() => {
    if (!open) return;
    if (!can('tickets:assign')) return;
    usersService.list({ role: 'IT_TECHNICIAN', active: true, pageSize: 100 })
      .then(r => {
        const techs = r.data?.data?.users || [];
        return usersService.list({ role: 'IT_MANAGER', active: true, pageSize: 100 })
          .then(r2 => setTechUsers([...techs, ...(r2.data?.data?.users || [])]));
      })
      .catch(() => {});
  }, [open, can]);

  // Populate form on open
  useEffect(() => {
    if (!open) return;
    setApiError('');
    setErrors({});
    if (isEdit) {
      setForm({
        title:         ticket.title         || '',
        description:   ticket.description   || '',
        status:        ticket.status        || 'LOGGED',
        priority:      ticket.priority      || 'MEDIUM',
        categoryId:    ticket.category?.id  ?? '',
        subcategoryId: ticket.subcategory?.id ?? '',
        department:    ticket.department    || '',
        floor:         ticket.floor         || '',
        usersAffected: String(ticket.usersAffected ?? 1),
        incidentTime:  ticket.incidentTime  ? ticket.incidentTime.slice(0, 16) : '',
        dueAt:         ticket.dueAt         ? ticket.dueAt.slice(0, 16)        : '',
        assignedToId:  ticket.assignedTo?.id || '',
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, ticket, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setErrors(p => ({ ...p, [name]: '' }));
    setApiError('');
    setForm(f => {
      const next = { ...f, [name]: value };
      // Clear subcategory whenever category changes
      if (name === 'categoryId') next.subcategoryId = '';
      return next;
    });
  };

  const validate = () => {
    const errs = {};
    if (!isRequired(form.title))       errs.title       = 'Title is required';
    if (!isRequired(form.description)) errs.description = 'Description is required';
    const ua = parseInt(form.usersAffected, 10);
    if (isNaN(ua) || ua < 1)           errs.usersAffected = 'Must be at least 1';
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (submitting) return;

    setSubmitting(true);
    setApiError('');
    try {
      const payload = {
        title:         clean(form.title),
        description:   clean(form.description),
        status:        form.status,
        priority:      form.priority,
        categoryId:    form.categoryId    ? Number(form.categoryId)    : null,
        subcategoryId: form.subcategoryId ? Number(form.subcategoryId) : null,
        department:    clean(form.department)    || null,
        floor:         clean(form.floor)         || null,
        usersAffected: parseInt(form.usersAffected, 10),
        incidentTime:  form.incidentTime || null,
        dueAt:         form.dueAt        || null,
        assignedToId:  form.assignedToId || null,
      };

      if (isEdit) {
        await ticketsService.update(ticket.id, payload);
        success(`Ticket ${ticket.ticketNumber} updated`);
      } else {
        const res = await ticketsService.create(payload);
        success(`Ticket ${res.data.data.ticketNumber} created`);
      }
      onSaved();
    } catch (err) {
      setApiError(extractApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Field helpers ──────────────────────────────────────────────────────────
  const selectField = (name, label, options, required = false, extra = {}) => (
    <Box>
      <FieldLabel required={required}>{label}</FieldLabel>
      <TextField select fullWidth size="small" name={name} value={form[name]}
        onChange={handleChange} disabled={submitting}
        error={!!errors[name]} helperText={errors[name]} {...extra}>
        {options.map(o => (
          <MenuItem key={o.value ?? o} value={o.value ?? o} sx={{ fontSize: '0.75rem' }}>
            {o.label ?? o}
          </MenuItem>
        ))}
      </TextField>
    </Box>
  );

  const textField = (name, label, required = false, extra = {}) => (
    <Box>
      <FieldLabel required={required}>{label}</FieldLabel>
      <TextField fullWidth size="small" name={name} value={form[name]}
        onChange={handleChange} disabled={submitting}
        error={!!errors[name]} helperText={errors[name]} {...extra} />
    </Box>
  );

  // ─── Cascading category / subcategory ───────────────────────────────────────
  const categoryOptions = [
    { value: '', label: '— None —' },
    ...categories.map(c => ({ value: c.id, label: c.name })),
  ];

  const subcategoryOptions = [
    { value: '', label: subcats.length === 0 && form.categoryId ? '— No subcategories —' : '— None —' },
    ...subcats.map(s => ({ value: s.id, label: s.name })),
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { bgcolor: 'var(--bg2)', border: '1px solid var(--border)', maxHeight: '92vh' } }}>
      <DialogTitle sx={{ borderBottom: '1px solid var(--border)', pb: 1.5, color: 'var(--text)', fontSize: '0.9375rem', fontWeight: 700 }}>
        {isEdit ? `Edit Ticket — ${ticket.ticketNumber}` : 'Log New Ticket'}
      </DialogTitle>

      <DialogContent sx={{ pt: 2.5, overflowY: 'auto' }}>
        {apiError && <Alert severity="error" sx={{ mb: 2, fontSize: '0.75rem' }}>{apiError}</Alert>}

        {/* Core details */}
        <SectionLabel>Ticket Details</SectionLabel>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2.5 }}>
          {textField('title', 'Title', true, { placeholder: 'Brief summary of the issue…' })}
          <Box>
            <FieldLabel required>Description</FieldLabel>
            <TextField fullWidth multiline minRows={3} maxRows={6} size="small"
              name="description" value={form.description} onChange={handleChange}
              disabled={submitting} error={!!errors.description} helperText={errors.description}
              placeholder="Detailed description of the issue, steps to reproduce, impact…" />
          </Box>
        </Box>

        <Divider sx={{ borderColor: 'var(--border)', mb: 2 }} />

        {/* Classification */}
        <SectionLabel>Classification</SectionLabel>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, mb: 2.5 }}>

          {/* Category — cascading parent */}
          <Box>
            <FieldLabel>Category</FieldLabel>
            <TextField select fullWidth size="small" name="categoryId"
              value={form.categoryId} onChange={handleChange}
              disabled={submitting || catsLoading}
              error={!!errors.categoryId} helperText={errors.categoryId}>
              {categoryOptions.map(o => (
                <MenuItem key={o.value} value={o.value} sx={{ fontSize: '0.75rem' }}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Subcategory — cascading child, disabled until a category is chosen */}
          <Box>
            <FieldLabel>Subcategory</FieldLabel>
            <TextField select fullWidth size="small" name="subcategoryId"
              value={form.subcategoryId} onChange={handleChange}
              disabled={submitting || catsLoading || !form.categoryId}
              error={!!errors.subcategoryId} helperText={errors.subcategoryId}>
              {subcategoryOptions.map(o => (
                <MenuItem key={o.value} value={o.value} sx={{ fontSize: '0.75rem' }}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {selectField('priority', 'Priority', PRIORITIES)}
          {selectField('status', 'Status', STATUSES)}
          {textField('incidentTime', 'Incident Time', false, { type: 'datetime-local', InputLabelProps: { shrink: true } })}
          {textField('dueAt', 'Due Date', false, { type: 'datetime-local', InputLabelProps: { shrink: true } })}
        </Box>

        <Divider sx={{ borderColor: 'var(--border)', mb: 2 }} />

        {/* Location & Impact */}
        <SectionLabel>Location &amp; Impact</SectionLabel>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, mb: 2.5 }}>
          {selectField('department', 'Department', [
            { value: '', label: '— None —' },
            ...DEPARTMENTS.map(d => ({ value: d, label: d })),
          ])}
          {selectField('floor', 'Floor', [
            { value: '', label: '— None —' },
            ...FLOORS.map(f => ({ value: f, label: `Floor ${f}` })),
          ])}
          {textField('usersAffected', 'Users Affected', true, { type: 'number', inputProps: { min: 1 } })}
        </Box>

        {/* Assignment */}
        {can('tickets:assign') && (
          <>
            <Divider sx={{ borderColor: 'var(--border)', mb: 2 }} />
            <SectionLabel>Assignment</SectionLabel>
            <Box sx={{ maxWidth: 320 }}>
              <FieldLabel>Assign To</FieldLabel>
              <TextField select fullWidth size="small" name="assignedToId"
                value={form.assignedToId} onChange={handleChange} disabled={submitting}>
                <MenuItem value="" sx={{ fontSize: '0.75rem', color: 'var(--text3)' }}>— Unassigned —</MenuItem>
                {techUsers.map(u => (
                  <MenuItem key={u.id} value={u.id} sx={{ fontSize: '0.75rem' }}>
                    {fullName(u)} ({u.role === 'IT_MANAGER' ? 'Manager' : 'Technician'})
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, borderTop: '1px solid var(--border)', gap: 1 }}>
        <Button onClick={onClose} disabled={submitting} variant="outlined" size="small"
          sx={{ borderColor: 'var(--border2)', color: 'var(--text2)' }}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" size="small" disabled={submitting} sx={{ minWidth: 120 }}>
          {submitting
            ? <CircularProgress size={14} sx={{ color: 'inherit' }} />
            : isEdit ? 'Save Changes' : 'Log Ticket'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
