import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import { 
  BuildingOffice2Icon, 
  DocumentTextIcon, 
  CurrencyDollarIcon,

  PlusIcon,
  MagnifyingGlassIcon,

  EyeIcon,
  PencilIcon,
  TrashIcon,

  ClockIcon
} from '@heroicons/react/24/outline';

interface PurchaseStats {
  totalOrders: number;
  pendingOrders: number;
  approvedOrders: number;
  receivedOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  totalVendors: number;
  activeVendors: number;
}

interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  tax_id: string;
  payment_terms: string;
  credit_limit: number;
  category?: string;
  is_active: boolean;
  created_at: string;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string;
  status: 'pending' | 'approved' | 'received' | 'cancelled';
  order_date: string;
  expected_delivery_date?: string;
  total_amount: number;
  notes?: string;
  items: PurchaseOrderItem[];
  created_at: string;
  updated_at: string;
}

interface PurchaseOrderItem {
  id?: string;
  name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

const PurchasePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState<'purchase-orders' | 'vendors'>('purchase-orders');
  const [showCreatePO, setShowCreatePO] = useState(false);
  const [showCreateVendor, setShowCreateVendor] = useState(false);
  const [stats, setStats] = useState<PurchaseStats>({
    totalOrders: 0,
    pendingOrders: 0,
    approvedOrders: 0,
    receivedOrders: 0,
    totalSpent: 0,
    averageOrderValue: 0,
    totalVendors: 0,
    activeVendors: 0,
  });
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Create Purchase Order Form State
  const [newPO, setNewPO] = useState({
    vendor_id: '',
    expected_delivery_date: '',
    notes: '',
    items: [{ name: '', quantity: 1, unit_price: 0 }] as Array<{name: string, quantity: number, unit_price: number}>
  });

