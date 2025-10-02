import React, { useState, useEffect } from 'react';
import {
  CreditCardIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  PauseIcon,
  PlayIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface Subscription {
  id: string;
  organization_name: string;
  organization_id: string;
  tier: string;
  status: string;
  amount: number;
  currency: string;
  interval: string;
  current_period_start: string;
  current_period_end: string;
  trial_end?: string;
  failed_payment_count: number;
  dunning_status: string;
  stripe_subscription_id: string;
  cancel_at_period_end: boolean;
  payment_method_type?: string;
  payment_method_last4?: string;
  last_payment_date?: string;
}

const SubscriptionsPage: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTier, setFilterTier] = useState('all');
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      // Mock subscriptions data - replace with actual API call
      const mockSubscriptions: Subscription[] = [
        {
          id: '1',
          organization_name: 'Acme Corporation',
          organization_id: 'org_1',
          tier: 'professional',
          status: 'active',
          amount: 4900, // $49.00 in cents
          currency: 'usd',
          interval: 'month',
          current_period_start: '2024-08-01T00:00:00Z',
          current_period_end: '2024-09-01T00:00:00Z',
          failed_payment_count: 0,
          dunning_status: 'none',
          stripe_subscription_id: 'sub_1234567890',
          cancel_at_period_end: false,
          payment_method_type: 'card',
          payment_method_last4: '4242',
          last_payment_date: '2024-08-01T00:00:00Z',
        },
        {
          id: '2',
          organization_name: 'TechStart Inc',
          organization_id: 'org_2',
          tier: 'business',
          status: 'active',
          amount: 9900, // $99.00 in cents
          currency: 'usd',
          interval: 'month',
          current_period_start: '2024-08-15T00:00:00Z',
          current_period_end: '2024-09-15T00:00:00Z',
          failed_payment_count: 0,
          dunning_status: 'none',
          stripe_subscription_id: 'sub_0987654321',
          cancel_at_period_end: false,
          payment_method_type: 'card',
          payment_method_last4: '5555',
          last_payment_date: '2024-08-15T00:00:00Z',
        },
        {
          id: '3',
          organization_name: 'StartupXYZ',
          organization_id: 'org_3',
          tier: 'starter',
          status: 'past_due',
          amount: 1900, // $19.00 in cents
          currency: 'usd',
          interval: 'month',
          current_period_start: '2024-07-20T00:00:00Z',
          current_period_end: '2024-08-20T00:00:00Z',
          failed_payment_count: 2,
          dunning_status: 'second_attempt',
          stripe_subscription_id: 'sub_1122334455',
          cancel_at_period_end: false,
          payment_method_type: 'card',
          payment_method_last4: '1234',
        },
      ];
      
      setSubscriptions(mockSubscriptions);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.organization_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;
    const matchesTier = filterTier === 'all' || sub.tier === filterTier;
    
    return matchesSearch && matchesStatus && matchesTier;
  });

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="w-4 h-4 mr-1" />
            Active
          </span>
        );
      case 'trialing':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <CalendarIcon className="w-4 h-4 mr-1" />
            Trial
          </span>
        );
      case 'past_due':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
            Past Due
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <XCircleIcon className="w-4 h-4 mr-1" />
            Cancelled
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <PauseIcon className="w-4 h-4 mr-1" />
            Paused
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const getTierBadge = (tier: string) => {
    const colors = {
      starter: 'bg-gray-100 text-gray-800',
      professional: 'bg-blue-100 text-blue-800',
      business: 'bg-purple-100 text-purple-800',
      enterprise: 'bg-yellow-100 text-yellow-800',
    };
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colors[tier as keyof typeof colors] || colors.starter}`}>
        {tier}
      </span>
    );
  };

  const handleSubscriptionAction = async (action: string, subscriptionId: string) => {
    try {
      // In a real app, make API calls to handle subscription actions
      console.log(`${action} subscription ${subscriptionId}`);
      
      // Refresh subscriptions after action
      await fetchSubscriptions();
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
    }
  };

  const processDunning = async () => {
    try {
      const response = await fetch('/api/v1/admin/analytics/process-dunning', {
        method: 'POST',
      });
      const result = await response.json();
      console.log('Dunning process result:', result);
      await fetchSubscriptions();
    } catch (error) {
      console.error('Error processing dunning:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:mx-auto lg:max-w-7xl lg:px-8">
          <div className="py-6 md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center">
                <CreditCardIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate">
                  Subscription Management
                </h1>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Manage billing, subscriptions, and payment issues
              </p>
            </div>
            <div className="mt-6 flex space-x-3 md:mt-0 md:ml-4">
              <button
                onClick={processDunning}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <ArrowPathIcon className="-ml-1 mr-2 h-4 w-4" />
                Process Dunning
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-8 w-8 text-green-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Active Subscriptions
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {subscriptions.filter(s => s.status === 'active').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Past Due
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {subscriptions.filter(s => s.status === 'past_due').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Monthly Revenue
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(
                        subscriptions
                          .filter(s => s.status === 'active')
                          .reduce((sum, s) => sum + s.amount, 0),
                        'usd'
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CalendarIcon className="h-8 w-8 text-blue-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Trial Subscriptions
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {subscriptions.filter(s => s.status === 'trialing').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <input
                  type="text"
                  className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Search organizations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div>
                <select
                  className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="trialing">Trialing</option>
                  <option value="past_due">Past Due</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="paused">Paused</option>
                </select>
              </div>

              <div>
                <select
                  className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  value={filterTier}
                  onChange={(e) => setFilterTier(e.target.value)}
                >
                  <option value="all">All Tiers</option>
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="business">Business</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Subscriptions Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Next Billing
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSubscriptions.map((subscription) => (
                    <tr key={subscription.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {subscription.organization_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {subscription.stripe_subscription_id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getTierBadge(subscription.tier)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(subscription.amount, subscription.currency)}/{subscription.interval}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(subscription.status)}
                        {subscription.failed_payment_count > 0 && (
                          <div className="text-xs text-red-600 mt-1">
                            {subscription.failed_payment_count} failed attempts
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {subscription.payment_method_type} •••• {subscription.payment_method_last4}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(subscription.current_period_end).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedSubscription(subscription);
                              setShowModal(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Manage
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Management Modal */}
      {showModal && selectedSubscription && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Manage Subscription
                    </h3>
                    <div className="mt-4">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Organization
                          </label>
                          <p className="text-sm text-gray-900">{selectedSubscription.organization_name}</p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Current Status
                          </label>
                          <div className="mt-1">
                            {getStatusBadge(selectedSubscription.status)}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Plan & Billing
                          </label>
                          <p className="text-sm text-gray-900">
                            {selectedSubscription.tier} - {formatCurrency(selectedSubscription.amount, selectedSubscription.currency)}/{selectedSubscription.interval}
                          </p>
                        </div>

                        {selectedSubscription.failed_payment_count > 0 && (
                          <div className="bg-red-50 border border-red-200 rounded-md p-4">
                            <div className="flex">
                              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                              <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">
                                  Payment Issues
                                </h3>
                                <div className="mt-2 text-sm text-red-700">
                                  <p>{selectedSubscription.failed_payment_count} failed payment attempts</p>
                                  <p>Dunning status: {selectedSubscription.dunning_status}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <div className="flex space-x-2">
                  {selectedSubscription.status === 'past_due' && (
                    <button
                      onClick={() => handleSubscriptionAction('retry', selectedSubscription.id)}
                      className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Retry Payment
                    </button>
                  )}
                  
                  {selectedSubscription.status === 'active' && (
                    <button
                      onClick={() => handleSubscriptionAction('pause', selectedSubscription.id)}
                      className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-yellow-600 text-base font-medium text-white hover:bg-yellow-700 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Pause
                    </button>
                  )}

                  <button
                    onClick={() => setShowModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionsPage;
