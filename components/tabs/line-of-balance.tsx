"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ReferenceLine, ComposedChart, Cell } from "recharts"
import { MajorSubassemblyDetails } from "@/components/major-subassembly-details"
import { MajorSubassembly } from "@/types/major-subassembly" // Import MajorSubassembly type

// Generate mock Line of Balance data
const programs = ["Manpack Radio Program", "Vehicle Mount System", "Tactical HF Radio", "Base Station Program"]
const projects = ["Phase 1 Production", "Phase 2 Development", "Upgrade Initiative", "Sustainment Support"]
const sites = ["Phoenix, AZ", "Dallas, TX", "San Diego, CA", "Denver, CO"]
const mrpStatuses = ["Planned", "Firm Planned", "Released", "In Progress", "Complete"]

interface LOBItem {
  id: string
  program: string
  projectName: string
  itemNumber: string
  itemDescription: string
  site: string
  mrpStatus: string
  allocatedQty: number
  supplyDate: Date
  demandQty: number
  demandDate: Date
  prNeedByDate: Date
  category: "onHand" | "onTime" | "late" | "outsideLeadTime" | "withinLeadTime"
}

function generateLOBData(): LOBItem[] {
  const items: LOBItem[] = []
  const today = new Date()
  
  const itemDescriptions = [
    { num: "PCB-001", desc: "Main Logic Board" },
    { num: "RF-002", desc: "RF Amplifier Module" },
    { num: "ANT-003", desc: "Antenna Assembly" },
    { num: "PWR-004", desc: "Power Supply Unit" },
    { num: "DSP-005", desc: "Digital Signal Processor" },
    { num: "CON-006", desc: "Connector Assembly" },
    { num: "CHS-007", desc: "Chassis Housing" },
    { num: "BAT-008", desc: "Battery Pack" },
    { num: "DIS-009", desc: "Display Module" },
    { num: "KEY-010", desc: "Keypad Assembly" },
    { num: "MEM-011", desc: "Memory Module" },
    { num: "FIL-012", desc: "EMI Filter" },
    { num: "CAB-013", desc: "Cable Harness" },
    { num: "SPK-014", desc: "Speaker Unit" },
    { num: "MIC-015", desc: "Microphone Assembly" },
  ]

  for (let i = 0; i < 150; i++) {
    const demandDate = new Date(today.getTime() + (Math.random() * 365 - 60) * 24 * 60 * 60 * 1000)
    const supplyDate = new Date(demandDate.getTime() + (Math.random() * 60 - 30) * 24 * 60 * 60 * 1000)
    const prNeedByDate = new Date(demandDate.getTime() - Math.random() * 14 * 24 * 60 * 60 * 1000)
    const item = itemDescriptions[Math.floor(Math.random() * itemDescriptions.length)]
    
    // Determine category based on dates
    let category: LOBItem["category"]
    const daysDiff = Math.floor((supplyDate.getTime() - demandDate.getTime()) / (24 * 60 * 60 * 1000))
    const leadTime = 45 // standard lead time in days
    
    if (supplyDate <= today) {
      category = "onHand"
    } else if (daysDiff <= 0) {
      category = "onTime"
    } else if (daysDiff > 0 && daysDiff <= 14) {
      category = "late"
    } else if (daysDiff > leadTime) {
      category = "outsideLeadTime"
    } else {
      category = "withinLeadTime"
    }

    items.push({
      id: `LOB-${String(i + 1).padStart(4, "0")}`,
      program: programs[Math.floor(Math.random() * programs.length)],
      projectName: projects[Math.floor(Math.random() * projects.length)],
      itemNumber: item.num,
      itemDescription: item.desc,
      site: sites[Math.floor(Math.random() * sites.length)],
      mrpStatus: mrpStatuses[Math.floor(Math.random() * mrpStatuses.length)],
      allocatedQty: Math.floor(Math.random() * 500) + 10,
      supplyDate,
      demandQty: Math.floor(Math.random() * 300) + 5,
      demandDate,
      prNeedByDate,
      category,
    })
  }

  return items
}

const lobData = generateLOBData()

// Production Plan Major Subassemblies Data
interface ProjectData {
  name: string
  majorSubassemblies: MajorSubassembly[]
  objectiveData: { month: string; contractSchedule: number; actualDelivery: number | null }[]
  programStatusData: { majorSubassembly: number; cumulativeUnits: number; name: string }[]
}

