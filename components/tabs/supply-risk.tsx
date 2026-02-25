"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const majorSubassemblies = ["MSA1", "MSA2", "MSA3", "MSA4", "MSA5", "MSA6", "MSA7", "MSA8", "MSA9", "MSA10", "MSA11", "MSA12"];

export function SupplyRisk() {
  const [activeTab, setActiveTab] = useState("shortage-risk")
  
  // Filters for Tab 1 - Shortage Risk Forecast
  const [dateHorizon, setDateHorizon] = useState("14")
  const [programFilter, setProgramFilter] = useState("All")
  const [supplierFilter, setSupplierFilter] = useState("All")
  const [lobMsaFilter, setLobMsaFilter] = useState("All")
  const [riskLevelFilter, setRiskLevelFilter] = useState("All")
  const [showSafeParts, setShowSafeParts] = useState(false)

  // Filters for Tab 2 - Material Availability
  const [partFilter, setPartFilter] = useState("All")
  const [sourceTypeFilter, setSourceTypeFilter] = useState("All")
  const [partCriticalityFilter, setPartCriticalityFilter] = useState("All")
  const [viewMode, setViewMode] = useState("by-part") // by-part or by-program

  // Filters for Tab 3 - Supply Risk Intelligence
  const [riskOnlyFilter, setRiskOnlyFilter] = useState(true)
  const [timeHorizon, setTimeHorizon] = useState("30")
  const [tab3SupplierFilter, setTab3SupplierFilter] = useState("All")
  const [tab3ProgramFilter, setTab3ProgramFilter] = useState("All")

  // Filters for Tab 4 - Critical Path
  const [selectedProgram, setSelectedProgram] = useState("Manpack Radio Program")
  const [tab4RiskFilter, setTab4RiskFilter] = useState("All")
  
  // Filters for Tab 5 - Lead Time Risk
  const [leadTimeThreshold, setLeadTimeThreshold] = useState("30")
  const [tab5RiskFilter, setTab5RiskFilter] = useState("All")
  const [tab5ProgramFilter, setTab5ProgramFilter] = useState("All")

  // Filters for Tab 6 - Sourcing Strategy
  const [tab6ProgramFilter, setTab6ProgramFilter] = useState("All")
  const [tab6StatusFilter, setTab6StatusFilter] = useState("All")

  // Generate comprehensive sample data for Tab 1 - Shortage Risk Forecast
  const generateShortageRiskData = () => {
    const programs = ["Manpack Radio Program", "Vehicle Mount System", "Tactical HF Radio", "Base Station Program"]
    const suppliers = ["AeroSupply Inc", "Precision Parts Ltd", "FastConnect Co", "PowerTech Systems", "ElectroComponents", "MechParts Co", "SignalTech Inc", "TechSource Ltd"]
    const workstations = ["WS-1: Guidance Assembly", "WS-2: PCB Assembly", "WS-3: Final Assembly", "WS-4: Power Integration", "WS-5: Testing", "WS-6: Packaging"]
    const riskLevels = ["Critical", "High", "Medium", "Low"]
    const rootCauses = [
      "Supplier delay + high consumption",
      "No alternative source",
      "Consumption rate outpacing receipts",
      "Supplier delay",
      "Quality issues at supplier",
      "Transportation delays",
      "Raw material shortage at supplier",
      "Equipment failure at supplier facility",
      "Weather-related delays",
      "Incorrect forecast demand"
    ]

    const data = []
    for (let i = 1; i <= 45; i++) {
      const daysUntilStockout = Math.floor(Math.random() * 16) // 0-15 days
      let riskLevel
      if (daysUntilStockout <= 2) riskLevel = "Critical"
      else if (daysUntilStockout <= 5) riskLevel = "High"
      else if (daysUntilStockout <= 10) riskLevel = "Medium"
      else riskLevel = "Low"

      const msa1 = majorSubassemblies[Math.floor(Math.random() * majorSubassemblies.length)]
      const msa2 = majorSubassemblies[Math.floor(Math.random() * majorSubassemblies.length)]

      data.push({
        partNumber: `PN-2024-${String(1000 + i).padStart(4, '0')}`,
        description: `Part ${i} Component`,
        supplier: suppliers[Math.floor(Math.random() * suppliers.length)],
        program: programs[Math.floor(Math.random() * programs.length)],
        workstation: workstations[Math.floor(Math.random() * workstations.length)],
        lobMajorSubassemblies: `${msa1}, ${msa2}`,
        daysUntilStockout,
        rootCause: rootCauses[Math.floor(Math.random() * rootCauses.length)],
        riskLevel,
        status: daysUntilStockout <= 2 ? `Production stop in ${daysUntilStockout} days` :
                daysUntilStockout <= 5 ? `Severe risk in ${daysUntilStockout} days` :
                `Emerging risk in ${daysUntilStockout} days`,
        recommendedAction: riskLevel === "Critical" ? "Expedite shipment immediately" :
                          riskLevel === "High" ? "Add overtime shift" :
                          riskLevel === "Medium" ? "Increase safety stock" :
                          "Monitor situation"
      })
    }
    return data
  }

  // Generate comprehensive sample data for Tab 2 - Material Availability
  const generateMaterialAvailabilityData = () => {
    const programs = ["Manpack Radio Program", "Vehicle Mount System", "Tactical HF Radio", "Base Station Program"]
    const data = []
    for (let i = 1; i <= 40; i++) {
      // Source quantities
      const onHand = Math.floor(Math.random() * 200) + 10
      const benchStock = Math.floor(Math.random() * 50)
      const warehouse3PL = Math.floor(Math.random() * 80) // Assume same-day accessible
      const openPOs = Math.floor(Math.random() * 300) + 50
      const inHouseWIP = Math.floor(Math.random() * 100)
      
      // Available Now = On Hand + Bench Stock + 3PL (if same-day accessible)
      const availableNow = onHand + benchStock + warehouse3PL
      
      // Pipeline = Open POs + In-House WIP + remote 3PL (if any)
      const pipeline = openPOs + inHouseWIP
      
      // Calculate Days of Supply metrics
      const avgDailyDemand = Math.floor(Math.random() * 10) + 5 // 5-15 units/day
      const daysOfSupply = Math.round(availableNow / avgDailyDemand)
      const daysOfSupplyWithPipeline = Math.round((availableNow + pipeline) / avgDailyDemand)
      
      const safetyStock = Math.floor(Math.random() * 150) + 80
      const leadTimeToReplenish = Math.floor(Math.random() * 15) + 5 // 5-20 days
      const planningHorizon = 14 // days
      
      // Status thresholds:
      // Red: Days of Supply (Available Now) < lead time to next replenishment, OR Available Now < Safety Stock
      // Yellow: Available Now ≥ Safety Stock but Days of Supply < planning horizon (14 days)
      // Green: Days of Supply ≥ planning horizon AND Available Now ≥ Safety Stock
      let status
      if (daysOfSupply < leadTimeToReplenish || availableNow < safetyStock) {
        status = "Red"
      } else if (availableNow >= safetyStock && daysOfSupply < planningHorizon) {
        status = "Yellow"
      } else {
        status = "Green"
      }

      data.push({
        partNumber: `PN-2024-${String(1000 + i).padStart(4, '0')}`,
        description: `Component Part ${i}`,
        program: programs[Math.floor(Math.random() * programs.length)],
        onHand,
        benchStock,
        warehouse3PL,
        openPOs,
        inHouseWIP,
        availableNow,
        pipeline,
        avgDailyDemand,
        daysOfSupply,
        daysOfSupplyWithPipeline,
        safetyStock,
        leadTimeToReplenish,
        status
      })
    }
    return data
  }

  // Generate comprehensive sample data for Tab 3 - Supply Risk Intelligence
  const generateSupplyRiskIntelligenceData = () => {
    const suppliers = ["AeroSupply Inc", "Precision Parts Ltd", "FastConnect Co", "PowerTech Systems", "ElectroComponents", "MechParts Co", "SignalTech Inc", "TechSource Ltd"]
    const programs = ["Manpack Radio Program", "Vehicle Mount System", "Tactical HF Radio", "Base Station Program"]
    const drivers = [
      "Similar part delays, Recent OTD drop to 72%",
      "Lead-time variance +15%",
      "Supplier has 95% OTD",
      "Financial instability reported",
      "Quality issues on similar orders",
      "New supplier - limited history",
      "Strong track record, low risk",
      "Recent capacity expansion",
      "Material cost increases",
      "Geopolitical risks in supplier region"
    ]

    const data = []
    for (let i = 1; i <= 35; i++) {
      const riskScore = Math.floor(Math.random() * 100)
      let riskCategory
      if (riskScore >= 75) riskCategory = "High"
      else if (riskScore >= 50) riskCategory = "Medium"
      else riskCategory = "Low"

      const today = new Date()
      const futureDate = new Date(today.setDate(today.getDate() + Math.floor(Math.random() * 60)))
      
      data.push({
        part: `PN-2024-${String(1000 + i).padStart(4, '0')}`,
        supplier: suppliers[Math.floor(Math.random() * suppliers.length)],
        program: programs[Math.floor(Math.random() * programs.length)],
        expectedReceipt: futureDate.toISOString().split('T')[0],
        riskScore,
        riskCategory,
        keyDrivers: drivers[Math.floor(Math.random() * drivers.length)],
        recommendedAction: riskCategory === "High" ? "Order early, activate backup source" :
                          riskCategory === "Medium" ? "Increase safety stock by 25%" :
                          "Monitor only"
      })
    }
    return data
  }

  // Generate comprehensive sample data for Tab 4 - Critical Path Impact
  const generateCriticalPathData = () => {
    const programs = ["Manpack Radio Program", "Vehicle Mount System", "Tactical HF Radio", "Base Station Program"]
    const majorSubassemblies = ["MSA1, MSA2", "MSA3, MSA5", "MSA4, MSA7", "MSA7, MSA9", "MSA2, MSA5", "MSA8, MSA10", "MSA6, MSA11"]
    const statuses = ["At Risk", "Caution", "On Track"]

    const data = []
    for (let i = 1; i <= 30; i++) {
      const buffer = Math.floor(Math.random() * 25) - 5 // -5 to +20 days
      let currentStatus, riskLevel, impact
      
      if (buffer <= 0) {
        currentStatus = "At Risk"
        riskLevel = "Critical"
        impact = `${Math.abs(buffer) + 3} days program delay`
      } else if (buffer <= 3) {
        currentStatus = "Caution"
        riskLevel = "Medium"
        impact = `${Math.abs(buffer)} days program delay`
      } else {
        currentStatus = "On Track"
        riskLevel = "Low"
        impact = "No delay expected"
      }

      const today = new Date()
      const needDate = new Date(today.setDate(today.getDate() + Math.floor(Math.random() * 45)))

      data.push({
        part: `PN-2024-${String(1000 + i).padStart(4, '0')}`,
        program: programs[Math.floor(Math.random() * programs.length)],
        criticalMSAs: majorSubassemblies[Math.floor(Math.random() * majorSubassemblies.length)],
        needDate: needDate.toISOString().split('T')[0],
        currentStatus,
        daysOfBuffer: buffer,
        riskLevel,
        impact
      })
    }
    return data
  }

  // Generate comprehensive sample data for Tab 5 - Lead Time Risk Register
  const generateLeadTimeRiskData = () => {
    const suppliers = ["AeroSupply Inc", "Precision Parts Ltd", "FastConnect Co", "PowerTech Systems", "ElectroComponents", "MechParts Co", "SignalTech Inc", "TechSource Ltd"]
    const programs = ["Manpack Radio Program", "Vehicle Mount System", "Tactical HF Radio", "Base Station Program"]
    const majorSubassemblies = ["MSA1, MSA2", "MSA3, MSA5, MSA7", "MSA4, MSA7", "MSA7, MSA9", "MSA2, MSA5", "MSA8, MSA10"]
    const otdRates = ["72%", "88%", "95%", "82%", "78%", "91%", "68%", "85%"]

    const data = []
    for (let i = 1; i <= 38; i++) {
      const leadTime = Math.floor(Math.random() * 50) + 20 // 20-70 days
      const buffer = Math.floor(Math.random() * 20) - 5 // -5 to +15 days
      
      let riskLevel
      if (buffer <= 0) riskLevel = "Critical"
      else if (buffer <= 3) riskLevel = "High"
      else if (buffer <= 7) riskLevel = "Medium"
      else riskLevel = "Low"

      const orderDate = new Date()
      orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 30))
      
      const requiredDate = new Date()
      requiredDate.setDate(requiredDate.getDate() + Math.floor(Math.random() * 45))
      
      const expectedDate = new Date(requiredDate)
      expectedDate.setDate(expectedDate.getDate() - buffer)

      data.push({
        part: `PN-2024-${String(1000 + i).padStart(4, '0')}`,
        supplier: suppliers[Math.floor(Math.random() * suppliers.length)],
        program: programs[Math.floor(Math.random() * programs.length)],
        leadTime,
        dateOrdered: orderDate.toISOString().split('T')[0],
        requiredBy: requiredDate.toISOString().split('T')[0],
        expectedDelivery: expectedDate.toISOString().split('T')[0],
        buffer,
        supplierOTD: otdRates[Math.floor(Math.random() * otdRates.length)],
        dependentMSAs: majorSubassemblies[Math.floor(Math.random() * majorSubassemblies.length)],
        riskLevel
      })
    }
    return data
  }

  // Generate comprehensive sample data for Tab 6 - Critical Part Sourcing Strategy
  const generateSourcingStrategyData = () => {
    const programs = ["Manpack Radio Program", "Vehicle Mount System", "Tactical HF Radio", "Base Station Program"]
    const statuses = ["Delayed", "On Track", "At Risk"]
    const backupOptions = [
      ["3PL", "Secondary Supplier"],
      ["In-House", "3PL"],
      [],
      ["Secondary Supplier"],
      ["3PL"],
      ["In-House", "Secondary Supplier", "3PL"]
    ]
    const mitigationStatuses = ["Prepared", "Partially Prepared", "Not Prepared"]

    const data = []
    for (let i = 1; i <= 32; i++) {
      const primaryStatus = statuses[Math.floor(Math.random() * statuses.length)]
      const backups = backupOptions[Math.floor(Math.random() * backupOptions.length)]
      const mitigation = backups.length > 0 ? 
        (backups.length >= 2 ? "Prepared" : "Partially Prepared") : 
        "Not Prepared"

      data.push({
        part: `PN-2024-${String(1000 + i).padStart(4, '0')}`,
        program: programs[Math.floor(Math.random() * programs.length)],
        primarySupplierStatus: primaryStatus,
        backupSources: backups,
        activationRule: backups.length > 0 ? 
          `If primary misses Week ${Math.floor(Math.random() * 3) + 1} delivery` : 
          "None defined",
        mitigationStatus: mitigation,
        nextAction: mitigation === "Prepared" ? "Monitor primary supplier daily" :
                   mitigation === "Partially Prepared" ? "Confirm backup source inventory" :
                   "Define backup sourcing strategy"
      })
    }
    return data
  }

  const shortageRiskDataFull = useMemo(() => generateShortageRiskData(), [])
  const materialAvailabilityDataFull = useMemo(() => generateMaterialAvailabilityData(), [])
  const supplyRiskIntelligenceDataFull = useMemo(() => generateSupplyRiskIntelligenceData(), [])
  const criticalPathDataFull = useMemo(() => generateCriticalPathData(), [])
  const leadTimeRiskDataFull = useMemo(() => generateLeadTimeRiskData(), [])
  const sourcingStrategyDataFull = useMemo(() => generateSourcingStrategyData(), [])

  // Filter Tab 1 data
  const shortageRiskData = useMemo(() => {
    return shortageRiskDataFull.filter(item => {
      const matchesHorizon = parseInt(dateHorizon) >= item.daysUntilStockout
      const matchesProgram = programFilter === "All" || item.program === programFilter
      const matchesSupplier = supplierFilter === "All" || item.supplier === supplierFilter
      const matchesCP = lobMsaFilter === "All" || item.lobMajorSubassemblies.includes(lobMsaFilter)
      const matchesRisk = riskLevelFilter === "All" || item.riskLevel === riskLevelFilter
      const matchesSafe = showSafeParts || item.riskLevel !== "Low"
      
      return matchesHorizon && matchesProgram && matchesSupplier && matchesCP && matchesRisk && matchesSafe
    })
  }, [shortageRiskDataFull, dateHorizon, programFilter, supplierFilter, lobMsaFilter, riskLevelFilter, showSafeParts])

  // Filter Tab 2 data
  const materialAvailabilityData = useMemo(() => {
    return materialAvailabilityDataFull.filter(item => {
      const matchesPart = partFilter === "All" || item.partNumber.includes(partFilter)
      const matchesProgram = partCriticalityFilter === "All" || item.program === partCriticalityFilter
      const matchesStatus = sourceTypeFilter === "All" || item.status === sourceTypeFilter
      
      return matchesPart && matchesProgram && matchesStatus
    })
  }, [materialAvailabilityDataFull, partFilter, partCriticalityFilter, sourceTypeFilter])

  // Filter Tab 3 data
  const supplyRiskIntelligenceData = useMemo(() => {
    return supplyRiskIntelligenceDataFull.filter(item => {
      const matchesRiskOnly = !riskOnlyFilter || item.riskCategory !== "Low"
      const matchesSupplier = tab3SupplierFilter === "All" || item.supplier === tab3SupplierFilter
      const matchesProgram = tab3ProgramFilter === "All" || item.program === tab3ProgramFilter
      
      return matchesRiskOnly && matchesSupplier && matchesProgram
    })
  }, [supplyRiskIntelligenceDataFull, riskOnlyFilter, tab3SupplierFilter, tab3ProgramFilter])

  // Filter Tab 4 data
  const criticalPathData = useMemo(() => {
    return criticalPathDataFull.filter(item => {
      const matchesProgram = selectedProgram === "All" || item.program === selectedProgram
      const matchesRisk = tab4RiskFilter === "All" || item.riskLevel === tab4RiskFilter
      
      return matchesProgram && matchesRisk
    })
  }, [criticalPathDataFull, selectedProgram, tab4RiskFilter])

  // Filter Tab 5 data
  const leadTimeRiskData = useMemo(() => {
    return leadTimeRiskDataFull.filter(item => {
      const matchesThreshold = parseInt(leadTimeThreshold) >= item.leadTime || leadTimeThreshold === "All"
      const matchesRisk = tab5RiskFilter === "All" || item.riskLevel === tab5RiskFilter
      const matchesProgram = tab5ProgramFilter === "All" || item.program === tab5ProgramFilter
      
      return matchesThreshold && matchesRisk && matchesProgram
    })
  }, [leadTimeRiskDataFull, leadTimeThreshold, tab5RiskFilter, tab5ProgramFilter])

  // Filter Tab 6 data
  const sourcingStrategyData = useMemo(() => {
    return sourcingStrategyDataFull.filter(item => {
      const matchesProgram = tab6ProgramFilter === "All" || item.program === tab6ProgramFilter
      const matchesStatus = tab6StatusFilter === "All" || item.mitigationStatus === tab6StatusFilter
      
      return matchesProgram && matchesStatus
    })
  }, [sourcingStrategyDataFull, tab6ProgramFilter, tab6StatusFilter])

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "Critical": return "bg-red-600 text-white"
      case "High": return "bg-orange-500 text-white"
      case "Medium": return "bg-yellow-500 text-white"
      default: return "bg-green-600 text-white"
    }
  }

  const getDaysColor = (days: number) => {
    if (days <= 3) return "text-red-600 font-bold"
    if (days <= 7) return "text-orange-600 font-semibold"
    return "text-yellow-600"
  }

  const getBufferColor = (buffer: number) => {
    if (buffer <= 0) return "text-red-600 font-bold"
    if (buffer <= 3) return "text-orange-600 font-semibold"
    if (buffer <= 7) return "text-yellow-600"
    return "text-green-600"
  }

  const getMitigationStatusColor = (status: string) => {
    switch (status) {
      case "Prepared": return "bg-green-600 text-white"
      case "Partially Prepared": return "bg-yellow-500 text-white"
      case "Not Prepared": return "bg-red-600 text-white"
      default: return "bg-gray-500 text-white"
    }
  }

  const getStatusColor = (status: string) => {
    if (status === "Red") return "bg-red-100 border-red-500"
    if (status === "Yellow") return "bg-yellow-100 border-yellow-500"
    return "bg-green-100 border-green-500"
  }

  const getRiskScoreColor = (score: number) => {
    if (score >= 75) return "text-red-600 font-bold"
    if (score >= 50) return "text-orange-600 font-semibold"
    return "text-green-600"
  }

  // Calculate summary stats for Tab 1
  const tab1Stats = useMemo(() => {
    const total = shortageRiskData.length
    const critical = shortageRiskData.filter(item => item.riskLevel === "Critical").length
    const high = shortageRiskData.filter(item => item.riskLevel === "High").length
    const medium = shortageRiskData.filter(item => item.riskLevel === "Medium").length
    return { total, critical, high, medium }
  }, [shortageRiskData])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Supply Risk & Material Availability</h1>
        <p className="text-gray-600">Comprehensive supply chain risk management and material visibility</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="shortage-risk">Shortage Risk Forecast</TabsTrigger>
          <TabsTrigger value="material-availability">Material Availability</TabsTrigger>
          <TabsTrigger value="supply-intelligence">Supply Intelligence</TabsTrigger>
          <TabsTrigger value="critical-path">Critical Path Impact</TabsTrigger>
          <TabsTrigger value="lead-time-risk">Lead Time Risk</TabsTrigger>
          <TabsTrigger value="sourcing-strategy">Sourcing Strategy</TabsTrigger>
        </TabsList>

        {/* Tab 1 - Shortage Risk Forecast */}
        <TabsContent value="shortage-risk" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Total At-Risk Parts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{tab1Stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Critical (Red)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{tab1Stats.critical}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">High (Orange)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-500">{tab1Stats.high}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Medium (Yellow)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-500">{tab1Stats.medium}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <label className="text-sm font-medium mb-2 block">Date Horizon</label>
                <Select value={dateHorizon} onValueChange={setDateHorizon}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="text-sm font-medium mb-2 block">Program/Project</label>
                <Select value={programFilter} onValueChange={setProgramFilter}>
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
              <div className="flex-1 min-w-[180px]">
                <label className="text-sm font-medium mb-2 block">Supplier</label>
                <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="AeroSupply Inc">AeroSupply Inc</SelectItem>
                    <SelectItem value="Precision Parts Ltd">Precision Parts Ltd</SelectItem>
                    <SelectItem value="FastConnect Co">FastConnect Co</SelectItem>
                    <SelectItem value="PowerTech Systems">PowerTech Systems</SelectItem>
                    <SelectItem value="ElectroComponents">ElectroComponents</SelectItem>
                    <SelectItem value="MechParts Co">MechParts Co</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="text-sm font-medium mb-2 block">LOB Major Subassembly</label>
                <Select value={lobMsaFilter} onValueChange={setLobMsaFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    {Array.from({length: 12}, (_, i) => (
                      <SelectItem key={i} value={`CP${i+1}`}>CP{i+1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="text-sm font-medium mb-2 block">Risk Level</label>
                <Select value={riskLevelFilter} onValueChange={setRiskLevelFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  variant={showSafeParts ? "default" : "outline"}
                  onClick={() => setShowSafeParts(!showSafeParts)}
                >
                  {showSafeParts ? "Hide" : "Show"} Safe Parts
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card>
            <CardHeader>
              <CardTitle>Shortage Risk Forecast - {shortageRiskData.length} Parts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Part Number</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Workstation</TableHead>
                      <TableHead>LOB MSAs</TableHead>
                      <TableHead>Days Until Stockout</TableHead>
                      <TableHead>Root Cause</TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead>Recommended Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shortageRiskData.map((item, index) => (
                      <TableRow key={index} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                        <TableCell className="font-medium">{item.partNumber}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.supplier}</TableCell>
                        <TableCell>{item.program}</TableCell>
                        <TableCell>{item.workstation}</TableCell>
                        <TableCell>{item.lobMajorSubassemblies}</TableCell>
                        <TableCell className={getDaysColor(item.daysUntilStockout)}>{item.daysUntilStockout}</TableCell>
                        <TableCell className="text-sm">{item.rootCause}</TableCell>
                        <TableCell>
                          <Badge className={getRiskColor(item.riskLevel)}>{item.riskLevel}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{item.recommendedAction}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2 - Material Availability Snapshot */}
        <TabsContent value="material-availability" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <label className="text-sm font-medium mb-2 block">Part Number</label>
                <Input 
                  placeholder="Search part..." 
                  value={partFilter === "All" ? "" : partFilter}
                  onChange={(e) => setPartFilter(e.target.value || "All")}
                />
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="text-sm font-medium mb-2 block">Program</label>
                <Select value={partCriticalityFilter} onValueChange={setPartCriticalityFilter}>
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
              <div className="flex-1 min-w-[180px]">
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={sourceTypeFilter} onValueChange={setSourceTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="Red">Red (Critical)</SelectItem>
                    <SelectItem value="Yellow">Yellow (Warning)</SelectItem>
                    <SelectItem value="Green">Green (Good)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Legend Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-blue-900">📊 Key Definitions:</p>
                <p><strong>Available Now:</strong> On Hand + Bench Stock + 3PL (same-day accessible material)</p>
                <p><strong>Pipeline:</strong> Open POs + In-House WIP (material not yet available)</p>
                <p><strong>Days of Supply:</strong> Available Now ÷ Avg Daily Demand (how many days before running out)</p>
                <p className="font-semibold text-blue-900 pt-2">🚦 Status Rules:</p>
                <p><span className="inline-block w-4 h-4 bg-red-100 border-2 border-red-500 rounded mr-2"></span><strong>Red:</strong> Days of Supply &lt; Lead Time to Replenish OR Available Now &lt; Safety Stock</p>
                <p><span className="inline-block w-4 h-4 bg-yellow-100 border-2 border-yellow-500 rounded mr-2"></span><strong>Yellow:</strong> Available Now ≥ Safety Stock but Days of Supply &lt; 14 days</p>
                <p><span className="inline-block w-4 h-4 bg-green-100 border-2 border-green-500 rounded mr-2"></span><strong>Green:</strong> Days of Supply ≥ 14 days AND Available Now ≥ Safety Stock</p>
              </div>
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card>
            <CardHeader>
              <CardTitle>Material Availability - {materialAvailabilityData.length} Parts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Part Number</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>On Hand</TableHead>
                      <TableHead>Bench Stock</TableHead>
                      <TableHead>3PL Warehouse</TableHead>
                      <TableHead className="font-bold text-blue-700">Available Now</TableHead>
                      <TableHead>Open POs</TableHead>
                      <TableHead>In-House WIP</TableHead>
                      <TableHead className="font-bold text-purple-700">Pipeline</TableHead>
                      <TableHead>Avg Daily Demand</TableHead>
                      <TableHead className="font-bold">Days of Supply</TableHead>
                      <TableHead className="text-xs">(w/ Pipeline)</TableHead>
                      <TableHead>Safety Stock</TableHead>
                      <TableHead>Lead Time (days)</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materialAvailabilityData.map((item, index) => (
                      <TableRow key={index} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                        <TableCell className="font-medium">{item.partNumber}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.program}</TableCell>
                        <TableCell>{item.onHand}</TableCell>
                        <TableCell>{item.benchStock}</TableCell>
                        <TableCell>{item.warehouse3PL}</TableCell>
                        <TableCell className="font-bold text-blue-700 bg-blue-50">{item.availableNow}</TableCell>
                        <TableCell>{item.openPOs}</TableCell>
                        <TableCell>{item.inHouseWIP}</TableCell>
                        <TableCell className="font-bold text-purple-700 bg-purple-50">{item.pipeline}</TableCell>
                        <TableCell>{item.avgDailyDemand}/day</TableCell>
                        <TableCell className={`font-bold ${getDaysColor(item.daysOfSupply)}`}>{item.daysOfSupply} days</TableCell>
                        <TableCell className="text-gray-500 text-xs">{item.daysOfSupplyWithPipeline} days</TableCell>
                        <TableCell>{item.safetyStock}</TableCell>
                        <TableCell>{item.leadTimeToReplenish}</TableCell>
                        <TableCell>
                          <div className={`w-12 h-8 rounded border-2 ${getStatusColor(item.status)}`}></div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3 - Supply Risk Intelligence */}
        <TabsContent value="supply-intelligence" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <label className="text-sm font-medium mb-2 block">Supplier</label>
                <Select value={tab3SupplierFilter} onValueChange={setTab3SupplierFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="AeroSupply Inc">AeroSupply Inc</SelectItem>
                    <SelectItem value="Precision Parts Ltd">Precision Parts Ltd</SelectItem>
                    <SelectItem value="FastConnect Co">FastConnect Co</SelectItem>
                    <SelectItem value="PowerTech Systems">PowerTech Systems</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="text-sm font-medium mb-2 block">Program</label>
                <Select value={tab3ProgramFilter} onValueChange={setTab3ProgramFilter}>
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
              <div className="flex items-end">
                <Button 
                  variant={riskOnlyFilter ? "default" : "outline"}
                  onClick={() => setRiskOnlyFilter(!riskOnlyFilter)}
                >
                  {riskOnlyFilter ? "Show All" : "Risk Only"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card>
            <CardHeader>
              <CardTitle>Supply Risk Intelligence - {supplyRiskIntelligenceData.length} POs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Part</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Expected Receipt</TableHead>
                      <TableHead>Risk Score</TableHead>
                      <TableHead>Risk Category</TableHead>
                      <TableHead>Key Drivers</TableHead>
                      <TableHead>Recommended Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplyRiskIntelligenceData.map((item, index) => (
                      <TableRow key={index} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                        <TableCell className="font-medium">{item.part}</TableCell>
                        <TableCell>{item.supplier}</TableCell>
                        <TableCell>{item.program}</TableCell>
                        <TableCell>{item.expectedReceipt}</TableCell>
                        <TableCell className={getRiskScoreColor(item.riskScore)}>{item.riskScore}</TableCell>
                        <TableCell>
                          <Badge className={getRiskColor(item.riskCategory === "High" ? "High" : item.riskCategory === "Medium" ? "Medium" : "Low")}>
                            {item.riskCategory}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm max-w-xs">{item.keyDrivers}</TableCell>
                        <TableCell className="text-sm">{item.recommendedAction}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4 - Critical Path Impact Analysis */}
        <TabsContent value="critical-path" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <label className="text-sm font-medium mb-2 block">Program</label>
                <Select value={selectedProgram} onValueChange={setSelectedProgram}>
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
              <div className="flex-1 min-w-[180px]">
                <label className="text-sm font-medium mb-2 block">Risk Level</label>
                <Select value={tab4RiskFilter} onValueChange={setTab4RiskFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card>
            <CardHeader>
              <CardTitle>Critical Path Impact - {criticalPathData.length} Parts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Part</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Critical MSAs</TableHead>
                      <TableHead>Need Date</TableHead>
                      <TableHead>Current Status</TableHead>
                      <TableHead>Days of Buffer</TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead>Impact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {criticalPathData.map((item, index) => (
                      <TableRow key={index} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                        <TableCell className="font-medium">{item.part}</TableCell>
                        <TableCell>{item.program}</TableCell>
                        <TableCell>{item.criticalMSAs}</TableCell>
                        <TableCell>{item.needDate}</TableCell>
                        <TableCell>
                          <Badge variant={item.currentStatus === "At Risk" ? "destructive" : item.currentStatus === "Caution" ? "default" : "outline"}>
                            {item.currentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className={getBufferColor(item.daysOfBuffer)}>{item.daysOfBuffer}</TableCell>
                        <TableCell>
                          <Badge className={getRiskColor(item.riskLevel)}>{item.riskLevel}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{item.impact}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5 - Lead Time Risk Register */}
        <TabsContent value="lead-time-risk" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <label className="text-sm font-medium mb-2 block">Lead Time Threshold (days)</label>
                <Select value={leadTimeThreshold} onValueChange={setLeadTimeThreshold}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="30">30+ days</SelectItem>
                    <SelectItem value="45">45+ days</SelectItem>
                    <SelectItem value="60">60+ days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="text-sm font-medium mb-2 block">Risk Level</label>
                <Select value={tab5RiskFilter} onValueChange={setTab5RiskFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="text-sm font-medium mb-2 block">Program</label>
                <Select value={tab5ProgramFilter} onValueChange={setTab5ProgramFilter}>
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
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Time Risk Register - {leadTimeRiskData.length} Parts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Part</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Lead Time (days)</TableHead>
                      <TableHead>Date Ordered</TableHead>
                      <TableHead>Required By</TableHead>
                      <TableHead>Expected Delivery</TableHead>
                      <TableHead>Buffer (days)</TableHead>
                      <TableHead>Supplier OTD</TableHead>
                      <TableHead>Dependent MSAs</TableHead>
                      <TableHead>Risk Level</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leadTimeRiskData.map((item, index) => (
                      <TableRow key={index} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                        <TableCell className="font-medium">{item.part}</TableCell>
                        <TableCell>{item.supplier}</TableCell>
                        <TableCell>{item.program}</TableCell>
                        <TableCell>{item.leadTime}</TableCell>
                        <TableCell>{item.dateOrdered}</TableCell>
                        <TableCell>{item.requiredBy}</TableCell>
                        <TableCell>{item.expectedDelivery}</TableCell>
                        <TableCell className={getBufferColor(item.buffer)}>{item.buffer}</TableCell>
                        <TableCell>{item.supplierOTD}</TableCell>
                        <TableCell>{item.dependentMSAs}</TableCell>
                        <TableCell>
                          <Badge className={getRiskColor(item.riskLevel)}>{item.riskLevel}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 6 - Critical Part Sourcing Strategy */}
        <TabsContent value="sourcing-strategy" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <label className="text-sm font-medium mb-2 block">Program</label>
                <Select value={tab6ProgramFilter} onValueChange={setTab6ProgramFilter}>
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
              <div className="flex-1 min-w-[180px]">
                <label className="text-sm font-medium mb-2 block">Mitigation Status</label>
                <Select value={tab6StatusFilter} onValueChange={setTab6StatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="Prepared">Prepared</SelectItem>
                    <SelectItem value="Partially Prepared">Partially Prepared</SelectItem>
                    <SelectItem value="Not Prepared">Not Prepared</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card>
            <CardHeader>
              <CardTitle>Sourcing Strategy - {sourcingStrategyData.length} Parts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Part</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Primary Supplier Status</TableHead>
                      <TableHead>Backup Sources</TableHead>
                      <TableHead>Activation Rule</TableHead>
                      <TableHead>Mitigation Status</TableHead>
                      <TableHead>Next Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sourcingStrategyData.map((item, index) => (
                      <TableRow key={index} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                        <TableCell className="font-medium">{item.part}</TableCell>
                        <TableCell>{item.program}</TableCell>
                        <TableCell>
                          <Badge variant={item.primarySupplierStatus === "On Track" ? "outline" : "destructive"}>
                            {item.primarySupplierStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.backupSources.length > 0 ? (
                            <div className="flex gap-1">
                              {item.backupSources.map((source, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {source}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">None</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{item.activationRule}</TableCell>
                        <TableCell>
                          <Badge className={getMitigationStatusColor(item.mitigationStatus)}>
                            {item.mitigationStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{item.nextAction}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
