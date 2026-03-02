"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Slider } from "@/components/ui/slider"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ComposedChart, Cell, ScatterChart, Scatter, ZAxis, ReferenceLine, ReferenceArea, Area, AreaChart } from "recharts"
import { Calendar, Filter, Download, X, ChevronRight, ChevronDown, ChevronUp, AlertTriangle, Clock, Package, Users, TrendingUp, Activity, Target, Zap, ExternalLink, MessageSquare, FileText, RefreshCw } from "lucide-react"
import { SupplierOTD } from "./supplier-otd"
import {
  getOTDDeliveries,
  generateOTDKPIs,
  generateSupplierRisks,
  generatePOLineRisks,
  generateMRBQueue,
  generateTimeBuckets,
  type OTDDelivery,
  type OTDStatus,
  type DriverCategory,
  type TimeBucket,
  type MRBStep,
  type FactoryReason,
  type MRBReason,
  type PlanningReason,
  type Workcenter,
} from "@/lib/otd-tracking-data"

type OTDSubTab = "overview" | "program-manager" | "planner" | "supply-chain" | "quality" | "siop" | "supplier-otd"

// Color palettes for deep-dive analysis charts
// Factory reasons cover all shop-floor blocking issues (not just "capacity")
const FACTORY_REASON_COLORS: Record<string, string> = {
  "Machine Downtime": "#EF4444", // red - equipment failures
  "Staffing Shortage": "#F97316", // orange - personnel issues
  "Setup/Changeover": "#EAB308", // yellow - setup delays
  "Rework/Yield Loss": "#22C55E", // green - quality/yield
  "Test Constraint": "#06B6D4", // cyan - test bottlenecks
  "Workcenter Queue": "#3B82F6", // blue - queue/WIP
  "Tool/Fixture Unavailable": "#8B5CF6", // violet - tooling
  "Quality Hold": "#EC4899", // pink - quality holds
  "Unknown Factory": "#6B7280", // gray
}

const MRB_REASON_COLORS: Record<string, string> = {
  "RI Backlog": "#EF4444",
  "MRB Review Pending": "#F97316",
  "Disposition Pending": "#EAB308",
  "Rework Required": "#22C55E",
  "Retest/Re-inspection": "#06B6D4",
  "Waiting on Engineering": "#3B82F6",
  "Waiting on Supplier": "#8B5CF6",
  "Unknown MRB": "#6B7280",
}

const PLANNING_REASON_COLORS: Record<string, string> = {
  "Plan Date Behind Contract": "#EF4444",
  "Forecast Mismatch": "#F97316",
  "Contract Change Not Reflected": "#EAB308",
  "Sequencing/Priority Issue": "#3B82F6",
  "Unknown Planning": "#6B7280",
}

const DRIVER_COLORS: Record<DriverCategory, string> = {
  Supply: "#3B82F6",
  "MRB/RI": "#F97316",
  Factory: "#8B5CF6",
  Planning: "#10B981",
}

const STATUS_COLORS: Record<OTDStatus, string> = {
  "On-Time": "#10B981",
  Late: "#EF4444",
  "At-Risk": "#F59E0B",
  Outstanding: "#6B7280",
}

const fmtDate = (d: Date | null) => (d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "-")
const fmtPct = (n: number) => `${n.toFixed(1)}%`

