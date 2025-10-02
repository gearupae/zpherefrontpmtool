import React, { useState } from 'react';
import { TeamMember, Task } from '../../types';
import {
  UsersIcon,
  RectangleStackIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserCircleIcon,
  StarIcon
} from '@heroicons/react/24/outline';

interface TeamPerformanceProps {
  teamMembers: TeamMember[];
  tasks: Task[];
}

const TeamPerformance: React.FC<TeamPerformanceProps> = ({ teamMembers, tasks }) => {
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'performance' | 'tasks' | 'overdue'>('performance');

  // Calculate team member performance
  const getMemberPerformance = (memberId: string) => {
    const memberTasks = tasks.filter(task => task.assignee_id === memberId);
    const totalTasks = memberTasks.length;
    const completedTasks = memberTasks.filter(task => task.status === 'completed').length;
    const overdueTasks = memberTasks.filter(task => {
      if (task.due_date && task.status !== 'completed') {
        return new Date(task.due_date) < new Date();
      }
      return false;
    }).length;
    const onTimeTasks = totalTasks - overdueTasks;

    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const onTimeRate = totalTasks > 0 ? (onTimeTasks / totalTasks) * 100 : 0;
    const performanceScore = (completionRate * 0.7) + (onTimeRate * 0.3);

    return {
      totalTasks,
      completedTasks,
      overdueTasks,
      onTimeTasks,
      completionRate,
      onTimeRate,
      performanceScore,
    };
  };

  // Calculate overall team performance
  const getTeamPerformance = () => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    const overdueTasks = tasks.filter(task => {
      if (task.due_date && task.status !== 'completed') {
        return new Date(task.due_date) < new Date();
      }
      return false;
    }).length;

    const overallCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const overallOnTimeRate = totalTasks > 0 ? ((totalTasks - overdueTasks) / totalTasks) * 100 : 0;

    // Calculate individual member scores
    const memberScores = teamMembers.map(member => {
      const performance = getMemberPerformance(member.id);
      return {
        member,
        performance,
      };
    });

    // Sort by performance score (create copy before sorting)
    const sortedMembers = [...memberScores].sort((a, b) => b.performance.performanceScore - a.performance.performanceScore);

    return {
      totalTasks,
      completedTasks,
      overdueTasks,
      overallCompletionRate,
      overallOnTimeRate,
      memberScores: sortedMembers,
    };
  };

  const teamData = getTeamPerformance();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success-100 text-success-800';
      case 'pending': return 'bg-warning-100 text-warning-800';
      case 'inactive': return 'bg-secondary-100 text-secondary-800';
      case 'suspended': return 'bg-error-100 text-error-800';
      default: return 'bg-secondary-100 text-secondary-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-error-100 text-error-800';
      case 'manager': return 'bg-warning-100 text-warning-800';
      case 'member': return 'bg-primary-100 text-primary-800';
      case 'client': return 'bg-secondary-100 text-secondary-800';
      default: return 'bg-secondary-100 text-secondary-800';
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-success-600';
    if (score >= 60) return 'text-warning-600';
    return 'text-error-600';
  };

  const getPerformanceIcon = (score: number) => {
    if (score >= 80) return <StarIcon className="h-4 w-4 text-success-600" />;
    if (score >= 60) return <CheckCircleIcon className="h-4 w-4 text-warning-600" />;
    return <ExclamationTriangleIcon className="h-4 w-4 text-error-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Team Overview */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
            <UsersIcon className="h-6 w-6 text-user-blue" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-secondary-900">Team Performance</h2>
            <p className="text-secondary-600">Overall team metrics and individual performance</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-user-blue">{teamData.totalTasks}</div>
            <div className="text-sm text-secondary-500">Total Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success-600">{teamData.completedTasks}</div>
            <div className="text-sm text-secondary-500">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-error-600">{teamData.overdueTasks}</div>
            <div className="text-sm text-secondary-500">Overdue</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-warning-600">{teamMembers.length}</div>
            <div className="text-sm text-secondary-500">Team Members</div>
          </div>
        </div>

        {/* Overall Progress Bars */}
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-secondary-600">Overall Completion Rate</span>
            <span className="text-sm font-medium text-secondary-900">
              {teamData.overallCompletionRate.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-secondary-200 rounded-full h-3">
            <div
              className="bg-user-green h-3 rounded-full transition-all duration-500"
              style={{ width: `${teamData.overallCompletionRate}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-secondary-600">On-Time Delivery Rate</span>
            <span className="text-sm font-medium text-secondary-900">
              {teamData.overallOnTimeRate.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-secondary-200 rounded-full h-3">
            <div
              className="bg-user-blue h-3 rounded-full transition-all duration-500"
              style={{ width: `${teamData.overallOnTimeRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Team Member Performance */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-secondary-900">Team Member Performance</h3>
          <div className="flex items-center space-x-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border-secondary-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="performance">Sort by Performance</option>
              <option value="tasks">Sort by Tasks</option>
              <option value="overdue">Sort by Overdue</option>
            </select>
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="border-secondary-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="all">All Members</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {teamData.memberScores
            .filter(memberScore => selectedMember === 'all' || memberScore.member.id === selectedMember)
            .map((memberScore, index) => {
              const { member, performance } = memberScore;
              const isTopPerformer = index < 3 && performance.performanceScore >= 80;
              
              return (
                <div 
                  key={member.id} 
                  className={`p-4 rounded-lg border transition-colors ${
                    isTopPerformer 
                      ? 'border-success-200 bg-success-50' 
                      : 'border-secondary-200 hover:bg-secondary-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-secondary-100 rounded-full flex items-center justify-center">
                          <UserCircleIcon className="h-6 w-6 text-secondary-600" />
                        </div>
                        {isTopPerformer && (
                          <div className="absolute -top-1 -right-1">
                            <StarIcon className="h-5 w-5 text-success-600" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-secondary-900">
                            {member.full_name}
                          </h4>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                            {member.role}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                            {member.status}
                          </span>
                        </div>
                        <p className="text-xs text-secondary-500">{member.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      {/* Performance Score */}
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {getPerformanceIcon(performance.performanceScore)}
                          <span className={`text-lg font-bold ${getPerformanceColor(performance.performanceScore)}`}>
                            {performance.performanceScore.toFixed(1)}
                          </span>
                        </div>
                        <div className="text-xs text-secondary-500">Score</div>
                      </div>
                      
                      {/* Task Stats */}
                      <div className="text-center">
                        <div className="text-lg font-bold text-secondary-900">
                          {performance.completedTasks}/{performance.totalTasks}
                        </div>
                        <div className="text-xs text-secondary-500">Tasks</div>
                      </div>
                      
                      {/* Completion Rate */}
                      <div className="text-center">
                        <div className="text-lg font-bold text-secondary-900">
                          {performance.completionRate.toFixed(1)}%
                        </div>
                        <div className="text-xs text-secondary-500">Complete</div>
                      </div>
                      
                      {/* Overdue Tasks */}
                      <div className="text-center">
                        <div className={`text-lg font-bold ${
                          performance.overdueTasks > 0 ? 'text-error-600' : 'text-success-600'
                        }`}>
                          {performance.overdueTasks}
                        </div>
                        <div className="text-xs text-secondary-500">Overdue</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bars */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-secondary-500">Completion Rate</span>
                      <span className="text-xs text-secondary-500">{performance.completionRate.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-secondary-200 rounded-full h-2">
                      <div
                        className="bg-user-green h-2 rounded-full transition-all duration-500"
                        style={{ width: `${performance.completionRate}%` }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-secondary-500">On-Time Rate</span>
                      <span className="text-xs text-secondary-500">{performance.onTimeRate.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-secondary-200 rounded-full h-2">
                      <div
                        className="bg-user-blue h-2 rounded-full transition-all duration-500"
                        style={{ width: `${performance.onTimeRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Performance Insights */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-secondary-900 mb-4">Performance Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Performers */}
          <div>
            <h4 className="text-sm font-medium text-secondary-900 mb-3">Top Performers</h4>
            <div className="space-y-2">
              {teamData.memberScores
                .filter(member => member.performance.performanceScore >= 80)
                .slice(0, 3)
                .map((memberScore, index) => (
                  <div key={memberScore.member.id} className="flex items-center space-x-3 p-2 rounded-lg bg-success-50">
                    <div className="w-6 h-6 bg-success-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-success-700">{index + 1}</span>
                    </div>
                    <span className="text-sm font-medium text-secondary-900">
                      {memberScore.member.full_name}
                    </span>
                    <span className="text-sm text-success-600 font-medium">
                      {memberScore.performance.performanceScore.toFixed(1)}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Areas for Improvement */}
          <div>
            <h4 className="text-sm font-medium text-secondary-900 mb-3">Areas for Improvement</h4>
            <div className="space-y-2">
              {teamData.memberScores
                .filter(member => member.performance.overdueTasks > 0)
                .slice(0, 3)
                .map((memberScore) => (
                  <div key={memberScore.member.id} className="flex items-center justify-between p-2 rounded-lg bg-warning-50">
                    <span className="text-sm font-medium text-secondary-900">
                      {memberScore.member.full_name}
                    </span>
                    <span className="text-sm text-warning-600 font-medium">
                      {memberScore.performance.overdueTasks} overdue
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamPerformance;
