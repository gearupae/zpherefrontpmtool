import apiClient from '../api/client';
import { detectTenantContext } from '../utils/tenantUtils';

/**
 * Notification Helper Utility
 * 
 * Provides centralized functions for creating both toast notifications (transient UI feedback)
 * and persistent in-app notifications (stored in database, shown in notification center).
 * 
 * This helper ensures all CRUD operations across the application trigger appropriate notifications
 * that update the bell badge and notification panel via WebSocket events.
 */

export interface NotificationPayload {
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  priority?: 'normal' | 'high' | 'urgent';
  project_id?: string;
  task_id?: string;
  context_data?: Record<string, any>;
}

/**
 * Creates a persistent notification in the database
 * This will trigger a WebSocket event that updates the bell badge and notification panel
 */
export const createPersistentNotification = async (payload: NotificationPayload): Promise<void> => {
  try {
    // Skip creating notifications in admin context to avoid tenant DB errors
    try {
      const { store } = require('../store');
      const state = store.getState();
      const ctx = detectTenantContext(state?.auth?.user?.role, state?.auth?.user?.organization);
      if (ctx.tenantType === 'admin') {
        console.log('ℹ️ Skipping persistent notification in admin context');
        return;
      }
    } catch (ctxErr) {
      console.warn('⚠️ Unable to detect tenant context. Proceeding with notification.', ctxErr);
    }

    console.log('📢 Creating persistent notification:', payload);
    const response = await apiClient.post('/notifications/', {
      user_id: payload.user_id,
      notification_type: payload.notification_type,
      title: payload.title,
      message: payload.message,
      priority: payload.priority || 'normal',
      project_id: payload.project_id,
      task_id: payload.task_id,
      context_data: payload.context_data || {}
    });
    console.log('✅ Notification created successfully:', response.data);
  } catch (error) {
    console.error('❌ Failed to create persistent notification:', error);
    // Non-blocking: Don't throw - allow the main operation to succeed even if notification fails
  }
};

/**
 * Gets the current user ID from the Redux store
 * Uses dynamic import to avoid circular dependency issues
 */
const getCurrentUserId = (): string | undefined => {
  try {
    // Dynamic import to avoid circular dependency
    const { store } = require('../store');
    const state = store.getState();
    const userId = state?.auth?.user?.id;
    console.log('👤 Current user ID:', userId);
    return userId;
  } catch (error) {
    console.warn('⚠️ Failed to get current user ID from store:', error);
    return undefined;
  }
};

// ==================== PROJECT NOTIFICATIONS ====================

export const notifyProjectCreated = async (projectId: string, projectName: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) {
    console.warn('⚠️ Cannot create notification: No user ID found');
    return;
  }

  // Check if user is admin - admins might not have notifications enabled
  try {
    const { store } = require('../store');
    const state = store.getState();
    const userRole = state?.auth?.user?.role;
    const hasOrg = state?.auth?.user?.organization_id || state?.auth?.user?.organization;
    
    // Skip notifications for platform admins (they have no org context)
    if (userRole === 'ADMIN' && !hasOrg) {
      console.log('ℹ️ Skipping notification for platform admin (no org context)');
      return;
    }
  } catch (err) {
    console.warn('⚠️ Error checking user context:', err);
  }

  await createPersistentNotification({
    user_id: userId,
    notification_type: 'project_created',
    title: 'Project Created',
    message: `Project "${projectName}" was successfully created`,
    priority: 'normal',
    project_id: projectId,
    context_data: { project_id: projectId, action: 'created' }
  });
};

export const notifyProjectUpdated = async (projectId: string, projectName: string, updatedFields?: string[]): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) return;

  const fieldsText = updatedFields && updatedFields.length > 0 
    ? ` (${updatedFields.join(', ')})`
    : '';

  await createPersistentNotification({
    user_id: userId,
    notification_type: 'project_status_changed',
    title: 'Project Updated',
    message: `Project "${projectName}" was updated${fieldsText}`,
    priority: 'normal',
    project_id: projectId,
    context_data: { project_id: projectId, action: 'updated', fields: updatedFields }
  });
};

