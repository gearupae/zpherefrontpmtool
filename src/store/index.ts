import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import userSlice from './slices/userSlice';
import projectSlice from './slices/projectSlice';
import taskSlice from './slices/taskSlice';
import dashboardSlice from './slices/dashboardSlice';
import teamSlice from './slices/teamSlice';
import uiSlice from './slices/uiSlice';
import notificationSlice from './slices/notificationSlice';
import rbacSlice from './slices/rbacSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    user: userSlice,
    projects: projectSlice,
    tasks: taskSlice,
    dashboard: dashboardSlice,
    team: teamSlice,
    ui: uiSlice,
    notifications: notificationSlice,
    rbac: rbacSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
