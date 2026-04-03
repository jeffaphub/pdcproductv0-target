"use client"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, X, AlertTriangle } from "lucide-react"
import { useState, useEffect } from "react"
import type { QuoteForReview } from "@/lib/mock-data"

export function QuotesForReview() {
  const [quotes, setQuotes] = useState<QuoteForReview[]>([])
  const [selectedQuote, setSelectedQuote] = useState<QuoteForReview | null>(null)

  useEffect(() => {
    const loadQuotes = () => {
      const stored = localStorage.getItem("quotesForReview")
      if (stored) {
        const parsed = JSON.parse(stored)
        const quotesWithDates = parsed.map((q: any) => ({
          ...q,
          createdDate: new Date(q.createdDate),
          bom: q.bom || [],
          laborOperations: q.laborOperations || [],
          longLeadItems: q.longLeadItems || [],
          otherCosts: q.otherCosts || [],
        }))
        setQuotes(quotesWithDates)
        if (quotesWithDates.length > 0 && !selectedQuote) {
          setSelectedQuote(quotesWithDates[0])
        }
      }
    }

    loadQuotes()

    // Listen for new quotes being added
    const handleQuoteAdded = () => {
      loadQuotes()
    }

    window.addEventListener("quoteAddedForReview", handleQuoteAdded)
    return () => window.removeEventListener("quoteAddedForReview", handleQuoteAdded)
  }, [])

  const handleAddOtherCost = () => {
    if (!selectedQuote) return
    const updatedQuote = {
      ...selectedQuote,
      otherCosts: [...selectedQuote.otherCosts, { name: "New Cost Item", cost: 0 }],
    }
    setSelectedQuote(updatedQuote)
    updateQuote(updatedQuote)
  }

  const handleRemoveOtherCost = (index: number) => {
    if (!selectedQuote) return
    const updatedQuote = {
      ...selectedQuote,
      otherCosts: selectedQuote.otherCosts.filter((_, i) => i !== index),
    }
    setSelectedQuote(updatedQuote)
    updateQuote(updatedQuote)
  }

  const handleUpdateOtherCost = (index: number, field: "name" | "cost", value: string | number) => {
    if (!selectedQuote) return
    const updatedQuote = {
      ...selectedQuote,
      otherCosts: selectedQuote.otherCosts.map((cost, i) => (i === index ? { ...cost, [field]: value } : cost)),
    }
    setSelectedQuote(updatedQuote)
    updateQuote(updatedQuote)
  }

  const handleUpdateQuantity = (value: number) => {
    if (!selectedQuote) return
    const updatedQuote = { ...selectedQuote, requestedQuantity: value }
    setSelectedQuote(updatedQuote)
    updateQuote(updatedQuote)
  }

  const handleUpdateMargin = (value: number) => {
    if (!selectedQuote) return
    const updatedQuote = { ...selectedQuote, suggestedMargin: value }
    setSelectedQuote(updatedQuote)
    updateQuote(updatedQuote)
  }

  const updateQuote = (updatedQuote: QuoteForReview) => {
    setQuotes(quotes.map((q) => (q.quoteId === updatedQuote.quoteId ? updatedQuote : q)))
  }

  const calculateTotalCost = (quote: QuoteForReview) => {
    const otherCostsTotal = quote.otherCosts.reduce((sum, cost) => sum + cost.cost, 0)
    return quote.totalMaterialCost + quote.totalDirectLabor + quote.totalIndirectLabor + otherCostsTotal
  }

  const calculateSuggestedUnitPrice = (quote: QuoteForReview) => {
    const totalCost = calculateTotalCost(quote)
    return totalCost * (1 + quote.suggestedMargin / 100)
  }

  const calculateSuggestedQuotePrice = (quote: QuoteForReview) => {
    return calculateSuggestedUnitPrice(quote) * quote.requestedQuantity
  }

  if (quotes.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Quotes for Review</h2>
        <Card className="p-12 text-center">
          <p className="text-gray-500 text-lg">No quotes in review</p>
          <p className="text-gray-400 text-sm mt-2">
            Select a quote in Standard Cost Governance and click "Initiate Quote Review"
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Quotes for Review</h2>

      {/* Quote Selection */}
      <div className="flex gap-2">
        {quotes.map((quote) => (
          <Button
            key={quote.quoteId}
            variant={selectedQuote?.quoteId === quote.quoteId ? "default" : "outline"}
            onClick={() => setSelectedQuote(quote)}
          >
            {quote.quoteName}
          </Button>
        ))}
      </div>

      {selectedQuote && (
        <>
          {/* General Information */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">General Information</h3>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-600">Quote ID</label>
                <p className="text-base font-semibold text-gray-900">{selectedQuote.quoteId}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Requestor</label>
                <p className="text-base font-semibold text-gray-900">{selectedQuote.requestor}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Customer Name</label>
                <p className="text-base font-semibold text-gray-900">{selectedQuote.customerName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Product Family</label>
                <p className="text-base font-semibold text-gray-900">{selectedQuote.productFamily}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Application</label>
                <p className="text-base font-semibold text-gray-900">{selectedQuote.application}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Requested Quantity</label>
                <Input
                  type="number"
                  value={selectedQuote.requestedQuantity}
                  onChange={(e) => handleUpdateQuantity(Number.parseInt(e.target.value) || 0)}
                  className="w-32 mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Created Date</label>
                <p className="text-base font-semibold text-gray-900">
                  {selectedQuote.createdDate.toLocaleDateString()}
                </p>
              </div>
            </div>
          </Card>

          {/* Cost Breakdown & Pricing */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Cost Breakdown & Pricing</h3>

            <div className="space-y-4">
              {/* Material Cost */}
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm font-medium text-gray-700">Total Material Cost</span>
                <span className="text-base font-bold text-gray-900">
                  $
                  {selectedQuote.totalMaterialCost.toLocaleString("en-US", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                </span>
              </div>

              {/* Direct Labor */}
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm font-medium text-gray-700">Total Direct Labor</span>
                <span className="text-base font-bold text-gray-900">
                  $
                  {selectedQuote.totalDirectLabor.toLocaleString("en-US", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                </span>
              </div>

              {/* Indirect Labor */}
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm font-medium text-gray-700">Total Indirect Labor</span>
                <span className="text-base font-bold text-gray-900">
                  $
                  {selectedQuote.totalIndirectLabor.toLocaleString("en-US", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                </span>
              </div>

              {/* Total Labor Cost */}
              <div className="flex justify-between items-center py-2 border-b bg-blue-50 px-3 -mx-3">
                <span className="text-sm font-semibold text-gray-900">Total Labor Cost</span>
                <span className="text-base font-bold text-blue-900">
                  $
                  {(selectedQuote.totalDirectLabor + selectedQuote.totalIndirectLabor).toLocaleString("en-US", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                </span>
              </div>

              {/* Other Costs */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Other Cost Components</span>
                  <Button size="sm" variant="outline" onClick={handleAddOtherCost}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Cost
                  </Button>
                </div>
                {selectedQuote.otherCosts.map((cost, index) => (
                  <div key={index} className="flex gap-2 items-center pl-4">
                    <Input
                      value={cost.name}
                      onChange={(e) => handleUpdateOtherCost(index, "name", e.target.value)}
                      className="flex-1"
                      placeholder="Cost name"
                    />
                    <Input
                      type="number"
                      value={cost.cost}
                      onChange={(e) => handleUpdateOtherCost(index, "cost", Number.parseFloat(e.target.value) || 0)}
                      className="w-32"
                      placeholder="0.00"
                    />
                    <Button size="sm" variant="ghost" onClick={() => handleRemoveOtherCost(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Total Cost */}
              <div className="flex justify-between items-center py-3 border-t-2 border-gray-300">
                <span className="text-base font-bold text-gray-900">Total Cost</span>
                <span className="text-xl font-bold text-gray-900">
                  $
                  {calculateTotalCost(selectedQuote).toLocaleString("en-US", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                </span>
              </div>

              {/* Margins */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Standard Margin</label>
                  <div className="text-2xl font-bold text-gray-900">{selectedQuote.standardMargin}%</div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Suggested Margin</label>
                  <Input
                    type="number"
                    value={selectedQuote.suggestedMargin}
                    onChange={(e) => handleUpdateMargin(Number.parseFloat(e.target.value) || 0)}
                    className="w-32 text-lg font-bold"
                    step="0.1"
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-3 pt-4 bg-green-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold text-gray-900">Suggested Unit Price</span>
                  <span className="text-2xl font-bold text-green-700">
                    $
                    {calculateSuggestedUnitPrice(selectedQuote).toLocaleString("en-US", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-green-200">
                  <span className="text-base font-bold text-gray-900">
                    Suggested Quote Price ({selectedQuote.requestedQuantity} units)
                  </span>
                  <span className="text-3xl font-bold text-green-800">
                    $
                    {calculateSuggestedQuotePrice(selectedQuote).toLocaleString("en-US", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* BOM Details */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">BOM Details</h3>
            {selectedQuote.bom && selectedQuote.bom.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Supplier Name</TableHead>
                    <TableHead>Source of Cost</TableHead>
                    <TableHead className="text-right">Required Qty</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Extended Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedQuote.bom.map((item) => (
                    <TableRow key={item.partNumber}>
                      <TableCell className="font-mono text-sm">{item.partNumber}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.supplier}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.costSource}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{item.requiredQty}</TableCell>
                      <TableCell className="text-right">${(item.unitCost || 0).toFixed(1)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        $
                        {((item.requiredQty || 0) * (item.unitCost || 0)).toLocaleString("en-US", {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-gray-500 text-center py-8">No BOM items available</p>
            )}
          </Card>

          {/* Labor Cost Details */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Labor Cost Details</h3>
            {selectedQuote.laborOperations && selectedQuote.laborOperations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operation</TableHead>
                    <TableHead>Workstation</TableHead>
                    <TableHead>Plant Location</TableHead>
                    <TableHead className="text-right">Target Time/Unit (sec)</TableHead>
                    <TableHead className="text-right">Labor Rate ($/hr)</TableHead>
                    <TableHead className="text-right">Head Count</TableHead>
                    <TableHead className="text-right">Direct Labor Cost</TableHead>
                    <TableHead className="text-right">Indirect Labor Cost</TableHead>
                    <TableHead className="text-right">Total Labor Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedQuote.laborOperations.map((operation, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{operation.operationName}</TableCell>
                      <TableCell>{operation.workstationId}</TableCell>
                      <TableCell>{operation.plantLocation}</TableCell>
                      <TableCell className="text-right">{operation.targetTimePerUnit}</TableCell>
                      <TableCell className="text-right">${(operation.laborRate || 0).toFixed(1)}</TableCell>
                      <TableCell className="text-right">{operation.headCount}</TableCell>
                      <TableCell className="text-right">${(operation.directLaborCost || 0).toFixed(1)}</TableCell>
                      <TableCell className="text-right">${(operation.indirectLaborCost || 0).toFixed(1)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        ${((operation.directLaborCost || 0) + (operation.indirectLaborCost || 0)).toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-gray-50 font-semibold">
                    <TableCell colSpan={6}>Total Labor</TableCell>
                    <TableCell className="text-right">${(selectedQuote.totalDirectLabor || 0).toFixed(1)}</TableCell>
                    <TableCell className="text-right">${(selectedQuote.totalIndirectLabor || 0).toFixed(1)}</TableCell>
                    <TableCell className="text-right">
                      ${((selectedQuote.totalDirectLabor || 0) + (selectedQuote.totalIndirectLabor || 0)).toFixed(1)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            ) : (
              <p className="text-gray-500 text-center py-8">No labor operations available</p>
            )}
          </Card>

          {/* Lead Time Analysis */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Lead Time Analysis</h3>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <Card className="p-4 bg-yellow-50">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm font-medium text-gray-700">Max Lead Time</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{selectedQuote.maxLeadTime} days</p>
              </Card>

              <Card className="p-4 bg-red-50">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-gray-700">Long Lead Items</span>
                </div>
                <p className="text-3xl font-bold text-red-700">{selectedQuote.longLeadItems.length} parts</p>
              </Card>
            </div>

            {selectedQuote.longLeadItems.length > 0 && (
              <>
                <h4 className="text-base font-semibold text-gray-900 mb-3">Long Lead Time Parts (≥ 90 days)</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Part Number</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-right">Lead Time (days)</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedQuote.longLeadItems?.map((item) => (
                      <TableRow key={item.partNumber}>
                        <TableCell className="font-mono text-sm">{item.partNumber}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.supplier}</TableCell>
                        <TableCell className="text-right font-semibold">{item.leadTime}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="destructive">Critical</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </Card>
        </>
      )}
    </div>
  )
}

// Function to be called from Standard Cost Governance
export function addQuoteForReview(quote: QuoteForReview) {
  // This will be handled via global state or context
  console.log("[v0] Adding quote for review:", quote.quoteId)
}
