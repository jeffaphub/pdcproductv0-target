# Ready-to-Work Tab - Visual & Behavioral Specification (UI/UX Only)

This document describes ONLY the visual appearance, layout, interactions, and what each element represents. No data structures, backend logic, or sample data. The implementation should generate appropriate sample/mock data to populate these visuals.

---

## OVERALL STRUCTURE

The Ready-to-Work component is a **manufacturing execution cockpit** for production planners. It helps decide which jobs to release to the shop floor based on readiness gates, constraints, and business priorities.

**Tab Architecture**: One parent component containing **7 sub-tabs**, each focused on a specific constraint domain.

---

## GLOBAL ELEMENTS (Visible on All Sub-Tabs)

### 1. Sub-Tab Navigation Bar
**Location**: Top of component
**Visual**: Horizontal strip of tab buttons
- Container: Rounded corners, light gray (slate-100) background, small internal padding
- Buttons arranged in a row with horizontal scroll if needed
- **7 Tab Labels**:
  1. "Ready to Work" (main view)
  2. "Quality NC Insights"
  3. "Site Supply/Demand"
  4. "Late Job Alerts"
  5. "Shelf-Life Tracking"
  6. "MRB Parts"
  7. "Capacity Tracking"
- **States**:
  - Active: White background, subtle shadow, dark text
  - Inactive: Transparent, muted text, hover darkens text

### 2. Global Filter Bar
**Location**: Below sub-tab navigation
**Visual**: Card container with light border
**Contents** (arranged horizontally, wrapping on smaller screens):
- Filter icon + "Filters:" label
- **Site dropdown**: Site selection
- **Program dropdown**: Product program filter
- **Time Horizon dropdown**: 7/14/30/60 day windows
- **Demand Baseline dropdown** (special amber-tinted styling): Contract/IOP/Delivery Plan/PDM Forecast - controls which date baseline is used for comparisons
- **Date Stack toggle**: Shows/hides expanded date comparison row in tables
- **Status toggles**: 3 buttons (Ready/Watch/Blocked) - each toggleable ON/OFF to filter by readiness status
- **Search input**: With search icon, searches jobs/parts
- **Reset button**: Clears all filters

---

## SUB-TAB 1: READY TO WORK

This is the primary decision-making view showing which jobs are ready for floor release.

### Section A: Release Decision KPI Cards
**Layout**: 6 cards in a horizontal row
**Purpose**: At-a-glance status of the release queue

| Card | Theme | Shows | Represents |
|------|-------|-------|------------|
| Release Now | Green | Count + $ value | Jobs fully ready to release |
| Next Up | Amber | Count + earliest clear date | Jobs nearly ready |
| Intervention Required | Red | Count + at-risk $ | Jobs needing management action |
| Earliest Contract at Risk | Neutral | Date | First contract deadline in jeopardy |
| Max Projected Slip | Neutral | Days | Worst-case delay |
| Confidence Mix | Neutral | H/M/L counts + bar | Distribution of forecast confidence |

### Section B: Priority Chain Strip
**Visual**: Slim horizontal card with gray background
**Purpose**: Shows the ranking methodology used
**Content**: Connected chips showing hierarchy: "SIOP Priority" → "CLIN" → "Project" → "Job/WO" → "Gates" → "Release Rank"
- Chevron arrows connect each chip
- Some chips have small parenthetical descriptions

### Section C: Release Timeline Gantt Chart
**Visual**: Card containing a custom SVG-based Gantt chart
**Purpose**: Visual timeline of jobs showing planned execution vs deadlines

**Header Controls**:
- Title: "Release Timeline"
- **View Mode Toggle**: "Baseline" / "Scenario Analysis"
  - Baseline: Default chronological view
  - Scenario: Shows optimized re-sequencing recommendations
- **Legend**: Color-coded bar types and marker meanings
- **Marker Toggles**: IOP/PDM buttons to show additional date markers

**Gantt Structure**:
- **Left Column**: Job identifier + program name + required date
- **Score Badge**: Small colored rectangle showing readiness score
- **Timeline Area**:
  - Horizontal date headers (day labels)
  - Weekend columns slightly shaded
  - **Today Line**: Vertical dashed blue line

**Job Bars** (what they represent):
- **Solid Bar**: The execution window (planned start to projected clear)
  - GREEN = Ready (all gates passing)
  - AMBER = Watch (minor issues)
  - RED = Blocked (significant constraints)
