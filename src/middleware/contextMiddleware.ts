import { contextResolutionService, ResolvedContext, ContextQuery } from '../services/contextResolutionService';
import { PAIMessage, PAIChatResponse } from '../api/pai';
import { buildInvoiceOptionsForCustomer, computeInvoiceDefaults, fetchCustomerFinancialSummary, computeUnbilledForCustomer } from '../services/smartDefaults';

// Enhanced PAI response with context
export interface EnhancedPAIResponse extends PAIChatResponse {
  resolvedContext?: ResolvedContext;
  contextSummary?: string;
  suggestedActions?: Array<{
    action: string;
    description: string;
    confidence: number;
  }>;
}

// Context-aware command processing
export interface ContextAwareCommand {
  originalText: string;
  enrichedPrompt: string;
  context: ResolvedContext;
  intent: string;
  entities: Record<string, any>;
  suggestedParameters?: Record<string, any>;
}

export class ContextResolutionMiddleware {
  private static instance: ContextResolutionMiddleware;

  static getInstance(): ContextResolutionMiddleware {
    if (!ContextResolutionMiddleware.instance) {
      ContextResolutionMiddleware.instance = new ContextResolutionMiddleware();
    }
    return ContextResolutionMiddleware.instance;
  }

  /**
   * Main middleware function that enriches PAI messages with context
   */
  async processWithContext(messages: PAIMessage[]): Promise<ContextAwareCommand | null> {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) return null;

    const userText = lastUserMessage.content.trim();
    if (!userText) return null;

