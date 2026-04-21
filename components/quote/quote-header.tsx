"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Quote } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

type QuoteHeaderProps = {
  quote: Quote
  allQuotes: Quote[]
  onSelectQuote: (quote: Quote) => void
}

export function QuoteHeader({ quote, allQuotes, onSelectQuote }: QuoteHeaderProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open":
        return "bg-blue-500 text-white"
      case "Won":
        return "bg-[#059669] text-white"
      case "Lost":
        return "bg-[#DC2626] text-white"
      case "Expired":
        return "bg-gray-400 text-white"
      default:
        return "bg-gray-200"
    }
  }

  const pWinColor = quote.pWin >= 0.7 ? "#059669" : quote.pWin >= 0.4 ? "#F59E0B" : "#DC2626"

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Quote Information</h3>
      <div className="grid grid-cols-12 gap-6">
        {/* Left: Quote Selection */}
        <div className="col-span-5 space-y-3">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Quote ID</label>
            <Select
              value={quote.quoteId}
              onValueChange={(value) => {
                const selected = allQuotes.find((q) => q.quoteId === value)
                if (selected) onSelectQuote(selected)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allQuotes.slice(0, 20).map((q) => (
                  <SelectItem key={q.quoteId} value={q.quoteId}>
                    {q.quoteId} - {q.customer}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <span className="text-sm text-gray-600">Customer Name:</span>
            <span className="ml-2 font-medium">{quote.customer}</span>
          </div>
          <div>
            <span className="text-sm text-gray-600">Product Family:</span>
            <Badge variant="secondary" className="ml-2">
              {quote.productFamily}
            </Badge>
          </div>
          <div>
            <span className="text-sm text-gray-600">Application:</span>
            <span className="ml-2 font-medium text-sm">Special Forces Tactical Handheld</span>
          </div>
        </div>

        {/* Middle: Quote Details */}
        <div className="col-span-4 space-y-3">
          <div>
            <span className="text-sm text-gray-600">Requested Quantity:</span>
            <span className="ml-2 font-medium">{quote.requestedQty} units</span>
          </div>
          <div>
            <span className="text-sm text-gray-600">Target Lead Time:</span>
            <span className="ml-2 font-medium">{quote.targetLeadTimeDays} days</span>
          </div>
          <div>
            <span className="text-sm text-gray-600">Quote Date:</span>
            <span className="ml-2 font-medium">{quote.quoteDate.toLocaleDateString()}</span>
          </div>
          <div>
            <span className="text-sm text-gray-600">Current Status:</span>
            <Badge className={cn("ml-2", getStatusColor(quote.status))}>{quote.status}</Badge>
          </div>
        </div>

        {/* Right: pWin */}
        <div className="col-span-3">
          <div className="space-y-2">
            <span className="text-sm text-gray-600">Probability of Win (pWin)</span>
            <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="absolute h-full transition-all"
                style={{
                  width: `${quote.pWin * 100}%`,
                  background: `linear-gradient(to right, #DC2626, #F59E0B, #059669)`,
                }}
              />
            </div>
            <p className="text-2xl font-bold" style={{ color: pWinColor }}>
              {(quote.pWin * 100).toFixed(0)}%
            </p>
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" variant="outline">
              Load Sample Quote
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
