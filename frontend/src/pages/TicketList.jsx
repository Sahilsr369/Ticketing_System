import React, { useState } from 'react';
import { useNavigate }     from 'react-router-dom';
import Box            from '@mui/material/Box';
import Typography     from '@mui/material/Typography';
import Button         from '@mui/material/Button';
import TextField      from '@mui/material/TextField';
import MenuItem       from '@mui/material/MenuItem';
import Table          from '@mui/material/Table';
import TableHead      from '@mui/material/TableHead';
import TableBody      from '@mui/material/TableBody';
import TableRow       from '@mui/material/TableRow';
import TableCell      from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableSortLabel from '@mui/material/TableSortLabel';
import Paper          from '@mui/material/Paper';
import IconButton     from '@mui/material/IconButton';
import Tooltip        from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert          from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import Pagination     from '@mui/material/Pagination';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SearchIcon     from '@mui/icons-material/Search';
import RefreshIcon    from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import OpenInNewIcon  from '@mui/icons-material/OpenInNew';
import ClearIcon      from '@mui/icons-material/Clear';
import { useTickets }     from '../hooks/useTickets';
import { usePermissions } from '../hooks/usePermissions';
import { useCategories }  from '../hooks/useCategories';
import { formatDateTime, formatTimeAgo, fullName } from '../utils/format';
import { TicketStatusChip, PriorityChip, CategoryChip } from '../components/common/StatusChip';
import TicketFormDialog from '../components/tickets/TicketFormDialog';
import { STATUSES, PRIORITIES } from '../components/tickets/ticketConstants';

const EMPTY_FILTERS = { search: '', status: '', priority: '', categoryId: '' };

