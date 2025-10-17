import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { logout } from '../../store/slices/authSlice';
import { 
  BellIcon, 
  MagnifyingGlassIcon,
  HomeIcon,
  FolderIcon,
  RectangleStackIcon,
  UsersIcon,
  ChartBarIcon,
  CogIcon,
  UserGroupIcon,
  DocumentTextIcon,
  BanknotesIcon,
  AcademicCapIcon,
  Bars3Icon,
  XMarkIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  FlagIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import SmartNotificationCenter from '../SmartNotifications/SmartNotificationCenter';
import { UserRole } from '../../types';
import { getTenantRoute } from '../../utils/tenantUtils';
import { addNotification } from '../../store/slices/notificationSlice';
// consolidated into React import
import { apiClient } from '../../api/client';

const tenantNavigation = [
  // Dashboard removed from menu per request; logo links to dashboard
  { name: 'PAI', href: '/ai', icon: SparklesIcon },
  { name: 'Projects', href: '/projects', icon: FolderIcon },
  { name: 'Tasks', href: '/tasks', icon: RectangleStackIcon },
  { name: 'Goals', href: '/goals', icon: FlagIcon },
  { name: 'Team', href: '/teams', icon: UsersIcon },
  { name: 'Customers', href: '/customers', icon: UserGroupIcon },
  { name: 'Purchase', href: '/purchase', icon: ShoppingCartIcon },
  { name: 'Proposals', href: '/proposals', icon: DocumentTextIcon },
  { name: 'Invoices', href: '/invoices', icon: BanknotesIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'Knowledge', href: '/knowledge', icon: AcademicCapIcon },
  { name: 'Settings', href: '/settings', icon: CogIcon },
];

const adminNavigation = [
  { name: 'Admin Dashboard', href: '/admin', icon: ShieldCheckIcon },
  { name: 'Manage Tenants', href: '/admin/tenants', icon: BuildingOfficeIcon },
  { name: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCardIcon },
  { name: 'Admin Analytics', href: '/admin/analytics', icon: ChartBarIcon },
  { name: 'Billing Management', href: '/admin/billing', icon: CurrencyDollarIcon },
];

const Header: React.FC = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const user = useAppSelector((state) => state.auth.user);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null as any);
  const reconnectAttemptsRef = useRef(0);

