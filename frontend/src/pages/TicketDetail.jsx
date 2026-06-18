import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box              from '@mui/material/Box';
import Typography       from '@mui/material/Typography';
import Button           from '@mui/material/Button';
import Paper            from '@mui/material/Paper';
import Divider          from '@mui/material/Divider';
import IconButton       from '@mui/material/IconButton';
import Tooltip          from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert            from '@mui/material/Alert';
import Chip             from '@mui/material/Chip';
import Avatar           from '@mui/material/Avatar';
import ArrowBackIcon              from '@mui/icons-material/ArrowBack';
import EditOutlinedIcon           from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon          from '@mui/icons-material/DeleteOutline';
import EmailOutlinedIcon          from '@mui/icons-material/EmailOutlined';

import PeopleOutlinedIcon         from '@mui/icons-material/PeopleOutlined';
import SpeedOutlinedIcon          from '@mui/icons-material/SpeedOutlined';
import TimelineOutlinedIcon       from '@mui/icons-material/TimelineOutlined';

import { ticketsService, emailService } from '../services/api';
import { extractApiError }  from '../utils/validation';
import { usePermissions }   from '../hooks/usePermissions';
import { useNotification }  from '../context/NotificationContext';
import { useAuth }          from '../context/AuthContext';
import { formatDateTime, formatTimeAgo, fullName } from '../utils/format';
import { TicketStatusChip, PriorityChip, CategoryChip } from '../components/common/StatusChip';
import ConfirmDialog      from '../components/common/ConfirmDialog';
import TicketFormDialog   from '../components/tickets/TicketFormDialog';
import SlaMetrics         from '../components/tickets/SlaMetrics';
import TicketTimeline     from '../components/tickets/TicketTimeline';
import ActivityFeed       from '../components/tickets/ActivityFeed';
import TicketInputPanel   from '../components/tickets/TicketInputPanel';
import EmailComposer      from '../components/tickets/EmailComposer';
import EmailThread        from '../components/tickets/EmailThread';

