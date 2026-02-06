# Cronus Time-Tracking App - UI/UX Review & Recommendations

**Review Date:** February 5, 2026
**Reviewer:** Claude (UI/UX Design Expert)
**App Version:** Development Build

---

## Executive Summary

Cronus is a well-structured time-tracking Electron app with three distinct window types: Main Window, Floating Window, and Tray Window. The app demonstrates solid technical implementation with React + TypeScript and uses shadcn/ui components. However, there are significant opportunities to enhance usability, visual hierarchy, accessibility, and overall user experience through systematic design improvements.

**Overall Score:** 7.0/10

**Key Strengths:**

- Clean component architecture with clear separation of concerns
- Consistent use of design tokens via CSS variables
- Solid dark mode implementation
- Real-time status updates with good polling strategy

**Critical Issues to Address:**

1. Information density and visual hierarchy need refinement
2. Inconsistent spacing and sizing across components
3. Limited accessibility features (keyboard navigation, ARIA labels)
4. Status communication could be more immediate and glanceable
5. Onboarding and empty states need enhancement

---

## Window-by-Window Analysis

### 1. Main Window (Primary Dashboard)

#### Current State Analysis

**Layout Structure:**

- Fixed title bar with custom styling
- Persistent status bar (DistractionStatusBar) showing current activity
- Left sidebar navigation (Dashboard, Todos, Stats)
- Main content area with multiple widgets
- Settings panel slides in from right

**Visual Hierarchy Issues:**

1. **Status Bar Overwhelm** - The DistractionStatusBar is information-dense but lacks clear visual priority
2. **Sidebar Width** - Fixed 128px sidebar is narrow, causing text truncation
3. **Content Spacing** - Inconsistent padding (4px, 8px, 16px) throughout
4. **Color Semantics** - Productive/unproductive colors aren't immediately intuitive

#### Specific Component Reviews

##### A. DistractionStatusBar (Top Status Component)

**Current Issues:**

- **Visual Clutter**: App icon + full title + category status + 3 action buttons = cognitive overload
- **Color Feedback**: Background colors (red/green) are too subtle with current opacity
- **Status Text**: "Categorizing..." and status labels aren't action-oriented
- **Responsive Behavior**: Buttons disappear on narrow views but no tooltips remain
- **Animation**: Text slides in but without clear context of why it changed

**Recommendations:**

```typescript
// PRIORITY 1: Simplify information architecture
// Before: [Icon] [Full App Name - Window Title] [Status] [Mini Timer] [Settings]
// After:  [Icon+App] [Status Pill] [Actions Dropdown▼]

// PRIORITY 2: Enhance status feedback with microinteractions
interface StatusFeedback {
  state: 'productive' | 'unproductive' | 'neutral' | 'loading';
  confidence: number; // 0-100 for visual weight
  animation: 'pulse' | 'fade' | 'slide' | 'none';
}

// Example improved status display:
<StatusBadge
  status="productive"
  category="Development"
  categoryColor="#10B981"
  showAnimation={true}
  confidence={95} // Affects opacity/boldness
  onClick={handleRecategorize}
/>
```

**Design Pattern Reference:**

- Apple HIG: Status items should be concise, using icons + minimal text
- Toggl Track: Uses colored pill badges for clear at-a-glance status
- RescueTime: Employs traffic light metaphor (red/yellow/green) consistently

**Specific Changes:**

1. **Simplify App Display**

   ```tsx
   // Current: Shows full title causing overflow
   <span>{displayWindowInfo.title || displayWindowInfo.ownerName}</span>

   // Recommended: Prioritize app name, truncate title on hover
   <Tooltip content={displayWindowInfo.title}>
     <span className="font-medium">{displayWindowInfo.ownerName}</span>
   </Tooltip>
   ```

2. **Enhance Status Pill**
   - Increase badge size from `text-sm` to `text-base` for readability
   - Add subtle shadow for depth: `shadow-sm`
   - Use 8px border-radius for modern look (currently sharp)
   - Implement haptic feedback pattern on status changes

3. **Consolidate Actions**
   - Move Mini Timer, Settings, Pause into a single dropdown menu
   - Keep only primary action visible (e.g., current category for editing)
   - Add keyboard shortcuts: `Cmd+,` for Settings, `Cmd+P` for Pause

**Accessibility Improvements:**

```tsx
// Add ARIA labels for screen readers
<div
  role="status"
  aria-live="polite"
  aria-label={`Current activity: ${appName}, Status: ${statusText}`}
>
  {/* Status content */}
</div>

// Add keyboard navigation
<button
  aria-label="Recategorize activity"
  aria-keyshortcuts="Command+R"
  onClick={handleRecategorize}
>
```

##### B. Dashboard View (Main Content Area)

**Current Issues:**

- **Split Layout**: 50/50 split between activities list and timeline is rigid
- **Timeline Density**: Hour heights are user-adjustable but default is cramped
- **Empty States**: No guidance when no activities exist
- **Loading States**: Generic skeleton loaders don't indicate what's loading

**Recommendations:**

1. **Implement Responsive Grid System**

   ```tsx
   // Replace rigid 50/50 split with responsive grid
   <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
     {/* Activities widget */}
     {/* Calendar widget */}
   </div>
   ```

2. **Add Progressive Disclosure**
   - Default: Show summary cards (Total Productive/Unproductive)
   - On click: Expand to show detailed timeline
   - Pattern: Follow iOS Health app's progressive data reveal

3. **Improve Empty States**

   ```tsx
   // Current: No activity widget just shows "No activities"
   // Recommended: Educational empty state
   <EmptyState
     icon={<Clock className="w-12 h-12 text-muted-foreground" />}
     title="No activity tracked yet"
     description="Start working, and Cronus will automatically track your time"
     action={{
       label: "Learn how it works",
       onClick: () => showOnboarding(),
     }}
   />
   ```

4. **Timeline Improvements**
   - Add zoom presets: "Compact" (40px/hr), "Default" (80px/hr), "Detailed" (120px/hr)
   - Show time markers every 30min in detailed view
   - Add "Focus Time" visualization showing deep work blocks (>25min uninterrupted)

**Visual Hierarchy Recommendations:**

```css
/* Current spacing is inconsistent */
/* Recommended: Use 4px base unit system */

:root {
  --space-1: 4px; /* Tight spacing */
  --space-2: 8px; /* Close elements */
  --space-3: 12px; /* Related items */
  --space-4: 16px; /* Section spacing */
  --space-6: 24px; /* Major sections */
  --space-8: 32px; /* Page-level spacing */
}

/* Apply systematically */
.status-bar {
  padding: var(--space-3) var(--space-4);
}
.widget-card {
  padding: var(--space-4);
  gap: var(--space-3);
}
.page-container {
  padding: var(--space-6);
}
```

##### C. Sidebar Navigation

**Current Issues:**

- Width: 128px causes label truncation ("Dashboard" is fine, but longer labels would break)
- Icon size: 18px is small for quick scanning
- Active state: Only background color changes, lacks depth
- No tooltips for icon-only fallback state

