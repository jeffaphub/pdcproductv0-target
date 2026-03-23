"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  RefreshCw, Download, Share2, Search, Filter, ChevronRight, AlertTriangle, Clock, TrendingUp, TrendingDown,
  CheckCircle2, XCircle, Package, Building2, FileText, Users, Calendar, ArrowRight, Info, Target, Zap,
  ShieldAlert, BarChart3, History, Layers, ChevronDown, ExternalLink, AlertCircle
} from "lucide-react"
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, BarChart, Bar, LineChart, Line, Legend, Cell, ComposedChart, Area,
  ReferenceLine, ReferenceArea
} from "recharts"

// ============================================
// TYPES
// ============================================

type SlipRiskTier = "Critical" | "High" | "Medium" | "Low"

type Supplier = {
  id: string
  name: string
  code: string
  commodity: string
  site: string
  avgReCommitCount: number
  avgSlipDays: number
  p90SlipDays: number
  onTimePercent: number
  lateReceiptPercent: number
  openLines: number
  atRiskLines: number
  linkedShortages: number
  linkedLateJobs: number
  programsAffected: number
  clinsAffected: number
  spend: number
  slipRiskTier: SlipRiskTier
  reliabilityScore: number
  slipDistribution: number[]
  weeklySlipTrend: number[]
  weeklyReCommitTrend: number[]
  topParts: string[]
  topPrograms: string[]
}

type POLine = {
  id: string
  poNumber: string
  lineNumber: number
  supplier: string
  supplierCode: string
  partNumber: string
  partDescription: string
  commodity: string
  site: string
  originalPromise: Date
  currentPromise: Date
  requiredByDate: Date
  actualReceipt: Date | null
  reCommitCount: number
  totalSlipDays: number
  status: "Open" | "Received" | "Late" | "At-Risk"
  slipRiskTier: SlipRiskTier
  linkedJobs: number
  linkedClins: string[]
  linkedShortage: boolean
  linkedLateJob: boolean
  owner: string
  recommendedAction: string
  commitmentHistory: CommitmentEvent[]
  quantity: number
  unitPrice: number
}

type CommitmentEvent = {
  eventNumber: number
  eventDate: Date
  priorPromise: Date
  revisedPromise: Date
  slipDelta: number
  reasonCode: string
}

type CommodityMetrics = {
  commodity: string
  avgSlipDays: number
  avgReCommitCount: number
  onTimePercent: number
  supplierCount: number
  atRiskLines: number
  linkedShortages: number
}

type ProgramExposure = {
  program: string
  clin: string
  requiredDate: Date
  suppliersAtRisk: number
  avgSlipRisk: number
  riskyPOLines: number
  revenueAtRisk: number
  recoveryConfidence: number
  topRiskySuppliers: string[]
}

// ============================================
// MOCK DATA GENERATION
// ============================================

const SUPPLIER_NAMES = [
  "Honeywell Aerospace", "Collins Aerospace", "L3Harris Technologies", "Northrop Grumman",
  "BAE Systems", "Raytheon Technologies", "General Dynamics", "Lockheed Martin Supply",
  "Spirit AeroSystems", "TransDigm Group", "Curtiss-Wright", "Moog Inc",
  "Ducommun Inc", "Triumph Group", "Astronics Corp", "Heico Corp"
]

const COMMODITIES = ["Avionics", "Composites", "Fasteners", "Forgings", "Castings", "Electronics", "Hydraulics", "Actuators"]
const SITES = ["Phoenix", "Tucson", "Dallas", "Seattle"]
const PROGRAMS = ["F-35 JSF", "AH-64E Apache", "CH-47F Chinook", "V-22 Osprey", "KC-46A Tanker", "P-8A Poseidon"]
const REASON_CODES = ["Capacity Constraint", "Material Shortage", "Quality Issue", "Engineering Change", "Supplier Sub-Tier Delay", "Force Majeure", "Customer Request"]

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function generateSuppliers(): Supplier[] {
  return SUPPLIER_NAMES.map((name, idx) => {
    const seed = idx * 1000
    const avgReCommitCount = Math.floor(seededRandom(seed + 1) * 4) + 1
    const avgSlipDays = Math.floor(seededRandom(seed + 2) * 25) + 3
    const p90SlipDays = avgSlipDays + Math.floor(seededRandom(seed + 3) * 15)
    const onTimePercent = Math.floor(60 + seededRandom(seed + 4) * 35)
    const openLines = Math.floor(seededRandom(seed + 5) * 30) + 5
    const atRiskLines = Math.floor(openLines * (0.1 + seededRandom(seed + 6) * 0.4))
    
    const slipRiskTier: SlipRiskTier = avgSlipDays > 18 && avgReCommitCount > 2.5 ? "Critical" :
      avgSlipDays > 12 || avgReCommitCount > 2 ? "High" :
      avgSlipDays > 7 || avgReCommitCount > 1.5 ? "Medium" : "Low"
    
    return {
      id: `SUP-${idx + 1}`,
      name,
      code: name.split(" ")[0].toUpperCase().slice(0, 4) + "-" + String(idx + 100),
      commodity: COMMODITIES[idx % COMMODITIES.length],
      site: SITES[idx % SITES.length],
      avgReCommitCount,
      avgSlipDays,
      p90SlipDays,
      onTimePercent,
      lateReceiptPercent: 100 - onTimePercent,
      openLines,
      atRiskLines,
      linkedShortages: Math.floor(seededRandom(seed + 7) * 8),
      linkedLateJobs: Math.floor(seededRandom(seed + 8) * 6),
      programsAffected: Math.floor(seededRandom(seed + 9) * 4) + 1,
      clinsAffected: Math.floor(seededRandom(seed + 10) * 5) + 1,
      spend: Math.floor(seededRandom(seed + 11) * 5000000) + 500000,
      slipRiskTier,
      reliabilityScore: Math.floor(100 - avgSlipDays * 1.5 - avgReCommitCount * 10 + onTimePercent * 0.3),
      slipDistribution: Array.from({ length: 20 }, (_, i) => Math.floor(seededRandom(seed + 100 + i) * 15)),
      weeklySlipTrend: Array.from({ length: 12 }, (_, i) => Math.floor(avgSlipDays + (seededRandom(seed + 200 + i) - 0.5) * 10)),
      weeklyReCommitTrend: Array.from({ length: 12 }, (_, i) => Math.max(0.5, avgReCommitCount + (seededRandom(seed + 300 + i) - 0.5) * 1.5)),
      topParts: [`PN-${1000 + idx * 10}`, `PN-${1001 + idx * 10}`, `PN-${1002 + idx * 10}`],
      topPrograms: PROGRAMS.slice(0, Math.floor(seededRandom(seed + 12) * 3) + 1)
    }
  })
}

function generatePOLines(suppliers: Supplier[]): POLine[] {
  const lines: POLine[] = []
  let lineId = 1
  
  suppliers.forEach((supplier, sIdx) => {
    const numLines = supplier.openLines + Math.floor(seededRandom(sIdx * 500) * 10)
    
    for (let i = 0; i < numLines; i++) {
      const seed = sIdx * 1000 + i * 100
      const reCommitCount = Math.floor(seededRandom(seed + 1) * 5)
      const totalSlipDays = reCommitCount * Math.floor(seededRandom(seed + 2) * 10 + 3)
      const isReceived = seededRandom(seed + 3) > 0.6
      const isLate = !isReceived && seededRandom(seed + 4) > 0.7
      
      const originalDate = new Date(2025, Math.floor(seededRandom(seed + 5) * 6), Math.floor(seededRandom(seed + 6) * 28) + 1)
      const currentDate = new Date(originalDate)
      currentDate.setDate(currentDate.getDate() + totalSlipDays)
      const requiredDate = new Date(currentDate)
      requiredDate.setDate(requiredDate.getDate() - Math.floor(seededRandom(seed + 7) * 14))
      
      const commitmentHistory: CommitmentEvent[] = []
      let runningDate = new Date(originalDate)
      for (let e = 0; e < reCommitCount; e++) {
        const slipDelta = Math.floor(seededRandom(seed + 50 + e) * 12) + 2
        const priorDate = new Date(runningDate)
        runningDate.setDate(runningDate.getDate() + slipDelta)
        commitmentHistory.push({
          eventNumber: e + 1,
          eventDate: new Date(priorDate.getTime() - 7 * 24 * 60 * 60 * 1000),
          priorPromise: priorDate,
          revisedPromise: new Date(runningDate),
          slipDelta,
          reasonCode: REASON_CODES[Math.floor(seededRandom(seed + 60 + e) * REASON_CODES.length)]
        })
      }
      
      const slipRiskTier: SlipRiskTier = totalSlipDays > 20 && reCommitCount > 3 ? "Critical" :
        totalSlipDays > 14 || reCommitCount > 2 ? "High" :
        totalSlipDays > 7 || reCommitCount > 1 ? "Medium" : "Low"
      
      lines.push({
        id: `POL-${lineId++}`,
        poNumber: `PO-${2025}${String(sIdx + 1).padStart(3, "0")}${String(i + 1).padStart(4, "0")}`,
        lineNumber: i + 1,
        supplier: supplier.name,
        supplierCode: supplier.code,
        partNumber: `PN-${10000 + sIdx * 100 + i}`,
        partDescription: `Component Assembly ${String.fromCharCode(65 + (i % 26))}`,
        commodity: supplier.commodity,
        site: supplier.site,
        originalPromise: originalDate,
        currentPromise: currentDate,
        requiredByDate: requiredDate,
        actualReceipt: isReceived ? new Date(currentDate.getTime() + (seededRandom(seed + 8) - 0.3) * 7 * 24 * 60 * 60 * 1000) : null,
        reCommitCount,
        totalSlipDays,
        status: isReceived ? "Received" : isLate ? "Late" : totalSlipDays > 10 ? "At-Risk" : "Open",
        slipRiskTier,
        linkedJobs: Math.floor(seededRandom(seed + 9) * 5),
        linkedClins: [`CLIN-${1000 + Math.floor(seededRandom(seed + 10) * 20)}`],
        linkedShortage: seededRandom(seed + 11) > 0.7,
        linkedLateJob: seededRandom(seed + 12) > 0.75,
        owner: ["J. Smith", "M. Johnson", "R. Williams", "K. Brown", "L. Davis"][Math.floor(seededRandom(seed + 13) * 5)],
        recommendedAction: ["Expedite", "Escalate to Supplier", "Dual-Source", "Buffer Demand", "Monitor", "Renegotiate"][Math.floor(seededRandom(seed + 14) * 6)],
        commitmentHistory,
        quantity: Math.floor(seededRandom(seed + 15) * 100) + 10,
        unitPrice: Math.floor(seededRandom(seed + 16) * 5000) + 100
      })
    }
  })
  
  return lines
}

