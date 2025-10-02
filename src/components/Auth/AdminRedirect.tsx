import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import { UserRole } from '../../types';

const AdminRedirect: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);

  const hasOrg = Boolean(user?.organization || user?.organization_id);
  const isPlatformAdmin = user?.role === UserRole.ADMIN && (!hasOrg || user?.organization?.slug === 'zphere-admin');

  // Platform admin (no organization) -> admin dashboard
  if (isPlatformAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // Tenant users (including organization admins) -> tenant dashboard if slug present
  if (hasOrg && user?.organization?.slug) {
    return <Navigate to={`/${user.organization.slug}/dashboard`} replace />;
  }

  // Fallback
  return <Navigate to="/dashboard" replace />;
};

export default AdminRedirect;
