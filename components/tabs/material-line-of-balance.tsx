"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertTriangle, Calendar, Package, Search, RefreshCw, Download, ChevronRight, TrendingUp, TrendingDown, Layers, BarChart3, Clock, Factory, Truck, Box, AlertCircle, CheckCircle, XCircle, Filter, ArrowUpRight, Minus, Info } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, ComposedChart, Line, ReferenceLine, ReferenceArea, BarChart, Bar } from "recharts"

// ===== TYPES =====
type SupplyBucket = "Inventory" | "WIP" | "Planned Make" | "PRs/POs" | "Supplier Commits"
type RootCause = "Late PO" | "Supplier commit slip" | "Internal WIP delay" | "Quality hold" | "Capacity constraint" | "Allocation issue" | "Long lead item" | "Forecast change"
type ShortageStatus = "Covered" | "Partial" | "Shortage"
type TabId = "program-lob" | "assembly" | "part-level" | "activity-impact"

interface TimeBucket {
  label: string
  weekNum: number
  date: Date
  // Cumulative values (all increasing over time)
  cumulativeDemand: number
  cumulativeInventory: number
  cumulativeWIP: number
  cumulativePlannedMake: number
  cumulativePRsPOs: number
  cumulativeSupplierCommits: number
  cumulativeTotalSupply: number
  // Periodic values
  weeklyDemand: number
  weeklySupply: number
  // Derived
  shortage: number
  isShortageWindow: boolean
  mainDriver: string | null
}

interface Assembly {
  id: string
  name: string
  partFamily: string
  shortageQty: number
  firstShortageWeek: string | null
  recoveryWeek: string | null
  mainDriver: RootCause | null
  impactedPartCount: number
  supplierExposure: string[]
  weeklyStatus: ShortageStatus[]
}

interface PartNumber {
  id: string
  partNumber: string
  description: string
  commodity: string
  supplier: string
  leadTime: number
  moq: number
  isCritical: boolean
  isSoleSource: boolean
  assemblyId: string
  weeklyData: {
    demand: number
    supply: number
    endingStock: number
    shortage: number
  }[]
  shortageStartWeek: string | null
  recoveryWeek: string | null
  rootCause: RootCause | null
}

interface Activity {
  id: string
  workOrder: string
  description: string
  assembly: string
  partNumber: string
  qtyRequired: number
  qtyAvailable: number
  needBy: Date
  expectedDue: Date
  status: ShortageStatus
  impactSeverity: "Low" | "Medium" | "High" | "Critical"
}

interface UpcomingShortage {
  id: string
  partFamily: string
  assembly: string
  shortageQty: number
  shortageWindow: string
  supplier: string
  rootCause: RootCause
  riskScore: number
  recoveryETA: string
}

// ===== CONSTANTS =====
const programs = ["F-35 Lightning II", "CH-53K King Stallion", "AH-64E Apache", "V-22 Osprey"]
const assemblies = ["Fuselage Section", "Wing Assembly", "Avionics Bay", "Landing Gear", "Engine Nacelle", "Cockpit Module", "Tail Section", "Hydraulic System"]
const suppliers = ["Northrop Grumman", "Raytheon", "L3Harris", "BAE Systems", "General Dynamics", "Honeywell", "Collins Aerospace", "Pratt & Whitney"]
const commodities = ["Fasteners", "Electronics", "Composites", "Metals", "Seals"]
const rootCauses: RootCause[] = ["Late PO", "Supplier commit slip", "Internal WIP delay", "Quality hold", "Capacity constraint", "Allocation issue", "Long lead item", "Forecast change"]

const SUPPLY_COLORS = {
  "Inventory": "#22c55e",
  "WIP": "#3b82f6",
  "Planned Make": "#8b5cf6",
  "PRs/POs": "#f59e0b",
  "Supplier Commits": "#ec4899"
}

const TAB_CONFIG: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "program-lob", label: "Program LOB", icon: <BarChart3 className="w-4 h-4" /> },
  { id: "assembly", label: "Assembly / Sub-Assembly", icon: <Layers className="w-4 h-4" /> },
  { id: "part-level", label: "Part-Level Net Availability", icon: <Package className="w-4 h-4" /> },
  { id: "activity-impact", label: "Activity / Work Order Impact", icon: <Factory className="w-4 h-4" /> },
]

// ===== DATA GENERATION =====
function generateWeekLabel(weeksFromNow: number): string {
  const date = new Date()
  date.setDate(date.getDate() + weeksFromNow * 7)
  return `W${String(Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7)).padStart(2, "0")} ${date.toLocaleDateString("en-US", { month: "short" })}`
}

