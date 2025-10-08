import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import {
  LightBulbIcon,
  DocumentTextIcon,
  LinkIcon,
  SparklesIcon,
  EyeIcon,
  StarIcon,
  ClockIcon,
  TagIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';

interface KnowledgeItem {
  id: string;
  title: string;
  summary?: string;
  content_preview?: string;
  knowledge_type?: string;
  context_type?: string;
  impact_level?: string;
  relevance_score: number;
  view_count?: number;
  auto_captured?: boolean;
  decision_date?: string;
  created_at?: string;
}

interface KnowledgeSuggestions {
  articles: KnowledgeItem[];
  context_cards: KnowledgeItem[];
  decisions: KnowledgeItem[];
}

interface KnowledgeIntegrationWidgetProps {
  entityId: string;
  entityType: 'task' | 'project';
  showAutoCapture?: boolean;
  compact?: boolean;
}

const KnowledgeIntegrationWidget: React.FC<KnowledgeIntegrationWidgetProps> = ({
  entityId,
  entityType,
  showAutoCapture = true,
  compact = false
}) => {
  const [suggestions, setSuggestions] = useState<KnowledgeSuggestions>({
    articles: [],
    context_cards: [],
    decisions: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'articles' | 'context' | 'decisions'>('all');
  const [showDetails, setShowDetails] = useState<{ id: string; type: 'article' | 'context_card' | 'decision' } | null>(null);
  const [autoLinkEnabled, setAutoLinkEnabled] = useState(true);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    fetchKnowledgeSuggestions();
  }, [entityId, entityType]);

  const fetchKnowledgeSuggestions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(
        `/knowledge-integration/suggest-knowledge-for-${entityType}/${entityId}`
      );
      setSuggestions(response.data);
    } catch (error) {
      console.error('Error fetching knowledge suggestions:', error);
      setSuggestions({ articles: [], context_cards: [], decisions: [] });
    } finally {
      setLoading(false);
    }
  };

  const autoLinkKnowledge = async () => {
    try {
      setLinking(true);
      const response = await apiClient.post(
        `/knowledge-integration/auto-link-${entityType}-to-knowledge`,
        {
          [`${entityType}_id`]: entityId
        }
      );
      
      // Refresh suggestions after auto-linking
      await fetchKnowledgeSuggestions();
      
      // Show success message
      console.log(`Auto-linked ${response.data.length} knowledge items`);
    } catch (error) {
      console.error('Error auto-linking knowledge:', error);
    } finally {
      setLinking(false);
    }
  };

  const analyzeContentForCapture = async (content: string) => {
    try {
      await apiClient.post('/smart-notifications/auto-capture/analyze-content', {
        content,
        context_type: 'discussion',
        entity_id: entityId,
        entity_type: entityType
      });
    } catch (error) {
      console.error('Error analyzing content for capture:', error);
    }
  };

  const getAllSuggestions = () => {
    const all = [
      ...suggestions.articles.map(item => ({ ...item, type: 'article' })),
      ...suggestions.context_cards.map(item => ({ ...item, type: 'context_card' })),
      ...suggestions.decisions.map(item => ({ ...item, type: 'decision' }))
    ];
    return all.sort((a, b) => b.relevance_score - a.relevance_score);
  };

  const getFilteredSuggestions = () => {
    switch (activeTab) {
      case 'articles':
        return suggestions.articles.map(item => ({ ...item, type: 'article' }));
      case 'context':
        return suggestions.context_cards.map(item => ({ ...item, type: 'context_card' }));
      case 'decisions':
        return suggestions.decisions.map(item => ({ ...item, type: 'decision' }));
      default:
        return getAllSuggestions();
    }
  };

  const getItemIcon = (type: string) => {
    const icons = {
      article: BookOpenIcon,
      context_card: LightBulbIcon,
      decision: DocumentTextIcon
    };
    const IconComponent = icons[type as keyof typeof icons] || DocumentTextIcon;
    return <IconComponent className="h-4 w-4" />;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      article: 'bg-blue-100 text-blue-800',
      context_card: 'bg-purple-100 text-purple-800',
      decision: 'bg-green-100 text-green-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const formatScore = (score: number) => Math.round(score * 100);

  const totalSuggestions = suggestions.articles.length + suggestions.context_cards.length + suggestions.decisions.length;

  if (compact) {
    return (
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-indigo-600" />
            <h3 className="text-sm font-medium text-gray-900">
              Knowledge Suggestions
            </h3>
            {totalSuggestions > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800">
                {totalSuggestions}
              </span>
            )}
          </div>
          {autoLinkEnabled && totalSuggestions > 0 && (
            <button
              onClick={autoLinkKnowledge}
              disabled={linking}
              className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {linking ? 'Linking...' : 'Auto-Link'}
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
          </div>
        ) : totalSuggestions === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No relevant knowledge found
          </p>
        ) : (
          <div className="space-y-2">
            {getAllSuggestions().slice(0, 3).map((item) => (
              <div key={`${item.type}-${item.id}`} className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                <div className="flex-shrink-0 mt-0.5">
                  {getItemIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex px-1.5 py-0.5 text-xs rounded ${getTypeColor(item.type)}`}>
                      {item.type.replace('_', ' ')}
                    </span>
                    <span className={`text-xs ${getRelevanceColor(item.relevance_score)}`}>
                      {formatScore(item.relevance_score)}% match
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {totalSuggestions > 3 && (
              <p className="text-xs text-center text-gray-500 pt-2">
                +{totalSuggestions - 3} more suggestions
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SparklesIcon className="h-6 w-6 text-indigo-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Knowledge Integration</h2>
              <p className="text-sm text-gray-600">
                AI-powered suggestions for relevant knowledge and context
              </p>
            </div>
          </div>
          {autoLinkEnabled && totalSuggestions > 0 && (
            <button
              onClick={autoLinkKnowledge}
              disabled={linking}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {linking ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Linking...
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4" />
                  Auto-Link All
                </>
              )}
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
          <span>{suggestions.articles.length} articles</span>
          <span>{suggestions.context_cards.length} context cards</span>
          <span>{suggestions.decisions.length} decisions</span>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mt-4">
          {[
            { key: 'all', label: 'All', count: totalSuggestions },
            { key: 'articles', label: 'Articles', count: suggestions.articles.length },
            { key: 'context', label: 'Context', count: suggestions.context_cards.length },
            { key: 'decisions', label: 'Decisions', count: suggestions.decisions.length }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`rounded-md px-3 py-1 text-sm font-medium flex items-center gap-1 ${
                activeTab === tab.key
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key
                    ? 'bg-indigo-200 text-indigo-800'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : totalSuggestions === 0 ? (
          <div className="text-center py-12">
            <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No knowledge found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No relevant knowledge items were found for this {entityType}.
            </p>
            {showAutoCapture && (
              <p className="mt-2 text-xs text-gray-500">
                Start adding context by creating tasks, decisions, or discussions.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {getFilteredSuggestions().map((item) => (
              <KnowledgeItemCard
                key={`${item.type}-${item.id}`}
                item={item}
                onViewDetails={(id, type) => setShowDetails({ id, type: type as any })}
                onLink={() => {/* Handle individual linking */}}
              />
            ))}
          </div>
        )}
      </div>

      {/* Knowledge Item Details Modal */}
      {showDetails && (
        <KnowledgeDetailsModal
          itemId={showDetails.id}
          itemType={showDetails.type}
          onClose={() => setShowDetails(null)}
        />
      )}
    </div>
  );
};

interface KnowledgeItemCardProps {
  item: KnowledgeItem & { type: string };
  onViewDetails: (id: string, type: string) => void;
  onLink: () => void;
}

const KnowledgeItemCard: React.FC<KnowledgeItemCardProps> = ({
  item,
  onViewDetails,
  onLink
}) => {
  const getTypeIcon = (type: string) => {
    const icons = {
      article: BookOpenIcon,
      context_card: LightBulbIcon,
      decision: DocumentTextIcon
    };
    const IconComponent = icons[type as keyof typeof icons] || DocumentTextIcon;
    return <IconComponent className="h-5 w-5" />;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      article: 'bg-blue-100 text-blue-800',
      context_card: 'bg-purple-100 text-purple-800',
      decision: 'bg-green-100 text-green-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          {getTypeIcon(item.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                {item.title}
              </h3>
              
              {(item.summary || item.content_preview) && (
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {item.summary || item.content_preview}
                </p>
              )}
              
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getTypeColor(item.type)}`}>
                  {item.type.replace('_', ' ')}
                </span>
                
                <div className="flex items-center gap-1">
                  <StarIcon className="h-3 w-3 text-yellow-400" />
                  <span className={`text-xs ${getRelevanceColor(item.relevance_score)}`}>
                    {Math.round(item.relevance_score * 100)}% relevant
                  </span>
                </div>
                
                {item.view_count && (
                  <div className="flex items-center gap-1">
                    <EyeIcon className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">{item.view_count} views</span>
                  </div>
                )}
                
                {item.auto_captured && (
                  <span className="inline-flex px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                    Auto-captured
                  </span>
                )}
                
                {item.decision_date && (
                  <div className="flex items-center gap-1">
                    <ClockIcon className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {new Date(item.decision_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
              
              {item.impact_level && (
                <div className="mt-2">
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                    item.impact_level === 'HIGH' || item.impact_level === 'CRITICAL'
                      ? 'bg-red-100 text-red-800'
                      : item.impact_level === 'MEDIUM'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {item.impact_level} impact
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1 ml-3">
              <button
                onClick={() => onViewDetails(item.id, item.type)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                title="View details"
              >
                <EyeIcon className="h-4 w-4" />
              </button>
              
              <button
                onClick={onLink}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                title="Link to this item"
              >
                <LinkIcon className="h-4 w-4" />
              </button>
              
              <button
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                title="Open in new tab"
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface KnowledgeDetailsModalProps {
  itemId: string;
  itemType: 'article' | 'context_card' | 'decision';
  onClose: () => void;
}

const KnowledgeDetailsModal: React.FC<KnowledgeDetailsModalProps> = ({
  itemId,
  itemType,
  onClose
}) => {
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItemDetails();
  }, [itemId, itemType]);

  const fetchItemDetails = async () => {
    try {
      setLoading(true);
      let response;
      if (itemType === 'article') {
        response = await apiClient.get(`/knowledge/articles/${itemId}`);
      } else if (itemType === 'context_card') {
        response = await apiClient.get(`/context-cards/${itemId}`);
      } else {
        response = await apiClient.get(`/decision-logs/${itemId}`);
      }
      setItem(response.data);
    } catch (error) {
      console.error('Error fetching item details:', error);
      setItem(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-medium text-gray-900">Knowledge Item Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {!item ? (
              <div className="text-center text-gray-500 py-8">Item not found.</div>
            ) : itemType === 'article' ? (
              <div className="space-y-2">
                <h4 className="text-xl font-semibold text-gray-900">{item.title}</h4>
                {item.summary && <p className="text-gray-600">{item.summary}</p>}
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <span>{item.author_name || 'Unknown author'}</span>
                  <span>•</span>
                  <span>{item.estimated_read_time} min read</span>
                </div>
                <div className="prose prose-sm max-w-none mt-2">
                  <pre className="whitespace-pre-wrap text-gray-800">{item.content}</pre>
                </div>
              </div>
            ) : itemType === 'context_card' ? (
              <div className="space-y-2">
                <h4 className="text-xl font-semibold text-gray-900">{item.title}</h4>
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <span>{item.context_type}</span>
                  {item.impact_level && (
                    <>
                      <span>•</span>
                      <span>{item.impact_level} impact</span>
                    </>
                  )}
                  {item.created_by_name && (
                    <>
                      <span>•</span>
                      <span>By {item.created_by_name}</span>
                    </>
                  )}
                </div>
                <div className="prose prose-sm max-w-none mt-2">
                  <pre className="whitespace-pre-wrap text-gray-800">{item.content}</pre>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <h4 className="text-xl font-semibold text-gray-900">{item.title}</h4>
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  {item.status && <span>Status: {item.status}</span>}
                  {item.category && (
                    <>
                      <span>•</span>
                      <span>Category: {item.category}</span>
                    </>
                  )}
                  {item.decision_maker_name && (
                    <>
                      <span>•</span>
                      <span>By {item.decision_maker_name}</span>
                    </>
                  )}
                </div>
                <div className="prose prose-sm max-w-none mt-2 space-y-3">
                  {item.description && (
                    <div>
                      <h5 className="font-medium text-gray-900">Description</h5>
                      <p className="whitespace-pre-wrap text-gray-800 text-sm">{item.description}</p>
                    </div>
                  )}
                  {item.rationale && (
                    <div>
                      <h5 className="font-medium text-gray-900">Rationale</h5>
                      <p className="whitespace-pre-wrap text-gray-800 text-sm">{item.rationale}</p>
                    </div>
                  )}
                  {item.problem_statement && (
                    <div>
                      <h5 className="font-medium text-gray-900">Problem Statement</h5>
                      <p className="whitespace-pre-wrap text-gray-800 text-sm">{item.problem_statement}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeIntegrationWidget;
