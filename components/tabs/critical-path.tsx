"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Info, X, Download, FileText, ChevronRight, ExternalLink, Search } from "lucide-react"

// Constants
const DIVISIONS = ["All", "Defense Electronics", "Communications"]
const PROGRAMS = ["Manpack Radio Program", "Vehicle Mount System", "Tactical HF Radio", "Base Station Program", "Portable Comm System"]
const PROJECTS = ["PRJ-2026-001", "PRJ-2026-002", "PRJ-2026-003", "PRJ-2026-004", "PRJ-2026-005"]
const IMPACT_AREAS = ["Final Assembly", "Integration", "Test", "Kitting", "Subassembly"]
const OWNERS = ["John Smith", "Sarah Martinez", "Mike Chen", "David Chen", "Lisa Park"]
const REASON_CODES = ["PO Late", "Netted Shortage", "On Dock / Not Usable", "Quality Hold", "Capacity Short", "Rework Load", "Engineering Change", "Unclassified"]
const ITEM_TYPES = ["Material", "Quality Hold", "Labor/Capacity", "Rework", "Engineering Change", "Other"]
const STATUSES = ["New", "Investigating", "Mitigation", "Resolved"]

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function CriticalPath() {
  // View mode: "critical" or "near-critical"
  const [viewMode, setViewMode] = useState<"critical" | "near-critical">("critical")

  // Global Filters
  const [division, setDivision] = useState("All")
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([])
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [deliverableSearch, setDeliverableSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("2026-01-15")
  const [dateTo, setDateTo] = useState("2026-04-15")
  const [showCriticalOnly, setShowCriticalOnly] = useState(true)
  const [selectedImpactAreas, setSelectedImpactAreas] = useState<string[]>([])
  const [selectedOwners, setSelectedOwners] = useState<string[]>([])
  const [selectedReasonCodes, setSelectedReasonCodes] = useState<string[]>([])

  // Near-Critical specific controls
  const [bufferThreshold, setBufferThreshold] = useState(7)
  const [volatilityLookback, setVolatilityLookback] = useState(60)
  const [volatilityThreshold, setVolatilityThreshold] = useState(3)
  const [nearCriticalKpiFilter, setNearCriticalKpiFilter] = useState<string | null>(null)
  const [heatmapViewBy, setHeatmapViewBy] = useState<"deliverable" | "assembly">("deliverable")

  // Selection state
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [selectedDeliverable, setSelectedDeliverable] = useState<string | null>(null)

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerData, setDrawerData] = useState<any>(null)
  const [drawerTab, setDrawerTab] = useState("summary")

  // KPI click filters
  const [kpiFilter, setKpiFilter] = useState<string | null>(null)

  // Generate Critical Path Data
  const criticalPathData = useMemo(() => {
    const data = [
      // Material-driven critical items
      { id: "CPI-001", deliverable: "DEL-2026-0045", milestone: "Final Assembly", gatingItem: "PN-RF-001", itemDesc: "RF Amplifier Module", type: "Material", parentRollup: "RF Subassembly / Main Assembly", requiredDate: "2026-02-15", bestAvailDate: "2026-02-22", slipDays: 7, confidence: "High", reasonCode: "PO Late", owner: "John Smith", status: "Investigating", nextActionDate: "2026-02-01", program: "Manpack Radio Program", project: "PRJ-2026-001", division: "Defense Electronics", impactArea: "Final Assembly", atRiskValue: 125000, supplier: "AeroSupply Inc", poId: "PO-2026-0145", onHand: 0, openPOs: [{ po: "PO-2026-0145", promise: "2026-02-22", qty: 50 }], notes: "Supplier citing raw material shortage" },
      { id: "CPI-002", deliverable: "DEL-2026-0045", milestone: "Final Assembly", gatingItem: "PN-PCB-450", itemDesc: "Main PCB Assembly", type: "Material", parentRollup: "Electronics Subassembly / Main Assembly", requiredDate: "2026-02-10", bestAvailDate: "2026-02-18", slipDays: 8, confidence: "High", reasonCode: "Netted Shortage", owner: "Sarah Martinez", status: "Mitigation", nextActionDate: "2026-02-03", program: "Manpack Radio Program", project: "PRJ-2026-001", division: "Defense Electronics", impactArea: "Final Assembly", atRiskValue: 89000, supplier: "Precision Parts Ltd", poId: "PO-2026-0156", onHand: 12, openPOs: [{ po: "PO-2026-0156", promise: "2026-02-18", qty: 30 }], notes: "Expedite request submitted" },
      { id: "CPI-003", deliverable: "DEL-2026-0052", milestone: "Integration", gatingItem: "PN-HF-AMP", itemDesc: "HF Power Amplifier", type: "Material", parentRollup: "Power Module / Tactical Radio Assembly", requiredDate: "2026-02-20", bestAvailDate: "2026-02-28", slipDays: 8, confidence: "High", reasonCode: "PO Late", owner: "John Smith", status: "New", nextActionDate: "2026-02-05", program: "Tactical HF Radio", project: "PRJ-2026-003", division: "Communications", impactArea: "Integration", atRiskValue: 156000, supplier: "SignalTech Inc", poId: "PO-2026-0179", onHand: 0, openPOs: [{ po: "PO-2026-0179", promise: "2026-02-28", qty: 25 }], notes: "Component shortage from sub-tier" },
      // Quality Hold items
      { id: "CPI-004", deliverable: "DEL-2026-0045", milestone: "Test", gatingItem: "PN-CRYPTO", itemDesc: "Type 1 Crypto Module", type: "Quality Hold", parentRollup: "Security Module / Main Assembly", requiredDate: "2026-02-12", bestAvailDate: "2026-02-19", slipDays: 7, confidence: "High", reasonCode: "Quality Hold", owner: "Mike Chen", status: "Investigating", nextActionDate: "2026-02-02", program: "Manpack Radio Program", project: "PRJ-2026-001", division: "Defense Electronics", impactArea: "Test", atRiskValue: 78000, supplier: "SecureComm Ltd", poId: "PO-2026-0201", onHand: 15, openPOs: [], qualityRecords: [{ id: "NC-2026-0092", type: "Non-Conformance", reason: "Firmware version mismatch", age: 5, disposition: "Pending" }], notes: "MRB review scheduled" },
      { id: "CPI-005", deliverable: "DEL-2026-0058", milestone: "Final Assembly", gatingItem: "PN-PWR-CONN", itemDesc: "Power Connector Assembly", type: "Quality Hold", parentRollup: "Power Distribution / Vehicle Mount Assembly", requiredDate: "2026-02-18", bestAvailDate: "2026-02-25", slipDays: 7, confidence: "Medium", reasonCode: "On Dock / Not Usable", owner: "Lisa Park", status: "Mitigation", nextActionDate: "2026-02-04", program: "Vehicle Mount System", project: "PRJ-2026-002", division: "Defense Electronics", impactArea: "Kitting", atRiskValue: 34000, supplier: "PowerTech Systems", poId: "PO-2026-0167", onHand: 45, openPOs: [], qualityRecords: [{ id: "RTV-2026-0041", type: "Return to Vendor", reason: "Dimensional out of spec", age: 8, disposition: "In Process" }], notes: "RTV in process, alternate source being qualified" },
      // Labor/Capacity items
      { id: "CPI-006", deliverable: "DEL-2026-0052", milestone: "Integration", gatingItem: "INT-LABOR-001", itemDesc: "Integration Technician Hours", type: "Labor/Capacity", parentRollup: "Integration / System Build", requiredDate: "2026-02-25", bestAvailDate: "2026-03-02", slipDays: 5, confidence: "Medium", reasonCode: "Capacity Short", owner: "David Chen", status: "Investigating", nextActionDate: "2026-02-06", program: "Tactical HF Radio", project: "PRJ-2026-003", division: "Communications", impactArea: "Integration", atRiskValue: null, capacityData: { required: 480, available: 320, gap: 160, constraintType: "Touch" }, notes: "Overtime approved, cross-training in progress" },
      { id: "CPI-007", deliverable: "DEL-2026-0061", milestone: "Test", gatingItem: "TEST-LABOR-002", itemDesc: "RF Test Station Capacity", type: "Labor/Capacity", parentRollup: "Test / Final Acceptance", requiredDate: "2026-03-01", bestAvailDate: "2026-03-05", slipDays: 4, confidence: "High", reasonCode: "Capacity Short", owner: "Sarah Martinez", status: "New", nextActionDate: "2026-02-07", program: "Base Station Program", project: "PRJ-2026-004", division: "Communications", impactArea: "Test", atRiskValue: null, capacityData: { required: 240, available: 180, gap: 60, constraintType: "Support" }, notes: "Additional test equipment on order" },
      // Rework items
      { id: "CPI-008", deliverable: "DEL-2026-0045", milestone: "Final Assembly", gatingItem: "RWK-001", itemDesc: "Rework - Solder Defects Lot 2026-A", type: "Rework", parentRollup: "PCB Rework / Main Assembly", requiredDate: "2026-02-08", bestAvailDate: "2026-02-14", slipDays: 6, confidence: "High", reasonCode: "Rework Load", owner: "Sarah Martinez", status: "Mitigation", nextActionDate: "2026-02-03", program: "Manpack Radio Program", project: "PRJ-2026-001", division: "Defense Electronics", impactArea: "Subassembly", atRiskValue: 45000, capacityData: { required: 120, available: 80, gap: 40, constraintType: "Touch" }, notes: "Rework team working overtime" },
      // Engineering Change items
      { id: "CPI-009", deliverable: "DEL-2026-0058", milestone: "Integration", gatingItem: "ECN-2026-0034", itemDesc: "Engineering Change - Rev C Update", type: "Engineering Change", parentRollup: "Control Unit / Vehicle Mount Assembly", requiredDate: "2026-02-22", bestAvailDate: "2026-02-28", slipDays: 6, confidence: "Low", reasonCode: "Engineering Change", owner: "Mike Chen", status: "Investigating", nextActionDate: "2026-02-05", program: "Vehicle Mount System", project: "PRJ-2026-002", division: "Defense Electronics", impactArea: "Integration", atRiskValue: 67000, notes: "ECN approval pending, Rev B units on hold" },
      // Near-critical items (slip = 0 but low buffer)
      { id: "CPI-010", deliverable: "DEL-2026-0061", milestone: "Final Assembly", gatingItem: "PN-NIC-200", itemDesc: "Network Interface Card", type: "Material", parentRollup: "Network Module / Base Station Assembly", requiredDate: "2026-03-05", bestAvailDate: "2026-03-05", slipDays: 0, confidence: "Medium", reasonCode: "Netted Shortage", owner: "David Chen", status: "New", nextActionDate: "2026-02-10", program: "Base Station Program", project: "PRJ-2026-004", division: "Communications", impactArea: "Final Assembly", atRiskValue: 52000, supplier: "TechSource Ltd", poId: "PO-2026-0210", onHand: 8, openPOs: [{ po: "PO-2026-0210", promise: "2026-03-05", qty: 40 }], bufferDays: 3, notes: "Buffer exhausted, monitoring closely" },
      { id: "CPI-011", deliverable: "DEL-2026-0065", milestone: "Test", gatingItem: "PN-EARPC", itemDesc: "Tactical Earpiece", type: "Material", parentRollup: "Audio Module / Portable Comm Assembly", requiredDate: "2026-03-10", bestAvailDate: "2026-03-10", slipDays: 0, confidence: "High", reasonCode: "Unclassified", owner: "Lisa Park", status: "New", nextActionDate: "2026-02-12", program: "Portable Comm System", project: "PRJ-2026-005", division: "Defense Electronics", impactArea: "Test", atRiskValue: 28000, supplier: "AudioTech Corp", poId: "PO-2026-0223", onHand: 20, openPOs: [{ po: "PO-2026-0223", promise: "2026-03-10", qty: 60 }], bufferDays: 5, notes: "Promise volatility high - 3 changes in last 30 days" },
    ]

    // Apply filters
    return data.filter(row => {
      if (division !== "All" && row.division !== division) return false
      if (selectedPrograms.length > 0 && !selectedPrograms.includes(row.program)) return false
      if (selectedProjects.length > 0 && !selectedProjects.includes(row.project)) return false
      if (deliverableSearch && !row.deliverable.toLowerCase().includes(deliverableSearch.toLowerCase())) return false
      if (selectedImpactAreas.length > 0 && !selectedImpactAreas.includes(row.impactArea)) return false
      if (selectedOwners.length > 0 && !selectedOwners.includes(row.owner)) return false
      if (selectedReasonCodes.length > 0 && !selectedReasonCodes.includes(row.reasonCode)) return false
      if (showCriticalOnly && row.slipDays === 0) return false
      if (selectedItem && row.gatingItem !== selectedItem) return false
      if (selectedDeliverable && row.deliverable !== selectedDeliverable) return false
      if (kpiFilter === "deliveries" && row.slipDays <= 0) return false
      if (kpiFilter === "material" && row.type !== "Material") return false

      // Date window filter
      const reqDate = new Date(row.requiredDate)
      const fromDate = new Date(dateFrom)
      const toDate = new Date(dateTo)
      if (reqDate < fromDate || reqDate > toDate) return false

      return true
    }).sort((a, b) => {
      // Sort by slip days desc, then required date asc
      if (b.slipDays !== a.slipDays) return b.slipDays - a.slipDays
      return new Date(a.requiredDate).getTime() - new Date(b.requiredDate).getTime()
    })
  }, [division, selectedPrograms, selectedProjects, deliverableSearch, dateFrom, dateTo, showCriticalOnly, selectedImpactAreas, selectedOwners, selectedReasonCodes, selectedItem, selectedDeliverable, kpiFilter])

  // KPIs
  const kpis = useMemo(() => {
    const uniqueDeliverables = new Set(criticalPathData.filter(d => d.slipDays > 0).map(d => d.deliverable))
    const criticalItems = criticalPathData.filter(d => d.slipDays > 0)
    const earliestReqDate = criticalItems.length > 0 ? criticalItems.reduce((min, d) => d.requiredDate < min ? d.requiredDate : min, criticalItems[0].requiredDate) : null
    const maxSlip = criticalItems.length > 0 ? Math.max(...criticalItems.map(d => d.slipDays)) : 0
    const totalAtRiskValue = criticalItems.reduce((sum, d) => sum + (d.atRiskValue || 0), 0)

    return {
      deliveriesAtRisk: uniqueDeliverables.size,
      criticalItems: criticalItems.length,
      earliestReqDate,
      maxSlip,
      totalAtRiskValue
    }
  }, [criticalPathData])

  // Slip by Deliverable chart data
  const slipByDeliverableData = useMemo(() => {
    const deliverableSlips: { [key: string]: { deliverable: string, maxSlip: number, program: string } } = {}
    criticalPathData.filter(d => d.slipDays > 0).forEach(d => {
      if (!deliverableSlips[d.deliverable] || d.slipDays > deliverableSlips[d.deliverable].maxSlip) {
        deliverableSlips[d.deliverable] = { deliverable: d.deliverable, maxSlip: d.slipDays, program: d.program }
      }
    })
    return Object.values(deliverableSlips).sort((a, b) => b.maxSlip - a.maxSlip).slice(0, 15)
  }, [criticalPathData])

  // Near-Critical Data - items with slip = 0 but limited buffer or high volatility
  const nearCriticalData = useMemo(() => {
    // Base data pool - items with slip = 0 (or near-zero) pegged to deliverables
    const nearCriticalItems = [
      { id: "NC-001", deliverable: "DEL-2026-0061", milestone: "Final Assembly", gatingItem: "PN-NIC-200", itemDesc: "Network Interface Card", type: "Material", parentRollup: "Network Module / Base Station Assembly", requiredDate: "2026-03-05", bestAvailDate: "2026-03-02", slipDays: 0, bufferDays: 3, volatilityScore: 1, volatilityFlag: false, usabilityRisk: false, trigger: "Low Buffer", confidence: "High", reasonCode: "Netted Shortage", owner: "David Chen", status: "Monitoring", nextActionDate: "2026-02-10", program: "Base Station Program", project: "PRJ-2026-004", division: "Communications", impactArea: "Final Assembly", atRiskValue: 52000, supplier: "TechSource Ltd", poId: "PO-2026-0210", onHand: 8, openPOs: [{ po: "PO-2026-0210", promise: "2026-03-02", qty: 40 }], promiseHistory: [{ date: "2026-01-05", promise: "2026-02-28" }, { date: "2026-01-20", promise: "2026-03-02" }], qtyRequired: 35, notes: "Buffer exhausted, monitoring closely" },
      { id: "NC-002", deliverable: "DEL-2026-0065", milestone: "Test", gatingItem: "PN-EARPC", itemDesc: "Tactical Earpiece", type: "Material", parentRollup: "Audio Module / Portable Comm Assembly", requiredDate: "2026-03-10", bestAvailDate: "2026-03-05", slipDays: 0, bufferDays: 5, volatilityScore: 4, volatilityFlag: true, usabilityRisk: false, trigger: "High Volatility", confidence: "Medium", reasonCode: "Unclassified", owner: "Lisa Park", status: "Investigating", nextActionDate: "2026-02-12", program: "Portable Comm System", project: "PRJ-2026-005", division: "Defense Electronics", impactArea: "Test", atRiskValue: 28000, supplier: "AudioTech Corp", poId: "PO-2026-0223", onHand: 20, openPOs: [{ po: "PO-2026-0223", promise: "2026-03-05", qty: 60 }], promiseHistory: [{ date: "2025-12-15", promise: "2026-02-20" }, { date: "2026-01-05", promise: "2026-02-28" }, { date: "2026-01-15", promise: "2026-03-03" }, { date: "2026-01-25", promise: "2026-03-05" }], qtyRequired: 55, notes: "Promise volatility high - 4 changes in lookback window" },
      { id: "NC-003", deliverable: "DEL-2026-0045", milestone: "Integration", gatingItem: "PN-CAP-780", itemDesc: "Capacitor Array HV", type: "Material", parentRollup: "Power Distribution / Main Assembly", requiredDate: "2026-02-20", bestAvailDate: "2026-02-15", slipDays: 0, bufferDays: 5, volatilityScore: 2, volatilityFlag: false, usabilityRisk: false, trigger: "Low Buffer", confidence: "High", reasonCode: "Netted Shortage", owner: "John Smith", status: "Monitoring", nextActionDate: "2026-02-08", program: "Manpack Radio Program", project: "PRJ-2026-001", division: "Defense Electronics", impactArea: "Integration", atRiskValue: 18000, supplier: "ElectroComponents", poId: "PO-2026-0212", onHand: 25, openPOs: [{ po: "PO-2026-0212", promise: "2026-02-15", qty: 100 }], promiseHistory: [{ date: "2026-01-10", promise: "2026-02-12" }, { date: "2026-01-22", promise: "2026-02-15" }], qtyRequired: 80, notes: "Supplier stable but low buffer" },
      { id: "NC-004", deliverable: "DEL-2026-0058", milestone: "Kitting", gatingItem: "PN-CONN-230", itemDesc: "Connector Set MIL-SPEC", type: "Material", parentRollup: "Harness Assembly / Vehicle Mount Assembly", requiredDate: "2026-02-25", bestAvailDate: "2026-02-22", slipDays: 0, bufferDays: 3, volatilityScore: 5, volatilityFlag: true, usabilityRisk: false, trigger: "High Volatility", confidence: "Low", reasonCode: "PO Late", owner: "Sarah Martinez", status: "Investigating", nextActionDate: "2026-02-06", program: "Vehicle Mount System", project: "PRJ-2026-002", division: "Defense Electronics", impactArea: "Kitting", atRiskValue: 34000, supplier: "FastConnect Co", poId: "PO-2026-0160", onHand: 12, openPOs: [{ po: "PO-2026-0160", promise: "2026-02-22", qty: 50 }], promiseHistory: [{ date: "2025-12-01", promise: "2026-02-01" }, { date: "2025-12-20", promise: "2026-02-10" }, { date: "2026-01-05", promise: "2026-02-15" }, { date: "2026-01-15", promise: "2026-02-18" }, { date: "2026-01-25", promise: "2026-02-22" }], qtyRequired: 45, notes: "5 promise changes - escalate" },
      { id: "NC-005", deliverable: "DEL-2026-0052", milestone: "Final Assembly", gatingItem: "PN-ANT-FEED", itemDesc: "Antenna Feed Assembly", type: "Material", parentRollup: "Antenna Module / Tactical Radio Assembly", requiredDate: "2026-03-01", bestAvailDate: "2026-02-25", slipDays: 0, bufferDays: 4, volatilityScore: 1, volatilityFlag: false, usabilityRisk: false, trigger: "Low Buffer", confidence: "High", reasonCode: "Unclassified", owner: "Mike Chen", status: "Monitoring", nextActionDate: "2026-02-15", program: "Tactical HF Radio", project: "PRJ-2026-003", division: "Communications", impactArea: "Final Assembly", atRiskValue: 42000, supplier: "AeroSupply Inc", poId: "PO-2026-0245", onHand: 0, openPOs: [{ po: "PO-2026-0245", promise: "2026-02-25", qty: 30 }], promiseHistory: [{ date: "2026-01-15", promise: "2026-02-25" }], qtyRequired: 25, notes: "Single source - monitor closely" },
      { id: "NC-006", deliverable: "DEL-2026-0061", milestone: "Test", gatingItem: "TEST-CAL-001", itemDesc: "Calibration Equipment Availability", type: "Labor/Capacity", parentRollup: "Test / Base Station Assembly", requiredDate: "2026-03-08", bestAvailDate: "2026-03-02", slipDays: 0, bufferDays: 6, volatilityScore: 0, volatilityFlag: false, usabilityRisk: false, trigger: "Low Buffer", confidence: "Medium", reasonCode: "Capacity Short", owner: "David Chen", status: "Monitoring", nextActionDate: "2026-02-18", program: "Base Station Program", project: "PRJ-2026-004", division: "Communications", impactArea: "Test", atRiskValue: null, capacityData: { required: 120, available: 100, gap: 20, constraintType: "Support" }, promiseHistory: [], qtyRequired: 1, notes: "Equipment scheduled but tight" },
      { id: "NC-007", deliverable: "DEL-2026-0045", milestone: "Subassembly", gatingItem: "PN-FILT-100", itemDesc: "RF Filter Module", type: "Quality Hold", parentRollup: "RF Subassembly / Main Assembly", requiredDate: "2026-02-18", bestAvailDate: "2026-02-16", slipDays: 0, bufferDays: 2, volatilityScore: 0, volatilityFlag: false, usabilityRisk: true, trigger: "Usability Risk", confidence: "Medium", reasonCode: "On Dock / Not Usable", owner: "Lisa Park", status: "Investigating", nextActionDate: "2026-02-05", program: "Manpack Radio Program", project: "PRJ-2026-001", division: "Defense Electronics", impactArea: "Subassembly", atRiskValue: 22000, supplier: "SignalTech Inc", poId: "PO-2026-0188", onHand: 40, openPOs: [], qualityRecords: [{ id: "INSP-2026-0045", type: "Pending Inspection", reason: "Awaiting source inspection clearance", age: 3, disposition: "In Queue" }], promiseHistory: [], qtyRequired: 35, notes: "On dock, awaiting inspection release" },
      { id: "NC-008", deliverable: "DEL-2026-0065", milestone: "Integration", gatingItem: "PN-BAT-PACK", itemDesc: "Battery Pack Assembly", type: "Material", parentRollup: "Power Module / Portable Comm Assembly", requiredDate: "2026-03-05", bestAvailDate: "Unknown", slipDays: 0, bufferDays: null, volatilityScore: null, volatilityFlag: false, usabilityRisk: false, trigger: "Data Risk", confidence: "Low", reasonCode: "Unclassified", owner: "Mike Chen", status: "Investigating", nextActionDate: "2026-02-08", program: "Portable Comm System", project: "PRJ-2026-005", division: "Defense Electronics", impactArea: "Integration", atRiskValue: 15000, supplier: "PowerTech Systems", poId: "PO-2026-0267", onHand: 0, openPOs: [{ po: "PO-2026-0267", promise: "Unknown", qty: 25 }], promiseHistory: [], qtyRequired: 20, notes: "Promise date not confirmed by supplier" },
      { id: "NC-009", deliverable: "DEL-2026-0052", milestone: "Kitting", gatingItem: "PN-GASKET-50", itemDesc: "Environmental Seal Gasket", type: "Material", parentRollup: "Enclosure / Tactical Radio Assembly", requiredDate: "2026-02-22", bestAvailDate: "2026-02-18", slipDays: 0, bufferDays: 4, volatilityScore: 3, volatilityFlag: true, usabilityRisk: false, trigger: "High Volatility", confidence: "High", reasonCode: "Netted Shortage", owner: "Sarah Martinez", status: "Monitoring", nextActionDate: "2026-02-10", program: "Tactical HF Radio", project: "PRJ-2026-003", division: "Communications", impactArea: "Kitting", atRiskValue: 8000, supplier: "MechParts Co", poId: "PO-2026-0255", onHand: 100, openPOs: [{ po: "PO-2026-0255", promise: "2026-02-18", qty: 200 }], promiseHistory: [{ date: "2026-01-02", promise: "2026-02-10" }, { date: "2026-01-12", promise: "2026-02-14" }, { date: "2026-01-22", promise: "2026-02-18" }], qtyRequired: 180, notes: "3 promise changes in lookback" },
      { id: "NC-010", deliverable: "DEL-2026-0058", milestone: "Final Assembly", gatingItem: "PN-DISPLAY", itemDesc: "LCD Display Module", type: "Material", parentRollup: "Control Unit / Vehicle Mount Assembly", requiredDate: "2026-03-02", bestAvailDate: "2026-02-26", slipDays: 0, bufferDays: 4, volatilityScore: 1, volatilityFlag: false, usabilityRisk: false, trigger: "Low Buffer", confidence: "High", reasonCode: "Unclassified", owner: "John Smith", status: "Monitoring", nextActionDate: "2026-02-12", program: "Vehicle Mount System", project: "PRJ-2026-002", division: "Defense Electronics", impactArea: "Final Assembly", atRiskValue: 65000, supplier: "TechSource Ltd", poId: "PO-2026-0270", onHand: 5, openPOs: [{ po: "PO-2026-0270", promise: "2026-02-26", qty: 20 }], promiseHistory: [{ date: "2026-01-18", promise: "2026-02-26" }], qtyRequired: 18, notes: "High-value item, single source" },
    ]

    // Apply filters
    return nearCriticalItems.filter(row => {
      if (division !== "All" && row.division !== division) return false
      if (selectedPrograms.length > 0 && !selectedPrograms.includes(row.program)) return false
      if (selectedProjects.length > 0 && !selectedProjects.includes(row.project)) return false
      if (deliverableSearch && !row.deliverable.toLowerCase().includes(deliverableSearch.toLowerCase())) return false
      if (selectedImpactAreas.length > 0 && !selectedImpactAreas.includes(row.impactArea)) return false
      if (selectedOwners.length > 0 && !selectedOwners.includes(row.owner)) return false
      if (selectedReasonCodes.length > 0 && !selectedReasonCodes.includes(row.reasonCode)) return false
      if (selectedItem && row.gatingItem !== selectedItem) return false
      if (selectedDeliverable && row.deliverable !== selectedDeliverable) return false

      // Date window filter
      const reqDate = new Date(row.requiredDate)
      const fromDate = new Date(dateFrom)
      const toDate = new Date(dateTo)
      if (reqDate < fromDate || reqDate > toDate) return false

      // Near-Critical criteria filter
      const meetsBufferCriteria = row.bufferDays !== null && row.bufferDays <= bufferThreshold
      const meetsVolatilityCriteria = row.volatilityScore !== null && row.volatilityScore >= volatilityThreshold
      const meetsUsabilityRisk = row.usabilityRisk === true
      const isDataRisk = row.trigger === "Data Risk"

      if (nearCriticalKpiFilter === "lowBuffer" && row.trigger !== "Low Buffer") return false
      if (nearCriticalKpiFilter === "highVolatility" && !row.volatilityFlag) return false
      if (nearCriticalKpiFilter === "wouldBe" && row.bufferDays !== null && row.bufferDays > 7) return false

      return meetsBufferCriteria || meetsVolatilityCriteria || meetsUsabilityRisk || isDataRisk
    }).sort((a, b) => {
      // Sort by buffer days asc, then volatility desc, then required date asc
      const bufferA = a.bufferDays ?? 999
      const bufferB = b.bufferDays ?? 999
      if (bufferA !== bufferB) return bufferA - bufferB
      const volA = a.volatilityScore ?? 0
      const volB = b.volatilityScore ?? 0
      if (volB !== volA) return volB - volA
      return new Date(a.requiredDate).getTime() - new Date(b.requiredDate).getTime()
    })
  }, [division, selectedPrograms, selectedProjects, deliverableSearch, dateFrom, dateTo, selectedImpactAreas, selectedOwners, selectedReasonCodes, selectedItem, selectedDeliverable, bufferThreshold, volatilityThreshold, nearCriticalKpiFilter])

  // Near-Critical KPIs
  const nearCriticalKpis = useMemo(() => {
    const uniqueDeliverables = new Set(nearCriticalData.map(d => d.deliverable))
    const minBuffer = nearCriticalData.filter(d => d.bufferDays !== null).length > 0
      ? Math.min(...nearCriticalData.filter(d => d.bufferDays !== null).map(d => d.bufferDays as number))
      : null
    const highVolatilityCount = nearCriticalData.filter(d => d.volatilityFlag).length
    // Would-be blockers: items where buffer <= 7 days (if Best Avail moves +7 days, they slip)
    const wouldBeBlockers = nearCriticalData.filter(d => d.bufferDays !== null && d.bufferDays <= 7).length

    return {
      nearCriticalDeliverables: uniqueDeliverables.size,
      nearCriticalItems: nearCriticalData.length,
      minBuffer,
      highVolatilityCount,
      wouldBeBlockers
    }
  }, [nearCriticalData])

  // Near-Critical Heatmap data
  const nearCriticalHeatmapData = useMemo(() => {
    if (heatmapViewBy === "deliverable") {
      // Group by deliverable and impact area
      const matrix: { [deliverable: string]: { [impactArea: string]: { count: number, minBuffer: number } } } = {}
      nearCriticalData.forEach(d => {
        if (!matrix[d.deliverable]) matrix[d.deliverable] = {}
        if (!matrix[d.deliverable][d.impactArea]) matrix[d.deliverable][d.impactArea] = { count: 0, minBuffer: 999 }
        matrix[d.deliverable][d.impactArea].count++
        if (d.bufferDays !== null && d.bufferDays < matrix[d.deliverable][d.impactArea].minBuffer) {
          matrix[d.deliverable][d.impactArea].minBuffer = d.bufferDays
        }
      })
      return { type: "deliverable" as const, matrix, impactAreas: IMPACT_AREAS }
    } else {
      // Group by parent rollup assembly
      const matrix: { [assembly: string]: { [impactArea: string]: { count: number, minBuffer: number } } } = {}
      nearCriticalData.forEach(d => {
        const assembly = d.parentRollup.split(" / ")[1] || d.parentRollup
        if (!matrix[assembly]) matrix[assembly] = {}
        if (!matrix[assembly][d.impactArea]) matrix[assembly][d.impactArea] = { count: 0, minBuffer: 999 }
        matrix[assembly][d.impactArea].count++
        if (d.bufferDays !== null && d.bufferDays < matrix[assembly][d.impactArea].minBuffer) {
          matrix[assembly][d.impactArea].minBuffer = d.bufferDays
        }
      })
      return { type: "assembly" as const, matrix, impactAreas: IMPACT_AREAS }
    }
  }, [nearCriticalData, heatmapViewBy])

  // Get recommended action for near-critical item
  const getRecommendedAction = (item: typeof nearCriticalData[0]) => {
    if (item.trigger === "Low Buffer" && item.type === "Material") return "Confirm receipt plan / pull in supply / validate alternates"
    if (item.trigger === "High Volatility" && item.type === "Material") return "Supplier reconfirmation + freeze promise / escalate"
    if (item.trigger === "Usability Risk") return "Expedite inspection / MRB disposition"
    if (item.type === "Labor/Capacity" || item.type === "Rework") return "Re-sequence / add shift / reduce rework queue"
    if (item.type === "Engineering Change") return "Finalize change / validate config readiness"
    if (item.trigger === "Data Risk") return "Confirm promise date with supplier"
    return "Review"
  }

  // Get trigger badge color
  const getTriggerBadgeColor = (trigger: string) => {
    switch (trigger) {
      case "Low Buffer": return "bg-amber-50 text-amber-700 border-amber-200"
      case "High Volatility": return "bg-purple-50 text-purple-700 border-purple-200"
      case "Usability Risk": return "bg-red-50 text-red-700 border-red-200"
      case "Data Risk": return "bg-slate-100 text-slate-600 border-slate-300"
      default: return "bg-slate-50 text-slate-700 border-slate-200"
    }
  }

  // Clear all filters
  const clearAllFilters = () => {
    setDivision("All")
    setSelectedPrograms([])
    setSelectedProjects([])
    setDeliverableSearch("")
    setDateFrom("2026-01-15")
    setDateTo("2026-04-15")
    setShowCriticalOnly(true)
    setSelectedImpactAreas([])
    setSelectedOwners([])
    setSelectedReasonCodes([])
    setSelectedItem(null)
    setSelectedDeliverable(null)
    setKpiFilter(null)
    setNearCriticalKpiFilter(null)
  }

  // Check if any filters are active
  const hasActiveFilters = division !== "All" || selectedPrograms.length > 0 || selectedProjects.length > 0 || deliverableSearch || selectedImpactAreas.length > 0 || selectedOwners.length > 0 || selectedReasonCodes.length > 0 || selectedItem || selectedDeliverable || kpiFilter

  // Open drawer
  const openDrawer = (data: any) => {
    setDrawerData(data)
    setDrawerTab("summary")
    setDrawerOpen(true)
  }

  // Get type badge color
  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "Material": return "bg-blue-50 text-blue-700 border-blue-200"
      case "Quality Hold": return "bg-red-50 text-red-700 border-red-200"
      case "Labor/Capacity": return "bg-purple-50 text-purple-700 border-purple-200"
      case "Rework": return "bg-orange-50 text-orange-700 border-orange-200"
      case "Engineering Change": return "bg-yellow-50 text-yellow-700 border-yellow-200"
      default: return "bg-slate-50 text-slate-700 border-slate-200"
    }
  }

  // Get confidence badge color
  const getConfidenceBadgeColor = (conf: string) => {
    switch (conf) {
      case "High": return "bg-green-50 text-green-700 border-green-200"
      case "Medium": return "bg-yellow-50 text-yellow-700 border-yellow-200"
      case "Low": return "bg-red-50 text-red-700 border-red-200"
      default: return "bg-slate-50 text-slate-700 border-slate-200"
    }
  }

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "New": return "bg-blue-100 text-blue-800"
      case "Investigating": return "bg-yellow-100 text-yellow-800"
      case "Mitigation": return "bg-orange-100 text-orange-800"
      case "Resolved": return "bg-green-100 text-green-800"
      default: return "bg-slate-100 text-slate-800"
    }
  }

  return (
    <div className="space-y-4">
      {/* TWO-TAB SWITCH: Critical Path | Near-Critical */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => { setViewMode("critical"); setNearCriticalKpiFilter(null) }}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${viewMode === "critical" ? "bg-white shadow-sm text-slate-900" : "text-slate-600 hover:text-slate-900"}`}
        >
          Critical Path
        </button>
        <button
          onClick={() => { setViewMode("near-critical"); setKpiFilter(null) }}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${viewMode === "near-critical" ? "bg-white shadow-sm text-slate-900" : "text-slate-600 hover:text-slate-900"}`}
        >
          Near-Critical
        </button>
      </div>

      {/* GLOBAL FILTERS - Sticky */}
      <Card className="border-slate-200 sticky top-0 z-20 bg-white">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={division} onValueChange={setDivision}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Division" />
              </SelectTrigger>
              <SelectContent>
                {DIVISIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={selectedPrograms.length > 0 ? selectedPrograms[0] : "all"} onValueChange={(v) => setSelectedPrograms(v === "all" ? [] : [v])}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {PROGRAMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={selectedProjects.length > 0 ? selectedProjects[0] : "all"} onValueChange={(v) => setSelectedProjects(v === "all" ? [] : [v])}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {PROJECTS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search Deliverable..."
                value={deliverableSearch}
                onChange={(e) => setDeliverableSearch(e.target.value)}
                className="w-[150px] h-8 text-xs pl-7"
              />
            </div>

            <div className="flex items-center gap-1 text-xs text-slate-600">
              <span>From:</span>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[120px] h-8 text-xs" />
              <span>To:</span>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[120px] h-8 text-xs" />
            </div>

            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <Switch id="critical-only" checked={showCriticalOnly} onCheckedChange={setShowCriticalOnly} className="data-[state=checked]:bg-[#8B0000]" />
              <label htmlFor="critical-only" className="text-xs text-slate-600 cursor-pointer whitespace-nowrap">
                {showCriticalOnly ? "Critical Only" : "Critical + Near-Critical"}
              </label>
            </div>

            <Select value={selectedImpactAreas.length > 0 ? selectedImpactAreas[0] : "all"} onValueChange={(v) => setSelectedImpactAreas(v === "all" ? [] : [v])}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Impact Area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Impact Areas</SelectItem>
                {IMPACT_AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={selectedOwners.length > 0 ? selectedOwners[0] : "all"} onValueChange={(v) => setSelectedOwners(v === "all" ? [] : [v])}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Owner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Owners</SelectItem>
                {OWNERS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={selectedReasonCodes.length > 0 ? selectedReasonCodes[0] : "all"} onValueChange={(v) => setSelectedReasonCodes(v === "all" ? [] : [v])}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Reason Code" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reason Codes</SelectItem>
                {REASON_CODES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="link" size="sm" className="text-xs h-auto p-0 text-slate-500 ml-auto" onClick={clearAllFilters}>
                Clear all
              </Button>
            )}
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
              {division !== "All" && (
                <Badge variant="secondary" className="text-xs">
                  Division: {division}
                  <button onClick={() => setDivision("All")} className="ml-1 hover:text-red-500"><X className="h-3 w-3" /></button>
                </Badge>
              )}
              {selectedPrograms.map(p => (
                <Badge key={p} variant="secondary" className="text-xs">
                  Program: {p}
                  <button onClick={() => setSelectedPrograms(selectedPrograms.filter(x => x !== p))} className="ml-1 hover:text-red-500"><X className="h-3 w-3" /></button>
                </Badge>
              ))}
              {selectedItem && (
                <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700">
                  Item: {selectedItem}
                  <button onClick={() => setSelectedItem(null)} className="ml-1 hover:text-red-500"><X className="h-3 w-3" /></button>
                </Badge>
              )}
              {selectedDeliverable && (
                <Badge variant="secondary" className="text-xs bg-purple-50 text-purple-700">
                  Deliverable: {selectedDeliverable}
                  <button onClick={() => setSelectedDeliverable(null)} className="ml-1 hover:text-red-500"><X className="h-3 w-3" /></button>
                </Badge>
              )}
              {kpiFilter && (
                <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700">
                  KPI Filter: {kpiFilter === "deliveries" ? "Deliveries at Risk" : kpiFilter === "material" ? "Material Items" : kpiFilter}
                  <button onClick={() => setKpiFilter(null)} className="ml-1 hover:text-red-500"><X className="h-3 w-3" /></button>
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CRITICAL PATH VIEW */}
      {viewMode === "critical" && (
        <>
          {/* DEFINITION LINE */}
          <div className="flex items-center gap-2 px-1 py-2 text-sm text-slate-600">
            <div className="relative group">
              <Info className="h-4 w-4 text-slate-400 cursor-help" />
              <div className="absolute z-30 bottom-full left-0 mb-2 w-[400px] p-3 text-xs bg-slate-900 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <p className="font-medium mb-2">Critical Path Logic:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li><strong>Required Date:</strong> Date the item/activity is needed to hit the milestone</li>
                  <li><strong>Best Available Date:</strong> Earliest date supply/availability makes the item usable</li>
                  <li><strong>Schedule Impact Days:</strong> max(0, Best Available Date - Required Date)</li>
                  <li><strong>Critical:</strong> Schedule Impact Days {'>'} 0 AND pegged to a deliverable/milestone AND no alternate source available</li>
                </ul>
              </div>
            </div>
            <span>Critical Path items are the specific parts/activities that currently gate a delivery or build milestone because the best-available date exceeds the required date and no viable alternate path exists.</span>
          </div>

      {/* EXECUTIVE SUMMARY STRIP - KPIs */}
      <div className="grid grid-cols-5 gap-4">
        <Card
          className={`border-slate-200 cursor-pointer transition-colors hover:border-blue-300 ${kpiFilter === "deliveries" ? "ring-2 ring-blue-500" : ""}`}
          onClick={() => setKpiFilter(kpiFilter === "deliveries" ? null : "deliveries")}
        >
          <CardContent className="p-4">
            <div className="relative group">
              <Info className="absolute top-0 right-0 h-3.5 w-3.5 text-slate-400 cursor-help" />
              <div className="absolute z-30 bottom-full right-0 mb-2 w-[200px] p-2 text-xs bg-slate-900 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Count of deliverables with at least one critical item (slip {'>'} 0).
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-1">Deliveries at Risk</p>
            <p className="text-2xl font-bold text-red-600">{kpis.deliveriesAtRisk}</p>
          </CardContent>
        </Card>

        <Card
          className={`border-slate-200 cursor-pointer transition-colors hover:border-blue-300 ${kpiFilter === "items" ? "ring-2 ring-blue-500" : ""}`}
          onClick={() => { setSelectedDeliverable(null); setKpiFilter(null) }}
        >
          <CardContent className="p-4">
            <div className="relative group">
              <Info className="absolute top-0 right-0 h-3.5 w-3.5 text-slate-400 cursor-help" />
              <div className="absolute z-30 bottom-full right-0 mb-2 w-[200px] p-2 text-xs bg-slate-900 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Count of unique gating items/activities with slip {'>'} 0.
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-1">Critical Items</p>
            <p className="text-2xl font-bold text-slate-900">{kpis.criticalItems}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="relative group">
              <Info className="absolute top-0 right-0 h-3.5 w-3.5 text-slate-400 cursor-help" />
              <div className="absolute z-30 bottom-full right-0 mb-2 w-[200px] p-2 text-xs bg-slate-900 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Minimum Required Date among all critical items.
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-1">Earliest Required Date at Risk</p>
            <p className="text-xl font-bold text-slate-900">{kpis.earliestReqDate ? formatDate(kpis.earliestReqDate) : "N/A"}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="relative group">
              <Info className="absolute top-0 right-0 h-3.5 w-3.5 text-slate-400 cursor-help" />
              <div className="absolute z-30 bottom-full right-0 mb-2 w-[200px] p-2 text-xs bg-slate-900 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Maximum Schedule Impact Days among all critical items.
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-1">Max Projected Slip</p>
            <p className="text-2xl font-bold text-red-600">{kpis.maxSlip} days</p>
          </CardContent>
        </Card>

        <Card
          className={`border-slate-200 cursor-pointer transition-colors hover:border-blue-300 ${kpiFilter === "material" ? "ring-2 ring-blue-500" : ""}`}
          onClick={() => setKpiFilter(kpiFilter === "material" ? null : "material")}
        >
          <CardContent className="p-4">
            <div className="relative group">
              <Info className="absolute top-0 right-0 h-3.5 w-3.5 text-slate-400 cursor-help" />
              <div className="absolute z-30 bottom-full right-0 mb-2 w-[220px] p-2 text-xs bg-slate-900 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Sum of material $ exposure for critical items. Click to filter to material-driven items only.
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-1">Total At-Risk Value</p>
            <p className="text-2xl font-bold text-slate-900">{kpis.totalAtRiskValue > 0 ? formatCurrency(kpis.totalAtRiskValue) : "N/A"}</p>
          </CardContent>
        </Card>
      </div>

      {/* IMPACT VISUAL - Slip by Deliverable */}
      {slipByDeliverableData.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900">Slip by Deliverable (Top 15)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={slipByDeliverableData} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="#94a3b8" domain={[0, "dataMax"]} tickFormatter={(v) => `${v}d`} />
                  <YAxis type="category" dataKey="deliverable" tick={{ fontSize: 10 }} stroke="#94a3b8" width={75} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-white border border-slate-200 rounded-md shadow-lg p-2 text-xs">
                            <p className="font-medium text-slate-900">{data.deliverable}</p>
                            <p className="text-slate-600">Program: {data.program}</p>
                            <p className="text-red-600 font-medium">Slip: {data.maxSlip} days</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="maxSlip" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(data) => setSelectedDeliverable(data.deliverable)}>
                    {slipByDeliverableData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.maxSlip >= 7 ? "#DC2626" : entry.maxSlip >= 4 ? "#F59E0B" : "#3B82F6"}
                        opacity={selectedDeliverable && selectedDeliverable !== entry.deliverable ? 0.3 : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CRITICAL PATH QUEUE - Main Table */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-900">Critical Path Queue</CardTitle>
          <Button variant="outline" size="sm" className="h-8 text-xs bg-transparent">
            <Download className="w-3 h-3 mr-1" /> Export CSV
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {criticalPathData.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm">No critical items matching current filters.</p>
              {hasActiveFilters && <p className="text-xs mt-1">Try adjusting your filter selections.</p>}
            </div>
          ) : (
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow className="border-b border-slate-200">
                    <TableHead className="text-xs font-semibold text-slate-600">Deliverable</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">Milestone</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">Gating Item / Activity</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">Type</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">Parent Rollup</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">Required Date</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">Best Avail Date</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">Slip Days</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">Confidence</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">Reason Code</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">Owner</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">Next Action</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criticalPathData.map((row) => (
                    <TableRow
                      key={row.id}
                      className={`hover:bg-slate-50 cursor-pointer ${row.status === "Resolved" ? "opacity-50" : ""}`}
                      onClick={() => openDrawer(row)}
                    >
                      <TableCell className="text-sm text-[#1D4ED8] font-medium hover:underline">{row.deliverable}</TableCell>
                      <TableCell className="text-sm text-slate-600">{row.milestone}</TableCell>
                      <TableCell>
                        <button
                          className="text-sm text-slate-900 hover:text-[#8B0000] hover:underline text-left"
                          onClick={(e) => { e.stopPropagation(); setSelectedItem(row.gatingItem) }}
                        >
                          {row.gatingItem}
                          <span className="block text-xs text-slate-500">{row.itemDesc}</span>
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${getTypeBadgeColor(row.type)}`}>{row.type}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{row.parentRollup}</TableCell>
                      <TableCell className="text-sm">{formatDate(row.requiredDate)}</TableCell>
                      <TableCell className="text-sm">{formatDate(row.bestAvailDate)}</TableCell>
                      <TableCell className={`text-sm font-bold ${row.slipDays > 0 ? "text-red-600" : "text-slate-900"}`}>
                        {row.slipDays > 0 ? `+${row.slipDays}` : row.slipDays}
                      </TableCell>
                      <TableCell>
                        <div className="relative group">
                          <Badge variant="outline" className={`text-xs ${getConfidenceBadgeColor(row.confidence)}`}>{row.confidence}</Badge>
                          {row.confidence !== "High" && (
                            <div className="absolute z-30 bottom-full left-0 mb-1 w-[180px] p-2 text-xs bg-slate-900 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              {row.confidence === "Medium" ? "Missing one of: supply source, rollup, or owner" : "Best Available Date cannot be computed or pegging unclear"}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">{row.reasonCode}</TableCell>
                      <TableCell className="text-sm text-slate-600">{row.owner}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${getStatusBadgeColor(row.status)}`}>{row.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(row.nextActionDate)}</TableCell>
                      <TableCell>
                        <FileText className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}

      {/* NEAR-CRITICAL VIEW */}
      {viewMode === "near-critical" && (
        <>
          {/* DEFINITION LINE */}
          <div className="flex items-center gap-2 px-1 py-2 text-sm text-slate-600">
            <div className="relative group">
              <Info className="h-4 w-4 text-slate-400 cursor-help" />
              <div className="absolute z-30 bottom-full left-0 mb-2 w-[450px] p-3 text-xs bg-slate-900 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <p className="font-medium mb-2">Near-Critical Definition:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li><strong>Required Date:</strong> Date item/activity is needed for the deliverable/milestone</li>
                  <li><strong>Best Available Date:</strong> Earliest usable availability date from supply/quality/capacity logic</li>
                  <li><strong>Buffer Days:</strong> (Required Date - Best Available Date) when Best Available {"<="} Required Date</li>
                  <li><strong>Slip Days:</strong> max(0, Best Available Date - Required Date)</li>
                </ul>
                <p className="mt-2 font-medium">Near-Critical criteria (default):</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Slip Days = 0 AND</li>
                  <li>(Buffer Days {"<="} Buffer Threshold) OR</li>
                  <li>(Volatility Flag = TRUE: promise changes {">="} threshold in lookback window) OR</li>
                  <li>(Usability Risk Flag = TRUE: on-dock but not usable / quality hold risk)</li>
                </ul>
                <p className="mt-2 text-slate-300">If Best Available Date is unknown: marked as "Data Risk"</p>
              </div>
            </div>
            <span>Near-Critical items are pegged to upcoming deliverables and have zero current slip but limited buffer or unstable availability that could turn into slip.</span>
          </div>

          {/* NEAR-CRITICAL CONTROLS */}
          <div className="flex items-center gap-4 px-1 py-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Buffer threshold:</span>
              <Select value={bufferThreshold.toString()} onValueChange={(v) => setBufferThreshold(Number(v))}>
                <SelectTrigger className="w-[80px] h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 5, 7, 10, 14].map(d => <SelectItem key={d} value={d.toString()}>{d} days</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="relative group">
                <Info className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                <div className="absolute z-30 bottom-full left-0 mb-1 w-[200px] p-2 text-xs bg-slate-900 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Items with buffer at or below this threshold appear as Near-Critical.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Volatility lookback:</span>
              <Select value={volatilityLookback.toString()} onValueChange={(v) => setVolatilityLookback(Number(v))}>
                <SelectTrigger className="w-[80px] h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[30, 60, 90].map(d => <SelectItem key={d} value={d.toString()}>{d} days</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Volatility threshold:</span>
              <Select value={volatilityThreshold.toString()} onValueChange={(v) => setVolatilityThreshold(Number(v))}>
                <SelectTrigger className="w-[100px] h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 5].map(c => <SelectItem key={c} value={c.toString()}>{c} changes</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* NEAR-CRITICAL KPIs */}
          <div className="grid grid-cols-5 gap-4">
            <Card
              className={`border-slate-200 cursor-pointer transition-colors hover:border-blue-300 ${nearCriticalKpiFilter === "deliverables" ? "ring-2 ring-blue-500" : ""}`}
              onClick={() => setNearCriticalKpiFilter(nearCriticalKpiFilter === "deliverables" ? null : "deliverables")}
            >
              <CardContent className="p-4">
                <div className="relative group">
                  <Info className="absolute top-0 right-0 h-3.5 w-3.5 text-slate-400 cursor-help" />
                  <div className="absolute z-30 bottom-full right-0 mb-2 w-[200px] p-2 text-xs bg-slate-900 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Count of deliverables with at least one near-critical item.
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-1">Near-Critical Deliverables</p>
                <p className="text-2xl font-bold text-amber-600">{nearCriticalKpis.nearCriticalDeliverables}</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-4">
                <div className="relative group">
                  <Info className="absolute top-0 right-0 h-3.5 w-3.5 text-slate-400 cursor-help" />
                  <div className="absolute z-30 bottom-full right-0 mb-2 w-[200px] p-2 text-xs bg-slate-900 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Count of unique items/activities meeting near-critical criteria.
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-1">Near-Critical Items</p>
                <p className="text-2xl font-bold text-slate-900">{nearCriticalKpis.nearCriticalItems}</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-4">
                <div className="relative group">
                  <Info className="absolute top-0 right-0 h-3.5 w-3.5 text-slate-400 cursor-help" />
                  <div className="absolute z-30 bottom-full right-0 mb-2 w-[200px] p-2 text-xs bg-slate-900 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Minimum Buffer Days among all near-critical items.
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-1">Minimum Buffer</p>
                <p className="text-2xl font-bold text-amber-600">{nearCriticalKpis.minBuffer !== null ? `${nearCriticalKpis.minBuffer}d` : "N/A"}</p>
              </CardContent>
            </Card>

            <Card
              className={`border-slate-200 cursor-pointer transition-colors hover:border-blue-300 ${nearCriticalKpiFilter === "highVolatility" ? "ring-2 ring-blue-500" : ""}`}
              onClick={() => setNearCriticalKpiFilter(nearCriticalKpiFilter === "highVolatility" ? null : "highVolatility")}
            >
              <CardContent className="p-4">
                <div className="relative group">
                  <Info className="absolute top-0 right-0 h-3.5 w-3.5 text-slate-400 cursor-help" />
                  <div className="absolute z-30 bottom-full right-0 mb-2 w-[220px] p-2 text-xs bg-slate-900 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Count of items where Volatility Flag = TRUE (promise changes {">="} threshold in lookback).
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-1">High Volatility Items</p>
                <p className="text-2xl font-bold text-purple-600">{nearCriticalKpis.highVolatilityCount}</p>
              </CardContent>
            </Card>

            <Card
              className={`border-slate-200 cursor-pointer transition-colors hover:border-blue-300 ${nearCriticalKpiFilter === "wouldBe" ? "ring-2 ring-blue-500" : ""}`}
              onClick={() => setNearCriticalKpiFilter(nearCriticalKpiFilter === "wouldBe" ? null : "wouldBe")}
            >
              <CardContent className="p-4">
                <div className="relative group">
                  <Info className="absolute top-0 right-0 h-3.5 w-3.5 text-slate-400 cursor-help" />
                  <div className="absolute z-30 bottom-full right-0 mb-2 w-[250px] p-2 text-xs bg-slate-900 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Items that would become blockers if Best Available Date moves by +7 days. Would-Be Blocker if (Best Available Date + 7 days) {">"} Required Date.
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-1">Would-Be Blockers (7d)</p>
                <p className="text-2xl font-bold text-red-600">{nearCriticalKpis.wouldBeBlockers}</p>
              </CardContent>
            </Card>
          </div>

          {/* NEAR-CRITICAL HEATMAP */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-900">Near-Critical Exposure</CardTitle>
              <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5">
                <button
                  onClick={() => setHeatmapViewBy("deliverable")}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${heatmapViewBy === "deliverable" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                >
                  By Deliverable
                </button>
                <button
                  onClick={() => setHeatmapViewBy("assembly")}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${heatmapViewBy === "assembly" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                >
                  By Assembly
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {Object.keys(nearCriticalHeatmapData.matrix).length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">No near-critical items to display in heatmap.</div>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-slate-200">
                        <TableHead className="text-xs font-semibold text-slate-600 w-[150px]">
                          {heatmapViewBy === "deliverable" ? "Deliverable" : "Assembly"}
                        </TableHead>
                        {nearCriticalHeatmapData.impactAreas.map(area => (
                          <TableHead key={area} className="text-xs font-semibold text-slate-600 text-center">{area}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(nearCriticalHeatmapData.matrix).slice(0, 15).map(([rowKey, cells]) => (
                        <TableRow key={rowKey} className="hover:bg-slate-50">
                          <TableCell className="text-xs font-medium text-slate-700">{rowKey}</TableCell>
                          {nearCriticalHeatmapData.impactAreas.map(area => {
                            const cell = cells[area]
                            if (!cell || cell.count === 0) {
                              return <TableCell key={area} className="text-center text-xs text-slate-300">-</TableCell>
                            }
                            const intensity = cell.minBuffer <= 3 ? "bg-red-100 text-red-700" : cell.minBuffer <= 5 ? "bg-amber-100 text-amber-700" : "bg-yellow-50 text-yellow-700"
                            return (
                              <TableCell
                                key={area}
                                className={`text-center cursor-pointer hover:ring-2 hover:ring-blue-300 ${intensity}`}
                                onClick={() => { setSelectedDeliverable(heatmapViewBy === "deliverable" ? rowKey : null); setSelectedImpactAreas([area]) }}
                              >
                                <span className="text-xs font-medium">{cell.count}</span>
                                <span className="block text-[10px]">{cell.minBuffer}d buf</span>
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* NEAR-CRITICAL QUEUE */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900">Near-Critical Queue</CardTitle>
              <Button variant="outline" size="sm" className="h-8 text-xs bg-transparent">
                <Download className="w-3 h-3 mr-1" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {nearCriticalData.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-sm">No near-critical items matching current filters and thresholds.</p>
                  <p className="text-xs mt-1">Try adjusting buffer threshold or volatility settings.</p>
                </div>
              ) : (
                <div className="max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow className="border-b border-slate-200">
                        <TableHead className="text-xs font-semibold text-slate-600">Deliverable</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Milestone</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Item / Activity</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Type</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Parent Rollup</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Required Date</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Best Avail Date</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Buffer Days</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Volatility</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Trigger</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Owner</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Rec. Action</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Status</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Next Action</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {nearCriticalData.map((row) => (
                        <TableRow
                          key={row.id}
                          className={`hover:bg-slate-50 cursor-pointer ${row.status === "Resolved" ? "opacity-50" : ""}`}
                          onClick={() => openDrawer({ ...row, isNearCritical: true })}
                        >
                          <TableCell className="text-sm text-[#1D4ED8] font-medium hover:underline">{row.deliverable}</TableCell>
                          <TableCell className="text-sm text-slate-600">{row.milestone}</TableCell>
                          <TableCell>
                            <button
                              className="text-sm text-slate-900 hover:text-[#8B0000] hover:underline text-left"
                              onClick={(e) => { e.stopPropagation(); setSelectedItem(row.gatingItem) }}
                            >
                              {row.gatingItem}
                              <span className="block text-xs text-slate-500">{row.itemDesc}</span>
                            </button>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${getTypeBadgeColor(row.type)}`}>{row.type}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">{row.parentRollup}</TableCell>
                          <TableCell className="text-sm">{formatDate(row.requiredDate)}</TableCell>
                          <TableCell className="text-sm">{row.bestAvailDate === "Unknown" ? <span className="text-slate-400">Unknown</span> : formatDate(row.bestAvailDate)}</TableCell>
                          <TableCell className={`text-sm font-bold ${row.bufferDays !== null && row.bufferDays <= bufferThreshold ? "text-amber-600" : "text-green-600"}`}>
                            {row.bufferDays !== null ? row.bufferDays : <span className="text-slate-400">Unknown</span>}
                          </TableCell>
                          <TableCell className={`text-sm ${row.volatilityFlag ? "text-purple-600 font-medium" : "text-slate-600"}`}>
                            {row.volatilityScore !== null ? row.volatilityScore : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${getTriggerBadgeColor(row.trigger)}`}>{row.trigger}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">{row.owner}</TableCell>
                          <TableCell className="text-xs text-slate-600 max-w-[120px] truncate" title={getRecommendedAction(row)}>
                            {getRecommendedAction(row)}
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${getStatusBadgeColor(row.status)}`}>{row.status}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{formatDate(row.nextActionDate)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => { e.stopPropagation(); alert("Promote to Critical: " + row.gatingItem) }}
                                title="Promote to Critical"
                              >
                                Promote
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* DRILLDOWN DRAWER */}
      {drawerOpen && drawerData && (
        <div className="fixed inset-y-0 right-0 w-[480px] bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col">
          {/* Drawer Header */}
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-slate-900">
                {drawerData.isNearCritical ? "Near-Critical Detail" : "Critical Path Detail"}
              </h3>
              <button onClick={() => setDrawerOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-[#1D4ED8]">{drawerData.deliverable}</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600">{drawerData.milestone}</span>
            </div>
            <div className="flex items-center gap-3 mt-2">
              {drawerData.isNearCritical ? (
                <>
                  <Badge className="text-xs bg-amber-100 text-amber-800">
                    Buffer: {drawerData.bufferDays !== null ? `${drawerData.bufferDays}d` : "Unknown"}
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${getTriggerBadgeColor(drawerData.trigger)}`}>
                    {drawerData.trigger}
                  </Badge>
                </>
              ) : (
                <Badge className={`text-xs ${drawerData.slipDays > 0 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                  Slip: {drawerData.slipDays > 0 ? `+${drawerData.slipDays}` : drawerData.slipDays} days
                </Badge>
              )}
              <span className="text-xs text-slate-500">Owner: {drawerData.owner}</span>
              <Badge className={`text-xs ${getStatusBadgeColor(drawerData.status)}`}>{drawerData.status}</Badge>
            </div>
          </div>

          {/* Drawer Tabs */}
          <Tabs value={drawerTab} onValueChange={setDrawerTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full justify-start px-4 pt-2 bg-white border-b border-slate-100 rounded-none h-auto flex-wrap">
              <TabsTrigger value="summary" className="text-xs">Summary</TabsTrigger>
              <TabsTrigger value="pegging" className="text-xs">Pegging</TabsTrigger>
              {drawerData.type === "Material" && <TabsTrigger value="supply" className="text-xs">Supply</TabsTrigger>}
              {(drawerData.type === "Quality Hold" || drawerData.qualityRecords) && <TabsTrigger value="quality" className="text-xs">Quality</TabsTrigger>}
              {(drawerData.type === "Labor/Capacity" || drawerData.type === "Rework") && <TabsTrigger value="capacity" className="text-xs">Capacity</TabsTrigger>}
              {drawerData.isNearCritical && <TabsTrigger value="stability" className="text-xs">Stability</TabsTrigger>}
              <TabsTrigger value="cost" className="text-xs">Cost Impact</TabsTrigger>
              <TabsTrigger value="actions" className="text-xs">Actions</TabsTrigger>
              <TabsTrigger value="links" className="text-xs">Links</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto p-4">
              {/* Summary Tab */}
              <TabsContent value="summary" className="m-0 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Required Date</p>
                    <p className="text-sm font-medium">{formatDate(drawerData.requiredDate)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Best Available Date</p>
                    <p className="text-sm font-medium">{formatDate(drawerData.bestAvailDate)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Schedule Impact</p>
                    <p className={`text-sm font-bold ${drawerData.slipDays > 0 ? "text-red-600" : "text-green-600"}`}>
                      {drawerData.slipDays > 0 ? `+${drawerData.slipDays}` : drawerData.slipDays} days
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Confidence</p>
                    <Badge variant="outline" className={`text-xs ${getConfidenceBadgeColor(drawerData.confidence)}`}>{drawerData.confidence}</Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500">Type</span>
                    <Badge variant="outline" className={`text-xs ${getTypeBadgeColor(drawerData.type)}`}>{drawerData.type}</Badge>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500">Reason Code</span>
                    <span className="text-sm font-medium">{drawerData.reasonCode}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500">Parent Rollup</span>
                    <span className="text-sm text-slate-700">{drawerData.parentRollup}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500">At-Risk Value</span>
                    <span className="text-sm font-medium">{drawerData.atRiskValue ? formatCurrency(drawerData.atRiskValue) : "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500">Program</span>
                    <span className="text-sm">{drawerData.program}</span>
                  </div>
                </div>

                {/* Near-Critical Reason Card - only for Near-Critical items */}
                {drawerData.isNearCritical && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <p className="text-xs text-purple-700 font-medium mb-2">Near-Critical Reason</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-purple-600">Trigger</span>
                        <Badge variant="outline" className={`text-xs ${getTriggerBadgeColor(drawerData.trigger)}`}>{drawerData.trigger}</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-purple-600">Buffer Days</span>
                        <span className="font-medium">{drawerData.bufferDays !== null ? `${drawerData.bufferDays} days` : "Unknown"}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-purple-600">Buffer Threshold</span>
                        <span className="text-slate-600">{bufferThreshold} days</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-purple-600">Volatility Score</span>
                        <span className={`font-medium ${drawerData.volatilityFlag ? "text-purple-700" : "text-slate-600"}`}>
                          {drawerData.volatilityScore !== null ? `${drawerData.volatilityScore} changes` : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-purple-600">Volatility Threshold</span>
                        <span className="text-slate-600">{volatilityThreshold} changes / {volatilityLookback} days</span>
                      </div>
                    </div>
                  </div>
                )}

                {drawerData.notes && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs text-amber-700 font-medium mb-1">Notes</p>
                    <p className="text-sm text-amber-800">{drawerData.notes}</p>
                  </div>
                )}
              </TabsContent>

              {/* Pegging Tab */}
              <TabsContent value="pegging" className="m-0">
                <p className="text-xs text-slate-500 mb-3">Dependency chain showing why this item is critical:</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="text-sm font-medium text-purple-700">Deliverable: {drawerData.deliverable}</span>
                  </div>
                  <div className="flex items-center pl-4">
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200 ml-4">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-sm font-medium text-blue-700">Assembly: {drawerData.parentRollup?.split(" / ")[1] || "Main Assembly"}</span>
                  </div>
                  <div className="flex items-center pl-8">
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-lg border border-slate-300 ml-8">
                    <div className="w-2 h-2 rounded-full bg-slate-500" />
                    <span className="text-sm font-medium text-slate-700">Subassembly: {drawerData.parentRollup?.split(" / ")[0] || "Subassembly"}</span>
                  </div>
                  <div className="flex items-center pl-12">
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-300 ml-12">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <div>
                      <span className="text-sm font-medium text-red-700">Gating Item: {drawerData.gatingItem}</span>
                      <p className="text-xs text-red-600">{drawerData.itemDesc}</p>
                    </div>
                  </div>
                  <div className="flex items-center pl-16">
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-300 ml-16">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-sm font-medium text-amber-700">
                      Source: {drawerData.type === "Material" ? (drawerData.poId || "Stock") : drawerData.type === "Labor/Capacity" ? "Capacity Constraint" : drawerData.type}
                    </span>
                  </div>
                </div>
              </TabsContent>

              {/* Supply Tab */}
              <TabsContent value="supply" className="m-0 space-y-4">
                <p className="text-xs text-slate-500 mb-3">Supply sources contributing to Best Available Date:</p>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500">On-Hand Qty</span>
                    <span className="text-sm font-medium">{drawerData.onHand ?? "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500">Supplier</span>
                    <span className="text-sm font-medium text-[#8B0000]">{drawerData.supplier || "N/A"}</span>
                  </div>
                </div>
                {drawerData.openPOs && drawerData.openPOs.length > 0 ? (
                  <div>
                    <p className="text-xs text-slate-500 mb-2">Open POs:</p>
                    {drawerData.openPOs.map((po: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200 mb-2">
                        <div>
                          <span className="text-sm font-medium text-blue-700">{po.po}</span>
                          <p className="text-xs text-blue-600">Promise: {formatDate(po.promise)} | Qty: {po.qty}</p>
                        </div>
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">Driving Date</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-slate-400 text-sm">No open POs.</div>
                )}

                {/* Running Balance Strip */}
                <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
                    <p className="text-xs font-medium text-slate-700">Running Balance</p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-xs py-2 h-auto">Date</TableHead>
                        <TableHead className="text-xs py-2 h-auto text-right">Supply +</TableHead>
                        <TableHead className="text-xs py-2 h-auto text-right">Demand -</TableHead>
                        <TableHead className="text-xs py-2 h-auto text-right">Cum Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        // Build running balance data from on-hand, open POs, and demand
                        const onHand = drawerData.onHand || 0
                        const demandQty = drawerData.qtyRequired || 10
                        const entries: { date: string; supply: number; demand: number; cumBalance: number; isBestAvailable: boolean }[] = []
                        
                        // Start with on-hand inventory (today)
                        let cumBalance = onHand
                        entries.push({
                          date: "Today (On-Hand)",
                          supply: onHand,
                          demand: 0,
                          cumBalance,
                          isBestAvailable: cumBalance >= demandQty
                        })
                        
                        // Add demand date
                        const demandDate = drawerData.needDate || new Date().toISOString().split("T")[0]
                        cumBalance -= demandQty
                        entries.push({
                          date: formatDate(demandDate) + " (Demand)",
                          supply: 0,
                          demand: demandQty,
                          cumBalance,
                          isBestAvailable: false
                        })
                        
                        // Add open PO receipts
                        if (drawerData.openPOs && drawerData.openPOs.length > 0) {
                          drawerData.openPOs.forEach((po: any) => {
                            cumBalance += po.qty
                            const crossesZero = cumBalance >= 0 && (cumBalance - po.qty) < 0
                            entries.push({
                              date: formatDate(po.promise) + ` (${po.po})`,
                              supply: po.qty,
                              demand: 0,
                              cumBalance,
                              isBestAvailable: crossesZero
                            })
                          })
                        }
                        
                        // Sort by date logic (keep Today first, then sort rest)
                        const sortedEntries = [entries[0], ...entries.slice(1).sort((a, b) => {
                          const dateA = a.date.includes("Demand") ? demandDate : drawerData.openPOs?.find((po: any) => a.date.includes(po.po))?.promise || ""
                          const dateB = b.date.includes("Demand") ? demandDate : drawerData.openPOs?.find((po: any) => b.date.includes(po.po))?.promise || ""
                          return new Date(dateA).getTime() - new Date(dateB).getTime()
                        })]
                        
                        // Recalculate cumulative balance in sorted order
                        let runningBal = 0
                        let prevBal = 0
                        const finalEntries: typeof sortedEntries = []
                        for (let idx = 0; idx < sortedEntries.length; idx++) {
                          const entry = sortedEntries[idx]
                          if (idx === 0) {
                            runningBal = entry.supply - entry.demand
                          } else {
                            runningBal += entry.supply - entry.demand
                          }
                          const crossesZero = runningBal >= 0 && prevBal < 0
                          finalEntries.push({ ...entry, cumBalance: runningBal, isBestAvailable: crossesZero })
                          prevBal = runningBal
                        }
                        
                        return finalEntries.map((entry, idx) => (
                          <TableRow
                            key={idx}
                            className={entry.isBestAvailable ? "bg-green-50 border-l-4 border-l-green-500" : ""}
                          >
                            <TableCell className="text-xs py-2">
                              <div className="flex items-center gap-2">
                                {entry.date}
                                {entry.isBestAvailable && (
                                  <Badge variant="outline" className="text-[10px] bg-green-100 text-green-700 border-green-300">
                                    Best Available Date
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className={`text-xs py-2 text-right font-medium ${entry.supply > 0 ? "text-green-600" : "text-slate-400"}`}>
                              {entry.supply > 0 ? `+${entry.supply}` : "-"}
                            </TableCell>
                            <TableCell className={`text-xs py-2 text-right font-medium ${entry.demand > 0 ? "text-red-600" : "text-slate-400"}`}>
                              {entry.demand > 0 ? `-${entry.demand}` : "-"}
                            </TableCell>
                            <TableCell className={`text-xs py-2 text-right font-bold ${entry.cumBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {entry.cumBalance}
                            </TableCell>
                          </TableRow>
                        ))
                      })()}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Quality Tab */}
              <TabsContent value="quality" className="m-0 space-y-4">
                {drawerData.qualityRecords && drawerData.qualityRecords.length > 0 ? (
                  <>
                    <p className="text-xs text-slate-500 mb-3">Linked quality records:</p>
                    {drawerData.qualityRecords.map((rec: any, idx: number) => (
                      <div key={idx} className="p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-red-700">{rec.id}</span>
                          <Badge variant="outline" className="text-xs">{rec.type}</Badge>
                        </div>
                        <div className="space-y-1 text-xs text-red-600">
                          <p><strong>Reason:</strong> {rec.reason}</p>
                          <p><strong>Age:</strong> {rec.age} days</p>
                          <p><strong>Disposition:</strong> {rec.disposition}</p>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="text-center py-8 text-slate-400 text-sm">No linked quality records.</div>
                )}
              </TabsContent>

              {/* Capacity Tab */}
              <TabsContent value="capacity" className="m-0 space-y-4">
                {drawerData.capacityData ? (
                  <>
                    <p className="text-xs text-slate-500 mb-3">Labor/Capacity analysis for the relevant period:</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500">Required Hours</p>
                        <p className="text-lg font-bold text-slate-900">{drawerData.capacityData.required}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500">Available Hours</p>
                        <p className="text-lg font-bold text-green-600">{drawerData.capacityData.available}</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3">
                        <p className="text-xs text-red-500">Gap</p>
                        <p className="text-lg font-bold text-red-600">{drawerData.capacityData.gap} hrs</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500">Constraint Type</p>
                        <Badge variant="outline" className="text-xs">{drawerData.capacityData.constraintType}</Badge>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-slate-400 text-sm">Capacity data not available.</div>
                )}
              </TabsContent>

              {/* Cost Impact Tab */}
              <TabsContent value="cost" className="m-0 space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500">At-Risk Material Value</span>
                    <span className="text-sm font-medium">{drawerData.atRiskValue ? formatCurrency(drawerData.atRiskValue) : "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500">Cost Impact Type</span>
                    <span className="text-sm text-slate-400 relative group cursor-help">
                      N/A
                      <span className="absolute bottom-full right-0 mb-1 w-[180px] p-2 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        Requires cost driver tagging.
                      </span>
                    </span>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
                  Cost impact attribution (PPV, Scrap, Expedite, Mix/Other) requires integration with variance driver tagging system.
                </div>
              </TabsContent>

              {/* Actions Tab */}
              <TabsContent value="actions" className="m-0 space-y-4">
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Initial Assessment</span>
                      <Badge className="text-xs bg-green-100 text-green-800">Complete</Badge>
                    </div>
                    <p className="text-xs text-slate-600">Owner: {drawerData.owner} | Due: {formatDate(drawerData.requiredDate)}</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Mitigation Plan</span>
                      <Badge className="text-xs bg-amber-100 text-amber-800">In Progress</Badge>
                    </div>
                    <p className="text-xs text-amber-600">Owner: {drawerData.owner} | Due: {formatDate(drawerData.nextActionDate)}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs text-slate-500 mb-2">Notes</p>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 min-h-[80px] text-sm text-slate-700">
                    {drawerData.notes || "No notes available."}
                  </div>
                </div>
              </TabsContent>

              {/* Stability Tab - Only for Near-Critical items */}
              <TabsContent value="stability" className="m-0 space-y-4">
                <p className="text-xs text-slate-500 mb-3">Promise date history and volatility analysis for the driving supply record:</p>
                
                {drawerData.promiseHistory && drawerData.promiseHistory.length > 0 ? (
                  <>
                    {/* Promise Date History */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
                        <p className="text-xs font-medium text-slate-700">Promise Date History</p>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="text-xs py-2 h-auto">Change Date</TableHead>
                            <TableHead className="text-xs py-2 h-auto">Promise Date</TableHead>
                            <TableHead className="text-xs py-2 h-auto">Direction</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {drawerData.promiseHistory.map((entry: { date: string; promise: string }, idx: number) => {
                            const prevPromise = idx > 0 ? new Date(drawerData.promiseHistory[idx - 1].promise) : null
                            const currentPromise = new Date(entry.promise)
                            const direction = prevPromise ? (currentPromise > prevPromise ? "Pushed Out" : currentPromise < prevPromise ? "Pulled In" : "No Change") : "Initial"
                            const dirColor = direction === "Pushed Out" ? "text-red-600" : direction === "Pulled In" ? "text-green-600" : "text-slate-500"
                            
                            return (
                              <TableRow key={idx}>
                                <TableCell className="text-xs py-2">{formatDate(entry.date)}</TableCell>
                                <TableCell className="text-xs py-2 font-medium">{formatDate(entry.promise)}</TableCell>
                                <TableCell className={`text-xs py-2 ${dirColor}`}>{direction}</TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Changes Summary */}
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-purple-700">Total Promise Changes ({volatilityLookback}d lookback)</span>
                        <span className={`text-lg font-bold ${(drawerData.volatilityScore || 0) >= volatilityThreshold ? "text-purple-700" : "text-slate-700"}`}>
                          {drawerData.volatilityScore || drawerData.promiseHistory.length - 1}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm text-purple-600">Volatility Threshold</span>
                        <span className="text-sm text-slate-600">{volatilityThreshold} changes</span>
                      </div>
                      {(drawerData.volatilityScore || drawerData.promiseHistory.length - 1) >= volatilityThreshold && (
                        <div className="mt-2 pt-2 border-t border-purple-200">
                          <p className="text-xs text-purple-800 font-medium">High volatility detected - supplier reconfirmation recommended</p>
                        </div>
                      )}
                    </div>

                    {/* Supplier Performance Flags (if available) */}
                    <div className="border border-slate-200 rounded-lg p-3">
                      <p className="text-xs font-medium text-slate-700 mb-2">Supplier Performance Indicators</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">On-Time Delivery (OTD)</span>
                          <span className="font-medium text-amber-600">78% (Below Target)</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Quality Reject Rate</span>
                          <span className="font-medium text-green-600">1.2% (On Target)</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Lead Time Trend</span>
                          <span className="font-medium text-red-600">Increasing</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-sm text-slate-500">Promise history not available</p>
                    <p className="text-xs text-slate-400 mt-1">Volatility score not computed from history.</p>
                  </div>
                )}
              </TabsContent>

              {/* Links Tab */}
              <TabsContent value="links" className="m-0 space-y-3">
                <p className="text-xs text-slate-500 mb-3">Navigate to related pages:</p>
                {drawerData.supplier && (
                  <button className="w-full flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                    <span className="text-sm font-medium text-slate-700">Supplier Performance</span>
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                  </button>
                )}
                {drawerData.qualityRecords && drawerData.qualityRecords.length > 0 && (
                  <button className="w-full flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                    <span className="text-sm font-medium text-slate-700">Quality Backlog</span>
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                  </button>
                )}
                {drawerData.capacityData && (
                  <button className="w-full flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                    <span className="text-sm font-medium text-slate-700">Labor / HPU Dashboard</span>
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                  </button>
                )}
                <button className="w-full flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                  <span className="text-sm font-medium text-slate-700">EAC / CPU Dashboard</span>
                  <ExternalLink className="w-4 h-4 text-slate-400" />
                </button>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      )}

      {/* Drawer backdrop */}
      {drawerOpen && <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setDrawerOpen(false)} />}
    </div>
  )
}
