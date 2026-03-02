"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell, BarChart, Bar } from "recharts"
import { Info, X, Download, ChevronRight, ChevronDown, Search, FileText, ExternalLink, AlertTriangle, Clock, Package, TrendingUp, Star, Factory, Layers, Users, Building2, CircleDot } from "lucide-react"

// Format helpers
const formatDate = (dateStr: string) => {
  if (!dateStr || dateStr === "Unknown") return "Unknown"
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return "N/A"
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat("en-US").format(value)
}

// Constants
const DIVISIONS = ["All", "Defense Electronics", "Communications", "Aerospace Systems"]
const PROGRAMS = ["Manpack Radio Program", "Vehicle Mount System", "Tactical HF Radio", "Base Station Program", "Portable Comm System"]
const PROJECTS = ["PRJ-2026-001", "PRJ-2026-002", "PRJ-2026-003", "PRJ-2026-004", "PRJ-2026-005"]
const ASSEMBLIES = ["Main Assembly", "RF Subassembly", "Power Module", "Display Unit", "Antenna Module", "Audio Module", "Control Unit"]
const MAJOR_SUBASSEMBLIES = ["MSA-001 Receiver", "MSA-002 Transmitter", "MSA-003 Power Supply", "MSA-004 Display Module", "MSA-005 Antenna Array"]
const COMMODITIES = ["Semiconductors", "Passive Components", "Connectors", "Displays", "Power Management", "RF Components", "Memory"]
const SUPPLIERS = ["Analog Devices", "Murata", "Amphenol", "Samsung Display", "Texas Instruments", "Xilinx/AMD", "Micron", "Wolfspeed", "Epson", "Renesas"]
const WORKSTATIONS = [
  { id: "WC-001", name: "SMT Line 1", majorSubassembly: "MSA-001 Receiver" },
  { id: "WC-002", name: "SMT Line 2", majorSubassembly: "MSA-001 Receiver" },
  { id: "WC-003", name: "Final Assembly A", majorSubassembly: "MSA-002 Transmitter" },
  { id: "WC-004", name: "Test Station 1", majorSubassembly: "MSA-002 Transmitter" },
  { id: "WC-005", name: "Power Module Cell", majorSubassembly: "MSA-003 Power Supply" },
  { id: "WC-006", name: "Display Integration", majorSubassembly: "MSA-004 Display Module" },
  { id: "WC-007", name: "RF Assembly Cell", majorSubassembly: "MSA-005 Antenna Array" },
  { id: "WC-008", name: "Harness Assembly", majorSubassembly: "MSA-001 Receiver" },
]
const DEMAND_TYPES = ["Firm Orders", "Forecast", "Open Quotes"]
const STATUSES = ["Monitoring", "Investigating", "Mitigation", "Resolved"]
const RISK_LEVELS = ["Critical", "High", "Medium", "Low"]

