import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../api/client';
import { DashboardStats, ActivityItem } from '../../types';

interface DashboardState {
  stats: DashboardStats | null;
  recentActivity: ActivityItem[];
  isLoading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  stats: null,
  recentActivity: [],
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchDashboardStats = createAsyncThunk(
  'dashboard/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      // For now, we'll calculate stats from existing data
      // Later we can add dedicated dashboard endpoints
      const [projectsResponse, tasksResponse] = await Promise.all([
        apiClient.get('/projects/'),
        apiClient.get('/tasks/'),
      ]);
      
      const projects = projectsResponse.data;
      const tasks = tasksResponse.data;
      
      // Calculate stats
      const activeProjects = projects.filter((p: any) => p.status === 'active' && !p.is_archived).length;
      const completedProjects = projects.filter((p: any) => p.status === 'completed').length;
      const totalTasks = tasks.filter((t: any) => !t.is_archived).length;
      const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;
      const overdueTasks = tasks.filter((t: any) => {
        if (!t.due_date || t.status === 'completed') return false;
        return new Date(t.due_date) < new Date();
      }).length;
      
      const stats: DashboardStats = {
        total_projects: projects.length,
        active_projects: activeProjects,
        completed_projects: completedProjects,
        overdue_tasks: overdueTasks,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        team_members: 1, // For now, just the current user
        recent_activity: []
      };
      
      return stats;
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail;
      let errorMessage = 'Failed to fetch dashboard stats';
      
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

export const fetchRecentActivity = createAsyncThunk(
  'dashboard/fetchActivity',
  async (_, { rejectWithValue }) => {
    try {
      // For now, we'll create mock activity based on recent changes
      // Later we can add a dedicated activity endpoint
      const [projectsResponse, tasksResponse] = await Promise.all([
        apiClient.get('/projects/'),
        apiClient.get('/tasks/'),
      ]);
      
      const projects = projectsResponse.data;
      const tasks = tasksResponse.data;
      
      // Create activity items from recent data
      const activity: ActivityItem[] = [];
      
      // Add recent project activities
      projects.slice(0, 3).forEach((project: any) => {
        activity.push({
          id: `project-${project.id}`,
          type: 'project_created',
          title: `Project "${project.name}" created`,
          description: `New project started with ${project.status} status`,
          user_name: 'You',
          created_at: project.created_at
        });
      });
      
      // Add recent task activities
      tasks.slice(0, 3).forEach((task: any) => {
        activity.push({
          id: `task-${task.id}`,
          type: 'task_created',
          title: `Task "${task.title}" created`,
          description: `New task added with ${task.priority} priority`,
          user_name: 'You',
          created_at: task.created_at
        });
      });
      
      // Sort by creation date
      activity.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      return activity.slice(0, 5); // Return top 5 activities
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail;
      let errorMessage = 'Failed to fetch recent activity';
      
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

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch dashboard stats
      .addCase(fetchDashboardStats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stats = action.payload;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch recent activity
      .addCase(fetchRecentActivity.pending, (state) => {
        state.isLoading = false;
      })
      .addCase(fetchRecentActivity.fulfilled, (state, action) => {
        state.recentActivity = action.payload;
      })
      .addCase(fetchRecentActivity.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = dashboardSlice.actions;
export default dashboardSlice.reducer;