  // Create Vendor Form State
  const [newVendor, setNewVendor] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    tax_id: '',
    payment_terms: 'NET_30',
    credit_limit: 0,
  });

  // Filtered data
  const filteredPurchaseOrders = purchaseOrders.filter(po => 
    po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendors.find(v => v.id === po.vendor_id)?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch vendors
      const vendorsResponse = await fetch('/api/v1/vendors', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (vendorsResponse.ok) {
        const vendorsData = await vendorsResponse.json();
        setVendors(vendorsData);
      }

      // Fetch purchase orders
      const poResponse = await fetch('/api/v1/purchase-orders', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (poResponse.ok) {
        const poData = await poResponse.json();
        setPurchaseOrders(poData);
      }

      // Calculate stats
      const totalOrders = purchaseOrders.length;
      const pendingOrders = purchaseOrders.filter(po => po.status === 'pending').length;
      const approvedOrders = purchaseOrders.filter(po => po.status === 'approved').length;
      const receivedOrders = purchaseOrders.filter(po => po.status === 'received').length;
      const totalSpent = purchaseOrders.reduce((sum, po) => sum + po.total_amount, 0);
      const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
      const totalVendors = vendors.length;
      const activeVendors = vendors.filter(v => v.is_active).length;

      setStats({
        totalOrders,
        pendingOrders,
        approvedOrders,
        receivedOrders,
        totalSpent,
        averageOrderValue,
        totalVendors,
        activeVendors,
      });
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  // Form handlers
  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/v1/purchase-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newPO)
      });

      if (response.ok) {
        setShowCreatePO(false);
        setNewPO({
          vendor_id: '',
          expected_delivery_date: '',
          notes: '',
          items: [{ name: '', quantity: 1, unit_price: 0 }]
        });
        fetchData();
      }
    } catch (error) {
      console.error('Failed to create purchase order:', error);
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/v1/vendors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newVendor)
      });

      if (response.ok) {
        setShowCreateVendor(false);
        setNewVendor({
          name: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          country: '',
          postal_code: '',
          tax_id: '',
          payment_terms: 'NET_30',
          credit_limit: 0,
        });
        fetchData();
      }
    } catch (error) {
      console.error('Failed to create vendor:', error);
    }
  };

  // Helper functions for PO items
  const addPOItem = () => {
    setNewPO(prev => ({
      ...prev,
      items: [...prev.items, { name: '', quantity: 1, unit_price: 0 }]
    }));
  };

  const removePOItem = (index: number) => {
    setNewPO(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updatePOItem = (index: number, field: string, value: any) => {
    setNewPO(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const tabs = [
    { id: 'purchase-orders', label: 'Purchase Orders' },
    { id: 'vendors', label: 'Vendors' },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Purchase Management</h1>
            <p className="mt-2 text-gray-600">
              Manage vendors, purchase orders, and procurement processes
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowCreateVendor(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <BuildingOffice2Icon className="h-4 w-4 mr-2" />
              Add Vendor
            </button>
            <button
              onClick={() => setShowCreatePO(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Purchase Order
            </button>
          </div>
        </div>
      </div>

      {/* Create Purchase Order Form */}
      {showCreatePO && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex items-center mb-6">
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <DocumentTextIcon className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Create Purchase Order</h2>
            <button
              onClick={() => setShowCreatePO(false)}
              className="ml-auto text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <form onSubmit={handleCreatePO} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                  <span className="text-xs font-medium text-blue-600">1</span>
                </div>
                Basic Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                  <select
                    value={newPO.vendor_id}
                    onChange={(e) => setNewPO(prev => ({ ...prev, vendor_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map(vendor => (
                      <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={newPO.expected_delivery_date}
                    onChange={(e) => setNewPO(prev => ({ ...prev, expected_delivery_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Items */}
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                  <span className="text-xs font-medium text-blue-600">2</span>
                </div>
                Order Items
              </h3>
              
              <div className="space-y-4">
                {newPO.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border border-gray-200 rounded-lg">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updatePOItem(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter item name"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updatePOItem(index, 'quantity', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updatePOItem(index, 'unit_price', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
                      <input
                        type="text"
                        value={`$${(item.quantity * item.unit_price).toFixed(2)}`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                        disabled
                      />
                    </div>
                    
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removePOItem(index)}
                        className="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addPOItem}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-800"
                >
                  + Add Item
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                  <span className="text-xs font-medium text-blue-600">3</span>
                </div>
                Additional Information
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={newPO.notes}
                  onChange={(e) => setNewPO(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any additional notes or requirements"
                />
              </div>
            </div>

            {/* Total */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total Amount:</span>
                <span>${newPO.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={() => setShowCreatePO(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Create Purchase Order
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Vendor Form */}
      {showCreateVendor && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex items-center mb-6">
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
              <BuildingOffice2Icon className="h-5 w-5 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Add New Vendor</h2>
            <button
              onClick={() => setShowCreateVendor(false)}
              className="ml-auto text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <form onSubmit={handleCreateVendor} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-2">
                  <span className="text-xs font-medium text-green-600">1</span>
                </div>
                Basic Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name *</label>
                  <input
                    type="text"
                    value={newVendor.name}
                    onChange={(e) => setNewVendor(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={newVendor.email}
                    onChange={(e) => setNewVendor(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={newVendor.phone}
                    onChange={(e) => setNewVendor(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID</label>
                  <input
                    type="text"
                    value={newVendor.tax_id}
                    onChange={(e) => setNewVendor(prev => ({ ...prev, tax_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-2">
                  <span className="text-xs font-medium text-green-600">2</span>
                </div>
                Address Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={newVendor.address}
                    onChange={(e) => setNewVendor(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={newVendor.city}
                    onChange={(e) => setNewVendor(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State/Province</label>
                  <input
                    type="text"
                    value={newVendor.state}
                    onChange={(e) => setNewVendor(prev => ({ ...prev, state: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={newVendor.country}
                    onChange={(e) => setNewVendor(prev => ({ ...prev, country: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                  <input
                    type="text"
                    value={newVendor.postal_code}
                    onChange={(e) => setNewVendor(prev => ({ ...prev, postal_code: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
            </div>

            {/* Business Information */}
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-2">
                  <span className="text-xs font-medium text-green-600">3</span>
                </div>
                Business Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                  <select
                    value={newVendor.payment_terms}
                    onChange={(e) => setNewVendor(prev => ({ ...prev, payment_terms: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Select Payment Terms</option>
                    <option value="NET_15">Net 15</option>
                    <option value="NET_30">Net 30</option>
                    <option value="NET_45">Net 45</option>
                    <option value="NET_60">Net 60</option>
                    <option value="COD">Cash on Delivery</option>
                    <option value="PREPAID">Prepaid</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newVendor.credit_limit}
                    onChange={(e) => setNewVendor(prev => ({ ...prev, credit_limit: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={() => setShowCreateVendor(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                Add Vendor
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Orders</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900">${stats.totalSpent.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BuildingOffice2Icon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Vendors</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeVendors}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`whitespace-nowrap py-2 px-3 font-medium text-sm rounded-md transition-colors focus:outline-none focus:ring-0 ${
                    isActive ? 'text-indigo-600' : 'text-black hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow">
        {activeTab === 'purchase-orders' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Purchase Orders</h3>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Purchase Orders Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PO Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPurchaseOrders.map((po: PurchaseOrder) => (
                    <tr key={po.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {po.po_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {vendors.find(v => v.id === po.vendor_id)?.name || 'Unknown Vendor'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          po.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          po.status === 'approved' ? 'bg-green-100 text-green-800' :
                          po.status === 'received' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${po.total_amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(po.order_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => navigate(`/purchase/orders/${po.id}`)}
                            className="bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full p-2 transition-colors"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/purchase/orders/${po.id}?tab=edit`)}
                            className="bg-green-100 hover:bg-green-200 text-green-600 rounded-full p-2 transition-colors"
                            title="Edit"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {/* Add delete handler */}}
                            className="bg-red-100 hover:bg-red-200 text-red-600 rounded-full p-2 transition-colors"
                            title="Delete"
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
          </div>
        )}

        {activeTab === 'vendors' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Vendors</h3>
            </div>

            {/* Vendors Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
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
                  {filteredVendors.map((vendor: Vendor) => (
                    <tr key={vendor.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {vendor.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {vendor.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {vendor.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          vendor.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {vendor.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => navigate(`/purchase/vendors/${vendor.id}`)}
                            className="bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full p-2 transition-colors"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/purchase/vendors/${vendor.id}?tab=edit`)}
                            className="bg-green-100 hover:bg-green-200 text-green-600 rounded-full p-2 transition-colors"
                            title="Edit"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {/* Add delete handler */}}
                            className="bg-red-100 hover:bg-red-200 text-red-600 rounded-full p-2 transition-colors"
                            title="Delete"
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
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchasePage;

