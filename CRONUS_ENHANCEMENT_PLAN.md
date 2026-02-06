# Cronus Enhancement Plan

## Executive Summary

This document outlines a comprehensive plan for enhancing Cronus based on four key research areas:

1. **UI/UX Improvements** - All three windows (main, floating, tray)
2. **Self-Driven Categorization** - Work without LLM dependency
3. **Task Time Tracking** - Jira/Linear integration with automatic worklog
4. **New Feature Proposals** - Based on codebase analysis

---

## Part 1: UI/UX Improvements

### Current State Assessment: 7.0/10

#### Strengths

- Clean React + TypeScript architecture
- Solid dark mode implementation with CSS variables
- Good use of shadcn/ui components
- Real-time polling and status updates work well

#### Critical Issues Identified

### 1.1 Main Window (Dashboard)

**Current Problems:**

- DistractionStatusBar is information-dense, lacks clear visual hierarchy
- Inconsistent spacing throughout (4px, 8px, 16px mixed)
- Timeline current time indicator is too subtle
- Missing empty states and loading feedback
- No command palette for quick navigation

**Proposed Improvements:**

| Priority | Improvement                                                            | Effort |
| -------- | ---------------------------------------------------------------------- | ------ |
| High     | Simplify DistractionStatusBar - consolidate buttons into dropdown menu | 2 days |
| High     | Implement consistent 4px/8px spacing grid system                       | 3 days |
| High     | Add ARIA labels and keyboard navigation throughout                     | 2 days |
| Medium   | Redesign timeline with better visual feedback                          | 3 days |
| Medium   | Add command palette (Cmd+K) for quick navigation                       | 2 days |
| Medium   | Implement helpful empty states with onboarding hints                   | 1 day  |
| Low      | Add virtualization for long activity lists                             | 2 days |

### 1.2 Floating Window (Mini Timer)

**Current Problems:**

- Status boxes resize in jarring ways when numbers change
- Pause overlay blocks all interaction
- Edit icon discoverability is poor (hover-only)
- Fixed layout doesn't adapt to content
- No visual indicator of current task

**Proposed Improvements:**

| Priority | Improvement                                                    | Effort   |
| -------- | -------------------------------------------------------------- | -------- |
| High     | Use fixed-width font-variant-numeric for stable number display | 0.5 days |
| High     | Redesign pause state to allow viewing stats while paused       | 1 day    |
| Medium   | Add circular progress indicator option                         | 2 days   |
| Medium   | Show current task badge when task tracking is active           | 1 day    |
| Medium   | Add quick task assignment button                               | 1 day    |
| Low      | Make widget resizable with different display modes             | 2 days   |

### 1.3 Tray Window (System Tray Popover)

**Current Problems:**

- Fixed 380x520 size limits usability
- Session timer takes prime real estate
- No quick navigation to main app sections
- Content organization could be improved

**Proposed Improvements:**

| Priority | Improvement                                                   | Effort |
| -------- | ------------------------------------------------------------- | ------ |
| High     | Implement tabbed interface (Today / Sessions / Quick Actions) | 2 days |
| High     | Add quick links to open specific main app sections            | 1 day  |
| Medium   | Make height adaptive based on content                         | 1 day  |
| Medium   | Add task quick-picker integration                             | 1 day  |
| Low      | Add mini weekly chart view                                    | 2 days |

### 1.4 Cross-Window Design System

**Proposed Design System Enhancements:**

```
Design Tokens to Formalize:
├── Spacing: 4px base unit (4, 8, 12, 16, 24, 32, 48)
├── Colors:
│   ├── Productive: emerald-500 (#10b981)
│   ├── Unproductive: rose-500 (#f43f5e)
│   ├── Neutral/Maybe: amber-500 (#f59e0b)
│   └── Uncategorized: slate-400 (#94a3b8)
├── Typography: Inter font family, consistent size scale
├── Border Radius: 4px (sm), 8px (md), 12px (lg)
└── Shadows: Subtle elevation system (sm, md, lg)
```

