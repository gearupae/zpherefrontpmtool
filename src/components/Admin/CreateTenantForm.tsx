import React, { useState } from 'react';
import { apiClient } from '../../api/client';

interface CreateTenantFormProps {
 onSuccess: () => void;
 onCancel: () => void;
}

interface TenantFormData {
 name: string;
 slug: string;
 description: string;
 domain: string;
 admin_email: string;
 admin_password: string;
 admin_first_name: string;
 admin_last_name: string;
 subscription_tier: string;
 max_users: number;
 max_projects: number;
}

const CreateTenantForm: React.FC<CreateTenantFormProps> = ({ onSuccess, onCancel }) => {
 const [formData, setFormData] = useState<TenantFormData>({
 name: '',
 slug: '',
 description: '',
 domain: '',
 admin_email: '',
 admin_password: 'defaultpassword123',
 admin_first_name: '',
 admin_last_name: '',
 subscription_tier: 'basic',
 max_users: 50,
 max_projects: 100,
 });

 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
 const { name, value, type } = e.target;
 setFormData(prev => ({
 ...prev,
 [name]: type === 'number' ? parseInt(value) || 0 : value
 }));
 };

 // Auto-generate slug from name
 const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const name = e.target.value;
 const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
 setFormData(prev => ({
 ...prev,
 name,
 slug
 }));
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);
 setError(null);

 try {
 const response = await apiClient.post('/admin/tenants/', formData);
 console.log('Tenant created successfully:', response.data);
 onSuccess();
 } catch (err: any) {
 console.error('Error creating tenant:', err);
 setError(err.response?.data?.detail || 'Failed to create tenant organization');
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
 <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
 <div className="mt-3">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Tenant Organization</h3>
 
 {error && (
 <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
 {error}
 </div>
 )}

 <form onSubmit={handleSubmit} className="space-y-4">
 {/* Organization Details */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Organization Name *
 </label>
 <input
 type="text"
 name="name"
 value={formData.name}
 onChange={handleNameChange}
 required
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
 placeholder="e.g., Acme Corporation"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Slug/Subdomain *
 </label>
 <input
 type="text"
 name="slug"
 value={formData.slug}
 onChange={handleInputChange}
 required
 pattern="^[a-z0-9-]+$"
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
 placeholder="e.g., acme-corp"
 />
 <p className="text-xs text-gray-500 mt-1">Will be used as subdomain: {formData.slug}.yourdomain.com</p>
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Description
 </label>
 <textarea
 name="description"
 value={formData.description}
 onChange={handleInputChange}
 rows={3}
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
 placeholder="Brief description of the organization"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Custom Domain (Optional)
 </label>
 <input
 type="text"
 name="domain"
 value={formData.domain}
 onChange={handleInputChange}
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
 placeholder="e.g., projects.acmecorp.com"
 />
 </div>

 {/* Admin User Details */}
 <div className="border-t pt-4">
 <h4 className="text-md font-medium text-gray-900 mb-3">Organization Admin User</h4>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 First Name *
 </label>
 <input
 type="text"
 name="admin_first_name"
 value={formData.admin_first_name}
 onChange={handleInputChange}
 required
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
 placeholder="John"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Last Name *
 </label>
 <input
 type="text"
 name="admin_last_name"
 value={formData.admin_last_name}
 onChange={handleInputChange}
 required
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
 placeholder="Doe"
 />
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Admin Email *
 </label>
 <input
 type="email"
 name="admin_email"
 value={formData.admin_email}
 onChange={handleInputChange}
 required
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
 placeholder="admin@acmecorp.com"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Admin Password
 </label>
 <input
 type="password"
 name="admin_password"
 value={formData.admin_password}
 onChange={handleInputChange}
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
 placeholder="Password for admin user"
 />
 <p className="text-xs text-gray-500 mt-1">Default: defaultpassword123</p>
 </div>
 </div>

 {/* Subscription Details */}
 <div className="border-t pt-4">
 <h4 className="text-md font-medium text-gray-900 mb-3">Subscription & Limits</h4>
 
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Subscription Tier
 </label>
 <select
 name="subscription_tier"
 value={formData.subscription_tier}
 onChange={handleInputChange}
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
 >
 <option value="basic">Basic</option>
 <option value="professional">Professional</option>
 <option value="enterprise">Enterprise</option>
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Max Users
 </label>
 <input
 type="number"
 name="max_users"
 value={formData.max_users}
 onChange={handleInputChange}
 min="1"
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Max Projects
 </label>
 <input
 type="number"
 name="max_projects"
 value={formData.max_projects}
 onChange={handleInputChange}
 min="1"
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 </div>
 </div>
 </div>

 {/* Action Buttons */}
 <div className="flex justify-end space-x-3 pt-4 border-t">
 <button
 type="button"
 onClick={onCancel}
 className="btn-cancel text-sm font-medium rounded-md"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={loading}
 className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
 >
 {loading ? 'Creating...' : 'Create Tenant'}
 </button>
 </div>
 </form>
 </div>
 </div>
 </div>
 );
};

export default CreateTenantForm;