export function LongLeadShortageRisk() {
  // View mode: "shortage" or "long-lead"
  const [viewMode, setViewMode] = useState<"shortage" | "long-lead">("shortage")

  // Workflow mode for Shortage tab - now includes persona-based views
  const [workflowMode, setWorkflowMode] = useState<"supply-chain" | "production-control" | "floor-technician" | "program-manager" | "material-planner" | "quality-engineer">("supply-chain")

  // Global Filters
  const [division, setDivision] = useState("All")
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([])
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [selectedAssemblies, setSelectedAssemblies] = useState<string[]>([])
  const [selectedMajorSubassemblies, setSelectedMajorSubassemblies] = useState<string[]>([])
  const [selectedCommodities, setSelectedCommodities] = useState<string[]>([])
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])
  const [selectedWorkstations, setSelectedWorkstations] = useState<string[]>([])
  const [partSearch, setPartSearch] = useState("")
  const [horizonFrom, setHorizonFrom] = useState("2026-01-30")
  const [horizonTo, setHorizonTo] = useState("2026-07-30")
  const [demandTypesIncluded, setDemandTypesIncluded] = useState<string[]>(["Firm Orders", "Forecast", "Open Quotes"])
  const [nettingMode, setNettingMode] = useState<"global" | "pegged">("pegged")
  const [showMode, setShowMode] = useState<"all" | "shortage" | "safe">("all")

  // Shortage-specific controls
  const [timeBucket, setTimeBucket] = useState<"day" | "week">("week")
  const [heatmapToggle, setHeatmapToggle] = useState<"qty" | "value">("qty")
  const [heatmapViewBy, setHeatmapViewBy] = useState<"part" | "commodity" | "supplier" | "msa">("part")
  const [shortageKpiFilter, setShortageKpiFilter] = useState<string | null>(null)

  // Production Control specific - Hierarchy navigation: Program -> MSA -> Workstation
  const [pcSelectedProgram, setPcSelectedProgram] = useState<string | null>(null)
  const [pcSelectedMSA, setPcSelectedMSA] = useState<string | null>(null)
  const [pcSelectedWorkstation, setPcSelectedWorkstation] = useState<string | null>(null)
  const [selectedWorkCell, setSelectedWorkCell] = useState<string | null>(null)
  const [favoriteWorkCells, setFavoriteWorkCells] = useState<string[]>(["WC-001", "WC-003"])
  const [expandedMSAs, setExpandedMSAs] = useState<string[]>(["MSA-001 Receiver"])
  const [nextWorkWindow, setNextWorkWindow] = useState(14)
  const [showAllTrackedParts, setShowAllTrackedParts] = useState(false)

  // Long-Lead specific controls
  const [longLeadThreshold, setLongLeadThreshold] = useState(60)
  const [marginThreshold, setMarginThreshold] = useState(10)
  const [longLeadKpiFilter, setLongLeadKpiFilter] = useState<string | null>(null)

  // Selection state
  const [selectedPart, setSelectedPart] = useState<string | null>(null)

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerData, setDrawerData] = useState<any>(null)
  const [drawerTab, setDrawerTab] = useState("summary")

  // Sample Shortage Data with enhanced fields
  const shortageData = useMemo(() => {
    const items = [
      { id: "SH-001", partNumber: "PN-RF-AMP-100", partDesc: "RF Amplifier Module 5W", parentRollup: "RF Subassembly / Main Assembly", commodity: "RF Components", supplier: "Analog Devices", majorSubassembly: "MSA-001 Receiver", workstation: "WC-001", firstShortageDate: "2026-02-15", daysUntilShortage: 16, peakShortageQty: 45, peakShortageValue: 67500, supplyDriver: "PO-2026-0180", supplyDriverDate: "2026-02-20", bestAvailableDate: "2026-02-20", impactedDeliverables: ["DEL-2026-0045", "DEL-2026-0052"], demandMix: { firm: 60, forecast: 30, quote: 10 }, leadTime: 42, ltMargin: -5, owner: "John Smith", status: "Investigating", nextActionDate: "2026-02-05", notes: "Alternate source qualified", rootCause: "Supplier capacity constraint", recommendedAction: "Expedite PO or use alternate", riskLevel: "High", onHand: 20, openPOs: [{ po: "PO-2026-0180", promise: "2026-02-20", qty: 50 }], unitCost: 1500, program: "Manpack Radio Program", project: "PRJ-2026-001", division: "Defense Electronics", assembly: "RF Subassembly", nettedAvailability: [{ week: "W05", startingOH: 20, supplyIn: 0, demandOut: 35, endingNA: -15 }, { week: "W06", startingOH: -15, supplyIn: 0, demandOut: 25, endingNA: -40 }, { week: "W07", startingOH: -40, supplyIn: 50, demandOut: 5, endingNA: 5 }], demandBreakdown: [{ deliverable: "DEL-2026-0045", needDate: "2026-02-15", type: "Firm Orders", qty: 35, priority: "High" }, { deliverable: "DEL-2026-0052", needDate: "2026-02-22", type: "Firm Orders", qty: 25, priority: "Medium" }], supplyBreakdown: [{ sourceType: "On-hand", sourceId: "INV-001", receiptDate: "Available", qty: 20, usability: "Usable" }, { sourceType: "PO", sourceId: "PO-2026-0180", receiptDate: "2026-02-20", qty: 50, usability: "Pending Receipt" }], workCellImpact: [{ workCell: "WC-001", workCellName: "SMT Line 1", blockedWorkOrders: ["WO-2026-101", "WO-2026-102"], status: "At-Risk" }] },
      { id: "SH-002", partNumber: "PN-BATT-CELL", partDesc: "Lithium Battery Cell 3.7V", parentRollup: "Power Module / Main Assembly", commodity: "Power Management", supplier: "Samsung Display", majorSubassembly: "MSA-003 Power Supply", workstation: "WC-005", firstShortageDate: "2026-02-10", daysUntilShortage: 11, peakShortageQty: 120, peakShortageValue: 14400, supplyDriver: "PO-2026-0165", supplyDriverDate: "2026-02-18", bestAvailableDate: "2026-02-18", impactedDeliverables: ["DEL-2026-0045", "DEL-2026-0058", "DEL-2026-0061"], demandMix: { firm: 80, forecast: 15, quote: 5 }, leadTime: 28, ltMargin: -8, owner: "Sarah Martinez", status: "Mitigation", nextActionDate: "2026-02-03", notes: "Expedite fee approved", rootCause: "Demand spike from forecast change", recommendedAction: "Accept expedite fee", riskLevel: "Critical", onHand: 80, openPOs: [{ po: "PO-2026-0165", promise: "2026-02-18", qty: 200 }], unitCost: 120, program: "Manpack Radio Program", project: "PRJ-2026-001", division: "Defense Electronics", assembly: "Power Module", nettedAvailability: [{ week: "W05", startingOH: 80, supplyIn: 0, demandOut: 150, endingNA: -70 }, { week: "W06", startingOH: -70, supplyIn: 0, demandOut: 50, endingNA: -120 }, { week: "W07", startingOH: -120, supplyIn: 200, demandOut: 30, endingNA: 50 }], demandBreakdown: [{ deliverable: "DEL-2026-0045", needDate: "2026-02-10", type: "Firm Orders", qty: 100, priority: "High" }, { deliverable: "DEL-2026-0058", needDate: "2026-02-15", type: "Firm Orders", qty: 50, priority: "High" }, { deliverable: "DEL-2026-0061", needDate: "2026-02-20", type: "Forecast", qty: 50, priority: "Medium" }], supplyBreakdown: [{ sourceType: "On-hand", sourceId: "INV-002", receiptDate: "Available", qty: 80, usability: "Usable" }, { sourceType: "PO", sourceId: "PO-2026-0165", receiptDate: "2026-02-18", qty: 200, usability: "Pending Receipt" }], workCellImpact: [{ workCell: "WC-005", workCellName: "Power Module Cell", blockedWorkOrders: ["WO-2026-201", "WO-2026-202", "WO-2026-203"], status: "Blocked" }] },
      { id: "SH-003", partNumber: "PN-CONN-MIL", partDesc: "MIL-SPEC Connector 38999", parentRollup: "Harness Assembly / Main Assembly", commodity: "Connectors", supplier: "Amphenol", majorSubassembly: "MSA-001 Receiver", workstation: "WC-008", firstShortageDate: "2026-02-25", daysUntilShortage: 26, peakShortageQty: 30, peakShortageValue: 9000, supplyDriver: "On-hand", supplyDriverDate: "N/A", bestAvailableDate: "2026-03-15", impactedDeliverables: ["DEL-2026-0058"], demandMix: { firm: 100, forecast: 0, quote: 0 }, leadTime: 56, ltMargin: -30, owner: "David Chen", status: "Monitoring", nextActionDate: "2026-02-10", notes: null, rootCause: "Long lead time part", recommendedAction: "Monitor; consider safety stock increase", riskLevel: "Medium", onHand: 25, openPOs: [], unitCost: 300, program: "Vehicle Mount System", project: "PRJ-2026-002", division: "Defense Electronics", assembly: "Main Assembly", nettedAvailability: [{ week: "W07", startingOH: 25, supplyIn: 0, demandOut: 40, endingNA: -15 }, { week: "W08", startingOH: -15, supplyIn: 0, demandOut: 15, endingNA: -30 }], demandBreakdown: [{ deliverable: "DEL-2026-0058", needDate: "2026-02-25", type: "Firm Orders", qty: 40, priority: "High" }, { deliverable: "DEL-2026-0058", needDate: "2026-03-05", type: "Firm Orders", qty: 15, priority: "Medium" }], supplyBreakdown: [{ sourceType: "On-hand", sourceId: "INV-003", receiptDate: "Available", qty: 25, usability: "Usable" }], workCellImpact: [{ workCell: "WC-008", workCellName: "Harness Assembly", blockedWorkOrders: ["WO-2026-301"], status: "At-Risk" }] },
      { id: "SH-004", partNumber: "PN-CRYSTAL-OSC", partDesc: "Crystal Oscillator 10MHz", parentRollup: "RF Subassembly / Main Assembly", commodity: "Passive Components", supplier: "Epson", majorSubassembly: "MSA-002 Transmitter", workstation: "WC-003", firstShortageDate: "2026-03-01", daysUntilShortage: 30, peakShortageQty: 60, peakShortageValue: 3000, supplyDriver: "PO-2026-0210", supplyDriverDate: "2026-03-05", bestAvailableDate: "2026-03-05", impactedDeliverables: ["DEL-2026-0052", "DEL-2026-0065"], demandMix: { firm: 50, forecast: 40, quote: 10 }, leadTime: 35, ltMargin: -5, owner: "Lisa Park", status: "Monitoring", nextActionDate: "2026-02-15", notes: null, rootCause: "Standard lead time issue", recommendedAction: "Track PO delivery", riskLevel: "Medium", onHand: 40, openPOs: [{ po: "PO-2026-0210", promise: "2026-03-05", qty: 100 }], unitCost: 50, program: "Tactical HF Radio", project: "PRJ-2026-003", division: "Communications", assembly: "RF Subassembly", nettedAvailability: [{ week: "W08", startingOH: 40, supplyIn: 0, demandOut: 80, endingNA: -40 }, { week: "W09", startingOH: -40, supplyIn: 0, demandOut: 20, endingNA: -60 }, { week: "W10", startingOH: -60, supplyIn: 100, demandOut: 10, endingNA: 30 }], demandBreakdown: [{ deliverable: "DEL-2026-0052", needDate: "2026-03-01", type: "Firm Orders", qty: 50, priority: "High" }, { deliverable: "DEL-2026-0065", needDate: "2026-03-08", type: "Forecast", qty: 50, priority: "Low" }], supplyBreakdown: [{ sourceType: "On-hand", sourceId: "INV-004", receiptDate: "Available", qty: 40, usability: "Usable" }, { sourceType: "PO", sourceId: "PO-2026-0210", receiptDate: "2026-03-05", qty: 100, usability: "Pending Receipt" }], workCellImpact: [{ workCell: "WC-003", workCellName: "Final Assembly A", blockedWorkOrders: ["WO-2026-401"], status: "At-Risk" }] },
      { id: "SH-005", partNumber: "PN-FILTER-SAW", partDesc: "SAW Filter 915MHz", parentRollup: "RF Subassembly / Main Assembly", commodity: "RF Components", supplier: "Murata", majorSubassembly: "MSA-001 Receiver", workstation: "WC-001", firstShortageDate: "2026-02-18", daysUntilShortage: 19, peakShortageQty: 25, peakShortageValue: 12500, supplyDriver: "PO-2026-0175", supplyDriverDate: "2026-02-22", bestAvailableDate: "2026-02-22", impactedDeliverables: ["DEL-2026-0045"], demandMix: { firm: 70, forecast: 20, quote: 10 }, leadTime: 48, ltMargin: -29, owner: "Mike Chen", status: "Investigating", nextActionDate: "2026-02-06", notes: "Single source part", rootCause: "Single source constraint", recommendedAction: "Qualify alternate source", riskLevel: "High", onHand: 15, openPOs: [{ po: "PO-2026-0175", promise: "2026-02-22", qty: 40 }], unitCost: 500, program: "Manpack Radio Program", project: "PRJ-2026-001", division: "Defense Electronics", assembly: "RF Subassembly", nettedAvailability: [{ week: "W06", startingOH: 15, supplyIn: 0, demandOut: 30, endingNA: -15 }, { week: "W07", startingOH: -15, supplyIn: 0, demandOut: 10, endingNA: -25 }, { week: "W08", startingOH: -25, supplyIn: 40, demandOut: 5, endingNA: 10 }], demandBreakdown: [{ deliverable: "DEL-2026-0045", needDate: "2026-02-18", type: "Firm Orders", qty: 30, priority: "High" }, { deliverable: "DEL-2026-0045", needDate: "2026-02-25", type: "Forecast", qty: 15, priority: "Medium" }], supplyBreakdown: [{ sourceType: "On-hand", sourceId: "INV-005", receiptDate: "Available", qty: 15, usability: "Usable" }, { sourceType: "PO", sourceId: "PO-2026-0175", receiptDate: "2026-02-22", qty: 40, usability: "Pending Receipt" }], workCellImpact: [{ workCell: "WC-001", workCellName: "SMT Line 1", blockedWorkOrders: ["WO-2026-101"], status: "Blocked" }] },
      { id: "SH-006", partNumber: "PN-DISP-OLED", partDesc: "OLED Display 2.4in", parentRollup: "Display Unit / Main Assembly", commodity: "Displays", supplier: "Samsung Display", majorSubassembly: "MSA-004 Display Module", workstation: "WC-006", firstShortageDate: "2026-03-10", daysUntilShortage: 39, peakShortageQty: 18, peakShortageValue: 5400, supplyDriver: "PO-2026-0220", supplyDriverDate: "2026-03-15", bestAvailableDate: "2026-03-15", impactedDeliverables: ["DEL-2026-0061", "DEL-2026-0065"], demandMix: { firm: 40, forecast: 50, quote: 10 }, leadTime: 65, ltMargin: -26, owner: "John Smith", status: "Monitoring", nextActionDate: "2026-02-20", notes: null, rootCause: "Long lead time display", recommendedAction: "Monitor PO; evaluate alternates", riskLevel: "Low", onHand: 12, openPOs: [{ po: "PO-2026-0220", promise: "2026-03-15", qty: 30 }], unitCost: 300, program: "Base Station Program", project: "PRJ-2026-004", division: "Communications", assembly: "Display Unit", nettedAvailability: [{ week: "W10", startingOH: 12, supplyIn: 0, demandOut: 20, endingNA: -8 }, { week: "W11", startingOH: -8, supplyIn: 0, demandOut: 10, endingNA: -18 }, { week: "W12", startingOH: -18, supplyIn: 30, demandOut: 5, endingNA: 7 }], demandBreakdown: [{ deliverable: "DEL-2026-0061", needDate: "2026-03-10", type: "Firm Orders", qty: 15, priority: "High" }, { deliverable: "DEL-2026-0065", needDate: "2026-03-18", type: "Forecast", qty: 20, priority: "Low" }], supplyBreakdown: [{ sourceType: "On-hand", sourceId: "INV-006", receiptDate: "Available", qty: 12, usability: "Usable" }, { sourceType: "PO", sourceId: "PO-2026-0220", receiptDate: "2026-03-15", qty: 30, usability: "Pending Receipt" }], workCellImpact: [{ workCell: "WC-006", workCellName: "Display Integration", blockedWorkOrders: ["WO-2026-501"], status: "At-Risk" }] },
      { id: "SH-007", partNumber: "PN-FPGA-XC7", partDesc: "FPGA Xilinx XC7A100T", parentRollup: "Control Unit / Main Assembly", commodity: "Semiconductors", supplier: "Xilinx/AMD", majorSubassembly: "MSA-002 Transmitter", workstation: "WC-004", firstShortageDate: "2026-02-28", daysUntilShortage: 29, peakShortageQty: 8, peakShortageValue: 16000, supplyDriver: "PO-2026-0195", supplyDriverDate: "2026-03-05", bestAvailableDate: "2026-03-05", impactedDeliverables: ["DEL-2026-0058"], demandMix: { firm: 90, forecast: 10, quote: 0 }, leadTime: 90, ltMargin: -61, owner: "Sarah Martinez", status: "Mitigation", nextActionDate: "2026-02-08", notes: "Broker sourcing in progress", rootCause: "Industry-wide semiconductor shortage", recommendedAction: "Use broker source", riskLevel: "Critical", onHand: 2, openPOs: [{ po: "PO-2026-0195", promise: "2026-03-05", qty: 15 }], unitCost: 2000, program: "Vehicle Mount System", project: "PRJ-2026-002", division: "Defense Electronics", assembly: "Control Unit", nettedAvailability: [{ week: "W08", startingOH: 2, supplyIn: 0, demandOut: 6, endingNA: -4 }, { week: "W09", startingOH: -4, supplyIn: 0, demandOut: 4, endingNA: -8 }, { week: "W10", startingOH: -8, supplyIn: 15, demandOut: 2, endingNA: 5 }], demandBreakdown: [{ deliverable: "DEL-2026-0058", needDate: "2026-02-28", type: "Firm Orders", qty: 10, priority: "Critical" }], supplyBreakdown: [{ sourceType: "On-hand", sourceId: "INV-007", receiptDate: "Available", qty: 2, usability: "Usable" }, { sourceType: "PO", sourceId: "PO-2026-0195", receiptDate: "2026-03-05", qty: 15, usability: "Pending Receipt" }], workCellImpact: [{ workCell: "WC-004", workCellName: "Test Station 1", blockedWorkOrders: ["WO-2026-601"], status: "Blocked" }] },
      { id: "SH-008", partNumber: "PN-ANT-ELEM", partDesc: "Antenna Element 2.4GHz", parentRollup: "Antenna Module / Main Assembly", commodity: "RF Components", supplier: "Murata", majorSubassembly: "MSA-005 Antenna Array", workstation: "WC-007", firstShortageDate: "2026-03-05", daysUntilShortage: 34, peakShortageQty: 40, peakShortageValue: 8000, supplyDriver: "PO-2026-0205", supplyDriverDate: "2026-03-10", bestAvailableDate: "2026-03-10", impactedDeliverables: ["DEL-2026-0052", "DEL-2026-0061"], demandMix: { firm: 55, forecast: 35, quote: 10 }, leadTime: 38, ltMargin: -4, owner: "David Chen", status: "Monitoring", nextActionDate: "2026-02-18", notes: null, rootCause: "Demand increase", recommendedAction: "Track delivery", riskLevel: "Medium", onHand: 30, openPOs: [{ po: "PO-2026-0205", promise: "2026-03-10", qty: 60 }], unitCost: 200, program: "Tactical HF Radio", project: "PRJ-2026-003", division: "Communications", assembly: "Antenna Module", nettedAvailability: [{ week: "W09", startingOH: 30, supplyIn: 0, demandOut: 50, endingNA: -20 }, { week: "W10", startingOH: -20, supplyIn: 0, demandOut: 20, endingNA: -40 }, { week: "W11", startingOH: -40, supplyIn: 60, demandOut: 10, endingNA: 10 }], demandBreakdown: [{ deliverable: "DEL-2026-0052", needDate: "2026-03-05", type: "Firm Orders", qty: 35, priority: "High" }, { deliverable: "DEL-2026-0061", needDate: "2026-03-12", type: "Forecast", qty: 45, priority: "Medium" }], supplyBreakdown: [{ sourceType: "On-hand", sourceId: "INV-008", receiptDate: "Available", qty: 30, usability: "Usable" }, { sourceType: "PO", sourceId: "PO-2026-0205", receiptDate: "2026-03-10", qty: 60, usability: "Pending Receipt" }], workCellImpact: [{ workCell: "WC-007", workCellName: "RF Assembly Cell", blockedWorkOrders: ["WO-2026-701", "WO-2026-702"], status: "At-Risk" }] },
    ]

    // Apply filters
    return items.filter(row => {
      if (division !== "All" && row.division !== division) return false
      if (selectedPrograms.length > 0 && !selectedPrograms.includes(row.program)) return false
      if (selectedProjects.length > 0 && !selectedProjects.includes(row.project)) return false
      if (selectedAssemblies.length > 0 && !selectedAssemblies.includes(row.assembly)) return false
      if (selectedMajorSubassemblies.length > 0 && !selectedMajorSubassemblies.includes(row.majorSubassembly)) return false
      if (selectedCommodities.length > 0 && !selectedCommodities.includes(row.commodity)) return false
      if (selectedSuppliers.length > 0 && !selectedSuppliers.includes(row.supplier)) return false
      if (selectedWorkstations.length > 0 && !selectedWorkstations.includes(row.workstation)) return false
      if (partSearch && !row.partNumber.toLowerCase().includes(partSearch.toLowerCase()) && !row.partDesc.toLowerCase().includes(partSearch.toLowerCase())) return false
      if (selectedPart && row.partNumber !== selectedPart) return false
      
      // Show mode filter
      if (showMode === "shortage" && row.peakShortageQty === 0) return false
      if (showMode === "safe" && row.peakShortageQty > 0) return false

      // KPI filter
      if (shortageKpiFilter === "firstDate" && row.firstShortageDate !== items.sort((a, b) => new Date(a.firstShortageDate).getTime() - new Date(b.firstShortageDate).getTime())[0].firstShortageDate) return false
      if (shortageKpiFilter === "deliverablesImpacted" && row.impactedDeliverables.length === 0) return false

      // Production Control: filter by selected work cell
      if (workflowMode === "production-control" && selectedWorkCell && row.workstation !== selectedWorkCell) return false

      return true
    }).sort((a, b) => {
      if (workflowMode === "production-control") {
        // Sort by gating score (risk level, then days until shortage, then need date)
        const riskOrder = { "Critical": 0, "High": 1, "Medium": 2, "Low": 3 }
        const riskA = riskOrder[a.riskLevel as keyof typeof riskOrder] ?? 4
        const riskB = riskOrder[b.riskLevel as keyof typeof riskOrder] ?? 4
        if (riskA !== riskB) return riskA - riskB
        if (a.daysUntilShortage !== b.daysUntilShortage) return a.daysUntilShortage - b.daysUntilShortage
      } else {
        // Supply Chain: Sort by risk level, then days until shortage, then value
        const riskOrder = { "Critical": 0, "High": 1, "Medium": 2, "Low": 3 }
        const riskA = riskOrder[a.riskLevel as keyof typeof riskOrder] ?? 4
        const riskB = riskOrder[b.riskLevel as keyof typeof riskOrder] ?? 4
        if (riskA !== riskB) return riskA - riskB
        if (a.daysUntilShortage !== b.daysUntilShortage) return a.daysUntilShortage - b.daysUntilShortage
      }
      return (b.peakShortageValue || 0) - (a.peakShortageValue || 0)
    })
  }, [division, selectedPrograms, selectedProjects, selectedAssemblies, selectedMajorSubassemblies, selectedCommodities, selectedSuppliers, selectedWorkstations, partSearch, selectedPart, showMode, shortageKpiFilter, workflowMode, selectedWorkCell])

  // Sample Long-Lead Data
  const longLeadData = useMemo(() => {
    const items = [
      { id: "LL-001", partNumber: "PN-FPGA-XC7", partDesc: "FPGA Xilinx XC7A100T", parentRollup: "Control Unit / Main Assembly", effectiveLeadTime: 90, timeToNeed: 29, ltMarginDays: -61, shortageFlag: true, volatilityScore: 2, alternateSources: 1, supplier: "Xilinx/AMD", owner: "Sarah Martinez", status: "Mitigation", nextActionDate: "2026-02-08", notes: "Long lead - broker sourcing", program: "Vehicle Mount System", project: "PRJ-2026-002", division: "Defense Electronics", assembly: "Control Unit", impactedDeliverables: [{ deliverable: "DEL-2026-0058", needDate: "2026-02-28", qty: 10 }], leadTimeBreakdown: { supplierLT: 84, internalLT: 6 }, supplyOptions: [{ type: "Alternate", source: "Broker - Smith & Associates", leadTime: 45, qtyAvailable: 10, unitCost: 2800 }] },
      { id: "LL-002", partNumber: "PN-DISP-OLED", partDesc: "OLED Display 2.4in", parentRollup: "Display Unit / Main Assembly", effectiveLeadTime: 65, timeToNeed: 39, ltMarginDays: -26, shortageFlag: true, volatilityScore: 1, alternateSources: 2, supplier: "Samsung Display", owner: "John Smith", status: "Monitoring", nextActionDate: "2026-02-20", notes: null, program: "Base Station Program", project: "PRJ-2026-004", division: "Communications", assembly: "Display Unit", impactedDeliverables: [{ deliverable: "DEL-2026-0061", needDate: "2026-03-10", qty: 15 }, { deliverable: "DEL-2026-0065", needDate: "2026-03-18", qty: 20 }], leadTimeBreakdown: { supplierLT: 60, internalLT: 5 }, supplyOptions: [{ type: "Alternate", source: "LG Display", leadTime: 58, qtyAvailable: 25, unitCost: 320 }, { type: "Alternate", source: "BOE Technology", leadTime: 70, qtyAvailable: 50, unitCost: 280 }] },
      { id: "LL-003", partNumber: "PN-CONN-MIL", partDesc: "MIL-SPEC Connector 38999", parentRollup: "Harness Assembly / Main Assembly", effectiveLeadTime: 56, timeToNeed: 26, ltMarginDays: -30, shortageFlag: true, volatilityScore: 0, alternateSources: 0, supplier: "Amphenol", owner: "David Chen", status: "Monitoring", nextActionDate: "2026-02-10", notes: "No alternates qualified", program: "Vehicle Mount System", project: "PRJ-2026-002", division: "Defense Electronics", assembly: "Main Assembly", impactedDeliverables: [{ deliverable: "DEL-2026-0058", needDate: "2026-02-25", qty: 40 }], leadTimeBreakdown: { supplierLT: 52, internalLT: 4 }, supplyOptions: [] },
      { id: "LL-004", partNumber: "PN-FILTER-SAW", partDesc: "SAW Filter 915MHz", parentRollup: "RF Subassembly / Main Assembly", effectiveLeadTime: 48, timeToNeed: 19, ltMarginDays: -29, shortageFlag: true, volatilityScore: 3, alternateSources: 1, supplier: "Murata", owner: "Mike Chen", status: "Investigating", nextActionDate: "2026-02-06", notes: "Single source - critical", program: "Manpack Radio Program", project: "PRJ-2026-001", division: "Defense Electronics", assembly: "RF Subassembly", impactedDeliverables: [{ deliverable: "DEL-2026-0045", needDate: "2026-02-18", qty: 30 }], leadTimeBreakdown: { supplierLT: 45, internalLT: 3 }, supplyOptions: [{ type: "Alternate", source: "Qualcomm", leadTime: 52, qtyAvailable: 20, unitCost: 550 }] },
      { id: "LL-005", partNumber: "PN-RF-AMP-100", partDesc: "RF Amplifier Module 5W", parentRollup: "RF Subassembly / Main Assembly", effectiveLeadTime: 42, timeToNeed: 16, ltMarginDays: -26, shortageFlag: true, volatilityScore: 1, alternateSources: 2, supplier: "Analog Devices", owner: "John Smith", status: "Investigating", nextActionDate: "2026-02-05", notes: "Alternate qualified", program: "Manpack Radio Program", project: "PRJ-2026-001", division: "Defense Electronics", assembly: "RF Subassembly", impactedDeliverables: [{ deliverable: "DEL-2026-0045", needDate: "2026-02-15", qty: 35 }, { deliverable: "DEL-2026-0052", needDate: "2026-02-22", qty: 25 }], leadTimeBreakdown: { supplierLT: 38, internalLT: 4 }, supplyOptions: [{ type: "Alternate", source: "Skyworks", leadTime: 35, qtyAvailable: 30, unitCost: 1650 }, { type: "Transfer", source: "Warehouse B", leadTime: 5, qtyAvailable: 8, unitCost: 1500 }] },
      { id: "LL-006", partNumber: "PN-IC-ADC-16", partDesc: "ADC 16-bit 100MSPS", parentRollup: "RF Subassembly / Main Assembly", effectiveLeadTime: 72, timeToNeed: 45, ltMarginDays: -27, shortageFlag: false, volatilityScore: 2, alternateSources: 1, supplier: "Texas Instruments", owner: "Lisa Park", status: "Monitoring", nextActionDate: "2026-02-25", notes: null, program: "Tactical HF Radio", project: "PRJ-2026-003", division: "Communications", assembly: "RF Subassembly", impactedDeliverables: [{ deliverable: "DEL-2026-0052", needDate: "2026-03-15", qty: 20 }], leadTimeBreakdown: { supplierLT: 68, internalLT: 4 }, supplyOptions: [{ type: "Alternate", source: "Analog Devices", leadTime: 65, qtyAvailable: 15, unitCost: 185 }] },
      { id: "LL-007", partNumber: "PN-XTAL-TCXO", partDesc: "TCXO 26MHz ±0.5ppm", parentRollup: "RF Subassembly / Main Assembly", effectiveLeadTime: 58, timeToNeed: 52, ltMarginDays: -6, shortageFlag: false, volatilityScore: 0, alternateSources: 3, supplier: "Epson", owner: "Mike Chen", status: "Monitoring", nextActionDate: "2026-03-01", notes: null, program: "Portable Comm System", project: "PRJ-2026-005", division: "Defense Electronics", assembly: "RF Subassembly", impactedDeliverables: [{ deliverable: "DEL-2026-0065", needDate: "2026-03-22", qty: 50 }], leadTimeBreakdown: { supplierLT: 55, internalLT: 3 }, supplyOptions: [{ type: "Alternate", source: "NDK", leadTime: 50, qtyAvailable: 40, unitCost: 28 }, { type: "Alternate", source: "Abracon", leadTime: 45, qtyAvailable: 100, unitCost: 32 }, { type: "Alternate", source: "SiTime", leadTime: 42, qtyAvailable: 60, unitCost: 35 }] },
      { id: "LL-008", partNumber: "PN-PA-GaN", partDesc: "GaN Power Amplifier 20W", parentRollup: "RF Subassembly / Main Assembly", effectiveLeadTime: 105, timeToNeed: 60, ltMarginDays: -45, shortageFlag: false, volatilityScore: 4, alternateSources: 0, supplier: "Wolfspeed", owner: "David Chen", status: "Investigating", nextActionDate: "2026-02-12", notes: "Critical long-lead", program: "Base Station Program", project: "PRJ-2026-004", division: "Communications", assembly: "RF Subassembly", impactedDeliverables: [{ deliverable: "DEL-2026-0061", needDate: "2026-03-30", qty: 8 }], leadTimeBreakdown: { supplierLT: 98, internalLT: 7 }, supplyOptions: [] },
      { id: "LL-009", partNumber: "PN-MEM-DDR4", partDesc: "DDR4 SDRAM 8GB", parentRollup: "Control Unit / Main Assembly", effectiveLeadTime: 45, timeToNeed: 55, ltMarginDays: 10, shortageFlag: false, volatilityScore: 1, alternateSources: 4, supplier: "Micron", owner: "Sarah Martinez", status: "Monitoring", nextActionDate: "2026-03-10", notes: null, program: "Vehicle Mount System", project: "PRJ-2026-002", division: "Defense Electronics", assembly: "Control Unit", impactedDeliverables: [{ deliverable: "DEL-2026-0058", needDate: "2026-03-25", qty: 12 }], leadTimeBreakdown: { supplierLT: 42, internalLT: 3 }, supplyOptions: [{ type: "Alternate", source: "Samsung", leadTime: 40, qtyAvailable: 50, unitCost: 95 }] },
      { id: "LL-010", partNumber: "PN-PWR-MGMT", partDesc: "Power Management IC", parentRollup: "Power Module / Main Assembly", effectiveLeadTime: 52, timeToNeed: 48, ltMarginDays: -4, shortageFlag: false, volatilityScore: 2, alternateSources: 2, supplier: "Renesas", owner: "Lisa Park", status: "Monitoring", nextActionDate: "2026-02-28", notes: null, program: "Portable Comm System", project: "PRJ-2026-005", division: "Defense Electronics", assembly: "Power Module", impactedDeliverables: [{ deliverable: "DEL-2026-0065", needDate: "2026-03-18", qty: 40 }], leadTimeBreakdown: { supplierLT: 48, internalLT: 4 }, supplyOptions: [{ type: "Alternate", source: "TI", leadTime: 46, qtyAvailable: 30, unitCost: 12 }, { type: "Alternate", source: "Analog Devices", leadTime: 50, qtyAvailable: 25, unitCost: 14 }] },
    ]

    // Apply filters
    return items.filter(row => {
      if (division !== "All" && row.division !== division) return false
      if (selectedPrograms.length > 0 && !selectedPrograms.includes(row.program)) return false
      if (selectedProjects.length > 0 && !selectedProjects.includes(row.project)) return false
      if (selectedAssemblies.length > 0 && !selectedAssemblies.includes(row.assembly)) return false
      if (partSearch && !row.partNumber.toLowerCase().includes(partSearch.toLowerCase()) && !row.partDesc.toLowerCase().includes(partSearch.toLowerCase())) return false
      if (selectedPart && row.partNumber !== selectedPart) return false

      // Long-Lead criteria
      const meetsLongLeadThreshold = row.effectiveLeadTime >= longLeadThreshold
      const meetsMarginThreshold = row.ltMarginDays <= marginThreshold

      // KPI filter
      if (longLeadKpiFilter === "unrecoverable" && row.ltMarginDays >= 0) return false
      if (longLeadKpiFilter === "intersection" && !row.shortageFlag) return false

      return meetsLongLeadThreshold || meetsMarginThreshold
    }).sort((a, b) => {
      // Sort by LT margin days (most negative first), then effective lead time desc
      if (a.ltMarginDays !== b.ltMarginDays) return a.ltMarginDays - b.ltMarginDays
      return b.effectiveLeadTime - a.effectiveLeadTime
    })
  }, [division, selectedPrograms, selectedProjects, selectedAssemblies, partSearch, selectedPart, longLeadThreshold, marginThreshold, longLeadKpiFilter])

  // Shortage KPIs
  const shortageKpis = useMemo(() => {
    const partsWithShortage = shortageData.length
    const firstShortageDate = shortageData.length > 0 ? shortageData.sort((a, b) => new Date(a.firstShortageDate).getTime() - new Date(b.firstShortageDate).getTime())[0].firstShortageDate : null
    const maxShortageQty = shortageData.length > 0 ? Math.max(...shortageData.map(d => d.peakShortageQty)) : 0
    const uniqueDeliverables = new Set(shortageData.flatMap(d => d.impactedDeliverables))
    const totalShortageValue = shortageData.reduce((sum, d) => sum + (d.peakShortageValue || 0), 0)

    return {
      partsWithShortage,
      firstShortageDate,
      maxShortageQty,
      deliverablesImpacted: uniqueDeliverables.size,
      totalShortageValue
    }
  }, [shortageData])

  // Long-Lead KPIs
  const longLeadKpis = useMemo(() => {
    const longLeadParts = longLeadData.length
    const unrecoverableParts = longLeadData.filter(d => d.ltMarginDays < 0).length
    const intersectionCount = longLeadData.filter(d => d.shortageFlag).length
    const avgEffectiveLT = longLeadData.length > 0 ? Math.round(longLeadData.reduce((sum, d) => sum + d.effectiveLeadTime, 0) / longLeadData.length) : 0
    const minLTMargin = longLeadData.length > 0 ? Math.min(...longLeadData.map(d => d.ltMarginDays)) : 0

    return {
      longLeadParts,
      unrecoverableParts,
      intersectionCount,
      avgEffectiveLT,
      minLTMargin
    }
  }, [longLeadData])

  // Segmentation data for Supply Chain workflow
  const segmentationData = useMemo(() => {
    const byCommodity: { [key: string]: number } = {}
    const bySupplier: { [key: string]: number } = {}
    const byMSA: { [key: string]: number } = {}

    shortageData.forEach(item => {
      const val = heatmapToggle === "qty" ? item.peakShortageQty : item.peakShortageValue
      byCommodity[item.commodity] = (byCommodity[item.commodity] || 0) + val
      bySupplier[item.supplier] = (bySupplier[item.supplier] || 0) + val
      byMSA[item.majorSubassembly] = (byMSA[item.majorSubassembly] || 0) + val
    })

    return {
      byCommodity: Object.entries(byCommodity).map(([name, value]) => ({ name: name.substring(0, 12), fullName: name, value })).sort((a, b) => b.value - a.value).slice(0, 6),
      bySupplier: Object.entries(bySupplier).map(([name, value]) => ({ name: name.substring(0, 12), fullName: name, value })).sort((a, b) => b.value - a.value).slice(0, 6),
      byMSA: Object.entries(byMSA).map(([name, value]) => ({ name: name.substring(0, 12), fullName: name, value })).sort((a, b) => b.value - a.value).slice(0, 5),
    }
  }, [shortageData, heatmapToggle])

  // Work Cell KPIs for Production Control workflow
  const workCellKpis = useMemo(() => {
    if (!selectedWorkCell) return { partsTracked: 0, atRiskParts: 0, topBlockers: 0, cellReadiness: 100 }

    const cellParts = shortageData.filter(p => p.workstation === selectedWorkCell)
    const atRisk = cellParts.filter(p => p.riskLevel === "High" || p.riskLevel === "Critical")
    const blocked = cellParts.filter(p => {
      const needDate = new Date(p.firstShortageDate)
      const today = new Date("2026-01-30")
      const windowEnd = new Date(today)
      windowEnd.setDate(windowEnd.getDate() + nextWorkWindow)
      return needDate <= windowEnd && new Date(p.bestAvailableDate) > new Date(p.firstShortageDate)
    })

    const totalRequired = cellParts.length
    const readyParts = cellParts.filter(p => new Date(p.bestAvailableDate) <= new Date(p.firstShortageDate)).length
    const readiness = totalRequired > 0 ? Math.round((readyParts / totalRequired) * 100) : 100

    return {
      partsTracked: cellParts.length,
      atRiskParts: atRisk.length,
      topBlockers: blocked.length,
      cellReadiness: readiness
    }
  }, [selectedWorkCell, shortageData, nextWorkWindow])

  // Top Blockers for Production Control
  const topBlockers = useMemo(() => {
    if (!selectedWorkCell) return []
    return shortageData
      .filter(p => p.workstation === selectedWorkCell)
      .slice(0, 15)
  }, [shortageData, selectedWorkCell])

  // Shortage Heatmap data - supports multiple view modes
  const shortageHeatmapData = useMemo(() => {
    const weeks = ["W05", "W06", "W07", "W08", "W09", "W10", "W11", "W12"]
    
    // For Production Control, show top parts for selected work cell
    let filteredParts = shortageData
    if (workflowMode === "production-control" && selectedWorkCell) {
      filteredParts = shortageData.filter(p => p.workstation === selectedWorkCell)
    }
    
    // View By Part - default behavior
    if (heatmapViewBy === "part") {
      return filteredParts.slice(0, 20).map(part => {
        const weekData: { [key: string]: number } = {}
        part.nettedAvailability.forEach(na => {
          if (na.endingNA < 0) {
            weekData[na.week] = heatmapToggle === "qty" ? Math.abs(na.endingNA) : Math.abs(na.endingNA) * (part.unitCost || 0)
          }
        })
        return { rowKey: part.partNumber, rowLabel: part.partNumber, ...weekData }
      })
    }
    
    // Group by Commodity, Supplier, or MSA
    const groupKey = heatmapViewBy === "commodity" ? "commodity" : heatmapViewBy === "supplier" ? "supplier" : "majorSubassembly"
    const grouped: { [key: string]: { [week: string]: number } } = {}
    
    filteredParts.forEach(part => {
      const key = part[groupKey] || "Unknown"
      if (!grouped[key]) {
        grouped[key] = {}
        weeks.forEach(w => grouped[key][w] = 0)
      }
      part.nettedAvailability.forEach(na => {
        if (na.endingNA < 0) {
          const value = heatmapToggle === "qty" ? Math.abs(na.endingNA) : Math.abs(na.endingNA) * (part.unitCost || 0)
          grouped[key][na.week] = (grouped[key][na.week] || 0) + value
        }
      })
    })
    
    // Convert to array and sort by total shortage
    return Object.entries(grouped)
      .map(([key, weekData]) => {
        const total = Object.values(weekData).reduce((sum, v) => sum + v, 0)
        return { rowKey: key, rowLabel: key, total, ...weekData }
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 15)
  }, [shortageData, heatmapToggle, heatmapViewBy, workflowMode, selectedWorkCell])

  // Scatter chart data for Long-Lead
  const scatterData = useMemo(() => {
    return longLeadData.map(item => ({
      x: item.timeToNeed,
      y: item.effectiveLeadTime,
      z: item.shortageFlag ? 400 : 200,
      partNumber: item.partNumber,
      shortageFlag: item.shortageFlag,
      ltMarginDays: item.ltMarginDays
    }))
  }, [longLeadData])

  // Open drawer
  const openDrawer = (data: any, type: "shortage" | "long-lead") => {
    setDrawerData({ ...data, type })
    setDrawerTab("summary")
    setDrawerOpen(true)
  }

  // Clear all filters
  const clearAllFilters = () => {
    setDivision("All")
    setSelectedPrograms([])
    setSelectedProjects([])
    setSelectedAssemblies([])
    setSelectedMajorSubassemblies([])
    setSelectedCommodities([])
    setSelectedSuppliers([])
    setSelectedWorkstations([])
    setPartSearch("")
    setHorizonFrom("2026-01-30")
    setHorizonTo("2026-07-30")
    setDemandTypesIncluded(["Firm Orders", "Forecast", "Open Quotes"])
    setNettingMode("pegged")
    setShowMode("all")
    setSelectedPart(null)
    setShortageKpiFilter(null)
    setLongLeadKpiFilter(null)
    setSelectedWorkCell(null)
  }

  // Check if any filters active
  const hasActiveFilters = division !== "All" || selectedPrograms.length > 0 || selectedProjects.length > 0 || selectedAssemblies.length > 0 || selectedMajorSubassemblies.length > 0 || selectedCommodities.length > 0 || selectedSuppliers.length > 0 || selectedWorkstations.length > 0 || partSearch || selectedPart || demandTypesIncluded.length !== 3 || showMode !== "all" || selectedWorkCell

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Monitoring": return "bg-blue-100 text-blue-800"
      case "Investigating": return "bg-amber-100 text-amber-800"
      case "Mitigation": return "bg-purple-100 text-purple-800"
      case "Resolved": return "bg-green-100 text-green-800"
      default: return "bg-slate-100 text-slate-800"
    }
  }

  // Get risk level badge color
  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case "Critical": return "bg-red-600 text-white"
      case "High": return "bg-red-100 text-red-800"
      case "Medium": return "bg-amber-100 text-amber-800"
      case "Low": return "bg-green-100 text-green-800"
      default: return "bg-slate-100 text-slate-800"
    }
  }

  // Toggle favorite work cell
  const toggleFavoriteWorkCell = (wcId: string) => {
    if (favoriteWorkCells.includes(wcId)) {
      setFavoriteWorkCells(favoriteWorkCells.filter(id => id !== wcId))
    } else {
      setFavoriteWorkCells([...favoriteWorkCells, wcId])
    }
  }

  // Group workstations by MSA
  const workstationsByMSA = useMemo(() => {
    const grouped: { [msa: string]: typeof WORKSTATIONS } = {}
    WORKSTATIONS.forEach(ws => {
      if (!grouped[ws.majorSubassembly]) grouped[ws.majorSubassembly] = []
      grouped[ws.majorSubassembly].push(ws)
    })
    return grouped
  }, [])

  return (
    <div className="space-y-4">
      {/* GLOBAL FILTER BAR */}
      <Card className="border-slate-200 sticky top-0 z-20 bg-white">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Program */}
            <Select value={selectedPrograms.length > 0 ? selectedPrograms[0] : "all"} onValueChange={(v) => setSelectedPrograms(v === "all" ? [] : [v])}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {PROGRAMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Project */}
            <Select value={selectedProjects.length > 0 ? selectedProjects[0] : "all"} onValueChange={(v) => setSelectedProjects(v === "all" ? [] : [v])}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {PROJECTS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Assembly */}
            <Select value={selectedAssemblies.length > 0 ? selectedAssemblies[0] : "all"} onValueChange={(v) => setSelectedAssemblies(v === "all" ? [] : [v])}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Assembly" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assemblies</SelectItem>
                {ASSEMBLIES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Major Subassembly */}
            <Select value={selectedMajorSubassemblies.length > 0 ? selectedMajorSubassemblies[0] : "all"} onValueChange={(v) => setSelectedMajorSubassemblies(v === "all" ? [] : [v])}>
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <SelectValue placeholder="Major Subassy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All MSAs</SelectItem>
                {MAJOR_SUBASSEMBLIES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Commodity */}
            <Select value={selectedCommodities.length > 0 ? selectedCommodities[0] : "all"} onValueChange={(v) => setSelectedCommodities(v === "all" ? [] : [v])}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Commodity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Commodities</SelectItem>
                {COMMODITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Supplier */}
            <Select value={selectedSuppliers.length > 0 ? selectedSuppliers[0] : "all"} onValueChange={(v) => setSelectedSuppliers(v === "all" ? [] : [v])}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {SUPPLIERS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Workstation (only in Production Control) */}
            {viewMode === "shortage" && workflowMode === "production-control" && (
              <Select value={selectedWorkstations.length > 0 ? selectedWorkstations[0] : "all"} onValueChange={(v) => setSelectedWorkstations(v === "all" ? [] : [v])}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="Workstation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Workstations</SelectItem>
                  {WORKSTATIONS.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            {/* Part Search */}
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Part search..."
                value={partSearch}
                onChange={(e) => setPartSearch(e.target.value)}
                className="pl-7 h-8 w-[120px] text-xs"
              />
            </div>

            {/* Horizon From/To */}
            <div className="flex items-center gap-1">
              <Input type="date" value={horizonFrom} onChange={(e) => setHorizonFrom(e.target.value)} className="h-8 w-[115px] text-xs" />
              <span className="text-slate-400 text-xs">-</span>
              <Input type="date" value={horizonTo} onChange={(e) => setHorizonTo(e.target.value)} className="h-8 w-[115px] text-xs" />
            </div>

            {/* Netting Mode */}
            <div className="flex items-center gap-0.5 bg-slate-100 rounded-md p-0.5">
              <button
                onClick={() => setNettingMode("global")}
                className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${nettingMode === "global" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
              >
                Global
              </button>
              <button
                onClick={() => setNettingMode("pegged")}
                className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${nettingMode === "pegged" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
              >
                Pegged
              </button>
              <div className="relative group ml-0.5">
                <Info className="h-3 w-3 text-slate-400 cursor-help" />
                <div className="absolute z-30 bottom-full left-0 mb-2 w-[200px] p-2 text-[10px] bg-slate-900 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Global nets all demand against all supply; Pegged nets to the selected deliverable/work order allocation.
                </div>
              </div>
            </div>

            {/* Show Mode */}
            <Select value={showMode} onValueChange={(v: any) => setShowMode(v)}>
              <SelectTrigger className="w-[110px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Show: All</SelectItem>
                <SelectItem value="shortage">Shortage Only</SelectItem>
                <SelectItem value="safe">Safe Only</SelectItem>
              </SelectContent>
            </Select>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-8 text-[10px] text-slate-500 hover:text-slate-700 px-2">
                Reset filters
              </Button>
            )}
          </div>

          {/* Demand Types Row */}
          <div className="flex items-center gap-4 mt-2 pt-2 border-t border-slate-100">
            <span className="text-[10px] text-slate-500">Demand Types:</span>
            {DEMAND_TYPES.map(dt => (
              <label key={dt} className="flex items-center gap-1 text-[10px]">
                <Checkbox
                  checked={demandTypesIncluded.includes(dt)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setDemandTypesIncluded([...demandTypesIncluded, dt])
                    } else {
                      setDemandTypesIncluded(demandTypesIncluded.filter(d => d !== dt))
                    }
                  }}
                  className="h-3 w-3"
                />
                {dt}
              </label>
            ))}
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-slate-100">
              {selectedPrograms.map(p => (
                <Badge key={p} variant="secondary" className="text-[10px] cursor-pointer h-5" onClick={() => setSelectedPrograms(selectedPrograms.filter(x => x !== p))}>
                  {p} <X className="w-2.5 h-2.5 ml-1" />
                </Badge>
              ))}
              {selectedCommodities.map(c => (
                <Badge key={c} variant="secondary" className="text-[10px] cursor-pointer h-5" onClick={() => setSelectedCommodities(selectedCommodities.filter(x => x !== c))}>
                  {c} <X className="w-2.5 h-2.5 ml-1" />
                </Badge>
              ))}
              {selectedSuppliers.map(s => (
                <Badge key={s} variant="secondary" className="text-[10px] cursor-pointer h-5" onClick={() => setSelectedSuppliers(selectedSuppliers.filter(x => x !== s))}>
                  {s} <X className="w-2.5 h-2.5 ml-1" />
                </Badge>
              ))}
              {selectedPart && (
                <Badge variant="secondary" className="text-[10px] cursor-pointer h-5" onClick={() => setSelectedPart(null)}>
                  Part: {selectedPart} <X className="w-2.5 h-2.5 ml-1" />
                </Badge>
              )}
              {selectedWorkCell && (
                <Badge variant="secondary" className="text-[10px] cursor-pointer h-5" onClick={() => setSelectedWorkCell(null)}>
                  Work Cell: {WORKSTATIONS.find(w => w.id === selectedWorkCell)?.name} <X className="w-2.5 h-2.5 ml-1" />
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* TWO-TAB SWITCH */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode("shortage")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${viewMode === "shortage" ? "bg-white shadow-sm text-slate-900" : "text-slate-600 hover:text-slate-900"}`}
          >
            Shortage
          </button>
          <button
            onClick={() => setViewMode("long-lead")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${viewMode === "long-lead" ? "bg-white shadow-sm text-slate-900" : "text-slate-600 hover:text-slate-900"}`}
          >
            Long-Lead
          </button>
        </div>
      </div>

      {/* SHORTAGE TAB */}
      {viewMode === "shortage" && (
        <>
          {/* Workflow Switch */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium">Workflow / Persona:</span>
            <div className="flex items-center gap-0.5 bg-slate-100 rounded-md p-0.5 flex-wrap">
              <button
                onClick={() => { setWorkflowMode("supply-chain"); setSelectedWorkCell(null) }}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${workflowMode === "supply-chain" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
              >
                <Layers className="w-3.5 h-3.5" />
                Supply Chain
              </button>
              <button
                onClick={() => setWorkflowMode("production-control")}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${workflowMode === "production-control" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
              >
                <Factory className="w-3.5 h-3.5" />
                Production Control
              </button>
              <button
                onClick={() => setWorkflowMode("floor-technician")}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${workflowMode === "floor-technician" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
              >
                <Users className="w-3.5 h-3.5" />
                Floor Tech
              </button>
              <button
                onClick={() => setWorkflowMode("program-manager")}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${workflowMode === "program-manager" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Program Mgr
              </button>
              <button
                onClick={() => setWorkflowMode("material-planner")}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${workflowMode === "material-planner" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
              >
                <Package className="w-3.5 h-3.5" />
                Material Plan
              </button>
              <button
                onClick={() => setWorkflowMode("quality-engineer")}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${workflowMode === "quality-engineer" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
              >
                <CircleDot className="w-3.5 h-3.5" />
                Quality Eng
              </button>
            </div>
          </div>

          {/* Definition Line */}
          <div className="flex items-center gap-2 px-1 py-1 text-xs text-slate-600">
            <div className="relative group">
              <Info className="h-3.5 w-3.5 text-slate-400 cursor-help" />
              <div className="absolute z-30 bottom-full left-0 mb-2 w-[380px] p-3 text-[10px] bg-slate-900 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <p className="font-medium mb-2">Shortage Calculation:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li><strong>Netted Available(t):</strong> Usable On-Hand + ΣSupply(receipt_date ≤ t) − ΣDemand(need_date ≤ t)</li>
                  <li><strong>First Shortage Date:</strong> First t where Netted Available(t) {"<"} 0</li>
                  <li><strong>Shortage Qty at t:</strong> abs(min(0, Netted Available(t)))</li>
                  <li><strong>Pegged Mode:</strong> Netting respects allocation/pegging to selected deliverable/work order</li>
                </ul>
              </div>
            </div>
            <span>Shortage flags parts where netted available falls below zero within the horizon.</span>
          </div>

          {/* SUPPLY CHAIN WORKFLOW */}
          {workflowMode === "supply-chain" && (
            <>
              {/* Time Bucket Toggle */}
              <div className="flex items-center gap-2 px-1">
                <span className="text-[10px] text-slate-500">Time bucket:</span>
                <div className="flex items-center gap-0.5 bg-slate-100 rounded-md p-0.5">
                  <button
                    onClick={() => setTimeBucket("week")}
                    className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${timeBucket === "week" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setTimeBucket("day")}
                    className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${timeBucket === "day" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    Day
                  </button>
                </div>
              </div>

              {/* Shortage KPIs */}
              <div className="grid grid-cols-5 gap-3">
                <Card
                  className={`border-slate-200 cursor-pointer transition-colors hover:border-blue-300 ${shortageKpiFilter === "partsWithShortage" ? "ring-2 ring-blue-500" : ""}`}
                  onClick={() => { setShortageKpiFilter(shortageKpiFilter === "partsWithShortage" ? null : "partsWithShortage"); setShowMode("shortage") }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                      <Package className="w-3 h-3" />
                      Parts with Shortage
                    </div>
                    <p className="text-xl font-bold text-red-600">{shortageKpis.partsWithShortage}</p>
                  </CardContent>
                </Card>

                <Card
                  className={`border-slate-200 cursor-pointer transition-colors hover:border-blue-300 ${shortageKpiFilter === "firstDate" ? "ring-2 ring-blue-500" : ""}`}
                  onClick={() => setShortageKpiFilter(shortageKpiFilter === "firstDate" ? null : "firstDate")}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                      <Clock className="w-3 h-3" />
                      First Shortage Date
                    </div>
                    <p className="text-xl font-bold text-amber-600">{shortageKpis.firstShortageDate ? formatDate(shortageKpis.firstShortageDate) : "N/A"}</p>
                  </CardContent>
                </Card>

                <Card className="border-slate-200">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                      <TrendingUp className="w-3 h-3" />
                      Max Shortage Qty
                    </div>
                    <p className="text-xl font-bold text-slate-900">{formatNumber(shortageKpis.maxShortageQty)}</p>
                  </CardContent>
                </Card>

                <Card
                  className={`border-slate-200 cursor-pointer transition-colors hover:border-blue-300 ${shortageKpiFilter === "deliverablesImpacted" ? "ring-2 ring-blue-500" : ""}`}
                  onClick={() => setShortageKpiFilter(shortageKpiFilter === "deliverablesImpacted" ? null : "deliverablesImpacted")}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                      <AlertTriangle className="w-3 h-3" />
                      Deliverables Impacted
                    </div>
                    <p className="text-xl font-bold text-purple-600">{shortageKpis.deliverablesImpacted}</p>
                  </CardContent>
                </Card>

                <Card className="border-slate-200">
                  <CardContent className="p-3">
                    <div className="relative group">
                      <Info className="absolute top-0 right-0 h-3 w-3 text-slate-400 cursor-help" />
                      <div className="absolute z-30 bottom-full right-0 mb-2 w-[160px] p-2 text-[10px] bg-slate-900 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Requires part cost data for calculation.
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                      Total Shortage Value
                    </div>
                    <p className="text-xl font-bold text-slate-900">{formatCurrency(shortageKpis.totalShortageValue)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Segmentation Strip */}
              <div className="grid grid-cols-3 gap-3">
                <Card className={`border-slate-200 ${selectedCommodities.length > 0 ? "ring-2 ring-[#8B0000]" : ""}`}>
                  <CardHeader className="pb-1 pt-3 px-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-medium text-slate-700">At-Risk by Commodity</CardTitle>
                    {selectedCommodities.length > 0 && (
                      <button
                        onClick={() => setSelectedCommodities([])}
                        className="text-[9px] text-[#8B0000] hover:underline flex items-center gap-0.5"
                      >
                        <X className="w-3 h-3" /> Clear
                      </button>
                    )}
                  </CardHeader>
                  <CardContent className="p-2 h-[100px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={segmentationData.byCommodity} layout="vertical" margin={{ left: 0, right: 5 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 9 }} />
                        <Tooltip content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="bg-slate-900 text-white text-[10px] px-2 py-1 rounded">
                                {data.fullName}: {heatmapToggle === "qty" ? formatNumber(data.value) : formatCurrency(data.value)}
                                <div className="text-slate-300 text-[9px]">Click to filter{selectedCommodities.includes(data.fullName) ? " (click again to clear)" : ""}</div>
                              </div>
                            )
                          }
                          return null
                        }} />
                        <Bar 
                          dataKey="value" 
                          fill="#8B0000" 
                          radius={2}
                          cursor="pointer"
                          onClick={(data) => {
                            if (selectedCommodities.includes(data.fullName)) {
                              setSelectedCommodities([])
                            } else {
                              setSelectedCommodities([data.fullName])
                            }
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className={`border-slate-200 ${selectedSuppliers.length > 0 ? "ring-2 ring-[#1D4ED8]" : ""}`}>
                  <CardHeader className="pb-1 pt-3 px-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-medium text-slate-700">At-Risk by Supplier</CardTitle>
                    {selectedSuppliers.length > 0 && (
                      <button
                        onClick={() => setSelectedSuppliers([])}
                        className="text-[9px] text-[#1D4ED8] hover:underline flex items-center gap-0.5"
                      >
                        <X className="w-3 h-3" /> Clear
                      </button>
                    )}
                  </CardHeader>
                  <CardContent className="p-2 h-[100px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={segmentationData.bySupplier} layout="vertical" margin={{ left: 0, right: 5 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 9 }} />
                        <Tooltip content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="bg-slate-900 text-white text-[10px] px-2 py-1 rounded">
                                {data.fullName}: {heatmapToggle === "qty" ? formatNumber(data.value) : formatCurrency(data.value)}
                                <div className="text-slate-300 text-[9px]">Click to filter{selectedSuppliers.includes(data.fullName) ? " (click again to clear)" : ""}</div>
                              </div>
                            )
                          }
                          return null
                        }} />
                        <Bar 
                          dataKey="value" 
                          fill="#1D4ED8" 
                          radius={2}
                          cursor="pointer"
                          onClick={(data) => {
                            if (selectedSuppliers.includes(data.fullName)) {
                              setSelectedSuppliers([])
                            } else {
                              setSelectedSuppliers([data.fullName])
                            }
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className={`border-slate-200 ${selectedMajorSubassemblies.length > 0 ? "ring-2 ring-[#7C3AED]" : ""}`}>
                  <CardHeader className="pb-1 pt-3 px-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-medium text-slate-700">At-Risk by Major Subassembly</CardTitle>
                    {selectedMajorSubassemblies.length > 0 && (
                      <button
                        onClick={() => setSelectedMajorSubassemblies([])}
                        className="text-[9px] text-[#7C3AED] hover:underline flex items-center gap-0.5"
                      >
                        <X className="w-3 h-3" /> Clear
                      </button>
                    )}
                  </CardHeader>
                  <CardContent className="p-2 h-[100px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={segmentationData.byMSA} layout="vertical" margin={{ left: 0, right: 5 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 9 }} />
                        <Tooltip content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="bg-slate-900 text-white text-[10px] px-2 py-1 rounded">
                                {data.fullName}: {heatmapToggle === "qty" ? formatNumber(data.value) : formatCurrency(data.value)}
                                <div className="text-slate-300 text-[9px]">Click to filter{selectedMajorSubassemblies.includes(data.fullName) ? " (click again to clear)" : ""}</div>
                              </div>
                            )
                          }
                          return null
                        }} />
                        <Bar 
                          dataKey="value" 
                          fill="#7C3AED" 
                          radius={2}
                          cursor="pointer"
                          onClick={(data) => {
                            if (selectedMajorSubassemblies.includes(data.fullName)) {
                              setSelectedMajorSubassemblies([])
                            } else {
                              setSelectedMajorSubassemblies([data.fullName])
                            }
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Shortage Heatmap */}
              <Card className="border-slate-200">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-sm font-semibold text-slate-900">Shortage Map</CardTitle>
                    <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5">
                      <button
                        onClick={() => setHeatmapViewBy("part")}
                        className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${heatmapViewBy === "part" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        By Part
                      </button>
                      <button
                        onClick={() => setHeatmapViewBy("commodity")}
                        className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${heatmapViewBy === "commodity" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        By Commodity
                      </button>
                      <button
                        onClick={() => setHeatmapViewBy("supplier")}
                        className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${heatmapViewBy === "supplier" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        By Supplier
                      </button>
                      <button
                        onClick={() => setHeatmapViewBy("msa")}
                        className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${heatmapViewBy === "msa" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        By MSA
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5">
                    <button
                      onClick={() => setHeatmapToggle("qty")}
                      className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${heatmapToggle === "qty" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      Qty
                    </button>
                    <button
                      onClick={() => setHeatmapToggle("value")}
                      className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${heatmapToggle === "value" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      Value
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  {shortageHeatmapData.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">No shortage data to display.</div>
                  ) : (
                    <div className="overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b border-slate-200">
                            <TableHead className="text-[10px] font-semibold text-slate-600 w-[140px]">
                              {heatmapViewBy === "part" ? "Part Number" : heatmapViewBy === "commodity" ? "Commodity" : heatmapViewBy === "supplier" ? "Supplier" : "Major Subassembly"}
                            </TableHead>
                            {["W05", "W06", "W07", "W08", "W09", "W10", "W11", "W12"].map(week => (
                              <TableHead key={week} className="text-[10px] font-semibold text-slate-600 text-center w-[60px]">{week}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {shortageHeatmapData.map((row) => (
                            <TableRow key={row.rowKey} className="hover:bg-slate-50">
                              <TableCell 
                                className="text-[10px] font-medium text-[#8B0000] cursor-pointer hover:underline"
                                onClick={() => {
                                  if (heatmapViewBy === "part") {
                                    setSelectedPart(row.rowKey)
                                  } else if (heatmapViewBy === "commodity") {
                                    setSelectedCommodities(selectedCommodities.includes(row.rowKey) ? [] : [row.rowKey])
                                  } else if (heatmapViewBy === "supplier") {
                                    setSelectedSuppliers(selectedSuppliers.includes(row.rowKey) ? [] : [row.rowKey])
                                  } else if (heatmapViewBy === "msa") {
                                    setSelectedMajorSubassemblies(selectedMajorSubassemblies.includes(row.rowKey) ? [] : [row.rowKey])
                                  }
                                }}
                              >
                                {row.rowLabel}
                              </TableCell>
                              {["W05", "W06", "W07", "W08", "W09", "W10", "W11", "W12"].map(week => {
                                const val = row[week] as number | undefined
                                if (!val) {
                                  return <TableCell key={week} className="text-center text-[10px] text-slate-300">-</TableCell>
                                }
                                const intensity = val > 50 ? "bg-red-200 text-red-800" : val > 20 ? "bg-red-100 text-red-700" : "bg-red-50 text-red-600"
                                return (
                                  <TableCell
                                    key={week}
                                    className={`text-center cursor-pointer hover:ring-2 hover:ring-blue-300 ${intensity}`}
                                    onClick={() => {
                                      if (heatmapViewBy === "part") {
                                        setSelectedPart(row.rowKey)
                                      } else if (heatmapViewBy === "commodity") {
                                        setSelectedCommodities(selectedCommodities.includes(row.rowKey) ? [] : [row.rowKey])
                                      } else if (heatmapViewBy === "supplier") {
                                        setSelectedSuppliers(selectedSuppliers.includes(row.rowKey) ? [] : [row.rowKey])
                                      } else if (heatmapViewBy === "msa") {
                                        setSelectedMajorSubassemblies(selectedMajorSubassemblies.includes(row.rowKey) ? [] : [row.rowKey])
                                      }
                                    }}
                                  >
                                    <span className="text-[10px] font-medium">{heatmapToggle === "qty" ? val : formatCurrency(val)}</span>
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

              {/* Shortage Queue Table */}
              <Card className="border-slate-200">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-slate-900">Shortage Queue</CardTitle>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] bg-transparent">
                    <Download className="w-3 h-3 mr-1" /> Export CSV
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {shortageData.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <p className="text-sm">No shortage items matching current filters.</p>
                    </div>
                  ) : (
                    <div className="max-h-[400px] overflow-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-white z-10">
                          <TableRow className="border-b border-slate-200">
                            <TableHead className="text-[10px] font-semibold text-slate-600">Part Number</TableHead>
                            <TableHead className="text-[10px] font-semibold text-slate-600">Description</TableHead>
                            <TableHead className="text-[10px] font-semibold text-slate-600">Commodity</TableHead>
                            <TableHead className="text-[10px] font-semibold text-slate-600">Supplier</TableHead>
                            <TableHead className="text-[10px] font-semibold text-slate-600">Program</TableHead>
                            <TableHead className="text-[10px] font-semibold text-slate-600">MSA</TableHead>
                            <TableHead className="text-[10px] font-semibold text-slate-600">First Shortage</TableHead>
                            <TableHead className="text-[10px] font-semibold text-slate-600">Days Until</TableHead>
                            <TableHead className="text-[10px] font-semibold text-slate-600">Peak Qty</TableHead>
                            <TableHead className="text-[10px] font-semibold text-slate-600">Peak Value</TableHead>
                            <TableHead className="text-[10px] font-semibold text-slate-600">Supply Driver</TableHead>
                            <TableHead className="text-[10px] font-semibold text-slate-600">Impacted Deliv.</TableHead>
                            <TableHead className="text-[10px] font-semibold text-slate-600">Root Cause</TableHead>
                            <TableHead className="text-[10px] font-semibold text-slate-600">Risk</TableHead>
                            <TableHead className="text-[10px] font-semibold text-slate-600">Action</TableHead>
                            <TableHead className="text-[10px] font-semibold text-slate-600">Owner</TableHead>
                            <TableHead className="text-[10px] font-semibold text-slate-600">Status</TableHead>
                            <TableHead className="text-[10px] font-semibold text-slate-600 w-24">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {shortageData.map((row) => (
                            <TableRow
                              key={row.id}
                              className="hover:bg-slate-50 cursor-pointer"
                              onClick={() => openDrawer(row, "shortage")}
                            >
                              <TableCell className="text-[11px] text-[#8B0000] font-medium hover:underline">{row.partNumber}</TableCell>
                              <TableCell className="text-[10px] text-slate-600 max-w-[100px] truncate">{row.partDesc}</TableCell>
                              <TableCell className="text-[10px] text-slate-500">{row.commodity}</TableCell>
                              <TableCell className="text-[10px] text-slate-500">{row.supplier}</TableCell>
                              <TableCell className="text-[10px] text-slate-500 max-w-[80px] truncate">{row.program}</TableCell>
                              <TableCell className="text-[10px] text-slate-500 max-w-[80px] truncate">{row.majorSubassembly}</TableCell>
                              <TableCell className="text-[10px] font-medium text-red-600">{formatDate(row.firstShortageDate)}</TableCell>
                              <TableCell className={`text-[11px] font-bold ${row.daysUntilShortage <= 14 ? "text-red-600" : row.daysUntilShortage <= 30 ? "text-amber-600" : "text-slate-600"}`}>
                                {row.daysUntilShortage}d
                              </TableCell>
                              <TableCell className="text-[10px]">{formatNumber(row.peakShortageQty)}</TableCell>
                              <TableCell className="text-[10px]">{formatCurrency(row.peakShortageValue)}</TableCell>
                              <TableCell className="text-[10px]">
                                <span className="text-slate-600">{row.supplyDriver}</span>
                                <span className="block text-slate-400">{row.supplyDriverDate !== "N/A" ? formatDate(row.supplyDriverDate) : ""}</span>
                              </TableCell>
                              <TableCell className="text-[10px]">
                                {row.impactedDeliverables.slice(0, 1).map((d, i) => (
                                  <span key={d} className="text-[#1D4ED8]">{d}</span>
                                ))}
                                {row.impactedDeliverables.length > 1 && <span className="text-slate-400"> +{row.impactedDeliverables.length - 1}</span>}
                              </TableCell>
                              <TableCell className="text-[10px] text-slate-500 max-w-[80px] truncate">{row.rootCause}</TableCell>
                              <TableCell>
                                <Badge className={`text-[9px] ${getRiskBadgeColor(row.riskLevel)}`}>{row.riskLevel}</Badge>
                              </TableCell>
                              <TableCell className="text-[10px] text-slate-500 max-w-[80px] truncate">{row.recommendedAction}</TableCell>
                              <TableCell className="text-[10px] text-slate-600">{row.owner}</TableCell>
                              <TableCell>
                                <Badge className={`text-[9px] ${getStatusBadgeColor(row.status)}`}>{row.status}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-0.5">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 px-1.5 text-[9px] text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                    onClick={(e) => { e.stopPropagation(); alert("Promote to Near-Critical: " + row.partNumber) }}
                                  >
                                    Near-Crit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 px-1.5 text-[9px] text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={(e) => { e.stopPropagation(); alert("Promote to Critical: " + row.partNumber) }}
                                  >
                                    Critical
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

          {/* PRODUCTION CONTROL WORKFLOW - Hierarchical: Program -> MSA -> Workstation */}
          {workflowMode === "production-control" && (() => {
            // Compute hierarchy data from the same shortageData
            const programsWithShortages = [...new Set(shortageData.map(s => s.program))].map(program => {
              const programParts = shortageData.filter(s => s.program === program)
              const msas = [...new Set(programParts.map(s => s.majorSubassembly))]
              return {
                program,
                shortageCount: programParts.length,
                totalValue: programParts.reduce((sum, p) => sum + (p.peakShortageValue || 0), 0),
                criticalCount: programParts.filter(p => p.riskLevel === "Critical").length,
                highCount: programParts.filter(p => p.riskLevel === "High").length,
                msas: msas.map(msa => {
                  const msaParts = programParts.filter(s => s.majorSubassembly === msa)
                  const workstations = [...new Set(msaParts.map(s => s.workstation))]
                  return {
                    msa,
                    shortageCount: msaParts.length,
                    totalValue: msaParts.reduce((sum, p) => sum + (p.peakShortageValue || 0), 0),
                    criticalCount: msaParts.filter(p => p.riskLevel === "Critical").length,
                    highCount: msaParts.filter(p => p.riskLevel === "High").length,
                    workstations: workstations.map(ws => {
                      const wsParts = msaParts.filter(s => s.workstation === ws)
                      return {
                        workstation: ws,
                        workstationName: WORKSTATIONS.find(w => w.id === ws)?.name || ws,
                        shortageCount: wsParts.length,
                        totalValue: wsParts.reduce((sum, p) => sum + (p.peakShortageValue || 0), 0),
                        criticalCount: wsParts.filter(p => p.riskLevel === "Critical").length,
                        parts: wsParts
                      }
                    }).sort((a, b) => b.criticalCount - a.criticalCount || b.shortageCount - a.shortageCount)
                  }
                }).sort((a, b) => b.criticalCount - a.criticalCount || b.shortageCount - a.shortageCount)
              }
            }).sort((a, b) => b.criticalCount - a.criticalCount || b.shortageCount - a.shortageCount)

            // Get current view data
            const currentProgram = programsWithShortages.find(p => p.program === pcSelectedProgram)
            const currentMSA = currentProgram?.msas.find(m => m.msa === pcSelectedMSA)
            const currentWorkstation = currentMSA?.workstations.find(w => w.workstation === pcSelectedWorkstation)

            return (
              <div className="space-y-4">
                {/* Breadcrumb navigation */}
                <div className="flex items-center gap-1.5 text-xs mb-4">
                  <button
                    onClick={() => { setPcSelectedProgram(null); setPcSelectedMSA(null); setPcSelectedWorkstation(null) }}
                    className={`${!pcSelectedProgram ? "text-slate-900 font-semibold" : "text-[#8B0000] hover:underline cursor-pointer"}`}
                  >
                    All Programs
                  </button>
                  {pcSelectedProgram && (
                    <>
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                      <button
                        onClick={() => { setPcSelectedMSA(null); setPcSelectedWorkstation(null) }}
                        className={`${pcSelectedProgram && !pcSelectedMSA ? "text-slate-900 font-semibold" : "text-[#8B0000] hover:underline cursor-pointer"}`}
                      >
                        {pcSelectedProgram}
                      </button>
                    </>
                  )}
                  {pcSelectedMSA && (
                    <>
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                      <button
                        onClick={() => { setPcSelectedWorkstation(null) }}
                        className={`${pcSelectedMSA && !pcSelectedWorkstation ? "text-slate-900 font-semibold" : "text-[#8B0000] hover:underline cursor-pointer"}`}
                      >
                        {pcSelectedMSA}
                      </button>
                    </>
                  )}
                  {pcSelectedWorkstation && (
                    <>
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                      <span className="text-slate-900 font-semibold">
                        {currentWorkstation?.workstationName || pcSelectedWorkstation}
                      </span>
                    </>
                  )}
                </div>

                {/* LEVEL 1: Programs View */}
                {!pcSelectedProgram && (
                  <>
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      <Card className="border-slate-200">
                        <CardContent className="p-3">
                          <div className="text-[10px] text-slate-500 mb-1">Total Programs with Shortages</div>
                          <p className="text-2xl font-bold text-slate-900">{programsWithShortages.length}</p>
                        </CardContent>
                      </Card>
                      <Card className="border-slate-200">
                        <CardContent className="p-3">
                          <div className="text-[10px] text-slate-500 mb-1">Total Parts at Risk</div>
                          <p className="text-2xl font-bold text-amber-600">{shortageData.length}</p>
                        </CardContent>
                      </Card>
                      <Card className="border-slate-200">
                        <CardContent className="p-3">
                          <div className="text-[10px] text-slate-500 mb-1">Critical Parts</div>
                          <p className="text-2xl font-bold text-red-600">{shortageData.filter(s => s.riskLevel === "Critical").length}</p>
                        </CardContent>
                      </Card>
                      <Card className="border-slate-200">
                        <CardContent className="p-3">
                          <div className="text-[10px] text-slate-500 mb-1">Total Shortage Value</div>
                          <p className="text-2xl font-bold text-slate-900">{formatCurrency(shortageData.reduce((sum, s) => sum + (s.peakShortageValue || 0), 0))}</p>
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="border-slate-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-900">Shortage by Program</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="max-h-[400px] overflow-auto">
                          <Table>
                            <TableHeader className="sticky top-0 bg-white z-10">
                              <TableRow className="border-b border-slate-200">
                                <TableHead className="text-[10px] font-semibold text-slate-600">Program</TableHead>
                                <TableHead className="text-[10px] font-semibold text-slate-600 text-center">Parts with Shortage</TableHead>
                                <TableHead className="text-[10px] font-semibold text-slate-600 text-center">Critical</TableHead>
                                <TableHead className="text-[10px] font-semibold text-slate-600 text-center">High</TableHead>
                                <TableHead className="text-[10px] font-semibold text-slate-600 text-center">Total Value</TableHead>
                                <TableHead className="text-[10px] font-semibold text-slate-600 text-center">MSAs Affected</TableHead>
                                <TableHead className="text-[10px] font-semibold text-slate-600 w-20"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {programsWithShortages.map((prog) => (
                                <TableRow
                                  key={prog.program}
                                  className="hover:bg-slate-50 cursor-pointer"
                                  onClick={() => setPcSelectedProgram(prog.program)}
                                >
                                  <TableCell className="text-[11px] font-medium text-slate-900">{prog.program}</TableCell>
                                  <TableCell className="text-[11px] text-center font-semibold text-amber-600">{prog.shortageCount}</TableCell>
                                  <TableCell className="text-center">
                                    {prog.criticalCount > 0 && <Badge className="text-[9px] bg-red-100 text-red-700">{prog.criticalCount}</Badge>}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {prog.highCount > 0 && <Badge className="text-[9px] bg-amber-100 text-amber-700">{prog.highCount}</Badge>}
                                  </TableCell>
                                  <TableCell className="text-[10px] text-center text-slate-600">{formatCurrency(prog.totalValue)}</TableCell>
                                  <TableCell className="text-[10px] text-center text-slate-600">{prog.msas.length}</TableCell>
                                  <TableCell>
                                    <Button variant="ghost" size="sm" className="h-6 text-[10px] text-[#8B0000]">
                                      Drill In <ChevronRight className="w-3 h-3 ml-1" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* LEVEL 2: MSAs within Program */}
                {pcSelectedProgram && !pcSelectedMSA && currentProgram && (
                  <>
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      <Card className="border-slate-200">
                        <CardContent className="p-3">
                          <div className="text-[10px] text-slate-500 mb-1">MSAs with Shortages</div>
                          <p className="text-2xl font-bold text-slate-900">{currentProgram.msas.length}</p>
                        </CardContent>
                      </Card>
                      <Card className="border-slate-200">
                        <CardContent className="p-3">
                          <div className="text-[10px] text-slate-500 mb-1">Parts at Risk</div>
                          <p className="text-2xl font-bold text-amber-600">{currentProgram.shortageCount}</p>
                        </CardContent>
                      </Card>
                      <Card className="border-slate-200">
                        <CardContent className="p-3">
                          <div className="text-[10px] text-slate-500 mb-1">Critical Parts</div>
                          <p className="text-2xl font-bold text-red-600">{currentProgram.criticalCount}</p>
                        </CardContent>
                      </Card>
                      <Card className="border-slate-200">
                        <CardContent className="p-3">
                          <div className="text-[10px] text-slate-500 mb-1">Total Shortage Value</div>
                          <p className="text-2xl font-bold text-slate-900">{formatCurrency(currentProgram.totalValue)}</p>
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="border-slate-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-900">Shortage by Major Subassembly</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="max-h-[400px] overflow-auto">
                          <Table>
                            <TableHeader className="sticky top-0 bg-white z-10">
                              <TableRow className="border-b border-slate-200">
                                <TableHead className="text-[10px] font-semibold text-slate-600">Major Subassembly</TableHead>
                                <TableHead className="text-[10px] font-semibold text-slate-600 text-center">Parts with Shortage</TableHead>
                                <TableHead className="text-[10px] font-semibold text-slate-600 text-center">Critical</TableHead>
                                <TableHead className="text-[10px] font-semibold text-slate-600 text-center">High</TableHead>
                                <TableHead className="text-[10px] font-semibold text-slate-600 text-center">Total Value</TableHead>
                                <TableHead className="text-[10px] font-semibold text-slate-600 text-center">Workstations</TableHead>
                                <TableHead className="text-[10px] font-semibold text-slate-600 w-20"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {currentProgram.msas.map((msa) => (
                                <TableRow
                                  key={msa.msa}
                                  className="hover:bg-slate-50 cursor-pointer"
                                  onClick={() => setPcSelectedMSA(msa.msa)}
                                >
                                  <TableCell className="text-[11px] font-medium text-slate-900">{msa.msa}</TableCell>
                                  <TableCell className="text-[11px] text-center font-semibold text-amber-600">{msa.shortageCount}</TableCell>
                                  <TableCell className="text-center">
                                    {msa.criticalCount > 0 && <Badge className="text-[9px] bg-red-100 text-red-700">{msa.criticalCount}</Badge>}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {msa.highCount > 0 && <Badge className="text-[9px] bg-amber-100 text-amber-700">{msa.highCount}</Badge>}
                                  </TableCell>
                                  <TableCell className="text-[10px] text-center text-slate-600">{formatCurrency(msa.totalValue)}</TableCell>
                                  <TableCell className="text-[10px] text-center text-slate-600">{msa.workstations.length}</TableCell>
                                  <TableCell>
                                    <Button variant="ghost" size="sm" className="h-6 text-[10px] text-[#8B0000]">
                                      Drill In <ChevronRight className="w-3 h-3 ml-1" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* LEVEL 3: Workstations within MSA */}
                {pcSelectedMSA && !pcSelectedWorkstation && currentMSA && (
                  <>
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      <Card className="border-slate-200">
                        <CardContent className="p-3">
                          <div className="text-[10px] text-slate-500 mb-1">Workstations Affected</div>
                          <p className="text-2xl font-bold text-slate-900">{currentMSA.workstations.length}</p>
                        </CardContent>
                      </Card>
                      <Card className="border-slate-200">
                        <CardContent className="p-3">
                          <div className="text-[10px] text-slate-500 mb-1">Parts at Risk</div>
                          <p className="text-2xl font-bold text-amber-600">{currentMSA.shortageCount}</p>
                        </CardContent>
                      </Card>
                      <Card className="border-slate-200">
                        <CardContent className="p-3">
                          <div className="text-[10px] text-slate-500 mb-1">Critical Parts</div>
                          <p className="text-2xl font-bold text-red-600">{currentMSA.criticalCount}</p>
                        </CardContent>
                      </Card>
                      <Card className="border-slate-200">
                        <CardContent className="p-3">
                          <div className="text-[10px] text-slate-500 mb-1">Total Shortage Value</div>
                          <p className="text-2xl font-bold text-slate-900">{formatCurrency(currentMSA.totalValue)}</p>
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="border-slate-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-900">Shortage by Workstation</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="max-h-[400px] overflow-auto">
                          <Table>
                            <TableHeader className="sticky top-0 bg-white z-10">
                              <TableRow className="border-b border-slate-200">
                                <TableHead className="text-[10px] font-semibold text-slate-600">Workstation</TableHead>
                                <TableHead className="text-[10px] font-semibold text-slate-600 text-center">Parts with Shortage</TableHead>
                                <TableHead className="text-[10px] font-semibold text-slate-600 text-center">Critical</TableHead>
                                <TableHead className="text-[10px] font-semibold text-slate-600 text-center">Total Value</TableHead>
                                <TableHead className="text-[10px] font-semibold text-slate-600 w-20"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {currentMSA.workstations.map((ws) => (
                                <TableRow
                                  key={ws.workstation}
                                  className="hover:bg-slate-50 cursor-pointer"
                                  onClick={() => setPcSelectedWorkstation(ws.workstation)}
                                >
                                  <TableCell className="text-[11px] font-medium text-slate-900">{ws.workstationName}</TableCell>
                                  <TableCell className="text-[11px] text-center font-semibold text-amber-600">{ws.shortageCount}</TableCell>
                                  <TableCell className="text-center">
                                    {ws.criticalCount > 0 && <Badge className="text-[9px] bg-red-100 text-red-700">{ws.criticalCount}</Badge>}
                                  </TableCell>
                                  <TableCell className="text-[10px] text-center text-slate-600">{formatCurrency(ws.totalValue)}</TableCell>
                                  <TableCell>
                                    <Button variant="ghost" size="sm" className="h-6 text-[10px] text-[#8B0000]">
                                      View Parts <ChevronRight className="w-3 h-3 ml-1" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* LEVEL 4: Parts within Workstation */}
                {pcSelectedWorkstation && currentWorkstation && (
                  <>
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      <Card className="border-slate-200">
                        <CardContent className="p-3">
                          <div className="text-[10px] text-slate-500 mb-1">Parts with Shortage</div>
                          <p className="text-2xl font-bold text-amber-600">{currentWorkstation.shortageCount}</p>
                        </CardContent>
                      </Card>
                      <Card className="border-slate-200">
                        <CardContent className="p-3">
                          <div className="text-[10px] text-slate-500 mb-1">Critical Parts</div>
                          <p className="text-2xl font-bold text-red-600">{currentWorkstation.criticalCount}</p>
                        </CardContent>
                      </Card>
                      <Card className="border-slate-200">
                        <CardContent className="p-3">
                          <div className="text-[10px] text-slate-500 mb-1">Total Shortage Value</div>
                          <p className="text-2xl font-bold text-slate-900">{formatCurrency(currentWorkstation.totalValue)}</p>
                        </CardContent>
                      </Card>
                      <Card className="border-slate-200">
                        <CardContent className="p-3">
                          <div className="text-[10px] text-slate-500 mb-1">Earliest Shortage</div>
                          <p className="text-lg font-bold text-red-600">
                            {currentWorkstation.parts.length > 0 
                              ? formatDate(currentWorkstation.parts.sort((a, b) => new Date(a.firstShortageDate).getTime() - new Date(b.firstShortageDate).getTime())[0].firstShortageDate)
                              : "N/A"
                            }
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="border-slate-200">
                      <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-semibold text-slate-900">Part Shortages at {currentWorkstation.workstationName}</CardTitle>
                        <Button variant="outline" size="sm" className="h-6 text-[10px] bg-transparent">
                          <Download className="w-3 h-3 mr-1" /> Export CSV
                        </Button>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="max-h-[400px] overflow-auto">
                          <Table>
                            <TableHeader className="sticky top-0 bg-white z-10">
                              <TableRow className="border-b border-slate-200">
                                <TableHead className="text-[10px] font-semibold text-slate-600">Part Number</TableHead>
                                <TableHead className="text-[10px] font-semibold text-slate-600">Description</TableHead>
                                <TableHead className="text-[10px] font-semibold text-slate-600">First Shortage</TableHead>
                                <TableHead className="text-[10px] font-semibold text-slate-600">Days Until</TableHead>
                                <TableHead className="text-[10px] font-semibold text-slate-600">Peak Qty</TableHead>
                                <TableHead className="text-[10px] font-semibold text-slate-600">Value</TableHead>
                                <TableHead className="text-[10px] font-semibold text-slate-600">Risk</TableHead>
                                <TableHead className="text-[10px] font-semibold text-slate-600">Owner</TableHead>
                                <TableHead className="text-[10px] font-semibold text-slate-600">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {currentWorkstation.parts.map((row) => (
                                <TableRow
                                  key={row.id}
                                  className="hover:bg-slate-50 cursor-pointer"
                                  onClick={() => openDrawer(row, "shortage")}
                                >
                                  <TableCell className="text-[11px] text-[#8B0000] font-medium hover:underline">{row.partNumber}</TableCell>
                                  <TableCell className="text-[10px] text-slate-600 max-w-[150px] truncate">{row.partDesc}</TableCell>
                                  <TableCell className="text-[10px] font-medium text-red-600">{formatDate(row.firstShortageDate)}</TableCell>
                                  <TableCell className={`text-[11px] font-bold ${row.daysUntilShortage <= 14 ? "text-red-600" : row.daysUntilShortage <= 30 ? "text-amber-600" : "text-slate-600"}`}>
                                    {row.daysUntilShortage}d
                                  </TableCell>
                                  <TableCell className="text-[10px] text-slate-600">{formatNumber(row.peakShortageQty)}</TableCell>
                                  <TableCell className="text-[10px] text-slate-600">{formatCurrency(row.peakShortageValue)}</TableCell>
                                  <TableCell>
                                    <Badge className={`text-[9px] ${getRiskBadgeColor(row.riskLevel)}`}>{row.riskLevel}</Badge>
                                  </TableCell>
                                  <TableCell className="text-[10px] text-slate-600">{row.owner}</TableCell>
                                  <TableCell>
                                    <Badge className={`text-[9px] ${getStatusBadgeColor(row.status)}`}>{row.status}</Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            )
          })()}

          {/* FLOOR TECHNICIAN PERSONA - Morning Story: My Assignments Today */}
          {workflowMode === "floor-technician" && (
            <div className="space-y-4">
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    Floor Technician Morning Story
                  </CardTitle>
                  <p className="text-xs text-slate-600 mt-1">Start here → Review your assignments → Check blockers → Get to work</p>
                </CardHeader>
              </Card>

              {/* Step 1: My Jobs Today */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">① My Jobs Today</CardTitle>
                    <Badge className="bg-blue-100 text-blue-700">3 Active Jobs</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="border-b border-slate-200">
                        <TableHead className="text-[10px] font-semibold text-slate-600">Job #</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Workstation</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Assembly</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Priority</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Start Time</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { job: "JOB-2026-0178", ws: "WC-001", assembly: "MSA-001 Receiver", priority: "High", start: "08:00 AM", status: "Ready" },
                        { job: "JOB-2026-0182", ws: "WC-001", assembly: "MSA-001 Receiver", priority: "Critical", start: "10:30 AM", status: "Material Hold" },
                        { job: "JOB-2026-0189", ws: "WC-001", assembly: "MSA-002 Transmitter", priority: "Medium", start: "02:00 PM", status: "Ready" },
                      ].map((job, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-50">
                          <TableCell className="text-[11px] text-[#8B0000] font-medium">{job.job}</TableCell>
                          <TableCell className="text-[10px] text-slate-600">{job.ws}</TableCell>
                          <TableCell className="text-[10px] text-slate-700">{job.assembly}</TableCell>
                          <TableCell>
                            <Badge className={`text-[9px] ${job.priority === "Critical" ? "bg-red-100 text-red-700" : job.priority === "High" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                              {job.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[10px] text-slate-600">{job.start}</TableCell>
                          <TableCell>
                            <Badge className={`text-[9px] ${job.status === "Material Hold" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                              {job.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Step 2: Tools & Materials Needed */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">② Tools & Materials for JOB-2026-0178 (Next Up)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-2">Required Tools:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {["Soldering Iron #12", "Multimeter DMM-450", "Torque Wrench TQ-35"].map((tool, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded text-[10px]">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          {tool}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-2">Required Materials:</p>
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-[10px] font-semibold text-slate-600">Part #</TableHead>
                          <TableHead className="text-[10px] font-semibold text-slate-600">Description</TableHead>
                          <TableHead className="text-[10px] font-semibold text-slate-600">Qty Needed</TableHead>
                          <TableHead className="text-[10px] font-semibold text-slate-600">Location</TableHead>
                          <TableHead className="text-[10px] font-semibold text-slate-600">Available</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[
                          { part: "C-RF-003421", desc: "Capacitor 100pF", qty: 8, loc: "Bin A-12", avail: "Yes" },
                          { part: "R-SM-007834", desc: "Resistor 10kΩ", qty: 12, loc: "Bin A-14", avail: "Yes" },
                          { part: "IC-DSP-09112", desc: "DSP Chip", qty: 2, loc: "Secure Vault", avail: "Yes" },
                        ].map((mat, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-[10px] text-[#8B0000] font-medium">{mat.part}</TableCell>
                            <TableCell className="text-[10px] text-slate-600">{mat.desc}</TableCell>
                            <TableCell className="text-[10px] text-slate-900 font-medium">{mat.qty}</TableCell>
                            <TableCell className="text-[10px] text-slate-600">{mat.loc}</TableCell>
                            <TableCell>
                              <Badge className="text-[9px] bg-green-100 text-green-700">{mat.avail}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-2">Required Certifications:</p>
                    <div className="flex gap-2">
                      <Badge className="bg-blue-100 text-blue-700">IPC-A-610 Certified</Badge>
                      <Badge className="bg-blue-100 text-blue-700">ESD Trained</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Step 3: Blockers & Alerts */}
              <Card className="border-red-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    ③ Blockers & Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-xs font-semibold text-red-700 mb-1">JOB-2026-0182 - Material Hold</p>
                    <p className="text-[10px] text-slate-600 mb-2">Part C-RF-009881 is short 5 units. Expected delivery: Feb 6, 2026 (2 days)</p>
                    <Button className="h-6 text-[10px] bg-[#8B0000] hover:bg-[#6B0000]">
                      Notify Supervisor
                    </Button>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                    <p className="text-xs font-semibold text-amber-700 mb-1">Tool Calibration Due</p>
                    <p className="text-[10px] text-slate-600">Torque Wrench TQ-35 calibration expires today. Schedule recalibration before use.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* PROGRAM MANAGER PERSONA - Morning Story: Hot Spots Across Programs */}
          {workflowMode === "program-manager" && (
            <div className="space-y-4">
              <Card className="border-purple-200 bg-purple-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-purple-600" />
                    Program Manager Morning Story
                  </CardTitle>
                  <p className="text-xs text-slate-600 mt-1">Start here → Check critical shortages → Review procurement delays → Monitor factory constraints → Review NCRs</p>
                </CardHeader>
              </Card>

              {/* Step 1: Critical Material Shortages */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">① Critical Material Shortages (Next 14 Days)</CardTitle>
                    <Badge className="bg-red-100 text-red-700">8 Critical Parts</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="border-b border-slate-200">
                        <TableHead className="text-[10px] font-semibold text-slate-600">Part #</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Program</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">First Shortage</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Peak Qty</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Deliverables At Risk</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Owner</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shortageData.filter(s => s.daysUntilShortage <= 14 && s.riskLevel === "Critical").slice(0, 5).map((row) => (
                        <TableRow key={row.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => openDrawer(row, "shortage")}>
                          <TableCell className="text-[11px] text-[#8B0000] font-medium">{row.partNumber}</TableCell>
                          <TableCell className="text-[10px] text-slate-700">{row.program}</TableCell>
                          <TableCell className="text-[10px] font-medium text-red-600">{formatDate(row.firstShortageDate)}</TableCell>
                          <TableCell className="text-[10px] text-slate-900 font-medium">{formatNumber(row.peakShortageQty)}</TableCell>
                          <TableCell className="text-[10px] text-slate-600">{row.deliverablesImpacted}</TableCell>
                          <TableCell className="text-[10px] text-slate-600">{row.owner}</TableCell>
                          <TableCell>
                            <Badge className={`text-[9px] ${getStatusBadgeColor(row.status)}`}>{row.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Step 2: Procurement Hot Spots */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">② Procurement Hot Spots</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <Card className="border-red-200">
                      <CardContent className="p-3">
                        <p className="text-[10px] text-slate-500 mb-1">Late POs (Past Due)</p>
                        <p className="text-lg font-bold text-red-600">12</p>
                        <p className="text-[9px] text-slate-500 mt-1">Avg 8 days late</p>
                      </CardContent>
                    </Card>
                    <Card className="border-amber-200">
                      <CardContent className="p-3">
                        <p className="text-[10px] text-slate-500 mb-1">At-Risk POs</p>
                        <p className="text-lg font-bold text-amber-600">18</p>
                        <p className="text-[9px] text-slate-500 mt-1">Due next 7 days</p>
                      </CardContent>
                    </Card>
                    <Card className="border-blue-200">
                      <CardContent className="p-3">
                        <p className="text-[10px] text-slate-500 mb-1">Expedite Requests</p>
                        <p className="text-lg font-bold text-blue-600">6</p>
                        <p className="text-[9px] text-slate-500 mt-1">Awaiting approval</p>
                      </CardContent>
                    </Card>
                  </div>
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-[10px] font-semibold text-slate-600">PO #</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Supplier</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Parts</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Due Date</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Days Late</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Programs Impacted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { po: "PO-2026-0145", supplier: "Murata", parts: 3, due: "Jan 28", late: 7, programs: 2 },
                        { po: "PO-2026-0152", supplier: "Texas Instruments", parts: 2, due: "Jan 30", late: 5, programs: 1 },
                        { po: "PO-2026-0168", supplier: "Amphenol", parts: 5, due: "Feb 2", late: 3, programs: 3 },
                      ].map((po, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-50">
                          <TableCell className="text-[11px] text-[#8B0000] font-medium">{po.po}</TableCell>
                          <TableCell className="text-[10px] text-slate-700">{po.supplier}</TableCell>
                          <TableCell className="text-[10px] text-slate-600">{po.parts} parts</TableCell>
                          <TableCell className="text-[10px] text-red-600 font-medium">{po.due}</TableCell>
                          <TableCell className="text-[10px] text-red-600 font-bold">{po.late}d late</TableCell>
                          <TableCell className="text-[10px] text-slate-600">{po.programs}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Step 3: Factory Constraints */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">③ Factory Constraints & Capacity Issues</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                    <p className="text-xs font-semibold text-amber-700 mb-1">WC-001 SMT Line 1 - Capacity Overload</p>
                    <p className="text-[10px] text-slate-600">Current utilization: 142%. 8 jobs queued. Est. backlog clearance: 6 days</p>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                    <p className="text-xs font-semibold text-amber-700 mb-1">WC-006 Display Integration - Equipment Down</p>
                    <p className="text-[10px] text-slate-600">Pick-and-place machine failure. Maintenance ETA: Feb 5. 12 jobs on hold.</p>
                  </div>
                </CardContent>
              </Card>

              {/* Step 4: Major NCRs */}
              <Card className="border-red-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    ④ Major NCRs Affecting Deliveries
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-[10px] font-semibold text-slate-600">NCR #</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Issue</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Units Affected</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Programs</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Disposition</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Target Close</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { ncr: "NCR-2026-0028", issue: "Solder joint failures on MSA-001", units: 45, programs: "Manpack Radio, Vehicle Mount", disp: "Rework", close: "Feb 8" },
                        { ncr: "NCR-2026-0031", issue: "RF calibration out of spec", units: 22, programs: "Tactical HF Radio", disp: "Under Review", close: "Feb 10" },
                      ].map((ncr, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-50">
                          <TableCell className="text-[11px] text-[#8B0000] font-medium">{ncr.ncr}</TableCell>
                          <TableCell className="text-[10px] text-slate-700">{ncr.issue}</TableCell>
                          <TableCell className="text-[10px] text-slate-900 font-medium">{ncr.units}</TableCell>
                          <TableCell className="text-[10px] text-slate-600 max-w-[150px]">{ncr.programs}</TableCell>
                          <TableCell>
                            <Badge className="text-[9px] bg-amber-100 text-amber-700">{ncr.disp}</Badge>
                          </TableCell>
                          <TableCell className="text-[10px] text-slate-600">{ncr.close}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* MATERIAL PLANNER PERSONA - Morning Story: Critical Shortages Across Portfolio */}
          {workflowMode === "material-planner" && (
            <div className="space-y-4">
              <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Package className="w-4 h-4 text-green-600" />
                    Material Planner Morning Story
                  </CardTitle>
                  <p className="text-xs text-slate-600 mt-1">Start here → Review critical shortages → Check delivery risks → Expedite actions → Monitor supplier performance</p>
                </CardHeader>
              </Card>

              {/* Step 1: Most Critical Shortages (Portfolio View) */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">① Most Critical Shortages Across Portfolio</CardTitle>
                    <Badge className="bg-red-100 text-red-700">{shortageData.filter(s => s.riskLevel === "Critical").length} Critical</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="border-b border-slate-200">
                        <TableHead className="text-[10px] font-semibold text-slate-600">Part #</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Commodity</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Supplier</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">First Shortage</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Days Until</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Peak Qty</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Programs</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shortageData.filter(s => s.riskLevel === "Critical").slice(0, 8).map((row) => (
                        <TableRow key={row.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => openDrawer(row, "shortage")}>
                          <TableCell className="text-[11px] text-[#8B0000] font-medium">{row.partNumber}</TableCell>
                          <TableCell className="text-[10px] text-slate-600">{row.commodity}</TableCell>
                          <TableCell className="text-[10px] text-slate-700">{row.supplier}</TableCell>
                          <TableCell className="text-[10px] font-medium text-red-600">{formatDate(row.firstShortageDate)}</TableCell>
                          <TableCell className={`text-[11px] font-bold ${row.daysUntilShortage <= 14 ? "text-red-600" : "text-amber-600"}`}>
                            {row.daysUntilShortage}d
                          </TableCell>
                          <TableCell className="text-[10px] text-slate-900 font-medium">{formatNumber(row.peakShortageQty)}</TableCell>
                          <TableCell className="text-[10px] text-slate-600">{row.program}</TableCell>
                          <TableCell>
                            <Button className="h-6 text-[10px] bg-[#8B0000] hover:bg-[#6B0000]">
                              Expedite
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Step 2: Delivery Risks (Inbound POs) */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">② Delivery Risks - Inbound POs at Risk</CardTitle>
                    <Badge className="bg-amber-100 text-amber-700">15 At Risk</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-4 gap-3">
                    <Card className="border-red-200">
                      <CardContent className="p-3">
                        <p className="text-[10px] text-slate-500 mb-1">Past Due</p>
                        <p className="text-lg font-bold text-red-600">8</p>
                      </CardContent>
                    </Card>
                    <Card className="border-amber-200">
                      <CardContent className="p-3">
                        <p className="text-[10px] text-slate-500 mb-1">Due This Week</p>
                        <p className="text-lg font-bold text-amber-600">12</p>
                      </CardContent>
                    </Card>
                    <Card className="border-blue-200">
                      <CardContent className="p-3">
                        <p className="text-[10px] text-slate-500 mb-1">Awaiting Approval</p>
                        <p className="text-lg font-bold text-blue-600">5</p>
                      </CardContent>
                    </Card>
                    <Card className="border-green-200">
                      <CardContent className="p-3">
                        <p className="text-[10px] text-slate-500 mb-1">On Track</p>
                        <p className="text-lg font-bold text-green-600">28</p>
                      </CardContent>
                    </Card>
                  </div>
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-[10px] font-semibold text-slate-600">PO #</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Supplier</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Part Count</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Promise Date</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Status</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Risk</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { po: "PO-2026-0145", supplier: "Murata", parts: 3, promise: "Jan 28 (7d late)", status: "In Transit", risk: "High" },
                        { po: "PO-2026-0152", supplier: "Texas Instruments", parts: 2, promise: "Feb 5", status: "Manufacturing", risk: "Medium" },
                        { po: "PO-2026-0168", supplier: "Amphenol", parts: 5, promise: "Feb 8", status: "QA Hold", risk: "High" },
                      ].map((po, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-50">
                          <TableCell className="text-[11px] text-[#8B0000] font-medium">{po.po}</TableCell>
                          <TableCell className="text-[10px] text-slate-700">{po.supplier}</TableCell>
                          <TableCell className="text-[10px] text-slate-600">{po.parts}</TableCell>
                          <TableCell className="text-[10px] text-slate-600">{po.promise}</TableCell>
                          <TableCell>
                            <Badge className="text-[9px] bg-blue-100 text-blue-700">{po.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[9px] ${po.risk === "High" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                              {po.risk}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Step 3: Supplier Performance Dashboard */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">③ Supplier Performance (Last 30 Days)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Supplier</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Open POs</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">On-Time %</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Avg Days Late</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Quality Issues</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { supplier: "Murata", pos: 8, ontime: 62, late: 5.2, quality: 1, score: "C" },
                        { supplier: "Texas Instruments", pos: 5, ontime: 88, late: 2.1, quality: 0, score: "A" },
                        { supplier: "Amphenol", pos: 12, ontime: 75, late: 3.8, quality: 2, score: "B" },
                        { supplier: "Xilinx/AMD", pos: 3, ontime: 95, late: 0.5, quality: 0, score: "A+" },
                      ].map((sup, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-50">
                          <TableCell className="text-[10px] text-slate-700 font-medium">{sup.supplier}</TableCell>
                          <TableCell className="text-[10px] text-slate-600">{sup.pos}</TableCell>
                          <TableCell className={`text-[10px] font-medium ${sup.ontime >= 90 ? "text-green-600" : sup.ontime >= 75 ? "text-amber-600" : "text-red-600"}`}>
                            {sup.ontime}%
                          </TableCell>
                          <TableCell className="text-[10px] text-slate-600">{sup.late}d</TableCell>
                          <TableCell className="text-[10px] text-slate-600">{sup.quality}</TableCell>
                          <TableCell>
                            <Badge className={`text-[9px] ${sup.score.includes("A") ? "bg-green-100 text-green-700" : sup.score === "B" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                              {sup.score}
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

          {/* QUALITY ENGINEER PERSONA - Morning Story: Defect Clustering & Process Issues */}
          {workflowMode === "quality-engineer" && (
            <div className="space-y-4">
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CircleDot className="w-4 h-4 text-orange-600" />
                    Quality Engineer Morning Story
                  </CardTitle>
                  <p className="text-xs text-slate-600 mt-1">Start here → Review defect clusters → Check problematic workstations → Analyze NCRs → Monitor yield trends</p>
                </CardHeader>
              </Card>

              {/* Step 1: Defect Clustering Analysis */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">① Defect Clustering - Where Are Defects Occurring?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-4 gap-3">
                    <Card className="border-red-200">
                      <CardContent className="p-3">
                        <p className="text-[10px] text-slate-500 mb-1">Active NCRs</p>
                        <p className="text-lg font-bold text-red-600">14</p>
                      </CardContent>
                    </Card>
                    <Card className="border-amber-200">
                      <CardContent className="p-3">
                        <p className="text-[10px] text-slate-500 mb-1">Units on Hold</p>
                        <p className="text-lg font-bold text-amber-600">67</p>
                      </CardContent>
                    </Card>
                    <Card className="border-blue-200">
                      <CardContent className="p-3">
                        <p className="text-[10px] text-slate-500 mb-1">Rework Queue</p>
                        <p className="text-lg font-bold text-blue-600">42</p>
                      </CardContent>
                    </Card>
                    <Card className="border-slate-200">
                      <CardContent className="p-3">
                        <p className="text-[10px] text-slate-500 mb-1">Avg FPY (7d)</p>
                        <p className="text-lg font-bold text-slate-900">87.3%</p>
                      </CardContent>
                    </Card>
                  </div>
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Defect Type</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Count (7d)</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Primary Location</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">MSA Most Affected</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Trend</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { defect: "Solder Joint Cold", count: 18, location: "WC-001 SMT Line 1", msa: "MSA-001 Receiver", trend: "↑ +40%" },
                        { defect: "Component Misalignment", count: 12, location: "WC-002 SMT Line 2", msa: "MSA-002 Transmitter", trend: "→ Stable" },
                        { defect: "RF Calibration OOS", count: 8, location: "WC-004 Test Station 1", msa: "MSA-005 Antenna Array", trend: "↑ +25%" },
                        { defect: "Conformal Coating Voids", count: 6, location: "WC-003 Final Assembly A", msa: "MSA-001 Receiver", trend: "↓ -15%" },
                      ].map((def, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-50">
                          <TableCell className="text-[10px] text-slate-700 font-medium">{def.defect}</TableCell>
                          <TableCell className="text-[10px] text-slate-900 font-bold">{def.count}</TableCell>
                          <TableCell className="text-[10px] text-[#8B0000]">{def.location}</TableCell>
                          <TableCell className="text-[10px] text-slate-600">{def.msa}</TableCell>
                          <TableCell className={`text-[10px] font-medium ${def.trend.includes("↑") ? "text-red-600" : def.trend.includes("↓") ? "text-green-600" : "text-slate-600"}`}>
                            {def.trend}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Step 2: Problematic Workstations / Buildings */}
              <Card className="border-red-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    ② Problematic Workstations & Processes
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Workstation</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Building</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">FPY (7d)</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Defects</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Top Issue</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { ws: "WC-001 SMT Line 1", building: "Bldg A", fpy: 78, defects: 18, issue: "Cold solder joints", status: "Under Investigation" },
                        { ws: "WC-004 Test Station 1", building: "Bldg B", fpy: 82, defects: 8, issue: "RF cal OOS", status: "Action Plan Active" },
                        { ws: "WC-002 SMT Line 2", building: "Bldg A", fpy: 85, defects: 12, issue: "Component misalign", status: "Monitoring" },
                      ].map((ws, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-50">
                          <TableCell className="text-[10px] text-[#8B0000] font-medium">{ws.ws}</TableCell>
                          <TableCell className="text-[10px] text-slate-600">{ws.building}</TableCell>
                          <TableCell className={`text-[10px] font-bold ${ws.fpy < 80 ? "text-red-600" : ws.fpy < 90 ? "text-amber-600" : "text-green-600"}`}>
                            {ws.fpy}%
                          </TableCell>
                          <TableCell className="text-[10px] text-slate-900 font-medium">{ws.defects}</TableCell>
                          <TableCell className="text-[10px] text-slate-700">{ws.issue}</TableCell>
                          <TableCell>
                            <Badge className={`text-[9px] ${ws.status.includes("Investigation") ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                              {ws.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Step 3: Active NCRs */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">③ Active NCRs Requiring Action</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-[10px] font-semibold text-slate-600">NCR #</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Issue Description</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">MSA</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Units</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Opened</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Disposition</TableHead>
                        <TableHead className="text-[10px] font-semibold text-slate-600">Owner</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { ncr: "NCR-2026-0028", issue: "Solder joint failures - cold joints detected during inspection", msa: "MSA-001 Receiver", units: 45, opened: "Jan 28", disp: "Rework", owner: "J. Martinez" },
                        { ncr: "NCR-2026-0031", issue: "RF calibration out of spec - power output low", msa: "MSA-005 Antenna Array", units: 22, opened: "Jan 30", disp: "Under Review", owner: "S. Chen" },
                        { ncr: "NCR-2026-0033", issue: "Component orientation incorrect - capacitor polarity", msa: "MSA-003 Power Supply", units: 15, opened: "Feb 1", disp: "Scrap", owner: "K. Patel" },
                      ].map((ncr, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-50 cursor-pointer">
                          <TableCell className="text-[11px] text-[#8B0000] font-medium">{ncr.ncr}</TableCell>
                          <TableCell className="text-[10px] text-slate-700 max-w-[200px]">{ncr.issue}</TableCell>
                          <TableCell className="text-[10px] text-slate-600">{ncr.msa}</TableCell>
                          <TableCell className="text-[10px] text-slate-900 font-medium">{ncr.units}</TableCell>
                          <TableCell className="text-[10px] text-slate-600">{ncr.opened}</TableCell>
                          <TableCell>
                            <Badge className={`text-[9px] ${ncr.disp === "Scrap" ? "bg-red-100 text-red-700" : ncr.disp === "Rework" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                              {ncr.disp}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[10px] text-slate-600">{ncr.owner}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Step 4: Yield Trends */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">④ First Pass Yield Trends by MSA</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { msa: "MSA-001 Receiver", fpy: 78, trend: "↓ -8%", status: "Critical" },
                    { msa: "MSA-002 Transmitter", fpy: 92, trend: "→ Stable", status: "Good" },
                    { msa: "MSA-003 Power Supply", fpy: 88, trend: "↑ +3%", status: "Fair" },
                    { msa: "MSA-005 Antenna Array", fpy: 82, trend: "↓ -5%", status: "At Risk" },
                  ].map((msa, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border border-slate-200 rounded hover:bg-slate-50">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-slate-700">{msa.msa}</p>
                        <p className="text-[10px] text-slate-500">7-day rolling avg</p>
                      </div>
                      <div className="text-right mr-6">
                        <p className={`text-lg font-bold ${msa.fpy < 80 ? "text-red-600" : msa.fpy < 90 ? "text-amber-600" : "text-green-600"}`}>
                          {msa.fpy}%
                        </p>
                        <p className={`text-[10px] font-medium ${msa.trend.includes("↓") ? "text-red-600" : msa.trend.includes("↑") ? "text-green-600" : "text-slate-600"}`}>
                          {msa.trend}
                        </p>
                      </div>
                      <Badge className={`text-[9px] ${msa.status === "Critical" ? "bg-red-100 text-red-700" : msa.status === "At Risk" ? "bg-amber-100 text-amber-700" : msa.status === "Fair" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                        {msa.status}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {viewMode === "long-lead" && (
        <>
          {/* Definition Line */}
          <div className="flex items-center gap-2 px-1 py-2 text-sm text-slate-600">
            <div className="relative group">
              <Info className="h-4 w-4 text-slate-400 cursor-help" />
              <div className="absolute z-30 bottom-full left-0 mb-2 w-[420px] p-3 text-xs bg-slate-900 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <p className="font-medium mb-2">Long-Lead Calculation:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li><strong>Effective Lead Time:</strong> Supplier lead time + internal approval/inspection/kitting time</li>
                  <li><strong>Time-to-Need:</strong> min(required date across impacted deliverables within horizon) − today</li>
                  <li><strong>LT Margin Days:</strong> Time-to-Need − Effective Lead Time</li>
                  <li><strong>Long-Lead if:</strong> Effective Lead Time {">="} {longLeadThreshold} days OR LT Margin Days {"<="} {marginThreshold} days</li>
                </ul>
              </div>
            </div>
            <span>Long-Lead flags parts where effective replenishment time is high relative to time-to-need.</span>
          </div>

          {/* Long-Lead Controls */}
          <div className="flex items-center gap-4 px-1 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Long-Lead threshold:</span>
              <Select value={longLeadThreshold.toString()} onValueChange={(v) => setLongLeadThreshold(Number(v))}>
                <SelectTrigger className="w-[90px] h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[30, 45, 60, 90].map(d => <SelectItem key={d} value={d.toString()}>{d} days</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Margin threshold:</span>
              <Select value={marginThreshold.toString()} onValueChange={(v) => setMarginThreshold(Number(v))}>
                <SelectTrigger className="w-[90px] h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 5, 10, 15].map(d => <SelectItem key={d} value={d.toString()}>{d} days</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Long-Lead KPIs */}
          <div className="grid grid-cols-5 gap-4">
            <Card className="border-slate-200">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 mb-1">Long-Lead Parts</p>
                <p className="text-2xl font-bold text-amber-600">{longLeadKpis.longLeadParts}</p>
              </CardContent>
            </Card>

            <Card
              className={`border-slate-200 cursor-pointer transition-colors hover:border-blue-300 ${longLeadKpiFilter === "unrecoverable" ? "ring-2 ring-blue-500" : ""}`}
              onClick={() => setLongLeadKpiFilter(longLeadKpiFilter === "unrecoverable" ? null : "unrecoverable")}
            >
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 mb-1">Unrecoverable Parts</p>
                <p className="text-2xl font-bold text-red-600">{longLeadKpis.unrecoverableParts}</p>
              </CardContent>
            </Card>

            <Card
              className={`border-slate-200 cursor-pointer transition-colors hover:border-blue-300 ${longLeadKpiFilter === "intersection" ? "ring-2 ring-blue-500" : ""}`}
              onClick={() => setLongLeadKpiFilter(longLeadKpiFilter === "intersection" ? null : "intersection")}
            >
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 mb-1">Long-Lead AND Shortage</p>
                <p className="text-2xl font-bold text-purple-600">{longLeadKpis.intersectionCount}</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 mb-1">Avg Effective LT</p>
                <p className="text-2xl font-bold text-slate-900">{longLeadKpis.avgEffectiveLT}d</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 mb-1">Min LT Margin</p>
                <p className={`text-2xl font-bold ${longLeadKpis.minLTMargin < 0 ? "text-red-600" : "text-green-600"}`}>{longLeadKpis.minLTMargin}d</p>
              </CardContent>
            </Card>
          </div>

          {/* Recoverability Map */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-900">Recoverability Map</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 50 }}>
                    <XAxis type="number" dataKey="x" name="Time-to-Need" unit="d" tick={{ fontSize: 10 }} label={{ value: "Time-to-Need (days)", position: "bottom", fontSize: 11 }} />
                    <YAxis type="number" dataKey="y" name="Effective Lead Time" unit="d" tick={{ fontSize: 10 }} label={{ value: "Effective Lead Time (days)", angle: -90, position: "insideLeft", fontSize: 11 }} />
                    <ZAxis type="number" dataKey="z" range={[100, 400]} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="bg-slate-900 text-white text-xs p-2 rounded shadow-lg">
                              <p className="font-medium">{data.partNumber}</p>
                              <p className="text-slate-300">Time-to-Need: {data.x}d</p>
                              <p className="text-slate-300">Effective LT: {data.y}d</p>
                              <p className={data.ltMarginDays < 0 ? "text-red-400" : "text-green-400"}>LT Margin: {data.ltMarginDays}d</p>
                              {data.shortageFlag && <Badge className="mt-1 bg-purple-500 text-white text-[9px]">Also has shortage</Badge>}
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <ReferenceLine 
                      x={0} 
                      y={0} 
                      segment={[{ x: 0, y: 0 }, { x: 120, y: 120 }]} 
                      stroke="#94a3b8" 
                      strokeDasharray="5 5" 
                      label={{ value: "LT = Time-to-Need", position: "insideTopRight", fontSize: 9, fill: "#64748b" }}
                    />
                    <Scatter name="Parts" data={scatterData} cursor="pointer" onClick={(data) => setSelectedPart(data.partNumber)}>
                      {scatterData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.ltMarginDays < 0 ? (entry.shortageFlag ? "#7C3AED" : "#DC2626") : "#22C55E"} 
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 mt-2">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <div className="w-3 h-3 rounded-full bg-red-600" />
                  Unrecoverable (LT Margin {"<"} 0)
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <div className="w-3 h-3 rounded-full bg-purple-600" />
                  Unrecoverable + Shortage
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <div className="w-3 h-3 rounded-full bg-green-600" />
                  Recoverable
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Long-Lead Queue Table */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900">Long-Lead Queue</CardTitle>
              <Button variant="outline" size="sm" className="h-8 text-xs bg-transparent">
                <Download className="w-3 h-3 mr-1" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {longLeadData.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-sm">No long-lead items matching current filters.</p>
                </div>
              ) : (
                <div className="max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow className="border-b border-slate-200">
                        <TableHead className="text-xs font-semibold text-slate-600">Part Number</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Description</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Supplier</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Effective LT</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Time-to-Need</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">LT Margin</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Shortage?</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Alternates</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Impacted Deliverables</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Owner</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Status</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 w-32">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {longLeadData.map((row) => (
                        <TableRow
                          key={row.id}
                          className="hover:bg-slate-50 cursor-pointer"
                          onClick={() => openDrawer(row, "long-lead")}
                        >
                          <TableCell className="text-sm text-[#8B0000] font-medium hover:underline">{row.partNumber}</TableCell>
                          <TableCell className="text-sm text-slate-600 max-w-[150px] truncate">{row.partDesc}</TableCell>
                          <TableCell className="text-xs text-slate-500">{row.supplier}</TableCell>
                          <TableCell className="text-sm font-medium text-amber-600">{row.effectiveLeadTime}d</TableCell>
                          <TableCell className="text-sm">{row.timeToNeed}d</TableCell>
                          <TableCell className={`text-sm font-bold ${row.ltMarginDays < 0 ? "text-red-600" : "text-green-600"}`}>
                            {row.ltMarginDays}d
                          </TableCell>
                          <TableCell>
                            {row.shortageFlag ? (
                              <Badge className="bg-purple-100 text-purple-800 text-xs">Yes</Badge>
                            ) : (
                              <span className="text-slate-400 text-xs">No</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{row.alternateSources}</TableCell>
                          <TableCell className="text-xs">
                            {row.impactedDeliverables.slice(0, 2).map((d, i) => (
                              <span key={d.deliverable} className="text-[#1D4ED8]">{d.deliverable}{i < 1 && row.impactedDeliverables.length > 1 ? ", " : ""}</span>
                            ))}
                            {row.impactedDeliverables.length > 2 && <span className="text-slate-400"> +{row.impactedDeliverables.length - 2} more</span>}
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">{row.owner}</TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${getStatusBadgeColor(row.status)}`}>{row.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[10px] text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                onClick={(e) => { e.stopPropagation(); alert("Promote to Near-Critical: " + row.partNumber) }}
                              >
                                Near-Crit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => { e.stopPropagation(); alert("Promote to Critical: " + row.partNumber) }}
                              >
                                Critical
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
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[500px] sm:max-w-[500px] p-0 overflow-y-auto">
          {drawerData && (
            <>
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-slate-200 p-4 z-10">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {drawerData.type === "shortage" ? "Shortage Detail" : "Long-Lead Detail"} — {drawerData.partNumber}
                    </h2>
                    <p className="text-sm text-slate-600">{drawerData.partDesc}</p>
                  </div>
                  <button onClick={() => setDrawerOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {/* Header badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  {drawerData.type === "shortage" ? (
                    <>
                      <Badge className="text-[10px] bg-red-100 text-red-700 border-red-300">
                        First Shortage: {formatDate(drawerData.firstShortageDate)}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] text-slate-600">
                        Peak Qty: {drawerData.peakShortageQty}
                      </Badge>
                    </>
                  ) : (
                    <>
                      <Badge className={`text-[10px] ${drawerData.ltMarginDays < 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                        LT Margin: {drawerData.ltMarginDays}d
                      </Badge>
                      <Badge variant="outline" className="text-[10px] text-slate-600">
                        Lead Time: {drawerData.effectiveLeadTime}d
                      </Badge>
                    </>
                  )}
                  <Badge className={`text-[10px] ${getStatusBadgeColor(drawerData.status)}`}>{drawerData.status}</Badge>
                </div>
              </div>

              {/* Drawer Tabs */}
              <Tabs value={drawerTab} onValueChange={setDrawerTab} className="w-full">
                <div className="border-b border-slate-200 px-4">
                  <TabsList className="h-10 bg-transparent p-0 gap-3">
                    <TabsTrigger value="summary" className="text-xs data-[state=active]:border-b-2 data-[state=active]:border-slate-900 rounded-none">Summary</TabsTrigger>
                    {drawerData.type === "shortage" && (
                      <>
                        <TabsTrigger value="netted" className="text-xs data-[state=active]:border-b-2 data-[state=active]:border-slate-900 rounded-none">Netted Availability</TabsTrigger>
                        <TabsTrigger value="demand" className="text-xs data-[state=active]:border-b-2 data-[state=active]:border-slate-900 rounded-none">Demand</TabsTrigger>
                        <TabsTrigger value="supply" className="text-xs data-[state=active]:border-b-2 data-[state=active]:border-slate-900 rounded-none">Supply</TabsTrigger>
                      </>
                    )}
                    {drawerData.type === "long-lead" && (
                      <>
                        <TabsTrigger value="leadtime" className="text-xs data-[state=active]:border-b-2 data-[state=active]:border-slate-900 rounded-none">Lead Time</TabsTrigger>
                        <TabsTrigger value="deliverables" className="text-xs data-[state=active]:border-b-2 data-[state=active]:border-slate-900 rounded-none">Deliverables</TabsTrigger>
                        <TabsTrigger value="options" className="text-xs data-[state=active]:border-b-2 data-[state=active]:border-slate-900 rounded-none">Supply Options</TabsTrigger>
                      </>
                    )}
                    <TabsTrigger value="actions" className="text-xs data-[state=active]:border-b-2 data-[state=active]:border-slate-900 rounded-none">Actions</TabsTrigger>
                    <TabsTrigger value="links" className="text-xs data-[state=active]:border-b-2 data-[state=active]:border-slate-900 rounded-none">Links</TabsTrigger>
                  </TabsList>
                </div>

                <div className="p-4">
                  {/* Summary Tab */}
                  <TabsContent value="summary" className="m-0 space-y-4">
                    {drawerData.type === "shortage" ? (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-[10px] text-slate-500 mb-1">On-Hand Usable Qty</p>
                            <p className="text-lg font-semibold text-slate-900">{drawerData.onHand}</p>
                          </div>
                          <div className="bg-red-50 rounded-lg p-3">
                            <p className="text-[10px] text-red-600 mb-1">First Shortage Date</p>
                            <p className="text-lg font-semibold text-red-700">{formatDate(drawerData.firstShortageDate)}</p>
                          </div>
                          <div className="bg-amber-50 rounded-lg p-3">
                            <p className="text-[10px] text-amber-600 mb-1">Peak Shortage Qty</p>
                            <p className="text-lg font-semibold text-amber-700">{drawerData.peakShortageQty}</p>
                          </div>
                          <div className="bg-amber-50 rounded-lg p-3">
                            <p className="text-[10px] text-amber-600 mb-1">Peak Shortage Value</p>
                            <p className="text-lg font-semibold text-amber-700">{formatCurrency(drawerData.peakShortageValue)}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-[10px] text-slate-500 mb-1">Supplier</p>
                            <p className="text-sm font-medium text-slate-900">{drawerData.supplier}</p>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-[10px] text-slate-500 mb-1">Commodity</p>
                            <p className="text-sm font-medium text-slate-900">{drawerData.commodity}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 mb-2">Top Impacted Deliverables:</p>
                          <div className="space-y-2">
                            {drawerData.impactedDeliverables.map((d: string) => (
                              <div key={d} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-200">
                                <span className="text-sm font-medium text-[#1D4ED8]">{d}</span>
                                <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-[10px] text-slate-500 mb-1">Effective Lead Time</p>
                            <p className="text-lg font-semibold text-slate-900">{drawerData.effectiveLeadTime} days</p>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-[10px] text-slate-500 mb-1">Time-to-Need</p>
                            <p className="text-lg font-semibold text-slate-900">{drawerData.timeToNeed} days</p>
                          </div>
                          <div className={`rounded-lg p-3 ${drawerData.ltMarginDays < 0 ? "bg-red-50" : "bg-green-50"}`}>
                            <p className={`text-[10px] mb-1 ${drawerData.ltMarginDays < 0 ? "text-red-600" : "text-green-600"}`}>LT Margin Days</p>
                            <p className={`text-lg font-semibold ${drawerData.ltMarginDays < 0 ? "text-red-700" : "text-green-700"}`}>{drawerData.ltMarginDays} days</p>
                          </div>
                          <div className={`rounded-lg p-3 ${drawerData.shortageFlag ? "bg-purple-50" : "bg-slate-50"}`}>
                            <p className={`text-[10px] mb-1 ${drawerData.shortageFlag ? "text-purple-600" : "text-slate-500"}`}>Shortage Flag</p>
                            <p className={`text-lg font-semibold ${drawerData.shortageFlag ? "text-purple-700" : "text-slate-700"}`}>{drawerData.shortageFlag ? "Yes" : "No"}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 mb-2">Impacted Deliverables:</p>
                          <div className="space-y-2">
                            {drawerData.impactedDeliverables?.map((d: any) => (
                              <div key={d.deliverable} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-200">
                                <div>
                                  <span className="text-sm font-medium text-[#1D4ED8]">{d.deliverable}</span>
                                  <span className="text-[10px] text-slate-500 ml-2">Need: {formatDate(d.needDate)} | Qty: {d.qty}</span>
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </TabsContent>

                  {/* Netted Availability Tab (Shortage only) */}
                  <TabsContent value="netted" className="m-0 space-y-4">
                    <p className="text-[10px] text-slate-500 mb-3">Time-phased ledger showing how netted availability changes over time:</p>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="text-[10px] py-2 h-auto">Date Bucket</TableHead>
                            <TableHead className="text-[10px] py-2 h-auto text-right">Starting OH</TableHead>
                            <TableHead className="text-[10px] py-2 h-auto text-right">Supply In</TableHead>
                            <TableHead className="text-[10px] py-2 h-auto text-right">Demand Out</TableHead>
                            <TableHead className="text-[10px] py-2 h-auto text-right">Ending NA</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {drawerData.nettedAvailability?.map((row: any, idx: number) => {
                            const isFirstShortage = row.endingNA < 0 && (idx === 0 || drawerData.nettedAvailability[idx - 1].endingNA >= 0)
                            return (
                              <TableRow key={row.week} className={isFirstShortage ? "bg-red-50 border-l-4 border-l-red-500" : ""}>
                                <TableCell className="text-[10px] py-2">
                                  <div className="flex items-center gap-2">
                                    {row.week}
                                    {isFirstShortage && (
                                      <Badge variant="outline" className="text-[9px] bg-red-100 text-red-700 border-red-300">
                                        First Shortage
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-[10px] py-2 text-right">{row.startingOH}</TableCell>
                                <TableCell className="text-[10px] py-2 text-right text-green-600">{row.supplyIn > 0 ? `+${row.supplyIn}` : "-"}</TableCell>
                                <TableCell className="text-[10px] py-2 text-right text-red-600">{row.demandOut > 0 ? `-${row.demandOut}` : "-"}</TableCell>
                                <TableCell className={`text-[10px] py-2 text-right font-bold ${row.endingNA < 0 ? "text-red-600" : "text-green-600"}`}>
                                  {row.endingNA}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  {/* Demand Tab (Shortage only) */}
                  <TabsContent value="demand" className="m-0 space-y-4">
                    <p className="text-[10px] text-slate-500 mb-3">Demand breakdown by deliverable and type:</p>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="text-[10px] py-2 h-auto">Deliverable/WO</TableHead>
                            <TableHead className="text-[10px] py-2 h-auto">Need Date</TableHead>
                            <TableHead className="text-[10px] py-2 h-auto">Demand Type</TableHead>
                            <TableHead className="text-[10px] py-2 h-auto text-right">Qty</TableHead>
                            <TableHead className="text-[10px] py-2 h-auto">Priority</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {drawerData.demandBreakdown?.map((row: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="text-[10px] py-2 text-[#1D4ED8] font-medium">{row.deliverable}</TableCell>
                              <TableCell className="text-[10px] py-2">{formatDate(row.needDate)}</TableCell>
                              <TableCell className="text-[10px] py-2">
                                <Badge variant="outline" className="text-[9px]">{row.type}</Badge>
                              </TableCell>
                              <TableCell className="text-[10px] py-2 text-right font-medium">{row.qty}</TableCell>
                              <TableCell className="text-[10px] py-2">
                                <Badge className={`text-[9px] ${row.priority === "Critical" ? "bg-red-100 text-red-800" : row.priority === "High" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-800"}`}>
                                  {row.priority}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  {/* Supply Tab (Shortage only) */}
                  <TabsContent value="supply" className="m-0 space-y-4">
                    <p className="text-[10px] text-slate-500 mb-3">Supply sources and their status:</p>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="text-[10px] py-2 h-auto">Source Type</TableHead>
                            <TableHead className="text-[10px] py-2 h-auto">Source ID</TableHead>
                            <TableHead className="text-[10px] py-2 h-auto">Receipt Date</TableHead>
                            <TableHead className="text-[10px] py-2 h-auto text-right">Qty</TableHead>
                            <TableHead className="text-[10px] py-2 h-auto">Usability</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {drawerData.supplyBreakdown?.map((row: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="text-[10px] py-2">
                                <Badge variant="outline" className="text-[9px]">{row.sourceType}</Badge>
                              </TableCell>
                              <TableCell className="text-[10px] py-2 font-medium">{row.sourceId}</TableCell>
                              <TableCell className="text-[10px] py-2">{row.receiptDate === "Available" ? "Available" : formatDate(row.receiptDate)}</TableCell>
                              <TableCell className="text-[10px] py-2 text-right font-medium">{row.qty}</TableCell>
                              <TableCell className="text-[10px] py-2">
                                <Badge className={`text-[9px] ${row.usability === "Usable" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                                  {row.usability}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  {/* Work Cell Impact Tab (Shortage only) */}
                  <TabsContent value="workcell" className="m-0 space-y-4">
                    <p className="text-[10px] text-slate-500 mb-3">Work cells and work orders impacted by this shortage:</p>
                    {drawerData.workCellImpact && drawerData.workCellImpact.length > 0 ? (
                      <div className="space-y-3">
                        {drawerData.workCellImpact.map((wc: any) => (
                          <div key={wc.workCell} className="border border-slate-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Factory className="w-4 h-4 text-slate-500" />
                                <span className="text-sm font-medium text-slate-900">{wc.workCellName}</span>
                                <span className="text-[10px] text-slate-400">({wc.workCell})</span>
                              </div>
                              <Badge className={`text-[9px] ${wc.status === "Blocked" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                                {wc.status}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-500 mb-1">Blocked/At-Risk Work Orders:</p>
                              <div className="flex flex-wrap gap-1">
                                {wc.blockedWorkOrders.map((wo: string) => (
                                  <Badge key={wo} variant="outline" className="text-[9px]">{wo}</Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-sm text-slate-500">No work cell impact data available</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Lead Time Tab (Long-Lead only) */}
                  <TabsContent value="leadtime" className="m-0 space-y-4">
                    <p className="text-[10px] text-slate-500 mb-3">What drives the effective lead time:</p>
                    <div className="space-y-3">
                      <div className="bg-slate-50 rounded-lg p-3 flex justify-between items-center">
                        <span className="text-sm text-slate-600">Supplier Lead Time</span>
                        <span className="text-sm font-semibold text-slate-900">{drawerData.leadTimeBreakdown?.supplierLT} days</span>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 flex justify-between items-center">
                        <span className="text-sm text-slate-600">Internal Processing</span>
                        <span className="text-sm font-semibold text-slate-900">{drawerData.leadTimeBreakdown?.internalLT} days</span>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-3 flex justify-between items-center border border-amber-200">
                        <span className="text-sm font-medium text-amber-700">Effective Lead Time</span>
                        <span className="text-lg font-bold text-amber-700">{drawerData.effectiveLeadTime} days</span>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Deliverables Tab (Long-Lead only) */}
                  <TabsContent value="deliverables" className="m-0 space-y-4">
                    <p className="text-[10px] text-slate-500 mb-3">Deliverables impacted by this long-lead item:</p>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="text-[10px] py-2 h-auto">Deliverable</TableHead>
                            <TableHead className="text-[10px] py-2 h-auto">Need Date</TableHead>
                            <TableHead className="text-[10px] py-2 h-auto text-right">Qty</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {drawerData.impactedDeliverables?.map((row: any) => (
                            <TableRow key={row.deliverable}>
                              <TableCell className="text-[10px] py-2 text-[#1D4ED8] font-medium">{row.deliverable}</TableCell>
                              <TableCell className="text-[10px] py-2">{formatDate(row.needDate)}</TableCell>
                              <TableCell className="text-[10px] py-2 text-right font-medium">{row.qty}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  {/* Supply Options Tab (Long-Lead only) */}
                  <TabsContent value="options" className="m-0 space-y-4">
                    <p className="text-[10px] text-slate-500 mb-3">Alternate sources, transfers, and substitutes:</p>
                    {drawerData.supplyOptions && drawerData.supplyOptions.length > 0 ? (
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
                              <TableHead className="text-[10px] py-2 h-auto">Type</TableHead>
                              <TableHead className="text-[10px] py-2 h-auto">Source</TableHead>
                              <TableHead className="text-[10px] py-2 h-auto">Lead Time</TableHead>
                              <TableHead className="text-[10px] py-2 h-auto text-right">Qty Avail</TableHead>
                              <TableHead className="text-[10px] py-2 h-auto text-right">Unit Cost</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {drawerData.supplyOptions.map((opt: any, idx: number) => (
                              <TableRow key={idx}>
                                <TableCell className="text-[10px] py-2">
                                  <Badge variant="outline" className="text-[9px]">{opt.type}</Badge>
                                </TableCell>
                                <TableCell className="text-[10px] py-2 font-medium">{opt.source}</TableCell>
                                <TableCell className="text-[10px] py-2">{opt.leadTime}d</TableCell>
                                <TableCell className="text-[10px] py-2 text-right">{opt.qtyAvailable}</TableCell>
                                <TableCell className="text-[10px] py-2 text-right">{formatCurrency(opt.unitCost)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-sm text-slate-500">No alternate sources available</p>
                        <p className="text-[10px] text-slate-400 mt-1">This part has no qualified alternates, transfers, or substitutes.</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Actions Tab */}
                  <TabsContent value="actions" className="m-0 space-y-4">
                    <p className="text-[10px] text-slate-500 mb-3">Action log and exception records:</p>
                    
                    {/* Current Assignment */}
                    <div className="border border-slate-200 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Owner</span>
                        <span className="text-sm font-medium text-slate-900">{drawerData.owner || "Sarah Martinez"}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Next Action Date</span>
                        <span className="text-sm font-medium text-slate-900">Feb 2, 2026</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Status</span>
                        <Badge className={`text-[10px] ${getStatusBadgeColor(drawerData.status)}`}>{drawerData.status}</Badge>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-[10px] text-amber-600 mb-1">Notes</p>
                      <p className="text-sm text-amber-800">{drawerData.notes || "Expedite fee approved"}</p>
                    </div>

                    {/* Create Exception Record Button */}
                    <Button 
                      variant="outline" 
                      className="w-full justify-center h-10 bg-transparent border-slate-300 hover:bg-slate-50"
                      onClick={() => alert("Create Exception Record for " + drawerData.partNumber)}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Create Exception Record
                    </Button>
                  </TabsContent>

                  {/* Links Tab */}
                  <TabsContent value="links" className="m-0 space-y-4">
                    <p className="text-[10px] text-slate-500 mb-3">Navigate to related pages:</p>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-between h-10 bg-transparent border-slate-200" onClick={() => alert("Open Supplier Performance Dashboard")}>
                        <span className="flex items-center">
                          <ExternalLink className="w-4 h-4 mr-2 text-slate-400" />
                          Supplier Performance Dashboard
                        </span>
                        <ExternalLink className="w-4 h-4 text-slate-400" />
                      </Button>
                      <Button variant="outline" className="w-full justify-between h-10 bg-transparent border-slate-200" onClick={() => alert("Open Critical Path Queue")}>
                        <span className="flex items-center">
                          <ExternalLink className="w-4 h-4 mr-2 text-slate-400" />
                          Critical Path Queue
                        </span>
                        <ExternalLink className="w-4 h-4 text-slate-400" />
                      </Button>
                      <Button variant="outline" className="w-full justify-between h-10 bg-transparent border-slate-200" onClick={() => alert("Open Material Monitoring")}>
                        <span className="flex items-center">
                          <ExternalLink className="w-4 h-4 mr-2 text-slate-400" />
                          Material Monitoring
                        </span>
                        <ExternalLink className="w-4 h-4 text-slate-400" />
                      </Button>
                      <Button variant="outline" className="w-full justify-between h-10 bg-transparent border-slate-200" onClick={() => alert("Open Quality Records")}>
                        <span className="flex items-center">
                          <ExternalLink className="w-4 h-4 mr-2 text-slate-400" />
                          Quality Records
                        </span>
                        <ExternalLink className="w-4 h-4 text-slate-400" />
                      </Button>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