- **Striped Section**: Slip zone beyond the baseline contract date
  - Diagonal hatch pattern
  - Shows how far the job is projected past deadline
- **Diamond Marker**: The contract/baseline required date
- **Buffer Label**: "+Nd" or "-Nd" showing days ahead/behind baseline
- **Gate Dots**: Small circles below bar showing which gates are failing

**Hover Behavior**: Tooltip appears showing job details, dates, blocker info

**Scenario Mode Additions**:
- "PULL FWD" badges on jobs that should start earlier
- Dashed arrow lines showing recommended earlier start
- Action recommendation labels (RELEASE, EXPEDITE, DEPRIORITIZE, etc.)

### Section D: Three-Lane Decision View
**Layout**: 3 vertical cards stacked (or 4 in scenario mode)
**Purpose**: Segments jobs into actionable buckets

**Each Lane Card**:
- Left colored border accent (4px)
- Header with lane name, job count badge, description
- "Top Drivers" filter chips showing constraint breakdown
- Embedded table showing jobs in that lane

**Lane Definitions**:
| Lane | Color | Baseline Label | Scenario Label | Contains |
|------|-------|----------------|----------------|----------|
| A | Green | "RELEASE NOW" | "PULL FORWARD" | Ready or recoverable jobs |
| B | Amber | "NEXT UP" | "ON-TIME (CAN DEFER)" | Near-ready jobs |
| C | Red | "INTERVENTION REQUIRED" | "DEPRIORITIZE" | Blocked jobs |
| D | Gray | - | "MONITOR" | (Scenario only) Other jobs |

**Scenario Banner** (scenario mode only): Blue info box explaining the optimization approach

**Table Inside Each Lane**:
- Columns: Rank, Job, Program, Workcenter, Recommended Start (scenario), Baseline Date, Clear Date, Buffer, Priority, Score, Confidence, Blocker, Gate dots, Next Action, Owner
- **Expandable Date Stack Row**: When Date Stack toggle is ON, shows additional row with all date baselines and their drift from contract

### Section E: Insight Panels
**Layout**: 2-column grid at bottom

**Left Panel (wider): Prioritization Matrix**
- **Type**: Scatter chart
- **X-Axis**: Business Priority score (0-100)
- **Y-Axis**: Readiness Score (0-100)
- **Points**: Colored by status (green/amber/red), sized uniformly
- **Quadrant Labels**: "Release Now" (top-right), "Backlog Ready" (top-left), "Recover Fast" (bottom-right), "Don't Touch" (bottom-left)
- **Interaction**: Click point to filter queue to that job

**Right Panel: Primary Blocker Breakdown**
- **Type**: Horizontal bar chart
- **Shows**: Count of jobs blocked by each category
- **Categories**: Materials, MRB/Quality, Shelf-Life, Capacity, Supplier
- **Interaction**: Click bar to filter queue by that blocker type

---

## SUB-TAB 2: QUALITY NC INSIGHTS

**Purpose**: Deep-dive into quality/non-conformance issues blocking production

### KPI Strip
6 metric cards: Jobs Blocked by Quality, Earliest Due Blocked, Max Projected Slip, MRB $ Tied, Rework Hrs, Scrap + Replace costs

### Section A: Driver Clusters Table
**Purpose**: Groups NCs by root cause pattern
**Controls**: Dimension toggle (Defect/Part/Workcenter/Operation)
**Columns**: Defect Family, Top Part, Top Workcenter, Operation, Jobs Blocked, Earliest Due, Total Slip, At-Risk Value, MRB Qty/Value, Recurrence Index, Escape Point
**Interaction**: Click row to filter entire tab by that driver cluster

### Section B: Blocked Work Queue
Shows jobs blocked by quality issues
**Columns**: Job, Program, WC, Required Date, Planned Date, Slip, Blocking NC/MRB IDs, Qty Required/On Hold, Owner, Next Action Date, Status badge
**Interaction**: Click row to open job drawer

### Section C: Where It Happens (side by side)
**Left: Top Workcenters by Impact**
- Metric toggle buttons: Jobs / $ / Rework / Scrap
- Horizontal bar chart

**Right: Defect Concentration Heatmap**
- Matrix table: Rows = Workcenters, Columns = Defect types
- Cell color intensity = impact severity
- Hover tooltip shows breakdown

### Section D: Supplier vs Internal Attribution
**Layout**: 3 columns
- **Donut Chart**: Attribution breakdown (Supplier-Caused, Process/Tooling, Design/Eng, Handling/Storage)
- **Attribution Cards**: List with colored dots showing count, jobs blocked, value
- **Top Suppliers Table**: Supplier name, Jobs affected, At-Risk $, Top Defect

