import React from 'react';
import Box        from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tooltip    from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import { formatDateTime, formatTimeAgo, fullName } from '../../utils/format';
import { formatDuration } from './SlaMetrics';

// Status colours matching the design system
const STATUS_COLORS = {
  LOGGED:   '#9b6fff',
  OPEN:     '#4f7cff',
  PENDING:  '#f0a030',
  RESOLVED: '#2ecc8f',
  CLOSED:   '#5a6080',
};

const STATUS_LABELS = {
  LOGGED: 'Logged', OPEN: 'Open', PENDING: 'Pending', RESOLVED: 'Resolved', CLOSED: 'Closed',
};

function TimelineEntry({ entry, isLast }) {
  const color = STATUS_COLORS[entry.newStatus] || '#9399b0';
  const label = STATUS_LABELS[entry.newStatus] || entry.newStatus;

  return (
    <Box sx={{ display: 'flex', gap: 1.5, position: 'relative' }}>
      {/* Vertical line */}
      {!isLast && (
        <Box sx={{
          position: 'absolute', left: 7, top: 18, bottom: -4,
          width: 2, bgcolor: 'var(--border)',
        }} />
      )}

      {/* Status dot */}
      <Box sx={{ flexShrink: 0, mt: 0.25 }}>
        <Box sx={{
          width: 16, height: 16, borderRadius: '50%',
          bgcolor: `${color}22`, border: `2px solid ${color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: color }} />
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, pb: isLast ? 0 : 2, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {/* Status badge */}
          <Box sx={{
            px: 1, py: 0.25, borderRadius: '4px',
            bgcolor: `${color}1a`, border: `1px solid ${color}40`,
          }}>
            <Typography variant="caption" sx={{ color, fontWeight: 700, fontSize: '0.625rem' }}>
              {label}
            </Typography>
          </Box>

          {/* Duration in previous state */}
          {entry.durationInPreviousStateSeconds != null && (
            <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.5625rem' }}>
              after {formatDuration(entry.durationInPreviousStateSeconds)} in{' '}
              <span style={{ color: STATUS_COLORS[entry.previousStatus] || '#9399b0' }}>
                {STATUS_LABELS[entry.previousStatus] || entry.previousStatus}
              </span>
            </Typography>
          )}
        </Box>

        {/* Note */}
        {entry.note && (
          <Typography variant="body2" sx={{ color: 'var(--text2)', fontSize: '0.6875rem', mt: 0.25 }}>
            {entry.note}
          </Typography>
        )}

        {/* Who + when */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
          {entry.changedBy && (
            <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.5625rem' }}>
              by <span style={{ color: 'var(--text2)' }}>{fullName(entry.changedBy)}</span>
            </Typography>
          )}
          <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.5625rem' }}>·</Typography>
          <Tooltip title={formatDateTime(entry.changedAt)}>
            <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.5625rem', cursor: 'default' }}>
              {formatTimeAgo(entry.changedAt)}
            </Typography>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}

export default function TicketTimeline({ ticketId, timeline, loading }) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={18} sx={{ color: 'var(--accent)' }} />
      </Box>
    );
  }

  if (!timeline?.history?.length) {
    return (
      <Typography variant="body2" sx={{ color: 'var(--text3)', fontStyle: 'italic', fontSize: '0.75rem' }}>
        No lifecycle history yet.
      </Typography>
    );
  }

  return (
    <Box>
      {timeline.history.map((entry, i) => (
        <TimelineEntry
          key={entry.id}
          entry={entry}
          isLast={i === timeline.history.length - 1}
        />
      ))}
    </Box>
  );
}