**Recommendations:**

1. **Increase Sidebar Width**

   ```tsx
   // Current: w-32 (128px)
   // Recommended: w-48 (192px) for better label readability
   <nav className="flex flex-col gap-1 w-48">
   ```

2. **Enhance Active State**

   ```tsx
   // Add left border accent + subtle shadow
   className={cn(
     "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-all",
     isActive
       ? "bg-accent text-accent-foreground shadow-sm border-l-2 border-primary"
       : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
   )}
   ```

3. **Icon Size and Spacing**

   ```tsx
   // Increase icon size for better scannability
   <Icon size={20} className="flex-shrink-0" />
   ```

4. **Add Keyboard Navigation**
   ```tsx
   // Support Cmd+1, Cmd+2, Cmd+3 for quick navigation
   useEffect(() => {
     const handleKeyDown = (e: KeyboardEvent) => {
       if (e.metaKey && ["1", "2", "3"].includes(e.key)) {
         const sections: MainSection[] = ["dashboard", "todos", "stats"];
         onSectionChange(sections[parseInt(e.key) - 1]);
       }
     };
     document.addEventListener("keydown", handleKeyDown);
     return () => document.removeEventListener("keydown", handleKeyDown);
   }, []);
   ```

##### D. Settings Page

**Current Issues:**

- **Cognitive Load**: All settings visible at once without grouping
- **Search Missing**: No way to find specific settings quickly
- **Validation Feedback**: Form errors appear inline but without clear resolution guidance
- **Dangerous Actions**: Reset/delete actions don't have sufficient warnings

**Recommendations:**

1. **Add Settings Search**

   ```tsx
   <div className="sticky top-0 z-10 bg-background p-4 border-b">
     <Input
       type="search"
       placeholder="Search settings..."
       icon={<Search size={16} />}
       onChange={(e) => filterSettings(e.target.value)}
     />
   </div>
   ```

2. **Group Related Settings**
   - Use accordion pattern for setting groups
   - Show count of items in each group
   - Remember last opened group (localStorage)

3. **Improve Form Validation**

   ```tsx
   // Current: Inline error text only
   // Recommended: Multi-level feedback
   <FormField error={error}>
     <Label>Daily Goal Hours</Label>
     <Input
       value={goalHours}
       error={!!error}
       aria-invalid={!!error}
       aria-describedby="goal-error"
     />
     {error && (
       <FormError id="goal-error">
         {error.message}
         <Button variant="link" onClick={showHelp}>
           Learn more about goals
         </Button>
       </FormError>
     )}
   </FormField>
   ```

4. **Dangerous Action Safeguards**
   ```tsx
   // Add two-step confirmation for destructive actions
   <AlertDialog>
     <AlertDialogTrigger asChild>
       <Button variant="destructive">Reset All Data</Button>
     </AlertDialogTrigger>
     <AlertDialogContent>
       <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
       <AlertDialogDescription>
         This will permanently delete all your tracked time data. This action
         cannot be undone.
         <Input
           placeholder="Type 'DELETE' to confirm"
           onChange={(e) => setConfirmText(e.target.value)}
         />
       </AlertDialogDescription>
       <AlertDialogAction
         disabled={confirmText !== "DELETE"}
         onClick={handleReset}
       >
         Yes, delete everything
       </AlertDialogAction>
     </AlertDialogContent>
   </AlertDialog>
   ```

##### E. Calendar Widget / Timeline View

**Current Issues:**

- **Zoom Controls**: Small buttons in corner, easy to miss
- **Current Time Indicator**: Red line is thin, hard to see
- **Hour Labels**: Left-aligned, creates visual disconnect from timeline
- **Block Interactions**: Hover states are subtle, unclear what's clickable
- **Density**: Blocks can overlap, creating visual confusion

**Recommendations:**

1. **Enhance Zoom Controls**

   ```tsx
   // Move to header with better visibility
   <div className="flex items-center gap-2 text-xs text-muted-foreground">
     <Button variant="ghost" size="sm" onClick={handleZoomOut}>
       <MinusCircle size={14} />
     </Button>
     <span className="min-w-[60px] text-center">
       {Math.round(hourHeight * 16)}px/hour
     </span>
     <Button variant="ghost" size="sm" onClick={handleZoomIn}>
       <PlusCircle size={14} />
     </Button>
   </div>
   ```

2. **Improve Current Time Indicator**

   ```tsx
   // Make more prominent with animation
   <div
     className="absolute left-0 right-0 z-20 flex items-center"
     style={{ top: currentTimePosition }}
   >
     <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg animate-pulse" />
     <div className="flex-1 h-0.5 bg-red-500 shadow-sm" />
   </div>
   ```

3. **Timeline Block Design**

   ```tsx
   // Add clear interactive states
   <TimelineBlock
     className={cn(
       "rounded-md transition-all cursor-pointer",
       "hover:shadow-md hover:scale-[1.02] hover:z-10",
       "active:scale-100",
       selected && "ring-2 ring-primary ring-offset-2",
     )}
     onClick={handleBlockClick}
     onDoubleClick={handleBlockEdit}
   />
   ```

4. **Handle Overlapping Blocks**

   ```typescript
   // Implement smart layout algorithm
   interface BlockLayout {
     column: number; // Which lane (0-n)
     totalColumns: number; // Total lanes needed
   }

   // Detect overlaps and assign lanes
   function layoutBlocks(blocks: TimeBlock[]): BlockLayout[] {
     // Sort by start time
     const sorted = [...blocks].sort(
       (a, b) => a.startTime.getTime() - b.startTime.getTime(),
     );

     const layouts: BlockLayout[] = [];
     const lanes: TimeBlock[][] = [];

     for (const block of sorted) {
       // Find first available lane
       let assignedLane = 0;
       for (let i = 0; i < lanes.length; i++) {
         const lastInLane = lanes[i][lanes[i].length - 1];
         if (lastInLane.endTime <= block.startTime) {
           assignedLane = i;
           break;
         }
       }

       // Create new lane if needed
       if (assignedLane === lanes.length) {
         lanes.push([]);
       }

       lanes[assignedLane].push(block);
       layouts.push({
         column: assignedLane,
         totalColumns: lanes.length,
       });
     }

     return layouts;
   }
   ```

---

### 2. Floating Window (Mini Timer Widget)

#### Current State Analysis

**Purpose:** Always-on-top productivity status indicator
**Size:** Compact, draggable window
**Content:** Productive/Unproductive time counters + status

**Current Issues:**

1. **Size Constraints**: Fixed small size limits information display
2. **Dragging**: Works but lacks visual feedback during drag
3. **Status Boxes**: Three states (normal, highlighted, enlarged) but transitions are jarring
4. **Pause Overlay**: Covers entire widget, making it unusable when paused
5. **Edit Icon**: Only appears on hover in enlarged state, discoverability issue

#### Recommendations

##### A. Visual Design Improvements

**1. Status Box Redesign**

