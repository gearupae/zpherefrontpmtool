import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectStats } from '../../../types/proposalInsights';
import { FolderIcon, CheckCircleIcon, XCircleIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';
import { getTenantRoute } from '../../../utils/tenantUtils';
import { useAppSelector } from '../../../hooks/redux';

interface Props {
  stats: ProjectStats | null;
  customerId?: string | null;
  isLoading?: boolean;
}

const ProjectStatsCard: React.FC<Props> = ({ stats, customerId, isLoading }) => {
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

  const trendDir = stats?.trend?.direction || 'flat';
  const TrendIcon = trendDir === 'up' ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
  const trendColor = trendDir === 'up' ? 'text-green-600' : trendDir === 'down' ? 'text-red-600' : 'text-gray-600';

  const handleViewProjects = () => {
    const baseRoute = getTenantRoute('/projects', user?.role, user?.organization);
    if (customerId) {
      navigate(`${baseRoute}?customer=${customerId}`);
    } else {
      navigate(baseRoute);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FolderIcon className="h-5 w-5 mr-2" />
            Project Statistics
          </h3>
          {stats?.trend && (
            <div className={`flex items-center text-sm ${trendColor}`}>
              <TrendIcon className="h-4 w-4 mr-1" />
              <span>{stats.trend.percent ? `${stats.trend.percent}%` : ''}</span>
            </div>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Total Projects</span>
            <span className="text-gray-900 font-semibold">
              {stats?.total ?? '-'}
              {typeof stats?.percentOfAll === 'number' && (
                <span className="ml-2 text-xs text-gray-500 font-normal">({stats.percentOfAll}%)</span>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Active</span>
            <span className="text-green-600 font-semibold">{stats?.active ?? '-'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Completed</span>
            <span className="text-blue-600 font-semibold">{stats?.completed ?? '-'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Cancelled</span>
            <span className="text-gray-900 font-semibold">{stats?.cancelled ?? '-'}</span>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={handleViewProjects}
            className="w-full flex items-center justify-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
          >
            <FolderIcon className="h-4 w-4" />
            <span>View All Projects</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectStatsCard;