/**
 * EmailComposer — Phase 6
 * Slide-in panel for composing and sending an email from a ticket.
 * Pre-fills To/Subject from reply defaults when replying.
 */
import React, { useState, useEffect } from 'react';
import Box          from '@mui/material/Box';
import Typography   from '@mui/material/Typography';
import TextField    from '@mui/material/TextField';
import Button       from '@mui/material/Button';
import IconButton   from '@mui/material/IconButton';
import Alert        from '@mui/material/Alert';
import Divider      from '@mui/material/Divider';
import Chip         from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse     from '@mui/material/Collapse';
import CloseIcon            from '@mui/icons-material/Close';
import SendOutlinedIcon     from '@mui/icons-material/SendOutlined';
import EmailOutlinedIcon    from '@mui/icons-material/EmailOutlined';
import ExpandMoreIcon       from '@mui/icons-material/ExpandMore';
import ExpandLessIcon       from '@mui/icons-material/ExpandLess';
import WifiOffIcon          from '@mui/icons-material/WifiOff';

import { emailService } from '../../services/api';
import { extractApiError } from '../../utils/validation';

const EMPTY = { to: '', cc: '', subject: '', body: '' };

export default function EmailComposer({ ticketId, ticketNumber, open, onClose, onSent }) {
  const [form,       setForm]       = useState(EMPTY);
  const [sending,    setSending]    = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');
  const [showCc,     setShowCc]     = useState(false);
  const [smtpOk,     setSmtpOk]     = useState(null); // null=checking, true/false

  const [loadingDef, setLoadingDef] = useState(false);

  // Load reply defaults and SMTP status when panel opens
  useEffect(() => {
    if (!open || !ticketId) return;
    setForm(EMPTY);
    setError('');
    setSuccess('');
    setShowCc(false);

    setLoadingDef(true);
    Promise.all([
      emailService.replyDefaults(ticketId).catch(() => null),
      emailService.smtpStatus(ticketId).catch(() => null),
    ]).then(([defRes, smtpRes]) => {
      if (defRes?.data?.data) {
        const d = defRes.data.data;
        setForm(f => ({
          ...f,
          to:      d.to      || '',
          subject: d.subject || '',
        }));
        if (d.inReplyTo) setForm(f => ({ ...f, _inReplyTo: d.inReplyTo }));
      }
      if (smtpRes?.data?.data) {
        setSmtpOk(smtpRes.data.data.ok);

      } else {
        setSmtpOk(false);

      }
    }).finally(() => setLoadingDef(false));
  }, [open, ticketId]);

  const handleChange = (e) => {
    setError('');
    setSuccess('');
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    if (!form.to.trim())      return 'Recipient (To) is required';
    if (!form.subject.trim()) return 'Subject is required';
    if (!form.body.trim())    return 'Email body is required';
    return null;
  };

  const handleSend = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    if (sending) return;
    setSending(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        to:        form.to.trim(),
        cc:        form.cc.trim() || null,
        subject:   form.subject.trim(),
        body:      form.body.trim(),
        inReplyTo: form._inReplyTo || null,
      };
      const res = await emailService.send(ticketId, payload);
      const msg = res.data?.message || 'Email sent';
      setSuccess(msg);
      setForm(EMPTY);
      if (onSent) onSent(res.data?.data);
      setTimeout(() => { setSuccess(''); onClose(); }, 2000);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <Box sx={{
      position: 'fixed', inset: 0, zIndex: 1300,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
      pointerEvents: 'none',
    }}>
      {/* Backdrop */}
      <Box
        onClick={onClose}
        sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.4)', pointerEvents: 'all' }}
      />

      {/* Composer panel */}
      <Box sx={{
        position: 'relative',
        width: { xs: '100%', sm: 560 },
        maxHeight: '90vh',
        bgcolor: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: '12px 12px 0 0',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.4)',
        pointerEvents: 'all',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.5, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <EmailOutlinedIcon sx={{ fontSize: 16, color: 'var(--accent)' }} />
          <Typography variant="h5" sx={{ color: 'var(--text)', fontWeight: 600, flex: 1 }}>
            Compose Email
            <Typography component="span" variant="caption" sx={{ color: 'var(--text3)', ml: 1, fontFamily: 'var(--font-mono)' }}>
              {ticketNumber}
            </Typography>
          </Typography>

          {/* SMTP status indicator */}
          {smtpOk === false && (
            <Chip
              icon={<WifiOffIcon sx={{ fontSize: 11 }} />}
              label="SMTP offline — email will be saved only"
              size="small"
              sx={{ bgcolor: 'rgba(240,160,48,0.15)', color: 'var(--amber)', fontSize: '0.5625rem', height: 18, border: '1px solid rgba(240,160,48,0.3)' }}
            />
          )}
          {smtpOk === true && (
            <Chip label="SMTP ready" size="small"
              sx={{ bgcolor: 'rgba(46,204,143,0.12)', color: 'var(--green)', fontSize: '0.5625rem', height: 18 }} />
          )}

          <IconButton size="small" onClick={onClose} sx={{ color: 'var(--text3)' }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>

        {/* Form body */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, py: 2 }}>
          {loadingDef && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={16} sx={{ color: 'var(--accent)' }} />
            </Box>
          )}

          {error   && <Alert severity="error"   sx={{ mb: 1.5, fontSize: '0.75rem' }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 1.5, fontSize: '0.75rem' }}>{success}</Alert>}

          {/* To */}
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.5625rem', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.5 }}>
              To <span style={{ color: 'var(--red)' }}>*</span>
            </Typography>
            <TextField fullWidth size="small" name="to" value={form.to} onChange={handleChange}
              placeholder="recipient@example.com"
              disabled={sending}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--bg3)', fontSize: '0.75rem' } }} />
          </Box>

          {/* CC toggle */}
          <Box sx={{ mb: 1.5 }}>
            <Box
              onClick={() => setShowCc(v => !v)}
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.5625rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>CC</Typography>
              {showCc ? <ExpandLessIcon sx={{ fontSize: 12, color: 'var(--text3)' }} /> : <ExpandMoreIcon sx={{ fontSize: 12, color: 'var(--text3)' }} />}
            </Box>
            <Collapse in={showCc}>
              <TextField fullWidth size="small" name="cc" value={form.cc} onChange={handleChange}
                placeholder="cc@example.com, another@example.com"
                disabled={sending}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--bg3)', fontSize: '0.75rem' } }} />
            </Collapse>
          </Box>

          {/* Subject */}
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.5625rem', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.5 }}>
              Subject <span style={{ color: 'var(--red)' }}>*</span>
            </Typography>
            <TextField fullWidth size="small" name="subject" value={form.subject} onChange={handleChange}
              placeholder={`[${ticketNumber}] Subject…`}
              disabled={sending}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--bg3)', fontSize: '0.75rem' } }} />
          </Box>

          <Divider sx={{ borderColor: 'var(--border)', mb: 1.5 }} />

          {/* Body */}
          <Box>
            <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.5625rem', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.5 }}>
              Message <span style={{ color: 'var(--red)' }}>*</span>
            </Typography>
            <TextField fullWidth multiline minRows={6} maxRows={14} size="small"
              name="body" value={form.body} onChange={handleChange}
              placeholder="Type your message here…"
              disabled={sending}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--bg3)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' } }} />
          </Box>
        </Box>

        {/* Footer */}
        <Box sx={{ px: 2.5, py: 1.5, borderTop: '1px solid var(--border)', display: 'flex', gap: 1, justifyContent: 'flex-end', flexShrink: 0 }}>
          <Button variant="outlined" size="small" onClick={onClose} disabled={sending}
            sx={{ borderColor: 'var(--border2)', color: 'var(--text2)', fontSize: '0.75rem' }}>
            Cancel
          </Button>
          <Button variant="contained" size="small" onClick={handleSend} disabled={sending} sx={{ minWidth: 110, fontSize: '0.75rem' }}
            endIcon={sending ? <CircularProgress size={12} sx={{ color: 'inherit' }} /> : <SendOutlinedIcon sx={{ fontSize: 14 }} />}>
            {sending ? 'Sending…' : smtpOk === false ? 'Save Email' : 'Send Email'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
