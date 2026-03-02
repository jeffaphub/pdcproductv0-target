"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ComposedChart, Cell } from "recharts"
import { Calendar, Filter, Download, X, ChevronRight, AlertTriangle, Clock, Package, Users, TrendingUp, Activity } from "lucide-react"
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
  "On-Time": "bg-green-100 text-green-800",
  Late: "bg-red-100 text-red-800",
  "At-Risk": "bg-yellow-100 text-yellow-800",
  Outstanding: "bg-gray-100 text-gray-800",
}

const fmtDate = (d: Date | null) => (d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-")
const fmtPct = (n: number) => `${n.toFixed(1)}%`

export function OTDTracking() {
  const [activeSubTab, setActiveSubTab] = useState<OTDSubTab>("overview")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState<OTDDelivery | null>(null)

  // Global Filters
  const [dateRange, setDateRange] = useState<string>("all")
  const [selectedSites, setSelectedSites] = useState<string[]>([])
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([])
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])
  const [selectedCommodities, setSelectedCommodities] = useState<string[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [timeBucket, setTimeBucket] = useState<TimeBucket>("Month")
  const [chartFilter, setChartFilter] = useState<{ driver?: DriverCategory; program?: string; supplier?: string } | null>(null)

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
    return result
  }, [allDeliveries, selectedSites, selectedPrograms, selectedSuppliers, selectedCommodities, selectedStatus, chartFilter])

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

  // Chart data
  const driverChartData = useMemo(() => {
    const drivers: DriverCategory[] = ["Supply", "MRB/RI", "Capacity", "Planning"]
    return drivers.map(driver => ({
      driver,
      count: filteredDeliveries.filter(d => d.driver === driver && (d.otdStatus === "At-Risk" || d.otdStatus === "Late")).length,
    }))
  }, [filteredDeliveries])

  const otdTrendData = useMemo(() => {
    return timeBuckets.map(b => ({
      bucket: b.bucket,
      otdPct: b.plannedDeliveries > 0 ? Math.round((b.onTimeCount / b.plannedDeliveries) * 100) : 0,
      atRisk: b.atRiskCount,
      late: b.lateCount,
    }))
  }, [timeBuckets])

  const programRiskData = useMemo(() => {
    const programMap = new Map<string, { Supply: number; "MRB/RI": number; Capacity: number; Planning: number }>()
    filteredDeliveries
      .filter(d => d.otdStatus === "At-Risk" || d.otdStatus === "Late")
      .forEach(d => {
        const entry = programMap.get(d.program) || { Supply: 0, "MRB/RI": 0, Capacity: 0, Planning: 0 }
        entry[d.driver]++
        programMap.set(d.program, entry)
      })
    return Array.from(programMap.entries())
      .map(([program, drivers]) => ({ program, ...drivers, total: drivers.Supply + drivers["MRB/RI"] + drivers.Capacity + drivers.Planning }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  }, [filteredDeliveries])

  const handleRowClick = (delivery: OTDDelivery) => {
    setSelectedDelivery(delivery)
    setDrawerOpen(true)
  }

  const handleChartClick = (data: any, type: "driver" | "program" | "supplier") => {
    if (!data) return
    if (type === "driver") setChartFilter({ driver: data.driver })
    else if (type === "program") setChartFilter({ program: data.program })
    else if (type === "supplier") setChartFilter({ supplier: data.supplier })
  }

  const resetFilters = () => {
    setSelectedSites([])
    setSelectedPrograms([])
    setSelectedSuppliers([])
    setSelectedCommodities([])
    setSelectedStatus("all")
    setChartFilter(null)
  }

  const subTabs: { id: OTDSubTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "program-manager", label: "Program Manager" },
    { id: "planner", label: "Production Control Planner" },
    { id: "supply-chain", label: "Supply Chain / Buyer" },
    { id: "quality", label: "Quality / MRB / Receiving" },
    { id: "siop", label: "SIOP" },
    { id: "supplier-otd", label: "Supplier OTD (Existing)" },
  ]

  // Top at-risk deliveries for tables
  const topAtRiskDeliveries = filteredDeliveries
    .filter(d => d.otdStatus === "At-Risk" || d.otdStatus === "Late")
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, 20)

  // Plan vs Contract alignment data
  const planAlignmentData = filteredDeliveries.slice(0, 30).map(d => ({
    ...d,
    contractDays: 0,
    iopDays: d.deltaDays,
    planDays: d.deliveryPlanDate ? Math.floor((d.deliveryPlanDate.getTime() - d.contractDate.getTime()) / (24 * 60 * 60 * 1000)) : 0,
    status: Math.abs(d.deltaDays) <= 7 ? "aligned" : d.deltaDays > 7 ? "behind" : "ahead",
  }))

  // MRB funnel data
  const mrbFunnelData: { step: MRBStep; count: number; avgAge: number }[] = [
    { step: "Receiving Inspection", count: mrbQueue.filter(m => m.currentStep === "Receiving Inspection").length, avgAge: 5.2 },
    { step: "MRB Review", count: mrbQueue.filter(m => m.currentStep === "MRB Review").length, avgAge: 8.7 },
    { step: "Disposition", count: mrbQueue.filter(m => m.currentStep === "Disposition").length, avgAge: 12.3 },
    { step: "Released", count: mrbQueue.filter(m => m.currentStep === "Released").length, avgAge: 0 },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">OTD Tracking</h1>
          <p className="text-sm text-gray-500 mt-1">On-Time Delivery performance by driver, program, and role</p>
        </div>
      </div>

      {/* Global Filter Bar */}
      <Card className="border border-gray-200">
        <CardContent className="py-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>

            <Select value={selectedSites[0] || "all"} onValueChange={v => setSelectedSites(v === "all" ? [] : [v])}>
              <SelectTrigger className="w-[140px] h-9 text-sm">
                <SelectValue placeholder="All Sites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                {sites.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={selectedPrograms[0] || "all"} onValueChange={v => setSelectedPrograms(v === "all" ? [] : [v])}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue placeholder="All Programs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {programs.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={selectedSuppliers[0] || "all"} onValueChange={v => setSelectedSuppliers(v === "all" ? [] : [v])}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue placeholder="All Suppliers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={selectedCommodities[0] || "all"} onValueChange={v => setSelectedCommodities(v === "all" ? [] : [v])}>
              <SelectTrigger className="w-[150px] h-9 text-sm">
                <SelectValue placeholder="All Commodities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Commodities</SelectItem>
                {commodities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[130px] h-9 text-sm">
                <SelectValue placeholder="OTD Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="On-Time">On-Time</SelectItem>
                <SelectItem value="Late">Late</SelectItem>
                <SelectItem value="At-Risk">At-Risk</SelectItem>
                <SelectItem value="Outstanding">Outstanding</SelectItem>
              </SelectContent>
            </Select>

            <Select value={timeBucket} onValueChange={v => setTimeBucket(v as TimeBucket)}>
              <SelectTrigger className="w-[110px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Week">Week</SelectItem>
                <SelectItem value="Month">Month</SelectItem>
                <SelectItem value="Quarter">Quarter</SelectItem>
              </SelectContent>
            </Select>

            {chartFilter && (
              <Badge variant="secondary" className="flex items-center gap-1">
                {chartFilter.driver || chartFilter.program || chartFilter.supplier}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setChartFilter(null)} />
              </Badge>
            )}

            <div className="flex-1" />

            <Button variant="outline" size="sm" onClick={resetFilters}>
              Reset
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sub-Tab Navigation */}
      <div className="flex gap-1 border-b border-gray-200">
        {subTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeSubTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-Tab Content */}
      {activeSubTab === "overview" && (
        <div className="space-y-6">
          {/* KPI Tiles */}
          <div className="grid grid-cols-6 gap-4">
            <Card className="border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedStatus("all")}>
              <CardContent className="pt-5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Overall OTD</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{fmtPct(kpis.overallOTD)}</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="pt-5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Forecasted OTD</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{fmtPct(kpis.forecastedOTD)}</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedStatus("At-Risk")}>
              <CardContent className="pt-5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">At-Risk (30 Days)</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{kpis.atRiskNext30}</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="pt-5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Avg Days Late</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{kpis.avgDaysLate}</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="pt-5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">MRB Holds</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{kpis.mrbHoldsImpacting}</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="pt-5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Plan Misalign</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{kpis.planMisalignments}</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-2 gap-6">
            <Card className="border border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">At-Risk by Driver</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={driverChartData} onClick={(e) => e?.activePayload && handleChartClick(e.activePayload[0]?.payload, "driver")}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="driver" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="At-Risk Count" radius={[4, 4, 0, 0]}>
                        {driverChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={DRIVER_COLORS[entry.driver]} cursor="pointer" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-blue-600 mt-2 cursor-pointer">Click a bar to filter by driver</p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">OTD Trend Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={otdTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} domain={[0, 100]} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="right" dataKey="atRisk" fill="#FBBF24" name="At-Risk" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="late" fill="#EF4444" name="Late" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="left" type="monotone" dataKey="otdPct" stroke="#10B981" strokeWidth={2} name="OTD %" dot={{ r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top At-Risk Table */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Top At-Risk Deliveries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-xs">Program</TableHead>
                      <TableHead className="font-semibold text-xs">Site</TableHead>
                      <TableHead className="font-semibold text-xs">CLIN</TableHead>
                      <TableHead className="font-semibold text-xs">Supplier</TableHead>
                      <TableHead className="font-semibold text-xs">Contract Date</TableHead>
                      <TableHead className="font-semibold text-xs">Promise Date</TableHead>
                      <TableHead className="font-semibold text-xs">Expected Date</TableHead>
                      <TableHead className="font-semibold text-xs">Status</TableHead>
                      <TableHead className="font-semibold text-xs">Driver</TableHead>
                      <TableHead className="font-semibold text-xs">Severity</TableHead>
                      <TableHead className="font-semibold text-xs">Escalate To</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topAtRiskDeliveries.slice(0, 10).map((d, i) => (
                      <TableRow key={d.id} className={`cursor-pointer hover:bg-blue-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`} onClick={() => handleRowClick(d)}>
                        <TableCell className="text-sm font-medium">{d.program}</TableCell>
                        <TableCell className="text-sm">{d.site}</TableCell>
                        <TableCell className="text-sm">{d.clin}</TableCell>
                        <TableCell className="text-sm">{d.supplier}</TableCell>
                        <TableCell className="text-sm">{fmtDate(d.contractDate)}</TableCell>
                        <TableCell className="text-sm">{fmtDate(d.promiseDate)}</TableCell>
                        <TableCell className="text-sm">{fmtDate(d.expectedDate)}</TableCell>
                        <TableCell><Badge className={STATUS_COLORS[d.otdStatus]}>{d.otdStatus}</Badge></TableCell>
                        <TableCell><Badge variant="outline" style={{ borderColor: DRIVER_COLORS[d.driver], color: DRIVER_COLORS[d.driver] }}>{d.driver}</Badge></TableCell>
                        <TableCell><Badge variant={d.severity === "Critical" ? "destructive" : "secondary"}>{d.severity}</Badge></TableCell>
                        <TableCell className="text-sm text-blue-600">{d.escalateTo}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeSubTab === "program-manager" && (
        <div className="space-y-6">
          {/* KPI Tiles */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="border border-gray-200">
              <CardContent className="pt-5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">OTD vs Contract</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{fmtPct(kpis.contractOTD)}</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200">
              <CardContent className="pt-5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">At-Risk (30/60 Days)</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{kpis.atRiskNext30} / {kpis.atRiskNext60}</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200">
              <CardContent className="pt-5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Dominant Driver</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">Supply</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200">
              <CardContent className="pt-5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Top Risky Programs</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{programRiskData.slice(0, 3).map(p => p.program).join(", ")}</p>
              </CardContent>
            </Card>
          </div>

          {/* Program Risk Chart */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">At-Risk Deliveries by Program (Stacked by Driver)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={programRiskData} layout="vertical" onClick={(e) => e?.activePayload && handleChartClick(e.activePayload[0]?.payload, "program")}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="program" type="category" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Supply" stackId="a" fill={DRIVER_COLORS.Supply} name="Supply" />
                    <Bar dataKey="MRB/RI" stackId="a" fill={DRIVER_COLORS["MRB/RI"]} name="MRB/RI" />
                    <Bar dataKey="Capacity" stackId="a" fill={DRIVER_COLORS.Capacity} name="Capacity" />
                    <Bar dataKey="Planning" stackId="a" fill={DRIVER_COLORS.Planning} name="Planning" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-blue-600 mt-2 cursor-pointer">Click a segment to filter by program and driver</p>
            </CardContent>
          </Card>

          {/* Escalation Table */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Escalation-Ready At-Risk List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-xs">Program</TableHead>
                      <TableHead className="font-semibold text-xs">CLIN</TableHead>
                      <TableHead className="font-semibold text-xs">Contract Date</TableHead>
                      <TableHead className="font-semibold text-xs">Expected Date</TableHead>
                      <TableHead className="font-semibold text-xs">Days Late</TableHead>
                      <TableHead className="font-semibold text-xs">Driver</TableHead>
                      <TableHead className="font-semibold text-xs">Severity</TableHead>
                      <TableHead className="font-semibold text-xs">Escalate To</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topAtRiskDeliveries.slice(0, 12).map((d, i) => (
                      <TableRow key={d.id} className={`cursor-pointer hover:bg-blue-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`} onClick={() => handleRowClick(d)}>
                        <TableCell className="text-sm font-medium">{d.program}</TableCell>
                        <TableCell className="text-sm">{d.clin}</TableCell>
                        <TableCell className="text-sm">{fmtDate(d.contractDate)}</TableCell>
                        <TableCell className="text-sm">{fmtDate(d.expectedDate)}</TableCell>
                        <TableCell className="text-sm font-medium text-red-600">{d.daysLate > 0 ? `+${d.daysLate}` : d.daysLate}</TableCell>
                        <TableCell><Badge variant="outline" style={{ borderColor: DRIVER_COLORS[d.driver], color: DRIVER_COLORS[d.driver] }}>{d.driver}</Badge></TableCell>
                        <TableCell><Badge variant={d.severity === "Critical" ? "destructive" : "secondary"}>{d.severity}</Badge></TableCell>
                        <TableCell className="text-sm text-blue-600 font-medium">{d.escalateTo}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeSubTab === "planner" && (
        <div className="space-y-6">
          {/* KPI Tiles */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="border border-gray-200">
              <CardContent className="pt-5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">% Ahead of Contract</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{planAlignmentData.filter(d => d.status === "ahead").length}</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200">
              <CardContent className="pt-5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">% Behind Contract</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{planAlignmentData.filter(d => d.status === "behind").length}</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200">
              <CardContent className="pt-5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Avg Delta Days</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{Math.round(planAlignmentData.reduce((sum, d) => sum + Math.abs(d.deltaDays), 0) / planAlignmentData.length)}</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200">
              <CardContent className="pt-5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Beyond Threshold</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{planAlignmentData.filter(d => Math.abs(d.deltaDays) > 14).length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Misaligned Items Table */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Plan vs Contract Misaligned Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-xs">CLIN</TableHead>
                      <TableHead className="font-semibold text-xs">Program</TableHead>
                      <TableHead className="font-semibold text-xs">Contract Date</TableHead>
                      <TableHead className="font-semibold text-xs">IOP Date</TableHead>
                      <TableHead className="font-semibold text-xs">Delivery Plan</TableHead>
                      <TableHead className="font-semibold text-xs">Delta Days</TableHead>
                      <TableHead className="font-semibold text-xs">Status</TableHead>
                      <TableHead className="font-semibold text-xs">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {planAlignmentData.filter(d => d.status !== "aligned").slice(0, 15).map((d, i) => (
                      <TableRow key={d.id} className={`cursor-pointer hover:bg-blue-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`} onClick={() => handleRowClick(d)}>
                        <TableCell className="text-sm font-medium">{d.clin}</TableCell>
                        <TableCell className="text-sm">{d.program}</TableCell>
                        <TableCell className="text-sm">{fmtDate(d.contractDate)}</TableCell>
                        <TableCell className="text-sm">{fmtDate(d.iopDate)}</TableCell>
                        <TableCell className="text-sm">{fmtDate(d.deliveryPlanDate)}</TableCell>
                        <TableCell className={`text-sm font-medium ${d.deltaDays > 0 ? "text-red-600" : "text-green-600"}`}>{d.deltaDays > 0 ? `+${d.deltaDays}` : d.deltaDays}</TableCell>
                        <TableCell><Badge className={d.status === "behind" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>{d.status}</Badge></TableCell>
                        <TableCell className="text-sm text-blue-600">Review plan</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeSubTab === "supply-chain" && (
        <div className="space-y-6">
          {/* KPI Tiles */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="border border-gray-200">
              <CardContent className="pt-5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">At-Risk (Supply Driver)</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{filteredDeliveries.filter(d => d.driver === "Supply" && d.otdStatus === "At-Risk").length}</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200">
              <CardContent className="pt-5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">POs Due (30 Days)</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{poLineRisks.length}</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200">
              <CardContent className="pt-5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Top Supplier Risk</p>
                <p className="text-lg font-bold text-red-600 mt-1">{supplierRisks[0]?.supplier || "N/A"}</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200">
              <CardContent className="pt-5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Expedite Candidates</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{poLineRisks.filter(p => p.recommendedAction === "Expedite").length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-6">
            <Card className="border border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Risk by Supplier (Pareto)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={supplierRisks.slice(0, 8)} onClick={(e) => e?.activePayload && handleChartClick(e.activePayload[0]?.payload, "supplier")}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="supplier" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="atRiskCount" fill="#3B82F6" name="At-Risk Count" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Risk by PO Line</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={poLineRisks.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="poNumber" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="atRiskDeliveries" fill="#F97316" name="At-Risk Deliveries" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* PO Action Table */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">PO Line Action List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-xs">PO Number</TableHead>
                      <TableHead className="font-semibold text-xs">Line</TableHead>
                      <TableHead className="font-semibold text-xs">Supplier</TableHead>
                      <TableHead className="font-semibold text-xs">Part Number</TableHead>
                      <TableHead className="font-semibold text-xs">At-Risk Deliveries</TableHead>
                      <TableHead className="font-semibold text-xs">Urgency</TableHead>
                      <TableHead className="font-semibold text-xs">Recommended Action</TableHead>
                      <TableHead className="font-semibold text-xs">Impacted CLINs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {poLineRisks.slice(0, 12).map((p, i) => (
                      <TableRow key={`${p.poNumber}-${p.poLine}`} className={`cursor-pointer hover:bg-blue-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                        <TableCell className="text-sm font-medium">{p.poNumber}</TableCell>
                        <TableCell className="text-sm">{p.poLine}</TableCell>
                        <TableCell className="text-sm">{p.supplier}</TableCell>
                        <TableCell className="text-sm">{p.partNumber}</TableCell>
                        <TableCell className="text-sm font-medium text-red-600">{p.atRiskDeliveries}</TableCell>
                        <TableCell><Badge variant={p.urgency === "Critical" ? "destructive" : "secondary"}>{p.urgency}</Badge></TableCell>
                        <TableCell className="text-sm text-blue-600 font-medium">{p.recommendedAction}</TableCell>
                        <TableCell className="text-sm">{p.impactedClins.slice(0, 2).join(", ")}{p.impactedClins.length > 2 ? `...` : ""}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeSubTab === "quality" && (
        <div className="space-y-6">
          {/* KPI Tiles */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="border border-gray-200">
              <CardContent className="pt-5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">At-Risk (MRB/RI)</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{mrbQueue.length}</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200">
              <CardContent className="pt-5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">WIP in Queue</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{mrbQueue.filter(m => m.currentStep !== "Released").length}</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200">
              <CardContent className="pt-5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Avg Queue Age</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{Math.round(mrbQueue.reduce((sum, m) => sum + m.queueAge, 0) / mrbQueue.length || 0)} days</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200">
              <CardContent className="pt-5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Total OTD Impact</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{mrbQueue.reduce((sum, m) => sum + m.impactScore, 0)}</p>
              </CardContent>
            </Card>
          </div>

          {/* MRB Funnel */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">MRB / Receiving Inspection Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4 py-8">
                {mrbFunnelData.map((step, i) => (
                  <div key={step.step} className="flex-1 text-center">
                    <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold text-white ${
                      step.step === "Receiving Inspection" ? "bg-blue-500" :
                      step.step === "MRB Review" ? "bg-orange-500" :
                      step.step === "Disposition" ? "bg-yellow-500" : "bg-green-500"
                    }`}>
                      {step.count}
                    </div>
                    <p className="mt-3 text-sm font-medium text-gray-900">{step.step}</p>
                    {step.avgAge > 0 && <p className="text-xs text-gray-500">Avg {step.avgAge} days</p>}
                    {i < mrbFunnelData.length - 1 && (
                      <ChevronRight className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-300" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Priority Worklist */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Priority Worklist (Sorted by OTD Impact)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-xs">Part/Lot</TableHead>
                      <TableHead className="font-semibold text-xs">NC Number</TableHead>
                      <TableHead className="font-semibold text-xs">Current Step</TableHead>
                      <TableHead className="font-semibold text-xs">CLINs Blocked</TableHead>
                      <TableHead className="font-semibold text-xs">Nearest Contract</TableHead>
                      <TableHead className="font-semibold text-xs">Impact Score</TableHead>
                      <TableHead className="font-semibold text-xs">Queue Age</TableHead>
                      <TableHead className="font-semibold text-xs">Target Disposition</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mrbQueue.slice(0, 12).map((m, i) => (
                      <TableRow key={m.id} className={`cursor-pointer hover:bg-blue-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                        <TableCell className="text-sm font-medium">{m.partNumber} / {m.lotNumber}</TableCell>
                        <TableCell className="text-sm">{m.ncNumber}</TableCell>
                        <TableCell><Badge variant="outline">{m.currentStep}</Badge></TableCell>
                        <TableCell className="text-sm">{m.clinsBlocked.join(", ")}</TableCell>
                        <TableCell className="text-sm">{fmtDate(m.nearestContractDate)}</TableCell>
                        <TableCell className="text-sm font-bold text-red-600">{m.impactScore}</TableCell>
                        <TableCell className="text-sm">{m.queueAge} days</TableCell>
                        <TableCell className="text-sm">{fmtDate(m.targetDispositionDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeSubTab === "siop" && (
        <div className="space-y-6">
          {/* KPI Tiles */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="border border-gray-200">
              <CardContent className="pt-5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Rolling OTD vs Contract</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{fmtPct(kpis.contractOTD)}</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200">
              <CardContent className="pt-5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Rolling OTD vs AOP</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{fmtPct(kpis.aopOTD)}</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200">
              <CardContent className="pt-5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Structural Gap Count</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{kpis.structuralGapCount}</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200">
              <CardContent className="pt-5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Worst Bucket</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{timeBuckets.sort((a, b) => b.gapMagnitude - a.gapMagnitude)[0]?.bucket || "N/A"}</p>
              </CardContent>
            </Card>
          </div>

          {/* Time Bucket Chart */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">On-Time vs Contract Requirement by {timeBucket}</CardTitle>
                <Select value={timeBucket} onValueChange={v => setTimeBucket(v as TimeBucket)}>
                  <SelectTrigger className="w-[100px] h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Week">Week</SelectItem>
                    <SelectItem value="Month">Month</SelectItem>
                    <SelectItem value="Quarter">Quarter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={timeBuckets}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="onTimeCount" fill="#10B981" name="On-Time" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="lateCount" fill="#EF4444" name="Late" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="atRiskCount" fill="#FBBF24" name="At-Risk" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="aopTarget" stroke="#3B82F6" strokeWidth={2} strokeDasharray="5 5" name="AOP Target" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Driver Heatmap Table */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Time Bucket x Driver Heatmap</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-xs">Bucket</TableHead>
                      <TableHead className="font-semibold text-xs text-center">Supply</TableHead>
                      <TableHead className="font-semibold text-xs text-center">MRB/RI</TableHead>
                      <TableHead className="font-semibold text-xs text-center">Capacity</TableHead>
                      <TableHead className="font-semibold text-xs text-center">Planning</TableHead>
                      <TableHead className="font-semibold text-xs">Gap</TableHead>
                      <TableHead className="font-semibold text-xs">Dominant Driver</TableHead>
                      <TableHead className="font-semibold text-xs">Suggested Lever</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeBuckets.map((b, i) => (
                      <TableRow key={b.bucket} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                        <TableCell className="text-sm font-medium">{b.bucket}</TableCell>
                        <TableCell className="text-center"><span className={`inline-block px-2 py-1 rounded text-xs font-medium ${b.supplyDriverCount > 5 ? "bg-red-100 text-red-800" : b.supplyDriverCount > 2 ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>{b.supplyDriverCount}</span></TableCell>
                        <TableCell className="text-center"><span className={`inline-block px-2 py-1 rounded text-xs font-medium ${b.mrbDriverCount > 5 ? "bg-red-100 text-red-800" : b.mrbDriverCount > 2 ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>{b.mrbDriverCount}</span></TableCell>
                        <TableCell className="text-center"><span className={`inline-block px-2 py-1 rounded text-xs font-medium ${b.capacityDriverCount > 5 ? "bg-red-100 text-red-800" : b.capacityDriverCount > 2 ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>{b.capacityDriverCount}</span></TableCell>
                        <TableCell className="text-center"><span className={`inline-block px-2 py-1 rounded text-xs font-medium ${b.planningDriverCount > 5 ? "bg-red-100 text-red-800" : b.planningDriverCount > 2 ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>{b.planningDriverCount}</span></TableCell>
                        <TableCell className={`text-sm font-medium ${b.gapMagnitude > 0 ? "text-red-600" : "text-green-600"}`}>{b.gapMagnitude > 0 ? `+${b.gapMagnitude}` : b.gapMagnitude}</TableCell>
                        <TableCell><Badge variant="outline" style={{ borderColor: DRIVER_COLORS[b.dominantDriver], color: DRIVER_COLORS[b.dominantDriver] }}>{b.dominantDriver}</Badge></TableCell>
                        <TableCell className="text-sm text-blue-600">{b.dominantDriver === "Supply" ? "Expedite POs" : b.dominantDriver === "MRB/RI" ? "Prioritize MRB" : b.dominantDriver === "Capacity" ? "Add capacity" : "Adjust IOP"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeSubTab === "supplier-otd" && <SupplierOTD />}

      {/* Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
          {selectedDelivery && (
            <>
              <SheetHeader>
                <SheetTitle className="text-lg font-bold">Delivery Detail: {selectedDelivery.clin}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* Timeline */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Timeline</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-gray-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Contract Date</p>
                        <p className="text-sm text-gray-500">{fmtDate(selectedDelivery.contractDate)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Promise Date</p>
                        <p className="text-sm text-gray-500">{fmtDate(selectedDelivery.promiseDate)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Expected Date</p>
                        <p className="text-sm text-gray-500">{fmtDate(selectedDelivery.expectedDate)}</p>
                      </div>
                    </div>
                    {selectedDelivery.actualDate && (
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Actual Date</p>
                          <p className="text-sm text-gray-500">{fmtDate(selectedDelivery.actualDate)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-500">Program:</span> <span className="font-medium">{selectedDelivery.program}</span></div>
                    <div><span className="text-gray-500">Site:</span> <span className="font-medium">{selectedDelivery.site}</span></div>
                    <div><span className="text-gray-500">Supplier:</span> <span className="font-medium">{selectedDelivery.supplier}</span></div>
                    <div><span className="text-gray-500">Commodity:</span> <span className="font-medium">{selectedDelivery.commodity}</span></div>
                    <div><span className="text-gray-500">PO Number:</span> <span className="font-medium">{selectedDelivery.poNumber}</span></div>
                    <div><span className="text-gray-500">Part Number:</span> <span className="font-medium">{selectedDelivery.partNumber}</span></div>
                    <div><span className="text-gray-500">Driver:</span> <Badge variant="outline" style={{ borderColor: DRIVER_COLORS[selectedDelivery.driver], color: DRIVER_COLORS[selectedDelivery.driver] }}>{selectedDelivery.driver}</Badge></div>
                    <div><span className="text-gray-500">Severity:</span> <Badge variant={selectedDelivery.severity === "Critical" ? "destructive" : "secondary"}>{selectedDelivery.severity}</Badge></div>
                  </div>
                </div>

                {/* Change History */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Changes</h3>
                  <div className="space-y-2">
                    {selectedDelivery.changeHistory.map((ch, i) => (
                      <div key={i} className="text-sm p-2 bg-gray-50 rounded">
                        <p className="text-gray-500">{fmtDate(ch.date)}</p>
                        <p><span className="font-medium">{ch.field}</span>: {ch.from} → {ch.to}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Escalation */}
                <div className="pt-4 border-t">
                  <p className="text-sm"><span className="text-gray-500">Escalate to:</span> <span className="font-medium text-blue-600">{selectedDelivery.escalateTo}</span></p>
                  <Button className="mt-3 w-full" variant="default">Create Escalation</Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
