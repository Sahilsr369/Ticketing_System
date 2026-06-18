import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';

const safeParseISO = (d) => { try { const p = parseISO(d); return isValid(p) ? p : null; } catch { return null; } };

export const formatDate      = (d) => { const p = safeParseISO(d); return p ? format(p, 'dd MMM yyyy') : '—'; };
export const formatDateTime  = (d) => { const p = safeParseISO(d); return p ? format(p, 'dd MMM yyyy HH:mm') : '—'; };
export const formatTimeAgo   = (d) => { const p = safeParseISO(d); return p ? formatDistanceToNow(p, { addSuffix: true }) : '—'; };
export const formatTime      = (d) => { const p = safeParseISO(d); return p ? format(p, 'HH:mm:ss') : '—'; };
export const formatDateInput = (d) => { const p = safeParseISO(d); return p ? format(p, "yyyy-MM-dd'T'HH:mm") : ''; };

export const formatRole = (r) => ({
  SUPER_ADMIN: 'Super Admin', IT_MANAGER: 'IT Manager', IT_TECHNICIAN: 'IT Technician',
  REPORTING_USER: 'Reporting User', STANDARD_USER: 'Standard User',
}[r] || r || '—');

export const formatStatus = (s) => ({
  LOGGED: 'Logged', OPEN: 'Open', PENDING: 'Pending', RESOLVED: 'Resolved', CLOSED: 'Closed',
}[s] || s || '—');

export const formatPriority = (p) => ({
  LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical',
}[p] || p || '—');

// Phase 3: category is now { id, name, slug } | null  (not a string enum)
export const formatCategory = (c) => {
  if (!c) return '—';
  if (typeof c === 'object') return c.name || '—';
  // Legacy fallback for any string enum value still in the DB
  return c;
};

export const formatSubcategory = (s) => {
  if (!s) return null;
  if (typeof s === 'object') return s.name || null;
  return s;
};

export const statusColor = (s) => ({
  LOGGED:   '#9b6fff',
  OPEN:     '#4f7cff',
  PENDING:  '#f0a030',
  RESOLVED: '#2ecc8f',
  CLOSED:   '#5a6080',
}[s] || '#9399b0');

export const priorityColor = (p) => ({
  LOW: '#2ecc8f', MEDIUM: '#4f7cff', HIGH: '#f0a030', CRITICAL: '#e05050',
}[p] || '#9399b0');

// Phase 3: category is an object — use a consistent accent colour since we can't
// enumerate all 14 categories with hardcoded colours. Slug-based hashing keeps
// colours stable without a lookup table.
export const categoryColor = (c) => {
  if (!c) return '#9399b0';
  const slug = typeof c === 'object' ? (c.slug || '') : c;
  const palette = [
    '#4f7cff', '#9b6fff', '#20d4d4', '#f0a030',
    '#2ecc8f', '#6b95ff', '#e05050', '#f0a030',
    '#20d4d4', '#9b6fff', '#4f7cff', '#2ecc8f',
    '#e05050', '#6b95ff',
  ];
  // Deterministic index from slug characters
  const idx = slug.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % palette.length;
  return palette[idx];
};

export const fullName = (user) =>
  user ? `${user.firstName} ${user.lastName}`.trim() : '—';