export const notifyProjectDeleted = async (projectId: string, projectName: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) return;

  await createPersistentNotification({
    user_id: userId,
    notification_type: 'project_status_changed',
    title: 'Project Deleted',
    message: `Project "${projectName}" was deleted`,
    priority: 'high',
    project_id: projectId,
    context_data: { project_id: projectId, action: 'deleted' }
  });
};

// ==================== TASK NOTIFICATIONS ====================

export const notifyTaskCreated = async (taskId: string, taskTitle: string, projectId?: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) return;

  await createPersistentNotification({
    user_id: userId,
    notification_type: 'task_created',
    title: 'Task Created',
    message: `Task "${taskTitle}" was successfully created`,
    priority: 'normal',
    task_id: taskId,
    project_id: projectId,
    context_data: { task_id: taskId, project_id: projectId, action: 'created' }
  });
};

export const notifyTaskUpdated = async (taskId: string, taskTitle: string, projectId?: string, updatedFields?: string[]): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) return;

  const fieldsText = updatedFields && updatedFields.length > 0 
    ? ` (${updatedFields.join(', ')})`
    : '';

  await createPersistentNotification({
    user_id: userId,
    notification_type: 'task_status_changed',
    title: 'Task Updated',
    message: `Task "${taskTitle}" was updated${fieldsText}`,
    priority: 'normal',
    task_id: taskId,
    project_id: projectId,
    context_data: { task_id: taskId, project_id: projectId, action: 'updated', fields: updatedFields }
  });
};

export const notifyTaskDeleted = async (taskId: string, taskTitle: string, projectId?: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) return;

  await createPersistentNotification({
    user_id: userId,
    notification_type: 'task_status_changed',
    title: 'Task Deleted',
    message: `Task "${taskTitle}" was deleted`,
    priority: 'high',
    task_id: taskId,
    project_id: projectId,
    context_data: { task_id: taskId, project_id: projectId, action: 'deleted' }
  });
};

export const notifyTaskCommented = async (taskId: string, taskTitle: string, commentText: string, projectId?: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) return;

  await createPersistentNotification({
    user_id: userId,
    notification_type: 'comment_added',
    title: 'Comment Added',
    message: `Comment added to task "${taskTitle}"`,
    priority: 'normal',
    task_id: taskId,
    project_id: projectId,
    context_data: { task_id: taskId, project_id: projectId, action: 'commented', comment_preview: commentText.substring(0, 100) }
  });
};

// ==================== TEAM NOTIFICATIONS ====================

export const notifyTeamMemberAdded = async (memberId: string, memberName: string, projectId?: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) return;

  await createPersistentNotification({
    user_id: userId,
    notification_type: 'team_member_added',
    title: 'Team Member Added',
    message: `${memberName} was added to the team`,
    priority: 'normal',
    project_id: projectId,
    context_data: { member_id: memberId, project_id: projectId, action: 'added' }
  });
};

export const notifyTeamMemberUpdated = async (memberId: string, memberName: string, projectId?: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) return;

  await createPersistentNotification({
    user_id: userId,
    notification_type: 'team_member_updated',
    title: 'Team Member Updated',
    message: `${memberName}'s details were updated`,
    priority: 'normal',
    project_id: projectId,
    context_data: { member_id: memberId, project_id: projectId, action: 'updated' }
  });
};

export const notifyTeamMemberRemoved = async (memberId: string, memberName: string, projectId?: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) return;

  await createPersistentNotification({
    user_id: userId,
    notification_type: 'team_member_removed',
    title: 'Team Member Removed',
    message: `${memberName} was removed from the team`,
    priority: 'high',
    project_id: projectId,
    context_data: { member_id: memberId, project_id: projectId, action: 'removed' }
  });
};

// ==================== CUSTOMER NOTIFICATIONS ====================

export const notifyCustomerCreated = async (customerId: string, customerName: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) return;

  await createPersistentNotification({
    user_id: userId,
    notification_type: 'customer_created',
    title: 'Customer Created',
    message: `Customer "${customerName}" was successfully created`,
    priority: 'normal',
    context_data: { customer_id: customerId, action: 'created' }
  });
};

