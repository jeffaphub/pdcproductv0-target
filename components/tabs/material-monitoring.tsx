"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell } from "recharts"
import { Info, X, FileText, Download, ChevronRight, ChevronDown, Search } from "lucide-react"
import { AreaChart, Area } from "recharts"

// Shared data constants - consistent with other tabs
const PROGRAMS = ["Manpack Radio Program", "Vehicle Mount System", "Tactical HF Radio", "Base Station Program", "Portable Comm System"]
const DIVISIONS = ["Defense Electronics", "Communications", "Aerospace Systems"]
const SUPPLIERS = ["AeroSupply Inc", "Precision Parts Ltd", "FastConnect Co", "PowerTech Systems", "ElectroComponents", "MechParts Co", "SignalTech Inc", "TechSource Ltd", "SecureComm Ltd", "ThermalTech Inc", "AudioTech Corp"]
const CONFIGS = ["Block I", "Block II", "Block III"]

// Subassemblies per program - consistent with schedule-risk-registry
const SUBASSEMBLIES: Record<string, string[]> = {
  "Manpack Radio Program": ["RF Transceiver Module", "Battery Pack Assembly", "Antenna Interface Unit", "Digital Signal Processor", "Ruggedized Enclosure"],
  "Vehicle Mount System": ["Power Amplifier Module", "Mounting Bracket Assembly", "Vehicle Interface Unit", "Cooling System"],
  "Tactical HF Radio": ["HF Tuner Assembly", "Cryptographic Module", "Control Display Unit"],
  "Base Station Program": ["Tower Electronics Bay", "Network Interface Card", "Power Distribution Unit"],
  "Portable Comm System": ["Handheld Transceiver", "Earpiece Assembly", "Quick-Release Battery"],
}

