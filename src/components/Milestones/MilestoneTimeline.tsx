import React, { useState, useEffect } from 'react';
import { 
  FlagIcon, 
  CalendarIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  PlusIcon 
} from '@heroicons/react/24/outline';

interface Milestone {
  id: string;
  name: string;
  description: string;
  due_date: string;
  completed_date?: string;
  status: 'upcoming' | 'in_progress' | 'completed' | 'missed' | 'cancelled';
  completion_criteria: string[];
  associated_tasks: string[];
  color: string;
  icon: string;
  is_critical: boolean;
  is_overdue: boolean;
  completion_percentage: number;
}

interface MilestoneTimelineProps {
  projectId: string;
  onCreateMilestone: () => void;
}

const MilestoneTimeline: React.FC<MilestoneTimelineProps> = ({
  projectId,
  onCreateMilestone
}) => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchMilestones();
    }
  }, [projectId]);

  const fetchMilestones = async () => {
    setIsLoading(true);
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get(`/milestones/?project_id=${projectId}`);
      setMilestones(response.data);
    } catch (error) {
      console.error('Failed to fetch milestones:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string, isOverdue: boolean) => {
    if (isOverdue && status !== 'completed') return 'text-user-red';
    
    switch (status) {
      case 'completed':
        return 'text-user-green';
      case 'in_progress':
        return 'text-user-yellow';
      case 'missed':
        return 'text-user-red';
      case 'cancelled':
        return 'text-text-secondary';
      default:
        return 'text-user-blue';
    }
  };

  const getStatusIcon = (status: string, isOverdue: boolean) => {
    if (isOverdue && status !== 'completed') {
      return <ExclamationTriangleIcon className="h-5 w-5 text-user-red" />;
    }
    
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-user-green" />;
      case 'in_progress':
        return <div className="h-5 w-5 rounded-full border-2 border-user-yellow bg-user-yellow/20" />;
      default:
        return <FlagIcon className="h-5 w-5" />;
    }
  };

  const completeMilestone = async (milestoneId: string) => {
    try {
      const { default: apiClient } = await import('../../api/client');
      await apiClient.post(`/milestones/${milestoneId}/complete`);
      await fetchMilestones(); // Refresh the list
    } catch (error) {
      console.error('Failed to complete milestone:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center space-x-4 p-4 border border-border rounded-lg">
            <div className="w-6 h-6 bg-surface rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-surface rounded animate-pulse" />
              <div className="h-3 bg-surface rounded w-1/2 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-primary">Project Milestones</h3>
        <button
          onClick={onCreateMilestone}
          className="flex items-center space-x-2 px-3 py-2 text-sm bg-user-blue text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Add Milestone</span>
        </button>
      </div>

      {milestones.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border rounded-lg">
          <FlagIcon className="h-12 w-12 text-text-secondary mx-auto mb-4" />
          <p className="text-text-secondary">No milestones yet</p>
          <p className="text-sm text-text-muted">Create milestones to track key project checkpoints</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
          
          <div className="space-y-6">
            {milestones
              .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
              .map((milestone, index) => (
                <div key={milestone.id} className="relative flex items-start space-x-4">
                  {/* Timeline dot */}
                  <div 
                    className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-4 border-background"
                    style={{ backgroundColor: milestone.color }}
                  >
                    {getStatusIcon(milestone.status, milestone.is_overdue)}
                  </div>
                  
                  {/* Milestone content */}
                  <div className="flex-1 min-w-0 pb-6">
                    <div className="bg-background border border-border rounded-lg p-4 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-base font-semibold text-text-primary">
                              {milestone.name}
                            </h4>
                            {milestone.is_critical && (
                              <span className="px-2 py-1 text-xs bg-user-red/10 text-user-red rounded-full border border-user-red/20">
                                Critical
                              </span>
                            )}
                          </div>
                          
                          {milestone.description && (
                            <p className="text-sm text-text-secondary mt-1">
                              {milestone.description}
                            </p>
                          )}
                          
                          <div className="flex items-center space-x-4 mt-2 text-sm text-text-secondary">
                            <div className="flex items-center space-x-1">
                              <CalendarIcon className="h-4 w-4" />
                              <span>Due {formatDate(milestone.due_date)}</span>
                            </div>
                            
                            {milestone.completed_date && (
                              <div className="flex items-center space-x-1 text-user-green">
                                <CheckCircleIcon className="h-4 w-4" />
                                <span>Completed {formatDate(milestone.completed_date)}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Progress bar */}
                          {milestone.status !== 'completed' && (
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
                                <span>Progress</span>
                                <span>{milestone.completion_percentage}%</span>
                              </div>
                              <div className="w-full bg-surface rounded-full h-2">
                                <div 
                                  className="h-2 rounded-full transition-all duration-300"
                                  style={{ 
                                    width: `${milestone.completion_percentage}%`,
                                    backgroundColor: milestone.color 
                                  }}
                                />
                              </div>
                            </div>
                          )}
                          
                          {/* Completion criteria */}
                          {milestone.completion_criteria.length > 0 && (
                            <div className="mt-3">
                              <h5 className="text-xs font-medium text-text-secondary mb-2">
                                Completion Criteria:
                              </h5>
                              <ul className="space-y-1">
                                {milestone.completion_criteria.map((criteria, idx) => (
                                  <li key={idx} className="flex items-center space-x-2 text-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-text-secondary" />
                                    <span className="text-text-secondary">{criteria}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        
                        {/* Actions */}
                        {milestone.status !== 'completed' && milestone.status !== 'cancelled' && (
                          <div className="ml-4">
                            <button
                              onClick={() => completeMilestone(milestone.id)}
                              className="px-3 py-1.5 text-xs bg-user-green text-white rounded-lg hover:bg-green-600 transition-colors"
                            >
                              Mark Complete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MilestoneTimeline;
