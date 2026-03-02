"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { RefreshEvent } from "@/lib/mock-data"
import { Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from "recharts"
import { useMemo, useState } from "react"

type RefreshActivityChartProps = {
  events: RefreshEvent[]
}

export function RefreshActivityChart({ events }: RefreshActivityChartProps) {
  const [visibleSeries, setVisibleSeries] = useState({
    manual: true,
    auto: true,
    scheduled: true,
    cumulative: true,
  })

  const chartData = useMemo(() => {
    // Group by month
    const monthlyData = new Map<string, { manual: number; auto: number; scheduled: number }>()

    events.forEach((event) => {
      const monthKey = event.eventDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      })

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { manual: 0, auto: 0, scheduled: 0 })
      }

      const data = monthlyData.get(monthKey)!

      if (event.triggerType === "Manual") data.manual += event.numPartsRefreshed
      else if (event.triggerType === "Auto Threshold") data.auto += event.numPartsRefreshed
      else if (event.triggerType === "Scheduled") data.scheduled += event.numPartsRefreshed
    })

    // Convert to array and calculate cumulative
    const result = Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        ...data,
        total: data.manual + data.auto + data.scheduled,
      }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())

    // Calculate cumulative percentage (assuming 500 total parts)
    let cumulative = 0
    return result.map((item) => {
      cumulative += item.total
      return {
        ...item,
        cumulativePct: Math.min(100, (cumulative / 500) * 100),
      }
    })
  }, [events])

  const recentEvents = events.slice(0, 10)

  const toggleSeries = (series: keyof typeof visibleSeries) => {
    setVisibleSeries((prev) => ({ ...prev, [series]: !prev[series] }))
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Recent Refresh Activity (Last 6 Months)</h3>

      <div className="h-80 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12 }}
              label={{ value: "Parts Refreshed", angle: -90, position: "insideLeft" }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12 }}
              label={{ value: "Cumulative %", angle: 90, position: "insideRight" }}
              domain={[0, 100]}
            />
            <Tooltip />
            <Legend
              onClick={(e) => {
                const dataKey = e.dataKey as string
                if (dataKey === "manual") toggleSeries("manual")
                if (dataKey === "auto") toggleSeries("auto")
                if (dataKey === "scheduled") toggleSeries("scheduled")
                if (dataKey === "cumulativePct") toggleSeries("cumulative")
              }}
              wrapperStyle={{ cursor: "pointer" }}
            />
            {visibleSeries.manual && <Bar yAxisId="left" dataKey="manual" stackId="a" fill="#6B7280" name="Manual" />}
            {visibleSeries.auto && (
              <Bar yAxisId="left" dataKey="auto" stackId="a" fill="#1D4ED8" name="Auto Threshold" />
            )}
            {visibleSeries.scheduled && (
              <Bar yAxisId="left" dataKey="scheduled" stackId="a" fill="#059669" name="Scheduled" />
            )}
            {visibleSeries.cumulative && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulativePct"
                stroke="#1D4ED8"
                strokeWidth={2}
                name="Cumulative %"
                dot={{ r: 3 }}
              />
            )}
            <Line
              yAxisId="right"
              type="monotone"
              stroke="#DC2626"
              strokeDasharray="5 5"
              strokeWidth={1}
              y={90}
              name="Target: 90%"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Events Table */}
      <div>
        <h4 className="text-sm font-semibold mb-3">Last 10 Refresh Events</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left p-2 font-medium text-gray-700">Date</th>
                <th className="text-left p-2 font-medium text-gray-700">Trigger Type</th>
                <th className="text-right p-2 font-medium text-gray-700">Parts Refreshed</th>
                <th className="text-left p-2 font-medium text-gray-700">Status</th>
                <th className="text-left p-2 font-medium text-gray-700">Initiated By</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.map((event, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="p-2">{event.eventDate.toLocaleDateString()}</td>
                  <td className="p-2">
                    <Badge
                      variant="secondary"
                      className={
                        event.triggerType === "Manual"
                          ? "bg-gray-200"
                          : event.triggerType === "Auto Threshold"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                      }
                    >
                      {event.triggerType}
                    </Badge>
                  </td>
                  <td className="p-2 text-right font-mono">{event.numPartsRefreshed}</td>
                  <td className="p-2">
                    <Badge
                      variant={event.status === "Completed" ? "default" : "secondary"}
                      className={
                        event.status === "Completed"
                          ? "bg-[#059669] text-white"
                          : event.status === "In Progress"
                            ? "bg-[#F59E0B] text-white"
                            : ""
                      }
                    >
                      {event.status}
                    </Badge>
                  </td>
                  <td className="p-2 text-gray-600">{event.initiatedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  )
}
