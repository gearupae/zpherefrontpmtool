import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Item, ItemType } from '../../types';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
  CubeIcon,
  WrenchScrewdriverIcon,
  ClockIcon,
  TagIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

interface SelectedItem {
  item: Item;
  quantity: number;
  unit_price: number; // In dollars for display
  tax_rate: number; // In percentage
  discount_rate: number; // In percentage
  description: string;
}

interface ItemSelectorProps {
  selectedItems: SelectedItem[];
  onItemsChange: (items: SelectedItem[]) => void;
  className?: string;
}

const ItemSelector: React.FC<ItemSelectorProps> = ({ 
  selectedItems,
  onItemsChange,
  className = '' 
}) => {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSelector, setShowSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [quickAddQty, setQuickAddQty] = useState<number>(1);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Custom item quick add form
  const [showCustomForm, setShowCustomForm] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>('');
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [customUnit, setCustomUnit] = useState<string>('each');
  const [customTax, setCustomTax] = useState<number>(0);
  const [customDiscount, setCustomDiscount] = useState<number>(0);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get('/items/');
      // Handle the items response structure
      const itemsData = response.data.items || response.data || [];
      setItems(Array.isArray(itemsData) ? itemsData.filter(item => item.is_active && item.is_billable) : []);
    } catch (error) {
      console.error('Failed to fetch items:', error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getItemTypeIcon = (type: ItemType) => {
    switch (type) {
      case ItemType.SERVICE: return <WrenchScrewdriverIcon className="h-4 w-4" />;
      case ItemType.PRODUCT: return <CubeIcon className="h-4 w-4" />;
      case ItemType.TIME: return <ClockIcon className="h-4 w-4" />;
      default: return <TagIcon className="h-4 w-4" />;
    }
  };

  const getItemTypeColor = (type: ItemType) => {
    switch (type) {
      case ItemType.SERVICE: return 'bg-blue-100 text-blue-800';
      case ItemType.PRODUCT: return 'bg-green-100 text-green-800';
      case ItemType.TIME: return 'bg-yellow-100 text-yellow-800';
      case ItemType.EXPENSE: return 'bg-red-100 text-red-800';
      case ItemType.MATERIAL: return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredItems = useMemo(() => items.filter(item => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      item.name.toLowerCase().includes(term) ||
      (item.description || '').toLowerCase().includes(term) ||
      (item.sku || '').toLowerCase().includes(term);

    const matchesType = !selectedType || item.item_type === selectedType;

    const notSelected = !selectedItems.some(selected => selected.item.id === item.id);

    return matchesSearch && matchesType && notSelected;
  }), [items, searchTerm, selectedType, selectedItems]);

  const addItem = (item: Item) => {
    const newSelectedItem: SelectedItem = {
      item,
      quantity: 1,
      unit_price: (typeof item.unit_price === 'number') ? (item.unit_price / 100) : (item.unit_price_display || 0), // dollars
      tax_rate: (item.default_tax_rate || 0) / 100, // basis points -> percent
      discount_rate: 0,
      description: item.description || item.name
    };

    onItemsChange([...selectedItems, newSelectedItem]);
    // Keep the selector open for adding multiple items inline
    setSearchTerm('');
  };

  const updateSelectedItem = (index: number, field: keyof SelectedItem, value: any) => {
    const updatedItems = [...selectedItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    onItemsChange(updatedItems);
  };

  const removeSelectedItem = (index: number) => {
    const updatedItems = selectedItems.filter((_, i) => i !== index);
    onItemsChange(updatedItems);
  };

  const calculateItemTotal = (selectedItem: SelectedItem) => {
    const subtotal = selectedItem.quantity * selectedItem.unit_price;
    const taxAmount = subtotal * (selectedItem.tax_rate / 100);
    const discountAmount = subtotal * (selectedItem.discount_rate / 100);
    return subtotal + taxAmount - discountAmount;
  };

  const calculateGrandTotal = () => {
    return selectedItems.reduce((total, item) => total + calculateItemTotal(item), 0);
  };

  // Recently used items (from current selection)
  const recentItems = useMemo(() => {
    const map = new Map<string, Item>();
    for (let i = selectedItems.length - 1; i >= 0; i--) {
      const it = selectedItems[i].item;
      if (!map.has(it.id)) map.set(it.id, it);
      if (map.size >= 5) break;
    }
    return Array.from(map.values());
  }, [selectedItems]);

  // Organize items by category for structured selection
  const itemsByCategory = useMemo(() => {
    const categorized: { [key: string]: Item[] } = {};
    items.forEach(item => {
      if (!item.is_active || !item.is_billable) return;
      
      const category = item.category || 'Uncategorized';
      if (!categorized[category]) {
        categorized[category] = [];
      }
      categorized[category].push(item);
    });
    return categorized;
  }, [items]);

  const handleQuickAdd = () => {
    // Add highlighted item if present
    if (filteredItems.length && highlightedIndex >= 0 && highlightedIndex < filteredItems.length) {
      const it = filteredItems[highlightedIndex];
      const newSelected = {
        item: it,
        quantity: Math.max(1, quickAddQty || 1),
        unit_price: (it.unit_price_display || (it.unit_price ? it.unit_price / 100 : 0)) || 0,
        tax_rate: ((it as any).default_tax_rate || 0) / 100,
        discount_rate: 0,
        description: it.description || it.name,
      } as any;
      onItemsChange([...selectedItems, newSelected]);
      setQuickAddQty(1);
      setSearchTerm('');
      setHighlightedIndex(-1);
      return;
    }
    // Otherwise open custom form prefilled with search term
    setShowCustomForm(true);
    if (searchTerm) setCustomName(searchTerm);
  };

  const handleCustomAdd = () => {
    if (!customName.trim()) return;
    const price = Math.max(0, customPrice || 0);
    const qty = Math.max(1, quickAddQty || 1);
    const customItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: customName.trim(),
      display_name: customName.trim(),
      description: customName.trim(),
      item_type: ItemType.SERVICE,
      unit: customUnit || 'each',
      unit_price: Math.round(price * 100),
      unit_price_display: price,
      default_tax_rate: Math.round((customTax || 0) * 100),
      is_active: true,
      is_billable: true,
    } as any as Item;
    const newSelectedItem: any = {
      item: customItem,
      quantity: qty,
      unit_price: price,
      tax_rate: customTax || 0,
      discount_rate: customDiscount || 0,
      description: customName.trim(),
    };
    onItemsChange([...selectedItems, newSelectedItem]);
    // Reset custom form
    setShowCustomForm(false);
    setCustomName('');
    setCustomPrice(0);
    setCustomUnit('each');
    setCustomTax(0);
    setCustomDiscount(0);
    setQuickAddQty(1);
    setSearchTerm('');
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (!showSelector) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev + 1;
        return next >= filteredItems.length ? filteredItems.length - 1 : next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev <= 0 ? -1 : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleQuickAdd();
    }
  };

  useEffect(() => {
    if (showSelector) searchInputRef.current?.focus();
  }, [showSelector]);

  // Entry rows state and helpers (dropdown-based add flow)
  const [entryRows, setEntryRows] = useState<Array<{ id: string; value: string; open: boolean; highlighted: number }>>([
    { id: 'row-1', value: '', open: false, highlighted: -1 },
  ]);
  const addEntryRow = () => {
    const id = `row-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
    setEntryRows((rows) => [...rows, { id, value: '', open: false, highlighted: -1 }]);
  };
  const removeEntryRow = (id: string) => {
    setEntryRows((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.id !== id)));
  };
  const setRowValue = (id: string, value: string) => {
    setEntryRows((rows) => rows.map((r) => (r.id === id ? { ...r, value, open: true, highlighted: -1 } : r)));
  };
  const setRowOpen = (id: string, open: boolean) => {
    setEntryRows((rows) => rows.map((r) => (r.id === id ? { ...r, open } : r)));
  };
  const setRowHighlight = (id: string, highlighted: number) => {
    setEntryRows((rows) => rows.map((r) => (r.id === id ? { ...r, highlighted } : r)));
  };
  const selectRowSuggestion = (id: string, item: Item) => {
    addItem(item);
    // Keep the same entry row open, clear it, and focus it for next selection
    setEntryRows((rows) => rows.map((r) => (r.id === id ? { ...r, value: '', open: true, highlighted: -1 } : r)));
    // Focus on the cleared input so suggestions show immediately
    setTimeout(() => {
      try { inputRefs.current[id]?.focus(); } catch {}
    }, 0);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Selected Items */}
      <div className="space-y-3">
        {selectedItems.map((selectedItem, index) => (
          <div key={`${selectedItem.item.id}-${index}`} className="border border-secondary-200 rounded-lg p-4 bg-secondary-50">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white rounded-md">
                  {getItemTypeIcon(selectedItem.item.item_type)}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{selectedItem.item.display_name || selectedItem.item.name}</h4>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getItemTypeColor(selectedItem.item.item_type)}`}>
                    {selectedItem.item.item_type}
                  </span>
                  {selectedItem.item.category && (
                    <span className="ml-2 text-xs text-gray-500">{selectedItem.item.category}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => removeSelectedItem(index)}
                className="text-gray-400 hover:text-red-500"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={selectedItem.description}
                  onChange={(e) => updateSelectedItem(index, 'description', e.target.value)}
                  className="w-full text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Qty</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={selectedItem.quantity}
                  onChange={(e) => updateSelectedItem(index, 'quantity', parseInt(e.target.value) || 0)}
                  className="w-full text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Unit Price ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={selectedItem.unit_price}
                  onChange={(e) => updateSelectedItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                  className="w-full text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tax %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={selectedItem.tax_rate}
                  onChange={(e) => updateSelectedItem(index, 'tax_rate', parseFloat(e.target.value) || 0)}
                  className="w-full text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Discount %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={selectedItem.discount_rate}
                  onChange={(e) => updateSelectedItem(index, 'discount_rate', parseFloat(e.target.value) || 0)}
                  className="w-full text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div className="mt-3 flex justify-between items-center">
              <span className="text-xs text-gray-500">
                {selectedItem.quantity} × ${selectedItem.unit_price.toFixed(2)} = ${(selectedItem.quantity * selectedItem.unit_price).toFixed(2)}
              </span>
              <span className="text-sm font-medium text-gray-900">
                Total: ${calculateItemTotal(selectedItem).toFixed(2)}
            </span>
          </div>
        </div>
        ))}
      </div>

      {/* Items by Category - Structured Selection */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
          <h4 className="font-medium text-gray-700">Select Items from Categories</h4>
          <div className="flex items-center text-xs text-gray-500">
            <span>Items from your Settings</span>
            <a
              href="/settings"
              target="_blank"
              className="ml-2 text-gray-700 hover:text-gray-900 underline"
            >
              Manage Items
            </a>
          </div>
        </div>
        <div className="p-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading items...</p>
            </div>
          ) : Object.keys(itemsByCategory).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(itemsByCategory).map(([category, categoryItems]) => {
                const availableItems = categoryItems.filter(item => !selectedItems.some(si => si.item.id === item.id));
                return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium text-gray-700">{category}</h5>
                    <span className="text-xs text-gray-500">{availableItems.length} available</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {availableItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() => addItem(item)}
                        className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50 hover:border-gray-300 transition-colors text-left"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-gray-100 rounded-md">
                            {getItemTypeIcon(item.item_type)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.display_name || item.name}</div>
                            <div className="text-xs text-gray-500">${(item.unit_price / 100).toFixed(2)} / {item.unit}</div>
                          </div>
                        </div>
                        <PlusIcon className="h-5 w-5 text-gray-400 hover:text-gray-700" />
                      </button>
                    ))}
                  </div>
                </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-sm font-medium text-gray-900">No Items Available</h3>
              <p className="mt-2 text-sm text-gray-500">
                You haven't created any items or services yet. Create items in Settings to make them available for selection in invoices and proposals.
              </p>
              <div className="mt-4">
                <a
                  href="/settings"
                  target="_blank"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Items in Settings
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick add rows (dropdown combobox) */}
      <div className="space-y-2">
        <div className="flex items-center mb-2">
          <h4 className="text-sm font-medium text-gray-700">Search & Add Items</h4>
          <button 
            type="button"
            onClick={addEntryRow}
            className="ml-auto text-sm text-gray-700 hover:text-gray-900 flex items-center"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            <span>Add Row</span>
          </button>
        </div>
        
        {entryRows.map((row, idx) => {
          const term = row.value.toLowerCase().trim();
          const suggestions = items
            .filter((it) => {
              const notSelected = !selectedItems.some((s) => s.item.id === it.id);
              const matches = !term ||
                it.name.toLowerCase().includes(term) ||
                (it.display_name || '').toLowerCase().includes(term) ||
                (it.sku || '').toLowerCase().includes(term) ||
                (it.description || '').toLowerCase().includes(term) ||
                (it.category || '').toLowerCase().includes(term);
              return notSelected && it.is_active && it.is_billable && matches;
            })
            .slice(0, 8);
          return (
            <div key={row.id} className="relative">
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <input
                    ref={(el) => { inputRefs.current[row.id] = el; }}
                    type="text"
                    value={row.value}
                    onChange={(e) => setRowValue(row.id, e.target.value)}
                    onFocus={() => setRowOpen(row.id, true)}
                    onBlur={() => setTimeout(() => setRowOpen(row.id, false), 100)}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        const next = Math.min(row.highlighted + 1, suggestions.length - 1);
                        setRowHighlight(row.id, next);
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        const prev = row.highlighted <= 0 ? -1 : row.highlighted - 1;
                        setRowHighlight(row.id, prev);
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (suggestions.length > 0) {
                          const pick = suggestions[Math.max(0, row.highlighted)];
                          selectRowSuggestion(row.id, pick);
                        }
                      } else if (e.key === 'Escape') {
                        setRowOpen(row.id, false);
                      }
                    }}
                    placeholder="Search for item or service..."
                    className="w-full px-3 py-2 pr-9 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() => removeEntryRow(row.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                      aria-label="Remove this item field"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min="1"
                  value={quickAddQty}
                  onChange={(e) => setQuickAddQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-2 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Qty"
                  title="Quantity"
                />
              </div>
              {row.open && suggestions.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {suggestions.map((it, sIdx) => (
                    <li
                      key={it.id}
                      onMouseDown={(e) => { e.preventDefault(); selectRowSuggestion(row.id, it); }}
                      onMouseEnter={() => setRowHighlight(row.id, sIdx)}
                      className={`px-3 py-2 cursor-pointer transition-colors ${row.highlighted === sIdx ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="mr-2">
                            {getItemTypeIcon(it.item_type)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{it.display_name || it.name}</div>
                            {it.category && <span className="text-xs text-gray-500">{it.category}</span>}
                          </div>
                        </div>
                        <div className="text-xs font-medium text-gray-700">${(it.unit_price / 100).toFixed(2)} / {it.unit}</div>
                      </div>
                      {it.description && (
                        <div className="mt-0.5 text-xs text-gray-500 line-clamp-1">{it.description}</div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
        
        {/* Custom item creation */}
        {showCustomForm && (
          <div className="mt-3 bg-gray-50 border border-gray-300 rounded-md p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">Add Custom Item</h4>
              <button
                type="button"
                onClick={() => setShowCustomForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input 
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Item name"
                />
                <input 
                  type="number"
                  step="0.01"
                  min="0"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(parseFloat(e.target.value) || 0)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Unit price"
                />
              </div>
              <button
                type="button"
                onClick={handleCustomAdd}
                disabled={!customName.trim()}
                className="w-full py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
              >
                Add Custom Item
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => setShowCustomForm(true)}
            className="text-sm text-gray-700 hover:text-gray-900 flex items-center"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            <span>Add Custom Item</span>
          </button>
          <a
            href="/settings"
            target="_blank"
            className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
            title="Manage your items and services in Settings"
          >
            <Cog6ToothIcon className="h-4 w-4 mr-1" />
            <span>Manage Items in Settings</span>
          </a>
        </div>
        
        {selectedItems.length > 0 && (() => {
          const totals = selectedItems.reduce((acc, si) => {
            const subtotal = si.quantity * si.unit_price;
            const discount = subtotal * (Number(si.discount_rate) / 100);
            const net = subtotal - discount; // excl. VAT
            const vat = net * (Number(si.tax_rate) / 100);
            acc.net += net;
            acc.vat += vat;
            return acc;
          }, { net: 0, vat: 0 } as { net: number, vat: number });
          const gross = totals.net + totals.vat;
          return (
            <div className="text-right">
              <div className="text-sm text-gray-600">
                {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''}
              </div>
              <div className="text-xs text-gray-600">Total (excl. VAT): ${totals.net.toFixed(2)}</div>
              {totals.vat > 0 && (
                <div className="text-xs text-gray-600">VAT: ${totals.vat.toFixed(2)}</div>
              )}
              <div className="text-lg font-bold text-gray-900">Subtotal (incl. VAT): ${gross.toFixed(2)}</div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default ItemSelector;
