import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import { UserRole } from '../../types';

interface AdminOnlyRouteProps {
  children: React.ReactNode;
}

const AdminOnlyRoute: React.FC<AdminOnlyRouteProps> = ({ children }) => {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  // If not authenticated, redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const hasOrg = Boolean(user?.organization || user?.organization_id);
  const isPlatformAdmin = user.role === UserRole.ADMIN && !hasOrg;

  console.log('[AdminOnlyRoute] Check:', {
    role: user.role,
    hasOrg,
    orgSlug: user?.organization?.slug,
    isPlatformAdmin,
    willRedirect: !isPlatformAdmin
  });

  // Only platform admins (no organization) can access admin routes
  if (isPlatformAdmin) {
    console.log('[AdminOnlyRoute] Allowing access to admin route');
    return <>{children}</>;
  }

  // Otherwise, redirect to tenant dashboard (prefer slug path if available)
  const slug = user.organization?.slug;
  console.log(`[AdminOnlyRoute] Redirecting tenant user to ${slug ? `/${slug}/dashboard` : '/dashboard'}`);
  return <Navigate to={slug ? `/${slug}/dashboard` : '/dashboard'} replace />;
};

export default AdminOnlyRoute;
