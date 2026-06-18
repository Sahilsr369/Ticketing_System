import React from 'react';
import Box        from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tooltip    from '@mui/material/Tooltip';
import LinearProgress from '@mui/material/LinearProgress';

// ─── Duration formatter ────────────────────────────────────────────────────────
export function formatDuration(seconds) {
  if (seconds == null) return '—';
  if (seconds < 60)   return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60)         return `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  if (h < 24)         return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh > 0 ? `${d}d ${rh}h` : `${d}d`;
}

function StatBox({ label, value, sub, color = 'var(--text)' }) {
  return (
    <Box sx={{ flex: 1, minWidth: 0, p: 1.5, bgcolor: 'var(--bg3)', borderRadius: '8px', border: '1px solid var(--border)' }}>
      <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="h4" sx={{ color, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.125rem', lineHeight: 1 }}>
        {value}
      </Typography>
      {sub && (
        <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.5625rem', display: 'block', mt: 0.5 }}>
          {sub}
        </Typography>
      )}
    </Box>
  );
}

export default function SlaMetrics({ metrics, slaTargets, priority }) {
  if (!metrics) return null;

  const {
    timeToFirstResponseSeconds,
    timeToResolutionSeconds,
    ageSeconds,
    slaBreached,
    firstResponseBreached,
    slaConsumedPercent,
  } = metrics;

  const progressColor = slaConsumedPercent >= 100
    ? 'var(--red)'
    : slaConsumedPercent >= 75
      ? 'var(--amber)'
      : 'var(--green)';

  const slaStatusLabel  = slaBreached ? 'SLA BREACHED' : 'Within SLA';
  const slaStatusColor  = slaBreached ? 'var(--red)'   : 'var(--green)';

  return (
    <Box>
      {/* SLA status banner */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        p: 1, mb: 1.5, borderRadius: '6px',
        bgcolor: slaBreached ? 'rgba(224,80,80,0.08)' : 'rgba(46,204,143,0.08)',
        border: `1px solid ${slaBreached ? 'rgba(224,80,80,0.25)' : 'rgba(46,204,143,0.25)'}`,
      }}>
        <Typography variant="caption" sx={{ color: slaStatusColor, fontWeight: 700, fontSize: '0.6875rem' }}>
          {slaStatusLabel}
        </Typography>
        {firstResponseBreached && (
          <Typography variant="caption" sx={{ color: 'var(--amber)', fontSize: '0.625rem', fontWeight: 600 }}>
            ⚠ First response overdue
          </Typography>
        )}
      </Box>

      {/* Metric stat boxes */}
      <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
        <StatBox
          label="First Response"
          value={timeToFirstResponseSeconds != null ? formatDuration(timeToFirstResponseSeconds) : 'Pending'}
          sub={slaTargets ? `Target: ${formatDuration(slaTargets.firstResponseMinutes * 60)}` : null}
          color={firstResponseBreached ? 'var(--red)' : timeToFirstResponseSeconds != null ? 'var(--green)' : 'var(--text3)'}
        />
        <StatBox
          label="Resolution Time"
          value={timeToResolutionSeconds != null ? formatDuration(timeToResolutionSeconds) : formatDuration(ageSeconds)}
          sub={slaTargets ? `Target: ${formatDuration(slaTargets.resolutionMinutes * 60)}` : null}
          color={slaBreached ? 'var(--red)' : timeToResolutionSeconds != null ? 'var(--green)' : 'var(--text2)'}
        />
      </Box>

      {/* SLA progress bar */}
      {slaConsumedPercent != null && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.5625rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              SLA consumed
            </Typography>
            <Typography variant="caption" sx={{ color: progressColor, fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', fontWeight: 700 }}>
              {slaConsumedPercent}%
            </Typography>
          </Box>
          <Tooltip title={slaTargets ? `Resolution deadline: ${new Date(slaTargets.resolutionDeadline).toLocaleString()}` : ''}>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, slaConsumedPercent)}
              sx={{
                height: 5, borderRadius: 3,
                bgcolor: 'var(--bg4)',
                '& .MuiLinearProgress-bar': { bgcolor: progressColor, borderRadius: 3 },
              }}
            />
          </Tooltip>
        </Box>
      )}
    </Box>
  );
}
