import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  UsersIcon,
  CreditCardIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { ChartBarIcon as ChartBarSolidIcon } from '@heroicons/react/24/solid';
import { apiClient } from '../../api/client';

interface DashboardStats {
  organizations: {
    total: number;
    active: number;
    inactive: number;
    new_this_month: number;
  };
  subscriptions: {
    total: number;
    active: number;
    trial: number;
    past_due: number;
    conversion_rate: number;
  };
  revenue: {
    mrr: number;
    arr: number;
    total_revenue: number;
  };
  dunning: {
    total_in_dunning: number;
    recovery_rate: number;
  };
}

const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default stats structure to prevent undefined access
  const defaultStats: DashboardStats = {
    organizations: { total: 0, active: 0, inactive: 0, new_this_month: 0 },
    subscriptions: { total: 0, active: 0, trial: 0, past_due: 0, conversion_rate: 0 },
    revenue: { mrr: 0, arr: 0, total_revenue: 0 },
    dunning: { total_in_dunning: 0, recovery_rate: 0 }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Fetch from multiple endpoints using apiClient with proper headers
      const [tenantResponse, revenueResponse, dunningResponse] = await Promise.all([
        apiClient.get('/admin/analytics/tenant-analytics'),
        apiClient.get('/admin/analytics/revenue-analytics'),
        apiClient.get('/admin/analytics/dunning-report'),
      ]);

      const tenantData = tenantResponse.data;
      const revenueData = revenueResponse.data;
      const dunningData = dunningResponse.data;

      setStats({
        organizations: {
          total: tenantData.organizations?.total || 0,
          active: tenantData.organizations?.active || 0,
          inactive: tenantData.organizations?.inactive || 0,
          new_this_month: tenantData.organizations?.new_this_month || 0,
        },
        subscriptions: {
          total: tenantData.subscriptions?.total || 0,
          active: tenantData.subscriptions?.by_status?.active || 0,
          trial: tenantData.subscriptions?.by_status?.trialing || 0,
          past_due: tenantData.subscriptions?.by_status?.past_due || 0,
          conversion_rate: tenantData.subscriptions?.trial_conversions || 0,
        },
        revenue: {
          mrr: revenueData.mrr || 0,
          arr: revenueData.arr || 0,
          total_revenue: revenueData.revenue_timeline?.reduce((sum: number, item: any) => sum + item.revenue, 0) || 0,
        },
        dunning: {
          total_in_dunning: Object.values(dunningData.dunning_summary || {}).reduce((sum: number, count: any) => sum + count, 0),
          recovery_rate: dunningData.recovery_rate || 0,
        },
      });
    } catch (err) {
      setError('Failed to fetch dashboard statistics');
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading dashboard</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <button
            onClick={fetchDashboardStats}
            className="mt-3 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const currentStats = stats || defaultStats;
  
  const statCards = [
    {
      title: 'Total Organizations',
      value: currentStats.organizations.total || 0,
      change: `+${currentStats.organizations.new_this_month || 0} this month`,
      icon: BuildingOfficeIcon,
      color: 'bg-blue-500',
    },
    {
      title: 'Active Subscriptions',
      value: currentStats.subscriptions.active || 0,
      change: `${(currentStats.subscriptions.conversion_rate || 0).toFixed(1)}% conversion rate`,
      icon: CheckCircleIcon,
      color: 'bg-green-500',
    },
    {
      title: 'Monthly Recurring Revenue',
      value: formatCurrency(currentStats.revenue.mrr || 0),
      change: `${formatCurrency(currentStats.revenue.arr || 0)} ARR`,
      icon: CurrencyDollarIcon,
      color: 'bg-purple-500',
    },
    {
      title: 'Past Due Subscriptions',
      value: currentStats.subscriptions.past_due || 0,
      change: `${(currentStats.dunning.recovery_rate || 0).toFixed(1)}% recovery rate`,
      icon: ExclamationTriangleIcon,
      color: 'bg-red-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:mx-auto lg:max-w-7xl lg:px-8">
          <div className="py-6 md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center">
                <ChartBarSolidIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate">
                  Admin Dashboard
                </h1>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Manage tenants, subscriptions, and billing across your platform
              </p>
            </div>
            <div className="mt-6 flex space-x-3 md:mt-0 md:ml-4">
              <button
                onClick={fetchDashboardStats}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <ClockIcon className="-ml-1 mr-2 h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {statCards.map((card, index) => (
            <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`${card.color} rounded-md p-3`}>
                      <card.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {card.title}
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {card.value}
                      </dd>
                      <dd className="text-sm text-gray-500">
                        {card.change}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <a
                href="/admin/tenants"
                className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg border border-gray-200 hover:border-gray-300"
              >
                <div>
                  <span className="rounded-lg inline-flex p-3 bg-blue-50 text-blue-700 ring-4 ring-white">
                    <BuildingOfficeIcon className="h-6 w-6" />
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-medium">
                    <span className="absolute inset-0" aria-hidden="true" />
                    Manage Tenants
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    View and manage all organizations
                  </p>
                </div>
              </a>

              <a
                href="/admin/subscriptions"
                className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg border border-gray-200 hover:border-gray-300"
              >
                <div>
                  <span className="rounded-lg inline-flex p-3 bg-green-50 text-green-700 ring-4 ring-white">
                    <CreditCardIcon className="h-6 w-6" />
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-medium">
                    <span className="absolute inset-0" aria-hidden="true" />
                    Subscriptions
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Manage billing and subscriptions
                  </p>
                </div>
              </a>

              <a
                href="/admin/analytics"
                className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg border border-gray-200 hover:border-gray-300"
              >
                <div>
                  <span className="rounded-lg inline-flex p-3 bg-purple-50 text-purple-700 ring-4 ring-white">
                    <ChartBarIcon className="h-6 w-6" />
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-medium">
                    <span className="absolute inset-0" aria-hidden="true" />
                    Analytics
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Revenue and usage analytics
                  </p>
                </div>
              </a>

              <a
                href="/admin/billing"
                className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg border border-gray-200 hover:border-gray-300"
              >
                <div>
                  <span className="rounded-lg inline-flex p-3 bg-yellow-50 text-yellow-700 ring-4 ring-white">
                    <CurrencyDollarIcon className="h-6 w-6" />
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-medium">
                    <span className="absolute inset-0" aria-hidden="true" />
                    Billing Management
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Handle billing issues and dunning
                  </p>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              System Status
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-sm font-medium text-green-800">
                    All services operational
                  </span>
                </div>
                <span className="text-xs text-green-600">Last checked: Just now</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <UsersIcon className="h-5 w-5 text-blue-500 mr-3" />
                  <span className="text-sm font-medium text-blue-800">
                    {stats?.organizations.active || 0} active organizations
                  </span>
                </div>
                <span className="text-xs text-blue-600">Updated 5 min ago</span>
              </div>

              {stats?.subscriptions?.past_due && stats.subscriptions.past_due > 0 && (
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center">
                    <XCircleIcon className="h-5 w-5 text-red-500 mr-3" />
                    <span className="text-sm font-medium text-red-800">
                      {stats.subscriptions.past_due} subscriptions need attention
                    </span>
                  </div>
                  <a
                    href="/admin/billing"
                    className="text-xs text-red-600 underline hover:text-red-800"
                  >
                    View details
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
