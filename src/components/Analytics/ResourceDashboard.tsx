import React, { useState, useEffect } from 'react';
import { 
  UsersIcon, 
  ExclamationTriangleIcon,
  ChartBarIcon,
  CalendarIcon,
  ClockIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import WorkloadHeatmap from './WorkloadHeatmap';

interface ResourceDashboardProps {
  teamMembers: any[];
  tasks: any[];
  projects: any[];
}

interface ResourceAllocation {
  memberId: string;
  name: string;
  currentProjects: number;
  totalTasks: number;
  completedTasks: number;
  estimatedHours: number;
  actualHours: number;
  utilization: number;
  efficiency: number;
  capacityStatus: 'underutilized' | 'optimal' | 'overloaded';
  upcomingDeadlines: number;
  skillTags: string[];
}

const ResourceDashboard: React.FC<ResourceDashboardProps> = ({ teamMembers, tasks, projects }) => {
  const [resourceData, setResourceData] = useState<ResourceAllocation[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'quarter'>('month');

  useEffect(() => {
    calculateResourceAllocation();
  }, [teamMembers, tasks, projects, selectedTimeframe]);

  const calculateResourceAllocation = () => {
    const data: ResourceAllocation[] = teamMembers.map(member => {
      const memberTasks = tasks.filter(task => task.assignee_id === member.id);
      const memberProjects = projects.filter(project => 
        memberTasks.some(task => task.project_id === project.id)
      );

      const totalTasks = memberTasks.length;
      const completedTasks = memberTasks.filter(task => task.status === 'completed').length;
      const estimatedHours = memberTasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0);
      const actualHours = memberTasks.reduce((sum, task) => sum + (task.actual_hours || 0), 0);
      
      // Calculate utilization based on 40-hour work week
      const weeklyCapacity = 40;
      const utilization = Math.min((estimatedHours / weeklyCapacity) * 100, 200); // Cap at 200%
      
      // Calculate efficiency (actual vs estimated)
      const efficiency = estimatedHours > 0 ? (estimatedHours / actualHours) * 100 : 100;
      
      // Determine capacity status
      let capacityStatus: 'underutilized' | 'optimal' | 'overloaded' = 'optimal';
      if (utilization < 70) capacityStatus = 'underutilized';
      else if (utilization > 100) capacityStatus = 'overloaded';
      
      // Count upcoming deadlines (next 7 days)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const upcomingDeadlines = memberTasks.filter(task => 
        task.due_date && new Date(task.due_date) <= nextWeek && task.status !== 'completed'
      ).length;

      // Mock skill tags (would come from user profile in real app)
      const skillTags = ['JavaScript', 'React', 'Node.js', 'Python'].slice(0, Math.floor(Math.random() * 3) + 1);

      return {
        memberId: member.id,
        name: `${member.first_name} ${member.last_name}`,
        currentProjects: memberProjects.length,
        totalTasks,
        completedTasks,
        estimatedHours,
        actualHours,
        utilization: Math.round(utilization),
        efficiency: Math.round(efficiency),
        capacityStatus,
        upcomingDeadlines,
        skillTags
      };
    });

    // Sort by utilization (highest first)
    data.sort((a, b) => b.utilization - a.utilization);
    setResourceData(data);
  };

  const getCapacityColor = (status: string) => {
    switch (status) {
      case 'underutilized':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'optimal':
        return 'bg-green-50 text-green-700 border border-green-200';
      case 'overloaded':
        return 'bg-red-50 text-red-700 border border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  const getCapacityIcon = (status: string) => {
    switch (status) {
      case 'underutilized':
        return <ChartBarIcon className="h-4 w-4 text-blue-600" />;
      case 'optimal':
        return <BoltIcon className="h-4 w-4 text-green-600" />;
      case 'overloaded':
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const overallStats = {
    totalMembers: resourceData.length,
    underutilized: resourceData.filter(r => r.capacityStatus === 'underutilized').length,
    optimal: resourceData.filter(r => r.capacityStatus === 'optimal').length,
    overloaded: resourceData.filter(r => r.capacityStatus === 'overloaded').length,
    avgUtilization: Math.round(resourceData.reduce((sum, r) => sum + r.utilization, 0) / resourceData.length || 0),
    totalUpcomingDeadlines: resourceData.reduce((sum, r) => sum + r.upcomingDeadlines, 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <UsersIcon className="h-6 w-6 text-gray-500" />
          <h2 className="text-xl font-semibold text-[#0d0d0d]">Resource Allocation Dashboard</h2>
        </div>
        
        <div className="flex space-x-3">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as 'week' | 'month' | 'quarter')}
            className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>
          
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              showHeatmap 
                ? 'bg-blue-600 text-white' 
                : 'border border-gray-300 text-[#0d0d0d] bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300'
            }`}
          >
            {showHeatmap ? 'Hide Heatmap' : 'Show Heatmap'}
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Members</p>
              <p className="text-2xl font-bold text-[#0d0d0d]">{overallStats.totalMembers}</p>
            </div>
            <UsersIcon className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg shadow border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Underutilized</p>
              <p className="text-2xl font-bold text-blue-700">{overallStats.underutilized}</p>
            </div>
            <ChartBarIcon className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg shadow border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Optimal</p>
              <p className="text-2xl font-bold text-green-700">{overallStats.optimal}</p>
            </div>
            <BoltIcon className="h-8 w-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-red-50 p-4 rounded-lg shadow border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Overloaded</p>
              <p className="text-2xl font-bold text-red-700">{overallStats.overloaded}</p>
            </div>
            <ExclamationTriangleIcon className="h-8 w-8 text-red-400" />
          </div>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg shadow border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Upcoming Deadlines</p>
              <p className="text-2xl font-bold text-yellow-700">{overallStats.totalUpcomingDeadlines}</p>
            </div>
            <CalendarIcon className="h-8 w-8 text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Workload Heatmap */}
      {showHeatmap && (
        <WorkloadHeatmap teamMembers={teamMembers} tasks={tasks} />
      )}

      {/* Resource Allocation Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-[#0d0d0d]">Team Member Allocation</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team Member
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capacity Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilization
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Projects
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tasks
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Efficiency
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Upcoming Deadlines
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Skills
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {resourceData.map((resource) => (
                <tr key={resource.memberId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-[#0d0d0d]">{resource.name}</div>
                    <div className="text-sm text-gray-500">{resource.estimatedHours}h estimated</div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center space-x-2">
                      {getCapacityIcon(resource.capacityStatus)}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCapacityColor(resource.capacityStatus)}`}>
                        {resource.capacityStatus}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-sm font-medium text-[#0d0d0d]">{resource.utilization}%</span>
                      <div className="w-16 h-2 bg-gray-200 rounded-full">
                        <div 
                          className={`h-2 rounded-full ${
                            resource.utilization > 100 ? 'bg-red-500' : 
                            resource.utilization > 70 ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(resource.utilization, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-sm font-medium text-[#0d0d0d]">{resource.currentProjects}</span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm text-[#0d0d0d]">
                      <span className="font-medium">{resource.completedTasks}</span>
                      <span className="text-gray-500">/{resource.totalTasks}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {resource.totalTasks > 0 ? Math.round((resource.completedTasks / resource.totalTasks) * 100) : 0}% complete
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`text-sm font-medium ${
                      resource.efficiency >= 100 ? 'text-green-600' : 
                      resource.efficiency >= 80 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {resource.efficiency}%
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {resource.upcomingDeadlines > 0 ? (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        resource.upcomingDeadlines > 3 ? 'bg-red-100 text-red-800' : 
                        resource.upcomingDeadlines > 1 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {resource.upcomingDeadlines}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">None</span>
                    )}
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {resource.skillTags.map((skill, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-yellow-800 mb-2">💡 Resource Optimization Recommendations</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          {overallStats.overloaded > 0 && (
            <li>• Consider redistributing tasks from overloaded team members ({overallStats.overloaded} members at &gt;100% capacity)</li>
          )}
          {overallStats.underutilized > 0 && (
            <li>• {overallStats.underutilized} team members are underutilized and could take on additional work</li>
          )}
          {overallStats.totalUpcomingDeadlines > 5 && (
            <li>• High number of upcoming deadlines ({overallStats.totalUpcomingDeadlines}) - consider prioritization and resource reallocation</li>
          )}
          {overallStats.avgUtilization < 70 && (
            <li>• Overall team utilization is low ({overallStats.avgUtilization}%) - consider taking on additional projects or reducing team size</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default ResourceDashboard;
