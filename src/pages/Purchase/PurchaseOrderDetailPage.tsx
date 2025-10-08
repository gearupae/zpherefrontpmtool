import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import { 
  ArrowLeftIcon, 
  PencilIcon, 
  TrashIcon,
  CalendarIcon,
  TruckIcon,
  DocumentTextIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PrinterIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  BanknotesIcon,
  FlagIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import { useAppDispatch } from '../../hooks/redux';
import { addNotification } from '../../store/slices/notificationSlice';
import { apiClient } from '../../api/client';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'edit' | 'delivery' | 'payment'>('overview');
  const [projects, setProjects] = useState<Array<{id: string; name: string}>>([]);
  const [customers, setCustomers] = useState<Array<{id: string; first_name?: string; last_name?: string; company_name?: string}>>([]);
  
  // Delivery Status state
  const [deliveryData, setDeliveryData] = useState({
    delivery_status: 'pending' as 'pending' | 'in_transit' | 'delivered' | 'cancelled',
    tracking_number: '',
    shipping_method: '',
    delivery_address: '',
    delivery_notes: '',
    actual_delivery_date: ''
  });
  
  // Payment Status state
  const [paymentData, setPaymentData] = useState({
    payment_status: 'pending' as 'pending' | 'paid' | 'partial' | 'overdue',
    payment_method: 'cash' as 'cash' | 'cheque' | 'bank_transfer' | 'card' | 'other',
    payment_date: '',
    due_date: '',
    payment_reference: '',
    cheque_number: '',
    cheque_date: '',
    bank_name: '',
    reminder_date: '',
    set_reminder: false
  });
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
        setActiveTab('edit');
      }
      fetchPurchaseOrderDetails();
    }
  }, [id, fetchPurchaseOrderDetails, searchParams]);

  // Helper: normalize date to YYYY-MM-DD for inputs
  const toYMD = (d?: string) => {
    if (!d) return '';
    try {
      const iso = new Date(d).toISOString();
      return iso.split('T')[0];
    } catch (_) { return ''; }
  };

  // Sync edit form with loaded purchase order
  useEffect(() => {
    if (!purchaseOrder) return;
    setEditFormData({
      expected_delivery_date: toYMD(purchaseOrder.expected_delivery_date),
      received_date: toYMD(purchaseOrder.received_date),
      project_id: purchaseOrder.project_id || '',
      customer_id: purchaseOrder.customer_id || '',
      department: purchaseOrder.department || '',
      requested_by: purchaseOrder.requested_by || '',
      shipping_address: purchaseOrder.shipping_address || '',
      notes: purchaseOrder.notes || '',
      priority: (purchaseOrder.priority as any) || 'medium',
    });
  }, [purchaseOrder]);

  // Map PO status to delivery status select values
  const mapPoStatusToDelivery = (status?: string): 'pending' | 'in_transit' | 'delivered' | 'cancelled' => {
    const s = (status || '').toLowerCase();
    if (s === 'received') return 'delivered';
    if (s === 'ordered' || s === 'partially_received') return 'in_transit';
    if (s === 'cancelled') return 'cancelled';
    return 'pending';
  };

  // Sync delivery form with loaded purchase order
  useEffect(() => {
    if (!purchaseOrder) return;
    setDeliveryData(prev => ({
      ...prev,
      delivery_status: mapPoStatusToDelivery(purchaseOrder.status),
      delivery_address: purchaseOrder.shipping_address || prev.delivery_address,
      actual_delivery_date: toYMD(purchaseOrder.received_date),
    }));
  }, [purchaseOrder]);

  // Sync payment view data
  useEffect(() => {
    if (!purchaseOrder) return;
    const poAny = purchaseOrder as any;
    let inferredStatus: 'pending' | 'paid' | 'partial' | 'overdue' = 'pending';
    if (typeof poAny.payment_status === 'string') {
      const ps = poAny.payment_status.toLowerCase();
      if (ps === 'pending' || ps === 'paid' || ps === 'partial' || ps === 'overdue') {
        inferredStatus = ps as any;
      }
    } else {
      const paid = Number(purchaseOrder.amount_paid || 0);
      const total = Number(purchaseOrder.total_amount || 0);
      if (paid >= total && total > 0) inferredStatus = 'paid';
      else if (paid > 0) inferredStatus = 'partial';
      else inferredStatus = 'pending';
    }
    const allowedMethods = ['cash','cheque','bank_transfer','card','other'];
    const method = allowedMethods.includes((purchaseOrder.payment_method || '').toLowerCase())
      ? (purchaseOrder.payment_method as any)
      : 'other';
    setPaymentData(prev => ({
      ...prev,
      payment_status: inferredStatus,
      payment_method: method,
    }));
  }, [purchaseOrder]);

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


  const handleEditCancel = () => {
    setActiveTab('overview');
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
      setActiveTab('overview');
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

  // Delivery Status functions
  const handleDeliveryStatusUpdate = async () => {
    if (!purchaseOrder) return;

    // Map delivery status to core PO status values used by backend
    const mapDeliveryToPo = (s: 'pending' | 'in_transit' | 'delivered' | 'cancelled') => {
      switch (s) {
        case 'delivered': return 'received';
        case 'in_transit': return 'ordered';
        case 'cancelled': return 'cancelled';
        default: return 'pending';
      }
    };

    const targetStatus = mapDeliveryToPo(deliveryData.delivery_status);
    const updateBody: any = {};

    // Only include fields that changed to reduce 422 risk
    if (deliveryData.delivery_address && deliveryData.delivery_address !== purchaseOrder.shipping_address) {
      updateBody.shipping_address = deliveryData.delivery_address;
    }

    // If delivered, set received_date
    if (deliveryData.delivery_status === 'delivered') {
      updateBody.received_date = (deliveryData.actual_delivery_date || new Date().toISOString().split('T')[0]);
    }

    try {
      const ops: Promise<any>[] = [];
      if (targetStatus && targetStatus !== purchaseOrder.status) {
        ops.push(apiClient.patch(`/purchase-orders/${purchaseOrder.id}/status`, { status: targetStatus }));
      }
      if (Object.keys(updateBody).length > 0) {
        ops.push(apiClient.put(`/purchase-orders/${purchaseOrder.id}`, updateBody));
      }

      if (ops.length === 0) {
        // Nothing to update; still show success to avoid confusion
        dispatch(addNotification({
          type: 'success',
          title: 'No Changes',
          message: 'No delivery changes to update.',
          duration: 2000,
        }));
        return;
      }

      await Promise.all(ops);

      dispatch(addNotification({
        type: 'success',
        title: 'Delivery Status Updated',
        message: 'Delivery information has been successfully updated.',
        duration: 3000,
      }));
      
      fetchPurchaseOrderDetails();
    } catch (error) {
      console.error('Delivery update failed:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update delivery status. Please try again.',
        duration: 5000,
      }));
    }
  };

  const handleMarkAsDelivered = async () => {
    if (!purchaseOrder) return;

    const today = new Date().toISOString().split('T')[0];
    const receivedDate = deliveryData.actual_delivery_date || today;

    try {
      // Update status to received and set received_date in the main PO
      await Promise.all([
        apiClient.patch(`/purchase-orders/${purchaseOrder.id}/status`, { status: 'received' }),
        apiClient.put(`/purchase-orders/${purchaseOrder.id}`, { received_date: receivedDate })
      ]);
      
      setDeliveryData(prev => ({
        ...prev,
        delivery_status: 'delivered',
        actual_delivery_date: receivedDate
      }));
      
      dispatch(addNotification({
        type: 'success',
        title: 'Marked as Delivered',
        message: 'Purchase order has been marked as delivered.',
        duration: 3000,
      }));
      
      fetchPurchaseOrderDetails();
    } catch (error) {
      console.error('Mark delivered failed:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to mark as delivered. Please try again.',
        duration: 5000,
      }));
    }
  };

  // Payment Status functions
  const handleRecordPayment = async () => {
    if (!purchaseOrder) return;

    // Validate cheque fields if payment method is cheque
    if (paymentData.payment_method === 'cheque') {
      if (!paymentData.cheque_number || !paymentData.cheque_date || !paymentData.bank_name) {
        dispatch(addNotification({
          type: 'error',
          title: 'Validation Error',
          message: 'Please fill in all cheque details (Cheque Number, Date, and Bank Name).',
          duration: 5000,
        }));
        return;
      }
    }

    try {
      const paymentPayload = {
        ...paymentData,
        purchase_order_id: purchaseOrder.id
      };
      
      await apiClient.post(`/purchase-orders/${purchaseOrder.id}/payments`, paymentPayload);
      
      dispatch(addNotification({
        type: 'success',
        title: 'Payment Recorded',
        message: 'Payment has been successfully recorded.',
        duration: 3000,
      }));
      
      fetchPurchaseOrderDetails();
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        title: 'Payment Failed',
        message: 'Failed to record payment. Please try again.',
        duration: 5000,
      }));
    }
  };

  const handleMarkAsPaid = async () => {
    if (!purchaseOrder) return;

    try {
      await apiClient.patch(`/purchase-orders/${purchaseOrder.id}/payment-status`, {
        payment_status: 'paid',
        payment_date: new Date().toISOString().split('T')[0],
        amount_paid: purchaseOrder.total_amount
      });
      
      setPaymentData(prev => ({
        ...prev,
        payment_status: 'paid',
        payment_date: new Date().toISOString().split('T')[0]
      }));
      
      dispatch(addNotification({
        type: 'success',
        title: 'Marked as Paid',
        message: 'Purchase order has been marked as paid.',
        duration: 3000,
      }));
      
      fetchPurchaseOrderDetails();
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to mark as paid. Please try again.',
        duration: 5000,
      }));
    }
  };

  const getDeliveryStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_transit': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-orange-100 text-orange-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };


  if (isLoading) {
    return <div />;
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(getPurchasePath())}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Purchase Order {purchaseOrder.po_number}</h1>
            <p className="text-gray-600">
              {purchaseOrder.status.replace('_', ' ')} • {purchaseOrder.priority} priority • Created {new Date(purchaseOrder.created_at).toLocaleDateString()}
            </p>
            {/* PO Health Indicator */}
            <div className="flex items-center space-x-2 mt-2">
              <div className={`h-2 w-2 rounded-full ${
                purchaseOrder.status === 'cancelled' ? 'bg-red-500' :
                purchaseOrder.status === 'received' ? 'bg-green-500' :
                purchaseOrder.status === 'draft' ? 'bg-gray-500' :
                'bg-blue-500'
              }`}></div>
              <span className={`text-sm ${
                purchaseOrder.status === 'cancelled' ? 'text-red-600' :
                purchaseOrder.status === 'received' ? 'text-green-600' :
                purchaseOrder.status === 'draft' ? 'text-gray-600' :
                'text-blue-600'
              }`}>
                {purchaseOrder.status.replace('_', ' ').charAt(0).toUpperCase() + purchaseOrder.status.replace('_', ' ').slice(1)}
              </span>
              {purchaseOrder.expected_delivery_date && (
                <span className="text-xs text-gray-500">
                  • Expected {new Date(purchaseOrder.expected_delivery_date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => downloadPurchaseOrderPDF(purchaseOrder.id, purchaseOrder.po_number)}
            className="flex items-center space-x-2 px-3 py-1 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
          >
            <DocumentArrowDownIcon className="h-4 w-4" />
            Download PDF
          </button>
          
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-2 px-3 py-1 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
          >
            <PrinterIcon className="h-4 w-4" />
            Print
          </button>
          
          <button
            onClick={() => setActiveTab('edit')}
            className="flex items-center space-x-2 px-3 py-1 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
          >
            <PencilIcon className="h-4 w-4" />
            Edit
          </button>
          
          <button
            onClick={handleDeletePurchaseOrder}
            className="flex items-center space-x-2 px-3 py-1 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
          >
            <TrashIcon className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: ChartBarIcon },
            { id: 'delivery', name: 'Delivery Status', icon: TruckIcon },
            { id: 'payment', name: 'Payment Status', icon: BanknotesIcon },
            { id: 'edit', name: 'Edit', icon: PencilIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-3 font-medium text-sm rounded-md transition-colors focus:outline-none focus:ring-0 ${
                activeTab === tab.id
                  ? 'text-indigo-600'
                  : 'text-black hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <tab.icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Tab Content */}
          {activeTab === 'overview' && purchaseOrder && (
            <div className="space-y-6">
              {/* Purchase Order Information */}
              <div className="bg-white shadow rounded-lg detail-card">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Purchase Order Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">PO Number</p>
                        <p className="text-sm text-gray-600">{purchaseOrder.po_number}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <FlagIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Status</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(purchaseOrder.status)}`}>
                          {purchaseOrder.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <ExclamationTriangleIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Priority</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(purchaseOrder.priority)}`}>
                          {purchaseOrder.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <CalendarIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Order Date</p>
                        <p className="text-sm text-gray-600">{new Date(purchaseOrder.order_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {purchaseOrder.expected_delivery_date && (
                      <div className="flex items-center space-x-3">
                        <TruckIcon className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Expected Delivery</p>
                          <p className="text-sm text-gray-600">{new Date(purchaseOrder.expected_delivery_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center space-x-3">
                      <ClockIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Payment Method</p>
                        <p className="text-sm text-gray-600">{purchaseOrder.payment_method.replace('_', ' ').toUpperCase()}</p>
                      </div>
                    </div>
                  </div>
                </div>
                {purchaseOrder.notes && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Notes</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-line">{purchaseOrder.notes}</p>
                  </div>
                )}
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <CurrencyDollarIcon className="h-6 w-6 text-green-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Total Amount</dt>
                          <dd className="text-lg font-medium text-gray-900">${(purchaseOrder.total_amount || 0).toFixed(2)}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <BanknotesIcon className="h-6 w-6 text-blue-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Amount Paid</dt>
                          <dd className="text-lg font-medium text-gray-900">${(purchaseOrder.amount_paid || 0).toFixed(2)}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ClockIcon className="h-6 w-6 text-orange-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Balance Due</dt>
                          <dd className="text-lg font-medium text-gray-900">${(purchaseOrder.balance_due || 0).toFixed(2)}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <DocumentTextIcon className="h-6 w-6 text-purple-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Items</dt>
                          <dd className="text-lg font-medium text-gray-900">{purchaseOrder.items.length}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="bg-white shadow rounded-lg detail-card">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Line Items</h3>
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
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
                            ${(item.unit_price || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${(item.total_price || 0).toFixed(2)}
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
                      <span className="text-gray-900">${(purchaseOrder.subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tax:</span>
                      <span className="text-gray-900">${(purchaseOrder.tax_amount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base font-medium border-t pt-2">
                      <span className="text-gray-900">Total:</span>
                      <span className="text-gray-900">${(purchaseOrder.total_amount || 0).toFixed(2)}</span>
                    </div>
                    {(purchaseOrder.amount_paid || 0) > 0 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Paid:</span>
                          <span className="text-green-600">${(purchaseOrder.amount_paid || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium">
                          <span className="text-gray-500">Balance:</span>
                          <span className="text-red-600">${(purchaseOrder.balance_due || 0).toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Purchase Order Timeline */}
              <div className="bg-white shadow rounded-lg detail-card">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Purchase Order Timeline</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Purchase Order Created</p>
                      <p className="text-xs text-gray-500">{new Date(purchaseOrder.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Order Date</p>
                      <p className="text-xs text-gray-500">{new Date(purchaseOrder.order_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  {purchaseOrder.expected_delivery_date && (
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-3 w-3 bg-orange-500 rounded-full"></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Expected Delivery</p>
                        <p className="text-xs text-gray-500">{new Date(purchaseOrder.expected_delivery_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                  
                  {purchaseOrder.received_date && (
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Delivered</p>
                        <p className="text-xs text-gray-500">{new Date(purchaseOrder.received_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-3 w-3 bg-gray-500 rounded-full"></div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Last Updated</p>
                      <p className="text-xs text-gray-500">{new Date(purchaseOrder.updated_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'edit' && purchaseOrder && (
            <div className="bg-white shadow rounded-lg detail-card">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Edit Purchase Order</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={handleEditSave}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { handleEditCancel(); setActiveTab('overview'); }}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              
              {/* Edit Form */}
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
            </div>
          )}

          {/* Delivery Status Tab */}
          {activeTab === 'delivery' && purchaseOrder && (
            <div className="space-y-6">
              <div className="bg-white shadow rounded-lg detail-card">
                <h3 className="text-lg font-medium text-gray-900 mb-6">Delivery Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Delivery Status */}
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <TruckIcon className="h-6 w-6 text-blue-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Delivery Status</dt>
                            <dd className="mt-1">
                              <select
                                value={deliveryData.delivery_status}
                                onChange={(e) => setDeliveryData(prev => ({ ...prev, delivery_status: e.target.value as any }))}
                                className="text-sm font-medium border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                              >
                                <option value="pending">Pending</option>
                                <option value="in_transit">In Transit</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expected Delivery Date */}
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <CalendarIcon className="h-6 w-6 text-orange-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Expected Delivery</dt>
                            <dd className="text-lg font-medium text-gray-900">
                              {purchaseOrder.expected_delivery_date 
                                ? new Date(purchaseOrder.expected_delivery_date).toLocaleDateString()
                                : 'Not Set'}
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actual Delivery Date */}
                  {deliveryData.delivery_status === 'delivered' && (
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                      <div className="p-5">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <CalendarIcon className="h-6 w-6 text-green-400" />
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-medium text-gray-500 truncate">Actual Delivery</dt>
                              <dd className="mt-1">
                                <input
                                  type="date"
                                  value={deliveryData.actual_delivery_date}
                                  onChange={(e) => setDeliveryData(prev => ({ ...prev, actual_delivery_date: e.target.value }))}
                                  className="text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                />
                              </dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tracking Number */}
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <DocumentTextIcon className="h-6 w-6 text-purple-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Tracking Number</dt>
                            <dd className="mt-1">
                              <input
                                type="text"
                                value={deliveryData.tracking_number}
                                onChange={(e) => setDeliveryData(prev => ({ ...prev, tracking_number: e.target.value }))}
                                placeholder="Enter tracking number"
                                className="text-sm w-full border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                              />
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Fields */}
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Shipping Method</label>
                    <input
                      type="text"
                      value={deliveryData.shipping_method}
                      onChange={(e) => setDeliveryData(prev => ({ ...prev, shipping_method: e.target.value }))}
                      placeholder="e.g., FedEx, UPS, DHL"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Delivery Address</label>
                    <textarea
                      value={deliveryData.delivery_address}
                      onChange={(e) => setDeliveryData(prev => ({ ...prev, delivery_address: e.target.value }))}
                      rows={3}
                      placeholder="Enter delivery address"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Delivery Notes</label>
                    <textarea
                      value={deliveryData.delivery_notes}
                      onChange={(e) => setDeliveryData(prev => ({ ...prev, delivery_notes: e.target.value }))}
                      rows={3}
                      placeholder="Any special instructions or notes"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex justify-end space-x-3">
                  {deliveryData.delivery_status !== 'delivered' && (
                    <button
                      onClick={handleMarkAsDelivered}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      Mark as Delivered
                    </button>
                  )}
                  <button
                    onClick={handleDeliveryStatusUpdate}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                  >
                    Update Delivery Status
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Payment Status Tab */}
          {activeTab === 'payment' && purchaseOrder && (
            <div className="space-y-6">
              <div className="bg-white shadow rounded-lg detail-card">
                <h3 className="text-lg font-medium text-gray-900 mb-6">Payment Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Payment Status */}
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <CurrencyDollarIcon className="h-6 w-6 text-green-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Payment Status</dt>
                            <dd className="mt-1">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(paymentData.payment_status)}`}>
                                {paymentData.payment_status.charAt(0).toUpperCase() + paymentData.payment_status.slice(1)}
                              </span>
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total Amount */}
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <CurrencyDollarIcon className="h-6 w-6 text-blue-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Total Amount</dt>
                            <dd className="text-lg font-medium text-gray-900">${(purchaseOrder.total_amount || 0).toFixed(2)}</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Amount Paid */}
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <BanknotesIcon className="h-6 w-6 text-green-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Amount Paid</dt>
                            <dd className="text-lg font-medium text-green-600">${(purchaseOrder.amount_paid || 0).toFixed(2)}</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Balance Due */}
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <ClockIcon className="h-6 w-6 text-orange-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Balance Due</dt>
                            <dd className="text-lg font-medium text-red-600">${(purchaseOrder.balance_due || 0).toFixed(2)}</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Details Form */}
                <div className="mt-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                      <select
                        value={paymentData.payment_method}
                        onChange={(e) => setPaymentData(prev => ({ ...prev, payment_method: e.target.value as any }))}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      >
                        <option value="cash">Cash</option>
                        <option value="cheque">Cheque</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="card">Card</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Payment Date</label>
                      <input
                        type="date"
                        value={paymentData.payment_date}
                        onChange={(e) => setPaymentData(prev => ({ ...prev, payment_date: e.target.value }))}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Due Date</label>
                      <input
                        type="date"
                        value={paymentData.due_date}
                        onChange={(e) => setPaymentData(prev => ({ ...prev, due_date: e.target.value }))}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Payment Reference</label>
                      <input
                        type="text"
                        value={paymentData.payment_reference}
                        onChange={(e) => setPaymentData(prev => ({ ...prev, payment_reference: e.target.value }))}
                        placeholder="Reference number"
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  {/* Cheque-specific fields */}
                  {paymentData.payment_method === 'cheque' && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                      <h4 className="text-sm font-medium text-blue-900 mb-3">Cheque Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Cheque Number *</label>
                          <input
                            type="text"
                            value={paymentData.cheque_number}
                            onChange={(e) => setPaymentData(prev => ({ ...prev, cheque_number: e.target.value }))}
                            placeholder="Cheque number"
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Cheque Date *</label>
                          <input
                            type="date"
                            value={paymentData.cheque_date}
                            onChange={(e) => setPaymentData(prev => ({ ...prev, cheque_date: e.target.value }))}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Bank Name *</label>
                          <input
                            type="text"
                            value={paymentData.bank_name}
                            onChange={(e) => setPaymentData(prev => ({ ...prev, bank_name: e.target.value }))}
                            placeholder="Bank name"
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payment Reminder */}
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-center mb-3">
                      <input
                        type="checkbox"
                        checked={paymentData.set_reminder}
                        onChange={(e) => setPaymentData(prev => ({ ...prev, set_reminder: e.target.checked }))}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm font-medium text-gray-700">
                        Set Payment Reminder
                      </label>
                    </div>
                    {paymentData.set_reminder && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Reminder Date</label>
                        <input
                          type="date"
                          value={paymentData.reminder_date}
                          onChange={(e) => setPaymentData(prev => ({ ...prev, reminder_date: e.target.value }))}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={handleRecordPayment}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Record Payment
                  </button>
                  {paymentData.payment_status !== 'paid' && (
                    <button
                      onClick={handleMarkAsPaid}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      Mark as Paid
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Vendor Information */}
          {purchaseOrder.vendor && (
            <div className="bg-white shadow rounded-lg detail-card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Vendor Information</h3>
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
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg detail-card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
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
      </div>
    </div>
  );
};

export default PurchaseOrderDetailPage;
