"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import type { ComponentCostHistory } from "@/lib/mock-data"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { useMemo, useState } from "react"

type CostTrendChartProps = {
  history: ComponentCostHistory[]
}

const commodityColors = {
  Processor: "#1D4ED8",
  "RF Module": "#0F766E",
  PCB: "#7C3AED",
  Connector: "#F97316",
  Labor: "#6B7280",
  Rework: "#DC2626",
}

export function CostTrendChart({ history }: CostTrendChartProps) {
  const [visibleCommodities, setVisibleCommodities] = useState<Set<string>>(new Set(Object.keys(commodityColors)))
  const [showMovingAverage, setShowMovingAverage] = useState(false)
  const [dateRange, setDateRange] = useState<"24" | "12" | "6" | "3">("24")

  const chartData = useMemo(() => {
    // Group by month and commodity
    const monthlyData = new Map<string, Record<string, number[]>>()

    history.forEach((item) => {
      const monthKey = item.date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      })

      // Extract commodity from part number (e.g., HR-PRO-0001 -> Processor)
      const commodity = item.partNumber.includes("PRO")
        ? "Processor"
        : item.partNumber.includes("RF")
          ? "RF Module"
          : item.partNumber.includes("PCB")
            ? "PCB"
            : item.partNumber.includes("CON")
              ? "Connector"
              : item.partNumber.includes("LAB")
                ? "Labor"
                : "Rework"

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {})
      }

      const monthData = monthlyData.get(monthKey)!
      if (!monthData[commodity]) {
        monthData[commodity] = []
      }
      monthData[commodity].push(item.totalUnitCost)
    })

    // Calculate averages
    const result = Array.from(monthlyData.entries())
      .map(([month, commodityData]) => {
        const row: any = { month, date: new Date(month) }
        Object.entries(commodityData).forEach(([commodity, costs]) => {
          row[commodity] = costs.reduce((a, b) => a + b, 0) / costs.length
        })
        return row
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(-Number.parseInt(dateRange))

    // Calculate moving averages if enabled
    if (showMovingAverage) {
      const window = 12
      result.forEach((item, index) => {
        Object.keys(commodityColors).forEach((commodity) => {
          const values = result
            .slice(Math.max(0, index - window + 1), index + 1)
            .map((r) => r[commodity])
            .filter((v) => v !== undefined)
          if (values.length > 0) {
            item[`${commodity}_MA`] = values.reduce((a, b) => a + b, 0) / values.length
          }
        })
      })
    }

    return result
  }, [history, dateRange, showMovingAverage])

  const toggleCommodity = (commodity: string) => {
    const newSet = new Set(visibleCommodities)
    if (newSet.has(commodity)) {
      newSet.delete(commodity)
    } else {
      newSet.add(commodity)
    }
    setVisibleCommodities(newSet)
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Component Cost Trends (24-Month History)</h3>
        <div className="flex gap-2">
          <Button variant={dateRange === "24" ? "default" : "outline"} size="sm" onClick={() => setDateRange("24")}>
            24M
          </Button>
          <Button variant={dateRange === "12" ? "default" : "outline"} size="sm" onClick={() => setDateRange("12")}>
            12M
          </Button>
          <Button variant={dateRange === "6" ? "default" : "outline"} size="sm" onClick={() => setDateRange("6")}>
            6M
          </Button>
          <Button variant={dateRange === "3" ? "default" : "outline"} size="sm" onClick={() => setDateRange("3")}>
            3M
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="ma"
            checked={showMovingAverage}
            onCheckedChange={(checked) => setShowMovingAverage(checked as boolean)}
          />
          <label htmlFor="ma" className="text-sm text-gray-700 cursor-pointer">
            Show 12-Month Moving Average
          </label>
        </div>
      </div>

      <div className="h-80 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              label={{ value: "Average Cost per Unit (USD)", angle: -90, position: "insideLeft" }}
              domain={[0, "auto"]}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "white", border: "1px solid #E5E7EB" }}
              formatter={(value: any) => `$${value.toFixed(2)}`}
            />
            <Legend onClick={(e) => toggleCommodity(e.value)} wrapperStyle={{ cursor: "pointer" }} />
            {visibleCommodities.has("Processor") && (
              <Line
                type="monotone"
                dataKey="Processor"
                stroke={commodityColors.Processor}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            )}
            {visibleCommodities.has("RF Module") && (
              <Line
                type="monotone"
                dataKey="RF Module"
                stroke={commodityColors["RF Module"]}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            )}
            {visibleCommodities.has("PCB") && (
              <Line type="monotone" dataKey="PCB" stroke={commodityColors.PCB} strokeWidth={2} dot={{ r: 4 }} />
            )}
            {visibleCommodities.has("Connector") && (
              <Line
                type="monotone"
                dataKey="Connector"
                stroke={commodityColors.Connector}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            )}
            {visibleCommodities.has("Labor") && (
              <Line type="monotone" dataKey="Labor" stroke={commodityColors.Labor} strokeWidth={2} dot={{ r: 4 }} />
            )}
            {visibleCommodities.has("Rework") && (
              <Line type="monotone" dataKey="Rework" stroke={commodityColors.Rework} strokeWidth={2} dot={{ r: 4 }} />
            )}
            {showMovingAverage &&
              Array.from(visibleCommodities).map((commodity) => (
                <Line
                  key={`${commodity}_MA`}
                  type="monotone"
                  dataKey={`${commodity}_MA`}
                  stroke={commodityColors[commodity as keyof typeof commodityColors]}
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  name={`${commodity} MA`}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-2 flex-wrap">
        {Object.entries(commodityColors).map(([commodity, color]) => (
          <Button
            key={commodity}
            variant={visibleCommodities.has(commodity) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleCommodity(commodity)}
            style={{
              backgroundColor: visibleCommodities.has(commodity) ? color : undefined,
            }}
          >
            {commodity}
          </Button>
        ))}
      </div>
    </Card>
  )
}
