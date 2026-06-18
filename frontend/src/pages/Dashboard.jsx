import React, { useState } from 'react';
import { useNavigate }  from 'react-router-dom';
import Box          from '@mui/material/Box';
import Typography   from '@mui/material/Typography';
import Paper        from '@mui/material/Paper';
import Button       from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert        from '@mui/material/Alert';
import Tooltip      from '@mui/material/Tooltip';
import Table        from '@mui/material/Table';
import TableHead    from '@mui/material/TableHead';
import TableBody    from '@mui/material/TableBody';
import TableRow     from '@mui/material/TableRow';
import TableCell    from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import IconButton   from '@mui/material/IconButton';
import RefreshIcon  from '@mui/icons-material/Refresh';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined';
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useDashboard }  from '../hooks/useTickets';
import { usePermissions } from '../hooks/usePermissions';
import { formatTimeAgo, fullName } from '../utils/format';
import { TicketStatusChip, PriorityChip, CategoryChip } from '../components/common/StatusChip';
import TicketFormDialog from '../components/tickets/TicketFormDialog';

function StatCard({ label, value, color, sub }) {
  return (
    <Paper elevation={0} sx={{ p: 2.5, flex: 1, minWidth: 0 }}>
      <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: '2rem', fontWeight: 700, color: color || 'var(--text)', lineHeight: 1.2, mt: 0.5 }}>
        {value?.toLocaleString() ?? '—'}
      </Typography>
      {sub && <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.625rem' }}>{sub}</Typography>}
    </Paper>
  );
}

function AlertBadge({ icon, label, value, color }) {
  if (!value) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, borderRadius: 'var(--radius-sm)', bgcolor: `${color}12`, border: `1px solid ${color}30` }}>
      <Box sx={{ color }}>{icon}</Box>
      <Box>
        <Typography sx={{ color, fontSize: '1.125rem', fontWeight: 700, lineHeight: 1 }}>{value}</Typography>
        <Typography variant="caption" sx={{ color: 'var(--text2)', fontSize: '0.625rem' }}>{label}</Typography>
      </Box>
    </Box>
  );
}

