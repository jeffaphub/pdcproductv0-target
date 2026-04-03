"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
import { 
  Info, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Building2,
  User,
  Filter,
  ChevronRight
} from "lucide-react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip
} from "recharts"

// Types
type Status = "green" | "yellow" | "red"
type Trend = "up" | "down" | "flat"

interface MetricCell {
  status: Status
  value: string
  threshold: string
  trend: Trend
  reason: string
}

type Tier = "1" | "2" | "3"

interface Program {
  id: string
  name: string
  sector: string
  tier: Tier
  revenue: number // Annual revenue in millions
  programManager: string
  overallHealth: MetricCell
  otd: MetricCell
  costVariance: MetricCell
  quality: MetricCell
  safety: MetricCell
  supplyStability: MetricCell
  scheduleAdherence: MetricCell
  margin: MetricCell
  customerHealth: MetricCell
  riskBurndown: MetricCell
  staffing: MetricCell
  cash: MetricCell
  topIssues: string[]
  topActions: string[]
  executiveSummary: string
  nextReviewDate: string
}

// Mock data generator with 55 programs across 3 tiers
const generateMockPrograms = (): Program[] => {
  const sectors = ["Defense Systems", "Avionics", "Space Systems", "Maritime", "Communications", "Cyber Systems", "Ground Systems", "Missile Systems"]
  const managers = ["J. Martinez", "S. Chen", "R. Thompson", "A. Patel", "M. Williams", "K. Johnson", "L. Garcia", "D. Brown", "E. Wilson", "T. Anderson", "P. Kumar", "N. Roberts", "C. Davis", "H. Lee", "F. Moore", "B. Taylor", "G. White", "I. Harris", "O. Clark", "V. Lewis"]
  
  const generateMetric = (baseStatus: Status, variance: number = 0.3): MetricCell => {
    const rand = Math.random()
    let status: Status = baseStatus
    if (rand < variance) status = baseStatus === "green" ? "yellow" : baseStatus === "yellow" ? (Math.random() > 0.5 ? "green" : "red") : "yellow"
    
    const trends: Trend[] = ["up", "down", "flat"]
    const trend = trends[Math.floor(Math.random() * 3)]
    
    const values: Record<Status, Record<string, { value: string; threshold: string; reason: string }>> = {
      green: {
        otd: { value: `${95 + Math.floor(Math.random() * 5)}.${Math.floor(Math.random() * 10)}%`, threshold: ">=95%", reason: "OTD above target" },
        costVariance: { value: `${Math.random() > 0.5 ? "+" : "-"}${(Math.random() * 0.9).toFixed(1)}%`, threshold: "±1%", reason: "Cost within range" },
        quality: { value: `${(0.5 + Math.random() * 1.4).toFixed(1)} DPM`, threshold: "<2 DPM", reason: "Quality acceptable" },
        safety: { value: "0 incidents", threshold: "0 recordables", reason: "No safety concerns" },
        supplyStability: { value: "Stable", threshold: "No critical disruptions", reason: "Supply chain healthy" },
        scheduleAdherence: { value: "On Plan", threshold: "No slip", reason: "Schedule maintained" },
        margin: { value: `+${(1 + Math.random() * 3).toFixed(1)}%`, threshold: ">=0%", reason: "Margin healthy" },
        customerHealth: { value: "Normal", threshold: "No escalations", reason: "Customer satisfied" },
        riskBurndown: { value: `-${5 + Math.floor(Math.random() * 15)}%`, threshold: "Decreasing", reason: "Risks being retired" },
        staffing: { value: `${95 + Math.floor(Math.random() * 5)}%`, threshold: ">=95%", reason: "Adequately staffed" },
        cash: { value: "On Target", threshold: "Within plan", reason: "Cash flow normal" },
        overallHealth: { value: "On Track", threshold: "All metrics green/yellow", reason: "Strong performance" }
      },
      yellow: {
        otd: { value: `${88 + Math.floor(Math.random() * 7)}.${Math.floor(Math.random() * 10)}%`, threshold: ">=95%", reason: "OTD below target" },
        costVariance: { value: `+${(1.1 + Math.random() * 2).toFixed(1)}%`, threshold: "±1%", reason: "Cost pressure" },
        quality: { value: `${(2.1 + Math.random() * 1).toFixed(1)} DPM`, threshold: "<2 DPM", reason: "Quality concerns" },
        safety: { value: "Near-miss", threshold: "0 recordables", reason: "Near-miss under review" },
        supplyStability: { value: "At Risk", threshold: "No critical disruptions", reason: "Supply concern" },
        scheduleAdherence: { value: "Minor Slip", threshold: "No slip", reason: "Schedule slipping" },
        margin: { value: `-${(0.1 + Math.random() * 1.5).toFixed(1)}%`, threshold: ">=0%", reason: "Margin pressure" },
        customerHealth: { value: "Concerned", threshold: "No escalations", reason: "Customer concerns" },
        riskBurndown: { value: `+${Math.floor(Math.random() * 8)}%`, threshold: "Decreasing", reason: "Risks not reducing" },
        staffing: { value: `${85 + Math.floor(Math.random() * 10)}%`, threshold: ">=95%", reason: "Staffing gaps" },
        cash: { value: "Watch", threshold: "Within plan", reason: "Cash attention needed" },
        overallHealth: { value: "Watch", threshold: "1-2 yellow metrics", reason: "Monitoring required" }
      },
      red: {
        otd: { value: `${70 + Math.floor(Math.random() * 18)}.${Math.floor(Math.random() * 10)}%`, threshold: ">=95%", reason: "Critical OTD miss" },
        costVariance: { value: `+${(3.5 + Math.random() * 3).toFixed(1)}%`, threshold: "±1%", reason: "Significant overrun" },
        quality: { value: `${(3.5 + Math.random() * 2).toFixed(1)} DPM`, threshold: "<2 DPM", reason: "Quality crisis" },
        safety: { value: "Recordable", threshold: "0 recordables", reason: "Safety incident occurred" },
        supplyStability: { value: "Critical", threshold: "No critical disruptions", reason: "Supply crisis" },
        scheduleAdherence: { value: "Major Slip", threshold: "No slip", reason: "Major schedule delay" },
        margin: { value: `-${(2 + Math.random() * 3).toFixed(1)}%`, threshold: ">=0%", reason: "Margin erosion" },
        customerHealth: { value: "Escalated", threshold: "No escalations", reason: "Customer escalation" },
        riskBurndown: { value: `+${15 + Math.floor(Math.random() * 15)}%`, threshold: "Decreasing", reason: "Risk exposure critical" },
        staffing: { value: `${75 + Math.floor(Math.random() * 10)}%`, threshold: ">=95%", reason: "Critical staffing gaps" },
        cash: { value: "Off Plan", threshold: "Within plan", reason: "Cash crisis" },
        overallHealth: { value: "At Risk", threshold: "Critical metric red", reason: "Intervention required" }
      }
    }
    
    return { status, trend, ...values[status].overallHealth }
  }
  
  const generateProgram = (id: number, tier: Tier, name: string, healthProfile: "good" | "mixed" | "troubled"): Program => {
    const baseStatus: Status = healthProfile === "good" ? "green" : healthProfile === "mixed" ? "yellow" : "red"
    const sector = sectors[Math.floor(Math.random() * sectors.length)]
    const manager = managers[Math.floor(Math.random() * managers.length)]
    
    // Revenue based on tier: Tier 1 = $80-200M, Tier 2 = $30-80M, Tier 3 = $5-30M
    const revenueRanges: Record<Tier, [number, number]> = {
      "1": [80, 200],
      "2": [30, 80],
      "3": [5, 30]
    }
    const [minRev, maxRev] = revenueRanges[tier]
    const revenue = Math.round(minRev + Math.random() * (maxRev - minRev))
    
    const otdVals = { green: { value: `${95 + Math.floor(Math.random() * 5)}.${Math.floor(Math.random() * 10)}%`, threshold: ">=95%", reason: "OTD above target" }, yellow: { value: `${88 + Math.floor(Math.random() * 7)}.${Math.floor(Math.random() * 10)}%`, threshold: ">=95%", reason: "OTD below target" }, red: { value: `${70 + Math.floor(Math.random() * 18)}.${Math.floor(Math.random() * 10)}%`, threshold: ">=95%", reason: "Critical OTD miss" } }
    const costVals = { green: { value: `${Math.random() > 0.5 ? "+" : "-"}${(Math.random() * 0.9).toFixed(1)}%`, threshold: "±1%", reason: "Cost within range" }, yellow: { value: `+${(1.1 + Math.random() * 2).toFixed(1)}%`, threshold: "±1%", reason: "Cost pressure" }, red: { value: `+${(3.5 + Math.random() * 3).toFixed(1)}%`, threshold: "±1%", reason: "Significant overrun" } }
    const qualVals = { green: { value: `${(0.5 + Math.random() * 1.4).toFixed(1)} DPM`, threshold: "<2 DPM", reason: "Quality acceptable" }, yellow: { value: `${(2.1 + Math.random() * 1).toFixed(1)} DPM`, threshold: "<2 DPM", reason: "Quality concerns" }, red: { value: `${(3.5 + Math.random() * 2).toFixed(1)} DPM`, threshold: "<2 DPM", reason: "Quality crisis" } }
    const safeVals = { green: { value: "0 incidents", threshold: "0 recordables", reason: "No safety concerns" }, yellow: { value: "Near-miss", threshold: "0 recordables", reason: "Near-miss under review" }, red: { value: "Recordable", threshold: "0 recordables", reason: "Safety incident occurred" } }
    const suppVals = { green: { value: "Stable", threshold: "No critical disruptions", reason: "Supply chain healthy" }, yellow: { value: "At Risk", threshold: "No critical disruptions", reason: "Supply concern" }, red: { value: "Critical", threshold: "No critical disruptions", reason: "Supply crisis" } }
    const schedVals = { green: { value: "On Plan", threshold: "No slip", reason: "Schedule maintained" }, yellow: { value: "Minor Slip", threshold: "No slip", reason: "Schedule slipping" }, red: { value: "Major Slip", threshold: "No slip", reason: "Major schedule delay" } }
    const margVals = { green: { value: `+${(1 + Math.random() * 3).toFixed(1)}%`, threshold: ">=0%", reason: "Margin healthy" }, yellow: { value: `-${(0.1 + Math.random() * 1.5).toFixed(1)}%`, threshold: ">=0%", reason: "Margin pressure" }, red: { value: `-${(2 + Math.random() * 3).toFixed(1)}%`, threshold: ">=0%", reason: "Margin erosion" } }
    const custVals = { green: { value: "Normal", threshold: "No escalations", reason: "Customer satisfied" }, yellow: { value: "Concerned", threshold: "No escalations", reason: "Customer concerns" }, red: { value: "Escalated", threshold: "No escalations", reason: "Customer escalation" } }
    const riskVals = { green: { value: `-${5 + Math.floor(Math.random() * 15)}%`, threshold: "Decreasing", reason: "Risks being retired" }, yellow: { value: `+${Math.floor(Math.random() * 8)}%`, threshold: "Decreasing", reason: "Risks not reducing" }, red: { value: `+${15 + Math.floor(Math.random() * 15)}%`, threshold: "Decreasing", reason: "Risk exposure critical" } }
    const staffVals = { green: { value: `${95 + Math.floor(Math.random() * 5)}%`, threshold: ">=95%", reason: "Adequately staffed" }, yellow: { value: `${85 + Math.floor(Math.random() * 10)}%`, threshold: ">=95%", reason: "Staffing gaps" }, red: { value: `${75 + Math.floor(Math.random() * 10)}%`, threshold: ">=95%", reason: "Critical staffing gaps" } }
    const cashVals = { green: { value: "On Target", threshold: "Within plan", reason: "Cash flow normal" }, yellow: { value: "Watch", threshold: "Within plan", reason: "Cash attention needed" }, red: { value: "Off Plan", threshold: "Within plan", reason: "Cash crisis" } }
    const healthVals = { green: { value: "On Track", threshold: "All metrics green/yellow", reason: "Strong performance" }, yellow: { value: "Watch", threshold: "1-2 yellow metrics", reason: "Monitoring required" }, red: { value: "At Risk", threshold: "Critical metric red", reason: "Intervention required" } }
    
    const trends: Trend[] = ["up", "down", "flat"]
    const pickTrend = (): Trend => trends[Math.floor(Math.random() * 3)]
    const pickStatus = (base: Status, greenProb: number, yellowProb: number): Status => {
      const r = Math.random()
      if (r < greenProb) return "green"
      if (r < greenProb + yellowProb) return "yellow"
      return "red"
    }
    
    // Determine metric statuses based on health profile
    const getStatus = (base: Status): Status => {
      if (base === "green") return pickStatus(base, 0.85, 0.12)
      if (base === "yellow") return pickStatus(base, 0.35, 0.50)
      return pickStatus(base, 0.10, 0.30)
    }
    
    const ohStatus = healthProfile === "good" ? "green" : healthProfile === "mixed" ? "yellow" : "red"
    const otdStatus = getStatus(baseStatus)
    const costStatus = getStatus(baseStatus)
    const qualStatus = getStatus(baseStatus)
    const safeStatus = healthProfile === "troubled" ? pickStatus("red", 0.6, 0.3) : pickStatus("green", 0.9, 0.1)
    const suppStatus = getStatus(baseStatus)
    const schedStatus = getStatus(baseStatus)
    const margStatus = getStatus(baseStatus)
    const custStatus = getStatus(baseStatus)
    const riskStatus = getStatus(baseStatus)
    const staffStatus = getStatus(baseStatus)
    const cashStatus = getStatus(baseStatus)
    
    const issues = healthProfile === "good" 
      ? ["Minor process improvement opportunities"] 
      : healthProfile === "mixed"
      ? ["Cost pressure from materials", "Schedule buffer consumed", "Single-source component risk"]
      : ["Critical part shortage", "Customer escalation active", "Schedule slip significant", "Cost overrun accelerating", "Staff burnout risk"]
    
    const actions = healthProfile === "good"
      ? ["Continuous improvement initiatives", "Best practice documentation"]
      : healthProfile === "mixed"
      ? ["Recovery plan in development", "Supplier negotiations", "Overtime management"]
      : ["War room established", "Executive escalation", "Recovery plan v3", "Emergency hiring"]
    
    const summary = healthProfile === "good"
      ? "Program performing well across all dimensions. No intervention required."
      : healthProfile === "mixed"
      ? "Program experiencing some pressure areas. Mitigation actions in place, monitoring closely."
      : "Program requires executive intervention. Multiple critical issues converging."
    
    return {
      id: `PRG-${String(id).padStart(3, "0")}`,
      name,
      sector,
      tier,
      revenue,
      programManager: manager,
      overallHealth: { status: ohStatus, ...healthVals[ohStatus], trend: pickTrend() },
      otd: { status: otdStatus, ...otdVals[otdStatus], trend: pickTrend() },
      costVariance: { status: costStatus, ...costVals[costStatus], trend: pickTrend() },
      quality: { status: qualStatus, ...qualVals[qualStatus], trend: pickTrend() },
      safety: { status: safeStatus, ...safeVals[safeStatus], trend: pickTrend() },
      supplyStability: { status: suppStatus, ...suppVals[suppStatus], trend: pickTrend() },
      scheduleAdherence: { status: schedStatus, ...schedVals[schedStatus], trend: pickTrend() },
      margin: { status: margStatus, ...margVals[margStatus], trend: pickTrend() },
      customerHealth: { status: custStatus, ...custVals[custStatus], trend: pickTrend() },
      riskBurndown: { status: riskStatus, ...riskVals[riskStatus], trend: pickTrend() },
      staffing: { status: staffStatus, ...staffVals[staffStatus], trend: pickTrend() },
      cash: { status: cashStatus, ...cashVals[cashStatus], trend: pickTrend() },
      topIssues: issues,
      topActions: actions,
      executiveSummary: summary,
      nextReviewDate: `2024-02-${String(5 + Math.floor(Math.random() * 20)).padStart(2, "0")}`
    }
  }
  
  // Tier 1 programs (12 programs) - highest revenue $80-200M
  const tier1Names = ["Alpha Prime", "Strategic Defense", "Global Strike", "Command Nexus", "Titan Shield", "Eagle Eye", "Thunder Force", "Iron Dome", "Neptune Guard", "Spectrum Dominance", "Patriot Next", "Guardian Elite"]
  
  // Tier 2 programs (18 programs) - medium revenue $30-80M
  const tier2Names = ["Falcon Wing", "Orion Link", "Atlas Network", "Phoenix Rise", "Vanguard System", "Sentinel Watch", "Horizon Scan", "Triton Wave", "Mercury Swift", "Apollo Connect", "Artemis Track", "Zeus Power", "Athena Shield", "Poseidon Deep", "Ares Strike", "Hermes Fast", "Hera Command", "Helios Beam"]
  
  // Tier 3 programs (25 programs) - lower revenue $5-30M
  const tier3Names = ["Delta Support", "Echo Comm", "Foxtrot Maint", "Golf Logistics", "Hotel Sustain", "India Test", "Juliet Repair", "Kilo Parts", "Lima Training", "Mike Field", "November Depot", "Oscar Calibrate", "Papa Upgrade", "Quebec Mod", "Romeo Inspect", "Sierra Retrofit", "Tango Refresh", "Uniform Service", "Victor Overhaul", "Whiskey Rebuild", "X-Ray Assess", "Yankee Audit", "Zulu Baseline", "Bravo Enhance", "Charlie Optimize"]
  
  const programs: Program[] = []
  let idx = 1
  
  // Tier 1: 12 programs (mostly good, some mixed, rare troubled)
  tier1Names.forEach((name, i) => {
    const profile = i < 7 ? "good" : i < 10 ? "mixed" : "troubled"
    programs.push(generateProgram(idx++, "1", name, profile))
  })
  
  // Tier 2: 18 programs (mix of good, mixed, some troubled)
  tier2Names.forEach((name, i) => {
    const profile = i < 8 ? "good" : i < 14 ? "mixed" : "troubled"
    programs.push(generateProgram(idx++, "2", name, profile))
  })
  
  // Tier 3: 25 programs (more mixed and some troubled)
  tier3Names.forEach((name, i) => {
    const profile = i < 10 ? "good" : i < 20 ? "mixed" : "troubled"
    programs.push(generateProgram(idx++, "3", name, profile))
  })
  
  return programs
}

// Status color utilities
const getStatusColor = (status: Status): string => {
  switch (status) {
    case "green": return "bg-emerald-500"
    case "yellow": return "bg-amber-400"
    case "red": return "bg-red-500"
  }
}

const getStatusBgLight = (status: Status): string => {
  switch (status) {
    case "green": return "bg-emerald-50 border-emerald-200"
    case "yellow": return "bg-amber-50 border-amber-200"
    case "red": return "bg-red-50 border-red-200"
  }
}

const getStatusText = (status: Status): string => {
  switch (status) {
    case "green": return "text-emerald-700"
    case "yellow": return "text-amber-700"
    case "red": return "text-red-700"
  }
}

const getTrendIcon = (trend: Trend) => {
  switch (trend) {
    case "up": return <TrendingUp className="w-3 h-3" />
    case "down": return <TrendingDown className="w-3 h-3" />
    case "flat": return <Minus className="w-3 h-3" />
  }
}

// Metric columns definition
const metricColumns = [
  { key: "overallHealth", label: "Overall", critical: true },
  { key: "otd", label: "OTD", critical: true },
  { key: "costVariance", label: "Cost Var", critical: true },
  { key: "quality", label: "Quality", critical: true },
  { key: "safety", label: "Safety", critical: true },
  { key: "supplyStability", label: "Supply", critical: true },
  { key: "scheduleAdherence", label: "Schedule", critical: false },
  { key: "margin", label: "Margin", critical: false },
  { key: "customerHealth", label: "Customer", critical: false },
  { key: "riskBurndown", label: "Risk", critical: false },
  { key: "staffing", label: "Staffing", critical: false },
  { key: "cash", label: "Cash", critical: false },
] as const

