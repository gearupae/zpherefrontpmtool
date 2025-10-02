import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../api/client';
import { Task } from '../../types';

interface TaskState {
  tasks: Task[];
  currentTask: Task | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: TaskState = {
  tasks: [],
  currentTask: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async (projectId: string | undefined, { rejectWithValue }) => {
    try {
      const url = projectId ? `/tasks/?project_id=${projectId}` : '/tasks/';
      const response = await apiClient.get(url);
      return response.data;
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail;
      let errorMessage = 'Failed to fetch tasks';
      
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

export const fetchTask = createAsyncThunk(
  'tasks/fetchTask',
  async (taskId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/tasks/${taskId}`);
      return response.data;
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail;
      let errorMessage = 'Failed to fetch task';
      
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

export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (taskData: Partial<Task>, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/tasks/', taskData);
      return response.data;
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail;
      let errorMessage = 'Failed to create task';
      
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

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async ({ id, data }: { id: string; data: Partial<Task> }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/tasks/${id}`, data);
      return response.data;
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail;
      let errorMessage = 'Failed to update task';
      
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

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async (taskId: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/tasks/${taskId}`);
      return taskId;
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail;
      let errorMessage = 'Failed to delete task';
      
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

const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentTask: (state, action) => {
      state.currentTask = action.payload;
    },
    updateTaskStatus: (state, action) => {
      const { taskId, status } = action.payload;
      const task = state.tasks.find(t => t.id === taskId);
      if (task) {
        task.status = status;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch tasks
      .addCase(fetchTasks.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tasks = action.payload;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch single task
      .addCase(fetchTask.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTask.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentTask = action.payload;
      })
      .addCase(fetchTask.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Create task
      .addCase(createTask.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tasks.push(action.payload);
      })
      .addCase(createTask.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Update task
      .addCase(updateTask.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.tasks.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
        if (state.currentTask?.id === action.payload.id) {
          state.currentTask = action.payload;
        }
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Delete task
      .addCase(deleteTask.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tasks = state.tasks.filter(t => t.id !== action.payload);
        if (state.currentTask?.id === action.payload) {
          state.currentTask = null;
        }
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setCurrentTask, updateTaskStatus } = taskSlice.actions;
export default taskSlice.reducer;
