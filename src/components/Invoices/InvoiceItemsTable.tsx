import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Item, ItemType } from '../../types';
import { TrashIcon, MagnifyingGlassIcon, PlusCircleIcon } from '@heroicons/react/24/outline';

export type InvoiceRow = {
  item?: Item | null;
  description: string;
  quantity: number;         // UI units
  unit_price: number;       // UI dollars
  tax_rate: number;         // percent (0-100)
  discount_rate: number;    // percent (0-100)
};

interface Props {
  selectedItems: InvoiceRow[];
  onItemsChange: (rows: InvoiceRow[]) => void;
  className?: string;
}

const currency = (n: number) => (isFinite(n) ? n.toFixed(2) : '0.00');

const InvoiceItemsTable: React.FC<Props> = ({ selectedItems, onItemsChange, className = '' }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  // Per-row search inputs for the Item Name cell
  const [nameInputs, setNameInputs] = useState<string[]>(() => selectedItems.map(si => si.item?.display_name || si.item?.name || ''));
  const [focusedRow, setFocusedRow] = useState<number | null>(null);
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // Fetch items from Settings > Items
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get('/items/');
      const itemsData = response.data.items || response.data || [];
      const filtered = Array.isArray(itemsData) ? itemsData.filter((it: Item) => it.is_active && it.is_billable) : [];
      setItems(filtered);
    } catch (e) {
      console.error('Failed to fetch items', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Debug: Log whenever selectedItems changes
  useEffect(() => {
    console.log('📊 InvoiceItemsTable - selectedItems changed:', selectedItems.map(r => ({
      item: r.item?.name,
      unit_price: r.unit_price,
      quantity: r.quantity,
      description: r.description
    })));
  }, [selectedItems]);

  // Ensure nameInputs length tracks rows length
  useEffect(() => {
    setNameInputs((prev) => {
      const next = [...prev];
      if (next.length < selectedItems.length) {
        for (let i = next.length; i < selectedItems.length; i++) next.push(selectedItems[i].item?.display_name || selectedItems[i].item?.name || '');
      } else if (next.length > selectedItems.length) {
        next.length = selectedItems.length;
      }
      return next;
    });
  }, [selectedItems]);

  const updateRow = (idx: number, patch: Partial<InvoiceRow>) => {
    const rows = [...selectedItems];
    rows[idx] = { ...rows[idx], ...patch };
    onItemsChange(rows);
  };

  const removeRow = (idx: number) => {
    let rows = selectedItems.filter((_, i) => i !== idx);
    if (rows.length === 0) {
      rows = [{ item: null, description: '', quantity: 1, unit_price: 0, tax_rate: 0, discount_rate: 0 }];
    }
    onItemsChange(rows);
  };

  const addBlankRow = (baseRows?: InvoiceRow[]) => {
    // Use the most up-to-date rows if provided to avoid stale closures
    const rowsBase = baseRows ?? selectedItems;
    const newRowIdx = rowsBase.length;
    const newRow = { item: null, description: '', quantity: 1, unit_price: 0, tax_rate: 0, discount_rate: 0 };
    
    // Apply updates immediately and atomically
    flushSync(() => {
      onItemsChange([...rowsBase, newRow]);
      
      // Ensure nameInputs length matches new rows (insert empty at new index)
      setNameInputs(prev => {
        const next = [...prev];
        if (next.length <= newRowIdx) {
          next[newRowIdx] = '';
        } else {
          next.splice(newRowIdx, 0, '');
        }
        return next;
      });
    });
    
    // Focus the new row after DOM has been updated
    requestAnimationFrame(() => {
      inputRefs.current[newRowIdx]?.focus();
      // Open the dropdown for the new row
      setFocusedRow(newRowIdx);
    });
  };

  // Suggestions based on current nameInputs[idx]
  const suggestionsFor = (idx: number) => {
    const term = (nameInputs[idx] || '').toLowerCase().trim();
    const notSelectedIds = new Set(selectedItems.map(si => si.item?.id).filter(Boolean) as string[]);
    const filtered = items.filter(it => !notSelectedIds.has(it.id)).filter(it => {
      if (!term) return true;
      return (
        it.name.toLowerCase().includes(term) ||
        (it.display_name || '').toLowerCase().includes(term) ||
        (it.sku || '').toLowerCase().includes(term) ||
        (it.description || '').toLowerCase().includes(term) ||
        (it.category || '').toLowerCase().includes(term)
      );
    });
    return filtered.slice(0, 8);
  };

  const pickSuggestion = (rowIdx: number, it: Item) => {
    console.log('=== Picking item ===');
    console.log('Full item object:', JSON.stringify(it, null, 2));
    
    // Calculate unit price - try all possible formats
    let unitPrice = 0;
    
    // Try different price field formats
    if (typeof it.unit_price === 'number' && it.unit_price > 0) {
      // Price in cents (backend format)
      unitPrice = it.unit_price / 100;
      console.log('Using unit_price (cents -> dollars):', it.unit_price, '->', unitPrice);
    } else if ((it as any).unit_price_display !== undefined && (it as any).unit_price_display > 0) {
      // Price already in dollars
      unitPrice = Number((it as any).unit_price_display);
      console.log('Using unit_price_display:', unitPrice);
    } else if ((it as any).price !== undefined && (it as any).price > 0) {
      // Alternative price field
      unitPrice = Number((it as any).price) / 100;
      console.log('Using price field:', (it as any).price, '->', unitPrice);
    } else if ((it as any).rate !== undefined && (it as any).rate > 0) {
      // Alternative rate field
      unitPrice = Number((it as any).rate);
      console.log('Using rate field:', unitPrice);
    } else {
      console.warn('No valid price found in item! Available fields:', Object.keys(it));
    }
    
    // Default tax rate - keep as percentage (0-100) for UI display
    let defaultTax = 0;
    if (it.default_tax_rate && it.default_tax_rate > 0) {
      // Backend stores as basis points (e.g., 2000 = 20%), convert to percentage
      defaultTax = it.default_tax_rate / 100;
      console.log('Using default_tax_rate:', it.default_tax_rate, '->', defaultTax, '%');
    } else if ((it as any).tax_rate && (it as any).tax_rate > 0) {
      defaultTax = (it as any).tax_rate / 100;
      console.log('Using tax_rate:', (it as any).tax_rate, '->', defaultTax, '%');
    }
    
    console.log('Final unit price:', unitPrice);
    console.log('Final tax rate (%):', defaultTax);
    
    const newRow: InvoiceRow = {
      item: it,
      description: it.description || it.name || it.display_name || '',
      unit_price: unitPrice,
      quantity: selectedItems[rowIdx]?.quantity || 1,
      tax_rate: defaultTax,
      discount_rate: selectedItems[rowIdx]?.discount_rate || 0,
    };
    
    console.log('New row being set:', JSON.stringify(newRow, null, 2));
    console.log('===================');
    
    // Use flushSync to ensure React applies state updates immediately
    flushSync(() => {
      // Create new array with the updated row
      const rows = [...selectedItems];
      rows[rowIdx] = newRow;
      
      // Update name input to show the selected item name
      setNameInputs((prev) => {
        const updated = [...prev];
        updated[rowIdx] = it.display_name || it.name;
        return updated;
      });
      
      // Close dropdown immediately
      setFocusedRow(null);
      
      // Update the parent component's state immediately with new rows
      onItemsChange(rows);
    });
    
    // Auto-append a new blank row if selecting on the last row
    if (rowIdx === selectedItems.length - 1) {
      // Use requestAnimationFrame to ensure DOM has updated, and pass updated rows to avoid stale state
      requestAnimationFrame(() => {
        const updatedRows = [...selectedItems];
        updatedRows[rowIdx] = newRow;
        addBlankRow(updatedRows);
      });
    }
  };

  const lineSubtotal = (row: InvoiceRow) => {
    return (Number(row.quantity) || 0) * (Number(row.unit_price) || 0);
  };

  const lineDiscount = (row: InvoiceRow) => {
    const subtotal = lineSubtotal(row);
    return subtotal * ((Number(row.discount_rate) || 0) / 100);
  };

  const lineNet = (row: InvoiceRow) => {
    return lineSubtotal(row) - lineDiscount(row);
  };

  const lineVat = (row: InvoiceRow) => {
    const net = lineNet(row);
    return net * ((Number(row.tax_rate) || 0) / 100);
  };

  const lineTotal = (row: InvoiceRow) => {
    return lineNet(row) + lineVat(row);
  };

  // Calculate overall totals
  const totals = useMemo(() => {
    // Count rows as valid if they have an item, a non-empty description, or a positive rate
    const validRows = selectedItems.filter(row => (
      !!(row.item || (row.description && row.description.trim())) || (Number(row.unit_price) > 0)
    ));
    const itemsTotal = validRows.reduce((sum, row) => sum + lineSubtotal(row), 0);
    const discountTotal = validRows.reduce((sum, row) => sum + lineDiscount(row), 0);
    const subtotal = itemsTotal - discountTotal; // Subtotal after discount
    const vat = validRows.reduce((sum, row) => sum + lineVat(row), 0);
    const total = subtotal + vat;
    return { 
      itemsTotal, 
      discountTotal, 
      subtotal, 
      vat, 
      total, 
      hasDiscount: discountTotal > 0,
      hasVat: vat > 0 
    };
  }, [selectedItems]);

  return (
    <div className={`w-full ${className}`}>
      <div className="border border-gray-200 rounded-lg">
        <div className="overflow-x-visible">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Item Name</th>
              <th className="py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Description</th>
              <th className="py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Rate</th>
              <th className="py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Qty</th>
              <th className="py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Discount %</th>
              <th className="py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">VAT %</th>
              <th className="py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Total</th>
              <th className="py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {selectedItems.map((row, idx) => {
              const sugg = suggestionsFor(idx);
              return (
                <tr key={idx} className="hover:bg-gray-50">
                  {/* Item Name with search */}
                  <td className="py-2 align-top" style={{ position: 'relative', overflow: 'visible' }}>
                    <div style={{ position: 'relative', overflow: 'visible' }}>
                      <div className="flex items-center">
                        <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 mr-1" />
                        <input
                          ref={(el) => { inputRefs.current[idx] = el; }}
                          type="text"
                          value={nameInputs[idx] || ''}
                          onChange={(e) => setNameInputs(prev => prev.map((v, i) => (i === idx ? e.target.value : v)))}
                          onFocus={() => setFocusedRow(idx)}
                          onBlur={() => setTimeout(() => setFocusedRow(prev => (prev === idx ? null : prev)), 150)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && sugg.length > 0) {
                              e.preventDefault();
                              pickSuggestion(idx, sugg[0]);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setFocusedRow(null);
                            }
                          }}
                          className="w-full px-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm"
                          placeholder="Type to search items..."
                        />
                      </div>
                      {focusedRow === idx && sugg.length > 0 && (
                        <ul 
                          style={{ 
                            position: 'absolute',
                            zIndex: 999999,
                            top: '100%',
                            left: 0,
                            marginTop: '4px'
                          }}
                          className="w-full min-w-[300px] bg-white border border-gray-300 shadow-lg rounded-md max-h-60 overflow-auto"
                        >
                          {sugg.map((it, suggIdx) => (
                            <li
                              key={it.id}
                              onMouseDown={(e) => { e.preventDefault(); pickSuggestion(idx, it); }}
                              className="py-2 cursor-pointer hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0"
                            >
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-900 font-medium">{it.display_name || it.name}</div>
                                <div className="text-sm text-gray-600">${(it.unit_price / 100).toFixed(2)}</div>
                              </div>
                              {it.description && (
                                <div className="mt-0.5 text-xs text-gray-500">{it.description}</div>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </td>

                  {/* Description */}
                  <td className="py-2 align-top">
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) => updateRow(idx, { description: e.target.value })}
                      className="w-full px-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      placeholder="Description"
                    />
                  </td>

                  {/* Rate */}
                  <td className="py-2 align-top text-right">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={Number(row.unit_price) || 0}
                      onChange={(e) => updateRow(idx, { unit_price: parseFloat(e.target.value || '0') })}
                      className="w-28 px-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm text-right"
                      placeholder="0.00"
                    />
                  </td>

                  {/* Qty */}
                  <td className="py-2 align-top text-right">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={Number(row.quantity) || 1}
                      onChange={(e) => updateRow(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-20 px-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm text-right"
                      placeholder="1"
                    />
                  </td>

                  {/* Discount */}
                  <td className="py-2 align-top text-right">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={isNaN(row.discount_rate as any) ? 0 : row.discount_rate}
                      onChange={(e) => updateRow(idx, { discount_rate: Math.max(0, Math.min(100, parseFloat(e.target.value || '0'))) })}
                      className="w-24 px-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm text-right"
                      placeholder="0.00"
                    />
                  </td>

                  {/* VAT */}
                  <td className="py-2 align-top text-right">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={isNaN(row.tax_rate as any) ? 0 : row.tax_rate}
                      onChange={(e) => updateRow(idx, { tax_rate: Math.max(0, Math.min(100, parseFloat(e.target.value || '0'))) })}
                      className="w-24 px-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm text-right"
                      placeholder="0.00"
                    />
                  </td>

                  {/* Total (read-only) */}
                  <td className="py-2 align-top text-right">
                    <div className="text-sm font-medium text-gray-900">${currency(lineTotal(row))}</div>
                  </td>

                  {/* Actions */}
                  <td className="py-2 align-top text-right">
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      className="inline-flex items-center p-2 rounded hover:bg-red-50 text-red-600"
                      title="Delete item"
                      aria-label="Delete item"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* Totals Summary - Right Aligned */}
      {selectedItems.length > 0 && (
        <div className="mt-6 flex justify-end">
          <div className="space-y-2 min-w-[300px]">
            <div className="flex justify-between items-center text-gray-600">
              <span className="text-sm">Subtotal:</span>
              <span className="text-sm font-medium">${currency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-gray-600">
              <span className="text-sm">Total VAT:</span>
              <span className="text-sm font-medium">${currency(totals.vat)}</span>
            </div>
            {totals.hasDiscount && (
              <div className="flex justify-between items-center text-gray-600">
                <span className="text-sm">Discount:</span>
                <span className="text-sm font-medium">-${currency(totals.discountTotal)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-gray-300">
              <span className="text-base font-bold text-gray-900">Total:</span>
              <span className="text-base font-bold text-gray-900">${currency(totals.total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceItemsTable;
