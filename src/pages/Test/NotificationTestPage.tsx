import React from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { addNotification } from '../../store/slices/notificationSlice';

const NotificationTestPage: React.FC = () => {
  const dispatch = useAppDispatch();

  const testSuccess = () => {
    dispatch(addNotification({
      type: 'success',
      title: 'Success!',
      message: 'This is a success notification with a longer message to test wrapping.',
      duration: 5000
    }));
  };

  const testError = () => {
    dispatch(addNotification({
      type: 'error',
      title: 'Error!',
      message: 'This is an error notification. It should be visible for longer.',
      duration: 7000
    }));
  };

  const testWarning = () => {
    dispatch(addNotification({
      type: 'warning',
      title: 'Warning!',
      message: 'This is a warning notification.',
      duration: 5000
    }));
  };

  const testInfo = () => {
    dispatch(addNotification({
      type: 'info',
      title: 'Information',
      message: 'This is an info notification.',
      duration: 3000
    }));
  };

  const testMultiple = () => {
    dispatch(addNotification({
      type: 'success',
      title: 'First notification',
      message: 'This should appear at the top',
      duration: 10000
    }));

    setTimeout(() => {
      dispatch(addNotification({
        type: 'warning',
        title: 'Second notification',
        message: 'This should appear below the first one',
        duration: 10000
      }));
    }, 500);

    setTimeout(() => {
      dispatch(addNotification({
        type: 'error',
        title: 'Third notification',
        message: 'This should appear below the second one',
        duration: 10000
      }));
    }, 1000);
  };

  const testNoMessage = () => {
    dispatch(addNotification({
      type: 'success',
      title: 'Title Only',
      message: '',
    }));
  };

  return (
    <div className="p-8 space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Notification Test Page</h1>
        <p className="text-gray-600 mb-6">
          Click the buttons below to test different notification types. 
          Notifications should appear in the top-right corner of the screen.
        </p>

        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-3">Single Notifications</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={testSuccess}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Test Success
              </button>
              <button
                onClick={testError}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Test Error
              </button>
              <button
                onClick={testWarning}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
              >
                Test Warning
              </button>
              <button
                onClick={testInfo}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Test Info
              </button>
            </div>
          </div>

          <div className="border-t pt-4">
            <h2 className="text-lg font-semibold mb-3">Special Cases</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={testMultiple}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                Test Multiple (Stacked)
              </button>
              <button
                onClick={testNoMessage}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Test No Message
              </button>
            </div>
          </div>

          <div className="border-t pt-4 bg-yellow-50 p-4 rounded">
            <h3 className="font-semibold text-yellow-800 mb-2">Expected Behavior:</h3>
            <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
              <li>Notifications appear in the <strong>top-right corner</strong></li>
              <li>Success/info disappear after 3 seconds (default)</li>
              <li>Error/warning disappear after 5 seconds (default)</li>
              <li>Multiple notifications stack vertically</li>
              <li>You can close notifications by clicking the X button</li>
              <li>Notifications have appropriate icons (check, X, exclamation, info)</li>
              <li>Notifications have white background with subtle shadows</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-3">Troubleshooting</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <p><strong>If notifications don't appear:</strong></p>
          <ol className="list-decimal list-inside ml-4 space-y-1">
            <li>Open browser console (F12) and check for errors</li>
            <li>Verify NotificationContainer is rendered in App.tsx</li>
            <li>Check that Redux store is properly configured</li>
            <li>Look for CSS z-index conflicts</li>
            <li>Ensure index.css and tw.css are imported</li>
          </ol>

          <p className="mt-4"><strong>If notifications appear but look wrong:</strong></p>
          <ol className="list-decimal list-inside ml-4 space-y-1">
            <li>Check browser console for CSS errors</li>
            <li>Verify .toast-container and .toast classes are defined</li>
            <li>Ensure @keyframes slideDown is loaded</li>
            <li>Check for conflicting global styles overriding toast styles</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default NotificationTestPage;
