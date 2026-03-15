"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertTriangle, Calendar, Package, Search, RefreshCw, Download, Share2, ChevronRight, TrendingUp, TrendingDown, Layers, BarChart3, Clock, Factory, Truck, Box, AlertCircle, CheckCircle, XCircle, Filter, ChevronDown, ArrowUpRight, Minus } from "lucide-react"
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, ComposedChart, Line, ReferenceLine } from "recharts"

// ===== TYPES =====
type SupplyBucket = "Inventory" | "WIP" | "Planned Make" | "PRs/POs" | "Supplier Commits"
type RootCause = "Late PO" | "Supplier commit slip" | "Internal WIP delay" | "Quality hold" | "Capacity constraint" | "Allocation issue" | "Long lead item" | "Forecast change"
type ShortageStatus = "Covered" | "Partial" | "Shortage"
type Granularity = "Weekly" | "Daily"
type Scenario = "Baseline" | "Expedite" | "Recovery"

interface TimeBucket {
  label: string
  date: Date
  cumulativeDemand: number
  cumulativeSupply: number
  inventory: number
  wip: number
  plannedMake: number
  prsPOs: number
  supplierCommits: number
  shortage: number
  isShortageWindow: boolean
}

interface Assembly {
  id: string
  name: string
  partFamily: string
  shortageQty: number
  firstShortageWeek: string
  recoveryWeek: string
  mainDriver: RootCause
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

// ===== MOCK DATA GENERATION =====
const programs = ["F-35 Lightning II", "CH-53K King Stallion", "AH-64E Apache", "V-22 Osprey"]
const assemblies = ["Fuselage Section", "Wing Assembly", "Avionics Bay", "Landing Gear", "Engine Nacelle", "Cockpit Module", "Tail Section", "Hydraulic System"]
const suppliers = ["Northrop Grumman", "Raytheon", "L3Harris", "BAE Systems", "General Dynamics", "Honeywell", "Collins Aerospace", "Pratt & Whitney"]
const rootCauses: RootCause[] = ["Late PO", "Supplier commit slip", "Internal WIP delay", "Quality hold", "Capacity constraint", "Allocation issue", "Long lead item", "Forecast change"]

const SUPPLY_COLORS = {
  "Inventory": "#22c55e",
  "WIP": "#3b82f6",
  "Planned Make": "#8b5cf6",
  "PRs/POs": "#f59e0b",
  "Supplier Commits": "#ec4899"
}

function generateWeekLabel(weeksFromNow: number): string {
  const date = new Date()
  date.setDate(date.getDate() + weeksFromNow * 7)
  return `W${String(Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7)).padStart(2, "0")} ${date.toLocaleDateString("en-US", { month: "short" })}`
}

function generateTimeBuckets(weeks: number = 24): TimeBucket[] {
  const buckets: TimeBucket[] = []
  let cumulativeDemand = 0
  let cumulativeSupply = 0
  
  // Start with some initial inventory
  const initialInventory = 800 + Math.random() * 400
  
  for (let i = 0; i < weeks; i++) {
    const weekDemand = 80 + Math.floor(Math.random() * 60)
    cumulativeDemand += weekDemand
    
    // Supply ramps up but has gaps
    const inventory = i === 0 ? initialInventory : Math.max(0, buckets[i-1].inventory - weekDemand * 0.3)
    const wip = 20 + Math.floor(Math.random() * 30)
    const plannedMake = 30 + Math.floor(Math.random() * 40)
    const prsPOs = i > 4 ? 25 + Math.floor(Math.random() * 35) : 10
    const supplierCommits = i > 8 ? 20 + Math.floor(Math.random() * 30) : 5
    
    const weekSupply = inventory + wip + plannedMake + prsPOs + supplierCommits
    cumulativeSupply = i === 0 ? weekSupply : buckets[i-1].cumulativeSupply + (wip + plannedMake + prsPOs + supplierCommits)
    
    const shortage = Math.max(0, cumulativeDemand - cumulativeSupply)
    const isShortageWindow = shortage > 0 && (i >= 6 && i <= 14) // Shortage window in weeks 6-14
    
    const date = new Date()
    date.setDate(date.getDate() + i * 7)
    
    buckets.push({
      label: generateWeekLabel(i),
      date,
      cumulativeDemand,
      cumulativeSupply: Math.min(cumulativeSupply, cumulativeDemand * 1.1), // Cap at slightly above demand
      inventory: i === 0 ? initialInventory : inventory,
      wip,
      plannedMake,
      prsPOs,
      supplierCommits,
      shortage: isShortageWindow ? shortage * (0.5 + Math.random() * 0.5) : 0,
      isShortageWindow
    })
  }
  
  return buckets
}

function generateAssemblies(): Assembly[] {
  return assemblies.map((name, i) => {
    const hasShortage = i < 5 // First 5 assemblies have shortages
    return {
      id: `asm-${i}`,
      name,
      partFamily: ["Structural", "Electrical", "Hydraulic", "Avionics"][i % 4],
      shortageQty: hasShortage ? 10 + Math.floor(Math.random() * 50) : 0,
      firstShortageWeek: hasShortage ? generateWeekLabel(6 + i) : "—",
      recoveryWeek: hasShortage ? generateWeekLabel(12 + i) : "—",
      mainDriver: rootCauses[i % rootCauses.length],
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
      const shortageStartWeek = hasShortage ? 6 + asmIdx + p : null
      
      parts.push({
        id: `pn-${asmIdx}-${p}`,
        partNumber: `PN-${1000 + asmIdx * 100 + p}`,
        description: `${asm.name} Component ${p + 1}`,
        commodity: ["Fasteners", "Electronics", "Composites", "Metals", "Seals"][p % 5],
        supplier: suppliers[(asmIdx + p) % suppliers.length],
        leadTime: 14 + Math.floor(Math.random() * 60),
        moq: [1, 10, 25, 50, 100][p % 5],
        isCritical: p === 0 && hasShortage,
        isSoleSource: p % 3 === 0,
        assemblyId: asm.id,
        weeklyData: Array.from({ length: 16 }, (_, w) => {
          const demand = 5 + Math.floor(Math.random() * 15)
          const supplyBase = hasShortage && w >= shortageStartWeek! && w <= shortageStartWeek! + 4 ? demand * 0.6 : demand * 1.1
          const supply = Math.floor(supplyBase + Math.random() * 5)
          const prevStock = w > 0 ? parts.find(pt => pt.id === `pn-${asmIdx}-${p}`)?.weeklyData?.[w-1]?.endingStock ?? 20 : 20
          const endingStock = prevStock + supply - demand
          return {
            demand,
            supply,
            endingStock: Math.max(-10, endingStock),
            shortage: Math.max(0, -endingStock)
          }
        }),
        shortageStartWeek: hasShortage ? generateWeekLabel(shortageStartWeek!) : null,
        recoveryWeek: hasShortage ? generateWeekLabel(shortageStartWeek! + 5) : null,
        rootCause: hasShortage ? rootCauses[(asmIdx + p) % rootCauses.length] : null
      })
    }
  })
  
  return parts
}

function generateActivities(parts: PartNumber[]): Activity[] {
  const activities: Activity[] = []
  
  parts.slice(0, 20).forEach((part, i) => {
    const hasShortage = part.shortageStartWeek !== null
    const needBy = new Date()
    needBy.setDate(needBy.getDate() + 14 + i * 3)
    const expectedDue = new Date(needBy)
    expectedDue.setDate(expectedDue.getDate() + (hasShortage ? 7 + Math.floor(Math.random() * 14) : -2))
    
    activities.push({
      id: `act-${i}`,
      workOrder: `WO-${2024}${String(i + 1).padStart(4, "0")}`,
      description: `${part.description} Installation`,
      assembly: assemblies.find((_, idx) => part.assemblyId === `asm-${idx}`) || "Unknown",
      partNumber: part.partNumber,
      qtyRequired: 5 + Math.floor(Math.random() * 20),
      qtyAvailable: hasShortage ? Math.floor((5 + Math.random() * 10)) : 5 + Math.floor(Math.random() * 25),
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
      rootCause: a.mainDriver,
      riskScore: 60 + Math.floor(Math.random() * 40),
      recoveryETA: a.recoveryWeek
    }))
}

// ===== MAIN COMPONENT =====
export function MaterialLineOfBalance() {
  // State
  const [selectedProgram, setSelectedProgram] = useState(programs[0])
  const [selectedAssembly, setSelectedAssembly] = useState<string | null>(null)
  const [selectedPart, setSelectedPart] = useState<PartNumber | null>(null)
  const [granularity, setGranularity] = useState<Granularity>("Weekly")
  const [scenario, setScenario] = useState<Scenario>("Baseline")
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [partFamilyFilter, setPartFamilyFilter] = useState("All")
  const [supplierFilter, setSupplierFilter] = useState("All")
  
  // Generate mock data
  const timeBuckets = useMemo(() => generateTimeBuckets(24), [])
  const assemblyList = useMemo(() => generateAssemblies(), [])
  const partNumbers = useMemo(() => generatePartNumbers(assemblyList), [assemblyList])
  const activities = useMemo(() => generateActivities(partNumbers), [partNumbers])
  const upcomingShortages = useMemo(() => generateUpcomingShortages(assemblyList), [assemblyList])
  
  // Computed KPIs
  const kpis = useMemo(() => {
    const totalShortage = timeBuckets.reduce((sum, b) => sum + b.shortage, 0)
    const peakShortage = Math.max(...timeBuckets.map(b => b.shortage))
    const totalDemand = timeBuckets[timeBuckets.length - 1]?.cumulativeDemand || 1
    const totalSupply = timeBuckets[timeBuckets.length - 1]?.cumulativeSupply || 0
    const coveragePercent = Math.min(100, Math.round((totalSupply / totalDemand) * 100))
    const shortageWindows = timeBuckets.filter(b => b.isShortageWindow).length
    const firstShortageWeek = timeBuckets.find(b => b.isShortageWindow)?.label || "—"
    const lastShortageIdx = timeBuckets.map((b, i) => b.isShortageWindow ? i : -1).filter(i => i >= 0).pop()
    const recoveryWeek = lastShortageIdx !== undefined ? timeBuckets[lastShortageIdx + 1]?.label || "—" : "—"
    const criticalParts = partNumbers.filter(p => p.isCritical).length
    const atRiskAssemblies = assemblyList.filter(a => a.shortageQty > 0).length
    
    return {
      totalShortage: Math.round(totalShortage),
      peakShortage: Math.round(peakShortage),
      coveragePercent,
      shortageWindows,
      firstShortageWeek,
      recoveryWeek,
      criticalParts,
      atRiskAssemblies
    }
  }, [timeBuckets, partNumbers, assemblyList])
  
  // Filtered data
  const filteredParts = useMemo(() => {
    let filtered = partNumbers
    if (selectedAssembly) {
      filtered = filtered.filter(p => p.assemblyId === selectedAssembly)
    }
    if (partFamilyFilter !== "All") {
      filtered = filtered.filter(p => p.commodity === partFamilyFilter)
    }
    if (supplierFilter !== "All") {
      filtered = filtered.filter(p => p.supplier === supplierFilter)
    }
    return filtered
  }, [partNumbers, selectedAssembly, partFamilyFilter, supplierFilter])
  
  const filteredActivities = useMemo(() => {
    if (selectedPart) {
      return activities.filter(a => a.partNumber === selectedPart.partNumber)
    }
    if (selectedAssembly) {
      const asm = assemblyList.find(a => a.id === selectedAssembly)
      if (asm) return activities.filter(a => a.assembly === asm.name)
    }
    return activities
  }, [activities, selectedPart, selectedAssembly, assemblyList])
  
  // Handlers
  const handleChartClick = (data: TimeBucket | null, index: number) => {
    if (data?.isShortageWindow) {
      setSelectedWeek(index)
    }
  }
  
  const handlePartClick = (part: PartNumber) => {
    setSelectedPart(part)
    setDrawerOpen(true)
  }
  
  const handleAssemblyClick = (assemblyId: string) => {
    setSelectedAssembly(selectedAssembly === assemblyId ? null : assemblyId)
  }
  
  const handleShortageRowClick = (shortage: UpcomingShortage) => {
    const asm = assemblyList.find(a => a.name === shortage.assembly)
    if (asm) setSelectedAssembly(asm.id)
  }
  
  // Chart data for hero LOB
  const chartData = timeBuckets.map(b => ({
    ...b,
    gap: Math.max(0, b.cumulativeDemand - b.cumulativeSupply)
  }))
  
  // Breadcrumb
  const breadcrumb = useMemo(() => {
    const parts = [selectedProgram]
    if (selectedAssembly) {
      const asm = assemblyList.find(a => a.id === selectedAssembly)
      if (asm) parts.push(asm.name)
    }
    if (selectedPart) {
      parts.push(selectedPart.partNumber)
    }
    return parts
  }, [selectedProgram, selectedAssembly, selectedPart, assemblyList])

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold text-gray-900">Material Line of Balance</h1>
                <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                  <SelectTrigger className="w-[200px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant="outline" className="text-xs text-gray-500">
                  <Clock className="w-3 h-3 mr-1" />
                  Last refresh: {new Date().toLocaleTimeString()}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  {(["Baseline", "Expedite", "Recovery"] as Scenario[]).map(s => (
                    <button
                      key={s}
                      onClick={() => setScenario(s)}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                        scenario === s ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-1" /> Export
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 className="w-4 h-4 mr-1" /> Share
                </Button>
                <Button variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Filter Row */}
            <div className="flex items-center gap-3 mt-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Filters:</span>
              </div>
              <Select value={partFamilyFilter} onValueChange={setPartFamilyFilter}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Part Family" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Families</SelectItem>
                  {["Structural", "Electrical", "Hydraulic", "Avionics"].map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue placeholder="Supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Suppliers</SelectItem>
                  {suppliers.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5 ml-auto">
                {(["Weekly", "Daily"] as Granularity[]).map(g => (
                  <button
                    key={g}
                    onClick={() => setGranularity(g)}
                    className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                      granularity === g ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
              {(selectedAssembly || selectedPart) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setSelectedAssembly(null); setSelectedPart(null); setSelectedWeek(null) }}
                  className="text-xs"
                >
                  Clear Selection
                </Button>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Breadcrumb */}
          {breadcrumb.length > 1 && (
            <div className="flex items-center gap-2 text-sm">
              {breadcrumb.map((item, i) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
                  <span className={i === breadcrumb.length - 1 ? "font-medium text-gray-900" : "text-gray-500 cursor-pointer hover:text-gray-700"}
                    onClick={() => {
                      if (i === 0) { setSelectedAssembly(null); setSelectedPart(null) }
                      else if (i === 1) setSelectedPart(null)
                    }}
                  >
                    {item}
                  </span>
                </span>
              ))}
            </div>
          )}
          
          {/* KPI Cards */}
          <div className="grid grid-cols-8 gap-4">
            {[
              { label: "Total Program Shortage", value: kpis.totalShortage.toLocaleString(), delta: "+12%", trend: "up", color: "red" },
              { label: "Peak Weekly Shortage", value: kpis.peakShortage.toLocaleString(), delta: null, trend: null, color: "orange" },
              { label: "% Demand Covered", value: `${kpis.coveragePercent}%`, delta: "-3%", trend: "down", color: kpis.coveragePercent >= 95 ? "green" : "amber" },
              { label: "Open Shortage Windows", value: kpis.shortageWindows.toString(), delta: null, trend: null, color: kpis.shortageWindows > 0 ? "red" : "green" },
              { label: "First Shortage Week", value: kpis.firstShortageWeek, delta: null, trend: null, color: "blue" },
              { label: "Est. Recovery Week", value: kpis.recoveryWeek, delta: null, trend: null, color: "blue" },
              { label: "# Critical Parts", value: kpis.criticalParts.toString(), delta: null, trend: null, color: kpis.criticalParts > 0 ? "red" : "green" },
              { label: "# At-Risk Assemblies", value: kpis.atRiskAssemblies.toString(), delta: null, trend: null, color: kpis.atRiskAssemblies > 0 ? "orange" : "green" }
            ].map((kpi, i) => (
              <Card key={i} className={`border-l-4 ${
                kpi.color === "red" ? "border-l-red-500" :
                kpi.color === "orange" ? "border-l-orange-500" :
                kpi.color === "amber" ? "border-l-amber-500" :
                kpi.color === "green" ? "border-l-green-500" :
                "border-l-blue-500"
              }`}>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{kpi.label}</p>
                  <div className="flex items-end gap-2 mt-1">
                    <span className={`text-2xl font-bold ${
                      kpi.color === "red" ? "text-red-700" :
                      kpi.color === "orange" ? "text-orange-700" :
                      kpi.color === "amber" ? "text-amber-700" :
                      kpi.color === "green" ? "text-green-700" :
                      "text-gray-900"
                    }`}>
                      {kpi.value}
                    </span>
                    {kpi.delta && (
                      <span className={`text-xs flex items-center ${kpi.trend === "up" ? "text-red-600" : "text-green-600"}`}>
                        {kpi.trend === "up" ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                        {kpi.delta}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Hero LOB Chart */}
          <Card className="border-2 border-gray-200">
            <CardHeader className="pb-2 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-gray-900">
                    Line of Balance — {selectedProgram} — Cumulative Resupply
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Cumulative demand (black line) vs stacked supply sources. Shaded areas show shortage windows.
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {Object.entries(SUPPLY_COLORS).map(([key, color]) => (
                    <span key={key} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <span className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                      {key}
                    </span>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ left: 10, right: 30, top: 20, bottom: 10 }}>
                    <defs>
                      <linearGradient id="shortageGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fecaca" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#fecaca" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11 }} label={{ value: 'Cumulative Qty', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                    
                    {/* Shortage shading */}
                    {chartData.map((entry, i) => entry.isShortageWindow && (
                      <ReferenceLine key={`shortage-${i}`} x={entry.label} stroke="#fca5a5" strokeWidth={20} strokeOpacity={0.3} />
                    ))}
                    
                    {/* Today line */}
                    <ReferenceLine x={chartData[0]?.label} stroke="#374151" strokeWidth={2} strokeDasharray="4 4" label={{ value: "Today", position: "top", fontSize: 10 }} />
                    
                    {/* Stacked supply areas */}
                    <Area type="monotone" dataKey="inventory" stackId="supply" fill={SUPPLY_COLORS["Inventory"]} stroke={SUPPLY_COLORS["Inventory"]} fillOpacity={0.8} name="Inventory" />
                    <Area type="monotone" dataKey="wip" stackId="supply" fill={SUPPLY_COLORS["WIP"]} stroke={SUPPLY_COLORS["WIP"]} fillOpacity={0.8} name="WIP" />
                    <Area type="monotone" dataKey="plannedMake" stackId="supply" fill={SUPPLY_COLORS["Planned Make"]} stroke={SUPPLY_COLORS["Planned Make"]} fillOpacity={0.8} name="Planned Make" />
                    <Area type="monotone" dataKey="prsPOs" stackId="supply" fill={SUPPLY_COLORS["PRs/POs"]} stroke={SUPPLY_COLORS["PRs/POs"]} fillOpacity={0.8} name="PRs/POs" />
                    <Area type="monotone" dataKey="supplierCommits" stackId="supply" fill={SUPPLY_COLORS["Supplier Commits"]} stroke={SUPPLY_COLORS["Supplier Commits"]} fillOpacity={0.8} name="Supplier Commits" />
                    
                    {/* Demand line */}
                    <Line type="monotone" dataKey="cumulativeDemand" stroke="#1f2937" strokeWidth={3} dot={false} name="Cumulative Demand" />
                    
                    <Tooltip content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as TimeBucket
                        return (
                          <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg text-xs max-w-xs">
                            <p className="font-bold text-sm text-gray-900 mb-2">{label}</p>
                            <div className="space-y-1">
                              <p><span className="text-gray-500">Cumulative Demand:</span> <span className="font-bold">{data.cumulativeDemand.toLocaleString()}</span></p>
                              <p><span className="text-gray-500">Cumulative Supply:</span> <span className="font-bold">{Math.round(data.cumulativeSupply).toLocaleString()}</span></p>
                              {data.shortage > 0 && (
                                <>
                                  <p className="text-red-600 font-bold">Shortage: {Math.round(data.shortage).toLocaleString()}</p>
                                  <p><span className="text-gray-500">Primary Driver:</span> Late PO</p>
                                  <p><span className="text-gray-500">Est. Recovery:</span> {kpis.recoveryWeek}</p>
                                </>
                              )}
                            </div>
                            <div className="mt-2 pt-2 border-t border-gray-200 space-y-0.5">
                              <p className="text-gray-500">Supply Breakdown:</p>
                              <p>Inventory: {Math.round(data.inventory).toLocaleString()}</p>
                              <p>WIP: {data.wip}</p>
                              <p>Planned Make: {data.plannedMake}</p>
                              <p>PRs/POs: {data.prsPOs}</p>
                              <p>Supplier Commits: {data.supplierCommits}</p>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* Row 3: Upcoming Shortages + Summary */}
          <div className="grid grid-cols-12 gap-6">
            {/* Upcoming Shortages Table */}
            <Card className="col-span-8 border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <CardTitle className="text-base font-bold text-gray-900">Upcoming Shortages</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[300px]">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-3 text-xs font-bold text-gray-600">Part Family / Assembly</th>
                        <th className="text-right p-3 text-xs font-bold text-gray-600">Shortage Qty</th>
                        <th className="text-left p-3 text-xs font-bold text-gray-600">Shortage Window</th>
                        <th className="text-left p-3 text-xs font-bold text-gray-600">Supplier</th>
                        <th className="text-left p-3 text-xs font-bold text-gray-600">Root Cause</th>
                        <th className="text-center p-3 text-xs font-bold text-gray-600">Risk Score</th>
                        <th className="text-left p-3 text-xs font-bold text-gray-600">Recovery ETA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {upcomingShortages.map(shortage => (
                        <tr 
                          key={shortage.id} 
                          className="hover:bg-blue-50 cursor-pointer transition-colors"
                          onClick={() => handleShortageRowClick(shortage)}
                        >
                          <td className="p-3">
                            <p className="text-sm font-medium text-gray-900">{shortage.assembly}</p>
                            <p className="text-xs text-gray-500">{shortage.partFamily}</p>
                          </td>
                          <td className="p-3 text-right">
                            <span className="text-sm font-bold text-red-700">{shortage.shortageQty}</span>
                          </td>
                          <td className="p-3 text-sm text-gray-700">{shortage.shortageWindow}</td>
                          <td className="p-3 text-sm text-gray-700 max-w-[120px] truncate">{shortage.supplier}</td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300">
                              {shortage.rootCause}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`text-sm font-bold ${
                              shortage.riskScore >= 80 ? "text-red-700" : shortage.riskScore >= 60 ? "text-orange-600" : "text-gray-700"
                            }`}>
                              {shortage.riskScore}
                            </span>
                          </td>
                          <td className="p-3 text-sm text-gray-700">{shortage.recoveryETA}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            
            {/* Summary Panel */}
            <Card className="col-span-4 border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <CardTitle className="text-base font-bold text-gray-900">Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Total Program Shortage</span>
                  <span className="text-lg font-bold text-red-700">{kpis.totalShortage.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Peak Weekly Shortage</span>
                  <span className="text-lg font-bold text-orange-700">{kpis.peakShortage.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">% Demand Covered</span>
                  <span className={`text-lg font-bold ${kpis.coveragePercent >= 95 ? "text-green-700" : "text-amber-700"}`}>{kpis.coveragePercent}%</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Open Shortage Windows</span>
                  <span className="text-lg font-bold text-gray-900">{kpis.shortageWindows}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Critical Supplier Count</span>
                  <span className="text-lg font-bold text-gray-900">3</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">Line Items in Frozen Window</span>
                  <span className="text-lg font-bold text-red-700">7</span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Assembly / Sub-Assembly Drill-Down */}
          <Card className="border border-gray-200">
            <CardHeader className="py-3 px-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-gray-900">Assembly / Sub-Assembly Material LOB</CardTitle>
                  <p className="text-xs text-gray-500 mt-0.5">Click a row to drill into part-level detail. Heatmap shows coverage status by week.</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-green-500" /> Covered</span>
                  <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-amber-400" /> Partial</span>
                  <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-red-500" /> Shortage</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-3 text-xs font-bold text-gray-600 sticky left-0 bg-gray-50 min-w-[180px]">Assembly</th>
                      <th className="text-right p-3 text-xs font-bold text-gray-600 min-w-[80px]">Shortage</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-600 min-w-[90px]">First Short</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-600 min-w-[90px]">Recovery</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-600 min-w-[100px]">Driver</th>
                      <th className="text-center p-3 text-xs font-bold text-gray-600 min-w-[60px]">Parts</th>
                      {Array.from({ length: 16 }, (_, i) => (
                        <th key={i} className="text-center p-1 text-[10px] font-medium text-gray-500 min-w-[32px]">
                          W{i + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {assemblyList.map(asm => (
                      <tr 
                        key={asm.id}
                        className={`cursor-pointer transition-colors ${selectedAssembly === asm.id ? "bg-blue-100" : "hover:bg-gray-50"}`}
                        onClick={() => handleAssemblyClick(asm.id)}
                      >
                        <td className="p-3 sticky left-0 bg-white">
                          <p className="text-sm font-medium text-gray-900">{asm.name}</p>
                          <p className="text-xs text-gray-500">{asm.partFamily}</p>
                        </td>
                        <td className="p-3 text-right">
                          {asm.shortageQty > 0 ? (
                            <span className="text-sm font-bold text-red-700">{asm.shortageQty}</span>
                          ) : (
                            <span className="text-sm text-green-600">—</span>
                          )}
                        </td>
                        <td className="p-3 text-sm text-gray-700">{asm.firstShortageWeek}</td>
                        <td className="p-3 text-sm text-gray-700">{asm.recoveryWeek}</td>
                        <td className="p-3">
                          {asm.shortageQty > 0 && (
                            <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">
                              {asm.mainDriver}
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-center text-sm text-gray-700">{asm.impactedPartCount || "—"}</td>
                        {asm.weeklyStatus.map((status, w) => (
                          <td key={w} className="p-1 text-center">
                            <div className={`w-6 h-6 rounded mx-auto ${
                              status === "Covered" ? "bg-green-400" :
                              status === "Partial" ? "bg-amber-400" :
                              "bg-red-500"
                            }`} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          
          {/* Part Number Detail View */}
          <Card className="border border-gray-200">
            <CardHeader className="py-3 px-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-gray-900">
                    Part-Level Time-Phased Net Availability
                    {selectedAssembly && (
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        — {assemblyList.find(a => a.id === selectedAssembly)?.name}
                      </span>
                    )}
                  </CardTitle>
                  <p className="text-xs text-gray-500 mt-0.5">Weekly demand, supply, and ending stock. Click a part for details.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-2 font-bold text-gray-600 sticky left-0 bg-gray-50 min-w-[140px] border-r border-gray-200">Part Number</th>
                      <th className="text-left p-2 font-bold text-gray-600 min-w-[120px]">Supplier</th>
                      <th className="text-center p-2 font-bold text-gray-600 min-w-[50px]">LT</th>
                      {Array.from({ length: 12 }, (_, i) => (
                        <th key={i} colSpan={3} className="text-center p-1 font-bold text-gray-600 border-l border-gray-200 min-w-[90px]">
                          W{i + 1}
                        </th>
                      ))}
                    </tr>
                    <tr className="border-b border-gray-300 bg-gray-100">
                      <th className="sticky left-0 bg-gray-100 border-r border-gray-200"></th>
                      <th></th>
                      <th></th>
                      {Array.from({ length: 12 }, (_, i) => (
                        <th key={i} colSpan={3} className="border-l border-gray-200">
                          <div className="flex text-[9px] text-gray-500">
                            <span className="flex-1 text-center">D</span>
                            <span className="flex-1 text-center">S</span>
                            <span className="flex-1 text-center">Stk</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredParts.slice(0, 20).map(part => (
                      <tr 
                        key={part.id}
                        className="hover:bg-blue-50 cursor-pointer transition-colors"
                        onClick={() => handlePartClick(part)}
                      >
                        <td className="p-2 sticky left-0 bg-white border-r border-gray-100">
                          <div className="flex items-center gap-1">
                            {part.isCritical && <AlertCircle className="w-3 h-3 text-red-500" />}
                            <span className="font-mono font-medium text-gray-900">{part.partNumber}</span>
                          </div>
                          {part.isSoleSource && (
                            <Badge variant="outline" className="text-[8px] mt-0.5 bg-purple-50 text-purple-700 border-purple-200">Sole Source</Badge>
                          )}
                        </td>
                        <td className="p-2 text-gray-600 truncate max-w-[100px]">{part.supplier}</td>
                        <td className="p-2 text-center text-gray-600">{part.leadTime}d</td>
                        {part.weeklyData.slice(0, 12).map((week, w) => (
                          <td key={w} colSpan={3} className="p-0 border-l border-gray-100">
                            <div className="flex text-[10px]">
                              <span className="flex-1 text-center py-1 text-gray-600">{week.demand}</span>
                              <span className="flex-1 text-center py-1 text-gray-600">{week.supply}</span>
                              <span className={`flex-1 text-center py-1 font-medium ${
                                week.endingStock < 0 ? "bg-red-100 text-red-700" :
                                week.endingStock <= 5 ? "bg-amber-100 text-amber-700" :
                                "text-gray-700"
                              }`}>
                                {week.endingStock}
                              </span>
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          
          {/* Activity / Work Order Impact View */}
          <Card className="border border-gray-200">
            <CardHeader className="py-3 px-4 border-b border-gray-100">
              <CardTitle className="text-base font-bold text-gray-900">Activity-to-Material Impact View</CardTitle>
              <p className="text-xs text-gray-500">Scheduled activities that could be blocked by material shortage</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[350px]">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-3 text-xs font-bold text-gray-600">Work Order</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-600">Description</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-600">Assembly</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-600">Part Number</th>
                      <th className="text-right p-3 text-xs font-bold text-gray-600">Qty Req</th>
                      <th className="text-right p-3 text-xs font-bold text-gray-600">Qty Avail</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-600">Need By</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-600">Expected Due</th>
                      <th className="text-center p-3 text-xs font-bold text-gray-600">Status</th>
                      <th className="text-center p-3 text-xs font-bold text-gray-600">Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredActivities.map(activity => {
                      const isLate = activity.expectedDue > activity.needBy
                      return (
                        <tr key={activity.id} className="hover:bg-gray-50">
                          <td className="p-3 text-sm font-mono font-medium text-blue-700">{activity.workOrder}</td>
                          <td className="p-3 text-sm text-gray-700 max-w-[180px] truncate">{activity.description}</td>
                          <td className="p-3 text-sm text-gray-600">{activity.assembly}</td>
                          <td className="p-3 text-sm font-mono text-gray-700">{activity.partNumber}</td>
                          <td className="p-3 text-sm text-right text-gray-700">{activity.qtyRequired}</td>
                          <td className={`p-3 text-sm text-right font-medium ${
                            activity.qtyAvailable >= activity.qtyRequired ? "text-green-700" :
                            activity.qtyAvailable > 0 ? "text-amber-700" : "text-red-700"
                          }`}>
                            {activity.qtyAvailable}
                          </td>
                          <td className="p-3 text-sm text-gray-700">{activity.needBy.toLocaleDateString()}</td>
                          <td className={`p-3 text-sm ${isLate ? "text-red-700 font-medium" : "text-gray-700"}`}>
                            {activity.expectedDue.toLocaleDateString()}
                            {isLate && <span className="ml-1 text-xs">(Late)</span>}
                          </td>
                          <td className="p-3 text-center">
                            <Badge className={`text-[10px] ${
                              activity.status === "Covered" ? "bg-green-100 text-green-800 border-green-300" :
                              activity.status === "Partial" ? "bg-amber-100 text-amber-800 border-amber-300" :
                              "bg-red-100 text-red-800 border-red-300"
                            }`}>
                              {activity.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline" className={`text-[10px] ${
                              activity.impactSeverity === "Critical" ? "text-red-700 border-red-300" :
                              activity.impactSeverity === "High" ? "text-orange-700 border-orange-300" :
                              activity.impactSeverity === "Medium" ? "text-amber-700 border-amber-300" :
                              "text-gray-600 border-gray-300"
                            }`}>
                              {activity.impactSeverity}
                            </Badge>
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
        
        {/* Part Detail Drawer */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
            {selectedPart && (
              <>
                <SheetHeader className="border-b border-gray-200 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <SheetTitle className="text-lg font-bold text-gray-900">{selectedPart.partNumber}</SheetTitle>
                      <p className="text-sm text-gray-600 mt-1">{selectedPart.description}</p>
                    </div>
                    {selectedPart.isCritical && (
                      <Badge className="bg-red-100 text-red-800 border-red-300">Critical</Badge>
                    )}
                  </div>
                </SheetHeader>
                
                <div className="mt-6 space-y-6">
                  {/* Part Header Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Commodity</p>
                      <p className="font-medium text-gray-900">{selectedPart.commodity}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Supplier</p>
                      <p className="font-medium text-gray-900">{selectedPart.supplier}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Lead Time</p>
                      <p className="font-medium text-gray-900">{selectedPart.leadTime} days</p>
                    </div>
                    <div>
                      <p className="text-gray-500">MOQ</p>
                      <p className="font-medium text-gray-900">{selectedPart.moq}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {selectedPart.isCritical && <Badge className="bg-red-100 text-red-700">Critical Part</Badge>}
                    {selectedPart.isSoleSource && <Badge className="bg-purple-100 text-purple-700">Sole Source</Badge>}
                  </div>
                  
                  {/* Shortage Info */}
                  {selectedPart.shortageStartWeek && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm font-bold text-red-800">Shortage Alert</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-red-600">Shortage Start</p>
                          <p className="font-medium text-red-900">{selectedPart.shortageStartWeek}</p>
                        </div>
                        <div>
                          <p className="text-red-600">Est. Recovery</p>
                          <p className="font-medium text-red-900">{selectedPart.recoveryWeek}</p>
                        </div>
                      </div>
                      {selectedPart.rootCause && (
                        <div className="mt-2">
                          <p className="text-red-600 text-sm">Root Cause</p>
                          <Badge variant="outline" className="mt-1 bg-amber-50 text-amber-700 border-amber-300">
                            {selectedPart.rootCause}
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Mini Demand vs Supply Chart */}
                  <div>
                    <p className="text-sm font-bold text-gray-700 mb-2">Demand vs Supply Trend</p>
                    <div className="h-[150px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={selectedPart.weeklyData.slice(0, 12)} margin={{ left: 0, right: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey={(_, i) => `W${i + 1}`} tick={{ fontSize: 9 }} />
                          <YAxis tick={{ fontSize: 9 }} />
                          <Area type="monotone" dataKey="demand" stroke="#ef4444" fill="#fecaca" fillOpacity={0.5} name="Demand" />
                          <Area type="monotone" dataKey="supply" stroke="#22c55e" fill="#bbf7d0" fillOpacity={0.5} name="Supply" />
                          <Tooltip />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  {/* Supply Elements */}
                  <div>
                    <p className="text-sm font-bold text-gray-700 mb-2">Supply Elements</p>
                    <div className="space-y-2">
                      {[
                        { label: "On Hand", value: 45, color: "green" },
                        { label: "WIP", value: 12, color: "blue" },
                        { label: "Open PO", value: 30, color: "amber" },
                        { label: "Supplier Commits", value: 25, color: "pink" },
                        { label: "Planned Make", value: 18, color: "purple" }
                      ].map(item => (
                        <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-100">
                          <span className="text-sm text-gray-600">{item.label}</span>
                          <span className={`text-sm font-bold ${
                            item.color === "green" ? "text-green-700" :
                            item.color === "blue" ? "text-blue-700" :
                            item.color === "amber" ? "text-amber-700" :
                            item.color === "pink" ? "text-pink-700" :
                            "text-purple-700"
                          }`}>
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Impacted Activities */}
                  <div>
                    <p className="text-sm font-bold text-gray-700 mb-2">Impacted Work Orders</p>
                    <div className="space-y-2">
                      {filteredActivities.slice(0, 5).map(act => (
                        <div key={act.id} className="p-2 bg-gray-50 rounded border border-gray-200">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-mono font-medium text-blue-700">{act.workOrder}</span>
                            <Badge className={`text-[9px] ${
                              act.status === "Shortage" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                            }`}>
                              {act.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Need: {act.needBy.toLocaleDateString()} | Qty: {act.qtyRequired}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  )
}
