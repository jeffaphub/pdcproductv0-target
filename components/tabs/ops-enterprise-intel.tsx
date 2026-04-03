"use client"

import { useState, useMemo } from "react"
import { formatCurrency } from "@/lib/utils"
import {
  getCapabilityMaturityData, plants, getCapacityTrendData, getCapacityKPIs,
  bidPipelineData, marketIntelData, calculateScenarioCapacity, detectConflicts,
  type PlantId, type ScenarioInput,
} from "@/lib/ops-enterprise-intel-data"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, Legend, Area, Cell,
} from "recharts"
import { Building2, Cpu, Target, Globe, AlertTriangle, Zap } from "lucide-react"

const BLUE = "#3B82F6"
const ORANGE = "#F97316"

type IntelSubTab = "digital-twin" | "scenario-forecast" | "bid-pipeline" | "market-intel"

const SUB_TABS: { id: IntelSubTab; label: string }[] = [
  { id: "digital-twin", label: "Digital Twin" },
  { id: "scenario-forecast", label: "Scenario Forecast" },
  { id: "bid-pipeline", label: "Bid Pipeline" },
  { id: "market-intel", label: "Market Intelligence" },
]

const MATURITY_COLORS: Record<number, string> = {
  1: "#fecaca", 2: "#fed7aa", 3: "#fef08a", 4: "#bbf7d0", 5: "#86efac",
}
const MATURITY_TEXT: Record<number, string> = {
  1: "text-red-800", 2: "text-orange-800", 3: "text-yellow-800", 4: "text-green-800", 5: "text-green-900",
}

