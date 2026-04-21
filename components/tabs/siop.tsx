"use client"

import { useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, AreaChart, Area, ScatterChart, Scatter, ZAxis, Cell,
  ComposedChart, ReferenceLine, ReferenceArea,
} from "recharts"
import {
  X, Download, ChevronRight, ChevronDown, Filter, RotateCcw,
  AlertTriangle, CheckCircle2, Clock, ShieldAlert, Package, Search,
  TrendingUp, TrendingDown, DollarSign, Target, Truck, Factory,
  Users, Zap, Play, Save, Copy, Trash2, Plus, Minus, ArrowUpDown,
  Info, ExternalLink, Layers, BarChart3, Activity, Shield, Eye, EyeOff,
  Bookmark, ArrowRight, CircleDot, Hash, Gauge, Crosshair,
} from "lucide-react"
import {
  generateSIOPOrders, generateDemandBuckets, generatePlantRisks,
  generateConstraintDrivers, generateShortages, generateSupplierProfiles,
  generateCapacityBuckets, generateContractRules, baselineScenario,
  plants, customers, programs, commodities, suppliers, buyerCodes, workcells,
  type SIOPOrder, type DemandBucket, type PlantRisk, type ShortageRow,
  type SupplierProfile, type CapacityBucket, type ContractRule,
  type Persona, type Horizon, type TimeBucket, type AllocationStrategy,
  type ScenarioAction, type ScenarioResult, type SeverityLevel,
} from "@/lib/siop-data"

// ---- Helpers ----
const fmt$ = (n: number) => n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${n.toFixed(0)}`
const fmtN = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K` : `${n}`
const fmtPct = (n: number) => `${n.toFixed(1)}%`
const sevColor = (s: SeverityLevel) => s === "Critical" ? "bg-red-100 text-red-800 border-red-200" : s === "High" ? "bg-orange-100 text-orange-800 border-orange-200" : s === "Medium" ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-green-100 text-green-800 border-green-200"
const sevBg = (score: number) => score > 75 ? "#ef4444" : score > 50 ? "#f59e0b" : score > 25 ? "#fbbf24" : "#22c55e"
const shortBg = (v: number) => v < -20 ? "#ef4444" : v < -5 ? "#f97316" : v < 0 ? "#fbbf24" : v > 10 ? "#0d9488" : "#22c55e"
const shortFg = (v: number) => v < -5 ? "#fff" : v < 0 ? "#78350f" : "#fff"

// ---- Custom Tooltip ----
function BizTooltip({ active, payload, label, metric }: { active?: boolean; payload?: any[]; label?: string; metric?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 text-white rounded-lg p-2.5 text-[10px] shadow-xl border border-slate-700 max-w-[220px]">
      <p className="font-bold text-[11px] mb-1 text-slate-100">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex justify-between gap-3 py-0.5">
          <span className="text-slate-300 flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: p.color || p.fill }} />
            {p.name}
          </span>
          <span className="font-semibold">{typeof p.value === "number" && Math.abs(p.value) > 999 ? fmtN(p.value) : p.value}</span>
        </div>
      ))}
      {metric && <p className="text-slate-400 mt-1 pt-1 border-t border-slate-700 text-[9px]">{metric}</p>}
    </div>
  )
}

