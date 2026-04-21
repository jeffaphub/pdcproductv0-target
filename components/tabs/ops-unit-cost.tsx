"use client"

import { useState, useMemo } from "react"
import { formatCurrency } from "@/lib/utils"
import {
  costsData, subcomponentMap, buildCostData, generateBOM, getFlatCostTable,
  getSubsystemDrilldown, getCostDriverBreakdown,
  type SubsystemName, type BOMRow, type FlatCostRow,
} from "@/lib/ops-unit-cost-data"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, Treemap, Cell, Legend, LabelList,
} from "recharts"
import { ChevronRight, ChevronDown, Download, ArrowLeft } from "lucide-react"

type SubTab = "labor-nonlabor" | "sunburst" | "treemap" | "cost-trend" | "indented-bom" | "data-table" | "drilldown"

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "labor-nonlabor", label: "Labor vs. Non-Labor" },
  { id: "sunburst", label: "Sunburst" },
  { id: "treemap", label: "TreeMap" },
  { id: "cost-trend", label: "Cost Trend" },
  { id: "indented-bom", label: "Indented BOM" },
  { id: "data-table", label: "Data Table" },
  { id: "drilldown", label: "Drilldown" },
]

const BLUE = "#3B82F6"
const ORANGE = "#F97316"
const COLORS_TREEMAP = ["#1e3a5f", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"]

// ---- Shared: bar label formatter ----
function shortM(v: number) {
  return `${(v / 1e6).toFixed(1)}`
}

// =================== KPI Tiles ===================
function KPIRow() {
  const totalCost = costsData.reduce((s, c) => s + c.total, 0)
  const targetCost = 9_900_000
  const gap = totalCost - targetCost
  const gapPct = ((gap / targetCost) * 100).toFixed(1)
  const ytdSavings = 500_000
  const potentialSavings = 1_200_000

  const tiles = [
    { label: "Current Unit Cost", value: formatCurrency(totalCost, true), color: "text-green-700" },
    { label: "Target Unit Cost", value: formatCurrency(targetCost, true), color: "text-blue-700" },
    { label: "Gap to Target", value: `${formatCurrency(gap, true)}`, extra: `(+${gapPct}%)`, color: "text-red-600" },
    { label: "YTD Savings", value: formatCurrency(ytdSavings, true), color: "text-slate-900" },
    { label: "Potential Savings", value: formatCurrency(potentialSavings, true), color: "text-green-700" },
  ]

  return (
    <div className="grid grid-cols-5 gap-4 mb-2">
      {tiles.map(t => (
        <div key={t.label} className="border border-gray-200 rounded-xl bg-white p-5">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{t.label}</p>
          <p className={`text-2xl font-bold mt-1 ${t.color}`}>
            {t.value}
            {t.extra && <span className="text-base font-semibold ml-1 text-orange-500">{t.extra}</span>}
          </p>
        </div>
      ))}
    </div>
  )
}

// =================== Labor vs Non-Labor (Overview) ===================
function LaborNonLaborOverview({ onSubsystemClick }: { onSubsystemClick: (name: SubsystemName) => void }) {
  // Build stacked bar data sorted by total descending
  const sorted = [...costsData].sort((a, b) => b.total - a.total)
  const barData = sorted.map(c => ({
    name: c.name,
    labor: c.labor / 1e6,
    nonLabor: c.nonLabor / 1e6,
    total: c.total / 1e6,
  }))

  // Waterfall cumulative
  let cum = 0
  const waterfallData = sorted.map(c => {
    const row = { name: c.name, labor: c.labor / 1e6, nonLabor: c.nonLabor / 1e6 }
    cum += c.total / 1e6
    return { ...row, cumulative: +cum.toFixed(1) }
  })
  waterfallData.push({ name: "Total", labor: sorted.reduce((s, c) => s + c.labor, 0) / 1e6, nonLabor: sorted.reduce((s, c) => s + c.nonLabor, 0) / 1e6, cumulative: cum })

  return (
    <div className="space-y-6">
      {/* Stacked bar chart */}
      <div className="border border-gray-200 rounded-xl bg-white p-6">
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={barData} onClick={(e: any) => { if (e?.activeLabel) onSubsystemClick(e.activeLabel as SubsystemName) }} barSize={40}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#374151" }} interval={0} angle={-25} textAnchor="end" height={70} />
            <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} label={{ value: "Cost ($M)", angle: -90, position: "insideLeft", fontSize: 12, fill: "#6b7280" }} />
            <Tooltip formatter={(value: number) => `$${value.toFixed(1)}M`} labelStyle={{ fontWeight: 700 }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="labor" stackId="a" fill={BLUE} name="Labor" radius={[0, 0, 0, 0]}>
              <LabelList dataKey="labor" position="inside" fill="#fff" fontSize={10} fontWeight={700} formatter={(v: number) => v.toFixed(1)} />
            </Bar>
            <Bar dataKey="nonLabor" stackId="a" fill={ORANGE} name="Non-Labor" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="nonLabor" position="inside" fill="#fff" fontSize={10} fontWeight={700} formatter={(v: number) => v.toFixed(1)} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-6 mt-4 text-sm text-gray-500">
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: BLUE }} /> Labor</span>
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: ORANGE }} /> Non-Labor</span>
        </div>
      </div>

      {/* Waterfall chart */}
      <div className="border border-gray-200 rounded-xl bg-white p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">Cost Waterfall by Subsystem</h3>
        <div className="flex items-center gap-6 mb-3 text-sm text-gray-500">
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: BLUE }} /> Labor</span>
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: ORANGE }} /> Non-Labor</span>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={waterfallData} barSize={36}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#374151" }} interval={0} angle={-25} textAnchor="end" height={70} />
            <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} label={{ value: "Cost ($M)", angle: -90, position: "insideLeft", fontSize: 12, fill: "#6b7280" }} />
            <Tooltip formatter={(value: number) => `$${value.toFixed(1)}M`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="labor" stackId="a" fill={BLUE} name="Labor" />
            <Bar dataKey="nonLabor" stackId="a" fill={ORANGE} name="Non-Labor" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// =================== Drilldown Panel ===================
function DrilldownPanel({ subsystem, onBack }: { subsystem: SubsystemName; onBack: () => void }) {
  const { laborOps, nonLaborItems } = useMemo(() => getSubsystemDrilldown(subsystem), [subsystem])
  const waterfall = useMemo(() => getCostDriverBreakdown(subsystem), [subsystem])
  const [drillTab, setDrillTab] = useState<"overview" | "waterfall">("overview")

  const sub = costsData.find(c => c.name === subsystem)
  const laborTotal = sub?.labor || 0
  const nonLaborTotal = sub?.nonLabor || 0

  // KPI-like metrics for drill
  const drillKPIs = [
    { label: "Labor Hours/Unit", value: "3.68", sub: "Std: 3.20", subColor: "text-red-500", subExtra: "(+14.9%)" },
    { label: "Avg Loaded Rate", value: "$108/hr", sub: "Blended all ops" },
    { label: "Overtime %", value: "9.3%", sub: "Target: 5%" },
    { label: "First-Pass Yield", value: "96.0%", sub: "Rework: 4.0%" },
    { label: "Material Yield", value: "59.1%", sub: "BTF: 1.69x" },
    { label: "Scrap %", value: "8.0%", sub: "Target: 2%" },
    { label: "Special Process", value: "$1K", sub: "Per unit" },
    { label: "Tooling/NRE", value: "$0K", sub: "Amortized" },
  ]

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
        <button onClick={onBack} className="text-blue-600 hover:underline font-medium">Overview</button>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="font-semibold text-gray-900">{subsystem}</span>
      </div>

      {/* Overview / Cost Waterfall sub-toggle */}
      <div className="flex gap-1 mb-4">
        <button onClick={() => setDrillTab("overview")} className={`px-4 py-1.5 text-xs font-semibold rounded-lg border ${drillTab === "overview" ? "bg-white border-gray-300 text-gray-900 shadow-sm" : "border-transparent text-gray-400 hover:text-gray-600"}`}>Overview</button>
        <button onClick={() => setDrillTab("waterfall")} className={`px-4 py-1.5 text-xs font-semibold rounded-lg border ${drillTab === "waterfall" ? "bg-white border-gray-300 text-gray-900 shadow-sm" : "border-transparent text-gray-400 hover:text-gray-600"}`}>Cost Waterfall</button>
      </div>

      {drillTab === "overview" ? (
        <div className="space-y-6">
          {/* Mini KPI row */}
          <div className="grid grid-cols-8 gap-3">
            {drillKPIs.map(k => (
              <div key={k.label} className="border border-gray-200 rounded-xl bg-white p-3">
                <p className="text-[10px] text-gray-400 font-medium leading-tight">{k.label}</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{k.value}</p>
                {k.sub && <p className={`text-[10px] mt-0.5 ${k.subColor || "text-gray-400"}`}>{k.sub} {k.subExtra || ""}</p>}
              </div>
            ))}
          </div>

          {/* Labor + Non-Labor Pareto charts side by side */}
          <div className="grid grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-xl bg-white p-6">
              <h3 className="text-base font-bold text-gray-900 mb-4">Labor Cost Drivers (Pareto)</h3>
              {laborOps.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={laborOps.sort((a, b) => b.cost - a.cost)} barSize={32}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="operation" tick={{ fontSize: 10, fill: "#374151" }} interval={0} angle={-30} textAnchor="end" height={80} />
                      <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} label={{ value: "Cost ($K)", angle: -90, position: "insideLeft", fontSize: 12, fill: "#6b7280" }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="cost" fill={BLUE} radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="cost" position="top" fill="#374151" fontSize={9} fontWeight={600} formatter={(v: number) => `$${(v / 1000).toFixed(1)}K`} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-blue-600 underline mt-2 cursor-pointer">Click a bar to drill into operation details</p>
                </>
              ) : <p className="text-sm text-gray-400 py-12 text-center">No labor operation data for this subsystem</p>}
            </div>

            <div className="border border-gray-200 rounded-xl bg-white p-6">
              <h3 className="text-base font-bold text-gray-900 mb-4">Non-Labor Cost Drivers</h3>
              {nonLaborItems.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={(() => {
                      const grouped: Record<string, number> = {}
                      nonLaborItems.forEach(item => { grouped[item.category] = (grouped[item.category] || 0) + item.cost })
                      return Object.entries(grouped).sort((a, b) => b[1] - a[1]).map(([cat, cost]) => ({ category: cat, cost: cost / 1000 }))
                    })()} barSize={32}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="category" tick={{ fontSize: 10, fill: "#374151" }} interval={0} angle={-30} textAnchor="end" height={80} />
                      <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} label={{ value: "Cost ($K)", angle: -90, position: "insideLeft", fontSize: 12, fill: "#6b7280" }} />
                      <Tooltip formatter={(value: number) => `$${value.toFixed(1)}K`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="cost" fill={ORANGE} radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="cost" position="top" fill="#374151" fontSize={9} fontWeight={600} formatter={(v: number) => `$${v.toFixed(1)}K`} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-blue-600 underline mt-2 cursor-pointer">Click a bar to drill into category details</p>
                </>
              ) : <p className="text-sm text-gray-400 py-12 text-center">No non-labor data for this subsystem</p>}
            </div>
          </div>

          {/* Cost Driver Trends */}
          <div className="border border-gray-200 rounded-xl bg-white p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4">Cost Driver Trends (Last 12 Units)</h3>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={buildCostData.slice(-12).map((b, i) => ({ unit: `U${i + 1}`, hours: +(3 + Math.random() * 1.5).toFixed(1), overtime: +(5 + Math.random() * 8).toFixed(1), scrapCost: Math.round(400 + Math.random() * 600) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="unit" tick={{ fontSize: 11, fill: "#374151" }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#6b7280" }} label={{ value: "Hours & %", angle: -90, position: "insideLeft", fontSize: 12, fill: "#6b7280" }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#6b7280" }} label={{ value: "$ & Units", angle: 90, position: "insideRight", fontSize: 12, fill: "#6b7280" }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Line yAxisId="left" type="monotone" dataKey="hours" stroke={BLUE} strokeWidth={2} dot={{ r: 4, fill: "#fff", strokeWidth: 2, stroke: BLUE }} name="Labor Hrs/Unit" />
                <Line yAxisId="left" type="monotone" dataKey="overtime" stroke="#EF4444" strokeWidth={2} dot={{ r: 4, fill: "#fff", strokeWidth: 2, stroke: "#EF4444" }} name="Overtime %" />
                <Line yAxisId="right" type="monotone" dataKey="scrapCost" stroke="#10B981" strokeWidth={2} dot={{ r: 4, fill: "#fff", strokeWidth: 2, stroke: "#10B981" }} name="Scrap $/Unit" />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl bg-white p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">Cost Drivers: Actual vs Target</h3>
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={waterfall}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="driver" tick={{ fontSize: 10, fill: "#374151" }} interval={0} angle={-20} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v: number) => `$${(v / 1e6).toFixed(1)}M`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="actual" fill={BLUE} name="Actual" radius={[3, 3, 0, 0]} />
              <Bar dataKey="target" fill="#D1D5DB" name="Target" radius={[3, 3, 0, 0]} />
              <Line type="monotone" dataKey="delta" stroke="#EF4444" name="Delta" strokeWidth={2} dot={{ r: 4 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// =================== Sunburst (Treemap proxy) ===================
function SunburstView() {
  const flat = costsData.flatMap(c =>
    (subcomponentMap[c.name] || []).map(sc => ({ name: sc.name, value: sc.total, subsystem: c.name }))
  )
  return (
    <div className="border border-gray-200 rounded-xl bg-white p-6">
      <h3 className="text-base font-bold text-gray-900 mb-1">Cost Distribution (Sunburst)</h3>
      <p className="text-sm text-gray-400 mb-4">Subsystem and subcomponent cost breakdown</p>
      <ResponsiveContainer width="100%" height={420}>
        <Treemap data={flat} dataKey="value" nameKey="name" stroke="#fff" strokeWidth={2}>
          {flat.map((_, i) => <Cell key={i} fill={COLORS_TREEMAP[i % COLORS_TREEMAP.length]} />)}
          <Tooltip formatter={(value: number) => formatCurrency(value as number)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        </Treemap>
      </ResponsiveContainer>
    </div>
  )
}

// =================== TreeMap ===================
function TreeMapView() {
  const flat = costsData.flatMap(c =>
    (subcomponentMap[c.name] || []).map(sc => ({ name: `${c.name} > ${sc.name}`, value: sc.total, subsystem: c.name }))
  )
  return (
    <div className="space-y-6">
      <div className="border border-gray-200 rounded-xl bg-white p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">TreeMap - Cost by Subcomponent</h3>
        <ResponsiveContainer width="100%" height={380}>
          <Treemap data={flat} dataKey="value" nameKey="name" stroke="#fff" strokeWidth={2}>
            {flat.map((entry, i) => {
              const idx = costsData.findIndex(c => c.name === entry.subsystem)
              return <Cell key={i} fill={COLORS_TREEMAP[idx >= 0 ? idx : i % COLORS_TREEMAP.length]} />
            })}
            <Tooltip formatter={(value: number) => formatCurrency(value as number)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          </Treemap>
        </ResponsiveContainer>
      </div>
      <div className="border border-gray-200 rounded-xl bg-white p-6">
        <div className="overflow-auto max-h-[300px]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0"><tr>
              <th className="text-left py-2 px-3 font-semibold text-gray-600">Subsystem</th>
              <th className="text-left py-2 px-3 font-semibold text-gray-600">Subcomponent</th>
              <th className="text-right py-2 px-3 font-semibold text-gray-600">Labor</th>
              <th className="text-right py-2 px-3 font-semibold text-gray-600">Non-Labor</th>
              <th className="text-right py-2 px-3 font-semibold text-gray-600">Total</th>
            </tr></thead>
            <tbody>
              {Object.entries(subcomponentMap).flatMap(([sub, scs]) =>
                scs.map((sc, i) => (
                  <tr key={`${sub}-${i}`} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-500">{sub}</td>
                    <td className="py-2 px-3 font-medium text-gray-800">{sc.name}</td>
                    <td className="py-2 px-3 text-right">{formatCurrency(sc.labor, true)}</td>
                    <td className="py-2 px-3 text-right">{formatCurrency(sc.nonLabor, true)}</td>
                    <td className="py-2 px-3 text-right font-bold">{formatCurrency(sc.total, true)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// =================== Cost Trend ===================
function CostTrendView() {
  const last10 = buildCostData.slice(-10)
  return (
    <div className="space-y-6">
      <div className="border border-gray-200 rounded-xl bg-white p-6">
        <h3 className="text-base font-bold text-gray-900 mb-1">Cost Trend by Build (100 builds)</h3>
        <p className="text-sm text-gray-400 mb-4">Actual vs expected with learning curve</p>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={buildCostData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="build" tick={{ fontSize: 11, fill: "#6b7280" }} />
            <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v: number) => `$${(v / 1e6).toFixed(1)}M`} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Line type="monotone" dataKey="total" stroke={BLUE} strokeWidth={1.5} dot={false} name="Actual" />
            <Line type="monotone" dataKey="expected" stroke="#9CA3AF" strokeWidth={2} strokeDasharray="6 3" dot={false} name="Expected" />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="border border-gray-200 rounded-xl bg-white p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">Variance Breakdown (Last 10 Builds)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={last10}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="build" tick={{ fontSize: 11, fill: "#6b7280" }} />
            <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="laborVariance" fill={BLUE} name="Labor Var" />
            <Bar dataKey="mixVariance" fill="#8B5CF6" name="Mix Var" />
            <Bar dataKey="priceVariance" fill={ORANGE} name="Price Var" />
            <Bar dataKey="routingVariance" fill="#14B8A6" name="Routing Var" />
            <Line type="monotone" dataKey="totalVariance" stroke="#EF4444" strokeWidth={2} dot={{ r: 4 }} name="Total Var" />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// =================== Indented BOM ===================
function BOMRowComp({ row, depth = 0 }: { row: BOMRow; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 1)
  const hasChildren = row.children && row.children.length > 0
  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50">
        <td className="py-2 px-3" style={{ paddingLeft: `${depth * 24 + 12}px` }}>
          {hasChildren ? (
            <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
              {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              {row.partNumber}
            </button>
          ) : (
            <span className="text-sm text-gray-600 ml-5">{row.partNumber}</span>
          )}
        </td>
        <td className="py-2 px-3 text-sm text-gray-700">{row.description}</td>
        <td className="py-2 px-3 text-sm text-right text-gray-600">{row.qty}</td>
        <td className="py-2 px-3 text-sm text-right text-gray-600">{formatCurrency(row.unitCost, true)}</td>
        <td className="py-2 px-3 text-sm text-right font-bold text-gray-800">{formatCurrency(row.extCost, true)}</td>
      </tr>
      {expanded && hasChildren && row.children!.map((child, i) => (
        <BOMRowComp key={i} row={child} depth={depth + 1} />
      ))}
    </>
  )
}

function IndentedBOMView() {
  const bom = useMemo(() => generateBOM(), [])
  return (
    <div className="border border-gray-200 rounded-xl bg-white p-6">
      <h3 className="text-base font-bold text-gray-900 mb-1">Indented Bill of Materials</h3>
      <p className="text-sm text-gray-400 mb-4">Expandable tree view of product structure</p>
      <div className="max-h-[500px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0"><tr>
            <th className="text-left py-2 px-3 font-semibold text-gray-600">Part Number</th>
            <th className="text-left py-2 px-3 font-semibold text-gray-600">Description</th>
            <th className="text-right py-2 px-3 font-semibold text-gray-600">Qty</th>
            <th className="text-right py-2 px-3 font-semibold text-gray-600">Unit Cost</th>
            <th className="text-right py-2 px-3 font-semibold text-gray-600">Ext. Cost</th>
          </tr></thead>
          <tbody>
            {bom.map((row, i) => <BOMRowComp key={i} row={row} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// =================== Data Table ===================
function DataTableView() {
  const data = useMemo(() => getFlatCostTable(), [])
  const [sortCol, setSortCol] = useState<keyof FlatCostRow>("total")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const sorted = useMemo(() => [...data].sort((a, b) => {
    const av = a[sortCol], bv = b[sortCol]
    if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av
    return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
  }), [data, sortCol, sortDir])

  const toggleSort = (col: keyof FlatCostRow) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortCol(col); setSortDir("desc") }
  }

  const exportCSV = () => {
    const header = "Part Number,Subsystem,Subcomponent,Labor,Non-Labor,Total\n"
    const rows = sorted.map(r => `${r.partNumber},${r.subsystem},${r.subcomponent},${r.labor},${r.nonLabor},${r.total}`).join("\n")
    const blob = new Blob([header + rows], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = "cost-data.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="border border-gray-200 rounded-xl bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">Flat Cost Data Table</h3>
          <p className="text-sm text-gray-400">Click column headers to sort</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>
      <div className="max-h-[500px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0"><tr>
            {(["partNumber", "subsystem", "subcomponent", "labor", "nonLabor", "total"] as const).map(col => (
              <th key={col} onClick={() => toggleSort(col)} className="text-left py-2 px-3 font-semibold text-gray-600 cursor-pointer hover:text-blue-600">
                {col === "partNumber" ? "Part #" : col === "nonLabor" ? "Non-Labor" : col.charAt(0).toUpperCase() + col.slice(1)}
                {sortCol === col && <span className="ml-1">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>}
              </th>
            ))}
          </tr></thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3 font-mono text-gray-600">{r.partNumber}</td>
                <td className="py-2 px-3 text-gray-700">{r.subsystem}</td>
                <td className="py-2 px-3 text-gray-800 font-medium">{r.subcomponent}</td>
                <td className="py-2 px-3 text-right">{formatCurrency(r.labor, true)}</td>
                <td className="py-2 px-3 text-right">{formatCurrency(r.nonLabor, true)}</td>
                <td className="py-2 px-3 text-right font-bold">{formatCurrency(r.total, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// =================== Filters Sidebar ===================
function FiltersSidebar({ subsystem, onSubsystemChange }: { subsystem: string; onSubsystemChange: (v: string) => void }) {
  return (
    <div className="border border-gray-200 rounded-xl bg-white p-5 sticky top-4">
      <h3 className="text-base font-bold text-gray-900 mb-4">Filters</h3>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-1.5">Subsystem</label>
          <select value={subsystem} onChange={e => onSubsystemChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white">
            <option value="all">All Subsystems</option>
            {costsData.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-1.5">Date/Version</label>
          <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white">
            <option>Current</option>
            <option>Previous</option>
            <option>Baseline</option>
          </select>
        </div>
      </div>
    </div>
  )
}

// =================== Main Export ===================
export function OpsUnitCost() {
  const [subTab, setSubTab] = useState<SubTab>("labor-nonlabor")
  const [drilldownSubsystem, setDrilldownSubsystem] = useState<SubsystemName | null>(null)
  const [filterSubsystem, setFilterSubsystem] = useState("all")

  const totalLabor = costsData.reduce((s, c) => s + c.labor, 0)
  const totalNonLabor = costsData.reduce((s, c) => s + c.nonLabor, 0)
  const focusedLabel = drilldownSubsystem
    ? `Focused on: ${drilldownSubsystem} - Labor: ${formatCurrency(costsData.find(c => c.name === drilldownSubsystem)?.labor || 0, true)} - Non-Labor: ${formatCurrency(costsData.find(c => c.name === drilldownSubsystem)?.nonLabor || 0, true)}`
    : `Focused on: All Subsystems - Labor: ${formatCurrency(totalLabor, true)} - Non-Labor: ${formatCurrency(totalNonLabor, true)}`

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Operations/Unit Cost</h2>
        <button className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">View 1 (Main)</button>
      </div>

      {drilldownSubsystem && (
        <button onClick={() => setDrilldownSubsystem(null)} className="flex items-center gap-1.5 text-sm text-gray-600 mb-3 hover:text-blue-600">
          <ArrowLeft className="w-4 h-4" /> Back to Products
        </button>
      )}

      {/* KPI row */}
      <KPIRow />
      <p className="text-sm text-gray-500 mb-5">{focusedLabel}</p>

      {/* Body: Filters sidebar + main content */}
      <div className="flex gap-6">
        {/* Left filter sidebar */}
        <div className="w-[200px] flex-shrink-0">
          <FiltersSidebar subsystem={filterSubsystem} onSubsystemChange={(v) => {
            setFilterSubsystem(v)
            if (v !== "all") { setDrilldownSubsystem(v as SubsystemName); setSubTab("drilldown") }
            else { setDrilldownSubsystem(null); setSubTab("labor-nonlabor") }
          }} />
        </div>

        {/* Main content area */}
        <div className="flex-1 min-w-0">
          {/* Tab bar - underline style */}
          <div className="border-b border-gray-200 mb-6">
            <div className="flex gap-0">
              {SUB_TABS.map(t => (
                <button key={t.id} onClick={() => { setSubTab(t.id); if (t.id !== "drilldown") setDrilldownSubsystem(null) }}
                  className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${subTab === t.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300"}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {subTab === "labor-nonlabor" && !drilldownSubsystem && (
            <LaborNonLaborOverview onSubsystemClick={(name) => { setDrilldownSubsystem(name); setSubTab("drilldown") }} />
          )}
          {(subTab === "drilldown" || (subTab === "labor-nonlabor" && drilldownSubsystem)) && drilldownSubsystem && (
            <DrilldownPanel subsystem={drilldownSubsystem} onBack={() => { setDrilldownSubsystem(null); setSubTab("labor-nonlabor") }} />
          )}
          {subTab === "sunburst" && <SunburstView />}
          {subTab === "treemap" && <TreeMapView />}
          {subTab === "cost-trend" && <CostTrendView />}
          {subTab === "indented-bom" && <IndentedBOMView />}
          {subTab === "data-table" && <DataTableView />}
        </div>
      </div>
    </div>
  )
}
