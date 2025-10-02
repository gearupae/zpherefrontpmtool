import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import { UserRole } from '../../types';

const DefaultRedirect: React.FC = () => {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  // If not logged in, go to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const hasOrg = Boolean(user?.organization || user?.organization_id);
  const slug = user?.organization?.slug;
  const isPlatformAdmin = user.role === UserRole.ADMIN && (!hasOrg || slug === 'zphere-admin');

  if (isPlatformAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (slug) {
    return <Navigate to={`/${slug}/dashboard`} replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

export default DefaultRedirect;
