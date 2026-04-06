"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

type WorkOrderCost = {
  serialNumber: string
  buildDate: string
  productFamily: string
  materialCost: number
  laborCost: number
  reworkCost: number
  troubleshootCost: number
  copqCost: number
  totalCost: number
  bidPrice: number
  actualMarginPct: number
  standardMarginPct: number
  marginStatus: "Above Target" | "On Target" | "Below Target"
}

const mockWorkOrders: WorkOrderCost[] = [
  {
    serialNumber: "SN-20250847-001",
    buildDate: "2025-01-20",
    productFamily: "Manpack Radios",
    materialCost: 775,
    laborCost: 224,
    reworkCost: 96,
    troubleshootCost: 54,
    copqCost: 150,
    totalCost: 1245,
    bidPrice: 1550,
    actualMarginPct: 19.7,
    standardMarginPct: 22.0,
    marginStatus: "Below Target",
  },
  {
    serialNumber: "SN-20250846-001",
    buildDate: "2025-01-18",
    productFamily: "Vehicle Radios",
    materialCost: 1417,
    laborCost: 327,
    reworkCost: 65,
    troubleshootCost: 43,
    copqCost: 108,
    totalCost: 1960,
    bidPrice: 2650,
    actualMarginPct: 26.0,
    standardMarginPct: 25.0,
    marginStatus: "Above Target",
  },
  {
    serialNumber: "SN-20250845-001",
    buildDate: "2025-01-16",
    productFamily: "Base Station Kits",
    materialCost: 2622,
    laborCost: 994,
    reworkCost: 225,
    troubleshootCost: 158,
    copqCost: 383,
    totalCost: 4157,
    bidPrice: 5050,
    actualMarginPct: 17.7,
    standardMarginPct: 20.0,
    marginStatus: "Below Target",
  },
]

export function CostBreakdownTable() {
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Unit Cost & Margin by Work Order (Last 50 Work Orders)</h3>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-xs text-gray-600">
              <th className="text-left py-3 px-2 font-medium">Serial Number</th>
              <th className="text-left py-3 px-2 font-medium">Build Date</th>
              <th className="text-left py-3 px-2 font-medium">Product Family</th>
              <th className="text-right py-3 px-2 font-medium">Material $</th>
              <th className="text-right py-3 px-2 font-medium">Labor $</th>
              <th className="text-right py-3 px-2 font-medium">Rework $</th>
              <th className="text-right py-3 px-2 font-medium">COPQ $</th>
              <th className="text-right py-3 px-2 font-medium">Total $</th>
              <th className="text-right py-3 px-2 font-medium">Bid $</th>
              <th className="text-right py-3 px-2 font-medium">Margin %</th>
              <th className="text-left py-3 px-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {mockWorkOrders.map((wo) => {
              const isExpanded = expandedRow === wo.serialNumber
              const bgClass =
                wo.marginStatus === "Below Target" && wo.actualMarginPct < wo.standardMarginPct - 5
                  ? "bg-red-50"
                  : wo.marginStatus === "Below Target"
                    ? "bg-red-25"
                    : ""

              const copqHighlight = wo.copqCost > wo.totalCost * 0.1 ? "border-r-4 border-r-red-500" : ""

              return (
                <>
                  <tr
                    key={wo.serialNumber}
                    className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${bgClass} ${copqHighlight}`}
                    onClick={() => setExpandedRow(isExpanded ? null : wo.serialNumber)}
                  >
                    <td className="py-3 px-2 text-sm flex items-center gap-1">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className="text-blue-600 hover:underline">{wo.serialNumber}</span>
                    </td>
                    <td className="py-3 px-2 text-sm text-gray-700">{wo.buildDate}</td>
                    <td className="py-3 px-2 text-sm text-gray-700">{wo.productFamily}</td>
                    <td className="py-3 px-2 text-sm text-right text-gray-900">${wo.materialCost}</td>
                    <td className="py-3 px-2 text-sm text-right text-gray-900">${wo.laborCost}</td>
                    <td
                      className={`py-3 px-2 text-sm text-right ${wo.reworkCost > wo.totalCost * 0.05 ? "text-[#DC2626] font-medium" : "text-gray-900"}`}
                    >
                      ${wo.reworkCost}
                    </td>
                    <td className="py-3 px-2 text-sm text-right text-gray-900 font-medium">${wo.copqCost}</td>
                    <td className="py-3 px-2 text-sm text-right text-gray-900 font-bold">${wo.totalCost}</td>
                    <td className="py-3 px-2 text-sm text-right text-gray-900">${wo.bidPrice}</td>
                    <td
                      className={`py-3 px-2 text-sm text-right font-medium ${
                        wo.actualMarginPct >= wo.standardMarginPct
                          ? "text-[#059669]"
                          : wo.actualMarginPct >= wo.standardMarginPct - 2
                            ? "text-gray-900"
                            : "text-[#DC2626]"
                      }`}
                    >
                      {wo.actualMarginPct.toFixed(1)}%
                    </td>
                    <td className="py-3 px-2">
                      <Badge
                        variant={
                          wo.marginStatus === "Above Target"
                            ? "default"
                            : wo.marginStatus === "Below Target"
                              ? "destructive"
                              : "outline"
                        }
                        className="text-xs"
                      >
                        {wo.marginStatus}
                      </Badge>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className={bgClass}>
                      <td colSpan={11} className="py-4 px-6">
                        <div className="bg-white p-4 rounded border border-gray-200">
                          <h4 className="text-sm font-bold mb-3">Cost Breakdown Detail</h4>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs font-bold text-gray-700 mb-2">Material Breakdown</p>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">RF Components:</span>
                                  <span>${Math.round(wo.materialCost * 0.42)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">PCB Assembly:</span>
                                  <span>${Math.round(wo.materialCost * 0.28)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Housing/Mechanical:</span>
                                  <span>${Math.round(wo.materialCost * 0.18)}</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-700 mb-2">Labor Breakdown</p>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Build hours:</span>
                                  <span>
                                    {Math.round((wo.laborCost * 0.65) / 80)}h (${Math.round(wo.laborCost * 0.65)})
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Test hours:</span>
                                  <span>
                                    {Math.round((wo.laborCost * 0.25) / 80)}h (${Math.round(wo.laborCost * 0.25)})
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Other:</span>
                                  <span>${Math.round(wo.laborCost * 0.1)}</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-700 mb-2">COPQ Breakdown</p>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Rework labor:</span>
                                  <span className="text-red-600">${wo.reworkCost}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Troubleshoot:</span>
                                  <span className="text-red-600">${wo.troubleshootCost}</span>
                                </div>
                                <div className="flex justify-between font-medium">
                                  <span className="text-gray-700">Total COPQ:</span>
                                  <span className="text-red-600">${wo.copqCost}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
