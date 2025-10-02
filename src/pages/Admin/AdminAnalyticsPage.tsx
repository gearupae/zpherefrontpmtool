import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  UsersIcon,
  BuildingOfficeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';

interface AnalyticsData {
  revenue: {
    mrr: number;
    arr: number;
    revenue_timeline: Array<{ date: string; revenue: number }>;
    revenue_by_tier: Array<{ tier: string; revenue: number; count: number }>;
  };
  tenants: {
    organizations: {
      total: number;
      active: number;
      new_this_month: number;
    };
    subscriptions: {
      total: number;
      active: number;
      conversion_rate: number;
    };
  };
  churn: {
    churn_rate: number;
    cancelled_count: number;
    avg_lifetime_days: number;
  };
}

const AdminAnalyticsPage: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedPeriod]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [revenueResponse, tenantResponse, churnResponse] = await Promise.all([
        fetch(`/api/v1/admin/analytics/revenue-analytics?days=${getPeriodDays()}`),
        fetch('/api/v1/admin/analytics/tenant-analytics'),
        fetch(`/api/v1/admin/analytics/churn-analysis?days=${getPeriodDays()}`),
      ]);

      if (!revenueResponse.ok || !tenantResponse.ok || !churnResponse.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const [revenueData, tenantData, churnData] = await Promise.all([
        revenueResponse.json(),
        tenantResponse.json(),
        churnResponse.json(),
      ]);

      setAnalyticsData({
        revenue: revenueData,
        tenants: tenantData,
        churn: churnData,
      });
    } catch (err) {
      setError('Failed to load analytics data');
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPeriodDays = () => {
    switch (selectedPeriod) {
      case 'week': return 7;
      case 'month': return 30;
      case 'quarter': return 90;
      case 'year': return 365;
      default: return 30;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
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
          <div className="text-red-500 text-lg font-medium">{error}</div>
          <button
            onClick={fetchAnalyticsData}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
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
                <ChartBarIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate">
                  Analytics Dashboard
                </h1>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Revenue, growth, and business insights
              </p>
            </div>
            <div className="mt-6 flex space-x-3 md:mt-0 md:ml-4">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="week">Last 7 days</option>
                <option value="month">Last 30 days</option>
                <option value="quarter">Last 90 days</option>
                <option value="year">Last 365 days</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Monthly Recurring Revenue
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(analyticsData?.revenue.mrr || 0)}
                    </dd>
                    <dd className="text-sm text-gray-500">
                      {formatCurrency(analyticsData?.revenue.arr || 0)} ARR
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
                  <BuildingOfficeIcon className="h-8 w-8 text-blue-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Organizations
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {analyticsData?.tenants.organizations.total || 0}
                    </dd>
                    <dd className="text-sm text-green-600">
                      +{analyticsData?.tenants.organizations.new_this_month || 0} this month
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
                  <UsersIcon className="h-8 w-8 text-purple-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Active Subscriptions
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {analyticsData?.tenants.subscriptions.active || 0}
                    </dd>
                    <dd className="text-sm text-green-600">
                      {formatPercentage(analyticsData?.tenants.subscriptions.conversion_rate || 0)} conversion
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
                  <ArrowTrendingDownIcon className="h-8 w-8 text-red-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Churn Rate
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatPercentage(analyticsData?.churn.churn_rate || 0)}
                    </dd>
                    <dd className="text-sm text-gray-500">
                      {analyticsData?.churn.cancelled_count || 0} cancelled
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Revenue Over Time
            </h3>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">
                  Revenue chart would be rendered here
                </p>
                <p className="text-xs text-gray-400">
                  Total: {formatCurrency(
                    analyticsData?.revenue.revenue_timeline?.reduce(
                      (sum, item) => sum + item.revenue,
                      0
                    ) || 0
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Revenue by Tier */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Revenue by Subscription Tier
              </h3>
              <div className="space-y-4">
                {analyticsData?.revenue.revenue_by_tier?.map((tier, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="capitalize font-medium text-sm text-gray-900">
                        {tier.tier}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        ({tier.count} subscriptions)
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(tier.revenue)}
                    </span>
                  </div>
                )) || (
                  <p className="text-sm text-gray-500">No data available</p>
                )}
              </div>
            </div>
          </div>

          {/* Growth Metrics */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Growth Metrics
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    New Organizations
                  </span>
                  <div className="flex items-center">
                    <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-600">
                      {analyticsData?.tenants.organizations.new_this_month || 0}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    Conversion Rate
                  </span>
                  <span className="text-sm text-gray-900">
                    {formatPercentage(analyticsData?.tenants.subscriptions.conversion_rate || 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    Average Customer Lifetime
                  </span>
                  <span className="text-sm text-gray-900">
                    {Math.round(analyticsData?.churn.avg_lifetime_days || 0)} days
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    Active vs Total Ratio
                  </span>
                  <span className="text-sm text-gray-900">
                    {formatPercentage(
                      analyticsData?.tenants.organizations.total
                        ? (analyticsData.tenants.organizations.active / analyticsData.tenants.organizations.total) * 100
                        : 0
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg mt-8">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Key Insights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency((analyticsData?.revenue.mrr || 0) * 12)}
                </div>
                <div className="text-sm text-blue-800">
                  Projected Annual Revenue
                </div>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {analyticsData?.tenants.organizations.active || 0}
                </div>
                <div className="text-sm text-green-800">
                  Active Organizations
                </div>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {formatPercentage(100 - (analyticsData?.churn.churn_rate || 0))}
                </div>
                <div className="text-sm text-purple-800">
                  Retention Rate
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalyticsPage;