// Determine platform admin vs tenant context
  const hasOrg = Boolean(user?.organization || user?.organization_id);
  const isPlatformAdmin = user?.role === UserRole.ADMIN && !hasOrg;
  const navigation = isPlatformAdmin ? adminNavigation : tenantNavigation;

  const handleLogout = () => {
    dispatch(logout());
  };

  useEffect(() => {
    let cancelled = false;

    const connect = () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const wsUrl = `ws://localhost:8000/api/v1/ws/notifications?token=${token}`;
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('✅ WebSocket connected to notifications');
          reconnectAttemptsRef.current = 0;
          // Optionally send a ping to keep alive
          try { ws.send(JSON.stringify({ type: 'ping' })); } catch {}
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('🔔 WebSocket message received:', data);
            if (data.type === 'notification' && data.notification) {
              const n = data.notification;
              console.log('📬 Processing notification:', n);
              // Heuristic: classify toast type based on title to avoid confusing "updated" notices showing as errors
              const titleLc = String(n.title || '').toLowerCase();
              let toastType: 'success' | 'info' | 'warning' | 'error' = 'info';
              if (
                titleLc.startsWith('task updated') ||
                titleLc.startsWith('task created') ||
                titleLc.startsWith('project updated') ||
                titleLc.startsWith('project created') ||
                titleLc.startsWith('comment added') ||
                titleLc.startsWith('subtask created')
              ) {
                toastType = 'success';
              } else if (titleLc.includes('deleted') || titleLc.includes('removed')) {
                toastType = 'warning';
              }
              // Show a lightweight toast for visibility
              dispatch(addNotification({
                type: toastType,
                title: n.title || 'Notification',
                message: n.message || '',
                duration: 4000,
              }));
              // Increment unread badge optimistically
              setUnreadCount((c) => c + 1);
              console.log('🔢 Badge count incremented');
              // Broadcast to SmartNotificationCenter so the panel updates immediately
              try {
                const normalized = {
                  id: n.id,
                  title: n.title || 'Notification',
                  message: n.message || '',
                  short_description: n.short_description || '',
                  notification_type: n.notification_type || n.type || 'system_alert',
                  priority: n.priority || 'normal',
                  category: n.category || undefined,
                  project_id: n.project_id,
                  task_id: n.task_id,
                  context_card_id: n.context_card_id,
                  decision_log_id: n.decision_log_id,
                  handoff_summary_id: n.handoff_summary_id,
                  relevance_score: n.relevance_score ?? 0.5,
                  context_data: n.context_data || {},
                  action_required: n.action_required ?? false,
                  auto_generated: n.auto_generated ?? true,
                  is_read: n.is_read ?? false,
                  is_dismissed: n.is_dismissed ?? false,
                  action_taken: n.action_taken ?? false,
                  created_at: n.created_at || new Date().toISOString(),
                  tags: n.tags || [],
                };
                console.log('🚀 Broadcasting notification event:', normalized);
                window.dispatchEvent(new CustomEvent('smart-notification:new', { detail: normalized }));
              } catch (err) {
                console.error('Failed to broadcast notification event:', err);
              }
            } else {
              console.log('ℹ️ Non-notification message:', data.type);
            }
          } catch (e) {
            console.error('Error parsing WebSocket message:', e);
          }
        };

        const scheduleReconnect = () => {
          if (cancelled) return;
          reconnectAttemptsRef.current += 1;
          const attempt = reconnectAttemptsRef.current;
          const delay = Math.min(30000, Math.pow(2, attempt) * 1000);
          if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = window.setTimeout(() => {
            connect();
          }, delay) as any;
        };

        ws.onclose = () => {
          wsRef.current = null;
          scheduleReconnect();
        };

        ws.onerror = () => {
          wsRef.current = null;
          scheduleReconnect();
        };
      } catch (e) {
        // schedule reconnect on construction failure
        reconnectAttemptsRef.current += 1;
        const delay = Math.min(30000, Math.pow(2, reconnectAttemptsRef.current) * 1000);
        if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = window.setTimeout(() => connect(), delay) as any;
      }
    };

    // Fetch initial unread count on mount
    const fetchUnread = async () => {
      try {
        const resp = await apiClient.get('/smart-notifications/?page=1&size=1&grouped=false');
        setUnreadCount(resp.data?.unread_count || 0);
      } catch (err) {
        console.warn('Smart unread fetch failed, falling back to basic notifications', err);
        try {
          const basic = await apiClient.get('/notifications/?page=1&size=1&unread_only=true');
          const unread = basic.data?.unread_count ?? (Array.isArray(basic.data?.notifications) ? basic.data.notifications.filter((n: any)=>!n.is_read).length : 0);
          setUnreadCount(unread || 0);
        } catch (e) {
          console.error('Fallback unread fetch failed:', e);
          setUnreadCount(0);
        }
      }
    };

    fetchUnread();
    connect();

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      try { wsRef.current?.close(); } catch {}
      wsRef.current = null;
    };
  }, []);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-black shadow-sm border-b border-gray-800">
      {/* Optimized navigation bar with better spacing and responsiveness */}
      <div className="sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo -> link to dashboard per request, label as zphere.io */}
          <NavLink
            to={isPlatformAdmin ? '/admin' : getTenantRoute('/dashboard', user?.role, user?.organization)}
            className="flex items-center flex-shrink-0 group"
            title="Go to Dashboard"
          >
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
              <span className="text-black font-bold text-sm">Z</span>
            </div>
            <div className="ml-2 hidden sm:block">
              <h1 className="text-base font-bold" style={{color: '#ced4da'}}>zphere.io</h1>
            </div>
          </NavLink>

          {/* Navigation Menu - Desktop - wrap to avoid scroll */}
          <nav className="hidden lg:flex flex-1 items-center justify-center max-w-none mx-2">
            <div className="flex items-center flex-wrap gap-x-1 gap-y-1">
{navigation.map((item) => {
                const targetHref = isPlatformAdmin ? item.href : (item.href === '/settings' ? '/settings' : getTenantRoute(item.href, user?.role, user?.organization));
                const isActive = location.pathname === targetHref || 
                  (targetHref !== '/dashboard' && location.pathname.startsWith(targetHref));
                
                return (
                  <NavLink
                    key={item.name}
                    to={targetHref}
                    title={item.name}
                    className={`flex items-center px-1 py-0.5 text-sm font-medium rounded-md transition-colors duration-200 whitespace-nowrap ${
                      isActive
                        ? 'bg-gray-800'
                        : 'hover:bg-gray-800'
                    }`}
                    style={{color: isActive ? '#ffffff' : '#ced4da'}}
                  >
                    <item.icon
                      className="flex-shrink-0 w-5 h-5"
                      style={{color: isActive ? '#ffffff' : '#ced4da'}}
                    />
                    {item.name !== 'Knowledge' && item.name !== 'Settings' && (
                      <span className="hidden xl:inline-block ml-1">{item.name}</span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </nav>

          {/* Right section - More compact */}
          <div className="flex items-center space-x-1">
            {/* Search icon -> expands inline on click */}
            <div className="relative flex items-center">
              <button
                onClick={() => setSearchOpen((s) => !s)}
                className={`p-1.5 rounded-md transition-colors ${searchOpen ? 'bg-gray-800' : 'hover:bg-gray-800'}`}
                style={{color: '#ced4da'}}
                aria-label="Toggle search"
                title="Search"
              >
                <MagnifyingGlassIcon className="w-5 h-5" />
              </button>
              {searchOpen && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20">
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => setSearchOpen(false)}
                    className="w-56 py-2 text-sm border border-secondary-300 rounded-md bg-white shadow-sm placeholder-secondary-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Search..."
                    type="search"
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* Mobile/Tablet menu button for medium screens */}
            <button
              onClick={toggleMobileMenu}
              className="lg:hidden p-2 hover:bg-gray-800 rounded-md transition-colors"
              style={{color: '#ced4da'}}
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="w-5 h-5" />
              ) : (
                <Bars3Icon className="w-5 h-5" />
              )}
            </button>

            {/* Calendar */}
            <NavLink
              to={isPlatformAdmin ? '/calendar' : getTenantRoute('/calendar', user?.role, user?.organization)}
              className={({isActive}) => `relative p-1.5 ${isActive ? 'bg-gray-800' : ''} hover:bg-gray-800 rounded-md transition-colors duration-200`}
              style={{color: '#ced4da'}}
              aria-label="Open calendar"
              title="Calendar"
            >
              <CalendarDaysIcon className="w-5 h-5" />
            </NavLink>



            {/* To‑Do */}
            <NavLink
              to={isPlatformAdmin ? '/todo' : getTenantRoute('/todo', user?.role, user?.organization)}
              className={({isActive}) => `relative p-1.5 ${isActive ? 'bg-gray-800' : ''} hover:bg-gray-800 rounded-md transition-colors duration-200`}
              style={{color: '#ced4da'}}
              aria-label="Open to‑do"
              title="To‑Do"
            >
              <CheckCircleIcon className="w-5 h-5" />
            </NavLink>

            {/* Notifications */}
            <button 
              onClick={() => setShowNotifications(true)}
              className="relative p-1.5 hover:bg-gray-800 rounded-md transition-colors duration-200"
              style={{color: '#ced4da'}}
              aria-label="Open notifications"
              title={unreadCount > 0 ? `${unreadCount} unread` : 'Notifications'}
            >
              <BellIcon className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white bg-red-600 rounded-full min-w-[16px]">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-gray-600"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{backgroundColor: '#ced4da'}}>
                  <span className="text-black font-medium text-sm">
                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                  </span>
                </div>
                <div className="hidden xl:block text-left">
                  <p className="text-sm font-medium" style={{color: '#ced4da'}}>
                    {user?.full_name}
                  </p>
                  <p className="text-xs" style={{color: '#ced4da'}}>
                    {user?.role}
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Navigation Menu - Updated for better responsiveness */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed top-14 inset-x-0 z-40 bg-black border-t border-gray-800 shadow-lg max-h-[calc(100vh-56px)] overflow-y-auto">
          <div className="py-3 space-y-1">
            {/* Mobile Search removed; we use the top icon search toggler */}
            
            {/* Mobile Navigation Links - Organized in grid for better space usage */}
            <div className="grid grid-cols-2 gap-1">
{navigation.map((item) => {
                const targetHref = isPlatformAdmin ? item.href : (item.href === '/settings' ? '/settings' : getTenantRoute(item.href, user?.role, user?.organization));
                const isActive = location.pathname === targetHref || 
                  (targetHref !== '/dashboard' && location.pathname.startsWith(targetHref));
                
                return (
                  <NavLink
                    key={item.name}
                    to={targetHref}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                      isActive
                        ? 'bg-gray-800'
                        : 'hover:bg-gray-800'
                    }`}
                    style={{color: isActive ? '#ffffff' : '#ced4da'}}
                  >
                    <item.icon
                      className="flex-shrink-0 w-5 h-5 mr-1.5"
                      style={{color: isActive ? '#ffffff' : '#ced4da'}}
                    />
                    {item.name}
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      )}
    {/* Smart Notifications Panel */}
    <SmartNotificationCenter 
      isOpen={showNotifications} 
      onClose={async () => {
        setShowNotifications(false);
        // Refresh unread count after panel interaction
        try {
          const resp = await apiClient.get('/smart-notifications/?page=1&size=1&grouped=false');
          setUnreadCount(resp.data?.unread_count || 0);
        } catch {}
      }} 
    />
    </header>
  );
};

export default Header;