export default function TicketList() {
  const navigate   = useNavigate();
  const { can }    = usePermissions();
  const { tickets, total, totalPages, loading, error, filters, refetch, setFilter, setMultiFilter, setPage } = useTickets();
  const { categories } = useCategories();

  const [createOpen,   setCreateOpen]   = useState(false);
  const [showFilters,  setShowFilters]  = useState(false);
  const [localFilters, setLocalFilters] = useState(EMPTY_FILTERS);

  const hasActiveFilters = localFilters.status || localFilters.priority || localFilters.categoryId;

  const handleSearch = (e) => {
    const val = e.target.value;
    setLocalFilters(f => ({ ...f, search: val }));
    setFilter('search', val);
  };

  const handleFilterChange = (key, value) => {
    const next = { ...localFilters, [key]: value };
    setLocalFilters(next);
    setFilter(key, value);
  };

  const clearFilters = () => {
    setLocalFilters(EMPTY_FILTERS);
    setMultiFilter({ search: '', status: '', priority: '', categoryId: '', page: 1 });
  };

  const handleSort = (field) => {
    const isCurrentAsc = filters.sortBy === field && filters.sortDir === 'asc';
    setMultiFilter({ sortBy: field, sortDir: isCurrentAsc ? 'desc' : 'asc' });
  };

  const sortProps = (field) => ({
    active: filters.sortBy === field,
    direction: filters.sortBy === field ? filters.sortDir : 'asc',
    onClick: () => handleSort(field),
  });

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h2" sx={{ color: 'var(--text)', fontWeight: 700 }}>Tickets</Typography>
          <Typography variant="body2" sx={{ color: 'var(--text2)', mt: 0.5 }}>
            {total.toLocaleString()} ticket{total !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={refetch} sx={{ color: 'var(--text2)' }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button variant="outlined" size="small" startIcon={<FilterListIcon />}
            onClick={() => setShowFilters(f => !f)}
            sx={{
              borderColor: hasActiveFilters ? 'var(--accent)' : 'var(--border2)',
              color:       hasActiveFilters ? 'var(--accent)' : 'var(--text2)',
            }}>
            Filters{hasActiveFilters ? ' •' : ''}
          </Button>
          {can('tickets:create') && (
            <Button variant="contained" size="small" startIcon={<AddCircleOutlineIcon />} onClick={() => setCreateOpen(true)}>
              Log Ticket
            </Button>
          )}
        </Box>
      </Box>

      {/* Search */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <TextField placeholder="Search ticket number, title, description…" size="small"
          value={localFilters.search} onChange={handleSearch} sx={{ minWidth: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 15, color: 'var(--text3)' }} />
              </InputAdornment>
            ),
            endAdornment: localFilters.search ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => handleSearch({ target: { value: '' } })} sx={{ color: 'var(--text3)' }}>
                  <ClearIcon sx={{ fontSize: 13 }} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }} />
      </Box>

      {/* Filters panel */}
      {showFilters && (
        <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, flexWrap: 'wrap', p: 2, bgcolor: 'var(--bg3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          {/* Status filter */}
          <TextField select size="small" value={localFilters.status}
            onChange={e => handleFilterChange('status', e.target.value)}
            sx={{ minWidth: 150 }} SelectProps={{ displayEmpty: true }}
            InputProps={{ startAdornment: (
              <InputAdornment position="start">
                <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.6875rem' }}>Status:</Typography>
              </InputAdornment>
            )}}>
            <MenuItem value="" sx={{ fontSize: '0.75rem' }}>All</MenuItem>
            {STATUSES.map(o => <MenuItem key={o.value} value={o.value} sx={{ fontSize: '0.75rem' }}>{o.label}</MenuItem>)}
          </TextField>

          {/* Priority filter */}
          <TextField select size="small" value={localFilters.priority}
            onChange={e => handleFilterChange('priority', e.target.value)}
            sx={{ minWidth: 150 }} SelectProps={{ displayEmpty: true }}
            InputProps={{ startAdornment: (
              <InputAdornment position="start">
                <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.6875rem' }}>Priority:</Typography>
              </InputAdornment>
            )}}>
            <MenuItem value="" sx={{ fontSize: '0.75rem' }}>All</MenuItem>
            {PRIORITIES.map(o => <MenuItem key={o.value} value={o.value} sx={{ fontSize: '0.75rem' }}>{o.label}</MenuItem>)}
          </TextField>

          {/* Category filter — populated from API */}
          <TextField select size="small" value={localFilters.categoryId}
            onChange={e => handleFilterChange('categoryId', e.target.value)}
            sx={{ minWidth: 220 }} SelectProps={{ displayEmpty: true }}
            InputProps={{ startAdornment: (
              <InputAdornment position="start">
                <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.6875rem' }}>Category:</Typography>
              </InputAdornment>
            )}}>
            <MenuItem value="" sx={{ fontSize: '0.75rem' }}>All</MenuItem>
            {categories.map(c => (
              <MenuItem key={c.id} value={c.id} sx={{ fontSize: '0.75rem' }}>{c.name}</MenuItem>
            ))}
          </TextField>

          {hasActiveFilters && (
            <Button size="small" onClick={clearFilters} startIcon={<ClearIcon />}
              sx={{ color: 'var(--text2)', border: '1px solid var(--border2)' }}>
              Clear Filters
            </Button>
          )}
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2, fontSize: '0.75rem' }}>{error}</Alert>}

      {/* Table */}
      <TableContainer component={Paper} elevation={0}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><TableSortLabel {...sortProps('ticketNumber')}>Ticket #</TableSortLabel></TableCell>
              <TableCell>Title</TableCell>
              <TableCell><TableSortLabel {...sortProps('status')}>Status</TableSortLabel></TableCell>
              <TableCell><TableSortLabel {...sortProps('priority')}>Priority</TableSortLabel></TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Assigned To</TableCell>
              <TableCell>Submitted By</TableCell>
              <TableCell><TableSortLabel {...sortProps('createdAt')}>Created</TableSortLabel></TableCell>
              <TableCell><TableSortLabel {...sortProps('updatedAt')}>Updated</TableSortLabel></TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 5 }}>
                  <CircularProgress size={24} sx={{ color: 'var(--accent)' }} />
                </TableCell>
              </TableRow>
            )}
            {!loading && tickets.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 5, color: 'var(--text3)' }}>
                  No tickets found
                  {(hasActiveFilters || localFilters.search) && (
                    <Box component="span"> — <Button size="small" onClick={clearFilters}
                      sx={{ color: 'var(--accent)', fontSize: '0.75rem', p: 0, minWidth: 0, textDecoration: 'underline' }}>
                      clear filters
                    </Button></Box>
                  )}
                </TableCell>
              </TableRow>
            )}
            {!loading && tickets.map(t => (
              <TableRow key={t.id} hover
                onClick={() => navigate(`/tickets/${t.id}`)}
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'var(--bg4)' } }}>
                <TableCell sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--accent)', fontWeight: 600 }}>
                  {t.ticketNumber}
                </TableCell>
                <TableCell sx={{ maxWidth: 280 }}>
                  <Typography variant="body1" sx={{ color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.title}
                  </Typography>
                  {t.subcategory && (
                    <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.625rem' }}>
                      {t.subcategory.name}
                      {t.department ? ` · ${t.department}` : ''}
                      {t.floor ? ` · Floor ${t.floor}` : ''}
                    </Typography>
                  )}
                  {!t.subcategory && t.department && (
                    <Typography variant="caption" sx={{ color: 'var(--text3)', fontSize: '0.625rem' }}>
                      {t.department}{t.floor ? ` · Floor ${t.floor}` : ''}
                    </Typography>
                  )}
                </TableCell>
                <TableCell><TicketStatusChip status={t.status} /></TableCell>
                <TableCell><PriorityChip priority={t.priority} /></TableCell>
                <TableCell><CategoryChip category={t.category} /></TableCell>
                <TableCell sx={{ color: t.assignedTo ? 'var(--text)' : 'var(--text3)', fontSize: '0.75rem' }}>
                  {t.assignedTo ? fullName(t.assignedTo) : <span style={{ fontStyle: 'italic' }}>Unassigned</span>}
                </TableCell>
                <TableCell sx={{ color: 'var(--text2)', fontSize: '0.75rem' }}>
                  {fullName(t.submittedBy)}
                </TableCell>
                <TableCell sx={{ color: 'var(--text2)', fontSize: '0.6875rem', whiteSpace: 'nowrap' }}>
                  <Tooltip title={formatDateTime(t.createdAt)}><span>{formatTimeAgo(t.createdAt)}</span></Tooltip>
                </TableCell>
                <TableCell sx={{ color: 'var(--text2)', fontSize: '0.6875rem', whiteSpace: 'nowrap' }}>
                  <Tooltip title={formatDateTime(t.updatedAt)}><span>{formatTimeAgo(t.updatedAt)}</span></Tooltip>
                </TableCell>
                <TableCell align="right" onClick={e => e.stopPropagation()}>
                  <Tooltip title="Open ticket">
                    <IconButton size="small" onClick={() => navigate(`/tickets/${t.id}`)} sx={{ color: 'var(--text3)' }}>
                      <OpenInNewIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination count={totalPages} page={filters.page} onChange={(_, p) => setPage(p)}
            size="small" shape="rounded"
            sx={{
              '& .MuiPaginationItem-root': { color: 'var(--text2)', fontSize: '0.75rem' },
              '& .Mui-selected':           { bgcolor: 'rgba(79,124,255,0.2) !important', color: 'var(--accent)' },
            }} />
        </Box>
      )}

      <TicketFormDialog open={createOpen} ticket={null} onClose={() => setCreateOpen(false)}
        onSaved={() => { setCreateOpen(false); refetch(); }} />
    </Box>
  );
}
