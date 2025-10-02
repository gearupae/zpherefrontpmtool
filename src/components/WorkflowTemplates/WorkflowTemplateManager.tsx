import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  DocumentDuplicateIcon,
  PlayIcon,
  AdjustmentsHorizontalIcon,
  CheckCircleIcon,
  ClockIcon,
  UserGroupIcon,
  TagIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  StarIcon,
  ShareIcon,
  ArchiveBoxIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ChartBarIcon,
  CalendarIcon,
  CogIcon,
  BookOpenIcon,
  LightBulbIcon,
  RocketLaunchIcon,
  BriefcaseIcon,
  ComputerDesktopIcon,
  BuildingOfficeIcon,
  AcademicCapIcon,
  HeartIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  complexity_level: 'low' | 'medium' | 'high';
  estimated_duration_days: number;
  required_roles: string[];
  usage_count: number;
  is_public: boolean;
  is_featured: boolean;
  is_active: boolean;
  created_by_id: string;
  organization_id: string;
  template_data: {
    phases: Phase[];
    task_templates: TaskTemplate[];
    dependencies: Dependency[];
    milestones: Milestone[];
    resources: Resource[];
  };
  default_settings: any;
  custom_fields: any[];
  tags: string[];
  version: string;
  created_at: string;
  updated_at: string;
}

interface Phase {
  id: string;
  name: string;
  description: string;
  order: number;
  duration_days: number;
  color: string;
  tasks: string[];
  dependencies: string[];
}

interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  phase_id: string;
  estimated_hours: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  task_type: string;
  required_role: string;
  dependencies: string[];
  assignee_placeholder: string;
  checklist: ChecklistItem[];
}

interface ChecklistItem {
  id: string;
  text: string;
  required: boolean;
  estimated_time: number;
}

interface Dependency {
  id: string;
  from_task: string;
  to_task: string;
  type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
  lag_days: number;
}

interface Milestone {
  id: string;
  name: string;
  description: string;
  phase_id: string;
  criteria: string[];
  deliverables: string[];
}

interface Resource {
  id: string;
  name: string;
  type: 'human' | 'tool' | 'budget' | 'equipment';
  required: boolean;
  phase_id?: string;
  estimated_cost?: number;
}

