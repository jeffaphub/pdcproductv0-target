"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { 
  RefreshCw, Download, Share2, Filter, AlertTriangle, Clock, Target, 
  TrendingUp, TrendingDown, Layers, ChevronRight, Info, CheckCircle, 
  XCircle, Truck, Wrench, Package, Users, DollarSign, Calendar,
  ArrowUpRight, ArrowDownRight, Minus, FileText, AlertCircle, BarChart3,
  Building2, ClipboardList, Gauge, History, ShieldAlert
} from "lucide-react"
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, 
  ResponsiveContainer, Cell, BarChart, Bar, LineChart, Line,
  AreaChart, Area, Legend, Tooltip as RechartsTooltip, PieChart, Pie
} from "recharts"

// ===== TYPES =====
type JobStatus = "Late" | "Forecast-Late"
type PriorityTier = "Critical" | "High" | "Medium" | "Low"
type RootCause = "Supply Shortage" | "Late PR/PO" | "Supplier Slip" | "MRB/RI Hold" | "NC/Quality Hold" | "Routing Readiness" | "Work Instruction" | "Tooling/Cert" | "Capacity Constraint" | "Test Cell Constraint" | "Data/Planning"
type BlockingFunction = "Production Control" | "Supply Chain" | "Quality/MRB" | "Manufacturing Engineering" | "Operations" | "Materials/Inventory"
type BaselineType = "contract" | "iop" | "delivery-plan" | "pdm-forecast" | "worst-case"

interface LateJob {
  id: string
  rank: number
  priorityScore: number
  priorityTier: PriorityTier
  parentAssembly: string
  endItem: string
  program: string
  clin: string
  dpasFlag: boolean
  criticalContract: boolean
  customer: string
  site: string
  valueStream: string
  currentOperation: string
  workcenter: string
  testCell: string | null
  status: JobStatus
  // Separate metrics for late vs forecast-late
  daysLate: number // For Late: positive days missed. For Forecast-Late: use daysToLateRisk
  daysToLateRisk: number // For Forecast-Late: days until predicted miss (positive = time remaining)
  daysLateContract: number
  daysLateIOP: number
  daysLateDeliveryPlan: number
  daysLatePDM: number
  requiredDate: Date
  predictedCompletion: Date
  primaryCause: RootCause
  blockingFunction: BlockingFunction
  rootCauseDetail: string
  revenueImpact: number
  aopImpact: number
  criticalPath: boolean
  fanOut: number
  owner: string
  nextAction: string
  recoveryETA: Date
  lastUpdated: Date
  // Priority decomposition with explainability
  priorityFactors: {
    clinCriticality: number
    dpasVisibility: number
    revenueAOP: number
    criticalPathRole: number
    dueWindowUrgency: number
  }
  priorityExplanation: string // "Why is this job ranked here?"
  // Linked evidence with concrete object types
  linkedPO: string | null
  poPromiseDate: Date | null
  linkedMRB: string | null
  mrbStatus: string | null
  linkedNC: string | null
  ncStatus: string | null
  linkedRI: string | null
  riStatus: string | null
  linkedRouting: string | null
  routingStatus: string | null
  linkedCapacity: string | null
  capacityQueue: number | null
  materialStatus: string
  supplierPromiseDate: Date | null
  supplierSlipDays: number | null
  // Governance tracking
  wasOnProtectList: boolean
  daysVisibleBeforeLate: number | null
  actionTaken: string | null
  actionWorked: boolean | null
}

// Recovery confidence calculation factors
interface RecoveryConfidenceFactors {
  materialAvailability: "Available" | "Partial" | "Blocked"
  supplierReliability: "High" | "Medium" | "Low"
  capacityAvailable: boolean
  timeRemaining: number // days
  openActions: number
  explanation: string
}

interface CLINImpact {
  program: string
  clin: string
  customer: string
  requiredDate: Date
  milestoneType: "Ship" | "Delivery" | "PDR" | "CDR" | "TRR" | "Contractual"
  linkedLateJobs: number
  linkedForecastLateJobs: number
  highestPriority: number
  highestPriorityTier: PriorityTier
  primaryBlocker: RootCause
  revenueAtRisk: number
  dpasFlag: boolean
  recoveryConfidence: "High" | "Medium" | "Low"
  recoveryConfidenceFactors: RecoveryConfidenceFactors
  daysToCommitment: number
}

// Closed-loop governance tracking
interface GovernanceRecord {
  jobId: string
  program: string
  wasOnProtectList: boolean
  daysVisibleBeforeLate: number
  actionTaken: string
  actionWorked: boolean
  rootCause: RootCause
  impactSeverity: "Critical" | "High" | "Medium" | "Low"
  lessonsLearned: string
}

// ===== CONSTANTS =====
const COLORS = {
  primary: "#1e3a5f",
  critical: "#dc2626",
  high: "#f59e0b",
  medium: "#3b82f6",
  low: "#6b7280",
  positive: "#16a34a",
  negative: "#dc2626",
  supply: "#8b5cf6",
  quality: "#ec4899",
  capacity: "#f97316",
  routing: "#06b6d4"
}

const ROOT_CAUSE_COLORS: Record<RootCause, string> = {
  "Supply Shortage": "#8b5cf6",
  "Late PR/PO": "#7c3aed",
  "Supplier Slip": "#6366f1",
  "MRB/RI Hold": "#ec4899",
  "NC/Quality Hold": "#db2777",
  "Routing Readiness": "#06b6d4",
  "Work Instruction": "#0891b2",
  "Tooling/Cert": "#0d9488",
  "Capacity Constraint": "#f97316",
  "Test Cell Constraint": "#ea580c",
  "Data/Planning": "#6b7280"
}

const programs = ["F-35 Lightning II", "AH-64E Apache", "CH-47F Chinook", "UH-60M Black Hawk", "V-22 Osprey"]
const customers = ["USAF", "US Army", "US Navy", "FMS - UK", "FMS - Japan", "FMS - Australia"]
const sites = ["Mesa, AZ", "Fort Worth, TX", "Stratford, CT", "Philadelphia, PA"]
const valueStreams = ["Fuselage", "Avionics", "Propulsion", "Landing Gear", "Structures"]
const workcenters = ["Assembly A1", "Assembly A2", "Machining M1", "Composites C1", "Integration I1", "Paint P1"]
const testCells = ["Functional Test 1", "Structural Test 2", "Avionics Test 3", "Integration Test 4", null]

// ===== HELPER FUNCTIONS =====
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })
}

// ===== DATA GENERATION =====
function generatePriorityExplanation(job: Partial<LateJob>): string {
  const reasons: string[] = []
  if (job.dpasFlag) reasons.push("DPAS-rated contract")
  if (job.criticalPath) reasons.push("on critical path")
  if ((job.revenueImpact || 0) > 3000000) reasons.push(`high revenue impact (${formatCurrency(job.revenueImpact || 0)})`)
  if ((job.fanOut || 0) > 5) reasons.push(`${job.fanOut} downstream assemblies dependent`)
  if ((job.daysLate || 0) > 20) reasons.push("severely late")
  if ((job.daysToLateRisk || 0) < 5 && job.status === "Forecast-Late") reasons.push("imminent miss risk")
  return reasons.length > 0 ? `Prioritized due to: ${reasons.join(", ")}` : "Standard prioritization based on combined factors"
}

