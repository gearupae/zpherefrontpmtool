import React, { useState, useEffect } from 'react';
import {
 ShieldExclamationIcon,
 ExclamationTriangleIcon,
 InformationCircleIcon,
 CheckCircleIcon,
 ClockIcon,
 UserGroupIcon,
 ChartBarIcon,
 ArrowTrendingUpIcon,
 ArrowTrendingDownIcon,
 CalendarIcon,
 BellIcon,
 CogIcon,
 EyeIcon,
 PencilIcon,
 PlusIcon,
 ArrowPathIcon,
 FireIcon,
 BoltIcon,
 ShieldCheckIcon,
 ExclamationCircleIcon,
 MinusCircleIcon,
 PlayIcon,
 PauseIcon,
 XMarkIcon,
 TagIcon,
 DocumentTextIcon,
 ChatBubbleLeftRightIcon,
 ArrowRightIcon,
 FunnelIcon,
 AdjustmentsHorizontalIcon,
 MagnifyingGlassIcon,
 ChevronDownIcon,
 ChevronRightIcon,
 LightBulbIcon,
 HandRaisedIcon
} from '@heroicons/react/24/outline';

interface Risk {
 id: string;
 title: string;
 description: string;
 category: 'technical' | 'business' | 'operational' | 'external' | 'financial' | 'legal' | 'security' | 'resource';
 probability: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
 impact: 'minimal' | 'low' | 'medium' | 'high' | 'critical';
 risk_score: number; // calculated from probability * impact
 status: 'identified' | 'assessed' | 'mitigating' | 'monitoring' | 'closed' | 'occurred';
 severity: 'low' | 'medium' | 'high' | 'critical';
 project_id?: string;
 project_name?: string;
 owner_id: string;
 owner_name: string;
 identified_by: string;
 identified_date: string;
 target_date?: string;
 closed_date?: string;
 occurrence_date?: string;
 
 // Risk details
 triggers: string[];
 root_causes: string[];
 potential_outcomes: string[];
 affected_areas: string[];
 stakeholders: string[];
 
 // Mitigation
 mitigation_strategies: MitigationStrategy[];
 contingency_plans: ContingencyPlan[];
 monitoring_indicators: MonitoringIndicator[];
 
 // Tracking
 risk_history: RiskHistoryEntry[];
 comments: RiskComment[];
 attachments: RiskAttachment[];
 
 // Metadata
 tags: string[];
 custom_fields: Record<string, any>;
 created_at: string;
 updated_at: string;
 last_reviewed: string;
 next_review: string;
}

interface MitigationStrategy {
 id: string;
 title: string;
 description: string;
 type: 'prevent' | 'reduce' | 'transfer' | 'accept';
 status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
 assigned_to: string;
 due_date?: string;
 estimated_cost?: number;
 estimated_effort?: number;
 effectiveness_rating?: number; // 1-10
 implementation_notes?: string;
}

interface ContingencyPlan {
 id: string;
 title: string;
 description: string;
 trigger_conditions: string[];
 action_steps: string[];
 assigned_to: string;
 estimated_duration?: number;
 estimated_cost?: number;
 approval_required: boolean;
 status: 'prepared' | 'activated' | 'completed';
}

interface MonitoringIndicator {
 id: string;
 name: string;
 description: string;
 metric_type: 'threshold' | 'trend' | 'event';
 current_value?: number;
 threshold_value?: number;
 unit?: string;
 frequency: 'daily' | 'weekly' | 'monthly';
 last_checked: string;
 status: 'normal' | 'warning' | 'critical';
}

interface RiskHistoryEntry {
 id: string;
 action: string;
 description: string;
 actor_id: string;
 actor_name: string;
 timestamp: string;
 old_values?: Record<string, any>;
 new_values?: Record<string, any>;
}

interface RiskComment {
 id: string;
 content: string;
 author_id: string;
 author_name: string;
 created_at: string;
 type: 'comment' | 'update' | 'review' | 'escalation';
}

interface RiskAttachment {
 id: string;
 name: string;
 type: string;
 size: number;
 url: string;
 uploaded_by: string;
 uploaded_at: string;
}

interface RiskMetrics {
 total_risks: number;
 active_risks: number;
 critical_risks: number;
 high_risks: number;
 medium_risks: number;
 low_risks: number;
 overdue_reviews: number;
 risks_by_category: Record<string, number>;
 risks_by_status: Record<string, number>;
 average_risk_score: number;
 trend_direction: 'improving' | 'stable' | 'worsening';
 new_risks_this_month: number;
 closed_risks_this_month: number;
 mitigation_effectiveness: number;
}

