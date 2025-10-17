# Intelligent Context Resolution System

## Overview

The intelligent context resolution system automatically analyzes user input and fetches relevant data from the database to provide context-aware suggestions before executing AI commands.

## How It Works

### 1. **Context Resolution Service** (`contextResolutionService.ts`)

Automatically searches for:
- **Customers** by name, company, or email
- **Projects** by name or description  
- **Tasks** by title or content
- **Invoices** by number or customer
- **Team Members** by name or username

### 2. **Context Middleware** (`contextMiddleware.ts`)

Intercepts AI commands and:
- Classifies user intent (CREATE_INVOICE, UPDATE_STATUS, etc.)
- Enriches prompts with relevant context
- Generates suggested parameters
- Calculates confidence scores

### 3. **Context Preview Component** (`ContextPreview.tsx`)

Shows users:
- Found entities with confidence scores
- Suggested actions based on context
- Ability to refine selections before execution

## Example Usage Scenarios

### Example 1: "Create invoice for ADDC"

**What happens internally:**

```typescript
// 1. Context Resolution
const context = await contextResolutionService.resolveContext({
  text: "Create invoice for ADDC",
  limit: 10
});

// Results:
{
  customers: [
    {
      id: "456",
      display_name: "Abu Dhabi Distribution Company",
      company_name: "ADDC",
      email: "accounts@addc.ae",
      payment_terms: "NET 30",
      due_amount: 0,
      projects_count: 2
    }
  ],
  projects: [
    {
      id: "1234", 
      name: "Power Grid Upgrade",
      status: "active",
      customer_id: "456"
    },
    {
      id: "1567",
      name: "Network Maintenance", 
      status: "active",
      customer_id: "456"
    }
  ],
  tasks: [
    // 23 completed, unbilled tasks from Power Grid project
    // 12 completed, unbilled tasks from Network Maintenance
  ],
  confidence: 0.95,
  suggestions: []
}
```

**User sees:**
- Context preview showing ADDC customer details
- Two related projects 
- 35 unbilled completed tasks
- Suggested invoice total: $73,000
- "Create Invoice" button with 95% confidence

### Example 2: "Update Project Alpha status to completed"

**Context Resolution:**
```typescript
{
  projects: [
    {
      id: "789",
      name: "Project Alpha - Mobile App",
      status: "active",
      priority: "high"
    }
  ],
  tasks: [
    // Related tasks in the project
  ],
  confidence: 0.87,
  intent: "UPDATE_STATUS"
}
```

**User sees:**
- Project Alpha details
- Current status: "active" 
- Suggested target status: "completed"
- Related tasks that will be affected

### Example 3: "Assign overdue tasks to @john"

**Context Resolution:**
```typescript
{
  tasks: [
    // All overdue tasks found
  ],
  teamMembers: [
    {
      id: "user123",
      username: "john",
      full_name: "John Smith", 
      role: "MEMBER"
    }
  ],
  confidence: 0.92,
  intent: "ASSIGN_TASK"
}
```

**User sees:**
- List of overdue tasks
- John Smith's profile
- Confirmation to assign X tasks to John

## Configuration Options

### Enable/Disable Smart Context

```typescript
// In PAIWorkspace
const [enableSmartContext, setEnableSmartContext] = useState(true);
```

Users can toggle context resolution on/off via the sidebar control.

### Confidence Thresholds

- **High Confidence (≥80%)**: Auto-show context preview
- **Medium Confidence (50-79%)**: Show preview with warnings  
- **Low Confidence (<50%)**: Show suggestions, continue with normal processing
- **Very Low Confidence (<30%)**: Block execution, require refinement

### Entity Search Patterns

The system uses regex patterns to extract entities:

```typescript
const ENTITY_PATTERNS = {
  customer: [
    /(?:customer|client|for)\\s+([a-zA-Z0-9\\s&\\-\\.]+?)(?:\\s|$|,|\\.|!|\\?)/gi,
    /(?:invoice|bill)\\s+(?:for\\s+)?([a-zA-Z0-9\\s&\\-\\.]+?)(?:\\s|$|,|\\.|!|\\?)/gi
  ],
  project: [
    /(?:project|proj)\\s+([a-zA-Z0-9\\s&\\-\\.]+?)(?:\\s|$|,|\\.|!|\\?)/gi
  ]
  // ... more patterns
};
```

## API Integration

### Required Endpoints

The context resolution system expects these API endpoints:

- `GET /customers/?search={term}` - Search customers
- `GET /projects/?q={term}` - Search projects  
- `GET /tasks/?search={term}` - Search tasks
- `GET /invoices/?search={term}` - Search invoices
- `GET /teams/members?search={term}` - Search team members

### Cross-Reference Queries

When a customer is found, the system automatically fetches:
- Customer's projects: `GET /projects/?customer_id={id}`
- Customer's unbilled tasks: `GET /tasks/?customer_id={id}&status=completed&invoiced=false`

## Performance Optimizations

### Caching
- 5-minute cache for context resolution results
- Prevents redundant API calls for similar queries

### Request Limiting
- Max 3 search terms per entity type
- Max 10 results per search
- Max 2 customers for cross-reference enrichment

### Parallel Processing
- Multiple entity searches run concurrently
- Non-blocking context enrichment

## Testing the System

### Manual Testing Examples

Try these commands in the PAI workspace:

1. **Invoice Creation:**
   - "Create invoice for ADDC"
   - "Generate invoice for John Smith" 
   - "Bill Acme Corp for completed work"

2. **Status Updates:**
   - "Update Project Alpha status to completed"
   - "Mark Website Redesign as on hold"
   - "Set task XYZ to in progress"

3. **Task Assignment:**
   - "Assign overdue tasks to @john"
   - "Reassign Mobile App tasks to @sarah"
   - "Give Project Alpha tasks to @mike"

### Expected Behavior

- **High confidence**: Context preview modal appears
- **Medium confidence**: Warning message with preview option
- **Low confidence**: Suggestions shown, normal processing continues
- **Parse failures**: Graceful fallback to regular PAI processing

## Error Handling

The system is designed to fail gracefully:

- Network errors → Continue with normal processing
- Parse errors → Log warning, continue without context
- Permission errors → Skip restricted data, continue with available context
- Timeout errors → Use cached results if available

## Extending the System

### Adding New Entity Types

1. Add patterns to `ENTITY_PATTERNS`
2. Create search function in `ContextResolutionService`
3. Add API endpoint handling
4. Update UI rendering in `ContextPreview`

### Adding New Intents

1. Add patterns to `COMMAND_INTENTS`
2. Update parameter suggestion logic
3. Add handling in PAI workspace
4. Update confidence calculation

### Custom Context Enrichment

Override the `enrichWithRelatedData` method to add domain-specific cross-referencing:

```typescript
// Custom enrichment for project context
if (context.projects.length > 0) {
  // Fetch project risks, dependencies, etc.
}
```

## Security Considerations

- All searches respect user permissions
- Sensitive data (financials) hidden based on role
- Context resolution respects tenant boundaries
- No sensitive data stored in cache beyond TTL

## Monitoring and Analytics

Consider adding:
- Context resolution success rates
- User confirmation rates on suggestions  
- Performance metrics for search queries
- Most common entity patterns for optimization