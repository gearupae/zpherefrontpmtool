import React from 'react';
import { useAppSelector } from '../../hooks/redux';
import { notifyProjectCreated } from '../../utils/notificationHelper';

const NotificationDebugPage: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);

  const testNotification = async () => {
    console.log('🧪 Testing notification system...');
    console.log('📋 Current user:', user);
    
    if (!user?.id) {
      console.error('❌ No user logged in!');
      alert('You must be logged in to test notifications');
      return;
    }

    try {
      console.log('📤 Calling notifyProjectCreated...');
      await notifyProjectCreated('test-project-id-123', 'Test Project Name');
      console.log('✅ Notification creation requested');
      alert('Notification sent! Check console for details and watch the bell icon.');
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      alert('Error: ' + error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Notification System Debug Page
          </h1>

          <div className="space-y-6">
            {/* User Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-2">Current User Info</h2>
              <pre className="text-sm bg-white p-4 rounded border overflow-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>

            {/* Test Button */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-3">Test Notification Creation</h2>
              <p className="text-gray-700 mb-4">
                Click the button below to create a test project notification.
                Watch the browser console for debug logs.
              </p>
              <button
                onClick={testNotification}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                🧪 Create Test Notification
              </button>
            </div>

            {/* Instructions */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-2">What to Watch For:</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Open browser DevTools Console (F12)</li>
                <li>Click the "Create Test Notification" button</li>
                <li>Look for these console logs:
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li>👤 Current user ID: [your-user-id]</li>
                    <li>📢 Creating persistent notification: [payload]</li>
                    <li>✅ Notification created successfully: [response]</li>
                    <li>🔔 WebSocket message received: [data]</li>
                    <li>📬 Processing notification: [notification]</li>
                    <li>🔢 Badge count incremented</li>
                    <li>🚀 Broadcasting notification event: [normalized]</li>
                    <li>📥 SmartNotificationCenter: Received notification event</li>
                    <li>📋 Adding notification to list</li>
                  </ul>
                </li>
                <li>Check the bell icon in the header - the badge count should increase</li>
                <li>Click the bell to open the notification panel - you should see the notification</li>
              </ol>
            </div>

            {/* WebSocket Info */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-2">WebSocket Status</h2>
              <p className="text-gray-700">
                Check the Network tab (WS filter) in DevTools to verify WebSocket connection:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-gray-700">
                <li>URL: ws://localhost:8000/api/v1/ws/notifications</li>
                <li>Status should be "101 Switching Protocols" (connected)</li>
                <li>Look for incoming messages after clicking the test button</li>
              </ul>
            </div>

            {/* Troubleshooting */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-2">Troubleshooting</h2>
              <div className="space-y-3 text-gray-700">
                <div>
                  <strong>❌ No user ID in console:</strong>
                  <p className="ml-4">Make sure you're logged in and the Redux store has user data</p>
                </div>
                <div>
                  <strong>❌ API call fails (403/401):</strong>
                  <p className="ml-4">Check that your JWT token is valid and tenant headers are set</p>
                </div>
                <div>
                  <strong>❌ No WebSocket connection:</strong>
                  <p className="ml-4">Ensure backend is running on port 8000 and WebSocket endpoint is available</p>
                </div>
                <div>
                  <strong>❌ No WebSocket message received:</strong>
                  <p className="ml-4">Backend might not be sending WebSocket notifications. Check backend logs.</p>
                </div>
                <div>
                  <strong>❌ Badge doesn't update:</strong>
                  <p className="ml-4">WebSocket message is not being processed by Header component</p>
                </div>
                <div>
                  <strong>❌ Panel doesn't show notification:</strong>
                  <p className="ml-4">Custom event broadcast is not reaching SmartNotificationCenter</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationDebugPage;
