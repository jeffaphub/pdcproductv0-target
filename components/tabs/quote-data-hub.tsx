"use client"

import type { GlobalFilterState } from "@/app/page"
import { useState } from "react"
import { QuoteHeader } from "@/components/quote/quote-header"
import { BOMCostTable } from "@/components/quote/bom-cost-table"
import { CostSummaryATP } from "@/components/quote/cost-summary-atp"
import { mockQuotes, mockComponents } from "@/lib/mock-data"

type QuoteDataHubProps = {
  filters: GlobalFilterState
}

export function QuoteDataHub({ filters }: QuoteDataHubProps) {
  const [selectedQuote, setSelectedQuote] = useState(mockQuotes[0])

  // Generate BOM items for the quote
  const bomItems = mockComponents.slice(0, 15).map((component, index) => ({
    lineNumber: index + 1,
    partNumber: component.partNumber,
    description: component.description,
    qtyPerUnit: Math.ceil(Math.random() * 4),
    unitCost: component.standardCost,
    lastRefreshDate: component.lastRefreshDate,
    costFreshnessStatus: component.freshnessStatus,
    varianceAgainstOraclePct: component.variancePct,
    costSource:
      index % 4 === 0
        ? "Refreshed Vendor Quote"
        : index % 4 === 1
          ? "Inventory Override"
          : index % 4 === 2
            ? "Manual"
            : "Standard",
  }))

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Integrated Quote & BOM Cost Hub</h2>

      <QuoteHeader quote={selectedQuote} allQuotes={mockQuotes} onSelectQuote={setSelectedQuote} />

      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-3">
          <BOMCostTable bomItems={bomItems} requestedQty={selectedQuote.requestedQty} />
        </div>
        <div>
          <CostSummaryATP requestedQty={selectedQuote.requestedQty} />
        </div>
      </div>
    </div>
  )
}
