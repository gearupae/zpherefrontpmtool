import React, { useState } from 'react';
import {
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  DocumentArrowUpIcon,
  LinkIcon,
  AtSymbolIcon,
  ShieldCheckIcon,
  BellIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

// Import the collaboration components
import TeamManagement from '../Teams/TeamManagement';
import TaskAssignment from '../Tasks/TaskAssignment';
import ThreadedComments from '../Comments/ThreadedComments';
import EnhancedFileUpload from '../FileUpload/EnhancedFileUpload';
import UnifiedChatSystem from '../Chat/UnifiedChatSystem';
import TaskLinker from '../Comments/TaskLinker';

interface CollaborationHubProps {
  projectId: string;
  currentUser: any;
  projectMembers: any[];
  taskReferences: any[];
}

const CollaborationHub: React.FC<CollaborationHubProps> = ({
  projectId,
  currentUser,
  projectMembers,
  taskReferences
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const features = [
    {
      id: 'team-management',
      title: 'Team Members',
      description: 'Add users, define roles, and manage permissions',
      icon: UserGroupIcon,
      color: 'text-blue-600 bg-blue-100',
      implemented: true,
      details: [
        'User role management (Admin, Manager, Member, Client)',
        'Granular permission system',
        'Team organization and grouping',
        'Role-based access controls'
      ]
    },
    {
      id: 'task-assignment',
      title: 'Task Assignment',
      description: 'Assign single or multiple owners with clear accountability',
      icon: ShieldCheckIcon,
      color: 'text-green-600 bg-green-100',
      implemented: true,
      details: [
        'Single and multiple assignee support',
        'Primary assignee designation for accountability',
        'Task watcher system for notifications',
        'Assignment history and tracking'
      ]
    },
    {
      id: 'comments-discussions',
      title: 'Comments & Updates',
      description: 'Threaded discussions on tasks and projects with @mention functionality',
      icon: AtSymbolIcon,
      color: 'text-purple-600 bg-purple-100',
      implemented: true,
      details: [
        'Threaded comment system',
        '@mention functionality with auto-suggestions',
        'Real-time comment notifications',
        'Comment editing and deletion',
        'Like and reaction system'
      ]
    },
    {
      id: 'file-attachments',
      title: 'File Attachments',
      description: 'Drag-and-drop upload from local or cloud storage',
      icon: DocumentArrowUpIcon,
      color: 'text-orange-600 bg-orange-100',
      implemented: true,
      details: [
        'Drag-and-drop file upload interface',
        'Cloud storage integration (Google Drive, Dropbox, OneDrive)',
        'File preview and thumbnail generation',
        'Upload progress tracking',
        'File versioning and access controls'
      ]
    },
    {
      id: 'chat-system',
      title: 'Built-In Lightweight Chat',
      description: 'Project-level chat and direct messaging without leaving the tool',
      icon: ChatBubbleLeftRightIcon,
      color: 'text-indigo-600 bg-indigo-100',
      implemented: true,
      details: [
        'Real-time messaging with WebSocket connection',
        'Project channels and direct messages',
        'Message threading and replies',
        'Online status indicators',
        'Message search and history'
      ]
    },
    {
      id: 'task-linking',
      title: 'Contextual Task Linking',
      description: 'Mention tasks within other task comments to create cross-references',
      icon: LinkIcon,
      color: 'text-red-600 bg-red-100',
      implemented: true,
      details: [
        'Task cross-referencing in comments',
        'Dependency tracking (blocks, depends on, relates to)',
        'Smart task suggestions while typing',
        'Visual relationship mapping',
        'Task mention notifications'
      ]
    }
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: EyeIcon },
    { id: 'team-management', label: 'Team Management', icon: UserGroupIcon },
    { id: 'task-assignment', label: 'Task Assignment', icon: ShieldCheckIcon },
    { id: 'comments', label: 'Comments', icon: AtSymbolIcon },
    { id: 'files', label: 'File Upload', icon: DocumentArrowUpIcon },
    { id: 'chat', label: 'Chat System', icon: ChatBubbleLeftRightIcon },
    { id: 'task-linking', label: 'Task Linking', icon: LinkIcon }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
              <h2 className="text-2xl font-bold mb-2">Team Collaboration Features</h2>
              <p className="text-blue-100">
                Comprehensive collaboration tools to enhance team productivity and communication.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <div key={feature.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={`p-2 rounded-lg ${feature.color}`}>
                      <feature.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                      {feature.implemented && (
                        <span className="inline-flex items-center px-2 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Implemented
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-4">{feature.description}</p>
                  
                  <ul className="space-y-1">
                    {feature.details.map((detail, index) => (
                      <li key={index} className="text-sm text-gray-500 flex items-start">
                        <span className="text-green-500 mr-2">•</span>
                        {detail}
                      </li>
                    ))}
                  </ul>
                  
                  <button
                    onClick={() => setActiveTab(feature.id)}
                    className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View Demo →
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-2">
                <BellIcon className="w-5 h-5 text-yellow-600" />
                <h3 className="text-lg font-medium text-yellow-900">Integration Status</h3>
              </div>
              <p className="text-yellow-800 mb-4">
                All team collaboration features have been successfully implemented and are ready for use.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-green-800">Team Management</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-green-800">Task Assignment</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-green-800">Comments System</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-green-800">File Attachments</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-green-800">Chat System</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-green-800">Task Linking</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'team-management':
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Team Management</h2>
              <p className="text-gray-600">
                Comprehensive user management with role-based permissions and team organization.
              </p>
            </div>
            <TeamManagement currentUser={currentUser} />
          </div>
        );

      case 'task-assignment':
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Task Assignment</h2>
              <p className="text-gray-600">
                Advanced task assignment with multiple assignees, clear accountability, and watcher system.
              </p>
            </div>
            <TaskAssignment
              task={{
                id: 'demo-task',
                title: 'Implement New Dashboard Feature',
                description: 'Create a comprehensive dashboard with analytics and reporting capabilities.',
                status: 'in_progress',
                priority: 'high',
                assignees: [],
                watchers: [],
                due_date: '2024-02-15T00:00:00Z',
                estimated_hours: 40,
                created_by: currentUser
              }}
              projectMembers={projectMembers}
              currentUser={currentUser}
              onUpdateAssignees={(assignees) => console.log('Updated assignees:', assignees)}
              onUpdateWatchers={(watchers) => console.log('Updated watchers:', watchers)}
            />
          </div>
        );

      case 'comments':
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Threaded Comments</h2>
              <p className="text-gray-600">
                Rich commenting system with @mentions, task linking, and threaded discussions.
              </p>
            </div>
            <ThreadedComments
              comments={[]}
              currentUser={currentUser}
              projectMembers={projectMembers}
              taskReferences={taskReferences}
              entityType="project"
              entityId={projectId}
              onAddComment={(content, parentId, mentions, linkedTasks) => 
                console.log('Add comment:', { content, parentId, mentions, linkedTasks })
              }
              onEditComment={(commentId, content, mentions, linkedTasks) => 
                console.log('Edit comment:', { commentId, content, mentions, linkedTasks })
              }
              onDeleteComment={(commentId) => console.log('Delete comment:', commentId)}
              onLikeComment={(commentId) => console.log('Like comment:', commentId)}
            />
          </div>
        );

      case 'files':
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Enhanced File Upload</h2>
              <p className="text-gray-600">
                Drag-and-drop file upload with cloud storage integration and progress tracking.
              </p>
            </div>
            <EnhancedFileUpload
              attachments={[]}
              onFileUpload={(files) => console.log('Upload files:', files)}
              onCloudFileSelect={(provider, files) => console.log('Cloud files:', provider, files)}
              onDeleteAttachment={(id) => console.log('Delete attachment:', id)}
              onRetryUpload={(id) => console.log('Retry upload:', id)}
              onPreviewFile={(attachment) => console.log('Preview file:', attachment)}
            />
          </div>
        );

      case 'chat':
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Unified Chat System</h2>
              <p className="text-gray-600">
                Real-time messaging with project channels, direct messages, and WebSocket integration.
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <p className="text-gray-700 mb-4">
                The chat system appears as a floating widget in the bottom-right corner of the screen.
                It includes:
              </p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Real-time WebSocket messaging</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Project channels and direct messages</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Online status indicators</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Message threading and replies</span>
                </li>
              </ul>
            </div>
            <UnifiedChatSystem
              currentUser={currentUser}
              channels={[]}
              projectMembers={projectMembers}
              onSendMessage={(channelId, content, replyTo, mentions) => 
                console.log('Send message:', { channelId, content, replyTo, mentions })
              }
              onCreateChannel={(name, type, participants) => 
                console.log('Create channel:', { name, type, participants })
              }
              onJoinChannel={(channelId) => console.log('Join channel:', channelId)}
              onLeaveChannel={(channelId) => console.log('Leave channel:', channelId)}
              onStartDirectMessage={(userId) => console.log('Start DM:', userId)}
            />
          </div>
        );

      case 'task-linking':
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Contextual Task Linking</h2>
              <p className="text-gray-600">
                Create relationships between tasks with cross-references and dependency tracking.
              </p>
            </div>
            <TaskLinker
              currentEntityType="project"
              currentEntityId={projectId}
              projectTasks={taskReferences}
              existingLinks={[]}
              onCreateLink={(targetTaskId, linkType, description) => 
                console.log('Create link:', { targetTaskId, linkType, description })
              }
              onRemoveLink={(linkId) => console.log('Remove link:', linkId)}
              onNavigateToTask={(taskId) => console.log('Navigate to task:', taskId)}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 mb-6">
        <nav className="flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group inline-flex items-center py-3 font-medium text-sm whitespace-nowrap rounded-md transition-colors focus:outline-none focus:ring-0 ${
                activeTab === tab.id ? 'text-indigo-600' : 'text-black hover:text-gray-700'
              }`}
            >
              <tab.icon className={`mr-2 h-5 w-5 ${
                activeTab === tab.id ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'
              }`} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default CollaborationHub;
