"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react"

interface MajorSubassemblyDetailsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  majorSubassembly: {
    id: number
    name: string
    description?: string
    cumulativeUnits: number
    lobTarget: number
    type: string
    leadTime: number
  } | null
}

// Generate detailed data for a control point
function generateMajorSubassemblyData(msaId: number) {
  const variance = Math.random() * 30 - 15 // -15 to +15
  const isOnSchedule = variance > -5
  const isAtRisk = variance >= -10 && variance <= -5
  const isBehind = variance < -10

  return {
    // KPIs
    unitsProduced: 58 + Math.floor(Math.random() * 10),
    lobRequirement: 65,
    scheduleVariance: variance,
    daysUntilImpact: Math.floor(Math.random() * 10) + 3,
    status: isBehind ? "behind" : isAtRisk ? "at-risk" : "on-schedule",

    // Capacity & Throughput
    capacity: {
      designedCapacityPerDay: 8 + Math.floor(Math.random() * 4),
      actualAverageRate: 6.5 + Math.random() * 2,
      utilizationPercent: 75 + Math.random() * 20,
      primaryConstraint: "Workstation 2: Riveting",
      workstations: [
        { name: "Workstation 1: Cutting", unitsProduced: 145, status: "Operational", uptime: 92 },
        { name: "Workstation 2: Riveting", unitsProduced: 98, status: "At Capacity", uptime: 78 },
        { name: "Workstation 3: Assembly", unitsProduced: 132, status: "Operational", uptime: 88 },
        { name: "Workstation 4: Testing", unitsProduced: 128, status: "Operational", uptime: 95 },
      ],
    },

    // Resource Constraints
    resources: {
      labor: {
        plannedHeadcount: 12,
        actualAssigned: 10,
        overtimeHours: 48,
        skillsGaps: "2 positions unfilled, need Level 3 welders",
      },
      equipment: {
        availabilityPercent: 82,
        downtimeHours: 16,
        changeoverTime: 2.5,
        queueDepth: 23,
      },
      material: {
        bomCompleteness: 94,
        daysInventory: 5,
        criticalMissingParts: [
          { part: "Shell Components", supplier: "AeroSupply Inc", daysLate: 3, status: "In Transit" },
          { part: "Fasteners Kit-B", supplier: "FastenCo", daysLate: 1, status: "Delayed" },
        ],
      },
    },

    // Root Cause
    rootCause: {
      primaryConstraint: "Equipment Capacity (Workstation 2)",
      secondaryIssues: [
        { issue: "Supplier delay on shell components", impact: "High" },
        { issue: "Equipment changeover time on WS2", impact: "Medium" },
        { issue: "Labor shortage (2 positions)", impact: "Medium" },
      ],
      explanation:
        "Behind schedule due to supplier delay on shell components (3 days late) + equipment changeover time on WS2 reducing throughput. Labor shortage contributing to slower assembly rate.",
    },

    // Forecast & Risk
    forecast: {
      projectedCatchUpDate: "May 18, 2024",
      daysToCascade: 6,
      recommendedActions: [
        { priority: 1, action: "Expedite shell component shipment with AeroSupply" },
        { priority: 2, action: "Add overtime shift on WS2 to increase throughput" },
        { priority: 3, action: "Recruit 2 Level 3 welders or provide training" },
        { priority: 4, action: "Optimize changeover procedures on WS2" },
      ],
    },

    // 7-day trending data
    trendingData: [
      { day: "Day 1", production: 5.8, lobRequirement: 9.3 },
      { day: "Day 2", production: 6.2, lobRequirement: 9.3 },
      { day: "Day 3", production: 5.9, lobRequirement: 9.3 },
      { day: "Day 4", production: 6.8, lobRequirement: 9.3 },
      { day: "Day 5", production: 7.1, lobRequirement: 9.3 },
      { day: "Day 6", production: 6.9, lobRequirement: 9.3 },
      { day: "Day 7", production: 7.4, lobRequirement: 9.3 },
    ],
  }
}

