"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

type ViewTab = "calendar" | "program" | "supplier"
type MetricType = "quantity" | "shipments"

export function SupplierOTD() {
  const [activeView, setActiveView] = useState<ViewTab>("program")
  const [metricType, setMetricType] = useState<MetricType>("shipments")
  const [poSearch, setPoSearch] = useState<string>("All")
  const [otdStatusFilter, setOtdStatusFilter] = useState<string>("All")
  const [shipmentTypeFilter, setShipmentTypeFilter] = useState<string>("All")

  // KPI Data
  const kpiData = {
    historicalOTD: 87.5,
    ytdOTD: 89.2,
    overallOTD: 88.3,
    forecastedOTD: 91.0,
    avgDaysLate: 4.2,
  }

  // Data varies by view and metric type
  const getHistoricalData = () => {
    const multiplier = metricType === "quantity" ? 1 : 0.1 // Shipments are ~10% of quantity
    
    if (activeView === "supplier") {
      return [
        { name: "AeroSupply Inc", onTime: Math.round(450 * multiplier), lateReceived: Math.round(80 * multiplier), lateNotReceived: Math.round(20 * multiplier) },
        { name: "Precision Parts Ltd", onTime: Math.round(320 * multiplier), lateReceived: Math.round(45 * multiplier), lateNotReceived: Math.round(15 * multiplier) },
        { name: "FastConnect Co", onTime: Math.round(280 * multiplier), lateReceived: Math.round(60 * multiplier), lateNotReceived: Math.round(10 * multiplier) },
        { name: "PowerTech Systems", onTime: Math.round(410 * multiplier), lateReceived: Math.round(35 * multiplier), lateNotReceived: Math.round(25 * multiplier) },
        { name: "ElectroComponents", onTime: Math.round(380 * multiplier), lateReceived: Math.round(50 * multiplier), lateNotReceived: Math.round(18 * multiplier) },
      ]
    } else if (activeView === "program") {
      return [
        { name: "Manpack Radio", onTime: Math.round(520 * multiplier), lateReceived: Math.round(65 * multiplier), lateNotReceived: Math.round(28 * multiplier) },
        { name: "Vehicle Mount", onTime: Math.round(380 * multiplier), lateReceived: Math.round(48 * multiplier), lateNotReceived: Math.round(22 * multiplier) },
        { name: "Tactical HF Radio", onTime: Math.round(340 * multiplier), lateReceived: Math.round(55 * multiplier), lateNotReceived: Math.round(18 * multiplier) },
        { name: "Base Station", onTime: Math.round(290 * multiplier), lateReceived: Math.round(42 * multiplier), lateNotReceived: Math.round(15 * multiplier) },
      ]
    } else { // calendar view - by month
      return [
        { name: "Jan 2024", onTime: Math.round(380 * multiplier), lateReceived: Math.round(55 * multiplier), lateNotReceived: Math.round(12 * multiplier) },
        { name: "Feb 2024", onTime: Math.round(420 * multiplier), lateReceived: Math.round(48 * multiplier), lateNotReceived: Math.round(18 * multiplier) },
        { name: "Mar 2024", onTime: Math.round(460 * multiplier), lateReceived: Math.round(42 * multiplier), lateNotReceived: Math.round(15 * multiplier) },
        { name: "Apr 2024", onTime: Math.round(390 * multiplier), lateReceived: Math.round(52 * multiplier), lateNotReceived: Math.round(20 * multiplier) },
      ]
    }
  }

  const getForecastedData = () => {
    const multiplier = metricType === "quantity" ? 1 : 0.1
    
    if (activeView === "supplier") {
      return [
        { name: "AeroSupply Inc", onTrack: Math.round(520 * multiplier), atRisk: Math.round(45 * multiplier) },
        { name: "Precision Parts Ltd", onTrack: Math.round(340 * multiplier), atRisk: Math.round(28 * multiplier) },
        { name: "FastConnect Co", onTrack: Math.round(290 * multiplier), atRisk: Math.round(35 * multiplier) },
        { name: "PowerTech Systems", onTrack: Math.round(450 * multiplier), atRisk: Math.round(22 * multiplier) },
        { name: "ElectroComponents", onTrack: Math.round(410 * multiplier), atRisk: Math.round(38 * multiplier) },
      ]
    } else if (activeView === "program") {
      return [
        { name: "Manpack Radio", onTrack: Math.round(580 * multiplier), atRisk: Math.round(52 * multiplier) },
        { name: "Vehicle Mount", onTrack: Math.round(420 * multiplier), atRisk: Math.round(38 * multiplier) },
        { name: "Tactical HF Radio", onTrack: Math.round(380 * multiplier), atRisk: Math.round(42 * multiplier) },
        { name: "Base Station", onTrack: Math.round(320 * multiplier), atRisk: Math.round(28 * multiplier) },
      ]
    } else { // calendar view
      return [
        { name: "May 2024", onTrack: Math.round(440 * multiplier), atRisk: Math.round(32 * multiplier) },
        { name: "Jun 2024", onTrack: Math.round(480 * multiplier), atRisk: Math.round(28 * multiplier) },
        { name: "Jul 2024", onTrack: Math.round(510 * multiplier), atRisk: Math.round(35 * multiplier) },
        { name: "Aug 2024", onTrack: Math.round(460 * multiplier), atRisk: Math.round(42 * multiplier) },
      ]
    }
  }

  const historicalData = getHistoricalData()
  const forecastedData = getForecastedData()

  // Table Data
  const tableData = [
    {
      poLineShipment: "PO-2024-001-1-1",
      partNumber: "PN-7845-A",
      description: "Chassis Assembly Kit",
      category: "Structural",
      shipmentType: "Standard",
      otdStatus: "On-Time",
      lineLevelOTD: 100,
      firstReceiptDate: "2024-01-15",
      lastReceiptDate: "2024-01-15",
      promiseDate: "2024-01-15",
      contractDate: "2023-12-01",
      grade: "A",
    },
    {
      poLineShipment: "PO-2024-001-2-1",
      partNumber: "PN-2341-B",
      description: "PCB Board Set",
      category: "Electronics",
      shipmentType: "Expedited",
      otdStatus: "Late",
      lineLevelOTD: 75,
      firstReceiptDate: "2024-01-18",
      lastReceiptDate: "2024-01-22",
      promiseDate: "2024-01-16",
      contractDate: "2023-12-01",
      grade: "C",
    },
    {
      poLineShipment: "PO-2024-002-1-1",
      partNumber: "PN-9982-C",
      description: "RF Module Components",
      category: "Electronics",
      shipmentType: "Partial",
      otdStatus: "At-Risk",
      lineLevelOTD: 50,
      firstReceiptDate: "2024-01-20",
      lastReceiptDate: "",
      promiseDate: "2024-01-25",
      contractDate: "2023-12-05",
      grade: "B",
    },
    {
      poLineShipment: "PO-2024-003-1-1",
      partNumber: "PN-4456-D",
      description: "Antenna Array",
      category: "RF Systems",
      shipmentType: "Full",
      otdStatus: "On-Time",
      lineLevelOTD: 100,
      firstReceiptDate: "2024-01-12",
      lastReceiptDate: "2024-01-12",
      promiseDate: "2024-01-14",
      contractDate: "2023-12-03",
      grade: "A",
    },
    {
      poLineShipment: "PO-2024-004-1-1",
      partNumber: "PN-5567-E",
      description: "Power Supply Unit",
      category: "Power Systems",
      shipmentType: "Standard",
      otdStatus: "Late",
      lineLevelOTD: 60,
      firstReceiptDate: "2024-01-25",
      lastReceiptDate: "",
      promiseDate: "2024-01-20",
      contractDate: "2023-12-10",
      grade: "D",
    },
    {
      poLineShipment: "PO-2024-005-1-1",
      partNumber: "PN-8823-F",
      description: "Connector Harness",
      category: "Wiring",
      shipmentType: "Standard",
      otdStatus: "Outstanding",
      lineLevelOTD: 0,
      firstReceiptDate: "",
      lastReceiptDate: "",
      promiseDate: "2024-01-30",
      contractDate: "2023-12-15",
      grade: "B",
    },
    {
      poLineShipment: "PO-2024-006-1-1",
      partNumber: "PN-3345-G",
      description: "Mounting Bracket Set",
      category: "Hardware",
      shipmentType: "Full",
      otdStatus: "On-Time",
      lineLevelOTD: 100,
      firstReceiptDate: "2024-01-10",
      lastReceiptDate: "2024-01-10",
      promiseDate: "2024-01-12",
      contractDate: "2023-12-02",
      grade: "A",
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "On-Time":
        return "bg-green-100 text-green-800"
      case "Late":
        return "bg-red-100 text-red-800"
      case "At-Risk":
        return "bg-yellow-100 text-yellow-800"
      case "Outstanding":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleClearSearch = () => {
    setPoSearch("All")
    setOtdStatusFilter("All")
    setShipmentTypeFilter("All")
  }

  // Filter table data based on selected filters
  const filteredTableData = tableData.filter((row) => {
    const matchesPO = poSearch === "All" || row.poLineShipment.includes(poSearch)
    const matchesStatus = otdStatusFilter === "All" || row.otdStatus === otdStatusFilter
    const matchesShipmentType = shipmentTypeFilter === "All" || row.shipmentType === shipmentTypeFilter
    return matchesPO && matchesStatus && matchesShipmentType
  })

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Supplier On-Time Delivery</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant={metricType === "quantity" ? "default" : "outline"}
            onClick={() => setMetricType("quantity")}
            size="sm"
          >
            Quantity
          </Button>
          <Button
            variant={metricType === "shipments" ? "default" : "outline"}
            onClick={() => setMetricType("shipments")}
            size="sm"
          >
            Shipments
          </Button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveView("calendar")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeView === "calendar"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Calendar View
        </button>
        <button
          onClick={() => setActiveView("program")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeView === "program"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Program View
        </button>
        <button
          onClick={() => setActiveView("supplier")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeView === "supplier"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Supplier View
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Historical OTD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpiData.historicalOTD}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">YTD OTD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpiData.ytdOTD}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Overall OTD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpiData.overallOTD}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Forecasted OTD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpiData.forecastedOTD}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg. Days Late</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpiData.avgDaysLate}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-2 gap-6">
        {/* Historical On-Time Delivery Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Historical On-Time Delivery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={historicalData} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={90} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="onTime" stackId="a" fill="#1D4ED8" name="On-Time" />
                  <Bar dataKey="lateReceived" stackId="a" fill="#DC2626" name="Late - Received" />
                  <Bar dataKey="lateNotReceived" stackId="a" fill="#FCA5A5" name="Late - Not Received" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Forecasted On-Time Delivery Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Forecasted On-Time Delivery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecastedData} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={90} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="onTrack" stackId="a" fill="#1D4ED8" name="On-Track" />
                  <Bar dataKey="atRisk" stackId="a" fill="#DC2626" name="At-Risk" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Search for a PO</label>
              <Input 
                placeholder="Search PO number..." 
                value={poSearch === "All" ? "" : poSearch}
                onChange={(e) => setPoSearch(e.target.value || "All")}
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">OTD Status</label>
              <Select value={otdStatusFilter} onValueChange={setOtdStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="On-Time">On-Time</SelectItem>
                  <SelectItem value="Late">Late</SelectItem>
                  <SelectItem value="At-Risk">At-Risk</SelectItem>
                  <SelectItem value="Outstanding">Outstanding</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Shipment Type</label>
              <Select value={shipmentTypeFilter} onValueChange={setShipmentTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Expedited">Expedited</SelectItem>
                  <SelectItem value="Partial">Partial</SelectItem>
                  <SelectItem value="Full">Full</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleClearSearch} variant="outline">
                Clear Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Shipment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="font-semibold">PO-Line-Shipment</TableHead>
                  <TableHead className="font-semibold">Part Number</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold">Shipment Type</TableHead>
                  <TableHead className="font-semibold">Shipment OTD Status</TableHead>
                  <TableHead className="font-semibold text-right">Line Level OTD</TableHead>
                  <TableHead className="font-semibold">First Receipt Date</TableHead>
                  <TableHead className="font-semibold">Last Receipt Date</TableHead>
                  <TableHead className="font-semibold">Promise Date</TableHead>
                  <TableHead className="font-semibold">Contract Date</TableHead>
                  <TableHead className="font-semibold text-center">Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTableData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-gray-500 py-8">
                      No results found. Try adjusting your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTableData.map((row, index) => (
                    <TableRow key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <TableCell className="font-medium">{row.poLineShipment}</TableCell>
                      <TableCell>{row.partNumber}</TableCell>
                      <TableCell>{row.description}</TableCell>
                      <TableCell>{row.category}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {row.shipmentType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(row.otdStatus)}>{row.otdStatus}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{row.lineLevelOTD}%</TableCell>
                      <TableCell>{row.firstReceiptDate || "-"}</TableCell>
                      <TableCell>{row.lastReceiptDate || "-"}</TableCell>
                      <TableCell>{row.promiseDate}</TableCell>
                      <TableCell>{row.contractDate}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={
                            row.grade === "A"
                              ? "bg-green-100 text-green-800"
                              : row.grade === "B"
                              ? "bg-blue-100 text-blue-800"
                              : row.grade === "C"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {row.grade}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
