"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Component, FreshnessStatus } from "@/lib/mock-data"
import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"

type ComponentStatusDetailsProps = {
  components: Component[]
}

export function ComponentStatusDetails({ components }: ComponentStatusDetailsProps) {
  const [showCriticalOnly, setShowCriticalOnly] = useState(false)
  const [filterStatus, setFilterStatus] = useState<FreshnessStatus[]>([])
  const [filterInActiveBOM, setFilterInActiveBOM] = useState<boolean | null>(null)
  const [sortColumn, setSortColumn] = useState<keyof Component>("daysSinceRefresh")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const filteredComponents = useMemo(() => {
    const filtered = components.filter((c) => {
      const matchesCritical =
        !showCriticalOnly ||
        c.freshnessStatus === "Critical" ||
        c.freshnessStatus === "Stale" ||
        c.freshnessStatus === "At Risk"

      const matchesStatus = filterStatus.length === 0 || filterStatus.includes(c.freshnessStatus)

      // Randomly assign "in active BOM" status
      const isInActiveBOM = Math.random() > 0.7
      const matchesActiveBOM = filterInActiveBOM === null || isInActiveBOM === filterInActiveBOM

      return matchesCritical && matchesStatus && matchesActiveBOM
    })

    filtered.sort((a, b) => {
      const aVal = a[sortColumn]
      const bVal = b[sortColumn]
      const direction = sortDirection === "asc" ? 1 : -1

      if (typeof aVal === "number" && typeof bVal === "number") {
        return (aVal - bVal) * direction
      }
      if (aVal instanceof Date && bVal instanceof Date) {
        return (aVal.getTime() - bVal.getTime()) * direction
      }
      return String(aVal).localeCompare(String(bVal)) * direction
    })

    return filtered.slice(0, 50)
  }, [components, showCriticalOnly, filterStatus, filterInActiveBOM, sortColumn, sortDirection])

  const handleSort = (column: keyof Component) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("desc")
    }
  }

  const toggleStatusFilter = (status: FreshnessStatus) => {
    setFilterStatus((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]))
  }

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

  const getBorderColor = (status: FreshnessStatus, isInActiveBOM: boolean) => {
    if ((status === "Critical" || status === "Stale") && isInActiveBOM) {
      return "bg-red-100 border-l-4 border-l-[#DC2626]"
    }
    if (status === "Critical" || status === "Stale") {
      return "bg-red-50 border-l-4 border-l-[#DC2626]"
    }
    return ""
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Component Status Details & Risk Assessment</h3>

      <div className="flex gap-2 mb-4 flex-wrap">
        <Button
          variant={showCriticalOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowCriticalOnly(!showCriticalOnly)}
        >
          Show only Critical & At-Risk
        </Button>
        <Button
          variant={filterStatus.includes("Critical") ? "default" : "outline"}
          size="sm"
          onClick={() => toggleStatusFilter("Critical")}
        >
          Critical
        </Button>
        <Button
          variant={filterStatus.includes("At Risk") ? "default" : "outline"}
          size="sm"
          onClick={() => toggleStatusFilter("At Risk")}
        >
          At Risk
        </Button>
        <Button
          variant={filterStatus.includes("Fresh") ? "default" : "outline"}
          size="sm"
          onClick={() => toggleStatusFilter("Fresh")}
        >
          Fresh
        </Button>
        <Button
          variant={filterInActiveBOM === true ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterInActiveBOM(filterInActiveBOM === true ? null : true)}
        >
          In Active BOM
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              <th
                className="text-left p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("partNumber")}
              >
                Part Number
              </th>
              <th className="text-left p-2 font-medium text-gray-700">Description</th>
              <th className="text-left p-2 font-medium text-gray-700">Supplier</th>
              <th
                className="text-right p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("standardCost")}
              >
                Cost
              </th>
              <th
                className="text-left p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("lastRefreshDate")}
              >
                Last Refresh
              </th>
              <th
                className="text-right p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("daysSinceRefresh")}
              >
                Days Since
              </th>
              <th
                className="text-right p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("variancePct")}
              >
                Var %
              </th>
              <th
                className="text-right p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("annualSpend")}
              >
                Annual Spend
              </th>
              <th className="text-center p-2 font-medium text-gray-700">Status</th>
              <th className="text-center p-2 font-medium text-gray-700">In BOM</th>
            </tr>
          </thead>
          <tbody>
            {filteredComponents.map((component) => {
              const isInActiveBOM = Math.random() > 0.7
              return (
                <tr
                  key={component.partNumber}
                  className={cn(
                    "border-b border-gray-100 hover:bg-gray-50",
                    getBorderColor(component.freshnessStatus, isInActiveBOM),
                  )}
                >
                  <td className="p-2 font-mono">{component.partNumber}</td>
                  <td className="p-2 text-gray-700">{component.description}</td>
                  <td className="p-2 text-gray-600">{component.supplier}</td>
                  <td className="p-2 text-right font-mono">${component.standardCost.toFixed(2)}</td>
                  <td className="p-2 text-gray-600">{component.lastRefreshDate.toLocaleDateString()}</td>
                  <td className="p-2 text-right font-mono">
                    <span
                      className={cn(
                        component.daysSinceRefresh > 180
                          ? "text-[#DC2626] font-semibold"
                          : component.daysSinceRefresh > 90
                            ? "text-[#F59E0B]"
                            : "",
                      )}
                    >
                      {component.daysSinceRefresh}
                    </span>
                  </td>
                  <td
                    className={cn(
                      "p-2 text-right font-mono",
                      component.variancePct > 10
                        ? "text-[#DC2626] font-semibold"
                        : component.variancePct < -5
                          ? "text-[#059669]"
                          : "text-[#F59E0B]",
                    )}
                  >
                    {component.variancePct > 0 ? "+" : ""}
                    {component.variancePct.toFixed(1)}%
                  </td>
                  <td className="p-2 text-right font-mono">${component.annualSpend.toLocaleString()}</td>
                  <td className="p-2 text-center">
                    <Badge className={cn("text-xs", getFreshnessColor(component.freshnessStatus))}>
                      {component.freshnessStatus}
                    </Badge>
                  </td>
                  <td className="p-2 text-center">
                    <Badge
                      className={cn("text-xs", isInActiveBOM ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700")}
                    >
                      {isInActiveBOM ? "In Active BOM" : "Not in use"}
                    </Badge>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