function generateLateJobs(): LateJob[] {
  const jobs: LateJob[] = []
  const rootCauses: RootCause[] = ["Supply Shortage", "Late PR/PO", "Supplier Slip", "MRB/RI Hold", "NC/Quality Hold", "Routing Readiness", "Work Instruction", "Tooling/Cert", "Capacity Constraint", "Test Cell Constraint", "Data/Planning"]
  const blockingFunctions: BlockingFunction[] = ["Production Control", "Supply Chain", "Quality/MRB", "Manufacturing Engineering", "Operations", "Materials/Inventory"]
  
  for (let i = 0; i < 150; i++) {
    const seed = i * 7919
    const status: JobStatus = seededRandom(seed) > 0.4 ? "Late" : "Forecast-Late"
    // Clear distinction: daysLate for Late jobs, daysToLateRisk for Forecast-Late jobs
    const daysLate = status === "Late" ? Math.floor(seededRandom(seed + 1) * 45) + 1 : 0
    const daysToLateRisk = status === "Forecast-Late" ? Math.floor(seededRandom(seed + 1) * 14) + 1 : 0
    const daysLateContract = status === "Late" ? daysLate : -daysToLateRisk
    const priorityScore = Math.floor(seededRandom(seed + 2) * 100)
    const priorityTier: PriorityTier = priorityScore >= 85 ? "Critical" : priorityScore >= 65 ? "High" : priorityScore >= 40 ? "Medium" : "Low"
    const dpasFlag = seededRandom(seed + 3) > 0.7
    const criticalContract = dpasFlag || seededRandom(seed + 4) > 0.6
    const revenueImpact = (seededRandom(seed + 5) * 5 + 0.5) * 1000000
    const criticalPath = seededRandom(seed + 23) > 0.6
    const fanOut = Math.floor(seededRandom(seed + 24) * 8) + 1
    
    const primaryCause = rootCauses[Math.floor(seededRandom(seed + 6) * rootCauses.length)]
    let blockingFunction: BlockingFunction
    if (["Supply Shortage", "Late PR/PO", "Supplier Slip"].includes(primaryCause)) {
      blockingFunction = "Supply Chain"
    } else if (["MRB/RI Hold", "NC/Quality Hold"].includes(primaryCause)) {
      blockingFunction = "Quality/MRB"
    } else if (["Routing Readiness", "Work Instruction", "Tooling/Cert"].includes(primaryCause)) {
      blockingFunction = "Manufacturing Engineering"
    } else if (["Capacity Constraint", "Test Cell Constraint"].includes(primaryCause)) {
      blockingFunction = "Operations"
    } else {
      blockingFunction = blockingFunctions[Math.floor(seededRandom(seed + 7) * blockingFunctions.length)]
    }
    
    const partialJob: Partial<LateJob> = {
      status,
      dpasFlag,
      criticalPath,
      revenueImpact,
      fanOut,
      daysLate,
      daysToLateRisk
    }
    
    const supplierSlipDays = ["Supply Shortage", "Supplier Slip"].includes(primaryCause) ? Math.floor(seededRandom(seed + 50) * 10) + 1 : null
    
    jobs.push({
      id: `WO-${2024}-${String(1000 + i).padStart(5, "0")}`,
      rank: i + 1,
      priorityScore,
      priorityTier,
      parentAssembly: `ASM-${Math.floor(seededRandom(seed + 8) * 50) + 100}`,
      endItem: `EI-${Math.floor(seededRandom(seed + 9) * 20) + 1}`,
      program: programs[Math.floor(seededRandom(seed + 10) * programs.length)],
      clin: `CLIN-${String(Math.floor(seededRandom(seed + 11) * 99) + 1).padStart(3, "0")}`,
      dpasFlag,
      criticalContract,
      customer: customers[Math.floor(seededRandom(seed + 12) * customers.length)],
      site: sites[Math.floor(seededRandom(seed + 13) * sites.length)],
      valueStream: valueStreams[Math.floor(seededRandom(seed + 14) * valueStreams.length)],
      currentOperation: `OP-${Math.floor(seededRandom(seed + 15) * 50) + 10}`,
      workcenter: workcenters[Math.floor(seededRandom(seed + 16) * workcenters.length)],
      testCell: testCells[Math.floor(seededRandom(seed + 17) * testCells.length)],
      status,
      daysLate,
      daysToLateRisk,
      daysLateContract,
      daysLateIOP: daysLateContract + Math.floor(seededRandom(seed + 18) * 5) - 2,
      daysLateDeliveryPlan: daysLateContract + Math.floor(seededRandom(seed + 19) * 7) - 3,
      daysLatePDM: daysLateContract + Math.floor(seededRandom(seed + 20) * 10) - 5,
      requiredDate: new Date(Date.now() + (status === "Late" ? -daysLate : daysToLateRisk) * 86400000),
      predictedCompletion: new Date(Date.now() + Math.floor(seededRandom(seed + 21) * 30) * 86400000),
      primaryCause,
      blockingFunction,
      rootCauseDetail: generateRootCauseDetail(primaryCause, seed),
      revenueImpact,
      aopImpact: revenueImpact * (0.3 + seededRandom(seed + 22) * 0.2),
      criticalPath,
      fanOut,
      owner: ["J. Smith", "M. Johnson", "R. Williams", "S. Davis", "A. Martinez", "K. Thompson"][Math.floor(seededRandom(seed + 25) * 6)],
      nextAction: generateNextAction(primaryCause, seed),
      recoveryETA: new Date(Date.now() + Math.floor(seededRandom(seed + 26) * 21 + 3) * 86400000),
      lastUpdated: new Date(Date.now() - Math.floor(seededRandom(seed + 27) * 48) * 3600000),
      priorityFactors: {
        clinCriticality: Math.floor(seededRandom(seed + 28) * 30) + 10,
        dpasVisibility: dpasFlag ? 25 : Math.floor(seededRandom(seed + 29) * 10),
        revenueAOP: Math.floor(seededRandom(seed + 30) * 25) + 5,
        criticalPathRole: criticalPath ? 20 : Math.floor(seededRandom(seed + 31) * 10),
        dueWindowUrgency: Math.min(30, Math.max(5, 30 - Math.abs(daysLateContract)))
      },
      priorityExplanation: generatePriorityExplanation(partialJob),
      linkedPO: seededRandom(seed + 32) > 0.3 ? `PO-${2024}-${Math.floor(seededRandom(seed + 33) * 9000) + 1000}` : null,
      poPromiseDate: seededRandom(seed + 32) > 0.3 ? new Date(Date.now() + Math.floor(seededRandom(seed + 40) * 14) * 86400000) : null,
      linkedMRB: ["MRB/RI Hold", "NC/Quality Hold"].includes(primaryCause) ? `MRB-${Math.floor(seededRandom(seed + 34) * 500) + 100}` : null,
      mrbStatus: ["MRB/RI Hold", "NC/Quality Hold"].includes(primaryCause) ? ["Awaiting Disposition", "In Review", "Pending Engineering"][Math.floor(seededRandom(seed + 41) * 3)] : null,
      linkedNC: primaryCause === "NC/Quality Hold" ? `NC-${Math.floor(seededRandom(seed + 35) * 300) + 100}` : null,
      ncStatus: primaryCause === "NC/Quality Hold" ? ["Open", "Investigation", "Corrective Action"][Math.floor(seededRandom(seed + 42) * 3)] : null,
      linkedRI: primaryCause === "MRB/RI Hold" ? `RI-${Math.floor(seededRandom(seed + 36) * 200) + 50}` : null,
      riStatus: primaryCause === "MRB/RI Hold" ? ["Queued", "In Progress", "Awaiting Approval"][Math.floor(seededRandom(seed + 43) * 3)] : null,
      linkedRouting: ["Routing Readiness", "Work Instruction"].includes(primaryCause) ? `RTG-${Math.floor(seededRandom(seed + 44) * 100) + 1}` : null,
      routingStatus: ["Routing Readiness", "Work Instruction"].includes(primaryCause) ? ["Not Released", "Pending Approval", "Engineering Hold"][Math.floor(seededRandom(seed + 45) * 3)] : null,
      linkedCapacity: ["Capacity Constraint", "Test Cell Constraint"].includes(primaryCause) ? workcenters[Math.floor(seededRandom(seed + 46) * workcenters.length)] : null,
      capacityQueue: ["Capacity Constraint", "Test Cell Constraint"].includes(primaryCause) ? Math.floor(seededRandom(seed + 47) * 8) + 1 : null,
      materialStatus: ["Available", "Partial", "Pending", "On Order", "In Transit"][Math.floor(seededRandom(seed + 37) * 5)],
      supplierPromiseDate: seededRandom(seed + 38) > 0.4 ? new Date(Date.now() + Math.floor(seededRandom(seed + 39) * 14) * 86400000) : null,
      supplierSlipDays,
      wasOnProtectList: seededRandom(seed + 48) > 0.3,
      daysVisibleBeforeLate: status === "Late" && seededRandom(seed + 48) > 0.3 ? Math.floor(seededRandom(seed + 49) * 14) + 1 : null,
      actionTaken: seededRandom(seed + 48) > 0.3 ? ["Expedited", "Escalated", "Alternate source", "Overtime scheduled"][Math.floor(seededRandom(seed + 51) * 4)] : null,
      actionWorked: seededRandom(seed + 48) > 0.3 ? seededRandom(seed + 52) > 0.4 : null
    })
  }
  
  return jobs.sort((a, b) => b.priorityScore - a.priorityScore).map((j, i) => ({ ...j, rank: i + 1 }))
}

function generateRootCauseDetail(cause: RootCause, seed: number): string {
  const details: Record<RootCause, string[]> = {
    "Supply Shortage": ["Critical component stock-out", "Long-lead item not received", "Supplier allocation issue"],
    "Late PR/PO": ["PR approval delayed", "PO not released to supplier", "Contract negotiation pending"],
    "Supplier Slip": ["Supplier missed promise date", "Quality reject at supplier", "Supplier capacity issue"],
    "MRB/RI Hold": ["Awaiting MRB disposition", "RI inspection queue", "Documentation review pending"],
    "NC/Quality Hold": ["Non-conformance investigation", "Quality hold pending review", "Corrective action required"],
    "Routing Readiness": ["Routing not released", "Process change pending", "Engineering review required"],
    "Work Instruction": ["WI update required", "Procedure revision pending", "Training requirement"],
    "Tooling/Cert": ["Tool certification expired", "Calibration required", "Special tooling unavailable"],
    "Capacity Constraint": ["Workcenter overloaded", "Resource conflict", "Overtime required"],
    "Test Cell Constraint": ["Test cell fully booked", "Test equipment down", "Certification pending"],
    "Data/Planning": ["Schedule data error", "BOM discrepancy", "Planning system update"]
  }
  return details[cause][Math.floor(seededRandom(seed + 100) * details[cause].length)]
}

function generateNextAction(cause: RootCause, seed: number): string {
  const actions: Record<RootCause, string[]> = {
    "Supply Shortage": ["Expedite with supplier", "Find alternate source", "Escalate to MPM"],
    "Late PR/PO": ["Release PO immediately", "Escalate PR approval", "Contact buyer"],
    "Supplier Slip": ["Expedite shipment", "Escalate to supplier exec", "Arrange air freight"],
    "MRB/RI Hold": ["Disposition MRB", "Complete RI inspection", "Obtain engineering waiver"],
    "NC/Quality Hold": ["Complete NC investigation", "Implement corrective action", "Quality review meeting"],
    "Routing Readiness": ["Release routing", "Approve process change", "Complete engineering review"],
    "Work Instruction": ["Update work instruction", "Approve procedure revision", "Complete training"],
    "Tooling/Cert": ["Recertify tooling", "Complete calibration", "Obtain replacement tool"],
    "Capacity Constraint": ["Schedule overtime", "Reallocate resources", "Prioritize workcenter"],
    "Test Cell Constraint": ["Reschedule test", "Repair test equipment", "Expedite certification"],
    "Data/Planning": ["Correct schedule data", "Update BOM", "Sync planning system"]
  }
  return actions[cause][Math.floor(seededRandom(seed + 200) * actions[cause].length)]
}

