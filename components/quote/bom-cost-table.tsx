"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import type { FreshnessStatus } from "@/lib/mock-data"

type BOMItem = {
  lineNumber: number
  partNumber: string
  description: string
  qtyPerUnit: number
  unitCost: number
  lastRefreshDate: Date
  costFreshnessStatus: FreshnessStatus
  varianceAgainstOraclePct: number
  costSource: string
}

type BOMCostTableProps = {
  bomItems: BOMItem[]
  requestedQty: number
}

export function BOMCostTable({ bomItems, requestedQty }: BOMCostTableProps) {
  const [search, setSearch] = useState("")
  const [showStaleOnly, setShowStaleOnly] = useState(false)

  const staleCount = bomItems.filter(
    (item) => item.costFreshnessStatus === "Stale" || item.costFreshnessStatus === "Critical",
  ).length

  const filteredItems = bomItems.filter((item) => {
    const matchesSearch = search === "" || item.partNumber.toLowerCase().includes(search.toLowerCase())
    const matchesStale =
      !showStaleOnly || item.costFreshnessStatus === "Stale" || item.costFreshnessStatus === "Critical"
    return matchesSearch && matchesStale
  })

  const totalMaterialCost = bomItems.reduce((sum, item) => sum + item.unitCost * item.qtyPerUnit * requestedQty, 0)

  const getFreshnessColor = (status: FreshnessStatus) => {
    switch (status) {
      case "Fresh":
        return "bg-[#059669] text-white"
      case "At Risk":
        return "bg-[#F59E0B] text-white"
      case "Stale":
      case "Critical":
        return "bg-[#DC2626] text-white"
    }
  }

  const getSourceColor = (source: string) => {
    switch (source) {
      case "Standard":
        return "bg-gray-200 text-gray-700"
      case "Refreshed Vendor Quote":
        return "bg-blue-100 text-blue-700"
      case "Inventory Override":
        return "bg-purple-100 text-purple-700"
      case "Manual":
        return "bg-amber-100 text-amber-800"
      default:
        return "bg-gray-200"
    }
  }

  const getBorderColor = (status: FreshnessStatus) => {
    if (status === "Critical" || status === "Stale") return "border-l-4 border-l-[#DC2626]"
    if (status === "At Risk") return "border-l-4 border-l-[#F59E0B]"
    return ""
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Bill of Materials (BOM) with Cost Freshness & Inventory Check</h3>

      {staleCount > 0 && (
        <div className="mb-4 p-3 bg-[#FEF3C7] border border-[#F59E0B] rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-[#F59E0B]" />
          <span className="text-sm">
            {staleCount} parts have stale or missing costs – refresh required before final price approval.
          </span>
          <Button variant="link" size="sm" onClick={() => setShowStaleOnly(true)} className="ml-auto">
            View affected parts
          </Button>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <Button
          variant={showStaleOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowStaleOnly(!showStaleOnly)}
        >
          Show only stale/missing costs
        </Button>
        <Input
          placeholder="Search by part number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button variant="outline" size="sm" className="ml-auto bg-transparent">
          Refresh All Costs
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left p-2 font-medium text-gray-700">Line</th>
              <th className="text-left p-2 font-medium text-gray-700">Part Number</th>
              <th className="text-left p-2 font-medium text-gray-700">Description</th>
              <th className="text-right p-2 font-medium text-gray-700">Qty/Unit</th>
              <th className="text-right p-2 font-medium text-gray-700">Unit Cost</th>
              <th className="text-right p-2 font-medium text-gray-700">Ext. Cost</th>
              <th className="text-left p-2 font-medium text-gray-700">Last Refresh</th>
              <th className="text-center p-2 font-medium text-gray-700">Freshness</th>
              <th className="text-right p-2 font-medium text-gray-700">Var %</th>
              <th className="text-center p-2 font-medium text-gray-700">Source</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr
                key={item.lineNumber}
                className={cn("border-b border-gray-100 hover:bg-gray-50", getBorderColor(item.costFreshnessStatus))}
              >
                <td className="p-2">{item.lineNumber}</td>
                <td className="p-2 font-mono">{item.partNumber}</td>
                <td className="p-2 text-gray-700">{item.description}</td>
                <td className="p-2 text-right">{item.qtyPerUnit}</td>
                <td className="p-2 text-right font-mono">${item.unitCost.toFixed(2)}</td>
                <td className="p-2 text-right font-mono font-semibold">
                  ${(item.unitCost * item.qtyPerUnit * requestedQty).toFixed(2)}
                </td>
                <td className="p-2 text-gray-600">{item.lastRefreshDate.toLocaleDateString()}</td>
                <td className="p-2 text-center">
                  <Badge className={cn("text-xs", getFreshnessColor(item.costFreshnessStatus))}>
                    {item.costFreshnessStatus === "Fresh" && "✓"}
                    {item.costFreshnessStatus === "At Risk" && "⚠"}
                    {item.costFreshnessStatus === "Stale" && "!"}
                    {item.costFreshnessStatus === "Critical" && "?"}
                  </Badge>
                </td>
                <td
                  className={cn(
                    "p-2 text-right font-mono",
                    item.varianceAgainstOraclePct > 10
                      ? "text-[#DC2626] font-semibold"
                      : item.varianceAgainstOraclePct < -5
                        ? "text-[#059669]"
                        : "text-[#F59E0B]",
                  )}
                >
                  {item.varianceAgainstOraclePct > 0 ? "+" : ""}
                  {item.varianceAgainstOraclePct.toFixed(1)}%
                </td>
                <td className="p-2 text-center">
                  <Badge className={cn("text-xs", getSourceColor(item.costSource))}>{item.costSource}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 bg-gray-50">
              <td colSpan={5} className="p-2 font-semibold">
                Totals: {bomItems.length} lines
              </td>
              <td className="p-2 text-right font-mono font-bold">${totalMaterialCost.toFixed(2)}</td>
              <td colSpan={4}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  )
}
