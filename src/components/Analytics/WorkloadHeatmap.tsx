import React, { useState, useEffect } from 'react';
import { 
  CalendarIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';

interface WorkloadHeatmapProps {
  teamMembers: any[];
  tasks: any[];
}

interface WorkloadData {
  userId: string;
  name: string;
  email: string;
  dailyWorkload: { [date: string]: number };
  weeklyWorkload: { [week: string]: number };
  currentLoad: number;
  capacity: number;
  utilization: number;
  status: 'available' | 'busy' | 'overloaded';
}

const WorkloadHeatmap: React.FC<WorkloadHeatmapProps> = ({ teamMembers, tasks }) => {
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('weekly');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current');
  const [workloadData, setWorkloadData] = useState<WorkloadData[]>([]);

  useEffect(() => {
    calculateWorkloadData();
  }, [teamMembers, tasks, viewMode]);

  const calculateWorkloadData = () => {
    const data: WorkloadData[] = teamMembers.map(member => {
      const memberTasks = tasks.filter(task => task.assignee_id === member.id);
      
      // Calculate daily/weekly workload
      const dailyWorkload: { [date: string]: number } = {};
      const weeklyWorkload: { [week: string]: number } = {};
      
      // Generate dates for the next 4 weeks
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + 28);
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        dailyWorkload[dateStr] = 0;
      }
      
      // Calculate workload for each task
      memberTasks.forEach(task => {
        if (task.due_date && task.estimated_hours) {
          const dueDate = new Date(task.due_date);
          const dateStr = dueDate.toISOString().split('T')[0];
          
          if (dailyWorkload[dateStr] !== undefined) {
            dailyWorkload[dateStr] += task.estimated_hours || 1;
          }
        }
      });
      
      // Calculate weekly totals
      Object.keys(dailyWorkload).forEach(date => {
        const d = new Date(date);
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!weeklyWorkload[weekKey]) {
          weeklyWorkload[weekKey] = 0;
        }
        weeklyWorkload[weekKey] += dailyWorkload[date];
      });
      
      // Calculate current load and utilization
      const currentLoad = Object.values(weeklyWorkload)[0] || 0;
      const capacity = 40; // Standard 40-hour work week
      const utilization = (currentLoad / capacity) * 100;
      
      let status: 'available' | 'busy' | 'overloaded' = 'available';
      if (utilization > 100) status = 'overloaded';
      else if (utilization > 80) status = 'busy';
      
      return {
        userId: member.id,
        name: `${member.first_name} ${member.last_name}`,
        email: member.email,
        dailyWorkload,
        weeklyWorkload,
        currentLoad,
        capacity,
        utilization: Math.round(utilization),
        status
      };
    });
    
    setWorkloadData(data);
  };

  const getWorkloadColor = (hours: number, capacity: number = 8) => {
    const utilization = (hours / capacity) * 100;
    if (utilization === 0) return 'bg-gray-100';
    if (utilization <= 50) return 'bg-green-200';
    if (utilization <= 80) return 'bg-yellow-200';
    if (utilization <= 100) return 'bg-orange-300';
    return 'bg-red-400';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
      case 'busy':
        return <ClockIcon className="h-4 w-4 text-yellow-600" />;
      case 'overloaded':
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />;
      default:
        return <CheckCircleIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-50 text-green-700 border border-green-200';
      case 'busy':
        return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      case 'overloaded':
        return 'bg-red-50 text-red-700 border border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  const getDates = () => {
    const dates = [];
    const start = new Date();
    for (let i = 0; i < (viewMode === 'daily' ? 14 : 4); i++) {
      const date = new Date(start);
      if (viewMode === 'daily') {
        date.setDate(start.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
      } else {
        date.setDate(start.getDate() + (i * 7));
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        dates.push(weekStart.toISOString().split('T')[0]);
      }
    }
    return dates;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (viewMode === 'daily') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      const endDate = new Date(date);
      endDate.setDate(date.getDate() + 6);
      return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <CalendarIcon className="h-6 w-6 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900">Team Workload Heatmap</h3>
        </div>
        
        <div className="flex space-x-2">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'daily' | 'weekly')}
            className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="daily">Daily View</option>
            <option value="weekly">Weekly View</option>
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center space-x-4 mb-4 text-sm">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-gray-100 rounded"></div>
          <span>No work</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-200 rounded"></div>
          <span>Light (≤50%)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-yellow-200 rounded"></div>
          <span>Moderate (≤80%)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-orange-300 rounded"></div>
          <span>Full (≤100%)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-red-400 rounded"></div>
          <span>Overloaded (&gt;100%)</span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="text-left py-2 px-3 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">Team Member</span>
                </div>
              </th>
              <th className="text-center py-2 px-3 border-b border-gray-200">
                <span className="font-medium text-gray-900">Status</span>
              </th>
              <th className="text-center py-2 px-3 border-b border-gray-200">
                <span className="font-medium text-gray-900">Utilization</span>
              </th>
              {getDates().map(date => (
                <th key={date} className="text-center py-2 px-2 border-b border-gray-200 min-w-[80px]">
                  <span className="text-xs font-medium text-gray-600">
                    {formatDate(date)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {workloadData.map(member => (
              <tr key={member.userId} className="hover:bg-gray-50">
                <td className="py-3 px-3 border-b border-gray-100">
                  <div>
                    <div className="font-medium text-[#0d0d0d]">{member.name}</div>
                    <div className="text-sm text-gray-500">{member.email}</div>
                  </div>
                </td>
                <td className="py-3 px-3 border-b border-gray-100 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    {getStatusIcon(member.status)}
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                      {member.status}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-3 border-b border-gray-100 text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <span className="font-medium text-[#0d0d0d]">{member.utilization}%</span>
                    <div className="w-8 h-2 bg-gray-200 rounded-full">
                      <div 
                        className={`h-2 rounded-full ${
                          member.utilization > 100 ? 'bg-red-500' : 
                          member.utilization > 80 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(member.utilization, 100)}%` }}
                      />
                    </div>
                  </div>
                </td>
                {getDates().map(date => {
                  const workload = viewMode === 'daily' 
                    ? member.dailyWorkload[date] || 0
                    : member.weeklyWorkload[date] || 0;
                  const capacity = viewMode === 'daily' ? 8 : 40;
                  
                  return (
                    <td key={date} className="py-3 px-2 border-b border-gray-100 text-center">
                      <div 
                        className={`w-12 h-8 rounded mx-auto flex items-center justify-center text-xs font-medium ${getWorkloadColor(workload, capacity)}`}
                        title={`${workload}h / ${capacity}h (${Math.round((workload/capacity)*100)}%)`}
                      >
                        {workload > 0 ? `${workload}h` : ''}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
          <div className="text-green-700 font-medium">Available</div>
          <div className="text-green-900 text-lg font-bold">
            {workloadData.filter(m => m.status === 'available').length}
          </div>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
          <div className="text-yellow-700 font-medium">Busy</div>
          <div className="text-yellow-900 text-lg font-bold">
            {workloadData.filter(m => m.status === 'busy').length}
          </div>
        </div>
        <div className="bg-red-50 p-3 rounded-lg border border-red-200">
          <div className="text-red-700 font-medium">Overloaded</div>
          <div className="text-red-900 text-lg font-bold">
            {workloadData.filter(m => m.status === 'overloaded').length}
          </div>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="text-blue-700 font-medium">Avg Utilization</div>
          <div className="text-blue-900 text-lg font-bold">
            {Math.round(workloadData.reduce((acc, m) => acc + m.utilization, 0) / workloadData.length || 0)}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkloadHeatmap;
