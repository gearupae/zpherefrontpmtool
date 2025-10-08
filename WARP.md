# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Zphere is a multi-tenant project management and business operations platform. This is the **frontend** React application that communicates with a FastAPI backend (located at `../backend`).

**Key characteristics:**
- Built with Create React App (React 19, TypeScript)
- Multi-tenant architecture with role-based access control (RBAC)
- Redux Toolkit for state management
- Tailwind CSS for styling with custom design system
- Backend API proxied through the dev server

## Development Commands

### Starting Development

```bash
# Start the development server (port 3000)
npm start

# The dev server proxies API requests to http://localhost:8000
# Configure via package.json "proxy" field or REACT_APP_API_URL in .env
```

### Building

```bash
# Create production build
npm run build

# Build with custom API URL
REACT_APP_API_URL=https://api.yourdomain.com npm run build
```

### Testing

```bash
# Run all tests in watch mode
npm test

# Run tests without watch mode
npm test -- --watchAll=false

# Run specific test file
npm test -- src/components/MyComponent.test.tsx

# List all test files
npm test -- --listTests
```

### Other Useful Commands

```bash
# Install dependencies
npm install

# Clean install (recommended after pulling changes)
npm ci

# Check for TypeScript errors
npx tsc --noEmit

# Format with Prettier (if configured)
npx prettier --write "src/**/*.{ts,tsx}"
```

## Architecture Overview

### Multi-Tenant Context System

**Critical concept**: The app operates in different tenant contexts based on user roles and URL structure.

**Context Types:**
- **Admin Context**: Platform administrators managing all tenants (routes: `/admin/*`)
- **Tenant Context**: Organization users managing their own data (routes: `/:tenantSlug/*` or legacy `/*`)

**Key files:**
- `src/utils/tenantUtils.ts` - Tenant detection, routing, and header injection
- `src/api/client.ts` - Axios interceptor that adds `X-Tenant-Type`, `X-Tenant-Slug`, `X-Tenant-Id` headers to all requests

**URL patterns supported:**
1. Subdomain routing: `admin.domain.com`, `tenant-slug.domain.com`
2. Path-based routing: `/admin/*`, `/:tenantSlug/dashboard`
3. Legacy paths: `/dashboard`, `/projects`, etc.

**Important**: Always preserve trailing slashes in API URLs to avoid 307 redirects that drop authentication headers.

### State Management (Redux Toolkit)

**Store location**: `src/store/index.ts`

**Key slices:**
- `authSlice` - User authentication, JWT tokens, current user
- `rbacSlice` - Roles and permissions for RBAC system
- `projectSlice` - Project data
- `taskSlice` - Task data
- `teamSlice` - Team member data
- `uiSlice` - UI state (modals, sidebars, etc.)
- `notificationSlice` - In-app notifications
- `dashboardSlice` - Dashboard statistics

**Custom hooks**: `src/hooks/redux.ts` provides typed `useAppDispatch` and `useAppSelector`

### Role-Based Access Control (RBAC)

**Roles (defined in UserRole enum):**
- `ADMIN` - Platform admin (manages all tenants)
- `MANAGER` - Tenant manager (manages projects in their org)
- `MEMBER` - Tenant member (works on projects)
- `CLIENT` - External client (limited project access)

**Permission system:**
- Modules: Projects, Teams, Tasks, Goals, Customers, Purchases, Vendors, Proposals, Settings, Invoices, AI, Knowledge Base, Analytics
- Actions: view, create, edit, delete
- Check permissions using `useHasPermission()` hook or `hasPermission()` function

**Key files:**
- `src/utils/permissions.ts` - Permission checking logic
- `src/store/slices/rbacSlice.ts` - Permission state management
- `src/types/index.ts` - TypeScript types for Role, Permission, ModuleName

### API Client & Authentication

**Base client**: `src/api/client.ts` (axios instance)

**Features:**
- Automatic JWT token injection from localStorage
- Tenant context headers (`X-Tenant-*`) added to all requests
- Token refresh on 401 responses
- Detailed console logging for debugging auth/tenant issues

**API endpoints**: All requests go through `/api/v1/*`

