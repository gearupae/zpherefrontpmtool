import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import { UserRole } from '../../types';

const DefaultRedirect: React.FC = () => {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  console.log('[DefaultRedirect] ⚠️ CATCH-ALL FIRED from:', window.location.pathname, {
    isAuthenticated,
    user: user?.email,
    role: user?.role,
    orgSlug: user?.organization?.slug,
    timestamp: new Date().toISOString()
  });

  // If not logged in, go to login
  if (!isAuthenticated || !user) {
    console.log('[DefaultRedirect] → /login (not authenticated)');
    return <Navigate to="/login" replace />;
  }

  const hasOrg = Boolean(user?.organization || user?.organization_id);
  const slug = user?.organization?.slug;
  const isPlatformAdmin = user.role === UserRole.ADMIN && !hasOrg;

  if (isPlatformAdmin) {
    console.log('[DefaultRedirect] → /admin (platform admin)');
    return <Navigate to="/admin" replace />;
  }

  if (slug) {
    console.log('[DefaultRedirect] → /' + slug + '/dashboard (tenant with slug)');
    return <Navigate to={`/${slug}/dashboard`} replace />;
  }

  console.log('[DefaultRedirect] → /dashboard (fallback)');
  return <Navigate to="/dashboard" replace />;
};

export default DefaultRedirect;