### Section E: Trend & Recurrence
**Left (2/3 width)**: 12-week line chart showing trend by driver
**Right (1/3 width)**: Recurrence index cards for top 5 drivers

### Section F: Action Queue
**Purpose**: Prioritized corrective action list
**Columns**: Action description, Driver Cluster, Expected Benefit, Owner, Target Date, Status badge
**Visual**: Read-only display of planned actions

---

## SUB-TAB 3: SITE SUPPLY/DEMAND

**Purpose**: Time-phased view of supply vs demand balance

### Supply/Demand Summary Chart
- **Type**: Stacked area chart with overlaid lines
- **Stacked Areas (supply)**: Inventory, WIP, POs/In-transit, Planned Orders (different colors)
- **Lines (demand)**: Contract Demand (solid dark), IOP Plan (dashed)
- **X-Axis**: Weekly buckets

### Gap Attribution (2-column)
**Left: Gap by Program** - Horizontal bar showing gap units by program
**Right: Constraint Drivers** - Horizontal bar showing constraint type counts

---

## SUB-TAB 4: LATE JOB ALERTS

**Purpose**: Execution triage for jobs projected to miss deadlines

### KPI Strip
6 metrics: Late Jobs, Forecast-Late Jobs, Earliest Required at Risk, Max Projected Slip, Total At-Risk Value, % Alerts w/ Constraint ID

### Section 1: Ranked Alert Queue
**Purpose**: Prioritized list of at-risk jobs
**Sorting**: By composite priority score, then earliest required, then slip
**Columns**: Rank, Job, Program, Required Date, Projected Date, Slip (days), Priority Score, Priority Breakdown (mini stacked bar), Dominant Constraint, Evidence text, Next Best Action, Owner, Status
**Interaction**: Click row to show evidence workspace below

### Section 2: Evidence Workspace (appears when alert selected)
**Layout**: 2-column panel

**Left: Constraint Evidence Chain**
- Vertical chain of evidence cards connected by lines
- Each card: Icon, Type label (Material Shortage, MRB Hold, Capacity, Shelf-Life, Supplier), Description, Date
- Shows what's causing the delay

**Right: Recovery Plan (tabbed)**
- **Tab Toggle**: "Supply Recovery" / "Demand Trades"

**Supply Recovery Tab**:
- Header showing the short part
- Table: Source, Location, Qty Available, Earliest Date, Feasibility badge (Available/Expedite Possible/Requires Approval/Blocked), Action description
- Impact Simulator box (blue tinted): Shows "if-then" scenarios for recovery actions

**Demand Trades Tab**:
- Table: Donor Job, Program, Required Date, Priority, DPAS rating, Critical Path status, Swap Qty, Trade Action, Impact on Donor
- Trade Implication box (amber tinted): Explains net effect of swap

### Section 3: Root Cause Distribution
**Controls**: Metric toggle (Count / Slip Days / At-Risk $ / Blocked-to-Ship)
**Layout**: 2/3 bar chart + 1/3 driver cards
**Interaction**: Click bar to filter queue by that cause

### Section 4: Trend + Accountability (2-column)
**Left: Weekly Trend**
- Stacked bar: Late + Forecast-Late over 12 weeks
- Below: Constraint Mix stacked bar (breakdown by cause type)

**Right: Accountability**
- Repeat Offenders table: Item, Type (Part/Job/Workcenter), Weeks on List, Constraint
- Aging Unresolved Actions table: Action, Owner, Function, Due Date, Days Late

---

## SUB-TAB 5: SHELF-LIFE TRACKING

**Purpose**: Track material lots approaching/past expiration

### KPI Strip
7 metrics: Lots in Scope, Near-Expiry, Expired, Jobs at Risk, At-Risk Value, Scrap Exposure, First Risk Date

### Controls
- **Expiry Threshold Slider**: Days to expiry threshold (1-30 range)
- **View Mode Toggle**: "Expiry Gantt" / "Demand Conflicts"

### Section A: Shelf-Life Gantt (Gantt view mode)
**Layout**: Main gantt (60%) + Lot Detail drawer (40%, conditional)

**Gantt Structure**:
- **Part Groups**: Collapsible rows grouping lots by part number
  - Header row: Chevron, Part name, lot count, alert icon if issues
