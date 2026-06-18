/**
 * TicketInputPanel — Left column of TicketDetail (Phase 5)
 * Displays quick-edit fields: status, priority, category, subcategory,
 * assignment, department, floor, due date.
 * Each field saves on change without a full form submit.
 */
import React, { useState, useEffect } from 'react';
import Box        from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField  from '@mui/material/TextField';
import MenuItem   from '@mui/material/MenuItem';
import Tooltip    from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';

import { ticketsService, usersService } from '../../services/api';
import { useCategories }  from '../../hooks/useCategories';
import { usePermissions } from '../../hooks/usePermissions';
import { useNotification } from '../../context/NotificationContext';
import { extractApiError }  from '../../utils/validation';
import { fullName }         from '../../utils/format';
import { STATUSES, PRIORITIES, DEPARTMENTS, FLOORS } from './ticketConstants';

function FieldLabel({ children }) {
  return (
    <Typography variant="caption" sx={{
      color: 'var(--text3)', fontSize: '0.5625rem',
      textTransform: 'uppercase', letterSpacing: '0.06em',
      display: 'block', mb: 0.5,
    }}>
      {children}
    </Typography>
  );
}

function SaveIndicator({ saving }) {
  if (!saving) return null;
  return <CircularProgress size={10} sx={{ color: 'var(--accent)', ml: 0.5 }} />;
}

