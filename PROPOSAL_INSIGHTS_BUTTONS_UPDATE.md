# Proposal Insights Button Updates

## Summary
Updated all four customer insight cards in the proposal detail page to match the exact button design from the project detail page and wired up proper navigation with customer filtering.

## Changes Made

### 1. CustomerDetailsCard (`src/components/Proposals/Insights/CustomerDetailsCard.tsx`)
**Button Style Updated:**
- Changed from: `className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-user-blue hover:bg-blue-700"`
- Changed to: `className="w-full flex items-center justify-center space-x-2 px-3 py-1 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"`

**Navigation:**
- Changed from anchor tag (`<a>`) to button with `onClick` handler
- Added `useNavigate` hook from react-router-dom
- Button navigates to `/customers/{customerId}` when clicked
- Added icon: `<UserIcon className="h-4 w-4" />`

### 2. ProjectStatsCard (`src/components/Proposals/Insights/ProjectStatsCard.tsx`)
**Button Style Updated:**
- Same button style update as above

**Navigation with Filtering:**
- Added `customerId` prop to component interface
- Button navigates to `/projects?customer={customerId}` when clicked
- Falls back to `/projects` if no customerId provided
- Added icon: `<FolderIcon className="h-4 w-4" />`

### 3. FinancialOverviewCard (`src/components/Proposals/Insights/FinancialOverviewCard.tsx`)
**Button Style Updated:**
- Same button style update as above

**Navigation with Filtering:**
- Added `customerId` prop to component interface
- Button navigates to `/invoices?customer={customerId}` when clicked
- Falls back to `/invoices` if no customerId provided
- Added icon: `<BanknotesIcon className="h-4 w-4" />`

### 4. ProposalHistoryCard (`src/components/Proposals/Insights/ProposalHistoryCard.tsx`)
**Button Style Updated:**
- Same button style update as above

**Navigation with Filtering:**
- Added `customerId` prop to component interface
- Button navigates to `/proposals?customer={customerId}` when clicked
- Falls back to `/proposals` if no customerId provided
- Added icon: `<DocumentTextIcon className="h-4 w-4" />`

### 5. ProposalDetailOverviewPage (`src/pages/Proposals/ProposalDetailOverviewPage.tsx`)
**Props Passed:**
- Updated all three cards (ProjectStatsCard, FinancialOverviewCard, ProposalHistoryCard) to receive `customerId` prop
- CustomerId is extracted from `insights?.customer?.id` or falls back to `overviewCustomer?.id`

## Design Matching

All buttons now match the exact design from the project detail page:

**Reference URL:** `http://localhost:3000/projects/a2f5e2dc-c319-44de-a77c-9eb32fb136bb`

**Button Properties:**
- Background: White (`bg-white`)
- Text color: Dark gray (`text-gray-900`)
- Border: Light gray (`border-gray-200`)
- Shadow: Small shadow (`shadow-sm`)
- Padding: `px-3 py-1` (tighter than before)
- Border radius: Medium (`rounded-md`)
- Font: Small, medium weight (`text-sm font-medium`)
- Hover: Light gray background (`hover:bg-gray-50`)
- Transition: Colors (`transition-colors`)
- Layout: Flexbox with centered items and space between icon and text
- Icon size: `h-4 w-4`

## Button Functionality

### Customer Details Card
- **Button:** "View Full Profile"
- **Action:** Navigate to customer detail page
- **Route:** `/customers/{customerId}`

### Project Statistics Card
- **Button:** "View All Projects"
- **Action:** Navigate to projects page filtered by customer
- **Route:** `/projects?customer={customerId}`

### Financial Overview Card
- **Button:** "View Invoices"
- **Action:** Navigate to invoices page filtered by customer
- **Route:** `/invoices?customer={customerId}`

### Proposal History Card
- **Button:** "View All Proposals"
- **Action:** Navigate to proposals page filtered by customer
- **Route:** `/proposals?customer={customerId}`

## Testing

To test these changes:

1. Start the frontend dev server: `npm start`
2. Navigate to a proposal detail page
3. Verify all four buttons in the sidebar:
   - Have the correct white/gray design matching the project page
   - Display icons next to text
   - Navigate correctly when clicked
   - Apply the proper customer filter in URL query parameters

## Technical Notes

- All navigation uses `useNavigate` from `react-router-dom`
- Routes are tenant-aware via `getTenantRoute` utility
- Customer filtering is applied via query parameters: `?customer={customerId}`
- TypeScript compilation passes with no errors
- No breaking changes to existing functionality
