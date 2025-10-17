import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import { UserRole } from '../../types';

interface TenantOnlyRouteProps {
  children: React.ReactNode;
}

const TenantOnlyRoute: React.FC<TenantOnlyRouteProps> = ({ children }) => {
  const { user } = useAppSelector((state) => state.auth);

  const hasOrg = Boolean(user?.organization || user?.organization_id);
  // Only users with ADMIN role AND no organization are platform admins
  // Users with ADMIN role AND an organization are organization admins (tenant users)
  const isPlatformAdmin = user?.role === UserRole.ADMIN && !hasOrg;

  console.log('[TenantOnlyRoute] Check at:', window.location.pathname, { 
    role: user?.role, 
    hasOrg, 
    orgSlug: user?.organization?.slug,
    isPlatformAdmin, 
    willRedirect: isPlatformAdmin,
    timestamp: new Date().toISOString()
  });

  // Platform admins should not access tenant routes
  if (isPlatformAdmin) {
    console.log('[TenantOnlyRoute] ❌ REDIRECTING platform admin to /admin from:', window.location.pathname);
    return <Navigate to="/admin" replace />;
  }

  // Tenant users (including organization admins) can access tenant routes
  console.log('[TenantOnlyRoute] ✅ ALLOWING access to tenant route:', window.location.pathname);
  return <>{children}</>;
};

export default TenantOnlyRoute;
