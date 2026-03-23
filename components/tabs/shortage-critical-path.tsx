"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  RefreshCw, Download, Share2, Filter, AlertTriangle, Clock, Target, 
  TrendingUp, TrendingDown, Layers, ChevronRight, Info, CheckCircle, 
  XCircle, Truck, Wrench, Package, Users, DollarSign, Calendar,
  ArrowUpRight, ArrowDownRight, Minus, FileText, AlertCircle, BarChart3,
  Building2, ClipboardList, Gauge, History, ShieldAlert, Box, Zap,
  GitBranch, ListOrdered, Network, Activity, Eye, Link2
} from "lucide-react"
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, 
  ResponsiveContainer, Cell, BarChart, Bar, LineChart, Line,
  AreaChart, Area, Legend, Tooltip as RechartsTooltip, PieChart, Pie,
  ComposedChart, ReferenceArea, ReferenceLine
} from "recharts"

// ===== TYPES =====
type ShortageStatus = "Short" | "At-Risk" | "Covered"
type PriorityTier = "Critical" | "High" | "Medium" | "Low"
type ShortageDriver = "Supplier Slip" | "Late PR/PO" | "MRB Hold" | "RI Queue" | "Shelf-Life" | "Planning Date" | "Routing/Process" | "Capacity/Test" | "Data Issue"
type BlockingFunction = "Planning/Material Control" | "Buyer/MPM/Supply Chain" | "Quality/MRB" | "Operations/Value Stream" | "Manufacturing Engineering" | "Inventory/Materials"
type SupplyType = "On Hand" | "WIP" | "Open PO" | "In Transit" | "RI Pending" | "MRB" | "Expired" | "Hold"

interface ShortagePart {
  id: string
  partNumber: string
  description: string
  commodity: string
  supplier: string
  rank: number
  priorityScore: number
  priorityTier: PriorityTier
  criticalPath: boolean
  criticalPathScore: number
  noSubstitute: boolean
  leadTimeDays: number
  longLead: boolean
  // Demand & Supply
  netDemand: number
  netUsableSupply: number
  netShortageQty: number
  atRiskCoverageQty: number
  status: ShortageStatus
  // Exclusions
  mrbQty: number
  riQty: number
  expiredQty: number
  holdQty: number
  shelfLifeRisk: boolean
  inTransitQty: number
  wipDependentQty: number
  // Dates
  firstRequiredDate: Date
  daysToFirstBlockedDemand: number
  shortWeek: string
  shortWeekDate: Date
  riskWeek: string
  recoveryWeek: string
  recoveryWeekDate: Date
  // Impact
  programsImpacted: number
  jobsBlocked: number
  buildsBlocked: number
  clinsBlocked: number
  linkedPrograms: string[]
  linkedJobs: string[]
  linkedClins: string[]
  revenueAtRisk: number
  aopAtRisk: number
  // RTW & Late Job integration
  rtwBlocked: boolean
  rtwBlockedJobs: number
  linkedLateJobs: number
  materialDrivenLateJobs: number
  // Driver & Action
  primaryDriver: ShortageDriver
  blockingFunction: BlockingFunction
  nextAction: string
  actionStatus: "Open" | "In Progress" | "Waiting" | "Escalated" | "Resolved"
  owner: string
  recoveryETA: Date
  lastUpdated: Date
  // Evidence
  linkedPO: string | null
  poPromiseDate: Date | null
  linkedMRB: string | null
  linkedRI: string | null
  linkedNC: string | null
  // Governance
  daysOnDashboard: number
  wasVisibleBeforeIncident: boolean
  lessonLearned: string | null
  rootCauseConfirmed: boolean
  // Priority factors
  priorityFactors: {
    blockedDemandCriticality: number
    dateProximity: number
    revenueAOP: number
    substituteAvailability: number
    leadTimeSeverity: number
  }
  // Supply breakdown
  supplyBreakdown: {
    onHand: number
    wip: number
    openPO: number
    inTransit: number
    riPending: number
    mrbHold: number
    expired: number
  }
  // Weekly demand/supply - time-phased by source
  weeklyDemand: number[]
  weeklyOnHand: number[]
  weeklyWIP: number[]
  weeklyOpenPO: number[]
  weeklyInTransit: number[]
  weeklyRIPending: number[]
  weeklyBalance: number[]
  weeklyBlockedJobs: number[]
}

// ===== COLORS =====
const COLORS = {
  critical: "#dc2626",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
  primary: "#1d4ed8",
  muted: "#64748b"
}

const DRIVER_COLORS: Record<ShortageDriver, string> = {
  "Supplier Slip": "#8b5cf6",
  "Late PR/PO": "#ec4899",
  "MRB Hold": "#f97316",
  "RI Queue": "#f59e0b",
  "Shelf-Life": "#84cc16",
  "Planning Date": "#06b6d4",
  "Routing/Process": "#3b82f6",
  "Capacity/Test": "#6366f1",
  "Data Issue": "#64748b"
}

// ===== HELPER FUNCTIONS =====
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

const formatDate = (date: Date) => {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const formatWeekEnding = (weekOffset: number) => {
  const date = new Date(Date.now() + weekOffset * 7 * 86400000)
  // Get to next Sunday
  const dayOfWeek = date.getDay()
  date.setDate(date.getDate() + (7 - dayOfWeek) % 7)
  return date.toLocaleDateString("en-US", { month: "numeric", day: "numeric" })
}

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat("en-US").format(value)
}

// ===== CONSTANTS =====
const programs = ["F-35 Lightning", "CH-53K King Stallion", "AH-64E Apache", "MQ-9 Reaper", "B-21 Raider"]
const clins = ["CLIN-0001", "CLIN-0002", "CLIN-0003", "CLIN-0004", "CLIN-0005", "CLIN-0006"]
const commodities = ["Semiconductors", "Passive Components", "Connectors", "RF Components", "Power Management", "Displays", "Memory"]
const suppliers = ["Analog Devices", "Texas Instruments", "Amphenol", "Murata", "Wolfspeed", "Samsung", "Micron", "TE Connectivity"]
const sites = ["Camden", "Huntsville", "El Segundo", "San Diego"]
const valueStreams = ["Production", "Integration", "Test", "Depot"]
const customers = ["US Navy", "US Army", "US Air Force", "USMC", "International"]
const lessonLearnedOptions = ["Inadequate safety stock", "Supplier capacity not validated", "Alternate source needed", "Earlier expedite required", "Data quality issue"]

// ===== GENERATE DATA =====
const generateShortageParts = (): ShortagePart[] => {
  const parts: ShortagePart[] = []
  const partPrefixes = ["PN", "ASM", "PCB", "IC", "CAP", "RES", "CONN", "XFMR"]
  
  for (let i = 0; i < 120; i++) {
    const seed = i + 1
    const prefix = partPrefixes[Math.floor(seededRandom(seed) * partPrefixes.length)]
    const priorityScore = Math.floor(seededRandom(seed + 1) * 100)
    const priorityTier: PriorityTier = priorityScore >= 85 ? "Critical" : priorityScore >= 65 ? "High" : priorityScore >= 40 ? "Medium" : "Low"
    const criticalPath = seededRandom(seed + 2) > 0.7
    const netShortageQty = Math.floor(seededRandom(seed + 3) * 50) + (seededRandom(seed + 4) > 0.5 ? 1 : 0)
    const atRiskQty = netShortageQty === 0 ? Math.floor(seededRandom(seed + 5) * 30) : 0
    const status: ShortageStatus = netShortageQty > 0 ? "Short" : atRiskQty > 0 ? "At-Risk" : "Covered"
    
    const drivers: ShortageDriver[] = ["Supplier Slip", "Late PR/PO", "MRB Hold", "RI Queue", "Shelf-Life", "Planning Date", "Routing/Process", "Capacity/Test", "Data Issue"]
    const functions: BlockingFunction[] = ["Planning/Material Control", "Buyer/MPM/Supply Chain", "Quality/MRB", "Operations/Value Stream", "Manufacturing Engineering", "Inventory/Materials"]
    const owners = ["J. Smith", "M. Johnson", "R. Williams", "S. Davis", "K. Brown", "L. Wilson", "T. Anderson", "P. Thomas"]
    const nextActions = [
      "Expedite PO with supplier",
      "Release PR for alternate source",
      "Disposition MRB material",
      "Complete RI inspection",
      "Update planning dates",
      "Verify routing readiness",
      "Reallocate from WIP",
      "Submit shelf-life extension",
      "Contact supplier for AOG pull-in"
    ]
    
    // Generate time-phased weekly data for 10 weeks
    const weeklyDemand: number[] = []
    const weeklyOnHand: number[] = []
    const weeklyWIP: number[] = []
    const weeklyOpenPO: number[] = []
    const weeklyInTransit: number[] = []
    const weeklyRIPending: number[] = []
    const weeklyBalance: number[] = []
    const weeklyBlockedJobs: number[] = []
    
    let runningBalance = Math.floor(seededRandom(seed + 50) * 20)
    for (let w = 0; w < 10; w++) {
      const demand = Math.floor(seededRandom(seed + 60 + w) * 15)
      const onHand = w === 0 ? Math.floor(seededRandom(seed + 200 + w) * 20) : 0
      const wip = Math.floor(seededRandom(seed + 210 + w) * 8)
      const openPO = Math.floor(seededRandom(seed + 220 + w) * 10)
      const inTransit = Math.floor(seededRandom(seed + 230 + w) * 5)
      const riPending = Math.floor(seededRandom(seed + 240 + w) * 3)
      
      weeklyDemand.push(demand)
      weeklyOnHand.push(onHand)
      weeklyWIP.push(wip)
      weeklyOpenPO.push(openPO)
      weeklyInTransit.push(inTransit)
      weeklyRIPending.push(riPending)
      
      const supply = onHand + wip + openPO + inTransit
      runningBalance = runningBalance - demand + supply
      weeklyBalance.push(runningBalance)
      weeklyBlockedJobs.push(runningBalance < 0 ? Math.abs(Math.floor(runningBalance / 3)) : 0)
    }
    
    const linkedProgramCount = Math.floor(seededRandom(seed + 80) * 3) + 1
    const linkedJobCount = Math.floor(seededRandom(seed + 81) * 5) + 1
    const linkedClinCount = Math.floor(seededRandom(seed + 82) * 2) + 1
    const daysToFirstBlockedDemand = Math.floor(seededRandom(seed + 250) * 45) + 1
    const shortWeekDate = new Date(Date.now() + Math.floor(seededRandom(seed + 251) * 28) * 86400000)
    const recoveryWeekDate = new Date(Date.now() + Math.floor(seededRandom(seed + 252) * 56) * 86400000)
    
    parts.push({
      id: `SP-${String(i + 1).padStart(4, "0")}`,
      partNumber: `${prefix}-${String(Math.floor(seededRandom(seed + 10) * 90000) + 10000)}`,
      description: [
        "High-Power RF Amplifier Module",
        "Precision Timing Oscillator",
        "Multi-Layer Ceramic Capacitor",
        "High-Speed Connector Assembly",
        "Radiation-Hardened FPGA",
        "Power Management IC",
        "EMI Filter Module",
        "Thermal Interface Material",
        "Precision Resistor Network",
        "High-Frequency Transformer"
      ][Math.floor(seededRandom(seed + 11) * 10)],
      commodity: commodities[Math.floor(seededRandom(seed + 12) * commodities.length)],
      supplier: suppliers[Math.floor(seededRandom(seed + 13) * suppliers.length)],
      rank: i + 1,
      priorityScore,
      priorityTier,
      criticalPath,
      criticalPathScore: criticalPath ? Math.floor(seededRandom(seed + 14) * 40) + 60 : Math.floor(seededRandom(seed + 15) * 30),
      noSubstitute: seededRandom(seed + 16) > 0.7,
      leadTimeDays: Math.floor(seededRandom(seed + 17) * 120) + 30,
      longLead: seededRandom(seed + 18) > 0.6,
      netDemand: Math.floor(seededRandom(seed + 19) * 100) + 20,
      netUsableSupply: Math.floor(seededRandom(seed + 20) * 80),
      netShortageQty,
      atRiskCoverageQty: atRiskQty,
      status,
      mrbQty: Math.floor(seededRandom(seed + 21) * 10),
      riQty: Math.floor(seededRandom(seed + 22) * 8),
      expiredQty: Math.floor(seededRandom(seed + 23) * 5),
      holdQty: Math.floor(seededRandom(seed + 24) * 3),
      shelfLifeRisk: seededRandom(seed + 260) > 0.75,
      inTransitQty: Math.floor(seededRandom(seed + 261) * 12),
      wipDependentQty: Math.floor(seededRandom(seed + 262) * 8),
      firstRequiredDate: new Date(Date.now() + Math.floor(seededRandom(seed + 25) * 60) * 86400000),
      daysToFirstBlockedDemand,
      shortWeek: `WE ${formatWeekEnding(Math.floor(seededRandom(seed + 26) * 4))}`,
      shortWeekDate,
      riskWeek: `WE ${formatWeekEnding(Math.floor(seededRandom(seed + 27) * 6))}`,
      recoveryWeek: `WE ${formatWeekEnding(Math.floor(seededRandom(seed + 28) * 8) + 3)}`,
      recoveryWeekDate,
      programsImpacted: linkedProgramCount,
      jobsBlocked: linkedJobCount,
      buildsBlocked: Math.floor(seededRandom(seed + 29) * 3) + 1,
      clinsBlocked: linkedClinCount,
      linkedPrograms: programs.slice(0, linkedProgramCount),
      linkedJobs: Array.from({ length: linkedJobCount }, (_, j) => `JOB-${String(Math.floor(seededRandom(seed + 90 + j) * 9000) + 1000)}`),
      linkedClins: clins.slice(0, linkedClinCount),
      revenueAtRisk: Math.floor(seededRandom(seed + 30) * 2000000) + 100000,
      aopAtRisk: Math.floor(seededRandom(seed + 31) * 500000) + 50000,
      rtwBlocked: seededRandom(seed + 270) > 0.5,
      rtwBlockedJobs: Math.floor(seededRandom(seed + 271) * 4),
      linkedLateJobs: Math.floor(seededRandom(seed + 272) * 3),
      materialDrivenLateJobs: Math.floor(seededRandom(seed + 273) * 2),
      primaryDriver: drivers[Math.floor(seededRandom(seed + 32) * drivers.length)],
      blockingFunction: functions[Math.floor(seededRandom(seed + 33) * functions.length)],
      nextAction: nextActions[Math.floor(seededRandom(seed + 34) * nextActions.length)],
      actionStatus: ["Open", "In Progress", "Waiting", "Escalated", "Resolved"][Math.floor(seededRandom(seed + 35) * 5)] as ShortagePart["actionStatus"],
      owner: owners[Math.floor(seededRandom(seed + 36) * owners.length)],
      recoveryETA: new Date(Date.now() + Math.floor(seededRandom(seed + 37) * 45) * 86400000),
      lastUpdated: new Date(Date.now() - Math.floor(seededRandom(seed + 38) * 72) * 3600000),
      linkedPO: seededRandom(seed + 39) > 0.5 ? `PO-${Math.floor(seededRandom(seed + 40) * 90000) + 10000}` : null,
      poPromiseDate: seededRandom(seed + 39) > 0.5 ? new Date(Date.now() + Math.floor(seededRandom(seed + 41) * 30) * 86400000) : null,
      linkedMRB: seededRandom(seed + 42) > 0.7 ? `MRB-${Math.floor(seededRandom(seed + 43) * 9000) + 1000}` : null,
      linkedRI: seededRandom(seed + 44) > 0.7 ? `RI-${Math.floor(seededRandom(seed + 45) * 9000) + 1000}` : null,
      linkedNC: seededRandom(seed + 46) > 0.8 ? `NC-${Math.floor(seededRandom(seed + 47) * 9000) + 1000}` : null,
      daysOnDashboard: Math.floor(seededRandom(seed + 48) * 21) + 1,
      wasVisibleBeforeIncident: seededRandom(seed + 49) > 0.4,
      lessonLearned: seededRandom(seed + 280) > 0.6 ? lessonLearnedOptions[Math.floor(seededRandom(seed + 281) * lessonLearnedOptions.length)] : null,
      rootCauseConfirmed: seededRandom(seed + 282) > 0.5,
      priorityFactors: {
        blockedDemandCriticality: Math.floor(seededRandom(seed + 51) * 25),
        dateProximity: Math.floor(seededRandom(seed + 52) * 25),
        revenueAOP: Math.floor(seededRandom(seed + 53) * 20),
        substituteAvailability: Math.floor(seededRandom(seed + 54) * 15),
        leadTimeSeverity: Math.floor(seededRandom(seed + 55) * 15)
      },
      supplyBreakdown: {
        onHand: Math.floor(seededRandom(seed + 56) * 30),
        wip: Math.floor(seededRandom(seed + 57) * 15),
        openPO: Math.floor(seededRandom(seed + 58) * 25),
        inTransit: Math.floor(seededRandom(seed + 59) * 10),
        riPending: Math.floor(seededRandom(seed + 60) * 8),
        mrbHold: Math.floor(seededRandom(seed + 61) * 10),
        expired: Math.floor(seededRandom(seed + 62) * 5)
      },
      weeklyDemand,
      weeklyOnHand,
      weeklyWIP,
      weeklyOpenPO,
      weeklyInTransit,
      weeklyRIPending,
      weeklyBalance,
      weeklyBlockedJobs
    })
  }
  
  // Sort by priority score descending
  return parts.sort((a, b) => b.priorityScore - a.priorityScore).map((p, idx) => ({ ...p, rank: idx + 1 }))
}

