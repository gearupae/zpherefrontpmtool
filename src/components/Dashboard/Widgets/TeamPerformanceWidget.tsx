import React, { useState, useEffect } from 'react';

interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  role: string;
  tasks_completed: number;
  tasks_assigned: number;
  velocity_score: number;
  status: 'active' | 'away' | 'busy';
}

interface TeamPerformanceWidgetProps {
  settings?: any;
  onUpdateSettings?: (settings: any) => void;
  compact?: boolean;
}

const TeamPerformanceWidget: React.FC<TeamPerformanceWidgetProps> = ({
  settings = {},
  onUpdateSettings,
  compact = false
}) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTeamPerformance();
  }, []);

  const loadTeamPerformance = async () => {
    try {
      setIsLoading(true);
      // Simulate API call
      setTimeout(() => {
        const mockTeamMembers: TeamMember[] = [
          {
            id: '1',
            name: 'Sarah Johnson',
            role: 'Frontend Developer',
            tasks_completed: 12,
            tasks_assigned: 15,
            velocity_score: 92,
            status: 'active'
          },
          {
            id: '2',
            name: 'Mike Chen',
            role: 'Backend Developer',
            tasks_completed: 8,
            tasks_assigned: 10,
            velocity_score: 88,
            status: 'active'
          },
          {
            id: '3',
            name: 'Emily Davis',
            role: 'UI/UX Designer',
            tasks_completed: 15,
            tasks_assigned: 18,
            velocity_score: 95,
            status: 'busy'
          },
          {
            id: '4',
            name: 'John Smith',
            role: 'Project Manager',
            tasks_completed: 6,
            tasks_assigned: 8,
            velocity_score: 85,
            status: 'active'
          },
          {
            id: '5',
            name: 'Alex Wilson',
            role: 'DevOps Engineer',
            tasks_completed: 4,
            tasks_assigned: 6,
            velocity_score: 78,
            status: 'away'
          }
        ];

        // Sort by velocity score
        mockTeamMembers.sort((a, b) => b.velocity_score - a.velocity_score);
        
        setTeamMembers(mockTeamMembers.slice(0, compact ? 3 : 5));
        setIsLoading(false);
      }, 450);
    } catch (error) {
      console.error('Failed to load team performance:', error);
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-400';
      case 'busy': return 'bg-yellow-400';
      case 'away': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getVelocityColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 80) return 'text-yellow-600 bg-yellow-100';
    if (score >= 70) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getCompletionRate = (completed: number, assigned: number) => {
    if (assigned === 0) return 0;
    return Math.round((completed / assigned) * 100);
  };

  const generateInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="w-12 h-6 bg-gray-200 rounded"></div>
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
          Team Performance
        </h3>
        <div className="text-sm text-gray-500">
          This week
        </div>
      </div>

      <div className={`space-y-${compact ? '2' : '3'}`}>
        {teamMembers.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-sm">No team data available</p>
          </div>
        ) : (
          teamMembers.map((member, index) => (
            <div
              key={member.id}
              className={`
                flex items-center justify-between 
                ${compact ? 'p-2' : 'p-3'} 
                rounded-lg hover:bg-gray-50 transition-colors cursor-pointer
              `}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="relative">
                  <div className={`
                    ${compact ? 'w-8 h-8' : 'w-10 h-10'} 
                    bg-blue-100 rounded-full flex items-center justify-center
                  `}>
                    <span className={`font-medium text-blue-800 ${compact ? 'text-xs' : 'text-sm'}`}>
                      {generateInitials(member.name)}
                    </span>
                  </div>
                  <div className={`
                    absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white
                    ${getStatusColor(member.status)}
                  `}></div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className={`font-medium text-gray-900 truncate ${compact ? 'text-sm' : ''}`}>
                    {member.name}
                  </h4>
                  <div className="flex items-center space-x-2">
                    <p className={`text-gray-500 truncate ${compact ? 'text-xs' : 'text-sm'}`}>
                      {member.role}
                    </p>
                    {!compact && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span className={`text-xs ${compact ? 'text-xs' : 'text-sm'} text-gray-600`}>
                          {member.tasks_completed}/{member.tasks_assigned} tasks
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {!compact && (
                  <div className="text-right mr-2">
                    <div className="text-xs text-gray-500">Completion</div>
                    <div className="text-sm font-medium text-gray-900">
                      {getCompletionRate(member.tasks_completed, member.tasks_assigned)}%
                    </div>
                  </div>
                )}
                
                <div className={`
                  text-xs font-medium px-2 rounded-full
                  ${getVelocityColor(member.velocity_score)}
                `}>
                  {member.velocity_score}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {!compact && teamMembers.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Team Average Velocity</span>
            <span className="font-medium text-gray-900">
              {Math.round(teamMembers.reduce((acc, member) => acc + member.velocity_score, 0) / teamMembers.length)}
            </span>
          </div>
          <div className="mt-2">
            <button className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium">
              View Detailed Analytics →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamPerformanceWidget;
