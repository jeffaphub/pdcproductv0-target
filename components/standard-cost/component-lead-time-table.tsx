"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Component } from "@/lib/mock-data"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

type ComponentLeadTimeTableProps = {
  components: Component[]
}

export function ComponentLeadTimeTable({ components }: ComponentLeadTimeTableProps) {
  const [search, setSearch] = useState("")
  const [showOnlyDelayed, setShowOnlyDelayed] = useState(false)
  const [selectedCommodities, setSelectedCommodities] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [sortColumn, setSortColumn] = useState<keyof Component>("leadTimeVarianceDays")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [leadTimeSources, setLeadTimeSources] = useState<Record<string, "lastPO" | "historical" | "quoted">>({})
  const itemsPerPage = 25

  const commodities = useMemo(() => Array.from(new Set(components.map((c) => c.commodity))), [components])

  const calculateDaysSinceLastPO = (lastPODate: Date | null): number => {
    if (!lastPODate) return 0
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - lastPODate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getLeadTimeForQuote = (component: Component): number | null => {
    const source = leadTimeSources[component.partNumber] || "lastPO"

    switch (source) {
      case "lastPO":
        return component.lastPOLeadTime
      case "historical":
        return component.historicalLeadTimeDays
      case "quoted":
        return component.quotedLeadTimeDays
      default:
        return component.lastPOLeadTime
    }
  }

  const handleLeadTimeSourceChange = (partNumber: string, source: "lastPO" | "historical" | "quoted") => {
    setLeadTimeSources((prev) => ({ ...prev, [partNumber]: source }))
  }

  const filteredComponents = useMemo(() => {
    const filtered = components.filter((c) => {
      const matchesSearch =
        search === "" ||
        c.partNumber.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase())

      const matchesDelayed = !showOnlyDelayed || c.leadTimeVarianceDays > 10

      const matchesCommodity = selectedCommodities.length === 0 || selectedCommodities.includes(c.commodity)

      return matchesSearch && matchesDelayed && matchesCommodity
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

    return filtered
  }, [components, search, showOnlyDelayed, selectedCommodities, sortColumn, sortDirection])

  const totalPages = Math.ceil(filteredComponents.length / itemsPerPage)
  const paginatedComponents = filteredComponents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handleSort = (column: keyof Component) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const toggleCommodity = (commodity: string) => {
    setSelectedCommodities((prev) =>
      prev.includes(commodity) ? prev.filter((c) => c !== commodity) : [...prev, commodity],
    )
  }

  const getBorderColor = (variance: number) => {
    if (variance > 20) return "border-l-4 border-l-[#DC2626]"
    if (variance > 10) return "border-l-4 border-l-[#F59E0B]"
    return ""
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Component Lead Time</h3>

      {/* Filters */}
      <div className="space-y-4 mb-4">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={showOnlyDelayed ? "default" : "outline"}
            size="sm"
            onClick={() => setShowOnlyDelayed(!showOnlyDelayed)}
          >
            Show only Delayed (&gt;10 days)
          </Button>
          {commodities.map((commodity) => (
            <Button
              key={commodity}
              variant={selectedCommodities.includes(commodity) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleCommodity(commodity)}
            >
              {commodity}
            </Button>
          ))}
        </div>
        <Input
          placeholder="Search by part number or description"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th
                className="text-left p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("partNumber")}
              >
                Part Number
              </th>
              <th className="text-left p-2 font-medium text-gray-700">Description</th>
              <th className="text-left p-2 font-medium text-gray-700">Commodity</th>
              <th className="text-left p-2 font-medium text-gray-700">Supplier</th>
              <th
                className="text-right p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("lastPODate")}
              >
                Days Since Last PO
              </th>
              <th
                className="text-left p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("lastPODate")}
              >
                Last PO Date
              </th>
              <th
                className="text-right p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("lastPOLeadTime")}
              >
                Last PO Lead Time (days)
              </th>
              <th
                className="text-right p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("historicalLeadTimeDays")}
              >
                Historical Lead Time (days)
              </th>
              <th
                className="text-right p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("quotedLeadTimeDays")}
              >
                Quoted Lead Time (days)
              </th>
              <th className="text-left p-2 font-medium text-gray-700">Select Lead Time Source</th>
              <th className="text-right p-2 font-medium text-gray-700">Lead Time for Quote</th>
            </tr>
          </thead>
          <tbody>
            {paginatedComponents.map((component) => {
              const daysSinceLastPO = calculateDaysSinceLastPO(component.lastPODate)
              const selectedSource = leadTimeSources[component.partNumber] || "lastPO"
              const leadTimeForQuote = getLeadTimeForQuote(component)

              return (
                <tr
                  key={component.partNumber}
                  className={cn(
                    "border-b border-gray-100 hover:bg-gray-50 transition-colors",
                    getBorderColor(component.leadTimeVarianceDays),
                  )}
                >
                  <td className="p-2 font-mono text-xs">{component.partNumber}</td>
                  <td className="p-2 text-gray-700">{component.description}</td>
                  <td className="p-2">{component.commodity}</td>
                  <td className="p-2 text-gray-600 text-xs">{component.supplier}</td>
                  <td className="p-2 text-right font-mono">
                    <span
                      className={cn(
                        daysSinceLastPO > 180
                          ? "text-[#DC2626] font-semibold"
                          : daysSinceLastPO > 90
                            ? "text-[#F59E0B]"
                            : "",
                      )}
                    >
                      {component.lastPODate ? daysSinceLastPO : "-"}
                    </span>
                  </td>
                  <td className="p-2 text-gray-600 text-xs">
                    {component.lastPODate ? component.lastPODate.toLocaleDateString() : "-"}
                  </td>
                  <td className="p-2 text-right font-mono">
                    {component.lastPOLeadTime ? component.lastPOLeadTime : "-"}
                  </td>
                  <td className="p-2 text-right font-mono">{component.historicalLeadTimeDays}</td>
                  <td className="p-2 text-right font-mono">
                    {component.quotedLeadTimeDays ? component.quotedLeadTimeDays : "-"}
                  </td>
                  <td className="p-2">
                    <Select
                      value={selectedSource}
                      onValueChange={(value) =>
                        handleLeadTimeSourceChange(component.partNumber, value as "lastPO" | "historical" | "quoted")
                      }
                    >
                      <SelectTrigger className="w-[180px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lastPO">Last PO Lead Time</SelectItem>
                        <SelectItem value="historical">Historical Lead Time</SelectItem>
                        <SelectItem value="quoted">Quoted Lead Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2 text-right">
                    <span className="font-mono text-blue-600 font-semibold">
                      {leadTimeForQuote !== null ? `${leadTimeForQuote} days` : "-"}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-600">
          Page {currentPage} of {totalPages} ({filteredComponents.length} items)
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
