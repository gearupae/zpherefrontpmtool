import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { useAppDispatch, useAppSelector } from './hooks/redux';
import { getCurrentUser } from './store/slices/authSlice';
import { fetchUserPermissions } from './store/slices/rbacSlice';
import { detectTenantContext, redirectToAppropriateContext } from './utils/tenantUtils';
import { applyTheme } from './utils/theme';

// Components
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import NotificationContainer from './components/UI/NotificationContainer';

// Pages
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import DashboardPage from './pages/Dashboard/DashboardPage';

import ProjectDetailPage from './pages/Projects/ProjectDetailPage';
import ProjectOverviewPage from './pages/Projects/ProjectOverviewPage';
import ProjectDetailOverviewPage from './pages/Projects/ProjectDetailOverviewPage';
import TasksPage from './pages/Tasks/TasksPage';
import TaskDetailOverviewPage from './pages/Tasks/TaskDetailOverviewPage';
import TeamsPage from './pages/Teams/TeamsPage';
import TeamDetailOverviewPage from './pages/Teams/TeamDetailOverviewPage';
import CustomersPage from './pages/Customers/CustomersPage';
import CustomerOverviewPage from './pages/Customers/CustomerOverviewPage';
import ProposalsPage from './pages/Proposals/ProposalsPage';
import ProposalDetailOverviewPage from './pages/Proposals/ProposalDetailOverviewPage';
import InvoicesPage from './pages/Invoices';
import InvoiceDetailOverviewPage from './pages/Invoices/InvoiceDetailOverviewPage';
import AnalyticsPage from './pages/Analytics/AnalyticsPage';
import SettingsPage from './pages/Settings/SettingsPage';
import SharedProjectPage from './pages/Public/SharedProjectPage';
import SharedProposalPage from './pages/Public/SharedProposalPage';
import VanityRedirect from './pages/Public/VanityRedirect';
import KnowledgeHubPage from './pages/Knowledge/KnowledgeHubPage';
import ContextCardsPage from './pages/Knowledge/ContextCardsPage';
import HandoffSummariesPage from './pages/Knowledge/HandoffSummariesPage';
import DecisionLogPage from './pages/Knowledge/DecisionLogPage';
import PurchasePage from './pages/Purchase/PurchasePage';
import VendorDetailPage from './pages/Purchase/VendorDetailPage';
import PurchaseOrderDetailPage from './pages/Purchase/PurchaseOrderDetailPage';
import GoalsPage from './pages/Goals/GoalsPage';
import GoalDetailOverviewPage from './pages/Goals/GoalDetailOverviewPage';
import TeamCollaborationPage from './pages/TeamCollaboration/TeamCollaborationPage';
import ProjectViewsPage from './pages/Views/ProjectViewsPage';
import AIDashboardPage from './pages/AI/AIDashboardPage';
import PricingPage from './pages/Pricing/PricingPage';
import BillingPage from './pages/Billing/BillingPage';
import CalendarPage from './pages/Calendar/CalendarPage';
import TodoPage from './pages/Todo/TodoPage';
import ChatPage from './pages/Chat/ChatPage';
import NotificationTestPage from './pages/Test/NotificationTestPage';
import NotificationDebugPage from './pages/Test/NotificationDebugPage';

// Admin Pages
import AdminDashboardPage from './pages/Admin/AdminDashboardPage';
import TenantsPage from './pages/Admin/TenantsPage';
import TenantDetailPage from './pages/Admin/TenantDetailPage';
import SubscriptionsPage from './pages/Admin/SubscriptionsPage';
import AdminAnalyticsPage from './pages/Admin/AdminAnalyticsPage';
import BillingManagementPage from './pages/Admin/BillingManagementPage';
import AdminSettingsPage from './pages/Admin/AdminSettingsPage';

// Auth Components
import AdminRedirect from './components/Auth/AdminRedirect';
import TenantOnlyRoute from './components/Auth/TenantOnlyRoute';
import AdminOnlyRoute from './components/Auth/AdminOnlyRoute';
import DefaultRedirect from './components/Auth/DefaultRedirect';

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