// ===== COMPONENTS =====
const PriorityBadge = ({ tier, score }: { tier: PriorityTier; score?: number }) => {
  const colors = {
    Critical: "bg-red-100 text-red-700 border-red-200",
    High: "bg-orange-100 text-orange-700 border-orange-200",
    Medium: "bg-amber-100 text-amber-700 border-amber-200",
    Low: "bg-green-100 text-green-700 border-green-200"
  }
  return (
    <Badge className={`text-[9px] font-semibold border ${colors[tier]}`}>
      {tier}{score !== undefined && ` (${score})`}
    </Badge>
  )
}

const StatusBadge = ({ status }: { status: ShortageStatus }) => {
  const colors = {
    Short: "bg-red-100 text-red-700",
    "At-Risk": "bg-amber-100 text-amber-700",
    Covered: "bg-green-100 text-green-700"
  }
  return <Badge className={`text-[9px] ${colors[status]}`}>{status}</Badge>
}

// Flags Badge Component for compact display of status flags
const FlagsBadge = ({ part }: { part: ShortagePart }) => {
  const flags: { label: string; color: string }[] = []
  if (part.mrbQty > 0) flags.push({ label: "MRB", color: "bg-orange-100 text-orange-700" })
  if (part.riQty > 0) flags.push({ label: "RI", color: "bg-amber-100 text-amber-700" })
  if (part.shelfLifeRisk) flags.push({ label: "SL", color: "bg-lime-100 text-lime-700" })
  if (part.noSubstitute) flags.push({ label: "NS", color: "bg-pink-100 text-pink-700" })
  if (part.longLead) flags.push({ label: "LL", color: "bg-purple-100 text-purple-700" })
  if (part.inTransitQty > 0) flags.push({ label: "IT", color: "bg-cyan-100 text-cyan-700" })
  if (part.wipDependentQty > 0) flags.push({ label: "WIP", color: "bg-blue-100 text-blue-700" })
  
  if (flags.length === 0) return <span className="text-gray-400 text-[9px]">-</span>
  
  return (
    <div className="flex flex-wrap gap-0.5">
      {flags.slice(0, 4).map((flag, idx) => (
        <Badge key={idx} className={`text-[7px] px-1 py-0 ${flag.color}`}>{flag.label}</Badge>
      ))}
      {flags.length > 4 && <Badge className="text-[7px] px-1 py-0 bg-gray-100 text-gray-600">+{flags.length - 4}</Badge>}
    </div>
  )
}

