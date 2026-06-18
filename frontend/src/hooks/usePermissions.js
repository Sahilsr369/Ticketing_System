import { useAuth } from '../context/AuthContext';

const ROLE_PERMISSIONS = {
  SUPER_ADMIN: ['*'],
  IT_MANAGER: [
    'tickets:view_all','tickets:create','tickets:edit_all','tickets:delete',
    'tickets:assign','users:view','users:create','users:edit','users:deactivate',
    'reports:view','reports:export','comments:internal',
  ],
  IT_TECHNICIAN: [
    'tickets:view_assigned','tickets:create','tickets:edit_assigned',
    'tickets:assign','comments:internal','reports:view',
  ],
  REPORTING_USER: ['tickets:view_all','reports:view','reports:export'],
  STANDARD_USER:  ['tickets:create','tickets:view_own'],
};

export function usePermissions() {
  const { user } = useAuth();

  const can = (permission) => {
    if (!user) return false;
    const perms = ROLE_PERMISSIONS[user.role] || [];
    return perms.includes('*') || perms.includes(permission);
  };

  const canAny = (...permissions) => permissions.some(can);
  const canAll = (...permissions) => permissions.every(can);
  const isRole = (...roles) => roles.includes(user?.role);

  return { can, canAny, canAll, isRole, role: user?.role };
}