**Environment variables:**
- `REACT_APP_API_URL` - Backend API base URL (default: http://localhost:8000)
- Development mode uses proxy: `"proxy": "http://localhost:8000"` in package.json

### Route Protection

**Auth wrapper components:**
- `ProtectedRoute` - Requires authentication
- `AdminOnlyRoute` - Requires ADMIN role
- `TenantOnlyRoute` - Requires non-ADMIN role (tenant context)
- `AdminRedirect` - Redirects to appropriate dashboard based on role
- `DefaultRedirect` - Smart redirect based on context

**Route structure in App.tsx:**
- Public: `/login`, `/register`, `/shared/project/:shareId`
- Admin: `/admin/*` routes
- Tenant: `/:tenantSlug/*` routes (with legacy fallbacks)

### Styling & Design System

**Tailwind configuration**: `tailwind.config.js`

**Custom color palette:**
- **Piano black variants**: Primary text colors (#0b0b0b, #111111, #161616)
- **Semantic colors**: Blue (info), Green (success), Red (error/urgent), Yellow (warning), Purple (custom)
- **Dark mode**: Enabled with `class` strategy - toggle by adding `dark` class to `<html>`

**Custom utilities:**
- Font sizes increased for readability (base is 1.125rem instead of 1rem)
- Border radius customizations
- Animation keyframes for fade-in, slide-up, slide-down

**Theme application**: `src/utils/theme.ts` - Applies user preference (light/dark/system)

### Page Organization

**Main page categories** (in `src/pages/`):
- **Auth**: Login, Register
- **Admin**: AdminDashboard, Tenants, Subscriptions, BillingManagement, AdminAnalytics
- **Dashboard**: PersonalDashboard with widgets
- **Projects**: ProjectOverview, ProjectDetail
- **Tasks**: TasksPage, TaskDetail
- **Teams**: TeamsPage, TeamDetail
- **Customers**: CustomersPage, CustomerOverview (includes Kanban board)
- **Proposals**: ProposalsPage, ProposalDetail
- **Purchase**: PurchasePage, VendorDetail, PurchaseOrderDetail
- **Invoices**: InvoicesPage, InvoiceDetail
- **Goals**: GoalsPage, GoalDetail
- **Knowledge**: KnowledgeHub, ContextCards, HandoffSummaries, DecisionLog
- **Settings**: SettingsPage (roles, permissions, items, custom fields, email)
- **AI**: AIDashboard
- **Analytics**: AnalyticsPage
- **Calendar**, **Chat**, **Todo**: Productivity features

### Component Organization

**Key component folders** (in `src/components/`):
- **Layout**: Header, Sidebar, Layout (main wrapper with route progress bar)
- **Auth**: Route protection components (ProtectedRoute, AdminOnlyRoute, etc.)
- **UI**: Reusable UI components (LoadingSpinner, NotificationContainer, DateRangeCalendar, ViewModeButton)
- **Filters**: FilterBar for table filtering
- **Dashboard**: Widget components (MyTasks, RecentActivity, ProjectStatus, etc.)
- **Chat**: UnifiedChatSystem, FloatingChatWidget, ProjectChat
- **Comments**: Threaded comments, TaskComments with @mentions and task linking
- **FileUpload**: DragDropUpload, EnhancedFileUpload
- **Tasks**: TaskAssignment, TaskDependencies, RecurringTaskForm
- **Customers**: CustomerKanban (Board, Column, Card)
- **Invoices**: InvoiceForm, InvoiceItemsTable, DeliveryNoteManagement
- **Integration**: ActivityStream, UniversalSearch, IntegrationDashboard

### TypeScript Types

**Central type definitions**: `src/types/index.ts`

**Key interfaces:**
- User, Organization, Project, Task, Customer, Proposal, ProjectInvoice
- Role, Permission (RBAC)
- TaskComment, TaskAttachment, TaskDocument
- TeamMember, ProjectMemberResponse
- Enums: UserRole, UserStatus, ProjectStatus, TaskStatus, TaskPriority, TaskType, InvoiceStatus, ProposalStatus, etc.

### Testing Strategy

**Test setup:**
- Jest + React Testing Library
- Test file location: Co-located with components (`*.test.tsx`)
- Setup file: `src/setupTests.ts`

**Current test coverage:**
- Minimal (only `App.test.tsx` exists)
- When adding tests, follow React Testing Library best practices (query by role/label, avoid implementation details)

## Important Notes

### API Request Debugging

The API client logs extensive debug information to the console:
- `🔧 API Request Debug:` - Shows URL, method, user role, tenant headers, auth token
- `🚨 403 Forbidden Error` - Detailed debugging for permission issues
- `⚠️ Making API request without tenant context` - Warns when tenant headers are missing

Check browser console when debugging auth/permission issues.

### Trailing Slashes in API URLs

**Critical**: FastAPI routes use trailing slashes. When calling API endpoints, preserve the trailing slash to avoid 307 redirects that drop custom headers (Authorization, X-Tenant-*).

Example:
```typescript
// Good
apiClient.post('/customers/', data)

// Bad (causes redirect and drops headers)
apiClient.post('/customers', data)
```

### Backend Relationship

This frontend communicates with a FastAPI backend located at `../backend`. The backend:
- Uses PostgreSQL database
- Provides RESTful API at `/api/v1/*`
- Handles multi-tenant data isolation
- Requires tenant context headers on all authenticated requests
- Default port: 8000

See `DEPLOYMENT_PROD.md` for production deployment instructions.

### Development Workflow

1. Ensure backend is running on port 8000
2. Start frontend dev server: `npm start`
3. Access app at http://localhost:3000
4. API requests automatically proxied to backend
5. Changes hot-reload automatically

### Common Patterns

**Fetching data in components:**
```typescript
const dispatch = useAppDispatch();
const { projects, isLoading, error } = useAppSelector(state => state.projects);

useEffect(() => {
  dispatch(fetchProjects());
}, [dispatch]);
```

**Checking permissions:**
```typescript
import { useHasPermission } from '../utils/permissions';

const hasPermission = useHasPermission();
const canEdit = hasPermission('Projects', 'edit');
```

**Making API calls:**
```typescript
import apiClient from '../api/client';

// GET request
const response = await apiClient.get('/projects/');

// POST request (note trailing slash)
const response = await apiClient.post('/projects/', { name: 'New Project' });
```

### Known Quirks

1. **Filter popups**: There's a `fix-filter-popups.md` with details on filter portal rendering
2. **Source maps**: Disabled via `GENERATE_SOURCEMAP=false` in `.env` to avoid CSS parsing issues
3. **Dark mode**: Theme preference stored in user.preferences.theme, applied via `utils/theme.ts`
4. **Multiple summary docs**: Various `*_SUMMARY.md` files document recent feature implementations (customers, invoices, proposals, purchase orders, teams)
