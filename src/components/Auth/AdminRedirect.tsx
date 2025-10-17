import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import { UserRole } from '../../types';

const AdminRedirect: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);

  const hasOrg = Boolean(user?.organization || user?.organization_id);
  const isPlatformAdmin = user?.role === UserRole.ADMIN && !hasOrg;

  console.log('[AdminRedirect] 🏠 ROOT INDEX REDIRECT:', {
    role: user?.role,
    hasOrg,
    orgSlug: user?.organization?.slug,
    isPlatformAdmin,
    timestamp: new Date().toISOString()
  });

  // Platform admin (no organization) -> admin dashboard
  if (isPlatformAdmin) {
    console.log('[AdminRedirect] → /admin');
    return <Navigate to="/admin" replace />;
  }

  // Tenant users (including organization admins) -> tenant projects by default if no deep link
  if (hasOrg && user?.organization?.slug) {
    console.log(`[AdminRedirect] → /${user.organization.slug}/dashboard`);
    return <Navigate to={`/${user.organization.slug}/dashboard`} replace />;
  }

  // Fallback
  console.log('[AdminRedirect] → /dashboard (fallback)');
  return <Navigate to="/dashboard" replace />;
};

export default AdminRedirect;
