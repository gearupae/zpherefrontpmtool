import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, PlusIcon, FolderIcon } from '@heroicons/react/24/outline';

interface Workspace {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  is_private: boolean;
  project_count?: number;
}

interface WorkspaceSelectorProps {
  selectedWorkspace: Workspace | null;
  onWorkspaceChange: (workspace: Workspace | null) => void;
  onCreateWorkspace: () => void;
}

const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({
  selectedWorkspace,
  onWorkspaceChange,
  onCreateWorkspace
}) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    setIsLoading(true);
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get('/workspaces/');
      setWorkspaces(response.data);
      
      // If no workspace is selected, select the first one
      if (!selectedWorkspace && response.data.length > 0) {
        onWorkspaceChange(response.data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getWorkspaceIcon = (iconName: string) => {
    // You can expand this to support more icons
    switch (iconName) {
      case 'folder':
      default:
        return <FolderIcon className="h-5 w-5" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center space-x-2 py-2 text-sm border border-border rounded-lg hover:bg-surface-hover transition-colors min-w-[200px]"
        disabled={isLoading}
      >
        {selectedWorkspace ? (
          <>
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: selectedWorkspace.color }}
            />
            {getWorkspaceIcon(selectedWorkspace.icon)}
            <span className="text-text-primary font-medium truncate">
              {selectedWorkspace.name}
            </span>
          </>
        ) : (
          <span className="text-text-secondary">Select Workspace</span>
        )}
        <ChevronDownIcon className="h-4 w-4 text-text-secondary ml-auto" />
      </button>

      {isDropdownOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50">
          <div >
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                onClick={() => {
                  onWorkspaceChange(workspace);
                  setIsDropdownOpen(false);
                }}
                className="w-full flex items-center space-x-2 py-2 text-sm hover:bg-surface-hover text-left"
              >
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: workspace.color }}
                />
                {getWorkspaceIcon(workspace.icon)}
                <div className="flex-1">
                  <div className="text-text-primary font-medium">
                    {workspace.name}
                  </div>
                  {workspace.description && (
                    <div className="text-text-secondary text-xs truncate">
                      {workspace.description}
                    </div>
                  )}
                </div>
                {workspace.is_private && (
                  <span className="text-xs text-text-secondary bg-surface px-1.5 py-0.5 rounded">
                    Private
                  </span>
                )}
              </button>
            ))}
            
            <div className="border-t border-border mt-1 pt-1">
              <button
                onClick={() => {
                  onCreateWorkspace();
                  setIsDropdownOpen(false);
                }}
                className="w-full flex items-center space-x-2 py-2 text-sm hover:bg-surface-hover text-left text-user-blue"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Create Workspace</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Dropdown backdrop */}
      {isDropdownOpen && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
};

export default WorkspaceSelector;
