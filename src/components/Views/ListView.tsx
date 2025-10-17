import React, { useState, useMemo, useCallback } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
  FlagIcon,
  UserIcon,
  TagIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Task, Project, TaskStatus, ProjectStatus, TaskPriority, ProjectPriority } from '../../types';

interface ListViewProps {
  tasks?: Task[];
  projects?: Project[];
  type: 'tasks' | 'projects';
  onItemClick?: (id: string) => void;
  onItemUpdate?: (id: string, updates: Partial<Task | Project>) => void;
  showSearch?: boolean;
  showFilters?: boolean;
  compact?: boolean;
}

type SortField = 'title' | 'status' | 'priority' | 'due_date' | 'created_at' | 'assignee';
type SortDirection = 'asc' | 'desc';

interface FilterState {
  status: string[];
  priority: string[];
  assignee: string[];
  tags: string[];
  overdue: boolean;
  completed: boolean;
}

const ListView: React.FC<ListViewProps> = ({
  tasks = [],
  projects = [],
  type,
  onItemClick,
  onItemUpdate,
  showSearch = true,
  showFilters = true,
  compact = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('due_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: [],
    priority: [],
    assignee: [],
    tags: [],
    overdue: false,
    completed: true,
  });

  const items = type === 'tasks' ? tasks : projects;

  // Get available filter options
  const filterOptions = useMemo(() => {
    const statuses = type === 'tasks' 
      ? Object.values(TaskStatus)
      : Object.values(ProjectStatus);
    
    const priorities = type === 'tasks'
      ? Object.values(TaskPriority)
      : Object.values(ProjectPriority);
    
    const assignees = items
      .map(item => ('assignee' in item ? item.assignee : null))
      .filter(Boolean)
      .reduce((acc: any[], assignee: any) => {
        if (assignee && !acc.find((a: any) => a.id === assignee.id)) {
          acc.push(assignee);
        }
        return acc;
      }, []);

    const allTags = items
      .flatMap(item => ('tags' in item ? item.tags : []) || [])
      .filter((tag, index, array) => array.indexOf(tag) === index);

    return { statuses, priorities, assignees, allTags };
  }, [items, type]);

  // Filter and search items
  const filteredItems = useMemo(() => {
    let filtered = [...items];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        const title = ('title' in item ? item.title : item.name).toLowerCase();
        const description = item.description?.toLowerCase() || '';
        const tags = (('tags' in item ? item.tags : []) || []).join(' ').toLowerCase();
        
        return title.includes(term) || description.includes(term) || tags.includes(term);
      });
    }

    // Apply status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(item => filters.status.includes(item.status));
    }

    // Apply priority filter
    if (filters.priority.length > 0) {
      filtered = filtered.filter(item => filters.priority.includes(item.priority));
    }

    // Apply assignee filter
    if (filters.assignee.length > 0) {
      filtered = filtered.filter(item => {
        const assigneeId = 'assignee' in item ? (item.assignee as any)?.id : null;
        return assigneeId && filters.assignee.includes(assigneeId);
      });
    }

    // Apply tags filter
    if (filters.tags.length > 0) {
      filtered = filtered.filter(item => {
        const itemTags = ('tags' in item ? item.tags : []) || [];
        return filters.tags.some(tag => itemTags.includes(tag));
      });
    }

    // Apply overdue filter
    if (filters.overdue) {
      const now = new Date();
      filtered = filtered.filter(item => {
        const dueDate = item.due_date ? new Date(item.due_date) : null;
        return dueDate && dueDate < now && item.status !== (type === 'tasks' ? TaskStatus.COMPLETED : ProjectStatus.COMPLETED);
      });
    }

    // Apply completed filter
    if (!filters.completed) {
      const completedStatus = type === 'tasks' ? TaskStatus.COMPLETED : ProjectStatus.COMPLETED;
      filtered = filtered.filter(item => item.status !== completedStatus);
    }

    return filtered;
  }, [items, searchTerm, filters, type]);

  // Sort items
  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems];
    
    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'title':
          aValue = ('title' in a ? a.title : a.name).toLowerCase();
          bValue = ('title' in b ? b.title : b.name).toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'priority':
          const priorityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          break;
        case 'due_date':
          aValue = a.due_date ? new Date(a.due_date).getTime() : 0;
          bValue = b.due_date ? new Date(b.due_date).getTime() : 0;
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'assignee':
          aValue = ('assignee' in a ? (a.assignee as any)?.first_name || '' : '').toLowerCase();
          bValue = ('assignee' in b ? (b.assignee as any)?.first_name || '' : '').toLowerCase();
          break;
        default:
          aValue = 0;
          bValue = 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredItems, sortField, sortDirection]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  const handleFilterChange = useCallback((filterType: keyof FilterState, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value,
    }));
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'blocked':
      case 'on_hold':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const isOverdue = (dueDate: string | null | undefined, status: string) => {
    if (!dueDate) return false;
    const now = new Date();
    const due = new Date(dueDate);
    const completedStatus = type === 'tasks' ? TaskStatus.COMPLETED : ProjectStatus.COMPLETED;
    return due < now && status !== completedStatus;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const SortButton: React.FC<{ field: SortField; children: React.ReactNode }> = ({ field, children }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center space-x-1 text-left font-medium text-gray-700 hover:text-gray-900"
    >
      <span>{children}</span>
      {sortField === field && (
        sortDirection === 'asc' ? 
          <ArrowUpIcon className="w-4 h-4" /> : 
          <ArrowDownIcon className="w-4 h-4" />
      )}
    </button>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {type === 'tasks' ? 'Tasks' : 'Projects'} ({sortedItems.length})
          </h2>
          
          <div className="flex items-center space-x-2">
            {showFilters && (
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`flex items-center space-x-2 py-2 text-sm border rounded-md ${
                  showFilterPanel ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-700 border-gray-300'
                } hover:bg-gray-50`}
              >
                <FunnelIcon className="w-4 h-4" />
                <span>Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        {showSearch && (
          <div className="mt-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${type}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Filter Panel */}
        {showFilterPanel && (
          <div className="mt-4 p-4 bg-white border rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <div className="space-y-1">
                  {filterOptions.statuses.map(status => (
                    <label key={status} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.status.includes(status)}
                        onChange={(e) => {
                          const newStatus = e.target.checked
                            ? [...filters.status, status]
                            : filters.status.filter(s => s !== status);
                          handleFilterChange('status', newStatus);
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">{status.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <div className="space-y-1">
                  {filterOptions.priorities.map(priority => (
                    <label key={priority} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.priority.includes(priority)}
                        onChange={(e) => {
                          const newPriority = e.target.checked
                            ? [...filters.priority, priority]
                            : filters.priority.filter(p => p !== priority);
                          handleFilterChange('priority', newPriority);
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`ml-2 text-sm capitalize ${getPriorityColor(priority)}`}>
                        {priority}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Other Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                <div className="space-y-1">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.overdue}
                      onChange={(e) => handleFilterChange('overdue', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Overdue only</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.completed}
                      onChange={(e) => handleFilterChange('completed', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Show completed</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* List */}
      <div className="overflow-hidden">
        {/* Table Header */}
        {!compact && (
          <div className="bg-gray-50 border-b px-4 py-3">
            <div className="grid grid-cols-12 gap-4 text-sm">
              <div className="col-span-4">
                <SortButton field="title">
                  {type === 'tasks' ? 'Task' : 'Project'}
                </SortButton>
              </div>
              <div className="col-span-2">
                <SortButton field="status">Status</SortButton>
              </div>
              <div className="col-span-1">
                <SortButton field="priority">Priority</SortButton>
              </div>
              <div className="col-span-2">
                <SortButton field="assignee">Assignee</SortButton>
              </div>
              <div className="col-span-2">
                <SortButton field="due_date">Due Date</SortButton>
              </div>
              <div className="col-span-1">Tags</div>
            </div>
          </div>
        )}

        {/* Items */}
        <div className="divide-y">
          {sortedItems.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No {type} found</p>
              <p className="text-sm">Try adjusting your search or filters.</p>
            </div>
          ) : (
            sortedItems.map((item) => {
              const itemTitle = 'title' in item ? item.title : item.name;
              const assignee = 'assignee' in item ? item.assignee : null;
              const overdue = isOverdue(item.due_date, item.status);

              return (
                <div
                  key={item.id}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => onItemClick?.(item.id)}
                >
                  {compact ? (
                    /* Compact View */
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-gray-900">{itemTitle}</h3>
                            {overdue && <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />}
                          </div>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                            <span className={`px-2 text-xs rounded-full ${getStatusColor(item.status)}`}>
                              {item.status.replace('_', ' ')}
                            </span>
                            <span className={getPriorityColor(item.priority)}>
                              {item.priority}
                            </span>
                            {item.due_date && (
                              <span className={overdue ? 'text-red-600' : ''}>
                                {formatDate(item.due_date)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Full View */
                    <div className="grid grid-cols-12 gap-4 items-center text-sm">
                      <div className="col-span-4">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900">{itemTitle}</h3>
                          {overdue && <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />}
                        </div>
                        {item.description && (
                          <p className="text-gray-500 text-xs mt-1 truncate">{item.description}</p>
                        )}
                      </div>
                      
                      <div className="col-span-2">
                        <span className={`px-2 text-xs rounded-full ${getStatusColor(item.status)}`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <div className="col-span-1">
                        <FlagIcon className={`w-4 h-4 ${getPriorityColor(item.priority)}`} />
                      </div>
                      
                      <div className="col-span-2">
                        {assignee ? (
                          <div className="flex items-center space-x-2">
                            <UserIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-700">{(assignee as any).first_name} {(assignee as any).last_name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">Unassigned</span>
                        )}
                      </div>
                      
                      <div className="col-span-2">
                        <div className="flex items-center space-x-1">
                          <CalendarIcon className="w-4 h-4 text-gray-400" />
                          <span className={overdue ? 'text-red-600' : 'text-gray-700'}>
                            {formatDate(item.due_date)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="col-span-1">
                        <div className="flex items-center space-x-1">
                          {(('tags' in item ? item.tags : []) || []).length > 0 && (
                            <>
                              <TagIcon className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-500">{('tags' in item ? item.tags : [])?.length}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer */}
      {sortedItems.length > 0 && (
        <div className="border-t p-4 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div>
              Showing {sortedItems.length} of {items.length} {type}
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                <span>
                  {sortedItems.filter(item => 
                    item.status === (type === 'tasks' ? TaskStatus.COMPLETED : ProjectStatus.COMPLETED)
                  ).length} completed
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <ClockIcon className="w-4 h-4 text-yellow-500" />
                <span>
                  {sortedItems.filter(item => isOverdue(item.due_date, item.status)).length} overdue
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListView;
