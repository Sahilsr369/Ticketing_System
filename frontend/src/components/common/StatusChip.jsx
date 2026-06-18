import React from 'react';
import Chip from '@mui/material/Chip';
import { formatStatus, formatPriority, formatCategory, formatRole,
         statusColor, priorityColor, categoryColor } from '../../utils/format';

const chip = (label, color, sx = {}) => (
  <Chip label={label} size="small" sx={{
    bgcolor: `${color}1a`, color, border: `1px solid ${color}40`,
    fontSize: '0.625rem', fontWeight: 600, height: 20, borderRadius: '4px',
    ...sx,
  }} />
);

export const TicketStatusChip = ({ status }) =>
  chip(formatStatus(status), statusColor(status));

export const PriorityChip = ({ priority }) =>
  chip(formatPriority(priority), priorityColor(priority));

export const CategoryChip = ({ category }) =>
  chip(formatCategory(category), categoryColor(category));

export function RoleChip({ role }) {
  const colorMap = {
    SUPER_ADMIN: '#e05050', IT_MANAGER: '#f0a030', IT_TECHNICIAN: '#4f7cff',
    REPORTING_USER: '#9b6fff', STANDARD_USER: '#2ecc8f',
  };
  return chip(formatRole(role), colorMap[role] || '#9399b0');
}
