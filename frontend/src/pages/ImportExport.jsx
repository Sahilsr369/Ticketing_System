import React, { useState, useRef } from 'react';
import Box              from '@mui/material/Box';
import Typography       from '@mui/material/Typography';
import Paper            from '@mui/material/Paper';
import Button           from '@mui/material/Button';
import Alert            from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Divider          from '@mui/material/Divider';
import Chip             from '@mui/material/Chip';
import TextField        from '@mui/material/TextField';
import MenuItem         from '@mui/material/MenuItem';
import UploadFileOutlinedIcon   from '@mui/icons-material/UploadFileOutlined';
import DownloadOutlinedIcon     from '@mui/icons-material/DownloadOutlined';
import CheckCircleOutlineIcon   from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon         from '@mui/icons-material/ErrorOutline';
import TableChartOutlinedIcon   from '@mui/icons-material/TableChartOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';

import { importService, reportsService } from '../services/api';
import { useCategories } from '../hooks/useCategories';
import { STATUSES, PRIORITIES } from '../components/tickets/ticketConstants';

// ─── Export panel ─────────────────────────────────────────────────────────────
function ExportPanel() {
  const { categories } = useCategories();
  const [format,     setFormat]     = useState('xlsx');
  const [status,     setStatus]     = useState('');
  const [priority,   setPriority]   = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  const doExport = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { format };
      if (status)     params.status     = status;
      if (priority)   params.priority   = priority;
      if (categoryId) params.categoryId = categoryId;
      if (dateFrom)   params.dateFrom   = dateFrom;
      if (dateTo)     params.dateTo     = dateTo;

      const res  = await reportsService.export(params);
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data]);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `tickets-export-${Date.now()}.${format === 'excel' ? 'xlsx' : format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message || 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  const labelSx = { color: 'var(--text3)', fontSize: '0.5625rem', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.5 };
  const fieldSx = { '& .MuiOutlinedInput-root': { bgcolor: 'var(--bg3)', fontSize: '0.75rem' } };

  return (
    <Paper elevation={0} sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <DownloadOutlinedIcon sx={{ fontSize: 16, color: 'var(--green)' }} />
        <Typography variant="h5" sx={{ color: 'var(--text)', fontWeight: 600 }}>Export Tickets</Typography>
      </Box>
      <Typography variant="body2" sx={{ color: 'var(--text2)', mb: 2.5, fontSize: '0.75rem' }}>
        Download all tickets matching the selected filters as CSV, Excel, or PDF.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2, fontSize: '0.75rem' }}>{error}</Alert>}

      {/* Filters */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5, mb: 2 }}>
        <Box>
          <Typography variant="caption" sx={labelSx}>Format</Typography>
          <TextField select fullWidth size="small" value={format} onChange={e => setFormat(e.target.value)} sx={fieldSx}>
            <MenuItem value="csv"   sx={{ fontSize: '0.75rem' }}>CSV (.csv)</MenuItem>
            <MenuItem value="excel" sx={{ fontSize: '0.75rem' }}>Excel (.xlsx)</MenuItem>
          </TextField>
        </Box>
        <Box>
          <Typography variant="caption" sx={labelSx}>Status</Typography>
          <TextField select fullWidth size="small" value={status} onChange={e => setStatus(e.target.value)} sx={fieldSx}>
            <MenuItem value="" sx={{ fontSize: '0.75rem', color: 'var(--text3)' }}>All Statuses</MenuItem>
            {STATUSES.map(s => <MenuItem key={s.value} value={s.value} sx={{ fontSize: '0.75rem' }}>{s.label}</MenuItem>)}
          </TextField>
        </Box>
        <Box>
          <Typography variant="caption" sx={labelSx}>Priority</Typography>
          <TextField select fullWidth size="small" value={priority} onChange={e => setPriority(e.target.value)} sx={fieldSx}>
            <MenuItem value="" sx={{ fontSize: '0.75rem', color: 'var(--text3)' }}>All Priorities</MenuItem>
            {PRIORITIES.map(p => <MenuItem key={p.value} value={p.value} sx={{ fontSize: '0.75rem' }}>{p.label}</MenuItem>)}
          </TextField>
        </Box>
        <Box>
          <Typography variant="caption" sx={labelSx}>Category</Typography>
          <TextField select fullWidth size="small" value={categoryId} onChange={e => setCategoryId(e.target.value)} sx={fieldSx}>
            <MenuItem value="" sx={{ fontSize: '0.75rem', color: 'var(--text3)' }}>All Categories</MenuItem>
            {categories.map(c => <MenuItem key={c.id} value={String(c.id)} sx={{ fontSize: '0.75rem' }}>{c.name}</MenuItem>)}
          </TextField>
        </Box>
        <Box>
          <Typography variant="caption" sx={labelSx}>From Date</Typography>
          <TextField fullWidth size="small" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} sx={fieldSx} />
        </Box>
        <Box>
          <Typography variant="caption" sx={labelSx}>To Date</Typography>
          <TextField fullWidth size="small" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }} sx={fieldSx} />
        </Box>
      </Box>

      <Button variant="contained" size="small" onClick={doExport} disabled={loading}
        startIcon={loading ? <CircularProgress size={13} sx={{ color: 'inherit' }} /> : <DownloadOutlinedIcon sx={{ fontSize: 15 }} />}
        sx={{ minWidth: 160, fontSize: '0.75rem' }}>
        {loading ? 'Exporting…' : `Export as ${format.toUpperCase()}`}
      </Button>
    </Paper>
  );
}

// ─── Import panel ─────────────────────────────────────────────────────────────
function ImportPanel() {
  const fileRef = useRef(null);
  const [file,     setFile]     = useState(null);
  const [preview,  setPreview]  = useState(null);
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState('');  // 'preview' | 'import' | ''
  const [error,    setError]    = useState('');

  const reset = () => { setFile(null); setPreview(null); setResult(null); setError(''); if (fileRef.current) fileRef.current.value = ''; };

  const handleFile = async (f) => {
    if (!f) return;
    setFile(f);
    setPreview(null);
    setResult(null);
    setError('');
    setLoading('preview');
    try {
      const res = await importService.preview(f);
      setPreview(res.data?.data);
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message || 'Could not parse file');
      setFile(null);
    } finally {
      setLoading('');
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading('import');
    setError('');
    try {
      const res = await importService.import(file);
      setResult(res.data?.data);
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message || 'Import failed');
    } finally {
      setLoading('');
    }
  };

  const downloadTemplate = async (format) => {
    try {
      const res  = await importService.template(format);
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data]);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `ticket-import-template.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('Could not download template');
    }
  };

  const labelSx = { color: 'var(--text3)', fontSize: '0.5625rem', textTransform: 'uppercase', letterSpacing: '0.06em' };

  return (
    <Paper elevation={0} sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <UploadFileOutlinedIcon sx={{ fontSize: 16, color: 'var(--accent)' }} />
        <Typography variant="h5" sx={{ color: 'var(--text)', fontWeight: 600 }}>Import Tickets</Typography>
      </Box>
      <Typography variant="body2" sx={{ color: 'var(--text2)', mb: 2, fontSize: '0.75rem' }}>
        Upload a CSV or Excel file to bulk-import tickets. Download the template first to ensure correct column headers.
      </Typography>

      {/* Template download */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2.5, flexWrap: 'wrap' }}>
        <Typography variant="caption" sx={{ ...labelSx, alignSelf: 'center' }}>Download template:</Typography>
        <Button size="small" variant="outlined" onClick={() => downloadTemplate('xlsx')}
          startIcon={<TableChartOutlinedIcon sx={{ fontSize: 13 }} />}
          sx={{ borderColor: 'var(--border2)', color: 'var(--text2)', fontSize: '0.6875rem' }}>
          Excel template
        </Button>
        <Button size="small" variant="outlined" onClick={() => downloadTemplate('csv')}
          startIcon={<InsertDriveFileOutlinedIcon sx={{ fontSize: 13 }} />}
          sx={{ borderColor: 'var(--border2)', color: 'var(--text2)', fontSize: '0.6875rem' }}>
          CSV template
        </Button>
      </Box>

      <Divider sx={{ borderColor: 'var(--border)', mb: 2.5 }} />

      {/* Template fields reference */}
      <Box sx={{ mb: 2.5, p: 1.5, bgcolor: 'var(--bg3)', borderRadius: '6px', border: '1px solid var(--border)' }}>
        <Typography variant="caption" sx={{ ...labelSx, display: 'block', mb: 1 }}>Template columns</Typography>
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
          {['Ticket Number','Title *','Description *','Category','Subcategory','Priority','Status','Created Date'].map(f => (
            <Chip key={f} label={f} size="small"
              sx={{ height: 18, fontSize: '0.5625rem', bgcolor: f.includes('*') ? 'rgba(79,124,255,0.12)' : 'var(--bg4)', color: f.includes('*') ? 'var(--accent)' : 'var(--text2)', border: f.includes('*') ? '1px solid rgba(79,124,255,0.3)' : '1px solid var(--border)' }} />
          ))}
        </Box>
        <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.5625rem', display: 'block', mt: 0.75 }}>
          * Required. Priority: LOW/MEDIUM/HIGH/CRITICAL. Status: LOGGED/OPEN/PENDING/RESOLVED/CLOSED. Max 5,000 rows.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, fontSize: '0.75rem' }}>{error}</Alert>}

      {/* File picker */}
      {!result && (
        <Box
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          sx={{
            border: `2px dashed ${file ? 'var(--accent)' : 'var(--border2)'}`,
            borderRadius: '8px', p: 3, textAlign: 'center', cursor: 'pointer',
            bgcolor: file ? 'rgba(79,124,255,0.04)' : 'var(--bg3)',
            mb: 2,
            '&:hover': { borderColor: 'var(--accent)', bgcolor: 'rgba(79,124,255,0.04)' },
          }}>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])} />
          {loading === 'preview' ? (
            <CircularProgress size={20} sx={{ color: 'var(--accent)', mb: 1 }} />
          ) : (
            <UploadFileOutlinedIcon sx={{ fontSize: 32, color: file ? 'var(--accent)' : 'var(--text3)', mb: 1 }} />
          )}
          <Typography variant="body2" sx={{ color: file ? 'var(--accent)' : 'var(--text2)', fontWeight: file ? 600 : 400, fontSize: '0.75rem' }}>
            {file ? file.name : 'Click or drag & drop a CSV or Excel file'}
          </Typography>
          {!file && <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.625rem' }}>.csv, .xlsx, .xls · max 10 MB · max 5,000 rows</Typography>}
        </Box>
      )}

      {/* Preview */}
      {preview && !result && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Typography variant="caption" sx={labelSx}>Preview — {preview.totalRows} rows detected</Typography>
            <Chip label={`${preview.totalRows} rows`} size="small"
              sx={{ height: 16, fontSize: '0.5625rem', bgcolor: 'rgba(79,124,255,0.1)', color: 'var(--accent)' }} />
          </Box>

          {/* Preview table */}
          <Box sx={{ overflowX: 'auto', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.6875rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg4)' }}>
                  {preview.headers.map(h => (
                    <th key={h} style={{ padding: '6px 10px', color: 'var(--text3)', textAlign: 'left', borderBottom: '1px solid var(--border)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.preview.map((row, i) => (
                  <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'var(--bg3)' : 'var(--bg2)' }}>
                    {preview.headers.map(h => (
                      <td key={h} style={{ padding: '5px 10px', color: 'var(--text2)', borderBottom: '1px solid var(--border)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {String(row[h] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
          {preview.totalRows > 5 && (
            <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.5625rem', display: 'block', mt: 0.5 }}>
              Showing first 5 of {preview.totalRows} rows
            </Typography>
          )}

          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button variant="outlined" size="small" onClick={reset}
              sx={{ borderColor: 'var(--border2)', color: 'var(--text2)', fontSize: '0.75rem' }}>
              Cancel
            </Button>
            <Button variant="contained" size="small" onClick={handleImport}
              disabled={loading === 'import'}
              startIcon={loading === 'import' ? <CircularProgress size={12} sx={{ color: 'inherit' }} /> : <UploadFileOutlinedIcon sx={{ fontSize: 14 }} />}
              sx={{ minWidth: 140, fontSize: '0.75rem' }}>
              {loading === 'import' ? `Importing…` : `Import ${preview.totalRows} rows`}
            </Button>
          </Box>
        </Box>
      )}

      {/* Result */}
      {result && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: 120, p: 1.5, bgcolor: 'rgba(46,204,143,0.06)', borderRadius: '8px', border: '1px solid rgba(46,204,143,0.2)' }}>
              <CheckCircleOutlineIcon sx={{ fontSize: 20, color: 'var(--green)', display: 'block', mb: 0.5 }} />
              <Typography sx={{ color: 'var(--green)', fontFamily: 'monospace', fontWeight: 700, fontSize: '1.5rem', lineHeight: 1 }}>{result.imported}</Typography>
              <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.5625rem' }}>Imported</Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 120, p: 1.5, bgcolor: result.skipped > 0 ? 'rgba(240,160,48,0.06)' : 'var(--bg3)', borderRadius: '8px', border: `1px solid ${result.skipped > 0 ? 'rgba(240,160,48,0.2)' : 'var(--border)'}` }}>
              <Typography sx={{ color: result.skipped > 0 ? 'var(--amber)' : 'var(--text3)', fontFamily: 'monospace', fontWeight: 700, fontSize: '1.5rem', lineHeight: 1, mt: 3.5 }}>{result.skipped}</Typography>
              <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.5625rem' }}>Skipped</Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 120, p: 1.5, bgcolor: result.errors.length > 0 ? 'rgba(224,80,80,0.06)' : 'var(--bg3)', borderRadius: '8px', border: `1px solid ${result.errors.length > 0 ? 'rgba(224,80,80,0.2)' : 'var(--border)'}` }}>
              <ErrorOutlineIcon sx={{ fontSize: 20, color: result.errors.length > 0 ? 'var(--red)' : 'var(--text3)', display: 'block', mb: 0.5 }} />
              <Typography sx={{ color: result.errors.length > 0 ? 'var(--red)' : 'var(--text3)', fontFamily: 'monospace', fontWeight: 700, fontSize: '1.5rem', lineHeight: 1 }}>{result.errors.length}</Typography>
              <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.5625rem' }}>Errors</Typography>
            </Box>
          </Box>

          {result.errors.length > 0 && (
            <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(224,80,80,0.06)', borderRadius: '6px', border: '1px solid rgba(224,80,80,0.2)', maxHeight: 180, overflowY: 'auto' }}>
              <Typography variant="caption" sx={{ color: 'var(--red)', fontWeight: 600, fontSize: '0.625rem', display: 'block', mb: 0.75 }}>Errors</Typography>
              {result.errors.map((e, i) => (
                <Typography key={i} variant="caption" sx={{ color: 'var(--text2)', fontSize: '0.625rem', display: 'block' }}>• {e}</Typography>
              ))}
            </Box>
          )}

          <Button variant="outlined" size="small" onClick={reset}
            sx={{ borderColor: 'var(--border2)', color: 'var(--text2)', fontSize: '0.75rem' }}>
            Import another file
          </Button>
        </Box>
      )}
    </Paper>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ImportExport() {
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h2" sx={{ color: 'var(--text)', fontWeight: 700 }}>Import / Export</Typography>
        <Typography variant="body2" sx={{ color: 'var(--text2)', mt: 0.5 }}>
          Bulk load tickets from CSV or Excel · Export filtered ticket data · Download import templates
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2.5, alignItems: 'start' }}>
        <ImportPanel />
        <ExportPanel />
      </Box>
    </Box>
  );
}
