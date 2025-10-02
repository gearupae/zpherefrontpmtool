import React, { useState, useEffect } from 'react';
import { 
  ArrowRightIcon, 
  XMarkIcon, 
  PlusIcon,
  ExclamationTriangleIcon,
  LinkIcon
} from '@heroicons/react/24/outline';

interface TaskDependency {
  id: string;
  prerequisite_task_id: string;
  dependent_task_id: string;
  dependency_type: 'blocks' | 'follows' | 'relates_to';
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
}

interface TaskDependenciesProps {
  taskId: string;
  availableTasks: Task[];
  onDependencyChange?: () => void;
}

const TaskDependencies: React.FC<TaskDependenciesProps> = ({
  taskId,
  availableTasks,
  onDependencyChange
}) => {
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [tasks, setTasks] = useState<{ [key: string]: Task }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDependency, setNewDependency] = useState({
    dependent_task_id: '',
    dependency_type: 'blocks' as 'blocks' | 'follows' | 'relates_to'
  });

  useEffect(() => {
    fetchDependencies();
    
    // Create tasks map for quick lookup
    const tasksMap: { [key: string]: Task } = {};
    availableTasks.forEach(task => {
      tasksMap[task.id] = task;
    });
    setTasks(tasksMap);
  }, [taskId, availableTasks]);

  const fetchDependencies = async () => {
    setIsLoading(true);
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get(`/tasks/${taskId}/dependencies`);
      setDependencies(response.data);
    } catch (error) {
      console.error('Failed to fetch dependencies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addDependency = async () => {
    if (!newDependency.dependent_task_id) return;

    try {
      const { default: apiClient } = await import('../../api/client');
      await apiClient.post(`/tasks/${taskId}/dependencies`, newDependency);
      
      setNewDependency({
        dependent_task_id: '',
        dependency_type: 'blocks'
      });
      setShowAddForm(false);
      await fetchDependencies();
      onDependencyChange?.();
    } catch (error) {
      console.error('Failed to add dependency:', error);
    }
  };

  const removeDependency = async (dependencyId: string) => {
    try {
      const { default: apiClient } = await import('../../api/client');
      await apiClient.delete(`/tasks/${taskId}/dependencies/${dependencyId}`);
      await fetchDependencies();
      onDependencyChange?.();
    } catch (error) {
      console.error('Failed to remove dependency:', error);
    }
  };

  const getDependencyTypeLabel = (type: string) => {
    switch (type) {
      case 'blocks':
        return 'blocks';
      case 'follows':
        return 'follows';
      case 'relates_to':
        return 'relates to';
      default:
        return type;
    }
  };

  const getDependencyTypeColor = (type: string) => {
    switch (type) {
      case 'blocks':
        return 'text-user-red';
      case 'follows':
        return 'text-user-blue';
      case 'relates_to':
        return 'text-user-purple';
      default:
        return 'text-text-secondary';
    }
  };

  const getTaskStatus = (task: Task) => {
    switch (task.status) {
      case 'completed':
        return 'bg-user-green/10 text-user-green border-user-green/20';
      case 'in_progress':
        return 'bg-user-yellow/10 text-user-yellow border-user-yellow/20';
      case 'blocked':
        return 'bg-user-red/10 text-user-red border-user-red/20';
      default:
        return 'bg-surface text-text-secondary border-border';
    }
  };

  // Separate dependencies into those where this task blocks others vs is blocked by others
  const blockingTasks = dependencies.filter(dep => 
    dep.prerequisite_task_id === taskId && dep.dependency_type === 'blocks'
  );
  
  const blockedByTasks = dependencies.filter(dep => 
    dep.dependent_task_id === taskId && dep.dependency_type === 'blocks'
  );
  
  const relatedTasks = dependencies.filter(dep => 
    dep.dependency_type === 'relates_to' || dep.dependency_type === 'follows'
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <LinkIcon className="h-5 w-5 text-text-secondary" />
          <h4 className="font-medium text-text-primary">Task Dependencies</h4>
        </div>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-10 bg-surface rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <LinkIcon className="h-5 w-5 text-text-secondary" />
          <h4 className="font-medium text-text-primary">Task Dependencies</h4>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-1 px-2 py-1 text-xs bg-user-blue text-white rounded hover:bg-blue-600 transition-colors"
        >
          <PlusIcon className="h-3 w-3" />
          <span>Add</span>
        </button>
      </div>

      {/* Blocked by (prerequisites) */}
      {blockedByTasks.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-text-secondary flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-4 w-4 text-user-red" />
            <span>Blocked by ({blockedByTasks.length})</span>
          </h5>
          <div className="space-y-2">
            {blockedByTasks.map((dependency) => {
              const prerequisiteTask = tasks[dependency.prerequisite_task_id];
              if (!prerequisiteTask) return null;
              
              return (
                <div key={dependency.id} className="flex items-center space-x-3 p-3 border border-border rounded-lg bg-surface/50">
                  <div className="flex-1 flex items-center space-x-3">
                    <span 
                      className={`px-2 py-1 text-xs rounded border ${getTaskStatus(prerequisiteTask)}`}
                    >
                      {prerequisiteTask.status}
                    </span>
                    <span className="text-sm text-text-primary font-medium">
                      {prerequisiteTask.title}
                    </span>
                    <ArrowRightIcon className="h-4 w-4 text-user-red" />
                    <span className="text-xs text-user-red">This Task</span>
                  </div>
                  <button
                    onClick={() => removeDependency(dependency.id)}
                    className="p-1 text-text-secondary hover:text-user-red transition-colors"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Blocking (dependents) */}
      {blockingTasks.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-text-secondary">
            This task blocks ({blockingTasks.length})
          </h5>
          <div className="space-y-2">
            {blockingTasks.map((dependency) => {
              const dependentTask = tasks[dependency.dependent_task_id];
              if (!dependentTask) return null;
              
              return (
                <div key={dependency.id} className="flex items-center space-x-3 p-3 border border-border rounded-lg bg-surface/50">
                  <div className="flex-1 flex items-center space-x-3">
                    <span className="text-xs text-user-red">This Task</span>
                    <ArrowRightIcon className="h-4 w-4 text-user-red" />
                    <span 
                      className={`px-2 py-1 text-xs rounded border ${getTaskStatus(dependentTask)}`}
                    >
                      {dependentTask.status}
                    </span>
                    <span className="text-sm text-text-primary font-medium">
                      {dependentTask.title}
                    </span>
                  </div>
                  <button
                    onClick={() => removeDependency(dependency.id)}
                    className="p-1 text-text-secondary hover:text-user-red transition-colors"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Related tasks */}
      {relatedTasks.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-text-secondary">
            Related tasks ({relatedTasks.length})
          </h5>
          <div className="space-y-2">
            {relatedTasks.map((dependency) => {
              const relatedTask = tasks[
                dependency.prerequisite_task_id === taskId 
                  ? dependency.dependent_task_id 
                  : dependency.prerequisite_task_id
              ];
              if (!relatedTask) return null;
              
              return (
                <div key={dependency.id} className="flex items-center space-x-3 p-3 border border-border rounded-lg bg-surface/50">
                  <div className="flex-1 flex items-center space-x-3">
                    <span 
                      className={`text-xs ${getDependencyTypeColor(dependency.dependency_type)}`}
                    >
                      {getDependencyTypeLabel(dependency.dependency_type)}
                    </span>
                    <span 
                      className={`px-2 py-1 text-xs rounded border ${getTaskStatus(relatedTask)}`}
                    >
                      {relatedTask.status}
                    </span>
                    <span className="text-sm text-text-primary font-medium">
                      {relatedTask.title}
                    </span>
                  </div>
                  <button
                    onClick={() => removeDependency(dependency.id)}
                    className="p-1 text-text-secondary hover:text-user-red transition-colors"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add dependency form */}
      {showAddForm && (
        <div className="border border-border rounded-lg p-4 bg-surface/50">
          <h5 className="text-sm font-medium text-text-primary mb-3">Add Dependency</h5>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Dependency Type
              </label>
              <select
                value={newDependency.dependency_type}
                onChange={(e) => setNewDependency(prev => ({
                  ...prev,
                  dependency_type: e.target.value as 'blocks' | 'follows' | 'relates_to'
                }))}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-user-blue focus:border-transparent"
              >
                <option value="blocks">This task blocks</option>
                <option value="follows">This task follows</option>
                <option value="relates_to">This task relates to</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Task
              </label>
              <select
                value={newDependency.dependent_task_id}
                onChange={(e) => setNewDependency(prev => ({
                  ...prev,
                  dependent_task_id: e.target.value
                }))}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-user-blue focus:border-transparent"
              >
                <option value="">Select a task</option>
                {availableTasks
                  .filter(task => task.id !== taskId)
                  .map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={addDependency}
                disabled={!newDependency.dependent_task_id}
                className="px-3 py-2 text-sm bg-user-blue text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add Dependency
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-surface transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No dependencies state */}
      {dependencies.length === 0 && !showAddForm && (
        <div className="text-center py-6 border border-dashed border-border rounded-lg">
          <LinkIcon className="h-8 w-8 text-text-secondary mx-auto mb-2" />
          <p className="text-sm text-text-secondary">No dependencies</p>
          <p className="text-xs text-text-muted">Add task dependencies to show relationships</p>
        </div>
      )}
    </div>
  );
};

export default TaskDependencies;