    try {
      // Resolve context for the user's message
      const context = await contextResolutionService.resolveContext({
        text: userText,
        limit: 10
      });

      // Generate enriched prompt with context
      const enrichedCommand = await this.generateEnrichedCommand(userText, context);

      return enrichedCommand;
    } catch (error) {
      console.error('Context middleware processing failed:', error);
      return null;
    }
  }

  /**
   * Generate an enriched command with context and suggested parameters
   */
  private async generateEnrichedCommand(originalText: string, context: ResolvedContext): Promise<ContextAwareCommand> {
    const intent = this.classifyIntent(originalText);
    const entities = this.extractStructuredEntities(originalText, context);
    // Keep original text for downstream parsing
    (entities as any).originalText = originalText;
    
    // Generate context-aware prompt
    const enrichedPrompt = this.buildEnrichedPrompt(originalText, context, intent);
    
    // Generate suggested parameters based on context
    const suggestedParameters = await this.asyncGenerateSuggestedParameters(intent, context, entities);

    return {
      originalText,
      enrichedPrompt,
      context,
      intent,
      entities,
      suggestedParameters
    };
  }

  /**
   * Build an enriched prompt with context information
   */
  private buildEnrichedPrompt(originalText: string, context: ResolvedContext, intent: string): string {
    let prompt = `User Request: "${originalText}"\n\nContext Information:\n`;

    // Add customer context
    if (context.customers.length > 0) {
      prompt += `\nCustomers found (${context.customers.length}):\n`;
      context.customers.forEach((customer, index) => {
        prompt += `${index + 1}. ${customer.display_name || customer.first_name + ' ' + customer.last_name} (ID: ${customer.id})\n`;
        if (customer.company_name) prompt += `   Company: ${customer.company_name}\n`;
        if (customer.email) prompt += `   Email: ${customer.email}\n`;
        if (customer.payment_terms) prompt += `   Payment Terms: ${customer.payment_terms}\n`;
        if (customer.projects_count) prompt += `   Active Projects: ${customer.projects_count}\n`;
        if (customer.due_amount) prompt += `   Outstanding Amount: $${(customer.due_amount / 100).toFixed(2)}\n`;
      });
    }

    // Add project context
    if (context.projects.length > 0) {
      prompt += `\nProjects found (${context.projects.length}):\n`;
      context.projects.forEach((project, index) => {
        prompt += `${index + 1}. ${project.name} (ID: ${project.id})\n`;
        prompt += `   Status: ${project.status}\n`;
        prompt += `   Priority: ${project.priority}\n`;
        if (project.budget) prompt += `   Budget: $${(project.budget / 100).toFixed(2)}\n`;
        if (project.actual_hours) prompt += `   Hours Logged: ${project.actual_hours}\n`;
        if (project.customer_id) prompt += `   Customer ID: ${project.customer_id}\n`;
      });
    }

    // Add task context  
    if (context.tasks.length > 0) {
      prompt += `\nTasks found (${context.tasks.length}):\n`;
      context.tasks.forEach((task, index) => {
        prompt += `${index + 1}. ${task.title} (ID: ${task.id})\n`;
        prompt += `   Status: ${task.status}\n`;
        prompt += `   Priority: ${task.priority}\n`;
        if (task.assignee_id) prompt += `   Assignee ID: ${task.assignee_id}\n`;
        if (task.due_date) prompt += `   Due Date: ${task.due_date}\n`;
        if (task.estimated_hours) prompt += `   Estimated: ${task.estimated_hours}h\n`;
        if (task.actual_hours) prompt += `   Actual: ${task.actual_hours}h\n`;
      });
    }

    // Add invoice context
    if (context.invoices.length > 0) {
      prompt += `\nInvoices found (${context.invoices.length}):\n`;
      context.invoices.forEach((invoice, index) => {
        prompt += `${index + 1}. ${invoice.invoice_number} (ID: ${invoice.id})\n`;
        prompt += `   Status: ${invoice.status}\n`;
        prompt += `   Total: $${(invoice.total_amount / 100).toFixed(2)}\n`;
        prompt += `   Due Date: ${invoice.due_date}\n`;
        if (invoice.customer_id) prompt += `   Customer ID: ${invoice.customer_id}\n`;
      });
    }

    // Add team member context
    if (context.teamMembers.length > 0) {
      prompt += `\nTeam Members found (${context.teamMembers.length}):\n`;
      context.teamMembers.forEach((member, index) => {
        prompt += `${index + 1}. ${member.full_name} (@${member.username}) (ID: ${member.id})\n`;
        prompt += `   Role: ${member.role}\n`;
        if (member.email) prompt += `   Email: ${member.email}\n`;
      });
    }

    // Add confidence and suggestions
    prompt += `\nContext Confidence: ${(context.confidence * 100).toFixed(0)}%\n`;
    
    if (context.suggestions.length > 0) {
      prompt += `\nSuggestions for improvement:\n`;
      context.suggestions.forEach(suggestion => {
        prompt += `- ${suggestion}\n`;
      });
    }

    // Add intent classification
    prompt += `\nDetected Intent: ${intent}\n`;

    // Add processing instruction
    prompt += `\nInstructions: Use the above context to process the user's request accurately. If creating invoices, use the customer and project information. If updating status, reference the specific projects or tasks found. If assigning tasks, use the team member information.`;

    return prompt;
  }

  /**
   * Extract structured entities that can be used for parameter suggestion
   */
  private extractStructuredEntities(text: string, context: ResolvedContext): Record<string, any> {
    const entities: Record<string, any> = {};

    // Extract the most likely customer
    if (context.customers.length > 0) {
      entities.customer = context.customers[0]; // Take the first (most relevant) match
    }

    // Extract the most likely project
    if (context.projects.length > 0) {
      entities.project = context.projects[0];
    }

    // Extract mentioned tasks
    if (context.tasks.length > 0) {
      entities.tasks = context.tasks;
    }

    // Extract team member mentions
    if (context.teamMembers.length > 0) {
      entities.assignee = context.teamMembers[0];
    }

    // Extract date mentions
    const dateMatches = text.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|today|tomorrow|next week|next month)\b/gi);
    if (dateMatches) {
      entities.dates = dateMatches;
    }

    // Extract amount mentions
    const amountMatches = text.match(/\$?([\d,]+\.?\d*)/g);
    if (amountMatches) {
      entities.amounts = amountMatches.map(match => match.replace(/[$,]/g, ''));
    }

    return entities;
  }

  /**
   * Generate suggested parameters based on context and intent
   */
  private asyncGenerateSuggestedParameters = async (intent: string, context: ResolvedContext, entities: Record<string, any>): Promise<Record<string, any>> => {
    const params: Record<string, any> = {};

    switch (intent) {
      case 'CREATE_INVOICE':
        // Handle multiple customer candidates (disambiguation)
        if (context.customers && context.customers.length > 1) {
          const top = context.customers.slice(0, 5);
          const enrichedList = [] as any[];
          for (const cu of top) {
            try {
              const [fin, unbilled] = await Promise.all([
                fetchCustomerFinancialSummary(cu.id),
                computeUnbilledForCustomer(cu.id)
              ]);
              enrichedList.push({
                id: cu.id,
                display_name: cu.display_name || cu.company_name || cu.full_name || cu.id,
                last_invoice: fin.last_invoice,
                unbilled_cents: unbilled.amount_cents
              });
            } catch {
              enrichedList.push({ id: cu.id, display_name: cu.display_name || cu.full_name || cu.id });
            }
          }
          const lines: string[] = [];
          lines.push(`Found ${enrichedList.length} customers matching '${(entities as any).originalText?.match(/for\s+([^\n]+)/i)?.[1] || ''}':`);
          enrichedList.forEach((c, i) => {
            const last = c.last_invoice ? `${new Date(c.last_invoice.invoice_date||'').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, $${((c.last_invoice.amount_cents||0)/100).toLocaleString()}` : 'No invoices';
            const unb = c.unbilled_cents ? `$${(c.unbilled_cents/100).toLocaleString()} ready` : 'No unbilled work';
            lines.push(`\n${i+1}. @${c.display_name} (#${c.id})\n   Last invoice: ${last}${c.last_invoice?.status ? ` (${String(c.last_invoice.status).toUpperCase()})` : ''}\n   Unbilled work: ${unb}`);
          });
          lines.push("\nWhich customer? Say 1, 2, 3 or type @ to search again.");
          params.customer_disambiguation = { candidates: enrichedList };
          params.presentation_disambiguation = lines.join('\n');
          break;
        }
        if (entities.customer) {
          params.customer_id = entities.customer.id;
          params.customer_name = entities.customer.display_name || entities.customer.full_name || entities.customer.company_name;

          // Compute smart invoice defaults
          const invoiceDefaults = await computeInvoiceDefaults(entities.customer);
          params.invoice_defaults = invoiceDefaults;

          // Build invoice options (A/B/C)
          try {
            const optionsBundle = await buildInvoiceOptionsForCustomer(entities.customer.id);
            if (optionsBundle) {
              params.invoice_options_bundle = optionsBundle;
              // Provide a chat-ready summary
              params.presentation_summary = optionsBundle.summary;
            }
          } catch {}
          params.customer_name = entities.customer.display_name;
          params.payment_terms = entities.customer.payment_terms || 'NET 30';
          
          // Suggest unbilled work
          const unbilledTasks = context.tasks.filter(task => 
            task.status === 'completed' && 
            // Assuming we have an invoiced field to check
            !task.metadata?.invoiced
          );
          
          if (unbilledTasks.length > 0) {
            params.suggested_items = unbilledTasks.map(task => ({
              description: task.title,
              quantity: task.actual_hours || task.estimated_hours || 1,
              unit_price: entities.project?.hourly_rate || 10000, // Default rate in cents
              task_id: task.id
            }));

            // Calculate suggested total
            const suggestedTotal = params.suggested_items.reduce((total: number, item: any) => {
              return total + (item.quantity * item.unit_price);
            }, 0);
            params.suggested_total = suggestedTotal;
          }
        }

        if (entities.project) {
          params.project_id = entities.project.id;
          params.project_name = entities.project.name;
        }

        // Set default invoice date and due date
        params.invoice_date = new Date().toISOString().split('T')[0];
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30); // Default NET 30
        params.due_date = dueDate.toISOString().split('T')[0];
        // No billable work edge-case
        try {
          if (!params.invoice_options_bundle) {
            const fin = await computeUnbilledForCustomer(entities.customer.id);
            if ((fin?.amount_cents||0) === 0) {
              const fin2 = await fetchCustomerFinancialSummary(entities.customer.id);
              const msgLines = [
                `✅ Found ${params.customer_name} (Customer #${entities.customer.id})`,
                '',
                '⚠️ NO UNBILLED WORK FOUND',
                '',
                'Checked:',
                `- All projects: ${Array.isArray(context.projects)? context.projects.length : 0} active/completed`,
                `- All tasks: ${Array.isArray(context.tasks)? context.tasks.length : 0} total`,
                fin2?.last_invoice ? `- Last invoice: ${new Date(fin2.last_invoice.invoice_date||'').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}, $${((fin2.last_invoice.amount_cents||0)/100).toLocaleString()} - ${String(fin2.last_invoice.status||'').toUpperCase()} ✅` : '- Last invoice: none',
                '',
                'Options:',
                '1. Create custom/manual invoice (enter amounts manually)',
                '2. Check projects to mark tasks as billable',
                `3. View invoice history for ${params.customer_name}`,
                '4. Wait until current work is completed',
                '',
                'What would you like to do? Say 1, 2, 3, or 4.'
              ];
              params.no_billable = { customer_id: entities.customer.id };
              params.presentation_no_billable = msgLines.join('\n');
            }
          } else {
            const A = params.invoice_options_bundle?.options?.find((o:any)=>o.key==='A')?.total_cents || 0;
            const B = params.invoice_options_bundle?.options?.find((o:any)=>o.key==='B')?.total_cents || 0;
            if ((A+B) === 0) {
              const fin2 = await fetchCustomerFinancialSummary(entities.customer.id);
              const msgLines = [
                `✅ Found ${params.customer_name} (Customer #${entities.customer.id})`,
                '',
                '⚠️ NO UNBILLED WORK FOUND',
                '',
                'Options:',
                '1. Create custom/manual invoice (enter amounts manually)',
                '2. Check projects to mark tasks as billable',
                `3. View invoice history for ${params.customer_name}`,
                '4. Wait until current work is completed',
                '',
                'What would you like to do? Say 1, 2, 3, or 4.'
              ];
              params.no_billable = { customer_id: entities.customer.id };
              params.presentation_no_billable = msgLines.join('\n');
            }
          }
        } catch {}
        
        // Credit hold warning if customer has overdue invoices
        try {
          const fin = await fetchCustomerFinancialSummary(entities.customer.id);
          const risky = (fin?.overdue_invoices||[]).filter((x:any)=> x.days_overdue >= 30);
          if (risky.length > 0) {
            const lines: string[] = [];
            lines.push('⚠️ CREDIT HOLD WARNING');
            lines.push('');
            lines.push(`${params.customer_name} (Customer #${entities.customer.id}) has overdue invoices:`);
            risky.forEach(inv => lines.push(`- Invoice #${inv.invoice_number}: $${(inv.amount_cents/100).toLocaleString()} (${inv.days_overdue} days overdue) 🔴`));
            const total = risky.reduce((s:number,x:any)=> s + x.amount_cents, 0);
            lines.push('');
            lines.push(`Total Outstanding: $${(total/100).toLocaleString()}`);
            lines.push('');
            lines.push('💡 RECOMMENDATION:');
            lines.push('Contact customer for payment before issuing new invoice.');
            lines.push('');
            lines.push('Options:');
            lines.push('1. Proceed anyway (create invoice despite overdue amount)');
            lines.push('2. Send payment reminder for overdue invoices first');
            lines.push('3. View full payment history and notes');
            lines.push('4. Cancel and contact customer');
            lines.push('');
            lines.push('⚠️ If you proceed, new work may also go unpaid.');
            lines.push('');
            lines.push('What should I do? Say 1, 2, 3, or 4.');
            params.risk_alert = { customer_id: entities.customer.id, overdue: risky };
            params.presentation_risk = lines.join('\n');
          }
        } catch {}
        
        break;

      case 'UPDATE_STATUS':
        if (entities.project) {
          params.project_id = entities.project.id;
          params.current_status = entities.project.status;
        }
        
        if (entities.tasks && entities.tasks.length > 0) {
          params.task_ids = entities.tasks.map((task: any) => task.id);
          params.current_task_statuses = entities.tasks.map((task: any) => ({
            id: task.id,
            status: task.status
          }));
        }

        // Extract status from text
        const statusMatch = entities.originalText?.match(/\b(completed|done|finished|cancelled|on.hold|in.progress|todo)\b/gi);
        if (statusMatch) {
          params.target_status = statusMatch[0].toLowerCase().replace('.', '_');
        }
        break;

      case 'ASSIGN_TASK':
        if (entities.tasks && entities.tasks.length > 0) {
          params.task_ids = entities.tasks.map((task: any) => task.id);
        }
        
        if (entities.assignee) {
          params.assignee_id = entities.assignee.id;
          params.assignee_name = entities.assignee.full_name;
        }
        break;

      case 'SHOW_OVERDUE':
        // Set filter parameters for overdue items
        params.filters = {
          overdue: true,
          status_not_in: ['completed', 'cancelled']
        };
        break;
    }

    return params;
  }

  /**
   * Classify user intent
   */
  private classifyIntent(text: string): string {
    const intentPatterns = {
      CREATE_INVOICE: [
        /create\s+(?:an?\s+)?invoice/gi,
        /(?:invoice|bill)\s+(?:for|to)/gi,
        /generate\s+(?:an?\s+)?invoice/gi
      ],
      UPDATE_STATUS: [
        /update\s+status/gi,
        /change\s+status/gi,
        /mark\s+(?:as\s+)?(?:completed|done|finished|cancelled|on.hold)/gi
      ],
      ASSIGN_TASK: [
        /assign\s+(?:task)?/gi,
        /reassign\s+(?:task)?/gi,
        /give\s+(?:task\s+)?to/gi
      ],
      SHOW_OVERDUE: [
        /show\s+(?:my\s+)?overdue/gi,
        /list\s+overdue/gi,
        /overdue\s+(?:tasks|projects|invoices)/gi
      ],
      CREATE_PROJECT: [
        /create\s+(?:a\s+)?project/gi,
        /new\s+project/gi,
        /start\s+project/gi
      ],
      CREATE_TASK: [
        /create\s+(?:a\s+)?task/gi,
        /new\s+task/gi,
        /add\s+task/gi
      ]
    };

    for (const [intent, patterns] of Object.entries(intentPatterns)) {
      if (patterns.some(pattern => pattern.test(text))) {
        return intent;
      }
    }

    return 'GENERAL';
  }

  /**
   * Generate a context summary for display
   */
  generateContextSummary(context: ResolvedContext): string {
    const parts: string[] = [];

    if (context.customers.length > 0) {
      parts.push(`${context.customers.length} customer${context.customers.length > 1 ? 's' : ''}`);
    }
    
    if (context.projects.length > 0) {
      parts.push(`${context.projects.length} project${context.projects.length > 1 ? 's' : ''}`);
    }
    
    if (context.tasks.length > 0) {
      parts.push(`${context.tasks.length} task${context.tasks.length > 1 ? 's' : ''}`);
    }
    
    if (context.invoices.length > 0) {
      parts.push(`${context.invoices.length} invoice${context.invoices.length > 1 ? 's' : ''}`);
    }

    if (context.teamMembers.length > 0) {
      parts.push(`${context.teamMembers.length} team member${context.teamMembers.length > 1 ? 's' : ''}`);
    }

    if (parts.length === 0) {
      return 'No relevant context found';
    }

    const summary = `Found ${parts.join(', ')}`;
    const confidenceText = `(${(context.confidence * 100).toFixed(0)}% confidence)`;
    
    return `${summary} ${confidenceText}`;
  }

  /**
   * Generate suggested actions based on resolved context
   */
  generateSuggestedActions(command: ContextAwareCommand): Array<{action: string; description: string; confidence: number}> {
    const actions: Array<{action: string; description: string; confidence: number}> = [];
    const { intent, context, entities } = command;

    switch (intent) {
      case 'CREATE_INVOICE':
        if (context.customers.length === 1 && context.tasks.length > 0) {
          const customer = context.customers[0];
          const unbilledTasks = context.tasks.filter(task => task.status === 'completed');
          
          if (unbilledTasks.length > 0) {
            const totalHours = unbilledTasks.reduce((sum, task) => sum + (task.actual_hours || 0), 0);
            actions.push({
              action: 'create_invoice',
              description: `Create invoice for ${customer.display_name} with ${unbilledTasks.length} completed tasks (${totalHours} hours)`,
              confidence: 0.9
            });
          }
        }
        break;

      case 'UPDATE_STATUS':
        if (context.projects.length === 1) {
          const project = context.projects[0];
          actions.push({
            action: 'update_project_status',
            description: `Update status for project "${project.name}" (currently ${project.status})`,
            confidence: 0.85
          });
        }
        
        if (context.tasks.length > 0) {
          actions.push({
            action: 'update_task_status',
            description: `Update status for ${context.tasks.length} task${context.tasks.length > 1 ? 's' : ''}`,
            confidence: 0.8
          });
        }
        break;

      case 'ASSIGN_TASK':
        if (context.tasks.length > 0 && context.teamMembers.length > 0) {
          const assignee = context.teamMembers[0];
          actions.push({
            action: 'assign_tasks',
            description: `Assign ${context.tasks.length} task${context.tasks.length > 1 ? 's' : ''} to ${assignee.full_name}`,
            confidence: 0.85
          });
        }
        break;
    }

    return actions;
  }
}

// Export singleton instance
export const contextMiddleware = ContextResolutionMiddleware.getInstance();