export function MajorSubassemblyDetails({ open, onOpenChange, majorSubassembly }: MajorSubassemblyDetailsProps) {
  if (!majorSubassembly) return null

  const data = generateMajorSubassemblyData(majorSubassembly.id)
  const gap = majorSubassembly.cumulativeUnits - majorSubassembly.lobTarget
  const gapPercent = ((gap / majorSubassembly.lobTarget) * 100).toFixed(1)

  const statusColors = {
    "on-schedule": "bg-green-100 text-green-800",
    "at-risk": "bg-yellow-100 text-yellow-800",
    behind: "bg-red-100 text-red-800",
  }

  const statusLabels = {
    "on-schedule": "On Schedule",
    "at-risk": "At Risk",
    behind: "Behind Schedule",
  }

  const trend = data.trendingData[6].production > data.trendingData[0].production ? "up" : "down"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[98vw] !w-[98vw] sm:!max-w-[98vw] sm:!w-[98vw] max-h-[98vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Major Subassembly {majorSubassembly.id}: {majorSubassembly.name}</DialogTitle>
          <p className="text-sm text-gray-600 mt-1">{majorSubassembly.description || `${majorSubassembly.type} operation with ${majorSubassembly.leadTime} day lead time`}</p>
        </DialogHeader>

        {/* Header KPIs */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">Units vs LOB</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{majorSubassembly.cumulativeUnits} / {majorSubassembly.lobTarget}</div>
              <p className={`text-sm mt-1 ${gap >= 0 ? "text-green-600" : "text-red-600"}`}>
                Gap: {gap > 0 ? "+" : ""}{gap} units ({gapPercent}%)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">Schedule Variance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.scheduleVariance.toFixed(1)}%</div>
              <p className={`text-sm mt-1 flex items-center gap-1 ${data.scheduleVariance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {data.scheduleVariance >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {data.scheduleVariance >= 0 ? "Ahead" : "Behind"} target
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">Days Until Downstream Impact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.daysUntilImpact} days</div>
              <p className="text-sm text-gray-500 mt-1">Risk window</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={`${statusColors[data.status]} text-base px-3 py-1`}>
                {statusLabels[data.status]}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Three Column Layout */}
        <Tabs defaultValue="capacity" className="mt-6">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="capacity">Capacity & Throughput</TabsTrigger>
            <TabsTrigger value="resources">Resource Constraints</TabsTrigger>
            <TabsTrigger value="rootcause">Root Cause Analysis</TabsTrigger>
          </TabsList>

          {/* Column A: Capacity & Throughput */}
          <TabsContent value="capacity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Capacity Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Designed Capacity per Day</p>
                    <p className="text-xl font-semibold">{data.capacity.designedCapacityPerDay} units/day</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Actual Average Production Rate (7-day)</p>
                    <p className="text-xl font-semibold">{data.capacity.actualAverageRate.toFixed(1)} units/day</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Capacity Utilization</p>
                    <p className="text-xl font-semibold">{data.capacity.utilizationPercent.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Primary Constraint</p>
                    <p className="text-sm font-semibold text-red-600 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      {data.capacity.primaryConstraint}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Workstation Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Workstation</TableHead>
                      <TableHead className="text-right">Units Produced</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Uptime %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.capacity.workstations.map((ws, i) => (
                      <TableRow key={i} className={ws.unitsProduced === Math.min(...data.capacity.workstations.map(w => w.unitsProduced)) ? "bg-red-50" : ""}>
                        <TableCell className="font-medium">{ws.name}</TableCell>
                        <TableCell className="text-right">{ws.unitsProduced}</TableCell>
                        <TableCell>
                          <Badge variant={ws.status === "At Capacity" ? "destructive" : "outline"}>
                            {ws.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{ws.uptime}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="text-sm text-gray-500 mt-2">
                  <AlertTriangle className="w-4 h-4 inline mr-1 text-red-600" />
                  Bottleneck: {data.capacity.workstations.reduce((prev, curr) => prev.unitsProduced < curr.unitsProduced ? prev : curr).name}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Column B: Resource Constraints */}
          <TabsContent value="resources" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Labor Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Planned Headcount</p>
                    <p className="text-xl font-semibold">{data.resources.labor.plannedHeadcount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Actual Assigned</p>
                    <p className="text-xl font-semibold">{data.resources.labor.actualAssigned}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Overtime Hours (This Month)</p>
                    <p className="text-xl font-semibold">{data.resources.labor.overtimeHours} hrs</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Skills Gaps</p>
                    <p className="text-sm text-red-600">{data.resources.labor.skillsGaps}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Equipment Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Machine Availability</p>
                    <p className="text-xl font-semibold">{data.resources.equipment.availabilityPercent}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Current Downtime</p>
                    <p className="text-xl font-semibold">{data.resources.equipment.downtimeHours} hrs</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Changeover Time</p>
                    <p className="text-xl font-semibold">{data.resources.equipment.changeoverTime} hrs</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Queue Depth</p>
                    <p className="text-xl font-semibold">{data.resources.equipment.queueDepth} units</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Material Availability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">BOM Completeness</p>
                    <p className="text-xl font-semibold">{data.resources.material.bomCompleteness}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Days of Inventory</p>
                    <p className="text-xl font-semibold">{data.resources.material.daysInventory} days</p>
                  </div>
                </div>
                
                {data.resources.material.criticalMissingParts.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-red-600 mb-2">Critical Missing Parts:</p>
                    <div className="space-y-2">
                      {data.resources.material.criticalMissingParts.map((part, i) => (
                        <div key={i} className="bg-red-50 border border-red-200 rounded p-2">
                          <p className="font-medium text-sm">{part.part}</p>
                          <p className="text-xs text-gray-600">
                            Supplier: {part.supplier} | {part.daysLate} days late | Status: {part.status}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Column C: Root Cause Analysis */}
          <TabsContent value="rootcause" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Constraint Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Primary Constraint</p>
                  <p className="text-lg font-semibold text-red-600 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    {data.rootCause.primaryConstraint}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold mb-2">Secondary Issues (by Impact)</p>
                  <div className="space-y-2">
                    {data.rootCause.secondaryIssues.map((issue, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="text-sm">{issue.issue}</span>
                        <Badge variant={issue.impact === "High" ? "destructive" : "outline"}>
                          {issue.impact} Impact
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-sm font-semibold mb-1">Variance Explanation</p>
                  <p className="text-sm text-gray-700">{data.rootCause.explanation}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Forecast & Risk Section */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Forecast & Risk Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Projected Catch-Up Date</p>
                <p className="text-lg font-semibold">{data.forecast.projectedCatchUpDate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Days Before Cascade to Downstream</p>
                <p className="text-lg font-semibold text-orange-600">{data.forecast.daysToCascade} days</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Recommended Actions (Prioritized)</p>
              <div className="space-y-2">
                {data.forecast.recommendedActions.map((action) => (
                  <div key={action.priority} className="flex items-start gap-3 bg-gray-50 p-2 rounded">
                    <Badge variant="outline" className="mt-0.5">P{action.priority}</Badge>
                    <p className="text-sm flex-1">{action.action}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trending Chart */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              7-Day Rolling Production Rate
              {trend === "up" ? (
                <Badge className="bg-green-100 text-green-800">
                  <TrendingUp className="w-3 h-3 mr-1" /> Trending Up
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800">
                  <TrendingDown className="w-3 h-3 mr-1" /> Trending Down
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trendingData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis label={{ value: 'Units/Day', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                  <Tooltip />
                  <ReferenceLine y={data.trendingData[0].lobRequirement} stroke="#16A34A" strokeWidth={2} strokeDasharray="5 5" label="LOB Requirement" />
                  <Line type="monotone" dataKey="production" stroke="#1D4ED8" strokeWidth={2} name="Actual Production" dot={{ fill: "#1D4ED8", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}
