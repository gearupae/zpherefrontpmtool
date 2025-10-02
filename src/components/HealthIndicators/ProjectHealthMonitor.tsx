import React, { useState, useEffect } from 'react';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CalendarIcon,
  TrophyIcon,
  ShieldExclamationIcon,
  BugAntIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  InformationCircleIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon,
  ChevronRightIcon,
  SparklesIcon,
  BeakerIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';

interface ProjectHealth {
  project_id: string;
  project_name: string;
  overall_health: 'excellent' | 'good' | 'warning' | 'critical';
  health_score: number; // 0-100
  last_assessed: string;
  
  // Individual health components
  schedule_health: HealthComponent;
  budget_health: HealthComponent;
  quality_health: HealthComponent;
  team_health: HealthComponent;
  scope_health: HealthComponent;
  risk_health: HealthComponent;
  
  // Trends
  health_trend: 'improving' | 'stable' | 'declining';
  trend_percentage: number;
  
  // Key metrics
  key_metrics: {
    completion_percentage: number;
    tasks_on_time: number;
    total_tasks: number;
    budget_utilization: number;
    team_velocity: number;
    defect_rate: number;
    customer_satisfaction: number;
    scope_change_rate: number;
  };
  
  // Alerts and recommendations
  active_alerts: HealthAlert[];
  recommendations: HealthRecommendation[];
  
  // Historical data
  health_history: HealthHistoryPoint[];
}

interface HealthComponent {
  status: 'excellent' | 'good' | 'warning' | 'critical';
  score: number;
  trend: 'improving' | 'stable' | 'declining';
  factors: HealthFactor[];
  last_updated: string;
}

interface HealthFactor {
  name: string;
  status: 'positive' | 'neutral' | 'negative';
  impact: 'low' | 'medium' | 'high';
  description: string;
  metric_value?: number;
  metric_unit?: string;
}

interface HealthAlert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  category: 'schedule' | 'budget' | 'quality' | 'team' | 'scope' | 'risk';
  title: string;
  description: string;
  severity: number; // 1-10
  created_at: string;
  resolved: boolean;
  action_required: boolean;
  recommended_actions: string[];
}

interface HealthRecommendation {
  id: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expected_impact: string;
  effort_required: 'low' | 'medium' | 'high';
  implementation_time: string;
}

interface HealthHistoryPoint {
  date: string;
  overall_score: number;
  schedule_score: number;
  budget_score: number;
  quality_score: number;
  team_score: number;
  scope_score: number;
  risk_score: number;
}

interface ProjectHealthMonitorProps {
  projectId: string;
  mode?: 'compact' | 'detailed' | 'executive';
  onAlertClick?: (alert: HealthAlert) => void;
  onRecommendationClick?: (recommendation: HealthRecommendation) => void;
}

