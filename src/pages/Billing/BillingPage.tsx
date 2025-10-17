import React from 'react';
import apiClient from '../../api/client';

const BillingPage: React.FC = () => {
 const [loading, setLoading] = React.useState(false);
 const [error, setError] = React.useState<string | null>(null);
 const [sub, setSub] = React.useState<any>(null);

 React.useEffect(() => {
 (async () => {
 try {
 const resp = await apiClient.get('/subscriptions');
 setSub(resp.data);
 } catch (e) {
 // ignore
 }
 })();
 }, []);

 const openPortal = async () => {
 try {
 setLoading(true);
 setError(null);
 const resp = await apiClient.post('/billing/portal-session', {});
 const url = resp.data?.url;
 if (url) window.location.href = url;
 } catch (e: any) {
 setError(e?.response?.data?.detail || 'Failed to open billing portal');
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
 <p className="text-gray-600">Manage your subscription and payment methods</p>
 </div>
 <button onClick={openPortal} disabled={loading} className="btn-page-action btn-styled">
 {loading ? 'Opening…' : 'Manage in Stripe'}
 </button>
 </div>
 {error && (
 <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded">{error}</div>
 )}
 <div className="bg-white rounded-lg shadow border p-4 space-y-2">
 {sub && (
 <div className="flex items-center gap-3">
 <span className="text-sm text-gray-600">Current plan:</span>
 <span className="px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700 border border-blue-200">{String(sub.tier || sub.tier?.value || '').toUpperCase()}</span>
 <span className="px-2 py-0.5 text-xs rounded bg-gray-50 text-gray-700 border border-gray-200">{String(sub.status || sub.status?.value || '').toUpperCase()}</span>
 </div>
 )}
 <div className="text-sm text-gray-600">
 Use the button above to open the secure Stripe Customer Portal to update your plan, change cards, or cancel.
 </div>
 </div>
 </div>
 );
};

export default BillingPage;