function generateProjectData(programName: string): ProjectData {
  // Different data based on program name
  const programConfigs: Record<string, {
    majorSubassemblies: MajorSubassembly[]
    contractSchedule: number[]
    actualDelivery: (number | null)[]
    lobTargets: number[]
    actualUnits: number[]
  }> = {
    "Manpack Radio Program": {
      majorSubassemblies: [
        { id: 1, name: "Fabricate Chassis", type: "companyMade", leadTime: 26, startDay: 26, endDay: 16, row: 0, dependencies: [] },
        { id: 2, name: "Assemble Gyro", type: "companyMade", leadTime: 22, startDay: 22, endDay: 18, row: 1, dependencies: [] },
        { id: 3, name: "Assemble G&C Components", type: "subcontract", leadTime: 20, startDay: 20, endDay: 15, row: 2, dependencies: [] },
        { id: 4, name: "Fabricate Fins", type: "companyMade", leadTime: 18, startDay: 18, endDay: 12, row: 0, dependencies: [1] },
        { id: 5, name: "Assemble Guidance Section", type: "assembly", leadTime: 16, startDay: 16, endDay: 10, row: 2, dependencies: [2, 3] },
        { id: 6, name: "Procure Rocket Engine", type: "purchased", leadTime: 15, startDay: 15, endDay: 10, row: 0, dependencies: [] },
        { id: 7, name: "Assemble Air Vehicle Body", type: "assembly", leadTime: 12, startDay: 12, endDay: 8, row: 0, dependencies: [4, 6] },
        { id: 8, name: "Integrate Systems", type: "assembly", leadTime: 10, startDay: 10, endDay: 6, row: 1, dependencies: [5, 7] },
        { id: 9, name: "Final Assembly", type: "assembly", leadTime: 6, startDay: 6, endDay: 4, row: 1, dependencies: [8] },
        { id: 10, name: "Testing", type: "companyMade", leadTime: 4, startDay: 4, endDay: 2, row: 1, dependencies: [9] },
        { id: 11, name: "Quality Check", type: "companyMade", leadTime: 2, startDay: 2, endDay: 1, row: 1, dependencies: [10] },
        { id: 12, name: "Customer Acceptance", type: "assembly", leadTime: 1, startDay: 1, endDay: 0, row: 1, dependencies: [11] },
      ],
      contractSchedule: [5, 12, 22, 35, 50, 68, 85, 100],
      actualDelivery: [0, 8, 18, 28, 42, null, null, null],
      lobTargets: [65, 62, 60, 58, 55, 52, 48, 45, 42, 38, 32, 25],
      actualUnits: [60, 55, 60, 60, 52, 45, 40, 38, 40, 35, 18, 14],
    },
    "Vehicle Mount System": {
      majorSubassemblies: [
        { id: 1, name: "Procure Steel Frame", type: "purchased", leadTime: 24, startDay: 24, endDay: 18, row: 0, dependencies: [] },
        { id: 2, name: "Fabricate Mounting Bracket", type: "companyMade", leadTime: 20, startDay: 20, endDay: 14, row: 1, dependencies: [] },
        { id: 3, name: "Machine Housing", type: "companyMade", leadTime: 18, startDay: 18, endDay: 12, row: 2, dependencies: [] },
        { id: 4, name: "Weld Frame Assembly", type: "companyMade", leadTime: 16, startDay: 16, endDay: 10, row: 0, dependencies: [1] },
        { id: 5, name: "Install Electronics", type: "assembly", leadTime: 14, startDay: 14, endDay: 8, row: 1, dependencies: [2, 3] },
        { id: 6, name: "Procure Cables", type: "purchased", leadTime: 12, startDay: 12, endDay: 8, row: 2, dependencies: [] },
        { id: 7, name: "Mount Subsystems", type: "assembly", leadTime: 10, startDay: 10, endDay: 6, row: 1, dependencies: [4, 5, 6] },
        { id: 8, name: "Wire Integration", type: "companyMade", leadTime: 8, startDay: 8, endDay: 5, row: 1, dependencies: [7] },
        { id: 9, name: "System Test", type: "companyMade", leadTime: 5, startDay: 5, endDay: 3, row: 1, dependencies: [8] },
        { id: 10, name: "Environmental Test", type: "subcontract", leadTime: 3, startDay: 3, endDay: 2, row: 1, dependencies: [9] },
        { id: 11, name: "Final Inspection", type: "companyMade", leadTime: 2, startDay: 2, endDay: 1, row: 1, dependencies: [10] },
        { id: 12, name: "Delivery", type: "assembly", leadTime: 1, startDay: 1, endDay: 0, row: 1, dependencies: [11] },
      ],
      contractSchedule: [8, 18, 30, 45, 62, 78, 92, 110],
      actualDelivery: [5, 15, 28, 40, 55, null, null, null],
      lobTargets: [70, 68, 65, 62, 58, 55, 50, 46, 42, 36, 28, 20],
      actualUnits: [68, 65, 62, 58, 52, 48, 45, 40, 35, 30, 22, 16],
    },
    "Tactical HF Radio": {
      majorSubassemblies: [
        { id: 1, name: "Procure PCB Boards", type: "purchased", leadTime: 22, startDay: 22, endDay: 16, row: 0, dependencies: [] },
        { id: 2, name: "Fabricate Enclosure", type: "companyMade", leadTime: 20, startDay: 20, endDay: 14, row: 1, dependencies: [] },
        { id: 3, name: "Procure RF Components", type: "purchased", leadTime: 18, startDay: 18, endDay: 12, row: 2, dependencies: [] },
        { id: 4, name: "Assemble Main Board", type: "assembly", leadTime: 14, startDay: 14, endDay: 10, row: 0, dependencies: [1] },
        { id: 5, name: "Assemble RF Module", type: "assembly", leadTime: 12, startDay: 12, endDay: 8, row: 2, dependencies: [3] },
        { id: 6, name: "Paint & Finish", type: "subcontract", leadTime: 10, startDay: 10, endDay: 7, row: 1, dependencies: [2] },
        { id: 7, name: "Board Integration", type: "assembly", leadTime: 8, startDay: 8, endDay: 5, row: 1, dependencies: [4, 5, 6] },
        { id: 8, name: "Software Load", type: "companyMade", leadTime: 5, startDay: 5, endDay: 3, row: 1, dependencies: [7] },
        { id: 9, name: "Calibration", type: "companyMade", leadTime: 4, startDay: 4, endDay: 2, row: 1, dependencies: [8] },
        { id: 10, name: "Functional Test", type: "companyMade", leadTime: 3, startDay: 3, endDay: 2, row: 1, dependencies: [9] },
        { id: 11, name: "Burn-In Test", type: "companyMade", leadTime: 2, startDay: 2, endDay: 1, row: 1, dependencies: [10] },
        { id: 12, name: "Ship to Customer", type: "assembly", leadTime: 1, startDay: 1, endDay: 0, row: 1, dependencies: [11] },
      ],
      contractSchedule: [10, 25, 42, 60, 80, 95, 108, 120],
      actualDelivery: [8, 22, 38, 55, 72, null, null, null],
      lobTargets: [72, 70, 67, 64, 60, 56, 52, 48, 44, 40, 34, 28],
      actualUnits: [70, 68, 64, 60, 55, 50, 46, 42, 38, 34, 28, 22],
    },
    "Base Station Program": {
      majorSubassemblies: [
        { id: 1, name: "Procure Tower Sections", type: "purchased", leadTime: 30, startDay: 30, endDay: 22, row: 0, dependencies: [] },
        { id: 2, name: "Fabricate Base Plate", type: "companyMade", leadTime: 28, startDay: 28, endDay: 20, row: 1, dependencies: [] },
        { id: 3, name: "Procure Antenna Array", type: "purchased", leadTime: 26, startDay: 26, endDay: 18, row: 2, dependencies: [] },
        { id: 4, name: "Weld Tower Assembly", type: "companyMade", leadTime: 20, startDay: 20, endDay: 14, row: 0, dependencies: [1, 2] },
        { id: 5, name: "Install Power Systems", type: "assembly", leadTime: 18, startDay: 18, endDay: 12, row: 1, dependencies: [] },
        { id: 6, name: "Mount Antenna", type: "assembly", leadTime: 14, startDay: 14, endDay: 10, row: 2, dependencies: [3, 4] },
        { id: 7, name: "Install Comm Equipment", type: "assembly", leadTime: 12, startDay: 12, endDay: 8, row: 1, dependencies: [5, 6] },
        { id: 8, name: "Cable Routing", type: "companyMade", leadTime: 8, startDay: 8, endDay: 5, row: 1, dependencies: [7] },
        { id: 9, name: "System Integration", type: "assembly", leadTime: 5, startDay: 5, endDay: 3, row: 1, dependencies: [8] },
        { id: 10, name: "Range Testing", type: "subcontract", leadTime: 4, startDay: 4, endDay: 2, row: 1, dependencies: [9] },
        { id: 11, name: "Final Certification", type: "companyMade", leadTime: 2, startDay: 2, endDay: 1, row: 1, dependencies: [10] },
        { id: 12, name: "Site Handover", type: "assembly", leadTime: 1, startDay: 1, endDay: 0, row: 1, dependencies: [11] },
      ],
      contractSchedule: [3, 8, 15, 25, 38, 52, 70, 90],
      actualDelivery: [2, 6, 12, 20, 32, null, null, null],
      lobTargets: [58, 55, 52, 50, 48, 45, 42, 38, 35, 30, 25, 18],
      actualUnits: [55, 52, 48, 45, 42, 38, 35, 32, 28, 24, 18, 12],
    },
  }

  // Default config for programs not explicitly defined
  const defaultConfig = programConfigs["Manpack Radio Program"]
  const config = programConfigs[programName] || {
    ...defaultConfig,
    // Add some variation for other programs
    lobTargets: defaultConfig.lobTargets.map(v => v + Math.floor(Math.random() * 10) - 5),
    actualUnits: defaultConfig.actualUnits.map(v => Math.max(5, v + Math.floor(Math.random() * 15) - 7)),
  }

  const months = ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"]
  const objectiveData = months.map((month, i) => ({
    month,
    contractSchedule: config.contractSchedule[i],
    actualDelivery: config.actualDelivery[i],
  }))

  const programStatusData = config.majorSubassemblies.map((cp, i) => ({
    majorSubassembly: cp.id,
    cumulativeUnits: config.actualUnits[i],
    lobTarget: config.lobTargets[i],
    name: cp.name,
  }))

  return {
    name: programName,
    majorSubassemblies: config.majorSubassemblies,
    objectiveData,
    programStatusData,
  }
}