type MetricKey = typeof metricColumns[number]["key"]

export function SectorView() {
  const [searchTerm, setSearchTerm] = useState("")
  const [sectorFilter, setSectorFilter] = useState<string>("all")
  const [tierFilter, setTierFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [pmFilter, setPmFilter] = useState<string>("all")
  const [showOnlyIssues, setShowOnlyIssues] = useState(false)
  const [sortWorstFirst, setSortWorstFirst] = useState(false)
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<{ program: Program; metricKey: string; metricLabel: string } | null>(null)
  const [metricDrawerOpen, setMetricDrawerOpen] = useState(false)

  const programs = useMemo(() => generateMockPrograms(), [])

  // Get unique values for filters
  const sectors = useMemo(() => [...new Set(programs.map(p => p.sector))], [programs])
  const programManagers = useMemo(() => [...new Set(programs.map(p => p.programManager))], [programs])

  // Tier stats for display
  const tierStats = useMemo(() => ({
    tier1: programs.filter(p => p.tier === "1").length,
    tier2: programs.filter(p => p.tier === "2").length,
    tier3: programs.filter(p => p.tier === "3").length,
    tier1Revenue: programs.filter(p => p.tier === "1").reduce((sum, p) => sum + p.revenue, 0),
    tier2Revenue: programs.filter(p => p.tier === "2").reduce((sum, p) => sum + p.revenue, 0),
    tier3Revenue: programs.filter(p => p.tier === "3").reduce((sum, p) => sum + p.revenue, 0),
  }), [programs])

  // Filter and sort programs
  const filteredPrograms = useMemo(() => {
    let result = programs.filter(p => {
      if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
      if (sectorFilter !== "all" && p.sector !== sectorFilter) return false
      if (tierFilter !== "all" && p.tier !== tierFilter) return false
      if (pmFilter !== "all" && p.programManager !== pmFilter) return false
      if (statusFilter !== "all" && p.overallHealth.status !== statusFilter) return false
      if (showOnlyIssues && p.overallHealth.status === "green") return false
      return true
    })

    if (sortWorstFirst) {
      const statusOrder = { red: 0, yellow: 1, green: 2 }
      result = [...result].sort((a, b) => 
        statusOrder[a.overallHealth.status] - statusOrder[b.overallHealth.status]
      )
    }

    return result
  }, [programs, searchTerm, sectorFilter, tierFilter, statusFilter, pmFilter, showOnlyIssues, sortWorstFirst])

  // Summary stats
  const stats = useMemo(() => {
    const total = programs.length
    const green = programs.filter(p => p.overallHealth.status === "green").length
    const yellow = programs.filter(p => p.overallHealth.status === "yellow").length
    const red = programs.filter(p => p.overallHealth.status === "red").length
    const worsening = programs.filter(p => p.overallHealth.trend === "down").length
    const needsIntervention = programs.filter(p => p.overallHealth.status === "red").length
    return { total, green, yellow, red, worsening, needsIntervention }
  }, [programs])

  // Critical programs (red overall)
  const criticalPrograms = useMemo(() => 
    programs.filter(p => p.overallHealth.status === "red"),
    [programs]
  )

  // Worsening programs
  const worseningPrograms = useMemo(() => 
    programs.filter(p => p.overallHealth.trend === "down" && p.overallHealth.status !== "green"),
    [programs]
  )

  const handleRowClick = (program: Program) => {
    setSelectedProgram(program)
    setDrawerOpen(true)
  }

  const handleCellClick = (program: Program, metricKey: string, metricLabel: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent row click
    setSelectedMetric({ program, metricKey, metricLabel })
    setMetricDrawerOpen(true)
  }

  const getMetricValue = (program: Program, key: MetricKey): MetricCell => {
    return program[key] as MetricCell
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-800">Sector View</h1>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-slate-400" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Consolidated sector-level health matrix across major MSL programs. Red/Yellow/Green status indicates program health across critical business metrics.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-sm text-slate-500 mt-1">Executive program health across delivery, cost, quality, and operational performance</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>

        {/* Summary KPI Strip */}
        <div className="flex flex-wrap gap-3">
          <Card className="border-slate-200 flex-1 min-w-[100px]">
            <CardContent className="p-3">
              <p className="text-xs text-slate-500">Total Programs</p>
              <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="border-indigo-200 bg-indigo-50/50 flex-1 min-w-[100px]">
            <CardContent className="p-3">
              <p className="text-xs text-indigo-600">Tier 1 (Strategic)</p>
              <p className="text-2xl font-bold text-indigo-700">{tierStats.tier1}</p>
              <p className="text-[10px] text-indigo-500">${tierStats.tier1Revenue}M rev</p>
            </CardContent>
          </Card>
          <Card className="border-sky-200 bg-sky-50/50 flex-1 min-w-[100px]">
            <CardContent className="p-3">
              <p className="text-xs text-sky-600">Tier 2 (Core)</p>
              <p className="text-2xl font-bold text-sky-700">{tierStats.tier2}</p>
              <p className="text-[10px] text-sky-500">${tierStats.tier2Revenue}M rev</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-slate-50/50 flex-1 min-w-[100px]">
            <CardContent className="p-3">
              <p className="text-xs text-slate-500">Tier 3 (Support)</p>
              <p className="text-2xl font-bold text-slate-700">{tierStats.tier3}</p>
              <p className="text-[10px] text-slate-400">${tierStats.tier3Revenue}M rev</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-200 bg-emerald-50/50 flex-1 min-w-[100px]">
            <CardContent className="p-3">
              <p className="text-xs text-emerald-600">Programs Green</p>
              <p className="text-2xl font-bold text-emerald-700">{stats.green}</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/50 flex-1 min-w-[100px]">
            <CardContent className="p-3">
              <p className="text-xs text-amber-600">Programs Yellow</p>
              <p className="text-2xl font-bold text-amber-700">{stats.yellow}</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50 flex-1 min-w-[100px]">
            <CardContent className="p-3">
              <p className="text-xs text-red-600">Programs Red</p>
              <p className="text-2xl font-bold text-red-700">{stats.red}</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 flex-1 min-w-[100px]">
            <CardContent className="p-3">
              <p className="text-xs text-slate-500">Worsening Trend</p>
              <p className="text-2xl font-bold text-slate-800">{stats.worsening}</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50 flex-1 min-w-[100px]">
            <CardContent className="p-3">
              <p className="text-xs text-red-600">Needs Intervention</p>
              <p className="text-2xl font-bold text-red-700">{stats.needsIntervention}</p>
            </CardContent>
          </Card>
        </div>

        {/* Critical Callouts */}
        {(criticalPrograms.length > 0 || worseningPrograms.length > 0) && (
          <div className="flex flex-wrap gap-3">
            {criticalPrograms.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-xs font-medium text-red-700">Most Critical:</span>
                {criticalPrograms.map((p, i) => (
                  <Badge key={p.id} variant="outline" className="bg-red-100 text-red-700 border-red-300 text-xs">
                    {p.name}
                  </Badge>
                ))}
              </div>
            )}
            {worseningPrograms.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                <TrendingDown className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-medium text-amber-700">Worsening This Month:</span>
                {worseningPrograms.slice(0, 3).map((p, i) => (
                  <Badge key={p.id} variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-xs">
                    {p.name}
                  </Badge>
                ))}
                {worseningPrograms.length > 3 && (
                  <span className="text-xs text-amber-600">+{worseningPrograms.length - 3} more</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Filter Bar */}
        <Card className="border-slate-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search program..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-48 h-8 text-sm"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs h-6 bg-blue-50 border-blue-200 text-blue-700">Tier</Badge>
                <Select value={tierFilter} onValueChange={setTierFilter}>
                  <SelectTrigger className="w-44 h-8 text-sm">
                    <SelectValue placeholder="Program Tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers ({programs.length})</SelectItem>
                    <SelectItem value="1">Tier 1 - Strategic ({tierStats.tier1}) ${tierStats.tier1Revenue}M</SelectItem>
                    <SelectItem value="2">Tier 2 - Core ({tierStats.tier2}) ${tierStats.tier2Revenue}M</SelectItem>
                    <SelectItem value="3">Tier 3 - Support ({tierStats.tier3}) ${tierStats.tier3Revenue}M</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                <Select value={sectorFilter} onValueChange={setSectorFilter}>
                  <SelectTrigger className="w-40 h-8 text-sm">
                    <SelectValue placeholder="Sector" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sectors</SelectItem>
                    {sectors.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <Select value={pmFilter} onValueChange={setPmFilter}>
                  <SelectTrigger className="w-36 h-8 text-sm">
                    <SelectValue placeholder="PM" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All PMs</SelectItem>
                    {programManagers.map(pm => (
                      <SelectItem key={pm} value={pm}>{pm}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32 h-8 text-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="red">Red Only</SelectItem>
                    <SelectItem value="yellow">Yellow Only</SelectItem>
                    <SelectItem value="green">Green Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-4 ml-auto">
                <div className="flex items-center gap-2">
                  <Switch
                    id="show-issues"
                    checked={showOnlyIssues}
                    onCheckedChange={setShowOnlyIssues}
                  />
                  <label htmlFor="show-issues" className="text-xs text-slate-600">Show only issues</label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="sort-worst"
                    checked={sortWorstFirst}
                    onCheckedChange={setSortWorstFirst}
                  />
                  <label htmlFor="sort-worst" className="text-xs text-slate-600">Sort worst-first</label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-500" />
            <span className="text-slate-600">Green = On Track</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-400" />
            <span className="text-slate-600">Yellow = Watch</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500" />
            <span className="text-slate-600">Red = Attention Required</span>
          </div>
          <div className="flex items-center gap-4 ml-auto text-slate-500">
            <div className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Improving</div>
            <div className="flex items-center gap-1"><Minus className="w-3 h-3" /> Flat</div>
            <div className="flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Worsening</div>
          </div>
        </div>

        {/* Main Matrix */}
        <Card className="border-slate-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr className="border-b border-slate-200">
                    <th className="sticky left-0 z-20 bg-slate-50 text-left p-3 font-semibold text-slate-700 min-w-[220px] border-r border-slate-200">
                      Program
                    </th>
                    <th className="p-2 text-center font-semibold text-slate-700 min-w-[50px] bg-blue-50">
                      Tier
                    </th>
                    <th className="p-2 text-center font-semibold text-slate-700 min-w-[70px] bg-blue-50">
                      Revenue
                    </th>
                    {metricColumns.map(col => (
                      <th key={col.key} className={`p-2 text-center font-semibold text-slate-700 min-w-[70px] ${col.critical ? "bg-slate-100" : "bg-slate-50"}`}>
                        <span className={col.critical ? "text-slate-800" : "text-slate-600"}>{col.label}</span>
                        {col.critical && <span className="text-red-400 ml-0.5">*</span>}
                      </th>
                    ))}
                    <th className="p-2 text-center font-semibold text-slate-700 min-w-[60px]">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPrograms.map((program) => (
                    <tr 
                      key={program.id} 
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => handleRowClick(program)}
                    >
                      <td className="sticky left-0 z-10 bg-white hover:bg-slate-50 p-3 border-r border-slate-200">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleRowClick(program); }}
                          className="text-left hover:bg-blue-50 rounded p-1 -m-1 transition-colors"
                        >
                          <div className="font-medium text-slate-800 hover:text-blue-600">{program.name}</div>
                          <div className="text-xs text-slate-500">{program.sector} • {program.programManager}</div>
                        </button>
                      </td>
                      <td className="p-1.5 text-center bg-blue-50/30">
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] px-1.5 py-0.5 ${
                            program.tier === "1" ? "bg-indigo-100 border-indigo-300 text-indigo-700" :
                            program.tier === "2" ? "bg-sky-100 border-sky-300 text-sky-700" :
                            "bg-slate-100 border-slate-300 text-slate-600"
                          }`}
                        >
                          T{program.tier}
                        </Badge>
                      </td>
                      <td className="p-1.5 text-center bg-blue-50/30">
                        <span className="text-xs font-medium text-slate-700">${program.revenue}M</span>
                      </td>
                      {metricColumns.map(col => {
                        const metric = getMetricValue(program, col.key)
                        return (
                          <td key={col.key} className="p-1.5 text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => handleCellClick(program, col.key, col.label, e)}
                                  className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded ${getStatusColor(metric.status)} text-white text-xs font-medium min-w-[50px] cursor-pointer hover:opacity-80 hover:ring-2 hover:ring-offset-1 hover:ring-slate-400 transition-all`}
                                >
                                  {getTrendIcon(metric.trend)}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[220px]">
                                <div className="text-xs space-y-1">
                                  <p className="font-semibold">{col.label}: {metric.value}</p>
                                  <p className="text-slate-400">Threshold: {metric.threshold}</p>
                                  <p>{metric.reason}</p>
                                  <p className="text-blue-400 pt-1">Click for details</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </td>
                        )
                      })}
                      <td className="p-1.5 text-center">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-slate-400">* Critical metrics affecting overall health calculation</p>

        {/* Detail Drawer */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
            {selectedProgram && (
              <>
                <SheetHeader className="pb-4 border-b border-slate-200">
                  <SheetTitle className="text-lg font-bold text-slate-800">{selectedProgram.name}</SheetTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{selectedProgram.sector}</Badge>
                    <span className="text-xs text-slate-500">PM: {selectedProgram.programManager}</span>
                  </div>
                </SheetHeader>

                <div className="mt-4 space-y-4">
                  {/* Overall Status */}
                  <div className={`p-4 rounded-lg border ${getStatusBgLight(selectedProgram.overallHealth.status)}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-500">Overall Health</p>
                        <p className={`text-xl font-bold ${getStatusText(selectedProgram.overallHealth.status)}`}>
                          {selectedProgram.overallHealth.value}
                        </p>
                      </div>
                      <div className={`p-3 rounded-full ${getStatusColor(selectedProgram.overallHealth.status)}`}>
                        {selectedProgram.overallHealth.status === "green" && <CheckCircle className="w-6 h-6 text-white" />}
                        {selectedProgram.overallHealth.status === "yellow" && <AlertTriangle className="w-6 h-6 text-white" />}
                        {selectedProgram.overallHealth.status === "red" && <XCircle className="w-6 h-6 text-white" />}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 mt-2">{selectedProgram.overallHealth.reason}</p>
                  </div>

                  {/* Executive Summary */}
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Executive Summary</p>
                    <p className="text-sm text-slate-700">{selectedProgram.executiveSummary}</p>
                  </div>

                  {/* Top Issues */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-2">Top Issues</p>
                    <ul className="space-y-1">
                      {selectedProgram.topIssues.map((issue, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="text-red-400 mt-0.5">•</span>
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Top Actions */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-2">Top Actions Underway</p>
                    <ul className="space-y-1">
                      {selectedProgram.topActions.map((action, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="text-blue-400 mt-0.5">•</span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Metric Details */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-2">Metric Details</p>
                    <div className="space-y-2">
                      {metricColumns.slice(1).map(col => {
                        const metric = getMetricValue(selectedProgram, col.key)
                        return (
                          <div key={col.key} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded ${getStatusColor(metric.status)}`} />
                              <span className="text-sm text-slate-700">{col.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-800">{metric.value}</span>
                              <span className="text-slate-400">{getTrendIcon(metric.trend)}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Next Review */}
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-600">Next Review Date</p>
                    <p className="text-sm font-medium text-blue-800">{selectedProgram.nextReviewDate}</p>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* Metric Detail Drawer - for individual cell clicks */}
        <Sheet open={metricDrawerOpen} onOpenChange={setMetricDrawerOpen}>
          <SheetContent className="w-[700px] sm:max-w-[700px] overflow-y-auto">
            {selectedMetric && (() => {
              const metric = getMetricValue(selectedMetric.program, selectedMetric.metricKey as MetricKey)
              const program = selectedMetric.program
              const metricKey = selectedMetric.metricKey
              
              // Generate weekly data based on metric status (12 weeks)
              const generateWeeklyData = () => {
                const weeks = []
                const baseDate = new Date()
                const isRed = metric.status === "red"
                const isYellow = metric.status === "yellow"
                
                for (let i = 11; i >= 0; i--) {
                  const weekDate = new Date(baseDate)
                  weekDate.setDate(weekDate.getDate() - (i * 7))
                  const weekLabel = `W${12 - i}`
                  
                  // Generate data that reflects the current status
                  // If red, show degradation over recent weeks
                  // If yellow, show some volatility
                  // If green, show consistently good performance
                  
                  let weekStatus: "green" | "yellow" | "red" = "green"
                  if (isRed) {
                    weekStatus = i < 4 ? "red" : i < 7 ? "yellow" : "green"
                  } else if (isYellow) {
                    weekStatus = i < 3 ? "yellow" : i === 5 || i === 8 ? "yellow" : "green"
                  }
                  
                  weeks.push({
                    week: weekLabel,
                    date: weekDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                    status: weekStatus,
                    // OTD specific
                    onTime: isRed ? 70 + Math.floor(Math.random() * 10) - (11 - i) * 2 : isYellow ? 85 + Math.floor(Math.random() * 8) : 92 + Math.floor(Math.random() * 6),
                    atRisk: isRed ? 15 + Math.floor(Math.random() * 5) : isYellow ? 8 + Math.floor(Math.random() * 4) : 3 + Math.floor(Math.random() * 3),
                    late: isRed ? 10 + Math.floor(Math.random() * 8) : isYellow ? 4 + Math.floor(Math.random() * 3) : Math.floor(Math.random() * 2),
                    totalJobs: 45 + Math.floor(Math.random() * 15),
                    // Supply specific
                    demand: 100 + Math.floor(Math.random() * 20),
                    supply: isRed ? 75 + Math.floor(Math.random() * 15) : isYellow ? 90 + Math.floor(Math.random() * 10) : 100 + Math.floor(Math.random() * 15),
                    shortfall: isRed ? 15 + Math.floor(Math.random() * 10) : isYellow ? 5 + Math.floor(Math.random() * 5) : 0,
                    constrainedParts: isRed ? 8 + Math.floor(Math.random() * 5) : isYellow ? 3 + Math.floor(Math.random() * 3) : Math.floor(Math.random() * 2),
                    // Cost specific
                    planned: 2500000 + Math.floor(Math.random() * 500000),
                    actual: isRed ? 2800000 + Math.floor(Math.random() * 400000) + (11 - i) * 50000 : isYellow ? 2600000 + Math.floor(Math.random() * 300000) : 2450000 + Math.floor(Math.random() * 200000),
                    variance: isRed ? 200000 + (11 - i) * 30000 : isYellow ? 80000 + Math.floor(Math.random() * 50000) : -20000 + Math.floor(Math.random() * 40000),
                    // Quality specific
                    defects: isRed ? 12 + Math.floor(Math.random() * 8) : isYellow ? 5 + Math.floor(Math.random() * 4) : 1 + Math.floor(Math.random() * 2),
                    escapes: isRed ? 3 + Math.floor(Math.random() * 3) : isYellow ? 1 + Math.floor(Math.random() * 2) : 0,
                    fpy: isRed ? 82 + Math.floor(Math.random() * 5) : isYellow ? 90 + Math.floor(Math.random() * 4) : 96 + Math.floor(Math.random() * 3),
                    // Safety specific
                    incidents: isRed ? 2 + Math.floor(Math.random() * 2) : isYellow ? Math.floor(Math.random() * 2) : 0,
                    nearMisses: isRed ? 5 + Math.floor(Math.random() * 4) : isYellow ? 2 + Math.floor(Math.random() * 3) : Math.floor(Math.random() * 2),
                    overdueActions: isRed ? 8 + Math.floor(Math.random() * 5) : isYellow ? 3 + Math.floor(Math.random() * 3) : Math.floor(Math.random() * 2),
                    // Schedule specific
                    plannedCompletions: 20 + Math.floor(Math.random() * 10),
                    actualCompletions: isRed ? 12 + Math.floor(Math.random() * 5) : isYellow ? 17 + Math.floor(Math.random() * 4) : 19 + Math.floor(Math.random() * 5),
                    slippedJobs: isRed ? 6 + Math.floor(Math.random() * 4) : isYellow ? 2 + Math.floor(Math.random() * 3) : Math.floor(Math.random() * 2),
                    avgSlipDays: isRed ? 8 + Math.floor(Math.random() * 5) : isYellow ? 3 + Math.floor(Math.random() * 3) : Math.floor(Math.random() * 2),
                    // Margin specific
                    revenue: 3500000 + Math.floor(Math.random() * 500000),
                    cost: isRed ? 3400000 + Math.floor(Math.random() * 400000) : isYellow ? 3200000 + Math.floor(Math.random() * 300000) : 3000000 + Math.floor(Math.random() * 200000),
                    margin: isRed ? 2 + Math.floor(Math.random() * 3) : isYellow ? 6 + Math.floor(Math.random() * 3) : 12 + Math.floor(Math.random() * 4),
                    // Customer specific
                    escalations: isRed ? 3 + Math.floor(Math.random() * 2) : isYellow ? 1 + Math.floor(Math.random() * 2) : 0,
                    complaints: isRed ? 5 + Math.floor(Math.random() * 3) : isYellow ? 2 + Math.floor(Math.random() * 2) : Math.floor(Math.random() * 1),
                    missedCommitments: isRed ? 4 + Math.floor(Math.random() * 3) : isYellow ? 1 + Math.floor(Math.random() * 2) : 0,
                    // Risk specific
                    openRisks: isRed ? 18 + Math.floor(Math.random() * 8) : isYellow ? 10 + Math.floor(Math.random() * 5) : 4 + Math.floor(Math.random() * 3),
                    highSeverity: isRed ? 6 + Math.floor(Math.random() * 4) : isYellow ? 2 + Math.floor(Math.random() * 2) : Math.floor(Math.random() * 1),
                    exposure: isRed ? 2500000 + Math.floor(Math.random() * 1000000) : isYellow ? 1000000 + Math.floor(Math.random() * 500000) : 300000 + Math.floor(Math.random() * 200000),
                    // Staffing specific
                    required: 120 + Math.floor(Math.random() * 20),
                    available: isRed ? 95 + Math.floor(Math.random() * 10) : isYellow ? 110 + Math.floor(Math.random() * 10) : 118 + Math.floor(Math.random() * 10),
                    overtime: isRed ? 25 + Math.floor(Math.random() * 10) : isYellow ? 12 + Math.floor(Math.random() * 8) : 5 + Math.floor(Math.random() * 5),
                    vacancies: isRed ? 12 + Math.floor(Math.random() * 5) : isYellow ? 5 + Math.floor(Math.random() * 3) : 2 + Math.floor(Math.random() * 2),
                    // Cash specific
                    workingCapital: isRed ? 8500000 + Math.floor(Math.random() * 2000000) : isYellow ? 6000000 + Math.floor(Math.random() * 1500000) : 4000000 + Math.floor(Math.random() * 1000000),
                    inventory: isRed ? 4500000 + Math.floor(Math.random() * 1000000) : isYellow ? 3000000 + Math.floor(Math.random() * 800000) : 2000000 + Math.floor(Math.random() * 500000),
                    wip: isRed ? 2500000 + Math.floor(Math.random() * 800000) : isYellow ? 1800000 + Math.floor(Math.random() * 500000) : 1200000 + Math.floor(Math.random() * 300000),
                    receivables: isRed ? 1500000 + Math.floor(Math.random() * 500000) : isYellow ? 1200000 + Math.floor(Math.random() * 400000) : 800000 + Math.floor(Math.random() * 300000),
                  })
                }
                return weeks
              }
              
              const weeklyData = generateWeeklyData()
              
              // Get owner based on metric type
              const getOwner = (): string => {
                const owners: Record<string, string> = {
                  otd: "Operations Director",
                  costVariance: "Finance Controller",
                  quality: "Quality Manager",
                  safety: "EHS Director",
                  supplyStability: "Supply Chain Director",
                  scheduleAdherence: "Program Manager",
                  margin: "Finance Controller",
                  customerHealth: "Account Director",
                  riskBurndown: "Risk Manager",
                  staffing: "HR Business Partner",
                  cash: "Finance Controller",
                  overallHealth: "Program Manager"
                }
                return owners[metricKey] || "Program Manager"
              }
              
              // Get issue summary based on metric and status
              const getIssueSummary = (): string => {
                if (metric.status === "green") return "Performance is on track with no significant issues."
                
                const summaries: Record<string, Record<string, string>> = {
                  otd: {
                    red: "Critical delivery failures impacting customer commitments. Multiple jobs late with cascading schedule impacts.",
                    yellow: "Some delivery slippage observed. Proactive measures in place to prevent further degradation."
                  },
                  supplyStability: {
                    red: "Significant supply constraints across multiple parts. Production at risk due to material shortages.",
                    yellow: "Minor supply concerns with select components. Mitigation plans being executed."
                  },
                  costVariance: {
                    red: "Cost overruns exceeding thresholds. Material and labor variances driving negative performance.",
                    yellow: "Cost trending above plan. Close monitoring and corrective actions in progress."
                  },
                  quality: {
                    red: "Quality issues impacting production. Elevated defect rates requiring intervention.",
                    yellow: "Quality metrics slightly below target. Root cause analysis underway."
                  },
                  safety: {
                    red: "Safety incidents above acceptable levels. Immediate corrective actions required.",
                    yellow: "Safety near-misses trending up. Enhanced vigilance and training in progress."
                  },
                  scheduleAdherence: {
                    red: "Schedule slippage impacting milestones. Recovery plan being developed.",
                    yellow: "Minor schedule variance. Acceleration options being evaluated."
                  },
                  margin: {
                    red: "Margin erosion threatening program profitability. Cost reduction initiatives critical.",
                    yellow: "Margin compression observed. Pricing and cost actions in review."
                  },
                  customerHealth: {
                    red: "Customer escalations at critical level. Executive engagement required.",
                    yellow: "Customer concerns emerging. Account team addressing issues."
                  },
                  riskBurndown: {
                    red: "Risk exposure elevated with insufficient burndown. War room established.",
                    yellow: "Risk burndown behind schedule. Additional mitigation focus needed."
                  },
                  staffing: {
                    red: "Critical staffing gaps impacting operations. Urgent hiring and reallocation needed.",
                    yellow: "Resource constraints in select areas. Cross-training and hiring in progress."
                  },
                  cash: {
                    red: "Working capital stretched. Inventory and receivables optimization critical.",
                    yellow: "Cash position tight. Collections and inventory focus areas."
                  }
                }
                
                return summaries[metricKey]?.[metric.status] || "Performance requires attention."
              }
              
              const formatCurrency = (value: number) => `$${(value / 1000000).toFixed(1)}M`
              const formatK = (value: number) => value >= 1000 ? `$${(value / 1000).toFixed(0)}K` : `$${value}`
              
              return (
                <>
                  <SheetHeader className="pb-4 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded ${getStatusColor(metric.status)}`} />
                      <SheetTitle className="text-lg font-bold text-slate-800">{selectedMetric.metricLabel}</SheetTitle>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{program.name} - {program.sector}</p>
                  </SheetHeader>

                  <div className="mt-4 space-y-6">
                    {/* A. Executive Summary Section */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-1">Executive Summary</h3>
                      
                      {/* Status Card */}
                      <div className={`p-4 rounded-lg border ${getStatusBgLight(metric.status)}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-slate-500">Current Status</p>
                            <p className={`text-xl font-bold ${getStatusText(metric.status)}`}>
                              {metric.status === "green" ? "On Track" : metric.status === "yellow" ? "Watch" : "At Risk"}
                            </p>
                          </div>
                          <div className={`p-3 rounded-full ${getStatusColor(metric.status)}`}>
                            {metric.status === "green" && <CheckCircle className="w-6 h-6 text-white" />}
                            {metric.status === "yellow" && <AlertTriangle className="w-6 h-6 text-white" />}
                            {metric.status === "red" && <XCircle className="w-6 h-6 text-white" />}
                          </div>
                        </div>
                      </div>

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2 bg-slate-50 rounded-lg">
                          <p className="text-[10px] text-slate-500">Actual</p>
                          <p className="text-sm font-bold text-slate-800">{metric.value}</p>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg">
                          <p className="text-[10px] text-slate-500">Target</p>
                          <p className="text-sm font-bold text-slate-800">{metric.threshold}</p>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg">
                          <p className="text-[10px] text-slate-500">Trend</p>
                          <div className="flex items-center gap-1">
                            {metric.trend === "up" && <TrendingUp className="w-4 h-4 text-slate-600" />}
                            {metric.trend === "down" && <TrendingDown className="w-4 h-4 text-slate-600" />}
                            {metric.trend === "flat" && <Minus className="w-4 h-4 text-slate-400" />}
                            <span className="text-xs text-slate-600">{metric.trend === "up" ? "Up" : metric.trend === "down" ? "Down" : "Flat"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Issue Summary */}
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">Issue Summary</p>
                        <p className="text-sm text-slate-700">{getIssueSummary()}</p>
                      </div>

                      {/* Owner & Review */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-slate-50 rounded-lg">
                          <p className="text-[10px] text-slate-500">Owner</p>
                          <p className="text-xs font-medium text-slate-800">{getOwner()}</p>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <p className="text-[10px] text-blue-600">Next Review</p>
                          <p className="text-xs font-medium text-blue-800">{program.nextReviewDate}</p>
                        </div>
                      </div>
                    </div>

                    {/* B. Weekly Time View Section */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-1">Weekly Trend (Last 12 Weeks)</h3>
                      
                      {/* Weekly R/Y/G Status Strip */}
                      <div className="flex gap-1">
                        {weeklyData.map((week, i) => (
                          <Tooltip key={i}>
                            <TooltipTrigger asChild>
                              <div 
                                className={`flex-1 h-6 rounded-sm ${
                                  week.status === "green" ? "bg-emerald-500" : 
                                  week.status === "yellow" ? "bg-amber-500" : "bg-red-500"
                                } flex items-center justify-center`}
                              >
                                <span className="text-[8px] text-white font-medium">{week.week}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              <p className="font-medium">{week.date}</p>
                              <p className={week.status === "green" ? "text-emerald-600" : week.status === "yellow" ? "text-amber-600" : "text-red-600"}>
                                {week.status === "green" ? "On Track" : week.status === "yellow" ? "Watch" : "At Risk"}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>

                      {/* Metric-Specific Weekly Chart */}
                      <div className="h-[180px] border border-slate-200 rounded-lg p-3">
                        {/* OTD Weekly View */}
                        {metricKey === "otd" && (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 20, left: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis dataKey="week" tick={{ fontSize: 9 }} />
                              <YAxis tick={{ fontSize: 9 }} />
                              <RechartsTooltip 
                                contentStyle={{ fontSize: 11 }}
                                formatter={(value: number, name: string) => [value, name === "onTime" ? "On Time" : name === "atRisk" ? "At Risk" : "Late"]}
                              />
                              <Bar dataKey="onTime" stackId="a" fill="#10b981" name="On Time" />
                              <Bar dataKey="atRisk" stackId="a" fill="#f59e0b" name="At Risk" />
                              <Bar dataKey="late" stackId="a" fill="#ef4444" name="Late" />
                            </BarChart>
                          </ResponsiveContainer>
                        )}

                        {/* Supply Stability Weekly View */}
                        {metricKey === "supplyStability" && (
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 20, left: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis dataKey="week" tick={{ fontSize: 9 }} />
                              <YAxis tick={{ fontSize: 9 }} />
                              <RechartsTooltip contentStyle={{ fontSize: 11 }} />
                              <Bar dataKey="demand" fill="#3b82f6" name="Demand" />
                              <Bar dataKey="supply" fill="#10b981" name="Supply" />
                              <Line type="monotone" dataKey="shortfall" stroke="#ef4444" strokeWidth={2} name="Shortfall" dot={{ r: 3 }} />
                            </ComposedChart>
                          </ResponsiveContainer>
                        )}

                        {/* Cost Variance Weekly View */}
                        {metricKey === "costVariance" && (
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 20, left: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis dataKey="week" tick={{ fontSize: 9 }} />
                              <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `$${(v/1000000).toFixed(1)}M`} />
                              <RechartsTooltip contentStyle={{ fontSize: 11 }} formatter={(value: number) => formatCurrency(value)} />
                              <Bar dataKey="planned" fill="#94a3b8" name="Planned" />
                              <Bar dataKey="actual" fill={metric.status === "red" ? "#ef4444" : metric.status === "yellow" ? "#f59e0b" : "#10b981"} name="Actual" />
                            </ComposedChart>
                          </ResponsiveContainer>
                        )}

                        {/* Quality Weekly View */}
                        {metricKey === "quality" && (
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 20, left: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis dataKey="week" tick={{ fontSize: 9 }} />
                              <YAxis yAxisId="left" tick={{ fontSize: 9 }} />
                              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} domain={[70, 100]} />
                              <RechartsTooltip contentStyle={{ fontSize: 11 }} />
                              <Bar yAxisId="left" dataKey="defects" fill="#ef4444" name="Defects" />
                              <Bar yAxisId="left" dataKey="escapes" fill="#f59e0b" name="Escapes" />
                              <Line yAxisId="right" type="monotone" dataKey="fpy" stroke="#10b981" strokeWidth={2} name="FPY %" dot={{ r: 3 }} />
                            </ComposedChart>
                          </ResponsiveContainer>
                        )}

                        {/* Safety Weekly View */}
                        {metricKey === "safety" && (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 20, left: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis dataKey="week" tick={{ fontSize: 9 }} />
                              <YAxis tick={{ fontSize: 9 }} />
                              <RechartsTooltip contentStyle={{ fontSize: 11 }} />
                              <Bar dataKey="incidents" fill="#ef4444" name="Incidents" />
                              <Bar dataKey="nearMisses" fill="#f59e0b" name="Near Misses" />
                              <Bar dataKey="overdueActions" fill="#94a3b8" name="Overdue Actions" />
                            </BarChart>
                          </ResponsiveContainer>
                        )}

                        {/* Schedule Adherence Weekly View */}
                        {metricKey === "scheduleAdherence" && (
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 20, left: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis dataKey="week" tick={{ fontSize: 9 }} />
                              <YAxis tick={{ fontSize: 9 }} />
                              <RechartsTooltip contentStyle={{ fontSize: 11 }} />
                              <Bar dataKey="plannedCompletions" fill="#94a3b8" name="Planned" />
                              <Bar dataKey="actualCompletions" fill="#3b82f6" name="Actual" />
                              <Line type="monotone" dataKey="slippedJobs" stroke="#ef4444" strokeWidth={2} name="Slipped" dot={{ r: 3 }} />
                            </ComposedChart>
                          </ResponsiveContainer>
                        )}

                        {/* Margin Weekly View */}
                        {metricKey === "margin" && (
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 20, left: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis dataKey="week" tick={{ fontSize: 9 }} />
                              <YAxis yAxisId="left" tick={{ fontSize: 9 }} tickFormatter={(v) => `$${(v/1000000).toFixed(1)}M`} />
                              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} domain={[0, 20]} />
                              <RechartsTooltip contentStyle={{ fontSize: 11 }} />
                              <Area yAxisId="left" type="monotone" dataKey="revenue" fill="#e0f2fe" stroke="#3b82f6" name="Revenue" />
                              <Area yAxisId="left" type="monotone" dataKey="cost" fill="#fecaca" stroke="#ef4444" name="Cost" />
                              <Line yAxisId="right" type="monotone" dataKey="margin" stroke="#10b981" strokeWidth={2} name="Margin %" dot={{ r: 3 }} />
                            </ComposedChart>
                          </ResponsiveContainer>
                        )}

                        {/* Customer Health Weekly View */}
                        {metricKey === "customerHealth" && (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 20, left: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis dataKey="week" tick={{ fontSize: 9 }} />
                              <YAxis tick={{ fontSize: 9 }} />
                              <RechartsTooltip contentStyle={{ fontSize: 11 }} />
                              <Bar dataKey="escalations" fill="#ef4444" name="Escalations" />
                              <Bar dataKey="complaints" fill="#f59e0b" name="Complaints" />
                              <Bar dataKey="missedCommitments" fill="#94a3b8" name="Missed Commitments" />
                            </BarChart>
                          </ResponsiveContainer>
                        )}

                        {/* Risk Burndown Weekly View */}
                        {metricKey === "riskBurndown" && (
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 20, left: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis dataKey="week" tick={{ fontSize: 9 }} />
                              <YAxis yAxisId="left" tick={{ fontSize: 9 }} />
                              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} tickFormatter={(v) => `$${(v/1000000).toFixed(1)}M`} />
                              <RechartsTooltip contentStyle={{ fontSize: 11 }} />
                              <Bar yAxisId="left" dataKey="openRisks" fill="#3b82f6" name="Open Risks" />
                              <Bar yAxisId="left" dataKey="highSeverity" fill="#ef4444" name="High Severity" />
                              <Line yAxisId="right" type="monotone" dataKey="exposure" stroke="#f59e0b" strokeWidth={2} name="Exposure $" dot={{ r: 3 }} />
                            </ComposedChart>
                          </ResponsiveContainer>
                        )}

                        {/* Staffing Weekly View */}
                        {metricKey === "staffing" && (
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 20, left: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis dataKey="week" tick={{ fontSize: 9 }} />
                              <YAxis tick={{ fontSize: 9 }} />
                              <RechartsTooltip contentStyle={{ fontSize: 11 }} />
                              <Bar dataKey="required" fill="#94a3b8" name="Required" />
                              <Bar dataKey="available" fill="#3b82f6" name="Available" />
                              <Line type="monotone" dataKey="overtime" stroke="#f59e0b" strokeWidth={2} name="Overtime %" dot={{ r: 3 }} />
                            </ComposedChart>
                          </ResponsiveContainer>
                        )}

                        {/* Cash Weekly View */}
                        {metricKey === "cash" && (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 20, left: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis dataKey="week" tick={{ fontSize: 9 }} />
                              <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `$${(v/1000000).toFixed(1)}M`} />
                              <RechartsTooltip contentStyle={{ fontSize: 11 }} formatter={(value: number) => formatCurrency(value)} />
                              <Area type="monotone" dataKey="inventory" stackId="1" fill="#3b82f6" stroke="#3b82f6" name="Inventory" />
                              <Area type="monotone" dataKey="wip" stackId="1" fill="#f59e0b" stroke="#f59e0b" name="WIP" />
                              <Area type="monotone" dataKey="receivables" stackId="1" fill="#10b981" stroke="#10b981" name="Receivables" />
                            </AreaChart>
                          </ResponsiveContainer>
                        )}

                        {/* Overall Health - Composite View */}
                        {metricKey === "overallHealth" && (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 20, left: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis dataKey="week" tick={{ fontSize: 9 }} />
                              <YAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                              <RechartsTooltip contentStyle={{ fontSize: 11 }} />
                              <Line type="monotone" dataKey="onTime" stroke="#3b82f6" strokeWidth={2} name="OTD %" dot={{ r: 2 }} />
                              <Line type="monotone" dataKey="fpy" stroke="#10b981" strokeWidth={2} name="Quality %" dot={{ r: 2 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                    {/* C. Diagnostic / Driver Section */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-1">Root Cause Analysis</h3>
                      
                      {/* OTD Diagnostics */}
                      {metricKey === "otd" && (
                        <div className="space-y-3">
                          {/* Late Reasons Breakdown */}
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs font-medium text-slate-600 mb-2">Late Delivery Reasons</p>
                            <div className="space-y-2">
                              {[
                                { reason: "Supplier delays", pct: 42, count: 8 },
                                { reason: "Capacity constraints", pct: 28, count: 5 },
                                { reason: "Quality rework", pct: 18, count: 3 },
                                { reason: "Material shortage", pct: 12, count: 2 }
                              ].map((item, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <div className="w-24 text-xs text-slate-600">{item.reason}</div>
                                  <div className="flex-1 h-4 bg-slate-200 rounded overflow-hidden">
                                    <div className="h-full bg-red-500" style={{ width: `${item.pct}%` }} />
                                  </div>
                                  <span className="text-xs text-slate-500 w-16 text-right">{item.pct}% ({item.count})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Top Slipped Work Orders */}
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs font-medium text-slate-600 mb-2">Top Slipped Work Orders</p>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-slate-200">
                                  <th className="text-left py-1 text-slate-500">WO #</th>
                                  <th className="text-left py-1 text-slate-500">Item</th>
                                  <th className="text-right py-1 text-slate-500">Days Late</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[
                                  { wo: "WO-4521", item: "Actuator Assembly", days: 12 },
                                  { wo: "WO-4533", item: "Hydraulic Pump", days: 8 },
                                  { wo: "WO-4547", item: "Control Module", days: 6 },
                                  { wo: "WO-4552", item: "Sensor Array", days: 4 }
                                ].map((item, i) => (
                                  <tr key={i} className="border-b border-slate-100">
                                    <td className="py-1.5 font-mono text-blue-600">{item.wo}</td>
                                    <td className="py-1.5 text-slate-700">{item.item}</td>
                                    <td className="py-1.5 text-right text-red-600 font-medium">{item.days}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Supply Stability Diagnostics */}
                      {metricKey === "supplyStability" && (
                        <div className="space-y-3">
                          {/* Constrained Parts Table */}
                          <div className="p-3 bg-slate-50 rounded-lg overflow-x-auto">
                            <p className="text-xs font-medium text-slate-600 mb-2">Top Constrained Parts</p>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-slate-200">
                                  <th className="text-left py-1 text-slate-500">Part</th>
                                  <th className="text-right py-1 text-slate-500">Demand</th>
                                  <th className="text-right py-1 text-slate-500">Supply</th>
                                  <th className="text-right py-1 text-slate-500">Gap</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[
                                  { part: "MCU-7742", demand: 120, supply: 85, gap: -35 },
                                  { part: "SEN-8821", demand: 200, supply: 160, gap: -40 },
                                  { part: "CAP-3310", demand: 500, supply: 420, gap: -80 },
                                  { part: "RES-1120", demand: 1000, supply: 850, gap: -150 }
                                ].map((item, i) => (
                                  <tr key={i} className="border-b border-slate-100">
                                    <td className="py-1.5 font-mono text-blue-600">{item.part}</td>
                                    <td className="py-1.5 text-right">{item.demand}</td>
                                    <td className="py-1.5 text-right">{item.supply}</td>
                                    <td className={`py-1.5 text-right font-medium ${item.gap < 0 ? "text-red-600 bg-red-50" : "text-slate-600"}`}>{item.gap}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          
                          {/* Supply Risk Factors */}
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs font-medium text-slate-600 mb-2">Supply Risk Factors</p>
                            <div className="space-y-1.5">
                              {[
                                { factor: "Single-source dependency", severity: "High", count: 4 },
                                { factor: "Lead time extension", severity: "Medium", count: 7 },
                                { factor: "Supplier capacity", severity: "High", count: 3 },
                                { factor: "Quality issues", severity: "Low", count: 2 }
                              ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between py-1">
                                  <span className="text-xs text-slate-700">{item.factor}</span>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                      item.severity === "High" ? "bg-red-100 text-red-700" : 
                                      item.severity === "Medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                                    }`}>{item.severity}</span>
                                    <span className="text-xs text-slate-500">{item.count} parts</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Cost Variance Diagnostics */}
                      {metricKey === "costVariance" && (
                        <div className="space-y-3">
                          {/* Variance Breakdown */}
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs font-medium text-slate-600 mb-2">Variance Breakdown</p>
                            <div className="space-y-2">
                              {[
                                { category: "Material cost increase", value: 180000, pct: 45 },
                                { category: "Labor inefficiency", value: 80000, pct: 20 },
                                { category: "Expedite / freight", value: 60000, pct: 15 },
                                { category: "Scrap / rework", value: 50000, pct: 12 },
                                { category: "Change impact", value: 30000, pct: 8 }
                              ].map((item, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <div className="w-32 text-xs text-slate-600">{item.category}</div>
                                  <div className="flex-1 h-4 bg-slate-200 rounded overflow-hidden">
                                    <div className="h-full bg-red-500" style={{ width: `${item.pct}%` }} />
                                  </div>
                                  <span className="text-xs text-slate-500 w-20 text-right">{formatK(item.value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Top Cost Drivers */}
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs font-medium text-slate-600 mb-2">Top Cost Drivers</p>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-slate-200">
                                  <th className="text-left py-1 text-slate-500">Item</th>
                                  <th className="text-right py-1 text-slate-500">Variance</th>
                                  <th className="text-right py-1 text-slate-500">% of Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[
                                  { item: "Titanium alloy stock", variance: 95000, pct: 24 },
                                  { item: "Assembly labor", variance: 55000, pct: 14 },
                                  { item: "Expedite shipping", variance: 42000, pct: 11 },
                                  { item: "Sensor components", variance: 38000, pct: 10 }
                                ].map((item, i) => (
                                  <tr key={i} className="border-b border-slate-100">
                                    <td className="py-1.5 text-slate-700">{item.item}</td>
                                    <td className="py-1.5 text-right text-red-600 font-medium">{formatK(item.variance)}</td>
                                    <td className="py-1.5 text-right text-slate-500">{item.pct}%</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Quality Diagnostics */}
                      {metricKey === "quality" && (
                        <div className="space-y-3">
                          {/* Top Defect Categories - Pareto style */}
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs font-medium text-slate-600 mb-2">Top Defect Categories</p>
                            <div className="space-y-2">
                              {[
                                { category: "Dimensional out-of-spec", count: 18, pct: 35 },
                                { category: "Surface finish", count: 12, pct: 23 },
                                { category: "Assembly error", count: 9, pct: 17 },
                                { category: "Material defect", count: 7, pct: 13 },
                                { category: "Other", count: 6, pct: 12 }
                              ].map((item, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <div className="w-32 text-xs text-slate-600">{item.category}</div>
                                  <div className="flex-1 h-4 bg-slate-200 rounded overflow-hidden">
                                    <div className="h-full bg-amber-500" style={{ width: `${item.pct}%` }} />
                                  </div>
                                  <span className="text-xs text-slate-500 w-16 text-right">{item.count} ({item.pct}%)</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Defect Source Locations */}
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs font-medium text-slate-600 mb-2">Defect Source Locations</p>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-slate-200">
                                  <th className="text-left py-1 text-slate-500">Work Center</th>
                                  <th className="text-right py-1 text-slate-500">Defects</th>
                                  <th className="text-right py-1 text-slate-500">FPY</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[
                                  { wc: "CNC Machining", defects: 15, fpy: "82%" },
                                  { wc: "Final Assembly", defects: 12, fpy: "88%" },
                                  { wc: "Welding", defects: 8, fpy: "91%" },
                                  { wc: "Inspection", defects: 5, fpy: "95%" }
                                ].map((item, i) => (
                                  <tr key={i} className="border-b border-slate-100">
                                    <td className="py-1.5 text-slate-700">{item.wc}</td>
                                    <td className="py-1.5 text-right text-red-600 font-medium">{item.defects}</td>
                                    <td className="py-1.5 text-right text-slate-500">{item.fpy}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Safety Diagnostics */}
                      {metricKey === "safety" && (
                        <div className="space-y-3">
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs font-medium text-slate-600 mb-2">Incident Breakdown</p>
                            <div className="space-y-2">
                              {[
                                { category: "Ergonomic strain", count: 3, severity: "Medium" },
                                { category: "Slip / trip / fall", count: 2, severity: "Low" },
                                { category: "Equipment contact", count: 1, severity: "High" },
                                { category: "Chemical exposure", count: 1, severity: "Medium" }
                              ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between py-1">
                                  <span className="text-xs text-slate-700">{item.category}</span>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                      item.severity === "High" ? "bg-red-100 text-red-700" : 
                                      item.severity === "Medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                                    }`}>{item.severity}</span>
                                    <span className="text-xs font-medium text-slate-600">{item.count}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs font-medium text-slate-600 mb-2">Overdue Safety Actions</p>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-slate-200">
                                  <th className="text-left py-1 text-slate-500">Action</th>
                                  <th className="text-right py-1 text-slate-500">Days Overdue</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[
                                  { action: "Guardrail installation - Line 3", days: 15 },
                                  { action: "Lockout/tagout training refresh", days: 8 },
                                  { action: "PPE inspection - Welding area", days: 5 }
                                ].map((item, i) => (
                                  <tr key={i} className="border-b border-slate-100">
                                    <td className="py-1.5 text-slate-700">{item.action}</td>
                                    <td className="py-1.5 text-right text-red-600 font-medium">{item.days}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Schedule Adherence Diagnostics */}
                      {metricKey === "scheduleAdherence" && (
                        <div className="space-y-3">
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs font-medium text-slate-600 mb-2">Top Missed Milestones</p>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-slate-200">
                                  <th className="text-left py-1 text-slate-500">Milestone</th>
                                  <th className="text-right py-1 text-slate-500">Slip (days)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[
                                  { milestone: "Unit 15 Final Assembly", slip: 14 },
                                  { milestone: "Subassembly 22B Complete", slip: 10 },
                                  { milestone: "Test & Validation Unit 14", slip: 7 },
                                  { milestone: "Integration Milestone 3", slip: 5 }
                                ].map((item, i) => (
                                  <tr key={i} className="border-b border-slate-100">
                                    <td className="py-1.5 text-slate-700">{item.milestone}</td>
                                    <td className="py-1.5 text-right text-red-600 font-medium">{item.slip}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs font-medium text-slate-600 mb-2">Bottleneck Work Centers</p>
                            <div className="space-y-1.5">
                              {[
                                { wc: "Final Assembly", utilization: "112%", constraint: "Labor shortage" },
                                { wc: "CNC Machining", utilization: "98%", constraint: "Machine downtime" },
                                { wc: "Test Cell", utilization: "95%", constraint: "Equipment capacity" }
                              ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between py-1">
                                  <span className="text-xs text-slate-700">{item.wc}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-amber-600">{item.utilization}</span>
                                    <span className="text-[10px] text-slate-500">{item.constraint}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Margin Diagnostics */}
                      {metricKey === "margin" && (
                        <div className="space-y-3">
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs font-medium text-slate-600 mb-2">Margin Erosion Drivers</p>
                            <div className="space-y-2">
                              {[
                                { driver: "Material cost increase", impact: -180000, pct: 40 },
                                { driver: "Labor inefficiency", impact: -90000, pct: 20 },
                                { driver: "Expedite costs", impact: -70000, pct: 16 },
                                { driver: "Mix shift", impact: -55000, pct: 12 },
                                { driver: "Volume shortfall", impact: -50000, pct: 12 }
                              ].map((item, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <div className="w-32 text-xs text-slate-600">{item.driver}</div>
                                  <div className="flex-1 h-4 bg-slate-200 rounded overflow-hidden">
                                    <div className="h-full bg-red-500" style={{ width: `${item.pct}%` }} />
                                  </div>
                                  <span className="text-xs text-red-600 w-20 text-right">{formatK(item.impact)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Customer Health Diagnostics */}
                      {metricKey === "customerHealth" && (
                        <div className="space-y-3">
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs font-medium text-slate-600 mb-2">Open Escalations</p>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-slate-200">
                                  <th className="text-left py-1 text-slate-500">Issue</th>
                                  <th className="text-right py-1 text-slate-500">Age (days)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[
                                  { issue: "Delivery delay - Order 4521", age: 21 },
                                  { issue: "Quality issue - Lot 887", age: 14 },
                                  { issue: "Documentation incomplete", age: 7 }
                                ].map((item, i) => (
                                  <tr key={i} className="border-b border-slate-100">
                                    <td className="py-1.5 text-slate-700">{item.issue}</td>
                                    <td className="py-1.5 text-right text-red-600 font-medium">{item.age}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs font-medium text-slate-600 mb-2">Escalation Categories</p>
                            <div className="space-y-2">
                              {[
                                { category: "Delivery", count: 5, pct: 45 },
                                { category: "Quality", count: 3, pct: 27 },
                                { category: "Communication", count: 2, pct: 18 },
                                { category: "Pricing", count: 1, pct: 10 }
                              ].map((item, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <div className="w-24 text-xs text-slate-600">{item.category}</div>
                                  <div className="flex-1 h-4 bg-slate-200 rounded overflow-hidden">
                                    <div className="h-full bg-amber-500" style={{ width: `${item.pct}%` }} />
                                  </div>
                                  <span className="text-xs text-slate-500 w-16 text-right">{item.count} ({item.pct}%)</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Risk Burndown Diagnostics */}
                      {metricKey === "riskBurndown" && (
                        <div className="space-y-3">
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs font-medium text-slate-600 mb-2">Risk by Severity</p>
                            <div className="flex gap-3">
                              <div className="flex-1 p-2 bg-red-50 rounded text-center">
                                <p className="text-lg font-bold text-red-600">6</p>
                                <p className="text-[10px] text-red-500">High</p>
                              </div>
                              <div className="flex-1 p-2 bg-amber-50 rounded text-center">
                                <p className="text-lg font-bold text-amber-600">8</p>
                                <p className="text-[10px] text-amber-500">Medium</p>
                              </div>
                              <div className="flex-1 p-2 bg-slate-100 rounded text-center">
                                <p className="text-lg font-bold text-slate-600">4</p>
                                <p className="text-[10px] text-slate-500">Low</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs font-medium text-slate-600 mb-2">Top Open Risks</p>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-slate-200">
                                  <th className="text-left py-1 text-slate-500">Risk</th>
                                  <th className="text-right py-1 text-slate-500">Exposure</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[
                                  { risk: "Supplier bankruptcy - MCU parts", exposure: 850000 },
                                  { risk: "Schedule slip - Unit 18", exposure: 620000 },
                                  { risk: "Cost overrun - Labor", exposure: 450000 },
                                  { risk: "Quality escape - Field", exposure: 380000 }
                                ].map((item, i) => (
                                  <tr key={i} className="border-b border-slate-100">
                                    <td className="py-1.5 text-slate-700">{item.risk}</td>
                                    <td className="py-1.5 text-right text-red-600 font-medium">{formatK(item.exposure)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Staffing Diagnostics */}
                      {metricKey === "staffing" && (
                        <div className="space-y-3">
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs font-medium text-slate-600 mb-2">Critical Skill Gaps</p>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-slate-200">
                                  <th className="text-left py-1 text-slate-500">Skill</th>
                                  <th className="text-right py-1 text-slate-500">Gap</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[
                                  { skill: "CNC Machinist", gap: 5 },
                                  { skill: "Quality Inspector", gap: 3 },
                                  { skill: "Test Technician", gap: 2 },
                                  { skill: "Welder (Certified)", gap: 2 }
                                ].map((item, i) => (
                                  <tr key={i} className="border-b border-slate-100">
                                    <td className="py-1.5 text-slate-700">{item.skill}</td>
                                    <td className="py-1.5 text-right text-red-600 font-medium">-{item.gap}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs font-medium text-slate-600 mb-2">Overloaded Teams</p>
                            <div className="space-y-1.5">
                              {[
                                { team: "Final Assembly", overtime: "32%", utilization: "118%" },
                                { team: "Test & Validation", overtime: "25%", utilization: "108%" },
                                { team: "CNC Shop", overtime: "20%", utilization: "105%" }
                              ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between py-1">
                                  <span className="text-xs text-slate-700">{item.team}</span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-amber-600">OT: {item.overtime}</span>
                                    <span className="text-xs text-red-600">{item.utilization}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Cash Diagnostics */}
                      {metricKey === "cash" && (
                        <div className="space-y-3">
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs font-medium text-slate-600 mb-2">Working Capital Breakdown</p>
                            <div className="space-y-2">
                              {[
                                { category: "Raw material inventory", value: 2800000, pct: 35 },
                                { category: "Work in progress", value: 2200000, pct: 28 },
                                { category: "Finished goods", value: 1500000, pct: 19 },
                                { category: "Receivables > 60 days", value: 1400000, pct: 18 }
                              ].map((item, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <div className="w-36 text-xs text-slate-600">{item.category}</div>
                                  <div className="flex-1 h-4 bg-slate-200 rounded overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: `${item.pct}%` }} />
                                  </div>
                                  <span className="text-xs text-slate-500 w-16 text-right">{formatCurrency(item.value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs font-medium text-slate-600 mb-2">Excess / Aged Items</p>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-slate-200">
                                  <th className="text-left py-1 text-slate-500">Item</th>
                                  <th className="text-right py-1 text-slate-500">Value</th>
                                  <th className="text-right py-1 text-slate-500">Age</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[
                                  { item: "Excess titanium stock", value: 450000, age: "120+ days" },
                                  { item: "Aged WIP - Unit 12", value: 320000, age: "90+ days" },
                                  { item: "Obsolete sensors", value: 180000, age: "180+ days" }
                                ].map((item, i) => (
                                  <tr key={i} className="border-b border-slate-100">
                                    <td className="py-1.5 text-slate-700">{item.item}</td>
                                    <td className="py-1.5 text-right text-amber-600 font-medium">{formatK(item.value)}</td>
                                    <td className="py-1.5 text-right text-slate-500">{item.age}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Overall Health - Composite Diagnostics */}
                      {metricKey === "overallHealth" && (
                        <div className="space-y-3">
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs font-medium text-slate-600 mb-2">Health Score Components</p>
                            <div className="space-y-2">
                              {[
                                { metric: "OTD", score: metric.status === "red" ? 65 : metric.status === "yellow" ? 78 : 92, weight: "20%" },
                                { metric: "Cost", score: metric.status === "red" ? 58 : metric.status === "yellow" ? 75 : 88, weight: "20%" },
                                { metric: "Quality", score: metric.status === "red" ? 72 : metric.status === "yellow" ? 82 : 95, weight: "15%" },
                                { metric: "Schedule", score: metric.status === "red" ? 60 : metric.status === "yellow" ? 76 : 90, weight: "15%" },
                                { metric: "Supply", score: metric.status === "red" ? 55 : metric.status === "yellow" ? 70 : 88, weight: "15%" },
                                { metric: "Risk", score: metric.status === "red" ? 50 : metric.status === "yellow" ? 68 : 85, weight: "15%" }
                              ].map((item, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <div className="w-16 text-xs text-slate-600">{item.metric}</div>
                                  <div className="flex-1 h-4 bg-slate-200 rounded overflow-hidden">
                                    <div 
                                      className={`h-full ${item.score >= 85 ? "bg-emerald-500" : item.score >= 70 ? "bg-amber-500" : "bg-red-500"}`} 
                                      style={{ width: `${item.score}%` }} 
                                    />
                                  </div>
                                  <span className="text-xs text-slate-500 w-8 text-right">{item.score}</span>
                                  <span className="text-[10px] text-slate-400 w-8">{item.weight}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )
            })()}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  )
}
