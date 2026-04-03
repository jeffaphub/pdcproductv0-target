"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

const programs = ["Manpack Radio Program", "Vehicle Mount System", "Tactical HF Radio", "Base Station Program"]
const sites = ["Site A - Assembly", "Site B - Manufacturing", "Site C - Integration", "Site D - Testing"]
const items = ["Radio Unit - Model A", "Radio Unit - Model B", "Antenna Assembly", "Power Supply", "Control Module"]

// Historical data for stacked bar charts
const historicalStartsData = [
  { month: "Jan", scheduled: 45, scrap: 3, startedOnTime: 38, startedLate: 7, outstanding: 12 },
  { month: "Feb", scheduled: 50, scrap: 2, startedOnTime: 42, startedLate: 8, outstanding: 10 },
  { month: "Mar", scheduled: 48, scrap: 4, startedOnTime: 40, startedLate: 6, outstanding: 14 },
  { month: "Apr", scheduled: 55, scrap: 3, startedOnTime: 45, startedLate: 10, outstanding: 8 },
  { month: "May", scheduled: 52, scrap: 5, startedOnTime: 43, startedLate: 7, outstanding: 11 },
  { month: "Jun", scheduled: 60, scrap: 2, startedOnTime: 50, startedLate: 12, outstanding: 6 },
]

const historicalCompletionsData = [
  { month: "Jan", scheduled: 42, scrap: 2, completedOnTime: 35, completedLate: 8, outstanding: 9 },
  { month: "Feb", scheduled: 48, scrap: 3, completedOnTime: 40, completedLate: 7, outstanding: 11 },
  { month: "Mar", scheduled: 46, scrap: 4, completedOnTime: 38, completedLate: 6, outstanding: 12 },
  { month: "Apr", scheduled: 53, scrap: 2, completedOnTime: 44, completedLate: 9, outstanding: 8 },
  { month: "May", scheduled: 50, scrap: 5, completedOnTime: 41, completedLate: 6, outstanding: 13 },
  { month: "Jun", scheduled: 58, scrap: 3, completedOnTime: 48, completedLate: 10, outstanding: 7 },
]

// Forecasted data
const forecastedStartsData = [
  { month: "Jul", contractedDelivery: 55, expectedDelivery: 52, plannedBuildCompletion: 50 },
  { month: "Aug", contractedDelivery: 60, expectedDelivery: 58, plannedBuildCompletion: 56 },
  { month: "Sep", contractedDelivery: 58, expectedDelivery: 56, plannedBuildCompletion: 54 },
  { month: "Oct", contractedDelivery: 65, expectedDelivery: 62, plannedBuildCompletion: 60 },
  { month: "Nov", contractedDelivery: 62, expectedDelivery: 60, plannedBuildCompletion: 58 },
  { month: "Dec", contractedDelivery: 70, expectedDelivery: 68, plannedBuildCompletion: 65 },
]

