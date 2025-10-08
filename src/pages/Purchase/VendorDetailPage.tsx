import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import { 
  ArrowLeftIcon, 
  PencilIcon, 
  TrashIcon,

  EnvelopeIcon,
  PhoneIcon,
  GlobeAltIcon,
  UserIcon,
  CreditCardIcon,
  StarIcon,
  MapPinIcon,
  BanknotesIcon,
  DocumentTextIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { useAppDispatch } from '../../hooks/redux';
import { addNotification } from '../../store/slices/notificationSlice';
import { apiClient } from '../../api/client';
import ViewModeButton from '../../components/UI/ViewModeButton';

interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  website?: string;
  contact_person?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  tax_id?: string;
  payment_terms: string;
  credit_limit: number;
  category?: string;
  is_active: boolean;
  rating: number;
  bank_details?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  order_date: string;
  total_amount: number;
  status: string;
  expected_delivery_date?: string;
}

interface VendorStats {
  total_orders: number;
  total_spent: number;
  average_order_value: number;
  pending_orders: number;
  completed_orders: number;
}

const VendorDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'overview' | 'edit'>(searchParams.get('tab') === 'edit' ? 'edit' : 'overview');
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [stats, setStats] = useState<VendorStats>({
    total_orders: 0,
    total_spent: 0,
    average_order_value: 0,
    pending_orders: 0,
    completed_orders: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: '',
    website: '',
    contact_person: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    payment_terms: '',
    credit_limit: 0,
    category: '',
    rating: 5
  });


  // Helper function to get the correct purchase page path with tenant context
  const getPurchasePath = useCallback(() => {
    const tenantSlug = user?.organization?.slug;
    return tenantSlug ? `/${tenantSlug}/purchase` : '/purchase';
  }, [user?.organization?.slug]);



  const fetchVendorDetails = useCallback(async () => {
    try {
      const response = await apiClient.get(`/vendors/${id}`);
      setVendor(response.data);
    } catch (error) {
      console.error('Failed to fetch vendor details:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load vendor details',
        duration: 5000,
      }));
      navigate(getPurchasePath());
    }
  }, [id, dispatch, navigate, getPurchasePath]);

  const fetchPurchaseOrders = useCallback(async () => {
    try {
      const response = await apiClient.get(`/purchase-orders/?vendor_id=${id}`);
      setPurchaseOrders(response.data.purchase_orders || []);
    } catch (error) {
      console.error('Failed to fetch purchase orders:', error);
    }
  }, [id]);

  const fetchStats = useCallback(async () => {
    try {
      // Mock stats for now - would come from backend
      const orders = purchaseOrders;
      const totalSpent = orders.reduce((sum, order) => sum + order.total_amount, 0);
      const avgOrderValue = orders.length > 0 ? totalSpent / orders.length : 0;
      const pendingOrders = orders.filter(order => order.status === 'PENDING').length;
      const completedOrders = orders.filter(order => order.status === 'COMPLETED').length;

      setStats({
        total_orders: orders.length,
        total_spent: totalSpent,
        average_order_value: avgOrderValue,
        pending_orders: pendingOrders,
        completed_orders: completedOrders
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [purchaseOrders]);

  useEffect(() => {
    if (id) {
      fetchVendorDetails();
      fetchPurchaseOrders();
      fetchStats();
    }
  }, [id, fetchVendorDetails, fetchPurchaseOrders, fetchStats]);

  const handleEditClick = () => {
    if (vendor) {
      setEditFormData({
        name: vendor.name || '',
        email: vendor.email || '',
        phone: vendor.phone || '',
        website: vendor.website || '',
        contact_person: vendor.contact_person || '',
        address: vendor.address || '',
        city: vendor.city || '',
        state: vendor.state || '',
        country: vendor.country || '',
        postal_code: vendor.postal_code || '',
        payment_terms: vendor.payment_terms || '',
        credit_limit: vendor.credit_limit || 0,
        category: vendor.category || '',
        rating: vendor.rating || 5
      });
      setActiveTab('edit');
    }
  };

  const handleEditCancel = () => {
    setActiveTab('overview');
    setEditFormData({
      name: '',
      email: '',
      phone: '',
      website: '',
      contact_person: '',
      address: '',
      city: '',
      state: '',
      country: '',
      postal_code: '',
      payment_terms: '',
      credit_limit: 0,
      category: '',
      rating: 5
    });
  };

  const handleEditSave = async () => {
    if (!vendor) return;

    try {
      const response = await apiClient.put(`/vendors/${vendor.id}`, editFormData);
      setVendor(response.data);
      setActiveTab('overview');
      dispatch(addNotification({
        type: 'success',
        title: 'Vendor Updated',
        message: 'Vendor has been successfully updated.',
        duration: 3000,
      }));
    } catch (error) {
      console.error('Failed to update vendor:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update vendor. Please try again.',
        duration: 5000,
      }));
    }
  };

  const handleDeleteVendor = async () => {
    if (!vendor || !window.confirm('Are you sure you want to delete this vendor?')) {
      return;
    }

    try {
      await apiClient.delete(`/vendors/${vendor.id}`);
      dispatch(addNotification({
        type: 'success',
        title: 'Vendor Deleted',
        message: 'Vendor has been successfully deleted.',
        duration: 3000,
      }));
      navigate(getPurchasePath());
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete vendor',
        duration: 5000,
      }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'received': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, index) => (
      index < rating ? (
        <StarSolidIcon key={index} className="h-4 w-4 text-yellow-400" />
      ) : (
        <StarIcon key={index} className="h-4 w-4 text-gray-300" />
      )
    ));
  };

  if (isLoading) {
    return <div />;
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Vendor Not Found</h2>
          <p className="text-gray-600 mb-4">The vendor you're looking for doesn't exist.</p>
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
            <h1 className="text-3xl font-bold text-gray-900">{vendor.name}</h1>
            <p className="text-gray-600">
              {vendor.is_active ? 'Active' : 'Inactive'} • {vendor.category || 'Uncategorized'} • Rating: {vendor.rating}/5
            </p>
            <div className="flex items-center space-x-2 mt-2">
              <div className="flex items-center space-x-1">
                {renderStars(vendor.rating)}
              </div>
            </div>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleEditClick}
            className="flex items-center space-x-2 px-3 py-1 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
          >
            <PencilIcon className="h-4 w-4" />
            Edit
          </button>
          
          <button
            onClick={handleDeleteVendor}
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

        {activeTab === 'overview' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ChartBarIcon className="h-6 w-6 text-blue-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Orders</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats.total_orders}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <BanknotesIcon className="h-6 w-6 text-green-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Spent</dt>
                        <dd className="text-lg font-medium text-gray-900">${stats.total_spent.toFixed(2)}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <DocumentTextIcon className="h-6 w-6 text-orange-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Active Orders</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats.pending_orders}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CreditCardIcon className="h-6 w-6 text-purple-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Outstanding</dt>
                        <dd className="text-lg font-medium text-gray-900">${stats.average_order_value.toFixed(2)}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

        {/* Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Vendor Information */}
            <div className="bg-white shadow rounded-lg detail-card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Vendor Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Email</p>
                      <p className="text-sm text-gray-600">{vendor.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <PhoneIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Phone</p>
                      <p className="text-sm text-gray-600">{vendor.phone}</p>
                    </div>
                  </div>

                  {vendor.website && (
                    <div className="flex items-center space-x-3">
                      <GlobeAltIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Website</p>
                        <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:text-primary-500">
                          {vendor.website}
                        </a>
                      </div>
                    </div>
                  )}

                  {vendor.contact_person && (
                    <div className="flex items-center space-x-3">
                      <UserIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Contact Person</p>
                        <p className="text-sm text-gray-600">{vendor.contact_person}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {vendor.address && (
                    <div className="flex items-start space-x-3">
                      <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Address</p>
                        <p className="text-sm text-gray-600">
                          {vendor.address}
                          {vendor.city && <><br />{vendor.city}</>}
                          {vendor.state && `, ${vendor.state}`}
                          {vendor.postal_code && ` ${vendor.postal_code}`}
                          {vendor.country && <><br />{vendor.country}</>}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-3">
                    <CreditCardIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Payment Terms</p>
                      <p className="text-sm text-gray-600">{vendor.payment_terms.replace('_', ' ').toUpperCase()}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <BanknotesIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Credit Limit</p>
                      <p className="text-sm text-gray-600">${vendor.credit_limit.toFixed(2)}</p>
                    </div>
                  </div>

                  {vendor.tax_id && (
                    <div className="flex items-center space-x-3">
                      <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Tax ID</p>
                        <p className="text-sm text-gray-600">{vendor.tax_id}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {vendor.bank_details && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-900 mb-2">Bank Details</p>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{vendor.bank_details}</p>
                </div>
              )}

              {vendor.tags && vendor.tags.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-900 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {vendor.tags.map((tag, index) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Purchase Orders History */}
            <div className="bg-white shadow rounded-lg detail-card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Purchase Orders History</h3>
              {purchaseOrders.length === 0 ? (
                <div className="text-center py-8">
                  <DocumentTextIcon className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="text-sm text-gray-500 mt-2">No purchase orders found for this vendor.</p>
                </div>
              ) : (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-secondary-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">PO Number</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Order Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Total Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {purchaseOrders.map((order) => (
                        <tr 
                          key={order.id} 
                          className="hover:bg-secondary-50 cursor-pointer"
                          onClick={() => navigate(`/purchase/orders/${order.id}`)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{order.po_number}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(order.order_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${order.total_amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Vendor Summary Card */}
            <div className="bg-white shadow rounded-lg detail-card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Vendor Summary</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    vendor.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {vendor.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Rating</span>
                  <div className="flex items-center space-x-1">
                    {renderStars(vendor.rating)}
                  </div>
                </div>
                {vendor.category && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Category</span>
                    <span className="text-sm font-medium text-gray-900">{vendor.category}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <span className="text-sm text-gray-600">Created</span>
                  <span className="text-sm text-gray-900">{new Date(vendor.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Updated</span>
                  <span className="text-sm text-gray-900">{new Date(vendor.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        </>
        )}

        {activeTab === 'edit' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Edit Vendor</h3>
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
                  </div>

                  {/* Edit Form (reusing existing fields) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <input
                          type="text"
                          value={editFormData.name}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                          type="email"
                          value={editFormData.email}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                        <input
                          type="text"
                          value={editFormData.phone}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Website</label>
                        <input
                          type="url"
                          value={editFormData.website}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, website: e.target.value }))}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Contact Person</label>
                        <input
                          type="text"
                          value={editFormData.contact_person}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Address</label>
                        <textarea
                          value={editFormData.address}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, address: e.target.value }))}
                          rows={3}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">City</label>
                          <input
                            type="text"
                            value={editFormData.city}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, city: e.target.value }))}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">State</label>
                          <input
                            type="text"
                            value={editFormData.state}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, state: e.target.value }))}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Country</label>
                          <input
                            type="text"
                            value={editFormData.country}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, country: e.target.value }))}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Postal Code</label>
                          <input
                            type="text"
                            value={editFormData.postal_code}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Payment Terms</label>
                        <input
                          type="text"
                          value={editFormData.payment_terms}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, payment_terms: e.target.value }))}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Credit Limit</label>
                        <input
                          type="number"
                          value={editFormData.credit_limit}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, credit_limit: parseFloat(e.target.value) || 0 }))}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column can host tips or attachments summary if needed */}
            <div className="space-y-6">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">Tips</h3>
                  <p className="text-sm text-gray-600">Review payment terms and contact person before saving changes.</p>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default VendorDetailPage;
