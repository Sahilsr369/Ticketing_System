import React, { useState, useEffect } from 'react';
import Dialog        from '@mui/material/Dialog';
import DialogTitle   from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField     from '@mui/material/TextField';
import Button        from '@mui/material/Button';
import MenuItem      from '@mui/material/MenuItem';
import Box           from '@mui/material/Box';
import Alert         from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Typography    from '@mui/material/Typography';
import { usersService }     from '../../services/api';
import { clean, isEmail, isRequired, extractApiError } from '../../utils/validation';
import { useNotification }  from '../../context/NotificationContext';

const ROLES = [
  { value: 'STANDARD_USER',  label: 'Standard User' },
  { value: 'IT_TECHNICIAN',  label: 'IT Technician' },
  { value: 'REPORTING_USER', label: 'Reporting User' },
  { value: 'IT_MANAGER',     label: 'IT Manager' },
  { value: 'SUPER_ADMIN',    label: 'Super Admin' },
];

const EMPTY = { firstName: '', lastName: '', email: '', password: '', role: 'STANDARD_USER' };

export default function UserFormDialog({ open, user, onClose, onSaved }) {
  const { success } = useNotification();
  const isEdit = !!user;

  const [form,       setForm]       = useState(EMPTY);
  const [errors,     setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError,   setApiError]   = useState('');

  useEffect(() => {
    if (open) {
      setApiError('');
      setErrors({});
      setForm(isEdit
        ? { firstName: user.firstName, lastName: user.lastName, email: user.email, password: '', role: user.role }
        : EMPTY
      );
    }
  }, [open, user, isEdit]);

  const handleChange = (e) => {
    setErrors(prev => ({ ...prev, [e.target.name]: '' }));
    setApiError('');
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    const errs = {};
    if (!isRequired(form.firstName)) errs.firstName = 'First name is required';
    if (!isRequired(form.lastName))  errs.lastName  = 'Last name is required';
    if (!isEmail(form.email))        errs.email     = 'Valid email is required';
    if (!isEdit) {
      if (!isRequired(form.password))          errs.password = 'Password is required';
      else if (form.password.length < 8)       errs.password = 'Minimum 8 characters';
      else if (!/[A-Z]/.test(form.password))   errs.password = 'Must contain an uppercase letter';
      else if (!/[0-9]/.test(form.password))   errs.password = 'Must contain a number';
    }
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
        firstName: clean(form.firstName),
        lastName:  clean(form.lastName),
        email:     clean(form.email),
        role:      form.role,
        ...(!isEdit && { password: form.password }),
      };

      if (isEdit) {
        await usersService.update(user.id, payload);
        success('User updated successfully');
      } else {
        await usersService.create(payload);
        success('User created successfully');
      }
      onSaved();
    } catch (err) {
      setApiError(extractApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const field = (name, label, type = 'text', extra = {}) => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="body2" sx={{ color: 'var(--text2)', mb: 0.5, fontWeight: 500 }}>
        {label}
      </Typography>
      <TextField
        fullWidth name={name} type={type}
        value={form[name]} onChange={handleChange}
        disabled={submitting}
        error={!!errors[name]}
        helperText={errors[name]}
        {...extra}
      />
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { bgcolor: 'var(--bg2)', border: '1px solid var(--border)' } }}
    >
      <DialogTitle sx={{ borderBottom: '1px solid var(--border)', pb: 1.5 }}>
        <Typography variant="h3" sx={{ color: 'var(--text)' }}>
          {isEdit ? `Edit User — ${user.firstName} ${user.lastName}` : 'Create New User'}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: 2.5 }}>
        {apiError && <Alert severity="error" sx={{ mb: 2, fontSize: '0.75rem' }}>{apiError}</Alert>}

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, columnGap: 2 }}>
          <Box>{field('firstName', 'First Name')}</Box>
          <Box>{field('lastName',  'Last Name')}</Box>
        </Box>

        {field('email', 'Email Address', 'email')}

        {!isEdit && field('password', 'Password', 'password', {
          placeholder: 'Min 8 chars, 1 uppercase, 1 number',
        })}

        <Box>
          <Typography variant="body2" sx={{ color: 'var(--text2)', mb: 0.5, fontWeight: 500 }}>
            Role
          </Typography>
          <TextField
            select fullWidth name="role"
            value={form.role} onChange={handleChange}
            disabled={submitting}
          >
            {ROLES.map(r => (
              <MenuItem key={r.value} value={r.value} sx={{ fontSize: '0.75rem' }}>
                {r.label}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, borderTop: '1px solid var(--border)', gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={submitting}
          variant="outlined"
          size="small"
          sx={{ borderColor: 'var(--border2)', color: 'var(--text2)' }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          size="small"
          disabled={submitting}
          sx={{ minWidth: 100 }}
        >
          {submitting
            ? <CircularProgress size={14} sx={{ color: 'inherit' }} />
            : isEdit ? 'Save Changes' : 'Create User'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
