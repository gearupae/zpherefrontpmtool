import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { toggleSidebar } from '../../store/slices/uiSlice';
import { UserRole } from '../../types';
import { getTenantRoute } from '../../utils/tenantUtils';
import {
  HomeIcon,
  FolderIcon,
  RectangleStackIcon,
  UsersIcon,
  ChartBarIcon,
  CogIcon,
  Bars3Icon,
  XMarkIcon,
  UserGroupIcon,
  DocumentTextIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  FlagIcon,
  CalendarIcon,
  CheckCircleIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Projects', href: '/projects', icon: FolderIcon },
  { name: 'Tasks', href: '/tasks', icon: RectangleStackIcon },
  { name: 'Goals', href: '/goals', icon: FlagIcon },
  { name: 'Team', href: '/teams', icon: UsersIcon },
  { name: 'Customers', href: '/customers', icon: UserGroupIcon },
  { name: 'Proposals', href: '/proposals', icon: DocumentTextIcon },
  { name: 'Invoices', href: '/invoices', icon: BanknotesIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  // Views
  { name: 'Calendar', href: '/calendar', icon: CalendarIcon },
  { name: 'To‑Do', href: '/todo', icon: CheckCircleIcon },
  { name: 'Settings', href: '/settings', icon: CogIcon },
];

const adminNavigation = [
  { name: 'Admin Dashboard', href: '/admin', icon: ShieldCheckIcon },
  { name: 'Manage Tenants', href: '/admin/tenants', icon: BuildingOfficeIcon },
  { name: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCardIcon },
  { name: 'Admin Analytics', href: '/admin/analytics', icon: ChartBarIcon },
  { name: 'Billing Management', href: '/admin/billing', icon: CurrencyDollarIcon },
];

const Sidebar: React.FC = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);
  const user = useAppSelector((state) => state.auth.user);

  const handleToggle = () => {
    dispatch(toggleSidebar());
  };

  return (
    <div className={`fixed inset-y-0 left-0 z-50 bg-white shadow-lg transition-all duration-300 ${
      sidebarOpen ? 'w-64' : 'w-16'
    }`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className={`flex items-center ${sidebarOpen ? '' : 'justify-center'}`}>
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-piano rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">Z</span>
              </div>
            </div>
            {sidebarOpen && (
              <div className="ml-3">
                <h1 className="text-xl font-bold text-piano">Zphere</h1>
              </div>
            )}
          </div>
          <button
            onClick={handleToggle}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            {sidebarOpen ? (
              <XMarkIcon className="w-5 h-5" />
            ) : (
              <Bars3Icon className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {/* Tenant Navigation - Show for users with an organization (includes org-admins) */}
          {Boolean(user?.organization || user?.organization_id) && navigation.map((item) => {
            const targetHref = getTenantRoute(item.href, user?.role, user?.organization);
            const isActive = location.pathname === targetHref || 
              (targetHref !== '/dashboard' && location.pathname.startsWith(targetHref));
            
            return (
              <NavLink
                key={item.name}
                to={targetHref}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                  isActive
                    ? 'text-piano'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                } ${sidebarOpen ? '' : 'justify-center'}`}
                title={!sidebarOpen ? item.name : undefined}
              >
                <item.icon
                  className={`flex-shrink-0 w-5 h-5 ${
                    isActive ? 'text-piano' : 'text-gray-400 group-hover:text-gray-500'
                  } ${sidebarOpen ? 'mr-3' : ''}`}
                />
                {sidebarOpen && item.name}
              </NavLink>
            );
          })}

        {/* Platform Admin Section - Only for platform administrators (ADMIN with no organization) */}
        {(user?.role === UserRole.ADMIN && !(user?.organization || user?.organization_id)) && (
          <>
            <div className="pt-4">
              {sidebarOpen && (
                <div className="px-2 pb-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Platform Administration
                  </h3>
                </div>
              )}
              {!sidebarOpen && (
                <div className="border-t border-gray-200 mx-2"></div>
              )}
            </div>
              
              {adminNavigation.map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href !== '/admin' && location.pathname.startsWith(item.href));
                
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                      isActive
                        ? 'text-piano'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } ${sidebarOpen ? '' : 'justify-center'}`}
                    title={!sidebarOpen ? item.name : undefined}
                  >
                    <item.icon
                      className={`flex-shrink-0 w-5 h-5 ${
                        isActive ? 'text-piano' : 'text-gray-400 group-hover:text-gray-500'
                      } ${sidebarOpen ? 'mr-3' : ''}`}
                    />
                    {sidebarOpen && item.name}
                  </NavLink>
                );
              })}
            </>
          )}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-200 p-4">
          <div className={`flex items-center ${sidebarOpen ? '' : 'justify-center'}`}>
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-gray-700 font-medium text-sm">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </span>
              </div>
            </div>
            {sidebarOpen && (
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.full_name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