```tsx
// Current: Linear boxes that resize
// Recommended: Circular progress indicators for better space usage

interface FloatingDisplayConfig {
  layout: "horizontal" | "circular" | "stacked";
  size: "compact" | "medium" | "large";
  showDetails: boolean;
}

// Circular layout example:
<div className="flex items-center justify-center gap-4 p-3">
  <CircularProgress
    value={productivePercent}
    max={100}
    size={80}
    strokeWidth={8}
    color="green"
  >
    <div className="text-center">
      <div className="text-lg font-bold">{productiveTime}</div>
      <div className="text-[8px] text-muted-foreground">Productive</div>
    </div>
  </CircularProgress>

  <CircularProgress
    value={unproductivePercent}
    max={100}
    size={80}
    strokeWidth={8}
    color="red"
  >
    <div className="text-center">
      <div className="text-lg font-bold">{unproductiveTime}</div>
      <div className="text-[8px] text-muted-foreground">Distracted</div>
    </div>
  </CircularProgress>
</div>;
```

**2. Improve Drag Feedback**

```tsx
// Current: Cursor changes to grabbing
// Recommended: Add ghost effect + snap guides

const [isDragging, setIsDragging] = useState(false);

<div
  className={cn(
    "rounded-xl transition-all",
    isDragging && "shadow-2xl scale-105 opacity-90"
  )}
  onMouseDown={(e) => {
    setIsDragging(true);
    handleMouseDownOnDraggable(e);
  }}
  style={{
    cursor: isDragging ? 'grabbing' : 'grab',
    transform: isDragging ? 'rotate(-2deg)' : 'none'
  }}
>
```

**3. Pause State Refinement**

```tsx
// Current: Full overlay blocks interaction
// Recommended: Minimal indicator + dim content

{
  isTrackingPaused && (
    <div className="absolute top-2 right-2 z-10">
      <Badge variant="secondary" className="animate-pulse">
        <Pause size={10} className="mr-1" />
        Paused
      </Badge>
    </div>
  );
}

<div
  className={cn(
    "relative",
    isTrackingPaused && "opacity-50 pointer-events-none",
  )}
>
  {/* Main content still visible but dimmed */}
</div>;
```

##### B. Interaction Improvements

**1. Resize Support**

```tsx
// Add resize handles in corners
const SIZES = {
  small: { width: 200, height: 80 },
  medium: { width: 280, height: 100 },
  large: { width: 360, height: 120 },
};

<div className="absolute bottom-1 right-1 cursor-nwse-resize">
  <GripVertical size={12} className="text-muted-foreground" />
</div>;
```

**2. Quick Actions Menu**

```tsx
// Right-click context menu
<ContextMenu>
  <ContextMenuTrigger>{/* Widget content */}</ContextMenuTrigger>
  <ContextMenuContent>
    <ContextMenuItem onClick={handleRecategorize}>
      <Edit size={14} className="mr-2" />
      Recategorize
    </ContextMenuItem>
    <ContextMenuItem onClick={handleOpenMain}>
      <ExternalLink size={14} className="mr-2" />
      Open Dashboard
    </ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuItem onClick={handlePause}>
      <Pause size={14} className="mr-2" />
      Pause Tracking
    </ContextMenuItem>
    <ContextMenuItem onClick={handleHide}>
      <X size={14} className="mr-2" />
      Hide Widget
    </ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>
```

**3. Hover Information**

```tsx
// Show detailed breakdown on hover
<Tooltip>
  <TooltipTrigger>
    <StatusBox {...props} />
  </TooltipTrigger>
  <TooltipContent side="bottom" className="max-w-xs">
    <div className="space-y-2 text-xs">
      <div className="font-semibold">{categoryName}</div>
      <div className="text-muted-foreground">
        Active: {activeTime} | Total: {totalTime}
      </div>
      {categoryReasoning && (
        <div className="text-muted-foreground italic border-t pt-2 mt-2">
          "{categoryReasoning}"
        </div>
      )}
    </div>
  </TooltipContent>
</Tooltip>
```

##### C. Performance Optimizations

**1. Reduce Render Frequency**

```tsx
// Current: Updates every 1 second from backend
// Recommended: Optimize update strategy

// Only update when values change significantly
const shouldUpdate = useMemo(() => {
  const timeDiff = Math.abs(newProductiveMs - lastProductiveMs);
  return timeDiff >= 1000; // Only update every second
}, [newProductiveMs, lastProductiveMs]);

// Debounce rapid updates
const debouncedUpdate = useDebouncedCallback(
  (data: FloatingStatusUpdate) => {
    setDisplayData(data);
  },
  100, // 100ms debounce
);
```

**2. Smooth Animations**

```tsx
// Use CSS transforms for better performance
<motion.div
  animate={{
    scale: isEnlarged ? 1.1 : 1,
    opacity: isHighlighted ? 1 : 0.7
  }}
  transition={{
    type: "spring",
    stiffness: 300,
    damping: 30
  }}
>
```

##### D. Accessibility Features

```tsx
// Make widget accessible to screen readers
<div
  role="timer"
  aria-label="Productivity tracker"
  aria-live="polite"
  aria-atomic="true"
>
  <div id="productive-time" aria-label={`Productive time: ${productiveTime}`}>
    {productiveTime}
  </div>
  <div id="distracted-time" aria-label={`Distracted time: ${unproductiveTime}`}>
    {unproductiveTime}
  </div>
</div>;

// Add keyboard controls
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === "Escape") handleClose();
    if (e.key === "r" && e.metaKey) handleRecategorize();
    if (e.key === "p" && e.metaKey) handlePause();
  };
  window.addEventListener("keydown", handleKeyPress);
  return () => window.removeEventListener("keydown", handleKeyPress);
}, []);
```

---

### 3. Tray Window (System Tray Popover)

#### Current State Analysis

**Purpose:** Quick access to stats and session management from system tray
**Size:** 380px × 520px popover
**Content:** Session timer, hourly chart, stats summary, top apps

**Current Issues:**

1. **Fixed Size**: No resize capability limits usability
2. **Information Density**: Trying to show too much in limited space
3. **Session Timer**: Takes prime real estate but may not be frequently used
4. **Navigation**: No way to jump to specific views in main app
5. **Visual Consistency**: Styling differs slightly from main window

#### Recommendations

##### A. Layout Restructure

**1. Tabbed Interface**

```tsx
// Add tabs for better content organization
type TrayTab = "overview" | "session" | "apps" | "quick-actions";

<Tabs defaultValue="overview" className="w-full">
  <TabsList className="w-full grid grid-cols-4">
    <TabsTrigger value="overview">
      <Activity size={14} />
      <span className="ml-1 hidden sm:inline">Today</span>
    </TabsTrigger>
    <TabsTrigger value="session">
      <Timer size={14} />
      <span className="ml-1 hidden sm:inline">Session</span>
    </TabsTrigger>
    <TabsTrigger value="apps">
      <AppWindow size={14} />
      <span className="ml-1 hidden sm:inline">Apps</span>
    </TabsTrigger>
    <TabsTrigger value="quick-actions">
      <Zap size={14} />
      <span className="ml-1 hidden sm:inline">Actions</span>
    </TabsTrigger>
  </TabsList>

  <TabsContent value="overview">
    <TrayOverview />
  </TabsContent>
  {/* ... other tabs */}
</Tabs>;
```

