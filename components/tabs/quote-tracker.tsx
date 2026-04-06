"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox" // Added Checkbox import
import { ChevronDown, ChevronRight, Search } from "lucide-react"
import { mockQuoteTrackerItems, mockComponents } from "@/lib/mock-data"

export function QuoteTracker() {
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedQuotes, setExpandedQuotes] = useState<Set<string>>(new Set())
  const [expandedFulfillments, setExpandedFulfillments] = useState<Set<string>>(new Set())
  const [investigateQuotes, setInvestigateQuotes] = useState<Set<string>>(new Set())

  const filteredQuotes = mockQuoteTrackerItems.filter(
    (quote) =>
      quote.quoteId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.quoteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.requestor.toLowerCase().includes(searchTerm.toLowerCase()) || // Added requestor search
      quote.crmId.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const totalQuotes = filteredQuotes.length
  const convertedQuotes = filteredQuotes.filter((q) => q.status === "Converted").length
  const totalCostAllQuotes = filteredQuotes.reduce((sum, q) => sum + q.totalQuoteCost, 0)
  const totalCostConverted = filteredQuotes
    .filter((q) => q.status === "Converted")
    .reduce((sum, q) => sum + q.totalQuoteCost, 0)

  const toggleInvestigate = (quoteId: string) => {
    const newInvestigate = new Set(investigateQuotes)
    if (newInvestigate.has(quoteId)) {
      newInvestigate.delete(quoteId)
    } else {
      newInvestigate.add(quoteId)
    }
    setInvestigateQuotes(newInvestigate)

    // Store in global state so other tab can access
    if (typeof window !== "undefined") {
      ;(window as any).investigateQuotes = Array.from(newInvestigate)
    }
  }

  const toggleQuote = (quoteId: string) => {
    const newExpanded = new Set(expandedQuotes)
    if (newExpanded.has(quoteId)) {
      newExpanded.delete(quoteId)
    } else {
      newExpanded.add(quoteId)
    }
    setExpandedQuotes(newExpanded)
  }

  const toggleFulfillment = (fulfillmentId: string) => {
    const newExpanded = new Set(expandedFulfillments)
    if (newExpanded.has(fulfillmentId)) {
      newExpanded.delete(fulfillmentId)
    } else {
      newExpanded.add(fulfillmentId)
    }
    setExpandedFulfillments(newExpanded)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quote Tracker</h2>
          <p className="text-sm text-gray-600 mt-1">Track assembly quotes through their lifecycle</p>
        </div>
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by Quote ID, Name, Requestor, or CRM ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">No of Quotes</div>
          <div className="text-3xl font-bold text-gray-900">{totalQuotes}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">No of Quotes Converted</div>
          <div className="text-3xl font-bold text-green-600">{convertedQuotes}</div>
          <div className="text-xs text-gray-500 mt-1">
            {totalQuotes > 0 ? `${Math.round((convertedQuotes / totalQuotes) * 100)}% conversion rate` : ""}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Total Cost of All Quotes</div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalCostAllQuotes)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Total Cost of Converted</div>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(totalCostConverted)}</div>
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
              <TableHead className="text-right">Total Units</TableHead>
              <TableHead className="text-right">BOM Qty/Unit</TableHead>
              <TableHead className="text-right">Unit Cost</TableHead>
              <TableHead className="text-right">Total Quote Cost</TableHead>
              <TableHead>Sales Order ID</TableHead>
              <TableHead>CRM ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date Submitted</TableHead>
              <TableHead>Date Converted</TableHead>
              <TableHead className="text-center">Investigate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredQuotes.map((quote) => (
              <>
                <TableRow key={quote.quoteId} className="cursor-pointer hover:bg-gray-50">
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
                  <TableCell className="text-right">{quote.totalUnits}</TableCell>
                  <TableCell className="text-right">{quote.bomQtyPerUnit}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(quote.unitCost)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(quote.totalQuoteCost)}</TableCell>
                  <TableCell>{quote.salesOrderId || "—"}</TableCell>
                  <TableCell>{quote.crmId}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(quote.status)}>{quote.status}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(quote.dateSubmitted)}</TableCell>
                  <TableCell>{quote.dateConverted ? formatDate(quote.dateConverted) : "—"}</TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={investigateQuotes.has(quote.quoteId)}
                      onCheckedChange={() => toggleInvestigate(quote.quoteId)}
                    />
                  </TableCell>
                </TableRow>

                {expandedQuotes.has(quote.quoteId) && quote.fulfillments.length > 0 && (
                  <>
                    <TableRow className="bg-blue-100">
                      <TableCell></TableCell>
                      <TableCell colSpan={2} className="pl-12 font-semibold">
                        Fulfillment ID
                      </TableCell>
                      <TableCell className="font-semibold">Requestor</TableCell>
                      <TableCell className="text-right font-semibold">Units</TableCell>
                      <TableCell className="font-semibold">Fulfillment Date</TableCell>
                      <TableCell colSpan={2} className="font-semibold">
                        Shipment Code
                      </TableCell>
                      <TableCell colSpan={6} className="font-semibold">
                        Delivery Location
                      </TableCell>
                    </TableRow>
                    {quote.fulfillments.map((fulfillment) => (
                      <>
                        <TableRow key={fulfillment.fulfillmentId} className="bg-blue-50">
                          <TableCell></TableCell>
                          <TableCell colSpan={2} className="pl-12">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleFulfillment(fulfillment.fulfillmentId)}
                              className="h-6 p-0 hover:bg-blue-100"
                            >
                              {expandedFulfillments.has(fulfillment.fulfillmentId) ? (
                                <ChevronDown className="h-4 w-4 mr-2" />
                              ) : (
                                <ChevronRight className="h-4 w-4 mr-2" />
                              )}
                              <span className="font-medium">{fulfillment.fulfillmentId}</span>
                            </Button>
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-right font-medium">{fulfillment.unitsRequired}</TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {formatDate(fulfillment.fulfillmentDate)}
                          </TableCell>
                          <TableCell colSpan={2} className="text-sm">
                            {fulfillment.clientShipmentCode}
                          </TableCell>
                          <TableCell colSpan={6} className="text-sm">
                            {fulfillment.locationCity}, {fulfillment.locationState}
                          </TableCell>
                        </TableRow>
                        {expandedFulfillments.has(fulfillment.fulfillmentId) && (
                          <TableRow>
                            <TableCell colSpan={14} className="bg-gray-50 p-0">
                              <div className="p-4 pl-20">
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
                                      <TableHead className="text-right">Lead Time (days)</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {quote.bom.map((bomItem) => {
                                      const component = mockComponents.find((c) => c.partNumber === bomItem.partNumber)
                                      if (!component) return null
                                      return (
                                        <TableRow key={`${fulfillment.fulfillmentId}-${bomItem.partNumber}`}>
                                          <TableCell className="font-medium">{component.partNumber}</TableCell>
                                          <TableCell>{component.description}</TableCell>
                                          <TableCell>{component.commodity}</TableCell>
                                          <TableCell>{component.supplier}</TableCell>
                                          <TableCell className="text-right">{bomItem.requiredQty}</TableCell>
                                          <TableCell className="text-right">
                                            {formatCurrency(component.standardCost)}
                                          </TableCell>
                                          <TableCell className="text-right font-medium">
                                            {formatCurrency(component.standardCost * bomItem.requiredQty)}
                                          </TableCell>
                                          <TableCell className="text-right">{component.standardLeadTimeDays}</TableCell>
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
                  </>
                )}

                {expandedQuotes.has(quote.quoteId) && quote.fulfillments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={14} className="bg-gray-50 p-0">
                      <div className="p-4 pl-20">
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
                              <TableHead className="text-right">Lead Time (days)</TableHead>
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
                                  <TableCell className="text-right">{component.standardLeadTimeDays}</TableCell>
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

      <div className="text-sm text-gray-600">
        Showing {filteredQuotes.length} of {mockQuoteTrackerItems.length} quotes
        {investigateQuotes.size > 0 && (
          <span className="ml-4 text-orange-600 font-medium">
            {investigateQuotes.size} quote{investigateQuotes.size !== 1 ? "s" : ""} marked for investigation
          </span>
        )}
      </div>
    </div>
  )
}