export default function TicketInputPanel({ ticket, onSaved }) {
  const { can }    = usePermissions();
  const { success, error: notifyError } = useNotification();
  const { categories, subcategoriesFor } = useCategories();

  const canEdit   = can('tickets:edit_all') || can('tickets:edit_assigned');
  const canAssign = can('tickets:assign');

  const [saving,   setSaving]   = useState({});
  const [techUsers, setTechUsers] = useState([]);
  const [subcats,   setSubcats]   = useState([]);

  useEffect(() => {
    if (!canAssign) return;
    Promise.all([
      usersService.list({ role: 'IT_TECHNICIAN', active: true, pageSize: 100 }),
      usersService.list({ role: 'IT_MANAGER',    active: true, pageSize: 100 }),
    ]).then(([r1, r2]) => {
      setTechUsers([
        ...(r1.data?.data?.users || []),
        ...(r2.data?.data?.users || []),
      ]);
    }).catch(() => {});
  }, [canAssign]);

  useEffect(() => {
    if (ticket?.category?.id) {
      setSubcats(subcategoriesFor(ticket.category.id));
    } else {
      setSubcats([]);
    }
  }, [ticket?.category?.id, subcategoriesFor]);

  const save = async (field, value) => {
    if (!ticket) return;
    setSaving(s => ({ ...s, [field]: true }));
    try {
      await ticketsService.update(ticket.id, { [field]: value });
      success(`${field.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())} updated`);
      onSaved();
    } catch (err) {
      notifyError(extractApiError(err));
    } finally {
      setSaving(s => ({ ...s, [field]: false }));
    }
  };

  const saveStatus = async (status) => {
    if (!ticket) return;
    setSaving(s => ({ ...s, status: true }));
    try {
      await ticketsService.setStatus(ticket.id, { status });
      success('Status updated');
      onSaved();
    } catch (err) {
      notifyError(extractApiError(err));
    } finally {
      setSaving(s => ({ ...s, status: false }));
    }
  };

  const saveAssign = async (assignedToId) => {
    if (!ticket) return;
    setSaving(s => ({ ...s, assignedToId: true }));
    try {
      await ticketsService.assign(ticket.id, { assignedToId: assignedToId || null });
      success('Assignment updated');
      onSaved();
    } catch (err) {
      notifyError(extractApiError(err));
    } finally {
      setSaving(s => ({ ...s, assignedToId: false }));
    }
  };

  if (!ticket) return null;

  const inputSx = {
    '& .MuiOutlinedInput-root': { fontSize: '0.75rem', bgcolor: 'var(--bg3)' },
    '& .MuiSelect-select': { fontSize: '0.75rem' },
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

      {/* Status */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <FieldLabel>Status</FieldLabel>
          <SaveIndicator saving={saving.status} />
        </Box>
        <TextField select fullWidth size="small" value={ticket.status}
          onChange={e => saveStatus(e.target.value)}
          disabled={!canEdit || saving.status}
          sx={inputSx}>
          {STATUSES.map(o => (
            <MenuItem key={o.value} value={o.value} sx={{ fontSize: '0.75rem' }}>{o.label}</MenuItem>
          ))}
        </TextField>
      </Box>

      {/* Priority */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <FieldLabel>Priority</FieldLabel>
          <SaveIndicator saving={saving.priority} />
        </Box>
        <TextField select fullWidth size="small" value={ticket.priority}
          onChange={e => save('priority', e.target.value)}
          disabled={!canEdit || saving.priority}
          sx={inputSx}>
          {PRIORITIES.map(o => (
            <MenuItem key={o.value} value={o.value} sx={{ fontSize: '0.75rem' }}>{o.label}</MenuItem>
          ))}
        </TextField>
      </Box>

      {/* Category */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <FieldLabel>Category</FieldLabel>
          <SaveIndicator saving={saving.categoryId} />
        </Box>
        <TextField select fullWidth size="small"
          value={ticket.category?.id ?? ''}
          onChange={e => {
            const id = e.target.value || null;
            setSubcats(id ? subcategoriesFor(id) : []);
            save('categoryId', id);
          }}
          disabled={!canEdit || saving.categoryId}
          sx={inputSx}>
          <MenuItem value="" sx={{ fontSize: '0.75rem', color: 'var(--text3)' }}>— None —</MenuItem>
          {categories.map(c => (
            <MenuItem key={c.id} value={c.id} sx={{ fontSize: '0.75rem' }}>{c.name}</MenuItem>
          ))}
        </TextField>
      </Box>

      {/* Subcategory */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <FieldLabel>Subcategory</FieldLabel>
          <SaveIndicator saving={saving.subcategoryId} />
        </Box>
        <TextField select fullWidth size="small"
          value={ticket.subcategory?.id ?? ''}
          onChange={e => save('subcategoryId', e.target.value || null)}
          disabled={!canEdit || saving.subcategoryId || subcats.length === 0}
          sx={inputSx}>
          <MenuItem value="" sx={{ fontSize: '0.75rem', color: 'var(--text3)' }}>— None —</MenuItem>
          {subcats.map(s => (
            <MenuItem key={s.id} value={s.id} sx={{ fontSize: '0.75rem' }}>{s.name}</MenuItem>
          ))}
        </TextField>
      </Box>

      {/* Assigned To */}
      {canAssign && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <FieldLabel>Assigned To</FieldLabel>
            <SaveIndicator saving={saving.assignedToId} />
          </Box>
          <TextField select fullWidth size="small"
            value={ticket.assignedTo?.id ?? ''}
            onChange={e => saveAssign(e.target.value)}
            disabled={saving.assignedToId}
            sx={inputSx}>
            <MenuItem value="" sx={{ fontSize: '0.75rem', color: 'var(--text3)' }}>— Unassigned —</MenuItem>
            {techUsers.map(u => (
              <MenuItem key={u.id} value={u.id} sx={{ fontSize: '0.75rem' }}>
                {fullName(u)}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      )}

      {/* Department */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <FieldLabel>Department</FieldLabel>
          <SaveIndicator saving={saving.department} />
        </Box>
        <TextField select fullWidth size="small"
          value={ticket.department ?? ''}
          onChange={e => save('department', e.target.value || null)}
          disabled={!canEdit || saving.department}
          sx={inputSx}>
          <MenuItem value="" sx={{ fontSize: '0.75rem', color: 'var(--text3)' }}>— None —</MenuItem>
          {DEPARTMENTS.map(d => (
            <MenuItem key={d} value={d} sx={{ fontSize: '0.75rem' }}>{d}</MenuItem>
          ))}
        </TextField>
      </Box>

      {/* Floor */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <FieldLabel>Floor</FieldLabel>
          <SaveIndicator saving={saving.floor} />
        </Box>
        <TextField select fullWidth size="small"
          value={ticket.floor ?? ''}
          onChange={e => save('floor', e.target.value || null)}
          disabled={!canEdit || saving.floor}
          sx={inputSx}>
          <MenuItem value="" sx={{ fontSize: '0.75rem', color: 'var(--text3)' }}>— None —</MenuItem>
          {FLOORS.map(f => (
            <MenuItem key={f} value={f} sx={{ fontSize: '0.75rem' }}>Floor {f}</MenuItem>
          ))}
        </TextField>
      </Box>

      {/* Due Date */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <FieldLabel>Due Date</FieldLabel>
          <SaveIndicator saving={saving.dueAt} />
        </Box>
        <Tooltip title="Change due date">
          <TextField fullWidth size="small" type="datetime-local"
            value={ticket.dueAt ? ticket.dueAt.slice(0, 16) : ''}
            onChange={e => save('dueAt', e.target.value || null)}
            disabled={!canEdit || saving.dueAt}
            InputLabelProps={{ shrink: true }}
            sx={inputSx}
          />
        </Tooltip>
      </Box>

      {/* Users Affected */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <FieldLabel>Users Affected</FieldLabel>
          <SaveIndicator saving={saving.usersAffected} />
        </Box>
        <TextField fullWidth size="small" type="number"
          defaultValue={ticket.usersAffected}
          onBlur={e => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val > 0 && val !== ticket.usersAffected) {
              save('usersAffected', val);
            }
          }}
          disabled={!canEdit || saving.usersAffected}
          inputProps={{ min: 1 }}
          sx={inputSx}
        />
      </Box>

    </Box>
  );
}