function generateTimeBuckets(weeks: number = 24): TimeBucket[] {
  const buckets: TimeBucket[] = []
  
  // Cumulative counters - all start at 0 and only increase
  let cumulativeDemand = 0
  let cumulativeInventory = 0
  let cumulativeWIP = 0
  let cumulativePlannedMake = 0
  let cumulativePRsPOs = 0
  let cumulativeSupplierCommits = 0
  
  // Initial inventory contribution (one-time at week 0)
  const initialInventory = 600 + Math.floor(Math.random() * 200)
  
  for (let i = 0; i < weeks; i++) {
    const date = new Date()
    date.setDate(date.getDate() + i * 7)
    
    // Weekly demand - relatively steady with some variation
    const weeklyDemand = 80 + Math.floor(Math.random() * 40)
    cumulativeDemand += weeklyDemand
    
    // Supply contributions by source - cumulative (always increasing)
    // Inventory: one-time contribution at start
    const inventoryContrib = i === 0 ? initialInventory : 0
    cumulativeInventory += inventoryContrib
    
    // WIP: steady flow
    const wipContrib = 15 + Math.floor(Math.random() * 20)
    cumulativeWIP += wipContrib
    
    // Planned Make: ramps up
    const plannedMakeContrib = i < 4 ? 10 + Math.floor(Math.random() * 10) : 25 + Math.floor(Math.random() * 20)
    cumulativePlannedMake += plannedMakeContrib
    
    // PRs/POs: starts slow, accelerates
    const prsPOsContrib = i < 6 ? 5 + Math.floor(Math.random() * 10) : 20 + Math.floor(Math.random() * 25)
    cumulativePRsPOs += prsPOsContrib
    
    // Supplier Commits: delayed start, then ramps
    const supplierCommitsContrib = i < 10 ? 0 : 15 + Math.floor(Math.random() * 20)
    cumulativeSupplierCommits += supplierCommitsContrib
    
    const cumulativeTotalSupply = cumulativeInventory + cumulativeWIP + cumulativePlannedMake + cumulativePRsPOs + cumulativeSupplierCommits
    const weeklySupply = inventoryContrib + wipContrib + plannedMakeContrib + prsPOsContrib + supplierCommitsContrib
    
    // Shortage = demand exceeds supply
    const shortage = Math.max(0, cumulativeDemand - cumulativeTotalSupply)
    const isShortageWindow = shortage > 0
    
    // Determine main driver for shortage
    let mainDriver: string | null = null
    if (isShortageWindow) {
      if (i < 6) mainDriver = "Inventory depletion"
      else if (i < 10) mainDriver = "WIP delay"
      else if (supplierCommitsContrib === 0) mainDriver = "Supplier commits pending"
      else mainDriver = "Demand spike"
    }
    
    buckets.push({
      label: generateWeekLabel(i),
      weekNum: i,
      date,
      cumulativeDemand,
      cumulativeInventory,
      cumulativeWIP,
      cumulativePlannedMake,
      cumulativePRsPOs,
      cumulativeSupplierCommits,
      cumulativeTotalSupply,
      weeklyDemand,
      weeklySupply,
      shortage,
      isShortageWindow,
      mainDriver
    })
  }
  
  return buckets
}

function generateAssemblies(): Assembly[] {
  return assemblies.map((name, i) => {
    const hasShortage = i < 5
    const shortageStart = hasShortage ? 6 + i : null
    const recoveryWeekNum = hasShortage ? 12 + i : null
    return {
      id: `asm-${i}`,
      name,
      partFamily: ["Structural", "Electrical", "Hydraulic", "Avionics"][i % 4],
      shortageQty: hasShortage ? 10 + Math.floor(Math.random() * 50) : 0,
      firstShortageWeek: shortageStart !== null ? generateWeekLabel(shortageStart) : null,
      recoveryWeek: recoveryWeekNum !== null ? generateWeekLabel(recoveryWeekNum) : null,
      mainDriver: hasShortage ? rootCauses[i % rootCauses.length] : null,
      impactedPartCount: hasShortage ? 2 + Math.floor(Math.random() * 8) : 0,
      supplierExposure: [suppliers[i % suppliers.length], suppliers[(i + 1) % suppliers.length]],
      weeklyStatus: Array.from({ length: 16 }, (_, w) => {
        if (!hasShortage) return "Covered"
        if (w >= 6 + i && w <= 10 + i) return "Shortage"
        if (w >= 4 + i && w <= 12 + i) return "Partial"
        return "Covered"
      })
    }
  })
}

function generatePartNumbers(assemblyList: Assembly[]): PartNumber[] {
  const parts: PartNumber[] = []
  
  assemblyList.forEach((asm, asmIdx) => {
    const partCount = 3 + Math.floor(Math.random() * 5)
    for (let p = 0; p < partCount; p++) {
      const hasShortage = asm.shortageQty > 0 && p < 3
      const shortageStartWeekNum = hasShortage ? 6 + asmIdx + p : null
      
      const weeklyData: PartNumber["weeklyData"] = []
      let runningStock = 20
      
      for (let w = 0; w < 16; w++) {
        const demand = 5 + Math.floor(Math.random() * 15)
        const isInShortageWindow = hasShortage && shortageStartWeekNum !== null && w >= shortageStartWeekNum && w <= shortageStartWeekNum + 4
        const supplyBase = isInShortageWindow ? demand * 0.6 : demand * 1.1
        const supply = Math.floor(supplyBase + Math.random() * 5)
        runningStock = runningStock + supply - demand
        weeklyData.push({
          demand,
          supply,
          endingStock: runningStock,
          shortage: Math.max(0, -runningStock)
        })
      }
      
      parts.push({
        id: `pn-${asmIdx}-${p}`,
        partNumber: `PN-${1000 + asmIdx * 100 + p}`,
        description: `${asm.name} Component ${p + 1}`,
        commodity: commodities[p % commodities.length],
        supplier: suppliers[(asmIdx + p) % suppliers.length],
        leadTime: 14 + Math.floor(Math.random() * 60),
        moq: [1, 10, 25, 50, 100][p % 5],
        isCritical: p === 0 && hasShortage,
        isSoleSource: p % 3 === 0,
        assemblyId: asm.id,
        weeklyData,
        shortageStartWeek: shortageStartWeekNum !== null ? generateWeekLabel(shortageStartWeekNum) : null,
        recoveryWeek: shortageStartWeekNum !== null ? generateWeekLabel(shortageStartWeekNum + 5) : null,
        rootCause: hasShortage ? rootCauses[(asmIdx + p) % rootCauses.length] : null
      })
    }
  })
  
  return parts
}

function generateActivities(parts: PartNumber[], assemblyList: Assembly[]): Activity[] {
  const activities: Activity[] = []
  
  parts.slice(0, 20).forEach((part, i) => {
    const hasShortage = part.shortageStartWeek !== null
    const needBy = new Date()
    needBy.setDate(needBy.getDate() + 14 + i * 3)
    const expectedDue = new Date(needBy)
    expectedDue.setDate(expectedDue.getDate() + (hasShortage ? 7 + Math.floor(Math.random() * 14) : -2))
    
    const assembly = assemblyList.find((_, idx) => part.assemblyId === `asm-${idx}`)
    
    activities.push({
      id: `act-${i}`,
      workOrder: `WO-${2024}${String(i + 1).padStart(4, "0")}`,
      description: `${part.description} Installation`,
      assembly: assembly?.name || "Unknown",
      partNumber: part.partNumber,
      qtyRequired: 5 + Math.floor(Math.random() * 20),
      qtyAvailable: hasShortage ? Math.floor(5 + Math.random() * 10) : 5 + Math.floor(Math.random() * 25),
      needBy,
      expectedDue,
      status: hasShortage ? (Math.random() > 0.5 ? "Shortage" : "Partial") : "Covered",
      impactSeverity: hasShortage ? (["High", "Critical"] as const)[Math.floor(Math.random() * 2)] : (["Low", "Medium"] as const)[Math.floor(Math.random() * 2)]
    })
  })
  
  return activities.sort((a, b) => a.needBy.getTime() - b.needBy.getTime())
}

