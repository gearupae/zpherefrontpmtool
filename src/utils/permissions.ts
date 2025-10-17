import { useAppSelector } from '../hooks/redux';
import { Permission, ModuleName, PermissionAction } from '../types';

export const MODULES: ModuleName[] = [
  'Projects',
  'Teams',
  'Tasks',
  'Goals',
  'Customers',
  'Purchases',
  'Vendors',
  'Proposals',
  'Settings',
  'Invoices',
  'AI',
  'Knowledge Base',
  'Analytics',
];

export function hasPermissionRaw(
  userRole: string | undefined,
  userPermissions: Permission[] | null | undefined,
  module: ModuleName | string,
  action: PermissionAction
): boolean {
  // Platform Admin: allow all
  if ((userRole || '').toUpperCase() === 'ADMIN') return true;

  // Heuristic defaults when permissions are not loaded or empty
  const permsMissing = !userPermissions || userPermissions.length === 0;
  if (permsMissing) {
    const role = (userRole || '').toUpperCase();
    // Manager: broad CRUD on core modules
    if (role === 'MANAGER') {
      const crudModules = new Set([
        'Projects','Teams','Tasks','Goals','Customers','Purchases','Vendors','Proposals','Invoices'
      ]);
      if (crudModules.has(module.toString())) return true; // allow all actions
      if (module.toString() === 'Settings') return action === 'view';
      return action === 'view';
    }
    // Member: can create/edit tasks by default; others view-only
    if (role === 'MEMBER') {
      if (module.toString() === 'Tasks') return action === 'view' || action === 'create' || action === 'edit';
      return action === 'view';
    }
    // Client or unknown: view-only
    return action === 'view';
  }

  const perm = userPermissions.find((p) => String(p.module).toLowerCase() === String(module).toLowerCase());
  if (!perm) return action === 'view'; // if no explicit permission row, allow view by default

  switch (action) {
    case 'view':
      return !!perm.can_view;
    case 'create':
      return !!perm.can_create;
    case 'edit':
      return !!perm.can_edit;
    case 'delete':
      return !!perm.can_delete;
    default:
      return false;
  }
}

export function useHasPermission() {
  const user = useAppSelector((s) => s.auth.user);
  const userPermissions = useAppSelector((s) => s.rbac.userPermissions);
  return (module: ModuleName | string, action: PermissionAction) =>
    hasPermissionRaw(user?.role, userPermissions ?? undefined, module, action);
}

export const hasPermission = (
  module: ModuleName | string,
  action: PermissionAction,
  state: any
) => {
  const userRole = state?.auth?.user?.role;
  const perms = state?.rbac?.userPermissions as Permission[] | null | undefined;
  return hasPermissionRaw(userRole, perms, module, action);
};
