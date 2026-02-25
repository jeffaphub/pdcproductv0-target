"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import {
  getCapabilityMaturityData, plants, getCapacityHeatmapData, getCapacityTrendData, getCapacityKPIs,
  bidPipelineData, marketIntelData, calculateScenarioCapacity, detectConflicts,
  type PlantId, type ScenarioInput,
} from "@/lib/ops-enterprise-intel-data"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, Legend, Area, AreaChart, Cell,
} from "recharts"
import { Building2, Cpu, Target, Globe, TrendingUp, AlertTriangle, Zap, Crosshair } from "lucide-react"

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

// --- Digital Twin Panel ---
function DigitalTwinPanel() {
  const maturityData = useMemo(() => getCapabilityMaturityData(), [])
  const [selectedPlant, setSelectedPlant] = useState<PlantId>("PLT-A")
  const trendData = useMemo(() => getCapacityTrendData(selectedPlant), [selectedPlant])
  const kpis = useMemo(() => getCapacityKPIs(selectedPlant), [selectedPlant])

  const capabilities = [...new Set(maturityData.map(c => c.capability))]
  const plantIds = plants.map(p => p.id)

  return (
    <div className="space-y-4">
      {/* Capability Maturity Heatmap */}
      <Card className="bg-white border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-blue-600" />
            Capability Maturity Heatmap
          </CardTitle>
          <p className="text-[9px] text-slate-400">Scale: 1 (Development) to 5 (World-class). Click plant to see capacity trends below.</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead><tr>
                <th className="text-left py-1.5 px-2 font-bold text-slate-600 border-b border-slate-200">Plant</th>
                {capabilities.map(cap => (
                  <th key={cap} className="text-center py-1.5 px-2 font-bold text-slate-600 border-b border-slate-200 whitespace-nowrap">{cap}</th>
                ))}
              </tr></thead>
              <tbody>
                {plantIds.map(pid => {
                  const plant = plants.find(p => p.id === pid)!
                  return (
                    <tr key={pid} className={`border-b border-slate-100 cursor-pointer ${selectedPlant === pid ? "bg-blue-50" : "hover:bg-slate-50"}`}
                      onClick={() => setSelectedPlant(pid)}>
                      <td className="py-2 px-2 font-semibold text-slate-800 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {plant.name}
                        </div>
                      </td>
                      {capabilities.map(cap => {
                        const cell = maturityData.find(c => c.plant === pid && c.capability === cap)
                        return (
                          <td key={cap} className="text-center py-2 px-2">
                            {cell ? (
                              <span className={`inline-block w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold ${MATURITY_TEXT[cell.maturity]}`}
                                style={{ backgroundColor: MATURITY_COLORS[cell.maturity] }}>
                                {cell.maturity}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Capacity Trend for selected plant */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="bg-white border-slate-200"><CardContent className="p-3 text-center">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Utilization</p>
          <p className={`text-xl font-bold ${kpis.overallUtilization > 0.8 ? "text-emerald-600" : "text-amber-600"}`}>{(kpis.overallUtilization * 100).toFixed(0)}%</p>
        </CardContent></Card>
        <Card className="bg-white border-slate-200"><CardContent className="p-3 text-center">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Peak Month</p>
          <p className="text-xl font-bold text-blue-600">{kpis.peakMonth}</p>
        </CardContent></Card>
        <Card className="bg-white border-slate-200"><CardContent className="p-3 text-center">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Avg Actual</p>
          <p className="text-xl font-bold text-slate-800">{kpis.avgActual}</p>
        </CardContent></Card>
        <Card className="bg-white border-slate-200"><CardContent className="p-3 text-center">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Avg Theoretical</p>
          <p className="text-xl font-bold text-slate-800">{kpis.avgTheoretical}</p>
        </CardContent></Card>
      </div>

      <Card className="bg-white border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-slate-700">
            Capacity Trend - {plants.find(p => p.id === selectedPlant)?.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 9, fill: "#64748b" }} />
              <Tooltip contentStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="theoretical" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 3" dot={false} name="Theoretical" />
              <Line type="monotone" dataKey="efficiency" stroke="#f97316" strokeWidth={1.5} dot={false} name="Efficiency" />
              <Line type="monotone" dataKey="availability" stroke="#8b5cf6" strokeWidth={1.5} dot={false} name="Availability" />
              <Line type="monotone" dataKey="actual" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} name="Actual" />
              <Legend wrapperStyle={{ fontSize: 9 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

// --- Scenario Forecast Panel ---
function ScenarioForecastPanel() {
  const [inputs, setInputs] = useState<ScenarioInput>({
    demandMultiplier: 1.0,
    laborEfficiency: 1.0,
    scrapRate: 0.05,
    outsourceCapacity: 0.1,
  })
  const scenarioData = useMemo(() => calculateScenarioCapacity(inputs), [inputs])

  return (
    <div className="space-y-4">
      <Card className="bg-white border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            What-If Scenario Parameters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {([
              { key: "demandMultiplier" as const, label: "Demand Multiplier", min: 0.5, max: 2, step: 0.1, unit: "x" },
              { key: "laborEfficiency" as const, label: "Labor Efficiency", min: 0.7, max: 1.2, step: 0.05, unit: "x" },
              { key: "scrapRate" as const, label: "Scrap Rate", min: 0, max: 0.15, step: 0.01, unit: "%" },
              { key: "outsourceCapacity" as const, label: "Outsource Fraction", min: 0, max: 0.5, step: 0.05, unit: "%" },
            ]).map(slider => (
              <div key={slider.key}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-semibold text-slate-600">{slider.label}</label>
                  <span className="text-[10px] font-bold text-blue-600">
                    {slider.unit === "%" ? `${(inputs[slider.key] * 100).toFixed(0)}%` : inputs[slider.key].toFixed(2)}
                  </span>
                </div>
                <input type="range" min={slider.min} max={slider.max} step={slider.step} value={inputs[slider.key]}
                  onChange={e => setInputs({ ...inputs, [slider.key]: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-slate-700">Demand vs Supply Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={scenarioData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 9, fill: "#64748b" }} />
              <Tooltip contentStyle={{ fontSize: 10 }} />
              <Area type="monotone" dataKey="totalSupply" fill="#dbeafe" stroke="#2563eb" strokeWidth={1} name="Total Supply" fillOpacity={0.3} />
              <Bar dataKey="internalSupply" fill="#3b82f6" name="Internal" stackId="supply" />
              <Bar dataKey="outsourcedSupply" fill="#93c5fd" name="Outsourced" stackId="supply" />
              <Line type="monotone" dataKey="demand" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} name="Demand" />
              <Legend wrapperStyle={{ fontSize: 9 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-white border-slate-200">
        <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-slate-700">Gap Analysis</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={scenarioData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 9, fill: "#64748b" }} />
              <Tooltip contentStyle={{ fontSize: 10 }} />
              <Bar dataKey="gap" name="Gap (units)">
                {scenarioData.map((entry, i) => (
                  <Cell key={i} fill={entry.gap >= 0 ? "#10b981" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

// --- Bid Pipeline Panel ---
function BidPipelinePanel() {
  const conflicts = useMemo(() => detectConflicts(bidPipelineData), [])
  const totalWeighted = bidPipelineData.reduce((s, b) => s + b.weightedValue, 0)
  const statusColors: Record<string, string> = {
    Prospect: "bg-slate-100 text-slate-600",
    RFP: "bg-blue-100 text-blue-700",
    Proposal: "bg-amber-100 text-amber-700",
    Shortlist: "bg-purple-100 text-purple-700",
    Awarded: "bg-emerald-100 text-emerald-700",
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-white border-slate-200"><CardContent className="p-3 text-center">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Total Pipeline Value</p>
          <p className="text-xl font-bold text-slate-800">{formatCurrency(bidPipelineData.reduce((s, b) => s + b.value, 0), true)}</p>
        </CardContent></Card>
        <Card className="bg-white border-slate-200"><CardContent className="p-3 text-center">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Probability-Weighted</p>
          <p className="text-xl font-bold text-blue-600">{formatCurrency(totalWeighted, true)}</p>
        </CardContent></Card>
        <Card className="bg-white border-slate-200"><CardContent className="p-3 text-center">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Resource Conflicts</p>
          <p className={`text-xl font-bold ${conflicts.length > 0 ? "text-red-600" : "text-emerald-600"}`}>{conflicts.length}</p>
        </CardContent></Card>
      </div>

      {/* Opportunity cards */}
      <div className="grid grid-cols-2 gap-3">
        {bidPipelineData.map(bid => (
          <Card key={bid.id} className="bg-white border-slate-200 hover:border-blue-300 transition-colors">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-slate-800">{bid.program}</span>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${statusColors[bid.status] || "bg-slate-100 text-slate-600"}`}>{bid.status}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px]">
                <span className="text-slate-400">Customer</span><span className="text-right font-semibold text-slate-700">{bid.customer}</span>
                <span className="text-slate-400">Value</span><span className="text-right font-semibold text-slate-700">{formatCurrency(bid.value, true)}</span>
                <span className="text-slate-400">Probability</span><span className="text-right font-semibold text-slate-700">{(bid.probability * 100).toFixed(0)}%</span>
                <span className="text-slate-400">Weighted</span><span className="text-right font-bold text-blue-600">{formatCurrency(bid.weightedValue, true)}</span>
                <span className="text-slate-400">Target Plant</span><span className="text-right font-semibold text-slate-700">{plants.find(p => p.id === bid.targetPlant)?.name}</span>
                <span className="text-slate-400">Start</span><span className="text-right font-semibold text-slate-700">{bid.startDate}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-0.5">
                {bid.requiredCapabilities.map(cap => (
                  <span key={cap} className="px-1 py-0.5 bg-blue-50 text-blue-600 text-[7px] font-semibold rounded">{cap}</span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <Card className="bg-white border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-red-700 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Resource Conflicts Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-[10px]">
              <thead className="bg-red-50"><tr>
                <th className="text-left py-1.5 px-2 font-bold text-red-600">Program A</th>
                <th className="text-left py-1.5 px-2 font-bold text-red-600">Program B</th>
                <th className="text-left py-1.5 px-2 font-bold text-red-600">Shared Resources</th>
                <th className="text-left py-1.5 px-2 font-bold text-red-600">Severity</th>
              </tr></thead>
              <tbody>
                {conflicts.map((c, i) => (
                  <tr key={i} className="border-b border-red-100">
                    <td className="py-1 px-2 text-slate-800 font-medium">{c.bid1}</td>
                    <td className="py-1 px-2 text-slate-800 font-medium">{c.bid2}</td>
                    <td className="py-1 px-2 text-slate-600">{c.resource}</td>
                    <td className="py-1 px-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${c.severity === "High" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{c.severity}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// --- Market Intelligence Panel ---
function MarketIntelPanel() {
  const categoryColors: Record<string, { bg: string; text: string; icon: typeof Globe }> = {
    Competitor: { bg: "bg-red-50", text: "text-red-700", icon: Target },
    Technology: { bg: "bg-blue-50", text: "text-blue-700", icon: Cpu },
    Regulation: { bg: "bg-amber-50", text: "text-amber-700", icon: Building2 },
    "Supply Chain": { bg: "bg-purple-50", text: "text-purple-700", icon: Globe },
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Globe className="w-4 h-4 text-blue-600" />
        <h3 className="text-xs font-bold text-slate-700">Market & Competitive Intelligence Feed</h3>
      </div>
      {marketIntelData.map(item => {
        const cat = categoryColors[item.category] || categoryColors["Supply Chain"]
        const IconComp = cat.icon
        return (
          <Card key={item.id} className="bg-white border-slate-200 hover:border-blue-200 transition-colors">
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${cat.bg}`}>
                  <IconComp className={`w-4 h-4 ${cat.text}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-bold text-slate-800">{item.title}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${item.impact === "High" ? "bg-red-100 text-red-700" : item.impact === "Medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{item.impact}</span>
                      <span className="text-[8px] text-slate-400">{item.date}</span>
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-600 mb-1">{item.summary}</p>
                  <span className="text-[8px] text-slate-400">Source: {item.source}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// --- Main export ---
export function OpsEnterpriseIntel() {
  const [subTab, setSubTab] = useState<IntelSubTab>("digital-twin")

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Enterprise Capacity & Capability Intelligence</h2>
          <p className="text-[10px] text-slate-400">Cross-plant capability maturity, capacity trends, bid pipeline, and market intelligence</p>
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

      {subTab === "digital-twin" && <DigitalTwinPanel />}
      {subTab === "scenario-forecast" && <ScenarioForecastPanel />}
      {subTab === "bid-pipeline" && <BidPipelinePanel />}
      {subTab === "market-intel" && <MarketIntelPanel />}
    </div>
  )
}
