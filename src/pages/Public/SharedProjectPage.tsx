import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { encodeShareIdCompact, slugify } from '../../utils/shortLink';
import {
  CalendarIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PauseIcon,
  ArchiveBoxIcon,
  FolderIcon,
  ListBulletIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

interface SharedProject {
  id: number;
  name: string;
  description: string;
  status: string;
  priority: string;
  budget: number | null;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

interface SharedTaskComment {
  id: string | number;
  content: string;
  created_at: string;
}

interface SharedTask {
  id: number | string;
  title: string;
  description: string;
  status: string;
  priority: string;
  start_date?: string | null;
  due_date: string | null;
  completed_date?: string | null;
  created_at: string;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  assignee?: { id: string; name?: string; avatar_url?: string } | null;
  assignees?: Array<{ id: string; name?: string; avatar_url?: string; is_primary?: boolean }>;
  comments?: SharedTaskComment[];
}

interface ProjectComment {
  id: string;
  content: string;
  author_name: string;
  is_public: boolean;
  created_at: string;
}

interface RequirementItem {
  id: string;
  name: string;
  description?: string;
  acceptance_criteria?: string[];
  is_completed?: boolean;
  completion_date?: string | null;
  original_effort_estimate?: number | null;
  current_effort_estimate?: number | null;
  actual_effort?: number | null;
}

interface SharedProjectData {
  message: string;
  share_id: string;
  public_access: boolean;
  project: SharedProject;
  tasks: SharedTask[];
  requirements?: RequirementItem[];
  team?: {
    members: Array<{
      id: string;
      user_id: string;
      role: string;
      user?: {
        id: string;
        first_name?: string;
        last_name?: string;
        full_name?: string;
        email?: string;
        avatar_url?: string;
      };
    }>;
    count?: number;
  };
  organization: {
    name: string;
  };
  customer?: {
    id: string;
    display_name?: string;
    company_name?: string;
    email?: string;
  } | null;
  project_comments?: ProjectComment[];
  generated_at: string;
}

const SharedProjectPage: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const [projectData, setProjectData] = useState<SharedProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Public project comment state
  const [projectComment, setProjectComment] = useState({ content: '', name: '' });
  const [isSubmittingProjectComment, setIsSubmittingProjectComment] = useState(false);
  // Tabs for left column
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'requirements'>('overview');

  // Short link state must be declared unconditionally (before any early returns)
  const [copied, setCopied] = useState(false);
  const shortLink = useMemo(() => {
    const name = projectData?.project?.name || 'project';
    if (!shareId) return null;
    const code = encodeShareIdCompact(shareId);
    if (!code) return null;
    const slug = slugify(name);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/p/${slug}-${code}`;
  }, [shareId, projectData?.project?.name]);

  const copyShortLink = async () => {
    if (!shortLink) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shortLink);
      } else {
        // Fallback
        const el = document.createElement('textarea');
        el.value = shortLink;
        el.setAttribute('readonly', '');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    const fetchSharedProject = async () => {
      if (!shareId) {
        setError('Invalid share link');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`http://localhost:8000/api/v1/analytics/shared/project/${shareId}`);
        
        if (!response.ok) {
          throw new Error('Project not found or link expired');
        }

        const data = await response.json();
        setProjectData(data);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load project');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSharedProject();
  }, [shareId]);

  const getStatusColor = (status: string) => {
    // Monochrome light badge
    return 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  const getPriorityColor = (priority: string) => {
    // Monochrome light badge
    return 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleProjectCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareId || !projectComment.content.trim()) return;
    setIsSubmittingProjectComment(true);
    try {
      const response = await fetch(`http://localhost:8000/api/v1/analytics/shared/project/${shareId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: projectComment.content,
          name: projectComment.name || undefined,
        }),
      });
      if (response.ok) {
        const newComment = await response.json();
        if (projectData) {
          setProjectData({
            ...projectData,
            project_comments: [newComment, ...(projectData.project_comments || [])],
          });
          setProjectComment((prev) => ({ ...prev, content: '' }));
        }
      }
    } catch (err) {
      // no-op
    } finally {
      setIsSubmittingProjectComment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !projectData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-700" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Project Not Found</h3>
          <p className="mt-1 text-sm text-gray-600">{error || 'The project you\'re looking for doesn\'t exist or the link has expired.'}</p>
        </div>
      </div>
    );
  }

  const { project, tasks, organization, team, customer } = projectData;

// Extract roadmap and requirements from response or fallback custom_fields if present
const customFields: any = (project as any)?.custom_fields || {};
const roadmap: Array<{ id?: string; title?: string; done?: boolean }> = Array.isArray(customFields.roadmap) ? customFields.roadmap : [];
// Prefer backend-provided requirements (ProjectScope) and map to display format; fallback to custom_fields.requirements
const reqFromApi: RequirementItem[] = Array.isArray(projectData.requirements) ? projectData.requirements : [];
const requirements: Array<{ id?: string; title?: string; done?: boolean } | { heading?: string; items?: Array<{ id?: string; title?: string; done?: boolean }> }> =
  reqFromApi.length > 0
    ? reqFromApi.map((r) => ({ id: r.id, title: r.name, done: !!r.is_completed }))
    : (Array.isArray(customFields.requirements) ? customFields.requirements : []);


  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="w-full px-4 lg:px-8 py-3">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                <div className="h-16 w-16 bg-black rounded-xl flex items-center justify-center shadow-sm">
                  <FolderIcon className="h-10 w-10 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-black mb-2 px-1">{project.name}</h1>
                <div className="flex flex-wrap items-center gap-2">
                  {shortLink ? (
                    <button
                      onClick={copyShortLink}
                      className="ml-auto inline-flex items-center px-2 py-1 rounded-md bg-black text-white text-xs font-medium hover:bg-gray-800 transition-colors"
                      title={shortLink}
                    >
                      {copied ? 'Copied' : 'Copy link'}
                    </button>
                  ) : null}
                  <button
                    onClick={async () => {
                      if (!shareId) return;
                      try {
                        const res = await fetch(`http://localhost:8000/api/v1/analytics/shared/project/${shareId}/pdf`, {
                          headers: { Accept: 'application/pdf' },
                        });
                        if (!res.ok) throw new Error('Failed to download PDF');
                        const blob = await res.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        const safeName = (project.name || 'project').replace(/[^a-z0-9-_ ]/gi, '').trim().replace(/\s+/g, '_');
                        a.download = `project_${safeName}_${new Date().toISOString().slice(0,10)}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                      } catch (e) {
                        // no-op
                      }
                    }}
                    className="inline-flex items-center px-2 py-1 rounded-md bg-white text-black text-xs font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    PDF
                  </button>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 border border-gray-200 text-xs font-medium">
                    <BuildingOfficeIcon className="h-4 w-4 mr-1.5 text-gray-700" />
                    {organization.name}
                  </span>
                  {customer?.display_name || customer?.company_name ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 border border-gray-200 text-xs font-medium">
                      Client: {customer.display_name || customer.company_name}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 border border-gray-200 text-xs font-medium">
                    <CalendarIcon className="h-4 w-4 mr-1.5 text-gray-700" />
                    Generated: {formatDate(projectData.generated_at)}
                  </span>
                </div>
              </div>
            </div>
        </div>
      </div>

      <div className="w-full px-4 lg:px-8 py-6 space-y-6">
        {/* Tabs for left column */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-4">
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'tasks', name: 'Tasks' },
              { id: 'requirements', name: 'Requirements' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 font-medium text-sm rounded-md transition-colors focus:outline-none focus:ring-0 ${
                  activeTab === tab.id ? 'text-black' : 'text-gray-600 hover:text-black'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column (tab content) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Project Overview */}
            {activeTab === 'overview' && (
            <div className="bg-white shadow-sm rounded-xl border border-gray-200">
              <div className="px-4 py-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-black px-1">Project Overview</h2>
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                      {project.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(project.priority)}`}>
                      {project.priority.toUpperCase()} PRIORITY
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Timeline */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-600 mb-2 px-1">Timeline</h3>
                      <div className="space-y-2 text-sm text-black">
                        {project.start_date && (
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-gray-500" />
                            <span>Started: {formatDate(project.start_date)}</span>
                          </div>
                        )}
                        {project.due_date && (
                          <div className="flex items-center gap-2">
                            <ClockIcon className="h-4 w-4 text-gray-500" />
                            <span>Due: {formatDate(project.due_date)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-gray-500" />
                          <span>Created: {formatDate(project.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Company & Customer */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-600 mb-2 px-1">Company</h3>
                      <div className="text-sm text-black">
                        <div className="flex items-center gap-2">
                          <BuildingOfficeIcon className="h-4 w-4 text-gray-500" />
                          <span>{organization.name}</span>
                        </div>
                        {customer?.display_name || customer?.company_name ? (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-800 border border-gray-200 text-xs">
                              Client: {customer.display_name || customer.company_name}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Budget */}
                    {project.budget && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-600 mb-2 px-1">Budget</h3>
                        <div className="text-sm text-black font-medium">
                          {formatCurrency(project.budget)}
                        </div>
                      </div>
                    )}

                    {/* Description - Full width if exists */}
                    {project.description && (
                      <div className="md:col-span-2 lg:col-span-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <h3 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide px-1">Project Description</h3>
                        <p className="text-black leading-relaxed text-sm">{project.description}</p>
                      </div>
                    )}

                    {/* Roadmap */}
                    {Array.isArray(roadmap) && roadmap.length > 0 && (
                      <div className="md:col-span-2 lg:col-span-3 bg-white p-3 rounded-lg border border-gray-200">
                        <h3 className="text-sm font-semibold text-black mb-2 px-1">Roadmap</h3>
                        <div className="space-y-2">
                          {roadmap.map((item: any, idx: number) => (
                            <label key={item.id || idx} className="flex items-center justify-between p-2 border border-gray-200 rounded-md bg-white">
                              <div className="flex items-center gap-2">
                                <input type="checkbox" className="h-4 w-4" checked={!!item.done} readOnly />
                                <span className={`text-sm ${item.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{item.title || ''}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recent Comments */}
                    {Array.isArray(projectData.project_comments) && projectData.project_comments.length > 0 && (
                      <div className="md:col-span-2 lg:col-span-3 bg-white p-3 rounded-lg border border-gray-200">
                        <h3 className="text-sm font-semibold text-black mb-2 px-1">Recent Comments</h3>
                        <div className="divide-y divide-gray-200">
                          {[...projectData.project_comments]
                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                            .slice(0, 3)
                            .map((comment) => (
                              <div key={comment.id} className="py-2">
                                <div className="flex items-start justify-between gap-3">
                                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm flex-1">{comment.content}</p>
                                  <span className="text-[10px] text-gray-500 flex-shrink-0">{formatDate(comment.created_at)}</span>
                                </div>
                                <div className="mt-1 text-xs uppercase tracking-wide text-gray-600 font-medium">{comment.author_name}</div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
            </div>
          </div>
            )}

            {/* Requirements (read-only tab) */}
            {activeTab === 'requirements' && (
              <div className="bg-white shadow-sm rounded-xl border border-gray-200">
                <div className="px-4 py-4 border-b border-gray-200 bg-white">
                  <h2 className="text-lg font-semibold text-black flex items-center px-1">Requirements</h2>
                </div>
                <div className="p-4">
                  {requirements.length === 0 ? (
                    <div className="text-sm text-gray-500">No requirements</div>
                  ) : requirements.some((r: any) => r && (r.heading !== undefined || Array.isArray(r.items))) ? (
                    <div className="space-y-3">
                      {requirements.map((sec: any, sidx: number) => (
                        <div key={sec.id || ('sec-' + sidx)} className="border border-gray-200 rounded-md p-3 bg-white">
                          <div className="text-sm font-semibold text-black mb-2 px-1">{sec.heading || 'Requirements'}</div>
                          <div className="space-y-2">
                            {Array.isArray(sec.items) && sec.items.length > 0 ? (
                              sec.items.map((item: any, idx: number) => (
                                <label key={item.id || idx} className="flex items-center justify-between py-1 px-2 rounded-md bg-white">
                                  <div className="flex items-center gap-2">
                                    <input type="checkbox" className="h-4 w-4" checked={!!item.done} readOnly />
                                    <span className={`text-sm ${item.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{item.title || ''}</span>
                                  </div>
                                </label>
                              ))
                            ) : (
                              <div className="text-xs text-gray-500 px-1">No items</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {requirements.map((item: any, idx: number) => (
                        <label key={item.id || idx} className="flex items-center justify-between py-1 px-2 rounded-md bg-white">
                          <div className="flex items-center gap-2">
                            <input type="checkbox" className="h-4 w-4" checked={!!item.done} readOnly />
                            <span className={`text-sm ${item.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{item.title || ''}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tasks */}
            {activeTab === 'tasks' && (
            <div className="bg-white shadow-sm rounded-xl border border-gray-200">
                <div className="px-4 py-4 border-b border-gray-200 bg-white">
                  <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-black flex items-center px-1">
                      <ListBulletIcon className="h-6 w-6 text-black mr-2" />
                      Project Tasks
                    </h2>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">{tasks.length} tasks</span>
                  </div>
                </div>
            <div className="p-4">
                  {tasks.length === 0 ? (
                    <div className="text-center py-8">
                      <ListBulletIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-black">No tasks</h3>
                      <p className="mt-1 text-sm text-gray-500">This project doesn't have any tasks yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tasks.map((task) => (
                        <div key={task.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold text-black mb-1.5">{task.title}</h4>
                              {task.description && (
                                <p className="text-gray-700 leading-relaxed mb-3 text-sm">{task.description}</p>
                              )}
                              <div className="flex items-center space-x-2 mb-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                                  {task.status.replace('_', ' ').toUpperCase()}
                                </span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${getPriorityColor(task.priority)}`}>
                                  {task.priority.toUpperCase()}
                                </span>
                              </div>

                              {/* Task Details */}
                              <div className="mt-1">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                                  <div className="px-1">
                                    <span className="text-gray-600">Members:</span>
                                    <span className="ml-2 text-gray-800">
                                      {Array.isArray(task.assignees) && task.assignees.length > 0
                                        ? task.assignees.map(a => a?.name || 'Member').join(', ')
                                        : '—'}
                                    </span>
                                  </div>
                                  <div className="px-1">
                                    <span className="text-gray-600">Time Taken:</span>
                                    <span className="ml-2 text-gray-800">{typeof task.actual_hours === 'number' ? `${task.actual_hours} h` : '—'}</span>
                                  </div>
                                  <div className="px-1">
                                    <span className="text-gray-600">Estimate:</span>
                                    <span className="ml-2 text-gray-800">{typeof task.estimated_hours === 'number' ? `${task.estimated_hours} h` : '—'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="text-right text-[11px] text-gray-500 ml-3">
                              {task.due_date && (
                                <div>Due: {formatDate(task.due_date)}</div>
                              )}
                              <div>Created: {formatDate(task.created_at)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
            </div>
            )}
          </div>

          {/* Right column (discussion + team) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Public Feedback */}
            <div className="bg-white shadow-sm rounded-xl border border-gray-200">
              <div className="px-3 py-3 border-b border-gray-200 bg-white">
                <h2 className="text-base font-semibold text-black flex items-center px-1">Feedback</h2>
              </div>
              <div className="p-3">
                {projectData.project_comments && projectData.project_comments.length > 0 ? (
                  <div className="space-y-2 mb-3">
                    <h4 className="text-xs font-semibold text-gray-700 px-1">Recent Comments</h4>
                    {projectData.project_comments.map((comment) => (
                      <div key={comment.id} className="bg-white p-2.5 rounded-lg border border-gray-200">
                        <div className="flex items-start gap-2">
                          <div className="flex-shrink-0">
                            <div className="h-7 w-7 bg-gray-900 rounded-full flex items-center justify-center">
                              <span className="text-white text-[11px] font-medium">
                                {comment.author_name?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-xs font-medium text-black">{comment.author_name}</span>
                              <span className="text-[10px] text-gray-500">•</span>
                              <span className="text-[10px] text-gray-500">{new Date(comment.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm">{comment.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                <form onSubmit={handleProjectCommentSubmit} className="space-y-2">
                  <textarea
                    className="w-full py-1.5 px-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-transparent resize-none text-sm"
                    rows={3}
                    placeholder="Write a comment..."
                    value={projectComment.content}
                    onChange={(e) => setProjectComment(prev => ({ ...prev, content: e.target.value }))}
                    required
                  />
                  <input
                    type="text"
                    className="w-full py-1.5 px-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-transparent text-sm"
                    placeholder="Your name (optional)"
                    value={projectComment.name}
                    onChange={(e) => setProjectComment(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmittingProjectComment || !projectComment.content.trim()}
                      className="px-3 py-1.5 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50"
                    >
                      {isSubmittingProjectComment ? 'Posting...' : 'Post'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Team */}
            {team?.members?.length ? (
              <div className="bg-white shadow-sm rounded-xl border border-gray-200">
                  <div className="px-4 py-4 border-b border-gray-200 bg-white">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-black flex items-center px-1">
                        <div className="h-2 w-2 bg-black rounded-full mr-3"></div>
                        Team Members
                      </h2>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">{team.count || team.members.length} people</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {team.members.map((m) => {
                        const name = m.user?.full_name || `${m.user?.first_name || ''} ${m.user?.last_name || ''}`.trim() || 'Member';
                        return (
                          <div key={m.id} className="bg-white p-4 rounded-xl border border-gray-200">
                            <div className="flex items-center gap-3">
                              {m.user?.avatar_url ? (
                                <img src={m.user.avatar_url} alt={name} className="h-10 w-10 rounded-full object-cover border-2 border-gray-200" />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-black text-white text-sm font-medium flex items-center justify-center">
                                  {name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-black truncate">{name}</p>
                                <p className="text-xs uppercase tracking-wide text-gray-600 font-medium">{m.role}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-4 text-sm text-gray-600 mb-3">
                <div className="flex items-center gap-2 bg-white.5 rounded-full border border-gray-200">
                  <BuildingOfficeIcon className="h-4 w-4 text-black" />
                  <span className="font-medium text-black">{organization.name}</span>
                </div>
                {customer?.display_name || customer?.company_name ? (
                  <div className="flex items-center gap-2 bg-white.5 rounded-full border border-gray-200">
                    <div className="h-2 w-2 bg-black rounded-full"></div>
                    <span className="text-black">Client: {customer.display_name || customer.company_name}</span>
                  </div>
                ) : null}
              </div>
              <div className="flex items-center justify-center gap-3 text-xs text-gray-600">
                <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full font-medium">Shared Project Report</span>
                <span>•</span>
                <span>Public View Access</span>
                <span>•</span>
                <span>Generated {formatDate(projectData.generated_at)}</span>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SharedProjectPage;
