import React, { useState, useEffect } from 'react';

interface Deadline {
  id: string;
  title: string;
  type: 'project' | 'task' | 'milestone';
  due_date: string;
  project_name: string;
  project_color: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface UpcomingDeadlinesWidgetProps {
  settings?: any;
  onUpdateSettings?: (settings: any) => void;
  compact?: boolean;
}

const UpcomingDeadlinesWidget: React.FC<UpcomingDeadlinesWidgetProps> = ({
  settings = {},
  onUpdateSettings,
  compact = false
}) => {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUpcomingDeadlines();
  }, []);

  const loadUpcomingDeadlines = async () => {
    try {
      setIsLoading(true);
      // Simulate API call
      setTimeout(() => {
        const mockDeadlines: Deadline[] = [
          {
            id: '1',
            title: 'Website Launch',
            type: 'project',
            due_date: new Date(Date.now() + 2 * 86400000).toISOString(),
            project_name: 'Website Redesign',
            project_color: 'bg-blue-500',
            priority: 'critical'
          },
          {
            id: '2',
            title: 'User Testing Phase',
            type: 'milestone',
            due_date: new Date(Date.now() + 5 * 86400000).toISOString(),
            project_name: 'Mobile App',
            project_color: 'bg-green-500',
            priority: 'high'
          },
          {
            id: '3',
            title: 'API Documentation',
            type: 'task',
            due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
            project_name: 'API Migration',
            project_color: 'bg-purple-500',
            priority: 'medium'
          },
          {
            id: '4',
            title: 'Security Audit',
            type: 'milestone',
            due_date: new Date(Date.now() + 14 * 86400000).toISOString(),
            project_name: 'Platform Security',
            project_color: 'bg-red-500',
            priority: 'high'
          }
        ];

        // Sort by due date
        mockDeadlines.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
        
        setDeadlines(mockDeadlines.slice(0, compact ? 3 : 5));
        setIsLoading(false);
      }, 400);
    } catch (error) {
      console.error('Failed to load deadlines:', error);
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays <= 7) return `In ${diffDays} days`;
    
    // For dates more than a week away, show the actual date
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getUrgencyColor = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'text-red-600 bg-red-100'; // Overdue
    if (diffDays <= 1) return 'text-red-600 bg-red-50'; // Due today/tomorrow
    if (diffDays <= 3) return 'text-orange-600 bg-orange-50'; // Due soon
    if (diffDays <= 7) return 'text-yellow-600 bg-yellow-50'; // Due this week
    return 'text-gray-600 bg-gray-50'; // Due later
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'project':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
          </svg>
        );
      case 'milestone':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'task':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-semibold text-gray-900 ${compact ? 'text-sm' : 'text-lg'}`}>
          Upcoming Deadlines
        </h3>
        <div className="text-sm text-gray-500">
          Next {deadlines.length}
        </div>
      </div>

      <div className={`space-y-${compact ? '2' : '3'}`}>
        {deadlines.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">No upcoming deadlines</p>
          </div>
        ) : (
          deadlines.map((deadline) => (
            <div
              key={deadline.id}
              className={`
                ${compact ? 'p-2' : 'p-3'} 
                border border-gray-200 rounded-lg hover:border-gray-300 transition-colors cursor-pointer
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className={`p-1.5 rounded-lg ${getUrgencyColor(deadline.due_date)}`}>
                    {getTypeIcon(deadline.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${deadline.project_color}`}></div>
                      <span className="text-xs text-gray-500 truncate">{deadline.project_name}</span>
                    </div>
                    <h4 className={`font-medium text-gray-900 truncate ${compact ? 'text-xs' : 'text-sm'}`}>
                      {deadline.title}
                    </h4>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`text-xs font-medium px-2 py-1 rounded-full ${getUrgencyColor(deadline.due_date)}`}>
                    {formatDate(deadline.due_date)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 capitalize">
                    {deadline.type}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {!compact && deadlines.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium">
            View All Deadlines →
          </button>
        </div>
      )}
    </div>
  );
};

export default UpcomingDeadlinesWidget;
