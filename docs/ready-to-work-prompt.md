# COMPLETE READY TO WORK / RELEASE TAB - EXHAUSTIVE V0 PROMPT

Copy this entire prompt to recreate the Ready to Work / Release tab with 100% fidelity. This is a 5000+ line component.

---

## OVERVIEW

Build a Ready to Work / Release manufacturing operations cockpit with 7 sub-tabs:
1. **Ready to Work** (PRIMARY - detailed below)
2. Quality NC Insights
3. Site Supply/Demand
4. Late Job Alerts
5. Shelf-Life Tracking
6. MRB Parts
7. Capacity Tracking

The component uses a job-centric data model with 5 gates (Materials, MRB, Routing, Capacity, Supplier), multi-baseline date comparison, and a scenario analysis mode.

---

## PART 1: IMPORTS & DEPENDENCIES

```typescript
"use client"
import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell, ZAxis, LineChart, Line, Legend, AreaChart, Area,
  PieChart, Pie,
} from "recharts"
import {
  X, Download, ChevronRight, ChevronDown, ArrowLeft, Filter, RotateCcw,
  AlertTriangle, CheckCircle2, Clock, ShieldAlert, Package,
  Search, ExternalLink, Info,
} from "lucide-react"
```

---

## PART 2: TYPE DEFINITIONS

```typescript
type ReadinessStatus = "Ready" | "Watch" | "Blocked"
type Confidence = "High" | "Med" | "Low"
type BlockerCategory = "Materials Shortage" | "MRB / Quality Hold" | "Shelf-Life Constraint" | "Capacity Constraint" | "Supplier Promise Slip" | "Other / Unknown"
type MrbStage = "Created" | "Review" | "Investigation" | "Disposition" | "Rework" | "Verification" | "Closed"

interface Job {
  id: string                    // "JOB-2026-0201"
  program: string               // "Manpack Radio"
  project: string               // "CLIN-0004 Manpack Lot 3"
  clin: string                  // "CLIN-0004"
  dpas: string | null           // "DO-A1" or null
  productFamily: string         // "Manpack"
  workcenter: string            // "WC-001 SMT Line 1"
  
  // Multi-baseline dates (ALL in YYYY-MM-DD format)
  requiredDate: string
  contractDate: string
  iopDate: string
  deliveryPlanDate: string
  pdmForecastDate: string
  earliestFeasibleClear: string
  plannedStart: string
  plannedFinish: string
  
  readinessStatus: ReadinessStatus
  readinessScore: number        // 0-100 (sum of gate scores)
  businessPriority: number      // 0-100
  primaryBlocker: BlockerCategory | "None"
  slipDays: number              // 0 or positive integer
  owner: string                 // "M. Torres"
  nextAction: string            // "Release to floor"
  confidence: Confidence
  value: number                 // dollar value e.g. 142000
  
  // Gate statuses (5 gates)
  gateStatus: {
    materials: { status: "Pass" | "Watch" | "Fail"; clearDate: string }
    mrb: { status: "Pass" | "Watch" | "Fail"; clearDate: string }
    routing: { status: "Pass" | "Watch" | "Fail"; clearDate: string }
    capacity: { status: "Pass" | "Watch" | "Fail"; clearDate: string }
    supplier: { status: "Pass" | "Watch" | "Fail"; clearDate: string }
  }
  
  // Routing status
  routingStatus: { 
    released: boolean
    approvals: number
    totalApprovals: number
    missingApprovals: string[]
  }
  
  // Readiness score breakdown (must sum to readinessScore)
  materialsScore: number   // max 40
  qualityScore: number     // max 20
  capacityScore: number    // max 20
  supplierScore: number    // max 10
  shelfLifeScore: number   // max 10
  
  // Detail data for drawer tabs
  gatingParts: { 
    part: string
    netAvail: number
    needQty: number
    needDate: string
    shortageDate: string  // "None" or date
  }[]
  
  mrbHolds: { 
    id: string            // "NCR-2026-0028"
    part: string
    lot: string
    qty: number
    location: string
    age: number           // days
    disposition: string   // "Under Review" | "Rework" | etc.
    blocks: string        // description
    stage: string
    sla: number
    clearETA: string
    owner: string
    nextActionDate: string
  }[]
  
  shelfLifeLots: { 
    lot: string
    part: string
    expiry: string
    plannedUse: string
    flagged: boolean
  }[]
  
  capacityDetail: { 
    workcenter: string
    availHrs: number
    reqHrs: number
    nextSlot: string
  }
}
```

---

## PART 3: COLOR HELPER FUNCTIONS

