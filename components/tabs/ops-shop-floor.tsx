"use client"

import { useState, useMemo } from "react"
import { formatCurrency } from "@/lib/utils"
import {
  opActualsData, calculateWeightedOEE, qualityEventsData, capacityData,
  workflowStations, employeesData,
  type Employee,
} from "@/lib/ops-shop-floor-data"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, Legend, Cell, LabelList,
} from "recharts"
import { ArrowRight, ChevronDown, ChevronRight, ArrowUpDown, Users, TrendingUp, TrendingDown } from "lucide-react"

const BLUE = "#3B82F6"
const ORANGE = "#F97316"

// =================== Product Portfolio Data ===================
const products = [
  { id: "PN-1001", name: "Airplane PN 1001", budget: 2_900_000, actual: 2_970_000 },
  { id: "PN-1002", name: "Airplane PN 1002", budget: 3_100_000, actual: 2_980_000 },
  { id: "PN-2001", name: "Helicopter PN 2001", budget: 1_900_000, actual: 1_970_000 },
  { id: "PN-2002", name: "Helicopter PN 2002", budget: 1_900_000, actual: 1_830_000 },
  { id: "PN-3001", name: "UAV PN 3001", budget: 850_000, actual: 920_000 },
  { id: "PN-3002", name: "UAV PN 3002", budget: 920_000, actual: 880_000 },
]

function getVariance(p: typeof products[0]) {
  const v = p.actual - p.budget
  const pct = ((v / p.budget) * 100).toFixed(1)
  return { amount: v, pct: parseFloat(pct) }
}

// =================== Main KPI Tiles ===================
function ShopFloorKPIs() {
  const totalBudget = products.reduce((s, p) => s + p.budget, 0)
  const totalActual = products.reduce((s, p) => s + p.actual, 0)
  const variance = totalActual - totalBudget
  const avgOTD = 87.5
  const avgQuality = 94.2

  const tiles = [
    { label: "Total Budget", value: formatCurrency(totalBudget, true), color: "text-gray-900" },
    { label: "Total Actual", value: formatCurrency(totalActual, true), color: "text-gray-900" },
    { label: "Overall Variance", value: formatCurrency(Math.abs(variance), true), color: variance > 0 ? "text-red-600" : "text-green-700" },
    { label: "On-Time Delivery", value: `${avgOTD}%`, color: "text-gray-900" },
    { label: "Quality Rate", value: `${avgQuality}%`, color: "text-gray-900" },
  ]

  return (
    <div className="grid grid-cols-5 gap-4 mb-6">
      {tiles.map(t => (
        <div key={t.label} className="border border-gray-200 rounded-xl bg-white p-5">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{t.label}</p>
          <p className={`text-2xl font-bold mt-1 ${t.color}`}>{t.value}</p>
        </div>
      ))}
    </div>
  )
}

