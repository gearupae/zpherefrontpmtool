# Purchase Table - Test Plan

## Test Environment
- URL: `http://localhost:3000/zphere-admin/purchase`
- Alternative: `http://localhost:3000/purchase` (for tenant users)

## Pre-requisites
1. Backend API is running
2. Database has some purchase orders
3. User is logged in with appropriate permissions

---

## Test Cases

### 1. Top Bar Functionality

#### 1.1 Search Bar
**Steps:**
1. Navigate to purchase orders tab
2. Type in the search bar
3. Verify filtering works

**Expected Results:**
- Search filters by PO number and vendor name
- Results update in real-time (300ms debounce)
- No errors in console

#### 1.2 Refresh Button
**Steps:**
1. Click the refresh button (↻ icon)
2. Observe the behavior

**Expected Results:**
- Search term is cleared
- Data is refetched from API
- Table updates with latest data
- Stats cards update correctly

#### 1.3 Date Filter Button
**Steps:**
1. Click the calendar icon button

**Expected Results:**
- Button is visible and styled correctly
- Currently a placeholder (no popup yet)
- No console errors

---

### 2. Delivery Status Column

#### 2.1 Display
**Steps:**
1. Check the Delivery Status column
2. Verify badge colors

**Expected Results:**
- Column header says "Delivery Status"
- Default status shows as "Pending" (gray)
- Badge styling matches projects table
- Colors:
  - Pending: Gray background
  - In Transit: Blue background
  - Delivered: Green background
  - Cancelled: Red background

#### 2.2 Hover Effect
**Steps:**
1. Hover over any delivery status cell

**Expected Results:**
- Cell background changes to light gray
- Badge shows subtle ring effect
- Cursor changes to pointer
- Smooth transition

#### 2.3 Click to Edit
**Steps:**
1. Click on any delivery status badge
2. Observe the popup

**Expected Results:**
- Popup appears below the badge
- Popup shows 4 options: Pending, In Transit, Delivered, Cancelled
- Current selection is highlighted with checkmark
- Popup has proper z-index (appears above other elements)

#### 2.4 Change Status
**Steps:**
1. Open delivery status popup
2. Click on a different status
3. Observe the behavior

**Expected Results:**
- Popup closes immediately
- Badge updates with new status and color
- Success notification appears (green toast)
- API call is made (check Network tab)
- No page reload

#### 2.5 Click Outside
**Steps:**
1. Open delivery status popup
2. Click anywhere outside the popup

**Expected Results:**
- Popup closes
- No changes are saved
- No API calls made

---

### 3. Payment Status Column

#### 3.1 Display
**Steps:**
1. Check the Payment Status column
2. Verify badge colors

**Expected Results:**
- Column header says "Payment Status"
- Default status shows as "Pending" (gray)
- Badge styling matches projects table
- Colors:
  - Pending: Gray background
  - Paid: Green background
  - Partial: Yellow background
  - Overdue: Red background

#### 3.2 Hover Effect
**Steps:**
1. Hover over any payment status cell

**Expected Results:**
- Cell background changes to light gray
- Badge shows subtle ring effect
- Cursor changes to pointer
- Smooth transition

#### 3.3 Click to Edit
**Steps:**
1. Click on any payment status badge
2. Observe the popup

**Expected Results:**
- Popup appears below the badge
- Popup shows 4 options: Pending, Paid, Partial, Overdue
- Current selection is highlighted with checkmark
- Popup has proper z-index (appears above other elements)

#### 3.4 Change Status
**Steps:**
1. Open payment status popup
2. Click on a different status
3. Observe the behavior

**Expected Results:**
- Popup closes immediately
- Badge updates with new status and color
- Success notification appears (green toast)
- API call is made (check Network tab)
- No page reload

#### 3.5 Click Outside
**Steps:**
1. Open payment status popup
2. Click anywhere outside the popup

**Expected Results:**
- Popup closes
- No changes are saved
- No API calls made

---

### 4. Multiple Inline Edits

#### 4.1 Sequential Edits
**Steps:**
1. Edit delivery status for PO #1
2. Immediately edit payment status for PO #1
3. Edit delivery status for PO #2

**Expected Results:**
- Each popup opens correctly
- Only one popup is visible at a time
- Previous popup closes when new one opens
- All changes are saved correctly

#### 4.2 Rapid Clicks
**Steps:**
1. Quickly click multiple status badges in succession

**Expected Results:**
- Application remains responsive
- No duplicate popups appear
- Last clicked popup is shown
- No console errors

---

### 5. API Integration

