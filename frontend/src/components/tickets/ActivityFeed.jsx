import React, { useState } from 'react';
import Box         from '@mui/material/Box';
import Typography  from '@mui/material/Typography';
import Tooltip     from '@mui/material/Tooltip';
import Chip        from '@mui/material/Chip';
import IconButton  from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import TextField   from '@mui/material/TextField';
import Button      from '@mui/material/Button';
import Switch      from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Alert       from '@mui/material/Alert';

// MUI icons
import AddCommentOutlinedIcon   from '@mui/icons-material/AddCommentOutlined';
import SendOutlinedIcon         from '@mui/icons-material/SendOutlined';

import LockOutlinedIcon         from '@mui/icons-material/LockOutlined';
import PersonOutlinedIcon       from '@mui/icons-material/PersonOutlined';
import PersonOffOutlinedIcon    from '@mui/icons-material/PersonOffOutlined';
import SwapHorizOutlinedIcon    from '@mui/icons-material/SwapHorizOutlined';
import EditOutlinedIcon         from '@mui/icons-material/EditOutlined';
import CheckCircleOutlineIcon   from '@mui/icons-material/CheckCircleOutline';
import AddCircleOutlineIcon     from '@mui/icons-material/AddCircleOutline';
import FlagOutlinedIcon         from '@mui/icons-material/FlagOutlined';
import RefreshOutlinedIcon      from '@mui/icons-material/RefreshOutlined';
import InboxOutlinedIcon        from '@mui/icons-material/InboxOutlined';
import FilterListIcon           from '@mui/icons-material/FilterList';

import { formatDateTime, formatTimeAgo, fullName } from '../../utils/format';

// ─── Icon map keyed by eventType ─────────────────────────────────────────────
const EVENT_ICONS = {
  TICKET_CREATED:    <AddCircleOutlineIcon   sx={{ fontSize: 14 }} />,
  TICKET_ASSIGNED:   <PersonOutlinedIcon     sx={{ fontSize: 14 }} />,
  TICKET_UNASSIGNED: <PersonOffOutlinedIcon  sx={{ fontSize: 14 }} />,
  STATUS_CHANGED:    <SwapHorizOutlinedIcon  sx={{ fontSize: 14 }} />,
  PRIORITY_CHANGED:  <FlagOutlinedIcon       sx={{ fontSize: 14 }} />,
  FIELD_UPDATED:     <EditOutlinedIcon       sx={{ fontSize: 14 }} />,
  COMMENT_ADDED:     <AddCommentOutlinedIcon sx={{ fontSize: 14 }} />,
  INTERNAL_NOTE:     <LockOutlinedIcon       sx={{ fontSize: 14 }} />,
  EMAIL_SENT:        <SendOutlinedIcon       sx={{ fontSize: 14 }} />,
  EMAIL_RECEIVED:    <InboxOutlinedIcon      sx={{ fontSize: 14 }} />,
  TICKET_CLOSED:     <CheckCircleOutlineIcon sx={{ fontSize: 14 }} />,
  TICKET_REOPENED:   <RefreshOutlinedIcon    sx={{ fontSize: 14 }} />,
};

const STATUS_COLORS = {
  LOGGED: '#9b6fff', OPEN: '#4f7cff', PENDING: '#f0a030',
  RESOLVED: '#2ecc8f', CLOSED: '#5a6080',
};

// ─── Filter chip set ─────────────────────────────────────────────────────────
const FILTER_OPTIONS = [
  { value: 'all',      label: 'All'       },
  { value: 'comment',  label: 'Comments'  },
  { value: 'status',   label: 'Status'    },
  { value: 'assign',   label: 'Assigned'  },
  { value: 'email',    label: 'Email'     },
  { value: 'system',   label: 'System'    },
];

function matchesFilter(item, filter) {
  if (filter === 'all')     return true;
  if (filter === 'comment') return ['COMMENT_ADDED','INTERNAL_NOTE'].includes(item.eventType);
  if (filter === 'status')  return ['STATUS_CHANGED','TICKET_CLOSED','TICKET_REOPENED'].includes(item.eventType);
  if (filter === 'assign')  return ['TICKET_ASSIGNED','TICKET_UNASSIGNED'].includes(item.eventType);
  if (filter === 'email')   return ['EMAIL_SENT','EMAIL_RECEIVED'].includes(item.eventType);
  if (filter === 'system')  return ['TICKET_CREATED','PRIORITY_CHANGED','FIELD_UPDATED'].includes(item.eventType);
  return true;
}