**2. Optimize Overview Tab**

```tsx
// Prioritize glanceable metrics
<div className="space-y-3 p-4">
  {/* Big number stats */}
  <div className="grid grid-cols-2 gap-2">
    <MetricCard
      label="Productive"
      value={formatDuration(productiveMs)}
      trend="+15%"
      color="green"
      icon={<TrendingUp size={16} />}
    />
    <MetricCard
      label="Distracted"
      value={formatDuration(unproductiveMs)}
      trend="-8%"
      color="red"
      icon={<TrendingDown size={16} />}
    />
  </div>

  {/* Mini chart - sparkline style */}
  <div className="h-12">
    <MiniProductivityChart data={hourlyActivity} />
  </div>

  {/* Quick actions */}
  <div className="grid grid-cols-2 gap-2">
    <Button
      variant="outline"
      size="sm"
      onClick={() => openMainApp("dashboard")}
    >
      View Dashboard
    </Button>
    <Button variant="outline" size="sm" onClick={() => openMainApp("stats")}>
      Full Stats
    </Button>
  </div>
</div>
```

##### B. Session Timer Improvements

**Current Issues:**

- Takes up significant space even when no session is active
- Start/stop interaction requires multiple clicks
- Note editing is cramped in small input field

**Recommendations:**

```tsx
// Collapsible session timer
<Collapsible open={showSessionTimer}>
  <CollapsibleTrigger asChild>
    <Button variant="ghost" className="w-full justify-between">
      <div className="flex items-center gap-2">
        <Timer size={16} />
        <span>Session Tracker</span>
      </div>
      {activeSession && (
        <Badge variant="secondary">
          {formatSessionDuration(activeSession)}
        </Badge>
      )}
      <ChevronDown
        className={cn("transition-transform", showSessionTimer && "rotate-180")}
      />
    </Button>
  </CollapsibleTrigger>

  <CollapsibleContent>
    {activeSession ? (
      <ActiveSessionView session={activeSession} />
    ) : (
      <QuickStartSession onStart={handleStartSession} />
    )}
  </CollapsibleContent>
</Collapsible>
```

##### C. Hourly Activity Chart

**Current Issues:**

- Bar chart is too small to read accurately
- No interaction (hover, click) for details
- Colors don't match productive/unproductive scheme

**Recommendations:**

```tsx
// Mini sparkline with interactive tooltip
<div className="h-16 relative">
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={hourlyActivity}>
      <defs>
        <linearGradient id="productiveGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10B981" stopOpacity={0.8} />
          <stop offset="100%" stopColor="#10B981" stopOpacity={0.1} />
        </linearGradient>
      </defs>
      <Area
        type="monotone"
        dataKey="durationMs"
        stroke="#10B981"
        fill="url(#productiveGradient)"
        strokeWidth={2}
      />
      <Tooltip
        content={({ payload }) => (
          <div className="bg-popover text-popover-foreground p-2 rounded-md shadow-md text-xs">
            {payload?.[0]?.payload?.hour}:00 -{" "}
            {formatDuration(payload?.[0]?.value)}
          </div>
        )}
      />
    </AreaChart>
  </ResponsiveContainer>
</div>
```

##### D. Top Apps List

**Current Issues:**

- List can be long, causing scroll
- No context on what makes an app "top"
- Click interaction unclear

**Recommendations:**

```tsx
// Limit to top 5 + "See all" link
<div className="space-y-2">
  <div className="flex items-center justify-between text-xs font-medium">
    <span>Top Applications</span>
    <Button variant="link" size="sm" onClick={() => openMainApp("stats")}>
      See all
    </Button>
  </div>

  {topApps.slice(0, 5).map((app, index) => (
    <div key={app.name} className="flex items-center gap-3">
      <div className="text-xs text-muted-foreground w-4">{index + 1}</div>
      <ActivityIcon appName={app.name} size={16} />
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate">{app.name}</div>
      </div>
      <div className="text-xs text-muted-foreground tabular-nums">
        {formatDuration(app.durationMs)}
      </div>
    </div>
  ))}
</div>
```

##### E. Quick Actions Panel

**Add new tab for frequently used actions:**

```tsx
<div className="space-y-2 p-4">
  <Button
    variant="outline"
    className="w-full justify-start"
    onClick={() => window.trayApi.openMainApp()}
  >
    <ExternalLink size={14} className="mr-2" />
    Open Dashboard
  </Button>

  <Button
    variant="outline"
    className="w-full justify-start"
    onClick={handlePauseTracking}
  >
    <Pause size={14} className="mr-2" />
    {isTrackingPaused ? "Resume" : "Pause"} Tracking
  </Button>

  <Button
    variant="outline"
    className="w-full justify-start"
    onClick={() => window.trayApi.openSettings()}
  >
    <Settings size={14} className="mr-2" />
    Open Settings
  </Button>

  <Separator />

  <Button
    variant="outline"
    className="w-full justify-start text-destructive"
    onClick={handleQuit}
  >
    <Power size={14} className="mr-2" />
    Quit Cronus
  </Button>
</div>
```

---

## Cross-Window Design System Improvements

### 1. Color System Refinement

**Current Issues:**

- Productive (green) and unproductive (red) use different shades across components
- Category colors aren't validated for contrast
- Dark mode colors sometimes lack sufficient contrast

**Recommendations:**

```css
/* Define semantic color tokens */
:root {
  /* Status colors - ensure WCAG AA contrast */
  --status-productive: 142 71% 45%; /* Green #10B981 */
  --status-productive-light: 142 77% 55%; /* Lighter for dark mode */
  --status-unproductive: 0 72% 51%; /* Red #DC2626 */
  --status-unproductive-light: 0 77% 60%; /* Lighter for dark mode */
  --status-neutral: 43 96% 56%; /* Yellow #FBBF24 */
  --status-loading: 217 91% 60%; /* Blue */

  /* Ensure semantic usage */
  --color-success: var(--status-productive);
  --color-danger: var(--status-unproductive);
  --color-warning: var(--status-neutral);
}

/* Validate category colors for accessibility */
.category-badge {
  background-color: var(--category-color);
  color: var(--category-text-color); /* Auto-calculated based on luminance */
}
```

**Implement Color Contrast Checker:**

```typescript
// Utils for accessible color generation
export function ensureAccessibleContrast(
  bgColor: string,
  minContrast: number = 4.5 // WCAG AA
): { background: string; foreground: string } {
  const bg = parseColor(bgColor);
  const lightText = '#FFFFFF';
  const darkText = '#000000';

  const contrastLight = calculateContrast(bg, lightText);
  const contrastDark = calculateContrast(bg, darkText);

  if (contrastLight >= minContrast) {
    return { background: bgColor, foreground: lightText };
  } else if (contrastDark >= minContrast) {
    return { background: bgColor, foreground: darkText };
  } else {
    // Adjust background color to meet contrast requirements
    const adjustedBg = adjustLuminance(bg, minContrast);
    return {
      background: adjustedBg,
      foreground: calculateContrast(adjustedBg, lightText) >= minContrast
        ? lightText
        : darkText
    };
  }
}

// Apply in category badge component
function CategoryBadge({ category }: { category: Category }) {
  const { background, foreground } = ensureAccessibleContrast(category.color);

  return (
    <Badge
      style={{
        backgroundColor: background,
        color: foreground
      }}
    >
      {category.name}
    </Badge>
  );
}
```

