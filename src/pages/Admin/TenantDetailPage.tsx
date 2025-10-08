import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  subscription_status: string;
  payment_status: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  settings: any;
  users_count: number;
  role_distribution: {
    ADMIN: number;
    MANAGER: number;
    MEMBER: number;
    CLIENT: number;
  };
  projects_count: number;
  storage_used: string;
  last_active: string | null;
  admin_user?: {
    id: string;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    role: string;
    last_login: string | null;
    created_at: string;
  };
}

interface TenantModule {
  id: string;
  name: string;
  description: string;
  category: string;
  price_per_month: number;
  is_core: boolean;
  is_available: boolean;
  features: string;
  is_enabled_for_tenant: boolean;
  tenant_module_id: string | null;
}

const TenantDetailPage: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [modules, setModules] = useState<TenantModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [moduleActionLoading, setModuleActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId) {
      fetchTenantDetails();
      fetchTenantModules();
    }
  }, [tenantId]);

  const fetchTenantDetails = async () => {
    try {
      const response = await apiClient.get(`/admin/tenants/${tenantId}`);
      setTenant(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tenant details:', error);
      setLoading(false);
    }
  };

  const fetchTenantModules = async () => {
    try {
      const response = await apiClient.get(`/admin/tenants/${tenantId}/modules`);
      setModules(response.data.modules);
      setModulesLoading(false);
    } catch (error) {
      console.error('Error fetching tenant modules:', error);
      setModulesLoading(false);
    }
  };

  const toggleModule = async (moduleId: string) => {
    try {
      setModuleActionLoading(moduleId);
      await apiClient.post(`/admin/tenants/${tenantId}/modules/${moduleId}/toggle`);
      // Refresh modules after toggle
      await fetchTenantModules();
      setModuleActionLoading(null);
    } catch (error) {
      console.error('Error toggling module:', error);
      setModuleActionLoading(null);
    }
  };

  const handleStatusChange = async (isActive: boolean) => {
    if (!tenant) return;
    
    try {
      setActionLoading(true);
      await apiClient.put(`/admin/tenants/${tenant.id}/status`, null, {
        params: { is_active: isActive }
      });
      
      setTenant({ ...tenant, is_active: isActive });
      setActionLoading(false);
    } catch (error) {
      console.error('Error updating tenant status:', error);
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-3 py-1 text-sm font-medium rounded-full';
    switch (status) {
      case 'active':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'trial':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'suspended':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'paid':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'overdue':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
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

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Tenant Not Found</h2>
          <button
            onClick={() => navigate('/admin/tenants')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Back to Tenants
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin/tenants')}
            className="mb-4 text-indigo-600 hover:text-indigo-800 font-medium"
          >
            ← Back to Tenants
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{tenant.name}</h1>
              <p className="mt-2 text-gray-600">/{tenant.slug}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className={getStatusBadge(tenant.subscription_status)}>
                {tenant.subscription_status}
              </span>
              {tenant.is_active ? (
                <button
                  onClick={() => handleStatusChange(false)}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Suspending...' : 'Suspend Tenant'}
                </button>
              ) : (
                <button
                  onClick={() => handleStatusChange(true)}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Activating...' : 'Activate Tenant'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Overview</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Organization Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{tenant.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Slug</dt>
                  <dd className="mt-1 text-sm text-gray-900">{tenant.slug}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(tenant.created_at).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {tenant.updated_at ? new Date(tenant.updated_at).toLocaleDateString() : 'Never'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1">
                    <span className={tenant.is_active ? 'text-green-600' : 'text-red-600'}>
                      {tenant.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Storage Used</dt>
                  <dd className="mt-1 text-sm text-gray-900">{tenant.storage_used}</dd>
                </div>
                {tenant.admin_user && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Admin Email</dt>
                    <dd className="mt-1 text-sm text-gray-900">{tenant.admin_user.email}</dd>
                  </div>
                )}
                {tenant.admin_user && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Admin Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {tenant.admin_user.first_name} {tenant.admin_user.last_name}
                    </dd>
                  </div>
                )}
              </div>
              {tenant.description && (
                <div className="mt-4">
                  <dt className="text-sm font-medium text-gray-500">Description</dt>
                  <dd className="mt-1 text-sm text-gray-900">{tenant.description}</dd>
                </div>
              )}
            </div>

            {/* User Statistics */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">User Distribution</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="metric-card metric-red text-center">
                  <div className="metric-value text-2xl font-bold">{tenant.role_distribution.ADMIN}</div>
                  <div className="text-sm text-gray-500">Admins</div>
                </div>
                <div className="metric-card metric-blue text-center">
                  <div className="metric-value text-2xl font-bold">{tenant.role_distribution.MANAGER}</div>
                  <div className="text-sm text-gray-500">Managers</div>
                </div>
                <div className="metric-card metric-green text-center">
                  <div className="metric-value text-2xl font-bold">{tenant.role_distribution.MEMBER}</div>
                  <div className="text-sm text-gray-500">Members</div>
                </div>
                <div className="metric-card metric-purple text-center">
                  <div className="metric-value text-2xl font-bold">{tenant.role_distribution.CLIENT}</div>
                  <div className="text-sm text-gray-500">Clients</div>
                </div>
              </div>
            </div>

            {/* Admin User Details */}
            {tenant.admin_user && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Admin User Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {tenant.admin_user.first_name} {tenant.admin_user.last_name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900">{tenant.admin_user.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Username</dt>
                    <dd className="mt-1 text-sm text-gray-900">{tenant.admin_user.username}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Role</dt>
                    <dd className="mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {tenant.admin_user.role}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Last Login</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {tenant.admin_user.last_login 
                        ? new Date(tenant.admin_user.last_login).toLocaleString()
                        : 'Never'
                      }
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(tenant.admin_user.created_at).toLocaleDateString()}
                    </dd>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Total Users</span>
                  <span className="text-sm font-medium text-gray-900">{tenant.users_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Projects</span>
                  <span className="text-sm font-medium text-gray-900">{tenant.projects_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Subscription</span>
                  <span className={getStatusBadge(tenant.subscription_status)}>
                    {tenant.subscription_status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Payment</span>
                  <span className={getStatusBadge(tenant.payment_status)}>
                    {tenant.payment_status}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-md border">
                  View Usage Analytics
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-md border">
                  Manage Subscription
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-md border">
                  View Payment History
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-md border">
                  Access Tenant Dashboard
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-md border border-red-200">
                  Delete Tenant
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Module Management Section */}
        <div className="mt-8">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Business Module Management</h3>
            <p className="text-sm text-gray-600 mb-6">
              Enable or disable specific business modules for this tenant. Core modules (Projects, Tasks) cannot be disabled.
            </p>
            
            {modulesLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {modules.map((module) => (
                  <div
                    key={module.id}
                    className={`border rounded-lg p-4 transition-all ${
                      module.is_enabled_for_tenant 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">{module.name}</h4>
                        <p className="text-sm text-gray-600 mb-2">{module.description}</p>
                        
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            module.category === 'Core' 
                              ? 'bg-blue-100 text-blue-800'
                              : module.category === 'Business'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {module.category}
                          </span>
                          {module.is_core && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                              Required
                            </span>
                          )}
                        </div>
                        
                        <div className="text-sm text-gray-500">
                          {module.price_per_month === 0 ? 'Free' : `$${module.price_per_month}/month`}
                        </div>
                      </div>
                      
                      <div className="ml-4 flex flex-col items-end space-y-2">
                        <div className={`w-3 h-3 rounded-full ${
                          module.is_enabled_for_tenant ? 'bg-green-400' : 'bg-gray-300'
                        }`}></div>
                        
                        {module.is_core ? (
                          <span className="px-3 py-1 text-xs text-gray-500 bg-gray-100 rounded-md">
                            Required
                          </span>
                        ) : (
                          <button
                            onClick={() => toggleModule(module.id)}
                            disabled={moduleActionLoading === module.id || !module.is_available}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
                              module.is_enabled_for_tenant
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {moduleActionLoading === module.id 
                              ? 'Loading...' 
                              : module.is_enabled_for_tenant ? 'Disable' : 'Enable'
                            }
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {module.is_enabled_for_tenant && (
                      <div className="border-t pt-2 mt-2">
                        <div className="text-xs text-green-600 font-medium">
                          ✓ Active for this tenant
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantDetailPage;
