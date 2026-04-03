"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight } from "lucide-react"
import { mockQuoteTrackerItems, mockComponents } from "@/lib/mock-data"

export function QuotesToInvestigate() {
  const [investigateQuoteIds, setInvestigateQuoteIds] = useState<string[]>([])
  const [expandedQuotes, setExpandedQuotes] = useState<Set<string>>(new Set())
  const [removedQuotes, setRemovedQuotes] = useState<Set<string>>(new Set())

  // Poll for investigate quotes from window global state
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof window !== "undefined" && (window as any).investigateQuotes) {
        setInvestigateQuoteIds((window as any).investigateQuotes)
      }
    }, 500)
    return () => clearInterval(interval)
  }, [])

  const quotesToInvestigate = mockQuoteTrackerItems.filter(
    (quote) => investigateQuoteIds.includes(quote.quoteId) && !removedQuotes.has(quote.quoteId),
  )

  const toggleQuote = (quoteId: string) => {
    const newExpanded = new Set(expandedQuotes)
    if (newExpanded.has(quoteId)) {
      newExpanded.delete(quoteId)
    } else {
      newExpanded.add(quoteId)
    }
    setExpandedQuotes(newExpanded)
  }

  const removeFromInvestigation = (quoteId: string) => {
    const newRemoved = new Set(removedQuotes)
    newRemoved.add(quoteId)
    setRemovedQuotes(newRemoved)

    // Also remove from global state
    if (typeof window !== "undefined" && (window as any).investigateQuotes) {
      const updated = (window as any).investigateQuotes.filter((id: string) => id !== quoteId)
      ;(window as any).investigateQuotes = updated
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Converted":
        return "bg-green-100 text-green-800"
      case "Closed":
        return "bg-gray-100 text-gray-800"
      case "Submitted":
        return "bg-blue-100 text-blue-800"
      case "In Process":
        return "bg-yellow-100 text-yellow-800"
      case "Cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatCurrency = (value: number) => `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })

  if (quotesToInvestigate.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quotes to Investigate</h2>
          <p className="text-sm text-gray-600 mt-1">Track quotes flagged for further investigation</p>
        </div>
        <Card className="p-12 text-center">
          <p className="text-gray-500 text-lg">No quotes marked for investigation</p>
          <p className="text-gray-400 text-sm mt-2">
            Use the "Investigate" checkbox in the Quote Tracker to add quotes here
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quotes to Investigate</h2>
          <p className="text-sm text-gray-600 mt-1">
            {quotesToInvestigate.length} quote{quotesToInvestigate.length !== 1 ? "s" : ""} flagged for investigation
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Total Quotes to Investigate</div>
          <div className="text-3xl font-bold text-orange-600">{quotesToInvestigate.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Not Converted</div>
          <div className="text-3xl font-bold text-red-600">
            {quotesToInvestigate.filter((q) => q.status !== "Converted").length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Total Value at Risk</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(quotesToInvestigate.reduce((sum, q) => sum + q.totalQuoteCost, 0))}
          </div>
        </Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Quote ID</TableHead>
              <TableHead>Quote Name</TableHead>
              <TableHead>Requestor</TableHead>
              <TableHead className="text-right">Total Quote Cost</TableHead>
              <TableHead>Sales Order ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date Submitted</TableHead>
              <TableHead className="text-center">Remove</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotesToInvestigate.map((quote) => (
              <>
                <TableRow key={quote.quoteId} className="hover:bg-gray-50">
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleQuote(quote.quoteId)}
                      className="h-6 w-6 p-0"
                    >
                      {expandedQuotes.has(quote.quoteId) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">{quote.quoteId}</TableCell>
                  <TableCell>{quote.quoteName}</TableCell>
                  <TableCell>{quote.requestor}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(quote.totalQuoteCost)}</TableCell>
                  <TableCell>{quote.salesOrderId || <span className="text-red-600">None</span>}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(quote.status)}>{quote.status}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(quote.dateSubmitted)}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromInvestigation(quote.quoteId)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>

                {expandedQuotes.has(quote.quoteId) && (
                  <TableRow>
                    <TableCell colSpan={9} className="bg-gray-50 p-0">
                      <div className="p-4 pl-16">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">BOM Details</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Part Number</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Commodity</TableHead>
                              <TableHead>Supplier</TableHead>
                              <TableHead className="text-right">Qty Required</TableHead>
                              <TableHead className="text-right">Unit Cost</TableHead>
                              <TableHead className="text-right">Extended Cost</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {quote.bom.map((bomItem) => {
                              const component = mockComponents.find((c) => c.partNumber === bomItem.partNumber)
                              if (!component) return null
                              return (
                                <TableRow key={`${quote.quoteId}-${bomItem.partNumber}`}>
                                  <TableCell className="font-medium">{component.partNumber}</TableCell>
                                  <TableCell>{component.description}</TableCell>
                                  <TableCell>{component.commodity}</TableCell>
                                  <TableCell>{component.supplier}</TableCell>
                                  <TableCell className="text-right">{bomItem.requiredQty}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(component.standardCost)}</TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatCurrency(component.standardCost * bomItem.requiredQty)}
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