export function OTDTracking() {
  const [activeSubTab, setActiveSubTab] = useState<OTDSubTab>("overview")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState<OTDDelivery | null>(null)
  const [focusPanelOpen, setFocusPanelOpen] = useState(true)
  const [deltaThreshold, setDeltaThreshold] = useState([7])
  const [siopView, setSiopView] = useState<"Program" | "Site" | "Product Line">("Program")
  
  // Program Manager specific state
  const [pmSelectedManager, setPmSelectedManager] = useState<string>("all")
  const [pmSelectedPrograms, setPmSelectedPrograms] = useState<string[]>([])
  const [pmHorizon, setPmHorizon] = useState<14 | 30 | 60 | 90>(30)
  const [pmMode, setPmMode] = useState<"upcoming" | "backlog">("upcoming")
  const [pmIncludeAllBacklog, setPmIncludeAllBacklog] = useState(false)
  const [pmCustomerCommsOnly, setPmCustomerCommsOnly] = useState(false)
  const [pmSelectedProgram, setPmSelectedProgram] = useState<string | null>(null)
  const [pmDefinitionsOpen, setPmDefinitionsOpen] = useState(false)
  const [pmActiveOwnerTab, setPmActiveOwnerTab] = useState<string>("Supply Chain/Buyer")
  const [pmShowMissingDates, setPmShowMissingDates] = useState(false)

  // Global Filters
  const [selectedSites, setSelectedSites] = useState<string[]>([])
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([])
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])
  const [selectedCommodities, setSelectedCommodities] = useState<string[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [timeBucket, setTimeBucket] = useState<TimeBucket>("Month")
  const [chartFilter, setChartFilter] = useState<{ driver?: DriverCategory; program?: string; supplier?: string } | null>(null)
  const [driverFilter, setDriverFilter] = useState<DriverCategory | null>(null)

  // Program Manager → Programs mapping config (uses actual program names from data)
  const programManagerMapping: Record<string, string[]> = {
    "John Smith": ["Manpack Radio", "Vehicle Mount"],
    "Sarah Johnson": ["Tactical HF Radio", "Base Station"],
    "Mike Chen": ["Maritime HF", "Airborne UHF"],
  }
  const programManagers = Object.keys(programManagerMapping)

  // Data
  const allDeliveries = useMemo(() => getOTDDeliveries(), [])

  const filteredDeliveries = useMemo(() => {
    let result = allDeliveries
    if (selectedSites.length > 0) result = result.filter(d => selectedSites.includes(d.site))
    if (selectedPrograms.length > 0) result = result.filter(d => selectedPrograms.includes(d.program))
    if (selectedSuppliers.length > 0) result = result.filter(d => selectedSuppliers.includes(d.supplier))
    if (selectedCommodities.length > 0) result = result.filter(d => selectedCommodities.includes(d.commodity))
    if (selectedStatus !== "all") result = result.filter(d => d.otdStatus === selectedStatus)
    if (chartFilter?.driver) result = result.filter(d => d.driver === chartFilter.driver)
    if (chartFilter?.program) result = result.filter(d => d.program === chartFilter.program)
    if (chartFilter?.supplier) result = result.filter(d => d.supplier === chartFilter.supplier)
    if (driverFilter) result = result.filter(d => d.driver === driverFilter)
    return result
  }, [allDeliveries, selectedSites, selectedPrograms, selectedSuppliers, selectedCommodities, selectedStatus, chartFilter, driverFilter])

  const kpis = useMemo(() => generateOTDKPIs(filteredDeliveries), [filteredDeliveries])
  const supplierRisks = useMemo(() => generateSupplierRisks(filteredDeliveries), [filteredDeliveries])
  const poLineRisks = useMemo(() => generatePOLineRisks(filteredDeliveries), [filteredDeliveries])
  const mrbQueue = useMemo(() => generateMRBQueue(filteredDeliveries), [filteredDeliveries])
  const timeBuckets = useMemo(() => generateTimeBuckets(filteredDeliveries, timeBucket), [filteredDeliveries, timeBucket])

  // Unique filter options
  const sites = [...new Set(allDeliveries.map(d => d.site))]
  const programs = [...new Set(allDeliveries.map(d => d.program))]
  const suppliers = [...new Set(allDeliveries.map(d => d.supplier))]
  const commodities = [...new Set(allDeliveries.map(d => d.commodity))]

  // Derived: At-risk deliveries
  const atRiskDeliveries = filteredDeliveries.filter(d => d.otdStatus === "At-Risk" || d.otdStatus === "Late")
  const topAtRiskDeliveries = atRiskDeliveries.sort((a, b) => b.impactScore - a.impactScore).slice(0, 25)

  // Derived: Top driver
  const driverCounts = { Supply: 0, "MRB/RI": 0, Factory: 0, Planning: 0 }
  atRiskDeliveries.forEach(d => driverCounts[d.driver]++)
  const topDriver = Object.entries(driverCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as DriverCategory || "Supply"
  const supplyPct = atRiskDeliveries.length > 0 ? Math.round((driverCounts.Supply / atRiskDeliveries.length) * 100) : 0

  // PM Tab: Enrich all deliveries with resolved dates and computed fields
  // DueDateResolved = ContractDate > PromiseDate > ExpectedDate > ForecastDate > null
  // ExpectedDateResolved = ExpectedDate > PromiseDate > ForecastDate > null
  const pmEnrichedDeliveries = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayMs = today.getTime()
    
    return allDeliveries.map(d => {
      // Resolve DueDate with fallback chain
      const dueDateResolved = d.contractDate || d.promiseDate || d.expectedDate || d.forecastDate || null
      // Resolve ExpectedDate with fallback chain
      const expectedDateResolved = d.expectedDate || d.promiseDate || d.forecastDate || null
      
      // Days to due date (null if no resolved date)
      const daysToDue = dueDateResolved 
        ? Math.floor((dueDateResolved.getTime() - todayMs) / (24 * 60 * 60 * 1000))
        : null
      
      // At-Risk: DueDate in future AND ExpectedDateResolved > DueDateResolved
      const isAtRisk = dueDateResolved && expectedDateResolved && daysToDue !== null && daysToDue >= 0 
        && expectedDateResolved > dueDateResolved
      
      // Late: DueDate < Today AND not delivered (actualDate is null)
      const isLate = dueDateResolved && daysToDue !== null && daysToDue < 0 && !d.actualDate
      
      // Customer Comms Required: Late OR (DaysToDue <= 7 AND ExpectedDateResolved > DueDateResolved)
      const customerCommsRequired = isLate || (daysToDue !== null && daysToDue <= 7 && expectedDateResolved && dueDateResolved && expectedDateResolved > dueDateResolved)
      
      // Escalation owner derived from driver
      const escalationOwner = d.driver === "Supply" ? "Supply Chain/Buyer"
        : d.driver === "MRB/RI" ? "Quality/MRB"
        : d.driver === "Factory" ? "Factory/Operations"
        : "Production Planner"
      
      return { 
        ...d, 
        dueDateResolved, 
        expectedDateResolved,
        daysToDue, 
        isAtRisk,
        isLate,
        customerCommsRequired, 
        escalationOwner,
        // Keep legacy field for compatibility
        daysToContract: daysToDue ?? 999
      }
    })
  }, [allDeliveries])

  // PM: Check if selected program is outside PM's portfolio (for warning banner)
  const pmProgramOutsidePortfolio = useMemo(() => {
    if (pmSelectedManager === "all") return false
    const pmPrograms = programManagerMapping[pmSelectedManager] || []
    // Check explicit program selections
    if (pmSelectedPrograms.length > 0) {
      return pmSelectedPrograms.some(p => !pmPrograms.includes(p))
    }
    if (pmSelectedProgram) {
      return !pmPrograms.includes(pmSelectedProgram)
    }
    return false
  }, [pmSelectedManager, pmSelectedPrograms, pmSelectedProgram, programManagerMapping])

  // PM: Data Sanity counts using DISTINCT delivery IDs and resolved dates
  const pmDataSanity = useMemo(() => {
    // De-duplicate by delivery ID to ensure stable grain
    const uniqueDeliveries = new Map<string, typeof pmEnrichedDeliveries[0]>()
    pmEnrichedDeliveries.forEach(d => {
      if (!uniqueDeliveries.has(d.id)) uniqueDeliveries.set(d.id, d)
    })
    const allUnique = Array.from(uniqueDeliveries.values())
    
    // Total deliveries in dataset (all programs)
    const totalInDataset = allUnique.length
    
    // Selected program filter (if any)
    const selectedProg = pmSelectedProgram || (pmSelectedPrograms.length > 0 ? pmSelectedPrograms[0] : null)
    const forSelectedProgram = selectedProg 
      ? allUnique.filter(d => d.program === selectedProg)
      : allUnique
    const totalForProgram = forSelectedProgram.length
    
    // After PM portfolio filter (only if no explicit program selection)
    let afterPmFilter: typeof allUnique
    if (selectedProg) {
      // Program selection overrides PM filter
      afterPmFilter = forSelectedProgram
    } else if (pmSelectedManager !== "all") {
      const pmPrograms = programManagerMapping[pmSelectedManager] || []
      afterPmFilter = allUnique.filter(d => pmPrograms.includes(d.program))
    } else {
      afterPmFilter = allUnique
    }
    const deliveriesAfterPmFilter = afterPmFilter.length
    
    // Null date diagnostics
    const missingDueDate = afterPmFilter.filter(d => d.dueDateResolved === null).length
    const missingExpectedDate = afterPmFilter.filter(d => d.expectedDateResolved === null).length
    const missingDueDatePct = afterPmFilter.length > 0 ? (missingDueDate / afterPmFilter.length) * 100 : 0
    const missingExpectedDatePct = afterPmFilter.length > 0 ? (missingExpectedDate / afterPmFilter.length) * 100 : 0
    
    // Deliveries with valid due dates for time-based calculations
    const withValidDueDate = afterPmFilter.filter(d => d.daysToDue !== null)
    
    // Upcoming: DueDateResolved in [Today, Today+Horizon]
    const upcomingDueInHorizon = withValidDueDate.filter(d => 
      d.daysToDue! >= 0 && d.daysToDue! <= pmHorizon
    ).length
    
    // Backlog: DueDateResolved in [Today-Horizon, Today)
    const backlogInWindow = withValidDueDate.filter(d => 
      d.daysToDue! >= -pmHorizon && d.daysToDue! < 0
    ).length
    
    // At-Risk: In upcoming horizon AND isAtRisk flag
    const atRiskInHorizon = withValidDueDate.filter(d => 
      d.daysToDue! >= 0 && d.daysToDue! <= pmHorizon && d.isAtRisk
    ).length
    
    // Late: DueDateResolved < Today (past due) - ALL late, regardless of horizon
    const lateCount = withValidDueDate.filter(d => d.isLate).length
    
    // All backlog (any past due, regardless of horizon)
    const allBacklog = withValidDueDate.filter(d => d.daysToDue! < 0).length
    
    // Debug: find min/max daysToDue to understand date distribution
    const allDaysToDue = withValidDueDate.map(d => d.daysToDue!).sort((a, b) => a - b)
    const minDaysToDue = allDaysToDue[0] ?? 0
    const maxDaysToDue = allDaysToDue[allDaysToDue.length - 1] ?? 0
    
    // Count items outside horizon window on either side
    const outsideHorizonPast = withValidDueDate.filter(d => d.daysToDue! < -pmHorizon).length
    const outsideHorizonFuture = withValidDueDate.filter(d => d.daysToDue! > pmHorizon).length
    
    return { 
      totalInDataset,
      totalForProgram, 
      deliveriesAfterPmFilter, 
      upcomingDueInHorizon, 
      backlogInWindow,
      allBacklog,
      atRiskInHorizon, 
      lateCount,
      missingDueDate,
      missingExpectedDate,
      missingDueDatePct,
      missingExpectedDatePct,
      minDaysToDue,
      maxDaysToDue,
      outsideHorizonPast,
      outsideHorizonFuture
    }
  }, [pmEnrichedDeliveries, pmSelectedManager, pmSelectedPrograms, pmSelectedProgram, pmHorizon, programManagerMapping])

  // PM Tab: Filtered deliveries - Program selection OVERRIDES PM mapping
  // Uses DueDateResolved for time scoping
  const pmFilteredDeliveries = useMemo(() => {
    // De-duplicate by ID first
    const uniqueMap = new Map<string, typeof pmEnrichedDeliveries[0]>()
    pmEnrichedDeliveries.forEach(d => {
      if (!uniqueMap.has(d.id)) uniqueMap.set(d.id, d)
    })
    let result = Array.from(uniqueMap.values())
    
    // If a specific program is selected, it OVERRIDES PM portfolio filter
    const hasExplicitProgramSelection = pmSelectedProgram || pmSelectedPrograms.length > 0
    
    if (hasExplicitProgramSelection) {
      if (pmSelectedProgram) {
        result = result.filter(d => d.program === pmSelectedProgram)
      } else if (pmSelectedPrograms.length > 0) {
        result = result.filter(d => pmSelectedPrograms.includes(d.program))
      }
    } else {
      if (pmSelectedManager !== "all") {
        const pmPrograms = programManagerMapping[pmSelectedManager] || []
        result = result.filter(d => pmPrograms.includes(d.program))
      }
    }
    
    // Time scoping based on Mode using DueDateResolved
    // Only include records with valid due dates
    if (pmMode === "upcoming") {
      result = result.filter(d => d.daysToDue !== null && d.daysToDue >= 0 && d.daysToDue <= pmHorizon)
    } else {
      if (pmIncludeAllBacklog) {
        result = result.filter(d => d.daysToDue !== null && d.daysToDue < 0)
      } else {
        result = result.filter(d => d.daysToDue !== null && d.daysToDue >= -pmHorizon && d.daysToDue < 0)
      }
    }
    
    // Filter by customer comms required toggle
    if (pmCustomerCommsOnly) {
      result = result.filter(d => d.customerCommsRequired)
    }
    
    return result
  }, [pmEnrichedDeliveries, pmSelectedManager, pmSelectedPrograms, pmHorizon, pmMode, pmIncludeAllBacklog, pmSelectedProgram, pmCustomerCommsOnly, programManagerMapping])

  // PM: At-Risk and Late deliveries using resolved date logic
  const pmAtRiskDeliveries = useMemo(() => {
    return pmFilteredDeliveries.filter(d => d.isAtRisk || d.isLate)
      .sort((a, b) => (a.daysToDue ?? 999) - (b.daysToDue ?? 999))
  }, [pmFilteredDeliveries])
  
  const pmLateDeliveries = useMemo(() => pmAtRiskDeliveries.filter(d => d.isLate), [pmAtRiskDeliveries])
  const pmAtRiskOnlyDeliveries = useMemo(() => pmAtRiskDeliveries.filter(d => d.isAtRisk && !d.isLate), [pmAtRiskDeliveries])
  
  // Total late count includes items outside the horizon filter (for accurate KPI display)
  const pmTotalLateCount = useMemo(() => {
    return pmEnrichedDeliveries.filter(d => {
      if (!d.isLate) return false
      // Apply same program/manager filter
      const hasExplicitProgramSelection = pmSelectedProgram || pmSelectedPrograms.length > 0
      if (hasExplicitProgramSelection) {
        if (pmSelectedProgram && d.program !== pmSelectedProgram) return false
        if (pmSelectedPrograms.length > 0 && !pmSelectedPrograms.includes(d.program)) return false
      } else if (pmSelectedManager !== "all") {
        const pmPrograms = programManagerMapping[pmSelectedManager] || []
        if (!pmPrograms.includes(d.program)) return false
      }
      return true
    }).length
  }, [pmEnrichedDeliveries, pmSelectedManager, pmSelectedProgram, pmSelectedPrograms, programManagerMapping])

  // PM: Programs available based on selected manager
  const pmAvailablePrograms = useMemo(() => {
    if (pmSelectedManager === "all") return programs
    return programManagerMapping[pmSelectedManager] || []
  }, [pmSelectedManager, programs, programManagerMapping])

  // PM: Portfolio table data - includes BOTH upcoming at-risk AND late items
  // Late items should always show regardless of mode (they're past due)
  const pmPortfolioTableData = useMemo(() => {
    const programMap = new Map<string, {
      dueCount: number
      atRiskCount: number
      lateCount: number
      nearestDue: number
      dominantDriver: DriverCategory
      dominantOwner: string
      driverCounts: Record<DriverCategory, number>
      ownerCounts: Record<string, number>
    }>()
    
    // Helper to get or create program entry
    const getOrCreate = (program: string) => {
      return programMap.get(program) || {
        dueCount: 0,
        atRiskCount: 0,
        lateCount: 0,
        nearestDue: 999,
        dominantDriver: "Supply" as DriverCategory,
        dominantOwner: "Production Planner",
        driverCounts: { Supply: 0, "MRB/RI": 0, Factory: 0, Planning: 0 },
        ownerCounts: { "Supply Chain/Buyer": 0, "Quality/MRB": 0, "Factory/Operations": 0, "Production Planner": 0 }
      }
    }
    
    // Include filtered deliveries for "due" and "at-risk" counts
    pmFilteredDeliveries.forEach(d => {
      const existing = getOrCreate(d.program)
      existing.dueCount++
      // Use computed isLate/isAtRisk flags - but in upcoming mode, late won't be in pmFilteredDeliveries
      if (d.isLate) existing.lateCount++
      else if (d.isAtRisk) existing.atRiskCount++
      existing.driverCounts[d.driver]++
      existing.ownerCounts[d.escalationOwner]++
      const daysToDue = d.daysToDue ?? 999
      if (daysToDue < existing.nearestDue) existing.nearestDue = daysToDue
      programMap.set(d.program, existing)
    })
    
    // ALSO include late items from enriched deliveries (they may be outside the horizon filter)
    // This ensures late count is accurate in the Portfolio even in "upcoming" mode
    pmEnrichedDeliveries.forEach(d => {
      if (!d.isLate) return // Only add late items
      // Apply same program/manager filter as pmFilteredDeliveries
      const hasExplicitProgramSelection = pmSelectedProgram || pmSelectedPrograms.length > 0
      if (hasExplicitProgramSelection) {
        if (pmSelectedProgram && d.program !== pmSelectedProgram) return
        if (pmSelectedPrograms.length > 0 && !pmSelectedPrograms.includes(d.program)) return
      } else if (pmSelectedManager !== "all") {
        const pmPrograms = programManagerMapping[pmSelectedManager] || []
        if (!pmPrograms.includes(d.program)) return
      }
      
      const existing = getOrCreate(d.program)
      // Only increment lateCount if not already counted in pmFilteredDeliveries
      // (i.e., if we're in upcoming mode where late items were filtered out)
      if (pmMode === "upcoming") {
        existing.lateCount++
        existing.driverCounts[d.driver]++
        existing.ownerCounts[d.escalationOwner]++
        const daysToDue = d.daysToDue ?? 999
        if (daysToDue < existing.nearestDue) existing.nearestDue = daysToDue
      }
      programMap.set(d.program, existing)
    })
    
    return Array.from(programMap.entries())
      .map(([program, data]) => {
        const dominantDriver = (Object.entries(data.driverCounts) as [DriverCategory, number][])
          .filter(([, count]) => count > 0)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || "Supply"
        const dominantOwner = (Object.entries(data.ownerCounts) as [string, number][])
          .filter(([, count]) => count > 0)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || "Production Planner"
        const ownerShort = dominantOwner === "Supply Chain/Buyer" ? "Buyer"
          : dominantOwner === "Quality/MRB" ? "Quality"
          : dominantOwner === "Factory/Operations" ? "Factory"
          : "Planner"
        return { program, ...data, dominantDriver, dominantOwner, ownerShort }
      })
      .sort((a, b) => (b.atRiskCount + b.lateCount) - (a.atRiskCount + a.lateCount) || a.nearestDue - b.nearestDue)
  }, [pmFilteredDeliveries, pmEnrichedDeliveries, pmSelectedManager, pmSelectedProgram, pmSelectedPrograms, pmMode, programManagerMapping])

  // PM: KPI calculations with proper zero-handling using resolved dates
  const pmKpis = useMemo(() => {
    const dueInHorizon = pmFilteredDeliveries.length
    const atRiskCount = pmAtRiskOnlyDeliveries.length
    // Use total late count that includes items outside horizon filter
    const lateCount = pmTotalLateCount
    const totalAtRiskAndLate = atRiskCount + lateCount
    
    const driverCounts = { Supply: 0, "MRB/RI": 0, Factory: 0, Planning: 0 }
    const programCounts = new Map<string, number>()
    pmAtRiskDeliveries.forEach(d => {
      driverCounts[d.driver]++
      programCounts.set(d.program, (programCounts.get(d.program) || 0) + 1)
    })
    
    const sortedDrivers = (Object.entries(driverCounts) as [DriverCategory, number][])
      .sort((a, b) => b[1] - a[1])
    const topDriver = totalAtRiskAndLate > 0 ? sortedDrivers[0]?.[0] : null
    const topDriverCount = totalAtRiskAndLate > 0 ? sortedDrivers[0]?.[1] : 0
    
    const sortedPrograms = Array.from(programCounts.entries()).sort((a, b) => b[1] - a[1])
    const topProgram = totalAtRiskAndLate > 0 ? sortedPrograms[0]?.[0] : null
    const topProgramCount = totalAtRiskAndLate > 0 ? sortedPrograms[0]?.[1] : 0
    
    return { dueInHorizon, atRiskCount, lateCount, totalAtRiskAndLate, topDriver, topDriverCount, topProgram, topProgramCount }
  }, [pmFilteredDeliveries, pmAtRiskDeliveries, pmAtRiskOnlyDeliveries, pmTotalLateCount])

  // PM: Escalation groups by owner (4 internal owners only, no Customer bucket)
  const pmEscalationOwners = ["Supply Chain/Buyer", "Quality/MRB", "Factory/Operations", "Production Planner"] as const
  const pmOwnerLabels: Record<string, string> = {
    "Supply Chain/Buyer": "Buyer",
    "Quality/MRB": "Quality/MRB", 
    "Factory/Operations": "Factory/Ops",
    "Production Planner": "Planner"
  }
  const pmEscalationData = useMemo(() => {
    const ownerGroups: Record<string, typeof pmAtRiskDeliveries> = {
      "Supply Chain/Buyer": [],
      "Quality/MRB": [],
      "Factory/Operations": [],
      "Production Planner": []
    }
    pmAtRiskDeliveries.forEach(d => {
      ownerGroups[d.escalationOwner].push(d)
    })
    // Sort each group by urgency (daysToContract asc)
    Object.values(ownerGroups).forEach(arr => arr.sort((a, b) => a.daysToContract - b.daysToContract))
    return ownerGroups
  }, [pmAtRiskDeliveries])

  // PM: Driver chart data
  const pmDriverChartData = useMemo(() => {
    const counts = { Supply: 0, "MRB/RI": 0, Capacity: 0, Planning: 0 }
    pmAtRiskDeliveries.forEach(d => counts[d.driver]++)
    return (["Supply", "MRB/RI", "Capacity", "Planning"] as DriverCategory[]).map(driver => ({
      driver,
      count: counts[driver],
      fill: DRIVER_COLORS[driver],
    }))
  }, [pmAtRiskDeliveries])

  // PM: Owner chart data (4 internal owners only)
  const pmOwnerChartData = useMemo(() => {
    const counts: Record<string, number> = { "Supply Chain/Buyer": 0, "Quality/MRB": 0, "Factory/Operations": 0, "Production Planner": 0 }
    pmAtRiskDeliveries.forEach(d => counts[d.escalationOwner]++)
    return pmEscalationOwners.map(owner => ({
      owner: pmOwnerLabels[owner],
      fullOwner: owner,
      count: counts[owner],
      fill: "#3B82F6",
    }))
  }, [pmAtRiskDeliveries])
  
  // ===== DEEP DIVE DATA: Factory/Ops (Capacity) =====
  const factoryOpsDeliveries = useMemo(() => {
    return pmAtRiskDeliveries.filter(d => d.escalationOwner === "Factory/Operations")
  }, [pmAtRiskDeliveries])
  
  // Calculate Slip Days = max(0, ExpectedDate - ContractDate) in days
  const factoryOpsWithSlip = useMemo(() => {
    return factoryOpsDeliveries.map(d => {
      const slipDays = Math.max(0, Math.floor((d.expectedDate.getTime() - d.contractDate.getTime()) / (24 * 60 * 60 * 1000)))
      return { ...d, slipDays }
    })
  }, [factoryOpsDeliveries])
  
  // Stacked bar: OTD Slip Impact by Workcenter
  const factoryWorkcenterChartData = useMemo(() => {
    const wcMap = new Map<string, Record<string, number>>()
    factoryOpsWithSlip.forEach(d => {
      const wc = d.workcenter || "Unknown"
      const reason = d.factoryReason || "Unknown Factory"
      if (!wcMap.has(wc)) wcMap.set(wc, {})
      const reasons = wcMap.get(wc)!
      reasons[reason] = (reasons[reason] || 0) + d.slipDays
    })
    // Convert to array sorted by total slip days
    const data = Array.from(wcMap.entries()).map(([wc, reasons]) => {
      const total = Object.values(reasons).reduce((s, v) => s + v, 0)
      return { workcenter: wc, ...reasons, total }
    }).sort((a, b) => b.total - a.total).slice(0, 15)
    return data
  }, [factoryOpsWithSlip])
  
  // Get unique capacity reasons for chart legend
  const factoryReasonsList = useMemo(() => {
    const reasons = new Set<string>()
    factoryOpsWithSlip.forEach(d => reasons.add(d.factoryReason || "Unknown Factory"))
    return Array.from(reasons)
  }, [factoryOpsWithSlip])
  
  // Pareto: Top Capacity Loss Reasons
  const factoryParetoData = useMemo(() => {
    const reasonMap = new Map<string, number>()
    factoryOpsWithSlip.forEach(d => {
      const reason = d.factoryReason || "Unknown Factory"
      reasonMap.set(reason, (reasonMap.get(reason) || 0) + d.slipDays)
    })
    const sorted = Array.from(reasonMap.entries()).sort((a, b) => b[1] - a[1])
    const total = sorted.reduce((s, [, v]) => s + v, 0)
    let cumulative = 0
    return sorted.map(([reason, slipDays]) => {
      cumulative += slipDays
      return { reason, slipDays, cumulativePct: total > 0 ? Math.round((cumulative / total) * 100) : 0 }
    })
  }, [factoryOpsWithSlip])
  
  // ===== DEEP DIVE DATA: Quality/MRB =====
  const qualityMrbDeliveries = useMemo(() => {
    return pmAtRiskDeliveries.filter(d => d.escalationOwner === "Quality/MRB")
  }, [pmAtRiskDeliveries])
  
  const qualityMrbWithSlip = useMemo(() => {
    return qualityMrbDeliveries.map(d => {
      const slipDays = Math.max(0, Math.floor((d.expectedDate.getTime() - d.contractDate.getTime()) / (24 * 60 * 60 * 1000)))
      return { ...d, slipDays }
    })
  }, [qualityMrbDeliveries])
  
  // Stacked bar: OTD Slip Impact by MRB Step
  const mrbStepChartData = useMemo(() => {
    const stepMap = new Map<string, Record<string, number>>()
    qualityMrbWithSlip.forEach(d => {
      const step = d.mrbStep || "Unknown"
      const reason = d.mrbReason || "Unknown MRB"
      if (!stepMap.has(step)) stepMap.set(step, {})
      const reasons = stepMap.get(step)!
      reasons[reason] = (reasons[reason] || 0) + d.slipDays
    })
    const data = Array.from(stepMap.entries()).map(([step, reasons]) => {
      const total = Object.values(reasons).reduce((s, v) => s + v, 0)
      return { step, ...reasons, total }
    }).sort((a, b) => b.total - a.total)
    return data
  }, [qualityMrbWithSlip])
  
  // Get unique MRB reasons for chart legend
  const mrbReasonsList = useMemo(() => {
    const reasons = new Set<string>()
    qualityMrbWithSlip.forEach(d => reasons.add(d.mrbReason || "Unknown MRB"))
    return Array.from(reasons)
  }, [qualityMrbWithSlip])
  
  // Pareto: Top MRB Blockers
  const mrbParetoData = useMemo(() => {
    const reasonMap = new Map<string, number>()
    qualityMrbWithSlip.forEach(d => {
      const reason = d.mrbReason || "Unknown MRB"
      reasonMap.set(reason, (reasonMap.get(reason) || 0) + d.slipDays)
    })
    const sorted = Array.from(reasonMap.entries()).sort((a, b) => b[1] - a[1])
    const total = sorted.reduce((s, [, v]) => s + v, 0)
    let cumulative = 0
    return sorted.map(([reason, slipDays]) => {
      cumulative += slipDays
      return { reason, slipDays, cumulativePct: total > 0 ? Math.round((cumulative / total) * 100) : 0 }
    })
  }, [qualityMrbWithSlip])
  
  // ===== DEEP DIVE DATA: Planning =====
  const planningDeliveries = useMemo(() => {
    return pmAtRiskDeliveries.filter(d => d.escalationOwner === "Production Planner")
  }, [pmAtRiskDeliveries])
  
  const planningWithSlip = useMemo(() => {
    return planningDeliveries.map(d => {
      const slipDays = Math.max(0, Math.floor((d.expectedDate.getTime() - d.contractDate.getTime()) / (24 * 60 * 60 * 1000)))
      return { ...d, slipDays }
    })
  }, [planningDeliveries])
  
  // Pareto: Planning Reasons
  const planningParetoData = useMemo(() => {
    const reasonMap = new Map<string, number>()
    planningWithSlip.forEach(d => {
      const reason = d.planningReason || "Unknown Planning"
      reasonMap.set(reason, (reasonMap.get(reason) || 0) + d.slipDays)
    })
    const sorted = Array.from(reasonMap.entries()).sort((a, b) => b[1] - a[1])
    const total = sorted.reduce((s, [, v]) => s + v, 0)
    let cumulative = 0
    return sorted.map(([reason, slipDays]) => {
      cumulative += slipDays
      return { reason, slipDays, cumulativePct: total > 0 ? Math.round((cumulative / total) * 100) : 0 }
    })
  }, [planningWithSlip])
  
  // Filter states for deep-dive
  const [factoryReasonFilter, setFactoryReasonFilter] = useState<string | null>(null)
  const [mrbReasonFilter, setMrbReasonFilter] = useState<string | null>(null)
  const [planningReasonFilter, setPlanningReasonFilter] = useState<string | null>(null)
  
  // Filtered deliveries for tables
  const factoryTableData = useMemo(() => {
    let data = factoryOpsWithSlip
    if (factoryReasonFilter) data = data.filter(d => d.factoryReason === factoryReasonFilter)
    return data.sort((a, b) => b.slipDays - a.slipDays)
  }, [factoryOpsWithSlip, factoryReasonFilter])
  
  const mrbTableData = useMemo(() => {
    let data = qualityMrbWithSlip
    if (mrbReasonFilter) data = data.filter(d => d.mrbReason === mrbReasonFilter)
    return data.sort((a, b) => b.slipDays - a.slipDays)
  }, [qualityMrbWithSlip, mrbReasonFilter])
  
  const planningTableData = useMemo(() => {
    let data = planningWithSlip
    if (planningReasonFilter) data = data.filter(d => d.planningReason === planningReasonFilter)
    return data.sort((a, b) => b.slipDays - a.slipDays)
  }, [planningWithSlip, planningReasonFilter])
  
  // Insight Header: dynamic summary
  const insightSummary = useMemo(() => {
    const next30 = atRiskDeliveries.filter(d => {
      const days = Math.floor((d.contractDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      return days <= 30 && days >= 0
    })
    const topUnlock = topAtRiskDeliveries[0]
    const clinsProtected = topUnlock ? 3 : 0
    const daysToContract = topUnlock ? Math.max(0, Math.floor((topUnlock.contractDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))) : 0
    
    return `Next 30 days: ${next30.length} deliveries at risk (${supplyPct}% Supply-driven). Top unlock: ${topUnlock?.poNumber || "N/A"} protects ${clinsProtected} CLINs due within ${daysToContract} days.`
  }, [atRiskDeliveries, topAtRiskDeliveries, supplyPct])

  // Today's Focus: top 5 by impact score
  const todaysFocus = topAtRiskDeliveries.slice(0, 5).map(d => ({
    ...d,
    daysToContract: Math.max(0, Math.floor((d.contractDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))),
  }))

  // Chart data: At-Risk by Driver - single colored bars per driver
  const driverChartData = useMemo(() => {
    const drivers: DriverCategory[] = ["Supply", "MRB/RI", "Capacity", "Planning"]
    return drivers.map(driver => {
      const driverItems = filteredDeliveries.filter(d => d.driver === driver)
      const atRiskCount = driverItems.filter(d => d.otdStatus === "At-Risk" || d.otdStatus === "Late").length
      return {
        driver,
        count: atRiskCount,
        fill: DRIVER_COLORS[driver],
      }
    })
  }, [filteredDeliveries])

  // OTD Trend: dual-axis (volume bars + OTD% line) - generate realistic historical data
  const otdTrendData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
    return months.map((month, i) => {
      // Generate realistic data pattern
      const total = 40 + Math.floor(Math.random() * 30)
      const onTime = Math.floor(total * (0.55 + Math.random() * 0.25))
      const late = Math.floor((total - onTime) * (0.3 + Math.random() * 0.3))
      const atRisk = total - onTime - late
      return {
        bucket: month,
        "On-Time": onTime,
        "At-Risk": atRisk,
        Late: late,
        otdPct: Math.round((onTime / total) * 100),
        total,
      }
    })
  }, [])

  // Program risk data (stacked by driver)
  const programRiskData = useMemo(() => {
    const programMap = new Map<string, { Supply: number; "MRB/RI": number; Capacity: number; Planning: number }>()
    atRiskDeliveries.forEach(d => {
      const entry = programMap.get(d.program) || { Supply: 0, "MRB/RI": 0, Capacity: 0, Planning: 0 }
      entry[d.driver]++
      programMap.set(d.program, entry)
    })
    return Array.from(programMap.entries())
      .map(([program, drivers]) => ({ program, ...drivers, total: drivers.Supply + drivers["MRB/RI"] + drivers.Capacity + drivers.Planning }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
  }, [atRiskDeliveries])

  // Driver waterfall data - TRUE waterfall with floating bars using [start, end] range
  const driverWaterfallData = useMemo(() => {
    const total = atRiskDeliveries.length
    const drivers: DriverCategory[] = ["Supply", "MRB/RI", "Capacity", "Planning"]
    
    // Calculate cumulative positions for waterfall effect
    let cumulative = 0
    const data: { name: string; range: [number, number]; fill: string; label: number }[] = []
    
    // Driver breakdown bars - each starts where previous ended (floating effect)
    drivers.forEach(driver => {
      const count = driverCounts[driver]
      const start = cumulative
      const end = cumulative + count
      data.push({ 
        name: driver, 
        range: [start, end],
        fill: DRIVER_COLORS[driver], 
        label: count 
      })
      cumulative = end
    })
    
    return { data, total }
  }, [atRiskDeliveries, driverCounts])

  // Responsibility split (by escalateTo)
  const responsibilitySplit = useMemo(() => {
    const ownerMap = new Map<string, number>()
    atRiskDeliveries.forEach(d => ownerMap.set(d.escalateTo, (ownerMap.get(d.escalateTo) || 0) + 1))
    return Array.from(ownerMap.entries())
      .map(([owner, count]) => ({ owner, count }))
      .sort((a, b) => b.count - a.count)
  }, [atRiskDeliveries])

  // Plan alignment data with intent flags
  const planAlignmentData = useMemo(() => {
    return filteredDeliveries.slice(0, 40).map(d => {
      const contractDelta = d.iopDate ? Math.floor((d.iopDate.getTime() - d.contractDate.getTime()) / (24 * 60 * 60 * 1000)) : 0
      const planDelta = d.deliveryPlanDate ? Math.floor((d.deliveryPlanDate.getTime() - d.contractDate.getTime()) / (24 * 60 * 60 * 1000)) : 0
      const pdmDelta = d.pdmForecastDate ? Math.floor((d.pdmForecastDate.getTime() - d.contractDate.getTime()) / (24 * 60 * 60 * 1000)) : 0
      
      let intentFlag = "Aligned"
      if (planDelta < -3) intentFlag = "Intentional Ahead"
      else if (planDelta > 7) intentFlag = "Unintentional Behind"
      
      let correction = "No action"
      if (planDelta > 14) correction = "Pull in plan"
      else if (planDelta > 7) correction = "Resequence"
      else if (d.driver === "Supply") correction = "Escalate supply"
      else if (d.driver === "Capacity") correction = "Adjust capacity"
      
      return {
        ...d,
        contractDelta,
        iopDelta: contractDelta,
        planDelta,
        pdmDelta,
        intentFlag,
        correction,
        absDelta: Math.abs(planDelta),
      }
    }).sort((a, b) => b.absDelta - a.absDelta)
  }, [filteredDeliveries])

  // Delta histogram
  const deltaHistogram = useMemo(() => {
    const buckets = [
      { range: "<-14", min: -Infinity, max: -14, count: 0, type: "ahead" },
      { range: "-14 to -7", min: -14, max: -7, count: 0, type: "ahead" },
      { range: "-7 to 0", min: -7, max: 0, count: 0, type: "ahead" },
      { range: "0 to 7", min: 0, max: 7, count: 0, type: "aligned" },
      { range: "7 to 14", min: 7, max: 14, count: 0, type: "behind" },
      { range: ">14", min: 14, max: Infinity, count: 0, type: "behind" },
    ]
    planAlignmentData.forEach(d => {
      const bucket = buckets.find(b => d.planDelta >= b.min && d.planDelta < b.max)
      if (bucket) bucket.count++
    })
    return buckets
  }, [planAlignmentData])

  // PO lines with deliveries protected
  const poLinesEnhanced = useMemo(() => {
    return poLineRisks.map(po => {
      const relatedDeliveries = filteredDeliveries.filter(d => d.poNumber === po.poNumber)
      const minDaysToContract = Math.min(...relatedDeliveries.map(d => Math.max(0, Math.floor((d.contractDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))))
      return {
        ...po,
        deliveriesProtected: po.impactedClins.length,
        daysToContract: minDaysToContract,
        expediteROI: po.atRiskDeliveries * 10 + (30 - minDaysToContract),
      }
    }).sort((a, b) => b.expediteROI - a.expediteROI)
  }, [poLineRisks, filteredDeliveries])

  // MRB scatter data
  const mrbScatterData = useMemo(() => {
    return mrbQueue.map(m => ({
      ...m,
      x: m.queueAge,
      y: m.impactScore,
      z: m.clinsBlocked.length * 100,
    }))
  }, [mrbQueue])

  // MRB pipeline with aging
  const mrbPipelineData = useMemo(() => {
    const steps: MRBStep[] = ["Receiving Inspection", "MRB Review", "Disposition", "Released"]
    return steps.map(step => {
      const items = mrbQueue.filter(m => m.currentStep === step)
      const avgAge = items.length > 0 ? Math.round(items.reduce((s, m) => s + m.queueAge, 0) / items.length) : 0
      const over7Days = items.filter(m => m.queueAge > 7).length
      const over14Days = items.filter(m => m.queueAge > 14).length
      return { step, count: items.length, avgAge, over7Days, over14Days }
    })
  }, [mrbQueue])

  // SIOP stacked requirement data
  const siopRequirementData = useMemo(() => {
    return timeBuckets.map(b => ({
      bucket: b.bucket,
      contractReq: b.contractRequirement,
      onTimeForecast: b.onTimeCount,
      gap: Math.max(0, b.contractRequirement - b.onTimeCount - b.atRiskCount),
      aopTarget: b.aopTarget,
    }))
  }, [timeBuckets])

  // Top 3 structural gaps
  const structuralGaps = useMemo(() => {
    return timeBuckets
      .map(b => ({ bucket: b.bucket, gap: b.gapMagnitude, driver: b.dominantDriver }))
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 3)
  }, [timeBuckets])

  const handleRowClick = (delivery: OTDDelivery) => {
    setSelectedDelivery(delivery)
    setDrawerOpen(true)
  }

  const handleDriverLegendClick = (driver: DriverCategory) => {
    setDriverFilter(prev => prev === driver ? null : driver)
  }

  const resetFilters = () => {
    setSelectedSites([])
    setSelectedPrograms([])
    setSelectedSuppliers([])
    setSelectedCommodities([])
    setSelectedStatus("all")
    setChartFilter(null)
    setDriverFilter(null)
  }

  const subTabs: { id: OTDSubTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "program-manager", label: "Program Manager" },
    { id: "planner", label: "Planner" },
    { id: "supply-chain", label: "Supply Chain" },
    { id: "quality", label: "Quality/MRB" },
    { id: "siop", label: "SIOP" },
    { id: "supplier-otd", label: "Supplier OTD (Existing)" },
  ]

  // Today's Focus Panel Component
  const TodaysFocusPanel = () => (
    <Card className="border border-gray-200 bg-gradient-to-b from-slate-50 to-white">
      <CardHeader className="py-3 px-4 cursor-pointer" onClick={() => setFocusPanelOpen(!focusPanelOpen)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Target className="w-4 h-4 text-red-500" />
            Today's Focus
          </CardTitle>
          {focusPanelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </CardHeader>
      {focusPanelOpen && (
        <CardContent className="py-0 px-4 pb-3">
          <div className="space-y-2">
            {todaysFocus.map((item, i) => (
              <div
                key={item.id}
                className="p-2 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 cursor-pointer transition-colors"
                onClick={() => handleRowClick(item)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{item.program}</p>
                    <p className="text-[10px] text-gray-500">{item.clin}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] shrink-0" style={{ borderColor: DRIVER_COLORS[item.driver], color: DRIVER_COLORS[item.driver] }}>
                    {item.driver}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-gray-500">{item.daysToContract}d to contract</span>
                  <span className="text-[10px] font-semibold text-gray-700">Score: {item.impactScore}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )

  // Driver Legend Component (clickable)
  const DriverLegend = () => (
    <div className="flex items-center gap-3 text-xs">
      {(["Supply", "MRB/RI", "Capacity", "Planning"] as DriverCategory[]).map(driver => (
        <button
          key={driver}
          onClick={() => handleDriverLegendClick(driver)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${driverFilter === driver ? "bg-gray-100 ring-1 ring-gray-300" : "hover:bg-gray-50"}`}
        >
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: DRIVER_COLORS[driver] }} />
          <span className={driverFilter === driver ? "font-semibold" : ""}>{driver}</span>
        </button>
      ))}
      {driverFilter && (
        <button onClick={() => setDriverFilter(null)} className="text-blue-600 hover:underline ml-2">
          Clear
        </button>
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">OTD Tracking</h1>
          <p className="text-xs text-gray-500">Executive operations cockpit for on-time delivery performance</p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-1" /> Export
        </Button>
      </div>

      {/* Global Filter Bar */}
      <Card className="border border-gray-200">
        <CardContent className="py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-400" />
            <Select value={selectedSites[0] || "all"} onValueChange={v => setSelectedSites(v === "all" ? [] : [v])}>
              <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="All Sites" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                {sites.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedPrograms[0] || "all"} onValueChange={v => setSelectedPrograms(v === "all" ? [] : [v])}>
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="All Programs" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {programs.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedSuppliers[0] || "all"} onValueChange={v => setSelectedSuppliers(v === "all" ? [] : [v])}>
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="All Suppliers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="On-Time">On-Time</SelectItem>
                <SelectItem value="Late">Late</SelectItem>
                <SelectItem value="At-Risk">At-Risk</SelectItem>
              </SelectContent>
            </Select>
            {(chartFilter || driverFilter) && (
              <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                {chartFilter?.driver || chartFilter?.program || chartFilter?.supplier || driverFilter}
                <X className="w-3 h-3 cursor-pointer" onClick={resetFilters} />
              </Badge>
            )}
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs h-8">Reset</Button>
          </div>
        </CardContent>
      </Card>

      {/* Insight Header Strip */}
      {activeSubTab !== "supplier-otd" && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg px-4 py-2.5 flex items-center gap-3">
          <Zap className="w-4 h-4 text-blue-600 shrink-0" />
          <p className="text-sm text-gray-700">{insightSummary}</p>
        </div>
      )}

      {/* Sub-Tab Navigation */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {subTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeSubTab === tab.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area with Today's Focus Panel */}
      <div className={`flex gap-4 ${activeSubTab === "supplier-otd" ? "" : ""}`}>
{/* Left: Today's Focus Panel (collapsible) - hidden on Program Manager and Supplier OTD */}
              {activeSubTab !== "supplier-otd" && activeSubTab !== "program-manager" && (
                <div className="w-56 shrink-0">
                  <TodaysFocusPanel />
                </div>
              )}

        {/* Right: Sub-Tab Content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* ===== OVERVIEW ===== */}
          {activeSubTab === "overview" && (
            <>
              {/* KPI Tiles - 7 tiles */}
              <div className="grid grid-cols-7 gap-3">
                {[
                  { label: "Overall OTD", value: fmtPct(kpis.overallOTD), color: "text-green-600" },
                  { label: "Forecasted OTD", value: fmtPct(kpis.forecastedOTD), color: "text-blue-600" },
                  { label: "At-Risk (30d)", value: kpis.atRiskNext30, color: "text-yellow-600" },
                  { label: "At-Risk (60d)", value: kpis.atRiskNext60, color: "text-orange-600" },
                  { label: "Top Driver", value: topDriver, color: "text-blue-600" },
                  { label: "Avg Days Late", value: kpis.avgDaysLate, color: "text-red-600" },
                  { label: "MRB Holds", value: kpis.mrbHoldsImpacting, color: "text-purple-600" },
                ].map((kpi, i) => (
                  <Card key={i} className="border border-gray-200">
                    <CardContent className="p-3">
                      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{kpi.label}</p>
                      <p className={`text-xl font-bold mt-0.5 ${kpi.color}`}>{kpi.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* At-Risk by Driver - each bar colored by driver */}
                <Card className="border border-gray-200">
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">At-Risk by Driver</CardTitle>
                      <DriverLegend />
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={driverChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="driver" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(value: number) => [`${value} deliveries`, "At-Risk"]} />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {driverChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* OTD Trend: Dual-axis */}
                <Card className="border border-gray-200">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-semibold">OTD Trend (Volume + %)</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={otdTrendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                          <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Bar yAxisId="left" dataKey="On-Time" stackId="a" fill="#10B981" />
                          <Bar yAxisId="left" dataKey="At-Risk" stackId="a" fill="#F59E0B" />
                          <Bar yAxisId="left" dataKey="Late" stackId="a" fill="#EF4444" radius={[3, 3, 0, 0]} />
                          <Line yAxisId="right" type="monotone" dataKey="otdPct" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4, fill: "#3B82F6" }} name="OTD %" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top At-Risk Table */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold">Top At-Risk Deliveries (by Impact Score)</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          {["Program", "Site", "CLIN", "Supplier", "Contract", "Promise", "Expected", "Days to Contract", "Driver", "Owner", "Escalation", "Score"].map(h => (
                            <TableHead key={h} className="text-[10px] font-semibold py-2">{h}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topAtRiskDeliveries.slice(0, 12).map((d, i) => {
                          const daysToContract = Math.max(0, Math.floor((d.contractDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
                          return (
                            <TableRow key={d.id} className="cursor-pointer hover:bg-blue-50" onClick={() => handleRowClick(d)}>
                              <TableCell className="text-xs font-medium py-2">{d.program}</TableCell>
                              <TableCell className="text-xs py-2">{d.site}</TableCell>
                              <TableCell className="text-xs py-2">{d.clin}</TableCell>
                              <TableCell className="text-xs py-2">{d.supplier}</TableCell>
                              <TableCell className="text-xs py-2">{fmtDate(d.contractDate)}</TableCell>
                              <TableCell className="text-xs py-2">{fmtDate(d.promiseDate)}</TableCell>
                              <TableCell className="text-xs py-2">{fmtDate(d.expectedDate)}</TableCell>
                              <TableCell className={`text-xs font-medium py-2 ${daysToContract < 14 ? "text-red-600" : daysToContract < 30 ? "text-yellow-600" : ""}`}>{daysToContract}d</TableCell>
                              <TableCell className="py-2"><Badge variant="outline" className="text-[9px]" style={{ borderColor: DRIVER_COLORS[d.driver], color: DRIVER_COLORS[d.driver] }}>{d.driver}</Badge></TableCell>
                              <TableCell className="text-xs py-2">{d.owner}</TableCell>
                              <TableCell className="text-xs text-blue-600 py-2">{d.escalateTo}</TableCell>
                              <TableCell className="text-xs font-bold py-2">{d.impactScore}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ===== PROGRAM MANAGER ===== */}
          {activeSubTab === "program-manager" && (
            <div className="space-y-5">
              {/* PORTFOLIO SCOPE CONTROLS - Large, readable */}
              <Card className="border border-gray-200 bg-slate-50">
                <CardContent className="py-4 px-5">
                  <div className="flex items-center gap-6 flex-wrap">
                    {/* Program Manager Dropdown */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700">Program Manager:</span>
                      <Select value={pmSelectedManager} onValueChange={v => { setPmSelectedManager(v); setPmSelectedPrograms([]); setPmSelectedProgram(null); }}>
                        <SelectTrigger className="w-[160px] h-10 text-sm"><SelectValue placeholder="All Managers" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Managers</SelectItem>
                          {programManagers.map(pm => <SelectItem key={pm} value={pm}>{pm}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Programs Multi-select - shows ALL programs so user can override PM portfolio */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700">Programs:</span>
                      <Select value={pmSelectedPrograms[0] || "all"} onValueChange={v => { setPmSelectedPrograms(v === "all" ? [] : [v]); setPmSelectedProgram(null); }}>
                        <SelectTrigger className="w-[180px] h-10 text-sm"><SelectValue placeholder="All Programs" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Programs</SelectItem>
                          {/* Show ALL programs, not just PM's portfolio - allows override */}
                          {programs.map(p => {
                            const inPortfolio = pmSelectedManager === "all" || (programManagerMapping[pmSelectedManager] || []).includes(p)
                            return (
                              <SelectItem key={p} value={p}>
                                {p} {!inPortfolio && pmSelectedManager !== "all" && <span className="text-gray-400">(outside portfolio)</span>}
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Horizon Toggle */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700">Horizon:</span>
                      <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1">
                        {([14, 30, 60, 90] as const).map(h => (
                          <button
                            key={h}
                            onClick={() => setPmHorizon(h)}
                            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${pmHorizon === h ? "bg-blue-600 text-white" : "hover:bg-gray-100"}`}
                          >
                            {h}d
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Mode Toggle: Upcoming / Backlog */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700">Mode:</span>
                      <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1">
                        <button
                          onClick={() => setPmMode("upcoming")}
                          className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${pmMode === "upcoming" ? "bg-blue-600 text-white" : "hover:bg-gray-100"}`}
                        >
                          Upcoming
                        </button>
                        <button
                          onClick={() => setPmMode("backlog")}
                          className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${pmMode === "backlog" ? "bg-red-600 text-white" : "hover:bg-gray-100"}`}
                        >
                          Backlog
                        </button>
                      </div>
                    </div>
                    
                    {/* Include All Backlog checkbox (only in backlog mode) */}
                    {pmMode === "backlog" && (
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pmIncludeAllBacklog}
                          onChange={e => setPmIncludeAllBacklog(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <span className="text-gray-700">Include All Backlog</span>
                      </label>
                    )}
                    
                    {/* Customer Comms Required Toggle */}
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pmCustomerCommsOnly}
                        onChange={e => setPmCustomerCommsOnly(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-gray-700 font-medium">Customer comms required only</span>
                    </label>
                    
                    {/* Definitions Toggle */}
                    <button
                      onClick={() => setPmDefinitionsOpen(!pmDefinitionsOpen)}
                      className="ml-auto text-sm text-gray-500 hover:text-blue-600 underline"
                    >
                      Definitions
                    </button>
                  </div>
                  
                  {/* Active Program Filter */}
                  {pmSelectedProgram && (
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Filtered to:</span>
                      <Badge variant="outline" className="gap-1 text-sm px-2 py-1">
                        {pmSelectedProgram}
                        <X className="w-4 h-4 cursor-pointer" onClick={() => setPmSelectedProgram(null)} />
                      </Badge>
                    </div>
                  )}
                  
                  {pmDefinitionsOpen && (
                    <div className="mt-4 p-4 bg-white rounded border border-gray-200 text-sm text-gray-600 space-y-2">
                      <p><strong>DueDateResolved:</strong> ContractDate → PromiseDate → ExpectedDate → ForecastDate (first non-null value used).</p>
                      <p><strong>ExpectedDateResolved:</strong> ExpectedDate → PromiseDate → ForecastDate (first non-null value used).</p>
                      <p><strong>At-Risk:</strong> DueDateResolved in future AND ExpectedDateResolved {'>'} DueDateResolved.</p>
                      <p><strong>Late:</strong> DueDateResolved {'<'} Today AND not yet delivered (actualDate is null).</p>
                      <p><strong>Driver:</strong> Supply = PO late/short; MRB/RI = material in inspection/MRB queue; Capacity = workcenter constraint; Planning = plan date mismatch.</p>
                      <p><strong>Escalation Owner:</strong> Supply → Supply Chain/Buyer; MRB/RI → Quality/MRB; Capacity → Factory/Operations; Planning → Production Planner.</p>
                      <p><strong>Customer Comms Required:</strong> Late OR (DaysToDue ≤ 7 AND ExpectedDateResolved {'>'} DueDateResolved).</p>
                      <p><strong>Days to Due:</strong> Calendar days from today to DueDateResolved. Negative = past due.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* WARNING BANNER: Program outside PM portfolio */}
              {pmProgramOutsidePortfolio && (
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-yellow-800">
                      Selected Program is not mapped to {pmSelectedManager}.
                    </p>
                    <p className="text-sm text-yellow-700">
                      Results shown are for the selected program regardless of PM assignment. Switch PM to "All Managers" or update the portfolio mapping.
                    </p>
                  </div>
                  <button 
                    onClick={() => setPmSelectedManager("all")}
                    className="px-3 py-1.5 text-sm font-medium bg-yellow-200 hover:bg-yellow-300 text-yellow-800 rounded transition-colors"
                  >
                    Switch to All Managers
                  </button>
                </div>
              )}

              {/* DATA SANITY PANEL - Always visible with distinct counts */}
              <Card className="border border-gray-200 bg-gray-50">
                <CardContent className="py-3 px-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Data Sanity Check (Distinct Deliveries)</span>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-600">
                          <strong className="text-gray-900">{pmDataSanity.totalForProgram}</strong> total for {pmSelectedProgram || pmSelectedPrograms[0] || "all programs"}
                        </span>
                        <span className="text-gray-400">|</span>
                        <span className="text-gray-600">
                          <strong className="text-gray-900">{pmDataSanity.deliveriesAfterPmFilter}</strong> after PM filter
                        </span>
                        <span className="text-gray-400">|</span>
                        <span className="text-gray-600">
                          <strong className="text-blue-600">{pmDataSanity.upcomingDueInHorizon}</strong> in {pmHorizon}d window
                        </span>
                        <span className="text-gray-400">|</span>
                        <span className="text-gray-600">
                          <strong className="text-red-600">{pmDataSanity.allBacklog}</strong> past due total
                        </span>
                        <span className="text-gray-400">|</span>
                        <span className="text-gray-600">
                          <strong className="text-yellow-600">{pmDataSanity.atRiskInHorizon}</strong> at-risk
                        </span>
                        <span className="text-gray-400">|</span>
                        <span className="text-gray-600">
                          <strong className="text-red-600">{pmDataSanity.lateCount}</strong> late
                        </span>
                      </div>
                    </div>
                    {/* Date Range Diagnostics */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>
                        Date range: <strong className="text-gray-700">{pmDataSanity.minDaysToDue}d</strong> to <strong className="text-gray-700">{pmDataSanity.maxDaysToDue}d</strong>
                      </span>
                      <span className="text-gray-300">|</span>
                      <span>
                        Outside {pmHorizon}d window: <strong className={pmDataSanity.outsideHorizonPast > 0 ? "text-orange-600" : "text-gray-700"}>{pmDataSanity.outsideHorizonPast}</strong> past, <strong className="text-gray-700">{pmDataSanity.outsideHorizonFuture}</strong> future
                      </span>
                      <span className="text-gray-300">|</span>
                      <span>
                        Missing dates: <strong className={pmDataSanity.missingDueDatePct > 10 ? "text-red-600" : "text-gray-700"}>{pmDataSanity.missingDueDatePct.toFixed(1)}%</strong>
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* WARNING: Missing Due Dates */}
              {pmDataSanity.missingDueDatePct > 10 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-800">
                      {pmDataSanity.missingDueDatePct.toFixed(0)}% of deliveries are missing due dates.
                    </p>
                    <p className="text-sm text-red-700">
                      Missing due dates prevent upcoming/backlog calculations. Check DueDateResolved mapping (ContractDate → PromiseDate → ExpectedDate → ForecastDate).
                    </p>
                  </div>
                  <button 
                    onClick={() => setPmShowMissingDates(true)}
                    className="px-3 py-1.5 text-sm font-medium bg-red-200 hover:bg-red-300 text-red-800 rounded transition-colors"
                  >
                    Show Missing Date Records
                  </button>
                </div>
              )}

              {/* KPI STRIP - Big numbers with proper zero handling */}
              <div className="grid grid-cols-5 gap-4">
                <Card className="border border-gray-200">
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Due in Horizon</p>
                    <p className="text-3xl font-bold mt-1 text-gray-900">{pmKpis.dueInHorizon}</p>
                  </CardContent>
                </Card>
                <Card className="border border-gray-200">
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                      {pmMode === "upcoming" ? "At-Risk (Upcoming)" : "At-Risk (Backlog)"}
                    </p>
                    <p className="text-3xl font-bold mt-1 text-yellow-600">{pmKpis.atRiskCount}</p>
                  </CardContent>
                </Card>
                <Card className="border border-gray-200">
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                      {pmMode === "upcoming" ? "Late (in scope)" : "Late (Backlog)"}
                    </p>
                    <p className="text-3xl font-bold mt-1 text-red-600">{pmKpis.lateCount}</p>
                  </CardContent>
                </Card>
                <Card className="border border-gray-200">
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Top Driver</p>
                    {pmKpis.topDriver ? (
                      <p className="text-3xl font-bold mt-1" style={{ color: DRIVER_COLORS[pmKpis.topDriver] }}>
                        {pmKpis.topDriver} <span className="text-lg text-gray-400">({pmKpis.topDriverCount})</span>
                      </p>
                    ) : (
                      <p className="text-3xl font-bold mt-1 text-gray-300">—</p>
                    )}
                  </CardContent>
                </Card>
                <Card className="border border-gray-200">
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Top Program</p>
                    {pmKpis.topProgram ? (
                      <p className="text-2xl font-bold mt-1 text-blue-600 truncate" title={pmKpis.topProgram}>
                        {pmKpis.topProgram} <span className="text-lg text-gray-400">({pmKpis.topProgramCount})</span>
                      </p>
                    ) : (
                      <p className="text-3xl font-bold mt-1 text-gray-300">—</p>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {/* Empty State with Actions - context-aware messaging */}
              {pmFilteredDeliveries.length === 0 && pmDataSanity.deliveriesAfterPmFilter > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                  {/* Check if items exist outside horizon */}
                  {pmMode === "upcoming" && pmDataSanity.outsideHorizonPast > 0 ? (
                    <>
                      <p className="text-lg font-semibold text-blue-800 mb-2">
                        No upcoming deliveries in next {pmHorizon} days, but {pmDataSanity.outsideHorizonPast} items are past due.
                      </p>
                      <p className="text-sm text-blue-600 mb-4">
                        Date range: {pmDataSanity.minDaysToDue}d to {pmDataSanity.maxDaysToDue}d from today. {pmDataSanity.allBacklog} total past-due items exist.
                      </p>
                      <div className="flex items-center justify-center gap-4">
                        <button 
                          onClick={() => setPmMode("backlog")}
                          className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Switch to Backlog Mode ({pmDataSanity.allBacklog} items)
                        </button>
                        <button 
                          onClick={() => setPmIncludeAllBacklog(true)}
                          className="px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors"
                        >
                          Include All Backlog
                        </button>
                      </div>
                    </>
                  ) : pmMode === "backlog" && pmDataSanity.outsideHorizonPast > 0 && pmDataSanity.backlogInWindow === 0 ? (
                    <>
                      <p className="text-lg font-semibold text-blue-800 mb-2">
                        {pmDataSanity.outsideHorizonPast} past-due items are older than {pmHorizon} days.
                      </p>
                      <p className="text-sm text-blue-600 mb-4">
                        Oldest item: {Math.abs(pmDataSanity.minDaysToDue)} days past due. Expand horizon or include all backlog.
                      </p>
                      <div className="flex items-center justify-center gap-4">
                        <button 
                          onClick={() => setPmIncludeAllBacklog(true)}
                          className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Include All Backlog ({pmDataSanity.allBacklog} items)
                        </button>
                        <button 
                          onClick={() => setPmHorizon(Math.abs(pmDataSanity.minDaysToDue) + 7)}
                          className="px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors"
                        >
                          Extend Horizon to {Math.abs(pmDataSanity.minDaysToDue) + 7}d
                        </button>
                      </div>
                    </>
                  ) : pmDataSanity.missingDueDatePct > 50 ? (
                    <>
                      <p className="text-lg font-semibold text-blue-800 mb-2">
                        Records exist but due dates are missing.
                      </p>
                      <p className="text-sm text-blue-600 mb-4">
                        {pmDataSanity.missingDueDate} of {pmDataSanity.deliveriesAfterPmFilter} deliveries have no DueDateResolved.
                      </p>
                      <button 
                        onClick={() => setPmShowMissingDates(true)}
                        className="px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors"
                      >
                        Show Records with Missing Due Dates
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-semibold text-blue-800 mb-2">
                        No deliveries in the {pmMode === "upcoming" ? `next ${pmHorizon} days` : `past ${pmHorizon} days`}.
                      </p>
                      <p className="text-sm text-blue-600 mb-4">
                        Date range: {pmDataSanity.minDaysToDue}d to {pmDataSanity.maxDaysToDue}d. Try expanding the horizon or switching mode.
                      </p>
                      <div className="flex items-center justify-center gap-4">
                        {pmMode === "upcoming" ? (
                          <button 
                            onClick={() => setPmMode("backlog")}
                            className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Switch to Backlog Mode
                          </button>
                        ) : (
                          <button 
                            onClick={() => setPmMode("upcoming")}
                            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Switch to Upcoming Mode
                          </button>
                        )}
                        <button 
                          onClick={() => setPmHorizon(180)}
                          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Increase Horizon to 180d
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* MAIN BODY: Two-column layout (30% / 70%) */}
              <div className="flex gap-5">
                {/* LEFT: Program Portfolio Table (30%) */}
                <div className="w-[30%] shrink-0">
                  <Card className="border border-gray-200 h-full">
                    <CardHeader className="py-3 px-4 border-b border-gray-100">
                      <CardTitle className="text-base font-bold text-gray-800">Program Portfolio</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="text-left p-3 text-sm font-bold text-gray-700">Program</th>
                              <th className="text-center p-3 text-sm font-bold text-gray-700">Due</th>
                              <th className="text-center p-3 text-sm font-bold text-gray-700">At-Risk</th>
                              <th className="text-center p-3 text-sm font-bold text-gray-700">Late</th>
                              <th className="text-center p-3 text-sm font-bold text-gray-700">Nearest</th>
                              <th className="text-left p-3 text-sm font-bold text-gray-700">Driver</th>
                              <th className="text-left p-3 text-sm font-bold text-gray-700">Owner</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {pmPortfolioTableData.length === 0 ? (
                              <tr><td colSpan={7} className="p-6 text-center text-sm text-gray-400">No programs in scope</td></tr>
                            ) : (
                              pmPortfolioTableData.map(prog => {
                                const isSelected = pmSelectedProgram === prog.program
                                return (
                                  <tr 
                                    key={prog.program} 
                                    onClick={() => setPmSelectedProgram(isSelected ? null : prog.program)}
                                    className={`cursor-pointer transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}`}
                                  >
                                    <td className="p-3 text-sm font-semibold text-gray-900">{prog.program}</td>
                                    <td className="p-3 text-sm text-center text-gray-600">{prog.dueCount}</td>
                                    <td className="p-3 text-sm text-center font-bold text-yellow-600">{prog.atRiskCount}</td>
                                    <td className="p-3 text-sm text-center font-bold text-red-600">{prog.lateCount}</td>
                                    <td className={`p-3 text-sm text-center font-semibold ${prog.nearestDue <= 0 ? "text-red-600" : prog.nearestDue <= 7 ? "text-yellow-600" : "text-gray-600"}`}>
                                      {prog.nearestDue <= 0 ? "PAST" : `${prog.nearestDue}d`}
                                    </td>
                                    <td className="p-3">
                                      <span className="text-sm font-medium" style={{ color: DRIVER_COLORS[prog.dominantDriver] }}>
                                        {prog.dominantDriver}
                                      </span>
                                    </td>
                                    <td className="p-3 text-sm text-gray-600">{prog.ownerShort}</td>
                                  </tr>
                                )
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* RIGHT: Escalation Call Sheet (70%) */}
                <div className="flex-1 min-w-0">
                  <Card className="border border-gray-200 h-full">
                    <CardHeader className="py-3 px-4 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-bold text-gray-800">Escalation Call Sheet</CardTitle>
                        <span className="text-sm text-gray-500">{pmAtRiskDeliveries.length} items total</span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {/* Owner Tabs */}
                      <div className="flex border-b border-gray-200 bg-gray-50">
                        {pmEscalationOwners.map(owner => {
                          const count = pmEscalationData[owner]?.length || 0
                          const isActive = pmActiveOwnerTab === owner
                          return (
                            <button
                              key={owner}
                              onClick={() => setPmActiveOwnerTab(owner)}
                              className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
                                isActive 
                                  ? "bg-white border-blue-600 text-blue-600" 
                                  : "border-transparent text-gray-600 hover:bg-gray-100"
                              }`}
                            >
                              {pmOwnerLabels[owner]} ({count})
                            </button>
                          )
                        })}
                      </div>
                      
                      {/* Call Sheet Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              {["Program", "CLIN/Delivery", "Days", "Contract", "Expected", "Status", "Driver", "Owner", "Evidence", "Action", "Cust"].map(h => (
                                <th key={h} className="text-left p-3 text-sm font-bold text-gray-700 whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {(pmEscalationData[pmActiveOwnerTab] || []).slice(0, 12).map(d => {
                              const evidenceTag = d.driver === "Supply" 
                                ? (d.poNumber ? `PO ${d.poNumber}` : "Evidence unavailable")
                                : d.driver === "MRB/RI" 
                                ? `MRB-${d.id.slice(-4)}`
                                : d.driver === "Capacity" 
                                ? "WC constraint"
                                : `${d.deltaDays > 0 ? "+" : ""}${d.deltaDays}d plan gap`
                              const action = d.driver === "Supply" ? "Expedite supplier" 
                                : d.driver === "MRB/RI" ? "Prioritize disposition" 
                                : d.driver === "Capacity" ? "Reallocate resources"
                                : "Review/replan"
                              return (
                                <tr 
                                  key={d.id} 
                                  className="cursor-pointer hover:bg-blue-50 transition-colors"
                                  onClick={() => handleRowClick(d)}
                                >
                                  <td className="p-3 text-sm font-semibold">{d.program}</td>
                                  <td className="p-3 text-sm text-gray-700">{d.clin}</td>
                                  <td className={`p-3 text-sm font-bold ${(d.daysToDue ?? 999) <= 0 ? "text-red-600" : (d.daysToDue ?? 999) <= 7 ? "text-yellow-600" : "text-gray-700"}`}>
                                    {d.daysToDue ?? "—"}d
                                  </td>
                                  <td className="p-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(d.contractDate)}</td>
                                  <td className="p-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(d.expectedDate)}</td>
                                  <td className="p-3">
                                    <Badge variant={d.otdStatus === "Late" ? "destructive" : "secondary"} className="text-xs">
                                      {d.otdStatus}
                                    </Badge>
                                  </td>
                                  <td className="p-3">
                                    <span className="text-sm font-medium" style={{ color: DRIVER_COLORS[d.driver] }}>
                                      {d.driver}
                                    </span>
                                  </td>
                                  <td className="p-3 text-sm text-gray-600">{pmOwnerLabels[d.escalationOwner]}</td>
                                  <td className="p-3 text-sm text-gray-500">{evidenceTag}</td>
                                  <td className="p-3 text-sm text-blue-600 font-medium whitespace-nowrap">{action}</td>
                                  <td className="p-3 text-center">
                                    {d.customerCommsRequired && (
                                      <span title="Customer comms required" className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100">
                                        <AlertTriangle className="w-4 h-4 text-red-600" />
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                            {(pmEscalationData[pmActiveOwnerTab] || []).length === 0 && (
                              <tr>
                                <td colSpan={11} className="p-8 text-center">
                                  <p className="text-sm text-gray-500 font-medium">
                                    No items for {pmOwnerLabels[pmActiveOwnerTab]} in this scope.
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {pmMode === "upcoming" 
                                      ? `No at-risk/late deliveries assigned to ${pmOwnerLabels[pmActiveOwnerTab]} in the next ${pmHorizon} days.`
                                      : `No backlog items assigned to ${pmOwnerLabels[pmActiveOwnerTab]} in the past ${pmHorizon} days.`
                                    }
                                  </p>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* View All Button */}
                      {(pmEscalationData[pmActiveOwnerTab] || []).length > 12 && (
                        <div className="py-3 px-4 border-t border-gray-100 text-center">
                          <button className="text-sm text-blue-600 font-medium hover:underline">
                            View all {pmEscalationData[pmActiveOwnerTab].length} items
                          </button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              {/* CHARTS - Full width, readable */}
              <div className="grid grid-cols-2 gap-5">
                {/* At-Risk by Driver Chart */}
                <Card className="border border-gray-200">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-base font-bold text-gray-800">At-Risk by Driver</CardTitle>
                    <p className="text-sm text-gray-500">Distribution of at-risk/late items by root cause driver</p>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={pmDriverChartData} layout="vertical" margin={{ left: 10, right: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 14 }} />
                          <YAxis dataKey="driver" type="category" width={80} tick={{ fontSize: 14 }} />
                          <Tooltip formatter={(v: number) => [v, "Deliveries"]} />
                          <Bar 
                            dataKey="count" 
                            radius={[0, 6, 6, 0]} 
                            label={{ position: 'right', fontSize: 14, fill: '#374151', fontWeight: 'bold' }}
                          >
                            {pmDriverChartData.map((entry, i) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* At-Risk by Escalation Owner Chart */}
                <Card className="border border-gray-200">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-base font-bold text-gray-800">At-Risk by Escalation Owner</CardTitle>
                    <p className="text-sm text-gray-500">Internal owner derived from driver (no Customer bucket)</p>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={pmOwnerChartData} layout="vertical" margin={{ left: 10, right: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 14 }} />
                          <YAxis dataKey="owner" type="category" width={120} tick={{ fontSize: 14 }} />
                          <Tooltip formatter={(v: number) => [v, "Deliveries"]} />
                          <Bar 
                            dataKey="count" 
                            radius={[0, 6, 6, 0]} 
                            fill="#3B82F6"
                            label={{ position: 'right', fontSize: 14, fill: '#374151', fontWeight: 'bold' }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* ===== DEEP DIVE: Factory/Ops (when that tab is active) ===== */}
              {pmActiveOwnerTab === "Factory/Operations" && factoryOpsWithSlip.length > 0 && (
                <div className="space-y-5 mt-5">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Activity className="w-5 h-5" /> Factory/Ops Deep Dive: Shop Floor Blocking Analysis
                  </h3>
                  
                  {/* Charts Row */}
                  <div className="grid grid-cols-2 gap-5">
                    {/* Stacked Bar: OTD Slip Impact by Workcenter */}
                    <Card className="border border-gray-200">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-base font-bold text-gray-800">OTD Slip Impact by Workcenter/Test Cell</CardTitle>
                        <p className="text-sm text-gray-500">Slip Days = max(0, Expected - Contract). Stacked by blocking reason.</p>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <div className="h-[400px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={factoryWorkcenterChartData} layout="vertical" margin={{ left: 20, right: 30 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis type="number" tick={{ fontSize: 12 }} label={{ value: "Slip Days", position: "bottom", fontSize: 12 }} />
                              <YAxis dataKey="workcenter" type="category" width={100} tick={{ fontSize: 11 }} />
                              <Tooltip formatter={(v: number, name: string) => [`${v} days`, name]} />
                              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                              {factoryReasonsList.map(reason => (
                                <Bar 
                                  key={reason} 
                                  dataKey={reason} 
                                  stackId="a" 
                                  fill={FACTORY_REASON_COLORS[reason] || "#6B7280"}
                                  cursor="pointer"
                                  onClick={() => setFactoryReasonFilter(factoryReasonFilter === reason ? null : reason)}
                                />
                              ))}
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Pareto: Top Capacity Loss Reasons */}
                    <Card className="border border-gray-200">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-base font-bold text-gray-800">Top Factory Blocking Reasons (Slip Days)</CardTitle>
                        <p className="text-sm text-gray-500">Click a bar to filter the workcenter chart and table below.</p>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <div className="h-[400px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={factoryParetoData} margin={{ left: 10, right: 30, bottom: 60 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis dataKey="reason" tick={{ fontSize: 10, angle: -45, textAnchor: 'end' }} interval={0} height={80} />
                              <YAxis yAxisId="left" tick={{ fontSize: 12 }} label={{ value: "Slip Days", angle: -90, position: "insideLeft", fontSize: 12 }} />
                              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                              <Tooltip formatter={(v: number, name: string) => [name === "cumulativePct" ? `${v}%` : `${v} days`, name === "cumulativePct" ? "Cumulative %" : "Slip Days"]} />
                              <Bar 
                                yAxisId="left" 
                                dataKey="slipDays" 
                                radius={[4, 4, 0, 0]}
                                cursor="pointer"
                                onClick={(data) => setFactoryReasonFilter(factoryReasonFilter === data.reason ? null : data.reason)}
                              >
                                {factoryParetoData.map((entry, i) => (
                                  <Cell key={i} fill={factoryReasonFilter === entry.reason ? "#1D4ED8" : (FACTORY_REASON_COLORS[entry.reason] || "#6B7280")} />
                                ))}
                              </Bar>
                              <Line yAxisId="right" type="monotone" dataKey="cumulativePct" stroke="#EF4444" strokeWidth={2} dot={{ fill: "#EF4444", r: 4 }} />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Factory/Ops Constraint Events Table */}
                  <Card className="border border-gray-200">
                    <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-bold text-gray-800">Factory/Ops Constraint Events</CardTitle>
                        <p className="text-sm text-gray-500">
                          {factoryReasonFilter ? `Filtered by: ${factoryReasonFilter}` : "All capacity-driven at-risk/late deliveries"}
                          {" "}({factoryTableData.length} items)
                        </p>
                      </div>
                      {factoryReasonFilter && (
                        <Button variant="outline" size="sm" onClick={() => setFactoryReasonFilter(null)}>
                          Clear Filter
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto max-h-[400px]">
                        <table className="w-full">
                          <thead className="sticky top-0 bg-gray-50">
                            <tr className="border-b border-gray-200">
                              {["Program", "CLIN", "Workcenter", "Factory Reason", "Contract", "Expected", "Slip Days", "Evidence", "Action"].map(h => (
                                <th key={h} className="text-left p-3 text-sm font-bold text-gray-700 whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {factoryTableData.slice(0, 25).map(d => (
                              <tr key={d.id} className="hover:bg-blue-50 cursor-pointer" onClick={() => handleRowClick(d)}>
                                <td className="p-3 text-sm font-semibold">{d.program}</td>
                                <td className="p-3 text-sm text-gray-700">{d.clin}</td>
                                <td className="p-3 text-sm font-medium text-blue-600">{d.workcenter || "—"}</td>
                                <td className="p-3">
                                  <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: `${FACTORY_REASON_COLORS[d.factoryReason || "Unknown Factory"]}20`, color: FACTORY_REASON_COLORS[d.factoryReason || "Unknown Factory"] }}>
                                    {d.factoryReason || "Unknown"}
                                  </span>
                                </td>
                                <td className="p-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(d.contractDate)}</td>
                                <td className="p-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(d.expectedDate)}</td>
                                <td className="p-3 text-sm font-bold text-red-600">{d.slipDays}d</td>
                                <td className="p-3 text-sm text-gray-500 max-w-[200px] truncate" title={d.evidence}>{d.evidence}</td>
                                <td className="p-3 text-sm text-blue-600 font-medium">Reallocate resources</td>
                              </tr>
                            ))}
                            {factoryTableData.length === 0 && (
                              <tr><td colSpan={9} className="p-8 text-center text-sm text-gray-400">No Factory/Ops constraint events</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      {factoryTableData.length > 25 && (
                        <div className="py-3 px-4 border-t border-gray-100 text-center">
                          <span className="text-sm text-gray-500">Showing 25 of {factoryTableData.length} items</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {/* ===== DEEP DIVE: Quality/MRB (when that tab is active) ===== */}
              {pmActiveOwnerTab === "Quality/MRB" && qualityMrbWithSlip.length > 0 && (
                <div className="space-y-5 mt-5">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <FileText className="w-5 h-5" /> Quality/MRB Deep Dive: MRB Blocking Analysis
                  </h3>
                  
                  {/* Charts Row */}
                  <div className="grid grid-cols-2 gap-5">
                    {/* Pareto: Top MRB Blockers */}
                    <Card className="border border-gray-200">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-base font-bold text-gray-800">Top MRB Blockers (Slip Days)</CardTitle>
                        <p className="text-sm text-gray-500">Click a bar to filter the table below.</p>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <div className="h-[400px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={mrbParetoData} margin={{ left: 10, right: 30, bottom: 60 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis dataKey="reason" tick={{ fontSize: 10, angle: -45, textAnchor: 'end' }} interval={0} height={80} />
                              <YAxis yAxisId="left" tick={{ fontSize: 12 }} label={{ value: "Slip Days", angle: -90, position: "insideLeft", fontSize: 12 }} />
                              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                              <Tooltip formatter={(v: number, name: string) => [name === "cumulativePct" ? `${v}%` : `${v} days`, name === "cumulativePct" ? "Cumulative %" : "Slip Days"]} />
                              <Bar 
                                yAxisId="left" 
                                dataKey="slipDays" 
                                radius={[4, 4, 0, 0]}
                                cursor="pointer"
                                onClick={(data) => setMrbReasonFilter(mrbReasonFilter === data.reason ? null : data.reason)}
                              >
                                {mrbParetoData.map((entry, i) => (
                                  <Cell key={i} fill={mrbReasonFilter === entry.reason ? "#1D4ED8" : (MRB_REASON_COLORS[entry.reason] || "#6B7280")} />
                                ))}
                              </Bar>
                              <Line yAxisId="right" type="monotone" dataKey="cumulativePct" stroke="#EF4444" strokeWidth={2} dot={{ fill: "#EF4444", r: 4 }} />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Stacked Bar: OTD Slip Impact by MRB Step */}
                    <Card className="border border-gray-200">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-base font-bold text-gray-800">OTD Slip Impact by MRB Step</CardTitle>
                        <p className="text-sm text-gray-500">Slip Days by MRB workflow step, stacked by blocking reason.</p>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <div className="h-[400px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={mrbStepChartData} layout="vertical" margin={{ left: 20, right: 30 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis type="number" tick={{ fontSize: 12 }} label={{ value: "Slip Days", position: "bottom", fontSize: 12 }} />
                              <YAxis dataKey="step" type="category" width={120} tick={{ fontSize: 11 }} />
                              <Tooltip formatter={(v: number, name: string) => [`${v} days`, name]} />
                              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                              {mrbReasonsList.map(reason => (
                                <Bar 
                                  key={reason} 
                                  dataKey={reason} 
                                  stackId="a" 
                                  fill={MRB_REASON_COLORS[reason] || "#6B7280"}
                                  cursor="pointer"
                                  onClick={() => setMrbReasonFilter(mrbReasonFilter === reason ? null : reason)}
                                />
                              ))}
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* MRB Blocking Events Table */}
                  <Card className="border border-gray-200">
                    <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-bold text-gray-800">MRB Blocking Events</CardTitle>
                        <p className="text-sm text-gray-500">
                          {mrbReasonFilter ? `Filtered by: ${mrbReasonFilter}` : "All MRB-driven at-risk/late deliveries"}
                          {" "}({mrbTableData.length} items)
                        </p>
                      </div>
                      {mrbReasonFilter && (
                        <Button variant="outline" size="sm" onClick={() => setMrbReasonFilter(null)}>
                          Clear Filter
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto max-h-[400px]">
                        <table className="w-full">
                          <thead className="sticky top-0 bg-gray-50">
                            <tr className="border-b border-gray-200">
                              {["NC/MRB #", "Program", "CLIN", "MRB Step", "MRB Reason", "Age", "Contract", "Expected", "Slip Days", "Action"].map(h => (
                                <th key={h} className="text-left p-3 text-sm font-bold text-gray-700 whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {mrbTableData.slice(0, 25).map(d => (
                              <tr key={d.id} className="hover:bg-blue-50 cursor-pointer" onClick={() => handleRowClick(d)}>
                                <td className="p-3 text-sm font-mono text-blue-600">{d.ncNumber || "—"}</td>
                                <td className="p-3 text-sm font-semibold">{d.program}</td>
                                <td className="p-3 text-sm text-gray-700">{d.clin}</td>
                                <td className="p-3 text-sm font-medium">{d.mrbStep || "—"}</td>
                                <td className="p-3">
                                  <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: `${MRB_REASON_COLORS[d.mrbReason || "Unknown MRB"]}20`, color: MRB_REASON_COLORS[d.mrbReason || "Unknown MRB"] }}>
                                    {d.mrbReason || "Unknown"}
                                  </span>
                                </td>
                                <td className="p-3 text-sm font-bold text-orange-600">{d.mrbAge || "—"}d</td>
                                <td className="p-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(d.contractDate)}</td>
                                <td className="p-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(d.expectedDate)}</td>
                                <td className="p-3 text-sm font-bold text-red-600">{d.slipDays}d</td>
                                <td className="p-3 text-sm text-blue-600 font-medium">Prioritize disposition</td>
                              </tr>
                            ))}
                            {mrbTableData.length === 0 && (
                              <tr><td colSpan={10} className="p-8 text-center text-sm text-gray-400">No MRB blocking events</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      {mrbTableData.length > 25 && (
                        <div className="py-3 px-4 border-t border-gray-100 text-center">
                          <span className="text-sm text-gray-500">Showing 25 of {mrbTableData.length} items</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {/* ===== DEEP DIVE: Planning (when that tab is active) ===== */}
              {pmActiveOwnerTab === "Production Planner" && planningWithSlip.length > 0 && (
                <div className="space-y-5 mt-5">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Target className="w-5 h-5" /> Planning Deep Dive: Plan vs Contract Analysis
                  </h3>
                  <p className="text-sm text-gray-600">
                    Planning driver is used only when the miss is driven by internal plan/forecast dates being behind contract,
                    and not primarily supply, MRB, or capacity. "Unknown Planning" indicates insufficient data to determine root cause.
                  </p>
                  
                  {/* Pareto: Planning Reasons */}
                  <Card className="border border-gray-200">
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-base font-bold text-gray-800">Planning Reasons (Slip Days)</CardTitle>
                      <p className="text-sm text-gray-500">Click a bar to filter the table below.</p>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={planningParetoData} margin={{ left: 10, right: 30, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="reason" tick={{ fontSize: 10, angle: -30, textAnchor: 'end' }} interval={0} height={80} />
                            <YAxis yAxisId="left" tick={{ fontSize: 12 }} label={{ value: "Slip Days", angle: -90, position: "insideLeft", fontSize: 12 }} />
                            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                            <Tooltip formatter={(v: number, name: string) => [name === "cumulativePct" ? `${v}%` : `${v} days`, name === "cumulativePct" ? "Cumulative %" : "Slip Days"]} />
                            <Bar 
                              yAxisId="left" 
                              dataKey="slipDays" 
                              radius={[4, 4, 0, 0]}
                              cursor="pointer"
                              onClick={(data) => setPlanningReasonFilter(planningReasonFilter === data.reason ? null : data.reason)}
                            >
                              {planningParetoData.map((entry, i) => (
                                <Cell key={i} fill={planningReasonFilter === entry.reason ? "#1D4ED8" : (PLANNING_REASON_COLORS[entry.reason] || "#6B7280")} />
                              ))}
                            </Bar>
                            <Line yAxisId="right" type="monotone" dataKey="cumulativePct" stroke="#EF4444" strokeWidth={2} dot={{ fill: "#EF4444", r: 4 }} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Planning Events Table */}
                  <Card className="border border-gray-200">
                    <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-bold text-gray-800">Planning Misalignment Events</CardTitle>
                        <p className="text-sm text-gray-500">
                          {planningReasonFilter ? `Filtered by: ${planningReasonFilter}` : "All planning-driven at-risk/late deliveries"}
                          {" "}({planningTableData.length} items)
                        </p>
                      </div>
                      {planningReasonFilter && (
                        <Button variant="outline" size="sm" onClick={() => setPlanningReasonFilter(null)}>
                          Clear Filter
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto max-h-[400px]">
                        <table className="w-full">
                          <thead className="sticky top-0 bg-gray-50">
                            <tr className="border-b border-gray-200">
                              {["Program", "CLIN", "Planning Reason", "Contract", "IOP Date", "Delta", "Expected", "Slip Days", "Evidence", "Action"].map(h => (
                                <th key={h} className="text-left p-3 text-sm font-bold text-gray-700 whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {planningTableData.slice(0, 25).map(d => (
                              <tr key={d.id} className="hover:bg-blue-50 cursor-pointer" onClick={() => handleRowClick(d)}>
                                <td className="p-3 text-sm font-semibold">{d.program}</td>
                                <td className="p-3 text-sm text-gray-700">{d.clin}</td>
                                <td className="p-3">
                                  <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: `${PLANNING_REASON_COLORS[d.planningReason || "Unknown Planning"]}20`, color: PLANNING_REASON_COLORS[d.planningReason || "Unknown Planning"] }}>
                                    {d.planningReason || "Unknown"}
                                  </span>
                                </td>
                                <td className="p-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(d.contractDate)}</td>
                                <td className="p-3 text-sm text-gray-600 whitespace-nowrap">{d.iopDate ? fmtDate(d.iopDate) : "—"}</td>
                                <td className={`p-3 text-sm font-bold ${d.deltaDays > 0 ? "text-red-600" : "text-green-600"}`}>
                                  {d.deltaDays > 0 ? "+" : ""}{d.deltaDays}d
                                </td>
                                <td className="p-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(d.expectedDate)}</td>
                                <td className="p-3 text-sm font-bold text-red-600">{d.slipDays}d</td>
                                <td className="p-3 text-sm text-gray-500 max-w-[200px] truncate" title={d.evidence}>{d.evidence}</td>
                                <td className="p-3 text-sm text-blue-600 font-medium">Review/replan</td>
                              </tr>
                            ))}
                            {planningTableData.length === 0 && (
                              <tr><td colSpan={10} className="p-8 text-center text-sm text-gray-400">No planning misalignment events</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      {planningTableData.length > 25 && (
                        <div className="py-3 px-4 border-t border-gray-100 text-center">
                          <span className="text-sm text-gray-500">Showing 25 of {planningTableData.length} items</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
          
          {/* PM: Missing Dates Modal */}
          {pmShowMissingDates && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setPmShowMissingDates(false)}>
              <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900">Deliveries with Missing Due Dates</h3>
                  <button onClick={() => setPmShowMissingDates(false)} className="p-1 hover:bg-gray-100 rounded">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4 overflow-auto max-h-[calc(80vh-120px)]">
                  <p className="text-sm text-gray-600 mb-4">
                    These {pmEnrichedDeliveries.filter(d => d.dueDateResolved === null).length} deliveries have no DueDateResolved (ContractDate, PromiseDate, ExpectedDate, and ForecastDate are all null/missing).
                  </p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left p-2 font-semibold">ID</th>
                        <th className="text-left p-2 font-semibold">Program</th>
                        <th className="text-left p-2 font-semibold">CLIN</th>
                        <th className="text-left p-2 font-semibold">Delivery #</th>
                        <th className="text-left p-2 font-semibold">ContractDate</th>
                        <th className="text-left p-2 font-semibold">PromiseDate</th>
                        <th className="text-left p-2 font-semibold">ExpectedDate</th>
                        <th className="text-left p-2 font-semibold">ForecastDate</th>
                        <th className="text-left p-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pmEnrichedDeliveries.filter(d => d.dueDateResolved === null).slice(0, 50).map(d => (
                        <tr key={d.id} className="hover:bg-gray-50">
                          <td className="p-2 text-gray-600 font-mono text-xs">{d.id}</td>
                          <td className="p-2 font-medium">{d.program}</td>
                          <td className="p-2">{d.clin}</td>
                          <td className="p-2">{d.deliveryNumber}</td>
                          <td className="p-2 text-gray-500">{d.contractDate ? fmtDate(d.contractDate) : <span className="text-red-500">null</span>}</td>
                          <td className="p-2 text-gray-500">{d.promiseDate ? fmtDate(d.promiseDate) : <span className="text-red-500">null</span>}</td>
                          <td className="p-2 text-gray-500">{d.expectedDate ? fmtDate(d.expectedDate) : <span className="text-red-500">null</span>}</td>
                          <td className="p-2 text-gray-500">{d.forecastDate ? fmtDate(d.forecastDate) : <span className="text-red-500">null</span>}</td>
                          <td className="p-2">
                            <Badge variant={d.otdStatus === "Late" ? "destructive" : "secondary"} className="text-xs">
                              {d.otdStatus}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {pmEnrichedDeliveries.filter(d => d.dueDateResolved === null).length > 50 && (
                    <p className="mt-3 text-sm text-gray-500 text-center">
                      Showing first 50 of {pmEnrichedDeliveries.filter(d => d.dueDateResolved === null).length} records with missing due dates.
                    </p>
                  )}
                </div>
                <div className="p-4 border-t border-gray-200 flex justify-end">
                  <button 
                    onClick={() => setPmShowMissingDates(false)}
                    className="px-4 py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===== PLANNER ===== */}
          {activeSubTab === "planner" && (
            <>
              {/* KPIs + Threshold Slider */}
              <div className="flex gap-4 items-start">
                <div className="grid grid-cols-4 gap-3 flex-1">
                  {[
                    { label: "Ahead of Contract", value: planAlignmentData.filter(d => d.planDelta < 0).length, color: "text-green-600" },
                    { label: "Behind Contract", value: planAlignmentData.filter(d => d.planDelta > 0).length, color: "text-red-600" },
                    { label: "Avg Delta Days", value: Math.round(planAlignmentData.reduce((s, d) => s + Math.abs(d.planDelta), 0) / planAlignmentData.length), color: "text-orange-600" },
                    { label: "Beyond Threshold", value: planAlignmentData.filter(d => Math.abs(d.planDelta) > deltaThreshold[0]).length, color: "text-purple-600" },
                  ].map((kpi, i) => (
                    <Card key={i} className="border border-gray-200">
                      <CardContent className="p-3">
                        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{kpi.label}</p>
                        <p className={`text-xl font-bold mt-0.5 ${kpi.color}`}>{kpi.value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Card className="border border-gray-200 w-48">
                  <CardContent className="p-3">
                    <p className="text-[10px] font-medium text-gray-500 uppercase mb-2">Threshold (days)</p>
                    <Slider value={deltaThreshold} onValueChange={setDeltaThreshold} min={1} max={30} step={1} className="mt-1" />
                    <p className="text-center text-sm font-bold mt-1">{deltaThreshold[0]} days</p>
                  </CardContent>
                </Card>
              </div>

              {/* Delta Histogram */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold">Delta Days Distribution (Plan vs Contract)</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deltaHistogram}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {deltaHistogram.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.type === "ahead" ? "#10B981" : entry.type === "behind" ? "#EF4444" : "#6B7280"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Dumbbell Chart (approximated as range bar) */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold">Contract vs Plan Alignment (Top 20 by Delta)</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="space-y-1">
                    {planAlignmentData.filter(d => Math.abs(d.planDelta) > deltaThreshold[0]).slice(0, 15).map(d => (
                      <div key={d.id} className="flex items-center gap-2 py-1 hover:bg-gray-50 cursor-pointer" onClick={() => handleRowClick(d)}>
                        <span className="w-24 text-xs text-gray-600 truncate">{d.clin}</span>
                        <div className="flex-1 relative h-5 bg-gray-100 rounded">
                          {/* Contract marker (baseline) */}
                          <div className="absolute top-0 bottom-0 w-0.5 bg-gray-800" style={{ left: "50%" }} />
                          {/* Plan delta bar */}
                          <div
                            className={`absolute top-1 bottom-1 rounded ${d.planDelta > 0 ? "bg-red-400" : "bg-green-400"}`}
                            style={{
                              left: d.planDelta > 0 ? "50%" : `${50 + (d.planDelta / 60) * 50}%`,
                              width: `${Math.min(Math.abs(d.planDelta) / 60 * 50, 50)}%`,
                            }}
                          />
                        </div>
                        <span className={`w-12 text-xs font-medium text-right ${d.planDelta > 0 ? "text-red-600" : "text-green-600"}`}>
                          {d.planDelta > 0 ? "+" : ""}{d.planDelta}d
                        </span>
                        <Badge variant="outline" className="text-[8px] w-24 justify-center">{d.intentFlag}</Badge>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded" /> Ahead</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-800 rounded" /> Contract</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400 rounded" /> Behind</span>
                  </div>
                </CardContent>
              </Card>

              {/* Misalignment Table */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold">Plan Misalignments (Beyond {deltaThreshold[0]}d)</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        {["CLIN", "Program", "Contract", "IOP", "Plan", "Delta", "Intent Flag", "Correction"].map(h => (
                          <TableHead key={h} className="text-[10px] font-semibold py-2">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {planAlignmentData.filter(d => Math.abs(d.planDelta) > deltaThreshold[0]).slice(0, 12).map(d => (
                        <TableRow key={d.id} className="cursor-pointer hover:bg-blue-50" onClick={() => handleRowClick(d)}>
                          <TableCell className="text-xs font-medium py-2">{d.clin}</TableCell>
                          <TableCell className="text-xs py-2">{d.program}</TableCell>
                          <TableCell className="text-xs py-2">{fmtDate(d.contractDate)}</TableCell>
                          <TableCell className="text-xs py-2">{fmtDate(d.iopDate)}</TableCell>
                          <TableCell className="text-xs py-2">{fmtDate(d.deliveryPlanDate)}</TableCell>
                          <TableCell className={`text-xs font-medium py-2 ${d.planDelta > 0 ? "text-red-600" : "text-green-600"}`}>{d.planDelta > 0 ? "+" : ""}{d.planDelta}d</TableCell>
                          <TableCell className="py-2"><Badge variant={d.intentFlag.includes("Behind") ? "destructive" : "secondary"} className="text-[9px]">{d.intentFlag}</Badge></TableCell>
                          <TableCell className="text-xs text-blue-600 py-2">{d.correction}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {/* ===== SUPPLY CHAIN ===== */}
          {activeSubTab === "supply-chain" && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-5 gap-3">
                {[
                  { label: "Supply-Driven Risk", value: driverCounts.Supply, color: "text-blue-600" },
                  { label: "POs At-Risk", value: poLinesEnhanced.length, color: "text-yellow-600" },
                  { label: "Top Risky Supplier", value: supplierRisks[0]?.supplier?.slice(0, 12) || "N/A", color: "text-red-600" },
                  { label: "Expedite Candidates", value: poLinesEnhanced.filter(p => p.urgency === "Critical").length, color: "text-orange-600" },
                  { label: "CLINs at Risk", value: poLinesEnhanced.reduce((s, p) => s + p.deliveriesProtected, 0), color: "text-purple-600" },
                ].map((kpi, i) => (
                  <Card key={i} className="border border-gray-200">
                    <CardContent className="p-3">
                      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{kpi.label}</p>
                      <p className={`text-xl font-bold mt-0.5 ${kpi.color} truncate`}>{kpi.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-2 gap-4">
                {/* PO Lines by Deliveries Protected */}
                <Card className="border border-gray-200">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-semibold">PO Lines by Deliveries Protected (+ Urgency)</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={poLinesEnhanced.slice(0, 10)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="poNumber" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
                          <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar yAxisId="left" dataKey="deliveriesProtected" fill="#3B82F6" name="Deliveries Protected" radius={[4, 4, 0, 0]} />
                          <Line yAxisId="right" type="monotone" dataKey="daysToContract" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} name="Days to Contract" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Supplier Risk Pareto */}
                <Card className="border border-gray-200">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-semibold">Risk by Supplier (Pareto)</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={supplierRisks.slice(0, 8)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="supplier" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="atRiskCount" fill="#F97316" name="At-Risk" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* PO-CLIN Linkage */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold">PO → CLIN Linkage</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="space-y-2">
                    {poLinesEnhanced.slice(0, 8).map(po => (
                      <div key={`${po.poNumber}-${po.poLine}`} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                        <div className="w-32">
                          <p className="text-xs font-semibold text-gray-900">{po.poNumber}</p>
                          <p className="text-[10px] text-gray-500">{po.supplier}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                        <div className="flex-1 flex flex-wrap gap-1">
                          {po.impactedClins.slice(0, 4).map(clin => (
                            <Badge key={clin} variant="outline" className="text-[9px]">{clin}</Badge>
                          ))}
                          {po.impactedClins.length > 4 && <Badge variant="secondary" className="text-[9px]">+{po.impactedClins.length - 4}</Badge>}
                        </div>
                        <Badge variant={po.urgency === "Critical" ? "destructive" : "secondary"} className="text-[9px]">{po.urgency}</Badge>
                        <span className="text-xs font-medium text-gray-600 w-16 text-right">{po.daysToContract}d</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Action Table */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold">PO Action List (by Expedite ROI)</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        {["PO", "Line", "Supplier", "Part", "Deliveries Protected", "Days to Contract", "Urgency", "Expedite ROI", "Action"].map(h => (
                          <TableHead key={h} className="text-[10px] font-semibold py-2">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {poLinesEnhanced.slice(0, 10).map(p => (
                        <TableRow key={`${p.poNumber}-${p.poLine}`} className="cursor-pointer hover:bg-blue-50">
                          <TableCell className="text-xs font-medium py-2">{p.poNumber}</TableCell>
                          <TableCell className="text-xs py-2">{p.poLine}</TableCell>
                          <TableCell className="text-xs py-2">{p.supplier}</TableCell>
                          <TableCell className="text-xs py-2">{p.partNumber}</TableCell>
                          <TableCell className="text-xs font-medium py-2">{p.deliveriesProtected}</TableCell>
                          <TableCell className={`text-xs font-medium py-2 ${p.daysToContract < 14 ? "text-red-600" : ""}`}>{p.daysToContract}d</TableCell>
                          <TableCell className="py-2"><Badge variant={p.urgency === "Critical" ? "destructive" : "secondary"} className="text-[9px]">{p.urgency}</Badge></TableCell>
                          <TableCell className="text-xs font-bold py-2">{p.expediteROI}</TableCell>
                          <TableCell className="text-xs text-blue-600 py-2">{p.recommendedAction}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {/* ===== QUALITY / MRB ===== */}
          {activeSubTab === "quality" && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-5 gap-3">
                {[
                  { label: "MRB/RI At-Risk", value: mrbQueue.length, color: "text-orange-600" },
                  { label: "In Queue", value: mrbQueue.filter(m => m.currentStep !== "Released").length, color: "text-blue-600" },
                  { label: "Avg Queue Age", value: `${Math.round(mrbQueue.reduce((s, m) => s + m.queueAge, 0) / mrbQueue.length || 0)}d`, color: "text-yellow-600" },
                  { label: "CLINs Blocked", value: mrbQueue.reduce((s, m) => s + m.clinsBlocked.length, 0), color: "text-red-600" },
                  { label: "Total Impact", value: mrbQueue.reduce((s, m) => s + m.impactScore, 0), color: "text-purple-600" },
                ].map((kpi, i) => (
                  <Card key={i} className="border border-gray-200">
                    <CardContent className="p-3">
                      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{kpi.label}</p>
                      <p className={`text-xl font-bold mt-0.5 ${kpi.color}`}>{kpi.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pipeline + Scatter */}
              <div className="grid grid-cols-2 gap-4">
                {/* Compact Pipeline with Aging */}
                <Card className="border border-gray-200">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-semibold">MRB Pipeline (with Aging)</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={mrbPipelineData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis dataKey="step" type="category" width={100} tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Bar dataKey="count" name="Total" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                          <Bar dataKey="over7Days" name=">7 Days" fill="#F59E0B" />
                          <Bar dataKey="over14Days" name=">14 Days" fill="#EF4444" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Scatter: Age vs Impact */}
                <Card className="border border-gray-200">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-semibold">Queue Age vs OTD Impact (size=CLINs)</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis type="number" dataKey="x" name="Queue Age" tick={{ fontSize: 11 }} label={{ value: "Days", position: "bottom", fontSize: 10 }} />
                          <YAxis type="number" dataKey="y" name="Impact Score" tick={{ fontSize: 11 }} />
                          <ZAxis type="number" dataKey="z" range={[50, 400]} />
                          <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(value: number, name: string) => [value, name === "x" ? "Age" : name === "y" ? "Impact" : "CLINs"]} />
                          <Scatter data={mrbScatterData} fill="#F97316" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Priority Worklist */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold">Priority Worklist (by Impact)</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        {["Part/Lot", "NC#", "Step", "CLINs Blocked", "Unlocks", "Nearest Contract", "Age", "Target Disp.", "Owner", "Impact"].map(h => (
                          <TableHead key={h} className="text-[10px] font-semibold py-2">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mrbQueue.slice(0, 12).map(m => (
                        <TableRow key={m.id} className="cursor-pointer hover:bg-blue-50">
                          <TableCell className="text-xs font-medium py-2">{m.partNumber} / {m.lotNumber}</TableCell>
                          <TableCell className="text-xs py-2">{m.ncNumber}</TableCell>
                          <TableCell className="py-2"><Badge variant="outline" className="text-[9px]">{m.currentStep}</Badge></TableCell>
                          <TableCell className="text-xs py-2">{m.clinsBlocked.join(", ")}</TableCell>
                          <TableCell className="text-xs font-medium py-2">{m.clinsBlocked.length}</TableCell>
                          <TableCell className="text-xs py-2">{fmtDate(m.nearestContractDate)}</TableCell>
                          <TableCell className={`text-xs font-medium py-2 ${m.queueAge > 14 ? "text-red-600" : m.queueAge > 7 ? "text-yellow-600" : ""}`}>{m.queueAge}d</TableCell>
                          <TableCell className="text-xs py-2">{fmtDate(m.targetDispositionDate)}</TableCell>
                          <TableCell className="text-xs text-blue-600 py-2">MRB Team</TableCell>
                          <TableCell className="text-xs font-bold py-2">{m.impactScore}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {/* ===== SIOP ===== */}
          {activeSubTab === "siop" && (
            <>
              {/* KPIs + View Toggle */}
              <div className="flex gap-4 items-start">
                <div className="grid grid-cols-4 gap-3 flex-1">
                  {[
                    { label: "OTD vs Contract", value: fmtPct(kpis.contractOTD), color: "text-green-600" },
                    { label: "OTD vs AOP", value: fmtPct(kpis.aopOTD), color: "text-blue-600" },
                    { label: "Structural Gaps", value: kpis.structuralGapCount, color: "text-red-600" },
                    { label: "Worst Bucket", value: structuralGaps[0]?.bucket || "N/A", color: "text-orange-600" },
                  ].map((kpi, i) => (
                    <Card key={i} className="border border-gray-200">
                      <CardContent className="p-3">
                        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{kpi.label}</p>
                        <p className={`text-xl font-bold mt-0.5 ${kpi.color}`}>{kpi.value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Card className="border border-gray-200 w-40">
                  <CardContent className="p-3">
                    <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">View By</p>
                    <Select value={siopView} onValueChange={v => setSiopView(v as any)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Program">Program</SelectItem>
                        <SelectItem value="Site">Site</SelectItem>
                        <SelectItem value="Product Line">Product Line</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              </div>

              {/* Stacked Requirement Chart */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Contract Requirement vs Forecast On-Time Supply (Gap Highlighted)</CardTitle>
                    <Select value={timeBucket} onValueChange={v => setTimeBucket(v as TimeBucket)}>
                      <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Week">Week</SelectItem>
                        <SelectItem value="Month">Month</SelectItem>
                        <SelectItem value="Quarter">Quarter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={siopRequirementData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey="onTimeForecast" stackId="a" fill="#10B981" name="On-Time Forecast" />
                        <Bar dataKey="gap" stackId="a" fill="#FCA5A5" name="Gap (Unfulfilled)" radius={[4, 4, 0, 0]} />
                        <Line type="monotone" dataKey="contractReq" stroke="#1E40AF" strokeWidth={2.5} strokeDasharray="6 3" name="Contract Req" dot={false} />
                        <Line type="monotone" dataKey="aopTarget" stroke="#7C3AED" strokeWidth={2} name="AOP Target" dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top 3 Structural Gaps */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold">Top 3 Structural Gaps</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="grid grid-cols-3 gap-4">
                    {structuralGaps.map((g, i) => (
                      <div key={g.bucket} className="p-3 rounded-lg bg-red-50 border border-red-100">
                        <p className="text-lg font-bold text-red-700">{g.bucket}</p>
                        <p className="text-sm text-red-600">Gap: +{g.gap} units</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Badge variant="outline" className="text-[9px]" style={{ borderColor: DRIVER_COLORS[g.driver], color: DRIVER_COLORS[g.driver] }}>{g.driver}</Badge>
                          <span className="text-xs text-gray-500">dominant</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Driver Heatmap */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold">Time Bucket x Driver Heatmap (with Suggested Lever)</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        {["Bucket", "Supply", "MRB/RI", "Capacity", "Planning", "Gap", "Driver", "Suggested Lever"].map(h => (
                          <TableHead key={h} className="text-[10px] font-semibold py-2 text-center">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timeBuckets.map(b => {
                        const getHeatColor = (v: number) => v > 8 ? "bg-red-200" : v > 5 ? "bg-red-100" : v > 2 ? "bg-yellow-100" : "bg-green-50"
                        const getLever = (d: DriverCategory) => {
                          switch (d) {
                            case "Supply": return "Expedite / Alt source"
                            case "MRB/RI": return "Disposition blitz"
                            case "Capacity": return "Add shifts / rebalance"
                            case "Planning": return "IOP alignment"
                          }
                        }
                        return (
                          <TableRow key={b.bucket}>
                            <TableCell className="text-xs font-medium py-2 text-center">{b.bucket}</TableCell>
                            <TableCell className={`text-center ${getHeatColor(b.supplyDriverCount)}`}><span className="text-xs font-semibold">{b.supplyDriverCount}</span></TableCell>
                            <TableCell className={`text-center ${getHeatColor(b.mrbDriverCount)}`}><span className="text-xs font-semibold">{b.mrbDriverCount}</span></TableCell>
                            <TableCell className={`text-center ${getHeatColor(b.capacityDriverCount)}`}><span className="text-xs font-semibold">{b.capacityDriverCount}</span></TableCell>
                            <TableCell className={`text-center ${getHeatColor(b.planningDriverCount)}`}><span className="text-xs font-semibold">{b.planningDriverCount}</span></TableCell>
                            <TableCell className={`text-center text-xs font-medium ${b.gapMagnitude > 0 ? "text-red-600" : "text-green-600"}`}>{b.gapMagnitude > 0 ? "+" : ""}{b.gapMagnitude}</TableCell>
                            <TableCell className="text-center"><Badge variant="outline" className="text-[9px]" style={{ borderColor: DRIVER_COLORS[b.dominantDriver], color: DRIVER_COLORS[b.dominantDriver] }}>{b.dominantDriver}</Badge></TableCell>
                            <TableCell className="text-xs text-blue-600 text-center">{getLever(b.dominantDriver)}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {/* ===== SUPPLIER OTD (EXISTING - UNCHANGED) ===== */}
          {activeSubTab === "supplier-otd" && <SupplierOTD />}
        </div>
      </div>

      {/* ===== ENHANCED DRILL-DOWN DRAWER ===== */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[800px] sm:w-[900px] lg:w-[1000px] max-w-[90vw] overflow-y-auto">
          {selectedDelivery && (
            <>
              <SheetHeader>
                <SheetTitle className="text-base font-bold flex items-center gap-2">
                  {selectedDelivery.clin}
                  <Badge className={`ml-2 ${selectedDelivery.otdStatus === "On-Time" ? "bg-green-100 text-green-800" : selectedDelivery.otdStatus === "Late" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>
                    {selectedDelivery.otdStatus}
                  </Badge>
                </SheetTitle>
              </SheetHeader>

              <div className="mt-5 space-y-5">
                {/* A) Delivery Timeline (horizontal) */}
                <div>
                  <h3 className="text-xs font-bold text-gray-700 uppercase mb-3">Delivery Timeline</h3>
                  <div className="flex items-center gap-2">
                    {[
                      { label: "Contract", date: selectedDelivery.contractDate, color: "#6B7280" },
                      { label: "Promise", date: selectedDelivery.promiseDate, color: "#3B82F6" },
                      { label: "IOP/Plan", date: selectedDelivery.iopDate, color: "#8B5CF6" },
                      { label: "PDM Fcst", date: selectedDelivery.pdmForecastDate, color: "#F59E0B" },
                      { label: selectedDelivery.actualDate ? "Actual" : "Expected", date: selectedDelivery.actualDate || selectedDelivery.expectedDate, color: selectedDelivery.actualDate ? "#10B981" : "#EF4444" },
                    ].map((item, i) => (
                      <div key={i} className="flex-1 text-center">
                        <div className="w-3 h-3 rounded-full mx-auto" style={{ backgroundColor: item.color }} />
                        <p className="text-[10px] font-medium mt-1" style={{ color: item.color }}>{item.label}</p>
                        <p className="text-xs text-gray-600">{fmtDate(item.date)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* B) Driver Evidence Panel */}
                <div>
                  <h3 className="text-xs font-bold text-gray-700 uppercase mb-2">Driver Evidence: {selectedDelivery.driver}</h3>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-xs">
                    {selectedDelivery.driver === "Supply" && (
                      <>
                        <div className="flex justify-between"><span className="text-gray-500">PO Line:</span><span className="font-medium">{selectedDelivery.poNumber} / {selectedDelivery.poLine}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Supplier:</span><span className="font-medium">{selectedDelivery.supplier}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Receipt Status:</span><Badge variant="outline" className="text-[9px]">Pending</Badge></div>
                        <div className="flex justify-between"><span className="text-gray-500">Slip Delta:</span><span className="font-medium text-red-600">+{selectedDelivery.daysLate} days</span></div>
                      </>
                    )}
                    {selectedDelivery.driver === "MRB/RI" && (
                      <>
                        <div className="flex justify-between"><span className="text-gray-500">NC/MRB ID:</span><span className="font-medium">NC-{Math.floor(Math.random() * 9000 + 1000)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Queue Step:</span><Badge variant="outline" className="text-[9px]">MRB Review</Badge></div>
                        <div className="flex justify-between"><span className="text-gray-500">Aging:</span><span className="font-medium">{Math.floor(Math.random() * 14 + 3)} days</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Disposition Owner:</span><span className="font-medium">Quality Eng.</span></div>
                      </>
                    )}
                    {selectedDelivery.driver === "Capacity" && (
                      <>
                        <div className="flex justify-between"><span className="text-gray-500">Constraint:</span><span className="font-medium">Test Cell A3</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Scheduled:</span><span className="font-medium">{fmtDate(selectedDelivery.expectedDate)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Required:</span><span className="font-medium">{fmtDate(selectedDelivery.contractDate)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Gap:</span><span className="font-medium text-red-600">+{selectedDelivery.deltaDays} days</span></div>
                      </>
                    )}
                    {selectedDelivery.driver === "Planning" && (
                      <>
                        <div className="flex justify-between"><span className="text-gray-500">IOP vs Contract:</span><span className="font-medium">{selectedDelivery.deltaDays > 0 ? "+" : ""}{selectedDelivery.deltaDays} days</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Delivery Plan vs Contract:</span><span className="font-medium">{selectedDelivery.planningMisaligned ? "Misaligned" : "Aligned"}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Intent Flag:</span><Badge variant={selectedDelivery.deltaDays > 7 ? "destructive" : "secondary"} className="text-[9px]">{selectedDelivery.deltaDays > 7 ? "Unintentional Behind" : selectedDelivery.deltaDays < -3 ? "Intentional Ahead" : "Aligned"}</Badge></div>
                      </>
                    )}
                  </div>
                </div>

                {/* C) What Changed Log */}
                <div>
                  <h3 className="text-xs font-bold text-gray-700 uppercase mb-2">What Changed (Last 3)</h3>
                  <div className="space-y-1.5">
                    {selectedDelivery.changeHistory.slice(0, 3).map((ch, i) => (
                      <div key={i} className="flex items-center gap-3 text-xs p-2 bg-gray-50 rounded">
                        <span className="text-gray-400 w-16">{fmtDate(ch.date)}</span>
                        <span className="font-medium">{ch.field}</span>
                        <span className="text-gray-500">{ch.from}</span>
                        <ChevronRight className="w-3 h-3 text-gray-400" />
                        <span className="font-medium">{ch.to}</span>
                        <span className="text-red-500 ml-auto">+{Math.floor(Math.random() * 7 + 1)}d</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* D) Escalation Brief */}
                <div>
                  <h3 className="text-xs font-bold text-gray-700 uppercase mb-2">Escalation Brief</h3>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-blue-700">Escalate to:</span>
                      <span className="text-sm font-semibold text-blue-900">{selectedDelivery.escalateTo}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-blue-700">Current Owner:</span>
                      <span className="text-xs font-medium text-blue-800">{selectedDelivery.owner}</span>
                    </div>
                    {/* Suggested Escalation Note */}
                    <div className="border-t border-blue-200 pt-2 mt-2">
                      <p className="text-xs text-blue-700 font-medium mb-1">Suggested Note:</p>
                      <p className="text-xs text-blue-900 italic">
                        {selectedDelivery.driver === "Supply" 
                          ? `PO ${selectedDelivery.poNumber} is ${selectedDelivery.daysLate} days behind promise date, impacting ${selectedDelivery.clin}. Recommend contacting ${selectedDelivery.supplier} for expedite or alternate source.`
                          : selectedDelivery.driver === "MRB/RI"
                          ? `Material for ${selectedDelivery.clin} is held in MRB queue. Expedite disposition to prevent ${Math.max(0, Math.floor((selectedDelivery.contractDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))} day contract slip.`
                          : selectedDelivery.driver === "Capacity"
                          ? `${selectedDelivery.clin} requires capacity resequencing. Current schedule shows ${selectedDelivery.deltaDays} day gap to contract. Recommend resource reallocation.`
                          : `Plan alignment issue for ${selectedDelivery.clin}: delivery plan ${selectedDelivery.deltaDays > 0 ? "+" : ""}${selectedDelivery.deltaDays} days vs contract. Review for intentional schedule shift or replan.`
                        }
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {Math.max(0, Math.floor((selectedDelivery.contractDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))} days until contract date
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <Button variant="outline" size="sm" className="text-xs gap-1"><ExternalLink className="w-3 h-3" /> Open PO</Button>
                    <Button variant="outline" size="sm" className="text-xs gap-1"><FileText className="w-3 h-3" /> Open NC</Button>
                    <Button variant="outline" size="sm" className="text-xs gap-1"><MessageSquare className="w-3 h-3" /> Contact Supplier</Button>
                    <Button variant="outline" size="sm" className="text-xs gap-1"><RefreshCw className="w-3 h-3" /> Adjust Plan</Button>
                  </div>
                </div>

                {/* Details Grid */}
                <div>
                  <h3 className="text-xs font-bold text-gray-700 uppercase mb-2">Details</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    {[
                      ["Program", selectedDelivery.program],
                      ["Site", selectedDelivery.site],
                      ["Product Line", selectedDelivery.productLine],
                      ["Commodity", selectedDelivery.commodity],
                      ["Part Number", selectedDelivery.partNumber],
                      ["Quantity", selectedDelivery.quantity],
                      ["Severity", selectedDelivery.severity],
                      ["Impact Score", selectedDelivery.impactScore],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between py-1 border-b border-gray-100">
                        <span className="text-gray-500">{label}</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button className="w-full mt-4" variant="default">Create Escalation</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
