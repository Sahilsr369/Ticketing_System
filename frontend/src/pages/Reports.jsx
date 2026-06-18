import React, { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

import Box              from '@mui/material/Box';
import Typography       from '@mui/material/Typography';
import Paper            from '@mui/material/Paper';
import TextField        from '@mui/material/TextField';

import Button           from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert            from '@mui/material/Alert';


import LinearProgress   from '@mui/material/LinearProgress';
import DownloadIcon     from '@mui/icons-material/Download';

import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';

import { reportsService } from '../services/api';

import { formatDuration } from '../components/tickets/SlaMetrics';
import { formatPriority } from '../utils/format';

// ─── Register Chart.js ────────────────────────────────────────────────────────
ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
);

// ─── Design-system colours ────────────────────────────────────────────────────
const C = {
  accent:  '#4f7cff', accent2: '#6b95ff',
  green:   '#2ecc8f', green2:  '#1a9966',
  amber:   '#f0a030', red:     '#e05050',
  purple:  '#9b6fff', cyan:    '#20d4d4',
  text:    '#e8eaf0', text2:   '#9399b0', text3: '#5a6080',
  bg3:     '#1c2030', bg4:     '#242840',
  border:  'rgba(255,255,255,0.08)',
};

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: C.text2, font: { size: 11 }, boxWidth: 12, padding: 16 } },
    tooltip: {
      backgroundColor: '#0d0f12',
      titleColor: C.text, bodyColor: C.text2,
      borderColor: C.border, borderWidth: 1,
      padding: 10,
    },
  },
  scales: {
    x: { ticks: { color: C.text3, font: { size: 10 } }, grid: { color: C.border } },
    y: { ticks: { color: C.text3, font: { size: 10 } }, grid: { color: C.border } },
  },
};

const STATUS_COLORS = {
  LOGGED: C.purple, OPEN: C.accent, PENDING: C.amber,
  RESOLVED: C.green, CLOSED: C.text3,
};

const PRIORITY_COLORS = {
  CRITICAL: C.red, HIGH: C.amber, MEDIUM: C.accent, LOW: C.green,
};

