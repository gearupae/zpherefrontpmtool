export interface CustomerDetails {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  customerSince?: string; // ISO date
}

export interface ProjectStats {
  total: number;
  active: number;
  completed: number;
  cancelled: number;
  trend?: {
    direction: 'up' | 'down' | 'flat';
    percent?: number; // 0-100
  };
  percentOfAll?: number; // optional: percentage of all org projects
}

export interface FinancialOverview {
  totalRevenue: number; // cents
  pendingInvoices: number;
  pendingAmount: number; // cents
  overdueInvoices: number;
  overdueAmount: number; // cents
  nextDueDate?: string; // ISO date
}

export interface ProposalHistory {
  total: number;
  accepted: number;
  pending: number;
  rejected: number;
  acceptanceRate?: number; // 0-100
  latestDate?: string; // ISO date
  avgResponseTime?: string; // human readable, e.g., "2d 4h"
}

export interface ProposalCustomerInsights {
  customer: CustomerDetails;
  projects: ProjectStats;
  financial: FinancialOverview;
  proposals: ProposalHistory;
}