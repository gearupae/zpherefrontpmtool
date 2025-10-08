import React, { useState, useEffect, useCallback } from 'react';
import {
  DocumentTextIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  BookOpenIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
  TagIcon,
  EyeIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import ContextCardsSystem from '../../components/Knowledge/ContextCardsSystem';
import DecisionLogSystem from '../../components/Knowledge/DecisionLogSystem';
import { useAppDispatch } from '../../hooks/redux';
import { addNotification } from '../../store/slices/notificationSlice';
// API client will be imported dynamically

interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  summary?: string;
  knowledge_type: string;
  status: string;
  category?: string;
  tags: string[];
  keywords: string[];
  difficulty_level: string;
  estimated_read_time: number;
  author_name?: string;
  project_name?: string;
  view_count: number;
  helpful_votes: number;
  not_helpful_votes: number;
  helpfulness_score?: number;
  created_at: string;
  updated_at: string;
}

interface ContextCard {
  id: string;
  title: string;
  content: string;
  context_type: string;
  impact_level: string;
  confidence_level: string;
  created_by_name?: string;
  project_name?: string;
  task_title?: string;
  created_at: string;
}

interface DecisionLog {
  id: string;
  title: string;
  description: string;
  decision_number: number;
  status: string;
  category: string;
  impact_level: string;
  decision_maker_name?: string;
  project_name?: string;
  created_at: string;
}

const KnowledgeHubPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<'articles' | 'context' | 'decisions'>('articles');
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [contextCards, setContextCards] = useState<ContextCard[]>([]);
  const [decisions, setDecisions] = useState<DecisionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');

  // Create article modal state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [viewArticleId, setViewArticleId] = useState<string | null>(null);
  const [viewArticle, setViewArticle] = useState<KnowledgeArticle | null>(null);
  const [newArticle, setNewArticle] = useState({
    title: '',
    content: '',
    summary: '',
    knowledge_type: 'documentation',
    category: '',
    tags: [] as string[],
    is_public: false,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { default: apiClient } = await import('../../api/client');
      switch (activeTab) {
        case 'articles':
          const articlesResponse = await apiClient.get('/knowledge/articles/');
          setArticles(articlesResponse.data);
          break;
        case 'context':
          const contextResponse = await apiClient.get('/context-cards/');
          setContextCards(contextResponse.data);
          break;
        case 'decisions':
          const decisionsResponse = await apiClient.get('/decision-logs/');
          setDecisions(decisionsResponse.data);
          break;
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'documentation':
        return <DocumentTextIcon className="h-5 w-5 text-blue-500" />;
      case 'tutorial':
        return <BookOpenIcon className="h-5 w-5 text-green-500" />;
      case 'best_practice':
        return <LightBulbIcon className="h-5 w-5 text-yellow-500" />;
      case 'troubleshooting':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'process':
        return <ClipboardDocumentListIcon className="h-5 w-5 text-purple-500" />;
      default:
        return <DocumentTextIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getImpactColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (filterType === '' || article.knowledge_type === filterType)
  );

  const filteredContextCards = contextCards.filter(card =>
    card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (filterType === '' || card.context_type === filterType)
  );

  const filteredDecisions = decisions.filter(decision =>
    decision.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    decision.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (filterType === '' || decision.category === filterType)
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Knowledge Hub</h1>
            <p className="mt-2 text-gray-600">
              Centralized repository for organizational knowledge, decisions, and context
            </p>
          </div>
          <button
            className="btn-page-action inline-flex items-center"
            onClick={() => setShowCreate(true)}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Article
          </button>
        </div>
      </div>

      {/* Create Article Modal */}
      {showCreate && (
        <CreateArticleModal
          values={newArticle}
          creating={creating}
          onChange={setNewArticle}
          onClose={() => setShowCreate(false)}
          onCreate={async () => {
            try {
              setCreating(true);
              const { default: apiClient } = await import('../../api/client');
              const payload = {
                ...newArticle,
                tags: newArticle.tags,
              } as any;
              const resp = await apiClient.post('/knowledge/articles/', payload);
              // Optimistically prepend the new article so it appears instantly
              if (resp && resp.data) {
                setArticles(prev => [resp.data, ...prev]);
              }
              setShowCreate(false);
              setNewArticle({ title: '', content: '', summary: '', knowledge_type: 'documentation', category: '', tags: [], is_public: false });
              // Refresh list in background to ensure consistency
              if (activeTab !== 'articles') setActiveTab('articles');
              await fetchData();
            } catch (e: any) {
              console.error('Failed to create article', e);
              const message = e?.response?.data?.detail || e?.message || 'Failed to create knowledge article';
              dispatch(addNotification({
                type: 'error',
                title: 'Create failed',
                message,
                duration: 5000,
              }));
            } finally {
              setCreating(false);
            }
          }}
        />
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('articles')}
            className={`whitespace-nowrap py-2 px-3 font-medium text-sm rounded-md transition-colors focus:outline-none focus:ring-0 ${
              activeTab === 'articles' ? 'text-indigo-600' : 'text-black hover:text-gray-700'
            }`}
          >
            <DocumentTextIcon className="h-5 w-5 inline mr-2" />
            Knowledge Articles
          </button>
          <button
            onClick={() => setActiveTab('context')}
            className={`whitespace-nowrap py-2 px-3 font-medium text-sm rounded-md transition-colors focus:outline-none focus:ring-0 ${
              activeTab === 'context' ? 'text-indigo-600' : 'text-black hover:text-gray-700'
            }`}
          >
            <LightBulbIcon className="h-5 w-5 inline mr-2" />
            Context Cards
          </button>
          <button
            onClick={() => setActiveTab('decisions')}
            className={`whitespace-nowrap py-2 px-3 font-medium text-sm rounded-md transition-colors focus:outline-none focus:ring-0 ${
              activeTab === 'decisions' ? 'text-indigo-600' : 'text-black hover:text-gray-700'
            }`}
          >
            <ClipboardDocumentListIcon className="h-5 w-5 inline mr-2" />
            Decision Log
          </button>
        </nav>
      </div>

      {/* Search and Filter */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="relative">
            <FunnelIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              {activeTab === 'articles' && (
                <>
                  <option value="documentation">Documentation</option>
                  <option value="tutorial">Tutorial</option>
                  <option value="best_practice">Best Practice</option>
                  <option value="troubleshooting">Troubleshooting</option>
                </>
              )}
              {activeTab === 'context' && (
                <>
                  <option value="decision">Decision</option>
                  <option value="rationale">Rationale</option>
                  <option value="assumption">Assumption</option>
                  <option value="risk">Risk</option>
                </>
              )}
              {activeTab === 'decisions' && (
                <>
                  <option value="technical">Technical</option>
                  <option value="business">Business</option>
                  <option value="process">Process</option>
                  <option value="architectural">Architectural</option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Knowledge Articles */}
          {activeTab === 'articles' && (
            <div className="grid gap-4">
              {filteredArticles.length === 0 ? (
                <div className="text-center py-12">
                  <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No articles found</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating your first knowledge article.</p>
                </div>
              ) : (
                filteredArticles.map((article) => (
                  <div key={article.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getTypeIcon(article.knowledge_type)}
                          <h3 className="text-lg font-semibold text-gray-900">{article.title}</h3>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            article.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {article.status}
                          </span>
                        </div>
                        {article.summary && (
                          <p className="text-gray-600 mb-3">{article.summary}</p>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>By {article.author_name || 'Unknown'}</span>
                          <span>•</span>
                          <span>{article.estimated_read_time} min read</span>
                          <span>•</span>
                          <div className="flex items-center space-x-1">
                            <EyeIcon className="h-4 w-4" />
                            <span>{article.view_count}</span>
                          </div>
                          <span>•</span>
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center space-x-1">
                              <HandThumbUpIcon className="h-4 w-4 text-green-500" />
                              <span>{article.helpful_votes}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <HandThumbDownIcon className="h-4 w-4 text-red-500" />
                              <span>{article.not_helpful_votes}</span>
                            </div>
                          </div>
                        </div>
                        {article.tags.length > 0 && (
                          <div className="flex items-center mt-3 space-x-2">
                            <TagIcon className="h-4 w-4 text-gray-400" />
                            <div className="flex flex-wrap gap-1">
                              {article.tags.map((tag, index) => (
                                <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <button
                          onClick={() => { setViewArticleId(article.id); setViewArticle(article); }}
                          className="px-3 py-1.5 text-sm bg-black text-white rounded hover:bg-gray-800"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Context Cards */}
          {activeTab === 'context' && (
            <ContextCardsSystem showCreateButton={true} />
          )}

          {/* Decision Log */}
          {activeTab === 'decisions' && (
            <DecisionLogSystem showCreateButton={true} />
          )}
        </div>
      )}

      {/* Article Details Modal */}
      {viewArticleId && (
        <ArticleDetailsModal
          articleId={viewArticleId}
          initialArticle={viewArticle}
          onClose={() => { setViewArticleId(null); setViewArticle(null); }}
        />
      )}
    </div>
  );
};

const ArticleDetailsModal: React.FC<{ articleId: string; initialArticle?: any; onClose: () => void }> = ({ articleId, initialArticle, onClose }) => {
  const [article, setArticle] = React.useState<any>(initialArticle || null);
  const [loading, setLoading] = React.useState(true);
  const dispatch = useAppDispatch();

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { default: apiClient } = await import('../../api/client');
        const res = await apiClient.get(`/knowledge/articles/${articleId}`);
        setArticle(res.data);
      } catch (e: any) {
        console.error('Failed to load article', e);
        // Fall back to initial article if provided
        if (initialArticle) {
          setArticle(initialArticle);
        } else {
          dispatch(addNotification({ type: 'error', title: 'Error', message: 'Failed to load article', duration: 5000 }));
        }
      } finally {
        setLoading(false);
      }
    };
    // Always attempt fresh load; if it fails, we display the fallback
    load();
  }, [articleId, initialArticle, dispatch]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Article Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : article ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-gray-900">{article.title}</h2>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  article.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {article.status}
                </span>
              </div>
              {article.summary && <p className="text-gray-600">{article.summary}</p>}
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <span>By {article.author_name || 'Unknown'}</span>
                <span>•</span>
                <span>{article.estimated_read_time} min read</span>
                {article.project_name && (
                  <>
                    <span>•</span>
                    <span>Project: {article.project_name}</span>
                  </>
                )}
              </div>
              {Array.isArray(article.tags) && article.tags.length > 0 && (
                <div className="flex items-center gap-2">
                  <TagIcon className="h-4 w-4 text-gray-400" />
                  <div className="flex flex-wrap gap-1">
                    {article.tags.map((t: string, idx: number) => (
                      <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">{t}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-gray-800">{article.content}</pre>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">Article not found.</div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm">Close</button>
        </div>
      </div>
    </div>
  );
};

interface CreateArticleModalProps {
  values: {
    title: string;
    content: string;
    summary: string;
    knowledge_type: string;
    category: string;
    tags: string[];
    is_public: boolean;
  };
  creating: boolean;
  onChange: (v: any) => void;
  onClose: () => void;
  onCreate: () => Promise<void>;
}

const CreateArticleModal: React.FC<CreateArticleModalProps> = ({ values, creating, onChange, onClose, onCreate }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Create Knowledge Article</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={values.title}
              onChange={(e) => onChange({ ...values, title: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Article title"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={values.knowledge_type}
                onChange={(e) => onChange({ ...values, knowledge_type: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="documentation">Documentation</option>
                <option value="tutorial">Tutorial</option>
                <option value="best_practice">Best Practice</option>
                <option value="troubleshooting">Troubleshooting</option>
                <option value="process">Process</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category (optional)</label>
              <input
                type="text"
                value={values.category}
                onChange={(e) => onChange({ ...values, category: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Category"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Summary (optional)</label>
            <input
              type="text"
              value={values.summary}
              onChange={(e) => onChange({ ...values, summary: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Short summary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            <textarea
              rows={6}
              value={values.content}
              onChange={(e) => onChange({ ...values, content: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Write the article content..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
              <input
                type="text"
                value={values.tags.join(', ')}
                onChange={(e) => onChange({ ...values, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="e.g. api, onboarding, sprint"
              />
            </div>
            <label className="inline-flex items-center gap-2 mt-6 md:mt-7">
              <input
                type="checkbox"
                checked={values.is_public}
                onChange={(e) => onChange({ ...values, is_public: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Public within organization</span>
            </label>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm">Cancel</button>
          <button
            onClick={onCreate}
            disabled={creating || !values.title || !values.content}
            className="px-4 py-2 bg-black text-white rounded-md disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Article'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeHubPage;
