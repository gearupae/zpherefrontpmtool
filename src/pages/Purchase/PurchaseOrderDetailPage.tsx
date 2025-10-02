import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import { 
  ArrowLeftIcon, 
  PencilIcon, 
  TrashIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  TruckIcon,
  DocumentTextIcon,

  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PrinterIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import { useAppDispatch } from '../../hooks/redux';
import { addNotification } from '../../store/slices/notificationSlice';
import { apiClient } from '../../api/client';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

// Download PDF helper
const downloadPurchaseOrderPDF = async (id: string, poNumber?: string) => {
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

interface PurchaseOrderItem {
  id: string;
  item_name: string;
  description?: string;
  sku?: string;
  category?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  quantity_received: number;
  quantity_pending: number;
  notes?: string;
}

interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  contact_person?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string;
  vendor?: Vendor;
  vendor_name?: string;
  project_id?: string;
  customer_id?: string;
  order_date: string;
  expected_delivery_date?: string;
  received_date?: string;
  status: string;
  priority: string;
  department?: string;
  requested_by?: string;
  shipping_address?: string;
  payment_method: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  notes?: string;
  terms_and_conditions?: string;
  internal_reference?: string;
  items: PurchaseOrderItem[];
  created_at: string;
  updated_at: string;
}

const PurchaseOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const { user } = useAppSelector((state) => state.auth);
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [projects, setProjects] = useState<Array<{id: string; name: string}>>([]);
  const [customers, setCustomers] = useState<Array<{id: string; first_name?: string; last_name?: string; company_name?: string}>>([]);
  const [editFormData, setEditFormData] = useState({
    expected_delivery_date: '',
    received_date: '',
    project_id: '',
    customer_id: '',
    department: '',
    requested_by: '',
    shipping_address: '',
    notes: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });


  // Helper function to get the correct purchase page path with tenant context
  const getPurchasePath = useCallback(() => {
    const tenantSlug = user?.organization?.slug;
    return tenantSlug ? `/${tenantSlug}/purchase` : '/purchase';
  }, [user?.organization?.slug]);

  const fetchPurchaseOrderDetails = useCallback(async () => {
    try {
      const response = await apiClient.get(`/purchase-orders/${id}`);
      setPurchaseOrder(response.data);
    } catch (error) {
      console.error('Failed to fetch purchase order details:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load purchase order details',
        duration: 5000,
      }));
      navigate(getPurchasePath());
    } finally {
      setIsLoading(false);
    }
  }, [id, dispatch, navigate, getPurchasePath]);

  useEffect(() => {
    if (id) {
      // If URL has ?tab=edit, open edit mode automatically
      if (searchParams.get('tab') === 'edit') {
        setIsEditing(true);
      }
      fetchPurchaseOrderDetails();
    }
  }, [id, fetchPurchaseOrderDetails, searchParams]);

  // Fetch supporting lists for project and customer selection
  useEffect(() => {
    const loadLists = async () => {
      try {
        const [projRes, custRes] = await Promise.all([
          apiClient.get('/projects/').catch(() => ({ data: [] })),
          apiClient.get('/customers/').catch(() => ({ data: [] })),
        ]);
        const projData = projRes.data?.projects || projRes.data || [];
        const custData = custRes.data?.customers || custRes.data || [];
        setProjects(Array.isArray(projData) ? projData.map((p: any) => ({ id: p.id, name: p.name || p.slug || 'Untitled Project' })) : []);
        setCustomers(Array.isArray(custData) ? custData : []);
      } catch (e) {
        setProjects([]);
        setCustomers([]);
      }
    };
    loadLists();
  }, []);

  const handleEditClick = () => {
    if (purchaseOrder) {
      setEditFormData({
        expected_delivery_date: purchaseOrder.expected_delivery_date ? purchaseOrder.expected_delivery_date.split('T')[0] : '',
        received_date: purchaseOrder.received_date ? purchaseOrder.received_date.split('T')[0] : '',
        project_id: purchaseOrder.project_id || '',
        customer_id: purchaseOrder.customer_id || '',
        department: purchaseOrder.department || '',
        requested_by: purchaseOrder.requested_by || '',
        shipping_address: purchaseOrder.shipping_address || '',
        notes: purchaseOrder.notes || '',
        priority: (purchaseOrder.priority as 'low' | 'medium' | 'high') || 'medium'
      });
      setIsEditing(true);
    }
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditFormData({
      expected_delivery_date: '',
      received_date: '',
      project_id: '',
      customer_id: '',
      department: '',
      requested_by: '',
      shipping_address: '',
      notes: '',
      priority: 'medium'
    });
  };

  const handleEditSave = async () => {
    if (!purchaseOrder) return;

    try {
      const payload: any = {
        ...editFormData,
        project_id: editFormData.project_id || undefined,
        customer_id: editFormData.customer_id || undefined,
        expected_delivery_date: editFormData.expected_delivery_date || undefined,
        received_date: editFormData.received_date || undefined,
      };
      const response = await apiClient.put(`/purchase-orders/${purchaseOrder.id}`, payload);
      setPurchaseOrder(response.data);
      setIsEditing(false);
      dispatch(addNotification({
        type: 'success',
        title: 'Purchase Order Updated',
        message: 'Purchase order has been successfully updated.',
        duration: 3000,
      }));
    } catch (error) {
      console.error('Failed to update purchase order:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update purchase order. Please try again.',
        duration: 5000,
      }));
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!purchaseOrder) return;

    try {
      await apiClient.patch(`/purchase-orders/${purchaseOrder.id}/status`, {
        status: newStatus
      });
      
      setPurchaseOrder(prev => prev ? { ...prev, status: newStatus } : null);
      
      dispatch(addNotification({
        type: 'success',
        title: 'Status Updated',
        message: `Purchase order status updated to ${newStatus}`,
        duration: 3000,
      }));
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update status',
        duration: 5000,
      }));
    }
  };

  const handleDeletePurchaseOrder = async () => {
    if (!purchaseOrder || !window.confirm('Are you sure you want to delete this purchase order?')) {
      return;
    }

    try {
      await apiClient.delete(`/purchase-orders/${purchaseOrder.id}`);
      dispatch(addNotification({
        type: 'success',
        title: 'Purchase Order Deleted',
        message: 'Purchase order has been successfully deleted.',
        duration: 3000,
      }));
      navigate(getPurchasePath());
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete purchase order',
        duration: 5000,
      }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'ordered': return 'bg-indigo-100 text-indigo-800';
      case 'partially_received': return 'bg-orange-100 text-orange-800';
      case 'received': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft': return <DocumentTextIcon className="h-5 w-5" />;
      case 'pending': return <ClockIcon className="h-5 w-5" />;
      case 'approved': return <CheckCircleIcon className="h-5 w-5" />;
      case 'ordered': return <PaperAirplaneIcon className="h-5 w-5" />;
      case 'partially_received': return <TruckIcon className="h-5 w-5" />;
      case 'received': return <CheckCircleIcon className="h-5 w-5" />;
      case 'cancelled': return <ExclamationTriangleIcon className="h-5 w-5" />;
      default: return <DocumentTextIcon className="h-5 w-5" />;
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!purchaseOrder) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Purchase Order Not Found</h2>
          <p className="text-gray-600 mb-4">The purchase order you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate(getPurchasePath())}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Purchase
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(getPurchasePath())}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{purchaseOrder.po_number}</h1>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(purchaseOrder.status)}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(purchaseOrder.status)}`}>
                      {purchaseOrder.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(purchaseOrder.priority)}`}>
                    {purchaseOrder.priority} Priority
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <PrinterIcon className="h-4 w-4 mr-2" />
                Print
              </button>
              <button
                onClick={() => downloadPurchaseOrderPDF(purchaseOrder.id, purchaseOrder.po_number)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <DocumentTextIcon className="h-4 w-4 mr-2" />
                Download PDF
              </button>
              <button
                onClick={handleEditClick}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit
              </button>
              <button
                onClick={handleDeletePurchaseOrder}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Purchase Order Details */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Purchase Order Details</h3>
                  {isEditing && (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleEditSave}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleEditCancel}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                
                {isEditing ? (
                  // Edit Form
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Expected Delivery Date</label>
                        <input
                          type="date"
                          value={editFormData.expected_delivery_date}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, expected_delivery_date: e.target.value }))}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Delivery Date</label>
                        <input
                          type="date"
                          value={editFormData.received_date}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, received_date: e.target.value }))}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Project</label>
                        <select
                          value={editFormData.project_id}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, project_id: e.target.value }))}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        >
                          <option value="">Select Project (optional)</option>
                          {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Department</label>
                        <input
                          type="text"
                          value={editFormData.department}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, department: e.target.value }))}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Requested By</label>
                        <input
                          type="text"
                          value={editFormData.requested_by}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, requested_by: e.target.value }))}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Priority</label>
                        <select
                          value={editFormData.priority}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' }))}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Customer</label>
                        <select
                          value={editFormData.customer_id}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, customer_id: e.target.value }))}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        >
                          <option value="">Select Customer (optional)</option>
                          {customers.map(c => {
                            const name = c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unnamed';
                            return <option key={c.id} value={c.id}>{name}</option>;
                          })}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Shipping Address</label>
                        <textarea
                          value={editFormData.shipping_address}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, shipping_address: e.target.value }))}
                          rows={3}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Notes</label>
                        <textarea
                          value={editFormData.notes}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                          rows={3}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-500">Vendor</p>
                            <p className="text-sm text-gray-900">{purchaseOrder.vendor?.name || purchaseOrder.vendor_name}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <CalendarIcon className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-500">Order Date</p>
                            <p className="text-sm text-gray-900">
                              {new Date(purchaseOrder.order_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {purchaseOrder.expected_delivery_date && (
                          <div className="flex items-center space-x-3">
                            <TruckIcon className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-500">Expected Delivery</p>
                              <p className="text-sm text-gray-900">
                                {new Date(purchaseOrder.expected_delivery_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center space-x-3">
                          <TruckIcon className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-500">Delivery Date</p>
                            <p className="text-sm text-gray-900">
                              {purchaseOrder.received_date ? new Date(purchaseOrder.received_date).toLocaleDateString() : '-'}
                            </p>
                          </div>
                        </div>

                        {purchaseOrder.department && (
                          <div className="flex items-center space-x-3">
                            <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-500">Department</p>
                              <p className="text-sm text-gray-900">{purchaseOrder.department}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Project</p>
                          <p className="text-sm text-gray-900">{projects.find(p => p.id === purchaseOrder.project_id)?.name || '-'}</p>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-gray-500">Customer</p>
                          <p className="text-sm text-gray-900">{(() => {
                            const c = customers.find(x => x.id === purchaseOrder.customer_id);
                            return c ? (c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.id) : '-';
                          })()}</p>
                        </div>

                        {purchaseOrder.requested_by && (
                          <div>
                            <p className="text-sm font-medium text-gray-500">Requested By</p>
                            <p className="text-sm text-gray-900">{purchaseOrder.requested_by}</p>
                          </div>
                        )}

                        <div>
                          <p className="text-sm font-medium text-gray-500">Payment Method</p>
                          <p className="text-sm text-gray-900">
                            {purchaseOrder.payment_method.replace('_', ' ').toUpperCase()}
                          </p>
                        </div>

                        {purchaseOrder.internal_reference && (
                          <div>
                            <p className="text-sm font-medium text-gray-500">Internal Reference</p>
                            <p className="text-sm text-gray-900">{purchaseOrder.internal_reference}</p>
                          </div>
                        )}

                        {purchaseOrder.shipping_address && (
                          <div>
                            <p className="text-sm font-medium text-gray-500">Shipping Address</p>
                            <p className="text-sm text-gray-900 whitespace-pre-line">
                              {purchaseOrder.shipping_address}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {purchaseOrder.notes && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Notes</h4>
                        <p className="text-sm text-gray-900 whitespace-pre-line">{purchaseOrder.notes}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">Items</h3>
                
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Item
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Qty
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {purchaseOrder.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.item_name}</div>
                              {item.description && (
                                <div className="text-sm text-gray-500">{item.description}</div>
                              )}
                              {item.sku && (
                                <div className="text-xs text-gray-400">SKU: {item.sku}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${item.unit_price.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${item.total_price.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {item.quantity_received >= item.quantity ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Received
                              </span>
                            ) : item.quantity_received > 0 ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Partial ({item.quantity_received}/{item.quantity})
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="mt-6 flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal:</span>
                      <span className="text-gray-900">${purchaseOrder.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tax:</span>
                      <span className="text-gray-900">${purchaseOrder.tax_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base font-medium border-t pt-2">
                      <span className="text-gray-900">Total:</span>
                      <span className="text-gray-900">${purchaseOrder.total_amount.toFixed(2)}</span>
                    </div>
                    {purchaseOrder.amount_paid > 0 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Paid:</span>
                          <span className="text-green-600">${purchaseOrder.amount_paid.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium">
                          <span className="text-gray-500">Balance:</span>
                          <span className="text-red-600">${purchaseOrder.balance_due.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  {purchaseOrder.status === 'draft' && (
                    <button
                      onClick={() => handleStatusUpdate('pending')}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Submit for Approval
                    </button>
                  )}
                  
                  {purchaseOrder.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleStatusUpdate('approved')}
                        className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleStatusUpdate('cancelled')}
                        className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  
                  {purchaseOrder.status === 'approved' && (
                    <button
                      onClick={() => handleStatusUpdate('ordered')}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Mark as Ordered
                    </button>
                  )}
                  
                  {(purchaseOrder.status === 'ordered' || purchaseOrder.status === 'partially_received') && (
                    <button
                      onClick={() => handleStatusUpdate('received')}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      Mark as Received
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Vendor Information */}
            {purchaseOrder.vendor && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Vendor Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{purchaseOrder.vendor.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="text-sm text-gray-900">{purchaseOrder.vendor.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="text-sm text-gray-900">{purchaseOrder.vendor.phone}</p>
                    </div>
                    {purchaseOrder.vendor.contact_person && (
                      <div>
                        <p className="text-sm text-gray-500">Contact Person</p>
                        <p className="text-sm text-gray-900">{purchaseOrder.vendor.contact_person}</p>
                      </div>
                    )}
                    <div className="pt-2">
                      <button
                        onClick={() => navigate(`/purchase/vendors/${purchaseOrder.vendor_id}`)}
                        className="text-sm text-primary-600 hover:text-primary-500"
                      >
                        View Vendor Details →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Timeline</h3>
                <div className="flow-root">
                  <ul className="-mb-8">
                    <li>
                      <div className="relative pb-8">
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center ring-8 ring-white">
                              <DocumentTextIcon className="h-4 w-4 text-white" />
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-500">
                                Purchase order created
                              </p>
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                              {new Date(purchaseOrder.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                    
                    {purchaseOrder.status !== 'DRAFT' && (
                      <li>
                        <div className="relative pb-8">
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                                <ClockIcon className="h-4 w-4 text-white" />
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm text-gray-500">
                                  Status updated to {purchaseOrder.status.replace('_', ' ').toLowerCase()}
                                </p>
                              </div>
                              <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                {new Date(purchaseOrder.updated_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    )}
                    
                    {(purchaseOrder as any).actual_delivery_date && (
                      <li>
                        <div className="relative">
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center ring-8 ring-white">
                                <CheckCircleIcon className="h-4 w-4 text-white" />
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm text-gray-500">
                                  Order delivered
                                </p>
                              </div>
                              <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                {new Date((purchaseOrder as any).actual_delivery_date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderDetailPage;
