import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { encodeShareIdCompact, slugify } from '../../utils/shortLink';
import {
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  UserIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';

interface SharedProposal {
  id: string;
  title: string;
  description?: string;
  proposal_number: string;
  status: string;
  proposal_type: string;
  total_amount: number;
  currency: string;
  valid_until?: string;
  sent_date?: string;
  viewed_date?: string;
  responded_date?: string;
  notes?: string;
  content: {
    items: Array<{
      item_id: string;
      name: string;
      item?: {
        name: string;
        description?: string;
      };
      quantity: number;
      unit_price: number;
      total: number;
      unit: string;
      tax_rate: number;
      discount_rate: number;
      description: string;
    }>;
    sections?: Array<{
      title: string;
      content: string;
    }>;
  };
  created_at: string;
  updated_at: string;
}

interface ProposalComment {
  id: string;
  content: string;
  author_name: string;
  is_public: boolean;
  created_at: string;
}

interface SharedProposalData {
  message: string;
  share_id: string;
  public_access: boolean;
  proposal: SharedProposal;
  customer?: {
    id: string;
    display_name?: string;
    company_name?: string;
    email?: string;
  } | null;
  organization: {
    name: string;
  };
  proposal_comments?: ProposalComment[];
  metrics?: {
    proposals_total: number;
    proposals_accepted: number;
    invoices_total: number;
    invoices_pending: number;
    projects_total: number;
  };
  generated_at: string;
}

const SharedProposalPage: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const [proposalData, setProposalData] = useState<SharedProposalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proposalComment, setProposalComment] = useState({ content: '', name: '', email: '' });
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Short link state
  const [copied, setCopied] = useState(false);
  const shortLink = useMemo(() => {
    const title = proposalData?.proposal?.title || 'proposal';
    if (!shareId) return null;
    const code = encodeShareIdCompact(shareId);
    if (!code) return null;
    const slug = slugify(title);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/pr/${slug}-${code}`;
  }, [shareId, proposalData?.proposal?.title]);

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
    const fetchSharedProposal = async () => {
      if (!shareId) {
        setError('Invalid share link');
        setIsLoading(false);
        return;
      }

      try {
        // Use relative URL so CRA dev proxy can route to backend; backend must expose this endpoint
        const response = await fetch(`/api/v1/analytics/shared/proposal/${shareId}`);
        
        if (!response.ok) {
          throw new Error('Proposal not found or link expired');
        }

        const data = await response.json();
        setProposalData(data);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load proposal');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSharedProposal();
  }, [shareId]);

  const getStatusColor = (status: string) => {
    return 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!proposalComment.content.trim() || !shareId) return;
    
    setIsSubmittingComment(true);
    
    try {
      const response = await fetch(`/api/v1/analytics/shared/proposal/${shareId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: proposalComment.content,
          name: proposalComment.name || undefined,
          email: proposalComment.email || undefined,
        }),
      });
      
      if (response.ok) {
        const newComment = await response.json();
        
        // Update the proposal data with the new comment
        if (proposalData) {
          const updatedData = {
            ...proposalData,
            proposal_comments: [
              newComment,
              ...(proposalData.proposal_comments || []),
            ],
          };
          setProposalData(updatedData);
          
          // Reset the form but keep name and email
          setProposalComment(prev => ({
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
      setIsSubmittingComment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading proposal...</p>
        </div>
      </div>
    );
  }

  if (error || !proposalData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-700" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Proposal Not Found</h3>
          <p className="mt-1 text-sm text-gray-600">{error || 'The proposal you\'re looking for doesn\'t exist or the link has expired.'}</p>
        </div>
      </div>
    );
  }

  const { proposal, customer, organization, metrics } = proposalData;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="w-full px-4 lg:px-8 py-3">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              <div className="h-16 w-16 bg-black rounded-xl flex items-center justify-center shadow-sm">
                <DocumentTextIcon className="h-10 w-10 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-black mb-2 px-1">{proposal.title}</h1>
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
                {shareId ? (
                  <button
                    onClick={async () => {
                      if (!shareId) return;
                      try {
                        setDownloading(true);
                        const res = await fetch(`/api/v1/analytics/shared/proposal/${shareId}/pdf`);
                        if (!res.ok) throw new Error('Failed to download PDF');
                        const blob = await res.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${slugify(proposal.title)}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                      } catch (e) {
                        // Basic user feedback via alert; public page has no notifications infra
                        alert('Unable to download PDF. Please try again later.');
                      } finally {
                        setDownloading(false);
                      }
                    }}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white text-black text-xs font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
                    disabled={downloading}
                  >
                    {downloading ? 'Preparing PDF…' : 'Download PDF'}
                  </button>
                ) : null}
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 border border-gray-200 text-xs font-medium">
                  <BuildingOfficeIcon className="h-4 w-4 mr-1.5 text-gray-700" />
                  {organization.name}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(proposal.status)}`}>
                  {proposal.status.toUpperCase()}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 border border-gray-200 text-xs font-medium">
                  #{proposal.proposal_number}
                </span>
                {customer?.display_name || customer?.company_name ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 border border-gray-200 text-xs font-medium">
                    Client: {customer.display_name || customer.company_name}
                  </span>
                ) : null}
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 border border-gray-200 text-xs font-medium">
                  <CalendarIcon className="h-4 w-4 mr-1.5 text-gray-700" />
                  Generated: {formatDate(proposalData.generated_at)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 lg:px-8 py-6 space-y-6">
        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column (proposal details) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Proposal Overview */}
            <div className="bg-white shadow-sm rounded-xl border border-gray-200">
              <div className="px-4 py-4 border-b border-gray-200 bg-white">
                <h2 className="text-lg font-semibold text-black px-1">Proposal Overview</h2>
              </div>
              <div className="p-4">
                {/* Summary Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-600 mb-2 px-1">Total Amount</h3>
                    <div className="text-2xl font-bold text-black">
                      {formatCurrency(proposal.total_amount, proposal.currency)}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-600 mb-2 px-1">Type</h3>
                    <div className="text-base text-black capitalize">
                      {proposal.proposal_type.replace('_', ' ')}
                    </div>
                  </div>
                  {proposal.valid_until && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-600 mb-2 px-1">Valid Until</h3>
                      <div className="text-base text-black flex items-center gap-2">
                        <ClockIcon className="h-4 w-4 text-gray-500" />
                        {formatDate(proposal.valid_until)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                {proposal.description && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide px-1">Description</h3>
                    <p className="text-black leading-relaxed text-base">{proposal.description}</p>
                  </div>
                )}

                {/* Sections */}
                {proposal.content?.sections && proposal.content.sections.length > 0 && (
                  <div className="space-y-4 mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-1">Details</h3>
                    {proposal.content.sections.map((section, idx) => (
                      <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h4 className="text-base font-semibold text-black mb-2">{section.title}</h4>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{section.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Items & Services */}
            {proposal.content?.items && proposal.content.items.length > 0 && (
              <div className="bg-white shadow-sm rounded-xl border border-gray-200">
                <div className="px-4 py-4 border-b border-gray-200 bg-white">
                  <h2 className="text-lg font-semibold text-black px-1">Items & Services</h2>
                </div>
                <div className="p-4">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {proposal.content.items.map((item, index) => {
                          const itemTotal = item.quantity * (item.unit_price / 100) * (1 - (item.discount_rate / 10000)) * (1 + (item.tax_rate / 10000));
                          return (
                            <tr key={index}>
                              <td className="px-6 py-4">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {item.item?.name || item.name || 'Item'}
                                  </div>
                                  {item.description && (
                                    <div className="text-sm text-gray-500">{item.description}</div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {item.quantity}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatCurrency(item.unit_price, proposal.currency)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {(item.tax_rate / 100).toFixed(2)}%
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {(item.discount_rate / 100).toFixed(2)}%
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {formatCurrency(Math.round(itemTotal * 100), proposal.currency)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-right text-base font-semibold text-gray-900">
                            Total:
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-base font-bold text-gray-900">
                            {formatCurrency(proposal.total_amount, proposal.currency)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {proposal.notes && (
              <div className="bg-white shadow-sm rounded-xl border border-gray-200">
                <div className="px-4 py-4 border-b border-gray-200 bg-white">
                  <h2 className="text-lg font-semibold text-black px-1">Notes</h2>
                </div>
                <div className="p-4">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{proposal.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right column (comments + info) */}
          <div className="lg:col-span-1 space-y-8">
            {/* Discussion */}
            <div className="bg-white shadow-sm rounded-xl border border-gray-200">
              <div className="px-4 py-4 border-b border-gray-200 bg-white">
                <h2 className="text-lg font-semibold text-black flex items-center px-1">
                  <div className="h-2 w-2 bg-black rounded-full mr-3"></div>
                  Discussion
                </h2>
                <p className="text-sm text-gray-600 mt-1 px-1">Share feedback and ask questions</p>
              </div>
              <div className="p-4">
                {/* Existing Comments */}
                <div className="space-y-4 mb-4">
                  {proposalData.proposal_comments && proposalData.proposal_comments.length > 0 ? (
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 px-1">Comments ({proposalData.proposal_comments.length})</h4>
                      {proposalData.proposal_comments.map((comment) => (
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
                      <p className="text-sm">No comments yet. Be the first!</p>
                    </div>
                  )}
                </div>

                {/* Add Comment Form */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h3 className="text-base font-medium text-black mb-3 px-1">Leave a Comment</h3>
                  <form onSubmit={handleCommentSubmit} className="space-y-4">
                    <div>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent resize-none transition-colors"
                        rows={4}
                        placeholder="Share your thoughts..."
                        value={proposalComment.content}
                        onChange={(e) => setProposalComment(prev => ({ ...prev, content: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                        placeholder="Your name (optional)"
                        value={proposalComment.name}
                        onChange={(e) => setProposalComment(prev => ({ ...prev, name: e.target.value }))}
                      />
                      <input
                        type="email"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                        placeholder="Your email (optional)"
                        value={proposalComment.email}
                        onChange={(e) => setProposalComment(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmittingComment || !proposalComment.content.trim()}
                        className="px-4 py-2 bg-black text-white font-medium rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isSubmittingComment ? (
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

            {/* Customer Info */}
            {customer && (
              <div className="bg-white shadow-sm rounded-xl border border-gray-200">
                <div className="px-4 py-4 border-b border-gray-200 bg-white">
                  <h2 className="text-lg font-semibold text-black px-1">Customer Information</h2>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 bg-black rounded-full flex items-center justify-center">
                      <UserIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-base font-medium text-black">
                        {customer.display_name || customer.company_name || 'Customer'}
                      </p>
                      {customer.email && (
                        <p className="text-sm text-gray-600">{customer.email}</p>
                      )}
                    </div>
                  </div>
                  {customer.company_name && customer.display_name && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <BuildingOfficeIcon className="h-4 w-4" />
                      <span>{customer.company_name}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Metrics */}
            {metrics && (
              <div className="bg-white shadow-sm rounded-xl border border-gray-200">
                <div className="px-4 py-4 border-b border-gray-200 bg-white">
                  <h2 className="text-lg font-semibold text-black px-1">Customer Overview</h2>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="text-gray-600">Proposals</div>
                      <div className="text-black font-semibold">{metrics.proposals_total} total</div>
                      <div className="text-xs text-gray-500">{metrics.proposals_accepted} accepted</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="text-gray-600">Invoices</div>
                      <div className="text-black font-semibold">{metrics.invoices_total} total</div>
                      <div className="text-xs text-gray-500">{metrics.invoices_pending} pending</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 col-span-2">
                      <div className="text-gray-600">Projects</div>
                      <div className="text-black font-semibold">{metrics.projects_total} active</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="bg-white shadow-sm rounded-xl border border-gray-200">
              <div className="px-4 py-4 border-b border-gray-200 bg-white">
                <h2 className="text-lg font-semibold text-black px-1">Timeline</h2>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <ClockIcon className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Created</p>
                      <p className="text-sm text-gray-500">{new Date(proposal.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  {proposal.sent_date && (
                    <div className="flex items-center gap-3">
                      <ClockIcon className="h-4 w-4 text-blue-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Sent</p>
                        <p className="text-sm text-gray-500">{new Date(proposal.sent_date).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                  {proposal.viewed_date && (
                    <div className="flex items-center gap-3">
                      <ClockIcon className="h-4 w-4 text-yellow-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Viewed</p>
                        <p className="text-sm text-gray-500">{new Date(proposal.viewed_date).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                  {proposal.responded_date && (
                    <div className="flex items-center gap-3">
                      <CheckCircleIcon className="h-4 w-4 text-green-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Responded</p>
                        <p className="text-sm text-gray-500">{new Date(proposal.responded_date).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
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
              <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full font-medium">Shared Proposal</span>
              <span>•</span>
              <span>Public View Access</span>
              <span>•</span>
              <span>Generated {formatDate(proposalData.generated_at)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharedProposalPage;
