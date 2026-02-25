"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { AlertTriangle } from "lucide-react"
import React from "react"

type CostSummaryATPProps = {
  requestedQty: number
}

const atpData = [
  { component: "Processor Module", onHand: 450, onOrder: 200, reserved: 100, status: "ok" },
  { component: "RF Module Assembly", onHand: 280, onOrder: 150, reserved: 80, status: "ok" },
  { component: "PCB Main Board", onHand: 520, onOrder: 0, reserved: 150, status: "ok" },
  { component: "Connector Kit", onHand: 150, onOrder: 300, reserved: 200, status: "tight" },
  { component: "Power Supply", onHand: 95, onOrder: 100, reserved: 120, status: "short" },
  { component: "Antenna Array", onHand: 180, onOrder: 50, reserved: 100, status: "ok" },
]

export function CostSummaryATP({ requestedQty }: CostSummaryATPProps) {
  const totalMaterial = 45250
  const totalLabor = 8400
  const overhead = 3200
  const totalLanded = totalMaterial + totalLabor + overhead
  const standardMargin = 22
  const [markup, setMarkup] = React.useState(28)
  const suggestedUnitPrice = totalLanded * (1 + markup / 100)

  const shortCount = atpData.filter((item) => item.status === "short").length

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Cost Summary & Feasibility Check</h3>

        <div className="space-y-4">
          {/* Cost Summary Cards */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Total Material Cost</p>
            <p className="text-2xl font-bold">${totalMaterial.toLocaleString()}</p>
            <p className="text-xs text-gray-500">BOM material only</p>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Total Labor Cost</p>
            <p className="text-2xl font-bold">${totalLabor.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Build + test labor</p>
            <p className="text-xs text-[#DC2626] mt-1">+3.2% vs 3-month average</p>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Overhead</p>
            <p className="text-2xl font-bold">${overhead.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Allocation @ 7% of material</p>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-xs text-gray-600 mb-1">Total Landed Cost</p>
            <p className="text-2xl font-bold text-[#1D4ED8]">${totalLanded.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Cost of goods</p>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Standard Margin %</p>
            <p className="text-xl font-bold">{standardMargin}%</p>
            <div className="mt-2 h-2 bg-gray-200 rounded-full relative">
              <div className="absolute h-full bg-[#059669] rounded-full" style={{ width: `${standardMargin}%` }} />
              <div className="absolute h-full w-0.5 bg-gray-700" style={{ left: `${standardMargin}%` }} />
            </div>
          </div>

          <div>
            <Label htmlFor="markup">Suggested Markup %</Label>
            <Input
              id="markup"
              type="number"
              value={markup}
              onChange={(e) => setMarkup(Number.parseFloat(e.target.value) || 0)}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">To achieve 22% margin goal</p>
          </div>

          <div className="bg-[#EFF6FF] p-3 rounded-lg border border-blue-200">
            <p className="text-xs text-gray-600 mb-1">Suggested Unit Price</p>
            <p className="text-2xl font-bold text-[#1D4ED8]">${suggestedUnitPrice.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Price to customer (per unit)</p>
            <Button size="sm" className="mt-2 w-full">
              Copy to Quote
            </Button>
          </div>
        </div>
      </div>

      {/* ATP Section */}
      <div className="pt-6 border-t border-gray-200">
        <h4 className="text-sm font-semibold mb-3">Inventory & Available-to-Promise (ATP) Check</h4>

        {shortCount > 0 && (
          <div className="mb-3 p-2 bg-[#FEE2E2] border border-[#DC2626] rounded text-xs flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-[#DC2626] flex-shrink-0 mt-0.5" />
            <span>
              Inventory Risk: {shortCount} parts are short of quote requirement. Recommend engaging procurement.
            </span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left p-1 font-medium text-gray-700">Component</th>
                <th className="text-right p-1 font-medium text-gray-700">ATP</th>
                <th className="text-center p-1 font-medium text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {atpData.map((item, index) => {
                const atp = item.onHand + item.onOrder - item.reserved
                return (
                  <tr
                    key={index}
                    className={cn(
                      "border-b border-gray-100",
                      item.status === "short" ? "bg-red-50" : item.status === "tight" ? "bg-amber-50" : "",
                    )}
                  >
                    <td className="p-1 text-gray-700">{item.component}</td>
                    <td className="p-1 text-right font-mono">{atp}</td>
                    <td className="p-1 text-center">
                      <Badge
                        className={cn(
                          "text-xs",
                          item.status === "ok"
                            ? "bg-[#059669] text-white"
                            : item.status === "tight"
                              ? "bg-[#F59E0B] text-white"
                              : "bg-[#DC2626] text-white",
                        )}
                      >
                        {item.status === "ok" && "✓ OK"}
                        {item.status === "tight" && "⚠ Tight"}
                        {item.status === "short" && "✗ Short"}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                <td className="p-1">TOTAL BOM</td>
                <td className="p-1 text-right">—</td>
                <td className="p-1 text-center">
                  <Badge className="bg-[#F59E0B] text-white text-xs">87%</Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-600 mt-2">ATP Coverage: 87% – will need purchase of additional inventory.</p>
      </div>
    </Card>
  )
}
