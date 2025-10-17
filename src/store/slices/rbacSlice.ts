import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import apiClient from '../../api/client';
import { Role, Permission } from '../../types';

interface RbacState {
  roles: Role[];
  rolePermissions: Record<string, Permission[]>; // roleId -> permissions
  userPermissions: Permission[] | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: RbacState = {
  roles: [],
  rolePermissions: {},
  userPermissions: null,
  isLoading: false,
  error: null,
};

// Roles
export const fetchRoles = createAsyncThunk('rbac/fetchRoles', async (_, { rejectWithValue }) => {
  try {
    const res = await apiClient.get('/roles/');
    return res.data as Role[];
  } catch (error: any) {
    const msg = error?.response?.data?.detail || 'Failed to fetch roles';
    return rejectWithValue(msg);
  }
});

export const createRole = createAsyncThunk('rbac/createRole', async (payload: { name: string; description?: string }, { rejectWithValue }) => {
  try {
    const res = await apiClient.post('/roles/', payload);
    return res.data as Role;
  } catch (error: any) {
    const msg = error?.response?.data?.detail || 'Failed to create role';
    return rejectWithValue(msg);
  }
});

export const updateRole = createAsyncThunk('rbac/updateRole', async ({ id, data }: { id: string; data: Partial<Role> }, { rejectWithValue }) => {
  try {
    const res = await apiClient.put(`/roles/${id}/`, data);
    return res.data as Role;
  } catch (error: any) {
    const msg = error?.response?.data?.detail || 'Failed to update role';
    return rejectWithValue(msg);
  }
});

export const deleteRole = createAsyncThunk('rbac/deleteRole', async (id: string, { rejectWithValue }) => {
  try {
    await apiClient.delete(`/roles/${id}/`);
    return id;
  } catch (error: any) {
    const msg = error?.response?.data?.detail || 'Failed to delete role';
    return rejectWithValue(msg);
  }
});

// Role permissions
export const fetchRolePermissions = createAsyncThunk('rbac/fetchRolePermissions', async (roleId: string, { rejectWithValue }) => {
  try {
    const res = await apiClient.get(`/roles/${roleId}/permissions/`);
    return { roleId, permissions: (res.data || []) as Permission[] };
  } catch (error: any) {
    const msg = error?.response?.data?.detail || 'Failed to fetch role permissions';
    return rejectWithValue(msg);
  }
});

export const updateRolePermissions = createAsyncThunk(
  'rbac/updateRolePermissions',
  async ({ roleId, permissions }: { roleId: string; permissions: Permission[] }, { rejectWithValue }) => {
    try {
      const res = await apiClient.put(`/roles/${roleId}/permissions/`, { permissions });
      return { roleId, permissions: (res.data || []) as Permission[] };
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to update role permissions';
      return rejectWithValue(msg);
    }
  }
);

// User role assignment
export const assignUserRole = createAsyncThunk(
  'rbac/assignUserRole',
  async (
    { userId, roleId }: { userId: string; roleId: string | null },
    { rejectWithValue, dispatch, getState }
  ) => {
    try {
      const res = await apiClient.put(`/users/${userId}/role`, { role_id: roleId });
      // If we updated the currently logged-in user's role, refresh their effective permissions
      try {
        const state: any = getState();
        const currentUserId = state?.auth?.user?.id;
        if (currentUserId && currentUserId === userId) {
          await dispatch(fetchUserPermissions(userId));
        }
      } catch {}
      return res.data; // expected to be updated user
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to assign user role';
      return rejectWithValue(msg);
    }
  }
);

// User permissions
export const fetchUserPermissions = createAsyncThunk(
  'rbac/fetchUserPermissions',
  async (userId: string, { rejectWithValue }) => {
    try {
      const res = await apiClient.get(`/users/${userId}/permissions`);
      return (res.data || []) as Permission[];
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to fetch user permissions';
      return rejectWithValue(msg);
    }
  }
);

const rbacSlice = createSlice({
  name: 'rbac',
  initialState,
  reducers: {
    clearRbacError: (state) => {
      state.error = null;
    },
    setUserPermissions: (state, action: PayloadAction<Permission[] | null>) => {
      state.userPermissions = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRoles.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRoles.fulfilled, (state, action) => {
        state.isLoading = false;
        state.roles = action.payload;
      })
      .addCase(fetchRoles.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createRole.fulfilled, (state, action) => {
        state.roles.push(action.payload);
      })
      .addCase(updateRole.fulfilled, (state, action) => {
        const idx = state.roles.findIndex((r) => r.id === action.payload.id);
        if (idx !== -1) state.roles[idx] = action.payload;
      })
      .addCase(deleteRole.fulfilled, (state, action) => {
        state.roles = state.roles.filter((r) => r.id !== action.payload);
        delete state.rolePermissions[action.payload];
      })
      .addCase(fetchRolePermissions.fulfilled, (state, action) => {
        const { roleId, permissions } = action.payload as { roleId: string; permissions: Permission[] };
        state.rolePermissions[roleId] = permissions;
      })
      .addCase(updateRolePermissions.fulfilled, (state, action) => {
        const { roleId, permissions } = action.payload as { roleId: string; permissions: Permission[] };
        state.rolePermissions[roleId] = permissions;
      })
      .addCase(fetchUserPermissions.fulfilled, (state, action) => {
        state.userPermissions = action.payload;
      })
      .addCase(fetchUserPermissions.rejected, (state, action) => {
        state.error = action.payload as string;
        state.userPermissions = [];
      });
  },
});

export const { clearRbacError, setUserPermissions } = rbacSlice.actions;
export default rbacSlice.reducer;