---

## Part 2: Self-Driven Categorization (No LLM Required)

### Problem Statement

Currently, Cronus relies heavily on LLM (Ollama/LMStudio) for categorizing activities. This creates issues:

- Requires local LLM setup (technical barrier)
- Slow categorization when LLM is busy
- Doesn't work offline without LLM running
- Resource-intensive

### Proposed Solution: Multi-Layer Smart Categorization

```
┌─────────────────────────────────────────────────────────────┐
│                   CATEGORIZATION PIPELINE                    │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: User-Defined Rules (Highest Priority)             │
│  └── Custom patterns user creates in settings               │
│                                                              │
│  Layer 2: Learned Patterns (From User Corrections)          │
│  └── System learns from manual recategorizations            │
│                                                              │
│  Layer 3: Pre-built Templates (Industry Defaults)           │
│  └── Developer, Designer, Manager, Writer templates         │
│                                                              │
│  Layer 4: LLM Fallback (Optional, Low Confidence Only)      │
│  └── Only used for ambiguous cases when available           │
└─────────────────────────────────────────────────────────────┘
```

### 2.1 Rule-Based Categorization System

**Rule Types:**

- `app_name_equals` / `app_name_contains` / `app_name_regex`
- `url_domain_equals` / `url_domain_contains` / `url_regex`
- `title_contains` / `title_regex`
- `content_contains` (for OCR text)
- Conditions can be combined with AND/OR logic

**Example Rules:**

```typescript
// VS Code → Coding
{ type: 'app_name_contains', value: 'code', category: 'Coding' }

// GitHub PRs → Code Review
{
  conditions: [
    { type: 'url_domain_equals', value: 'github.com' },
    { type: 'url_path_contains', value: 'pull' }
  ],
  logic: 'AND',
  category: 'Code Review'
}
```

### 2.2 Learning from User Behavior

**Pattern Learning Database:**

- Store patterns extracted from user corrections
- Track confidence scores (increase on repeated corrections)
- Pattern types: app, domain, url_path, title, combined

**Learning Flow:**

```
User recategorizes activity
       ↓
Extract patterns (app name, domain, title keywords)
       ↓
Store/update pattern with new category
       ↓
Increase confidence for correct patterns
Decrease confidence for incorrect patterns
       ↓
Future activities match learned patterns
```

### 2.3 Pre-built Category Templates

**Templates to Include:**

| Template  | Target User      | Categories                                                                                 |
| --------- | ---------------- | ------------------------------------------------------------------------------------------ |
| Developer | Engineers        | Coding, Code Review, Documentation, DevOps, Meetings, Communication, Research, Distraction |
| Designer  | UI/UX, Graphic   | Design, Prototyping, Research, Collaboration, Assets, Distraction                          |
| Manager   | Team Leads       | Meetings, Planning, Communication, Reviews, Documentation, HR/Admin, Distraction           |
| Writer    | Content Creators | Writing, Research, Editing, Publishing, Analytics, Distraction                             |
| Simple    | Everyone         | Work, Distraction (basic 2-category system)                                                |

### 2.4 Implementation Requirements

**New Database Tables:**

- `categorization_patterns` - Learned patterns with confidence scores
- `categorization_rules` - User-defined and template rules

**New Settings:**

- Enable/disable learning
- Select active template
- LLM fallback threshold (confidence level to trigger LLM)
- Enable/disable LLM entirely

**New UI Components:**

- Rule Builder (visual rule creation)
- Template Selector (during onboarding and settings)
- Learning Dashboard (view/manage learned patterns)
- Categorization Insights (show why activity was categorized)

---

## Part 3: Task Time Tracking (Jira/Linear Integration)

### Problem Statement

Users want to track time spent on specific tasks (Jira issues, Linear issues) and generate worklogs automatically without manual time entry.

### Proposed Solution: Automatic Task Detection + Worklog Generation

### 3.1 Task Detection Methods

