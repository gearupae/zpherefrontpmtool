# Filter Popup Fix - Using React Portals

The filter popups are being clipped by the table's `overflow-x-auto` container. The solution is to use React Portals to render the popups directly in `document.body`, outside the table's DOM hierarchy.

## Changes Required:

### 1. Import ReactDOM (DONE)
Already added at the top of the file.

### 2. Add FilterButtonRect State (DONE)
Already added to track button positions.

### 3. Add FilterPortal Component (DONE)
Already added above the ProjectOverviewPage component.

### 4. Update ALL Filter Button onClick Handlers

Each filter button needs to:
- Get its bounding rectangle when opening
- Store it in `filterButtonRect` state  
- Open/close the filter

### 5. Move ALL Filter Popup Renders Outside Table

All filter popups need to be moved outside the `<table>` element and wrapped in `<FilterPortal>`.

## Implementation Steps:

1. Update each of the 5 filter button `onClick` handlers to capture `getBoundingClientRect()`
2. Remove all inline popup renders from within table headers
3. Add all 5 popups after the closing `</table>` tag, wrapped in `<FilterPortal>`

## Filter Buttons to Update:
- Status filter (line ~1584)
- Priority filter (line ~1631)
- Team filter (line ~1675)
- Start Date filter (line ~1719-1727) - partially done
- Due Date filter (line ~1782-1790) - partially done

The date filters already have some position logic but need to add `getBoundingClientRect()`.
