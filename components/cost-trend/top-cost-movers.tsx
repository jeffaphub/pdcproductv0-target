"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { mockComponents } from "@/lib/mock-data"

export function TopCostMovers() {
  const [showHighSpendOnly, setShowHighSpendOnly] = useState(false)

  // Generate cost movers data from components
  const costMovers = mockComponents
    .map((c) => ({
      partNumber: c.partNumber,
      description: c.description,
      supplier: c.supplier,
      twelveMonthLow: c.standardCost * 0.85,
      twelveMonthHigh: c.standardCost * 1.25,
      currentCost: c.avgRecentPOCost,
      variancePct: Math.abs(c.variancePct),
      numPriceChanges: Math.floor(Math.random() * 8) + 2,
      trend:
        c.variancePct > 15 ? "Sharp Rise" : c.variancePct > 5 ? "Rising" : c.variancePct < -5 ? "Falling" : "Stable",
      annualSpend: c.annualSpend,
    }))
    .filter((item) => !showHighSpendOnly || item.annualSpend > 50000)
    .sort((a, b) => b.variancePct - a.variancePct)
    .slice(0, 20)

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Top Cost Movers (Last 90 Days, by Variance %)</h3>
      </div>

      <div className="mb-4">
        <Button
          variant={showHighSpendOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowHighSpendOnly(!showHighSpendOnly)}
        >
          Show high-spend items only (&gt;$50k)
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left p-2 font-medium text-gray-700">Part #</th>
              <th className="text-left p-2 font-medium text-gray-700">Description</th>
              <th className="text-right p-2 font-medium text-gray-700">12M Low</th>
              <th className="text-right p-2 font-medium text-gray-700">12M High</th>
              <th className="text-right p-2 font-medium text-gray-700">Current</th>
              <th className="text-right p-2 font-medium text-gray-700">Var %</th>
              <th className="text-center p-2 font-medium text-gray-700">Changes</th>
              <th className="text-center p-2 font-medium text-gray-700">Trend</th>
            </tr>
          </thead>
          <tbody>
            {costMovers.map((item) => (
              <tr
                key={item.partNumber}
                className={cn(
                  "border-b border-gray-100",
                  item.variancePct > 25 && item.trend === "Sharp Rise" ? "bg-red-50" : "",
                )}
              >
                <td className="p-2 font-mono">{item.partNumber}</td>
                <td className="p-2 text-gray-700">{item.description}</td>
                <td className="p-2 text-right font-mono">${item.twelveMonthLow.toFixed(2)}</td>
                <td className="p-2 text-right font-mono">${item.twelveMonthHigh.toFixed(2)}</td>
                <td className="p-2 text-right font-mono font-semibold">${item.currentCost.toFixed(2)}</td>
                <td className="p-2 text-right font-mono font-semibold text-[#DC2626]">
                  +{item.variancePct.toFixed(1)}%
                </td>
                <td className="p-2 text-center">{item.numPriceChanges}</td>
                <td className="p-2 text-center">
                  <Badge
                    className={cn(
                      "text-xs",
                      item.trend === "Sharp Rise"
                        ? "bg-[#DC2626] text-white"
                        : item.trend === "Rising"
                          ? "bg-[#F59E0B] text-white"
                          : item.trend === "Falling"
                            ? "bg-[#059669] text-white"
                            : "bg-gray-200 text-gray-700",
                    )}
                  >
                    {item.trend === "Sharp Rise" && "↑↑"}
                    {item.trend === "Rising" && "↑"}
                    {item.trend === "Falling" && "↓"}
                    {item.trend === "Stable" && "→"} {item.trend}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
