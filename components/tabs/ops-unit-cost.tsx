"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import {
  costsData, subcomponentMap, buildCostData, generateBOM, getFlatCostTable,
  getSubsystemDrilldown, getCostDriverBreakdown,
  type SubsystemName, type BOMRow, type FlatCostRow,
} from "@/lib/ops-unit-cost-data"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, Treemap, Cell, Legend,
} from "recharts"
import { ChevronRight, ChevronDown, Download, ArrowLeft, DollarSign, TrendingDown, Layers, Factory } from "lucide-react"

// --- Sub-tab types ---
type SubTab = "labor-nonlabor" | "sunburst" | "treemap" | "cost-trend" | "indented-bom" | "data-table"

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "labor-nonlabor", label: "Labor vs Non-Labor" },
  { id: "sunburst", label: "Sunburst" },
  { id: "treemap", label: "TreeMap" },
  { id: "cost-trend", label: "Cost Trend" },
  { id: "indented-bom", label: "Indented BOM" },
  { id: "data-table", label: "Data Table" },
]

const COLORS = ["#1e3a5f", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"]
const LABOR_COLOR = "#2563eb"
const NON_LABOR_COLOR = "#f97316"

// --- KPI Tiles ---
function KPITiles() {
  const totalCost = costsData.reduce((s, c) => s + c.total, 0)
  const totalLabor = costsData.reduce((s, c) => s + c.labor, 0)
  const totalNonLabor = costsData.reduce((s, c) => s + c.nonLabor, 0)
  const laborPct = totalCost > 0 ? (totalLabor / totalCost * 100).toFixed(1) : "0"
  return (
    <div className="grid grid-cols-4 gap-3 mb-4">
      <Card className="bg-white border-slate-200">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-blue-600" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Total Unit Cost</span>
          </div>
          <p className="text-lg font-bold text-slate-900">{formatCurrency(totalCost, true)}</p>
        </CardContent>
      </Card>
      <Card className="bg-white border-slate-200">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <Factory className="w-4 h-4 text-blue-600" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Labor Cost</span>
          </div>
          <p className="text-lg font-bold text-slate-900">{formatCurrency(totalLabor, true)}</p>
        </CardContent>
      </Card>
      <Card className="bg-white border-slate-200">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-orange-500" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Non-Labor Cost</span>
          </div>
          <p className="text-lg font-bold text-slate-900">{formatCurrency(totalNonLabor, true)}</p>
        </CardContent>
      </Card>
      <Card className="bg-white border-slate-200">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-emerald-600" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Labor %</span>
          </div>
          <p className="text-lg font-bold text-slate-900">{laborPct}%</p>
        </CardContent>
      </Card>
    </div>
  )
}

// --- Stacked Bar Chart (Labor vs Non-Labor) ---
function LaborNonLaborView({ onSubsystemClick }: { onSubsystemClick: (name: SubsystemName) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card className="bg-white border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-slate-700">Labor vs Non-Labor by Subsystem</CardTitle>
          <p className="text-[9px] text-slate-400">Click a bar to drill down into subsystem detail</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={costsData} onClick={(e: any) => { if (e?.activeLabel) onSubsystemClick(e.activeLabel as SubsystemName) }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={(v: number) => `$${(v / 1e6).toFixed(0)}M`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} labelStyle={{ fontSize: 11, fontWeight: 700 }} contentStyle={{ fontSize: 10 }} />
              <Bar dataKey="labor" stackId="a" fill={LABOR_COLOR} name="Labor" />
              <Bar dataKey="nonLabor" stackId="a" fill={NON_LABOR_COLOR} name="Non-Labor" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="bg-white border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-slate-700">Cost Waterfall by Subsystem</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={costsData.map(c => ({ name: c.name, labor: c.labor, nonLabor: c.nonLabor }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={(v: number) => `$${(v / 1e6).toFixed(0)}M`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ fontSize: 10 }} />
              <Bar dataKey="labor" fill={LABOR_COLOR} name="Labor" />
              <Bar dataKey="nonLabor" fill={NON_LABOR_COLOR} name="Non-Labor" />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

// --- Drilldown view ---
function DrilldownPanel({ subsystem, onBack }: { subsystem: SubsystemName; onBack: () => void }) {
  const { laborOps, nonLaborItems } = useMemo(() => getSubsystemDrilldown(subsystem), [subsystem])
  const waterfall = useMemo(() => getCostDriverBreakdown(subsystem), [subsystem])
  const [drillTab, setDrillTab] = useState<"overview" | "waterfall">("overview")

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-blue-600 font-semibold mb-3 hover:underline">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Overview
      </button>
      <h3 className="text-sm font-bold text-slate-800 mb-2">{subsystem} - Detailed Drilldown</h3>
      <div className="flex gap-1 mb-3">
        <button onClick={() => setDrillTab("overview")} className={`px-3 py-1 text-[10px] font-bold rounded ${drillTab === "overview" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>Overview</button>
        <button onClick={() => setDrillTab("waterfall")} className={`px-3 py-1 text-[10px] font-bold rounded ${drillTab === "waterfall" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>Cost Waterfall</button>
      </div>
      {drillTab === "overview" ? (
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-blue-700">Labor Operations (Pareto)</CardTitle></CardHeader>
            <CardContent>
              {laborOps.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={laborOps.sort((a, b) => b.cost - a.cost)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`} />
                    <YAxis type="category" dataKey="operation" tick={{ fontSize: 8, fill: "#64748b" }} width={100} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ fontSize: 10 }} />
                    <Bar dataKey="cost" fill={LABOR_COLOR} radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-xs text-slate-400 py-8 text-center">No labor operation data for this subsystem</p>}
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-orange-600">Non-Labor Items</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-h-[260px] overflow-y-auto">
                {nonLaborItems.length > 0 ? nonLaborItems.sort((a, b) => b.cost - a.cost).map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px] py-1 px-2 bg-slate-50 rounded">
                    <div>
                      <span className="font-semibold text-slate-700">{item.description}</span>
                      <span className="text-slate-400 ml-1.5">({item.category})</span>
                      {item.vendor && <span className="text-slate-400 ml-1"> - {item.vendor}</span>}
                    </div>
                    <span className="font-bold text-slate-800">{formatCurrency(item.cost, true)}</span>
                  </div>
                )) : <p className="text-xs text-slate-400 py-8 text-center">No non-labor data for this subsystem</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-slate-700">Cost Drivers: Actual vs Target</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={waterfall}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="driver" tick={{ fontSize: 8, fill: "#64748b" }} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={(v: number) => `$${(v / 1e6).toFixed(1)}M`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ fontSize: 10 }} />
                <Bar dataKey="actual" fill="#2563eb" name="Actual" />
                <Bar dataKey="target" fill="#94a3b8" name="Target" />
                <Line type="monotone" dataKey="delta" stroke="#ef4444" name="Delta" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// --- Sunburst (simplified as nested donut using Treemap) ---
function SunburstView() {
  const data = costsData.map(c => ({
    name: c.name,
    value: c.total,
    children: (subcomponentMap[c.name] || []).map(sc => ({ name: sc.name, value: sc.total })),
  }))
  const flat = data.flatMap(d => d.children.map(ch => ({ ...ch, subsystem: d.name })))
  return (
    <Card className="bg-white border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-bold text-slate-700">Cost Distribution (Sunburst / TreeMap)</CardTitle>
        <p className="text-[9px] text-slate-400">Subsystem and subcomponent cost breakdown</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <Treemap data={flat} dataKey="value" nameKey="name" stroke="#fff" strokeWidth={2}>
            {flat.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
            <Tooltip formatter={(value: number) => formatCurrency(value as number)} contentStyle={{ fontSize: 10 }} />
          </Treemap>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// --- TreeMap ---
function TreeMapView() {
  const flat = costsData.flatMap(c =>
    (subcomponentMap[c.name] || []).map(sc => ({ name: `${c.name} > ${sc.name}`, value: sc.total, subsystem: c.name }))
  )
  return (
    <Card className="bg-white border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-bold text-slate-700">TreeMap - Cost by Subcomponent</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={360}>
          <Treemap data={flat} dataKey="value" nameKey="name" stroke="#fff" strokeWidth={2}>
            {flat.map((entry, i) => {
              const idx = costsData.findIndex(c => c.name === entry.subsystem)
              return <Cell key={i} fill={COLORS[idx >= 0 ? idx : i % COLORS.length]} />
            })}
            <Tooltip formatter={(value: number) => formatCurrency(value as number)} contentStyle={{ fontSize: 10 }} />
          </Treemap>
        </ResponsiveContainer>
        {/* Data table below */}
        <div className="mt-4 max-h-[200px] overflow-y-auto">
          <table className="w-full text-[10px]">
            <thead className="bg-slate-50 sticky top-0"><tr>
              <th className="text-left py-1 px-2 font-bold text-slate-600">Subsystem</th>
              <th className="text-left py-1 px-2 font-bold text-slate-600">Subcomponent</th>
              <th className="text-right py-1 px-2 font-bold text-slate-600">Labor</th>
              <th className="text-right py-1 px-2 font-bold text-slate-600">Non-Labor</th>
              <th className="text-right py-1 px-2 font-bold text-slate-600">Total</th>
            </tr></thead>
            <tbody>
              {Object.entries(subcomponentMap).flatMap(([sub, scs]) =>
                scs.map((sc, i) => (
                  <tr key={`${sub}-${i}`} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-1 px-2 text-slate-600">{sub}</td>
                    <td className="py-1 px-2 font-medium text-slate-800">{sc.name}</td>
                    <td className="py-1 px-2 text-right">{formatCurrency(sc.labor, true)}</td>
                    <td className="py-1 px-2 text-right">{formatCurrency(sc.nonLabor, true)}</td>
                    <td className="py-1 px-2 text-right font-bold">{formatCurrency(sc.total, true)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// --- Cost Trend ---
function CostTrendView() {
  const last10 = buildCostData.slice(-10)
  return (
    <div className="space-y-4">
      <Card className="bg-white border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-slate-700">Cost Trend by Build (100 builds)</CardTitle>
          <p className="text-[9px] text-slate-400">Actual vs expected with learning curve</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={buildCostData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="build" tick={{ fontSize: 8, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={(v: number) => `$${(v / 1e6).toFixed(1)}M`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={1.5} dot={false} name="Actual" />
              <Line type="monotone" dataKey="expected" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 3" dot={false} name="Expected" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="bg-white border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-slate-700">Variance Breakdown (Last 10 Builds)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={last10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="build" tick={{ fontSize: 9, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ fontSize: 10 }} />
              <Bar dataKey="laborVariance" fill="#2563eb" name="Labor Var" />
              <Bar dataKey="mixVariance" fill="#8b5cf6" name="Mix Var" />
              <Bar dataKey="priceVariance" fill="#f97316" name="Price Var" />
              <Bar dataKey="routingVariance" fill="#14b8a6" name="Routing Var" />
              <Line type="monotone" dataKey="totalVariance" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Total Var" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

// --- Indented BOM ---
function BOMRowComponent({ row, depth = 0 }: { row: BOMRow; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 1)
  const hasChildren = row.children && row.children.length > 0
  return (
    <>
      <tr className="border-b border-slate-100 hover:bg-slate-50">
        <td className="py-1.5 px-2" style={{ paddingLeft: `${depth * 20 + 8}px` }}>
          {hasChildren ? (
            <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-[10px] font-medium text-slate-800">
              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {row.partNumber}
            </button>
          ) : (
            <span className="text-[10px] text-slate-600 ml-4">{row.partNumber}</span>
          )}
        </td>
        <td className="py-1.5 px-2 text-[10px] text-slate-700">{row.description}</td>
        <td className="py-1.5 px-2 text-[10px] text-right text-slate-600">{row.qty}</td>
        <td className="py-1.5 px-2 text-[10px] text-right text-slate-600">{formatCurrency(row.unitCost, true)}</td>
        <td className="py-1.5 px-2 text-[10px] text-right font-bold text-slate-800">{formatCurrency(row.extCost, true)}</td>
      </tr>
      {expanded && hasChildren && row.children!.map((child, i) => (
        <BOMRowComponent key={i} row={child} depth={depth + 1} />
      ))}
    </>
  )
}

function IndentedBOMView() {
  const bom = useMemo(() => generateBOM(), [])
  return (
    <Card className="bg-white border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-bold text-slate-700">Indented Bill of Materials</CardTitle>
        <p className="text-[9px] text-slate-400">Expandable tree view of product structure</p>
      </CardHeader>
      <CardContent>
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full text-[10px]">
            <thead className="bg-slate-50 sticky top-0"><tr>
              <th className="text-left py-1.5 px-2 font-bold text-slate-600">Part Number</th>
              <th className="text-left py-1.5 px-2 font-bold text-slate-600">Description</th>
              <th className="text-right py-1.5 px-2 font-bold text-slate-600">Qty</th>
              <th className="text-right py-1.5 px-2 font-bold text-slate-600">Unit Cost</th>
              <th className="text-right py-1.5 px-2 font-bold text-slate-600">Ext. Cost</th>
            </tr></thead>
            <tbody>
              {bom.map((row, i) => <BOMRowComponent key={i} row={row} />)}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// --- Data Table ---
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
    <Card className="bg-white border-slate-200">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xs font-bold text-slate-700">Flat Cost Data Table</CardTitle>
          <p className="text-[9px] text-slate-400">Click column headers to sort. Export to CSV.</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:underline">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </CardHeader>
      <CardContent>
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full text-[10px]">
            <thead className="bg-slate-50 sticky top-0"><tr>
              {(["partNumber", "subsystem", "subcomponent", "labor", "nonLabor", "total"] as const).map(col => (
                <th key={col} onClick={() => toggleSort(col)} className="text-left py-1.5 px-2 font-bold text-slate-600 cursor-pointer hover:text-blue-600">
                  {col === "partNumber" ? "Part #" : col === "nonLabor" ? "Non-Labor" : col.charAt(0).toUpperCase() + col.slice(1)}
                  {sortCol === col && <span className="ml-0.5">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>}
                </th>
              ))}
            </tr></thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-1 px-2 font-mono text-slate-600">{r.partNumber}</td>
                  <td className="py-1 px-2 text-slate-700">{r.subsystem}</td>
                  <td className="py-1 px-2 text-slate-800 font-medium">{r.subcomponent}</td>
                  <td className="py-1 px-2 text-right">{formatCurrency(r.labor, true)}</td>
                  <td className="py-1 px-2 text-right">{formatCurrency(r.nonLabor, true)}</td>
                  <td className="py-1 px-2 text-right font-bold">{formatCurrency(r.total, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// --- Main export ---
export function OpsUnitCost() {
  const [subTab, setSubTab] = useState<SubTab>("labor-nonlabor")
  const [drilldownSubsystem, setDrilldownSubsystem] = useState<SubsystemName | null>(null)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Product Unit Cost Dashboard</h2>
          <p className="text-[10px] text-slate-400">Airplane PN 1001 - Full cost breakdown and analysis</p>
        </div>
        <div className="flex gap-0.5 bg-slate-100 rounded-md p-0.5">
          {SUB_TABS.map(t => (
            <button key={t.id} onClick={() => { setSubTab(t.id); setDrilldownSubsystem(null) }}
              className={`px-2.5 py-1 text-[9px] font-bold rounded ${subTab === t.id ? "bg-white shadow-sm text-slate-800" : "text-slate-400 hover:text-slate-600"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <KPITiles />

      {subTab === "labor-nonlabor" && !drilldownSubsystem && (
        <LaborNonLaborView onSubsystemClick={setDrilldownSubsystem} />
      )}
      {subTab === "labor-nonlabor" && drilldownSubsystem && (
        <DrilldownPanel subsystem={drilldownSubsystem} onBack={() => setDrilldownSubsystem(null)} />
      )}
      {subTab === "sunburst" && <SunburstView />}
      {subTab === "treemap" && <TreeMapView />}
      {subTab === "cost-trend" && <CostTrendView />}
      {subTab === "indented-bom" && <IndentedBOMView />}
      {subTab === "data-table" && <DataTableView />}
    </div>
  )
}
