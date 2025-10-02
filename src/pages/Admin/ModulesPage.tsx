import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';

interface Module {
  id: string;
  name: string;
  description: string;
  category: string;
  price_per_month: number;
  is_core: boolean;
  is_available: boolean;
  features: string;
  created_at: string;
  updated_at?: string;
}

interface ModuleStats {
  module_id: string;
  module_name: string;
  category: string;
  price_per_month: number;
  total_tenants: number;
  enabled_tenants: number;
  disabled_tenants: number;
  monthly_revenue: number;
  usage_percentage: number;
}

const ModulesPage: React.FC = () => {
  const [modules, setModules] = useState<Module[]>([]);
  const [moduleStats, setModuleStats] = useState<ModuleStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const [modulesResponse, statsResponse] = await Promise.all([
        apiClient.get('/admin/modules/'),
        apiClient.get('/admin/modules/stats')
      ]);
      
      setModules(modulesResponse.data);
      setModuleStats(statsResponse.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching modules:', error);
      // Fallback to some mock data if API fails
      setModules([
        {
          id: '1',
          name: 'Project Management',
          description: 'Complete project management suite with tasks, milestones, and Gantt charts',
          category: 'Core',
          price_per_month: 0.0,
          is_core: true,
          is_available: true,
          features: '["Task Management", "Milestones", "Gantt Charts"]',
          created_at: '2025-01-01',
        },
      ]);
      setLoading(false);
    }
  };

  const toggleModule = async (moduleId: string, currentAvailability: boolean) => {
    try {
      setActionLoading(moduleId);
      
      const updateData = { is_available: !currentAvailability };
      await apiClient.put(`/admin/modules/${moduleId}`, updateData);
      
      // Refresh data
      await fetchModules();
      setActionLoading(null);
    } catch (error) {
      console.error('Error toggling module:', error);
      setActionLoading(null);
    }
  };

  const getCategoryBadge = (category: string) => {
    const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full';
    switch (category) {
      case 'Core':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'Productivity':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'Finance':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'Communication':
        return `${baseClasses} bg-purple-100 text-purple-800`;
      case 'Analytics':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Module Management</h1>
          <p className="mt-2 text-gray-600">Manage platform modules and features available to tenants</p>
        </div>

        {/* Module Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">✓</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Available Modules</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {modules.filter(m => m.is_available).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">📦</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Modules</dt>
                    <dd className="text-lg font-medium text-gray-900">{modules.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">💰</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Monthly Revenue</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      ${moduleStats.reduce((sum, m) => sum + m.monthly_revenue, 0).toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {modules.map((module) => {
                const stats = moduleStats.find(s => s.module_id === module.id);
                return (
                  <div key={module.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">{module.name}</h3>
                          <span className={getCategoryBadge(module.category)}>
                            {module.category}
                          </span>
                          {module.is_core && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                              Core
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-4">{module.description}</p>
                        
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>Price: ${module.price_per_month}/month</span>
                          <span>{stats?.enabled_tenants || 0} tenants using</span>
                        </div>
                      </div>
                      
                      <div className="ml-4 flex flex-col items-end gap-2">
                        <div className={`w-3 h-3 rounded-full ${module.is_available ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                        {!module.is_core && (
                          <button
                            onClick={() => toggleModule(module.id, module.is_available)}
                            disabled={actionLoading === module.id}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
                              module.is_available
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {actionLoading === module.id 
                              ? 'Loading...' 
                              : module.is_available ? 'Disable' : 'Enable'
                            }
                          </button>
                        )}
                        {module.is_core && (
                          <span className="px-3 py-1 text-xs text-gray-500 bg-gray-100 rounded-md">
                            Required
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {module.is_available && stats && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Usage:</span>
                            <span className="font-medium text-gray-900">
                              {stats.usage_percentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Revenue:</span>
                            <span className="font-medium text-gray-900">
                              ${stats.monthly_revenue.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModulesPage;