// =================== Digital Twin ===================
function DigitalTwinPanel() {
  const maturityData = useMemo(() => getCapabilityMaturityData(), [])
  const [selectedPlant, setSelectedPlant] = useState<PlantId>("PLT-A")
  const trendData = useMemo(() => getCapacityTrendData(selectedPlant), [selectedPlant])
  const kpis = useMemo(() => getCapacityKPIs(selectedPlant), [selectedPlant])

  const capabilities = [...new Set(maturityData.map(c => c.capability))]
  const plantIds = plants.map(p => p.id)

  return (
    <div className="space-y-6">
      {/* Capability Maturity Heatmap */}
      <div className="border border-gray-200 rounded-xl bg-white p-6">
        <div className="flex items-center gap-2 mb-1">
          <Cpu className="w-4 h-4 text-blue-600" />
          <h3 className="text-base font-bold text-gray-900">Capability Maturity Heatmap</h3>
        </div>
        <p className="text-sm text-gray-400 mb-4">Scale: 1 (Development) to 5 (World-class). Click plant to see capacity trends below.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr>
              <th className="text-left py-2 px-3 font-semibold text-gray-600 border-b border-gray-200">Plant</th>
              {capabilities.map(cap => (
                <th key={cap} className="text-center py-2 px-3 font-semibold text-gray-600 border-b border-gray-200 whitespace-nowrap">{cap}</th>
              ))}
            </tr></thead>
            <tbody>
              {plantIds.map(pid => {
                const plant = plants.find(p => p.id === pid)!
                return (
                  <tr key={pid} className={`border-b border-gray-100 cursor-pointer ${selectedPlant === pid ? "bg-blue-50" : "hover:bg-gray-50"}`}
                    onClick={() => setSelectedPlant(pid)}>
                    <td className="py-2.5 px-3 font-semibold text-gray-800 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        {plant.name}
                      </div>
                    </td>
                    {capabilities.map(cap => {
                      const cell = maturityData.find(c => c.plant === pid && c.capability === cap)
                      return (
                        <td key={cap} className="text-center py-2.5 px-3">
                          {cell ? (
                            <span className={`inline-flex w-8 h-8 rounded-lg items-center justify-center text-xs font-bold ${MATURITY_TEXT[cell.maturity]}`}
                              style={{ backgroundColor: MATURITY_COLORS[cell.maturity] }}>
                              {cell.maturity}
                            </span>
                          ) : <span className="text-gray-300">-</span>}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Utilization", value: `${(kpis.overallUtilization * 100).toFixed(0)}%`, color: kpis.overallUtilization > 0.8 ? "text-green-700" : "text-orange-600" },
          { label: "Peak Month", value: kpis.peakMonth, color: "text-blue-600" },
          { label: "Avg Actual", value: String(kpis.avgActual), color: "text-gray-900" },
          { label: "Avg Theoretical", value: String(kpis.avgTheoretical), color: "text-gray-900" },
        ].map(k => (
          <div key={k.label} className="border border-gray-200 rounded-xl bg-white p-5">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Capacity Trend */}
      <div className="border border-gray-200 rounded-xl bg-white p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">
          Capacity Trend - {plants.find(p => p.id === selectedPlant)?.name}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#374151" }} />
            <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Line type="monotone" dataKey="theoretical" stroke="#9CA3AF" strokeWidth={2} strokeDasharray="6 3" dot={false} name="Theoretical" />
            <Line type="monotone" dataKey="efficiency" stroke={ORANGE} strokeWidth={1.5} dot={false} name="Efficiency" />
            <Line type="monotone" dataKey="availability" stroke="#8B5CF6" strokeWidth={1.5} dot={false} name="Availability" />
            <Line type="monotone" dataKey="actual" stroke={BLUE} strokeWidth={2.5} dot={{ r: 4 }} name="Actual" />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// =================== Scenario Forecast ===================
function ScenarioForecastPanel() {
  const [inputs, setInputs] = useState<ScenarioInput>({
    demandMultiplier: 1.0,
    laborEfficiency: 1.0,
    scrapRate: 0.05,
    outsourceCapacity: 0.1,
  })
  const scenarioData = useMemo(() => calculateScenarioCapacity(inputs), [inputs])

  return (
    <div className="space-y-6">
      <div className="border border-gray-200 rounded-xl bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-amber-500" />
          <h3 className="text-base font-bold text-gray-900">What-If Scenario Parameters</h3>
        </div>
        <div className="grid grid-cols-4 gap-6">
          {([
            { key: "demandMultiplier" as const, label: "Demand Multiplier", min: 0.5, max: 2, step: 0.1, unit: "x" },
            { key: "laborEfficiency" as const, label: "Labor Efficiency", min: 0.7, max: 1.2, step: 0.05, unit: "x" },
            { key: "scrapRate" as const, label: "Scrap Rate", min: 0, max: 0.15, step: 0.01, unit: "%" },
            { key: "outsourceCapacity" as const, label: "Outsource Fraction", min: 0, max: 0.5, step: 0.05, unit: "%" },
          ]).map(slider => (
            <div key={slider.key}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-600">{slider.label}</label>
                <span className="text-sm font-bold text-blue-600">
                  {slider.unit === "%" ? `${(inputs[slider.key] * 100).toFixed(0)}%` : inputs[slider.key].toFixed(2)}
                </span>
              </div>
              <input type="range" min={slider.min} max={slider.max} step={slider.step} value={inputs[slider.key]}
                onChange={e => setInputs({ ...inputs, [slider.key]: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
            </div>
          ))}
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl bg-white p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">Demand vs Supply Forecast</h3>
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={scenarioData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#374151" }} />
            <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Area type="monotone" dataKey="totalSupply" fill="#dbeafe" stroke={BLUE} strokeWidth={1} name="Total Supply" fillOpacity={0.3} />
            <Bar dataKey="internalSupply" fill={BLUE} name="Internal" stackId="supply" />
            <Bar dataKey="outsourcedSupply" fill="#93c5fd" name="Outsourced" stackId="supply" />
            <Line type="monotone" dataKey="demand" stroke="#EF4444" strokeWidth={2.5} dot={{ r: 4 }} name="Demand" />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="border border-gray-200 rounded-xl bg-white p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">Gap Analysis</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={scenarioData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#374151" }} />
            <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="gap" name="Gap (units)">
              {scenarioData.map((entry, i) => (
                <Cell key={i} fill={entry.gap >= 0 ? "#10B981" : "#EF4444"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// =================== Bid Pipeline ===================
function BidPipelinePanel() {
  const conflicts = useMemo(() => detectConflicts(bidPipelineData), [])
  const statusColors: Record<string, string> = {
    Prospect: "bg-gray-100 text-gray-600",
    RFP: "bg-blue-100 text-blue-700",
    Proposal: "bg-amber-100 text-amber-700",
    Shortlist: "bg-indigo-100 text-indigo-700",
    Awarded: "bg-green-100 text-green-700",
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Pipeline Value", value: formatCurrency(bidPipelineData.reduce((s, b) => s + b.value, 0), true), color: "text-gray-900" },
          { label: "Probability-Weighted", value: formatCurrency(bidPipelineData.reduce((s, b) => s + b.weightedValue, 0), true), color: "text-blue-600" },
          { label: "Resource Conflicts", value: String(conflicts.length), color: conflicts.length > 0 ? "text-red-600" : "text-green-700" },
        ].map(k => (
          <div key={k.label} className="border border-gray-200 rounded-xl bg-white p-5">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {bidPipelineData.map(bid => (
          <div key={bid.id} className="border border-gray-200 rounded-xl bg-white p-5 hover:border-blue-300 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-900">{bid.program}</span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${statusColors[bid.status] || "bg-gray-100 text-gray-600"}`}>{bid.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <span className="text-gray-400">Customer</span><span className="text-right font-semibold text-gray-700">{bid.customer}</span>
              <span className="text-gray-400">Value</span><span className="text-right font-semibold text-gray-700">{formatCurrency(bid.value, true)}</span>
              <span className="text-gray-400">Probability</span><span className="text-right font-semibold text-gray-700">{(bid.probability * 100).toFixed(0)}%</span>
              <span className="text-gray-400">Weighted</span><span className="text-right font-bold text-blue-600">{formatCurrency(bid.weightedValue, true)}</span>
              <span className="text-gray-400">Target Plant</span><span className="text-right font-semibold text-gray-700">{plants.find(p => p.id === bid.targetPlant)?.name}</span>
              <span className="text-gray-400">Start</span><span className="text-right font-semibold text-gray-700">{bid.startDate}</span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1">
              {bid.requiredCapabilities.map(cap => (
                <span key={cap} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-semibold rounded">{cap}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {conflicts.length > 0 && (
        <div className="border border-red-200 rounded-xl bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <h3 className="text-base font-bold text-red-700">Resource Conflicts Detected</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-red-50"><tr>
              <th className="text-left py-2 px-3 font-semibold text-red-600">Program A</th>
              <th className="text-left py-2 px-3 font-semibold text-red-600">Program B</th>
              <th className="text-left py-2 px-3 font-semibold text-red-600">Shared Resources</th>
              <th className="text-left py-2 px-3 font-semibold text-red-600">Severity</th>
            </tr></thead>
            <tbody>
              {conflicts.map((c, i) => (
                <tr key={i} className="border-b border-red-100">
                  <td className="py-2 px-3 text-gray-800 font-medium">{c.bid1}</td>
                  <td className="py-2 px-3 text-gray-800 font-medium">{c.bid2}</td>
                  <td className="py-2 px-3 text-gray-600">{c.resource}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${c.severity === "High" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{c.severity}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// =================== Market Intelligence ===================
function MarketIntelPanel() {
  const categoryColors: Record<string, { bg: string; text: string; icon: typeof Globe }> = {
    Competitor: { bg: "bg-red-50", text: "text-red-700", icon: Target },
    Technology: { bg: "bg-blue-50", text: "text-blue-700", icon: Cpu },
    Regulation: { bg: "bg-amber-50", text: "text-amber-700", icon: Building2 },
    "Supply Chain": { bg: "bg-indigo-50", text: "text-indigo-700", icon: Globe },
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Globe className="w-5 h-5 text-blue-600" />
        <h3 className="text-base font-bold text-gray-900">Market & Competitive Intelligence Feed</h3>
      </div>
      {marketIntelData.map(item => {
        const cat = categoryColors[item.category] || categoryColors["Supply Chain"]
        const IconComp = cat.icon
        return (
          <div key={item.id} className="border border-gray-200 rounded-xl bg-white p-5 hover:border-blue-200 transition-colors">
            <div className="flex items-start gap-4">
              <div className={`p-2.5 rounded-xl ${cat.bg}`}>
                <IconComp className={`w-5 h-5 ${cat.text}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-gray-900">{item.title}</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${item.impact === "High" ? "bg-red-100 text-red-700" : item.impact === "Medium" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>{item.impact}</span>
                    <span className="text-xs text-gray-400">{item.date}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1.5">{item.summary}</p>
                <span className="text-xs text-gray-400">Source: {item.source}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// =================== Main Export ===================
export function OpsEnterpriseIntel() {
  const [subTab, setSubTab] = useState<IntelSubTab>("digital-twin")

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Operations/Unit Cost</h2>
        <button className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">View 1 (Main)</button>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">Enterprise Capacity & Capability Intelligence</h3>
        <p className="text-sm text-gray-400">Cross-plant capability maturity, capacity trends, bid pipeline, and market intelligence</p>
      </div>

      {/* Tab bar - underline style */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-0">
          {SUB_TABS.map(t => (
            <button key={t.id} onClick={() => setSubTab(t.id)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${subTab === t.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {subTab === "digital-twin" && <DigitalTwinPanel />}
      {subTab === "scenario-forecast" && <ScenarioForecastPanel />}
      {subTab === "bid-pipeline" && <BidPipelinePanel />}
      {subTab === "market-intel" && <MarketIntelPanel />}
    </div>
  )
}
