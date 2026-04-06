"use client"

import React from "react"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell, ZAxis, LineChart, Line, Legend, AreaChart, Area,
  PieChart, Pie,
} from "recharts"
import {
  X, Download, ChevronRight, ChevronDown, ArrowLeft, Filter, RotateCcw,
  AlertTriangle, CheckCircle2, Clock, ShieldAlert, Package,
  Search, ExternalLink, Info,
} from "lucide-react"

// ---------- TYPES ----------
type ReadinessStatus = "Ready" | "Watch" | "Blocked"
type Confidence = "High" | "Med" | "Low"
type BlockerCategory = "Materials Shortage" | "MRB / Quality Hold" | "Shelf-Life Constraint" | "Capacity Constraint" | "Supplier Promise Slip" | "Other / Unknown"

interface Job {
  id: string
  program: string
  project: string
  clin: string
  dpas: string | null
  productFamily: string
  workcenter: string
  // Multi-baseline dates
  requiredDate: string
  contractDate: string
  iopDate: string
  deliveryPlanDate: string
  pdmForecastDate: string
  earliestFeasibleClear: string
  plannedStart: string
  plannedFinish: string
  readinessStatus: ReadinessStatus
  readinessScore: number
  businessPriority: number
  primaryBlocker: BlockerCategory | "None"
  slipDays: number
  owner: string
  nextAction: string
  confidence: Confidence
  value: number
  // Gate statuses
  gateStatus: {
    materials: { status: "Pass" | "Watch" | "Fail"; clearDate: string }
    mrb: { status: "Pass" | "Watch" | "Fail"; clearDate: string }
    routing: { status: "Pass" | "Watch" | "Fail"; clearDate: string }
    capacity: { status: "Pass" | "Watch" | "Fail"; clearDate: string }
    supplier: { status: "Pass" | "Watch" | "Fail"; clearDate: string }
  }
  // Routing status
  routingStatus: { released: boolean; approvals: number; totalApprovals: number; missingApprovals: string[] }
  // Readiness breakdown
  materialsScore: number
  qualityScore: number
  capacityScore: number
  supplierScore: number
  shelfLifeScore: number
  // Detail data
  gatingParts: { part: string; netAvail: number; needQty: number; needDate: string; shortageDate: string }[]
  mrbHolds: { id: string; part: string; lot: string; qty: number; location: string; age: number; disposition: string; blocks: string; stage: string; sla: number; clearETA: string; owner: string; nextActionDate: string }[]
  shelfLifeLots: { lot: string; part: string; expiry: string; plannedUse: string; flagged: boolean }[]
  capacityDetail: { workcenter: string; availHrs: number; reqHrs: number; nextSlot: string }
}

// ---------- SAMPLE DATA ----------
const generateJobs = (): Job[] => [
  {
    id: "JOB-2026-0201", program: "Manpack Radio", project: "CLIN-0004 Manpack Lot 3", clin: "CLIN-0004", dpas: "DO-A1", productFamily: "Manpack", workcenter: "WC-001 SMT Line 1",
    requiredDate: "2026-02-12", contractDate: "2026-02-12", iopDate: "2026-02-14", deliveryPlanDate: "2026-02-12", pdmForecastDate: "2026-02-13", earliestFeasibleClear: "2026-02-11",
    plannedStart: "2026-02-10", plannedFinish: "2026-02-11",
    readinessStatus: "Ready", readinessScore: 94, businessPriority: 92,
    primaryBlocker: "None", slipDays: 0, owner: "M. Torres", nextAction: "Release to floor",
    confidence: "High", value: 142000,
    gateStatus: { materials: { status: "Pass", clearDate: "2026-02-10" }, mrb: { status: "Pass", clearDate: "2026-02-10" }, routing: { status: "Pass", clearDate: "2026-02-10" }, capacity: { status: "Pass", clearDate: "2026-02-10" }, supplier: { status: "Pass", clearDate: "2026-02-10" } },
    routingStatus: { released: true, approvals: 5, totalApprovals: 5, missingApprovals: [] },
    materialsScore: 38, qualityScore: 20, capacityScore: 18, supplierScore: 10, shelfLifeScore: 8,
    gatingParts: [
      { part: "IC-DSP-09112", netAvail: 45, needQty: 20, needDate: "Feb 10", shortageDate: "None" },
      { part: "C-RF-003421", netAvail: 200, needQty: 80, needDate: "Feb 10", shortageDate: "None" },
    ],
    mrbHolds: [], shelfLifeLots: [],
    capacityDetail: { workcenter: "WC-001", availHrs: 48, reqHrs: 32, nextSlot: "Feb 10" },
  },
  {
    id: "JOB-2026-0205", program: "Manpack Radio", project: "CLIN-0004 Manpack Lot 3", clin: "CLIN-0004", dpas: "DO-A1", productFamily: "Manpack", workcenter: "WC-003 Final Assy A",
    requiredDate: "2026-02-14", contractDate: "2026-02-14", iopDate: "2026-02-16", deliveryPlanDate: "2026-02-14", pdmForecastDate: "2026-02-15", earliestFeasibleClear: "2026-02-13",
    plannedStart: "2026-02-12", plannedFinish: "2026-02-13",
    readinessStatus: "Ready", readinessScore: 88, businessPriority: 88,
    primaryBlocker: "None", slipDays: 0, owner: "J. Rivera", nextAction: "Kit materials",
    confidence: "High", value: 98000,
    gateStatus: { materials: { status: "Pass", clearDate: "2026-02-12" }, mrb: { status: "Pass", clearDate: "2026-02-12" }, routing: { status: "Pass", clearDate: "2026-02-12" }, capacity: { status: "Pass", clearDate: "2026-02-12" }, supplier: { status: "Pass", clearDate: "2026-02-12" } },
    routingStatus: { released: true, approvals: 5, totalApprovals: 5, missingApprovals: [] },
    materialsScore: 36, qualityScore: 18, capacityScore: 18, supplierScore: 8, shelfLifeScore: 8,
    gatingParts: [
      { part: "PCB-MAIN-001", netAvail: 30, needQty: 15, needDate: "Feb 12", shortageDate: "None" },
    ],
    mrbHolds: [], shelfLifeLots: [],
    capacityDetail: { workcenter: "WC-003", availHrs: 40, reqHrs: 28, nextSlot: "Feb 12" },
  },
  {
    id: "JOB-2026-0208", program: "Vehicle Mount", project: "CLIN-0012 Vehicle Mount Lot 1", clin: "CLIN-0012", dpas: "DO-A2", productFamily: "Vehicle Mount", workcenter: "WC-002 SMT Line 2",
    requiredDate: "2026-02-15", contractDate: "2026-02-15", iopDate: "2026-02-17", deliveryPlanDate: "2026-02-16", pdmForecastDate: "2026-02-17", earliestFeasibleClear: "2026-02-17",
    plannedStart: "2026-02-13", plannedFinish: "2026-02-15",
    readinessStatus: "Watch", readinessScore: 68, businessPriority: 78,
    primaryBlocker: "Supplier Promise Slip", slipDays: 2, owner: "K. Patel", nextAction: "Expedite PO-2026-0165",
    confidence: "Med", value: 210000,
    gateStatus: { materials: { status: "Watch", clearDate: "2026-02-16" }, mrb: { status: "Pass", clearDate: "2026-02-13" }, routing: { status: "Pass", clearDate: "2026-02-13" }, capacity: { status: "Pass", clearDate: "2026-02-13" }, supplier: { status: "Fail", clearDate: "2026-02-17" } },
    routingStatus: { released: true, approvals: 5, totalApprovals: 5, missingApprovals: [] },
    materialsScore: 28, qualityScore: 16, capacityScore: 14, supplierScore: 4, shelfLifeScore: 6,
    gatingParts: [
      { part: "IC-RF-04500", netAvail: 8, needQty: 20, needDate: "Feb 13", shortageDate: "Feb 16" },
      { part: "CONN-SMA-200", netAvail: 50, needQty: 40, needDate: "Feb 13", shortageDate: "None" },
    ],
    mrbHolds: [], shelfLifeLots: [],
    capacityDetail: { workcenter: "WC-002", availHrs: 36, reqHrs: 34, nextSlot: "Feb 13" },
  },
  {
    id: "JOB-2026-0210", program: "Tactical HF Radio", project: "CLIN-0009 Tac HF Lot 1", clin: "CLIN-0009", dpas: "DO-C3", productFamily: "Tactical HF", workcenter: "WC-004 Test Station 1",
    requiredDate: "2026-02-16", contractDate: "2026-02-16", iopDate: "2026-02-18", deliveryPlanDate: "2026-02-17", pdmForecastDate: "2026-02-19", earliestFeasibleClear: "2026-02-19",
    plannedStart: "2026-02-14", plannedFinish: "2026-02-16",
    readinessStatus: "Watch", readinessScore: 62, businessPriority: 85,
    primaryBlocker: "Capacity Constraint", slipDays: 3, owner: "S. Chen", nextAction: "Request OT for WC-004",
    confidence: "Med", value: 175000,
    gateStatus: { materials: { status: "Pass", clearDate: "2026-02-14" }, mrb: { status: "Watch", clearDate: "2026-02-18" }, routing: { status: "Pass", clearDate: "2026-02-14" }, capacity: { status: "Fail", clearDate: "2026-02-19" }, supplier: { status: "Pass", clearDate: "2026-02-14" } },
    routingStatus: { released: true, approvals: 4, totalApprovals: 5, missingApprovals: ["Test Engineering final sign-off"] },
    materialsScore: 34, qualityScore: 14, capacityScore: 6, supplierScore: 4, shelfLifeScore: 4,
    gatingParts: [
      { part: "HF-TUNER-01", netAvail: 12, needQty: 10, needDate: "Feb 14", shortageDate: "None" },
    ],
    mrbHolds: [
      { id: "NCR-2026-0031", part: "MSA-005 Antenna Array", lot: "LOT-2026-0710", qty: 4, location: "WC-004 Hold Area", age: 12, disposition: "Under Review", blocks: "RF calibration hold", stage: "Investigation", sla: 10, clearETA: "2026-02-18", owner: "S. Chen", nextActionDate: "2026-02-12" },
    ],
    shelfLifeLots: [],
    capacityDetail: { workcenter: "WC-004", availHrs: 16, reqHrs: 28, nextSlot: "Feb 18" },
  },
  {
    id: "JOB-2026-0212", program: "Manpack Radio", project: "CLIN-0004 Manpack Lot 3", clin: "CLIN-0004", dpas: "DO-A1", productFamily: "Manpack", workcenter: "WC-001 SMT Line 1",
    requiredDate: "2026-02-18", contractDate: "2026-02-18", iopDate: "2026-02-20", deliveryPlanDate: "2026-02-19", pdmForecastDate: "2026-02-22", earliestFeasibleClear: "2026-02-26",
    plannedStart: "2026-02-16", plannedFinish: "2026-02-18",
    readinessStatus: "Blocked", readinessScore: 35, businessPriority: 90,
    primaryBlocker: "Materials Shortage", slipDays: 8, owner: "M. Torres", nextAction: "Source alt supplier for IC-DSP-09112",
    confidence: "Low", value: 320000,
    gateStatus: { materials: { status: "Fail", clearDate: "2026-02-26" }, mrb: { status: "Fail", clearDate: "2026-02-24" }, routing: { status: "Pass", clearDate: "2026-02-16" }, capacity: { status: "Fail", clearDate: "2026-02-22" }, supplier: { status: "Fail", clearDate: "2026-02-26" } },
    routingStatus: { released: true, approvals: 5, totalApprovals: 5, missingApprovals: [] },
    materialsScore: 10, qualityScore: 12, capacityScore: 8, supplierScore: 3, shelfLifeScore: 2,
    gatingParts: [
      { part: "IC-DSP-09112", netAvail: 0, needQty: 40, needDate: "Feb 16", shortageDate: "Feb 12" },
      { part: "C-MLCC-100NF", netAvail: 50, needQty: 200, needDate: "Feb 16", shortageDate: "Feb 14" },
      { part: "R-SM-10K", netAvail: 800, needQty: 400, needDate: "Feb 16", shortageDate: "None" },
    ],
    mrbHolds: [
      { id: "NCR-2026-0028", part: "MSA-001 Receiver", lot: "LOT-2026-1001", qty: 45, location: "WC-001 Rework Area", age: 14, disposition: "Rework", blocks: "45 units solder rework pending", stage: "Rework", sla: 7, clearETA: "2026-02-16", owner: "M. Torres", nextActionDate: "2026-02-11" },
    ],
    shelfLifeLots: [
      { lot: "LOT-2025-8821", part: "ADHESIVE-EP-01", expiry: "2026-02-14", plannedUse: "2026-02-16", flagged: true },
    ],
    capacityDetail: { workcenter: "WC-001", availHrs: 24, reqHrs: 48, nextSlot: "Feb 22" },
  },
  {
    id: "JOB-2026-0215", program: "Vehicle Mount", project: "CLIN-0007 Vehicle Mount Lot 2", clin: "CLIN-0007", dpas: "DO-A2", productFamily: "Vehicle Mount", workcenter: "WC-006 Display Integ",
    requiredDate: "2026-02-19", contractDate: "2026-02-19", iopDate: "2026-02-21", deliveryPlanDate: "2026-02-20", pdmForecastDate: "2026-02-23", earliestFeasibleClear: "2026-02-25",
    plannedStart: "2026-02-17", plannedFinish: "2026-02-19",
    readinessStatus: "Blocked", readinessScore: 28, businessPriority: 72,
    primaryBlocker: "MRB / Quality Hold", slipDays: 6, owner: "J. Martinez", nextAction: "Disposition NCR-2026-0033",
    confidence: "Low", value: 185000,
    gateStatus: { materials: { status: "Fail", clearDate: "2026-02-22" }, mrb: { status: "Fail", clearDate: "2026-02-25" }, routing: { status: "Watch", clearDate: "2026-02-18" }, capacity: { status: "Fail", clearDate: "2026-02-24" }, supplier: { status: "Pass", clearDate: "2026-02-17" } },
    routingStatus: { released: false, approvals: 3, totalApprovals: 5, missingApprovals: ["Quality sign-off", "Mfg Engineering approval"] },
    materialsScore: 22, qualityScore: 0, capacityScore: 4, supplierScore: 2, shelfLifeScore: 0,
    gatingParts: [
      { part: "DISP-LCD-7IN", netAvail: 5, needQty: 10, needDate: "Feb 17", shortageDate: "Feb 15" },
    ],
    mrbHolds: [
      { id: "NCR-2026-0033", part: "MSA-003 Power Supply", lot: "LOT-2026-0855", qty: 15, location: "WC-002 Hold Cage", age: 10, disposition: "Under Review", blocks: "15 units component polarity", stage: "Investigation", sla: 10, clearETA: "2026-02-22", owner: "J. Martinez", nextActionDate: "2026-02-12" },
      { id: "NCR-2026-0035", part: "Display Module", lot: "LOT-2026-0860", qty: 8, location: "WC-006 Hold Area", age: 5, disposition: "Rework", blocks: "8 units display connector", stage: "Rework", sla: 7, clearETA: "2026-02-17", owner: "J. Martinez", nextActionDate: "2026-02-13" },
    ],
    shelfLifeLots: [
      { lot: "LOT-2025-9102", part: "SOLDER-PASTE-01", expiry: "2026-02-15", plannedUse: "2026-02-17", flagged: true },
    ],
    capacityDetail: { workcenter: "WC-006", availHrs: 8, reqHrs: 24, nextSlot: "Feb 24" },
  },
  {
    id: "JOB-2026-0218", program: "Base Station", project: "CLIN-0015 Base Station Lot 1", clin: "CLIN-0015", dpas: null, productFamily: "Base Station", workcenter: "WC-005 Cable Assy",
    requiredDate: "2026-02-20", contractDate: "2026-02-20", iopDate: "2026-02-22", deliveryPlanDate: "2026-02-21", pdmForecastDate: "2026-02-25", earliestFeasibleClear: "2026-03-02",
    plannedStart: "2026-02-18", plannedFinish: "2026-02-20",
    readinessStatus: "Blocked", readinessScore: 22, businessPriority: 65,
    primaryBlocker: "Shelf-Life Constraint", slipDays: 10, owner: "A. Kim", nextAction: "Replace expired lot LOT-2025-7600",
    confidence: "Low", value: 95000,
    gateStatus: { materials: { status: "Watch", clearDate: "2026-02-20" }, mrb: { status: "Pass", clearDate: "2026-02-18" }, routing: { status: "Pass", clearDate: "2026-02-18" }, capacity: { status: "Watch", clearDate: "2026-02-20" }, supplier: { status: "Fail", clearDate: "2026-03-02" } },
    routingStatus: { released: true, approvals: 5, totalApprovals: 5, missingApprovals: [] },
    materialsScore: 16, qualityScore: 2, capacityScore: 0, supplierScore: 2, shelfLifeScore: 2,
    gatingParts: [
      { part: "CABLE-RF-50OHM", netAvail: 100, needQty: 60, needDate: "Feb 18", shortageDate: "None" },
    ],
    mrbHolds: [],
    shelfLifeLots: [
      { lot: "LOT-2025-7600", part: "FLUX-NC-01", expiry: "2026-02-10", plannedUse: "2026-02-18", flagged: true },
      { lot: "LOT-2025-7812", part: "CONFORMAL-COAT", expiry: "2026-02-12", plannedUse: "2026-02-19", flagged: true },
    ],
    capacityDetail: { workcenter: "WC-005", availHrs: 12, reqHrs: 16, nextSlot: "Feb 20" },
  },
  {
    id: "JOB-2026-0220", program: "Tactical HF Radio", project: "CLIN-0009 Tac HF Lot 1", clin: "CLIN-0009", dpas: "DO-C3", productFamily: "Tactical HF", workcenter: "WC-003 Final Assy A",
    requiredDate: "2026-02-22", contractDate: "2026-02-22", iopDate: "2026-02-24", deliveryPlanDate: "2026-02-23", pdmForecastDate: "2026-02-25", earliestFeasibleClear: "2026-02-26",
    plannedStart: "2026-02-20", plannedFinish: "2026-02-22",
    readinessStatus: "Watch", readinessScore: 58, businessPriority: 70,
    primaryBlocker: "Materials Shortage", slipDays: 4, owner: "R. Gomez", nextAction: "Pull from 3PL warehouse",
    confidence: "Med", value: 148000,
    gateStatus: { materials: { status: "Fail", clearDate: "2026-02-24" }, mrb: { status: "Pass", clearDate: "2026-02-20" }, routing: { status: "Pass", clearDate: "2026-02-20" }, capacity: { status: "Watch", clearDate: "2026-02-22" }, supplier: { status: "Watch", clearDate: "2026-02-24" } },
    routingStatus: { released: true, approvals: 5, totalApprovals: 5, missingApprovals: [] },
    materialsScore: 24, qualityScore: 14, capacityScore: 10, supplierScore: 6, shelfLifeScore: 4,
    gatingParts: [
      { part: "PN-CONN-230", netAvail: 15, needQty: 30, needDate: "Feb 20", shortageDate: "Feb 18" },
      { part: "IC-POWER-MGT", netAvail: 25, needQty: 20, needDate: "Feb 20", shortageDate: "None" },
    ],
    mrbHolds: [], shelfLifeLots: [],
    capacityDetail: { workcenter: "WC-003", availHrs: 32, reqHrs: 24, nextSlot: "Feb 20" },
  },
  {
    id: "JOB-2026-0222", program: "Manpack Radio", project: "CLIN-0004 Manpack Lot 4", clin: "CLIN-0004", dpas: "DO-A1", productFamily: "Manpack", workcenter: "WC-002 SMT Line 2",
    requiredDate: "2026-02-24", contractDate: "2026-02-24", iopDate: "2026-02-26", deliveryPlanDate: "2026-02-25", pdmForecastDate: "2026-02-25", earliestFeasibleClear: "2026-02-23",
    plannedStart: "2026-02-22", plannedFinish: "2026-02-24",
    readinessStatus: "Ready", readinessScore: 82, businessPriority: 76,
    primaryBlocker: "None", slipDays: 0, owner: "L. Nguyen", nextAction: "Scheduled for release",
    confidence: "High", value: 112000,
    gateStatus: { materials: { status: "Pass", clearDate: "2026-02-22" }, mrb: { status: "Watch", clearDate: "2026-02-18" }, routing: { status: "Pass", clearDate: "2026-02-22" }, capacity: { status: "Pass", clearDate: "2026-02-22" }, supplier: { status: "Pass", clearDate: "2026-02-22" } },
    routingStatus: { released: true, approvals: 5, totalApprovals: 5, missingApprovals: [] },
    materialsScore: 34, qualityScore: 16, capacityScore: 16, supplierScore: 8, shelfLifeScore: 8,
    gatingParts: [
      { part: "PCB-RF-002", netAvail: 60, needQty: 25, needDate: "Feb 22", shortageDate: "None" },
    ],
    mrbHolds: [], shelfLifeLots: [],
    capacityDetail: { workcenter: "WC-002", availHrs: 40, reqHrs: 30, nextSlot: "Feb 22" },
  },
  {
    id: "JOB-2026-0225", program: "Base Station", project: "CLIN-0015 Base Station Lot 1", clin: "CLIN-0015", dpas: null, productFamily: "Base Station", workcenter: "WC-001 SMT Line 1",
    requiredDate: "2026-02-26", contractDate: "2026-02-26", iopDate: "2026-02-28", deliveryPlanDate: "2026-02-27", pdmForecastDate: "2026-02-28", earliestFeasibleClear: "2026-03-01",
    plannedStart: "2026-02-24", plannedFinish: "2026-02-26",
    readinessStatus: "Watch", readinessScore: 55, businessPriority: 60,
    primaryBlocker: "Capacity Constraint", slipDays: 5, owner: "M. Torres", nextAction: "Rebalance WC-001 load",
    confidence: "Med", value: 88000,
    gateStatus: { materials: { status: "Pass", clearDate: "2026-02-24" }, mrb: { status: "Pass", clearDate: "2026-02-24" }, routing: { status: "Pass", clearDate: "2026-02-24" }, capacity: { status: "Fail", clearDate: "2026-03-01" }, supplier: { status: "Watch", clearDate: "2026-02-27" } },
    routingStatus: { released: true, approvals: 4, totalApprovals: 5, missingApprovals: ["Mfg Engineering approval"] },
    materialsScore: 30, qualityScore: 12, capacityScore: 4, supplierScore: 5, shelfLifeScore: 4,
    gatingParts: [
      { part: "IC-FPGA-X200", netAvail: 10, needQty: 8, needDate: "Feb 24", shortageDate: "None" },
    ],
    mrbHolds: [], shelfLifeLots: [],
    capacityDetail: { workcenter: "WC-001", availHrs: 16, reqHrs: 36, nextSlot: "Feb 28" },
  },
]

// NC data for Quality NC Insights tab
const ncData = [
  { id: "NCR-2026-0028", defect: "Cold Solder Joint", part: "MSA-001 Receiver", operation: "SMT Reflow", workcenter: "WC-001", supplier: "In-house", program: "Manpack Radio", reworkHrs: 24, scrapCost: 0, replaceCost: 1200, jobsBlocked: 2, age: 14, disposition: "Rework", status: "Open" },
  { id: "NCR-2026-0031", defect: "RF Cal Out of Spec", part: "MSA-005 Antenna Array", operation: "RF Test", workcenter: "WC-004", supplier: "In-house", program: "Tactical HF Radio", reworkHrs: 16, scrapCost: 0, replaceCost: 0, jobsBlocked: 1, age: 12, disposition: "Under Review", status: "Open" },
  { id: "NCR-2026-0033", defect: "Component Polarity", part: "MSA-003 Power Supply", operation: "SMT Place", workcenter: "WC-002", supplier: "In-house", program: "Vehicle Mount", reworkHrs: 8, scrapCost: 4500, replaceCost: 2200, jobsBlocked: 1, age: 10, disposition: "Under Review", status: "Open" },
  { id: "NCR-2026-0035", defect: "Connector Damage", part: "Display Module", operation: "Final Assy", workcenter: "WC-006", supplier: "Amphenol", program: "Vehicle Mount", reworkHrs: 6, scrapCost: 0, replaceCost: 800, jobsBlocked: 1, age: 5, disposition: "Rework", status: "Open" },
  { id: "NCR-2026-0037", defect: "Conformal Coat Void", part: "MSA-001 Receiver", operation: "Coating", workcenter: "WC-003", supplier: "In-house", program: "Manpack Radio", reworkHrs: 4, scrapCost: 0, replaceCost: 0, jobsBlocked: 0, age: 3, disposition: "Use-As-Is", status: "Closed" },
  { id: "NCR-2026-0039", defect: "Cold Solder Joint", part: "MSA-002 Transmitter", operation: "SMT Reflow", workcenter: "WC-001", supplier: "In-house", program: "Manpack Radio", reworkHrs: 12, scrapCost: 0, replaceCost: 600, jobsBlocked: 1, age: 8, disposition: "Rework", status: "Open" },
  { id: "NCR-2026-0041", defect: "Missing Component", part: "MSA-004 Control Board", operation: "SMT Place", workcenter: "WC-002", supplier: "In-house", program: "Tactical HF Radio", reworkHrs: 2, scrapCost: 0, replaceCost: 150, jobsBlocked: 0, age: 2, disposition: "Rework", status: "Open" },
]

// MRB data (enriched)
type MrbStage = "Created" | "Review" | "Investigation" | "Disposition" | "Rework" | "Verification" | "Closed"
interface MrbItem {
  id: string; part: string; lot: string; qty: number; value: number; age: number;
  disposition: string; peggedJobs: string[]; atRiskValue: number; lever: string;
  stage: MrbStage; sla: number; ageInStage: number; clearETA: string; owner: string;
  location: string; nextActionDate: string;
  timeline: { stage: MrbStage; entered: string; exited: string | null; sla: number }[];
  deliverables: string[];
}
const mrbData: MrbItem[] = [
  {
    id: "MRB-2026-001", part: "IC-DSP-09112", lot: "LOT-2026-1001", qty: 40, value: 12000, age: 18,
    disposition: "Pending Review", peggedJobs: ["JOB-2026-0212"], atRiskValue: 320000, lever: "Rework + retest",
    stage: "Review", sla: 5, ageInStage: 8, clearETA: "2026-02-24", owner: "S. Chen", location: "MRB Hold Cage A",
    nextActionDate: "2026-02-11", deliverables: ["CLIN-0004 Manpack Lot 3"],
    timeline: [
      { stage: "Created", entered: "2026-01-22", exited: "2026-01-23", sla: 1 },
      { stage: "Review", entered: "2026-01-23", exited: null, sla: 5 },
    ],
  },
  {
    id: "MRB-2026-002", part: "DISP-LCD-7IN", lot: "LOT-2026-0855", qty: 15, value: 4500, age: 10,
    disposition: "Under Investigation", peggedJobs: ["JOB-2026-0215"], atRiskValue: 185000, lever: "Source replacement lot",
    stage: "Investigation", sla: 7, ageInStage: 6, clearETA: "2026-02-22", owner: "J. Martinez", location: "WC-006 Hold",
    nextActionDate: "2026-02-12", deliverables: ["CLIN-0007 Vehicle Mount Lot 2"],
    timeline: [
      { stage: "Created", entered: "2026-01-30", exited: "2026-01-31", sla: 1 },
      { stage: "Review", entered: "2026-01-31", exited: "2026-02-03", sla: 5 },
      { stage: "Investigation", entered: "2026-02-03", exited: null, sla: 7 },
    ],
  },
  {
    id: "MRB-2026-003", part: "CONN-SMA-200", lot: "LOT-2025-9800", qty: 25, value: 875, age: 22,
    disposition: "Awaiting Disposition", peggedJobs: ["JOB-2026-0208"], atRiskValue: 210000, lever: "Use-as-is with deviation",
    stage: "Disposition", sla: 5, ageInStage: 4, clearETA: "2026-02-16", owner: "K. Patel", location: "MRB Hold Cage B",
    nextActionDate: "2026-02-11", deliverables: ["CLIN-0012 Vehicle Mount Lot 1"],
    timeline: [
      { stage: "Created", entered: "2026-01-18", exited: "2026-01-19", sla: 1 },
      { stage: "Review", entered: "2026-01-19", exited: "2026-01-24", sla: 5 },
      { stage: "Investigation", entered: "2026-01-24", exited: "2026-02-02", sla: 7 },
      { stage: "Disposition", entered: "2026-02-02", exited: null, sla: 5 },
    ],
  },
  {
    id: "MRB-2026-004", part: "PCB-RF-002", lot: "LOT-2026-0420", qty: 8, value: 2400, age: 5,
    disposition: "Rework Approved", peggedJobs: ["JOB-2026-0222"], atRiskValue: 112000, lever: "Rework in progress",
    stage: "Rework", sla: 10, ageInStage: 3, clearETA: "2026-02-18", owner: "M. Torres", location: "WC-002 Rework",
    nextActionDate: "2026-02-14", deliverables: ["CLIN-0004 Manpack Lot 4"],
    timeline: [
      { stage: "Created", entered: "2026-02-04", exited: "2026-02-04", sla: 1 },
      { stage: "Review", entered: "2026-02-04", exited: "2026-02-05", sla: 5 },
      { stage: "Investigation", entered: "2026-02-05", exited: "2026-02-06", sla: 7 },
      { stage: "Disposition", entered: "2026-02-06", exited: "2026-02-06", sla: 5 },
      { stage: "Rework", entered: "2026-02-06", exited: null, sla: 10 },
    ],
  },
  {
    id: "MRB-2026-005", part: "MSA-005 Antenna Array", lot: "LOT-2026-0710", qty: 4, value: 3200, age: 12,
    disposition: "Under Investigation", peggedJobs: ["JOB-2026-0210"], atRiskValue: 175000, lever: "Expedite RF retest",
    stage: "Investigation", sla: 7, ageInStage: 9, clearETA: "2026-02-20", owner: "S. Chen", location: "WC-004 Hold",
    nextActionDate: "2026-02-11", deliverables: ["CLIN-0009 Tac HF Lot 1"],
    timeline: [
      { stage: "Created", entered: "2026-01-28", exited: "2026-01-29", sla: 1 },
      { stage: "Review", entered: "2026-01-29", exited: "2026-01-31", sla: 5 },
      { stage: "Investigation", entered: "2026-01-31", exited: null, sla: 7 },
    ],
  },
]

// Shelf-life data (enriched)
type ShelfLot = {
  lot: string; part: string; location: string; qty: number; allocatedQty: number; remainingQty: number;
  mfgDate: string; expiry: string; daysToExpiry: number;
  status: "Expired" | "Critical" | "Near-Expiry" | "Healthy"; flagged: boolean;
  owner: string; action: string;
  locations: { loc: string; qty: number }[];
  allocations: { job: string; program: string; qtyNeeded: number; issueDate: string; opStart: string; priority: number; readiness: string }[];
  alternateLots: { lot: string; qty: number; expiry: string; daysLeft: number; location: string }[];
  conflictDays: number; earliestRiskDate: string; atRiskValue: number; scrapValue: number;
}
const shelfLifeData: ShelfLot[] = [
  {
    lot: "LOT-2025-7600", part: "FLUX-NC-01", location: "Chem Store A", qty: 12, allocatedQty: 10, remainingQty: 2,
    mfgDate: "2025-08-10", expiry: "2026-02-10", daysToExpiry: -1, status: "Expired", flagged: true,
    owner: "A. Kim", action: "Replace",
    locations: [{ loc: "Chem Store A", qty: 10 }, { loc: "Bench Stock WC-003", qty: 2 }],
    allocations: [
      { job: "JOB-2026-0218", program: "Tactical HF Radio", qtyNeeded: 6, issueDate: "2026-02-16", opStart: "2026-02-18", priority: 72, readiness: "Blocked" },
      { job: "JOB-2026-0222", program: "Counter-UAS", qtyNeeded: 4, issueDate: "2026-02-20", opStart: "2026-02-22", priority: 55, readiness: "Watch" },
    ],
    alternateLots: [{ lot: "LOT-2026-0310", qty: 8, expiry: "2026-07-15", daysLeft: 156, location: "Chem Store A" }],
    conflictDays: 8, earliestRiskDate: "2026-02-16", atRiskValue: 42000, scrapValue: 1200,
  },
  {
    lot: "LOT-2025-7812", part: "CONFORMAL-COAT", location: "Chem Store A", qty: 8, allocatedQty: 8, remainingQty: 0,
    mfgDate: "2025-09-01", expiry: "2026-02-12", daysToExpiry: 1, status: "Critical", flagged: true,
    owner: "A. Kim", action: "Consume first",
    locations: [{ loc: "Chem Store A", qty: 8 }],
    allocations: [
      { job: "JOB-2026-0218", program: "Tactical HF Radio", qtyNeeded: 5, issueDate: "2026-02-17", opStart: "2026-02-19", priority: 72, readiness: "Blocked" },
      { job: "JOB-2026-0215", program: "Manpack Radio", qtyNeeded: 3, issueDate: "2026-02-14", opStart: "2026-02-15", priority: 85, readiness: "Watch" },
    ],
    alternateLots: [{ lot: "LOT-2026-0288", qty: 12, expiry: "2026-08-20", daysLeft: 192, location: "Chem Store B" }],
    conflictDays: 7, earliestRiskDate: "2026-02-14", atRiskValue: 68000, scrapValue: 2400,
  },
  {
    lot: "LOT-2025-8821", part: "ADHESIVE-EP-01", location: "Chem Store B", qty: 6, allocatedQty: 4, remainingQty: 2,
    mfgDate: "2025-10-15", expiry: "2026-02-14", daysToExpiry: 3, status: "Near-Expiry", flagged: true,
    owner: "M. Torres", action: "Consume first",
    locations: [{ loc: "Chem Store B", qty: 4 }, { loc: "Bench Stock WC-001", qty: 2 }],
    allocations: [
      { job: "JOB-2026-0212", program: "Manpack Radio", qtyNeeded: 4, issueDate: "2026-02-13", opStart: "2026-02-16", priority: 92, readiness: "Watch" },
    ],
    alternateLots: [{ lot: "LOT-2026-0412", qty: 10, expiry: "2026-09-10", daysLeft: 213, location: "3PL-East" }],
    conflictDays: 2, earliestRiskDate: "2026-02-16", atRiskValue: 32000, scrapValue: 800,
  },
  {
    lot: "LOT-2025-9102", part: "SOLDER-PASTE-01", location: "SMT Store", qty: 20, allocatedQty: 18, remainingQty: 2,
    mfgDate: "2025-11-01", expiry: "2026-02-15", daysToExpiry: 4, status: "Near-Expiry", flagged: true,
    owner: "J. Martinez", action: "Consume first",
    locations: [{ loc: "SMT Store", qty: 14 }, { loc: "WC-001 Printer", qty: 6 }],
    allocations: [
      { job: "JOB-2026-0215", program: "Manpack Radio", qtyNeeded: 10, issueDate: "2026-02-14", opStart: "2026-02-17", priority: 85, readiness: "Watch" },
      { job: "JOB-2026-0218", program: "Tactical HF Radio", qtyNeeded: 8, issueDate: "2026-02-16", opStart: "2026-02-18", priority: 72, readiness: "Blocked" },
    ],
    alternateLots: [{ lot: "LOT-2026-0205", qty: 30, expiry: "2026-05-15", daysLeft: 93, location: "SMT Store" }],
    conflictDays: 3, earliestRiskDate: "2026-02-17", atRiskValue: 55000, scrapValue: 3200,
  },
  {
    lot: "LOT-2026-0100", part: "THERMAL-PASTE", location: "Chem Store B", qty: 15, allocatedQty: 6, remainingQty: 9,
    mfgDate: "2026-01-05", expiry: "2026-04-20", daysToExpiry: 68, status: "Healthy", flagged: false,
    owner: "R. Gomez", action: "No action",
    locations: [{ loc: "Chem Store B", qty: 15 }],
    allocations: [
      { job: "JOB-2026-0220", program: "Counter-UAS", qtyNeeded: 6, issueDate: "2026-02-19", opStart: "2026-02-20", priority: 55, readiness: "Ready" },
    ],
    alternateLots: [],
    conflictDays: 0, earliestRiskDate: "N/A", atRiskValue: 0, scrapValue: 0,
  },
  {
    lot: "LOT-2026-0205", part: "SOLDER-PASTE-01", location: "SMT Store", qty: 30, allocatedQty: 10, remainingQty: 20,
    mfgDate: "2026-02-01", expiry: "2026-05-15", daysToExpiry: 93, status: "Healthy", flagged: false,
    owner: "L. Nguyen", action: "No action",
    locations: [{ loc: "SMT Store", qty: 30 }],
    allocations: [
      { job: "JOB-2026-0222", program: "Counter-UAS", qtyNeeded: 10, issueDate: "2026-02-21", opStart: "2026-02-22", priority: 55, readiness: "Ready" },
    ],
    alternateLots: [],
    conflictDays: 0, earliestRiskDate: "N/A", atRiskValue: 0, scrapValue: 0,
  },
  {
    lot: "LOT-2026-0188", part: "FLUX-NC-01", location: "3PL-East", qty: 20, allocatedQty: 0, remainingQty: 20,
    mfgDate: "2026-01-20", expiry: "2026-07-20", daysToExpiry: 161, status: "Healthy", flagged: false,
    owner: "A. Kim", action: "No action",
    locations: [{ loc: "3PL-East", qty: 20 }],
    allocations: [],
    alternateLots: [],
    conflictDays: 0, earliestRiskDate: "N/A", atRiskValue: 0, scrapValue: 0,
  },
]

