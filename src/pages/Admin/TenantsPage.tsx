import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import CreateTenantForm from '../../components/Admin/CreateTenantForm';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  subscription_status: string;
  payment_status: string;
  created_at: string;
  users_count: number;
  projects_count: number;
}

const TenantsPage: React.FC = () => {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const response = await apiClient.get('/admin/tenants/');
      setTenants(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      // Fallback to mock data if API fails
      setTenants([
        {
          id: '1',
          name: 'Acme Corporation',
          slug: 'acme-corp',
          subscription_status: 'active',
          payment_status: 'paid',
          created_at: '2024-01-15',
          users_count: 25,
          projects_count: 12,
        },
        {
          id: '2',
          name: 'TechStart Inc',
          slug: 'techstart',
          subscription_status: 'active',
          payment_status: 'overdue',
          created_at: '2024-02-20',
          users_count: 8,
          projects_count: 5,
        },
        {
          id: '3',
          name: 'Design Studio',
          slug: 'design-studio',
          subscription_status: 'trial',
          payment_status: 'pending',
          created_at: '2024-03-10',
          users_count: 3,
          projects_count: 2,
        },
      ]);
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full';
    switch (status) {
      case 'active':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'trial':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'overdue':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'paid':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    fetchTenants(); // Refresh the tenant list
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
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tenant Organizations</h1>
            <p className="mt-2 text-gray-600">Manage your platform's tenant organizations and their subscriptions</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
className="btn-page-action"
          >
            Create New Tenant
          </button>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subscription
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Users
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Projects
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                          <div className="text-sm text-gray-500">{tenant.slug}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getStatusBadge(tenant.subscription_status)}>
                          {tenant.subscription_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getStatusBadge(tenant.payment_status)}>
                          {tenant.payment_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tenant.users_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tenant.projects_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(tenant.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => navigate(`/admin/tenants/${tenant.id}`)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          View Details
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          Suspend
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Create Tenant Form Modal */}
        {showCreateForm && (
          <CreateTenantForm
            onSuccess={handleCreateSuccess}
            onCancel={() => setShowCreateForm(false)}
          />
        )}
      </div>
    </div>
  );
};

export default TenantsPage;