function generateUpcomingShortages(assemblyList: Assembly[]): UpcomingShortage[] {
  return assemblyList
    .filter(a => a.shortageQty > 0)
    .map((a, i) => ({
      id: `short-${i}`,
      partFamily: a.partFamily,
      assembly: a.name,
      shortageQty: a.shortageQty,
      shortageWindow: `${a.firstShortageWeek} – ${a.recoveryWeek}`,
      supplier: a.supplierExposure[0],
      rootCause: a.mainDriver!,
      riskScore: 60 + Math.floor(Math.random() * 40),
      recoveryETA: a.recoveryWeek!
    }))
}

// ===== MAIN COMPONENT =====
export function MaterialLineOfBalance() {
  // Navigation state
  const [activeTab, setActiveTab] = useState<TabId>("program-lob")
  
  // Global filter state
  const [selectedProgram, setSelectedProgram] = useState(programs[0])
  const [supplierFilter, setSupplierFilter] = useState("All")
  const [commodityFilter, setCommodityFilter] = useState("All")
  const [timeWindow, setTimeWindow] = useState("24")
  
  // View state
  const [selectedAssembly, setSelectedAssembly] = useState<string | null>(null)
  const [selectedPart, setSelectedPart] = useState<PartNumber | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  
  // Generate mock data
  const timeBuckets = useMemo(() => generateTimeBuckets(parseInt(timeWindow)), [timeWindow])
  const assemblyList = useMemo(() => generateAssemblies(), [])
  const partNumbers = useMemo(() => generatePartNumbers(assemblyList), [assemblyList])
  const activities = useMemo(() => generateActivities(partNumbers, assemblyList), [partNumbers, assemblyList])
  const upcomingShortages = useMemo(() => generateUpcomingShortages(assemblyList), [assemblyList])
  
  // Apply global filters to data
  const filteredShortages = useMemo(() => {
    let filtered = upcomingShortages
    if (supplierFilter !== "All") {
      filtered = filtered.filter(s => s.supplier === supplierFilter)
    }
    if (commodityFilter !== "All") {
      filtered = filtered.filter(s => {
        const asm = assemblyList.find(a => a.name === s.assembly)
        return asm?.partFamily === commodityFilter
      })
    }
    return filtered
  }, [upcomingShortages, supplierFilter, commodityFilter, assemblyList])
  
  const filteredParts = useMemo(() => {
    let filtered = partNumbers
    if (selectedAssembly) {
      filtered = filtered.filter(p => p.assemblyId === selectedAssembly)
    }
    if (supplierFilter !== "All") {
      filtered = filtered.filter(p => p.supplier === supplierFilter)
    }
    if (commodityFilter !== "All") {
      filtered = filtered.filter(p => p.commodity === commodityFilter)
    }
    return filtered
  }, [partNumbers, selectedAssembly, supplierFilter, commodityFilter])
  
  const filteredActivities = useMemo(() => {
    let filtered = activities
    if (selectedPart) {
      filtered = filtered.filter(a => a.partNumber === selectedPart.partNumber)
    } else if (selectedAssembly) {
      const asm = assemblyList.find(a => a.id === selectedAssembly)
      if (asm) filtered = filtered.filter(a => a.assembly === asm.name)
    }
    if (supplierFilter !== "All") {
      const supplierParts = partNumbers.filter(p => p.supplier === supplierFilter).map(p => p.partNumber)
      filtered = filtered.filter(a => supplierParts.includes(a.partNumber))
    }
    return filtered
  }, [activities, selectedPart, selectedAssembly, assemblyList, supplierFilter, partNumbers])
  
  // Computed KPIs - based on filtered data
  const kpis = useMemo(() => {
    const shortagesInScope = filteredShortages
    const totalShortage = shortagesInScope.reduce((sum, s) => sum + s.shortageQty, 0)
    const peakShortage = Math.max(...timeBuckets.map(b => b.shortage), 0)
    const totalDemand = timeBuckets[timeBuckets.length - 1]?.cumulativeDemand || 1
    const totalSupply = timeBuckets[timeBuckets.length - 1]?.cumulativeTotalSupply || 0
    const coveragePercent = Math.min(100, Math.round((totalSupply / totalDemand) * 100))
    const shortageWindows = timeBuckets.filter(b => b.isShortageWindow).length
    const firstShortageWeek = timeBuckets.find(b => b.isShortageWindow)?.label || "—"
    const lastShortageIdx = timeBuckets.map((b, i) => b.isShortageWindow ? i : -1).filter(i => i >= 0).pop()
    const recoveryWeek = lastShortageIdx !== undefined && lastShortageIdx < timeBuckets.length - 1 ? timeBuckets[lastShortageIdx + 1]?.label || "—" : "—"
    const criticalParts = filteredParts.filter(p => p.isCritical).length
    const atRiskAssemblies = assemblyList.filter(a => a.shortageQty > 0).length
    
    return {
      totalShortage,
      peakShortage: Math.round(peakShortage),
      coveragePercent,
      shortageWindows,
      firstShortageWeek,
      recoveryWeek,
      criticalParts,
      atRiskAssemblies
    }
  }, [timeBuckets, filteredShortages, filteredParts, assemblyList])
  
  // Handlers
  const handlePartClick = (part: PartNumber) => {
    setSelectedPart(part)
    setDrawerOpen(true)
  }
  
  const handleAssemblyClick = (assemblyId: string) => {
    setSelectedAssembly(assemblyId)
    setActiveTab("part-level")
  }
  
  // Week labels for headers
  const weekLabels = useMemo(() => timeBuckets.slice(0, 16).map(b => b.label), [timeBuckets])
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Material Line of Balance</h1>
          <p className="text-sm text-gray-500 mt-1">Cumulative demand vs supply visibility across the planning horizon</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      {/* Global Filters */}
      <Card className="border border-gray-200">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>
            
            <Select value={selectedProgram} onValueChange={setSelectedProgram}>
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="Program" />
              </SelectTrigger>
              <SelectContent>
                {programs.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Suppliers</SelectItem>
                {suppliers.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={commodityFilter} onValueChange={setCommodityFilter}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Commodity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Commodities</SelectItem>
                {commodities.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={timeWindow} onValueChange={setTimeWindow}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Time Window" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12 Weeks</SelectItem>
                <SelectItem value="24">24 Weeks</SelectItem>
                <SelectItem value="52">52 Weeks</SelectItem>
              </SelectContent>
            </Select>
            
            {(supplierFilter !== "All" || commodityFilter !== "All") && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { setSupplierFilter("All"); setCommodityFilter("All") }}
                className="text-red-600 hover:text-red-700"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {TAB_CONFIG.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.id
                  ? "text-blue-600 border-blue-600 bg-blue-50/50"
                  : "text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      
      {/* Tab Content */}
      {activeTab === "program-lob" && (
        <ProgramLOBTab 
          kpis={kpis}
          timeBuckets={timeBuckets}
          upcomingShortages={filteredShortages}
          selectedWeek={selectedWeek}
          setSelectedWeek={setSelectedWeek}
          supplierFilter={supplierFilter}
          commodityFilter={commodityFilter}
        />
      )}
      
      {activeTab === "assembly" && (
        <AssemblyTab 
          assemblies={assemblyList}
          weekLabels={weekLabels}
          onAssemblyClick={handleAssemblyClick}
          supplierFilter={supplierFilter}
          commodityFilter={commodityFilter}
        />
      )}
      
      {activeTab === "part-level" && (
        <PartLevelTab 
          parts={filteredParts}
          weekLabels={weekLabels}
          selectedAssembly={selectedAssembly}
          assemblies={assemblyList}
          onPartClick={handlePartClick}
          onClearAssembly={() => setSelectedAssembly(null)}
        />
      )}
      
      {activeTab === "activity-impact" && (
        <ActivityImpactTab 
          activities={filteredActivities}
          onPartClick={(partNumber) => {
            const part = partNumbers.find(p => p.partNumber === partNumber)
            if (part) handlePartClick(part)
          }}
        />
      )}
      
      {/* Part Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
          {selectedPart && (
            <PartDetailDrawer 
              part={selectedPart}
              weekLabels={weekLabels}
              activities={activities.filter(a => a.partNumber === selectedPart.partNumber)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ===== PROGRAM LOB TAB =====
function ProgramLOBTab({
  kpis,
  timeBuckets,
  upcomingShortages,
  selectedWeek,
  setSelectedWeek,
  supplierFilter,
  commodityFilter
}: {
  kpis: ReturnType<typeof MaterialLineOfBalance extends () => infer R ? never : never> extends never ? {
    totalShortage: number
    peakShortage: number
    coveragePercent: number
    shortageWindows: number
    firstShortageWeek: string
    recoveryWeek: string
    criticalParts: number
    atRiskAssemblies: number
  } : never
  timeBuckets: TimeBucket[]
  upcomingShortages: UpcomingShortage[]
  selectedWeek: number | null
  setSelectedWeek: (week: number | null) => void
  supplierFilter: string
  commodityFilter: string
}) {
  // Find today marker position
  const todayIndex = 0
  
  // Find shortage window boundaries for highlighting
  const shortageStart = timeBuckets.findIndex(b => b.isShortageWindow)
  const shortageEnd = timeBuckets.map((b, i) => b.isShortageWindow ? i : -1).filter(i => i >= 0).pop() ?? -1
  
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Shortage</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{kpis.totalShortage.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Peak Shortage</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">{kpis.peakShortage.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Demand Covered</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{kpis.coveragePercent}%</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Shortage Weeks</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{kpis.shortageWindows}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">First Shortage</p>
            <p className="text-lg font-bold text-blue-600 mt-1">{kpis.firstShortageWeek}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Recovery Week</p>
            <p className="text-lg font-bold text-emerald-600 mt-1">{kpis.recoveryWeek}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Critical Parts</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{kpis.criticalParts}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-rose-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">At-Risk Assemblies</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{kpis.atRiskAssemblies}</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Filter status indicator */}
      {(supplierFilter !== "All" || commodityFilter !== "All") && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-blue-800">
            Showing filtered view: {supplierFilter !== "All" && `Supplier: ${supplierFilter}`}
            {supplierFilter !== "All" && commodityFilter !== "All" && " | "}
            {commodityFilter !== "All" && `Commodity: ${commodityFilter}`}
          </span>
        </div>
      )}
      
      {/* True Cumulative LOB Chart */}
      <Card className="border-2 border-gray-300">
        <CardHeader className="py-4 px-5 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">Cumulative Demand vs Cumulative Supply</CardTitle>
              <p className="text-sm text-gray-500 mt-0.5">
                All curves increase over time. Shortage window (red shading) = cumulative demand exceeds cumulative supply.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-gray-900" style={{ height: 3 }} /> Cumulative Demand
              </span>
              {Object.entries(SUPPLY_COLORS).map(([key, color]) => (
                <span key={key} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} /> {key}
                </span>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timeBuckets} margin={{ left: 20, right: 20, top: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                
                {/* Shortage window shading */}
                {shortageStart >= 0 && shortageEnd >= 0 && (
                  <ReferenceArea
                    x1={timeBuckets[shortageStart]?.label}
                    x2={timeBuckets[shortageEnd]?.label}
                    fill="#fecaca"
                    fillOpacity={0.4}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                  />
                )}
                
                {/* Today marker */}
                <ReferenceLine
                  x={timeBuckets[todayIndex]?.label}
                  stroke="#1d4ed8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  label={{ value: "Today", position: "top", fill: "#1d4ed8", fontSize: 11 }}
                />
                
                <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                <YAxis 
                  tick={{ fontSize: 11 }} 
                  label={{ value: 'Cumulative Quantity', angle: -90, position: 'insideLeft', fontSize: 12 }}
                  tickFormatter={(v) => v.toLocaleString()}
                />
                
                <Tooltip content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as TimeBucket
                    return (
                      <div className="bg-white p-4 border border-gray-300 rounded-lg shadow-lg text-sm max-w-sm">
                        <p className="font-bold text-gray-900 mb-2">{label}</p>
                        <div className="space-y-1.5">
                          <p className="flex justify-between">
                            <span className="text-gray-600">Cumulative Demand:</span>
                            <span className="font-bold text-gray-900">{data.cumulativeDemand.toLocaleString()}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-gray-600">Cumulative Supply:</span>
                            <span className="font-bold text-green-600">{data.cumulativeTotalSupply.toLocaleString()}</span>
                          </p>
                          <hr className="my-2" />
                          <p className="text-xs text-gray-500 font-medium mb-1">Supply by Source:</p>
                          <p className="flex justify-between text-xs">
                            <span style={{ color: SUPPLY_COLORS["Inventory"] }}>Inventory:</span>
                            <span>{data.cumulativeInventory.toLocaleString()}</span>
                          </p>
                          <p className="flex justify-between text-xs">
                            <span style={{ color: SUPPLY_COLORS["WIP"] }}>WIP:</span>
                            <span>{data.cumulativeWIP.toLocaleString()}</span>
                          </p>
                          <p className="flex justify-between text-xs">
                            <span style={{ color: SUPPLY_COLORS["Planned Make"] }}>Planned Make:</span>
                            <span>{data.cumulativePlannedMake.toLocaleString()}</span>
                          </p>
                          <p className="flex justify-between text-xs">
                            <span style={{ color: SUPPLY_COLORS["PRs/POs"] }}>PRs/POs:</span>
                            <span>{data.cumulativePRsPOs.toLocaleString()}</span>
                          </p>
                          <p className="flex justify-between text-xs">
                            <span style={{ color: SUPPLY_COLORS["Supplier Commits"] }}>Supplier Commits:</span>
                            <span>{data.cumulativeSupplierCommits.toLocaleString()}</span>
                          </p>
                          <hr className="my-2" />
                          {data.isShortageWindow ? (
                            <>
                              <p className="flex justify-between text-red-600 font-bold">
                                <span>Shortage:</span>
                                <span>{data.shortage.toLocaleString()}</span>
                              </p>
                              {data.mainDriver && (
                                <p className="text-xs text-red-500">Driver: {data.mainDriver}</p>
                              )}
                            </>
                          ) : (
                            <p className="text-green-600 font-medium">No shortage</p>
                          )}
                        </div>
                      </div>
                    )
                  }
                  return null
                }} />
                
                {/* Stacked cumulative supply areas */}
                <Area 
                  type="monotone" 
                  dataKey="cumulativeInventory" 
                  stackId="supply"
                  fill={SUPPLY_COLORS["Inventory"]} 
                  stroke={SUPPLY_COLORS["Inventory"]}
                  fillOpacity={0.7}
                  name="Inventory"
                />
                <Area 
                  type="monotone" 
                  dataKey="cumulativeWIP" 
                  stackId="supply"
                  fill={SUPPLY_COLORS["WIP"]} 
                  stroke={SUPPLY_COLORS["WIP"]}
                  fillOpacity={0.7}
                  name="WIP"
                />
                <Area 
                  type="monotone" 
                  dataKey="cumulativePlannedMake" 
                  stackId="supply"
                  fill={SUPPLY_COLORS["Planned Make"]} 
                  stroke={SUPPLY_COLORS["Planned Make"]}
                  fillOpacity={0.7}
                  name="Planned Make"
                />
                <Area 
                  type="monotone" 
                  dataKey="cumulativePRsPOs" 
                  stackId="supply"
                  fill={SUPPLY_COLORS["PRs/POs"]} 
                  stroke={SUPPLY_COLORS["PRs/POs"]}
                  fillOpacity={0.7}
                  name="PRs/POs"
                />
                <Area 
                  type="monotone" 
                  dataKey="cumulativeSupplierCommits" 
                  stackId="supply"
                  fill={SUPPLY_COLORS["Supplier Commits"]} 
                  stroke={SUPPLY_COLORS["Supplier Commits"]}
                  fillOpacity={0.7}
                  name="Supplier Commits"
                />
                
                {/* Cumulative demand line on top */}
                <Line 
                  type="monotone" 
                  dataKey="cumulativeDemand" 
                  stroke="#111827" 
                  strokeWidth={3}
                  dot={false}
                  name="Cumulative Demand"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      {/* Upcoming Shortages Table */}
      <Card className="border-2 border-gray-300">
        <CardHeader className="py-4 px-5 border-b border-gray-200 bg-gray-50">
          <CardTitle className="text-lg font-bold text-gray-900">Upcoming Shortages</CardTitle>
          <p className="text-sm text-gray-500">Parts and assemblies with projected shortages in the planning window</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr className="border-b border-gray-200">
                  <th className="text-left p-3 text-xs font-bold text-gray-700">Part Family</th>
                  <th className="text-left p-3 text-xs font-bold text-gray-700">Assembly</th>
                  <th className="text-right p-3 text-xs font-bold text-gray-700">Shortage Qty</th>
                  <th className="text-left p-3 text-xs font-bold text-gray-700">Shortage Window</th>
                  <th className="text-left p-3 text-xs font-bold text-gray-700">Supplier</th>
                  <th className="text-left p-3 text-xs font-bold text-gray-700">Root Cause</th>
                  <th className="text-center p-3 text-xs font-bold text-gray-700">Risk Score</th>
                  <th className="text-left p-3 text-xs font-bold text-gray-700">Recovery ETA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {upcomingShortages.map(shortage => (
                  <tr key={shortage.id} className="hover:bg-blue-50 transition-colors">
                    <td className="p-3 text-sm font-medium text-gray-900">{shortage.partFamily}</td>
                    <td className="p-3 text-sm text-gray-700">{shortage.assembly}</td>
                    <td className="p-3 text-sm text-right font-bold text-red-600">{shortage.shortageQty}</td>
                    <td className="p-3 text-sm text-gray-600">{shortage.shortageWindow}</td>
                    <td className="p-3 text-sm text-gray-600">{shortage.supplier}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-300">
                        {shortage.rootCause}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Badge className={`text-xs ${
                        shortage.riskScore >= 80 ? "bg-red-600 text-white" :
                        shortage.riskScore >= 60 ? "bg-orange-500 text-white" :
                        "bg-yellow-500 text-white"
                      }`}>
                        {shortage.riskScore}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm font-medium text-emerald-600">{shortage.recoveryETA}</td>
                  </tr>
                ))}
                {upcomingShortages.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400">
                      No shortages projected for current filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* Summary Panel */}
      <Card className="border border-blue-200 bg-blue-50">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">LOB Summary</h3>
              <p className="text-sm text-gray-700 mt-1">
                {kpis.shortageWindows > 0 ? (
                  <>
                    Program shows <span className="font-bold text-red-600">{kpis.shortageWindows} weeks</span> of projected shortage 
                    starting <span className="font-bold">{kpis.firstShortageWeek}</span> with recovery expected by{" "}
                    <span className="font-bold text-emerald-600">{kpis.recoveryWeek}</span>. 
                    Peak shortage of <span className="font-bold text-orange-600">{kpis.peakShortage.toLocaleString()} units</span> impacts{" "}
                    <span className="font-bold">{kpis.atRiskAssemblies} assemblies</span> and{" "}
                    <span className="font-bold">{kpis.criticalParts} critical parts</span>.
                  </>
                ) : (
                  <>
                    No material shortages projected for the selected program and filters. 
                    Demand coverage is at <span className="font-bold text-green-600">{kpis.coveragePercent}%</span>.
                  </>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ===== ASSEMBLY TAB =====
function AssemblyTab({
  assemblies,
  weekLabels,
  onAssemblyClick,
  supplierFilter,
  commodityFilter
}: {
  assemblies: Assembly[]
  weekLabels: string[]
  onAssemblyClick: (assemblyId: string) => void
  supplierFilter: string
  commodityFilter: string
}) {
  const statusColors: Record<ShortageStatus, string> = {
    "Covered": "bg-green-500",
    "Partial": "bg-yellow-400",
    "Shortage": "bg-red-500"
  }
  
  // Filter assemblies if commodity filter is set
  const filteredAssemblies = useMemo(() => {
    if (commodityFilter === "All") return assemblies
    return assemblies.filter(a => a.partFamily === commodityFilter)
  }, [assemblies, commodityFilter])
  
  return (
    <div className="space-y-6">
      {/* Assembly Table */}
      <Card className="border-2 border-gray-300">
        <CardHeader className="py-4 px-5 border-b border-gray-200 bg-gray-50">
          <CardTitle className="text-lg font-bold text-gray-900">Assembly / Sub-Assembly Status</CardTitle>
          <p className="text-sm text-gray-500">Click a row to drill down to part-level view</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr className="border-b border-gray-200">
                  <th className="text-left p-3 text-xs font-bold text-gray-700">Assembly</th>
                  <th className="text-left p-3 text-xs font-bold text-gray-700">Part Family</th>
                  <th className="text-right p-3 text-xs font-bold text-gray-700">Shortage Qty</th>
                  <th className="text-left p-3 text-xs font-bold text-gray-700">First Short</th>
                  <th className="text-left p-3 text-xs font-bold text-gray-700">Recovery</th>
                  <th className="text-left p-3 text-xs font-bold text-gray-700">Driver</th>
                  <th className="text-center p-3 text-xs font-bold text-gray-700">Parts</th>
                  <th className="text-left p-3 text-xs font-bold text-gray-700">Suppliers</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAssemblies.map(asm => (
                  <tr 
                    key={asm.id} 
                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => onAssemblyClick(asm.id)}
                  >
                    <td className="p-3 text-sm font-medium text-gray-900">{asm.name}</td>
                    <td className="p-3 text-sm text-gray-600">{asm.partFamily}</td>
                    <td className={`p-3 text-sm text-right font-bold ${asm.shortageQty > 0 ? "text-red-600" : "text-green-600"}`}>
                      {asm.shortageQty > 0 ? asm.shortageQty : "—"}
                    </td>
                    <td className="p-3 text-sm text-gray-600">{asm.firstShortageWeek || "—"}</td>
                    <td className="p-3 text-sm text-emerald-600 font-medium">{asm.recoveryWeek || "—"}</td>
                    <td className="p-3">
                      {asm.mainDriver ? (
                        <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-300">
                          {asm.mainDriver}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-3 text-sm text-center font-medium text-gray-700">{asm.impactedPartCount || "—"}</td>
                    <td className="p-3 text-xs text-gray-500 max-w-[150px] truncate" title={asm.supplierExposure.join(", ")}>
                      {asm.supplierExposure.slice(0, 2).join(", ")}
                    </td>
                    <td className="p-3">
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* Weekly Status Heatmap */}
      <Card className="border-2 border-gray-300">
        <CardHeader className="py-4 px-5 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">Weekly Status Heatmap</CardTitle>
              <p className="text-sm text-gray-500">Coverage status by assembly across planning weeks</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-green-500" /> Covered
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-yellow-400" /> Partial
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-red-500" /> Shortage
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left p-2 text-xs font-bold text-gray-700 sticky left-0 bg-white min-w-[180px]">Assembly</th>
                  {weekLabels.map((week, i) => (
                    <th key={i} className="p-2 text-xs font-medium text-gray-500 text-center min-w-[50px]">
                      {week.split(" ")[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAssemblies.map(asm => (
                  <tr 
                    key={asm.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => onAssemblyClick(asm.id)}
                  >
                    <td className="p-2 text-sm font-medium text-gray-800 sticky left-0 bg-white">{asm.name}</td>
                    {asm.weeklyStatus.map((status, i) => (
                      <td key={i} className="p-1 text-center">
                        <div 
                          className={`w-6 h-6 rounded-sm mx-auto ${statusColors[status]}`}
                          title={`${asm.name} - ${weekLabels[i]}: ${status}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ===== PART-LEVEL TAB =====
function PartLevelTab({
  parts,
  weekLabels,
  selectedAssembly,
  assemblies,
  onPartClick,
  onClearAssembly
}: {
  parts: PartNumber[]
  weekLabels: string[]
  selectedAssembly: string | null
  assemblies: Assembly[]
  onPartClick: (part: PartNumber) => void
  onClearAssembly: () => void
}) {
  const selectedAssemblyName = selectedAssembly 
    ? assemblies.find(a => a.id === selectedAssembly)?.name 
    : null
  
  return (
    <div className="space-y-6">
      {/* Assembly filter indicator */}
      {selectedAssemblyName && (
        <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-800">
              Filtered to assembly: <span className="font-bold">{selectedAssemblyName}</span>
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClearAssembly} className="text-blue-600 hover:text-blue-700">
            Clear Filter
          </Button>
        </div>
      )}
      
      {/* Part-Level Netting Table */}
      <Card className="border-2 border-gray-300">
        <CardHeader className="py-4 px-5 border-b border-gray-200 bg-gray-50">
          <CardTitle className="text-lg font-bold text-gray-900">Part-Level Net Availability</CardTitle>
          <p className="text-sm text-gray-500">Weekly demand, supply, and ending stock by part. Click row for details.</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-100 z-10">
                <tr className="border-b border-gray-200">
                  <th className="text-left p-3 text-xs font-bold text-gray-700 sticky left-0 bg-gray-100 min-w-[120px] z-20">Part Number</th>
                  <th className="text-left p-3 text-xs font-bold text-gray-700 sticky left-[120px] bg-gray-100 min-w-[80px] z-20">Type</th>
                  {weekLabels.map((week, i) => (
                    <th key={i} colSpan={3} className="p-2 text-xs font-medium text-gray-600 text-center border-l border-gray-200 min-w-[150px]">
                      {week}
                    </th>
                  ))}
                </tr>
                <tr className="border-b border-gray-300">
                  <th className="p-2 sticky left-0 bg-gray-100 z-20"></th>
                  <th className="p-2 sticky left-[120px] bg-gray-100 z-20"></th>
                  {weekLabels.map((_, i) => (
                    <React.Fragment key={i}>
                      <th className="p-1 text-[10px] text-gray-500 text-center border-l border-gray-200">Dem</th>
                      <th className="p-1 text-[10px] text-gray-500 text-center">Sup</th>
                      <th className="p-1 text-[10px] text-gray-500 text-center">End</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {parts.slice(0, 30).map(part => (
                  <tr 
                    key={part.id} 
                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => onPartClick(part)}
                  >
                    <td className="p-2 sticky left-0 bg-white z-10">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-mono font-medium text-gray-900">{part.partNumber}</span>
                        {part.isCritical && (
                          <AlertTriangle className="w-3 h-3 text-red-500" />
                        )}
                      </div>
                    </td>
                    <td className="p-2 sticky left-[120px] bg-white z-10">
                      <div className="flex gap-1">
                        {part.isSoleSource && (
                          <Badge className="text-[9px] bg-purple-100 text-purple-700 border-purple-300">SS</Badge>
                        )}
                        {part.isCritical && (
                          <Badge className="text-[9px] bg-red-100 text-red-700 border-red-300">Crit</Badge>
                        )}
                      </div>
                    </td>
                    {part.weeklyData.slice(0, weekLabels.length).map((wd, i) => (
                      <React.Fragment key={i}>
                        <td className="p-1 text-xs text-center text-gray-600 border-l border-gray-100">{wd.demand}</td>
                        <td className="p-1 text-xs text-center text-gray-600">{wd.supply}</td>
                        <td className={`p-1 text-xs text-center font-medium ${
                          wd.endingStock < 0 ? "bg-red-100 text-red-700" :
                          wd.endingStock === 0 ? "bg-yellow-100 text-yellow-700" :
                          wd.endingStock < 5 ? "bg-orange-50 text-orange-700" :
                          "text-green-700"
                        }`}>
                          {wd.endingStock}
                        </td>
                      </React.Fragment>
                    ))}
                  </tr>
                ))}
                {parts.length === 0 && (
                  <tr>
                    <td colSpan={2 + weekLabels.length * 3} className="p-8 text-center text-gray-400">
                      No parts match current filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ===== ACTIVITY IMPACT TAB =====
function ActivityImpactTab({
  activities,
  onPartClick
}: {
  activities: Activity[]
  onPartClick: (partNumber: string) => void
}) {
  const severityColors: Record<Activity["impactSeverity"], string> = {
    "Low": "bg-green-100 text-green-700 border-green-300",
    "Medium": "bg-yellow-100 text-yellow-700 border-yellow-300",
    "High": "bg-orange-100 text-orange-700 border-orange-300",
    "Critical": "bg-red-100 text-red-700 border-red-300"
  }
  
  const statusColors: Record<ShortageStatus, string> = {
    "Covered": "bg-green-100 text-green-700 border-green-300",
    "Partial": "bg-yellow-100 text-yellow-700 border-yellow-300",
    "Shortage": "bg-red-100 text-red-700 border-red-300"
  }
  
  return (
    <div className="space-y-6">
      {/* Activity Impact Table */}
      <Card className="border-2 border-gray-300">
        <CardHeader className="py-4 px-5 border-b border-gray-200 bg-gray-50">
          <CardTitle className="text-lg font-bold text-gray-900">Work Order / Activity Impact</CardTitle>
          <p className="text-sm text-gray-500">Activities at risk due to material shortages. Click part number for details.</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr className="border-b border-gray-200">
                  <th className="text-left p-3 text-xs font-bold text-gray-700">Work Order</th>
                  <th className="text-left p-3 text-xs font-bold text-gray-700">Description</th>
                  <th className="text-left p-3 text-xs font-bold text-gray-700">Assembly</th>
                  <th className="text-left p-3 text-xs font-bold text-gray-700">Part Number</th>
                  <th className="text-right p-3 text-xs font-bold text-gray-700">Qty Req</th>
                  <th className="text-right p-3 text-xs font-bold text-gray-700">Qty Avail</th>
                  <th className="text-left p-3 text-xs font-bold text-gray-700">Need By</th>
                  <th className="text-left p-3 text-xs font-bold text-gray-700">Expected Due</th>
                  <th className="text-center p-3 text-xs font-bold text-gray-700">Status</th>
                  <th className="text-center p-3 text-xs font-bold text-gray-700">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activities.map(activity => {
                  const isLate = activity.expectedDue > activity.needBy
                  const daysLate = isLate ? Math.ceil((activity.expectedDue.getTime() - activity.needBy.getTime()) / (1000 * 60 * 60 * 24)) : 0
                  
                  return (
                    <tr key={activity.id} className="hover:bg-blue-50 transition-colors">
                      <td className="p-3 text-sm font-mono font-medium text-blue-600">{activity.workOrder}</td>
                      <td className="p-3 text-sm text-gray-700 max-w-[200px] truncate" title={activity.description}>
                        {activity.description}
                      </td>
                      <td className="p-3 text-sm text-gray-600">{activity.assembly}</td>
                      <td className="p-3">
                        <button 
                          onClick={() => onPartClick(activity.partNumber)}
                          className="text-sm font-mono text-blue-600 hover:underline"
                        >
                          {activity.partNumber}
                        </button>
                      </td>
                      <td className="p-3 text-sm text-right font-medium text-gray-900">{activity.qtyRequired}</td>
                      <td className={`p-3 text-sm text-right font-medium ${
                        activity.qtyAvailable < activity.qtyRequired ? "text-red-600" : "text-green-600"
                      }`}>
                        {activity.qtyAvailable}
                      </td>
                      <td className="p-3 text-sm text-gray-600 whitespace-nowrap">
                        {activity.needBy.toLocaleDateString()}
                      </td>
                      <td className={`p-3 text-sm whitespace-nowrap ${isLate ? "text-red-600 font-medium" : "text-gray-600"}`}>
                        {activity.expectedDue.toLocaleDateString()}
                        {isLate && <span className="ml-1 text-xs">({daysLate}d late)</span>}
                      </td>
                      <td className="p-3 text-center">
                        <Badge className={`text-xs ${statusColors[activity.status]}`}>
                          {activity.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Badge className={`text-xs ${severityColors[activity.impactSeverity]}`}>
                          {activity.impactSeverity}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
                {activities.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-gray-400">
                      No activities match current filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ===== PART DETAIL DRAWER =====
function PartDetailDrawer({
  part,
  weekLabels,
  activities
}: {
  part: PartNumber
  weekLabels: string[]
  activities: Activity[]
}) {
  // Prepare chart data for part
  const chartData = useMemo(() => {
    let cumulativeDemand = 0
    let cumulativeSupply = 0
    
    return part.weeklyData.slice(0, weekLabels.length).map((wd, i) => {
      cumulativeDemand += wd.demand
      cumulativeSupply += wd.supply
      return {
        week: weekLabels[i],
        cumulativeDemand,
        cumulativeSupply,
        endingStock: wd.endingStock,
        shortage: wd.shortage
      }
    })
  }, [part, weekLabels])
  
  return (
    <>
      <SheetHeader className="pb-4 border-b border-gray-200">
        <SheetTitle className="text-xl font-bold text-gray-900">{part.partNumber}</SheetTitle>
        <p className="text-sm text-gray-500">{part.description}</p>
      </SheetHeader>
      
      <div className="mt-6 space-y-6">
        {/* Part Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Commodity</p>
              <p className="text-sm font-medium text-gray-900">{part.commodity}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Supplier</p>
              <p className="text-sm font-medium text-gray-900">{part.supplier}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Lead Time</p>
              <p className="text-sm font-medium text-gray-900">{part.leadTime} days</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">MOQ</p>
              <p className="text-sm font-medium text-gray-900">{part.moq}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Flags</p>
              <div className="flex gap-1 mt-1">
                {part.isCritical && <Badge className="text-xs bg-red-100 text-red-700">Critical</Badge>}
                {part.isSoleSource && <Badge className="text-xs bg-purple-100 text-purple-700">Sole Source</Badge>}
                {!part.isCritical && !part.isSoleSource && <span className="text-gray-400 text-sm">None</span>}
              </div>
            </div>
            {part.rootCause && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Root Cause</p>
                <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-300 mt-1">
                  {part.rootCause}
                </Badge>
              </div>
            )}
          </div>
        </div>
        
        {/* Shortage Alert */}
        {part.shortageStartWeek && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <p className="text-sm font-medium text-red-800">
                Shortage projected from <span className="font-bold">{part.shortageStartWeek}</span> to{" "}
                <span className="font-bold">{part.recoveryWeek}</span>
              </p>
            </div>
          </div>
        )}
        
        {/* Demand vs Supply Chart */}
        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-3">Cumulative Demand vs Supply</h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="week" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="cumulativeSupply" fill="#22c55e" stroke="#16a34a" fillOpacity={0.3} name="Cum. Supply" />
                <Line type="monotone" dataKey="cumulativeDemand" stroke="#111827" strokeWidth={2} dot={false} name="Cum. Demand" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Impacted Work Orders */}
        {activities.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-3">Impacted Work Orders</h4>
            <div className="space-y-2">
              {activities.map(act => (
                <div key={act.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-mono font-medium text-gray-900">{act.workOrder}</p>
                    <p className="text-xs text-gray-500">{act.description}</p>
                  </div>
                  <Badge className={`text-xs ${
                    act.status === "Shortage" ? "bg-red-100 text-red-700" :
                    act.status === "Partial" ? "bg-yellow-100 text-yellow-700" :
                    "bg-green-100 text-green-700"
                  }`}>
                    {act.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// Need React import for Fragment
import React from "react"
