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
} from "@/lib/otd-tracking-data"

type OTDSubTab = "overview" | "program-manager" | "planner" | "supply-chain" | "quality" | "siop" | "supplier-otd"

const DRIVER_COLORS: Record<DriverCategory, string> = {
  Supply: "#3B82F6",
  "MRB/RI": "#F97316",
  Capacity: "#8B5CF6",
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

  // Global Filters
  const [selectedSites, setSelectedSites] = useState<string[]>([])
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([])
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])
  const [selectedCommodities, setSelectedCommodities] = useState<string[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [timeBucket, setTimeBucket] = useState<TimeBucket>("Month")
  const [chartFilter, setChartFilter] = useState<{ driver?: DriverCategory; program?: string; supplier?: string } | null>(null)
  const [driverFilter, setDriverFilter] = useState<DriverCategory | null>(null)

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
  const driverCounts = { Supply: 0, "MRB/RI": 0, Capacity: 0, Planning: 0 }
  atRiskDeliveries.forEach(d => driverCounts[d.driver]++)
  const topDriver = Object.entries(driverCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as DriverCategory || "Supply"
  const supplyPct = atRiskDeliveries.length > 0 ? Math.round((driverCounts.Supply / atRiskDeliveries.length) * 100) : 0

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
            <>
              {/* KPIs */}
              <div className="grid grid-cols-5 gap-3">
                {[
                  { label: "OTD vs Contract", value: fmtPct(kpis.contractOTD), color: "text-green-600" },
                  { label: "At-Risk (30/60d)", value: `${kpis.atRiskNext30}/${kpis.atRiskNext60}`, color: "text-yellow-600" },
                  { label: "Top Driver", value: topDriver, color: "text-blue-600" },
                  { label: "Top Risky Program", value: programRiskData[0]?.program || "N/A", color: "text-red-600" },
                  { label: "Needs Escalation", value: topAtRiskDeliveries.filter(d => d.severity === "Critical").length, color: "text-orange-600" },
                ].map((kpi, i) => (
                  <Card key={i} className="border border-gray-200">
                    <CardContent className="p-3">
                      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{kpi.label}</p>
                      <p className={`text-xl font-bold mt-0.5 ${kpi.color}`}>{kpi.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Driver → Escalation Owner Matrix */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold">Driver → Escalation Owner Matrix</CardTitle>
                  <p className="text-[10px] text-gray-500 mt-0.5">Click a cell to filter by that driver + owner combination</p>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-200 p-2 text-left font-semibold">Driver</th>
                          {["Supply Chain/Buyer", "Quality/MRB", "Factory/Operations", "Production Planner", "Customer"].map(owner => (
                            <th key={owner} className="border border-gray-200 p-2 text-center font-semibold whitespace-nowrap">{owner}</th>
                          ))}
                          <th className="border border-gray-200 p-2 text-center font-semibold bg-gray-100">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(["Supply", "MRB/RI", "Capacity", "Planning"] as DriverCategory[]).map(driver => {
                          const driverItems = atRiskDeliveries.filter(d => d.driver === driver)
                          const ownerCounts = {
                            "Supply Chain/Buyer": driverItems.filter(d => d.escalateTo === "Supply Chain/Buyer").length,
                            "Quality/MRB": driverItems.filter(d => d.escalateTo === "Quality/MRB").length,
                            "Factory/Operations": driverItems.filter(d => d.escalateTo === "Factory/Operations").length,
                            "Production Planner": driverItems.filter(d => d.escalateTo === "Production Planner").length,
                            "Customer": driverItems.filter(d => d.escalateTo === "Customer").length,
                          }
                          return (
                            <tr key={driver}>
                              <td className="border border-gray-200 p-2 font-medium" style={{ color: DRIVER_COLORS[driver] }}>{driver}</td>
                              {Object.entries(ownerCounts).map(([owner, count]) => (
                                <td 
                                  key={owner} 
                                  className={`border border-gray-200 p-2 text-center cursor-pointer transition-colors ${count > 0 ? "hover:bg-blue-50" : ""}`}
                                  onClick={() => count > 0 && setChartFilter({ driver: driver, program: owner })}
                                >
                                  {count > 0 ? (
                                    <span className={`font-bold ${count >= 10 ? "text-red-600" : count >= 5 ? "text-yellow-600" : "text-gray-700"}`}>{count}</span>
                                  ) : (
                                    <span className="text-gray-300">-</span>
                                  )}
                                </td>
                              ))}
                              <td className="border border-gray-200 p-2 text-center font-bold bg-gray-50">{driverItems.length}</td>
                            </tr>
                          )
                        })}
                        <tr className="bg-gray-100">
                          <td className="border border-gray-200 p-2 font-bold">Total</td>
                          {["Supply Chain/Buyer", "Quality/MRB", "Factory/Operations", "Production Planner", "Customer"].map(owner => (
                            <td key={owner} className="border border-gray-200 p-2 text-center font-bold">
                              {atRiskDeliveries.filter(d => d.escalateTo === owner).length}
                            </td>
                          ))}
                          <td className="border border-gray-200 p-2 text-center font-bold text-blue-600">{atRiskDeliveries.length}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Program Risk Rollup Table */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold">Program Risk Rollup</CardTitle>
                  <p className="text-[10px] text-gray-500 mt-0.5">Click a program row to filter the rest of this tab</p>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          {["Program", "Total At-Risk", "Dominant Driver", "Dominant Owner", "Nearest Contract", "% Supply", "% MRB/RI", "% Capacity", "% Planning", "Customer Flag"].map(h => (
                            <TableHead key={h} className="text-[10px] font-semibold py-2 whitespace-nowrap">{h}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {programRiskData.slice(0, 8).map(prog => {
                          const progDeliveries = atRiskDeliveries.filter(d => d.program === prog.program)
                          const nearestContract = progDeliveries.length > 0 
                            ? Math.min(...progDeliveries.map(d => Math.max(0, Math.floor((d.contractDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))))
                            : 999
                          const dominantDriver = (["Supply", "MRB/RI", "Capacity", "Planning"] as DriverCategory[])
                            .reduce((max, d) => prog[d] > prog[max] ? d : max, "Supply" as DriverCategory)
                          const ownerCounts = new Map<string, number>()
                          progDeliveries.forEach(d => ownerCounts.set(d.escalateTo, (ownerCounts.get(d.escalateTo) || 0) + 1))
                          const dominantOwner = Array.from(ownerCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "-"
                          const hasCustomerEscalation = progDeliveries.some(d => d.escalateTo === "Customer" || d.severity === "Critical")
                          
                          return (
                            <TableRow 
                              key={prog.program} 
                              className="cursor-pointer hover:bg-blue-50"
                              onClick={() => setSelectedPrograms([prog.program])}
                            >
                              <TableCell className="text-xs font-medium py-2">{prog.program}</TableCell>
                              <TableCell className="text-xs font-bold py-2">{prog.total}</TableCell>
                              <TableCell className="py-2">
                                <Badge variant="outline" className="text-[9px]" style={{ borderColor: DRIVER_COLORS[dominantDriver], color: DRIVER_COLORS[dominantDriver] }}>
                                  {dominantDriver}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs py-2">{dominantOwner}</TableCell>
                              <TableCell className={`text-xs font-medium py-2 ${nearestContract < 14 ? "text-red-600" : nearestContract < 30 ? "text-yellow-600" : ""}`}>
                                {nearestContract}d
                              </TableCell>
                              <TableCell className="text-xs py-2 text-center">{prog.total > 0 ? Math.round((prog.Supply / prog.total) * 100) : 0}%</TableCell>
                              <TableCell className="text-xs py-2 text-center">{prog.total > 0 ? Math.round((prog["MRB/RI"] / prog.total) * 100) : 0}%</TableCell>
                              <TableCell className="text-xs py-2 text-center">{prog.total > 0 ? Math.round((prog.Capacity / prog.total) * 100) : 0}%</TableCell>
                              <TableCell className="text-xs py-2 text-center">{prog.total > 0 ? Math.round((prog.Planning / prog.total) * 100) : 0}%</TableCell>
                              <TableCell className="py-2 text-center">
                                {hasCustomerEscalation ? <AlertTriangle className="w-4 h-4 text-red-500 mx-auto" /> : <span className="text-gray-300">-</span>}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Program Risk Stacked Chart */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold">At-Risk by Program (Stacked by Driver)</CardTitle>
                  <p className="text-[10px] text-gray-500 mt-0.5">X-axis = count of at-risk + late deliveries; colors = driver category. Click a driver segment to filter the escalation list below.</p>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={programRiskData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="program" type="category" width={100} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar 
                          dataKey="Supply" 
                          stackId="a" 
                          fill={DRIVER_COLORS.Supply} 
                          cursor="pointer"
                          onClick={() => setDriverFilter("Supply")}
                        />
                        <Bar 
                          dataKey="MRB/RI" 
                          stackId="a" 
                          fill={DRIVER_COLORS["MRB/RI"]} 
                          cursor="pointer"
                          onClick={() => setDriverFilter("MRB/RI")}
                        />
                        <Bar 
                          dataKey="Capacity" 
                          stackId="a" 
                          fill={DRIVER_COLORS.Capacity} 
                          cursor="pointer"
                          onClick={() => setDriverFilter("Capacity")}
                        />
                        <Bar 
                          dataKey="Planning" 
                          stackId="a" 
                          fill={DRIVER_COLORS.Planning} 
                          radius={[0, 4, 4, 0]} 
                          cursor="pointer"
                          onClick={() => setDriverFilter("Planning")}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {driverFilter && (
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <span className="text-gray-500">Filtered by:</span>
                      <Badge variant="outline" style={{ borderColor: DRIVER_COLORS[driverFilter], color: DRIVER_COLORS[driverFilter] }}>{driverFilter}</Badge>
                      <button onClick={() => setDriverFilter(null)} className="text-blue-600 hover:underline">Clear</button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Grouped Escalation Lists by Escalate To */}
              <div className="space-y-4">
                {["Quality/MRB", "Supply Chain/Buyer", "Factory/Operations", "Production Planner", "Customer"].map(owner => {
                  const ownerItems = topAtRiskDeliveries
                    .filter(d => d.escalateTo === owner)
                    .filter(d => !driverFilter || d.driver === driverFilter)
                    .sort((a, b) => {
                      const aDays = Math.floor((a.contractDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
                      const bDays = Math.floor((b.contractDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
                      return aDays - bDays
                    })
                  
                  if (ownerItems.length === 0) return null
                  
                  const headerColor = owner === "Customer" ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"
                  const headerTitle = owner === "Customer" ? "Customer escalation needed" : `Escalate to ${owner}`
                  
                  return (
                    <Card key={owner} className={`border ${owner === "Customer" ? "border-red-200" : "border-gray-200"}`}>
                      <CardHeader className={`py-2 px-4 ${headerColor}`}>
                        <div className="flex items-center justify-between">
                          <CardTitle className={`text-sm font-semibold ${owner === "Customer" ? "text-red-700" : ""}`}>
                            {headerTitle}
                          </CardTitle>
                          <Badge variant={owner === "Customer" ? "destructive" : "secondary"} className="text-[10px]">
                            {ownerItems.length} items
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-3 pt-2">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50/50">
                              {["Program", "CLIN", "Days to Contract", "Driver", "Supplier", "Status", "Recommended Action"].map(h => (
                                <TableHead key={h} className="text-[10px] font-semibold py-1.5">{h}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {ownerItems.slice(0, 6).map(d => {
                              const daysToContract = Math.max(0, Math.floor((d.contractDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
                              const action = d.driver === "Supply" ? "Expedite with supplier" 
                                : d.driver === "MRB/RI" ? "Prioritize disposition" 
                                : d.driver === "Capacity" ? "Reallocate resources"
                                : "Resequence plan"
                              return (
                                <TableRow key={d.id} className="cursor-pointer hover:bg-blue-50" onClick={() => handleRowClick(d)}>
                                  <TableCell className="text-xs font-medium py-1.5">{d.program}</TableCell>
                                  <TableCell className="text-xs py-1.5">{d.clin}</TableCell>
                                  <TableCell className={`text-xs font-medium py-1.5 ${daysToContract < 14 ? "text-red-600" : daysToContract < 30 ? "text-yellow-600" : ""}`}>
                                    {daysToContract}d
                                  </TableCell>
                                  <TableCell className="py-1.5">
                                    <Badge variant="outline" className="text-[9px]" style={{ borderColor: DRIVER_COLORS[d.driver], color: DRIVER_COLORS[d.driver] }}>
                                      {d.driver}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs py-1.5">{d.supplier}</TableCell>
                                  <TableCell className="py-1.5">
                                    <Badge variant={d.otdStatus === "Late" ? "destructive" : "secondary"} className="text-[9px]">
                                      {d.otdStatus}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs text-blue-600 py-1.5">{action}</TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                        {ownerItems.length > 6 && (
                          <p className="text-[10px] text-gray-500 mt-2 text-center">+ {ownerItems.length - 6} more items</p>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
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
        <SheetContent className="w-[550px] sm:w-[650px] overflow-y-auto">
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
