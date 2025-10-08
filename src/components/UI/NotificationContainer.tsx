import React, { useEffect, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { removeNotification } from '../../store/slices/notificationSlice';
import { CheckCircleIcon, ExclamationCircleIcon, XCircleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

const NotificationContainer: React.FC = () => {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector((state) => state.notifications.notifications);
  const timersRef = useRef<Record<string, number>>({});

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="w-6 h-6 text-green-600" />;
      case 'error':
        return <XCircleIcon className="w-6 h-6 text-red-600" />;
      case 'warning':
        return <ExclamationCircleIcon className="w-6 h-6 text-yellow-600" />;
      case 'info':
      default:
        return <InformationCircleIcon className="w-6 h-6 text-blue-600" />;
    }
  };

  // Card styling with colored left border for visual distinction
  const getCardClasses = (type: string) => {
    const baseClasses = 'bg-white border-l-4';
    switch (type) {
      case 'success':
        return `${baseClasses} border-l-green-500 border-t border-r border-b border-gray-200`;
      case 'error':
        return `${baseClasses} border-l-red-500 border-t border-r border-b border-gray-200`;
      case 'warning':
        return `${baseClasses} border-l-yellow-500 border-t border-r border-b border-gray-200`;
      case 'info':
      default:
        return `${baseClasses} border-l-blue-500 border-t border-r border-b border-gray-200`;
    }
  };

  const handleRemove = (id: string) => {
    // Clear any pending timer for this id
    const t = timersRef.current[id];
    if (t) {
      window.clearTimeout(t);
      delete timersRef.current[id];
    }
    dispatch(removeNotification(id));
  };

  useEffect(() => {
    // Schedule timers for any notifications that have duration but no timer yet
    notifications.forEach((n) => {
      if (n.duration && !timersRef.current[n.id]) {
        const t = window.setTimeout(() => {
          handleRemove(n.id);
        }, n.duration);
        timersRef.current[n.id] = t;
      }
    });

    // Cleanup timers for notifications that were removed
    const activeIds = new Set(notifications.map((n) => n.id));
    Object.keys(timersRef.current).forEach((id) => {
      if (!activeIds.has(id)) {
        window.clearTimeout(timersRef.current[id]);
        delete timersRef.current[id];
      }
    });

    return () => {
      // On unmount, clear all timers
      Object.values(timersRef.current).forEach((t) => window.clearTimeout(t));
      timersRef.current = {};
    };
  }, [notifications]);

  if (notifications.length === 0) return null;

  return (
    <div className="toast-container" role="region" aria-live="polite" aria-relevant="additions removals">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`toast animate-slide-down ${getCardClasses(notification.type)} overflow-hidden`}
          role="alert"
          aria-label={notification.title}
        >
          <div className="toast__icon">
            {getIcon(notification.type)}
          </div>
          <div className="toast__body min-w-0">
            <p className="toast__title text-sm font-medium text-secondary-900">
              {notification.title}
            </p>
            {notification.message && (
              <p className="toast__message mt-0.5 text-sm text-secondary-600 break-words">
                {notification.message}
              </p>
            )}
          </div>
          <div className="toast__close">
            <button
              onClick={() => handleRemove(notification.id)}
              className="inline-flex text-secondary-400 hover:text-secondary-600 focus:outline-none focus:text-secondary-600 transition ease-in-out duration-150"
              aria-label="Dismiss notification"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationContainer;
