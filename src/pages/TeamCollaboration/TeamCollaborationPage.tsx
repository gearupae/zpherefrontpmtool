import React from 'react';
import { useParams } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import CollaborationHub from '../../components/TeamCollaboration/CollaborationHub';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const TeamCollaborationPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAppSelector((state) => state.auth);

  // Mock data for demonstration purposes
  // In a real app, this would come from API calls
  const projectMembers = [
    {
      id: '1',
      username: 'john.doe',
      first_name: 'John',
      last_name: 'Doe',
      full_name: 'John Doe',
      email: 'john.doe@example.com',
      role: 'ADMIN',
      avatar_url: undefined,
      is_active: true,
      is_online: true,
      status: 'online' as const,
      timezone: 'UTC'
    },
    {
      id: '2',
      username: 'jane.smith',
      first_name: 'Jane',
      last_name: 'Smith',
      full_name: 'Jane Smith',
      email: 'jane.smith@example.com',
      role: 'MANAGER',
      avatar_url: undefined,
      is_active: true,
      is_online: false,
      status: 'offline' as const,
      timezone: 'UTC'
    },
    {
      id: '3',
      username: 'mike.wilson',
      first_name: 'Mike',
      last_name: 'Wilson',
      full_name: 'Mike Wilson',
      email: 'mike.wilson@example.com',
      role: 'MEMBER',
      avatar_url: undefined,
      is_active: true,
      is_online: true,
      status: 'away' as const,
      timezone: 'UTC'
    }
  ];

  const taskReferences = [
    {
      id: 'task-1',
      title: 'Implement Authentication System',
      status: 'in_progress',
      priority: 'high',
      description: 'Set up user authentication with JWT tokens and role-based access control.',
      project_name: 'Web Application',
      assignee: { id: '1', full_name: 'John Doe' },
      due_date: '2024-02-20T00:00:00Z',
      progress: 65,
      tags: ['backend', 'security', 'auth'],
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-18T14:30:00Z'
    },
    {
      id: 'task-2',
      title: 'Design User Dashboard',
      status: 'todo',
      priority: 'medium',
      description: 'Create responsive dashboard with analytics widgets and user preferences.',
      project_name: 'Web Application',
      assignee: { id: '2', full_name: 'Jane Smith' },
      due_date: '2024-02-25T00:00:00Z',
      progress: 0,
      tags: ['frontend', 'ui', 'design'],
      created_at: '2024-01-16T09:00:00Z',
      updated_at: '2024-01-16T09:00:00Z'
    },
    {
      id: 'task-3',
      title: 'Set up CI/CD Pipeline',
      status: 'completed',
      priority: 'high',
      description: 'Configure automated testing and deployment pipeline using GitHub Actions.',
      project_name: 'Web Application',
      assignee: { id: '3', full_name: 'Mike Wilson' },
      due_date: '2024-01-30T00:00:00Z',
      progress: 100,
      tags: ['devops', 'automation', 'testing'],
      created_at: '2024-01-10T08:00:00Z',
      updated_at: '2024-01-28T16:45:00Z'
    }
  ];

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Team Collaboration Features</h1>
        <p className="mt-2 text-lg text-gray-600">
          Comprehensive collaboration tools for enhanced team productivity and communication.
        </p>
      </div>

      <CollaborationHub
        projectId={projectId || 'demo-project'}
        currentUser={user}
        projectMembers={projectMembers}
        taskReferences={taskReferences}
      />
    </div>
  );
};

export default TeamCollaborationPage;
