import React, { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { MODULES } from '../../utils/permissions';
import { Role, Permission, ModuleName } from '../../types';
import { fetchRoles, createRole, updateRole, deleteRole, fetchRolePermissions, updateRolePermissions } from '../../store/slices/rbacSlice';
import { addNotification } from '../../store/slices/notificationSlice';
import { PlusIcon, TrashIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

const emptyRole = { name: '', description: '' };

const RolesPermissionsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { roles, rolePermissions } = useAppSelector((s) => s.rbac as any);
  const [isCreating, setIsCreating] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form, setForm] = useState<{ name: string; description?: string }>(emptyRole);

  // Permissions matrix state for current role
  const [matrix, setMatrix] = useState<Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }>>({});
  const currentPermissions = useMemo(() => (editingRole ? rolePermissions[editingRole.id] || [] : []), [editingRole, rolePermissions]);

  useEffect(() => {
    dispatch(fetchRoles());
  }, [dispatch]);

  useEffect(() => {
    if (editingRole) {
      dispatch(fetchRolePermissions(editingRole.id));
    }
  }, [dispatch, editingRole?.id]);

  useEffect(() => {
    if (!editingRole) return;
    // Initialize matrix from fetched permissions
    const initial: Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }> = {};
    MODULES.forEach((m) => {
      const p = (currentPermissions as Permission[]).find((pp: Permission) => pp.module.toLowerCase() === m.toLowerCase());
      initial[m] = {
        view: !!p?.can_view,
        create: !!p?.can_create,
        edit: !!p?.can_edit,
        delete: !!p?.can_delete,
      };
    });
    setMatrix(initial);
  }, [editingRole, currentPermissions]);

  const startCreate = () => {
    setIsCreating(true);
    setEditingRole(null);
    setForm(emptyRole);
  };

  const cancelCreate = () => {
    setIsCreating(false);
    setForm(emptyRole);
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const role = await dispatch(createRole({ name: form.name.trim(), description: form.description?.trim() })).unwrap();
      dispatch(addNotification({ type: 'success', title: 'Role Created', message: `${role.name} created.`, duration: 3000 }));
      setIsCreating(false);
      setForm(emptyRole);
      // Immediately switch to editing permissions of the new role
      setEditingRole(role);
    } catch (err: any) {
      dispatch(addNotification({ type: 'error', title: 'Create Failed', message: err || 'Could not create role', duration: 5000 }));
    }
  };

  const submitUpdateRoleMeta = async () => {
    if (!editingRole) return;
    try {
      const updated = await dispatch(updateRole({ id: editingRole.id, data: { name: editingRole.name, description: editingRole.description } })).unwrap();
      setEditingRole(updated);
      dispatch(addNotification({ type: 'success', title: 'Role Updated', message: 'Role details saved.', duration: 3000 }));
    } catch (err: any) {
      dispatch(addNotification({ type: 'error', title: 'Update Failed', message: err || 'Could not update role', duration: 5000 }));
    }
  };

  const removeRole = async (roleId: string) => {
    if (!window.confirm('Delete this role? This cannot be undone.')) return;
    try {
      await dispatch(deleteRole(roleId)).unwrap();
      dispatch(addNotification({ type: 'success', title: 'Role Deleted', message: 'Role removed successfully.', duration: 3000 }));
      if (editingRole?.id === roleId) setEditingRole(null);
    } catch (err: any) {
      dispatch(addNotification({ type: 'error', title: 'Delete Failed', message: err || 'Could not delete role', duration: 5000 }));
    }
  };

  const toggleCell = (mod: ModuleName, key: 'view' | 'create' | 'edit' | 'delete') => {
    setMatrix((prev) => ({
      ...prev,
      [mod]: {
        ...prev[mod],
        [key]: !prev[mod]?.[key],
      },
    }));
  };

  const savePermissions = async () => {
    if (!editingRole) return;
    try {
      const permissions: Permission[] = MODULES.map((mod) => ({
        role_id: editingRole.id,
        module: mod,
        can_view: !!matrix[mod]?.view,
        can_create: !!matrix[mod]?.create,
        can_edit: !!matrix[mod]?.edit,
        can_delete: !!matrix[mod]?.delete,
      }));
      await dispatch(updateRolePermissions({ roleId: editingRole.id, permissions })).unwrap();
      dispatch(addNotification({ type: 'success', title: 'Permissions Saved', message: 'Permissions updated successfully.', duration: 3000 }));
    } catch (err: any) {
      dispatch(addNotification({ type: 'error', title: 'Save Failed', message: err || 'Could not save permissions', duration: 5000 }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-secondary-900">Roles & Permissions</h2>
          <p className="text-sm text-secondary-500">Create custom roles and set granular permissions per module</p>
        </div>
        <button
          onClick={startCreate}
          className="inline-flex items-center gap-2.5 text-sm rounded-md bg-black text-white hover:bg-gray-800"
        >
          <PlusIcon className="w-4 h-4" />
          New Role
        </button>
      </div>

      {/* Create Role Form */}
      {isCreating && (
        <div className="bg-white shadow rounded-lg p-4">
          <form onSubmit={submitCreate} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-sm font-medium text-secondary-700">Role Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                className="mt-1 w-full py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., Project Manager"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-secondary-700">Description</label>
              <input
                type="text"
                value={form.description || ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="mt-1 w-full py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Short description of the role"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="inline-flex items-center gap-2.5 text-sm rounded-md bg-black text-white hover:bg-gray-800">
                <CheckIcon className="w-4 h-4" /> Save
              </button>
              <button type="button" onClick={cancelCreate} className="inline-flex items-center gap-2.5 text-sm rounded-md bg-gray-100 text-black hover:bg-gray-200">
                <XMarkIcon className="w-4 h-4" /> Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Roles List */}
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="text-md font-medium text-secondary-900 mb-3">Existing Roles</h3>
          <ul className="divide-y divide-secondary-200">
            {roles.map((r: Role) => (
              <li key={r.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-medium text-secondary-900">{r.name}</div>
                  {r.description && <div className="text-xs text-secondary-500">{r.description}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="p-2 rounded-md bg-gray-100 text-black hover:bg-gray-200"
                    title="Edit"
                    onClick={() => setEditingRole(r)}
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    className="p-2 rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                    title="Delete"
                    onClick={() => removeRole(r.id)}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
            {roles.length === 0 && (
              <li className="text-sm text-secondary-500">No roles yet.</li>
            )}
          </ul>
        </div>

        {/* Permissions Editor */}
        <div className="lg:col-span-2 bg-white shadow rounded-lg p-4">
          {!editingRole ? (
            <div className="text-secondary-500 text-sm">Select a role to edit its permissions.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <label className="block text-sm font-medium text-secondary-700">Role Name</label>
                  <input
                    type="text"
                    value={editingRole.name}
                    onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                    className="mt-1 w-full py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                  <label className="block text-sm font-medium text-secondary-700 mt-3">Description</label>
                  <input
                    type="text"
                    value={editingRole.description || ''}
                    onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                    className="mt-1 w-full py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={submitUpdateRoleMeta} className="inline-flex items-center gap-2.5 text-sm rounded-md bg-black text-white hover:bg-gray-800">
                    <CheckIcon className="w-4 h-4" /> Save Role
                  </button>
                  <button onClick={savePermissions} className="inline-flex items-center gap-2.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700">
                    <CheckIcon className="w-4 h-4" /> Save Permissions
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border rounded-md">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-2 text-left font-semibold">Module</th>
                      <th className="py-2 text-center font-semibold">View</th>
                      <th className="py-2 text-center font-semibold">Create</th>
                      <th className="py-2 text-center font-semibold">Edit</th>
                      <th className="py-2 text-center font-semibold">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MODULES.map((mod) => (
                      <tr key={mod} className="border-t">
                        <td className="py-2">{mod}</td>
                        {(['view', 'create', 'edit', 'delete'] as const).map((k) => (
                          <td key={k} className="py-2 text-center">
                            <input
                              type="checkbox"
                              checked={!!matrix[mod]?.[k]}
                              onChange={() => toggleCell(mod, k)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RolesPermissionsPage;