function generateCLINImpacts(jobs: LateJob[]): CLINImpact[] {
  const clinMap = new Map<string, CLINImpact>()
  const milestoneTypes: CLINImpact["milestoneType"][] = ["Ship", "Delivery", "PDR", "CDR", "TRR", "Contractual"]
  
  jobs.forEach((job, idx) => {
    const key = `${job.program}-${job.clin}`
    if (!clinMap.has(key)) {
      const daysToCommitment = Math.floor(seededRandom(idx * 113) * 30) + 5
      const materialBlocked = jobs.filter(j => j.clin === job.clin && j.materialStatus !== "Available").length
      const hasSupplierIssues = jobs.some(j => j.clin === job.clin && j.supplierSlipDays && j.supplierSlipDays > 3)
      const hasCapacityIssues = jobs.some(j => j.clin === job.clin && j.capacityQueue && j.capacityQueue > 4)
      
      const recoveryConfidenceFactors: RecoveryConfidenceFactors = {
        materialAvailability: materialBlocked > 2 ? "Blocked" : materialBlocked > 0 ? "Partial" : "Available",
        supplierReliability: hasSupplierIssues ? "Low" : seededRandom(idx * 127) > 0.5 ? "High" : "Medium",
        capacityAvailable: !hasCapacityIssues,
        timeRemaining: daysToCommitment,
        openActions: Math.floor(seededRandom(idx * 131) * 5) + 1,
        explanation: ""
      }
      
      // Build explanation
      const explanationParts: string[] = []
      if (recoveryConfidenceFactors.materialAvailability === "Blocked") explanationParts.push("material blocked")
      if (recoveryConfidenceFactors.supplierReliability === "Low") explanationParts.push("supplier reliability concerns")
      if (!recoveryConfidenceFactors.capacityAvailable) explanationParts.push("capacity constrained")
      if (daysToCommitment < 10) explanationParts.push("limited time remaining")
      recoveryConfidenceFactors.explanation = explanationParts.length > 0 
        ? `Confidence based on: ${explanationParts.join(", ")}`
        : "No major blockers identified"
      
      clinMap.set(key, {
        program: job.program,
        clin: job.clin,
        customer: job.customer,
        requiredDate: job.requiredDate,
        milestoneType: milestoneTypes[Math.floor(seededRandom(idx * 97) * milestoneTypes.length)],
        linkedLateJobs: 0,
        linkedForecastLateJobs: 0,
        highestPriority: 0,
        highestPriorityTier: "Low",
        primaryBlocker: job.primaryCause,
        revenueAtRisk: 0,
        dpasFlag: job.dpasFlag,
        recoveryConfidence: "Medium",
        recoveryConfidenceFactors,
        daysToCommitment
      })
    }
    const impact = clinMap.get(key)!
    if (job.status === "Late") impact.linkedLateJobs++
    else impact.linkedForecastLateJobs++
    impact.highestPriority = Math.max(impact.highestPriority, job.priorityScore)
    impact.highestPriorityTier = impact.highestPriority >= 85 ? "Critical" : impact.highestPriority >= 65 ? "High" : impact.highestPriority >= 40 ? "Medium" : "Low"
    impact.revenueAtRisk += job.revenueImpact
    if (job.dpasFlag) impact.dpasFlag = true
    if (impact.highestPriority >= 85 || impact.recoveryConfidenceFactors.materialAvailability === "Blocked") impact.recoveryConfidence = "Low"
    else if (impact.highestPriority >= 65 || impact.recoveryConfidenceFactors.supplierReliability === "Low") impact.recoveryConfidence = "Medium"
    else impact.recoveryConfidence = "High"
  })
  
  return Array.from(clinMap.values()).sort((a, b) => b.highestPriority - a.highestPriority)
}

function generateGovernanceRecords(): GovernanceRecord[] {
  const records: GovernanceRecord[] = []
  const rootCauses: RootCause[] = ["Supply Shortage", "Late PR/PO", "Supplier Slip", "MRB/RI Hold", "NC/Quality Hold", "Routing Readiness", "Capacity Constraint"]
  
  for (let i = 0; i < 25; i++) {
    const seed = i * 1733
    const wasOnList = seededRandom(seed) > 0.25
    const actionWorked = wasOnList && seededRandom(seed + 1) > 0.35
    
    records.push({
      jobId: `WO-2024-${String(800 + i).padStart(5, "0")}`,
      program: programs[Math.floor(seededRandom(seed + 2) * programs.length)],
      wasOnProtectList: wasOnList,
      daysVisibleBeforeLate: wasOnList ? Math.floor(seededRandom(seed + 3) * 14) + 1 : 0,
      actionTaken: wasOnList ? ["Expedited", "Escalated", "Alternate source", "Overtime scheduled", "Engineering waiver"][Math.floor(seededRandom(seed + 4) * 5)] : "None - not visible",
      actionWorked,
      rootCause: rootCauses[Math.floor(seededRandom(seed + 5) * rootCauses.length)],
      impactSeverity: ["Critical", "High", "Medium", "Low"][Math.floor(seededRandom(seed + 6) * 4)] as GovernanceRecord["impactSeverity"],
      lessonsLearned: actionWorked 
        ? "Early visibility enabled successful recovery"
        : wasOnList 
          ? "Action taken but insufficient time/resources to recover"
          : "Job not visible on protect list - process gap identified"
    })
  }
  
  return records
}

