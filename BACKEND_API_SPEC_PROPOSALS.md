# Backend API Specification for Shared Proposals

This document outlines the backend API endpoints needed to support the public proposal sharing feature.

## Required Endpoints

### 1. Generate Public Share Link for Proposal

**Endpoint:** `POST /api/v1/proposals/{proposal_id}/share`

**Description:** Generates a shareable public link for a proposal. Creates a unique share_id that can be used to access the proposal publicly.

**Request:**
- Path parameter: `proposal_id` (UUID)
- Headers: Standard authentication headers

**Response:**
```json
{
  "share_id": "proposal_<uuid>_20250106_213000_<uuid>",
  "public_url": "/shared/proposal/<share_id>",
  "expires_at": null
}
```

**Implementation Notes:**
- Store share_id in the proposals table or a separate shared_links table
- share_id format: `proposal_<org_uuid>_YYYYMMDD_HHMMSS_<random_uuid>`
- Should be idempotent - return existing share_id if already generated
- Track share creation metadata (created_at, created_by)

---

### 2. Get Shared Proposal Data

**Endpoint:** `GET /api/v1/analytics/shared/proposal/{share_id}`

**Description:** Retrieves proposal data for public viewing using the share_id. No authentication required.

**Request:**
- Path parameter: `share_id`
- No authentication required (public endpoint)

**Response:**
```json
{
  "message": "Shared proposal access",
  "share_id": "proposal_<uuid>_20250106_213000_<uuid>",
  "public_access": true,
  "proposal": {
    "id": "<uuid>",
    "title": "Website Redesign Proposal",
    "description": "Complete website redesign project",
    "proposal_number": "PROP-2024-001",
    "status": "sent",
    "proposal_type": "project_based",
    "total_amount": 5000000,
    "currency": "usd",
    "valid_until": "2025-02-01T00:00:00Z",
    "sent_date": "2025-01-06T10:00:00Z",
    "viewed_date": null,
    "responded_date": null,
    "notes": "Additional notes about the proposal",
    "content": {
      "items": [
        {
          "item_id": "<uuid>",
          "name": "Web Development",
          "description": "Full stack development",
          "quantity": 40,
          "unit_price": 10000,
          "total": 400000,
          "unit": "hours",
          "tax_rate": 1000,
          "discount_rate": 500,
          "item": {
            "name": "Web Development",
            "description": "Development services"
          }
        }
      ],
      "sections": [
        {
          "title": "Project Overview",
          "content": "Overview content here..."
        },
        {
          "title": "Scope of Work",
          "content": "Scope details here..."
        }
      ]
    },
    "created_at": "2025-01-01T10:00:00Z",
    "updated_at": "2025-01-06T10:00:00Z"
  },
  "customer": {
    "id": "<uuid>",
    "display_name": "John Doe",
    "company_name": "Acme Corp",
    "email": "john@acme.com"
  },
  "organization": {
    "name": "Your Company Name"
  },
  "proposal_comments": [
    {
      "id": "<uuid>",
      "content": "This looks great!",
      "author_name": "Client User",
      "is_public": true,
      "created_at": "2025-01-06T12:00:00Z"
    }
  ],
  "metrics": {
    "proposals_total": 15,
    "proposals_accepted": 8,
    "invoices_total": 12,
    "invoices_pending": 3,
    "projects_total": 10
  },
  "generated_at": "2025-01-06T21:30:00Z"
}
```

**Implementation Notes:**
- Validate share_id exists and is active
- Only return public-safe data (no sensitive internal information)
- Include customer metrics for context
- Track view event (viewed_date) on first access
- Consider caching for performance

---

### 3. Add Comment to Shared Proposal

**Endpoint:** `POST /api/v1/analytics/shared/proposal/{share_id}/comments`

**Description:** Allows public users to add comments to a shared proposal. No authentication required.

**Request:**
- Path parameter: `share_id`
- Body:
```json
{
  "content": "This proposal looks excellent. When can we start?",
  "name": "John Smith",
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "id": "<uuid>",
  "content": "This proposal looks excellent. When can we start?",
  "author_name": "John Smith",
  "is_public": true,
  "created_at": "2025-01-06T21:35:00Z"
}
```

**Implementation Notes:**
- Store comments in a proposal_comments table
- Mark comments as `is_public: true` to distinguish from internal comments
- Validate share_id exists and is active
- Optional: Rate limiting to prevent spam
- Optional: Email notification to proposal owner
- Name and email are optional but recommended for follow-up

