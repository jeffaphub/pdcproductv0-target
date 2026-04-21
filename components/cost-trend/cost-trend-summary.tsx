import { Card } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

const summaryData = [
  {
    commodity: "Processors",
    currentAvgCost: 1245.5,
    twelveMonthHigh: 1380.0,
    twelveMonthLow: 1120.0,
    variancePct: 23.2,
    trendDirection: "Up" as const,
  },
  {
    commodity: "RF Modules",
    currentAvgCost: 2150.0,
    twelveMonthHigh: 2450.0,
    twelveMonthLow: 1980.0,
    variancePct: 23.7,
    trendDirection: "Up" as const,
  },
  {
    commodity: "PCBs",
    currentAvgCost: 485.0,
    twelveMonthHigh: 520.0,
    twelveMonthLow: 450.0,
    variancePct: 15.6,
    trendDirection: "Flat" as const,
  },
  {
    commodity: "Connectors",
    currentAvgCost: 85.5,
    twelveMonthHigh: 98.0,
    twelveMonthLow: 78.0,
    variancePct: 25.6,
    trendDirection: "Down" as const,
  },
  {
    commodity: "Labor",
    currentAvgCost: 65.0,
    twelveMonthHigh: 72.0,
    twelveMonthLow: 62.0,
    variancePct: 16.1,
    trendDirection: "Up" as const,
  },
  {
    commodity: "Rework",
    currentAvgCost: 125.0,
    twelveMonthHigh: 155.0,
    twelveMonthLow: 98.0,
    variancePct: 58.2,
    trendDirection: "Down" as const,
  },
]

export function CostTrendSummary() {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Commodity Cost Summary (Last 12 Months)</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left p-2 font-medium text-gray-700">Commodity</th>
              <th className="text-right p-2 font-medium text-gray-700">Current</th>
              <th className="text-right p-2 font-medium text-gray-700">12M High</th>
              <th className="text-right p-2 font-medium text-gray-700">12M Low</th>
              <th className="text-right p-2 font-medium text-gray-700">Var %</th>
              <th className="text-center p-2 font-medium text-gray-700">Trend</th>
            </tr>
          </thead>
          <tbody>
            {summaryData.map((item) => (
              <tr
                key={item.commodity}
                className={cn(
                  "border-b border-gray-100",
                  item.variancePct > 20 && item.trendDirection === "Up"
                    ? "bg-red-50"
                    : item.variancePct > 20 && item.trendDirection === "Down"
                      ? "bg-green-50"
                      : "",
                )}
              >
                <td className="p-2 font-medium">{item.commodity}</td>
                <td className="p-2 text-right font-mono">${item.currentAvgCost.toFixed(2)}</td>
                <td className="p-2 text-right font-mono text-gray-600">${item.twelveMonthHigh.toFixed(2)}</td>
                <td className="p-2 text-right font-mono text-gray-600">${item.twelveMonthLow.toFixed(2)}</td>
                <td className="p-2 text-right font-mono font-semibold">{item.variancePct.toFixed(1)}%</td>
                <td className="p-2 text-center">
                  {item.trendDirection === "Up" && (
                    <div className="flex items-center justify-center gap-1 text-[#DC2626]">
                      <TrendingUp className="h-4 w-4" />
                      <TrendingUp className="h-4 w-4" />
                    </div>
                  )}
                  {item.trendDirection === "Down" && (
                    <div className="flex items-center justify-center gap-1 text-[#059669]">
                      <TrendingDown className="h-4 w-4" />
                      <TrendingDown className="h-4 w-4" />
                    </div>
                  )}
                  {item.trendDirection === "Flat" && (
                    <div className="flex items-center justify-center text-gray-500">
                      <Minus className="h-4 w-4" />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
