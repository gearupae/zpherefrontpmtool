import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { Proposal, ProposalCreate, ProposalStatus, ProposalType, Customer, ProposalPDFStructure } from '../../types';
import { addNotification } from '../../store/slices/notificationSlice';
import InvoiceItemsTable from '../../components/Invoices/InvoiceItemsTable';
import DateRangeCalendar from '../../components/UI/DateRangeCalendar';
import { getTenantRoute } from '../../utils/tenantUtils';
import { 
  PlusIcon, 
  DocumentTextIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowsRightLeftIcon,
  DocumentArrowDownIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon,
  ArrowPathIcon,
  CheckIcon as CheckIconSolid,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import './FilterButtons.css';

type ProposalStatusType = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'PENDING' | 'EXPIRED' | 'VIEWED' | 'WITHDRAWN';

// Portal component for rendering filter popups outside table overflow context
const FilterPortal: React.FC<{ children: React.ReactNode; buttonRect: DOMRect | null }> = ({ children, buttonRect }) => {
  if (!buttonRect) return null;
  
  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        left: `${buttonRect.left}px`,
        top: `${buttonRect.bottom + 4}px`,
        zIndex: 99999,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
};

// Portal for inline edit popovers
const InlineEditPortal: React.FC<{ children: React.ReactNode; rect: DOMRect | null }> = ({ children, rect }) => {
  if (!rect) return null;
  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        left: `${rect.left}px`,
        top: `${rect.bottom + 4}px`,
        zIndex: 99999,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
};

const ProposalsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAppSelector((state) => state.auth);
  const createdByName = user ? (`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || (user as any).username || 'System User') : 'System User';
  
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<Array<{id: string; first_name?: string; last_name?: string; username?: string; email?: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Search and filter state
  const [proposalSearch, setProposalSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ProposalStatusType[]>([]);
  const [filterCustomerIds, setFilterCustomerIds] = useState<string[]>([]);
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [createdDateFilterFrom, setCreatedDateFilterFrom] = useState('');
  const [createdDateFilterTo, setCreatedDateFilterTo] = useState('');
  const [validUntilFilterFrom, setValidUntilFilterFrom] = useState('');
  const [validUntilFilterTo, setValidUntilFilterTo] = useState('');
  
  // Pending date selections
  const [pendingToolbarFrom, setPendingToolbarFrom] = useState('');
  const [pendingToolbarTo, setPendingToolbarTo] = useState('');
  const [pendingCreatedDateFrom, setPendingCreatedDateFrom] = useState('');
  const [pendingCreatedDateTo, setPendingCreatedDateTo] = useState('');
  const [pendingValidUntilFrom, setPendingValidUntilFrom] = useState('');
  const [pendingValidUntilTo, setPendingValidUntilTo] = useState('');
  
  // Filter popup state
  const [headerFilterOpen, setHeaderFilterOpen] = useState<null | 'status' | 'customer' | 'created_date' | 'valid_until'>(null);
  const [filterButtonRect, setFilterButtonRect] = useState<DOMRect | null>(null);
  const [toolbarDateOpen, setToolbarDateOpen] = useState(false);
  
  // Inline edit state
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'status' | 'title' | 'amount' | 'valid_until' | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  const [inlineEditRect, setInlineEditRect] = useState<DOMRect | null>(null);
  
  // Sorting state
  const [sortField, setSortField] = useState<'proposal' | 'status' | 'created_at' | 'valid_until' | 'total_amount' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  
  // Refs
  const headerFilterRef = useRef<HTMLDivElement | null>(null);
  const toolbarDateRef = useRef<HTMLButtonElement | null>(null);
  const inlinePopoverRef = useRef<HTMLDivElement | null>(null);
  
  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  // Items & additional fields for create form - matching InvoiceRow type
  type SelectedItem = {
    item?: any | null;
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    discount_rate: number;
  };
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([
    { item: null, description: '', quantity: 1, unit_price: 0, tax_rate: 0, discount_rate: 0 }
  ]);
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [validUntil, setValidUntil] = useState<string>('');
  const [tagsInput, setTagsInput] = useState<string>('');
  const [assignedToId, setAssignedToId] = useState<string>('');
  const [sendEmail, setSendEmail] = useState<boolean>(false);
  const [emailTo, setEmailTo] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [emailMessage, setEmailMessage] = useState<string>('');

  const makeDefaultPDFContent = (): ProposalPDFStructure => ({
    section1: {
      logo_url: '',
      company_details: {
        name: '',
        address: '',
        phone: '',
        email: '',
        website: ''
      }
    },
    section2: {
      heading: 'Proposal',
      subheading: ''
    },
    section3: {
      left: {
        content: 'Project Details',
        details: ''
      },
      right: {
        title: '',
        content: ''
      }
    },
    sections: [
      { title: 'Project Overview', content: '' },
      { title: 'Scope of Work', content: '' },
      { title: 'Timeline', content: '' },
      { title: 'Investment', content: '' },
      { title: 'Terms & Conditions', content: '' }
    ],
    items: []
  });

  const [newProposal, setNewProposal] = useState<ProposalCreate>({
    title: '',
    description: '',
    customer_id: '',
    proposal_type: ProposalType.PROJECT,
    content: makeDefaultPDFContent(),
    custom_template: {},
    total_amount: 0,
    currency: 'usd',
    tags: [],
    custom_fields: {}
  });

  const [stats, setStats] = useState({
    total_proposals: 0,
    draft_proposals: 0,
    sent_proposals: 0,
    accepted_proposals: 0,
    rejected_proposals: 0,
    total_value: 0,
    conversion_rate: 0
  });
  
  // Customer data state
  const [customerData, setCustomerData] = useState<Record<string, {
    invoiceDue: number;
    projectsCount: number;
    totalProposals: number;
  }>>({});

  useEffect(() => {
    fetchProposals();
    fetchCustomers();
    fetchUsers();
    fetchStats();
  }, []);
  
  // Wire URL query param ?customer= to filter
  useEffect(() => {
    const c = searchParams.get('customer') || searchParams.get('customer_id');
    if (c) {
      setFilterCustomerIds([c]);
    }
  }, [searchParams]);
  
  // Fetch customer data whenever proposals change
  useEffect(() => {
    if (proposals.length > 0) {
      fetchCustomerData();
    }
  }, [proposals]);

  // Close popups when clicking outside
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (editingProposalId && inlinePopoverRef.current && !inlinePopoverRef.current.contains(target)) {
        cancelInlineEdit();
      }
      if (headerFilterOpen && headerFilterRef.current && !headerFilterRef.current.contains(target)) {
        setHeaderFilterOpen(null);
      }
      // Toolbar date is now rendered via portal, so we don't need this check anymore
      // The FilterPortal component handles click-outside
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [editingProposalId, headerFilterOpen, toolbarDateOpen]);

  const fetchProposals = async () => {
    setIsLoading(true);
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get('/proposals/');
      const proposalsData = response.data.items || response.data || [];
      setProposals(Array.isArray(proposalsData) ? proposalsData : []);
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
      setProposals([]);
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load proposals',
        duration: 5000,
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get('/customers/');
      const customersData = response.data.customers || response.data.items || response.data || [];
      setCustomers(Array.isArray(customersData) ? customersData : []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      setCustomers([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get('/users/');
      const raw = (response.data && (response.data.users ?? response.data)) || [];
      setUsers(Array.isArray(raw) ? raw : []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
    }
  };

  const fetchStats = async () => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get('/proposals/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch proposal stats:', error);
      setStats({
        total_proposals: 0,
        draft_proposals: 0,
        sent_proposals: 0,
        accepted_proposals: 0,
        rejected_proposals: 0,
        total_value: 0,
        conversion_rate: 0
      });
    }
  };
  
  const fetchCustomerData = async () => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const data: Record<string, { invoiceDue: number; projectsCount: number; totalProposals: number }> = {};
      
      // Get unique customer IDs from proposals
      const uniqueCustomerIds = Array.from(new Set(proposals.map(p => p.customer_id).filter(Boolean)));
      
      await Promise.all(
        uniqueCustomerIds.map(async (customerId) => {
          try {
            // Fetch pending invoices for this customer
            let invoiceDue = 0;
            try {
              const invoicesRes = await apiClient.get(`/invoices/?customer_id=${customerId}`);
              const invoices = invoicesRes.data?.items || invoicesRes.data || [];
              // Sum up unpaid/partially paid invoices
              invoiceDue = invoices
                .filter((inv: any) => inv.payment_status !== 'PAID' && inv.payment_status !== 'paid')
                .reduce((sum: number, inv: any) => sum + (inv.amount_due || inv.total_amount || 0), 0);
            } catch (e) {
              // Invoices endpoint may not exist or customer has no invoices
              invoiceDue = 0;
            }
            
            // Fetch projects count for this customer
            let projectsCount = 0;
            try {
              const projectsRes = await apiClient.get(`/projects/?customer_id=${customerId}`);
              const projects = projectsRes.data?.projects || projectsRes.data || [];
              projectsCount = Array.isArray(projects) ? projects.length : 0;
            } catch (e) {
              projectsCount = 0;
            }
            
            // Count proposals for this customer
            const totalProposals = proposals.filter(p => p.customer_id === customerId).length;
            
            data[customerId] = {
              invoiceDue,
              projectsCount,
              totalProposals
            };
          } catch (error) {
            console.error(`Failed to fetch data for customer ${customerId}:`, error);
            data[customerId] = {
              invoiceDue: 0,
              projectsCount: 0,
              totalProposals: 0
            };
          }
        })
      );
      
      setCustomerData(data);
    } catch (error) {
      console.error('Failed to fetch customer data:', error);
    }
  };

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newProposal.title.trim()) {
      dispatch(addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Title is required',
        duration: 3000,
      }));
      return;
    }
    
    if (!newProposal.customer_id) {
      dispatch(addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please select a customer',
        duration: 3000,
      }));
      return;
    }
    
    try {
      const { default: apiClient } = await import('../../api/client');
      
      const contentItems = selectedItems.map(si => ({
        item_id: si.item?.id,
        name: si.item?.display_name || si.item?.name,
        description: si.description,
        quantity: si.quantity,
        unit_price: si.unit_price,
        total: si.quantity * si.unit_price,
        unit: si.item?.unit || 'each',
        tax_rate: si.tax_rate,
        discount_rate: si.discount_rate,
      }));

      const itemsSubtotal = selectedItems.reduce((sum, si) => sum + si.quantity * si.unit_price, 0);
      const itemsTax = selectedItems.reduce((sum, si) => sum + (si.quantity * si.unit_price) * (si.tax_rate / 100), 0);
      const itemsItemLevelDiscount = selectedItems.reduce((sum, si) => sum + (si.quantity * si.unit_price) * (si.discount_rate / 100), 0);
      let computedTotal = itemsSubtotal + itemsTax - itemsItemLevelDiscount;

      let overallDiscount = 0;
      if (discountType === 'percent' && discountValue > 0) {
        overallDiscount = computedTotal * (discountValue / 100);
      } else if (discountType === 'amount' && discountValue > 0) {
        overallDiscount = discountValue;
      }
      computedTotal = Math.max(0, computedTotal - overallDiscount);
      const totalCents = Math.round(computedTotal * 100);

      const proposalData: any = {
        ...newProposal,
        valid_until: validUntil ? new Date(validUntil).toISOString() : undefined,
        tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
        total_amount: totalCents,
        content: {
          ...(newProposal.content || {}),
          items: contentItems,
          discount: { type: discountType, value: discountValue, currency: newProposal.currency || 'usd' },
        },
        custom_fields: {
          ...(newProposal.custom_fields || {}),
          assigned_to_id: assignedToId || undefined,
          email_preferences: {
            send_email: sendEmail,
            email_to: emailTo || undefined,
            email_subject: emailSubject || undefined,
            email_message: emailMessage || undefined,
          }
        }
      };
      
      await apiClient.post('/proposals/', proposalData);
      
      setShowCreateForm(false);
      setNewProposal({
        title: '',
        description: '',
        customer_id: '',
        proposal_type: ProposalType.PROJECT,
        content: makeDefaultPDFContent(),
        custom_template: {},
        total_amount: 0,
        currency: 'usd',
        tags: [],
        custom_fields: {}
      });
      setSelectedItems([]);
      setDiscountType('percent');
      setDiscountValue(0);
      setValidUntil('');
      setTagsInput('');
      setAssignedToId('');
      setSendEmail(false);
      setEmailTo('');
      setEmailSubject('');
      setEmailMessage('');
      
      await fetchProposals();
      await fetchStats();
      
      dispatch(addNotification({
        type: 'success',
        title: 'Success',
        message: 'Proposal created successfully',
        duration: 3000,
      }));
    } catch (error: any) {
      console.error('Failed to create proposal:', error);
      const errorMessage = error?.response?.data?.detail || 
                          error?.response?.data?.message ||
                          error?.message ||
                          'Failed to create proposal. Please try again.';
      
      dispatch(addNotification({
        type: 'error',
        title: 'Error Creating Proposal',
        message: errorMessage,
        duration: 8000,
      }));
    }
  };

  const handleDeleteProposal = async (id: string) => {
    try {
      const { default: apiClient } = await import('../../api/client');
      await apiClient.delete(`/proposals/${id}`);
      await fetchProposals();
      await fetchStats();
      dispatch(addNotification({
        type: 'success',
        title: 'Success',
        message: 'Proposal deleted successfully',
        duration: 3000,
      }));
    } catch (error) {
      console.error('Failed to delete proposal:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete proposal',
        duration: 5000,
      }));
    }
  };

  // Inline edit handlers
  const startInlineEdit = (e: React.MouseEvent, proposal: Proposal, field: 'status' | 'title' | 'amount' | 'valid_until') => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    if (target && typeof target.getBoundingClientRect === 'function') {
      setInlineEditRect(target.getBoundingClientRect());
    } else {
      setInlineEditRect(null);
    }
    setEditingProposalId(proposal.id);
    setEditingField(field);
    
    if (field === 'status') setEditValue(proposal.status);
    if (field === 'title') setEditValue(proposal.title);
    if (field === 'valid_until') {
      const d = proposal.valid_until ? new Date(proposal.valid_until) : null;
      const yyyyMmDd = d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : '';
      setEditValue(yyyyMmDd);
    }
    if (field === 'amount') {
      const amountDollars = typeof proposal.total_amount === 'number' ? (proposal.total_amount / 100).toFixed(2) : '0.00';
      setEditValue(amountDollars);
    }
  };

  const saveInlineEdit = async (proposalId: string, valueOverride?: any) => {
    try {
      if (!editingField) return;
      const value = valueOverride !== undefined ? valueOverride : editValue;

      const { default: apiClient } = await import('../../api/client');
      const endpoint = `/proposals/${proposalId}/`; // use trailing slash to avoid 307 losing headers

      if (editingField === 'status') {
        // Backend expects ProposalStatus enum (lowercase)
        await apiClient.put(endpoint, { status: String(value).toLowerCase() });
      } else if (editingField === 'title') {
        await apiClient.put(endpoint, { title: value });
      } else if (editingField === 'valid_until') {
        const iso = value ? new Date(`${value}T00:00:00Z`).toISOString() : undefined;
        await apiClient.put(endpoint, { valid_until: iso });
      } else if (editingField === 'amount') {
        const amountCents = Math.round(Number(value) * 100);
        await apiClient.put(endpoint, { total_amount: amountCents });
      }

      // Optimistic local update for immediate UI feedback
      setProposals((prev) => prev.map((p) => {
        if (p.id !== proposalId) return p;
        if (editingField === 'status') return { ...p, status: String(value).toLowerCase() as any };
        if (editingField === 'title') return { ...p, title: String(value) } as any;
        if (editingField === 'valid_until') return { ...p, valid_until: new Date(`${value}T00:00:00Z`).toISOString() } as any;
        if (editingField === 'amount') return { ...p, total_amount: Math.round(Number(value) * 100) } as any;
        return p;
      }));

      // Also refresh from server to ensure consistency
      await fetchProposals();

      setEditingProposalId(null);
      setEditingField(null);
      setEditValue(null);
      setInlineEditRect(null);
    } catch (err: any) {
      console.error('Inline save failed:', err);
      const msg = err?.response?.data?.detail || err?.message || 'Failed to update proposal';
      dispatch(addNotification({
        type: 'error',
        title: 'Update failed',
        message: msg,
        duration: 5000,
      }));
    }
  };

  const cancelInlineEdit = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProposalId(null);
    setEditingField(null);
    setEditValue(null);
    setInlineEditRect(null);
  };

  // Sorting handler
  const onHeaderDblClick = (field: 'proposal' | 'status' | 'created_at' | 'valid_until' | 'total_amount') => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const getStatusIcon = (status: ProposalStatus) => {
    switch (status) {
      case ProposalStatus.ACCEPTED:
        return <CheckCircleIcon className="h-5 w-5 text-success-600" />;
      case ProposalStatus.REJECTED:
        return <XCircleIcon className="h-5 w-5 text-error-600" />;
      case ProposalStatus.SENT:
        return <PaperAirplaneIcon className="h-5 w-5 text-user-blue" />;
      case ProposalStatus.VIEWED:
        return <EyeIcon className="h-5 w-5 text-warning-600" />;
      default:
        return <ClockIcon className="h-5 w-5 text-secondary-400" />;
    }
  };

  const getStatusColorBold = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return 'bg-green-100 text-green-700';
      case 'REJECTED':
        return 'bg-red-100 text-red-700';
      case 'SENT':
        return 'bg-blue-100 text-blue-700';
      case 'VIEWED':
        return 'bg-yellow-100 text-yellow-700';
      case 'EXPIRED':
        return 'bg-red-100 text-red-600';
      case 'PENDING':
        return 'bg-orange-100 text-orange-700';
      case 'WITHDRAWN':
        return 'bg-purple-100 text-purple-700';
      default: // DRAFT
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Filter and sort proposals
  const displayedProposals = useMemo(() => {
    const startOfDayLocal = (dStr: string) => {
      const d = new Date(dStr);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    };
    const endOfDayLocal = (dStr: string) => {
      const d = new Date(dStr);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    };

    let arr = [...proposals];

    // Search filter
    if (proposalSearch.trim()) {
      const query = proposalSearch.toLowerCase();
      arr = arr.filter(prop => {
        const propNumber = (prop.proposal_number || '').toLowerCase();
        const customer = customers.find(c => c.id === prop.customer_id);
        const customerName = (customer?.display_name || customer?.company_name || '').toLowerCase();
        const title = (prop.title || '').toLowerCase();
        const amount = typeof prop.total_amount === 'number' ? (prop.total_amount / 100).toFixed(2) : '0.00';
        return propNumber.includes(query) || customerName.includes(query) || title.includes(query) || amount.includes(query);
      });
    }

    // Status filter
    if (filterStatus.length > 0) {
      arr = arr.filter(prop => filterStatus.includes(prop.status as ProposalStatusType));
    }

    // Customer filter
    if (filterCustomerIds.length > 0) {
      arr = arr.filter(prop => filterCustomerIds.includes(prop.customer_id));
    }

    // Created date filter
    if (createdDateFilterFrom) {
      const from = startOfDayLocal(createdDateFilterFrom);
      arr = arr.filter(prop => prop.created_at && new Date(prop.created_at) >= from);
    }
    if (createdDateFilterTo) {
      const to = endOfDayLocal(createdDateFilterTo);
      arr = arr.filter(prop => prop.created_at && new Date(prop.created_at) <= to);
    }

    // Valid until filter
    if (validUntilFilterFrom) {
      const from = startOfDayLocal(validUntilFilterFrom);
      arr = arr.filter(prop => prop.valid_until && new Date(prop.valid_until) >= from);
    }
    if (validUntilFilterTo) {
      const to = endOfDayLocal(validUntilFilterTo);
      arr = arr.filter(prop => prop.valid_until && new Date(prop.valid_until) <= to);
    }

    // Sorting
    if (sortField) {
      const statusOrder: Record<string, number> = { DRAFT: 1, SENT: 2, VIEWED: 3, PENDING: 4, ACCEPTED: 5, REJECTED: 6, EXPIRED: 7, WITHDRAWN: 8 };
      arr.sort((a, b) => {
        let av: any = 0;
        let bv: any = 0;
        switch (sortField) {
          case 'proposal': {
            const getNum = (p: any): number | null => {
              const raw = (p as any).proposal_number ?? (p as any).number ?? (p as any).proposal_no ?? '';
              if (typeof raw === 'number') return raw;
              if (typeof raw === 'string') {
                const m = raw.match(/(\d+)/);
                if (m) {
                  const n = parseInt(m[1], 10);
                  if (!isNaN(n)) return n;
                }
              }
              return null;
            };
            const aNum = getNum(a);
            const bNum = getNum(b);
            if (aNum !== null && bNum !== null) {
              av = aNum;
              bv = bNum;
            } else {
              const aKey = String((a as any).proposal_number ?? (a as any).number ?? (a as any).proposal_no ?? a.id ?? '').toUpperCase();
              const bKey = String((b as any).proposal_number ?? (b as any).number ?? (b as any).proposal_no ?? b.id ?? '').toUpperCase();
              av = aKey as any;
              bv = bKey as any;
            }
            break;
          }
          case 'status':
            av = statusOrder[a.status] ?? 0;
            bv = statusOrder[b.status] ?? 0;
            break;
          case 'created_at':
            av = a.created_at ? new Date(a.created_at).getTime() : 0;
            bv = b.created_at ? new Date(b.created_at).getTime() : 0;
            break;
          case 'valid_until':
            av = a.valid_until ? new Date(a.valid_until).getTime() : 0;
            bv = b.valid_until ? new Date(b.valid_until).getTime() : 0;
            break;
          case 'total_amount':
            av = a.total_amount || 0;
            bv = b.total_amount || 0;
            break;
        }
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return arr;
  }, [proposals, proposalSearch, filterStatus, filterCustomerIds, createdDateFilterFrom, createdDateFilterTo, validUntilFilterFrom, validUntilFilterTo, sortField, sortDir, customers]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Display helper: show backend-provided proposal number as-is (uppercase),
  // with a PRO-<n> fallback when absent
  const formatProposalNumber = (p: Proposal, idx?: number): string => {
    const raw: any = (p as any).proposal_number ?? (p as any).proposal_no ?? (p as any).number;
    if (typeof raw === 'string') {
      const r = raw.trim();
      if (r.length === 0) return `PRO-${(idx ?? 0) + 1}`;
      return r.toUpperCase();
    }
    if (typeof raw === 'number' && !isNaN(raw)) {
      return `PRO-${raw}`;
    }
    return `PRO-${(idx ?? 0) + 1}`;
  };

  const sendProposal = async (id: string) => {
    try {
      const { default: apiClient } = await import('../../api/client');
      await apiClient.post(`/proposals/${id}/send/`);
      await fetchProposals();
      await fetchStats();
      dispatch(addNotification({
        type: 'success',
        title: 'Sent',
        message: 'Proposal sent to customer',
        duration: 3000,
      }));
    } catch (error: any) {
      console.error('Failed to send proposal:', error);
      const msg = error?.response?.data?.detail || 'Failed to send proposal';
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: msg,
        duration: 5000,
      }));
    }
  };

  const downloadProposalPDF = async (id: string, number?: string) => {
    try {
      const { default: apiClient } = await import('../../api/client');
      // Backend route is GET /proposals/{id}/pdf (no trailing slash)
      const response = await apiClient.get(`/proposals/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `proposal_${number || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download proposal PDF:', error);
    }
  };

  const convertToInvoice = async (proposalId: string) => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const detail = await apiClient.get(`/proposals/${proposalId}/`);
      const p = detail.data || {};
      if (!p.customer_id && !p.customer?.id) {
        dispatch(addNotification({ type: 'error', title: 'Cannot Convert', message: 'Proposal has no customer.', duration: 4000 }));
        return;
      }
      const customerId = p.customer_id || p.customer.id;
      let projectId = p.project_id;
      if (!projectId) {
        try {
          const projectsRes = await apiClient.get('/projects/');
          const projs = projectsRes.data?.projects || projectsRes.data || [];
          if (!Array.isArray(projs) || projs.length === 0) {
            dispatch(addNotification({ type: 'error', title: 'Project Required', message: 'No projects available to assign.', duration: 5000 }));
            return;
          }
          const options = projs.map((pr: any, idx: number) => `${idx + 1}) ${pr.name || pr.slug || pr.id}`).join('\n');
          const input = window.prompt(`Select a project number to use for the invoice:\n${options}`);
          const idx = input ? parseInt(input, 10) - 1 : -1;
          if (isNaN(idx) || idx < 0 || idx >= projs.length) {
            dispatch(addNotification({ type: 'error', title: 'Conversion Cancelled', message: 'Invalid project selection.', duration: 4000 }));
            return;
          }
          projectId = projs[idx].id;
        } catch (e) {
          dispatch(addNotification({ type: 'error', title: 'Project Required', message: 'Failed to load projects.', duration: 5000 }));
          return;
        }
      }
      const items = (p.content?.items || []) as Array<any>;
      if (!items.length) {
        dispatch(addNotification({ type: 'error', title: 'No Items', message: 'Proposal has no items to invoice.', duration: 4000 }));
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

      const nowIso = new Date().toISOString();
      const payload: any = {
        project_id: projectId,
        customer_id: customerId,
        title: p.title ? `Invoice for ${p.title}` : 'Invoice',
        description: p.description || undefined,
        invoice_type: 'PROJECT',
        currency: p.currency || 'usd',
        payment_terms: 'net_30',
        invoice_date: nowIso,
        items: invoiceItems,
        notes: p.notes || undefined,
        terms_and_conditions: p.custom_fields?.terms_and_conditions || undefined,
        tags: Array.isArray(p.tags) ? p.tags : [],
        custom_fields: {
          source: 'proposal',
          source_proposal_id: p.id,
        }
      };

      const res = await apiClient.post('/invoices/', payload);
      dispatch(addNotification({ type: 'success', title: 'Converted', message: 'Proposal converted to invoice.', duration: 3000 }));
      const invId = res.data?.id;
      if (invId) {
        navigate(getTenantRoute(`/invoices/${invId}`, user?.role, user?.organization));
      }
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to convert to invoice';
      dispatch(addNotification({ type: 'error', title: 'Error', message: msg, duration: 5000 }));
    }
  };

  if (isLoading && proposals.length === 0) {
    return <div />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center">
        <div className="flex-[0.35]">
          <h1 className="page-title font-bold text-gray-900">Proposal Overview</h1>
          <div className="text-gray-600 mt-1 text-sm">Create, share, and track proposal progress</div>
        </div>
        <div className="flex-[0.65] flex justify-end">
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-page-action flex items-center btn-styled btn-create-auto" style={{ backgroundColor: 'rgb(0, 0, 0)', color: 'white', borderColor: 'rgb(0, 0, 0)', fontSize: '0.875rem', padding: '0.2rem 0.75rem' }}
          >
            <PlusIcon className="h-5 w-5" />
            <span>New Proposal</span>
          </button>
        </div>
      </div>

      {/* Create Proposal Form */}
      {showCreateForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-6 border border-gray-200">
          <div className="flex items-center mb-6">
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <DocumentTextIcon className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Create New Proposal</h2>
            <button
              onClick={() => setShowCreateForm(false)}
              className="ml-auto text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <form onSubmit={handleCreateProposal} className="space-y-6">
            {/* Row 1: Title, Customer, Status, Currency */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newProposal.title}
                  onChange={(e) => setNewProposal({ ...newProposal, title: e.target.value })}
                  className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter proposal title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer <span className="text-red-600">*</span>
                </label>
                <select
                  required
                  value={newProposal.customer_id}
                  onChange={(e) => setNewProposal({ ...newProposal, customer_id: e.target.value })}
                  className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.display_name || customer.company_name || customer.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <input
                  type="text"
                  value="DRAFT"
                  disabled
                  className="w-full py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select
                  value={newProposal.currency}
                  onChange={(e) => setNewProposal({ ...newProposal, currency: e.target.value })}
                  className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="usd">USD</option>
                  <option value="eur">EUR</option>
                  <option value="gbp">GBP</option>
                </select>
              </div>
            </div>

            {/* Row 2: Date Created, Valid Until, Proposal Type, Created By */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Created</label>
                <input
                  type="date"
                  value={new Date().toISOString().split('T')[0]}
                  disabled
                  className="w-full py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proposal Type</label>
                <select
                  value={newProposal.proposal_type}
                  onChange={(e) => setNewProposal({ ...newProposal, proposal_type: e.target.value as ProposalType })}
                  className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={ProposalType.PROJECT}>Project</option>
                  <option value={ProposalType.CONSULTING}>Consulting</option>
                  <option value={ProposalType.MAINTENANCE}>Maintenance</option>
                  <option value={ProposalType.SUPPORT}>Support</option>
                  <option value={ProposalType.CUSTOM}>Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
                <input
                  type="text"
                  value={createdByName}
                  disabled
                  className="w-full py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Row 3: Tags, Discount Type, Discount Value, Assigned To */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., urgent, consulting"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as 'percent' | 'amount')}
                  className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="percent">Percentage</option>
                  <option value="amount">Fixed Amount</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                <select
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Not assigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username || u.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description - Full Width */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={newProposal.description}
                onChange={(e) => setNewProposal({ ...newProposal, description: e.target.value })}
                rows={3}
                className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the proposal details and services provided"
              />
            </div>

            {/* Items Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Items *</label>
              <InvoiceItemsTable
                selectedItems={selectedItems}
                onItemsChange={setSelectedItems}
              />
            </div>


            {/* Email Notification Section */}
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendEmail"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="sendEmail" className="text-sm font-medium text-gray-700">
                  Send email notification
                </label>
              </div>

              {sendEmail && (
                <div className="mt-4 space-y-3 pl-6 border-l-2 border-blue-300">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email To</label>
                    <input
                      type="email"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="recipient@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Proposal for your review"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <textarea
                      value={emailMessage}
                      onChange={(e) => setEmailMessage(e.target.value)}
                      rows={3}
                      className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your message..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Form Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setSelectedItems([{ item: null, description: '', quantity: 1, unit_price: 0, tax_rate: 0, discount_rate: 0 }]);
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={selectedItems.filter(si => (si.description?.trim() || si.item)).length === 0}
                className="btn btn-primary disabled:opacity-50"
              >
                Create Proposal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="metric-card metric-blue bg-white px-4 py-3 rounded-lg shadow border-t-4 border-blue-600">
          <div className="flex items-center">
            <div className="p-2 bg-blue-50 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Proposals</p>
              <p className="metric-value text-2xl font-bold">{stats.total_proposals}</p>
            </div>
          </div>
        </div>

        <div className="metric-card metric-green bg-white px-4 py-3 rounded-lg shadow border-t-4 border-green-600">
          <div className="flex items-center">
            <div className="p-2 bg-green-50 rounded-lg">
              <PaperAirplaneIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Sent Proposals</p>
              <p className="metric-value text-2xl font-bold">{stats.sent_proposals}</p>
            </div>
          </div>
        </div>

        <div className="metric-card metric-yellow bg-white px-4 py-3 rounded-lg shadow border-t-4 border-yellow-600">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Accepted</p>
              <p className="metric-value text-2xl font-bold">{stats.accepted_proposals}</p>
            </div>
          </div>
        </div>

        <div className="metric-card metric-red bg-white px-4 py-3 rounded-lg shadow border-t-4 border-red-600">
          <div className="flex items-center">
            <div className="p-2 bg-red-50 rounded-lg">
              <XCircleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Rejected Proposals</p>
              <p className="metric-value text-2xl font-bold">{stats.rejected_proposals}</p>
            </div>
          </div>
        </div>

        <div className="metric-card metric-purple bg-white px-4 py-3 rounded-lg shadow border-t-4 border-purple-600">
          <div className="flex items-center">
            <div className="p-2 bg-purple-50 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="metric-value text-2xl font-bold">{formatCurrency(stats.total_value / 100)}</p>
            </div>
          </div>
        </div>
      </div>


      {/* Proposals List View */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                All Proposals ({proposals.length})
              </h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search proposals..."
                    value={proposalSearch}
                    onChange={(e) => setProposalSearch(e.target.value)}
                    className="w-40 pl-7 pr-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-0 focus:border-gray-300"
                  />
                </div>
                <button
                  type="button"
                  title="Refresh"
                  className="p-1 text-gray-500 hover:text-gray-700"
                  onClick={() => {
                    setHeaderFilterOpen(null);
                    setToolbarDateOpen(false);
                    setProposalSearch('');
                    setSortField(null);
                    setSortDir('asc');
                    setFilterStatus([]);
                    setFilterCustomerIds([]);
                    setFilterFromDate('');
                    setFilterToDate('');
                    setCreatedDateFilterFrom('');
                    setCreatedDateFilterTo('');
                    setValidUntilFilterFrom('');
                    setValidUntilFilterTo('');
                    setPendingToolbarFrom('');
                    setPendingToolbarTo('');
                    setPendingCreatedDateFrom('');
                    setPendingCreatedDateTo('');
                    setPendingValidUntilFrom('');
                    setPendingValidUntilTo('');
                    fetchProposals();
                  }}
                >
                  <ArrowPathIcon className="w-4 h-4" />
                </button>
                <div className="relative">
                  <button
                    type="button"
                    title="Filter by date range"
                    className="p-1 text-gray-500 hover:text-gray-700"
                    ref={toolbarDateRef}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingToolbarFrom(filterFromDate || '');
                      setPendingToolbarTo(filterToDate || '');
                      setToolbarDateOpen((o) => !o);
                    }}
                  >
                    <CalendarIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto projects-table" style={{backgroundColor: 'rgb(249, 250, 251)'}}>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th onDoubleClick={() => onHeaderDblClick('proposal')} className="py-2 text-left text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
                    Proposal
                  </th>
                  <th className="py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    <div className="inline-flex items-center gap-1">
                      <span>Customer</span>
                      <span className="relative">
                        <button
                          type="button"
                          className="p-0.5 text-gray-500 hover:text-gray-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            const isOpening = headerFilterOpen !== 'customer';
                            if (isOpening) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setFilterButtonRect(rect);
                            }
                            setHeaderFilterOpen(isOpening ? 'customer' : null);
                          }}
                        >
                          <FunnelIcon className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    </div>
                  </th>
                  <th className="py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Title
                  </th>
                  <th onDoubleClick={() => onHeaderDblClick('total_amount')} className="py-2 text-left text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
                    Amount
                  </th>
                  <th onDoubleClick={() => onHeaderDblClick('status')} className="py-2 text-left text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
                    <div className="inline-flex items-center gap-1">
                      <span>Status</span>
                      <span className="relative">
                        <button
                          type="button"
                          className="p-0.5 text-gray-500 hover:text-gray-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            const isOpening = headerFilterOpen !== 'status';
                            if (isOpening) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setFilterButtonRect(rect);
                            }
                            setHeaderFilterOpen(isOpening ? 'status' : null);
                          }}
                        >
                          <FunnelIcon className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    </div>
                  </th>
                  <th onDoubleClick={() => onHeaderDblClick('created_at')} className="py-2 text-left text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
                    <div className="inline-flex items-center gap-1">
                      <span>Created Date</span>
                      <span className="relative">
                        <button
                          type="button"
                          className="p-0.5 text-gray-500 hover:text-gray-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            const isOpening = headerFilterOpen !== 'created_date';
                            if (isOpening) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setFilterButtonRect(rect);
                              setPendingCreatedDateFrom(createdDateFilterFrom || '');
                              setPendingCreatedDateTo(createdDateFilterTo || '');
                            }
                            setHeaderFilterOpen(isOpening ? 'created_date' : null);
                          }}
                        >
                          <CalendarIcon className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    </div>
                  </th>
                  <th onDoubleClick={() => onHeaderDblClick('valid_until')} className="py-2 text-left text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
                    <div className="inline-flex items-center gap-1">
                      <span>Valid Until</span>
                      <span className="relative">
                        <button
                          type="button"
                          className="p-0.5 text-gray-500 hover:text-gray-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            const isOpening = headerFilterOpen !== 'valid_until';
                            if (isOpening) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setFilterButtonRect(rect);
                              setPendingValidUntilFrom(validUntilFilterFrom || '');
                              setPendingValidUntilTo(validUntilFilterTo || '');
                            }
                            setHeaderFilterOpen(isOpening ? 'valid_until' : null);
                          }}
                        >
                          <CalendarIcon className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    </div>
                  </th>
                  <th className="py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Invoice Due
                  </th>
                  <th className="py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Projects
                  </th>
                  <th className="py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Total Proposals
                  </th>
                  <th className="py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
            </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayedProposals.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-sm text-gray-500">
                      No proposals found
                    </td>
                  </tr>
              ) : (
              displayedProposals.map((proposal, idx) => {
                const customer = customers.find(c => c.id === proposal.customer_id);
                const customerName = customer?.display_name || customer?.company_name || 'Unknown';
                const amountDollars = typeof proposal.total_amount === 'number' ? (proposal.total_amount / 100) : 0;
                const createdD = proposal.created_at ? new Date(proposal.created_at) : null;
                const createdStr = createdD ? createdD.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';
                const validD = proposal.valid_until ? new Date(proposal.valid_until) : null;
                const validStr = validD ? validD.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';
                
                return (
                  <tr
                    key={proposal.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(getTenantRoute(`/proposals/${proposal.id}`, user?.role, user?.organization))}
                  >
                    <td className="py-2 whitespace-nowrap text-base font-semibold text-black">
                      {formatProposalNumber(proposal, idx)}
                    </td>
                    <td className="py-2 whitespace-nowrap text-base text-black">
                      {customerName}
                    </td>
                    <td
                      className="py-2 text-sm text-gray-900 cursor-pointer hover:bg-user-blue/10 transition-colors"
                      onClick={(e) => startInlineEdit(e, proposal, 'title')}
                      title="Click to edit title"
                    >
                      {proposal.title || '(No Title)'}
                    </td>
                    <td
                      className="py-2 whitespace-nowrap text-sm font-semibold text-gray-900 cursor-pointer hover:bg-user-blue/10 transition-colors"
                      onClick={(e) => startInlineEdit(e, proposal, 'amount')}
                      title="Click to edit amount"
                    >
                      {formatCurrency(amountDollars)}
                    </td>
                    <td
                      className="py-2 whitespace-nowrap cursor-pointer hover:bg-user-blue/10 transition-colors"
                      onClick={(e) => startInlineEdit(e, proposal, 'status')}
                      title="Click to edit status"
                    >
                      <span className={`inline-flex px-1.5 pt-0 pb-0.5 text-xs font-light rounded-sm ${getStatusColorBold(proposal.status)}`}>
                        {proposal.status}
                      </span>
                    </td>
                    <td className="py-2 whitespace-nowrap text-sm text-gray-700">
                      {createdStr}
                    </td>
                    <td
                      className="py-2 whitespace-nowrap text-sm text-gray-700 cursor-pointer hover:bg-user-blue/10 transition-colors"
                      onClick={(e) => startInlineEdit(e, proposal, 'valid_until')}
                      title="Click to edit valid until date"
                    >
                      {validStr}
                    </td>
                    <td className="py-2 whitespace-nowrap text-sm text-gray-900">
                      {customerData[proposal.customer_id]?.invoiceDue !== undefined
                        ? formatCurrency(customerData[proposal.customer_id].invoiceDue / 100)
                        : '-'}
                    </td>
                    <td className="py-2 whitespace-nowrap text-sm text-gray-900">
                      {customerData[proposal.customer_id]?.projectsCount ?? '-'}
                    </td>
                    <td className="py-2 whitespace-nowrap text-sm text-gray-900">
                      {customerData[proposal.customer_id]?.totalProposals ?? '-'}
                    </td>
                    <td className="py-2 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {proposal.status === 'DRAFT' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); sendProposal(proposal.id); }}
                            className="inline-flex items-center justify-center p-2 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                            title="Send Proposal"
                          >
                            <PaperAirplaneIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); downloadProposalPDF(proposal.id, formatProposalNumber(proposal)); }}
                          className="inline-flex items-center justify-center p-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                          title="Download PDF"
                        >
                          <DocumentArrowDownIcon className="h-4 w-4" />
                        </button>
                        {proposal.status === 'ACCEPTED' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); convertToInvoice(proposal.id); }}
                            className="inline-flex items-center justify-center p-2 rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                            title="Convert to Invoice"
                          >
                            <ArrowsRightLeftIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(getTenantRoute(`/proposals/${proposal.id}`, user?.role, user?.organization)); }}
                          className="inline-flex items-center justify-center p-2 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(proposal.id); }}
                          className="inline-flex items-center justify-center p-2 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                          title="Delete Proposal"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
              </tbody>
            </table>
          </div>

          {/* Render all filter popups via portal */}
          {headerFilterOpen === 'status' && (
            <FilterPortal buttonRect={filterButtonRect}>
              <div ref={headerFilterRef} className="w-40 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{borderRadius: '5px'}}>
                <div className="px-1.5 text-xs text-gray-800 font-medium">Filter status</div>
                <ul className="max-h-48 overflow-auto">
                  {(['DRAFT', 'SENT', 'VIEWED', 'PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN'] as ProposalStatusType[]).map(st => {
                    const checked = filterStatus.includes(st);
                    return (
                      <li key={st}>
                        <label className="flex items-center gap-2 px-1.5 py-0.5 rounded-sm hover:bg-gray-50 cursor-pointer text-xs font-normal">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={checked}
                            onChange={(e) => {
                              e.stopPropagation();
                              setFilterStatus(prev => checked ? prev.filter(x => x !== st) : [...prev, st]);
                            }}
                          />
                          <span>{st}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                <div className="flex justify-end gap-2 px-1.5 border-t border-gray-100 mt-1">
                  <button className="filter-popup-btn filter-popup-btn-clear" onClick={(e) => { e.stopPropagation(); setFilterStatus([]); }}>Clear</button>
                  <button className="filter-popup-btn filter-popup-btn-close" onClick={(e) => { e.stopPropagation(); setHeaderFilterOpen(null); }}>Close</button>
                </div>
              </div>
            </FilterPortal>
          )}

          {headerFilterOpen === 'customer' && (
            <FilterPortal buttonRect={filterButtonRect}>
              <div ref={headerFilterRef} className="w-52 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{borderRadius: '5px'}}>
                <div className="px-1.5 text-xs text-gray-800 font-medium">Filter customer</div>
                <ul className="max-h-48 overflow-auto">
                  {customers.map(c => {
                    const selected = filterCustomerIds.includes(c.id);
                    const label = c.display_name || c.company_name || c.email;
                    return (
                      <li key={c.id}>
                        <label className="flex items-center gap-2 px-1.5 py-0.5 rounded-sm hover:bg-gray-50 cursor-pointer text-xs font-normal">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={selected}
                            onChange={(e) => {
                              e.stopPropagation();
                              setFilterCustomerIds(prev => selected ? prev.filter(id => id !== c.id) : [...prev, c.id]);
                            }}
                          />
                          <span>{label}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                <div className="flex justify-end gap-2 px-1.5 border-t border-gray-100 mt-1">
                  <button className="filter-popup-btn filter-popup-btn-clear" onClick={(e)=>{ e.stopPropagation(); setFilterCustomerIds([]); }}>Clear</button>
                  <button className="filter-popup-btn filter-popup-btn-close" onClick={(e)=>{ e.stopPropagation(); setHeaderFilterOpen(null); }}>Close</button>
                </div>
              </div>
            </FilterPortal>
          )}

          {headerFilterOpen === 'created_date' && (
            <FilterPortal buttonRect={filterButtonRect}>
              <div ref={headerFilterRef} className="w-64 border border-gray-200 bg-white shadow-sm p-1.5 text-xs" style={{borderRadius: '5px'}}>
                <div className="px-1 pb-1">
                  <DateRangeCalendar size="sm"
                    initialFrom={pendingCreatedDateFrom || null}
                    initialTo={pendingCreatedDateTo || null}
                    onChange={(from, to) => {
                      if (from && !to) {
                        setPendingCreatedDateFrom(from);
                        setPendingCreatedDateTo(from);
                      } else {
                        setPendingCreatedDateFrom(from || '');
                        setPendingCreatedDateTo(to || '');
                      }
                    }}
                  />
                </div>
                <div className="flex justify-end gap-2 px-1.5 border-t border-gray-100 mt-1">
                  <button className="filter-popup-btn filter-popup-btn-clear" onClick={(e) => { e.stopPropagation(); setCreatedDateFilterFrom(''); setCreatedDateFilterTo(''); setHeaderFilterOpen(null); }}>Clear</button>
                  <button className="filter-popup-btn filter-popup-btn-filter" onClick={(e) => {
                    e.stopPropagation();
                    const from = pendingCreatedDateFrom || '';
                    const to = pendingCreatedDateTo || pendingCreatedDateFrom || '';
                    setCreatedDateFilterFrom(from);
                    setCreatedDateFilterTo(to);
                    setHeaderFilterOpen(null);
                  }}>Filter</button>
                </div>
              </div>
            </FilterPortal>
          )}

          {headerFilterOpen === 'valid_until' && (
            <FilterPortal buttonRect={filterButtonRect}>
              <div ref={headerFilterRef} className="w-64 border border-gray-200 bg-white shadow-sm p-1.5 text-xs" style={{borderRadius: '5px'}}>
                <div className="px-1 pb-1">
                  <DateRangeCalendar size="sm"
                    initialFrom={pendingValidUntilFrom || null}
                    initialTo={pendingValidUntilTo || null}
                    onChange={(from, to) => {
                      if (from && !to) {
                        setPendingValidUntilFrom(from);
                        setPendingValidUntilTo(from);
                      } else {
                        setPendingValidUntilFrom(from || '');
                        setPendingValidUntilTo(to || '');
                      }
                    }}
                  />
                </div>
                <div className="flex justify-end gap-2 px-1.5 border-t border-gray-100 mt-1">
                  <button className="filter-popup-btn filter-popup-btn-clear" onClick={(e) => { e.stopPropagation(); setValidUntilFilterFrom(''); setValidUntilFilterTo(''); setHeaderFilterOpen(null); }}>Clear</button>
                  <button className="filter-popup-btn filter-popup-btn-filter" onClick={(e) => {
                    e.stopPropagation();
                    const from = pendingValidUntilFrom || '';
                    const to = pendingValidUntilTo || pendingValidUntilFrom || '';
                    setValidUntilFilterFrom(from);
                    setValidUntilFilterTo(to);
                    setHeaderFilterOpen(null);
                  }}>Filter</button>
                </div>
              </div>
            </FilterPortal>
          )}
          
          {/* Toolbar Date Filter Portal */}
          {toolbarDateOpen && toolbarDateRef.current && (() => {
            const rect = toolbarDateRef.current!.getBoundingClientRect();
            const popupWidth = 256; // w-64 = 16rem = 256px
            // Calculate position to align right edge of popup with right edge of button
            const leftPos = rect.right - popupWidth;
            
            return ReactDOM.createPortal(
              <div
                style={{
                  position: 'fixed',
                  left: `${leftPos}px`,
                  top: `${rect.bottom + 4}px`,
                  zIndex: 99999,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-64 border border-gray-200 bg-white shadow-sm p-1.5 text-xs" style={{borderRadius: '5px'}}>
                  <div className="px-1 pb-1">
                    <DateRangeCalendar size="sm"
                      initialFrom={pendingToolbarFrom || null}
                      initialTo={pendingToolbarTo || null}
                      onChange={(from, to) => {
                        if (from && !to) {
                          setPendingToolbarFrom(from);
                          setPendingToolbarTo(from);
                        } else {
                          setPendingToolbarFrom(from || '');
                          setPendingToolbarTo(to || '');
                        }
                      }}
                    />
                  </div>
                  <div className="flex justify-end gap-2 px-1.5 border-t border-gray-100 mt-1">
                    <button className="filter-popup-btn filter-popup-btn-clear" onClick={(e) => { e.stopPropagation(); setFilterFromDate(''); setFilterToDate(''); setToolbarDateOpen(false); }}>Clear</button>
                    <button className="filter-popup-btn filter-popup-btn-filter" onClick={(e) => {
                      e.stopPropagation();
                      const from = pendingToolbarFrom || '';
                      const to = pendingToolbarTo || pendingToolbarFrom || '';
                      setFilterFromDate(from);
                      setFilterToDate(to);
                      setToolbarDateOpen(false);
                    }}>Filter</button>
                  </div>
                </div>
              </div>,
              document.body
            );
          })()}
      </div>

      {/* Inline Edit Portals */}
      {editingProposalId && editingField === 'status' && (
        <InlineEditPortal rect={inlineEditRect}>
          <div ref={inlinePopoverRef} className="w-44 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{ borderRadius: '5px' }}>
            <ul className="max-h-64 overflow-auto">
              {['draft','sent','viewed','pending','accepted','rejected','expired','withdrawn'].map((opt) => (
                <li
                  key={opt}
                  className={`px-2 rounded-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between ${String(editValue).toLowerCase() === opt ? 'bg-gray-50' : ''}`}
                  onClick={() => { saveInlineEdit(editingProposalId, opt); }}
                >
                  <span className="capitalize">{opt.replace('_', ' ')}</span>
                  {String(editValue).toLowerCase() === opt && <CheckIconSolid className="w-4 h-4 text-user-blue" />}
                </li>
              ))}
            </ul>
          </div>
        </InlineEditPortal>
      )}

      {editingProposalId && editingField === 'title' && (
        <InlineEditPortal rect={inlineEditRect}>
          <div ref={inlinePopoverRef} className="w-64 border border-gray-200 bg-white shadow-sm p-1.5 text-xs" style={{ borderRadius: '5px' }}>
            <input
              autoFocus
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveInlineEdit(editingProposalId);
                } else if (e.key === 'Escape') {
                  cancelInlineEdit();
                }
              }}
              onBlur={() => saveInlineEdit(editingProposalId)}
              className="block w-full h-8 px-2 border border-gray-300 rounded-sm shadow-none focus:outline-none focus:ring-0 focus:border-gray-400 text-xs"
            />
          </div>
        </InlineEditPortal>
      )}

      {editingProposalId && editingField === 'amount' && (
        <InlineEditPortal rect={inlineEditRect}>
          <div ref={inlinePopoverRef} className="w-48 border border-gray-200 bg-white shadow-sm p-1.5 text-xs" style={{ borderRadius: '5px' }}>
            <input
              autoFocus
              type="number"
              step="0.01"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveInlineEdit(editingProposalId);
                } else if (e.key === 'Escape') {
                  cancelInlineEdit();
                }
              }}
              onBlur={() => saveInlineEdit(editingProposalId)}
              className="block w-full h-8 px-2 border border-gray-300 rounded-sm shadow-none focus:outline-none focus:ring-0 focus:border-gray-400 text-xs"
            />
          </div>
        </InlineEditPortal>
      )}

      {editingProposalId && editingField === 'valid_until' && (
        <InlineEditPortal rect={inlineEditRect}>
          <div ref={inlinePopoverRef} className="w-56 border border-gray-200 bg-white shadow-sm p-1.5 text-xs" style={{ borderRadius: '5px' }}>
            <input
              autoFocus
              type="date"
              value={editValue}
              onChange={(e) => { saveInlineEdit(editingProposalId, e.target.value); }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  cancelInlineEdit();
                }
              }}
              className="block w-full h-8 px-2 border border-gray-300 rounded-sm shadow-none focus:outline-none focus:ring-0 focus:border-gray-400 text-xs"
            />
          </div>
        </InlineEditPortal>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start">
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900">Delete proposal?</h3>
                <p className="mt-1 text-sm text-gray-600">This action cannot be undone.</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => setConfirmDeleteId(null)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700"
                onClick={async () => { await handleDeleteProposal(confirmDeleteId!); setConfirmDeleteId(null); }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProposalsPage;