// =================== Product Portfolio Cards ===================
function ProductPortfolio({ onViewDetails }: { onViewDetails: () => void }) {
  return (
    <div className="mb-8">
      <h3 className="text-base font-bold text-gray-900 mb-4">Product Portfolio</h3>
      <div className="grid grid-cols-3 gap-4">
        {products.map((p, idx) => {
          const v = getVariance(p)
          const isPositive = v.amount > 0
          return (
            <div key={p.id} className={`border rounded-xl bg-white p-5 transition-colors ${idx === 0 ? "border-blue-300 shadow-sm" : "border-gray-200 hover:border-gray-300"}`}>
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-bold text-gray-900">{p.name}</h4>
                {idx === 0 && <ArrowRight className="w-4 h-4 text-gray-400" />}
              </div>
              {idx === 0 && <p className="text-xs text-blue-600 font-medium mb-3 cursor-pointer hover:underline" onClick={onViewDetails}>View Details</p>}

              <div className="flex gap-8 mb-3">
                <div>
                  <p className="text-[11px] text-gray-400 font-medium">Budget</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(p.budget, true)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 font-medium">Actual</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(p.actual, true)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[11px] text-gray-400 font-medium">Variance</p>
                <div className="flex items-center gap-1.5">
                  {isPositive ? <TrendingUp className="w-3.5 h-3.5 text-red-500" /> : <TrendingDown className="w-3.5 h-3.5 text-green-600" />}
                  <span className={`text-sm font-bold ${isPositive ? "text-red-500" : "text-green-600"}`}>
                    {isPositive ? "+" : ""}{formatCurrency(Math.abs(v.amount), true)}
                  </span>
                  <span className={`text-xs ${isPositive ? "text-red-400" : "text-green-500"}`}>({isPositive ? "+" : ""}{v.pct}%)</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// =================== Program Variance Pareto ===================
function ProgramVariancePareto() {
  const sortedByVariance = [...products].sort((a, b) => {
    const va = a.actual - a.budget
    const vb = b.actual - b.budget
    return va - vb // most negative first
  })

  const total = sortedByVariance.reduce((s, p) => s + Math.abs(p.actual - p.budget), 0)
  let cumAbs = 0
  const paretoData = sortedByVariance.map(p => {
    const variance = (p.actual - p.budget) / 1000 // in $K
    cumAbs += Math.abs(p.actual - p.budget)
    return { name: p.id.replace("PN-", "PN "), variance, cumPct: (cumAbs / total) * 100 }
  })

  return (
    <div className="border border-gray-200 rounded-xl bg-white p-6">
      <h3 className="text-base font-bold text-gray-900 mb-4">Program Variance Analysis (Pareto)</h3>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={paretoData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#374151" }} />
          <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#6b7280" }} label={{ value: "Variance ($K)", angle: -90, position: "insideLeft", fontSize: 12, fill: "#6b7280" }} />
          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v: number) => `${v}%`} label={{ value: "Cumulative %", angle: 90, position: "insideRight", fontSize: 12, fill: "#6b7280" }} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Bar yAxisId="left" dataKey="variance" name="Variance ($K)">
            {paretoData.map((entry, i) => (
              <Cell key={i} fill={entry.variance >= 0 ? BLUE : BLUE} opacity={entry.variance >= 0 ? 0.7 : 1} />
            ))}
          </Bar>
          <Line yAxisId="right" type="monotone" dataKey="cumPct" stroke="#EF4444" strokeWidth={2} dot={{ r: 4, fill: "#fff", stroke: "#EF4444", strokeWidth: 2 }} name="Cumulative %" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// =================== Detailed Operations View ===================
function DetailedOperationsView() {
  const weightedOEE = calculateWeightedOEE()
  const avgAvailability = opActualsData.reduce((s, o) => s + o.availability, 0) / opActualsData.length
  const avgPerformance = opActualsData.reduce((s, o) => s + o.performance, 0) / opActualsData.length
  const avgQuality = opActualsData.reduce((s, o) => s + o.quality, 0) / opActualsData.length
  const totalDefects = qualityEventsData.reduce((s, q) => s + q.count, 0)

  return (
    <div className="space-y-6">
      <h3 className="text-base font-bold text-gray-900">Shop Floor Operations Detail</h3>

      {/* OEE KPIs */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "Weighted OEE", value: `${(weightedOEE * 100).toFixed(1)}%`, color: weightedOEE > 0.8 ? "text-green-700" : "text-orange-600" },
          { label: "Avg Availability", value: `${(avgAvailability * 100).toFixed(1)}%`, color: "text-gray-900" },
          { label: "Avg Performance", value: `${(avgPerformance * 100).toFixed(1)}%`, color: "text-gray-900" },
          { label: "Avg Quality", value: `${(avgQuality * 100).toFixed(1)}%`, color: "text-gray-900" },
          { label: "Total Defects", value: String(totalDefects), color: "text-red-600" },
        ].map(kpi => (
          <div key={kpi.label} className="border border-gray-200 rounded-xl bg-white p-5">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{kpi.label}</p>
            <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* OEE by Op + Defect Pareto side by side */}
      <div className="grid grid-cols-2 gap-6">
        <div className="border border-gray-200 rounded-xl bg-white p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">OEE by Operation</h3>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={opActualsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="operation" tick={{ fontSize: 9, fill: "#374151" }} angle={-25} textAnchor="end" height={80} interval={0} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} domain={[0, 1]} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
              <Tooltip formatter={(value: number) => `${(value * 100).toFixed(1)}%`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="availability" fill={BLUE} name="Availability" />
              <Bar dataKey="performance" fill={ORANGE} name="Performance" />
              <Bar dataKey="quality" fill="#10B981" name="Quality" />
              <Line type="monotone" dataKey="oee" stroke="#EF4444" strokeWidth={2.5} dot={{ r: 4 }} name="OEE" />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="border border-gray-200 rounded-xl bg-white p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">Defect Pareto</h3>
          {(() => {
            const sorted = [...qualityEventsData].sort((a, b) => b.count - a.count)
            let cumulative = 0
            const total = sorted.reduce((s, q) => s + q.count, 0)
            const paretoData = sorted.map(q => {
              cumulative += q.count
              return { ...q, cumPct: cumulative / total }
            })
            return (
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={paretoData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="defectType" tick={{ fontSize: 9, fill: "#374151" }} angle={-25} textAnchor="end" height={80} interval={0} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 1]} tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar yAxisId="left" dataKey="count" name="Count">
                    {paretoData.map((_, i) => <Cell key={i} fill={i < 3 ? "#EF4444" : BLUE} />)}
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="cumPct" stroke={BLUE} strokeWidth={2} dot={{ r: 4 }} name="Cumulative %" />
                </ComposedChart>
              </ResponsiveContainer>
            )
          })()}
        </div>
      </div>

      {/* Quality events table */}
      <div className="border border-gray-200 rounded-xl bg-white p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">Quality Events Detail</h3>
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr>
            <th className="text-left py-2 px-3 font-semibold text-gray-600">ID</th>
            <th className="text-left py-2 px-3 font-semibold text-gray-600">Defect Type</th>
            <th className="text-left py-2 px-3 font-semibold text-gray-600">Station</th>
            <th className="text-right py-2 px-3 font-semibold text-gray-600">Count</th>
            <th className="text-left py-2 px-3 font-semibold text-gray-600">Severity</th>
            <th className="text-left py-2 px-3 font-semibold text-gray-600">Root Cause</th>
          </tr></thead>
          <tbody>
            {qualityEventsData.map(q => (
              <tr key={q.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3 font-mono text-gray-500">{q.id}</td>
                <td className="py-2 px-3 font-medium text-gray-800">{q.defectType}</td>
                <td className="py-2 px-3 text-gray-600">{q.station}</td>
                <td className="py-2 px-3 text-right font-bold">{q.count}</td>
                <td className="py-2 px-3">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${q.severity === "Critical" ? "bg-red-100 text-red-700" : q.severity === "Major" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>{q.severity}</span>
                </td>
                <td className="py-2 px-3 text-gray-600">{q.rootCause}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Capacity by station */}
      <div className="border border-gray-200 rounded-xl bg-white p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">Planned vs Actual Units by Station</h3>
        {(() => {
          const groups: Record<string, typeof capacityData> = {}
          capacityData.forEach(c => { if (!groups[c.station]) groups[c.station] = []; groups[c.station].push(c) })
          const stationSummary = Object.entries(groups).map(([station, slots]) => ({
            station,
            planned: slots.reduce((s, c) => s + c.plannedUnits, 0),
            actual: slots.reduce((s, c) => s + c.actualUnits, 0),
          }))
          return (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stationSummary}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="station" tick={{ fontSize: 9, fill: "#374151" }} angle={-25} textAnchor="end" height={70} interval={0} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="planned" fill="#93c5fd" name="Planned" radius={[3, 3, 0, 0]} />
                <Bar dataKey="actual" fill={BLUE} name="Actual" radius={[3, 3, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </BarChart>
            </ResponsiveContainer>
          )
        })()}
      </div>

      {/* Workflow stations */}
      <div className="border border-gray-200 rounded-xl bg-white p-6">
        <h3 className="text-base font-bold text-gray-900 mb-1">Workflow Stations</h3>
        <p className="text-sm text-gray-400 mb-4">Click a station to view employee scorecards</p>
        <WorkflowStationsGrid />
      </div>
    </div>
  )
}

// =================== Workflow Stations Grid ===================
function WorkflowStationsGrid() {
  const [selectedStation, setSelectedStation] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<"seniority" | "skillLevel" | "title">("seniority")
  const [shift1Open, setShift1Open] = useState(true)
  const [shift2Open, setShift2Open] = useState(true)

  const stationEmployees = useMemo(() => {
    if (!selectedStation) return []
    return employeesData.filter(e => e.station === selectedStation)
  }, [selectedStation])

  const shift1 = stationEmployees.filter(e => e.shift === 1)
  const shift2 = stationEmployees.filter(e => e.shift === 2)

  const sortFn = (a: Employee, b: Employee) => {
    if (sortBy === "seniority") return b.seniority - a.seniority
    if (sortBy === "skillLevel") return b.skillLevel - a.skillLevel
    return a.title.localeCompare(b.title)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {workflowStations.map(ws => (
          <button key={ws.id} onClick={() => setSelectedStation(ws.name)}
            className={`p-4 rounded-xl border text-left transition-all ${selectedStation === ws.name ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-bold text-gray-800">{ws.name}</span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${ws.status === "active" ? "bg-green-100 text-green-700" : ws.status === "maintenance" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>{ws.status}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Users className="w-3.5 h-3.5" /> {ws.employees} employees
              <span className="text-gray-300">|</span>
              <span className="capitalize">{ws.type}</span>
            </div>
          </button>
        ))}
      </div>

      {selectedStation && (
        <div className="border border-gray-200 rounded-xl bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-bold text-gray-900">{selectedStation} - Employee Scorecards</h4>
              <p className="text-sm text-gray-400">{stationEmployees.length} employees across 2 shifts</p>
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-400 mr-1">Sort:</span>
              {(["seniority", "skillLevel", "title"] as const).map(s => (
                <button key={s} onClick={() => setSortBy(s)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${sortBy === s ? "bg-blue-100 text-blue-700" : "text-gray-400 hover:text-gray-600"}`}>
                  {s === "skillLevel" ? "Skill" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setShift1Open(!shift1Open)} className="flex items-center gap-1.5 text-sm font-bold text-gray-700 mb-3">
            {shift1Open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            Shift 1 ({shift1.length} employees)
          </button>
          {shift1Open && (
            <div className="grid grid-cols-4 gap-3 mb-4">
              {shift1.sort(sortFn).map(emp => <EmployeeCard key={emp.id} employee={emp} />)}
            </div>
          )}
          <button onClick={() => setShift2Open(!shift2Open)} className="flex items-center gap-1.5 text-sm font-bold text-gray-700 mb-3">
            {shift2Open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            Shift 2 ({shift2.length} employees)
          </button>
          {shift2Open && (
            <div className="grid grid-cols-4 gap-3">
              {shift2.sort(sortFn).map(emp => <EmployeeCard key={emp.id} employee={emp} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EmployeeCard({ employee }: { employee: Employee }) {
  const skillColor = employee.skillLevel >= 4 ? "text-green-600" : employee.skillLevel >= 3 ? "text-blue-600" : "text-orange-600"
  return (
    <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-bold text-gray-800 truncate">{employee.name}</span>
        <span className={`text-xs font-bold ${skillColor}`}>L{employee.skillLevel}</span>
      </div>
      <p className="text-xs text-gray-500 mb-2">{employee.title}</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <span className="text-gray-400">Seniority</span><span className="text-right font-semibold text-gray-600">{employee.seniority}yr</span>
        <span className="text-gray-400">Units/hr</span><span className="text-right font-semibold text-gray-600">{employee.unitsPerHour}</span>
        <span className="text-gray-400">Quality</span><span className="text-right font-semibold text-gray-600">{employee.qualityScore}%</span>
        <span className="text-gray-400">Attendance</span><span className="text-right font-semibold text-gray-600">{employee.attendance}%</span>
      </div>
      {employee.certifications.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {employee.certifications.slice(0, 3).map(c => (
            <span key={c} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-semibold rounded">{c}</span>
          ))}
          {employee.certifications.length > 3 && (
            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-semibold rounded">+{employee.certifications.length - 3}</span>
          )}
        </div>
      )}
    </div>
  )
}

// =================== Main Export ===================
export function OpsShopFloor() {
  const [showOps, setShowOps] = useState(false)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Operations/Unit Cost</h2>
        <button className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">View 1 (Main)</button>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">Shop Floor Dashboard</h3>
        <p className="text-sm text-gray-400">Real-time overview of production performance and issues</p>
      </div>

      {!showOps ? (
        <>
          <button onClick={() => setShowOps(true)} className="flex items-center gap-2 bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-semibold mb-6 hover:bg-green-700 transition-colors">
            View Shop Floor Operations <ArrowRight className="w-4 h-4" />
          </button>

          <h3 className="text-base font-bold text-gray-900 mb-3">Key Performance Indicators</h3>
          <ShopFloorKPIs />
          <ProductPortfolio onViewDetails={() => setShowOps(true)} />
          <ProgramVariancePareto />
        </>
      ) : (
        <>
          <button onClick={() => setShowOps(false)} className="text-sm text-blue-600 font-medium hover:underline mb-4 block">
            &larr; Back to Dashboard
          </button>
          <DetailedOperationsView />
        </>
      )}
    </div>
  )
}
