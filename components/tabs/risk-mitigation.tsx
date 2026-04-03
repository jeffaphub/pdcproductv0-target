"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Info, X, Download, Search, TrendingUp, Users, Layers, Factory, ArrowLeft } from "lucide-react"

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

// Constants
const PROGRAMS = ["Manpack Radio Program", "Vehicle Mount System", "Tactical HF Radio"]
const PROJECTS = ["PRJ-2026-001", "PRJ-2026-002", "PRJ-2026-003"]
const ASSEMBLIES = ["Main Assembly", "RF Subassembly", "Power Module", "Display Unit"]
const MAJOR_SUBASSEMBLIES = ["MSA-001 Receiver", "MSA-002 Transmitter", "MSA-003 Power Supply"]
const COMMODITIES = ["Semiconductors", "Passive Components", "Connectors", "Power Management", "RF Components"]
const SUPPLIERS = ["Analog Devices", "Murata", "Amphenol", "Texas Instruments", "Xilinx/AMD"]
const WORKSTATIONS = [
  { id: "WC-001", name: "SMT Line 1", majorSubassembly: "MSA-001 Receiver" },
  { id: "WC-005", name: "Power Module Cell", majorSubassembly: "MSA-003 Power Supply" },
]
const DEMAND_TYPES = ["Firm Orders", "Forecast", "Open Quotes"]

// Mock shortage parts data
const ALL_PARTS = [
  {
    partNumber: "PN-BATT-CELL",
    partDesc: "Lithium Battery Cell 3.7V",
    commodity: "Power Management",
    supplier: "Murata",
    program: "Manpack Radio Program",
    project: "PRJ-2026-001",
    assembly: "Power Module",
    msa: "MSA-003 Power Supply",
    workstation: "WC-005",
    firstShortageDate: "2026-02-09",
    peakShortageQty: 120,
    totalShortageValue: 14400,
    deliverablesImpacted: 3,
    riskLevel: "Critical",
  },
  {
    partNumber: "PN-RF-AMP-100",
    partDesc: "RF Amplifier Module 5W",
    commodity: "RF Components",
    supplier: "Analog Devices",
    program: "Vehicle Mount System",
    project: "PRJ-2026-002",
    assembly: "RF Subassembly",
    msa: "MSA-001 Receiver",
    workstation: "WC-001",
    firstShortageDate: "2026-02-15",
    peakShortageQty: 45,
    totalShortageValue: 67500,
    deliverablesImpacted: 2,
    riskLevel: "High",
  },
  {
    partNumber: "PN-CAP-MLX-220",
    partDesc: "Multilayer Capacitor 220uF",
    commodity: "Passive Components",
    supplier: "Murata",
    program: "Manpack Radio Program",
    project: "PRJ-2026-001",
    assembly: "Power Module",
    msa: "MSA-003 Power Supply",
    workstation: "WC-005",
    firstShortageDate: "2026-02-20",
    peakShortageQty: 200,
    totalShortageValue: 4000,
    deliverablesImpacted: 1,
    riskLevel: "Medium",
  },
]

