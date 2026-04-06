"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { mockComponents, mockAssemblyQuotes, generateLaborAllocation } from "@/lib/mock-data"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, TrendingUp, TrendingDown } from "lucide-react"
import { useMemo, useState } from "react"
import { ComponentCostTable } from "@/components/standard-cost/component-cost-table"
import { ComponentLeadTimeTable } from "@/components/standard-cost/component-lead-time-table"
import { LaborAllocationTable } from "@/components/standard-cost/labor-allocation-table"
import { Input } from "@/components/ui/input"
import type { QuoteForReview } from "@/lib/mock-data"

export function StandardCostGovernance() {
  const [activeView, setActiveView] = useState<"cost" | "leadtime" | "laborallocation">("cost")
  const [selectedAssemblyQuote, setSelectedAssemblyQuote] = useState<string | null>(null)
  const [efficiencyPercent, setEfficiencyPercent] = useState(95)
  const [indirectPercent, setIndirectPercent] = useState(15)

  const selectedQuote = useMemo(() => {
    return selectedAssemblyQuote ? mockAssemblyQuotes.find((q) => q.quoteId === selectedAssemblyQuote) : null
  }, [selectedAssemblyQuote])

  const laborProcesses = useMemo(() => {
    if (!selectedQuote) return []
    return generateLaborAllocation(selectedQuote)
  }, [selectedQuote])

  const components = useMemo(() => {
    if (!selectedAssemblyQuote) {
      return mockComponents
    }

    const selectedQuote = mockAssemblyQuotes.find((q) => q.quoteId === selectedAssemblyQuote)
    if (!selectedQuote) {
      return mockComponents
    }

    // Create a map of part numbers to required quantities
    const bomMap = new Map(selectedQuote.bom.map((item) => [item.partNumber, item.requiredQty]))

    // Filter and enrich components with required quantities
    return mockComponents
      .filter((c) => selectedQuote.partNumbers.includes(c.partNumber))
      .map((c) => ({
        ...c,
        requiredQty: bomMap.get(c.partNumber) || 0,
      }))
  }, [selectedAssemblyQuote])

  const today = new Date()
  const freshCount = components.filter((c) => {
    if (!c.lastPODate) return false
    const daysSinceLastPO = Math.floor((today.getTime() - new Date(c.lastPODate).getTime()) / (1000 * 60 * 60 * 24))
    return daysSinceLastPO <= 90
  }).length

  const atRiskCount = components.filter((c) => {
    if (!c.lastPODate) return false
    const daysSinceLastPO = Math.floor((today.getTime() - new Date(c.lastPODate).getTime()) / (1000 * 60 * 60 * 24))
    return daysSinceLastPO > 90 && daysSinceLastPO <= 180
  }).length

  const criticalCount = components.filter((c) => {
    if (!c.lastPODate) return true // No PO date is critical
    const daysSinceLastPO = Math.floor((today.getTime() - new Date(c.lastPODate).getTime()) / (1000 * 60 * 60 * 24))
    return daysSinceLastPO > 180
  }).length

  const freshPercentage = components.length > 0 ? Math.round((freshCount / components.length) * 100) : 0
  const atRiskPercentage = components.length > 0 ? Math.round((atRiskCount / components.length) * 100) : 0
  const criticalPercentage = components.length > 0 ? Math.round((criticalCount / components.length) * 100) : 0

  const bomCostFromFreshPO = useMemo(() => {
    if (!selectedAssemblyQuote) return null // Only show when assembly quote is selected

    console.log("[v0] Calculating BOM cost for assembly:", selectedAssemblyQuote)

    let totalCost = 0
    let partCount = 0

    components.forEach((c) => {
      const requiredQty = (c as any).requiredQty // Access the enriched field

      if (!c.lastPODate || !requiredQty || !c.lastPOUnitCost) {
        console.log("[v0] Skipping part:", c.partNumber, {
          hasLastPODate: !!c.lastPODate,
          requiredQty,
          lastPOUnitCost: c.lastPOUnitCost,
        })
        return
      }

      const daysSinceLastPO = Math.floor((today.getTime() - new Date(c.lastPODate).getTime()) / (1000 * 60 * 60 * 24))

      if (daysSinceLastPO <= 90) {
        const partCost = requiredQty * c.lastPOUnitCost
        totalCost += partCost
        partCount++
        console.log("[v0] Including part:", c.partNumber, {
          requiredQty,
          lastPOUnitCost: c.lastPOUnitCost,
          partCost,
          daysSinceLastPO,
        })
      }
    })

    console.log("[v0] Total BOM cost:", totalCost, "from", partCount, "parts")
    return totalCost
  }, [components, selectedAssemblyQuote, today])

  const totalBOMCost = useMemo(() => {
    if (!selectedAssemblyQuote) return null // Only show when assembly quote is selected

    let totalCost = 0
    let partCount = 0

    components.forEach((c) => {
      const requiredQty = (c as any).requiredQty // Access the enriched field

      if (!requiredQty || !c.standardCost) {
        return
      }

      const partCost = requiredQty * c.standardCost
      totalCost += partCost
      partCount++
    })

    console.log("[v0] Total BOM Cost calculation:", {
      totalCost,
      partCount,
      selectedAssemblyQuote,
    })

    return totalCost
  }, [components, selectedAssemblyQuote])

  // Generate sparkline data for avg days to refresh
  const sparklineData = Array.from({ length: 12 }, (_, i) => 24 + Math.sin(i) * 8 + Math.random() * 4)

  // Function to create quote review from assembly quote
  const createQuoteReview = (
    quote: any,
    components: any[],
    laborProcesses: any[],
    efficiencyPercent: number,
    indirectPercent: number,
  ): QuoteForReview => {
    // Calculate total material cost
    const totalMaterialCost = components.reduce((sum, c) => {
      const requiredQty = (c as any).requiredQty || 0
      const costForQuote = c.costForQuote || c.standardCost || 0
      return sum + requiredQty * costForQuote
    }, 0)

    // Calculate labor costs
    const totalDirectLabor = laborProcesses.reduce((sum, p) => sum + (p.costPerUnit || 0), 0)
    const totalIndirectLabor = totalDirectLabor * (indirectPercent / 100)

    // Find long lead items (>= 90 days)
    const longLeadItems = components
      .filter((c) => {
        const leadTime = c.leadTimeForQuote || c.lastPOLeadTime || 0
        return leadTime >= 90
      })
      .map((c) => ({
        partNumber: c.partNumber,
        description: c.description,
        leadTime: c.leadTimeForQuote || c.lastPOLeadTime || 0,
        supplier: c.supplierName,
      }))

    const maxLeadTime = Math.max(...components.map((c) => c.leadTimeForQuote || c.lastPOLeadTime || 0), 0)

    const laborOperations = laborProcesses.map((labor) => ({
      operationName: labor.processName,
      workstationId: labor.workstationId,
      workstationName: labor.workstationName,
      plantLocation: labor.plantLocation,
      targetTimePerUnit: labor.targetTimePerUnitSecs,
      laborRate: labor.laborRate,
      headCount: labor.headCountRequired,
      directLaborCost: labor.costPerUnit || 0,
      indirectLaborCost: (labor.costPerUnit || 0) * (indirectPercent / 100),
      partsUsed: labor.partsUsed || [],
    }))

    return {
      quoteId: quote.quoteId,
      quoteName: quote.quoteName,
      requestor: quote.requestor || "Unknown",
      customerName: "Sample Customer Corp",
      productFamily: "Satellite Radio Systems",
      application: "Aerospace Communication",
      requestedQuantity: 100,
      createdDate: new Date(),
      totalMaterialCost,
      totalDirectLabor,
      totalIndirectLabor,
      otherCosts: [],
      standardMargin: 25,
      suggestedMargin: 25,
      maxLeadTime,
      longLeadItems,
      laborOperations, // Now including labor operations
      bom: components.map((c) => ({
        partNumber: c.partNumber,
        requiredQty: (c as any).requiredQty || 0,
        description: c.description,
        unitCost: c.costForQuote || c.standardCost || 0,
        supplierName: c.supplierName,
        costSource: c.selectedCostSource || "Std Cost",
      })),
    }
  }

  // Handler for initiating quote review
  const handleInitiateQuoteReview = () => {
    if (!selectedQuote) {
      alert("Please select an assembly quote first")
      return
    }

    const quoteReview = createQuoteReview(selectedQuote, components, laborProcesses, efficiencyPercent, indirectPercent)

    // Store in localStorage to pass to the review tab
    const existingReviews = JSON.parse(localStorage.getItem("quotesForReview") || "[]")
    const updatedReviews = [...existingReviews.filter((q: any) => q.quoteId !== quoteReview.quoteId), quoteReview]
    localStorage.setItem("quotesForReview", JSON.stringify(updatedReviews))

    // Dispatch custom event to notify the review tab
    window.dispatchEvent(new CustomEvent("quoteAddedForReview"))

    alert(`Quote ${selectedQuote.quoteName} has been sent for review!`)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Standard Cost Governance & Refresh Cycle</h2>

        {selectedAssemblyQuote && (
          <Button onClick={handleInitiateQuoteReview} size="lg" className="bg-green-600 hover:bg-green-700">
            Initiate Quote Review
          </Button>
        )}
      </div>

      {/* Row 1: KPI Cards */}
      <div className="grid gap-4 grid-cols-5">
        {/* KPI 1: Fresh Costs Percentage */}
        <Card className="p-6">
          <div className="space-y-3">
            <p className="text-sm text-gray-600">% of BOM with last PO ≤ 90 days</p>
            <p className="text-4xl font-bold text-gray-900">
              {freshCount} ({freshPercentage}%)
            </p>
            <p className="text-xs text-gray-500">Target ≥ 90%</p>
            <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`absolute h-full ${freshPercentage >= 90 ? "bg-[#059669]" : "bg-[#F59E0B]"}`}
                style={{ width: `${freshPercentage}%` }}
              />
              <div className="absolute h-full w-0.5 bg-gray-700" style={{ left: "90%" }} />
            </div>
            <p className="text-xs text-[#059669] flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +4% from last month
            </p>
          </div>
        </Card>

        {/* KPI 2: Parts At Risk */}
        <Card className="p-6">
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Parts At Risk (90–180 days old)</p>
            <div className="flex items-center justify-between">
              <p className="text-4xl font-bold text-gray-900">
                {atRiskCount} ({atRiskPercentage}%)
              </p>
              <AlertTriangle className="h-8 w-8 text-[#F59E0B]" />
            </div>
            <p className="text-xs text-gray-500">Require refresh within 30 days</p>
            <p className="text-xs text-[#DC2626] flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +12 parts from last week
            </p>
          </div>
        </Card>

        {/* KPI 3: Parts Critical */}
        <Card className="p-6 bg-[#FEE2E2]">
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Parts Critical (≥ 180 days)</p>
            <p className="text-4xl font-bold text-[#DC2626]">
              {criticalCount} ({criticalPercentage}%)
            </p>
            <p className="text-xs text-gray-600">Immediate attention required</p>
            <p className="text-xs text-[#059669] flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              -3 parts from last week
            </p>
          </div>
        </Card>

        {/* KPI 4: BOM Cost from PO ≤ 90 days */}
        <Card className="p-6">
          <div className="space-y-3">
            <p className="text-sm text-gray-600">BOM Cost from PO ≤ 90 days</p>
            {selectedAssemblyQuote && bomCostFromFreshPO !== null ? (
              <>
                <p className="text-4xl font-bold text-gray-900">
                  $
                  {bomCostFromFreshPO.toLocaleString("en-US", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                </p>
                <p className="text-xs text-gray-500">Required Qty × Last PO Unit Cost</p>
                <p className="text-xs text-[#059669] flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Based on {freshCount} fresh parts
                </p>
              </>
            ) : (
              <>
                <p className="text-4xl font-bold text-gray-400">—</p>
                <p className="text-xs text-gray-500">Select an assembly quote</p>
                <p className="text-xs text-gray-400">&nbsp;</p>
              </>
            )}
          </div>
        </Card>

        {/* KPI 5: Total BOM Cost */}
        <Card className="p-6 bg-blue-50">
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Total BOM Cost (Std Cost)</p>
            {selectedAssemblyQuote && totalBOMCost !== null ? (
              <>
                <p className="text-4xl font-bold text-blue-900">
                  ${totalBOMCost.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </p>
                <p className="text-xs text-gray-500">Required Qty × Std Cost</p>
                <p className="text-xs text-blue-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Full BOM valuation
                </p>
              </>
            ) : (
              <>
                <p className="text-4xl font-bold text-gray-400">—</p>
                <p className="text-xs text-gray-500">Select an assembly quote</p>
                <p className="text-xs text-gray-400">&nbsp;</p>
              </>
            )}
          </div>
        </Card>
      </div>

      <div className="flex gap-2 items-center">
        <Button variant={activeView === "cost" ? "default" : "outline"} onClick={() => setActiveView("cost")} size="lg">
          Component Cost Status
        </Button>
        <Button
          variant={activeView === "leadtime" ? "default" : "outline"}
          onClick={() => setActiveView("leadtime")}
          size="lg"
        >
          Component Lead Time
        </Button>
        <Button
          variant={activeView === "laborallocation" ? "default" : "outline"}
          onClick={() => setActiveView("laborallocation")}
          size="lg"
        >
          Labor Allocation
        </Button>

        <div className="ml-4 flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Assembly Quotes:</span>
          <Select
            value={selectedAssemblyQuote || "all"}
            onValueChange={(value) => setSelectedAssemblyQuote(value === "all" ? null : value)}
          >
            <SelectTrigger className="w-[400px]">
              <SelectValue placeholder="All Components" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Components</SelectItem>
              {mockAssemblyQuotes.map((quote) => (
                <SelectItem key={quote.quoteId} value={quote.quoteId}>
                  {quote.quoteName} ({quote.totalParts} parts)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {activeView === "laborallocation" && selectedAssemblyQuote && (
        <Card className="p-4 bg-gray-50">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Efficiency %</label>
              <Input
                type="number"
                value={efficiencyPercent}
                onChange={(e) => setEfficiencyPercent(Number.parseFloat(e.target.value) || 0)}
                className="w-32"
                min="50"
                max="100"
                step="1"
              />
              <p className="text-xs text-gray-500">Labor efficiency (affects actual time)</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Indirect % of Labor</label>
              <Input
                type="number"
                value={indirectPercent}
                onChange={(e) => setIndirectPercent(Number.parseFloat(e.target.value) || 0)}
                className="w-32"
                min="0"
                max="100"
                step="1"
              />
              <p className="text-xs text-gray-500">Indirect labor as % of direct labor</p>
            </div>
          </div>
        </Card>
      )}

      {/* Component Cost Table */}
      {activeView === "cost" && <ComponentCostTable components={components} selectedAssemblyQuote={selectedQuote} />}

      {/* Component Lead Time Table */}
      {activeView === "leadtime" && <ComponentLeadTimeTable components={components} />}

      {/* Labor Allocation Table */}
      {activeView === "laborallocation" && selectedAssemblyQuote && (
        <LaborAllocationTable
          processes={laborProcesses}
          allComponents={mockComponents}
          efficiencyPercent={efficiencyPercent}
          indirectPercent={indirectPercent}
        />
      )}

      {/* Placeholder for Labor Allocation when no quote is selected */}
      {!selectedAssemblyQuote && activeView === "laborallocation" && (
        <Card className="p-8 text-center">
          <p className="text-gray-500">Please select an Assembly Quote to view Labor Allocation</p>
        </Card>
      )}

      {/* Row 3: Refresh Activity Chart */}
      {/* Placeholder for Refresh Activity Chart */}
    </div>
  )
}
