// Phase 3: Categories and subcategories are now loaded from the API via useCategories().
// The CATEGORIES and SUBCATEGORIES constants below are retained only as a display
// fallback for tickets that have no categoryId (e.g. legacy records).

export const STATUSES = [
  { value: 'LOGGED',   label: 'Logged'   },
  { value: 'OPEN',     label: 'Open'     },
  { value: 'PENDING',  label: 'Pending'  },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED',   label: 'Closed'   },
];

export const PRIORITIES = [
  { value: 'LOW',      label: 'Low'      },
  { value: 'MEDIUM',   label: 'Medium'   },
  { value: 'HIGH',     label: 'High'     },
  { value: 'CRITICAL', label: 'Critical' },
];

export const DEPARTMENTS = [
  'Finance','HR','IT','Legal','Marketing','Operations',
  'Sales','Executive','Customer Service','Logistics','Other',
];

export const FLOORS = ['G','1','2','3','4','5','6','7','8','9','10','Other'];
