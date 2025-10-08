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
  if (userRole === 'ADMIN') return true;

  // If permissions not loaded yet
  if (!userPermissions) {
    // Optimistic: allow viewing while loading, block mutating actions
    return action === 'view';
  }

  const perm = userPermissions.find((p) => p.module.toLowerCase() === module.toLowerCase());
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