| Method           | Confidence | Description                                                 |
| ---------------- | ---------- | ----------------------------------------------------------- |
| Active Session   | 100%       | User explicitly starts a task session                       |
| Git Branch       | 95%        | Detect task ID from branch name (feature/PROJ-123)          |
| Window Title     | 70-90%     | Detect task ID in Linear/Jira window titles                 |
| URL Pattern      | 95%        | Detect from linear.app/issue/VIB-50 or jira/browse/PROJ-123 |
| Custom Rules     | 85%        | User-defined patterns                                       |
| Recent Heuristic | 50%        | Use recently worked task as hint                            |

### 3.2 Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LOCAL MACHINE (OFFLINE-FIRST)            │
├─────────────────────────────────────────────────────────────┤
│  Window Tracking → Task Detection → Task Association        │
│         ↓                ↓                  ↓               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                 SQLite Database                       │  │
│  │  - external_tasks (cached Jira/Linear issues)        │  │
│  │  - task_associations (links events to tasks)         │  │
│  │  - worklogs (aggregated time per task per day)       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ← All activity data stays local →                         │
│                                                             │
└──────────────────────────┬──────────────────────────────────┘
                           │ EXPLICIT USER ACTION ONLY
                           │ (Click "Sync to Jira/Linear")
                           ↓
              ┌────────────────────────────┐
              │   Jira API / Linear API    │
              │   (Only sends: task ID,    │
              │    time, date, desc)       │
              └────────────────────────────┘