function AppContent() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);


  useEffect(() => {
    // Check if user is already logged in on app start
    const token = localStorage.getItem('access_token');
    if (token) {
      dispatch(getCurrentUser());
    }
  }, [dispatch]);

  useEffect(() => {
    // Detect tenant context after user is loaded
    if (user) {
      const tenantContext = detectTenantContext(user.role, user.organization);
      console.log('Tenant context detected:', tenantContext);
      // Fetch user permissions
      try {
        if (user.id) {
          dispatch(fetchUserPermissions(user.id));
        }
      } catch (e) {
        // ignore
      }
    }
  }, [user, dispatch]);

  // Apply theme based on user preference (light | dark | system)
  useEffect(() => {
    const pref = ((user?.preferences as any)?.theme as 'light' | 'dark' | 'system') || 'light';
    applyTheme(pref);

    // If system, also listen for OS scheme changes
    let mql: MediaQueryList | null = null;
    const handler = () => applyTheme('system');
    if (pref === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      mql = window.matchMedia('(prefers-color-scheme: dark)');
      mql.addEventListener?.('change', handler);
    }
    return () => {
      if (mql) mql.removeEventListener?.('change', handler);
    };
  }, [user]);

  return (
    <div className="App min-h-screen">
      <Router>
        <Routes>
          {/* Public routes */}
          <Route 
            path="/login" 
            element={<LoginPage />}
          />
          <Route 
            path="/register" 
            element={<RegisterPage />}
          />
          <Route 
            path="/shared/project/:shareId" 
            element={<SharedProjectPage />}
          />
          <Route 
            path="/shared/proposal/:shareId" 
            element={<SharedProposalPage />}
          />
          <Route 
            path="/pricing" 
            element={<PricingPage />}
          />
          <Route 
            path="/p/:vanity" 
            element={<VanityRedirect />}
          />
          <Route 
            path="/pr/:vanity" 
            element={<VanityRedirect />}
          />

          {/* Protected routes */}
          <Route path="/" element={<ProtectedRoute />}>
            <Route path="" element={<AdminRedirect />} />
            
            {/* Legacy tenant routes (for backward compatibility) */}
            <Route path="pricing" element={<TenantOnlyRoute><Layout><PricingPage /></Layout></TenantOnlyRoute>} />
            <Route path="dashboard" element={<TenantOnlyRoute><Layout><DashboardPage /></Layout></TenantOnlyRoute>} />
            <Route path="projects" element={<TenantOnlyRoute><Layout><ProjectOverviewPage /></Layout></TenantOnlyRoute>} />
            <Route path="projects/:id" element={<TenantOnlyRoute><Layout><ProjectDetailOverviewPage /></Layout></TenantOnlyRoute>} />
            <Route path="tasks" element={<TenantOnlyRoute><Layout><TasksPage /></Layout></TenantOnlyRoute>} />
            <Route path="tasks/:id" element={<TenantOnlyRoute><Layout><TaskDetailOverviewPage /></Layout></TenantOnlyRoute>} />
            <Route path="teams" element={<TenantOnlyRoute><Layout><TeamsPage /></Layout></TenantOnlyRoute>} />
            <Route path="teams/:id" element={<TenantOnlyRoute><Layout><TeamDetailOverviewPage /></Layout></TenantOnlyRoute>} />
            <Route path="customers" element={<TenantOnlyRoute><Layout><CustomersPage /></Layout></TenantOnlyRoute>} />
            <Route path="customers/:id" element={<TenantOnlyRoute><Layout><CustomerOverviewPage /></Layout></TenantOnlyRoute>} />
            <Route path="proposals" element={<TenantOnlyRoute><Layout><ProposalsPage /></Layout></TenantOnlyRoute>} />
            <Route path="proposals/:id" element={<TenantOnlyRoute><Layout><ProposalDetailOverviewPage /></Layout></TenantOnlyRoute>} />
            <Route path="purchase" element={<TenantOnlyRoute><Layout><PurchasePage /></Layout></TenantOnlyRoute>} />
<Route path="goals" element={<TenantOnlyRoute><Layout><GoalsPage /></Layout></TenantOnlyRoute>} />
            <Route path="goals/:id" element={<TenantOnlyRoute><Layout><GoalDetailOverviewPage /></Layout></TenantOnlyRoute>} />
            <Route path="invoices" element={<TenantOnlyRoute><Layout><InvoicesPage /></Layout></TenantOnlyRoute>} />
            <Route path="invoices/:id" element={<TenantOnlyRoute><Layout><InvoiceDetailOverviewPage /></Layout></TenantOnlyRoute>} />
            <Route path="knowledge" element={<TenantOnlyRoute><Layout><KnowledgeHubPage /></Layout></TenantOnlyRoute>} />
            <Route path="knowledge/context-cards" element={<TenantOnlyRoute><Layout><ContextCardsPage /></Layout></TenantOnlyRoute>} />
            <Route path="knowledge/handoff-summaries" element={<TenantOnlyRoute><Layout><HandoffSummariesPage /></Layout></TenantOnlyRoute>} />
            <Route path="knowledge/decision-log" element={<TenantOnlyRoute><Layout><DecisionLogPage /></Layout></TenantOnlyRoute>} />
            <Route path="analytics" element={<TenantOnlyRoute><Layout><AnalyticsPage /></Layout></TenantOnlyRoute>} />
            <Route path="calendar" element={<TenantOnlyRoute><Layout><CalendarPage /></Layout></TenantOnlyRoute>} />
            <Route path="todo" element={<TenantOnlyRoute><Layout><TodoPage /></Layout></TenantOnlyRoute>} />
            <Route path="chat" element={<TenantOnlyRoute><Layout><ChatPage /></Layout></TenantOnlyRoute>} />
            {/* AI */}
            <Route path="ai" element={<TenantOnlyRoute><Layout><AIDashboardPage /></Layout></TenantOnlyRoute>} />
            {/* Test Pages (Dev/Debug) */}
            <Route path="test/notifications" element={<TenantOnlyRoute><Layout><NotificationTestPage /></Layout></TenantOnlyRoute>} />
            <Route path="test/notification-debug" element={<TenantOnlyRoute><Layout><NotificationDebugPage /></Layout></TenantOnlyRoute>} />
            <Route path="settings" element={<TenantOnlyRoute><Layout><SettingsPage /></Layout></TenantOnlyRoute>} />
            <Route path="billing" element={<TenantOnlyRoute><Layout><BillingPage /></Layout></TenantOnlyRoute>} />
            <Route path="collaboration" element={<TenantOnlyRoute><Layout><TeamCollaborationPage /></Layout></TenantOnlyRoute>} />
            <Route path="views" element={<TenantOnlyRoute><Layout><ProjectViewsPage /></Layout></TenantOnlyRoute>} />
            
            {/* Tenant slug-based routes */}
            <Route path=":tenantSlug/pricing" element={<TenantOnlyRoute><Layout><PricingPage /></Layout></TenantOnlyRoute>} />
            <Route path=":tenantSlug/dashboard" element={<TenantOnlyRoute><Layout><DashboardPage /></Layout></TenantOnlyRoute>} />
            <Route path=":tenantSlug/projects" element={<TenantOnlyRoute><Layout><ProjectOverviewPage /></Layout></TenantOnlyRoute>} />
            <Route path=":tenantSlug/projects/:id" element={<TenantOnlyRoute><Layout><ProjectDetailOverviewPage /></Layout></TenantOnlyRoute>} />
            <Route path=":tenantSlug/tasks" element={<TenantOnlyRoute><Layout><TasksPage /></Layout></TenantOnlyRoute>} />
            <Route path=":tenantSlug/tasks/:id" element={<TenantOnlyRoute><Layout><TaskDetailOverviewPage /></Layout></TenantOnlyRoute>} />
            <Route path=":tenantSlug/teams" element={<TenantOnlyRoute><Layout><TeamsPage /></Layout></TenantOnlyRoute>} />
            <Route path=":tenantSlug/teams/:id" element={<TenantOnlyRoute><Layout><TeamDetailOverviewPage /></Layout></TenantOnlyRoute>} />
            <Route path=":tenantSlug/customers" element={<TenantOnlyRoute><Layout><CustomersPage /></Layout></TenantOnlyRoute>} />
            <Route path=":tenantSlug/customers/:id" element={<TenantOnlyRoute><Layout><CustomerOverviewPage /></Layout></TenantOnlyRoute>} />
            <Route path=":tenantSlug/proposals" element={<TenantOnlyRoute><Layout><ProposalsPage /></Layout></TenantOnlyRoute>} />
            <Route path=":tenantSlug/proposals/:id" element={<TenantOnlyRoute><Layout><ProposalDetailOverviewPage /></Layout></TenantOnlyRoute>} />
            <Route path=":tenantSlug/purchase" element={<TenantOnlyRoute><Layout><PurchasePage /></Layout></TenantOnlyRoute>} />
            <Route path=":tenantSlug/purchase/vendors/:id" element={<TenantOnlyRoute><Layout><VendorDetailPage /></Layout></TenantOnlyRoute>} />
            <Route path=":tenantSlug/purchase/orders/:id" element={<TenantOnlyRoute><Layout><PurchaseOrderDetailPage /></Layout></TenantOnlyRoute>} />
<Route path=":tenantSlug/goals" element={<TenantOnlyRoute><Layout><GoalsPage /></Layout></TenantOnlyRoute>} />
            <Route path=":tenantSlug/goals/:id" element={<TenantOnlyRoute><Layout><GoalDetailOverviewPage /></Layout></TenantOnlyRoute>} />
            <Route path=":tenantSlug/invoices" element={<TenantOnlyRoute><Layout><InvoicesPage /></Layout></TenantOnlyRoute>} />
            <Route path=":tenantSlug/invoices/:id" element={<TenantOnlyRoute><Layout><InvoiceDetailOverviewPage /></Layout></TenantOnlyRoute>} />
            <Route path=":tenantSlug/knowledge" element={<TenantOnlyRoute><Layout><KnowledgeHubPage /></Layout></TenantOnlyRoute>} />
            <Route path=":tenantSlug/knowledge/context-cards" element={<TenantOnlyRoute><Layout><ContextCardsPage /></Layout></TenantOnlyRoute>} />
            <Route path=":tenantSlug/knowledge/handoff-summaries" element={<TenantOnlyRoute><Layout><HandoffSummariesPage /></Layout></TenantOnlyRoute>} />
            <Route path=":tenantSlug/knowledge/decision-log" element={<TenantOnlyRoute><Layout><DecisionLogPage /></Layout></TenantOnlyRoute>} />
            <Route path=":tenantSlug/analytics" element={<TenantOnlyRoute><Layout><AnalyticsPage /></Layout></TenantOnlyRoute>} />
            <Route path=":tenantSlug/calendar" element={<TenantOnlyRoute><Layout><CalendarPage /></Layout></TenantOnlyRoute>} />
            <Route path=":tenantSlug/todo" element={<TenantOnlyRoute><Layout><TodoPage /></Layout></TenantOnlyRoute>} />
            <Route path=":tenantSlug/chat" element={<TenantOnlyRoute><Layout><ChatPage /></Layout></TenantOnlyRoute>} />
            {/* AI */}
            <Route path=":tenantSlug/ai" element={<TenantOnlyRoute><Layout><AIDashboardPage /></Layout></TenantOnlyRoute>} />
            <Route path=":tenantSlug/settings" element={<TenantOnlyRoute><Layout><SettingsPage /></Layout></TenantOnlyRoute>} />
            <Route path=":tenantSlug/billing" element={<TenantOnlyRoute><Layout><BillingPage /></Layout></TenantOnlyRoute>} />
            <Route path=":tenantSlug/collaboration" element={<TenantOnlyRoute><Layout><TeamCollaborationPage /></Layout></TenantOnlyRoute>} />
            <Route path=":tenantSlug/views" element={<TenantOnlyRoute><Layout><ProjectViewsPage /></Layout></TenantOnlyRoute>} />
            
            {/* Admin-only routes */}
            <Route path="admin" element={<AdminOnlyRoute><Layout><AdminDashboardPage /></Layout></AdminOnlyRoute>} />
            <Route path="admin/tenants" element={<AdminOnlyRoute><Layout><TenantsPage /></Layout></AdminOnlyRoute>} />
            <Route path="admin/tenants/:tenantId" element={<AdminOnlyRoute><Layout><TenantDetailPage /></Layout></AdminOnlyRoute>} />
            <Route path="admin/subscriptions" element={<AdminOnlyRoute><Layout><SubscriptionsPage /></Layout></AdminOnlyRoute>} />
            <Route path="admin/analytics" element={<AdminOnlyRoute><Layout><AdminAnalyticsPage /></Layout></AdminOnlyRoute>} />
            <Route path="admin/billing" element={<AdminOnlyRoute><Layout><BillingManagementPage /></Layout></AdminOnlyRoute>} />
            <Route path="admin/settings" element={<AdminOnlyRoute><Layout><AdminSettingsPage /></Layout></AdminOnlyRoute>} />
          </Route>

          {/* Catch all route */}
          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
      </Router>
      
      <NotificationContainer />
    </div>
  );
}

export default App;