// ===== COMPONENTS =====
function KPICard({ title, value, delta, deltaLabel, icon: Icon, trend, color, tooltip }: {
  title: string
  value: string | number
  delta?: string
  deltaLabel?: string
  icon: React.ElementType
  trend?: "up" | "down" | "neutral"
  color?: string
  tooltip?: string
}) {
  return (
    <Card className="border border-gray-200">
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{title}</p>
              {tooltip && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="p-0.5 hover:bg-gray-100 rounded">
                      <Info className="w-3 h-3 text-gray-400" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs bg-gray-900 text-white p-2 text-xs">
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className={`text-xl font-bold mt-1 ${color || "text-gray-900"}`}>{value}</p>
            {delta && (
              <div className="flex items-center gap-1 mt-0.5">
                {trend === "up" && <ArrowUpRight className="w-3 h-3 text-red-600" />}
                {trend === "down" && <ArrowDownRight className="w-3 h-3 text-green-600" />}
                {trend === "neutral" && <Minus className="w-3 h-3 text-gray-500" />}
                <span className={`text-[10px] font-medium ${trend === "up" ? "text-red-600" : trend === "down" ? "text-green-600" : "text-gray-500"}`}>
                  {delta}
                </span>
                {deltaLabel && <span className="text-[10px] text-gray-400">{deltaLabel}</span>}
              </div>
            )}
          </div>
          <div className={`p-2 rounded-lg ${color ? "bg-opacity-10" : "bg-gray-100"}`} style={{ backgroundColor: color ? `${color}15` : undefined }}>
            <Icon className="w-4 h-4" style={{ color: color || "#6b7280" }} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PriorityBadge({ tier, score }: { tier: PriorityTier; score?: number }) {
  const colors = {
    Critical: "bg-red-100 text-red-800 border-red-300",
    High: "bg-amber-100 text-amber-800 border-amber-300",
    Medium: "bg-blue-100 text-blue-800 border-blue-300",
    Low: "bg-gray-100 text-gray-700 border-gray-300"
  }
  return (
    <Badge className={`text-[10px] font-semibold border ${colors[tier]}`}>
      {tier} {score !== undefined && `(${score})`}
    </Badge>
  )
}

function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <Badge className={`text-[10px] ${status === "Late" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
      {status}
    </Badge>
  )
}

function PriorityDecomposition({ factors }: { factors: LateJob["priorityFactors"] }) {
  const total = Object.values(factors).reduce((a, b) => a + b, 0)
  const items = [
    { label: "CLIN Criticality", value: factors.clinCriticality, color: "#3b82f6" },
    { label: "DPAS/Visibility", value: factors.dpasVisibility, color: "#dc2626" },
    { label: "Revenue/AOP", value: factors.revenueAOP, color: "#16a34a" },
    { label: "Critical Path", value: factors.criticalPathRole, color: "#8b5cf6" },
    { label: "Due Urgency", value: factors.dueWindowUrgency, color: "#f59e0b" }
  ]
  
  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="text-[10px] text-gray-600 w-24">{item.label}</span>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(item.value / total) * 100}%`, backgroundColor: item.color }} />
          </div>
          <span className="text-[10px] font-medium text-gray-700 w-8 text-right">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

// ===== MAIN COMPONENT =====
export function LateJobTracking() {
  // State
  const [activeTab, setActiveTab] = useState<"summary" | "jobs" | "clin" | "rootcause" | "workbench" | "trends">("summary")
  const [selectedRole, setSelectedRole] = useState<string>("All")
  const [selectedSite, setSelectedSite] = useState<string>("All")
  const [selectedProgram, setSelectedProgram] = useState<string>("All")
  const [selectedStatus, setSelectedStatus] = useState<string>("Both")
  const [selectedBaseline, setSelectedBaseline] = useState<BaselineType>("contract")
  const [timeWindow, setTimeWindow] = useState<string>("30")
  const [selectedJob, setSelectedJob] = useState<LateJob | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [workbenchRole, setWorkbenchRole] = useState<string>("production-control")
  // Drill-down filters (from other tabs clicking into the main list)
  const [drillDownCLIN, setDrillDownCLIN] = useState<string | null>(null)
  const [drillDownRootCause, setDrillDownRootCause] = useState<RootCause | null>(null)
  const [drillDownPriorityTier, setDrillDownPriorityTier] = useState<PriorityTier | null>(null)
  
  // Data
  const allJobs = useMemo(() => generateLateJobs(), [])
  const clinImpacts = useMemo(() => generateCLINImpacts(allJobs), [allJobs])
  const governanceRecords = useMemo(() => generateGovernanceRecords(), [])
  
  // Clear drill-down filters when switching tabs (except to jobs tab)
  const navigateToJobsWithFilter = (filter: { clin?: string; rootCause?: RootCause; priorityTier?: PriorityTier }) => {
    setDrillDownCLIN(filter.clin || null)
    setDrillDownRootCause(filter.rootCause || null)
    setDrillDownPriorityTier(filter.priorityTier || null)
    setActiveTab("jobs")
  }
  
  const clearDrillDownFilters = () => {
    setDrillDownCLIN(null)
    setDrillDownRootCause(null)
    setDrillDownPriorityTier(null)
  }
  
  // Filtered jobs with drill-down support
  const filteredJobs = useMemo(() => {
    return allJobs.filter(job => {
      if (selectedSite !== "All" && job.site !== selectedSite) return false
      if (selectedProgram !== "All" && job.program !== selectedProgram) return false
      if (selectedStatus === "Late" && job.status !== "Late") return false
      if (selectedStatus === "Forecast-Late" && job.status !== "Forecast-Late") return false
      // Drill-down filters
      if (drillDownCLIN && job.clin !== drillDownCLIN) return false
      if (drillDownRootCause && job.primaryCause !== drillDownRootCause) return false
      if (drillDownPriorityTier && job.priorityTier !== drillDownPriorityTier) return false
      return true
    })
  }, [allJobs, selectedSite, selectedProgram, selectedStatus, drillDownCLIN, drillDownRootCause, drillDownPriorityTier])
  
  // Computed metrics
  const lateJobCount = filteredJobs.filter(j => j.status === "Late").length
  const forecastLateCount = filteredJobs.filter(j => j.status === "Forecast-Late").length
  const highPriorityCount = filteredJobs.filter(j => j.priorityTier === "Critical" || j.priorityTier === "High").length
  const dpasAtRisk = filteredJobs.filter(j => j.dpasFlag).length
  const supplyBlocked = filteredJobs.filter(j => j.blockingFunction === "Supply Chain").length
  const qualityBlocked = filteredJobs.filter(j => j.blockingFunction === "Quality/MRB").length
  const capacityBlocked = filteredJobs.filter(j => j.blockingFunction === "Operations").length
  const totalRevenueAtRisk = filteredJobs.reduce((sum, j) => sum + j.revenueImpact, 0)
  
  // Scatter data for Priority vs Lateness Matrix
  const scatterData = filteredJobs.slice(0, 60).map(job => ({
    x: Math.abs(job.daysLateContract),
    y: job.priorityScore,
    z: job.revenueImpact / 100000,
    name: job.id,
    status: job.status,
    cause: job.primaryCause,
    tier: job.priorityTier
  }))
  
  // Root cause pareto data
  const rootCauseData = useMemo(() => {
    const causes: Record<RootCause, { count: number; weightedImpact: number }> = {} as any
    filteredJobs.forEach(job => {
      if (!causes[job.primaryCause]) {
        causes[job.primaryCause] = { count: 0, weightedImpact: 0 }
      }
      causes[job.primaryCause].count++
      causes[job.primaryCause].weightedImpact += job.priorityScore * (job.revenueImpact / 1000000)
    })
    return Object.entries(causes)
      .map(([cause, data]) => ({ cause, ...data }))
      .sort((a, b) => b.weightedImpact - a.weightedImpact)
  }, [filteredJobs])
  
  // Blocking function data
  const blockingFunctionData = useMemo(() => {
    const functions: Record<BlockingFunction, { count: number; critical: number; high: number; medium: number; low: number }> = {} as any
    filteredJobs.forEach(job => {
      if (!functions[job.blockingFunction]) {
        functions[job.blockingFunction] = { count: 0, critical: 0, high: 0, medium: 0, low: 0 }
      }
      functions[job.blockingFunction].count++
      functions[job.blockingFunction][job.priorityTier.toLowerCase() as "critical" | "high" | "medium" | "low"]++
    })
    return Object.entries(functions)
      .map(([fn, data]) => ({ function: fn, ...data }))
      .sort((a, b) => b.count - a.count)
  }, [filteredJobs])
  
  // Trend data
  const trendData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      week: `W${i + 1}`,
      late: Math.floor(seededRandom(i * 31) * 30) + 40,
      forecastLate: Math.floor(seededRandom(i * 47) * 25) + 20,
      highPriority: Math.floor(seededRandom(i * 59) * 20) + 15
    }))
  }, [])
  
  const handleSelectJob = (job: LateJob) => {
    setSelectedJob(job)
    setDrawerOpen(true)
  }
  
  const getDaysLateForBaseline = (job: LateJob): number => {
    switch (selectedBaseline) {
      case "contract": return job.daysLateContract
      case "iop": return job.daysLateIOP
      case "delivery-plan": return job.daysLateDeliveryPlan
      case "pdm-forecast": return job.daysLatePDM
      case "worst-case": return Math.max(job.daysLateContract, job.daysLateIOP, job.daysLateDeliveryPlan, job.daysLatePDM)
      default: return job.daysLateContract
    }
  }
  
  // Clearer display: "Days Late" vs "Days to Late Risk"
  const formatDaysDisplay = (job: LateJob): { label: string; value: string; colorClass: string } => {
    if (job.status === "Late") {
      return {
        label: "Days Late",
        value: `+${job.daysLate}`,
        colorClass: "text-red-600"
      }
    } else {
      return {
        label: "Days to Risk",
        value: `${job.daysToLateRisk}d`,
        colorClass: job.daysToLateRisk <= 3 ? "text-red-600" : job.daysToLateRisk <= 7 ? "text-amber-600" : "text-amber-500"
      }
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Late Job Tracking & Prioritization</h1>
              <p className="text-sm text-gray-500">Shared cross-functional ranked view of late and forecast-late jobs</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">Last refresh: {new Date().toLocaleTimeString()}</span>
              <Button variant="outline" size="sm"><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
              <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" /> Export</Button>
              <Button variant="outline" size="sm"><Share2 className="w-4 h-4 mr-1" /> Share</Button>
            </div>
          </div>
          
          {/* Global Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">Filters:</span>
            </div>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                {["All", "Production Control", "PDM/Program", "Supply Chain", "Quality", "Operations"].map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedSite} onValueChange={setSelectedSite}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Site" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Sites</SelectItem>
                {sites.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedProgram} onValueChange={setSelectedProgram}>
              <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Program" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Programs</SelectItem>
                {programs.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Both">Late & Forecast</SelectItem>
                <SelectItem value="Late">Late Only</SelectItem>
                <SelectItem value="Forecast-Late">Forecast-Late</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedBaseline} onValueChange={(v) => setSelectedBaseline(v as BaselineType)}>
              <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Baseline" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="contract">vs Contract/CLIN Date</SelectItem>
                <SelectItem value="iop">vs IOP/ESD</SelectItem>
                <SelectItem value="delivery-plan">vs Delivery Plan</SelectItem>
                <SelectItem value="pdm-forecast">vs PDM Forecast</SelectItem>
                <SelectItem value="worst-case">Worst of All</SelectItem>
              </SelectContent>
            </Select>
            <Select value={timeWindow} onValueChange={setTimeWindow}>
              <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue placeholder="Window" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Next 7 days</SelectItem>
                <SelectItem value="14">Next 14 days</SelectItem>
                <SelectItem value="30">Next 30 days</SelectItem>
                <SelectItem value="60">Next 60 days</SelectItem>
                <SelectItem value="90">Next 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Context Strip */}
          <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
              Baseline: {selectedBaseline === "contract" ? "Contract/CLIN" : selectedBaseline === "iop" ? "IOP/ESD" : selectedBaseline === "delivery-plan" ? "Delivery Plan" : selectedBaseline === "pdm-forecast" ? "PDM Forecast" : "Worst Case"}
            </Badge>
            <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
              Role: {selectedRole}
            </Badge>
            {selectedSite !== "All" && (
              <Badge variant="outline" className="text-[10px]">Site: {selectedSite}</Badge>
            )}
            {selectedProgram !== "All" && (
              <Badge variant="outline" className="text-[10px]">Program: {selectedProgram}</Badge>
            )}
            <span className="text-[10px] text-gray-500 ml-auto">{filteredJobs.length} jobs in view</span>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="px-6 border-t border-gray-100">
          <div className="flex gap-1">
            {[
              { id: "summary", label: "Executive Summary", icon: Gauge },
              { id: "jobs", label: "Prioritized Late Job List", icon: ClipboardList },
              { id: "clin", label: "Program / CLIN Impact", icon: Target },
              { id: "rootcause", label: "Root Cause & Recovery", icon: ShieldAlert },
              { id: "workbench", label: "Role Workbench", icon: Users },
              { id: "trends", label: "Trends & Governance", icon: History }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "text-blue-600 border-blue-600 bg-blue-50/50"
                    : "text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="p-6">
        {/* TAB 1: Executive Summary */}
        {activeTab === "summary" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-5 gap-3">
              <KPICard title="Late Jobs" value={lateJobCount} icon={AlertCircle} color={COLORS.critical} tooltip="Jobs currently past their required date" />
              <KPICard title="Forecast-Late" value={forecastLateCount} icon={Clock} color={COLORS.high} tooltip="Jobs predicted to miss their required date" />
              <KPICard title="High-Priority Jobs" value={highPriorityCount} icon={Target} color={COLORS.primary} tooltip="Jobs with Critical or High priority tier" />
              <KPICard title="DPAS/Critical at Risk" value={dpasAtRisk} icon={ShieldAlert} color="#dc2626" tooltip="DPAS-rated or critical contract jobs at risk" />
              <KPICard title="Revenue at Risk" value={formatCurrency(totalRevenueAtRisk)} icon={DollarSign} color={COLORS.negative} tooltip="Total revenue impact of late/forecast-late jobs" />
            </div>
            
            <div className="grid grid-cols-5 gap-3">
              <KPICard title="Blocked by Supply" value={supplyBlocked} icon={Truck} color={COLORS.supply} tooltip="Jobs blocked by supply chain issues" />
              <KPICard title="Blocked by Quality/MRB" value={qualityBlocked} icon={AlertTriangle} color={COLORS.quality} tooltip="Jobs blocked by MRB, RI, NC, or quality holds" />
              <KPICard title="Blocked by Capacity" value={capacityBlocked} icon={Wrench} color={COLORS.capacity} tooltip="Jobs blocked by workcenter or test cell constraints" />
              <KPICard title="Near-Term CLINs at Risk" value={clinImpacts.filter(c => c.recoveryConfidence !== "High").length} icon={FileText} color="#f59e0b" tooltip="CLINs with linked late jobs threatening delivery" />
              <KPICard title="Surprise Late Hits" value={Math.floor(lateJobCount * 0.15)} delta="+3 this week" trend="up" icon={AlertTriangle} color={COLORS.critical} tooltip="Jobs that became late without prior visibility" />
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Priority vs Lateness Matrix - Separated by Status */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-gray-800">Priority vs Lateness Matrix</CardTitle>
                      <p className="text-[10px] text-gray-500 mt-0.5">Click any bubble to view in Prioritized List</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-[10px] text-gray-500">
                        <span className="w-2 h-2 rounded-full bg-red-500" /> Late (Days Missed)
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-gray-500">
                        <span className="w-2 h-2 rounded-full bg-amber-500" /> Forecast (Days to Risk)
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Late Jobs Quadrant */}
                    <div>
                      <p className="text-[10px] font-semibold text-red-700 mb-2 text-center">Already Late: Days Missed</p>
                      <ResponsiveContainer width="100%" height={200}>
                        <ScatterChart margin={{ top: 5, right: 5, bottom: 15, left: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis type="number" dataKey="x" tick={{ fontSize: 9 }} label={{ value: "Days Late", position: "bottom", fontSize: 9 }} />
                          <YAxis type="number" dataKey="y" tick={{ fontSize: 9 }} domain={[0, 100]} />
                          <ZAxis type="number" dataKey="z" range={[30, 300]} />
                          <RechartsTooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload
                                return (
                                  <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-lg text-xs">
                                    <p className="font-semibold">{data.name}</p>
                                    <p>Priority: {data.y}</p>
                                    <p className="text-red-600 font-medium">+{data.x} days late</p>
                                    <p>Cause: {data.cause}</p>
                                    <p className="text-blue-600 text-[10px] mt-1">Click to filter list</p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Scatter 
                            data={scatterData.filter(d => d.status === "Late")} 
                            shape="circle"
                            onClick={(data) => {
                              const job = filteredJobs.find(j => j.id === data.name)
                              if (job) navigateToJobsWithFilter({ priorityTier: job.priorityTier })
                            }}
                            cursor="pointer"
                          >
                            {scatterData.filter(d => d.status === "Late").map((entry, index) => (
                              <Cell key={`late-${index}`} fill={COLORS.critical} fillOpacity={entry.y >= 65 ? 0.9 : 0.5} />
                            ))}
                          </Scatter>
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Forecast-Late Jobs Quadrant */}
                    <div>
                      <p className="text-[10px] font-semibold text-amber-700 mb-2 text-center">Forecast-Late: Days to Predicted Miss</p>
                      <ResponsiveContainer width="100%" height={200}>
                        <ScatterChart margin={{ top: 5, right: 5, bottom: 15, left: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis type="number" dataKey="x" tick={{ fontSize: 9 }} label={{ value: "Days to Risk", position: "bottom", fontSize: 9 }} reversed />
                          <YAxis type="number" dataKey="y" tick={{ fontSize: 9 }} domain={[0, 100]} />
                          <ZAxis type="number" dataKey="z" range={[30, 300]} />
                          <RechartsTooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload
                                return (
                                  <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-lg text-xs">
                                    <p className="font-semibold">{data.name}</p>
                                    <p>Priority: {data.y}</p>
                                    <p className="text-amber-600 font-medium">{data.x} days to predicted miss</p>
                                    <p>Cause: {data.cause}</p>
                                    <p className="text-blue-600 text-[10px] mt-1">Click to filter list</p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Scatter 
                            data={scatterData.filter(d => d.status === "Forecast-Late").map(d => ({ ...d, x: Math.abs(d.x) }))} 
                            shape="circle"
                            onClick={(data) => {
                              const job = filteredJobs.find(j => j.id === data.name)
                              if (job) navigateToJobsWithFilter({ priorityTier: job.priorityTier })
                            }}
                            cursor="pointer"
                          >
                            {scatterData.filter(d => d.status === "Forecast-Late").map((entry, index) => (
                              <Cell key={`forecast-${index}`} fill={COLORS.high} fillOpacity={entry.y >= 65 ? 0.9 : 0.5} />
                            ))}
                          </Scatter>
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] text-gray-500 text-center">
                    Bubble size = Revenue/AOP impact | Left: already late | Right: trending toward miss (action window)
                  </div>
                </CardContent>
              </Card>
              
              {/* Priority Score Composition */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <CardTitle className="text-sm font-bold text-gray-800">Priority Score Composition</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 mb-4">How priority scores are calculated across the population:</p>
                  <div className="space-y-4">
                    {[
                      { label: "CLIN / Contract Criticality", value: 25, color: "#3b82f6", desc: "Importance of linked CLIN and contract" },
                      { label: "DPAS / Customer Visibility", value: 20, color: "#dc2626", desc: "DPAS rating and customer priority flags" },
                      { label: "Revenue / AOP Timing", value: 20, color: "#16a34a", desc: "Financial impact and AOP recognition" },
                      { label: "Critical Path / Fan-Out", value: 20, color: "#8b5cf6", desc: "Network role and downstream impact" },
                      { label: "Due Window Urgency", value: 15, color: "#f59e0b", desc: "Proximity to required date" }
                    ].map(item => (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700">{item.label}</span>
                          <span className="text-xs font-semibold" style={{ color: item.color }}>{item.value}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${item.value}%`, backgroundColor: item.color }} />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Top Protect/Recover Jobs */}
            <Card className="border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-gray-800">Top Protect / Recover Jobs</CardTitle>
                  <Badge className="bg-red-100 text-red-700 text-[10px]">Focus for Daily Huddle</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-2 font-semibold text-gray-700 w-12">Rank</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Job ID</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Program / CLIN</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Customer</th>
                        <th className="text-center p-2 font-semibold text-gray-700">Status</th>
                        <th className="text-center p-2 font-semibold text-gray-700">
                          <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1">
                              Days Late / Risk <Info className="w-3 h-3 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-xs bg-gray-900 text-white p-2">
                              <p><strong>Late:</strong> Days past required date (positive number)</p>
                              <p><strong>Forecast-Late:</strong> Days until predicted miss (countdown)</p>
                            </TooltipContent>
                          </Tooltip>
                        </th>
                        <th className="text-center p-2 font-semibold text-gray-700">
                          <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1">
                              Priority <Info className="w-3 h-3 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-xs bg-gray-900 text-white p-2">
                              Hover over score to see "Why prioritized?" decomposition
                            </TooltipContent>
                          </Tooltip>
                        </th>
                        <th className="text-left p-2 font-semibold text-gray-700">Primary Cause</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Blocking</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Owner</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Recovery ETA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredJobs.slice(0, 15).map((job) => {
                        const daysDisplay = formatDaysDisplay(job)
                        return (
                          <tr 
                            key={job.id} 
                            className={`hover:bg-blue-50 cursor-pointer ${job.priorityTier === "Critical" ? "bg-red-50/50" : ""}`}
                            onClick={() => handleSelectJob(job)}
                          >
                            <td className="p-2 text-center font-bold text-gray-900">{job.rank}</td>
                            <td className="p-2">
                              <span className="font-mono text-blue-600">{job.id}</span>
                              {job.dpasFlag && <Badge className="ml-1 text-[8px] bg-red-100 text-red-700">DPAS</Badge>}
                            </td>
                            <td className="p-2">
                              <p className="font-medium text-gray-900">{job.program}</p>
                              <button 
                                className="text-blue-600 hover:underline text-left"
                                onClick={(e) => { e.stopPropagation(); navigateToJobsWithFilter({ clin: job.clin }) }}
                              >
                                {job.clin}
                              </button>
                            </td>
                            <td className="p-2 text-gray-700">{job.customer}</td>
                            <td className="p-2 text-center"><StatusBadge status={job.status} /></td>
                            <td className="p-2 text-center">
                              <div className={`font-semibold ${daysDisplay.colorClass}`}>
                                {daysDisplay.value}
                              </div>
                              <div className="text-[9px] text-gray-400">{daysDisplay.label}</div>
                            </td>
                            <td className="p-2 text-center">
                              <Tooltip>
                                <TooltipTrigger>
                                  <PriorityBadge tier={job.priorityTier} score={job.priorityScore} />
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-sm bg-gray-900 text-white p-3">
                                  <p className="font-semibold text-xs mb-2">Why is this job ranked #{job.rank}?</p>
                                  <p className="text-[10px] text-gray-300 mb-2">{job.priorityExplanation}</p>
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-[10px]">
                                      <span>CLIN Criticality:</span>
                                      <span className="font-medium">{job.priorityFactors.clinCriticality}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px]">
                                      <span>DPAS/Visibility:</span>
                                      <span className="font-medium">{job.priorityFactors.dpasVisibility}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px]">
                                      <span>Revenue/AOP:</span>
                                      <span className="font-medium">{job.priorityFactors.revenueAOP}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px]">
                                      <span>Critical Path:</span>
                                      <span className="font-medium">{job.priorityFactors.criticalPathRole}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px]">
                                      <span>Due Urgency:</span>
                                      <span className="font-medium">{job.priorityFactors.dueWindowUrgency}</span>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </td>
                            <td className="p-2">
                              <button
                                className="text-left"
                                onClick={(e) => { e.stopPropagation(); navigateToJobsWithFilter({ rootCause: job.primaryCause }) }}
                              >
                                <Badge variant="outline" className="text-[9px] hover:bg-gray-100" style={{ borderColor: ROOT_CAUSE_COLORS[job.primaryCause], color: ROOT_CAUSE_COLORS[job.primaryCause] }}>
                                  {job.primaryCause}
                                </Badge>
                              </button>
                            </td>
                            <td className="p-2 text-gray-600">{job.blockingFunction}</td>
                            <td className="p-2 text-gray-700">{job.owner}</td>
                            <td className="p-2 text-gray-600">{formatDate(job.recoveryETA)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* TAB 2: Prioritized Late Job List */}
        {activeTab === "jobs" && (
          <div className="space-y-4">
            {/* Split by Priority Tier */}
            <div className="grid grid-cols-4 gap-4">
              {(["Critical", "High", "Medium", "Low"] as PriorityTier[]).map(tier => {
                const tierJobs = filteredJobs.filter(j => j.priorityTier === tier)
                const late = tierJobs.filter(j => j.status === "Late").length
                const forecast = tierJobs.filter(j => j.status === "Forecast-Late").length
                const colors = { Critical: COLORS.critical, High: COLORS.high, Medium: COLORS.medium, Low: COLORS.low }
                return (
                  <Card key={tier} className="border border-gray-200">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={`text-[10px] ${tier === "Critical" ? "bg-red-100 text-red-700" : tier === "High" ? "bg-amber-100 text-amber-700" : tier === "Medium" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>{tier}</Badge>
                        <span className="text-lg font-bold text-gray-900">{tierJobs.length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden flex">
                          <div className="h-full bg-red-500" style={{ width: `${(late / (tierJobs.length || 1)) * 100}%` }} />
                          <div className="h-full bg-amber-400" style={{ width: `${(forecast / (tierJobs.length || 1)) * 100}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-gray-500">
                        <span>{late} Late</span>
                        <span>{forecast} Forecast</span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            
            {/* Drill-Down Filter Indicator */}
            {(drillDownCLIN || drillDownRootCause || drillDownPriorityTier) && (
              <Card className="border border-blue-200 bg-blue-50">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Filtered View:</span>
                      {drillDownCLIN && (
                        <Badge className="bg-blue-100 text-blue-700">CLIN: {drillDownCLIN}</Badge>
                      )}
                      {drillDownRootCause && (
                        <Badge className="bg-blue-100 text-blue-700">Root Cause: {drillDownRootCause}</Badge>
                      )}
                      {drillDownPriorityTier && (
                        <Badge className="bg-blue-100 text-blue-700">Priority: {drillDownPriorityTier}</Badge>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={clearDrillDownFilters} className="text-xs">
                      Clear Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Main Job Table - Core Resolution Layer */}
            <Card className="border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-gray-800">Prioritized Late Job List</CardTitle>
                    <p className="text-[10px] text-gray-500 mt-0.5">The shared protect/recover list - all tabs drill into this view</p>
                  </div>
                  <span className="text-xs text-gray-500">{filteredJobs.length} jobs | Sorted by Priority Score</span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[600px] overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-2 font-semibold text-gray-700 sticky left-0 bg-gray-50 w-12">Rank</th>
                        <th className="text-left p-2 font-semibold text-gray-700 sticky left-12 bg-gray-50">Priority</th>
                        <th className="text-left p-2 font-semibold text-gray-700 sticky left-24 bg-gray-50">Job ID</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Parent Assy</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Program</th>
                        <th className="text-left p-2 font-semibold text-gray-700">CLIN</th>
                        <th className="text-center p-2 font-semibold text-gray-700">DPAS</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Customer</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Site</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Workcenter</th>
                        <th className="text-center p-2 font-semibold text-gray-700">Status</th>
                        <th className="text-center p-2 font-semibold text-gray-700">
                          <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1 justify-center">
                              Days <Info className="w-3 h-3 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent className="text-xs bg-gray-900 text-white p-2">
                              <p><strong>Late:</strong> +N days past due</p>
                              <p><strong>Forecast:</strong> N days to risk</p>
                            </TooltipContent>
                          </Tooltip>
                        </th>
                        <th className="text-left p-2 font-semibold text-gray-700">Required</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Predicted</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Primary Cause</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Blocking</th>
                        <th className="text-right p-2 font-semibold text-gray-700">Revenue Impact</th>
                        <th className="text-center p-2 font-semibold text-gray-700">Crit Path</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Owner</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Next Action</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Recovery ETA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredJobs.map((job) => {
                        const daysDisplay = formatDaysDisplay(job)
                        return (
                          <tr 
                            key={job.id} 
                            className={`hover:bg-blue-50 cursor-pointer ${job.priorityTier === "Critical" ? "bg-red-50/30" : job.priorityTier === "High" ? "bg-amber-50/30" : ""}`}
                            onClick={() => handleSelectJob(job)}
                          >
                            <td className="p-2 text-center font-bold text-gray-900 sticky left-0 bg-inherit">{job.rank}</td>
                            <td className="p-2 sticky left-12 bg-inherit">
                              <Tooltip>
                                <TooltipTrigger>
                                  <PriorityBadge tier={job.priorityTier} score={job.priorityScore} />
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-sm bg-gray-900 text-white p-3">
                                  <p className="font-semibold text-xs mb-2">Why #{job.rank}?</p>
                                  <p className="text-[10px] text-gray-300 mb-2">{job.priorityExplanation}</p>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                                    <span>CLIN:</span><span className="font-medium">{job.priorityFactors.clinCriticality}</span>
                                    <span>DPAS:</span><span className="font-medium">{job.priorityFactors.dpasVisibility}</span>
                                    <span>Revenue:</span><span className="font-medium">{job.priorityFactors.revenueAOP}</span>
                                    <span>Crit Path:</span><span className="font-medium">{job.priorityFactors.criticalPathRole}</span>
                                    <span>Urgency:</span><span className="font-medium">{job.priorityFactors.dueWindowUrgency}</span>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </td>
                            <td className="p-2 sticky left-24 bg-inherit font-mono text-blue-600">{job.id}</td>
                            <td className="p-2 text-gray-700">{job.parentAssembly}</td>
                            <td className="p-2 text-gray-700 font-medium">{job.program}</td>
                            <td className="p-2 text-gray-600">{job.clin}</td>
                            <td className="p-2 text-center">
                              {job.dpasFlag && <Badge className="text-[8px] bg-red-100 text-red-700">DPAS</Badge>}
                            </td>
                            <td className="p-2 text-gray-700">{job.customer}</td>
                            <td className="p-2 text-gray-600">{job.site}</td>
                            <td className="p-2 text-gray-600">{job.workcenter}</td>
                            <td className="p-2 text-center"><StatusBadge status={job.status} /></td>
                            <td className="p-2 text-center">
                              <div className={`font-semibold ${daysDisplay.colorClass}`}>{daysDisplay.value}</div>
                              <div className="text-[8px] text-gray-400">{daysDisplay.label}</div>
                            </td>
                            <td className="p-2 text-gray-600">{formatDate(job.requiredDate)}</td>
                            <td className="p-2 text-gray-600">{formatDate(job.predictedCompletion)}</td>
                            <td className="p-2">
                              <Badge variant="outline" className="text-[9px]" style={{ borderColor: ROOT_CAUSE_COLORS[job.primaryCause], color: ROOT_CAUSE_COLORS[job.primaryCause] }}>
                                {job.primaryCause}
                              </Badge>
                            </td>
                            <td className="p-2 text-gray-600">{job.blockingFunction}</td>
                            <td className="p-2 text-right font-medium text-gray-700">{formatCurrency(job.revenueImpact)}</td>
                            <td className="p-2 text-center">
                              {job.criticalPath && <Badge className="text-[8px] bg-purple-100 text-purple-700">CP</Badge>}
                            </td>
                            <td className="p-2 text-gray-700">{job.owner}</td>
                            <td className="p-2 text-gray-600 max-w-[150px] truncate">{job.nextAction}</td>
                            <td className="p-2 text-gray-600">{formatDate(job.recoveryETA)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* TAB 3: Program / CLIN Impact */}
        {activeTab === "clin" && (
          <div className="space-y-6">
            {/* CLIN Risk Heatmap */}
            <Card className="border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-800">Program / CLIN Risk Heatmap</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-12 gap-1">
                  <div className="col-span-2" />
                  {Array.from({ length: 10 }, (_, i) => (
                    <div key={i} className="text-center text-[10px] text-gray-500 font-medium">
                      W{i + 1}
                    </div>
                  ))}
                  {programs.slice(0, 5).map((program, pIdx) => (
                    <>
                      <div key={`label-${pIdx}`} className="col-span-2 text-xs font-medium text-gray-700 truncate pr-2">
                        {program}
                      </div>
                      {Array.from({ length: 10 }, (_, wIdx) => {
                        const risk = seededRandom(pIdx * 100 + wIdx) * 100
                        return (
                          <div
                            key={`cell-${pIdx}-${wIdx}`}
                            className="h-8 rounded flex items-center justify-center text-[10px] font-medium"
                            style={{
                              backgroundColor: risk > 70 ? "#fee2e2" : risk > 40 ? "#fef3c7" : risk > 10 ? "#dbeafe" : "#f3f4f6",
                              color: risk > 70 ? "#991b1b" : risk > 40 ? "#92400e" : risk > 10 ? "#1e40af" : "#6b7280"
                            }}
                          >
                            {risk > 10 ? Math.floor(risk / 10) : ""}
                          </div>
                        )
                      })}
                    </>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-4 mt-3 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100" /> High Risk</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100" /> Medium</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100" /> Low</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100" /> Clear</span>
                </div>
              </CardContent>
            </Card>
            
            {/* Jobs Driving Commitment Risk */}
            <Card className="border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-800">Jobs Driving Commitment Risk</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[400px] overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-2 font-semibold text-gray-700">Program</th>
                        <th className="text-left p-2 font-semibold text-gray-700">CLIN</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Customer</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Required Date</th>
                        <th className="text-center p-2 font-semibold text-gray-700">Linked Late Jobs</th>
                        <th className="text-center p-2 font-semibold text-gray-700">Highest Priority</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Primary Blocker</th>
                        <th className="text-right p-2 font-semibold text-gray-700">Revenue at Risk</th>
                        <th className="text-center p-2 font-semibold text-gray-700">DPAS</th>
                        <th className="text-center p-2 font-semibold text-gray-700">Recovery Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {clinImpacts.slice(0, 20).map((impact, idx) => (
                        <tr key={idx} className={`hover:bg-blue-50 ${impact.recoveryConfidence === "Low" ? "bg-red-50/30" : ""}`}>
                          <td className="p-2 font-medium text-gray-900">{impact.program}</td>
                          <td className="p-2 text-blue-600">{impact.clin}</td>
                          <td className="p-2 text-gray-700">{impact.customer}</td>
                          <td className="p-2 text-gray-600">{formatDate(impact.requiredDate)}</td>
                          <td className="p-2 text-center font-semibold text-gray-900">{impact.linkedLateJobs}</td>
                          <td className="p-2 text-center">
                            <PriorityBadge tier={impact.highestPriority >= 85 ? "Critical" : impact.highestPriority >= 65 ? "High" : impact.highestPriority >= 40 ? "Medium" : "Low"} score={impact.highestPriority} />
                          </td>
                          <td className="p-2">
                            <Badge variant="outline" className="text-[9px]" style={{ borderColor: ROOT_CAUSE_COLORS[impact.primaryBlocker], color: ROOT_CAUSE_COLORS[impact.primaryBlocker] }}>
                              {impact.primaryBlocker}
                            </Badge>
                          </td>
                          <td className="p-2 text-right font-medium text-gray-700">{formatCurrency(impact.revenueAtRisk)}</td>
                          <td className="p-2 text-center">
                            {impact.dpasFlag && <Badge className="text-[8px] bg-red-100 text-red-700">DPAS</Badge>}
                          </td>
                          <td className="p-2 text-center">
                            <Badge className={`text-[9px] ${impact.recoveryConfidence === "High" ? "bg-green-100 text-green-700" : impact.recoveryConfidence === "Medium" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                              {impact.recoveryConfidence}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* TAB 4: Root Cause & Recovery */}
        {activeTab === "rootcause" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Weighted Root Cause Pareto */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <CardTitle className="text-sm font-bold text-gray-800">Weighted Root Cause Pareto</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={rootCauseData.slice(0, 8)} layout="vertical" margin={{ left: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="cause" tick={{ fontSize: 10 }} width={100} />
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-lg text-xs">
                                <p className="font-semibold">{data.cause}</p>
                                <p>Count: {data.count}</p>
                                <p>Weighted Impact: {data.weightedImpact.toFixed(0)}</p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="weightedImpact" fill={COLORS.primary} radius={[0, 4, 4, 0]}>
                        {rootCauseData.slice(0, 8).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={ROOT_CAUSE_COLORS[entry.cause as RootCause] || COLORS.primary} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-[10px] text-gray-500 text-center mt-2">Weighted by priority score × revenue impact</p>
                </CardContent>
              </Card>
              
              {/* Blocker by Function */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <CardTitle className="text-sm font-bold text-gray-800">Blocker by Function</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={blockingFunctionData} layout="vertical" margin={{ left: 120 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="function" tick={{ fontSize: 10 }} width={120} />
                      <RechartsTooltip />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="critical" stackId="a" fill={COLORS.critical} name="Critical" />
                      <Bar dataKey="high" stackId="a" fill={COLORS.high} name="High" />
                      <Bar dataKey="medium" stackId="a" fill={COLORS.medium} name="Medium" />
                      <Bar dataKey="low" stackId="a" fill={COLORS.low} name="Low" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            
            {/* Action Queue */}
            <Card className="border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-800">Action Queue for High-Impact Jobs</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[350px] overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-2 font-semibold text-gray-700">Job ID</th>
                        <th className="text-center p-2 font-semibold text-gray-700">Priority</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Root Cause</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Evidence Link</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Blocking Function</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Owner</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Next Action</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Recovery ETA</th>
                        <th className="text-center p-2 font-semibold text-gray-700">Escalation?</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredJobs.filter(j => j.priorityTier === "Critical" || j.priorityTier === "High").slice(0, 15).map((job) => (
                        <tr key={job.id} className="hover:bg-blue-50 cursor-pointer" onClick={() => handleSelectJob(job)}>
                          <td className="p-2 font-mono text-blue-600">{job.id}</td>
                          <td className="p-2 text-center"><PriorityBadge tier={job.priorityTier} /></td>
                          <td className="p-2">
                            <Badge variant="outline" className="text-[9px]" style={{ borderColor: ROOT_CAUSE_COLORS[job.primaryCause], color: ROOT_CAUSE_COLORS[job.primaryCause] }}>
                              {job.primaryCause}
                            </Badge>
                          </td>
                          <td className="p-2 text-blue-600 font-mono">
                            {job.linkedPO || job.linkedMRB || job.linkedNC || job.linkedRI || "-"}
                          </td>
                          <td className="p-2 text-gray-700">{job.blockingFunction}</td>
                          <td className="p-2 text-gray-700">{job.owner}</td>
                          <td className="p-2 text-gray-600 max-w-[180px] truncate">{job.nextAction}</td>
                          <td className="p-2 text-gray-600">{formatDate(job.recoveryETA)}</td>
                          <td className="p-2 text-center">
                            {job.priorityTier === "Critical" && (
                              <Badge className="text-[8px] bg-red-100 text-red-700">Yes</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* TAB 5: Role Workbench */}
        {activeTab === "workbench" && (
          <div className="space-y-4">
            {/* Role Sub-tabs */}
            <div className="flex gap-2 border-b border-gray-200 pb-2">
              {[
                { id: "production-control", label: "Production Control", icon: ClipboardList },
                { id: "pdm-program", label: "PDM / Program", icon: Target },
                { id: "supply-chain", label: "Supply Chain", icon: Truck },
                { id: "quality", label: "Quality", icon: AlertTriangle }
              ].map(role => (
                <button
                  key={role.id}
                  onClick={() => setWorkbenchRole(role.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    workbenchRole === role.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <role.icon className="w-4 h-4" />
                  {role.label}
                </button>
              ))}
            </div>
            
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Shared Priority Engine:</strong> All role views use the same underlying priority score and late/forecast-late logic. Only the emphasis and displayed context changes.
              </p>
            </div>
            
            {/* Production Control View */}
            {workbenchRole === "production-control" && (
              <div className="space-y-4">
                <Card className="border border-gray-200">
                  <CardHeader className="py-3 px-4 border-b border-gray-100">
                    <CardTitle className="text-sm font-bold text-gray-800">Production Control: Release & Sequence Queue</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-[500px] overflow-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr className="border-b border-gray-200">
                            <th className="text-left p-2 font-semibold text-gray-700">Rank</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Job ID</th>
                            <th className="text-center p-2 font-semibold text-gray-700">Priority</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Program</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Current Op</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Workcenter</th>
                            <th className="text-center p-2 font-semibold text-gray-700">Status</th>
                            <th className="text-center p-2 font-semibold text-gray-700">Days Late</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Required</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Material Status</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Next Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredJobs.slice(0, 25).map((job) => (
                            <tr key={job.id} className={`hover:bg-blue-50 cursor-pointer ${job.priorityTier === "Critical" ? "bg-red-50/30" : ""}`} onClick={() => handleSelectJob(job)}>
                              <td className="p-2 font-bold text-gray-900">{job.rank}</td>
                              <td className="p-2 font-mono text-blue-600">{job.id}</td>
                              <td className="p-2 text-center"><PriorityBadge tier={job.priorityTier} /></td>
                              <td className="p-2 text-gray-700">{job.program}</td>
                              <td className="p-2 text-gray-600">{job.currentOperation}</td>
                              <td className="p-2 text-gray-600">{job.workcenter}</td>
                              <td className="p-2 text-center"><StatusBadge status={job.status} /></td>
                              <td className={`p-2 text-center font-semibold ${job.status === "Late" ? "text-red-600" : "text-amber-600"}`}>
                                {job.status === "Late" ? `+${getDaysLateForBaseline(job)}` : getDaysLateForBaseline(job)}
                              </td>
                              <td className="p-2 text-gray-600">{formatDate(job.requiredDate)}</td>
                              <td className="p-2">
                                <Badge className={`text-[9px] ${job.materialStatus === "Available" ? "bg-green-100 text-green-700" : job.materialStatus === "Partial" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                                  {job.materialStatus}
                                </Badge>
                              </td>
                              <td className="p-2 text-gray-600 max-w-[150px] truncate">{job.nextAction}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Supply Chain View */}
            {workbenchRole === "supply-chain" && (
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <CardTitle className="text-sm font-bold text-gray-800">Supply Chain: Prioritized Expedite Queue</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[500px] overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr className="border-b border-gray-200">
                          <th className="text-left p-2 font-semibold text-gray-700">Job ID</th>
                          <th className="text-center p-2 font-semibold text-gray-700">Priority</th>
                          <th className="text-left p-2 font-semibold text-gray-700">Cause</th>
                          <th className="text-left p-2 font-semibold text-gray-700">Linked PO</th>
                          <th className="text-left p-2 font-semibold text-gray-700">Supplier Promise</th>
                          <th className="text-left p-2 font-semibold text-gray-700">Material Status</th>
                          <th className="text-center p-2 font-semibold text-gray-700">Days Late</th>
                          <th className="text-left p-2 font-semibold text-gray-700">Next Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredJobs.filter(j => j.blockingFunction === "Supply Chain").slice(0, 20).map((job) => (
                          <tr key={job.id} className="hover:bg-blue-50 cursor-pointer" onClick={() => handleSelectJob(job)}>
                            <td className="p-2 font-mono text-blue-600">{job.id}</td>
                            <td className="p-2 text-center"><PriorityBadge tier={job.priorityTier} /></td>
                            <td className="p-2">
                              <Badge variant="outline" className="text-[9px]" style={{ borderColor: ROOT_CAUSE_COLORS[job.primaryCause], color: ROOT_CAUSE_COLORS[job.primaryCause] }}>
                                {job.primaryCause}
                              </Badge>
                            </td>
                            <td className="p-2 font-mono text-blue-600">{job.linkedPO || "-"}</td>
                            <td className="p-2 text-gray-600">{job.supplierPromiseDate ? formatDate(job.supplierPromiseDate) : "-"}</td>
                            <td className="p-2">
                              <Badge className={`text-[9px] ${job.materialStatus === "Available" ? "bg-green-100 text-green-700" : job.materialStatus === "Partial" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                                {job.materialStatus}
                              </Badge>
                            </td>
                            <td className={`p-2 text-center font-semibold ${job.status === "Late" ? "text-red-600" : "text-amber-600"}`}>
                              {job.status === "Late" ? `+${getDaysLateForBaseline(job)}` : getDaysLateForBaseline(job)}
                            </td>
                            <td className="p-2 text-gray-600 max-w-[180px] truncate">{job.nextAction}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Quality View */}
            {workbenchRole === "quality" && (
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <CardTitle className="text-sm font-bold text-gray-800">Quality: MRB/RI Disposition Queue</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[500px] overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr className="border-b border-gray-200">
                          <th className="text-left p-2 font-semibold text-gray-700">Job ID</th>
                          <th className="text-center p-2 font-semibold text-gray-700">Priority</th>
                          <th className="text-left p-2 font-semibold text-gray-700">Cause</th>
                          <th className="text-left p-2 font-semibold text-gray-700">MRB/NC/RI</th>
                          <th className="text-left p-2 font-semibold text-gray-700">Root Cause Detail</th>
                          <th className="text-center p-2 font-semibold text-gray-700">Days Late</th>
                          <th className="text-left p-2 font-semibold text-gray-700">Next Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredJobs.filter(j => j.blockingFunction === "Quality/MRB").slice(0, 20).map((job) => (
                          <tr key={job.id} className="hover:bg-blue-50 cursor-pointer" onClick={() => handleSelectJob(job)}>
                            <td className="p-2 font-mono text-blue-600">{job.id}</td>
                            <td className="p-2 text-center"><PriorityBadge tier={job.priorityTier} /></td>
                            <td className="p-2">
                              <Badge variant="outline" className="text-[9px]" style={{ borderColor: ROOT_CAUSE_COLORS[job.primaryCause], color: ROOT_CAUSE_COLORS[job.primaryCause] }}>
                                {job.primaryCause}
                              </Badge>
                            </td>
                            <td className="p-2 font-mono text-blue-600">{job.linkedMRB || job.linkedNC || job.linkedRI || "-"}</td>
                            <td className="p-2 text-gray-600 max-w-[200px] truncate">{job.rootCauseDetail}</td>
                            <td className={`p-2 text-center font-semibold ${job.status === "Late" ? "text-red-600" : "text-amber-600"}`}>
                              {job.status === "Late" ? `+${getDaysLateForBaseline(job)}` : getDaysLateForBaseline(job)}
                            </td>
                            <td className="p-2 text-gray-600 max-w-[180px] truncate">{job.nextAction}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* PDM/Program View */}
            {workbenchRole === "pdm-program" && (
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <CardTitle className="text-sm font-bold text-gray-800">PDM / Program: CLIN & Milestone Risk View</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[500px] overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr className="border-b border-gray-200">
                          <th className="text-left p-2 font-semibold text-gray-700">Job ID</th>
                          <th className="text-center p-2 font-semibold text-gray-700">Priority</th>
                          <th className="text-left p-2 font-semibold text-gray-700">Program</th>
                          <th className="text-left p-2 font-semibold text-gray-700">CLIN</th>
                          <th className="text-left p-2 font-semibold text-gray-700">Customer</th>
                          <th className="text-center p-2 font-semibold text-gray-700">DPAS</th>
                          <th className="text-right p-2 font-semibold text-gray-700">Revenue Impact</th>
                          <th className="text-center p-2 font-semibold text-gray-700">Days Late</th>
                          <th className="text-left p-2 font-semibold text-gray-700">Recovery ETA</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredJobs.filter(j => j.dpasFlag || j.criticalContract).slice(0, 20).map((job) => (
                          <tr key={job.id} className="hover:bg-blue-50 cursor-pointer" onClick={() => handleSelectJob(job)}>
                            <td className="p-2 font-mono text-blue-600">{job.id}</td>
                            <td className="p-2 text-center"><PriorityBadge tier={job.priorityTier} /></td>
                            <td className="p-2 font-medium text-gray-900">{job.program}</td>
                            <td className="p-2 text-blue-600">{job.clin}</td>
                            <td className="p-2 text-gray-700">{job.customer}</td>
                            <td className="p-2 text-center">
                              {job.dpasFlag && <Badge className="text-[8px] bg-red-100 text-red-700">DPAS</Badge>}
                            </td>
                            <td className="p-2 text-right font-medium text-gray-700">{formatCurrency(job.revenueImpact)}</td>
                            <td className={`p-2 text-center font-semibold ${job.status === "Late" ? "text-red-600" : "text-amber-600"}`}>
                              {job.status === "Late" ? `+${getDaysLateForBaseline(job)}` : getDaysLateForBaseline(job)}
                            </td>
                            <td className="p-2 text-gray-600">{formatDate(job.recoveryETA)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        
        {/* TAB 6: Trends & Governance */}
        {activeTab === "trends" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Late/Forecast-Late Trend */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <CardTitle className="text-sm font-bold text-gray-800">Late / Forecast-Late Trend</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <RechartsTooltip />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Line type="monotone" dataKey="late" stroke={COLORS.critical} strokeWidth={2} name="Late Jobs" dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="forecastLate" stroke={COLORS.high} strokeWidth={2} name="Forecast-Late" dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="highPriority" stroke={COLORS.primary} strokeWidth={2} name="High Priority" dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              {/* Root Cause Mix Over Time */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <CardTitle className="text-sm font-bold text-gray-800">Root Cause Mix Over Time</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={trendData.map((w, i) => ({
                      ...w,
                      supply: Math.floor(seededRandom(i * 71) * 20) + 10,
                      quality: Math.floor(seededRandom(i * 83) * 15) + 5,
                      capacity: Math.floor(seededRandom(i * 97) * 12) + 3,
                      other: Math.floor(seededRandom(i * 101) * 8) + 2
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <RechartsTooltip />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Area type="monotone" dataKey="supply" stackId="1" stroke={COLORS.supply} fill={COLORS.supply} name="Supply" />
                      <Area type="monotone" dataKey="quality" stackId="1" stroke={COLORS.quality} fill={COLORS.quality} name="Quality/MRB" />
                      <Area type="monotone" dataKey="capacity" stackId="1" stroke={COLORS.capacity} fill={COLORS.capacity} name="Capacity" />
                      <Area type="monotone" dataKey="other" stackId="1" stroke={COLORS.low} fill={COLORS.low} name="Other" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            
            {/* Governance Board */}
            <Card className="border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-800">Governance Board</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-5 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
                    <p className="text-2xl font-bold text-blue-700">24</p>
                    <p className="text-xs text-blue-600 mt-1">Jobs entered protect list</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-center">
                    <p className="text-2xl font-bold text-green-700">18</p>
                    <p className="text-xs text-green-600 mt-1">Jobs recovered</p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 text-center">
                    <p className="text-2xl font-bold text-amber-700">7</p>
                    <p className="text-xs text-amber-600 mt-1">Jobs escalated</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200 text-center">
                    <p className="text-2xl font-bold text-red-700">3</p>
                    <p className="text-xs text-red-600 mt-1">Jobs missed</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 text-center">
                    <p className="text-2xl font-bold text-purple-700">Supply</p>
                    <p className="text-xs text-purple-600 mt-1">Top recurring blocker</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      
      {/* Job Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[550px] sm:max-w-[550px] overflow-y-auto">
          {selectedJob && (
            <>
              <SheetHeader className="pb-4 border-b border-gray-200">
                <SheetTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  {selectedJob.id}
                  <PriorityBadge tier={selectedJob.priorityTier} score={selectedJob.priorityScore} />
                </SheetTitle>
                <p className="text-sm text-gray-500">{selectedJob.program} • {selectedJob.clin}</p>
              </SheetHeader>
              
              <div className="mt-4 space-y-4">
                {/* Overview */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs font-bold text-gray-600 mb-3">OVERVIEW</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <StatusBadge status={selectedJob.status} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Days Late</p>
                      <p className={`font-semibold ${selectedJob.status === "Late" ? "text-red-600" : "text-amber-600"}`}>
                        {selectedJob.status === "Late" ? `+${selectedJob.daysLateContract}` : selectedJob.daysLateContract}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Customer</p>
                      <p className="font-medium">{selectedJob.customer}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Site / Value Stream</p>
                      <p className="text-sm">{selectedJob.site} / {selectedJob.valueStream}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Current Op / Workcenter</p>
                      <p className="text-sm">{selectedJob.currentOperation} / {selectedJob.workcenter}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Owner</p>
                      <p className="font-medium">{selectedJob.owner}</p>
                    </div>
                  </div>
                  {selectedJob.dpasFlag && (
                    <Badge className="mt-2 bg-red-100 text-red-700">DPAS Rated Contract</Badge>
                  )}
                </div>
                
                {/* Priority Decomposition */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-bold text-blue-700 mb-3">PRIORITY SCORE DECOMPOSITION</p>
                  <PriorityDecomposition factors={selectedJob.priorityFactors} />
                </div>
                
                {/* Baselines & Dates */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs font-bold text-gray-600 mb-3">BASELINES & DATES</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Contract/CLIN Date</span>
                      <span className={`font-medium ${selectedJob.daysLateContract > 0 ? "text-red-600" : "text-gray-700"}`}>
                        {formatDate(selectedJob.requiredDate)} ({selectedJob.daysLateContract > 0 ? "+" : ""}{selectedJob.daysLateContract}d)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">IOP/ESD</span>
                      <span className={`font-medium ${selectedJob.daysLateIOP > 0 ? "text-red-600" : "text-gray-700"}`}>
                        ({selectedJob.daysLateIOP > 0 ? "+" : ""}{selectedJob.daysLateIOP}d)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Delivery Plan</span>
                      <span className={`font-medium ${selectedJob.daysLateDeliveryPlan > 0 ? "text-red-600" : "text-gray-700"}`}>
                        ({selectedJob.daysLateDeliveryPlan > 0 ? "+" : ""}{selectedJob.daysLateDeliveryPlan}d)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">PDM Forecast</span>
                      <span className={`font-medium ${selectedJob.daysLatePDM > 0 ? "text-red-600" : "text-gray-700"}`}>
                        ({selectedJob.daysLatePDM > 0 ? "+" : ""}{selectedJob.daysLatePDM}d)
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200">
                      <span className="text-gray-700 font-medium">Predicted Completion</span>
                      <span className="font-semibold">{formatDate(selectedJob.predictedCompletion)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Root Cause Evidence */}
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs font-bold text-amber-700 mb-3">ROOT CAUSE EVIDENCE</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Primary Cause:</span>
                      <Badge variant="outline" style={{ borderColor: ROOT_CAUSE_COLORS[selectedJob.primaryCause], color: ROOT_CAUSE_COLORS[selectedJob.primaryCause] }}>
                        {selectedJob.primaryCause}
                      </Badge>
                    </div>
                    <p className="text-gray-700">{selectedJob.rootCauseDetail}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Blocking Function:</span>
                      <span className="font-medium">{selectedJob.blockingFunction}</span>
                    </div>
                    {(selectedJob.linkedPO || selectedJob.linkedMRB || selectedJob.linkedNC || selectedJob.linkedRI) && (
                      <div className="pt-2 border-t border-amber-200">
                        <p className="text-xs text-amber-700 font-medium mb-1">Linked Evidence:</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedJob.linkedPO && <Badge variant="outline" className="text-xs">{selectedJob.linkedPO}</Badge>}
                          {selectedJob.linkedMRB && <Badge variant="outline" className="text-xs">{selectedJob.linkedMRB}</Badge>}
                          {selectedJob.linkedNC && <Badge variant="outline" className="text-xs">{selectedJob.linkedNC}</Badge>}
                          {selectedJob.linkedRI && <Badge variant="outline" className="text-xs">{selectedJob.linkedRI}</Badge>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Program/CLIN Impact */}
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-xs font-bold text-purple-700 mb-3">PROGRAM / CLIN IMPACT</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Revenue Impact</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(selectedJob.revenueImpact)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">AOP Impact</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(selectedJob.aopImpact)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Critical Path</p>
                      <Badge className={`text-[10px] ${selectedJob.criticalPath ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>
                        {selectedJob.criticalPath ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Fan-Out</p>
                      <p className="font-medium">{selectedJob.fanOut} downstream assemblies</p>
                    </div>
                  </div>
                </div>
                
                {/* Actions & Recovery */}
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs font-bold text-green-700 mb-3">ACTIONS & RECOVERY</p>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Next Action</p>
                      <p className="font-medium text-gray-900">{selectedJob.nextAction}</p>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Recovery ETA:</span>
                      <span className="font-semibold">{formatDate(selectedJob.recoveryETA)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Updated:</span>
                      <span>{selectedJob.lastUpdated.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
