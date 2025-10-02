import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../api/client';
import { TeamMember, ProjectMemberResponse, ProjectMemberCreate, ProjectMemberUpdate } from '../../types';

interface TeamState {
  teamMembers: TeamMember[];
  projectMembers: Record<string, ProjectMemberResponse[]>;
  isLoading: boolean;
  error: string | null;
}

const initialState: TeamState = {
  teamMembers: [],
  projectMembers: {},
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchTeamMembers = createAsyncThunk(
  'team/fetchTeamMembers',
  async (_, { rejectWithValue }) => {
    try {
      console.log('fetchTeamMembers: Making API call to /teams/members');
      const response = await apiClient.get('/teams/members');
      console.log('fetchTeamMembers: API response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('fetchTeamMembers: API error:', error);
      const errorDetail = error.response?.data?.detail;
      let errorMessage = 'Failed to fetch team members';
      
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

export const createTeamMember = createAsyncThunk(
  'team/createTeamMember',
  async (memberData: Partial<TeamMember>, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/teams/members', memberData);
      return response.data;
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail;
      let errorMessage = 'Failed to create team member';
      
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

export const fetchProjectMembers = createAsyncThunk(
  'team/fetchProjectMembers',
  async (projectId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/teams/projects/${projectId}/members`);
      return { projectId, members: response.data };
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail;
      let errorMessage = 'Failed to fetch project members';
      
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

export const addProjectMember = createAsyncThunk(
  'team/addProjectMember',
  async ({ projectId, memberData }: { projectId: string; memberData: ProjectMemberCreate }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(`/teams/projects/${projectId}/members`, memberData);
      return { projectId, member: response.data };
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail;
      let errorMessage = 'Failed to add project member';
      
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

export const updateProjectMember = createAsyncThunk(
  'team/updateProjectMember',
  async ({ projectId, memberId, memberData }: { projectId: string; memberId: string; memberData: ProjectMemberUpdate }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/teams/projects/${projectId}/members/${memberId}`, memberData);
      return { projectId, member: response.data };
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail;
      let errorMessage = 'Failed to update project member';
      
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

export const removeProjectMember = createAsyncThunk(
  'team/removeProjectMember',
  async ({ projectId, memberId }: { projectId: string; memberId: string }, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/teams/projects/${projectId}/members/${memberId}`);
      return { projectId, memberId };
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail;
      let errorMessage = 'Failed to remove project member';
      
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

const teamSlice = createSlice({
  name: 'team',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearProjectMembers: (state, action) => {
      const projectId = action.payload;
      delete state.projectMembers[projectId];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch team members
      .addCase(fetchTeamMembers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTeamMembers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.teamMembers = action.payload;
      })
      .addCase(fetchTeamMembers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Create team member
      .addCase(createTeamMember.fulfilled, (state, action) => {
        state.teamMembers.push(action.payload);
      })
      .addCase(createTeamMember.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Fetch project members
      .addCase(fetchProjectMembers.fulfilled, (state, action) => {
        const { projectId, members } = action.payload;
        state.projectMembers[projectId] = members;
      })
      .addCase(fetchProjectMembers.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Add project member
      .addCase(addProjectMember.fulfilled, (state, action) => {
        const { projectId, member } = action.payload;
        if (!state.projectMembers[projectId]) {
          state.projectMembers[projectId] = [];
        }
        state.projectMembers[projectId].push(member);
      })
      .addCase(addProjectMember.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Update project member
      .addCase(updateProjectMember.fulfilled, (state, action) => {
        const { projectId, member } = action.payload;
        if (state.projectMembers[projectId]) {
          const index = state.projectMembers[projectId].findIndex(m => m.id === member.id);
          if (index !== -1) {
            state.projectMembers[projectId][index] = member;
          }
        }
      })
      .addCase(updateProjectMember.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Remove project member
      .addCase(removeProjectMember.fulfilled, (state, action) => {
        const { projectId, memberId } = action.payload;
        if (state.projectMembers[projectId]) {
          state.projectMembers[projectId] = state.projectMembers[projectId].filter(
            m => m.id !== memberId
          );
        }
      })
      .addCase(removeProjectMember.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearProjectMembers } = teamSlice.actions;
export default teamSlice.reducer;
