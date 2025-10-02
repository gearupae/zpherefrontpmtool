import React from 'react';
import apiClient from '../../api/client';
import { useNavigate } from 'react-router-dom';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'Free',
    description: 'Essential project management for small teams',
    features: ['Up to 3 users', 'Up to 5 projects', 'Basic analytics'],
    cta: 'Start for Free',
    tier: 'free' as const,
    color: 'from-gray-500 to-gray-700'
  },
  {
    id: 'pro_core',
    name: 'Pro',
    price: '$29 / mo',
    description: 'Full PM features without AI modules',
    features: ['Up to 15 users', 'Up to 25 projects', 'Integrations', 'Advanced analytics'],
    cta: 'Subscribe',
    tier: 'pro_core' as const,
    color: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'pro_ai',
    name: 'Pro + AI',
    price: '$59 / mo',
    description: 'All modules including AI assistants and automation',
    features: ['Everything in Pro', 'AI Assistant and automation', 'Priority support'],
    cta: 'Subscribe',
    tier: 'pro_ai' as const,
    color: 'from-purple-500 to-fuchsia-600'
  }
];

const PricingPage: React.FC = () => {
  const navigate = useNavigate();

  const activateFree = async () => {
    const resp = await apiClient.post('/billing/activate-free');
    if (resp.status >= 200 && resp.status < 300) {
      navigate('/dashboard');
    }
  };

  const subscribe = async (tier: 'pro_core' | 'pro_ai') => {
    const resp = await apiClient.post('/billing/checkout-session', { tier });
    const url = resp.data?.url;
    if (url) window.location.href = url;
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Choose your plan</h1>
        <p className="text-gray-600 mt-2">Scale from free to AI-powered productivity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white rounded-lg shadow border p-6 flex flex-col">
            <div className={`h-2 rounded-full bg-gradient-to-r ${plan.color} mb-4`} />
            <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
            <p className="text-2xl font-bold mt-1">{plan.price}</p>
            <p className="text-gray-600 mt-2 flex-1">{plan.description}</p>
            <ul className="mt-4 space-y-1 text-sm text-gray-700">
              {plan.features.map(f => (
                <li key={f} className="flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2"></span>
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              {plan.tier === 'free' ? (
                <button onClick={activateFree} className="w-full btn-page-action btn-styled">{plan.cta}</button>
              ) : (
                <button onClick={() => subscribe(plan.tier)} className="w-full btn-page-action btn-styled">{plan.cta}</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PricingPage;
