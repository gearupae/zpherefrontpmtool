import React, { useState, useEffect } from 'react';

interface Activity {
  id: string;
  type: 'task_created' | 'task_completed' | 'project_updated' | 'comment_added' | 'file_uploaded';
  title: string;
  description: string;
  user_name: string;
  user_avatar?: string;
  project_name: string;
  project_color: string;
  timestamp: string;
}

interface RecentActivityWidgetProps {
  settings?: any;
  onUpdateSettings?: (settings: any) => void;
  compact?: boolean;
}

const RecentActivityWidget: React.FC<RecentActivityWidgetProps> = ({
  settings = {},
  onUpdateSettings,
  compact = false
}) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRecentActivity();
  }, []);

  const loadRecentActivity = async () => {
    try {
      setIsLoading(true);
      // Simulate API call
      setTimeout(() => {
        const mockActivities: Activity[] = [
          {
            id: '1',
            type: 'task_completed',
            title: 'Task Completed',
            description: 'Design mockups for login page completed',
            user_name: 'Sarah Johnson',
            project_name: 'Website Redesign',
            project_color: 'bg-blue-500',
            timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString()
          },
          {
            id: '2',
            type: 'comment_added',
            title: 'New Comment',
            description: 'Added feedback on API documentation',
            user_name: 'Mike Chen',
            project_name: 'API Migration',
            project_color: 'bg-green-500',
            timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString()
          },
          {
            id: '3',
            type: 'file_uploaded',
            title: 'File Uploaded',
            description: 'Uploaded design_specs_v2.pdf',
            user_name: 'Emily Davis',
            project_name: 'Dashboard V2',
            project_color: 'bg-purple-500',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '4',
            type: 'project_updated',
            title: 'Project Updated',
            description: 'Updated project timeline and milestones',
            user_name: 'John Smith',
            project_name: 'Mobile App',
            project_color: 'bg-orange-500',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '5',
            type: 'task_created',
            title: 'New Task',
            description: 'Created task: Implement user authentication',
            user_name: 'Alex Wilson',
            project_name: 'Platform Security',
            project_color: 'bg-red-500',
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
          }
        ];

        setActivities(mockActivities.slice(0, compact ? 3 : 5));
        setIsLoading(false);
      }, 350);
    } catch (error) {
      console.error('Failed to load activity:', error);
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task_completed':
        return (
          <div className="p-1.5 bg-green-100 rounded-lg">
            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'task_created':
        return (
          <div className="p-1.5 bg-blue-100 rounded-lg">
            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'project_updated':
        return (
          <div className="p-1.5 bg-orange-100 rounded-lg">
            <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'comment_added':
        return (
          <div className="p-1.5 bg-purple-100 rounded-lg">
            <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'file_uploaded':
        return (
          <div className="p-1.5 bg-gray-100 rounded-lg">
            <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="p-1.5 bg-gray-100 rounded-lg">
            <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-semibold text-gray-900 ${compact ? 'text-sm' : 'text-lg'}`}>
          Recent Activity
        </h3>
        <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
          View All
        </button>
      </div>

      <div className={`space-y-${compact ? '2' : '3'} max-h-64 overflow-y-auto`}>
        {activities.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className={`
                flex items-start space-x-3 
                ${compact ? 'p-2' : 'p-3'} 
                rounded-lg hover:bg-gray-50 transition-colors cursor-pointer
              `}
            >
              {getActivityIcon(activity.type)}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${activity.project_color}`}></div>
                  <span className="text-xs text-gray-500 truncate">{activity.project_name}</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">{formatTimestamp(activity.timestamp)}</span>
                </div>
                
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-gray-900 ${compact ? 'text-xs' : 'text-sm'}`}>
                      {activity.title}
                    </p>
                    <p className={`text-gray-600 truncate ${compact ? 'text-xs' : 'text-sm'} mt-1`}>
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      by {activity.user_name}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RecentActivityWidget;
