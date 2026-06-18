import React, { useState } from 'react';
import Box           from '@mui/material/Box';
import Typography    from '@mui/material/Typography';
import Button        from '@mui/material/Button';
import TextField     from '@mui/material/TextField';
import MenuItem      from '@mui/material/MenuItem';
import Table         from '@mui/material/Table';
import TableHead     from '@mui/material/TableHead';
import TableBody     from '@mui/material/TableBody';
import TableRow      from '@mui/material/TableRow';
import TableCell     from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Paper         from '@mui/material/Paper';
import IconButton    from '@mui/material/IconButton';
import Tooltip       from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert         from '@mui/material/Alert';
import Chip          from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import PersonAddOutlinedIcon  from '@mui/icons-material/PersonAddOutlined';
import EditOutlinedIcon       from '@mui/icons-material/EditOutlined';
import BlockOutlinedIcon      from '@mui/icons-material/BlockOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SearchIcon             from '@mui/icons-material/Search';
import RefreshIcon            from '@mui/icons-material/Refresh';
import { useUsers }          from '../hooks/useUsers';
import { usePermissions }    from '../hooks/usePermissions';
import { useNotification }   from '../context/NotificationContext';
import { usersService }      from '../services/api';
import { extractApiError }   from '../utils/validation';
import { formatDateTime }    from '../utils/format';
import { RoleChip }          from '../components/common/StatusChip';
import ConfirmDialog         from '../components/common/ConfirmDialog';
import UserFormDialog        from '../components/users/UserFormDialog';

const ROLE_OPTIONS = [
  { value: '',               label: 'All Roles' },
  { value: 'SUPER_ADMIN',    label: 'Super Admin' },
  { value: 'IT_MANAGER',     label: 'IT Manager' },
  { value: 'IT_TECHNICIAN',  label: 'IT Technician' },
  { value: 'REPORTING_USER', label: 'Reporting User' },
  { value: 'STANDARD_USER',  label: 'Standard User' },
];

