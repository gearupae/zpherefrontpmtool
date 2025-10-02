import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ViewSelector from '../../components/Views/ViewSelector';
import { Task, Project } from '../../types';

const ProjectViewsPage: React.FC = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'projects' | 'tasks'>('projects');

  useEffect(() => {
    loadData();
  }, [tenantSlug]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load projects and tasks
      const [projectsResponse, tasksResponse] = await Promise.all([
        fetch('/api/v1/projects/', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        }),
        fetch('/api/v1/tasks/', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        })
      ]);

      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        setProjects(projectsData);
      }

      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        setTasks(tasksData);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (id: string) => {
    console.log(`Clicked item: ${id}`);
    // Navigate to detail page or open modal
  };

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      const response = await fetch(`/api/v1/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const updatedTask = await response.json();
        setTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, ...updatedTask } : task
        ));
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleProjectUpdate = async (projectId: string, updates: Partial<Project>) => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const updatedProject = await response.json();
        setProjects(prev => prev.map(project => 
          project.id === projectId ? { ...project, ...updatedProject } : project
        ));
      }
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Project & Task Management</h1>
          <p className="mt-2 text-lg text-gray-600">
            Multiple views to manage your projects and tasks efficiently
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('projects')}
                className={`py-2 px-3 font-medium text-sm rounded-md transition-colors focus:outline-none focus:ring-0 ${
                  activeTab === 'projects' ? 'text-indigo-600' : 'text-black hover:text-gray-700'
                }`}
              >
                Projects ({projects.length})
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`py-2 px-3 font-medium text-sm rounded-md transition-colors focus:outline-none focus:ring-0 ${
                  activeTab === 'tasks' ? 'text-indigo-600' : 'text-black hover:text-gray-700'
                }`}
              >
                Tasks ({tasks.length})
              </button>
            </nav>
          </div>
        </div>

        {/* View Content */}
        {activeTab === 'projects' ? (
          <ViewSelector
            projects={projects}
            tasks={tasks}
            type="projects"
            onItemClick={handleItemClick}
            onProjectUpdate={handleProjectUpdate}
            defaultView="list"
            showHealthDashboard={true}
          />
        ) : (
          <ViewSelector
            tasks={tasks}
            projects={projects}
            type="tasks"
            onItemClick={handleItemClick}
            onTaskUpdate={handleTaskUpdate}
            defaultView="kanban"
            showHealthDashboard={false}
          />
        )}
      </div>
    </div>
  );
};

export default ProjectViewsPage;