### 2. Typography System

**Current Issues:**

- Inconsistent font sizes (text-xs, text-sm, text-base used without system)
- No clear hierarchy between h1, h2, h3 equivalents
- Monospace font for timers is good but sizing varies

**Recommendations:**

```css
/* Define typography scale */
:root {
  /* Font sizes - use modular scale (1.250 - Major Third) */
  --text-xs: 0.64rem; /* 10.24px */
  --text-sm: 0.8rem; /* 12.8px */
  --text-base: 1rem; /* 16px - base */
  --text-lg: 1.25rem; /* 20px */
  --text-xl: 1.563rem; /* 25px */
  --text-2xl: 1.953rem; /* 31.25px */
  --text-3xl: 2.441rem; /* 39px */

  /* Line heights - use relative for better scaling */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;

  /* Font weights - semantic names */
  --font-regular: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}

/* Apply systematic typography */
.text-display {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
}

.text-heading {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  line-height: var(--leading-tight);
}

.text-subheading {
  font-size: var(--text-lg);
  font-weight: var(--font-medium);
  line-height: var(--leading-normal);
}

.text-body {
  font-size: var(--text-base);
  font-weight: var(--font-regular);
  line-height: var(--leading-normal);
}

.text-caption {
  font-size: var(--text-sm);
  font-weight: var(--font-regular);
  line-height: var(--leading-normal);
}

.text-overline {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  line-height: var(--leading-normal);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Timer-specific typography */
.text-timer {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
}
```

### 3. Spacing System

**Current Issues:**

- Inconsistent spacing (p-2, p-3, p-4, px-4 py-3, etc.)
- No clear rationale for spacing choices
- Hard to maintain visual rhythm

**Recommendations:**

```css
/* Already defined 4px base unit system in earlier section */
/* Implement spacing components for consistency */

.card {
  padding: var(--space-4);
  gap: var(--space-3);
}

.card-header {
  padding: var(--space-4);
  padding-bottom: var(--space-3);
}

.card-content {
  padding: var(--space-4);
  padding-top: 0;
}

.section-spacing {
  margin-top: var(--space-6);
}

.element-spacing {
  gap: var(--space-2);
}

/* List items */
.list-item {
  padding: var(--space-3) var(--space-4);
}

/* Buttons */
.button-sm {
  padding: var(--space-2) var(--space-3);
}

.button-md {
  padding: var(--space-3) var(--space-4);
}

.button-lg {
  padding: var(--space-4) var(--space-6);
}
```

### 4. Animation & Transitions

**Current Issues:**

- Some components use framer-motion, others use CSS transitions
- No consistent timing functions
- Animations sometimes feel sluggish or too fast

**Recommendations:**

```css
/* Define animation tokens */
:root {
  /* Durations */
  --duration-instant: 0ms;
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
  --duration-slower: 600ms;

  /* Easing functions */
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-decelerate: cubic-bezier(0, 0, 0.2, 1);
  --ease-accelerate: cubic-bezier(0.4, 0, 1, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

/* Apply systematically */
.transition-colors {
  transition:
    color var(--duration-fast) var(--ease-standard),
    background-color var(--duration-fast) var(--ease-standard),
    border-color var(--duration-fast) var(--ease-standard);
}

.transition-transform {
  transition: transform var(--duration-normal) var(--ease-standard);
}

.transition-all {
  transition: all var(--duration-normal) var(--ease-standard);
}

/* Component-specific animations */
@keyframes slideIn {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes pulse-subtle {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.animate-slide-in {
  animation: slideIn var(--duration-normal) var(--ease-decelerate);
}

.animate-pulse-subtle {
  animation: pulse-subtle 2s var(--ease-standard) infinite;
}
```

**Standardize Framer Motion Variants:**

```typescript
// Define reusable animation variants
export const animationVariants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.15 }
  },

  slideIn: {
    initial: { x: -20, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 20, opacity: 0 },
    transition: { duration: 0.25 }
  },

  scaleIn: {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
    transition: { duration: 0.2 }
  },

  listItem: {
    initial: { opacity: 0, y: 20 },
    animate: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.05, duration: 0.25 }
    })
  }
};

// Use in components
<motion.div variants={animationVariants.fadeIn} initial="initial" animate="animate">
  {content}
</motion.div>
```

### 5. Icon System

**Current Issues:**

- Icon sizes vary (14px, 16px, 18px, 20px, 24px)
- No semantic sizing (e.g., icon-sm, icon-md)
- lucide-react icons are good but sizing should be systematic

**Recommendations:**

```typescript
// Define icon size system
export const iconSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32
} as const;

// Create Icon wrapper component
interface IconProps {
  icon: LucideIcon;
  size?: keyof typeof iconSizes;
  className?: string;
  label?: string; // For accessibility
}

export function Icon({
  icon: IconComponent,
  size = 'md',
  className,
  label
}: IconProps) {
  const pixelSize = iconSizes[size];

  return (
    <IconComponent
      size={pixelSize}
      className={className}
      aria-label={label}
      aria-hidden={!label}
    />
  );
}

// Usage
<Icon icon={Settings} size="md" label="Open settings" />
<Icon icon={Activity} size="lg" />
```

### 6. Component Library Audit

**Shadcn/ui components in use:**

- ✅ Button, Badge, Card - Good usage
- ✅ Dialog, AlertDialog - Good for modals
- ⚠️ Tooltip - Used inconsistently, needs wrapper
- ⚠️ Input - Missing form validation integration
- ❌ Select - Could use more keyboard navigation
- ❌ Combobox - Not used but would be useful for category selection

**Recommendations:**

1. **Create Component Wrappers** for consistent API:

```typescript
// Wrapped Tooltip with consistent behavior
export function Tooltip({ children, content, side = 'top', ...props }: TooltipProps) {
  return (
    <TooltipPrimitive.Root delayDuration={150}>
      <TooltipPrimitive.Trigger asChild>
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Content
        side={side}
        className="z-50 rounded-md bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md"
        {...props}
      >
        {content}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Root>
  );
}
```

2. **Add Missing Components:**

