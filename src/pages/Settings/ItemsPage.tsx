import React, { useEffect, useState } from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { Item, ItemCreate, ItemUpdate, ItemType, TaxType } from '../../types';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { addNotification } from '../../store/slices/notificationSlice';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  TagIcon,
  CubeIcon,
  WrenchScrewdriverIcon,
  ClockIcon,
  CurrencyDollarIcon,
  PencilIcon,
  TrashIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';

const ItemsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editForm, setEditForm] = useState<ItemUpdate>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Inline row editing
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [rowEdit, setRowEdit] = useState<{ [id: string]: ItemUpdate & { unit_price_display?: string; cost_display?: string } }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  
  const [newItem, setNewItem] = useState<ItemCreate>({
    name: '',
    description: '',
    sku: '',
    item_type: ItemType.SERVICE,
    category: '',
    unit_price: 0,
    cost: 0,
    unit: 'each',
    tax_type: TaxType.TAXABLE,
    default_tax_rate: 0,
    track_inventory: false,
    current_stock: 0,
    minimum_stock: 0,
    is_active: true,
    is_billable: true,
    tags: [],
    custom_fields: {},
    notes: ''
  });

  const [stats, setStats] = useState({
    total_items: 0,
    active_items: 0,
    services: 0,
    products: 0,
    low_stock_items: 0,
    total_value: 0
  });

  useEffect(() => {
    fetchItems();
    fetchCategories();
    fetchStats();
  }, []);

  useEffect(() => {
    // Prefill edit form when an item is selected for editing
    if (editingItem) {
      setEditForm({
        name: editingItem.name,
        description: editingItem.description,
        sku: editingItem.sku,
        item_type: editingItem.item_type,
        category: editingItem.category,
        unit_price: editingItem.unit_price,
        cost: editingItem.cost,
        unit: editingItem.unit,
        tax_type: editingItem.tax_type,
        default_tax_rate: editingItem.default_tax_rate,
        track_inventory: editingItem.track_inventory,
        current_stock: editingItem.current_stock,
        minimum_stock: editingItem.minimum_stock,
        is_active: editingItem.is_active,
        is_billable: editingItem.is_billable,
        tags: editingItem.tags,
        custom_fields: editingItem.custom_fields,
        notes: editingItem.notes,
      });
    } else {
      setEditForm({});
    }
  }, [editingItem]);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get('/items/');
      setItems(response.data.items || []);
    } catch (error: any) {
      console.error('Failed to fetch items:', error);
      setItems([]);
      
      dispatch(addNotification({
        type: 'error',
        title: 'Failed to Load Items',
        message: 'Unable to fetch items data. Please refresh the page.',
        duration: 5000,
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get('/items/categories');
      setCategories(response.data.categories || []);
    } catch (error: any) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get('/items/stats');
      setStats(response.data);
    } catch (error: any) {
      console.error('Failed to fetch item stats:', error);
      setStats({
        total_items: 0,
        active_items: 0,
        services: 0,
        products: 0,
        low_stock_items: 0,
        total_value: 0
      });
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { default: apiClient } = await import('../../api/client');
      await apiClient.post('/items/', newItem);
      
      dispatch(addNotification({
        type: 'success',
        title: 'Item Created',
        message: 'Item has been successfully created.',
        duration: 3000,
      }));
      
      setShowCreateForm(false);
      setNewItem({
        name: '',
        description: '',
        sku: '',
        item_type: ItemType.SERVICE,
        category: '',
        unit_price: 0,
        cost: 0,
        unit: 'each',
        tax_type: TaxType.TAXABLE,
        default_tax_rate: 0,
        track_inventory: false,
        current_stock: 0,
        minimum_stock: 0,
        is_active: true,
        is_billable: true,
        tags: [],
        custom_fields: {},
        notes: ''
      });
      fetchItems();
      fetchCategories();
      fetchStats();
    } catch (error: any) {
      console.error('Failed to create item:', error);
      
      let errorMessage = 'Failed to create item. Please try again.';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (Array.isArray(detail)) {
          errorMessage = detail.map((err: any) => err.msg || err.message || 'Validation error').join(', ');
        }
      }
      
      dispatch(addNotification({
        type: 'error',
        title: 'Creation Failed',
        message: errorMessage,
        duration: 5000,
      }));
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      setIsSavingEdit(true);
      const { default: apiClient } = await import('../../api/client');
      // Send only mutable fields via ItemUpdate schema
      await apiClient.put(`/items/${editingItem.id}`, editForm);
      
      dispatch(addNotification({
        type: 'success',
        title: 'Item Updated',
        message: 'Item has been successfully updated.',
        duration: 3000,
      }));
      
      setEditingItem(null);
      fetchItems();
      fetchCategories();
      fetchStats();
    } catch (error: any) {
      console.error('Failed to update item:', error);
      
      let errorMessage = 'Failed to update item. Please try again.';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (Array.isArray(detail)) {
          errorMessage = detail.map((err: any) => err.msg || err.message || 'Validation error').join(', ');
        }
      }
      
      dispatch(addNotification({
        type: 'error',
        title: 'Update Failed',
        message: errorMessage,
        duration: 5000,
      }));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      const { default: apiClient } = await import('../../api/client');
      await apiClient.delete(`/items/${itemId}`);
      
      dispatch(addNotification({
        type: 'success',
        title: 'Item Deleted',
        message: 'Item has been successfully deleted.',
        duration: 3000,
      }));
      
      fetchItems();
      fetchStats();
    } catch (error: any) {
      console.error('Failed to delete item:', error);
      
      let errorMessage = 'Failed to delete item. Please try again.';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (Array.isArray(detail)) {
          errorMessage = detail.map((err: any) => err.msg || err.message || 'Validation error').join(', ');
        }
      }
      
      dispatch(addNotification({
        type: 'error',
        title: 'Deletion Failed',
        message: errorMessage,
        duration: 5000,
      }));
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !selectedType || item.item_type === selectedType;
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    const matchesStatus = !selectedStatus || 
      (selectedStatus === 'active' && item.is_active) ||
      (selectedStatus === 'inactive' && !item.is_active);
    
    return matchesSearch && matchesType && matchesCategory && matchesStatus;
  });

  const getItemTypeIcon = (type: ItemType) => {
    switch (type) {
      case ItemType.SERVICE: return <WrenchScrewdriverIcon className="h-5 w-5" />;
      case ItemType.PRODUCT: return <CubeIcon className="h-5 w-5" />;
      case ItemType.TIME: return <ClockIcon className="h-5 w-5" />;
      default: return <TagIcon className="h-5 w-5" />;
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

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const formatCurrency = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  if (isLoading) {
    return <LoadingSpinner size="large" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Items & Services</h1>
          <p className="text-gray-600">Manage your service offerings and product catalog</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-500 transition-colors flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Add Item</span>
        </button>
      </div>
      
      {/* Edit Item Modal (disabled in favor of inline editing) */}
      {false && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-40" onClick={() => setEditingItem(null)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Edit Item</h2>
              <button
                onClick={() => setEditingItem(null)}
                className="text-secondary-600 hover:text-secondary-900"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleUpdateItem} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name ?? ''}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">SKU</label>
                  <input
                    type="text"
                    value={editForm.sku ?? ''}
                    onChange={(e) => setEditForm({...editForm, sku: e.target.value})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <select
                    value={editForm.item_type ?? editingItem?.item_type ?? ''}
                    onChange={(e) => setEditForm({...editForm, item_type: e.target.value as ItemType})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value={ItemType.SERVICE}>Service</option>
                    <option value={ItemType.PRODUCT}>Product</option>
                    <option value={ItemType.TIME}>Time</option>
                    <option value={ItemType.EXPENSE}>Expense</option>
                    <option value={ItemType.MATERIAL}>Material</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <input
                    type="text"
                    value={editForm.category ?? ''}
                    onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Unit Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={((editForm.unit_price ?? editingItem?.unit_price ?? 0) / 100).toFixed(2)}
                    onChange={(e) => setEditForm({...editForm, unit_price: Math.round(parseFloat(e.target.value || '0') * 100)})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={((editForm.cost ?? editingItem?.cost ?? 0) / 100).toFixed(2)}
                    onChange={(e) => setEditForm({...editForm, cost: Math.round(parseFloat(e.target.value || '0') * 100)})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Unit</label>
                  <input
                    type="text"
                    value={editForm.unit ?? editingItem?.unit ?? ''}
                    onChange={(e) => setEditForm({...editForm, unit: e.target.value})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Default Tax Rate (%)</label>
                  <input
                    type="number"
                    value={(editForm.default_tax_rate ?? editingItem?.default_tax_rate ?? 0) / 100}
                    onChange={(e) => setEditForm({...editForm, default_tax_rate: Math.round(parseFloat(e.target.value || '0') * 100)})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  rows={3}
                  value={editForm.description ?? ''}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editForm.is_billable ?? editingItem?.is_billable ?? false}
                    onChange={(e) => setEditForm({...editForm, is_billable: e.target.checked})}
                    className="h-4 w-4 text-user-blue focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Billable</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editForm.track_inventory ?? editingItem?.track_inventory ?? false}
                    onChange={(e) => setEditForm({...editForm, track_inventory: e.target.checked})}
                    className="h-4 w-4 text-user-blue focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Track Inventory</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editForm.is_active ?? editingItem?.is_active ?? true}
                    onChange={(e) => setEditForm({...editForm, is_active: e.target.checked})}
                    className="h-4 w-4 text-user-blue focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active</span>
                </label>
              </div>

              {editForm.track_inventory || editingItem?.track_inventory ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Current Stock</label>
                    <input
                      type="number"
                      value={editForm.current_stock ?? editingItem?.current_stock ?? 0}
                      onChange={(e) => setEditForm({...editForm, current_stock: parseInt(e.target.value || '0', 10)})}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Minimum Stock</label>
                    <input
                      type="number"
                      value={editForm.minimum_stock ?? editingItem?.minimum_stock ?? 0}
                      onChange={(e) => setEditForm({...editForm, minimum_stock: parseInt(e.target.value || '0', 10)})}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 border border-secondary-300 rounded-md text-secondary-700 hover:bg-secondary-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-500 transition-colors disabled:opacity-50"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Item Form */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Add New Item</h2>
          <form onSubmit={handleCreateItem} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name *</label>
                <input
                  type="text"
                  required
                  value={newItem.name}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">SKU</label>
                <input
                  type="text"
                  value={newItem.sku}
                  onChange={(e) => setNewItem({...newItem, sku: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={newItem.item_type}
                  onChange={(e) => setNewItem({...newItem, item_type: e.target.value as ItemType})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value={ItemType.SERVICE}>Service</option>
                  <option value={ItemType.PRODUCT}>Product</option>
                  <option value={ItemType.TIME}>Time</option>
                  <option value={ItemType.EXPENSE}>Expense</option>
                  <option value={ItemType.MATERIAL}>Material</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <input
                  type="text"
                  value={newItem.category}
                  onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Unit Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newItem.unit_price / 100}
                  onChange={(e) => setNewItem({...newItem, unit_price: Math.round(parseFloat(e.target.value || '0') * 100)})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Unit</label>
                <input
                  type="text"
                  value={newItem.unit}
                  onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                  placeholder="each, hour, piece, kg..."
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                rows={3}
                value={newItem.description}
                onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newItem.is_billable}
                  onChange={(e) => setNewItem({...newItem, is_billable: e.target.checked})}
                  className="h-4 w-4 text-user-blue focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Billable</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newItem.track_inventory}
                  onChange={(e) => setNewItem({...newItem, track_inventory: e.target.checked})}
                  className="h-4 w-4 text-user-blue focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Track Inventory</span>
              </label>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-secondary-300 rounded-md text-secondary-700 hover:bg-secondary-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-500 transition-colors"
              >
                Create Item
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TagIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_items}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <WrenchScrewdriverIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Services</p>
              <p className="text-2xl font-bold text-gray-900">{stats.services}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <CubeIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Products</p>
              <p className="text-2xl font-bold text-gray-900">{stats.products}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Inventory Value</p>
              <p className="text-2xl font-bold text-gray-900">${formatCurrency(stats.total_value)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All Types</option>
            <option value={ItemType.SERVICE}>Service</option>
            <option value={ItemType.PRODUCT}>Product</option>
            <option value={ItemType.TIME}>Time</option>
            <option value={ItemType.EXPENSE}>Expense</option>
            <option value={ItemType.MATERIAL}>Material</option>
          </select>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Items List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Items ({filteredItems.length})
          </h3>
        </div>
        
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <TagIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding your first item or service.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-secondary-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          {getItemTypeIcon(item.item_type)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {item.display_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.description || 'No description'}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getItemTypeColor(item.item_type)}`}>
                        {item.item_type}
                      </span>
                      {item.category && (
                        <div className="text-xs text-gray-500 mt-1">{item.category}</div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingRowId === item.id ? (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <label className="text-xs text-gray-600">Price ($)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={rowEdit[item.id]?.unit_price_display ?? (item.unit_price / 100)}
                              onChange={(e) => setRowEdit((prev) => ({
                                ...prev,
                                [item.id]: { ...(prev[item.id] || {}), unit_price_display: e.target.value }
                              }))}
                              className="w-28 text-sm border border-gray-300 rounded-md px-2 py-1"
                            />
                            <span className="text-xs text-gray-500">/ {rowEdit[item.id]?.unit ?? item.unit}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <label className="text-xs text-gray-600">Cost ($)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={rowEdit[item.id]?.cost_display ?? (item.cost / 100)}
                              onChange={(e) => setRowEdit((prev) => ({
                                ...prev,
                                [item.id]: { ...(prev[item.id] || {}), cost_display: e.target.value }
                              }))}
                              className="w-28 text-sm border border-gray-300 rounded-md px-2 py-1"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-900">
                          ${formatCurrency(item.unit_price)} / {item.unit}
                          {item.cost > 0 && (
                            <div className="text-xs text-gray-500">Cost: ${formatCurrency(item.cost)}</div>
                          )}
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.track_inventory ? (
                        <div className="text-sm text-gray-900">
                          {item.current_stock} {item.unit}
                          {item.current_stock <= item.minimum_stock && (
                            <span className="ml-1 text-red-500">⚠️</span>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">N/A</div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.is_active)}`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {editingRowId === item.id ? (
                          <>
                            <button
                              onClick={async () => {
                                try {
                                  setIsSavingEdit(true);
                                  const data = rowEdit[item.id] || {};
                                  // Convert display strings to cents
                                  const payload: ItemUpdate = { ...data };
                                  if (typeof data.unit_price_display === 'string') {
                                    const val = parseFloat(data.unit_price_display.replace(/,/g, ''));
                                    if (!isNaN(val)) payload.unit_price = Math.round(val * 100);
                                    delete (payload as any).unit_price_display;
                                  }
                                  if (typeof data.cost_display === 'string') {
                                    const val = parseFloat(data.cost_display.replace(/,/g, ''));
                                    if (!isNaN(val)) payload.cost = Math.round(val * 100);
                                    delete (payload as any).cost_display;
                                  }
                                  const { default: apiClient } = await import('../../api/client');
                                  await apiClient.put(`/items/${item.id}`, payload);
                                  setEditingRowId(null);
                                  setRowEdit((prev) => { const p = { ...prev }; delete p[item.id]; return p; });
                                  fetchItems();
                                  fetchStats();
                                  dispatch(addNotification({ type: 'success', title: 'Item Updated', message: 'Changes saved.', duration: 3000 }));
                                } catch (e:any) {
                                  dispatch(addNotification({ type: 'error', title: 'Update Failed', message: e?.response?.data?.detail || 'Unable to save changes', duration: 5000 }));
                                } finally {
                                  setIsSavingEdit(false);
                                }
                              }}
                              className="text-green-600 hover:text-green-800"
                              title="Save"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => { setEditingRowId(null); setRowEdit((prev) => { const p = { ...prev }; delete p[item.id]; return p; }); }}
                              className="text-gray-600 hover:text-gray-800 ml-2"
                              title="Cancel"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingRowId(item.id);
                              setRowEdit((prev) => ({
                                ...prev,
                                [item.id]: {
                                  name: item.name,
                                  description: item.description,
                                  sku: item.sku,
                                  item_type: item.item_type as any,
                                  category: item.category,
                                  unit_price: item.unit_price,
                                  cost: item.cost,
                                  unit: item.unit,
                                  tax_type: item.tax_type as any,
                                  default_tax_rate: item.default_tax_rate,
                                  track_inventory: item.track_inventory,
                                  current_stock: item.current_stock,
                                  minimum_stock: item.minimum_stock,
                                  is_active: item.is_active,
                                  is_billable: item.is_billable,
                                  tags: item.tags,
                                  custom_fields: item.custom_fields,
                                  notes: item.notes,
                                  unit_price_display: (item.unit_price / 100).toString(),
                                  cost_display: (item.cost / 100).toString(),
                                }
                              }));
                            }}
                            className="text-user-blue hover:text-primary-900"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemsPage;