export function RiskMitigation() {
  // Workflow mode
  const [workflowMode, setWorkflowMode] = useState<"supply-chain" | "production-control">("supply-chain")

  // Global Filters
  const [selectedProgram, setSelectedProgram] = useState<string>("All Programs")
  const [selectedProject, setSelectedProject] = useState<string>("All Projects")
  const [selectedAssembly, setSelectedAssembly] = useState<string>("All Assemblies")
  const [selectedCommodity, setSelectedCommodity] = useState<string>("All Commodities")
  const [selectedSupplier, setSelectedSupplier] = useState<string>("All Suppliers")
  const [partSearch, setPartSearch] = useState("")
  const [horizonFrom, setHorizonFrom] = useState("2026-01-30")
  const [horizonTo, setHorizonTo] = useState("2026-07-30")
  const [demandTypesIncluded, setDemandTypesIncluded] = useState<string[]>(["Firm Orders", "Forecast", "Open Quotes"])
  const [nettingMode, setNettingMode] = useState<"global" | "pegged">("pegged")
  const [showMode, setShowMode] = useState<"all" | "at-risk" | "safe">("all")

  // Production Control hierarchy drill-down
  const [pcSelectedProgram, setPcSelectedProgram] = useState<string | null>(null)
  const [pcSelectedMSA, setPcSelectedMSA] = useState<string | null>(null)
  const [pcSelectedWorkstation, setPcSelectedWorkstation] = useState<string | null>(null)

  // Selected part for mitigation
  const [selectedPart, setSelectedPart] = useState<string | null>(null)

  // Supply mitigation view tabs
  const [supplyViewTab, setSupplyViewTab] = useState("netting")

  // Filter parts based on global filters and search
  const filteredParts = useMemo(() => {
    return ALL_PARTS.filter((part) => {
      if (selectedProgram !== "All Programs" && part.program !== selectedProgram) return false
      if (selectedProject !== "All Projects" && part.project !== selectedProject) return false
      if (selectedAssembly !== "All Assemblies" && part.assembly !== selectedAssembly) return false
      if (selectedCommodity !== "All Commodities" && part.commodity !== selectedCommodity) return false
      if (selectedSupplier !== "All Suppliers" && part.supplier !== selectedSupplier) return false
      if (partSearch && !part.partNumber.toLowerCase().includes(partSearch.toLowerCase()) && !part.partDesc.toLowerCase().includes(partSearch.toLowerCase())) return false
      if (showMode === "at-risk" && part.riskLevel === "Low") return false
      if (showMode === "safe" && part.riskLevel !== "Low") return false
      return true
    })
  }, [selectedProgram, selectedProject, selectedAssembly, selectedCommodity, selectedSupplier, partSearch, showMode])

  // Get selected part data
  const selectedPartData = useMemo(() => {
    if (!selectedPart) return null
    const part = ALL_PARTS.find((p) => p.partNumber === selectedPart)
    if (!part) return null
    return {
      ...part,
      parentRollup: `${part.assembly} / Main Assembly / ${part.msa}`,
      availableNow: 80,
      pipeline: 200,
      earliestSupplyDate: "2026-02-17",
      daysOfCoverage: 3.2,
      maxExpediteGain: 5,
      netShortage: -120,
    }
  }, [selectedPart])

  // Supply Actions data
  const supplyActions = [
    {
      actionType: "Expedite PO",
      sourceChannel: "PO",
      sourceRef: "PO-2026-0165",
      qtyAvail: 200,
      availDate: "2026-02-17",
      originalDate: "2026-02-22",
      daysGained: 5,
      costImpact: "$2,400",
      confidence: "High",
      owner: "Sarah Martinez",
      status: "Investigating",
    },
    {
      actionType: "Pull from 3PL",
      sourceChannel: "3PL",
      sourceRef: "3PL-WH02",
      qtyAvail: 50,
      availDate: "2026-02-02",
      originalDate: "2026-02-02",
      daysGained: 2,
      costImpact: "$300",
      confidence: "High",
      owner: "Sarah Martinez",
      status: "New",
    },
    {
      actionType: "Release from Bench",
      sourceChannel: "Bench",
      sourceRef: "Bench-Hold-001",
      qtyAvail: 30,
      availDate: "2026-02-01",
      originalDate: "2026-02-01",
      daysGained: 0,
      costImpact: "$0",
      confidence: "Medium",
      owner: "Sarah Martinez",
      status: "New",
    },
    {
      actionType: "Reallocate from Program",
      sourceChannel: "Other Program",
      sourceRef: "PRJ-2026-003",
      qtyAvail: 20,
      availDate: "2026-02-05",
      originalDate: "2026-02-05",
      daysGained: 4,
      costImpact: "$0",
      confidence: "Low",
      owner: "John Smith",
      status: "New",
    },
    {
      actionType: "Alternate Source",
      sourceChannel: "Alternate Supplier",
      sourceRef: "Broker - Smith & Associates",
      qtyAvail: 100,
      availDate: "2026-02-12",
      originalDate: "2026-02-12",
      daysGained: 6,
      costImpact: "$8,000",
      confidence: "Medium",
      owner: "David Chen",
      status: "New",
    },
  ]

  // Inventory & Supply Breakdown data
  const inventoryBreakdown = [
    {
      location: "Main Warehouse",
      onHand: 50,
      allocated: 30,
      free: 20,
      nextReceiptDate: "2026-02-17",
      nextReceiptQty: 200,
      notes: "",
    },
    {
      location: "3PL - East Coast",
      onHand: 30,
      allocated: 0,
      free: 30,
      nextReceiptDate: "N/A",
      nextReceiptQty: 0,
      notes: "",
    },
    {
      location: "Bench Hold",
      onHand: 30,
      allocated: 0,
      free: 30,
      nextReceiptDate: "N/A",
      nextReceiptQty: 0,
      notes: "Quality review pending",
    },
    {
      location: "In-house WIP",
      onHand: 20,
      allocated: 20,
      free: 0,
      nextReceiptDate: "2026-02-05",
      nextReceiptQty: 50,
      notes: "Assembly in progress",
    },
  ]

  // Demand Where-Used data
  const demandWhereUsed = [
    {
      program: "Manpack Radio",
      deliverable: "DEL-2026-0045",
      assembly: "Power Module",
      msa: "MSA-003 Power Supply",
      workstation: "WC-005",
      needDate: "2026-02-09",
      qtyNeeded: 100,
      demandType: "Firm Orders",
      deliveryTarget: "2026-02-15",
      slackDays: 0,
      criticality: "Critical",
      suggestedMove: "No move",
      impactSummary: "0d delivery slip",
    },
    {
      program: "Vehicle Mount",
      deliverable: "DEL-2026-0058",
      assembly: "Power Module",
      msa: "MSA-003 Power Supply",
      workstation: "WC-005",
      needDate: "2026-02-14",
      qtyNeeded: 50,
      demandType: "Firm Orders",
      deliveryTarget: "2026-02-20",
      slackDays: 5,
      criticality: "Near-Critical",
      suggestedMove: "Slip 3d",
      impactSummary: "+3d slip to DEL-0058",
    },
    {
      program: "Manpack Radio",
      deliverable: "DEL-2026-0061",
      assembly: "Power Module",
      msa: "MSA-003 Power Supply",
      workstation: "WC-005",
      needDate: "2026-02-19",
      qtyNeeded: 50,
      demandType: "Forecast",
      deliveryTarget: "2026-02-28",
      slackDays: 10,
      criticality: "Non-critical",
      suggestedMove: "Slip 8d",
      impactSummary: "+8d slip to DEL-0061",
    },
  ]

  // Demand KPIs
  const demandKpis = {
    totalDemand: 200,
    firmDemand: 150,
    forecastDemand: 50,
    criticalLines: 1,
    reschedulableQty: 80,
    maxSlipDays: 8,
    competingPrograms: 2,
  }

  // Time-phased netting data
  const nettingData = [
    { week: "W05 (Feb 1-7)", startingOH: 80, supplyIn: 0, demandOut: 150, endingNA: -70, isShortage: true },
    { week: "W06 (Feb 8-14)", startingOH: -70, supplyIn: 0, demandOut: 50, endingNA: -120, isShortage: true },
    { week: "W07 (Feb 15-21)", startingOH: -120, supplyIn: 200, demandOut: 30, endingNA: 50, isShortage: false },
    { week: "W08 (Feb 22-28)", startingOH: 50, supplyIn: 0, demandOut: 20, endingNA: 30, isShortage: false },
  ]

  return (
    <div className="space-y-4">
      {/* GLOBAL FILTER BAR */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-5 gap-3 mb-3">
            {/* Program */}
            <div>
              <label className="text-[10px] text-slate-500 font-medium mb-1 block">Program</label>
              <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                <SelectTrigger className="h-8 text-xs bg-transparent">
                  <SelectValue placeholder="All Programs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Programs">All Programs</SelectItem>
                  {PROGRAMS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project */}
            <div>
              <label className="text-[10px] text-slate-500 font-medium mb-1 block">Project</label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="h-8 text-xs bg-transparent">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Projects">All Projects</SelectItem>
                  {PROJECTS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assembly */}
            <div>
              <label className="text-[10px] text-slate-500 font-medium mb-1 block">Assembly</label>
              <Select value={selectedAssembly} onValueChange={setSelectedAssembly}>
                <SelectTrigger className="h-8 text-xs bg-transparent">
                  <SelectValue placeholder="All Assemblies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Assemblies">All Assemblies</SelectItem>
                  {ASSEMBLIES.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Commodity */}
            <div>
              <label className="text-[10px] text-slate-500 font-medium mb-1 block">Commodity</label>
              <Select value={selectedCommodity} onValueChange={setSelectedCommodity}>
                <SelectTrigger className="h-8 text-xs bg-transparent">
                  <SelectValue placeholder="All Commodities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Commodities">All Commodities</SelectItem>
                  {COMMODITIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Supplier */}
            <div>
              <label className="text-[10px] text-slate-500 font-medium mb-1 block">Supplier</label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger className="h-8 text-xs bg-transparent">
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Suppliers">All Suppliers</SelectItem>
                  {SUPPLIERS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-3">
            {/* Part Search */}
            <div>
              <label className="text-[10px] text-slate-500 font-medium mb-1 block">Part Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  value={partSearch}
                  onChange={(e) => setPartSearch(e.target.value)}
                  placeholder="PN-..."
                  className="h-8 text-xs pl-8 bg-transparent"
                />
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="text-[10px] text-slate-500 font-medium mb-1 block">From</label>
              <Input type="date" value={horizonFrom} onChange={(e) => setHorizonFrom(e.target.value)} className="h-8 text-xs bg-transparent" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-medium mb-1 block">To</label>
              <Input type="date" value={horizonTo} onChange={(e) => setHorizonTo(e.target.value)} className="h-8 text-xs bg-transparent" />
            </div>

            {/* Demand Types */}
            <div>
              <label className="text-[10px] text-slate-500 font-medium mb-1 block">Demand Types</label>
              <div className="flex items-center gap-2 h-8">
                {DEMAND_TYPES.map((dt) => (
                  <div key={dt} className="flex items-center gap-1">
                    <Checkbox
                      id={dt}
                      checked={demandTypesIncluded.includes(dt)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setDemandTypesIncluded([...demandTypesIncluded, dt])
                        } else {
                          setDemandTypesIncluded(demandTypesIncluded.filter((d) => d !== dt))
                        }
                      }}
                      className="h-3 w-3"
                    />
                    <label htmlFor={dt} className="text-[9px] text-slate-600 cursor-pointer">
                      {dt.split(" ")[0]}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Netting Mode */}
            <div>
              <label className="text-[10px] text-slate-500 font-medium mb-1 block">Netting Mode</label>
              <div className="flex items-center gap-0.5 bg-slate-100 rounded-md p-0.5 h-8">
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
              </div>
            </div>

            {/* Show dropdown */}
            <div>
              <label className="text-[10px] text-slate-500 font-medium mb-1 block">Show</label>
              <Select value={showMode} onValueChange={(v: any) => setShowMode(v)}>
                <SelectTrigger className="h-8 text-xs bg-transparent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="at-risk">At-risk only</SelectItem>
                  <SelectItem value="safe">Safe only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Workflow Toggle */}
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-200">
            <span className="text-xs text-slate-500 font-medium">Workflow:</span>
            <div className="flex items-center gap-0.5 bg-slate-100 rounded-md p-0.5">
              <button
                onClick={() => {
                  setWorkflowMode("supply-chain")
                  setPcSelectedProgram(null)
                  setPcSelectedMSA(null)
                  setPcSelectedWorkstation(null)
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${workflowMode === "supply-chain" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
              >
                <Layers className="w-3.5 h-3.5" />
                Supply Chain
              </button>
              <button
                onClick={() => {
                  setWorkflowMode("production-control")
                  setSelectedPart(null)
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${workflowMode === "production-control" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
              >
                <Factory className="w-3.5 h-3.5" />
                Production Control
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SUPPLY CHAIN WORKFLOW - PART SELECTION TABLE */}
      {workflowMode === "supply-chain" && !selectedPart && (
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                Parts at Risk ({filteredParts.length} part{filteredParts.length !== 1 ? "s" : ""})
              </CardTitle>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Click on a part to begin mitigation analysis</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-[10px] font-semibold text-slate-600">Part Number</TableHead>
                  <TableHead className="text-[10px] font-semibold text-slate-600">Description</TableHead>
                  <TableHead className="text-[10px] font-semibold text-slate-600">Commodity</TableHead>
                  <TableHead className="text-[10px] font-semibold text-slate-600">Supplier</TableHead>
                  <TableHead className="text-[10px] font-semibold text-slate-600">Program</TableHead>
                  <TableHead className="text-[10px] font-semibold text-slate-600">First Shortage</TableHead>
                  <TableHead className="text-[10px] font-semibold text-slate-600">Peak Qty</TableHead>
                  <TableHead className="text-[10px] font-semibold text-slate-600">Total Value</TableHead>
                  <TableHead className="text-[10px] font-semibold text-slate-600">Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-sm text-slate-500 py-8">
                      No parts match your filter criteria. Try adjusting filters or clearing the part search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParts.map((part) => (
                    <TableRow key={part.partNumber} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedPart(part.partNumber)}>
                      <TableCell className="text-[11px] text-[#8B0000] font-medium hover:underline">{part.partNumber}</TableCell>
                      <TableCell className="text-[10px] text-slate-600">{part.partDesc}</TableCell>
                      <TableCell className="text-[10px] text-slate-600">{part.commodity}</TableCell>
                      <TableCell className="text-[10px] text-slate-600">{part.supplier}</TableCell>
                      <TableCell className="text-[10px] text-slate-600">{part.program}</TableCell>
                      <TableCell className="text-[10px] text-red-600 font-medium">{formatDate(part.firstShortageDate)}</TableCell>
                      <TableCell className="text-[10px] text-amber-600 font-medium">{part.peakShortageQty}</TableCell>
                      <TableCell className="text-[10px] text-slate-900 font-medium">{formatCurrency(part.totalShortageValue)}</TableCell>
                      <TableCell>
                        <Badge
                          className={`text-[9px] ${part.riskLevel === "Critical" ? "bg-red-100 text-red-700" : part.riskLevel === "High" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}
                        >
                          {part.riskLevel}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* PRODUCTION CONTROL HIERARCHY DRILLDOWN */}
      {workflowMode === "production-control" && (
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Select Program → Major Subassembly → Workstation → Part</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Breadcrumb */}
            {(pcSelectedProgram || pcSelectedMSA || pcSelectedWorkstation) && (
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => {
                    setPcSelectedProgram(null)
                    setPcSelectedMSA(null)
                    setPcSelectedWorkstation(null)
                  }}
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  All Programs
                </button>
                {pcSelectedProgram && (
                  <>
                    <span className="text-slate-400">/</span>
                    <button
                      onClick={() => {
                        setPcSelectedMSA(null)
                        setPcSelectedWorkstation(null)
                      }}
                      className="text-blue-600 hover:underline"
                    >
                      {pcSelectedProgram}
                    </button>
                  </>
                )}
                {pcSelectedMSA && (
                  <>
                    <span className="text-slate-400">/</span>
                    <button onClick={() => setPcSelectedWorkstation(null)} className="text-blue-600 hover:underline">
                      {pcSelectedMSA}
                    </button>
                  </>
                )}
                {pcSelectedWorkstation && (
                  <>
                    <span className="text-slate-400">/</span>
                    <span className="font-medium text-slate-900">{pcSelectedWorkstation}</span>
                  </>
                )}
              </div>
            )}

            {/* Program Selection */}
            {!pcSelectedProgram && (
              <div>
                <p className="text-xs text-slate-500 mb-2">Select a program with shortages:</p>
                <div className="grid grid-cols-3 gap-2">
                  {PROGRAMS.map((prog, idx) => (
                    <Card key={prog} className="border-slate-200 cursor-pointer hover:border-slate-400 transition-colors" onClick={() => setPcSelectedProgram(prog)}>
                      <CardContent className="p-3">
                        <p className="text-sm font-medium text-slate-900">{prog}</p>
                        <p className="text-xs text-slate-500 mt-1">{idx === 0 ? "3" : "2"} shortages</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* MSA Selection */}
            {pcSelectedProgram && !pcSelectedMSA && (
              <div>
                <p className="text-xs text-slate-500 mb-2">Select a Major Subassembly:</p>
                <div className="grid grid-cols-3 gap-2">
                  {MAJOR_SUBASSEMBLIES.map((msa, idx) => (
                    <Card key={msa} className="border-slate-200 cursor-pointer hover:border-slate-400 transition-colors" onClick={() => setPcSelectedMSA(msa)}>
                      <CardContent className="p-3">
                        <p className="text-sm font-medium text-slate-900">{msa}</p>
                        <p className="text-xs text-slate-500 mt-1">{idx === 2 ? "2" : "1"} shortage{idx === 2 ? "s" : ""}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Workstation Selection */}
            {pcSelectedMSA && !pcSelectedWorkstation && (
              <div>
                <p className="text-xs text-slate-500 mb-2">Select a Workstation:</p>
                <div className="grid grid-cols-3 gap-2">
                  {WORKSTATIONS.filter((ws) => ws.majorSubassembly === pcSelectedMSA).map((ws) => (
                    <Card key={ws.id} className="border-slate-200 cursor-pointer hover:border-slate-400 transition-colors" onClick={() => setPcSelectedWorkstation(ws.name)}>
                      <CardContent className="p-3">
                        <p className="text-sm font-medium text-slate-900">{ws.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{ws.id}</p>
                        <p className="text-xs text-slate-500 mt-1">2 shortages</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Top Blockers for selected Workstation */}
            {pcSelectedWorkstation && (
              <div>
                <p className="text-xs text-slate-500 mb-2">Top Blockers (click on a part to begin mitigation):</p>
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-[10px] font-semibold text-slate-600">Part Number</TableHead>
                      <TableHead className="text-[10px] font-semibold text-slate-600">Description</TableHead>
                      <TableHead className="text-[10px] font-semibold text-slate-600">Commodity</TableHead>
                      <TableHead className="text-[10px] font-semibold text-slate-600">First Shortage</TableHead>
                      <TableHead className="text-[10px] font-semibold text-slate-600">Peak Qty</TableHead>
                      <TableHead className="text-[10px] font-semibold text-slate-600">Risk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredParts
                      .filter((part) => part.workstation === pcSelectedWorkstation.split(" ")[0])
                      .map((part) => (
                        <TableRow key={part.partNumber} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedPart(part.partNumber)}>
                          <TableCell className="text-[11px] text-[#8B0000] font-medium hover:underline">{part.partNumber}</TableCell>
                          <TableCell className="text-[10px] text-slate-600">{part.partDesc}</TableCell>
                          <TableCell className="text-[10px] text-slate-600">{part.commodity}</TableCell>
                          <TableCell className="text-[10px] text-red-600 font-medium">{formatDate(part.firstShortageDate)}</TableCell>
                          <TableCell className="text-[10px] text-amber-600 font-medium">{part.peakShortageQty}</TableCell>
                          <TableCell>
                            <Badge
                              className={`text-[9px] ${part.riskLevel === "Critical" ? "bg-red-100 text-red-700" : part.riskLevel === "High" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}
                            >
                              {part.riskLevel}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* SELECTED PART CONTEXT STRIP */}
      {selectedPart && selectedPartData && (
        <Card className="border-slate-200 bg-gradient-to-r from-slate-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              {/* Left side - Part Identity */}
              <div className="flex-1">
                <div className="mb-2">
                  <p className="text-sm font-bold text-slate-900">{selectedPartData.partNumber}</p>
                  <p className="text-xs text-slate-600">{selectedPartData.partDesc}</p>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                  <div>
                    <p className="text-[10px] text-slate-500">Commodity</p>
                    <p className="text-xs font-medium text-slate-700">{selectedPartData.commodity}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Primary Supplier</p>
                    <p className="text-xs font-medium text-slate-700">{selectedPartData.supplier}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] text-slate-500">Parent Rollup</p>
                    <p className="text-xs font-medium text-slate-700">{selectedPartData.parentRollup}</p>
                  </div>
                </div>
              </div>

              {/* Right side - Risk Snapshot */}
              <div className="flex-1 pl-8">
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  <div>
                    <p className="text-[10px] text-slate-500">First Shortage</p>
                    <p className="text-sm font-bold text-red-600">{formatDate(selectedPartData.firstShortageDate)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Peak Shortage Qty</p>
                    <p className="text-sm font-bold text-amber-600">{selectedPartData.peakShortageQty} units</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Total Shortage Value</p>
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(selectedPartData.totalShortageValue)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Deliverables Impacted</p>
                    <p className="text-sm font-bold text-slate-900">{selectedPartData.deliverablesImpacted}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <Badge className="bg-red-100 text-red-700 border-red-300">{selectedPartData.riskLevel} Risk</Badge>
                </div>
              </div>

              {/* Jump to Source & Close */}
              <div className="ml-4 flex gap-2">
                <Select defaultValue="shortage">
                  <SelectTrigger className="h-8 text-[10px] w-[140px] bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shortage">From: Shortage Queue</SelectItem>
                    <SelectItem value="long-lead">From: Long-Lead Queue</SelectItem>
                    <SelectItem value="critical">From: Critical Path</SelectItem>
                  </SelectContent>
                </Select>
                <button onClick={() => setSelectedPart(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SUPPLY MITIGATION SECTION */}
      {selectedPart && selectedPartData && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            Supply Mitigation (Get Supply)
          </h3>

          {/* Supply KPI Cards */}
          <div className="grid grid-cols-6 gap-3">
            {[
              {
                label: "Available Now",
                value: `${selectedPartData.availableNow} units`,
                info: "On-hand + Bench + 3PL (same-day accessible)",
              },
              { label: "Pipeline", value: `${selectedPartData.pipeline} units`, info: "Open POs + In-house WIP (not yet usable)" },
              {
                label: "Earliest Supply",
                value: formatDate(selectedPartData.earliestSupplyDate),
                info: "Earliest date cumulative supply becomes positive",
              },
              { label: "Days of Coverage", value: `${selectedPartData.daysOfCoverage} days`, info: "Available Now / Avg Daily Demand" },
              {
                label: "Max Expedite Gain",
                value: `${selectedPartData.maxExpediteGain} days`,
                info: "Potential days pulled in if best candidate action executed",
              },
              {
                label: "Net Shortage",
                value: `${selectedPartData.netShortage} units`,
                info: "Total negative netting quantity across horizon",
              },
            ].map((card, idx) => (
              <Card key={idx} className="border-slate-200">
                <CardContent className="p-3">
                  <div className="relative group mb-2">
                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                      {card.label}
                      <Info className="w-2.5 h-2.5 text-slate-400 cursor-help" />
                    </p>
                    <div className="absolute z-20 bottom-full left-0 mb-2 w-[180px] p-2 text-[9px] bg-slate-900 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {card.info}
                    </div>
                  </div>
                  <p className={`text-sm font-bold ${card.label === "Net Shortage" ? "text-red-600" : "text-slate-900"}`}>{card.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Supply Position Visual */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Where Can I Get It?</CardTitle>
                <Tabs value={supplyViewTab} onValueChange={setSupplyViewTab} className="w-auto">
                  <TabsList className="h-8 bg-slate-100">
                    <TabsTrigger value="netting" className="text-xs">
                      Time-Phased Netting
                    </TabsTrigger>
                    <TabsTrigger value="nodes" className="text-xs">
                      Supply by Node
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {supplyViewTab === "netting" ? (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-[10px] font-semibold text-slate-600">Date Bucket</TableHead>
                      <TableHead className="text-[10px] font-semibold text-slate-600">Starting OH</TableHead>
                      <TableHead className="text-[10px] font-semibold text-slate-600">Supply In</TableHead>
                      <TableHead className="text-[10px] font-semibold text-slate-600">Demand Out</TableHead>
                      <TableHead className="text-[10px] font-semibold text-slate-600">Ending NA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nettingData.map((row, idx) => (
                      <TableRow key={idx} className={row.isShortage ? "bg-red-50" : ""}>
                        <TableCell className="text-[10px] text-slate-700">{row.week}</TableCell>
                        <TableCell className={`text-[10px] font-medium ${row.startingOH < 0 ? "text-red-600" : "text-slate-900"}`}>{row.startingOH}</TableCell>
                        <TableCell className="text-[10px] text-green-600 font-medium">{row.supplyIn > 0 ? `+${row.supplyIn}` : "-"}</TableCell>
                        <TableCell className="text-[10px] text-slate-600">-{row.demandOut}</TableCell>
                        <TableCell className={`text-[10px] font-bold ${row.endingNA < 0 ? "text-red-600" : "text-green-600"}`}>{row.endingNA}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-[10px] font-semibold text-slate-600">Location/Node</TableHead>
                      <TableHead className="text-[10px] font-semibold text-slate-600">On-hand</TableHead>
                      <TableHead className="text-[10px] font-semibold text-slate-600">Allocated</TableHead>
                      <TableHead className="text-[10px] font-semibold text-slate-600">Free</TableHead>
                      <TableHead className="text-[10px] font-semibold text-slate-600">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryBreakdown.map((inv, idx) => (
                      <TableRow key={idx} className="hover:bg-slate-50">
                        <TableCell className="text-[10px] text-slate-900 font-medium">{inv.location}</TableCell>
                        <TableCell className="text-[10px] text-slate-900">{inv.onHand}</TableCell>
                        <TableCell className="text-[10px] text-amber-600">{inv.allocated}</TableCell>
                        <TableCell className="text-[10px] text-green-600 font-medium">{inv.free}</TableCell>
                        <TableCell className="text-[10px] text-slate-500 italic">{inv.notes || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Supply Action Workbench Table */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Supply Actions for {selectedPartData.partNumber}</CardTitle>
              <div className="flex items-center gap-2">
                <Select defaultValue="all">
                  <SelectTrigger className="h-7 text-[10px] w-[120px] bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="eliminate">Eliminates shortage</SelectItem>
                    <SelectItem value="high-conf">High confidence</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="h-7 text-[10px] bg-transparent">
                  <Download className="w-3 h-3 mr-1" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-b border-slate-200">
                    <TableHead className="text-[10px] font-semibold text-slate-600">Action Type</TableHead>
                    <TableHead className="text-[10px] font-semibold text-slate-600">Source Channel</TableHead>
                    <TableHead className="text-[10px] font-semibold text-slate-600">Source Reference</TableHead>
                    <TableHead className="text-[10px] font-semibold text-slate-600">Qty Available</TableHead>
                    <TableHead className="text-[10px] font-semibold text-slate-600">Earliest Avail. Date</TableHead>
                    <TableHead className="text-[10px] font-semibold text-slate-600">Days Gained</TableHead>
                    <TableHead className="text-[10px] font-semibold text-slate-600">Cost Impact</TableHead>
                    <TableHead className="text-[10px] font-semibold text-slate-600">Confidence</TableHead>
                    <TableHead className="text-[10px] font-semibold text-slate-600">Owner</TableHead>
                    <TableHead className="text-[10px] font-semibold text-slate-600">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplyActions.map((action, idx) => (
                    <TableRow key={idx} className="hover:bg-slate-50 cursor-pointer" onClick={() => alert(`View detail for: ${action.actionType}`)}>
                      <TableCell className="text-[10px] text-slate-900 font-medium">{action.actionType}</TableCell>
                      <TableCell className="text-[10px] text-slate-600">{action.sourceChannel}</TableCell>
                      <TableCell className="text-[10px] text-blue-600 font-medium hover:underline">{action.sourceRef}</TableCell>
                      <TableCell className="text-[10px] text-slate-900 font-medium">{action.qtyAvail}</TableCell>
                      <TableCell className="text-[10px] text-slate-600">{formatDate(action.availDate)}</TableCell>
                      <TableCell className="text-[10px] text-green-600 font-bold">+{action.daysGained}d</TableCell>
                      <TableCell className="text-[10px] text-slate-600">{action.costImpact}</TableCell>
                      <TableCell>
                        <Badge
                          className={`text-[9px] ${action.confidence === "High" ? "bg-green-100 text-green-700" : action.confidence === "Medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}`}
                        >
                          {action.confidence}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] text-slate-600">{action.owner}</TableCell>
                      <TableCell>
                        <Badge className="text-[9px]">{action.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* DEMAND MITIGATION SECTION */}
      {selectedPart && selectedPartData && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-600" />
            Demand Mitigation (Move Demand / Reprioritize)
          </h3>

          {/* Demand KPI Cards */}
          <div className="grid grid-cols-5 gap-3">
            {[
              {
                label: "Total Demand (Horizon)",
                value: `${demandKpis.totalDemand} units`,
                info: `Firm: ${demandKpis.firmDemand}, Forecast: ${demandKpis.forecastDemand}`,
              },
              {
                label: "Critical Demand Lines",
                value: demandKpis.criticalLines,
                info: "Demand lines in critical path or within X days of need date",
              },
              {
                label: "Max Reschedulable Qty",
                value: `${demandKpis.reschedulableQty} units`,
                info: "Qty that can be slipped/moved without delivery impact",
              },
              { label: "Max Slip Opportunity", value: `${demandKpis.maxSlipDays} days`, info: "Maximum slip possible for non-critical demands" },
              { label: "Competing Programs", value: demandKpis.competingPrograms, info: "Unique programs competing for this part" },
            ].map((card, idx) => (
              <Card key={idx} className="border-slate-200">
                <CardContent className="p-3">
                  <div className="relative group mb-2">
                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                      {card.label}
                      <Info className="w-2.5 h-2.5 text-slate-400 cursor-help" />
                    </p>
                    <div className="absolute z-20 bottom-full left-0 mb-2 w-[160px] p-2 text-[9px] bg-slate-900 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {card.info}
                    </div>
                  </div>
                  <p className="text-sm font-bold text-slate-900">{card.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Demand Where-Used Table */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Demand Where-Used (for {selectedPartData.partNumber})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-b border-slate-200">
                    <TableHead className="text-[10px] font-semibold text-slate-600">Program</TableHead>
                    <TableHead className="text-[10px] font-semibold text-slate-600">Deliverable</TableHead>
                    <TableHead className="text-[10px] font-semibold text-slate-600">Assembly</TableHead>
                    <TableHead className="text-[10px] font-semibold text-slate-600">Need Date</TableHead>
                    <TableHead className="text-[10px] font-semibold text-slate-600">Qty</TableHead>
                    <TableHead className="text-[10px] font-semibold text-slate-600">Demand Type</TableHead>
                    <TableHead className="text-[10px] font-semibold text-slate-600">Slack Days</TableHead>
                    <TableHead className="text-[10px] font-semibold text-slate-600">Criticality</TableHead>
                    <TableHead className="text-[10px] font-semibold text-slate-600">Suggested Move</TableHead>
                    <TableHead className="text-[10px] font-semibold text-slate-600">Impact Summary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {demandWhereUsed.map((row, idx) => (
                    <TableRow key={idx} className="hover:bg-slate-50">
                      <TableCell className="text-[10px] text-slate-700">{row.program}</TableCell>
                      <TableCell className="text-[10px] text-blue-600 font-medium hover:underline cursor-pointer">{row.deliverable}</TableCell>
                      <TableCell className="text-[10px] text-slate-600">{row.assembly}</TableCell>
                      <TableCell className="text-[10px] text-slate-600">{formatDate(row.needDate)}</TableCell>
                      <TableCell className="text-[10px] font-medium text-slate-900">{row.qtyNeeded}</TableCell>
                      <TableCell className="text-[10px] text-slate-600">{row.demandType}</TableCell>
                      <TableCell className="text-[10px] font-medium text-slate-600">{row.slackDays}d</TableCell>
                      <TableCell>
                        <Badge
                          className={`text-[9px] ${row.criticality === "Critical" ? "bg-red-100 text-red-700" : row.criticality === "Near-Critical" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}
                        >
                          {row.criticality}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] text-slate-600">{row.suggestedMove}</TableCell>
                      <TableCell className="text-[10px] text-slate-500 italic">{row.impactSummary}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mitigation Scenarios */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Mitigation Scenarios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded p-3">
                  <p className="text-[10px] font-semibold text-slate-600 mb-2">Proposed Supply Actions</p>
                  <ul className="space-y-1 text-[10px]">
                    <li className="flex items-center gap-2 text-slate-700">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                      Expedite PO-2026-0165 (+5 days)
                    </li>
                    <li className="flex items-center gap-2 text-slate-700">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                      Release Bench Hold (+0 days)
                    </li>
                  </ul>
                </div>
                <div className="border border-slate-200 rounded p-3">
                  <p className="text-[10px] font-semibold text-slate-600 mb-2">Proposed Demand Changes</p>
                  <ul className="space-y-1 text-[10px]">
                    <li className="flex items-center gap-2 text-slate-700">
                      <span className="w-1.5 h-1.5 bg-purple-600 rounded-full" />
                      Slip DEL-2026-0061 by 8 days
                    </li>
                    <li className="flex items-center gap-2 text-slate-700">
                      <span className="w-1.5 h-1.5 bg-purple-600 rounded-full" />
                      Partial kit DEL-2026-0058
                    </li>
                  </ul>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <p className="text-[10px] font-semibold text-slate-600 mb-3">Projected Outcome</p>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { label: "New 1st Shortage", value: "Feb 14" },
                    { label: "New Peak Qty", value: "70 units" },
                    { label: "Deliverables at Risk", value: "1" },
                    { label: "Max Proj. Slip", value: "8 days" },
                    { label: "Status", value: "Viable" },
                  ].map((item, idx) => (
                    <div key={idx} className="text-center p-2 bg-slate-50 rounded">
                      <p className="text-[9px] text-slate-500 mb-1">{item.label}</p>
                      <p className="text-xs font-bold text-slate-900">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button className="flex-1 h-8 text-xs bg-[#8B0000] hover:bg-[#6B0000]">
                  <Download className="w-3 h-3 mr-1" />
                  Export Mitigation Plan
                </Button>
                <Button variant="outline" className="flex-1 h-8 text-xs bg-transparent">
                  Copy Summary for Risk Registry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
