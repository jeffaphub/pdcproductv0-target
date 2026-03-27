"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Component, FreshnessStatus, RFQStatus, QuoteRisk, AssemblyQuote } from "@/lib/mock-data"
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

type ComponentCostTableProps = {
  components: Component[]
  selectedAssemblyQuote?: AssemblyQuote | null
}

export function ComponentCostTable({ components, selectedAssemblyQuote }: ComponentCostTableProps) {
  const [search, setSearch] = useState("")
  const [showOnlyCritical, setShowOnlyCritical] = useState(false)
  const [selectedCommodities, setSelectedCommodities] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [sortColumn, setSortColumn] = useState<keyof Component>("daysSinceRefresh")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [selectedParts, setSelectedParts] = useState<Set<string>>(new Set())
  const [costSources, setCostSources] = useState<Record<string, "std" | "avgPO" | "lastPO" | "lastRFQ">>({})
  const itemsPerPage = 25

  const commodities = useMemo(() => Array.from(new Set(components.map((c) => c.commodity))), [components])

  const calculateDaysSinceLastPO = (lastPODate: Date | null): number => {
    if (!lastPODate) return 0
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - lastPODate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const filteredComponents = useMemo(() => {
    const filtered = components.filter((c) => {
      const matchesSearch =
        search === "" ||
        c.partNumber.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase())

      const matchesCritical = !showOnlyCritical || c.freshnessStatus === "Critical" || c.freshnessStatus === "Stale"

      const matchesCommodity = selectedCommodities.length === 0 || selectedCommodities.includes(c.commodity)

      return matchesSearch && matchesCritical && matchesCommodity
    })

    // Sort
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
  }, [components, search, showOnlyCritical, selectedCommodities, sortColumn, sortDirection])

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

  const handleIssueRFQ = (partNumber: string, checked: boolean) => {
    setSelectedParts((prev) => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(partNumber)
      } else {
        newSet.delete(partNumber)
      }
      return newSet
    })
    console.log(`[v0] RFQ ${checked ? "issued" : "cancelled"} for part: ${partNumber}`)
  }

  const handleCostSourceChange = (partNumber: string, source: "std" | "avgPO" | "lastPO" | "lastRFQ") => {
    setCostSources((prev) => ({ ...prev, [partNumber]: source }))
  }

  const getCostForQuote = (component: Component): number => {
    const source = costSources[component.partNumber] || "std"
    switch (source) {
      case "std":
        return component.standardCost
      case "avgPO":
        return component.avgRecentPOCost
      case "lastPO":
        return component.lastPOUnitCost || component.standardCost
      case "lastRFQ":
        return component.lastRFQUnitCost || component.standardCost
      default:
        return component.standardCost
    }
  }

  const getFreshnessColor = (status: FreshnessStatus) => {
    switch (status) {
      case "Fresh":
        return "bg-[#059669] text-white"
      case "At Risk":
        return "bg-[#7706d9] text-white"
      case "Stale":
        return "bg-[#DC2626] text-white"
      case "Critical":
        return "bg-[#DC2626] text-white"
    }
  }

  const getVarianceColor = (variance: number) => {
    if (variance < -5) return "text-[#059669]"
    if (variance > 10) return "text-[#DC2626]"
    return "text-[#8126dc]"
  }

  const getRFQStatusColor = (status: RFQStatus | null) => {
    if (!status) return "bg-gray-200 text-gray-600"
    switch (status) {
      case "Open":
        return "bg-blue-100 text-blue-800"
      case "RFQ Sent":
        return "bg-yellow-100 text-yellow-800"
      case "Received":
        return "bg-green-100 text-green-800"
      case "Cancelled":
        return "bg-gray-200 text-gray-600"
      case "Closed":
        return "bg-purple-100 text-purple-800"
    }
  }

  const getQuoteRiskColor = (risk: QuoteRisk) => {
    switch (risk) {
      case "Low":
        return "bg-[#059669] text-white"
      case "Medium":
        return "bg-[#7706d9] text-white"
      case "High":
        return "bg-[#DC2626] text-white"
    }
  }

  const getBorderColor = (status: FreshnessStatus) => {
    if (status === "Critical") return "border-l-4 border-l-[#DC2626]"
    if (status === "At Risk") return "border-l-4 border-l-[#7706d9]"
    return ""
  }

  const getRequiredQty = (partNumber: string): number | null => {
    if (!selectedAssemblyQuote) return null
    const bomItem = selectedAssemblyQuote.bom.find((item) => item.partNumber === partNumber)
    return bomItem ? bomItem.requiredQty : null
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Component Cost Status</h3>

      {/* Filters */}
      <div className="space-y-4 mb-4">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={showOnlyCritical ? "default" : "outline"}
            size="sm"
            onClick={() => setShowOnlyCritical(!showOnlyCritical)}
          >
            Show only Critical & Stale
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
              {selectedAssemblyQuote && <th className="text-right p-2 font-medium text-gray-700">Required Qty</th>}
              <th
                className="text-right p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("lastPODate")}
              >
                Days Since Last PO
              </th>
              <th
                className="text-right p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("standardCost")}
              >
                Std Cost/Unit
              </th>
              <th
                className="text-right p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("avgRecentPOCost")}
              >
                Avg PO Cost/Unit
              </th>
              <th
                className="text-right p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("variancePct")}
              >
                Variance %
              </th>
              <th
                className="text-right p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("annualSpend")}
              >
                Annual Spend
              </th>
              <th
                className="text-right p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("inventoryAmount")}
              >
                Inv Qty
              </th>
              <th
                className="text-right p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("inventoryValue")}
              >
                Inv Value
              </th>
              <th
                className="text-left p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("lastPODate")}
              >
                Last PO Date
              </th>
              <th
                className="text-right p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("lastPOValue")}
              >
                Last PO Value
              </th>
              <th
                className="text-right p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("lastPOUnitCost")}
              >
                Last PO Cost/Unit
              </th>
              <th
                className="text-left p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("rfqDate")}
              >
                RFQ Date
              </th>
              <th
                className="text-right p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("lastRFQUnitCost")}
              >
                Last RFQ Cost/Unit
              </th>
              <th className="text-center p-2 font-medium text-gray-700">Issue RFQ</th>
              <th className="text-center p-2 font-medium text-gray-700">RFQ Status</th>
              <th
                className="text-center p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("quoteRisk")}
              >
                Quote Risk
              </th>
              <th className="text-center p-2 font-medium text-gray-700">Select Cost Source</th>
              <th className="text-right p-2 font-medium text-gray-700">Cost for Quote</th>
            </tr>
          </thead>
          <tbody>
            {paginatedComponents.map((component) => {
              const daysSinceLastPO = calculateDaysSinceLastPO(component.lastPODate)
              const costForQuote = getCostForQuote(component)

              return (
                <tr
                  key={component.partNumber}
                  className={cn(
                    "border-b border-gray-100 hover:bg-gray-50 transition-colors",
                    getBorderColor(component.freshnessStatus),
                  )}
                >
                  <td className="p-2 font-mono text-xs">{component.partNumber}</td>
                  <td className="p-2 text-gray-700">{component.description}</td>
                  <td className="p-2">{component.commodity}</td>
                  <td className="p-2 text-gray-600 text-xs">{component.supplier}</td>
                  {selectedAssemblyQuote && (
                    <td className="p-2 text-right font-mono font-semibold text-blue-600">
                      {getRequiredQty(component.partNumber)}
                    </td>
                  )}
                  <td className="p-2 text-right font-mono">
                    <span
                      className={cn(
                        daysSinceLastPO > 180
                          ? "text-[#DC2626] font-semibold"
                          : daysSinceLastPO > 90
                            ? "text-[#8126dc]"
                            : "",
                      )}
                    >
                      {component.lastPODate ? daysSinceLastPO : "-"}
                    </span>
                  </td>
                  <td className="p-2 text-right font-mono">${component.standardCost.toFixed(1)}</td>
                  <td className="p-2 text-right font-mono">${component.avgRecentPOCost.toFixed(1)}</td>
                  <td className={cn("p-2 text-right font-mono font-semibold", getVarianceColor(component.variancePct))}>
                    {component.variancePct > 0 ? "+" : ""}
                    {component.variancePct.toFixed(1)}%
                  </td>
                  <td className="p-2 text-right font-mono">
                    $
                    {Number(component.annualSpend).toLocaleString("en-US", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}
                  </td>
                  <td className="p-2 text-right font-mono">
                    {component.inventoryAmount > 0 ? component.inventoryAmount : "-"}
                  </td>
                  <td className="p-2 text-right font-mono">
                    {component.inventoryValue
                      ? `$${Number(component.inventoryValue).toLocaleString("en-US", {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}`
                      : "-"}
                  </td>
                  <td className="p-2 text-gray-600 text-xs">
                    {component.lastPODate ? component.lastPODate.toLocaleDateString() : "-"}
                  </td>
                  <td className="p-2 text-right font-mono">
                    {component.lastPOValue
                      ? `$${Number(component.lastPOValue).toLocaleString("en-US", {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}`
                      : "-"}
                  </td>
                  <td className="p-2 text-right font-mono">
                    {component.lastPOUnitCost ? `$${component.lastPOUnitCost.toFixed(1)}` : "-"}
                  </td>
                  <td className="p-2 text-gray-600 text-xs">
                    {component.rfqDate ? component.rfqDate.toLocaleDateString() : "-"}
                  </td>
                  <td className="p-2 text-right font-mono">
                    {component.lastRFQUnitCost ? `$${component.lastRFQUnitCost.toFixed(1)}` : "-"}
                  </td>
                  <td className="p-2 text-center">
                    <Checkbox
                      checked={selectedParts.has(component.partNumber)}
                      onCheckedChange={(checked) => handleIssueRFQ(component.partNumber, checked === true)}
                    />
                  </td>
                  <td className="p-2 text-center">
                    <Badge className={cn("text-xs", getRFQStatusColor(component.rfqStatus))}>
                      {component.rfqStatus || "None"}
                    </Badge>
                  </td>
                  <td className="p-2 text-center">
                    <Badge className={cn("text-xs", getQuoteRiskColor(component.quoteRisk))}>
                      {component.quoteRisk === "High" && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                      {component.quoteRisk}
                    </Badge>
                  </td>
                  <td className="p-2">
                    <Select
                      value={costSources[component.partNumber] || "std"}
                      onValueChange={(value: "std" | "avgPO" | "lastPO" | "lastRFQ") =>
                        handleCostSourceChange(component.partNumber, value)
                      }
                    >
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="std">Std Cost/Unit</SelectItem>
                        <SelectItem value="avgPO">Avg PO Cost/Unit</SelectItem>
                        <SelectItem value="lastPO">Last PO Cost/Unit</SelectItem>
                        <SelectItem value="lastRFQ">Last RFQ Cost/Unit</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2 text-right font-mono font-semibold text-blue-700">${costForQuote.toFixed(1)}</td>
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
