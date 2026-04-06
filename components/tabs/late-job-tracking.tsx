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
  daysOnProtectList: number // How long this job has been on the protect list
  protectListEntryDate: Date // When the job entered the protect list
  actionTaken: string | null
  actionWorked: boolean | null
  actionStatus: "Open" | "In Progress" | "Waiting" | "Escalated" | "Resolved"
  escalationNeeded: boolean
  lastOwnerUpdate: Date
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
      daysOnProtectList: Math.floor(seededRandom(seed + 53) * 21) + 1, // 1-21 days on protect list
      protectListEntryDate: new Date(Date.now() - Math.floor(seededRandom(seed + 53) * 21 + 1) * 86400000),
      actionTaken: seededRandom(seed + 48) > 0.3 ? ["Expedited", "Escalated", "Alternate source", "Overtime scheduled"][Math.floor(seededRandom(seed + 51) * 4)] : null,
      actionWorked: seededRandom(seed + 48) > 0.3 ? seededRandom(seed + 52) > 0.4 : null,
      actionStatus: ["Open", "In Progress", "Waiting", "Escalated", "Resolved"][Math.floor(seededRandom(seed + 54) * 5)] as LateJob["actionStatus"],
      escalationNeeded: priorityScore >= 75 && seededRandom(seed + 55) > 0.6,
      lastOwnerUpdate: new Date(Date.now() - Math.floor(seededRandom(seed + 56) * 72) * 3600000)
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
  
  // Helper to generate week ending date labels
  const getWeekEndingDate = (weeksAgo: number): string => {
    const now = new Date()
    const target = new Date(now.getTime() - weeksAgo * 7 * 24 * 60 * 60 * 1000)
    // Find next Sunday (end of week)
    const dayOfWeek = target.getDay()
    const daysUntilSunday = (7 - dayOfWeek) % 7
    target.setDate(target.getDate() + daysUntilSunday)
    return `${target.getMonth() + 1}/${target.getDate()}`
  }
  
  // Trend data with real weekly labels
  const trendData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const weeksAgo = 11 - i // So index 0 = 11 weeks ago, index 11 = this week
      const weekLabel = getWeekEndingDate(weeksAgo)
      return {
        week: weekLabel,
        weekFull: `Week ending ${weekLabel}`,
        late: Math.floor(seededRandom(i * 31) * 30) + 40,
        forecastLate: Math.floor(seededRandom(i * 47) * 25) + 20,
        criticalHighPriority: Math.floor(seededRandom(i * 59) * 20) + 15 // Critical + High tier jobs
      }
    })
  }, [])
  
  // Weighted root cause mix data (weighted by priority score and revenue impact)
  const weightedRootCauseData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const weekLabel = getWeekEndingDate(11 - i)
      // Weighted exposure = count * avg priority score * avg revenue factor
      const supplyWeight = (Math.floor(seededRandom(i * 71) * 20) + 10) * (60 + seededRandom(i * 72) * 30) * (0.8 + seededRandom(i * 73) * 0.4)
      const qualityWeight = (Math.floor(seededRandom(i * 83) * 15) + 5) * (55 + seededRandom(i * 84) * 35) * (0.7 + seededRandom(i * 85) * 0.5)
      const capacityWeight = (Math.floor(seededRandom(i * 97) * 12) + 3) * (50 + seededRandom(i * 98) * 30) * (0.6 + seededRandom(i * 99) * 0.4)
      const dataWeight = (Math.floor(seededRandom(i * 101) * 6) + 2) * (40 + seededRandom(i * 102) * 25) * (0.5 + seededRandom(i * 103) * 0.3)
      const otherWeight = (Math.floor(seededRandom(i * 111) * 4) + 1) * (35 + seededRandom(i * 112) * 20) * (0.4 + seededRandom(i * 113) * 0.3)
      
      return {
        week: weekLabel,
        weekFull: `Week ending ${weekLabel}`,
        supply: Math.round(supplyWeight / 100), // Normalize to reasonable scale
        qualityMrb: Math.round(qualityWeight / 100),
        capacityTest: Math.round(capacityWeight / 100),
        dataPlanning: Math.round(dataWeight / 100),
        other: Math.round(otherWeight / 100)
      }
    })
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
            {/* Tab Banner */}
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm text-purple-800">
                <strong>Near-term delivery and milestone commitments</strong> threatened by prioritized jobs in the shared protect/recover list.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Near-Term Commitment Timeline */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <div>
                    <CardTitle className="text-sm font-bold text-gray-800">Near-Term Commitment Timeline</CardTitle>
                    <p className="text-[10px] text-gray-500 mt-0.5">Upcoming CLINs / milestones with linked prioritized jobs</p>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3 max-h-[300px] overflow-auto">
                    {clinImpacts.slice(0, 8).map((impact, idx) => (
                      <div 
                        key={idx} 
                        className={`p-3 rounded-lg border cursor-pointer hover:border-blue-400 transition-colors ${
                          impact.recoveryConfidence === "Low" ? "bg-red-50 border-red-200" : 
                          impact.recoveryConfidence === "Medium" ? "bg-amber-50 border-amber-200" : 
                          "bg-gray-50 border-gray-200"
                        }`}
                        onClick={() => navigateToJobsWithFilter({ clin: impact.clin })}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-900">{impact.program}</span>
                            <Badge variant="outline" className="text-[9px]">{impact.milestoneType}</Badge>
                            {impact.dpasFlag && <Badge className="text-[8px] bg-red-100 text-red-700">DPAS</Badge>}
                          </div>
                          <span className="text-xs text-gray-600">{formatDate(impact.requiredDate)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-gray-600">
                              <strong className="text-red-600">{impact.linkedLateJobs}</strong> Late + 
                              <strong className="text-amber-600"> {impact.linkedForecastLateJobs}</strong> Forecast
                            </span>
                            <PriorityBadge tier={impact.highestPriorityTier} />
                          </div>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge className={`text-[9px] ${
                                impact.recoveryConfidence === "High" ? "bg-green-100 text-green-700" : 
                                impact.recoveryConfidence === "Medium" ? "bg-amber-100 text-amber-700" : 
                                "bg-red-100 text-red-700"
                              }`}>
                                {impact.recoveryConfidence} Confidence
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-xs bg-gray-900 text-white p-2">
                              <p className="font-semibold mb-1">Recovery Confidence Factors:</p>
                              <p>{impact.recoveryConfidenceFactors.explanation}</p>
                              <div className="mt-1 text-[10px] text-gray-300">
                                <p>Material: {impact.recoveryConfidenceFactors.materialAvailability}</p>
                                <p>Supplier: {impact.recoveryConfidenceFactors.supplierReliability}</p>
                                <p>Capacity: {impact.recoveryConfidenceFactors.capacityAvailable ? "Available" : "Constrained"}</p>
                                <p>Time: {impact.daysToCommitment}d remaining</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="text-[10px] text-blue-600 mt-1">Click to view linked jobs →</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* CLIN Risk Heatmap with Real Dates */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <div>
                    <CardTitle className="text-sm font-bold text-gray-800">Commitment Risk by Week</CardTitle>
                    <p className="text-[10px] text-gray-500 mt-0.5">Weighted commitment risk, click cells to drill into jobs</p>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-12 gap-1">
                    <div className="col-span-2" />
                    {Array.from({ length: 10 }, (_, i) => {
                      const weekDate = new Date(Date.now() + i * 7 * 86400000)
                      return (
                        <div key={i} className="text-center text-[9px] text-gray-500 font-medium">
                          {weekDate.getMonth() + 1}/{weekDate.getDate()}
                        </div>
                      )
                    })}
                    {programs.slice(0, 5).map((program, pIdx) => (
                      <>
                        <div key={`label-${pIdx}`} className="col-span-2 text-[10px] font-medium text-gray-700 truncate pr-2">
                          {program.split(" ")[0]}
                        </div>
                        {Array.from({ length: 10 }, (_, wIdx) => {
                          const linkedJobs = Math.floor(seededRandom(pIdx * 100 + wIdx) * 5)
                          const highestPriority = Math.floor(seededRandom(pIdx * 100 + wIdx + 50) * 100)
                          const risk = linkedJobs * (highestPriority / 100) * 20
                          return (
                            <Tooltip key={`cell-${pIdx}-${wIdx}`}>
                              <TooltipTrigger asChild>
                                <div
                                  className="h-8 rounded flex items-center justify-center text-[10px] font-medium cursor-pointer hover:ring-2 hover:ring-blue-400"
                                  style={{
                                    backgroundColor: risk > 50 ? "#fee2e2" : risk > 25 ? "#fef3c7" : risk > 5 ? "#dbeafe" : "#f3f4f6",
                                    color: risk > 50 ? "#991b1b" : risk > 25 ? "#92400e" : risk > 5 ? "#1e40af" : "#6b7280"
                                  }}
                                  onClick={() => navigateToJobsWithFilter({ priorityTier: highestPriority >= 85 ? "Critical" : highestPriority >= 65 ? "High" : "Medium" })}
                                >
                                  {linkedJobs > 0 ? linkedJobs : ""}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs bg-gray-900 text-white p-2">
                                <p className="font-semibold">{program}</p>
                                <p>Week of {new Date(Date.now() + wIdx * 7 * 86400000).toLocaleDateString()}</p>
                                <p className="mt-1">Linked Jobs: {linkedJobs}</p>
                                <p>Highest Priority: {highestPriority}</p>
                                <p>Primary Blocker: Supply Shortage</p>
                                <p>Revenue at Risk: {formatCurrency(linkedJobs * 500000)}</p>
                              </TooltipContent>
                            </Tooltip>
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
            </div>
            
            {/* Jobs Driving Commitment Risk - Enhanced */}
            <Card className="border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-gray-800">Commitments at Risk</CardTitle>
                    <p className="text-[10px] text-gray-500 mt-0.5">CLINs/milestones with linked Late and Forecast-Late jobs</p>
                  </div>
                  <Badge className="bg-purple-100 text-purple-700 text-[10px]">Click rows to filter job list</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[400px] overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-2 font-semibold text-gray-700">Program</th>
                        <th className="text-left p-2 font-semibold text-gray-700">CLIN</th>
                        <th className="text-center p-2 font-semibold text-gray-700">Milestone</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Customer</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Required Date</th>
                        <th className="text-center p-2 font-semibold text-gray-700">Days to Commit</th>
                        <th className="text-center p-2 font-semibold text-gray-700">
                          <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1">
                              Late / Forecast <Info className="w-3 h-3 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent className="text-xs bg-gray-900 text-white p-2">
                              Count of Late jobs / Forecast-Late jobs linked to this commitment
                            </TooltipContent>
                          </Tooltip>
                        </th>
                        <th className="text-center p-2 font-semibold text-gray-700">Priority</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Primary Blocker</th>
                        <th className="text-right p-2 font-semibold text-gray-700">Revenue at Risk</th>
                        <th className="text-center p-2 font-semibold text-gray-700">DPAS</th>
                        <th className="text-center p-2 font-semibold text-gray-700">
                          <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1">
                              Confidence <Info className="w-3 h-3 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent className="text-xs bg-gray-900 text-white p-2 max-w-xs">
                              Based on: time remaining, blocker severity, open actions, supply certainty, capacity status
                            </TooltipContent>
                          </Tooltip>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {clinImpacts.slice(0, 20).map((impact, idx) => (
                        <tr 
                          key={idx} 
                          className={`hover:bg-blue-50 cursor-pointer ${impact.recoveryConfidence === "Low" ? "bg-red-50/30" : ""}`}
                          onClick={() => navigateToJobsWithFilter({ clin: impact.clin })}
                        >
                          <td className="p-2 font-medium text-gray-900">{impact.program}</td>
                          <td className="p-2 text-blue-600 hover:underline">{impact.clin}</td>
                          <td className="p-2 text-center">
                            <Badge variant="outline" className="text-[9px]">{impact.milestoneType}</Badge>
                          </td>
                          <td className="p-2 text-gray-700">{impact.customer}</td>
                          <td className="p-2 text-gray-600">{formatDate(impact.requiredDate)}</td>
                          <td className={`p-2 text-center font-semibold ${impact.daysToCommitment <= 7 ? "text-red-600" : impact.daysToCommitment <= 14 ? "text-amber-600" : "text-gray-700"}`}>
                            {impact.daysToCommitment}d
                          </td>
                          <td className="p-2 text-center">
                            <span className="text-red-600 font-semibold">{impact.linkedLateJobs}</span>
                            <span className="text-gray-400"> / </span>
                            <span className="text-amber-600 font-semibold">{impact.linkedForecastLateJobs}</span>
                          </td>
                          <td className="p-2 text-center">
                            <PriorityBadge tier={impact.highestPriorityTier} score={impact.highestPriority} />
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
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge className={`text-[9px] ${impact.recoveryConfidence === "High" ? "bg-green-100 text-green-700" : impact.recoveryConfidence === "Medium" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                                  {impact.recoveryConfidence}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs bg-gray-900 text-white p-2 max-w-xs">
                                {impact.recoveryConfidenceFactors.explanation}
                              </TooltipContent>
                            </Tooltip>
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
            {/* Hotspot Lens Toggle */}
            <Card className="border border-gray-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-700">Evidence Lens:</span>
                  {[
                    { id: "all", label: "All", icon: Layers },
                    { id: "supplier", label: "Supplier", icon: Truck },
                    { id: "quality", label: "Quality/MRB/RI", icon: AlertTriangle },
                    { id: "capacity", label: "Workcenter/Test", icon: Wrench },
                    { id: "material", label: "Inventory/Material", icon: Package },
                    { id: "planning", label: "Planning/Data", icon: FileText }
                  ].map(lens => (
                    <button
                      key={lens.id}
                      onClick={() => {
                        if (lens.id === "supplier") navigateToJobsWithFilter({ rootCause: "Supplier Slip" })
                        else if (lens.id === "quality") navigateToJobsWithFilter({ rootCause: "MRB/RI Hold" })
                        else if (lens.id === "capacity") navigateToJobsWithFilter({ rootCause: "Capacity Constraint" })
                        else if (lens.id === "material") navigateToJobsWithFilter({ rootCause: "Supply Shortage" })
                        else if (lens.id === "planning") navigateToJobsWithFilter({ rootCause: "Data/Planning" })
                        else clearDrillDownFilters()
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium transition-colors ${
                        lens.id === "all" && !drillDownRootCause
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      <lens.icon className="w-3.5 h-3.5" />
                      {lens.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-500 mt-2">Select a lens to filter the prioritized job list by evidence category</p>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Weighted Root Cause Pareto */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <div>
                    <CardTitle className="text-sm font-bold text-gray-800">Weighted Root Cause Pareto</CardTitle>
                    <p className="text-[10px] text-gray-500 mt-0.5">Click bars to filter job list by root cause</p>
                  </div>
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
                                <p>Job Count: {data.count}</p>
                                <p>Weighted Impact: {data.weightedImpact.toFixed(0)}</p>
                                <p className="text-blue-600 text-[10px] mt-1">Click to filter job list</p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar 
                        dataKey="weightedImpact" 
                        fill={COLORS.primary} 
                        radius={[0, 4, 4, 0]}
                        onClick={(data) => navigateToJobsWithFilter({ rootCause: data.cause as RootCause })}
                        cursor="pointer"
                      >
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
                  <div>
                    <CardTitle className="text-sm font-bold text-gray-800">Blocking Function Distribution</CardTitle>
                    <p className="text-[10px] text-gray-500 mt-0.5">Jobs by blocking function and priority tier</p>
                  </div>
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
            
            {/* Evidence-Based Action Queue */}
            <Card className="border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-gray-800">Action Queue for High-Impact Jobs</CardTitle>
                    <p className="text-[10px] text-gray-500 mt-0.5">Evidence-linked recovery actions for Critical and High priority jobs</p>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700 text-[10px]">Operational Focus</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[400px] overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-2 font-semibold text-gray-700">Job ID</th>
                        <th className="text-center p-2 font-semibold text-gray-700">Priority</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Root Cause</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Evidence Type</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Evidence Reference</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Blocking Function</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Owner</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Next Action</th>
                        <th className="text-center p-2 font-semibold text-gray-700">Action Status</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Recovery ETA</th>
                        <th className="text-center p-2 font-semibold text-gray-700">Escalation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredJobs.filter(j => j.priorityTier === "Critical" || j.priorityTier === "High").slice(0, 15).map((job) => {
                        // Determine evidence type based on root cause
                        let evidenceType = "General"
                        let evidenceRef = "-"
                        let evidenceStatus = ""
                        if (job.linkedPO) { evidenceType = "PO"; evidenceRef = job.linkedPO; evidenceStatus = job.poPromiseDate ? `Promise: ${formatDate(job.poPromiseDate)}` : "" }
                        else if (job.linkedMRB) { evidenceType = "MRB"; evidenceRef = job.linkedMRB; evidenceStatus = job.mrbStatus || "" }
                        else if (job.linkedNC) { evidenceType = "NC"; evidenceRef = job.linkedNC; evidenceStatus = job.ncStatus || "" }
                        else if (job.linkedRI) { evidenceType = "RI"; evidenceRef = job.linkedRI; evidenceStatus = job.riStatus || "" }
                        else if (job.linkedRouting) { evidenceType = "Routing"; evidenceRef = job.linkedRouting; evidenceStatus = job.routingStatus || "" }
                        else if (job.linkedCapacity) { evidenceType = "Capacity"; evidenceRef = job.linkedCapacity; evidenceStatus = job.capacityQueue ? `Queue: ${job.capacityQueue}` : "" }
                        
                        return (
                          <tr key={job.id} className={`hover:bg-blue-50 cursor-pointer ${job.escalationNeeded ? "bg-red-50/30" : ""}`} onClick={() => handleSelectJob(job)}>
                            <td className="p-2 font-mono text-blue-600">{job.id}</td>
                            <td className="p-2 text-center"><PriorityBadge tier={job.priorityTier} /></td>
                            <td className="p-2">
                              <Badge variant="outline" className="text-[9px]" style={{ borderColor: ROOT_CAUSE_COLORS[job.primaryCause], color: ROOT_CAUSE_COLORS[job.primaryCause] }}>
                                {job.primaryCause}
                              </Badge>
                            </td>
                            <td className="p-2">
                              <Badge className={`text-[9px] ${
                                evidenceType === "PO" ? "bg-purple-100 text-purple-700" :
                                evidenceType === "MRB" || evidenceType === "NC" || evidenceType === "RI" ? "bg-pink-100 text-pink-700" :
                                evidenceType === "Routing" ? "bg-cyan-100 text-cyan-700" :
                                evidenceType === "Capacity" ? "bg-orange-100 text-orange-700" :
                                "bg-gray-100 text-gray-600"
                              }`}>
                                {evidenceType}
                              </Badge>
                            </td>
                            <td className="p-2">
                              <span className="font-mono text-blue-600">{evidenceRef}</span>
                              {evidenceStatus && <span className="text-[9px] text-gray-500 block">{evidenceStatus}</span>}
                            </td>
                            <td className="p-2 text-gray-700">{job.blockingFunction}</td>
                            <td className="p-2 text-gray-700">{job.owner}</td>
                            <td className="p-2 text-gray-600 max-w-[150px] truncate" title={job.nextAction}>{job.nextAction}</td>
                            <td className="p-2 text-center">
                              <Badge className={`text-[9px] ${
                                job.actionStatus === "Open" ? "bg-gray-100 text-gray-600" :
                                job.actionStatus === "In Progress" ? "bg-blue-100 text-blue-700" :
                                job.actionStatus === "Waiting" ? "bg-amber-100 text-amber-700" :
                                job.actionStatus === "Escalated" ? "bg-red-100 text-red-700" :
                                "bg-green-100 text-green-700"
                              }`}>
                                {job.actionStatus}
                              </Badge>
                            </td>
                            <td className="p-2 text-gray-600">{formatDate(job.recoveryETA)}</td>
                            <td className="p-2 text-center">
                              {job.escalationNeeded ? (
                                <Badge className="text-[8px] bg-red-100 text-red-700">Needed</Badge>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
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
                {/* Key Metrics for Production Control */}
                <div className="grid grid-cols-4 gap-4">
                  <Card className="border border-gray-200 p-3">
                    <div className="text-[10px] text-gray-500 uppercase">Constrained Workcenter Queue</div>
                    <div className="text-xl font-bold text-gray-900">{filteredJobs.filter(j => j.linkedCapacity).length}</div>
                    <div className="text-[10px] text-gray-500">jobs at capacity-limited cells</div>
                  </Card>
                  <Card className="border border-gray-200 p-3">
                    <div className="text-[10px] text-gray-500 uppercase">Ready to Run</div>
                    <div className="text-xl font-bold text-green-600">{filteredJobs.filter(j => j.materialStatus === "Available" && j.actionStatus !== "Waiting").length}</div>
                    <div className="text-[10px] text-gray-500">if blocker cleared today</div>
                  </Card>
                  <Card className="border border-gray-200 p-3">
                    <div className="text-[10px] text-gray-500 uppercase">Material Blocked</div>
                    <div className="text-xl font-bold text-red-600">{filteredJobs.filter(j => j.materialStatus === "Pending" || j.materialStatus === "On Order").length}</div>
                    <div className="text-[10px] text-gray-500">awaiting material</div>
                  </Card>
                  <Card className="border border-gray-200 p-3">
                    <div className="text-[10px] text-gray-500 uppercase">Test Cell Queue</div>
                    <div className="text-xl font-bold text-amber-600">{filteredJobs.filter(j => j.testCell).length}</div>
                    <div className="text-[10px] text-gray-500">jobs needing test</div>
                  </Card>
                </div>
                
                <Card className="border border-gray-200">
                  <CardHeader className="py-3 px-4 border-b border-gray-100">
                    <div>
                      <CardTitle className="text-sm font-bold text-gray-800">Release & Sequence Queue</CardTitle>
                      <p className="text-[10px] text-gray-500 mt-0.5">Focus: Current operation, workcenter, material readiness, next action</p>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-[450px] overflow-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr className="border-b border-gray-200">
                            <th className="text-left p-2 font-semibold text-gray-700">Rank</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Job ID</th>
                            <th className="text-center p-2 font-semibold text-gray-700">Priority</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Program</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Current Op</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Workcenter</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Test Cell</th>
                            <th className="text-center p-2 font-semibold text-gray-700">Status</th>
                            <th className="text-center p-2 font-semibold text-gray-700">
                              <Tooltip>
                                <TooltipTrigger className="flex items-center gap-1">Days Late/Risk <Info className="w-3 h-3" /></TooltipTrigger>
                                <TooltipContent className="text-xs">Days Late (red) or Days to Risk (amber)</TooltipContent>
                              </Tooltip>
                            </th>
                            <th className="text-left p-2 font-semibold text-gray-700">Required</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Material</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Next Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredJobs.slice(0, 25).map((job) => (
                            <tr key={job.id} className={`hover:bg-blue-50 cursor-pointer ${job.priorityTier === "Critical" ? "bg-red-50/30" : ""}`} onClick={() => handleSelectJob(job)}>
                              <td className="p-2 font-bold text-gray-900">{job.rank}</td>
                              <td className="p-2 font-mono text-blue-600">{job.id}</td>
                              <td className="p-2 text-center"><PriorityBadge tier={job.priorityTier} /></td>
                              <td className="p-2 text-gray-700">{job.program.split(" ")[0]}</td>
                              <td className="p-2 text-gray-600">{job.currentOperation}</td>
                              <td className="p-2 text-gray-600">{job.workcenter}</td>
                              <td className="p-2 text-gray-600 text-[10px]">{job.testCell || "-"}</td>
                              <td className="p-2 text-center"><StatusBadge status={job.status} /></td>
                              <td className={`p-2 text-center font-semibold ${job.status === "Late" ? "text-red-600" : "text-amber-600"}`}>
                                {job.status === "Late" ? `+${job.daysLate}d` : `${job.daysToLateRisk}d`}
                              </td>
                              <td className="p-2 text-gray-600">{formatDate(job.requiredDate)}</td>
                              <td className="p-2">
                                <Badge className={`text-[9px] ${job.materialStatus === "Available" ? "bg-green-100 text-green-700" : job.materialStatus === "Partial" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                                  {job.materialStatus}
                                </Badge>
                              </td>
                              <td className="p-2 text-gray-600 max-w-[130px] truncate" title={job.nextAction}>{job.nextAction}</td>
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
              <div className="space-y-4">
                {/* Key Metrics for Supply Chain */}
                <div className="grid grid-cols-4 gap-4">
                  <Card className="border border-gray-200 p-3">
                    <div className="text-[10px] text-gray-500 uppercase">Supplier-Driven Late Jobs</div>
                    <div className="text-xl font-bold text-purple-600">{filteredJobs.filter(j => ["Supply Shortage", "Late PR/PO", "Supplier Slip"].includes(j.primaryCause)).length}</div>
                    <div className="text-[10px] text-gray-500">require supply action</div>
                  </Card>
                  <Card className="border border-gray-200 p-3">
                    <div className="text-[10px] text-gray-500 uppercase">PO Not Released</div>
                    <div className="text-xl font-bold text-red-600">{filteredJobs.filter(j => j.primaryCause === "Late PR/PO").length}</div>
                    <div className="text-[10px] text-gray-500">PR/PO action needed</div>
                  </Card>
                  <Card className="border border-gray-200 p-3">
                    <div className="text-[10px] text-gray-500 uppercase">Supplier Slips</div>
                    <div className="text-xl font-bold text-amber-600">{filteredJobs.filter(j => j.supplierSlipDays && j.supplierSlipDays > 0).length}</div>
                    <div className="text-[10px] text-gray-500">promise date missed</div>
                  </Card>
                  <Card className="border border-gray-200 p-3">
                    <div className="text-[10px] text-gray-500 uppercase">Expedite Candidates</div>
                    <div className="text-xl font-bold text-blue-600">{filteredJobs.filter(j => j.linkedPO && j.priorityTier === "Critical").length}</div>
                    <div className="text-[10px] text-gray-500">critical with PO</div>
                  </Card>
                </div>
                
                <Card className="border border-gray-200">
                  <CardHeader className="py-3 px-4 border-b border-gray-100">
                    <div>
                      <CardTitle className="text-sm font-bold text-gray-800">Prioritized Expedite Queue</CardTitle>
                      <p className="text-[10px] text-gray-500 mt-0.5">Focus: Supplier, PO/PR status, promise date, slip history, expedite action</p>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-[450px] overflow-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr className="border-b border-gray-200">
                            <th className="text-left p-2 font-semibold text-gray-700">Job ID</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Program/CLIN</th>
                            <th className="text-center p-2 font-semibold text-gray-700">Priority</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Cause</th>
                            <th className="text-left p-2 font-semibold text-gray-700">PO/PR Ref</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Promise Date</th>
                            <th className="text-center p-2 font-semibold text-gray-700">
                              <Tooltip>
                                <TooltipTrigger className="flex items-center gap-1">Slip <Info className="w-3 h-3" /></TooltipTrigger>
                                <TooltipContent className="text-xs">Supplier historical slip days</TooltipContent>
                              </Tooltip>
                            </th>
                            <th className="text-left p-2 font-semibold text-gray-700">Material</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Next Supply Action</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Owner</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredJobs.filter(j => ["Supply Shortage", "Late PR/PO", "Supplier Slip"].includes(j.primaryCause) || j.blockingFunction === "Supply Chain").slice(0, 25).map((job) => (
                            <tr key={job.id} className={`hover:bg-blue-50 cursor-pointer ${job.escalationNeeded ? "bg-red-50/30" : ""}`} onClick={() => handleSelectJob(job)}>
                              <td className="p-2 font-mono text-blue-600">{job.id}</td>
                              <td className="p-2 text-gray-700">
                                <div className="text-[10px]">{job.program.split(" ")[0]}</div>
                                <div className="text-blue-600 text-[9px]">{job.clin}</div>
                              </td>
                              <td className="p-2 text-center"><PriorityBadge tier={job.priorityTier} /></td>
                              <td className="p-2">
                                <Badge variant="outline" className="text-[9px]" style={{ borderColor: ROOT_CAUSE_COLORS[job.primaryCause], color: ROOT_CAUSE_COLORS[job.primaryCause] }}>
                                  {job.primaryCause}
                                </Badge>
                              </td>
                              <td className="p-2 font-mono text-blue-600 text-[10px]">{job.linkedPO || "PR Pending"}</td>
                              <td className="p-2 text-gray-600">{job.supplierPromiseDate ? formatDate(job.supplierPromiseDate) : "-"}</td>
                              <td className={`p-2 text-center font-semibold ${(job.supplierSlipDays || 0) > 5 ? "text-red-600" : (job.supplierSlipDays || 0) > 0 ? "text-amber-600" : "text-gray-400"}`}>
                                {job.supplierSlipDays ? `+${job.supplierSlipDays}d` : "-"}
                              </td>
                              <td className="p-2">
                                <Badge className={`text-[9px] ${job.materialStatus === "Available" ? "bg-green-100 text-green-700" : job.materialStatus === "In Transit" ? "bg-blue-100 text-blue-700" : job.materialStatus === "Partial" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                                  {job.materialStatus}
                                </Badge>
                              </td>
                              <td className="p-2 text-gray-600 max-w-[140px] truncate" title={job.nextAction}>{job.nextAction}</td>
                              <td className="p-2 text-gray-600 text-[10px]">{job.owner.split(" ")[0]}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Quality View */}
            {workbenchRole === "quality" && (
              <div className="space-y-4">
                {/* Key Metrics for Quality */}
                <div className="grid grid-cols-4 gap-4">
                  <Card className="border border-gray-200 p-3">
                    <div className="text-[10px] text-gray-500 uppercase">MRB/RI/NC Driven</div>
                    <div className="text-xl font-bold text-pink-600">{filteredJobs.filter(j => j.linkedMRB || j.linkedNC || j.linkedRI).length}</div>
                    <div className="text-[10px] text-gray-500">quality holds blocking OTD</div>
                  </Card>
                  <Card className="border border-gray-200 p-3">
                    <div className="text-[10px] text-gray-500 uppercase">Awaiting Disposition</div>
                    <div className="text-xl font-bold text-red-600">{filteredJobs.filter(j => j.mrbStatus === "Awaiting Disposition" || j.riStatus === "Queued").length}</div>
                    <div className="text-[10px] text-gray-500">urgent disposition needed</div>
                  </Card>
                  <Card className="border border-gray-200 p-3">
                    <div className="text-[10px] text-gray-500 uppercase">NC Investigation</div>
                    <div className="text-xl font-bold text-amber-600">{filteredJobs.filter(j => j.ncStatus === "Investigation" || j.ncStatus === "Open").length}</div>
                    <div className="text-[10px] text-gray-500">NC in progress</div>
                  </Card>
                  <Card className="border border-gray-200 p-3">
                    <div className="text-[10px] text-gray-500 uppercase">OTD Impact</div>
                    <div className="text-xl font-bold text-gray-900">{formatCurrency(filteredJobs.filter(j => j.blockingFunction === "Quality/MRB").reduce((sum, j) => sum + j.revenueImpact, 0))}</div>
                    <div className="text-[10px] text-gray-500">revenue at risk</div>
                  </Card>
                </div>
                
                <Card className="border border-gray-200">
                  <CardHeader className="py-3 px-4 border-b border-gray-100">
                    <div>
                      <CardTitle className="text-sm font-bold text-gray-800">MRB/RI/NC Disposition Queue</CardTitle>
                      <p className="text-[10px] text-gray-500 mt-0.5">Focus: Quality hold type, MRB/RI/NC reference, aging, disposition owner, recovery ETA</p>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-[450px] overflow-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr className="border-b border-gray-200">
                            <th className="text-left p-2 font-semibold text-gray-700">Job ID</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Program/CLIN</th>
                            <th className="text-center p-2 font-semibold text-gray-700">Priority</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Hold Type</th>
                            <th className="text-left p-2 font-semibold text-gray-700">MRB/RI/NC Ref</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Status</th>
                            <th className="text-center p-2 font-semibold text-gray-700">
                              <Tooltip>
                                <TooltipTrigger className="flex items-center gap-1">Aging <Info className="w-3 h-3" /></TooltipTrigger>
                                <TooltipContent className="text-xs">Days on protect list</TooltipContent>
                              </Tooltip>
                            </th>
                            <th className="text-left p-2 font-semibold text-gray-700">Disposition Owner</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Next Action</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Recovery ETA</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredJobs.filter(j => j.blockingFunction === "Quality/MRB" || j.linkedMRB || j.linkedNC || j.linkedRI).slice(0, 25).map((job) => {
                            const holdType = job.linkedMRB ? "MRB" : job.linkedNC ? "NC" : job.linkedRI ? "RI" : "Quality"
                            const holdRef = job.linkedMRB || job.linkedNC || job.linkedRI || "-"
                            const holdStatus = job.mrbStatus || job.ncStatus || job.riStatus || "Pending"
                            
                            return (
                              <tr key={job.id} className={`hover:bg-blue-50 cursor-pointer ${job.daysOnProtectList > 10 ? "bg-red-50/30" : ""}`} onClick={() => handleSelectJob(job)}>
                                <td className="p-2 font-mono text-blue-600">{job.id}</td>
                                <td className="p-2 text-gray-700">
                                  <div className="text-[10px]">{job.program.split(" ")[0]}</div>
                                  <div className="text-blue-600 text-[9px]">{job.clin}</div>
                                </td>
                                <td className="p-2 text-center"><PriorityBadge tier={job.priorityTier} /></td>
                                <td className="p-2">
                                  <Badge className={`text-[9px] ${holdType === "MRB" ? "bg-pink-100 text-pink-700" : holdType === "NC" ? "bg-red-100 text-red-700" : holdType === "RI" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>
                                    {holdType}
                                  </Badge>
                                </td>
                                <td className="p-2 font-mono text-blue-600 text-[10px]">{holdRef}</td>
                                <td className="p-2">
                                  <Badge variant="outline" className="text-[9px]">{holdStatus}</Badge>
                                </td>
                                <td className={`p-2 text-center font-semibold ${job.daysOnProtectList > 10 ? "text-red-600" : job.daysOnProtectList > 5 ? "text-amber-600" : "text-gray-600"}`}>
                                  {job.daysOnProtectList}d
                                </td>
                                <td className="p-2 text-gray-600 text-[10px]">{job.owner}</td>
                                <td className="p-2 text-gray-600 max-w-[130px] truncate" title={job.nextAction}>{job.nextAction}</td>
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
            
            {/* PDM/Program View */}
            {workbenchRole === "pdm-program" && (
              <div className="space-y-4">
                {/* Key Metrics for PDM/Program */}
                <div className="grid grid-cols-4 gap-4">
                  <Card className="border border-gray-200 p-3">
                    <div className="text-[10px] text-gray-500 uppercase">DPAS-Rated Jobs</div>
                    <div className="text-xl font-bold text-red-600">{filteredJobs.filter(j => j.dpasFlag).length}</div>
                    <div className="text-[10px] text-gray-500">government priority</div>
                  </Card>
                  <Card className="border border-gray-200 p-3">
                    <div className="text-[10px] text-gray-500 uppercase">Revenue at Risk</div>
                    <div className="text-xl font-bold text-gray-900">{formatCurrency(filteredJobs.reduce((sum, j) => sum + j.revenueImpact, 0))}</div>
                    <div className="text-[10px] text-gray-500">total exposure</div>
                  </Card>
                  <Card className="border border-gray-200 p-3">
                    <div className="text-[10px] text-gray-500 uppercase">Escalation Needed</div>
                    <div className="text-xl font-bold text-amber-600">{filteredJobs.filter(j => j.escalationNeeded).length}</div>
                    <div className="text-[10px] text-gray-500">require leadership attention</div>
                  </Card>
                  <Card className="border border-gray-200 p-3">
                    <div className="text-[10px] text-gray-500 uppercase">Critical Path Jobs</div>
                    <div className="text-xl font-bold text-purple-600">{filteredJobs.filter(j => j.criticalPath).length}</div>
                    <div className="text-[10px] text-gray-500">on critical path</div>
                  </Card>
                </div>
                
                <Card className="border border-gray-200">
                  <CardHeader className="py-3 px-4 border-b border-gray-100">
                    <div>
                      <CardTitle className="text-sm font-bold text-gray-800">CLIN & Milestone Risk View</CardTitle>
                      <p className="text-[10px] text-gray-500 mt-0.5">Focus: CLIN/milestone risk, customer visibility, DPAS flags, revenue/AOP impact, escalation needs</p>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-[450px] overflow-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr className="border-b border-gray-200">
                            <th className="text-left p-2 font-semibold text-gray-700">Program</th>
                            <th className="text-left p-2 font-semibold text-gray-700">CLIN</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Job ID</th>
                            <th className="text-center p-2 font-semibold text-gray-700">Priority</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Required Date</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Blocker</th>
                            <th className="text-right p-2 font-semibold text-gray-700">Revenue Impact</th>
                            <th className="text-right p-2 font-semibold text-gray-700">AOP Impact</th>
                            <th className="text-center p-2 font-semibold text-gray-700">Customer/DPAS</th>
                            <th className="text-center p-2 font-semibold text-gray-700">
                              <Tooltip>
                                <TooltipTrigger className="flex items-center gap-1">Recovery <Info className="w-3 h-3" /></TooltipTrigger>
                                <TooltipContent className="text-xs">Recovery confidence based on current status</TooltipContent>
                              </Tooltip>
                            </th>
                            <th className="text-center p-2 font-semibold text-gray-700">Escalation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredJobs.filter(j => j.dpasFlag || j.criticalContract || j.priorityTier === "Critical").slice(0, 25).map((job) => {
                            // Calculate recovery confidence for job
                            const daysRemaining = job.status === "Late" ? 0 : job.daysToLateRisk
                            const hasBlocker = job.actionStatus === "Waiting" || job.actionStatus === "Open"
                            const recoveryConf = daysRemaining > 10 && !hasBlocker ? "High" : daysRemaining > 5 || !hasBlocker ? "Medium" : "Low"
                            
                            return (
                              <tr key={job.id} className={`hover:bg-blue-50 cursor-pointer ${job.escalationNeeded ? "bg-red-50/30" : ""}`} onClick={() => handleSelectJob(job)}>
                                <td className="p-2 font-medium text-gray-900">{job.program}</td>
                                <td className="p-2 text-blue-600">{job.clin}</td>
                                <td className="p-2 font-mono text-blue-600 text-[10px]">{job.id}</td>
                                <td className="p-2 text-center"><PriorityBadge tier={job.priorityTier} /></td>
                                <td className="p-2 text-gray-600">{formatDate(job.requiredDate)}</td>
                                <td className="p-2">
                                  <Badge variant="outline" className="text-[9px]" style={{ borderColor: ROOT_CAUSE_COLORS[job.primaryCause], color: ROOT_CAUSE_COLORS[job.primaryCause] }}>
                                    {job.primaryCause}
                                  </Badge>
                                </td>
                                <td className="p-2 text-right font-medium text-gray-700">{formatCurrency(job.revenueImpact)}</td>
                                <td className="p-2 text-right font-medium text-gray-600">{formatCurrency(job.aopImpact)}</td>
                                <td className="p-2 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <span className="text-[9px] text-gray-600">{job.customer}</span>
                                    {job.dpasFlag && <Badge className="text-[7px] bg-red-100 text-red-700">DPAS</Badge>}
                                  </div>
                                </td>
                                <td className="p-2 text-center">
                                  <Badge className={`text-[9px] ${recoveryConf === "High" ? "bg-green-100 text-green-700" : recoveryConf === "Medium" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                                    {recoveryConf}
                                  </Badge>
                                </td>
                                <td className="p-2 text-center">
                                  {job.escalationNeeded ? (
                                    <Badge className="text-[8px] bg-red-100 text-red-700">Needed</Badge>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
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
          </div>
        )}
        
        {/* TAB 6: Trends & Governance */}
        {activeTab === "trends" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Weekly Late Job Trend */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <div>
                    <CardTitle className="text-sm font-bold text-gray-800">Weekly Late Job Trend</CardTitle>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Weekly count of late jobs, forecast-late jobs, and top-tier prioritized jobs in the selected scope.
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="week" tick={{ fontSize: 9 }} label={{ value: "Week Ending", position: "bottom", fontSize: 9, offset: -5 }} />
                      <YAxis tick={{ fontSize: 10 }} label={{ value: "Job Count", angle: -90, position: "insideLeft", fontSize: 9 }} />
                      <RechartsTooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-lg text-xs">
                                <p className="font-semibold mb-1">Week ending {label}</p>
                                {payload.map((entry, idx) => (
                                  <p key={idx} style={{ color: entry.color }}>
                                    {entry.name}: {entry.value}
                                  </p>
                                ))}
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ fontSize: 10 }} 
                        formatter={(value) => {
                          if (value === "Critical + High Priority") {
                            return (
                              <Tooltip>
                                <TooltipTrigger className="underline decoration-dotted">
                                  {value}
                                </TooltipTrigger>
                                <TooltipContent className="text-xs bg-gray-900 text-white p-2 max-w-xs">
                                  Jobs in the top priority tiers based on shared priority score.
                                </TooltipContent>
                              </Tooltip>
                            )
                          }
                          return value
                        }}
                      />
                      <Line type="monotone" dataKey="late" stroke={COLORS.critical} strokeWidth={2} name="Late Jobs" dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="forecastLate" stroke={COLORS.high} strokeWidth={2} name="Forecast-Late Jobs" dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="criticalHighPriority" stroke={COLORS.primary} strokeWidth={2} name="Critical + High Priority" dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              {/* Weighted Root Cause Mix Over Time */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <div>
                    <CardTitle className="text-sm font-bold text-gray-800">Weighted Root Cause Mix Over Time</CardTitle>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Weekly late-job exposure by primary blocker, weighted by priority score and business impact.
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={weightedRootCauseData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="week" tick={{ fontSize: 9 }} label={{ value: "Week Ending", position: "bottom", fontSize: 9, offset: -5 }} />
                      <YAxis tick={{ fontSize: 10 }} label={{ value: "Weighted Exposure", angle: -90, position: "insideLeft", fontSize: 9 }} />
                      <RechartsTooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-lg text-xs">
                                <p className="font-semibold mb-1">Week ending {label}</p>
                                {payload.map((entry, idx) => (
                                  <p key={idx} style={{ color: entry.color }}>
                                    {entry.name}: {entry.value} exposure units
                                  </p>
                                ))}
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Area type="monotone" dataKey="supply" stackId="1" stroke={COLORS.supply} fill={COLORS.supply} name="Supply" />
                      <Area type="monotone" dataKey="qualityMrb" stackId="1" stroke={COLORS.quality} fill={COLORS.quality} name="Quality/MRB" />
                      <Area type="monotone" dataKey="capacityTest" stackId="1" stroke={COLORS.capacity} fill={COLORS.capacity} name="Capacity/Test" />
                      <Area type="monotone" dataKey="dataPlanning" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" name="Data/Planning" />
                      <Area type="monotone" dataKey="other" stackId="1" stroke={COLORS.low} fill={COLORS.low} name="Other" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            
            {/* Governance Board with Tooltips */}
            <Card className="border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-800">Governance Board</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-5 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-center relative">
                    <Tooltip>
                      <TooltipTrigger className="absolute top-2 right-2">
                        <Info className="w-3.5 h-3.5 text-blue-400 hover:text-blue-600" />
                      </TooltipTrigger>
                      <TooltipContent className="text-xs bg-gray-900 text-white p-2 max-w-xs">
                        Count of unique jobs that appeared on the prioritized protect list during the selected time window. Includes both Late and Forecast-Late jobs that met visibility thresholds.
                      </TooltipContent>
                    </Tooltip>
                    <p className="text-2xl font-bold text-blue-700">24</p>
                    <p className="text-xs text-blue-600 mt-1">Jobs entered protect list</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-center relative">
                    <Tooltip>
                      <TooltipTrigger className="absolute top-2 right-2">
                        <Info className="w-3.5 h-3.5 text-green-400 hover:text-green-600" />
                      </TooltipTrigger>
                      <TooltipContent className="text-xs bg-gray-900 text-white p-2 max-w-xs">
                        Jobs that were on the protect list and subsequently completed on or before their required date after recovery actions were taken. Calculated as: Jobs completed on-time after being flagged as at-risk.
                      </TooltipContent>
                    </Tooltip>
                    <p className="text-2xl font-bold text-green-700">18</p>
                    <p className="text-xs text-green-600 mt-1">Jobs recovered</p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 text-center relative">
                    <Tooltip>
                      <TooltipTrigger className="absolute top-2 right-2">
                        <Info className="w-3.5 h-3.5 text-amber-400 hover:text-amber-600" />
                      </TooltipTrigger>
                      <TooltipContent className="text-xs bg-gray-900 text-white p-2 max-w-xs">
                        Jobs that required escalation to senior leadership, cross-functional tiger teams, or customer communication. Includes jobs moved to Critical tier or flagged for executive review.
                      </TooltipContent>
                    </Tooltip>
                    <p className="text-2xl font-bold text-amber-700">7</p>
                    <p className="text-xs text-amber-600 mt-1">Jobs escalated</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200 text-center relative">
                    <Tooltip>
                      <TooltipTrigger className="absolute top-2 right-2">
                        <Info className="w-3.5 h-3.5 text-red-400 hover:text-red-600" />
                      </TooltipTrigger>
                      <TooltipContent className="text-xs bg-gray-900 text-white p-2 max-w-xs">
                        Jobs that missed their required date despite being on the protect list. Calculated as: Jobs on protect list whose actual completion date exceeded required date. Used for closed-loop learning.
                      </TooltipContent>
                    </Tooltip>
                    <p className="text-2xl font-bold text-red-700">3</p>
                    <p className="text-xs text-red-600 mt-1">Jobs missed</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 text-center relative">
                    <Tooltip>
                      <TooltipTrigger className="absolute top-2 right-2">
                        <Info className="w-3.5 h-3.5 text-purple-400 hover:text-purple-600" />
                      </TooltipTrigger>
                      <TooltipContent className="text-xs bg-gray-900 text-white p-2 max-w-xs">
                        Most frequent primary root cause category across all jobs on the protect list during the time window, weighted by priority score. Identifies systemic issues requiring process improvement.
                      </TooltipContent>
                    </Tooltip>
                    <p className="text-2xl font-bold text-purple-700">Supply</p>
                    <p className="text-xs text-purple-600 mt-1">Top recurring blocker</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Closed-Loop Governance Table */}
            <Card className="border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-gray-800">Closed-Loop Governance Review</CardTitle>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Historical analysis of jobs that transitioned through the protect list - what actions were taken and did they work?
                    </p>
                  </div>
                  <Badge className="bg-purple-100 text-purple-700 text-[10px]">Process Improvement Input</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[350px]">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-2 font-semibold text-gray-700">Job ID</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Program</th>
                        <th className="text-center p-2 font-semibold text-gray-700">On List?</th>
                        <th className="text-center p-2 font-semibold text-gray-700">Days Visible</th>
                        <th className="text-center p-2 font-semibold text-gray-700">Priority Tier</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Primary Cause</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Recovery Action</th>
                        <th className="text-center p-2 font-semibold text-gray-700">Outcome</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Lesson Learned</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {governanceRecords.map((record, idx) => (
                        <tr key={idx} className={`hover:bg-gray-50 ${!record.actionWorked ? "bg-red-50/30" : record.wasOnProtectList ? "bg-green-50/30" : ""}`}>
                          <td className="p-2 font-mono text-blue-600">{record.jobId}</td>
                          <td className="p-2 text-gray-700">{record.program}</td>
                          <td className="p-2 text-center">
                            {record.wasOnProtectList ? (
                              <Badge className="bg-green-100 text-green-700 text-[9px]">Yes</Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-600 text-[9px]">No</Badge>
                            )}
                          </td>
                          <td className="p-2 text-center font-medium text-gray-700">
                            {record.daysVisibleBeforeLate > 0 ? `${record.daysVisibleBeforeLate}d` : "-"}
                          </td>
                          <td className="p-2 text-center">
                            <Badge className={`text-[9px] ${
                              record.impactSeverity === "Critical" ? "bg-red-100 text-red-700" :
                              record.impactSeverity === "High" ? "bg-amber-100 text-amber-700" :
                              record.impactSeverity === "Medium" ? "bg-yellow-100 text-yellow-700" :
                              "bg-gray-100 text-gray-600"
                            }`}>
                              {record.impactSeverity}
                            </Badge>
                          </td>
                          <td className="p-2">
                            <Badge variant="outline" className="text-[9px]" style={{ borderColor: ROOT_CAUSE_COLORS[record.rootCause], color: ROOT_CAUSE_COLORS[record.rootCause] }}>
                              {record.rootCause}
                            </Badge>
                          </td>
                          <td className="p-2 text-gray-700">{record.actionTaken}</td>
                          <td className="p-2 text-center">
                            {record.actionWorked ? (
                              <Badge className="bg-green-100 text-green-700 text-[9px]">Recovered</Badge>
                            ) : record.wasOnProtectList ? (
                              <Badge className="bg-red-100 text-red-700 text-[9px]">Missed</Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-600 text-[9px]">Not Visible</Badge>
                            )}
                          </td>
                          <td className="p-2 text-gray-600 max-w-[200px] truncate" title={record.lessonsLearned}>
                            {record.lessonsLearned}
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
      </div>
      
      {/* Job Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
          {selectedJob && (
            <>
              <SheetHeader className="pb-4 border-b border-gray-200">
                <SheetTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  {selectedJob.id}
                  <PriorityBadge tier={selectedJob.priorityTier} score={selectedJob.priorityScore} />
                  <StatusBadge status={selectedJob.status} />
                </SheetTitle>
                <p className="text-sm text-gray-500">{selectedJob.program} • {selectedJob.clin}</p>
                {/* Why Prioritized? */}
                <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                  <p className="text-xs text-blue-800">
                    <strong>Why prioritized:</strong> {selectedJob.priorityExplanation}
                  </p>
                </div>
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
                      <p className="text-xs text-gray-500">{selectedJob.status === "Late" ? "Days Late" : "Days to Risk"}</p>
                      <p className={`font-semibold ${selectedJob.status === "Late" ? "text-red-600" : "text-amber-600"}`}>
                        {selectedJob.status === "Late" ? `+${selectedJob.daysLate} days missed` : `${selectedJob.daysToLateRisk} days until predicted miss`}
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
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedJob.dpasFlag && <Badge className="bg-red-100 text-red-700">DPAS Rated</Badge>}
                    {selectedJob.criticalContract && <Badge className="bg-purple-100 text-purple-700">Critical Contract</Badge>}
                    {selectedJob.criticalPath && <Badge className="bg-blue-100 text-blue-700">Critical Path</Badge>}
                  </div>
                </div>
                
                {/* Priority Decomposition */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-bold text-blue-700 mb-2">PRIORITY SCORE DECOMPOSITION</p>
                  <p className="text-[10px] text-blue-600 mb-3">This job ranks #{selectedJob.rank} because of: <strong>{selectedJob.priorityFactors.clinCriticality > 15 ? "CLIN criticality" : ""}{selectedJob.priorityFactors.revenueAOP > 15 ? ", revenue/AOP impact" : ""}{selectedJob.priorityFactors.dueWindowUrgency > 15 ? ", due window urgency" : ""}</strong></p>
                  <PriorityDecomposition factors={selectedJob.priorityFactors} />
                </div>
                
                {/* Baselines & Dates */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs font-bold text-gray-600 mb-3">BASELINES & DATES (Selected: {selectedBaseline})</p>
                  <div className="space-y-2 text-sm">
                    <div className={`flex justify-between p-1.5 rounded ${selectedBaseline === "contract" ? "bg-blue-100" : ""}`}>
                      <span className="text-gray-500">Contract/CLIN Date {selectedBaseline === "contract" && <Badge className="text-[8px] bg-blue-600 text-white ml-1">Selected</Badge>}</span>
                      <span className={`font-medium ${selectedJob.daysLateContract > 0 ? "text-red-600" : "text-gray-700"}`}>
                        {formatDate(selectedJob.requiredDate)} ({selectedJob.daysLateContract > 0 ? "+" : ""}{selectedJob.daysLateContract}d)
                      </span>
                    </div>
                    <div className={`flex justify-between p-1.5 rounded ${selectedBaseline === "iop" ? "bg-blue-100" : ""}`}>
                      <span className="text-gray-500">IOP/ESD {selectedBaseline === "iop" && <Badge className="text-[8px] bg-blue-600 text-white ml-1">Selected</Badge>}</span>
                      <span className={`font-medium ${selectedJob.daysLateIOP > 0 ? "text-red-600" : "text-gray-700"}`}>
                        ({selectedJob.daysLateIOP > 0 ? "+" : ""}{selectedJob.daysLateIOP}d)
                      </span>
                    </div>
                    <div className={`flex justify-between p-1.5 rounded ${selectedBaseline === "delivery-plan" ? "bg-blue-100" : ""}`}>
                      <span className="text-gray-500">Delivery Plan {selectedBaseline === "delivery-plan" && <Badge className="text-[8px] bg-blue-600 text-white ml-1">Selected</Badge>}</span>
                      <span className={`font-medium ${selectedJob.daysLateDeliveryPlan > 0 ? "text-red-600" : "text-gray-700"}`}>
                        ({selectedJob.daysLateDeliveryPlan > 0 ? "+" : ""}{selectedJob.daysLateDeliveryPlan}d)
                      </span>
                    </div>
                    <div className={`flex justify-between p-1.5 rounded ${selectedBaseline === "pdm-forecast" ? "bg-blue-100" : ""}`}>
                      <span className="text-gray-500">PDM Forecast {selectedBaseline === "pdm-forecast" && <Badge className="text-[8px] bg-blue-600 text-white ml-1">Selected</Badge>}</span>
                      <span className={`font-medium ${selectedJob.daysLatePDM > 0 ? "text-red-600" : "text-gray-700"}`}>
                        ({selectedJob.daysLatePDM > 0 ? "+" : ""}{selectedJob.daysLatePDM}d)
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200">
                      <span className="text-gray-700 font-medium">Predicted Completion</span>
                      <span className="font-semibold">{formatDate(selectedJob.predictedCompletion)}</span>
                    </div>
                    {selectedJob.status === "Forecast-Late" && (
                      <div className="p-2 bg-amber-50 rounded mt-2">
                        <p className="text-xs text-amber-800">
                          <strong>Predicted to miss {selectedBaseline === "contract" ? "Contract/CLIN" : selectedBaseline} date by {selectedJob.daysToLateRisk} days</strong>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Root Cause Evidence - Enhanced */}
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
                    {/* Evidence with types */}
                    <div className="pt-2 border-t border-amber-200">
                      <p className="text-xs text-amber-700 font-medium mb-2">Linked Evidence References:</p>
                      <div className="space-y-1">
                        {selectedJob.linkedPO && (
                          <div className="flex items-center gap-2">
                            <Badge className="text-[9px] bg-purple-100 text-purple-700">PO</Badge>
                            <span className="font-mono text-blue-600 text-xs">{selectedJob.linkedPO}</span>
                            {selectedJob.poPromiseDate && <span className="text-[10px] text-gray-500">Promise: {formatDate(selectedJob.poPromiseDate)}</span>}
                          </div>
                        )}
                        {selectedJob.linkedMRB && (
                          <div className="flex items-center gap-2">
                            <Badge className="text-[9px] bg-pink-100 text-pink-700">MRB</Badge>
                            <span className="font-mono text-blue-600 text-xs">{selectedJob.linkedMRB}</span>
                            {selectedJob.mrbStatus && <span className="text-[10px] text-gray-500">{selectedJob.mrbStatus}</span>}
                          </div>
                        )}
                        {selectedJob.linkedNC && (
                          <div className="flex items-center gap-2">
                            <Badge className="text-[9px] bg-red-100 text-red-700">NC</Badge>
                            <span className="font-mono text-blue-600 text-xs">{selectedJob.linkedNC}</span>
                            {selectedJob.ncStatus && <span className="text-[10px] text-gray-500">{selectedJob.ncStatus}</span>}
                          </div>
                        )}
                        {selectedJob.linkedRI && (
                          <div className="flex items-center gap-2">
                            <Badge className="text-[9px] bg-purple-100 text-purple-700">RI</Badge>
                            <span className="font-mono text-blue-600 text-xs">{selectedJob.linkedRI}</span>
                            {selectedJob.riStatus && <span className="text-[10px] text-gray-500">{selectedJob.riStatus}</span>}
                          </div>
                        )}
                        {selectedJob.linkedRouting && (
                          <div className="flex items-center gap-2">
                            <Badge className="text-[9px] bg-cyan-100 text-cyan-700">Routing</Badge>
                            <span className="font-mono text-blue-600 text-xs">{selectedJob.linkedRouting}</span>
                            {selectedJob.routingStatus && <span className="text-[10px] text-gray-500">{selectedJob.routingStatus}</span>}
                          </div>
                        )}
                        {selectedJob.linkedCapacity && (
                          <div className="flex items-center gap-2">
                            <Badge className="text-[9px] bg-orange-100 text-orange-700">Capacity</Badge>
                            <span className="text-xs">{selectedJob.linkedCapacity}</span>
                            {selectedJob.capacityQueue && <span className="text-[10px] text-gray-500">Queue: {selectedJob.capacityQueue} jobs</span>}
                          </div>
                        )}
                        {!selectedJob.linkedPO && !selectedJob.linkedMRB && !selectedJob.linkedNC && !selectedJob.linkedRI && !selectedJob.linkedRouting && !selectedJob.linkedCapacity && (
                          <p className="text-[10px] text-gray-500 italic">No linked evidence objects</p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500 pt-1">
                      <span>Last evidence update: {selectedJob.lastUpdated.toLocaleString()}</span>
                    </div>
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
                      <p className="text-xs text-gray-500">DPAS / Critical Contract</p>
                      <div className="flex gap-1">
                        {selectedJob.dpasFlag && <Badge className="text-[9px] bg-red-100 text-red-700">DPAS</Badge>}
                        {selectedJob.criticalContract && <Badge className="text-[9px] bg-purple-100 text-purple-700">Critical</Badge>}
                        {!selectedJob.dpasFlag && !selectedJob.criticalContract && <span className="text-gray-500">-</span>}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500">Downstream Impact</p>
                      <p className="font-medium">{selectedJob.fanOut} downstream assemblies / ship commitments linked</p>
                    </div>
                  </div>
                </div>
                
                {/* Actions & Recovery - Enhanced */}
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs font-bold text-green-700 mb-3">ACTIONS & RECOVERY</p>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Next Action</p>
                      <p className="font-medium text-gray-900">{selectedJob.nextAction}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500">Action Status</p>
                        <Badge className={`text-[10px] ${
                          selectedJob.actionStatus === "Open" ? "bg-gray-100 text-gray-600" :
                          selectedJob.actionStatus === "In Progress" ? "bg-blue-100 text-blue-700" :
                          selectedJob.actionStatus === "Waiting" ? "bg-amber-100 text-amber-700" :
                          selectedJob.actionStatus === "Escalated" ? "bg-red-100 text-red-700" :
                          "bg-green-100 text-green-700"
                        }`}>
                          {selectedJob.actionStatus}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Escalation Path</p>
                        {selectedJob.escalationNeeded ? (
                          <Badge className="text-[10px] bg-red-100 text-red-700">Escalation Needed</Badge>
                        ) : (
                          <span className="text-gray-500">Standard</span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500">Recovery ETA</p>
                        <p className="font-semibold">{formatDate(selectedJob.recoveryETA)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Days on Protect List</p>
                        <p className={`font-semibold ${selectedJob.daysOnProtectList > 10 ? "text-red-600" : selectedJob.daysOnProtectList > 5 ? "text-amber-600" : "text-gray-700"}`}>
                          {selectedJob.daysOnProtectList} days (since {formatDate(selectedJob.protectListEntryDate)})
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-green-200">
                      <p className="text-xs text-gray-500">Last Owner Update</p>
                      <p className="text-sm">{selectedJob.lastOwnerUpdate.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                
                {/* Linked Objects */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs font-bold text-gray-600 mb-3">LINKED OBJECTS</p>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    {selectedJob.linkedPO && (
                      <div className="p-2 bg-white rounded border">
                        <span className="text-gray-500">PO:</span>
                        <span className="font-mono text-blue-600 ml-1">{selectedJob.linkedPO}</span>
                      </div>
                    )}
                    {selectedJob.linkedMRB && (
                      <div className="p-2 bg-white rounded border">
                        <span className="text-gray-500">MRB:</span>
                        <span className="font-mono text-blue-600 ml-1">{selectedJob.linkedMRB}</span>
                      </div>
                    )}
                    {selectedJob.linkedNC && (
                      <div className="p-2 bg-white rounded border">
                        <span className="text-gray-500">NC:</span>
                        <span className="font-mono text-blue-600 ml-1">{selectedJob.linkedNC}</span>
                      </div>
                    )}
                    {selectedJob.linkedRI && (
                      <div className="p-2 bg-white rounded border">
                        <span className="text-gray-500">RI:</span>
                        <span className="font-mono text-blue-600 ml-1">{selectedJob.linkedRI}</span>
                      </div>
                    )}
                    {selectedJob.linkedRouting && (
                      <div className="p-2 bg-white rounded border">
                        <span className="text-gray-500">Routing:</span>
                        <span className="font-mono text-blue-600 ml-1">{selectedJob.linkedRouting}</span>
                      </div>
                    )}
                    {selectedJob.workcenter && (
                      <div className="p-2 bg-white rounded border">
                        <span className="text-gray-500">Workcenter:</span>
                        <span className="ml-1">{selectedJob.workcenter}</span>
                      </div>
                    )}
                    {selectedJob.supplierPromiseDate && (
                      <div className="p-2 bg-white rounded border">
                        <span className="text-gray-500">Supplier:</span>
                        <span className="ml-1">{formatDate(selectedJob.supplierPromiseDate)}</span>
                      </div>
                    )}
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
