/**
 * EmailThread — Phase 6
 * Displays all emails for a ticket as an expandable conversation thread.
 * Used in the right sidebar of TicketDetail.
 */
import React, { useState } from 'react';
import Box        from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip       from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Divider    from '@mui/material/Divider';
import Tooltip    from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import SendOutlinedIcon    from '@mui/icons-material/SendOutlined';
import InboxOutlinedIcon   from '@mui/icons-material/InboxOutlined';
import ExpandMoreIcon      from '@mui/icons-material/ExpandMore';
import ExpandLessIcon      from '@mui/icons-material/ExpandLess';
import ReplyOutlinedIcon   from '@mui/icons-material/ReplyOutlined';

import { formatDateTime, formatTimeAgo } from '../../utils/format';

function EmailItem({ email, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const isSent = email.direction === 'SENT';
  const color  = isSent ? '#2ecc8f' : '#4f7cff';
  const Icon   = isSent ? SendOutlinedIcon : InboxOutlinedIcon;

  return (
    <Box sx={{
      mb: 1,
      border: `1px solid ${isSent ? 'rgba(46,204,143,0.2)' : 'rgba(79,124,255,0.2)'}`,
      borderRadius: '6px',
      overflow: 'hidden',
      bgcolor: 'var(--bg3)',
    }}>
      {/* Email header row — always visible */}
      <Box
        onClick={() => setExpanded(e => !e)}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          px: 1.5, py: 1, cursor: 'pointer',
          bgcolor: isSent ? 'rgba(46,204,143,0.06)' : 'rgba(79,124,255,0.06)',
          '&:hover': { bgcolor: isSent ? 'rgba(46,204,143,0.1)' : 'rgba(79,124,255,0.1)' },
        }}>
        <Icon sx={{ fontSize: 13, color, flexShrink: 0 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
            <Chip
              label={isSent ? 'Sent' : 'Received'}
              size="small"
              sx={{ height: 14, fontSize: '0.5rem', bgcolor: `${color}20`, color, borderRadius: '3px', '& .MuiChip-label': { px: 0.75 } }}
            />
            <Typography variant="caption" sx={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.6875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {email.subject}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.5625rem' }}>
            {isSent ? `To: ${email.toAddress}` : `From: ${email.fromAddress}`}
            {email.cc ? ` · CC: ${email.cc}` : ''}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          <Tooltip title={formatDateTime(email.sentAt)}>
            <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.5625rem', cursor: 'default' }}>
              {formatTimeAgo(email.sentAt)}
            </Typography>
          </Tooltip>
          <IconButton size="small" sx={{ color: 'var(--text3)', p: 0.25 }}>
            {expanded ? <ExpandLessIcon sx={{ fontSize: 14 }} /> : <ExpandMoreIcon sx={{ fontSize: 14 }} />}
          </IconButton>
        </Box>
      </Box>

      {/* Email body — expanded */}
      {expanded && (
        <Box sx={{ px: 1.5, py: 1.25, borderTop: `1px solid ${isSent ? 'rgba(46,204,143,0.15)' : 'rgba(79,124,255,0.15)'}` }}>
          {/* Metadata */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 1.25 }}>
            <Box>
              <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>From</Typography>
              <Typography variant="caption" sx={{ color: 'var(--text2)', fontSize: '0.625rem', fontFamily: 'var(--font-mono)' }}>{email.fromAddress}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>To</Typography>
              <Typography variant="caption" sx={{ color: 'var(--text2)', fontSize: '0.625rem', fontFamily: 'var(--font-mono)' }}>{email.toAddress}</Typography>
            </Box>
            {email.cc && (
              <Box>
                <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>CC</Typography>
                <Typography variant="caption" sx={{ color: 'var(--text2)', fontSize: '0.625rem', fontFamily: 'var(--font-mono)' }}>{email.cc}</Typography>
              </Box>
            )}
            <Box>
              <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>Sent</Typography>
              <Typography variant="caption" sx={{ color: 'var(--text2)', fontSize: '0.625rem' }}>{formatDateTime(email.sentAt)}</Typography>
            </Box>
            {email.sentBy && (
              <Box>
                <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>By</Typography>
                <Typography variant="caption" sx={{ color: 'var(--text2)', fontSize: '0.625rem' }}>{email.sentBy.firstName} {email.sentBy.lastName}</Typography>
              </Box>
            )}
          </Box>
          <Divider sx={{ borderColor: 'var(--border)', mb: 1 }} />
          {/* Body */}
          <Typography variant="body2" sx={{
            color: 'var(--text2)', fontSize: '0.6875rem', lineHeight: 1.7,
            whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)',
            maxHeight: 240, overflowY: 'auto',
          }}>
            {email.body}
          </Typography>
          {email.messageId && (
            <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.5rem', display: 'block', mt: 1, fontFamily: 'var(--font-mono)' }}>
              ID: {email.messageId}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

export default function EmailThread({ emails, loading, onReply }) {
  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
      <CircularProgress size={18} sx={{ color: 'var(--accent)' }} />
    </Box>
  );

  if (!emails?.length) return (
    <Box sx={{ py: 1 }}>
      <Typography variant="body2" sx={{ color: 'var(--text3)', fontStyle: 'italic', fontSize: '0.75rem' }}>
        No emails yet.
      </Typography>
      {onReply && (
        <Box sx={{ mt: 1.5 }}>
          <Box
            onClick={onReply}
            sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.75,
              px: 1.5, py: 0.75, borderRadius: '6px', cursor: 'pointer',
              border: '1px dashed var(--border2)',
              color: 'var(--accent)', fontSize: '0.75rem',
              '&:hover': { bgcolor: 'rgba(79,124,255,0.08)' },
            }}>
            <SendOutlinedIcon sx={{ fontSize: 13 }} />
            <Typography variant="body2" sx={{ color: 'var(--accent)', fontSize: '0.75rem' }}>Send first email</Typography>
          </Box>
        </Box>
      )}
    </Box>
  );

  return (
    <Box>
      {/* Thread summary */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            label={`${emails.filter(e => e.direction === 'SENT').length} sent`}
            size="small"
            sx={{ height: 16, fontSize: '0.5625rem', bgcolor: 'rgba(46,204,143,0.1)', color: 'var(--green)' }}
          />
          <Chip
            label={`${emails.filter(e => e.direction === 'RECEIVED').length} received`}
            size="small"
            sx={{ height: 16, fontSize: '0.5625rem', bgcolor: 'rgba(79,124,255,0.1)', color: 'var(--accent)' }}
          />
        </Box>
        {onReply && (
          <Tooltip title="Compose reply">
            <IconButton size="small" onClick={onReply}
              sx={{ color: 'var(--accent)', bgcolor: 'rgba(79,124,255,0.1)', borderRadius: '6px' }}>
              <ReplyOutlinedIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Email list — newest first, first email expanded */}
      {emails.map((email, i) => (
        <EmailItem key={email.id} email={email} defaultExpanded={i === 0} />
      ))}
    </Box>
  );
}
