import apiClient from '../api/client';
import { Customer, Project, Task, ProjectInvoice, Proposal, TeamMember } from '../types';

// Context resolution types
export interface ResolvedContext {
  customers: Customer[];
  projects: Project[];
  tasks: Task[];
  invoices: ProjectInvoice[];
  proposals: Proposal[];
  teamMembers: TeamMember[];
  confidence: number; // 0-1 score of how confident we are in the resolution
  suggestions: string[]; // Alternative interpretations if confidence is low
}

export interface ContextQuery {
  text: string;
  entityType?: 'customer' | 'project' | 'task' | 'invoice' | 'proposal' | 'team' | 'all';
  limit?: number;
}

// Entity extraction patterns
const ENTITY_PATTERNS = {
  customer: [
    /(?:customer|client|for)\s+([a-zA-Z0-9\s&\-\.]+?)(?:\s|$|,|\.|!|\?)/gi,
    /(?:invoice|bill)\s+(?:for\s+)?([a-zA-Z0-9\s&\-\.]+?)(?:\s|$|,|\.|!|\?)/gi,
    /^([a-zA-Z0-9\s&\-\.]{2,30})$/gi // Fallback for simple names
  ],
  project: [
    /(?:project|proj)\s+([a-zA-Z0-9\s&\-\.]+?)(?:\s|$|,|\.|!|\?)/gi,
    /(?:update|status|for)\s+([a-zA-Z0-9\s&\-\.]+?)(?:\s|$|,|\.|!|\?)/gi
  ],
  task: [
    /(?:task|todo)\s+([a-zA-Z0-9\s&\-\.]+?)(?:\s|$|,|\.|!|\?)/gi,
    /(?:assign|reassign)\s+([a-zA-Z0-9\s&\-\.]+?)(?:\s|$|,|\.|!|\?)/gi
  ],
  invoice: [
    /(?:invoice|inv)\s+(?:#)?([a-zA-Z0-9\-]+?)(?:\s|$|,|\.|!|\?)/gi,
    /(?:invoice|bill)\s+(?:number\s+)?([a-zA-Z0-9\-]+?)(?:\s|$|,|\.|!|\?)/gi
  ],
  team: [
    /(?:assign|reassign)\s+(?:to\s+)?@?([a-zA-Z0-9\s\-\.]+?)(?:\s|$|,|\.|!|\?)/gi,
    /@([a-zA-Z0-9\s\-\.]+?)(?:\s|$|,|\.|!|\?)/gi
  ]
};

// Command intent classification
const COMMAND_INTENTS = {
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
  ]
};