export default function Dashboard() {
  const navigate  = useNavigate();
  const { can }   = usePermissions();
  const { data, loading, error, refetch } = useDashboard();
  const [createOpen, setCreateOpen] = useState(false);

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
      <CircularProgress size={28} sx={{ color: 'var(--accent)' }} />
    </Box>
  );

  if (error) return <Alert severity="error" sx={{ maxWidth: 600 }}>{error}</Alert>;
  if (!data)  return null;

  const { counts, alerts, byCategory, recentTickets, myAssigned } = data;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h2" sx={{ color: 'var(--text)', fontWeight: 700 }}>Dashboard</Typography>
          <Typography variant="body2" sx={{ color: 'var(--text2)', mt: 0.5 }}>
            {counts.total.toLocaleString()} total tickets · {counts.active.toLocaleString()} active
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh"><IconButton size="small" onClick={refetch} sx={{ color: 'var(--text2)' }}><RefreshIcon fontSize="small" /></IconButton></Tooltip>
          {can('tickets:create') && (
            <Button variant="contained" size="small" startIcon={<AddCircleOutlineIcon />} onClick={() => setCreateOpen(true)}>Log Ticket</Button>
          )}
        </Box>
      </Box>

      {/* Alert badges */}
      {(alerts.critical > 0 || alerts.high > 0 || alerts.unassigned > 0 || alerts.slaBreached > 0) && (
        <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
          <AlertBadge icon={<ErrorOutlineIcon sx={{ fontSize: 18 }} />}        label="Critical open"       value={alerts.critical}    color="var(--red)"    />
          <AlertBadge icon={<WarningAmberRoundedIcon sx={{ fontSize: 18 }} />} label="High priority open"  value={alerts.high}        color="var(--amber)"  />
          <AlertBadge icon={<PersonOffOutlinedIcon sx={{ fontSize: 18 }} />}   label="Unassigned active"   value={alerts.unassigned}  color="var(--purple)" />
          <AlertBadge icon={<SpeedOutlinedIcon sx={{ fontSize: 18 }} />}       label="SLA breached active" value={alerts.slaBreached} color="var(--red)"    />
        </Box>
      )}

      {/* Status stat cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <StatCard label="Logged"   value={counts.logged}   color="var(--purple)" />
        <StatCard label="Open"     value={counts.open}     color="var(--accent)" />
        <StatCard label="Pending"  value={counts.pending}  color="var(--amber)" />
        <StatCard label="Resolved" value={counts.resolved} color="var(--green)" />
        <StatCard label="Closed"   value={counts.closed}   color="var(--text3)" />
        {myAssigned !== undefined && myAssigned !== null && (
          <StatCard label="My Assigned" value={myAssigned} color="var(--cyan)" sub="Active tickets assigned to you" />
        )}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 3 }}>
        {/* Recent tickets */}
        <Paper elevation={0} sx={{ p: 0, overflow: 'hidden' }}>
          <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h5" sx={{ color: 'var(--text)', fontWeight: 600 }}>Recent Tickets</Typography>
            <Button size="small" onClick={() => navigate('/tickets')} sx={{ color: 'var(--accent)', fontSize: '0.75rem' }}>View All →</Button>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Ticket #</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Assigned</TableCell>
                  <TableCell>Logged</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {recentTickets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'var(--text3)' }}>No tickets yet</TableCell>
                  </TableRow>
                )}
                {recentTickets.map(t => (
                  <TableRow key={t.id} hover sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'var(--bg4)' } }}
                    onClick={() => navigate(`/tickets/${t.id}`)}>
                    <TableCell sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--accent)', fontWeight: 600 }}>{t.ticketNumber}</TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Typography variant="body1" sx={{ color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</Typography>
                    </TableCell>
                    <TableCell><TicketStatusChip status={t.status} /></TableCell>
                    <TableCell><PriorityChip priority={t.priority} /></TableCell>
                    <TableCell sx={{ color: t.assignedTo ? 'var(--text2)' : 'var(--text3)', fontSize: '0.75rem' }}>
                      {t.assignedTo ? fullName(t.assignedTo) : <em>Unassigned</em>}
                    </TableCell>
                    <TableCell sx={{ color: 'var(--text2)', fontSize: '0.6875rem', whiteSpace: 'nowrap' }}>
                      <Tooltip title={t.createdAt}><span>{formatTimeAgo(t.createdAt)}</span></Tooltip>
                    </TableCell>
                    <TableCell align="right" onClick={e => e.stopPropagation()}>
                      <IconButton size="small" onClick={() => navigate(`/tickets/${t.id}`)} sx={{ color: 'var(--text3)' }}>
                        <OpenInNewIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* By category breakdown */}
        <Paper elevation={0} sx={{ p: 2.5 }}>
          <Typography variant="h5" sx={{ color: 'var(--text)', fontWeight: 600, mb: 2 }}>By Category</Typography>
          {byCategory.length === 0 && (
            <Typography variant="body2" sx={{ color: 'var(--text3)', fontStyle: 'italic' }}>No data</Typography>
          )}
          {byCategory.map(({ categoryId, categoryName, count }) => (
            <Box key={categoryId ?? 'uncategorised'} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
              <CategoryChip category={categoryId ? { id: categoryId, name: categoryName, slug: '' } : null} />
              <Typography variant="body2" sx={{ color: 'var(--text)', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                {count.toLocaleString()}
              </Typography>
            </Box>
          ))}
        </Paper>
      </Box>

      <TicketFormDialog open={createOpen} ticket={null} onClose={() => setCreateOpen(false)}
        onSaved={() => { setCreateOpen(false); refetch(); }} />
    </Box>
  );
}