- **Lot Rows** (inside expanded groups):
  - Left: Lot ID, Qty allocated/remaining
  - **Timeline**:
    - **Viability Bar**: Horizontal bar from manufacture date to expiry
      - GREEN = Healthy (plenty of time)
      - AMBER = Near-Expiry
      - RED = Expired or Critical
    - **Consumption Bars**: Blue rectangles showing when jobs will use this lot
      - Positioned from issue date to operation start
      - Shows job ID inside
    - **Conflict Overlay**: Red-tinted section if consumption extends past expiry
    - **Today Line**: Vertical marker
  - Right: Status badge ("Expired", "Exp Before Use", "Xd left", "Healthy")

**Legend**: Explains bar colors and patterns

**Lot Detail Drawer** (when lot selected):
- Summary cards: Part, Expiry Date, Days Left
- Qty by Location list
- Pegged Allocations table: Job, Qty, Consume window, Priority, Readiness status
- Alternate Lots section: Cards showing healthier alternatives (green theme)
- Recommended Actions list: Priority-colored action cards (Consume-First, Switch to Alternate, Move Inventory, Request Extension, Replace Buy, Re-Sequence Job)
- Owner/Assignment info

### Section B: Exception/Action Queue (always visible)
**Purpose**: Lots requiring immediate action
**Columns**: Lot, Part, Location, Status, Expiry, Conflict Days, Alloc/Remaining, At-Risk Value, Next Action, Owner

---

## SUB-TAB 6: MRB PARTS

**Purpose**: Track Material Review Board holds blocking production

### KPI Strip
5 metrics: MRB Value, MRB Items count, Avg Age (days), Blocking Deliveries count, At-Risk Value

### MRB Impact List Table
**Columns**: MRB ID, Part, Lot, Qty, Value, Age (days), Disposition badge (Under Review/Rework/Scrap), Pegged Job (clickable link), At-Risk $, Suggested Lever
**Interaction**: Click pegged job to open job drawer

---

## SUB-TAB 7: CAPACITY TRACKING

**Purpose**: Identify and manage capacity bottlenecks

### View Controls
- **View Mode Toggle**: "Workflow Map" / "Bottleneck List"
- **Time Bucket Toggle**: "Daily" / "Weekly"
- **Show Filter**: "All Stations" / "Constrained Only" / "Jobs Impacted"

### KPI Strip
7 metrics: Bottleneck Stations, Shortfall (hrs), Jobs Impacted, Max Projected Delay, First Constraint Date, Primary Bottleneck (name + utilization %), Worst Cap Slack

### Workflow Map View
**Layout**: Map area (55%) + Station Drilldown (45%, conditional)

**Map Structure**:
- **Routing Layers** arranged left-to-right:
  - Op 10: SMT operations
  - Op 20-25: Sub-Assembly
  - Op 30: Final Assembly
  - Op 40: Test/QA
- Chevron arrows connect layers

**Station Node** (within each layer):
- Rounded card with colored border based on utilization:
  - GREEN border: <100% utilization
  - AMBER border: 100-130% utilization
  - RED border: >130% utilization
- Content:
  - Station ID + Utilization % badge
  - Station name
  - Product family chips (what goes through here)
  - Req/Avail hours metrics
  - Shortfall if overloaded
  - WIP jobs and queue age
  - Jobs impacted banner if causing delays
- **Selection**: Ring highlight when clicked
- **Downstream Highlight**: Subtle highlight on downstream stations when upstream selected

**Legend**: Explains node colors and selection states

**Station Drilldown Panel** (when station selected):
- Summary metrics (4 cards): Utilization, Shortfall, WIP/Queue, Max Delay
- Daily Load Line Chart: 7 days showing available vs required
- Pegged Jobs Table: Job, Program, Required Date, Hours, Status
- Recovery Levers list: Add OT, Cross-Train, Alternate Routing, Re-Sequence, Outsource
- Station Details: Owner, Shifts, WIP Hours, Queue Age, First Constraint, Alt Routing

### Bottleneck List View
**Purpose**: Tabular view ranked by impact
**Columns**: Station, Utilization %, Shortfall (hrs), First Constraint Date, Jobs Impacted, Max Delay, Earliest Req Date, Best Lever badge, Owner
**Interaction**: Click row to switch to workflow view with that station selected

### Aggregate Capacity Chart (always visible below)
**Type**: Grouped bar chart
**Shows**: All stations with Available vs Required hours
**Adapts to**: Daily or Weekly bucket based on toggle

---