export const notifyCustomerUpdated = async (customerId: string, customerName: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) return;

  await createPersistentNotification({
    user_id: userId,
    notification_type: 'customer_updated',
    title: 'Customer Updated',
    message: `Customer "${customerName}" was updated`,
    priority: 'normal',
    context_data: { customer_id: customerId, action: 'updated' }
  });
};

export const notifyCustomerDeleted = async (customerId: string, customerName: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) return;

  await createPersistentNotification({
    user_id: userId,
    notification_type: 'customer_deleted',
    title: 'Customer Deleted',
    message: `Customer "${customerName}" was deleted`,
    priority: 'high',
    context_data: { customer_id: customerId, action: 'deleted' }
  });
};

// ==================== PROPOSAL NOTIFICATIONS ====================

export const notifyProposalCreated = async (proposalId: string, proposalTitle: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) return;

  await createPersistentNotification({
    user_id: userId,
    notification_type: 'proposal_created',
    title: 'Proposal Created',
    message: `Proposal "${proposalTitle}" was successfully created`,
    priority: 'normal',
    context_data: { proposal_id: proposalId, action: 'created' }
  });
};

export const notifyProposalUpdated = async (proposalId: string, proposalTitle: string, status?: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) return;

  const statusText = status ? ` - Status: ${status}` : '';

  await createPersistentNotification({
    user_id: userId,
    notification_type: 'proposal_status_changed',
    title: 'Proposal Updated',
    message: `Proposal "${proposalTitle}" was updated${statusText}`,
    priority: 'normal',
    context_data: { proposal_id: proposalId, action: 'updated', status }
  });
};

export const notifyProposalDeleted = async (proposalId: string, proposalTitle: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) return;

  await createPersistentNotification({
    user_id: userId,
    notification_type: 'proposal_deleted',
    title: 'Proposal Deleted',
    message: `Proposal "${proposalTitle}" was deleted`,
    priority: 'high',
    context_data: { proposal_id: proposalId, action: 'deleted' }
  });
};

export const notifyProposalSent = async (proposalId: string, proposalTitle: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) return;

  await createPersistentNotification({
    user_id: userId,
    notification_type: 'proposal_sent',
    title: 'Proposal Sent',
    message: `Proposal "${proposalTitle}" was sent to customer`,
    priority: 'high',
    context_data: { proposal_id: proposalId, action: 'sent' }
  });
};

// ==================== INVOICE NOTIFICATIONS ====================

export const notifyInvoiceCreated = async (invoiceId: string, invoiceTitle: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) return;

  await createPersistentNotification({
    user_id: userId,
    notification_type: 'invoice_created',
    title: 'Invoice Created',
    message: `Invoice "${invoiceTitle}" was successfully created`,
    priority: 'normal',
    context_data: { invoice_id: invoiceId, action: 'created' }
  });
};

export const notifyInvoiceUpdated = async (invoiceId: string, invoiceTitle: string, status?: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) return;

  const statusText = status ? ` - Status: ${status}` : '';

  await createPersistentNotification({
    user_id: userId,
    notification_type: 'invoice_status_changed',
    title: 'Invoice Updated',
    message: `Invoice "${invoiceTitle}" was updated${statusText}`,
    priority: 'normal',
    context_data: { invoice_id: invoiceId, action: 'updated', status }
  });
};

export const notifyInvoiceDeleted = async (invoiceId: string, invoiceTitle: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) return;

  await createPersistentNotification({
    user_id: userId,
    notification_type: 'invoice_deleted',
    title: 'Invoice Deleted',
    message: `Invoice "${invoiceTitle}" was deleted`,
    priority: 'high',
    context_data: { invoice_id: invoiceId, action: 'deleted' }
  });
};

export const notifyInvoicePaid = async (invoiceId: string, invoiceTitle: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) return;

  await createPersistentNotification({
    user_id: userId,
    notification_type: 'payment_received',
    title: 'Payment Received',
    message: `Invoice "${invoiceTitle}" has been paid`,
    priority: 'high',
    context_data: { invoice_id: invoiceId, action: 'paid' }
  });
};