```typescript
const statusColor = (s: ReadinessStatus) =>
  s === "Ready" ? "bg-green-100 text-green-700 border-green-300" 
  : s === "Watch" ? "bg-amber-100 text-amber-700 border-amber-300" 
  : "bg-red-100 text-red-700 border-red-300"

const confColor = (c: Confidence) =>
  c === "High" ? "bg-green-100 text-green-700" 
  : c === "Med" ? "bg-amber-100 text-amber-700" 
  : "bg-red-100 text-red-700"

const blockerColor = (b: string) => {
  if (b === "None") return "bg-green-100 text-green-700"
  if (b.includes("Material")) return "bg-red-100 text-red-700"
  if (b.includes("MRB") || b.includes("Quality")) return "bg-purple-100 text-purple-700"
  if (b.includes("Shelf")) return "bg-orange-100 text-orange-700"
  if (b.includes("Capacity")) return "bg-blue-100 text-blue-700"
  if (b.includes("Supplier")) return "bg-amber-100 text-amber-700"
  return "bg-slate-100 text-slate-700"
}

const gateColor = (status: "Pass" | "Watch" | "Fail") =>
  status === "Pass" ? "bg-green-500" : status === "Watch" ? "bg-amber-400" : "bg-red-500"

const fmt = (n: number) => n.toLocaleString("en-US")
const fmtMoney = (n: number) => `$${(n / 1000).toFixed(0)}K`

const getBaselineDate = (job: Job, baseline: "contract" | "iop" | "deliveryPlan" | "pdmForecast") => {
  switch (baseline) {
    case "contract": return job.contractDate
    case "iop": return job.iopDate
    case "deliveryPlan": return job.deliveryPlanDate
    case "pdmForecast": return job.pdmForecastDate
  }
}

const bufferDays = (requiredDate: string, clearDate: string) =>
  Math.round((new Date(requiredDate).getTime() - new Date(clearDate).getTime()) / 86400000)
```

---

## PART 4: STATE VARIABLES (40+ variables)

```typescript
// Sub-tab navigation
const [activeSubTab, setActiveSubTab] = useState<string>("ready-to-work")

// Global filters
const [site, setSite] = useState("All")
const [programFilter, setProgramFilter] = useState("All")
const [horizon, setHorizon] = useState("14")  // "7" | "14" | "30" | "60"
const [demandBaseline, setDemandBaseline] = useState<"contract" | "iop" | "deliveryPlan" | "pdmForecast">("contract")
const [showDateStack, setShowDateStack] = useState(false)
const [statusToggles, setStatusToggles] = useState<ReadinessStatus[]>(["Ready", "Watch", "Blocked"])
const [searchQuery, setSearchQuery] = useState("")

// Drawer state
const [drawerJob, setDrawerJob] = useState<Job | null>(null)
const [drawerTab, setDrawerTab] = useState("summary")

// Blocker filter from chart click
const [blockerFilter, setBlockerFilter] = useState<string | null>(null)

// Scatter click filter
const [scatterSelectedId, setScatterSelectedId] = useState<string | null>(null)

// Gantt state
const [hoveredJob, setHoveredJob] = useState<string | null>(null)
const [showIopMarker, setShowIopMarker] = useState(false)
const [showPdmMarker, setShowPdmMarker] = useState(false)
const [ganttViewMode, setGanttViewMode] = useState<"baseline" | "scenario">("baseline")

// Quality NC tab state
const [ncDimension, setNcDimension] = useState("defect")
const [selectedDriverCluster, setSelectedDriverCluster] = useState<string | null>(null)
const [wcMetricToggle, setWcMetricToggle] = useState<"jobsBlocked" | "atRiskValue" | "reworkHrs" | "scrapCost">("jobsBlocked")

// Late jobs tab state
const [selectedAlertJob, setSelectedAlertJob] = useState<Job | null>(null)
const [alertWorkspaceTab, setAlertWorkspaceTab] = useState<"supply" | "demand">("supply")
const [rootCauseMetric, setRootCauseMetric] = useState<"count" | "slipDays" | "atRiskValue" | "blockedToShip">("count")
const [constraintFilter, setConstraintFilter] = useState<string | null>(null)

// Capacity state
const [capViewMode, setCapViewMode] = useState<"workflow" | "bottleneck">("workflow")
const [capTimeBucket, setCapTimeBucket] = useState<"daily" | "weekly">("daily")
const [capShowFilter, setCapShowFilter] = useState<"all" | "constrained" | "impacted">("all")
const [selectedStation, setSelectedStation] = useState<CapStation | null>(null)

// MRB state
const [selectedMrbId, setSelectedMrbId] = useState<string | null>(null)
const [mrbDetailOpen, setMrbDetailOpen] = useState(false)
const [mrbFilterFromTopBlockers, setMrbFilterFromTopBlockers] = useState<string | null>(null)

// Shelf-life state
const [shelfViewMode, setShelfViewMode] = useState<"gantt" | "demand">("gantt")
const [shelfExpiryThreshold, setShelfExpiryThreshold] = useState(14)
const [selectedShelfLot, setSelectedShelfLot] = useState<ShelfLot | null>(null)
const [expandedPartGroups, setExpandedPartGroups] = useState<Set<string>>(new Set())
```

---

## PART 5: SUB-TAB NAVIGATION

```jsx
<div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 overflow-x-auto">
  {[
    { id: "ready-to-work", label: "Ready to Work" },
    { id: "quality-nc", label: "Quality NC Insights" },
    { id: "supply-demand", label: "Site Supply/Demand" },
    { id: "late-jobs", label: "Late Job Alerts" },
    { id: "shelf-life", label: "Shelf-Life Tracking" },
    { id: "mrb-parts", label: "MRB Parts" },
    { id: "capacity", label: "Capacity Tracking" },
  ].map(tab => (
    <button
      key={tab.id}
      onClick={() => { setActiveSubTab(tab.id); setBlockerFilter(null); setScatterSelectedId(null) }}
      className={`px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
        activeSubTab === tab.id 
          ? "bg-white shadow-sm text-slate-900" 
          : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {tab.label}
    </button>
  ))}
