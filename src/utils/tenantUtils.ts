/**
 * Utility functions for multi-tenant operations
 */

export interface TenantContext {
  tenantId: string | null;
  tenantSlug: string | null;
  tenantType: 'admin' | 'tenant' | null;
  isAdmin: boolean;
  isTenant: boolean;
}

/**
 * Detect tenant context from current URL, user role, and user organization
 */
export function detectTenantContext(userRole?: string, userOrganization?: any): TenantContext {
  const host = window.location.hostname;
  const path = window.location.pathname;
  
  // Pattern 1: Subdomain-based routing (tenant-slug.domain.com)
  const subdomain = extractSubdomain(host);
  
  if (subdomain === 'admin') {
    return {
      tenantId: 'admin',
      tenantSlug: 'admin', 
      tenantType: 'admin',
      isAdmin: true,
      isTenant: false
    };
  }
  
  if (subdomain && subdomain !== 'www') {
    return {
      tenantId: subdomain, // Will be resolved to actual ID by backend
      tenantSlug: subdomain,
      tenantType: 'tenant',
      isAdmin: false,
      isTenant: true
    };
  }
  
  // Pattern 2: Path-based routing (domain.com/admin)
  if (path.startsWith('/admin')) {
    return {
      tenantId: 'admin',
      tenantSlug: 'admin',
      tenantType: 'admin', 
      isAdmin: true,
      isTenant: false
    };
  }

  // Pattern 3: Path-based tenant slug detection (domain.com/:tenant-slug/<section>)
  // Support multiple tenant sections, not just /dashboard
  const pathParts = path.split('/').filter(part => part);
  const tenantSections = new Set([
    'dashboard', 'projects', 'tasks', 'teams', 'customers', 'proposals',
    'invoices', 'analytics', 'ai', 'settings', 'collaboration', 'views',
    'knowledge', 'purchase', 'goals', 'vendors', 'orders'
  ]);
  if (pathParts.length >= 2 && tenantSections.has(pathParts[1])) {
    const tenantSlug = pathParts[0];
    // Treat special admin slug as admin context for path-based routing
    if (tenantSlug === 'zphere-admin') {
      return {
        tenantId: 'admin',
        tenantSlug: tenantSlug,
        tenantType: 'admin',
        isAdmin: true,
        isTenant: false,
      };
    }
    return {
      tenantId: tenantSlug, // Will be resolved to actual ID by backend
      tenantSlug: tenantSlug,
      tenantType: 'tenant',
      isAdmin: false,
      isTenant: true
    };
  }

  // Pattern 4: User role-based detection (for platform admins only)
  if (userRole === 'ADMIN' || userRole === 'admin' || userRole === 'SUPER_ADMIN') {
    // Check if user has an organization - if yes, they're an organization admin (tenant context)
    // If no organization, they're a platform admin (admin context)
    if (userOrganization) {
      // Special-case: if the org slug is the admin slug, treat as admin namespace
      if (userOrganization.slug === 'zphere-admin') {
        return {
          tenantId: 'admin',
          tenantSlug: userOrganization.slug,
          tenantType: 'admin',
          isAdmin: true,
          isTenant: false,
        };
      }
      // Organization admin - use tenant context
      return {
        tenantId: userOrganization.id || userOrganization.organization_id,
        tenantSlug: userOrganization.slug,
        tenantType: 'tenant',
        isAdmin: false,
        isTenant: true
      };
    } else {
      // Platform admin - use admin context
      return {
        tenantId: 'admin',
        tenantSlug: 'admin',
        tenantType: 'admin',
        isAdmin: true,
        isTenant: false
      };
    }
  }
  
  // Pattern 5: User organization-based detection
  if (userOrganization) {
    return {
      tenantId: userOrganization.id || userOrganization.organization_id,
      tenantSlug: userOrganization.slug,
      tenantType: 'tenant',
      isAdmin: false,
      isTenant: true
    };
  }
  
  // Default to tenant context (for backward compatibility)
  return {
    tenantId: null,
    tenantSlug: null,
    tenantType: 'tenant',
    isAdmin: false,
    isTenant: true
  };
}

/**
 * Extract subdomain from hostname
 */
function extractSubdomain(host: string): string | null {
  if (!host) return null;
  
  // Remove port if present
  const cleanHost = host.split(':')[0];
  
  // Split by dots
  const parts = cleanHost.split('.');
  
  // Need at least 3 parts for a subdomain (subdomain.domain.com)
  if (parts.length >= 3) {
    return parts[0];
  }
  
  // localhost or single domain
  return null;
}

