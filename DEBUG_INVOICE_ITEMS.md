# Debugging Invoice Items Table

## Issue
When selecting an item from the dropdown, the price is not showing in the Rate field immediately.

## Changes Made
1. Added `flushSync` to force synchronous state updates
2. Moved array creation inside `flushSync` 
3. Added extensive console logging
4. Added type annotation to `newRow`

## How to Test

1. Open the browser console (F12 or Cmd+Option+I)
2. Navigate to Invoices page
3. Click "Create Invoice"
4. In the Items table, click on the first row's Item Name field
5. Type something or just focus to see dropdown
6. Click on an item from the dropdown

## Expected Console Output

When you click an item, you should see:
```
=== Picking item ===
Full item object: {...}
Using unit_price (cents -> dollars): 5000 -> 50
Final unit price: 50
Final tax rate (%): 20
New row being set: {...}
===================
📊 InvoiceItemsTable - selectedItems changed: [...]
💰 Row 0 unit_price: 50 -> displayed as: 50
```

## Things to Check

1. **Does the console show `Final unit price: 50` (or another non-zero value)?**
   - If YES: The price is calculated correctly
   - If NO: The item data doesn't have a valid price field

2. **Does the console show `New row being set:` with `unit_price: 50`?**
   - If YES: The newRow object is created correctly
   - If NO: There's an issue in the newRow construction

3. **Does the console show `📊 InvoiceItemsTable - selectedItems changed:`?**
   - If YES: The parent state is being updated
   - If NO: `onItemsChange` is not being called

4. **Does the console show `💰 Row 0 unit_price: 50 -> displayed as: 50`?**
   - If it shows `50`: The input should display 50
   - If it shows `0` or `undefined`: The row object doesn't have unit_price set

## Possible Issues

### Issue 1: Parent component not updating
If the parent component (`InvoicesPage`) is not re-rendering with the new data, check if `setSelectedItems` in InvoicesPage is working properly.

### Issue 2: State Reference Issue
The `selectedItems` prop might be stale when creating the `rows` array. This is why we moved it inside `flushSync`.

### Issue 3: Input Value Binding
The input's `value` prop might not be reactive. We added detailed logging to check this.

## Next Steps

Based on the console output, we can determine:
- Is the issue in data calculation? (step 1)
- Is the issue in state creation? (step 2)
- Is the issue in parent state update? (step 3)
- Is the issue in rendering? (step 4)

Please check the console and let me know what you see!
