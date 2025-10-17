import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeftIcon, 
  PencilIcon, 
  TrashIcon,
  DocumentTextIcon,
  UserIcon,
  BuildingOfficeIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  ArrowsRightLeftIcon,
  ChartBarIcon,
  BanknotesIcon,
  LinkIcon,
  CalendarIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon, ClockIcon as ClockSolidIcon } from '@heroicons/react/24/solid';
import { useAppDispatch } from '../../hooks/redux';
import { addNotification } from '../../store/slices/notificationSlice';
import { apiClient } from '../../api/client';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import ProposalForm from '../../components/Proposals/ProposalForm';
import { PDFSection1, PDFSection2, PDFSection3 } from '../../types';
import ViewModeButton from '../../components/UI/ViewModeButton';
import { encodeShareIdCompact, slugify } from '../../utils/shortLink';
import CustomerDetailsCard from '../../components/Proposals/Insights/CustomerDetailsCard';
import ProjectStatsCard from '../../components/Proposals/Insights/ProjectStatsCard';
import FinancialOverviewCard from '../../components/Proposals/Insights/FinancialOverviewCard';
import ProposalHistoryCard from '../../components/Proposals/Insights/ProposalHistoryCard';
import { ProposalCustomerInsights } from '../../types/proposalInsights';

interface ProposalItem {
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
}

interface Proposal {
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
    items: ProposalItem[];
    sections?: Array<{
      title: string;
      content: string;
    }>;
    section1?: PDFSection1;
    section2?: PDFSection2;
    section3?: PDFSection3;
  };
  tags?: string[];
  response_notes?: string;
  rejection_reason?: string;
  follow_up_date?: string;
  custom_fields?: {
    terms_and_conditions?: string;
    email_preferences?: {
      send_email?: boolean;
      email_subject?: string;
      email_message?: string;
    };
  };
  customer?: {
    id: string;
    display_name: string;
    company_name?: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

interface OverviewMetrics {
  proposals_total: number;
  proposals_draft: number;
  proposals_sent: number;
  proposals_viewed: number;
  proposals_accepted: number;
  proposals_rejected: number;
  proposals_expired: number;
  invoices_total: number;
  invoices_pending: number;
  invoices_overdue: number;
  invoices_paid: number;
  invoices_outstanding_amount: number;
  projects_total: number;
  projects_active: number;
}

const ProposalDetailOverviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'edit'>(
    searchParams.get('tab') === 'edit' ? 'edit' : 'overview'
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [overviewMetrics, setOverviewMetrics] = useState<OverviewMetrics | null>(null);
  const [overviewCustomer, setOverviewCustomer] = useState<{ id: string; display_name: string; email?: string; company_name?: string } | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // Customer Insights
  const [insights, setInsights] = useState<ProposalCustomerInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState<boolean>(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  // Fallback customer details when insights/overview are unavailable
  const [fallbackCustomerDetails, setFallbackCustomerDetails] = useState<{
    id: string;
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    address?: string;
    customerSince?: string;
  } | null>(null);

  const publicLink = useMemo(() => {
    if (!shareId || !proposal) return null;
    const code = encodeShareIdCompact(shareId);
    if (!code) return null;
    const slug = slugify(proposal.title);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/pr/${slug}-${code}`;
  }, [shareId, proposal]);

  const fetchProposal = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let response: any;
      try {
        // Prefer trailing slash to avoid proxy redirects where supported
        response = await apiClient.get(`/proposals/${id}/`);
      } catch (err1: any) {
        // Fallback to no trailing slash if backend defines it that way
        try {
          response = await apiClient.get(`/proposals/${id}`);
        } catch (err2: any) {
          console.error('Error fetching proposal (both variants failed):', err1, err2);
          throw err2 || err1;
        }
      }
      setProposal(response.data);
    } catch (error: any) {
      console.error('Error fetching proposal:', error);
      setError('Failed to load proposal details');
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load proposal details'
      }));
    } finally {
      setLoading(false);
    }
  }, [id, dispatch]);

  useEffect(() => {
    fetchProposal();
  }, [fetchProposal]);

  useEffect(() => {
    const loadOverview = async () => {
      if (!id) return;
      try {
        const res = await apiClient.get(`/proposals/${id}/overview`);
        const data = res.data || {};
        if (data.metrics) setOverviewMetrics(data.metrics);
        if (data.customer) setOverviewCustomer(data.customer);
        if (data.share_id) setShareId(data.share_id);
      } catch (e) {
        // Non-blocking
      }
    };
    loadOverview();
  }, [id]);


  useEffect(() => {
    const loadInsights = async () => {
      if (!id) return;
      setInsightsLoading(true);
      setInsightsError(null);
      try {
        // Use trailing slash to avoid 307 redirect losing headers
        const res = await apiClient.get(`/proposals/${id}/customer-insights/`);
        setInsights(res.data);
      } catch (e: any) {
        setInsights(null);
        const msg = e?.response?.data?.detail || 'Failed to load customer insights';
        setInsightsError(msg);
      } finally {
        setInsightsLoading(false);
      }
    };
    loadInsights();
  }, [id]);

  // Auto-create or fetch public share link on mount if missing
  useEffect(() => {
    if (!id) return;
    if (shareId) return;
    // Silently attempt to create/fetch link without showing errors to the user
    handleGeneratePublicLink(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, shareId]);

  // If insights/overview lack customer, fetch by proposal.customer_id to show details
  useEffect(() => {
    if (!proposal) return;
    // Already have a primary customer source
    if (insights?.customer || overviewCustomer || fallbackCustomerDetails) return;
    const cid = (proposal as any).customer?.id || (proposal as any).customer_id;
    if (!cid) return;

    (async () => {
      try {
        let res: any;
        try {
          res = await apiClient.get(`/customers/${cid}/`);
        } catch (e1: any) {
          // Fallback without trailing slash
          res = await apiClient.get(`/customers/${cid}`);
        }
        const c = res.data || {};
        const name = c.display_name || c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.company_name || c.email || 'Customer';
        const address = c.address_line1
          ? [c.address_line1, c.address_line2, c.city, c.state, c.postal_code, c.country].filter(Boolean).join(', ')
          : (c.address || '');
        setFallbackCustomerDetails({
          id: cid,
          name,
          email: c.email || undefined,
          phone: c.phone || c.phone_number || undefined,
          company: c.company_name || c.company || undefined,
          address: address || undefined,
          customerSince: c.created_at || c.customer_since || undefined,
        });
      } catch (e) {
        // Silent: leave as null
      }
    })();
  }, [proposal, insights, overviewCustomer, fallbackCustomerDetails]);

  const handleGeneratePublicLink = async (silent = false): Promise<string | null> => {
    if (!id) {
      console.error('No proposal ID available');
      return null;
    }

    const parseShareId = (data: any): string | null => {
      if (!data) return null;
      if (typeof data.share_id === 'string') return data.share_id;
      if (typeof data.shareId === 'string') return data.shareId; // tolerate camelCase
      // handle { public_url: "/shared/proposal/<share_id>" } or { share_url: "/shared/proposal/<share_id>" }
      const url = data.public_url || data.share_url || data.url || '';
      const m = typeof url === 'string' ? url.match(/\/shared\/proposal\/(.+)$/) : null;
      return m ? m[1] : null;
    };

    try {
      setShareError(null);
      setIsGeneratingLink(true);

      // 1) Try POST /proposals/{id}/share/
      try {
        const r1 = await apiClient.post(`/proposals/${id}/share/`);
        const sid = parseShareId(r1.data);
        if (sid) {
          setShareId(sid);
          if (!silent) {
            dispatch(addNotification({ type: 'success', title: 'Success', message: 'Public link generated successfully' }));
          }
          return sid;
        }
      } catch (e: any) {
        // proceed to next attempt
      }

      // 2) Try GET /proposals/{id}/share/ (fetch existing)
      try {
        const r2 = await apiClient.get(`/proposals/${id}/share/`);
        const sid = parseShareId(r2.data);
        if (sid) {
          setShareId(sid);
          if (!silent) {
            dispatch(addNotification({ type: 'success', title: 'Link Ready', message: 'Using existing public link' }));
          }
          return sid;
        }
      } catch (e: any) {
        // proceed to next
      }

      // 2b) Try GET /proposals/{id}/share (no trailing slash)
      try {
        const r2b = await apiClient.get(`/proposals/${id}/share`);
        const sid = parseShareId(r2b.data);
        if (sid) {
          setShareId(sid);
          if (!silent) {
            dispatch(addNotification({ type: 'success', title: 'Link Ready', message: 'Using existing public link' }));
          }
          return sid;
        }
      } catch (e: any) {
        // proceed to next
      }

      // 3) Try POST analytics style endpoint similar to projects
      try {
        const r3 = await apiClient.post(`/analytics/reports/share/proposal/${id}`);
        const sid = parseShareId(r3.data);
        if (sid) {
          setShareId(sid);
          if (!silent) {
            dispatch(addNotification({ type: 'success', title: 'Success', message: 'Public link generated successfully' }));
          }
          return sid;
        }
      } catch (e: any) {
        // proceed to final fallback
      }

      // 4) Final fallback: POST without trailing slash
      try {
        const r4 = await apiClient.post(`/proposals/${id}/share`);
        const sid = parseShareId(r4.data);
        if (sid) {
          setShareId(sid);
          if (!silent) {
            dispatch(addNotification({ type: 'success', title: 'Success', message: 'Public link generated successfully' }));
          }
          return sid;
        }
      } catch (e: any) {
        // Give up after this
      }

      throw new Error('No compatible share endpoint available');
    } catch (error: any) {
      console.error('Error generating public link:', error);
      const errorMsg = error?.response?.data?.detail || error?.message || 'Failed to generate public link';
      setShareError(errorMsg);
      if (!silent) {
        dispatch(addNotification({ type: 'error', title: 'Error', message: errorMsg }));
      }
      return null;
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyPublicLink = async () => {
    if (!publicLink) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicLink);
      } else {
        const el = document.createElement('textarea');
        el.value = publicLink;
        el.setAttribute('readonly', '');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      dispatch(addNotification({
        type: 'success',
        title: 'Copied',
        message: 'Public link copied to clipboard'
      }));
    } catch (e) {
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to copy link'
      }));
    }
  };

  const buildPublicLinkFromSid = (sid: string): string | null => {
    if (!proposal) return null;
    const code = encodeShareIdCompact(sid);
    if (!code) return null;
    const slug = slugify(proposal.title);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/pr/${slug}-${code}`;
  };

  const handleShareProposal = async () => {
    let sid = shareId;
    if (!sid) {
      sid = await handleGeneratePublicLink(false);
    }
    if (!sid) return; // error already notified

    const link = buildPublicLinkFromSid(sid);
    if (!link) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const el = document.createElement('textarea');
        el.value = link;
        el.setAttribute('readonly', '');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      dispatch(addNotification({
        type: 'success',
        title: 'Link Copied',
        message: 'Share link copied to clipboard'
      }));
    } catch (e) {
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to copy share link'
      }));
    }
  };

  const handleUpdateProposal = async (formData: any) => {
    try {
      setIsUpdating(true);
      
      // Transform formData to match backend schema. Avoid sending nulls when optional.
      const raw: any = {
        title: formData.title,
        description: formData.description,
        customer_id: formData.customer_id,
        proposal_type: formData.proposal_type,
        status: formData.status,
        valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : undefined,
        total_amount: typeof formData.total_amount === 'number' ? Math.round(formData.total_amount * 100) : undefined, // cents
        currency: formData.currency,
        content: formData.content,
        notes: formData.notes,
        tags: formData.tags,
        response_notes: formData.response_notes || undefined,
        rejection_reason: formData.rejection_reason || undefined,
        follow_up_date: formData.follow_up_date ? new Date(formData.follow_up_date).toISOString() : undefined,
        custom_fields: {
          terms_and_conditions: formData.terms_and_conditions || undefined,
          email_preferences: {
            send_email: formData.send_email,
            email_subject: formData.email_subject || undefined,
            email_message: formData.email_message || undefined,
          }
        }
      };

      // Prune undefined recursively so we don't send fields backend might reject
      const prune = (obj: any): any => {
        if (Array.isArray(obj)) return obj.map(prune);
        if (obj && typeof obj === 'object') {
          const out: any = {};
          Object.keys(obj).forEach((k) => {
            const v = prune(obj[k]);
            if (v !== undefined) out[k] = v;
          });
          return out;
        }
        return obj;
      };
      const updateData = prune(raw);

      // Try PATCH/PUT with/without trailing slash for maximum compatibility
      let response: any;
      try {
        response = await apiClient.patch(`/proposals/${id}/`, updateData);
      } catch (e1: any) {
        try {
          response = await apiClient.put(`/proposals/${id}/`, updateData);
        } catch (e2: any) {
          try {
            response = await apiClient.patch(`/proposals/${id}`, updateData);
          } catch (e3: any) {
            try {
              response = await apiClient.put(`/proposals/${id}`, updateData);
            } catch (e4: any) {
              const detail = e4?.response?.data?.detail || e3?.response?.data?.detail || e2?.response?.data?.detail || e1?.response?.data?.detail || e4?.message || 'Failed to update proposal';
              throw new Error(detail);
            }
          }
        }
      }

      setProposal(response.data);
      setActiveTab('overview');
      dispatch(addNotification({
        type: 'success',
        title: 'Success',
        message: 'Proposal updated successfully'
      }));
    } catch (error: any) {
      console.error('Error updating proposal:', error);
      const msg = error?.message || error?.response?.data?.detail || 'Failed to update proposal';
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: msg
      }));
    } finally {
      setIsUpdating(false);
    }
  };

  const prepareInitialData = () => {
    if (!proposal) return undefined;
    
    return {
      title: proposal.title,
      description: proposal.description || '',
      customer_id: proposal.customer?.id || '',
      proposal_type: proposal.proposal_type,
      status: proposal.status,
      valid_until: proposal.valid_until ? new Date(proposal.valid_until).toISOString().split('T')[0] : '',
      total_amount: proposal.total_amount ? proposal.total_amount / 100 : 0, // Convert from cents
      currency: proposal.currency,
      content: {
        // New PDF section structure
        section1: proposal.content?.section1 || {
          logo_url: '',
          company_details: {
            name: '',
            address: '',
            phone: '',
            email: '',
            website: ''
          }
        },
        section2: proposal.content?.section2 || {
          heading: 'Proposal',
          subheading: ''
        },
        section3: proposal.content?.section3 || {
          left: {
            content: 'Project Details',
            details: ''
          },
          right: {
            title: proposal.title || '',
            content: ''
          }
        },
        // Legacy sections
        sections: proposal.content?.sections || [
          { title: 'Project Overview', content: '' },
          { title: 'Scope of Work', content: '' },
          { title: 'Timeline', content: '' },
          { title: 'Investment', content: '' },
          { title: 'Terms & Conditions', content: '' }
        ],
        items: proposal.content?.items || []
      },
      terms_and_conditions: proposal.custom_fields?.terms_and_conditions || '',
      notes: proposal.notes || '',
      tags: proposal.tags || [],
      response_notes: proposal.response_notes || '',
      rejection_reason: proposal.rejection_reason || '',
      follow_up_date: proposal.follow_up_date ? new Date(proposal.follow_up_date).toISOString().split('T')[0] : '',
      send_email: proposal.custom_fields?.email_preferences?.send_email || false,
      email_subject: proposal.custom_fields?.email_preferences?.email_subject || '',
      email_message: proposal.custom_fields?.email_preferences?.email_message || ''
    };
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'bg-gray-100 text-gray-700';           // Gray for draft/neutral
      case 'sent':
        return 'bg-primary-100 text-primary-700';     // Blue for info/active
      case 'viewed':
        return 'bg-warning-100 text-warning-700';     // Yellow for warning/in progress
      case 'accepted':
        return 'bg-success-100 text-success-700';     // Green for completed/success
      case 'rejected':
        return 'bg-error-100 text-error-700';         // Red for urgent/error
      case 'expired':
        return 'bg-error-50 text-error-600';          // Light red for expired
      case 'withdrawn':
        return 'bg-purple-100 text-purple-700';       // Purple for special/custom
      default:
        return 'bg-gray-100 text-gray-700';           // Gray for unknown status
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'accepted':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'viewed':
        return <ClockSolidIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <DocumentTextIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const handleDelete = async () => {
    if (!proposal || !window.confirm('Are you sure you want to delete this proposal?')) {
      return;
    }

    try {
      await apiClient.delete(`/proposals/${proposal.id}`);
      dispatch(addNotification({
        type: 'success',
        title: 'Success',
        message: 'Proposal deleted successfully'
      }));
      navigate('/proposals');
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete proposal'
      }));
    }
  };

  const handleSend = async () => {
    if (!proposal) return;
    try {
      await apiClient.post(`/proposals/${proposal.id}/send`);
      dispatch(addNotification({
        type: 'success',
        title: 'Sent',
        message: 'Proposal sent to customer'
      }));
      await fetchProposal();
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to send proposal';
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: msg
      }));
    }
  };

  const handleAccept = async () => {
    if (!proposal) return;
    try {
      await apiClient.post(`/proposals/${proposal.id}/accept`);
      dispatch(addNotification({
        type: 'success',
        title: 'Accepted',
        message: 'Proposal marked as accepted'
      }));
      await fetchProposal();
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to accept proposal';
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: msg
      }));
    }
  };

  const handleReject = async () => {
    if (!proposal) return;
    const reason = window.prompt('Optional rejection reason (press OK to continue):') || '';
    try {
      const url = reason.trim()
        ? `/proposals/${proposal.id}/reject?rejection_reason=${encodeURIComponent(reason.trim())}`
        : `/proposals/${proposal.id}/reject`;
      await apiClient.post(url);
      dispatch(addNotification({
        type: 'success',
        title: 'Rejected',
        message: 'Proposal marked as rejected'
      }));
      await fetchProposal();
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to reject proposal';
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: msg
      }));
    }
  };

  const handleConvertToInvoice = async () => {
    if (!proposal) return;
    try {
      const customerId = proposal.customer?.id as string;
      let projectId = (proposal as any).project_id as string;
      if (!customerId) {
        dispatch(addNotification({ type: 'error', title: 'Cannot Convert', message: 'Proposal has no customer.' }));
        return;
      }
      if (!projectId) {
        try {
          const projectsRes = await apiClient.get('/projects/');
          const projs = projectsRes.data?.projects || projectsRes.data || [];
          if (!Array.isArray(projs) || projs.length === 0) {
            dispatch(addNotification({ type: 'error', title: 'Project Required', message: 'No projects available to assign.', }));
            return;
          }
          const options = projs.map((pr: any, idx: number) => `${idx + 1}) ${pr.name || pr.slug || pr.id}`).join('\n');
          const input = window.prompt(`Select a project number to use for the invoice:\n${options}`);
          const idx = input ? parseInt(input, 10) - 1 : -1;
          if (isNaN(idx) || idx < 0 || idx >= projs.length) {
            dispatch(addNotification({ type: 'error', title: 'Conversion Cancelled', message: 'Invalid project selection.' }));
            return;
          }
          projectId = projs[idx].id;
        } catch (e) {
          dispatch(addNotification({ type: 'error', title: 'Project Required', message: 'Failed to load projects.' }));
          return;
        }
      }
      const items = (proposal.content?.items || []) as Array<any>;
      if (!items.length) {
        dispatch(addNotification({ type: 'error', title: 'No Items', message: 'Proposal has no items to invoice.' }));
        return;
      }
      const invoiceItems = items.map((it) => ({
        description: it.description || it.name || 'Line item',
        quantity: Math.max(1, parseInt(String(it.quantity || 1), 10)),
        unit_price: Math.round(((it.unit_price || 0) as number) * 100),
        item_type: 'service',
        task_id: undefined,
        tax_rate: Math.round(((it.tax_rate || 0) as number) * 100),
        discount_rate: Math.round(((it.discount_rate || 0) as number) * 100),
      }));
      const payload: any = {
        project_id: projectId,
        customer_id: customerId,
        title: proposal.title ? `Invoice for ${proposal.title}` : 'Invoice',
        description: proposal.description || undefined,
        invoice_type: 'PROJECT',
        currency: proposal.currency || 'usd',
        payment_terms: 'net_30',
        invoice_date: new Date().toISOString(),
        items: invoiceItems,
        notes: proposal.notes || undefined,
        terms_and_conditions: proposal.custom_fields?.terms_and_conditions || undefined,
        tags: Array.isArray(proposal.tags) ? proposal.tags : [],
        custom_fields: { source: 'proposal', source_proposal_id: proposal.id },
      };
      const res = await apiClient.post('/invoices/', payload);
      dispatch(addNotification({ type: 'success', title: 'Converted', message: 'Proposal converted to invoice' }));
      const invId = res.data?.id;
      if (invId) navigate(`/invoices/${invId}`);
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to convert to invoice';
      dispatch(addNotification({ type: 'error', title: 'Error', message: msg }));
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await apiClient.get(`/proposals/${id}/pdf`, {
        responseType: 'blob'
      });
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `proposal_${proposal?.proposal_number || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      dispatch(addNotification({
        type: 'success',
        title: 'Success',
        message: 'Proposal PDF downloaded successfully'
      }));
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to download proposal PDF'
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="text-center2">
        <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Proposal not found</h3>
        <p className="mt-1 text-sm text-gray-500">{error || 'The proposal you are looking for does not exist.'}</p>
        <div className="mt-6">
          <button
            onClick={() => navigate('/proposals')}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-user-blue hover:bg-user-blue"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Proposals
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/proposals')}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{proposal.title}</h1>
            <p className="text-gray-600">
              {proposal.status} • #{proposal.proposal_number} • Created {new Date(proposal.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          {proposal.status && proposal.status.toLowerCase() === 'draft' && (
            <button
              onClick={handleSend}
              className="flex items-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
            >
              <DocumentTextIcon className="h-4 w-4" />
              Send
            </button>
          )}
          {/* Share Proposal button */}
          <button
            onClick={handleShareProposal}
            className="flex items-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
          >
            <LinkIcon className="h-4 w-4" />
            Share Proposal
          </button>
          {proposal.status && ['sent','viewed'].includes(proposal.status.toLowerCase()) && (
            <>
              <button
                onClick={handleAccept}
                className="flex items-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
              >
                <CheckCircleIcon className="h-4 w-4" />
                Accept
              </button>
              <button
                onClick={handleReject}
                className="flex items-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
              >
                <XCircleIcon className="h-4 w-4" />
                Reject
              </button>
            </>
          )}
          <button
            onClick={handleDownloadPDF}
            className="flex items-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
          >
            <DocumentArrowDownIcon className="h-4 w-4" />
            Download PDF
          </button>
          <button
            onClick={handleConvertToInvoice}
            className="flex items-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
          >
            <ArrowsRightLeftIcon className="h-4 w-4" />
            Convert to Invoice
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className="flex items-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
          >
            <PencilIcon className="h-4 w-4" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
          >
            <TrashIcon className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 font-medium text-sm rounded-md transition-colors focus:outline-none focus:ring-0 ${
              activeTab === 'overview'
                ? 'text-indigo-600'
                : 'text-black hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <DocumentTextIcon className="h-4 w-4" />
              <span>Overview</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`py-2 font-medium text-sm rounded-md transition-colors focus:outline-none focus:ring-0 ${
              activeTab === 'edit'
                ? 'text-indigo-600'
                : 'text-black hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <PencilIcon className="h-4 w-4" />
              <span>Edit</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Tab Content */}
          {activeTab === 'overview' && proposal && (
            <div className="space-y-6">
              {/* Key Financial Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Proposal Value</p>
                        <p className="text-2xl font-bold">${((proposal.total_amount || 0) / 100).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        {getStatusIcon(proposal.status)}
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Status</p>
                        <p className="text-lg font-bold capitalize">{proposal.status}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <CalendarIcon className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Valid Until</p>
                        <p className="text-lg font-bold">{proposal.valid_until ? new Date(proposal.valid_until).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <DocumentTextIcon className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Items</p>
                        <p className="text-2xl font-bold">{proposal.content?.items?.length || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Metrics - only show if we have overview data */}
              {overviewMetrics && (
                <div className="bg-white shadow rounded-lg detail-card">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Overview</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Proposals</p>
                      <p className="text-2xl font-bold text-blue-600">{overviewMetrics.proposals_total || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Accepted</p>
                      <p className="text-2xl font-bold text-green-600">{overviewMetrics.proposals_accepted || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Projects</p>
                      <p className="text-2xl font-bold text-purple-600">{overviewMetrics.projects_total || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Invoices</p>
                      <p className="text-2xl font-bold text-orange-600">{overviewMetrics.invoices_total || 0}</p>
                    </div>
                  </div>
                </div>
              )}
          {/* Proposal Details */}
          <div className="bg-white shadow rounded-lg">
            <div className="p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Proposal Details</h3>
              
              {proposal.description && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                  <p className="text-sm text-gray-600">{proposal.description}</p>
                </div>
              )}

              {/* PDF Section Structure */}
              {proposal.content?.section1 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">PDF Structure Preview</h4>
                  
                  {/* Section 1: Logo + Company Details */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                    <h5 className="text-sm font-semibold text-gray-800 mb-3">Section 1: Logo + Company Details</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        {proposal.content.section1.logo_url && (
                          <div className="mb-2">
                            <img src={proposal.content.section1.logo_url} alt="Company Logo" className="h-12 object-contain" />
                          </div>
                        )}
                        <div className="text-sm text-gray-700">
                          {proposal.content.section1.company_details.name && (
                            <div className="font-medium">{proposal.content.section1.company_details.name}</div>
                          )}
                          {proposal.content.section1.company_details.address && (
                            <div>{proposal.content.section1.company_details.address}</div>
                          )}
                          {proposal.content.section1.company_details.phone && (
                            <div>{proposal.content.section1.company_details.phone}</div>
                          )}
                          {proposal.content.section1.company_details.email && (
                            <div>{proposal.content.section1.company_details.email}</div>
                          )}
                          {proposal.content.section1.company_details.website && (
                            <div>{proposal.content.section1.company_details.website}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Proposal Heading */}
                  {proposal.content?.section2 && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                      <h5 className="text-sm font-semibold text-gray-800 mb-3">Section 2: Proposal Heading</h5>
                      <div className="text-center">
                        <h1 className="text-xl font-bold text-black mb-1">{proposal.content.section2.heading}</h1>
                        {proposal.content.section2.subheading && (
                          <p className="text-base text-gray-600">{proposal.content.section2.subheading}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Section 3: Left/Right Layout */}
                  {proposal.content?.section3 && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                      <h5 className="text-sm font-semibold text-gray-800 mb-3">Section 3: Details (Left/Right Layout)</h5>
                      <div className="grid grid-cols-2 gap-6">
                        {/* Left Section */}
                        <div>
                          <h6 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">Left Section</h6>
                          <div className="text-sm text-gray-700">
                            <div className="font-medium mb-1">{proposal.content.section3.left.content}</div>
                            {proposal.content.section3.left.details && (
                              <p className="text-xs whitespace-pre-wrap">{proposal.content.section3.left.details}</p>
                            )}
                          </div>
                        </div>
                        
                        {/* Right Section */}
                        <div>
                          <h6 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">Right Section</h6>
                          <div className="text-sm text-gray-700">
                            <div className="font-bold text-base mb-1">{proposal.content.section3.right.title}</div>
                            {proposal.content.section3.right.content && (
                              <p className="text-xs whitespace-pre-wrap">{proposal.content.section3.right.content}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Items */}
              {proposal.content?.items && proposal.content.items.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Items & Services</h4>
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-secondary-50">
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
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {item.item?.name || 'Item'}
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
                                ${(item.unit_price / 100).toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {(item.tax_rate / 100).toFixed(2)}%
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {(item.discount_rate / 100).toFixed(2)}%
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                ${itemTotal.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {proposal.notes && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Notes</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{proposal.notes}</p>
                </div>
              )}
            </div>
          </div>
            </div>
          )}

          {/* Edit Tab */}
          {activeTab === 'edit' && proposal && (
            <div className="bg-white shadow rounded-lg detail-card">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Edit Proposal</h3>
              <ProposalForm
                onSubmit={handleUpdateProposal}
                onCancel={() => setActiveTab('overview')}
                isLoading={isUpdating}
                initialData={prepareInitialData()}
                mode="edit"
              />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* 1. Customer Details */}
          <CustomerDetailsCard
            customer={(() => {
              if (insights?.customer) {
                return {
                  id: insights.customer.id,
                  name: insights.customer.name,
                  email: insights.customer.email,
                  phone: insights.customer.phone,
                  company: insights.customer.company,
                  address: insights.customer.address,
                  customerSince: insights.customer.customerSince,
                };
              }
              if (overviewCustomer) {
                return {
                  id: overviewCustomer.id,
                  name: overviewCustomer.display_name,
                  email: overviewCustomer.email,
                  company: overviewCustomer.company_name,
                } as any;
              }
              if (fallbackCustomerDetails) {
                return fallbackCustomerDetails;
              }
              const pid = (proposal as any)?.customer?.id || (proposal as any)?.customer_id;
              if (pid) {
                return {
                  id: pid,
                  name: (proposal as any)?.customer?.display_name || undefined,
                  email: (proposal as any)?.customer?.email || undefined,
                  company: (proposal as any)?.customer?.company_name || undefined,
                } as any;
              }
              return null;
            })()}
            isLoading={insightsLoading}
            error={insightsError}
          />

          {/* 2. Project Statistics */}
          <ProjectStatsCard
            stats={insights?.projects || null}
            customerId={insights?.customer?.id || overviewCustomer?.id || null}
            isLoading={insightsLoading}
          />

          {/* 3. Financial Overview */}
          <FinancialOverviewCard
            financial={insights?.financial || null}
            customerId={insights?.customer?.id || overviewCustomer?.id || null}
            isLoading={insightsLoading}
          />

          {/* 4. Proposal History */}
          <ProposalHistoryCard
            history={insights?.proposals || null}
            customerId={insights?.customer?.id || overviewCustomer?.id || null}
            isLoading={insightsLoading}
          />

        </div>
      </div>
    </div>
  );
};

export default ProposalDetailOverviewPage;