```typescript
// Command palette for quick navigation (Cmd+K)
<CommandDialog open={isOpen} onOpenChange={setIsOpen}>
  <CommandInput placeholder="Search or jump to..." />
  <CommandList>
    <CommandGroup heading="Pages">
      <CommandItem onSelect={() => navigate('dashboard')}>
        <LayoutDashboard className="mr-2" />
        Dashboard
      </CommandItem>
      <CommandItem onSelect={() => navigate('stats')}>
        <BarChart3 className="mr-2" />
        Statistics
      </CommandItem>
    </CommandGroup>
    <CommandSeparator />
    <CommandGroup heading="Actions">
      <CommandItem onSelect={handlePauseTracking}>
        <Pause className="mr-2" />
        Pause Tracking
      </CommandItem>
      <CommandItem onSelect={handleRecategorize}>
        <Edit className="mr-2" />
        Recategorize Activity
      </CommandItem>
    </CommandGroup>
  </CommandList>
</CommandDialog>
```

---

## Accessibility Compliance Checklist

### WCAG 2.1 AA Requirements

#### Perceivable

- [ ] **1.1.1 Non-text Content**: Add alt text to all images, icons need aria-labels
- [ ] **1.3.1 Info and Relationships**: Use semantic HTML (header, nav, main, section)
- [ ] **1.4.1 Use of Color**: Don't rely solely on color (add icons to status indicators)
- [ ] **1.4.3 Contrast Minimum**: Ensure 4.5:1 contrast ratio for text
- [ ] **1.4.11 Non-text Contrast**: Ensure 3:1 contrast for UI components
- [ ] **1.4.12 Text Spacing**: Ensure text remains readable with increased spacing

#### Operable

- [ ] **2.1.1 Keyboard**: All functionality available via keyboard
  - Add keyboard shortcuts: Cmd+K (command palette), Cmd+, (settings), Cmd+P (pause)
  - Tab order follows visual layout
  - Focus indicators visible on all interactive elements

- [ ] **2.1.2 No Keyboard Trap**: Users can navigate away from all components
- [ ] **2.4.3 Focus Order**: Logical focus order throughout app
- [ ] **2.4.7 Focus Visible**: Clear focus indicators (add ring-2 ring-offset-2)
- [ ] **2.5.3 Label in Name**: Button labels match their accessible names

#### Understandable

- [ ] **3.2.1 On Focus**: No automatic context changes on focus
- [ ] **3.2.2 On Input**: No automatic form submissions
- [ ] **3.3.1 Error Identification**: Form errors clearly identified
- [ ] **3.3.2 Labels or Instructions**: All inputs have labels
- [ ] **3.3.3 Error Suggestion**: Provide suggestions for error correction

#### Robust

- [ ] **4.1.2 Name, Role, Value**: All components have proper ARIA attributes
- [ ] **4.1.3 Status Messages**: Use aria-live for dynamic updates

### Implementation Examples

```tsx
// Add skip navigation link
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
>
  Skip to main content
</a>

// Improve status announcements
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {latestStatus === 'productive'
    ? `Currently productive. Working on ${categoryName} for ${duration}`
    : `Currently distracted. Using ${appName} for ${duration}`
  }
</div>

// Add keyboard navigation to timeline
const handleKeyNavigation = (e: KeyboardEvent) => {
  switch(e.key) {
    case 'ArrowUp':
      e.preventDefault();
      selectPreviousHour();
      break;
    case 'ArrowDown':
      e.preventDefault();
      selectNextHour();
      break;
    case 'Enter':
    case ' ':
      e.preventDefault();
      if (selectedHour !== null) {
        expandHourDetails(selectedHour);
      }
      break;
  }
};

// Improve form accessibility
<form onSubmit={handleSubmit} aria-label="Daily goal settings">
  <div className="space-y-2">
    <Label htmlFor="goal-hours">
      Daily Productive Hours Goal
      <Tooltip content="Set your target productive hours per day">
        <Info size={14} className="ml-1 inline-block" />
      </Tooltip>
    </Label>
    <Input
      id="goal-hours"
      type="number"
      min="1"
      max="24"
      value={goalHours}
      onChange={(e) => setGoalHours(e.target.value)}
      aria-describedby={error ? "goal-error" : "goal-description"}
      aria-invalid={!!error}
      aria-required="true"
    />
    {error ? (
      <p id="goal-error" role="alert" className="text-sm text-destructive">
        {error.message}
      </p>
    ) : (
      <p id="goal-description" className="text-sm text-muted-foreground">
        Recommended: 6-8 hours for desk work
      </p>
    )}
  </div>
</form>
```

---

## Performance Optimization Recommendations

### 1. Rendering Optimization

**Current Issues:**

- DistractionStatusBar re-renders every second
- Timeline blocks re-render when data hasn't changed
- Excessive console logging in production

**Recommendations:**

```typescript
// 1. Memoize expensive computations
const processedBlocks = useMemo(() => {
  return generateProcessedEventBlocks(events, categories);
}, [events, categories]); // Only recompute when dependencies change

// 2. Use React.memo for pure components
const TimelineBlock = React.memo(({ block, onClick }: TimelineBlockProps) => {
  return (
    <div onClick={() => onClick(block)}>
      {/* Block content */}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if these change
  return (
    prevProps.block._id === nextProps.block._id &&
    prevProps.block.categoryColor === nextProps.block.categoryColor
  );
});

// 3. Virtualize long lists
import { useVirtualizer } from '@tanstack/react-virtual';

function ActivityList({ items }: { items: Activity[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Estimate row height
    overscan: 5 // Render 5 extra items
  });

  return (
    <div ref={parentRef} className="h-[500px] overflow-auto">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: 'relative'
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`
            }}
          >
            <ActivityItem activity={items[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}

// 4. Debounce rapid updates
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

function SearchInput({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    onSearch(debouncedQuery);
  }, [debouncedQuery, onSearch]);

  return <Input value={query} onChange={(e) => setQuery(e.target.value)} />;
}

// 5. Code split heavy components
const StatsView = lazy(() => import('./components/Stats/StatsView'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));

// Use with Suspense
<Suspense fallback={<LoadingSpinner />}>
  {activeSection === 'stats' && <StatsView {...props} />}
</Suspense>
```

### 2. Data Loading Optimization

```typescript
// Implement intelligent polling based on window focus
const useAdaptivePolling = (
  callback: () => Promise<void>,
  baseInterval: number,
) => {
  const isWindowFocused = useWindowFocus();
  const [interval, setInterval] = useState(baseInterval);

  useEffect(() => {
    // Slow down polling when window is not focused
    const adaptedInterval = isWindowFocused
      ? baseInterval
      : Math.min(baseInterval * 4, 180000); // Max 3 minutes

    setInterval(adaptedInterval);
  }, [isWindowFocused, baseInterval]);

  useEffect(() => {
    callback(); // Initial call
    const id = setInterval(callback, interval);
    return () => clearInterval(id);
  }, [callback, interval]);
};

// Use in components
useAdaptivePolling(loadEvents, 30000); // 30s when focused, 2min when unfocused
```

### 3. Bundle Size Optimization

```typescript
// Replace moment.js with date-fns (if using moment)
// moment.js: ~67KB minified
// date-fns: ~13KB minified (with tree-shaking)

// Before
import moment from "moment";
const formatted = moment(date).format("MMM DD, YYYY");

// After
import { format } from "date-fns";
const formatted = format(date, "MMM dd, yyyy");

