"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

type WorkOrder = {
  workOrderId: string
  productFamily: string
  assemblyName: string
  plant: string
  plannedLaborHours: number
  actualLaborHours: number
  varianceHours: number
  variancePct: number
  varianceStatus: "On-Track" | "Over" | "Under"
  buildStartDate: string
  buildCompleteDate: string
}

const mockWorkOrders: WorkOrder[] = [
  {
    workOrderId: "WO-2025-0847",
    productFamily: "Manpack Radios",
    assemblyName: "Main RF Assembly",
    plant: "Plant A – East",
    plannedLaborHours: 24,
    actualLaborHours: 38,
    varianceHours: 14,
    variancePct: 58.3,
    varianceStatus: "Over",
    buildStartDate: "2025-01-15",
    buildCompleteDate: "2025-01-20",
  },
  {
    workOrderId: "WO-2025-0846",
    productFamily: "Vehicle Radios",
    assemblyName: "Power Supply Module",
    plant: "Plant B – West",
    plannedLaborHours: 18,
    actualLaborHours: 24,
    varianceHours: 6,
    variancePct: 33.3,
    varianceStatus: "Over",
    buildStartDate: "2025-01-14",
    buildCompleteDate: "2025-01-18",
  },
  {
    workOrderId: "WO-2025-0845",
    productFamily: "Base Station Kits",
    assemblyName: "Antenna Array",
    plant: "Plant A – East",
    plannedLaborHours: 32,
    actualLaborHours: 35,
    varianceHours: 3,
    variancePct: 9.4,
    varianceStatus: "On-Track",
    buildStartDate: "2025-01-12",
    buildCompleteDate: "In Progress",
  },
  {
    workOrderId: "WO-2025-0844",
    productFamily: "Manpack Radios",
    assemblyName: "Battery Pack",
    plant: "Plant A – East",
    plannedLaborHours: 12,
    actualLaborHours: 9,
    varianceHours: -3,
    variancePct: -25.0,
    varianceStatus: "Under",
    buildStartDate: "2025-01-10",
    buildCompleteDate: "2025-01-14",
  },
  {
    workOrderId: "WO-2025-0843",
    productFamily: "Vehicle Radios",
    assemblyName: "Display Unit",
    plant: "Plant B – West",
    plannedLaborHours: 16,
    actualLaborHours: 18,
    varianceHours: 2,
    variancePct: 12.5,
    varianceStatus: "On-Track",
    buildStartDate: "2025-01-08",
    buildCompleteDate: "2025-01-12",
  },
]

export function WorkOrderLaborTable() {
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [showOnlyOver, setShowOnlyOver] = useState(false)

  const filteredOrders = showOnlyOver ? mockWorkOrders.filter((wo) => wo.variancePct > 15) : mockWorkOrders

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Work Order Labor Variance Tracking</h3>
        <div className="flex gap-2">
          <Button
            variant={showOnlyOver ? "default" : "outline"}
            size="sm"
            onClick={() => setShowOnlyOver(!showOnlyOver)}
          >
            Show only Over
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-xs text-gray-600">
              <th className="text-left py-3 px-2 font-medium">Work Order</th>
              <th className="text-left py-3 px-2 font-medium">Product Family</th>
              <th className="text-left py-3 px-2 font-medium">Assembly Name</th>
              <th className="text-left py-3 px-2 font-medium">Plant</th>
              <th className="text-right py-3 px-2 font-medium">Planned (h)</th>
              <th className="text-right py-3 px-2 font-medium">Actual (h)</th>
              <th className="text-right py-3 px-2 font-medium">Variance (h)</th>
              <th className="text-right py-3 px-2 font-medium">Variance %</th>
              <th className="text-left py-3 px-2 font-medium">Status</th>
              <th className="text-left py-3 px-2 font-medium">Start Date</th>
              <th className="text-left py-3 px-2 font-medium">Complete Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((wo) => {
              const isExpanded = expandedRow === wo.workOrderId
              const bgClass =
                wo.varianceStatus === "Over" && wo.variancePct > 40
                  ? "bg-red-50"
                  : wo.varianceStatus === "Over" && wo.variancePct > 20
                    ? "bg-red-25"
                    : wo.varianceStatus === "Under"
                      ? "bg-amber-50"
                      : ""

              return (
                <>
                  <tr
                    key={wo.workOrderId}
                    className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${bgClass}`}
                    onClick={() => setExpandedRow(isExpanded ? null : wo.workOrderId)}
                  >
                    <td className="py-3 px-2 text-sm flex items-center gap-1">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className="text-blue-600 hover:underline">{wo.workOrderId}</span>
                    </td>
                    <td className="py-3 px-2 text-sm text-gray-700">{wo.productFamily}</td>
                    <td className="py-3 px-2 text-sm text-gray-700">{wo.assemblyName}</td>
                    <td className="py-3 px-2 text-sm text-gray-700">{wo.plant}</td>
                    <td className="py-3 px-2 text-sm text-right text-gray-900">{wo.plannedLaborHours}</td>
                    <td className="py-3 px-2 text-sm text-right text-gray-900 font-medium">{wo.actualLaborHours}</td>
                    <td
                      className={`py-3 px-2 text-sm text-right font-medium ${
                        wo.varianceHours > 0 ? "text-[#DC2626]" : "text-[#059669]"
                      }`}
                    >
                      {wo.varianceHours > 0 ? "+" : ""}
                      {wo.varianceHours}
                    </td>
                    <td
                      className={`py-3 px-2 text-sm text-right font-medium ${
                        wo.variancePct > 0 ? "text-[#DC2626]" : "text-[#059669]"
                      }`}
                    >
                      {wo.variancePct > 0 ? "+" : ""}
                      {wo.variancePct.toFixed(1)}%
                    </td>
                    <td className="py-3 px-2">
                      <Badge
                        variant={
                          wo.varianceStatus === "Over"
                            ? "destructive"
                            : wo.varianceStatus === "Under"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {wo.varianceStatus}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-sm text-gray-700">{wo.buildStartDate}</td>
                    <td className="py-3 px-2 text-sm text-gray-700">{wo.buildCompleteDate}</td>
                  </tr>
                  {isExpanded && (
                    <tr className={bgClass}>
                      <td colSpan={11} className="py-4 px-6">
                        <div className="bg-white p-4 rounded border border-gray-200">
                          <h4 className="text-sm font-bold mb-3">Labor Detail Breakdown</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Build hours:</span>
                              <span className="font-medium">18h (planned) / 24h (actual)</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Test hours:</span>
                              <span className="font-medium">4h (planned) / 6h (actual)</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Rework hours:</span>
                              <span className="font-medium text-red-600">0h (planned) / 6h (actual)</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Troubleshoot hours:</span>
                              <span className="font-medium">2h (planned) / 2h (actual)</span>
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