const predefinedTemplates: WorkflowTemplate[] = [
  {
    id: 'software-dev-agile',
    name: 'Agile Software Development',
    description: 'Complete agile development workflow with sprints, user stories, and continuous integration',
    category: 'software_development',
    complexity_level: 'high',
    estimated_duration_days: 90,
    required_roles: ['Product Owner', 'Scrum Master', 'Developer', 'QA Engineer', 'DevOps Engineer'],
    usage_count: 247,
    is_public: true,
    is_featured: true,
    is_active: true,
    created_by_id: 'system',
    organization_id: 'public',
    template_data: {
      phases: [
        {
          id: 'phase-1',
          name: 'Project Initiation',
          description: 'Define project scope, requirements, and team setup',
          order: 1,
          duration_days: 10,
          color: 'blue',
          tasks: ['task-1', 'task-2', 'task-3'],
          dependencies: []
        },
        {
          id: 'phase-2',
          name: 'Sprint Planning',
          description: 'Plan first sprint with user stories and estimation',
          order: 2,
          duration_days: 5,
          color: 'green',
          tasks: ['task-4', 'task-5'],
          dependencies: ['phase-1']
        },
        {
          id: 'phase-3',
          name: 'Development Sprints',
          description: 'Execute development in 2-week sprints',
          order: 3,
          duration_days: 60,
          color: 'purple',
          tasks: ['task-6', 'task-7', 'task-8'],
          dependencies: ['phase-2']
        },
        {
          id: 'phase-4',
          name: 'Testing & Deployment',
          description: 'Final testing, user acceptance, and production deployment',
          order: 4,
          duration_days: 15,
          color: 'orange',
          tasks: ['task-9', 'task-10'],
          dependencies: ['phase-3']
        }
      ],
      task_templates: [
        {
          id: 'task-1',
          title: 'Define Project Requirements',
          description: 'Gather and document detailed project requirements',
          phase_id: 'phase-1',
          estimated_hours: 24,
          priority: 'high',
          task_type: 'analysis',
          required_role: 'Product Owner',
          dependencies: [],
          assignee_placeholder: 'Product Owner',
          checklist: [
            { id: 'c1', text: 'Conduct stakeholder interviews', required: true, estimated_time: 8 },
            { id: 'c2', text: 'Document functional requirements', required: true, estimated_time: 12 },
            { id: 'c3', text: 'Define acceptance criteria', required: true, estimated_time: 4 }
          ]
        }
      ],
      dependencies: [],
      milestones: [
        {
          id: 'm1',
          name: 'Project Kickoff',
          description: 'All requirements defined and team assembled',
          phase_id: 'phase-1',
          criteria: ['Requirements documented', 'Team assigned', 'Environment setup'],
          deliverables: ['Requirements Document', 'Project Charter', 'Team Structure']
        }
      ],
      resources: [
        {
          id: 'r1',
          name: 'Development Team',
          type: 'human',
          required: true,
          estimated_cost: 50000
        },
        {
          id: 'r2',
          name: 'CI/CD Pipeline',
          type: 'tool',
          required: true,
          estimated_cost: 1000
        }
      ]
    },
    default_settings: {
      sprint_duration: 14,
      story_point_scale: 'fibonacci',
      definition_of_done: 'Code reviewed, tested, deployed to staging'
    },
    custom_fields: [],
    tags: ['agile', 'software', 'scrum', 'ci/cd'],
    version: '2.1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z'
  },
  {
    id: 'marketing-campaign',
    name: 'Digital Marketing Campaign',
    description: 'End-to-end digital marketing campaign from strategy to execution and analysis',
    category: 'marketing',
    complexity_level: 'medium',
    estimated_duration_days: 45,
    required_roles: ['Marketing Manager', 'Content Creator', 'Designer', 'Data Analyst'],
    usage_count: 156,
    is_public: true,
    is_featured: true,
    is_active: true,
    created_by_id: 'system',
    organization_id: 'public',
    template_data: {
      phases: [
        {
          id: 'phase-1',
          name: 'Strategy & Planning',
          description: 'Define target audience, messaging, and campaign goals',
          order: 1,
          duration_days: 10,
          color: 'blue',
          tasks: ['task-1', 'task-2'],
          dependencies: []
        },
        {
          id: 'phase-2',
          name: 'Content Creation',
          description: 'Create all marketing materials and content',
          order: 2,
          duration_days: 15,
          color: 'green',
          tasks: ['task-3', 'task-4'],
          dependencies: ['phase-1']
        },
        {
          id: 'phase-3',
          name: 'Campaign Execution',
          description: 'Launch and monitor campaign across all channels',
          order: 3,
          duration_days: 15,
          color: 'purple',
          tasks: ['task-5', 'task-6'],
          dependencies: ['phase-2']
        },
        {
          id: 'phase-4',
          name: 'Analysis & Optimization',
          description: 'Analyze results and optimize for better performance',
          order: 4,
          duration_days: 5,
          color: 'orange',
          tasks: ['task-7'],
          dependencies: ['phase-3']
        }
      ],
      task_templates: [],
      dependencies: [],
      milestones: [],
      resources: []
    },
    default_settings: {
      target_audience: 'B2B professionals',
      primary_channels: ['LinkedIn', 'Google Ads', 'Email'],
      budget_allocation: { content: 30, ads: 50, tools: 20 }
    },
    custom_fields: [],
    tags: ['marketing', 'digital', 'campaign', 'b2b'],
    version: '1.5',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-10T00:00:00Z'
  }
];

const categories = [
  { id: 'software_development', name: 'Software Development', icon: ComputerDesktopIcon, color: 'blue' },
  { id: 'marketing', name: 'Marketing', icon: MagnifyingGlassIcon, color: 'green' },
  { id: 'consulting', name: 'Consulting', icon: BriefcaseIcon, color: 'purple' },
  { id: 'design', name: 'Design', icon: PencilIcon, color: 'pink' },
  { id: 'research', name: 'Research', icon: AcademicCapIcon, color: 'indigo' },
  { id: 'operations', name: 'Operations', icon: CogIcon, color: 'gray' },
  { id: 'sales', name: 'Sales', icon: ShoppingBagIcon, color: 'orange' },
  { id: 'hr', name: 'Human Resources', icon: UserGroupIcon, color: 'red' },
  { id: 'finance', name: 'Finance', icon: BuildingOfficeIcon, color: 'yellow' },
  { id: 'product', name: 'Product Management', icon: RocketLaunchIcon, color: 'cyan' }
];

interface WorkflowTemplateManagerProps {
  mode?: 'selection' | 'management';
  onTemplateSelect?: (template: WorkflowTemplate) => void;
  onTemplateCreate?: (template: WorkflowTemplate) => void;
}

