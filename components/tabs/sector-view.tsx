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

interface Program {
  id: string
  name: string
  sector: string
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

// Mock data generator
const generateMockPrograms = (): Program[] => {
  const programs: Program[] = [
    {
      id: "PRG-001",
      name: "Program Alpha",
      sector: "Defense Systems",
      programManager: "J. Martinez",
      overallHealth: { status: "green", value: "On Track", threshold: "All metrics green/yellow", trend: "flat", reason: "Strong performance across all metrics" },
      otd: { status: "green", value: "97.2%", threshold: ">=95%", trend: "up", reason: "OTD improved 1.2% vs prior month" },
      costVariance: { status: "green", value: "+0.3%", threshold: "±1%", trend: "flat", reason: "Cost within target range" },
      quality: { status: "green", value: "0.8 DPM", threshold: "<2 DPM", trend: "down", reason: "Defect rate improving" },
      safety: { status: "green", value: "0 incidents", threshold: "0 recordables", trend: "flat", reason: "No safety concerns" },
      supplyStability: { status: "green", value: "Stable", threshold: "No critical disruptions", trend: "flat", reason: "All suppliers performing" },
      scheduleAdherence: { status: "green", value: "On Plan", threshold: "No slip", trend: "flat", reason: "Schedule maintained" },
      margin: { status: "green", value: "+2.1%", threshold: ">=0%", trend: "up", reason: "Margin expanding" },
      customerHealth: { status: "green", value: "Normal", threshold: "No escalations", trend: "flat", reason: "Customer satisfied" },
      riskBurndown: { status: "green", value: "-12%", threshold: "Decreasing", trend: "down", reason: "Risks being retired" },
      staffing: { status: "green", value: "98%", threshold: ">=95%", trend: "flat", reason: "Fully staffed" },
      cash: { status: "green", value: "On Target", threshold: "Within plan", trend: "flat", reason: "Working capital healthy" },
      topIssues: ["Minor tooling wear on Line 3", "Pending ECO approval"],
      topActions: ["Tooling replacement scheduled", "ECO review meeting Thursday"],
      executiveSummary: "Program Alpha continues to perform strongly across all dimensions. No executive intervention required.",
      nextReviewDate: "2024-02-15"
    },
    {
      id: "PRG-002",
      name: "Program Bravo",
      sector: "Avionics",
      programManager: "S. Chen",
      overallHealth: { status: "green", value: "On Track", threshold: "All metrics green/yellow", trend: "up", reason: "Continuous improvement trend" },
      otd: { status: "green", value: "96.8%", threshold: ">=95%", trend: "up", reason: "OTD above target" },
      costVariance: { status: "yellow", value: "+2.4%", threshold: "±1%", trend: "up", reason: "Material cost pressure, monitoring" },
      quality: { status: "green", value: "1.2 DPM", threshold: "<2 DPM", trend: "flat", reason: "Quality stable" },
      safety: { status: "green", value: "0 incidents", threshold: "0 recordables", trend: "flat", reason: "Strong safety culture" },
      supplyStability: { status: "green", value: "Stable", threshold: "No critical disruptions", trend: "flat", reason: "Supply chain healthy" },
      scheduleAdherence: { status: "green", value: "On Plan", threshold: "No slip", trend: "flat", reason: "Deliveries on time" },
      margin: { status: "yellow", value: "-0.8%", threshold: ">=0%", trend: "down", reason: "Margin pressure from materials" },
      customerHealth: { status: "green", value: "Normal", threshold: "No escalations", trend: "flat", reason: "Positive feedback received" },
      riskBurndown: { status: "green", value: "-8%", threshold: "Decreasing", trend: "down", reason: "Risk reduction on track" },
      staffing: { status: "green", value: "97%", threshold: ">=95%", trend: "flat", reason: "Team stable" },
      cash: { status: "green", value: "On Target", threshold: "Within plan", trend: "flat", reason: "Cash flow normal" },
      topIssues: ["Material cost increase 3.2%", "Single-source component risk"],
      topActions: ["Alternate supplier qualification", "Price renegotiation in progress"],
      executiveSummary: "Program Bravo delivery strong but experiencing material cost headwinds. Mitigation actions underway.",
      nextReviewDate: "2024-02-12"
    },
    {
      id: "PRG-003",
      name: "Program Falcon",
      sector: "Defense Systems",
      programManager: "R. Thompson",
      overallHealth: { status: "yellow", value: "Watch", threshold: "1-2 yellow metrics", trend: "down", reason: "Supply and schedule concerns emerging" },
      otd: { status: "yellow", value: "92.1%", threshold: ">=95%", trend: "down", reason: "OTD declined due to supply issues" },
      costVariance: { status: "green", value: "+0.7%", threshold: "±1%", trend: "flat", reason: "Cost controlled" },
      quality: { status: "green", value: "1.5 DPM", threshold: "<2 DPM", trend: "flat", reason: "Quality acceptable" },
      safety: { status: "green", value: "0 incidents", threshold: "0 recordables", trend: "flat", reason: "No issues" },
      supplyStability: { status: "yellow", value: "At Risk", threshold: "No critical disruptions", trend: "down", reason: "Key supplier delivery slips" },
      scheduleAdherence: { status: "yellow", value: "Minor Slip", threshold: "No slip", trend: "down", reason: "3-day schedule slip risk" },
      margin: { status: "green", value: "+1.2%", threshold: ">=0%", trend: "flat", reason: "Margin maintained" },
      customerHealth: { status: "green", value: "Normal", threshold: "No escalations", trend: "flat", reason: "Customer aware of risk" },
      riskBurndown: { status: "yellow", value: "+2%", threshold: "Decreasing", trend: "up", reason: "New supply risk added" },
      staffing: { status: "green", value: "96%", threshold: ">=95%", trend: "flat", reason: "Adequate staffing" },
      cash: { status: "green", value: "On Target", threshold: "Within plan", trend: "flat", reason: "Cash normal" },
      topIssues: ["Supplier ABC delivery 5 days late", "Schedule buffer consumed", "Component shortage looming"],
      topActions: ["Expedite POs with ABC", "Recovery plan developed", "Buffer rebuild strategy"],
      executiveSummary: "Program Falcon experiencing supply chain pressure affecting schedule. Recovery actions in place, close monitoring required.",
      nextReviewDate: "2024-02-08"
    },
    {
      id: "PRG-004",
      name: "Program Orion",
      sector: "Space Systems",
      programManager: "A. Patel",
      overallHealth: { status: "red", value: "At Risk", threshold: "Critical metric red", trend: "down", reason: "Multiple red metrics require intervention" },
      otd: { status: "red", value: "84.3%", threshold: ">=95%", trend: "down", reason: "Significant OTD miss, customer impacted" },
      costVariance: { status: "red", value: "+4.8%", threshold: "±1%", trend: "up", reason: "Cost overrun accelerating" },
      quality: { status: "yellow", value: "2.8 DPM", threshold: "<2 DPM", trend: "up", reason: "Quality degradation noted" },
      safety: { status: "green", value: "0 incidents", threshold: "0 recordables", trend: "flat", reason: "Safety maintained" },
      supplyStability: { status: "red", value: "Critical", threshold: "No critical disruptions", trend: "down", reason: "3 critical parts constraining production" },
      scheduleAdherence: { status: "red", value: "Major Slip", threshold: "No slip", trend: "down", reason: "2-week schedule delay" },
      margin: { status: "red", value: "-3.2%", threshold: ">=0%", trend: "down", reason: "Margin erosion significant" },
      customerHealth: { status: "yellow", value: "Escalated", threshold: "No escalations", trend: "down", reason: "Customer VP engaged" },
      riskBurndown: { status: "red", value: "+15%", threshold: "Decreasing", trend: "up", reason: "Risk exposure increasing" },
      staffing: { status: "yellow", value: "88%", threshold: ">=95%", trend: "down", reason: "Key engineer departures" },
      cash: { status: "yellow", value: "Off Plan", threshold: "Within plan", trend: "down", reason: "Working capital strained" },
      topIssues: ["Critical part shortage - 3 SKUs", "Customer escalation active", "Schedule slip 2 weeks", "Cost overrun 4.8%", "2 key engineers resigned"],
      topActions: ["War room established", "Executive supplier calls daily", "Recovery plan v3 in review", "Hiring fast-track approved"],
      executiveSummary: "Program Orion requires immediate executive intervention. Multiple critical issues converging. Recovery plan under revision.",
      nextReviewDate: "2024-02-05"
    },
    {
      id: "PRG-005",
      name: "Program Atlas",
      sector: "Communications",
      programManager: "M. Williams",
      overallHealth: { status: "green", value: "On Track", threshold: "All metrics green/yellow", trend: "up", reason: "Strong execution" },
      otd: { status: "green", value: "98.1%", threshold: ">=95%", trend: "up", reason: "Best-in-class OTD" },
      costVariance: { status: "green", value: "-0.5%", threshold: "±1%", trend: "down", reason: "Under budget" },
      quality: { status: "green", value: "0.5 DPM", threshold: "<2 DPM", trend: "down", reason: "Excellent quality" },
      safety: { status: "green", value: "0 incidents", threshold: "0 recordables", trend: "flat", reason: "Zero incidents" },
      supplyStability: { status: "green", value: "Stable", threshold: "No critical disruptions", trend: "flat", reason: "Dual-sourced key parts" },
      scheduleAdherence: { status: "green", value: "Ahead", threshold: "No slip", trend: "up", reason: "2 days ahead of plan" },
      margin: { status: "green", value: "+3.5%", threshold: ">=0%", trend: "up", reason: "Strong margin performance" },
      customerHealth: { status: "green", value: "Excellent", threshold: "No escalations", trend: "up", reason: "Customer commendation received" },
      riskBurndown: { status: "green", value: "-20%", threshold: "Decreasing", trend: "down", reason: "Aggressive risk retirement" },
      staffing: { status: "green", value: "100%", threshold: ">=95%", trend: "flat", reason: "Full complement" },
      cash: { status: "green", value: "Ahead", threshold: "Within plan", trend: "up", reason: "Strong cash generation" },
      topIssues: ["None critical"],
      topActions: ["Best practice documentation", "Cross-training initiative"],
      executiveSummary: "Program Atlas is a top performer. Consider as benchmark for other programs.",
      nextReviewDate: "2024-02-20"
    },
    {
      id: "PRG-006",
      name: "Program Phoenix",
      sector: "Defense Systems",
      programManager: "K. Johnson",
      overallHealth: { status: "yellow", value: "Watch", threshold: "1-2 yellow metrics", trend: "flat", reason: "Cost concerns need attention" },
      otd: { status: "green", value: "95.5%", threshold: ">=95%", trend: "flat", reason: "OTD at target" },
      costVariance: { status: "yellow", value: "+2.1%", threshold: "±1%", trend: "up", reason: "Labor cost increase" },
      quality: { status: "green", value: "1.8 DPM", threshold: "<2 DPM", trend: "flat", reason: "Quality acceptable" },
      safety: { status: "yellow", value: "Near-miss", threshold: "0 recordables", trend: "down", reason: "Near-miss incident under review" },
      supplyStability: { status: "green", value: "Stable", threshold: "No critical disruptions", trend: "flat", reason: "Supply normal" },
      scheduleAdherence: { status: "green", value: "On Plan", threshold: "No slip", trend: "flat", reason: "On schedule" },
      margin: { status: "yellow", value: "-0.3%", threshold: ">=0%", trend: "down", reason: "Slight margin erosion" },
      customerHealth: { status: "green", value: "Normal", threshold: "No escalations", trend: "flat", reason: "No concerns" },
      riskBurndown: { status: "green", value: "-5%", threshold: "Decreasing", trend: "down", reason: "Risks reducing" },
      staffing: { status: "green", value: "95%", threshold: ">=95%", trend: "flat", reason: "At minimum threshold" },
      cash: { status: "green", value: "On Target", threshold: "Within plan", trend: "flat", reason: "Cash normal" },
      topIssues: ["Labor cost creep", "Safety near-miss investigation", "Margin pressure"],
      topActions: ["Overtime reduction plan", "Safety corrective action", "Cost reduction workshop"],
      executiveSummary: "Program Phoenix operationally sound but experiencing cost pressure. Safety near-miss requires attention.",
      nextReviewDate: "2024-02-14"
    },
    {
      id: "PRG-007",
      name: "Program Triton",
      sector: "Maritime",
      programManager: "L. Garcia",
      overallHealth: { status: "red", value: "At Risk", threshold: "Critical metric red", trend: "down", reason: "Supply crisis driving multiple issues" },
      otd: { status: "red", value: "78.5%", threshold: ">=95%", trend: "down", reason: "Major OTD miss" },
      costVariance: { status: "yellow", value: "+2.8%", threshold: "±1%", trend: "up", reason: "Expedite costs adding up" },
      quality: { status: "green", value: "1.1 DPM", threshold: "<2 DPM", trend: "flat", reason: "Quality maintained despite issues" },
      safety: { status: "green", value: "0 incidents", threshold: "0 recordables", trend: "flat", reason: "Safety OK" },
      supplyStability: { status: "red", value: "Crisis", threshold: "No critical disruptions", trend: "down", reason: "Supplier bankruptcy impacting 12 parts" },
      scheduleAdherence: { status: "red", value: "Critical Slip", threshold: "No slip", trend: "down", reason: "3-week delay confirmed" },
      margin: { status: "yellow", value: "-1.5%", threshold: ">=0%", trend: "down", reason: "Margin eroding from expedites" },
      customerHealth: { status: "red", value: "Critical", threshold: "No escalations", trend: "down", reason: "Customer CEO escalation" },
      riskBurndown: { status: "red", value: "+25%", threshold: "Decreasing", trend: "up", reason: "Major new risks materialized" },
      staffing: { status: "yellow", value: "91%", threshold: ">=95%", trend: "down", reason: "Staff burnout concerns" },
      cash: { status: "yellow", value: "Off Plan", threshold: "Within plan", trend: "down", reason: "Expedite spend impacting cash" },
      topIssues: ["Supplier XYZ bankruptcy", "12 parts without source", "Customer CEO escalation", "3-week schedule slip", "Team burnout risk"],
      topActions: ["Emergency supplier qualification", "Executive customer meeting scheduled", "Temporary staff augmentation", "Recovery plan v2"],
      executiveSummary: "Program Triton in crisis mode due to supplier bankruptcy. Requires immediate executive support and customer management.",
      nextReviewDate: "2024-02-03"
    },
    {
      id: "PRG-008",
      name: "Program Vanguard",
      sector: "Avionics",
      programManager: "D. Brown",
      overallHealth: { status: "green", value: "On Track", threshold: "All metrics green/yellow", trend: "flat", reason: "Steady performance" },
      otd: { status: "green", value: "96.2%", threshold: ">=95%", trend: "flat", reason: "OTD stable" },
      costVariance: { status: "green", value: "+0.2%", threshold: "±1%", trend: "flat", reason: "Cost on target" },
      quality: { status: "green", value: "1.4 DPM", threshold: "<2 DPM", trend: "flat", reason: "Quality good" },
      safety: { status: "green", value: "0 incidents", threshold: "0 recordables", trend: "flat", reason: "No issues" },
      supplyStability: { status: "yellow", value: "Watch", threshold: "No critical disruptions", trend: "down", reason: "One supplier showing stress signs" },
      scheduleAdherence: { status: "green", value: "On Plan", threshold: "No slip", trend: "flat", reason: "On track" },
      margin: { status: "green", value: "+1.8%", threshold: ">=0%", trend: "flat", reason: "Healthy margin" },
      customerHealth: { status: "green", value: "Normal", threshold: "No escalations", trend: "flat", reason: "Relationship good" },
      riskBurndown: { status: "green", value: "-10%", threshold: "Decreasing", trend: "down", reason: "Risks reducing" },
      staffing: { status: "green", value: "97%", threshold: ">=95%", trend: "flat", reason: "Team stable" },
      cash: { status: "green", value: "On Target", threshold: "Within plan", trend: "flat", reason: "Normal" },
      topIssues: ["Supplier DEF showing late patterns"],
      topActions: ["Supplier performance review scheduled", "Backup source evaluation"],
      executiveSummary: "Program Vanguard performing well with minor supply watch item. No intervention needed.",
      nextReviewDate: "2024-02-18"
    },
    {
      id: "PRG-009",
      name: "Program Sentinel",
      sector: "Space Systems",
      programManager: "E. Wilson",
      overallHealth: { status: "yellow", value: "Watch", threshold: "1-2 yellow metrics", trend: "down", reason: "Quality and staffing concerns" },
      otd: { status: "green", value: "95.8%", threshold: ">=95%", trend: "flat", reason: "OTD acceptable" },
      costVariance: { status: "green", value: "+0.9%", threshold: "±1%", trend: "flat", reason: "Cost within range" },
      quality: { status: "yellow", value: "2.5 DPM", threshold: "<2 DPM", trend: "up", reason: "Quality trending wrong direction" },
      safety: { status: "green", value: "0 incidents", threshold: "0 recordables", trend: "flat", reason: "Safe operations" },
      supplyStability: { status: "green", value: "Stable", threshold: "No critical disruptions", trend: "flat", reason: "Supply OK" },
      scheduleAdherence: { status: "green", value: "On Plan", threshold: "No slip", trend: "flat", reason: "Schedule maintained" },
      margin: { status: "green", value: "+1.1%", threshold: ">=0%", trend: "flat", reason: "Margin OK" },
      customerHealth: { status: "yellow", value: "Concerned", threshold: "No escalations", trend: "down", reason: "Customer noted quality concerns" },
      riskBurndown: { status: "yellow", value: "Flat", threshold: "Decreasing", trend: "flat", reason: "Not retiring risks as planned" },
      staffing: { status: "yellow", value: "89%", threshold: ">=95%", trend: "down", reason: "Struggling to fill positions" },
      cash: { status: "green", value: "On Target", threshold: "Within plan", trend: "flat", reason: "Cash OK" },
      topIssues: ["Quality trend degrading", "Customer quality concern voiced", "3 open positions unfilled"],
      topActions: ["Root cause analysis on quality", "Customer quality review meeting", "Accelerated hiring"],
      executiveSummary: "Program Sentinel showing quality degradation trend. Customer has noticed. Staffing gaps may be contributing factor.",
      nextReviewDate: "2024-02-10"
    },
    {
      id: "PRG-010",
      name: "Program Horizon",
      sector: "Communications",
      programManager: "T. Anderson",
      overallHealth: { status: "green", value: "On Track", threshold: "All metrics green/yellow", trend: "up", reason: "Improving trajectory" },
      otd: { status: "green", value: "97.5%", threshold: ">=95%", trend: "up", reason: "OTD improving" },
      costVariance: { status: "green", value: "-0.8%", threshold: "±1%", trend: "down", reason: "Cost savings realized" },
      quality: { status: "green", value: "0.9 DPM", threshold: "<2 DPM", trend: "down", reason: "Quality excellent" },
      safety: { status: "green", value: "0 incidents", threshold: "0 recordables", trend: "flat", reason: "Zero incidents" },
      supplyStability: { status: "green", value: "Stable", threshold: "No critical disruptions", trend: "flat", reason: "Supply healthy" },
      scheduleAdherence: { status: "green", value: "On Plan", threshold: "No slip", trend: "flat", reason: "On schedule" },
      margin: { status: "green", value: "+2.8%", threshold: ">=0%", trend: "up", reason: "Margin expanding" },
      customerHealth: { status: "green", value: "Excellent", threshold: "No escalations", trend: "up", reason: "Customer very satisfied" },
      riskBurndown: { status: "green", value: "-15%", threshold: "Decreasing", trend: "down", reason: "Strong risk management" },
      staffing: { status: "green", value: "99%", threshold: ">=95%", trend: "flat", reason: "Fully staffed" },
      cash: { status: "green", value: "Ahead", threshold: "Within plan", trend: "up", reason: "Strong cash position" },
      topIssues: ["None significant"],
      topActions: ["Continuous improvement initiatives", "Knowledge transfer to other programs"],
      executiveSummary: "Program Horizon is high performing. Strong candidate for best practice sharing.",
      nextReviewDate: "2024-02-22"
    }
  ]
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
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [pmFilter, setPmFilter] = useState<string>("all")
  const [showOnlyIssues, setShowOnlyIssues] = useState(false)
  const [sortWorstFirst, setSortWorstFirst] = useState(false)
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const programs = useMemo(() => generateMockPrograms(), [])

  // Get unique values for filters
  const sectors = useMemo(() => [...new Set(programs.map(p => p.sector))], [programs])
  const programManagers = useMemo(() => [...new Set(programs.map(p => p.programManager))], [programs])

  // Filter and sort programs
  const filteredPrograms = useMemo(() => {
    let result = programs.filter(p => {
      if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
      if (sectorFilter !== "all" && p.sector !== sectorFilter) return false
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
  }, [programs, searchTerm, sectorFilter, statusFilter, pmFilter, showOnlyIssues, sortWorstFirst])

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
        <div className="grid grid-cols-6 gap-3">
          <Card className="border-slate-200">
            <CardContent className="p-3">
              <p className="text-xs text-slate-500">Total Programs</p>
              <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="p-3">
              <p className="text-xs text-emerald-600">Programs Green</p>
              <p className="text-2xl font-bold text-emerald-700">{stats.green}</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-3">
              <p className="text-xs text-amber-600">Programs Yellow</p>
              <p className="text-2xl font-bold text-amber-700">{stats.yellow}</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="p-3">
              <p className="text-xs text-red-600">Programs Red</p>
              <p className="text-2xl font-bold text-red-700">{stats.red}</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="p-3">
              <p className="text-xs text-slate-500">Worsening Trend</p>
              <p className="text-2xl font-bold text-slate-800">{stats.worsening}</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50">
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
                    <th className="sticky left-0 z-20 bg-slate-50 text-left p-3 font-semibold text-slate-700 min-w-[180px] border-r border-slate-200">
                      Program
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
                        <div className="font-medium text-slate-800">{program.name}</div>
                        <div className="text-xs text-slate-500">{program.sector} • {program.programManager}</div>
                      </td>
                      {metricColumns.map(col => {
                        const metric = getMetricValue(program, col.key)
                        return (
                          <td key={col.key} className="p-1.5 text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded ${getStatusColor(metric.status)} text-white text-xs font-medium min-w-[50px]`}>
                                  {getTrendIcon(metric.trend)}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[220px]">
                                <div className="text-xs space-y-1">
                                  <p className="font-semibold">{col.label}: {metric.value}</p>
                                  <p className="text-slate-400">Threshold: {metric.threshold}</p>
                                  <p>{metric.reason}</p>
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
      </div>
    </TooltipProvider>
  )
}
