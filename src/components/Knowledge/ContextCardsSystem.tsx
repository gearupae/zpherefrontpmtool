import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { 
  PlusIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon, 
  LinkIcon,
  LightBulbIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  TagIcon,
  CalendarIcon,
  UserIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

interface ContextCard {
  id: string;
  title: string;
  content: string;
  decision_rationale: string;
  impact_assessment: string;
  context_type: 'DECISION' | 'DISCUSSION' | 'INSIGHT' | 'LEARNING' | 'ISSUE' | 'SOLUTION';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  tags: string[];
  linked_tasks: string[];
  linked_projects: string[];
  linked_discussions: string[];
  auto_captured: boolean;
  capture_source: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
}

interface ContextCardFormData {
  title: string;
  content: string;
  decision_rationale: string;
  impact_assessment: string;
  context_type: 'DECISION' | 'DISCUSSION' | 'INSIGHT' | 'LEARNING' | 'ISSUE' | 'SOLUTION';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  tags: string[];
  linked_tasks: string[];
  linked_projects: string[];
  linked_discussions: string[];
}

interface ContextCardsSystemProps {
  linkedEntityId?: string;
  linkedEntityType?: 'task' | 'project' | 'discussion';
  showCreateButton?: boolean;
  compact?: boolean;
}

const ContextCardsSystem: React.FC<ContextCardsSystemProps> = ({
  linkedEntityId,
  linkedEntityType,
  showCreateButton = true,
  compact = false
}) => {
  const [contextCards, setContextCards] = useState<ContextCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedCard, setSelectedCard] = useState<ContextCard | null>(null);
  const [editingCard, setEditingCard] = useState<ContextCard | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');

  const [formData, setFormData] = useState<ContextCardFormData>({
    title: '',
    content: '',
    decision_rationale: '',
    impact_assessment: '',
    context_type: 'DECISION',
    priority: 'MEDIUM',
    tags: [],
    linked_tasks: linkedEntityType === 'task' && linkedEntityId ? [linkedEntityId] : [],
    linked_projects: linkedEntityType === 'project' && linkedEntityId ? [linkedEntityId] : [],
    linked_discussions: linkedEntityType === 'discussion' && linkedEntityId ? [linkedEntityId] : [],
  });

  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    fetchContextCards();
  }, [linkedEntityId, linkedEntityType]);

  const fetchContextCards = async () => {
    try {
      setLoading(true);
      let url = '/context-cards/';
      
      if (linkedEntityId && linkedEntityType) {
        if (linkedEntityType === 'project') {
          url += `?project_id=${linkedEntityId}`;
        } else if (linkedEntityType === 'task') {
          url += `?task_id=${linkedEntityId}`;
        }
      }
      
      const response = await apiClient.get(url);
      setContextCards(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching context cards:', error);
      setContextCards([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Determine project_id (required by backend)
      const projectId = (formData.linked_projects && formData.linked_projects[0]) || (linkedEntityType === 'project' ? linkedEntityId : '');
      if (!projectId) {
        alert('Please select or link a project for this context card.');
        return;
      }
      const taskId = (formData.linked_tasks && formData.linked_tasks[0]) || (linkedEntityType === 'task' ? linkedEntityId : '');
      
      const payload: any = {
        title: formData.title,
        content: formData.content,
        context_type: formData.context_type,
        project_id: projectId,
        task_id: taskId || undefined,
        tags: formData.tags,
        impact_level: 'medium',
        confidence_level: 'medium',
        linked_decisions: [],
        linked_tasks: formData.linked_tasks,
        linked_documents: [],
      };

      if (editingCard) {
        await apiClient.put(`/context-cards/${editingCard.id}`, payload);
      } else {
        await apiClient.post('/context-cards/', payload);
      }
      await fetchContextCards();
      resetForm();
    } catch (error) {
      console.error('Error saving context card:', error);
    }
  };

  const handleEdit = (card: ContextCard) => {
    setEditingCard(card);
    setFormData({
      title: card.title,
      content: card.content,
      decision_rationale: card.decision_rationale,
      impact_assessment: card.impact_assessment,
      context_type: card.context_type,
      priority: card.priority,
      tags: card.tags,
      linked_tasks: card.linked_tasks,
      linked_projects: card.linked_projects,
      linked_discussions: card.linked_discussions,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this context card?')) {
      try {
        await apiClient.delete(`/context-cards/${id}`);
        await fetchContextCards();
      } catch (error) {
        console.error('Error deleting context card:', error);
      }
    }
  };

  const handleArchive = async (id: string, archive: boolean) => {
    try {
      await apiClient.put(`/context-cards/${id}`, { is_archived: archive, is_active: !archive });
      await fetchContextCards();
    } catch (error) {
      console.error('Error archiving context card:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      decision_rationale: '',
      impact_assessment: '',
      context_type: 'DECISION',
      priority: 'MEDIUM',
      tags: [],
      linked_tasks: linkedEntityType === 'task' && linkedEntityId ? [linkedEntityId] : [],
      linked_projects: linkedEntityType === 'project' && linkedEntityId ? [linkedEntityId] : [],
      linked_discussions: linkedEntityType === 'discussion' && linkedEntityId ? [linkedEntityId] : [],
    });
    setEditingCard(null);
    setShowForm(false);
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(tag => tag !== tagToRemove) });
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      DECISION: LightBulbIcon,
      DISCUSSION: ChatBubbleLeftRightIcon,
      INSIGHT: DocumentTextIcon,
      LEARNING: DocumentTextIcon,
      ISSUE: DocumentTextIcon,
      SOLUTION: LightBulbIcon,
    };
    const IconComponent = icons[type as keyof typeof icons] || DocumentTextIcon;
    return <IconComponent className="h-5 w-5" />;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      DECISION: 'bg-blue-100 text-blue-800',
      DISCUSSION: 'bg-green-100 text-green-800',
      INSIGHT: 'bg-purple-100 text-purple-800',
      LEARNING: 'bg-yellow-100 text-yellow-800',
      ISSUE: 'bg-red-100 text-red-800',
      SOLUTION: 'bg-indigo-100 text-indigo-800',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      LOW: 'bg-gray-100 text-gray-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      HIGH: 'bg-orange-100 text-orange-800',
      CRITICAL: 'bg-red-100 text-red-800',
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const filteredCards = contextCards.filter(card => {
    const matchesSearch = 
      card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === 'ALL' || card.context_type === filterType;
    const matchesPriority = filterPriority === 'ALL' || card.priority === filterPriority;
    
    return matchesSearch && matchesType && matchesPriority && !card.is_archived;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {showCreateButton && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full bg-indigo-50 border-2 border-dashed border-indigo-300 rounded-lg p-2 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            Add Context Card
          </button>
        )}
        
        {filteredCards.slice(0, 3).map((card) => (
          <div key={card.id} className="bg-white border rounded-lg p-3 hover:shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {getTypeIcon(card.context_type)}
                  <h4 className="text-sm font-medium text-gray-900">{card.title}</h4>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">{card.content}</p>
                <div className="flex items-center gap-1 mt-2">
                  <span className={`inline-flex px-1.5 py-0.5 text-xs rounded ${getTypeColor(card.context_type)}`}>
                    {card.context_type}
                  </span>
                  {card.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="inline-flex px-1.5 py-0.5 text-xs rounded bg-gray-100 text-gray-700">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedCard(card);
                  setShowDetails(true);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <EyeIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        
        {filteredCards.length > 3 && (
          <div className="text-center">
            <button className="text-sm text-indigo-600 hover:text-indigo-800">
              View all {filteredCards.length} context cards
            </button>
          </div>
        )}

        {/* Form and Details Modals */}
        {(showForm || showDetails) && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              {/* Form and Details content goes here - same as full version */}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Context Cards</h2>
          <p className="text-gray-600">Capture and link the WHY behind decisions and discussions</p>
        </div>
        {showCreateButton && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Create Context Card
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search context cards..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="ALL">All Types</option>
          <option value="DECISION">Decision</option>
          <option value="DISCUSSION">Discussion</option>
          <option value="INSIGHT">Insight</option>
          <option value="LEARNING">Learning</option>
          <option value="ISSUE">Issue</option>
          <option value="SOLUTION">Solution</option>
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="ALL">All Priorities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {/* Context Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCards.map((card) => (
          <div key={card.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  {getTypeIcon(card.context_type)}
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(card.context_type)}`}>
                    {card.context_type}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(card.priority)}`}>
                    {card.priority}
                  </span>
                  {card.auto_captured && (
                    <span className="inline-flex px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                      Auto
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">{card.title}</h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">{card.content}</p>

              {card.decision_rationale && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">Decision Rationale:</p>
                  <p className="text-sm text-gray-700 line-clamp-2">{card.decision_rationale}</p>
                </div>
              )}

              {card.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {card.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="inline-flex px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">
                      {tag}
                    </span>
                  ))}
                  {card.tags.length > 3 && (
                    <span className="inline-flex px-2 py-1 text-xs rounded bg-gray-100 text-gray-500">
                      +{card.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                  <UserIcon className="h-3 w-3" />
                  {card.created_by_name}
                </div>
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  {new Date(card.created_at).toLocaleDateString()}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {(card.linked_tasks.length + card.linked_projects.length + card.linked_discussions.length) > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-indigo-600">
                      <LinkIcon className="h-3 w-3" />
                      {card.linked_tasks.length + card.linked_projects.length + card.linked_discussions.length} linked
                    </span>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedCard(card);
                      setShowDetails(true);
                    }}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(card)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(card.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCards.length === 0 && (
        <div className="text-center py-12">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No context cards</h3>
          <p className="mt-1 text-sm text-gray-500">
            Start capturing the WHY behind your decisions and discussions.
          </p>
          {showCreateButton && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Create Your First Context Card
            </button>
          )}
        </div>
      )}

      {/* Context Card Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingCard ? 'Edit Context Card' : 'Create New Context Card'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Context Type *
                  </label>
                  <select
                    required
                    value={formData.context_type}
                    onChange={(e) => setFormData({ ...formData, context_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="DECISION">Decision</option>
                    <option value="DISCUSSION">Discussion</option>
                    <option value="INSIGHT">Insight</option>
                    <option value="LEARNING">Learning</option>
                    <option value="ISSUE">Issue</option>
                    <option value="SOLUTION">Solution</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content *
                </label>
                <textarea
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Describe the context, background, or main content..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Decision Rationale / Why
                </label>
                <textarea
                  value={formData.decision_rationale}
                  onChange={(e) => setFormData({ ...formData, decision_rationale: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Explain the reasoning, factors considered, alternatives evaluated..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Impact Assessment
                </label>
                <textarea
                  value={formData.impact_assessment}
                  onChange={(e) => setFormData({ ...formData, impact_assessment: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Expected impact, risks, benefits, affected areas..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Add a tag..."
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="bg-gray-100 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-200"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {formData.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-indigo-100 text-indigo-700">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-indigo-500 hover:text-indigo-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  {editingCard ? 'Update' : 'Create'} Context Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Context Card Details Modal */}
      {showDetails && selectedCard && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  {getTypeIcon(selectedCard.context_type)}
                  <h3 className="text-xl font-semibold text-gray-900">{selectedCard.title}</h3>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(selectedCard.context_type)}`}>
                    {selectedCard.context_type}
                  </span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(selectedCard.priority)}`}>
                    {selectedCard.priority}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  Created by {selectedCard.created_by_name} on {new Date(selectedCard.created_at).toLocaleDateString()}
                  {selectedCard.auto_captured && (
                    <span className="ml-2 inline-flex px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                      Auto-captured from {selectedCard.capture_source}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Content</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedCard.content}</p>
              </div>

              {selectedCard.decision_rationale && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Decision Rationale / Why</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedCard.decision_rationale}</p>
                </div>
              )}

              {selectedCard.impact_assessment && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Impact Assessment</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedCard.impact_assessment}</p>
                </div>
              )}

              {selectedCard.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedCard.tags.map(tag => (
                      <span key={tag} className="inline-flex px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(selectedCard.linked_tasks.length > 0 || selectedCard.linked_projects.length > 0 || selectedCard.linked_discussions.length > 0) && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Linked Items</h4>
                  <div className="space-y-2">
                    {selectedCard.linked_tasks.length > 0 && (
                      <div>
                        <span className="text-xs text-gray-500">Tasks:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedCard.linked_tasks.map(taskId => (
                            <span key={taskId} className="inline-flex px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">
                              Task {taskId}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedCard.linked_projects.length > 0 && (
                      <div>
                        <span className="text-xs text-gray-500">Projects:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedCard.linked_projects.map(projectId => (
                            <span key={projectId} className="inline-flex px-2 py-1 text-xs rounded bg-green-100 text-green-700">
                              Project {projectId}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedCard.linked_discussions.length > 0 && (
                      <div>
                        <span className="text-xs text-gray-500">Discussions:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedCard.linked_discussions.map(discussionId => (
                            <span key={discussionId} className="inline-flex px-2 py-1 text-xs rounded bg-purple-100 text-purple-700">
                              Discussion {discussionId}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                onClick={() => handleEdit(selectedCard)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Edit
              </button>
              <button
                onClick={() => setShowDetails(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContextCardsSystem;