export default function UserManagement() {
  const { users, total, loading, error, filters, refetch, updateFilter } = useUsers();
  const { can }         = usePermissions();
  const { success, error: notifyError } = useNotification();

  const [formOpen,     setFormOpen]     = useState(false);
  const [editingUser,  setEditingUser]  = useState(null);
  const [confirmOpen,  setConfirmOpen]  = useState(false);
  const [targetUser,   setTargetUser]   = useState(null);   // { user, action: 'activate'|'deactivate' }
  const [actionLoading,setActionLoading]= useState(false);

  const openCreate = ()      => { setEditingUser(null); setFormOpen(true); };
  const openEdit   = (user)  => { setEditingUser(user); setFormOpen(true); };

  const openConfirm = (user, action) => {
    setTargetUser({ user, action });
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!targetUser || actionLoading) return;
    setActionLoading(true);
    try {
      if (targetUser.action === 'deactivate') {
        await usersService.deactivate(targetUser.user.id);
        success(`${targetUser.user.firstName} ${targetUser.user.lastName} deactivated`);
      } else {
        await usersService.activate(targetUser.user.id);
        success(`${targetUser.user.firstName} ${targetUser.user.lastName} activated`);
      }
      refetch();
    } catch (err) {
      notifyError(extractApiError(err));
    } finally {
      setActionLoading(false);
      setConfirmOpen(false);
      setTargetUser(null);
    }
  };

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h2" sx={{ color: 'var(--text)', fontWeight: 700 }}>
            User Management
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--text2)', mt: 0.5 }}>
            {total} user{total !== 1 ? 's' : ''} total
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={refetch} sx={{ color: 'var(--text2)' }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {can('users:create') && (
            <Button
              variant="contained"
              size="small"
              startIcon={<PersonAddOutlinedIcon />}
              onClick={openCreate}
            >
              Add User
            </Button>
          )}
        </Box>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search by name or email…"
          size="small"
          value={filters.search}
          onChange={e => updateFilter('search', e.target.value)}
          sx={{ minWidth: 260 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 15, color: 'var(--text3)' }} />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          select size="small" value={filters.role || ''}
          onChange={e => updateFilter('role', e.target.value || undefined)}
          sx={{ minWidth: 160 }}
        >
          {ROLE_OPTIONS.map(o => (
            <MenuItem key={o.value} value={o.value} sx={{ fontSize: '0.75rem' }}>{o.label}</MenuItem>
          ))}
        </TextField>
        <TextField
          select size="small" value={filters.active === undefined ? '' : String(filters.active)}
          onChange={e => updateFilter('active', e.target.value === '' ? undefined : e.target.value === 'true')}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value=""        sx={{ fontSize: '0.75rem' }}>All Status</MenuItem>
          <MenuItem value="true"    sx={{ fontSize: '0.75rem' }}>Active</MenuItem>
          <MenuItem value="false"   sx={{ fontSize: '0.75rem' }}>Inactive</MenuItem>
        </TextField>
      </Box>

      {/* Error */}
      {error && <Alert severity="error" sx={{ mb: 2, fontSize: '0.75rem' }}>{error}</Alert>}

      {/* Table */}
      <TableContainer component={Paper} elevation={0}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Tickets</TableCell>
              {(can('users:edit') || can('users:deactivate')) && (
                <TableCell align="right">Actions</TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={24} sx={{ color: 'var(--accent)' }} />
                </TableCell>
              </TableRow>
            )}
            {!loading && users.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'var(--text3)' }}>
                  No users found
                </TableCell>
              </TableRow>
            )}
            {!loading && users.map(u => (
              <TableRow key={u.id} hover sx={{ '&:hover': { bgcolor: 'var(--bg4)' } }}>
                <TableCell sx={{ color: 'var(--text)', fontWeight: 500 }}>
                  {u.firstName} {u.lastName}
                </TableCell>
                <TableCell sx={{ color: 'var(--text2)', fontFamily: 'var(--font-mono)', fontSize: '0.6875rem' }}>
                  {u.email}
                </TableCell>
                <TableCell><RoleChip role={u.role} /></TableCell>
                <TableCell>
                  <Chip
                    label={u.active ? 'Active' : 'Inactive'}
                    size="small"
                    sx={{
                      bgcolor: u.active ? 'rgba(46,204,143,0.12)' : 'rgba(90,96,128,0.2)',
                      color:   u.active ? 'var(--green)'          : 'var(--text3)',
                      border:  `1px solid ${u.active ? 'rgba(46,204,143,0.3)' : 'rgba(90,96,128,0.3)'}`,
                      fontSize: '0.625rem', fontWeight: 600, height: 20, borderRadius: '4px',
                    }}
                  />
                </TableCell>
                <TableCell sx={{ color: 'var(--text2)' }}>{formatDateTime(u.createdAt)}</TableCell>
                <TableCell sx={{ color: 'var(--text2)' }}>
                  {u._count?.submittedTickets ?? 0} submitted · {u._count?.assignedTickets ?? 0} assigned
                </TableCell>
                {(can('users:edit') || can('users:deactivate')) && (
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                      {can('users:edit') && (
                        <Tooltip title="Edit User">
                          <IconButton size="small" onClick={() => openEdit(u)} sx={{ color: 'var(--accent)' }}>
                            <EditOutlinedIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {can('users:deactivate') && (
                        u.active ? (
                          <Tooltip title="Deactivate User">
                            <IconButton
                              size="small"
                              onClick={() => openConfirm(u, 'deactivate')}
                              sx={{ color: 'var(--red)' }}
                            >
                              <BlockOutlinedIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Activate User">
                            <IconButton
                              size="small"
                              onClick={() => openConfirm(u, 'activate')}
                              sx={{ color: 'var(--green)' }}
                            >
                              <CheckCircleOutlineIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                        )
                      )}
                    </Box>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* User Form Dialog */}
      <UserFormDialog
        open={formOpen}
        user={editingUser}
        onClose={() => setFormOpen(false)}
        onSaved={() => { setFormOpen(false); refetch(); }}
      />

      {/* Deactivate / Activate Confirmation */}
      <ConfirmDialog
        open={confirmOpen}
        danger={targetUser?.action === 'deactivate'}
        title={targetUser?.action === 'deactivate' ? 'Deactivate User' : 'Activate User'}
        message={
          targetUser?.action === 'deactivate'
            ? `This will prevent ${targetUser?.user?.firstName} ${targetUser?.user?.lastName} (${targetUser?.user?.email}) from signing in and will revoke all active sessions.`
            : `This will restore sign-in access for ${targetUser?.user?.firstName} ${targetUser?.user?.lastName} (${targetUser?.user?.email}).`
        }
        confirmLabel={targetUser?.action === 'deactivate' ? 'Deactivate' : 'Activate'}
        onConfirm={handleConfirm}
        onCancel={() => { setConfirmOpen(false); setTargetUser(null); }}
      />
    </Box>
  );
}
