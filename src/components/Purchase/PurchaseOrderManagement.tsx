import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { PlusIcon, EyeIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';

interface Item {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  unit_price: number;
  unit: string;
  is_active: boolean;
  display_name: string;
  unit_price_display: number;
}

interface Vendor {
  id: string;
  name: string;
  email: string;
  payment_terms: string;
}

interface Project {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
}

interface PurchaseOrderItem {
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  description?: string;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string;
  vendor_name: string;
  project_id?: string;
  customer_id?: string;
  order_date: string;
  expected_delivery_date: string;
  received_date?: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes: string;
  created_at: string;
  updated_at: string;
  items: PurchaseOrderItem[];
}

interface PurchaseOrderFormData {
  vendor_id: string;
  project_id?: string;
  customer_id?: string;
  expected_delivery_date: string;
  received_date?: string;
  notes: string;
  items: PurchaseOrderItem[];
}

const PurchaseOrderManagement: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [projectFilter, setProjectFilter] = useState<string>('ALL');
  const [customerFilter, setCustomerFilter] = useState<string>('ALL');
  
  const [formData, setFormData] = useState<PurchaseOrderFormData>({
    vendor_id: '',
    expected_delivery_date: '',
    notes: '',
    items: [],
  });

  const [currentItem, setCurrentItem] = useState({
    item_id: '',
    quantity: 1,
    unit_price: 0,
    description: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

const fetchData = async () => {
    try {
      setLoading(true);
      const [poResponse, vendorResponse, itemResponse, projectResponse, customerResponse] = await Promise.all([
        apiClient.get('/purchase-orders/').catch(() => ({ data: [] })),
        apiClient.get('/vendors/').catch(() => ({ data: [] })),
        apiClient.get('/items/').catch(() => ({ data: [] })),
        apiClient.get('/projects/').catch(() => ({ data: [] })),
        apiClient.get('/customers/').catch(() => ({ data: [] })),
      ]);
      
      setPurchaseOrders(Array.isArray(poResponse.data?.purchase_orders) ? poResponse.data.purchase_orders : (Array.isArray(poResponse.data) ? poResponse.data : []));
      setVendors(Array.isArray(vendorResponse.data?.vendors) ? vendorResponse.data.vendors : (Array.isArray(vendorResponse.data) ? vendorResponse.data : []));
      setItems(Array.isArray(itemResponse.data?.items) ? itemResponse.data.items : (Array.isArray(itemResponse.data) ? itemResponse.data : []));
      setProjects(Array.isArray(projectResponse.data?.projects) ? projectResponse.data.projects : (Array.isArray(projectResponse.data) ? projectResponse.data : []));
      setCustomers(Array.isArray(customerResponse.data?.customers) ? customerResponse.data.customers : (Array.isArray(customerResponse.data) ? customerResponse.data : []));
    } catch (error) {
      console.error('Error fetching data:', error);
      // Ensure arrays are always set on error
      setPurchaseOrders([]);
      setVendors([]);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const today = new Date();
      const orderDate = today.toISOString().slice(0, 10);
      const requester = 'Requester';

      const payload: any = {
        vendor_id: formData.vendor_id,
        project_id: formData.project_id || undefined,
        customer_id: formData.customer_id || undefined,
        order_date: orderDate,
        expected_delivery_date: formData.expected_delivery_date || undefined,
        received_date: formData.received_date || undefined,
        priority: 'medium',
        department: 'Purchasing',
        requested_by: requester,
        shipping_address: '',
        payment_method: 'net_30',
        notes: formData.notes || undefined,
        items: formData.items.map((it) => ({
          item_id: (it as any).item_id || undefined,
          item_name: it.item_name,
          quantity: it.quantity,
          unit_price: it.unit_price,
          description: it.description,
        })),
      };

      if (editingPO) {
        await apiClient.put(`/purchase-orders/${editingPO.id}`, payload);
      } else {
        await apiClient.post('/purchase-orders/', payload);
      }
      await fetchData();
      resetForm();
    } catch (error) {
      console.error('Error saving purchase order:', error);
    }
  };

const handleEdit = (po: PurchaseOrder) => {
    setEditingPO(po);
    setFormData({
      vendor_id: po.vendor_id,
      project_id: po.project_id,
      customer_id: po.customer_id,
      expected_delivery_date: (po.expected_delivery_date && po.expected_delivery_date.split) ? po.expected_delivery_date.split('T')[0] : (po.expected_delivery_date || ''),
      received_date: (po.received_date && (po.received_date as any).split) ? (po.received_date as any).split('T')[0] : (po.received_date || ''),
      notes: po.notes,
      items: po.items,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this purchase order?')) {
      try {
        await apiClient.delete(`/purchase-orders/${id}`);
        await fetchData();
      } catch (error) {
        console.error('Error deleting purchase order:', error);
      }
    }
  };

const handleStatusChange = async (id: string, status: string) => {
    try {
      await apiClient.patch(`/purchase-orders/${id}/status`, { status });
      await fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDownloadPdf = async (id: string, poNumber?: string) => {
    try {
      const response = await apiClient.get(`/purchase-orders/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `purchase_order_${poNumber || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download purchase order PDF:', error);
    }
  };

  const addItem = () => {
    const selectedItem = (items || []).find(item => item.id === currentItem.item_id);
    if (!selectedItem) return;

    const newItem: PurchaseOrderItem = {
      item_id: currentItem.item_id,
      item_name: selectedItem.display_name,
      quantity: currentItem.quantity,
      unit_price: currentItem.unit_price || selectedItem.unit_price_display,
      total: currentItem.quantity * (currentItem.unit_price || selectedItem.unit_price_display),
      description: currentItem.description,
    };

    setFormData({
      ...formData,
      items: [...formData.items, newItem],
    });

    setCurrentItem({
      item_id: '',
      quantity: 1,
      unit_price: 0,
      description: '',
    });
  };

  const removeItem = (index: number) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: updatedItems });
  };

const resetForm = () => {
    setFormData({
      vendor_id: '',
      project_id: '',
      customer_id: '',
      expected_delivery_date: '',
      received_date: '',
      notes: '',
      items: [],
    });
    setCurrentItem({
      item_id: '',
      quantity: 1,
      unit_price: 0,
      description: '',
    });
    setEditingPO(null);
    setShowForm(false);
  };

  const filteredPOs = (purchaseOrders || []).filter(po => {
    const matchesSearch = 
      (po.po_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (po.vendor_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const statusUpper = (po.status || '').toString().toUpperCase();
    const matchesStatus = statusFilter === 'ALL' || statusUpper === statusFilter;
    const matchesProject = projectFilter === 'ALL' || po.project_id === projectFilter;
    const matchesCustomer = customerFilter === 'ALL' || po.customer_id === customerFilter;
    
    return matchesSearch && matchesStatus && matchesProject && matchesCustomer;
  });

  const getStatusColor = (status: string) => {
    const colors = {
      DRAFT: 'bg-gray-100 text-gray-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-blue-100 text-blue-800',
      ORDERED: 'bg-purple-100 text-purple-800',
      RECEIVED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    } as const;
    const key = (status || '').toString().toUpperCase() as keyof typeof colors;
    return colors[key] || 'bg-gray-100 text-gray-800';
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + item.total, 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Purchase Order Management</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Create Purchase Order
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search purchase orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="ALL">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="ORDERED">Ordered</option>
          <option value="RECEIVED">Received</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="ALL">All Projects</option>
          {(projects || []).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={customerFilter}
          onChange={(e) => setCustomerFilter(e.target.value)}
          className="py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="ALL">All Customers</option>
          {(customers || []).map((c) => {
            const name = c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.id;
            return (
              <option key={c.id} value={c.id}>{name}</option>
            );
          })}
        </select>
      </div>

      {/* Purchase Order Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingPO ? 'Edit Purchase Order' : 'Create New Purchase Order'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor *
                  </label>
                  <select
                    required
                    value={formData.vendor_id}
                    onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                    className="w-full py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select Vendor</option>
                    {(vendors || []).map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={formData.expected_delivery_date}
                    onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                    className="w-full py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date</label>
                  <input
                    type="date"
                    value={formData.received_date || ''}
                    onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
                    className="w-full py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                  <select
                    value={formData.project_id || ''}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                    className="w-full py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select Project (optional)</option>
                    {(projects || []).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                  <select
                    value={formData.customer_id || ''}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                    className="w-full py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select Customer (optional)</option>
                    {(customers || []).map((c) => {
                      const name = c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unnamed';
                      return (
                        <option key={c.id} value={c.id}>{name}</option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Items Section */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Items</h4>
                
                {/* Add Item Form */}
                <div className="bg-gray-50 p-4 rounded-md mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div>
                      <select
                        value={currentItem.item_id}
                        onChange={(e) => {
                          const selectedItem = (items || []).find(item => item.id === e.target.value);
                          setCurrentItem({
                            ...currentItem,
                            item_id: e.target.value,
                            unit_price: selectedItem?.unit_price_display || 0,
                          });
                        }}
                        className="w-full py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">Select Item</option>
                        {(items || []).filter(item => item.is_active).map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.display_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Quantity"
                        min="1"
                        value={currentItem.quantity}
                        onChange={(e) => setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) || 1 })}
                        className="w-full py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Unit Price"
                        step="0.01"
                        value={currentItem.unit_price}
                        onChange={(e) => setCurrentItem({ ...currentItem, unit_price: parseFloat(e.target.value) || 0 })}
                        className="w-full py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Description"
                        value={currentItem.description}
                        onChange={(e) => setCurrentItem({ ...currentItem, description: e.target.value })}
                        className="w-full py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={addItem}
                        disabled={!currentItem.item_id}
                        className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                      >
                        Add Item
                      </button>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                {formData.items.length > 0 && (
                  <div className="border border-gray-200 rounded-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {formData.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.item_name}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">${item.unit_price.toFixed(2)}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">${item.total.toFixed(2)}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50">
                          <td colSpan={3} className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                            Subtotal:
                          </td>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">
                            ${calculateSubtotal().toFixed(2)}
                          </td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formData.items.length === 0}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {editingPO ? 'Update' : 'Create'} Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Purchase Orders ({filteredPOs.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-secondary-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                PO Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vendor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Amount
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
            {filteredPOs.map((po) => (
              <tr key={po.id} className="hover:bg-secondary-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {po.po_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {po.vendor_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {projects.find((p) => p.id === po.project_id)?.name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {(function(){
                    const c = customers.find((x) => x.id === po.customer_id);
                    if (!c) return '-';
                    return c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.id;
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(po.order_date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${po.total_amount.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={po.status}
                    onChange={(e) => handleStatusChange(po.id, e.target.value)}
                    className={`text-xs font-semibold rounded-full px-2 border-none ${getStatusColor(po.status)}`}
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="ORDERED">Ordered</option>
                    <option value="RECEIVED">Received</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedPO(po);
                        setShowDetails(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(po)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDownloadPdf(po.id, po.po_number)}
                      className="text-gray-600 hover:text-gray-900"
                      title="Download PDF"
                    >
                      <DocumentArrowDownIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(po.id)}
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
        {filteredPOs.length === 0 && (
          <div className="text-center2">
            <div className="text-gray-500 text-lg">No purchase orders found</div>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Create Your First Purchase Order
            </button>
          </div>
        )}
      </div>

      {/* Purchase Order Details Modal */}
      {showDetails && selectedPO && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Purchase Order Details - {selectedPO.po_number}
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Vendor</label>
                  <p className="text-sm text-gray-900">{selectedPO.vendor_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${getStatusColor(selectedPO.status)}`}>
                    {selectedPO.status}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Project</label>
                  <p className="text-sm text-gray-900">{projects.find(p => p.id === selectedPO.project_id)?.name || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Customer</label>
                  <p className="text-sm text-gray-900">{(() => {
                    const c = customers.find(x => x.id === selectedPO.customer_id);
                    return c ? (c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.id) : '-';
                  })()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Order Date</label>
                  <p className="text-sm text-gray-900">{new Date(selectedPO.order_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Expected Delivery</label>
                  <p className="text-sm text-gray-900">{selectedPO.expected_delivery_date ? new Date(selectedPO.expected_delivery_date).toLocaleDateString() : '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Delivery Date</label>
                  <p className="text-sm text-gray-900">{selectedPO.received_date ? new Date(selectedPO.received_date).toLocaleDateString() : '-'}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Items</label>
                <div className="mt-2 border border-gray-200 rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedPO.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.item_name}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">${item.unit_price.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">${item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium text-gray-500">Subtotal</label>
                  <p className="text-sm text-gray-900">${selectedPO.subtotal.toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Tax</label>
                  <p className="text-sm text-gray-900">${selectedPO.tax_amount.toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Total</label>
                  <p className="text-lg font-bold text-gray-900">${selectedPO.total_amount.toFixed(2)}</p>
                </div>
              </div>

              {selectedPO.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Notes</label>
                  <p className="text-sm text-gray-900">{selectedPO.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderManagement;