function generateCommodityMetrics(): CommodityMetrics[] {
  return COMMODITIES.map((commodity, idx) => {
    const seed = idx * 2000
    return {
      commodity,
      avgSlipDays: Math.floor(seededRandom(seed + 1) * 18) + 5,
      avgReCommitCount: Math.floor(seededRandom(seed + 2) * 3 * 10) / 10 + 1,
      onTimePercent: Math.floor(65 + seededRandom(seed + 3) * 30),
      supplierCount: Math.floor(seededRandom(seed + 4) * 5) + 2,
      atRiskLines: Math.floor(seededRandom(seed + 5) * 15) + 3,
      linkedShortages: Math.floor(seededRandom(seed + 6) * 6)
    }
  })
}

function generateProgramExposure(): ProgramExposure[] {
  const exposures: ProgramExposure[] = []
  PROGRAMS.forEach((program, pIdx) => {
    for (let c = 0; c < 3; c++) {
      const seed = pIdx * 3000 + c * 100
      exposures.push({
        program,
        clin: `CLIN-${1000 + pIdx * 10 + c}`,
        requiredDate: new Date(2025, 3 + Math.floor(seededRandom(seed + 1) * 6), Math.floor(seededRandom(seed + 2) * 28) + 1),
        suppliersAtRisk: Math.floor(seededRandom(seed + 3) * 4) + 1,
        avgSlipRisk: Math.floor(seededRandom(seed + 4) * 30) + 5,
        riskyPOLines: Math.floor(seededRandom(seed + 5) * 8) + 2,
        revenueAtRisk: Math.floor(seededRandom(seed + 6) * 2000000) + 100000,
        recoveryConfidence: Math.floor(seededRandom(seed + 7) * 60) + 30,
        topRiskySuppliers: [SUPPLIER_NAMES[pIdx % SUPPLIER_NAMES.length], SUPPLIER_NAMES[(pIdx + 1) % SUPPLIER_NAMES.length]]
      })
    }
  })
  return exposures
}