// ---- KPI Card ----
function KpiCard({ label, value, delta, sparkData, active, onClick, baseline, scenario }: {
  label: string; value: string; delta?: number; sparkData?: number[]; active?: boolean; onClick?: () => void; baseline?: string; scenario?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-[130px] p-2.5 rounded-lg border text-left transition-all ${active ? "border-blue-500 bg-blue-50/80 ring-1 ring-blue-200" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"}`}
    >
      <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      {baseline && scenario ? (
        <div className="mt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] text-slate-400 line-through">{baseline}</span>
            <ArrowRight className="w-2.5 h-2.5 text-slate-300" />
            <span className="text-sm font-bold text-slate-900">{scenario}</span>
          </div>
        </div>
      ) : (
        <p className="text-base font-bold text-slate-900 mt-0.5 leading-tight">{value}</p>
      )}
      <div className="flex items-center gap-2 mt-1">
        {delta !== undefined && (
          <span className={`text-[9px] font-bold ${delta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {delta >= 0 ? "+" : ""}{Math.abs(delta) > 999 ? fmt$(delta) : delta.toFixed(1)}{label.includes("%") ? "pp" : ""}
          </span>
        )}
        {sparkData && (
          <svg width={44} height={14} className="ml-auto">
            <polyline
              fill="none"
              stroke={delta !== undefined && delta >= 0 ? "#10b981" : "#ef4444"}
              strokeWidth={1.5}
              points={sparkData.map((v, i) => `${i * (44 / (sparkData.length - 1))},${14 - (v / Math.max(...sparkData)) * 12}`).join(" ")}
            />
          </svg>
        )}
      </div>
    </button>
  )
}

// ---- Severity Badge ----
function SevBadge({ severity, label }: { severity: SeverityLevel; label?: string }) {
  return <Badge className={`text-[8px] font-bold px-1.5 py-0 leading-4 ${sevColor(severity)}`}>{label || severity}</Badge>
}

// ---- Detail Drawer ----
function DetailDrawer({ order, onClose, onSimulate }: { order: SIOPOrder | null; onClose: () => void; onSimulate?: (o: SIOPOrder) => void }) {
  const [drawerTab, setDrawerTab] = useState<"overview" | "rootcause" | "impact" | "actions" | "scenario">("overview")
  if (!order) return null
  return (
    <div className="fixed inset-y-0 right-0 w-[440px] bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-slate-50">
        <div>
          <h3 className="text-xs font-bold text-slate-900">{order.orderId}</h3>
          <p className="text-[10px] text-slate-500">{order.customer} / {order.program}</p>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-slate-200 transition-colors"><X className="w-4 h-4" /></button>
      </div>

      {/* Drawer sub-tabs */}
      <div className="flex border-b border-slate-100 bg-white">
        {(["overview", "rootcause", "impact", "actions", "scenario"] as const).map(t => (
          <button key={t} onClick={() => setDrawerTab(t)} className={`flex-1 py-2 text-[9px] font-semibold uppercase tracking-wider transition-colors ${drawerTab === t ? "text-blue-700 border-b-2 border-blue-600 bg-blue-50/50" : "text-slate-400 hover:text-slate-600"}`}>
            {t === "rootcause" ? "Root Cause" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {drawerTab === "overview" && (
          <>
            <div className="flex gap-2 flex-wrap">
              <SevBadge severity={order.severity} />
              <Badge variant="outline" className="text-[8px]">{order.riskType}</Badge>
              <Badge variant="outline" className={`text-[8px] ${order.status === "Open" ? "border-blue-200 text-blue-700" : order.status === "Escalated" ? "border-red-200 text-red-700" : order.status === "In Progress" ? "border-amber-200 text-amber-700" : "border-green-200 text-green-700"}`}>{order.status}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["CLIN", order.clin], ["Plant", order.plant.split(" - ")[1]], ["Supplier", order.supplier],
                ["Commodity", order.commodity], ["Sub-Assy", order.subAssembly], ["Buyer", order.buyerCode],
                ["Workcell", order.workcell], ["Qty", `${order.qty} units`],
                ["Need Date", order.needDate], ["Promise Date", order.promiseDate],
                ["Contract Date", order.contractDate], ["Projected", order.projectedDate],
                ["Severity", order.severityDays > 0 ? `${order.severityDays}d late` : "On-time"],
                ["Owner", order.owner],
              ].map(([label, val]) => (
                <div key={label as string} className="bg-slate-50 rounded px-2 py-1.5">
                  <p className="text-[8px] text-slate-400 uppercase font-semibold">{label}</p>
                  <p className="text-[11px] font-semibold text-slate-800">{val}</p>
                </div>
              ))}
            </div>
          </>
        )}
        {drawerTab === "rootcause" && (
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
              <p className="text-[9px] font-bold text-amber-800 uppercase mb-1">Primary Root Cause</p>
              <p className="text-xs text-slate-800 leading-relaxed">{order.rootCause}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-500 uppercase mb-1.5">Impacted Parts</p>
              <div className="flex flex-wrap gap-1">
                {order.impactedParts.map(p => <Badge key={p} variant="outline" className="text-[9px] font-mono">{p}</Badge>)}
              </div>
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-500 uppercase mb-1.5">Constraint Chain</p>
              <div className="space-y-1">
                {["Supplier capacity limit", "Raw material shortage", "Lead time exceeds window"].map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] text-slate-700 bg-slate-50 p-2 rounded">
                    <span className="w-4 h-4 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[8px] font-bold flex-shrink-0">{i + 1}</span>
                    {c}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {drawerTab === "impact" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Revenue at Risk", fmt$(order.revenueAtRisk), "text-red-700"],
                ["Penalty Exposure", fmt$(order.penaltyExposure), "text-red-700"],
                ["Margin Impact", `${(order.margin * 100).toFixed(0)}% margin`, "text-slate-800"],
                ["Total Revenue", fmt$(order.totalRevenue), "text-slate-800"],
              ].map(([label, val, color]) => (
                <div key={label as string} className="bg-slate-50 rounded-lg p-2.5">
                  <p className="text-[8px] text-slate-400 uppercase font-semibold">{label}</p>
                  <p className={`text-sm font-bold ${color}`}>{val}</p>
                </div>
              ))}
            </div>
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-[10px]">
              <p className="font-bold text-red-800 mb-1">Penalty Threshold</p>
              <p className="text-slate-700">Grace period: <span className="font-bold">{order.penaltyThresholdDays}d</span> | Rate: <span className="font-bold">{fmt$(order.penaltyRate)}/day</span></p>
              {order.severityDays > order.penaltyThresholdDays && (
                <p className="text-red-700 font-bold mt-1">THRESHOLD BREACHED by {order.severityDays - order.penaltyThresholdDays}d</p>
              )}
            </div>
          </div>
        )}
        {drawerTab === "actions" && (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <p className="text-[9px] font-bold text-blue-800 uppercase mb-1">Recommended Action</p>
              <p className="text-xs text-slate-800">{order.recommendedAction}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-slate-50 p-2.5 rounded-lg"><p className="text-slate-400 text-[8px] uppercase">Est. Cost</p><p className="font-bold text-red-600 text-sm">{fmt$(order.estimatedMitigationCost)}</p></div>
              <div className="bg-slate-50 p-2.5 rounded-lg"><p className="text-slate-400 text-[8px] uppercase">Penalty Avoided</p><p className="font-bold text-emerald-600 text-sm">{fmt$(order.penaltyAvoided)}</p></div>
              <div className="bg-slate-50 p-2.5 rounded-lg"><p className="text-slate-400 text-[8px] uppercase">Net Value</p><p className="font-bold text-sm">{fmt$(order.netValuePreserved)}</p></div>
              <div className="bg-slate-50 p-2.5 rounded-lg"><p className="text-slate-400 text-[8px] uppercase">OTIF Delta</p><p className={`font-bold text-sm ${order.otifDelta >= 0 ? "text-emerald-600" : "text-red-600"}`}>{order.otifDelta >= 0 ? "+" : ""}{order.otifDelta.toFixed(1)}%</p></div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px]"><Eye className="w-3 h-3 mr-1" />View Shortage</Button>
              <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px]"><Shield className="w-3 h-3 mr-1" />Contract Impact</Button>
            </div>
            <Button size="sm" variant="outline" className="w-full h-7 text-[10px]"><Users className="w-3 h-3 mr-1" />Assign Owner</Button>
          </div>
        )}
        {drawerTab === "scenario" && (
          <div className="space-y-3">
            <p className="text-[10px] text-slate-500">Simulate the recommended action for this order to see projected impact across the portfolio.</p>
            <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-8" onClick={() => onSimulate?.(order)}>
              <Play className="w-3 h-3 mr-1" /> Simulate This Action
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ===== MAIN COMPONENT =====
export function SIOPDashboard() {
  // Global filters
  const [persona, setPersona] = useState<Persona>("Enterprise SIOP Lead")
  const [horizon, setHorizon] = useState<Horizon>("0-90")
  const [timeBucket, setTimeBucket] = useState<TimeBucket>("Week")
  const [selectedPlant, setSelectedPlant] = useState("All")
  const [selectedCustomer, setSelectedCustomer] = useState("All")
  const [selectedProgram, setSelectedProgram] = useState("All")
  const [selectedCommodity, setSelectedCommodity] = useState("All")
  const [selectedSupplier, setSelectedSupplier] = useState("All")
  const [selectedBuyerCode, setSelectedBuyerCode] = useState("All")
  const [selectedWorkcell, setSelectedWorkcell] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeKpi, setActiveKpi] = useState<string | null>(null)
  const [activeSubTab, setActiveSubTab] = useState("control-tower")
  const [drawerOrder, setDrawerOrder] = useState<SIOPOrder | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Control Tower state
  const [reconView, setReconView] = useState<"summary" | "detail">("summary")
  const [gapMetric, setGapMetric] = useState<"units" | "revenue">("units")
  const [riskMetric, setRiskMetric] = useState<"riskScore" | "gapUnits" | "otifRisk">("riskScore")
  const [riskSort, setRiskSort] = useState<"risk" | "alpha">("risk")
  const [constraintFilter, setConstraintFilter] = useState<string | null>(null)
  const [clickedPeriod, setClickedPeriod] = useState<string | null>(null)

  // Scenario state
  const [scenarioName, setScenarioName] = useState("Scenario A")
  const [scenarioActions, setScenarioActions] = useState<ScenarioAction[]>([])
  const [savedScenarios, setSavedScenarios] = useState<{ name: string; result: ScenarioResult }[]>([])

  // Generate data once
  const allOrders = useMemo(() => generateSIOPOrders(), [])
  const demandBuckets = useMemo(() => generateDemandBuckets(), [])
  const plantRisks = useMemo(() => generatePlantRisks(), [])
  const constraintDrivers = useMemo(() => generateConstraintDrivers(), [])
  const shortages = useMemo(() => generateShortages(), [])
  const supplierProfiles = useMemo(() => generateSupplierProfiles(), [])
  const capacityBuckets = useMemo(() => generateCapacityBuckets(), [])
  const contractRules = useMemo(() => generateContractRules(), [])

  // Filtered orders
  const filteredOrders = useMemo(() => {
    let o = [...allOrders]
    if (selectedPlant !== "All") o = o.filter(x => x.plant === selectedPlant)
    if (selectedCustomer !== "All") o = o.filter(x => x.customer === selectedCustomer)
    if (selectedProgram !== "All") o = o.filter(x => x.program === selectedProgram)
    if (selectedCommodity !== "All") o = o.filter(x => x.commodity === selectedCommodity)
    if (selectedSupplier !== "All") o = o.filter(x => x.supplier === selectedSupplier)
    if (selectedBuyerCode !== "All") o = o.filter(x => x.buyerCode === selectedBuyerCode)
    if (selectedWorkcell !== "All") o = o.filter(x => x.workcell === selectedWorkcell)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      o = o.filter(x => x.orderId.toLowerCase().includes(q) || x.customer.toLowerCase().includes(q) || x.program.toLowerCase().includes(q) || x.supplier.toLowerCase().includes(q) || x.clin.toLowerCase().includes(q))
    }
    if (activeKpi === "revenue") o = o.filter(x => x.revenueAtRisk > 0)
    if (activeKpi === "penalty") o = o.filter(x => x.penaltyExposure > 0)
    if (activeKpi === "otif") o = o.filter(x => x.severityDays > 0)
    if (constraintFilter) o = o.filter(x => x.riskType.toLowerCase().includes(constraintFilter.toLowerCase().split(" ")[0]))
    return o
  }, [allOrders, selectedPlant, selectedCustomer, selectedProgram, selectedCommodity, selectedSupplier, selectedBuyerCode, selectedWorkcell, searchQuery, activeKpi, constraintFilter])

  // KPI computations
  const kpis = useMemo(() => {
    const totalDemand = filteredOrders.reduce((s, o) => s + o.qty, 0)
    const totalRev = filteredOrders.reduce((s, o) => s + o.totalRevenue, 0)
    const revAtRisk = filteredOrders.reduce((s, o) => s + o.revenueAtRisk, 0)
    const penaltyExp = filteredOrders.reduce((s, o) => s + o.penaltyExposure, 0)
    const onTimeCount = filteredOrders.filter(o => o.severityDays === 0).length
    const otif = filteredOrders.length > 0 ? (onTimeCount / filteredOrders.length) * 100 : 100
    const mitCost = filteredOrders.reduce((s, o) => s + o.estimatedMitigationCost, 0)
    return { totalDemand, totalRev, revAtRisk, penaltyExp, otif, supCoverage: 76.3, capUtil: 78.5, mitCost, netValue: penaltyExp - mitCost }
  }, [filteredOrders])

  const sparkDemand = [320, 340, 310, 360, 380, 350, 370, 390]
  const sparkOtif = [88, 86, 84, 82, 83, 81, 82, 82]
  const sparkRev = [2.1, 2.4, 2.8, 3.2, 2.9, 3.1, 3.4, 3.2]

  // Scenario toggle for reconciliation chart
  const [reconScenario, setReconScenario] = useState<"base" | "upside" | "downside">("base")

  // Filtered demand/capacity data (with full SIOP composition)
  const filteredDemand = useMemo(() => {
    const sumField = (group: DemandBucket[], key: keyof DemandBucket) => group.reduce((s, b) => s + (b[key] as number), 0)
    if (selectedPlant === "All") {
      const periods = [...new Set(demandBuckets.map(b => b.period))]
      return periods.map(p => {
        const g = demandBuckets.filter(b => b.period === p)
        return {
          period: p,
          firmOrders: sumField(g, "firmOrders"),
          forecastBaseline: sumField(g, "forecastBaseline"),
          pipelineUpside: sumField(g, "pipelineUpside"),
          customerSharedFcst: sumField(g, "customerSharedFcst"),
          programRamp: sumField(g, "programRamp"),
          scenarioOverlay: sumField(g, "scenarioOverlay"),
          totalDemand: sumField(g, "totalDemand"),
          // End-item fulfillment sources
          internalFinishedOutput: sumField(g, "internalFinishedOutput"),
          fgWipRelease: sumField(g, "fgWipRelease"),
          outsourcedFinishedOutput: sumField(g, "outsourcedFinishedOutput"),
          directBuyFinished: sumField(g, "directBuyFinished"),
          totalFeasibleSupply: sumField(g, "totalFeasibleSupply"),
          // Internal production feasibility drivers
          supplierReceipts: sumField(g, "supplierReceipts"),
          componentInventory: sumField(g, "componentInventory"),
          yieldScrapImpact: sumField(g, "yieldScrapImpact"),
          capacityConstraintImpact: sumField(g, "capacityConstraintImpact"),
          materialSupportedBuild: sumField(g, "materialSupportedBuild"),
          capacitySupportedBuild: sumField(g, "capacitySupportedBuild"),
          // Legacy compat
          inventoryRelease: sumField(g, "inventoryRelease"),
          internalProduction: sumField(g, "internalProduction"),
          outsourceContrib: sumField(g, "outsourceContrib"),
          constrainedThroughput: sumField(g, "constrainedThroughput"),
          committedSupply: sumField(g, "committedSupply"),
          quotedCapacity: sumField(g, "quotedCapacity"),
          demonstratedMax: sumField(g, "demonstratedMax"),
          gap: sumField(g, "gap"),
          demandAssumptions: g.flatMap(b => b.demandAssumptions).slice(0, 4),
          supplyAssumptions: g.flatMap(b => b.supplyAssumptions).slice(0, 4),
          supplyConstraints: g.flatMap(b => b.supplyConstraints).slice(0, 4),
          // Demand confidence
          demandFirmPct: Math.round(g.reduce((s, b) => s + b.demandFirmPct, 0) / g.length),
          demandForecastPct: Math.round(g.reduce((s, b) => s + b.demandForecastPct, 0) / g.length),
          demandAssumptionPct: Math.round(g.reduce((s, b) => s + b.demandAssumptionPct, 0) / g.length),
          movableDemand: sumField(g, "movableDemand"),
          nonMovableDemand: sumField(g, "nonMovableDemand"),
          firmOrdersUpside: sumField(g, "firmOrdersUpside"),
          firmOrdersDownside: sumField(g, "firmOrdersDownside"),
          totalDemandUpside: sumField(g, "totalDemandUpside"),
          totalDemandDownside: sumField(g, "totalDemandDownside"),
          totalSupplyUpside: sumField(g, "totalSupplyUpside"),
          totalSupplyDownside: sumField(g, "totalSupplyDownside"),
          plant: "All",
        }
      })
    }
    return demandBuckets.filter(b => b.plant === selectedPlant)
  }, [demandBuckets, selectedPlant])

  // Shortage state
  const [shortageGroupBy, setShortageGroupBy] = useState<"Part" | "Commodity" | "Supplier">("Part")
  const [selectedShortage, setSelectedShortage] = useState<ShortageRow | null>(null)
  const [allocStrategy, setAllocStrategy] = useState<AllocationStrategy>("highest-revenue")
  const [shortageShowOnly, setShortageShowOnly] = useState(false)
  const [shortageSort, setShortageSort] = useState<"severity" | "revenue">("severity")

  // Supplier tab state
  const [selectedSupProfile, setSelectedSupProfile] = useState<SupplierProfile | null>(null)
  const [supSimCapChange, setSupSimCapChange] = useState(0)
  const [supSimOutage, setSupSimOutage] = useState(0)
  const [supRiskYAxis, setSupRiskYAxis] = useState<"revenue" | "penalty">("revenue")

  // Capacity tab state
  const [capPlant, setCapPlant] = useState(plants[0])
  const [capLine, setCapLine] = useState("All")
  const [simOvertimeShift, setSimOvertimeShift] = useState(false)
  const [simWeekendOT, setSimWeekendOT] = useState(false)
  const [simAddMachine, setSimAddMachine] = useState(false)
  const [simOutsource, setSimOutsource] = useState(0)

  // Demand tab state
  const [demandDim, setDemandDim] = useState<"enterprise" | "plant" | "customer" | "program">("enterprise")

  // Scenario tab state
  const [scenNewOrderQty, setScenNewOrderQty] = useState(50)
  const [scenSupCapChange, setScenSupCapChange] = useState(0)
  const [scenOvertimeHrs, setScenOvertimeHrs] = useState(0)
  const [scenTradeoffY, setScenTradeoffY] = useState<"otif" | "penalty">("otif")

  // Contract tab state
  const [contractSearch, setContractSearch] = useState("")
  const [penaltyView, setPenaltyView] = useState<"customer" | "plant" | "clin">("customer")

  const activeFilterCount = [selectedPlant, selectedCustomer, selectedProgram, selectedCommodity, selectedSupplier, selectedBuyerCode, selectedWorkcell].filter(v => v !== "All").length + (searchQuery ? 1 : 0)

  const resetFilters = useCallback(() => {
    setSelectedPlant("All"); setSelectedCustomer("All"); setSelectedProgram("All")
    setSelectedCommodity("All"); setSelectedSupplier("All"); setSelectedBuyerCode("All")
    setSelectedWorkcell("All"); setSearchQuery(""); setActiveKpi(null); setConstraintFilter(null); setClickedPeriod(null)
  }, [])

  const addScenarioAction = useCallback((type: string, desc: string, param: string, value: number) => {
    setScenarioActions(prev => [...prev, { id: `act-${Date.now()}`, type, description: desc, parameter: param, value }])
  }, [])

  // ---- RENDER ----
  return (
    <div className="space-y-3 relative">
      {/* DETAIL DRAWER */}
      {drawerOrder && <DetailDrawer order={drawerOrder} onClose={() => setDrawerOrder(null)} onSimulate={(o) => {
        addScenarioAction("simulate", o.recommendedAction, o.orderId, 1)
        setActiveSubTab("scenario")
        setDrawerOrder(null)
      }} />}
      {drawerOrder && <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setDrawerOrder(null)} />}

      {/* ===== GLOBAL DECISION CONTROL BAR ===== */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Persona */}
            <Select value={persona} onValueChange={v => setPersona(v as Persona)}>
              <SelectTrigger className="w-[170px] h-7 text-[10px] font-semibold bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Enterprise SIOP Lead", "Plant GM", "Buyer/Commodity Manager", "Production Control", "Program Manager"].map(p =>
                  <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                )}
              </SelectContent>
            </Select>
            <div className="w-px h-5 bg-slate-200" />
            {/* Horizon */}
            <Select value={horizon} onValueChange={v => { setHorizon(v as Horizon); setTimeBucket(v === "0-30" ? "Week" : v === "0-90" ? "Week" : v === "90d-24m" ? "Month" : "Quarter") }}>
              <SelectTrigger className="w-[90px] h-7 text-[10px] bg-slate-50"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["0-30", "0-90", "90d-24m", "2-5y"] as Horizon[]).map(h =>
                  <SelectItem key={h} value={h} className="text-xs">{h === "0-30" ? "0-30d" : h === "0-90" ? "0-90d" : h === "90d-24m" ? "90d-24m" : "2-5y"}</SelectItem>
                )}
              </SelectContent>
            </Select>
            {/* Time bucket */}
            <Select value={timeBucket} onValueChange={v => setTimeBucket(v as TimeBucket)}>
              <SelectTrigger className="w-[80px] h-7 text-[10px] bg-slate-50"><SelectValue /></SelectTrigger>
              <SelectContent>{(["Week", "Month", "Quarter"] as TimeBucket[]).map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
            </Select>
            <div className="w-px h-5 bg-slate-200" />
            {/* Plant */}
            <Select value={selectedPlant} onValueChange={setSelectedPlant}>
              <SelectTrigger className="w-[140px] h-7 text-[10px]"><SelectValue placeholder="Plant" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All" className="text-xs">All Plants</SelectItem>
                {plants.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
              </SelectContent>
            </Select>
            {/* Customer */}
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger className="w-[145px] h-7 text-[10px]"><SelectValue placeholder="Customer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All" className="text-xs">All Customers</SelectItem>
                {customers.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
              </SelectContent>
            </Select>
            {/* Program */}
            <Select value={selectedProgram} onValueChange={setSelectedProgram}>
              <SelectTrigger className="w-[130px] h-7 text-[10px]"><SelectValue placeholder="Program" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All" className="text-xs">All Programs</SelectItem>
                {programs.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Toggle extra filters */}
            <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-3 h-3" />
              {showFilters ? "Less" : "More"}
              {activeFilterCount > 3 && <Badge className="text-[8px] bg-blue-100 text-blue-700 ml-1">{activeFilterCount}</Badge>}
            </Button>

            {/* Search */}
            <div className="relative ml-auto">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <Input placeholder="Part / Order / Supplier..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-7 text-[10px] pl-7 w-[170px] bg-slate-50" />
            </div>
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 text-[10px]"><RotateCcw className="w-3 h-3 mr-1" />Reset</Button>
            <Button variant="outline" size="sm" className="h-7 text-[10px]"><Bookmark className="w-3 h-3 mr-1" />Save View</Button>
          </div>

          {/* Extended filters row */}
          {showFilters && (
            <div className="flex items-center gap-1.5 flex-wrap mt-2 pt-2 border-t border-slate-100">
              <Select value={selectedCommodity} onValueChange={setSelectedCommodity}>
                <SelectTrigger className="w-[130px] h-7 text-[10px]"><SelectValue placeholder="Commodity" /></SelectTrigger>
                <SelectContent><SelectItem value="All" className="text-xs">All Commodities</SelectItem>{commodities.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger className="w-[130px] h-7 text-[10px]"><SelectValue placeholder="Supplier" /></SelectTrigger>
                <SelectContent><SelectItem value="All" className="text-xs">All Suppliers</SelectItem>{suppliers.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={selectedBuyerCode} onValueChange={setSelectedBuyerCode}>
                <SelectTrigger className="w-[100px] h-7 text-[10px]"><SelectValue placeholder="Buyer" /></SelectTrigger>
                <SelectContent><SelectItem value="All" className="text-xs">All Buyers</SelectItem>{buyerCodes.map(b => <SelectItem key={b} value={b} className="text-xs">{b}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={selectedWorkcell} onValueChange={setSelectedWorkcell}>
                <SelectTrigger className="w-[120px] h-7 text-[10px]"><SelectValue placeholder="Workcell" /></SelectTrigger>
                <SelectContent><SelectItem value="All" className="text-xs">All Workcells</SelectItem>{workcells.map(w => <SelectItem key={w} value={w} className="text-xs">{w}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}

          {/* Active scenario / context badges */}
          <div className="flex items-center gap-1.5 mt-2">
            <Badge variant="outline" className="text-[9px] bg-blue-50 border-blue-200 text-blue-700 font-semibold">Baseline Active</Badge>
            {savedScenarios.map(s => (
              <Badge key={s.name} variant="outline" className="text-[9px] bg-slate-50 cursor-pointer hover:bg-slate-100">{s.name}</Badge>
            ))}
            {constraintFilter && (
              <Badge variant="outline" className="text-[9px] bg-amber-50 border-amber-200 text-amber-700 cursor-pointer" onClick={() => setConstraintFilter(null)}>
                Constraint: {constraintFilter} <X className="w-2.5 h-2.5 ml-1" />
              </Badge>
            )}
            {clickedPeriod && (
              <Badge variant="outline" className="text-[9px] bg-teal-50 border-teal-200 text-teal-700 cursor-pointer" onClick={() => setClickedPeriod(null)}>
                Period: {clickedPeriod} <X className="w-2.5 h-2.5 ml-1" />
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ===== GLOBAL KPI RIBBON ===== */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <KpiCard label="Total Demand" value={fmtN(kpis.totalDemand)} delta={12} sparkData={sparkDemand} active={activeKpi === "demand"} onClick={() => setActiveKpi(activeKpi === "demand" ? null : "demand")} />
        <KpiCard label="Supply Coverage %" value={fmtPct(kpis.supCoverage)} delta={-2.1} sparkData={[78, 77, 76, 75, 76, 76, 77, 76]} active={activeKpi === "coverage"} onClick={() => setActiveKpi(activeKpi === "coverage" ? null : "coverage")} />
        <KpiCard label="Capacity Util %" value={fmtPct(kpis.capUtil)} delta={3.2} sparkData={[74, 75, 76, 78, 77, 79, 78, 79]} active={activeKpi === "capacity"} onClick={() => setActiveKpi(activeKpi === "capacity" ? null : "capacity")} />
        <KpiCard label="Projected OTIF %" value={fmtPct(kpis.otif)} delta={-1.8} sparkData={sparkOtif} active={activeKpi === "otif"} onClick={() => setActiveKpi(activeKpi === "otif" ? null : "otif")} />
        <KpiCard label="Revenue at Risk" value={fmt$(kpis.revAtRisk)} delta={-400000} sparkData={sparkRev} active={activeKpi === "revenue"} onClick={() => setActiveKpi(activeKpi === "revenue" ? null : "revenue")} />
        <KpiCard label="Penalty Exposure" value={fmt$(kpis.penaltyExp)} delta={-120000} sparkData={[1.2, 1.4, 1.8, 2.1, 2.4, 2.8, 3.0, 3.2]} active={activeKpi === "penalty"} onClick={() => setActiveKpi(activeKpi === "penalty" ? null : "penalty")} />
        <KpiCard label="Mitigation Cost" value={fmt$(kpis.mitCost)} delta={50000} sparkData={[0.4, 0.5, 0.6, 0.5, 0.7, 0.8, 0.7, 0.8]} active={activeKpi === "mitigation"} onClick={() => setActiveKpi(activeKpi === "mitigation" ? null : "mitigation")} />
        <KpiCard label="Net Value" value={fmt$(kpis.netValue)} delta={kpis.netValue > 0 ? 1 : -1} sparkData={[1, 1.2, 1.5, 1.8, 2.0, 2.2, 2.4, 2.4]} active={activeKpi === "net"} onClick={() => setActiveKpi(activeKpi === "net" ? null : "net")} />
      </div>

      {/* ===== SUB-TABS ===== */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="bg-slate-100 h-8 overflow-x-auto flex-nowrap w-full justify-start">
          <TabsTrigger value="control-tower" className="text-[10px] whitespace-nowrap font-semibold">Executive Control Tower</TabsTrigger>
          <TabsTrigger value="shortage" className="text-[10px] whitespace-nowrap font-semibold">Shortage Map & Allocation</TabsTrigger>
          <TabsTrigger value="supplier" className="text-[10px] whitespace-nowrap font-semibold">Supplier Capacity & Supply</TabsTrigger>
          <TabsTrigger value="plant-capacity" className="text-[10px] whitespace-nowrap font-semibold">Plant Capacity Planning</TabsTrigger>
          <TabsTrigger value="demand" className="text-[10px] whitespace-nowrap font-semibold">Demand Planning & Forecast</TabsTrigger>
          <TabsTrigger value="scenario" className="text-[10px] whitespace-nowrap font-semibold">Scenario Simulator</TabsTrigger>
          <TabsTrigger value="contracts" className="text-[10px] whitespace-nowrap font-semibold">Contracts / Penalties</TabsTrigger>
        </TabsList>

        {/* ============= TAB 1: EXECUTIVE CONTROL TOWER ============= */}
        <TabsContent value="control-tower" className="space-y-3 mt-3">

          {/* ---- CURRENT FOCUS STRIP ---- */}
          {(clickedPeriod || selectedPlant !== "All" || constraintFilter || selectedProgram !== "All") && (() => {
            const focusOrders = filteredOrders.filter(o => {
              if (clickedPeriod) { /* period filter already applied via main filter */ }
              return true
            })
            const topPlant = selectedPlant !== "All" ? selectedPlant.split(" - ")[1] : (() => {
              const counts: Record<string, number> = {}
              focusOrders.forEach(o => { const p = o.plant.split(" - ")[1] || o.plant; counts[p] = (counts[p] || 0) + o.revenueAtRisk })
              return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "All"
            })()
            const topProgram = selectedProgram !== "All" ? selectedProgram.split(" ")[0] : (() => {
              const counts: Record<string, number> = {}
              focusOrders.forEach(o => { counts[o.program] = (counts[o.program] || 0) + o.revenueAtRisk })
              return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]?.split(" ")[0] || "-"
            })()
            const topConstraint = constraintFilter || (() => {
              const counts: Record<string, number> = {}
              focusOrders.forEach(o => { counts[o.riskType] = (counts[o.riskType] || 0) + 1 })
              return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-"
            })()
            const focusRev = focusOrders.reduce((s, o) => s + o.revenueAtRisk, 0)
            const focusPen = focusOrders.reduce((s, o) => s + o.penaltyExposure, 0)
            return (
              <Card className="border-blue-200 bg-blue-50/40">
                <CardContent className="p-2.5">
                  <div className="flex items-center gap-2">
                    <Crosshair className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Current Focus</span>
                    <div className="w-px h-4 bg-blue-200" />
                    <div className="flex items-center gap-3 flex-wrap text-[10px]">
                      <span className="text-slate-600">Period: <span className="font-bold text-slate-900">{clickedPeriod || "All"}</span></span>
                      <span className="text-slate-600">Plant: <span className="font-bold text-slate-900">{topPlant}</span></span>
                      <span className="text-slate-600">Program: <span className="font-bold text-slate-900">{topProgram}</span></span>
                      <span className="text-slate-600">Constraint: <span className="font-bold text-slate-900">{topConstraint}</span></span>
                      <div className="w-px h-4 bg-blue-200" />
                      <span className="text-red-700 font-bold">Rev at Risk: {fmt$(focusRev)}</span>
                      <span className="text-red-700 font-bold">Penalty: {fmt$(focusPen)}</span>
                    </div>
                    <button onClick={() => { setClickedPeriod(null); setConstraintFilter(null) }} className="ml-auto p-0.5 rounded hover:bg-blue-100"><X className="w-3 h-3 text-blue-400" /></button>
                  </div>
                </CardContent>
              </Card>
            )
          })()}

          {/* ---- ROW 1: Supply-Demand Reconciliation + Plant Risk ---- */}
          <div className="grid grid-cols-5 gap-3">
            {/* SIOP Supply-Demand Reconciliation Chart (two-layer) */}
            <Card className="col-span-3 border-slate-200">
              <CardHeader className="pb-1 pt-3 px-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-blue-600" />
                      Supply-Demand Reconciliation
                    </CardTitle>
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      {reconView === "summary"
                        ? "Base vs Peak demand with total supply overlay. Click a bar to drill into detailed composition."
                        : "Consensus demand plan (stacked up) vs end-item fulfillment sources (stacked down). Click a period to explain the gap."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Summary / Detail toggle */}
                    <div className="flex items-center gap-0.5 bg-slate-100 rounded-md p-0.5">
                      <button onClick={() => setReconView("summary")} className={`px-2 py-0.5 text-[8px] font-bold rounded ${reconView === "summary" ? "bg-white shadow-sm text-slate-800" : "text-slate-400 hover:text-slate-600"}`}>
                        Summary
                      </button>
                      <button onClick={() => setReconView("detail")} className={`px-2 py-0.5 text-[8px] font-bold rounded ${reconView === "detail" ? "bg-white shadow-sm text-slate-800" : "text-slate-400 hover:text-slate-600"}`}>
                        Detail
                      </button>
                    </div>
                    <div className="w-px h-4 bg-slate-200" />
                    {/* Scenario toggle */}
                    <div className="flex items-center gap-0.5 bg-slate-100 rounded-md p-0.5">
                      {(["base", "upside", "downside"] as const).map(s => (
                        <button key={s} onClick={() => setReconScenario(s)} className={`px-2 py-0.5 text-[8px] font-bold rounded capitalize ${reconScenario === s ? "bg-white shadow-sm text-slate-800" : "text-slate-400 hover:text-slate-600"}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                    {reconView === "detail" && (
                      <>
                        <div className="w-px h-4 bg-slate-200" />
                        {(["units", "revenue"] as const).map(m => (
                          <button key={m} onClick={() => setGapMetric(m)} className={`px-2 py-0.5 text-[9px] font-semibold rounded ${gapMetric === m ? "bg-blue-100 text-blue-700" : "text-slate-400 hover:text-slate-600"}`}>
                            {m === "units" ? "Units" : "Revenue"}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
                {/* Legend - changes based on view */}
                {reconView === "summary" ? (
                  <div className="flex items-center gap-3 mt-1.5 text-[8px] text-slate-400">
                    <span className="flex items-center gap-0.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#1e3a5f" }} /> Base Demand (Firm Backlog)</span>
                    <span className="flex items-center gap-0.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#93c5fd" }} /> Peak Demand (Forecast + Pipeline + Ramp)</span>
                    <span className="flex items-center gap-0.5"><span className="w-3 h-0.5 rounded" style={{ backgroundColor: "#dc2626" }} /> Total Supply</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1.5 text-[8px] text-slate-400 flex-wrap">
                    <span className="font-bold text-slate-500 uppercase">Demand:</span>
                    <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-sm bg-blue-700" /> Firm Backlog</span>
                    <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-sm bg-blue-400" /> Forecast</span>
                    <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-sm bg-sky-300" /> Pipeline</span>
                    <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-sm bg-indigo-300" /> Ramp/Overlay</span>
                    <span className="mx-0.5 text-slate-300">|</span>
                    <span className="font-bold text-slate-500 uppercase">End-Item Fulfillment:</span>
                    <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-sm bg-emerald-600" /> Internal Finished</span>
                    <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-sm bg-teal-400" /> FG/WIP Release</span>
                    <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-sm bg-cyan-400" /> Outsourced Finished</span>
                    <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-sm bg-lime-400" /> Direct Buy</span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="pb-3">
                {(() => {
                  const reconData = filteredDemand.map(d => {
                    const demMult = reconScenario === "upside" ? (d.totalDemandUpside / Math.max(1, d.totalDemand)) : reconScenario === "downside" ? (d.totalDemandDownside / Math.max(1, d.totalDemand)) : 1
                    const supMult = reconScenario === "upside" ? (d.totalSupplyUpside / Math.max(1, d.totalFeasibleSupply)) : reconScenario === "downside" ? (d.totalSupplyDownside / Math.max(1, d.totalFeasibleSupply)) : 1
                    return {
                      period: d.period,
                      // Summary view fields
                      baseDemand: Math.round(d.firmOrders * demMult),
                      peakDemand: Math.round((d.forecastBaseline + d.pipelineUpside + d.programRamp + Math.max(0, d.scenarioOverlay) + d.customerSharedFcst) * demMult),
                      totalSupply: Math.round(d.totalFeasibleSupply * supMult),
                      totalDemand: Math.round(d.totalDemand * demMult),
                      gap: Math.round(d.totalDemand * demMult - d.constrainedThroughput * supMult),
                      // Detail view fields
                      dFirm: Math.round(d.firmOrders * demMult),
                      dForecast: Math.round(d.forecastBaseline * demMult),
                      dPipeline: Math.round(d.pipelineUpside * demMult),
                      dRampOverlay: Math.round((d.programRamp + Math.max(0, d.scenarioOverlay) + d.customerSharedFcst) * demMult),
                      sInternalFinished: -Math.round(d.internalFinishedOutput * supMult),
                      sFgWip: -Math.round(d.fgWipRelease * supMult),
                      sOutsourcedFinished: -Math.round(d.outsourcedFinishedOutput * supMult),
                      sDirectBuy: -Math.round(d.directBuyFinished * supMult),
                      constrainedFeasible: Math.round(d.constrainedThroughput * supMult),
                    }
                  })

                  if (reconView === "summary") {
                    /* ======= SUMMARY VIEW: Base + Peak demand bars, Total Supply line ======= */
                    return (
                      <ResponsiveContainer width="100%" height={280}>
                        <ComposedChart data={reconData} onClick={(e: any) => { if (e?.activeLabel) { setReconView("detail"); setClickedPeriod(prev => prev === e.activeLabel ? null : e.activeLabel) } }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="period" tick={{ fontSize: 9, fontWeight: 600, fill: "#64748b" }} />
                          <YAxis tick={{ fontSize: 9, fill: "#64748b" }} label={{ value: "End-Item Units", angle: -90, position: "insideLeft", fontSize: 8, fill: "#94a3b8" }} />
                          <Tooltip content={({ active, payload, label }: any) => {
                            if (!active || !payload?.length) return null
                            const row = payload[0]?.payload
                            const gap = row?.gap || 0
                            return (
                              <div className="bg-slate-900 text-white rounded-lg p-3 text-[10px] shadow-xl border border-slate-700 max-w-[260px]">
                                <p className="font-bold text-[11px] mb-1.5 text-slate-100">{label} <span className="text-slate-400 capitalize">({reconScenario})</span></p>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                  <span className="text-slate-400">Base Demand (Firm)</span><span className="text-right font-bold" style={{ color: "#93c5fd" }}>{fmtN(row?.baseDemand)}</span>
                                  <span className="text-slate-400">Peak Demand (Fcst+Pipe+Ramp)</span><span className="text-right font-bold" style={{ color: "#bfdbfe" }}>{fmtN(row?.peakDemand)}</span>
                                  <span className="text-slate-300 font-semibold">Total Demand</span><span className="text-right font-bold text-white">{fmtN(row?.totalDemand)}</span>
                                </div>
                                <div className="border-t border-slate-700 mt-1.5 pt-1.5 grid grid-cols-2 gap-x-3">
                                  <span className="text-slate-400">Total Supply</span><span className="text-right font-bold text-red-400">{fmtN(row?.totalSupply)}</span>
                                </div>
                                <div className={`mt-1.5 pt-1 border-t border-slate-700 font-bold text-[11px] ${gap > 0 ? "text-red-400" : "text-emerald-400"}`}>
                                  {gap > 0 ? `Gap: -${fmtN(gap)} units` : `Surplus: +${fmtN(Math.abs(gap))} units`}
                                </div>
                                <p className="text-slate-500 mt-1 text-[8px]">Click bar to drill into detailed composition view.</p>
                              </div>
                            )
                          }} />
                          {reconData.filter(d => d.gap > 0).map((d, i) => (
                            <ReferenceArea key={`def-${i}`} x1={d.period} x2={d.period} fill="#fecaca" fillOpacity={0.15} />
                          ))}
                          {/* Stacked bars: Base Demand (dark blue) + Peak Demand (light blue) */}
                          <Bar dataKey="baseDemand" stackId="demand" fill="#1e3a5f" name="Base Demand (Firm Backlog)" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="peakDemand" stackId="demand" fill="#93c5fd" name="Peak Demand (Forecast+Pipeline+Ramp)" radius={[3, 3, 0, 0]} />
                          {/* Total Supply red line */}
                          <Line type="monotone" dataKey="totalSupply" stroke="#dc2626" strokeWidth={2.5} name="Total Supply" dot={{ r: 4, fill: "#dc2626", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6, fill: "#dc2626", strokeWidth: 2, stroke: "#fff" }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    )
                  }

                  /* ======= DETAIL VIEW: full dual-stack reconciliation ======= */
                  return (
                    <ResponsiveContainer width="100%" height={280}>
                      <ComposedChart data={reconData} onClick={(e: any) => { if (e?.activeLabel) setClickedPeriod(prev => prev === e.activeLabel ? null : e.activeLabel) }} stackOffset="sign">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="period" tick={{ fontSize: 9, fontWeight: 600, fill: "#64748b" }} />
                        <YAxis tick={{ fontSize: 9, fill: "#64748b" }} label={{ value: gapMetric === "units" ? "End-Item Units" : "$", angle: -90, position: "insideLeft", fontSize: 8, fill: "#94a3b8" }} />
                        <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} label={{ value: "Balance Line", fontSize: 8, fill: "#94a3b8", position: "right" }} />
                        <Tooltip content={({ active, payload, label }: any) => {
                          if (!active || !payload?.length) return null
                          const row = payload[0]?.payload
                          const gg = row?.gap || 0
                          return (
                            <div className="bg-slate-900 text-white rounded-lg p-3 text-[10px] shadow-xl border border-slate-700 max-w-[320px]">
                              <p className="font-bold text-[11px] mb-1 text-slate-100">{label} <span className="text-slate-400 capitalize">({reconScenario})</span></p>
                              <div className="border-b border-slate-700 pb-1.5 mb-1.5">
                                <p className="text-[9px] text-blue-400 font-bold uppercase mb-0.5">Consensus Demand Plan</p>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                                  <span className="text-slate-400">Firm backlog</span><span className="text-right font-semibold">{fmtN(row?.dFirm)}</span>
                                  <span className="text-slate-400">Forecast baseline</span><span className="text-right font-semibold">{fmtN(row?.dForecast)}</span>
                                  <span className="text-slate-400">Pipeline / BD</span><span className="text-right font-semibold">{fmtN(row?.dPipeline)}</span>
                                  <span className="text-slate-400">Ramp + overlay</span><span className="text-right font-semibold">{fmtN(row?.dRampOverlay)}</span>
                                </div>
                                <div className="flex justify-between mt-1 pt-0.5 border-t border-slate-700/50 font-bold"><span className="text-blue-300">Total Demand</span><span>{fmtN(row?.totalDemand)}</span></div>
                              </div>
                              <div className="pb-1.5 mb-1.5 border-b border-slate-700">
                                <p className="text-[9px] text-emerald-400 font-bold uppercase mb-0.5">End-Item Fulfillment Sources</p>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                                  <span className="text-slate-400">Internal finished</span><span className="text-right font-semibold">{fmtN(Math.abs(row?.sInternalFinished || 0))}</span>
                                  <span className="text-slate-400">FG/WIP release</span><span className="text-right font-semibold">{fmtN(Math.abs(row?.sFgWip || 0))}</span>
                                  <span className="text-slate-400">Outsourced finished</span><span className="text-right font-semibold">{fmtN(Math.abs(row?.sOutsourcedFinished || 0))}</span>
                                  <span className="text-slate-400">Direct buy</span><span className="text-right font-semibold">{fmtN(Math.abs(row?.sDirectBuy || 0))}</span>
                                </div>
                                <div className="flex justify-between mt-1 pt-0.5 border-t border-slate-700/50 font-bold"><span className="text-emerald-300">Total Supply</span><span>{fmtN(row?.totalSupply)}</span></div>
                              </div>
                              <div className={`font-bold ${gg > 0 ? "text-red-400" : "text-emerald-400"}`}>
                                {gg > 0 ? `Gap: -${fmtN(gg)} units` : `Surplus: +${fmtN(Math.abs(gg))} units`}
                              </div>
                            </div>
                          )
                        }} />
                        {reconData.filter(d => d.gap > 0).map((d, i) => (
                          <ReferenceArea key={`def-${i}`} x1={d.period} x2={d.period} fill="#fecaca" fillOpacity={0.2} />
                        ))}
                        {clickedPeriod && <ReferenceArea x1={clickedPeriod} x2={clickedPeriod} fill="#bfdbfe" fillOpacity={0.35} />}
                        {/* DEMAND stacks (positive) */}
                        <Bar dataKey="dFirm" stackId="a" fill="#1d4ed8" name="Firm Backlog" />
                        <Bar dataKey="dForecast" stackId="a" fill="#60a5fa" name="Forecast Baseline" />
                        <Bar dataKey="dPipeline" stackId="a" fill="#7dd3fc" name="Pipeline / BD" />
                        <Bar dataKey="dRampOverlay" stackId="a" fill="#a5b4fc" name="Ramp + Overlay" radius={[2, 2, 0, 0]} />
                        {/* END-ITEM FULFILLMENT stacks (negative) */}
                        <Bar dataKey="sInternalFinished" stackId="a" fill="#059669" name="Internal Finished Output" />
                        <Bar dataKey="sFgWip" stackId="a" fill="#2dd4bf" name="FG/WIP Release" />
                        <Bar dataKey="sOutsourcedFinished" stackId="a" fill="#22d3ee" name="Outsourced Finished" />
                        <Bar dataKey="sDirectBuy" stackId="a" fill="#a3e635" name="Direct Buy" radius={[0, 0, 2, 2]} />
                        {/* Constrained feasible ceiling */}
                        <Line type="monotone" dataKey="constrainedFeasible" stroke="#ef4444" strokeWidth={2.5} strokeDasharray="6 3" name="Constrained Feasible" dot={{ r: 3, fill: "#ef4444", strokeWidth: 0 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )
                })()}
              </CardContent>
            </Card>

            {/* Plant Risk Heatmap */}
            <Card className="col-span-2 border-slate-200">
              <CardHeader className="pb-1 pt-3 px-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                      <Factory className="w-3.5 h-3.5 text-red-600" />
                      Plant Risk Heatmap
                    </CardTitle>
                    <p className="text-[9px] text-slate-400 mt-0.5">Click a cell to filter by plant + period</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Select value={riskMetric} onValueChange={v => setRiskMetric(v as "riskScore" | "gapUnits" | "otifRisk")}>
                      <SelectTrigger className="h-5 w-[80px] text-[9px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="riskScore" className="text-[10px]">Risk Score</SelectItem>
                        <SelectItem value="gapUnits" className="text-[10px]">Gap Qty</SelectItem>
                        <SelectItem value="otifRisk" className="text-[10px]">OTIF Risk</SelectItem>
                      </SelectContent>
                    </Select>
                    <button onClick={() => setRiskSort(riskSort === "risk" ? "alpha" : "risk")} className="p-0.5 hover:bg-slate-100 rounded"><ArrowUpDown className="w-3 h-3 text-slate-400" /></button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto pb-3">
                <table className="w-full text-[9px]">
                  <thead>
                    <tr>
                      <th className="text-left p-1 font-bold text-slate-600 sticky left-0 bg-white">Plant</th>
                      {[...new Set(plantRisks.map(r => r.period))].slice(0, 8).map(p => (
                        <th key={p} className={`text-center p-0.5 font-semibold min-w-[34px] ${clickedPeriod === p ? "text-blue-700 bg-blue-50" : "text-slate-500"}`}>{p.replace("W", "").replace(" ", "")}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(riskSort === "alpha" ? [...plants].sort() : plants).map(plant => (
                      <tr key={plant} className={selectedPlant === plant ? "bg-blue-50/40" : ""}>
                        <td className="p-1 font-semibold text-slate-700 sticky left-0 bg-white whitespace-nowrap text-[10px]">{plant.split(" - ")[1] || plant}</td>
                        {plantRisks.filter(r => r.plant === plant).slice(0, 8).map((r, i) => {
                          const val = riskMetric === "riskScore" ? r.riskScore : riskMetric === "gapUnits" ? Math.max(0, r.gapUnits) : 100 - r.otifRisk
                          const display = riskMetric === "riskScore" ? r.riskScore.toFixed(0) : riskMetric === "gapUnits" ? r.gapUnits.toString() : `${r.otifRisk.toFixed(0)}%`
                          const isSelected = selectedPlant === plant && clickedPeriod === r.period
                          return (
                            <td key={i} className="p-0.5">
                              <div
                                className={`w-full h-6 rounded cursor-pointer flex items-center justify-center text-white font-bold text-[8px] transition-all ${isSelected ? "ring-2 ring-blue-500 ring-offset-1" : "hover:ring-2 hover:ring-blue-400"}`}
                                style={{ backgroundColor: sevBg(riskMetric === "otifRisk" ? (100 - r.otifRisk) * 3 : val) }}
                                title={`${plant} ${r.period}\nRisk: ${r.riskScore.toFixed(0)} | Gap: ${r.gapUnits} | OTIF: ${r.otifRisk.toFixed(0)}% | Constraint: ${r.constraintType}`}
                                onClick={() => { setSelectedPlant(plant); setClickedPeriod(r.period) }}
                              >
                                {display}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* ---- ROW 2: Explain the Gap + Constraint + Feasibility + Revenue ---- */}
          <div className="grid grid-cols-4 gap-3">

            {/* EXPLAIN THE GAP PANEL (corrected SIOP semantics) */}
            <Card className={`border-slate-200 ${clickedPeriod ? "border-blue-300 ring-1 ring-blue-100" : ""}`}>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-600" />
                  {clickedPeriod ? `Explain the Gap: ${clickedPeriod}` : "Explain the Gap"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3 px-4">
                {!clickedPeriod ? (
                  <div className="text-center py-8">
                    <Crosshair className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-[10px] text-slate-400">Click a period on the timeline, heatmap cell, or constraint bar to see gap drivers</p>
                  </div>
                ) : (() => {
                  const pd = filteredDemand.find(d => d.period === clickedPeriod)
                  if (!pd) return <p className="text-[10px] text-slate-400">No data for this period</p>
                  const gapQty = pd.gap
                  const avgUnitRev = filteredOrders.length > 0 ? filteredOrders.reduce((s, o) => s + o.unitRevenue, 0) / filteredOrders.length : 20000
                  const revGap = Math.max(0, gapQty) * avgUnitRev

                  // Demand composition
                  const demComp = [
                    { label: "Firm Backlog", value: pd.firmOrders, pct: Math.round((pd.firmOrders / Math.max(1, pd.totalDemand)) * 100), color: "#1d4ed8", tip: "Signed contracts, funded backlog, call-offs" },
                    { label: "Forecast Baseline", value: pd.forecastBaseline, pct: Math.round((pd.forecastBaseline / Math.max(1, pd.totalDemand)) * 100), color: "#60a5fa", tip: "Statistical forecast baseline" },
                    { label: "Pipeline / BD", value: pd.pipelineUpside, pct: Math.round((pd.pipelineUpside / Math.max(1, pd.totalDemand)) * 100), color: "#7dd3fc", tip: "Win-probability adjusted sales pipeline" },
                    { label: "Customer Shared", value: pd.customerSharedFcst, pct: Math.round((pd.customerSharedFcst / Math.max(1, pd.totalDemand)) * 100), color: "#93c5fd", tip: "Framework demand, options, customer forecasts" },
                    { label: "Program Ramp", value: pd.programRamp, pct: Math.round((pd.programRamp / Math.max(1, pd.totalDemand)) * 100), color: "#a5b4fc", tip: "Program-specific volume ramps" },
                    { label: "Scenario Overlay", value: Math.max(0, pd.scenarioOverlay), pct: Math.round((Math.max(0, pd.scenarioOverlay) / Math.max(1, pd.totalDemand)) * 100), color: "#c4b5fd", tip: "Strategic base/upside/downside overlay" },
                  ]

                  // End-item fulfillment sources
                  const supComp = [
                    { label: "Internal Finished", value: pd.internalFinishedOutput, pct: Math.round((pd.internalFinishedOutput / Math.max(1, pd.totalFeasibleSupply)) * 100), color: "#059669", tip: "Finished units from internal build (material + capacity constrained)" },
                    { label: "FG/WIP Release", value: pd.fgWipRelease, pct: Math.round((pd.fgWipRelease / Math.max(1, pd.totalFeasibleSupply)) * 100), color: "#2dd4bf", tip: "Finished goods and converted WIP released as end-item equivalents" },
                    { label: "Outsourced Finished", value: pd.outsourcedFinishedOutput, pct: Math.round((pd.outsourcedFinishedOutput / Math.max(1, pd.totalFeasibleSupply)) * 100), color: "#22d3ee", tip: "Finished units from contract manufacturer / outsourced assembly" },
                    { label: "Direct Buy", value: pd.directBuyFinished, pct: Math.round((pd.directBuyFinished / Math.max(1, pd.totalFeasibleSupply)) * 100), color: "#a3e635", tip: "Externally procured finished end-items (buyout assemblies)" },
                  ]

                  // Internal production feasibility drivers
                  const feasDrivers = [
                    { label: "Supplier Component Receipts", value: pd.supplierReceipts, color: "#6366f1", tip: "Component/subassembly deliveries that feed internal build" },
                    { label: "Component Inventory Avail.", value: pd.componentInventory, color: "#8b5cf6", tip: "On-hand component/raw material availability" },
                    { label: "Material-Supported Build", value: pd.materialSupportedBuild, color: "#a78bfa", tip: "Max build if only material were the constraint" },
                    { label: "Capacity-Supported Build", value: pd.capacitySupportedBuild, color: "#c084fc", tip: "Max build if only capacity were the constraint" },
                    { label: "Yield/Scrap Impact", value: -pd.yieldScrapImpact, color: "#ef4444", tip: "Units lost to yield/scrap vs plan" },
                    { label: "Capacity Constraint Impact", value: -pd.capacityConstraintImpact, color: "#f97316", tip: "Units lost to test/tooling/labor/line constraints" },
                  ]

                  // Attribution data
                  const plantGaps = demandBuckets.filter(b => b.period === clickedPeriod).map(b => ({
                    name: b.plant.split(" - ")[1] || b.plant, gap: b.gap,
                    pct: gapQty > 0 ? Math.round((Math.max(0, b.gap) / Math.max(1, gapQty)) * 100) : 0,
                  })).sort((a, b) => b.gap - a.gap)

                  const progContrib = programs.map(p => {
                    const po = filteredOrders.filter(o => o.program === p && o.severityDays > 0)
                    return { name: p.split(" ")[0], rev: po.reduce((s, o) => s + o.revenueAtRisk, 0) }
                  }).sort((a, b) => b.rev - a.rev).slice(0, 4)

                  const constraintBreak = constraintDrivers.map(d => ({
                    name: d.driver, units: d.unitsAtRisk,
                    pct: Math.round((d.unitsAtRisk / Math.max(1, constraintDrivers.reduce((s, x) => s + x.unitsAtRisk, 0))) * 100),
                  })).sort((a, b) => b.units - a.units)

                  const periodPenalty = filteredOrders.filter(o => o.severityDays > 0).reduce((s, o) => s + o.penaltyExposure, 0)
                  const periodOtif = filteredOrders.length > 0 ? ((filteredOrders.filter(o => o.severityDays === 0).length / filteredOrders.length) * 100) : 100

                  return (
                    <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                      {/* Net gap headline */}
                      <div className={`rounded-lg p-2 ${gapQty > 0 ? "bg-red-50 border border-red-100" : "bg-emerald-50 border border-emerald-100"}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold uppercase text-slate-500">Net Gap (End-Item Units)</span>
                          <span className={`text-sm font-black ${gapQty > 0 ? "text-red-700" : "text-emerald-700"}`}>{gapQty > 0 ? `-${gapQty}` : `+${Math.abs(gapQty)}`}</span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[8px] text-slate-400">Revenue at risk</span>
                          <span className="text-[10px] font-bold text-red-700">{gapQty > 0 ? fmt$(revGap) : "$0"}</span>
                        </div>
                        <div className="flex gap-2 mt-1 text-[8px] text-slate-500">
                          <span>Demand: <span className="font-bold text-blue-700">{pd.totalDemand}</span></span>
                          <span>Supply: <span className="font-bold text-emerald-700">{pd.totalFeasibleSupply}</span></span>
                          <span>Feasible: <span className="font-bold text-red-600">{pd.constrainedThroughput}</span></span>
                        </div>
                      </div>

                      {/* DEMAND CONFIDENCE BAR */}
                      <div className="bg-slate-50 rounded p-2 border border-slate-100">
                        <p className="text-[8px] font-bold text-slate-500 uppercase mb-1">Demand Confidence</p>
                        <div className="w-full h-3 rounded-full overflow-hidden flex">
                          <div className="h-full bg-blue-700" style={{ width: `${pd.demandFirmPct}%` }} title={`Firm: ${pd.demandFirmPct}%`} />
                          <div className="h-full bg-blue-400" style={{ width: `${pd.demandForecastPct}%` }} title={`Forecast: ${pd.demandForecastPct}%`} />
                          <div className="h-full bg-sky-300" style={{ width: `${pd.demandAssumptionPct}%` }} title={`Assumption: ${pd.demandAssumptionPct}%`} />
                        </div>
                        <div className="flex gap-3 mt-1 text-[8px]">
                          <span className="text-blue-700 font-bold">{pd.demandFirmPct}% Firm</span>
                          <span className="text-blue-400 font-bold">{pd.demandForecastPct}% Forecast</span>
                          <span className="text-sky-500 font-bold">{pd.demandAssumptionPct}% Assumption</span>
                        </div>
                        <div className="flex gap-3 mt-1 text-[8px] text-slate-500">
                          <span>Movable: <span className="font-bold text-amber-600">{pd.movableDemand} units</span></span>
                          <span>Non-movable: <span className="font-bold text-slate-700">{pd.nonMovableDemand} units</span></span>
                        </div>
                      </div>

                      {/* DEMAND COMPOSITION */}
                      <div>
                        <p className="text-[9px] font-bold text-blue-700 uppercase mb-1 flex items-center gap-1">
                          Consensus Demand Plan <span className="text-[8px] text-blue-400 font-normal">= {pd.totalDemand} end-item units</span>
                        </p>
                        {demComp.filter(d => d.value > 0).map((d, i) => (
                          <div key={i} className="flex items-center gap-1.5 py-0.5" title={d.tip}>
                            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: d.color }} />
                            <span className="text-[9px] text-slate-600 w-[85px] truncate">{d.label}</span>
                            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${Math.max(3, d.pct)}%`, backgroundColor: d.color }} />
                            </div>
                            <span className="text-[9px] font-bold text-slate-700 w-[22px] text-right">{d.value}</span>
                            <span className="text-[8px] text-slate-400 w-[24px] text-right">{d.pct}%</span>
                          </div>
                        ))}
                      </div>

                      {/* END-ITEM FULFILLMENT SOURCES */}
                      <div>
                        <p className="text-[9px] font-bold text-emerald-700 uppercase mb-1 flex items-center gap-1">
                          End-Item Fulfillment Sources <span className="text-[8px] text-emerald-400 font-normal">= {pd.totalFeasibleSupply} units</span>
                        </p>
                        {supComp.filter(d => d.value > 0).map((d, i) => (
                          <div key={i} className="flex items-center gap-1.5 py-0.5" title={d.tip}>
                            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: d.color }} />
                            <span className="text-[9px] text-slate-600 w-[85px] truncate">{d.label}</span>
                            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${Math.max(3, d.pct)}%`, backgroundColor: d.color }} />
                            </div>
                            <span className="text-[9px] font-bold text-slate-700 w-[22px] text-right">{d.value}</span>
                            <span className="text-[8px] text-slate-400 w-[24px] text-right">{d.pct}%</span>
                          </div>
                        ))}
                      </div>

                      {/* INTERNAL PRODUCTION FEASIBILITY DRIVERS */}
                      <div className="bg-indigo-50/40 rounded p-2 border border-indigo-100">
                        <p className="text-[8px] font-bold text-indigo-700 uppercase mb-1">Internal Production Feasibility Drivers</p>
                        <p className="text-[7px] text-slate-400 mb-1">Causal inputs that constrain Internal Finished Output ({pd.internalFinishedOutput} units)</p>
                        {feasDrivers.map((d, i) => (
                          <div key={i} className="flex items-center justify-between py-0.5 text-[9px]" title={d.tip}>
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-sm flex-shrink-0" style={{ backgroundColor: d.color }} />
                              <span className="text-slate-600">{d.label}</span>
                            </span>
                            <span className={`font-bold ${d.value < 0 ? "text-red-600" : "text-slate-700"}`}>{d.value < 0 ? d.value : `+${d.value}`}</span>
                          </div>
                        ))}
                      </div>

                      {/* BINDING SUPPLY CONSTRAINTS */}
                      <div className="bg-amber-50/50 rounded p-2 border border-amber-100">
                        <p className="text-[8px] font-bold text-amber-800 uppercase mb-1">Binding Supply Constraints</p>
                        <div className="flex flex-wrap gap-1">
                          {[...new Set(pd.supplyConstraints)].map((c, i) => (
                            <Badge key={i} variant="outline" className="text-[8px] bg-white border-amber-200 text-amber-700">{c}</Badge>
                          ))}
                        </div>
                      </div>

                      {/* ASSUMPTIONS LOG */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-blue-50/50 rounded p-1.5 border border-blue-100">
                          <p className="text-[8px] font-bold text-blue-700 uppercase mb-0.5">Demand Assumptions</p>
                          {[...new Set(pd.demandAssumptions)].slice(0, 3).map((a, i) => (
                            <p key={i} className="text-[8px] text-slate-600 leading-tight py-0.5">{a}</p>
                          ))}
                        </div>
                        <div className="bg-emerald-50/50 rounded p-1.5 border border-emerald-100">
                          <p className="text-[8px] font-bold text-emerald-700 uppercase mb-0.5">Supply Assumptions</p>
                          {[...new Set(pd.supplyAssumptions)].slice(0, 3).map((a, i) => (
                            <p key={i} className="text-[8px] text-slate-600 leading-tight py-0.5">{a}</p>
                          ))}
                        </div>
                      </div>

                      {/* GAP ATTRIBUTION */}
                      <div className="border-t border-slate-100 pt-2">
                        <p className="text-[9px] font-bold text-slate-500 uppercase mb-1.5">Gap Attribution</p>
                        <div className="mb-2">
                          <p className="text-[8px] font-semibold text-slate-400 mb-0.5">By Plant</p>
                          {plantGaps.map((p, i) => (
                            <div key={i} className="flex items-center gap-1.5 py-0.5">
                              <span className="text-[9px] font-semibold text-slate-700 w-[65px] truncate">{p.name}</span>
                              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-red-400" style={{ width: `${Math.max(5, Math.min(100, p.pct))}%` }} />
                              </div>
                              <span className="text-[8px] font-bold text-slate-600 w-[28px] text-right">{p.gap > 0 ? `-${p.gap}` : `+${Math.abs(p.gap)}`}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mb-2">
                          <p className="text-[8px] font-semibold text-slate-400 mb-0.5">By Program</p>
                          {progContrib.map((p, i) => (
                            <div key={i} className="flex items-center justify-between py-0.5 text-[9px]">
                              <span className="font-semibold text-slate-700">{p.name}</span>
                              <span className="text-red-600 font-bold">{fmt$(p.rev)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mb-2">
                          <p className="text-[8px] font-semibold text-slate-400 mb-0.5">By Constraint Type</p>
                          {constraintBreak.map((c, i) => (
                            <div key={i} className="flex items-center gap-1.5 py-0.5">
                              <span className="text-[8px] font-medium text-slate-600 w-[75px] truncate">{c.name}</span>
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-amber-500" style={{ width: `${c.pct}%` }} />
                              </div>
                              <span className="text-[8px] font-bold text-slate-600 w-[24px] text-right">{c.pct}%</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* BUSINESS IMPACT FOOTER */}
                      <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-100">
                        <div className="bg-slate-50 rounded p-1.5 text-center">
                          <p className="text-[7px] text-slate-400 uppercase font-bold">Proj. OTIF</p>
                          <p className={`text-xs font-black ${periodOtif < 85 ? "text-red-600" : periodOtif < 95 ? "text-amber-600" : "text-emerald-600"}`}>{periodOtif.toFixed(0)}%</p>
                        </div>
                        <div className="bg-slate-50 rounded p-1.5 text-center">
                          <p className="text-[7px] text-slate-400 uppercase font-bold">Penalty Exp.</p>
                          <p className="text-xs font-black text-red-600">{fmt$(periodPenalty)}</p>
                        </div>
                        <div className="bg-slate-50 rounded p-1.5 text-center">
                          <p className="text-[7px] text-slate-400 uppercase font-bold">Rev at Risk</p>
                          <p className="text-xs font-black text-red-600">{fmt$(revGap)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>

            {/* Constraint Decomposition */}
            <Card className="border-slate-200">
              <CardHeader className="pb-1 pt-3 px-4">
                <div>
                  <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-600" />
                    Constraint Decomposition
                    {constraintFilter && <Badge variant="outline" className="text-[8px] ml-2 bg-amber-50">{constraintFilter}</Badge>}
                  </CardTitle>
                  <p className="text-[9px] text-slate-400 mt-0.5">Click a bar to filter the action queue</p>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={constraintDrivers} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 9, fill: "#64748b" }} />
                    <YAxis dataKey="driver" type="category" tick={{ fontSize: 9, fontWeight: 600, fill: "#334155" }} width={95} />
                    <Tooltip content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0]?.payload
                      return (
                        <div className="bg-slate-900 text-white rounded-lg p-2.5 text-[10px] shadow-xl border border-slate-700 max-w-[200px]">
                          <p className="font-bold text-[11px] mb-1">{d?.driver}</p>
                          <p className="text-slate-300">Units at risk: <span className="font-bold text-white">{fmtN(d?.unitsAtRisk || 0)}</span></p>
                          <p className="text-slate-300">Revenue at risk: <span className="font-bold text-white">{fmt$(d?.revenueAtRisk || 0)}</span></p>
                          <p className="text-slate-500 mt-1 text-[8px]">Click to filter action queue by this constraint</p>
                        </div>
                      )
                    }} />
                    <Bar dataKey="unitsAtRisk" fill="#ef4444" name="Units at Risk" radius={[0, 4, 4, 0]} cursor="pointer"
                      onClick={(d: any) => setConstraintFilter(constraintFilter === d.driver ? null : d.driver)}
                    >
                      {constraintDrivers.map((d, i) => (
                        <Cell key={i} fill={constraintFilter === d.driver ? "#dc2626" : "#ef4444"} opacity={constraintFilter && constraintFilter !== d.driver ? 0.3 : 1} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Internal Production Feasibility Drivers (aggregate) */}
            <Card className="border-slate-200 border-indigo-100">
              <CardHeader className="pb-1 pt-3 px-4">
                <div>
                  <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    Internal Production Feasibility Drivers
                  </CardTitle>
                  <p className="text-[9px] text-slate-400 mt-0.5">Causal inputs constraining internal finished output</p>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                {(() => {
                  const totIntFinished = filteredDemand.reduce((s, d) => s + d.internalFinishedOutput, 0)
                  const totMatBuild = filteredDemand.reduce((s, d) => s + d.materialSupportedBuild, 0)
                  const totCapBuild = filteredDemand.reduce((s, d) => s + d.capacitySupportedBuild, 0)
                  const totYieldLoss = filteredDemand.reduce((s, d) => s + d.yieldScrapImpact, 0)
                  const totCapLoss = filteredDemand.reduce((s, d) => s + d.capacityConstraintImpact, 0)
                  const totCompReceipts = filteredDemand.reduce((s, d) => s + d.supplierReceipts, 0)
                  const totCompInv = filteredDemand.reduce((s, d) => s + d.componentInventory, 0)
                  const driverData = [
                    { driver: "Comp. Receipts", value: totCompReceipts },
                    { driver: "Comp. Inventory", value: totCompInv },
                    { driver: "Material Build", value: totMatBuild },
                    { driver: "Capacity Build", value: totCapBuild },
                    { driver: "Yield Loss", value: -totYieldLoss },
                    { driver: "Capacity Loss", value: -totCapLoss },
                  ]
                  return (
                    <>
                      <div className="grid grid-cols-3 gap-1.5 mb-2">
                        <div className="bg-indigo-50 rounded p-1.5 text-center">
                          <p className="text-[7px] text-indigo-500 uppercase font-bold">Internal Finished</p>
                          <p className="text-sm font-black text-indigo-700">{fmtN(totIntFinished)}</p>
                        </div>
                        <div className="bg-amber-50 rounded p-1.5 text-center">
                          <p className="text-[7px] text-amber-600 uppercase font-bold">Yield Loss</p>
                          <p className="text-sm font-black text-red-600">-{fmtN(totYieldLoss)}</p>
                        </div>
                        <div className="bg-orange-50 rounded p-1.5 text-center">
                          <p className="text-[7px] text-orange-600 uppercase font-bold">Capacity Loss</p>
                          <p className="text-sm font-black text-red-600">-{fmtN(totCapLoss)}</p>
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height={150}>
                        <BarChart data={driverData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" tick={{ fontSize: 8, fill: "#64748b" }} />
                          <YAxis dataKey="driver" type="category" tick={{ fontSize: 8, fontWeight: 600, fill: "#334155" }} width={80} />
                          <Tooltip content={<BizTooltip metric="End-item units" />} />
                          <Bar dataKey="value" name="Units" radius={[0, 3, 3, 0]}>
                            {driverData.map((d, i) => (
                              <Cell key={i} fill={d.value < 0 ? "#ef4444" : "#6366f1"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </>
                  )
                })()}
              </CardContent>
            </Card>

            {/* Revenue/Penalty at Risk */}
            <Card className="border-slate-200">
              <CardHeader className="pb-1 pt-3 px-4">
                <div>
                  <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-red-600" />
                    Revenue & Penalty at Risk by Program
                  </CardTitle>
                  <p className="text-[9px] text-slate-400 mt-0.5">Click a bar to filter by program</p>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                {(() => {
                  const byProgram = programs.map(p => {
                    const po = filteredOrders.filter(o => o.program === p)
                    return { program: p.split(" ")[0], fullName: p, revenue: po.reduce((s, o) => s + o.revenueAtRisk, 0), penalty: po.reduce((s, o) => s + o.penaltyExposure, 0) }
                  })
                  return (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={byProgram} onClick={(e: any) => {
                        if (e?.activeLabel) {
                          const match = byProgram.find(p => p.program === e.activeLabel)
                          if (match) setSelectedProgram(selectedProgram === match.fullName ? "All" : match.fullName)
                        }
                      }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="program" tick={{ fontSize: 9, fontWeight: 600, fill: "#334155" }} />
                        <YAxis tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={v => fmt$(v)} />
                        <Tooltip content={({ active, payload, label }: any) => {
                          if (!active || !payload?.length) return null
                          return (
                            <div className="bg-slate-900 text-white rounded-lg p-2.5 text-[10px] shadow-xl border border-slate-700 max-w-[200px]">
                              <p className="font-bold text-[11px] mb-1">{label}</p>
                              {payload.map((p: any, i: number) => (
                                <div key={i} className="flex justify-between gap-3 py-0.5">
                                  <span className="text-slate-300 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: p.fill }} />
                                    {p.name}
                                  </span>
                                  <span className="font-semibold">{fmt$(p.value)}</span>
                                </div>
                              ))}
                              <p className="text-slate-500 mt-1 text-[8px]">Click to filter action queue by program</p>
                            </div>
                          )
                        }} />
                        <Legend wrapperStyle={{ fontSize: 9, fontWeight: 600 }} />
                        <Bar dataKey="revenue" fill="#3b82f6" name="Rev at Risk" radius={[3, 3, 0, 0]} cursor="pointer" />
                        <Bar dataKey="penalty" fill="#ef4444" name="Penalty Exp." radius={[3, 3, 0, 0]} cursor="pointer" />
                      </BarChart>
                    </ResponsiveContainer>
                  )
                })()}
              </CardContent>
            </Card>
          </div>

          {/* ---- ACTIVE FILTER CHIPS (above action queue) ---- */}
          {(clickedPeriod || constraintFilter || selectedPlant !== "All" || selectedProgram !== "All" || selectedCustomer !== "All") && (
            <div className="flex items-center gap-1.5 flex-wrap px-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase">Active Filters:</span>
              {clickedPeriod && (
                <Badge variant="outline" className="text-[9px] bg-teal-50 border-teal-300 text-teal-800 cursor-pointer hover:bg-teal-100" onClick={() => setClickedPeriod(null)}>
                  {clickedPeriod} <X className="w-2.5 h-2.5 ml-1" />
                </Badge>
              )}
              {selectedPlant !== "All" && (
                <Badge variant="outline" className="text-[9px] bg-indigo-50 border-indigo-300 text-indigo-800 cursor-pointer hover:bg-indigo-100" onClick={() => setSelectedPlant("All")}>
                  {selectedPlant.split(" - ")[1]} <X className="w-2.5 h-2.5 ml-1" />
                </Badge>
              )}
              {selectedProgram !== "All" && (
                <Badge variant="outline" className="text-[9px] bg-violet-50 border-violet-300 text-violet-800 cursor-pointer hover:bg-violet-100" onClick={() => setSelectedProgram("All")}>
                  {selectedProgram.split(" ")[0]} <X className="w-2.5 h-2.5 ml-1" />
                </Badge>
              )}
              {constraintFilter && (
                <Badge variant="outline" className="text-[9px] bg-amber-50 border-amber-300 text-amber-800 cursor-pointer hover:bg-amber-100" onClick={() => setConstraintFilter(null)}>
                  {constraintFilter} <X className="w-2.5 h-2.5 ml-1" />
                </Badge>
              )}
              {selectedCustomer !== "All" && (
                <Badge variant="outline" className="text-[9px] bg-sky-50 border-sky-300 text-sky-800 cursor-pointer hover:bg-sky-100" onClick={() => setSelectedCustomer("All")}>
                  {selectedCustomer.split(" ")[0]} <X className="w-2.5 h-2.5 ml-1" />
                </Badge>
              )}
              <button onClick={() => { setClickedPeriod(null); setConstraintFilter(null); setSelectedPlant("All"); setSelectedProgram("All"); setSelectedCustomer("All") }} className="text-[9px] text-slate-400 hover:text-red-500 font-semibold ml-1 underline">Clear all</button>
            </div>
          )}

          {/* ---- Enterprise Priority Action Queue ---- */}
          <Card className="border-slate-200">
            <CardHeader className="pb-1 pt-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                  Enterprise Priority Action Queue
                  <Badge variant="outline" className="text-[8px] ml-1 font-bold">{filteredOrders.length} actions</Badge>
                  {(clickedPeriod || constraintFilter || selectedPlant !== "All" || selectedProgram !== "All") && (
                    <Badge className="text-[8px] ml-1 bg-blue-100 text-blue-700 border-blue-200">Filtered</Badge>
                  )}
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-6 text-[10px]"><Download className="w-3 h-3 mr-1" />Export</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-slate-50 z-10">
                    <TableRow>
                      {["#", "Sev", "Type", "Order", "CLIN", "Plant", "Customer", "Program", "Supplier", "Need", "Late", "Rev@Risk", "Penalty", "Action", "Mit. Cost", "Net Value", "Owner", "Status"].map(h => (
                        <TableHead key={h} className="text-[9px] font-bold whitespace-nowrap px-1.5 py-1.5 text-slate-600">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.slice(0, 30).map((o) => (
                      <TableRow key={o.orderId} className="cursor-pointer hover:bg-blue-50/60 transition-colors" onClick={() => setDrawerOrder(o)}>
                        <TableCell className="text-[10px] font-bold text-slate-500 px-1.5 py-1">{o.priorityRank}</TableCell>
                        <TableCell className="px-1.5 py-1"><SevBadge severity={o.severity} /></TableCell>
                        <TableCell className="px-1.5 py-1"><Badge variant="outline" className="text-[8px] font-semibold">{o.riskType}</Badge></TableCell>
                        <TableCell className="text-[10px] font-bold text-blue-700 px-1.5 py-1 underline decoration-blue-200">{o.orderId}</TableCell>
                        <TableCell className="text-[10px] px-1.5 py-1 font-mono">{o.clin}</TableCell>
                        <TableCell className="text-[10px] px-1.5 py-1 whitespace-nowrap font-medium">{o.plant.split(" - ")[1]}</TableCell>
                        <TableCell className="text-[10px] px-1.5 py-1 whitespace-nowrap max-w-[90px] truncate">{o.customer}</TableCell>
                        <TableCell className="text-[10px] px-1.5 py-1 whitespace-nowrap">{o.program.split(" ")[0]}</TableCell>
                        <TableCell className="text-[10px] px-1.5 py-1 whitespace-nowrap max-w-[80px] truncate">{o.supplier}</TableCell>
                        <TableCell className="text-[10px] px-1.5 py-1 whitespace-nowrap font-mono">{o.needDate.replace("2026-", "")}</TableCell>
                        <TableCell className="px-1.5 py-1">
                          <span className={`text-[10px] font-bold ${o.severityDays > 20 ? "text-red-600" : o.severityDays > 10 ? "text-orange-600" : o.severityDays > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                            {o.severityDays > 0 ? `${o.severityDays}d` : "OK"}
                          </span>
                        </TableCell>
                        <TableCell className="text-[10px] font-bold text-red-700 px-1.5 py-1">{fmt$(o.revenueAtRisk)}</TableCell>
                        <TableCell className="text-[10px] font-bold text-red-700 px-1.5 py-1">{fmt$(o.penaltyExposure)}</TableCell>
                        <TableCell className="text-[10px] px-1.5 py-1 max-w-[100px] truncate text-slate-600">{o.recommendedAction}</TableCell>
                        <TableCell className="text-[10px] px-1.5 py-1 font-semibold">{fmt$(o.estimatedMitigationCost)}</TableCell>
                        <TableCell className="text-[10px] font-bold px-1.5 py-1">
                          <span className={o.netValuePreserved >= 0 ? "text-emerald-700" : "text-red-600"}>{fmt$(o.netValuePreserved)}</span>
                        </TableCell>
                        <TableCell className="text-[10px] px-1.5 py-1 whitespace-nowrap">{o.owner}</TableCell>
                        <TableCell className="px-1.5 py-1">
                          <Badge variant="outline" className={`text-[8px] font-semibold ${o.status === "Open" ? "border-blue-200 text-blue-700 bg-blue-50" : o.status === "In Progress" ? "border-amber-200 text-amber-700 bg-amber-50" : o.status === "Escalated" ? "border-red-200 text-red-700 bg-red-50" : "border-green-200 text-green-700 bg-green-50"}`}>{o.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============= TAB 2: SHORTAGE MAP & ALLOCATION ============= */}
        <TabsContent value="shortage" className="space-y-3 mt-3">
          <div className="flex gap-3">
            {/* Left: Filters */}
            <div className="w-[190px] space-y-3 flex-shrink-0">
              <Card className="border-slate-200">
                <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-[10px] font-bold">Grouping & Filters</CardTitle></CardHeader>
                <CardContent className="space-y-2 px-3 pb-3">
                  <Select value={shortageGroupBy} onValueChange={v => setShortageGroupBy(v as "Part" | "Commodity" | "Supplier")}>
                    <SelectTrigger className="h-6 text-[10px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Part" className="text-xs">By Part</SelectItem>
                      <SelectItem value="Commodity" className="text-xs">By Commodity</SelectItem>
                      <SelectItem value="Supplier" className="text-xs">By Supplier</SelectItem>
                    </SelectContent>
                  </Select>
                  <label className="flex items-center gap-1.5 text-[10px] font-medium">
                    <input type="checkbox" checked={shortageShowOnly} onChange={e => setShortageShowOnly(e.target.checked)} className="w-3 h-3 rounded" />
                    Show shortages only
                  </label>
                  <Select value={shortageSort} onValueChange={v => setShortageSort(v as "severity" | "revenue")}>
                    <SelectTrigger className="h-6 text-[10px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="severity" className="text-xs">Sort: Severity</SelectItem>
                      <SelectItem value="revenue" className="text-xs">Sort: Revenue Risk</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="pt-1 border-t space-y-1">
                    <p className="text-[9px] text-slate-500 font-bold uppercase">Severity</p>
                    {(["Critical", "High", "Medium", "Low"] as SeverityLevel[]).map(s => (
                      <label key={s} className="flex items-center gap-1.5 text-[10px]">
                        <input type="checkbox" defaultChecked className="w-3 h-3 rounded" />
                        <SevBadge severity={s} />
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>
              {/* Action Recommendations */}
              <Card className="border-slate-200">
                <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-[10px] font-bold">Action Recs</CardTitle></CardHeader>
                <CardContent className="space-y-2 px-3 pb-3">
                  {selectedShortage ? (
                    <>
                      <p className="text-[10px] text-slate-700 font-bold">{selectedShortage.partNumber}</p>
                      {["Expedite shipment", "Pull forward PO", "Alt supplier"].map(a => (
                        <div key={a} className="p-2 bg-slate-50 rounded border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-700">{a}</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">OTIF +1.2% | Cost $4.5K</p>
                          <Button size="sm" variant="outline" className="h-5 text-[9px] mt-1 w-full" onClick={() => addScenarioAction("shortage", a, selectedShortage.partNumber, 1)}>Apply to Scenario</Button>
                        </div>
                      ))}
                    </>
                  ) : <p className="text-[10px] text-slate-400">Select a part to see actions</p>}
                </CardContent>
              </Card>
            </div>

            {/* Center */}
            <div className="flex-1 space-y-3">
              {/* Shortage Heatmap */}
              <Card className="border-slate-200">
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-xs font-bold">Shortage Heatmap (12 weeks)</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto pb-3">
                  <table className="w-full text-[9px]">
                    <thead>
                      <tr>
                        <th className="text-left p-1 font-bold text-slate-600 sticky left-0 bg-white min-w-[110px]">{shortageGroupBy}</th>
                        <th className="text-left p-1 font-semibold text-slate-500 min-w-[50px]">Sev</th>
                        {Array.from({ length: 12 }, (_, i) => (
                          <th key={i} className="text-center p-0.5 font-semibold text-slate-500 min-w-[38px]">W{i + 1}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {shortages.map(s => (
                        <tr key={s.partNumber} className={`cursor-pointer hover:bg-blue-50/50 ${selectedShortage?.partNumber === s.partNumber ? "bg-blue-50" : ""}`} onClick={() => setSelectedShortage(s)}>
                          <td className="p-1 font-semibold text-slate-700 sticky left-0 bg-white whitespace-nowrap text-[10px]">{s.partNumber}</td>
                          <td className="p-1"><SevBadge severity={s.severity} /></td>
                          {s.weeklyShortages.map((v, i) => (
                            <td key={i} className="p-0.5">
                              <div
                                className="w-full h-5 rounded flex items-center justify-center font-bold text-[8px]"
                                style={{ backgroundColor: shortBg(v), color: shortFg(v) }}
                                title={`Demand: ${s.weeklyDemand[i]} | Supply: ${s.weeklySupply[i]} | Net: ${v} | OH: ${s.onHand}`}
                              >
                                {v}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Selected Part Timeline */}
              {selectedShortage && (
                <Card className="border-slate-200">
                  <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="text-xs font-bold">{selectedShortage.partNumber} Supply-Demand Timeline</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <ResponsiveContainer width="100%" height={200}>
                      <ComposedChart data={selectedShortage.weeklyDemand.map((d, i) => ({
                        week: `W${i + 1}`,
                        demand: d,
                        supply: selectedShortage.weeklySupply[i],
                        net: selectedShortage.weeklyShortages[i],
                        inventory: Math.max(0, selectedShortage.onHand + selectedShortage.weeklyShortages.slice(0, i + 1).reduce((s, v) => s + v, 0)),
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="week" tick={{ fontSize: 9, fill: "#64748b" }} />
                        <YAxis tick={{ fontSize: 9, fill: "#64748b" }} />
                        <Tooltip content={<BizTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 9, fontWeight: 600 }} />
                        <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="2 2" />
                        <Bar dataKey="demand" fill="#3b82f6" name="Demand" />
                        <Bar dataKey="supply" fill="#10b981" name="Supply" />
                        <Line type="monotone" dataKey="inventory" stroke="#f59e0b" strokeWidth={2} name="Proj. Inventory" />
                        <Line type="monotone" dataKey="net" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2" name="Net Shortage" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right: Pegging & Allocation */}
            <div className="w-[310px] flex-shrink-0">
              <Card className="border-slate-200 h-full">
                <CardHeader className="pb-1 pt-3 px-3">
                  <CardTitle className="text-[10px] font-bold flex items-center justify-between">
                    Pegging & Allocation
                    <Select value={allocStrategy} onValueChange={v => setAllocStrategy(v as AllocationStrategy)}>
                      <SelectTrigger className="h-5 text-[9px] w-[110px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="highest-revenue" className="text-xs">Highest Revenue</SelectItem>
                        <SelectItem value="earliest-need" className="text-xs">Earliest Need</SelectItem>
                        <SelectItem value="highest-penalty" className="text-xs">Highest Penalty</SelectItem>
                        <SelectItem value="manual" className="text-xs">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {selectedShortage ? (
                    <div className="overflow-y-auto max-h-[460px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {["Order", "Cust", "Qty", "Need", "Promise", "Rev", "Penalty", "Alloc"].map(h => (
                              <TableHead key={h} className="text-[8px] font-bold px-1 py-1">{h}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedShortage.impactedOrders.map((oid, i) => {
                            const order = allOrders.find(o => o.orderId === oid) || allOrders[i % allOrders.length]
                            return (
                              <TableRow key={oid + i}>
                                <TableCell className="text-[9px] font-bold text-blue-700 px-1 py-1">{order.orderId}</TableCell>
                                <TableCell className="text-[9px] px-1 py-1 max-w-[50px] truncate">{order.customer.split(" ")[0]}</TableCell>
                                <TableCell className="text-[9px] px-1 py-1">{order.qty}</TableCell>
                                <TableCell className="text-[9px] px-1 py-1 font-mono">{order.needDate.replace("2026-", "")}</TableCell>
                                <TableCell className="text-[9px] px-1 py-1 font-mono">{order.promiseDate.replace("2026-", "")}</TableCell>
                                <TableCell className="text-[9px] px-1 py-1">{fmt$(order.totalRevenue)}</TableCell>
                                <TableCell className="text-[9px] px-1 py-1 text-red-600 font-semibold">{fmt$(order.penaltyExposure)}</TableCell>
                                <TableCell className="px-1 py-1">
                                  <Input type="number" defaultValue={Math.floor(order.qty * 0.5)} className="h-5 w-10 text-[9px] px-1" />
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                      <div className="p-2 bg-slate-50 border-t text-[10px] space-y-1">
                        <div className="flex justify-between"><span className="text-slate-500">Resulting OTIF:</span><span className="font-bold text-emerald-700">+1.4%</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Rev Protected:</span><span className="font-bold">{fmt$(320000)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Penalty Avoided:</span><span className="font-bold text-emerald-700">{fmt$(85000)}</span></div>
                      </div>
                      <div className="p-2">
                        <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[10px] h-7" onClick={() => addScenarioAction("allocation", `Realloc ${selectedShortage.partNumber}`, selectedShortage.partNumber, 1)}>
                          <Play className="w-3 h-3 mr-1" />Apply to Scenario
                        </Button>
                      </div>
                    </div>
                  ) : <p className="text-[10px] text-slate-400 p-4 text-center">Select a part from the heatmap</p>}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ============= TAB 3: SUPPLIER CAPACITY & SUPPLY ============= */}
        <TabsContent value="supplier" className="space-y-3 mt-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {supplierProfiles.map(sp => (
              <button
                key={sp.supplierId}
                onClick={() => setSelectedSupProfile(sp)}
                className={`flex-shrink-0 p-2.5 rounded-lg border text-left min-w-[150px] transition-all ${selectedSupProfile?.supplierId === sp.supplierId ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200" : "border-slate-200 bg-white hover:border-slate-300"}`}
              >
                <p className="text-[10px] font-bold text-slate-800">{sp.supplierName}</p>
                <p className="text-[9px] text-slate-500">{sp.commodity}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <SevBadge severity={sp.riskStatus} />
                  <span className="text-[9px] text-slate-500">{sp.impactedOrderCount} orders</span>
                </div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Supplier Capacity Profile Timeline */}
            <Card className="border-slate-200">
              <CardHeader className="pb-1 pt-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold">{selectedSupProfile ? selectedSupProfile.supplierName : "Select Supplier"} Capacity</CardTitle>
                  {selectedSupProfile && (
                    <div className="flex items-center gap-1">
                      <Badge className="text-[8px] bg-slate-100 text-slate-600">{selectedSupProfile.impactedOrderCount} orders impacted</Badge>
                      <Badge className="text-[8px] bg-red-50 text-red-700">{fmt$(selectedSupProfile.revenueAtRisk)} rev at risk</Badge>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                {selectedSupProfile ? (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <ComposedChart data={selectedSupProfile.currentOrders.map((v, i) => {
                        const adj = Math.round(selectedSupProfile.quotedCapacity[i] * (1 + supSimCapChange / 100))
                        return {
                          period: `W${i + 1}`,
                          orders: v,
                          quoted: selectedSupProfile.quotedCapacity[i],
                          adjCapacity: supSimCapChange !== 0 ? adj : undefined,
                          demoMax: selectedSupProfile.demonstratedMax[i],
                        }
                      })}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="period" tick={{ fontSize: 9, fill: "#64748b" }} />
                        <YAxis tick={{ fontSize: 9, fill: "#64748b" }} />
                        <Tooltip content={<BizTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 9, fontWeight: 600 }} />
                        {selectedSupProfile.currentOrders.map((v, i) => (
                          v > selectedSupProfile.quotedCapacity[i] ?
                            <ReferenceArea key={i} x1={`W${i + 1}`} x2={`W${i + 1}`} fill="#fecaca" fillOpacity={0.2} /> : null
                        ))}
                        <Bar dataKey="orders" fill="#3b82f6" name="Current Orders" />
                        <Line type="monotone" dataKey="quoted" stroke="#f59e0b" strokeWidth={2} name="Quoted Cap." />
                        {supSimCapChange !== 0 && <Line type="monotone" dataKey="adjCapacity" stroke="#10b981" strokeWidth={2} strokeDasharray="4 2" name="Adjusted Cap." />}
                        <Line type="monotone" dataKey="demoMax" stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" name="Demo Max" />
                      </ComposedChart>
                    </ResponsiveContainer>
                    {/* Inline simulation controls */}
                    <div className="mt-2 flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-100 text-[10px]">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-600 font-semibold">Capacity</span>
                        <Button size="sm" variant="outline" className="h-5 w-5 p-0" onClick={() => setSupSimCapChange(v => v - 10)}><Minus className="w-2.5 h-2.5" /></Button>
                        <span className="font-bold w-10 text-center">{supSimCapChange > 0 ? "+" : ""}{supSimCapChange}%</span>
                        <Button size="sm" variant="outline" className="h-5 w-5 p-0" onClick={() => setSupSimCapChange(v => v + 10)}><Plus className="w-2.5 h-2.5" /></Button>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-600 font-semibold">Outage (wks)</span>
                        <Input type="number" value={supSimOutage} onChange={e => setSupSimOutage(Number(e.target.value))} className="h-5 w-12 text-[10px]" min={0} max={12} />
                      </div>
                      <Button size="sm" className="h-5 text-[9px] bg-blue-600 text-white ml-auto" onClick={() => addScenarioAction("supplier", `${selectedSupProfile.supplierName} cap ${supSimCapChange}%`, selectedSupProfile.supplierName, supSimCapChange)}>
                        Send to Scenario
                      </Button>
                    </div>
                  </>
                ) : <div className="h-[220px] flex items-center justify-center text-xs text-slate-400 font-medium">Select a supplier above</div>}
              </CardContent>
            </Card>

            {/* Supplier Portfolio Risk Matrix */}
            <Card className="border-slate-200">
              <CardHeader className="pb-1 pt-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold">Supplier Portfolio Risk Matrix</CardTitle>
                  <div className="flex gap-1">
                    {(["revenue", "penalty"] as const).map(m => (
                      <button key={m} onClick={() => setSupRiskYAxis(m)} className={`px-2 py-0.5 text-[9px] font-semibold rounded ${supRiskYAxis === m ? "bg-blue-100 text-blue-700" : "text-slate-400"}`}>
                        {m === "revenue" ? "Rev@Risk" : "Penalty"}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                {/* Quadrant labels */}
                <div className="relative">
                  <div className="absolute top-0 left-1 text-[8px] text-red-400 font-bold z-10">HIGH RISK / HIGH IMPACT</div>
                  <div className="absolute top-0 right-1 text-[8px] text-slate-300 font-bold z-10">LOW RISK / HIGH IMPACT</div>
                  <ResponsiveContainer width="100%" height={240}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="gapSeverity" name="Gap Severity" tick={{ fontSize: 9, fill: "#64748b" }} label={{ value: "Gap Severity", position: "bottom", fontSize: 9, offset: -5 }} />
                      <YAxis dataKey={supRiskYAxis === "revenue" ? "revenueAtRisk" : "revenueAtRisk"} name={supRiskYAxis === "revenue" ? "Rev at Risk" : "Penalty"} tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={v => fmt$(v)} />
                      <ZAxis dataKey="spend" range={[40, 400]} />
                      <Tooltip content={<BizTooltip metric="Click bubble to view supplier profile" />} />
                      <ReferenceLine x={50} stroke="#e2e8f0" strokeDasharray="2 2" />
                      <ReferenceLine y={2000000} stroke="#e2e8f0" strokeDasharray="2 2" />
                      <Scatter data={supplierProfiles} name="Suppliers">
                        {supplierProfiles.map((s, i) => (
                          <Cell
                            key={i}
                            fill={s.riskStatus === "Critical" ? "#ef4444" : s.riskStatus === "High" ? "#f59e0b" : s.riskStatus === "Medium" ? "#fbbf24" : "#10b981"}
                            cursor="pointer"
                            onClick={() => setSelectedSupProfile(s)}
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lead Time & Inventory */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-slate-200">
              <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs font-bold">Lead Time & Inventory Exposure</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-y-auto max-h-[260px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {["Supplier", "Commodity", "Lead Time", "Coverage", "Carrying $", "Spend"].map(h => (
                          <TableHead key={h} className="text-[9px] font-bold px-2 py-1">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplierProfiles.sort((a, b) => b.leadTimeDays - a.leadTimeDays).map(sp => (
                        <TableRow key={sp.supplierId} className={`cursor-pointer hover:bg-blue-50/30 ${sp.leadTimeDays > 60 && sp.coverageDays < 30 ? "bg-red-50/30" : ""}`} onClick={() => setSelectedSupProfile(sp)}>
                          <TableCell className="text-[10px] font-semibold px-2 py-1">{sp.supplierName}</TableCell>
                          <TableCell className="text-[10px] px-2 py-1">{sp.commodity}</TableCell>
                          <TableCell className={`text-[10px] font-bold px-2 py-1 ${sp.leadTimeDays > 60 ? "text-red-600" : ""}`}>{sp.leadTimeDays}d</TableCell>
                          <TableCell className={`text-[10px] font-bold px-2 py-1 ${sp.coverageDays < 30 ? "text-amber-600" : "text-emerald-600"}`}>{sp.coverageDays}d</TableCell>
                          <TableCell className="text-[10px] px-2 py-1">{fmt$(sp.carryingCost)}</TableCell>
                          <TableCell className="text-[10px] font-bold px-2 py-1">{fmt$(sp.spend)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs font-bold">Supplier Order Schedule</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-y-auto max-h-[260px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {["Supplier", "Period", "Ordered", "Confirmed", "Pull-In?"].map(h => (
                          <TableHead key={h} className="text-[9px] font-bold px-2 py-1">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplierProfiles.flatMap(sp => sp.currentOrders.slice(0, 4).map((v, i) => (
                        <TableRow key={`${sp.supplierId}-${i}`}>
                          <TableCell className="text-[10px] font-medium px-2 py-1">{sp.supplierName}</TableCell>
                          <TableCell className="text-[10px] px-2 py-1">W{i + 1}</TableCell>
                          <TableCell className="text-[10px] px-2 py-1">{v}</TableCell>
                          <TableCell className="text-[10px] px-2 py-1">{Math.floor(v * 0.85)}</TableCell>
                          <TableCell className="px-2 py-1"><Badge variant="outline" className={`text-[8px] font-bold ${v > sp.quotedCapacity[i] ? "border-red-200 text-red-700 bg-red-50" : "border-green-200 text-green-700 bg-green-50"}`}>{v > sp.quotedCapacity[i] ? "No" : "Yes"}</Badge></TableCell>
                        </TableRow>
                      )))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============= TAB 4: PLANT CAPACITY PLANNING ============= */}
        <TabsContent value="plant-capacity" className="space-y-3 mt-3">
          <div className="flex items-center gap-2">
            <Select value={capPlant} onValueChange={setCapPlant}>
              <SelectTrigger className="w-[170px] h-7 text-[10px] font-semibold"><SelectValue /></SelectTrigger>
              <SelectContent>{plants.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={capLine} onValueChange={setCapLine}>
              <SelectTrigger className="w-[130px] h-7 text-[10px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All" className="text-xs">All Lines</SelectItem>
                {["SMT Line 1", "SMT Line 2", "Final Assy A", "Final Assy B", "Test Cell 1", "RF Calibration"].map(l =>
                  <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Capacity vs Load Timeline */}
            <Card className="col-span-2 border-slate-200">
              <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs font-bold">Capacity vs Load Timeline</CardTitle></CardHeader>
              <CardContent className="pb-3">
                {(() => {
                  const data = capacityBuckets
                    .filter(b => b.plant === capPlant && (capLine === "All" || b.line === capLine))
                    .reduce((acc, b) => {
                      const existing = acc.find(a => a.period === b.period)
                      if (existing) { existing.load += b.plannedLoad; existing.available += b.availableCapacity; existing.max += b.maxCapacity }
                      else acc.push({ period: b.period, load: b.plannedLoad, available: b.availableCapacity, max: b.maxCapacity })
                      return acc
                    }, [] as { period: string; load: number; available: number; max: number }[])
                  return (
                    <ResponsiveContainer width="100%" height={240}>
                      <ComposedChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="period" tick={{ fontSize: 9, fill: "#64748b" }} />
                        <YAxis tick={{ fontSize: 9, fill: "#64748b" }} />
                        <Tooltip content={<BizTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 9, fontWeight: 600 }} />
                        {/* Threshold bands */}
                        {data.map((d, i) => {
                          const util = (d.load / d.available) * 100
                          return util > 95 ? <ReferenceArea key={i} x1={d.period} x2={d.period} fill="#fecaca" fillOpacity={0.3} /> :
                            util > 80 ? <ReferenceArea key={i} x1={d.period} x2={d.period} fill="#fef3c7" fillOpacity={0.3} /> : null
                        })}
                        <Area type="monotone" dataKey="max" fill="#f1f5f9" stroke="#94a3b8" name="Max Capacity" />
                        <Area type="monotone" dataKey="available" fill="#dcfce7" stroke="#10b981" name="Available" />
                        <Line type="monotone" dataKey="load" stroke="#3b82f6" strokeWidth={2.5} name="Planned Load" dot={{ r: 3, fill: "#3b82f6" }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )
                })()}
              </CardContent>
            </Card>

            {/* Active Constraints + Capacity Simulator */}
            <Card className="border-slate-200">
              <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs font-bold">Capacity Simulator</CardTitle></CardHeader>
              <CardContent className="space-y-2 pb-3">
                <label className="flex items-center justify-between text-[10px]">
                  <span className="font-medium">Add second shift</span>
                  <input type="checkbox" checked={simOvertimeShift} onChange={e => setSimOvertimeShift(e.target.checked)} className="w-3.5 h-3.5 rounded" />
                </label>
                <label className="flex items-center justify-between text-[10px]">
                  <span className="font-medium">Weekend overtime</span>
                  <input type="checkbox" checked={simWeekendOT} onChange={e => setSimWeekendOT(e.target.checked)} className="w-3.5 h-3.5 rounded" />
                </label>
                <label className="flex items-center justify-between text-[10px]">
                  <span className="font-medium">Activate machine</span>
                  <input type="checkbox" checked={simAddMachine} onChange={e => setSimAddMachine(e.target.checked)} className="w-3.5 h-3.5 rounded" />
                </label>
                <div>
                  <p className="text-[10px] font-medium mb-0.5">Outsource %</p>
                  <Input type="number" value={simOutsource} onChange={e => setSimOutsource(Number(e.target.value))} className="h-6 text-[10px]" min={0} max={50} />
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 space-y-1 text-[10px]">
                  <p className="font-bold text-blue-800 text-[9px] uppercase">Estimated Impact</p>
                  <div className="flex justify-between"><span className="text-slate-600">Throughput:</span><span className="font-bold text-emerald-700">+{(simOvertimeShift ? 20 : 0) + (simWeekendOT ? 12 : 0) + (simAddMachine ? 15 : 0) + simOutsource * 0.8}%</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">OTIF impact:</span><span className="font-bold text-emerald-700">+{((simOvertimeShift ? 2.1 : 0) + (simWeekendOT ? 1.3 : 0) + (simAddMachine ? 1.8 : 0) + simOutsource * 0.1).toFixed(1)}%</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Added cost:</span><span className="font-bold text-red-600">{fmt$((simOvertimeShift ? 45000 : 0) + (simWeekendOT ? 28000 : 0) + (simAddMachine ? 35000 : 0) + simOutsource * 1200)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Bottleneck shift:</span><span className="font-bold">{simOvertimeShift ? "Labor" : simAddMachine ? "Tooling" : "None"}</span></div>
                </div>
                <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[10px] h-7" onClick={() => addScenarioAction("capacity", `${capPlant.split(" - ")[1]} capacity changes`, capPlant, 1)}>
                  <Play className="w-3 h-3 mr-1" />Send to Scenario
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Utilization Heatmap */}
          <Card className="border-slate-200">
            <CardHeader className="pb-1 pt-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold">Utilization Heatmap</CardTitle>
                <div className="flex gap-2 text-[9px]">
                  <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-emerald-500" />{"<80%"}</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-amber-400" />80-95%</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-red-500" />{">95%"}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto pb-3">
              {(() => {
                const lines = [...new Set(capacityBuckets.filter(b => b.plant === capPlant).map(b => b.line))]
                const periods = [...new Set(capacityBuckets.map(b => b.period))].slice(0, 8)
                return (
                  <table className="w-full text-[9px]">
                    <thead>
                      <tr>
                        <th className="text-left p-1 font-bold text-slate-600 sticky left-0 bg-white min-w-[95px]">Line</th>
                        {periods.map(p => <th key={p} className="text-center p-0.5 font-semibold text-slate-500 min-w-[40px]">{p.replace("W", "").replace(" ", "")}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map(line => (
                        <tr key={line}>
                          <td className="p-1 font-semibold text-slate-700 sticky left-0 bg-white whitespace-nowrap text-[10px]">{line}</td>
                          {periods.map(p => {
                            const bucket = capacityBuckets.find(b => b.plant === capPlant && b.line === line && b.period === p)
                            const util = bucket?.utilization || 0
                            return (
                              <td key={p} className="p-0.5">
                                <div
                                  className="w-full h-6 rounded flex items-center justify-center font-bold text-[8px] text-white cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                                  style={{ backgroundColor: util > 95 ? "#ef4444" : util > 80 ? "#f59e0b" : "#10b981" }}
                                  title={`${line} ${p}: ${util}% util | Binding: ${bucket?.bindingConstraint || "None"}`}
                                >
                                  {util}%
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============= TAB 5: DEMAND PLANNING & FORECAST ============= */}
        <TabsContent value="demand" className="space-y-3 mt-3">
          <Card className="border-slate-200">
            <CardHeader className="pb-1 pt-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold">Demand Composition & Trend</CardTitle>
                <div className="flex gap-1">
                  {(["enterprise", "plant", "customer", "program"] as const).map(d => (
                    <button key={d} onClick={() => setDemandDim(d)} className={`px-2 py-0.5 text-[9px] font-semibold rounded ${demandDim === d ? "bg-blue-100 text-blue-700" : "text-slate-400 hover:text-slate-600"}`}>
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              {/* Demand confidence summary */}
              {(() => {
                const avgFirm = filteredDemand.length > 0 ? Math.round(filteredDemand.reduce((s, d) => s + d.demandFirmPct, 0) / filteredDemand.length) : 0
                const avgFcst = filteredDemand.length > 0 ? Math.round(filteredDemand.reduce((s, d) => s + d.demandForecastPct, 0) / filteredDemand.length) : 0
                const avgAssump = 100 - avgFirm - avgFcst
                const totalMovable = filteredDemand.reduce((s, d) => s + d.movableDemand, 0)
                return (
                  <div className="flex items-center gap-4 mb-2 text-[9px]">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm bg-blue-700" />
                      <span className="text-slate-500">Avg Firm:</span>
                      <span className="font-bold text-blue-700">{avgFirm}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm bg-blue-400" />
                      <span className="text-slate-500">Forecast:</span>
                      <span className="font-bold text-blue-400">{avgFcst}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm bg-sky-300" />
                      <span className="text-slate-500">Assumption:</span>
                      <span className="font-bold text-sky-500">{avgAssump}%</span>
                    </div>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-500">Movable demand: <span className="font-bold text-amber-600">{fmtN(totalMovable)} units</span></span>
                  </div>
                )
              })()}
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={filteredDemand}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 9, fill: "#64748b" }} label={{ value: "End-Item Units", angle: -90, position: "insideLeft", fontSize: 8, fill: "#94a3b8" }} />
                  <Tooltip content={<BizTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 9, fontWeight: 600 }} />
                  <Area type="monotone" dataKey="firmOrders" stackId="1" fill="#1d4ed8" stroke="#1d4ed8" name="Firm Backlog" />
                  <Area type="monotone" dataKey="forecastBaseline" stackId="1" fill="#93c5fd" stroke="#60a5fa" name="Forecast Baseline" />
                  <Area type="monotone" dataKey="pipelineUpside" stackId="1" fill="#bae6fd" stroke="#7dd3fc" name="Pipeline / BD" />
                  <Area type="monotone" dataKey="customerSharedFcst" stackId="1" fill="#c7d2fe" stroke="#a5b4fc" name="Customer Shared Fcst" />
                  <Area type="monotone" dataKey="programRamp" stackId="1" fill="#e0e7ff" stroke="#c4b5fd" name="Program Ramp" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            {/* Forecast Accuracy */}
            <Card className="border-slate-200">
              <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs font-bold">Forecast Accuracy & Bias</CardTitle></CardHeader>
              <CardContent className="pb-3">
                {(() => {
                  const data = [
                    { plant: "Cedar Rapids", accuracy: 82, bias: -3.2, volatility: "Stable" },
                    { plant: "Melbourne", accuracy: 76, bias: 5.1, volatility: "Volatile" },
                    { plant: "San Diego", accuracy: 88, bias: -1.4, volatility: "Stable" },
                  ]
                  return (
                    <>
                      <div className="flex gap-2 mb-2">
                        {data.map(d => (
                          <Badge key={d.plant} variant="outline" className={`text-[8px] ${d.volatility === "Volatile" ? "border-amber-200 text-amber-700 bg-amber-50" : "border-green-200 text-green-700 bg-green-50"}`}>
                            {d.plant}: {d.volatility}
                          </Badge>
                        ))}
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <ComposedChart data={data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="plant" tick={{ fontSize: 9, fontWeight: 600, fill: "#334155" }} />
                          <YAxis yAxisId="left" tick={{ fontSize: 9, fill: "#64748b" }} domain={[60, 100]} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: "#64748b" }} />
                          <Tooltip content={<BizTooltip metric="Accuracy = |1 - forecast/actual| | Bias = (forecast - actual)/actual" />} />
                          <Legend wrapperStyle={{ fontSize: 9, fontWeight: 600 }} />
                          <Bar yAxisId="left" dataKey="accuracy" fill="#3b82f6" name="Accuracy %" radius={[3, 3, 0, 0]} />
                          <Line yAxisId="right" type="monotone" dataKey="bias" stroke="#ef4444" strokeWidth={2} name="Bias %" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </>
                  )
                })()}
              </CardContent>
            </Card>

            {/* Demand Variability */}
            <Card className="border-slate-200">
              <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs font-bold">Demand Variability by Program</CardTitle></CardHeader>
              <CardContent className="pb-3">
                {(() => {
                  const data = programs.map(p => {
                    const po = filteredOrders.filter(o => o.program === p)
                    const vol = Math.floor(Math.random() * 40 + 10)
                    return { program: p.split(" ")[0], orders: po.length, volatility: vol, risk: vol > 35 ? "Spike Risk" : vol > 25 ? "Volatile" : "Stable" }
                  })
                  return (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="program" tick={{ fontSize: 9, fontWeight: 600, fill: "#334155" }} />
                        <YAxis tick={{ fontSize: 9, fill: "#64748b" }} />
                        <Tooltip content={<BizTooltip />} />
                        <Bar dataKey="volatility" name="Volatility Index" radius={[3, 3, 0, 0]}>
                          {data.map((d, i) => (
                            <Cell key={i} fill={d.risk === "Spike Risk" ? "#ef4444" : d.risk === "Volatile" ? "#f59e0b" : "#10b981"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Demand Change Simulator */}
          <Card className="border-amber-200 bg-amber-50/20">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Demand Change Simulator
                <Badge variant="outline" className="text-[8px] border-amber-300 text-amber-700 bg-amber-50 font-bold">LAST RESORT</Badge>
              </CardTitle>
              <p className="text-[9px] text-amber-700 mt-0.5">Use only after all internal capacity and supplier actions have been evaluated.</p>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-700">Select Orders</p>
                  <Select defaultValue="all"><SelectTrigger className="h-6 text-[10px]"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all" className="text-xs">All at-risk orders</SelectItem></SelectContent>
                  </Select>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-6 text-[9px] flex-1">Push +7d</Button>
                    <Button size="sm" variant="outline" className="h-6 text-[9px] flex-1">Pull -7d</Button>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-2.5 border text-[10px] space-y-0.5">
                  <p className="font-bold text-slate-600 text-[9px]">OTIF Impact</p>
                  <p className="text-lg font-bold text-amber-600">-2.3%</p>
                  <p className="text-slate-500">12 orders affected</p>
                </div>
                <div className="bg-white rounded-lg p-2.5 border text-[10px] space-y-0.5">
                  <p className="font-bold text-slate-600 text-[9px]">Revenue Timing</p>
                  <p className="text-lg font-bold text-red-600">{fmt$(840000)}</p>
                  <p className="text-slate-500">deferred to next quarter</p>
                </div>
                <div className="bg-white rounded-lg p-2.5 border text-[10px] space-y-0.5">
                  <p className="font-bold text-slate-600 text-[9px]">Penalty Impact</p>
                  <p className="text-lg font-bold text-emerald-700">-{fmt$(120000)}</p>
                  <p className="text-slate-500">penalties avoided</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============= TAB 6: SCENARIO SIMULATOR ============= */}
        <TabsContent value="scenario" className="space-y-3 mt-3">
          <div className="flex gap-3">
            {/* Left: Scenario Inputs */}
            <div className="w-[260px] space-y-3 flex-shrink-0">
              <Card className="border-slate-200">
                <CardHeader className="pb-1 pt-3 px-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[10px] font-bold">{scenarioName}</CardTitle>
                    <div className="flex gap-0.5">
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => {
                        const result: ScenarioResult = {
                          name: scenarioName,
                          projectedOtif: 82.4 + scenOvertimeHrs * 0.05 + scenSupCapChange * 0.03,
                          revenueAtRisk: 12400000 - scenNewOrderQty * 8000 * 0.1 - scenOvertimeHrs * 5000,
                          penaltyExposure: 3200000 - scenOvertimeHrs * 8000 - Math.abs(scenSupCapChange) * 5000,
                          mitigationCost: scenOvertimeHrs * 2000 + Math.abs(scenSupCapChange) * 3000,
                          netBenefit: scenOvertimeHrs * 6000 + Math.abs(scenSupCapChange) * 2000,
                          ordersMoved: Math.floor(scenOvertimeHrs * 0.5 + Math.abs(scenSupCapChange) * 0.2),
                          avgPromiseDateShift: -(scenOvertimeHrs * 0.3 + Math.abs(scenSupCapChange) * 0.15),
                          capacityUtilization: 78.5 + scenOvertimeHrs * 0.1,
                        }
                        setSavedScenarios(prev => [...prev, { name: scenarioName, result }])
                      }}><Save className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0"><Copy className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0"><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2.5 px-3 pb-3">
                  <Input value={scenarioName} onChange={e => setScenarioName(e.target.value)} className="h-6 text-[10px]" placeholder="Scenario name" />

                  {/* Applied actions chips */}
                  {scenarioActions.length > 0 && (
                    <div className="flex flex-wrap gap-1 pb-1 border-b">
                      {scenarioActions.map(a => (
                        <Badge key={a.id} variant="outline" className="text-[8px] bg-blue-50 border-blue-200">
                          {a.type}: {a.parameter.substring(0, 12)}
                          <button className="ml-1" onClick={() => setScenarioActions(prev => prev.filter(x => x.id !== a.id))}><X className="w-2 h-2" /></button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="border-t pt-2">
                    <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Orders</p>
                    <Select defaultValue="US Army PEO C3T"><SelectTrigger className="h-5 text-[9px] mb-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{customers.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                    </Select>
                    <div className="flex gap-1">
                      <Input type="number" value={scenNewOrderQty} onChange={e => setScenNewOrderQty(Number(e.target.value))} className="h-5 text-[9px] flex-1" placeholder="Qty" />
                      <Input type="date" defaultValue="2026-04-15" className="h-5 text-[9px] flex-1" />
                    </div>
                  </div>

                  <div className="border-t pt-2">
                    <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Supplier Changes</p>
                    <Select defaultValue={suppliers[0]}><SelectTrigger className="h-5 text-[9px] mb-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{suppliers.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" className="h-5 w-5 p-0" onClick={() => setScenSupCapChange(v => v - 10)}><Minus className="w-2.5 h-2.5" /></Button>
                      <span className="text-[10px] font-bold w-10 text-center">{scenSupCapChange > 0 ? "+" : ""}{scenSupCapChange}%</span>
                      <Button size="sm" variant="outline" className="h-5 w-5 p-0" onClick={() => setScenSupCapChange(v => v + 10)}><Plus className="w-2.5 h-2.5" /></Button>
                    </div>
                  </div>

                  <div className="border-t pt-2">
                    <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Internal Capacity</p>
                    <p className="text-[9px] text-slate-500 mb-0.5">Overtime hrs/wk</p>
                    <Input type="number" value={scenOvertimeHrs} onChange={e => setScenOvertimeHrs(Number(e.target.value))} className="h-5 text-[9px]" />
                  </div>

                  <div className="border-t pt-2">
                    <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Disruptions</p>
                    <Select defaultValue="none"><SelectTrigger className="h-5 text-[9px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-xs">None</SelectItem>
                        <SelectItem value="fire" className="text-xs">Supplier fire/outage</SelectItem>
                        <SelectItem value="shutdown" className="text-xs">Temp shutdown (2wk)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[10px] h-7 mt-2">
                    <Play className="w-3 h-3 mr-1" />Run Scenario
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Center: Results */}
            <div className="flex-1 space-y-3">
              {/* Baseline vs Scenario KPI cards */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Projected OTIF", baseline: "82.4%", scenario: `${(82.4 + scenOvertimeHrs * 0.05 + scenSupCapChange * 0.03).toFixed(1)}%`, delta: scenOvertimeHrs * 0.05 + scenSupCapChange * 0.03 },
                  { label: "Revenue at Risk", baseline: fmt$(12400000), scenario: fmt$(12400000 - scenNewOrderQty * 8000 * 0.1 - scenOvertimeHrs * 5000), delta: -(scenNewOrderQty * 8000 * 0.1 + scenOvertimeHrs * 5000) },
                  { label: "Penalty Exposure", baseline: fmt$(3200000), scenario: fmt$(3200000 - scenOvertimeHrs * 8000 - Math.abs(scenSupCapChange) * 5000), delta: -(scenOvertimeHrs * 8000 + Math.abs(scenSupCapChange) * 5000) },
                  { label: "Net Cost/Benefit", baseline: "$0", scenario: fmt$(scenOvertimeHrs * 2000 + Math.abs(scenSupCapChange) * 3000), delta: scenOvertimeHrs * 2000 + Math.abs(scenSupCapChange) * 3000 },
                ].map(kpi => (
                  <Card key={kpi.label} className="border-slate-200">
                    <CardContent className="p-2.5">
                      <p className="text-[9px] text-slate-500 font-bold uppercase">{kpi.label}</p>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-[9px] text-slate-400 line-through">{kpi.baseline}</span>
                        <ArrowRight className="w-2.5 h-2.5 text-slate-300" />
                        <span className="text-sm font-bold text-slate-900">{kpi.scenario}</span>
                      </div>
                      <span className={`text-[9px] font-bold ${kpi.delta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {kpi.delta >= 0 ? "+" : ""}{Math.abs(kpi.delta) > 1000 ? fmt$(kpi.delta) : kpi.delta.toFixed(1)}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Constraint Shift + Tradeoff Chart */}
              <div className="grid grid-cols-2 gap-3">
                {/* Constraint Shift View */}
                <Card className="border-slate-200">
                  <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs font-bold">Constraint Shift (Baseline vs Scenario)</CardTitle></CardHeader>
                  <CardContent className="pb-3">
                    {(() => {
                      const data = ["Component Supply", "FG/WIP Avail.", "Floor Capacity", "Labor", "Tooling/Yield", "Lead Time"].map(c => ({
                        constraint: c,
                        baseline: Math.floor(Math.random() * 60 + 20),
                        scenario: Math.floor(Math.random() * 50 + 10),
                      }))
                      return (
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={data} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis type="number" tick={{ fontSize: 9, fill: "#64748b" }} />
                            <YAxis dataKey="constraint" type="category" tick={{ fontSize: 9, fontWeight: 600, fill: "#334155" }} width={65} />
                            <Tooltip content={<BizTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 9, fontWeight: 600 }} />
                            <Bar dataKey="baseline" fill="#94a3b8" name="Baseline" radius={[0, 3, 3, 0]} />
                            <Bar dataKey="scenario" fill="#3b82f6" name="Scenario" radius={[0, 3, 3, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )
                    })()}
                  </CardContent>
                </Card>

                {/* Tradeoff Chart */}
                <Card className="border-slate-200">
                  <CardHeader className="pb-1 pt-3 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-bold">Cost vs Outcome Tradeoff</CardTitle>
                      <div className="flex gap-1">
                        {(["otif", "penalty"] as const).map(m => (
                          <button key={m} onClick={() => setScenTradeoffY(m)} className={`px-2 py-0.5 text-[9px] font-semibold rounded ${scenTradeoffY === m ? "bg-blue-100 text-blue-700" : "text-slate-400"}`}>
                            {m === "otif" ? "OTIF" : "Penalty Avoided"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    {(() => {
                      const data = [
                        { name: "Baseline", cost: 0, otif: 82.4, penalty: 0 },
                        { name: scenarioName, cost: scenOvertimeHrs * 2000 + Math.abs(scenSupCapChange) * 3000, otif: 82.4 + scenOvertimeHrs * 0.05 + scenSupCapChange * 0.03, penalty: scenOvertimeHrs * 8000 + Math.abs(scenSupCapChange) * 5000 },
                        ...savedScenarios.map(s => ({ name: s.name, cost: s.result.mitigationCost, otif: s.result.projectedOtif, penalty: s.result.penaltyExposure })),
                      ]
                      return (
                        <ResponsiveContainer width="100%" height={200}>
                          <ScatterChart>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="cost" name="Cost" tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={v => fmt$(v)} label={{ value: "Mitigation Cost", position: "bottom", fontSize: 9, offset: -5 }} />
                            <YAxis dataKey={scenTradeoffY} name={scenTradeoffY === "otif" ? "OTIF %" : "Penalty Avoided"} tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={v => scenTradeoffY === "otif" ? `${v}%` : fmt$(v)} />
                            <Tooltip content={<BizTooltip metric="Click point to load scenario" />} />
                            <Scatter data={data} name="Scenarios">
                              {data.map((d, i) => (
                                <Cell key={i} fill={i === 0 ? "#94a3b8" : i === 1 ? "#3b82f6" : "#f59e0b"} r={i === 1 ? 8 : 6} />
                              ))}
                            </Scatter>
                          </ScatterChart>
                        </ResponsiveContainer>
                      )
                    })()}
                  </CardContent>
                </Card>
              </div>

              {/* Promise Date Impact Table */}
              <Card className="border-slate-200">
                <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs font-bold">Promise Date Impact</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-y-auto max-h-[230px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {["Order", "Customer", "Program", "CLIN", "Old Promise", "New Promise", "Shift", "Penalty Change", "Threshold"].map(h => (
                            <TableHead key={h} className="text-[9px] font-bold px-1.5 py-1">{h}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.filter(o => o.severityDays > 5).slice(0, 12).map(o => {
                          const shift = Math.max(0, Math.floor(o.severityDays * (1 - (scenOvertimeHrs * 0.01 + Math.abs(scenSupCapChange) * 0.005))))
                          const thresholdCrossed = o.severityDays > o.penaltyThresholdDays && shift <= o.penaltyThresholdDays
                          return (
                            <TableRow key={o.orderId} className={thresholdCrossed ? "bg-green-50/50" : ""}>
                              <TableCell className="text-[10px] font-bold text-blue-700 px-1.5 py-1">{o.orderId}</TableCell>
                              <TableCell className="text-[10px] px-1.5 py-1 max-w-[70px] truncate">{o.customer}</TableCell>
                              <TableCell className="text-[10px] px-1.5 py-1">{o.program.split(" ")[0]}</TableCell>
                              <TableCell className="text-[10px] px-1.5 py-1 font-mono">{o.clin}</TableCell>
                              <TableCell className="text-[10px] px-1.5 py-1 font-mono">{o.promiseDate.replace("2026-", "")}</TableCell>
                              <TableCell className="text-[10px] px-1.5 py-1 font-bold text-emerald-700">{shift < o.severityDays ? "Improved" : "No change"}</TableCell>
                              <TableCell className="text-[10px] px-1.5 py-1">{shift > 0 ? `-${o.severityDays - shift}d` : "0d"}</TableCell>
                              <TableCell className="text-[10px] px-1.5 py-1">
                                <span className={shift < o.severityDays ? "text-emerald-700 font-bold" : "text-slate-400"}>
                                  {shift < o.severityDays ? `-${fmt$(Math.floor(o.penaltyExposure * 0.3))}` : "$0"}
                                </span>
                              </TableCell>
                              <TableCell className="px-1.5 py-1">
                                {thresholdCrossed ? <Badge className="text-[8px] bg-green-100 text-green-800 border-green-200">Cleared</Badge> :
                                  o.severityDays > o.penaltyThresholdDays ? <Badge className="text-[8px] bg-red-100 text-red-800 border-red-200">Breached</Badge> : null}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Action Log */}
            <div className="w-[200px] flex-shrink-0">
              <Card className="border-slate-200 h-full">
                <CardHeader className="pb-1 pt-3 px-3">
                  <CardTitle className="text-[10px] font-bold">Action Log</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 px-3 pb-3">
                  {scenarioActions.length === 0 && scenNewOrderQty === 50 && scenSupCapChange === 0 && scenOvertimeHrs === 0 ? (
                    <p className="text-[10px] text-slate-400 text-center py-3">Adjust inputs or apply actions from other tabs</p>
                  ) : (
                    <>
                      {scenarioActions.map((a, i) => (
                        <div key={a.id} className="p-1.5 bg-blue-50 rounded border border-blue-100 text-[9px] flex items-start justify-between">
                          <div>
                            <p className="font-bold text-blue-800">{a.type}</p>
                            <p className="text-slate-600 truncate max-w-[130px]">{a.description}</p>
                          </div>
                          <button onClick={() => setScenarioActions(prev => prev.filter(x => x.id !== a.id))} className="p-0.5 hover:bg-blue-100 rounded"><X className="w-2.5 h-2.5 text-blue-400" /></button>
                        </div>
                      ))}
                      {scenNewOrderQty !== 50 && (
                        <div className="p-1.5 bg-blue-50 rounded border border-blue-100 text-[9px]">
                          <p className="font-bold">Add Order</p><p className="text-slate-600">Qty: {scenNewOrderQty}</p>
                        </div>
                      )}
                      {scenSupCapChange !== 0 && (
                        <div className="p-1.5 bg-amber-50 rounded border border-amber-100 text-[9px]">
                          <p className="font-bold">Supplier Cap</p><p className="text-slate-600">{scenSupCapChange > 0 ? "+" : ""}{scenSupCapChange}%</p>
                        </div>
                      )}
                      {scenOvertimeHrs > 0 && (
                        <div className="p-1.5 bg-green-50 rounded border border-green-100 text-[9px]">
                          <p className="font-bold">Overtime</p><p className="text-slate-600">{scenOvertimeHrs} hrs/wk</p>
                        </div>
                      )}
                    </>
                  )}
                  <div className="border-t pt-2 space-y-1">
                    <Button size="sm" variant="outline" className="w-full h-5 text-[9px]" onClick={() => {
                      const result: ScenarioResult = {
                        name: scenarioName,
                        projectedOtif: 82.4 + scenOvertimeHrs * 0.05 + scenSupCapChange * 0.03,
                        revenueAtRisk: 12400000, penaltyExposure: 3200000,
                        mitigationCost: scenOvertimeHrs * 2000, netBenefit: 0,
                        ordersMoved: 0, avgPromiseDateShift: 0, capacityUtilization: 78.5,
                      }
                      setSavedScenarios(prev => [...prev, { name: scenarioName, result }])
                    }}><Save className="w-2.5 h-2.5 mr-1" />Save</Button>
                    <Button size="sm" variant="outline" className="w-full h-5 text-[9px]"><Copy className="w-2.5 h-2.5 mr-1" />Duplicate</Button>
                    <Button size="sm" variant="ghost" className="w-full h-5 text-[9px] text-red-600" onClick={() => {
                      setScenarioActions([]); setScenNewOrderQty(50); setScenSupCapChange(0); setScenOvertimeHrs(0)
                    }}><RotateCcw className="w-2.5 h-2.5 mr-1" />Reset</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ============= TAB 7: CONTRACTS / PENALTIES ============= */}
        <TabsContent value="contracts" className="space-y-3 mt-3">
          <div className="grid grid-cols-3 gap-3">
            {/* Contract Rule Browser */}
            <Card className="border-slate-200">
              <CardHeader className="pb-1 pt-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold">Contract Rule Browser</CardTitle>
                </div>
                <div className="relative mt-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                  <Input placeholder="Search contract, customer, CLIN..." value={contractSearch} onChange={e => setContractSearch(e.target.value)} className="h-6 text-[10px] pl-7" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-y-auto max-h-[360px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {["Contract", "Customer", "CLIN", "Grace", "$/Day", "Cap"].map(h => (
                          <TableHead key={h} className="text-[9px] font-bold px-1.5 py-1">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contractRules.filter(r => {
                        if (!contractSearch) return true
                        const q = contractSearch.toLowerCase()
                        return r.contractId.toLowerCase().includes(q) || r.customer.toLowerCase().includes(q) || r.clin.toLowerCase().includes(q)
                      }).map(r => (
                        <TableRow key={r.contractId} className="cursor-pointer hover:bg-blue-50/30">
                          <TableCell className="text-[10px] font-bold text-blue-700 px-1.5 py-1">{r.contractId}</TableCell>
                          <TableCell className="text-[10px] px-1.5 py-1 max-w-[70px] truncate">{r.customer}</TableCell>
                          <TableCell className="text-[10px] px-1.5 py-1 font-mono">{r.clin}</TableCell>
                          <TableCell className="text-[10px] px-1.5 py-1">{r.gracePeriodDays}d</TableCell>
                          <TableCell className="text-[10px] px-1.5 py-1 font-semibold">{fmt$(r.penaltyPerDay)}</TableCell>
                          <TableCell className="text-[10px] px-1.5 py-1">{fmt$(r.maxPenaltyCap)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Penalty Exposure Timeline */}
            <Card className="col-span-2 border-slate-200">
              <CardHeader className="pb-1 pt-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold">Penalty Exposure Timeline</CardTitle>
                  <div className="flex gap-1">
                    {(["customer", "plant", "clin"] as const).map(v => (
                      <button key={v} onClick={() => setPenaltyView(v)} className={`px-2 py-0.5 text-[9px] font-semibold rounded ${penaltyView === v ? "bg-blue-100 text-blue-700" : "text-slate-400"}`}>
                        {v.charAt(0).toUpperCase() + v.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                {(() => {
                  const periods = ["W1 Feb", "W2 Feb", "W3 Feb", "W4 Feb", "W1 Mar", "W2 Mar", "W3 Mar", "W4 Mar"]
                  const data = periods.map((p, i) => ({
                    period: p,
                    baseline: Math.floor(3200000 / 8 * (1 + i * 0.05)),
                    scenario: Math.floor(3200000 / 8 * (1 + i * 0.05) * 0.75),
                  }))
                  return (
                    <ResponsiveContainer width="100%" height={260}>
                      <ComposedChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="period" tick={{ fontSize: 9, fill: "#64748b" }} />
                        <YAxis tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={v => fmt$(v)} />
                        <Tooltip content={<BizTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 9, fontWeight: 600 }} />
                        <Bar dataKey="baseline" fill="#ef4444" name="Baseline Penalty" opacity={0.5} radius={[3, 3, 0, 0]} />
                        <Bar dataKey="scenario" fill="#3b82f6" name="Scenario Penalty" radius={[3, 3, 0, 0]} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Order/CLIN Penalty Table */}
          <Card className="border-slate-200">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-bold">Order / CLIN Penalty Detail</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-slate-50 z-10">
                    <TableRow>
                      {["Order", "CLIN", "Customer", "Contract", "Projected", "Days Late", "Threshold", "Status", "Penalty", "Mit. Cost", "Net"].map(h => (
                        <TableHead key={h} className="text-[9px] font-bold px-1.5 py-1 whitespace-nowrap">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.filter(o => o.penaltyExposure > 0).slice(0, 20).map(o => (
                      <TableRow key={o.orderId} className="cursor-pointer hover:bg-blue-50/30" onClick={() => setDrawerOrder(o)}>
                        <TableCell className="text-[10px] font-bold text-blue-700 px-1.5 py-1">{o.orderId}</TableCell>
                        <TableCell className="text-[10px] px-1.5 py-1 font-mono">{o.clin}</TableCell>
                        <TableCell className="text-[10px] px-1.5 py-1 max-w-[80px] truncate">{o.customer}</TableCell>
                        <TableCell className="text-[10px] px-1.5 py-1 font-mono">{o.contractDate.replace("2026-", "")}</TableCell>
                        <TableCell className="text-[10px] px-1.5 py-1 font-mono">{o.projectedDate.replace("2026-", "")}</TableCell>
                        <TableCell className="text-[10px] font-bold text-red-600 px-1.5 py-1">{o.severityDays}d</TableCell>
                        <TableCell className="text-[10px] px-1.5 py-1">{o.penaltyThresholdDays}d</TableCell>
                        <TableCell className="px-1.5 py-1">
                          {o.severityDays > o.penaltyThresholdDays ?
                            <Badge className="text-[8px] bg-red-100 text-red-800 border-red-200 font-bold">BREACHED</Badge> :
                            <Badge className="text-[8px] bg-amber-100 text-amber-800 border-amber-200">At Risk</Badge>}
                        </TableCell>
                        <TableCell className="text-[10px] font-bold text-red-700 px-1.5 py-1">{fmt$(o.penaltyExposure)}</TableCell>
                        <TableCell className="text-[10px] px-1.5 py-1">{fmt$(o.estimatedMitigationCost)}</TableCell>
                        <TableCell className="px-1.5 py-1">
                          <span className={`text-[10px] font-bold ${o.penaltyAvoided - o.estimatedMitigationCost > 0 ? "text-emerald-700" : "text-red-600"}`}>
                            {fmt$(o.penaltyAvoided - o.estimatedMitigationCost)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Mitigation Comparison */}
          <Card className="border-slate-200">
            <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs font-bold">Mitigation vs Penalty Comparison</CardTitle></CardHeader>
            <CardContent className="pb-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { action: "Expedite Logistics", cost: 85000, penaltyAvoided: 210000, revPreserved: 1200000 },
                    { action: "Ramp Alt Supplier", cost: 120000, penaltyAvoided: 340000, revPreserved: 2100000 },
                    { action: "Add Capacity (OT)", cost: 65000, penaltyAvoided: 180000, revPreserved: 950000 },
                    { action: "Accept Lateness", cost: 0, penaltyAvoided: 0, revPreserved: 0 },
                  ].map(m => (
                    <div key={m.action} className={`p-2.5 rounded-lg border ${m.penaltyAvoided - m.cost > 0 ? "border-green-200 bg-green-50/30" : m.cost === 0 ? "border-red-200 bg-red-50/20" : "border-slate-200"}`}>
                      <p className="text-[10px] font-bold text-slate-800">{m.action}</p>
                      <div className="mt-1.5 space-y-0.5 text-[9px]">
                        <div className="flex justify-between"><span className="text-slate-500">Cost:</span><span className="font-bold text-red-600">{fmt$(m.cost)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Avoided:</span><span className="font-bold text-emerald-700">{fmt$(m.penaltyAvoided)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Rev:</span><span className="font-bold">{fmt$(m.revPreserved)}</span></div>
                        <div className="border-t pt-0.5 flex justify-between font-bold">
                          <span>Net:</span>
                          <span className={m.penaltyAvoided - m.cost > 0 ? "text-emerald-700" : "text-red-600"}>{fmt$(m.penaltyAvoided - m.cost)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Bar comparison chart */}
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[
                    { action: "Expedite", cost: 85, avoided: 210, net: 125 },
                    { action: "Alt Supplier", cost: 120, avoided: 340, net: 220 },
                    { action: "Add OT", cost: 65, avoided: 180, net: 115 },
                    { action: "Accept", cost: 0, avoided: 0, net: 0 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="action" tick={{ fontSize: 9, fontWeight: 600, fill: "#334155" }} />
                    <YAxis tick={{ fontSize: 9, fill: "#64748b" }} label={{ value: "$K", angle: -90, position: "insideLeft", fontSize: 9 }} />
                    <Tooltip content={<BizTooltip metric="Values in $K" />} />
                    <Legend wrapperStyle={{ fontSize: 9, fontWeight: 600 }} />
                    <Bar dataKey="cost" fill="#ef4444" name="Mit. Cost" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="avoided" fill="#10b981" name="Penalty Avoided" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="net" fill="#3b82f6" name="Net Effect" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
