---
project_name: 'tpx-booking-app'
user_name: 'MASTERPAINTER'
date: '2026-01-25'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'quality_rules', 'workflow_rules', 'anti_patterns']
status: 'complete'
rule_count: 47
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.1.1 | UI Framework |
| Vite | 7.0.6 | Build Tool |
| TailwindCSS | 4.1.11 | Styling (Tailwind v4 syntax) |
| Convex | 1.26.1 | Backend/Database |
| Capacitor | 7.4.3 | Mobile Hybrid |
| TypeScript | 5.8.3 | Type Safety |
| React Router | 7.6.1 | Routing |
| shadcn/ui | Latest | UI Components (Tailwind-native) |
| Framer Motion | 12.12.2 | Animations |
| jsPDF | 3.0.1 | PDF Export |
| Resend | 4.5.1 | Email Service |

---

## Critical Implementation Rules

### Language-Specific Rules

**TypeScript/Convex:**
- Use `v.` validators from `convex/values` for all schema definitions
- Always define explicit types for query/mutation args using `args: { ... }`
- Use `ConvexError` from `convex/values` for user-facing errors, not generic throws
- Import server functions: `import { query, mutation, action } from "./_generated/server"`
- Import API for frontend: `import { api } from "../convex/_generated/api"`

**Data Types:**
- **Currency**: Always whole pesos as `v.number()` - NOT decimals or strings (5000 = ₱5,000)
- **Dates**: Unix timestamps in milliseconds as `v.number()` - NOT ISO strings
- **IDs**: Use `v.id("tableName")` - never plain strings for foreign keys
- **Status**: Use `v.union(v.literal("a"), v.literal("b"))` - no open strings

**Naming Conventions:**
| Element | Convention | Example |
|---------|------------|---------|
| Tables | camelCase | `royaltyPayments`, `cashAdvances` |
| Fields | snake_case | `branch_id`, `created_at`, `is_active` |
| Indexes | by_fieldname | `by_branch`, `by_status` |
| Foreign keys | entity_id | `barber_id`, `branch_id` |
| Queries | get* prefix | `getPLSummary`, `getRoyaltyPayments` |
| Mutations | verb + noun | `createAdvance`, `approveAdvance` |
| Components | PascalCase.jsx | `AccountingDashboard.jsx` |
| Hooks | useCamelCase | `useRoyaltyStatus` |

---

### Framework-Specific Rules

**React (v19):**
- Use functional components only - no class components
- Use hooks (`useState`, `useEffect`, `useQuery`, `useMutation`)
- Prefer `useQuery` over `useState` + `useEffect` for data fetching
- Loading states: check `data === undefined` (Convex pattern)
- Use skeleton loaders, NOT spinners for loading states

**Convex:**
- All queries must filter by `branch_id` for multi-branch isolation
- Use `.withIndex()` for filtered queries - never `.filter()` alone on large tables
- Indexes MUST be declared in schema before querying on them
- Actions for external API calls (Resend), queries/mutations for DB only
- Real-time via subscriptions (automatic) - NO polling or manual refresh

