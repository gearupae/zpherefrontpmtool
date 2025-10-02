import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../api/client';
import { detectTenantContext } from '../../utils/tenantUtils';
import { Project } from '../../types';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ProjectState = {
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchProjects = createAsyncThunk(
  'projects/fetchProjects',
  async (params: { q?: string; from_date?: string; to_date?: string } | undefined, { rejectWithValue }) => {
    try {
      // Always use tenant projects endpoint; backend does not expose /admin/projects
      const searchParams = new URLSearchParams();
      if (params?.q && params.q.trim()) searchParams.set('q', params.q.trim());
      if (params?.from_date) searchParams.set('from_date', params.from_date);
      if (params?.to_date) searchParams.set('to_date', params.to_date);
      const url = searchParams.toString() ? `/projects/?${searchParams.toString()}` : '/projects/';
      const response = await apiClient.get(url);
      return response.data;
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail;
      let errorMessage = 'Failed to fetch projects';
      
      if (errorDetail) {
        if (typeof errorDetail === 'string') {
          errorMessage = errorDetail;
        } else if (Array.isArray(errorDetail)) {
          errorMessage = errorDetail.map((err: any) => err.msg || err.message || 'Validation error').join(', ');
        }
      }
      
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchProject = createAsyncThunk(
  'projects/fetchProject',
  async (projectId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/projects/${projectId}`);
      return response.data;
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail;
      let errorMessage = 'Failed to fetch project';
      
      if (errorDetail) {
        if (typeof errorDetail === 'string') {
          errorMessage = errorDetail;
        } else if (Array.isArray(errorDetail)) {
          errorMessage = errorDetail.map((err: any) => err.msg || err.message || 'Validation error').join(', ');
        }
      }
      
      return rejectWithValue(errorMessage);
    }
  }
);

export const createProject = createAsyncThunk(
  'projects/createProject',
  async (projectData: Partial<Project>, { rejectWithValue }) => {
    try {
      // Always use tenant projects endpoint
      const response = await apiClient.post('/projects/', projectData);
      return response.data;
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail;
      let errorMessage = 'Failed to create project';
      
      if (errorDetail) {
        if (typeof errorDetail === 'string') {
          errorMessage = errorDetail;
        } else if (Array.isArray(errorDetail)) {
          errorMessage = errorDetail.map((err: any) => err.msg || err.message || 'Validation error').join(', ');
        }
      }
      
      return rejectWithValue(errorMessage);
    }
  }
);

export const updateProject = createAsyncThunk(
  'projects/updateProject',
  async ({ id, data }: { id: string; data: Partial<Project> }, { rejectWithValue }) => {
    try {
      // Always use tenant projects endpoint
      const response = await apiClient.put(`/projects/${id}`, data);
      return response.data;
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail;
      let errorMessage = 'Failed to update project';
      
      if (errorDetail) {
        if (typeof errorDetail === 'string') {
          errorMessage = errorDetail;
        } else if (Array.isArray(errorDetail)) {
          errorMessage = errorDetail.map((err: any) => err.msg || err.message || 'Validation error').join(', ');
        }
      }
      
      return rejectWithValue(errorMessage);
    }
  }
);

export const deleteProject = createAsyncThunk(
  'projects/deleteProject',
  async (projectId: string, { rejectWithValue }) => {
    try {
      // Always use tenant projects endpoint
      await apiClient.delete(`/projects/${projectId}`);
      return projectId;
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail;
      let errorMessage = 'Failed to delete project';
      
      if (errorDetail) {
        if (typeof errorDetail === 'string') {
          errorMessage = errorDetail;
        } else if (Array.isArray(errorDetail)) {
          errorMessage = errorDetail.map((err: any) => err.msg || err.message || 'Validation error').join(', ');
        }
      }
      
      return rejectWithValue(errorMessage);
    }
  }
);

const projectSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentProject: (state, action) => {
      state.currentProject = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch projects
      .addCase(fetchProjects.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.isLoading = false;
        state.projects = action.payload;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch single project
      .addCase(fetchProject.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProject.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentProject = action.payload;
      })
      .addCase(fetchProject.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Create project
      .addCase(createProject.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.isLoading = false;
        state.projects.push(action.payload);
      })
      .addCase(createProject.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Update project
      .addCase(updateProject.pending, (state) => {
        // Avoid global loading spinner during inline updates
        state.error = null;
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        const index = state.projects.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.projects[index] = action.payload;
        }
        if (state.currentProject?.id === action.payload.id) {
          state.currentProject = action.payload;
        }
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Delete project
      .addCase(deleteProject.pending, (state) => {
        state.error = null;
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.projects = state.projects.filter(p => p.id !== action.payload);
        if (state.currentProject?.id === action.payload) {
          state.currentProject = null;
        }
      })
      .addCase(deleteProject.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setCurrentProject } = projectSlice.actions;
export default projectSlice.reducer;
