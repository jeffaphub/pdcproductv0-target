"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ComposedChart, Cell } from "recharts"

export function FPY() {
  // Global filters
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>(["All"])
  const [timeRange, setTimeRange] = useState("Year")
  const [partSearch, setPartSearch] = useState("")
  const [ncStatus, setNcStatus] = useState("All")
  
  // Section-specific filters
  const [buyMakeToggle, setBuyMakeToggle] = useState<"Buy" | "Make">("Buy")
  const [coreValueChain, setCoreValueChain] = useState("All")
  const [defectCategory, setDefectCategory] = useState("All")
  const [processStep, setProcessStep] = useState("All")
  const [timeGranularity, setTimeGranularity] = useState<"Monthly" | "Weekly">("Monthly")
  
  // Navigation state
  const [activeNav, setActiveNav] = useState("first-pass-yield")
  
  // Generate Part Yield Data
  const generatePartYieldData = () => {
    const programs = ["Manpack Radio Program", "Vehicle Mount System", "Tactical HF Radio", "Base Station Program", "Portable Comm System"]
    const buyParts = [
      "PCB Assembly", "RF Module", "Antenna Array", "Power Supply Unit", "Connector Kit",
      "Display Module", "Battery Pack", "Cable Harness", "Circuit Board", "Transceiver Unit"
    ]
    const makeParts = [
      "Chassis Frame", "Mounting Bracket", "Housing Shell", "Heat Sink", "Cover Plate",
      "Wiring Harness", "Support Bracket", "Test Fixture", "Custom Adapter", "Enclosure Panel"
    ]
    
    const parts = buyMakeToggle === "Buy" ? buyParts : makeParts
    const data = []
    
    for (let i = 0; i < programs.length; i++) {
      for (let j = 0; j < 6; j++) {
        const snWithNc = Math.floor(Math.random() * 30) + 5
        const snWithoutNc = Math.floor(Math.random() * 150) + 50
        const partYieldValue = (snWithoutNc / (snWithNc + snWithoutNc)) * 100
        const scrapRate = (Math.random() * 8) + 1
        const unitCost = Math.floor(Math.random() * 5000) + 500
        const reworkScrapCost = (snWithNc * unitCost * 0.3) + (scrapRate / 100 * (snWithNc + snWithoutNc) * unitCost)
        
        data.push({
          program: programs[i],
          part: parts[j % parts.length],
          snWithNc,
          snWithoutNc,
          partYield: Math.round(partYieldValue * 10) / 10,
          scrapRate: Math.round(scrapRate * 10) / 10,
          unitCost,
          reworkScrapCost: Math.round(reworkScrapCost),
          valueChain: ["Machining", "Assembly", "Test", "Integration"][Math.floor(Math.random() * 4)],
          defectCategory: ["Dimensional", "Documentation", "Supplier Quality", "Process", "Material"][Math.floor(Math.random() * 5)],
          processStep: ["Station 1", "Station 2", "Station 3", "Final Test"][Math.floor(Math.random() * 4)],
        })
      }
    }
    return data
  }
  
  // Generate NC Serials Data
  const generateNcSerialsData = () => {
    const subAssemblies = ["Guidance Section", "Power Module", "RF Assembly", "Control Unit", "Sensor Array"]
    const items = ["Item-001", "Item-002", "Item-003", "Item-004", "Item-005"]
    const descriptions = ["Main Circuit Board", "Power Distribution", "Signal Processing", "Control Interface", "Data Acquisition"]
    const ncStatuses = ["Open", "In Review", "Rework in Progress", "Closed"]
    
    const data = []
    for (let i = 0; i < 80; i++) {
      const hasNc = Math.random() > 0.4 ? "Y" : "N"
      const status = hasNc === "Y" ? ncStatuses[Math.floor(Math.random() * ncStatuses.length)] : "N/A"
      const daysOpen = hasNc === "Y" ? Math.floor(Math.random() * 60) + 1 : 0
      
      data.push({
        subAssembly: subAssemblies[Math.floor(Math.random() * subAssemblies.length)],
        item: items[Math.floor(Math.random() * items.length)],
        description: descriptions[Math.floor(Math.random() * descriptions.length)],
        serial: `SN-2024-${String(1000 + i).padStart(5, '0')}`,
        hasNc,
        ncStatus: status,
        daysOpen,
        buyMake: Math.random() > 0.5 ? "Buy" : "Make",
        valueChain: ["Machining", "Assembly", "Test", "Integration"][Math.floor(Math.random() * 4)],
        defectCategory: ["Dimensional", "Documentation", "Supplier Quality", "Process", "Material"][Math.floor(Math.random() * 5)],
        processStep: ["Station 1", "Station 2", "Station 3", "Final Test"][Math.floor(Math.random() * 4)],
      })
    }
    return data
  }
  
  // Generate Rollthrough Yield Time Series Data
  const generateRollthroughYieldData = () => {
    const periods = timeGranularity === "Monthly" 
      ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      : Array.from({ length: 52 }, (_, i) => `W${i + 1}`)
    
    return periods.map(period => ({
      period,
      units: Math.floor(Math.random() * 200) + 100,
      rollthroughYield: Math.round((85 + Math.random() * 10) * 10) / 10,
      target: 92,
    }))
  }
  
  const allPartYieldData = useMemo(() => generatePartYieldData(), [buyMakeToggle])
  const allNcSerialsData = useMemo(() => generateNcSerialsData(), [])
  const rollthroughYieldData = useMemo(() => generateRollthroughYieldData(), [timeGranularity])
  
  // Apply filters
  const filteredPartYieldData = useMemo(() => {
    return allPartYieldData.filter(row => {
      const matchesProgram = selectedPrograms.includes("All") || selectedPrograms.includes(row.program)
      const matchesPart = partSearch === "" || row.part.toLowerCase().includes(partSearch.toLowerCase())
      const matchesValueChain = coreValueChain === "All" || row.valueChain === coreValueChain
      const matchesDefect = defectCategory === "All" || row.defectCategory === defectCategory
      const matchesProcess = processStep === "All" || row.processStep === processStep
      return matchesProgram && matchesPart && matchesValueChain && matchesDefect && matchesProcess
    })
  }, [allPartYieldData, selectedPrograms, partSearch, coreValueChain, defectCategory, processStep])
  
  const filteredNcSerialsData = useMemo(() => {
    return allNcSerialsData.filter(row => {
      const matchesBuyMake = row.buyMake === buyMakeToggle
      const matchesNcStatus = ncStatus === "All" || row.ncStatus === ncStatus
      const matchesValueChain = coreValueChain === "All" || row.valueChain === coreValueChain
      const matchesDefect = defectCategory === "All" || row.defectCategory === defectCategory
      const matchesProcess = processStep === "All" || row.processStep === processStep
      const matchesPart = partSearch === "" || row.item.toLowerCase().includes(partSearch.toLowerCase()) || row.description.toLowerCase().includes(partSearch.toLowerCase())
      return matchesBuyMake && matchesNcStatus && matchesValueChain && matchesDefect && matchesProcess && matchesPart
    })
  }, [allNcSerialsData, buyMakeToggle, ncStatus, coreValueChain, defectCategory, processStep, partSearch])
  
  // Calculate Top-Level KPIs (for the 5 main KPI cards at top)
  const topKpis = useMemo(() => {
    // Top-Assembly on NC Hold - finished assemblies blocked from shipping
    const topAssembliesOnHold = Math.floor(Math.random() * 15) + 8 // Simulated: 8-22 assemblies
    
    // LTM Monthly AOP - Last Twelve Months performance vs Annual Operating Plan
    const ltmMonthlyAOP = 96.4 // Simulated: % achievement vs plan
    
    // Quantity Shipped - units delivered to customers
    const quantityShipped = 1847 // Simulated: total units shipped
    
    // Remaining on Contract - units left to deliver
    const remainingOnContract = 653 // Simulated: contract quantity minus shipped
    
    // Material Attrition - material loss (scrap, obsolescence, yield loss)
    const materialAttrition = 4.2 // Simulated: % of material lost
    
    return {
      topAssembliesOnHold,
      ltmMonthlyAOP,
      quantityShipped,
      remainingOnContract,
      materialAttrition,
    }
  }, [])
  
  // Calculate KPIs from filtered data (for secondary KPI cards)
  const kpis = useMemo(() => {
    const totalSn = filteredPartYieldData.reduce((sum, row) => sum + row.snWithNc + row.snWithoutNc, 0)
    const totalSnWithoutNc = filteredPartYieldData.reduce((sum, row) => sum + row.snWithoutNc, 0)
    const rolledYield = totalSn > 0 ? (totalSnWithoutNc / totalSn) * 100 : 0
    const unitsOnNc = filteredNcSerialsData.filter(row => row.hasNc === "Y").length
    const totalReworkScrapCost = filteredPartYieldData.reduce((sum, row) => sum + row.reworkScrapCost, 0)
    
    return {
      rolledYield: Math.round(rolledYield * 10) / 10,
      unitsOnNc,
      avgMonthlyAOP: 87.3,
      itdQtyShipped: 1247,
      itdContracted: 1850,
      itdRemaining: 603,
      copqMaterial: totalReworkScrapCost,
      fpyBuy: buyMakeToggle === "Buy" ? rolledYield : 91.2,
      fpyMake: buyMakeToggle === "Make" ? rolledYield : 88.5,
    }
  }, [filteredPartYieldData, filteredNcSerialsData, buyMakeToggle])
  
  // Top FPY Loss Drivers
  const topLossDrivers = useMemo(() => {
    return [...filteredPartYieldData]
      .sort((a, b) => b.reworkScrapCost - a.reworkScrapCost)
      .slice(0, 5)
  }, [filteredPartYieldData])
  
  // Calculate totals row
  const totalsRow = useMemo(() => {
    const totalSnWithNc = filteredPartYieldData.reduce((sum, row) => sum + row.snWithNc, 0)
    const totalSnWithoutNc = filteredPartYieldData.reduce((sum, row) => sum + row.snWithoutNc, 0)
    const totalReworkScrapCost = filteredPartYieldData.reduce((sum, row) => sum + row.reworkScrapCost, 0)
    const avgYield = (totalSnWithoutNc / (totalSnWithNc + totalSnWithoutNc)) * 100
    const avgScrapRate = filteredPartYieldData.reduce((sum, row) => sum + row.scrapRate, 0) / (filteredPartYieldData.length || 1)
    const avgUnitCost = filteredPartYieldData.reduce((sum, row) => sum + row.unitCost, 0) / (filteredPartYieldData.length || 1)
    
    return {
      program: "All Serialized Parts",
      snWithNc: totalSnWithNc,
      snWithoutNc: totalSnWithoutNc,
      partYield: Math.round(avgYield * 10) / 10,
      scrapRate: Math.round(avgScrapRate * 10) / 10,
      unitCost: Math.round(avgUnitCost),
      reworkScrapCost: Math.round(totalReworkScrapCost),
    }
  }, [filteredPartYieldData])
  
  const handleClearFilters = () => {
    setSelectedPrograms(["All"])
    setTimeRange("Year")
    setPartSearch("")
    setNcStatus("All")
    setCoreValueChain("All")
    setDefectCategory("All")
    setProcessStep("All")
  }
  
  const getYieldColor = (partYield: number) => {
    if (partYield >= 95) return "bg-green-100"
    if (partYield >= 85) return "bg-yellow-100"
    return "bg-red-100"
  }
  
  const getScrapColor = (scrap: number) => {
    if (scrap <= 2) return "bg-green-100"
    if (scrap <= 5) return "bg-yellow-100"
    return "bg-red-100"
  }
  
  const getNcStatusBadge = (status: string) => {
    if (status === "Open" || status === "On Hold") return <Badge className="bg-red-600 text-white">{status}</Badge>
    if (status === "In Review" || status === "Rework in Progress") return <Badge className="bg-yellow-600 text-white">{status}</Badge>
    if (status === "Closed") return <Badge className="bg-green-600 text-white">{status}</Badge>
    return <Badge variant="outline">{status}</Badge>
  }
  
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">First Pass Yield</h1>
          <p className="text-sm text-gray-500">Last Refresh: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="border-2">
          <CardContent className="pt-6">
            <p className="text-xs font-semibold text-gray-600 mb-2">Top-Assembly on NC Hold</p>
            <p className="text-3xl font-bold text-red-600">{topKpis.topAssembliesOnHold}</p>
            <p className="text-xs text-gray-500 mt-2">Finished assemblies blocked from shipping</p>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="pt-6">
            <p className="text-xs font-semibold text-gray-600 mb-2">LTM Monthly AOP</p>
            <p className="text-3xl font-bold text-blue-600">{topKpis.ltmMonthlyAOP}%</p>
            <p className="text-xs text-gray-500 mt-2">Last 12 months performance vs plan</p>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="pt-6">
            <p className="text-xs font-semibold text-gray-600 mb-2">Quantity Shipped</p>
            <p className="text-3xl font-bold text-green-600">{topKpis.quantityShipped.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-2">Units delivered to customers</p>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="pt-6">
            <p className="text-xs font-semibold text-gray-600 mb-2">Remaining on Contract</p>
            <p className="text-3xl font-bold text-orange-600">{topKpis.remainingOnContract.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-2">Units left to build & deliver</p>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="pt-6">
            <p className="text-xs font-semibold text-gray-600 mb-2">Material Attrition</p>
            <p className="text-3xl font-bold text-red-600">{topKpis.materialAttrition}%</p>
            <p className="text-xs text-gray-500 mt-2">Material loss & waste</p>
          </CardContent>
        </Card>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-9 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-gray-600 mb-2">Rolled Yield of All Sub-Assemblies</p>
            <p className="text-2xl font-bold">{kpis.rolledYield}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-gray-600 mb-2">Final Assembly Units on NC/NCR</p>
            <p className="text-2xl font-bold">{kpis.unitsOnNc}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-gray-600 mb-2">Avg. Monthly AOP (LTM)</p>
            <p className="text-2xl font-bold">{kpis.avgMonthlyAOP}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-gray-600 mb-2">ITD Quantity Shipped</p>
            <p className="text-2xl font-bold">{kpis.itdQtyShipped}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-gray-600 mb-2">ITD Contracted - Shipped</p>
            <p className="text-2xl font-bold">{kpis.itdContracted - kpis.itdQtyShipped}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-gray-600 mb-2">ITD Remaining (Contract)</p>
            <p className="text-2xl font-bold">{kpis.itdRemaining}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-gray-600 mb-2">COPQ - Material</p>
            <p className="text-2xl font-bold">${(kpis.copqMaterial / 1000).toFixed(0)}K</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-gray-600 mb-2">FPY - Buy Parts</p>
            <p className="text-2xl font-bold">{kpis.fpyBuy.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-gray-600 mb-2">FPY - Make Parts</p>
            <p className="text-2xl font-bold">{kpis.fpyMake.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="border-t pt-4" />

      {/* Global Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Program</label>
              <Select value={selectedPrograms[0]} onValueChange={(val) => setSelectedPrograms([val])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Manpack Radio Program">Manpack Radio Program</SelectItem>
                  <SelectItem value="Vehicle Mount System">Vehicle Mount System</SelectItem>
                  <SelectItem value="Tactical HF Radio">Tactical HF Radio</SelectItem>
                  <SelectItem value="Base Station Program">Base Station Program</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[150px]">
              <label className="text-sm font-medium mb-2 block">Time Range</label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Year">Year</SelectItem>
                  <SelectItem value="Quarter">Quarter</SelectItem>
                  <SelectItem value="Month">Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Part/Item Search</label>
              <Input
                placeholder="Search part..."
                value={partSearch}
                onChange={(e) => setPartSearch(e.target.value)}
              />
            </div>

            <div className="flex-1 min-w-[150px]">
              <label className="text-sm font-medium mb-2 block">NC Status</label>
              <Select value={ncStatus} onValueChange={setNcStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="In Review">In Review</SelectItem>
                  <SelectItem value="Rework in Progress">Rework in Progress</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleClearFilters} variant="outline">
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Part Yield Details */}
          <Card>
            <CardHeader>
              <CardTitle>Part Yield Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Section Controls */}
              <div className="flex gap-4 flex-wrap">
                <div>
                  <label className="text-sm font-medium mb-2 block">Buy/Make</label>
                  <div className="flex gap-2">
                    <Button
                      variant={buyMakeToggle === "Buy" ? "default" : "outline"}
                      onClick={() => setBuyMakeToggle("Buy")}
                      size="sm"
                    >
                      Buy
                    </Button>
                    <Button
                      variant={buyMakeToggle === "Make" ? "default" : "outline"}
                      onClick={() => setBuyMakeToggle("Make")}
                      size="sm"
                    >
                      Make
                    </Button>
                  </div>
                </div>

                <div className="flex-1 min-w-[150px]">
                  <label className="text-sm font-medium mb-2 block">Core Value Chain</label>
                  <Select value={coreValueChain} onValueChange={setCoreValueChain}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All</SelectItem>
                      <SelectItem value="Machining">Machining</SelectItem>
                      <SelectItem value="Assembly">Assembly</SelectItem>
                      <SelectItem value="Test">Test</SelectItem>
                      <SelectItem value="Integration">Integration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 min-w-[150px]">
                  <label className="text-sm font-medium mb-2 block">Defect/NC Category</label>
                  <Select value={defectCategory} onValueChange={setDefectCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All</SelectItem>
                      <SelectItem value="Dimensional">Dimensional</SelectItem>
                      <SelectItem value="Documentation">Documentation</SelectItem>
                      <SelectItem value="Supplier Quality">Supplier Quality</SelectItem>
                      <SelectItem value="Process">Process</SelectItem>
                      <SelectItem value="Material">Material</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 min-w-[150px]">
                  <label className="text-sm font-medium mb-2 block">Process Step</label>
                  <Select value={processStep} onValueChange={setProcessStep}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All</SelectItem>
                      <SelectItem value="Station 1">Station 1</SelectItem>
                      <SelectItem value="Station 2">Station 2</SelectItem>
                      <SelectItem value="Station 3">Station 3</SelectItem>
                      <SelectItem value="Final Test">Final Test</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Top FPY Loss Drivers */}
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm font-semibold mb-2">Top FPY Loss Drivers (by Rework + Scrap Cost)</p>
                <div className="space-y-1">
                  {topLossDrivers.map((driver, idx) => (
                    <div key={idx} className="text-xs flex justify-between">
                      <span>{driver.program} - {driver.part}</span>
                      <span className="font-semibold text-red-600">${(driver.reworkScrapCost / 1000).toFixed(1)}K</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Part Yield Table */}
              <div className="border rounded overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Program</TableHead>
                      <TableHead>Part</TableHead>
                      <TableHead>SN with NC</TableHead>
                      <TableHead>SN without NC</TableHead>
                      <TableHead>Part Yield (%)</TableHead>
                      <TableHead>Scrap Rate (%)</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Rework + Scrap Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPartYieldData.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{row.program}</TableCell>
                        <TableCell>{row.part}</TableCell>
                        <TableCell>{row.snWithNc}</TableCell>
                        <TableCell>{row.snWithoutNc}</TableCell>
                        <TableCell className={getYieldColor(row.partYield)}>{row.partYield}%</TableCell>
                        <TableCell className={getScrapColor(row.scrapRate)}>{row.scrapRate}%</TableCell>
                        <TableCell>${row.unitCost.toLocaleString()}</TableCell>
                        <TableCell className="font-semibold">${row.reworkScrapCost.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    <TableRow className="bg-blue-50 font-bold">
                      <TableCell colSpan={2}>{totalsRow.program}</TableCell>
                      <TableCell>{totalsRow.snWithNc}</TableCell>
                      <TableCell>{totalsRow.snWithoutNc}</TableCell>
                      <TableCell className={getYieldColor(totalsRow.partYield)}>{totalsRow.partYield}%</TableCell>
                      <TableCell className={getScrapColor(totalsRow.scrapRate)}>{totalsRow.scrapRate}%</TableCell>
                      <TableCell>${totalsRow.unitCost.toLocaleString()}</TableCell>
                      <TableCell>${totalsRow.reworkScrapCost.toLocaleString()}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* All NC and WIP Completion Serials */}
          <Card>
            <CardHeader>
              <CardTitle>All NC and WIP Completion Serials</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sub-Assembly</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Serial</TableHead>
                      <TableHead>Has NC</TableHead>
                      <TableHead>NC Status</TableHead>
                      <TableHead>Days Open</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNcSerialsData.slice(0, 50).map((row, idx) => (
                      <TableRow key={idx} className={idx % 2 === 0 ? "bg-gray-50" : ""}>
                        <TableCell>{row.subAssembly}</TableCell>
                        <TableCell>{row.item}</TableCell>
                        <TableCell>{row.description}</TableCell>
                        <TableCell className="font-mono text-sm">{row.serial}</TableCell>
                        <TableCell>{row.hasNc}</TableCell>
                        <TableCell>{getNcStatusBadge(row.ncStatus)}</TableCell>
                        <TableCell className={row.daysOpen > 30 ? "text-red-600 font-semibold" : ""}>
                          {row.daysOpen > 0 ? row.daysOpen : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* Rollthrough Yield Over Time */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Rollthrough Yield Over Time</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={timeGranularity === "Monthly" ? "default" : "outline"}
                    onClick={() => setTimeGranularity("Monthly")}
                    size="sm"
                  >
                    Monthly
                  </Button>
                  <Button
                    variant={timeGranularity === "Weekly" ? "default" : "outline"}
                    onClick={() => setTimeGranularity("Weekly")}
                    size="sm"
                  >
                    Weekly
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={rollthroughYieldData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" label={{ value: 'Units', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="right" orientation="right" label={{ value: 'Yield %', angle: 90, position: 'insideRight' }} domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="units" fill="#2563EB" name="Units" />
                  <Line yAxisId="right" type="monotone" dataKey="rollthroughYield" stroke="#EA580C" strokeWidth={2} name="Rollthrough Yield %" />
                  <Line yAxisId="right" type="monotone" dataKey="target" stroke="#16A34A" strokeWidth={2} strokeDasharray="5 5" name="Target FPY" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Yield vs Volume Priority View */}
          <Card>
            <CardHeader>
              <CardTitle>Yield vs Volume Priority View</CardTitle>
              <p className="text-sm text-gray-500">High-volume, low-FPY parts (improvement priorities)</p>
            </CardHeader>
            <CardContent>
              <div className="border rounded overflow-auto max-h-[200px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Part</TableHead>
                      <TableHead>Volume (Units)</TableHead>
                      <TableHead>FPY (%)</TableHead>
                      <TableHead>Priority</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...filteredPartYieldData]
                      .sort((a, b) => {
                        const aVolume = a.snWithNc + a.snWithoutNc
                        const bVolume = b.snWithNc + b.snWithoutNc
                        const aPriority = aVolume * (100 - a.partYield)
                        const bPriority = bVolume * (100 - b.partYield)
                        return bPriority - aPriority
                      })
                      .slice(0, 10)
                      .map((row, idx) => {
                        const volume = row.snWithNc + row.snWithoutNc
                        const priority = volume * (100 - row.partYield)
                        return (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{row.part}</TableCell>
                            <TableCell>{volume}</TableCell>
                            <TableCell className={getYieldColor(row.partYield)}>{row.partYield}%</TableCell>
                            <TableCell>
                              <Badge variant={priority > 500 ? "destructive" : "default"}>
                                {priority > 500 ? "High" : "Medium"}
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

          {/* Material Cost of Units Currently on NC */}
          <Card>
            <CardHeader>
              <CardTitle>Material Cost of Units Currently on NC</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart
                  data={[
                    {
                      name: "Open NC/NCR",
                      materialCost: kpis.copqMaterial,
                      units: kpis.unitsOnNc,
                    },
                  ]}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="materialCost" fill="#1f2937" name="Material Cost ($)" />
                  <Line dataKey="units" stroke="#EA580C" strokeWidth={3} name="Units on Open NC/NCR" />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-600">Material Cost on NC</p>
                  <p className="text-2xl font-bold">${(kpis.copqMaterial / 1000).toFixed(0)}K</p>
                </div>
                <div className="bg-orange-50 p-3 rounded">
                  <p className="text-xs text-gray-600">Units on Open NC/NCR</p>
                  <p className="text-2xl font-bold">{kpis.unitsOnNc}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
