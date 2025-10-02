import React, { useState, useEffect } from 'react';

interface ProjectStatusWidgetProps {
  settings?: any;
  onUpdateSettings?: (settings: any) => void;
  compact?: boolean;
  showCompleted?: boolean;
  showArchived?: boolean;
}

interface ProjectStats {
  total: number;
  active: number;
  completed: number;
  onHold: number;
  cancelled: number;
}

const ProjectStatusWidget: React.FC<ProjectStatusWidgetProps> = ({
  settings = {},
  onUpdateSettings,
  compact = false,
  showCompleted = false,
  showArchived = false
}) => {
  const [stats, setStats] = useState<ProjectStats>({
    total: 0,
    active: 0,
    completed: 0,
    onHold: 0,
    cancelled: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjectStats();
  }, [showCompleted, showArchived]);

  const loadProjectStats = async () => {
    try {
      setIsLoading(true);
      // Simulate API call
      setTimeout(() => {
        setStats({
          total: 12,
          active: 7,
          completed: showCompleted ? 3 : 0,
          onHold: 2,
          cancelled: showArchived ? 1 : 0
        });
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error('Failed to load project stats:', error);
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      case 'onHold': return 'text-yellow-600 bg-yellow-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatLabel = (status: string) => {
    switch (status) {
      case 'onHold': return 'On Hold';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-semibold text-gray-900 ${compact ? 'text-sm' : 'text-lg'}`}>
          Project Status
        </h3>
        <div className="text-sm text-gray-500">
          {stats.total} total
        </div>
      </div>

      <div className={`grid ${compact ? 'grid-cols-2 gap-2' : 'grid-cols-2 gap-4'}`}>
        {Object.entries(stats)
          .filter(([key]) => key !== 'total')
          .filter(([key, value]) => {
            if (key === 'completed' && !showCompleted && value === 0) return false;
            if (key === 'cancelled' && !showArchived && value === 0) return false;
            return true;
          })
          .map(([status, count]) => (
            <div
              key={status}
              className={`
                ${compact ? 'p-2' : 'p-3'} 
                rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer
              `}
            >
              <div className="flex items-center justify-between">
                <div className={`text-xs font-medium ${getStatusColor(status)} px-2 py-1 rounded-full`}>
                  {formatLabel(status)}
                </div>
                <div className={`font-bold text-gray-900 ${compact ? 'text-lg' : 'text-xl'}`}>
                  {count}
                </div>
              </div>
            </div>
          ))
        }
      </div>

      {!compact && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Completion Rate</span>
            <span className="font-medium text-gray-900">
              {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
            </span>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%`
              }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectStatusWidget;