// ============================================
// HELPER COMPONENTS
// ============================================

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value}`
}

function getRiskColor(tier: SlipRiskTier): string {
  switch (tier) {
    case "Critical": return "#dc2626"
    case "High": return "#f59e0b"
    case "Medium": return "#3b82f6"
    case "Low": return "#22c55e"
  }
}

function getRiskBgColor(tier: SlipRiskTier): string {
  switch (tier) {
    case "Critical": return "bg-red-100 text-red-700 border-red-200"
    case "High": return "bg-amber-100 text-amber-700 border-amber-200"
    case "Medium": return "bg-blue-100 text-blue-700 border-blue-200"
    case "Low": return "bg-green-100 text-green-700 border-green-200"
  }
}

// ============================================
// MAIN COMPONENT
// ============================================

export function SupplierCommitmentsTracking() {
  // Data
  const suppliers = useMemo(() => generateSuppliers(), [])
  const poLines = useMemo(() => generatePOLines(suppliers), [suppliers])
  const commodityMetrics = useMemo(() => generateCommodityMetrics(), [])
  const programExposure = useMemo(() => generateProgramExposure(), [])
  
  // State
  const [activeTab, setActiveTab] = useState("executive")
  const [horizon, setHorizon] = useState("30")
  const [selectedSite, setSelectedSite] = useState("all")
  const [selectedSupplier, setSelectedSupplier] = useState("all")
  const [selectedCommodity, setSelectedCommodity] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerType, setDrawerType] = useState<"supplier" | "po" | "part">("supplier")
  const [selectedItem, setSelectedItem] = useState<Supplier | POLine | null>(null)
  const [selectedPOLine, setSelectedPOLine] = useState<POLine | null>(null)
  const [roleSubtab, setRoleSubtab] = useState("buyer")
  
  // Filtered data
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      if (selectedSite !== "all" && s.site !== selectedSite) return false
      if (selectedCommodity !== "all" && s.commodity !== selectedCommodity) return false
      if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  }, [suppliers, selectedSite, selectedCommodity, searchQuery])
  
  const filteredPOLines = useMemo(() => {
    return poLines.filter(p => {
      if (selectedSite !== "all" && p.site !== selectedSite) return false
      if (selectedSupplier !== "all" && p.supplier !== selectedSupplier) return false
      if (selectedCommodity !== "all" && p.commodity !== selectedCommodity) return false
      if (searchQuery && !p.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !p.partNumber.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  }, [poLines, selectedSite, selectedSupplier, selectedCommodity, searchQuery])
  
  // KPIs
  const kpis = useMemo(() => {
    const highSlipSuppliers = filteredSuppliers.filter(s => s.slipRiskTier === "Critical" || s.slipRiskTier === "High").length
    const poLinesWithReCommits = filteredPOLines.filter(p => p.reCommitCount > 0).length
    const avgReCommitCount = filteredPOLines.length > 0 
      ? (filteredPOLines.reduce((sum, p) => sum + p.reCommitCount, 0) / filteredPOLines.length).toFixed(1) 
      : "0"
    const avgSlipDays = filteredPOLines.length > 0
      ? Math.round(filteredPOLines.reduce((sum, p) => sum + p.totalSlipDays, 0) / filteredPOLines.length)
      : 0
    const onTimeLines = filteredPOLines.filter(p => p.status === "Received" && p.totalSlipDays <= 0).length
    const receivedLines = filteredPOLines.filter(p => p.status === "Received").length
    const onTimePercent = receivedLines > 0 ? Math.round((onTimeLines / receivedLines) * 100) : 0
    const supplierDrivenShortages = filteredPOLines.filter(p => p.linkedShortage).length
    const supplierDrivenLateJobs = filteredPOLines.filter(p => p.linkedLateJob).length
    const clinsAtRisk = [...new Set(filteredPOLines.filter(p => p.slipRiskTier === "Critical" || p.slipRiskTier === "High").flatMap(p => p.linkedClins))].length
    const revenueAtRisk = filteredPOLines.filter(p => p.slipRiskTier === "Critical" || p.slipRiskTier === "High")
      .reduce((sum, p) => sum + p.quantity * p.unitPrice, 0)
    
    return { highSlipSuppliers, poLinesWithReCommits, avgReCommitCount, avgSlipDays, onTimePercent, supplierDrivenShortages, supplierDrivenLateJobs, clinsAtRisk, revenueAtRisk }
  }, [filteredSuppliers, filteredPOLines])
  
  // Chart data
  const fragilityMatrixData = useMemo(() => {
    return filteredSuppliers.map(s => ({
      x: s.avgSlipDays,
      y: s.avgReCommitCount,
      z: s.spend / 100000,
      name: s.name,
      tier: s.slipRiskTier,
      linkedJobs: s.linkedLateJobs,
      clins: s.clinsAffected
    }))
  }, [filteredSuppliers])
  
  const openSupplierDrawer = (supplier: Supplier) => {
    setSelectedItem(supplier)
    setDrawerType("supplier")
    setDrawerOpen(true)
  }
  
  const openPODrawer = (po: POLine) => {
    setSelectedItem(po)
    setSelectedPOLine(po)
    setDrawerType("po")
    setDrawerOpen(true)
  }
  
  // Week dates for trends
  const weekDates = useMemo(() => {
    const dates: string[] = []
    const today = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i * 7)
      dates.push(`WE ${d.getMonth() + 1}/${d.getDate()}`)
    }
    return dates
  }, [])
  
  const tabs = [
    { id: "executive", label: "Executive Summary", icon: BarChart3 },
    { id: "scorecards", label: "Supplier Scorecards", icon: Users },
    { id: "history", label: "PO Commitment History", icon: History },
    { id: "trends", label: "Part / Commodity / Site", icon: Layers },
    { id: "exposure", label: "Program / CLIN Exposure", icon: Target },
    { id: "queue", label: "Intervention Queue", icon: Zap },
    { id: "workbench", label: "Role Workbench", icon: ShieldAlert },
    { id: "governance", label: "Trends & Governance", icon: TrendingUp }
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Supplier Commitments Tracking & Slip Trends</h1>
          <p className="text-sm text-slate-500 mt-1">PO commitment history, supplier reliability, and downstream risk</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Last refresh: {new Date().toLocaleTimeString()}</span>
          <Button variant="outline" size="sm" className="h-8">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-8">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>
          <Button variant="outline" size="sm" className="h-8">
            <Share2 className="h-3.5 w-3.5 mr-1.5" />
            Share
          </Button>
        </div>
      </div>
      
      {/* Global Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-medium text-slate-600">Filters:</span>
            </div>
            
            <Select value={horizon} onValueChange={setHorizon}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="Horizon" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Next 7 days</SelectItem>
                <SelectItem value="14">Next 14 days</SelectItem>
                <SelectItem value="30">Next 30 days</SelectItem>
                <SelectItem value="60">Next 60 days</SelectItem>
                <SelectItem value="90">Next 90 days</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedSite} onValueChange={setSelectedSite}>
              <SelectTrigger className="w-[110px] h-8 text-xs">
                <SelectValue placeholder="Site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                {SITES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.slice(0, 10).map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            
            <Select value={selectedCommodity} onValueChange={setSelectedCommodity}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Commodity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Commodities</SelectItem>
                {COMMODITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search PO, Part, Supplier..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-[200px] h-8 pl-8 text-xs"
              />
            </div>
          </div>
          
          {/* Context Strip */}
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
            <span className="text-[10px] text-slate-400">Active:</span>
            <Badge variant="outline" className="text-[10px] h-5">{horizon} day horizon</Badge>
            {selectedSite !== "all" && <Badge variant="outline" className="text-[10px] h-5">{selectedSite}</Badge>}
            {selectedSupplier !== "all" && <Badge variant="outline" className="text-[10px] h-5">{selectedSupplier}</Badge>}
            {selectedCommodity !== "all" && <Badge variant="outline" className="text-[10px] h-5">{selectedCommodity}</Badge>}
          </div>
        </CardContent>
      </Card>
      
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-1 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-white text-blue-600 border border-b-0 border-slate-200 -mb-[1px]"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>
      
      {/* Tab Content */}
      <div className="min-h-[600px]">
        {/* Executive Summary */}
        {activeTab === "executive" && (
          <div className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-9 gap-3">
              {[
                { label: "High-Slip Suppliers", value: kpis.highSlipSuppliers, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
                { label: "PO Lines w/ Re-Commits", value: kpis.poLinesWithReCommits, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
                { label: "Avg Re-Commit Count", value: kpis.avgReCommitCount, icon: RefreshCw, color: "text-blue-600", bg: "bg-blue-50" },
                { label: "Avg Slip Days", value: kpis.avgSlipDays, icon: Calendar, color: "text-purple-600", bg: "bg-purple-50" },
                { label: "On-Time to Last Commit", value: `${kpis.onTimePercent}%`, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
                { label: "Supplier-Driven Shortages", value: kpis.supplierDrivenShortages, icon: Package, color: "text-red-600", bg: "bg-red-50" },
                { label: "Supplier-Driven Late Jobs", value: kpis.supplierDrivenLateJobs, icon: XCircle, color: "text-orange-600", bg: "bg-orange-50" },
                { label: "CLINs at Risk", value: kpis.clinsAtRisk, icon: Target, color: "text-rose-600", bg: "bg-rose-50" },
                { label: "Revenue at Risk", value: formatCurrency(kpis.revenueAtRisk), icon: TrendingDown, color: "text-red-600", bg: "bg-red-50" }
              ].map((kpi, idx) => {
                const Icon = kpi.icon
                return (
                  <Card key={idx} className={`${kpi.bg} border-0`}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${kpi.color}`} />
                        <span className="text-[10px] text-slate-500 truncate">{kpi.label}</span>
                      </div>
                      <p className={`text-xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Supplier Fragility Matrix */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-700">Supplier Fragility Matrix</CardTitle>
                  <CardDescription className="text-[10px]">
                    Bubble size = spend exposure; x = avg slip days; y = avg re-commit count
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        type="number" 
                        dataKey="x" 
                        name="Avg Slip Days" 
                        tick={{ fontSize: 10 }}
                        label={{ value: "Avg Slip Days", position: "bottom", fontSize: 10, offset: 15 }}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="y" 
                        name="Avg Re-Commit Count" 
                        tick={{ fontSize: 10 }}
                        label={{ value: "Avg Re-Commit Count", angle: -90, position: "insideLeft", fontSize: 10 }}
                      />
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="bg-white border border-slate-200 rounded-lg p-2 shadow-lg text-xs">
                                <p className="font-semibold">{data.name}</p>
                                <p>Avg Slip Days: {data.x}</p>
                                <p>Avg Re-Commits: {data.y.toFixed(1)}</p>
                                <p>Spend: {formatCurrency(data.z * 100000)}</p>
                                <p>Late Jobs: {data.linkedJobs}</p>
                                <p>CLINs Affected: {data.clins}</p>
                                <Badge className={`mt-1 text-[9px] ${getRiskBgColor(data.tier)}`}>{data.tier} Risk</Badge>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <ReferenceArea x1={15} x2={35} y1={2.5} y2={5} fill="#fee2e2" fillOpacity={0.3} />
                      <Scatter data={fragilityMatrixData} cursor="pointer" onClick={(data) => {
                        const supplier = suppliers.find(s => s.name === data.name)
                        if (supplier) openSupplierDrawer(supplier)
                      }}>
                        {fragilityMatrixData.map((entry, idx) => (
                          <Cell 
                            key={idx} 
                            fill={getRiskColor(entry.tier as SlipRiskTier)}
                            r={Math.max(6, Math.min(20, entry.z / 2))}
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4 mt-2 text-[10px]">
                    {(["Critical", "High", "Medium", "Low"] as SlipRiskTier[]).map(tier => (
                      <span key={tier} className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getRiskColor(tier) }} />
                        {tier}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* Top Risk Suppliers Table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-700">Top Risk Suppliers</CardTitle>
                  <CardDescription className="text-[10px]">Suppliers ranked by slip risk and downstream impact</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[340px]">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="text-left p-2 font-medium text-slate-600">Supplier</th>
                          <th className="text-center p-2 font-medium text-slate-600">Risk</th>
                          <th className="text-center p-2 font-medium text-slate-600">Re-Commits</th>
                          <th className="text-center p-2 font-medium text-slate-600">Slip Days</th>
                          <th className="text-center p-2 font-medium text-slate-600">On-Time</th>
                          <th className="text-center p-2 font-medium text-slate-600">At-Risk POs</th>
                          <th className="text-center p-2 font-medium text-slate-600">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSuppliers
                          .sort((a, b) => {
                            const tierOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 }
                            return tierOrder[a.slipRiskTier] - tierOrder[b.slipRiskTier]
                          })
                          .slice(0, 12)
                          .map((supplier, idx) => (
                            <tr 
                              key={supplier.id} 
                              className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                              onClick={() => openSupplierDrawer(supplier)}
                            >
                              <td className="p-2">
                                <div className="font-medium text-slate-700">{supplier.name}</div>
                                <div className="text-[10px] text-slate-400">{supplier.commodity}</div>
                              </td>
                              <td className="p-2 text-center">
                                <Badge className={`text-[9px] ${getRiskBgColor(supplier.slipRiskTier)}`}>
                                  {supplier.slipRiskTier}
                                </Badge>
                              </td>
                              <td className="p-2 text-center font-medium">{supplier.avgReCommitCount.toFixed(1)}</td>
                              <td className="p-2 text-center font-medium">{supplier.avgSlipDays}</td>
                              <td className="p-2 text-center">
                                <span className={supplier.onTimePercent < 70 ? "text-red-600" : supplier.onTimePercent < 85 ? "text-amber-600" : "text-green-600"}>
                                  {supplier.onTimePercent}%
                                </span>
                              </td>
                              <td className="p-2 text-center font-medium text-red-600">{supplier.atRiskLines}</td>
                              <td className="p-2 text-center">
                                <Badge variant="outline" className="text-[9px]">
                                  {supplier.slipRiskTier === "Critical" ? "Escalate" : supplier.slipRiskTier === "High" ? "Expedite" : "Monitor"}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
            
            {/* Slip Risk Score Composition */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-semibold text-slate-700">Slip Risk Score Composition</CardTitle>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3.5 w-3.5 text-slate-400" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      <p>Risk score factors: Re-commit frequency (25%), Slip magnitude (25%), On-time performance (20%), Downstream criticality (15%), Current exposure (15%)</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-6 gap-4">
                  {[
                    { label: "Re-Commit Frequency", weight: "25%", desc: "How often supplier moves dates", icon: RefreshCw },
                    { label: "Slip Magnitude", weight: "25%", desc: "Average days per slip event", icon: Calendar },
                    { label: "On-Time Performance", weight: "20%", desc: "% delivered on or before last commit", icon: CheckCircle2 },
                    { label: "Downstream Criticality", weight: "15%", desc: "Jobs, CLINs, programs affected", icon: Target },
                    { label: "Current PO Exposure", weight: "10%", desc: "Open at-risk lines today", icon: AlertTriangle },
                    { label: "Historical Pattern", weight: "5%", desc: "12-week slip trend direction", icon: TrendingUp }
                  ].map((factor, idx) => {
                    const Icon = factor.icon
                    return (
                      <div key={idx} className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="h-4 w-4 text-blue-600" />
                          <span className="text-xs font-semibold text-slate-700">{factor.weight}</span>
                        </div>
                        <p className="text-[11px] font-medium text-slate-600">{factor.label}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{factor.desc}</p>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Supplier Scorecards */}
        {activeTab === "scorecards" && (
          <div className="grid grid-cols-3 gap-4">
            {/* Supplier List */}
            <Card className="col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">Supplier Reliability Rankings</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[550px]">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium text-slate-600">Supplier</th>
                        <th className="text-center p-2 font-medium text-slate-600">Commodity</th>
                        <th className="text-center p-2 font-medium text-slate-600">Site</th>
                        <th className="text-center p-2 font-medium text-slate-600">Re-Commits/Line</th>
                        <th className="text-center p-2 font-medium text-slate-600">Avg Slip</th>
                        <th className="text-center p-2 font-medium text-slate-600">P90 Slip</th>
                        <th className="text-center p-2 font-medium text-slate-600">On-Time %</th>
                        <th className="text-center p-2 font-medium text-slate-600">Open Lines</th>
                        <th className="text-center p-2 font-medium text-slate-600">At-Risk</th>
                        <th className="text-center p-2 font-medium text-slate-600">Shortages</th>
                        <th className="text-center p-2 font-medium text-slate-600">Late Jobs</th>
                        <th className="text-center p-2 font-medium text-slate-600">Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSuppliers
                        .sort((a, b) => b.avgSlipDays - a.avgSlipDays)
                        .map((supplier) => (
                          <tr 
                            key={supplier.id} 
                            className="border-b border-slate-100 hover:bg-blue-50 cursor-pointer"
                            onClick={() => openSupplierDrawer(supplier)}
                          >
                            <td className="p-2">
                              <div className="font-medium text-slate-700">{supplier.name}</div>
                              <div className="text-[10px] text-slate-400">{supplier.code}</div>
                            </td>
                            <td className="p-2 text-center">{supplier.commodity}</td>
                            <td className="p-2 text-center">{supplier.site}</td>
                            <td className="p-2 text-center font-medium">{supplier.avgReCommitCount.toFixed(1)}</td>
                            <td className="p-2 text-center font-medium">{supplier.avgSlipDays}d</td>
                            <td className="p-2 text-center text-slate-500">{supplier.p90SlipDays}d</td>
                            <td className="p-2 text-center">
                              <span className={supplier.onTimePercent < 70 ? "text-red-600 font-medium" : supplier.onTimePercent < 85 ? "text-amber-600" : "text-green-600"}>
                                {supplier.onTimePercent}%
                              </span>
                            </td>
                            <td className="p-2 text-center">{supplier.openLines}</td>
                            <td className="p-2 text-center font-medium text-red-600">{supplier.atRiskLines}</td>
                            <td className="p-2 text-center">{supplier.linkedShortages}</td>
                            <td className="p-2 text-center">{supplier.linkedLateJobs}</td>
                            <td className="p-2 text-center">
                              <Badge className={`text-[9px] ${getRiskBgColor(supplier.slipRiskTier)}`}>
                                {supplier.slipRiskTier}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </CardContent>
            </Card>
            
            {/* Slip Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">Slip Days Distribution (All Suppliers)</CardTitle>
                <CardDescription className="text-[10px]">Distribution of slip days across all PO lines</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart 
                    data={Array.from({ length: 10 }, (_, i) => ({
                      range: `${i * 5}-${(i + 1) * 5}`,
                      count: filteredPOLines.filter(p => p.totalSlipDays >= i * 5 && p.totalSlipDays < (i + 1) * 5).length
                    }))}
                    margin={{ top: 10, right: 10, bottom: 20, left: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="range" tick={{ fontSize: 9 }} label={{ value: "Slip Days", position: "bottom", fontSize: 10, offset: 5 }} />
                    <YAxis tick={{ fontSize: 9 }} />
                    <RechartsTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white border border-slate-200 rounded p-2 text-xs shadow">
                              <p>{payload[0].payload.range} days: {payload[0].value} lines</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-semibold text-slate-700 mb-2">Key Statistics</h4>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-slate-50 p-2 rounded">
                      <span className="text-slate-500">Median Slip:</span>
                      <span className="font-semibold ml-1">{Math.round(filteredPOLines.map(p => p.totalSlipDays).sort((a, b) => a - b)[Math.floor(filteredPOLines.length / 2)] || 0)}d</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                      <span className="text-slate-500">Max Slip:</span>
                      <span className="font-semibold ml-1">{Math.max(...filteredPOLines.map(p => p.totalSlipDays))}d</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                      <span className="text-slate-500">Lines {">"}14d:</span>
                      <span className="font-semibold ml-1 text-red-600">{filteredPOLines.filter(p => p.totalSlipDays > 14).length}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                      <span className="text-slate-500">Zero Slip:</span>
                      <span className="font-semibold ml-1 text-green-600">{filteredPOLines.filter(p => p.totalSlipDays === 0).length}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* PO Commitment History */}
        {activeTab === "history" && (
          <div className="grid grid-cols-3 gap-4">
            {/* PO Lines Table */}
            <Card className="col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">Current Open PO Lines with High Slip Risk</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium text-slate-600">PO / Line</th>
                        <th className="text-left p-2 font-medium text-slate-600">Supplier</th>
                        <th className="text-left p-2 font-medium text-slate-600">Part</th>
                        <th className="text-center p-2 font-medium text-slate-600">Original</th>
                        <th className="text-center p-2 font-medium text-slate-600">Current</th>
                        <th className="text-center p-2 font-medium text-slate-600">Re-Commits</th>
                        <th className="text-center p-2 font-medium text-slate-600">Slip Days</th>
                        <th className="text-center p-2 font-medium text-slate-600">Required By</th>
                        <th className="text-center p-2 font-medium text-slate-600">Jobs</th>
                        <th className="text-center p-2 font-medium text-slate-600">Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPOLines
                        .filter(p => p.status !== "Received")
                        .sort((a, b) => b.totalSlipDays - a.totalSlipDays)
                        .slice(0, 20)
                        .map((po) => (
                          <tr 
                            key={po.id} 
                            className={`border-b border-slate-100 hover:bg-blue-50 cursor-pointer ${selectedPOLine?.id === po.id ? "bg-blue-50" : ""}`}
                            onClick={() => { setSelectedPOLine(po); openPODrawer(po) }}
                          >
                            <td className="p-2">
                              <div className="font-medium text-slate-700">{po.poNumber}</div>
                              <div className="text-[10px] text-slate-400">Line {po.lineNumber}</div>
                            </td>
                            <td className="p-2 text-slate-600">{po.supplier.split(" ")[0]}</td>
                            <td className="p-2">
                              <div className="font-mono text-[10px]">{po.partNumber}</div>
                            </td>
                            <td className="p-2 text-center text-[10px]">{formatDate(po.originalPromise)}</td>
                            <td className="p-2 text-center text-[10px] font-medium">{formatDate(po.currentPromise)}</td>
                            <td className="p-2 text-center">
                              <Badge variant="outline" className={`text-[9px] ${po.reCommitCount > 2 ? "bg-red-50 text-red-600 border-red-200" : ""}`}>
                                {po.reCommitCount}
                              </Badge>
                            </td>
                            <td className="p-2 text-center font-medium text-red-600">{po.totalSlipDays}d</td>
                            <td className="p-2 text-center text-[10px]">{formatDate(po.requiredByDate)}</td>
                            <td className="p-2 text-center">{po.linkedJobs}</td>
                            <td className="p-2 text-center">
                              <Badge className={`text-[9px] ${getRiskBgColor(po.slipRiskTier)}`}>
                                {po.slipRiskTier}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </CardContent>
            </Card>
            
            {/* Commitment Timeline */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">
                  {selectedPOLine ? `Commitment Timeline: ${selectedPOLine.poNumber}` : "Select a PO Line"}
                </CardTitle>
                {selectedPOLine && (
                  <CardDescription className="text-[10px]">
                    {selectedPOLine.partNumber} | {selectedPOLine.supplier}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {selectedPOLine ? (
                  <div className="space-y-4">
                    {/* Visual Timeline */}
                    <div className="relative">
                      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-200" />
                      
                      {/* Original Promise */}
                      <div className="relative flex items-start gap-3 pb-4">
                        <div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-blue-500 flex items-center justify-center z-10">
                          <Calendar className="h-3 w-3 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-700">Original Promise</p>
                          <p className="text-[11px] text-slate-500">{formatDate(selectedPOLine.originalPromise)}</p>
                        </div>
                      </div>
                      
                      {/* Re-commits */}
                      {selectedPOLine.commitmentHistory.map((event, idx) => (
                        <div key={idx} className="relative flex items-start gap-3 pb-4">
                          <div className="w-6 h-6 rounded-full bg-amber-100 border-2 border-amber-500 flex items-center justify-center z-10">
                            <RefreshCw className="h-3 w-3 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-700">Re-Commit #{event.eventNumber}</p>
                            <p className="text-[10px] text-slate-500">{formatDate(event.revisedPromise)} (+{event.slipDelta}d)</p>
                            <Badge variant="outline" className="text-[9px] mt-1">{event.reasonCode}</Badge>
                          </div>
                        </div>
                      ))}
                      
                      {/* Current/Final */}
                      <div className="relative flex items-start gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 ${
                          selectedPOLine.actualReceipt 
                            ? "bg-green-100 border-2 border-green-500" 
                            : "bg-slate-100 border-2 border-slate-400"
                        }`}>
                          {selectedPOLine.actualReceipt 
                            ? <CheckCircle2 className="h-3 w-3 text-green-600" />
                            : <Clock className="h-3 w-3 text-slate-500" />
                          }
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-700">
                            {selectedPOLine.actualReceipt ? "Received" : "Current Promise"}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {selectedPOLine.actualReceipt 
                              ? formatDate(selectedPOLine.actualReceipt)
                              : formatDate(selectedPOLine.currentPromise)
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-100">
                      <div className="bg-slate-50 p-2 rounded text-center">
                        <p className="text-[10px] text-slate-500">Total Slip</p>
                        <p className="text-lg font-bold text-red-600">{selectedPOLine.totalSlipDays}d</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded text-center">
                        <p className="text-[10px] text-slate-500">Re-Commits</p>
                        <p className="text-lg font-bold text-amber-600">{selectedPOLine.reCommitCount}</p>
                      </div>
                    </div>
                    
                    {/* Linked Demand */}
                    <div className="pt-4 border-t border-slate-100">
                      <h4 className="text-xs font-semibold text-slate-700 mb-2">Linked Demand & Impact</h4>
                      <div className="space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Jobs Blocked:</span>
                          <span className="font-medium">{selectedPOLine.linkedJobs}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">CLINs:</span>
                          <span className="font-medium">{selectedPOLine.linkedClins.join(", ")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Shortage Link:</span>
                          <Badge variant={selectedPOLine.linkedShortage ? "destructive" : "secondary"} className="text-[9px]">
                            {selectedPOLine.linkedShortage ? "Yes" : "No"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Late Job Link:</span>
                          <Badge variant={selectedPOLine.linkedLateJob ? "destructive" : "secondary"} className="text-[9px]">
                            {selectedPOLine.linkedLateJob ? "Yes" : "No"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[400px] text-slate-400">
                    <FileText className="h-12 w-12 mb-2" />
                    <p className="text-sm">Select a PO line to view commitment history</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Part / Commodity / Site Trends */}
        {activeTab === "trends" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Slip by Commodity */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-700">Slip Metrics by Commodity</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart 
                      data={commodityMetrics.sort((a, b) => b.avgSlipDays - a.avgSlipDays)}
                      layout="vertical"
                      margin={{ left: 80, right: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="commodity" tick={{ fontSize: 10 }} width={75} />
                      <RechartsTooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="bg-white border border-slate-200 rounded p-2 text-xs shadow">
                                <p className="font-semibold">{data.commodity}</p>
                                <p>Avg Slip: {data.avgSlipDays}d</p>
                                <p>Avg Re-Commits: {data.avgReCommitCount}</p>
                                <p>On-Time: {data.onTimePercent}%</p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="avgSlipDays" fill="#ef4444" name="Avg Slip Days" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              {/* Supplier by Commodity Heatmap */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-700">Supplier × Commodity Risk Heatmap</CardTitle>
                  <CardDescription className="text-[10px]">Cell color = slip risk; darker = higher risk</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr>
                          <th className="text-left p-1.5 font-medium text-slate-600 sticky left-0 bg-white">Supplier</th>
                          {COMMODITIES.slice(0, 6).map(c => (
                            <th key={c} className="text-center p-1.5 font-medium text-slate-600 min-w-[60px]">{c.slice(0, 6)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSuppliers.slice(0, 8).map((supplier, sIdx) => (
                          <tr key={supplier.id}>
                            <td className="p-1.5 font-medium text-slate-700 sticky left-0 bg-white">{supplier.name.split(" ")[0]}</td>
                            {COMMODITIES.slice(0, 6).map((commodity, cIdx) => {
                              const hasExposure = supplier.commodity === commodity || seededRandom(sIdx * 100 + cIdx) > 0.6
                              const riskLevel = hasExposure ? Math.floor(seededRandom(sIdx * 200 + cIdx) * 4) : -1
                              const bgColors = ["bg-green-100", "bg-yellow-100", "bg-orange-100", "bg-red-100"]
                              const textColors = ["text-green-700", "text-yellow-700", "text-orange-700", "text-red-700"]
                              return (
                                <td key={commodity} className="p-1">
                                  {hasExposure ? (
                                    <div className={`${bgColors[riskLevel]} ${textColors[riskLevel]} rounded p-1 text-center font-medium`}>
                                      {["Low", "Med", "High", "Crit"][riskLevel]}
                                    </div>
                                  ) : (
                                    <div className="bg-slate-50 text-slate-300 rounded p-1 text-center">-</div>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Part-Level Fragility */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">Part-Level Supplier Fragility</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[280px]">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium text-slate-600">Part Number</th>
                        <th className="text-left p-2 font-medium text-slate-600">Description</th>
                        <th className="text-left p-2 font-medium text-slate-600">Supplier</th>
                        <th className="text-center p-2 font-medium text-slate-600">Commodity</th>
                        <th className="text-center p-2 font-medium text-slate-600">Avg Slip Days</th>
                        <th className="text-center p-2 font-medium text-slate-600">Avg Re-Commits</th>
                        <th className="text-center p-2 font-medium text-slate-600">Open POs</th>
                        <th className="text-center p-2 font-medium text-slate-600">Shortages</th>
                        <th className="text-center p-2 font-medium text-slate-600">Late Jobs</th>
                        <th className="text-center p-2 font-medium text-slate-600">Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...new Set(filteredPOLines.map(p => p.partNumber))].slice(0, 15).map((partNumber, idx) => {
                        const partLines = filteredPOLines.filter(p => p.partNumber === partNumber)
                        const avgSlip = Math.round(partLines.reduce((s, p) => s + p.totalSlipDays, 0) / partLines.length)
                        const avgReCommit = (partLines.reduce((s, p) => s + p.reCommitCount, 0) / partLines.length).toFixed(1)
                        const sample = partLines[0]
                        const riskTier: SlipRiskTier = avgSlip > 15 ? "Critical" : avgSlip > 10 ? "High" : avgSlip > 5 ? "Medium" : "Low"
                        
                        return (
                          <tr key={partNumber} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="p-2 font-mono text-[10px]">{partNumber}</td>
                            <td className="p-2 text-slate-600">{sample.partDescription}</td>
                            <td className="p-2">{sample.supplier.split(" ")[0]}</td>
                            <td className="p-2 text-center">{sample.commodity}</td>
                            <td className="p-2 text-center font-medium text-red-600">{avgSlip}d</td>
                            <td className="p-2 text-center">{avgReCommit}</td>
                            <td className="p-2 text-center">{partLines.filter(p => p.status !== "Received").length}</td>
                            <td className="p-2 text-center">{partLines.filter(p => p.linkedShortage).length}</td>
                            <td className="p-2 text-center">{partLines.filter(p => p.linkedLateJob).length}</td>
                            <td className="p-2 text-center">
                              <Badge className={`text-[9px] ${getRiskBgColor(riskTier)}`}>{riskTier}</Badge>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Program / CLIN Exposure */}
        {activeTab === "exposure" && (
          <div className="space-y-4">
            {/* Program Risk Heatmap */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">Program / CLIN Supplier Risk Heatmap</CardTitle>
                <CardDescription className="text-[10px]">Weeks with inbound supply backed by fragile suppliers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr>
                        <th className="text-left p-2 font-medium text-slate-600 sticky left-0 bg-white min-w-[140px]">Program / CLIN</th>
                        {Array.from({ length: 8 }, (_, i) => {
                          const d = new Date()
                          d.setDate(d.getDate() + i * 7)
                          return (
                            <th key={i} className="text-center p-2 font-medium text-slate-600 min-w-[70px]">
                              WE {d.getMonth() + 1}/{d.getDate()}
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {programExposure.slice(0, 10).map((exp, idx) => (
                        <tr key={idx} className="border-b border-slate-100">
                          <td className="p-2 sticky left-0 bg-white">
                            <div className="font-medium text-slate-700">{exp.program}</div>
                            <div className="text-[9px] text-slate-400">{exp.clin}</div>
                          </td>
                          {Array.from({ length: 8 }, (_, wIdx) => {
                            const risk = Math.floor(seededRandom(idx * 100 + wIdx) * 4)
                            const bgColors = ["bg-green-100", "bg-yellow-100", "bg-orange-100", "bg-red-100"]
                            const textColors = ["text-green-700", "text-yellow-700", "text-orange-700", "text-red-700"]
                            const riskLines = Math.floor(seededRandom(idx * 200 + wIdx) * 5)
                            return (
                              <td key={wIdx} className="p-1">
                                <div className={`${bgColors[risk]} ${textColors[risk]} rounded p-1.5 text-center`}>
                                  <div className="font-semibold">{riskLines}</div>
                                  <div className="text-[8px]">lines</div>
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            
            {/* Suppliers Driving Commitment Risk */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">Suppliers Driving Commitment Risk</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[280px]">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium text-slate-600">Program / CLIN</th>
                        <th className="text-center p-2 font-medium text-slate-600">Required Date</th>
                        <th className="text-left p-2 font-medium text-slate-600">Risky Suppliers</th>
                        <th className="text-center p-2 font-medium text-slate-600">At-Risk POs</th>
                        <th className="text-center p-2 font-medium text-slate-600">Avg Slip Risk</th>
                        <th className="text-center p-2 font-medium text-slate-600">Revenue Risk</th>
                        <th className="text-center p-2 font-medium text-slate-600">Recovery Conf.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {programExposure
                        .sort((a, b) => b.revenueAtRisk - a.revenueAtRisk)
                        .slice(0, 12)
                        .map((exp, idx) => (
                          <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="p-2">
                              <div className="font-medium text-slate-700">{exp.program}</div>
                              <div className="text-[10px] text-slate-400">{exp.clin}</div>
                            </td>
                            <td className="p-2 text-center text-[10px]">{formatDate(exp.requiredDate)}</td>
                            <td className="p-2">
                              <div className="flex flex-wrap gap-1">
                                {exp.topRiskySuppliers.map((s, sIdx) => (
                                  <Badge key={sIdx} variant="outline" className="text-[9px]">{s.split(" ")[0]}</Badge>
                                ))}
                              </div>
                            </td>
                            <td className="p-2 text-center font-medium text-red-600">{exp.riskyPOLines}</td>
                            <td className="p-2 text-center">{exp.avgSlipRisk}d</td>
                            <td className="p-2 text-center font-medium">{formatCurrency(exp.revenueAtRisk)}</td>
                            <td className="p-2 text-center">
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge className={`text-[9px] ${
                                    exp.recoveryConfidence > 70 ? "bg-green-100 text-green-700" :
                                    exp.recoveryConfidence > 40 ? "bg-yellow-100 text-yellow-700" :
                                    "bg-red-100 text-red-700"
                                  }`}>
                                    {exp.recoveryConfidence}%
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs">
                                  Based on supplier slip history and current mitigation actions
                                </TooltipContent>
                              </Tooltip>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Intervention Queue */}
        {activeTab === "queue" && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700">Current Intervention Queue</CardTitle>
              <CardDescription className="text-[10px]">Prioritized PO lines requiring action to reduce downstream risk</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[520px]">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="text-center p-2 font-medium text-slate-600 w-12">#</th>
                      <th className="text-left p-2 font-medium text-slate-600">Supplier</th>
                      <th className="text-left p-2 font-medium text-slate-600">PO / Line</th>
                      <th className="text-left p-2 font-medium text-slate-600">Part</th>
                      <th className="text-center p-2 font-medium text-slate-600">Original</th>
                      <th className="text-center p-2 font-medium text-slate-600">Current</th>
                      <th className="text-center p-2 font-medium text-slate-600">Re-Commits</th>
                      <th className="text-center p-2 font-medium text-slate-600">Slip Days</th>
                      <th className="text-center p-2 font-medium text-slate-600">Required By</th>
                      <th className="text-center p-2 font-medium text-slate-600">Jobs</th>
                      <th className="text-center p-2 font-medium text-slate-600">Flags</th>
                      <th className="text-center p-2 font-medium text-slate-600">Risk</th>
                      <th className="text-left p-2 font-medium text-slate-600">Action</th>
                      <th className="text-left p-2 font-medium text-slate-600">Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPOLines
                      .filter(p => p.status !== "Received")
                      .sort((a, b) => {
                        const tierOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 }
                        if (tierOrder[a.slipRiskTier] !== tierOrder[b.slipRiskTier]) {
                          return tierOrder[a.slipRiskTier] - tierOrder[b.slipRiskTier]
                        }
                        return b.totalSlipDays - a.totalSlipDays
                      })
                      .slice(0, 25)
                      .map((po, idx) => (
                        <tr 
                          key={po.id} 
                          className="border-b border-slate-100 hover:bg-blue-50 cursor-pointer"
                          onClick={() => openPODrawer(po)}
                        >
                          <td className="p-2 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-2">
                            <div className="font-medium text-slate-700">{po.supplier.split(" ")[0]}</div>
                          </td>
                          <td className="p-2">
                            <div className="font-medium">{po.poNumber}</div>
                            <div className="text-[10px] text-slate-400">L{po.lineNumber}</div>
                          </td>
                          <td className="p-2 font-mono text-[10px]">{po.partNumber}</td>
                          <td className="p-2 text-center text-[10px]">{formatDate(po.originalPromise)}</td>
                          <td className="p-2 text-center text-[10px] font-medium">{formatDate(po.currentPromise)}</td>
                          <td className="p-2 text-center">
                            <Badge variant="outline" className={`text-[9px] ${po.reCommitCount > 2 ? "bg-red-50 text-red-600" : ""}`}>
                              {po.reCommitCount}
                            </Badge>
                          </td>
                          <td className="p-2 text-center font-medium text-red-600">{po.totalSlipDays}d</td>
                          <td className="p-2 text-center text-[10px]">{formatDate(po.requiredByDate)}</td>
                          <td className="p-2 text-center">{po.linkedJobs}</td>
                          <td className="p-2">
                            <div className="flex flex-wrap gap-0.5 justify-center">
                              {po.reCommitCount > 2 && <Badge className="text-[8px] bg-amber-100 text-amber-700 px-1">Multi-RC</Badge>}
                              {po.linkedShortage && <Badge className="text-[8px] bg-red-100 text-red-700 px-1">Short</Badge>}
                              {po.linkedLateJob && <Badge className="text-[8px] bg-orange-100 text-orange-700 px-1">Late</Badge>}
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            <Badge className={`text-[9px] ${getRiskBgColor(po.slipRiskTier)}`}>{po.slipRiskTier}</Badge>
                          </td>
                          <td className="p-2">
                            <Badge variant="outline" className="text-[9px]">{po.recommendedAction}</Badge>
                          </td>
                          <td className="p-2 text-slate-600">{po.owner}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
        
        {/* Role Workbench */}
        {activeTab === "workbench" && (
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-slate-200 pb-2">
              {[
                { id: "buyer", label: "Buyer / MPM", icon: Users },
                { id: "commodity", label: "Commodity Manager", icon: Layers },
                { id: "planner", label: "Planner / Shortage Owner", icon: Package },
                { id: "program", label: "Program / PDM", icon: Target }
              ].map(role => {
                const Icon = role.icon
                return (
                  <button
                    key={role.id}
                    onClick={() => setRoleSubtab(role.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                      roleSubtab === role.id
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {role.label}
                  </button>
                )
              })}
            </div>
            
            {roleSubtab === "buyer" && (
              <div className="grid grid-cols-3 gap-4">
                {/* Buyer KPIs */}
                <Card className="col-span-3">
                  <CardContent className="p-3">
                    <div className="grid grid-cols-5 gap-4">
                      {[
                        { label: "PO Lines to Expedite", value: filteredPOLines.filter(p => p.recommendedAction === "Expedite").length, color: "text-red-600" },
                        { label: "Suppliers to Escalate", value: filteredSuppliers.filter(s => s.slipRiskTier === "Critical").length, color: "text-amber-600" },
                        { label: "Dual-Source Candidates", value: filteredPOLines.filter(p => p.recommendedAction === "Dual-Source").length, color: "text-blue-600" },
                        { label: "Commitment Changes (7d)", value: filteredPOLines.filter(p => p.reCommitCount > 0).length, color: "text-purple-600" },
                        { label: "Recovery ETAs Past Due", value: Math.floor(filteredPOLines.length * 0.15), color: "text-red-600" }
                      ].map((kpi, idx) => (
                        <div key={idx} className="text-center">
                          <p className="text-[10px] text-slate-500">{kpi.label}</p>
                          <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Expedite Priority */}
                <Card className="col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-slate-700">Expedite Priority Queue</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[320px]">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="text-left p-2 font-medium text-slate-600">PO / Supplier</th>
                            <th className="text-left p-2 font-medium text-slate-600">Part</th>
                            <th className="text-center p-2 font-medium text-slate-600">Slip</th>
                            <th className="text-center p-2 font-medium text-slate-600">Re-Commits</th>
                            <th className="text-center p-2 font-medium text-slate-600">Jobs</th>
                            <th className="text-center p-2 font-medium text-slate-600">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPOLines
                            .filter(p => p.status !== "Received" && (p.slipRiskTier === "Critical" || p.slipRiskTier === "High"))
                            .slice(0, 12)
                            .map((po) => (
                              <tr key={po.id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="p-2">
                                  <div className="font-medium">{po.poNumber}</div>
                                  <div className="text-[10px] text-slate-400">{po.supplier.split(" ")[0]}</div>
                                </td>
                                <td className="p-2 font-mono text-[10px]">{po.partNumber}</td>
                                <td className="p-2 text-center font-medium text-red-600">{po.totalSlipDays}d</td>
                                <td className="p-2 text-center">{po.reCommitCount}</td>
                                <td className="p-2 text-center">{po.linkedJobs}</td>
                                <td className="p-2 text-center">
                                  <Badge variant="outline" className="text-[9px]">{po.recommendedAction}</Badge>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  </CardContent>
                </Card>
                
                {/* Supplier Slip Behavior */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-slate-700">Supplier Slip Behavior</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[320px]">
                      <div className="space-y-2 p-3">
                        {filteredSuppliers
                          .filter(s => s.slipRiskTier !== "Low")
                          .slice(0, 8)
                          .map((supplier) => (
                            <div key={supplier.id} className="bg-slate-50 rounded-lg p-2" onClick={() => openSupplierDrawer(supplier)}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-xs">{supplier.name.split(" ")[0]}</span>
                                <Badge className={`text-[9px] ${getRiskBgColor(supplier.slipRiskTier)}`}>{supplier.slipRiskTier}</Badge>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-[10px]">
                                <div><span className="text-slate-400">Slip:</span> <span className="font-medium">{supplier.avgSlipDays}d</span></div>
                                <div><span className="text-slate-400">RC:</span> <span className="font-medium">{supplier.avgReCommitCount.toFixed(1)}</span></div>
                                <div><span className="text-slate-400">OT:</span> <span className="font-medium">{supplier.onTimePercent}%</span></div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {roleSubtab === "commodity" && (
              <div className="grid grid-cols-2 gap-4">
                {/* Commodity Summary */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-slate-700">Commodity Reliability Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left p-2 font-medium text-slate-600">Commodity</th>
                          <th className="text-center p-2 font-medium text-slate-600">Suppliers</th>
                          <th className="text-center p-2 font-medium text-slate-600">Avg Slip</th>
                          <th className="text-center p-2 font-medium text-slate-600">On-Time %</th>
                          <th className="text-center p-2 font-medium text-slate-600">At-Risk Lines</th>
                          <th className="text-center p-2 font-medium text-slate-600">Shortages</th>
                        </tr>
                      </thead>
                      <tbody>
                        {commodityMetrics.map((cm) => (
                          <tr key={cm.commodity} className="border-b border-slate-100">
                            <td className="p-2 font-medium">{cm.commodity}</td>
                            <td className="p-2 text-center">{cm.supplierCount}</td>
                            <td className="p-2 text-center font-medium text-red-600">{cm.avgSlipDays}d</td>
                            <td className="p-2 text-center">{cm.onTimePercent}%</td>
                            <td className="p-2 text-center">{cm.atRiskLines}</td>
                            <td className="p-2 text-center">{cm.linkedShortages}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
                
                {/* Sourcing Implications */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-slate-700">Sourcing & Contracting Implications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {filteredSuppliers
                        .filter(s => s.slipRiskTier === "Critical" || s.slipRiskTier === "High")
                        .slice(0, 5)
                        .map((supplier) => (
                          <div key={supplier.id} className="bg-slate-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-xs">{supplier.name}</span>
                              <Badge className={`text-[9px] ${getRiskBgColor(supplier.slipRiskTier)}`}>{supplier.slipRiskTier}</Badge>
                            </div>
                            <p className="text-[10px] text-slate-600 mb-2">
                              {supplier.commodity} | Spend: {formatCurrency(supplier.spend)} | {supplier.programsAffected} programs
                            </p>
                            <div className="flex gap-1">
                              <Badge variant="outline" className="text-[9px]">Review Contract Terms</Badge>
                              {supplier.avgReCommitCount > 2 && <Badge variant="outline" className="text-[9px]">Add Buffer Time</Badge>}
                              {supplier.atRiskLines > 5 && <Badge variant="outline" className="text-[9px]">Dual-Source</Badge>}
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {roleSubtab === "planner" && (
              <div className="grid grid-cols-3 gap-4">
                {/* Planner KPIs */}
                <Card className="col-span-3">
                  <CardContent className="p-3">
                    <div className="grid grid-cols-4 gap-4">
                      {[
                        { label: "Demands Backed by Poor-Slip Suppliers", value: Math.floor(filteredPOLines.length * 0.35), color: "text-red-600" },
                        { label: "Parts to Buffer/Re-Phase", value: Math.floor(filteredPOLines.length * 0.2), color: "text-amber-600" },
                        { label: "Linked Shortages", value: filteredPOLines.filter(p => p.linkedShortage).length, color: "text-red-600" },
                        { label: "Linked Late Jobs", value: filteredPOLines.filter(p => p.linkedLateJob).length, color: "text-orange-600" }
                      ].map((kpi, idx) => (
                        <div key={idx} className="text-center">
                          <p className="text-[10px] text-slate-500">{kpi.label}</p>
                          <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                {/* At-Risk Demands */}
                <Card className="col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-slate-700">At-Risk Demands (Poor-Slip Suppliers)</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[280px]">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="text-left p-2 font-medium text-slate-600">Part</th>
                            <th className="text-left p-2 font-medium text-slate-600">Supplier</th>
                            <th className="text-center p-2 font-medium text-slate-600">Supplier Slip</th>
                            <th className="text-center p-2 font-medium text-slate-600">Required</th>
                            <th className="text-center p-2 font-medium text-slate-600">Shortage?</th>
                            <th className="text-center p-2 font-medium text-slate-600">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPOLines
                            .filter(p => p.status !== "Received" && p.totalSlipDays > 10)
                            .slice(0, 12)
                            .map((po) => (
                              <tr key={po.id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="p-2 font-mono text-[10px]">{po.partNumber}</td>
                                <td className="p-2">{po.supplier.split(" ")[0]}</td>
                                <td className="p-2 text-center font-medium text-red-600">{po.totalSlipDays}d avg</td>
                                <td className="p-2 text-center text-[10px]">{formatDate(po.requiredByDate)}</td>
                                <td className="p-2 text-center">
                                  <Badge variant={po.linkedShortage ? "destructive" : "secondary"} className="text-[9px]">
                                    {po.linkedShortage ? "Yes" : "No"}
                                  </Badge>
                                </td>
                                <td className="p-2 text-center">
                                  <Badge variant="outline" className="text-[9px]">
                                    {po.linkedShortage ? "Buffer/Alternate" : "Monitor"}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  </CardContent>
                </Card>
                
                {/* Buffer Recommendations */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-slate-700">Buffer / Re-Phase Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {filteredSuppliers
                        .filter(s => s.avgSlipDays > 12)
                        .slice(0, 6)
                        .map((supplier) => (
                          <div key={supplier.id} className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-xs text-amber-800">{supplier.name.split(" ")[0]}</span>
                              <span className="text-[10px] text-amber-600">+{supplier.avgSlipDays}d buffer</span>
                            </div>
                            <p className="text-[10px] text-amber-700">
                              Add {supplier.avgSlipDays} days safety time for {supplier.openLines} open lines
                            </p>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {roleSubtab === "program" && (
              <div className="grid grid-cols-2 gap-4">
                {/* Near-Term CLIN Exposure */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-slate-700">Near-Term CLIN & Milestone Exposure</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[320px]">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="text-left p-2 font-medium text-slate-600">Program / CLIN</th>
                            <th className="text-center p-2 font-medium text-slate-600">Required</th>
                            <th className="text-center p-2 font-medium text-slate-600">Risky Suppliers</th>
                            <th className="text-center p-2 font-medium text-slate-600">At-Risk POs</th>
                            <th className="text-center p-2 font-medium text-slate-600">Revenue Risk</th>
                          </tr>
                        </thead>
                        <tbody>
                          {programExposure
                            .sort((a, b) => a.requiredDate.getTime() - b.requiredDate.getTime())
                            .slice(0, 12)
                            .map((exp, idx) => (
                              <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="p-2">
                                  <div className="font-medium">{exp.program}</div>
                                  <div className="text-[10px] text-slate-400">{exp.clin}</div>
                                </td>
                                <td className="p-2 text-center text-[10px]">{formatDate(exp.requiredDate)}</td>
                                <td className="p-2 text-center font-medium text-amber-600">{exp.suppliersAtRisk}</td>
                                <td className="p-2 text-center font-medium text-red-600">{exp.riskyPOLines}</td>
                                <td className="p-2 text-center">{formatCurrency(exp.revenueAtRisk)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  </CardContent>
                </Card>
                
                {/* Recovery Alignment */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-slate-700">Suppliers Most Likely to Affect Commitments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {filteredSuppliers
                        .filter(s => s.clinsAffected > 2)
                        .sort((a, b) => b.clinsAffected - a.clinsAffected)
                        .slice(0, 6)
                        .map((supplier) => (
                          <div key={supplier.id} className="bg-slate-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-xs">{supplier.name}</span>
                              <Badge className={`text-[9px] ${getRiskBgColor(supplier.slipRiskTier)}`}>{supplier.slipRiskTier}</Badge>
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-[10px]">
                              <div><span className="text-slate-400">CLINs:</span> <span className="font-medium">{supplier.clinsAffected}</span></div>
                              <div><span className="text-slate-400">Programs:</span> <span className="font-medium">{supplier.programsAffected}</span></div>
                              <div><span className="text-slate-400">Slip:</span> <span className="font-medium text-red-600">{supplier.avgSlipDays}d</span></div>
                              <div><span className="text-slate-400">At-Risk:</span> <span className="font-medium">{supplier.atRiskLines}</span></div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
        
        {/* Trends & Governance */}
        {activeTab === "governance" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Slip Trend Over Time */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-700">Slip Metrics Trend Over Time</CardTitle>
                  <CardDescription className="text-[10px]">Weekly avg slip days and re-commit count</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart 
                      data={weekDates.map((week, idx) => ({
                        week,
                        avgSlipDays: Math.floor(12 + (seededRandom(idx * 50) - 0.5) * 8),
                        avgReCommits: (1.8 + (seededRandom(idx * 60) - 0.5) * 1).toFixed(1),
                        onTimePercent: Math.floor(72 + (seededRandom(idx * 70) - 0.3) * 15)
                      }))}
                      margin={{ top: 10, right: 30, bottom: 20, left: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="week" tick={{ fontSize: 9 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 9 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} />
                      <RechartsTooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white border border-slate-200 rounded p-2 text-xs shadow">
                                <p className="font-semibold mb-1">{label}</p>
                                {payload.map((p, idx) => (
                                  <p key={idx} style={{ color: p.color }}>{p.name}: {p.value}</p>
                                ))}
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "10px" }} />
                      <Bar yAxisId="left" dataKey="avgSlipDays" fill="#ef4444" name="Avg Slip Days" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="onTimePercent" stroke="#22c55e" name="On-Time %" strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              {/* Supplier-Driven Downstream Impact */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-700">Supplier-Driven Downstream Impact Trend</CardTitle>
                  <CardDescription className="text-[10px]">Weekly shortages and late jobs from supplier slips</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart 
                      data={weekDates.map((week, idx) => ({
                        week,
                        shortages: Math.floor(5 + seededRandom(idx * 80) * 8),
                        lateJobs: Math.floor(3 + seededRandom(idx * 90) * 6),
                        clinsAtRisk: Math.floor(2 + seededRandom(idx * 100) * 4)
                      }))}
                      margin={{ top: 10, right: 20, bottom: 20, left: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="week" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <RechartsTooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white border border-slate-200 rounded p-2 text-xs shadow">
                                <p className="font-semibold mb-1">{label}</p>
                                {payload.map((p, idx) => (
                                  <p key={idx} style={{ color: p.color }}>{p.name}: {p.value}</p>
                                ))}
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "10px" }} />
                      <Line type="monotone" dataKey="shortages" stroke="#ef4444" name="Supplier-Driven Shortages" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="lateJobs" stroke="#f59e0b" name="Supplier-Driven Late Jobs" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="clinsAtRisk" stroke="#8b5cf6" name="CLINs at Risk" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            
            {/* Governance Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">Governance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-4">
                  {[
                    { label: "Suppliers Added to Watchlist", value: 4, trend: "+2 this week" },
                    { label: "PO Lines Escalated", value: 23, trend: "12 resolved" },
                    { label: "Commitments Recovered", value: 18, trend: "vs 31 at-risk" },
                    { label: "Supplier-Driven Misses", value: 7, trend: "↓3 vs last month" },
                    { label: "Top Recurring Fragile Supplier", value: "Honeywell", trend: "4 incidents" }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-slate-500 mb-1">{item.label}</p>
                      <p className="text-xl font-bold text-slate-700">{item.value}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{item.trend}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Closed-Loop Review */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">Closed-Loop Review</CardTitle>
                <CardDescription className="text-[10px]">Was the high-slip trend visible before the incident?</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[200px]">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium text-slate-600">Supplier</th>
                        <th className="text-left p-2 font-medium text-slate-600">PO Line</th>
                        <th className="text-center p-2 font-medium text-slate-600">Trend Visible?</th>
                        <th className="text-center p-2 font-medium text-slate-600">Days Visible</th>
                        <th className="text-left p-2 font-medium text-slate-600">Linked Impact</th>
                        <th className="text-left p-2 font-medium text-slate-600">Action Taken</th>
                        <th className="text-left p-2 font-medium text-slate-600">Outcome</th>
                        <th className="text-left p-2 font-medium text-slate-600">Lesson Learned</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { supplier: "Honeywell", po: "PO-2025001", visible: true, days: 21, impact: "Shortage + Late Job", action: "Expedited", outcome: "Partial recovery", lesson: "Earlier escalation needed" },
                        { supplier: "Collins", po: "PO-2025034", visible: true, days: 14, impact: "CLIN slip", action: "Dual-sourced", outcome: "Recovered", lesson: "Maintain alt supplier" },
                        { supplier: "L3Harris", po: "PO-2025078", visible: false, days: 0, impact: "Late Job", action: "Reactive only", outcome: "Missed", lesson: "Add supplier to watchlist" },
                        { supplier: "BAE Systems", po: "PO-2025102", visible: true, days: 28, impact: "Shortage", action: "Buffered demand", outcome: "Recovered", lesson: "Effective early action" }
                      ].map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-100">
                          <td className="p-2 font-medium">{row.supplier}</td>
                          <td className="p-2">{row.po}</td>
                          <td className="p-2 text-center">
                            <Badge variant={row.visible ? "default" : "destructive"} className="text-[9px]">
                              {row.visible ? "Yes" : "No"}
                            </Badge>
                          </td>
                          <td className="p-2 text-center">{row.days > 0 ? `${row.days}d` : "-"}</td>
                          <td className="p-2">{row.impact}</td>
                          <td className="p-2">{row.action}</td>
                          <td className="p-2">
                            <Badge variant={row.outcome === "Recovered" ? "default" : row.outcome === "Missed" ? "destructive" : "secondary"} className="text-[9px]">
                              {row.outcome}
                            </Badge>
                          </td>
                          <td className="p-2 text-slate-600">{row.lesson}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      
      {/* Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
          {drawerType === "supplier" && selectedItem && "avgSlipDays" in selectedItem && (
            <>
              <SheetHeader>
                <SheetTitle className="text-lg">{(selectedItem as Supplier).name}</SheetTitle>
                <SheetDescription className="text-xs">
                  {(selectedItem as Supplier).code} | {(selectedItem as Supplier).commodity} | {(selectedItem as Supplier).site}
                </SheetDescription>
              </SheetHeader>
              
              <Tabs defaultValue="overview" className="mt-4">
                <TabsList className="grid grid-cols-5 h-8">
                  <TabsTrigger value="overview" className="text-[10px]">Overview</TabsTrigger>
                  <TabsTrigger value="reliability" className="text-[10px]">Reliability</TabsTrigger>
                  <TabsTrigger value="parts" className="text-[10px]">Parts</TabsTrigger>
                  <TabsTrigger value="exposure" className="text-[10px]">Exposure</TabsTrigger>
                  <TabsTrigger value="actions" className="text-[10px]">Actions</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge className={`${getRiskBgColor((selectedItem as Supplier).slipRiskTier)}`}>
                      {(selectedItem as Supplier).slipRiskTier} Risk
                    </Badge>
                    <span className="text-sm font-semibold">Score: {(selectedItem as Supplier).reliabilityScore}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Avg Re-Commit Count", value: (selectedItem as Supplier).avgReCommitCount.toFixed(1) },
                      { label: "Avg Slip Days", value: `${(selectedItem as Supplier).avgSlipDays}d` },
                      { label: "P90 Slip Days", value: `${(selectedItem as Supplier).p90SlipDays}d` },
                      { label: "On-Time %", value: `${(selectedItem as Supplier).onTimePercent}%` },
                      { label: "Open Lines", value: (selectedItem as Supplier).openLines },
                      { label: "At-Risk Lines", value: (selectedItem as Supplier).atRiskLines },
                      { label: "Linked Shortages", value: (selectedItem as Supplier).linkedShortages },
                      { label: "Linked Late Jobs", value: (selectedItem as Supplier).linkedLateJobs },
                      { label: "Programs Affected", value: (selectedItem as Supplier).programsAffected },
                      { label: "CLINs Affected", value: (selectedItem as Supplier).clinsAffected },
                      { label: "Spend", value: formatCurrency((selectedItem as Supplier).spend) }
                    ].map((item, idx) => (
                      <div key={idx} className="bg-slate-50 rounded p-2">
                        <p className="text-[10px] text-slate-500">{item.label}</p>
                        <p className="text-sm font-semibold">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="reliability" className="mt-4 space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold mb-2">Slip Days Trend (12 weeks)</h4>
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={(selectedItem as Supplier).weeklySlipTrend.map((v, i) => ({ week: weekDates[i], value: v }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="week" tick={{ fontSize: 8 }} />
                        <YAxis tick={{ fontSize: 8 }} />
                        <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-semibold mb-2">Re-Commit Count Trend</h4>
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={(selectedItem as Supplier).weeklyReCommitTrend.map((v, i) => ({ week: weekDates[i], value: v }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="week" tick={{ fontSize: 8 }} />
                        <YAxis tick={{ fontSize: 8 }} />
                        <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
                
                <TabsContent value="parts" className="mt-4">
                  <h4 className="text-xs font-semibold mb-2">Top Impacted Parts</h4>
                  <div className="space-y-2">
                    {(selectedItem as Supplier).topParts.map((part, idx) => (
                      <div key={idx} className="bg-slate-50 rounded p-2 flex items-center justify-between">
                        <span className="font-mono text-xs">{part}</span>
                        <Badge variant="outline" className="text-[9px]">View</Badge>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="exposure" className="mt-4">
                  <h4 className="text-xs font-semibold mb-2">Programs Impacted</h4>
                  <div className="space-y-2">
                    {(selectedItem as Supplier).topPrograms.map((program, idx) => (
                      <div key={idx} className="bg-slate-50 rounded p-2">
                        <span className="text-xs font-medium">{program}</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="actions" className="mt-4">
                  <h4 className="text-xs font-semibold mb-2">Recommended Actions</h4>
                  <div className="space-y-2">
                    {(selectedItem as Supplier).slipRiskTier === "Critical" && (
                      <div className="bg-red-50 border border-red-200 rounded p-2">
                        <p className="text-xs font-medium text-red-700">Escalate to Supplier Management</p>
                        <p className="text-[10px] text-red-600">Immediate executive attention required</p>
                      </div>
                    )}
                    {(selectedItem as Supplier).avgReCommitCount > 2 && (
                      <div className="bg-amber-50 border border-amber-200 rounded p-2">
                        <p className="text-xs font-medium text-amber-700">Review Contract Terms</p>
                        <p className="text-[10px] text-amber-600">Consider penalty clauses for re-commits</p>
                      </div>
                    )}
                    {(selectedItem as Supplier).atRiskLines > 5 && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-2">
                        <p className="text-xs font-medium text-blue-700">Evaluate Dual-Source Options</p>
                        <p className="text-[10px] text-blue-600">Reduce single-source dependency</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
          
          {drawerType === "po" && selectedPOLine && (
            <>
              <SheetHeader>
                <SheetTitle className="text-lg">{selectedPOLine.poNumber} - Line {selectedPOLine.lineNumber}</SheetTitle>
                <SheetDescription className="text-xs">
                  {selectedPOLine.partNumber} | {selectedPOLine.supplier}
                </SheetDescription>
              </SheetHeader>
              
              <Tabs defaultValue="overview" className="mt-4">
                <TabsList className="grid grid-cols-5 h-8">
                  <TabsTrigger value="overview" className="text-[10px]">Overview</TabsTrigger>
                  <TabsTrigger value="timeline" className="text-[10px]">Timeline</TabsTrigger>
                  <TabsTrigger value="demand" className="text-[10px]">Demand</TabsTrigger>
                  <TabsTrigger value="impact" className="text-[10px]">Impact</TabsTrigger>
                  <TabsTrigger value="actions" className="text-[10px]">Actions</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge className={`${getRiskBgColor(selectedPOLine.slipRiskTier)}`}>
                      {selectedPOLine.slipRiskTier} Risk
                    </Badge>
                    <Badge variant="outline">{selectedPOLine.status}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Original Promise", value: formatDate(selectedPOLine.originalPromise) },
                      { label: "Current Promise", value: formatDate(selectedPOLine.currentPromise) },
                      { label: "Required By", value: formatDate(selectedPOLine.requiredByDate) },
                      { label: "Re-Commit Count", value: selectedPOLine.reCommitCount },
                      { label: "Total Slip Days", value: `${selectedPOLine.totalSlipDays}d` },
                      { label: "Quantity", value: selectedPOLine.quantity },
                      { label: "Unit Price", value: formatCurrency(selectedPOLine.unitPrice) },
                      { label: "Owner", value: selectedPOLine.owner }
                    ].map((item, idx) => (
                      <div key={idx} className="bg-slate-50 rounded p-2">
                        <p className="text-[10px] text-slate-500">{item.label}</p>
                        <p className="text-sm font-semibold">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="timeline" className="mt-4">
                  <h4 className="text-xs font-semibold mb-3">Commitment Event History</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium">Original Promise</p>
                        <p className="text-[10px] text-slate-500">{formatDate(selectedPOLine.originalPromise)}</p>
                      </div>
                    </div>
                    
                    {selectedPOLine.commitmentHistory.map((event, idx) => (
                      <div key={idx} className="flex items-center gap-3 pb-3 border-b border-slate-100">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                          <RefreshCw className="h-4 w-4 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium">Re-Commit #{event.eventNumber}</p>
                            <Badge variant="outline" className="text-[9px]">+{event.slipDelta}d</Badge>
                          </div>
                          <p className="text-[10px] text-slate-500">
                            {formatDate(event.priorPromise)} → {formatDate(event.revisedPromise)}
                          </p>
                          <p className="text-[10px] text-slate-400">{event.reasonCode}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="demand" className="mt-4">
                  <h4 className="text-xs font-semibold mb-2">Linked Demand</h4>
                  <div className="space-y-2">
                    <div className="bg-slate-50 rounded p-2">
                      <p className="text-[10px] text-slate-500">Jobs Linked</p>
                      <p className="text-sm font-semibold">{selectedPOLine.linkedJobs}</p>
                    </div>
                    <div className="bg-slate-50 rounded p-2">
                      <p className="text-[10px] text-slate-500">CLINs</p>
                      <p className="text-sm font-semibold">{selectedPOLine.linkedClins.join(", ")}</p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="impact" className="mt-4">
                  <div className="space-y-2">
                    <div className={`p-3 rounded-lg ${selectedPOLine.linkedShortage ? "bg-red-50 border border-red-200" : "bg-slate-50"}`}>
                      <div className="flex items-center gap-2">
                        <Package className={`h-4 w-4 ${selectedPOLine.linkedShortage ? "text-red-600" : "text-slate-400"}`} />
                        <span className="text-xs font-medium">Shortage Link</span>
                      </div>
                      <p className="text-[10px] text-slate-600 mt-1">
                        {selectedPOLine.linkedShortage ? "This PO is contributing to an active shortage" : "No active shortage link"}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${selectedPOLine.linkedLateJob ? "bg-orange-50 border border-orange-200" : "bg-slate-50"}`}>
                      <div className="flex items-center gap-2">
                        <Clock className={`h-4 w-4 ${selectedPOLine.linkedLateJob ? "text-orange-600" : "text-slate-400"}`} />
                        <span className="text-xs font-medium">Late Job Link</span>
                      </div>
                      <p className="text-[10px] text-slate-600 mt-1">
                        {selectedPOLine.linkedLateJob ? "This PO is contributing to a late job" : "No late job link"}
                      </p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="actions" className="mt-4">
                  <div className="space-y-2">
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <p className="text-xs font-medium text-blue-700">Recommended: {selectedPOLine.recommendedAction}</p>
                    </div>
                    <Button className="w-full" size="sm">
                      <Zap className="h-3.5 w-3.5 mr-1.5" />
                      Take Action
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