interface RiskDashboardProps {
 projectId?: string;
 mode?: 'project' | 'portfolio' | 'enterprise';
 onRiskClick?: (risk: Risk) => void;
 onCreateRisk?: () => void;
}

const RiskDashboard: React.FC<RiskDashboardProps> = ({
 projectId,
 mode = 'project',
 onRiskClick,
 onCreateRisk
}) => {
 const [risks, setRisks] = useState<Risk[]>([]);
 const [metrics, setMetrics] = useState<RiskMetrics | null>(null);
 const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
 const [currentView, setCurrentView] = useState<'dashboard' | 'matrix' | 'timeline' | 'list'>('dashboard');
 const [filterCategory, setFilterCategory] = useState<string>('all');
 const [filterSeverity, setFilterSeverity] = useState<string>('all');
 const [filterStatus, setFilterStatus] = useState<string>('all');
 const [searchQuery, setSearchQuery] = useState('');
 const [sortBy, setSortBy] = useState<'risk_score' | 'created_at' | 'next_review'>('risk_score');
 const [showClosedRisks, setShowClosedRisks] = useState(false);
 const [isLoading, setIsLoading] = useState(true);

 // Mock data for demonstration
 useEffect(() => {
 const mockRisks: Risk[] = [
 {
 id: 'risk-001',
 title: 'Third-party API Rate Limiting',
 description: 'Payment processing API may hit rate limits during peak traffic, causing transaction failures',
 category: 'technical',
 probability: 'medium',
 impact: 'high',
 risk_score: 15,
 status: 'mitigating',
 severity: 'high',
 project_id: projectId || 'project-1',
 project_name: 'E-commerce Platform',
 owner_id: 'user-1',
 owner_name: 'John Doe',
 identified_by: 'Jane Smith',
 identified_date: '2024-01-10T00:00:00Z',
 target_date: '2024-02-15T00:00:00Z',
 triggers: ['High traffic volume', 'API provider issues', 'Concurrent transactions'],
 root_causes: ['Single API provider dependency', 'No fallback mechanism', 'Insufficient testing'],
 potential_outcomes: ['Transaction failures', 'Revenue loss', 'Customer dissatisfaction'],
 affected_areas: ['Payment processing', 'Customer experience', 'Revenue'],
 stakeholders: ['Development Team', 'Product Manager', 'Business Owner'],
 mitigation_strategies: [
 {
 id: 'mit-001',
 title: 'Implement API Fallback',
 description: 'Set up secondary payment processor as fallback',
 type: 'prevent',
 status: 'in_progress',
 assigned_to: 'Dev Team',
 due_date: '2024-02-01T00:00:00Z',
 estimated_cost: 5000,
 estimated_effort: 40,
 effectiveness_rating: 8
 }
 ],
 contingency_plans: [
 {
 id: 'con-001',
 title: 'Emergency Payment Switch',
 description: 'Immediately switch to backup processor if primary fails',
 trigger_conditions: ['API error rate > 5%', 'Response time > 10s'],
 action_steps: ['Activate backup processor', 'Notify customers', 'Monitor performance'],
 assigned_to: 'DevOps Team',
 estimated_duration: 30,
 approval_required: false,
 status: 'prepared'
 }
 ],
 monitoring_indicators: [
 {
 id: 'mon-001',
 name: 'API Response Time',
 description: 'Average response time for payment API calls',
 metric_type: 'threshold',
 current_value: 2.5,
 threshold_value: 5.0,
 unit: 'seconds',
 frequency: 'daily',
 last_checked: '2024-01-22T10:00:00Z',
 status: 'normal'
 }
 ],
 risk_history: [],
 comments: [],
 attachments: [],
 tags: ['api', 'payment', 'infrastructure'],
 custom_fields: {},
 created_at: '2024-01-10T10:00:00Z',
 updated_at: '2024-01-22T14:30:00Z',
 last_reviewed: '2024-01-20T00:00:00Z',
 next_review: '2024-02-20T00:00:00Z'
 },
 {
 id: 'risk-002',
 title: 'Key Developer Departure',
 description: 'Lead developer may leave the company, causing knowledge transfer and delivery issues',
 category: 'resource',
 probability: 'low',
 impact: 'high',
 risk_score: 10,
 status: 'monitoring',
 severity: 'medium',
 project_id: projectId || 'project-1',
 project_name: 'E-commerce Platform',
 owner_id: 'user-2',
 owner_name: 'Mike Wilson',
 identified_by: 'HR Team',
 identified_date: '2024-01-05T00:00:00Z',
 target_date: '2024-03-01T00:00:00Z',
 triggers: ['Job market opportunities', 'Career advancement elsewhere', 'Work dissatisfaction'],
 root_causes: ['Limited career growth', 'Single point of failure', 'Knowledge concentration'],
 potential_outcomes: ['Project delays', 'Knowledge loss', 'Team disruption'],
 affected_areas: ['Development timeline', 'Team morale', 'Code quality'],
 stakeholders: ['HR', 'Development Team', 'Project Manager'],
 mitigation_strategies: [
 {
 id: 'mit-002',
 title: 'Knowledge Documentation',
 description: 'Document critical system knowledge and processes',
 type: 'reduce',
 status: 'planned',
 assigned_to: 'Lead Dev',
 due_date: '2024-02-10T00:00:00Z',
 estimated_effort: 20,
 effectiveness_rating: 7
 }
 ],
 contingency_plans: [],
 monitoring_indicators: [],
 risk_history: [],
 comments: [],
 attachments: [],
 tags: ['human-resources', 'knowledge-transfer'],
 custom_fields: {},
 created_at: '2024-01-05T09:00:00Z',
 updated_at: '2024-01-18T11:15:00Z',
 last_reviewed: '2024-01-15T00:00:00Z',
 next_review: '2024-02-15T00:00:00Z'
 },
 {
 id: 'risk-003',
 title: 'Data Privacy Regulation Changes',
 description: 'New privacy regulations may require significant compliance updates',
 category: 'legal',
 probability: 'high',
 impact: 'medium',
 risk_score: 12,
 status: 'assessed',
 severity: 'medium',
 owner_id: 'user-3',
 owner_name: 'Sarah Johnson',
 identified_by: 'Legal Team',
 identified_date: '2024-01-08T00:00:00Z',
 target_date: '2024-04-01T00:00:00Z',
 triggers: ['Government policy changes', 'Industry compliance requirements'],
 root_causes: ['Evolving regulatory landscape', 'Limited compliance monitoring'],
 potential_outcomes: ['Compliance violations', 'Legal penalties', 'Operational disruption'],
 affected_areas: ['Data handling', 'User privacy', 'Business operations'],
 stakeholders: ['Legal Team', 'Compliance Officer', 'Development Team'],
 mitigation_strategies: [],
 contingency_plans: [],
 monitoring_indicators: [],
 risk_history: [],
 comments: [],
 attachments: [],
 tags: ['compliance', 'legal', 'privacy'],
 custom_fields: {},
 created_at: '2024-01-08T14:00:00Z',
 updated_at: '2024-01-16T16:20:00Z',
 last_reviewed: '2024-01-16T00:00:00Z',
 next_review: '2024-02-16T00:00:00Z'
 }
 ];

 const mockMetrics: RiskMetrics = {
 total_risks: mockRisks.length,
 active_risks: mockRisks.filter(r => !['closed', 'occurred'].includes(r.status)).length,
 critical_risks: mockRisks.filter(r => r.severity === 'critical').length,
 high_risks: mockRisks.filter(r => r.severity === 'high').length,
 medium_risks: mockRisks.filter(r => r.severity === 'medium').length,
 low_risks: mockRisks.filter(r => r.severity === 'low').length,
 overdue_reviews: mockRisks.filter(r => new Date(r.next_review) < new Date()).length,
 risks_by_category: mockRisks.reduce((acc, risk) => {
 acc[risk.category] = (acc[risk.category] || 0) + 1;
 return acc;
 }, {} as Record<string, number>),
 risks_by_status: mockRisks.reduce((acc, risk) => {
 acc[risk.status] = (acc[risk.status] || 0) + 1;
 return acc;
 }, {} as Record<string, number>),
 average_risk_score: mockRisks.reduce((acc, risk) => acc + risk.risk_score, 0) / mockRisks.length,
 trend_direction: 'stable',
 new_risks_this_month: 2,
 closed_risks_this_month: 1,
 mitigation_effectiveness: 75
 };

 setRisks(mockRisks);
 setMetrics(mockMetrics);
 setIsLoading(false);
 }, [projectId]);

 const filteredRisks = risks.filter(risk => {
 if (!showClosedRisks && ['closed', 'occurred'].includes(risk.status)) return false;
 if (filterCategory !== 'all' && risk.category !== filterCategory) return false;
 if (filterSeverity !== 'all' && risk.severity !== filterSeverity) return false;
 if (filterStatus !== 'all' && risk.status !== filterStatus) return false;
 if (searchQuery && !risk.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
 !risk.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
 return true;
 });

 const sortedRisks = filteredRisks.sort((a, b) => {
 switch (sortBy) {
 case 'risk_score':
 return b.risk_score - a.risk_score;
 case 'created_at':
 return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
 case 'next_review':
 return new Date(a.next_review).getTime() - new Date(b.next_review).getTime();
 default:
 return 0;
 }
 });

 const getRiskColor = (severity: string) => {
 switch (severity) {
 case 'critical': return 'text-red-600 bg-red-100 border-red-200';
 case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
 case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
 case 'low': return 'text-green-600 bg-green-100 border-green-200';
 default: return 'text-gray-600 bg-gray-100 border-gray-200';
 }
 };

 const getRiskIcon = (severity: string) => {
 switch (severity) {
 case 'critical': return FireIcon;
 case 'high': return ShieldExclamationIcon;
 case 'medium': return ExclamationTriangleIcon;
 case 'low': return InformationCircleIcon;
 default: return InformationCircleIcon;
 }
 };

 const getStatusColor = (status: string) => {
 switch (status) {
 case 'identified': return 'bg-blue-100 text-blue-800';
 case 'assessed': return 'bg-yellow-100 text-yellow-800';
 case 'mitigating': return 'bg-orange-100 text-orange-800';
 case 'monitoring': return 'bg-purple-100 text-purple-800';
 case 'closed': return 'bg-green-100 text-green-800';
 case 'occurred': return 'bg-red-100 text-red-800';
 default: return 'bg-gray-100 text-gray-800';
 }
 };

 if (isLoading) {
 return (
 <div className="animate-pulse space-y-6">
 <div className="h-8 bg-gray-200 rounded w-1/3"></div>
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
 {[...Array(4)].map((_, i) => (
 <div key={i} className="h-24 bg-gray-200 rounded"></div>
 ))}
 </div>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-2xl font-bold text-gray-900">Risk Dashboard</h2>
 <p className="text-gray-600 mt-1">
 {mode === 'project' ? 'Project risk management and monitoring' : 
 mode === 'portfolio' ? 'Portfolio-wide risk oversight' : 
 'Enterprise risk management'}
 </p>
 </div>
 
 <div className="flex items-center space-x-3">
 <button
 onClick={() => setCurrentView('dashboard')}
 className={`py-2 rounded-md text-sm font-medium transition-colors ${
 currentView === 'dashboard' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'
 }`}
 >
 Dashboard
 </button>
 <button
 onClick={() => setCurrentView('matrix')}
 className={`py-2 rounded-md text-sm font-medium transition-colors ${
 currentView === 'matrix' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'
 }`}
 >
 Risk Matrix
 </button>
 <button
 onClick={() => setCurrentView('list')}
 className={`py-2 rounded-md text-sm font-medium transition-colors ${
 currentView === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'
 }`}
 >
 List View
 </button>
 
 <button
 onClick={onCreateRisk}
 className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
 >
 <PlusIcon className="w-5 h-5" />
 <span>Add Risk</span>
 </button>
 </div>
 </div>

 {/* Risk Metrics */}
 {metrics && (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 <RiskMetricCard
 title="Total Risks"
 value={metrics.total_risks}
 icon={ShieldExclamationIcon}
 color="text-blue-600"
 />
 <RiskMetricCard
 title="Critical & High"
 value={metrics.critical_risks + metrics.high_risks}
 icon={FireIcon}
 color="text-red-600"
 trend={metrics.trend_direction}
 />
 <RiskMetricCard
 title="Active Mitigations"
 value={risks.filter(r => r.mitigation_strategies.some(m => m.status === 'in_progress')).length}
 icon={ShieldCheckIcon}
 color="text-green-600"
 />
 <RiskMetricCard
 title="Overdue Reviews"
 value={metrics.overdue_reviews}
 icon={ClockIcon}
 color="text-orange-600"
 urgent={metrics.overdue_reviews > 0}
 />
 </div>
 )}

 {/* Filters and Search */}
 <div className="bg-white rounded-lg border border-gray-200 p-4">
 <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
 {/* Search */}
 <div className="relative flex-1 max-w-md">
 <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
 <input
 type="text"
 placeholder="Search risks..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
 />
 </div>

 {/* Filters */}
 <div className="flex items-center space-x-4">
 <select
 value={filterCategory}
 onChange={(e) => setFilterCategory(e.target.value)}
 className="border border-gray-300 rounded-md py-2 text-sm"
 >
 <option value="all">All Categories</option>
 <option value="technical">Technical</option>
 <option value="business">Business</option>
 <option value="operational">Operational</option>
 <option value="external">External</option>
 <option value="financial">Financial</option>
 <option value="legal">Legal</option>
 <option value="security">Security</option>
 <option value="resource">Resource</option>
 </select>

 <select
 value={filterSeverity}
 onChange={(e) => setFilterSeverity(e.target.value)}
 className="border border-gray-300 rounded-md py-2 text-sm"
 >
 <option value="all">All Severities</option>
 <option value="critical">Critical</option>
 <option value="high">High</option>
 <option value="medium">Medium</option>
 <option value="low">Low</option>
 </select>

 <select
 value={filterStatus}
 onChange={(e) => setFilterStatus(e.target.value)}
 className="border border-gray-300 rounded-md py-2 text-sm"
 >
 <option value="all">All Statuses</option>
 <option value="identified">Identified</option>
 <option value="assessed">Assessed</option>
 <option value="mitigating">Mitigating</option>
 <option value="monitoring">Monitoring</option>
 <option value="closed">Closed</option>
 </select>

 <label className="flex items-center space-x-2 text-sm">
 <input
 type="checkbox"
 checked={showClosedRisks}
 onChange={(e) => setShowClosedRisks(e.target.checked)}
 className="h-4 w-4 text-blue-600 rounded"
 />
 <span>Show closed</span>
 </label>
 </div>
 </div>
 </div>

 {/* Content based on view */}
 {currentView === 'dashboard' && (
 <RiskDashboardView 
 risks={sortedRisks} 
 metrics={metrics!}
 getRiskColor={getRiskColor}
 getRiskIcon={getRiskIcon}
 getStatusColor={getStatusColor}
 onRiskClick={(risk) => {
 setSelectedRisk(risk);
 onRiskClick?.(risk);
 }}
 />
 )}

 {currentView === 'matrix' && (
 <RiskMatrixView 
 risks={sortedRisks}
 onRiskClick={(risk) => {
 setSelectedRisk(risk);
 onRiskClick?.(risk);
 }}
 />
 )}

 {currentView === 'list' && (
 <RiskListView 
 risks={sortedRisks}
 getRiskColor={getRiskColor}
 getRiskIcon={getRiskIcon}
 getStatusColor={getStatusColor}
 onRiskClick={(risk) => {
 setSelectedRisk(risk);
 onRiskClick?.(risk);
 }}
 />
 )}

 {/* Risk Detail Modal */}
 {selectedRisk && (
 <RiskDetailModal
 risk={selectedRisk}
 onClose={() => setSelectedRisk(null)}
 onUpdate={(updatedRisk) => {
 setRisks(prev => prev.map(r => r.id === updatedRisk.id ? updatedRisk : r));
 setSelectedRisk(updatedRisk);
 }}
 getRiskColor={getRiskColor}
 getRiskIcon={getRiskIcon}
 getStatusColor={getStatusColor}
 />
 )}
 </div>
 );
};

// Risk Metric Card Component
const RiskMetricCard: React.FC<{
 title: string;
 value: number;
 icon: React.ComponentType<any>;
 color: string;
 trend?: string;
 urgent?: boolean;
}> = ({ title, value, icon: Icon, color, trend, urgent }) => {
 return (
 <div className={`bg-white rounded-lg border p-4 ${urgent ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-gray-600">{title}</p>
 <div className="flex items-center space-x-2">
 <p className={`text-2xl font-bold ${urgent ? 'text-red-600' : color}`}>{value}</p>
 {trend && (
 <div className={`flex items-center ${trend === 'improving' ? 'text-green-600' : 
 trend === 'worsening' ? 'text-red-600' : 'text-gray-600'}`}>
 {trend === 'improving' ? (
 <ArrowTrendingDownIcon className="w-4 h-4" />
 ) : trend === 'worsening' ? (
 <ArrowTrendingUpIcon className="w-4 h-4" />
 ) : null}
 </div>
 )}
 </div>
 </div>
 <Icon className={`w-8 h-8 ${urgent ? 'text-red-600' : color}`} />
 </div>
 </div>
 );
};

// Dashboard View Component
const RiskDashboardView: React.FC<{
 risks: Risk[];
 metrics: RiskMetrics;
 getRiskColor: (severity: string) => string;
 getRiskIcon: (severity: string) => React.ComponentType<any>;
 getStatusColor: (status: string) => string;
 onRiskClick: (risk: Risk) => void;
}> = ({ risks, metrics, getRiskColor, getRiskIcon, getStatusColor, onRiskClick }) => {
 const criticalRisks = risks.filter(r => r.severity === 'critical');
 const highRisks = risks.filter(r => r.severity === 'high');
 const overdueReviews = risks.filter(r => new Date(r.next_review) < new Date());

 return (
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Critical Risks */}
 <div className="lg:col-span-2">
 <div className="bg-white rounded-lg border border-gray-200">
 <div className="px-6 py-4 border-b border-gray-200">
 <h3 className="text-lg font-medium text-gray-900">Critical & High Priority Risks</h3>
 </div>
 <div className="divide-y divide-gray-200">
 {[...criticalRisks, ...highRisks].slice(0, 5).map(risk => (
 <RiskItem
 key={risk.id}
 risk={risk}
 getRiskColor={getRiskColor}
 getRiskIcon={getRiskIcon}
 getStatusColor={getStatusColor}
 onRiskClick={onRiskClick}
 compact={true}
 />
 ))}
 {[...criticalRisks, ...highRisks].length === 0 && (
 <div className="p-6 text-center">
 <CheckCircleIcon className="mx-auto h-8 w-8 text-green-500" />
 <p className="text-sm text-gray-500 mt-2">No critical or high priority risks</p>
 </div>
 )}
 </div>
 </div>
 </div>

 {/* Side Panel */}
 <div className="space-y-6">
 {/* Quick Stats */}
 <div className="bg-white rounded-lg border border-gray-200 p-4">
 <h4 className="text-sm font-medium text-gray-900 mb-3">Risk Distribution</h4>
 <div className="space-y-2">
 {Object.entries(metrics.risks_by_category).map(([category, count]) => (
 <div key={category} className="flex justify-between text-sm">
 <span className="text-gray-600 capitalize">{category.replace('_', ' ')}</span>
 <span className="font-medium">{count}</span>
 </div>
 ))}
 </div>
 </div>

 {/* Overdue Reviews */}
 <div className="bg-white rounded-lg border border-gray-200">
 <div className="px-4 py-3 border-b border-gray-200">
 <h4 className="text-sm font-medium text-gray-900">Overdue Reviews</h4>
 </div>
 <div className="divide-y divide-gray-200">
 {overdueReviews.slice(0, 3).map(risk => (
 <div key={risk.id} className="p-3">
 <h5 className="text-sm font-medium text-gray-900 truncate">{risk.title}</h5>
 <p className="text-xs text-red-600 mt-1">
 Due: {new Date(risk.next_review).toLocaleDateString()}
 </p>
 </div>
 ))}
 {overdueReviews.length === 0 && (
 <div className="p-4 text-center">
 <CheckCircleIcon className="mx-auto h-6 w-6 text-green-500" />
 <p className="text-xs text-gray-500 mt-1">All reviews up to date</p>
 </div>
 )}
 </div>
 </div>

 {/* Recent Activity */}
 <div className="bg-white rounded-lg border border-gray-200">
 <div className="px-4 py-3 border-b border-gray-200">
 <h4 className="text-sm font-medium text-gray-900">Recent Activity</h4>
 </div>
 <div className="p-4">
 <div className="space-y-3 text-sm">
 <div className="flex items-start space-x-2">
 <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
 <div>
 <p className="text-gray-900">New risk identified</p>
 <p className="text-gray-500 text-xs">2 hours ago</p>
 </div>
 </div>
 <div className="flex items-start space-x-2">
 <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
 <div>
 <p className="text-gray-900">Mitigation completed</p>
 <p className="text-gray-500 text-xs">1 day ago</p>
 </div>
 </div>
 <div className="flex items-start space-x-2">
 <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
 <div>
 <p className="text-gray-900">Risk review updated</p>
 <p className="text-gray-500 text-xs">3 days ago</p>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
};

// Risk Matrix View Component
const RiskMatrixView: React.FC<{
 risks: Risk[];
 onRiskClick: (risk: Risk) => void;
}> = ({ risks, onRiskClick }) => {
 const probabilities = ['very_low', 'low', 'medium', 'high', 'very_high'];
 const impacts = ['minimal', 'low', 'medium', 'high', 'critical'];

 const getRisksByCell = (probability: string, impact: string) => {
 return risks.filter(r => r.probability === probability && r.impact === impact);
 };

 const getCellColor = (probability: string, impact: string) => {
 const probIndex = probabilities.indexOf(probability);
 const impactIndex = impacts.indexOf(impact);
 const score = (probIndex + 1) * (impactIndex + 1);
 
 if (score >= 20) return 'bg-red-500';
 if (score >= 12) return 'bg-orange-500';
 if (score >= 6) return 'bg-yellow-500';
 return 'bg-green-500';
 };

 return (
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className="text-lg font-medium text-gray-900 mb-6">Risk Assessment Matrix</h3>
 
 <div className="grid grid-cols-6 gap-2">
 {/* Header */}
 <div></div>
 {impacts.map(impact => (
 <div key={impact} className="text-center text-sm font-medium text-gray-700 p-2 capitalize">
 {impact}
 </div>
 ))}
 
 {/* Matrix */}
 {probabilities.slice().reverse().map(probability => (
 <React.Fragment key={probability}>
 <div className="text-sm font-medium text-gray-700 p-2 capitalize flex items-center">
 {probability.replace('_', ' ')}
 </div>
 {impacts.map(impact => {
 const cellRisks = getRisksByCell(probability, impact);
 return (
 <div
 key={`${probability}-${impact}`}
 className={`relative border border-gray-300 p-2 min-h-[80px] ${
 cellRisks.length > 0 ? 'cursor-pointer hover:opacity-80' : ''
 }`}
 style={{ backgroundColor: getCellColor(probability, impact) + '20' }}
 >
 {cellRisks.length > 0 && (
 <div className="text-xs space-y-1">
 {cellRisks.slice(0, 2).map(risk => (
 <div
 key={risk.id}
 onClick={() => onRiskClick(risk)}
 className="bg-white p-1 rounded shadow-sm truncate hover:bg-gray-50"
 >
 {risk.title}
 </div>
 ))}
 {cellRisks.length > 2 && (
 <div className="text-gray-500 text-center">
 +{cellRisks.length - 2} more
 </div>
 )}
 </div>
 )}
 </div>
 );
 })}
 </React.Fragment>
 ))}
 </div>
 
 {/* Legend */}
 <div className="mt-6 flex items-center space-x-6 text-sm">
 <div className="flex items-center space-x-2">
 <div className="w-4 h-4 bg-red-500 rounded"></div>
 <span>Critical (20-25)</span>
 </div>
 <div className="flex items-center space-x-2">
 <div className="w-4 h-4 bg-orange-500 rounded"></div>
 <span>High (12-19)</span>
 </div>
 <div className="flex items-center space-x-2">
 <div className="w-4 h-4 bg-yellow-500 rounded"></div>
 <span>Medium (6-11)</span>
 </div>
 <div className="flex items-center space-x-2">
 <div className="w-4 h-4 bg-green-500 rounded"></div>
 <span>Low (1-5)</span>
 </div>
 </div>
 </div>
 );
};

// Risk List View Component
const RiskListView: React.FC<{
 risks: Risk[];
 getRiskColor: (severity: string) => string;
 getRiskIcon: (severity: string) => React.ComponentType<any>;
 getStatusColor: (status: string) => string;
 onRiskClick: (risk: Risk) => void;
}> = ({ risks, getRiskColor, getRiskIcon, getStatusColor, onRiskClick }) => {
 return (
 <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
 <div className="divide-y divide-gray-200">
 {risks.length === 0 ? (
 <div className="p-8 text-center">
 <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
 <h3 className="mt-2 text-sm font-medium text-gray-900">No risks found</h3>
 <p className="mt-1 text-sm text-gray-500">
 Try adjusting your filters or search criteria.
 </p>
 </div>
 ) : (
 risks.map(risk => (
 <RiskItem
 key={risk.id}
 risk={risk}
 getRiskColor={getRiskColor}
 getRiskIcon={getRiskIcon}
 getStatusColor={getStatusColor}
 onRiskClick={onRiskClick}
 />
 ))
 )}
 </div>
 </div>
 );
};

// Risk Item Component
const RiskItem: React.FC<{
 risk: Risk;
 getRiskColor: (severity: string) => string;
 getRiskIcon: (severity: string) => React.ComponentType<any>;
 getStatusColor: (status: string) => string;
 onRiskClick: (risk: Risk) => void;
 compact?: boolean;
}> = ({ risk, getRiskColor, getRiskIcon, getStatusColor, onRiskClick, compact = false }) => {
 const RiskIcon = getRiskIcon(risk.severity);
 
 return (
 <div
 className={`${compact ? 'p-4' : 'p-6'} hover:bg-gray-50 cursor-pointer`}
 onClick={() => onRiskClick(risk)}
 >
 <div className="flex items-start justify-between">
 <div className="flex items-start space-x-3 flex-1 min-w-0">
 <div className={`flex-shrink-0 p-1 rounded-full border ${getRiskColor(risk.severity)}`}>
 <RiskIcon className="w-4 h-4" />
 </div>
 
 <div className="flex-1 min-w-0">
 <div className="flex items-center space-x-3 mb-1">
 <h3 className={`${compact ? 'text-sm' : 'text-lg'} font-medium text-gray-900 truncate`}>
 {risk.title}
 </h3>
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(risk.status)}`}>
 {risk.status.replace('_', ' ')}
 </span>
 <span className={`inline-flex items-center px-2 rounded text-xs font-medium ${getRiskColor(risk.severity)}`}>
 {risk.severity}
 </span>
 </div>
 
 <p className={`${compact ? 'text-xs' : 'text-sm'} text-gray-600 ${compact ? 'line-clamp-1' : 'line-clamp-2'} mb-2`}>
 {risk.description}
 </p>
 
 {!compact && (
 <div className="flex items-center space-x-6 text-sm text-gray-500">
 <span>Score: {risk.risk_score}</span>
 <span>Owner: {risk.owner_name}</span>
 <span>Next Review: {new Date(risk.next_review).toLocaleDateString()}</span>
 {risk.project_name && <span>Project: {risk.project_name}</span>}
 </div>
 )}
 </div>
 </div>
 
 <div className="flex items-center space-x-2 ml-4">
 {risk.mitigation_strategies.length > 0 && (
 <span className="text-xs bg-blue-100 text-blue-700 px-2 rounded-full">
 {risk.mitigation_strategies.length} mitigation{risk.mitigation_strategies.length !== 1 ? 's' : ''}
 </span>
 )}
 <ArrowRightIcon className="w-4 h-4 text-gray-400" />
 </div>
 </div>
 </div>
 );
};

// Risk Detail Modal (placeholder - would be fully implemented)
const RiskDetailModal: React.FC<{
 risk: Risk;
 onClose: () => void;
 onUpdate: (risk: Risk) => void;
 getRiskColor: (severity: string) => string;
 getRiskIcon: (severity: string) => React.ComponentType<any>;
 getStatusColor: (status: string) => string;
}> = ({ risk, onClose, onUpdate, getRiskColor, getRiskIcon, getStatusColor }) => {
 return (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
 <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
 <div className="px-6 py-4 border-b border-gray-200">
 <div className="flex items-center justify-between">
 <h3 className="text-lg font-medium text-gray-900">{risk.title}</h3>
 <button
 onClick={onClose}
 className="text-gray-400 hover:text-gray-600"
 >
 <XMarkIcon className="w-6 h-6" />
 </button>
 </div>
 </div>
 
 <div className="px-6 py-4">
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <div>
 <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
 <p className="text-sm text-gray-700">{risk.description}</p>
 
 <h4 className="text-sm font-medium text-gray-900 mt-4 mb-2">Potential Outcomes</h4>
 <ul className="text-sm text-gray-700 list-disc list-inside">
 {risk.potential_outcomes.map((outcome, index) => (
 <li key={index}>{outcome}</li>
 ))}
 </ul>
 </div>
 
 <div>
 <h4 className="text-sm font-medium text-gray-900 mb-2">Risk Details</h4>
 <div className="space-y-2 text-sm">
 <div className="flex justify-between">
 <span className="text-gray-600">Severity:</span>
 <span className={`px-2 rounded text-xs font-medium ${getRiskColor(risk.severity)}`}>
 {risk.severity}
 </span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-600">Status:</span>
 <span className={`px-2 rounded text-xs font-medium ${getStatusColor(risk.status)}`}>
 {risk.status}
 </span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-600">Risk Score:</span>
 <span className="font-medium">{risk.risk_score}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-600">Owner:</span>
 <span className="font-medium">{risk.owner_name}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-600">Next Review:</span>
 <span className="font-medium">{new Date(risk.next_review).toLocaleDateString()}</span>
 </div>
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
 onClick={() => {
 // Edit functionality would go here
 console.log('Edit risk:', risk.id);
 }}
 className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
 >
 Edit Risk
 </button>
 </div>
 </div>
 </div>
 );
};

export default RiskDashboard;