**UI/Styling:**
- Theme: Dark (#0A0A0A background) with orange accent (#FF8C42)
- Use TailwindCSS v4 syntax (new `@theme` directive where applicable)
- Mobile touch targets: minimum 44px
- Use shadcn/ui components - do not create custom replacements
- Color-independent status indicators (icons + text, not just color)

**File Placement:**
```
# Backend services
convex/services/[feature].ts

# React components by role
src/components/admin/[Component].jsx    # Super admin features
src/components/staff/[Component].jsx    # Branch admin features
src/components/barber/[Component].jsx   # Barber-only features
src/components/common/[Component].jsx   # Shared components
```

---

### Testing Rules

- Use TestSprite for automated test generation
- Unit tests with Jest
- Test files: `[component].test.js` or `__tests__/[component].test.js`
- Mock Convex queries/mutations in tests
- Test role-based access for each user type (super_admin, branch_admin, barber)

---

### Code Quality & Style Rules

**Branch Isolation (CRITICAL):**
- ALL queries MUST include `branch_id` filtering (except super_admin global views)
- Never expose data across branches
- Cash Advance: visible ONLY to requesting barber + branch admin (super admin excluded)

**RBAC Roles (6 total):**
- `super_admin`: Full system access, all branches
- `admin`: Legacy role (treat as branch_admin)
- `branch_admin`: Own branch only
- `staff`: Limited branch access
- `barber`: Personal data + assigned tasks
- `customer`: Own bookings only

**Error Handling:**
```typescript
// Use ConvexError with code + message
import { ConvexError } from "convex/values";

throw new ConvexError({
  code: "ADVANCE_LIMIT_EXCEEDED",
  message: "Cash advance exceeds 50% of average earnings"
});
```

**Index Pattern:**
```typescript
// Always define index BEFORE using .withIndex()
defineTable({ ... })
  .index("by_branch", ["branch_id"])
  .index("by_status", ["status"])
  .index("by_branch_status", ["branch_id", "status"])
```

---

### Development Workflow Rules

**Convex Schema Changes:**
1. Add table/index to `convex/schema.ts`
2. Run `npx convex dev` to push changes
3. Wait for schema deployment before querying

**New Service Pattern:**
```typescript
// convex/services/[feature].ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getItems = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tableName")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();
  },
});
```

**New Component Pattern:**
```jsx
// src/components/[role]/FeatureName.jsx
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function FeatureName({ branchId }) {
  const data = useQuery(api.services.feature.getItems, { branch_id: branchId });
  const doAction = useMutation(api.services.feature.doAction);

  if (data === undefined) return <Skeleton />;
  return <div>...</div>;
}
```

---

### Critical Don't-Miss Rules

**Anti-Patterns to AVOID:**
- ❌ Using `.filter()` without `.withIndex()` on tables with 1000+ rows
- ❌ Creating new notification services - extend existing `notifications.ts`
- ❌ Using REST-style patterns - use Convex queries/mutations only
- ❌ Manual polling for data updates - Convex subscriptions are automatic
- ❌ Storing currency as decimals or strings
- ❌ Creating components outside role-based directory structure
- ❌ Using plain strings for IDs instead of `v.id("tableName")`
- ❌ Hardcoding branch_id - always get from auth context
- ❌ Using `any` type without explicit justification

**Edge Cases:**
- Empty states: Always show meaningful empty states, not just blank
- Timestamps: Use `Date.now()` for `createdAt`/`updatedAt`
- Optional fields: Use `v.optional()` in schema, check with `??` or `?.`
- Index queries: Always return `.collect()`, `.first()`, or `.unique()`

**Security Rules:**
- Never expose barber cash advance data to super admin
- Validate all mutations server-side (args validation + business logic)
- Use existing auth context - don't create custom auth
- Audit log financial operations (royalty, payments, cash advance)

**Performance Rules:**
- P&L dashboard: <3s load time (use indexes, limit results)
- Clock-in action: <1s response (optimistic updates)
- Use `.take(100)` for pagination on large result sets
- Avoid `.collect()` without limits on unbounded queries

---

## Existing Database Tables (24)

Do NOT create duplicates of these existing tables:
- `branches`, `branding`, `branding_global`, `branding_history`
- `users`, `barbers`, `services`, `bookings`, `walkIns`
- `vouchers`, `user_vouchers`, `sessions`, `events`, `notifications`
- `products`, `transactions`, `pos_sessions`, `payments`, `ratings`
- `payroll_settings`, `barber_commission_rates`, `payroll_periods`, `payroll_records`
- `service_commission_rates`, `product_commission_rates`, `barber_daily_rates`, `payroll_adjustments`
- `email_campaigns`, `email_campaign_logs`, `wallets`, `wallet_transactions`
- `barber_portfolio`, `barber_achievements`, `email_templates`
- `custom_booking_forms`, `custom_booking_submissions`

---

## Usage Guidelines

**For AI Agents:**
- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Check existing services before creating new ones
- Extend existing patterns rather than inventing new ones

**For Humans:**
- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review quarterly for outdated rules
- Remove rules that become obvious over time

---

Last Updated: 2026-01-25