// ==================== GOAL NOTIFICATIONS ====================

export const notifyGoalCreated = async (goalId: string, goalTitle: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) return;

  await createPersistentNotification({
    user_id: userId,
    notification_type: 'goal_created',
    title: 'Goal Created',
    message: `Goal "${goalTitle}" was successfully created`,
    priority: 'normal',
    context_data: { goal_id: goalId, action: 'created' }
  });
};

export const notifyGoalUpdated = async (goalId: string, goalTitle: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) return;

  await createPersistentNotification({
    user_id: userId,
    notification_type: 'goal_updated',
    title: 'Goal Updated',
    message: `Goal "${goalTitle}" was updated`,
    priority: 'normal',
    context_data: { goal_id: goalId, action: 'updated' }
  });
};

export const notifyGoalDeleted = async (goalId: string, goalTitle: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) return;

  await createPersistentNotification({
    user_id: userId,
    notification_type: 'goal_deleted',
    title: 'Goal Deleted',
    message: `Goal "${goalTitle}" was deleted`,
    priority: 'high',
    context_data: { goal_id: goalId, action: 'deleted' }
  });
};

// ==================== PURCHASE ORDER & VENDOR NOTIFICATIONS ====================

export const notifyVendorCreated = async (vendorId: string, vendorName: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) return;

  await createPersistentNotification({
    user_id: userId,
    notification_type: 'vendor_created',
    title: 'Vendor Created',
    message: `Vendor "${vendorName}" was successfully created`,
    priority: 'normal',
    context_data: { vendor_id: vendorId, action: 'created' }
  });
};

export const notifyVendorUpdated = async (vendorId: string, vendorName: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) return;

  await createPersistentNotification({
    user_id: userId,
    notification_type: 'vendor_updated',
    title: 'Vendor Updated',
    message: `Vendor "${vendorName}" was updated`,
    priority: 'normal',
    context_data: { vendor_id: vendorId, action: 'updated' }
  });
};

export const notifyVendorDeleted = async (vendorId: string, vendorName: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) return;

  await createPersistentNotification({
    user_id: userId,
    notification_type: 'vendor_deleted',
    title: 'Vendor Deleted',
    message: `Vendor "${vendorName}" was deleted`,
    priority: 'high',
    context_data: { vendor_id: vendorId, action: 'deleted' }
  });
};

export const notifyPurchaseOrderCreated = async (poId: string, poNumber: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) return;

  await createPersistentNotification({
    user_id: userId,
    notification_type: 'purchase_order_created',
    title: 'Purchase Order Created',
    message: `Purchase Order "${poNumber}" was successfully created`,
    priority: 'normal',
    context_data: { purchase_order_id: poId, action: 'created' }
  });
};

export const notifyPurchaseOrderUpdated = async (poId: string, poNumber: string, status?: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) return;

  const statusText = status ? ` - Status: ${status}` : '';

  await createPersistentNotification({
    user_id: userId,
    notification_type: 'purchase_order_updated',
    title: 'Purchase Order Updated',
    message: `Purchase Order "${poNumber}" was updated${statusText}`,
    priority: 'normal',
    context_data: { purchase_order_id: poId, action: 'updated', status }
  });
};

export const notifyPurchaseOrderDeleted = async (poId: string, poNumber: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) return;

  await createPersistentNotification({
    user_id: userId,
    notification_type: 'purchase_order_deleted',
    title: 'Purchase Order Deleted',
    message: `Purchase Order "${poNumber}" was deleted`,
    priority: 'high',
    context_data: { purchase_order_id: poId, action: 'deleted' }
  });
};

// ==================== COMMENT NOTIFICATIONS (Generic) ====================

export const notifyCommentAdded = async (entityType: string, entityId: string, entityTitle: string, commentAuthor: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) return;

  await createPersistentNotification({
    user_id: userId,
    notification_type: 'comment_added',
    title: 'Comment Added',
    message: `${commentAuthor} commented on ${entityType} "${entityTitle}"`,
    priority: 'normal',
    context_data: { entity_type: entityType, entity_id: entityId, action: 'commented', author: commentAuthor }
  });
};