const WorkflowTemplateManager: React.FC<WorkflowTemplateManagerProps> = ({
  mode = 'management',
  onTemplateSelect,
  onTemplateCreate
}) => {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>(predefinedTemplates);
  const [filteredTemplates, setFilteredTemplates] = useState<WorkflowTemplate[]>(predefinedTemplates);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Filter templates based on category and search
  useEffect(() => {
    let filtered = templates;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredTemplates(filtered);
  }, [templates, selectedCategory, searchQuery]);

  const getCategoryInfo = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId) || categories[0];
  };

  const getComplexityColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleUseTemplate = (template: WorkflowTemplate) => {
    if (onTemplateSelect) {
      onTemplateSelect(template);
    } else {
      // Default behavior - navigate to project creation with template
      console.log('Using template:', template.name);
    }
  };

  const handlePreviewTemplate = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {mode === 'selection' ? 'Choose a Template' : 'Workflow Templates'}
          </h2>
          <p className="text-gray-600 mt-1">
            {mode === 'selection' 
              ? 'Select a pre-built workflow template to kickstart your project'
              : 'Create and manage workflow templates for common project types'
            }
          </p>
        </div>
        {mode === 'management' && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Create Template</span>
          </button>
        )}
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            {/* Category Filter */}
            <div className="flex items-center space-x-2">
              <FunnelIcon className="w-4 h-4 text-gray-500" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>

        {/* Category Chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({templates.length})
          </button>
          {categories.map(category => {
            const count = templates.filter(t => t.category === category.id).length;
            if (count === 0) return null;
            
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? `bg-${category.color}-100 text-${category.color}-700 border border-${category.color}-300`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Templates Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              mode={mode}
              onUse={() => handleUseTemplate(template)}
              onPreview={() => handlePreviewTemplate(template)}
              onEdit={() => console.log('Edit template:', template.id)}
              onDuplicate={() => console.log('Duplicate template:', template.id)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {filteredTemplates.map(template => (
              <TemplateListItem
                key={template.id}
                template={template}
                mode={mode}
                onUse={() => handleUseTemplate(template)}
                onPreview={() => handlePreviewTemplate(template)}
                onEdit={() => console.log('Edit template:', template.id)}
                onDuplicate={() => console.log('Duplicate template:', template.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No templates found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery 
              ? 'Try adjusting your search criteria'
              : 'Get started by creating your first workflow template'
            }
          </p>
          {mode === 'management' && !searchQuery && (
            <div className="mt-6">
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Create Template
              </button>
            </div>
          )}
        </div>
      )}

      {/* Template Preview Modal */}
      {showPreview && selectedTemplate && (
        <TemplatePreviewModal
          template={selectedTemplate}
          onClose={() => setShowPreview(false)}
          onUse={() => {
            handleUseTemplate(selectedTemplate);
            setShowPreview(false);
          }}
        />
      )}

      {/* Create Template Form Modal */}
      {showCreateForm && (
        <CreateTemplateModal
          onClose={() => setShowCreateForm(false)}
          onCreate={(template) => {
            setTemplates(prev => [...prev, template]);
            setShowCreateForm(false);
            if (onTemplateCreate) {
              onTemplateCreate(template);
            }
          }}
        />
      )}
    </div>
  );
};

