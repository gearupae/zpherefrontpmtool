import React, { useState, useEffect } from 'react';
import {
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EnvelopeIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface DunningSubscription {
  id: string;
  organization_name: string;
  subscription_tier: string;
  amount: number;
  currency: string;
  status: string;
  dunning_status: string;
  failed_payment_count: number;
  dunning_start_date: string;
  next_dunning_date: string;
  last_dunning_email_sent?: string;
  dunning_email_count: number;
}

interface DunningReport {
  period_days: number;
  events_summary: Record<string, Record<string, number>>;
  dunning_summary: Record<string, number>;
  recovery_rate: number;
  total_attempts: number;
  successful_recoveries: number;
}

const BillingManagementPage: React.FC = () => {
  const [dunningSubscriptions, setDunningSubscriptions] = useState<DunningSubscription[]>([]);
  const [dunningReport, setDunningReport] = useState<DunningReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  useEffect(() => {
    fetchDunningData();
  }, [selectedPeriod]);

  const fetchDunningData = async () => {
    try {
      setLoading(true);
      const baseUrl = 'http://localhost:8000';
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json',
        'X-Tenant-Type': 'admin',
        'X-Tenant-Slug': 'admin',
        'X-Tenant-Id': 'admin'
      };
      
      // Fetch dunning report
      const reportResponse = await fetch(`${baseUrl}/api/v1/admin/analytics/dunning-report?days=${selectedPeriod}`, { headers });
      const reportData = await reportResponse.json();
      setDunningReport(reportData);

      // Mock dunning subscriptions data - replace with actual API call
      const mockDunningSubscriptions: DunningSubscription[] = [
        {
          id: '1',
          organization_name: 'StartupXYZ',
          subscription_tier: 'starter',
          amount: 1900,
          currency: 'usd',
          status: 'past_due',
          dunning_status: 'second_attempt',
          failed_payment_count: 2,
          dunning_start_date: '2024-08-15T00:00:00Z',
          next_dunning_date: '2024-08-25T00:00:00Z',
          last_dunning_email_sent: '2024-08-22T00:00:00Z',
          dunning_email_count: 2,
        },
        {
          id: '2',
          organization_name: 'TechCorp',
          subscription_tier: 'professional',
          amount: 4900,
          currency: 'usd',
          status: 'past_due',
          dunning_status: 'first_attempt',
          failed_payment_count: 1,
          dunning_start_date: '2024-08-20T00:00:00Z',
          next_dunning_date: '2024-08-23T00:00:00Z',
          last_dunning_email_sent: '2024-08-20T00:00:00Z',
          dunning_email_count: 1,
        },
      ];
      
      setDunningSubscriptions(mockDunningSubscriptions);
    } catch (error) {
      console.error('Error fetching dunning data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processDunning = async () => {
    try {
      setProcessing(true);
      const response = await fetch('http://localhost:8000/api/v1/admin/analytics/process-dunning', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
          'X-Tenant-Type': 'admin',
          'X-Tenant-Slug': 'admin',
          'X-Tenant-Id': 'admin'
        },
      });
      const result = await response.json();
      console.log('Dunning process result:', result);
      
      // Refresh data after processing
      await fetchDunningData();
    } catch (error) {
      console.error('Error processing dunning:', error);
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getDunningStatusBadge = (status: string) => {
    switch (status) {
      case 'first_attempt':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <ClockIcon className="w-4 h-4 mr-1" />
            First Attempt
          </span>
        );
      case 'second_attempt':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
            Second Attempt
          </span>
        );
      case 'final_attempt':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircleIcon className="w-4 h-4 mr-1" />
            Final Attempt
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <XCircleIcon className="w-4 h-4 mr-1" />
            Suspended
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

  const getDaysOverdue = (dunningStartDate: string) => {
    const start = new Date(dunningStartDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
                <CurrencyDollarIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate">
                  Billing Management
                </h1>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Handle payment failures, dunning processes, and billing issues
              </p>
            </div>
            <div className="mt-6 flex space-x-3 md:mt-0 md:ml-4">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
              <button
                onClick={processDunning}
                disabled={processing}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                <ArrowPathIcon className={`-ml-1 mr-2 h-4 w-4 ${processing ? 'animate-spin' : ''}`} />
                Process Dunning
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dunning Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Subscriptions in Dunning
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {Object.values(dunningReport?.dunning_summary || {}).reduce((sum, count) => sum + count, 0)}
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
                  <CheckCircleIcon className="h-8 w-8 text-green-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Recovery Rate
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {dunningReport?.recovery_rate.toFixed(1) || 0}%
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
                  <ArrowPathIcon className="h-8 w-8 text-blue-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Attempts
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {dunningReport?.total_attempts || 0}
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
                      Recovered Payments
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {dunningReport?.successful_recoveries || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dunning Subscriptions Table */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Subscriptions Requiring Attention
              </h3>
              {dunningSubscriptions.length === 0 && (
                <span className="text-sm text-green-600">No subscriptions in dunning</span>
              )}
            </div>

            {dunningSubscriptions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Organization
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Plan & Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dunning Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Failed Attempts
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Days Overdue
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Next Action
                      </th>
                      <th className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dunningSubscriptions.map((subscription) => (
                      <tr key={subscription.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {subscription.organization_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {subscription.subscription_tier}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(subscription.amount, subscription.currency)}
                          </div>
                          <div className="text-sm text-gray-500">
                            per month
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getDunningStatusBadge(subscription.dunning_status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {subscription.failed_payment_count} failed
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getDaysOverdue(subscription.dunning_start_date)} days
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {subscription.last_dunning_email_sent ? (
                            <div>
                              <div>{new Date(subscription.last_dunning_email_sent).toLocaleDateString()}</div>
                              <div className="text-xs">({subscription.dunning_email_count} sent)</div>
                            </div>
                          ) : (
                            'Never'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(subscription.next_dunning_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button className="text-blue-600 hover:text-blue-900">
                              <EnvelopeIcon className="h-4 w-4" />
                            </button>
                            <button className="text-green-600 hover:text-green-900">
                              <ArrowPathIcon className="h-4 w-4" />
                            </button>
                            <button className="text-red-600 hover:text-red-900">
                              <XCircleIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">All caught up!</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No subscriptions currently require dunning attention.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Dunning Events Summary */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Dunning Activity Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Event Types</h4>
                <div className="space-y-2">
                  {Object.entries(dunningReport?.events_summary || {}).map(([eventType, statuses]) => (
                    <div key={eventType} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 capitalize">
                        {eventType.replace('_', ' ')}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {Object.values(statuses).reduce((sum, count) => sum + count, 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Dunning Status Distribution</h4>
                <div className="space-y-2">
                  {Object.entries(dunningReport?.dunning_summary || {}).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 capitalize">
                        {status.replace('_', ' ')}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingManagementPage;