</div>
```

---

## PART 6: GLOBAL FILTER BAR

```jsx
<Card className="border-slate-200">
  <CardContent className="py-3 px-4">
    <div className="flex items-center gap-3 flex-wrap">
      {/* Filter icon + label */}
      <div className="flex items-center gap-1.5">
        <Filter className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-[10px] text-slate-500 font-medium">Filters:</span>
      </div>
      
      {/* Site dropdown */}
      <Select value={site} onValueChange={setSite}>
        <SelectTrigger className="h-7 text-[10px] w-[100px]">
          <SelectValue placeholder="Site" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Sites</SelectItem>
          <SelectItem value="site-a">Site A</SelectItem>
          <SelectItem value="site-b">Site B</SelectItem>
        </SelectContent>
      </Select>
      
      {/* Program dropdown */}
      <Select value={programFilter} onValueChange={setProgramFilter}>
        <SelectTrigger className="h-7 text-[10px] w-[130px]">
          <SelectValue placeholder="Program" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Programs</SelectItem>
          <SelectItem value="Manpack Radio">Manpack Radio</SelectItem>
          <SelectItem value="Vehicle Mount">Vehicle Mount</SelectItem>
          <SelectItem value="Tactical HF Radio">Tactical HF Radio</SelectItem>
          <SelectItem value="Base Station">Base Station</SelectItem>
        </SelectContent>
      </Select>
      
      {/* Horizon dropdown */}
      <Select value={horizon} onValueChange={setHorizon}>
        <SelectTrigger className="h-7 text-[10px] w-[100px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7">Next 7 Days</SelectItem>
          <SelectItem value="14">Next 14 Days</SelectItem>
          <SelectItem value="30">Next 30 Days</SelectItem>
          <SelectItem value="60">Next 60 Days</SelectItem>
        </SelectContent>
      </Select>
      
      {/* Demand Baseline dropdown - HIGHLIGHTED with amber border */}
      <Select value={demandBaseline} onValueChange={setDemandBaseline}>
        <SelectTrigger className="h-7 text-[10px] w-[140px] border-amber-300 bg-amber-50">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="contract">Contract</SelectItem>
          <SelectItem value="iop">IOP (Expected Ship)</SelectItem>
          <SelectItem value="deliveryPlan">Delivery Plan</SelectItem>
          <SelectItem value="pdmForecast">PDM Forecast</SelectItem>
        </SelectContent>
      </Select>
      
      {/* Date Stack toggle */}
      <button
        onClick={() => setShowDateStack(!showDateStack)}
        className={`px-2 py-1 text-[10px] font-medium rounded border transition-colors ${
          showDateStack 
            ? "bg-blue-100 text-blue-700 border-blue-300" 
            : "bg-slate-50 text-slate-500 border-slate-200"
        }`}
      >
        Date Stack {showDateStack ? "ON" : "OFF"}
      </button>
      
      {/* Status toggles */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-slate-500">Show:</span>
        {(["Ready", "Watch", "Blocked"] as ReadinessStatus[]).map(s => (
          <button
            key={s}
            onClick={() => toggleStatus(s)}
            className={`px-2 py-1 text-[10px] font-medium rounded border transition-colors ${
              statusToggles.includes(s) ? statusColor(s) : "bg-slate-50 text-slate-400 border-slate-200"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      
      {/* Search input */}
      <div className="relative">
        <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search job/part/WO..."
          className="h-7 text-[10px] pl-7 w-[160px]"
        />
      </div>
      
      {/* Reset button */}
      <button onClick={resetFilters} className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">
        <RotateCcw className="w-3 h-3" /> Reset
      </button>
    </div>
  </CardContent>
</Card>
```

---

## PART 7: READY TO WORK TAB - RELEASE DECISION CARDS

6 KPI cards in a row (`grid-cols-6 gap-3`):

### Card 1: "Release Now" (green theme)
- Border: `border-green-200 bg-green-50/30`
- Label: `text-[10px] text-green-700 font-semibold`
- Value: Count of Ready jobs, `text-xl font-bold text-green-700`
- Subtext: `${fmtMoney(value)} value protected`, `text-[9px] text-green-600`

### Card 2: "Next Up" (amber theme)
- Border: `border-amber-200 bg-amber-50/30`
- Value: Count of Watch jobs
- Subtext: `Earliest clear: MM/DD`

### Card 3: "Intervention Required" (red theme)
- Border: `border-red-200 bg-red-50/30`
- Value: Count of Blocked + high-priority Watch jobs with low readiness
- Subtext: `${fmtMoney(value)} at risk`

### Card 4: "Earliest Contract at Risk" (neutral)
- Border: `border-slate-200`
- Value: Earliest contract date of at-risk jobs, `text-red-600`
- Subtext: `X jobs / Y CLINs`

### Card 5: "Max Projected Slip" (neutral)
- Value: `Xd`, `text-red-600`
- Subtext: `X jobs slipping`

### Card 6: "Confidence Mix" (neutral)
- Values: `XH YM ZL` in green/amber/red
- Progress bar: 3 colored segments (`h-1.5 rounded-full`)

---

## PART 8: PRIORITY CHAIN STRIP

```jsx
<Card className="border-slate-200 bg-slate-50">
  <CardContent className="py-2 px-4">
    <div className="flex items-center gap-2 text-[10px]">
      <span className="text-slate-400 font-medium">Ranking Logic:</span>
      {[
        { label: "SIOP Priority", desc: "DPAS / CLIN / Leadership" },
        { label: "CLIN" },
        { label: "Project" },
        { label: "Job / WO" },
        { label: "Gates", desc: "Mat / MRB / Routing / Cap / Supplier" },
        { label: "Release Rank" },
      ].map((step, i, arr) => (
        <span key={step.label} className="flex items-center gap-1">
          <span className="bg-white border border-slate-200 rounded px-1.5 py-0.5 font-medium text-slate-700">
            {step.label}
          </span>
          {step.desc && <span className="text-[8px] text-slate-400">({step.desc})</span>}
          {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-slate-300" />}
        </span>
      ))}
    </div>
  </CardContent>
</Card>
```

---

## PART 9: RELEASE TIMELINE GANTT CHART

This is a custom SVG-based Gantt chart with the following features:

### Header
- Title: "Release Timeline Gantt"
- Subtitle changes based on view mode:
  - Baseline: "Sorted by baseline required date. Solid bar = planned window. Striped extension = projected slip. Diamond = baseline date."
  - Scenario: "Scenario Analysis: Re-prioritized to maximize on-time delivery. Pull forward recoverable jobs, deprioritize blocked ones."

### View Toggle (right side of header)
```jsx
<div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5 mr-2">
  <button
    onClick={() => setGanttViewMode("baseline")}
    className={`px-2.5 py-1 text-[9px] font-semibold rounded-md transition-all ${
      ganttViewMode === "baseline" 
        ? "bg-white text-slate-800 shadow-sm" 
        : "text-slate-500 hover:text-slate-700"
    }`}
  >
    Baseline View
  </button>
  <button
    onClick={() => setGanttViewMode("scenario")}
    className={`px-2.5 py-1 text-[9px] font-semibold rounded-md transition-all ${
      ganttViewMode === "scenario" 
        ? "bg-blue-600 text-white shadow-sm" 
        : "text-slate-500 hover:text-slate-700"
    }`}
  >
    Scenario Analysis
  </button>
</div>
```

### Legend
- On-time: green box with border
- Near-Ready: amber box with border
- Blocked: red box with border
- Slip: striped pattern (45deg hatching)
- Baseline: black diamond shape
- IOP: blue triangle (toggle button)
- PDM: purple circle (toggle button)

### SVG Structure
- **Total width**: labelW (170px) + chartW (calculated based on days)
- **Row height**: 36px
- **Header height**: 28px
- **Day column width**: calculated (typically 44px per day)

### Date Headers
- Date labels centered in each column
- Weekend columns have lighter background (`fill="#f8fafc" opacity={0.4}`)
- Today line: blue dashed vertical line with "Today" label

### Each Job Row Contains:

**1. Left Label Area (170px wide):**
- Job ID: `text-[9px] font-semibold fill="#1e293b"`
- Program + Req date: `text-[7px] fill="#64748b"`
- Score badge: 24x14px rounded rect with score value
- Scenario recommendation badge (only in scenario mode): 65x12px with action label

**2. Gantt Bar:**
- **Solid bar**: From `plannedStart` to min(`earliestFeasibleClear`, `contractDate`)
- **Colors by status**:
  - Ready: `fill="#dcfce7" stroke="#22c55e"`
  - Watch: `fill="#fef3c7" stroke="#f59e0b"`
  - Blocked: `fill="#fecaca" stroke="#ef4444"`
- **Date label on bar** (if width > 30px): shows `start - end` dates
- **Striped extension** (if late): hatched pattern from contract date to clear date
  - Uses SVG pattern: `url(#slipHatchRed)` or `url(#slipHatchAmber)`

**3. Baseline Marker:**
- Diamond shape at contract date position
- `fill="#1e293b" opacity={0.85}`
- Points: creates rotated square

**4. Buffer Label:**
- Position: right of bar
- Format: `+Xd` (green) or `-Xd` (red)
- `text-[8px] font-bold`

**5. Optional IOP Marker (blue triangle):**
- Only shown when `showIopMarker` is true
- `fill="#2563eb"`

**6. Optional PDM Marker (purple circle):**
- Only shown when `showPdmMarker` is true
- `fill="#f3e8ff" stroke="#9333ea"`

**7. Gate Dots (below bar):**
- Red circles for failing gates with letter (M/Q/R/C/S)
- Amber circles for watch gates
- `r={5} fill="#fef2f2" stroke="#ef4444"`

**8. Scenario Pull-Forward Arrow (in scenario mode):**
- Blue dashed line with arrow
- "PULL Xd" label
- Only shown for recoverable late jobs

**9. Hover Tooltip:**
- White background with shadow
- Shows: Job ID, Program, CLIN, Score, Priority, Buffer
- Shows: Planned dates, Contract date, Projected clear
- Shows: Blocker or Next action
- In scenario mode: shows recommendation

### SVG Patterns (in defs)
```jsx
<defs>
  <pattern id="slipHatchRed" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
    <rect width="6" height="6" fill="#fef2f2" />
    <line x1="0" y1="0" x2="0" y2="6" stroke="#fca5a5" strokeWidth="2" />
  </pattern>
  <pattern id="slipHatchAmber" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
    <rect width="6" height="6" fill="#fffbeb" />
    <line x1="0" y1="0" x2="0" y2="6" stroke="#fcd34d" strokeWidth="2" />
  </pattern>
  <filter id="ganttShadow" x="-4" y="-4" width="108%" height="130%">
    <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.1" />
  </filter>
</defs>
```

### Scenario Recommendations
```typescript
const getScenarioRecommendation = (job: Job) => {
  const buffer = bufferDays(getBaselineDate(job, demandBaseline), job.earliestFeasibleClear)
  const failCount = Object.values(job.gateStatus).filter(g => g.status === "Fail").length
  
  if (failCount >= 3 || job.readinessStatus === "Blocked") {
    return { action: "DEPRIORITIZE", color: "#dc2626", bgColor: "#fef2f2", desc: "Push back - blocked" }
  }
  if (buffer >= 0 && job.readinessScore >= 80) {
    return { action: "RELEASE", color: "#15803d", bgColor: "#dcfce7", desc: "Release now" }
  }
  if (buffer < 0 && buffer >= -5 && job.readinessScore >= 60) {
    return { action: "PULL FWD", color: "#2563eb", bgColor: "#dbeafe", desc: `Pull ${Math.abs(buffer)}d forward` }
  }
  if (buffer < 0 && buffer >= -7) {
    return { action: "EXPEDITE", color: "#d97706", bgColor: "#fef3c7", desc: "Expedite gates" }
  }
  if (buffer < -7) {
    return { action: "RESCHEDULE", color: "#7c3aed", bgColor: "#f3e8ff", desc: "Negotiate new date" }
  }
  return { action: "MONITOR", color: "#64748b", bgColor: "#f1f5f9", desc: "Watch status" }
}
```

---

## PART 10: THREE-LANE DECISION VIEW

### Baseline View Lanes:
1. **Lane A: "RELEASE NOW"** (green)
   - `border-l-green-500 bg-green-50`
   - Jobs: Ready status + businessPriority >= 70 + confidence === "High"
   
2. **Lane B: "NEXT UP (NEAR-READY)"** (amber)
   - `border-l-amber-400 bg-amber-50`
   - Jobs: (Watch OR Ready) AND <=2 failing gates AND buffer >= -7
   
3. **Lane C: "INTERVENTION REQUIRED"** (red)
   - `border-l-red-500 bg-red-50`
   - Jobs: All remaining

### Scenario View Lanes:
1. **Lane A: "PULL FORWARD"** (blue)
   - `border-l-blue-500 bg-blue-50`
   - Jobs with slip that can meet baseline if started earlier
   - Condition: buffer < 0 AND buffer >= -5 AND readinessScore >= 60 AND failCount <= 1
   
2. **Lane B: "ON-TIME (CAN DEFER)"** (green)
   - On-time jobs with good readiness
   - Condition: buffer >= 0 AND readinessScore >= 70 AND failCount === 0
   
3. **Lane C: "DEPRIORITIZE"** (red)
   - Blocked or severely late
   - Condition: failCount >= 2 OR buffer < -7 OR readinessStatus === "Blocked"
   
4. **Lane D: "MONITOR"** (slate) - only if jobs exist
   - Everything else

### Scenario Analysis Banner (blue panel)
```jsx
<div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
  <div className="flex items-start gap-3">
    <div className="bg-blue-100 rounded-full p-1.5">
      <svg className="w-4 h-4 text-blue-600">
        {/* Lightning bolt icon */}
      </svg>
    </div>
    <div className="flex-1">
      <h4 className="text-xs font-bold text-blue-900">Scenario Analysis: Maximize On-Time Delivery</h4>
      <p className="text-[10px] text-blue-700 mt-0.5">
        Jobs re-prioritized to complete more work before baseline dates...
      </p>
      <div className="flex items-center gap-4 mt-2 text-[9px]">
        <span>Pull Forward: {count} jobs</span>
        <span>Can Defer: {count} jobs</span>
        <span>Deprioritize: {count} jobs</span>
      </div>
    </div>
  </div>
</div>
```

### Lane Card Structure
```jsx
<Card className={`border-slate-200 border-l-4 ${lane.borderColor}`}>
  <CardHeader className={`pb-1.5 pt-3 px-4 ${lane.bgHeader}`}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <CardTitle className="text-xs font-bold">{lane.id}. {lane.label}</CardTitle>
        <Badge className="text-[9px] bg-white/80 text-slate-700">{lane.jobs.length} jobs</Badge>
      </div>
      <p className="text-[9px] text-slate-500">{lane.desc}</p>
    </div>
    {/* Top Drivers buttons */}
    <div className="flex items-center gap-1.5 mt-1">
      <span className="text-[8px] text-slate-400">Top Drivers:</span>
      {blockerCounts.slice(0, 3).map(([cat, count]) => (
        <button
          onClick={() => setBlockerFilter(prev => prev === cat ? null : cat)}
          className={`text-[8px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
            blockerFilter === cat 
              ? "bg-[#8B0000] text-white border-[#8B0000]" 
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
          }`}
        >
          {cat.split(" ")[0]} ({count})
        </button>
      ))}
    </div>
  </CardHeader>
  <CardContent className="p-0">
    <ReleaseTable jobs={lane.jobs} rankOffset={offset} />
  </CardContent>
</Card>
```

### ReleaseTable Columns (14-16 columns)
1. **#** - Rank number, `w-8`
2. **Job / WO** - `text-[#8B0000] font-bold`
3. **CLIN** - With DPAS badge if present
4. **Program / Project** - Program + project suffix
5. **[Scenario only] Rec. Start** - Recommended start date with pull indicator
6. **Baseline Req** - From demandBaseline
7. **Projected** - earliestFeasibleClear
8. **Buffer** - Colored: red if <0, amber if <=3, green otherwise
9. **[Scenario only] Action** - Badge with recommendation
10. **Biz Pri** - businessPriority
11. **Ready** - readinessScore
12. **Conf** - Confidence badge
13. **Primary Blocker** - Colored badge
14. **Gates** - 5 colored dots (M/Q/R/C/S)
15. **Next Best Action** - Truncated to 140px
16. **Owner** - Owner name

### Date Stack Row (conditional)
When `showDateStack` is true, an expandable row appears below each job showing:
- Contract, IOP, Del Plan, PDM, Projected dates
- Drift indicators (e.g., "+3d" or "-2d" from contract)

---

## PART 11: INSIGHT PANELS (2/3 + 1/3 grid)

### Left (col-span-2): Prioritization Matrix

```jsx
<Card className="col-span-2 border-slate-200">
  <CardHeader className="pb-2">
    <CardTitle className="text-sm">Prioritization Matrix</CardTitle>
    <p className="text-[10px] text-slate-500">X = Business Priority, Y = Readiness. Click a point to filter queue.</p>
  </CardHeader>
  <CardContent>
    <div className="relative">
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            type="number" dataKey="x" name="Business Priority" 
            domain={[0, 100]} tick={{ fontSize: 10 }} 
            label={{ value: "Business Priority Score", position: "bottom", fontSize: 10, offset: 15 }} 
          />
          <YAxis 
            type="number" dataKey="y" name="Readiness" 
            domain={[0, 100]} tick={{ fontSize: 10 }} 
            label={{ value: "Readiness Score", angle: -90, position: "insideLeft", fontSize: 10 }} 
          />
          <ZAxis range={[80, 80]} />
          <Tooltip />
          <Scatter data={scatterData} cursor="pointer" onClick={...}>
            {scatterData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.status === "Ready" ? "#22c55e" : entry.status === "Watch" ? "#eab308" : "#ef4444"}
                stroke={scatterSelectedId === entry.id ? "#1e293b" : "transparent"}
                strokeWidth={scatterSelectedId === entry.id ? 2 : 0}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      
      {/* Quadrant labels */}
      <div className="absolute top-6 right-8 text-[9px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Release Now</div>
      <div className="absolute top-6 left-14 text-[9px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Backlog Ready</div>
      <div className="absolute bottom-12 right-8 text-[9px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Recover Fast</div>
      <div className="absolute bottom-12 left-14 text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">Don't Touch</div>
    </div>
  </CardContent>
</Card>
```

### Right: Primary Blocker Breakdown

```jsx
<Card className="border-slate-200">
  <CardHeader className="pb-2">
    <CardTitle className="text-sm">Primary Blocker Breakdown</CardTitle>
    <p className="text-[10px] text-slate-500">Click a bar to filter queue</p>
  </CardHeader>
  <CardContent>
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={blockerBreakdown} layout="vertical" margin={{ left: 10, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" tick={{ fontSize: 10 }} />
        <YAxis type="category" dataKey="shortLabel" tick={{ fontSize: 9 }} width={70} />
        <Tooltip />
        <Bar
          dataKey="count"
          fill="#8B0000"
          radius={[0, 4, 4, 0]}
          cursor="pointer"
          onClick={(data) => setBlockerFilter(...)}
        />
      </BarChart>
    </ResponsiveContainer>
    {blockerFilter && (
      <div className="mt-2 flex items-center gap-2">
        <Badge className="text-[9px] bg-slate-100 text-slate-700">Filtered: {blockerFilter}</Badge>
        <button onClick={() => setBlockerFilter(null)} className="text-[10px] text-blue-600 hover:underline">Clear</button>
      </div>
    )}
  </CardContent>
</Card>
```

---

## PART 12: JOB DETAIL DRAWER

The drawer opens when clicking any job row. It has 7 tabs.

### Drawer Header
```jsx
<div className="p-4 border-b border-slate-200 bg-slate-50">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold text-[#8B0000]">{drawerJob.id}</span>
      <Badge className={statusColor(drawerJob.readinessStatus)}>
        {drawerJob.readinessStatus} ({drawerJob.readinessScore})
      </Badge>
      {drawerJob.dpas && (
        <Badge className="bg-red-100 text-red-700 text-[8px]">{drawerJob.dpas}</Badge>
      )}
    </div>
    <button onClick={() => setDrawerJob(null)}>
      <X className="w-4 h-4 text-slate-400" />
    </button>
  </div>
  
  {/* 2-row identity block */}
  <div className="grid grid-cols-4 gap-2 mt-2 text-[10px]">
    <div><span className="text-slate-400">Program:</span> <span className="font-medium">{drawerJob.program}</span></div>
    <div><span className="text-slate-400">CLIN:</span> <span className="font-medium">{drawerJob.clin}</span></div>
    <div><span className="text-slate-400">Project:</span> <span className="font-medium">{drawerJob.project}</span></div>
    <div><span className="text-slate-400">Release Rank:</span> <span className="font-medium">{rank}</span></div>
  </div>
  
  {/* Date stack mini */}
  <div className="flex items-center gap-3 mt-2 text-[9px]">
    {["Contract", "IOP", "PDM", "Clear"].map(label => (
      <span className="flex items-center gap-1">
        <span className="text-slate-400">{label}:</span>
        <span className="font-medium">{date}</span>
        {drift !== 0 && <span className={drift < 0 ? "text-red-500" : "text-green-500"}>({drift}d)</span>}
      </span>
    ))}
    <Badge className={buffer < 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}>
      Buffer: {buffer}d
    </Badge>
  </div>
  
  {/* Gate status dots + readiness bar */}
  <div className="flex items-center gap-3 mt-2">
    <div className="flex items-center gap-1">
      {["materials", "mrb", "routing", "capacity", "supplier"].map((g, i) => (
        <div key={g} className="flex flex-col items-center gap-0.5">
          <div className={`w-3 h-3 rounded-full ${gateColor(gates[g].status)}`} />
          <span className="text-[7px] text-slate-400">{["MAT", "MRB", "RTG", "CAP", "SUP"][i]}</span>
        </div>
      ))}
    </div>
    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
      <div 
        className={`h-full rounded-full ${statusBgColor}`} 
        style={{ width: `${readinessScore}%` }} 
      />
    </div>
    <Badge className="text-[9px]">Pri: {businessPriority}</Badge>
  </div>
  
  {/* Gate alert badges */}
  <div className="flex flex-wrap gap-1 mt-2">
    {failingGates.map(g => (
      <Badge className="text-[8px] bg-red-100 text-red-700">FAIL: {g}</Badge>
    ))}
    {watchGates.map(g => (
      <Badge className="text-[8px] bg-amber-100 text-amber-700">WATCH: {g}</Badge>
    ))}
  </div>
</div>
```

### Drawer Tabs
```jsx
<div className="flex items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-4">
  {["summary", "materials", "mrb", "routing", "shelf-life", "capacity", "actions"].map(tab => (
    <button
      onClick={() => setDrawerTab(tab)}
      className={`px-3 py-2 text-[10px] font-medium border-b-2 -mb-px transition-colors ${
        drawerTab === tab 
          ? "border-[#8B0000] text-[#8B0000]" 
          : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      {tabLabel}
    </button>
  ))}
</div>
```

### Summary Tab

**A) Decision Summary Banner:**
```jsx
<div className={`p-3 rounded border ${bannerColor}`}>
  <p className="text-[11px] font-bold">Release Decision: {decision}</p>
  <p className="text-[10px] mt-1">Primary Blocker: {primaryBlocker}</p>
  <p className="text-[10px] mt-0.5">Next Action: {nextAction}</p>
</div>
```

**B) Gate Status Matrix:**
5 rows showing:
- Gate name with colored dot
- Status badge (Pass/Watch/Fail)
- Clear date
- Score contribution bar (if applicable)
- Buffer to gate clear

**C) Readiness Waterfall Chart (SVG):**
- Start bar at 100
- 5 penalty bars (Materials -max40, MRB -max20, Capacity -max20, Supplier -max10, Shelf-Life -max10)
- End bar showing final score
- Connector lines between bars
- Color coding based on penalty size
- Running total labels
- Clickable bars to navigate to detail tab

**D) Gate Detail Reasons:**
Dynamic reason text for each gate based on job data

### Materials Tab
- Materials Gate Banner with status
- Gating Parts Table (Part, Net Available, Need Qty, Need Date, Shortage Date, Slack)
- Recovery Options Section (On-Hand, WIP, 3PL, In-Transit PO, Open PO, Alternate Part)

### Quality/MRB Tab
- Summary Banner with blocking MRB info
- MRB Blockers Table (ID, Part, Lot, Qty, Location, Stage, Age, Disposition, Clear ETA, Slack, Lever, Owner)
- Recovery Options (Can save / Cannot save sections)
- MRB Detail Sub-Panel with Stage Timeline (7 stages with SLA tracking)

### Routing Tab
- Routing Status Banner (Released/Not Released)
- Approval Progress bar
- Operation Routing Path (4 steps: SMT, Sub-Assembly, Final Assembly, Test/QA)
- Routing Details grid

### Shelf-Life Tab
- Shelf-Life Gate Banner
- Flagged lots list with expiry warnings

### Capacity Tab
- Capacity Gate Banner with slack
- Station Metrics grid (Available hrs, Required hrs, Shortfall, Utilization)
- Utilization Bar with overflow indicator
- Daily Load Chart (7-day BarChart)
- Recovery Levers (OT, Cross-Train, Alternate Routing, Re-Sequence, Outsource)

### Actions Tab
- Recovery & Action Plan Header
- Action Items List (primary action + generated actions per failing gate)
- Recommended Levers (Emergency Procurement, Parallel Disposition, OT/Cross-Train, Alt Supplier, Escalate)

---

## PART 13: SAMPLE DATA STRUCTURE

Generate 10 jobs with realistic data:

```typescript
const generateJobs = (): Job[] => [
  {
    id: "JOB-2026-0201",
    program: "Manpack Radio",
    project: "CLIN-0004 Manpack Lot 3",
    clin: "CLIN-0004",
    dpas: "DO-A1",
    productFamily: "Manpack",
    workcenter: "WC-001 SMT Line 1",
    requiredDate: "2026-02-12",
    contractDate: "2026-02-12",
    iopDate: "2026-02-14",
    deliveryPlanDate: "2026-02-12",
    pdmForecastDate: "2026-02-13",
    earliestFeasibleClear: "2026-02-11",
    plannedStart: "2026-02-10",
    plannedFinish: "2026-02-11",
    readinessStatus: "Ready",
    readinessScore: 94,
    businessPriority: 92,
    primaryBlocker: "None",
    slipDays: 0,
    owner: "M. Torres",
    nextAction: "Release to floor",
    confidence: "High",
    value: 142000,
    gateStatus: {
      materials: { status: "Pass", clearDate: "2026-02-10" },
      mrb: { status: "Pass", clearDate: "2026-02-10" },
      routing: { status: "Pass", clearDate: "2026-02-10" },
      capacity: { status: "Pass", clearDate: "2026-02-10" },
      supplier: { status: "Pass", clearDate: "2026-02-10" }
    },
    routingStatus: { released: true, approvals: 5, totalApprovals: 5, missingApprovals: [] },
    materialsScore: 38,
    qualityScore: 20,
    capacityScore: 18,
    supplierScore: 10,
    shelfLifeScore: 8,
    gatingParts: [...],
    mrbHolds: [],
    shelfLifeLots: [],
    capacityDetail: { workcenter: "WC-001", availHrs: 48, reqHrs: 32, nextSlot: "Feb 10" }
  },
  // ... 9 more jobs with varying statuses
]
```

**Distribution:**
- 3 Ready jobs (scores 82-94, all gates Pass)
- 4 Watch jobs (scores 55-68, 1-2 gates Fail/Watch)
- 3 Blocked jobs (scores 22-35, 3+ gates Fail)

**Programs:** Manpack Radio, Vehicle Mount, Tactical HF Radio, Base Station
**DPAS ratings:** DO-A1, DO-A2, DO-C3, null
**Workcenters:** WC-001 SMT Line 1, WC-002 SMT Line 2, WC-003 Final Assy A, WC-004 Test Station 1, WC-005 Cable Assy, WC-006 Display Integ

---

## VISUAL STYLING SUMMARY

**Primary brand color:** `#8B0000` (dark red)
- Used for: Job IDs, selected states, chart bars, primary actions

**Layout:**
- `space-y-4` main container
- Cards: `border-slate-200`
- Headers: `py-3 px-4`

**Typography:**
- KPI labels: `text-[10px] font-semibold`
- KPI values: `text-xl font-bold`
- Table headers: `text-[9px] font-semibold text-slate-600`
- Table cells: `text-[10px]`

**Status colors:**
- Ready: `bg-green-100 text-green-700 border-green-300`
- Watch: `bg-amber-100 text-amber-700 border-amber-300`
- Blocked: `bg-red-100 text-red-700 border-red-300`

**Gate colors:**
- Pass: `bg-green-500`
- Watch: `bg-amber-400`
- Fail: `bg-red-500`

**Blocker colors:**
- Materials: `bg-red-100 text-red-700`
- MRB/Quality: `bg-purple-100 text-purple-700`
- Shelf-Life: `bg-orange-100 text-orange-700`
- Capacity: `bg-blue-100 text-blue-700`
- Supplier: `bg-amber-100 text-amber-700`

**Interactive elements:**
- Clickable rows: `hover:bg-slate-50 cursor-pointer`
- Selected rows: `bg-[color]-50 border-l-2 border-l-[#8B0000]`
- Clickable chart elements: `cursor-pointer`
- Filter badges with clear buttons

---

## END OF PROMPT

This prompt covers the complete Ready to Work tab including:
- All 40+ state variables
- Complete global filter bar with all controls
- 6 KPI decision cards with exact calculations
- Priority chain strip visualization
- Full SVG Gantt chart with baseline/scenario modes
- Three-lane decision view with all columns
- Prioritization matrix scatter chart
- Blocker breakdown horizontal bar chart
- Complete 7-tab job detail drawer
- All helper functions and color utilities
- Complete sample data structure