```

### 3.3 User Experience Flow

**Daily Workflow:**

1. User works normally, Cronus tracks windows
2. Task detection automatically associates time with tasks
3. At end of day, user opens "Worklog Summary"
4. Reviews auto-generated worklogs (task → time)
5. Can adjust/correct before syncing
6. One-click sync to Jira/Linear

**Floating Widget Enhancement:**

- Show current task badge
- Quick task picker (keyboard shortcut: Cmd+Shift+T)
- "Start working on..." dropdown

**Main Dashboard Enhancement:**

- New "Worklog" section with daily/weekly views
- Task breakdown with time per task
- Sync status indicators
- Unassociated time reminder

### 3.4 Privacy Considerations

**Data that stays local:**

- Window titles, URLs, screen content
- Activity patterns, categories
- Productivity scores

**Data sent on sync (minimal):**

- Task external ID (PROJ-123)
- Time spent (seconds)
- Date
- Optional: Time range description (e.g., "Worked: 09:00-11:30, 14:00-15:00")

### 3.5 Implementation Requirements

**New Database Tables:**

- `external_tasks` - Cached Jira/Linear issues
- `task_associations` - Links activity events to tasks
- `worklogs` - Aggregated time per task per day
- `task_detection_rules` - Custom detection patterns
- `integration_credentials` - Encrypted API tokens

**New IPC Handlers:**

- `task:setup-integration` - Configure Jira/Linear
- `task:search` - Search tasks
- `task:associate-event` - Manual association
- `task:start-session` / `task:end-session` - Active task tracking
- `worklog:generate-for-date` - Generate worklogs
- `worklog:sync` - Sync to providers

**New UI Components:**

- Integration Setup Wizard
- Task Quick Picker
- Worklog Summary Widget
- Daily/Weekly Worklog Views
- Sync Review Modal

---

## Part 4: Additional Feature Proposals

Based on codebase analysis, these additional improvements are recommended:

### 4.1 Performance Improvements

| Feature                      | Benefit                     | Effort   |
| ---------------------------- | --------------------------- | -------- |
| Activity list virtualization | Handle 10k+ events smoothly | 2 days   |
| SQLite query optimization    | Faster dashboard loading    | 1 day    |
| Lazy load settings sections  | Faster settings page        | 0.5 days |

### 4.2 Accessibility Enhancements

| Feature                  | Benefit                  | Effort   |
| ------------------------ | ------------------------ | -------- |
| Full keyboard navigation | Power user efficiency    | 2 days   |
| Screen reader support    | Accessibility compliance | 2 days   |
| High contrast mode       | Visual accessibility     | 1 day    |
| Reduce motion option     | Motion sensitivity       | 0.5 days |

### 4.3 Data & Analytics

| Feature                 | Benefit                     | Effort |
| ----------------------- | --------------------------- | ------ |
| Weekly email summary    | Async productivity insights | 3 days |
| Goal setting & tracking | Motivation, accountability  | 4 days |
| Productivity trends     | Long-term insights          | 2 days |
| Export to CSV/JSON      | Data portability            | 1 day  |

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

- [ ] Design system formalization (spacing, colors, tokens)
- [ ] Self-driven categorization database schema
- [ ] Rule engine core implementation
- [ ] Pre-built category templates

### Phase 2: UI/UX Quick Wins (Weeks 2-3)

- [ ] DistractionStatusBar simplification
- [ ] Floating window stability fixes
- [ ] Tray window tabbed interface
- [ ] Consistent spacing application

### Phase 3: Self-Driven Categorization (Weeks 3-4)

- [ ] Pattern learning service
- [ ] Rule builder UI
- [ ] Template selector
- [ ] Settings integration

### Phase 4: Task Tracking Foundation (Weeks 4-5)

- [ ] Task tracking database schema
- [ ] Jira integration service
- [ ] Linear integration service
- [ ] Task detection engine

### Phase 5: Task Tracking UI (Weeks 5-6)

- [ ] Integration setup wizard
- [ ] Worklog summary widget
- [ ] Task quick picker
- [ ] Floating widget task badge

### Phase 6: Polish & Testing (Weeks 6-7)

- [ ] Accessibility improvements
- [ ] Performance optimization
- [ ] End-to-end testing
- [ ] Documentation

---

## Linear Issues to Create

Upon approval, the following issues will be created:

### UI/UX Issues

1. **VIB-XX**: Simplify DistractionStatusBar with dropdown menu
2. **VIB-XX**: Implement consistent 4px/8px spacing grid system
3. **VIB-XX**: Add ARIA labels and keyboard navigation
4. **VIB-XX**: Fix floating window number display stability
5. **VIB-XX**: Redesign floating window pause state
6. **VIB-XX**: Add tabbed interface to tray window
7. **VIB-XX**: Formalize design system tokens
8. **VIB-XX**: Add command palette (Cmd+K)

### Self-Driven Categorization Issues

9. **VIB-XX**: Create categorization rules database schema
10. **VIB-XX**: Implement rule-based categorization engine
11. **VIB-XX**: Create pattern learning service
12. **VIB-XX**: Add pre-built category templates
13. **VIB-XX**: Build rule builder UI component
14. **VIB-XX**: Add template selector to onboarding
15. **VIB-XX**: Create categorization insights panel

### Task Time Tracking Issues

16. **VIB-XX**: Create task tracking database schema
17. **VIB-XX**: Implement Jira integration service
18. **VIB-XX**: Implement Linear integration service
19. **VIB-XX**: Build task detection engine
20. **VIB-XX**: Create worklog aggregation service
21. **VIB-XX**: Build integration setup wizard UI
22. **VIB-XX**: Create worklog summary widget
23. **VIB-XX**: Add task quick picker to floating window
24. **VIB-XX**: Build daily/weekly worklog views

### Accessibility & Performance Issues

25. **VIB-XX**: Add full keyboard navigation support
26. **VIB-XX**: Implement activity list virtualization
27. **VIB-XX**: Add data export functionality (CSV/JSON)

---

## Approval Request

Please review this enhancement plan and confirm:

1. **UI/UX Improvements** - Proceed with all three windows?
2. **Self-Driven Categorization** - Proceed with rule engine + learning?
3. **Task Time Tracking** - Proceed with Jira/Linear integration?
4. **Priority Order** - Is the proposed roadmap acceptable?
5. **Scope Adjustments** - Any features to add/remove?

Once approved, I will create the Linear issues for the Cronus project.