// ─── Shared filter controls ───────────────────────────────────────────────────
function DateRangeFilter({ filters, onChange }) {
  return (
    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
      <TextField size="small" type="date" value={filters.dateFrom}
        onChange={e => onChange('dateFrom', e.target.value)}
        InputProps={{ startAdornment: <Typography variant="caption" sx={{ color: C.text3, mr: 0.5, fontSize: '0.6875rem', whiteSpace: 'nowrap' }}>From:</Typography> }}
        sx={{ minWidth: 180 }} InputLabelProps={{ shrink: true }} />
      <TextField size="small" type="date" value={filters.dateTo}
        onChange={e => onChange('dateTo', e.target.value)}
        InputProps={{ startAdornment: <Typography variant="caption" sx={{ color: C.text3, mr: 0.5, fontSize: '0.6875rem', whiteSpace: 'nowrap' }}>To:</Typography> }}
        sx={{ minWidth: 180 }} InputLabelProps={{ shrink: true }} />
    </Box>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = C.text }) {
  return (
    <Box sx={{ flex: 1, minWidth: 140, p: 2, bgcolor: C.bg3, borderRadius: '8px', border: `1px solid ${C.border}` }}>
      <Typography variant="caption" sx={{ color: C.text3, fontSize: '0.5625rem', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.75 }}>
        {label}
      </Typography>
      <Typography sx={{ color, fontFamily: 'monospace', fontWeight: 700, fontSize: '1.375rem', lineHeight: 1 }}>
        {value}
      </Typography>
      {sub && <Typography variant="caption" sx={{ color: C.text3, fontSize: '0.5625rem', display: 'block', mt: 0.5 }}>{sub}</Typography>}
    </Box>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────
function TabBtn({ label, active, onClick }) {
  return (
    <Button size="small" onClick={onClick} sx={{
      fontSize: '0.75rem', fontWeight: active ? 700 : 400,
      color:    active ? C.accent : C.text2,
      bgcolor:  active ? 'rgba(79,124,255,0.12)' : 'transparent',
      border:   active ? `1px solid rgba(79,124,255,0.35)` : '1px solid transparent',
      borderRadius: '6px', px: 1.5, py: 0.5,
      '&:hover': { bgcolor: 'rgba(79,124,255,0.08)' },
    }}>
      {label}
    </Button>
  );
}

// ─── Export button ────────────────────────────────────────────────────────────
function ExportButtons({ filters }) {
  const [loading, setLoading] = useState('');

  const doExport = async (format) => {
    setLoading(format);
    try {
      const res = await reportsService.export({ ...filters, format });
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data]);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `tickets-${Date.now()}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed', e);
    } finally {
      setLoading('');
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Button size="small" variant="outlined" onClick={() => doExport('csv')}
        disabled={!!loading}
        startIcon={loading === 'csv' ? <CircularProgress size={12} /> : <DownloadIcon sx={{ fontSize: 13 }} />}
        sx={{ borderColor: C.border, color: C.text2, fontSize: '0.6875rem' }}>
        CSV
      </Button>
      <Button size="small" variant="outlined" onClick={() => doExport('excel')}
        disabled={!!loading}
        startIcon={loading === 'excel' ? <CircularProgress size={12} /> : <TableChartOutlinedIcon sx={{ fontSize: 13 }} />}
        sx={{ borderColor: C.border, color: C.text2, fontSize: '0.6875rem' }}>
        Excel
      </Button>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB PANELS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Volume Panel ──────────────────────────────────────────────────────────────
function VolumePanel({ filters, onFilterChange }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [gran,    setGran]    = useState('daily');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await reportsService.volumes({ ...filters, granularity: gran });
      setData(res.data?.data);
    } catch (e) { setError(e.response?.data?.error?.message || e.message); }
    finally { setLoading(false); }
  }, [filters, gran]);

  useEffect(() => { load(); }, [load]);

  const chartData = data ? {
    labels:   data.data.map(d => d.label),
    datasets: [
      {
        label: 'Total',
        data:  data.data.map(d => d.total),
        backgroundColor: `${C.accent}99`,
        borderColor:     C.accent,
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Resolved',
        data:  data.data.map(d => d.resolved),
        backgroundColor: `${C.green}99`,
        borderColor:     C.green,
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  } : null;

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <DateRangeFilter filters={filters} onChange={onFilterChange} />
        <Box sx={{ display: 'flex', gap: 0.75 }}>
          {['daily','weekly','monthly'].map(g => (
            <TabBtn key={g} label={g.charAt(0).toUpperCase()+g.slice(1)} active={gran===g} onClick={() => setGran(g)} />
          ))}
        </Box>
        <Box sx={{ ml: 'auto' }}><ExportButtons filters={{ ...filters }} /></Box>
      </Box>

      {error   && <Alert severity="error"   sx={{ mb: 2, fontSize: '0.75rem' }}>{error}</Alert>}
      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={24} sx={{ color: C.accent }} /></Box>}

      {!loading && data && (
        <>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <StatCard label="Total Tickets"   value={data.total.toLocaleString()} />
            <StatCard label="Resolved"        value={data.data.reduce((s,d)=>s+d.resolved,0).toLocaleString()} color={C.green} />
            <StatCard label="Period"          value={gran.charAt(0).toUpperCase()+gran.slice(1)} sub={`${data.data.length} ${gran === 'daily' ? 'days' : gran === 'weekly' ? 'weeks' : 'months'}`} />
          </Box>

          <Paper elevation={0} sx={{ p: 2.5, mb: 2 }}>
            <Typography variant="h5" sx={{ color: C.text, fontWeight: 600, mb: 2 }}>
              Ticket Volume — {gran.charAt(0).toUpperCase()+gran.slice(1)}
            </Typography>
            <Box sx={{ height: 320 }}>
              {chartData && (
                <Bar data={chartData} options={{
                  ...CHART_DEFAULTS,
                  plugins: { ...CHART_DEFAULTS.plugins, legend: { ...CHART_DEFAULTS.plugins.legend, position: 'top' } },
                }} />
              )}
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
}

// ── Status Panel ──────────────────────────────────────────────────────────────
function StatusPanel({ filters, onFilterChange }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await reportsService.status(filters);
      setData(res.data?.data);
    } catch (e) { setError(e.response?.data?.error?.message || e.message); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const doughnutData = data ? {
    labels: data.byStatus.map(s => s.status),
    datasets: [{
      data:            data.byStatus.map(s => s.count),
      backgroundColor: data.byStatus.map(s => `${STATUS_COLORS[s.status]}cc`),
      borderColor:     data.byStatus.map(s => STATUS_COLORS[s.status]),
      borderWidth: 1.5,
      hoverOffset: 6,
    }],
  } : null;

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <DateRangeFilter filters={filters} onChange={onFilterChange} />
        <Box sx={{ ml: 'auto' }}><ExportButtons filters={filters} /></Box>
      </Box>

      {error   && <Alert severity="error" sx={{ mb: 2, fontSize: '0.75rem' }}>{error}</Alert>}
      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={24} sx={{ color: C.accent }} /></Box>}

      {!loading && data && (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2.5 }}>
          {/* Doughnut */}
          <Paper elevation={0} sx={{ p: 2.5 }}>
            <Typography variant="h5" sx={{ color: C.text, fontWeight: 600, mb: 2 }}>
              Status Distribution — {data.total.toLocaleString()} total
            </Typography>
            <Box sx={{ height: 300 }}>
              {doughnutData && (
                <Doughnut data={doughnutData} options={{
                  ...CHART_DEFAULTS,
                  plugins: {
                    ...CHART_DEFAULTS.plugins,
                    legend: { ...CHART_DEFAULTS.plugins.legend, position: 'right' },
                  },
                  scales: {},
                  cutout: '65%',
                }} />
              )}
            </Box>
          </Paper>

          {/* Status table */}
          <Paper elevation={0} sx={{ p: 2.5 }}>
            <Typography variant="h5" sx={{ color: C.text, fontWeight: 600, mb: 2 }}>Breakdown</Typography>
            {data.byStatus.map(s => (
              <Box key={s.status} sx={{ mb: 1.75 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: STATUS_COLORS[s.status] }} />
                    <Typography variant="body2" sx={{ color: C.text, fontSize: '0.75rem', fontWeight: 500 }}>{s.status}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="body2" sx={{ color: C.text2, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {s.count.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" sx={{ color: C.text3, fontSize: '0.625rem', width: 32, textAlign: 'right' }}>
                      {s.pct}%
                    </Typography>
                  </Box>
                </Box>
                <LinearProgress variant="determinate" value={s.pct}
                  sx={{ height: 5, borderRadius: 3, bgcolor: C.bg4, '& .MuiLinearProgress-bar': { bgcolor: STATUS_COLORS[s.status], borderRadius: 3 } }} />
              </Box>
            ))}
          </Paper>
        </Box>
      )}
    </Box>
  );
}

// ── Categories Panel ──────────────────────────────────────────────────────────
function CategoriesPanel({ filters, onFilterChange }) {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [expanded,  setExpanded]  = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await reportsService.categories(filters);
      setData(res.data?.data);
    } catch (e) { setError(e.response?.data?.error?.message || e.message); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const PALETTE = [C.accent, C.green, C.purple, C.cyan, C.amber, C.red, '#ff6b6b', '#ffa94d', '#74c0fc', '#b197fc', '#63e6be', '#ffd43b', '#a9e34b', '#4dabf7'];

  const barData = data ? {
    labels:   data.byCategory.map(c => c.categoryName.length > 22 ? c.categoryName.slice(0,20)+'…' : c.categoryName),
    datasets: [{
      label: 'Tickets',
      data:  data.byCategory.map(c => c.count),
      backgroundColor: data.byCategory.map((_, i) => `${PALETTE[i % PALETTE.length]}bb`),
      borderColor:     data.byCategory.map((_, i) => PALETTE[i % PALETTE.length]),
      borderWidth: 1, borderRadius: 4,
    }],
  } : null;

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <DateRangeFilter filters={filters} onChange={onFilterChange} />
        <Box sx={{ ml: 'auto' }}><ExportButtons filters={filters} /></Box>
      </Box>

      {error   && <Alert severity="error" sx={{ mb: 2, fontSize: '0.75rem' }}>{error}</Alert>}
      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={24} sx={{ color: C.accent }} /></Box>}

      {!loading && data && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Horizontal bar chart */}
          <Paper elevation={0} sx={{ p: 2.5 }}>
            <Typography variant="h5" sx={{ color: C.text, fontWeight: 600, mb: 2 }}>
              Tickets by Category — {data.total.toLocaleString()} total
            </Typography>
            <Box sx={{ height: Math.max(240, data.byCategory.length * 32) }}>
              {barData && (
                <Bar data={barData} options={{
                  ...CHART_DEFAULTS,
                  indexAxis: 'y',
                  plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } },
                  scales: {
                    x: { ticks: { color: C.text3, font: { size: 10 } }, grid: { color: C.border } },
                    y: { ticks: { color: C.text2, font: { size: 10 } }, grid: { display: false } },
                  },
                }} />
              )}
            </Box>
          </Paper>

          {/* Category table with expandable subcategories */}
          <Paper elevation={0} sx={{ p: 2.5 }}>
            <Typography variant="h5" sx={{ color: C.text, fontWeight: 600, mb: 1.5 }}>
              Category Detail
            </Typography>
            {data.byCategory.map((cat, i) => (
              <Box key={cat.categoryId}>
                <Box
                  onClick={() => setExpanded(expanded === cat.categoryId ? null : cat.categoryId)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5, py: 1,
                    cursor: cat.subcategories?.length ? 'pointer' : 'default',
                    borderBottom: `1px solid ${C.border}`,
                    '&:hover': cat.subcategories?.length ? { bgcolor: C.bg4, borderRadius: '4px' } : {},
                  }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                  <Typography variant="body2" sx={{ color: C.text, fontWeight: 500, flex: 1, fontSize: '0.75rem' }}>
                    {cat.categoryName}
                  </Typography>
                  <Typography variant="body2" sx={{ color: C.text2, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {cat.count.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ color: C.text3, fontSize: '0.625rem', width: 32, textAlign: 'right' }}>
                    {cat.pct}%
                  </Typography>
                  {cat.subcategories?.length > 0 && (
                    <Typography variant="caption" sx={{ color: C.text3, fontSize: '0.5625rem' }}>
                      {expanded === cat.categoryId ? '▲' : '▼'}
                    </Typography>
                  )}
                </Box>

                {/* Subcategories */}
                {expanded === cat.categoryId && cat.subcategories?.map(sub => (
                  <Box key={sub.subcategoryId} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75, pl: 2.5, borderBottom: `1px solid ${C.border}` }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: C.text3, flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ color: C.text2, flex: 1, fontSize: '0.6875rem' }}>
                      {sub.subcategoryName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: C.text2, fontFamily: 'monospace', fontSize: '0.6875rem' }}>
                      {sub.count.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" sx={{ color: C.text3, fontSize: '0.5625rem', width: 32, textAlign: 'right' }}>
                      {cat.count > 0 ? Math.round((sub.count/cat.count)*100) : 0}%
                    </Typography>
                  </Box>
                ))}
              </Box>
            ))}
            {data.uncategorised > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: C.text3, flexShrink: 0 }} />
                <Typography variant="body2" sx={{ color: C.text3, fontStyle: 'italic', flex: 1, fontSize: '0.75rem' }}>Uncategorised</Typography>
                <Typography variant="body2" sx={{ color: C.text3, fontFamily: 'monospace', fontSize: '0.75rem' }}>{data.uncategorised.toLocaleString()}</Typography>
              </Box>
            )}
          </Paper>
        </Box>
      )}
    </Box>
  );
}

// ── Performance Panel ─────────────────────────────────────────────────────────
function PerformancePanel({ filters, onFilterChange }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await reportsService.performance(filters);
      setData(res.data?.data);
    } catch (e) { setError(e.response?.data?.error?.message || e.message); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const resTimeData = data ? {
    labels:   data.byPriority.map(p => formatPriority(p.priority)),
    datasets: [{
      label: 'Avg Resolution Time (hours)',
      data:  data.byPriority.map(p => p.avgResolutionSeconds != null ? Math.round(p.avgResolutionSeconds / 3600 * 10) / 10 : 0),
      backgroundColor: data.byPriority.map(p => `${PRIORITY_COLORS[p.priority]}99`),
      borderColor:     data.byPriority.map(p => PRIORITY_COLORS[p.priority]),
      borderWidth: 1, borderRadius: 4,
    }],
  } : null;



  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <DateRangeFilter filters={filters} onChange={onFilterChange} />
        <Box sx={{ ml: 'auto' }}><ExportButtons filters={filters} /></Box>
      </Box>

      {error   && <Alert severity="error" sx={{ mb: 2, fontSize: '0.75rem' }}>{error}</Alert>}
      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={24} sx={{ color: C.accent }} /></Box>}

      {!loading && data && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Summary stat row */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <StatCard label="Total Tickets"       value={data.total.toLocaleString()} />
            <StatCard label="Resolved"            value={data.resolvedCount.toLocaleString()} color={C.green} sub={`${data.total > 0 ? Math.round(data.resolvedCount/data.total*100) : 0}% of total`} />
            <StatCard label="SLA Compliance"      value={`${data.sla.slaComplianceRate}%`} color={data.sla.slaComplianceRate >= 90 ? C.green : data.sla.slaComplianceRate >= 70 ? C.amber : C.red} sub={`${data.sla.slaBreached} breached`} />
            <StatCard label="Avg First Response"  value={formatDuration(data.avgFirstResponseSeconds)} color={C.cyan} />
            <StatCard label="Avg Resolution"      value={formatDuration(data.avgResolutionSeconds)}    color={C.accent} />
          </Box>

          {/* SLA compliance bar */}
          <Paper elevation={0} sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="h5" sx={{ color: C.text, fontWeight: 600 }}>SLA Compliance</Typography>
              <Typography variant="caption" sx={{ color: data.sla.slaComplianceRate >= 90 ? C.green : data.sla.slaComplianceRate >= 70 ? C.amber : C.red, fontWeight: 700, fontSize: '0.875rem' }}>
                {data.sla.slaComplianceRate}%
              </Typography>
            </Box>
            <LinearProgress variant="determinate" value={data.sla.slaComplianceRate}
              sx={{ height: 12, borderRadius: 6, bgcolor: 'rgba(224,80,80,0.2)',
                '& .MuiLinearProgress-bar': { borderRadius: 6, bgcolor: data.sla.slaComplianceRate >= 90 ? C.green : data.sla.slaComplianceRate >= 70 ? C.amber : C.red } }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.75 }}>
              <Typography variant="caption" sx={{ color: C.green,  fontSize: '0.5625rem' }}>{data.sla.slaCompliant} within SLA</Typography>
              <Typography variant="caption" sx={{ color: C.red,    fontSize: '0.5625rem' }}>{data.sla.slaBreached} breached</Typography>
            </Box>
          </Paper>

          {/* Avg resolution by priority */}
          <Paper elevation={0} sx={{ p: 2.5 }}>
            <Typography variant="h5" sx={{ color: C.text, fontWeight: 600, mb: 2 }}>Avg Resolution Time by Priority</Typography>
            <Box sx={{ height: 240 }}>
              {resTimeData && (
                <Bar data={resTimeData} options={{
                  ...CHART_DEFAULTS,
                  plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } },
                  scales: {
                    ...CHART_DEFAULTS.scales,
                    y: { ...CHART_DEFAULTS.scales.y, title: { display: true, text: 'Hours', color: C.text3, font: { size: 10 } } },
                  },
                }} />
              )}
            </Box>
          </Paper>

          {/* Tickets per technician */}
          <Paper elevation={0} sx={{ p: 2.5 }}>
            <Typography variant="h5" sx={{ color: C.text, fontWeight: 600, mb: 1.5 }}>Tickets Per Technician</Typography>
            {data.byTechnician.length === 0 ? (
              <Typography variant="body2" sx={{ color: C.text3, fontStyle: 'italic', fontSize: '0.75rem' }}>No assigned tickets in this period.</Typography>
            ) : (
              <Box>
                {/* Table header */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 100px 100px', gap: 1, pb: 0.75, borderBottom: `1px solid ${C.border}` }}>
                  {['Technician','Total','Resolved','Breached','SLA %','Avg Resolution'].map(h => (
                    <Typography key={h} variant="caption" sx={{ color: C.text3, fontSize: '0.5625rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</Typography>
                  ))}
                </Box>
                {data.byTechnician.map(tech => (
                  <Box key={tech.techId} sx={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 100px 100px', gap: 1, py: 1, borderBottom: `1px solid ${C.border}`, '&:last-child': { borderBottom: 'none' } }}>
                    <Typography variant="body2" sx={{ color: C.text, fontSize: '0.75rem', fontWeight: 500 }}>{tech.name}</Typography>
                    <Typography variant="body2" sx={{ color: C.text2, fontFamily: 'monospace', fontSize: '0.75rem' }}>{tech.total}</Typography>
                    <Typography variant="body2" sx={{ color: C.green, fontFamily: 'monospace', fontSize: '0.75rem' }}>{tech.resolved}</Typography>
                    <Typography variant="body2" sx={{ color: tech.breached > 0 ? C.red : C.text3, fontFamily: 'monospace', fontSize: '0.75rem' }}>{tech.breached}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Typography variant="body2" sx={{ color: tech.slaComplianceRate >= 90 ? C.green : tech.slaComplianceRate >= 70 ? C.amber : C.red, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {tech.slaComplianceRate}%
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: C.text2, fontSize: '0.75rem' }}>{tech.avgResolutionFormatted}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Box>
      )}
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: 'volumes',     label: 'Volumes'     },
  { id: 'status',      label: 'Status'      },
  { id: 'categories',  label: 'Categories'  },
  { id: 'performance', label: 'Performance' },
];

const EMPTY_FILTERS = { dateFrom: '', dateTo: '' };

export default function Reports() {
  const [tab,     setTab]     = useState('volumes');
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const handleFilterChange = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  const tabProps = { filters, onFilterChange: handleFilterChange };

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h2" sx={{ color: C.text, fontWeight: 700 }}>Reports & Analytics</Typography>
          <Typography variant="body2" sx={{ color: C.text2, mt: 0.5 }}>
            Management dashboards — volumes, status, categories, performance
          </Typography>
        </Box>
      </Box>

      {/* Tab bar */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, p: 0.75, bgcolor: C.bg3, borderRadius: '8px', border: `1px solid ${C.border}`, width: 'fit-content' }}>
        {TABS.map(t => (
          <TabBtn key={t.id} label={t.label} active={tab === t.id} onClick={() => setTab(t.id)} />
        ))}
      </Box>

      {/* Panel */}
      {tab === 'volumes'     && <VolumePanel      {...tabProps} />}
      {tab === 'status'      && <StatusPanel      {...tabProps} />}
      {tab === 'categories'  && <CategoriesPanel  {...tabProps} />}
      {tab === 'performance' && <PerformancePanel {...tabProps} />}
    </Box>
  );
}