const ProjectHealthMonitor: React.FC<ProjectHealthMonitorProps> = ({
  projectId,
  mode = 'detailed',
  onAlertClick,
  onRecommendationClick
}) => {
  const [healthData, setHealthData] = useState<ProjectHealth | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<string>('overall');
  const [showDetails, setShowDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data for demonstration
  useEffect(() => {
    const mockHealthData: ProjectHealth = {
      project_id: projectId,
      project_name: 'E-commerce Platform Redesign',
      overall_health: 'warning',
      health_score: 72,
      last_assessed: new Date().toISOString(),
      
      schedule_health: {
        status: 'warning',
        score: 68,
        trend: 'declining',
        factors: [
          {
            name: 'Task Completion Rate',
            status: 'negative',
            impact: 'high',
            description: '3 critical tasks are behind schedule',
            metric_value: 78,
            metric_unit: '%'
          },
          {
            name: 'Milestone Progress',
            status: 'neutral',
            impact: 'medium',
            description: 'On track for next milestone',
            metric_value: 85,
            metric_unit: '%'
          }
        ],
        last_updated: new Date().toISOString()
      },
      
      budget_health: {
        status: 'good',
        score: 85,
        trend: 'stable',
        factors: [
          {
            name: 'Budget Utilization',
            status: 'positive',
            impact: 'medium',
            description: 'Under budget by 15%',
            metric_value: 85,
            metric_unit: '%'
          },
          {
            name: 'Cost Control',
            status: 'positive',
            impact: 'low',
            description: 'Expenses tracking as expected',
            metric_value: 92,
            metric_unit: '%'
          }
        ],
        last_updated: new Date().toISOString()
      },
      
      quality_health: {
        status: 'critical',
        score: 45,
        trend: 'declining',
        factors: [
          {
            name: 'Defect Rate',
            status: 'negative',
            impact: 'high',
            description: 'High number of bugs reported',
            metric_value: 12,
            metric_unit: 'bugs/week'
          },
          {
            name: 'Code Review Coverage',
            status: 'negative',
            impact: 'medium',
            description: 'Only 60% of code reviewed',
            metric_value: 60,
            metric_unit: '%'
          }
        ],
        last_updated: new Date().toISOString()
      },
      
      team_health: {
        status: 'good',
        score: 88,
        trend: 'improving',
        factors: [
          {
            name: 'Team Velocity',
            status: 'positive',
            impact: 'high',
            description: 'Productivity is increasing',
            metric_value: 42,
            metric_unit: 'story points/sprint'
          },
          {
            name: 'Team Satisfaction',
            status: 'positive',
            impact: 'medium',
            description: 'High team morale',
            metric_value: 4.2,
            metric_unit: '/5'
          }
        ],
        last_updated: new Date().toISOString()
      },
      
      scope_health: {
        status: 'warning',
        score: 70,
        trend: 'declining',
        factors: [
          {
            name: 'Scope Creep',
            status: 'negative',
            impact: 'medium',
            description: '3 unapproved changes this month',
            metric_value: 15,
            metric_unit: '% increase'
          }
        ],
        last_updated: new Date().toISOString()
      },
      
      risk_health: {
        status: 'warning',
        score: 65,
        trend: 'stable',
        factors: [
          {
            name: 'Open Risks',
            status: 'negative',
            impact: 'medium',
            description: '2 high-impact risks unmitigated',
            metric_value: 5,
            metric_unit: 'risks'
          }
        ],
        last_updated: new Date().toISOString()
      },
      
      health_trend: 'declining',
      trend_percentage: -8,
      
      key_metrics: {
        completion_percentage: 68,
        tasks_on_time: 23,
        total_tasks: 35,
        budget_utilization: 85,
        team_velocity: 42,
        defect_rate: 12,
        customer_satisfaction: 4.1,
        scope_change_rate: 15
      },
      
      active_alerts: [
        {
          id: 'alert-1',
          type: 'critical',
          category: 'quality',
          title: 'High Defect Rate Detected',
          description: 'The number of bugs reported has increased by 40% this week',
          severity: 8,
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          resolved: false,
          action_required: true,
          recommended_actions: [
            'Increase code review coverage',
            'Add automated testing',
            'Schedule team code quality workshop'
          ]
        },
        {
          id: 'alert-2',
          type: 'warning',
          category: 'schedule',
          title: 'Tasks Behind Schedule',
          description: '3 critical tasks are running behind their planned timeline',
          severity: 6,
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          resolved: false,
          action_required: true,
          recommended_actions: [
            'Reassign resources to critical tasks',
            'Review task dependencies',
            'Consider scope adjustment'
          ]
        }
      ],
      
      recommendations: [
        {
          id: 'rec-1',
          category: 'quality',
          priority: 'high',
          title: 'Implement Automated Testing',
          description: 'Set up automated testing pipeline to catch bugs early',
          expected_impact: 'Reduce defect rate by 50%',
          effort_required: 'medium',
          implementation_time: '2 weeks'
        },
        {
          id: 'rec-2',
          category: 'schedule',
          priority: 'medium',
          title: 'Optimize Task Dependencies',
          description: 'Review and optimize task dependencies to improve flow',
          expected_impact: 'Improve completion rate by 15%',
          effort_required: 'low',
          implementation_time: '3 days'
        }
      ],
      
      health_history: [
        { date: '2024-01-01', overall_score: 85, schedule_score: 88, budget_score: 85, quality_score: 82, team_score: 85, scope_score: 90, risk_score: 75 },
        { date: '2024-01-08', overall_score: 82, schedule_score: 85, budget_score: 85, quality_score: 75, team_score: 86, scope_score: 88, risk_score: 72 },
        { date: '2024-01-15', overall_score: 78, schedule_score: 80, budget_score: 85, quality_score: 65, team_score: 88, scope_score: 85, risk_score: 70 },
        { date: '2024-01-22', overall_score: 72, schedule_score: 68, budget_score: 85, quality_score: 45, team_score: 88, scope_score: 70, risk_score: 65 }
      ]
    };

    setHealthData(mockHealthData);
    setIsLoading(false);
  }, [projectId]);

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-100 border-green-200';
      case 'good': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'warning': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'excellent': return CheckCircleIcon;
      case 'good': return CheckCircleIcon;
      case 'warning': return ExclamationTriangleIcon;
      case 'critical': return ShieldExclamationIcon;
      default: return InformationCircleIcon;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return ArrowTrendingUpIcon;
      case 'declining': return ArrowTrendingDownIcon;
      case 'stable': return MinusIcon;
      default: return MinusIcon;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-600';
      case 'declining': return 'text-red-600';
      case 'stable': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className="text-center py-8">
        <InformationCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No health data available</h3>
        <p className="mt-1 text-sm text-gray-500">Health assessment will be available once project data is analyzed.</p>
      </div>
    );
  }

  if (mode === 'compact') {
    return <CompactHealthView healthData={healthData} getHealthColor={getHealthColor} getHealthIcon={getHealthIcon} />;
  }

  if (mode === 'executive') {
    return <ExecutiveHealthView healthData={healthData} getHealthColor={getHealthColor} getHealthIcon={getHealthIcon} getTrendIcon={getTrendIcon} getTrendColor={getTrendColor} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Project Health Monitor</h2>
            <p className="text-gray-600 mt-1">{healthData.project_name}</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Overall Health Score */}
            <div className="text-center">
              <div className={`text-3xl font-bold ${healthData.overall_health === 'excellent' ? 'text-green-600' : 
                healthData.overall_health === 'good' ? 'text-blue-600' :
                healthData.overall_health === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
                {healthData.health_score}
              </div>
              <div className="text-sm text-gray-500">Health Score</div>
            </div>
            
            {/* Overall Status */}
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${getHealthColor(healthData.overall_health)}`}>
              {React.createElement(getHealthIcon(healthData.overall_health), { className: "w-5 h-5" })}
              <span className="font-medium capitalize">{healthData.overall_health}</span>
            </div>
            
            {/* Trend */}
            <div className="flex items-center space-x-2">
              {React.createElement(getTrendIcon(healthData.health_trend), { 
                className: `w-5 h-5 ${getTrendColor(healthData.health_trend)}` 
              })}
              <span className={`text-sm font-medium ${getTrendColor(healthData.health_trend)}`}>
                {Math.abs(healthData.trend_percentage)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Health Components Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { key: 'schedule_health', label: 'Schedule', icon: CalendarIcon },
          { key: 'budget_health', label: 'Budget', icon: CurrencyDollarIcon },
          { key: 'quality_health', label: 'Quality', icon: BeakerIcon },
          { key: 'team_health', label: 'Team', icon: UserGroupIcon },
          { key: 'scope_health', label: 'Scope', icon: AdjustmentsHorizontalIcon },
          { key: 'risk_health', label: 'Risk', icon: ShieldExclamationIcon }
        ].map(component => {
          const componentData = healthData[component.key as keyof ProjectHealth] as HealthComponent;
          const IconComponent = component.icon;
          
          return (
            <div
              key={component.key}
              className={`bg-white rounded-lg border p-4 cursor-pointer hover:shadow-md transition-shadow ${
                selectedComponent === component.key ? 'ring-2 ring-blue-500 border-blue-200' : 'border-gray-200'
              }`}
              onClick={() => setSelectedComponent(component.key)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <IconComponent className="w-5 h-5 text-gray-600" />
                  <h3 className="font-medium text-gray-900">{component.label}</h3>
                </div>
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getHealthColor(componentData.status)}`}>
                  {React.createElement(getHealthIcon(componentData.status), { className: "w-3 h-3" })}
                  <span className="capitalize">{componentData.status}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-gray-900">{componentData.score}</div>
                <div className="flex items-center space-x-1">
                  {React.createElement(getTrendIcon(componentData.trend), { 
                    className: `w-4 h-4 ${getTrendColor(componentData.trend)}` 
                  })}
                  <span className={`text-xs ${getTrendColor(componentData.trend)}`}>
                    {componentData.trend}
                  </span>
                </div>
              </div>
              
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      componentData.status === 'excellent' ? 'bg-green-500' :
                      componentData.status === 'good' ? 'bg-blue-500' :
                      componentData.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${componentData.score}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Alerts and Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Alerts */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Active Alerts</h3>
              <span className="text-sm text-gray-500">{healthData.active_alerts.length} alerts</span>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {healthData.active_alerts.length === 0 ? (
              <div className="p-6 text-center">
                <CheckCircleIcon className="mx-auto h-8 w-8 text-green-500" />
                <p className="text-sm text-gray-500 mt-2">No active alerts</p>
              </div>
            ) : (
              healthData.active_alerts.map(alert => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onClick={() => onAlertClick?.(alert)}
                />
              ))
            )}
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Recommendations</h3>
              <span className="text-sm text-gray-500">{healthData.recommendations.length} suggestions</span>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {healthData.recommendations.length === 0 ? (
              <div className="p-6 text-center">
                <SparklesIcon className="mx-auto h-8 w-8 text-blue-500" />
                <p className="text-sm text-gray-500 mt-2">No recommendations available</p>
              </div>
            ) : (
              healthData.recommendations.map(recommendation => (
                <RecommendationItem
                  key={recommendation.id}
                  recommendation={recommendation}
                  onClick={() => onRecommendationClick?.(recommendation)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Health Trend Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Health Trend</h3>
        <HealthTrendChart history={healthData.health_history} />
      </div>
    </div>
  );
};

// Compact Health View for dashboard widgets
const CompactHealthView: React.FC<{
  healthData: ProjectHealth;
  getHealthColor: (status: string) => string;
  getHealthIcon: (status: string) => React.ComponentType<any>;
}> = ({ healthData, getHealthColor, getHealthIcon }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900">Project Health</h3>
        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getHealthColor(healthData.overall_health)}`}>
          {React.createElement(getHealthIcon(healthData.overall_health), { className: "w-3 h-3" })}
          <span className="capitalize">{healthData.overall_health}</span>
        </div>
      </div>
      
      <div className="text-2xl font-bold text-gray-900 mb-2">{healthData.health_score}/100</div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        {[
          { label: 'Schedule', value: healthData.schedule_health.score, status: healthData.schedule_health.status },
          { label: 'Budget', value: healthData.budget_health.score, status: healthData.budget_health.status },
          { label: 'Quality', value: healthData.quality_health.score, status: healthData.quality_health.status },
          { label: 'Team', value: healthData.team_health.score, status: healthData.team_health.status }
        ].map(item => (
          <div key={item.label} className="flex justify-between">
            <span className="text-gray-600">{item.label}:</span>
            <span className={`font-medium ${
              item.status === 'excellent' ? 'text-green-600' :
              item.status === 'good' ? 'text-blue-600' :
              item.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Executive Health View for high-level overview
const ExecutiveHealthView: React.FC<{
  healthData: ProjectHealth;
  getHealthColor: (status: string) => string;
  getHealthIcon: (status: string) => React.ComponentType<any>;
  getTrendIcon: (trend: string) => React.ComponentType<any>;
  getTrendColor: (trend: string) => string;
}> = ({ healthData, getHealthColor, getHealthIcon, getTrendIcon, getTrendColor }) => {
  const criticalAlerts = healthData.active_alerts.filter(alert => alert.type === 'critical');
  const highPriorityRecommendations = healthData.recommendations.filter(rec => rec.priority === 'high');
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overall Status */}
        <div className="text-center">
          <div className={`inline-flex items-center space-x-3 px-6 py-4 rounded-lg border ${getHealthColor(healthData.overall_health)}`}>
            {React.createElement(getHealthIcon(healthData.overall_health), { className: "w-8 h-8" })}
            <div>
              <div className="text-2xl font-bold">{healthData.health_score}</div>
              <div className="text-sm font-medium capitalize">{healthData.overall_health}</div>
            </div>
          </div>
          
          <div className="flex items-center justify-center space-x-2 mt-3">
            {React.createElement(getTrendIcon(healthData.health_trend), { 
              className: `w-4 h-4 ${getTrendColor(healthData.health_trend)}` 
            })}
            <span className={`text-sm font-medium ${getTrendColor(healthData.health_trend)}`}>
              {Math.abs(healthData.trend_percentage)}% {healthData.health_trend}
            </span>
          </div>
        </div>

        {/* Key Metrics */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Key Metrics</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Completion:</span>
              <span className="font-medium">{healthData.key_metrics.completion_percentage}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">On-time Tasks:</span>
              <span className="font-medium">{healthData.key_metrics.tasks_on_time}/{healthData.key_metrics.total_tasks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Budget Used:</span>
              <span className="font-medium">{healthData.key_metrics.budget_utilization}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Team Velocity:</span>
              <span className="font-medium">{healthData.key_metrics.team_velocity} pts</span>
            </div>
          </div>
        </div>

        {/* Critical Issues */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Attention Required</h4>
          {criticalAlerts.length > 0 ? (
            <div className="space-y-2">
              {criticalAlerts.slice(0, 2).map(alert => (
                <div key={alert.id} className="flex items-start space-x-2">
                  <ShieldExclamationIcon className="w-4 h-4 text-red-500 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium text-red-900">{alert.title}</div>
                    <div className="text-red-700">{alert.description}</div>
                  </div>
                </div>
              ))}
              {criticalAlerts.length > 2 && (
                <div className="text-sm text-gray-500">
                  +{criticalAlerts.length - 2} more critical alerts
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500">No critical issues</div>
          )}
          
          {highPriorityRecommendations.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <LightBulbIcon className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-900">
                  {highPriorityRecommendations.length} high-priority recommendations
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Alert Item Component
const AlertItem: React.FC<{
  alert: HealthAlert;
  onClick: () => void;
}> = ({ alert, onClick }) => {
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return ShieldExclamationIcon;
      case 'warning': return ExclamationTriangleIcon;
      case 'info': return InformationCircleIcon;
      default: return InformationCircleIcon;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      case 'info': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const AlertIcon = getAlertIcon(alert.type);

  return (
    <div className="p-4 hover:bg-gray-50 cursor-pointer" onClick={onClick}>
      <div className="flex items-start space-x-3">
        <AlertIcon className={`w-5 h-5 mt-0.5 ${getAlertColor(alert.type)}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">{alert.title}</h4>
            <span className="text-xs text-gray-500">
              {new Date(alert.created_at).toLocaleDateString()}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
          {alert.action_required && (
            <div className="flex items-center space-x-1 mt-2">
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                Action Required
              </span>
            </div>
          )}
        </div>
        <ChevronRightIcon className="w-4 h-4 text-gray-400" />
      </div>
    </div>
  );
};

// Recommendation Item Component
const RecommendationItem: React.FC<{
  recommendation: HealthRecommendation;
  onClick: () => void;
}> = ({ recommendation, onClick }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-4 hover:bg-gray-50 cursor-pointer" onClick={onClick}>
      <div className="flex items-start space-x-3">
        <LightBulbIcon className="w-5 h-5 mt-0.5 text-blue-500" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">{recommendation.title}</h4>
            <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(recommendation.priority)}`}>
              {recommendation.priority}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">{recommendation.description}</p>
          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
            <span>Impact: {recommendation.expected_impact}</span>
            <span>Effort: {recommendation.effort_required}</span>
            <span>Time: {recommendation.implementation_time}</span>
          </div>
        </div>
        <ChevronRightIcon className="w-4 h-4 text-gray-400" />
      </div>
    </div>
  );
};

// Health Trend Chart Component (simplified)
const HealthTrendChart: React.FC<{
  history: HealthHistoryPoint[];
}> = ({ history }) => {
  return (
    <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="text-sm text-gray-500 mt-2">Health trend visualization</p>
        <p className="text-xs text-gray-400">Chart would show health scores over time</p>
      </div>
    </div>
  );
};

export default ProjectHealthMonitor;