// ─── Single feed item ─────────────────────────────────────────────────────────
function FeedItem({ item, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const icon  = EVENT_ICONS[item.eventType] || <EditOutlinedIcon sx={{ fontSize: 14 }} />;
  const color = item.color || '#6b95ff';
  const isComment = item.type === 'comment';
  const isEmail   = ['EMAIL_SENT','EMAIL_RECEIVED'].includes(item.eventType);
  const isInternal = item.isInternal;

  // Status chip for STATUS_CHANGED
  const meta = item.metadata || {};
  const showStatusBadges = item.eventType === 'STATUS_CHANGED' && meta.previousStatus && meta.newStatus;
  const showPriorityBadge= item.eventType === 'PRIORITY_CHANGED' && meta.newPriority;

  return (
    <Box sx={{ display: 'flex', gap: 1.5, position: 'relative' }}>
      {/* Vertical connector line */}
      {!isLast && (
        <Box sx={{
          position: 'absolute', left: 11, top: 26, bottom: -4,
          width: 2, bgcolor: 'var(--border)',
          zIndex: 0,
        }} />
      )}

      {/* Event icon dot */}
      <Box sx={{ flexShrink: 0, mt: 0.5, zIndex: 1 }}>
        <Box sx={{
          width: 24, height: 24, borderRadius: '50%',
          bgcolor: `${color}18`,
          border: `1.5px solid ${color}50`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color,
        }}>
          {icon}
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{
        flex: 1, pb: isLast ? 0 : 2, minWidth: 0,
        ...(isInternal ? {
          bgcolor: 'rgba(155,111,255,0.05)',
          border: '1px solid rgba(155,111,255,0.15)',
          borderRadius: '6px',
          p: 1,
          mb: 1,
        } : {}),
      }}>
        {/* Header row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.25 }}>
          {/* Event type label */}
          <Typography variant="caption" sx={{ color: color, fontWeight: 700, fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {item.label}
          </Typography>

          {/* Internal badge */}
          {isInternal && (
            <Chip label="Internal" size="small" sx={{ height: 14, fontSize: '0.5rem', bgcolor: 'rgba(155,111,255,0.15)', color: 'var(--purple)', borderRadius: '3px', '& .MuiChip-label': { px: 0.75 } }} />
          )}

          {/* Status change badges */}
          {showStatusBadges && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ px: 0.75, py: 0.125, borderRadius: '3px', bgcolor: `${STATUS_COLORS[meta.previousStatus] || '#9399b0'}18`, border: `1px solid ${STATUS_COLORS[meta.previousStatus] || '#9399b0'}40` }}>
                <Typography variant="caption" sx={{ color: STATUS_COLORS[meta.previousStatus] || '#9399b0', fontSize: '0.5625rem', fontWeight: 600 }}>{meta.previousStatus}</Typography>
              </Box>
              <Typography sx={{ color: 'var(--text3)', fontSize: '0.5625rem' }}>→</Typography>
              <Box sx={{ px: 0.75, py: 0.125, borderRadius: '3px', bgcolor: `${STATUS_COLORS[meta.newStatus] || '#4f7cff'}18`, border: `1px solid ${STATUS_COLORS[meta.newStatus] || '#4f7cff'}40` }}>
                <Typography variant="caption" sx={{ color: STATUS_COLORS[meta.newStatus] || '#4f7cff', fontSize: '0.5625rem', fontWeight: 600 }}>{meta.newStatus}</Typography>
              </Box>
            </Box>
          )}

          {/* Priority badge */}
          {showPriorityBadge && (
            <Typography variant="caption" sx={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem' }}>
              → {meta.newPriority}
            </Typography>
          )}

          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
            {item.user && (
              <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.5625rem' }}>
                {fullName(item.user)}
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.5625rem' }}>·</Typography>
            <Tooltip title={formatDateTime(item.createdAt)}>
              <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.5625rem', cursor: 'default', whiteSpace: 'nowrap' }}>
                {formatTimeAgo(item.createdAt)}
              </Typography>
            </Tooltip>
          </Box>
        </Box>

        {/* Detail / body */}
        {item.detail && (
          <Box>
            {isComment ? (
              <Box>
                <Typography variant="body2" sx={{
                  color: 'var(--text2)', fontSize: '0.75rem', lineHeight: 1.6, whiteSpace: 'pre-wrap',
                  ...((!expanded && item.detail.length > 200) ? {
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  } : {}),
                }}>
                  {item.detail}
                </Typography>
                {item.detail.length > 200 && (
                  <Typography variant="caption" onClick={() => setExpanded(e => !e)}
                    sx={{ color: 'var(--accent)', fontSize: '0.625rem', cursor: 'pointer', mt: 0.25, display: 'block' }}>
                    {expanded ? 'Show less' : 'Show more'}
                  </Typography>
                )}
              </Box>
            ) : isEmail ? (
              <Box sx={{ mt: 0.5 }}>
                <Typography variant="body2" sx={{ color: 'var(--text2)', fontSize: '0.6875rem' }}>
                  {item.detail}
                </Typography>
                {meta.bodyPreview && (
                  <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.5625rem', display: 'block', mt: 0.25, fontStyle: 'italic' }}>
                    {meta.bodyPreview.slice(0, 120)}{meta.bodyPreview.length > 120 ? '…' : ''}
                  </Typography>
                )}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: 'var(--text3)', fontSize: '0.6875rem' }}>
                {item.detail}
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}

// ─── Comment composer ─────────────────────────────────────────────────────────
function CommentComposer({ onPost, canInternal, disabled }) {
  const [body,       setBody]       = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [posting,    setPosting]    = useState(false);
  const [error,      setError]      = useState('');

  const handlePost = async () => {
    if (!body.trim() || posting) return;
    setPosting(true);
    setError('');
    try {
      await onPost(body.trim(), isInternal);
      setBody('');
      setIsInternal(false);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to post comment');
    } finally {
      setPosting(false);
    }
  };

  return (
    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid var(--border)' }}>
      {error && <Alert severity="error" sx={{ mb: 1, fontSize: '0.75rem' }}>{error}</Alert>}
      <TextField
        fullWidth multiline minRows={2} maxRows={6} size="small"
        placeholder={isInternal ? 'Internal note — only visible to IT staff…' : 'Add a comment…'}
        value={body}
        onChange={e => { setError(''); setBody(e.target.value); }}
        disabled={disabled || posting}
        sx={{
          mb: 1,
          '& .MuiOutlinedInput-root': {
            bgcolor: isInternal ? 'rgba(155,111,255,0.06)' : 'var(--bg3)',
            fontSize: '0.75rem',
          },
        }}
        onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') handlePost(); }}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {canInternal ? (
          <FormControlLabel
            label={<Typography variant="body2" sx={{ color: 'var(--text2)', fontSize: '0.6875rem' }}>Internal note</Typography>}
            control={
              <Switch size="small" checked={isInternal} onChange={e => setIsInternal(e.target.checked)}
                sx={{ '& .MuiSwitch-thumb': { bgcolor: isInternal ? 'var(--purple)' : undefined } }} />
            }
          />
        ) : <Box />}
        <Button
          variant="contained" size="small"
          endIcon={posting ? <CircularProgress size={12} sx={{ color: 'inherit' }} /> : <SendOutlinedIcon sx={{ fontSize: 14 }} />}
          onClick={handlePost}
          disabled={!body.trim() || posting || disabled}
          sx={{ minWidth: 110, fontSize: '0.75rem' }}
        >
          {posting ? 'Posting…' : 'Post'}
        </Button>
      </Box>
      <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.5625rem', display: 'block', mt: 0.5 }}>
        Ctrl+Enter to post
      </Typography>
    </Box>
  );
}

// ─── Main ActivityFeed component ──────────────────────────────────────────────
export default function ActivityFeed({ feed, loading, onPost, canInternal, isResolved }) {
  const [filter, setFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = (feed || []).filter(item => matchesFilter(item, filter));

  return (
    <Box>
      {/* Feed header with filter toggle */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="h5" sx={{ color: 'var(--text)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          Activity
          {feed?.length > 0 && (
            <Chip label={feed.length} size="small" sx={{ height: 16, fontSize: '0.5625rem', bgcolor: 'var(--bg4)', color: 'var(--text2)' }} />
          )}
        </Typography>
        <Tooltip title="Filter events">
          <IconButton size="small" onClick={() => setShowFilters(f => !f)}
            sx={{ color: showFilters ? 'var(--accent)' : 'var(--text3)' }}>
            <FilterListIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Filter chips */}
      {showFilters && (
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1.5 }}>
          {FILTER_OPTIONS.map(opt => (
            <Chip
              key={opt.value}
              label={opt.label}
              size="small"
              onClick={() => setFilter(opt.value)}
              sx={{
                height: 20, fontSize: '0.625rem', cursor: 'pointer',
                bgcolor: filter === opt.value ? 'rgba(79,124,255,0.15)' : 'var(--bg3)',
                color:   filter === opt.value ? 'var(--accent)'         : 'var(--text2)',
                border:  filter === opt.value ? '1px solid rgba(79,124,255,0.4)' : '1px solid var(--border)',
                '&:hover': { bgcolor: 'var(--bg4)' },
              }}
            />
          ))}
        </Box>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={20} sx={{ color: 'var(--accent)' }} />
        </Box>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <Typography variant="body2" sx={{ color: 'var(--text3)', fontStyle: 'italic', fontSize: '0.75rem', py: 1 }}>
          {filter === 'all' ? 'No activity yet.' : `No ${filter} events found.`}
        </Typography>
      )}

      {/* Feed items — newest first */}
      {!loading && filtered.length > 0 && (
        <Box>
          {filtered.map((item, i) => (
            <FeedItem key={item.id} item={item} isLast={i === filtered.length - 1} />
          ))}
        </Box>
      )}

      {/* Comment composer */}
      {!isResolved && (
        <CommentComposer onPost={onPost} canInternal={canInternal} disabled={loading} />
      )}
    </Box>
  );
}
