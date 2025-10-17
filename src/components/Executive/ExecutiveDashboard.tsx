import React, { useState, useEffect } from 'react';

interface ExecutiveSummary {
  organization_id: string;
  period: string;
  generated_at: string;
  health_overview: HealthOverview;
  key_predictions: PredictionResults;
  resource_insights: ResourceInsights;
  risk_assessment: RiskAssessment;
  kpi_trends: Record<string, any>;
  action_items: string[];
}

interface HealthOverview {
  total_projects: number;
  healthy_projects: number;
  at_risk_projects: number;
  critical_projects: number;
  overall_health_score: number;
  health_distribution: Record<string, number>;
  trending_up: string[];
  trending_down: string[];
  health_trend: string;
}

interface PredictionResults {
  delivery_predictions: Array<{
    project_id: string;
    project_name: string;
    predicted_completion: string;
    confidence: number;
    risk_factors: string[];
  }>;
  budget_predictions: Array<{
    project_id: string;
    predicted_budget_variance: number;
    confidence: number;
    variance_percentage: number;
  }>;
  resource_predictions: Array<{
    team_id: string;
    predicted_capacity: number;
    utilization_trend: string;
    bottleneck_skills: string[];
  }>;
  risk_predictions: Array<{
    risk_type: string;
    probability: number;
    projects_affected: string[];
    mitigation_suggestions: string[];
  }>;
}

interface ResourceInsights {
  total_capacity: number;
  allocated_capacity: number;
  utilization_rate: number;
  bottleneck_teams: string[];
  overallocated_resources: Array<{
    resource_id: string;
    name: string;
    allocation_percentage: number;
    projects: string[];
  }>;
  underutilized_resources: Array<{
    resource_id: string;
    name: string;
    allocation_percentage: number;
    available_capacity: number;
  }>;
  skill_gaps: Array<{
    skill: string;
    demand: number;
    supply: number;
    gap: number;
  }>;
  capacity_forecast: {
    next_month: number;
    next_quarter: number;
    projected_hires: number;
  };
}

interface RiskAssessment {
  total_risks: number;
  critical_risks: number;
  high_risks: number;
  medium_risks: number;
  low_risks: number;
  risk_score: number;
  top_risks: Array<{
    id: string;
    title: string;
    level: string;
    probability: number;
    impact: number;
    projects_affected: string[];
  }>;
  mitigation_actions: string[];
  risk_trend: string;
}

const ExecutiveDashboard: React.FC = () => {
  const [summary, setSummary] = useState<ExecutiveSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [activeView, setActiveView] = useState<'overview' | 'health' | 'predictions' | 'resources' | 'risks'>('overview');

  useEffect(() => {
    loadExecutiveSummary();
  }, [selectedPeriod]);

  const loadExecutiveSummary = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/v1/executive/summary?period=${selectedPeriod}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (error) {
      console.error('Failed to load executive summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'at_risk': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
      case 'improving':
        return (
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'decreasing':
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'stable':
        return (
          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderOverview = () => {
    if (!summary) return null;

    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Projects</dt>
                  <dd className="text-lg font-medium text-gray-900">{summary.health_overview.total_projects}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Health Score</dt>
                  <dd className="text-lg font-medium text-gray-900">{summary.health_overview.overall_health_score.toFixed(1)}%</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">At Risk</dt>
                  <dd className="text-lg font-medium text-gray-900">{summary.health_overview.at_risk_projects}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Critical</dt>
                  <dd className="text-lg font-medium text-gray-900">{summary.health_overview.critical_projects}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Action Items */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Priority Action Items</h3>
          </div>
          <div className="p-6">
            <ul className="space-y-3">
              {summary.action_items.map((item, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-red-400 rounded-full mt-2"></div>
                  </div>
                  <span className="text-sm text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Quick Insights Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Resource Utilization */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Resource Utilization</h3>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-600">Overall Utilization</span>
                <span className="text-lg font-semibold text-gray-900">
                  {(summary.resource_insights.utilization_rate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${summary.resource_insights.utilization_rate * 100}%` }}
                ></div>
              </div>
              <div className="mt-4 space-y-2">
                {summary.resource_insights.bottleneck_teams.slice(0, 3).map((team, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{team}</span>
                    <span className="px-2 bg-orange-100 text-orange-800 rounded-full text-xs">
                      Bottleneck
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Risks */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Top Risks</h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {summary.risk_assessment.top_risks.slice(0, 3).map((risk, index) => (
                  <div key={risk.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{risk.title}</h4>
                      <p className="text-xs text-gray-500">
                        {(risk.probability * 100).toFixed(0)}% probability, {(risk.impact * 100).toFixed(0)}% impact
                      </p>
                    </div>
                    <span className={`inline-flex px-2 rounded-full text-xs font-medium border ${getRiskColor(risk.level)}`}>
                      {risk.level}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderHealthDetails = () => {
    if (!summary) return null;

    return (
      <div className="space-y-6">
        {/* Health Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Project Health Distribution</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{summary.health_overview.healthy_projects}</div>
                <div className="text-sm text-gray-500">Healthy Projects</div>
                <div className="text-xs text-green-600">{summary.health_overview.health_distribution.healthy.toFixed(1)}%</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">{summary.health_overview.at_risk_projects}</div>
                <div className="text-sm text-gray-500">At Risk Projects</div>
                <div className="text-xs text-yellow-600">{summary.health_overview.health_distribution.at_risk.toFixed(1)}%</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{summary.health_overview.critical_projects}</div>
                <div className="text-sm text-gray-500">Critical Projects</div>
                <div className="text-xs text-red-600">{summary.health_overview.health_distribution.critical.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Health Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Improving Projects</h3>
            </div>
            <div className="p-6">
              {summary.health_overview.trending_up.length === 0 ? (
                <p className="text-sm text-gray-500">No projects showing improvement</p>
              ) : (
                <ul className="space-y-2">
                  {summary.health_overview.trending_up.map((project, index) => (
                    <li key={index} className="flex items-center space-x-2">
                      {getTrendIcon('improving')}
                      <span className="text-sm text-gray-900">{project}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Declining Projects</h3>
            </div>
            <div className="p-6">
              {summary.health_overview.trending_down.length === 0 ? (
                <p className="text-sm text-gray-500">No projects showing decline</p>
              ) : (
                <ul className="space-y-2">
                  {summary.health_overview.trending_down.map((project, index) => (
                    <li key={index} className="flex items-center space-x-2">
                      {getTrendIcon('decreasing')}
                      <span className="text-sm text-gray-900">{project}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPredictions = () => {
    if (!summary) return null;

    return (
      <div className="space-y-6">
        {/* Delivery Predictions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Delivery Predictions</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {summary.key_predictions.delivery_predictions.map((prediction, index) => (
                <div key={prediction.project_id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{prediction.project_name}</h4>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        Confidence: {(prediction.confidence * 100).toFixed(0)}%
                      </span>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${prediction.confidence * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Predicted completion: {formatDate(prediction.predicted_completion)}
                    </span>
                    {prediction.risk_factors.length > 0 && (
                      <div className="flex items-center space-x-1">
                        <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs text-orange-600">{prediction.risk_factors.length} risk factors</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Risk Predictions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Risk Predictions</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {summary.key_predictions.risk_predictions.map((risk, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 capitalize">{risk.risk_type.replace('_', ' ')}</h4>
                    <span className="text-sm font-medium text-red-600">
                      {(risk.probability * 100).toFixed(0)}% probability
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    Affects: {risk.projects_affected.join(', ')}
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Suggested mitigations:</strong>
                    <ul className="mt-1 list-disc list-inside">
                      {risk.mitigation_suggestions.map((suggestion, i) => (
                        <li key={i}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Executive Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Strategic overview of project performance and organizational health
          </p>
        </div>
        <div>
          <label htmlFor="period" className="block text-sm font-medium text-gray-700 mb-1">
            Time Period
          </label>
          <select
            id="period"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex space-x-8">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'health', label: 'Project Health' },
            { key: 'predictions', label: 'Predictions' },
            { key: 'resources', label: 'Resources' },
            { key: 'risks', label: 'Risk Management' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key as any)}
              className={`py-2 font-medium text-sm rounded-md transition-colors focus:outline-none focus:ring-0 ${
                activeView === tab.key ? 'text-indigo-600' : 'text-black hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeView === 'overview' && renderOverview()}
      {activeView === 'health' && renderHealthDetails()}
      {activeView === 'predictions' && renderPredictions()}
      {activeView === 'resources' && (
        <div className="text-center2">
          <p className="text-gray-500">Resource management view coming soon</p>
        </div>
      )}
      {activeView === 'risks' && (
        <div className="text-center2">
          <p className="text-gray-500">Risk management view coming soon</p>
        </div>
      )}
    </div>
  );
};

export default ExecutiveDashboard;
