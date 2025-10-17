import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ProposalHistory } from '../../../types/proposalInsights';
import { DocumentTextIcon, CheckCircleIcon, ClockIcon, XCircleIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { getTenantRoute } from '../../../utils/tenantUtils';
import { useAppSelector } from '../../../hooks/redux';

interface Props {
  history: ProposalHistory | null;
  customerId?: string | null;
  isLoading?: boolean;
}

const ProposalHistoryCard: React.FC<Props> = ({ history, customerId, isLoading }) => {
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

  const handleViewProposals = () => {
    const baseRoute = getTenantRoute('/proposals', user?.role, user?.organization);
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
          <DocumentTextIcon className="h-5 w-5 mr-2" />
          Proposal History
        </h3>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Total Proposals</span>
            <span className="text-gray-900 font-semibold">{history?.total ?? '-'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 flex items-center"><CheckCircleIcon className="h-3 w-3 mr-1" /> Accepted</span>
            <span className="text-green-600 font-semibold">
              {history?.accepted ?? '-'}
              {typeof history?.acceptanceRate === 'number' && (
                <span className="ml-2 text-xs text-gray-500 font-normal">({history.acceptanceRate}%)</span>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 flex items-center"><ClockIcon className="h-3 w-3 mr-1" /> Pending</span>
            <span className="text-yellow-600 font-semibold">{history?.pending ?? '-'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 flex items-center"><XCircleIcon className="h-3 w-3 mr-1" /> Rejected</span>
            <span className="text-red-600 font-semibold">{history?.rejected ?? '-'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 flex items-center"><CalendarIcon className="h-3 w-3 mr-1" /> Latest Proposal</span>
            <span className="text-gray-900 font-medium">
              {history?.latestDate ? new Date(history.latestDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Average Response Time</span>
            <span className="text-gray-900 font-medium">{history?.avgResponseTime || '-'}</span>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={handleViewProposals}
            className="w-full flex items-center justify-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
          >
            <DocumentTextIcon className="h-4 w-4" />
            <span>View All Proposals</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProposalHistoryCard;