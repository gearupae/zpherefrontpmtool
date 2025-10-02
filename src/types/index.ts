// User types
export interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone?: string;
  bio?: string;
  timezone: string;
  avatar_url?: string;
  role: UserRole;
  status: UserStatus;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
  organization_id: string;
  organization_name: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
  preferences: Record<string, any>;
  notification_settings: Record<string, any>;
}

export enum UserRole {
  ADMIN = 'ADMIN',     // Platform admin - manages all tenants, payments, billing
  MANAGER = 'MANAGER', // Tenant manager - manages projects within their organization  
  MEMBER = 'MEMBER',   // Tenant member - works on projects within their organization
  CLIENT = 'CLIENT',   // External client - limited access to specific projects
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
}

// Organization types
export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  domain?: string;
  is_active: boolean;
  subscription_tier: SubscriptionTier;
  max_users: number;
  max_projects: number;
  settings: Record<string, any>;
  branding: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export enum SubscriptionTier {
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  BUSINESS = 'business',
  ENTERPRISE = 'enterprise',
}

// Project types
export interface Project {
  id: string;
  name: string;
  description?: string;
  slug: string;
  organization_id: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  start_date?: string;
  due_date?: string;
  completed_date?: string;
  owner_id: string;
  customer_id?: string;
  budget?: number;
  hourly_rate?: number;
  estimated_hours?: number;
  actual_hours: number;
  settings: Record<string, any>;
  custom_fields: Record<string, any>;
  is_template: boolean;
  is_archived: boolean;
  is_public: boolean;
  // Populated when fetching via GET /projects and GET /projects/{id}
  members?: ProjectMemberResponse[];
  created_at: string;
  updated_at: string;
}

export enum ProjectStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ARCHIVED = 'archived',
}

export enum ProjectPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Task types
export interface Task {
  id: string;
  title: string;
  description?: string;
  project_id: string;
  status: TaskStatus;
  priority: TaskPriority;
  task_type: TaskType;
  assignee_id?: string;
  created_by_id: string;
  parent_task_id?: string;
  // Recurrence linkage
  recurring_template_id?: string;
  position: number;
  start_date?: string;
  due_date?: string;
  completed_date?: string;
  estimated_hours?: number;
  actual_hours: number;
  story_points?: number;
  labels: string[];
  tags: string[];
  custom_fields: Record<string, any>;
  metadata: Record<string, any>;
  // Sprint
  sprint_name?: string;
  sprint_start_date?: string;
  sprint_end_date?: string;
  sprint_goal?: string;
  is_recurring: boolean;
  is_template: boolean;
  is_archived: boolean;
  visible_to_customer: boolean;
  created_at: string;
  updated_at: string;
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'in_review',
  BLOCKED = 'blocked',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum TaskType {
  TASK = 'task',
  BUG = 'bug',
  FEATURE = 'feature',
  EPIC = 'epic',
  STORY = 'story',
  SUBTASK = 'subtask',
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface RegisterData {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  password: string;
  organization_id?: string;
  role?: UserRole;
}

// API Response types
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  status: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// UI State types
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface NotificationState {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

// Dashboard types
export interface DashboardStats {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  overdue_tasks: number;
  total_tasks: number;
  completed_tasks: number;
  team_members: number;
  recent_activity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'task_created' | 'task_updated' | 'project_created' | 'user_joined' | 'comment_added' | 'attachment_added' | 'document_created';
  title: string;
  description: string;
  user_name: string;
  user_avatar?: string;
  created_at: string;
}

// Comment types
export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  parent_comment_id?: string;
  mentions: string[];
  linked_tasks: string[];
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  user?: User;
  replies?: TaskComment[];
}

export interface TaskCommentCreate {
  content: string;
  parent_comment_id?: string;
  mentions?: string[];
  linked_tasks?: string[];
}

export interface TaskCommentUpdate {
  content: string;
  mentions?: string[];
  linked_tasks?: string[];
}

// Attachment types
export interface TaskAttachment {
  id: string;
  task_id: string;
  user_id: string;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type?: string;
  created_at: string;
  updated_at: string;
  user?: User;
}

// Document types (for in-app document creation)
export interface TaskDocument {
  id: string;
  task_id: string;
  user_id: string;
  title: string;
  content: string;
  document_type: DocumentType;
  version: number;
  is_template: boolean;
  tags: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface TaskDocumentCreate {
  title: string;
  content: string;
  document_type: DocumentType;
  is_template?: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface TaskDocumentUpdate {
  title?: string;
  content?: string;
  document_type?: DocumentType;
  is_template?: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
}

export enum DocumentType {
  SPECIFICATION = 'specification',
  REQUIREMENTS = 'requirements',
  NOTES = 'notes',
  CHECKLIST = 'checklist',
  MEETING_NOTES = 'meeting_notes',
  TECHNICAL_DOC = 'technical_doc',
  USER_GUIDE = 'user_guide',
  OTHER = 'other'
}

// Team Management types
export interface TeamMember {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  is_active: boolean;
  avatar_url?: string;
  timezone: string;
  phone?: string;
  bio?: string;
  address?: string;
  last_login?: string;
  created_at: string;
}

export interface ProjectMemberResponse {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectMemberRole;
  can_edit_project: boolean;
  can_create_tasks: boolean;
  can_assign_tasks: boolean;
  can_delete_tasks: boolean;
  user: TeamMember;
  created_at: string;
}

export interface ProjectMemberCreate {
  user_id: string;
  role?: ProjectMemberRole;
  can_edit_project?: boolean;
  can_create_tasks?: boolean;
  can_assign_tasks?: boolean;
  can_delete_tasks?: boolean;
}

export interface ProjectMemberUpdate {
  role?: ProjectMemberRole;
  can_edit_project?: boolean;
  can_create_tasks?: boolean;
  can_assign_tasks?: boolean;
  can_delete_tasks?: boolean;
}

export enum ProjectMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

// Customer types
export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company_name?: string;
  company_website?: string;
  job_title?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  customer_type: string;
  source?: string;
  credit_limit?: number;
  payment_terms: string;
  notes?: string;
  tags: string[];
  custom_fields: Record<string, any>;
  organization_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  full_name: string;
  display_name: string;
}

export interface CustomerCreate {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company_name?: string;
  company_website?: string;
  job_title?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  customer_type: string;
  source?: string;
  credit_limit?: number;
  payment_terms: string;
  notes?: string;
  tags: string[];
  custom_fields: Record<string, any>;
}

export interface CustomerUpdate {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company_name?: string;
  company_website?: string;
  job_title?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  customer_type?: string;
  source?: string;
  credit_limit?: number;
  payment_terms?: string;
  notes?: string;
  tags?: string[];
  custom_fields?: Record<string, any>;
  is_active?: boolean;
}

// Proposal types
export enum ProposalStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  WITHDRAWN = 'WITHDRAWN'
}

export enum ProposalType {
  PROJECT = 'PROJECT',
  CONSULTING = 'CONSULTING',
  MAINTENANCE = 'MAINTENANCE',
  SUPPORT = 'SUPPORT',
  CUSTOM = 'CUSTOM'
}

export interface Proposal {
  id: string;
  title: string;
  description?: string;
  proposal_number: string;
  organization_id: string;
  customer_id: string;
  created_by_id: string;
  proposal_type: ProposalType;
  status: ProposalStatus;
  content: Record<string, any>;
  template_id?: string;
  custom_template: Record<string, any>;
  total_amount?: number;
  currency: string;
  valid_until?: string;
  sent_date?: string;
  viewed_date?: string;
  responded_date?: string;
  response_notes?: string;
  rejection_reason?: string;
  follow_up_date?: string;
  notes?: string;
  tags: string[];
  custom_fields: Record<string, any>;
  is_template: boolean;
  created_at: string;
  updated_at: string;
  is_expired: boolean;
  status_color: string;
}

export interface ProposalCreate {
  title: string;
  description?: string;
  proposal_type: ProposalType;
  content: Record<string, any>;
  template_id?: string;
  custom_template: Record<string, any>;
  total_amount?: number;
  currency: string;
  valid_until?: string;
  notes?: string;
  tags: string[];
  custom_fields: Record<string, any>;
  customer_id: string;
}

// Project Invoice types
export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  VIEWED = 'viewed',
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  PARTIALLY_PAID = 'partially_paid',
  CANCELLED = 'cancelled',
  VOID = 'void'
}

export enum InvoiceType {
  PROJECT = 'project',
  RECURRING = 'recurring',
  TIME_AND_MATERIALS = 'time_and_materials',
  FIXED_PRICE = 'fixed_price',
  HOURLY = 'hourly',
  EXPENSE = 'expense'
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  item_type: string;
  task_id?: string;
  tax_rate: number;
  discount_rate: number;
  amount: number;
  tax_amount: number;
  discount_amount: number;
  created_at: string;
  updated_at: string;
}

// Item types
export enum ItemType {
  SERVICE = 'service',
  PRODUCT = 'product',
  EXPENSE = 'expense',
  TIME = 'time',
  MATERIAL = 'material'
}

export enum TaxType {
  NONE = 'none',
  TAXABLE = 'taxable',
  EXEMPT = 'exempt'
}

export interface Item {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  organization_id: string;
  item_type: ItemType;
  category?: string;
  unit_price: number; // In cents
  cost: number; // In cents
  unit: string;
  tax_type: TaxType;
  default_tax_rate: number; // Tax rate percentage * 100
  track_inventory: boolean;
  current_stock: number;
  minimum_stock: number;
  is_active: boolean;
  is_billable: boolean;
  tags: string[];
  custom_fields: Record<string, any>;
  notes?: string;
  created_at: string;
  updated_at: string;
  display_name: string;
  unit_price_display: number;
  cost_display: number;
  margin_percentage: number;
}

export interface ItemCreate {
  name: string;
  description?: string;
  sku?: string;
  item_type: ItemType;
  category?: string;
  unit_price: number;
  cost: number;
  unit: string;
  tax_type: TaxType;
  default_tax_rate: number;
  track_inventory: boolean;
  current_stock: number;
  minimum_stock: number;
  is_active: boolean;
  is_billable: boolean;
  tags: string[];
  custom_fields: Record<string, any>;
  notes?: string;
}

export interface ItemUpdate {
  name?: string;
  description?: string;
  sku?: string;
  item_type?: ItemType;
  category?: string;
  unit_price?: number;
  cost?: number;
  unit?: string;
  tax_type?: TaxType;
  default_tax_rate?: number;
  track_inventory?: boolean;
  current_stock?: number;
  minimum_stock?: number;
  is_active?: boolean;
  is_billable?: boolean;
  tags?: string[];
  custom_fields?: Record<string, any>;
  notes?: string;
}

export interface ProjectInvoice {
  id: string;
  invoice_number: string;
  title: string;
  description?: string;
  organization_id: string;
  project_id: string;
  customer_id: string;
  created_by_id: string;
  invoice_type: InvoiceType;
  status: InvoiceStatus;
  currency: string;
  exchange_rate: number;
  payment_terms: string;
  invoice_date: string;
  due_date?: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  sent_date?: string;
  viewed_date?: string;
  paid_date?: string;
  items: InvoiceItem[];
  payment_history: Record<string, any>[];
  late_fees: number;
  reminder_sent_count: number;
  last_reminder_sent?: string;
  notes?: string;
  terms_and_conditions?: string;
  is_recurring: boolean;
  recurring_interval?: string;
  next_invoice_date?: string;
  tags: string[];
  custom_fields: Record<string, any>;
  created_at: string;
  updated_at: string;
  is_overdue: boolean;
  days_overdue: number;
  payment_percentage: number;
  status_color: string;
}

export interface ProjectInvoiceCreate {
  title: string;
  description?: string;
  invoice_type: InvoiceType;
  currency: string;
  exchange_rate: number;
  payment_terms: string;
  invoice_date: string;
  due_date?: string;
  notes?: string;
  terms_and_conditions?: string;
  is_recurring: boolean;
  recurring_interval?: string;
  next_invoice_date?: string;
  tags: string[];
  custom_fields: Record<string, any>;
  project_id: string;
  customer_id: string;
  items: InvoiceItemCreate[];
}

export interface InvoiceItemCreate {
  description: string;
  quantity?: number;
  unit_price?: number; // In cents
  item_type?: string;
  task_id?: string;
  tax_rate?: number; // Tax rate percentage * 100
  discount_rate?: number; // Discount rate percentage * 100
}
