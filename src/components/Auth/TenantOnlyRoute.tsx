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
  const isPlatformAdmin = user?.role === UserRole.ADMIN && !hasOrg;

  // Platform admins should not access tenant routes
  if (isPlatformAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // Tenant users (including organization admins) can access tenant routes
  return <>{children}</>;
};

export default TenantOnlyRoute;
