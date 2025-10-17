import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import EnhancedContextCardsWidget from '../../components/Knowledge/EnhancedContextCardsWidget';
import KnowledgeIntegrationWidget from '../../components/Knowledge/KnowledgeIntegrationWidget';
import SmartNotificationCenter from '../../components/SmartNotifications/SmartNotificationCenter';
import DecisionLogSystem from '../../components/Knowledge/DecisionLogSystem';
import HandoffSummariesSystem from '../../components/Knowledge/HandoffSummariesSystem';
import {
  SparklesIcon,
  LightBulbIcon,
  DocumentTextIcon,
  UserGroupIcon,
  BellIcon,
  ChartBarIcon,
  CogIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface EnhancedKnowledgeCenterProps {
  // Optional props for when used as a component within other pages
  projectId?: string;
  taskId?: string;
  compact?: boolean;
}

const EnhancedKnowledgeCenter: React.FC<EnhancedKnowledgeCenterProps> = ({
  projectId: propProjectId,
  taskId: propTaskId,
  compact = false
}) => {
  const { projectId: paramProjectId, taskId: paramTaskId } = useParams<{
    projectId?: string;
    taskId?: string;
  }>();
  
  // Use props first, then URL params
  const projectId = propProjectId || paramProjectId;
  const taskId = propTaskId || paramTaskId;

  const [activeTab, setActiveTab] = useState<'overview' | 'context' | 'decisions' | 'handoffs' | 'integration' | 'analytics'>('overview');
  const [showNotifications, setShowNotifications] = useState(false);
  const [stats, setStats] = useState({
    context_cards: 0,
    decisions: 0,
    handoffs: 0,
    auto_captured: 0,
    knowledge_links: 0
  });

  useEffect(() => {
    fetchStats();
  }, [projectId, taskId]);

  const fetchStats = async () => {
    // This would fetch actual stats from the API
    setStats({
      context_cards: 12,
      decisions: 8,
      handoffs: 5,
      auto_captured: 7,
      knowledge_links: 23
    });
  };

  const handleContentAnalyze = async (content: string) => {
    // This would trigger the AI content analysis
    console.log('Analyzing content:', content);
  };

  if (compact) {
    return (
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              <LightBulbIcon className="h-4 w-4 text-indigo-600" />
              <span className="text-sm text-gray-600">Context</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">{stats.context_cards}</p>
          </div>
          <div className="bg-white p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              <DocumentTextIcon className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-600">Decisions</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">{stats.decisions}</p>
          </div>
          <div className="bg-white p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              <UserGroupIcon className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-600">Handoffs</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">{stats.handoffs}</p>
          </div>
          <div className="bg-white p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              <SparklesIcon className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-gray-600">Auto-captured</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">{stats.auto_captured}</p>
          </div>
          <div className="bg-white p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              <ChartBarIcon className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-gray-600">Links</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">{stats.knowledge_links}</p>
          </div>
        </div>

        {/* Compact Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EnhancedContextCardsWidget
            linkedEntityId={taskId || projectId}
            linkedEntityType={taskId ? 'task' : 'project'}
            onContentAnalyze={handleContentAnalyze}
            compact
          />
          <KnowledgeIntegrationWidget
            entityId={taskId || projectId || ''}
            entityType={taskId ? 'task' : 'project'}
            compact
          />
        </div>
      </div>
    );
  }

  const tabContent = {
    overview: (
      <OverviewTab 
        projectId={projectId}
        taskId={taskId}
        stats={stats}
        onContentAnalyze={handleContentAnalyze}
      />
    ),
    context: (
      <EnhancedContextCardsWidget
        linkedEntityId={taskId || projectId}
        linkedEntityType={taskId ? 'task' : 'project'}
        onContentAnalyze={handleContentAnalyze}
      />
    ),
    decisions: (
      <DecisionLogSystem
        projectId={projectId}
        taskId={taskId}
      />
    ),
    handoffs: (
      <HandoffSummariesSystem
        projectId={projectId}
        taskId={taskId}
      />
    ),
    integration: (
      <KnowledgeIntegrationWidget
        entityId={taskId || projectId || ''}
        entityType={taskId ? 'task' : 'project'}
      />
    ),
    analytics: (
      <KnowledgeAnalyticsTab 
        projectId={projectId}
        taskId={taskId}
      />
    )
  };

  const tabs = [
    { key: 'overview', label: 'Overview', icon: EyeIcon, color: 'text-gray-600' },
    { key: 'context', label: 'Context Cards', icon: LightBulbIcon, color: 'text-indigo-600' },
    { key: 'decisions', label: 'Decisions', icon: DocumentTextIcon, color: 'text-green-600' },
    { key: 'handoffs', label: 'Handoffs', icon: UserGroupIcon, color: 'text-blue-600' },
    { key: 'integration', label: 'Integration', icon: SparklesIcon, color: 'text-purple-600' },
    { key: 'analytics', label: 'Analytics', icon: ChartBarIcon, color: 'text-orange-600' }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Enhanced Knowledge Center</h1>
            <p className="text-gray-600 mt-1">
              AI-powered knowledge management with smart notifications and context capture
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNotifications(true)}
              className="relative bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center gap-2"
            >
              <BellIcon className="h-5 w-5" />
              Smart Notifications
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                3
              </span>
            </button>
            <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center gap-2">
              <CogIcon className="h-5 w-5" />
              Settings
            </button>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <LightBulbIcon className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Context Cards</p>
                <p className="text-2xl font-bold text-gray-900">{stats.context_cards}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DocumentTextIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Decisions Logged</p>
                <p className="text-2xl font-bold text-gray-900">{stats.decisions}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserGroupIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Handoff Summaries</p>
                <p className="text-2xl font-bold text-gray-900">{stats.handoffs}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <SparklesIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Auto-captured</p>
                <p className="text-2xl font-bold text-gray-900">{stats.auto_captured}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Knowledge Links</p>
                <p className="text-2xl font-bold text-gray-900">{stats.knowledge_links}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`py-3 font-medium text-sm flex items-center gap-2 rounded-md transition-colors focus:outline-none focus:ring-0 ${
                    activeTab === tab.key ? 'text-indigo-600' : 'text-black hover:text-gray-700'
                  }`}
                >
                  <IconComponent className={`h-5 w-5 ${activeTab === tab.key ? 'text-indigo-600' : tab.color}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {tabContent[activeTab]}
        </div>

        {/* Smart Notifications Modal */}
        <SmartNotificationCenter
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
        />
      </div>
    </Layout>
  );
};

interface OverviewTabProps {
  projectId?: string;
  taskId?: string;
  stats: any;
  onContentAnalyze: (content: string) => void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  projectId,
  taskId,
  stats,
  onContentAnalyze
}) => {
  return (
    <div className="space-y-8">
      {/* Key Features Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Recent Context</h2>
          <EnhancedContextCardsWidget
            linkedEntityId={taskId || projectId}
            linkedEntityType={taskId ? 'task' : 'project'}
            onContentAnalyze={onContentAnalyze}
            compact
          />
        </div>
        
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Knowledge Integration</h2>
          <KnowledgeIntegrationWidget
            entityId={taskId || projectId || ''}
            entityType={taskId ? 'task' : 'project'}
            compact
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Knowledge Activity</h2>
        <div className="bg-white border rounded-lg p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <SparklesIcon className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">
                  AI auto-captured decision context from team discussion
                </p>
                <p className="text-xs text-green-600">2 minutes ago</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <UserGroupIcon className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">
                  Handoff summary created for phase transition
                </p>
                <p className="text-xs text-blue-600">1 hour ago</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <DocumentTextIcon className="h-5 w-5 text-purple-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-purple-900">
                  5 knowledge articles auto-linked to current task
                </p>
                <p className="text-xs text-purple-600">3 hours ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface KnowledgeAnalyticsTabProps {
  projectId?: string;
  taskId?: string;
}

const KnowledgeAnalyticsTab: React.FC<KnowledgeAnalyticsTabProps> = ({
  projectId,
  taskId
}) => {
  const [analyticsData, setAnalyticsData] = useState({
    capture_efficiency: 78,
    knowledge_coverage: 65,
    decision_tracking: 89,
    handoff_completion_rate: 92,
    auto_capture_accuracy: 85
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Knowledge Management Analytics</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Capture Efficiency</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${analyticsData.capture_efficiency}%` }}
                ></div>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {analyticsData.capture_efficiency}%
              </span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Knowledge Coverage</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${analyticsData.knowledge_coverage}%` }}
                ></div>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {analyticsData.knowledge_coverage}%
              </span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Decision Tracking</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full" 
                  style={{ width: `${analyticsData.decision_tracking}%` }}
                ></div>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {analyticsData.decision_tracking}%
              </span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Handoff Completion</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-indigo-600 h-2 rounded-full" 
                  style={{ width: `${analyticsData.handoff_completion_rate}%` }}
                ></div>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {analyticsData.handoff_completion_rate}%
              </span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Auto-capture Accuracy</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-orange-600 h-2 rounded-full" 
                  style={{ width: `${analyticsData.auto_capture_accuracy}%` }}
                ></div>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {analyticsData.auto_capture_accuracy}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Insights & Recommendations</h3>
        <div className="space-y-3">
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">
              ✓ Decision documentation is excellent! 89% of decisions are properly tracked.
            </p>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠ Knowledge coverage could be improved. Consider linking more relevant documentation.
            </p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 Auto-capture is performing well with 85% accuracy. Enable it for more discussions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedKnowledgeCenter;