/**
 * Get the appropriate API base URL for current tenant context
 */
export function getApiBaseUrl(): string {
  // In development, use relative URLs to avoid CORS issues
  if (process.env.NODE_ENV === 'development') {
    return '/api/v1';
  }
  
  // In production, use the configured API URL
  const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  return `${baseUrl}/api/v1`;
}

/**
 * Get tenant-specific route URL
 */
export function getTenantRoute(path: string, userRole?: string, userOrganization?: any): string {
  const tenantContext = detectTenantContext(userRole, userOrganization);

  // Platform admin stays in admin namespace
  if (tenantContext.isAdmin && !userOrganization) {
    return `/admin${path.startsWith('/') ? path : `/${path}`}`;
  }

  // Tenant context: prefix slug if available and not already prefixed
  const slug = userOrganization?.slug || getTenantSlugFromStorage();
  if (slug) {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    // Avoid double-prefix if already like /{slug}/...
    if (cleanPath.startsWith(`/${slug}/`) || cleanPath === `/${slug}`) {
      return cleanPath;
    }
    return `/${slug}${cleanPath}`;
  }

  // Fallback: legacy path
  return path.startsWith('/') ? path : `/${path}`;
}

// Helper to read slug from localStorage user payload
function getTenantSlugFromStorage(): string | null {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    const user = JSON.parse(userStr);
    return user?.organization?.slug || null;
  } catch {
    return null;
  }
}

/**
 * Check if current context allows access to admin features
 */
export function canAccessAdminFeatures(userRole?: string, userOrganization?: any): boolean {
  const tenantContext = detectTenantContext(userRole, userOrganization);
  return tenantContext.isAdmin;
}

/**
 * Check if current context allows access to tenant features  
 */
export function canAccessTenantFeatures(userRole?: string, userOrganization?: any): boolean {
  const tenantContext = detectTenantContext(userRole, userOrganization);
  return tenantContext.isTenant;
}

/**
 * Redirect to appropriate dashboard based on user role and context
 */
export function redirectToAppropriateContext(userRole: string, userOrganization?: any): void {
  const tenantContext = detectTenantContext(userRole, userOrganization);
  const isPlatformAdmin = (userRole === 'ADMIN' || userRole === 'admin' || userRole === 'SUPER_ADMIN' || userRole === 'platform_admin') && !userOrganization;

  // Platform admin should be in admin context
  if (isPlatformAdmin) {
    if (!tenantContext.isAdmin) {
      window.location.href = getAdminUrl();
    }
    return;
  }

  // All others (including organization admins) should be in tenant context
  if (tenantContext.isAdmin) {
    window.location.href = getTenantUrl();
  }
}

/**
 * Get admin dashboard URL
 */
function getAdminUrl(): string {
  const host = window.location.hostname;
  const subdomain = extractSubdomain(host);
  
  if (subdomain) {
    // Use admin subdomain
    const domain = host.split('.').slice(1).join('.');
    return `${window.location.protocol}//admin.${domain}`;
  }
  
  // Use path-based routing
  return '/admin';
}

/**
 * Get tenant dashboard URL  
 */
function getTenantUrl(): string {
  const host = window.location.hostname;
  const subdomain = extractSubdomain(host);

  // If we're on admin subdomain, strip it
  if (subdomain === 'admin') {
    const domain = host.split('.').slice(1).join('.');
    return `${window.location.protocol}//${domain}`;
  }

  // Prefer user organization slug if available in localStorage
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      const slug = user?.organization?.slug;
      if (slug) {
        return `/${slug}/dashboard`;
      }
    }
  } catch {}

  // Fallback
  return '/dashboard';
}

/**
 * Add tenant context headers to API requests
 */
export function addTenantHeaders(headers: Record<string, string> = {}, userRole?: string, userOrganization?: any): Record<string, string> {
  const tenantContext = detectTenantContext(userRole, userOrganization);

  // Prefer authoritative IDs from the authenticated user when available
  const effectiveSlug = (userOrganization?.slug) || tenantContext.tenantSlug || '';
  const effectiveId = (userOrganization?.id || userOrganization?.organization_id) || tenantContext.tenantId || '';
  const effectiveType = tenantContext.tenantType || 'tenant';

  return {
    ...headers,
    'X-Tenant-Type': effectiveType,
    'X-Tenant-Slug': effectiveSlug,
    'X-Tenant-Id': effectiveId,
  };
}

