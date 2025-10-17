import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ClockIcon,
  DocumentTextIcon,
  UserIcon,
  RectangleStackIcon,
  Square3Stack3DIcon,
  ChatBubbleLeftIcon,
  PhotoIcon,
  LinkIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  BugAntIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  TagIcon,
  HashtagIcon,
  ArrowTopRightOnSquareIcon,
  XMarkIcon,
  SparklesIcon,
  BookmarkIcon,
  StarIcon,
  EllipsisHorizontalIcon,
  AdjustmentsHorizontalIcon,
  CommandLineIcon,
  GlobeAltIcon,
  CloudIcon,
  CogIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';

interface SearchResult {
  id: string;
  title: string;
  content: string;
  type: 'project' | 'task' | 'document' | 'comment' | 'user' | 'file' | 'event' | 'proposal' | 'invoice' | 'risk' | 'decision' | 'knowledge' | 'integration';
  source: 'internal' | 'slack' | 'notion' | 'github' | 'jira' | 'google_drive' | 'dropbox' | 'teams' | 'confluence' | 'linear' | 'figma' | 'miro';
  url?: string;
  project_id?: string;
  project_name?: string;
  author?: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
  metadata?: {
    [key: string]: any;
  };
  relevance_score: number;
  matched_fields: string[];
  highlighted_content?: string;
}

interface SearchFilter {
  types: string[];
  sources: string[];
  projects: string[];
  date_range: {
    from?: string;
    to?: string;
  };
  authors: string[];
  tags: string[];
}

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SearchFilter;
  created_at: string;
  is_alert: boolean;
  alert_frequency?: 'immediate' | 'hourly' | 'daily' | 'weekly';
}

interface IntegrationSource {
  id: string;
  name: string;
  type: string;
  icon: React.ComponentType<any>;
  connected: boolean;
  last_sync?: string;
  items_count?: number;
  search_enabled: boolean;
}

  const integrationSources: IntegrationSource[] = [
  { id: 'internal', name: 'ZSphere', type: 'Project Management', icon: RectangleStackIcon, connected: true, search_enabled: true, items_count: 1250 },
  { id: 'slack', name: 'Slack', type: 'Communication', icon: ChatBubbleLeftIcon, connected: true, search_enabled: true, last_sync: '2024-01-22T10:30:00Z', items_count: 3840 },
  { id: 'notion', name: 'Notion', type: 'Documentation', icon: DocumentTextIcon, connected: true, search_enabled: true, last_sync: '2024-01-22T09:15:00Z', items_count: 567 },
  { id: 'github', name: 'GitHub', type: 'Code Repository', icon: CommandLineIcon, connected: true, search_enabled: true, last_sync: '2024-01-22T11:00:00Z', items_count: 892 },
  { id: 'google_drive', name: 'Google Drive', type: 'File Storage', icon: CloudIcon, connected: false, search_enabled: false, items_count: 0 },
  { id: 'jira', name: 'Jira', type: 'Issue Tracking', icon: BugAntIcon, connected: true, search_enabled: true, last_sync: '2024-01-22T08:45:00Z', items_count: 456 },
  { id: 'figma', name: 'Figma', type: 'Design', icon: PhotoIcon, connected: true, search_enabled: false, last_sync: '2024-01-21T16:20:00Z', items_count: 128 },
  { id: 'confluence', name: 'Confluence', type: 'Wiki', icon: BookmarkIcon, connected: false, search_enabled: false, items_count: 0 }
];

interface UniversalSearchProps {
  placeholder?: string;
  onResultSelect?: (result: SearchResult) => void;
  mode?: 'embedded' | 'modal' | 'full_page';
  defaultFilters?: Partial<SearchFilter>;
  autoFocus?: boolean;
}