export function LineOfBalance() {
  const [activeView, setActiveView] = useState<"lineOfBalance" | "projectStatus">("lineOfBalance")
  const [selectedProgram, setSelectedProgram] = useState<string>("all")
  const [selectedSite, setSelectedSite] = useState<string>("all")
  const [selectedItem, setSelectedItem] = useState<string>("all")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  
  // Project Status specific state
  const [psProgram, setPsProgram] = useState<string>(programs[0])
  const [psSite, setPsSite] = useState<string>(sites[0])
  const [psStartDate, setPsStartDate] = useState<string>("")
  const [psEndDate, setPsEndDate] = useState<string>("")
  
  // Major Subassembly Details Modal
  const [selectedMajorSubassembly, setSelectedMajorSubassembly] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Generate project data for selected program
  const projectData = useMemo(() => generateProjectData(psProgram), [psProgram])

  // Get unique items for dropdown
  const uniqueItems = useMemo(() => {
    const items = new Map<string, string>()
    lobData.forEach((item) => {
      items.set(item.itemNumber, item.itemDescription)
    })
    return Array.from(items.entries())
  }, [])

  // Filter data based on selections
  const filteredData = useMemo(() => {
    return lobData.filter((item) => {
      if (selectedProgram !== "all" && item.program !== selectedProgram) return false
      if (selectedSite !== "all" && item.site !== selectedSite) return false
      if (selectedItem !== "all" && item.itemNumber !== selectedItem) return false
      if (startDate && item.demandDate < new Date(startDate)) return false
      if (endDate && item.demandDate > new Date(endDate)) return false
      return true
    })
  }, [selectedProgram, selectedSite, selectedItem, startDate, endDate])

  // Calculate KPIs
  const kpis = useMemo(() => {
    const total = filteredData.reduce((sum, item) => sum + item.demandQty, 0)
    const onHand = filteredData.filter((i) => i.category === "onHand").reduce((sum, item) => sum + item.demandQty, 0)
    const onTime = filteredData.filter((i) => i.category === "onTime").reduce((sum, item) => sum + item.demandQty, 0)
    const late = filteredData.filter((i) => i.category === "late").reduce((sum, item) => sum + item.demandQty, 0)
    const outsideLT = filteredData.filter((i) => i.category === "outsideLeadTime").reduce((sum, item) => sum + item.demandQty, 0)
    const withinLT = filteredData.filter((i) => i.category === "withinLeadTime").reduce((sum, item) => sum + item.demandQty, 0)

    return {
      onHand: total > 0 ? ((onHand / total) * 100).toFixed(1) : "0.0",
      onTime: total > 0 ? ((onTime / total) * 100).toFixed(1) : "0.0",
      late: total > 0 ? ((late / total) * 100).toFixed(1) : "0.0",
      outsideLeadTime: total > 0 ? ((outsideLT / total) * 100).toFixed(1) : "0.0",
      withinLeadTime: total > 0 ? ((withinLT / total) * 100).toFixed(1) : "0.0",
    }
  }, [filteredData])

  // Prepare chart data - monthly aggregation
  const chartData = useMemo(() => {
    const monthlyData = new Map<string, { onHand: number; onTime: number; late: number; outsideLeadTime: number; withinLeadTime: number; total: number }>()

    filteredData.forEach((item) => {
      const monthKey = `${item.demandDate.getFullYear()}-${String(item.demandDate.getMonth() + 1).padStart(2, "0")}`
      const existing = monthlyData.get(monthKey) || { onHand: 0, onTime: 0, late: 0, outsideLeadTime: 0, withinLeadTime: 0, total: 0 }

      existing.total += item.demandQty
      if (item.category === "onHand") existing.onHand += item.demandQty
      else if (item.category === "onTime") existing.onTime += item.demandQty
      else if (item.category === "late") existing.late += item.demandQty
      else if (item.category === "outsideLeadTime") existing.outsideLeadTime += item.demandQty
      else if (item.category === "withinLeadTime") existing.withinLeadTime += item.demandQty

      monthlyData.set(monthKey, existing)
    })

    // Convert to array and calculate percentages
    return Array.from(monthlyData.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => {
        const total = data.total || 1
        return {
          month: new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
          "On Hand": parseFloat(((data.onHand / total) * 100).toFixed(1)),
          "On Time": parseFloat(((data.onTime / total) * 100).toFixed(1)),
          "Late": parseFloat(((data.late / total) * 100).toFixed(1)),
          "Outside Lead Time": parseFloat(((data.outsideLeadTime / total) * 100).toFixed(1)),
          "Within Lead Time": parseFloat(((data.withinLeadTime / total) * 100).toFixed(1)),
        }
      })
  }, [filteredData])

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
  }

  const getCategoryBadge = (category: LOBItem["category"]) => {
    const styles = {
      onHand: "bg-blue-100 text-blue-800",
      onTime: "bg-green-100 text-green-800",
      late: "bg-red-100 text-red-800",
      outsideLeadTime: "bg-orange-100 text-orange-800",
      withinLeadTime: "bg-emerald-100 text-emerald-800",
    }
    const labels = {
      onHand: "On Hand",
      onTime: "On Time",
      late: "Late",
      outsideLeadTime: "Outside LT",
      withinLeadTime: "Within LT",
    }
    return <Badge className={styles[category]}>{labels[category]}</Badge>
  }

  // LOB line data is already included in programStatusData
  const lobLine = projectData.programStatusData
  
  // Create expanded data for stepped LOB line that steps AFTER each bar
  const steppedLobData = useMemo(() => {
    const expanded: { x: number; lobTarget: number }[] = []
    lobLine.forEach((cp, i) => {
      // Start of bar position (left edge)
      expanded.push({ x: cp.majorSubassembly - 0.4, lobTarget: cp.lobTarget })
      // End of bar position (right edge) - same level
      expanded.push({ x: cp.majorSubassembly + 0.4, lobTarget: cp.lobTarget })
      // If not the last point, add the step down to next level
      if (i < lobLine.length - 1) {
        expanded.push({ x: cp.majorSubassembly + 0.4, lobTarget: lobLine[i + 1].lobTarget })
      }
    })
    return expanded
  }, [lobLine])

  // Render Project Status View
  const renderProjectStatus = () => (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Project Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Program/Project</Label>
              <Select value={psProgram} onValueChange={setPsProgram}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Program" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Site</Label>
              <Select value={psSite} onValueChange={setPsSite}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={psStartDate} onChange={(e) => setPsStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={psEndDate} onChange={(e) => setPsEndDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Row: Objective Chart (left) and Program Status Chart (right) */}
      <div className="grid grid-cols-2 gap-6">
        {/* (A) Objective Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">(A) OBJECTIVE</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projectData.objectiveData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="1 1" stroke="#d1d5db" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={{ stroke: '#374151' }} />
                  <YAxis 
                    label={{ value: 'Units', angle: -90, position: 'insideLeft', fontSize: 11 }} 
                    domain={[0, 80]}
                    ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80]}
                    tick={{ fontSize: 10 }}
                    axisLine={{ stroke: '#374151' }}
                  />
                  <Tooltip />
                  <Legend verticalAlign="top" height={36} />
                  <Line 
                    type="monotone" 
                    dataKey="contractSchedule" 
                    stroke="#1D4ED8" 
                    strokeWidth={2} 
                    name="Contract schedule (cumulative)"
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="actualDelivery" 
                    stroke="#DC2626" 
                    strokeWidth={2} 
                    name="Actual delivery"
                    dot={false}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Data Table */}
            <div className="border-t pt-2">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-xs font-medium py-1 pl-0">Month</TableCell>
                    {projectData.objectiveData.map((d) => (
                      <TableCell key={d.month} className="text-center text-xs py-1 font-semibold">{d.month}</TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs py-1 pl-0">Contract Schedule (cum)</TableCell>
                    {projectData.objectiveData.map((d) => (
                      <TableCell key={d.month} className="text-center text-xs py-1">{d.contractSchedule}</TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs py-1 pl-0">Actual Delivery (cum)</TableCell>
                    {projectData.objectiveData.map((d) => (
                      <TableCell key={d.month} className="text-center text-xs py-1">{d.actualDelivery ?? "-"}</TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
              <p className="text-xs text-gray-500 mt-2 text-center">Date of Study: 1 May</p>
            </div>
          </CardContent>
        </Card>

        {/* (C) Program Status Chart */}
        <Card data-card="program-status">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">(C) PROGRAM STATUS</CardTitle>
            <p className="text-xs text-slate-500 mt-1">Click on any bar to view detailed breakdown</p>
          </CardHeader>
          <CardContent>
            <div className="h-[380px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lobLine} margin={{ top: 20, right: 30, left: 50, bottom: 40 }} barCategoryGap="15%">
                  <CartesianGrid strokeDasharray="1 1" stroke="#d1d5db" vertical={false} />
                  <XAxis 
                    dataKey="majorSubassembly" 
                    tick={{ fontSize: 10 }}
                    axisLine={{ stroke: '#374151' }}
                    label={{ value: 'Major Subassembly', position: 'bottom', offset: 20, fontSize: 11 }}
                  />
                  <YAxis 
                    domain={[0, 80]}
                    ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80]}
                    tick={{ fontSize: 10 }}
                    axisLine={{ stroke: '#374151' }}
                    label={{ value: '# of Units', angle: -90, position: 'insideLeft', fontSize: 11 }}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-white p-2 border rounded shadow text-xs">
                            <p className="font-semibold">MSA {data.majorSubassembly}: {data.name}</p>
                            <p>Actual Units: {data.cumulativeUnits}</p>
                            <p>LOB Target: {data.lobTarget}</p>
                            <p className="text-blue-600 text-xs mt-1">Click to view details</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar 
                    dataKey="cumulativeUnits" 
                    fill="#1f2937" 
                    name="Cumulative Units"
                    onClick={(data) => {
                      const cp = projectData.majorSubassemblies.find(c => c.id === data.majorSubassembly)
                      if (cp) {
                        setSelectedMajorSubassembly({
                          ...cp,
                          cumulativeUnits: data.cumulativeUnits,
                          lobTarget: data.lobTarget
                        })
                        setIsModalOpen(true)
                      }
                    }}
                    cursor="pointer"
                  >
                    {lobLine.map((entry, index) => (
                      <Cell key={`cell-${index}`} className="hover:opacity-80 transition-opacity" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {/* Custom SVG overlay for stepped LOB line */}
              <svg 
                className="absolute inset-0 pointer-events-none" 
                style={{ left: 50, top: 20, width: 'calc(100% - 80px)', height: 'calc(100% - 80px)' }}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <polyline
                  fill="none"
                  stroke="#16A34A"
                  strokeWidth="0.5"
                  points={lobLine.map((d, i) => {
                    // Calculate bar width and spacing to align with bar centers
                    const barWidth = 100 / lobLine.length
                    const xCenter = (i + 0.5) * barWidth
                    const xNextCenter = (i + 1.5) * barWidth
                    const y = 100 - (d.lobTarget / 80) * 100
                    const nextY = i < lobLine.length - 1 ? 100 - (lobLine[i + 1].lobTarget / 80) * 100 : y
                    // Create stepped line from center to center
                    return `${xCenter},${y} ${xNextCenter},${y} ${xNextCenter},${nextY}`
                  }).join(' ')}
                />
              </svg>
              {/* LOB Label */}
              <div className="absolute top-1/3 right-20 text-xs text-green-600 font-semibold">{'"LOB"'}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* (B) Production Plan - Full Width */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">(B) PRODUCTION PLAN</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative bg-white border rounded-lg p-4" style={{ height: '320px' }}>
            {/* Legend */}
            <div className="absolute top-4 right-4 text-xs space-y-1 bg-white p-3 rounded border shadow-sm">
              <p className="font-semibold mb-2">Legend</p>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-800" />
                <span>Purchased Part</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-800" />
                <span>Company Made</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-500" />
                <span>Subcontract Part</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[8px] border-l-transparent border-r-transparent border-t-gray-800" />
                <span>Assembly</span>
              </div>
            </div>
            
            {/* Production Plan Network Diagram - Dynamic based on selected program */}
            <svg viewBox="0 0 900 240" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
              {/* Work Days axis - runs from max lead time (left) to 0 (right) */}
              {(() => {
                const maxLeadTime = Math.max(...projectData.majorSubassemblies.map(cp => cp.leadTime))
                const xScale = 780 / maxLeadTime
                const ticks = []
                for (let i = maxLeadTime; i >= 0; i -= 2) {
                  ticks.push(i)
                }
                return ticks.map((day) => {
                  const x = 50 + (maxLeadTime - day) * xScale
                  return (
                    <g key={day}>
                      <line x1={x} y1={200} x2={x} y2={205} stroke="#374151" strokeWidth={1} />
                      <text x={x} y={220} textAnchor="middle" fontSize={10} fill="#374151">{day}</text>
                    </g>
                  )
                })
              })()}
              <text x={440} y={238} textAnchor="middle" fontSize={11} fill="#374151">Work Days</text>
              
              {/* Dynamic major subassemblies rendering */}
              {projectData.majorSubassemblies.map((cp) => {
                const maxLeadTime = Math.max(...projectData.majorSubassemblies.map(c => c.leadTime))
                const xScale = 780 / maxLeadTime
                const x1 = 50 + (maxLeadTime - cp.startDay) * xScale
                const x2 = 50 + (maxLeadTime - cp.endDay) * xScale
                const rowHeights = [40, 80, 120, 160]
                const y = rowHeights[cp.row % 4]
                
                const getFill = () => {
                  if (cp.type === "subcontract") return "#6b7280"
                  return "#1f2937"
                }
                
                // Calculate status based on lobLine data
                const lobItem = lobLine.find(item => item.majorSubassembly === cp.id)
                let statusColor = "#22c55e" // Default green
                if (lobItem) {
                  const variance = lobItem.cumulativeUnits - lobItem.lobTarget
                  const variancePercent = (variance / lobItem.lobTarget) * 100
                  
                  if (variancePercent < -15) {
                    statusColor = "#ef4444" // Red for >15% behind
                  } else if (variancePercent < -5) {
                    statusColor = "#eab308" // Yellow for 5-15% behind
                  }
                }
                
                return (
                  <g key={cp.id}>
                    {/* Connection line */}
                    <line x1={x1 + 6} y1={y} x2={x2} y2={y} stroke="#374151" strokeWidth={2} />
                    
                    {/* Start symbol based on type */}
                    {cp.type === "purchased" && (
                      <circle cx={x1} cy={y} r={6} fill={getFill()} />
                    )}
                    {cp.type === "companyMade" && (
                      <rect x={x1 - 5} y={y - 5} width={10} height={10} fill={getFill()} />
                    )}
                    {cp.type === "subcontract" && (
                      <rect x={x1 - 5} y={y - 5} width={10} height={10} fill={getFill()} />
                    )}
                    {cp.type === "assembly" && (
                      <polygon points={`${x1},${y - 6} ${x1 - 6},${y + 6} ${x1 + 6},${y + 6}`} fill={getFill()} />
                    )}
                    
                    {/* Status indicator circle */}
                    <circle 
                      cx={x1 + 15} 
                      cy={y - 12} 
                      r={4} 
                      fill={statusColor}
                      stroke="#fff"
                      strokeWidth={1}
                    />
                    
                    {/* Major subassembly number */}
                    <text x={x1} y={y - 12} textAnchor="middle" fontSize={9} fontWeight="bold" fill="#1f2937">{cp.id}</text>
                    
                    {/* Label */}
                    <text x={(x1 + x2) / 2} y={y + 15} textAnchor="middle" fontSize={7} fill="#4b5563">{cp.name}</text>
                    
                    {/* Draw dependency connections */}
                    {cp.dependencies.map(depId => {
                      const depCp = projectData.majorSubassemblies.find(c => c.id === depId)
                      if (depCp) {
                        const depX2 = 50 + (maxLeadTime - depCp.endDay) * xScale
                        const depY = rowHeights[depCp.row % 4]
                        // Draw vertical/horizontal connector
                        if (depY !== y) {
                          return (
                            <g key={`dep-${cp.id}-${depId}`}>
                              <line x1={depX2} y1={depY} x2={depX2} y2={y} stroke="#374151" strokeWidth={1.5} strokeDasharray="3,2" />
                            </g>
                          )
                        }
                      }
                      return null
                    })}
                  </g>
                )
              })}
              
              {/* Final delivery marker */}
              {(() => {
                const lastCp = projectData.majorSubassemblies[projectData.majorSubassemblies.length - 1]
                const maxLeadTime = Math.max(...projectData.majorSubassemblies.map(c => c.leadTime))
                const xScale = 780 / maxLeadTime
                const x = 50 + (maxLeadTime - lastCp.endDay) * xScale
                const y = [40, 80, 120, 160][lastCp.row % 4]
                return (
                  <circle cx={x} cy={y} r={6} fill="none" stroke="#1f2937" strokeWidth={2} />
                )
              })()}
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* Critical Major Subassemblies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Critical Major Subassemblies</CardTitle>
          <p className="text-xs text-slate-500 mt-1">Focus on red and yellow indicators to identify areas requiring attention</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="font-semibold w-16">Status</TableHead>
                <TableHead className="font-semibold">MSA #</TableHead>
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="font-semibold text-right">Lead Time (Days)</TableHead>
                <TableHead className="font-semibold text-right">Actual Units</TableHead>
                <TableHead className="font-semibold text-right">LOB Target</TableHead>
                <TableHead className="font-semibold text-right">Variance</TableHead>
                <TableHead className="font-semibold">Performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lobLine.map((cp) => {
                const variance = cp.cumulativeUnits - cp.lobTarget
                const variancePercent = (variance / cp.lobTarget) * 100
                
                // Determine status indicator: Red (critical), Yellow (warning), Green (good)
                let statusColor = "bg-green-500" // Default green
                let statusLabel = "On Track"
                if (variancePercent < -15) {
                  statusColor = "bg-red-500" // Red for >15% behind
                  statusLabel = "Critical"
                } else if (variancePercent < -5) {
                  statusColor = "bg-yellow-500" // Yellow for 5-15% behind
                  statusLabel = "At Risk"
                } else if (variancePercent >= 0) {
                  statusColor = "bg-green-500" // Green for on target or ahead
                  statusLabel = "On Track"
                }
                
                const status = variance > 0 ? "Ahead" : variance < 0 ? "Behind" : "On Target"
                return (
                  <TableRow 
                    key={cp.majorSubassembly}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => {
                      // Scroll to Program Status chart and highlight this bar
                      const programStatusCard = document.querySelector('[data-card="program-status"]')
                      if (programStatusCard) {
                        programStatusCard.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }
                    }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div 
                          className={`w-4 h-4 rounded-full ${statusColor} shadow-sm`} 
                          title={statusLabel}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{cp.majorSubassembly}</TableCell>
                    <TableCell>{cp.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {projectData.majorSubassemblies.find(c => c.id === cp.majorSubassembly)?.type || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {projectData.majorSubassemblies.find(c => c.id === cp.majorSubassembly)?.leadTime || 0}
                    </TableCell>
                    <TableCell className="text-right font-medium">{cp.cumulativeUnits}</TableCell>
                    <TableCell className="text-right">{cp.lobTarget}</TableCell>
                    <TableCell className={`text-right font-medium ${variance > 0 ? "text-green-600" : variance < 0 ? "text-red-600" : ""}`}>
                      {variance > 0 ? `+${variance}` : variance}
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        status === "Ahead" ? "bg-green-100 text-green-800" : 
                        status === "Behind" ? "bg-red-100 text-red-800" : 
                        "bg-gray-100 text-gray-800"
                      }>
                        {status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Major Subassembly Details Modal */}
      <MajorSubassemblyDetails 
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        majorSubassembly={selectedMajorSubassembly}
      />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Line of Balance</h2>
        <div className="flex gap-2">
          <Button
            variant={activeView === "lineOfBalance" ? "default" : "outline"}
            onClick={() => setActiveView("lineOfBalance")}
          >
            Line of Balance
          </Button>
          <Button
            variant={activeView === "projectStatus" ? "default" : "outline"}
            onClick={() => setActiveView("projectStatus")}
          >
            Project Status
          </Button>
        </div>
      </div>

      {activeView === "projectStatus" ? renderProjectStatus() : (
        <div>
          {/* Filters */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>Program</Label>
                  <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Program" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Programs</SelectItem>
                      {programs.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Site</Label>
                  <Select value={selectedSite} onValueChange={setSelectedSite}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Site" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sites</SelectItem>
                      {sites.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Item</Label>
                  <Select value={selectedItem} onValueChange={setSelectedItem}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Item" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      {uniqueItems.map(([num, desc]) => (
                        <SelectItem key={num} value={num}>{num} - {desc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Demand Start Date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Demand End Date</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI Cards */}
          <div className="grid grid-cols-5 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-blue-700">On Hand</p>
                <p className="text-3xl font-bold text-blue-900">{kpis.onHand}%</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-green-700">Orders on Time</p>
                <p className="text-3xl font-bold text-green-900">{kpis.onTime}%</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-red-700">Orders Late</p>
                <p className="text-3xl font-bold text-red-900">{kpis.late}%</p>
              </CardContent>
            </Card>
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-orange-700">Outside Lead Time</p>
                <p className="text-3xl font-bold text-orange-900">{kpis.outsideLeadTime}%</p>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-emerald-700">Within Lead Time</p>
                <p className="text-3xl font-bold text-emerald-900">{kpis.withinLeadTime}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Stacked Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Line of Balance - Sum of Demand Quantity (%)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `${value}%`} domain={[0, 100]} />
                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                    <Legend />
                    <Bar dataKey="On Hand" stackId="a" fill="#1D4ED8" />
                    <Bar dataKey="On Time" stackId="a" fill="#047857" />
                    <Bar dataKey="Late" stackId="a" fill="#DC2626" />
                    <Bar dataKey="Outside Lead Time" stackId="a" fill="#EA580C" />
                    <Bar dataKey="Within Lead Time" stackId="a" fill="#0D9488" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Detail Table */}
          <Card>
            <CardHeader>
              <CardTitle>Order Details ({filteredData.length} items)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="font-semibold">Program</TableHead>
                      <TableHead className="font-semibold">Project Name</TableHead>
                      <TableHead className="font-semibold">Item Number</TableHead>
                      <TableHead className="font-semibold">Item Description</TableHead>
                      <TableHead className="font-semibold">Site</TableHead>
                      <TableHead className="font-semibold">MRP Status</TableHead>
                      <TableHead className="font-semibold text-right">Allocated Qty</TableHead>
                      <TableHead className="font-semibold">Supply Date</TableHead>
                      <TableHead className="font-semibold text-right">Demand Qty</TableHead>
                      <TableHead className="font-semibold">Demand Date</TableHead>
                      <TableHead className="font-semibold">PR Need by Date</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.slice(0, 100).map((item) => (
                      <TableRow key={item.id} className="hover:bg-gray-50">
                        <TableCell className="text-sm">{item.program}</TableCell>
                        <TableCell className="text-sm">{item.projectName}</TableCell>
                        <TableCell className="text-sm font-medium">{item.itemNumber}</TableCell>
                        <TableCell className="text-sm">{item.itemDescription}</TableCell>
                        <TableCell className="text-sm">{item.site}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{item.mrpStatus}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{item.allocatedQty.toLocaleString()}</TableCell>
                        <TableCell className="text-sm">{formatDate(item.supplyDate)}</TableCell>
                        <TableCell className="text-right">{item.demandQty.toLocaleString()}</TableCell>
                        <TableCell className="text-sm">{formatDate(item.demandDate)}</TableCell>
                        <TableCell className="text-sm">{formatDate(item.prNeedByDate)}</TableCell>
                        <TableCell>{getCategoryBadge(item.category)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