function MetaRow({ label, value }) {
  if (!value) return null;
  return (
    <Box sx={{ py: 0.75 }}>
      <Typography variant="caption" sx={{ color: 'var(--text3)', display: 'block', fontSize: '0.5625rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ color: 'var(--text)', fontSize: '0.75rem' }}>{value}</Typography>
    </Box>
  );
}

export default function TicketDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { can }  = usePermissions();
  const { user } = useAuth();
  const { success, error: notifyError } = useNotification();

  const [ticket,          setTicket]          = useState(null);
  const [timeline,        setTimeline]        = useState(null);
  const [activityFeed,    setActivityFeed]    = useState([]);
  const [emails,          setEmails]          = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [activityLoading, setActivityLoading] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [emailsLoading,   setEmailsLoading]   = useState(false);
  const [error,           setError]           = useState(null);
  const [editOpen,        setEditOpen]        = useState(false);
  const [deleteOpen,      setDeleteOpen]      = useState(false);
  const [emailOpen,       setEmailOpen]       = useState(false);
  const [deleting,        setDeleting]        = useState(false);

  const canEdit        = can('tickets:edit_all') || can('tickets:edit_assigned');
  const canDelete      = ['SUPER_ADMIN','IT_MANAGER'].includes(user?.role);
  const canEmail       = can('tickets:edit_all');
  const canSeeInternal = can('comments:internal');
  const isResolved     = ticket ? ['RESOLVED','CLOSED'].includes(ticket.status) : false;

  const loadActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const { data } = await ticketsService.activity(id);
      setActivityFeed(data.data || []);
    } catch { /* non-fatal */ }
    finally { setActivityLoading(false); }
  }, [id]);

  const loadTimeline = useCallback(async () => {
    setTimelineLoading(true);
    try {
      const { data } = await ticketsService.timeline(id);
      setTimeline(data.data);
    } catch { /* non-fatal */ }
    finally { setTimelineLoading(false); }
  }, [id]);

  const loadEmails = useCallback(async () => {
    setEmailsLoading(true);
    try {
      const { data } = await emailService.list(id);
      setEmails(data.data || []);
    } catch { /* non-fatal */ }
    finally { setEmailsLoading(false); }
  }, [id]);

  const loadTicket = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await ticketsService.get(id);
      setTicket(data.data);
      loadActivity();
      loadTimeline();
      loadEmails();
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [id, loadActivity, loadTimeline, loadEmails]);

  useEffect(() => { loadTicket(); }, [loadTicket]);

  const handlePostComment = async (body, internal) => {
    await ticketsService.addComment(ticket.id, { body, internal });
    success('Comment added');
    loadActivity();
    loadTicket();
  };

  const handleEmailSent = () => {
    loadEmails();
    loadActivity();
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await ticketsService.delete(ticket.id);
      success(`Ticket ${ticket.ticketNumber} deleted`);
      navigate('/tickets');
    } catch (err) {
      notifyError(extractApiError(err));
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const onSaved = () => { setEditOpen(false); loadTicket(); };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
      <CircularProgress size={28} sx={{ color: 'var(--accent)' }} />
    </Box>
  );

  if (error) return (
    <Box sx={{ maxWidth: 600 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/tickets')} size="small"
        sx={{ color: 'var(--text2)', mb: 2 }}>
        Back to Tickets
      </Button>
      <Alert severity="error">{error}</Alert>
    </Box>
  );

  if (!ticket) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2.5, gap: 2, flexShrink: 0 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/tickets')} size="small"
            sx={{ color: 'var(--text2)', mb: 1, '&:hover': { color: 'var(--text)' } }}>
            Back to Tickets
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75, flexWrap: 'wrap' }}>
            <Typography variant="caption" sx={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700, fontSize: '0.75rem' }}>
              {ticket.ticketNumber}
            </Typography>
            <TicketStatusChip status={ticket.status} />
            <PriorityChip priority={ticket.priority} />
            <CategoryChip category={ticket.category} />
            {ticket.subcategory && (
              <Chip label={ticket.subcategory.name} size="small"
                sx={{ bgcolor: 'var(--bg4)', color: 'var(--text2)', fontSize: '0.625rem', height: 20, borderRadius: '4px' }} />
            )}
            {ticket.slaBreached && (
              <Chip label="SLA BREACHED" size="small"
                sx={{ bgcolor: 'rgba(224,80,80,0.15)', color: 'var(--red)', fontSize: '0.5625rem', height: 18, borderRadius: '4px', fontWeight: 700, border: '1px solid rgba(224,80,80,0.3)' }} />
            )}
            {emails.length > 0 && (
              <Chip
                icon={<EmailOutlinedIcon sx={{ fontSize: 11 }} />}
                label={`${emails.length} email${emails.length !== 1 ? 's' : ''}`}
                size="small"
                sx={{ height: 18, fontSize: '0.5625rem', bgcolor: 'rgba(79,124,255,0.1)', color: 'var(--accent)', cursor: canEmail ? 'pointer' : 'default' }}
                onClick={canEmail ? () => setEmailOpen(true) : undefined}
              />
            )}
          </Box>
          <Typography variant="h2" sx={{ color: 'var(--text)', fontWeight: 700, mb: 0.5 }}>
            {ticket.title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--text2)', fontSize: '0.75rem' }}>
            Logged by <strong style={{ color: 'var(--text)' }}>{fullName(ticket.submittedBy)}</strong>
            {' · '}{formatTimeAgo(ticket.createdAt)}
            {' · '}Updated {formatTimeAgo(ticket.updatedAt)}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          {canEmail && (
            <Tooltip title="Send Email">
              <Button
                variant="outlined"
                size="small"
                startIcon={<EmailOutlinedIcon sx={{ fontSize: 14 }} />}
                onClick={() => setEmailOpen(true)}
                sx={{ borderColor: 'var(--border2)', color: 'var(--text2)', fontSize: '0.75rem', height: 32 }}>
                Email
              </Button>
            </Tooltip>
          )}
          {canEdit && (
            <Tooltip title="Edit Ticket">
              <IconButton size="small" onClick={() => setEditOpen(true)}
                sx={{ color: 'var(--accent)', bgcolor: 'rgba(79,124,255,0.1)', borderRadius: '6px' }}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {canDelete && (
            <Tooltip title="Delete Ticket">
              <IconButton size="small" onClick={() => setDeleteOpen(true)}
                sx={{ color: 'var(--red)', bgcolor: 'rgba(224,80,80,0.1)', borderRadius: '6px' }}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* ── 3-column body ───────────────────────────────────────────────── */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: '220px 1fr 280px',
        gap: 2.5,
        flex: 1,
        minHeight: 0,
        alignItems: 'start',
      }}>

        {/* LEFT — Quick-edit fields */}
        <Paper elevation={0} sx={{ p: 2 }}>
          <Typography variant="h5" sx={{ color: 'var(--text)', fontWeight: 600, mb: 2 }}>Ticket Fields</Typography>
          <TicketInputPanel ticket={ticket} onSaved={onSaved} />
        </Paper>

        {/* MIDDLE — Description + Activity Feed */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Paper elevation={0} sx={{ p: 2.5 }}>
            <Typography variant="h5" sx={{ color: 'var(--text)', fontWeight: 600, mb: 1.5 }}>Description</Typography>
            <Typography variant="body1" sx={{ color: 'var(--text2)', lineHeight: 1.75, whiteSpace: 'pre-wrap', fontSize: '0.8125rem' }}>
              {ticket.description}
            </Typography>
          </Paper>

          <Paper elevation={0} sx={{ p: 2.5 }}>
            <ActivityFeed
              feed={activityFeed}
              loading={activityLoading}
              onPost={handlePostComment}
              canInternal={canSeeInternal}
              isResolved={isResolved}
            />
          </Paper>
        </Box>

        {/* RIGHT — Email thread, SLA, timeline, details */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

          {/* Email thread */}
          <Paper elevation={0} sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <EmailOutlinedIcon sx={{ fontSize: 14, color: 'var(--accent)' }} />
              <Typography variant="h5" sx={{ color: 'var(--text)', fontWeight: 600 }}>Emails</Typography>
            </Box>
            <EmailThread
              emails={emails}
              loading={emailsLoading}
              onReply={canEmail ? () => setEmailOpen(true) : null}
            />
          </Paper>

          {/* SLA & Performance */}
          <Paper elevation={0} sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <SpeedOutlinedIcon sx={{ fontSize: 14, color: 'var(--accent)' }} />
              <Typography variant="h5" sx={{ color: 'var(--text)', fontWeight: 600 }}>SLA & Performance</Typography>
            </Box>
            <SlaMetrics
              metrics={timeline?.metrics}
              slaTargets={timeline?.slaTargets}
              priority={ticket.priority}
            />
          </Paper>

          {/* Lifecycle Timeline */}
          <Paper elevation={0} sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <TimelineOutlinedIcon sx={{ fontSize: 14, color: 'var(--accent)' }} />
              <Typography variant="h5" sx={{ color: 'var(--text)', fontWeight: 600 }}>Timeline</Typography>
              {timeline?.history?.length > 0 && (
                <Chip label={timeline.history.length} size="small"
                  sx={{ ml: 'auto', height: 16, fontSize: '0.5625rem', bgcolor: 'var(--bg4)', color: 'var(--text2)' }} />
              )}
            </Box>
            <TicketTimeline ticketId={id} timeline={timeline} loading={timelineLoading} />
          </Paper>

          {/* Ticket details */}
          <Paper elevation={0} sx={{ p: 2 }}>
            <Typography variant="h5" sx={{ color: 'var(--text)', fontWeight: 600, mb: 1 }}>Details</Typography>
            <MetaRow label="Incident Time"  value={formatDateTime(ticket.incidentTime)} />
            <MetaRow label="First Response" value={formatDateTime(ticket.firstResponseAt)} />
            {ticket.resolvedAt && <MetaRow label="Resolved At" value={formatDateTime(ticket.resolvedAt)} />}
            {ticket.closedAt   && <MetaRow label="Closed At"   value={formatDateTime(ticket.closedAt)} />}
            <Divider sx={{ borderColor: 'var(--border)', my: 1 }} />
            <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.5625rem', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', mb: 0.75 }}>
              Submitted By
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Avatar sx={{ width: 22, height: 22, bgcolor: 'var(--accent)', fontSize: '0.5625rem' }}>
                {(ticket.submittedBy.firstName?.[0] || '') + (ticket.submittedBy.lastName?.[0] || '')}
              </Avatar>
              <Typography variant="body2" sx={{ color: 'var(--text)', fontSize: '0.75rem' }}>
                {fullName(ticket.submittedBy)}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.5625rem', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', mb: 0.75 }}>
              Assigned To
            </Typography>
            {ticket.assignedTo ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ width: 22, height: 22, bgcolor: 'var(--green2)', fontSize: '0.5625rem' }}>
                  {(ticket.assignedTo.firstName?.[0] || '') + (ticket.assignedTo.lastName?.[0] || '')}
                </Avatar>
                <Typography variant="body2" sx={{ color: 'var(--text)', fontSize: '0.75rem' }}>
                  {fullName(ticket.assignedTo)}
                </Typography>
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: 'var(--text3)', fontStyle: 'italic', fontSize: '0.75rem' }}>Unassigned</Typography>
            )}
            {ticket.usersAffected > 1 && (
              <>
                <Divider sx={{ borderColor: 'var(--border)', my: 1 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <PeopleOutlinedIcon sx={{ fontSize: 13, color: 'var(--text3)' }} />
                  <Typography variant="body2" sx={{ color: 'var(--text2)', fontSize: '0.75rem' }}>
                    {ticket.usersAffected.toLocaleString()} users affected
                  </Typography>
                </Box>
              </>
            )}
          </Paper>

        </Box>
      </Box>

      {/* ── Email Composer (slide-in) ─────────────────────────────────── */}
      <EmailComposer
        ticketId={ticket.id}
        ticketNumber={ticket.ticketNumber}
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        onSent={handleEmailSent}
      />

      {/* ── Dialogs ────────────────────────────────────────────────────── */}
      <TicketFormDialog open={editOpen} ticket={ticket} onClose={() => setEditOpen(false)} onSaved={onSaved} />
      <ConfirmDialog
        open={deleteOpen} danger
        title={`Delete Ticket — ${ticket.ticketNumber}`}
        message={`This will permanently delete "${ticket.title}" and all its activity. This cannot be undone.`}
        confirmLabel="Delete Ticket"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </Box>
  );
}
