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
  due_date: string | null;
  created_at: string;
  comments?: SharedTaskComment[];
}

interface ProjectComment {
  id: string;
  content: string;
  author_name: string;
  is_public: boolean;
  created_at: string;
}

interface SharedProjectData {
  message: string;
  share_id: string;
  public_access: boolean;
  project: SharedProject;
  tasks: SharedTask[];
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
  const [newComments, setNewComments] = useState<Record<string, { content: string; name: string; email: string }>>({});
  const [projectComment, setProjectComment] = useState({ content: '', name: '', email: '' });
  const [isSubmittingProjectComment, setIsSubmittingProjectComment] = useState(false);

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
    
    if (!projectComment.content.trim() || !shareId) return;
    
    setIsSubmittingProjectComment(true);
    
    try {
      const response = await fetch(`http://localhost:8000/api/v1/analytics/shared/project/${shareId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: projectComment.content,
          name: projectComment.name || undefined,
          email: projectComment.email || undefined,
        }),
      });
      
      if (response.ok) {
        const newComment = await response.json();
        
        // Update the project data with the new comment
        if (projectData) {
          const updatedData = {
            ...projectData,
            project_comments: [
              newComment,
              ...(projectData.project_comments || []),
            ],
          };
          setProjectData(updatedData);
          
          // Reset the form but keep name and email
          setProjectComment(prev => ({
            ...prev,
            content: '',
          }));
        }
      } else {
        console.error('Failed to post comment');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
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
              <div className="flex flex-wrap items-center gap-3">
                {shortLink ? (
                  <button
                    onClick={copyShortLink}
                    className="ml-auto inline-flex items-center px-3 py-1.5 rounded-lg bg-black text-white text-xs font-medium hover:bg-gray-800 transition-colors"
                    title={shortLink}
                  >
                    {copied ? 'Copied!' : 'Copy short link'}
                  </button>
                ) : null}
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
        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column (overview + tasks) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Project Overview */}
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
                      <div className="md:col-span-2 lg:col-span-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide px-1">Project Description</h3>
                        <p className="text-black leading-relaxed text-base">{project.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            {/* Tasks */}
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
                    <div className="space-y-4">
                      {tasks.map((task) => (
                        <div key={task.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-base font-semibold text-black mb-2">{task.title}</h4>
                              {task.description && (
                                <p className="text-gray-700 leading-relaxed mb-4">{task.description}</p>
                              )}
                              <div className="flex items-center space-x-3 mb-4">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                                  {task.status.replace('_', ' ').toUpperCase()}
                                </span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                  {task.priority.toUpperCase()}
                                </span>
                              </div>

                              {/* Existing Comments */}
                              {Array.isArray(task.comments) && task.comments.length > 0 && (
                                <div className="mt-6">
                                  <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center px-1">
                                    <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    Comments ({task.comments.length})
                                  </h5>
                                  <div className="space-y-3">
                                    {task.comments.map((c) => (
                                      <div key={c.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                        <div className="text-sm text-black leading-relaxed whitespace-pre-wrap">{c.content}</div>
                                        <div className="text-xs text-gray-500 mt-2 flex items-center">
                                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                          {new Date(c.created_at).toLocaleString()}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Add Comment */}
                              {shareId && (
                                <div className="mt-6">
                                  <h5 className="text-sm font-semibold text-gray-700 mb-3 px-1">Add a Comment</h5>
                                  <form
                                    className="bg-white p-4 rounded-lg border border-gray-200 space-y-4"
                                    onSubmit={async (e) => {
                                      e.preventDefault();
                                      const key = String(task.id);
                                      const nc = newComments[key] || { content: '', name: '', email: '' };
                                      if (!nc.content.trim()) return;
                                      try {
                                        const res = await fetch(`http://localhost:8000/api/v1/analytics/shared/project/${shareId}/tasks/${task.id}/comments`, {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ content: nc.content, name: nc.name || undefined, email: nc.email || undefined }),
                                        });
                                        if (res.ok) {
                                          const created = await res.json();
                                          const updated = { ...projectData! };
                                          const tIndex = updated.tasks.findIndex(t => String(t.id) === String(task.id));
                                          if (tIndex !== -1) {
                                            const t = updated.tasks[tIndex] as any;
                                            t.comments = Array.isArray(t.comments) ? t.comments : [];
                                            t.comments.push(created);
                                            setProjectData(updated);
                                            setNewComments(prev => ({ ...prev, [key]: { content: '', name: nc.name, email: nc.email } }));
                                          }
                                        }
                                      } catch (err) {
                                        // ignore for now
                                      }
                                    }}
                                  >
                                    <textarea
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent resize-none transition-colors"
                                      placeholder="Share your thoughts about this task..."
                                      rows={3}
                                      value={(newComments[String(task.id)]?.content) || ''}
                                      onChange={(e) => setNewComments(prev => ({ ...prev, [String(task.id)]: { ...(prev[String(task.id)] || { name: '', email: '' }), content: e.target.value } }))}
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <input
                                        type="text"
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                                        placeholder="Your name (optional)"
                                        value={(newComments[String(task.id)]?.name) || ''}
                                        onChange={(e) => setNewComments(prev => ({ ...prev, [String(task.id)]: { ...(prev[String(task.id)] || { content: '', email: '' }), name: e.target.value } }))}
                                      />
                                      <input
                                        type="email"
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                                        placeholder="Your email (optional)"
                                        value={(newComments[String(task.id)]?.email) || ''}
                                        onChange={(e) => setNewComments(prev => ({ ...prev, [String(task.id)]: { ...(prev[String(task.id)] || { content: '', name: '' }), email: e.target.value } }))}
                                      />
                                    </div>
                                    <div className="flex justify-end">
                                      <button 
                                        type="submit" 
                                        className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 transition-colors"
                                      >
                                        Post Comment
                                      </button>
                                    </div>
                                  </form>
                                </div>
                              )}
                            </div>
                            <div className="text-right text-xs text-gray-500 ml-4">
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
          </div>

          {/* Right column (discussion + team) */}
          <div className="lg:col-span-1 space-y-8">
            {/* Project Comments Section */}
            <div className="bg-white shadow-sm rounded-xl border border-gray-200">
                <div className="px-4 py-4 border-b border-gray-200 bg-white">
                  <h2 className="text-lg font-semibold text-black flex items-center px-1">
                    <div className="h-2 w-2 bg-black rounded-full mr-3"></div>
                    Project Discussion
                  </h2>
                  <p className="text-sm text-gray-600 mt-1 px-1">Share feedback and ask questions about this project</p>
                </div>
                <div className="p-4">
                  {/* Existing Comments */}
                  <div className="space-y-4 mb-4">
                    {projectData.project_comments && projectData.project_comments.length > 0 ? (
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 px-1">Recent Comments ({projectData.project_comments.length})</h4>
                        {projectData.project_comments.map((comment) => (
                          <div key={comment.id} className="bg-white p-4 rounded-lg border border-gray-200">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                <div className="h-8 w-8 bg-gray-900 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs font-medium">
                                    {comment.author_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm font-medium text-black">{comment.author_name}</span>
                                  <span className="text-xs text-gray-500">•</span>
                                  <span className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleString()}</span>
                                </div>
                                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <p className="text-sm">No comments yet. Be the first to share your thoughts!</p>
                      </div>
                    )}
                  </div>

                  {/* Add Comment Form */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h3 className="text-base font-medium text-black mb-3 px-1">Leave a Comment</h3>
                    <form onSubmit={handleProjectCommentSubmit} className="space-y-4">
                      <div>
                        <textarea
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent resize-none transition-colors"
                          rows={4}
                          placeholder="Share your thoughts about this project..."
                          value={projectComment.content}
                          onChange={(e) => setProjectComment(prev => ({ ...prev, content: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                          placeholder="Your name (optional)"
                          value={projectComment.name}
                          onChange={(e) => setProjectComment(prev => ({ ...prev, name: e.target.value }))}
                        />
                        <input
                          type="email"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                          placeholder="Your email (optional)"
                          value={projectComment.email}
                          onChange={(e) => setProjectComment(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={isSubmittingProjectComment || !projectComment.content.trim()}
                          className="px-4 py-2 bg-black text-white font-medium rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {isSubmittingProjectComment ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Posting...</span>
                            </>
                          ) : (
                            <span>Post Comment</span>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
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
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200">
                  <BuildingOfficeIcon className="h-4 w-4 text-black" />
                  <span className="font-medium text-black">{organization.name}</span>
                </div>
                {customer?.display_name || customer?.company_name ? (
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200">
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