---

### 4. Get Proposal Overview Metrics

**Endpoint:** `GET /api/v1/proposals/{proposal_id}/overview`

**Description:** Returns comprehensive overview data for a proposal including customer metrics. Used in the proposal detail page.

**Request:**
- Path parameter: `proposal_id` (UUID)
- Headers: Standard authentication headers

**Response:**
```json
{
  "metrics": {
    "proposals_total": 15,
    "proposals_draft": 2,
    "proposals_sent": 5,
    "proposals_viewed": 3,
    "proposals_accepted": 8,
    "proposals_rejected": 2,
    "proposals_expired": 1,
    "invoices_total": 12,
    "invoices_pending": 3,
    "invoices_overdue": 1,
    "invoices_paid": 8,
    "invoices_outstanding_amount": 250000,
    "projects_total": 10,
    "projects_active": 7
  },
  "customer": {
    "id": "<uuid>",
    "display_name": "John Doe",
    "company_name": "Acme Corp",
    "email": "john@acme.com"
  },
  "share_id": "proposal_<uuid>_20250106_213000_<uuid>"
}
```

**Implementation Notes:**
- Calculate metrics for the customer associated with the proposal
- Include existing share_id if one has been generated
- All counts should be scoped to the customer's organization context

---

## Database Changes

### Proposals Table Updates
Add column if not exists:
```sql
ALTER TABLE proposals ADD COLUMN share_id VARCHAR(255) UNIQUE;
ALTER TABLE proposals ADD COLUMN share_created_at TIMESTAMP;
ALTER TABLE proposals ADD COLUMN share_created_by UUID REFERENCES users(id);
```

### Proposal Comments Table
Create if not exists:
```sql
CREATE TABLE proposal_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_name VARCHAR(255),
    author_email VARCHAR(255),
    author_user_id UUID REFERENCES users(id),
    is_public BOOLEAN DEFAULT false,
    share_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_proposal_comments_proposal ON proposal_comments(proposal_id);
CREATE INDEX idx_proposal_comments_share ON proposal_comments(share_id);
```

---

## Security Considerations

1. **Share ID Validation:** Always validate share_id exists before returning data
2. **Data Sanitization:** Filter out sensitive internal data in public responses
3. **Rate Limiting:** Implement rate limiting on comment endpoints to prevent abuse
4. **XSS Protection:** Sanitize user-submitted content (comments) before storing
5. **CORS:** Ensure CORS is configured for public endpoints if accessed from external domains
6. **Expiration:** Consider adding optional expiration dates for share links

---

## Frontend Implementation Complete

The following frontend components have been implemented:

1. **SharedProposalPage** (`src/pages/Public/SharedProposalPage.tsx`)
   - Clean public-facing proposal view
   - Displays proposal details, items, and pricing
   - Customer information sidebar
   - Public commenting system
   - Timeline of proposal events
   - Short link generation and copying

2. **ProposalDetailOverviewPage** (Enhanced)
   - Redesigned header matching project detail page style
   - Key metrics cards (Total Amount, Status, Type, Valid Until)
   - Enhanced customer sidebar with activity metrics
   - Public link generation and management
   - Improved visual hierarchy and information density

3. **Route Configuration**
   - `/shared/proposal/:shareId` - Public proposal view
   - `/pr/:vanity` - Short vanity URL redirect (e.g., `/pr/website-redesign-pr-ABC-123-XYZ`)

4. **Utility Functions**
   - `encodeShareIdCompact()` - Supports both project and proposal encoding
   - `decodeShareCodeToShareId()` - Decodes both `p-` and `pr-` prefixed codes
   - `slugify()` - Creates URL-friendly slugs from proposal titles

---

## Testing Checklist

After backend implementation:

- [ ] Generate share link from proposal detail page
- [ ] Copy and access short link (e.g., `/pr/proposal-name-pr-ABC-123-XYZ`)
- [ ] Verify public proposal page loads without authentication
- [ ] Test adding comments from public page
- [ ] Verify comments appear in real-time
- [ ] Check customer metrics display correctly
- [ ] Test responsive design on mobile devices
- [ ] Verify share_id is persisted and reused for same proposal
- [ ] Test vanity URL redirect for proposals
- [ ] Verify timeline events are tracked correctly