const UniversalSearch: React.FC<UniversalSearchProps> = ({
  placeholder = "Search across all your tools and data...",
  onResultSelect,
  mode = 'embedded',
  defaultFilters = {},
  autoFocus = false
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilter>({
    types: [],
    sources: [],
    projects: [],
    date_range: {},
    authors: [],
    tags: [],
    ...defaultFilters
  });
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedResult, setSelectedResult] = useState<number>(-1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Mock data for demonstration
  const mockResults: SearchResult[] = [
    {
      id: 'p-001',
      title: 'E-commerce Platform Redesign',
      content: 'Complete redesign of the customer-facing e-commerce platform with modern UI/UX and improved performance',
      type: 'project',
      source: 'internal',
      url: '/projects/p-001',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-22T14:30:00Z',
      tags: ['redesign', 'e-commerce', 'ui-ux'],
      relevance_score: 95,
      matched_fields: ['title', 'content'],
      highlighted_content: 'Complete redesign of the customer-facing <mark>e-commerce</mark> platform'
    },
    {
      id: 't-001',
      title: 'Implement Shopping Cart Functionality',
      content: 'Add shopping cart with session persistence and checkout flow',
      type: 'task',
      source: 'internal',
      project_id: 'p-001',
      project_name: 'E-commerce Platform Redesign',
      author: 'John Doe',
      url: '/tasks/t-001',
      created_at: '2024-01-16T09:30:00Z',
      updated_at: '2024-01-20T16:45:00Z',
      tags: ['frontend', 'shopping', 'checkout'],
      relevance_score: 88,
      matched_fields: ['title', 'tags'],
      highlighted_content: 'Add <mark>shopping</mark> cart with session persistence'
    },
    {
      id: 'd-001',
      title: 'Shopping Cart Requirements',
      content: 'Detailed requirements document for the shopping cart feature including user flows, edge cases, and technical specifications',
      type: 'document',
      source: 'notion',
      project_id: 'p-001',
      project_name: 'E-commerce Platform Redesign',
      author: 'Jane Smith',
      url: 'https://notion.so/shopping-cart-requirements',
      created_at: '2024-01-14T11:20:00Z',
      updated_at: '2024-01-18T09:15:00Z',
      tags: ['requirements', 'documentation'],
      relevance_score: 82,
      matched_fields: ['title', 'content'],
      highlighted_content: 'Detailed requirements document for the <mark>shopping</mark> cart feature'
    },
    {
      id: 'gh-001',
      title: 'feat: add shopping cart component',
      content: 'Implements the shopping cart component with Redux state management and persistent storage',
      type: 'integration',
      source: 'github',
      project_id: 'p-001',
      project_name: 'E-commerce Platform Redesign',
      author: 'dev-team',
      url: 'https://github.com/company/ecommerce/commit/abc123',
      created_at: '2024-01-19T14:25:00Z',
      updated_at: '2024-01-19T14:25:00Z',
      metadata: {
        commit_hash: 'abc123',
        branch: 'feature/shopping-cart',
        files_changed: 12,
        additions: 245,
        deletions: 23
      },
      relevance_score: 78,
      matched_fields: ['title', 'content'],
      highlighted_content: 'Implements the <mark>shopping</mark> cart component with Redux'
    },
    {
      id: 'sl-001',
      title: 'Shopping cart discussion',
      content: 'Team discussion about shopping cart implementation approach and technical decisions',
      type: 'integration',
      source: 'slack',
      project_id: 'p-001',
      project_name: 'E-commerce Platform Redesign',
      author: 'dev-team',
      url: 'https://workspace.slack.com/messages/C123/p456789',
      created_at: '2024-01-17T15:40:00Z',
      updated_at: '2024-01-17T16:20:00Z',
      metadata: {
        channel: '#ecommerce-project',
        message_count: 15,
        participants: ['john.doe', 'jane.smith', 'mike.wilson']
      },
      relevance_score: 72,
      matched_fields: ['title', 'content'],
      highlighted_content: 'Team discussion about <mark>shopping</mark> cart implementation'
    }
  ];

  // Search functionality
  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

      setIsLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const filteredResults = mockResults.filter(result => {
        // Apply text search
        const matchesQuery = result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            result.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            result.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesQuery) return false;

        // Apply filters
        if (filters.types.length > 0 && !filters.types.includes(result.type)) return false;
        if (filters.sources.length > 0 && !filters.sources.includes(result.source)) return false;
        if (filters.projects.length > 0 && result.project_id && !filters.projects.includes(result.project_id)) return false;
        
        // Date range filter
        if (filters.date_range.from || filters.date_range.to) {
          const resultDate = new Date(result.updated_at);
          if (filters.date_range.from && resultDate < new Date(filters.date_range.from)) return false;
          if (filters.date_range.to && resultDate > new Date(filters.date_range.to)) return false;
        }

        return true;
      }).sort((a, b) => b.relevance_score - a.relevance_score);

      setResults(filteredResults);
      setIsLoading(false);
      
      // Add to recent searches
      if (!recentSearches.includes(searchQuery)) {
        setRecentSearches(prev => [searchQuery, ...prev.slice(0, 4)]);
      }
    }, 300);
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, filters]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedResult(prev => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedResult(prev => Math.max(prev - 1, -1));
      } else if (e.key === 'Enter' && selectedResult >= 0) {
        e.preventDefault();
        handleResultSelect(results[selectedResult]);
      } else if (e.key === 'Escape') {
        setQuery('');
        setResults([]);
        setSelectedResult(-1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [results, selectedResult]);

  // Auto focus
  useEffect(() => {
    if (autoFocus && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [autoFocus]);

  const handleResultSelect = (result: SearchResult) => {
    if (onResultSelect) {
      onResultSelect(result);
    } else if (result.url) {
      // Handle different URL types
      if (result.url.startsWith('http')) {
        window.open(result.url, '_blank');
      } else {
        // Internal navigation would go here
        console.log('Navigate to:', result.url);
      }
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'project': return RectangleStackIcon;
      case 'task': return Square3Stack3DIcon;
      case 'document': return DocumentTextIcon;
      case 'comment': return ChatBubbleLeftIcon;
      case 'user': return UserIcon;
      case 'file': return PhotoIcon;
      case 'event': return CalendarIcon;
      case 'proposal': return DocumentTextIcon;
      case 'invoice': return CurrencyDollarIcon;
      case 'risk': return ShieldCheckIcon;
      case 'decision': return LightBulbIcon;
      case 'knowledge': return BookmarkIcon;
      case 'integration': return LinkIcon;
      default: return DocumentTextIcon;
    }
  };

  const getSourceIcon = (source: string) => {
    const sourceConfig = integrationSources.find(s => s.id === source);
    return sourceConfig?.icon || GlobeAltIcon;
  };

  const getSourceName = (source: string) => {
    const sourceConfig = integrationSources.find(s => s.id === source);
    return sourceConfig?.name || source;
  };

  const clearFilters = () => {
    setFilters({
      types: [],
      sources: [],
      projects: [],
      date_range: {},
      authors: [],
      tags: []
    });
  };

  const hasActiveFilters = useMemo(() => {
    return filters.types.length > 0 || 
           filters.sources.length > 0 || 
           filters.projects.length > 0 ||
           filters.authors.length > 0 ||
           filters.tags.length > 0 ||
           filters.date_range.from ||
           filters.date_range.to;
  }, [filters]);

  return (
    <div className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
        />

        <div className="absolute inset-y-0 right-0 flex items-center space-x-2 pr-3">
          {/* Loading Indicator */}
        {isLoading && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
          )}
          
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1 rounded-md transition-colors ${
              hasActiveFilters ? 'text-blue-600 bg-blue-100' : 'text-gray-400 hover:text-gray-600'
            }`}
            title="Filters"
          >
            <FunnelIcon className="h-4 w-4" />
          </button>

          {/* Advanced Search Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
            title="Advanced Search"
          >
            <AdjustmentsHorizontalIcon className="h-4 w-4" />
          </button>

          {/* Clear */}
          {query && (
          <button
            onClick={() => {
              setQuery('');
                setResults([]);
                setSelectedResult(-1);
            }}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
          >
              <XMarkIcon className="h-4 w-4" />
          </button>
        )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900">Search Filters</h3>
            {hasActiveFilters && (
                <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Content Types */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Content Type</label>
              <div className="space-y-1">
                {['project', 'task', 'document', 'comment', 'file', 'integration'].map(type => (
                  <label key={type} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.types.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters(prev => ({ ...prev, types: [...prev.types, type] }));
                        } else {
                          setFilters(prev => ({ ...prev, types: prev.types.filter(t => t !== type) }));
                        }
                      }}
                      className="h-3 w-3 text-blue-600 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700 capitalize">{type}</span>
                  </label>
                ))}
              </div>
                  </div>

            {/* Sources */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Source</label>
              <div className="space-y-1">
                {integrationSources.filter(s => s.connected).map(source => (
                  <label key={source.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.sources.includes(source.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters(prev => ({ ...prev, sources: [...prev.sources, source.id] }));
                        } else {
                          setFilters(prev => ({ ...prev, sources: prev.sources.filter(s => s !== source.id) }));
                        }
                      }}
                      className="h-3 w-3 text-blue-600 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{source.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Date Range</label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={filters.date_range.from || ''}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    date_range: { ...prev.date_range, from: e.target.value } 
                  }))}
                  className="w-full text-xs border border-gray-300 rounded px-2"
                  placeholder="From"
                />
                <input
                  type="date"
                  value={filters.date_range.to || ''}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    date_range: { ...prev.date_range, to: e.target.value } 
                  }))}
                  className="w-full text-xs border border-gray-300 rounded px-2"
                  placeholder="To"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Search Panel */}
      {showAdvanced && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
          <AdvancedSearchPanel 
            savedSearches={savedSearches}
            recentSearches={recentSearches}
            integrationSources={integrationSources}
            onQuerySelect={setQuery}
          />
        </div>
      )}

      {/* Search Results */}
      {(query || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-40 max-h-96 overflow-y-auto">
          {results.length === 0 && !isLoading && query && (
            <div className="p-6 text-center">
              <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search terms or filters
              </p>
            </div>
          )}

          {results.length > 0 && (
            <>
              {/* Results Header */}
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">
                    {results.length} result{results.length !== 1 ? 's' : ''} found
                  </span>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>Use ↑↓ to navigate</span>
                    <span>•</span>
                    <span>Enter to select</span>
                    </div>
                </div>
              </div>

              {/* Results List */}
              <div ref={resultsRef} className="divide-y divide-gray-200">
                {results.map((result, index) => (
                  <SearchResultItem
                    key={result.id}
                    result={result}
                    isSelected={index === selectedResult}
                    onSelect={() => handleResultSelect(result)}
                    getTypeIcon={getTypeIcon}
                    getSourceIcon={getSourceIcon}
                    getSourceName={getSourceName}
                  />
                ))}
              </div>

              {/* Results Footer */}
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Searched across {integrationSources.filter(s => s.connected).length} connected tools
                  </span>
                  <button className="text-blue-600 hover:text-blue-700">
                    Search in specific tool →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Quick Suggestions (when no query) */}
      {!query && !showFilters && !showAdvanced && recentSearches.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-40">
          <div className="p-3">
            <h4 className="text-xs font-medium text-gray-700 mb-2">Recent Searches</h4>
            <div className="space-y-1">
              {recentSearches.slice(0, 3).map((search, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(search)}
                  className="block w-full text-left px-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                >
                  <ClockIcon className="inline w-3 h-3 mr-2 text-gray-400" />
                  {search}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Search Result Item Component
const SearchResultItem: React.FC<{
  result: SearchResult;
  isSelected: boolean;
  onSelect: () => void;
  getTypeIcon: (type: string) => React.ComponentType<any>;
  getSourceIcon: (source: string) => React.ComponentType<any>;
  getSourceName: (source: string) => string;
}> = ({ result, isSelected, onSelect, getTypeIcon, getSourceIcon, getSourceName }) => {
  const TypeIcon = getTypeIcon(result.type);
  const SourceIcon = getSourceIcon(result.source);
  
                  return (
    <div
      className={`p-4 cursor-pointer transition-colors ${
        isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'
      }`}
      onClick={onSelect}
                    >
                      <div className="flex items-start space-x-3">
        {/* Type Icon */}
        <div className="flex-shrink-0 mt-1">
          <TypeIcon className="w-4 h-4 text-gray-500" />
        </div>
        
        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {result.title}
            </h3>
            {result.source !== 'internal' && (
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <SourceIcon className="w-3 h-3" />
                <span>{getSourceName(result.source)}</span>
              </div>
            )}
                          </div>
          
          <p className="text-sm text-gray-600 line-clamp-2">
            {result.highlighted_content ? (
              <span dangerouslySetInnerHTML={{ __html: result.highlighted_content }} />
            ) : (
              result.content
            )}
          </p>
          
          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
            {result.project_name && (
              <span className="flex items-center space-x-1">
                <RectangleStackIcon className="w-3 h-3" />
                <span>{result.project_name}</span>
              </span>
            )}
            
            {result.author && (
              <span className="flex items-center space-x-1">
                <UserIcon className="w-3 h-3" />
                <span>{result.author}</span>
              </span>
            )}
            
            <span className="flex items-center space-x-1">
              <ClockIcon className="w-3 h-3" />
              <span>{new Date(result.updated_at).toLocaleDateString()}</span>
            </span>
            
            {result.tags && result.tags.length > 0 && (
              <div className="flex items-center space-x-1">
                <TagIcon className="w-3 h-3" />
                <div className="flex space-x-1">
                  {result.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="bg-gray-100 px-1 py-0.5 rounded text-xs">
                      {tag}
                    </span>
                  ))}
                  {result.tags.length > 2 && (
                    <span className="text-gray-400">+{result.tags.length - 2}</span>
                  )}
                          </div>
                        </div>
            )}
          </div>
                          </div>
        
        {/* External Link Indicator */}
        {result.url?.startsWith('http') && (
          <ArrowTopRightOnSquareIcon className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                        )}
                      </div>
    </div>
  );
};

// Advanced Search Panel Component
const AdvancedSearchPanel: React.FC<{
  savedSearches: SavedSearch[];
  recentSearches: string[];
  integrationSources: IntegrationSource[];
  onQuerySelect: (query: string) => void;
}> = ({ savedSearches, recentSearches, integrationSources, onQuerySelect }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Advanced Search</h3>
        <button className="text-sm text-blue-600 hover:text-blue-700">
          Save current search
        </button>
      </div>

      {/* Quick Actions */}
      <div>
        <h4 className="text-xs font-medium text-gray-700 mb-2">Quick Actions</h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onQuerySelect('updated:today')}
            className="text-left py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-md"
          >
            <SparklesIcon className="inline w-4 h-4 mr-2 text-blue-500" />
            Updated today
          </button>
          <button
            onClick={() => onQuerySelect('author:me')}
            className="text-left py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-md"
          >
            <UserIcon className="inline w-4 h-4 mr-2 text-green-500" />
            Created by me
          </button>
          <button
            onClick={() => onQuerySelect('type:task status:open')}
            className="text-left py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-md"
          >
            <Square3Stack3DIcon className="inline w-4 h-4 mr-2 text-yellow-500" />
            Open tasks
          </button>
          <button
            onClick={() => onQuerySelect('has:attachments')}
            className="text-left py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-md"
          >
            <PhotoIcon className="inline w-4 h-4 mr-2 text-purple-500" />
            With files
                    </button>
        </div>
      </div>

      {/* Integration Status */}
      <div>
        <h4 className="text-xs font-medium text-gray-700 mb-2">Connected Tools</h4>
        <div className="grid grid-cols-2 gap-2">
          {integrationSources.map(source => (
            <div key={source.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
              <div className="flex items-center space-x-2">
                <source.icon className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">{source.name}</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${
                  source.connected ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                {source.items_count && (
                  <span className="text-xs text-gray-500">{source.items_count}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search Syntax Help */}
      <div>
        <h4 className="text-xs font-medium text-gray-700 mb-2">Search Syntax</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <div><code className="bg-gray-100 px-1 rounded">type:task</code> - Search specific content type</div>
          <div><code className="bg-gray-100 px-1 rounded">author:john</code> - Search by author</div>
          <div><code className="bg-gray-100 px-1 rounded">project:ecommerce</code> - Search within project</div>
          <div><code className="bg-gray-100 px-1 rounded">updated:{'>'}2024-01-01</code> - Date range search</div>
          <div><code className="bg-gray-100 px-1 rounded">"exact phrase"</code> - Exact phrase search</div>
        </div>
      </div>
    </div>
  );
};

export default UniversalSearch;