// Tree-shake lodash
// Before
import _ from "lodash";
const result = _.debounce(fn, 300);

// After
import debounce from "lodash/debounce";
const result = debounce(fn, 300);

// Lazy load Recharts (large library)
const Charts = lazy(() => import("./components/Charts"));
```

---

## Mobile & Responsive Considerations

While Cronus is primarily a desktop app, considering responsive design principles will improve usability on smaller screens and future-proof the application.

### Breakpoint Strategy

```css
/* Define responsive breakpoints */
:root {
  --screen-sm: 640px;
  --screen-md: 768px;
  --screen-lg: 1024px;
  --screen-xl: 1280px;
}

/* Example responsive layout */
.dashboard-grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (min-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: minmax(300px, 1fr) minmax(500px, 2fr);
  }
}
```

### Touch-Friendly Interactions

```typescript
// Increase touch target sizes
const TOUCH_TARGET_SIZE = 44; // 44px minimum per Apple HIG

<button
  className="min-h-[44px] min-w-[44px] p-3"
  onClick={handleClick}
>
  <Icon size={20} />
</button>

// Add touch-specific interactions
const [touchStart, setTouchStart] = useState<number | null>(null);
const [touchEnd, setTouchEnd] = useState<number | null>(null);

const handleTouchStart = (e: React.TouchEvent) => {
  setTouchStart(e.targetTouches[0].clientX);
};

const handleTouchEnd = () => {
  if (!touchStart || !touchEnd) return;

  const swipeDistance = touchStart - touchEnd;
  const isSwipe = Math.abs(swipeDistance) > 50;

  if (isSwipe) {
    if (swipeDistance > 0) {
      handleSwipeLeft();
    } else {
      handleSwipeRight();
    }
  }
};
```

---

## Onboarding & First-Run Experience

### Current Onboarding Issues

1. **Single-Flow Only**: No way to skip or resume later
2. **Permission Requests**: Abrupt, no context for why permissions are needed
3. **No Progress Indicator**: Users don't know how many steps remain
4. **Missing Value Props**: Doesn't explain key features before asking for permissions

### Recommended Onboarding Flow

```typescript
// Multi-step onboarding with clear progression
interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<StepProps>;
  skippable: boolean;
  completed: boolean;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Cronus',
    description: 'Your AI-powered time tracker',
    component: WelcomeStep,
    skippable: false,
    completed: false
  },
  {
    id: 'permissions',
    title: 'Grant Permissions',
    description: 'Cronus needs access to track your activity',
    component: PermissionsStep,
    skippable: false,
    completed: false
  },
  {
    id: 'categories',
    title: 'Customize Categories',
    description: 'Set up your productivity categories',
    component: CategoriesStep,
    skippable: true,
    completed: false
  },
  {
    id: 'goals',
    title: 'Set Your Goals',
    description: 'Define your daily productivity targets',
    component: GoalsStep,
    skippable: true,
    completed: false
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'Start tracking your time',
    component: CompleteStep,
    skippable: false,
    completed: false
  }
];