// Capacity data
// Capacity station data (enriched with routing, daily loads, WIP)
interface CapStation {
  id: string; name: string; workcenter: string; opSeq: number;
  availHrs7d: number; reqHrs7d: number; availHrs14d: number; reqHrs14d: number;
  jobsImpacted: number; maxDelay: number; utilPct: number;
  wipJobs: number; wipHrs: number; avgQueueAge: number;
  dailyLoad: { day: string; avail: number; req: number }[];
  downstreamIds: string[]; upstreamIds: string[];
  shifts: number; otAvail: boolean; crossTrainEligible: string[];
  altRouting: string | null;
  peggedJobs: string[];
  owner: string;
  firstConstraintDate: string | null; worstConstraintDate: string | null;
}
const capacityStations: CapStation[] = [
  {
    id: "WC-001", name: "SMT Line 1", workcenter: "WC-001 SMT Line 1", opSeq: 10,
    availHrs7d: 80, reqHrs7d: 112, availHrs14d: 160, reqHrs14d: 196, jobsImpacted: 3, maxDelay: 8,
    utilPct: 140, wipJobs: 5, wipHrs: 32, avgQueueAge: 2.4,
    dailyLoad: [
      { day: "Feb 10", avail: 16, req: 22 }, { day: "Feb 11", avail: 16, req: 20 },
      { day: "Feb 12", avail: 16, req: 18 }, { day: "Feb 13", avail: 16, req: 16 },
      { day: "Feb 14", avail: 16, req: 20 }, { day: "Feb 17", avail: 16, req: 8 },
      { day: "Feb 18", avail: 16, req: 8 }, { day: "Feb 19", avail: 16, req: 14 },
      { day: "Feb 20", avail: 16, req: 18 }, { day: "Feb 21", avail: 16, req: 16 },
      { day: "Feb 24", avail: 16, req: 22 }, { day: "Feb 25", avail: 16, req: 18 },
      { day: "Feb 26", avail: 16, req: 14 }, { day: "Feb 27", avail: 16, req: 10 },
    ],
    downstreamIds: ["WC-002", "WC-003"], upstreamIds: [],
    shifts: 2, otAvail: true, crossTrainEligible: ["WC-002"],
    altRouting: "WC-002 SMT Line 2", peggedJobs: ["JOB-2026-0201", "JOB-2026-0212", "JOB-2026-0225"],
    owner: "M. Torres", firstConstraintDate: "2026-02-10", worstConstraintDate: "2026-02-10",
  },
  {
    id: "WC-002", name: "SMT Line 2", workcenter: "WC-002 SMT Line 2", opSeq: 10,
    availHrs7d: 72, reqHrs7d: 68, availHrs14d: 144, reqHrs14d: 140, jobsImpacted: 0, maxDelay: 0,
    utilPct: 94, wipJobs: 3, wipHrs: 18, avgQueueAge: 1.2,
    dailyLoad: [
      { day: "Feb 10", avail: 14, req: 12 }, { day: "Feb 11", avail: 14, req: 10 },
      { day: "Feb 12", avail: 14, req: 8 }, { day: "Feb 13", avail: 14, req: 14 },
      { day: "Feb 14", avail: 14, req: 10 }, { day: "Feb 17", avail: 14, req: 8 },
      { day: "Feb 18", avail: 14, req: 6 }, { day: "Feb 19", avail: 14, req: 12 },
      { day: "Feb 20", avail: 14, req: 14 }, { day: "Feb 21", avail: 14, req: 10 },
      { day: "Feb 24", avail: 14, req: 16 }, { day: "Feb 25", avail: 14, req: 14 },
      { day: "Feb 26", avail: 14, req: 12 }, { day: "Feb 27", avail: 14, req: 10 },
    ],
    downstreamIds: ["WC-003"], upstreamIds: [],
    shifts: 2, otAvail: true, crossTrainEligible: ["WC-001"],
    altRouting: "WC-001 SMT Line 1", peggedJobs: ["JOB-2026-0208", "JOB-2026-0222"],
    owner: "L. Nguyen", firstConstraintDate: null, worstConstraintDate: null,
  },
  {
    id: "WC-003", name: "Final Assy A", workcenter: "WC-003 Final Assy A", opSeq: 30,
    availHrs7d: 80, reqHrs7d: 52, availHrs14d: 160, reqHrs14d: 120, jobsImpacted: 0, maxDelay: 0,
    utilPct: 65, wipJobs: 2, wipHrs: 12, avgQueueAge: 0.8,
    dailyLoad: [
      { day: "Feb 10", avail: 16, req: 8 }, { day: "Feb 11", avail: 16, req: 10 },
      { day: "Feb 12", avail: 16, req: 6 }, { day: "Feb 13", avail: 16, req: 8 },
      { day: "Feb 14", avail: 16, req: 6 }, { day: "Feb 17", avail: 16, req: 8 },
      { day: "Feb 18", avail: 16, req: 6 }, { day: "Feb 19", avail: 16, req: 10 },
      { day: "Feb 20", avail: 16, req: 12 }, { day: "Feb 21", avail: 16, req: 8 },
      { day: "Feb 24", avail: 16, req: 14 }, { day: "Feb 25", avail: 16, req: 12 },
      { day: "Feb 26", avail: 16, req: 10 }, { day: "Feb 27", avail: 16, req: 8 },
    ],
    downstreamIds: ["WC-004"], upstreamIds: ["WC-001", "WC-002", "WC-005"],
    shifts: 1, otAvail: true, crossTrainEligible: [],
    altRouting: null, peggedJobs: ["JOB-2026-0205", "JOB-2026-0220"],
    owner: "R. Gomez", firstConstraintDate: null, worstConstraintDate: null,
  },
  {
    id: "WC-004", name: "Test Station 1", workcenter: "WC-004 Test Station 1", opSeq: 40,
    availHrs7d: 40, reqHrs7d: 56, availHrs14d: 80, reqHrs14d: 98, jobsImpacted: 2, maxDelay: 5,
    utilPct: 140, wipJobs: 3, wipHrs: 16, avgQueueAge: 3.1,
    dailyLoad: [
      { day: "Feb 10", avail: 8, req: 12 }, { day: "Feb 11", avail: 8, req: 10 },
      { day: "Feb 12", avail: 8, req: 8 }, { day: "Feb 13", avail: 8, req: 10 },
      { day: "Feb 14", avail: 8, req: 8 }, { day: "Feb 17", avail: 8, req: 8 },
      { day: "Feb 18", avail: 8, req: 12 }, { day: "Feb 19", avail: 8, req: 10 },
      { day: "Feb 20", avail: 8, req: 6 }, { day: "Feb 21", avail: 8, req: 8 },
      { day: "Feb 24", avail: 8, req: 10 }, { day: "Feb 25", avail: 8, req: 6 },
      { day: "Feb 26", avail: 8, req: 4 }, { day: "Feb 27", avail: 8, req: 4 },
    ],
    downstreamIds: [], upstreamIds: ["WC-003"],
    shifts: 1, otAvail: false, crossTrainEligible: [],
    altRouting: null, peggedJobs: ["JOB-2026-0210", "JOB-2026-0220"],
    owner: "S. Chen", firstConstraintDate: "2026-02-10", worstConstraintDate: "2026-02-18",
  },
  {
    id: "WC-005", name: "Cable Assy", workcenter: "WC-005 Cable Assy", opSeq: 20,
    availHrs7d: 40, reqHrs7d: 32, availHrs14d: 80, reqHrs14d: 72, jobsImpacted: 0, maxDelay: 0,
    utilPct: 80, wipJobs: 1, wipHrs: 6, avgQueueAge: 0.5,
    dailyLoad: [
      { day: "Feb 10", avail: 8, req: 6 }, { day: "Feb 11", avail: 8, req: 4 },
      { day: "Feb 12", avail: 8, req: 6 }, { day: "Feb 13", avail: 8, req: 4 },
      { day: "Feb 14", avail: 8, req: 6 }, { day: "Feb 17", avail: 8, req: 6 },
      { day: "Feb 18", avail: 8, req: 4 }, { day: "Feb 19", avail: 8, req: 6 },
      { day: "Feb 20", avail: 8, req: 4 }, { day: "Feb 21", avail: 8, req: 6 },
      { day: "Feb 24", avail: 8, req: 6 }, { day: "Feb 25", avail: 8, req: 8 },
      { day: "Feb 26", avail: 8, req: 4 }, { day: "Feb 27", avail: 8, req: 6 },
    ],
    downstreamIds: ["WC-003"], upstreamIds: [],
    shifts: 1, otAvail: true, crossTrainEligible: ["WC-003"],
    altRouting: null, peggedJobs: ["JOB-2026-0218"],
    owner: "K. Patel", firstConstraintDate: null, worstConstraintDate: null,
  },
  {
    id: "WC-006", name: "Display Integ", workcenter: "WC-006 Display Integ", opSeq: 25,
    availHrs7d: 24, reqHrs7d: 40, availHrs14d: 48, reqHrs14d: 64, jobsImpacted: 1, maxDelay: 6,
    utilPct: 167, wipJobs: 2, wipHrs: 10, avgQueueAge: 4.0,
    dailyLoad: [
      { day: "Feb 10", avail: 4, req: 8 }, { day: "Feb 11", avail: 4, req: 6 },
      { day: "Feb 12", avail: 4, req: 6 }, { day: "Feb 13", avail: 4, req: 4 },
      { day: "Feb 14", avail: 4, req: 8 }, { day: "Feb 17", avail: 4, req: 8 },
      { day: "Feb 18", avail: 4, req: 4 }, { day: "Feb 19", avail: 4, req: 6 },
      { day: "Feb 20", avail: 4, req: 4 }, { day: "Feb 21", avail: 4, req: 6 },
      { day: "Feb 24", avail: 4, req: 4 }, { day: "Feb 25", avail: 4, req: 4 },
      { day: "Feb 26", avail: 4, req: 6 }, { day: "Feb 27", avail: 4, req: 4 },
    ],
    downstreamIds: ["WC-003"], upstreamIds: [],
    shifts: 1, otAvail: false, crossTrainEligible: [],
    altRouting: null, peggedJobs: ["JOB-2026-0215"],
    owner: "J. Martinez", firstConstraintDate: "2026-02-10", worstConstraintDate: "2026-02-14",
  },
]


// ---------- HELPERS ----------
const statusColor = (s: ReadinessStatus) =>
  s === "Ready" ? "bg-green-100 text-green-700 border-green-300" : s === "Watch" ? "bg-amber-100 text-amber-700 border-amber-300" : "bg-red-100 text-red-700 border-red-300"

const confColor = (c: Confidence) =>
  c === "High" ? "bg-green-100 text-green-700" : c === "Med" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"

const blockerColor = (b: string) => {
  if (b === "None") return "bg-green-100 text-green-700"
  if (b.includes("Material")) return "bg-red-100 text-red-700"
  if (b.includes("MRB") || b.includes("Quality")) return "bg-purple-100 text-purple-700"
  if (b.includes("Shelf")) return "bg-orange-100 text-orange-700"
  if (b.includes("Capacity")) return "bg-blue-100 text-blue-700"
  if (b.includes("Supplier")) return "bg-amber-100 text-amber-700"
  return "bg-slate-100 text-slate-700"
}

const fmt = (n: number) => n.toLocaleString("en-US")
const fmtMoney = (n: number) => `$${(n / 1000).toFixed(0)}K`

const getBaselineDate = (job: Job, baseline: "contract" | "iop" | "deliveryPlan" | "pdmForecast") => {
  switch (baseline) {
    case "contract": return job.contractDate
    case "iop": return job.iopDate
    case "deliveryPlan": return job.deliveryPlanDate
    case "pdmForecast": return job.pdmForecastDate
  }
}

const bufferDays = (requiredDate: string, clearDate: string) =>
  Math.round((new Date(requiredDate).getTime() - new Date(clearDate).getTime()) / 86400000)

const gateColor = (status: "Pass" | "Watch" | "Fail") =>
  status === "Pass" ? "bg-green-500" : status === "Watch" ? "bg-amber-400" : "bg-red-500"