export function MaterialMonitoring() {
  // Header Filters
  const [division, setDivision] = useState("All")
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([])
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState("2026-01")

  // Control Strip
  const [periodType, setPeriodType] = useState<"Month" | "Quarter" | "Year">("Month")
  const [forecastVersion, setForecastVersion] = useState("V3.2")
  const [focusScheduleControlling, setFocusScheduleControlling] = useState(false)

  // Breadcrumb / Selection State
  const [breadcrumb, setBreadcrumb] = useState<{ supplier?: string; tab?: string; item?: string; period?: string }>({})

  // Chart Selection State
  const [selectedChartSupplier, setSelectedChartSupplier] = useState<string | null>(null)
  const [selectedChartProgram, setSelectedChartProgram] = useState<string | null>(null)

  // Bottom Section Tab
  const [bottomTab, setBottomTab] = useState("late")

  // Detail Drawer
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerData, setDrawerData] = useState<any>(null)
  const [drawerType, setDrawerType] = useState<"po" | "exception" | "blocker">("po")
  const [drawerTab, setDrawerTab] = useState("summary")

  // Exception filters
  const [exceptionStatusFilter, setExceptionStatusFilter] = useState<string[]>([])
  const [exceptionOwnerFilter, setExceptionOwnerFilter] = useState<string[]>([])
  const [exceptionTypeFilter, setExceptionTypeFilter] = useState<string[]>([])
  const [exceptionAgeFilter, setExceptionAgeFilter] = useState("All")

  // Supplier Performance Tab
  const [supplierPerfTab, setSupplierPerfTab] = useState("otd")

  // Variance Driver Selection
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null)
  const [notesModalOpen, setNotesModalOpen] = useState(false)
  const [notesModalDriver, setNotesModalDriver] = useState<string | null>(null)

  // Supplier / Source Mix Panel
  const [sourceMixExpanded, setSourceMixExpanded] = useState(false)
  const [sourceMixItem, setSourceMixItem] = useState<string | null>(null)
  const [sourceMixViewBy, setSourceMixViewBy] = useState<"spend" | "quantity">("spend")
  const [sourceMixSelectedSupplier, setSourceMixSelectedSupplier] = useState<string | null>(null)

  // Exception filters - schedule controlling
  const [exceptionScheduleControlling, setExceptionScheduleControlling] = useState(false)

  const handleReset = () => {
    setDivision("All")
    setSelectedPrograms([])
    setSelectedSuppliers([])
    setSelectedPeriod("2026-01")
    setPeriodType("Month")
    setForecastVersion("V3.2")
    setFocusScheduleControlling(false)
    setBreadcrumb({})
    setSelectedChartSupplier(null)
    setSelectedChartProgram(null)
    setSelectedDriver(null)
    setSourceMixSelectedSupplier(null)
    setSourceMixItem(null)
  }

  const handleClearSelection = () => {
    setBreadcrumb({})
    setSelectedChartSupplier(null)
    setSelectedChartProgram(null)
  }

  // Generate period options based on period type
  const periodOptions = useMemo(() => {
    if (periodType === "Month") {
      return ["2026-01", "2025-12", "2025-11", "2025-10", "2025-09", "2025-08"]
    } else if (periodType === "Quarter") {
      return ["Q1 2026", "Q4 2025", "Q3 2025", "Q2 2025"]
    } else {
      return ["2026", "2025", "2024"]
    }
  }, [periodType])

  // Material Cost Data
  const costTimeSeriesData = useMemo(() => {
    const months = periodType === "Month" ? 12 : periodType === "Quarter" ? 8 : 5
    const labels = periodType === "Month"
      ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      : periodType === "Quarter"
        ? ["Q1 '24", "Q2 '24", "Q3 '24", "Q4 '24", "Q1 '25", "Q2 '25", "Q3 '25", "Q4 '25"]
        : ["2022", "2023", "2024", "2025", "2026"]

    // Base multiplier for program/division filtering
    const multiplier = division === "Defense Electronics" ? 1.1 : division === "Communications" ? 0.9 : 1.0
    const programMultiplier = selectedPrograms.length > 0 ? selectedPrograms.length * 0.3 : 1.0

    return labels.slice(0, months).map((label, i) => {
      const base = 800000 + i * 50000
      const plan = (base + 20000) * multiplier * programMultiplier
      // Actuals track slightly above plan for past months
      const actual = i < 6 ? (plan * (1 + 0.02 + (Math.sin(i) * 0.02))) : null
      // Forecast is set to be ~4% above plan (3-5% range) consistently
      const forecast = plan * (1.035 + (i % 3) * 0.005) // Results in 3.5% to 4.5% above plan
      return {
        period: label,
        actual: actual ? Math.round(actual) : null,
        forecast: Math.round(forecast),
        plan: Math.round(plan),
        isToday: i === 5,
      }
    })
  }, [periodType, division, selectedPrograms])

  // KPI Data - derived from chart data
  const kpiData = useMemo(() => {
    // Actuals: Sum of all actual values up to and including "today" (where isToday = true or actual is not null)
    const actuals = costTimeSeriesData.reduce((sum, d) => sum + (d.actual || 0), 0)
    
    // Find the "today" index (where isToday is true, or last actual data point)
    const todayIndex = costTimeSeriesData.findIndex(d => d.isToday)
    
    // Projected: Actuals so far + remaining forecast values after today
    const remainingForecast = costTimeSeriesData.slice(todayIndex + 1).reduce((sum, d) => sum + (d.forecast || 0), 0)
    const projected = actuals + remainingForecast
    
    // Plan: Sum of all plan values for the full period
    const plan = costTimeSeriesData.reduce((sum, d) => sum + (d.plan || 0), 0)
    
    // Variance: Projected - Plan (positive = over budget, negative = under budget)
    const variance = projected - plan
    
    return { actuals, projected, plan, variance }
  }, [costTimeSeriesData])

  // Variance Driver Breakdown Data - explains what's driving the variance
  const varianceDriverData = useMemo(() => {
    const totalVariance = kpiData.variance
    const absVariance = Math.abs(totalVariance)
    
    // If no variance, return empty drivers
    if (Math.abs(totalVariance) < 1000) {
      return {
        drivers: [{ name: "Unclassified", value: totalVariance, pctOfVariance: 100 }],
        hasDrivers: false,
        totalVariance
      }
    }
    
    // Generate driver breakdown - these would come from real data in production
    // Drivers should sum to the total variance
    const sign = totalVariance > 0 ? 1 : -1
    
    // Allocate variance across drivers (realistic proportions)
    const ppv = Math.round(absVariance * 0.35) * sign // Price variance typically largest
    const attritionScrap = Math.round(absVariance * 0.22) * sign
    const expedite = Math.round(absVariance * 0.18) * sign
    const mixVolume = Math.round(absVariance * 0.15) * sign
    const other = totalVariance - ppv - attritionScrap - expedite - mixVolume // Remainder to ensure sum matches
    
    // Only driver bars - no Plan or Projected
    const drivers = [
      { name: "Price (PPV)", value: ppv, pctOfVariance: Math.round((Math.abs(ppv) / absVariance) * 100) },
      { name: "Attrition / Scrap", value: attritionScrap, pctOfVariance: Math.round((Math.abs(attritionScrap) / absVariance) * 100) },
      { name: "Expedite / Premium", value: expedite, pctOfVariance: Math.round((Math.abs(expedite) / absVariance) * 100) },
      { name: "Mix / Volume", value: mixVolume, pctOfVariance: Math.round((Math.abs(mixVolume) / absVariance) * 100) },
      { name: "Other", value: other, pctOfVariance: Math.round((Math.abs(other) / absVariance) * 100) },
    ]
    
    return { drivers, hasDrivers: true, totalVariance }
  }, [kpiData])

  // Outstanding PO by Supplier
  const poBySupplierData = useMemo(() => {
    let data = SUPPLIERS.map(supplier => {
      const base = Math.floor(Math.random() * 500000) + 100000
      const multiplier = division === "Defense Electronics" ? 1.1 : division === "Communications" ? 0.9 : 1.0
      return {
        supplier: supplier.length > 12 ? supplier.substring(0, 12) + "..." : supplier,
        fullName: supplier,
        amount: Math.round(base * multiplier),
      }
    }).sort((a, b) => b.amount - a.amount).slice(0, 8)

    if (selectedSuppliers.length > 0) {
      data = data.filter(d => selectedSuppliers.some(s => d.fullName.includes(s) || s.includes(d.fullName)))
    }
    return data
  }, [division, selectedSuppliers])

  // Outstanding PO by Program
  const poByProgramData = useMemo(() => {
    let data = PROGRAMS.map(program => {
      const base = Math.floor(Math.random() * 600000) + 150000
      const multiplier = division === "Defense Electronics" && (program.includes("Manpack") || program.includes("Vehicle") || program.includes("Portable")) ? 1.2 :
        division === "Communications" && (program.includes("Tactical") || program.includes("Base")) ? 1.2 : 1.0
      return {
        program: program.length > 15 ? program.substring(0, 15) + "..." : program,
        fullName: program,
        amount: Math.round(base * multiplier),
      }
    }).sort((a, b) => b.amount - a.amount)

    if (selectedPrograms.length > 0) {
      data = data.filter(d => selectedPrograms.includes(d.fullName))
    }
    return data
  }, [division, selectedPrograms])

  // Get active supplier - from chart click OR from header dropdown
  const activeSupplier = useMemo(() => {
    if (selectedChartSupplier) return selectedChartSupplier
    if (selectedSuppliers.length === 1) return selectedSuppliers[0]
    return null
  }, [selectedChartSupplier, selectedSuppliers])

  // Supplier Performance Data
  const supplierPerfData = useMemo(() => {
    if (!activeSupplier) return null
    const seed = activeSupplier.charCodeAt(0) + activeSupplier.charCodeAt(activeSupplier.length - 1)
    return {
      otd: 78 + (seed % 20),
      promiseChanges: 12 + (seed % 15),
      rejectRate: 2.1 + (seed % 5) * 0.5,
      expediteCost: 15000 + (seed % 30) * 1000,
    }
  }, [activeSupplier])

  // Supplier Performance Trend Data
  const supplierTrendData = useMemo(() => {
    if (!activeSupplier) return []
    const seed = activeSupplier.charCodeAt(0)
    return [
      { month: "Aug", otd: 82 + (seed % 8), promise: 5 + (seed % 4), reject: 1.8 + (seed % 3) * 0.3, expedite: 2800 + (seed % 10) * 200 },
      { month: "Sep", otd: 84 + (seed % 6), promise: 4 + (seed % 5), reject: 2.1 + (seed % 2) * 0.4, expedite: 3200 + (seed % 8) * 250 },
      { month: "Oct", otd: 80 + (seed % 10), promise: 7 + (seed % 3), reject: 1.9 + (seed % 4) * 0.2, expedite: 4500 + (seed % 12) * 300 },
      { month: "Nov", otd: 86 + (seed % 5), promise: 3 + (seed % 6), reject: 1.5 + (seed % 3) * 0.5, expedite: 2100 + (seed % 6) * 150 },
      { month: "Dec", otd: 83 + (seed % 7), promise: 6 + (seed % 4), reject: 2.3 + (seed % 2) * 0.3, expedite: 3800 + (seed % 9) * 220 },
      { month: "Jan", otd: supplierPerfData?.otd || 85, promise: supplierPerfData?.promiseChanges || 5, reject: supplierPerfData?.rejectRate || 2.0, expedite: supplierPerfData?.expediteCost || 3500 },
    ]
  }, [activeSupplier, supplierPerfData])

  // PO Table Data - Late/Future/On Dock
  const generatePOData = (type: "late" | "future" | "ondock") => {
    const baseData = [
      // Manpack Radio Program POs
      { supplier: "AeroSupply Inc", poId: "PO-2026-0145", item: "PN-RF-001", description: "RF Amplifier Module", needDate: "2026-01-15", promiseDate: "2026-01-20", amount: 125000, qty: 24, program: "Manpack Radio Program", division: "Defense Electronics", config: "Block I", subassembly: "RF Transceiver Module", buyer: "John Smith" },
      { supplier: "AeroSupply Inc", poId: "PO-2026-0146", item: "PN-RF-002", description: "RF Filter Assembly", needDate: "2026-01-17", promiseDate: "2026-01-22", amount: 78000, qty: 48, program: "Manpack Radio Program", division: "Defense Electronics", config: "Block I", subassembly: "RF Transceiver Module", buyer: "John Smith" },
      { supplier: "Precision Parts Ltd", poId: "PO-2026-0156", item: "PN-PCB-450", description: "Main PCB Assembly", needDate: "2026-01-18", promiseDate: "2026-01-22", amount: 89000, qty: 36, program: "Manpack Radio Program", division: "Defense Electronics", config: "Block I", subassembly: "Digital Signal Processor", buyer: "Sarah Martinez" },
      { supplier: "Precision Parts Ltd", poId: "PO-2026-0157", item: "PN-PCB-451", description: "Control PCB", needDate: "2026-01-19", promiseDate: "2026-01-18", amount: 56000, qty: 36, program: "Manpack Radio Program", division: "Defense Electronics", config: "Block II", subassembly: "Digital Signal Processor", buyer: "Sarah Martinez" },
      { supplier: "ElectroComponents", poId: "PO-2026-0158", item: "PN-DSP-100", description: "DSP Chip Set", needDate: "2026-01-20", promiseDate: "2026-01-23", amount: 145000, qty: 100, program: "Manpack Radio Program", division: "Defense Electronics", config: "Block I", subassembly: "Digital Signal Processor", buyer: "Mike Chen" },
      { supplier: "PowerTech Systems", poId: "PO-2026-0159", item: "PN-BATT-100", description: "Battery Pack Li-Ion", needDate: "2026-01-21", promiseDate: "2026-01-20", amount: 92000, qty: 50, program: "Manpack Radio Program", division: "Defense Electronics", config: "Block I", subassembly: "Battery Pack Assembly", buyer: "David Chen" },
      { supplier: "FastConnect Co", poId: "PO-2026-0160", item: "PN-CONN-230", description: "Connector Set MIL-SPEC", needDate: "2026-01-22", promiseDate: "2026-01-25", amount: 34000, qty: 200, program: "Manpack Radio Program", division: "Defense Electronics", config: "Block II", subassembly: "Antenna Interface Unit", buyer: "Lisa Park" },
      { supplier: "AeroSupply Inc", poId: "PO-2026-0161", item: "PN-ANT-INT", description: "Antenna Interface Board", needDate: "2026-01-23", promiseDate: "2026-01-22", amount: 67000, qty: 30, program: "Manpack Radio Program", division: "Defense Electronics", config: "Block I", subassembly: "Antenna Interface Unit", buyer: "John Smith" },
      // Vehicle Mount System POs
      { supplier: "PowerTech Systems", poId: "PO-2026-0167", item: "PN-PWR-AMP", description: "Power Amplifier 100W", needDate: "2026-01-20", promiseDate: "2026-01-19", amount: 156000, qty: 20, program: "Vehicle Mount System", division: "Defense Electronics", config: "Block II", subassembly: "Power Amplifier Module", buyer: "David Chen" },
      { supplier: "PowerTech Systems", poId: "PO-2026-0168", item: "PN-PWR-SUP", description: "DC-DC Converter 28V", needDate: "2026-01-24", promiseDate: "2026-01-28", amount: 89000, qty: 40, program: "Vehicle Mount System", division: "Defense Electronics", config: "Block I", subassembly: "Power Amplifier Module", buyer: "David Chen" },
      { supplier: "MechParts Co", poId: "PO-2026-0190", item: "PN-MTG-100", description: "Mounting Bracket Assembly", needDate: "2026-01-28", promiseDate: "2026-02-02", amount: 45000, qty: 60, program: "Vehicle Mount System", division: "Defense Electronics", config: "Block I", subassembly: "Mounting Bracket Assembly", buyer: "Sarah Martinez" },
      { supplier: "MechParts Co", poId: "PO-2026-0191", item: "PN-MTG-101", description: "Shock Mount Kit", needDate: "2026-01-29", promiseDate: "2026-01-27", amount: 32000, qty: 60, program: "Vehicle Mount System", division: "Defense Electronics", config: "Block I", subassembly: "Mounting Bracket Assembly", buyer: "Sarah Martinez" },
      { supplier: "ThermalTech Inc", poId: "PO-2026-0234", item: "PN-COOL-50", description: "Cooling Fan Assembly", needDate: "2026-02-05", promiseDate: "2026-02-08", amount: 52000, qty: 40, program: "Vehicle Mount System", division: "Defense Electronics", config: "Block II", subassembly: "Cooling System", buyer: "Mike Chen" },
      { supplier: "ThermalTech Inc", poId: "PO-2026-0235", item: "PN-HEAT-SNK", description: "Heat Sink Aluminum", needDate: "2026-02-06", promiseDate: "2026-02-05", amount: 28000, qty: 80, program: "Vehicle Mount System", division: "Defense Electronics", config: "Block II", subassembly: "Cooling System", buyer: "Mike Chen" },
      { supplier: "FastConnect Co", poId: "PO-2026-0236", item: "PN-VEH-INT", description: "Vehicle Interface Harness", needDate: "2026-02-07", promiseDate: "2026-02-10", amount: 41000, qty: 30, program: "Vehicle Mount System", division: "Defense Electronics", config: "Block I", subassembly: "Vehicle Interface Unit", buyer: "Lisa Park" },
      // Tactical HF Radio POs
      { supplier: "SignalTech Inc", poId: "PO-2026-0178", item: "PN-HF-TUNER", description: "HF Antenna Tuner", needDate: "2026-01-22", promiseDate: "2026-01-28", amount: 98000, qty: 15, program: "Tactical HF Radio", division: "Communications", config: "Block I", subassembly: "HF Tuner Assembly", buyer: "John Smith" },
      { supplier: "SignalTech Inc", poId: "PO-2026-0179", item: "PN-HF-AMP", description: "HF Power Amplifier", needDate: "2026-01-25", promiseDate: "2026-01-30", amount: 134000, qty: 15, program: "Tactical HF Radio", division: "Communications", config: "Block I", subassembly: "HF Tuner Assembly", buyer: "John Smith" },
      { supplier: "SecureComm Ltd", poId: "PO-2026-0201", item: "PN-CRYPTO", description: "Type 1 Crypto Module", needDate: "2026-01-30", promiseDate: "2026-01-29", amount: 210000, qty: 12, program: "Tactical HF Radio", division: "Communications", config: "Block I", subassembly: "Cryptographic Module", buyer: "Mike Chen" },
      { supplier: "SecureComm Ltd", poId: "PO-2026-0202", item: "PN-KEY-FILL", description: "Key Fill Device", needDate: "2026-02-02", promiseDate: "2026-02-01", amount: 78000, qty: 12, program: "Tactical HF Radio", division: "Communications", config: "Block II", subassembly: "Cryptographic Module", buyer: "Mike Chen" },
      { supplier: "Precision Parts Ltd", poId: "PO-2026-0203", item: "PN-CDU-300", description: "Control Display Unit", needDate: "2026-02-04", promiseDate: "2026-02-07", amount: 112000, qty: 15, program: "Tactical HF Radio", division: "Communications", config: "Block I", subassembly: "Control Display Unit", buyer: "Sarah Martinez" },
      // Base Station Program POs
      { supplier: "TechSource Ltd", poId: "PO-2026-0189", item: "PN-NIC-200", description: "Network Interface Card", needDate: "2026-01-25", promiseDate: "2026-01-24", amount: 67000, qty: 25, program: "Base Station Program", division: "Communications", config: "Block II", subassembly: "Network Interface Card", buyer: "David Chen" },
      { supplier: "TechSource Ltd", poId: "PO-2026-0210", item: "PN-NIC-201", description: "Fiber Optic NIC", needDate: "2026-01-27", promiseDate: "2026-01-30", amount: 89000, qty: 20, program: "Base Station Program", division: "Communications", config: "Block I", subassembly: "Network Interface Card", buyer: "David Chen" },
      { supplier: "ElectroComponents", poId: "PO-2026-0212", item: "PN-CAP-780", description: "Capacitor Array HV", needDate: "2026-02-01", promiseDate: "2026-02-05", amount: 34000, qty: 100, program: "Base Station Program", division: "Communications", config: "Block I", subassembly: "Tower Electronics Bay", buyer: "Lisa Park" },
      { supplier: "PowerTech Systems", poId: "PO-2026-0213", item: "PN-PDU-100", description: "Power Distribution Unit", needDate: "2026-02-03", promiseDate: "2026-02-02", amount: 156000, qty: 10, program: "Base Station Program", division: "Communications", config: "Block II", subassembly: "Power Distribution Unit", buyer: "David Chen" },
      { supplier: "MechParts Co", poId: "PO-2026-0214", item: "PN-RACK-MTG", description: "19in Rack Mount Kit", needDate: "2026-02-08", promiseDate: "2026-02-12", amount: 23000, qty: 30, program: "Base Station Program", division: "Communications", config: "Block I", subassembly: "Tower Electronics Bay", buyer: "Sarah Martinez" },
      // Portable Comm System POs
      { supplier: "AudioTech Corp", poId: "PO-2026-0223", item: "PN-EARPC", description: "Tactical Earpiece", needDate: "2026-02-03", promiseDate: "2026-02-02", amount: 28000, qty: 100, program: "Portable Comm System", division: "Defense Electronics", config: "Block II", subassembly: "Earpiece Assembly", buyer: "Lisa Park" },
      { supplier: "AudioTech Corp", poId: "PO-2026-0224", item: "PN-MIC-ASM", description: "Boom Microphone Assembly", needDate: "2026-02-05", promiseDate: "2026-02-08", amount: 35000, qty: 100, program: "Portable Comm System", division: "Defense Electronics", config: "Block I", subassembly: "Earpiece Assembly", buyer: "Lisa Park" },
      { supplier: "AeroSupply Inc", poId: "PO-2026-0225", item: "PN-HH-TX", description: "Handheld Transceiver PCB", needDate: "2026-02-06", promiseDate: "2026-02-09", amount: 178000, qty: 50, program: "Portable Comm System", division: "Defense Electronics", config: "Block I", subassembly: "Handheld Transceiver", buyer: "John Smith" },
      { supplier: "PowerTech Systems", poId: "PO-2026-0226", item: "PN-BATT-QR", description: "Quick-Release Battery", needDate: "2026-02-07", promiseDate: "2026-02-06", amount: 67000, qty: 100, program: "Portable Comm System", division: "Defense Electronics", config: "Block I", subassembly: "Quick-Release Battery", buyer: "David Chen" },
      { supplier: "PowerTech Systems", poId: "PO-2026-0227", item: "PN-CHRG-STN", description: "Multi-Bay Charger Station", needDate: "2026-02-10", promiseDate: "2026-02-14", amount: 45000, qty: 20, program: "Portable Comm System", division: "Defense Electronics", config: "Block II", subassembly: "Quick-Release Battery", buyer: "David Chen" },
      { supplier: "MechParts Co", poId: "PO-2026-0228", item: "PN-CASE-HH", description: "Ruggedized Handheld Case", needDate: "2026-02-11", promiseDate: "2026-02-10", amount: 52000, qty: 50, program: "Portable Comm System", division: "Defense Electronics", config: "Block I", subassembly: "Handheld Transceiver", buyer: "Sarah Martinez" },
    ]

    return baseData.map(row => {
      const need = new Date(row.needDate)
      const promise = new Date(row.promiseDate)
      const gapDays = Math.round((promise.getTime() - need.getTime()) / (1000 * 60 * 60 * 24))
      let status = "On Track"
      if (type === "late") status = gapDays > 0 ? "Late" : "At Risk"
      else if (type === "future") status = gapDays > 3 ? "At Risk" : "Scheduled"
      else status = "Received"
      return { ...row, gapDays, status }
    }).filter(row => {
      if (division !== "All" && row.division !== division) return false
      if (selectedPrograms.length > 0 && !selectedPrograms.includes(row.program)) return false
      if (selectedSuppliers.length > 0 && !selectedSuppliers.includes(row.supplier)) return false
      if (selectedChartSupplier && row.supplier !== selectedChartSupplier) return false
      if (selectedChartProgram && row.program !== selectedChartProgram) return false
      if (type === "late") return row.gapDays > 0
      if (type === "future") return row.gapDays <= 0
      return true
    })
  }

  // Exception Data with Cost Impact fields
  const exceptionData = useMemo(() => {
    const data = [
      // Delivery Delays
      { id: "EX-001", type: "Delivery Delay", supplier: "AeroSupply Inc", item: "PN-RF-001", description: "RF Amplifier Module", poId: "PO-2026-0145", needDate: "2026-01-15", promiseDate: "2026-01-20", gapDays: 5, costImpactType: "Expedite", costImpact: 8500, owner: "John Smith", status: "New", age: 3, nextActionDate: "2026-02-01", program: "Manpack Radio Program", division: "Defense Electronics", impact: "High", notes: "Supplier citing raw material shortage", isScheduleControlling: true, qualityLinks: [] },
      { id: "EX-004", type: "Delivery Delay", supplier: "MechParts Co", item: "PN-MTG-100", description: "Mounting Bracket Assembly", poId: "PO-2026-0190", needDate: "2026-01-28", promiseDate: "2026-02-02", gapDays: 5, costImpactType: "Expedite", costImpact: 3200, owner: "David Chen", status: "New", age: 2, nextActionDate: "2026-02-02", program: "Vehicle Mount System", division: "Defense Electronics", impact: "Medium", notes: "Tooling maintenance extended", isScheduleControlling: true, qualityLinks: [] },
      { id: "EX-008", type: "Delivery Delay", supplier: "SignalTech Inc", item: "PN-HF-AMP", description: "HF Power Amplifier", poId: "PO-2026-0179", needDate: "2026-01-25", promiseDate: "2026-01-30", gapDays: 5, costImpactType: "Expedite", costImpact: 12400, owner: "John Smith", status: "Investigating", age: 5, nextActionDate: "2026-02-03", program: "Tactical HF Radio", division: "Communications", impact: "High", notes: "Component shortage from sub-tier", isScheduleControlling: true, qualityLinks: [] },
      { id: "EX-012", type: "Delivery Delay", supplier: "TechSource Ltd", item: "PN-NIC-201", description: "Fiber Optic NIC", poId: "PO-2026-0210", needDate: "2026-01-27", promiseDate: "2026-01-30", gapDays: 3, costImpactType: null, costImpact: null, owner: "David Chen", status: "Mitigation", age: 4, nextActionDate: "2026-02-01", program: "Base Station Program", division: "Communications", impact: "Low", notes: "Partial shipment accepted", isScheduleControlling: false, qualityLinks: [] },
      // Quality Issues
      { id: "EX-002", type: "Quality Issue", supplier: "Precision Parts Ltd", item: "PN-PCB-450", description: "Main PCB Assembly", poId: "PO-2026-0156", needDate: "2026-01-18", promiseDate: "2026-01-22", gapDays: 4, costImpactType: "Scrap", costImpact: 18500, owner: "Sarah Martinez", status: "Investigating", age: 8, nextActionDate: "2026-02-03", program: "Manpack Radio Program", division: "Defense Electronics", impact: "Critical", notes: "Solder defects on 12% of lot", isScheduleControlling: true, qualityLinks: ["RTV-2026-0034", "NC-2026-0089"] },
      { id: "EX-009", type: "Quality Issue", supplier: "SecureComm Ltd", item: "PN-CRYPTO", description: "Type 1 Crypto Module", poId: "PO-2026-0201", needDate: "2026-01-30", promiseDate: "2026-01-29", gapDays: -1, costImpactType: "Other", costImpact: 5200, owner: "Mike Chen", status: "New", age: 1, nextActionDate: "2026-02-02", program: "Tactical HF Radio", division: "Communications", impact: "Critical", notes: "Firmware version mismatch", isScheduleControlling: true, qualityLinks: ["NC-2026-0092"] },
      { id: "EX-013", type: "Quality Issue", supplier: "AudioTech Corp", item: "PN-EARPC", description: "Tactical Earpiece", poId: "PO-2026-0223", needDate: "2026-02-03", promiseDate: "2026-02-02", gapDays: -1, costImpactType: "Scrap", costImpact: 2800, owner: "Lisa Park", status: "Investigating", age: 6, nextActionDate: "2026-02-04", program: "Portable Comm System", division: "Defense Electronics", impact: "Medium", notes: "Cable strain relief failing QC", isScheduleControlling: false, qualityLinks: ["RTV-2026-0041"] },
      // Price Variances
      { id: "EX-003", type: "Price Variance", supplier: "SignalTech Inc", item: "PN-HF-TUNER", description: "HF Antenna Tuner", poId: "PO-2026-0178", needDate: "2026-01-22", promiseDate: "2026-01-28", gapDays: 6, costImpactType: "Price", costImpact: 11760, owner: "Mike Chen", status: "Mitigation", age: 15, nextActionDate: "2026-02-05", program: "Tactical HF Radio", division: "Communications", impact: "Medium", notes: "12% price increase requested", isScheduleControlling: false, qualityLinks: [] },
      { id: "EX-010", type: "Price Variance", supplier: "PowerTech Systems", item: "PN-PWR-AMP", description: "Power Amplifier 100W", poId: "PO-2026-0167", needDate: "2026-01-20", promiseDate: "2026-01-19", gapDays: -1, costImpactType: "Price", costImpact: 12480, owner: "David Chen", status: "Resolved", age: 22, nextActionDate: "2026-01-25", program: "Vehicle Mount System", division: "Defense Electronics", impact: "Low", notes: "8% increase approved via change order", isScheduleControlling: false, qualityLinks: [] },
      // Quantity Shorts
      { id: "EX-005", type: "Quantity Short", supplier: "ElectroComponents", item: "PN-CAP-780", description: "Capacitor Array HV", poId: "PO-2026-0212", needDate: "2026-02-01", promiseDate: "2026-02-05", gapDays: 4, costImpactType: "Other", costImpact: 1500, owner: "Lisa Park", status: "Resolved", age: 32, nextActionDate: "2026-01-28", program: "Base Station Program", division: "Communications", impact: "Low", notes: "Alternate source qualified", isScheduleControlling: false, qualityLinks: [] },
      { id: "EX-011", type: "Quantity Short", supplier: "FastConnect Co", item: "PN-CONN-230", description: "Connector Set MIL-SPEC", poId: "PO-2026-0160", needDate: "2026-01-22", promiseDate: "2026-01-25", gapDays: 3, costImpactType: "Expedite", costImpact: 4200, owner: "Lisa Park", status: "Mitigation", age: 10, nextActionDate: "2026-02-01", program: "Manpack Radio Program", division: "Defense Electronics", impact: "Medium", notes: "Only 80% of order available", isScheduleControlling: true, qualityLinks: [] },
      // Documentation Issues
      { id: "EX-006", type: "Documentation", supplier: "SecureComm Ltd", item: "PN-KEY-FILL", description: "Key Fill Device", poId: "PO-2026-0202", needDate: "2026-02-02", promiseDate: "2026-02-01", gapDays: -1, costImpactType: null, costImpact: null, owner: "Mike Chen", status: "New", age: 1, nextActionDate: "2026-02-03", program: "Tactical HF Radio", division: "Communications", impact: "High", notes: "Missing COMSEC certification", isScheduleControlling: true, qualityLinks: [] },
      { id: "EX-014", type: "Documentation", supplier: "AeroSupply Inc", item: "PN-HH-TX", description: "Handheld Transceiver PCB", poId: "PO-2026-0225", needDate: "2026-02-06", promiseDate: "2026-02-09", gapDays: 3, costImpactType: null, costImpact: null, owner: "John Smith", status: "Investigating", age: 4, nextActionDate: "2026-02-05", program: "Portable Comm System", division: "Defense Electronics", impact: "Medium", notes: "Test reports not included", isScheduleControlling: false, qualityLinks: [] },
      // Engineering Changes
      { id: "EX-007", type: "Engineering Change", supplier: "Precision Parts Ltd", item: "PN-CDU-300", description: "Control Display Unit", poId: "PO-2026-0203", needDate: "2026-02-04", promiseDate: "2026-02-07", gapDays: 3, costImpactType: "Other", costImpact: 8900, owner: "Sarah Martinez", status: "Mitigation", age: 12, nextActionDate: "2026-02-06", program: "Tactical HF Radio", division: "Communications", impact: "Medium", notes: "Rev C required, Rev B on order", isScheduleControlling: false, qualityLinks: [] },
      { id: "EX-015", type: "Engineering Change", supplier: "ThermalTech Inc", item: "PN-COOL-50", description: "Cooling Fan Assembly", poId: "PO-2026-0234", needDate: "2026-02-05", promiseDate: "2026-02-08", gapDays: 3, costImpactType: null, costImpact: null, owner: "Mike Chen", status: "New", age: 2, nextActionDate: "2026-02-04", program: "Vehicle Mount System", division: "Defense Electronics", impact: "Low", notes: "Updated thermal spec pending", isScheduleControlling: false, qualityLinks: [] },
    ]

    return data.filter(row => {
      if (division !== "All" && row.division !== division) return false
      if (selectedPrograms.length > 0 && !selectedPrograms.includes(row.program)) return false
      if (selectedSuppliers.length > 0 && !selectedSuppliers.includes(row.supplier)) return false
      if (sourceMixSelectedSupplier && row.supplier !== sourceMixSelectedSupplier) return false
      if (exceptionStatusFilter.length > 0 && !exceptionStatusFilter.includes(row.status)) return false
      if (exceptionOwnerFilter.length > 0 && !exceptionOwnerFilter.includes(row.owner)) return false
      if (exceptionTypeFilter.length > 0 && !exceptionTypeFilter.includes(row.type)) return false
      if (exceptionAgeFilter === "> 7 days" && row.age <= 7) return false
      if (exceptionAgeFilter === "> 30 days" && row.age <= 30) return false
      if (exceptionScheduleControlling && !row.isScheduleControlling) return false
      return true
    })
  }, [division, selectedPrograms, selectedSuppliers, sourceMixSelectedSupplier, exceptionStatusFilter, exceptionOwnerFilter, exceptionTypeFilter, exceptionAgeFilter, exceptionScheduleControlling])

  // Schedule Blockers Data
  const blockerData = useMemo(() => {
    const data = [
      { deliveryRef: "DEL-2026-001", blockingItem: "PN-RF-001", description: "RF Amplifier Module", supplier: "AeroSupply Inc", needDate: "2026-01-15", promiseDate: "2026-01-20", gapDays: 5, impactArea: "Final Assembly", impactUnits: 24, daysAtRisk: 5, owner: "John Smith", program: "Manpack Radio Program", division: "Defense Electronics", mitigationPlan: "Expedite via air freight, partial ship accepted" },
      { deliveryRef: "DEL-2026-002", blockingItem: "PN-HF-TUNER", description: "HF Antenna Tuner", supplier: "SignalTech Inc", needDate: "2026-01-22", promiseDate: "2026-01-28", gapDays: 6, impactArea: "RF Testing", impactUnits: 15, daysAtRisk: 6, owner: "Mike Chen", program: "Tactical HF Radio", division: "Communications", mitigationPlan: "Alternate supplier qualification in progress" },
      { deliveryRef: "DEL-2026-003", blockingItem: "PN-MTG-100", description: "Mounting Bracket Assembly", supplier: "MechParts Co", needDate: "2026-01-28", promiseDate: "2026-02-02", gapDays: 5, impactArea: "Mechanical Assembly", impactUnits: 60, daysAtRisk: 5, owner: "David Chen", program: "Vehicle Mount System", division: "Defense Electronics", mitigationPlan: "Split lot - 30 units shipping early" },
      { deliveryRef: "DEL-2026-004", blockingItem: "PN-PCB-450", description: "Main PCB Assembly", supplier: "Precision Parts Ltd", needDate: "2026-01-18", promiseDate: "2026-01-22", gapDays: 4, impactArea: "SMT Line", impactUnits: 36, daysAtRisk: 4, owner: "Sarah Martinez", program: "Manpack Radio Program", division: "Defense Electronics", mitigationPlan: "Overtime authorized for catch-up" },
      { deliveryRef: "DEL-2026-005", blockingItem: "PN-NIC-201", description: "Fiber Optic NIC", supplier: "TechSource Ltd", needDate: "2026-01-27", promiseDate: "2026-01-30", gapDays: 3, impactArea: "System Integration", impactUnits: 20, daysAtRisk: 3, owner: "David Chen", program: "Base Station Program", division: "Communications", mitigationPlan: "Buffer stock available for 10 units" },
      { deliveryRef: "DEL-2026-006", blockingItem: "PN-DSP-100", description: "DSP Chip Set", supplier: "ElectroComponents", needDate: "2026-01-20", promiseDate: "2026-01-23", gapDays: 3, impactArea: "PCB Assembly", impactUnits: 100, daysAtRisk: 3, owner: "Mike Chen", program: "Manpack Radio Program", division: "Defense Electronics", mitigationPlan: "Premium freight approved" },
      { deliveryRef: "DEL-2026-007", blockingItem: "PN-HH-TX", description: "Handheld Transceiver PCB", supplier: "AeroSupply Inc", needDate: "2026-02-06", promiseDate: "2026-02-09", gapDays: 3, impactArea: "Final Assembly", impactUnits: 50, daysAtRisk: 3, owner: "John Smith", program: "Portable Comm System", division: "Defense Electronics", mitigationPlan: "Supplier adding 2nd shift" },
      { deliveryRef: "DEL-2026-008", blockingItem: "PN-HF-AMP", description: "HF Power Amplifier", supplier: "SignalTech Inc", needDate: "2026-01-25", promiseDate: "2026-01-30", gapDays: 5, impactArea: "RF Integration", impactUnits: 15, daysAtRisk: 5, owner: "John Smith", program: "Tactical HF Radio", division: "Communications", mitigationPlan: "Sub-tier expedite in progress" },
    ]

    return data.filter(row => {
      if (division !== "All" && row.division !== division) return false
      if (selectedPrograms.length > 0 && !selectedPrograms.includes(row.program)) return false
      if (selectedSuppliers.length > 0 && !selectedSuppliers.includes(row.supplier)) return false
      if (activeSupplier && row.supplier !== activeSupplier) return false
      return true
    })
  }, [division, selectedPrograms, selectedSuppliers, activeSupplier])

  const blockerKPIs = useMemo(() => ({
    deliveriesAtRisk: blockerData.length,
    blockingItems: blockerData.length,
    earliestNeedDate: blockerData.length > 0 ? blockerData.sort((a, b) => new Date(a.needDate).getTime() - new Date(b.needDate).getTime())[0].needDate : "N/A",
  }), [blockerData])

  // Items list for Source Mix dropdown
  const sourceMixItems = useMemo(() => [
    { item: "PN-RF-001", description: "RF Amplifier Module", program: "Manpack Radio Program" },
    { item: "PN-PCB-450", description: "Main PCB Assembly", program: "Manpack Radio Program" },
    { item: "PN-DSP-100", description: "DSP Chip Set", program: "Manpack Radio Program" },
    { item: "PN-PWR-AMP", description: "Power Amplifier 100W", program: "Vehicle Mount System" },
    { item: "PN-MTG-100", description: "Mounting Bracket Assembly", program: "Vehicle Mount System" },
    { item: "PN-HF-TUNER", description: "HF Antenna Tuner", program: "Tactical HF Radio" },
    { item: "PN-CRYPTO", description: "Type 1 Crypto Module", program: "Tactical HF Radio" },
    { item: "PN-NIC-200", description: "Network Interface Card", program: "Base Station Program" },
    { item: "PN-HH-TX", description: "Handheld Transceiver PCB", program: "Portable Comm System" },
  ].filter(i => selectedPrograms.length === 0 || selectedPrograms.includes(i.program)), [selectedPrograms])

  // Source Mix Chart Data - supplier share over time for selected item
  const sourceMixChartData = useMemo(() => {
    if (!sourceMixItem) return []
    
    // Generate supplier mix data over 6 months for the selected item
    const months = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan"]
    const itemSeed = sourceMixItem.charCodeAt(3) + sourceMixItem.charCodeAt(4)
    
    // Determine which suppliers provide this item (2-3 suppliers typically)
    const primarySupplier = SUPPLIERS[itemSeed % SUPPLIERS.length]
    const secondarySupplier = SUPPLIERS[(itemSeed + 3) % SUPPLIERS.length]
    const tertiarySupplier = SUPPLIERS[(itemSeed + 6) % SUPPLIERS.length]
    
    // Simulate a sourcing transition around month 3-4
    const transitionMonth = 3
    
    return months.map((month, idx) => {
      let primary: number, secondary: number, tertiary: number
      
      if (idx < transitionMonth) {
        // Before transition: primary supplier dominates
        primary = 65 + (idx * 2) + (itemSeed % 10)
        secondary = 25 - idx + (itemSeed % 5)
        tertiary = 100 - primary - secondary
      } else {
        // After transition: secondary supplier grows, primary declines
        const transitionProgress = idx - transitionMonth
        primary = 55 - (transitionProgress * 10) + (itemSeed % 5)
        secondary = 35 + (transitionProgress * 8) + (itemSeed % 5)
        tertiary = 100 - primary - secondary
      }
      
      // Convert to spend or quantity
      const baseSpend = 50000 + (itemSeed % 30) * 1000
      const baseQty = 50 + (itemSeed % 50)
      
      return {
        month,
        [primarySupplier]: sourceMixViewBy === "spend" ? Math.round(primary * baseSpend / 100) : Math.round(primary * baseQty / 100),
        [secondarySupplier]: sourceMixViewBy === "spend" ? Math.round(secondary * baseSpend / 100) : Math.round(secondary * baseQty / 100),
        [tertiarySupplier]: sourceMixViewBy === "spend" ? Math.round(tertiary * baseSpend / 100) : Math.round(tertiary * baseQty / 100),
        primarySupplier,
        secondarySupplier,
        tertiarySupplier,
        isTransition: idx === transitionMonth,
        primaryPct: primary,
        secondaryPct: secondary,
        tertiaryPct: tertiary,
      }
    })
  }, [sourceMixItem, sourceMixViewBy])

  // Before/After metrics for sourcing transition
  const sourceMixBeforeAfter = useMemo(() => {
    if (!sourceMixItem || sourceMixChartData.length === 0) return null
    
    const itemSeed = sourceMixItem.charCodeAt(3) + sourceMixItem.charCodeAt(4)
    
    return {
      before: {
        avgUnitPrice: 125 + (itemSeed % 50),
        otd: 82 + (itemSeed % 10),
        rejectRate: 2.5 + (itemSeed % 20) * 0.1,
        expedite: 3500 + (itemSeed % 20) * 100,
      },
      after: {
        avgUnitPrice: 118 + (itemSeed % 45), // Usually lower after transition
        otd: 88 + (itemSeed % 8), // Usually better after transition
        rejectRate: 1.8 + (itemSeed % 15) * 0.1,
        expedite: 2200 + (itemSeed % 15) * 100,
      },
    }
  }, [sourceMixItem, sourceMixChartData])

  const openDrawer = (data: any, type: "po" | "exception" | "blocker") => {
    setDrawerData(data)
    setDrawerType(type)
    setDrawerTab("summary")
    setDrawerOpen(true)
    setBreadcrumb(prev => ({ ...prev, item: data.poId || data.id || data.deliveryRef }))
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
  }

  const KPITile = ({ label, value, tooltip, variant }: { label: string; value: string | number; tooltip: string; variant?: "positive" | "negative" | "neutral" }) => (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex-1">
      <div className="flex items-center gap-1 mb-1">
        <span className="text-xs text-slate-500 font-medium">{label}</span>
        <div className="relative group">
          <Info className="w-3 h-3 text-slate-400 cursor-help" />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
            {tooltip}
          </div>
        </div>
      </div>
      <div className={`text-lg font-bold ${variant === "positive" ? "text-green-600" : variant === "negative" ? "text-red-600" : "text-slate-900"}`}>
        {typeof value === "number" ? formatCurrency(value) : value}
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* TOP HEADER */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 sticky top-0 z-20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Material Monitoring</h1>
            <p className="text-sm text-slate-500">Track material spend vs plan/forecast and manage late/at-risk supply items.</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Division</label>
              <Select value={division} onValueChange={setDivision}>
                <SelectTrigger className="w-[160px] h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Divisions</SelectItem>
                  {DIVISIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Program</label>
              <Select value={selectedPrograms.length > 0 ? selectedPrograms[0] : "all"} onValueChange={(v) => setSelectedPrograms(v === "all" ? [] : [v])}>
                <SelectTrigger className="w-[180px] h-8 text-sm">
                  <SelectValue placeholder="All Programs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  {PROGRAMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Supplier</label>
              <Select value={selectedSuppliers.length > 0 ? selectedSuppliers[0] : "all"} onValueChange={(v) => setSelectedSuppliers(v === "all" ? [] : [v])}>
                <SelectTrigger className="w-[160px] h-8 text-sm">
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {SUPPLIERS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Period</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[120px] h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {periodOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={handleReset} className="bg-transparent">Reset Page</Button>
              <Button variant="outline" size="sm" onClick={handleClearSelection} className="bg-transparent">Clear Selection</Button>
            </div>
          </div>
        </div>
        {/* Breadcrumb */}
        {(breadcrumb.supplier || breadcrumb.tab || breadcrumb.item || breadcrumb.period) && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              Selected: {breadcrumb.supplier && `Supplier=${breadcrumb.supplier}`} {breadcrumb.tab && `| Tab=${breadcrumb.tab}`} {breadcrumb.item && `| Item=${breadcrumb.item}`} {breadcrumb.period && `| Period=${breadcrumb.period}`}
            </span>
          </div>
        )}
      </div>

      {/* CONTROL STRIP */}
      <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1 bg-white rounded-md border border-slate-200 p-0.5">
          {(["Month", "Quarter", "Year"] as const).map(pt => (
            <button
              key={pt}
              onClick={() => setPeriodType(pt)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${periodType === pt ? "bg-[#8B0000] text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {pt}
            </button>
          ))}
        </div>
        <Select value={selectedPeriod} onValueChange={(v) => { setSelectedPeriod(v); setBreadcrumb(prev => ({ ...prev, period: v })) }}>
          <SelectTrigger className="w-[130px] h-8 text-sm bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            {periodOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={forecastVersion} onValueChange={setForecastVersion}>
          <SelectTrigger className="w-[130px] h-8 text-sm bg-white"><SelectValue placeholder="Forecast Version" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="V3.2">Forecast V3.2</SelectItem>
            <SelectItem value="V3.1">Forecast V3.1</SelectItem>
            <SelectItem value="V3.0">Forecast V3.0</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-xs text-slate-500">Data refreshed through: <span className="font-medium">Jan 28, 2026</span></div>
        <div className="text-xs text-slate-500">Working days complete: <span className="font-medium">18/22</span></div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-slate-600">Focus on schedule-controlling items</span>
          <div className="relative group">
            <Info className="w-3 h-3 text-slate-400 cursor-help" />
            <div className="absolute bottom-full right-0 mb-1 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
              When ON, views show only items flagged as driving delivery/schedule risk.
            </div>
          </div>
          <Switch checked={focusScheduleControlling} onCheckedChange={setFocusScheduleControlling} />
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: Material Cost Monitoring */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">Material Cost Monitoring</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={costTimeSeriesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend
                    formatter={(value) => (
                      <span className="text-xs">
                        {value}
                        {value === "plan" && (
                          <span className="ml-1 text-slate-400 cursor-help" title="Plan = baseline budget/operating plan target for the selected period.">
                            (i)
                          </span>
                        )}
                      </span>
                    )}
                  />
                  <ReferenceLine x="Jun" stroke="#94a3b8" strokeDasharray="5 5" label={{ value: "Today", position: "top", fontSize: 10, fill: "#64748b" }} />
                  <Line type="monotone" dataKey="actual" stroke="#1D4ED8" strokeWidth={2} dot={{ r: 3 }} name="Actual" connectNulls={false} />
                  <Line type="monotone" dataKey="forecast" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} name="Forecast" strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="plan" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} name="Plan" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-3 mt-4">
              <KPITile label="Actuals" value={kpiData.actuals} tooltip="Posted material cost in the selected window." />
              <KPITile label="Projected" value={kpiData.projected} tooltip="Expected material cost for the full selected window." />
              <KPITile label="Variance" value={kpiData.variance} tooltip="Projected minus Plan." variant={kpiData.variance > 0 ? "negative" : "positive"} />
              <KPITile label="Plan" value={kpiData.plan} tooltip="Baseline target for the selected window." />
            </div>

            {/* Variance Drivers Section */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-900">Variance Drivers</h4>
                  <div className="relative group">
                    <Info className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                    <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs bg-slate-900 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Variance = Projected - Plan. Drivers allocate that difference into price, scrap/attrition, expedite, mix/volume, and other (if available).
                    </div>
                  </div>
                  {selectedDriver && (
                    <Badge variant="secondary" className="ml-2">Driver = {selectedDriver}</Badge>
                  )}
                </div>
                {selectedDriver && (
                  <Button variant="link" size="sm" className="text-xs h-auto p-0 text-slate-500" onClick={() => setSelectedDriver(null)}>
                    Clear driver selection
                  </Button>
                )}
              </div>

              {/* Waterfall Chart - Driver bars only */}
              <div className="mb-4">
                <p className="text-xs text-slate-500 mb-2">Projected vs Plan: What's driving the variance? <span className="text-slate-400">(Total: {formatCurrency(varianceDriverData.totalVariance)})</span></p>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={varianceDriverData.drivers}
                      margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                      <YAxis tickFormatter={(v) => `$${(Math.abs(v) / 1000).toFixed(0)}K`} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="bg-white border border-slate-200 rounded-md shadow-lg p-2 text-xs">
                                <p className="font-medium text-slate-900">{data.name}</p>
                                <p className="text-slate-600">
                                  Contribution: {data.value > 0 ? "+" : ""}{formatCurrency(data.value)}
                                </p>
                                {data.pctOfVariance !== undefined && (
                                  <p className="text-slate-500">{data.pctOfVariance}% of total variance</p>
                                )}
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar
                        dataKey="value"
                        radius={[4, 4, 0, 0]}
                        cursor="pointer"
                        onClick={(data) => {
                          if (varianceDriverData.hasDrivers) {
                            setSelectedDriver(data.name)
                          }
                        }}
                      >
                        {varianceDriverData.drivers.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.value > 0 ? "#EF4444" : "#10B981"}
                            opacity={selectedDriver && entry.name !== selectedDriver ? 0.3 : 1}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Mini Table - Top Contributors */}
              <div>
                <p className="text-xs font-medium text-slate-700 mb-2">Top Contributors</p>
                <div className="border border-slate-200 rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-xs py-2 h-auto">Driver</TableHead>
                        <TableHead className="text-xs py-2 h-auto text-right">Contribution $</TableHead>
                        <TableHead className="text-xs py-2 h-auto text-right">Contribution %</TableHead>
                        <TableHead className="text-xs py-2 h-auto text-center">Trend</TableHead>
                        <TableHead className="text-xs py-2 h-auto text-center w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {varianceDriverData.drivers
                        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
                        .map((driver, idx) => (
                          <TableRow
                            key={driver.name}
                            className={`cursor-pointer hover:bg-slate-50 ${selectedDriver === driver.name ? "bg-blue-50" : ""}`}
                            onClick={() => {
                              if (varianceDriverData.hasDrivers) {
                                setSelectedDriver(driver.name)
                              }
                            }}
                          >
                            <TableCell className="text-xs py-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${driver.value > 0 ? "bg-red-500" : "bg-green-500"}`} />
                                {driver.name}
                              </div>
                            </TableCell>
                            <TableCell className={`text-xs py-2 text-right font-medium ${driver.value > 0 ? "text-red-600" : "text-green-600"}`}>
                              {driver.value > 0 ? "+" : ""}{formatCurrency(driver.value)}
                            </TableCell>
                            <TableCell className="text-xs py-2 text-right">{driver.pctOfVariance}%</TableCell>
                            <TableCell className="text-xs py-2 text-center">
                              {/* Mini sparkline */}
                              <div className="flex items-center justify-center gap-0.5">
                                {[...Array(6)].map((_, i) => (
                                  <div
                                    key={i}
                                    className={`w-1 ${driver.value > 0 ? "bg-red-400" : "bg-green-400"}`}
                                    style={{ height: `${8 + Math.sin(i + idx) * 6}px` }}
                                  />
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs py-2 text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setNotesModalDriver(driver.name)
                                  setNotesModalOpen(true)
                                }}
                                className="text-slate-400 hover:text-slate-600"
                                title="View notes"
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
                {!varianceDriverData.hasDrivers && (
                  <p className="text-xs text-slate-400 mt-2 text-center">Driver breakdown not available for current selection.</p>
                )}
              </div>
            </div>

            {/* Notes Modal */}
            {notesModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-900">Notes: {notesModalDriver}</h3>
                    <button onClick={() => setNotesModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="border border-slate-200 rounded-md p-3 min-h-[100px] text-xs text-slate-600">
                    <p className="text-slate-400 italic">No notes available for this driver.</p>
                  </div>
                  <div className="flex justify-end mt-3">
                    <Button size="sm" variant="outline" onClick={() => setNotesModalOpen(false)}>Close</Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RIGHT: Outstanding PO Exposure + Supplier Performance */}
        <div className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-900">Outstanding PO Exposure</CardTitle>
                {(selectedChartSupplier || selectedChartProgram) && (
                  <Button variant="link" size="sm" className="text-xs h-auto p-0 text-slate-500" onClick={() => { setSelectedChartSupplier(null); setSelectedChartProgram(null); setBreadcrumb(prev => ({ ...prev, supplier: undefined })) }}>
                    Clear Supplier/Program Selection
                  </Button>
                )}
              </div>
              {selectedChartSupplier && <Badge variant="secondary" className="mt-1">{selectedChartSupplier}</Badge>}
              {selectedChartProgram && <Badge variant="secondary" className="mt-1 ml-1">{selectedChartProgram}</Badge>}
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-2">By Supplier</p>
                <div className="h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={poBySupplierData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                      <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="supplier" tick={{ fontSize: 10 }} width={100} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar
                        dataKey="amount"
                        fill="#8B0000"
                        radius={[0, 4, 4, 0]}
                        cursor="pointer"
                        onClick={(data) => { setSelectedChartSupplier(data.fullName); setBreadcrumb(prev => ({ ...prev, supplier: data.fullName })) }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-2">By Program</p>
                <div className="h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={poByProgramData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                      <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="program" tick={{ fontSize: 10 }} width={120} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar
                        dataKey="amount"
                        fill="#1D4ED8"
                        radius={[0, 4, 4, 0]}
                        cursor="pointer"
                        onClick={(data) => { setSelectedChartProgram(data.fullName); setBreadcrumb(prev => ({ ...prev, supplier: data.fullName })) }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-900">Supplier Performance</CardTitle>
                {activeSupplier && <Badge variant="secondary">{activeSupplier}</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              {!activeSupplier ? (
                <div className="text-center py-8 text-slate-400 text-sm">Select a supplier from the header filter or click a supplier bar above to view performance.</div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    <KPITile label="On-time Delivery %" value={`${supplierPerfData?.otd}%`} tooltip="% of receipts arriving on/before need date within the selected window." variant={supplierPerfData && supplierPerfData.otd >= 90 ? "positive" : supplierPerfData && supplierPerfData.otd >= 80 ? "neutral" : "negative"} />
                    <KPITile label="Promise Changes" value={`${supplierPerfData?.promiseChanges || 0} PO lines`} tooltip="Count of how many times the supplier updated the promise date on open PO lines in the selected window." />
                    <KPITile label="Reject/RTV Rate" value={`${supplierPerfData?.rejectRate.toFixed(1)}%`} tooltip="% of receipts rejected/returned within the selected window." variant={supplierPerfData && supplierPerfData.rejectRate <= 2 ? "positive" : "negative"} />
                    <KPITile label="Expedite $" value={supplierPerfData?.expediteCost || 0} tooltip="Costs tied to expediting or premium freight in scope (if available)." />
                  </div>
                  <div className="flex items-center gap-1 bg-slate-50 rounded-md border border-slate-200 p-0.5 w-fit">
                    {(["otd", "promise", "reject", "expedite"] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setSupplierPerfTab(tab)}
                        className={`px-3 py-1 text-xs font-medium rounded transition-colors ${supplierPerfTab === tab ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        {tab === "otd" ? "OTD Trend" : tab === "promise" ? "Promise Volatility" : tab === "reject" ? "Reject Trend" : "Expedite Trend"}
                      </button>
                    ))}
                  </div>
                  <div className="h-[80px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={supplierTrendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <XAxis dataKey="month" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                        <YAxis 
                          tick={{ fontSize: 9 }} 
                          stroke="#94a3b8" 
                          domain={supplierPerfTab === "otd" ? [60, 100] : supplierPerfTab === "promise" ? [0, 15] : supplierPerfTab === "reject" ? [0, 5] : ["auto", "auto"]}
                          tickFormatter={(v) => supplierPerfTab === "reject" ? `${v}%` : supplierPerfTab === "expedite" ? `$${(v / 1000).toFixed(0)}K` : v}
                        />
                        <Tooltip 
                          formatter={(value: number) => supplierPerfTab === "otd" ? `${value}%` : supplierPerfTab === "reject" ? `${value.toFixed(1)}%` : supplierPerfTab === "expedite" ? formatCurrency(value) : `${value} PO lines`}
                          labelFormatter={(label) => `Month: ${label}`}
                        />
                        <Line 
                          type="monotone" 
                          dataKey={supplierPerfTab === "otd" ? "otd" : supplierPerfTab === "promise" ? "promise" : supplierPerfTab === "reject" ? "reject" : "expedite"} 
                          stroke={supplierPerfTab === "otd" ? "#10B981" : supplierPerfTab === "promise" ? "#F59E0B" : supplierPerfTab === "reject" ? "#EF4444" : "#8B5CF6"} 
                          strokeWidth={2} 
                          dot={{ r: 3 }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Supplier / Source Mix Panel - Collapsible */}
          <Card className="border-slate-200">
            <button
              onClick={() => setSourceMixExpanded(!sourceMixExpanded)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold text-slate-900">Supplier / Source Mix</CardTitle>
                {sourceMixSelectedSupplier && <Badge variant="secondary">{sourceMixSelectedSupplier}</Badge>}
              </div>
              {sourceMixExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>
            {sourceMixExpanded && (
              <CardContent className="pt-0 space-y-4">
                {/* Selector Row */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-slate-400" />
                    <Select value={sourceMixItem || ""} onValueChange={(v) => { setSourceMixItem(v); setBreadcrumb(prev => ({ ...prev, item: v })) }}>
                      <SelectTrigger className="w-[200px] h-8 text-xs">
                        <SelectValue placeholder="Select Part / Item" />
                      </SelectTrigger>
                      <SelectContent>
                        {sourceMixItems.map(item => (
                          <SelectItem key={item.item} value={item.item}>
                            <span className="font-medium">{item.item}</span>
                            <span className="text-slate-400 ml-2">{item.description}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5">
                    <button
                      onClick={() => setSourceMixViewBy("spend")}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors ${sourceMixViewBy === "spend" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      Spend
                    </button>
                    <button
                      onClick={() => setSourceMixViewBy("quantity")}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors ${sourceMixViewBy === "quantity" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      Quantity
                    </button>
                  </div>
                  {sourceMixSelectedSupplier && (
                    <Button variant="link" size="sm" className="text-xs h-auto p-0 text-slate-500 ml-auto" onClick={() => setSourceMixSelectedSupplier(null)}>
                      Clear selection
                    </Button>
                  )}
                </div>

                {!sourceMixItem ? (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    Select a part/item above to view supplier source mix over time.
                  </div>
                ) : sourceMixChartData.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    Source mix requires supplier attribution by item over time.
                  </div>
                ) : (
                  <>
                    {/* Stacked Area Chart */}
                    <div className="h-[160px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sourceMixChartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                          <YAxis tickFormatter={(v) => sourceMixViewBy === "spend" ? `$${(v / 1000).toFixed(0)}K` : v} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload
                                return (
                                  <div className="bg-white border border-slate-200 rounded-md shadow-lg p-2 text-xs">
                                    <p className="font-medium text-slate-900 mb-1">{label} {data.isTransition && <Badge variant="outline" className="ml-1 text-[10px]">Transition</Badge>}</p>
                                    {payload.map((entry: any, idx: number) => (
                                      <p key={idx} className="text-slate-600">
                                        <span style={{ color: entry.color }}>{entry.name}:</span> {sourceMixViewBy === "spend" ? formatCurrency(entry.value) : entry.value}
                                      </p>
                                    ))}
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey={sourceMixChartData[0]?.primarySupplier}
                            stackId="1"
                            stroke="#8B0000"
                            fill="#8B0000"
                            fillOpacity={sourceMixSelectedSupplier && sourceMixSelectedSupplier !== sourceMixChartData[0]?.primarySupplier ? 0.2 : 0.8}
                            cursor="pointer"
                            onClick={() => setSourceMixSelectedSupplier(sourceMixChartData[0]?.primarySupplier)}
                          />
                          <Area
                            type="monotone"
                            dataKey={sourceMixChartData[0]?.secondarySupplier}
                            stackId="1"
                            stroke="#1D4ED8"
                            fill="#1D4ED8"
                            fillOpacity={sourceMixSelectedSupplier && sourceMixSelectedSupplier !== sourceMixChartData[0]?.secondarySupplier ? 0.2 : 0.8}
                            cursor="pointer"
                            onClick={() => setSourceMixSelectedSupplier(sourceMixChartData[0]?.secondarySupplier)}
                          />
                          <Area
                            type="monotone"
                            dataKey={sourceMixChartData[0]?.tertiarySupplier}
                            stackId="1"
                            stroke="#10B981"
                            fill="#10B981"
                            fillOpacity={sourceMixSelectedSupplier && sourceMixSelectedSupplier !== sourceMixChartData[0]?.tertiarySupplier ? 0.2 : 0.8}
                            cursor="pointer"
                            onClick={() => setSourceMixSelectedSupplier(sourceMixChartData[0]?.tertiarySupplier)}
                          />
                          {/* Transition marker */}
                          <ReferenceLine x="Nov" stroke="#F59E0B" strokeDasharray="5 5" label={{ value: "Transition", fontSize: 9, fill: "#F59E0B" }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Before vs After Comparison Strip */}
                    {sourceMixBeforeAfter && (
                      <div className="border border-slate-200 rounded-lg p-3">
                        <p className="text-xs font-medium text-slate-700 mb-2">Before vs After Transition</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <p className="text-xs text-slate-500 font-medium">Before (Aug-Oct)</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="bg-slate-50 rounded p-2">
                                <span className="text-slate-500">Avg Unit Price</span>
                                <p className="font-medium">${sourceMixBeforeAfter.before.avgUnitPrice}</p>
                              </div>
                              <div className="bg-slate-50 rounded p-2">
                                <span className="text-slate-500">OTD %</span>
                                <p className="font-medium">{sourceMixBeforeAfter.before.otd}%</p>
                              </div>
                              <div className="bg-slate-50 rounded p-2">
                                <span className="text-slate-500">Reject Rate</span>
                                <p className="font-medium">{sourceMixBeforeAfter.before.rejectRate.toFixed(1)}%</p>
                              </div>
                              <div className="bg-slate-50 rounded p-2">
                                <span className="text-slate-500">Expedite $</span>
                                <p className="font-medium">${sourceMixBeforeAfter.before.expedite.toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs text-slate-500 font-medium">After (Nov-Jan)</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="bg-green-50 rounded p-2">
                                <span className="text-slate-500">Avg Unit Price</span>
                                <p className="font-medium text-green-700">${sourceMixBeforeAfter.after.avgUnitPrice}</p>
                              </div>
                              <div className="bg-green-50 rounded p-2">
                                <span className="text-slate-500">OTD %</span>
                                <p className="font-medium text-green-700">{sourceMixBeforeAfter.after.otd}%</p>
                              </div>
                              <div className="bg-green-50 rounded p-2">
                                <span className="text-slate-500">Reject Rate</span>
                                <p className="font-medium text-green-700">{sourceMixBeforeAfter.after.rejectRate.toFixed(1)}%</p>
                              </div>
                              <div className="bg-green-50 rounded p-2">
                                <span className="text-slate-500">Expedite $</span>
                                <p className="font-medium text-green-700">${sourceMixBeforeAfter.after.expedite.toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      {/* BOTTOM SECTION: PO Detail & Exceptions */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-900">PO Detail & Exceptions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={bottomTab} onValueChange={(v) => { setBottomTab(v); setBreadcrumb(prev => ({ ...prev, tab: v })) }}>
            <div className="border-b border-slate-200 px-4">
              <TabsList className="bg-transparent h-auto p-0 gap-0">
                <TabsTrigger value="late" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#8B0000] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 text-sm">Late</TabsTrigger>
                <TabsTrigger value="future" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#8B0000] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 text-sm">Future</TabsTrigger>
                <TabsTrigger value="ondock" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#8B0000] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 text-sm">On Dock</TabsTrigger>
                <TabsTrigger value="exceptions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#8B0000] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 text-sm">Exceptions</TabsTrigger>
                <TabsTrigger value="blockers" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#8B0000] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 text-sm">Schedule Blockers</TabsTrigger>
              </TabsList>
            </div>

            {/* Late / Future / On Dock Tables */}
            {(["late", "future", "ondock"] as const).map(tabKey => (
              <TabsContent key={tabKey} value={tabKey} className="m-0">
                <div className="max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow className="border-b border-slate-200">
                        <TableHead className="text-xs font-semibold text-slate-600">Supplier</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">PO ID</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Item/Part</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Need Date</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Promise Date</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">
                          <div className="flex items-center gap-1">
                            Gap Days
                            <div className="relative group">
                              <Info className="w-3 h-3 text-slate-400 cursor-help" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                                Gap Days = Promise Date - Need Date (days). Negative means late.
                              </div>
                            </div>
                          </div>
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Amount</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Status</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 w-10">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {generatePOData(tabKey).map((row, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-50 cursor-pointer" onClick={() => openDrawer(row, "po")}>
                          <TableCell className="text-sm">{row.supplier}</TableCell>
                          <TableCell className="text-sm font-medium text-[#1D4ED8]">{row.poId}</TableCell>
                          <TableCell className="text-sm">{row.item}</TableCell>
                          <TableCell className="text-sm">{row.needDate}</TableCell>
                          <TableCell className="text-sm">{row.promiseDate}</TableCell>
                          <TableCell className={`text-sm font-medium ${row.gapDays > 0 ? "text-red-600" : "text-slate-900"}`}>{row.gapDays}</TableCell>
                          <TableCell className="text-sm">{formatCurrency(row.amount)}</TableCell>
                          <TableCell><Badge variant={row.status === "Late" || row.status === "At Risk" ? "destructive" : "secondary"} className="text-xs">{row.status}</Badge></TableCell>
                          <TableCell><FileText className="w-4 h-4 text-slate-400 hover:text-slate-600" /></TableCell>
                        </TableRow>
                      ))}
                      {generatePOData(tabKey).length === 0 && (
                        <TableRow><TableCell colSpan={9} className="text-center py-8 text-slate-400">No data matching current filters</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            ))}

            {/* Exceptions Tab */}
            <TabsContent value="exceptions" className="m-0">
              <div className="p-4 border-b border-slate-100 flex items-center gap-3 flex-wrap">
                <Select value={exceptionStatusFilter.length > 0 ? exceptionStatusFilter[0] : "all"} onValueChange={(v) => setExceptionStatusFilter(v === "all" ? [] : [v])}>
                  <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Investigating">Investigating</SelectItem>
                    <SelectItem value="Mitigation">Mitigation</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={exceptionOwnerFilter.length > 0 ? exceptionOwnerFilter[0] : "all"} onValueChange={(v) => setExceptionOwnerFilter(v === "all" ? [] : [v])}>
                  <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Owner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Owners</SelectItem>
                    <SelectItem value="John Smith">John Smith</SelectItem>
                    <SelectItem value="Sarah Martinez">Sarah Martinez</SelectItem>
                    <SelectItem value="Mike Chen">Mike Chen</SelectItem>
                    <SelectItem value="David Chen">David Chen</SelectItem>
                    <SelectItem value="Lisa Park">Lisa Park</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={exceptionTypeFilter.length > 0 ? exceptionTypeFilter[0] : "all"} onValueChange={(v) => setExceptionTypeFilter(v === "all" ? [] : [v])}>
                  <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Exception Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Delivery Delay">Delivery Delay</SelectItem>
                    <SelectItem value="Quality Issue">Quality Issue</SelectItem>
                    <SelectItem value="Price Variance">Price Variance</SelectItem>
                    <SelectItem value="Quantity Short">Quantity Short</SelectItem>
                    <SelectItem value="Documentation">Documentation</SelectItem>
                    <SelectItem value="Engineering Change">Engineering Change</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={exceptionAgeFilter} onValueChange={setExceptionAgeFilter}>
                  <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Age" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Ages</SelectItem>
                    <SelectItem value="> 7 days">{"> 7 days"}</SelectItem>
                    <SelectItem value="> 30 days">{"> 30 days"}</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                  <Switch
                    id="schedule-controlling"
                    checked={exceptionScheduleControlling}
                    onCheckedChange={setExceptionScheduleControlling}
                    className="data-[state=checked]:bg-[#8B0000]"
                  />
                  <label htmlFor="schedule-controlling" className="text-xs text-slate-600 cursor-pointer">Schedule-controlling only</label>
                </div>
                <Button variant="outline" size="sm" className="ml-auto h-8 text-xs bg-transparent">
                  <Download className="w-3 h-3 mr-1" /> Export CSV
                </Button>
              </div>
              <div className="max-h-[350px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow className="border-b border-slate-200">
                      <TableHead className="text-xs font-semibold text-slate-600">Exception Type</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">Supplier</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">Item/Part</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">Related PO</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">Need Date</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">Promise Date</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">Gap Days</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">
                        <div className="flex items-center gap-1">
                          Cost Impact Type
                          <div className="relative group">
                            <Info className="w-3 h-3 text-slate-400 cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                              Price / Scrap / Expedite / Other
                            </div>
                          </div>
                        </div>
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">Cost Impact $</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">Owner</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">Age</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">Next Action</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 w-10">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exceptionData.map((row, idx) => (
                      <TableRow
                        key={idx}
                        className={`hover:bg-slate-50 cursor-pointer ${row.status === "Resolved" ? "opacity-50" : ""}`}
                        onClick={() => {
                          openDrawer(row, "exception")
                          // Sync-highlight supplier in Outstanding PO chart
                          if (row.supplier) {
                            setSelectedChartSupplier(row.supplier)
                          }
                        }}
                      >
                        <TableCell><Badge variant="outline" className="text-xs">{row.type}</Badge></TableCell>
                        <TableCell className="text-sm text-[#8B0000] font-medium hover:underline">{row.supplier}</TableCell>
                        <TableCell className="text-sm">{row.item}</TableCell>
                        <TableCell className="text-sm text-[#1D4ED8] underline">{row.poId}</TableCell>
                        <TableCell className="text-sm">{row.needDate}</TableCell>
                        <TableCell className="text-sm">{row.promiseDate}</TableCell>
                        <TableCell className={`text-sm font-medium ${row.gapDays > 0 ? "text-red-600" : "text-slate-900"}`}>{row.gapDays}</TableCell>
                        <TableCell>
                          {row.costImpactType ? (
                            <Badge variant="outline" className={`text-xs ${row.costImpactType === "Price" ? "bg-purple-50 text-purple-700 border-purple-200" : row.costImpactType === "Scrap" ? "bg-red-50 text-red-700 border-red-200" : row.costImpactType === "Expedite" ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-slate-50 text-slate-700 border-slate-200"}`}>
                              {row.costImpactType}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400 relative group cursor-help">
                              N/A
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                                Requires tagged cost impact per exception.
                              </span>
                            </span>
                          )}
                        </TableCell>
                        <TableCell className={`text-sm font-medium ${row.costImpact ? "text-red-600" : "text-slate-400"}`}>
                          {row.costImpact ? formatCurrency(row.costImpact) : "N/A"}
                        </TableCell>
                        <TableCell className="text-sm">{row.owner}</TableCell>
                        <TableCell>
                          <Badge variant={row.status === "New" ? "default" : row.status === "Investigating" ? "secondary" : row.status === "Mitigation" ? "outline" : "secondary"} className={`text-xs ${row.status === "New" ? "bg-blue-100 text-blue-800" : row.status === "Investigating" ? "bg-yellow-100 text-yellow-800" : row.status === "Mitigation" ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800"}`}>
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{row.age}d</TableCell>
                        <TableCell className="text-sm">{row.nextActionDate}</TableCell>
                        <TableCell><FileText className="w-4 h-4 text-slate-400 hover:text-slate-600" /></TableCell>
                      </TableRow>
                    ))}
                    {exceptionData.length === 0 && (
                      <TableRow><TableCell colSpan={14} className="text-center py-8 text-slate-400">No exceptions matching current filters</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Schedule Blockers Tab */}
            <TabsContent value="blockers" className="m-0">
              <div className="p-4 border-b border-slate-100 flex items-center gap-4">
                <div className="flex gap-3">
                  <div className="bg-red-50 border border-red-200 rounded-md px-3 py-1.5">
                    <span className="text-xs text-red-600 font-medium">Deliveries at risk: {blockerKPIs.deliveriesAtRisk}</span>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-md px-3 py-1.5">
                    <span className="text-xs text-orange-600 font-medium">Blocking items: {blockerKPIs.blockingItems}</span>
                  </div>
                  <div className="bg-slate-100 border border-slate-200 rounded-md px-3 py-1.5">
                    <span className="text-xs text-slate-600 font-medium">Earliest need date at risk: {blockerKPIs.earliestNeedDate}</span>
                  </div>
                </div>
              </div>
              <div className="max-h-[350px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow className="border-b border-slate-200">
                      <TableHead className="text-xs font-semibold text-slate-600">Delivery / Demand Ref</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">Blocking Item/Part</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">Supplier</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">Need Date</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">Promise Date</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">Gap Days</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">Impact Area</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">Owner</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blockerData.map((row, idx) => (
                      <TableRow key={idx} className="hover:bg-slate-50 cursor-pointer" onClick={() => openDrawer(row, "blocker")}>
                        <TableCell className="text-sm font-medium text-[#1D4ED8]">{row.deliveryRef}</TableCell>
                        <TableCell className="text-sm">{row.blockingItem}</TableCell>
                        <TableCell className="text-sm">{row.supplier}</TableCell>
                        <TableCell className="text-sm">{row.needDate}</TableCell>
                        <TableCell className="text-sm">{row.promiseDate}</TableCell>
                        <TableCell className={`text-sm font-medium ${row.gapDays > 0 ? "text-red-600" : "text-slate-900"}`}>{row.gapDays}</TableCell>
                        <TableCell className="text-sm">{row.impactArea}</TableCell>
                        <TableCell className="text-sm">{row.owner}</TableCell>
                      </TableRow>
                    ))}
                    {blockerData.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-400">No schedule blockers matching current filters</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* RIGHT-SIDE DETAIL DRAWER */}
      {drawerOpen && drawerData && (
        <div className="fixed inset-y-0 right-0 w-[420px] bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">
              {drawerType === "po" ? "PO Details" : drawerType === "exception" ? "Exception Details" : "Blocker Details"}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setDrawerOpen(false)}><X className="w-4 h-4" /></Button>
          </div>
          <div className="border-b border-slate-200">
            <div className="flex">
              {(["summary", "dates", "financial", "quality", "actions"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setDrawerTab(tab)}
                  className={`flex-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${drawerTab === tab ? "border-[#8B0000] text-[#8B0000]" : "border-transparent text-slate-500 hover:text-slate-700"}`}
                >
                  {tab === "summary" ? "Summary" : tab === "dates" ? "Dates" : tab === "financial" ? "Financial" : tab === "quality" ? "Quality Links" : "Actions"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {drawerTab === "summary" && (
              <div className="space-y-3">
                {Object.entries(drawerData).filter(([key]) => !["program", "division", "config", "subassembly"].includes(key)).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="text-sm font-medium text-slate-900">{String(value)}</span>
                  </div>
                ))}
              </div>
            )}
            {drawerTab === "dates" && (
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-slate-700 mb-3">Timeline</h4>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full relative">
                      <div className="absolute left-0 top-0 h-2 bg-green-500 rounded-full" style={{ width: "30%" }} />
                      <div className="absolute left-[30%] top-0 h-2 bg-yellow-500 rounded-full" style={{ width: "40%" }} />
                      <div className="absolute left-[70%] top-0 h-2 bg-red-500 rounded-full" style={{ width: "30%" }} />
                    </div>
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-slate-500">
                    <span>Need: {drawerData.needDate}</span>
                    <span>Promise: {drawerData.promiseDate}</span>
                  </div>
                </div>
              </div>
            )}
            {drawerTab === "financial" && (
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-500">PO Amount</span>
                  <span className="text-sm font-medium text-slate-900">{drawerData.amount ? formatCurrency(drawerData.amount) : "N/A"}</span>
                </div>
                {drawerType === "exception" && (
                  <>
                    <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                      <h4 className="text-sm font-medium text-slate-700">Cost Impact Breakdown</h4>
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-500">Impact Type</span>
                        <span className="text-sm font-medium text-slate-900">
                          {drawerData.costImpactType ? (
                            <Badge variant="outline" className={`text-xs ${drawerData.costImpactType === "Price" ? "bg-purple-50 text-purple-700 border-purple-200" : drawerData.costImpactType === "Scrap" ? "bg-red-50 text-red-700 border-red-200" : drawerData.costImpactType === "Expedite" ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-slate-50 text-slate-700 border-slate-200"}`}>
                              {drawerData.costImpactType}
                            </Badge>
                          ) : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-500">Cost Impact $</span>
                        <span className={`text-sm font-medium ${drawerData.costImpact ? "text-red-600" : "text-slate-400"}`}>
                          {drawerData.costImpact ? formatCurrency(drawerData.costImpact) : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-sm text-slate-500">Schedule-controlling</span>
                        <Badge variant={drawerData.isScheduleControlling ? "destructive" : "secondary"} className="text-xs">
                          {drawerData.isScheduleControlling ? "Yes" : "No"}
                        </Badge>
                      </div>
                    </div>
                    {drawerData.costImpactType === "Expedite" && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-700">
                        <strong>Expedite cost includes:</strong> Premium freight, overtime, and air shipment surcharges. Contact procurement for detailed breakdown.
                      </div>
                    )}
                    {drawerData.costImpactType === "Scrap" && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
                        <strong>Scrap cost includes:</strong> Material value, labor, and disposal costs. Quality team may pursue supplier recovery.
                      </div>
                    )}
                    {drawerData.costImpactType === "Price" && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-700">
                        <strong>Price variance:</strong> Difference between contracted and invoiced price. May require change order approval.
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            {drawerTab === "quality" && (
              <div className="space-y-4">
                {drawerType === "exception" && drawerData.qualityLinks && drawerData.qualityLinks.length > 0 ? (
                  <>
                    <p className="text-sm text-slate-600">Linked quality records for this exception:</p>
                    <div className="space-y-2">
                      {drawerData.qualityLinks.map((link: string) => (
                        <div key={link} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                          <span className="text-sm font-medium text-[#1D4ED8]">{link}</span>
                          <Badge variant="outline" className="text-xs">
                            {link.startsWith("RTV") ? "Return to Vendor" : link.startsWith("NC") ? "Non-Conformance" : "Quality Record"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-slate-400 text-sm">No linked quality records.</div>
                )}
              </div>
            )}
            {drawerTab === "actions" && (
              <div className="space-y-4">
                <div className="text-sm text-slate-500">No actions recorded yet.</div>
                <Button variant="outline" size="sm" className="w-full bg-transparent">+ Add Action</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
