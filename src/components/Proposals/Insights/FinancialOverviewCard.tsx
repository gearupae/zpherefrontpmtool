import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FinancialOverview } from '../../../types/proposalInsights';
import { CurrencyDollarIcon, ExclamationTriangleIcon, DocumentTextIcon, CalendarIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { getTenantRoute } from '../../../utils/tenantUtils';
import { useAppSelector } from '../../../hooks/redux';

interface Props {
  financial: FinancialOverview | null;
  customerId?: string | null;
  isLoading?: boolean;
}

const formatCurrency = (cents?: number) => {
  if (typeof cents !== 'number') return '-';
  const amount = cents / 100;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const FinancialOverviewCard: React.FC<Props> = ({ financial, customerId, isLoading }) => {
  const { user } = useAppSelector((s) => s.auth);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 bg-gray-100 rounded" />
          <div className="h-16 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  const hasOverdue = (financial?.overdueInvoices || 0) > 0;

  const handleViewInvoices = () => {
    const baseRoute = getTenantRoute('/invoices', user?.role, user?.organization);
    if (customerId) {
      navigate(`${baseRoute}?customer=${customerId}`);
    } else {
      navigate(baseRoute);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 flex items-center mb-4">
          <CurrencyDollarIcon className="h-5 w-5 mr-2" />
          Financial Overview
        </h3>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Total Revenue</span>
            <span className="text-green-600 font-semibold">{formatCurrency(financial?.totalRevenue)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Pending Invoices</span>
            <span className="text-yellow-600 font-semibold">{financial?.pendingInvoices ?? '-'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Pending Amount</span>
            <span className="text-gray-900 font-semibold">{formatCurrency(financial?.pendingAmount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className={`flex items-center ${hasOverdue ? 'text-red-600' : 'text-gray-600'}`}>
              {hasOverdue && <ExclamationTriangleIcon className="h-3 w-3 mr-1" />}
              Overdue Invoices
            </span>
            <span className={`font-semibold ${hasOverdue ? 'text-red-600' : 'text-gray-900'}`}>{financial?.overdueInvoices ?? '-'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className={`${hasOverdue ? 'text-red-600' : 'text-gray-600'}`}>Total Overdue Amount</span>
            <span className={`font-semibold ${hasOverdue ? 'text-red-600' : 'text-gray-900'}`}>{formatCurrency(financial?.overdueAmount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 flex items-center">
              <CalendarIcon className="h-3 w-3 mr-1" />
              Next Payment Due
            </span>
            <span className="text-gray-900 font-medium">
              {financial?.nextDueDate ? new Date(financial.nextDueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
            </span>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={handleViewInvoices}
            className="w-full flex items-center justify-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
          >
            <BanknotesIcon className="h-4 w-4" />
            <span>View Invoices</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinancialOverviewCard;