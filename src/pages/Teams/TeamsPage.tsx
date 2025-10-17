import React, { useEffect, useState, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchTeamMembers, createTeamMember } from '../../store/slices/teamSlice';
import { TeamMember, UserRole, UserStatus, Role } from '../../types';
import { addNotification } from '../../store/slices/notificationSlice';
import { 
  UserPlusIcon, 
  ShieldCheckIcon,
  UserGroupIcon,
  CogIcon,
  TrashIcon,
  EyeIcon,
  PencilIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  CalendarIcon,
  CheckIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import DateRangeCalendar from '../../components/UI/DateRangeCalendar';
import '../Projects/FilterButtons.css';
import { useHasPermission } from '../../utils/permissions';
import { fetchRoles } from '../../store/slices/rbacSlice';

// Portal component for rendering filter popups outside table overflow context
const FilterPortal: React.FC<{ children: React.ReactNode; buttonRect: DOMRect | null }> = ({ children, buttonRect }) => {
  if (!buttonRect) return null;
  
  // Calculate position, adjusting if it would overflow the viewport
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const popupWidth = 256; // approximate width of the popup (w-64 = 16rem = 256px)
  const popupHeight = 400; // approximate max height
  
  let left = buttonRect.left;
  let top = buttonRect.bottom + 4;
  
  // Adjust horizontal position if it would overflow right edge
  if (left + popupWidth > viewportWidth) {
    left = viewportWidth - popupWidth - 8; // 8px padding from edge
  }
  
  // Adjust horizontal position if it would overflow left edge
  if (left < 8) {
    left = 8;
  }
  
  // Adjust vertical position if it would overflow bottom edge
  if (top + popupHeight > viewportHeight) {
    top = buttonRect.top - popupHeight - 4; // Show above the button instead
    // If still doesn't fit, position at bottom with padding
    if (top < 8) {
      top = viewportHeight - popupHeight - 8;
    }
  }
  
  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
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

// New member state type to support expiry fields
type NewMemberState = {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  password: string;
  role: UserRole;
  role_id?: string;
  status: UserStatus;
  timezone: string;
  phone: string;
  bio: string;
  address: string;
  id_expiry_date?: string;
  visa_expiry_date?: string;
  passport_expiry_date?: string;
  contract_expiry_date?: string;
  // NOTE: skills captured in UI state to avoid sending unsupported fields to backend
};

const TeamsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { teamMembers, isLoading, error } = useAppSelector((state: any) => state.team);
  const roles: Role[] = useAppSelector((state: any) => state.rbac.roles);
  const can = useHasPermission();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [pendingToolbarFrom, setPendingToolbarFrom] = useState('');
  const [pendingToolbarTo, setPendingToolbarTo] = useState('');
  const [toolbarDateOpen, setToolbarDateOpen] = useState(false);
  
  // Column filters
  const [filterRoles, setFilterRoles] = useState<UserRole[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [filterScoreMin, setFilterScoreMin] = useState<number | null>(null);
  const [filterScoreMax, setFilterScoreMax] = useState<number | null>(null);
  const [filterProjectMin, setFilterProjectMin] = useState<number | null>(null);
  const [filterProjectMax, setFilterProjectMax] = useState<number | null>(null);
  const [filterTaskMin, setFilterTaskMin] = useState<number | null>(null);
  const [filterTaskMax, setFilterTaskMax] = useState<number | null>(null);
  const [filterPendingMin, setFilterPendingMin] = useState<number | null>(null);
  const [filterPendingMax, setFilterPendingMax] = useState<number | null>(null);
  
  // Header filter popup state
  const [headerFilterOpen, setHeaderFilterOpen] = useState<null | 'role' | 'status' | 'score' | 'projects' | 'tasks' | 'pending'>(null);
  const [filterButtonRect, setFilterButtonRect] = useState<DOMRect | null>(null);
  const [toolbarDateButtonRect, setToolbarDateButtonRect] = useState<DOMRect | null>(null);
  
  // Sorting state
  const [sortField, setSortField] = useState<'projects' | 'tasks' | 'pending' | 'score' | 'joined' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  
  // Inline editing state
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'role' | 'status' | 'rbac_role' | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  const [inlineEditRect, setInlineEditRect] = useState<DOMRect | null>(null);
  
  // Refs
  const headerFilterRef = useRef<HTMLDivElement | null>(null);
  const toolbarDateRef = useRef<HTMLDivElement | null>(null);
  const inlinePopoverRef = useRef<HTMLDivElement | null>(null);
  
  // Enhanced team members with statistics
  const [enhancedTeamMembers, setEnhancedTeamMembers] = useState<TeamMember[]>([]);
  
  // Compute top and least efficiency scores for metric cards
  const scoreStats = useMemo(() => {
    const arr = Array.isArray(enhancedTeamMembers) ? enhancedTeamMembers : [];
    if (arr.length === 0) {
      return { topScore: 0, topName: '-', leastScore: 0, leastName: '-' };
    }
    const sorted = [...arr].sort((a, b) => (b.efficiency_score ?? 0) - (a.efficiency_score ?? 0));
    const top = sorted[0];
    const least = sorted[sorted.length - 1];
    const topScore = Math.max(0, Math.round((top.efficiency_score ?? 0)));
    const leastScore = Math.max(0, Math.round((least.efficiency_score ?? 0)));
    const nameOf = (m: any) => m?.full_name || `${m?.first_name || ''} ${m?.last_name || ''}`.trim() || m?.username || '-';
    return {
      topScore,
      leastScore,
      topName: nameOf(top),
      leastName: nameOf(least),
    };
  }, [enhancedTeamMembers]);
  
const [newMember, setNewMember] = useState<NewMemberState>({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    password: '',
    role: UserRole.MEMBER,
    status: UserStatus.PENDING,
    timezone: 'UTC',
    phone: '',
    bio: '',
    address: ''
  });

  // Phone input helpers (country code + local number)
  const [phoneCountryCode, setPhoneCountryCode] = useState<string>('1'); // default +1
  const [phoneLocal, setPhoneLocal] = useState<string>('');

  // Attachments for new team member (store files until member is created)
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // New: skills for new member (UI-only for now)
  const [newSkills, setNewSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState<string>('');

  const [stats, setStats] = useState({
    total_members: 0,
    active_members: 0,
    admin_count: 0,
    member_count: 0,
    pending_count: 0,
    inactive_count: 0
  });

  // Fetch enhanced team members data with statistics
  const fetchEnhancedTeamData = async () => {
    try {
      console.log('TeamsPage: Fetching enhanced team data');
      
      // First, fetch basic team members
      const result = await dispatch(fetchTeamMembers()).unwrap();
      console.log('TeamsPage: Basic team members fetched:', result);
      
      // Then, fetch additional statistics for each member
      if (result && Array.isArray(result)) {
        const { default: apiClient } = await import('../../api/client');
        
        const enhancedMembers = await Promise.all(
          result.map(async (member: TeamMember) => {
            try {
              // Fetch member statistics from the backend
              // Backend does not expose member statistics endpoint; use existing fields or defaults
              return {
                ...member,
                projects_count: (member as any).projects_count || 0,
                completed_tasks_count: (member as any).completed_tasks_count || 0,
                pending_tasks_count: (member as any).pending_tasks_count || 0,
                efficiency_score: (member as any).efficiency_score || 0,
                start_date: (member as any).start_date || member.created_at,
              };
            } catch (error) {
              console.warn(`Failed to fetch statistics for member ${member.id}:`, error);
              // Return member with default values if stats fetch fails
              return {
                ...member,
                projects_count: 0,
                completed_tasks_count: 0,
                pending_tasks_count: 0,
                efficiency_score: 0,
                start_date: member.created_at,
              };
            }
          })
        );
        
        // Update the team members with enhanced data
        console.log('TeamsPage: Enhanced members data:', enhancedMembers);
        setEnhancedTeamMembers(enhancedMembers);
      }
    } catch (error) {
      console.error('TeamsPage: Failed to fetch enhanced team data:', error);
    }
  };

  useEffect(() => {
    console.log('TeamsPage: useEffect triggered, dispatching fetchTeamMembers');
    console.log('Current roles in state:', roles);
    fetchEnhancedTeamData();
    dispatch(fetchRoles());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  useEffect(() => {
    console.log('Roles updated:', roles);
  }, [roles]);

  // Add debugging for state changes and update stats
  useEffect(() => {
    console.log('TeamsPage: State updated:', { teamMembers, isLoading, error });
    if (teamMembers && Array.isArray(teamMembers)) {
      setStats({
        total_members: teamMembers.length,
        active_members: teamMembers.filter((m: TeamMember) => m.is_active).length,
        admin_count: teamMembers.filter((m: TeamMember) => m.role === UserRole.ADMIN).length,
        member_count: teamMembers.filter((m: TeamMember) => m.role === UserRole.MEMBER).length,
        pending_count: teamMembers.filter((m: TeamMember) => m.status === UserStatus.PENDING).length,
        inactive_count: teamMembers.filter((m: TeamMember) => !m.is_active).length
      });
    }
  }, [teamMembers, isLoading, error]);

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMember.email && newMember.username && newMember.first_name && newMember.last_name && newMember.password) {
      try {
        // Normalize phone into E.164 if phoneLocal provided
        const digits = phoneLocal.replace(/\D/g, '');
        const payload = { ...newMember } as any;
        if (digits) {
          payload.phone = `+${phoneCountryCode}${digits}`;
        }

        // Include RBAC role if selected
        if (newMember.role_id) {
          payload.role_id = newMember.role_id;
        }
        const created = await dispatch(createTeamMember(payload)).unwrap();

        // Persist skills to backend via user preferences
        if (created?.id && newSkills.length > 0) {
          try {
            const { default: apiClient } = await import('../../api/client');
            // Load existing preferences to avoid overwriting
            const userResp = await apiClient.get(`users/${created.id}`);
            const prevPrefs = (userResp?.data?.preferences) || {};
            await apiClient.put(`users/${created.id}`, { preferences: { ...prevPrefs, skills: newSkills } });
          } catch (skillErr) {
            console.error('Failed to persist skills for new member:', skillErr);
          }
        }

        // Upload attachments if any
        if (created?.id && attachments.length > 0) {
          try {
            const { default: apiClient } = await import('../../api/client');
            await Promise.all(
              attachments.map(async (file) => {
                const form = new FormData();
                form.append('file', file);
await apiClient.post(`users/${created.id}/attachments`, form);
              })
            );
          } catch (uploadErr) {
            console.error('Failed to upload team member attachments:', uploadErr);
            dispatch(addNotification({
              type: 'error',
              title: 'Attachment Upload Issue',
              message: 'Some attachments could not be uploaded.',
              duration: 5000,
            }));
          }
        }

        setNewMember({
          email: '',
          username: '',
          first_name: '',
          last_name: '',
          password: '',
          role: UserRole.MEMBER,
          role_id: undefined,
          status: UserStatus.PENDING,
          timezone: 'UTC',
          phone: '',
          bio: '',
          address: ''
        });
        setPhoneLocal('');
        setPhoneCountryCode('1');
        setAttachments([]);
        setNewSkills([]);
        setSkillInput('');
        setShowCreateForm(false);
        
        dispatch(addNotification({
          type: 'success',
          title: 'Team Member Added',
          message: 'Team member has been successfully added.',
          duration: 3000,
        }));
      } catch (error) {
        console.error('Failed to create team member:', error);
        
        dispatch(addNotification({
          type: 'error',
          title: 'Creation Failed',
          message: 'Failed to create team member. Please try again.',
          duration: 5000,
        }));
      }
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
      // TODO: Add update API call when available
      setEditingMember(null);
      
      dispatch(addNotification({
        type: 'success',
        title: 'Team Member Updated',
        message: 'Team member has been successfully updated.',
        duration: 3000,
      }));
    } catch (error) {
      console.error('Failed to update team member:', error);
      
      dispatch(addNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update team member. Please try again.',
        duration: 5000,
      }));
    }
  };

  // Inline editing functions
  const startInlineEdit = (e: React.MouseEvent, member: TeamMember, field: 'role' | 'status' | 'rbac_role') => {
    e.stopPropagation();
    console.log('startInlineEdit called:', { field, memberId: member.id, memberRole: (member as any).role_id });
    const target = e.currentTarget as HTMLElement;
    if (target && typeof target.getBoundingClientRect === 'function') {
      setInlineEditRect(target.getBoundingClientRect());
    } else {
      setInlineEditRect(null);
    }
    setEditingMemberId(member.id);
    setEditingField(field);
    if (field === 'role') setEditValue(member.role);
    if (field === 'status') setEditValue(member.is_active ? 'active' : 'inactive');
    if (field === 'rbac_role') setEditValue((member as any).role_id || '');
    console.log('Inline edit state set:', { editingMemberId: member.id, editingField: field });
  };

  const saveInlineEdit = async (memberId: string, valueOverride?: any) => {
    try {
      if (!editingField) return;
      const value = valueOverride !== undefined ? valueOverride : editValue;
      
      const { default: apiClient } = await import('../../api/client');
      if (editingField === 'role') {
        await apiClient.put(`teams/members/${memberId}`, { role: value });
      } else if (editingField === 'status') {
        const isActive = value === 'active';
        await apiClient.put(`teams/members/${memberId}`, { is_active: isActive });
      } else if (editingField === 'rbac_role') {
        const { assignUserRole } = await import('../../store/slices/rbacSlice');
        const roleId = value || null;
        await dispatch(assignUserRole({ userId: memberId, roleId })).unwrap();
      }
      
      // Refresh data
      fetchEnhancedTeamData();
      
      setEditingMemberId(null);
      setEditingField(null);
      setEditValue(null);
      setInlineEditRect(null);
      
      dispatch(addNotification({
        type: 'success',
        title: 'Member Updated',
        message: 'Team member has been updated successfully.',
        duration: 3000,
      }));
    } catch (err) {
      console.error('Inline save failed:', err);
      dispatch(addNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update team member.',
        duration: 3000,
      }));
    }
  };

  const cancelInlineEdit = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingMemberId(null);
    setEditingField(null);
    setEditValue(null);
    setInlineEditRect(null);
  };

  // Sorting function
  const onHeaderDblClick = (field: 'projects' | 'tasks' | 'pending' | 'score' | 'joined') => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // Document click listener for closing popups
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      
      // Close inline edit popovers when clicking outside
      if (editingMemberId && inlinePopoverRef.current && !inlinePopoverRef.current.contains(target)) {
        cancelInlineEdit();
      }
      
      // Close header filter popover
      if (headerFilterOpen && headerFilterRef.current && !headerFilterRef.current.contains(target)) {
        setHeaderFilterOpen(null);
      }
      
      // Close toolbar date popover
      if (toolbarDateOpen && toolbarDateRef.current && !toolbarDateRef.current.contains(target)) {
        setToolbarDateOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [editingMemberId, headerFilterOpen, toolbarDateOpen]);

  const handleDeleteMember = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to delete this team member?')) return;

    try {
      // TODO: Add delete API call when available
      
      dispatch(addNotification({
        type: 'success',
        title: 'Team Member Deleted',
        message: 'Team member has been successfully deleted.',
        duration: 3000,
      }));
    } catch (error) {
      console.error('Failed to delete team member:', error);
      
      dispatch(addNotification({
        type: 'error',
        title: 'Deletion Failed',
        message: 'Failed to delete team member. Please try again.',
        duration: 5000,
      }));
    }
  };

  // Use enhanced team members if available, otherwise fall back to basic team members
  const membersToDisplay = enhancedTeamMembers.length > 0 ? enhancedTeamMembers : teamMembers;
  
  // Derived: filtered and sorted members for table
  const displayedMembers = useMemo(() => {
    let arr = Array.isArray(membersToDisplay) ? [...membersToDisplay] : [];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      arr = arr.filter(m => {
        const fullName = `${m.first_name} ${m.last_name}`.toLowerCase();
        const email = (m.email || '').toLowerCase();
        const username = (m.username || '').toLowerCase();
        return fullName.includes(query) || email.includes(query) || username.includes(query);
      });
    }
    
    // Apply role filter
    if (filterRoles.length > 0) {
      arr = arr.filter(m => filterRoles.includes(m.role));
    }
    
    // Apply status filter
    if (filterStatuses.length > 0) {
      arr = arr.filter(m => {
        const statusStr = m.is_active ? 'active' : 'inactive';
        return filterStatuses.includes(statusStr) || filterStatuses.includes(m.status);
      });
    }
    
    // Apply score filter
    if (filterScoreMin !== null) {
      arr = arr.filter(m => (m.efficiency_score ?? 0) >= filterScoreMin);
    }
    if (filterScoreMax !== null) {
      arr = arr.filter(m => (m.efficiency_score ?? 0) <= filterScoreMax);
    }
    
    // Apply project count filter
    if (filterProjectMin !== null) {
      arr = arr.filter(m => (m.projects_count ?? 0) >= filterProjectMin);
    }
    if (filterProjectMax !== null) {
      arr = arr.filter(m => (m.projects_count ?? 0) <= filterProjectMax);
    }
    
    // Apply task count filter
    if (filterTaskMin !== null) {
      arr = arr.filter(m => (m.completed_tasks_count ?? 0) >= filterTaskMin);
    }
    if (filterTaskMax !== null) {
      arr = arr.filter(m => (m.completed_tasks_count ?? 0) <= filterTaskMax);
    }
    
    // Apply pending tasks filter
    if (filterPendingMin !== null) {
      arr = arr.filter(m => (m.pending_tasks_count ?? 0) >= filterPendingMin);
    }
    if (filterPendingMax !== null) {
      arr = arr.filter(m => (m.pending_tasks_count ?? 0) <= filterPendingMax);
    }
    
    // Apply date range filter (joined date)
    if (filterFromDate) {
      const from = new Date(filterFromDate);
      arr = arr.filter(m => m.start_date && new Date(m.start_date) >= from);
    }
    if (filterToDate) {
      const to = new Date(filterToDate);
      to.setHours(23, 59, 59, 999);
      arr = arr.filter(m => m.start_date && new Date(m.start_date) <= to);
    }
    
    // Apply sorting
    if (sortField) {
      arr.sort((a, b) => {
        let av: any = 0;
        let bv: any = 0;
        
        switch (sortField) {
          case 'projects':
            av = a.projects_count ?? 0;
            bv = b.projects_count ?? 0;
            break;
          case 'tasks':
            av = a.completed_tasks_count ?? 0;
            bv = b.completed_tasks_count ?? 0;
            break;
          case 'pending':
            av = a.pending_tasks_count ?? 0;
            bv = b.pending_tasks_count ?? 0;
            break;
          case 'score':
            av = a.efficiency_score ?? 0;
            bv = b.efficiency_score ?? 0;
            break;
          case 'joined':
            av = a.start_date ? new Date(a.start_date).getTime() : 0;
            bv = b.start_date ? new Date(b.start_date).getTime() : 0;
            break;
        }
        
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return arr;
  }, [membersToDisplay, searchQuery, filterRoles, filterStatuses, filterScoreMin, filterScoreMax, 
      filterProjectMin, filterProjectMax, filterTaskMin, filterTaskMax, filterPendingMin, filterPendingMax, 
      filterFromDate, filterToDate, sortField, sortDir]);

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-error-100 text-error-800';
      case UserRole.MEMBER:
        return 'bg-primary-100 text-primary-800';
      default:
        return 'bg-primary-100 text-primary-800';
    }
  };

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case UserStatus.ACTIVE:
        return 'bg-success-100 text-success-800';
      case UserStatus.PENDING:
        return 'bg-warning-100 text-warning-800';
      case UserStatus.INACTIVE:
        return 'bg-secondary-100 text-secondary-800';
      case UserStatus.SUSPENDED:
        return 'bg-error-100 text-error-800';
      default:
        return 'bg-secondary-100 text-secondary-800';
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return <ShieldCheckIcon className="w-4 h-4" />;
      case UserRole.MEMBER:
        return <UserGroupIcon className="w-4 h-4" />;
      default:
        return <UserGroupIcon className="w-4 h-4" />;
    }
  };

  // Avoid blocking spinner; render the page and let data populate quietly

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center">
        <div className="flex-[0.35]">
          <h1 className="page-title font-bold text-gray-900">Team Members</h1>
          <div className="text-gray-600 mt-1 text-sm">Manage your organization’s people and roles</div>
        </div>
        <div className="flex-[0.65] flex justify-end">
          {can('Teams', 'create') && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-page-action flex items-center btn-styled btn-create-auto" 
              style={{ backgroundColor: 'rgb(0, 0, 0)', color: 'white', borderColor: 'rgb(0, 0, 0)', fontSize: '0.875rem', padding: '0.2rem 0.75rem' }}
            >
              <UserPlusIcon className="h-5 w-5" />
              <span>Add Team Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {/* Create Member Form */}
      {showCreateForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-secondary-900 mb-4">Add New Team Member</h2>
          <form onSubmit={handleCreateMember} className="space-y-5">
            {/* Row 1: First Name, Last Name, Email, Username */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700">First Name *</label>
                <input
                  type="text"
                  required
                  value={newMember.first_name}
                  onChange={(e) => setNewMember({ ...newMember, first_name: e.target.value })}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700">Last Name *</label>
                <input
                  type="text"
                  required
                  value={newMember.last_name}
                  onChange={(e) => setNewMember({ ...newMember, last_name: e.target.value })}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700">Email *</label>
                <input
                  type="email"
                  required
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700">Username *</label>
                <input
                  type="text"
                  required
                  value={newMember.username}
                  onChange={(e) => setNewMember({ ...newMember, username: e.target.value })}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Row 2: Password, Role, Status, Timezone */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700">Password *</label>
                <input
                  type="password"
                  required
                  value={newMember.password}
                  onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700">Role</label>
                <select
                  value={newMember.role}
                  onChange={(e) => setNewMember({ ...newMember, role: e.target.value as UserRole })}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value={UserRole.MEMBER}>Team Member</option>
                  <option value={UserRole.ADMIN}>Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700">Status</label>
                <select
                  value={newMember.status}
                  onChange={(e) => setNewMember({ ...newMember, status: e.target.value as UserStatus })}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value={UserStatus.ACTIVE}>Active</option>
                  <option value={UserStatus.INACTIVE}>Inactive</option>
                  <option value={UserStatus.PENDING}>Pending</option>
                  <option value={UserStatus.SUSPENDED}>Suspended</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700">Timezone</label>
                <input
                  type="text"
                  value={newMember.timezone}
                  onChange={(e) => setNewMember({ ...newMember, timezone: e.target.value })}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                  placeholder="UTC"
                />
              </div>
            </div>

            {/* Row 3: Phone, Address, RBAC Role, ID Expiry */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700">Phone</label>
                <div className="mt-1 flex">
                  <select
                    value={phoneCountryCode}
                    onChange={(e) => setPhoneCountryCode(e.target.value)}
                    className="py-2 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                    style={{ minWidth: '5.5rem' }}
                    aria-label="Country code"
                  >
                    <option value="1">+1 (US)</option>
                    <option value="44">+44 (UK)</option>
                    <option value="61">+61 (AU)</option>
                    <option value="81">+81 (JP)</option>
                    <option value="33">+33 (FR)</option>
                    <option value="49">+49 (DE)</option>
                    <option value="91">+91 (IN)</option>
                    <option value="971">+971 (AE)</option>
                  </select>
                  <input
                    type="tel"
                    value={phoneLocal}
                    onChange={(e) => setPhoneLocal(e.target.value)}
                    placeholder="Phone number"
                    className="flex-1 py-2 border border-gray-300 rounded-r-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Stored as E.164 format (e.g., +{phoneCountryCode}{phoneLocal.replace(/\D/g, '')}).</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700">Address</label>
                <input
                  type="text"
                  value={newMember.address || ''}
                  onChange={(e) => setNewMember({ ...newMember, address: e.target.value })}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Street, City, State"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700">RBAC Role</label>
                <select
                  value={newMember.role_id || ''}
                  onChange={(e) => setNewMember({ ...newMember, role_id: e.target.value || undefined })}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value="">— None —</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700">ID Expiry Date</label>
                <input
                  type="date"
                  value={newMember.id_expiry_date || ''}
                  onChange={(e) => setNewMember({ ...newMember, id_expiry_date: e.target.value })}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Row 4: Visa Expiry, Passport Expiry, Contract Expiry, Bio */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700">Visa Expiry</label>
                <input
                  type="date"
                  value={newMember.visa_expiry_date || ''}
                  onChange={(e) => setNewMember({ ...newMember, visa_expiry_date: e.target.value })}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700">Passport Expiry</label>
                <input
                  type="date"
                  value={newMember.passport_expiry_date || ''}
                  onChange={(e) => setNewMember({ ...newMember, passport_expiry_date: e.target.value })}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700">Contract Expiry</label>
                <input
                  type="date"
                  value={newMember.contract_expiry_date || ''}
                  onChange={(e) => setNewMember({ ...newMember, contract_expiry_date: e.target.value })}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700">Bio</label>
                <textarea
                  rows={3}
                  value={newMember.bio || ''}
                  onChange={(e) => setNewMember({ ...newMember, bio: e.target.value })}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Brief bio about the team member..."
                />
              </div>
            </div>

            {/* Row 5: Attachments and Skills */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-secondary-700">Attachments</label>
                <div
                  className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(false);
                    const files = Array.from(e.dataTransfer.files || []);
                    if (files.length) setAttachments(prev => [...prev, ...files]);
                  }}
                >
                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      Drag and drop files here, or
                      <label className="ml-1 font-medium text-user-blue hover:text-primary-700 cursor-pointer">
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length) setAttachments(prev => [...prev, ...files]);
                            e.currentTarget.value = '';
                          }}
                        />
                        browse
                      </label>
                    </p>
                    <p className="text-xs text-gray-500">Up to 10 files, 50MB each</p>
                  </div>
                </div>
                {attachments.length > 0 && (
                  <ul className="space-y-2">
                    {attachments.map((file, idx) => (
                      <li key={`${file.name}-${idx}`} className="flex items-center justify-between text-sm bg-gray-50 border border-gray-200 rounded p-2">
                        <span className="truncate mr-3">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                          className="px-2 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-secondary-700">Skills</label>
                <div className="border border-gray-300 rounded-md p-3 bg-white min-h-[10.5rem] flex flex-col">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = skillInput.trim();
                          if (!val) return;
                          const exists = newSkills.some(s => s.toLowerCase() === val.toLowerCase());
                          if (!exists && newSkills.length < 3) {
                            setNewSkills(prev => [...prev, val]);
                            setSkillInput('');
                          }
                        }
                      }}
                      placeholder={newSkills.length >= 3 ? 'Max 3 skills added' : 'Type a skill and press Enter'}
                      disabled={newSkills.length >= 3}
                      className="flex-1 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = skillInput.trim();
                        if (!val) return;
                        const exists = newSkills.some(s => s.toLowerCase() === val.toLowerCase());
                        if (!exists && newSkills.length < 3) {
                          setNewSkills(prev => [...prev, val]);
                          setSkillInput('');
                        }
                      }}
                      disabled={!skillInput.trim() || newSkills.length >= 3}
                      className={`py-2 rounded-md text-sm font-medium ${(!skillInput.trim() || newSkills.length >= 3) ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-800'}`}
                    >
                      Add
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {newSkills.map((skill, idx) => (
                      <span key={`${skill}-${idx}`} className="inline-flex items-center gap-1 px-2 text-xs bg-primary-100 text-primary-800 rounded">
                        {skill}
                        <button
                          type="button"
                          onClick={() => setNewSkills(prev => prev.filter((_, i) => i !== idx))}
                          className="ml-1 text-primary-800 hover:text-primary-900"
                          aria-label={`Remove ${skill}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="mt-auto">
                    <p className="text-[10px] text-gray-500">Add up to 3 skills.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-page-action btn-no-minh"
              >
                Add Team Member
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Member Form */}
      {editingMember && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-secondary-900 mb-4">Edit Team Member</h2>
          <form onSubmit={handleUpdateMember} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700">First Name *</label>
                <input
                  type="text"
                  required
                  value={editingMember.first_name}
                  onChange={(e) => setEditingMember({...editingMember, first_name: e.target.value})}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700">Last Name *</label>
                <input
                  type="text"
                  required
                  value={editingMember.last_name}
                  onChange={(e) => setEditingMember({...editingMember, last_name: e.target.value})}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700">Email *</label>
                <input
                  type="email"
                  required
                  value={editingMember.email}
                  onChange={(e) => setEditingMember({...editingMember, email: e.target.value})}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                />
            </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700">Username *</label>
                <input
                  type="text"
                  required
                  value={editingMember.username}
                  onChange={(e) => setEditingMember({...editingMember, username: e.target.value})}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700">Role</label>
                <select
                  value={editingMember.role}
                  onChange={(e) => setEditingMember({...editingMember, role: e.target.value as UserRole})}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value={UserRole.MEMBER}>Team Member</option>
                  <option value={UserRole.ADMIN}>Admin</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700">Phone</label>
                <input
                  type="tel"
                  value={editingMember.phone || ''}
                  onChange={(e) => setEditingMember({...editingMember, phone: e.target.value})}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700">Address</label>
                <input
                  type="text"
                  value={editingMember.address || ''}
                  onChange={(e) => setEditingMember({...editingMember, address: e.target.value})}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700">Timezone</label>
                <input
                  type="text"
                  value={editingMember.timezone || 'UTC'}
                  onChange={(e) => setEditingMember({...editingMember, timezone: e.target.value})}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-secondary-700">Bio</label>
              <textarea
                rows={3}
                value={editingMember.bio || ''}
                onChange={(e) => setEditingMember({...editingMember, bio: e.target.value})}
                className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-secondary-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-page-action btn-no-minh"
              >
                Update Member
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="metric-card metric-blue bg-white px-4 py-3 rounded-lg shadow border-t-4 border-blue-600">
              <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserGroupIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Members</p>
              <p className="metric-value text-2xl font-bold">{stats.total_members}</p>
                </div>
                </div>
        </div>
        
        <div className="metric-card metric-green bg-white px-4 py-3 rounded-lg shadow border-t-4 border-green-600">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserPlusIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Members</p>
              <p className="metric-value text-2xl font-bold">{stats.active_members}</p>
              </div>
            </div>
          </div>

        {/* Top Score */}
        <div className="metric-card metric-purple bg-white px-4 py-3 rounded-lg shadow border-t-4 border-purple-600">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ChevronUpIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Top Score</p>
              <p className="metric-value text-2xl font-bold">{scoreStats.topScore}%</p>
              <p className="text-xs text-gray-500 mt-0.5 truncate" title={scoreStats.topName}>{scoreStats.topName}</p>
            </div>
          </div>
        </div>

        {/* Least Score */}
        <div className="metric-card metric-red bg-white px-4 py-3 rounded-lg shadow border-t-4 border-red-600">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <ChevronDownIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Least Score</p>
              <p className="metric-value text-2xl font-bold">{scoreStats.leastScore}%</p>
              <p className="text-xs text-gray-500 mt-0.5 truncate" title={scoreStats.leastName}>{scoreStats.leastName}</p>
            </div>
          </div>
        </div>

        <div className="metric-card metric-yellow bg-white px-4 py-3 rounded-lg shadow border-t-4 border-yellow-600">
              <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <CogIcon className="h-6 w-6 text-yellow-600" />
                </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="metric-value text-2xl font-bold">{stats.pending_count}</p>
                </div>
              </div>
            </div>
          </div>


      {/* Team Members List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Team Members ({displayedMembers.length})
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                  setSearchQuery('');
                  setSortField(null);
                  setSortDir('asc');
                  setFilterRoles([]);
                  setFilterStatuses([]);
                  setFilterScoreMin(null);
                  setFilterScoreMax(null);
                  setFilterProjectMin(null);
                  setFilterProjectMax(null);
                  setFilterTaskMin(null);
                  setFilterTaskMax(null);
                  setFilterPendingMin(null);
                  setFilterPendingMax(null);
                  setFilterFromDate('');
                  setFilterToDate('');
                  setPendingToolbarFrom('');
                  setPendingToolbarTo('');
                  fetchEnhancedTeamData();
                }}
              >
                <ArrowPathIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                title="Filter by date range"
                className="p-1 text-gray-500 hover:text-gray-700"
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  setToolbarDateButtonRect(rect);
                  setPendingToolbarFrom(filterFromDate || '');
                  setPendingToolbarTo(filterToDate || '');
                  setToolbarDateOpen((o) => !o);
                }}
              >
                <CalendarIcon className="w-4 h-4" />
              </button>
              {toolbarDateOpen && (
                <FilterPortal buttonRect={toolbarDateButtonRect}>
                  <div ref={toolbarDateRef} className="w-64 border border-gray-200 bg-white shadow-sm p-1.5 text-xs" style={{borderRadius: '5px'}}>
                    <div className="px-1 pb-1">
                      <DateRangeCalendar size="sm"
                        initialFrom={pendingToolbarFrom || null}
                        initialTo={pendingToolbarTo || null}
                        onChange={(from, to) => {
                          if (from && !to) {
                            setPendingToolbarFrom(from);
                            setPendingToolbarFrom(from);
                          } else {
                            setPendingToolbarFrom(from || '');
                            setPendingToolbarTo(to || '');
                          }
                        }}
                      />
                    </div>
                    <div className="flex justify-end gap-2 px-1.5 border-t border-gray-100 mt-1">
                      <button 
                        className="filter-popup-btn filter-popup-btn-clear"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setFilterFromDate(''); 
                          setFilterToDate(''); 
                          setToolbarDateOpen(false); 
                        }}
                      >
                        Clear
                      </button>
                      <button 
                        className="filter-popup-btn filter-popup-btn-filter"
                        onClick={(e) => {
                          e.stopPropagation();
                          const from = pendingToolbarFrom || '';
                          const to = pendingToolbarTo || pendingToolbarFrom || '';
                          setFilterFromDate(from);
                          setFilterToDate(to);
                          setToolbarDateOpen(false);
                        }}
                      >
                        Filter
                      </button>
                    </div>
                  </div>
                </FilterPortal>
              )}
            </div>
          </div>
        </div>
        
        {displayedMembers.length === 0 ? (
        <div className="text-center2">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No team members found</h3>
            <p className="mt-1 text-sm text-gray-500">
            Get started by adding your first team member.
          </p>
        </div>
      ) : (
          <div className="overflow-x-auto" style={{backgroundColor: 'rgb(249, 250, 251)'}}>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    <div className="inline-flex items-center gap-1">
                      <span>Role</span>
                      <span className="relative">
                        <button
                          type="button"
                          className="p-0.5 text-gray-500 hover:text-gray-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            const isOpening = headerFilterOpen !== 'role';
                            if (isOpening) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setFilterButtonRect(rect);
                            }
                            setHeaderFilterOpen(isOpening ? 'role' : null);
                          }}
                        >
                          <FunnelIcon className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    </div>
                  </th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
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
                  <th onDoubleClick={() => onHeaderDblClick('projects')} className="px-6 py-2 text-center text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
                    <div className="inline-flex items-center gap-1">
                      <span>Projects</span>
                      {sortField === 'projects' && (
                        sortDir === 'asc' ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </th>
                  <th onDoubleClick={() => onHeaderDblClick('tasks')} className="px-6 py-2 text-center text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
                    <div className="inline-flex items-center gap-1">
                      <span>Tasks</span>
                      {sortField === 'tasks' && (
                        sortDir === 'asc' ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </th>
                  <th onDoubleClick={() => onHeaderDblClick('pending')} className="px-6 py-2 text-center text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
                    <div className="inline-flex items-center gap-1">
                      <span>Pending</span>
                      {sortField === 'pending' && (
                        sortDir === 'asc' ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </th>
                  <th onDoubleClick={() => onHeaderDblClick('score')} className="px-6 py-2 text-center text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
                    <div className="inline-flex items-center gap-1">
                      <span>Score</span>
                      {sortField === 'score' && (
                        sortDir === 'asc' ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </th>
                  <th onDoubleClick={() => onHeaderDblClick('joined')} className="px-6 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
                    <div className="inline-flex items-center gap-1">
                      <span>Joined On</span>
                      {sortField === 'joined' && (
                        sortDir === 'asc' ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Permission
                  </th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayedMembers.map((member: TeamMember) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-user-blue">
                          {member.first_name[0]}{member.last_name[0]}
                        </span>
                      </div>
                        <div className="ml-4">
                          <div 
                            className="text-sm font-medium text-gray-900 cursor-pointer hover:text-user-blue"
                            onClick={() => navigate(`/teams/${member.id}`)}
                          >
                            {member.full_name || `${member.first_name} ${member.last_name}`}
                          </div>
                          <div className="text-sm text-gray-500">
                            @{member.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center space-x-2">
                          <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                          <span>{member.email}</span>
                        </div>
                    </div>
                      {member.phone && (
                        <div className="text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                            <PhoneIcon className="h-4 w-4 text-gray-400" />
                            <span>{member.phone}</span>
                          </div>
                        </div>
                      )}
                      {member.address && (
                        <div className="text-sm text-gray-500">
                          <div className="flex items-center space-x-2">
                            <MapPinIcon className="h-4 w-4 text-gray-400" />
                            <span>{member.address}</span>
                          </div>
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-2 whitespace-nowrap" onClick={(e) => { e.stopPropagation(); startInlineEdit(e, member, 'role'); }}>
                      <div className="relative inline-block">
                        <span className={`inline-flex items-center px-1.5 pt-0 pb-0.5 text-xs font-light rounded-sm ${getRoleColor(member.role)}`}>
                          {member.role}
                        </span>
                        {editingMemberId === member.id && editingField === 'role' && (
                          <InlineEditPortal rect={inlineEditRect}>
                            <div ref={inlinePopoverRef} className="w-40 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{ borderRadius: '5px' }}>
                              <ul className="max-h-64 overflow-auto">
                                {[UserRole.MEMBER, UserRole.ADMIN].map((role) => (
                                  <li
                                    key={role}
                                    className={`px-2 rounded-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between ${role===member.role ? 'bg-gray-50' : ''}`}
                                    onClick={() => { saveInlineEdit(member.id, role); }}
                                  >
                                    <span className="capitalize">{role}</span>
                                    {role===member.role && <CheckIcon className="w-4 h-4 text-user-blue" />}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </InlineEditPortal>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-2 whitespace-nowrap" onClick={(e) => { e.stopPropagation(); startInlineEdit(e, member, 'status'); }}>
                      <div className="relative inline-block">
                        <span className={`inline-flex items-center px-1.5 pt-0 pb-0.5 text-xs font-light rounded-sm ${member.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {member.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {editingMemberId === member.id && editingField === 'status' && (
                          <InlineEditPortal rect={inlineEditRect}>
                            <div ref={inlinePopoverRef} className="w-40 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{ borderRadius: '5px' }}>
                              <ul className="max-h-64 overflow-auto">
                                {['active', 'inactive'].map((status) => (
                                  <li
                                    key={status}
                                    className={`px-2 rounded-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between ${(status==='active' && member.is_active) || (status==='inactive' && !member.is_active) ? 'bg-gray-50' : ''}`}
                                    onClick={() => { saveInlineEdit(member.id, status); }}
                                  >
                                    <span className="capitalize">{status}</span>
                                    {((status==='active' && member.is_active) || (status==='inactive' && !member.is_active)) && <CheckIcon className="w-4 h-4 text-user-blue" />}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </InlineEditPortal>
                        )}
                      </div>
                    </td>
                    
                    {/* Projects Count */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center justify-center rounded-full text-sm font-semibold bg-blue-50 text-blue-700">
                        {member.projects_count ?? 0}
                      </span>
                    </td>
                    
                    {/* Completed Tasks Count */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center justify-center rounded-full text-sm font-semibold bg-green-50 text-green-700">
                        {member.completed_tasks_count ?? 0}
                      </span>
                    </td>
                    
                    {/* Pending Tasks Count */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center justify-center rounded-full text-sm font-semibold bg-yellow-50 text-yellow-700">
                        {member.pending_tasks_count ?? 0}
                      </span>
                    </td>
                    
                    {/* Efficiency Score */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex flex-col items-center">
                        <span className={`text-lg font-bold ${
                          (member.efficiency_score ?? 0) >= 80 ? 'text-green-600' :
                          (member.efficiency_score ?? 0) >= 60 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {member.efficiency_score ?? 0}%
                        </span>
                        <div className="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
                          <div 
                            className={`h-1.5 rounded-full ${
                              (member.efficiency_score ?? 0) >= 80 ? 'bg-green-600' :
                              (member.efficiency_score ?? 0) >= 60 ? 'bg-yellow-600' :
                              'bg-red-600'
                            }`}
                            style={{ width: `${member.efficiency_score ?? 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    
                    {/* Joined On Date */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {member.start_date 
                        ? new Date(member.start_date).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })
                        : new Date(member.created_at).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })
                      }
                    </td>
                    
                    <td className="px-6 py-2 whitespace-nowrap" onClick={(e) => { console.log('TD clicked for rbac_role'); e.stopPropagation(); startInlineEdit(e, member, 'rbac_role'); }}>
                      <div className="relative inline-block">
                        <span className={`inline-flex items-center px-1.5 pt-0 pb-0.5 text-xs font-light rounded-sm cursor-pointer ${
                          (member as any).role_id ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {(member as any).role_id ? (roles.find(r => r.id === (member as any).role_id)?.name || '— None —') : '— None —'}
                        </span>
                        {(() => {
                          console.log('Checking if popup should show:', { editingMemberId, memberId: member.id, editingField, match: editingMemberId === member.id && editingField === 'rbac_role' });
                          return editingMemberId === member.id && editingField === 'rbac_role';
                        })() && (
                          <InlineEditPortal rect={inlineEditRect}>
                            <div ref={inlinePopoverRef} className="w-40 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{ borderRadius: '5px' }}>
                              <ul className="max-h-64 overflow-auto">
                                <li
                                  className={`px-2 rounded-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between ${!(member as any).role_id ? 'bg-gray-50' : ''}`}
                                  onClick={() => { saveInlineEdit(member.id, ''); }}
                                >
                                  <span>— None —</span>
                                  {!(member as any).role_id && <CheckIcon className="w-4 h-4 text-user-blue" />}
                                </li>
                                {roles.map((r) => (
                                  <li
                                    key={r.id}
                                    className={`px-2 rounded-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between ${r.id === (member as any).role_id ? 'bg-gray-50' : ''}`}
                                    onClick={() => { saveInlineEdit(member.id, r.id); }}
                                  >
                                    <span>{r.name}</span>
                                    {r.id === (member as any).role_id && <CheckIcon className="w-4 h-4 text-user-blue" />}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </InlineEditPortal>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                    <button
                      onClick={() => navigate(`/teams/${member.id}`)}
                      className="inline-flex items-center justify-center p-2 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                      title="View Details"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    {can('Teams', 'edit') && (
                      <button
                        onClick={() => setEditingMember(member)}
                        className="inline-flex items-center justify-center p-2 rounded-md bg-gray-100 text-black hover:bg-gray-200 transition-colors"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    )}
                    {can('Teams', 'delete') && (
                      <button
                        onClick={() => handleDeleteMember(member.id)}
                        className="inline-flex items-center justify-center p-2 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                    </td>
                  </tr>
            ))}
              </tbody>
            </table>
            
            {/* Column Filter Popups */}
            {headerFilterOpen === 'role' && (
              <FilterPortal buttonRect={filterButtonRect}>
                <div ref={headerFilterRef} className="w-44 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{ borderRadius: '5px' }}>
                  <ul className="max-h-64 overflow-auto">
                    {[UserRole.MEMBER, UserRole.ADMIN].map((role) => {
                      const isSelected = filterRoles.includes(role);
                      return (
                        <li
                          key={role}
                          className={`px-2 rounded-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between ${isSelected ? 'bg-gray-50' : ''}`}
                          onClick={() => {
                            setFilterRoles(prev => 
                              prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
                            );
                          }}
                        >
                          <span className="capitalize">{role}</span>
                          {isSelected && <CheckIcon className="w-4 h-4 text-user-blue" />}
                        </li>
                      );
                    })}
                  </ul>
                  <div className="flex justify-end gap-2 px-0.5 border-t border-gray-100 mt-1">
                    <button 
                      className="filter-popup-btn filter-popup-btn-clear"
                      onClick={() => { setFilterRoles([]); setHeaderFilterOpen(null); }}
                    >
                      Clear
                    </button>
                    <button 
                      className="filter-popup-btn filter-popup-btn-filter"
                      onClick={() => setHeaderFilterOpen(null)}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </FilterPortal>
            )}
            
            {headerFilterOpen === 'status' && (
              <FilterPortal buttonRect={filterButtonRect}>
                <div ref={headerFilterRef} className="w-44 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{ borderRadius: '5px' }}>
                  <ul className="max-h-64 overflow-auto">
                    {['active', 'inactive'].map((status) => {
                      const isSelected = filterStatuses.includes(status);
                      return (
                        <li
                          key={status}
                          className={`px-2 rounded-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between ${isSelected ? 'bg-gray-50' : ''}`}
                          onClick={() => {
                            setFilterStatuses(prev => 
                              prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
                            );
                          }}
                        >
                          <span className="capitalize">{status}</span>
                          {isSelected && <CheckIcon className="w-4 h-4 text-user-blue" />}
                        </li>
                      );
                    })}
                  </ul>
                  <div className="flex justify-end gap-2 px-0.5 border-t border-gray-100 mt-1">
                    <button 
                      className="filter-popup-btn filter-popup-btn-clear"
                      onClick={() => { setFilterStatuses([]); setHeaderFilterOpen(null); }}
                    >
                      Clear
                    </button>
                    <button 
                      className="filter-popup-btn filter-popup-btn-filter"
                      onClick={() => setHeaderFilterOpen(null)}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </FilterPortal>
            )}
        </div>
      )}
      </div>
    </div>
  );
};

export default TeamsPage;