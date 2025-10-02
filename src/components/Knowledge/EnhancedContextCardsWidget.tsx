import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import {
  LightBulbIcon,
  SparklesIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  BeakerIcon,
  BugAntIcon,
  CogIcon,
  TagIcon,
  CalendarIcon,
  UserIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  XMarkIcon
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
  capture_source?: string;
  trigger_event?: string;
  extraction_keywords: string[];
  sentiment_score?: number;
  decision_indicators: string[];
  auto_review_needed: boolean;
  confidence_score: number;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
}

interface EnhancedContextCardsWidgetProps {
  linkedEntityId?: string;
  linkedEntityType?: 'task' | 'project' | 'discussion';
  showAutoCapture?: boolean;
  onContentAnalyze?: (content: string) => void;
  compact?: boolean;
}

const EnhancedContextCardsWidget: React.FC<EnhancedContextCardsWidgetProps> = ({
  linkedEntityId,
  linkedEntityType,
  showAutoCapture = true,
  onContentAnalyze,
  compact = false
}) => {
  const [contextCards, setContextCards] = useState<ContextCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedCard, setSelectedCard] = useState<ContextCard | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterSource, setFilterSource] = useState<string>('ALL');
  const [showAutoCaptured, setShowAutoCaptured] = useState(true);
  const [pendingReview, setPendingReview] = useState<ContextCard[]>([]);

  useEffect(() => {
    fetchContextCards();
    if (showAutoCapture) {
      fetchPendingReview();
    }
  }, [linkedEntityId, linkedEntityType]);

  const fetchContextCards = async () => {
    try {
      setLoading(true);
      let url = '/context-cards/';
      
      if (linkedEntityId && linkedEntityType) {
        url += `?linked_${linkedEntityType}=${linkedEntityId}`;
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

  const fetchPendingReview = async () => {
    try {
      const response = await apiClient.get('/context-cards/?needs_review=true');
      setPendingReview(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching pending review cards:', error);
      setPendingReview([]);
    }
  };

  const approveAutoCapture = async (cardId: string) => {
    try {
      await apiClient.patch(`/context-cards/${cardId}/approve-auto-capture`);
      await fetchContextCards();
      await fetchPendingReview();
    } catch (error) {
      console.error('Error approving auto-capture:', error);
    }
  };

  const rejectAutoCapture = async (cardId: string) => {
    try {
      await apiClient.patch(`/context-cards/${cardId}/reject-auto-capture`);
      await fetchContextCards();
      await fetchPendingReview();
    } catch (error) {
      console.error('Error rejecting auto-capture:', error);
    }
  };

  const triggerContentAnalysis = async (content: string) => {
    if (!content.trim()) return;
    
    try {
      await apiClient.post('/smart-notifications/auto-capture/analyze-content', {
        content,
        context_type: 'discussion',
        entity_id: linkedEntityId,
        entity_type: linkedEntityType
      });
      
      // Refresh pending review
      setTimeout(() => {
        fetchPendingReview();
      }, 2000); // Give some time for background processing
      
    } catch (error) {
      console.error('Error analyzing content:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      DECISION: LightBulbIcon,
      DISCUSSION: ChatBubbleLeftRightIcon,
      INSIGHT: DocumentTextIcon,
      LEARNING: BeakerIcon,
      ISSUE: BugAntIcon,
      SOLUTION: CogIcon,
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

  const getSentimentColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score > 0.3) return 'text-green-600';
    if (score < -0.3) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getSentimentLabel = (score?: number) => {
    if (!score) return 'Neutral';
    if (score > 0.3) return 'Positive';
    if (score < -0.3) return 'Negative';
    return 'Neutral';
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredCards = contextCards.filter(card => {
    const matchesSearch = 
      card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === 'ALL' || card.context_type === filterType;
    
    const matchesSource = filterSource === 'ALL' || 
      (filterSource === 'AUTO' && card.auto_captured) ||
      (filterSource === 'MANUAL' && !card.auto_captured);
    
    const matchesAutoFilter = showAutoCaptured || !card.auto_captured;
    
    return matchesSearch && matchesType && matchesSource && matchesAutoFilter && !card.is_archived;
  });

  if (compact) {
    return (
      <div className="space-y-3">
        {/* Pending Review Section */}
        {showAutoCapture && pendingReview.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />
              <h4 className="text-sm font-medium text-yellow-800">
                Auto-captured Context Needs Review ({pendingReview.length})
              </h4>
            </div>
            {pendingReview.slice(0, 2).map((card) => (
              <AutoCaptureReviewCard
                key={card.id}
                card={card}
                onApprove={() => approveAutoCapture(card.id)}
                onReject={() => rejectAutoCapture(card.id)}
                compact
              />
            ))}
          </div>
        )}

        {/* Context Cards Preview */}
        <div className="bg-white border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-900">Context Cards</h3>
            {filteredCards.length > 0 && (
              <span className="text-xs text-gray-500">{filteredCards.length} cards</span>
            )}
          </div>
          
          {filteredCards.slice(0, 3).map((card) => (
            <div key={card.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded mb-2 last:mb-0">
              <div className="flex-shrink-0 mt-0.5">
                {getTypeIcon(card.context_type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{card.title}</p>
                <p className="text-xs text-gray-600 line-clamp-1">{card.content}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className={`inline-flex px-1.5 py-0.5 text-xs rounded ${getTypeColor(card.context_type)}`}>
                    {card.context_type}
                  </span>
                  {card.auto_captured && (
                    <span className="inline-flex px-1.5 py-0.5 text-xs rounded bg-green-100 text-green-700">
                      Auto
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {filteredCards.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">No context cards found</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Enhanced Context Cards</h2>
          <p className="text-gray-600">
            AI-powered context capture with automatic WHY detection
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Create Context Card
        </button>
      </div>

      {/* Pending Review Section */}
      {showAutoCapture && pendingReview.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
            <h3 className="text-lg font-medium text-yellow-800">
              Auto-captured Context Needs Review ({pendingReview.length})
            </h3>
          </div>
          <div className="space-y-3">
            {pendingReview.map((card) => (
              <AutoCaptureReviewCard
                key={card.id}
                card={card}
                onApprove={() => approveAutoCapture(card.id)}
                onReject={() => rejectAutoCapture(card.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Auto-capture Analysis */}
      {showAutoCapture && onContentAnalyze && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <SparklesIcon className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-medium text-indigo-800">
              AI Content Analysis
            </h3>
          </div>
          <ContentAnalysisBox onAnalyze={triggerContentAnalysis} />
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 items-center">
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
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="ALL">All Sources</option>
          <option value="AUTO">Auto-captured</option>
          <option value="MANUAL">Manual</option>
        </select>
      </div>

      {/* Context Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCards.map((card) => (
          <EnhancedContextCardItem
            key={card.id}
            card={card}
            onViewDetails={(card) => {
              setSelectedCard(card);
              setShowDetails(true);
            }}
          />
        ))}
      </div>

      {filteredCards.length === 0 && !loading && (
        <div className="text-center py-12">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No context cards</h3>
          <p className="mt-1 text-sm text-gray-500">
            Start capturing context by creating cards manually or let AI auto-capture from discussions.
          </p>
        </div>
      )}

      {/* Context Card Details Modal */}
      {showDetails && selectedCard && (
        <ContextCardDetailsModal
          card={selectedCard}
          onClose={() => setShowDetails(false)}
        />
      )}
    </div>
  );
};

interface AutoCaptureReviewCardProps {
  card: ContextCard;
  onApprove: () => void;
  onReject: () => void;
  compact?: boolean;
}

const AutoCaptureReviewCard: React.FC<AutoCaptureReviewCardProps> = ({
  card,
  onApprove,
  onReject,
  compact = false
}) => {
  return (
    <div className={`bg-white border rounded-lg ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className={`font-medium text-gray-900 ${compact ? 'text-sm' : 'text-base'}`}>
            {card.title}
          </h4>
          <p className={`text-gray-600 mt-1 ${compact ? 'text-xs line-clamp-2' : 'text-sm line-clamp-3'}`}>
            {card.content}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex px-2 py-1 text-xs rounded bg-purple-100 text-purple-700">
          AI Confidence: {Math.round(card.confidence_score * 100)}%
        </span>
        <span className="inline-flex px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">
          {card.capture_source}
        </span>
      </div>
      
      {card.decision_indicators.length > 0 && !compact && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1">Decision indicators found:</p>
          <div className="flex flex-wrap gap-1">
            {card.decision_indicators.slice(0, 3).map((indicator, index) => (
              <span key={index} className="inline-flex px-1.5 py-0.5 text-xs rounded bg-green-100 text-green-700">
                {indicator}
              </span>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex justify-end gap-2">
        <button
          onClick={onReject}
          className="px-3 py-1 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
        >
          Reject
        </button>
        <button
          onClick={onApprove}
          className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
        >
          Approve
        </button>
      </div>
    </div>
  );
};

interface ContentAnalysisBoxProps {
  onAnalyze: (content: string) => void;
}

const ContentAnalysisBox: React.FC<ContentAnalysisBoxProps> = ({ onAnalyze }) => {
  const [content, setContent] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!content.trim()) return;
    
    setAnalyzing(true);
    try {
      await onAnalyze(content);
      setContent('');
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Paste content here for AI analysis to auto-capture decision context..."
        rows={4}
        className="w-full px-3 py-2 border border-indigo-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
      />
      <div className="flex justify-between items-center">
        <p className="text-sm text-indigo-600">
          AI will analyze for decision keywords, rationale, and context
        </p>
        <button
          onClick={handleAnalyze}
          disabled={!content.trim() || analyzing}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
        >
          {analyzing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Analyzing...
            </>
          ) : (
            <>
              <SparklesIcon className="h-4 w-4" />
              Analyze Content
            </>
          )}
        </button>
      </div>
    </div>
  );
};

interface EnhancedContextCardItemProps {
  card: ContextCard;
  onViewDetails: (card: ContextCard) => void;
}

const EnhancedContextCardItem: React.FC<EnhancedContextCardItemProps> = ({
  card,
  onViewDetails
}) => {
  const getTypeIcon = (type: string) => {
    const icons = {
      DECISION: LightBulbIcon,
      DISCUSSION: ChatBubbleLeftRightIcon,
      INSIGHT: DocumentTextIcon,
      LEARNING: BeakerIcon,
      ISSUE: BugAntIcon,
      SOLUTION: CogIcon,
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

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow border">
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
                AI
              </span>
            )}
          </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2">{card.title}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">{card.content}</p>

        {card.decision_rationale && (
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-500 mb-1">WHY:</p>
            <p className="text-sm text-gray-700 line-clamp-2">{card.decision_rationale}</p>
          </div>
        )}

        {card.auto_captured && (
          <div className="bg-indigo-50 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <SparklesIcon className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-800">AI Analysis</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-indigo-600">Confidence:</span>
                <span className="font-medium text-indigo-800">
                  {Math.round(card.confidence_score * 100)}%
                </span>
              </div>
              {card.sentiment_score !== undefined && (
                <div className="flex justify-between">
                  <span className="text-indigo-600">Sentiment:</span>
                  <span className={`font-medium ${
                    card.sentiment_score > 0 ? 'text-green-600' : 
                    card.sentiment_score < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {card.sentiment_score > 0.3 ? 'Positive' : 
                     card.sentiment_score < -0.3 ? 'Negative' : 'Neutral'}
                  </span>
                </div>
              )}
            </div>
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
          <button
            onClick={() => onViewDetails(card)}
            className="text-blue-600 hover:text-blue-900"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface ContextCardDetailsModalProps {
  card: ContextCard;
  onClose: () => void;
}

const ContextCardDetailsModal: React.FC<ContextCardDetailsModalProps> = ({
  card,
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{card.title}</h3>
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                card.context_type === 'DECISION' ? 'bg-blue-100 text-blue-800' :
                card.context_type === 'DISCUSSION' ? 'bg-green-100 text-green-800' :
                card.context_type === 'INSIGHT' ? 'bg-purple-100 text-purple-800' :
                card.context_type === 'LEARNING' ? 'bg-yellow-100 text-yellow-800' :
                card.context_type === 'ISSUE' ? 'bg-red-100 text-red-800' :
                'bg-indigo-100 text-indigo-800'
              }`}>
                {card.context_type}
              </span>
              {card.auto_captured && (
                <span className="inline-flex px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                  Auto-captured from {card.capture_source}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Content</h4>
            <p className="text-gray-700 whitespace-pre-wrap">{card.content}</p>
          </div>

          {card.decision_rationale && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Decision Rationale / WHY</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{card.decision_rationale}</p>
            </div>
          )}

          {card.impact_assessment && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Impact Assessment</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{card.impact_assessment}</p>
            </div>
          )}

          {card.auto_captured && (
            <div className="bg-indigo-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-indigo-900 mb-3">AI Analysis Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-indigo-600 font-medium">Confidence Score:</span>
                  <span className="ml-2">{Math.round(card.confidence_score * 100)}%</span>
                </div>
                <div>
                  <span className="text-indigo-600 font-medium">Trigger Event:</span>
                  <span className="ml-2">{card.trigger_event}</span>
                </div>
              </div>
              
              {card.extraction_keywords.length > 0 && (
                <div className="mt-3">
                  <span className="text-indigo-600 font-medium text-sm">Keywords:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {card.extraction_keywords.map((keyword, index) => (
                      <span key={index} className="inline-flex px-2 py-1 text-xs rounded bg-indigo-100 text-indigo-700">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {card.tags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Tags</h4>
              <div className="flex flex-wrap gap-1">
                {card.tags.map(tag => (
                  <span key={tag} className="inline-flex px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedContextCardsWidget;