// Onboarding component with progress
function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = onboardingSteps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="fixed inset-0 bg-background z-50">
      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step indicator */}
      <div className="flex justify-center items-center gap-2 py-4">
        {onboardingSteps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              index === currentStep && "w-6 bg-primary",
              index < currentStep && "bg-primary/50",
              index > currentStep && "bg-muted"
            )}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {React.createElement(
              onboardingSteps[currentStep].component,
              {
                onNext: () => setCurrentStep(prev => prev + 1),
                onBack: () => setCurrentStep(prev => prev - 1),
                onSkip: () => setCurrentStep(prev => prev + 1)
              }
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
```

### Welcome Step Design

```tsx
function WelcomeStep({ onNext }: StepProps) {
  return (
    <div className="text-center space-y-6 py-12">
      <div className="w-24 h-24 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
        <Clock size={48} className="text-primary" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Welcome to Cronus</h1>
        <p className="text-lg text-muted-foreground">
          The first context-aware, AI distraction and time tracker
        </p>
      </div>

      {/* Value propositions */}
      <div className="grid gap-4 text-left max-w-md mx-auto py-6">
        <FeatureCard
          icon={<Brain />}
          title="AI-Powered Categorization"
          description="Automatically categorizes your activities as productive or distracting"
        />
        <FeatureCard
          icon={<Target />}
          title="Goal Tracking"
          description="Set daily goals and track your progress in real-time"
        />
        <FeatureCard
          icon={<Eye />}
          title="Private & Secure"
          description="All data stays on your device. No cloud sync required."
        />
      </div>

      <Button size="lg" onClick={onNext}>
        Get Started
        <ArrowRight className="ml-2" size={20} />
      </Button>
    </div>
  );
}
```

### Permission Step with Context

```tsx
function PermissionsStep({ onNext }: StepProps) {
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Grant Accessibility Access</h2>
        <p className="text-muted-foreground">
          Cronus needs permission to see which apps you're using
        </p>
      </div>

      {/* Why we need this */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info size={16} />
            Why does Cronus need this?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Accessibility permission allows Cronus to:</p>
          <ul className="list-disc list-inside space-y-1 pl-4">
            <li>Detect which application you're currently using</li>
            <li>Track time spent in different apps and websites</li>
            <li>Automatically categorize your activities</li>
          </ul>
          <p className="pt-2 flex items-start gap-2 text-success">
            <Shield size={16} className="mt-0.5 flex-shrink-0" />
            <span>
              Your privacy is protected. Cronus only tracks app names and window
              titles—never passwords or sensitive data.
            </span>
          </p>
        </CardContent>
      </Card>

      {/* Grant button */}
      <div className="flex flex-col gap-3">
        <Button
          size="lg"
          onClick={handleGrantPermissions}
          disabled={permissionsGranted}
        >
          {permissionsGranted ? (
            <>
              <CheckCircle className="mr-2" />
              Permission Granted
            </>
          ) : (
            <>
              Grant Permission
              <ExternalLink className="ml-2" size={16} />
            </>
          )}
        </Button>

        {permissionsGranted && (
          <Button size="lg" onClick={onNext}>
            Continue
            <ArrowRight className="ml-2" />
          </Button>
        )}
      </div>

      {/* Help link */}
      <div className="text-center">
        <Button variant="link" size="sm">
          Troubleshooting permission issues
        </Button>
      </div>
    </div>
  );
}
```

---

## Testing & Quality Assurance

### Visual Regression Testing

```typescript
// Use Playwright for visual testing
import { test, expect } from "@playwright/test";

test("dashboard renders correctly", async ({ page }) => {
  await page.goto("http://localhost:3000");

  // Wait for data to load
  await page.waitForSelector('[data-testid="dashboard-content"]');

  // Take screenshot
  await expect(page).toHaveScreenshot("dashboard-default.png", {
    maxDiffPixels: 100,
  });
});

test("floating window displays status", async ({ page }) => {
  await page.goto("http://localhost:3000/floating");

  // Verify status boxes
  await expect(page.locator('[data-testid="productive-time"]')).toBeVisible();
  await expect(page.locator('[data-testid="unproductive-time"]')).toBeVisible();

  await expect(page).toHaveScreenshot("floating-window.png");
});
```

### Accessibility Audit

```bash
# Install axe-core for automated accessibility testing
npm install -D @axe-core/playwright

# Run accessibility tests
npx playwright test accessibility.spec.ts
```

```typescript
// accessibility.spec.ts
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("dashboard has no accessibility violations", async ({ page }) => {
  await page.goto("http://localhost:3000");

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});

test("floating window is keyboard accessible", async ({ page }) => {
  await page.goto("http://localhost:3000/floating");

  // Test keyboard navigation
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveAttribute(
    "data-testid",
    "close-button",
  );

  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveAttribute(
    "data-testid",
    "open-main-button",
  );
});
```

---

## Implementation Roadmap

### Phase 1: Quick Wins (1-2 weeks)

**Priority: High Impact, Low Effort**

1. **Status Bar Simplification**
   - Consolidate action buttons into dropdown menu
   - Increase status badge size and contrast
   - Add keyboard shortcut hints

2. **Spacing Standardization**
   - Apply 4px base unit system throughout
   - Fix inconsistent padding in cards and widgets

3. **Accessibility Basics**
   - Add ARIA labels to all interactive elements
   - Implement keyboard navigation for main flows
   - Ensure focus indicators are visible

4. **Empty States**
   - Design and implement empty state components
   - Add helpful messages and actions

**Expected Outcome:** Immediate usability improvements, better first impressions

### Phase 2: Core Experience (3-4 weeks)

**Priority: Major UX Improvements**

1. **Onboarding Redesign**
   - Implement multi-step flow with progress indicator
   - Create contextual permission requests
   - Add value proposition communication

2. **Timeline Enhancements**
   - Improve current time indicator
   - Add block interaction states
   - Implement zoom presets
   - Handle overlapping blocks intelligently

3. **Floating Window Redesign**
   - Circular progress indicators
   - Better drag feedback
   - Context menu for quick actions
   - Resize capability

4. **Settings Page Improvements**
   - Add search functionality
   - Group related settings with accordions
   - Improve form validation feedback
   - Add dangerous action safeguards

**Expected Outcome:** Significantly improved core user flows, reduced friction

### Phase 3: Polish & Advanced Features (4-6 weeks)

**Priority: Refinement & Future-Proofing**

1. **Design System Formalization**
   - Document all design tokens
   - Create component library with Storybook
   - Implement color contrast validation
   - Standardize animations

2. **Performance Optimization**
   - Implement virtualization for long lists
   - Add intelligent polling based on focus
   - Code-split heavy components
   - Optimize bundle size

3. **Advanced Interactions**
   - Command palette (Cmd+K)
   - Keyboard shortcuts throughout
   - Undo/redo for actions
   - Drag-and-drop for organizing

4. **Tray Window Redesign**
   - Tabbed interface
   - Collapsible sections
   - Mini sparkline charts
   - Quick action panel

**Expected Outcome:** Professional, polished application ready for broader release

### Phase 4: Continuous Improvement (Ongoing)

**Priority: Iterative Refinement**

1. **User Testing**
   - Set up analytics to track usage patterns
   - Conduct usability testing sessions
   - Gather feedback on pain points

2. **A/B Testing**
   - Test different status indicator designs
   - Compare timeline layouts
   - Optimize onboarding flow

3. **Accessibility Compliance**
   - Regular audits with axe-core
   - User testing with assistive technologies
   - Address any reported issues

4. **Visual Regression Testing**
   - Set up automated screenshot testing
   - Monitor for unintended UI changes
   - Maintain design consistency

---

## Measurement & Success Metrics

### Key Performance Indicators (KPIs)

**User Engagement:**

- Daily Active Users (DAU)
- Session duration
- Feature adoption rate (% using mini timer, tray, etc.)
- Settings page visit rate

**Usability:**

- Time to complete onboarding
- Error rate in forms
- Support ticket volume
- Task completion rate (setting goals, creating categories, etc.)

**Performance:**

- Time to interactive (TTI)
- First contentful paint (FCP)
- Cumulative layout shift (CLS)
- Memory usage over time

**Accessibility:**

- Number of WCAG violations (goal: 0)
- Keyboard navigation success rate
- Screen reader compatibility score

### Analytics Implementation

```typescript
// Track user interactions for optimization
const trackEvent = (
  category: string,
  action: string,
  label?: string,
  value?: number,
) => {
  if (window.api?.trackEvent) {
    window.api.trackEvent({
      category,
      action,
      label,
      value,
      timestamp: Date.now(),
    });
  }
};

// Usage examples
trackEvent("Navigation", "Sidebar Click", "Dashboard");
trackEvent("Interaction", "Recategorize Activity", categoryName);
trackEvent(
  "Settings",
  "Toggle Tracking",
  isTrackingPaused ? "Paused" : "Resumed",
);

// Track performance metrics
const trackPerformance = () => {
  if (window.performance) {
    const perfData = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming;

    trackEvent("Performance", "Page Load", "TTI", perfData.domInteractive);
    trackEvent("Performance", "Page Load", "FCP", perfData.responseStart);
  }
};
```

---

## Conclusion

Cronus has a solid foundation with clean architecture and modern technologies. The recommendations in this review focus on:

1. **Simplifying Information Hierarchy** - Reduce cognitive load through better visual organization
2. **Enhancing Accessibility** - Make the app usable for everyone with WCAG compliance
3. **Improving Feedback** - Provide clear, immediate feedback for all user actions
4. **Systematizing Design** - Create a cohesive design system for consistency
5. **Optimizing Performance** - Ensure the app remains responsive and efficient

**Priority Focus Areas:**

1. DistractionStatusBar simplification (highest impact)
2. Onboarding experience (critical for first impressions)
3. Accessibility compliance (ethical imperative)
4. Design system formalization (long-term maintainability)

By implementing these recommendations in phases, Cronus will evolve from a functional time-tracking tool into a delightful, accessible, and professional productivity application that users love to use daily.

---

## Appendix: Design Resources

### Recommended Tools

- **Figma** - For design mockups and prototyping
- **Storybook** - For component library documentation
- **Playwright** - For E2E and visual regression testing
- **axe DevTools** - For accessibility auditing
- **React DevTools** - For performance profiling

### Inspiration Sources

- **Apple Human Interface Guidelines** - For macOS app design patterns
- **Material Design 3** - For modern component patterns
- **Toggl Track** - For time tracking UX patterns
- **RescueTime** - For productivity visualization
- **Clockify** - For timer and tracking interfaces

### Color Accessibility Tools

- **WebAIM Contrast Checker** - https://webaim.org/resources/contrastchecker/
- **Colorblind Simulator** - Chrome extension for testing color accessibility
- **Adobe Color** - For generating accessible color palettes

### Further Reading

- "Refactoring UI" by Adam Wathan & Steve Schoger
- "Designing with Data" by Brian Suda
- "Don't Make Me Think" by Steve Krug
- "The Design of Everyday Things" by Don Norman