export function BuildPlan() {
  const [activeSection, setActiveSection] = useState<"historical" | "forecasted">("historical")
  
  // Historical filters
  const [histProgram, setHistProgram] = useState(programs[0])
  const [histSite, setHistSite] = useState(sites[0])
  const [histItem, setHistItem] = useState(items[0])
  const [histStartDate, setHistStartDate] = useState("2024-01-01")
  const [histEndDate, setHistEndDate] = useState("2024-06-30")
  
  // Forecasted filters
  const [foreProgram, setForeProgram] = useState(programs[0])
  const [foreSite, setForeSite] = useState(sites[0])
  const [foreItem, setForeItem] = useState(items[0])
  const [foreStartDate, setForeStartDate] = useState("2024-07-01")
  const [foreEndDate, setForeEndDate] = useState("2024-12-31")

  // Historical KPIs
  const historicalKPIs = {
    buildStartOnTime: 82.5,
    buildCompletionOnTime: 79.3,
    lateStartCompletion: 15.8,
    startCompletionOnTime: 76.2,
  }

  // Forecasted KPIs
  const forecastedKPIs = {
    remainingDeliveries: 370,
    remainingBuildCompletions: 343,
    finalContractedDelivery: "2024-12-31",
    latestScheduledDelivery: "2024-12-28",
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Build Plan</h2>
        <p className="text-sm text-gray-500 mt-1">Monitor and forecast production build schedules</p>
      </div>

      <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as "historical" | "forecasted")}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="historical">Historical Build Plan Performance</TabsTrigger>
          <TabsTrigger value="forecasted">Forecasted Build Plan</TabsTrigger>
        </TabsList>

        {/* Historical Build Plan Performance */}
        <TabsContent value="historical" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>Program/Project</Label>
                  <Select value={histProgram} onValueChange={setHistProgram}>
                    <SelectTrigger>
                      <SelectValue />
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
                  <Select value={histSite} onValueChange={setHistSite}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Item / Item Description</Label>
                  <Select value={histItem} onValueChange={setHistItem}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((i) => (
                        <SelectItem key={i} value={i}>{i}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Demand Date From</Label>
                  <Input type="date" value={histStartDate} onChange={(e) => setHistStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Demand Date To</Label>
                  <Input type="date" value={histEndDate} onChange={(e) => setHistEndDate(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">Build Start on Time</p>
                  <p className="text-3xl font-bold text-green-600">{historicalKPIs.buildStartOnTime}%</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">Build Completion on Time</p>
                  <p className="text-3xl font-bold text-green-600">{historicalKPIs.buildCompletionOnTime}%</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">Late Start & Completion</p>
                  <p className="text-3xl font-bold text-red-600">{historicalKPIs.lateStartCompletion}%</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">Start & Completion on Time</p>
                  <p className="text-3xl font-bold text-blue-600">{historicalKPIs.startCompletionOnTime}%</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-6">
            {/* Historical Build Starts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Historical Build Starts by Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={historicalStartsData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis 
                        label={{ value: 'Quantity', angle: -90, position: 'insideLeft', fontSize: 12 }}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="scheduled" stackId="a" fill="#64748b" name="Scheduled" />
                      <Bar dataKey="scrap" stackId="a" fill="#DC2626" name="Scrap" />
                      <Bar dataKey="startedOnTime" stackId="a" fill="#16A34A" name="Started on Time" />
                      <Bar dataKey="startedLate" stackId="a" fill="#EA580C" name="Started Late" />
                      <Bar dataKey="outstanding" stackId="a" fill="#2563EB" name="Outstanding" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Historical Build Completions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Historical Build Plan Completions by Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={historicalCompletionsData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis 
                        label={{ value: 'Quantity', angle: -90, position: 'insideLeft', fontSize: 12 }}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="scheduled" stackId="a" fill="#64748b" name="Scheduled" />
                      <Bar dataKey="scrap" stackId="a" fill="#DC2626" name="Scrap" />
                      <Bar dataKey="completedOnTime" stackId="a" fill="#16A34A" name="Completed on Time" />
                      <Bar dataKey="completedLate" stackId="a" fill="#EA580C" name="Completed Late" />
                      <Bar dataKey="outstanding" stackId="a" fill="#2563EB" name="Outstanding" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Forecasted Build Plan */}
        <TabsContent value="forecasted" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>Program/Project</Label>
                  <Select value={foreProgram} onValueChange={setForeProgram}>
                    <SelectTrigger>
                      <SelectValue />
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
                  <Select value={foreSite} onValueChange={setForeSite}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Item / Item Description</Label>
                  <Select value={foreItem} onValueChange={setForeItem}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((i) => (
                        <SelectItem key={i} value={i}>{i}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Demand Date From</Label>
                  <Input type="date" value={foreStartDate} onChange={(e) => setForeStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Demand Date To</Label>
                  <Input type="date" value={foreEndDate} onChange={(e) => setForeEndDate(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">Remaining Deliveries</p>
                  <p className="text-3xl font-bold text-gray-900">{forecastedKPIs.remainingDeliveries}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">Remaining Build Completions</p>
                  <p className="text-3xl font-bold text-gray-900">{forecastedKPIs.remainingBuildCompletions}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">Final Contracted Delivery</p>
                  <p className="text-xl font-bold text-gray-900">{forecastedKPIs.finalContractedDelivery}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">Latest Scheduled Delivery</p>
                  <p className="text-xl font-bold text-gray-900">{forecastedKPIs.latestScheduledDelivery}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Forecasted Build Plan Starts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[450px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={forecastedStartsData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Month', position: 'bottom', offset: 0, fontSize: 12 }}
                    />
                    <YAxis 
                      label={{ value: 'Count', angle: -90, position: 'insideLeft', fontSize: 12 }}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="contractedDelivery" fill="#1D4ED8" name="Contracted Delivery" barSize={40} />
                    <Bar dataKey="expectedDelivery" fill="#16A34A" name="Expected Delivery" barSize={40} />
                    <Bar dataKey="plannedBuildCompletion" fill="#EA580C" name="Planned Build Completion" barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
