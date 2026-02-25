"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  opActualsData, calculateWeightedOEE, qualityEventsData, capacityData,
  workflowStations, employeesData,
  type Employee,
} from "@/lib/ops-shop-floor-data"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, Legend, Cell,
} from "recharts"
import { Activity, AlertTriangle, Users, Wrench, ChevronDown, ChevronRight, ArrowUpDown } from "lucide-react"

type ShopFloorSubTab = "oee-quality" | "capacity" | "labor-mix"

const SUB_TABS: { id: ShopFloorSubTab; label: string }[] = [
  { id: "oee-quality", label: "OEE & Quality" },
  { id: "capacity", label: "Capacity & Utilization" },
  { id: "labor-mix", label: "Labor Mix" },
]

// --- OEE & Quality Panel ---
function OEEQualityPanel() {
  const weightedOEE = calculateWeightedOEE()
  const avgAvailability = opActualsData.reduce((s, o) => s + o.availability, 0) / opActualsData.length
  const avgPerformance = opActualsData.reduce((s, o) => s + o.performance, 0) / opActualsData.length
  const avgQuality = opActualsData.reduce((s, o) => s + o.quality, 0) / opActualsData.length
  const totalDefects = qualityEventsData.reduce((s, q) => s + q.count, 0)

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Weighted OEE", value: `${(weightedOEE * 100).toFixed(1)}%`, color: weightedOEE > 0.8 ? "text-emerald-600" : "text-amber-600" },
          { label: "Avg Availability", value: `${(avgAvailability * 100).toFixed(1)}%`, color: "text-blue-600" },
          { label: "Avg Performance", value: `${(avgPerformance * 100).toFixed(1)}%`, color: "text-blue-600" },
          { label: "Avg Quality", value: `${(avgQuality * 100).toFixed(1)}%`, color: "text-blue-600" },
          { label: "Total Defects", value: String(totalDefects), color: "text-red-600" },
        ].map(kpi => (
          <Card key={kpi.label} className="bg-white border-slate-200">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] font-semibold text-slate-500 uppercase">{kpi.label}</p>
              <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* OEE by Operation */}
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              OEE by Operation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={opActualsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="operation" tick={{ fontSize: 7, fill: "#64748b" }} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 9, fill: "#64748b" }} domain={[0, 1]} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
                <Tooltip formatter={(value: number) => `${(value * 100).toFixed(1)}%`} contentStyle={{ fontSize: 10 }} />
                <Bar dataKey="availability" fill="#3b82f6" name="Availability" />
                <Bar dataKey="performance" fill="#f97316" name="Performance" />
                <Bar dataKey="quality" fill="#10b981" name="Quality" />
                <Line type="monotone" dataKey="oee" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} name="OEE" />
                <Legend wrapperStyle={{ fontSize: 9 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quality Defect Pareto */}
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              Defect Pareto
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const sorted = [...qualityEventsData].sort((a, b) => b.count - a.count)
              let cumulative = 0
              const total = sorted.reduce((s, q) => s + q.count, 0)
              const paretoData = sorted.map(q => {
                cumulative += q.count
                return { ...q, cumPct: cumulative / total }
              })
              return (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={paretoData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="defectType" tick={{ fontSize: 7, fill: "#64748b" }} angle={-20} textAnchor="end" height={60} />
                    <YAxis yAxisId="left" tick={{ fontSize: 9, fill: "#64748b" }} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 1]} tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
                    <Tooltip contentStyle={{ fontSize: 10 }} />
                    <Bar yAxisId="left" dataKey="count" name="Count">
                      {paretoData.map((_, i) => (
                        <Cell key={i} fill={i < 3 ? "#ef4444" : "#f97316"} />
                      ))}
                    </Bar>
                    <Line yAxisId="right" type="monotone" dataKey="cumPct" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} name="Cumulative %" />
                  </ComposedChart>
                </ResponsiveContainer>
              )
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Quality events table */}
      <Card className="bg-white border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-slate-700">Quality Events Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-[10px]">
            <thead className="bg-slate-50"><tr>
              <th className="text-left py-1.5 px-2 font-bold text-slate-600">ID</th>
              <th className="text-left py-1.5 px-2 font-bold text-slate-600">Defect Type</th>
              <th className="text-left py-1.5 px-2 font-bold text-slate-600">Station</th>
              <th className="text-right py-1.5 px-2 font-bold text-slate-600">Count</th>
              <th className="text-left py-1.5 px-2 font-bold text-slate-600">Severity</th>
              <th className="text-left py-1.5 px-2 font-bold text-slate-600">Root Cause</th>
            </tr></thead>
            <tbody>
              {qualityEventsData.map(q => (
                <tr key={q.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-1 px-2 font-mono text-slate-500">{q.id}</td>
                  <td className="py-1 px-2 font-medium text-slate-800">{q.defectType}</td>
                  <td className="py-1 px-2 text-slate-600">{q.station}</td>
                  <td className="py-1 px-2 text-right font-bold">{q.count}</td>
                  <td className="py-1 px-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${q.severity === "Critical" ? "bg-red-100 text-red-700" : q.severity === "Major" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{q.severity}</span>
                  </td>
                  <td className="py-1 px-2 text-slate-600">{q.rootCause}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

// --- Capacity & Utilization Panel ---
function CapacityPanel() {
  const stationGroups = useMemo(() => {
    const groups: Record<string, typeof capacityData> = {}
    capacityData.forEach(c => {
      if (!groups[c.station]) groups[c.station] = []
      groups[c.station].push(c)
    })
    return groups
  }, [])

  const stationSummary = Object.entries(stationGroups).map(([station, slots]) => ({
    station,
    planned: slots.reduce((s, c) => s + c.plannedUnits, 0),
    actual: slots.reduce((s, c) => s + c.actualUnits, 0),
    avgUtil: +(slots.reduce((s, c) => s + c.utilization, 0) / slots.length).toFixed(2),
    avgAdherence: +(slots.reduce((s, c) => s + c.adherence, 0) / slots.length).toFixed(2),
  }))

  const overallUtil = stationSummary.reduce((s, st) => s + st.avgUtil, 0) / stationSummary.length
  const overallAdherence = stationSummary.reduce((s, st) => s + st.avgAdherence, 0) / stationSummary.length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-white border-slate-200"><CardContent className="p-3 text-center">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Avg Utilization</p>
          <p className={`text-xl font-bold ${overallUtil > 0.8 ? "text-emerald-600" : "text-amber-600"}`}>{(overallUtil * 100).toFixed(1)}%</p>
        </CardContent></Card>
        <Card className="bg-white border-slate-200"><CardContent className="p-3 text-center">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Schedule Adherence</p>
          <p className={`text-xl font-bold ${overallAdherence > 0.9 ? "text-emerald-600" : "text-amber-600"}`}>{(overallAdherence * 100).toFixed(1)}%</p>
        </CardContent></Card>
        <Card className="bg-white border-slate-200"><CardContent className="p-3 text-center">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Active Stations</p>
          <p className="text-xl font-bold text-blue-600">{stationSummary.length}</p>
        </CardContent></Card>
      </div>

      <Card className="bg-white border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-slate-700">Planned vs Actual Units by Station</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stationSummary}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="station" tick={{ fontSize: 7, fill: "#64748b" }} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 9, fill: "#64748b" }} />
              <Tooltip contentStyle={{ fontSize: 10 }} />
              <Bar dataKey="planned" fill="#93c5fd" name="Planned" />
              <Bar dataKey="actual" fill="#2563eb" name="Actual" />
              <Legend wrapperStyle={{ fontSize: 9 }} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

// --- Labor Mix Panel ---
function LaborMixPanel() {
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
      {/* Workflow stations block diagram */}
      <Card className="bg-white border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-blue-600" />
            Workflow Stations
          </CardTitle>
          <p className="text-[9px] text-slate-400">Click a station to view employee scorecards</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {workflowStations.map(ws => (
              <button key={ws.id} onClick={() => setSelectedStation(ws.name)}
                className={`p-3 rounded-lg border text-left transition-all ${selectedStation === ws.name ? "border-blue-600 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-800">{ws.name}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${ws.status === "active" ? "bg-emerald-100 text-emerald-700" : ws.status === "maintenance" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{ws.status}</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-slate-500">
                  <Users className="w-3 h-3" /> {ws.employees} employees
                  <span className="text-slate-300">|</span>
                  <span className="capitalize">{ws.type}</span>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Employee scorecards */}
      {selectedStation && (
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold text-slate-700">{selectedStation} - Employee Scorecards</CardTitle>
              <p className="text-[9px] text-slate-400">{stationEmployees.length} employees across 2 shifts</p>
            </div>
            <div className="flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-slate-400" />
              <span className="text-[9px] text-slate-400 mr-1">Sort:</span>
              {(["seniority", "skillLevel", "title"] as const).map(s => (
                <button key={s} onClick={() => setSortBy(s)}
                  className={`px-2 py-0.5 text-[9px] font-semibold rounded ${sortBy === s ? "bg-blue-100 text-blue-700" : "text-slate-400 hover:text-slate-600"}`}>
                  {s === "skillLevel" ? "Skill" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {/* Shift 1 */}
            <button onClick={() => setShift1Open(!shift1Open)} className="flex items-center gap-1 text-[10px] font-bold text-slate-700 mb-2">
              {shift1Open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              Shift 1 ({shift1.length} employees)
            </button>
            {shift1Open && (
              <div className="grid grid-cols-4 gap-2 mb-4">
                {shift1.sort(sortFn).map(emp => <EmployeeCard key={emp.id} employee={emp} />)}
              </div>
            )}
            {/* Shift 2 */}
            <button onClick={() => setShift2Open(!shift2Open)} className="flex items-center gap-1 text-[10px] font-bold text-slate-700 mb-2">
              {shift2Open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              Shift 2 ({shift2.length} employees)
            </button>
            {shift2Open && (
              <div className="grid grid-cols-4 gap-2">
                {shift2.sort(sortFn).map(emp => <EmployeeCard key={emp.id} employee={emp} />)}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function EmployeeCard({ employee }: { employee: Employee }) {
  const skillColor = employee.skillLevel >= 4 ? "text-emerald-600" : employee.skillLevel >= 3 ? "text-blue-600" : "text-amber-600"
  return (
    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold text-slate-800 truncate">{employee.name}</span>
        <span className={`text-[9px] font-bold ${skillColor}`}>L{employee.skillLevel}</span>
      </div>
      <p className="text-[9px] text-slate-500 mb-1.5">{employee.title}</p>
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[8px]">
        <span className="text-slate-400">Seniority</span><span className="text-right font-semibold text-slate-600">{employee.seniority}yr</span>
        <span className="text-slate-400">Units/hr</span><span className="text-right font-semibold text-slate-600">{employee.unitsPerHour}</span>
        <span className="text-slate-400">Quality</span><span className="text-right font-semibold text-slate-600">{employee.qualityScore}%</span>
        <span className="text-slate-400">Attendance</span><span className="text-right font-semibold text-slate-600">{employee.attendance}%</span>
      </div>
      {employee.certifications.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-0.5">
          {employee.certifications.slice(0, 3).map(c => (
            <span key={c} className="px-1 py-0.5 bg-blue-50 text-blue-600 text-[7px] font-semibold rounded">{c}</span>
          ))}
          {employee.certifications.length > 3 && (
            <span className="px-1 py-0.5 bg-slate-100 text-slate-500 text-[7px] font-semibold rounded">+{employee.certifications.length - 3}</span>
          )}
        </div>
      )}
    </div>
  )
}

// --- Main export ---
export function OpsShopFloor() {
  const [subTab, setSubTab] = useState<ShopFloorSubTab>("oee-quality")

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Shop Floor Operations</h2>
          <p className="text-[10px] text-slate-400">OEE, quality, capacity utilization, and labor mix analysis</p>
        </div>
        <div className="flex gap-0.5 bg-slate-100 rounded-md p-0.5">
          {SUB_TABS.map(t => (
            <button key={t.id} onClick={() => setSubTab(t.id)}
              className={`px-2.5 py-1 text-[9px] font-bold rounded ${subTab === t.id ? "bg-white shadow-sm text-slate-800" : "text-slate-400 hover:text-slate-600"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {subTab === "oee-quality" && <OEEQualityPanel />}
      {subTab === "capacity" && <CapacityPanel />}
      {subTab === "labor-mix" && <LaborMixPanel />}
    </div>
  )
}