// ---------- MAIN COMPONENT ----------
export function ReadyToWork() {
  const [activeSubTab, setActiveSubTab] = useState<string>("ready-to-work")
  const allJobs = useMemo(() => generateJobs(), [])

  // Global filters
  const [site, setSite] = useState("All")
  const [programFilter, setProgramFilter] = useState("All")
  const [horizon, setHorizon] = useState("14")
  const [demandBaseline, setDemandBaseline] = useState<"contract" | "iop" | "deliveryPlan" | "pdmForecast">("contract")
  const [showDateStack, setShowDateStack] = useState(false)
  const [statusToggles, setStatusToggles] = useState<ReadinessStatus[]>(["Ready", "Watch", "Blocked"])
  const [searchQuery, setSearchQuery] = useState("")

  // Drawer
  const [drawerJob, setDrawerJob] = useState<Job | null>(null)
  const [drawerTab, setDrawerTab] = useState("summary")

  // Blocker filter from chart click
  const [blockerFilter, setBlockerFilter] = useState<string | null>(null)

  // Scatter click filter
  const [scatterSelectedId, setScatterSelectedId] = useState<string | null>(null)

  // NC insights
  const [ncDimension, setNcDimension] = useState("defect")
  const [selectedDriverCluster, setSelectedDriverCluster] = useState<string | null>(null)
  const [wcMetricToggle, setWcMetricToggle] = useState<"jobsBlocked" | "atRiskValue" | "reworkHrs" | "scrapCost">("jobsBlocked")

  // Driver cluster data for Quality NC Insights
  const driverClusters = useMemo(() => {
    const openNcs = ncData.filter(n => n.status === "Open")
    // Group by defect family + part family as driver cluster
    const clusterMap: Record<string, {
      name: string; defectFamily: string; topPart: string; topWorkcenter: string; topOperation: string;
      supplier: string; jobsBlocked: number; earliestDueAtRisk: string; totalSlipDays: number; maxSlip: number;
      atRiskValue: number; mrbQty: number; mrbValue: number; recurrenceIndex: number;
      escapePoint: string; reworkHrs: number; scrapCost: number; replaceCost: number; ncIds: string[];
    }> = {}
    openNcs.forEach(nc => {
      const key = `${nc.defect} / ${nc.part}`
      if (!clusterMap[key]) {
        // Find related MRBs
        const relatedMrb = mrbData.filter(m => nc.part.includes(m.part) || m.peggedJobs.some(pj => pj.includes("JOB")))
        const mrbQty = relatedMrb.reduce((s, m) => s + m.qty, 0)
        const mrbVal = relatedMrb.reduce((s, m) => s + m.value, 0)
        clusterMap[key] = {
          name: key, defectFamily: nc.defect, topPart: nc.part, topWorkcenter: nc.workcenter,
          topOperation: nc.operation, supplier: nc.supplier, jobsBlocked: 0, earliestDueAtRisk: "2026-02-14",
          totalSlipDays: 0, maxSlip: 0, atRiskValue: 0, mrbQty, mrbValue: mrbVal,
          recurrenceIndex: 0, escapePoint: nc.operation.includes("Test") ? "Test" : nc.operation.includes("Final") ? "Final" : "In-Process",
          reworkHrs: 0, scrapCost: 0, replaceCost: 0, ncIds: [],
        }
      }
      clusterMap[key].jobsBlocked += nc.jobsBlocked
      clusterMap[key].reworkHrs += nc.reworkHrs
      clusterMap[key].scrapCost += nc.scrapCost
      clusterMap[key].replaceCost += nc.replaceCost
      clusterMap[key].ncIds.push(nc.id)
      const impact = nc.reworkHrs * 50 + nc.scrapCost + nc.replaceCost + nc.jobsBlocked * 25000
      clusterMap[key].atRiskValue += impact
      const slipEst = nc.age > 10 ? Math.ceil(nc.age * 0.6) : Math.ceil(nc.age * 0.4)
      clusterMap[key].totalSlipDays += slipEst
      clusterMap[key].maxSlip = Math.max(clusterMap[key].maxSlip, slipEst)
      clusterMap[key].recurrenceIndex = clusterMap[key].ncIds.length > 1 ? +(clusterMap[key].ncIds.length / 2).toFixed(1) : 0
    })
    return Object.values(clusterMap).sort((a, b) => b.atRiskValue - a.atRiskValue)
  }, [])

  // Blocked work queue filtered by selected driver cluster
  const blockedWorkQueue = useMemo(() => {
    const openNcs = ncData.filter(n => n.status === "Open")
    const selectedCluster = selectedDriverCluster ? driverClusters.find(c => c.name === selectedDriverCluster) : null
    const relevantNcs = selectedCluster ? openNcs.filter(n => `${n.defect} / ${n.part}` === selectedDriverCluster) : openNcs
    // Map NCs to blocked jobs
    return allJobs.filter(j => j.readinessStatus === "Blocked" || j.readinessStatus === "Watch").filter(j => {
      if (!selectedCluster) return j.mrbHolds.length > 0 || j.qualityScore < 15
      return relevantNcs.some(nc => j.workcenter.includes(nc.workcenter.split(" ")[0]) || j.program === nc.program)
    }).map(j => ({
      ...j,
      blockingNcIds: relevantNcs.filter(nc => j.workcenter.includes(nc.workcenter.split(" ")[0]) || j.program === nc.program).map(nc => nc.id),
      projectedSlip: j.slipDays || Math.ceil(Math.random() * 8 + 2),
      nextActionDate: "2026-02-12",
      qtyRequired: Math.floor(Math.random() * 20 + 5),
      qtyOnHold: Math.floor(Math.random() * 10 + 2),
      ncStatus: j.mrbHolds.length > 0 ? "Waiting MRB" : "Investigating",
    }))
  }, [selectedDriverCluster, driverClusters, allJobs])

  // Supplier vs Internal attribution
  const attributionData = useMemo(() => {
    const openNcs = ncData.filter(n => n.status === "Open")
    const filtered = selectedDriverCluster ? openNcs.filter(n => `${n.defect} / ${n.part}` === selectedDriverCluster) : openNcs
    const supplierCaused = filtered.filter(n => n.supplier !== "In-house")
    const processCaused = filtered.filter(n => n.supplier === "In-house" && (n.operation.includes("SMT") || n.operation.includes("Reflow") || n.operation.includes("Coating")))
    const designCaused = filtered.filter(n => n.supplier === "In-house" && n.defect.includes("Polarity"))
    const handlingCaused = filtered.filter(n => n.supplier === "In-house" && n.defect.includes("Damage"))
    const remaining = filtered.length - supplierCaused.length - processCaused.length - designCaused.length - handlingCaused.length
    return [
      { name: "Supplier-Caused", count: supplierCaused.length, jobsBlocked: supplierCaused.reduce((s, n) => s + n.jobsBlocked, 0), value: supplierCaused.reduce((s, n) => s + n.reworkHrs * 50 + n.scrapCost + n.replaceCost, 0), fill: "#8B0000" },
      { name: "Process/Tooling", count: Math.max(processCaused.length, remaining > 0 ? remaining : 0), jobsBlocked: processCaused.reduce((s, n) => s + n.jobsBlocked, 0) + (remaining > 0 ? 1 : 0), value: processCaused.reduce((s, n) => s + n.reworkHrs * 50 + n.scrapCost + n.replaceCost, 0), fill: "#d97706" },
      { name: "Design/Eng Change", count: Math.max(designCaused.length, 1), jobsBlocked: designCaused.reduce((s, n) => s + n.jobsBlocked, 0), value: designCaused.reduce((s, n) => s + n.reworkHrs * 50 + n.scrapCost + n.replaceCost, 0) || 6700, fill: "#2563eb" },
      { name: "Handling/Storage", count: Math.max(handlingCaused.length, 1), jobsBlocked: handlingCaused.reduce((s, n) => s + n.jobsBlocked, 0), value: handlingCaused.reduce((s, n) => s + n.reworkHrs * 50 + n.scrapCost + n.replaceCost, 0) || 800, fill: "#6b7280" },
    ]
  }, [selectedDriverCluster])

  // Trend data (last 12 weeks)
  const trendData = useMemo(() => {
    const weeks = ["W-12", "W-11", "W-10", "W-9", "W-8", "W-7", "W-6", "W-5", "W-4", "W-3", "W-2", "W-1"]
    const topDrivers = driverClusters.slice(0, 5)
    return weeks.map((w, wi) => {
      const point: Record<string, string | number> = { week: w }
      topDrivers.forEach((d, di) => {
        const base = d.atRiskValue / 1000
        const noise = (Math.sin(wi * (di + 1) * 0.8) * base * 0.3)
        point[d.defectFamily] = Math.max(0, Math.round(base * 0.6 + noise + (wi * base * 0.04)))
      })
      return point
    })
  }, [driverClusters])

  // Late job alerts state
  const [selectedAlertJob, setSelectedAlertJob] = useState<Job | null>(null)
  const [alertWorkspaceTab, setAlertWorkspaceTab] = useState<"supply" | "demand">("supply")
  const [rootCauseMetric, setRootCauseMetric] = useState<"count" | "slipDays" | "atRiskValue" | "blockedToShip">("count")
  const [constraintFilter, setConstraintFilter] = useState<string | null>(null)

  // Gantt state
  const [hoveredJob, setHoveredJob] = useState<string | null>(null)
  const [showIopMarker, setShowIopMarker] = useState(false)
  const [showPdmMarker, setShowPdmMarker] = useState(false)
  const [ganttViewMode, setGanttViewMode] = useState<"baseline" | "scenario">("baseline")

  // Capacity state
  const [capViewMode, setCapViewMode] = useState<"workflow" | "bottleneck">("workflow")
  const [capTimeBucket, setCapTimeBucket] = useState<"daily" | "weekly">("daily")
  const [capShowFilter, setCapShowFilter] = useState<"all" | "constrained" | "impacted">("all")
  const [selectedStation, setSelectedStation] = useState<CapStation | null>(null)

  // MRB state
  const [selectedMrbId, setSelectedMrbId] = useState<string | null>(null)
  const [mrbDetailOpen, setMrbDetailOpen] = useState(false)
  const [mrbFilterFromTopBlockers, setMrbFilterFromTopBlockers] = useState<string | null>(null)

  // Shelf-life state
  const [shelfViewMode, setShelfViewMode] = useState<"gantt" | "demand">("gantt")
  const [shelfExpiryThreshold, setShelfExpiryThreshold] = useState(14)
  const [selectedShelfLot, setSelectedShelfLot] = useState<ShelfLot | null>(null)
  const [expandedPartGroups, setExpandedPartGroups] = useState<Set<string>>(new Set(shelfLifeData.map(s => s.part)))

  const toggleStatus = (s: ReadinessStatus) => {
    setStatusToggles(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  const resetFilters = () => {
    setSite("All"); setProgramFilter("All"); setHorizon("14"); setDemandBaseline("contract")
    setStatusToggles(["Ready", "Watch", "Blocked"]); setSearchQuery(""); setBlockerFilter(null); setScatterSelectedId(null)
  }

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    let j = [...allJobs]
    if (programFilter !== "All") j = j.filter(x => x.program === programFilter)
    if (!statusToggles.includes("Ready")) j = j.filter(x => x.readinessStatus !== "Ready")
    if (!statusToggles.includes("Watch")) j = j.filter(x => x.readinessStatus !== "Watch")
    if (!statusToggles.includes("Blocked")) j = j.filter(x => x.readinessStatus !== "Blocked")
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      j = j.filter(x => x.id.toLowerCase().includes(q) || x.program.toLowerCase().includes(q) || x.workcenter.toLowerCase().includes(q))
    }
    if (blockerFilter) j = j.filter(x => x.primaryBlocker === blockerFilter)
    if (scatterSelectedId) j = j.filter(x => x.id === scatterSelectedId)
    if (mrbFilterFromTopBlockers) {
      const mrb = mrbData.find(m => m.id === mrbFilterFromTopBlockers)
      if (mrb) j = j.filter(x => mrb.peggedJobs.includes(x.id))
    }
    return j.sort((a, b) => {
      const aRank = a.businessPriority * 0.6 + a.readinessScore * 0.4
      const bRank = b.businessPriority * 0.6 + b.readinessScore * 0.4
      return bRank - aRank
    })
  }, [allJobs, programFilter, statusToggles, searchQuery, blockerFilter, scatterSelectedId, mrbFilterFromTopBlockers])

  // KPIs
  const readyCount = allJobs.filter(j => j.readinessStatus === "Ready").length
  const watchCount = allJobs.filter(j => j.readinessStatus === "Watch").length
  const blockedCount = allJobs.filter(j => j.readinessStatus === "Blocked").length
  const total = allJobs.length
  const earliestDueAtRisk = allJobs.filter(j => j.readinessStatus !== "Ready").sort((a, b) => a.requiredDate.localeCompare(b.requiredDate))[0]?.requiredDate || "N/A"
  const maxSlip = Math.max(...allJobs.map(j => j.slipDays))
  const atRiskValue = allJobs.filter(j => j.readinessStatus !== "Ready").reduce((s, j) => s + j.value, 0)

  // Blocker breakdown
  const blockerBreakdown = useMemo(() => {
    const cats: BlockerCategory[] = ["Materials Shortage", "MRB / Quality Hold", "Shelf-Life Constraint", "Capacity Constraint", "Supplier Promise Slip", "Other / Unknown"]
    return cats.map(cat => ({
      category: cat,
      shortLabel: cat.split(" ")[0] === "MRB" ? "MRB/Quality" : cat.split(" ")[0] === "Shelf-Life" ? "Shelf-Life" : cat.split(" ")[0] === "Supplier" ? "Supplier" : cat.split("/")[0].trim(),
      count: allJobs.filter(j => j.primaryBlocker === cat).length,
    })).filter(x => x.count > 0)
  }, [allJobs])

  // Scatter data
  const scatterData = allJobs.map(j => ({
    x: j.businessPriority,
    y: j.readinessScore,
    id: j.id,
    status: j.readinessStatus,
    program: j.program,
  }))

  const subTabs = [
    { id: "ready-to-work", label: "Ready to Work" },
    { id: "quality-nc", label: "Quality NC Insights" },
    { id: "supply-demand", label: "Site Supply/Demand" },
    { id: "late-jobs", label: "Late Job Alerts" },
    { id: "shelf-life", label: "Shelf-Life Tracking" },
    { id: "mrb-parts", label: "MRB Parts" },
    { id: "capacity", label: "Capacity Tracking" },
  ]

  // For child tabs: Back to Ready-to-Work button
  const BackButton = ({ filter }: { filter?: string }) => (
    <Button
      variant="outline"
      className="h-7 text-[10px] bg-transparent"
      onClick={() => {
        setActiveSubTab("ready-to-work")
        if (filter) setBlockerFilter(filter)
      }}
    >
      <ArrowLeft className="w-3 h-3 mr-1" />
      Back to Ready-to-Work {filter ? "(filtered)" : ""}
    </Button>
  )

  return (
    <div className="space-y-4">
      {/* Sub-Tab Navigation */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 overflow-x-auto">
        {subTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveSubTab(tab.id); setBlockerFilter(null); setScatterSelectedId(null) }}
            className={`px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${activeSubTab === tab.id ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Global Filter Bar */}
      <Card className="border-slate-200">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] text-slate-500 font-medium">Filters:</span>
            </div>
            <Select value={site} onValueChange={setSite}>
              <SelectTrigger className="h-7 text-[10px] w-[100px]"><SelectValue placeholder="Site" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Sites</SelectItem>
                <SelectItem value="site-a">Site A</SelectItem>
                <SelectItem value="site-b">Site B</SelectItem>
              </SelectContent>
            </Select>
            <Select value={programFilter} onValueChange={setProgramFilter}>
              <SelectTrigger className="h-7 text-[10px] w-[130px]"><SelectValue placeholder="Program" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Programs</SelectItem>
                <SelectItem value="Manpack Radio">Manpack Radio</SelectItem>
                <SelectItem value="Vehicle Mount">Vehicle Mount</SelectItem>
                <SelectItem value="Tactical HF Radio">Tactical HF Radio</SelectItem>
                <SelectItem value="Base Station">Base Station</SelectItem>
              </SelectContent>
            </Select>
            <Select value={horizon} onValueChange={setHorizon}>
              <SelectTrigger className="h-7 text-[10px] w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Next 7 Days</SelectItem>
                <SelectItem value="14">Next 14 Days</SelectItem>
                <SelectItem value="30">Next 30 Days</SelectItem>
                <SelectItem value="60">Next 60 Days</SelectItem>
              </SelectContent>
            </Select>
            <Select value={demandBaseline} onValueChange={(v) => setDemandBaseline(v as "contract" | "iop" | "deliveryPlan" | "pdmForecast")}>
              <SelectTrigger className="h-7 text-[10px] w-[140px] border-amber-300 bg-amber-50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="iop">IOP (Expected Ship)</SelectItem>
                <SelectItem value="deliveryPlan">Delivery Plan</SelectItem>
                <SelectItem value="pdmForecast">PDM Forecast</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={() => setShowDateStack(!showDateStack)}
              className={`px-2 py-1 text-[10px] font-medium rounded border transition-colors ${showDateStack ? "bg-blue-100 text-blue-700 border-blue-300" : "bg-slate-50 text-slate-500 border-slate-200"}`}
            >
              Date Stack {showDateStack ? "ON" : "OFF"}
            </button>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500">Show:</span>
              {(["Ready", "Watch", "Blocked"] as ReadinessStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => toggleStatus(s)}
                  className={`px-2 py-1 text-[10px] font-medium rounded border transition-colors ${statusToggles.includes(s) ? statusColor(s) : "bg-slate-50 text-slate-400 border-slate-200"}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search job/part/WO..."
                className="h-7 text-[10px] pl-7 w-[160px]"
              />
            </div>
            <button onClick={resetFilters} className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ==================== TAB 1: READY TO WORK ==================== */}
      {activeSubTab === "ready-to-work" && (
        <div className="space-y-4">
          {/* 1) RELEASE DECISION CARDS */}
          {(() => {
            const releaseNow = allJobs.filter(j => j.readinessStatus === "Ready")
            const releaseNowValue = releaseNow.reduce((s, j) => s + j.value, 0)
            const nextUp = allJobs.filter(j => j.readinessStatus === "Watch")
            const nextUpEarliest = nextUp.sort((a, b) => a.earliestFeasibleClear.localeCompare(b.earliestFeasibleClear))[0]?.earliestFeasibleClear.replace("2026-", "") || "N/A"
            const interventionReq = allJobs.filter(j => j.readinessStatus === "Blocked" || (j.readinessStatus === "Watch" && j.businessPriority >= 80 && j.readinessScore < 50))
            const interventionValue = interventionReq.reduce((s, j) => s + j.value, 0)
            const atRiskJobs = allJobs.filter(j => j.readinessStatus !== "Ready")
            const earliestContract = atRiskJobs.sort((a, b) => a.contractDate.localeCompare(b.contractDate))[0]
            const maxSlipJob = allJobs.reduce((max, j) => j.slipDays > max.slipDays ? j : max, allJobs[0])
            const highConf = allJobs.filter(j => j.confidence === "High").length
            const medConf = allJobs.filter(j => j.confidence === "Med").length
            const lowConf = allJobs.filter(j => j.confidence === "Low").length
            return (
              <div className="grid grid-cols-6 gap-3">
                <Card className="border-green-200 bg-green-50/30">
                  <CardContent className="p-3">
                    <p className="text-[10px] text-green-700 font-semibold mb-1">Release Now</p>
                    <p className="text-xl font-bold text-green-700">{releaseNow.length}</p>
                    <p className="text-[9px] text-green-600 mt-0.5">{fmtMoney(releaseNowValue)} value protected</p>
                  </CardContent>
                </Card>
                <Card className="border-amber-200 bg-amber-50/30">
                  <CardContent className="p-3">
                    <p className="text-[10px] text-amber-700 font-semibold mb-1">Next Up</p>
                    <p className="text-xl font-bold text-amber-700">{nextUp.length}</p>
                    <p className="text-[9px] text-amber-600 mt-0.5">Earliest clear: {nextUpEarliest}</p>
                  </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50/30">
                  <CardContent className="p-3">
                    <p className="text-[10px] text-red-700 font-semibold mb-1">Intervention Required</p>
                    <p className="text-xl font-bold text-red-700">{interventionReq.length}</p>
                    <p className="text-[9px] text-red-600 mt-0.5">{fmtMoney(interventionValue)} at risk</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200">
                  <CardContent className="p-3">
                    <p className="text-[10px] text-slate-500 font-semibold mb-1">Earliest Contract at Risk</p>
                    <p className="text-xl font-bold text-red-600">{earliestContract?.contractDate.replace("2026-", "") || "N/A"}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">{atRiskJobs.length} jobs / {[...new Set(atRiskJobs.map(j => j.clin))].length} CLINs</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200">
                  <CardContent className="p-3">
                    <p className="text-[10px] text-slate-500 font-semibold mb-1">Max Projected Slip</p>
                    <p className="text-xl font-bold text-red-600">{maxSlipJob.slipDays}d</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">{allJobs.filter(j => j.slipDays > 0).length} jobs slipping</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200">
                  <CardContent className="p-3">
                    <p className="text-[10px] text-slate-500 font-semibold mb-1">Confidence Mix</p>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-sm font-bold text-green-600">{highConf}H</span>
                      <span className="text-sm font-bold text-amber-500">{medConf}M</span>
                      <span className="text-sm font-bold text-red-500">{lowConf}L</span>
                    </div>
                    <div className="flex gap-0.5 mt-1 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-green-500 rounded-l" style={{ width: `${(highConf / total) * 100}%` }} />
                      <div className="bg-amber-400" style={{ width: `${(medConf / total) * 100}%` }} />
                      <div className="bg-red-500 rounded-r" style={{ width: `${(lowConf / total) * 100}%` }} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })()}

          {/* 2) PRIORITY CHAIN STRIP */}
          <Card className="border-slate-200 bg-slate-50">
            <CardContent className="py-2 px-4">
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-slate-400 font-medium">Ranking Logic:</span>
                {[
                  { label: "SIOP Priority", icon: "shield", desc: "DPAS / CLIN / Leadership" },
                  { label: "CLIN", icon: "target" },
                  { label: "Project", icon: "folder" },
                  { label: "Job / WO", icon: "wrench" },
                  { label: "Gates", icon: "check", desc: "Mat / MRB / Routing / Cap / Supplier" },
                  { label: "Release Rank", icon: "hash" },
                ].map((step, i, arr) => (
                  <span key={step.label} className="flex items-center gap-1">
                    <span className="bg-white border border-slate-200 rounded px-1.5 py-0.5 font-medium text-slate-700">{step.label}</span>
                    {step.desc && <span className="text-[8px] text-slate-400">({step.desc})</span>}
                    {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-slate-300" />}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* RELEASE TIMELINE GANTT */}
          {(() => {
            // Sort by baseline required date (earliest first) - DEFAULT VIEW
            const baselineSortedJobs = [...filteredJobs].sort((a, b) => {
              const aReq = new Date(getBaselineDate(a, demandBaseline)).getTime()
              const bReq = new Date(getBaselineDate(b, demandBaseline)).getTime()
              return aReq - bReq
            })
            
            // SCENARIO ANALYSIS VIEW - Optimized reordering to maximize on-time completion
            // Priority: 
            // 1. Jobs that can be pulled forward to meet baseline (positive buffer potential)
            // 2. Jobs already on-time with highest priority
            // 3. Jobs with small delays that can be recovered
            // 4. Jobs that are severely blocked (de-prioritized to end)
            const scenarioSortedJobs = [...filteredJobs].sort((a, b) => {
              const aReq = new Date(getBaselineDate(a, demandBaseline))
              const bReq = new Date(getBaselineDate(b, demandBaseline))
              const aClear = new Date(a.earliestFeasibleClear)
              const bClear = new Date(b.earliestFeasibleClear)
              const aBuffer = bufferDays(getBaselineDate(a, demandBaseline), a.earliestFeasibleClear)
              const bBuffer = bufferDays(getBaselineDate(b, demandBaseline), b.earliestFeasibleClear)
              
              // Count failing gates
              const aFailCount = Object.values(a.gateStatus).filter(g => g.status === "Fail").length
              const bFailCount = Object.values(b.gateStatus).filter(g => g.status === "Fail").length
              
              // Severely blocked jobs (3+ gates failing) go to the end
              const aSeverelyBlocked = aFailCount >= 3 || a.readinessStatus === "Blocked"
              const bSeverelyBlocked = bFailCount >= 3 || b.readinessStatus === "Blocked"
              if (aSeverelyBlocked && !bSeverelyBlocked) return 1
              if (!aSeverelyBlocked && bSeverelyBlocked) return -1
              
              // Calculate "pull potential" - jobs with delays but early clear dates can be pulled forward
              const aPullPotential = aBuffer < 0 && aClear.getTime() < aReq.getTime() + 7 * 86400000 ? Math.abs(aBuffer) : 0
              const bPullPotential = bBuffer < 0 && bClear.getTime() < bReq.getTime() + 7 * 86400000 ? Math.abs(bBuffer) : 0
              
              // Jobs with pull potential (small delays that can be recovered by pulling forward) come first
              if (aPullPotential > 0 && bPullPotential === 0) return -1
              if (bPullPotential > 0 && aPullPotential === 0) return 1
              
              // Within pull candidates, sort by earliest feasible clear
              if (aPullPotential > 0 && bPullPotential > 0) {
                return aClear.getTime() - bClear.getTime()
              }
              
              // On-time jobs sorted by priority then buffer
              if (aBuffer >= 0 && bBuffer >= 0) {
                if (a.businessPriority !== b.businessPriority) return b.businessPriority - a.businessPriority
                return aBuffer - bBuffer // smaller buffer = more urgent
              }
              
              // On-time jobs before late jobs
              if (aBuffer >= 0 && bBuffer < 0) return -1
              if (bBuffer >= 0 && aBuffer < 0) return 1
              
              // Both late - less late ones first
              return bBuffer - aBuffer
            })
            
            // Compute recommendations for scenario view
            const getScenarioRecommendation = (job: Job) => {
              const buffer = bufferDays(getBaselineDate(job, demandBaseline), job.earliestFeasibleClear)
              const failCount = Object.values(job.gateStatus).filter(g => g.status === "Fail").length
              
              if (failCount >= 3 || job.readinessStatus === "Blocked") {
                return { action: "DEPRIORITIZE", color: "#dc2626", bgColor: "#fef2f2", desc: "Push back - blocked" }
              }
              if (buffer >= 0 && job.readinessScore >= 80) {
                return { action: "RELEASE", color: "#15803d", bgColor: "#dcfce7", desc: "Release now" }
              }
              if (buffer < 0 && buffer >= -5 && job.readinessScore >= 60) {
                return { action: "PULL FWD", color: "#2563eb", bgColor: "#dbeafe", desc: `Pull ${Math.abs(buffer)}d forward` }
              }
              if (buffer < 0 && buffer >= -7) {
                return { action: "EXPEDITE", color: "#d97706", bgColor: "#fef3c7", desc: "Expedite gates" }
              }
              if (buffer < -7) {
                return { action: "RESCHEDULE", color: "#7c3aed", bgColor: "#f3e8ff", desc: "Negotiate new date" }
              }
              return { action: "MONITOR", color: "#64748b", bgColor: "#f1f5f9", desc: "Watch status" }
            }
            
            const ganttJobs = ganttViewMode === "baseline" ? baselineSortedJobs : scenarioSortedJobs
            // Parse "YYYY-MM-DD" as local date (day index from epoch)
            const parseDay = (s: string) => {
              const [y, m, d] = s.split("-").map(Number)
              return new Date(y, m - 1, d)
            }
            const todayDate = parseDay("2026-02-11")
            const todayDay = Math.floor(todayDate.getTime() / 86400000)

            // Day-index helper: integer number of days since epoch
            const dayIndex = (s: string) => {
              const [y, m, d] = s.split("-").map(Number)
              return Math.floor(new Date(y, m - 1, d).getTime() / 86400000)
            }

            // Compute range
            const latestDayIdx = ganttJobs.reduce((max, j) => {
              return Math.max(max, dayIndex(j.earliestFeasibleClear), dayIndex(j.plannedFinish))
            }, todayDay)
            const totalDays = Math.max(16, latestDayIdx - todayDay + 3)
            const dayLabels: { dayOff: number; label: string; isWeekend: boolean }[] = []
            for (let d = 0; d <= totalDays; d++) {
              const dt = new Date(todayDate.getTime() + d * 86400000)
              const dow = dt.getDay()
              dayLabels.push({ dayOff: d, label: `${dt.getMonth() + 1}/${dt.getDate()}`, isWeekend: dow === 0 || dow === 6 })
            }

            const rowH = 36
            const headerH = 28
            const labelW = 170
            const chartW = Math.max(700, totalDays * 44)
            const totalW = labelW + chartW
            const totalH = headerH + ganttJobs.length * rowH + 4
            const dayW = chartW / totalDays

            // Map a date string to px offset within chart area
            // Each day column i spans [i*dayW, (i+1)*dayW], label is centered at i*dayW + dayW/2
            // A date that is N days from today maps to the CENTER of column N = N*dayW + dayW/2
            const toPx = (dateStr: string) => {
              const diff = dayIndex(dateStr) - todayDay
              return Math.max(0, Math.min(chartW, diff * dayW + dayW / 2))
            }
            // For bar start: left edge of the day column
            const toPxStart = (dateStr: string) => {
              const diff = dayIndex(dateStr) - todayDay
              return Math.max(0, Math.min(chartW, diff * dayW))
            }
            // For bar end: right edge of the day column
            const toPxEnd = (dateStr: string) => {
              const diff = dayIndex(dateStr) - todayDay
              return Math.max(0, Math.min(chartW, (diff + 1) * dayW))
            }

            const gateIcons = ["M", "Q", "R", "C", "S"] as const
            const gateKeys = ["materials", "mrb", "routing", "capacity", "supplier"] as const

            return (
              <Card className="border-slate-200">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm">Release Timeline Gantt</CardTitle>
                      <p className="text-[10px] text-slate-500">
                        {ganttViewMode === "baseline" 
                          ? "Sorted by baseline required date. Solid bar = planned window. Striped extension = projected slip. Diamond = baseline date."
                          : "Scenario Analysis: Re-prioritized to maximize on-time delivery. Pull forward recoverable jobs, deprioritize blocked ones."
                        }
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* View Toggle */}
                      <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5 mr-2">
                        <button
                          onClick={() => setGanttViewMode("baseline")}
                          className={`px-2.5 py-1 text-[9px] font-semibold rounded-md transition-all ${
                            ganttViewMode === "baseline" 
                              ? "bg-white text-slate-800 shadow-sm" 
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          Baseline View
                        </button>
                        <button
                          onClick={() => setGanttViewMode("scenario")}
                          className={`px-2.5 py-1 text-[9px] font-semibold rounded-md transition-all ${
                            ganttViewMode === "scenario" 
                              ? "bg-blue-600 text-white shadow-sm" 
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          Scenario Analysis
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-2.5 text-[9px] mr-2">
                        <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm bg-green-100 border border-green-500" /> On-time</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm bg-amber-100 border border-amber-500" /> Near-Ready</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm bg-red-100 border border-red-500" /> Blocked</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm" style={{ background: "repeating-linear-gradient(45deg, #fecaca, #fecaca 2px, #fff 2px, #fff 4px)" }} /> Slip</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-slate-800 rotate-45" /> Baseline</span>
                        {showIopMarker && <span className="flex items-center gap-1"><span className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[7px] border-l-transparent border-r-transparent border-b-blue-600" /> IOP</span>}
                        {showPdmMarker && <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border-2 border-purple-600 bg-purple-100" /> PDM</span>}
                      </div>
                      <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                        <button
                          onClick={() => setShowIopMarker(!showIopMarker)}
                          className={`px-2 py-0.5 text-[9px] font-medium rounded-md border transition-colors ${showIopMarker ? "bg-blue-50 border-blue-400 text-blue-700" : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"}`}
                        >
                          IOP
                        </button>
                        <button
                          onClick={() => setShowPdmMarker(!showPdmMarker)}
                          className={`px-2 py-0.5 text-[9px] font-medium rounded-md border transition-colors ${showPdmMarker ? "bg-purple-50 border-purple-400 text-purple-700" : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"}`}
                        >
                          PDM
                        </button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <svg width={totalW} height={totalH} className="w-full" viewBox={`0 0 ${totalW} ${totalH}`} preserveAspectRatio="xMinYMin meet" style={{ minWidth: totalW }}>
                    <defs>
                      <pattern id="slipHatchRed" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                        <rect width="6" height="6" fill="#fef2f2" />
                        <line x1="0" y1="0" x2="0" y2="6" stroke="#fca5a5" strokeWidth="2" />
                      </pattern>
                      <pattern id="slipHatchAmber" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                        <rect width="6" height="6" fill="#fffbeb" />
                        <line x1="0" y1="0" x2="0" y2="6" stroke="#fcd34d" strokeWidth="2" />
                      </pattern>
                      <filter id="ganttShadow" x="-4" y="-4" width="108%" height="130%">
                        <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.1" />
                      </filter>
                    </defs>

                    {/* Column headers */}
                    <rect x={0} y={0} width={totalW} height={headerH} fill="#f8fafc" />
                    <line x1={labelW} y1={0} x2={labelW} y2={totalH} stroke="#e2e8f0" strokeWidth={1} />
                    <text x={8} y={18} fontSize={9} fontWeight={600} fill="#64748b">Job / WO</text>
                    {dayLabels.map((d, i) => (
                      <g key={i}>
                        {d.isWeekend && <rect x={labelW + i * dayW} y={headerH} width={dayW} height={totalH - headerH} fill="#f8fafc" opacity={0.4} />}
                        <line x1={labelW + i * dayW} y1={headerH} x2={labelW + i * dayW} y2={totalH} stroke="#e2e8f0" strokeWidth={0.5} />
                        <text x={labelW + i * dayW + dayW / 2} y={18} fontSize={8} textAnchor="middle" fill={d.isWeekend ? "#94a3b8" : "#475569"} fontWeight={i === 0 ? 700 : 400}>
                          {d.label}
                        </text>
                      </g>
                    ))}
                    <line x1={0} y1={headerH} x2={totalW} y2={headerH} stroke="#cbd5e1" strokeWidth={1} />

                    {/* Today line */}
                    {(() => {
                      const todayX = labelW + dayW / 2
                      return (
                        <g>
                          <line x1={todayX} y1={headerH - 2} x2={todayX} y2={totalH} stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 2" opacity={0.7} />
                          <text x={todayX + 4} y={headerH + 10} fontSize={7} fontWeight={600} fill="#3b82f6">Today</text>
                        </g>
                      )
                    })()}

                    {/* Rows */}
                    {ganttJobs.map((job, idx) => {
                      const y = headerH + idx * rowH
                      const baselineReq = getBaselineDate(job, demandBaseline)
                      const buf = bufferDays(baselineReq, job.earliestFeasibleClear)
                      const isLate = buf < 0

                      // Key pixel positions -- all use toPx (center-of-column) for consistent alignment
                      const reqX = toPx(baselineReq)                         // diamond = contract date
                      const barStartX = toPx(job.plannedStart)               // bar left edge
                      const clearEndX = toPx(job.earliestFeasibleClear)      // bar right edge = projected clear

                      // The bar represents: planned start --> projected clear date
                      // The diamond (contract date) splits the bar: solid before, striped after
                      // If clear is BEFORE contract: solid bar ends at clear, gap to diamond = visible buffer
                      // If clear is AFTER contract: solid to diamond, then striped from diamond to clear
                      const solidEndX = Math.min(clearEndX, reqX)
                      const solidW = Math.max(solidEndX - barStartX, 4)

                      // Striped portion: only if projected clear is PAST the contract date
                      const hasStripe = isLate
                      const stripeStartX = reqX
                      const stripeW = isLate ? Math.max(clearEndX - reqX, 0) : 0

                      const statusColor = job.readinessStatus === "Ready"
                        ? { stroke: "#22c55e", fill: "#dcfce7", text: "#15803d", bg: "#f0fdf4" }
                        : job.readinessStatus === "Watch"
                        ? { stroke: "#f59e0b", fill: "#fef3c7", text: "#b45309", bg: "#fffbeb" }
                        : { stroke: "#ef4444", fill: "#fecaca", text: "#dc2626", bg: "#fef2f2" }

                      const failGates = gateKeys.filter(k => job.gateStatus[k].status === "Fail")
                      const watchGatesArr = gateKeys.filter(k => job.gateStatus[k].status === "Watch")
                      const isHovered = hoveredJob === job.id

                      const rightEdge = labelW + (isLate ? clearEndX : clearEndX)
                      const bufLabel = buf >= 0 ? `+${buf}d` : `${buf}d`

                      // Format date for bar label
                      const fmtShort = (s: string) => s.replace("2026-0", "").replace("2026-", "").replace("-", "/")

                      return (
                        <g key={job.id} className="cursor-pointer" onClick={() => { setDrawerJob(job); setDrawerTab("summary") }} onMouseEnter={() => setHoveredJob(job.id)} onMouseLeave={() => setHoveredJob(null)}>
                          {/* Row bg */}
                          <rect x={0} y={y} width={totalW} height={rowH} fill={isHovered ? "#f1f5f9" : idx % 2 === 0 ? "#ffffff" : "#fafbfc"} />
                          <line x1={0} y1={y + rowH} x2={totalW} y2={y + rowH} stroke="#f1f5f9" strokeWidth={0.5} />

                          {/* Job label */}
                          <text x={8} y={y + 14} fontSize={9} fontWeight={600} fill="#1e293b">{job.id}</text>
                          <text x={8} y={y + 24} fontSize={7} fill="#64748b">{job.program} | Req: {fmtShort(baselineReq)}</text>

                          {/* Score badge */}
                          <rect x={140} y={y + 7} width={24} height={14} rx={3} fill={statusColor.bg} stroke={statusColor.stroke} strokeWidth={1} />
                          <text x={152} y={y + 17} fontSize={8} fontWeight={700} fill={statusColor.text} textAnchor="middle">{job.readinessScore}</text>

                          {/* Scenario recommendation badge (only in scenario view) */}
                          {ganttViewMode === "scenario" && (() => {
                            const rec = getScenarioRecommendation(job)
                            return (
                              <g>
                                <rect x={100} y={y + 22} width={65} height={12} rx={2} fill={rec.bgColor} stroke={rec.color} strokeWidth={0.75} />
                                <text x={132} y={y + 30} fontSize={6} fontWeight={700} fill={rec.color} textAnchor="middle">{rec.action}</text>
                              </g>
                            )
                          })()}

                          {/* SCENARIO VIEW: Show recommended start adjustment (pull forward arrow) */}
                          {ganttViewMode === "scenario" && isLate && buf >= -7 && job.readinessScore >= 50 && (() => {
                            // Calculate recommended start position (pull forward by slip days)
                            const pullDays = Math.min(Math.abs(buf), 5)
                            const recStartDate = new Date(new Date(job.plannedStart).getTime() - pullDays * 86400000)
                            const recStartStr = recStartDate.toISOString().slice(0, 10)
                            const recStartX = toPx(recStartStr)
                            
                            return (
                              <g>
                                {/* Dashed line from recommended start to actual start */}
                                <line 
                                  x1={labelW + recStartX + 2} 
                                  y1={y + 17} 
                                  x2={labelW + barStartX - 2} 
                                  y2={y + 17} 
                                  stroke="#2563eb" 
                                  strokeWidth={1.5} 
                                  strokeDasharray="4 2"
                                />
                                {/* Arrow pointing right */}
                                <polygon 
                                  points={`${labelW + barStartX - 2},${y + 14} ${labelW + barStartX + 3},${y + 17} ${labelW + barStartX - 2},${y + 20}`} 
                                  fill="#2563eb"
                                />
                                {/* Recommended start marker (blue diamond) */}
                                <polygon 
                                  points={`${labelW + recStartX},${y + 12} ${labelW + recStartX + 4},${y + 17} ${labelW + recStartX},${y + 22} ${labelW + recStartX - 4},${y + 17}`} 
                                  fill="#2563eb" 
                                  opacity={0.8}
                                />
                                {/* "PULL" label */}
                                <text x={labelW + recStartX} y={y + 6} fontSize={6} fontWeight={700} fill="#2563eb" textAnchor="middle">
                                  PULL {pullDays}d
                                </text>
                              </g>
                            )
                          })()}

                          {/* SOLID bar: planned start up to contract date (or end of bar if before contract) */}
                          <rect x={labelW + barStartX} y={y + 8} width={solidW} height={18} rx={3}
                            fill={statusColor.bg} stroke={statusColor.stroke} strokeWidth={1.5}
                            opacity={isHovered ? 1 : 0.9}
                          />

                          {/* Date label on solid bar */}
                          {solidW > 30 && (
                            <text x={labelW + barStartX + solidW / 2} y={y + 20} fontSize={7} fontWeight={600} textAnchor="middle" fill={statusColor.text}>
                              {fmtShort(job.plannedStart)} - {fmtShort(job.earliestFeasibleClear)}
                            </text>
                          )}

                          {/* STRIPED bar: anything past the contract date */}
                          {hasStripe && stripeW > 2 && (
                            <g>
                              <rect x={labelW + stripeStartX} y={y + 8} width={stripeW} height={18} rx={0}
                                fill={job.readinessStatus === "Blocked" ? "url(#slipHatchRed)" : "url(#slipHatchAmber)"}
                                stroke={statusColor.stroke} strokeWidth={1} strokeDasharray="3 2"
                              />
                              {stripeW > 24 && (
                                <text x={labelW + stripeStartX + stripeW / 2} y={y + 20} fontSize={7} fontWeight={700} textAnchor="middle" fill={statusColor.text}>
                                  {bufLabel}
                                </text>
                              )}
                            </g>
                          )}

                          {/* Buffer / slip label to the right of bar */}
                          {(!hasStripe || stripeW <= 24) && (
                            <text x={rightEdge + 6} y={y + 20} fontSize={8} fontWeight={700} fill={isLate ? "#dc2626" : "#15803d"}>
                              {bufLabel}
                            </text>
                          )}

                          {/* Contract date diamond marker */}
                          <polygon points={`${labelW + reqX},${y + 2} ${labelW + reqX + 5},${y + 8} ${labelW + reqX},${y + 14} ${labelW + reqX - 5},${y + 8}`} fill="#1e293b" opacity={0.85} />

                          {/* IOP marker (triangle) */}
                          {showIopMarker && (() => {
                            const iopX = labelW + toPx(job.iopDate)
                            return (
                              <g>
                                <polygon points={`${iopX - 4},${y + 28} ${iopX + 4},${y + 28} ${iopX},${y + 22}`} fill="#2563eb" opacity={0.85} />
                                {isHovered && (
                                  <text x={iopX} y={y + 34} fontSize={6} fontWeight={600} textAnchor="middle" fill="#2563eb">IOP {fmtShort(job.iopDate)}</text>
                                )}
                              </g>
                            )
                          })()}

                          {/* PDM marker (circle) */}
                          {showPdmMarker && (() => {
                            const pdmX = labelW + toPx(job.pdmForecastDate)
                            return (
                              <g>
                                <circle cx={pdmX} cy={y + 25} r={4} fill="#f3e8ff" stroke="#9333ea" strokeWidth={1.5} opacity={0.85} />
                                {isHovered && (
                                  <text x={pdmX} y={y + 34} fontSize={6} fontWeight={600} textAnchor="middle" fill="#9333ea">PDM {fmtShort(job.pdmForecastDate)}</text>
                                )}
                              </g>
                            )
                          })()}

                          {/* Gate dots below bar */}
                          {failGates.map((gk, gi) => (
                            <g key={gk}>
                              <circle cx={rightEdge + 8 + gi * 13} cy={y + 30} r={5} fill="#fef2f2" stroke="#ef4444" strokeWidth={1} />
                              <text x={rightEdge + 8 + gi * 13} y={y + 33} fontSize={6} fontWeight={700} fill="#dc2626" textAnchor="middle">
                                {gateIcons[gateKeys.indexOf(gk)]}
                              </text>
                            </g>
                          ))}
                          {watchGatesArr.map((gk, gi) => (
                            <g key={gk}>
                              <circle cx={rightEdge + 8 + (failGates.length + gi) * 13} cy={y + 30} r={5} fill="#fffbeb" stroke="#f59e0b" strokeWidth={1} />
                              <text x={rightEdge + 8 + (failGates.length + gi) * 13} y={y + 33} fontSize={6} fontWeight={700} fill="#b45309" textAnchor="middle">
                                {gateIcons[gateKeys.indexOf(gk)]}
                              </text>
                            </g>
                          ))}

                          {/* Tooltip on hover */}
                          {isHovered && (
                            <g>
                              <rect x={Math.min(rightEdge + 50, totalW - 235)} y={y - 10} width={230} height={ganttViewMode === "scenario" ? 72 : 62} rx={4} fill="white" stroke="#cbd5e1" strokeWidth={1} filter="url(#ganttShadow)" />
                              <text x={Math.min(rightEdge + 56, totalW - 229)} y={y + 2} fontSize={8} fontWeight={700} fill="#1e293b">{job.id} | {job.program} | {job.clin}</text>
                              <text x={Math.min(rightEdge + 56, totalW - 229)} y={y + 12} fontSize={7} fill="#64748b">
                                {`Score: ${job.readinessScore} | Pri: ${job.businessPriority} | Buffer: ${bufLabel}`}
                              </text>
                              <text x={Math.min(rightEdge + 56, totalW - 229)} y={y + 22} fontSize={7} fill="#475569">
                                {`Planned: ${fmtShort(job.plannedStart)} \u2192 ${fmtShort(job.plannedFinish)} | Contract: ${fmtShort(baselineReq)}`}
                              </text>
                              <text x={Math.min(rightEdge + 56, totalW - 229)} y={y + 32} fontSize={7} fill={isLate ? "#dc2626" : "#15803d"}>
                                {`Proj. clear: ${fmtShort(job.earliestFeasibleClear)}${isLate ? ` (${Math.abs(buf)}d late)` : " (on-time)"}`}
                              </text>
                              <text x={Math.min(rightEdge + 56, totalW - 229)} y={y + 42} fontSize={7} fill={job.primaryBlocker !== "None" ? "#dc2626" : "#64748b"}>
                                {job.primaryBlocker !== "None" ? `Blocker: ${job.primaryBlocker}` : `Next: ${job.nextAction.slice(0, 45)}`}
                              </text>
                              {ganttViewMode === "scenario" && (() => {
                                const rec = getScenarioRecommendation(job)
                                return (
                                  <text x={Math.min(rightEdge + 56, totalW - 229)} y={y + 52} fontSize={7} fontWeight={600} fill={rec.color}>
                                    {`Recommendation: ${rec.action} - ${rec.desc}`}
                                  </text>
                                )
                              })()}
                            </g>
                          )}
                        </g>
                      )
                    })}
                  </svg>
                </CardContent>
              </Card>
            )
          })()}

          {/* 3) THREE-LANE DECISION VIEW */}
          {(() => {
            const sorted = [...filteredJobs]
            
            // BASELINE VIEW LANES (original logic)
            const baselineLaneA = sorted.filter(j => j.readinessStatus === "Ready" && j.businessPriority >= 70 && j.confidence === "High")
            const baselineLaneB = sorted.filter(j => {
              if (baselineLaneA.includes(j)) return false
              const failCount = Object.values(j.gateStatus).filter(g => g.status === "Fail").length
              const buf = bufferDays(getBaselineDate(j, demandBaseline), j.earliestFeasibleClear)
              return (j.readinessStatus === "Watch" || j.readinessStatus === "Ready") && failCount <= 2 && buf >= -7
            })
            const baselineLaneC = sorted.filter(j => !baselineLaneA.includes(j) && !baselineLaneB.includes(j))
            
            // SCENARIO VIEW LANES - Re-prioritized to maximize on-time delivery
            // Lane A: PULL FORWARD - Jobs with slip that can still meet baseline if started earlier
            const scenarioLaneA = sorted.filter(j => {
              const buf = bufferDays(getBaselineDate(j, demandBaseline), j.earliestFeasibleClear)
              const failCount = Object.values(j.gateStatus).filter(g => g.status === "Fail").length
              // Jobs with small delays (1-5 days) that have high readiness and can be pulled forward
              return buf < 0 && buf >= -5 && j.readinessScore >= 60 && failCount <= 1
            }).sort((a, b) => {
              // Sort by earliest feasible clear date (can complete soonest first)
              return new Date(a.earliestFeasibleClear).getTime() - new Date(b.earliestFeasibleClear).getTime()
            })
            
            // Lane B: RELEASE NOW - On-time jobs that can be pushed back slightly if needed
            const scenarioLaneB = sorted.filter(j => {
              if (scenarioLaneA.includes(j)) return false
              const buf = bufferDays(getBaselineDate(j, demandBaseline), j.earliestFeasibleClear)
              const failCount = Object.values(j.gateStatus).filter(g => g.status === "Fail").length
              // On-time or slightly ahead jobs with good readiness
              return buf >= 0 && j.readinessScore >= 70 && failCount === 0
            }).sort((a, b) => {
              // Sort by buffer (smallest buffer first - least slack)
              const aBuf = bufferDays(getBaselineDate(a, demandBaseline), a.earliestFeasibleClear)
              const bBuf = bufferDays(getBaselineDate(b, demandBaseline), b.earliestFeasibleClear)
              return aBuf - bBuf
            })
            
            // Lane C: DEPRIORITIZE - Blocked jobs that cannot meet baseline anyway
            const scenarioLaneC = sorted.filter(j => {
              if (scenarioLaneA.includes(j) || scenarioLaneB.includes(j)) return false
              const buf = bufferDays(getBaselineDate(j, demandBaseline), j.earliestFeasibleClear)
              const failCount = Object.values(j.gateStatus).filter(g => g.status === "Fail").length
              // Severely blocked or significantly late
              return failCount >= 2 || buf < -7 || j.readinessStatus === "Blocked"
            })
            
            // Lane D (scenario only): MONITOR - Everything else
            const scenarioLaneD = sorted.filter(j => 
              !scenarioLaneA.includes(j) && !scenarioLaneB.includes(j) && !scenarioLaneC.includes(j)
            )
            
            // Select lanes based on view mode
            const laneA = ganttViewMode === "scenario" ? scenarioLaneA : baselineLaneA
            const laneB = ganttViewMode === "scenario" ? scenarioLaneB : baselineLaneB
            const laneC = ganttViewMode === "scenario" ? scenarioLaneC : baselineLaneC

            const blockerCounts = (jobs: Job[]) => {
              const counts: Record<string, number> = {}
              for (const j of jobs) {
                if (j.primaryBlocker !== "None") counts[j.primaryBlocker] = (counts[j.primaryBlocker] || 0) + 1
              }
              return Object.entries(counts).sort((a, b) => b[1] - a[1])
            }

            const ReleaseTable = ({ jobs, rankOffset }: { jobs: Job[]; rankOffset: number }) => (
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-b border-slate-200">
                    <TableHead className="text-[9px] font-semibold text-slate-600 w-8">#</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600">Job / WO</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600">CLIN</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600">Program / Project</TableHead>
                    {ganttViewMode === "scenario" && (
                      <TableHead className="text-[9px] font-semibold text-blue-600">Rec. Start</TableHead>
                    )}
                    <TableHead className="text-[9px] font-semibold text-slate-600">Baseline Req</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600">Projected</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600 text-right">Buffer</TableHead>
                    {ganttViewMode === "scenario" && (
                      <TableHead className="text-[9px] font-semibold text-blue-600 text-center">Action</TableHead>
                    )}
                    <TableHead className="text-[9px] font-semibold text-slate-600 text-right">Biz Pri</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600 text-right">Ready</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600">Conf</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600">Primary Blocker</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600">Gates</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600">Next Best Action</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600">Owner</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job, idx) => {
                    const baseDt = getBaselineDate(job, demandBaseline)
                    const buf = bufferDays(baseDt, job.earliestFeasibleClear)
                    const gates = job.gateStatus
                    return (
                      <React.Fragment key={job.id}>
                        <TableRow className="hover:bg-slate-50 cursor-pointer" onClick={() => { setDrawerJob(job); setDrawerTab("summary") }}>
                          <TableCell className="text-[10px] text-slate-500 font-medium">{rankOffset + idx + 1}</TableCell>
                          <TableCell className="text-[10px] text-[#8B0000] font-bold">{job.id}</TableCell>
                          <TableCell className="text-[10px]">
                            <span className="text-slate-700 font-medium">{job.clin}</span>
                            {job.dpas && <Badge className="text-[7px] bg-red-100 text-red-700 ml-1">{job.dpas}</Badge>}
                          </TableCell>
                          <TableCell className="text-[10px] text-slate-600">{job.program}<span className="text-slate-400 ml-1 text-[8px]">{job.project.split(" ").slice(1).join(" ")}</span></TableCell>
                          {ganttViewMode === "scenario" && (() => {
                            // Calculate recommended start date
                            const pullDays = buf < 0 && buf >= -5 && job.readinessScore >= 60 ? Math.min(Math.abs(buf), 5) : 0
                            const recStart = pullDays > 0 
                              ? new Date(new Date(job.plannedStart).getTime() - pullDays * 86400000).toISOString().slice(0, 10)
                              : job.plannedStart
                            const isEarlier = pullDays > 0
                            return (
                              <TableCell className={`text-[10px] font-medium ${isEarlier ? "text-blue-600" : "text-slate-500"}`}>
                                {recStart.replace("2026-", "")}
                                {isEarlier && <span className="text-[8px] ml-0.5">(-{pullDays}d)</span>}
                              </TableCell>
                            )
                          })()}
                          <TableCell className="text-[10px] text-slate-700">{baseDt.replace("2026-", "")}</TableCell>
                          <TableCell className="text-[10px] text-slate-700">{job.earliestFeasibleClear.replace("2026-", "")}</TableCell>
                          <TableCell className={`text-[10px] text-right font-bold ${buf < 0 ? "text-red-600" : buf <= 3 ? "text-amber-600" : "text-green-600"}`}>{buf > 0 ? `+${buf}d` : `${buf}d`}</TableCell>
                          {ganttViewMode === "scenario" && (() => {
                            const buffer = bufferDays(getBaselineDate(job, demandBaseline), job.earliestFeasibleClear)
                            const failCount = Object.values(job.gateStatus).filter(g => g.status === "Fail").length
                            let rec = { action: "MONITOR", color: "#64748b", bgColor: "#f1f5f9" }
                            if (failCount >= 3 || job.readinessStatus === "Blocked") {
                              rec = { action: "DEPRIORITIZE", color: "#dc2626", bgColor: "#fef2f2" }
                            } else if (buffer >= 0 && job.readinessScore >= 80) {
                              rec = { action: "RELEASE", color: "#15803d", bgColor: "#dcfce7" }
                            } else if (buffer < 0 && buffer >= -5 && job.readinessScore >= 60) {
                              rec = { action: "PULL FWD", color: "#2563eb", bgColor: "#dbeafe" }
                            } else if (buffer < 0 && buffer >= -7) {
                              rec = { action: "EXPEDITE", color: "#d97706", bgColor: "#fef3c7" }
                            } else if (buffer < -7) {
                              rec = { action: "RESCHEDULE", color: "#7c3aed", bgColor: "#f3e8ff" }
                            }
                            return (
                              <TableCell className="text-center">
                                <Badge className="text-[7px] font-bold" style={{ backgroundColor: rec.bgColor, color: rec.color, borderColor: rec.color }}>{rec.action}</Badge>
                              </TableCell>
                            )
                          })()}
                          <TableCell className="text-[10px] text-right font-medium text-slate-900">{job.businessPriority}</TableCell>
                          <TableCell className="text-[10px] text-right font-medium text-slate-900">{job.readinessScore}</TableCell>
                          <TableCell><Badge className={`text-[8px] ${confColor(job.confidence)}`}>{job.confidence}</Badge></TableCell>
                          <TableCell><Badge className={`text-[8px] ${blockerColor(job.primaryBlocker)}`}>{job.primaryBlocker === "None" ? "Clear" : job.primaryBlocker.split(" ")[0]}</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-0.5">
                              {(["materials", "mrb", "routing", "capacity", "supplier"] as const).map(g => (
                                <div key={g} className={`w-2.5 h-2.5 rounded-full ${gateColor(gates[g].status)}`} title={`${g}: ${gates[g].status} (clear: ${gates[g].clearDate})`} />
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-[10px] text-slate-600 max-w-[140px] truncate">{job.nextAction}</TableCell>
                          <TableCell className="text-[10px] text-slate-600">{job.owner}</TableCell>
                        </TableRow>
                        {showDateStack && (
                          <TableRow className="bg-blue-50/30">
                            <TableCell colSpan={ganttViewMode === "scenario" ? 16 : 14} className="py-1.5 px-4">
                              <div className="flex items-center gap-6 text-[9px]">
                                <span className="text-slate-400 font-medium">Date Stack:</span>
                                {[
                                  { label: "Contract", date: job.contractDate },
                                  { label: "IOP", date: job.iopDate },
                                  { label: "Del Plan", date: job.deliveryPlanDate },
                                  { label: "PDM", date: job.pdmForecastDate },
                                  { label: "Projected", date: job.earliestFeasibleClear },
                                ].map(d => {
                                  const drift = bufferDays(job.contractDate, d.date)
                                  return (
                                    <span key={d.label} className="flex items-center gap-1">
                                      <span className="text-slate-500">{d.label}:</span>
                                      <span className="font-medium text-slate-700">{d.date.replace("2026-", "")}</span>
                                      {d.label !== "Contract" && drift !== 0 && (
                                        <span className={`text-[8px] ${drift < 0 ? "text-red-500" : "text-green-500"}`}>({drift > 0 ? `+${drift}` : drift}d)</span>
                                      )}
                                    </span>
                                  )
                                })}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            )

            const lanes = ganttViewMode === "scenario" ? [
              { id: "A", label: "PULL FORWARD", desc: "Jobs with slip that can meet baseline if started earlier - prioritize these first", jobs: laneA, borderColor: "border-l-blue-500", bgHeader: "bg-blue-50" },
              { id: "B", label: "ON-TIME (CAN DEFER)", desc: "Currently on-time jobs - can push back slightly to make room for pull-forward jobs", jobs: laneB, borderColor: "border-l-green-500", bgHeader: "bg-green-50" },
              { id: "C", label: "DEPRIORITIZE", desc: "Blocked or severely late - will miss baseline anyway, defer to free capacity", jobs: laneC, borderColor: "border-l-red-500", bgHeader: "bg-red-50" },
              ...(scenarioLaneD.length > 0 ? [{ id: "D", label: "MONITOR", desc: "Jobs requiring attention but not critical path", jobs: scenarioLaneD, borderColor: "border-l-slate-400", bgHeader: "bg-slate-50" }] : [])
            ] : [
              { id: "A", label: "RELEASE NOW", desc: "High business priority + all gates passing + high confidence", jobs: laneA, borderColor: "border-l-green-500", bgHeader: "bg-green-50" },
              { id: "B", label: "NEXT UP (NEAR-READY)", desc: "1-2 gates failing, earliest clear date within horizon", jobs: laneB, borderColor: "border-l-amber-400", bgHeader: "bg-amber-50" },
              { id: "C", label: "INTERVENTION REQUIRED", desc: "Blocked items with high business impact or negative buffer", jobs: laneC, borderColor: "border-l-red-500", bgHeader: "bg-red-50" },
            ]

            let cumOffset = 0
            return (
              <div className="space-y-3">
                {/* Scenario Analysis Summary Banner */}
                {ganttViewMode === "scenario" && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 rounded-full p-1.5">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-blue-900">Scenario Analysis: Maximize On-Time Delivery</h4>
                        <p className="text-[10px] text-blue-700 mt-0.5">
                          Jobs re-prioritized to complete more work before baseline dates. 
                          <span className="font-semibold"> Pull Forward</span> jobs with small delays by starting earlier. 
                          <span className="font-semibold"> Deprioritize</span> blocked jobs to free capacity. 
                          <span className="font-semibold"> On-Time</span> jobs can be deferred slightly if needed.
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-[9px]">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            <span className="text-blue-800 font-medium">Pull Forward: {scenarioLaneA.length} jobs</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            <span className="text-blue-800">Can Defer: {scenarioLaneB.length} jobs</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            <span className="text-blue-800">Deprioritize: {scenarioLaneC.length} jobs</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {lanes.map(lane => {
                  const offset = cumOffset
                  cumOffset += lane.jobs.length
                  const bc = blockerCounts(lane.jobs)
                  return (
                    <Card key={lane.id} className={`border-slate-200 border-l-4 ${lane.borderColor}`}>
                      <CardHeader className={`pb-1.5 pt-3 px-4 ${lane.bgHeader}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-xs font-bold">{lane.id}. {lane.label}</CardTitle>
                            <Badge className="text-[9px] bg-white/80 text-slate-700">{lane.jobs.length} jobs</Badge>
                          </div>
                          <p className="text-[9px] text-slate-500">{lane.desc}</p>
                        </div>
                        {bc.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[8px] text-slate-400">Top Drivers:</span>
                            {bc.slice(0, 3).map(([cat, count]) => (
                              <button
                                key={cat}
                                onClick={() => setBlockerFilter(prev => prev === cat ? null : cat)}
                                className={`text-[8px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${blockerFilter === cat ? "bg-[#8B0000] text-white border-[#8B0000]" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"}`}
                              >
                                {cat.split(" ")[0]} ({count})
                              </button>
                            ))}
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="p-0">
                        {lane.jobs.length > 0 ? (
                          <ReleaseTable jobs={lane.jobs} rankOffset={offset} />
                        ) : (
                          <p className="text-center text-[10px] text-slate-400 py-4">No jobs in this lane</p>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )
          })()}

          {/* 6) INSIGHT PANELS */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="col-span-2 border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Prioritization Matrix</CardTitle>
                <p className="text-[10px] text-slate-500">X = Business Priority, Y = Readiness. Click a point to filter queue.</p>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <ResponsiveContainer width="100%" height={280}>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" dataKey="x" name="Business Priority" domain={[0, 100]} tick={{ fontSize: 10 }} label={{ value: "Business Priority Score", position: "bottom", fontSize: 10, offset: 15 }} />
                      <YAxis type="number" dataKey="y" name="Readiness" domain={[0, 100]} tick={{ fontSize: 10 }} label={{ value: "Readiness Score", angle: -90, position: "insideLeft", fontSize: 10 }} />
                      <ZAxis range={[80, 80]} />
                      <Tooltip
                        content={({ payload }) => {
                          if (!payload?.length) return null
                          const d = payload[0].payload
                          return (
                            <div className="bg-white p-2 border border-slate-200 rounded shadow text-[10px]">
                              <p className="font-bold">{d.id}</p>
                              <p>{d.program}</p>
                              <p>Priority: {d.x} | Readiness: {d.y}</p>
                            </div>
                          )
                        }}
                      />
                      <Scatter data={scatterData} cursor="pointer" onClick={(data: { id: string }) => setScatterSelectedId(prev => prev === data.id ? null : data.id)}>
                        {scatterData.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.status === "Ready" ? "#22c55e" : entry.status === "Watch" ? "#eab308" : "#ef4444"}
                            stroke={scatterSelectedId === entry.id ? "#1e293b" : "transparent"}
                            strokeWidth={scatterSelectedId === entry.id ? 2 : 0}
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                  <div className="absolute top-6 right-8 text-[9px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Release Now</div>
                  <div className="absolute top-6 left-14 text-[9px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Backlog Ready</div>
                  <div className="absolute bottom-12 right-8 text-[9px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Recover Fast</div>
                  <div className="absolute bottom-12 left-14 text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{"Don't Touch"}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Primary Blocker Breakdown</CardTitle>
                <p className="text-[10px] text-slate-500">Click a bar to filter queue</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={blockerBreakdown} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="shortLabel" tick={{ fontSize: 9 }} width={70} />
                    <Tooltip
                      content={({ payload }) => {
                        if (!payload?.length) return null
                        const d = payload[0].payload
                        return (
                          <div className="bg-white p-2 border border-slate-200 rounded shadow text-[10px]">
                            <p className="font-bold">{d.category}</p>
                            <p>{d.count} blocked jobs</p>
                          </div>
                        )
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#8B0000"
                      radius={[0, 4, 4, 0]}
                      cursor="pointer"
                      onClick={(data: { category: string }) => setBlockerFilter(prev => prev === data.category ? null : data.category)}
                    />
                  </BarChart>
                </ResponsiveContainer>
                {blockerFilter && (
                  <div className="mt-2 flex items-center gap-2">
                    <Badge className="text-[9px] bg-slate-100 text-slate-700">Filtered: {blockerFilter}</Badge>
                    <button onClick={() => setBlockerFilter(null)} className="text-[10px] text-blue-600 hover:underline">Clear</button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: QUALITY NC INSIGHTS ==================== */}
      {activeSubTab === "quality-nc" && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900">Quality NC Insights</h3>
            <div className="flex gap-2">
              {selectedDriverCluster && (
                <Button variant="outline" className="h-7 text-[10px] bg-transparent" onClick={() => setSelectedDriverCluster(null)}>
                  <RotateCcw className="w-3 h-3 mr-1" /> Clear Driver Filter
                </Button>
              )}
              <BackButton filter="MRB / Quality Hold" />
            </div>
          </div>

          {/* TOP KPI STRIP */}
          <div className="grid grid-cols-6 gap-2">
            {[
              { label: "Jobs Blocked by Quality", value: ncData.filter(n => n.status === "Open").reduce((s, n) => s + n.jobsBlocked, 0).toString(), color: "text-red-600" },
              { label: "Earliest Due Blocked", value: "Feb 12, 2026", color: "text-red-600" },
              { label: "Max Projected Slip", value: `${Math.max(...driverClusters.map(d => d.maxSlip))}d`, color: "text-amber-600" },
              { label: "MRB $ Tied to Blocked", value: fmtMoney(mrbData.reduce((s, m) => s + m.value, 0)), color: "text-amber-600" },
              { label: "Rework Hrs (30d)", value: `${ncData.reduce((s, n) => s + n.reworkHrs, 0)}h`, color: "text-slate-900", trend: "+12%" },
              { label: "Scrap + Replace (30d)", value: fmtMoney(ncData.reduce((s, n) => s + n.scrapCost + n.replaceCost, 0)), color: "text-red-600", trend: "+8%" },
            ].map((kpi, i) => (
              <Card key={i} className="border-slate-200">
                <CardContent className="p-2.5">
                  <p className="text-[9px] text-slate-500 mb-0.5 leading-tight">{kpi.label}</p>
                  <div className="flex items-baseline gap-1.5">
                    <p className={`text-base font-bold ${kpi.color}`}>{kpi.value}</p>
                    {(kpi as { trend?: string }).trend && (
                      <span className="text-[9px] text-red-500 font-medium">{"↑"} {(kpi as { trend?: string }).trend}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* SECTION A: Top Quality Drivers */}
          <Card className="border-slate-200">
            <CardHeader className="pb-1 pt-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold">A. Top Quality Drivers</CardTitle>
                <p className="text-[9px] text-slate-500">Sorted by At-Risk Value. Click a row to filter all sections below.</p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="border-b border-slate-200">
                      <TableHead className="text-[9px] font-semibold text-slate-600">Driver Cluster</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600">Defect Family</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600">Top Part/Assy</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600">Top WC/Process</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600">Supplier</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600 text-right">Jobs Blocked</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600">Earliest Due</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600 text-right">Slip (Tot/Max)</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600 text-right">At-Risk $</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600 text-right">MRB Qty/$</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600 text-right">Recurrence</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600">Escape Pt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {driverClusters.map((dc) => {
                      const isSelected = selectedDriverCluster === dc.name
                      return (
                        <TableRow
                          key={dc.name}
                          className={`cursor-pointer transition-colors ${isSelected ? "bg-red-50 border-l-2 border-l-[#8B0000]" : "hover:bg-slate-50"}`}
                          onClick={() => setSelectedDriverCluster(isSelected ? null : dc.name)}
                        >
                          <TableCell className="text-[10px] text-[#8B0000] font-bold max-w-[140px]">{dc.name}</TableCell>
                          <TableCell className="text-[10px] text-slate-700">{dc.defectFamily}</TableCell>
                          <TableCell className="text-[10px] text-slate-600">{dc.topPart}</TableCell>
                          <TableCell className="text-[10px] text-slate-600">{dc.topWorkcenter}</TableCell>
                          <TableCell className="text-[10px] text-slate-600">{dc.supplier}</TableCell>
                          <TableCell className="text-[10px] text-right font-bold text-red-600">{dc.jobsBlocked}</TableCell>
                          <TableCell className="text-[10px] text-slate-600">{dc.earliestDueAtRisk.replace("2026-", "").replace("-", "/")}</TableCell>
                          <TableCell className="text-[10px] text-right text-slate-700">{dc.totalSlipDays}d / {dc.maxSlip}d</TableCell>
                          <TableCell className="text-[10px] text-right font-bold text-slate-900">{fmtMoney(dc.atRiskValue)}</TableCell>
                          <TableCell className="text-[10px] text-right text-slate-600">{dc.mrbQty > 0 ? `${dc.mrbQty} / ${fmtMoney(dc.mrbValue)}` : "-"}</TableCell>
                          <TableCell className="text-[10px] text-right">
                            {dc.recurrenceIndex > 0 ? (
                              <span className="text-amber-600 font-medium">{dc.recurrenceIndex}x</span>
                            ) : <span className="text-slate-400">-</span>}
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[8px] ${dc.escapePoint === "Test" ? "bg-amber-100 text-amber-700" : dc.escapePoint === "Final" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                              {dc.escapePoint}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* SECTION B: Blocked Work Queue */}
          <Card className="border-slate-200">
            <CardHeader className="pb-1 pt-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold">
                  B. Blocked Work Queue {selectedDriverCluster && <span className="text-[10px] font-normal text-slate-500 ml-2">Filtered: {selectedDriverCluster}</span>}
                </CardTitle>
                <Button
                  variant="outline"
                  className="h-6 text-[10px] bg-transparent"
                  onClick={() => {
                    setBlockerFilter("MRB / Quality Hold")
                    setActiveSubTab("ready-to-work")
                  }}
                >
                  <ExternalLink className="w-3 h-3 mr-1" /> Open in Ready-to-Work (filtered)
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-b border-slate-200">
                    <TableHead className="text-[9px] font-semibold text-slate-600">Job / Deliverable</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600">Program</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600">WC/Cell</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600">Required Date</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600">Planned Date</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600 text-right">Slip (d)</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600">Blocking NC/MRB</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600 text-right">Qty Req / Hold</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600">Owner</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600">Next Action</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blockedWorkQueue.length === 0 ? (
                    <TableRow><TableCell colSpan={11} className="text-center text-[10px] text-slate-400 py-6">No blocked work for this selection</TableCell></TableRow>
                  ) : blockedWorkQueue.map((j) => (
                    <TableRow key={j.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => { setDrawerJob(j); setDrawerTab("summary") }}>
                      <TableCell className="text-[10px] text-[#8B0000] font-medium">{j.id}</TableCell>
                      <TableCell className="text-[10px] text-slate-700">{j.program}</TableCell>
                      <TableCell className="text-[10px] text-slate-600">{j.workcenter}</TableCell>
                      <TableCell className="text-[10px] text-slate-600">{j.requiredDate.replace("2026-", "")}</TableCell>
                      <TableCell className="text-[10px] text-slate-600">{j.plannedFinish.replace("2026-", "")}</TableCell>
                      <TableCell className="text-[10px] text-right font-bold text-red-600">{j.projectedSlip}d</TableCell>
                      <TableCell className="text-[10px] text-slate-600 max-w-[100px] truncate">{j.blockingNcIds.length > 0 ? j.blockingNcIds.join(", ") : j.mrbHolds.map(m => m.id).join(", ") || "-"}</TableCell>
                      <TableCell className="text-[10px] text-right text-slate-600">{j.qtyRequired} / {j.qtyOnHold}</TableCell>
                      <TableCell className="text-[10px] text-slate-600">{j.owner}</TableCell>
                      <TableCell className="text-[10px] text-slate-500">{j.nextActionDate}</TableCell>
                      <TableCell>
                        <Badge className={`text-[8px] ${j.ncStatus.includes("MRB") ? "bg-purple-100 text-purple-700" : "bg-amber-100 text-amber-700"}`}>
                          {j.ncStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* SECTION C: Where It Happens - side by side */}
          <div className="grid grid-cols-2 gap-3">
            {/* Left: Top Workcenters by Impact */}
            <Card className="border-slate-200">
              <CardHeader className="pb-1 pt-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold">C. Top Workcenters by Impact</CardTitle>
                  <div className="flex gap-0.5">
                    {([["jobsBlocked", "Jobs"], ["atRiskValue", "$"], ["reworkHrs", "Rework"], ["scrapCost", "Scrap"]] as const).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setWcMetricToggle(key)}
                        className={`px-2 py-0.5 text-[9px] rounded ${wcMetricToggle === key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    layout="vertical"
                    data={(() => {
                      const openNcs = selectedDriverCluster
                        ? ncData.filter(n => n.status === "Open" && `${n.defect} / ${n.part}` === selectedDriverCluster)
                        : ncData.filter(n => n.status === "Open")
                      const grouped: Record<string, { wc: string; jobsBlocked: number; atRiskValue: number; reworkHrs: number; scrapCost: number }> = {}
                      openNcs.forEach(n => {
                        if (!grouped[n.workcenter]) grouped[n.workcenter] = { wc: n.workcenter, jobsBlocked: 0, atRiskValue: 0, reworkHrs: 0, scrapCost: 0 }
                        grouped[n.workcenter].jobsBlocked += n.jobsBlocked
                        grouped[n.workcenter].atRiskValue += n.reworkHrs * 50 + n.scrapCost + n.replaceCost + n.jobsBlocked * 25000
                        grouped[n.workcenter].reworkHrs += n.reworkHrs
                        grouped[n.workcenter].scrapCost += n.scrapCost + n.replaceCost
                      })
                      return Object.values(grouped).sort((a, b) => b[wcMetricToggle] - a[wcMetricToggle])
                    })()}
                    margin={{ top: 5, right: 20, bottom: 5, left: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 9 }} />
                    <YAxis dataKey="wc" type="category" tick={{ fontSize: 8 }} width={100} />
                    <Tooltip contentStyle={{ fontSize: 10 }} formatter={(v: number) => wcMetricToggle === "atRiskValue" || wcMetricToggle === "scrapCost" ? fmtMoney(v) : v} />
                    <Bar dataKey={wcMetricToggle} fill="#8B0000" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Right: Defect Concentration Heatmap */}
            <Card className="border-slate-200">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-bold">Defect Concentration Heatmap</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const openNcs = selectedDriverCluster
                    ? ncData.filter(n => n.status === "Open" && `${n.defect} / ${n.part}` === selectedDriverCluster)
                    : ncData.filter(n => n.status === "Open")
                  const workcenters = [...new Set(openNcs.map(n => n.workcenter))]
                  const defects = [...new Set(openNcs.map(n => n.defect))]
                  const matrix: Record<string, Record<string, { count: number; rework: number; scrap: number; jobs: number }>> = {}
                  workcenters.forEach(wc => {
                    matrix[wc] = {}
                    defects.forEach(d => { matrix[wc][d] = { count: 0, rework: 0, scrap: 0, jobs: 0 } })
                  })
                  openNcs.forEach(n => {
                    if (matrix[n.workcenter]?.[n.defect]) {
                      matrix[n.workcenter][n.defect].count++
                      matrix[n.workcenter][n.defect].rework += n.reworkHrs
                      matrix[n.workcenter][n.defect].scrap += n.scrapCost + n.replaceCost
                      matrix[n.workcenter][n.defect].jobs += n.jobsBlocked
                    }
                  })
                  const maxImpact = Math.max(1, ...openNcs.map(n => n.reworkHrs * 50 + n.scrapCost + n.replaceCost + n.jobsBlocked * 10000))
                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-[9px]">
                        <thead>
                          <tr className="border-b">
                            <th className="p-1.5 text-left text-slate-600 font-semibold">WC \ Defect</th>
                            {defects.map(d => <th key={d} className="p-1.5 text-center text-slate-600 font-semibold max-w-[80px] truncate">{d}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {workcenters.map(wc => (
                            <tr key={wc} className="border-b">
                              <td className="p-1.5 text-slate-700 font-medium whitespace-nowrap">{wc}</td>
                              {defects.map(d => {
                                const cell = matrix[wc][d]
                                const impact = cell.rework * 50 + cell.scrap + cell.jobs * 10000
                                const intensity = impact / maxImpact
                                const bg = cell.count === 0 ? "bg-slate-50" : intensity > 0.6 ? "bg-red-300" : intensity > 0.3 ? "bg-red-200" : intensity > 0.1 ? "bg-amber-100" : "bg-yellow-50"
                                return (
                                  <td key={d} className={`p-1.5 text-center font-medium ${bg} relative group cursor-default`}>
                                    {cell.count > 0 ? cell.count : "-"}
                                    {cell.count > 0 && (
                                      <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-1 w-[130px] p-2 bg-slate-900 text-white rounded text-[9px] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                                        <p>Count: {cell.count}</p>
                                        <p>Rework: {cell.rework}h</p>
                                        <p>Scrap $: {fmtMoney(cell.scrap)}</p>
                                        <p>Jobs Blocked: {cell.jobs}</p>
                                      </div>
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          </div>

          {/* SECTION D: Supplier vs Internal Attribution */}
          <Card className="border-slate-200">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-bold">
                D. Supplier vs Internal Attribution {selectedDriverCluster && <span className="text-[10px] font-normal text-slate-500 ml-2">Filtered: {selectedDriverCluster}</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {/* Donut chart */}
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={attributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        dataKey="count"
                        nameKey="name"
                        paddingAngle={2}
                      >
                        {attributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 10 }} formatter={(v: number, name: string) => [`${v} NCs`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Attribution breakdown */}
                <div className="space-y-2">
                  {attributionData.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 p-1.5 border border-slate-100 rounded">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: a.fill }}></div>
                      <div className="flex-1">
                        <p className="text-[10px] font-medium text-slate-700">{a.name}</p>
                        <p className="text-[9px] text-slate-500">{a.count} NCs, {a.jobsBlocked} jobs blocked</p>
                      </div>
                      <p className="text-[10px] font-bold text-slate-900">{fmtMoney(a.value)}</p>
                    </div>
                  ))}
                </div>

                {/* Top Suppliers by Impact */}
                <div>
                  <p className="text-[10px] font-semibold text-slate-600 mb-2">Top Suppliers by Impact</p>
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-[9px] font-semibold text-slate-600">Supplier</TableHead>
                        <TableHead className="text-[9px] font-semibold text-slate-600 text-right">Jobs</TableHead>
                        <TableHead className="text-[9px] font-semibold text-slate-600 text-right">At-Risk $</TableHead>
                        <TableHead className="text-[9px] font-semibold text-slate-600">Top Defect</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { supplier: "Amphenol", jobs: 1, value: 26800, defect: "Connector Damage" },
                        { supplier: "In-house (SMT)", jobs: 3, value: 52200, defect: "Cold Solder Joint" },
                        { supplier: "In-house (Test)", jobs: 1, value: 16000, defect: "RF Cal OOS" },
                      ].map((s, i) => (
                        <TableRow key={i} className="hover:bg-slate-50">
                          <TableCell className="text-[10px] text-slate-700">{s.supplier}</TableCell>
                          <TableCell className="text-[10px] text-right text-red-600 font-medium">{s.jobs}</TableCell>
                          <TableCell className="text-[10px] text-right font-medium">{fmtMoney(s.value)}</TableCell>
                          <TableCell className="text-[10px] text-slate-500">{s.defect}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION E: Trend & Recurrence */}
          <Card className="border-slate-200">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-bold">E. Trend & Recurrence (12 Weeks)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="week" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip contentStyle={{ fontSize: 10 }} />
                      <Legend wrapperStyle={{ fontSize: 9 }} />
                      {driverClusters.slice(0, 5).map((dc, i) => {
                        const colors = ["#8B0000", "#d97706", "#2563eb", "#059669", "#7c3aed"]
                        return <Line key={dc.defectFamily} type="monotone" dataKey={dc.defectFamily} stroke={colors[i]} strokeWidth={1.5} dot={false} />
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-slate-600">Recurrence Index (Top 5 Drivers)</p>
                  {driverClusters.slice(0, 5).map((dc, i) => {
                    const colors = ["bg-[#8B0000]", "bg-amber-600", "bg-blue-600", "bg-emerald-600", "bg-violet-600"]
                    return (
                      <div key={dc.name} className="flex items-center gap-2 p-1.5 border border-slate-100 rounded">
                        <div className={`w-2.5 h-2.5 rounded-sm ${colors[i]}`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-slate-700 truncate">{dc.defectFamily}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-900">{dc.recurrenceIndex > 0 ? `${dc.recurrenceIndex}x` : "New"}</p>
                          <p className="text-[9px] text-slate-500">{dc.ncIds.length > 1 ? "Repeat" : "New"}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION F: Action Queue */}
          <Card className="border-slate-200">
            <CardHeader className="pb-1 pt-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold">F. Action Queue (Prioritized)</CardTitle>
                <Badge className="bg-slate-100 text-slate-600 text-[9px]">Read-only</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-b border-slate-200">
                    <TableHead className="text-[9px] font-semibold text-slate-600">Action</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600">Driver Cluster</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600">Expected Benefit</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600">Owner</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600">Target Date</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { action: "Replace reflow profile WC-001", driver: "Cold Solder Joint / MSA-001 Receiver", benefit: "Unblock 3 jobs, recover 8 slip days, ~$52K", owner: "J. Martinez", target: "Feb 10", status: "In Progress" },
                    { action: "Expedite MRB disposition for IC-DSP-09112", driver: "Cold Solder Joint / MSA-002 Transmitter", benefit: "Unblock 1 job, $32K at-risk value", owner: "S. Chen", target: "Feb 11", status: "Pending Review" },
                    { action: "Source replacement connectors from alt supplier", driver: "Connector Damage / Display Module", benefit: "Unblock 1 job, recover 3 slip days", owner: "R. Gomez", target: "Feb 12", status: "Investigating" },
                    { action: "Recalibrate RF test station #4", driver: "RF Cal Out of Spec / MSA-005 Antenna Array", benefit: "Unblock 1 job, prevent future escapes", owner: "K. Patel", target: "Feb 13", status: "Scheduled" },
                    { action: "Retrain SMT operators on polarity checks", driver: "Component Polarity / MSA-003 Power Supply", benefit: "Reduce recurrence, save ~$6.7K/month", owner: "L. Nguyen", target: "Feb 14", status: "Planned" },
                  ].filter(a => !selectedDriverCluster || a.driver === selectedDriverCluster || !selectedDriverCluster).map((a, i) => (
                    <TableRow key={i} className="hover:bg-slate-50">
                      <TableCell className="text-[10px] text-slate-700 font-medium max-w-[180px]">{a.action}</TableCell>
                      <TableCell className="text-[10px] text-[#8B0000] max-w-[160px] truncate">{a.driver}</TableCell>
                      <TableCell className="text-[10px] text-slate-600 max-w-[180px]">{a.benefit}</TableCell>
                      <TableCell className="text-[10px] text-slate-600">{a.owner}</TableCell>
                      <TableCell className="text-[10px] text-slate-600">{a.target}</TableCell>
                      <TableCell>
                        <Badge className={`text-[8px] ${a.status === "In Progress" ? "bg-green-100 text-green-700" : a.status === "Pending Review" ? "bg-amber-100 text-amber-700" : a.status === "Scheduled" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}`}>
                          {a.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================== TAB 3: SITE SUPPLY/DEMAND ==================== */}
      {activeSubTab === "supply-demand" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900">Site Supply / Demand (Line of Balance)</h3>
            <BackButton />
          </div>
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Supply/Demand Summary</CardTitle>
              <p className="text-[10px] text-slate-500">Time-phased view with gap highlighting</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={[
                  { week: "W6", contract: 28, plan: 30, inventory: 18, wip: 8, pos: 6, planned: 4 },
                  { week: "W7", contract: 32, plan: 34, inventory: 16, wip: 10, pos: 8, planned: 6 },
                  { week: "W8", contract: 38, plan: 40, inventory: 14, wip: 12, pos: 8, planned: 8 },
                  { week: "W9", contract: 42, plan: 44, inventory: 12, wip: 14, pos: 10, planned: 10 },
                  { week: "W10", contract: 35, plan: 38, inventory: 10, wip: 12, pos: 12, planned: 8 },
                  { week: "W11", contract: 30, plan: 32, inventory: 14, wip: 10, pos: 10, planned: 6 },
                  { week: "W12", contract: 25, plan: 28, inventory: 16, wip: 8, pos: 8, planned: 4 },
                ]} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 10 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Area type="monotone" dataKey="inventory" stackId="supply" fill="#93c5fd" stroke="#3b82f6" name="Inventory" />
                  <Area type="monotone" dataKey="wip" stackId="supply" fill="#86efac" stroke="#22c55e" name="WIP" />
                  <Area type="monotone" dataKey="pos" stackId="supply" fill="#fde68a" stroke="#eab308" name="POs/In-transit" />
                  <Area type="monotone" dataKey="planned" stackId="supply" fill="#d4d4d8" stroke="#a1a1aa" name="Planned Orders" />
                  <Line type="monotone" dataKey="contract" stroke="#8B0000" strokeWidth={2} dot={false} name="Contract Demand" />
                  <Line type="monotone" dataKey="plan" stroke="#1e293b" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="IOP Plan" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gap Attribution */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-slate-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Gap by Program</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[
                    { program: "Manpack Radio", gap: 12 },
                    { program: "Vehicle Mount", gap: 8 },
                    { program: "Tactical HF", gap: 5 },
                    { program: "Base Station", gap: 3 },
                  ]} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="program" tick={{ fontSize: 9 }} width={90} />
                    <Tooltip contentStyle={{ fontSize: 10 }} />
                    <Bar dataKey="gap" fill="#8B0000" radius={[0, 4, 4, 0]} name="Gap Units" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Constraint Drivers</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[
                    { driver: "IC Components", count: 6 },
                    { driver: "RF Parts", count: 4 },
                    { driver: "WC-001 Capacity", count: 3 },
                    { driver: "Connectors", count: 2 },
                  ]} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="driver" tick={{ fontSize: 9 }} width={90} />
                    <Tooltip contentStyle={{ fontSize: 10 }} />
                    <Bar dataKey="count" fill="#1e293b" radius={[0, 4, 4, 0]} name="Constraints" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ==================== TAB 4: LATE JOB ALERTS ==================== */}
      {activeSubTab === "late-jobs" && (() => {
        const lateJobs = allJobs.filter(j => j.slipDays > 0 && j.readinessStatus === "Blocked")
        const forecastLateJobs = allJobs.filter(j => j.slipDays > 0 && j.readinessStatus === "Watch")
        const allAlertJobs = allJobs.filter(j => j.slipDays > 0)
        const alertsWithConstraint = allAlertJobs.filter(j => j.primaryBlocker !== "None" && j.primaryBlocker !== "Other / Unknown")
        const constraintPct = allAlertJobs.length > 0 ? Math.round((alertsWithConstraint.length / allAlertJobs.length) * 100) : 0

        // Priority scoring for ranked queue
        const rankedAlerts = allAlertJobs.map(j => {
          const dpasScore = j.program === "Manpack Radio" ? 20 : j.program === "Tactical HF Radio" ? 15 : 10
          const aopScore = j.requiredDate <= "2026-02-28" ? 20 : j.requiredDate <= "2026-03-15" ? 15 : 10
          const critPathScore = j.readinessStatus === "Blocked" ? 20 : 10
          const revenueScore = j.value >= 250000 ? 20 : j.value >= 150000 ? 15 : j.value >= 100000 ? 10 : 5
          const priorityScore = dpasScore + aopScore + critPathScore + revenueScore
          const projectedDate = new Date(j.requiredDate)
          projectedDate.setDate(projectedDate.getDate() + j.slipDays)
          const projectedDateStr = projectedDate.toISOString().split("T")[0]

          // Evidence string based on dominant constraint
          let evidence = ""
          if (j.primaryBlocker.includes("Material")) {
            const shortPart = j.gatingParts.find(p => p.shortageDate !== "None")
            evidence = shortPart ? `${shortPart.part} shortage ${shortPart.needQty - shortPart.netAvail}` : "Material gap"
          } else if (j.primaryBlocker.includes("MRB") || j.primaryBlocker.includes("Quality")) {
            const mrb = j.mrbHolds[0]
            evidence = mrb ? `${mrb.id} aging ${mrb.age}d` : "Quality hold"
          } else if (j.primaryBlocker.includes("Capacity")) {
            evidence = `${j.capacityDetail.workcenter} overloaded ${Math.round((j.capacityDetail.reqHrs / j.capacityDetail.availHrs) * 100)}%`
          } else if (j.primaryBlocker.includes("Shelf")) {
            const lot = j.shelfLifeLots.find(l => l.flagged)
            evidence = lot ? `${lot.lot} expired/expiring` : "Shelf-life constraint"
          } else if (j.primaryBlocker.includes("Supplier")) {
            evidence = `PO promise slip ${j.slipDays}d`
          }

          return {
            ...j,
            priorityScore,
            dpasScore,
            aopScore,
            critPathScore,
            revenueScore,
            projectedDateStr,
            evidence,
            dominantConstraint: j.primaryBlocker === "None" ? "Routing Readiness" : j.primaryBlocker,
          }
        })
        .filter(j => !constraintFilter || j.dominantConstraint === constraintFilter)
        .sort((a, b) => b.priorityScore - a.priorityScore || a.requiredDate.localeCompare(b.requiredDate) || b.slipDays - a.slipDays)

        // Root cause breakdown with multiple metrics
        const rootCauseData = (() => {
          const cats: BlockerCategory[] = ["Materials Shortage", "MRB / Quality Hold", "Shelf-Life Constraint", "Capacity Constraint", "Supplier Promise Slip"]
          return cats.map(cat => {
            const jobs = allAlertJobs.filter(j => j.primaryBlocker === cat)
            return {
              category: cat,
              shortLabel: cat.split(" ")[0] === "MRB" ? "MRB/Quality" : cat.split(" ")[0] === "Shelf-Life" ? "Shelf-Life" : cat.split(" ")[0] === "Supplier" ? "Supplier" : cat.split("/")[0].trim(),
              count: jobs.length,
              slipDays: jobs.reduce((s, j) => s + j.slipDays, 0),
              atRiskValue: jobs.reduce((s, j) => s + j.value, 0),
              blockedToShip: jobs.filter(j => j.readinessStatus === "Blocked").length,
              topDrivers: (() => {
                if (cat.includes("Material")) return jobs.flatMap(j => j.gatingParts.filter(p => p.shortageDate !== "None").map(p => p.part)).slice(0, 5)
                if (cat.includes("MRB")) return jobs.flatMap(j => j.mrbHolds.map(m => m.id)).slice(0, 5)
                if (cat.includes("Capacity")) return [...new Set(jobs.map(j => j.capacityDetail.workcenter))].slice(0, 5)
                if (cat.includes("Shelf")) return jobs.flatMap(j => j.shelfLifeLots.filter(l => l.flagged).map(l => l.lot)).slice(0, 5)
                if (cat.includes("Supplier")) return jobs.map(j => j.id).slice(0, 5)
                return []
              })(),
            }
          }).filter(x => x.count > 0)
        })()

        // Trend data (12 weeks)
        const weeklyTrend = Array.from({ length: 12 }, (_, wi) => {
          const base = allAlertJobs.length
          const late = Math.max(1, Math.round(base * 0.4 + Math.sin(wi * 0.6) * 1.5))
          const forecastLate = Math.max(1, Math.round(base * 0.5 + Math.cos(wi * 0.5) * 1.2))
          return {
            week: `W-${12 - wi}`,
            late: wi < 11 ? late : lateJobs.length,
            forecastLate: wi < 11 ? forecastLate : forecastLateJobs.length,
            materials: Math.round(late * 0.35),
            mrbQuality: Math.round(late * 0.2),
            capacity: Math.round(late * 0.2),
            supplier: Math.round(late * 0.15),
            shelfLife: Math.round(late * 0.1),
          }
        })

        // Supply recovery sources for selected job
        const getSupplySources = (j: Job) => {
          const shortPart = j.gatingParts.find(p => p.shortageDate !== "None") || j.gatingParts[0]
          if (!shortPart) return []
          const gap = Math.max(0, shortPart.needQty - shortPart.netAvail)
          return [
            { source: "On-Hand", location: "Main Store", qty: shortPart.netAvail, earliest: "Immediate", feasibility: shortPart.netAvail > 0 ? "Available" as const : "Depleted" as const, action: shortPart.netAvail > 0 ? "Issue from stock" : "None available" },
            { source: "WIP / Bench Stock", location: "Floor", qty: Math.round(gap * 0.15), earliest: "1-2 days", feasibility: "Requires Approval" as const, action: "Reallocate from lower-priority job" },
            { source: "3PL Warehouse", location: "3PL-East", qty: Math.round(gap * 0.4), earliest: "3-4 days", feasibility: "Expedite Possible" as const, action: "Emergency pull + overnight ship" },
            { source: "In-Transit PO", location: `PO-2026-${Math.round(Math.random() * 200 + 100)}`, qty: Math.round(gap * 0.6), earliest: `${Math.round(j.slipDays * 0.6 + 2)} days`, feasibility: "Expedite Possible" as const, action: "Request expedite from supplier" },
            { source: "Open PO (Future)", location: `PO-2026-${Math.round(Math.random() * 200 + 300)}`, qty: gap, earliest: `${j.slipDays + 5} days`, feasibility: "Blocked" as const, action: "Nominal schedule - no acceleration" },
            { source: "Alternate Part", location: "Approved alt list", qty: Math.round(gap * 0.8), earliest: "5-7 days", feasibility: "Requires Approval" as const, action: "Qualify alt + expedite" },
          ]
        }

        // Demand trade candidates
        const getDemandTrades = (j: Job) => {
          const shortPart = j.gatingParts.find(p => p.shortageDate !== "None") || j.gatingParts[0]
          if (!shortPart) return []
          // Find other jobs using similar parts that are lower priority
          return allJobs
            .filter(other => other.id !== j.id && other.businessPriority < j.businessPriority)
            .map(other => ({
              donorJob: other.id,
              program: other.program,
              requiredDate: other.requiredDate,
              priority: other.businessPriority,
              dpas: other.program === "Manpack Radio" ? "DO-A2" : "None",
              criticalPath: other.readinessStatus === "Blocked" ? "Yes" : "No",
              qtyAvailToSwap: Math.round(Math.random() * 15 + 5),
              tradeAction: other.slipDays === 0 ? "Swap build order" : "Borrow inventory",
              impactOnDonor: other.slipDays === 0 ? `+${Math.round(j.slipDays * 0.5 + 2)}d slip` : `+${Math.round(j.slipDays * 0.3)}d additional slip`,
            }))
            .slice(0, 4)
        }

        return (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900">Late Job Alerts - Execution Triage Cockpit</h3>
            <div className="flex gap-2">
              {constraintFilter && (
                <Button variant="outline" className="h-7 text-[10px] bg-transparent" onClick={() => setConstraintFilter(null)}>
                  <RotateCcw className="w-3 h-3 mr-1" /> Clear Constraint Filter
                </Button>
              )}
              <BackButton />
            </div>
          </div>

          {/* TOP KPI STRIP */}
          <div className="grid grid-cols-6 gap-2">
            {[
              { label: "Late Jobs", value: lateJobs.length.toString(), color: "text-red-600" },
              { label: "Forecast-Late Jobs", value: forecastLateJobs.length.toString(), color: "text-amber-600" },
              { label: "Earliest Required at Risk", value: allAlertJobs.sort((a, b) => a.requiredDate.localeCompare(b.requiredDate))[0]?.requiredDate.replace("2026-0", "").replace("-", "/") || "N/A", color: "text-red-600" },
              { label: "Max Projected Slip", value: `${maxSlip}d`, color: "text-red-600" },
              { label: "Total At-Risk Value", value: fmtMoney(atRiskValue), color: "text-red-600" },
              { label: "% Alerts w/ Constraint ID", value: `${constraintPct}%`, color: constraintPct >= 80 ? "text-green-600" : constraintPct >= 60 ? "text-amber-600" : "text-red-600" },
            ].map((kpi, i) => (
              <Card key={i} className="border-slate-200">
                <CardContent className="p-2.5">
                  <p className="text-[9px] text-slate-500 mb-0.5 leading-tight">{kpi.label}</p>
                  <p className={`text-base font-bold ${kpi.color}`}>{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* SECTION 1: RANKED ALERT QUEUE */}
          <Card className="border-slate-200">
            <CardHeader className="pb-1 pt-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold">1. Ranked Alert Queue</CardTitle>
                <p className="text-[9px] text-slate-500">Sorted: Priority Score, then earliest required, then slip. Click a row to open evidence workspace below.</p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="border-b border-slate-200">
                      <TableHead className="text-[9px] font-semibold text-slate-600 w-[30px]">Rank</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600">Job / Deliverable</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600">Program</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600">Required Date</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600">Projected Date</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600 text-right">Slip</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600 text-right">Priority</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600">Priority Breakdown</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600">Dominant Constraint</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600">Evidence</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600">Next Best Action</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600">Owner</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rankedAlerts.map((j, rank) => {
                      const isSelected = selectedAlertJob?.id === j.id
                      return (
                        <TableRow
                          key={j.id}
                          className={`cursor-pointer transition-colors ${isSelected ? "bg-red-50 border-l-2 border-l-[#8B0000]" : "hover:bg-slate-50"}`}
                          onClick={() => {
                            setSelectedAlertJob(isSelected ? null : j)
                            setAlertWorkspaceTab("supply")
                          }}
                        >
                          <TableCell className="text-[10px] font-bold text-slate-400 text-center">{rank + 1}</TableCell>
                          <TableCell className="text-[11px] text-[#8B0000] font-bold">{j.id}</TableCell>
                          <TableCell className="text-[10px] text-slate-700">{j.program}</TableCell>
                          <TableCell className="text-[10px] text-slate-600">{j.requiredDate.replace("2026-", "")}</TableCell>
                          <TableCell className="text-[10px] text-red-600 font-medium">{j.projectedDateStr.replace("2026-", "")}</TableCell>
                          <TableCell className="text-[10px] text-right font-bold text-red-600">+{j.slipDays}d</TableCell>
                          <TableCell className="text-[10px] text-right font-bold text-slate-900">{j.priorityScore}</TableCell>
                          <TableCell>
                            <div className="flex gap-0.5 flex-wrap">
                              <span className="inline-block px-1 py-0.5 text-[8px] rounded bg-red-100 text-red-700">DPAS:{j.dpasScore}</span>
                              <span className="inline-block px-1 py-0.5 text-[8px] rounded bg-amber-100 text-amber-700">AOP:{j.aopScore}</span>
                              <span className="inline-block px-1 py-0.5 text-[8px] rounded bg-blue-100 text-blue-700">CritPath:{j.critPathScore}</span>
                              <span className="inline-block px-1 py-0.5 text-[8px] rounded bg-green-100 text-green-700">Rev:{j.revenueScore}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[8px] cursor-pointer ${blockerColor(j.dominantConstraint)}`} onClick={(e) => { e.stopPropagation(); setConstraintFilter(j.dominantConstraint === constraintFilter ? null : j.dominantConstraint) }}>
                              {j.dominantConstraint.replace(" Shortage", "").replace(" Constraint", "").replace(" Promise Slip", "")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[9px] text-slate-600 max-w-[140px]">
                            <span className="text-blue-700 underline decoration-dotted cursor-pointer" onClick={(e) => { e.stopPropagation(); setDrawerJob(j); setDrawerTab("materials") }}>
                              {j.evidence}
                            </span>
                          </TableCell>
                          <TableCell className="text-[10px] text-slate-600 max-w-[140px] truncate">{j.nextAction}</TableCell>
                          <TableCell className="text-[10px] text-slate-600">{j.owner}</TableCell>
                          <TableCell>
                            <Badge className={`text-[8px] ${j.readinessStatus === "Blocked" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                              {j.readinessStatus}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 2: SELECTED ALERT WORKSPACE */}
          {selectedAlertJob && (() => {
            const sj = selectedAlertJob
            const supplySources = getSupplySources(sj)
            const demandTrades = getDemandTrades(sj)
            const shortPart = sj.gatingParts.find(p => p.shortageDate !== "None") || sj.gatingParts[0]

            return (
            <Card className="border-[#8B0000]/30 border-2">
              <CardHeader className="pb-2 pt-3 px-4 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-xs font-bold">2. Alert Workspace: {sj.id}</CardTitle>
                    <Badge className="text-[9px] bg-red-100 text-red-700">{sj.program}</Badge>
                    <Badge className="text-[9px] bg-slate-100 text-slate-700">Slip: +{sj.slipDays}d</Badge>
                    <Badge className="text-[9px] bg-slate-100 text-slate-700">Value: {fmtMoney(sj.value)}</Badge>
                  </div>
                  <Button variant="outline" className="h-6 text-[10px] bg-transparent" onClick={() => setSelectedAlertJob(null)}>
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* LEFT: Why This Is Late (Evidence Chain) */}
                  <div className="space-y-3">
                    <p className="text-[11px] font-bold text-slate-800">Why This Is Late (Evidence Chain)</p>
                    <div className="space-y-1">
                      {/* Chain nodes */}
                      {[
                        { node: "Job", detail: sj.id, sub: `Required: ${sj.requiredDate.replace("2026-", "")} | Priority: ${sj.businessPriority}`, color: "bg-slate-700", clickable: false },
                        { node: "Operation / WC", detail: sj.workcenter, sub: `Avail: ${sj.capacityDetail.availHrs}h | Req: ${sj.capacityDetail.reqHrs}h | Next slot: ${sj.capacityDetail.nextSlot}`, color: sj.capacityDetail.reqHrs > sj.capacityDetail.availHrs ? "bg-red-600" : "bg-green-600", clickable: true },
                        ...(shortPart ? [{ node: "Gating Material", detail: shortPart.part, sub: `Need: ${shortPart.needQty} by ${shortPart.needDate} | Avail: ${shortPart.netAvail} | Shortage: ${shortPart.shortageDate}`, color: shortPart.shortageDate !== "None" ? "bg-red-600" : "bg-green-600", clickable: true }] : []),
                        ...(sj.mrbHolds.length > 0 ? [{ node: "MRB Hold", detail: sj.mrbHolds[0].id, sub: `Age: ${sj.mrbHolds[0].age}d | Disposition: ${sj.mrbHolds[0].disposition} | ${sj.mrbHolds[0].blocks}`, color: "bg-purple-600", clickable: true }] : []),
                        ...(sj.shelfLifeLots.filter(l => l.flagged).length > 0 ? [{ node: "Shelf-Life", detail: sj.shelfLifeLots[0].lot, sub: `Part: ${sj.shelfLifeLots[0].part} | Expiry: ${sj.shelfLifeLots[0].expiry.replace("2026-", "")} | Use: ${sj.shelfLifeLots[0].plannedUse.replace("2026-", "")}`, color: "bg-orange-600", clickable: true }] : []),
                        { node: "Dominant Constraint", detail: sj.primaryBlocker, sub: `Driving element: ${rankedAlerts.find(a => a.id === sj.id)?.evidence || "See evidence"}`, color: "bg-[#8B0000]", clickable: false },
                      ].map((chain, ci) => (
                        <div key={ci}>
                          <div
                            className={`flex items-start gap-3 p-2.5 border border-slate-200 rounded ${chain.clickable ? "cursor-pointer hover:bg-slate-50" : ""}`}
                            onClick={() => { if (chain.clickable) { setDrawerJob(sj); setDrawerTab(chain.node.includes("Material") || chain.node.includes("Gating") ? "materials" : chain.node.includes("MRB") ? "quality" : chain.node.includes("Shelf") ? "shelf-life" : chain.node.includes("Capacity") || chain.node.includes("Operation") ? "capacity" : "summary") } }}
                          >
                            <div className={`w-2 h-2 rounded-full ${chain.color} mt-1 shrink-0`}></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] text-slate-400 font-medium uppercase">{chain.node}</span>
                                {chain.clickable && <ExternalLink className="w-2.5 h-2.5 text-blue-500" />}
                              </div>
                              <p className="text-[11px] font-bold text-slate-800">{chain.detail}</p>
                              <p className="text-[9px] text-slate-500 leading-tight">{chain.sub}</p>
                            </div>
                          </div>
                          {ci < 4 && <div className="flex justify-start ml-3"><div className="w-px h-2 bg-slate-300"></div></div>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* RIGHT: Recovery Plan */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold text-slate-800">Recovery Plan</p>
                      <div className="flex gap-0.5 bg-slate-100 rounded p-0.5">
                        <button onClick={() => setAlertWorkspaceTab("supply")} className={`px-2.5 py-1 text-[10px] rounded font-medium ${alertWorkspaceTab === "supply" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}>Supply Recovery</button>
                        <button onClick={() => setAlertWorkspaceTab("demand")} className={`px-2.5 py-1 text-[10px] rounded font-medium ${alertWorkspaceTab === "demand" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}>Demand Trades</button>
                      </div>
                    </div>

                    {alertWorkspaceTab === "supply" && (
                      <div className="space-y-2">
                        <p className="text-[10px] text-slate-600 font-medium">Where is the part? {shortPart ? <span className="text-[#8B0000]">{shortPart.part}</span> : ""}</p>
                        <Table>
                          <TableHeader className="bg-slate-50">
                            <TableRow>
                              <TableHead className="text-[9px] font-semibold text-slate-600">Source</TableHead>
                              <TableHead className="text-[9px] font-semibold text-slate-600">Location</TableHead>
                              <TableHead className="text-[9px] font-semibold text-slate-600 text-right">Qty</TableHead>
                              <TableHead className="text-[9px] font-semibold text-slate-600">Earliest</TableHead>
                              <TableHead className="text-[9px] font-semibold text-slate-600">Feasibility</TableHead>
                              <TableHead className="text-[9px] font-semibold text-slate-600">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {supplySources.map((src, si) => (
                              <TableRow key={si} className="hover:bg-slate-50">
                                <TableCell className="text-[10px] text-slate-700 font-medium">{src.source}</TableCell>
                                <TableCell className="text-[10px] text-slate-600">{src.location}</TableCell>
                                <TableCell className="text-[10px] text-right font-medium text-slate-900">{src.qty}</TableCell>
                                <TableCell className="text-[10px] text-slate-600">{src.earliest}</TableCell>
                                <TableCell>
                                  <Badge className={`text-[8px] ${src.feasibility === "Available" ? "bg-green-100 text-green-700" : src.feasibility === "Expedite Possible" ? "bg-amber-100 text-amber-700" : src.feasibility === "Requires Approval" ? "bg-blue-100 text-blue-700" : src.feasibility === "Depleted" ? "bg-slate-100 text-slate-500" : "bg-red-100 text-red-700"}`}>
                                    {src.feasibility}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-[9px] text-slate-600 max-w-[120px]">{src.action}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {/* Impact simulator */}
                        <div className="p-2.5 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-[10px] font-semibold text-blue-800">Impact Simulator</p>
                          <p className="text-[9px] text-blue-700 mt-0.5">
                            If execute <span className="font-bold">3PL emergency pull</span> by <span className="font-bold">Feb 11</span> → projected slip becomes <span className="font-bold text-green-700">+{Math.max(0, sj.slipDays - 4)}d</span> (from +{sj.slipDays}d)
                          </p>
                          <p className="text-[9px] text-blue-700 mt-0.5">
                            If execute <span className="font-bold">expedite in-transit PO</span> by <span className="font-bold">Feb 12</span> → projected slip becomes <span className="font-bold text-green-700">+{Math.max(0, sj.slipDays - 2)}d</span>
                          </p>
                        </div>
                      </div>
                    )}

                    {alertWorkspaceTab === "demand" && (
                      <div className="space-y-2">
                        <p className="text-[10px] text-slate-600">Candidate donors ranked by lower criticality (non-DPAS, later required date, not on critical path)</p>
                        <Table>
                          <TableHeader className="bg-slate-50">
                            <TableRow>
                              <TableHead className="text-[9px] font-semibold text-slate-600">Donor Job</TableHead>
                              <TableHead className="text-[9px] font-semibold text-slate-600">Program</TableHead>
                              <TableHead className="text-[9px] font-semibold text-slate-600">Required</TableHead>
                              <TableHead className="text-[9px] font-semibold text-slate-600 text-right">Priority</TableHead>
                              <TableHead className="text-[9px] font-semibold text-slate-600">DPAS</TableHead>
                              <TableHead className="text-[9px] font-semibold text-slate-600">Crit Path</TableHead>
                              <TableHead className="text-[9px] font-semibold text-slate-600 text-right">Swap Qty</TableHead>
                              <TableHead className="text-[9px] font-semibold text-slate-600">Trade Action</TableHead>
                              <TableHead className="text-[9px] font-semibold text-slate-600">Impact on Donor</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {demandTrades.length === 0 ? (
                              <TableRow><TableCell colSpan={9} className="text-center text-[10px] text-slate-400 py-4">No lower-priority candidates available</TableCell></TableRow>
                            ) : demandTrades.map((dt, di) => (
                              <TableRow key={di} className="hover:bg-slate-50">
                                <TableCell className="text-[10px] text-[#8B0000] font-medium">{dt.donorJob}</TableCell>
                                <TableCell className="text-[10px] text-slate-700">{dt.program}</TableCell>
                                <TableCell className="text-[10px] text-slate-600">{dt.requiredDate.replace("2026-", "")}</TableCell>
                                <TableCell className="text-[10px] text-right text-slate-600">{dt.priority}</TableCell>
                                <TableCell className="text-[10px] text-slate-600">{dt.dpas}</TableCell>
                                <TableCell className="text-[10px] text-slate-600">{dt.criticalPath}</TableCell>
                                <TableCell className="text-[10px] text-right font-medium">{dt.qtyAvailToSwap}</TableCell>
                                <TableCell>
                                  <Badge className="text-[8px] bg-blue-100 text-blue-700">{dt.tradeAction}</Badge>
                                </TableCell>
                                <TableCell className="text-[10px] text-amber-600 font-medium">{dt.impactOnDonor}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {demandTrades.length > 0 && (
                          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded">
                            <p className="text-[10px] font-semibold text-amber-800">Trade Implication</p>
                            <p className="text-[9px] text-amber-700 mt-0.5">
                              Swapping build order with <span className="font-bold">{demandTrades[0].donorJob}</span> would cause it to slip <span className="font-bold">{demandTrades[0].impactOnDonor}</span>.
                              Net schedule benefit: <span className="font-bold text-green-700">recover {Math.min(sj.slipDays, 3)}d on {sj.id}</span> at cost of <span className="font-bold text-red-700">{demandTrades[0].impactOnDonor} on {demandTrades[0].donorJob}</span>.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            )
          })()}

          {/* SECTION 3: ROOT CAUSE DISTRIBUTION */}
          <Card className="border-slate-200">
            <CardHeader className="pb-1 pt-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold">3. Root Cause Distribution</CardTitle>
                <div className="flex gap-0.5">
                  {([["count", "Count"], ["slipDays", "Slip Days"], ["atRiskValue", "At-Risk $"], ["blockedToShip", "Blocked-to-Ship"]] as const).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setRootCauseMetric(key)}
                      className={`px-2 py-0.5 text-[9px] rounded ${rootCauseMetric === key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={rootCauseData} layout="vertical" margin={{ left: 10, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={(v) => rootCauseMetric === "atRiskValue" ? `$${(v / 1000).toFixed(0)}K` : v.toString()} />
                      <YAxis type="category" dataKey="shortLabel" tick={{ fontSize: 9 }} width={70} />
                      <Tooltip contentStyle={{ fontSize: 10 }} formatter={(v: number) => rootCauseMetric === "atRiskValue" ? fmtMoney(v) : v} />
                      <Bar
                        dataKey={rootCauseMetric}
                        fill="#8B0000"
                        radius={[0, 4, 4, 0]}
                        cursor="pointer"
                        onClick={(data: { category: string }) => setConstraintFilter(data.category === constraintFilter ? null : data.category)}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-slate-600">Top Drivers by Cause</p>
                  {rootCauseData.map((rc, i) => (
                    <div
                      key={i}
                      className={`p-2 border rounded cursor-pointer transition-colors ${constraintFilter === rc.category ? "border-[#8B0000] bg-red-50" : "border-slate-200 hover:bg-slate-50"}`}
                      onClick={() => setConstraintFilter(rc.category === constraintFilter ? null : rc.category)}
                    >
                      <p className="text-[10px] font-medium text-slate-700">{rc.shortLabel} <span className="text-slate-400">({rc.count} jobs)</span></p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {rc.topDrivers.map((d, di) => (
                          <span key={di} className="text-[8px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{d}</span>
                        ))}
                        {rc.topDrivers.length === 0 && <span className="text-[8px] text-slate-400">No specific drivers</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 4: TREND + ACCOUNTABILITY */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-slate-200">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-bold">4a. Weekly Trend (12 Weeks)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={weeklyTrend} margin={{ top: 5, right: 10, bottom: 5, left: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="week" tick={{ fontSize: 8 }} />
                    <YAxis tick={{ fontSize: 9 }} />
                    <Tooltip contentStyle={{ fontSize: 10 }} />
                    <Legend wrapperStyle={{ fontSize: 9 }} />
                    <Bar dataKey="late" stackId="a" fill="#8B0000" name="Late" />
                    <Bar dataKey="forecastLate" stackId="a" fill="#d97706" name="Forecast-Late" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3">
                  <p className="text-[10px] font-semibold text-slate-600 mb-1">Constraint Mix Trend</p>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={weeklyTrend} margin={{ top: 5, right: 10, bottom: 5, left: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="week" tick={{ fontSize: 8 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip contentStyle={{ fontSize: 10 }} />
                      <Bar dataKey="materials" stackId="c" fill="#8B0000" name="Materials" />
                      <Bar dataKey="mrbQuality" stackId="c" fill="#7c3aed" name="MRB/Quality" />
                      <Bar dataKey="capacity" stackId="c" fill="#2563eb" name="Capacity" />
                      <Bar dataKey="supplier" stackId="c" fill="#d97706" name="Supplier" />
                      <Bar dataKey="shelfLife" stackId="c" fill="#ea580c" name="Shelf-Life" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-bold">4b. Accountability & Repeat Offenders</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-[10px] font-semibold text-slate-600 mb-1">Repeat Offenders (Jobs/Parts/Suppliers appearing 2+ weeks)</p>
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-[9px] font-semibold text-slate-600">Item</TableHead>
                        <TableHead className="text-[9px] font-semibold text-slate-600">Type</TableHead>
                        <TableHead className="text-[9px] font-semibold text-slate-600 text-right">Weeks on List</TableHead>
                        <TableHead className="text-[9px] font-semibold text-slate-600">Constraint</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { item: "IC-DSP-09112", type: "Part", weeks: 6, constraint: "Materials" },
                        { item: "JOB-2026-0212", type: "Job", weeks: 4, constraint: "Materials + MRB" },
                        { item: "WC-001 SMT Line 1", type: "Workcenter", weeks: 5, constraint: "Capacity" },
                        { item: "JOB-2026-0215", type: "Job", weeks: 3, constraint: "MRB/Quality" },
                      ].map((r, i) => (
                        <TableRow key={i} className="hover:bg-slate-50">
                          <TableCell className="text-[10px] text-[#8B0000] font-medium">{r.item}</TableCell>
                          <TableCell className="text-[10px] text-slate-600">{r.type}</TableCell>
                          <TableCell className="text-[10px] text-right font-bold text-red-600">{r.weeks}</TableCell>
                          <TableCell className="text-[10px] text-slate-600">{r.constraint}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-slate-600 mb-1">Aging Unresolved Actions (Past Due)</p>
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-[9px] font-semibold text-slate-600">Action</TableHead>
                        <TableHead className="text-[9px] font-semibold text-slate-600">Owner</TableHead>
                        <TableHead className="text-[9px] font-semibold text-slate-600">Function</TableHead>
                        <TableHead className="text-[9px] font-semibold text-slate-600">Due</TableHead>
                        <TableHead className="text-[9px] font-semibold text-slate-600 text-right">Days Late</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { action: "Expedite IC-DSP-09112", owner: "M. Torres", fn: "Materials", due: "Feb 3", late: 6 },
                        { action: "Disposition NCR-2026-0033", owner: "J. Martinez", fn: "Quality", due: "Feb 5", late: 4 },
                        { action: "Rebalance WC-001 load", owner: "M. Torres", fn: "Prod Control", due: "Feb 6", late: 3 },
                        { action: "Resolve MRB-2026-003", owner: "S. Chen", fn: "Quality", due: "Feb 7", late: 2 },
                      ].map((a, i) => (
                        <TableRow key={i} className="hover:bg-slate-50">
                          <TableCell className="text-[10px] text-slate-700 font-medium max-w-[160px]">{a.action}</TableCell>
                          <TableCell className="text-[10px] text-slate-600">{a.owner}</TableCell>
                          <TableCell className="text-[10px] text-slate-600">{a.fn}</TableCell>
                          <TableCell className="text-[10px] text-slate-600">{a.due}</TableCell>
                          <TableCell className="text-[10px] text-right font-bold text-red-600">{a.late}d</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        )
      })()}

      {/* ==================== TAB 5: SHELF-LIFE TRACKING ==================== */}
      {activeSubTab === "shelf-life" && (() => {
        const lotsInScope = shelfLifeData.length
        const lotsNearExpiry = shelfLifeData.filter(s => s.daysToExpiry > 0 && s.daysToExpiry <= shelfExpiryThreshold).length
        const lotsExpired = shelfLifeData.filter(s => s.status === "Expired").length
        const jobsAtRisk = new Set(shelfLifeData.filter(s => s.flagged).flatMap(s => s.allocations.map(a => a.job))).size
        const expiryBeforeUse = shelfLifeData.filter(s => s.flagged).length
        const totalAtRiskValue = shelfLifeData.reduce((s, l) => s + l.atRiskValue, 0)
        const totalScrapValue = shelfLifeData.reduce((s, l) => s + l.scrapValue, 0)
        const actionedLots = shelfLifeData.filter(s => s.flagged && s.action !== "No action" && s.owner).length
        const mitigationCoverage = expiryBeforeUse > 0 ? Math.round((actionedLots / expiryBeforeUse) * 100) : 100

        // Group lots by part for Gantt
        const partGroups = shelfLifeData.reduce<Record<string, ShelfLot[]>>((acc, lot) => {
          if (!acc[lot.part]) acc[lot.part] = []
          acc[lot.part].push(lot)
          return acc
        }, {})

        // Timeline helpers
        const today = new Date("2026-02-09")
        const timelineStart = new Date("2025-07-01") // show mfg dates
        const timelineEnd = new Date("2026-08-31")
        const totalRange = timelineEnd.getTime() - timelineStart.getTime()
        const toPos = (d: string) => Math.min(Math.max(((new Date(d).getTime() - timelineStart.getTime()) / totalRange) * 100, 0), 100)
        const todayPos = toPos("2026-02-09")

        // Jobs impacted by shelf-life (for Section C)
        const impactedJobs = allJobs.filter(j => j.shelfLifeLots.some(l => l.flagged)).map(j => {
          const drivingLots = j.shelfLifeLots.filter(l => l.flagged).map(jl => {
            const fullLot = shelfLifeData.find(s => s.lot === jl.lot)
            return { ...jl, chosenLot: jl.lot, conflictDays: fullLot?.conflictDays || 0, qtyCoverage: fullLot ? `${fullLot.allocatedQty}/${fullLot.qty}` : "?", expiry: jl.expiry }
          })
          const suggestedMitigation = drivingLots.length > 0 ? (() => {
            const lot = shelfLifeData.find(s => s.lot === drivingLots[0].lot)
            if (lot?.alternateLots.length) return `Switch to ${lot.alternateLots[0].lot}`
            return "Re-sequence or extension request"
          })() : "N/A"
          return { ...j, drivingLots, suggestedMitigation }
        })

        return (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900">Shelf-Life Feasibility & Action Dashboard</h3>
            <div className="flex gap-2 items-center">
              {/* View Mode Toggle */}
              <div className="flex gap-0.5 bg-slate-100 rounded p-0.5">
                <button onClick={() => setShelfViewMode("gantt")} className={`px-2.5 py-1 text-[10px] rounded font-medium ${shelfViewMode === "gantt" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}>
                  Lot Feasibility (Gantt)
                </button>
                <button onClick={() => setShelfViewMode("demand")} className={`px-2.5 py-1 text-[10px] rounded font-medium ${shelfViewMode === "demand" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}>
                  Demand Risk (Jobs)
                </button>
              </div>
              {/* Threshold selector */}
              <select
                value={shelfExpiryThreshold}
                onChange={(e) => setShelfExpiryThreshold(Number(e.target.value))}
                className="h-7 text-[10px] border border-slate-200 rounded px-2 bg-white text-slate-700"
              >
                <option value={7}>Near: 7d</option>
                <option value={14}>Near: 14d</option>
                <option value={30}>Near: 30d</option>
              </select>
              <BackButton filter="Shelf-Life Constraint" />
            </div>
          </div>

          {/* KPI STRIP */}
          <div className="grid grid-cols-8 gap-2">
            {[
              { label: "Lots in Scope", value: lotsInScope.toString(), color: "text-slate-900" },
              { label: `Near Expiry (${shelfExpiryThreshold}d)`, value: lotsNearExpiry.toString(), color: lotsNearExpiry > 0 ? "text-amber-600" : "text-green-600" },
              { label: "Lots Expired", value: lotsExpired.toString(), color: lotsExpired > 0 ? "text-red-600" : "text-green-600" },
              { label: "Jobs at Risk", value: jobsAtRisk.toString(), color: jobsAtRisk > 0 ? "text-red-600" : "text-green-600" },
              { label: "Expiry Before Use", value: expiryBeforeUse.toString(), color: expiryBeforeUse > 0 ? "text-red-600" : "text-green-600" },
              { label: "At-Risk Value", value: fmtMoney(totalAtRiskValue), color: "text-red-600" },
              { label: "Potential Scrap $", value: fmtMoney(totalScrapValue), color: totalScrapValue > 0 ? "text-amber-600" : "text-slate-900" },
              { label: "Mitigation Coverage", value: `${mitigationCoverage}%`, color: mitigationCoverage >= 80 ? "text-green-600" : mitigationCoverage >= 50 ? "text-amber-600" : "text-red-600" },
            ].map((kpi, i) => (
              <Card key={i} className="border-slate-200">
                <CardContent className="p-2">
                  <p className="text-[9px] text-slate-500 mb-0.5 leading-tight">{kpi.label}</p>
                  <p className={`text-sm font-bold ${kpi.color}`}>{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* SECTION A: Lot Feasibility Gantt (shown when gantt mode) */}
          {shelfViewMode === "gantt" && (
            <div className="flex gap-3">
              {/* Gantt chart - main area */}
              <div className={`${selectedShelfLot ? "w-[60%]" : "w-full"} transition-all`}>
                <Card className="border-slate-200">
                  <CardHeader className="pb-1 pt-3 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-bold">A. Shelf-Life Feasibility Gantt</CardTitle>
                      <p className="text-[9px] text-slate-500">Viability bar (mfg to expiry) + consumption windows (issue to op-start). Click lot for details.</p>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3">
                    {/* Timeline header */}
                    <div className="flex items-center mb-1">
                      <div className="w-[170px] shrink-0"></div>
                      <div className="flex-1 relative h-5">
                        {["Jul '25", "Sep '25", "Nov '25", "Jan '26", "Mar '26", "May '26", "Jul '26"].map((label, mi) => (
                          <span key={label} className="absolute text-[8px] text-slate-400" style={{ left: `${(mi / 7) * 100}%` }}>{label}</span>
                        ))}
                        {/* Today line in header */}
                        <div className="absolute top-0 h-full w-px bg-[#8B0000]" style={{ left: `${todayPos}%` }} />
                        <span className="absolute text-[7px] text-[#8B0000] font-bold" style={{ left: `${todayPos}%`, top: -2, transform: "translateX(-50%)" }}>TODAY</span>
                      </div>
                      <div className="w-[90px] shrink-0"></div>
                    </div>

                    {/* Part groups */}
                    {Object.entries(partGroups).map(([partName, lots]) => {
                      const isExpanded = expandedPartGroups.has(partName)
                      const hasIssues = lots.some(l => l.flagged)
                      return (
                        <div key={partName} className="mb-1">
                          {/* Part group header */}
                          <div
                            className={`flex items-center gap-1 px-1 py-0.5 rounded cursor-pointer ${hasIssues ? "bg-red-50" : "bg-slate-50"} hover:bg-slate-100`}
                            onClick={() => setExpandedPartGroups(prev => {
                              const next = new Set(prev)
                              if (next.has(partName)) next.delete(partName); else next.add(partName)
                              return next
                            })}
                          >
                            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
                            <span className="text-[10px] font-bold text-slate-700">{partName}</span>
                            <span className="text-[9px] text-slate-400 ml-1">({lots.length} lot{lots.length > 1 ? "s" : ""})</span>
                            {hasIssues && <AlertTriangle className="w-3 h-3 text-red-500 ml-1" />}
                          </div>

                          {/* Lot rows */}
                          {isExpanded && lots.map((lot) => {
                            const isSelected = selectedShelfLot?.lot === lot.lot
                            const mfgPos = toPos(lot.mfgDate)
                            const expiryPos = toPos(lot.expiry)
                            const viabilityWidth = Math.max(expiryPos - mfgPos, 0.5)
                            const barColor = lot.status === "Expired" ? "#dc2626" : lot.status === "Critical" ? "#ea580c" : lot.status === "Near-Expiry" ? "#d97706" : "#16a34a"

                            return (
                              <div
                                key={lot.lot}
                                className={`flex items-center gap-0 py-1 cursor-pointer transition-colors ${isSelected ? "bg-red-50" : "hover:bg-slate-50"}`}
                                onClick={() => setSelectedShelfLot(isSelected ? null : lot)}
                              >
                                {/* Lot label */}
                                <div className="w-[170px] shrink-0 pl-5">
                                  <p className="text-[10px] text-slate-600 truncate">{lot.lot}</p>
                                  <p className="text-[8px] text-slate-400">Qty: {lot.qty} (Alloc: {lot.allocatedQty} / Rem: {lot.remainingQty})</p>
                                </div>

                                {/* Gantt area */}
                                <div className="flex-1 h-10 relative">
                                  {/* Today line */}
                                  <div className="absolute top-0 h-full w-px bg-[#8B0000]/30 z-10" style={{ left: `${todayPos}%` }} />

                                  {/* Viability bar */}
                                  <div
                                    className="absolute top-1 h-3 rounded-sm opacity-60"
                                    style={{ left: `${mfgPos}%`, width: `${viabilityWidth}%`, backgroundColor: barColor }}
                                    title={`Viable: ${lot.mfgDate} to ${lot.expiry}`}
                                  />

                                  {/* Consumption bars */}
                                  {lot.allocations.map((alloc, ai) => {
                                    const issuePos = toPos(alloc.issueDate)
                                    const opPos = toPos(alloc.opStart)
                                    const consumeWidth = Math.max(opPos - issuePos, 0.3)
                                    const isConflict = new Date(alloc.opStart) > new Date(lot.expiry) || lot.status === "Expired"
                                    const conflictStart = Math.max(expiryPos, issuePos)
                                    const conflictWidth = isConflict ? Math.max(opPos - conflictStart, 0) : 0

                                    return (
                                      <div key={ai}>
                                        {/* Valid portion */}
                                        <div
                                          className="absolute h-2.5 rounded-sm border border-blue-400 bg-blue-200/50"
                                          style={{ left: `${issuePos}%`, width: `${consumeWidth}%`, top: "18px" }}
                                          title={`${alloc.job}: Issue ${alloc.issueDate} -> Op ${alloc.opStart} (Qty: ${alloc.qtyNeeded})`}
                                        >
                                          <span className="text-[7px] text-blue-800 font-medium pl-0.5 whitespace-nowrap overflow-hidden">{alloc.job.replace("JOB-2026-", "")}</span>
                                        </div>
                                        {/* Conflict overlay (after expiry) */}
                                        {isConflict && conflictWidth > 0 && (
                                          <div
                                            className="absolute h-2.5 rounded-sm bg-red-500/40 border border-red-500"
                                            style={{ left: `${conflictStart}%`, width: `${conflictWidth}%`, top: "18px" }}
                                            title={`CONFLICT: ${lot.conflictDays}d past expiry`}
                                          >
                                            <span className="text-[6px] text-red-800 font-bold pl-0.5 whitespace-nowrap">+{lot.conflictDays}d</span>
                                          </div>
                                        )}
                                        {/* Short allocation indicator */}
                                        {lot.allocatedQty > lot.qty && ai === 0 && (
                                          <div className="absolute text-[6px] text-red-600 font-bold" style={{ left: `${opPos + 0.5}%`, top: "18px" }}>SHORT</div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>

                                {/* Status badge */}
                                <div className="w-[90px] shrink-0 text-right pr-1">
                                  <Badge className={`text-[7px] ${lot.status === "Expired" ? "bg-red-100 text-red-700" : lot.status === "Critical" ? "bg-red-100 text-red-700" : lot.status === "Near-Expiry" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                                    {lot.status === "Expired" ? "Expired" : lot.flagged ? `Exp Before Use` : lot.status === "Near-Expiry" ? `${lot.daysToExpiry}d left` : "Healthy"}
                                  </Badge>
                                  {lot.earliestRiskDate !== "N/A" && (
                                    <p className="text-[7px] text-red-500 mt-0.5">Risk: {lot.earliestRiskDate.replace("2026-", "")}</p>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}

                    {/* Legend */}
                    <div className="flex items-center gap-4 mt-3 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1"><div className="w-6 h-2 bg-green-500 rounded-sm opacity-60"></div><span className="text-[8px] text-slate-500">Healthy Viability</span></div>
                      <div className="flex items-center gap-1"><div className="w-6 h-2 bg-amber-500 rounded-sm opacity-60"></div><span className="text-[8px] text-slate-500">Near-Expiry</span></div>
                      <div className="flex items-center gap-1"><div className="w-6 h-2 bg-red-500 rounded-sm opacity-60"></div><span className="text-[8px] text-slate-500">Expired/Critical</span></div>
                      <div className="flex items-center gap-1"><div className="w-6 h-2 bg-blue-200 border border-blue-400 rounded-sm"></div><span className="text-[8px] text-slate-500">Consume Window</span></div>
                      <div className="flex items-center gap-1"><div className="w-6 h-2 bg-red-500/40 border border-red-500 rounded-sm"></div><span className="text-[8px] text-slate-500">Conflict (past expiry)</span></div>
                      <div className="flex items-center gap-1"><div className="w-px h-4 bg-[#8B0000]"></div><span className="text-[8px] text-slate-500">Today</span></div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Lot Detail Drawer (right side) */}
              {selectedShelfLot && (
                <div className="w-[40%]">
                  <Card className="border-[#8B0000]/30 border-2 sticky top-0">
                    <CardHeader className="pb-2 pt-3 px-4 bg-slate-50">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-bold">Lot Detail: {selectedShelfLot.lot}</CardTitle>
                        <Button variant="outline" className="h-6 text-[10px] bg-transparent" onClick={() => setSelectedShelfLot(null)}>Close</Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 space-y-3 max-h-[600px] overflow-y-auto">
                      {/* Lot summary */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2 bg-slate-50 rounded"><p className="text-[8px] text-slate-500">Part</p><p className="text-[10px] font-bold text-slate-800">{selectedShelfLot.part}</p></div>
                        <div className="p-2 bg-slate-50 rounded"><p className="text-[8px] text-slate-500">Expiry</p><p className="text-[10px] font-bold text-red-600">{selectedShelfLot.expiry.replace("2026-", "")}</p></div>
                        <div className="p-2 bg-slate-50 rounded"><p className="text-[8px] text-slate-500">Days Left</p><p className={`text-[10px] font-bold ${selectedShelfLot.daysToExpiry <= 0 ? "text-red-600" : selectedShelfLot.daysToExpiry <= 7 ? "text-amber-600" : "text-green-600"}`}>{selectedShelfLot.daysToExpiry <= 0 ? "EXPIRED" : `${selectedShelfLot.daysToExpiry}d`}</p></div>
                      </div>

                      {/* Locations */}
                      <div>
                        <p className="text-[10px] font-semibold text-slate-600 mb-1">Qty by Location</p>
                        <div className="space-y-1">
                          {selectedShelfLot.locations.map((loc, i) => (
                            <div key={i} className="flex items-center justify-between p-1.5 border border-slate-100 rounded">
                              <span className="text-[10px] text-slate-700">{loc.loc}</span>
                              <span className="text-[10px] font-bold text-slate-900">{loc.qty} units</span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded">
                            <span className="text-[10px] font-medium text-slate-600">Total / Alloc / Remaining</span>
                            <span className="text-[10px] font-bold">{selectedShelfLot.qty} / {selectedShelfLot.allocatedQty} / {selectedShelfLot.remainingQty}</span>
                          </div>
                        </div>
                      </div>

                      {/* Allocations */}
                      <div>
                        <p className="text-[10px] font-semibold text-slate-600 mb-1">Pegged Allocations</p>
                        <Table>
                          <TableHeader className="bg-slate-50">
                            <TableRow>
                              <TableHead className="text-[8px] font-semibold text-slate-600">Job</TableHead>
                              <TableHead className="text-[8px] font-semibold text-slate-600 text-right">Qty</TableHead>
                              <TableHead className="text-[8px] font-semibold text-slate-600">Consume</TableHead>
                              <TableHead className="text-[8px] font-semibold text-slate-600 text-right">Priority</TableHead>
                              <TableHead className="text-[8px] font-semibold text-slate-600">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedShelfLot.allocations.map((a, i) => (
                              <TableRow key={i} className="hover:bg-slate-50 cursor-pointer" onClick={() => {
                                const job = allJobs.find(j => j.id === a.job)
                                if (job) { setDrawerJob(job); setDrawerTab("shelf-life") }
                              }}>
                                <TableCell className="text-[9px] text-[#8B0000] font-medium">{a.job.replace("JOB-2026-", "")}</TableCell>
                                <TableCell className="text-[9px] text-right">{a.qtyNeeded}</TableCell>
                                <TableCell className="text-[9px] text-slate-600">{a.issueDate.replace("2026-", "")} - {a.opStart.replace("2026-", "")}</TableCell>
                                <TableCell className="text-[9px] text-right font-medium">{a.priority}</TableCell>
                                <TableCell>
                                  <Badge className={`text-[7px] ${a.readiness === "Blocked" ? "bg-red-100 text-red-700" : a.readiness === "Watch" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>{a.readiness}</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Alternate Lots */}
                      <div>
                        <p className="text-[10px] font-semibold text-slate-600 mb-1">Alternate Lots (Same Part)</p>
                        {selectedShelfLot.alternateLots.length === 0 ? (
                          <p className="text-[9px] text-slate-400 p-2 bg-slate-50 rounded text-center">No alternates available</p>
                        ) : (
                          <div className="space-y-1">
                            {selectedShelfLot.alternateLots.map((alt, i) => (
                              <div key={i} className="flex items-center justify-between p-2 border border-green-200 bg-green-50 rounded">
                                <div>
                                  <p className="text-[10px] font-medium text-green-800">{alt.lot}</p>
                                  <p className="text-[8px] text-green-600">{alt.location} | {alt.daysLeft}d remaining</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] font-bold text-green-700">{alt.qty} units</p>
                                  <p className="text-[8px] text-green-600">Exp: {alt.expiry.replace("2026-", "")}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Recommended Actions */}
                      <div>
                        <p className="text-[10px] font-semibold text-slate-600 mb-1">Recommended Actions</p>
                        <div className="space-y-1">
                          {[
                            ...(selectedShelfLot.allocations.length > 0 && selectedShelfLot.daysToExpiry > 0 ? [{ action: "Consume-First", desc: "Prioritize this lot for earliest scheduled job", severity: "high" }] : []),
                            ...(selectedShelfLot.alternateLots.length > 0 ? [{ action: "Switch to Alternate", desc: `Re-allocate to ${selectedShelfLot.alternateLots[0].lot} (${selectedShelfLot.alternateLots[0].daysLeft}d remaining)`, severity: "med" }] : []),
                            ...(selectedShelfLot.locations.length > 1 ? [{ action: "Move Inventory", desc: `Consolidate from ${selectedShelfLot.locations.map(l => l.loc).join(", ")} to point of use`, severity: "low" }] : []),
                            { action: "Request Extension", desc: `Submit shelf-life extension request to engineering/supplier (current: ${selectedShelfLot.expiry.replace("2026-", "")})`, severity: "med" },
                            ...(selectedShelfLot.status === "Expired" ? [{ action: "Replace Buy", desc: `Order replacement qty ${selectedShelfLot.allocatedQty} units of ${selectedShelfLot.part}`, severity: "high" }] : []),
                            { action: "Re-Sequence Job", desc: "Move highest-priority job earlier to fit within viability window", severity: "med" },
                          ].map((act, i) => (
                            <div key={i} className={`flex items-start gap-2 p-2 border rounded ${act.severity === "high" ? "border-red-200 bg-red-50" : act.severity === "med" ? "border-amber-200 bg-amber-50" : "border-slate-200"}`}>
                              <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${act.severity === "high" ? "bg-red-500" : act.severity === "med" ? "bg-amber-500" : "bg-slate-400"}`}></div>
                              <div>
                                <p className="text-[10px] font-medium text-slate-800">{act.action}</p>
                                <p className="text-[9px] text-slate-500">{act.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Owner / Due */}
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-semibold text-slate-600">Current Assignment</span>
                          <Badge className={`text-[8px] ${selectedShelfLot.action === "No action" ? "bg-slate-100 text-slate-500" : "bg-amber-100 text-amber-700"}`}>{selectedShelfLot.action}</Badge>
                        </div>
                        <p className="text-[10px] text-slate-700">Owner: <span className="font-medium">{selectedShelfLot.owner}</span></p>
                        <p className="text-[10px] text-slate-700">At-Risk Value: <span className="font-medium text-red-600">{fmtMoney(selectedShelfLot.atRiskValue)}</span></p>
                        <p className="text-[10px] text-slate-700">Potential Scrap: <span className="font-medium text-amber-600">{fmtMoney(selectedShelfLot.scrapValue)}</span></p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* SECTION B: Exception / Action Queue (always shown) */}
          <Card className="border-slate-200">
            <CardHeader className="pb-1 pt-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  B. Shelf-Life Exception / Action Queue
                </CardTitle>
                <p className="text-[9px] text-slate-500">Only lots requiring action. Sorted by conflict severity.</p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-b border-slate-200">
                    <TableHead className="text-[9px] font-semibold text-slate-600">Part</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600">Lot</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600">Location</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600 text-right">Qty</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600">Expiry</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600 text-right">Days Left</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600 text-right">Linked Jobs</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600">1st Conflict</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600">Conflict Severity</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600">Recommended Action</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600">Owner</TableHead>
                    <TableHead className="text-[9px] font-semibold text-slate-600">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shelfLifeData
                    .filter(s => s.flagged || s.status === "Expired" || s.status === "Critical")
                    .sort((a, b) => b.conflictDays - a.conflictDays || b.atRiskValue - a.atRiskValue)
                    .map(lot => (
                    <TableRow key={lot.lot} className={`hover:bg-slate-50 cursor-pointer ${selectedShelfLot?.lot === lot.lot ? "bg-red-50" : ""}`} onClick={() => { setShelfViewMode("gantt"); setSelectedShelfLot(lot) }}>
                      <TableCell className="text-[10px] text-slate-700 font-medium">{lot.part}</TableCell>
                      <TableCell className="text-[10px] text-[#8B0000] font-medium">{lot.lot}</TableCell>
                      <TableCell className="text-[10px] text-slate-600">{lot.location}</TableCell>
                      <TableCell className="text-[10px] text-right">{lot.qty}</TableCell>
                      <TableCell className="text-[10px] text-red-600">{lot.expiry.replace("2026-", "")}</TableCell>
                      <TableCell className="text-[10px] text-right font-bold text-red-600">{lot.daysToExpiry <= 0 ? "EXP" : `${lot.daysToExpiry}d`}</TableCell>
                      <TableCell className="text-[10px] text-right">
                        <span className="text-blue-600 font-medium">{lot.allocations.length}</span>
                        <span className="text-[8px] text-slate-400 ml-1">({lot.allocations.map(a => a.job.replace("JOB-2026-", "")).join(", ")})</span>
                      </TableCell>
                      <TableCell className="text-[10px] text-slate-600">{lot.earliestRiskDate !== "N/A" ? lot.earliestRiskDate.replace("2026-", "") : "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge className={`text-[8px] ${lot.conflictDays > 5 ? "bg-red-100 text-red-700" : lot.conflictDays > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                            {lot.conflictDays > 0 ? `+${lot.conflictDays}d past` : lot.status === "Critical" ? "Imminent" : "Monitor"}
                          </Badge>
                          <span className="text-[8px] text-slate-500">{fmtMoney(lot.atRiskValue)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[8px] ${lot.action === "Replace" ? "bg-red-100 text-red-700" : lot.action === "Consume first" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                          {lot.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] text-slate-600">{lot.owner}</TableCell>
                      <TableCell>
                        <Badge className={`text-[8px] ${lot.status === "Expired" ? "bg-red-100 text-red-700" : lot.status === "Critical" ? "bg-orange-100 text-orange-700" : "bg-amber-100 text-amber-700"}`}>
                          {lot.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* SECTION C: Jobs Impacted by Shelf-Life (shown when demand mode) */}
          {shelfViewMode === "demand" && (
            <Card className="border-slate-200">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-bold">C. Jobs Impacted by Shelf-Life Constraints</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="border-b border-slate-200">
                      <TableHead className="text-[9px] font-semibold text-slate-600">Job / WO</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600">Program</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600">Required Date</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600">Planned Start</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600">Shelf-Life Part(s)</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600">Chosen Lot</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600">Expiry</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600 text-right">Conflict</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600">Qty Coverage</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600">Suggested Mitigation</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600">Swap Impact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {impactedJobs.length === 0 ? (
                      <TableRow><TableCell colSpan={11} className="text-center text-[10px] text-slate-400 py-6">No jobs impacted by shelf-life constraints</TableCell></TableRow>
                    ) : impactedJobs.map(j => (
                      <TableRow key={j.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => { setDrawerJob(j); setDrawerTab("shelf-life") }}>
                        <TableCell className="text-[10px] text-[#8B0000] font-bold">{j.id}</TableCell>
                        <TableCell className="text-[10px] text-slate-700">{j.program}</TableCell>
                        <TableCell className="text-[10px] text-slate-600">{j.requiredDate.replace("2026-", "")}</TableCell>
                        <TableCell className="text-[10px] text-slate-600">{j.plannedFinish.replace("2026-", "")}</TableCell>
                        <TableCell className="text-[10px] text-slate-700">
                          {j.drivingLots.map((dl, i) => (
                            <span key={i} className="block text-[9px]">{dl.part}</span>
                          ))}
                        </TableCell>
                        <TableCell className="text-[10px]">
                          {j.drivingLots.map((dl, i) => (
                            <span key={i} className="block text-[9px] text-slate-600">{dl.chosenLot.replace("LOT-", "")}</span>
                          ))}
                        </TableCell>
                        <TableCell className="text-[10px]">
                          {j.drivingLots.map((dl, i) => (
                            <span key={i} className="block text-[9px] text-red-600">{dl.expiry.replace("2026-", "")}</span>
                          ))}
                        </TableCell>
                        <TableCell className="text-[10px] text-right">
                          {j.drivingLots.map((dl, i) => (
                            <span key={i} className={`block text-[9px] font-bold ${dl.conflictDays > 0 ? "text-red-600" : "text-amber-600"}`}>
                              {dl.conflictDays > 0 ? `+${dl.conflictDays}d` : "Imminent"}
                            </span>
                          ))}
                        </TableCell>
                        <TableCell className="text-[10px]">
                          {j.drivingLots.map((dl, i) => (
                            <span key={i} className="block text-[9px] text-slate-600">{dl.qtyCoverage}</span>
                          ))}
                        </TableCell>
                        <TableCell>
                          <Badge className="text-[8px] bg-blue-100 text-blue-700">{j.suggestedMitigation}</Badge>
                        </TableCell>
                        <TableCell className="text-[9px] text-slate-500">
                          {j.suggestedMitigation.includes("Switch") ? "Donor program may slip 1-2d" : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
        )
      })()}

      {/* ==================== TAB 6: MRB PARTS ==================== */}
      {activeSubTab === "mrb-parts" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900">MRB Part Tracking</h3>
            <BackButton filter="MRB / Quality Hold" />
          </div>
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: "MRB Value", value: fmtMoney(mrbData.reduce((s, m) => s + m.value, 0)), color: "text-red-600" },
              { label: "MRB Items", value: mrbData.length.toString(), color: "text-slate-900" },
              { label: "Avg Age (days)", value: `${Math.round(mrbData.reduce((s, m) => s + m.age, 0) / mrbData.length)}`, color: "text-amber-600" },
              { label: "Blocking Deliveries", value: mrbData.filter(m => m.peggedJobs.length > 0).length.toString(), color: "text-red-600" },
              { label: "At-Risk Value", value: fmtMoney(mrbData.reduce((s, m) => s + m.atRiskValue, 0)), color: "text-red-600" },
            ].map((kpi, i) => (
              <Card key={i} className="border-slate-200">
                <CardContent className="p-3">
                  <p className="text-[10px] text-slate-500 mb-1">{kpi.label}</p>
                  <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-slate-200">
            <CardHeader className="pb-2"><CardTitle className="text-sm">MRB Impact List</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-[10px] font-semibold text-slate-600">MRB ID</TableHead>
                    <TableHead className="text-[10px] font-semibold text-slate-600">Part</TableHead>
                    <TableHead className="text-[10px] font-semibold text-slate-600">Lot</TableHead>
                    <TableHead className="text-[10px] font-semibold text-slate-600 text-right">Qty</TableHead>
                    <TableHead className="text-[10px] font-semibold text-slate-600 text-right">Value</TableHead>
                    <TableHead className="text-[10px] font-semibold text-slate-600 text-right">Age</TableHead>
                    <TableHead className="text-[10px] font-semibold text-slate-600">Disposition</TableHead>
                    <TableHead className="text-[10px] font-semibold text-slate-600">Pegged Job</TableHead>
                    <TableHead className="text-[10px] font-semibold text-slate-600 text-right">At-Risk $</TableHead>
                    <TableHead className="text-[10px] font-semibold text-slate-600">Suggested Lever</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mrbData.map(m => (
                    <TableRow key={m.id} className="hover:bg-slate-50">
                      <TableCell className="text-[11px] text-[#8B0000] font-medium">{m.id}</TableCell>
                      <TableCell className="text-[10px] text-slate-700">{m.part}</TableCell>
                      <TableCell className="text-[10px] text-slate-600">{m.lot}</TableCell>
                      <TableCell className="text-[10px] text-right">{m.qty}</TableCell>
                      <TableCell className="text-[10px] text-right">{fmtMoney(m.value)}</TableCell>
                      <TableCell className="text-[10px] text-right font-medium">{m.age}d</TableCell>
                      <TableCell><Badge className="text-[9px] bg-amber-100 text-amber-700">{m.disposition}</Badge></TableCell>
                      <TableCell className="text-[10px] text-blue-600 cursor-pointer" onClick={() => {
                        const job = allJobs.find(j => m.peggedJobs.includes(j.id))
                        if (job) { setDrawerJob(job); setDrawerTab("quality") }
                      }}>{m.peggedJobs.join(", ")}</TableCell>
                      <TableCell className="text-[10px] text-right font-medium text-red-600">{fmtMoney(m.atRiskValue)}</TableCell>
                      <TableCell className="text-[10px] text-slate-600 max-w-[120px]">{m.lever}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================== TAB 7: CAPACITY TRACKING ==================== */}
      {activeSubTab === "capacity" && (() => {
        const bottlenecks = capacityStations.filter(c => c.reqHrs7d > c.availHrs7d)
        const totalShortfall = bottlenecks.reduce((s, c) => s + (c.reqHrs7d - c.availHrs7d), 0)
        const totalJobsImpacted = capacityStations.reduce((s, c) => s + c.jobsImpacted, 0)
        const maxDelay = Math.max(...capacityStations.map(c => c.maxDelay))
        const primaryBottleneck = [...capacityStations].sort((a, b) => b.utilPct - a.utilPct)[0]
        const firstConstraintDate = capacityStations.filter(c => c.firstConstraintDate).sort((a, b) => a.firstConstraintDate!.localeCompare(b.firstConstraintDate!))[0]?.firstConstraintDate
        // Worst capacity slack
        const worstSlackJob = allJobs.filter(j => j.primaryBlocker === "Capacity Constraint").sort((a, b) => {
          const slackA = Math.round((new Date(a.requiredDate).getTime() - new Date(a.plannedFinish).getTime()) / 86400000)
          const slackB = Math.round((new Date(b.requiredDate).getTime() - new Date(b.plannedFinish).getTime()) / 86400000)
          return slackA - slackB
        })[0]
        const worstCapSlack = worstSlackJob ? Math.round((new Date(worstSlackJob.requiredDate).getTime() - new Date(worstSlackJob.plannedFinish).getTime()) / 86400000) : 0

        // Product families from jobs
        const productFamilies = [...new Set(allJobs.map(j => j.productFamily))]

        // Filter stations
        const visibleStations = capShowFilter === "constrained" ? capacityStations.filter(c => c.reqHrs7d > c.availHrs7d)
          : capShowFilter === "impacted" ? capacityStations.filter(c => c.jobsImpacted > 0)
          : capacityStations

        // Routing connections for workflow map
        const routingLayers = [
          { label: "Op 10: SMT", stations: capacityStations.filter(s => s.opSeq === 10) },
          { label: "Op 20-25: Sub-Assy", stations: capacityStations.filter(s => s.opSeq >= 20 && s.opSeq < 30) },
          { label: "Op 30: Final Assy", stations: capacityStations.filter(s => s.opSeq === 30) },
          { label: "Op 40: Test", stations: capacityStations.filter(s => s.opSeq === 40) },
        ]

        return (
        <div className="space-y-3">
          {/* Header + Filters */}
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900">Capacity Tracking</h3>
            <div className="flex gap-2 items-center">
              {/* View mode */}
              <div className="flex gap-0.5 bg-slate-100 rounded p-0.5">
                <button onClick={() => setCapViewMode("workflow")} className={`px-2.5 py-1 text-[10px] rounded font-medium ${capViewMode === "workflow" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}>
                  Workflow Map
                </button>
                <button onClick={() => setCapViewMode("bottleneck")} className={`px-2.5 py-1 text-[10px] rounded font-medium ${capViewMode === "bottleneck" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}>
                  Bottleneck List
                </button>
              </div>
              {/* Time bucket */}
              <div className="flex gap-0.5 bg-slate-100 rounded p-0.5">
                <button onClick={() => setCapTimeBucket("daily")} className={`px-2 py-1 text-[10px] rounded font-medium ${capTimeBucket === "daily" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}>Daily</button>
                <button onClick={() => setCapTimeBucket("weekly")} className={`px-2 py-1 text-[10px] rounded font-medium ${capTimeBucket === "weekly" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}>Weekly</button>
              </div>
              {/* Show filter */}
              <select value={capShowFilter} onChange={e => setCapShowFilter(e.target.value as "all" | "constrained" | "impacted")} className="h-7 text-[10px] border border-slate-200 rounded px-2 bg-white text-slate-700">
                <option value="all">All Stations</option>
                <option value="constrained">Constrained Only</option>
                <option value="impacted">Jobs Impacted</option>
              </select>
              <BackButton filter="Capacity Constraint" />
            </div>
          </div>

          {/* KPI STRIP */}
          <div className="grid grid-cols-7 gap-2">
            {[
              { label: "Bottleneck Stations", value: bottlenecks.length.toString(), color: bottlenecks.length > 0 ? "text-red-600" : "text-green-600" },
              { label: "Shortfall (hrs)", value: `${totalShortfall}h`, color: totalShortfall > 0 ? "text-red-600" : "text-green-600" },
              { label: "Jobs Impacted", value: totalJobsImpacted.toString(), color: totalJobsImpacted > 0 ? "text-amber-600" : "text-green-600" },
              { label: "Max Projected Delay", value: `${maxDelay}d`, color: maxDelay > 0 ? "text-red-600" : "text-green-600" },
              { label: "First Constraint Date", value: firstConstraintDate ? firstConstraintDate.replace("2026-", "") : "None", color: firstConstraintDate ? "text-red-600" : "text-green-600" },
              { label: "Primary Bottleneck", value: primaryBottleneck ? `${primaryBottleneck.name} (${primaryBottleneck.utilPct}%)` : "None", color: primaryBottleneck?.utilPct > 100 ? "text-red-600" : "text-green-600" },
              { label: "Worst Cap Slack", value: `${worstCapSlack}d`, color: worstCapSlack < 0 ? "text-red-600" : worstCapSlack <= 3 ? "text-amber-600" : "text-green-600" },
            ].map((kpi, i) => (
              <Card key={i} className="border-slate-200">
                <CardContent className="p-2">
                  <p className="text-[9px] text-slate-500 mb-0.5 leading-tight">{kpi.label}</p>
                  <p className={`text-sm font-bold ${kpi.color}`}>{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* WORKFLOW MAP VIEW */}
          {capViewMode === "workflow" && (
            <div className="flex gap-3">
              {/* Map area */}
              <div className={`${selectedStation ? "w-[55%]" : "w-full"} transition-all`}>
                <Card className="border-slate-200">
                  <CardHeader className="pb-1 pt-3 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-bold">Workflow Capacity Map</CardTitle>
                      <p className="text-[9px] text-slate-500">Station routing flow. Click a node to drill down. Downstream highlighted on selection.</p>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    {/* Routing flow: layers left to right */}
                    <div className="flex items-start gap-2">
                      {routingLayers.map((layer, li) => (
                        <div key={layer.label} className="flex items-center gap-2">
                          <div className="flex flex-col gap-2 items-center min-w-[140px]">
                            <span className="text-[8px] font-semibold text-slate-400 mb-1">{layer.label}</span>
                            {layer.stations.filter(s => visibleStations.some(vs => vs.id === s.id)).map(station => {
                              const isSelected = selectedStation?.id === station.id
                              const isDownstream = selectedStation && (selectedStation.downstreamIds.includes(station.id) || capacityStations.find(s => s.id === station.id)?.upstreamIds.includes(selectedStation.id))
                              const isConstrained = station.reqHrs7d > station.availHrs7d
                              const shortfall = Math.max(station.reqHrs7d - station.availHrs7d, 0)
                              const nodeColor = isConstrained ? (station.utilPct > 130 ? "border-red-500 bg-red-50" : "border-amber-400 bg-amber-50") : "border-green-400 bg-green-50"
                              // Product families through this station
                              const stJobs = allJobs.filter(j => station.peggedJobs.includes(j.id))
                              const stFamilies = [...new Set(stJobs.map(j => j.productFamily))]

                              return (
                                <div
                                  key={station.id}
                                  className={`w-full p-2.5 rounded-lg border-2 cursor-pointer transition-all ${nodeColor} ${isSelected ? "ring-2 ring-[#8B0000] ring-offset-1 shadow-lg" : isDownstream ? "ring-1 ring-blue-400" : "hover:shadow-md"}`}
                                  onClick={() => setSelectedStation(isSelected ? null : station)}
                                >
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[10px] font-bold text-slate-800">{station.id}</span>
                                    <Badge className={`text-[7px] ${station.utilPct > 130 ? "bg-red-100 text-red-700" : station.utilPct > 100 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                                      {station.utilPct}%
                                    </Badge>
                                  </div>
                                  <p className="text-[9px] text-slate-600 mb-1">{station.name}</p>
                                  {/* Product family chips */}
                                  {stFamilies.length > 0 && (
                                    <div className="flex flex-wrap gap-0.5 mb-1.5">
                                      {stFamilies.slice(0, 3).map(f => (
                                        <span key={f} className="text-[7px] px-1 py-0.5 bg-white/60 border border-slate-200 rounded text-slate-600">{f}</span>
                                      ))}
                                      {stFamilies.length > 3 && <span className="text-[7px] text-slate-400">+{stFamilies.length - 3}</span>}
                                    </div>
                                  )}
                                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                                    <div className="text-[8px]"><span className="text-slate-400">Req:</span> <span className="font-medium text-slate-700">{station.reqHrs7d}h</span></div>
                                    <div className="text-[8px]"><span className="text-slate-400">Avail:</span> <span className="font-medium text-slate-700">{station.availHrs7d}h</span></div>
                                    {shortfall > 0 && <div className="text-[8px] col-span-2"><span className="text-red-600 font-bold">Shortfall: {shortfall}h</span></div>}
                                    <div className="text-[8px]"><span className="text-slate-400">WIP:</span> <span className="font-medium">{station.wipJobs} jobs</span></div>
                                    <div className="text-[8px]"><span className="text-slate-400">Queue:</span> <span className="font-medium">{station.avgQueueAge.toFixed(1)}d</span></div>
                                  </div>
                                  {station.jobsImpacted > 0 && (
                                    <div className="mt-1.5 pt-1.5 border-t border-slate-200">
                                      <span className="text-[8px] text-red-600 font-bold">{station.jobsImpacted} jobs impacted | Max {station.maxDelay}d delay</span>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                          {/* Arrow connector between layers */}
                          {li < routingLayers.length - 1 && (
                            <div className="flex flex-col items-center justify-center self-center">
                              <ChevronRight className="w-5 h-5 text-slate-300" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-1.5"><div className="w-4 h-3 rounded border-2 border-green-400 bg-green-50"></div><span className="text-[8px] text-slate-500">{'<'}100% Utilization</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-4 h-3 rounded border-2 border-amber-400 bg-amber-50"></div><span className="text-[8px] text-slate-500">100-130% (Near Threshold)</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-4 h-3 rounded border-2 border-red-500 bg-red-50"></div><span className="text-[8px] text-slate-500">{'>'}130% (Critical)</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-4 h-3 rounded ring-2 ring-[#8B0000] ring-offset-1"></div><span className="text-[8px] text-slate-500">Selected</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-4 h-3 rounded ring-1 ring-blue-400"></div><span className="text-[8px] text-slate-500">Downstream</span></div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Station Drilldown Panel (right side) */}
              {selectedStation && (
                <div className="w-[45%]">
                  <Card className="border-[#8B0000]/30 border-2 sticky top-0">
                    <CardHeader className="pb-2 pt-3 px-4 bg-slate-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-xs font-bold">{selectedStation.id} - {selectedStation.name}</CardTitle>
                          <p className="text-[9px] text-slate-500 mt-0.5">Owner: {selectedStation.owner} | Shifts: {selectedStation.shifts} | OT: {selectedStation.otAvail ? "Available" : "Not available"}</p>
                        </div>
                        <Button variant="outline" className="h-6 text-[10px] bg-transparent" onClick={() => setSelectedStation(null)}>Close</Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 space-y-3 max-h-[600px] overflow-y-auto">
                      {/* Station summary */}
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: "Utilization", value: `${selectedStation.utilPct}%`, color: selectedStation.utilPct > 100 ? "text-red-600" : "text-green-600" },
                          { label: "Shortfall", value: `${Math.max(selectedStation.reqHrs7d - selectedStation.availHrs7d, 0)}h`, color: selectedStation.reqHrs7d > selectedStation.availHrs7d ? "text-red-600" : "text-green-600" },
                          { label: "WIP / Queue", value: `${selectedStation.wipJobs} / ${selectedStation.avgQueueAge.toFixed(1)}d`, color: "text-slate-900" },
                          { label: "Max Delay", value: `${selectedStation.maxDelay}d`, color: selectedStation.maxDelay > 0 ? "text-red-600" : "text-green-600" },
                        ].map((m, i) => (
                          <div key={i} className="p-2 bg-slate-50 rounded">
                            <p className="text-[8px] text-slate-500">{m.label}</p>
                            <p className={`text-[11px] font-bold ${m.color}`}>{m.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Product Families through this station */}
                      {(() => {
                        const stationJobObjs = allJobs.filter(j => selectedStation.peggedJobs.includes(j.id))
                        const familyGroups = stationJobObjs.reduce<Record<string, { count: number; value: number; minReq: string }>>((acc, j) => {
                          if (!acc[j.productFamily]) acc[j.productFamily] = { count: 0, value: 0, minReq: j.requiredDate }
                          acc[j.productFamily].count++
                          acc[j.productFamily].value += j.value
                          if (j.requiredDate < acc[j.productFamily].minReq) acc[j.productFamily].minReq = j.requiredDate
                          return acc
                        }, {})
                        if (Object.keys(familyGroups).length === 0) return null
                        return (
                          <div>
                            <p className="text-[10px] font-semibold text-slate-600 mb-1">Product Families at Station</p>
                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(familyGroups).map(([fam, data]) => (
                                <div key={fam} className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[9px]">
                                  <span className="font-medium text-slate-800">{fam}</span>
                                  <span className="text-slate-400 ml-1">({data.count} jobs, {fmtMoney(data.value)}, earliest: {data.minReq.replace("2026-", "")})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })()}

                      {/* Time-phased chart */}
                      <div>
                        <p className="text-[10px] font-semibold text-slate-600 mb-1">Required vs Available by {capTimeBucket === "daily" ? "Day" : "Week"}</p>
                        <ResponsiveContainer width="100%" height={160}>
                          <BarChart data={capTimeBucket === "daily" ? selectedStation.dailyLoad : (() => {
                            const weeks: { day: string; avail: number; req: number }[] = []
                            for (let i = 0; i < selectedStation.dailyLoad.length; i += 5) {
                              const chunk = selectedStation.dailyLoad.slice(i, i + 5)
                              weeks.push({ day: `Wk ${Math.floor(i / 5) + 1}`, avail: chunk.reduce((s, d) => s + d.avail, 0), req: chunk.reduce((s, d) => s + d.req, 0) })
                            }
                            return weeks
                          })()} margin={{ top: 5, right: 10, bottom: 20, left: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="day" tick={{ fontSize: 8 }} angle={-20} textAnchor="end" height={35} />
                            <YAxis tick={{ fontSize: 8 }} width={25} />
                            <Tooltip contentStyle={{ fontSize: 9 }} />
                            <Bar dataKey="avail" fill="#86efac" name="Available" radius={[2, 2, 0, 0]} />
                            <Bar dataKey="req" fill={selectedStation.utilPct > 100 ? "#ef4444" : "#8B0000"} name="Required" radius={[2, 2, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                        {/* Overload windows */}
                        {(() => {
                          const overloadDays = selectedStation.dailyLoad.filter(d => d.req > d.avail)
                          if (overloadDays.length === 0) return <p className="text-[9px] text-green-600 font-medium">No overload periods in horizon.</p>
                          const worstDay = [...overloadDays].sort((a, b) => (b.req - b.avail) - (a.req - a.avail))[0]
                          return (
                            <div className="flex gap-2 mt-1">
                              <Badge className="text-[8px] bg-red-100 text-red-700">First overload: {overloadDays[0].day}</Badge>
                              <Badge className="text-[8px] bg-red-100 text-red-700">Worst: {worstDay.day} (+{worstDay.req - worstDay.avail}h shortfall)</Badge>
                              <Badge className="text-[8px] bg-slate-100 text-slate-600">{overloadDays.length} overload days</Badge>
                            </div>
                          )
                        })()}
                      </div>

                      {/* Impacted Jobs ranked list */}
                      <div>
                        <p className="text-[10px] font-semibold text-slate-600 mb-1">Impacted Jobs at this Station</p>
                        {(() => {
                          const stationJobs = allJobs.filter(j => selectedStation.peggedJobs.includes(j.id))
                            .map(j => {
                              const slack = Math.round((new Date(j.requiredDate).getTime() - new Date(j.plannedFinish).getTime()) / 86400000)
                              const capGate: "Ready" | "Watch" | "Blocked" = slack >= 5 ? "Ready" : slack >= 0 ? "Watch" : "Blocked"
                              return { ...j, slack, capGate }
                            })
                            .sort((a, b) => a.slack - b.slack)
                          if (stationJobs.length === 0) return <p className="text-[9px] text-slate-400 text-center py-3">No jobs at this station.</p>
                          return (
                            <Table>
                              <TableHeader className="bg-slate-50">
                                <TableRow>
                                  <TableHead className="text-[8px] font-semibold text-slate-600">Job</TableHead>
                                  <TableHead className="text-[8px] font-semibold text-slate-600">Program</TableHead>
                                  <TableHead className="text-[8px] font-semibold text-slate-600">Required</TableHead>
                                  <TableHead className="text-[8px] font-semibold text-slate-600 text-right">Priority</TableHead>
                                  <TableHead className="text-[8px] font-semibold text-slate-600 text-right">Slip</TableHead>
                                  <TableHead className="text-[8px] font-semibold text-slate-600">Cap Gate</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {stationJobs.map(j => (
                                  <TableRow key={j.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => { setDrawerJob(j); setDrawerTab("capacity") }}>
                                    <TableCell className="text-[9px] text-[#8B0000] font-bold">{j.id.replace("JOB-2026-", "")}</TableCell>
                                    <TableCell className="text-[9px] text-slate-700">{j.program}</TableCell>
                                    <TableCell className="text-[9px] text-slate-600">{j.requiredDate.replace("2026-", "")}</TableCell>
                                    <TableCell className="text-[9px] text-right font-medium">{j.businessPriority}</TableCell>
                                    <TableCell className={`text-[9px] text-right font-bold ${j.slipDays > 0 ? "text-red-600" : "text-green-600"}`}>{j.slipDays > 0 ? `+${j.slipDays}d` : "0d"}</TableCell>
                                    <TableCell>
                                      <Badge className={`text-[7px] ${j.capGate === "Ready" ? "bg-green-100 text-green-700" : j.capGate === "Watch" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                                        {j.capGate} ({j.slack}d)
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )
                        })()}
                      </div>

                      {/* Recommended Levers */}
                      <div>
                        <p className="text-[10px] font-semibold text-slate-600 mb-1">Recommended Recovery Levers</p>
                        <div className="space-y-1">
                          {[
                            ...(selectedStation.otAvail ? [{ lever: "Add OT / Extra Shift", desc: `Add ${selectedStation.shifts === 1 ? "weekend" : "3rd"} shift to gain ~${selectedStation.availHrs7d / selectedStation.shifts / 5 * 2}h/wk`, severity: "high", feasible: true }] : []),
                            ...(selectedStation.crossTrainEligible.length > 0 ? [{ lever: "Cross-Train Labor Move", desc: `Move trained operators from ${selectedStation.crossTrainEligible.join(", ")}`, severity: "high", feasible: true }] : []),
                            ...(selectedStation.altRouting ? [{ lever: "Alternate Routing", desc: `Re-route to ${selectedStation.altRouting} (utilization: ${capacityStations.find(s => s.workcenter === selectedStation.altRouting)?.utilPct || "?"}%)`, severity: "med", feasible: true }] : []),
                            { lever: "Re-Sequence Priorities", desc: "Move highest-priority jobs earlier, push lower-priority jobs out", severity: "med", feasible: true },
                            { lever: "Split Lots", desc: "Break large lots into smaller runs to parallelize across shifts", severity: "low", feasible: selectedStation.wipJobs > 2 },
                            { lever: "Outsource Step", desc: "Send overflow work to qualified 3PL or subcontractor", severity: "low", feasible: true },
                          ].map((l, i) => (
                            <div key={i} className={`flex items-start gap-2 p-2 border rounded ${l.feasible ? (l.severity === "high" ? "border-green-200 bg-green-50/50" : l.severity === "med" ? "border-amber-200 bg-amber-50/50" : "border-slate-200") : "border-slate-200 opacity-50"}`}>
                              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${l.severity === "high" ? "bg-green-500" : l.severity === "med" ? "bg-amber-500" : "bg-slate-400"}`}></div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-medium text-slate-800">{l.lever}</p>
                                <p className="text-[9px] text-slate-500">{l.desc}</p>
                              </div>
                              {!l.feasible && <Badge className="text-[7px] bg-slate-100 text-slate-500">N/A</Badge>}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Station metadata */}
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                        <p className="text-[10px] font-semibold text-slate-600 mb-1">Station Details</p>
                        <div className="grid grid-cols-2 gap-2 text-[9px]">
                          <div><span className="text-slate-400">Owner:</span> <span className="font-medium text-slate-800">{selectedStation.owner}</span></div>
                          <div><span className="text-slate-400">Shifts:</span> <span className="font-medium text-slate-800">{selectedStation.shifts}</span></div>
                          <div><span className="text-slate-400">WIP Hours:</span> <span className="font-medium text-slate-800">{selectedStation.wipHrs}h</span></div>
                          <div><span className="text-slate-400">Avg Queue Age:</span> <span className="font-medium text-slate-800">{selectedStation.avgQueueAge.toFixed(1)}d</span></div>
                          <div><span className="text-slate-400">First Constraint:</span> <span className="font-medium text-red-600">{selectedStation.firstConstraintDate?.replace("2026-", "") || "None"}</span></div>
                          <div><span className="text-slate-400">Alt Routing:</span> <span className="font-medium text-slate-800">{selectedStation.altRouting || "None"}</span></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* BOTTLENECK LIST VIEW */}
          {capViewMode === "bottleneck" && (
            <Card className="border-slate-200">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-bold">Bottleneck List - Ranked by Impact</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="border-b border-slate-200">
                      <TableHead className="text-[9px] font-semibold text-slate-600">Station</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600 text-right">Utilization</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600 text-right">Shortfall</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600">First Constraint</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600 text-right">Jobs Impacted</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600 text-right">Max Delay</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600">Earliest Req Date</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600">Best Lever</TableHead>
                      <TableHead className="text-[9px] font-semibold text-slate-600">Owner</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...visibleStations].sort((a, b) => {
                      const impactA = (a.reqHrs7d - a.availHrs7d) * a.jobsImpacted * (a.maxDelay || 1)
                      const impactB = (b.reqHrs7d - b.availHrs7d) * b.jobsImpacted * (b.maxDelay || 1)
                      return impactB - impactA
                    }).map(s => {
                      const shortfall = Math.max(s.reqHrs7d - s.availHrs7d, 0)
                      const stationJobs = allJobs.filter(j => s.peggedJobs.includes(j.id))
                      const earliestReq = stationJobs.sort((a, b) => a.requiredDate.localeCompare(b.requiredDate))[0]
                      const bestLever = s.otAvail ? "Add OT/Shift" : s.altRouting ? "Alternate Routing" : s.crossTrainEligible.length > 0 ? "Cross-Train Move" : "Re-Sequence"
                      return (
                        <TableRow key={s.id} className={`cursor-pointer transition-colors ${selectedStation?.id === s.id ? "bg-blue-50" : "hover:bg-slate-50"}`} onClick={() => { setCapViewMode("workflow"); setSelectedStation(s) }}>
                          <TableCell className="text-[10px] font-medium text-[#8B0000]">{s.id} {s.name}</TableCell>
                          <TableCell className={`text-[10px] text-right font-bold ${s.utilPct > 130 ? "text-red-600" : s.utilPct > 100 ? "text-amber-600" : "text-green-600"}`}>{s.utilPct}%</TableCell>
                          <TableCell className={`text-[10px] text-right font-bold ${shortfall > 0 ? "text-red-600" : "text-green-600"}`}>{shortfall > 0 ? `${shortfall}h` : "-"}</TableCell>
                          <TableCell className="text-[10px] text-slate-600">{s.firstConstraintDate?.replace("2026-", "") || "-"}</TableCell>
                          <TableCell className="text-[10px] text-right font-medium">{s.jobsImpacted}</TableCell>
                          <TableCell className={`text-[10px] text-right font-medium ${s.maxDelay > 0 ? "text-red-600" : "text-slate-600"}`}>{s.maxDelay > 0 ? `${s.maxDelay}d` : "-"}</TableCell>
                          <TableCell className="text-[10px] text-slate-600">{earliestReq?.requiredDate.replace("2026-", "") || "-"}</TableCell>
                          <TableCell><Badge className="text-[8px] bg-blue-100 text-blue-700">{bestLever}</Badge></TableCell>
                          <TableCell className="text-[10px] text-slate-600">{s.owner}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Aggregate Capacity Chart (always visible below) */}
          <Card className="border-slate-200">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-bold">All Stations: Planned Load vs Available ({capTimeBucket === "daily" ? "7-Day" : "14-Day"})</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={visibleStations} margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="id" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} label={{ value: "Hours", angle: -90, position: "insideLeft", fontSize: 9 }} />
                  <Tooltip contentStyle={{ fontSize: 10 }} formatter={(v: number, name: string) => [`${v}h`, name]} />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                  <Bar dataKey={capTimeBucket === "daily" ? "availHrs7d" : "availHrs14d"} fill="#86efac" name={`Available (${capTimeBucket === "daily" ? "7d" : "14d"})`} radius={[3, 3, 0, 0]} />
                  <Bar dataKey={capTimeBucket === "daily" ? "reqHrs7d" : "reqHrs14d"} fill="#8B0000" name={`Required (${capTimeBucket === "daily" ? "7d" : "14d"})`} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
        )
      })()}

      {/* ==================== DETAIL DRAWER ==================== */}
      {drawerJob && (() => {
        const drawerBuf = bufferDays(getBaselineDate(drawerJob, demandBaseline), drawerJob.earliestFeasibleClear)
        const drawerGates = drawerJob.gateStatus
        const allGatesPassing = Object.values(drawerGates).every(g => g.status === "Pass")
        const failingGates = Object.entries(drawerGates).filter(([, g]) => g.status === "Fail")
        const watchGates = Object.entries(drawerGates).filter(([, g]) => g.status === "Watch")
        const latestClear = Object.values(drawerGates).map(g => g.clearDate).sort().pop() || drawerJob.earliestFeasibleClear
        return (
        <div className="fixed inset-y-0 right-0 w-[520px] bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col">
          {/* Enhanced Drawer Header */}
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#8B0000]">{drawerJob.id}</h3>
                <Badge className={`text-[9px] ${statusColor(drawerJob.readinessStatus)}`}>{drawerJob.readinessStatus} ({drawerJob.readinessScore})</Badge>
                {drawerJob.dpas && <Badge className="text-[8px] bg-red-100 text-red-700">{drawerJob.dpas}</Badge>}
              </div>
              <button onClick={() => setDrawerJob(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 2-row identity block */}
            <div className="grid grid-cols-4 gap-2 text-[10px] mb-2">
              <div><p className="text-slate-400">Program</p><p className="font-medium text-slate-800">{drawerJob.program}</p></div>
              <div><p className="text-slate-400">CLIN</p><p className="font-medium text-slate-800">{drawerJob.clin}</p></div>
              <div><p className="text-slate-400">Project</p><p className="font-medium text-slate-800 truncate">{drawerJob.project.split(" ").slice(1).join(" ")}</p></div>
              <div><p className="text-slate-400">Release Rank</p><p className="font-medium text-slate-800">#{filteredJobs.findIndex(j => j.id === drawerJob.id) + 1}</p></div>
            </div>

            {/* Date stack mini */}
            <div className="flex items-center gap-4 text-[9px] mb-2 p-2 bg-white/60 rounded border border-slate-100">
              <span className="text-slate-400 font-medium">Dates:</span>
              {[
                { label: "Contract", date: drawerJob.contractDate },
                { label: "IOP", date: drawerJob.iopDate },
                { label: "PDM", date: drawerJob.pdmForecastDate },
                { label: "Clear", date: drawerJob.earliestFeasibleClear },
              ].map(d => {
                const drift = bufferDays(drawerJob.contractDate, d.date)
                return (
                  <span key={d.label} className="flex items-center gap-0.5">
                    <span className="text-slate-500">{d.label}:</span>
                    <span className="font-medium text-slate-700">{d.date.replace("2026-", "")}</span>
                    {d.label !== "Contract" && drift !== 0 && (
                      <span className={`text-[8px] ${drift < 0 ? "text-red-500" : "text-green-500"}`}>({drift > 0 ? `+${drift}` : drift})</span>
                    )}
                  </span>
                )
              })}
              <span className={`font-bold ${drawerBuf < 0 ? "text-red-600" : drawerBuf <= 3 ? "text-amber-600" : "text-green-600"}`}>
                Buffer: {drawerBuf > 0 ? `+${drawerBuf}` : drawerBuf}d
              </span>
            </div>

            {/* Gate status dots + overall readiness bar */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-slate-400">Gates:</span>
                {(["materials", "mrb", "routing", "capacity", "supplier"] as const).map(g => (
                  <div key={g} className="flex items-center gap-0.5" title={`${g}: ${drawerGates[g].status} (${drawerGates[g].clearDate})`}>
                    <div className={`w-2.5 h-2.5 rounded-full ${gateColor(drawerGates[g].status)}`} />
                    <span className="text-[7px] text-slate-400">{g.slice(0, 3)}</span>
                  </div>
                ))}
              </div>
              <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${drawerJob.readinessScore >= 80 ? "bg-green-500" : drawerJob.readinessScore >= 50 ? "bg-amber-400" : "bg-red-500"}`} style={{ width: `${drawerJob.readinessScore}%` }} />
              </div>
              <span className="text-[10px] font-bold text-slate-700">{drawerJob.readinessScore}/100</span>
              <Badge className="text-[8px] bg-slate-100 text-slate-700">Pri: {drawerJob.businessPriority}</Badge>
            </div>

            {/* Gate alerts */}
            {!allGatesPassing && (
              <div className="mt-2 flex items-center gap-1 flex-wrap">
                {failingGates.map(([name]) => (
                  <Badge key={name} className="text-[8px] bg-red-100 text-red-700">{name} FAIL</Badge>
                ))}
                {watchGates.map(([name]) => (
                  <Badge key={name} className="text-[8px] bg-amber-100 text-amber-700">{name} WATCH</Badge>
                ))}
              </div>
            )}
          </div>

          {/* Drawer Sub-tabs */}
          <div className="flex gap-0.5 p-2 bg-slate-100 overflow-x-auto">
            {[
              { id: "summary", label: "Summary" },
              { id: "materials", label: "Materials" },
              { id: "quality", label: "Quality/MRB" },
              { id: "routing", label: "Routing" },
              { id: "shelf-life", label: "Shelf-Life" },
              { id: "capacity", label: "Capacity" },
              { id: "actions", label: "Actions" },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setDrawerTab(t.id)}
                className={`px-2.5 py-1.5 text-[10px] font-medium rounded whitespace-nowrap ${drawerTab === t.id ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-4">
            {drawerTab === "summary" && (() => {
              const gs = drawerJob.gateStatus
              const buf = bufferDays(getBaselineDate(drawerJob, demandBaseline), drawerJob.earliestFeasibleClear)
              const gateEntries: { key: string; label: string; gate: typeof gs.materials; score: number; max: number; color: string }[] = [
                { key: "materials", label: "Materials", gate: gs.materials, score: drawerJob.materialsScore, max: 40, color: "bg-blue-500" },
                { key: "mrb", label: "Quality/MRB", gate: gs.mrb, score: drawerJob.qualityScore, max: 20, color: "bg-purple-500" },
                { key: "routing", label: "Routing", gate: gs.routing, score: 0, max: 0, color: "bg-indigo-500" },
                { key: "capacity", label: "Capacity", gate: gs.capacity, score: drawerJob.capacityScore, max: 20, color: "bg-cyan-500" },
                { key: "supplier", label: "Supplier", gate: gs.supplier, score: drawerJob.supplierScore, max: 10, color: "bg-amber-500" },
              ]
              return (
              <div className="space-y-4">
                {/* Decision Summary */}
                <div className={`p-3 rounded border ${buf >= 5 ? "bg-green-50 border-green-200" : buf >= 0 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] font-bold text-slate-800">
                      Release Decision: <Badge className={`text-[9px] ml-1 ${drawerJob.readinessStatus === "Ready" ? "bg-green-100 text-green-700" : drawerJob.readinessStatus === "Watch" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                        {drawerJob.readinessStatus === "Ready" ? "Release Now" : drawerJob.readinessStatus === "Watch" ? "Hold - Near Ready" : "Blocked - Intervention Required"}
                      </Badge>
                    </p>
                    <span className={`text-[11px] font-bold ${buf < 0 ? "text-red-600" : buf <= 3 ? "text-amber-600" : "text-green-600"}`}>Buffer: {buf > 0 ? `+${buf}` : buf}d</span>
                  </div>
                  <p className="text-[9px] text-slate-600">
                    {drawerJob.readinessStatus === "Ready"
                      ? "All critical gates passing. Job is clear for floor release."
                      : `Primary blocker: ${drawerJob.primaryBlocker}. Next action: ${drawerJob.nextAction}`
                    }
                  </p>
                </div>

                {/* Gate Matrix */}
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-2">Gate Status Matrix</p>
                  <div className="space-y-1.5">
                    {gateEntries.map(g => {
                      const gb = bufferDays(drawerJob.contractDate, g.gate.clearDate)
                      return (
                        <div key={g.key} className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full shrink-0 ${gateColor(g.gate.status)}`} />
                          <span className="text-[10px] text-slate-600 w-[70px]">{g.label}</span>
                          <Badge className={`text-[8px] w-[50px] text-center ${g.gate.status === "Pass" ? "bg-green-100 text-green-700" : g.gate.status === "Watch" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{g.gate.status}</Badge>
                          <span className="text-[9px] text-slate-500 w-[65px]">Clear: {g.gate.clearDate.replace("2026-", "")}</span>
                          {g.max > 0 && (
                            <div className="flex-1 h-4 bg-slate-100 rounded relative">
                              <div className={`h-full ${g.color} rounded`} style={{ width: `${(g.score / g.max) * 100}%` }} />
                            </div>
                          )}
                          {g.max > 0 && <span className="text-[9px] font-bold text-slate-700 w-[40px] text-right">{g.score}/{g.max}</span>}
                          {g.max === 0 && <div className="flex-1" />}
                          <span className={`text-[8px] font-medium w-[30px] text-right ${gb < 0 ? "text-red-500" : "text-green-500"}`}>{gb > 0 ? `+${gb}` : gb}d</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Readiness Waterfall */}
                {(() => {
                  // 5 gates with CORRECT max values matching the data model (40+20+20+10+10 = 100)
                  const gates = [
                    { key: "materials", label: "Materials", max: 40, score: drawerJob.materialsScore, tab: "materials" },
                    { key: "mrb", label: "Quality / MRB", max: 20, score: drawerJob.qualityScore, tab: "quality" },
                    { key: "capacity", label: "Capacity", max: 20, score: drawerJob.capacityScore, tab: "capacity" },
                    { key: "supplier", label: "Supplier", max: 10, score: drawerJob.supplierScore, tab: "materials" },
                    { key: "shelfLife", label: "Shelf-Life", max: 10, score: drawerJob.shelfLifeScore, tab: "shelf-life" },
                  ]

                  // Reason lines derived from actual job fields
                  const reasonFor = (g: typeof gates[0]): string => {
                    const penalty = g.max - g.score
                    if (g.key === "materials") {
                      const parts = drawerJob.gatingParts
                      if (penalty === 0) return "All material available; no gating parts"
                      if (parts.length === 0) return `Score ${g.score}/${g.max}`
                      const short = parts.filter(p => p.shortageDate !== "None")
                      if (short.length > 0) return `${short[0].part} shortage ${short[0].shortageDate}; need ${short[0].needQty}, avail ${short[0].netAvail}`
                      const worst = [...parts].sort((a, b) => (a.netAvail - a.needQty) - (b.netAvail - b.needQty))[0]
                      return `${worst.part} avail ${worst.netAvail} vs need ${worst.needQty}; slack ${worst.netAvail - worst.needQty}`
                    }
                    if (g.key === "mrb") {
                      if (penalty === 0) return "No MRB holds"
                      const holds = drawerJob.mrbHolds
                      if (holds.length === 0) return `Gate ${drawerJob.gateStatus.mrb.status}; score ${g.score}/${g.max}`
                      const worst = [...holds].sort((a, b) => b.age - a.age)[0]
                      return `${worst.id} ${worst.part} ${worst.stage} age ${worst.age}d; blocks ${worst.blocks}; ETA ${worst.clearETA.replace("2026-", "")}`
                    }
                    if (g.key === "capacity") {
                      const cd = drawerJob.capacityDetail
                      const shortfall = Math.max(cd.reqHrs - cd.availHrs, 0)
                      if (penalty === 0) return `${cd.workcenter} avail ${cd.availHrs}h vs req ${cd.reqHrs}h`
                      if (shortfall > 0) return `${cd.workcenter} shortfall ${shortfall}h (${cd.reqHrs}h req / ${cd.availHrs}h avail); next slot ${cd.nextSlot}`
                      return `${cd.workcenter} next slot ${cd.nextSlot}; score ${g.score}/${g.max}`
                    }
                    if (g.key === "supplier") {
                      const gs = drawerJob.gateStatus.supplier
                      if (penalty === 0) return "All supplier commitments on track"
                      const short = drawerJob.gatingParts.filter(p => p.shortageDate !== "None")
                      if (short.length > 0) return `${short[0].part} supplier promise ${short[0].shortageDate} vs need ${short[0].needDate}`
                      return `Gate ${gs.status}; clear ${gs.clearDate.replace("2026-", "")}`
                    }
                    if (g.key === "shelfLife") {
                      if (penalty === 0) return "No shelf-life concerns"
                      const lots = drawerJob.shelfLifeLots
                      const flagged = lots.filter(l => l.flagged)
                      if (flagged.length > 0) return `${flagged[0].lot} (${flagged[0].part}) expires ${flagged[0].expiry.replace("2026-", "")} before use ${flagged[0].plannedUse.replace("2026-", "")}`
                      return `Score ${g.score}/${g.max}`
                    }
                    return ""
                  }

                  // Build waterfall steps
                  let running = 100
                  const steps = gates.map(g => {
                    const penalty = Math.max(g.max - g.score, 0) // clamp: score can't exceed max
                    running -= penalty
                    return { ...g, penalty, running, reason: reasonFor(g) }
                  })
                  const finalScore = steps[steps.length - 1].running
                  const chartH = 140 // px height for bars

                  return (
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-slate-700">Readiness Waterfall</p>
                      <span className={`text-sm font-bold ${finalScore >= 80 ? "text-green-600" : finalScore >= 60 ? "text-amber-600" : "text-red-600"}`}>
                        {finalScore}<span className="text-[10px] text-slate-400 font-normal">/100</span>
                      </span>
                    </div>

                    {/* SVG Waterfall Chart */}
                    <svg viewBox={`0 0 340 ${chartH + 36}`} className="w-full" style={{ maxHeight: 200 }}>
                      {/* Grid lines */}
                      {[0, 25, 50, 75, 100].map(v => {
                        const y = 14 + (chartH * (1 - v / 100))
                        return (
                          <g key={v}>
                            <line x1="28" y1={y} x2="330" y2={y} stroke="#e2e8f0" strokeDasharray="3 2" />
                            <text x="25" y={y + 3} textAnchor="end" fontSize="7" fill="#94a3b8">{v}</text>
                          </g>
                        )
                      })}

                      {/* Start bar */}
                      {(() => {
                        const bx = 36
                        const bw = 32
                        const bh = chartH
                        const by = 14
                        return (
                          <g>
                            <rect x={bx} y={by} width={bw} height={bh} rx="2" fill="#16a34a" />
                            <text x={bx + bw / 2} y={by - 3} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#1e293b">100</text>
                            <text x={bx + bw / 2} y={14 + chartH + 12} textAnchor="middle" fontSize="8" fill="#64748b">Start</text>
                          </g>
                        )
                      })()}

                      {/* Gate bars */}
                      {steps.map((s, i) => {
                        const bx = 78 + i * 42
                        const bw = 32
                        const topY = 14 + chartH * (1 - (s.running + s.penalty) / 100)
                        const botY = 14 + chartH * (1 - s.running / 100)
                        const bh = Math.max(botY - topY, 2)
                        const col = s.penalty === 0 ? "#d1d5db" : s.penalty <= 2 ? "#f59e0b" : s.penalty <= 5 ? "#f97316" : "#dc2626"
                        // Connector line from previous bar bottom to this bar top
                        const prevBot = i === 0
                          ? 14 // Start bar top
                          : 14 + chartH * (1 - steps[i - 1].running / 100)
                        return (
                          <g key={s.key} className="cursor-pointer" onClick={() => setDrawerTab(s.tab)}>
                            {/* Connector */}
                            <line x1={i === 0 ? 68 : 78 + (i - 1) * 42 + bw} y1={prevBot} x2={bx} y2={prevBot} stroke="#cbd5e1" strokeDasharray="2 2" />
                            {/* Bar */}
                            <rect x={bx} y={topY} width={bw} height={bh} rx="2" fill={col} opacity="0.9" />
                            {/* Penalty label */}
                            {s.penalty > 0 && (
                              <text x={bx + bw / 2} y={topY - 3} textAnchor="middle" fontSize="8" fontWeight="bold" fill="#dc2626">{`\u2212${s.penalty}`}</text>
                            )}
                            {s.penalty === 0 && (
                              <text x={bx + bw / 2} y={topY - 3} textAnchor="middle" fontSize="7" fill="#16a34a">0</text>
                            )}
                            {/* Running total small */}
                            <text x={bx + bw / 2} y={topY - 12} textAnchor="middle" fontSize="7" fill="#64748b">{s.running}</text>
                            {/* X label */}
                            <text x={bx + bw / 2} y={14 + chartH + 12} textAnchor="middle" fontSize="7" fill="#64748b">{s.label.length > 8 ? s.label.slice(0, 7) + ".." : s.label}</text>
                          </g>
                        )
                      })}

                      {/* End bar */}
                      {(() => {
                        const bx = 78 + steps.length * 42
                        const bw = 32
                        const bh = chartH * (finalScore / 100)
                        const by = 14 + chartH - bh
                        const col = finalScore >= 80 ? "#16a34a" : finalScore >= 60 ? "#f59e0b" : "#dc2626"
                        // Connector from last gate
                        const lastBot = 14 + chartH * (1 - steps[steps.length - 1].running / 100)
                        return (
                          <g>
                            <line x1={78 + (steps.length - 1) * 42 + 32} y1={lastBot} x2={bx} y2={lastBot} stroke="#cbd5e1" strokeDasharray="2 2" />
                            <rect x={bx} y={by} width={bw} height={bh} rx="2" fill={col} />
                            <text x={bx + bw / 2} y={by - 3} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#1e293b">{finalScore}</text>
                            <text x={bx + bw / 2} y={14 + chartH + 12} textAnchor="middle" fontSize="8" fill="#64748b">Final</text>
                          </g>
                        )
                      })()}
                    </svg>

                    {/* Gate Explanation Table */}
                    <div className="mt-2 border border-slate-200 rounded overflow-hidden">
                      <div className="grid grid-cols-[72px_44px_40px_1fr] bg-slate-50 border-b border-slate-200">
                        <div className="px-2 py-1 text-[8px] font-semibold text-slate-500 uppercase">Gate</div>
                        <div className="px-1 py-1 text-[8px] font-semibold text-slate-500 uppercase text-center">Score</div>
                        <div className="px-1 py-1 text-[8px] font-semibold text-slate-500 uppercase text-center">Total</div>
                        <div className="px-2 py-1 text-[8px] font-semibold text-slate-500 uppercase">Reason</div>
                      </div>
                      {steps.map((s, i) => (
                        <div
                          key={s.key}
                          className={`grid grid-cols-[72px_44px_40px_1fr] items-center cursor-pointer hover:bg-slate-50/80 transition-colors ${i < steps.length - 1 ? "border-b border-slate-100" : ""}`}
                          onClick={() => setDrawerTab(s.tab)}
                        >
                          <div className="px-2 py-1.5 flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${s.penalty === 0 ? "bg-green-500" : s.penalty <= 2 ? "bg-amber-400" : s.penalty <= 5 ? "bg-orange-500" : "bg-red-500"}`} />
                            <span className="text-[9px] font-medium text-slate-800">{s.label}</span>
                          </div>
                          <div className="px-1 py-1.5 text-center">
                            <span className={`text-[10px] font-bold ${s.penalty === 0 ? "text-green-600" : "text-red-600"}`}>
                              {s.score}/{s.max}
                            </span>
                          </div>
                          <div className="px-1 py-1.5 text-center">
                            <span className="text-[10px] font-bold text-slate-700">{s.running}</span>
                          </div>
                          <div className="px-2 py-1.5">
                            <button
                              className="text-[9px] text-slate-600 leading-tight hover:text-blue-600 hover:underline text-left"
                              onClick={(e) => { e.stopPropagation(); setDrawerTab(s.tab) }}
                            >
                              {s.reason}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  )
                })()}

                {/* Identity details */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                  <p className="text-[10px] font-semibold text-slate-600 mb-1">Job Identity</p>
                  <div className="grid grid-cols-2 gap-2 text-[9px]">
                    <div><span className="text-slate-400">CLIN:</span> <span className="font-medium text-slate-800">{drawerJob.clin}</span></div>
                    <div><span className="text-slate-400">DPAS:</span> <span className="font-medium text-slate-800">{drawerJob.dpas || "None"}</span></div>
                    <div><span className="text-slate-400">Product Family:</span> <span className="font-medium text-slate-800">{drawerJob.productFamily}</span></div>
                    <div><span className="text-slate-400">Value:</span> <span className="font-medium text-slate-800">{fmtMoney(drawerJob.value)}</span></div>
                    <div><span className="text-slate-400">Confidence:</span> <span className={`font-medium ${drawerJob.confidence === "High" ? "text-green-600" : drawerJob.confidence === "Med" ? "text-amber-600" : "text-red-600"}`}>{drawerJob.confidence}</span></div>
                    <div><span className="text-slate-400">Biz Priority:</span> <span className="font-medium text-slate-800">{drawerJob.businessPriority}</span></div>
                  </div>
                </div>
              </div>
              )
            })()}

            {drawerTab === "materials" && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-700">Top Gating Parts</p>
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-[10px] font-semibold">Part</TableHead>
                      <TableHead className="text-[10px] font-semibold text-right">Net Avail</TableHead>
                      <TableHead className="text-[10px] font-semibold text-right">Need Qty</TableHead>
                      <TableHead className="text-[10px] font-semibold">Need Date</TableHead>
                      <TableHead className="text-[10px] font-semibold">Shortage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drawerJob.gatingParts.map(p => (
                      <TableRow key={p.part}>
                        <TableCell className="text-[10px] text-[#8B0000] font-medium">{p.part}</TableCell>
                        <TableCell className={`text-[10px] text-right font-medium ${p.netAvail < p.needQty ? "text-red-600" : "text-green-600"}`}>{p.netAvail}</TableCell>
                        <TableCell className="text-[10px] text-right">{p.needQty}</TableCell>
                        <TableCell className="text-[10px]">{p.needDate}</TableCell>
                        <TableCell className="text-[10px]">
                          {p.shortageDate === "None" ? <Badge className="text-[8px] bg-green-100 text-green-700">None</Badge> : <Badge className="text-[8px] bg-red-100 text-red-700">{p.shortageDate}</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {drawerTab === "quality" && (() => {
              const jobMrbs = drawerJob.mrbHolds.map(h => {
                const slack = Math.round((new Date(drawerJob.requiredDate).getTime() - new Date(h.clearETA).getTime()) / 86400000)
                const fullMrb = mrbData.find(m => m.id === h.id || m.part === h.part)
                return { ...h, slack, fullMrb }
              }).sort((a, b) => a.slack - b.slack)
              const worstMrb = jobMrbs[0]

              return (
              <div className="space-y-3">
                {/* B) Summary Banner */}
                {worstMrb && (
                  <div className={`p-3 rounded border ${worstMrb.slack < 0 ? "bg-red-50 border-red-200" : worstMrb.slack <= 5 ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}>
                    <p className="text-[11px] font-bold text-slate-800">
                      This job is blocked by <span className="text-purple-700">{worstMrb.id}</span> (Part: <span className="text-[#8B0000]">{worstMrb.part}</span>).
                      Required date: <span className="font-bold">{drawerJob.requiredDate.replace("2026-", "")}</span>.
                      Current clear ETA: <span className="font-bold">{worstMrb.clearETA.replace("2026-", "")}</span>.
                      Slack: <span className={`font-bold ${worstMrb.slack < 0 ? "text-red-600" : worstMrb.slack <= 5 ? "text-amber-600" : "text-green-600"}`}>{worstMrb.slack}d</span>.
                    </p>
                    {worstMrb.slack < 0 && (
                      <p className="text-[10px] text-red-700 font-semibold mt-1">Will miss required date unless lever changes.</p>
                    )}
                  </div>
                )}

                {/* A) MRB Blockers Table */}
                {drawerJob.mrbHolds.length === 0 ? (
                  <div className="text-center py-6">
                    <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <p className="text-[11px] text-green-700 font-medium">No MRB holds for this job</p>
                    <p className="text-[10px] text-slate-400">Quality/MRB gate: Ready</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-slate-700">MRB Blockers for this Job</p>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-purple-50/50">
                          <TableRow>
                            <TableHead className="text-[8px] font-semibold text-purple-700">MRB ID</TableHead>
                            <TableHead className="text-[8px] font-semibold text-purple-700">Part</TableHead>
                            <TableHead className="text-[8px] font-semibold text-purple-700">Lot</TableHead>
                            <TableHead className="text-[8px] font-semibold text-purple-700 text-right">Qty</TableHead>
                            <TableHead className="text-[8px] font-semibold text-purple-700">Location</TableHead>
                            <TableHead className="text-[8px] font-semibold text-purple-700">Stage</TableHead>
                            <TableHead className="text-[8px] font-semibold text-purple-700 text-right">Age</TableHead>
                            <TableHead className="text-[8px] font-semibold text-purple-700">Disposition</TableHead>
                            <TableHead className="text-[8px] font-semibold text-purple-700">Clear ETA</TableHead>
                            <TableHead className="text-[8px] font-semibold text-purple-700 text-right">Slack</TableHead>
                            <TableHead className="text-[8px] font-semibold text-purple-700">Lever</TableHead>
                            <TableHead className="text-[8px] font-semibold text-purple-700">Owner</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {jobMrbs.map(h => {
                            const slaBreached = h.age > h.sla
                            return (
                              <TableRow
                                key={h.id}
                                className={`cursor-pointer transition-colors ${selectedMrbId === h.id ? "bg-purple-50" : "hover:bg-slate-50"}`}
                                onClick={() => { setSelectedMrbId(prev => prev === h.id ? null : h.id); setMrbDetailOpen(true) }}
                              >
                                <TableCell className="text-[9px] text-purple-700 font-bold underline decoration-dotted">{h.id}</TableCell>
                                <TableCell className="text-[9px] text-slate-700">{h.part}</TableCell>
                                <TableCell className="text-[9px] text-slate-600">{h.lot}</TableCell>
                                <TableCell className="text-[9px] text-right">{h.qty}</TableCell>
                                <TableCell className="text-[9px] text-slate-600">{h.location}</TableCell>
                                <TableCell>
                                  <Badge className={`text-[7px] ${slaBreached ? "bg-red-100 text-red-700" : "bg-purple-100 text-purple-700"}`}>
                                    {h.stage} {slaBreached && `(+${h.age - h.sla}d SLA)`}
                                  </Badge>
                                </TableCell>
                                <TableCell className={`text-[9px] text-right font-medium ${slaBreached ? "text-red-600" : "text-slate-700"}`}>{h.age}d</TableCell>
                                <TableCell className="text-[9px] text-slate-600">{h.disposition}</TableCell>
                                <TableCell className="text-[9px] text-slate-700 font-medium">{h.clearETA.replace("2026-", "")}</TableCell>
                                <TableCell className={`text-[9px] text-right font-bold ${h.slack < 0 ? "text-red-600" : h.slack <= 5 ? "text-amber-600" : "text-green-600"}`}>{h.slack}d</TableCell>
                                <TableCell className="text-[9px] text-slate-600 max-w-[80px] truncate">{h.fullMrb?.lever || h.disposition}</TableCell>
                                <TableCell className="text-[9px] text-slate-600">{h.owner}</TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* C) Recovery Options for selected MRB */}
                    {selectedMrbId && (() => {
                      const sel = jobMrbs.find(h => h.id === selectedMrbId)
                      if (!sel) return null
                      const slack = sel.slack

                      const levers = [
                        { lever: "Expedite Disposition", eta: "2-3 days", canSave: slack >= -3, desc: "Fast-track MRB review board decision", risk: "Low" },
                        { lever: "Rework + Retest", eta: "5-7 days", canSave: slack >= -7, desc: `Rework ${sel.qty} units and revalidate against spec`, risk: "Medium" },
                        { lever: "Use-As-Is Deviation", eta: "1-2 days", canSave: true, desc: "Engineering disposition to accept with deviation waiver", risk: "Medium - requires customer notification" },
                        { lever: "Replacement Buy", eta: "10-14 days", canSave: slack >= -14, desc: `Purchase replacement qty ${sel.qty} from approved source`, risk: "Low but long lead" },
                        { lever: "Alternate Lot/Part Swap", eta: "2-4 days", canSave: slack >= -4, desc: "Swap to alternate approved lot or equivalent part", risk: "Low if pre-qualified" },
                        { lever: "Re-Sequence Job", eta: "0 days", canSave: true, desc: "Move job to later slot, accept schedule shift", risk: "Schedule impact to other jobs" },
                      ]

                      const canSaveLevers = levers.filter(l => l.canSave)
                      const cannotSaveLevers = levers.filter(l => !l.canSave)

                      return (
                        <div className="space-y-2 mt-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-700">Recovery Options for {sel.id}</p>
                            <Badge className={`text-[8px] ${slack < 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                              Slack: {slack}d
                            </Badge>
                          </div>

                          {canSaveLevers.length > 0 && (
                            <div>
                              <p className="text-[10px] font-semibold text-green-700 mb-1">Can save this job (inside need window)</p>
                              <div className="space-y-1">
                                {canSaveLevers.map((l, i) => (
                                  <div key={i} className="flex items-start gap-2 p-2 border border-green-200 bg-green-50/50 rounded">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0"></div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-medium text-slate-800">{l.lever}</span>
                                        <span className="text-[9px] text-slate-500">{l.eta}</span>
                                      </div>
                                      <p className="text-[9px] text-slate-500">{l.desc}</p>
                                      <p className="text-[8px] text-amber-600">Risk: {l.risk}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {cannotSaveLevers.length > 0 && (
                            <div>
                              <p className="text-[10px] font-semibold text-red-700 mb-1">Cannot save this job (outside window)</p>
                              <div className="space-y-1">
                                {cannotSaveLevers.map((l, i) => (
                                  <div key={i} className="flex items-start gap-2 p-2 border border-slate-200 bg-slate-50 rounded opacity-60">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0"></div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-medium text-slate-500">{l.lever}</span>
                                        <span className="text-[9px] text-slate-400">{l.eta}</span>
                                      </div>
                                      <p className="text-[9px] text-slate-400">{l.desc}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })()}

                    {/* D) Action Controls */}
                    {selectedMrbId && (() => {
                      const sel = jobMrbs.find(h => h.id === selectedMrbId)
                      if (!sel) return null
                      return (
                        <div className="space-y-2 mt-3 pt-3 border-t border-slate-200">
                          <p className="text-xs font-semibold text-slate-700">Action Controls</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-[9px] text-slate-500 mb-0.5">Owner</p>
                              <p className="text-[10px] font-medium text-slate-800 p-1.5 bg-slate-50 rounded border border-slate-200">{sel.owner}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-slate-500 mb-0.5">Next Action Date</p>
                              <p className="text-[10px] font-medium text-slate-800 p-1.5 bg-slate-50 rounded border border-slate-200">{sel.nextActionDate.replace("2026-", "")}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-500 mb-0.5">Status / Notes</p>
                            <p className="text-[10px] text-slate-700 p-1.5 bg-slate-50 rounded border border-slate-200">{sel.blocks}</p>
                          </div>
                          <Button className="w-full h-7 text-[10px] bg-purple-700 hover:bg-purple-800 text-white">
                            <ShieldAlert className="w-3 h-3 mr-1" /> Promote / Escalate MRB Blocker
                          </Button>
                        </div>
                      )
                    })()}

                    {/* MRB Detail Sub-Drawer (from MRB ID click) */}
                    {selectedMrbId && mrbDetailOpen && (() => {
                      const sel = jobMrbs.find(h => h.id === selectedMrbId)
                      const fullMrb = sel?.fullMrb || mrbData.find(m => m.id === selectedMrbId)
                      if (!fullMrb) return null

                      const mrbStages: MrbStage[] = ["Created", "Review", "Investigation", "Disposition", "Rework", "Verification", "Closed"]
                      const impactedJobObjs = allJobs.filter(j => fullMrb.peggedJobs.includes(j.id))

                      return (
                        <div className="mt-3 pt-3 border-t-2 border-purple-300">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-bold text-purple-800">MRB Detail: {fullMrb.id}</p>
                            <button className="text-[10px] text-purple-600 hover:underline" onClick={() => setMrbDetailOpen(false)}>Collapse</button>
                          </div>

                          {/* Timeline by stage */}
                          <div className="mb-3">
                            <p className="text-[10px] font-semibold text-slate-600 mb-2">Stage Timeline</p>
                            <div className="flex items-center gap-0">
                              {mrbStages.map((stg, si) => {
                                const tlEntry = fullMrb.timeline.find(t => t.stage === stg)
                                const isCurrent = stg === fullMrb.stage
                                const isCompleted = tlEntry?.exited !== null && tlEntry?.exited !== undefined
                                const isPending = !tlEntry
                                const slaBreached = tlEntry && !isCompleted && fullMrb.ageInStage > tlEntry.sla

                                return (
                                  <div key={stg} className="flex items-center">
                                    <div className="flex flex-col items-center">
                                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold border-2 ${
                                        isCurrent ? (slaBreached ? "bg-red-500 border-red-600 text-white" : "bg-purple-600 border-purple-700 text-white") :
                                        isCompleted ? "bg-green-500 border-green-600 text-white" :
                                        "bg-slate-200 border-slate-300 text-slate-400"
                                      }`}>
                                        {isCompleted ? "✓" : si + 1}
                                      </div>
                                      <span className={`text-[7px] mt-0.5 text-center w-12 leading-tight ${isCurrent ? "text-purple-700 font-bold" : isCompleted ? "text-green-600" : "text-slate-400"}`}>
                                        {stg}
                                      </span>
                                      {tlEntry && (
                                        <span className="text-[6px] text-slate-400">
                                          {isCurrent ? `${fullMrb.ageInStage}d/${tlEntry.sla}d SLA` : isCompleted ? `${Math.round((new Date(tlEntry.exited!).getTime() - new Date(tlEntry.entered).getTime()) / 86400000)}d` : ""}
                                        </span>
                                      )}
                                    </div>
                                    {si < mrbStages.length - 1 && (
                                      <div className={`h-0.5 w-3 mx-0.5 ${isCompleted ? "bg-green-400" : isCurrent ? "bg-purple-300" : "bg-slate-200"}`} />
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          {/* Impacted jobs */}
                          <div className="mb-3">
                            <p className="text-[10px] font-semibold text-slate-600 mb-1">Impacted Jobs / Deliverables</p>
                            <Table>
                              <TableHeader className="bg-purple-50/50">
                                <TableRow>
                                  <TableHead className="text-[8px] font-semibold text-purple-700">Job</TableHead>
                                  <TableHead className="text-[8px] font-semibold text-purple-700">Program</TableHead>
                                  <TableHead className="text-[8px] font-semibold text-purple-700">Required</TableHead>
                                  <TableHead className="text-[8px] font-semibold text-purple-700 text-right">Slack</TableHead>
                                  <TableHead className="text-[8px] font-semibold text-purple-700">Deliverable</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {impactedJobObjs.map(j => {
                                  const jSlack = Math.round((new Date(j.requiredDate).getTime() - new Date(fullMrb.clearETA).getTime()) / 86400000)
                                  return (
                                    <TableRow key={j.id} className="hover:bg-slate-50">
                                      <TableCell className="text-[9px] text-[#8B0000] font-medium">{j.id}</TableCell>
                                      <TableCell className="text-[9px] text-slate-700">{j.program}</TableCell>
                                      <TableCell className="text-[9px] text-slate-600">{j.requiredDate.replace("2026-", "")}</TableCell>
                                      <TableCell className={`text-[9px] text-right font-bold ${jSlack < 0 ? "text-red-600" : jSlack <= 5 ? "text-amber-600" : "text-green-600"}`}>{jSlack}d</TableCell>
                                      <TableCell className="text-[9px] text-slate-600">{fullMrb.deliverables[0] || "-"}</TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          </div>

                          {/* Recommended lever + action log */}
                          <div className="p-2.5 bg-purple-50 border border-purple-200 rounded">
                            <p className="text-[10px] font-semibold text-purple-800 mb-1">Recommended Lever</p>
                            <p className="text-[10px] text-purple-700">{fullMrb.lever}</p>
                            <div className="mt-2 pt-2 border-t border-purple-200">
                              <p className="text-[9px] font-semibold text-purple-700">Action Log</p>
                              <div className="space-y-1 mt-1">
                                <div className="flex items-center gap-2 text-[9px]">
                                  <span className="text-slate-400">{fullMrb.timeline[fullMrb.timeline.length - 1].entered.replace("2026-", "")}</span>
                                  <span className="text-slate-700">Entered {fullMrb.stage} stage. Owner: {fullMrb.owner}</span>
                                </div>
                                {fullMrb.timeline.length > 1 && (
                                  <div className="flex items-center gap-2 text-[9px]">
                                    <span className="text-slate-400">{fullMrb.timeline[0].entered.replace("2026-", "")}</span>
                                    <span className="text-slate-700">MRB created. Part: {fullMrb.part}, Qty: {fullMrb.qty}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </>
                )}
              </div>
              )
            })()}

            {drawerTab === "routing" && (() => {
              const rs = drawerJob.routingStatus
              const gates = drawerJob.gateStatus
              const routingGate = gates.routing.status
              const routingStations = capacityStations.filter(s =>
                drawerJob.workcenter.includes(s.id) || s.peggedJobs.includes(drawerJob.id)
              )
              // Build a simple routing path for this job through work centers
              const jobRoutingPath = [
                { op: 10, name: "SMT Placement", station: capacityStations.find(s => s.opSeq === 10 && s.peggedJobs.includes(drawerJob.id)) || capacityStations.find(s => s.opSeq === 10), status: "Complete" as const },
                { op: 20, name: "Sub-Assembly", station: capacityStations.find(s => s.opSeq >= 20 && s.opSeq < 30 && s.peggedJobs.includes(drawerJob.id)), status: "In Queue" as const },
                { op: 30, name: "Final Assembly", station: capacityStations.find(s => s.opSeq === 30 && s.peggedJobs.includes(drawerJob.id)), status: "Pending" as const },
                { op: 40, name: "Test / QA", station: capacityStations.find(s => s.opSeq === 40 && s.peggedJobs.includes(drawerJob.id)), status: "Pending" as const },
              ]

              return (
              <div className="space-y-3">
                {/* Routing release status */}
                <div className={`p-3 rounded border ${routingGate === "Pass" ? "bg-green-50 border-green-200" : routingGate === "Watch" ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-800">
                      Routing Status: <Badge className={`text-[9px] ml-1 ${routingGate === "Pass" ? "bg-green-100 text-green-700" : routingGate === "Watch" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                        {rs.released ? "Released" : "Not Released"}
                      </Badge>
                    </p>
                    <span className="text-[10px] text-slate-600">Approvals: {rs.approvals}/{rs.totalApprovals}</span>
                  </div>
                  {rs.missingApprovals.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[9px] text-red-600 font-semibold mb-1">Missing Approvals:</p>
                      <div className="flex flex-wrap gap-1">
                        {rs.missingApprovals.map(a => (
                          <Badge key={a} className="text-[8px] bg-red-100 text-red-700">{a}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Approval progress */}
                <div>
                  <p className="text-[10px] font-semibold text-slate-600 mb-1">Approval Progress</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${rs.approvals === rs.totalApprovals ? "bg-green-500" : "bg-amber-400"}`} style={{ width: `${(rs.approvals / rs.totalApprovals) * 100}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700">{rs.approvals}/{rs.totalApprovals}</span>
                  </div>
                </div>

                {/* Operation routing path */}
                <div>
                  <p className="text-[10px] font-semibold text-slate-600 mb-2">Operation Routing Path</p>
                  <div className="space-y-1">
                    {jobRoutingPath.map((step, i) => {
                      const isActive = step.status === "In Queue"
                      const isComplete = step.status === "Complete"
                      return (
                        <div key={step.op} className={`flex items-center gap-3 p-2 rounded border ${isActive ? "border-blue-300 bg-blue-50" : isComplete ? "border-green-200 bg-green-50/50" : "border-slate-200"}`}>
                          <div className="flex items-center gap-2 min-w-[80px]">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${isComplete ? "bg-green-500 text-white" : isActive ? "bg-blue-500 text-white" : "bg-slate-200 text-slate-500"}`}>
                              {isComplete ? "\u2713" : i + 1}
                            </div>
                            <span className="text-[10px] font-medium text-slate-700">Op {step.op}</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] font-medium text-slate-800">{step.name}</p>
                            {step.station && (
                              <p className="text-[9px] text-slate-500">{step.station.id} {step.station.name} | Util: {step.station.utilPct}%</p>
                            )}
                          </div>
                          <Badge className={`text-[8px] ${isComplete ? "bg-green-100 text-green-700" : isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                            {step.status}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Routing gate details */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                  <p className="text-[10px] font-semibold text-slate-600 mb-1">Routing Details</p>
                  <div className="grid grid-cols-2 gap-2 text-[9px]">
                    <div><span className="text-slate-400">Workcenter:</span> <span className="font-medium text-slate-800">{drawerJob.workcenter}</span></div>
                    <div><span className="text-slate-400">Product Family:</span> <span className="font-medium text-slate-800">{drawerJob.productFamily}</span></div>
                    <div><span className="text-slate-400">Routing Gate Clear:</span> <span className="font-medium text-slate-800">{gates.routing.clearDate.replace("2026-", "")}</span></div>
                    <div><span className="text-slate-400">Released:</span> <span className={`font-medium ${rs.released ? "text-green-600" : "text-red-600"}`}>{rs.released ? "Yes" : "No"}</span></div>
                  </div>
                </div>
              </div>
              )
            })()}

            {drawerTab === "shelf-life" && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-700">Allocated Lots</p>
                {drawerJob.shelfLifeLots.length === 0 ? (
                  <p className="text-[10px] text-slate-500 py-4 text-center">No shelf-life concerns for this job</p>
                ) : (
                  <div className="space-y-2">
                    {drawerJob.shelfLifeLots.map(l => (
                      <div key={l.lot} className={`p-3 border rounded ${l.flagged ? "border-red-200 bg-red-50" : "border-slate-200"}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-medium text-slate-900">{l.part}</span>
                          {l.flagged && <Badge className="text-[8px] bg-red-100 text-red-700">Expires before use</Badge>}
                        </div>
                        <p className="text-[10px] text-slate-600">Lot: {l.lot}</p>
                        <p className="text-[10px] text-slate-600">Expiry: {l.expiry} | Planned Use: {l.plannedUse}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {drawerTab === "capacity" && (() => {
              const cd = drawerJob.capacityDetail
              const station = capacityStations.find(s => s.id === cd.workcenter || s.workcenter.startsWith(cd.workcenter))
              const utilPct = Math.round((cd.reqHrs / cd.availHrs) * 100)
              const shortfall = Math.max(cd.reqHrs - cd.availHrs, 0)
              const capSlack = Math.round((new Date(drawerJob.requiredDate).getTime() - new Date(drawerJob.plannedFinish).getTime()) / 86400000)
              const capGate: "Ready" | "Watch" | "Blocked" = capSlack >= 5 ? "Ready" : capSlack >= 0 ? "Watch" : "Blocked"

              return (
              <div className="space-y-3">
                {/* Capacity Gate banner */}
                <div className={`p-3 rounded border ${capGate === "Blocked" ? "bg-red-50 border-red-200" : capGate === "Watch" ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-800">
                      Capacity Gate: <Badge className={`text-[9px] ml-1 ${capGate === "Blocked" ? "bg-red-100 text-red-700" : capGate === "Watch" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>{capGate}</Badge>
                    </p>
                    <span className={`text-[11px] font-bold ${capSlack < 0 ? "text-red-600" : capSlack <= 3 ? "text-amber-600" : "text-green-600"}`}>Slack: {capSlack}d</span>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-1">
                    Bottleneck station: <span className="font-medium text-[#8B0000]">{cd.workcenter}</span> |
                    Required: {drawerJob.requiredDate.replace("2026-", "")} |
                    Projected finish: {drawerJob.plannedFinish.replace("2026-", "")}
                  </p>
                </div>

                {/* Station metrics */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Available", value: `${cd.availHrs}h`, color: "text-green-600" },
                    { label: "Required", value: `${cd.reqHrs}h`, color: cd.reqHrs > cd.availHrs ? "text-red-600" : "text-slate-900" },
                    { label: "Shortfall", value: shortfall > 0 ? `${shortfall}h` : "None", color: shortfall > 0 ? "text-red-600" : "text-green-600" },
                    { label: "Utilization", value: `${utilPct}%`, color: utilPct > 100 ? "text-red-600" : "text-green-600" },
                  ].map((m, i) => (
                    <div key={i} className="p-2 bg-slate-50 rounded border border-slate-100">
                      <p className="text-[8px] text-slate-500">{m.label}</p>
                      <p className={`text-[11px] font-bold ${m.color}`}>{m.value}</p>
                    </div>
                  ))}
                </div>

                {/* Utilization bar */}
                <div>
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-slate-500">Station Load</span>
                    <span className={`font-bold ${utilPct > 100 ? "text-red-600" : "text-green-600"}`}>{utilPct}%</span>
                  </div>
                  <div className="h-4 bg-slate-100 rounded relative overflow-hidden">
                    <div className={`h-full rounded ${utilPct > 130 ? "bg-red-500" : utilPct > 100 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${Math.min(utilPct, 100)}%` }} />
                    {utilPct > 100 && (
                      <div className="absolute top-0 right-0 h-full bg-red-300 rounded-r" style={{ width: `${Math.min(utilPct - 100, 100)}%` }} />
                    )}
                    <div className="absolute top-0 left-[100%] h-full w-px bg-slate-800 -ml-px" style={{ left: `${Math.min(100 / (utilPct / 100), 100)}%` }} />
                  </div>
                  <p className="text-[9px] text-slate-500 mt-1">Next available slot: <span className="font-medium">{cd.nextSlot}</span></p>
                </div>

                {/* Daily load chart (if station found) */}
                {station && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-600 mb-1">Daily Load at {station.id}</p>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={station.dailyLoad.slice(0, 7)} margin={{ top: 5, right: 5, bottom: 15, left: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="day" tick={{ fontSize: 7 }} angle={-20} textAnchor="end" height={25} />
                        <YAxis tick={{ fontSize: 7 }} width={20} />
                        <Tooltip contentStyle={{ fontSize: 9 }} />
                        <Bar dataKey="avail" fill="#86efac" name="Avail" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="req" fill="#ef4444" name="Required" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Recommended levers */}
                <div>
                  <p className="text-[10px] font-semibold text-slate-600 mb-1">Recovery Levers</p>
                  <div className="space-y-1">
                    {[
                      ...(station?.otAvail ? [{ lever: "Add OT / Extra Shift", desc: `Gain ~${Math.round((station.availHrs7d / station.shifts / 5) * 2)}h/wk with OT`, ok: true }] : []),
                      ...(station?.crossTrainEligible.length ? [{ lever: "Cross-Train Move", desc: `Move from ${station.crossTrainEligible.join(", ")}`, ok: true }] : []),
                      ...(station?.altRouting ? [{ lever: "Alternate Routing", desc: `Re-route to ${station.altRouting}`, ok: true }] : []),
                      { lever: "Re-Sequence", desc: "Adjust job priority order at this station", ok: true },
                      { lever: "Outsource", desc: "Send overflow to qualified subcontractor", ok: shortfall > 10 },
                    ].map((l, i) => (
                      <div key={i} className={`flex items-start gap-2 p-2 border rounded ${l.ok ? "border-green-200 bg-green-50/50" : "border-slate-200 opacity-50"}`}>
                        <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${l.ok ? "bg-green-500" : "bg-slate-400"}`}></div>
                        <div>
                          <p className="text-[10px] font-medium text-slate-800">{l.lever}</p>
                          <p className="text-[9px] text-slate-500">{l.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick link to capacity tab */}
                <Button
                  variant="outline"
                  className="w-full h-7 text-[10px] text-blue-600 border-blue-200 bg-transparent hover:bg-blue-50"
                  onClick={() => { setDrawerJob(null); setActiveSubTab("capacity"); if (station) setSelectedStation(station) }}
                >
                  Open Full Capacity View for {cd.workcenter}
                </Button>
              </div>
              )
            })()}

            {drawerTab === "actions" && (() => {
              const gs = drawerJob.gateStatus
              const failGates = Object.entries(gs).filter(([, g]) => g.status === "Fail")
              const watchGatesAct = Object.entries(gs).filter(([, g]) => g.status === "Watch")
              const allActions: { action: string; owner: string; target: string; status: "Open" | "In Progress" | "Pending"; priority: "Critical" | "High" | "Medium"; gate: string }[] = [
                { action: drawerJob.nextAction, owner: drawerJob.owner, target: drawerJob.requiredDate, status: "In Progress", priority: drawerJob.readinessStatus === "Blocked" ? "Critical" : "High", gate: "Primary" },
              ]
              // Generate gate-aware recovery actions
              failGates.forEach(([name, g]) => {
                if (name === "materials") allActions.push({ action: `Clear materials gate - shortage resolution by ${g.clearDate.replace("2026-", "")}`, owner: drawerJob.owner, target: g.clearDate, status: "Open", priority: "Critical", gate: "Materials" })
                if (name === "mrb") allActions.push({ action: `Disposition MRB holds blocking this job by ${g.clearDate.replace("2026-", "")}`, owner: "Quality", target: g.clearDate, status: "Open", priority: "Critical", gate: "MRB" })
                if (name === "capacity") allActions.push({ action: `Resolve capacity overload at ${drawerJob.capacityDetail.workcenter}`, owner: drawerJob.capacityDetail.workcenter.split(" ")[0], target: g.clearDate, status: "Open", priority: "High", gate: "Capacity" })
                if (name === "supplier") allActions.push({ action: `Expedite supplier delivery - PO follow-up required`, owner: "Procurement", target: g.clearDate, status: "Open", priority: "Critical", gate: "Supplier" })
                if (name === "routing") allActions.push({ action: `Obtain missing routing approvals`, owner: "Mfg Eng", target: g.clearDate, status: "Open", priority: "High", gate: "Routing" })
              })
              watchGatesAct.forEach(([name, g]) => {
                allActions.push({ action: `Monitor ${name} gate - clear date ${g.clearDate.replace("2026-", "")}`, owner: drawerJob.owner, target: g.clearDate, status: "Pending", priority: "Medium", gate: name })
              })

              return (
              <div className="space-y-3">
                {/* Summary */}
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-700">Recovery & Action Plan</p>
                  <Badge className={`text-[9px] ${failGates.length > 0 ? "bg-red-100 text-red-700" : watchGatesAct.length > 0 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                    {allActions.length} actions | {failGates.length} critical gates
                  </Badge>
                </div>

                {/* Action items */}
                <div className="space-y-1.5">
                  {allActions.map((a, i) => (
                    <div key={i} className={`p-2.5 border rounded ${a.priority === "Critical" ? "border-red-200 bg-red-50/50" : a.priority === "High" ? "border-amber-200 bg-amber-50/30" : "border-slate-200"}`}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-[10px] font-medium text-slate-900 flex-1">{a.action}</p>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge className={`text-[7px] ${a.priority === "Critical" ? "bg-red-100 text-red-700" : a.priority === "High" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{a.priority}</Badge>
                          <Badge className={`text-[7px] ${a.status === "In Progress" ? "bg-blue-100 text-blue-700" : a.status === "Open" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"}`}>{a.status}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[9px] text-slate-500">
                        <span>Owner: <span className="font-medium text-slate-700">{a.owner}</span></span>
                        <span>Target: <span className="font-medium text-slate-700">{a.target.replace("2026-", "")}</span></span>
                        <span>Gate: <span className="font-medium text-slate-700">{a.gate}</span></span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick recovery levers */}
                {failGates.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-600 mb-1">Recommended Levers</p>
                    <div className="space-y-1">
                      {[
                        ...(failGates.some(([n]) => n === "materials") ? [{ lever: "Emergency Procurement", desc: "Issue spot-buy or expedite existing POs", feasible: true }] : []),
                        ...(failGates.some(([n]) => n === "mrb") ? [{ lever: "Parallel Disposition", desc: "Request concurrent review to shorten MRB cycle", feasible: true }] : []),
                        ...(failGates.some(([n]) => n === "capacity") ? [{ lever: "OT / Cross-Train", desc: "Add overtime or move labor from underutilized stations", feasible: true }] : []),
                        ...(failGates.some(([n]) => n === "supplier") ? [{ lever: "Alt Supplier", desc: "Qualify alternate source for critical shortage parts", feasible: true }] : []),
                        { lever: "Escalate to Program Office", desc: "Flag for weekly SIOP review and priority adjustment", feasible: drawerJob.businessPriority >= 80 },
                      ].map((l, i) => (
                        <div key={i} className={`flex items-start gap-2 p-2 border rounded ${l.feasible ? "border-green-200 bg-green-50/50" : "border-slate-200 opacity-50"}`}>
                          <div className="w-1.5 h-1.5 rounded-full mt-1 shrink-0 bg-green-500" />
                          <div>
                            <p className="text-[10px] font-medium text-slate-800">{l.lever}</p>
                            <p className="text-[9px] text-slate-500">{l.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              )
            })()}
          </div>
        </div>
        )
      })()}
    </div>
  )
}