// Template Card Component
const TemplateCard: React.FC<{
  template: WorkflowTemplate;
  mode: string;
  onUse: () => void;
  onPreview: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
}> = ({ template, mode, onUse, onPreview, onEdit, onDuplicate }) => {
  const categoryInfo = categories.find(cat => cat.id === template.category);
  const CategoryIcon = categoryInfo?.icon || BookOpenIcon;

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-md bg-${categoryInfo?.color || 'gray'}-100`}>
              <CategoryIcon className={`w-5 h-5 text-${categoryInfo?.color || 'gray'}-600`} />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  template.complexity_level === 'low' ? 'bg-green-100 text-green-700' :
                  template.complexity_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {template.complexity_level} complexity
                </span>
                {template.is_featured && (
                  <StarIcon className="w-4 h-4 text-yellow-500" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-sm text-gray-600 mb-4">{template.description}</p>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Duration:</span>
            <div className="flex items-center space-x-1">
              <CalendarIcon className="w-4 h-4 text-gray-400" />
              <span className="font-medium">{template.estimated_duration_days} days</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Team Size:</span>
            <div className="flex items-center space-x-1">
              <UserGroupIcon className="w-4 h-4 text-gray-400" />
              <span className="font-medium">{template.required_roles.length} roles</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Phases:</span>
            <span className="font-medium">{template.template_data.phases.length}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Usage:</span>
            <span className="font-medium">{template.usage_count} times</span>
          </div>
        </div>

        {/* Tags */}
        {template.tags.length > 0 && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-1">
              {template.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                  {tag}
                </span>
              ))}
              {template.tags.length > 3 && (
                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                  +{template.tags.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <button
            onClick={onPreview}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            <EyeIcon className="w-4 h-4 inline mr-1" />
            Preview
          </button>
          
          <div className="flex items-center space-x-2">
            {mode === 'management' && (
              <>
                <button
                  onClick={onDuplicate}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="Duplicate"
                >
                  <DocumentDuplicateIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={onEdit}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="Edit"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onUse}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              {mode === 'selection' ? 'Use Template' : 'Apply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Template List Item Component
const TemplateListItem: React.FC<{
  template: WorkflowTemplate;
  mode: string;
  onUse: () => void;
  onPreview: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
}> = ({ template, mode, onUse, onPreview, onEdit, onDuplicate }) => {
  const categoryInfo = categories.find(cat => cat.id === template.category);
  const CategoryIcon = categoryInfo?.icon || BookOpenIcon;

  return (
    <div className="p-6 hover:bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          <div className={`p-2 rounded-md bg-${categoryInfo?.color || 'gray'}-100`}>
            <CategoryIcon className={`w-5 h-5 text-${categoryInfo?.color || 'gray'}-600`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-medium text-gray-900 truncate">{template.name}</h3>
              {template.is_featured && (
                <StarIcon className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              )}
              <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                template.complexity_level === 'low' ? 'bg-green-100 text-green-700' :
                template.complexity_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {template.complexity_level}
              </span>
            </div>
            
            <p className="text-sm text-gray-600 mt-1">{template.description}</p>
            
            <div className="flex items-center space-x-6 mt-2 text-sm text-gray-500">
              <span>{template.estimated_duration_days} days</span>
              <span>{template.required_roles.length} roles</span>
              <span>{template.template_data.phases.length} phases</span>
              <span>{template.usage_count} uses</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={onPreview}
            className="p-2 text-gray-400 hover:text-gray-600"
            title="Preview"
          >
            <EyeIcon className="w-4 h-4" />
          </button>
          {mode === 'management' && (
            <>
              <button
                onClick={onDuplicate}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="Duplicate"
              >
                <DocumentDuplicateIcon className="w-4 h-4" />
              </button>
              <button
                onClick={onEdit}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="Edit"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={onUse}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            {mode === 'selection' ? 'Use Template' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Template Preview Modal Component
const TemplatePreviewModal: React.FC<{
  template: WorkflowTemplate;
  onClose: () => void;
  onUse: () => void;
}> = ({ template, onClose, onUse }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Overview */}
            <div className="lg:col-span-2">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
                  <p className="text-sm text-gray-600">{template.description}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Project Phases</h4>
                  <div className="space-y-3">
                    {template.template_data.phases.map((phase, index) => (
                      <div key={phase.id} className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-gray-900">{phase.name}</h5>
                          <p className="text-sm text-gray-600">{phase.description}</p>
                          <p className="text-xs text-gray-500 mt-1">{phase.duration_days} days</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Required Roles</h4>
                  <div className="flex flex-wrap gap-2">
                    {template.required_roles.map(role => (
                      <span key={role} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Details */}
            <div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Template Details</h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Category:</dt>
                      <dd className="font-medium">{template.category.replace('_', ' ')}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Complexity:</dt>
                      <dd className="font-medium">{template.complexity_level}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Duration:</dt>
                      <dd className="font-medium">{template.estimated_duration_days} days</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Phases:</dt>
                      <dd className="font-medium">{template.template_data.phases.length}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Usage:</dt>
                      <dd className="font-medium">{template.usage_count} times</dd>
                    </div>
                  </dl>
                </div>

                {template.tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {template.tags.map(tag => (
                        <span key={tag} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={onUse}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Use This Template
          </button>
        </div>
      </div>
    </div>
  );
};

// Create Template Modal Component
const CreateTemplateModal: React.FC<{
  onClose: () => void;
  onCreate: (template: WorkflowTemplate) => void;
}> = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'software_development',
    complexity_level: 'medium' as 'low' | 'medium' | 'high',
    estimated_duration_days: 30,
    required_roles: [] as string[],
    tags: [] as string[]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newTemplate: WorkflowTemplate = {
      id: `template-${Date.now()}`,
      ...formData,
      usage_count: 0,
      is_public: false,
      is_featured: false,
      is_active: true,
      created_by_id: 'current-user',
      organization_id: 'current-org',
      template_data: {
        phases: [],
        task_templates: [],
        dependencies: [],
        milestones: [],
        resources: []
      },
      default_settings: {},
      custom_fields: [],
      version: '1.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    onCreate(newTemplate);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Create New Template</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                {categories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Complexity Level</label>
              <select
                value={formData.complexity_level}
                onChange={(e) => setFormData({...formData, complexity_level: e.target.value as any})}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Duration (days)</label>
              <input
                type="number"
                value={formData.estimated_duration_days}
                onChange={(e) => setFormData({...formData, estimated_duration_days: Number(e.target.value)})}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                min="1"
                required
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkflowTemplateManager;