export class ContextResolutionService {
  private static instance: ContextResolutionService;
  private cache: Map<string, { result: ResolvedContext; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static getInstance(): ContextResolutionService {
    if (!ContextResolutionService.instance) {
      ContextResolutionService.instance = new ContextResolutionService();
    }
    return ContextResolutionService.instance;
  }

  /**
   * Main entry point for context resolution
   */
  async resolveContext(query: ContextQuery): Promise<ResolvedContext> {
    const cacheKey = `${query.text}_${query.entityType || 'all'}_${query.limit || 10}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result;
    }

    try {
      const context = await this.performContextResolution(query);
      
      // Cache result
      this.cache.set(cacheKey, {
        result: context,
        timestamp: Date.now()
      });

      return context;
    } catch (error) {
      console.error('Context resolution failed:', error);
      return this.createEmptyContext();
    }
  }

  /**
   * Analyze user input and resolve context automatically
   */
  private async performContextResolution(query: ContextQuery): Promise<ResolvedContext> {
    const { text, entityType = 'all', limit = 10 } = query;
    
    // Extract entities from text
    const extractedEntities = this.extractEntities(text);
    
    // Determine command intent
    const intent = this.classifyIntent(text);
    
    // Fetch relevant data based on extracted entities and intent
    const contextData = await this.fetchContextData(extractedEntities, intent, entityType, limit);
    
    // Calculate confidence score
    const confidence = this.calculateConfidence(extractedEntities, contextData, intent);
    
    // Generate suggestions for low confidence scenarios
    const suggestions = confidence < 0.7 ? this.generateSuggestions(extractedEntities, intent) : [];

    return {
      ...contextData,
      confidence,
      suggestions
    };
  }

  /**
   * Extract entity references from user text
   */
  private extractEntities(text: string): Record<string, string[]> {
    const entities: Record<string, string[]> = {
      customer: [],
      project: [],
      task: [],
      invoice: [],
      team: []
    };

    Object.entries(ENTITY_PATTERNS).forEach(([entityType, patterns]) => {
      patterns.forEach(pattern => {
        let match;
        const regex = new RegExp(pattern);
        while ((match = regex.exec(text)) !== null) {
          const entity = match[1]?.trim();
          if (entity && entity.length > 1 && entity.length < 100) {
            entities[entityType].push(entity);
          }
        }
      });
    });

    return entities;
  }

  /**
   * Classify the intent of the user command
   */
  private classifyIntent(text: string): string {
    for (const [intent, patterns] of Object.entries(COMMAND_INTENTS)) {
      if (patterns.some(pattern => pattern.test(text))) {
        return intent;
      }
    }
    return 'GENERAL';
  }

  /**
   * Fetch relevant context data from the API
   */
  private async fetchContextData(
    entities: Record<string, string[]>,
    intent: string,
    entityType: string,
    limit: number
  ): Promise<Omit<ResolvedContext, 'confidence' | 'suggestions'>> {
    const context: Omit<ResolvedContext, 'confidence' | 'suggestions'> = {
      customers: [],
      projects: [],
      tasks: [],
      invoices: [],
      proposals: [],
      teamMembers: []
    };

    // Determine search priority based on intent
    const searchOrder = this.getSearchOrder(intent, entityType);

    for (const searchType of searchOrder) {
      const searchTerms = entities[searchType] || [];
      if (searchTerms.length === 0 && entityType !== 'all') continue;

      try {
        switch (searchType) {
          case 'customer':
            context.customers = await this.searchCustomers(searchTerms, limit);
            break;
          case 'project':
            context.projects = await this.searchProjects(searchTerms, limit);
            break;
          case 'task':
            context.tasks = await this.searchTasks(searchTerms, limit);
            break;
          case 'invoice':
            context.invoices = await this.searchInvoices(searchTerms, limit);
            break;
          case 'team':
            context.teamMembers = await this.searchTeamMembers(searchTerms, limit);
            break;
        }
      } catch (error) {
        console.warn(`Failed to search ${searchType}:`, error);
      }
    }

    // Cross-reference related data
    await this.enrichWithRelatedData(context);

    return context;
  }

  /**
   * Determine search order based on intent and entity type
   */
  private getSearchOrder(intent: string, entityType: string): string[] {
    if (entityType !== 'all') {
      return [entityType];
    }

    switch (intent) {
      case 'CREATE_INVOICE':
        return ['customer', 'project', 'task'];
      case 'UPDATE_STATUS':
        return ['project', 'task'];
      case 'ASSIGN_TASK':
        return ['task', 'team', 'project'];
      case 'SHOW_OVERDUE':
        return ['task', 'project', 'invoice'];
      default:
        return ['customer', 'project', 'task', 'invoice', 'team'];
    }
  }

  /**
   * Search customers by name or partial match
   */
  private async searchCustomers(searchTerms: string[], limit: number): Promise<Customer[]> {
    if (searchTerms.length === 0) return [];

    const results: Customer[] = [];
    
    for (const term of searchTerms.slice(0, 3)) { // Limit search terms to avoid too many requests
      try {
        const response = await apiClient.get('/customers/', {
          params: { 
            page: 1, 
            size: limit, 
            search: term 
          }
        });
        
        const customers = response?.data?.customers || [];
        results.push(...customers);
      } catch (error) {
        console.warn(`Failed to search customers for term "${term}":`, error);
      }
    }

    // Remove duplicates and limit results
    const uniqueCustomers = results.reduce((acc: Customer[], customer) => {
      if (!acc.some(c => c.id === customer.id)) {
        acc.push(customer);
      }
      return acc;
    }, []);

    return uniqueCustomers.slice(0, limit);
  }

  /**
   * Search projects by name or partial match
   */
  private async searchProjects(searchTerms: string[], limit: number): Promise<Project[]> {
    if (searchTerms.length === 0) return [];

    const results: Project[] = [];
    
    for (const term of searchTerms.slice(0, 3)) {
      try {
        const response = await apiClient.get('/projects/', {
          params: { 
            page: 1, 
            size: limit, 
            q: term 
          }
        });
        
        const projects = Array.isArray(response?.data) ? response.data : [];
        results.push(...projects);
      } catch (error) {
        console.warn(`Failed to search projects for term "${term}":`, error);
      }
    }

    const uniqueProjects = results.reduce((acc: Project[], project) => {
      if (!acc.some(p => p.id === project.id)) {
        acc.push(project);
      }
      return acc;
    }, []);

    return uniqueProjects.slice(0, limit);
  }

  /**
   * Search tasks by title or partial match
   */
  private async searchTasks(searchTerms: string[], limit: number): Promise<Task[]> {
    if (searchTerms.length === 0) return [];

    const results: Task[] = [];
    
    for (const term of searchTerms.slice(0, 3)) {
      try {
        const response = await apiClient.get('/tasks/', {
          params: { 
            page: 1, 
            size: limit, 
            search: term 
          }
        });
        
        const tasks = Array.isArray(response?.data) ? response.data : [];
        results.push(...tasks);
      } catch (error) {
        console.warn(`Failed to search tasks for term "${term}":`, error);
      }
    }

    const uniqueTasks = results.reduce((acc: Task[], task) => {
      if (!acc.some(t => t.id === task.id)) {
        acc.push(task);
      }
      return acc;
    }, []);

    return uniqueTasks.slice(0, limit);
  }

  /**
   * Search invoices by number or customer
   */
  private async searchInvoices(searchTerms: string[], limit: number): Promise<ProjectInvoice[]> {
    if (searchTerms.length === 0) return [];

    const results: ProjectInvoice[] = [];
    
    for (const term of searchTerms.slice(0, 3)) {
      try {
        const response = await apiClient.get('/invoices/', {
          params: { 
            page: 1, 
            size: limit, 
            search: term 
          }
        });
        
        const invoices = response?.data?.invoices || [];
        results.push(...invoices);
      } catch (error) {
        console.warn(`Failed to search invoices for term "${term}":`, error);
      }
    }

    const uniqueInvoices = results.reduce((acc: ProjectInvoice[], invoice) => {
      if (!acc.some(i => i.id === invoice.id)) {
        acc.push(invoice);
      }
      return acc;
    }, []);

    return uniqueInvoices.slice(0, limit);
  }

  /**
   * Search team members by name or username
   */
  private async searchTeamMembers(searchTerms: string[], limit: number): Promise<TeamMember[]> {
    if (searchTerms.length === 0) return [];

    const results: TeamMember[] = [];
    
    for (const term of searchTerms.slice(0, 3)) {
      try {
        const response = await apiClient.get('/teams/members', {
          params: { 
            page: 1, 
            size: limit, 
            search: term 
          }
        });
        
        const members = Array.isArray(response?.data) ? response.data : [];
        results.push(...members);
      } catch (error) {
        console.warn(`Failed to search team members for term "${term}":`, error);
      }
    }

    const uniqueMembers = results.reduce((acc: TeamMember[], member) => {
      if (!acc.some(m => m.id === member.id)) {
        acc.push(member);
      }
      return acc;
    }, []);

    return uniqueMembers.slice(0, limit);
  }

  /**
   * Enrich context with related data (e.g., if we found a customer, get their projects)
   */
  private async enrichWithRelatedData(context: Omit<ResolvedContext, 'confidence' | 'suggestions'>): Promise<void> {
    // If we found customers, get their related projects and invoices
    if (context.customers.length > 0) {
      for (const customer of context.customers.slice(0, 2)) { // Limit to avoid too many requests
        try {
          // Get customer's projects
          const projectsResponse = await apiClient.get('/projects/', {
            params: { customer_id: customer.id, page: 1, size: 10 }
          });
          const customerProjects = Array.isArray(projectsResponse?.data) ? projectsResponse.data : [];
          
          // Add projects that aren't already in the context
          customerProjects.forEach(project => {
            if (!context.projects.some(p => p.id === project.id)) {
              context.projects.push(project);
            }
          });

          // Get customer's unbilled work for invoice context
          const tasksResponse = await apiClient.get('/tasks/', {
            params: { 
              customer_id: customer.id, 
              status: 'completed',
              invoiced: false,
              page: 1, 
              size: 20 
            }
          });
          const unbilledTasks = Array.isArray(tasksResponse?.data) ? tasksResponse.data : [];
          
          unbilledTasks.forEach(task => {
            if (!context.tasks.some(t => t.id === task.id)) {
              context.tasks.push(task);
            }
          });

        } catch (error) {
          console.warn(`Failed to enrich data for customer ${customer.id}:`, error);
        }
      }
    }

    // If we found projects, get their tasks
    if (context.projects.length > 0) {
      for (const project of context.projects.slice(0, 3)) {
        try {
          const tasksResponse = await apiClient.get('/tasks/', {
            params: { project_id: project.id, page: 1, size: 20 }
          });
          const projectTasks = Array.isArray(tasksResponse?.data) ? tasksResponse.data : [];
          
          projectTasks.forEach(task => {
            if (!context.tasks.some(t => t.id === task.id)) {
              context.tasks.push(task);
            }
          });
        } catch (error) {
          console.warn(`Failed to enrich data for project ${project.id}:`, error);
        }
      }
    }
  }

  /**
   * Calculate confidence score based on found entities and context
   */
  private calculateConfidence(
    entities: Record<string, string[]>, 
    context: Omit<ResolvedContext, 'confidence' | 'suggestions'>,
    intent: string
  ): number {
    let confidence = 0.5; // Base confidence

    // Boost confidence if we found exact matches
    const totalEntities = Object.values(entities).flat().length;
    const totalResults = Object.values(context).flat().length;

    if (totalEntities > 0 && totalResults > 0) {
      confidence += 0.3;
    }

    // Intent-specific confidence adjustments
    switch (intent) {
      case 'CREATE_INVOICE':
        if (context.customers.length > 0) confidence += 0.2;
        if (context.tasks.length > 0) confidence += 0.1;
        if (context.projects.length > 0) confidence += 0.1;
        break;
      case 'UPDATE_STATUS':
        if (context.projects.length > 0 || context.tasks.length > 0) confidence += 0.3;
        break;
      case 'ASSIGN_TASK':
        if (context.tasks.length > 0 && context.teamMembers.length > 0) confidence += 0.3;
        break;
    }

    // Penalty for too many results (ambiguous)
    if (totalResults > 10) {
      confidence -= 0.2;
    }

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Generate suggestions for improving low confidence queries
   */
  private generateSuggestions(entities: Record<string, string[]>, intent: string): string[] {
    const suggestions: string[] = [];

    if (intent === 'CREATE_INVOICE') {
      if (entities.customer.length === 0) {
        suggestions.push('Try specifying the customer name more clearly (e.g., "Create invoice for Acme Corp")');
      }
    }

    if (intent === 'UPDATE_STATUS') {
      if (entities.project.length === 0 && entities.task.length === 0) {
        suggestions.push('Please specify which project or task to update (e.g., "Update Project Alpha status")');
      }
    }

    if (Object.values(entities).flat().length === 0) {
      suggestions.push('Try being more specific with names or IDs');
      suggestions.push('Use @ mentions for team members (e.g., @john)');
    }

    return suggestions;
  }

  /**
   * Create empty context for error cases
   */
  private createEmptyContext(): ResolvedContext {
    return {
      customers: [],
      projects: [],
      tasks: [],
      invoices: [],
      proposals: [],
      teamMembers: [],
      confidence: 0,
      suggestions: ['Unable to resolve context. Please try being more specific.']
    };
  }

  /**
   * Clear cache (useful for testing or when data changes)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const contextResolutionService = ContextResolutionService.getInstance();