const PriorityDecomposition = ({ factors }: { factors: ShortagePart["priorityFactors"] }) => {
  const total = Object.values(factors).reduce((a, b) => a + b, 0)
  const items = [
    { label: "Blocked Demand", value: factors.blockedDemandCriticality, color: "#dc2626" },
    { label: "Date Proximity", value: factors.dateProximity, color: "#f97316" },
    { label: "Revenue/AOP", value: factors.revenueAOP, color: "#eab308" },
    { label: "No Substitute", value: factors.substituteAvailability, color: "#8b5cf6" },
    { label: "Lead Time", value: factors.leadTimeSeverity, color: "#3b82f6" }
  ]
  return (
    <div className="space-y-1.5">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="text-[10px] text-gray-600 w-24">{item.label}</span>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(item.value / 25) * 100}%`, backgroundColor: item.color }} />
          </div>
          <span className="text-[10px] font-semibold w-6 text-right">{item.value}</span>
        </div>
      ))}
      <div className="flex items-center justify-between pt-1 border-t border-gray-200">
        <span className="text-[10px] font-semibold text-gray-700">Total Priority Score</span>
        <span className="text-sm font-bold text-blue-600">{total}</span>
      </div>
    </div>
  )
}

// ===== MAIN COMPONENT =====
export function ShortageCriticalPath() {
  // State
  const [activeTab, setActiveTab] = useState<"summary" | "ranked" | "critical" | "clin" | "netting" | "rootcause" | "workbench" | "trends">("summary")
  const [selectedHorizon, setSelectedHorizon] = useState<"7" | "14" | "30" | "60" | "90">("30")
  const [selectedSite, setSelectedSite] = useState<string>("all")
  const [selectedProgram, setSelectedProgram] = useState<string>("all")
  const [criticalPathOnly, setCriticalPathOnly] = useState(false)
  const [shortageStatus, setShortageStatus] = useState<"all" | "short" | "atrisk">("all")
  const [selectedRole, setSelectedRole] = useState<string>("all")
  const [workbenchRole, setWorkbenchRole] = useState<"planner" | "buyer" | "program" | "quality" | "ops">("planner")
  const [selectedPart, setSelectedPart] = useState<ShortagePart | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drillDownDriver, setDrillDownDriver] = useState<ShortageDriver | null>(null)
  const [criticalPathFilter, setCriticalPathFilter] = useState<"all" | "no-sub" | "long-lead" | "multi-pgm">("all")
  const [heatmapMetric, setHeatmapMetric] = useState<"shortage" | "jobs" | "demand">("shortage")
  const [selectedMatrixDrivers, setSelectedMatrixDrivers] = useState<Set<ShortageDriver>>(new Set(["Supplier Slip", "Late PR/PO", "MRB Hold", "RI Queue", "Shelf-Life"]))
  
  // Toggle driver visibility in the matrix chart
  const toggleMatrixDriver = (driver: ShortageDriver) => {
    setSelectedMatrixDrivers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(driver)) {
        // Don't allow deselecting all - keep at least one
        if (newSet.size > 1) {
          newSet.delete(driver)
        }
      } else {
        newSet.add(driver)
      }
      return newSet
    })
  }
  
  // Generate data
  const shortageParts = useMemo(() => generateShortageParts(), [])
  
  // Filter parts
  const filteredParts = useMemo(() => {
    let result = [...shortageParts]
    
    if (criticalPathOnly) {
      result = result.filter(p => p.criticalPath)
    }
    
    if (shortageStatus === "short") {
      result = result.filter(p => p.status === "Short")
    } else if (shortageStatus === "atrisk") {
      result = result.filter(p => p.status === "At-Risk")
    }
    
    if (selectedProgram !== "all") {
      result = result.filter(p => p.linkedPrograms.includes(selectedProgram))
    }
    
    if (drillDownDriver) {
      result = result.filter(p => p.primaryDriver === drillDownDriver)
    }
    
    return result
  }, [shortageParts, criticalPathOnly, shortageStatus, selectedProgram, drillDownDriver])
  
  // Critical path filtered parts
  const criticalPathFilteredParts = useMemo(() => {
    let result = filteredParts.filter(p => p.criticalPath)
    if (criticalPathFilter === "no-sub") {
      result = result.filter(p => p.noSubstitute)
    } else if (criticalPathFilter === "long-lead") {
      result = result.filter(p => p.longLead)
    } else if (criticalPathFilter === "multi-pgm") {
      result = result.filter(p => p.programsImpacted > 1)
    }
    return result
  }, [filteredParts, criticalPathFilter])
  
  // KPI calculations
  const kpis = useMemo(() => {
    const shortParts = shortageParts.filter(p => p.status === "Short")
    const atRiskParts = shortageParts.filter(p => p.status === "At-Risk")
    const criticalPathParts = shortageParts.filter(p => p.criticalPath)
    const totalJobsBlocked = new Set(shortageParts.flatMap(p => p.linkedJobs)).size
    const totalClinsAtRisk = new Set(shortageParts.flatMap(p => p.linkedClins)).size
    const totalRevenueAtRisk = shortageParts.reduce((sum, p) => sum + p.revenueAtRisk, 0)
    const mrbDrivenBlocks = shortageParts.filter(p => p.primaryDriver === "MRB Hold" || p.primaryDriver === "RI Queue").length
    const surpriseLateJobs = shortageParts.filter(p => !p.wasVisibleBeforeIncident).length
    const rtwBlocked = shortageParts.filter(p => p.rtwBlocked).length
    
    return {
      partsInShortage: shortParts.length,
      partsAtRisk: atRiskParts.length,
      criticalPathParts: criticalPathParts.length,
      jobsBlocked: totalJobsBlocked,
      clinsAtRisk: totalClinsAtRisk,
      revenueAtRisk: totalRevenueAtRisk,
      mrbDrivenBlocks,
      surpriseLateJobs,
      rtwBlocked
    }
  }, [shortageParts])
  
  // Impact matrix data - using Days to First Blocked Demand instead of Lead Time
  const impactMatrixData = useMemo(() => {
    return filteredParts
      .filter(p => selectedMatrixDrivers.has(p.primaryDriver))
      .slice(0, 40)
      .map(p => ({
        x: p.daysToFirstBlockedDemand,
        y: p.priorityScore,
        z: p.jobsBlocked * 5 + p.revenueAtRisk / 100000,
        name: p.partNumber,
        driver: p.primaryDriver,
        tier: p.priorityTier,
        leadTime: p.leadTimeDays,
        clins: p.clinsBlocked,
        jobs: p.jobsBlocked
      }))
  }, [filteredParts, selectedMatrixDrivers])
  
  // Root cause data
  const rootCauseData = useMemo(() => {
    const driverCounts: Record<string, { count: number; weightedImpact: number }> = {}
    filteredParts.forEach(p => {
      if (!driverCounts[p.primaryDriver]) {
        driverCounts[p.primaryDriver] = { count: 0, weightedImpact: 0 }
      }
      driverCounts[p.primaryDriver].count++
      driverCounts[p.primaryDriver].weightedImpact += p.priorityScore * (p.revenueAtRisk / 100000)
    })
    return Object.entries(driverCounts)
      .map(([driver, data]) => ({ driver, ...data }))
      .sort((a, b) => b.weightedImpact - a.weightedImpact)
  }, [filteredParts])
  
  // Blocking function data
  const blockingFunctionData = useMemo(() => {
    const functionCounts: Record<string, { critical: number; high: number; medium: number; low: number }> = {}
    filteredParts.forEach(p => {
      if (!functionCounts[p.blockingFunction]) {
        functionCounts[p.blockingFunction] = { critical: 0, high: 0, medium: 0, low: 0 }
      }
      functionCounts[p.blockingFunction][p.priorityTier.toLowerCase() as "critical" | "high" | "medium" | "low"]++
    })
    return Object.entries(functionCounts).map(([func, counts]) => ({ function: func, ...counts }))
  }, [filteredParts])
  
  // CLIN impact data with top blocking parts
  const clinImpactData = useMemo(() => {
    const clinMap: Record<string, { 
      clin: string; 
      program: string;
      requiredDate: Date;
      linkedParts: number;
      criticalParts: number;
      highestPriority: number;
      revenueAtRisk: number;
      primaryDriver: ShortageDriver;
      recoveryConfidence: string;
      topBlockingParts: string[];
      partsList: ShortagePart[];
    }> = {}
    
    filteredParts.forEach(p => {
      p.linkedClins.forEach((clin, idx) => {
        if (!clinMap[clin]) {
          clinMap[clin] = {
            clin,
            program: p.linkedPrograms[0] || programs[idx % programs.length],
            requiredDate: p.firstRequiredDate,
            linkedParts: 0,
            criticalParts: 0,
            highestPriority: 0,
            revenueAtRisk: 0,
            primaryDriver: p.primaryDriver,
            recoveryConfidence: "Medium",
            topBlockingParts: [],
            partsList: []
          }
        }
        clinMap[clin].linkedParts++
        clinMap[clin].partsList.push(p)
        if (p.criticalPath) clinMap[clin].criticalParts++
        clinMap[clin].highestPriority = Math.max(clinMap[clin].highestPriority, p.priorityScore)
        clinMap[clin].revenueAtRisk += p.revenueAtRisk
      })
    })
    
    return Object.values(clinMap)
      .sort((a, b) => b.highestPriority - a.highestPriority)
      .map(c => ({
        ...c,
        recoveryConfidence: c.highestPriority >= 85 ? "Low" : c.highestPriority >= 65 ? "Medium" : "High",
        topBlockingParts: c.partsList.sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 3).map(p => p.partNumber)
      }))
  }, [filteredParts])
  
  // Trend data with real week-ending dates
  const trendData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const weekDate = new Date(Date.now() - (11 - i) * 7 * 86400000)
      const dayOfWeek = weekDate.getDay()
      weekDate.setDate(weekDate.getDate() + (7 - dayOfWeek) % 7)
      return {
        week: `${weekDate.getMonth() + 1}/${weekDate.getDate()}`,
        shortParts: Math.floor(seededRandom(i + 100) * 30) + 20,
        atRiskParts: Math.floor(seededRandom(i + 200) * 25) + 15,
        criticalPathParts: Math.floor(seededRandom(i + 300) * 15) + 8,
        jobsBlocked: Math.floor(seededRandom(i + 400) * 20) + 10
      }
    })
  }, [])
  
  // Handle part selection
  const handleSelectPart = (part: ShortagePart) => {
    setSelectedPart(part)
    setDrawerOpen(true)
  }
  
  // Clear drill-down
  const clearDrillDown = () => {
    setDrillDownDriver(null)
  }
  
  // Navigate to ranked list with filter
  const navigateToRankedWithFilter = (driver: ShortageDriver) => {
    setDrillDownDriver(driver)
    setActiveTab("ranked")
  }
  
  // Navigate to ranked list filtered for a CLIN's parts
  const navigateToClinParts = (partNumbers: string[]) => {
    // In a real implementation, this would filter the ranked list
    setActiveTab("ranked")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Shortage Dashboard & Critical Path Parts</h1>
          <p className="text-sm text-slate-500 mt-0.5">Demand-linked, prioritized shortage view for OTD / AOP / capacity protection</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500">Last refresh: {new Date().toLocaleString()}</span>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <Share2 className="w-3.5 h-3.5" /> Share
          </Button>
        </div>
      </div>
      
      {/* Global Filters */}
      <Card className="border border-gray-200">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600">Horizon:</span>
              <Select value={selectedHorizon} onValueChange={(v) => setSelectedHorizon(v as typeof selectedHorizon)}>
                <SelectTrigger className="h-7 text-xs w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600">Site:</span>
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger className="h-7 text-xs w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sites</SelectItem>
                  {sites.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600">Program:</span>
              <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                <SelectTrigger className="h-7 text-xs w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  {programs.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600">Status:</span>
              <Select value={shortageStatus} onValueChange={(v) => setShortageStatus(v as typeof shortageStatus)}>
                <SelectTrigger className="h-7 text-xs w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Both</SelectItem>
                  <SelectItem value="short">Short</SelectItem>
                  <SelectItem value="atrisk">At-Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <button
              onClick={() => setCriticalPathOnly(!criticalPathOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                criticalPathOnly ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              Critical Path Only
            </button>
            
            {drillDownDriver && (
              <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 rounded border border-blue-200">
                <span className="text-[10px] text-blue-700">Filtered by: {drillDownDriver}</span>
                <button onClick={clearDrillDown} className="text-blue-600 hover:text-blue-800">
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          
          {/* Context Strip */}
          <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100">
            <span className="text-[10px] text-gray-500">
              <strong>Context:</strong> {selectedHorizon}d horizon • {selectedSite === "all" ? "All Sites" : selectedSite} • 
              {selectedProgram === "all" ? " All Programs" : ` ${selectedProgram}`} •
              {criticalPathOnly ? " Critical Path Only" : " All Parts"}
            </span>
            <span className="text-[10px] text-gray-400">|</span>
            <span className="text-[10px] text-gray-500">
              Showing <strong>{filteredParts.length}</strong> parts of {shortageParts.length} total
            </span>
          </div>
        </CardContent>
      </Card>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="bg-gray-100 p-1 h-auto flex-wrap">
          <TabsTrigger value="summary" className="text-xs data-[state=active]:bg-white">Executive Summary</TabsTrigger>
          <TabsTrigger value="ranked" className="text-xs data-[state=active]:bg-white">Ranked Shortage List</TabsTrigger>
          <TabsTrigger value="critical" className="text-xs data-[state=active]:bg-white">Critical Path Parts</TabsTrigger>
          <TabsTrigger value="clin" className="text-xs data-[state=active]:bg-white">Program / CLIN Impact</TabsTrigger>
          <TabsTrigger value="netting" className="text-xs data-[state=active]:bg-white">Supply Netting & Coverage</TabsTrigger>
          <TabsTrigger value="rootcause" className="text-xs data-[state=active]:bg-white">Root Cause & Actions</TabsTrigger>
          <TabsTrigger value="workbench" className="text-xs data-[state=active]:bg-white">Role Workbench</TabsTrigger>
          <TabsTrigger value="trends" className="text-xs data-[state=active]:bg-white">Trends & Governance</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* TAB 1: Executive Summary */}
      {activeTab === "summary" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-9 gap-3">
            {[
              { label: "Parts in Shortage", value: kpis.partsInShortage, icon: Package, color: "text-red-600", bg: "bg-red-50" },
              { label: "Parts At-Risk", value: kpis.partsAtRisk, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
              { label: "Critical Path Parts", value: kpis.criticalPathParts, icon: GitBranch, color: "text-purple-600", bg: "bg-purple-50" },
              { label: "Jobs Blocked", value: kpis.jobsBlocked, icon: ClipboardList, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "CLINs at Risk", value: kpis.clinsAtRisk, icon: Target, color: "text-indigo-600", bg: "bg-indigo-50" },
              { label: "Revenue at Risk", value: formatCurrency(kpis.revenueAtRisk), icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
              { label: "RTW Blocks (Supply)", value: kpis.rtwBlocked, icon: Wrench, color: "text-cyan-600", bg: "bg-cyan-50" },
              { label: "MRB/RI Blocks", value: kpis.mrbDrivenBlocks, icon: ShieldAlert, color: "text-orange-600", bg: "bg-orange-50" },
              { label: "Surprise Late Jobs", value: kpis.surpriseLateJobs, icon: AlertCircle, color: "text-pink-600", bg: "bg-pink-50" }
            ].map((kpi, idx) => (
              <Card key={idx} className={`border border-gray-200 ${kpi.bg}`}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                    <span className="text-[10px] text-gray-500 uppercase font-medium">{kpi.label}</span>
                  </div>
                  <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            {/* Impact vs Timing Matrix - FIXED: Using Days to First Blocked Demand */}
            <Card className="border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <div>
                  <CardTitle className="text-sm font-bold text-gray-800">Priority vs Demand Timing Urgency</CardTitle>
                  <p className="text-[10px] text-gray-500 mt-0.5">Bubble size = blocked demand / business impact; x-axis reflects timing to first affected demand, not supplier lead time.</p>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      type="number" 
                      dataKey="x" 
                      name="Days to First Blocked Demand" 
                      tick={{ fontSize: 10 }} 
                      label={{ value: "Days to First Blocked Demand", position: "bottom", fontSize: 10, offset: 15 }}
                      domain={[0, 'auto']}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="y" 
                      name="Priority Score" 
                      tick={{ fontSize: 10 }} 
                      label={{ value: "Priority Score", angle: -90, position: "left", fontSize: 10 }} 
                    />
                    <ZAxis type="number" dataKey="z" range={[50, 400]} />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-lg text-xs">
                              <p className="font-semibold">{data.name}</p>
                              <p>Priority Score: {data.y}</p>
                              <p>Days to Blocked Demand: {data.x}</p>
                              <p>Jobs Blocked: {data.jobs}</p>
                              <p>CLINs Affected: {data.clins}</p>
                              <p>Driver: {data.driver}</p>
                              <p className="text-gray-500">Lead Time: {data.leadTime} days</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    {/* Urgency zones */}
                    <ReferenceArea x1={0} x2={7} fill="#fee2e2" fillOpacity={0.3} />
                    <ReferenceArea x1={7} x2={14} fill="#fef3c7" fillOpacity={0.3} />
                    <Scatter data={impactMatrixData}>
                      {impactMatrixData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={DRIVER_COLORS[entry.driver as ShortageDriver] || COLORS.muted} fillOpacity={0.7} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-2 text-[10px]">
                  {(["Supplier Slip", "Late PR/PO", "MRB Hold", "RI Queue", "Shelf-Life"] as ShortageDriver[]).map((driver) => {
                    const isSelected = selectedMatrixDrivers.has(driver)
                    return (
                      <button
                        key={driver}
                        onClick={() => toggleMatrixDriver(driver)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-full transition-all cursor-pointer ${
                          isSelected 
                            ? "bg-gray-100 hover:bg-gray-200" 
                            : "bg-gray-50 opacity-40 hover:opacity-60"
                        }`}
                      >
                        <span 
                          className="w-2.5 h-2.5 rounded-full transition-opacity" 
                          style={{ 
                            backgroundColor: DRIVER_COLORS[driver],
                            opacity: isSelected ? 1 : 0.4
                          }} 
                        />
                        <span className={isSelected ? "text-gray-700" : "text-gray-400 line-through"}>
                          {driver}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <p className="text-[9px] text-gray-400 text-center mt-1">Click legend items to filter</p>
              </CardContent>
            </Card>
            
            {/* Priority Score Composition */}
            <Card className="border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <div>
                  <CardTitle className="text-sm font-bold text-gray-800">Shortage Priority Score Composition</CardTitle>
                  <p className="text-[10px] text-gray-500 mt-0.5">How rankings are driven across all shortage parts</p>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={[
                    { factor: "Blocked Demand Criticality", avg: Math.floor(filteredParts.reduce((s, p) => s + p.priorityFactors.blockedDemandCriticality, 0) / filteredParts.length) },
                    { factor: "Date Proximity", avg: Math.floor(filteredParts.reduce((s, p) => s + p.priorityFactors.dateProximity, 0) / filteredParts.length) },
                    { factor: "Revenue / AOP Impact", avg: Math.floor(filteredParts.reduce((s, p) => s + p.priorityFactors.revenueAOP, 0) / filteredParts.length) },
                    { factor: "No Substitute Available", avg: Math.floor(filteredParts.reduce((s, p) => s + p.priorityFactors.substituteAvailability, 0) / filteredParts.length) },
                    { factor: "Lead Time Severity", avg: Math.floor(filteredParts.reduce((s, p) => s + p.priorityFactors.leadTimeSeverity, 0) / filteredParts.length) }
                  ]} layout="vertical" margin={{ left: 140 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 10 }} domain={[0, 25]} />
                    <YAxis type="category" dataKey="factor" tick={{ fontSize: 10 }} width={140} />
                    <RechartsTooltip />
                    <Bar dataKey="avg" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-[10px] text-gray-500 text-center mt-2">Average contribution to priority score (max 25 per factor)</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Top Critical Shortages Table - ENHANCED with Net Demand/Supply/Shortage and Flags */}
          <Card className="border border-gray-200">
            <CardHeader className="py-3 px-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-gray-800">Top Critical Shortages</CardTitle>
                  <p className="text-[10px] text-gray-500 mt-0.5">Click any row to view part details</p>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setActiveTab("ranked")}>
                  View Full List <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[350px] overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-2 font-semibold text-gray-700 w-12">Rank</th>
                      <th className="text-left p-2 font-semibold text-gray-700">Part Number</th>
                      <th className="text-left p-2 font-semibold text-gray-700">Description</th>
                      <th className="text-center p-2 font-semibold text-gray-700">CP</th>
                      <th className="text-right p-2 font-semibold text-gray-700">Net Demand</th>
                      <th className="text-right p-2 font-semibold text-gray-700">Net Usable Supply</th>
                      <th className="text-right p-2 font-semibold text-gray-700">Net Short</th>
                      <th className="text-center p-2 font-semibold text-gray-700">First Short Wk</th>
                      <th className="text-center p-2 font-semibold text-gray-700">Flags</th>
                      <th className="text-center p-2 font-semibold text-gray-700">Jobs</th>
                      <th className="text-left p-2 font-semibold text-gray-700">Program/CLIN</th>
                      <th className="text-left p-2 font-semibold text-gray-700">Driver</th>
                      <th className="text-left p-2 font-semibold text-gray-700">Owner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredParts.slice(0, 15).map((part) => (
                      <tr key={part.id} className={`hover:bg-blue-50 cursor-pointer ${part.priorityTier === "Critical" ? "bg-red-50/30" : ""}`} onClick={() => handleSelectPart(part)}>
                        <td className="p-2 font-bold text-gray-900">{part.rank}</td>
                        <td className="p-2 font-mono text-blue-600">{part.partNumber}</td>
                        <td className="p-2 text-gray-700 max-w-[140px] truncate">{part.description}</td>
                        <td className="p-2 text-center">
                          {part.criticalPath && <Badge className="text-[8px] bg-purple-100 text-purple-700">CP</Badge>}
                        </td>
                        <td className="p-2 text-right font-medium">{part.netDemand}</td>
                        <td className="p-2 text-right font-medium text-green-700">{part.netUsableSupply}</td>
                        <td className={`p-2 text-right font-semibold ${part.netShortageQty > 0 ? "text-red-600" : "text-amber-600"}`}>
                          {part.netShortageQty > 0 ? part.netShortageQty : `-${part.atRiskCoverageQty}`}
                        </td>
                        <td className="p-2 text-center">
                          <Badge variant="outline" className="text-[9px]">{part.shortWeek}</Badge>
                        </td>
                        <td className="p-2 text-center">
                          <FlagsBadge part={part} />
                        </td>
                        <td className="p-2 text-center font-semibold">{part.jobsBlocked}</td>
                        <td className="p-2 text-gray-700 text-[10px]">{part.linkedPrograms[0]?.split(" ")[0]} / {part.linkedClins[0]}</td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-[9px]" style={{ borderColor: DRIVER_COLORS[part.primaryDriver], color: DRIVER_COLORS[part.primaryDriver] }}>
                            {part.primaryDriver}
                          </Badge>
                        </td>
                        <td className="p-2 text-gray-600">{part.owner}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* TAB 2: Ranked Shortage List - ENHANCED with Flags and RTW/Late Job columns */}
      {activeTab === "ranked" && (
        <div className="space-y-4">
          {/* Summary Strip */}
          <div className="flex items-center gap-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-red-500" />
              <span className="text-xs"><strong className="text-red-600">{filteredParts.filter(p => p.status === "Short").length}</strong> parts short</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-xs"><strong className="text-amber-600">{filteredParts.filter(p => p.status === "At-Risk").length}</strong> parts at risk</span>
            </div>
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-purple-500" />
              <span className="text-xs"><strong className="text-purple-600">{filteredParts.filter(p => p.criticalPath).length}</strong> critical-path parts</span>
            </div>
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-blue-500" />
              <span className="text-xs"><strong className="text-blue-600">{new Set(filteredParts.flatMap(p => p.linkedJobs)).size}</strong> jobs blocked</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-500" />
              <span className="text-xs"><strong className="text-indigo-600">{new Set(filteredParts.flatMap(p => p.linkedClins)).size}</strong> CLINs impacted</span>
            </div>
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-cyan-500" />
              <span className="text-xs"><strong className="text-cyan-600">{filteredParts.filter(p => p.rtwBlocked).length}</strong> RTW blocked</span>
            </div>
          </div>
          
          {/* Main Ranked Table */}
          <Card className="border border-gray-200">
            <CardHeader className="py-3 px-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-gray-800">Ranked Shortage List</CardTitle>
                <Badge className="bg-blue-100 text-blue-700 text-[10px]">Ranked by composite priority score</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-2 font-semibold text-gray-700 sticky left-0 bg-gray-50 w-12">Rank</th>
                      <th className="text-center p-2 font-semibold text-gray-700 w-16">Priority</th>
                      <th className="text-center p-2 font-semibold text-gray-700 w-10">CP</th>
                      <th className="text-left p-2 font-semibold text-gray-700">Part Number</th>
                      <th className="text-left p-2 font-semibold text-gray-700">Description</th>
                      <th className="text-center p-2 font-semibold text-gray-700">Flags</th>
                      <th className="text-center p-2 font-semibold text-gray-700">Jobs/CLINs</th>
                      <th className="text-right p-2 font-semibold text-gray-700">Net Demand</th>
                      <th className="text-right p-2 font-semibold text-gray-700">Net Usable</th>
                      <th className="text-right p-2 font-semibold text-gray-700">Net Short</th>
                      <th className="text-center p-2 font-semibold text-gray-700">First Short Wk</th>
                      <th className="text-center p-2 font-semibold text-gray-700">Status</th>
                      <th className="text-left p-2 font-semibold text-gray-700">Driver</th>
                      <th className="text-center p-2 font-semibold text-gray-700">RTW Blk</th>
                      <th className="text-center p-2 font-semibold text-gray-700">Late Jobs</th>
                      <th className="text-left p-2 font-semibold text-gray-700">Owner</th>
                      <th className="text-left p-2 font-semibold text-gray-700">Recovery</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredParts.slice(0, 50).map((part) => (
                      <tr 
                        key={part.id} 
                        className={`hover:bg-blue-50 cursor-pointer ${part.priorityTier === "Critical" ? "bg-red-50/30" : part.priorityTier === "High" ? "bg-orange-50/20" : ""}`} 
                        onClick={() => handleSelectPart(part)}
                      >
                        <td className="p-2 font-bold text-gray-900 sticky left-0 bg-inherit">{part.rank}</td>
                        <td className="p-2 text-center"><PriorityBadge tier={part.priorityTier} score={part.priorityScore} /></td>
                        <td className="p-2 text-center">
                          {part.criticalPath && <Badge className="text-[8px] bg-purple-100 text-purple-700">CP</Badge>}
                        </td>
                        <td className="p-2 font-mono text-blue-600">{part.partNumber}</td>
                        <td className="p-2 text-gray-700 max-w-[120px] truncate" title={part.description}>{part.description}</td>
                        <td className="p-2 text-center">
                          <FlagsBadge part={part} />
                        </td>
                        <td className="p-2 text-center">
                          <span className="text-blue-600 font-semibold">{part.jobsBlocked}</span>
                          <span className="text-gray-400"> / </span>
                          <span className="text-indigo-600 font-semibold">{part.clinsBlocked}</span>
                        </td>
                        <td className="p-2 text-right font-medium">{part.netDemand}</td>
                        <td className="p-2 text-right font-medium text-green-700">{part.netUsableSupply}</td>
                        <td className={`p-2 text-right font-semibold ${part.netShortageQty > 0 ? "text-red-600" : "text-amber-600"}`}>
                          {part.netShortageQty > 0 ? part.netShortageQty : `-${part.atRiskCoverageQty}`}
                        </td>
                        <td className="p-2 text-center">
                          <Badge variant="outline" className="text-[9px]">{part.shortWeek}</Badge>
                        </td>
                        <td className="p-2 text-center"><StatusBadge status={part.status} /></td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-[9px]" style={{ borderColor: DRIVER_COLORS[part.primaryDriver], color: DRIVER_COLORS[part.primaryDriver] }}>
                            {part.primaryDriver}
                          </Badge>
                        </td>
                        <td className="p-2 text-center">
                          {part.rtwBlocked ? (
                            <Badge className="text-[8px] bg-cyan-100 text-cyan-700">{part.rtwBlockedJobs}</Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          {part.linkedLateJobs > 0 ? (
                            <Badge className="text-[8px] bg-pink-100 text-pink-700">{part.linkedLateJobs}</Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-2 text-gray-600">{part.owner}</td>
                        <td className="p-2 text-gray-600">{part.recoveryWeek}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* TAB 3: Critical Path Parts - FIXED with better charts */}
      {activeTab === "critical" && (
        <div className="space-y-6">
          {/* Tab Banner with tooltip */}
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-purple-800 font-medium">Critical Path Parts</p>
                <p className="text-xs text-purple-700 mt-0.5">Parts with few/no substitutes, long lead times, or high downstream impact across important jobs/builds/CLINs. These require proactive monitoring to prevent schedule and revenue impact.</p>
              </div>
            </div>
          </div>
          
          {/* Toggle Filters */}
          <div className="flex items-center gap-3">
            {[
              { id: "all", label: "All Critical Path" },
              { id: "no-sub", label: "No Substitute Only" },
              { id: "long-lead", label: "Long Lead Only" },
              { id: "multi-pgm", label: "Multi-Program Only" }
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => setCriticalPathFilter(filter.id as typeof criticalPathFilter)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  criticalPathFilter === filter.id 
                    ? "bg-purple-600 text-white" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            {/* Critical Path Watchlist - ENHANCED */}
            <Card className="border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-800">Critical Path Parts Watchlist</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[400px] overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-2 font-semibold text-gray-700">Part Number</th>
                        <th className="text-center p-2 font-semibold text-gray-700">CP Score</th>
                        <th className="text-center p-2 font-semibold text-gray-700">NS</th>
                        <th className="text-center p-2 font-semibold text-gray-700">Lead Time</th>
                        <th className="text-center p-2 font-semibold text-gray-700">Pgms/CLINs</th>
                        <th className="text-center p-2 font-semibold text-gray-700">Jobs Blk</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Required</th>
                        <th className="text-right p-2 font-semibold text-gray-700">Net Short</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Owner</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {criticalPathFilteredParts.slice(0, 20).map((part) => (
                        <tr key={part.id} className="hover:bg-blue-50 cursor-pointer" onClick={() => handleSelectPart(part)}>
                          <td className="p-2 font-mono text-blue-600">{part.partNumber}</td>
                          <td className="p-2 text-center">
                            <Badge className={`text-[9px] ${part.criticalPathScore >= 80 ? "bg-red-100 text-red-700" : part.criticalPathScore >= 60 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                              {part.criticalPathScore}
                            </Badge>
                          </td>
                          <td className="p-2 text-center">
                            {part.noSubstitute && <Badge className="text-[8px] bg-pink-100 text-pink-700">Yes</Badge>}
                          </td>
                          <td className="p-2 text-center font-medium">{part.leadTimeDays}d</td>
                          <td className="p-2 text-center">
                            <span className="text-purple-600">{part.programsImpacted}</span> / <span className="text-indigo-600">{part.clinsBlocked}</span>
                          </td>
                          <td className="p-2 text-center font-semibold text-blue-600">{part.jobsBlocked}</td>
                          <td className="p-2 text-gray-600">{formatDate(part.firstRequiredDate)}</td>
                          <td className={`p-2 text-right font-semibold ${part.netShortageQty > 0 ? "text-red-600" : "text-amber-600"}`}>
                            {part.netShortageQty > 0 ? part.netShortageQty : part.atRiskCoverageQty}
                          </td>
                          <td className="p-2 text-gray-600">{part.owner}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            
            {/* Downstream Demand Impact - FIXED: Grouped horizontal bar chart */}
            <Card className="border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <div>
                  <CardTitle className="text-sm font-bold text-gray-800">Downstream Demand Impact by Critical Part</CardTitle>
                  <p className="text-[10px] text-gray-500 mt-0.5">Shows how many jobs, builds, CLINs, and programs each critical-path part feeds.</p>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart 
                    data={criticalPathFilteredParts.slice(0, 8).map(p => ({
                      part: p.partNumber,
                      jobs: p.jobsBlocked,
                      builds: p.buildsBlocked,
                      clins: p.clinsBlocked,
                      programs: p.programsImpacted
                    }))} 
                    layout="vertical" 
                    margin={{ left: 120, right: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis 
                      type="category" 
                      dataKey="part" 
                      tick={{ fontSize: 9 }} 
                      width={115}
                      tickFormatter={(value) => value.length > 16 ? `${value.slice(0, 16)}...` : value}
                    />
                    <RechartsTooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-lg text-xs max-w-xs">
                              <p className="font-semibold mb-1 text-gray-800">Part: {label}</p>
                              <div className="space-y-0.5">
                                {payload.map((p, idx) => (
                                  <p key={idx} style={{ color: p.color }}>{p.name}: {p.value}</p>
                                ))}
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="jobs" fill="#3b82f6" name="Jobs Blocked" />
                    <Bar dataKey="builds" fill="#8b5cf6" name="Builds Blocked" />
                    <Bar dataKey="clins" fill="#6366f1" name="CLINs Affected" />
                    <Bar dataKey="programs" fill="#ec4899" name="Programs Impacted" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          {/* Critical Path Exposure Heatmap - FIXED with clear metric selector */}
          <Card className="border border-gray-200">
            <CardHeader className="py-3 px-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-gray-800">Critical Path Exposure by Week</CardTitle>
                  <p className="text-[10px] text-gray-500 mt-0.5">Weekly projected blocked demand or net shortage for critical-path parts.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-600">Show:</span>
                  <Select value={heatmapMetric} onValueChange={(v) => setHeatmapMetric(v as typeof heatmapMetric)}>
                    <SelectTrigger className="h-7 text-xs w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shortage">Net Shortage Qty</SelectItem>
                      <SelectItem value="jobs">Blocked Jobs</SelectItem>
                      <SelectItem value="demand">Blocked Demand Qty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-12 gap-1">
                <div className="col-span-2 text-[10px] font-semibold text-gray-600">Part Number</div>
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} className="text-center text-[9px] text-gray-500 font-medium">
                    WE {formatWeekEnding(i)}
                  </div>
                ))}
                {criticalPathFilteredParts.slice(0, 8).map((part, pIdx) => (
                  <>
                    <div key={`label-${pIdx}`} className="col-span-2 text-[10px] font-mono text-gray-700 truncate pr-2 flex items-center">
                      {part.partNumber.slice(-8)}
                    </div>
                    {Array.from({ length: 10 }, (_, wIdx) => {
                      let value: number
                      let displayValue: string
                      
                      if (heatmapMetric === "shortage") {
                        value = part.weeklyBalance[wIdx] || 0
                        displayValue = value !== 0 ? String(value) : ""
                      } else if (heatmapMetric === "jobs") {
                        value = part.weeklyBlockedJobs[wIdx] || 0
                        displayValue = value > 0 ? String(value) : ""
                      } else {
                        value = part.weeklyDemand[wIdx] || 0
                        displayValue = value > 0 ? String(value) : ""
                      }
                      
                      const getSeverity = () => {
                        if (heatmapMetric === "shortage") {
                          return value < -10 ? "high" : value < 0 ? "medium" : value < 5 ? "low" : "clear"
                        } else {
                          return value >= 3 ? "high" : value >= 1 ? "medium" : value > 0 ? "low" : "clear"
                        }
                      }
                      
                      const severity = getSeverity()
                      return (
                        <Tooltip key={`cell-${pIdx}-${wIdx}`}>
                          <TooltipTrigger asChild>
                            <div
                              className="h-7 rounded flex items-center justify-center text-[10px] font-medium cursor-pointer hover:ring-2 hover:ring-blue-400"
                              style={{
                                backgroundColor: severity === "high" ? "#fee2e2" : severity === "medium" ? "#fef3c7" : severity === "low" ? "#dbeafe" : "#f3f4f6",
                                color: severity === "high" ? "#991b1b" : severity === "medium" ? "#92400e" : severity === "low" ? "#1e40af" : "#6b7280"
                              }}
                            >
                              {displayValue}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs bg-gray-900 text-white p-2">
                            <p className="font-semibold">{part.partNumber}</p>
                            <p>Week Ending: {formatWeekEnding(wIdx)}</p>
                            <p>Net Shortage: {part.weeklyBalance[wIdx] || 0}</p>
                            <p>Blocked Jobs: {part.weeklyBlockedJobs[wIdx] || 0}</p>
                            <p>Demand: {part.weeklyDemand[wIdx] || 0}</p>
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </>
                ))}
              </div>
              <div className="flex items-center justify-center gap-4 mt-3 text-[10px]">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100" /> High Impact</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100" /> Medium Impact</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100" /> Low Impact</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100" /> Covered</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* TAB 4: Program / CLIN Impact - ENHANCED with top blocking parts */}
      {activeTab === "clin" && (
        <div className="space-y-6">
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
            <p className="text-sm text-indigo-800">
              <strong>Program / CLIN Impact:</strong> Connect shortage parts directly to demand commitments and see which CLINs are most at risk.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            {/* Program/CLIN Risk Heatmap */}
            <Card className="border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-800">Program / CLIN Risk Heatmap</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-12 gap-1">
                  <div className="col-span-2" />
                  {Array.from({ length: 10 }, (_, i) => (
                    <div key={i} className="text-center text-[9px] text-gray-500 font-medium">WE {formatWeekEnding(i)}</div>
                  ))}
                  {programs.slice(0, 5).map((program, pIdx) => (
                    <>
                      <div key={`label-${pIdx}`} className="col-span-2 text-[10px] font-medium text-gray-700 truncate pr-2">
                        {program.split(" ")[0]}
                      </div>
                      {Array.from({ length: 10 }, (_, wIdx) => {
                        const linkedParts = Math.floor(seededRandom(pIdx * 100 + wIdx) * 8)
                        const risk = linkedParts * (seededRandom(pIdx * 100 + wIdx + 50) * 15)
                        return (
                          <Tooltip key={`cell-${pIdx}-${wIdx}`}>
                            <TooltipTrigger asChild>
                              <div
                                className="h-7 rounded flex items-center justify-center text-[10px] font-medium cursor-pointer hover:ring-2 hover:ring-blue-400"
                                style={{
                                  backgroundColor: risk > 60 ? "#fee2e2" : risk > 30 ? "#fef3c7" : risk > 10 ? "#dbeafe" : "#f3f4f6",
                                  color: risk > 60 ? "#991b1b" : risk > 30 ? "#92400e" : risk > 10 ? "#1e40af" : "#6b7280"
                                }}
                              >
                                {linkedParts > 0 ? linkedParts : ""}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs bg-gray-900 text-white p-2">
                              <p className="font-semibold">{program}</p>
                              <p>Week {wIdx + 1}: {linkedParts} shortage parts</p>
                            </TooltipContent>
                          </Tooltip>
                        )
                      })}
                    </>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Near-Term Build / Shipment Timeline */}
            <Card className="border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-800">Near-Term Commitment Timeline</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3 max-h-[280px] overflow-auto">
                  {clinImpactData.slice(0, 8).map((clin, idx) => (
                    <Tooltip key={idx}>
                      <TooltipTrigger asChild>
                        <div 
                          className={`p-3 rounded-lg border cursor-pointer hover:border-blue-400 ${
                            clin.recoveryConfidence === "Low" ? "bg-red-50 border-red-200" : 
                            clin.recoveryConfidence === "Medium" ? "bg-amber-50 border-amber-200" : 
                            "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-900">{clin.program.split(" ")[0]}</span>
                              <Badge variant="outline" className="text-[9px]">{clin.clin}</Badge>
                            </div>
                            <span className="text-xs text-gray-600">{formatDate(clin.requiredDate)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-600">
                              <strong className="text-red-600">{clin.linkedParts}</strong> shortage parts ({clin.criticalParts} critical path)
                            </span>
                            <Badge className={`text-[9px] ${
                              clin.recoveryConfidence === "High" ? "bg-green-100 text-green-700" : 
                              clin.recoveryConfidence === "Medium" ? "bg-amber-100 text-amber-700" : 
                              "bg-red-100 text-red-700"
                            }`}>
                              {clin.recoveryConfidence} Recovery
                            </Badge>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs bg-gray-900 text-white p-2 max-w-xs">
                        <p className="font-semibold mb-1">Recovery Confidence: {clin.recoveryConfidence}</p>
                        <p>Recovery reflects confidence that the causing shortage parts can be recovered before the required CLIN/build date based on current supply position, blocker severity, and planned actions.</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* CLINs at Risk - ENHANCED with Top Blocking Parts */}
          <Card className="border border-gray-200">
            <CardHeader className="py-3 px-4 border-b border-gray-100">
              <CardTitle className="text-sm font-bold text-gray-800">CLINs at Risk from Shortages</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[400px] overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-2 font-semibold text-gray-700">Program</th>
                      <th className="text-left p-2 font-semibold text-gray-700">CLIN</th>
                      <th className="text-left p-2 font-semibold text-gray-700">Required Date</th>
                      <th className="text-center p-2 font-semibold text-gray-700">Shortage Parts</th>
                      <th className="text-center p-2 font-semibold text-gray-700">Critical Path</th>
                      <th className="text-left p-2 font-semibold text-gray-700">Top Blocking Parts</th>
                      <th className="text-center p-2 font-semibold text-gray-700">Highest Priority</th>
                      <th className="text-right p-2 font-semibold text-gray-700">Revenue at Risk</th>
                      <th className="text-center p-2 font-semibold text-gray-700">Recovery</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {clinImpactData.slice(0, 20).map((clin, idx) => (
                      <tr key={idx} className={`hover:bg-blue-50 ${clin.recoveryConfidence === "Low" ? "bg-red-50/30" : ""}`}>
                        <td className="p-2 font-medium text-gray-900">{clin.program}</td>
                        <td className="p-2 text-blue-600">{clin.clin}</td>
                        <td className="p-2 text-gray-600">{formatDate(clin.requiredDate)}</td>
                        <td className="p-2 text-center font-semibold text-red-600">{clin.linkedParts}</td>
                        <td className="p-2 text-center font-semibold text-purple-600">{clin.criticalParts}</td>
                        <td className="p-2">
                          <div className="flex flex-wrap gap-1">
                            {clin.topBlockingParts.map((pn, i) => (
                              <Badge 
                                key={i} 
                                variant="outline" 
                                className="text-[8px] cursor-pointer hover:bg-blue-100"
                                onClick={() => {
                                  const part = filteredParts.find(p => p.partNumber === pn)
                                  if (part) handleSelectPart(part)
                                }}
                              >
                                {pn.slice(-6)}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="p-2 text-center">
                          <PriorityBadge tier={clin.highestPriority >= 85 ? "Critical" : clin.highestPriority >= 65 ? "High" : "Medium"} score={clin.highestPriority} />
                        </td>
                        <td className="p-2 text-right font-medium text-gray-700">{formatCurrency(clin.revenueAtRisk)}</td>
                        <td className="p-2 text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge className={`text-[9px] cursor-help ${
                                clin.recoveryConfidence === "High" ? "bg-green-100 text-green-700" : 
                                clin.recoveryConfidence === "Medium" ? "bg-amber-100 text-amber-700" : 
                                "bg-red-100 text-red-700"
                              }`}>
                                {clin.recoveryConfidence}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs bg-gray-900 text-white p-2 max-w-xs">
                              Recovery reflects confidence that the causing shortage parts can be recovered before the required CLIN/build date based on current supply position, blocker severity, and planned actions.
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* TAB 5: Supply Netting & Coverage - ENHANCED with source-by-source supply */}
      {activeTab === "netting" && (
        <div className="space-y-6">
          <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
            <p className="text-sm text-cyan-800">
              <strong>Supply Netting & Coverage:</strong> Select a part below to see true shortage mechanics and usable supply breakdown by source.
            </p>
          </div>
          
          {/* Part Selection */}
          <Card className="border border-gray-200">
            <CardHeader className="py-3 px-4 border-b border-gray-100">
              <CardTitle className="text-sm font-bold text-gray-800">Select Part for Detailed Netting View</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[250px] overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-2 font-semibold text-gray-700">Part Number</th>
                      <th className="text-left p-2 font-semibold text-gray-700">Description</th>
                      <th className="text-center p-2 font-semibold text-gray-700">Status</th>
                      <th className="text-right p-2 font-semibold text-gray-700">Net Demand</th>
                      <th className="text-right p-2 font-semibold text-gray-700">Net Usable Supply</th>
                      <th className="text-right p-2 font-semibold text-gray-700">Net Short</th>
                      <th className="text-center p-2 font-semibold text-gray-700">First Short Wk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredParts.slice(0, 15).map((part) => (
                      <tr 
                        key={part.id} 
                        className={`hover:bg-blue-50 cursor-pointer ${selectedPart?.id === part.id ? "bg-blue-100" : ""}`}
                        onClick={() => setSelectedPart(part)}
                      >
                        <td className="p-2 font-mono text-blue-600">{part.partNumber}</td>
                        <td className="p-2 text-gray-700 max-w-[200px] truncate">{part.description}</td>
                        <td className="p-2 text-center"><StatusBadge status={part.status} /></td>
                        <td className="p-2 text-right font-medium">{part.netDemand}</td>
                        <td className="p-2 text-right font-medium text-green-700">{part.netUsableSupply}</td>
                        <td className={`p-2 text-right font-semibold ${part.netShortageQty > 0 ? "text-red-600" : "text-amber-600"}`}>
                          {part.netShortageQty > 0 ? part.netShortageQty : part.atRiskCoverageQty}
                        </td>
                        <td className="p-2 text-center">
                          <Badge variant="outline" className="text-[9px]">{part.shortWeek}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          
          {selectedPart && (
            <div className="grid grid-cols-2 gap-6">
              {/* Time-Phased Demand vs Supply - ENHANCED with source breakdown */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <div>
                    <CardTitle className="text-sm font-bold text-gray-800">
                      Time-Phased Demand vs Net Usable Supply: {selectedPart.partNumber}
                    </CardTitle>
                    <p className="text-[10px] text-gray-500 mt-0.5">Supply shown by source (stacked), demand as line</p>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={Array.from({ length: 10 }, (_, i) => ({
                      week: `WE ${formatWeekEnding(i)}`,
                      demand: selectedPart.weeklyDemand[i] || 0,
                      onHand: selectedPart.weeklyOnHand[i] || 0,
                      wip: selectedPart.weeklyWIP[i] || 0,
                      openPO: selectedPart.weeklyOpenPO[i] || 0,
                      inTransit: selectedPart.weeklyInTransit[i] || 0,
                      balance: selectedPart.weeklyBalance[i] || 0
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="week" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <RechartsTooltip />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="onHand" stackId="supply" fill="#22c55e" name="On Hand (Usable)" />
                      <Bar dataKey="wip" stackId="supply" fill="#3b82f6" name="WIP" />
                      <Bar dataKey="openPO" stackId="supply" fill="#8b5cf6" name="Open PO" />
                      <Bar dataKey="inTransit" stackId="supply" fill="#06b6d4" name="In Transit" />
                      <Line type="monotone" dataKey="demand" stroke="#ef4444" strokeWidth={2} name="Demand" dot={{ r: 3 }} />
                      {/* Mark first short week and recovery week */}
                      <ReferenceLine x={selectedPart.shortWeek} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "Short", fill: "#ef4444", fontSize: 9 }} />
                      <ReferenceLine x={selectedPart.recoveryWeek} stroke="#22c55e" strokeDasharray="3 3" label={{ value: "Recovery", fill: "#22c55e", fontSize: 9 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <div className="mt-2 p-2 bg-gray-50 rounded flex items-center justify-between text-[10px]">
                    <span className="text-red-600 font-semibold">First Short Week: {selectedPart.shortWeek}</span>
                    <span className="text-green-600 font-semibold">Recovery Week: {selectedPart.recoveryWeek}</span>
                  </div>
                </CardContent>
              </Card>
              
              {/* Supply Status Composition - ENHANCED with waterfall bar */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <div>
                    <CardTitle className="text-sm font-bold text-gray-800">Supply Status Composition</CardTitle>
                    <p className="text-[10px] text-gray-500 mt-0.5">Usable vs excluded supply breakdown</p>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {/* Stacked horizontal bar for supply */}
                  <div className="space-y-4">
                    {/* Usable Supply Bar */}
                    <div>
                      <p className="text-xs font-semibold text-green-700 mb-2">Usable Supply</p>
                      <div className="flex h-8 rounded overflow-hidden">
                        {[
                          { label: "On Hand", value: selectedPart.supplyBreakdown.onHand, color: "#22c55e" },
                          { label: "WIP", value: selectedPart.supplyBreakdown.wip, color: "#3b82f6" },
                          { label: "Open PO", value: selectedPart.supplyBreakdown.openPO, color: "#8b5cf6" },
                          { label: "In Transit", value: selectedPart.supplyBreakdown.inTransit, color: "#06b6d4" }
                        ].map((item, idx) => {
                          const total = selectedPart.supplyBreakdown.onHand + selectedPart.supplyBreakdown.wip + 
                                        selectedPart.supplyBreakdown.openPO + selectedPart.supplyBreakdown.inTransit
                          const width = total > 0 ? (item.value / total) * 100 : 0
                          return width > 0 ? (
                            <Tooltip key={idx}>
                              <TooltipTrigger asChild>
                                <div 
                                  className="flex items-center justify-center text-white text-[10px] font-medium"
                                  style={{ width: `${width}%`, backgroundColor: item.color }}
                                >
                                  {width > 15 && `${item.value}`}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">{item.label}: {item.value}</TooltipContent>
                            </Tooltip>
                          ) : null
                        })}
                      </div>
                      <div className="flex gap-3 mt-2 text-[10px]">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded" style={{ backgroundColor: "#22c55e" }} /> On Hand: {selectedPart.supplyBreakdown.onHand}</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded" style={{ backgroundColor: "#3b82f6" }} /> WIP: {selectedPart.supplyBreakdown.wip}</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded" style={{ backgroundColor: "#8b5cf6" }} /> Open PO: {selectedPart.supplyBreakdown.openPO}</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded" style={{ backgroundColor: "#06b6d4" }} /> In Transit: {selectedPart.supplyBreakdown.inTransit}</span>
                      </div>
                    </div>
                    
                    {/* Excluded Supply Bar */}
                    <div>
                      <p className="text-xs font-semibold text-red-700 mb-2">Excluded Supply (Not Usable)</p>
                      <div className="flex h-8 rounded overflow-hidden">
                        {[
                          { label: "RI Pending", value: selectedPart.supplyBreakdown.riPending, color: "#f59e0b" },
                          { label: "MRB Hold", value: selectedPart.supplyBreakdown.mrbHold, color: "#ef4444" },
                          { label: "Expired", value: selectedPart.supplyBreakdown.expired, color: "#64748b" }
                        ].map((item, idx) => {
                          const total = selectedPart.supplyBreakdown.riPending + selectedPart.supplyBreakdown.mrbHold + 
                                        selectedPart.supplyBreakdown.expired
                          const width = total > 0 ? (item.value / total) * 100 : 0
                          return width > 0 ? (
                            <Tooltip key={idx}>
                              <TooltipTrigger asChild>
                                <div 
                                  className="flex items-center justify-center text-white text-[10px] font-medium"
                                  style={{ width: `${width}%`, backgroundColor: item.color }}
                                >
                                  {width > 15 && `${item.value}`}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">{item.label}: {item.value}</TooltipContent>
                            </Tooltip>
                          ) : null
                        })}
                      </div>
                      <div className="flex gap-3 mt-2 text-[10px]">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded" style={{ backgroundColor: "#f59e0b" }} /> RI Pending: {selectedPart.supplyBreakdown.riPending}</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded" style={{ backgroundColor: "#ef4444" }} /> MRB: {selectedPart.supplyBreakdown.mrbHold}</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded" style={{ backgroundColor: "#64748b" }} /> Expired: {selectedPart.supplyBreakdown.expired}</span>
                      </div>
                    </div>
                    
                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-[10px] text-green-600 uppercase font-medium">Total Usable Supply</p>
                        <p className="text-xl font-bold text-green-700">
                          {selectedPart.supplyBreakdown.onHand + selectedPart.supplyBreakdown.wip + 
                           selectedPart.supplyBreakdown.openPO + selectedPart.supplyBreakdown.inTransit}
                        </p>
                      </div>
                      <div className="p-3 bg-red-50 rounded-lg">
                        <p className="text-[10px] text-red-600 uppercase font-medium">Total Excluded</p>
                        <p className="text-xl font-bold text-red-700">
                          {selectedPart.supplyBreakdown.riPending + selectedPart.supplyBreakdown.mrbHold + 
                           selectedPart.supplyBreakdown.expired}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
      
      {/* TAB 6: Root Cause & Actions */}
      {activeTab === "rootcause" && (
        <div className="space-y-6">
          {/* Lens Filters */}
          <Card className="border border-gray-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-700">Evidence Lens:</span>
                {[
                  { id: "all", label: "All", icon: Layers },
                  { id: "supplier", label: "Supplier", icon: Truck },
                  { id: "quality", label: "MRB/RI/Quality", icon: AlertTriangle },
                  { id: "shelf", label: "Shelf-Life", icon: Clock },
                  { id: "inventory", label: "Inventory", icon: Package },
                  { id: "planning", label: "Planning/Data", icon: FileText }
                ].map(lens => (
                  <button
                    key={lens.id}
                    onClick={() => {
                      if (lens.id === "supplier") setDrillDownDriver("Supplier Slip")
                      else if (lens.id === "quality") setDrillDownDriver("MRB Hold")
                      else if (lens.id === "shelf") setDrillDownDriver("Shelf-Life")
                      else if (lens.id === "planning") setDrillDownDriver("Planning Date")
                      else setDrillDownDriver(null)
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium transition-colors ${
                      lens.id === "all" && !drillDownDriver
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <lens.icon className="w-3.5 h-3.5" />
                    {lens.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-2 gap-6">
            {/* Weighted Shortage Driver Pareto */}
            <Card className="border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <div>
                  <CardTitle className="text-sm font-bold text-gray-800">Weighted Shortage Driver Pareto</CardTitle>
                  <p className="text-[10px] text-gray-500 mt-0.5">Click bars to filter shortage list by driver</p>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={rootCauseData.slice(0, 8)} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="driver" tick={{ fontSize: 10 }} width={100} />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-lg text-xs">
                              <p className="font-semibold">{data.driver}</p>
                              <p>Part Count: {data.count}</p>
                              <p>Weighted Impact: {data.weightedImpact.toFixed(0)}</p>
                              <p className="text-blue-600 text-[10px] mt-1">Click to filter</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar 
                      dataKey="weightedImpact" 
                      fill={COLORS.primary} 
                      radius={[0, 4, 4, 0]}
                      onClick={(data) => navigateToRankedWithFilter(data.driver as ShortageDriver)}
                      cursor="pointer"
                    >
                      {rootCauseData.slice(0, 8).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={DRIVER_COLORS[entry.driver as ShortageDriver] || COLORS.primary} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            {/* Blocker by Function */}
            <Card className="border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-800">Shortages by Blocking Function</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={blockingFunctionData} layout="vertical" margin={{ left: 140 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="function" tick={{ fontSize: 10 }} width={140} />
                    <RechartsTooltip />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="critical" stackId="a" fill={COLORS.critical} name="Critical" />
                    <Bar dataKey="high" stackId="a" fill={COLORS.high} name="High" />
                    <Bar dataKey="medium" stackId="a" fill={COLORS.medium} name="Medium" />
                    <Bar dataKey="low" stackId="a" fill={COLORS.low} name="Low" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          {/* Action Queue */}
          <Card className="border border-gray-200">
            <CardHeader className="py-3 px-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-gray-800">Action Queue for High-Impact Shortages</CardTitle>
                  <p className="text-[10px] text-gray-500 mt-0.5">Critical and High priority parts with assigned recovery actions</p>
                </div>
                <Badge className="bg-amber-100 text-amber-700 text-[10px]">Operational Focus</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[400px] overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-2 font-semibold text-gray-700">Part Number</th>
                      <th className="text-center p-2 font-semibold text-gray-700">CP</th>
                      <th className="text-left p-2 font-semibold text-gray-700">Driver</th>
                      <th className="text-left p-2 font-semibold text-gray-700">Evidence Ref</th>
                      <th className="text-center p-2 font-semibold text-gray-700">Jobs/CLINs</th>
                      <th className="text-left p-2 font-semibold text-gray-700">Blocking Function</th>
                      <th className="text-left p-2 font-semibold text-gray-700">Owner</th>
                      <th className="text-left p-2 font-semibold text-gray-700">Next Action</th>
                      <th className="text-center p-2 font-semibold text-gray-700">Status</th>
                      <th className="text-left p-2 font-semibold text-gray-700">Recovery ETA</th>
                      <th className="text-center p-2 font-semibold text-gray-700">Escalation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredParts.filter(p => p.priorityTier === "Critical" || p.priorityTier === "High").slice(0, 20).map((part) => {
                      const evidenceRef = part.linkedPO || part.linkedMRB || part.linkedRI || part.linkedNC || "-"
                      return (
                        <tr key={part.id} className="hover:bg-blue-50 cursor-pointer" onClick={() => handleSelectPart(part)}>
                          <td className="p-2 font-mono text-blue-600">{part.partNumber}</td>
                          <td className="p-2 text-center">
                            {part.criticalPath && <Badge className="text-[8px] bg-purple-100 text-purple-700">CP</Badge>}
                          </td>
                          <td className="p-2">
                            <Badge variant="outline" className="text-[9px]" style={{ borderColor: DRIVER_COLORS[part.primaryDriver], color: DRIVER_COLORS[part.primaryDriver] }}>
                              {part.primaryDriver}
                            </Badge>
                          </td>
                          <td className="p-2 font-mono text-blue-600 text-[10px]">{evidenceRef}</td>
                          <td className="p-2 text-center">
                            <span className="text-blue-600">{part.jobsBlocked}</span> / <span className="text-indigo-600">{part.clinsBlocked}</span>
                          </td>
                          <td className="p-2 text-gray-600 text-[10px]">{part.blockingFunction}</td>
                          <td className="p-2 text-gray-600">{part.owner}</td>
                          <td className="p-2 text-gray-600 max-w-[150px] truncate" title={part.nextAction}>{part.nextAction}</td>
                          <td className="p-2 text-center">
                            <Badge className={`text-[9px] ${
                              part.actionStatus === "Open" ? "bg-gray-100 text-gray-600" :
                              part.actionStatus === "In Progress" ? "bg-blue-100 text-blue-700" :
                              part.actionStatus === "Waiting" ? "bg-amber-100 text-amber-700" :
                              part.actionStatus === "Escalated" ? "bg-red-100 text-red-700" :
                              "bg-green-100 text-green-700"
                            }`}>
                              {part.actionStatus}
                            </Badge>
                          </td>
                          <td className="p-2 text-gray-600">{formatDate(part.recoveryETA)}</td>
                          <td className="p-2 text-center">
                            {part.priorityTier === "Critical" && (
                              <Badge className="text-[8px] bg-red-100 text-red-700">Needed</Badge>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* TAB 7: Role Workbench - ENHANCED with distinct views */}
      {activeTab === "workbench" && (
        <div className="space-y-4">
          {/* Role Selector */}
          <div className="flex items-center gap-2">
            {[
              { id: "planner", label: "Planner / Material Control", icon: ClipboardList },
              { id: "buyer", label: "Buyer / MPM", icon: Truck },
              { id: "program", label: "Program / PDM", icon: Target },
              { id: "quality", label: "Quality / MRB", icon: ShieldAlert },
              { id: "ops", label: "Ops / Value Stream", icon: Wrench }
            ].map(role => (
              <button
                key={role.id}
                onClick={() => setWorkbenchRole(role.id as typeof workbenchRole)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                  workbenchRole === role.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <role.icon className="w-4 h-4" />
                {role.label}
              </button>
            ))}
          </div>
          
          {/* Planner View - ENHANCED */}
          {workbenchRole === "planner" && (
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-4">
                <Card className="border border-gray-200 p-3">
                  <div className="text-[10px] text-gray-500 uppercase">Parts Needing Reallocation</div>
                  <div className="text-xl font-bold text-blue-600">{filteredParts.filter(p => p.nextAction.includes("Reallocate")).length}</div>
                </Card>
                <Card className="border border-gray-200 p-3">
                  <div className="text-[10px] text-gray-500 uppercase">Near-Term Required (14d)</div>
                  <div className="text-xl font-bold text-red-600">{filteredParts.filter(p => p.firstRequiredDate < new Date(Date.now() + 14 * 86400000)).length}</div>
                </Card>
                <Card className="border border-gray-200 p-3">
                  <div className="text-[10px] text-gray-500 uppercase">Planning Date Issues</div>
                  <div className="text-xl font-bold text-amber-600">{filteredParts.filter(p => p.primaryDriver === "Planning Date").length}</div>
                </Card>
                <Card className="border border-gray-200 p-3">
                  <div className="text-[10px] text-gray-500 uppercase">Jobs Blocked</div>
                  <div className="text-xl font-bold text-gray-900">{new Set(filteredParts.flatMap(p => p.linkedJobs)).size}</div>
                </Card>
                <Card className="border border-gray-200 p-3">
                  <div className="text-[10px] text-gray-500 uppercase">CLINs Impacted</div>
                  <div className="text-xl font-bold text-indigo-600">{new Set(filteredParts.flatMap(p => p.linkedClins)).size}</div>
                </Card>
              </div>
              
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <CardTitle className="text-sm font-bold text-gray-800">Planner: Shortage Parts by Blocked Jobs/CLINs</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[450px] overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr className="border-b border-gray-200">
                          <th className="text-left p-2 font-semibold text-gray-700">Part Number</th>
                          <th className="text-center p-2 font-semibold text-gray-700">Priority</th>
                          <th className="text-center p-2 font-semibold text-gray-700">Jobs/CLINs</th>
                          <th className="text-right p-2 font-semibold text-gray-700">Net Short</th>
                          <th className="text-left p-2 font-semibold text-gray-700">Required</th>
                          <th className="text-center p-2 font-semibold text-gray-700">Flags</th>
                          <th className="text-left p-2 font-semibold text-gray-700">Action</th>
                          <th className="text-left p-2 font-semibold text-gray-700">Owner</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredParts.slice(0, 25).map((part) => (
                          <tr key={part.id} className="hover:bg-blue-50 cursor-pointer" onClick={() => handleSelectPart(part)}>
                            <td className="p-2 font-mono text-blue-600">{part.partNumber}</td>
                            <td className="p-2 text-center"><PriorityBadge tier={part.priorityTier} /></td>
                            <td className="p-2 text-center">
                              <span className="text-blue-600">{part.jobsBlocked}</span> / <span className="text-indigo-600">{part.clinsBlocked}</span>
                            </td>
                            <td className={`p-2 text-right font-semibold ${part.netShortageQty > 0 ? "text-red-600" : "text-amber-600"}`}>
                              {part.netShortageQty > 0 ? part.netShortageQty : part.atRiskCoverageQty}
                            </td>
                            <td className="p-2 text-gray-600">{formatDate(part.firstRequiredDate)}</td>
                            <td className="p-2 text-center"><FlagsBadge part={part} /></td>
                            <td className="p-2 text-gray-600 max-w-[150px] truncate">{part.nextAction}</td>
                            <td className="p-2 text-gray-600">{part.owner}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Buyer View - ENHANCED */}
          {workbenchRole === "buyer" && (
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-4">
                <Card className="border border-gray-200 p-3">
                  <div className="text-[10px] text-gray-500 uppercase">Supplier Slips</div>
                  <div className="text-xl font-bold text-purple-600">{filteredParts.filter(p => p.primaryDriver === "Supplier Slip").length}</div>
                </Card>
                <Card className="border border-gray-200 p-3">
                  <div className="text-[10px] text-gray-500 uppercase">Late PR/PO</div>
                  <div className="text-xl font-bold text-pink-600">{filteredParts.filter(p => p.primaryDriver === "Late PR/PO").length}</div>
                </Card>
                <Card className="border border-gray-200 p-3">
                  <div className="text-[10px] text-gray-500 uppercase">Expedite Candidates</div>
                  <div className="text-xl font-bold text-blue-600">{filteredParts.filter(p => p.linkedPO && p.priorityTier === "Critical").length}</div>
                </Card>
                <Card className="border border-gray-200 p-3">
                  <div className="text-[10px] text-gray-500 uppercase">Alternate Source Needed</div>
                  <div className="text-xl font-bold text-amber-600">{filteredParts.filter(p => p.noSubstitute && p.status === "Short").length}</div>
                </Card>
                <Card className="border border-gray-200 p-3">
                  <div className="text-[10px] text-gray-500 uppercase">Revenue at Risk</div>
                  <div className="text-xl font-bold text-gray-900">{formatCurrency(filteredParts.filter(p => p.blockingFunction === "Buyer/MPM/Supply Chain").reduce((s, p) => s + p.revenueAtRisk, 0))}</div>
                </Card>
              </div>
              
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <CardTitle className="text-sm font-bold text-gray-800">Buyer: Prioritized Expedite & Sourcing Queue</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[450px] overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr className="border-b border-gray-200">
                          <th className="text-left p-2 font-semibold text-gray-700">Part Number</th>
                          <th className="text-center p-2 font-semibold text-gray-700">Priority</th>
                          <th className="text-left p-2 font-semibold text-gray-700">Supplier</th>
                          <th className="text-left p-2 font-semibold text-gray-700">PO Ref</th>
                          <th className="text-left p-2 font-semibold text-gray-700">Promise Date</th>
                          <th className="text-left p-2 font-semibold text-gray-700">Driver</th>
                          <th className="text-center p-2 font-semibold text-gray-700">Slip History</th>
                          <th className="text-right p-2 font-semibold text-gray-700">Short Qty</th>
                          <th className="text-left p-2 font-semibold text-gray-700">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredParts.filter(p => ["Supplier Slip", "Late PR/PO"].includes(p.primaryDriver) || p.blockingFunction === "Buyer/MPM/Supply Chain").slice(0, 25).map((part) => (
                          <tr key={part.id} className="hover:bg-blue-50 cursor-pointer" onClick={() => handleSelectPart(part)}>
                            <td className="p-2 font-mono text-blue-600">{part.partNumber}</td>
                            <td className="p-2 text-center"><PriorityBadge tier={part.priorityTier} /></td>
                            <td className="p-2 text-gray-700">{part.supplier}</td>
                            <td className="p-2 font-mono text-blue-600 text-[10px]">{part.linkedPO || "PR Pending"}</td>
                            <td className="p-2 text-gray-600">{part.poPromiseDate ? formatDate(part.poPromiseDate) : "-"}</td>
                            <td className="p-2">
                              <Badge variant="outline" className="text-[9px]" style={{ borderColor: DRIVER_COLORS[part.primaryDriver], color: DRIVER_COLORS[part.primaryDriver] }}>
                                {part.primaryDriver}
                              </Badge>
                            </td>
                            <td className="p-2 text-center">
                              {Math.floor(seededRandom(parseInt(part.id.slice(-4))) * 3) > 0 ? (
                                <Badge className="text-[8px] bg-red-100 text-red-700">{Math.floor(seededRandom(parseInt(part.id.slice(-4))) * 3)} slips</Badge>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className={`p-2 text-right font-semibold ${part.netShortageQty > 0 ? "text-red-600" : "text-amber-600"}`}>
                              {part.netShortageQty > 0 ? part.netShortageQty : part.atRiskCoverageQty}
                            </td>
                            <td className="p-2 text-gray-600 max-w-[140px] truncate">{part.nextAction}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Program View - ENHANCED */}
          {workbenchRole === "program" && (
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-4">
                <Card className="border border-gray-200 p-3">
                  <div className="text-[10px] text-gray-500 uppercase">CLINs at Risk</div>
                  <div className="text-xl font-bold text-indigo-600">{new Set(filteredParts.flatMap(p => p.linkedClins)).size}</div>
                </Card>
                <Card className="border border-gray-200 p-3">
                  <div className="text-[10px] text-gray-500 uppercase">Critical Path Parts</div>
                  <div className="text-xl font-bold text-purple-600">{filteredParts.filter(p => p.criticalPath).length}</div>
                </Card>
                <Card className="border border-gray-200 p-3">
                  <div className="text-[10px] text-gray-500 uppercase">Revenue at Risk</div>
                  <div className="text-xl font-bold text-gray-900">{formatCurrency(filteredParts.reduce((s, p) => s + p.revenueAtRisk, 0))}</div>
                </Card>
                <Card className="border border-gray-200 p-3">
                  <div className="text-[10px] text-gray-500 uppercase">AOP Impact</div>
                  <div className="text-xl font-bold text-green-600">{formatCurrency(filteredParts.reduce((s, p) => s + p.aopAtRisk, 0))}</div>
                </Card>
                <Card className="border border-gray-200 p-3">
                  <div className="text-[10px] text-gray-500 uppercase">Customer Visibility</div>
                  <div className="text-xl font-bold text-red-600">{filteredParts.filter(p => p.priorityTier === "Critical" && p.clinsBlocked > 0).length}</div>
                </Card>
              </div>
              
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <CardTitle className="text-sm font-bold text-gray-800">Program: CLIN & Milestone Exposure with Revenue Impact</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[450px] overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr className="border-b border-gray-200">
                          <th className="text-left p-2 font-semibold text-gray-700">Program</th>
                          <th className="text-left p-2 font-semibold text-gray-700">CLIN</th>
                          <th className="text-left p-2 font-semibold text-gray-700">Required Date</th>
                          <th className="text-center p-2 font-semibold text-gray-700">Shortage Parts</th>
                          <th className="text-center p-2 font-semibold text-gray-700">Critical Path</th>
                          <th className="text-right p-2 font-semibold text-gray-700">Revenue at Risk</th>
                          <th className="text-right p-2 font-semibold text-gray-700">AOP Impact</th>
                          <th className="text-center p-2 font-semibold text-gray-700">Customer Vis</th>
                          <th className="text-center p-2 font-semibold text-gray-700">Recovery</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {clinImpactData.slice(0, 20).map((clin, idx) => (
                          <tr key={idx} className={`hover:bg-blue-50 ${clin.recoveryConfidence === "Low" ? "bg-red-50/30" : ""}`}>
                            <td className="p-2 font-medium text-gray-900">{clin.program}</td>
                            <td className="p-2 text-blue-600">{clin.clin}</td>
                            <td className="p-2 text-gray-600">{formatDate(clin.requiredDate)}</td>
                            <td className="p-2 text-center font-semibold text-red-600">{clin.linkedParts}</td>
                            <td className="p-2 text-center font-semibold text-purple-600">{clin.criticalParts}</td>
                            <td className="p-2 text-right font-medium">{formatCurrency(clin.revenueAtRisk)}</td>
                            <td className="p-2 text-right font-medium text-green-700">{formatCurrency(clin.revenueAtRisk * 0.3)}</td>
                            <td className="p-2 text-center">
                              {clin.highestPriority >= 85 && <Badge className="text-[8px] bg-red-100 text-red-700">High</Badge>}
                            </td>
                            <td className="p-2 text-center">
                              <Badge className={`text-[9px] ${
                                clin.recoveryConfidence === "High" ? "bg-green-100 text-green-700" : 
                                clin.recoveryConfidence === "Medium" ? "bg-amber-100 text-amber-700" : 
                                "bg-red-100 text-red-700"
                              }`}>
                                {clin.recoveryConfidence}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Quality View - ENHANCED */}
          {workbenchRole === "quality" && (
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-4">
                <Card className="border border-gray-200 p-3">
                  <div className="text-[10px] text-gray-500 uppercase">MRB Qty Blocked</div>
                  <div className="text-xl font-bold text-orange-600">{filteredParts.reduce((s, p) => s + p.mrbQty, 0)}</div>
                </Card>
                <Card className="border border-gray-200 p-3">
                  <div className="text-[10px] text-gray-500 uppercase">RI Queue Qty</div>
                  <div className="text-xl font-bold text-amber-600">{filteredParts.reduce((s, p) => s + p.riQty, 0)}</div>
                </Card>
                <Card className="border border-gray-200 p-3">
                  <div className="text-[10px] text-gray-500 uppercase">Shelf-Life Risk</div>
                  <div className="text-xl font-bold text-lime-600">{filteredParts.filter(p => p.shelfLifeRisk).length}</div>
                </Card>
                <Card className="border border-gray-200 p-3">
                  <div className="text-[10px] text-gray-500 uppercase">Parts w/ NC Ref</div>
                  <div className="text-xl font-bold text-red-600">{filteredParts.filter(p => p.linkedNC).length}</div>
                </Card>
                <Card className="border border-gray-200 p-3">
                  <div className="text-[10px] text-gray-500 uppercase">Jobs Blocked (Quality)</div>
                  <div className="text-xl font-bold text-gray-900">{filteredParts.filter(p => p.blockingFunction === "Quality/MRB").reduce((s, p) => s + p.jobsBlocked, 0)}</div>
                </Card>
              </div>
              
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <CardTitle className="text-sm font-bold text-gray-800">Quality: MRB/RI Disposition Queue with NC References</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[450px] overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr className="border-b border-gray-200">
                          <th className="text-left p-2 font-semibold text-gray-700">Part Number</th>
                          <th className="text-center p-2 font-semibold text-gray-700">Priority</th>
                          <th className="text-left p-2 font-semibold text-gray-700">Hold Type</th>
                          <th className="text-left p-2 font-semibold text-gray-700">MRB Ref</th>
                          <th className="text-left p-2 font-semibold text-gray-700">RI Ref</th>
                          <th className="text-left p-2 font-semibold text-gray-700">NC Ref</th>
                          <th className="text-right p-2 font-semibold text-gray-700">MRB Qty</th>
                          <th className="text-right p-2 font-semibold text-gray-700">RI Qty</th>
                          <th className="text-center p-2 font-semibold text-gray-700">Shelf-Life</th>
                          <th className="text-center p-2 font-semibold text-gray-700">Jobs Blocked</th>
                          <th className="text-left p-2 font-semibold text-gray-700">Owner</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredParts.filter(p => ["MRB Hold", "RI Queue", "Shelf-Life"].includes(p.primaryDriver) || p.blockingFunction === "Quality/MRB" || p.mrbQty > 0 || p.riQty > 0).slice(0, 25).map((part) => (
                          <tr key={part.id} className="hover:bg-blue-50 cursor-pointer" onClick={() => handleSelectPart(part)}>
                            <td className="p-2 font-mono text-blue-600">{part.partNumber}</td>
                            <td className="p-2 text-center"><PriorityBadge tier={part.priorityTier} /></td>
                            <td className="p-2">
                              <Badge variant="outline" className="text-[9px]" style={{ borderColor: DRIVER_COLORS[part.primaryDriver], color: DRIVER_COLORS[part.primaryDriver] }}>
                                {part.primaryDriver}
                              </Badge>
                            </td>
                            <td className="p-2 font-mono text-blue-600 text-[10px]">{part.linkedMRB || "-"}</td>
                            <td className="p-2 font-mono text-blue-600 text-[10px]">{part.linkedRI || "-"}</td>
                            <td className="p-2 font-mono text-blue-600 text-[10px]">{part.linkedNC || "-"}</td>
                            <td className="p-2 text-right font-semibold text-orange-600">{part.mrbQty || "-"}</td>
                            <td className="p-2 text-right font-semibold text-amber-600">{part.riQty || "-"}</td>
                            <td className="p-2 text-center">
                              {part.shelfLifeRisk && <Badge className="text-[8px] bg-lime-100 text-lime-700">Risk</Badge>}
                            </td>
                            <td className="p-2 text-center font-semibold">{part.jobsBlocked}</td>
                            <td className="p-2 text-gray-600">{part.owner}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Ops View - ENHANCED */}
          {workbenchRole === "ops" && (
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-4">
                <Card className="border border-gray-200 p-3">
                  <div className="text-[10px] text-gray-500 uppercase">RTW Blockers (Material)</div>
                  <div className="text-xl font-bold text-red-600">{filteredParts.filter(p => p.rtwBlocked).length}</div>
                </Card>
                <Card className="border border-gray-200 p-3">
                  <div className="text-[10px] text-gray-500 uppercase">RTW Blocked Jobs</div>
                  <div className="text-xl font-bold text-cyan-600">{filteredParts.reduce((s, p) => s + p.rtwBlockedJobs, 0)}</div>
                </Card>
                <Card className="border border-gray-200 p-3">
                  <div className="text-[10px] text-gray-500 uppercase">Capacity/Test Driven</div>
                  <div className="text-xl font-bold text-indigo-600">{filteredParts.filter(p => p.primaryDriver === "Capacity/Test").length}</div>
                </Card>
                <Card className="border border-gray-200 p-3">
                  <div className="text-[10px] text-gray-500 uppercase">Routing Issues</div>
                  <div className="text-xl font-bold text-blue-600">{filteredParts.filter(p => p.primaryDriver === "Routing/Process").length}</div>
                </Card>
                <Card className="border border-gray-200 p-3">
                  <div className="text-[10px] text-gray-500 uppercase">Stalled Flow Parts</div>
                  <div className="text-xl font-bold text-gray-900">{filteredParts.filter(p => p.wipDependentQty > 0).length}</div>
                </Card>
              </div>
              
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <CardTitle className="text-sm font-bold text-gray-800">Ops: RTW Blockers & Value Stream Impact</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[450px] overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr className="border-b border-gray-200">
                          <th className="text-left p-2 font-semibold text-gray-700">Part Number</th>
                          <th className="text-center p-2 font-semibold text-gray-700">Priority</th>
                          <th className="text-center p-2 font-semibold text-gray-700">CP</th>
                          <th className="text-center p-2 font-semibold text-gray-700">RTW Blocked</th>
                          <th className="text-center p-2 font-semibold text-gray-700">RTW Jobs</th>
                          <th className="text-center p-2 font-semibold text-gray-700">Late Jobs</th>
                          <th className="text-right p-2 font-semibold text-gray-700">Short Qty</th>
                          <th className="text-left p-2 font-semibold text-gray-700">Required</th>
                          <th className="text-left p-2 font-semibold text-gray-700">Driver</th>
                          <th className="text-left p-2 font-semibold text-gray-700">Unblock Action</th>
                          <th className="text-left p-2 font-semibold text-gray-700">Recovery</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredParts.filter(p => p.rtwBlocked || p.primaryDriver === "Capacity/Test" || p.primaryDriver === "Routing/Process").slice(0, 25).map((part) => (
                          <tr key={part.id} className="hover:bg-blue-50 cursor-pointer" onClick={() => handleSelectPart(part)}>
                            <td className="p-2 font-mono text-blue-600">{part.partNumber}</td>
                            <td className="p-2 text-center"><PriorityBadge tier={part.priorityTier} /></td>
                            <td className="p-2 text-center">
                              {part.criticalPath && <Badge className="text-[8px] bg-purple-100 text-purple-700">CP</Badge>}
                            </td>
                            <td className="p-2 text-center">
                              {part.rtwBlocked ? (
                                <Badge className="text-[8px] bg-red-100 text-red-700">Yes</Badge>
                              ) : (
                                <span className="text-gray-400">No</span>
                              )}
                            </td>
                            <td className="p-2 text-center font-semibold text-cyan-600">{part.rtwBlockedJobs || "-"}</td>
                            <td className="p-2 text-center font-semibold text-pink-600">{part.linkedLateJobs || "-"}</td>
                            <td className={`p-2 text-right font-semibold ${part.netShortageQty > 0 ? "text-red-600" : "text-amber-600"}`}>
                              {part.netShortageQty > 0 ? part.netShortageQty : part.atRiskCoverageQty}
                            </td>
                            <td className="p-2 text-gray-600">{formatDate(part.firstRequiredDate)}</td>
                            <td className="p-2">
                              <Badge variant="outline" className="text-[9px]" style={{ borderColor: DRIVER_COLORS[part.primaryDriver], color: DRIVER_COLORS[part.primaryDriver] }}>
                                {part.primaryDriver}
                              </Badge>
                            </td>
                            <td className="p-2 text-gray-600 max-w-[120px] truncate">{part.nextAction}</td>
                            <td className="p-2 text-gray-600">{part.recoveryWeek}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
      
      {/* TAB 8: Trends & Governance - ENHANCED with real week labels and lesson learned */}
      {activeTab === "trends" && (
        <div className="space-y-6">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-sm text-emerald-800">
              <strong>Trends & Governance:</strong> Track shortage management over time and verify whether shortages were visible before incidents occurred.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            {/* Shortage Trend - with real week labels */}
            <Card className="border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <div>
                  <CardTitle className="text-sm font-bold text-gray-800">Shortage Trend Over Time</CardTitle>
                  <p className="text-[10px] text-gray-500 mt-0.5">Weekly shortage and blocked-demand trend for selected scope.</p>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <RechartsTooltip />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Line type="monotone" dataKey="shortParts" stroke="#ef4444" strokeWidth={2} name="Short Parts" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="atRiskParts" stroke="#f59e0b" strokeWidth={2} name="At-Risk Parts" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="criticalPathParts" stroke="#8b5cf6" strokeWidth={2} name="Critical Path" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="jobsBlocked" stroke="#3b82f6" strokeWidth={2} name="Jobs Blocked" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            {/* Root Cause Mix Over Time - with subtitle */}
            <Card className="border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <div>
                  <CardTitle className="text-sm font-bold text-gray-800">Root Cause Mix Over Time</CardTitle>
                  <p className="text-[10px] text-gray-500 mt-0.5">Weekly weighted shortage exposure by primary driver.</p>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={Array.from({ length: 12 }, (_, i) => {
                    const weekDate = new Date(Date.now() - (11 - i) * 7 * 86400000)
                    const dayOfWeek = weekDate.getDay()
                    weekDate.setDate(weekDate.getDate() + (7 - dayOfWeek) % 7)
                    return {
                      week: `${weekDate.getMonth() + 1}/${weekDate.getDate()}`,
                      supplier: Math.floor(seededRandom(i + 500) * 20) + 10,
                      quality: Math.floor(seededRandom(i + 600) * 15) + 5,
                      shelfLife: Math.floor(seededRandom(i + 700) * 8) + 2,
                      planning: Math.floor(seededRandom(i + 800) * 10) + 3,
                      capacity: Math.floor(seededRandom(i + 900) * 6) + 2
                    }
                  })}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <RechartsTooltip />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Area type="monotone" dataKey="supplier" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" name="Supplier" />
                    <Area type="monotone" dataKey="quality" stackId="1" stroke="#f97316" fill="#f97316" name="Quality/MRB" />
                    <Area type="monotone" dataKey="shelfLife" stackId="1" stroke="#84cc16" fill="#84cc16" name="Shelf-Life" />
                    <Area type="monotone" dataKey="planning" stackId="1" stroke="#06b6d4" fill="#06b6d4" name="Planning" />
                    <Area type="monotone" dataKey="capacity" stackId="1" stroke="#6366f1" fill="#6366f1" name="Capacity" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          {/* Surprise Material-Driven Late Jobs - ENHANCED with Lesson Learned */}
          <Card className="border border-gray-200">
            <CardHeader className="py-3 px-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-gray-800">Governance: Surprise Material-Driven Late Jobs</CardTitle>
                  <p className="text-[10px] text-gray-500 mt-0.5">Jobs that became late due to shortages - were the parts visible on the dashboard beforehand?</p>
                </div>
                <Badge className="bg-pink-100 text-pink-700 text-[10px]">{kpis.surpriseLateJobs} surprises this period</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[350px] overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-2 font-semibold text-gray-700">Part Number</th>
                      <th className="text-center p-2 font-semibold text-gray-700">On Dashboard?</th>
                      <th className="text-center p-2 font-semibold text-gray-700">Critical Path?</th>
                      <th className="text-center p-2 font-semibold text-gray-700">Days Visible</th>
                      <th className="text-center p-2 font-semibold text-gray-700">Jobs Blocked</th>
                      <th className="text-center p-2 font-semibold text-gray-700">CLINs Blocked</th>
                      <th className="text-left p-2 font-semibold text-gray-700">Action Taken</th>
                      <th className="text-center p-2 font-semibold text-gray-700">Outcome</th>
                      <th className="text-center p-2 font-semibold text-gray-700">RC Confirmed</th>
                      <th className="text-left p-2 font-semibold text-gray-700">Lesson Learned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredParts.slice(0, 20).map((part) => (
                      <tr key={part.id} className={`hover:bg-blue-50 ${!part.wasVisibleBeforeIncident ? "bg-pink-50/30" : ""}`}>
                        <td className="p-2 font-mono text-blue-600">{part.partNumber}</td>
                        <td className="p-2 text-center">
                          {part.wasVisibleBeforeIncident ? (
                            <Badge className="text-[8px] bg-green-100 text-green-700">Yes</Badge>
                          ) : (
                            <Badge className="text-[8px] bg-red-100 text-red-700">No</Badge>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          {part.criticalPath ? (
                            <Badge className="text-[8px] bg-purple-100 text-purple-700">Yes</Badge>
                          ) : (
                            <span className="text-gray-400">No</span>
                          )}
                        </td>
                        <td className="p-2 text-center font-medium">{part.daysOnDashboard}d</td>
                        <td className="p-2 text-center font-semibold text-blue-600">{part.jobsBlocked}</td>
                        <td className="p-2 text-center font-semibold text-indigo-600">{part.clinsBlocked}</td>
                        <td className="p-2 text-gray-600 max-w-[120px] truncate">{part.nextAction}</td>
                        <td className="p-2 text-center">
                          <Badge className={`text-[9px] ${
                            part.actionStatus === "Resolved" ? "bg-green-100 text-green-700" :
                            part.actionStatus === "In Progress" ? "bg-blue-100 text-blue-700" :
                            "bg-amber-100 text-amber-700"
                          }`}>
                            {part.actionStatus}
                          </Badge>
                        </td>
                        <td className="p-2 text-center">
                          {part.rootCauseConfirmed ? (
                            <Badge className="text-[8px] bg-green-100 text-green-700">Yes</Badge>
                          ) : (
                            <Badge className="text-[8px] bg-gray-100 text-gray-600">Pending</Badge>
                          )}
                        </td>
                        <td className="p-2 text-gray-600 text-[10px] max-w-[120px] truncate">
                          {part.lessonLearned || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          
          {/* Governance Summary Cards */}
          <div className="grid grid-cols-5 gap-4">
            <Card className="border border-gray-200 p-3 text-center">
              <div className="text-[10px] text-gray-500 uppercase">New Critical Parts</div>
              <div className="text-xl font-bold text-purple-600">{Math.floor(seededRandom(1000) * 8) + 2}</div>
              <div className="text-[10px] text-gray-400">this week</div>
            </Card>
            <Card className="border border-gray-200 p-3 text-center">
              <div className="text-[10px] text-gray-500 uppercase">Shortages Recovered</div>
              <div className="text-xl font-bold text-green-600">{Math.floor(seededRandom(1001) * 12) + 5}</div>
              <div className="text-[10px] text-gray-400">this week</div>
            </Card>
            <Card className="border border-gray-200 p-3 text-center">
              <div className="text-[10px] text-gray-500 uppercase">Parts Escalated</div>
              <div className="text-xl font-bold text-red-600">{Math.floor(seededRandom(1002) * 5) + 1}</div>
              <div className="text-[10px] text-gray-400">this week</div>
            </Card>
            <Card className="border border-gray-200 p-3 text-center">
              <div className="text-[10px] text-gray-500 uppercase">Material-Driven Misses</div>
              <div className="text-xl font-bold text-pink-600">{Math.floor(seededRandom(1003) * 4) + 1}</div>
              <div className="text-[10px] text-gray-400">this week</div>
            </Card>
            <Card className="border border-gray-200 p-3 text-center">
              <div className="text-[10px] text-gray-500 uppercase">Top Recurring Blocker</div>
              <div className="text-sm font-bold text-gray-900">Supplier Slip</div>
              <div className="text-[10px] text-gray-400">3 weeks running</div>
            </Card>
          </div>
        </div>
      )}
      
      {/* Part Detail Drawer - ENHANCED with Execution Impact section */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
          {selectedPart && (
            <>
              <SheetHeader className="pb-4 border-b border-gray-200">
                <SheetTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  {selectedPart.partNumber}
                  <PriorityBadge tier={selectedPart.priorityTier} score={selectedPart.priorityScore} />
                  <StatusBadge status={selectedPart.status} />
                </SheetTitle>
                <p className="text-sm text-gray-500">{selectedPart.description}</p>
                <div className="flex gap-2 mt-2">
                  {selectedPart.criticalPath && (
                    <Badge className="bg-purple-100 text-purple-700">Critical Path Part</Badge>
                  )}
                  {selectedPart.noSubstitute && (
                    <Badge className="bg-pink-100 text-pink-700">No Substitute</Badge>
                  )}
                  {selectedPart.longLead && (
                    <Badge className="bg-orange-100 text-orange-700">Long Lead</Badge>
                  )}
                </div>
              </SheetHeader>
              
              <div className="mt-4 space-y-4">
                {/* Overview */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs font-bold text-gray-600 mb-3">OVERVIEW</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Commodity</p>
                      <p className="font-medium">{selectedPart.commodity}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Supplier</p>
                      <p className="font-medium">{selectedPart.supplier}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Lead Time</p>
                      <p className="font-medium">{selectedPart.leadTimeDays} days</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Days to First Blocked Demand</p>
                      <p className="font-medium">{selectedPart.daysToFirstBlockedDemand} days</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Owner</p>
                      <p className="font-medium">{selectedPart.owner}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Days on Dashboard</p>
                      <p className="font-medium">{selectedPart.daysOnDashboard} days</p>
                    </div>
                  </div>
                </div>
                
                {/* Execution Impact - NEW SECTION */}
                <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                  <p className="text-xs font-bold text-cyan-700 mb-3">EXECUTION IMPACT</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">RTW Blocked?</p>
                      <p className="font-medium">
                        {selectedPart.rtwBlocked ? (
                          <Badge className="bg-red-100 text-red-700">Yes - {selectedPart.rtwBlockedJobs} jobs</Badge>
                        ) : (
                          <span className="text-green-600">No</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Linked Late Jobs</p>
                      <p className="font-semibold text-pink-600">{selectedPart.linkedLateJobs}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Material-Driven Late Jobs</p>
                      <p className="font-semibold text-red-600">{selectedPart.materialDrivenLateJobs}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Earliest Blocked Job</p>
                      <p className="font-mono text-blue-600">{selectedPart.linkedJobs[0] || "-"}</p>
                    </div>
                  </div>
                  {selectedPart.linkedJobs.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-cyan-200">
                      <p className="text-xs text-cyan-700 font-medium mb-1">Blocked Jobs:</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedPart.linkedJobs.slice(0, 5).map((job, i) => (
                          <Badge key={i} variant="outline" className="text-[9px]">{job}</Badge>
                        ))}
                        {selectedPart.linkedJobs.length > 5 && (
                          <Badge variant="outline" className="text-[9px]">+{selectedPart.linkedJobs.length - 5} more</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Priority Decomposition */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-bold text-blue-700 mb-3">PRIORITY SCORE DECOMPOSITION</p>
                  <PriorityDecomposition factors={selectedPart.priorityFactors} />
                </div>
                
                {/* Netting & Coverage */}
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs font-bold text-green-700 mb-3">NETTING & COVERAGE</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Net Demand</p>
                      <p className="font-semibold">{selectedPart.netDemand}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Net Usable Supply</p>
                      <p className="font-semibold text-green-700">{selectedPart.netUsableSupply}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Net Shortage Qty</p>
                      <p className={`font-semibold ${selectedPart.netShortageQty > 0 ? "text-red-600" : "text-amber-600"}`}>
                        {selectedPart.netShortageQty > 0 ? selectedPart.netShortageQty : `At-Risk: ${selectedPart.atRiskCoverageQty}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">First Short Week</p>
                      <p className="font-semibold">{selectedPart.shortWeek}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <p className="text-xs text-green-700 font-medium mb-2">Excluded Supply (Flags):</p>
                    <div className="flex flex-wrap gap-2 text-[10px]">
                      {selectedPart.mrbQty > 0 && <Badge className="bg-orange-100 text-orange-700">MRB: {selectedPart.mrbQty}</Badge>}
                      {selectedPart.riQty > 0 && <Badge className="bg-amber-100 text-amber-700">RI: {selectedPart.riQty}</Badge>}
                      {selectedPart.expiredQty > 0 && <Badge className="bg-gray-100 text-gray-700">Expired: {selectedPart.expiredQty}</Badge>}
                      {selectedPart.holdQty > 0 && <Badge className="bg-red-100 text-red-700">Hold: {selectedPart.holdQty}</Badge>}
                      {selectedPart.shelfLifeRisk && <Badge className="bg-lime-100 text-lime-700">Shelf-Life Risk</Badge>}
                    </div>
                  </div>
                </div>
                
                {/* Downstream Demands */}
                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                  <p className="text-xs font-bold text-indigo-700 mb-3">DOWNSTREAM DEMANDS</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Programs Impacted</p>
                      <p className="font-semibold text-purple-600">{selectedPart.programsImpacted}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Jobs Blocked</p>
                      <p className="font-semibold text-blue-600">{selectedPart.jobsBlocked}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Builds Blocked</p>
                      <p className="font-semibold">{selectedPart.buildsBlocked}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">CLINs Blocked</p>
                      <p className="font-semibold text-indigo-600">{selectedPart.clinsBlocked}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-indigo-200">
                    <p className="text-xs text-indigo-700 font-medium mb-1">Linked Programs:</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedPart.linkedPrograms.map((pgm, i) => (
                        <Badge key={i} variant="outline" className="text-[9px]">{pgm}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Supply / Supplier */}
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-xs font-bold text-purple-700 mb-3">SUPPLY / SUPPLIER</p>
                  <div className="space-y-2 text-sm">
                    {selectedPart.linkedPO && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Open PO:</span>
                        <span className="font-mono text-blue-600">{selectedPart.linkedPO}</span>
                      </div>
                    )}
                    {selectedPart.poPromiseDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Promise Date:</span>
                        <span className="font-medium">{formatDate(selectedPart.poPromiseDate)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">In Transit:</span>
                      <span className="font-medium">{selectedPart.supplyBreakdown.inTransit} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Recovery Week:</span>
                      <span className="font-medium">{selectedPart.recoveryWeek}</span>
                    </div>
                  </div>
                </div>
                
                {/* Quality / Status */}
                {(selectedPart.linkedMRB || selectedPart.linkedRI || selectedPart.linkedNC) && (
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-xs font-bold text-orange-700 mb-3">QUALITY / STATUS</p>
                    <div className="space-y-2 text-sm">
                      {selectedPart.linkedMRB && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">MRB Reference:</span>
                          <span className="font-mono text-blue-600">{selectedPart.linkedMRB}</span>
                        </div>
                      )}
                      {selectedPart.linkedRI && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">RI Reference:</span>
                          <span className="font-mono text-blue-600">{selectedPart.linkedRI}</span>
                        </div>
                      )}
                      {selectedPart.linkedNC && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">NC Reference:</span>
                          <span className="font-mono text-blue-600">{selectedPart.linkedNC}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">MRB Qty:</span>
                        <span className="font-medium text-orange-600">{selectedPart.mrbQty}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">RI Qty:</span>
                        <span className="font-medium text-amber-600">{selectedPart.riQty}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Actions & Recovery */}
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-xs font-bold text-emerald-700 mb-3">ACTIONS & RECOVERY</p>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Primary Driver</p>
                      <Badge variant="outline" style={{ borderColor: DRIVER_COLORS[selectedPart.primaryDriver], color: DRIVER_COLORS[selectedPart.primaryDriver] }}>
                        {selectedPart.primaryDriver}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Blocking Function</p>
                      <p className="font-medium">{selectedPart.blockingFunction}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Next Action</p>
                      <p className="font-medium text-gray-900">{selectedPart.nextAction}</p>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Action Status:</span>
                      <Badge className={`text-[9px] ${
                        selectedPart.actionStatus === "Open" ? "bg-gray-100 text-gray-600" :
                        selectedPart.actionStatus === "In Progress" ? "bg-blue-100 text-blue-700" :
                        selectedPart.actionStatus === "Waiting" ? "bg-amber-100 text-amber-700" :
                        selectedPart.actionStatus === "Escalated" ? "bg-red-100 text-red-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {selectedPart.actionStatus}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Recovery ETA:</span>
                      <span className="font-semibold">{formatDate(selectedPart.recoveryETA)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Updated:</span>
                      <span>{selectedPart.lastUpdated.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