#### 5.1 Successful Update
**Steps:**
1. Open browser DevTools (Network tab)
2. Change a status
3. Check the API call

**Expected Results:**
- `PATCH /purchase-orders/{id}` call is made
- Request body contains correct field (delivery_status or payment_status)
- Response is 200 OK
- Local state updates immediately

#### 5.2 API Error Handling
**Steps:**
1. Simulate API failure (disconnect network or use DevTools)
2. Try to change a status

**Expected Results:**
- Error notification appears (red toast)
- Message says "Failed to update status"
- Badge doesn't change (stays at original value)
- Console shows error details

---

### 6. Responsive Design

#### 6.1 Different Screen Sizes
**Steps:**
1. Test on desktop (1920px)
2. Test on laptop (1366px)
3. Test on tablet (768px)

**Expected Results:**
- Table scrolls horizontally if needed
- Inline edit popups position correctly
- No layout breaks
- All elements remain accessible

#### 6.2 Popup Positioning
**Steps:**
1. Click status in first row
2. Click status in last visible row
3. Click status near screen edge

**Expected Results:**
- Popup always appears in visible area
- Popup doesn't go off-screen
- Portal positioning calculates correctly

---

### 7. Data Persistence

#### 7.1 Page Refresh
**Steps:**
1. Change delivery status to "In Transit"
2. Change payment status to "Paid"
3. Refresh the page

**Expected Results:**
- Changes persist after refresh
- Correct statuses are displayed
- No data loss

#### 7.2 Navigate Away and Back
**Steps:**
1. Change a status
2. Navigate to Vendors tab
3. Return to Purchase Orders tab

**Expected Results:**
- Changes are still visible
- Data is consistent
- No need to refresh

---

### 8. Edge Cases

#### 8.1 Empty Purchase Orders
**Steps:**
1. Test with no purchase orders in database

**Expected Results:**
- Table shows "No orders found" message
- No JavaScript errors
- Stats show 0 for all metrics

#### 8.2 Missing Status Values
**Steps:**
1. Test with PO that has null delivery_status
2. Test with PO that has null payment_status

**Expected Results:**
- Shows "Pending" as default
- Can be edited normally
- Saves correctly to database

#### 8.3 Long Vendor Names
**Steps:**
1. Test with very long vendor names

**Expected Results:**
- Table layout doesn't break
- Text truncates or wraps appropriately
- Inline edit still works

---

## Performance Tests

### 9.1 Large Dataset
**Steps:**
1. Load page with 100+ purchase orders
2. Try inline editing

**Expected Results:**
- Page loads in reasonable time (<3s)
- Inline edit remains responsive
- No lag or freezing
- Smooth scrolling

### 9.2 Multiple Concurrent Users
**Steps:**
1. Have two users open same page
2. User A changes status
3. User B refreshes

**Expected Results:**
- User B sees User A's changes
- No data conflicts
- Consistent state across users

---

## Browser Compatibility

### 10.1 Test Browsers
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

**Expected Results:**
- All features work identically
- Consistent styling
- Popup positioning correct
- No browser-specific bugs

---

## Regression Tests

### 11.1 Existing Features
**Steps:**
1. Test existing PO status column
2. Test search functionality
3. Test all action buttons (View, Edit, Download, Delete)
4. Test vendor column display

**Expected Results:**
- All existing features still work
- No features broken by new changes
- UI remains consistent

### 11.2 Stats Cards
**Steps:**
1. Check all 4 stats cards
2. Create new PO
3. Refresh page

**Expected Results:**
- Stats calculate correctly
- Values update after changes
- No incorrect data displayed

---

## Accessibility Tests

### 12.1 Keyboard Navigation
**Steps:**
1. Use Tab key to navigate
2. Try to open inline edit with Enter/Space

**Expected Results:**
- Can navigate to status cells
- Keyboard shortcuts work (future enhancement)
- Focus indicators visible

### 12.2 Screen Reader
**Steps:**
1. Use screen reader (VoiceOver/NVDA)
2. Navigate to status columns

**Expected Results:**
- Status values are announced
- Column headers are read
- Editable state is indicated (future enhancement)

---

## Success Criteria

✅ All 12 test sections pass
✅ No console errors or warnings
✅ API calls complete successfully
✅ Data persists correctly
✅ UI matches projects table design
✅ Performance is acceptable
✅ No regressions in existing features

---

## Known Limitations

1. Date filter button is a placeholder (not yet implemented)
2. No column sorting on new columns yet
3. No header filters for delivery/payment status yet
4. No keyboard shortcuts for inline edit yet

These are documented as future enhancements in the main summary document.