## JOB DETAIL DRAWER (Slide-in Panel)

**Triggered by**: Clicking job row in any table
**Visual**: Fixed right-side panel, 520px wide, full height, shadow, slides in

### Drawer Header (sticky)
**Background**: Light gray
**Row 1**: Job ID (dark red text), Status badge, DPAS badge (if applicable), Close X button
**Row 2**: 4-column grid - Program, CLIN, Project name, Release Rank
**Row 3**: Date stack mini - Contract, IOP, PDM, Clear dates with drift from contract
**Row 4**: Gate status dots (5 gates) + Readiness progress bar + Business Priority badge
**Row 5** (conditional): Alert badges for failing/watching gates

### Drawer Sub-Tabs
**Tab Strip**: Summary | Materials | Quality/MRB | Routing | Shelf-Life | Capacity | Actions

### Summary Tab
**Decision Summary Banner**: Color matches status, shows release recommendation and buffer days

**Gate Status Matrix**:
- Row per gate: Status dot, Gate name, Pass/Watch/Fail badge, Clear date, Score bar (if applicable), Drift days

**Readiness Waterfall Chart**:
- SVG visualization showing score contribution from each category
- Bars build up from left to right showing cumulative score
- Color intensity based on how much penalty applied
- Table below explaining each gate's specific issue/reason

**Job Identity Card**: CLIN, DPAS, Product Family, Value, Confidence level, Business Priority

### Materials Tab
**Purpose**: Details on material constraints
**Top Gating Parts Table**: Part number, Net Available (color-coded), Need Qty, Need Date, Shortage status badge

### Quality/MRB Tab
**Summary Banner** (if MRB issues): Shows blocking MRB ID, required date vs clear ETA, slack days

**MRB Blockers Table**: MRB ID (clickable), Part, Lot, Qty, Location, Stage, Age, Disposition, Clear ETA, Slack, Lever, Owner

**Recovery Options** (when MRB row selected):
- "Can save" options: Green-themed cards with lever name, ETA, description, risk level
- "Cannot save" options: Grayed out cards showing options outside time window

**Action Controls**: Owner field, Next Action Date, Status/Notes, Escalate button (purple)

### Routing Tab
**Routing Status Banner**: Released/Not Released badge, approval count (X of Y)

**Approval Progress Bar**: Visual bar showing completion percentage

**Operation Routing Path**: Vertical list of operation steps
- Each step: Op number, Operation name, Station info, Status badge (Complete/In Queue/Pending)
- Visual connectors between steps

**Routing Details Card**: Workcenter, Product Family, Gate clear date, Released status

### Shelf-Life Tab
**Allocated Lots List**: Cards for each lot allocated to this job
- Part name, Flagged badge if expiring before use
- Lot ID, Expiry date, Planned use date

### Capacity Tab
**Capacity Gate Banner**: Gate status, slack days, bottleneck station name

**Station Metrics** (4 cards): Available hours, Required hours, Shortfall, Utilization %

**Utilization Bar**: Visual progress bar with threshold markers

**Daily Load Chart**: 7-day bar chart for the bottleneck station

**Recovery Levers List**: Prioritized options (Add OT, Cross-Train, Alternate Routing, Re-Sequence, Outsource)

**Link Button**: Opens full Capacity view for this station

### Actions Tab
**Summary Badge**: Total action count, critical gate count

**Action Items List**: Each action as a card
- Action description
- Priority badge (Critical/High/Medium)
- Status badge (In Progress/Open/Pending)
- Owner and target date

**Recommended Levers** (if failing gates): Emergency recovery options

---

## VISUAL DESIGN SYSTEM

### Color Coding

**Status Colors** (used consistently everywhere):
| Status | Background | Text | Border |
|--------|------------|------|--------|
| Ready/Pass | green-100 | green-700 | green-300 |
| Watch | amber-100 | amber-700 | amber-300 |
| Blocked/Fail | red-100 | red-700 | red-300 |

**Blocker Category Colors**:
| Category | Color Family |
|----------|--------------|
| None/Clear | Green |
| Materials Shortage | Red |
| MRB/Quality Hold | Purple |
| Shelf-Life Constraint | Orange |
| Capacity Constraint | Blue |
| Supplier Promise Slip | Amber |

**Primary Accent Color**: #8B0000 (dark red) - used for job IDs, chart bars, selection rings

