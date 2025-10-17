import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

interface VelocityData {
  id: string;
  team_id: string;
  period_start: string;
  period_end: string;
  story_points_completed: number;
  hours_logged: number;
  team_capacity_hours: number;
  velocity_score: number;
  rework_hours?: number;
  bugs_introduced?: number;
  bugs_fixed?: number;
}

interface VelocityTrend {
  team_id: string;
  periods: Array<{
    start: string;
    end: string;
    velocity: number;
    story_points: number;
    hours: number;
  }>;
  avg_velocity: number;
  velocity_trend: 'increasing' | 'decreasing' | 'stable';
  trend_confidence: number;
  capacity_utilization: number;
  quality_trend: string;
  predictions: {
    next_sprint?: number;
    confidence?: number;
  };
}

interface EstimationAccuracy {
  estimator_id: string;
  total_estimates: number;
  accurate_estimates: number;
  accuracy_percentage: number;
  avg_variance_percentage: number;
  improvement_trend: string;
  common_overestimation_factors: string[];
  common_underestimation_factors: string[];
}

const VelocityDashboard: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const [velocityData, setVelocityData] = useState<VelocityData[]>([]);
  const [velocityTrend, setVelocityTrend] = useState<VelocityTrend | null>(null);
  const [accuracyData, setAccuracyData] = useState<EstimationAccuracy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'velocity' | 'accuracy' | 'predictions'>('velocity');
  const [selectedPeriods, setSelectedPeriods] = useState(6);

  useEffect(() => {
    if (teamId) {
      loadVelocityData();
      loadVelocityTrend();
    }
  }, [teamId, selectedPeriods]);

  const loadVelocityData = async () => {
    try {
      const response = await fetch(`/api/v1/teams/${teamId}/velocity?limit=${selectedPeriods}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setVelocityData(data);
      }
    } catch (error) {
      console.error('Failed to load velocity data:', error);
    }
  };

  const loadVelocityTrend = async () => {
    try {
      const response = await fetch(`/api/v1/teams/${teamId}/velocity-trend?periods=${selectedPeriods}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setVelocityTrend(data);
      }
    } catch (error) {
      console.error('Failed to load velocity trend:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing': return 'text-green-600 bg-green-100';
      case 'decreasing': return 'text-red-600 bg-red-100';
      case 'stable': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'decreasing':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'stable':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
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
      day: 'numeric'
    });
  };

  const renderVelocityChart = () => {
    if (!velocityData.length) return null;

    const maxVelocity = Math.max(...velocityData.map(d => d.velocity_score));
    const chartHeight = 200;

    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Velocity Trend</h3>
        
        <div className="relative">
          <svg width="100%" height={chartHeight} className="overflow-visible">
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((value) => (
              <g key={value}>
                <line
                  x1="0"
                  y1={chartHeight - (value / 100) * chartHeight}
                  x2="100%"
                  y2={chartHeight - (value / 100) * chartHeight}
                  stroke="#f3f4f6"
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y={chartHeight - (value / 100) * chartHeight - 5}
                  fontSize="12"
                  fill="#6b7280"
                >
                  {value}
                </text>
              </g>
            ))}
            
            {/* Velocity line */}
            <polyline
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
              points={velocityData
                .map((d, index) => {
                  const x = (index / (velocityData.length - 1)) * 100;
                  const y = chartHeight - (d.velocity_score / maxVelocity) * chartHeight;
                  return `${x}%,${y}`;
                })
                .join(' ')}
            />
            
            {/* Data points */}
            {velocityData.map((d, index) => {
              const x = (index / (velocityData.length - 1)) * 100;
              const y = chartHeight - (d.velocity_score / maxVelocity) * chartHeight;
              return (
                <circle
                  key={d.id}
                  cx={`${x}%`}
                  cy={y}
                  r="4"
                  fill="#3b82f6"
                  className="hover:r-6 transition-all cursor-pointer"
                >
                  <title>{`Period: ${formatDate(d.period_start)} - ${formatDate(d.period_end)}\nVelocity: ${d.velocity_score.toFixed(1)}\nStory Points: ${d.story_points_completed}`}</title>
                </circle>
              );
            })}
          </svg>
          
          {/* X-axis labels */}
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            {velocityData.map((d) => (
              <span key={d.id}>
                {formatDate(d.period_start)}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderVelocityMetrics = () => {
    if (!velocityTrend) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Average Velocity</dt>
                <dd className="text-lg font-medium text-gray-900">
                  {velocityTrend.avg_velocity.toFixed(1)}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getTrendColor(velocityTrend.velocity_trend)}`}>
                {getTrendIcon(velocityTrend.velocity_trend)}
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Trend</dt>
                <dd className="text-lg font-medium text-gray-900 capitalize">
                  {velocityTrend.velocity_trend}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Capacity Utilization</dt>
                <dd className="text-lg font-medium text-gray-900">
                  {(velocityTrend.capacity_utilization * 100).toFixed(1)}%
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Quality Trend</dt>
                <dd className="text-lg font-medium text-gray-900 capitalize">
                  {velocityTrend.quality_trend}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderVelocityDetails = () => {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Sprint Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sprint Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Velocity Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Story Points
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours Logged
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capacity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilization
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {velocityData.map((velocity) => {
                const utilization = velocity.team_capacity_hours > 0 
                  ? (velocity.hours_logged / velocity.team_capacity_hours) * 100 
                  : 0;
                
                return (
                  <tr key={velocity.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatDate(velocity.period_start)} - {formatDate(velocity.period_end)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">
                          {velocity.velocity_score.toFixed(1)}
                        </div>
                        <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${Math.min(100, velocity.velocity_score)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {velocity.story_points_completed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {velocity.hours_logged}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {velocity.team_capacity_hours}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm text-gray-900">{utilization.toFixed(1)}%</span>
                        <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              utilization > 90 ? 'bg-red-500' :
                              utilization > 80 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(100, utilization)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPredictions = () => {
    if (!velocityTrend?.predictions) return null;

    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Velocity Predictions</h3>
        
        <div className="space-y-4">
          {velocityTrend.predictions.next_sprint && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-blue-900">Next Sprint Prediction</h4>
                  <p className="text-lg font-semibold text-blue-800">
                    {velocityTrend.predictions.next_sprint.toFixed(1)} velocity points
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm text-blue-600">Confidence</span>
                  <div className="text-lg font-medium text-blue-800">
                    {((velocityTrend.predictions.confidence || 0) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
              
              <div className="mt-3 w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${(velocityTrend.predictions.confidence || 0) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Trend Analysis</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Direction</span>
                  <span className={`text-sm font-medium ${getTrendColor(velocityTrend.velocity_trend)} px-2 rounded`}>
                    {velocityTrend.velocity_trend}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Confidence</span>
                  <span className="text-sm font-medium text-gray-900">
                    {(velocityTrend.trend_confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Recommendations</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {velocityTrend.velocity_trend === 'decreasing' && (
                  <>
                    <li>• Review sprint planning process</li>
                    <li>• Check for blockers and dependencies</li>
                    <li>• Consider team workload balance</li>
                  </>
                )}
                {velocityTrend.velocity_trend === 'increasing' && (
                  <>
                    <li>• Maintain current practices</li>
                    <li>• Consider taking on more work</li>
                    <li>• Share best practices with other teams</li>
                  </>
                )}
                {velocityTrend.velocity_trend === 'stable' && (
                  <>
                    <li>• Look for optimization opportunities</li>
                    <li>• Consider process improvements</li>
                    <li>• Maintain team consistency</li>
                  </>
                )}
              </ul>
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
          <h1 className="text-3xl font-bold text-gray-900">Velocity Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Track team velocity and estimation accuracy over time
          </p>
        </div>
        <div>
          <label htmlFor="periods" className="block text-sm font-medium text-gray-700 mb-1">
            Time Period
          </label>
          <select
            id="periods"
            value={selectedPeriods}
            onChange={(e) => setSelectedPeriods(parseInt(e.target.value))}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value={3}>Last 3 sprints</option>
            <option value={6}>Last 6 sprints</option>
            <option value={12}>Last 12 sprints</option>
          </select>
        </div>
      </div>

      {/* Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex space-x-8">
          {[
            { key: 'velocity', label: 'Velocity Tracking' },
            { key: 'accuracy', label: 'Estimation Accuracy' },
            { key: 'predictions', label: 'Predictions' }
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
      {activeView === 'velocity' && (
        <div className="space-y-6">
          {renderVelocityMetrics()}
          {renderVelocityChart()}
          {renderVelocityDetails()}
        </div>
      )}

      {activeView === 'predictions' && (
        <div className="space-y-6">
          {renderVelocityMetrics()}
          {renderPredictions()}
        </div>
      )}

      {activeView === 'accuracy' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Estimation Accuracy</h3>
            <p className="text-gray-500">
              Accuracy tracking coming soon. This will show individual and team-wide estimation accuracy trends.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VelocityDashboard;