### Typography Scale
- **KPI values**: text-lg to text-xl, font-bold
- **Card/section titles**: text-sm, font-bold
- **Table headers**: text-[9px] to text-[10px], font-semibold
- **Table cells**: text-[10px] to text-[11px]
- **Badges/labels**: text-[8px] to text-[9px]
- **Micro text**: text-[7px] to text-[8px]

### Spacing & Sizing
- **Card padding**: p-3 to p-4
- **Table cell padding**: Minimal (p-1 to p-2)
- **Gap between cards**: gap-2 to gap-4
- **Button heights**: h-6 to h-7
- **Badge text**: text-[7px] to text-[9px]
- **Input heights**: h-7

### Chart Styling
- **Grid lines**: Dashed, light gray (#e2e8f0)
- **Axis labels**: 9-10px font
- **Bar radius**: [0, 4, 4, 0] for horizontal, [4, 4, 0, 0] for vertical
- **Default bar color**: #8B0000 (dark red)

---

## INTERACTION PATTERNS

### Click-to-Filter
- Blocker breakdown bar → filters queue by blocker type
- Scatter plot point → filters to single job
- Driver cluster row → filters Quality NC tab by that cluster
- Root cause bar → filters Late Jobs tab by that cause

### Click-to-Drill
- Job table row → opens Job Detail Drawer
- Station node → opens Station Drilldown panel
- Lot row → opens Lot Detail drawer
- MRB row → expands/shows recovery options

### Toggle Controls
- Date Stack ON/OFF → shows/hides expanded date comparison rows
- View Mode switches (Baseline/Scenario, Gantt/Demand, Workflow/Bottleneck)
- Metric toggles (change which metric is shown on Y-axis)
- Status filter toggles (show/hide Ready/Watch/Blocked jobs)

### Hover Effects
- Table rows: Subtle background highlight on hover
- Gantt bars: Tooltip with job details
- Heatmap cells: Tooltip with breakdown
- Station nodes: Enhanced shadow

### Selection States
- Selected table row: Light blue or light gray background
- Selected station: Dark red ring highlight
- Selected lot: Dark red border
- Selected driver: Background tint + border

---

## WHAT EACH ELEMENT REPRESENTS (Business Context)

### Jobs
Manufacturing work orders that need to be scheduled and released to the production floor. Each job has:
- Required delivery date (from contract)
- Multiple date baselines (Contract, IOP, Delivery Plan, PDM)
- Readiness score (0-100) computed from 5 gates
- Business priority ranking
- Blocker category (if constrained)

### Gates (5 Readiness Gates)
Each gate has Pass/Watch/Fail status and a projected clear date:
1. **Materials**: Are all parts available?
2. **MRB (Quality)**: Are there material holds affecting this job?
3. **Routing**: Is the manufacturing routing released and approved?
4. **Capacity**: Is there enough machine/labor capacity?
5. **Supplier**: Are supplier deliveries on track?

### Readiness Score
Composite score (0-100) built from gate contributions:
- Materials: 40 points max
- Quality/MRB: 20 points max
- Capacity: 20 points max
- Supplier: 10 points max
- Shelf-Life: 10 points max

### Buffer Days
Days between the baseline required date and the projected clear date:
- Positive = ahead of schedule
- Negative = projected late (slip)

### Confidence Level
Forecast certainty: High/Med/Low based on data quality and gate stability

### Blocker Categories
Primary constraint preventing release:
- Materials Shortage
- MRB/Quality Hold
- Shelf-Life Constraint
- Capacity Constraint
- Supplier Promise Slip

### Workcenters/Stations
Manufacturing resources (machines, test stations, assembly areas) that jobs flow through

### MRB (Material Review Board)
Quality holds on inventory that must be dispositioned (accept, rework, or scrap) before use

### Lots
Batched inventory with manufacturing date and expiration date (for time-sensitive materials)

### Driver Clusters
Groupings of related quality issues by root cause (defect type + part family)

---

## IMPLEMENTATION NOTES

1. **Generate mock data** that demonstrates all visual states (Ready/Watch/Blocked jobs, passing/failing gates, positive/negative buffers, etc.)

2. **Make all interactive elements functional** even with mock data (filters, drill-downs, drawers)

3. **Implement all chart types** using Recharts or similar

4. **Build the custom Gantt chart** as SVG with proper hover tooltips

5. **Drawer should slide in from right** when job row is clicked

6. **Sub-tabs should maintain their own state** for view modes, selections, etc.

7. **Global filters should affect all sub-tabs** consistently

8. **Back buttons** on child tabs should return to Ready-to-Work with optional filter applied
